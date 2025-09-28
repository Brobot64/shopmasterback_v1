import { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/apiError';
import { UserRole } from '../database/entities/User';
import { AppDataSource } from '../database/data-source';
import { Business } from '../database/entities/Business';
import { Outlet } from '../database/entities/Outlet';
import catchAsync from '../utils/catchAsync';

const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.userType)) {
      return next(new ApiError('You do not have permission to perform this action', 403));
    }

    next();
  };
};

const isOwnerOfBusiness = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.userType === UserRole.ADMIN) {
    return next(); // Admin has unrestricted access
  }

  // const businessId =
  //   req.params.id ||
  //   req.params.businessId ||
  //   req.body.businessId ||
  //   req.body.id ||
  //   req.user?.businessId ||
  //   req.user?.id;

  let businessId: string | undefined;

  // 1) Check params
  if (req.params?.id) {
    businessId = req.params.id;
  } else if (req.params?.businessId) {
    businessId = req.params.businessId;
  }

  // 2) Check body
  else if (req.body?.businessId) {
    businessId = req.body.businessId;
  } else if (req.body?.id) {
    businessId = req.body.id;
  }

  // 3) Check user object (if set by auth middleware)
  else if (req.user && typeof req.user === 'object') {
    if ('businessId' in req.user) {
      businessId = (req.user as any).businessId;
    } else if ('id' in req.user) {
      businessId = (req.user as any).id;
    }
  }

  if (!businessId) {
    return next(new ApiError('Business ID is required for this operation.', 400));
  }

  if (req.user?.userType === UserRole.OWNER && req.user.businessId === businessId) {
    return next();
  }

  return next(new ApiError('You are not authorized to access this business.', 403));
});

const isStoreExecutiveOfOutlet = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.userType === UserRole.ADMIN || req.user?.userType === UserRole.OWNER) {
      return next(); // Admin and Owner have broader access
    }

    const outletId = req.params.outletId || req.body.outletId || req.user?.outletId;
    if (!outletId) {
      return next(new ApiError('Outlet ID is required for this operation.', 400));
    }

    if (req.user?.userType === UserRole.STORE_EXECUTIVE && req.user.outletId === outletId) {
      return next();
    }

    return next(new ApiError('You are not authorized to access this outlet.', 403));
  },
);

const isSalesRepresentative = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.userType === UserRole.SALES_REP) {
    return next();
  }
  next(new ApiError('Only Sales Representatives can perform this action.', 403));
};

export { authorize, isOwnerOfBusiness, isStoreExecutiveOfOutlet, isSalesRepresentative };
