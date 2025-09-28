export interface PaginationOptions {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
    data: T[];
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
}

export interface BaseFilterOptions {
    search?: string;
    status?: string;
    createdAt?: { start?: Date; end?: Date };
    updatedAt?: { start?: Date; end?: Date };
}

export interface BusinessFilters extends BaseFilterOptions {
    category?: string;
    activeSubStatus?: boolean;
}

export interface OutletFilters extends BaseFilterOptions {
    businessId?: string;
}

export interface ProductFilters extends BaseFilterOptions {
    outletId?: string;
    businessId?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minQuantity?: number;
    maxQuantity?: number;
}

export interface InventoryFilters extends BaseFilterOptions {
    outletId?: string;
    businessId?: string;
    actionerId?: string;
}

export interface SalesFilters extends BaseFilterOptions {
    outletId?: string;
    businessId?: string;
    salesPersonId?: string;
    paymentChannel?: string;
}

export interface LogFilters extends BaseFilterOptions {
    performerId?: string;
    receiverType?: string;
    receiverId?: string;
    action?: string;
    businessId?: string;
    outletId?: string;
}
