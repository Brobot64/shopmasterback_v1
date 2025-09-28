import { User, UserRole } from '../database/entities/User';
import { Business } from '../database/entities/Business';
import { Product } from '../database/entities/Product';
import { Sales } from '../database/entities/Sales';
import { Inventory } from '../database/entities/Inventory';
import { maskEmail, maskPhoneNumber } from './encryption.utils';

// Base interface for transformed data
interface TransformedData {
    [key: string]: any;
}

// Type guard to check if object has sensitive fields
const hasSensitiveFields = (obj: any): obj is { password?: string } => {
    return obj && typeof obj === 'object';
};

/**
 * Transform user data for API responses
 */
export const transformUserData = (
    user: User, 
    requestingUser?: { id: string; userType: UserRole },
    includeBusinessInfo = false
): TransformedData => {
    const baseTransformation: TransformedData = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        userType: user.userType,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };

    // Add last login if user is viewing their own profile or has admin privileges
    if (requestingUser && (requestingUser.id === user.id || requestingUser.userType === UserRole.ADMIN)) {
        baseTransformation.lastLogin = user.lastLogin;
        baseTransformation.phone = user.phone;
    } else if (user.phone) {
        // Mask phone number for other users
        baseTransformation.phone = maskPhoneNumber(user.phone);
    }

    // Include business information if requested and user has access
    if (includeBusinessInfo) {
        if (user.business) {
            baseTransformation.business = transformBusinessData(user.business);
        }
        if (user.outlet) {
            baseTransformation.outlet = {
                id: user.outlet.id,
                name: user.outlet.name,
                address: user.outlet.address,
            };
        }
    }

    // Business and outlet IDs for reference
    baseTransformation.businessId = user.businessId;
    baseTransformation.outletId = user.outletId;

    return baseTransformation;
};

/**
 * Transform business data for API responses
 */
export const transformBusinessData = (business: Business, includeSensitive = false): TransformedData => {
    const transformed: TransformedData = {
        id: business.id,
        name: business.name,
        description: business.description,
        industry: business.industry,
        status: business.status,
        createdAt: business.createdAt,
        updatedAt: business.updatedAt,
    };

    if (includeSensitive) {
        transformed.email = business.email;
        transformed.phone = business.phone;
        transformed.address = business.address;
        transformed.website = business.website;
    } else {
        // Mask sensitive information
        if (business.email) {
            transformed.email = maskEmail(business.email);
        }
        if (business.phone) {
            transformed.phone = maskPhoneNumber(business.phone);
        }
    }

    return transformed;
};

/**
 * Transform product data for API responses
 */
export const transformProductData = (product: Product, includeInternalData = false): TransformedData => {
    const transformed: TransformedData = {
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        barcode: product.barcode,
        status: product.status,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };

    // Include pricing and inventory data only for authorized users
    if (includeInternalData) {
        transformed.costPrice = product.costPrice;
        transformed.sellingPrice = product.sellingPrice;
        transformed.margin = product.margin;
        transformed.taxRate = product.taxRate;
        transformed.minimumStock = product.minimumStock;
        transformed.businessId = product.businessId;
    } else {
        // Only include selling price for external views
        transformed.sellingPrice = product.sellingPrice;
    }

    return transformed;
};

/**
 * Transform sales data for API responses
 */
export const transformSalesData = (sales: Sales, requestingUserRole?: UserRole): TransformedData => {
    const transformed: TransformedData = {
        id: sales.id,
        saleDate: sales.saleDate,
        totalAmount: sales.totalAmount,
        status: sales.status,
        createdAt: sales.createdAt,
    };

    // Include detailed information for authorized roles
    if (requestingUserRole && [UserRole.ADMIN, UserRole.OWNER, UserRole.STORE_EXECUTIVE].includes(requestingUserRole)) {
        transformed.subtotal = sales.subtotal;
        transformed.tax = sales.tax;
        transformed.discount = sales.discount;
        transformed.paymentMethod = sales.paymentMethod;
        transformed.notes = sales.notes;
        transformed.businessId = sales.businessId;
        transformed.outletId = sales.outletId;
        
        if (sales.salesPerson) {
            transformed.salesPerson = transformUserData(sales.salesPerson);
        }
    }

    return transformed;
};

