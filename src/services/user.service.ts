import { AppDataSource } from "../database/data-source";
import { User, UserRole, UserStatus } from "../database/entities/User";
import { Business } from "../database/entities/Business";
import { Outlet } from "../database/entities/Outlet";
import { hashPassword } from "../utils/password.utils";
import ApiError from "../utils/apiError";
import { logger } from "../utils/logger";
import notificationService from "./notification.service";
import { clearCache } from "../middleware/cache.middleware";
import { PaginationOptions, PaginatedResult } from "types/query";

class UserService {
	private userRepository = AppDataSource.getRepository(User);
	private businessRepository = AppDataSource.getRepository(Business);
	private outletRepository = AppDataSource.getRepository(Outlet);

	async createUser(
		creatorId: string,
		userData: {
			firstName: string;
			lastName: string;
			email: string;
			phone?: string;
			password?: string;
			userType: UserRole;
			businessId?: string;
			outletId?: string;
		}
	): Promise<User> {
		const creator = await this.userRepository.findOneBy({ id: creatorId });
		if (!creator) {
			throw new ApiError("Creator user not found.", 404);
		}

		// Basic authorization check (more granular checks in controller/middleware)
		if (
			creator.userType === UserRole.OWNER &&
			userData.userType === UserRole.ADMIN
		) {
			throw new ApiError("Owners cannot create Admin users.", 403);
		}
		if (
			creator.userType === UserRole.STORE_EXECUTIVE &&
			userData.userType !== UserRole.SALES_REP
		) {
			throw new ApiError(
				"Store Executives can only create Sales Representatives.",
				403
			);
		}

		const existingUser = await this.userRepository.findOneBy({
			email: userData.email,
		});
		
		if (existingUser) {
			throw new ApiError("User with this email already exists.", 409);
		}

		const hashedPassword = userData.password
			? await hashPassword(userData.password)
			: await hashPassword("defaultPassword123"); // Default password if not provided

		const newUser = this.userRepository.create({
			...userData,
			password: hashedPassword,
			status: UserStatus.ACTIVE, // New users created by admin/owner/exec are active by default
		});

		if (userData.businessId) {
			const business = await this.businessRepository.findOneBy({
				id: userData.businessId,
			});
			if (!business) throw new ApiError("Business not found.", 404);
			newUser.business = business;
		}
		if (userData.outletId) {
			const outlet = await this.outletRepository.findOneBy({
				id: userData.outletId,
			});
			if (!outlet) throw new ApiError("Outlet not found.", 404);
			newUser.outlet = outlet;
		}

		const savedUser = await this.userRepository.save(newUser);
		logger.info(
			`User ${savedUser.email} (${savedUser.userType}) created by ${creator.email}`
		);

		// Clear relevant caches
		await clearCache("admin-active-users:*");
		await clearCache("owner-users:*");
		await clearCache("store-exec-users:*");

		return savedUser;
	}

