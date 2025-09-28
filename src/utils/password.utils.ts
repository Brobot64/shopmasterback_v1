import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Password validation regex - at least 8 chars, 1 upper, 1 lower, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const validatePasswordStrength = (password: string): { valid: boolean; message?: string } => {
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!PASSWORD_REGEX.test(password)) {
        return { 
            valid: false, 
            message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' 
        };
    }
    return { valid: true };
};

const hashPassword = async (password: string): Promise<string> => {
    // Validate password strength before hashing
    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
        throw new Error(validation.message);
    }
    
    // Use higher salt rounds for better security (12 is recommended for 2024)
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
};

const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
    return bcrypt.compare(password, hashedPassword);
};

// Generate secure random password
const generateSecurePassword = (length: number = 16): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*?&';
    let password = '';
    
    // Ensure at least one character from each required category
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '@$!%*?&'[Math.floor(Math.random() * 7)];
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
};

// Hash sensitive data using SHA-256
const hashSensitiveData = (data: string): string => {
    return crypto.createHash('sha256').update(data).digest('hex');
};

export { 
    hashPassword, 
    comparePassword, 
    validatePasswordStrength, 
    generateSecurePassword,
    hashSensitiveData 
};
