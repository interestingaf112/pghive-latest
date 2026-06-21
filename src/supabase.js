import { createClient } from '@supabase/supabase-js';

// Load Supabase environment variables
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

// Initialize client if configuration is present
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Fetch all PG listings from Supabase
 */
export async function fetchAllPGs() {
  if (!isSupabaseConfigured) {
    console.warn("Supabase is not configured. Returning empty listing array.");
    return [];
  }

  const { data, error } = await supabase
    .from('pgs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Supabase error fetching PGs:", error);
    throw error;
  }
  return data || [];
}

/**
 * Create a new PG listing
 */
export async function createPGListing(pgData) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { data, error } = await supabase
    .from('pgs')
    .insert([pgData])
    .select();

  if (error) {
    console.error("Supabase error creating listing:", error);
    throw error;
  }
  return data?.[0] || null;
}

/**
 * Delete a PG listing
 */
export async function deletePGListing(pgId) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase
    .from('pgs')
    .delete()
    .eq('id', pgId);

  if (error) {
    console.error("Supabase error deleting listing:", error);
    throw error;
  }
  return true;
}
