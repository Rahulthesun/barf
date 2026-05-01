/**
 * Seed oss_apps from awesome-selfhosted + GitHub API + Phi-4-mini feature extraction
 *
 * Usage:
 *   npx ts-node src/scripts/seedApps.ts              # full run
 *   npx ts-node src/scripts/seedApps.ts --dry-run    # parse only, no DB writes
 *   npx ts-node src/scripts/seedApps.ts --limit 20   # seed only first 20 matched apps
 *   npx ts-node src/scripts/seedApps.ts --no-ai      # skip Phi-4 feature extraction
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN  = process.argv.includes('--dry-run');
const NO_AI    = process.argv.includes('--no-ai');
const limitArg = process.argv.find(a => a.startsWith('--limit=') || a === '--limit');
const LIMIT    = limitArg
  ? parseInt(process.argv[process.argv.indexOf(limitArg) + (limitArg.includes('=') ? 0 : 1)]?.split('=')[1] ?? '999')
  : 999;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';
const AWESOME_URL  = 'https://raw.githubusercontent.com/awesome-selfhosted/awesome-selfhosted/master/README.md';

// ─── Category mapping  ───────────────────────────────────────────────────────
// Maps lowercase awesome-selfhosted section headers → our categories

const CATEGORY_MAP: Record<string, string> = {
  'analytics':                          'Analytics',
  'automation':                         'Automation',
  'booking and scheduling':             'Project Mgmt',
  'calendar & contacts':                'Project Mgmt',
  'communication - custom communication systems': 'Chat',
  'communication - email - complete solutions':   'Email',
  'communication - email - mail transfer agents': 'Email',
  'communication - email - webmail clients':      'Email',
  'communication - irc':                'Chat',
  'communication - messaging':          'Chat',
  'communication - social networks and forums': 'Chat',
  'communication - video conferencing': 'Chat',
  'crm':                                'CRM',
  'customer relationship management':   'CRM',
  'document management':                'Storage',
  'file sharing':                       'Storage',
  'file transfer':                      'Storage',
  'file transfer - distributed filesystems': 'Storage',
  'file transfer - object storage & file servers': 'Storage',
  'file transfer - peer-to-peer filesharing': 'Storage',
  'file transfer - single-click & drag-n-drop upload': 'Storage',
  'forms':                              'Forms',
  'groupware':                          'Project Mgmt',
  'human resources management':         'CRM',
  'identity management':                'Auth',
  'identity management - ldap':         'Auth',
  'identity management - oauth':        'Auth',
  'identity management - saml':         'Auth',
  'inventory management':               'Project Mgmt',
  'knowledge management tools':         'Project Mgmt',
  'maps and global positioning system': 'Monitoring',
  'metrics & telemetry':                'Monitoring',
  'monitoring':                         'Monitoring',
  'note-taking & editors':              'Project Mgmt',
  'office suites':                      'Storage',
  'password managers':                  'Auth',
  'payments':                           'Payments',
  'personal dashboards':                'Monitoring',
  'photo and video galleries':          'Storage',
  'polls and events':                   'Forms',
  'project management':                 'Project Mgmt',
  'recipe management':                  'Project Mgmt',
  'remote access':                      'Monitoring',
  'resource planning':                  'Project Mgmt',
  'self-hosting solutions':             'Monitoring',
  'software development - api management': 'Monitoring',
  'software development - bug trackers': 'Project Mgmt',
  'software development - continuous integration & deployment': 'Monitoring',
  'software development - project management': 'Project Mgmt',
  'status / uptime pages':              'Monitoring',
  'surveys and polls':                  'Forms',
  'task management & to-do lists':      'Project Mgmt',
  'ticketing':                          'Project Mgmt',
  'url shorteners':                     'Monitoring',
  'web analytics':                      'Analytics',
};

// Known SaaS apps to detect for "replaces" field
const SAAS_HINTS: [RegExp, string][] = [
  [/zapier|make\.com|integromat/i,      'Zapier'],
  [/typeform/i,                          'Typeform'],
  [/google analytics/i,                  'Google Analytics'],
  [/salesforce/i,                        'Salesforce'],
  [/hubspot/i,                           'HubSpot'],
  [/mailchimp/i,                         'Mailchimp'],
  [/sendgrid/i,                          'SendGrid'],
  [/slack/i,                             'Slack'],
  [/notion/i,                            'Notion'],
  [/jira/i,                              'Jira'],
  [/trello/i,                            'Trello'],
  [/asana/i,                             'Asana'],
  [/auth0/i,                             'Auth0'],
  [/okta/i,                              'Okta'],
  [/google drive|dropbox/i,              'Google Drive'],
  [/airtable/i,                          'Airtable'],
  [/figma/i,                             'Figma'],
  [/intercom/i,                          'Intercom'],
  [/zendesk/i,                           'Zendesk'],
  [/stripe/i,                            'Stripe'],
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedApp {
  name:        string;
  website_url: string;
  description: string;
  github_url:  string;
  language:    string;
  license:     string;
  category:    string;
}

interface EnrichedApp extends ParsedApp {
  slug:         string;
  tagline:      string;
  stars:        number;
  docker_image: string;
  default_port: number;
  has_docker:   boolean;
  replaces:     string;
  features:     string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function inferReplaces(text: string): string {
  for (const [pattern, saas] of SAAS_HINTS) {
    if (pattern.test(text)) return saas;
  }
  return '';
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

function githubHeaders() {
  const h: Record<string, string> = { 'User-Agent': 'barf-seeder/1.0' };
  if (GITHUB_TOKEN) h['Authorization'] = `Bearer ${GITHUB_TOKEN}`;
  return h;
}

// ─── Step 1: Fetch + parse awesome-selfhosted ─────────────────────────────────

async function fetchAndParse(): Promise<ParsedApp[]> {
  console.log('📥  Fetching awesome-selfhosted...');
  const res = await fetch(AWESOME_URL);
  if (!res.ok) throw new Error(`Failed to fetch awesome-selfhosted: ${res.status}`);
  const md = await res.text();

  const apps: ParsedApp[] = [];
  let currentCategory = '';

  for (const line of md.split('\n')) {
    // Section header: ## Category or ### Sub-category
    const hdrMatch = line.match(/^#{2,3}\s+(.+)/);
    if (hdrMatch) {
      const raw = (hdrMatch[1] ?? '').toLowerCase().replace(/\*\*/g, '').trim();
      currentCategory = CATEGORY_MAP[raw] ?? '';
      continue;
    }

    if (!currentCategory) continue;

    // App entry line — matches: - **[Name](url)** - description ... `lang` `license`
    // OR just: - [Name](url) - description ... `lang` `license`
    const appMatch = line.match(/^[-*]\s+\*{0,2}\[([^\]]+)\]\(([^)]+)\)\*{0,2}\s*[-–]\s*(.+)/);
    if (!appMatch) continue;

    const name        = (appMatch[1] ?? '').trim();
    const website_url = (appMatch[2] ?? '').trim();
    const rest        = (appMatch[3] ?? '').trim();

    // Extract source code link (GitHub URL)
    const srcMatch = rest.match(/\[(?:Source Code|source code|Source)\]\((https?:\/\/github\.com\/[^)]+)\)/i);
    if (!srcMatch) continue; // skip if no GitHub link
    const github_url = srcMatch[1] ?? '';

    // Extract description (everything before the first backtick or parenthetical)
    const desc = rest.replace(/\(.*?\)/g, '').replace(/`[^`]+`/g, '').replace(/\s+/g, ' ').trim();

    // Extract language and license from backtick tokens at end
    const tokens = [...rest.matchAll(/`([^`]+)`/g)].map(m => m[1] ?? '');
    const license  = tokens.find(t => /MIT|GPL|AGPL|Apache|BSD|EUPL|MPL|ISC|Sustainable/i.test(t)) ?? '';
    const language = tokens.find(t => !/MIT|GPL|AGPL|Apache|BSD|EUPL|MPL|ISC|Sustainable/i.test(t) && t.length < 25) ?? '';

    if (!name || !github_url) continue;

    apps.push({ name, website_url, description: desc, github_url, language, license, category: currentCategory });
  }

  console.log(`✅  Parsed ${apps.length} apps with GitHub links across ${Object.keys(CATEGORY_MAP).length} mapped categories`);
  return apps;
}

