import { Router } from 'express';
import authController from '../controllers/auth.controller';
import catchAsync from '../utils/catchAsync';
import { protect } from '../middleware/auth.middleware';
// Assuming you'll create validation schemas for these
// import { validateRegisterOwner, validateLogin, validateVerifyOtp } from '../validation/auth.validation';

const router = Router();

router.post('/signup', catchAsync(authController.registerOwner));
router.post('/verify-signup', catchAsync(authController.verifyOwnerRegistration));
router.post('/login', catchAsync(authController.login));
router.post('/logout', protect, catchAsync(authController.logout));
router.get('/me', protect, catchAsync(authController.getMe));

export default router;
