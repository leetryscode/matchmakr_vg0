import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// Singleton Supabase client instance for browser
let supabaseClientInstance: SupabaseClient | null = null

/**
 * Get or create the singleton Supabase client instance.
 * This ensures all components use the same client instance, preventing
 * duplicate Realtime subscriptions across different client instances.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return supabaseClientInstance
}

/**
 * Legacy function for backward compatibility.
 * Now returns the singleton instance instead of creating a new one.
 */
export function createClient() {
  return getSupabaseClient()
} 