import { UserRole } from '../database/entities/User';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                userType: UserRole;
                businessId?: string;
                outletId?: string;
                firstName: user.firstName;
                lastName: user.lastName;
            };
        }
    }
}


export interface AuthenticatedRequest extends Express.Request {
    user?: {
        id: string;
        email: string;
        userType: UserRole;
        businessId?: string;
        outletId?: string;
        firstName: user.firstName;
        lastName: user.lastName;
    };
}
