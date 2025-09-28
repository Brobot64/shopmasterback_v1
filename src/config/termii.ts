import dotenv from 'dotenv';

dotenv.config();

export const termiiConfig = {
    apiKey: process.env.TERMI_API_KEY || '',
    senderId: process.env.TERMI_SENDER_ID || '',
    channel: process.env.TERMI_CHANNEL || 'dnd',
    smsType: process.env.TERMI_SMS_TYPE || 'plain',
    baseUrl: 'https://api.ng.termii.com/api',
};
