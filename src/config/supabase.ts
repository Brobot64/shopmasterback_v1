// @ts-ignore
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // For backend operations

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    console.error('Supabase environment variables are not fully set.');
    // In a real app, you might want to throw an error or exit here.
}

// Client for public operations (e.g., fetching public images)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client for authenticated backend operations (e.g., uploading, deleting)
export const supabaseServiceRole = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
        persistSession: false, // No session persistence needed for service role
        autoRefreshToken: false,
        detectSessionInUrl: false,
    },
});
