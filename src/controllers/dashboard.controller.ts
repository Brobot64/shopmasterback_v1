import { Request, Response, NextFunction } from 'express';
import dashboardService from '../services/dashboard.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/apiError';
import { UserRole } from '../database/entities/User';

class DashboardController {

  constructor() {
    // Bind all methods that will be used as route handlers
    this.getOwnerSalesAcrossOutletsOverTime = this.getOwnerSalesAcrossOutletsOverTime.bind(this);
    this.getOwnerTotalAmountMade = this.getOwnerTotalAmountMade.bind(this);
  }

  // Helper to extract timeframe and custom dates
  private getDashboardQueryParams(req: Request) {
    const timeframe = (req.query.timeframe as string) || 'monthly';

    const customStartDate =
      (req.query.startDate as string) ||
      new Date(new Date().getFullYear(), new Date().getMonth(), 1) // first day of month
        .toISOString()
        .split('T')[0]; // format YYYY-MM-DD

    const customEndDate = (req.query.endDate as string) || new Date().toISOString().split('T')[0]; // today

    // merge original query with defaults/overrides
    return {
      timeframe,
      customStartDate,
      customEndDate,
    };
  }

  // --- Owner Dashboard ---
  async getOwnerTotalSales(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    if (!businessId) return next(new ApiError('Business ID not found for owner.', 400));
    // console.log(this.getDashboardQueryParams(req))
    // const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const totalSales = await dashboardService.getOwnerTotalSales(businessId, 'monthly');
    res.status(200).json({ status: 'success', data: { totalSales } });
  }

