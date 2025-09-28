import 'reflect-metadata'; // Required for TypeORM
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes';
import errorMiddleware from './middleware/error.middleware';
import { generalRateLimit, apiRateLimit } from './middleware/rate-limit.middleware';
import ApiError from './utils/apiError';
import { logger } from './utils/logger';

const app = express();

// Trust proxy for rate limiting and security headers
app.set('trust proxy', 1);

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false, // Disable for API usage
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    }
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-frontend-domain.com'
];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Rate Limiting
app.use('/api/', generalRateLimit);
app.use('/api/v1/', apiRateLimit);

// Request Logging
const morganFormat = process.env.NODE_ENV === 'production' 
    ? 'combined' 
    : 'dev';
app.use(morgan(morganFormat, {
    stream: {
        write: (message: string) => {
            logger.info(message.trim());
        }
    }
}));

// Request sanitization and body parsing
app.use(express.json({ 
    limit: '10kb',
    verify: (req: any, res, buf) => {
        // Store raw body for webhook verification if needed
        req.rawBody = buf.toString();
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Security headers middleware
app.use((req, res, next) => {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add custom security headers
    res.setHeader('X-API-Version', '1.0');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    next();
});

// API Routes
app.use('/api/v1', routes);

// Handle undefined routes
// app.all('/*', (req, res, next) => {
//     next(new ApiError(`Can't find ${req.originalUrl} on this server!`, 404));
// });

// Global Error Handling Middleware
app.use(errorMiddleware);

export default app;
