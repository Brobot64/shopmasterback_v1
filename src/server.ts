import 'reflect-metadata';
import app from './app';
import { AppDataSource } from './database/data-source';
import { redisClient } from './config/redis';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        logger.info('Starting ShopMaster Backend Server...');
        
        // Try to connect to Redis only if enabled
        const redisEnabled = process.env.REDIS_ENABLED !== 'false';
        
        if (redisEnabled) {
            try {
                logger.info('Connecting to Redis...');
                await redisClient.connect();
                logger.info('✓ Redis connected successfully!');
            } catch (redisError) {
                logger.warn('⚠ Redis connection failed, continuing without Redis:');
                logger.warn('Some features may be limited without Redis (caching, rate limiting, etc.)');
                if (redisError instanceof Error) {
                    logger.warn(`Redis Error: ${redisError.message}`);
                }
            }
        } else {
            logger.info('Redis disabled for development - caching and rate limiting features will be limited');
        }

        // Connect to PostgreSQL (required)
        logger.info('Connecting to PostgreSQL database...');
        try {
            await AppDataSource.initialize();
            logger.info('✓ Database connected successfully!');
        } catch (dbError) {
            logger.error('✗ Database connection failed:');
            if (dbError instanceof Error) {
                logger.error(`Database Error: ${dbError.message}`);
                
                // Provide helpful hints for common issues
                if (dbError.message.includes('ENOTFOUND')) {
                    logger.error('Hint: Check your DB_HOST environment variable');
                } else if (dbError.message.includes('authentication failed')) {
                    logger.error('Hint: Check your DB_USERNAME and DB_PASSWORD environment variables');
                } else if (dbError.message.includes('timeout')) {
                    logger.error('Hint: Database connection timed out. Check network connectivity.');
                }
            }
            throw dbError; // Re-throw to exit the process
        }

        // Start Express server
        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
            logger.info(`📖 API Documentation: http://localhost:${PORT}/api/docs`);
            
            // Environment check warnings
            if (!process.env.REDIS_HOST || !process.env.REDIS_PASSWORD) {
                logger.warn('⚠ Redis environment variables not properly configured.');
            }
            if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
                logger.warn('⚠ Database environment variables not properly configured.');
            }
        });
    } catch (error) {
        logger.error('💥 Failed to start server:');
        if (error instanceof Error) {
            logger.error(`Error: ${error.message}`);
            logger.error(`Stack: ${error.stack}`);
        }
        process.exit(1);
    }
};

startServer();