  async getOwnerTotalAmountMade(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    if (!businessId) return next(new ApiError('Business ID not found for owner.', 400));
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const totalAmountMade = await dashboardService.getOwnerTotalAmountMade(
      businessId,
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data: { totalAmountMade } });
  }

  async getOwnerTotalAvailableProductsWorth(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    if (!businessId) return next(new ApiError('Business ID not found for owner.', 400));
    const data = await dashboardService.getOwnerTotalAvailableProductsWorth(businessId);
    res.status(200).json({ status: 'success', data });
  }

  async getOwnerSalesAcrossOutletsOverTime(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    if (!businessId) return next(new ApiError('Business ID not found for owner.', 400));
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const data = await dashboardService.getOwnerSalesAcrossOutletsOverTime(
      businessId,
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data });
  }

  async getOwnerTopSoldProductCategories(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    if (!businessId) return next(new ApiError('Business ID not found for owner.', 400));
    const data = await dashboardService.getOwnerTopSoldProductCategories(businessId);
    res.status(200).json({ status: 'success', data });
  }

  async getOwnerTopPerformingOutlets(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    if (!businessId) return next(new ApiError('Business ID not found for owner.', 400));
    const data = await dashboardService.getOwnerTopPerformingOutlets(businessId);
    res.status(200).json({ status: 'success', data });
  }

  async getOwnerRecentLogs(req: Request, res: Response, next: NextFunction) {
    const businessId = req.user!.businessId;
    if (!businessId) return next(new ApiError('Business ID not found for owner.', 400));
    const logs = await dashboardService.getOwnerRecentLogs(businessId);
    res.status(200).json({ status: 'success', data: { logs } });
  }

  // --- Store Executive Dashboard ---
  async getStoreExecutiveTotalSales(req: Request, res: Response, next: NextFunction) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for store executive.', 400));
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const totalSales = await dashboardService.getStoreExecutiveTotalSales(
      outletId,
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data: { totalSales } });
  }

  async getStoreExecutiveTotalAmountMade(req: Request, res: Response, next: NextFunction) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for store executive.', 400));
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const totalAmountMade = await dashboardService.getStoreExecutiveTotalAmountMade(
      outletId,
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data: { totalAmountMade } });
  }

  async getStoreExecutiveTotalAvailableProductsWorth(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for store executive.', 400));
    const data = await dashboardService.getStoreExecutiveTotalAvailableProductsWorth(outletId);
    res.status(200).json({ status: 'success', data });
  }

  async getStoreExecutiveSalesOverTime(req: Request, res: Response, next: NextFunction) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for store executive.', 400));
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const data = await dashboardService.getStoreExecutiveSalesOverTime(
      outletId,
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data });
  }

  async getStoreExecutiveTopSoldProductCategories(req: Request, res: Response, next: NextFunction) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for store executive.', 400));
    const data = await dashboardService.getStoreExecutiveTopSoldProductCategories(outletId);
    res.status(200).json({ status: 'success', data });
  }

  async getStoreExecutiveTopPerformingSalesReps(req: Request, res: Response, next: NextFunction) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for store executive.', 400));
    const data = await dashboardService.getStoreExecutiveTopPerformingSalesReps(outletId);
    res.status(200).json({ status: 'success', data });
  }

  async getStoreExecutiveRecentLogs(req: Request, res: Response, next: NextFunction) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for store executive.', 400));
    const logs = await dashboardService.getStoreExecutiveRecentLogs(outletId);
    res.status(200).json({ status: 'success', data: { logs } });
  }

  // --- Sales Rep Dashboard ---
  async getSalesRepTotalSales(req: Request, res: Response, next: NextFunction) {
    const salesRepId = req.user!.id;
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const totalSales = await dashboardService.getSalesRepTotalSales(
      salesRepId,
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data: { totalSales } });
  }

  async getSalesRepTotalAmountMade(req: Request, res: Response, next: NextFunction) {
    const salesRepId = req.user!.id;
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const totalAmountMade = await dashboardService.getSalesRepTotalAmountMade(
      salesRepId,
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data: { totalAmountMade } });
  }

  async getSalesRepAvailableProducts(req: Request, res: Response, next: NextFunction) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for sales rep.', 400));
    const data = await dashboardService.getSalesRepAvailableProducts(outletId);
    res.status(200).json({ status: 'success', data });
  }

  async getSalesRepPerformanceSalesOverTime(req: Request, res: Response, next: NextFunction) {
    const salesRepId = req.user!.id;
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const data = await dashboardService.getSalesRepPerformanceSalesOverTime(
      salesRepId,
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data });
  }

  async getSalesRepTopSoldProductCategories(req: Request, res: Response, next: NextFunction) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for sales rep.', 400));
    const data = await dashboardService.getSalesRepTopSoldProductCategories(outletId);
    res.status(200).json({ status: 'success', data });
  }

  async getSalesRepTopPerformingSalesReps(req: Request, res: Response, next: NextFunction) {
    const outletId = req.user!.outletId;
    if (!outletId) return next(new ApiError('Outlet ID not found for sales rep.', 400));
    const data = await dashboardService.getSalesRepTopPerformingSalesReps(outletId);
    res.status(200).json({ status: 'success', data });
  }

  async getSalesRepRecentLogs(req: Request, res: Response, next: NextFunction) {
    const salesRepId = req.user!.id;
    const logs = await dashboardService.getSalesRepRecentLogs(salesRepId);
    res.status(200).json({ status: 'success', data: { logs } });
  }

  // --- Admin Dashboard ---
  async getAdminActiveOwners(req: Request, res: Response, next: NextFunction) {
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const count = await dashboardService.getAdminTotalActiveOwners(
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data: { totalActiveOwners: count } });
  }

  async getAdminTotalRevenueGenerated(req: Request, res: Response, next: NextFunction) {
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const totalRevenue = await dashboardService.getAdminTotalRevenueGenerated(
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data: { totalRevenue } });
  }

  async getAdminTotalActiveUsers(req: Request, res: Response, next: NextFunction) {
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const count = await dashboardService.getAdminTotalActiveUsers(
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data: { totalActiveUsers: count } });
  }

  async getAdminRevenueChartData(req: Request, res: Response, next: NextFunction) {
    const { timeframe, customStartDate, customEndDate } = this.getDashboardQueryParams(req);
    const data = await dashboardService.getAdminRevenueChartData(
      timeframe,
      customStartDate,
      customEndDate,
    );
    res.status(200).json({ status: 'success', data });
  }

  async getAdminBusinessCategoriesPieChart(req: Request, res: Response, next: NextFunction) {
    const data = await dashboardService.getAdminBusinessCategoriesPieChart();
    res.status(200).json({ status: 'success', data });
  }

  async getAdminRecentNewBusinesses(req: Request, res: Response, next: NextFunction) {
    const businesses = await dashboardService.getAdminRecentNewBusinesses();
    res.status(200).json({ status: 'success', data: { businesses } });
  }
}

export default new DashboardController();
