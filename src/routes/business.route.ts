import { Router } from 'express';
import businessController from '../controllers/business.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize, isOwnerOfBusiness } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';
import catchAsync from '../utils/catchAsync';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(protect); // All business routes require authentication

router.post(
    '/',
    authorize(UserRole.ADMIN), // Only Admin can create businesses directly
    catchAsync(businessController.createBusiness)
);

router.get(
    '/',
    authorize(UserRole.ADMIN), // Only Admin can list all businesses
    cacheMiddleware('admin-businesses'),
    catchAsync(businessController.getAllBusinesses)
);

router.get(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER),
    isOwnerOfBusiness, // Ensures owner can only access their own business
    cacheMiddleware('owner-business'),
    catchAsync(businessController.getBusinessById)
);

router.put(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER),
    isOwnerOfBusiness,
    catchAsync(businessController.updateBusiness)
);

router.delete(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER),
    isOwnerOfBusiness,
    catchAsync(businessController.deleteBusiness)
);

router.post(
    '/:id/subscribe',
    authorize(UserRole.OWNER),
    isOwnerOfBusiness,
    catchAsync(businessController.subscribeBusiness)
);

export default router;
