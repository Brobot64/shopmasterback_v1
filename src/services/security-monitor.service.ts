import { logger } from '../utils/logger';
import cacheService from './cache.service';
import { redisClient } from '../config/redis';

export interface SecurityEvent {
    type: SecurityEventType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    userEmail?: string;
    ip: string;
    userAgent: string;
    timestamp: Date;
    details: Record<string, any>;
    sessionId?: string;
    resource?: string;
    action?: string;
}

export enum SecurityEventType {
    // Authentication events
    LOGIN_SUCCESS = 'login_success',
    LOGIN_FAILED = 'login_failed',
    LOGIN_BRUTE_FORCE = 'login_brute_force',
    LOGOUT = 'logout',
    PASSWORD_CHANGE = 'password_change',
    ACCOUNT_LOCKED = 'account_locked',
    
    // Authorization events
    UNAUTHORIZED_ACCESS = 'unauthorized_access',
    PRIVILEGE_ESCALATION = 'privilege_escalation',
    RESOURCE_ACCESS_DENIED = 'resource_access_denied',
    
    // Suspicious activities
    MULTIPLE_LOGIN_LOCATIONS = 'multiple_login_locations',
    UNUSUAL_USER_AGENT = 'unusual_user_agent',
    HIGH_REQUEST_VOLUME = 'high_request_volume',
    SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
    XSS_ATTEMPT = 'xss_attempt',
    
    // System events
    SYSTEM_ERROR = 'system_error',
    DATABASE_CONNECTION_LOST = 'database_connection_lost',
    REDIS_CONNECTION_LOST = 'redis_connection_lost',
    
    // Data events
    SENSITIVE_DATA_ACCESS = 'sensitive_data_access',
    DATA_EXPORT = 'data_export',
    BULK_DATA_ACCESS = 'bulk_data_access',
    
    // Configuration events
    CONFIG_CHANGE = 'config_change',
    SECURITY_SETTING_CHANGE = 'security_setting_change'
}

interface SecurityAlert {
    id: string;
    events: SecurityEvent[];
    pattern: string;
    riskScore: number;
    recommendations: string[];
    createdAt: Date;
    resolved: boolean;
}

class SecurityMonitorService {
    private readonly FAILED_LOGIN_THRESHOLD = 5;
    private readonly FAILED_LOGIN_WINDOW = 15 * 60 * 1000; // 15 minutes
    private readonly HIGH_REQUEST_THRESHOLD = 100;
    private readonly HIGH_REQUEST_WINDOW = 60 * 1000; // 1 minute
    
    /**
     * Log a security event
     */
    async logSecurityEvent(event: SecurityEvent): Promise<void> {
        try {
            // Add timestamp if not provided
            if (!event.timestamp) {
                event.timestamp = new Date();
            }

            // Log to application logger
            const logData = {
                type: event.type,
                severity: event.severity,
                userId: event.userId,
                userEmail: event.userEmail,
                ip: event.ip,
                userAgent: event.userAgent,
                timestamp: event.timestamp,
                details: event.details,
                sessionId: event.sessionId,
                resource: event.resource,
                action: event.action
            };

            logger.info('Security Event', logData);

            // Store in Redis for real-time monitoring
            await this.storeSecurityEvent(event);

            // Check for security patterns
            await this.analyzeSecurityPatterns(event);

            // Send high severity alerts immediately
            if (event.severity === 'high' || event.severity === 'critical') {
                await this.sendSecurityAlert(event);
            }

        } catch (error) {
            logger.error('Failed to log security event:', error);
        }
    }

    /**
     * Monitor failed login attempts
     */
    async monitorFailedLogins(email: string, ip: string, userAgent: string): Promise<void> {
        try {
            const redis = await redisClient.getClient();
            const failedKey = `failed_logins:${email}:${ip}`;
            
            // Increment failed attempts
            const failedCount = await redis.incr(failedKey);
            await redis.expire(failedKey, Math.ceil(this.FAILED_LOGIN_WINDOW / 1000));

            // Log the failed attempt
            await this.logSecurityEvent({
                type: SecurityEventType.LOGIN_FAILED,
                severity: 'medium',
                userEmail: email,
                ip,
                userAgent,
                timestamp: new Date(),
                details: {
                    attemptCount: failedCount,
                    threshold: this.FAILED_LOGIN_THRESHOLD
                }
            });

            // Check if threshold exceeded
            if (typeof failedCount === 'number' && failedCount >= this.FAILED_LOGIN_THRESHOLD) {
                await this.logSecurityEvent({
                    type: SecurityEventType.LOGIN_BRUTE_FORCE,
                    severity: 'high',
                    userEmail: email,
                    ip,
                    userAgent,
                    timestamp: new Date(),
                    details: {
                        attemptCount: failedCount,
                        timeWindow: this.FAILED_LOGIN_WINDOW,
                        blocked: true
                    }
                });

                // Block the IP temporarily
                await this.blockSuspiciousIP(ip, 30 * 60); // Block for 30 minutes
            }

        } catch (error) {
            logger.error('Failed to monitor login attempts:', error);
        }
    }

