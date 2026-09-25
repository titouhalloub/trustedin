import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  throw new Error(
    `Missing or invalid Supabase URL. Please check that NEXT_PUBLIC_SUPABASE_URL in your .env.local file is set correctly. It should start with 'http'.`
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Missing Supabase Anon Key. Please check that NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file is set correctly.'
  );
}

// Public client (for frontend use)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (for backend / server-side only)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // IMPORTANT: Unsafe to expose to client
);