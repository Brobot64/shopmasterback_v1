import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import catchAsync from '../utils/catchAsync';
import ApiError from '../utils/apiError';
import securityMonitorService, { SecurityEventType } from '../services/security-monitor.service';
import { logger } from '../utils/logger';

// Security middleware to check for blocked IPs
export const ipSecurityCheck = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getClientIP(req);
    
    try {
        const redis = await redisClient.getClient();
        const isBlocked = await redis.exists(`blocked_ip:${clientIP}`);
        
        if (isBlocked) {
            logger.warn(`Blocked request from IP: ${clientIP}`);
            return next(new ApiError('Access temporarily restricted', 429));
        }

        // Monitor request volume
        const userAgent = req.headers['user-agent'] || 'unknown';
        const userId = req.user?.id;
        
        const isAllowed = await securityMonitorService.monitorRequestVolume(clientIP, userAgent, userId);
        
        if (!isAllowed) {
            return next(new ApiError('Too many requests. Please try again later.', 429));
        }

        next();
    } catch (error) {
        logger.error('IP security check failed:', error);
        // Allow request to proceed on error to avoid blocking legitimate traffic
        next();
    }
});

// Security middleware to detect and prevent common attacks
export const attackDetectionMiddleware = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const userId = req.user?.id;

    try {
        // Check for SQL injection attempts
        const queryString = req.originalUrl;
        securityMonitorService.detectSQLInjection(queryString, req.body, clientIP, userAgent, userId);

        // Check for XSS attempts in request body
        if (req.body && typeof req.body === 'object') {
            securityMonitorService.detectXSSAttempt(req.body, clientIP, userAgent, userId);
        }

        // Check for suspicious headers
        await checkSuspiciousHeaders(req);

        // Check for unusual user agent patterns (for authenticated users)
        if (userId) {
            await securityMonitorService.detectUnusualUserAgent(userId, userAgent, clientIP);
        }

        next();
    } catch (error) {
        logger.error('Attack detection middleware failed:', error);
        next();
    }
});

// Middleware to log authentication events
export const authEventLogger = (eventType: SecurityEventType, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const clientIP = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'unknown';

        // Log the event after the response is sent
        res.on('finish', async () => {
            try {
                const eventSeverity = res.statusCode >= 400 ? 'high' : severity;
                
                await securityMonitorService.logSecurityEvent({
                    type: eventType,
                    severity: eventSeverity,
                    userId: req.user?.id,
                    userEmail: req.body?.email || req.user?.email,
                    ip: clientIP,
                    userAgent,
                    timestamp: new Date(),
                    details: {
                        statusCode: res.statusCode,
                        method: req.method,
                        path: req.path,
                        success: res.statusCode < 400,
                        ...(res.statusCode >= 400 && { errorResponse: true })
                    },
                    resource: req.path,
                    action: req.method
                });

                // For failed logins, monitor brute force attempts
                if (eventType === SecurityEventType.LOGIN_FAILED && req.body?.email) {
                    await securityMonitorService.monitorFailedLogins(
                        req.body.email,
                        clientIP,
                        userAgent
                    );
                }

                // For successful logins, monitor multiple locations
                if (eventType === SecurityEventType.LOGIN_SUCCESS && req.user?.id) {
                    await securityMonitorService.monitorLoginLocations(
                        req.user.id,
                        clientIP,
                        userAgent
                    );
                }

            } catch (error) {
                logger.error('Failed to log auth event:', error);
            }
        });

        next();
    });
};

// Middleware to log sensitive data access
export const sensitiveDataAccessLogger = (dataType: string) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const clientIP = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'unknown';

        res.on('finish', async () => {
            try {
                // Only log successful access to sensitive data
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    await securityMonitorService.logSecurityEvent({
                        type: SecurityEventType.SENSITIVE_DATA_ACCESS,
                        severity: 'low',
                        userId: req.user?.id,
                        ip: clientIP,
                        userAgent,
                        timestamp: new Date(),
                        details: {
                            dataType,
                            method: req.method,
                            path: req.path,
                            queryParams: Object.keys(req.query),
                            responseSize: res.get('content-length') || 'unknown'
                        },
                        resource: req.path,
                        action: req.method
                    });
                }
            } catch (error) {
                logger.error('Failed to log sensitive data access:', error);
            }
        });

        next();
    });
};

// Middleware to detect and prevent unauthorized access
export const unauthorizedAccessDetection = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function(data?: any): Response {
        // Check if this is an unauthorized access response
        if (res.statusCode === 401 || res.statusCode === 403) {
            const clientIP = getClientIP(req);
            const userAgent = req.headers['user-agent'] || 'unknown';
            
            // Log unauthorized access attempt
            securityMonitorService.logSecurityEvent({
                type: res.statusCode === 401 
                    ? SecurityEventType.UNAUTHORIZED_ACCESS 
                    : SecurityEventType.RESOURCE_ACCESS_DENIED,
                severity: 'medium',
                userId: req.user?.id,
                ip: clientIP,
                userAgent,
                timestamp: new Date(),
                details: {
                    statusCode: res.statusCode,
                    method: req.method,
                    path: req.path,
                    attemptedResource: req.originalUrl,
                    hasAuth: !!req.headers.authorization,
                    userType: req.user?.userType
                },
                resource: req.path,
                action: req.method
            });
        }

        return originalSend.apply(res, arguments as any);
    };

    next();
});

