import { createClient } from '@supabase/supabase-js';
import { sanitizeText, validatePhone, validateEmail, validatePrice } from './utils/sanitize';

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
export async function createPGListing(pgData, userId) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  if (typeof userId !== 'string' || userId.trim().length === 0 || userId.length > 100) {
    throw new Error("Unauthorized: Invalid user UUID format.");
  }

  if (!pgData || typeof pgData !== 'object') {
    throw new Error("Invalid listing data.");
  }

  if (typeof pgData.name !== 'string' || pgData.name.trim().length === 0 || pgData.name.length > 200) {
    throw new Error("Name must be between 1 and 200 characters.");
  }
  if (typeof pgData.locality !== 'string' || pgData.locality.trim().length === 0 || pgData.locality.length > 100) {
    throw new Error("Locality must be between 1 and 100 characters.");
  }
  if (typeof pgData.address !== 'string' || pgData.address.trim().length === 0 || pgData.address.length > 500) {
    throw new Error("Address must be between 1 and 500 characters.");
  }
  if (typeof pgData.description !== 'string' || pgData.description.trim().length === 0 || pgData.description.length > 2000) {
    throw new Error("Description must be between 1 and 2000 characters.");
  }

  // Sanitize all input fields (SQL parameterization blocks SQL injection natively)
  const nameClean = sanitizeText(pgData.name, 200);
  const addressClean = sanitizeText(pgData.address, 500);
  const descClean = sanitizeText(pgData.description, 2000);
  
  if (!nameClean || !addressClean || !descClean) {
    throw new Error('Required text fields cannot be empty after sanitization.');
  }
  
  const priceResult = validatePrice(pgData.price);
  if (!priceResult.valid) {
    throw new Error(`Invalid price: ${priceResult.error}`);
  }
  
  const phoneResult = validatePhone(pgData.contactPhone);
  if (!phoneResult.valid) {
    throw new Error(`Invalid phone: ${phoneResult.error}`);
  }

  let emailClean = '';
  if (pgData.contactEmail) {
    const emailResult = validateEmail(pgData.contactEmail);
    if (!emailResult.valid) {
      throw new Error(`Invalid email: ${emailResult.error}`);
    }
    emailClean = pgData.contactEmail.trim();
  }

  // 1. Phone number deduplication check (limit to max 3 owners)
  const { data: phoneMatches, error: phoneErr } = await supabase
    .from('pgs')
    .select('owner_id')
    .eq('contact_phone', phoneResult.cleaned);
  
  if (!phoneErr && phoneMatches) {
    const ownerIds = new Set(phoneMatches.map(m => m.owner_id).filter(id => id !== userId));
    if (ownerIds.size >= 3) {
      throw new Error("This phone number is associated with too many different accounts. Please contact support.");
    }
  }

  // 2. Image hash duplicate check
  const newHashes = [];
  const encoder = new TextEncoder();
  for (const base64 of (pgData.images || [])) {
    const dataBytes = encoder.encode(base64);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    newHashes.push(hashHex);
  }

  if (newHashes.length > 0) {
    const { data: hashMatches, error: hashErr } = await supabase
      .from('pgs')
      .select('owner_id, image_hashes')
      .overlaps('image_hashes', newHashes);

    if (!hashErr && hashMatches) {
      for (const match of hashMatches) {
        if (match.owner_id !== userId) {
          throw new Error("Duplicate image detected. Reusing photos from another listing is not permitted.");
        }
      }
    }
  }

  // 3. Delayed activation logic (2h delay for accounts < 24h old)
  const { data: userProfile, error: profileErr } = await supabase
    .from('users')
    .select('created_at')
    .eq('id', userId)
    .single();

  const userCreationTime = (!profileErr && userProfile) ? new Date(userProfile.created_at).getTime() : Date.now();
  const accountAgeMs = Date.now() - userCreationTime;
  const isNewAccount = accountAgeMs < 24 * 60 * 60 * 1000;
  const delayHours = isNewAccount ? 2 : 0;
  const isActive = !isNewAccount;

  const sanitizedPG = {
    name: nameClean,
    locality: sanitizeText(pgData.locality, 100),
    address: addressClean,
    description: descClean,
    price: priceResult.value,
    gender: ['boys', 'girls', 'unisex'].includes(pgData.gender) ? pgData.gender : 'unisex',
    furnishing: sanitizeText(pgData.furnishing || 'Semi Furnished', 50),
    available_from: sanitizeText(pgData.availableFrom || 'Immediate', 50),
    contact_phone: phoneResult.cleaned,
    contact_email: emailClean,
    contact_whatsapp: pgData.contactWhatsapp ? (validatePhone(pgData.contactWhatsapp).cleaned || phoneResult.cleaned) : phoneResult.cleaned,
    owner_id: userId,
    amenities: Array.isArray(pgData.amenities) 
      ? pgData.amenities.map(a => sanitizeText(a, 50)) 
      : [],
    images: Array.isArray(pgData.images) 
      ? pgData.images.map(img => img) 
      : [],
    image_hashes: newHashes,
    is_active: isActive,
    activation_time: new Date(Date.now() + delayHours * 60 * 60 * 1000).toISOString()
  };

  const { data, error } = await supabase
    .from('pgs')
    .insert([sanitizedPG])
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
export async function deletePGListing(pgId, userId, isAdmin = false) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  if (typeof pgId !== 'string' || pgId.trim().length === 0 || pgId.length > 100) {
    throw new Error("Invalid listing ID format.");
  }

  if (typeof userId !== 'string' || userId.trim().length === 0 || userId.length > 100) {
    throw new Error("Unauthorized: Invalid user UUID format.");
  }

  // If not admin, first fetch listing to confirm ownership
  if (!isAdmin) {
    const { data: pg, error: fetchError } = await supabase
      .from('pgs')
      .select('owner_id')
      .eq('id', pgId)
      .single();

    if (fetchError || !pg) {
      throw new Error("Listing not found.");
    }

    if (pg.owner_id !== userId) {
      throw new Error("Unauthorized: You do not have permission to delete this listing.");
    }
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