    /**
     * Monitor request volume from IP
     */
    async monitorRequestVolume(ip: string, userAgent: string, userId?: string): Promise<boolean> {
        try {
            const redis = await redisClient.getClient();
            const requestKey = `requests:${ip}`;
            
            const requestCount = await redis.incr(requestKey);
            await redis.expire(requestKey, Math.ceil(this.HIGH_REQUEST_WINDOW / 1000));

            if (typeof requestCount === 'number' && requestCount > this.HIGH_REQUEST_THRESHOLD) {
                await this.logSecurityEvent({
                    type: SecurityEventType.HIGH_REQUEST_VOLUME,
                    severity: 'high',
                    userId,
                    ip,
                    userAgent,
                    timestamp: new Date(),
                    details: {
                        requestCount,
                        threshold: this.HIGH_REQUEST_THRESHOLD,
                        timeWindow: this.HIGH_REQUEST_WINDOW
                    }
                });

                // Temporarily block the IP
                await this.blockSuspiciousIP(ip, 5 * 60); // Block for 5 minutes
                return false; // Request should be blocked
            }

            return true; // Request allowed
        } catch (error) {
            logger.error('Failed to monitor request volume:', error);
            return true; // Allow request on error
        }
    }

    /**
     * Detect unusual user agent patterns
     */
    async detectUnusualUserAgent(userId: string, userAgent: string, ip: string): Promise<void> {
        try {
            const userAgentKey = `user_agents:${userId}`;
            const knownAgents = await cacheService.get<string[]>(userAgentKey) || [];

            // Simple heuristic: check if this is a completely new user agent pattern
            const isUnusual = !knownAgents.some(agent => {
                return this.calculateUserAgentSimilarity(agent, userAgent) > 0.7;
            });

            if (isUnusual && knownAgents.length > 0) {
                await this.logSecurityEvent({
                    type: SecurityEventType.UNUSUAL_USER_AGENT,
                    severity: 'medium',
                    userId,
                    ip,
                    userAgent,
                    timestamp: new Date(),
                    details: {
                        newUserAgent: userAgent,
                        knownUserAgents: knownAgents.slice(0, 3) // Limit for logging
                    }
                });
            }

            // Update known user agents (keep last 5)
            if (!knownAgents.includes(userAgent)) {
                knownAgents.push(userAgent);
                if (knownAgents.length > 5) {
                    knownAgents.shift();
                }
                await cacheService.set(userAgentKey, knownAgents, {
                    ttl: 30 * 24 * 60 * 60, // 30 days
                    prefix: 'security'
                });
            }

        } catch (error) {
            logger.error('Failed to detect unusual user agent:', error);
        }
    }

    /**
     * Monitor multiple login locations
     */
    async monitorLoginLocations(userId: string, ip: string, userAgent: string): Promise<void> {
        try {
            const locationKey = `login_locations:${userId}`;
            const recentLogins = await cacheService.get<Array<{ ip: string; timestamp: number }>>(locationKey) || [];
            
            const now = Date.now();
            const fiveMinutesAgo = now - (5 * 60 * 1000);
            
            // Filter recent logins (last 5 minutes)
            const recentUniqueIPs = recentLogins
                .filter(login => login.timestamp > fiveMinutesAgo)
                .map(login => login.ip)
                .filter((ip, index, arr) => arr.indexOf(ip) === index);

            // Check if this is a new IP in recent logins
            if (!recentUniqueIPs.includes(ip) && recentUniqueIPs.length > 0) {
                await this.logSecurityEvent({
                    type: SecurityEventType.MULTIPLE_LOGIN_LOCATIONS,
                    severity: 'medium',
                    userId,
                    ip,
                    userAgent,
                    timestamp: new Date(),
                    details: {
                        newIP: ip,
                        recentIPs: recentUniqueIPs,
                        timeWindow: '5 minutes'
                    }
                });
            }

            // Add current login
            recentLogins.push({ ip, timestamp: now });
            
            // Keep only last 10 logins
            if (recentLogins.length > 10) {
                recentLogins.shift();
            }

            await cacheService.set(locationKey, recentLogins, {
                ttl: 24 * 60 * 60, // 24 hours
                prefix: 'security'
            });

        } catch (error) {
            logger.error('Failed to monitor login locations:', error);
        }
    }