// Middleware to check for privilege escalation attempts
export const privilegeEscalationDetection = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return next();
    }

    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    // Check if user is trying to access resources above their privilege level
    const suspiciousPatterns = [
        // Attempting to access admin endpoints
        /\/admin/i,
        // Attempting to modify other users
        /\/users\/(?!me$)/i,
        // Attempting to access system configuration
        /\/config/i,
        /\/settings/i
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(req.path));

    if (isSuspicious && req.user.userType !== 'admin') {
        await securityMonitorService.logSecurityEvent({
            type: SecurityEventType.PRIVILEGE_ESCALATION,
            severity: 'high',
            userId: req.user.id,
            ip: clientIP,
            userAgent,
            timestamp: new Date(),
            details: {
                userType: req.user.userType,
                attemptedPath: req.path,
                method: req.method,
                suspicious: true
            },
            resource: req.path,
            action: req.method
        });
    }

    next();
});

// Middleware to log bulk data access
export const bulkDataAccessLogger = (threshold: number = 100) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const originalJson = res.json;
        
        res.json = function(data?: any): Response {
            // Check if response contains bulk data
            let itemCount = 0;
            
            if (Array.isArray(data?.data)) {
                itemCount = data.data.length;
            } else if (Array.isArray(data)) {
                itemCount = data.length;
            } else if (data?.pagination?.totalItems) {
                itemCount = data.pagination.totalItems;
            }

            if (itemCount >= threshold) {
                const clientIP = getClientIP(req);
                const userAgent = req.headers['user-agent'] || 'unknown';
                
                securityMonitorService.logSecurityEvent({
                    type: SecurityEventType.BULK_DATA_ACCESS,
                    severity: itemCount > 1000 ? 'high' : 'medium',
                    userId: req.user?.id,
                    ip: clientIP,
                    userAgent,
                    timestamp: new Date(),
                    details: {
                        itemCount,
                        threshold,
                        path: req.path,
                        method: req.method,
                        queryParams: req.query
                    },
                    resource: req.path,
                    action: req.method
                });
            }

            return originalJson.apply(res, arguments as any);
        };

        next();
    });
};

// Helper functions

function getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] as string ||
           req.socket.remoteAddress ||
           'unknown';
}

async function checkSuspiciousHeaders(req: Request): Promise<void> {
    const suspiciousHeaders = [
        'x-forwarded-host',
        'x-host',
        'x-original-url',
        'x-rewrite-url'
    ];

    const clientIP = getClientIP(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    for (const header of suspiciousHeaders) {
        if (req.headers[header]) {
            await securityMonitorService.logSecurityEvent({
                type: SecurityEventType.UNAUTHORIZED_ACCESS,
                severity: 'medium',
                userId: req.user?.id,
                ip: clientIP,
                userAgent,
                timestamp: new Date(),
                details: {
                    suspiciousHeader: header,
                    headerValue: req.headers[header],
                    allHeaders: Object.keys(req.headers)
                }
            });
        }
    }
}

// Rate limiting specifically for authentication endpoints
export const authRateLimitMiddleware = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getClientIP(req);
    const email = req.body?.email;
    
    if (!email) {
        return next();
    }

    try {
        const redis = await redisClient.getClient();
        const key = `auth_attempts:${clientIP}:${email}`;
        const attempts = await redis.incr(key);
        
        if (attempts === 1) {
            await redis.expire(key, 15 * 60); // 15 minutes
        }

        // Allow 3 attempts per 15 minutes per IP/email combination
        if (attempts as number > 3) {
            const userAgent = req.headers['user-agent'] || 'unknown';
            
            await securityMonitorService.logSecurityEvent({
                type: SecurityEventType.LOGIN_BRUTE_FORCE,
                severity: 'high',
                userEmail: email,
                ip: clientIP,
                userAgent,
                timestamp: new Date(),
                details: {
                    attemptCount: attempts,
                    timeWindow: '15 minutes',
                    blocked: true
                }
            });

            return next(new ApiError('Too many authentication attempts. Please try again in 15 minutes.', 429));
        }

        // Add attempt count to request for use in other middleware
        (req as any).authAttempts = attempts;
        
        next();
    } catch (error) {
        logger.error('Auth rate limit check failed:', error);
        next();
    }
});

export {
    getClientIP,
    checkSuspiciousHeaders
};
