import { AppDataSource } from '../database/data-source';
import { Sales } from '../database/entities/Sales';
import { Product } from '../database/entities/Product';
import { User, UserRole, UserStatus } from '../database/entities/User';
import { Business } from '../database/entities/Business';
import { Outlet } from '../database/entities/Outlet';
import { Subscription } from '../database/entities/Subscription';
import { Log } from '../database/entities/Log';
import { Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import ApiError from '../utils/apiError';
import { logger } from '../utils/logger';

export enum SalesStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
}

// Helper to get date range based on timeframe
const getDateRange = (timeframe: string, customStartDate?: string, customEndDate?: string) => {
  let startDate: Date;
  let endDate: Date = new Date(); // Default to now

  switch (timeframe) {
    case 'day':
      startDate = new Date(endDate);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      startDate = new Date(endDate);
      startDate.setMonth(endDate.getMonth() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'year':
      startDate = new Date(endDate);
      startDate.setFullYear(endDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'custom':
      if (!customStartDate || !customEndDate) {
        throw new ApiError('Custom timeframe requires startDate and endDate.', 400);
      }
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      break;
    default:
      // Default to last 30 days if no valid timeframe or custom range
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;
  }
  return { startDate, endDate };
};

class DashboardService {
  private salesRepository = AppDataSource.getRepository(Sales);
  private productRepository = AppDataSource.getRepository(Product);
  private userRepository = AppDataSource.getRepository(User);
  private businessRepository = AppDataSource.getRepository(Business);
  private outletRepository = AppDataSource.getRepository(Outlet);
  private subscriptionRepository = AppDataSource.getRepository(Subscription);
  private logRepository = AppDataSource.getRepository(Log);

  // --- Owner Dashboard ---

  async getOwnerTotalSales(
    businessId: string,
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<number> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    const result = await this.salesRepository
      .createQueryBuilder('sales')
      .leftJoin('sales.salesPerson', 'salesPerson')
      .leftJoin('salesPerson.business', 'business')
      .where('business.id = :businessId', { businessId })
      .andWhere('sales.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select('SUM(sales.totalAmount)', 'totalSales')
      .getRawOne();

    return parseFloat(result?.totalSales || 0);
  }

  async getOwnerTotalAmountMade(
    businessId: string,
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<number> {
    // This is likely the same as total sales if "amount made" refers to revenue from sales
    return this.getOwnerTotalSales(businessId, timeframe, customStartDate, customEndDate);
  }

  async getOwnerTotalAvailableProductsWorth(
    businessId: string,
  ): Promise<{ totalProducts: number; totalWorth: number }> {
    const products = await this.productRepository.find({
      where: { businessId },
    });

    let totalProducts = 0;
    let totalWorth = 0;
    products.forEach((p) => {
      totalProducts += p.quantity;
      totalWorth += p.quantity * p.price;
    });

    return { totalProducts, totalWorth };
  }

  async getOwnerSalesAcrossOutletsOverTime(
    businessId: string,
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<any[]> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    const outlets = await this.outletRepository.find({ where: { businessId } });
    const outletIds = outlets.map((o) => o.id);

    if (outletIds.length === 0) return [];

    let groupByFormat: string;
    switch (timeframe) {
      case 'day':
        groupByFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        groupByFormat = 'YYYY-WW'; // Week of the year
        break;
      case 'monthly':
        groupByFormat = 'YYYY-MM';
        break;
      case 'year':
        groupByFormat = 'YYYY';
        break;
      default:
        groupByFormat = 'YYYY-MM-DD'; // Default to daily
    }

    const salesData = await this.salesRepository
      .createQueryBuilder('sales')
      .leftJoin('sales.salesPerson', 'salesPerson')
      .where('salesPerson.outletId IN (:...outletIds)', { outletIds })
      .andWhere('sales.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select('salesPerson.outletId', 'outletId')
      .addSelect(`TO_CHAR(sales.createdAt, '${groupByFormat}')`, 'timePeriod')
      .addSelect('SUM(sales.totalAmount)', 'totalSales')
      .groupBy('salesPerson.outletId')
      .addGroupBy(`TO_CHAR(sales.createdAt, '${groupByFormat}')`)
      .orderBy('"timePeriod"', 'ASC')
      .getRawMany();

    // Format data for graph: { outletName: [{ date: '...', sales: '...' }] }
    const formattedData: { [key: string]: { timePeriod: string; totalSales: number }[] } = {};
    outlets.forEach((o) => (formattedData[o.name] = []));

    salesData.forEach((data) => {
      const outletName = outlets.find((o) => o.id === data.outletId)?.name || 'Unknown Outlet';
      if (!formattedData[outletName]) {
        formattedData[outletName] = [];
      }
      formattedData[outletName].push({
        timePeriod: data.timePeriod,
        totalSales: parseFloat(data.totalSales),
      });
    });

    return Object.entries(formattedData).map(([outletName, data]) => ({
      outletName,
      data,
    }));
  }

  async getOwnerTopSoldProductCategories(businessId: string): Promise<any[]> {
    const result = await this.salesRepository
      .createQueryBuilder('sales')
      .leftJoin('sales.products', 'salesProduct')
      .leftJoin('salesProduct.product', 'product')
      .leftJoin('sales.salesPerson', 'salesPerson')
      .leftJoin('salesPerson.business', 'business')
      .where('business.id = :businessId', { businessId })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select('product.category', 'category')
      .addSelect('SUM(salesProduct.quantity)', 'totalQuantitySold') // ✅ no quotes
      .groupBy('product.category')
      .orderBy('"totalQuantitySold"', 'DESC') // ✅ matches alias above
      .getRawMany();

    return result.map((r) => ({
      category: r.category,
      totalQuantitySold: parseInt(r.totalQuantitySold),
    }));
  }

  async getOwnerTopPerformingOutlets(businessId: string): Promise<any[]> {
    const result = await this.salesRepository
      .createQueryBuilder('sales')
      .leftJoin('sales.salesPerson', 'salesPerson')
      .leftJoin('salesPerson.outlet', 'outlet')
      .where('outlet.businessId = :businessId', { businessId })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select('outlet.name', 'outletName')
      .addSelect('SUM(sales.totalAmount)', 'totalSales')
      .groupBy('outlet.name')
      .orderBy('"totalSales"', 'DESC')
      .limit(3)
      .getRawMany();

    return result.map((r) => ({ outletName: r.outletName, totalSales: parseFloat(r.totalSales) }));
  }

  async getOwnerRecentLogs(businessId: string): Promise<Log[]> {
    return this.logRepository.find({
      where: { businessId },
      order: { timestamp: 'DESC' },
      take: 5,
      relations: ['performer'],
    });
  }

  // --- Store Executive Dashboard ---

  async getStoreExecutiveTotalSales(
    outletId: string,
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<number> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    const result = await this.salesRepository
      .createQueryBuilder('sales')
      .leftJoin('sales.salesPerson', 'salesPerson')
      .where('salesPerson.outletId = :outletId', { outletId })
      .andWhere('sales.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select('SUM(sales.totalAmount)', 'totalSales')
      .getRawOne();

    return parseFloat(result?.totalSales || 0);
  }

  async getStoreExecutiveTotalAmountMade(
    outletId: string,
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<number> {
    return this.getStoreExecutiveTotalSales(outletId, timeframe, customStartDate, customEndDate);
  }

  async getStoreExecutiveTotalAvailableProductsWorth(
    outletId: string,
  ): Promise<{ totalProducts: number; totalWorth: number }> {
    const products = await this.productRepository.find({
      where: { outletId },
    });

    let totalProducts = 0;
    let totalWorth = 0;
    products.forEach((p) => {
      totalProducts += p.quantity;
      totalWorth += p.quantity * p.price;
    });

    return { totalProducts, totalWorth };
  }

  async getStoreExecutiveSalesOverTime(
    outletId: string,
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<any[]> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    let groupByFormat: string;
    switch (timeframe) {
      case 'day':
        groupByFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        groupByFormat = 'YYYY-WW';
        break;
      case 'monthly':
        groupByFormat = 'YYYY-MM';
        break;
      case 'year':
        groupByFormat = 'YYYY';
        break;
      default:
        groupByFormat = 'YYYY-MM-DD';
    }

    const salesData = await this.salesRepository
      .createQueryBuilder('sales')
      .leftJoin('sales.salesPerson', 'salesPerson')
      .where('salesPerson.outletId = :outletId', { outletId })
      .andWhere('sales.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select(`TO_CHAR(sales.createdAt, '${groupByFormat}')`, 'timePeriod')
      .addSelect('SUM(sales.totalAmount)', 'totalSales')
      .groupBy(`TO_CHAR(sales.createdAt, '${groupByFormat}')`)
      .orderBy('timePeriod', 'ASC')
      .getRawMany();

    return salesData.map((data) => ({
      timePeriod: data.timePeriod,
      totalSales: parseFloat(data.totalSales),
    }));
  }

  async getStoreExecutiveTopSoldProductCategories(outletId: string): Promise<any[]> {
    const result = await this.salesRepository
      .createQueryBuilder('sales')
      .leftJoin('sales.products', 'salesProduct')
      .leftJoin('salesProduct.product', 'product')
      .leftJoin('sales.salesPerson', 'salesPerson')
      .where('salesPerson.outletId = :outletId', { outletId })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select('product.category', 'category')
      .addSelect('SUM(salesProduct.quantity)', '"totalQuantitySold"')
      .groupBy('product.category')
      .orderBy('"totalQuantitySold"', 'DESC')
      .getRawMany();

    return result.map((r) => ({
      category: r.category,
      totalQuantitySold: parseInt(r.totalQuantitySold),
    }));
  }

  async getStoreExecutiveTopPerformingSalesReps(outletId: string): Promise<any[]> {
    const result = await this.salesRepository
      .createQueryBuilder('sales')
      .leftJoin('sales.salesPerson', 'salesPerson')
      .where('salesPerson.outletId = :outletId', { outletId })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select('salesPerson.firstName', 'firstName')
      .addSelect('salesPerson.lastName', 'lastName')
      .addSelect('SUM(sales.totalAmount)', 'totalSales')
      .groupBy('salesPerson.id')
      .orderBy('totalSales', 'DESC')
      .limit(3)
      .getRawMany();

    return result.map((r) => ({
      salesRepName: `${r.firstName} ${r.lastName}`,
      totalSales: parseFloat(r.totalSales),
    }));
  }

  async getStoreExecutiveRecentLogs(outletId: string): Promise<Log[]> {
    return this.logRepository.find({
      where: { outletId },
      order: { timestamp: 'DESC' },
      take: 5,
      relations: ['performer'],
    });
  }

  // --- Sales Rep Dashboard ---

  async getSalesRepTotalSales(
    salesRepId: string,
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<number> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    const result = await this.salesRepository
      .createQueryBuilder('sales')
      .where('sales.salesPersonId = :salesRepId', { salesRepId })
      .andWhere('sales.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select('SUM(sales.totalAmount)', 'totalSales')
      .getRawOne();

    return parseFloat(result?.totalSales || 0);
  }

  async getSalesRepTotalAmountMade(
    salesRepId: string,
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<number> {
    return this.getSalesRepTotalSales(salesRepId, timeframe, customStartDate, customEndDate);
  }

  async getSalesRepAvailableProducts(outletId: string): Promise<{ totalProducts: number }> {
    const products = await this.productRepository.find({
      where: { outletId },
    });

    let totalProducts = 0;
    products.forEach((p) => {
      totalProducts += p.quantity;
    });

    return { totalProducts };
  }

  async getSalesRepPerformanceSalesOverTime(
    salesRepId: string,
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<any[]> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    let groupByFormat: string;
    switch (timeframe) {
      case 'day':
        groupByFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        groupByFormat = 'YYYY-WW';
        break;
      case 'monthly':
        groupByFormat = 'YYYY-MM';
        break;
      case 'year':
        groupByFormat = 'YYYY';
        break;
      default:
        groupByFormat = 'YYYY-MM-DD';
    }

    const salesData = await this.salesRepository
      .createQueryBuilder('sales')
      .where('sales.salesPersonId = :salesRepId', { salesRepId })
      .andWhere('sales.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('sales.status = :status', { status: SalesStatus.COMPLETED })
      .select(`TO_CHAR(sales.createdAt, '${groupByFormat}')`, 'timePeriod')
      .addSelect('SUM(sales.totalAmount)', 'totalSales')
      .groupBy(`TO_CHAR(sales.createdAt, '${groupByFormat}')`)
      .orderBy('timePeriod', 'ASC')
      .getRawMany();

    return salesData.map((data) => ({
      timePeriod: data.timePeriod,
      totalSales: parseFloat(data.totalSales),
    }));
  }

  async getSalesRepTopSoldProductCategories(outletId: string): Promise<any[]> {
    // This is the same as store executive's, as it's outlet-wide
    return this.getStoreExecutiveTopSoldProductCategories(outletId);
  }

  async getSalesRepTopPerformingSalesReps(outletId: string): Promise<any[]> {
    // This is the same as store executive's, as it's outlet-wide
    return this.getStoreExecutiveTopPerformingSalesReps(outletId);
  }

  async getSalesRepRecentLogs(salesRepId: string): Promise<Log[]> {
    return this.logRepository.find({
      where: { performerId: salesRepId },
      order: { timestamp: 'DESC' },
      take: 5,
      relations: ['performer'],
    });
  }

  // --- Admin Dashboard ---

  async getAdminTotalActiveOwners(
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<number> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    const count = await this.userRepository.count({
      where: {
        userType: UserRole.OWNER,
        status: UserStatus.ACTIVE,
        business: {
          activeSubStatus: true,
          status: 'active',
        },
        createdAt: Between(startDate, endDate),
      },
      relations: ['business'],
    });
    return count;
  }

  async getAdminTotalRevenueGenerated(
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<number> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    // This assumes subscription payments are recorded as part of business creation/renewal.
    // For a more robust system, you'd have a separate 'Payment' or 'Transaction' table.
    // For now, we'll sum up the subscription amounts for businesses that became active/renewed within the timeframe.
    // This is a simplified calculation.
    const result = await this.businessRepository
      .createQueryBuilder('business')
      .leftJoin('business.subscription', 'subscription')
      .where('business.activeSubStatus = :active', { active: true })
      .andWhere(
        'business.createdAt BETWEEN :startDate AND :endDate OR business.nextSubRenewal BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      ) // Simplified: count initial subscription or renewals
      .select('SUM(subscription.amount)', 'totalRevenue')
      .getRawOne();

    return parseFloat(result?.totalRevenue || 0);
  }

  async getAdminTotalActiveUsers(
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<number> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    const count = await this.userRepository.count({
      where: {
        status: UserStatus.ACTIVE,
        createdAt: Between(startDate, endDate),
      },
    });
    return count;
  }

  async getAdminRevenueChartData(
    timeframe: string,
    customStartDate?: string,
    customEndDate?: string,
  ): Promise<any[]> {
    const { startDate, endDate } = getDateRange(timeframe, customStartDate, customEndDate);

    let groupByFormat: string;
    switch (timeframe) {
      case 'day':
        groupByFormat = 'YYYY-MM-DD';
        break;
      case 'weekly':
        groupByFormat = 'YYYY-WW';
        break;
      case 'monthly':
        groupByFormat = 'YYYY-MM';
        break;
      case 'year':
        groupByFormat = 'YYYY';
        break;
      default:
        groupByFormat = 'YYYY-MM-DD';
    }

    const result = await this.businessRepository
      .createQueryBuilder('business')
      .leftJoin('business.subscription', 'subscription')
      .where('business.activeSubStatus = :active', { active: true })
      .andWhere(
        'business.createdAt BETWEEN :startDate AND :endDate OR business.nextSubRenewal BETWEEN :startDate AND :endDate',
        { startDate, endDate },
      )
      .select(`TO_CHAR(business.createdAt, '${groupByFormat}')`, 'timePeriod') // Or nextSubRenewal
      .addSelect('SUM(subscription.amount)', 'totalRevenue')
      .groupBy(`TO_CHAR(business.createdAt, '${groupByFormat}')`)
      .orderBy('timePeriod', 'ASC')
      .getRawMany();

    return result.map((r) => ({
      timePeriod: r.timePeriod,
      totalRevenue: parseFloat(r.totalRevenue),
    }));
  }

  async getAdminBusinessCategoriesPieChart(): Promise<any[]> {
    const result = await this.businessRepository
      .createQueryBuilder('business')
      .select('business.category', 'category')
      .addSelect('COUNT(business.id)', 'count')
      .groupBy('business.category')
      .orderBy('count', 'DESC')
      .getRawMany();

    return result.map((r) => ({ category: r.category, count: parseInt(r.count) }));
  }

  async getAdminRecentNewBusinesses(): Promise<Business[]> {
    return this.businessRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: ['owner'],
    });
  }
}

export default new DashboardService();
