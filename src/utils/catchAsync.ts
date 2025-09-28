import { Request, Response, NextFunction } from 'express';

const catchAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = fn(req, res, next);
        if (result && typeof result.catch === 'function') {
            result.catch(next);
        }
    };
};

export default catchAsync;
