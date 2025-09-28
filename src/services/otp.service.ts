import { redisClient } from '../config/redis';
import ApiError from '../utils/apiError';
import { logger } from '../utils/logger';

const OTP_EXPIRY_SECONDS = 10 * 60; // 10 minutes

// In-memory OTP storage for development (when Redis is disabled)
interface OtpData {
    otp: string;
    expiresAt: number;
}

class OtpService {
    private memoryStorage = new Map<string, OtpData>();
    private isRedisEnabled = process.env.REDIS_ENABLED !== 'false';

    private async getClient() {
        if (!this.isRedisEnabled) {
            return null; // No Redis client needed
        }
        
        try {
            if (!redisClient.isClientConnected()) {
                logger.warn('Redis client not connected, falling back to memory storage');
                return null;
            }
            return redisClient.getClient();
        } catch (error) {
            logger.warn('Failed to get Redis client, using memory storage for OTP:', error);
            return null;
        }
    }

    async generateOtp() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async saveOtp(email: string, otp: string): Promise<void> {
        const client = await this.getClient();
        const key = `otp:${email}`;
        
        try {
            if (client) {
                // Use Redis for storage
                await client.setEx(key, OTP_EXPIRY_SECONDS, otp);
                logger.info(`OTP saved in Redis for ${email} with expiry ${OTP_EXPIRY_SECONDS}s`);
            } else {
                // Use memory storage for development
                const expiresAt = Date.now() + (OTP_EXPIRY_SECONDS * 1000);
                this.memoryStorage.set(email, { otp, expiresAt });
                logger.info(`OTP saved in memory for ${email} with expiry ${OTP_EXPIRY_SECONDS}s`);
                
                // Clean up expired OTPs periodically
                this.cleanupExpiredOtps();
            }
        } catch (error) {
            logger.error(`Failed to save OTP for ${email}:`, error);
            throw new ApiError('Failed to save OTP', 500);
        }
    }

    async verifyOtp(email: string, otp: string): Promise<boolean> {
        const client = await this.getClient();
        const key = `otp:${email}`;
        
        try {
            let storedOtp: string | null = null;
            
            if (client) {
                // Use Redis for verification
                storedOtp = await client.get(key);
                if (storedOtp === otp) {
                    await client.del(key);
                    logger.info(`OTP verified and deleted from Redis for ${email}`);
                    return true;
                }
            } else {
                // Use memory storage for verification
                const otpData = this.memoryStorage.get(email);
                if (otpData && Date.now() < otpData.expiresAt) {
                    storedOtp = otpData.otp;
                    if (storedOtp === otp) {
                        this.memoryStorage.delete(email);
                        logger.info(`OTP verified and deleted from memory for ${email}`);
                        return true;
                    }
                } else if (otpData) {
                    // OTP expired, remove it
                    this.memoryStorage.delete(email);
                    logger.warn(`OTP expired for ${email}`);
                }
            }
            
            logger.warn(`OTP verification failed for ${email}`);
            return false;
        } catch (error) {
            logger.error(`Failed to verify OTP for ${email}:`, error);
            throw new ApiError('Failed to verify OTP', 500);
        }
    }

    async regenerateOtp(email: string): Promise<string> {
        const newOtp = await this.generateOtp();
        await this.saveOtp(email, newOtp);
        return newOtp;
    }

    private cleanupExpiredOtps(): void {
        const now = Date.now();
        const expiredEmails: string[] = [];
        
        for (const [email, otpData] of this.memoryStorage) {
            if (now >= otpData.expiresAt) {
                expiredEmails.push(email);
            }
        }
        
        expiredEmails.forEach(email => {
            this.memoryStorage.delete(email);
            logger.debug(`Cleaned up expired OTP for ${email}`);
        });
        
        if (expiredEmails.length > 0) {
            logger.info(`Cleaned up ${expiredEmails.length} expired OTP(s) from memory`);
        }
    }
    
    // Method to get OTP storage info for debugging
    public getStorageInfo(): { type: string; count: number; isRedisConnected: boolean } {
        return {
            type: this.isRedisEnabled && redisClient.isClientConnected() ? 'Redis' : 'Memory',
            count: this.memoryStorage.size,
            isRedisConnected: redisClient.isClientConnected()
        };
    }
}

export default new OtpService();
