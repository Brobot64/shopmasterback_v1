import { Request, Response, NextFunction } from 'express';
import inventoryService from '../services/inventory.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/apiError';
import { InventoryStatus } from '../database/entities/Inventory';
import logService from '../services/log.service';
import { LogAction } from '../database/entities/Log';

class InventoryController {
    async recordInventory(req: Request, res: Response, next: NextFunction) {
        const outletId = req.params.outletId; // From URL param
        const { products } = req.body; // Array of { productId, counted }

        const newInventory = await inventoryService.recordInventory(outletId, req.user!.id, products);

        await logService.createLog(
            req.user!.id,
            LogAction.INVENTORY_RECONCILE, // Or a more specific 'INVENTORY_RECORD'
            `Recorded inventory for outlet ${outletId}`,
            'Inventory',
            newInventory.id,
            newInventory.outlet?.businessId,
            newInventory.outletId
        );

        res.status(201).json({
            status: 'success',
            data: { inventory: newInventory },
        });
    }

    async getInventoryById(req: Request, res: Response, next: NextFunction) {
        const inventory = await inventoryService.getInventoryById(req.params.id);

        // RBAC check (already handled by middleware/service)
        if (req.user!.userType === 'owner' && inventory.outlet?.businessId !== req.user!.businessId) {
            return next(new ApiError('You are not authorized to view this inventory record.', 403));
        }
        if ((req.user!.userType === 'store_executive' || req.user!.userType === 'sales_rep') && inventory.outletId !== req.user!.outletId) {
            return next(new ApiError('You are not authorized to view this inventory record.', 403));
        }

        res.status(200).json({
            status: 'success',
            data: { inventory },
        });
    }

    async getAllInventories(req: Request, res: Response, next: NextFunction) {
        const filters = {
            outletId: req.query.outletId as string,
            businessId: req.query.businessId as string,
            status: req.query.status as string,
            actionerId: req.query.actionerId as string,
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
    
        const result = await inventoryService.getAllInventories(
            req.user!,
            filters,
            pagination
        );
    
        res.status(200).json({
            status: 'success',
            ...result
        });
    }
    

    async reconcileInventory(req: Request, res: Response, next: NextFunction) {
        const { products } = req.body; // Array of { productId, reconciledQuantity }
        const updatedInventory = await inventoryService.reconcileInventory(req.params.id, products);

        await logService.createLog(
            req.user!.id,
            LogAction.INVENTORY_RECONCILE,
            `Reconciled inventory record: ${updatedInventory.id}`,
            'Inventory',
            updatedInventory.id,
            updatedInventory.outlet?.businessId,
            updatedInventory.outletId
        );

        res.status(200).json({
            status: 'success',
            data: { inventory: updatedInventory },
        });
    }
}

export default new InventoryController();
