import { Router } from 'express';
import salesController from '../controllers/sales.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize, isSalesRepresentative, isStoreExecutiveOfOutlet } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';
import catchAsync from '../utils/catchAsync';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(protect); // All sales routes require authentication

router.post(
    '/',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    // Sales person's outlet is derived from their token in service
    catchAsync(salesController.recordSale)
);

router.get(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    // Specific sales access check is handled within controller/service
    cacheMiddleware('sale'),
    catchAsync(salesController.getSaleById)
);

router.get(
    '/',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    cacheMiddleware('sales-list'),
    catchAsync(salesController.getAllSales)
);

router.put(
    '/:id/status',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE),
    // Specific sales access check is handled within controller/service
    catchAsync(salesController.updateSaleStatus)
);

export default router;
