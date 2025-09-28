class ApiError extends Error {
    statusCode: number;
    isOperational: boolean;
    status: string;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends ApiError {
    constructor(message = 'Resource not found.') {
        super(message, 404);
    }
}

export class BadRequestError extends ApiError {
    constructor(message = 'Bad request.') {
        super(message, 400);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = 'Authentication failed. Please log in.') {
        super(message, 401);
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = 'You do not have permission to perform this action.') {
        super(message, 403);
    }
}

export class ConflictError extends ApiError {
    constructor(message = 'Resource already exists or conflicts with existing data.') {
        super(message, 409);
    }
}

export default ApiError;
