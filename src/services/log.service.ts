import { AppDataSource } from '../database/data-source';
import { Log, LogAction } from '../database/entities/Log';
import { User } from '../database/entities/User';
import { Business } from '../database/entities/Business';
import { Outlet } from '../database/entities/Outlet';
import ApiError from '../utils/apiError';
import { logger } from '../utils/logger';
import { Between } from 'typeorm';
import { clearCache } from '../middleware/cache.middleware';
import { LogFilters, PaginatedResult, PaginationOptions } from 'types/query';

class LogService {
    private logRepository = AppDataSource.getRepository(Log);
    private userRepository = AppDataSource.getRepository(User);
    private businessRepository = AppDataSource.getRepository(Business);
    private outletRepository = AppDataSource.getRepository(Outlet);

    async createLog(
        performerId: string,
        action: LogAction,
        description: string,
        receiverType?: string,
        receiverId?: string,
        businessId?: string,
        outletId?: string
    ): Promise<Log> {
        const performer = await this.userRepository.findOneBy({ id: performerId });
        if (!performer) {
            logger.warn(`Log created by unknown performer ID: ${performerId}`);
            // Optionally throw error or handle as anonymous log
        }

        const newLog = this.logRepository.create({
            // @ts-ignore
            performer,
            performerId,
            action,
            description,
            receiverType,
            receiverId,
            businessId: businessId || performer?.businessId, // Inherit from performer if not provided
            outletId: outletId || performer?.outletId, // Inherit from performer if not provided
        });

        const savedLog = await this.logRepository.save(newLog);
        logger.info(`Log: ${action} by ${performer?.email || 'Unknown'} - ${description}`);

        // Clear relevant caches for logs
        await clearCache('logs:*');
        await clearCache('dashboard:*'); // Dashboard recent logs

        // @ts-ignore
        return savedLog;
    }

    async getLogs(
        requester: { id: string; userType: string; businessId?: string; outletId?: string },
        filters: LogFilters,
        pagination: PaginationOptions = {}
    ): Promise<PaginatedResult<Log>> {
        const { page = 1, limit = 20, sortBy = 'timestamp', sortOrder = 'DESC' } = pagination;
        const offset = (page - 1) * limit;
    
        const queryBuilder = this.logRepository.createQueryBuilder('log')
            .leftJoinAndSelect('log.performer', 'performer');
    
        // RBAC restrictions
        if (requester.userType === 'owner') {
            queryBuilder.andWhere('log.businessId = :businessId', { businessId: requester.businessId });
        } else if (requester.userType === 'store_executive') {
            queryBuilder.andWhere('log.outletId = :outletId', { outletId: requester.outletId });
        } else if (requester.userType === 'sales_rep') {
            queryBuilder.andWhere('log.performerId = :performerId', { performerId: requester.id });
        }
    
        // Apply filters
        if (filters.performerId) {
            queryBuilder.andWhere('log.performerId = :filterPerformerId', { filterPerformerId: filters.performerId });
        }
        if (filters.receiverType) {
            queryBuilder.andWhere('log.receiverType = :receiverType', { receiverType: filters.receiverType });
        }
        if (filters.receiverId) {
            queryBuilder.andWhere('log.receiverId = :receiverId', { receiverId: filters.receiverId });
        }
        if (filters.action) {
            queryBuilder.andWhere('log.action = :action', { action: filters.action });
        }
        if (filters.businessId) {
            queryBuilder.andWhere('log.businessId = :filterBusinessId', { filterBusinessId: filters.businessId });
        }
        if (filters.outletId) {
            queryBuilder.andWhere('log.outletId = :filterOutletId', { filterOutletId: filters.outletId });
        }
        if (filters.search) {
            queryBuilder.andWhere(
                '(log.description ILIKE :search OR performer.email ILIKE :search OR performer.firstName ILIKE :search OR performer.lastName ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }
        if (filters.createdAt?.start) {
            queryBuilder.andWhere('log.timestamp >= :startDate', { 
                startDate: filters.createdAt.start 
            });
        }
        if (filters.createdAt?.end) {
            queryBuilder.andWhere('log.timestamp <= :endDate', { 
                endDate: filters.createdAt.end 
            });
        }
    
        queryBuilder.orderBy(`log.${sortBy}`, sortOrder)
            .skip(offset)
            .take(limit);
    
        const [logs, totalItems] = await queryBuilder.getManyAndCount();
    
        return {
            data: logs,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
        };
    }
    
}

export default new LogService();
