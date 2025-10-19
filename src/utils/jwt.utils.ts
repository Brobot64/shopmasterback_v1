import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { jwtConfig } from '../config';
import { UserRole } from '../database/entities/User';
import { redisClient } from '../config/redis';
import ApiError from './apiError';

interface JwtPayload {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    userType: UserRole;
    businessId?: string;
    outletId?: string;
    iat?: number;
    exp?: number;
    jti?: string; // JWT ID for token blacklisting
    tokenType?: 'access' | 'refresh';
}

interface TokenPair {
    accessToken: string;
    refreshToken: string;
    accessTokenExpiry: Date;
    refreshTokenExpiry: Date;
}

// Generate secure JWT ID
const generateJwtId = (): string => {
    return crypto.randomUUID();
};

const generateToken = (payload: JwtPayload): string => {
    const jwtId = generateJwtId();
    const tokenPayload = {
        ...payload,
        jti: jwtId,
        iss: 'shopmaster-api', // Issuer
        aud: 'shopmaster-client', // Audience
    };
    
    return jwt.sign(tokenPayload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
        algorithm: 'HS256'
    } as jwt.SignOptions);
};

const generateTokenPair = async (payload: Omit<JwtPayload, 'jti' | 'tokenType' | 'iat' | 'exp'>): Promise<TokenPair> => {
    const accessJwtId = generateJwtId();
    const refreshJwtId = generateJwtId();
    
    const accessTokenPayload = {
        ...payload,
        jti: accessJwtId,
        tokenType: 'access' as const,
        iss: 'shopmaster-api',
        aud: 'shopmaster-client',
    };
    
    const refreshTokenPayload = {
        id: payload.id,
        email: payload.email,
        jti: refreshJwtId,
        tokenType: 'refresh' as const,
        iss: 'shopmaster-api',
        aud: 'shopmaster-client',
    };
    
    const accessToken = jwt.sign(accessTokenPayload, jwtConfig.secret, { 
        expiresIn: '1d', // Short-lived access token
        algorithm: 'HS256'
    });
    
    const refreshToken = jwt.sign(refreshTokenPayload, jwtConfig.secret, { 
        expiresIn: '7d', // Longer-lived refresh token
        algorithm: 'HS256'
    });
    
    // Store refresh token in Redis for validation
    try {
        const redis = await redisClient.getClient();
        await redis.setEx(`refresh_token:${payload.id}:${refreshJwtId}`, 7 * 24 * 60 * 60, refreshToken);
    } catch (error) {
        console.warn('Failed to store refresh token in Redis:', error);
    }
    
    return {
        accessToken,
        refreshToken,
        accessTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
        refreshTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
};

const verifyToken = async (token: string): Promise<JwtPayload> => {
    try {
        const decoded = jwt.verify(token, jwtConfig.secret) as JwtPayload;
        
        // Check if token is blacklisted
        if (decoded.jti) {
            try {
                const redis = await redisClient.getClient();
                const isBlacklisted = await redis.exists(`blacklist:${decoded.jti}`);
                if (isBlacklisted) {
                    throw new ApiError('Token has been blacklisted', 401);
                }
            } catch (error) {
                console.warn('Failed to check token blacklist:', error);
            }
        }
        
        return decoded;
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new ApiError('Token has expired', 401);
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new ApiError('Invalid token', 401);
        }
        throw error;
    }
};

const refreshAccessToken = async (refreshToken: string): Promise<{ accessToken: string; accessTokenExpiry: Date }> => {
    try {
        const decoded = jwt.verify(refreshToken, jwtConfig.secret) as JwtPayload;
        
        if (decoded.tokenType !== 'refresh') {
            throw new ApiError('Invalid refresh token', 401);
        }
        
        // Verify refresh token exists in Redis
        try {
            const redis = await redisClient.getClient();
            const storedToken = await redis.get(`refresh_token:${decoded.id}:${decoded.jti}`);
            if (!storedToken || storedToken !== refreshToken) {
                throw new ApiError('Refresh token not found or invalid', 401);
            }
        } catch (error) {
            throw new ApiError('Failed to validate refresh token', 500);
        }
        
        // Generate new access token
        const newAccessJwtId = generateJwtId();
        const accessTokenPayload = {
            id: decoded.id,
            email: decoded.email,
            jti: newAccessJwtId,
            tokenType: 'access' as const,
            iss: 'shopmaster-api',
            aud: 'shopmaster-client',
        };
        
        const accessToken = jwt.sign(accessTokenPayload, jwtConfig.secret, { 
            expiresIn: '1d',
            algorithm: 'HS256'
        });
        
        return {
            accessToken,
            accessTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
        };
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            throw new ApiError('Refresh token has expired', 401);
        } else if (error instanceof jwt.JsonWebTokenError) {
            throw new ApiError('Invalid refresh token', 401);
        }
        throw error;
    }
};

const blacklistToken = async (token: string): Promise<void> => {
    try {
        const decoded = jwt.decode(token) as JwtPayload;
        if (decoded && decoded.jti && decoded.exp) {
            const redis = await redisClient.getClient();
            const ttl = decoded.exp * 1000 - Date.now();
            if (ttl > 0) {
                await redis.setEx(`blacklist:${decoded.jti}`, Math.floor(ttl / 1000), 'blacklisted');
            }
        }
    } catch (error) {
        console.warn('Failed to blacklist token:', error);
    }
};

const revokeAllUserTokens = async (userId: string): Promise<void> => {
    try {
        const redis = await redisClient.getClient();
        const keys = await redis.keys(`refresh_token:${userId}:*`);
        if (keys.length > 0) {
            await redis.del(keys);
        }
    } catch (error) {
        console.warn('Failed to revoke user tokens:', error);
    }
};

export { 
    generateToken, 
    generateTokenPair, 
    verifyToken, 
    refreshAccessToken, 
    blacklistToken, 
    revokeAllUserTokens,
    JwtPayload,
    TokenPair 
};
