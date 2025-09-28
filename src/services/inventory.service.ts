import { AppDataSource } from '../database/data-source';
import { Inventory, InventoryStatus } from '../database/entities/Inventory';
import { Outlet } from '../database/entities/Outlet';
import { Product } from '../database/entities/Product';
import { User } from '../database/entities/User';
import ApiError from '../utils/apiError';
import { logger } from '../utils/logger';
import { clearCache } from '../middleware/cache.middleware';
import { InventoryFilters, PaginatedResult, PaginationOptions } from 'types/query';

class InventoryService {
    private inventoryRepository = AppDataSource.getRepository(Inventory);
    private outletRepository = AppDataSource.getRepository(Outlet);
    private productRepository = AppDataSource.getRepository(Product);
    private userRepository = AppDataSource.getRepository(User);

    async recordInventory(
        outletId: string,
        actionerId: string,
        productsData: { productId: string; counted: number }[]
    ): Promise<Inventory> {
        const outlet = await this.outletRepository.findOneBy({ id: outletId });
        if (!outlet) {
            throw new ApiError('Outlet not found.', 404);
        }

        const actioner = await this.userRepository.findOneBy({ id: actionerId });
        if (!actioner) {
            throw new ApiError('Actioner user not found.', 404);
        }

        const inventoryProducts = [];
        for (const item of productsData) {
            const product = await this.productRepository.findOneBy({ id: item.productId, outletId });
            if (!product) {
                throw new ApiError(`Product with ID ${item.productId} not found in this outlet.`, 404);
            }
            inventoryProducts.push({
                productId: product.id,
                name: product.name,
                counted: item.counted,
                amountInDb: product.quantity,
                reconciled: false, // Initially not reconciled
            });
        }

        const newInventory = this.inventoryRepository.create({
            outlet,
            outletId: outlet.id,
            actioner,
            actionerId: actioner.id,
            products: inventoryProducts,
            status: InventoryStatus.PENDING,
        });

        const savedInventory = await this.inventoryRepository.save(newInventory);
        logger.info(`Inventory recorded for outlet ${outlet.name} by ${actioner.email}`);

        // Clear relevant caches
        await clearCache('inventory:*');
        await clearCache('dashboard:*'); // Inventory-related dashboard data

        return savedInventory;
    }

    async getInventoryById(inventoryId: string): Promise<Inventory> {
        const inventory = await this.inventoryRepository.findOne({
            where: { id: inventoryId },
            relations: ['outlet', 'actioner'],
        });
        if (!inventory) {
            throw new ApiError('Inventory record not found.', 404);
        }
        return inventory;
    }

    async getAllInventories(
        requester: { id: string; userType: string; businessId?: string; outletId?: string },
        filters: InventoryFilters,
        pagination: PaginationOptions = {}
    ): Promise<PaginatedResult<Inventory>> {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC' } = pagination;
        const offset = (page - 1) * limit;
    
        const queryBuilder = this.inventoryRepository.createQueryBuilder('inventory')
            .leftJoinAndSelect('inventory.outlet', 'outlet')
            .leftJoinAndSelect('inventory.actioner', 'actioner');
    
        // RBAC restrictions
        if (requester.userType === 'owner') {
            queryBuilder.andWhere('outlet.businessId = :businessId', { businessId: requester.businessId });
        } else if (requester.userType === 'store_executive' || requester.userType === 'sales_rep') {
            queryBuilder.andWhere('inventory.outletId = :outletId', { outletId: requester.outletId });
        }
    
        // Apply filters
        if (filters.outletId) {
            queryBuilder.andWhere('inventory.outletId = :filterOutletId', { filterOutletId: filters.outletId });
        }
        if (filters.businessId) {
            queryBuilder.andWhere('outlet.businessId = :filterBusinessId', { filterBusinessId: filters.businessId });
        }
        if (filters.status) {
            queryBuilder.andWhere('inventory.status = :status', { status: filters.status });
        }
        if (filters.actionerId) {
            queryBuilder.andWhere('inventory.actionerId = :actionerId', { actionerId: filters.actionerId });
        }
        if (filters.search) {
            queryBuilder.andWhere(
                '(inventory.description ILIKE :search)',
                { search: `%${filters.search}%` }
            );
        }
        if (filters.createdAt?.start) {
            queryBuilder.andWhere('inventory.createdAt >= :startDate', { 
                startDate: filters.createdAt.start 
            });
        }
        if (filters.createdAt?.end) {
            queryBuilder.andWhere('inventory.createdAt <= :endDate', { 
                endDate: filters.createdAt.end 
            });
        }
    
        queryBuilder.orderBy(`inventory.${sortBy}`, sortOrder)
            .skip(offset)
            .take(limit);
    
        const [inventories, totalItems] = await queryBuilder.getManyAndCount();
    
        return {
            data: inventories,
            totalItems,
            totalPages: Math.ceil(totalItems / limit),
            currentPage: page,
            itemsPerPage: limit,
        };
    }
    

    async reconcileInventory(inventoryId: string, reconciledProductsData: { productId: string; reconciledQuantity: number }[]): Promise<Inventory> {
        const inventory = await this.inventoryRepository.findOne({
            where: { id: inventoryId },
            relations: ['products'],
        });
        if (!inventory) {
            throw new ApiError('Inventory record not found.', 404);
        }
        if (inventory.status === InventoryStatus.RECONCILED) {
            throw new ApiError('Inventory already reconciled.', 400);
        }

        const updatedProductsInInventory = inventory.products.map(item => {
            const reconciledItem = reconciledProductsData.find(rp => rp.productId === item.productId);
            if (reconciledItem) {
                // Update product quantity in main product table
                this.productRepository.update(item.productId, { quantity: reconciledItem.reconciledQuantity })
                    .then(() => logger.info(`Product ${item.name} quantity updated to ${reconciledItem.reconciledQuantity}`))
                    .catch(err => logger.error(`Failed to update product ${item.name} quantity:`, err));

                return { ...item, counted: reconciledItem.reconciledQuantity, reconciled: true };
            }
            return item;
        });

        inventory.products = updatedProductsInInventory;
        inventory.status = InventoryStatus.RECONCILED;

        const updatedInventory = await this.inventoryRepository.save(inventory);
        logger.info(`Inventory ${inventory.id} reconciled.`);

        // Clear relevant caches
        await clearCache('inventory:*');
        await clearCache('products:*'); // Product quantities changed
        await clearCache('dashboard:*');

        return updatedInventory;
    }
}

export default new InventoryService();
