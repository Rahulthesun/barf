import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BuildPlan } from './generateBuildPlan';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (supabaseUrl && supabaseKey) {
      supabaseInstance = createClient(supabaseUrl, supabaseKey);
    }
  }
  return supabaseInstance;
}

export async function getExtractionByUrl(productUrl: string) {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('extractions')
      .select('*')
      .eq('product_url', productUrl)
      .limit(1);

    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('[dbService] Error fetching extraction by URL:', error);
    return null;
  }
}

export async function saveExtraction(
  productName: string,
  productUrl: string,
  extractionData: any,
  costReport: any,
  buildPlan: BuildPlan          // ← add this
        // ← new param
) {
  const supabase = getSupabase();
  if (!supabase) {
    console.warn('[dbService] Supabase credentials not found. Skipping database save.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('extractions')
      .insert([
        {
          product_name:       productName,
          product_url:        productUrl,
          features:           extractionData.features           || [],
          pricing_tiers:      extractionData.pricingTiers       || [],
          resource_estimates: extractionData.resourceEstimates  || {},
          cost_report:        costReport                        || null,  // ← new column
          build_plan:   buildPlan
        }
      ])
      .select();

    if (error) {
      console.error('[dbService] Error saving to Supabase:', error.message);
      throw error;
    }

    console.log('[dbService] Successfully saved extraction to Supabase:', data[0]?.id);
    return data[0];
  } catch (error) {
    console.error('[dbService] Exception saving to Supabase:', error);
    return null;
  }
}