    /**
     * Detect potential SQL injection attempts
     */
    detectSQLInjection(queryString: string, body: any, ip: string, userAgent: string, userId?: string): void {
        const sqlPatterns = [
            /(\s|^)(union|select|insert|update|delete|drop|create|alter)\s/i,
            /(\s|^)(or|and)\s+\d+\s*=\s*\d+/i,
            /(\s|^)(or|and)\s+['"]\d+['\"]\s*=\s*['"]\d+['\"]/i,
            /(\s|^)(exec|execute)\s*\(/i,
            /(\s|^)sp_/i,
            /(\s|^)xp_/i,
            /;.*(drop|alter|create|insert|update|delete)/i
        ];

        const testString = `${queryString} ${JSON.stringify(body)}`.toLowerCase();
        
        const suspiciousPattern = sqlPatterns.find(pattern => pattern.test(testString));
        
        if (suspiciousPattern) {
            this.logSecurityEvent({
                type: SecurityEventType.SQL_INJECTION_ATTEMPT,
                severity: 'high',
                userId,
                ip,
                userAgent,
                timestamp: new Date(),
                details: {
                    suspiciousInput: testString.substring(0, 500), // Limit size
                    pattern: suspiciousPattern.toString(),
                    queryString,
                    bodyKeys: Object.keys(body || {})
                }
            });
        }
    }

    /**
     * Detect potential XSS attempts
     */
    detectXSSAttempt(data: any, ip: string, userAgent: string, userId?: string): void {
        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi,
            /<object[^>]*>.*?<\/object>/gi,
            /<embed[^>]*>.*?<\/embed>/gi,
            /eval\s*\(/gi,
            /expression\s*\(/gi
        ];

        const testString = JSON.stringify(data).toLowerCase();
        const suspiciousPattern = xssPatterns.find(pattern => pattern.test(testString));

        if (suspiciousPattern) {
            this.logSecurityEvent({
                type: SecurityEventType.XSS_ATTEMPT,
                severity: 'high',
                userId,
                ip,
                userAgent,
                timestamp: new Date(),
                details: {
                    suspiciousInput: testString.substring(0, 500),
                    pattern: suspiciousPattern.toString()
                }
            });
        }
    }

    /**
     * Get security events for monitoring dashboard
     */
    async getSecurityEvents(
        filters: {
            type?: SecurityEventType;
            severity?: string;
            userId?: string;
            startDate?: Date;
            endDate?: Date;
        } = {},
        limit: number = 100
    ): Promise<SecurityEvent[]> {
        try {
            const redis = await redisClient.getClient();
            const events: SecurityEvent[] = [];
            
            // Get events from Redis (this is a simplified implementation)
            const eventKeys = await redis.keys('security:events:*');
            
            for (const key of eventKeys.slice(0, limit)) {
                const eventData = await redis.get(key);
                if (eventData) {
                    const event = JSON.parse(String(eventData));
                    
                    // Apply filters
                    if (filters.type && event.type !== filters.type) continue;
                    if (filters.severity && event.severity !== filters.severity) continue;
                    if (filters.userId && event.userId !== filters.userId) continue;
                    if (filters.startDate && new Date(event.timestamp) < filters.startDate) continue;
                    if (filters.endDate && new Date(event.timestamp) > filters.endDate) continue;
                    
                    events.push(event);
                }
            }
            
            return events.sort((a, b) => 
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

        } catch (error) {
            logger.error('Failed to get security events:', error);
            return [];
        }
    }

    /**
     * Get security statistics
     */
    async getSecurityStats(): Promise<{
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsBySeverity: Record<string, number>;
        recentAlerts: number;
        blockedIPs: number;
    }> {
        try {
            const redis = await redisClient.getClient();
            
            // This is a simplified implementation - in production, you'd want to use more efficient storage
            const eventKeys = await redis.keys('security:events:*');
            const blockedIPKeys = await redis.keys('blocked_ip:*');
            
            const eventsByType: Record<string, number> = {};
            const eventsBySeverity: Record<string, number> = {};
            let recentAlerts = 0;
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            
            for (const key of eventKeys) {
                const eventData = await redis.get(key);
                if (eventData) {
                    const event = JSON.parse(String(eventData));
                    
                    eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
                    eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
                    
                    if (new Date(event.timestamp).getTime() > oneDayAgo && 
                        (event.severity === 'high' || event.severity === 'critical')) {
                        recentAlerts++;
                    }
                }
            }
            
            return {
                totalEvents: eventKeys.length,
                eventsByType,
                eventsBySeverity,
                recentAlerts,
                blockedIPs: blockedIPKeys.length
            };
            
        } catch (error) {
            logger.error('Failed to get security stats:', error);
            return {
                totalEvents: 0,
                eventsByType: {},
                eventsBySeverity: {},
                recentAlerts: 0,
                blockedIPs: 0
            };
        }
    }

    /**
     * Clear security events older than specified days
     */
    async cleanupOldEvents(daysToKeep: number = 30): Promise<number> {
        try {
            const redis = await redisClient.getClient();
            const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
            
            const eventKeys = await redis.keys('security:events:*');
            let deletedCount = 0;
            
            for (const key of eventKeys) {
                const eventData = await redis.get(key);
                if (eventData) {
                    const event = JSON.parse(String(eventData));
                    if (new Date(event.timestamp).getTime() < cutoffDate) {
                        await redis.del(key);
                        deletedCount++;
                    }
                }
            }
            
            logger.info(`Cleaned up ${deletedCount} old security events`);
            return deletedCount;
            
        } catch (error) {
            logger.error('Failed to cleanup old security events:', error);
            return 0;
        }
    }

    // Private methods

    private async storeSecurityEvent(event: SecurityEvent): Promise<void> {
        try {
            const redis = await redisClient.getClient();
            const eventKey = `security:events:${Date.now()}_${Math.random()}`;
            
            await redis.setEx(
                eventKey, 
                30 * 24 * 60 * 60, // 30 days TTL
                JSON.stringify(event)
            );
            
        } catch (error) {
            logger.error('Failed to store security event:', error);
        }
    }

    private async analyzeSecurityPatterns(event: SecurityEvent): Promise<void> {
        // This is where you'd implement more sophisticated pattern analysis
        // For example, detecting coordinated attacks, unusual access patterns, etc.
        
        // Simple example: detect rapid successive events from same IP
        if (event.ip) {
            const recentEventsKey = `recent_events:${event.ip}`;
            const recentEvents = await cacheService.get<SecurityEvent[]>(recentEventsKey) || [];
            
            recentEvents.push(event);
            
            // Keep only last 10 events
            if (recentEvents.length > 10) {
                recentEvents.shift();
            }
            
            await cacheService.set(recentEventsKey, recentEvents, {
                ttl: 60 * 60, // 1 hour
                prefix: 'security'
            });
        }
    }

    private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
        // Implement your alerting mechanism here
        // For example: send to Slack, email, SMS, PagerDuty, etc.
        logger.warn('SECURITY ALERT', {
            type: event.type,
            severity: event.severity,
            details: event.details
        });
    }

    private async blockSuspiciousIP(ip: string, durationSeconds: number): Promise<void> {
        try {
            const redis = await redisClient.getClient();
            await redis.setEx(`blocked_ip:${ip}`, durationSeconds, 'blocked');
            
            logger.warn(`Blocked suspicious IP: ${ip} for ${durationSeconds} seconds`);
            
        } catch (error) {
            logger.error('Failed to block IP:', error);
        }
    }

    private calculateUserAgentSimilarity(agent1: string, agent2: string): number {
        // Simple similarity calculation - in production you'd use more sophisticated algorithms
        if (agent1 === agent2) return 1;
        
        const words1 = agent1.toLowerCase().split(/\s+/);
        const words2 = agent2.toLowerCase().split(/\s+/);
        
        const commonWords = words1.filter(word => words2.includes(word));
        const totalWords = new Set([...words1, ...words2]).size;
        
        return commonWords.length / totalWords;
    }
}

export const securityMonitorService = new SecurityMonitorService();
export default securityMonitorService;
