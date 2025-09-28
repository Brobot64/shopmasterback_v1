import { Request, Response, NextFunction } from 'express';
import subscriptionService from '../services/subscription.service';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/apiError';
import logService from '../services/log.service';
import { LogAction } from '../database/entities/Log';

class SubscriptionController {
    async createSubscription(req: Request, res: Response, next: NextFunction) {
        const newSubscription = await subscriptionService.createSubscription(req.body);

        await logService.createLog(
            req.user!.id,
            LogAction.CREATE,
            `Created new subscription plan: ${newSubscription.title}`,
            'Subscription',
            newSubscription.id
        );

        res.status(201).json({
            status: 'success',
            data: { subscription: newSubscription },
        });
    }

    async getSubscriptionById(req: Request, res: Response, next: NextFunction) {
        const subscription = await subscriptionService.getSubscriptionById(req.params.id);
        res.status(200).json({
            status: 'success',
            data: { subscription },
        });
    }

    async getAllSubscriptions(req: Request, res: Response, next: NextFunction) {
        const subscriptions = await subscriptionService.getAllSubscriptions();
        res.status(200).json({
            status: 'success',
            results: subscriptions.length,
            data: { subscriptions },
        });
    }

    async updateSubscription(req: Request, res: Response, next: NextFunction) {
        const updatedSubscription = await subscriptionService.updateSubscription(req.params.id, req.body);

        await logService.createLog(
            req.user!.id,
            LogAction.UPDATE,
            `Updated subscription plan: ${updatedSubscription.title}`,
            'Subscription',
            updatedSubscription.id
        );

        res.status(200).json({
            status: 'success',
            data: { subscription: updatedSubscription },
        });
    }

    async deleteSubscription(req: Request, res: Response, next: NextFunction) {
        const subscriptionToDelete = await subscriptionService.getSubscriptionById(req.params.id); // For logging
        await subscriptionService.deleteSubscription(req.params.id);

        await logService.createLog(
            req.user!.id,
            LogAction.DELETE,
            `Deleted subscription plan: ${subscriptionToDelete.title}`,
            'Subscription',
            subscriptionToDelete.id
        );

        res.status(204).json({
            status: 'success',
            data: null,
        });
    }
}

export default new SubscriptionController();
