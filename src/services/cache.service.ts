import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export interface CacheOptions {
    ttl?: number; // Time to live in seconds
    compress?: boolean; // Whether to compress large data
    prefix?: string; // Cache key prefix
    tags?: string[]; // Tags for cache invalidation
}

export interface CacheStats {
    hits: number;
    misses: number;
    keys: number;
    memory: string;
}

class CacheService {
    private defaultTTL = 3600; // 1 hour default
    private compressionThreshold = 1024; // Compress data larger than 1KB
    private isRedisEnabled = process.env.REDIS_ENABLED !== 'false';
    
    constructor() {
        // Initialize cache stats only if Redis is enabled
        if (this.isRedisEnabled) {
            this.initializeStats();
        }
    }

    /**
     * Set a cache entry
     */
    async set<T>(
        key: string, 
        value: T, 
        options: CacheOptions = {}
    ): Promise<boolean> {
        try {
            if (!this.isRedisEnabled || !redisClient.isClientConnected()) {
                logger.debug(`Cache set skipped for ${key}: Redis disabled or not connected`);
                return false;
            }
            
            const redis = redisClient.getClient();
            const {
                ttl = this.defaultTTL,
                compress = false,
                prefix = '',
                tags = []
            } = options;

            const fullKey = prefix ? `${prefix}:${key}` : key;
            let serializedValue = JSON.stringify(value);

            // Compress if needed
            if (compress && serializedValue.length > this.compressionThreshold) {
                const zlib = await import('zlib');
                serializedValue = zlib.gzipSync(serializedValue).toString('base64');
                await redis.hSet(`${fullKey}:meta`, 'compressed', 'true');
            }

            // Set the value with TTL
            await redis.setEx(fullKey, ttl, serializedValue);

            // Store tags for cache invalidation
            if (tags.length > 0) {
                for (const tag of tags) {
                    await redis.sAdd(`tag:${tag}`, fullKey);
                    await redis.expire(`tag:${tag}`, ttl);
                }
            }

            // Update stats
            await this.incrementStat('sets');

            logger.debug(`Cache set: ${fullKey} (TTL: ${ttl}s)`);
            return true;
        } catch (error) {
            logger.warn(`Cache set error for key ${key}, cache disabled:`, error.message);
            return false;
        }
    }

    /**
     * Get a cache entry
     */
    async get<T>(
        key: string, 
        prefix: string = ''
    ): Promise<T | null> {
        try {
            if (!this.isRedisEnabled || !redisClient.isClientConnected()) {
                logger.debug(`Cache get skipped for ${key}: Redis disabled or not connected`);
                return null;
            }
            
            const redis = redisClient.getClient();
            const fullKey = prefix ? `${prefix}:${key}` : key;
            
            const value = await redis.get(fullKey);
            if (!value) {
                await this.incrementStat('misses');
                return null;
            }

            // Check if compressed
            const metaData = await redis.hGetAll(`${fullKey}:meta`);
            let serializedValue = value;

            if (metaData.compressed === 'true') {
                const zlib = await import('zlib');
                serializedValue = zlib.gunzipSync(Buffer.from(value, 'base64')).toString();
            }

            await this.incrementStat('hits');
            logger.debug(`Cache hit: ${fullKey}`);
            
            return JSON.parse(serializedValue) as T;
        } catch (error) {
            logger.warn(`Cache get error for key ${key}, returning null:`, error.message);
            await this.incrementStat('misses').catch(() => {});
            return null;
        }
    }

