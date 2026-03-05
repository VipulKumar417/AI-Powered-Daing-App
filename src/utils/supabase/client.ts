import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Singleton Supabase client to avoid multiple instances
let supabaseClient: any = null;

export function getSupabaseClient() {
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
      console.log('Supabase client created');
    } catch (e) {
      console.warn('Failed to create Supabase client, using mock:', e);
      // Return a mock client that won't crash the app
      supabaseClient = {
        auth: {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => { } } } }),
          signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase unavailable' } }),
          signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase unavailable' } }),
          signOut: () => Promise.resolve({ error: null }),
        }
      };
    }
  }

  return supabaseClient;
}

export default getSupabaseClient;