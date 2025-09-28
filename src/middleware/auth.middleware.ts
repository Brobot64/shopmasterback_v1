import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/apiError';
import { verifyToken, JwtPayload } from '../utils/jwt.utils';
import catchAsync from '../utils/catchAsync';
import { AppDataSource } from '../database/data-source';
import { User, UserStatus } from '../database/entities/User';
import { logger } from '../utils/logger';

const protect = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // 1) Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // 2) Check for token in HttpOnly cookie
    else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new ApiError('You are not logged in! Please log in to get access.', 401));
    }

    // 3) Verify token
    let decoded: JwtPayload;
    try {
        decoded = await verifyToken(token);
        logger.info(`User ${decoded.email} authenticated successfully`);
    } catch (err) {
        logger.warn(`Authentication failed for token: ${err instanceof Error ? err.message : 'Unknown error'}`);
        if (err instanceof ApiError) {
            return next(err);
        }
        return next(new ApiError('Invalid token. Please log in again.', 401));
    }

    // 4) Check if user still exists and is active
    const userRepository = AppDataSource.getRepository(User);
    const currentUser = await userRepository.findOne({
        where: { id: decoded.id },
        select: ['id', 'email', 'userType', 'businessId', 'outletId', 'status'],
    });

    if (!currentUser) {
        return next(new ApiError('The user belonging to this token no longer exists.', 401));
    }

    if (currentUser.status !== UserStatus.ACTIVE) {
        return next(new ApiError('Your account is inactive or suspended. Please contact support.', 403));
    }

    // 5) Attach user payload to request
    req.user = {
        id: currentUser.id,
        email: currentUser.email,
        userType: currentUser.userType,
        businessId: currentUser.businessId,
        outletId: currentUser.outletId,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName
    };

    next();
});

export { protect };
