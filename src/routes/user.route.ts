import { Router } from 'express';
import userController from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';
import { authorize, isOwnerOfBusiness, isStoreExecutiveOfOutlet } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';
import catchAsync from '../utils/catchAsync';
// import validationMiddleware from '../middleware/validation.middleware';
// import { CreateUserDto, UpdateUserDto } from '../validation/user.validation'; // DTOs for validation

const router = Router();

router.use(protect); // All user routes require authentication

router.post(
    '/',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE),
    // validationMiddleware(CreateUserDto), // Apply validation
    catchAsync(userController.createUser)
);

router.get(
    '/',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE), // Sales Reps cannot list users
    catchAsync(userController.getAllUsers)
);

router.get(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    // Specific user access check is handled within controller/service
    catchAsync(userController.getUserById)
);

router.put(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP),
    // validationMiddleware(UpdateUserDto, true), // Apply validation, allow partial updates
    catchAsync(userController.updateUser)
);

router.delete(
    '/:id',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE), // Sales Reps cannot delete users
    catchAsync(userController.deleteUser)
);

export default router;
