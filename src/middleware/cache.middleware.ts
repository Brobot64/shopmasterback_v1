import { Request, Response, NextFunction } from 'express';
import catchAsync from '../utils/catchAsync';
import { logger } from '../utils/logger';
import cacheService, { CacheOptions } from '../services/cache.service';
import { AuthenticatedRequest } from '../types/express';

interface CacheMiddlewareOptions {
    ttl?: number;
    keyGenerator?: (req: Request) => string;
    skipCache?: (req: Request, res: Response) => boolean;
    varyBy?: string[]; // Headers to vary cache by (e.g., ['user-agent', 'accept-language'])
    userSpecific?: boolean; // Whether to make cache user-specific
    tags?: string[];
    compress?: boolean;
}

const cacheMiddleware = (prefix: string, options: CacheMiddlewareOptions = {}) => {
    const {
        ttl = 3600,
        keyGenerator,
        skipCache,
        varyBy = [],
        userSpecific = false,
        tags = [],
        compress = false
    } = options;

    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        // Skip caching if specified
        if (skipCache && skipCache(req, res)) {
            return next();
        }

        // Generate cache key
        let cacheKey: string;
        if (keyGenerator) {
            cacheKey = keyGenerator(req);
        } else {
            const baseKey = `${req.method}:${req.originalUrl}`;
            const varyParts = varyBy.map(header => `${header}:${req.headers[header] || 'none'}`);
            const userPart = userSpecific && req.user ? `user:${req.user.id}` : '';
            const keyParts = [baseKey, ...varyParts, userPart].filter(Boolean);
            cacheKey = keyParts.join('|');
        }

        try {
            // Try to get cached response
            const cachedResponse = await cacheService.get<{
                status: number;
                data: any;
                headers?: Record<string, string>;
            }>(cacheKey, prefix);

            if (cachedResponse) {
                logger.debug(`Cache hit: ${prefix}:${cacheKey}`);
                
                // Set cached headers if they exist
                if (cachedResponse.headers) {
                    Object.entries(cachedResponse.headers).forEach(([key, value]) => {
                        res.setHeader(key, value);
                    });
                }
                
                res.setHeader('X-Cache', 'HIT');
                return res.status(cachedResponse.status).json(cachedResponse.data);
            }

            // If not in cache, intercept response to cache it
            const originalJson = res.json;
            let responseData: any;
            let statusCode = 200;

            res.json = function (data: any): Response {
                responseData = data;
                statusCode = res.statusCode;
                return originalJson.call(this, data);
            };

            // Continue to route handler
            res.on('finish', async () => {
                // Only cache successful responses
                if (statusCode >= 200 && statusCode < 300 && responseData) {
                    const cacheData = {
                        status: statusCode,
                        data: responseData,
                        headers: {
                            'content-type': res.getHeader('content-type') as string,
                        }
                    };

                    const cacheOptions: CacheOptions = {
                        ttl,
                        prefix,
                        compress,
                        tags: tags.length > 0 ? tags : undefined
                    };

                    await cacheService.set(cacheKey, cacheData, cacheOptions);
                    logger.debug(`Response cached: ${prefix}:${cacheKey}`);
                }
            });

            res.setHeader('X-Cache', 'MISS');
            next();
        } catch (error) {
            logger.error(`Cache middleware error for ${prefix}:${cacheKey}:`, error);
            res.setHeader('X-Cache', 'ERROR');
            next(); // Continue even if caching fails
        }
    });
};

// Pre-configured cache middlewares for common use cases
export const userCacheMiddleware = cacheMiddleware('users', {
    ttl: 1800, // 30 minutes
    userSpecific: true,
    tags: ['users'],
    skipCache: (req) => req.method !== 'GET'
});

export const productCacheMiddleware = cacheMiddleware('products', {
    ttl: 3600, // 1 hour
    tags: ['products', 'inventory'],
    compress: true,
    skipCache: (req) => req.method !== 'GET'
});

export const businessCacheMiddleware = cacheMiddleware('business', {
    ttl: 7200, // 2 hours
    tags: ['business'],
    skipCache: (req) => req.method !== 'GET'
});

export const salesCacheMiddleware = cacheMiddleware('sales', {
    ttl: 300, // 5 minutes (more frequent updates)
    userSpecific: true,
    tags: ['sales'],
    skipCache: (req) => req.method !== 'GET'
});

export const dashboardCacheMiddleware = cacheMiddleware('dashboard', {
    ttl: 600, // 10 minutes
    userSpecific: true,
    tags: ['dashboard', 'sales', 'inventory'],
    compress: true,
    skipCache: (req) => req.method !== 'GET'
});

// Legacy function for backward compatibility
export const clearCache = async (pattern: string): Promise<number> => {
    return await cacheService.invalidateByPattern(pattern);
};

// Cache invalidation helpers
export const invalidateCacheByTags = async (...tags: string[]): Promise<void> => {
    for (const tag of tags) {
        await cacheService.invalidateByTag(tag);
    }
};

export const invalidateUserCache = async (userId?: string): Promise<void> => {
    if (userId) {
        await cacheService.invalidateByPattern(`users:*user:${userId}*`);
    }
    await invalidateCacheByTags('users');
};

export const invalidateProductCache = async (): Promise<void> => {
    await invalidateCacheByTags('products', 'inventory');
};

export const invalidateSalesCache = async (userId?: string): Promise<void> => {
    if (userId) {
        await cacheService.invalidateByPattern(`sales:*user:${userId}*`);
        await cacheService.invalidateByPattern(`dashboard:*user:${userId}*`);
    }
    await invalidateCacheByTags('sales', 'dashboard');
};

export { cacheMiddleware, cacheService };
