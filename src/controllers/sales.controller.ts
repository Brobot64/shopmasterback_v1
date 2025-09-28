import { Request, Response, NextFunction } from 'express';
import salesService from '../services/sales.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/apiError';
import { SalesStatus, PaymentChannel } from '../database/entities/Sales';
import logService from '../services/log.service';
import { LogAction } from '../database/entities/Log';

class SalesController {
    async recordSale(req: Request, res: Response, next: NextFunction) {
        const newSale = await salesService.recordSale(req.user!.id, req.body);

        await logService.createLog(
            req.user!.id,
            LogAction.SALES_RECORD,
            `Recorded new sale: ${newSale.id}`,
            'Sales',
            newSale.id,
            newSale.salesPerson?.businessId,
            newSale.salesPerson?.outletId
        );

        res.status(201).json({
            status: 'success',
            data: { sale: newSale },
        });
    }

    async getSaleById(req: Request, res: Response, next: NextFunction) {
        const sale = await salesService.getSaleById(req.params.id);

        // RBAC check (already handled by middleware/service)
        if (req.user!.userType === 'owner' && sale.salesPerson?.businessId !== req.user!.businessId) {
            return next(new ApiError('You are not authorized to view this sale record.', 403));
        }
        if (req.user!.userType === 'store_executive' && sale.salesPerson?.outletId !== req.user!.outletId) {
            return next(new ApiError('You are not authorized to view this sale record.', 403));
        }
        if (req.user!.userType === 'sales_rep' && sale.salesPersonId !== req.user!.id) {
            return next(new ApiError('You are not authorized to view this sale record.', 403));
        }

        res.status(200).json({
            status: 'success',
            data: { sale },
        });
    }

    async getAllSales(req: Request, res: Response, next: NextFunction) {
        const filters = {
            outletId: req.query.outletId as string,
            businessId: req.query.businessId as string,
            salesPersonId: req.query.salesPersonId as string,
            status: req.query.status as string,
            paymentChannel: req.query.paymentChannel as string,
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
    
        const result = await salesService.getAllSales(
            req.user!,
            filters,
            pagination
        );
    
        res.status(200).json({
            status: 'success',
            ...result
        });
    }
    

    async updateSaleStatus(req: Request, res: Response, next: NextFunction) {
        const { status } = req.body;
        const updatedSale = await salesService.updateSaleStatus(req.params.id, status);

        await logService.createLog(
            req.user!.id,
            LogAction.UPDATE,
            `Updated sale ${updatedSale.id} status to ${updatedSale.status}`,
            'Sales',
            updatedSale.id,
            updatedSale.salesPerson?.businessId,
            updatedSale.salesPerson?.outletId
        );

        res.status(200).json({
            status: 'success',
            data: { sale: updatedSale },
        });
    }
}

export default new SalesController();
