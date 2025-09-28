import { Router } from 'express';
import outletController from '../controllers/outlet.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize, isOwnerOfBusiness, isStoreExecutiveOfOutlet } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';
import catchAsync from '../utils/catchAsync';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(protect); // All outlet routes require authentication

router.post(
    '/businesses/:businessId/outlets',
    authorize(UserRole.ADMIN, UserRole.OWNER),
    isOwnerOfBusiness, // Ensure owner creates outlet for their business
    catchAsync(outletController.createOutlet)
);

router.get(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    isStoreExecutiveOfOutlet, // Ensures store exec/sales rep can only access their assigned outlet
    cacheMiddleware('outlet'),
    catchAsync(outletController.getOutletById)
);

router.get(
    '/businesses/:businessId', // Get all outlets for a specific business
    authorize(UserRole.ADMIN, UserRole.OWNER),
    isOwnerOfBusiness,
    cacheMiddleware('owner-outlets'),
    catchAsync(outletController.getOutletsByBusiness)
);

router.put(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE),
    isStoreExecutiveOfOutlet,
    catchAsync(outletController.updateOutlet)
);

router.delete(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER),
    isOwnerOfBusiness, // Ensure owner deletes outlet from their business
    catchAsync(outletController.deleteOutlet)
);

export default router;
