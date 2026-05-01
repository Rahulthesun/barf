/**
 * @file buildPlanService.ts
 * @description Phase 1 — Build Plan Generation for barf (buildafreeversion).
 *
 * Takes the structured extraction + compute report and produces a full
 * codegen brief for the Phase 2 build AI. Contains the file tree with
 * per-file descriptions, Supabase schema, dependencies, and generation order.
 *
 * Stack is always: Next.js 14 App Router + Supabase + Tailwind CSS + shadcn/ui
 *
 * Fixes applied vs original:
 *  - slugToPascal() replaces naive charAt(0) — "my-tool" → "MyTool" not "My-tool"
 *  - generationOrder validated against files[] at end — mismatches throw at plan time
 *  - dependsOn populated for all non-trivial files
 *  - emails/welcome.tsx typed as 'email' — skipped from auth/Zod validation checks
 *  - .env.local.example description explicitly says key=value, not TypeScript
 */

import type { CostEstimationReport } from './aiService';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface PlannedFile {
  path:        string;
  // FIX: added 'email' so email templates are not treated as UI components
  type:        'page' | 'component' | 'api' | 'lib' | 'config' | 'schema' | 'hook' | 'type' | 'email';
  description: string;
  dependsOn?:  string[];
}

export interface BuildPlan {
  tool:  string;
  stack: {
    framework: string;
    styling:   string;
    database:  string;
    auth:      string;
    storage:   string;
    email:     string | null;
    payments:  string | null;
    realtime:  string | null;
  };
  dependencies: {
    production: Record<string, string>;
    dev:        Record<string, string>;
  };
  supabase: {
    tables:   SupabaseTable[];
    rlsNotes: string[];
  };
  files:             PlannedFile[];
  generationOrder:   string[];
  systemPromptHints: string[];
}

interface SupabaseTable {
  name:    string;
  columns: Array<{ name: string; type: string; notes?: string }>;
}

