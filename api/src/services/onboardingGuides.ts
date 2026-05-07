export interface OnboardingGuide {
  appName: string;
  category: string;
  tagline: string;
  loginPath: string;
  defaultCredentials: string | null;
  firstSteps: string[];
  tips: string[];
}

const GUIDES: Record<string, OnboardingGuide> = {
  n8n: {
    appName: "n8n",
    category: "Automation",
    tagline: "Workflow automation that replaces Zapier",
    loginPath: "/",
    defaultCredentials: null,
    firstSteps: [
      "Open your n8n URL — you'll see a setup wizard on first visit.",
      "Create your owner account with email and password.",
      "You're in! Click '+ New Workflow' to create your first automation.",
      "Browse 400+ integrations (HTTP, Slack, Google Sheets, webhooks, etc.) in the left panel.",
      "Try the built-in templates to get started fast — click 'Templates' in the sidebar.",
    ],
    tips: [
      "Use 'HTTP Request' nodes to call any API without a dedicated integration.",
      "Enable 'Save Execution Data' on workflows you want to debug.",
      "Webhook nodes give you a URL you can call from any external service.",
      "n8n auto-saves — no need to manually save your workflows.",
    ],
  },

  activepieces: {
    appName: "Activepieces",
    category: "Automation",
    tagline: "Open-source automation platform",
    loginPath: "/sign-up",
    defaultCredentials: null,
    firstSteps: [
      "Visit your Activepieces URL and click 'Get Started' to create your account.",
      "Create a new flow by clicking the '+ New flow' button.",
      "Choose a trigger (webhook, schedule, or a specific app event).",
      "Add action steps — connect to Slack, Google, HTTP, email, and more.",
      "Test your flow with the 'Test' button before enabling it.",
    ],
    tips: [
      "Use the HTTP piece to integrate with any REST API.",
      "Pieces (integrations) are updated automatically — you always have the latest.",
      "You can duplicate flows as templates for similar automations.",
    ],
  },

  umami: {
    appName: "Umami",
    category: "Analytics",
    tagline: "Privacy-friendly analytics — replaces Google Analytics",
    loginPath: "/login",
    defaultCredentials: "Username: admin · Password: umami",
    firstSteps: [
      "Log in at your Umami URL with username 'admin' and password 'umami'.",
      "IMPORTANT: Go to Settings → Profile and change your password immediately.",
      "Click 'Add website' and enter your site's name and domain.",
      "Copy the tracking script shown and paste it into your website's <head> tag.",
      "Visit your website to trigger the first pageview — data appears in seconds.",
    ],
    tips: [
      "You can track multiple websites from one Umami instance.",
      "Create a share link to give read-only public access to your dashboard.",
      "Umami is GDPR-compliant by default — no cookie consent banner needed.",
      "Event tracking lets you count clicks, form submissions, etc. beyond pageviews.",
    ],
  },

  formbricks: {
    appName: "Formbricks",
    category: "Forms",
    tagline: "Open-source survey & form builder — replaces Typeform",
    loginPath: "/auth/signup",
    defaultCredentials: null,
    firstSteps: [
      "Create your account at your Formbricks URL.",
      "Create an Organization and your first Product.",
      "Click 'New Survey' to build your first form or survey.",
      "Choose between 'Link Survey' (shareable URL) or in-app surveys.",
      "Customize questions, branching logic, and design.",
      "Publish and share your survey link.",
    ],
    tips: [
      "Link surveys work like Typeform — shareable URLs, no code needed.",
      "In-app surveys let you target specific user segments with JavaScript SDK.",
      "Connect webhooks to forward responses to your own backend or Zapier/n8n.",
    ],
  },

  twenty: {
    appName: "Twenty",
    category: "CRM",
    tagline: "Open-source CRM — replaces Salesforce / HubSpot",
    loginPath: "/",
    defaultCredentials: null,
    firstSteps: [
      "Open your Twenty URL and create your workspace on first visit.",
      "Create your admin account with email and password.",
      "Add your first contacts by clicking 'People' in the sidebar.",
      "Create a company and link contacts to it under 'Companies'.",
      "Set up your pipeline stages under 'Opportunities'.",
      "Import existing contacts via CSV: People → Import.",
    ],
    tips: [
      "Twenty uses a spreadsheet-style view — you can add custom fields to any object.",
      "The API is available at /api — useful for syncing with your product.",
      "Create custom objects for things beyond contacts, companies, and deals.",
    ],
  },

  corteza: {
    appName: "Corteza",
    category: "CRM",
    tagline: "Open-source low-code CRM and business platform",
    loginPath: "/auth",
    defaultCredentials: null,
    firstSteps: [
      "Navigate to your Corteza URL and complete the admin setup wizard.",
      "Log in with the admin credentials you created.",
      "Explore the pre-built CRM module under 'Applications'.",
      "Add your first leads, contacts, and accounts.",
      "Use the Low-Code builder to customize modules to fit your workflow.",
    ],
    tips: [
      "Corteza's Low-Code builder lets you create custom apps without writing code.",
      "The workflow engine handles automation — similar to n8n but built-in.",
      "REST API is fully available for external integrations.",
    ],
  },

  gitea: {
    appName: "Gitea",
    category: "DevOps",
    tagline: "Self-hosted Git — replaces GitHub",
    loginPath: "/",
    defaultCredentials: null,
    firstSteps: [
      "Visit your Gitea URL — you'll see the installation wizard on first visit.",
      "Configure your instance (SQLite is fine for personal use, change to Postgres for teams).",
      "Create your admin account at the bottom of the installation form.",
      "Click 'New Repository' to create your first repo.",
      "Push your code: git remote add origin https://YOUR_URL/username/repo.git",
    ],
    tips: [
      "Gitea supports GitHub Actions-compatible CI/CD via Gitea Actions — enable in admin panel.",
      "You can mirror GitHub repos to Gitea automatically.",
      "Gitea supports SSH keys — add yours under Settings → SSH / GPG Keys.",
      "Organizations and teams work exactly like GitHub's.",
    ],
  },

  listmonk: {
    appName: "Listmonk",
    category: "Email",
    tagline: "High-performance newsletter & mailing list manager",
    loginPath: "/",
    defaultCredentials: "Username: admin · Password: listmonk",
    firstSteps: [
      "Log in with username 'admin' and password 'listmonk'.",
      "Go to Settings → SMTP and add your email provider (Mailgun, SendGrid, SES, etc.).",
      "Create your first mailing list under Lists → New List.",
      "Import subscribers via CSV or add them manually.",
      "Create a campaign under Campaigns → New Campaign and select your list.",
      "Send a test email before sending to your full list.",
    ],
    tips: [
      "Listmonk supports transactional emails in addition to campaigns.",
      "Use the template system for consistent email branding.",
      "The API lets you subscribe/unsubscribe programmatically from your app.",
      "Double opt-in is available per list — highly recommended for deliverability.",
    ],
  },

  keycloak: {
    appName: "Keycloak",
    category: "Auth",
    tagline: "Enterprise identity & access management — replaces Auth0",
    loginPath: "/admin",
    defaultCredentials: "Username: admin · Password: check your barf dashboard deploy logs",
    firstSteps: [
      "Open your Keycloak URL — the admin console is at /admin.",
      "Log in with username 'admin' and the password shown in your barf dashboard deploy logs.",
      "Create a new Realm (a security domain) for your application — don't use the master realm.",
      "Under your realm, go to Clients → Create Client to register your application.",
      "Set valid redirect URIs and enable the authorization flows your app needs.",
      "Create users under Users → Add User, or enable self-registration.",
    ],
    tips: [
      "Use Social Login (Google, GitHub, etc.) under Identity Providers.",
      "Keycloak themes let you customize the login page to match your brand.",
      "OIDC / OAuth2 flows are fully supported — works with any framework.",
      "Enable 2FA under Authentication → Required Actions.",
    ],
  },

  nextcloud: {
    appName: "Nextcloud",
    category: "Storage",
    tagline: "Self-hosted file sync & collaboration — replaces Google Drive / Dropbox",
    loginPath: "/",
    defaultCredentials: "Username: admin · Password: check your barf dashboard deploy logs",
    firstSteps: [
      "Log in at your Nextcloud URL with username 'admin' and the password shown in your barf dashboard deploy logs.",
      "Install the desktop or mobile client to sync files: nextcloud.com/install",
      "Explore the App Store (top-right menu) to add Calendar, Contacts, Talk, etc.",
      "Create additional users under Settings → Users.",
      "Set up external storage (S3, FTP, etc.) under Settings → External Storage if needed.",
    ],
    tips: [
      "Nextcloud Talk adds video calls and messaging directly in your instance.",
      "Nextcloud Calendar syncs with iOS/Android via CalDAV.",
      "Contacts syncs with your phone via CardDAV.",
      "Enable Server-Side Encryption under Settings for extra security.",
    ],
  },

  vaultwarden: {
    appName: "Vaultwarden",
    category: "Security",
    tagline: "Self-hosted Bitwarden-compatible password manager",
    loginPath: "/",
    defaultCredentials: null,
    firstSteps: [
      "Open your Vaultwarden URL — you'll create an account directly on the login screen.",
      "Click 'Create Account' and register with your email and a strong master password.",
      "Download the official Bitwarden app (iOS/Android) or browser extension.",
      "In the app settings, change the server URL to your Vaultwarden instance URL.",
      "Log in with your email and master password — your vault is ready.",
    ],
    tips: [
      "Use the official Bitwarden clients — they're fully compatible with Vaultwarden.",
      "Enable 2FA under Account Settings → Two-Step Login.",
      "Organizations let you securely share passwords with team members.",
      "The admin panel is at /admin — protected by the ADMIN_TOKEN from your deploy.",
      "Enable Emergency Access so a trusted contact can access your vault if needed.",
    ],
  },
};

