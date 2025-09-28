import { Request, Response, NextFunction } from 'express';
import productService from '../services/product.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/apiError';
import { ProductStatus } from '../database/entities/Product';
import logService from '../services/log.service';
import { LogAction } from '../database/entities/Log';

class ProductController {
    async createProduct(req: Request, res: Response, next: NextFunction) {
        const outletId = req.params.outletId; // From URL param
        const newProduct = await productService.createProduct(outletId, req.body);

        await logService.createLog(
            req.user!.id,
            LogAction.CREATE,
            `Created new product: ${newProduct.name} in outlet ${outletId}`,
            'Product',
            newProduct.id,
            newProduct.businessId,
            newProduct.outletId
        );

        res.status(201).json({
            status: 'success',
            data: { product: newProduct },
        });
    }

    async getProductById(req: Request, res: Response, next: NextFunction) {
        const product = await productService.getProductById(req.params.id);

        // RBAC check (already handled by middleware/service, but good to be explicit)
        if (req.user!.userType === 'owner' && product.businessId !== req.user!.businessId) {
            return next(new ApiError('You are not authorized to view this product.', 403));
        }
        if ((req.user!.userType === 'store_executive' || req.user!.userType === 'sales_rep') && product.outletId !== req.user!.outletId) {
            return next(new ApiError('You are not authorized to view this product.', 403));
        }

        res.status(200).json({
            status: 'success',
            data: { product },
        });
    }

    async getAllProducts(req: Request, res: Response, next: NextFunction) {
        const filters = {
            outletId: req.query.outletId as string,
            businessId: req.query.businessId as string,
            category: req.query.category as string,
            status: req.query.status as string,
            minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
            maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
            minQuantity: req.query.minQuantity ? parseInt(req.query.minQuantity as string) : undefined,
            maxQuantity: req.query.maxQuantity ? parseInt(req.query.maxQuantity as string) : undefined,
            search: req.query.search as string,
            createdAt: {
                start: req.query.createdAtStart ? new Date(req.query.createdAtStart as string) : undefined,
                end: req.query.createdAtEnd ? new Date(req.query.createdAtEnd as string) : undefined
            }
        };
    
        const pagination = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
            sortBy: req.query.sortBy as string || 'createdAt',
            sortOrder: req.query.sortOrder as 'ASC' | 'DESC' || 'DESC'
        };
    
        const result = await productService.getAllProducts(
            req.user!,
            filters,
            pagination
        );
    
        res.status(200).json({
            status: 'success',
            ...result
        });
    }
    

    async updateProduct(req: Request, res: Response, next: NextFunction) {
        const updatedProduct = await productService.updateProduct(req.params.id, req.body);

        await logService.createLog(
            req.user!.id,
            LogAction.UPDATE,
            `Updated product: ${updatedProduct.name}`,
            'Product',
            updatedProduct.id,
            updatedProduct.businessId,
            updatedProduct.outletId
        );

        res.status(200).json({
            status: 'success',
            data: { product: updatedProduct },
        });
    }

    async deleteProduct(req: Request, res: Response, next: NextFunction) {
        const productToDelete = await productService.getProductById(req.params.id); // Get details for logging
        await productService.deleteProduct(req.params.id);

        await logService.createLog(
            req.user!.id,
            LogAction.DELETE,
            `Deleted product: ${productToDelete.name}`,
            'Product',
            productToDelete.id,
            productToDelete.businessId,
            productToDelete.outletId
        );

        res.status(204).json({
            status: 'success',
            data: null,
        });
    }
}

export default new ProductController();
