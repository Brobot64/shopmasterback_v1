import { AppDataSource } from '../database/data-source';
import { Product, ProductStatus } from '../database/entities/Product';
import { Outlet } from '../database/entities/Outlet';
import { Business } from '../database/entities/Business';
import ApiError from '../utils/apiError';
import { logger } from '../utils/logger';
import { clearCache } from '../middleware/cache.middleware';
import { PaginatedResult, PaginationOptions, ProductFilters } from 'types/query';

class ProductService {
    private productRepository = AppDataSource.getRepository(Product);
    private outletRepository = AppDataSource.getRepository(Outlet);
    private businessRepository = AppDataSource.getRepository(Business);

    async createProduct(outletId: string, productData: any): Promise<Product> {
        const outlet = await this.outletRepository.findOne({
            where: { id: outletId },
            relations: ['business'],
        });
        if (!outlet) {
            throw new ApiError('Outlet not found.', 404);
        }

        console.log(productData);

        const newProduct = this.productRepository.create({
            ...productData,
            outlet,
            outletId: outlet.id,
            business: outlet.business,
            businessId: outlet.business.id,
            status: ProductStatus.AVAILABLE,
        });

        const savedProduct = await this.productRepository.save(newProduct);
        // @ts-ignore
        logger.info(`Product ${savedProduct.name} created in outlet ${outlet.name}`);

        // Clear relevant caches
        await clearCache('products:*');
        await clearCache('dashboard:*'); // Product-related dashboard data

        // @ts-ignore
        return savedProduct;
    }

    async getProductById(productId: string): Promise<Product> {
        const product = await this.productRepository.findOne({
            where: { id: productId },
            relations: ['outlet', 'business'],
        });
        if (!product) {
            throw new ApiError('Product not found.', 404);
        }
        return product;
    }

    async getProductsByOutlet(outletId: string, pagination: PaginationOptions = {}): Promise<PaginatedResult<Product>> {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
        const offset = (page - 1) * limit;

        const queryBuilder = this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.outlet', 'outlet')
            .leftJoinAndSelect('product.business', 'business')
            .where('product.outletId = :outletId', { outletId });

        queryBuilder.orderBy(`product.${sortBy}`, sortOrder)
            .skip(offset)
            .take(limit);

        const [products, totalItems] = await queryBuilder.getManyAndCount();

        return {
            data: products,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
        };
    }

    async getAllProducts(
        requester: { id: string; userType: string; businessId?: string; outletId?: string },
        filters: ProductFilters,
        pagination: PaginationOptions = {}
    ): Promise<PaginatedResult<Product>> {
        console.log(requester);
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
        const offset = (page - 1) * limit;
    
        const queryBuilder = this.productRepository.createQueryBuilder('product')
            .leftJoinAndSelect('product.outlet', 'outlet')
            .leftJoinAndSelect('product.business', 'business');
    
        // RBAC restrictions
        if (requester.userType === 'owner') {
            queryBuilder.andWhere('product.businessId = :businessId', { businessId: requester.businessId });
        } else if (requester.userType === 'store_executive' || requester.userType === 'sales_rep') {
            queryBuilder.andWhere('product.outletId = :outletId', { outletId: requester.outletId });
        }
    
        // Apply filters
        if (filters.outletId) {
            queryBuilder.andWhere('product.outletId = :filterOutletId', { filterOutletId: filters.outletId });
        }
        if (filters.businessId) {
            queryBuilder.andWhere('product.businessId = :filterBusinessId', { filterBusinessId: filters.businessId });
        }
        if (filters.category) {
            queryBuilder.andWhere('product.category = :category', { category: filters.category });
        }
        if (filters.status) {
            queryBuilder.andWhere('product.status = :status', { status: filters.status });
        }
        if (filters.minPrice) {
            queryBuilder.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
        }
        if (filters.maxPrice) {
            queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
        }
        if (filters.minQuantity) {
            queryBuilder.andWhere('product.quantity >= :minQuantity', { minQuantity: filters.minQuantity });
        }
        if (filters.maxQuantity) {
            queryBuilder.andWhere('product.quantity <= :maxQuantity', { maxQuantity: filters.maxQuantity });
        }
        if (filters.search) {
            queryBuilder.andWhere(
                '(product.name ILIKE :search OR product.description ILIKE :search OR product.skuNumber ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }
        if (filters.createdAt?.start) {
            queryBuilder.andWhere('product.createdAt >= :startDate', { 
                startDate: filters.createdAt.start 
            });
        }
        if (filters.createdAt?.end) {
            queryBuilder.andWhere('product.createdAt <= :endDate', { 
                endDate: filters.createdAt.end 
            });
        }
    
        // Sales Reps don't see price worth
        if (requester.userType === 'sales_rep') {
            queryBuilder.select([
                'product.id', 'product.name', 'product.description', 'product.quantity',
                'product.category', 'product.tags', 'product.imageUrl', 'product.skuNumber',
                'product.status', 'product.reOrderPoint', 'product.createdAt', 'product.updatedAt'
            ]);
        }
    
        queryBuilder.orderBy(`product.${sortBy}`, sortOrder)
            .skip(offset)
            .take(limit);
    
        const [products, totalItems] = await queryBuilder.getManyAndCount();
    
        return {
            data: products,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
        };
    }
    

    async updateProduct(productId: string, updateData: any): Promise<Product> {
        const product = await this.productRepository.findOneBy({ id: productId });
        if (!product) {
            throw new ApiError('Product not found.', 404);
        }

        Object.assign(product, updateData);
        const updatedProduct = await this.productRepository.save(product);
        logger.info(`Product ${updatedProduct.name} updated.`);

        // Clear relevant caches
        await clearCache('products:*');
        await clearCache('dashboard:*');

        return updatedProduct;
    }

    async deleteProduct(productId: string): Promise<void> {
        const product = await this.productRepository.findOneBy({ id: productId });
        if (!product) {
            throw new ApiError('Product not found.', 404);
        }
        await this.productRepository.remove(product);
        logger.info(`Product ${product.name} deleted.`);

        // Clear relevant caches
        await clearCache('products:*');
        await clearCache('dashboard:*');
    }
}

export default new ProductService();
