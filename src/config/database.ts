import { DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../database/entities/User';
import { Business } from '../database/entities/Business';
import { Subscription } from '../database/entities/Subscription';
import { Outlet } from '../database/entities/Outlet';
import { Log } from '../database/entities/Log';
import { Product } from '../database/entities/Product';
import { Inventory } from '../database/entities/Inventory';
import { Sales } from '../database/entities/Sales';
import { SalesProduct } from '../database/entities/SalesProduct';

dotenv.config();

const isDevelopment = process.env.NODE_ENV === 'development';
const isLocalDatabase = process.env.DB_HOST === 'localhost';

// Base configuration
const baseConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: isDevelopment,
  logging: isDevelopment ? ['error'] : false,
  entities: [User, Business, Subscription, Outlet, Log, Product, Inventory, Sales, SalesProduct],
  migrations: [],
  subscribers: [],
};

// Environment-specific configuration
const databaseConfig: DataSourceOptions = isLocalDatabase ? {
  ...baseConfig,
  // Local PostgreSQL configuration
  ssl: false, // No SSL for local development
  extra: {
    // Local database connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '2', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_TIMEOUT || '30000', 10),
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10),
    application_name: 'shopmaster-api-local',
  },
} : {
  ...baseConfig,
  // Supabase/Production configuration
  ssl: {
    rejectUnauthorized: false,
  },
  extra: {
    // Connection pool settings optimized for Supabase
    max: parseInt(process.env.DB_POOL_MAX || '3', 10),
    min: parseInt(process.env.DB_POOL_MIN || '1', 10),
    connectionTimeoutMillis: parseInt(process.env.DB_TIMEOUT || '15000', 10),
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '15000', 10),
    application_name: 'shopmaster-api',
    // SSL settings for Supabase
    ssl: {
      rejectUnauthorized: false,
    },
  },
};

export default databaseConfig;
