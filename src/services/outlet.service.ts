import { AppDataSource } from '../database/data-source';
import { Outlet } from '../database/entities/Outlet';
import { Business } from '../database/entities/Business';
import ApiError from '../utils/apiError';
import { logger } from '../utils/logger';
import { clearCache } from '../middleware/cache.middleware';
import { OutletFilters, PaginatedResult, PaginationOptions } from 'types/query';

class OutletService {
    private outletRepository = AppDataSource.getRepository(Outlet);
    private businessRepository = AppDataSource.getRepository(Business);

    async createOutlet(businessId: string, outletData: any): Promise<Outlet> {
        const business = await this.businessRepository.findOneBy({ id: businessId });
        if (!business) {
            throw new ApiError('Business not found.', 404);
        }

        const newOutlet = this.outletRepository.create({
            ...outletData,
            business,
            businessId: business.id,
            status: 'active',
        });

        const savedOutlet = await this.outletRepository.save(newOutlet);
        // @ts-ignore
        logger.info(`Outlet ${savedOutlet.name} created for business ${business.name}`);

        // Clear relevant caches
        await clearCache('owner-outlets:*');
        await clearCache('store-exec-outlets:*'); // If store exec can view all outlets in their business
        await clearCache('dashboard:*'); // Dashboard data might change

        // @ts-ignore
        return savedOutlet;
    }

    async getOutletById(outletId: string): Promise<Outlet> {
        const outlet = await this.outletRepository.findOne({
            where: { id: outletId },
            relations: ['business', 'users', 'products'],
        });
        if (!outlet) {
            throw new ApiError('Outlet not found.', 404);
        }
        return outlet;
    }

    async getOutletsByBusiness(
        businessId: string,
        filters: OutletFilters,
        pagination: PaginationOptions = {}
    ): Promise<PaginatedResult<Outlet>> {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
        const offset = (page - 1) * limit;
    
        const queryBuilder = this.outletRepository.createQueryBuilder('outlet')
            .where('outlet.businessId = :businessId', { businessId });
    
        // Apply filters
        if (filters.status) {
            queryBuilder.andWhere('outlet.status = :status', { status: filters.status });
        }
        if (filters.search) {
            queryBuilder.andWhere(
                '(outlet.name ILIKE :search OR outlet.address ILIKE :search OR outlet.description ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }
        if (filters.createdAt?.start) {
            queryBuilder.andWhere('outlet.createdAt >= :startDate', { 
                startDate: filters.createdAt.start 
            });
        }
        if (filters.createdAt?.end) {
            queryBuilder.andWhere('outlet.createdAt <= :endDate', { 
                endDate: filters.createdAt.end 
            });
        }
    
        queryBuilder.orderBy(`outlet.${sortBy}`, sortOrder)
            .skip(offset)
            .take(limit);
    
        const [outlets, totalItems] = await queryBuilder.getManyAndCount();
    
        return {
            data: outlets,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
        };
    }
    

    async updateOutlet(outletId: string, updateData: any): Promise<Outlet> {
        const outlet = await this.outletRepository.findOneBy({ id: outletId });
        if (!outlet) {
            throw new ApiError('Outlet not found.', 404);
        }

        Object.assign(outlet, updateData);
        const updatedOutlet = await this.outletRepository.save(outlet);
        logger.info(`Outlet ${updatedOutlet.name} updated.`);

        // Clear relevant caches
        await clearCache('owner-outlets:*');
        await clearCache('store-exec-outlets:*');
        await clearCache('dashboard:*');

        return updatedOutlet;
    }

    async deleteOutlet(outletId: string): Promise<void> {
        const outlet = await this.outletRepository.findOneBy({ id: outletId });
        if (!outlet) {
            throw new ApiError('Outlet not found.', 404);
        }
        await this.outletRepository.remove(outlet);
        logger.info(`Outlet ${outlet.name} deleted.`);

        // Clear relevant caches
        await clearCache('owner-outlets:*');
        await clearCache('store-exec-outlets:*');
        await clearCache('dashboard:*');
    }
}

export default new OutletService();
