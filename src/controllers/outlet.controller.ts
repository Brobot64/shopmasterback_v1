import { Request, Response, NextFunction } from 'express';
import outletService from '../services/outlet.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/apiError';
import { UserRole } from '../database/entities/User';
import logService from '../services/log.service';
import { LogAction } from '../database/entities/Log';

class OutletController {
    async createOutlet(req: Request, res: Response, next: NextFunction) {
        const businessId = req.params.businessId; // From URL param
        const newOutlet = await outletService.createOutlet(businessId, req.body);

        await logService.createLog(
            req.user!.id,
            LogAction.CREATE,
            `Created new outlet: ${newOutlet.name} for business ${businessId}`,
            'Outlet',
            newOutlet.id,
            businessId
        );

        res.status(201).json({
            status: 'success',
            data: { outlet: newOutlet },
        });
    }

    async getOutletById(req: Request, res: Response, next: NextFunction) {
        const outlet = await outletService.getOutletById(req.params.id);

        // RBAC check (already handled by isStoreExecutiveOfOutlet middleware, but good to be explicit)
        if (req.user!.userType === UserRole.OWNER && outlet.businessId !== req.user!.businessId) {
            return next(new ApiError('You are not authorized to view this outlet.', 403));
        }
        if (req.user!.userType === UserRole.STORE_EXECUTIVE && outlet.id !== req.user!.outletId) {
            return next(new ApiError('You are not authorized to view this outlet.', 403));
        }
        if (req.user!.userType === UserRole.SALES_REP && outlet.id !== req.user!.outletId) {
            return next(new ApiError('You are not authorized to view this outlet.', 403));
        }

        res.status(200).json({
            status: 'success',
            data: { outlet },
        });
    }

    async getOutletsByBusiness(req: Request, res: Response, next: NextFunction) {
        const businessId = req.params.businessId;
        
        const filters = {
            status: req.query.status as string,
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
    
        const result = await outletService.getOutletsByBusiness(
            businessId,
            filters,
            pagination
        );
    
        res.status(200).json({
            status: 'success',
            ...result
        });
    }    

    async updateOutlet(req: Request, res: Response, next: NextFunction) {
        const updatedOutlet = await outletService.updateOutlet(req.params.id, req.body);

        await logService.createLog(
            req.user!.id,
            LogAction.UPDATE,
            `Updated outlet: ${updatedOutlet.name}`,
            'Outlet',
            updatedOutlet.id,
            updatedOutlet.businessId
        );

        res.status(200).json({
            status: 'success',
            data: { outlet: updatedOutlet },
        });
    }

    async deleteOutlet(req: Request, res: Response, next: NextFunction) {
        const outletToDelete = await outletService.getOutletById(req.params.id); // Get details for logging
        await outletService.deleteOutlet(req.params.id);

        await logService.createLog(
            req.user!.id,
            LogAction.DELETE,
            `Deleted outlet: ${outletToDelete.name}`,
            'Outlet',
            outletToDelete.id,
            outletToDelete.businessId
        );

        res.status(204).json({
            status: 'success',
            data: null,
        });
    }
}

export default new OutletController();
