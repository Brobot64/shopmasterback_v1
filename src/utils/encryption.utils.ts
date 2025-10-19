import crypto from 'crypto';
import { logger } from './logger';

// Configuration
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

class EncryptionService {
    private encryptionKey: Buffer;
    
    constructor() {
        const keyBase64 = process.env.ENCRYPTION_KEY;
        if (!keyBase64) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        
        try {
            this.encryptionKey = Buffer.from(keyBase64, 'base64');
            if (this.encryptionKey.length !== KEY_LENGTH) {
                throw new Error(`Encryption key must be ${KEY_LENGTH} bytes long`);
            }
        } catch (error) {
            logger.error('Failed to initialize encryption service:', error);
            throw new Error('Invalid encryption key format');
        }
    }
    
    /**
     * Encrypt sensitive data
     */
    encrypt(data: string): string {
        try {
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
            
            let encrypted = cipher.update(data, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            const tag = cipher.getAuthTag();
            
            // Combine IV, tag, and encrypted data
            const result = iv.toString('hex') + tag.toString('hex') + encrypted;
            return result;
        } catch (error) {
            logger.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    
    /**
     * Decrypt sensitive data
     */
    decrypt(encryptedData: string): string {
        try {
            // Extract IV, tag, and encrypted data
            const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
            const tag = Buffer.from(encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + TAG_LENGTH) * 2), 'hex');
            const encrypted = encryptedData.slice((IV_LENGTH + TAG_LENGTH) * 2);
            
            const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
            decipher.setAuthTag(tag);
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            logger.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }
    
    /**
     * Hash sensitive data for indexing/searching (one-way)
     */
    hash(data: string): string {
        return crypto.pbkdf2Sync(data, this.encryptionKey, 10000, 32, 'sha256').toString('hex');
    }
    
    /**
     * Generate a secure encryption key (for setup)
     */
    static generateEncryptionKey(): string {
        return crypto.randomBytes(KEY_LENGTH).toString('base64');
    }
}

// Singleton instance
let encryptionService: EncryptionService;

export const getEncryptionService = (): EncryptionService => {
    if (!encryptionService) {
        encryptionService = new EncryptionService();
    }
    return encryptionService;
};

// Helper functions for common use cases
export const encryptSensitiveField = (data: string | null | undefined): string | null => {
    if (!data) return null;
    return getEncryptionService().encrypt(data);
};

export const decryptSensitiveField = (encryptedData: string | null | undefined): string | null => {
    if (!encryptedData) return null;
    return getEncryptionService().decrypt(encryptedData);
};

export const hashForIndex = (data: string): string => {
    return getEncryptionService().hash(data);
};

// Credit card masking utility
export const maskCreditCard = (cardNumber: string): string => {
    if (!cardNumber || cardNumber.length < 4) return cardNumber;
    const lastFour = cardNumber.slice(-4);
    const masked = '*'.repeat(cardNumber.length - 4);
    return masked + lastFour;
};

// Phone number masking
export const maskPhoneNumber = (phone: string): string => {
    if (!phone || phone.length < 4) return phone;
    const lastFour = phone.slice(-4);
    const masked = '*'.repeat(phone.length - 4);
    return masked + lastFour;
};

// Email masking
export const maskEmail = (email: string): string => {
    if (!email || !email.includes('@')) return email;
    const [username, domain] = email.split('@');
    const maskedUsername = username.slice(0, 2) + '*'.repeat(Math.max(0, username.length - 2));
    return `${maskedUsername}@${domain}`;
};

export { EncryptionService };
