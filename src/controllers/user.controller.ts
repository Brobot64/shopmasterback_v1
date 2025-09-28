import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';
import catchAsync from '../utils/catchAsync';
import { PaginationOptions } from 'types/query';
import ApiError from '../utils/apiError';
import { UserRole, UserStatus } from '../database/entities/User';
import logService from '../services/log.service';
import { LogAction } from '../database/entities/Log';

class UserController {
    async createUser(req: Request, res: Response, next: NextFunction) {
        const { userType, businessId, outletId, ...userData } = req.body;
        const creatorId = req.user!.id; // Assumed to be authenticated

        // Basic validation for userType creation based on requester's role
        if (req.user!.userType === UserRole.OWNER && (userType === UserRole.ADMIN || userType === UserRole.OWNER)) {
            return next(new ApiError('Owners cannot create Admin or other Owner users.', 403));
        }
        if (req.user!.userType === UserRole.STORE_EXECUTIVE && userType !== UserRole.SALES_REP) {
            return next(new ApiError('Store Executives can only create Sales Representatives.', 403));
        }

        // Ensure businessId/outletId are correctly set based on creator's scope
        let finalBusinessId = businessId;
        let finalOutletId = outletId;

        if (req.user!.userType === UserRole.OWNER) {
            finalBusinessId = req.user!.businessId; // Owner can only create users for their business
            if (outletId) {
                // If outletId is provided, ensure it belongs to the owner's business
                // This check should ideally be in service or a more robust validation layer
            }
        } else if (req.user!.userType === UserRole.STORE_EXECUTIVE) {
            finalBusinessId = req.user!.businessId;
            finalOutletId = req.user!.outletId; // Store Executive can only create users for their assigned outlet
        }

        const newUser = await userService.createUser(creatorId, {
            email: userData.userData.email,
            password: userData.userData.password,
            firstName: userData.userData.firstName,
            lastName: userData.userData.lastName,
            phone: userData.userData.phone,
            userType,
            businessId: finalBusinessId,
            outletId: finalOutletId,
        });

        await logService.createLog(
            creatorId,
            LogAction.CREATE,
            `Created new user: ${newUser.email} (${newUser.userType})`,
            'User',
            newUser.id,
            newUser.businessId,
            newUser.outletId
        );

        res.status(201).json({
            status: 'success',
            data: { user: newUser },
        });
    }

    async getUserById(req: Request, res: Response, next: NextFunction) {
        const user = await userService.getUserById(req.params.id);

        // RBAC check for viewing specific user (already handled by service, but good to double check)
        if (req.user!.userType === UserRole.OWNER && user.business?.id !== req.user!.businessId) {
            return next(new ApiError('You are not authorized to view this user.', 403));
        }
        if (req.user!.userType === UserRole.STORE_EXECUTIVE && user.outletId !== req.user!.outletId || req.user!.userType === UserRole.STORE_EXECUTIVE && user.outlet?.id !== req.user!.outletId) {
            return next(new ApiError('You are not authorized to view this user.', 403));
        }
        if (req.user!.userType === UserRole.SALES_REP && user.id !== req.user!.id) {
            return next(new ApiError('You are not authorized to view this user.', 403));
        }

        res.status(200).json({
            status: 'success',
            data: { user },
        });
    }

    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        const filters = req.query as { userType?: UserRole; businessId?: string; outletId?: string; status?: UserStatus; search?: string };
        const pagination: PaginationOptions = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
            sortBy: (req.query.sortBy as string) || 'createdAt',
            sortOrder: (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC',
        };
        const result = await userService.getAllUsers(req.user!, filters, pagination);
        res.status(200).json({
            status: 'success',
            ...result, // Spreads data, totalItems, totalPages, currentPage, itemsPerPage
        });
    }

    async updateUser(req: Request, res: Response, next: NextFunction) {
        const updatedUser = await userService.updateUser(req.user!.id, req.params.id, req.body);

        await logService.createLog(
            req.user!.id,
            LogAction.UPDATE,
            `Updated user: ${updatedUser.email} (${updatedUser.userType})`,
            'User',
            updatedUser.id,
            updatedUser.businessId,
            updatedUser.outletId
        );

        res.status(200).json({
            status: 'success',
            data: { user: updatedUser },
        });
    }

    async deleteUser(req: Request, res: Response, next: NextFunction) {
        const userToDelete = await userService.getUserById(req.params.id); // Get user details before deletion for logging
        await userService.deleteUser(req.user!.id, req.params.id);

        await logService.createLog(
            req.user!.id,
            LogAction.DELETE,
            `Deleted user: ${userToDelete.email} (${userToDelete.userType})`,
            'User',
            userToDelete.id,
            userToDelete.businessId,
            userToDelete.outletId
        );

        res.status(204).json({
            status: 'success',
            data: null,
        });
    }
}

export default new UserController();
