/**
 * docsService — scrapes official app docs via Firecrawl and caches them in
 * Supabase so Barfy has real, up-to-date knowledge about every hosted app.
 *
 * Cache TTL: 7 days. First call for an uncached app triggers a background
 * scrape so the NEXT message has full docs (current message uses fallback).
 *
 * Required Supabase table (run in SQL editor):
 *   create table if not exists app_docs (
 *     app_slug   text primary key,
 *     content    text not null,
 *     scraped_at timestamptz not null default now()
 *   );
 */

import { createClient } from '@supabase/supabase-js';
import FirecrawlApp from '@mendable/firecrawl-js';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_CHARS_PER_PAGE = 3_000;
const MAX_TOTAL_CHARS    = 8_000;

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function getFirecrawl() {
  return new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY || '' });
}

// ─── Read from cache ──────────────────────────────────────────────────────────

export async function getAppDocs(appSlug: string): Promise<string | null> {
  try {
    const { data, error } = await getSupabase()
      .from('app_docs')
      .select('content, scraped_at')
      .eq('app_slug', appSlug)
      .maybeSingle();

    if (error || !data) return null;

    const age = Date.now() - new Date(data.scraped_at).getTime();
    if (age > CACHE_TTL_MS) return null; // stale — caller should re-scrape

    return data.content as string;
  } catch {
    return null;
  }
}

// ─── Scrape + cache ───────────────────────────────────────────────────────────

export async function scrapeAndCacheDocs(
  appSlug: string,
  urls: string[],
): Promise<void> {
  if (!process.env.FIRECRAWL_API_KEY || !urls.length) return;

  console.log(`[docs] Scraping ${urls.length} pages for ${appSlug}…`);
  const firecrawl = getFirecrawl();
  const parts: string[] = [];

  for (const url of urls) {
    try {
      const result = await (firecrawl as any).scrapeUrl(url, { formats: ['markdown'] }) as any;
      const md: string = result?.markdown || result?.data?.markdown || '';
      if (md) {
        // Strip nav/footer noise (lines shorter than 20 chars are usually nav links)
        const cleaned = md
          .split('\n')
          .filter((l: string) => l.trim().length > 20 || l.startsWith('#'))
          .join('\n')
          .trim()
          .slice(0, MAX_CHARS_PER_PAGE);
        parts.push(`## ${url}\n${cleaned}`);
      }
    } catch (err) {
      console.warn(`[docs] Failed to scrape ${url}:`, err instanceof Error ? err.message : err);
    }
    if (parts.join('\n\n').length >= MAX_TOTAL_CHARS) break;
  }

  if (!parts.length) {
    console.warn(`[docs] No content scraped for ${appSlug}`);
    return;
  }

  const content = parts.join('\n\n').slice(0, MAX_TOTAL_CHARS);

  try {
    await getSupabase()
      .from('app_docs')
      .upsert(
        { app_slug: appSlug, content, scraped_at: new Date().toISOString() },
        { onConflict: 'app_slug' },
      );
    console.log(`[docs] Cached ${content.length} chars for ${appSlug}`);
  } catch (err) {
    console.warn(`[docs] Failed to cache docs for ${appSlug}:`, err);
  }
}

// ─── Get-or-trigger ───────────────────────────────────────────────────────────
// Returns cached docs if fresh. Otherwise kicks off a background scrape
// (so the NEXT Barfy call has real docs) and returns null for this call.

export async function getOrTriggerDocs(
  appSlug: string,
  urls: string[],
): Promise<string | null> {
  const cached = await getAppDocs(appSlug);
  if (cached) return cached;

  // Fire & forget background scrape — don't block this chat response
  if (urls.length) {
    setImmediate(() => scrapeAndCacheDocs(appSlug, urls).catch(console.error));
  }
  return null;
}