	async getUserById(userId: string): Promise<User> {
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ["business", "outlet"],
			select: [
				"id",
				"firstName",
				"lastName",
				"email",
				"phone",
				"userType",
				"status",
				"lastLogin",
				"createdAt",
				"updatedAt",
			],
		});
		if (!user) {
			throw new ApiError("User not found.", 404);
		}
		return user;
	}

	async getAllUsers(
		requester: {
			id: string;
			userType: UserRole;
			businessId?: string;
			outletId?: string;
		},
		filters: {
			userType?: UserRole;
			businessId?: string;
			outletId?: string;
			status?: UserStatus;
			search?: string;
		},
		pagination: PaginationOptions = {}
	): Promise<PaginatedResult<User>> {
		const {
			page = 1,
			limit = 20,
			sortBy = "createdAt",
			sortOrder = "DESC",
		} = pagination;
		const offset = (page - 1) * limit;

		const queryBuilder = this.userRepository.createQueryBuilder("user");

		// Apply RBAC restrictions
		if (requester.userType === UserRole.OWNER) {
			queryBuilder.andWhere("user.businessId = :businessId", {
				businessId: requester.businessId,
			});
		} else if (requester.userType === UserRole.STORE_EXECUTIVE) {
			queryBuilder.andWhere("user.outletId = :outletId", {
				outletId: requester.outletId,
			});
		} else if (requester.userType === UserRole.SALES_REP) {
			throw new ApiError("Sales Representatives cannot list users.", 403);
		}

		// Apply filters
		if (filters.userType) {
			queryBuilder.andWhere("user.userType = :userType", {
				userType: filters.userType,
			});
		}
		if (filters.businessId) {
			queryBuilder.andWhere("user.businessId = :filterBusinessId", {
				filterBusinessId: filters.businessId,
			});
		}
		if (filters.outletId) {
			queryBuilder.andWhere("user.outletId = :filterOutletId", {
				filterOutletId: filters.outletId,
			});
		}
		if (filters.status) {
			queryBuilder.andWhere("user.status = :status", {
				status: filters.status,
			});
		}
		if (filters.search) {
			queryBuilder.andWhere(
				"(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)",
				{ search: `%${filters.search}%` }
			);
		}

		queryBuilder.select([
			"user.id",
			"user.firstName",
			"user.lastName",
			"user.email",
			"user.phone",
			"user.userType",
			"user.status",
			"user.lastLogin",
			"user.createdAt",
		]);
		// return queryBuilder.getMany();

		// Apply pagination and sorting
		queryBuilder.orderBy(`user.${sortBy}`, sortOrder).skip(offset).take(limit);
		const [users, totalItems] = await queryBuilder.getManyAndCount();
		const totalPages = Math.ceil(totalItems / limit);
		return {
			data: users,
			totalItems,
			totalPages,
			currentPage: page,
			itemsPerPage: limit,
		};
	}

	async updateUser(
		requesterId: string,
		userIdToUpdate: string,
		updateData: {
			firstName?: string;
			lastName?: string;
			phone?: string;
			password?: string;
			status?: UserStatus;
			outletId?: string;
		}
	): Promise<User> {
		const userToUpdate = await this.userRepository.findOne({
			where: { id: userIdToUpdate },
			relations: ["business", "outlet"],
		});
		if (!userToUpdate) {
			throw new ApiError("User not found.", 404);
		}

		const requester = await this.userRepository.findOneBy({ id: requesterId });
		if (!requester) {
			throw new ApiError("Requester user not found.", 404);
		}

		// RBAC for update
		if (
			requester.userType === UserRole.SALES_REP &&
			requester.id !== userIdToUpdate
		) {
			throw new ApiError(
				"Sales Representatives can only update their own profile.",
				403
			);
		}
		if (
			requester.userType === UserRole.STORE_EXECUTIVE &&
			(userToUpdate.userType === UserRole.OWNER ||
				userToUpdate.userType === UserRole.ADMIN ||
				userToUpdate.outletId !== requester.outletId)
		) {
			throw new ApiError(
				"Store Executives can only update Sales Representatives within their assigned outlet.",
				403
			);
		}
		if (
			requester.userType === UserRole.OWNER &&
			(userToUpdate.userType === UserRole.ADMIN ||
				userToUpdate.businessId !== requester.businessId)
		) {
			throw new ApiError(
				"Owners can only update users within their business scope.",
				403
			);
		}

		// Handle password update
		if (updateData.password) {
			updateData.password = await hashPassword(updateData.password);
		}

		// Handle status change for sales_rep by store_executive (requires owner approval notification)
		if (
			requester.userType === UserRole.STORE_EXECUTIVE &&
			userToUpdate.userType === UserRole.SALES_REP &&
			updateData.status &&
			updateData.status !== userToUpdate.status
		) {
			if (userToUpdate.business?.owner?.email) {
				await notificationService.sendEmail({
					to: userToUpdate.business.owner.email,
					subject: `Sales Rep Status Change Request for ${userToUpdate.firstName} ${userToUpdate.lastName}`,
					html: `<p>Store Executive ${requester.firstName} ${requester.lastName} has requested to change the status of Sales Rep ${userToUpdate.firstName} ${userToUpdate.lastName} from ${userToUpdate.status} to ${updateData.status}.</p><p>Please log in to approve or deny this change.</p>`,
				});
				logger.info(
					`Notification sent to owner for sales rep status change: ${userToUpdate.email}`
				);
			}
			// For simplicity, we'll apply the change directly here. In a real system, this might trigger a 'pending_approval' status.
		}

		// Handle outlet reassignment by owner/admin
		if (
			updateData.outletId &&
			(requester.userType === UserRole.OWNER ||
				requester.userType === UserRole.ADMIN)
		) {
			const newOutlet = await this.outletRepository.findOneBy({
				id: updateData.outletId,
			});
			if (!newOutlet) throw new ApiError("New outlet not found.", 404);
			if (
				requester.userType === UserRole.OWNER &&
				newOutlet.businessId !== requester.businessId
			) {
				throw new ApiError(
					"Owner can only assign users to outlets within their own business.",
					403
				);
			}
			userToUpdate.outlet = newOutlet;
			userToUpdate.outletId = newOutlet.id;
		}

		Object.assign(userToUpdate, updateData);
		const updatedUser = await this.userRepository.save(userToUpdate);
		logger.info(`User ${updatedUser.email} updated by ${requester.email}`);

		// Clear relevant caches
		await clearCache("admin-active-users:*");
		await clearCache("owner-users:*");
		await clearCache("store-exec-users:*");

		return updatedUser;
	}

	async deleteUser(requesterId: string, userIdToDelete: string): Promise<void> {
		const userToDelete = await this.userRepository.findOne({
			where: { id: userIdToDelete },
			relations: ["business", "outlet"],
		});
		if (!userToDelete) {
			throw new ApiError("User not found.", 404);
		}

		const requester = await this.userRepository.findOneBy({ id: requesterId });
		if (!requester) {
			throw new ApiError("Requester user not found.", 404);
		}

		// RBAC for delete
		if (requester.userType === UserRole.SALES_REP) {
			throw new ApiError("Sales Representatives cannot delete users.", 403);
		}
		if (
			requester.userType === UserRole.STORE_EXECUTIVE &&
			(userToDelete.userType === UserRole.OWNER ||
				userToDelete.userType === UserRole.ADMIN ||
				userToDelete.outletId !== requester.outletId)
		) {
			throw new ApiError(
				"Store Executives can only delete Sales Representatives within their assigned outlet.",
				403
			);
		}
		if (
			requester.userType === UserRole.OWNER &&
			(userToDelete.userType === UserRole.ADMIN ||
				userToDelete.userType === UserRole.OWNER ||
				userToDelete.businessId !== requester.businessId)
		) {
			throw new ApiError(
				"Owners can only delete Store Executives or Sales Representatives within their business scope.",
				403
			);
		}

		await this.userRepository.remove(userToDelete);
		logger.info(`User ${userToDelete.email} deleted by ${requester.email}`);

		// Clear relevant caches
		await clearCache("admin-active-users:*");
		await clearCache("owner-users:*");
		await clearCache("store-exec-users:*");
	}
}

export default new UserService();
