import { Request, Response, NextFunction } from 'express';
import authService from '../services/auth.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/apiError';
import { UserRole } from '../database/entities/User';
import { AuthenticatedRequest } from 'types/express';
import { generateTokenPair, blacklistToken, TokenPair } from '../utils/jwt.utils';
import { transformUserData } from '../utils/data-transformer.utils';
import { logger } from '../utils/logger';


// Enhanced JWT token response with secure token pair
const sendTokenResponse = async (user: any, statusCode: number, res: Response) => {
    try {
        // Generate token pair
        const tokenPair = await generateTokenPair({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            userType: user.userType,
            businessId: user.businessId,
            outletId: user.outletId,
        });

        // Set secure cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
        };

        res.cookie('jwt', tokenPair.accessToken, {
            ...cookieOptions,
            expires: tokenPair.refreshTokenExpiry,  //accessTokenExpiry
        });

        res.cookie('refreshToken', tokenPair.refreshToken, {
            ...cookieOptions,
            expires: tokenPair.refreshTokenExpiry,
        });

        // Transform user data to exclude sensitive fields
        const transformedUser = transformUserData(user, { id: user.id, userType: user.userType }, true);

        logger.info(`User ${user.email} authenticated successfully`);

        res.status(statusCode).json({
            status: 'success',
            data: {
                user: transformedUser,
                tokens: {
                    accessToken: tokenPair.accessToken,
                    accessTokenExpiry: tokenPair.accessTokenExpiry,
                    // Don't send refresh token in response body for security
                },
            },
        });
    } catch (error) {
        logger.error('Failed to generate tokens:', error);
        throw new ApiError('Authentication failed', 500);
    }
};




class AuthController {
    registerOwner = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { userData, businessData } = req.body;
        const { user, business } = await authService.registerOwner(userData, businessData);

        // Transform user and business data
        const transformedUser = transformUserData(user);
        
        res.status(202).json({
            status: 'success',
            message: 'Registration initiated. OTP sent to your email/phone for verification.',
            data: {
                user: transformedUser,
                business: { id: business.id, name: business.name, status: business.status },
            },
        });
    });

    verifyOwnerRegistration = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp } = req.body;
        const { user } = await authService.verifyOwnerRegistration(email, otp);
        await sendTokenResponse(user, 200, res);
    });

    login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const { email, password } = req.body;
        if (!email || !password) {
            return next(new ApiError('Please provide email and password!', 400));
        }
        const { user, token } = await authService.login(email, password);
        await sendTokenResponse(user, 200, res);
    });

    logout = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        // Blacklist current tokens if available
        // @ts-ignore
        const accessToken = req.cookies?.jwt || req.headers.authorization?.split(' ')[1];
        // @ts-ignore
        const refreshToken = req.cookies?.refreshToken;
        
        if (accessToken) {
            await blacklistToken(accessToken);
        }
        if (refreshToken) {
            await blacklistToken(refreshToken);
        }

        // Clear cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
        };

        res.cookie('jwt', '', { ...cookieOptions, expires: new Date(0) });
        res.cookie('refreshToken', '', { ...cookieOptions, expires: new Date(0) });
        
        logger.info(`User logged out: ${req.user?.email}`);
        
        res.status(200).json({ 
            status: 'success', 
            message: 'Logged out successfully' 
        });
    });

    getMe = catchAsync(async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new ApiError('User not found. Please log in again.', 404));
        }
        
        // Transform user data for secure response (user viewing their own profile)
        const transformedUser = transformUserData(
            req.user as any,
            { id: req.user.id, userType: req.user.userType },
            true
        );
        
        res.status(200).json({
            status: 'success',
            data: { user: transformedUser },
        });
    });
}

export default new AuthController();
