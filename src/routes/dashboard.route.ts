import { Router } from 'express';
import dashboardController from '../controllers/dashboard.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize, isOwnerOfBusiness, isStoreExecutiveOfOutlet, isSalesRepresentative } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';
import { cacheMiddleware } from '../middleware/cache.middleware';
import catchAsync from '../utils/catchAsync';

const router = Router();

router.use(protect); // All dashboard routes require authentication

// Owner Dashboard Endpoints
router.get(
    '/owner/sales/total',
    authorize(UserRole.OWNER, UserRole.ADMIN),
    isOwnerOfBusiness,
    cacheMiddleware('dashboard-owner-total-sales'),
    catchAsync(dashboardController.getOwnerTotalSales)
);
router.get(
    '/owner/amount/total',
    authorize(UserRole.OWNER, UserRole.ADMIN),
    isOwnerOfBusiness,
    cacheMiddleware('dashboard-owner-total-amount'),
    catchAsync(dashboardController.getOwnerTotalAmountMade)
);
router.get(
    '/owner/products/available',
    authorize(UserRole.OWNER, UserRole.ADMIN),
    isOwnerOfBusiness,
    cacheMiddleware('dashboard-owner-products-available'),
    catchAsync(dashboardController.getOwnerTotalAvailableProductsWorth)
);
router.get(
    '/owner/sales/outlets-over-time',
    authorize(UserRole.OWNER, UserRole.ADMIN),
    isOwnerOfBusiness,
    cacheMiddleware('dashboard-owner-sales-outlets-over-time'),
    catchAsync(dashboardController.getOwnerSalesAcrossOutletsOverTime)
);
router.get(
    '/owner/products/top-categories',
    authorize(UserRole.OWNER, UserRole.ADMIN),
    isOwnerOfBusiness,
    cacheMiddleware('dashboard-owner-top-categories'),
    catchAsync(dashboardController.getOwnerTopSoldProductCategories)
);
router.get(
    '/owner/outlets/top-performing',
    authorize(UserRole.OWNER, UserRole.ADMIN),
    isOwnerOfBusiness,
    cacheMiddleware('dashboard-owner-top-outlets'),
    catchAsync(dashboardController.getOwnerTopPerformingOutlets)
);
router.get(
    '/owner/logs/recent',
    authorize(UserRole.OWNER, UserRole.ADMIN),
    isOwnerOfBusiness,
    cacheMiddleware('dashboard-owner-recent-logs'),
    catchAsync(dashboardController.getOwnerRecentLogs)
);

