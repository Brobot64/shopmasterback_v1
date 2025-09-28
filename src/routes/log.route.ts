import { Router } from 'express';
import logController from '../controllers/log.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';
import catchAsync from '../utils/catchAsync';
import { cacheMiddleware } from '../middleware/cache.middleware';

const router = Router();

router.use(protect); // All log routes require authentication

router.get(
    '/',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    cacheMiddleware('logs-list'),
    catchAsync(logController.getLogs)
);

export default router;
