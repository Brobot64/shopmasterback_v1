import { Router } from 'express';
import productController from '../controllers/product.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize, isOwnerOfBusiness, isStoreExecutiveOfOutlet } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';
import catchAsync from '../utils/catchAsync';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(protect); // All product routes require authentication

router.post(
    '/outlets/:outletId/products',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE),
    isStoreExecutiveOfOutlet, // Ensures product is added to an outlet the user has access to
    catchAsync(productController.createProduct)
);

router.get(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    // Specific product access check is handled within controller/service
    cacheMiddleware('product'),
    catchAsync(productController.getProductById)
);

router.get(
    '/',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    cacheMiddleware('products-list'),
    catchAsync(productController.getAllProducts)
);

router.get(
    '/outlets/:outletId/products',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    cacheMiddleware('products-list'),
    catchAsync(productController.getProductsByOutlet)
);

router.put(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE),
    // Specific product access check is handled within controller/service
    catchAsync(productController.updateProduct)
);

router.delete(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE),
    // Specific product access check is handled within controller/service
    catchAsync(productController.deleteProduct)
);

export default router;
