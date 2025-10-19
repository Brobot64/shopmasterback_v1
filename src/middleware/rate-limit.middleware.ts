import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import ApiError from '../utils/apiError';
import { logger } from '../utils/logger';

interface RateLimitOptions {
    windowMs: number; // Time window in milliseconds
    maxRequests: number; // Max requests per window
    keyGenerator?: (req: Request) => string; // Custom key generator
    skipSuccessful?: boolean; // Skip counting successful requests
    message?: string; // Custom error message
}

class RateLimiter {
    private options: RateLimitOptions;

    constructor(options: RateLimitOptions) {
        this.options = {
            keyGenerator: (req) => `rate_limit:${req.ip}`,
            skipSuccessful: false,
            message: 'Too many requests, please try again later.',
            ...options,
        };
    }

    middleware() {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                // Skip rate limiting if Redis is not available
                if (process.env.REDIS_ENABLED === 'false' || !redisClient.isClientConnected()) {
                    logger.debug('Rate limiting skipped: Redis disabled or not connected');
                    return next();
                }
                
                const redis = redisClient.getClient();
                const key = this.options.keyGenerator!(req);
                const current = await redis.get(key);
                
                if (current && parseInt(current as any) >= this.options.maxRequests) {
                    logger.warn(`Rate limit exceeded for ${req.ip} on ${req.path}`);
                    return next(new ApiError(this.options.message!, 429));
                }
                
                // Increment counter
                const multi = redis.multi();
                multi.incr(key);
                if (!current) {
                    multi.expire(key, Math.ceil(this.options.windowMs / 1000));
                }
                await multi.exec();
                
                // Add rate limit headers
                const remaining = Math.max(0, this.options.maxRequests - parseInt(current as string || '0') - 1);
                res.set({
                    'X-RateLimit-Limit': this.options.maxRequests.toString(),
                    'X-RateLimit-Remaining': remaining.toString(),
                    'X-RateLimit-Reset': new Date(Date.now() + this.options.windowMs).toISOString(),
                });
                
                next();
            } catch (error) {
                logger.error('Rate limiting error:', error);
                // Continue on Redis errors to avoid blocking legitimate traffic
                next();
            }
        };
    }
}

// Pre-configured rate limiters
export const generalRateLimit = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
}).middleware();

export const authRateLimit = new RateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 login attempts per 15 minutes
    keyGenerator: (req) => `auth_limit:${req.ip}:${req.body.email || 'unknown'}`,
    message: 'Too many authentication attempts, please try again in 15 minutes.',
}).middleware();

export const apiRateLimit = new RateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
}).middleware();

// Account lockout after failed login attempts
export const accountLockout = new RateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes
    maxRequests: 10, // 10 failed attempts
    keyGenerator: (req) => `account_lockout:${req.body.email}`,
    message: 'Account temporarily locked due to too many failed login attempts.',
}).middleware();

export { RateLimiter };
