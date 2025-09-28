import { AppDataSource } from '../database/data-source';
import { Business } from '../database/entities/Business';
import { User, UserRole } from '../database/entities/User';
import { Subscription } from '../database/entities/Subscription';
import ApiError, { ForbiddenError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { clearCache } from '../middleware/cache.middleware';
import { BusinessFilters, PaginatedResult, PaginationOptions } from 'types/query';

class BusinessService {
    private businessRepository = AppDataSource.getRepository(Business);
    private userRepository = AppDataSource.getRepository(User);
    private subscriptionRepository = AppDataSource.getRepository(Subscription);

    async createBusiness(ownerId: string, businessData: any): Promise<Business> {
        const owner = await this.userRepository.findOneBy({ id: ownerId, userType: UserRole.OWNER });
        if (!owner) {
            throw new ApiError('Only an owner can create a business.', 403);
        }

        const existingBusiness = await this.businessRepository.findOneBy({ name: businessData.name });
        if (existingBusiness) {
            throw new ApiError('Business with this name already exists.', 409);
        }

        const newBusiness = this.businessRepository.create({
            ...businessData,
            owner,
            ownerId: owner.id,
            status: 'active', // Assuming it's active upon creation by a verified owner
            activeSubStatus: false,
        });

        const savedBusiness = await this.businessRepository.save(newBusiness);
        // @ts-ignore
        logger.info(`Business ${savedBusiness.name} created by owner ${owner.email}`);

        // Clear relevant caches
        await clearCache('admin-businesses:*');
        await clearCache('owner-business:*');

        // @ts-ignore
        return savedBusiness;
    }

    async getBusinessById(businessId: string): Promise<Partial<Business>> {
        const business = await this.businessRepository.findOne({
            where: { id: businessId },
            relations: ['owner', 'subscription', 'outlets', 'users'],
        });
        if (!business) {
            throw new ApiError('Business not found.', 404);
        }
        return business;
    }

    async getAllBusinesses(
        requesterUserType: UserRole,
        filters: BusinessFilters,
        pagination: PaginationOptions = {}
    ): Promise<PaginatedResult<Business>> {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
        const offset = (page - 1) * limit;
    
        const queryBuilder = this.businessRepository.createQueryBuilder('business')
            .leftJoinAndSelect('business.owner', 'owner');
    
        if (requesterUserType !== UserRole.ADMIN) {
            throw new ForbiddenError('Only Admin can view all businesses.');
        }
    
        // Apply filters
        if (filters.status) {
            queryBuilder.andWhere('business.status = :status', { status: filters.status });
        }
        if (filters.category) {
            queryBuilder.andWhere('business.category = :category', { category: filters.category });
        }
        if (filters.activeSubStatus !== undefined) {
            queryBuilder.andWhere('business.activeSubStatus = :activeSubStatus', { 
                activeSubStatus: filters.activeSubStatus 
            });
        }
        if (filters.search) {
            queryBuilder.andWhere(
                '(business.name ILIKE :search OR business.description ILIKE :search OR business.address ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }
        if (filters.createdAt?.start) {
            queryBuilder.andWhere('business.createdAt >= :startDate', { 
                startDate: filters.createdAt.start 
            });
        }
        if (filters.createdAt?.end) {
            queryBuilder.andWhere('business.createdAt <= :endDate', { 
                endDate: filters.createdAt.end 
            });
        }
    
        queryBuilder.orderBy(`business.${sortBy}`, sortOrder)
            .skip(offset)
            .take(limit);
    
        const [businesses, totalItems] = await queryBuilder.getManyAndCount();
    
        return {
            data: businesses,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
        };
    }
    

    async updateBusiness(businessId: string, updateData: any): Promise<Business> {
        const business = await this.businessRepository.findOneBy({ id: businessId });
        if (!business) {
            throw new ApiError('Business not found.', 404);
        }

        Object.assign(business, updateData);
        const updatedBusiness = await this.businessRepository.save(business);
        logger.info(`Business ${updatedBusiness.name} updated.`);

        // Clear relevant caches
        await clearCache('admin-businesses:*');
        await clearCache('owner-business:*');

        return updatedBusiness;
    }

    async deleteBusiness(businessId: string): Promise<void> {
        const business = await this.businessRepository.findOneBy({ id: businessId });
        if (!business) {
            throw new ApiError('Business not found.', 404);
        }
        await this.businessRepository.remove(business);
        logger.info(`Business ${business.name} deleted.`);

        // Clear relevant caches
        await clearCache('admin-businesses:*');
        await clearCache('owner-business:*');
    }

    async subscribeBusiness(businessId: string, subscriptionId: string): Promise<Business> {
        const business = await this.businessRepository.findOneBy({ id: businessId });
        if (!business) {
            throw new ApiError('Business not found.', 404);
        }

        const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
        if (!subscription) {
            throw new ApiError('Subscription plan not found.', 404);
        }

        business.subscription = subscription;
        business.subscriptionId = subscription.id;
        business.activeSubStatus = true;
        // Calculate next renewal date based on subscription duration
        const now = new Date();
        if (subscription.duration === 'monthly') {
            business.nextSubRenewal = new Date(now.setMonth(now.getMonth() + 1));
        } else if (subscription.duration === 'quarterly') {
            business.nextSubRenewal = new Date(now.setMonth(now.getMonth() + 3));
        } else if (subscription.duration === 'annually') {
            business.nextSubRenewal = new Date(now.setFullYear(now.getFullYear() + 1));
        } else {
            business.nextSubRenewal = new Date(now.setDate(now.getDate() + 30)); // Default to 30 days
        }

        const updatedBusiness = await this.businessRepository.save(business);
        logger.info(`Business ${updatedBusiness.name} subscribed to ${subscription.title}.`);

        // Clear relevant caches
        await clearCache('admin-businesses:*');
        await clearCache('owner-business:*');
        await clearCache('admin-revenue:*'); // Revenue data might change

        return updatedBusiness;
    }
}

export default new BusinessService();
