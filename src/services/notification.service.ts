import nodemailerTransporter from '../config/nodemailer';
import { redisClient, termiiConfig } from '../config';
import axios from 'axios';
import { logger } from '../utils/logger';
import ApiError from '../utils/apiError';

interface EmailOptions {
    to: string | string[];
    subject: string;
    html: string;
    text?: string;
}

interface SmsOptions {
    to: string; // Phone number with country code, e.g., "+2348012345678"
    message: string;
}

class NotificationService {
    private async checkRateLimit(email: string): Promise<boolean> {
        const client = await redisClient.getClient();
        const key = `rate_limit:${email}`;
        const current = await client.get(key) || "0";
        
        if (parseInt(current) >= 5) { // Limit to 5 emails per hour
            return false;
        }
        await client.multi()
            .incr(key)
            .expire(key, 3600) // 1 hour TTL
            .exec();
        return true;
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        try {
            // if (!await this.checkRateLimit(options?.to)) {
            //     throw new ApiError('Email rate limit exceeded', 429);
            // }
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: Array.isArray(options.to) ? options.to.join(',') : options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || options.html.replace(/<[^>]*>?/gm, ''), // Basic text fallback
            };

            await nodemailerTransporter.sendMail(mailOptions);
            logger.info(`Email sent successfully to ${options.to}`);
        } catch (error) {
            logger.error(`Error sending email to ${options.to}:`, error);
            throw new ApiError('Failed to send email notification.', 500);
        }
    }

    async sendSms(options: SmsOptions): Promise<void> {
        try {
            const payload = {
                api_key: termiiConfig.apiKey,
                to: options.to,
                from: termiiConfig.senderId,
                sms: options.message,
                channel: termiiConfig.channel,
                type: termiiConfig.smsType,
            };

            const response = await axios.post(`${termiiConfig.baseUrl}/sms/send`, payload);

            if (response.data.code === '200') {
                logger.info(`SMS sent successfully to ${options.to}: ${response.data.message}`);
            } else {
                logger.error(`Termii SMS error to ${options.to}: ${response.data.message}`, response.data);
                throw new ApiError(`Failed to send SMS: ${response.data.message}`, 500);
            }
        } catch (error) {
            logger.error(`Error sending SMS to ${options.to}:`, error);
            if (axios.isAxiosError(error) && error.response) {
                logger.error('Termii API Response Error:', error.response.data);
            }
            throw new ApiError('Failed to send SMS notification.', 500);
        }
    }
}

export default new NotificationService();
