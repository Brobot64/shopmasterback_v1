import { Router } from 'express';
import subscriptionController from '../controllers/subscription.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';
import catchAsync from '../utils/catchAsync';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(protect); // All subscription routes require authentication

router.post(
    '/',
    authorize(UserRole.ADMIN),
    catchAsync(subscriptionController.createSubscription)
);

router.get(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER), // Owners can view specific plans to subscribe
    cacheMiddleware('subscription'),
    catchAsync(subscriptionController.getSubscriptionById)
);

router.get(
    '/',
    authorize(UserRole.ADMIN, UserRole.OWNER), // Owners can view all plans to subscribe
    cacheMiddleware('subscriptions-list'),
    catchAsync(subscriptionController.getAllSubscriptions)
);

router.put(
    '/:id',
    authorize(UserRole.ADMIN),
    catchAsync(subscriptionController.updateSubscription)
);

router.delete(
    '/:id',
    authorize(UserRole.ADMIN),
    catchAsync(subscriptionController.deleteSubscription)
);

export default router;