// ─── Step 2: Enrich via GitHub API ───────────────────────────────────────────

async function enrichFromGitHub(app: ParsedApp): Promise<EnrichedApp | null> {
  const repoMatch = app.github_url.match(/github\.com\/([^/]+\/[^/#?]+)/);
  if (!repoMatch) return null;
  const repo = repoMatch[1]!;

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: githubHeaders() });
    if (res.status === 404 || res.status === 451) return null;
    if (!res.ok) {
      if (res.status === 403) {
        console.warn('  ⚠️  GitHub rate limit hit — add GITHUB_TOKEN to .env for 5000 req/hr');
        await sleep(60_000); // wait 1 min if unauthenticated
      }
      return null;
    }

    const data = await res.json() as {
      stargazers_count: number;
      description:      string | null;
      language:         string | null;
      topics:           string[];
      license:          { spdx_id: string } | null;
      default_branch:   string;
    };

    const stars    = data.stargazers_count ?? 0;
    const language = data.language ?? app.language;
    const license  = data.license?.spdx_id ?? app.license;
    const tagline  = (data.description ?? app.description).slice(0, 120);
    const topics   = data.topics ?? [];

    // Detect Docker support from topics or known repos
    const has_docker = topics.includes('docker') || topics.includes('docker-compose') ||
      app.github_url.includes('docker') || app.description.toLowerCase().includes('docker');

    // Infer docker image: try <org>/<repo> pattern (most projects use this on Docker Hub)
    const docker_image = has_docker ? repo.toLowerCase() : '';

    const replaces = inferReplaces(app.description + ' ' + tagline);

    return {
      ...app,
      slug:         slugify(app.name),
      tagline,
      stars,
      language,
      license,
      docker_image,
      default_port: 3000,
      has_docker,
      replaces,
      features:    [], // filled in step 3
    };
  } catch (err) {
    console.warn(`  ⚠️  GitHub API error for ${repo}: ${err}`);
    return null;
  }
}

