import { Router } from 'express';
import inventoryController from '../controllers/inventory.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize, isStoreExecutiveOfOutlet } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';
import catchAsync from '../utils/catchAsync';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(protect); // All inventory routes require authentication

router.post(
    '/outlets/:outletId/inventories',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    isStoreExecutiveOfOutlet, // Ensure inventory is recorded for an outlet the user has access to
    catchAsync(inventoryController.recordInventory)
);

router.get(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    // Specific inventory access check is handled within controller/service
    cacheMiddleware('inventory'),
    catchAsync(inventoryController.getInventoryById)
);

router.get(
    '/',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    cacheMiddleware('inventories-list'),
    catchAsync(inventoryController.getAllInventories)
);

router.put(
    '/:id/reconcile',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE),
    // Specific inventory access check is handled within controller/service
    catchAsync(inventoryController.reconcileInventory)
);

export default router;
