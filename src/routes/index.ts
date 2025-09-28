import { Router } from 'express';
import authRoutes from './auth.route';
import userRoutes from './user.route';
import businessRoutes from './business.route';
import outletRoutes from './outlet.route';
import productRoutes from './product.route';
import inventoryRoutes from './inventory.route';
import salesRoutes from './sales.route';
import subscriptionRoutes from './subscription.route';
import dashboardRoutes from './dashboard.route';
import logRoutes from './log.route';
import uploadRoutes from './upload.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/businesses', businessRoutes);
router.use('/outlets', outletRoutes); // Note: Some outlet routes are nested under /businesses
router.use('/products', productRoutes); // Note: Some product routes are nested under /outlets
router.use('/inventories', inventoryRoutes); // Note: Some inventory routes are nested under /outlets
router.use('/sales', salesRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/logs', logRoutes);
router.use('/uploads', uploadRoutes);

export default router;