// ─── Step 3: Feature extraction via Phi-4-mini ───────────────────────────────

function makeAIClient(): OpenAI {
  const targetUri = process.env.AZURE_GPT41_TARGET_URI ?? '';
  const key       = process.env.AZURE_GPT41_KEY ?? process.env.AZURE_AI_API_KEY ?? '';
  const baseURL   = (targetUri.split('?')[0] ?? targetUri).replace(/\/(responses|chat\/completions)$/, '');
  return new OpenAI({ apiKey: key, baseURL, defaultHeaders: { 'api-key': key } });
}

async function extractFeatures(app: EnrichedApp): Promise<string[]> {
  try {
    // Fetch the GitHub README
    const repoMatch = app.github_url.match(/github\.com\/([^/]+\/[^/#?]+)/);
    if (!repoMatch) return [];

    const repoPath = repoMatch[1]!;
    const readmeRes = await fetch(
      `https://api.github.com/repos/${repoPath}/readme`,
      { headers: { ...githubHeaders(), Accept: 'application/vnd.github.raw' } }
    );
    if (!readmeRes.ok) return [];
    const readme = (await readmeRes.text()).slice(0, 4000); // first 4k chars is enough

    const ai = makeAIClient();
    const resp = await ai.chat.completions.create({
      model: process.env.AZURE_GPT41_MINI_DEPLOYMENT ?? 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: 'You extract key features from software README files. Return ONLY a JSON array of 5-7 short feature strings (max 8 words each). No explanation, no markdown.',
        },
        {
          role: 'user',
          content: `App: ${app.name}\nDescription: ${app.tagline}\n\nREADME excerpt:\n${readme}`,
        },
      ],
      max_tokens: 200,
      temperature: 0.2,
    });

    const raw = resp.choices[0]?.message?.content?.trim() ?? '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) return [];
    return JSON.parse(match[0]) as string[];
  } catch {
    return [];
  }
}

// ─── Step 4: Upsert to Supabase ──────────────────────────────────────────────

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function upsertApps(apps: EnrichedApp[]): Promise<void> {
  const supabase = getSupabase();
  const rows = apps.map(a => ({
    name:          a.name,
    slug:          a.slug,
    tagline:       a.tagline,
    description:   a.description,
    category:      a.category,
    replaces:      a.replaces,
    github_url:    a.github_url,
    website_url:   a.website_url,
    docker_image:  a.docker_image,
    default_port:  a.default_port,
    stars:         a.stars,
    license:       a.license,
    language:      a.language,
    features:      a.features,
    has_docker:    a.has_docker,
    self_hostable: true,
    featured:      false,
  }));

  // Upsert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase
      .from('oss_apps')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: false });
    if (error) console.error(`  ❌  Upsert error (batch ${i}):`, error.message);
    else console.log(`  ✅  Upserted rows ${i + 1}–${i + batch.length}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🌱  barf app seeder  ${DRY_RUN ? '[DRY RUN]' : ''}  ${NO_AI ? '[NO AI]' : ''}\n`);

  // 1. Parse awesome-selfhosted
  const parsed = await fetchAndParse();
  if (parsed.length === 0) { console.error('❌  No apps parsed'); process.exit(1); }

  // 2. Filter to apps that map to our categories, then cap at LIMIT
  const filtered = parsed.filter(a => a.category).slice(0, LIMIT);
  console.log(`\n🔍  Processing ${filtered.length} apps (limit: ${LIMIT})...\n`);

  // 3. Enrich with GitHub — rate-limited: 1 req/s without token, no limit with token
  const delay = GITHUB_TOKEN ? 50 : 1100;
  const enriched: EnrichedApp[] = [];

  for (let i = 0; i < filtered.length; i++) {
    const app = filtered[i]!;
    process.stdout.write(`  [${i + 1}/${filtered.length}] ${app.name.padEnd(30)} `);

    const result = await enrichFromGitHub(app);
    if (!result) {
      console.log('skip (not found on GitHub)');
      continue;
    }

    // Skip apps with < 500 stars (low quality signal)
    if (result.stars < 500) {
      console.log(`skip (${result.stars} stars)`);
      continue;
    }

    console.log(`⭐ ${result.stars.toLocaleString()} ${result.category}`);
    enriched.push(result);
    await sleep(delay);
  }

  console.log(`\n📦  ${enriched.length} apps passed quality filter\n`);

  // 4. Feature extraction via AI (optional, costs tokens)
  if (!NO_AI && enriched.length > 0) {
    console.log('🤖  Extracting features with Phi-4-mini...\n');
    for (let i = 0; i < enriched.length; i++) {
      const app = enriched[i]!;
      process.stdout.write(`  [${i + 1}/${enriched.length}] ${app.name.padEnd(30)} `);
      app.features = await extractFeatures(app);
      console.log(app.features.length > 0 ? `${app.features.length} features` : 'skip');
      await sleep(200);
    }
    console.log('');
  }

  // 5. Write to Supabase (or just show a summary)
  if (DRY_RUN) {
    console.log('🧪  DRY RUN — would insert these apps:\n');
    for (const a of enriched) {
      console.log(`  ${a.category.padEnd(15)} ${a.name.padEnd(25)} ⭐${a.stars.toLocaleString().padStart(7)}  ${a.replaces ? `replaces: ${a.replaces}` : ''}`);
    }
  } else {
    console.log('💾  Upserting to Supabase...\n');
    await upsertApps(enriched);
    console.log(`\n✅  Done. ${enriched.length} apps seeded.`);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
