import { Request, Response, NextFunction } from 'express';
import businessService from '../services/business.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/apiError';
import { UserRole } from '../database/entities/User';
import logService from '../services/log.service';
import { LogAction } from '../database/entities/Log';
import { businessToSafeDTO } from '../mappers/business.mapper';
import { Business } from 'database/entities/Business';

class BusinessController {
    async createBusiness(req: Request, res: Response, next: NextFunction) {
        // This endpoint is typically called by an Admin or during the initial owner signup process.
        // For owner signup, it's handled by auth.service.
        // If an Admin creates a business for an existing owner, this endpoint would be used.
        if (req.user!.userType !== UserRole.ADMIN) {
            return next(new ApiError('Only Admin users can create businesses directly via this endpoint.', 403));
        }
        const { ownerId, ...businessData } = req.body;
        if (!ownerId) {
            return next(new ApiError('Owner ID is required to create a business.', 400));
        }

        const newBusiness = await businessService.createBusiness(ownerId, businessData);

        await logService.createLog(
            req.user!.id,
            LogAction.CREATE,
            `Created new business: ${newBusiness.name}`,
            'Business',
            newBusiness.id
        );

        res.status(201).json({
            status: 'success',
            data: { business: newBusiness },
        });
    }

    async getBusinessById(req: Request, res: Response, next: NextFunction) {
        const business = await businessService.getBusinessById(req.params.id);

        // RBAC check (already handled by isOwnerOfBusiness middleware, but good to be explicit)
        if (req.user!.userType === UserRole.OWNER && business.id !== req.user!.businessId) {
            return next(new ApiError('You are not authorized to view this business.', 403));
        }

        res.status(200).json({
            status: 'success',
            data: { business: businessToSafeDTO(business as Business) },
        });
    }

    async getAllBusinesses(req: Request, res: Response, next: NextFunction) {
        const filters = {
            status: req.query.status as string,
            category: req.query.category as string,
            activeSubStatus: req.query.activeSubStatus === 'true' ? true : 
                            req.query.activeSubStatus === 'false' ? false : undefined,
            search: req.query.search as string,
            createdAt: {
                start: req.query.createdAtStart ? new Date(req.query.createdAtStart as string) : undefined,
                end: req.query.createdAtEnd ? new Date(req.query.createdAtEnd as string) : undefined
            }
        };
    
        const pagination = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
            sortBy: req.query.sortBy as string || 'createdAt',
            sortOrder: req.query.sortOrder as 'ASC' | 'DESC' || 'DESC'
        };
    
        const result = await businessService.getAllBusinesses(
            req.user!.userType,
            filters,
            pagination
        );
    
        res.status(200).json({
            status: 'success',
            ...result
        });
    }
    

    async updateBusiness(req: Request, res: Response, next: NextFunction) {
        const updatedBusiness = await businessService.updateBusiness(req.params.id, req.body);

        await logService.createLog(
            req.user!.id,
            LogAction.UPDATE,
            `Updated business: ${updatedBusiness.name}`,
            'Business',
            updatedBusiness.id
        );

        res.status(200).json({
            status: 'success',
            data: { business: updatedBusiness },
        });
    }

    async deleteBusiness(req: Request, res: Response, next: NextFunction) {
        const businessToDelete = await businessService.getBusinessById(req.params.id); // Get details for logging
        await businessService.deleteBusiness(req.params.id);

        await logService.createLog(
            req.user!.id,
            LogAction.DELETE,
            `Deleted business: ${businessToDelete.name}`,
            'Business',
            businessToDelete.id
        );

        res.status(204).json({
            status: 'success',
            data: null,
        });
    }

    async subscribeBusiness(req: Request, res: Response, next: NextFunction) {
        const { subscriptionId } = req.body;
        const businessId = req.params.id; // Business ID from URL param

        const updatedBusiness = await businessService.subscribeBusiness(businessId, subscriptionId);

        await logService.createLog(
            req.user!.id,
            LogAction.SUBSCRIPTION_CHANGE,
            `Business ${updatedBusiness.name} subscribed to ${updatedBusiness.subscription?.title}`,
            'Business',
            updatedBusiness.id
        );

        res.status(200).json({
            status: 'success',
            message: 'Business subscribed successfully!',
            data: { business: updatedBusiness },
        });
    }
}

export default new BusinessController();