/**
 * Transform inventory data for API responses
 */
export const transformInventoryData = (inventory: Inventory): TransformedData => {
    return {
        id: inventory.id,
        quantity: inventory.quantity,
        lastRestockDate: inventory.lastRestockDate,
        nextRestockDate: inventory.nextRestockDate,
        productId: inventory.productId,
        outletId: inventory.outletId,
        updatedAt: inventory.updatedAt,
    };
};

/**
 * Generic data transformer that removes sensitive fields
 */
export const sanitizeData = <T extends Record<string, any>>(
    data: T,
    sensitiveFields: string[] = ['password', 'token', 'secret', 'key']
): Omit<T, keyof typeof sensitiveFields> => {
    if (!data || typeof data !== 'object') {
        return data;
    }

    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
        delete sanitized[field];
    });

    return sanitized;
};

/**
 * Transform arrays of data
 */
export const transformArray = <T, R>(
    items: T[],
    transformer: (item: T, ...args: any[]) => R,
    ...transformerArgs: any[]
): R[] => {
    return items.map(item => transformer(item, ...transformerArgs));
};

/**
 * Paginated response transformer
 */
export const transformPaginatedResponse = <T, R>(
    data: T[],
    totalItems: number,
    currentPage: number,
    itemsPerPage: number,
    transformer: (item: T, ...args: any[]) => R,
    ...transformerArgs: any[]
): {
    data: R[];
    pagination: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
} => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    return {
        data: transformArray(data, transformer, ...transformerArgs),
        pagination: {
            totalItems,
            totalPages,
            currentPage,
            itemsPerPage,
            hasNextPage: currentPage < totalPages,
            hasPreviousPage: currentPage > 1,
        },
    };
};

/**
 * Remove null and undefined values from objects
 */
export const removeNullValues = <T extends Record<string, any>>(obj: T): Partial<T> => {
    const cleaned: Partial<T> = {};
    
    Object.keys(obj).forEach((key) => {
        const value = obj[key];
        if (value !== null && value !== undefined) {
            if (typeof value === 'object' && !Array.isArray(value)) {
                const cleanedValue = removeNullValues(value);
                if (Object.keys(cleanedValue).length > 0) {
                    cleaned[key as keyof T] = cleanedValue as T[keyof T];
                }
            } else {
                cleaned[key as keyof T] = value;
            }
        }
    });
    
    return cleaned;
};

/**
 * Apply role-based data filtering
 */
export const filterDataByRole = <T extends Record<string, any>>(
    data: T,
    userRole: UserRole,
    rolePermissions: Record<UserRole, string[]>
): Partial<T> => {
    const allowedFields = rolePermissions[userRole] || [];
    const filtered: Partial<T> = {};
    
    allowedFields.forEach(field => {
        if (field in data) {
            filtered[field as keyof T] = data[field];
        }
    });
    
    return filtered;
};

// Export commonly used role permission configurations
export const USER_ROLE_PERMISSIONS = {
    [UserRole.ADMIN]: ['*'], // Admin can see all fields
    [UserRole.OWNER]: ['id', 'firstName', 'lastName', 'email', 'phone', 'userType', 'status', 'businessId', 'outletId', 'createdAt', 'updatedAt', 'lastLogin'],
    [UserRole.STORE_EXECUTIVE]: ['id', 'firstName', 'lastName', 'email', 'userType', 'status', 'outletId', 'createdAt'],
    [UserRole.SALES_REP]: ['id', 'firstName', 'lastName', 'userType', 'status', 'createdAt'],
};

export const BUSINESS_ROLE_PERMISSIONS = {
    [UserRole.ADMIN]: ['*'],
    [UserRole.OWNER]: ['id', 'name', 'description', 'industry', 'email', 'phone', 'address', 'website', 'status', 'createdAt', 'updatedAt'],
    [UserRole.STORE_EXECUTIVE]: ['id', 'name', 'description', 'industry', 'status'],
    [UserRole.SALES_REP]: ['id', 'name', 'status'],
};
