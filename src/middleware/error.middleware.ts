import { Request, Response, NextFunction } from 'express';
import ApiError, { NotFoundError, BadRequestError, UnauthorizedError, ForbiddenError, ConflictError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { QueryFailedError } from 'typeorm';
import { MulterError } from 'multer';

const handleCastErrorDB = (err: any) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new BadRequestError(message);
};

const handleDuplicateFieldsDB = (err: any) => {
    const value = err.detail.match(/\((.*?)\)/)[1];
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new ConflictError(message);
};

const handleValidationErrorDB = (err: any) => {
    const errors = Object.values(err.errors).map((el: any) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new BadRequestError(message);
};

const handleJWTError = () => new UnauthorizedError('Invalid token. Please log in again!');

const handleJWTExpiredError = () => new UnauthorizedError('Your token has expired! Please log in again.');

const sendErrorDev = (err: ApiError, res: Response) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err: ApiError, res: Response) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        // Programming or other unknown error: don't leak error details
        logger.error('ERROR 💥', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
};

const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message; // Ensure message is copied

        // Handle specific database errors (TypeORM/PostgreSQL)
        if (err.name === 'CastError') error = handleCastErrorDB(error); // Mongoose specific, but can adapt for TypeORM if needed
        if (err.code === '23505') error = handleDuplicateFieldsDB(error); // PostgreSQL unique_violation error code
        if (err.name === 'ValidationError') error = handleValidationErrorDB(error); // Mongoose specific, adapt for class-validator if needed

        // JWT errors
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

        // Multer errors
        if (err instanceof MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                error = new BadRequestError('File too large! Max 5MB allowed.');
            } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                error = new BadRequestError('Too many files uploaded or unexpected field name.');
            } else {
                error = new BadRequestError(`File upload error: ${err.message}`);
            }
        }

        // Custom API errors
        if (err instanceof ApiError) {
            sendErrorProd(err, res);
        } else {
            // Fallback for unhandled errors
            sendErrorProd(new ApiError(error.message || 'Something went wrong!', error.statusCode || 500), res);
        }
    }
};

export default errorMiddleware;