// Store Executive Dashboard Endpoints
router.get(
    '/store-executive/sales/total',
    authorize(UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet,
    cacheMiddleware('dashboard-store-exec-total-sales'),
    catchAsync(dashboardController.getStoreExecutiveTotalSales)
);
router.get(
    '/store-executive/amount/total',
    authorize(UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet,
    cacheMiddleware('dashboard-store-exec-total-amount'),
    catchAsync(dashboardController.getStoreExecutiveTotalAmountMade)
);
router.get(
    '/store-executive/products/available',
    authorize(UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet,
    cacheMiddleware('dashboard-store-exec-products-available'),
    catchAsync(dashboardController.getStoreExecutiveTotalAvailableProductsWorth)
);
router.get(
    '/store-executive/sales/over-time',
    authorize(UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet,
    cacheMiddleware('dashboard-store-exec-sales-over-time'),
    catchAsync(dashboardController.getStoreExecutiveSalesOverTime)
);
router.get(
    '/store-executive/products/top-categories',
    authorize(UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet,
    cacheMiddleware('dashboard-store-exec-top-categories'),
    catchAsync(dashboardController.getStoreExecutiveTopSoldProductCategories)
);
router.get(
    '/store-executive/sales-reps/top-performing',
    authorize(UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet,
    cacheMiddleware('dashboard-store-exec-top-sales-reps'),
    catchAsync(dashboardController.getStoreExecutiveTopPerformingSalesReps)
);
router.get(
    '/store-executive/logs/recent',
    authorize(UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet,
    cacheMiddleware('dashboard-store-exec-recent-logs'),
    catchAsync(dashboardController.getStoreExecutiveRecentLogs)
);

// Sales Rep Dashboard Endpoints
router.get(
    '/sales-rep/sales/total',
    authorize(UserRole.SALES_REP, UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isSalesRepresentative,
    cacheMiddleware('dashboard-sales-rep-total-sales'),
    catchAsync(dashboardController.getSalesRepTotalSales)
);
router.get(
    '/sales-rep/amount/total',
    authorize(UserRole.SALES_REP, UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isSalesRepresentative,
    cacheMiddleware('dashboard-sales-rep-total-amount'),
    catchAsync(dashboardController.getSalesRepTotalAmountMade)
);
router.get(
    '/sales-rep/products/available',
    authorize(UserRole.SALES_REP, UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet, // Sales rep needs to be in an outlet to get products
    cacheMiddleware('dashboard-sales-rep-products-available'),
    catchAsync(dashboardController.getSalesRepAvailableProducts)
);
router.get(
    '/sales-rep/performance/over-time',
    authorize(UserRole.SALES_REP, UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isSalesRepresentative,
    cacheMiddleware('dashboard-sales-rep-performance-over-time'),
    catchAsync(dashboardController.getSalesRepPerformanceSalesOverTime)
);
router.get(
    '/sales-rep/products/top-categories',
    authorize(UserRole.SALES_REP, UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet,
    cacheMiddleware('dashboard-sales-rep-top-categories'),
    catchAsync(dashboardController.getSalesRepTopSoldProductCategories)
);
router.get(
    '/sales-rep/sales-reps/top-performing',
    authorize(UserRole.SALES_REP, UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isStoreExecutiveOfOutlet,
    cacheMiddleware('dashboard-sales-rep-top-performing-sales-reps'),
    catchAsync(dashboardController.getSalesRepTopPerformingSalesReps)
);
router.get(
    '/sales-rep/logs/recent',
    authorize(UserRole.SALES_REP, UserRole.STORE_EXECUTIVE, UserRole.OWNER, UserRole.ADMIN),
    isSalesRepresentative,
    cacheMiddleware('dashboard-sales-rep-recent-logs'),
    catchAsync(dashboardController.getSalesRepRecentLogs)
);

// Admin Dashboard Endpoints
router.get(
    '/admin/users/active-owners',
    authorize(UserRole.ADMIN),
    cacheMiddleware('dashboard-admin-active-owners'),
    catchAsync(dashboardController.getAdminActiveOwners)
);
router.get(
    '/admin/revenue/total',
    authorize(UserRole.ADMIN),
    cacheMiddleware('dashboard-admin-total-revenue'),
    catchAsync(dashboardController.getAdminTotalRevenueGenerated)
);
router.get(
    '/admin/users/active-total',
    authorize(UserRole.ADMIN),
    cacheMiddleware('dashboard-admin-total-active-users'),
    catchAsync(dashboardController.getAdminTotalActiveUsers)
);
router.get(
    '/admin/revenue/chart-data',
    authorize(UserRole.ADMIN),
    cacheMiddleware('dashboard-admin-revenue-chart-data'),
    catchAsync(dashboardController.getAdminRevenueChartData)
);
router.get(
    '/admin/businesses/categories-pie-chart',
    authorize(UserRole.ADMIN),
    cacheMiddleware('dashboard-admin-business-categories-pie-chart'),
    catchAsync(dashboardController.getAdminBusinessCategoriesPieChart)
);
router.get(
    '/admin/businesses/recent-joined',
    authorize(UserRole.ADMIN),
    cacheMiddleware('dashboard-admin-recent-businesses'),
    catchAsync(dashboardController.getAdminRecentNewBusinesses)
);

export default router;
