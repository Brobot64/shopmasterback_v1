import { Request, Response, NextFunction } from 'express';
import logService from '../services/log.service';
import catchAsync from '../utils/catchAsync';
import { LogAction } from '../database/entities/Log';

class LogController {
    async getLogs(req: Request, res: Response, next: NextFunction) {
        const filters = {
            performerId: req.query.performerId as string,
            receiverType: req.query.receiverType as string,
            receiverId: req.query.receiverId as string,
            action: req.query.action as string,
            businessId: req.query.businessId as string,
            outletId: req.query.outletId as string,
            search: req.query.search as string,
            createdAt: {
                start: req.query.createdAtStart ? new Date(req.query.createdAtStart as string) : undefined,
                end: req.query.createdAtEnd ? new Date(req.query.createdAtEnd as string) : undefined
            }
        };
    
        const pagination = {
            page: parseInt(req.query.page as string) || 1,
            limit: parseInt(req.query.limit as string) || 20,
            sortBy: req.query.sortBy as string || 'timestamp',
            sortOrder: req.query.sortOrder as 'ASC' | 'DESC' || 'DESC'
        };
    
        const result = await logService.getLogs(
            req.user!,
            filters,
            pagination
        );
    
        res.status(200).json({
            status: 'success',
            ...result
        });
    }
    
}

export default new LogController();
