import { AppDataSource } from '../database/data-source';
import { EntityTarget, ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';
import { logger } from '../utils/logger';
import cacheService from './cache.service';

interface QueryOptimizationOptions {
    cache?: boolean;
    cacheTTL?: number;
    cacheKey?: string;
    relations?: string[];
    select?: string[];
    limit?: number;
    offset?: number;
    orderBy?: Record<string, 'ASC' | 'DESC'>;
}

interface IndexSuggestion {
    table: string;
    columns: string[];
    type: 'btree' | 'hash' | 'gin' | 'gist';
    reason: string;
}

class DatabaseOptimizationService {
    private queryCache = new Map<string, number>();
    private slowQueryThreshold = 1000; // 1 second

    /**
     * Execute optimized query with caching and performance monitoring
     */
    async executeOptimizedQuery<T extends ObjectLiteral>(
        entity: EntityTarget<T>,
        queryBuilder: (qb: SelectQueryBuilder<T>) => SelectQueryBuilder<T>,
        options: QueryOptimizationOptions = {}
    ): Promise<T[]> {
        const {
            cache = false,
            cacheTTL = 300, // 5 minutes default
            cacheKey,
            relations = [],
            select = [],
            limit,
            offset,
            orderBy
        } = options;

        const repository = AppDataSource.getRepository(entity);
        let qb = repository.createQueryBuilder(entity.toString().toLowerCase());

        // Apply query builder modifications
        qb = queryBuilder(qb);

        // Apply relations
        relations.forEach(relation => {
            qb.leftJoinAndSelect(`${entity.toString().toLowerCase()}.${relation}`, relation);
        });

        // Apply select fields
        if (select.length > 0) {
            qb.select(select);
        }

        // Apply ordering
        if (orderBy) {
            Object.entries(orderBy).forEach(([column, direction]) => {
                qb.addOrderBy(column, direction);
            });
        }

        // Apply pagination
        if (limit) {
            qb.limit(limit);
        }
        if (offset) {
            qb.offset(offset);
        }

        const query = qb.getQuery();
        const parameters = qb.getParameters();
        const fullCacheKey = cacheKey || this.generateQueryCacheKey(query, parameters);

        // Try cache first if enabled
        if (cache) {
            const cached = await cacheService.get<T[]>(fullCacheKey);
            if (cached) {
                return cached;
            }
        }

        // Execute query with performance monitoring
        const startTime = Date.now();
        const result = await qb.getMany();
        const executionTime = Date.now() - startTime;

        // Log slow queries
        if (executionTime > this.slowQueryThreshold) {
            logger.warn(`Slow query detected (${executionTime}ms):`, {
                query,
                parameters,
                executionTime
            });
        }

        // Track query performance
        this.trackQueryPerformance(query, executionTime);

        // Cache result if enabled
        if (cache && result) {
            await cacheService.set(fullCacheKey, result, {
                ttl: cacheTTL,
                prefix: 'query_cache'
            });
        }

        return result;
    }

    /**
     * Execute optimized count query
     */
    async executeOptimizedCount<T extends ObjectLiteral>(
        entity: EntityTarget<T>,
        queryBuilder: (qb: SelectQueryBuilder<T>) => SelectQueryBuilder<T>,
        options: { cache?: boolean; cacheTTL?: number; cacheKey?: string } = {}
    ): Promise<number> {
        const { cache = false, cacheTTL = 300, cacheKey } = options;

        const repository = AppDataSource.getRepository(entity);
        let qb = repository.createQueryBuilder(entity.toString().toLowerCase());
        qb = queryBuilder(qb);

        const query = qb.getQuery();
        const parameters = qb.getParameters();
        const fullCacheKey = cacheKey || this.generateQueryCacheKey(`COUNT_${query}`, parameters);

        // Try cache first if enabled
        if (cache) {
            const cached = await cacheService.get<number>(fullCacheKey);
            if (cached !== null) {
                return cached;
            }
        }

        const startTime = Date.now();
        const result = await qb.getCount();
        const executionTime = Date.now() - startTime;

        if (executionTime > this.slowQueryThreshold) {
            logger.warn(`Slow count query detected (${executionTime}ms):`, {
                query,
                parameters,
                executionTime
            });
        }

        if (cache) {
            await cacheService.set(fullCacheKey, result, {
                ttl: cacheTTL,
                prefix: 'query_cache'
            });
        }

        return result;
    }

    /**
     * Execute bulk operations with optimization
     */
    async executeBulkOperation<T extends ObjectLiteral>(
        entity: EntityTarget<T>,
        operation: 'insert' | 'update' | 'delete',
        data: Partial<T>[],
        options: { batchSize?: number; validateBeforeSave?: boolean } = {}
    ): Promise<void> {
        const { batchSize = 1000, validateBeforeSave = false } = options;
        const repository = AppDataSource.getRepository(entity);

        // Process in batches to avoid memory issues
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);

            const startTime = Date.now();

            switch (operation) {
                case 'insert':
                    if (validateBeforeSave) {
                        await repository.save(batch as T[]);
                    } else {
                        await repository.insert(batch);
                    }
                    break;
                case 'update':
                    for (const item of batch) {
                        await repository.update(item.id as any, item);
                    }
                    break;
                case 'delete':
                    const ids = batch.map(item => item.id).filter(Boolean);
                    if (ids.length > 0) {
                        await repository.delete(ids);
                    }
                    break;
            }

            const executionTime = Date.now() - startTime;
            logger.debug(`Bulk ${operation} batch completed: ${batch.length} items in ${executionTime}ms`);
        }
    }

    /**
     * Analyze query performance and suggest optimizations
     */
    async analyzeQueryPerformance(): Promise<{
        slowQueries: Array<{ query: string; avgTime: number; count: number }>;
        suggestions: IndexSuggestion[];
    }> {
        const slowQueries: Array<{ query: string; avgTime: number; count: number }> = [];
        
        // Analyze tracked queries
        for (const [query, totalTime] of this.queryCache.entries()) {
            const count = 1; // Simplified for this example
            const avgTime = totalTime / count;
            
            if (avgTime > this.slowQueryThreshold) {
                slowQueries.push({ query, avgTime, count });
            }
        }

        // Generate index suggestions based on slow queries
        const suggestions = await this.generateIndexSuggestions(slowQueries);

        return { slowQueries, suggestions };
    }

    /**
     * Create database indexes for performance optimization
     */
    async createOptimizationIndexes(): Promise<void> {
        const queryRunner = AppDataSource.createQueryRunner();
        
        try {
            // Common indexes for better performance
            const indexes = [
                // User table indexes
                {
                    table: 'users',
                    name: 'idx_users_email_status',
                    columns: ['email', 'status'],
                },
                {
                    table: 'users',
                    name: 'idx_users_business_outlet',
                    columns: ['businessId', 'outletId'],
                },
                {
                    table: 'users',
                    name: 'idx_users_user_type_status',
                    columns: ['userType', 'status'],
                },
                
                // Product table indexes
                {
                    table: 'products',
                    name: 'idx_products_business_category',
                    columns: ['businessId', 'category'],
                },
                {
                    table: 'products',
                    name: 'idx_products_barcode',
                    columns: ['barcode'],
                },
                {
                    table: 'products',
                    name: 'idx_products_status_business',
                    columns: ['status', 'businessId'],
                },
                
                // Sales table indexes
                {
                    table: 'sales',
                    name: 'idx_sales_date_business',
                    columns: ['saleDate', 'businessId'],
                },
                {
                    table: 'sales',
                    name: 'idx_sales_outlet_date',
                    columns: ['outletId', 'saleDate'],
                },
                {
                    table: 'sales',
                    name: 'idx_sales_person_date',
                    columns: ['salesPersonId', 'saleDate'],
                },
                
                // Inventory table indexes
                {
                    table: 'inventory',
                    name: 'idx_inventory_product_outlet',
                    columns: ['productId', 'outletId'],
                },
                {
                    table: 'inventory',
                    name: 'idx_inventory_restock_date',
                    columns: ['nextRestockDate'],
                },
                
                // Business table indexes
                {
                    table: 'businesses',
                    name: 'idx_businesses_status_industry',
                    columns: ['status', 'industry'],
                },
                
                // Log table indexes
                {
                    table: 'logs',
                    name: 'idx_logs_performer_timestamp',
                    columns: ['performerId', 'timestamp'],
                },
                {
                    table: 'logs',
                    name: 'idx_logs_business_action',
                    columns: ['businessId', 'action'],
                },
            ];

            for (const index of indexes) {
                try {
                    const indexExists = await queryRunner.hasIndex(index.table, index.name);
                    if (!indexExists) {
                        await queryRunner.createIndex(
                            index.table,
                            new (await import('typeorm')).Index({
                                name: index.name,
                                columnNames: index.columns,
                            })
                        );
                        logger.info(`Created index: ${index.name} on ${index.table}`);
                    }
                } catch (error) {
                    logger.warn(`Failed to create index ${index.name}:`, error);
                }
            }
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Clean up old data for performance
     */
    async performDataCleanup(): Promise<void> {
        const queryRunner = AppDataSource.createQueryRunner();
        
        try {
            // Clean up old logs (older than 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            const logDeleteResult = await queryRunner.query(
                'DELETE FROM logs WHERE timestamp < $1',
                [sixMonthsAgo]
            );
            
            logger.info(`Cleaned up ${logDeleteResult.affectedRows || 0} old log entries`);

            // Clean up expired sessions/tokens from Redis
            await cacheService.invalidateByPattern('refresh_token:*');
            await cacheService.invalidateByPattern('blacklist:*');
            
            // Vacuum database for PostgreSQL
            if (process.env.NODE_ENV === 'production') {
                await queryRunner.query('VACUUM ANALYZE');
                logger.info('Database vacuum and analyze completed');
            }
            
        } catch (error) {
            logger.error('Data cleanup failed:', error);
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Get database statistics for monitoring
     */
    async getDatabaseStats(): Promise<{
        connectionCount: number;
        tableStats: Array<{
            table: string;
            rowCount: number;
            size: string;
        }>;
        slowQueryCount: number;
    }> {
        const queryRunner = AppDataSource.createQueryRunner();
        
        try {
            // Get connection count
            const connectionResult = await queryRunner.query(
                'SELECT count(*) as count FROM pg_stat_activity WHERE state = \'active\''
            );
            const connectionCount = parseInt(connectionResult[0]?.count || '0', 10);

            // Get table statistics
            const tableStatsResult = await queryRunner.query(`
                SELECT 
                    schemaname,
                    tablename,
                    n_tup_ins + n_tup_upd + n_tup_del as total_operations,
                    n_tup_ins as inserts,
                    n_tup_upd as updates,
                    n_tup_del as deletes,
                    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
                FROM pg_stat_user_tables 
                WHERE schemaname = 'public'
                ORDER BY total_operations DESC
            `);

            const tableStats = tableStatsResult.map((row: any) => ({
                table: row.tablename,
                rowCount: row.total_operations,
                size: row.size,
            }));

            return {
                connectionCount,
                tableStats,
                slowQueryCount: this.queryCache.size,
            };
        } catch (error) {
            logger.error('Failed to get database stats:', error);
            return {
                connectionCount: 0,
                tableStats: [],
                slowQueryCount: 0,
            };
        } finally {
            await queryRunner.release();
        }
    }

    private generateQueryCacheKey(query: string, parameters: any): string {
        const paramString = JSON.stringify(parameters);
        return `query_${Buffer.from(query + paramString).toString('base64').slice(0, 50)}`;
    }

    private trackQueryPerformance(query: string, executionTime: number): void {
        const existing = this.queryCache.get(query) || 0;
        this.queryCache.set(query, existing + executionTime);

        // Keep cache size manageable
        if (this.queryCache.size > 1000) {
            const oldestKey = this.queryCache.keys().next().value;
            this.queryCache.delete(oldestKey);
        }
    }

    private async generateIndexSuggestions(slowQueries: Array<{ query: string; avgTime: number; count: number }>): Promise<IndexSuggestion[]> {
        const suggestions: IndexSuggestion[] = [];

        for (const slowQuery of slowQueries) {
            // Simple heuristics for index suggestions
            if (slowQuery.query.includes('WHERE') && slowQuery.query.includes('users')) {
                if (slowQuery.query.includes('email')) {
                    suggestions.push({
                        table: 'users',
                        columns: ['email'],
                        type: 'btree',
                        reason: 'Frequent email lookups detected'
                    });
                }
                
                if (slowQuery.query.includes('businessId')) {
                    suggestions.push({
                        table: 'users',
                        columns: ['businessId', 'status'],
                        type: 'btree',
                        reason: 'Frequent business user queries detected'
                    });
                }
            }

            // Add more sophisticated analysis as needed
        }

        return suggestions;
    }
}

export const dbOptimizationService = new DatabaseOptimizationService();
export default dbOptimizationService;
