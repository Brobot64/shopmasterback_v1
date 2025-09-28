import { createClient } from 'redis';
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

class RedisClient {
  private client: ReturnType<typeof createClient>;
  private static instance: RedisClient;
  private isConnected = false;

  private constructor() {
    const redisConfig = {
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        connectTimeout: 10000, // 10 seconds
        reconnectStrategy: (retries: number) => {
          if (retries >= 5) {
            logger.error('Max Redis reconnection attempts reached');
            return false; // Stop reconnecting after 5 attempts
          }
          return Math.min(retries * 100, 3000); // Exponential backoff up to 3 seconds
        },
        tls: process.env.REDIS_HOST?.includes('redis-cloud.com') ? {} : undefined, // Enable TLS for Redis Cloud
      },
    };

    // Only add username if it exists in environment
    if (process.env.REDIS_USERNAME) {
      (redisConfig as any).username = process.env.REDIS_USERNAME;
    }

    this.client = createClient(redisConfig);
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.client.on('error', (err) => logger.error('Redis Client Error', err));
    this.client.on('connect', () => logger.info('Redis client connecting...'));
    this.client.on('ready', () => {
      logger.info('Redis client ready');
      this.isConnected = true;
    });
    this.client.on('end', () => {
      logger.warn('Redis client disconnected');
      this.isConnected = false;
    });
    this.client.on('reconnecting', () => logger.info('Redis client reconnecting...'));
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect() {
    if (!this.isConnected) {
      await this.client.connect();
    }
    return this.client;
  }

  public getClient() {
    if (!this.isConnected) {
      throw new Error('Redis client not connected');
    }
    return this.client;
  }

  public isClientConnected(): boolean {
    return this.isConnected;
  }

  public async disconnect() {
    if (this.isConnected) {
      await this.client.disconnect();
    }
  }
}

const redisClient = RedisClient.getInstance();

export { redisClient };