// Matches the shape returned by extractFeaturesWithAI()
interface ExtractionResult {
  features:      string[];
  pricingTiers:  Array<{ name: string; price: string; features: string[] }>;
  resourceEstimates: {
    auth:     string;
    db:       string;
    storage:  string;
    apiCalls: string;
  };
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/**
 * FIX: Converts a hyphenated slug to PascalCase for hook/component names.
 * "my-tool"  → "MyTool"
 * "notion"   → "Notion"
 * Previously was `slug.charAt(0).toUpperCase() + slug.slice(1)` which produced
 * "My-tool" — an invalid filename and broken import.
 */
function slugToPascal(slug: string): string {
  return slug
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

// ─────────────────────────────────────────────
// Main function
// ─────────────────────────────────────────────

export async function generateBuildPlan(
  productName: string,
  extraction:  ExtractionResult,
  compute:     CostEstimationReport['compute'],
  onProgress?: (msg: string) => void
): Promise<BuildPlan> {

  if (onProgress) onProgress(`🗂️ Planning file structure for ${productName}...`);

  const slug    = productName.toLowerCase().replace(/\s+/g, '-');
  const capSlug = slugToPascal(slug);

  // ── Stack ──────────────────────────────────────────────────────────────────

  const stack: BuildPlan['stack'] = {
    framework: 'Next.js 14 (App Router)',
    styling:   'Tailwind CSS + shadcn/ui',
    database:  'Supabase (PostgreSQL)',
    auth:      compute.hasAuth     ? 'Supabase Auth (email/password + OAuth)' : 'none',
    storage:   compute.hasStorage  ? 'Supabase Storage'                        : 'none',
    email:     compute.hasEmail    ? 'Resend'                                  : null,
    payments:  compute.hasPayments ? 'Stripe'                                  : null,
    realtime:  compute.hasRealtime ? 'Supabase Realtime'                       : null,
  };

  // ── Dependencies ──────────────────────────────────────────────────────────

  const production: Record<string, string> = {
    'next':                   '15.2.4',
    'react':                  '19.0.0',
    'react-dom':              '19.0.0',
    '@supabase/supabase-js':  '2.49.0',
    '@supabase/ssr':          '0.6.1',
    'tailwindcss':            '3.4.17',
    'clsx':                   '2.1.1',
    'tailwind-merge':         '2.6.0',
    'lucide-react':           '0.469.0',
    'zod':                    '3.24.2',
  };

  const dev: Record<string, string> = {
    'typescript':         '5.7.3',
    '@types/node':        '22.13.5',
    '@types/react':       '19.0.8',
    '@types/react-dom':   '19.0.3',
    'eslint':             '9.15.0',
    'eslint-config-next': '15.2.4',
    'supabase':           '2.3.4',
  };

  if (compute.hasPayments) production['stripe']      = '17.7.0';
  if (compute.hasEmail)    production['resend']       = '4.2.0';
  if (compute.hasEmail)    production['react-email']  = '3.0.4';

  // ── Supabase Schema ────────────────────────────────────────────────────────

  if (onProgress) onProgress(`🗄️ Designing Supabase schema...`);

  const tables: SupabaseTable[] = [];

  if (compute.hasAuth) {
    tables.push({
      name: 'profiles',
      columns: [
        { name: 'id',         type: 'uuid',        notes: 'references auth.users(id)' },
        { name: 'email',      type: 'text',        notes: 'unique' },
        { name: 'full_name',  type: 'text' },
        { name: 'avatar_url', type: 'text' },
        { name: 'created_at', type: 'timestamptz', notes: 'default now()' },
      ],
    });
  }

  tables.push({
    name: `${slug}_items`,
    columns: [
      { name: 'id',         type: 'uuid',        notes: 'primary key, default gen_random_uuid()' },
      { name: 'user_id',    type: 'uuid',        notes: 'references profiles(id)' },
      { name: 'title',      type: 'text' },
      { name: 'content',    type: 'jsonb',       notes: 'stores the main payload' },
      { name: 'status',     type: 'text',        notes: 'draft | published | archived' },
      { name: 'created_at', type: 'timestamptz', notes: 'default now()' },
      { name: 'updated_at', type: 'timestamptz', notes: 'default now()' },
    ],
  });

  if (compute.hasPayments) {
    tables.push({
      name: 'subscriptions',
      columns: [
        { name: 'id',                     type: 'uuid' },
        { name: 'user_id',                type: 'uuid',        notes: 'references profiles(id)' },
        { name: 'stripe_customer_id',     type: 'text' },
        { name: 'stripe_subscription_id', type: 'text' },
        { name: 'plan',                   type: 'text',        notes: 'free | pro | enterprise' },
        { name: 'status',                 type: 'text',        notes: 'active | canceled | past_due' },
        { name: 'current_period_end',     type: 'timestamptz' },
      ],
    });
  }

  const rlsNotes = [
    'Enable RLS on all tables',
    'profiles: users can only read/update their own row',
    `${slug}_items: users can only CRUD their own rows (user_id = auth.uid())`,
    ...(compute.hasPayments ? ['subscriptions: users can only read their own row'] : []),
  ];

  // ── File Tree ──────────────────────────────────────────────────────────────

  if (onProgress) onProgress(`📁 Building file tree...`);

  const files: PlannedFile[] = [

    // ── Config ──────────────────────────────────────────────────────────────
    {
      path: 'package.json',
      type: 'config',
      description: 'All production and dev dependencies listed in the build plan. Scripts: dev, build, start, lint, test.',
    },
    {
      path: 'tsconfig.json',
      type: 'config',
      description: 'Strict TypeScript config. Path alias @ pointing to project root. Include: ["**/*.ts","**/*.tsx"].',
    },
    {
      path: 'tailwind.config.ts',
      type: 'config',
      description: 'Tailwind config with shadcn/ui CSS variable theme. Content paths cover app/, components/, emails/.',
    },
    {
      path: 'next.config.mjs',
      type: 'config',
      description: `Next.js 15 config as ESM (.mjs). Use export default { ... } syntax.${compute.hasStorage ? ' Add Supabase storage hostname to images.remotePatterns.' : ''}`,
    },
    {
      path: '.env.local.example',
      type: 'config',
      // FIX: explicit instruction — output key=value pairs, not TypeScript code
      description: [
        'Plain key=value environment variable template (NOT TypeScript). One variable per line with blank value.',
        ' Required vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY',
        compute.hasPayments ? ', STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' : '',
        compute.hasEmail    ? ', RESEND_API_KEY' : '',
        '. No code, no TypeScript. Comments with # are fine.',
      ].join(''),
    },

    // ── Types ────────────────────────────────────────────────────────────────
    {
      path: 'types/database.ts',
      type: 'type',
      description: 'Supabase generated types. Export Database type. Include Row/Insert/Update helpers for every table in the schema.',
    },
    {
      path: 'types/index.ts',
      type: 'type',
      description: `Re-export all app-level types. Include User, Session, and domain types derived from DB schema (${slug}_items Row, Insert, Update).`,
      dependsOn: ['types/database.ts'],
    },

    // ── Supabase utils ───────────────────────────────────────────────────────
    {
      path: 'utils/supabase/client.ts',
      type: 'lib',
      description: 'createBrowserClient() singleton using @supabase/ssr. For Client Components only.',
    },
    {
      path: 'utils/supabase/server.ts',
      type: 'lib',
      description: 'createServerClient() using next/headers cookies via @supabase/ssr. For Server Components and Route Handlers only.',
    },
    {
      path: 'utils/supabase/middleware.ts',
      type: 'lib',
      description: 'updateSession() helper — refreshes the Supabase auth session cookie on every request. Called exclusively by middleware.ts.',
    },
    {
      path: 'middleware.ts',
      type: 'lib',
      description: 'Next.js middleware. Calls updateSession(). Protects all routes under /dashboard. Redirects unauthenticated users to /login.',
      dependsOn: ['utils/supabase/middleware.ts'],
    },

    // ── Providers ────────────────────────────────────────────────────────────
    {
      path: 'components/providers.tsx',
      type: 'component',
      description: 'Client component. Wraps children with global React context providers (Toaster etc). Export named `Providers`.',
    },

    // ── App shell ────────────────────────────────────────────────────────────
    {
      path: 'app/layout.tsx',
      type: 'page',
      description: 'Root layout. Sets Tailwind font variables, dark mode class, wraps children in Providers from @/components/providers. Imports globals from app/globals.css (never @/styles/globals.css).',
      dependsOn: ['app/globals.css', 'components/providers.tsx'],
    },
    {
      path: 'app/globals.css',
      type: 'config',
      description: 'Tailwind @base/@components/@utilities imports. shadcn/ui CSS variable definitions for light and dark theme.',
    },
    {
      path: 'app/page.tsx',
      type: 'page',
      description: `Static marketing landing page for ${productName}. Sections: Hero, Features, Pricing, CTA. No server data fetching.`,
      dependsOn: [
        'components/ui/button.tsx',
        ...(compute.hasPayments ? ['components/billing/PricingTable.tsx'] : []),
      ],
    },

    // ── Auth ─────────────────────────────────────────────────────────────────
    ...(compute.hasAuth ? [
      {
        path: 'app/(auth)/login/page.tsx',
        type: 'page' as const,
        description: 'Login page. Renders LoginForm. Server component — redirects to /dashboard if session already exists.',
        dependsOn: ['components/auth/LoginForm.tsx'],
      },
      {
        path: 'app/(auth)/register/page.tsx',
        type: 'page' as const,
        description: 'Register page. Renders RegisterForm. Server component — redirects to /dashboard if session already exists.',
        dependsOn: ['components/auth/RegisterForm.tsx'],
      },
      {
        path: 'app/(auth)/callback/route.ts',
        type: 'api' as const,
        description: 'OAuth callback Route Handler. Exchanges code for session via supabase.auth.exchangeCodeForSession(). Redirects to /dashboard.',
        dependsOn: ['utils/supabase/server.ts'],
      },
    ] : []),

    // ── Dashboard ────────────────────────────────────────────────────────────
    {
      path: 'app/(dashboard)/layout.tsx',
      type: 'page',
      description: 'Dashboard shell. Fetches current user server-side. Includes Sidebar and Topbar. Redirects to /login if no session.',
      dependsOn: ['utils/supabase/server.ts', 'components/layout/Sidebar.tsx', 'components/layout/Topbar.tsx'],
    },
    {
      path: 'app/(dashboard)/dashboard/page.tsx',
      type: 'page',
      description: `Main dashboard. Server component. Fetches ${slug}_items for the user. Renders ItemList. Shows empty state if none.`,
      dependsOn: [`components/${slug}/ItemList.tsx`, 'utils/supabase/server.ts', 'types/database.ts'],
    },
    {
      path: 'app/(dashboard)/dashboard/new/page.tsx',
      type: 'page',
      description: `Create new ${slug} item page. Renders NewItemForm client component.`,
      dependsOn: [`components/${slug}/NewItemForm.tsx`],
    },
    {
      path: 'app/(dashboard)/dashboard/[id]/page.tsx',
      type: 'page',
      description: `Detail/edit view for a single ${slug} item. Fetches by id server-side. 404s if not found or not owned by user. Renders EditItemForm.`,
      dependsOn: [`components/${slug}/EditItemForm.tsx`, 'utils/supabase/server.ts', 'types/database.ts'],
    },

    // ── API routes ───────────────────────────────────────────────────────────
    {
      path: `app/api/${slug}/route.ts`,
      type: 'api',
      description: `GET: list all ${slug}_items for current user. POST: create item — validate body with createItemSchema. Both routes verify session first (401 if missing).`,
      dependsOn: ['utils/supabase/server.ts', 'lib/validations.ts', 'types/database.ts'],
    },
    {
      path: `app/api/${slug}/[id]/route.ts`,
      type: 'api',
      description: `GET: fetch single item (must belong to user). PATCH: update with updateItemSchema. DELETE: soft-delete — set status=archived. All verify session.`,
      dependsOn: ['utils/supabase/server.ts', 'lib/validations.ts', 'types/database.ts'],
    },

    ...(compute.hasPayments ? [
      {
        path: 'app/api/stripe/checkout/route.ts',
        type: 'api' as const,
        description: 'POST: create Stripe Checkout session. Validate body with checkoutSchema. Return { url }. Verify session first.',
        dependsOn: ['lib/stripe.ts', 'lib/validations.ts', 'utils/supabase/server.ts'],
      },
      {
        path: 'app/api/stripe/webhook/route.ts',
        type: 'api' as const,
        description: 'POST: handle Stripe webhook events. Verify signature with stripe.webhooks.constructEvent(). Update subscriptions table on checkout.session.completed and customer.subscription.updated/deleted.',
        dependsOn: ['lib/stripe.ts', 'utils/supabase/server.ts'],
      },
      {
        path: 'app/api/stripe/portal/route.ts',
        type: 'api' as const,
        description: 'POST: create Stripe Customer Portal session. Return { url }. Verify session first.',
        dependsOn: ['lib/stripe.ts', 'utils/supabase/server.ts'],
      },
    ] : []),

    ...(compute.hasEmail ? [
      {
        path: 'app/api/email/send/route.ts',
        type: 'api' as const,
        description: 'POST: send transactional email via Resend. Accepts { template, recipient, variables }. Verify session first.',
        dependsOn: ['emails/welcome.tsx', 'utils/supabase/server.ts'],
      },
      {
        // FIX: was 'component' — now 'email' so validation skips auth/Zod checks
        path: 'emails/welcome.tsx',
        type: 'email' as const,
        description: `React Email template component. Props: { firstName: string }. Pure presentational email markup. No auth logic, no Zod, no Supabase calls.`,
      },
    ] : []),

    // ── shadcn/ui primitives ─────────────────────────────────────────────────
    {
      path: 'components/ui/button.tsx',
      type: 'component',
      description: 'shadcn/ui Button. Variants: default, outline, ghost, destructive, link. Sizes: sm, md, lg.',
    },
    {
      path: 'components/ui/input.tsx',
      type: 'component',
      description: 'shadcn/ui Input. Forwards ref. Applies ring-offset focus styles.',
    },
    {
      path: 'components/ui/card.tsx',
      type: 'component',
      description: 'shadcn/ui Card with CardHeader, CardTitle, CardDescription, CardContent, CardFooter.',
    },
    {
      path: 'components/ui/dialog.tsx',
      type: 'component',
      description: 'shadcn/ui Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription.',
    },
    {
      path: 'components/ui/dropdown-menu.tsx',
      type: 'component',
      description: 'shadcn/ui DropdownMenu with Trigger, Content, Item, Separator sub-components.',
    },
    {
      path: 'components/ui/badge.tsx',
      type: 'component',
      description: 'shadcn/ui Badge. Variants: default, secondary, destructive, outline.',
    },
    {
      path: 'components/ui/toast.tsx',
      type: 'component',
      description: 'shadcn/ui Toast + Toaster + useToast hook. Used for success/error feedback.',
    },

    // ── Layout ───────────────────────────────────────────────────────────────
    {
      path: 'components/layout/Sidebar.tsx',
      type: 'component',
      description: `Sidebar nav: Dashboard, New ${productName}, Settings${compute.hasPayments ? ', Billing' : ''}. User avatar at bottom. Collapsible on mobile.`,
      dependsOn: ['components/ui/button.tsx', 'hooks/useUser.ts'],
    },
    {
      path: 'components/layout/Topbar.tsx',
      type: 'component',
      description: 'Top nav bar. Page title + user dropdown with sign out.',
      dependsOn: ['components/ui/dropdown-menu.tsx', 'hooks/useUser.ts'],
    },

    // ── Feature components ───────────────────────────────────────────────────
    {
      path: `components/${slug}/ItemCard.tsx`,
      type: 'component',
      description: `Card for a ${slug} item. Title, status badge, date, action menu (edit/delete).`,
      dependsOn: [
        'components/ui/card.tsx',
        'components/ui/badge.tsx',
        'components/ui/dropdown-menu.tsx',
        'types/index.ts',
      ],
    },
    {
      path: `components/${slug}/ItemList.tsx`,
      type: 'component',
      description: `Responsive grid of ItemCards. Empty state with CTA if no items.`,
      dependsOn: [`components/${slug}/ItemCard.tsx`, 'components/ui/button.tsx'],
    },
    {
      path: `components/${slug}/NewItemForm.tsx`,
      type: 'component',
      description: `Client component. Create form. Client-side Zod validation via createItemSchema. POST /api/${slug}. Toast + redirect on success.`,
      dependsOn: [
        'components/ui/button.tsx',
        'components/ui/input.tsx',
        'lib/validations.ts',
        `hooks/use${capSlug}Items.ts`,
      ],
    },
    {
      path: `components/${slug}/EditItemForm.tsx`,
      type: 'component',
      description: `Client component. Pre-populated edit form. Validates with updateItemSchema. PATCH /api/${slug}/[id]. Toast on success/error.`,
      dependsOn: [
        'components/ui/button.tsx',
        'components/ui/input.tsx',
        'lib/validations.ts',
        `hooks/use${capSlug}Items.ts`,
        'types/index.ts',
      ],
    },

    ...(compute.hasAuth ? [
      {
        path: 'components/auth/LoginForm.tsx',
        type: 'component' as const,
        description: 'Client component. Email + password form. supabase.auth.signInWithPassword(). Error toast on failure. Redirect to /dashboard on success.',
        dependsOn: ['components/ui/button.tsx', 'components/ui/input.tsx', 'utils/supabase/client.ts'],
      },
      {
        path: 'components/auth/RegisterForm.tsx',
        type: 'component' as const,
        description: 'Client component. Email, password, confirm password. supabase.auth.signUp(). Email-confirmation message after signup.',
        dependsOn: ['components/ui/button.tsx', 'components/ui/input.tsx', 'utils/supabase/client.ts'],
      },
    ] : []),

    ...(compute.hasPayments ? [
      {
        path: 'components/billing/PricingTable.tsx',
        type: 'component' as const,
        description: 'Pricing tiers for landing page. Each tier CTA POSTs to /api/stripe/checkout. Highlights recommended plan.',
        dependsOn: ['components/ui/button.tsx', 'components/ui/card.tsx'],
      },
      {
        path: 'components/billing/BillingPage.tsx',
        type: 'component' as const,
        description: 'Client component. Current plan, status badge, next billing date. "Manage Billing" POSTs to /api/stripe/portal.',
        dependsOn: ['components/ui/button.tsx', 'components/ui/badge.tsx'],
      },
    ] : []),

    // ── Hooks ────────────────────────────────────────────────────────────────
    {
      path: 'hooks/useUser.ts',
      type: 'hook',
      description: 'Returns { user, session, isLoading }. Subscribes to supabase.auth.onAuthStateChange(). Uses browser client.',
      dependsOn: ['utils/supabase/client.ts', 'types/index.ts'],
    },
    {
      path: `hooks/use${capSlug}Items.ts`,
      type: 'hook',
      description: `Fetch and mutate ${slug}_items. Exports: { items, isLoading, create, update, remove }. Browser Supabase client.`,
      dependsOn: ['utils/supabase/client.ts', 'types/database.ts'],
    },

    ...(compute.hasRealtime ? [
      {
        path: `hooks/useRealtime${capSlug}.ts`,
        type: 'hook' as const,
        description: `Supabase Realtime subscription on ${slug}_items for the current user. Accepts a setState setter, patches it on INSERT/UPDATE/DELETE. Never subscribe in components directly.`,
        dependsOn: ['utils/supabase/client.ts', 'types/database.ts'],
      },
    ] : []),

    // ── Lib ──────────────────────────────────────────────────────────────────
    {
      path: 'lib/utils.ts',
      type: 'lib',
      description: 'cn() helper (clsx + tailwind-merge). formatDate() helper. Pure utility functions only.',
    },
    {
      path: 'lib/validations.ts',
      type: 'lib',
      description: `Zod schemas: createItemSchema (title required, content optional), updateItemSchema (all optional)${compute.hasPayments ? ', checkoutSchema (priceId: string)' : ''}.`,
    },

    ...(compute.hasPayments ? [
      {
        path: 'lib/stripe.ts',
        type: 'lib' as const,
        description: 'Stripe server-side client singleton. Initialised with STRIPE_SECRET_KEY. Named export `stripe`.',
      },
    ] : []),

    // ── Migrations ───────────────────────────────────────────────────────────
    {
      path: 'supabase/migrations/001_initial.sql',
      type: 'schema',
      description: `Creates all tables: ${tables.map(t => t.name).join(', ')}. Enables RLS. Adds all policies per rlsNotes. Uses gen_random_uuid() for PKs.`,
    },
    {
      path: 'supabase/seed.sql',
      type: 'schema',
      description: `3–5 example rows into ${slug}_items for local dev. Hard-coded test UUID. Use INSERT ... ON CONFLICT DO NOTHING.`,
    },
  ];

  // ── Generation Order ───────────────────────────────────────────────────────

  const generationOrder: string[] = [
    // Config — no deps
    'package.json',
    'tsconfig.json',
    'tailwind.config.ts',
    'next.config.mjs',
    '.env.local.example',

    // Types first — referenced everywhere
    'types/database.ts',
    'types/index.ts',

    // Supabase utils
    'utils/supabase/client.ts',
    'utils/supabase/server.ts',
    'utils/supabase/middleware.ts',
    'middleware.ts',

    // Lib primitives
    'lib/utils.ts',
    'lib/validations.ts',
    ...(compute.hasPayments ? ['lib/stripe.ts'] : []),

    // Global styles
    'app/globals.css',

    // shadcn/ui — referenced by almost all components
    ...files
      .filter(f => f.type === 'component' && f.path.startsWith('components/ui'))
      .map(f => f.path),

    // Layout components
    'components/layout/Sidebar.tsx',
    'components/layout/Topbar.tsx',

    // Auth components
    ...(compute.hasAuth ? [
      'components/auth/LoginForm.tsx',
      'components/auth/RegisterForm.tsx',
    ] : []),

    // Billing components
    ...(compute.hasPayments ? [
      'components/billing/PricingTable.tsx',
      'components/billing/BillingPage.tsx',
    ] : []),

    // Email templates
    ...(compute.hasEmail ? ['emails/welcome.tsx'] : []),

    // Feature components (depend on ui/ and hooks)
    `components/${slug}/ItemCard.tsx`,
    `components/${slug}/ItemList.tsx`,
    `components/${slug}/NewItemForm.tsx`,
    `components/${slug}/EditItemForm.tsx`,

    // Hooks
    'hooks/useUser.ts',
    `hooks/use${capSlug}Items.ts`,
    ...(compute.hasRealtime ? [`hooks/useRealtime${capSlug}.ts`] : []),

    // Pages & layouts
    'components/providers.tsx',
    'app/layout.tsx',
    'app/page.tsx',

    ...(compute.hasAuth ? [
      'app/(auth)/login/page.tsx',
      'app/(auth)/register/page.tsx',
      'app/(auth)/callback/route.ts',
    ] : []),

    'app/(dashboard)/layout.tsx',
    'app/(dashboard)/dashboard/page.tsx',
    'app/(dashboard)/dashboard/new/page.tsx',
    'app/(dashboard)/dashboard/[id]/page.tsx',

    // API routes
    `app/api/${slug}/route.ts`,
    `app/api/${slug}/[id]/route.ts`,

    ...(compute.hasPayments ? [
      'app/api/stripe/checkout/route.ts',
      'app/api/stripe/webhook/route.ts',
      'app/api/stripe/portal/route.ts',
    ] : []),

    ...(compute.hasEmail ? ['app/api/email/send/route.ts'] : []),

    // DB migrations last — full picture needed
    'supabase/migrations/001_initial.sql',
    'supabase/seed.sql',
  ];

  // ── FIX: Validate generationOrder ↔ files — throw at plan time not build time

  const filePathSet  = new Set(files.map(f => f.path));
  const orderPathSet = new Set(generationOrder);

  const inFilesNotOrder = files.map(f => f.path).filter(p => !orderPathSet.has(p));
  const inOrderNotFiles = generationOrder.filter(p => !filePathSet.has(p));

  if (inFilesNotOrder.length) {
    throw new Error(
      `Build plan error — files[] has paths missing from generationOrder:\n  ${inFilesNotOrder.join('\n  ')}`
    );
  }
  if (inOrderNotFiles.length) {
    throw new Error(
      `Build plan error — generationOrder references paths not in files[]:\n  ${inOrderNotFiles.join('\n  ')}`
    );
  }

  // ── System Prompt Hints ────────────────────────────────────────────────────

  const systemPromptHints = [
    `You are generating a production-ready Next.js 14 App Router clone of ${productName}.`,
    `Use utils/supabase/server.ts in Server Components and Route Handlers. Use utils/supabase/client.ts in Client Components. Never mix them.`,
    `All UI must use Tailwind CSS utility classes and shadcn/ui components from components/ui/. Never write raw CSS.`,
    `All forms must validate with Zod schemas from lib/validations.ts before any DB or API call.`,
    `Every API route must call createServerClient() and verify the session. Return NextResponse with status 401 if no session.`,
    `Use types from types/database.ts for all Supabase query results. Never use 'any'.`,
    `All import aliases use @/ pointing to the project root (e.g. import { cn } from '@/lib/utils'). The @/ prefix is a TypeScript path alias only — NEVER add @/anything as an npm dependency in package.json.`,
    `Email templates in emails/ are pure React Email components — no auth checks, no Zod, no Supabase calls.`,
    ...(compute.hasRealtime ? [
      `Subscribe to Supabase Realtime only inside useRealtime${capSlug} hook — never directly in components.`,
    ] : []),
    ...(compute.hasPayments ? [
      `Always verify Stripe webhook signatures with stripe.webhooks.constructEvent() before processing any event.`,
    ] : []),
    `Every file must be complete and production-ready — no TODOs, no placeholder comments, no ellipsis.`,
    `ONLY import files that exist in this exact file tree. Never invent imports to files not listed here. globals.css is at app/globals.css — never @/styles/globals.css.`,
  ];

  if (onProgress) onProgress(`✅ Build plan ready — ${files.length} files planned, order validated.`);

  return {
    tool: productName,
    stack,
    dependencies: { production, dev },
    supabase: { tables, rlsNotes },
    files,
    generationOrder,
    systemPromptHints,
  };
}