import { AppDataSource } from '../database/data-source';
import { Sales, SalesStatus, PaymentChannel } from '../database/entities/Sales';
import { SalesProduct } from '../database/entities/SalesProduct';
import { Product } from '../database/entities/Product';
import { User } from '../database/entities/User';
import ApiError from '../utils/apiError';
import { logger } from '../utils/logger';
import { clearCache } from '../middleware/cache.middleware';
import { PaginatedResult, PaginationOptions, SalesFilters } from 'types/query';

class SalesService {
    private salesRepository = AppDataSource.getRepository(Sales);
    private salesProductRepository = AppDataSource.getRepository(SalesProduct);
    private productRepository = AppDataSource.getRepository(Product);
    private userRepository = AppDataSource.getRepository(User);

    async recordSale(
        salesPersonId: string,
        saleData: {
            products: { productId: string; quantity: number }[];
            customer?: { name: string; phone?: string; email?: string; address?: string };
            discount?: number;
            amountPaid: number;
            paymentChannel: PaymentChannel;
            status?: SalesStatus;
        }
    ): Promise<Sales> {
        const salesPerson = await this.userRepository.findOneBy({ id: salesPersonId });
        if (!salesPerson) {
            throw new ApiError('Sales person not found.', 404);
        }

        let totalAmount = 0;
        const salesProducts: SalesProduct[] = [];

        for (const item of saleData.products) {
            const product = await this.productRepository.findOneBy({ id: item.productId, outletId: salesPerson.outletId });
            if (!product) {
                throw new ApiError(`Product with ID ${item.productId} not found in your assigned outlet.`, 404);
            }
            if (product.quantity < item.quantity) {
                throw new ApiError(`Insufficient stock for product ${product.name}. Available: ${product.quantity}`, 400);
            }

            const salesProduct = this.salesProductRepository.create({
                productId: product.id,
                productName: product.name,
                quantity: item.quantity,
                priceAtSale: product.price,
            });
            salesProducts.push(salesProduct);
            totalAmount += product.price * item.quantity;

            // Deduct quantity from product stock
            product.quantity -= item.quantity;
            await this.productRepository.save(product);
        }

        if (saleData.discount) {
            totalAmount -= saleData.discount;
        }

        const newSale = this.salesRepository.create({
            ...saleData,
            totalAmount,
            remainingToPay: totalAmount - saleData.amountPaid,
            salesPerson,
            salesPersonId: salesPerson.id,
            products: salesProducts, // Link sales products
        });

        const savedSale = await this.salesRepository.save(newSale);
        logger.info(`Sale ${savedSale.id} recorded by ${salesPerson.email}`);

        // Clear relevant caches
        await clearCache('sales:*');
        await clearCache('dashboard:*'); // Sales-related dashboard data
        await clearCache('products:*'); // Product quantities changed

        return savedSale;
    }

    async getSaleById(saleId: string): Promise<Sales> {
        const sale = await this.salesRepository.findOne({
            where: { id: saleId },
            relations: ['salesPerson', 'products', 'products.product'], // Load sales products and their associated product details
        });
        if (!sale) {
            throw new ApiError('Sale record not found.', 404);
        }
        return sale;
    }

    async getAllSales(
        requester: { id: string; userType: string; businessId?: string; outletId?: string },
        filters: SalesFilters,
        pagination: PaginationOptions = {}
    ): Promise<PaginatedResult<Sales>> {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
        const offset = (page - 1) * limit;
    
        const queryBuilder = this.salesRepository.createQueryBuilder('sales')
            .leftJoinAndSelect('sales.salesPerson', 'salesPerson')
            .leftJoinAndSelect('sales.products', 'salesProducts')
            .leftJoinAndSelect('salesProducts.product', 'product');
    
        // RBAC restrictions
        if (requester.userType === 'owner') {
            queryBuilder.andWhere('salesPerson.businessId = :businessId', { businessId: requester.businessId });
        } else if (requester.userType === 'store_executive') {
            queryBuilder.andWhere('salesPerson.outletId = :outletId', { outletId: requester.outletId });
        } else if (requester.userType === 'sales_rep') {
            queryBuilder.andWhere('sales.salesPersonId = :salesPersonId', { salesPersonId: requester.id });
        }
    
        // Apply filters
        if (filters.outletId) {
            queryBuilder.andWhere('salesPerson.outletId = :filterOutletId', { filterOutletId: filters.outletId });
        }
        if (filters.businessId) {
            queryBuilder.andWhere('salesPerson.businessId = :filterBusinessId', { filterBusinessId: filters.businessId });
        }
        if (filters.salesPersonId) {
            queryBuilder.andWhere('sales.salesPersonId = :filterSalesPersonId', { filterSalesPersonId: filters.salesPersonId });
        }
        if (filters.status) {
            queryBuilder.andWhere('sales.status = :status', { status: filters.status });
        }
        if (filters.paymentChannel) {
            queryBuilder.andWhere('sales.paymentChannel = :paymentChannel', { paymentChannel: filters.paymentChannel });
        }
        if (filters.search) {
            queryBuilder.andWhere(
                '(sales.description ILIKE :search OR salesProducts.product.name ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }
        if (filters.createdAt?.start) {
            queryBuilder.andWhere('sales.createdAt >= :startDate', { 
                startDate: filters.createdAt.start 
            });
        }
        if (filters.createdAt?.end) {
            queryBuilder.andWhere('sales.createdAt <= :endDate', { 
                endDate: filters.createdAt.end 
            });
        }
    
        queryBuilder.orderBy(`sales.${sortBy}`, sortOrder)
            .skip(offset)
            .take(limit);
    
        const [sales, totalItems] = await queryBuilder.getManyAndCount();
    
        return {
            data: sales,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
        };
    }
    

    async updateSaleStatus(saleId: string, newStatus: SalesStatus): Promise<Sales> {
        const sale = await this.salesRepository.findOneBy({ id: saleId });
        if (!sale) {
            throw new ApiError('Sale record not found.', 404);
        }
        if (sale.status === newStatus) {
            return sale; // No change needed
        }

        // Only status can be changed, and only to 'returned' for now
        if (newStatus !== SalesStatus.RETURNED) {
            throw new ApiError('Only "returned" status change is currently supported.', 400);
        }

        // Logic for returning products (re-stocking)
        if (newStatus === SalesStatus.RETURNED && sale.status !== SalesStatus.RETURNED) {
            const salesProducts = await this.salesProductRepository.find({ where: { salesId: sale.id } });
            for (const sp of salesProducts) {
                const product = await this.productRepository.findOneBy({ id: sp.productId });
                if (product) {
                    product.quantity += sp.quantity; // Add back to stock
                    await this.productRepository.save(product);
                    logger.info(`Product ${product.name} restocked by ${sp.quantity} units due to sale return.`);
                }
            }
        }

        sale.status = newStatus;
        const updatedSale = await this.salesRepository.save(sale);
        logger.info(`Sale ${updatedSale.id} status updated to ${newStatus}`);

        // Clear relevant caches
        await clearCache('sales:*');
        await clearCache('dashboard:*');
        await clearCache('products:*'); // Product quantities changed

        return updatedSale;
    }
}

export default new SalesService();
