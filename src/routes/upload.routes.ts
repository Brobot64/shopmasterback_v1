import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import { uploadSingleImage, uploadImageEndpoint } from '../utils/upload.utils';
import { authorize } from '../middleware/rbac.middleware';
import { UserRole } from '../database/entities/User';

const router = Router();

router.use(protect); // Only authenticated users can upload

// Endpoint for general image upload
router.post(
    '/image',
    authorize(UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE, UserRole.SALES_REP), // Adjust roles as needed
    uploadSingleImage, // Multer middleware to handle file
    uploadImageEndpoint // Controller logic to upload to Supabase
);

export default router;