export function getOnboardingGuide(slug: string): OnboardingGuide | null {
  return GUIDES[slug] ?? null;
}

export function getAllGuidesSlugs(): string[] {
  return Object.keys(GUIDES);
}

export function buildSystemPrompt(guide: OnboardingGuide, liveUrl: string): string {
  return `You are Barfy, a friendly and concise onboarding assistant for barf.dev.

The user has just deployed ${guide.appName} (${guide.tagline}).
Their instance is live at: ${liveUrl}

Your job is to help them get started with ${guide.appName} step by step.

KEY INFO FOR THIS APP:
- Login path: ${liveUrl}${guide.loginPath}
- Default credentials: ${guide.defaultCredentials ?? "None — user creates account on first visit"}
- Category: ${guide.category}

FIRST STEPS:
${guide.firstSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}

HELPFUL TIPS:
${guide.tips.map(t => `• ${t}`).join("\n")}

INSTRUCTIONS:
- Be concise and direct — bullet points and numbered steps are preferred over paragraphs
- Reference the actual live URL (${liveUrl}) when giving instructions
- If asked about something outside ${guide.appName}, gently redirect to what you know
- Never make up credentials or configuration details you're not sure about
- Keep responses under 200 words unless a complex question requires more
- Format responses in Markdown (bold key terms, use numbered lists for steps)`;
}
