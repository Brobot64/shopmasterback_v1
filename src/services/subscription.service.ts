import { AppDataSource } from '../database/data-source';
import { Subscription } from '../database/entities/Subscription';
import ApiError from '../utils/apiError';
import { logger } from '../utils/logger';
import { clearCache } from '../middleware/cache.middleware';

class SubscriptionService {
    private subscriptionRepository = AppDataSource.getRepository(Subscription);

    async createSubscription(subscriptionData: any): Promise<Subscription> {
        const existingSubscription = await this.subscriptionRepository.findOneBy({ title: subscriptionData.title });
        if (existingSubscription) {
            throw new ApiError('Subscription plan with this title already exists.', 409);
        }

        const newSubscription = this.subscriptionRepository.create(subscriptionData);
        const savedSubscription = await this.subscriptionRepository.save(newSubscription);
        logger.info(`Subscription plan ${savedSubscription[0].title} created.`);

        // Clear relevant caches
        await clearCache('subscriptions:*');
        await clearCache('admin-revenue:*'); // Revenue data might change

        return savedSubscription[0];
    }

    async getSubscriptionById(subscriptionId: string): Promise<Subscription> {
        const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
        if (!subscription) {
            throw new ApiError('Subscription plan not found.', 404);
        }
        return subscription;
    }

    async getAllSubscriptions(): Promise<Subscription[]> {
        return this.subscriptionRepository.find();
    }

    async updateSubscription(subscriptionId: string, updateData: any): Promise<Subscription> {
        const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
        if (!subscription) {
            throw new ApiError('Subscription plan not found.', 404);
        }

        Object.assign(subscription, updateData);
        const updatedSubscription = await this.subscriptionRepository.save(subscription);
        logger.info(`Subscription plan ${updatedSubscription.title} updated.`);

        // Clear relevant caches
        await clearCache('subscriptions:*');
        await clearCache('admin-revenue:*');

        return updatedSubscription;
    }

    async deleteSubscription(subscriptionId: string): Promise<void> {
        const subscription = await this.subscriptionRepository.findOneBy({ id: subscriptionId });
        if (!subscription) {
            throw new ApiError('Subscription plan not found.', 404);
        }
        // Consider checking if any businesses are currently subscribed to this plan
        await this.subscriptionRepository.remove(subscription);
        logger.info(`Subscription plan ${subscription.title} deleted.`);

        // Clear relevant caches
        await clearCache('subscriptions:*');
        await clearCache('admin-revenue:*');
    }
}

export default new SubscriptionService();
