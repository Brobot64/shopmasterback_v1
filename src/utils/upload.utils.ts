import multer from 'multer';
import { NextFunction, Request, Response } from 'express';
import catchAsync from './catchAsync';
import path from 'path';
import { supabaseServiceRole } from '../config/supabase';
import { logger } from './logger';
import ApiError from './apiError';

// Multer storage configuration (memory storage for streaming to Supabase)
const multerStorage = multer.memoryStorage();

// File filter to allow only images
const multerFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image')) {
        cb(null, true);
    } else {
        cb(new ApiError('Not an image! Please upload only images.', 400));
    }
};

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Middleware for single file upload
export const uploadSingleImage = upload.single('image'); // 'image' is the field name in the form

// Service function to upload to Supabase Storage
export const uploadImageToSupabase = async (file: Express.Multer.File, bucketName: string, folderPath: string = ''): Promise<string> => {
    if (!file) {
        throw new ApiError('No file provided for upload.', 400);
    }

    const fileName = `${folderPath}${Date.now()}-${file.originalname.replace(/\s/g, '_')}`; // Unique filename
    const { data, error } = await supabaseServiceRole.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: false, // Do not overwrite existing files
        });

    if (error) {
        logger.error(`Supabase upload error: ${error.message}`, error);
        throw new ApiError(`Failed to upload image: ${error.message}`, 500);
    }

    // Get public URL
    const { data: publicUrlData } = supabaseServiceRole.storage
        .from(bucketName)
        .getPublicUrl(fileName);

    if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new ApiError('Failed to get public URL for uploaded image.', 500);
    }

    logger.info(`Image uploaded to Supabase: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;
};

// Endpoint for general image upload
// This can be used by frontend to upload an image and get a URL back
// Then the URL can be sent in the DTO for creating/updating entities.
// This is generally preferred over embedding file upload directly into entity creation.
export const uploadImageEndpoint = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
        return next(new ApiError('No image file provided.', 400));
    }

    // Determine bucket and folder based on context (e.g., user type, route)
    // For simplicity, let's use a generic 'shopmaster-images' bucket and 'general' folder
    const bucketName = 'shopmaster-images'; // You need to create this bucket in Supabase
    const folderPath = 'general/';

    const imageUrl = await uploadImageToSupabase(req.file, bucketName, folderPath);

    res.status(200).json({
        status: 'success',
        message: 'Image uploaded successfully',
        data: { imageUrl },
    });
});
