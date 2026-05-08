import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { getOnboardingGuide } from '../services/onboardingGuides';
import { getDeployConfig } from '../services/deployConfigs';
import { getOrTriggerDocs } from '../services/docsService';

// ─── GPT-4.1-mini client (Barfy) ─────────────────────────────────────────────
function getBarfyClient() {
  const rawEndpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_AI_ENDPOINT || '';
  const deploymentName = process.env.AZURE_GPT41_MINI_DEPLOYMENT || 'gpt-4.1-mini';
  const apiKey = process.env.AZURE_GPT41_KEY || process.env.AZURE_AI_API_KEY || '';

  let baseURL = rawEndpoint;
  if (rawEndpoint.includes('.services.ai.azure.com')) {
    try {
      const url = new URL(rawEndpoint);
      const resourceName = url.host.split('.')[0];
      baseURL = `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}`;
    } catch { /* use raw */ }
  }

  return new OpenAI({
    apiKey,
    baseURL: baseURL || undefined,
    defaultQuery: { 'api-version': '2024-12-01-preview' },
    defaultHeaders: { 'api-key': apiKey },
  });
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── System prompt builder ────────────────────────────────────────────────────

function buildBarfyPrompt(
  appSlug: string,
  liveUrl: string,
  pageContext?: string,
  officialDocs?: string | null,
): string {
  const guide = getOnboardingGuide(appSlug);

  // ── App-specific knowledge block ──────────────────────────────────────────
  let appBlock = '';
  if (guide) {
    appBlock = `
YOU ARE AN EXPERT ON: ${guide.appName} (${guide.tagline})
The user has their own live instance at: ${liveUrl}

FIRST STEPS for a brand-new ${guide.appName} instance:
${guide.firstSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${guide.defaultCredentials ? `DEFAULT CREDENTIALS: ${guide.defaultCredentials}\n` : ''}
PRO TIPS:
${guide.tips.map(t => `• ${t}`).join('\n')}
`;
  } else {
    appBlock = `
The user is running ${appSlug} at: ${liveUrl}
Help them get started and answer questions about this tool.
`;
  }

  // ── Current page / state context ─────────────────────────────────────────
  const pageBlock = pageContext ? `
CURRENT PAGE STATE (what the user is looking at right now):
${pageContext}
` : '';

  // ── Official docs (scraped + cached) ──────────────────────────────────────
  const docsBlock = officialDocs ? `
OFFICIAL DOCUMENTATION (excerpts from ${guide?.appName ?? appSlug} docs):
${officialDocs}
` : '';

  return `You are Barfy, the AI assistant built into barf.dev — embedded directly alongside the user's running app.

WHAT BARF.DEV IS:
barf.dev lets solo founders and developers self-host open-source tools on their own Azure cloud in one click. Each app runs in its own Docker container with a public HTTPS URL.

BARF.DEV GLOSSARY:
- Live: container running, app accessible
- Sleeping/Stopped: paused to save cost, all data safe, wakes in ~30 seconds
- Auto-stop: barf.dev pauses containers after 4 hours of inactivity
- Redeploy: tear down and recreate the container from scratch (wipes all data)
- Keep alive: resets the 4-hour auto-stop timer
${appBlock}${pageBlock}
RESPONSE RULES:
- You are embedded NEXT TO the live ${guide?.appName ?? appSlug} app — be a hands-on guide, not generic docs
- Be concise: under 120 words unless the user asks for detail
- Use numbered steps for setup tasks, bullets for tips
- If the user is confused about something on screen, guide them based on your knowledge of ${guide?.appName ?? appSlug}'s UI
- Never say "I don't have access to your screen" — use your knowledge of the app to help
- Only reference barf.dev concepts (auto-stop, sleeping, etc.) when relevant
${docsBlock}`;
}

function buildSitePrompt(pageContext: string): string {
  return `You are Barfy, the AI assistant built into barf.dev. You ONLY answer questions about barf.dev and the apps users deploy on it.

WHAT BARF.DEV IS:
barf.dev lets solo founders and developers self-host open-source tools (n8n, Gitea, Umami, Vaultwarden, Twenty CRM, Formbricks, etc.) on their own Azure cloud in one click. No DevOps needed.

BARF.DEV GLOSSARY:
- Deployment: a user's running container instance of an open-source app
- Live: container running and accessible at its public HTTPS URL
- Sleeping/Stopped: container paused (NOT deleted). Data preserved. Free while sleeping.
- Auto-stop: barf.dev automatically pauses a container after 4 hours of inactivity
- Keep alive: resets the 4-hour auto-stop countdown
- Wake up: restarts a sleeping container (~30 seconds)
- Open with Barfy: opens the deployed app embedded on barf.dev with Barfy in the sidebar
- Delete/Tear down: permanently destroys the container and all its data
- Redeploy: destroys and recreates the container from scratch (wipes all data)

PRICING: Free during launch week. Paid plans will charge per active container-hour; sleeping is free.

CURRENT PAGE STATE:
${pageContext}

RESPONSE RULES:
- Be concise: under 100 words unless asked for detail
- Use bullet points for multi-step answers
- Use barf.dev definitions above, not general tech definitions`;
}

// ─── POST /api/ai/onboard ─────────────────────────────────────────────────────
export async function onboardChat(req: Request, res: Response): Promise<void> {
  const { app_slug, live_url, context, messages } = req.body as {
    app_slug?: string;
    live_url?: string;
    context?: string;
    messages?: ChatMessage[];
  };

  if (!app_slug) {
    res.status(400).json({ error: 'Missing app_slug' });
    return;
  }

  const effectiveLiveUrl = live_url || `https://${app_slug}.barf.app`;

  // Fetch docs for embed-page requests (fire-and-forget on miss, returns null on first call)
  let officialDocs: string | null = null;
  if (live_url) {
    const config = getDeployConfig(app_slug);
    const docsUrls = config?.docs_urls ?? [];
    officialDocs = await getOrTriggerDocs(app_slug, docsUrls);
  }

  // Pick the right prompt:
  // • On the embed page (app-specific): use buildBarfyPrompt with guide + docs + context
  // • On the site widget (no live_url, has context): use buildSitePrompt
  const systemPrompt = live_url
    ? buildBarfyPrompt(app_slug, effectiveLiveUrl, context, officialDocs)
    : context
      ? buildSitePrompt(context)
      : buildBarfyPrompt(app_slug, effectiveLiveUrl);

  const userMessages: ChatMessage[] = Array.isArray(messages) ? messages : [];

  // ── Stream SSE ─────────────────────────────────────────────────────────────
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    const client = getBarfyClient();
    const stream = await client.chat.completions.create({
      model: process.env.AZURE_GPT41_MINI_DEPLOYMENT || 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...userMessages,
      ],
      stream: true,
      temperature: 0.5,
      max_tokens: 800,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) sendEvent({ type: 'delta', content: delta });
    }

    sendEvent({ type: 'done' });
  } catch (err: unknown) {
    console.error('[Barfy] Stream error:', err);
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    sendEvent({ type: 'error', message });
  } finally {
    res.end();
  }
}
