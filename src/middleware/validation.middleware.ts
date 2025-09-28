import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';
import ApiError from '../utils/apiError';

const validationMiddleware = (type: any, skipMissingProperties = false) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Use req.body for POST/PUT, req.query for GET query params if validating them
        const dataToValidate = req.body;

        validate(plainToClass(type, dataToValidate), { skipMissingProperties, whitelist: true, forbidNonWhitelisted: true })
            .then((errors: ValidationError[]) => {
                if (errors.length > 0) {
                    const errorMessages = errors.map((error: ValidationError) => {
                        if (error.constraints) {
                            return Object.values(error.constraints).join(', ');
                        }
                        return 'Validation error';
                    }).join('; ');
                    next(new ApiError(`Validation failed: ${errorMessages}`, 400));
                } else {
                    next();
                }
            })
            .catch(next); // Catch any errors during validation process itself
    };
};

export default validationMiddleware;