    /**
     * Delete a cache entry
     */
    async delete(key: string, prefix: string = ''): Promise<boolean> {
        try {
            if (!this.isRedisEnabled || !redisClient.isClientConnected()) {
                logger.debug(`Cache delete skipped for ${key}: Redis disabled or not connected`);
                return false;
            }
            
            const redis = redisClient.getClient();
            const fullKey = prefix ? `${prefix}:${key}` : key;
            
            const result = await redis.del(fullKey);
            await redis.del(`${fullKey}:meta`); // Delete metadata if exists
            
            logger.debug(`Cache deleted: ${fullKey}`);
            return result > 0;
        } catch (error) {
            logger.error(`Cache delete error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Check if a cache entry exists
     */
    async exists(key: string, prefix: string = ''): Promise<boolean> {
        try {
            if (!this.isRedisEnabled || !redisClient.isClientConnected()) {
                logger.debug(`Cache exists check skipped for ${key}: Redis disabled or not connected`);
                return false;
            }
            
            const redis = redisClient.getClient();
            const fullKey = prefix ? `${prefix}:${key}` : key;
            const result = await redis.exists(fullKey);
            return result === 1;
        } catch (error) {
            logger.error(`Cache exists check error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Get multiple cache entries
     */
    async mGet<T>(keys: string[], prefix: string = ''): Promise<(T | null)[]> {
        try {
            const redis = await redisClient.getClient();
            const fullKeys = keys.map(key => prefix ? `${prefix}:${key}` : key);
            
            const values = await redis.mGet(fullKeys);
            const results: (T | null)[] = [];

            for (let i = 0; i < values.length; i++) {
                if (values[i]) {
                    try {
                        results.push(JSON.parse(values[i]!) as T);
                        await this.incrementStat('hits');
                    } catch (error) {
                        results.push(null);
                        await this.incrementStat('misses');
                    }
                } else {
                    results.push(null);
                    await this.incrementStat('misses');
                }
            }

            return results;
        } catch (error) {
            logger.error(`Cache mGet error:`, error);
            return keys.map(() => null);
        }
    }

    /**
     * Set multiple cache entries
     */
    async mSet<T>(
        entries: Array<{ key: string; value: T; options?: CacheOptions }>,
        prefix: string = ''
    ): Promise<boolean> {
        try {
            const redis = await redisClient.getClient();
            const pipeline = redis.multi();

            for (const entry of entries) {
                const fullKey = prefix ? `${prefix}:${entry.key}` : entry.key;
                const ttl = entry.options?.ttl || this.defaultTTL;
                const serializedValue = JSON.stringify(entry.value);
                
                pipeline.setEx(fullKey, ttl, serializedValue);
            }

            await pipeline.exec();
            await this.incrementStat('sets', entries.length);
            
            logger.debug(`Cache mSet: ${entries.length} entries`);
            return true;
        } catch (error) {
            logger.error(`Cache mSet error:`, error);
            return false;
        }
    }

    /**
     * Invalidate cache by tag
     */
    async invalidateByTag(tag: string): Promise<number> {
        try {
            const redis = await redisClient.getClient();
            const keys = await redis.sMembers(`tag:${tag}`);
            
            if (keys.length === 0) return 0;

            const pipeline = redis.multi();
            keys.forEach(key => {
                pipeline.del(key);
                pipeline.del(`${key}:meta`);
            });
            pipeline.del(`tag:${tag}`);
            
            await pipeline.exec();
            
            logger.info(`Cache invalidated by tag '${tag}': ${keys.length} keys`);
            return keys.length;
        } catch (error) {
            logger.error(`Cache tag invalidation error for tag ${tag}:`, error);
            return 0;
        }
    }

    /**
     * Invalidate cache by pattern
     */
    async invalidateByPattern(pattern: string): Promise<number> {
        try {
            const redis = await redisClient.getClient();
            const keys = await redis.keys(pattern);
            
            if (keys.length === 0) return 0;

            const pipeline = redis.multi();
            keys.forEach(key => {
                pipeline.del(key);
                pipeline.del(`${key}:meta`);
            });
            
            await pipeline.exec();
            
            logger.info(`Cache invalidated by pattern '${pattern}': ${keys.length} keys`);
            return keys.length;
        } catch (error) {
            logger.error(`Cache pattern invalidation error for pattern ${pattern}:`, error);
            return 0;
        }
    }

    /**
     * Get or set cache entry
     */
    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T> {
        const { prefix = '' } = options;
        
        // Try to get from cache first
        let value = await this.get<T>(key, prefix);
        
        if (value !== null) {
            return value;
        }

        // If not in cache, fetch and cache the result
        try {
            value = await fetcher();
            await this.set(key, value, options);
            return value;
        } catch (error) {
            logger.error(`Cache getOrSet fetcher error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Increment a numeric cache value
     */
    async increment(key: string, increment: number = 1, prefix: string = ''): Promise<number> {
        try {
            const redis = await redisClient.getClient();
            const fullKey = prefix ? `${prefix}:${key}` : key;
            return await redis.incrBy(fullKey, increment);
        } catch (error) {
            logger.error(`Cache increment error for key ${key}:`, error);
            return 0;
        }
    }

    /**
     * Set cache entry with sliding expiration (TTL is reset on each access)
     */
    async setWithSlidingExpiration<T>(
        key: string,
        value: T,
        ttl: number,
        prefix: string = ''
    ): Promise<boolean> {
        const success = await this.set(key, value, { ttl, prefix });
        if (success) {
            // Store the TTL for sliding expiration
            const redis = await redisClient.getClient();
            const fullKey = prefix ? `${prefix}:${key}` : key;
            await redis.hSet(`${fullKey}:meta`, 'sliding_ttl', ttl.toString());
        }
        return success;
    }

    /**
     * Get cache entry with sliding expiration
     */
    async getWithSlidingExpiration<T>(
        key: string,
        prefix: string = ''
    ): Promise<T | null> {
        const value = await this.get<T>(key, prefix);
        
        if (value !== null) {
            // Reset TTL for sliding expiration
            try {
                const redis = await redisClient.getClient();
                const fullKey = prefix ? `${prefix}:${key}` : key;
                const metaData = await redis.hGetAll(`${fullKey}:meta`);
                
                if (metaData.sliding_ttl) {
                    const slidingTTL = parseInt(metaData.sliding_ttl, 10);
                    await redis.expire(fullKey, slidingTTL);
                    await redis.expire(`${fullKey}:meta`, slidingTTL);
                }
            } catch (error) {
                logger.warn(`Failed to reset sliding expiration for key ${key}:`, error);
            }
        }
        
        return value;
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<CacheStats> {
        try {
            const redis = await redisClient.getClient();
            const [hits, misses, keyCount, info] = await Promise.all([
                redis.get('cache:stats:hits').then(v => parseInt(v || '0', 10)),
                redis.get('cache:stats:misses').then(v => parseInt(v || '0', 10)),
                redis.dbSize(),
                redis.info('memory')
            ]);

            const memoryMatch = info.match(/used_memory_human:(.+)/);
            const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';

            return {
                hits,
                misses,
                keys: keyCount,
                memory
            };
        } catch (error) {
            logger.error('Failed to get cache stats:', error);
            return { hits: 0, misses: 0, keys: 0, memory: 'unknown' };
        }
    }

    /**
     * Clear all cache entries
     */
    async clear(): Promise<boolean> {
        try {
            const redis = await redisClient.getClient();
            await redis.flushDb();
            logger.info('Cache cleared');
            return true;
        } catch (error) {
            logger.error('Cache clear error:', error);
            return false;
        }
    }

    /**
     * Warm up cache with predefined data
     */
    async warmUp<T>(
        entries: Array<{ key: string; fetcher: () => Promise<T>; options?: CacheOptions }>,
        prefix: string = ''
    ): Promise<void> {
        logger.info(`Starting cache warm-up with ${entries.length} entries`);
        
        const results = await Promise.allSettled(
            entries.map(async (entry) => {
                try {
                    const value = await entry.fetcher();
                    await this.set(entry.key, value, { ...entry.options, prefix });
                    return { key: entry.key, success: true };
                } catch (error) {
                    logger.error(`Cache warm-up failed for key ${entry.key}:`, error);
                    return { key: entry.key, success: false };
                }
            })
        );

        const successful = results.filter(result => 
            result.status === 'fulfilled' && result.value.success
        ).length;
        
        logger.info(`Cache warm-up completed: ${successful}/${entries.length} entries cached`);
    }

    /**
     * Initialize cache statistics
     */
    private async initializeStats(): Promise<void> {
        try {
            const redis = await redisClient.getClient();
            const exists = await redis.exists('cache:stats:hits', 'cache:stats:misses');
            
            if (exists === 0) {
                await redis.mSet({
                    'cache:stats:hits': '0',
                    'cache:stats:misses': '0'
                });
            }
        } catch (error) {
            logger.warn('Failed to initialize cache stats:', error);
        }
    }

    /**
     * Increment cache statistics
     */
    private async incrementStat(stat: string, increment: number = 1): Promise<void> {
        try {
            const redis = await redisClient.getClient();
            await redis.incrBy(`cache:stats:${stat}`, increment);
        } catch (error) {
            // Silently fail to avoid affecting main functionality
        }
    }
}

export const cacheService = new CacheService();
export default cacheService;
