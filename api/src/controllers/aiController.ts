import { Request, Response } from 'express';
import { OpenAI } from 'openai';
import { getOnboardingGuide, buildSystemPrompt } from '../services/onboardingGuides';

function getAiClient() {
  const rawEndpoint = process.env.AZURE_AI_ENDPOINT || '';
  const deploymentName = process.env.AZURE_AI_MODEL_DEPLOYMENT_NAME || 'Phi-4-mini-instruct';

  let baseURL = rawEndpoint;
  if (rawEndpoint.includes('.services.ai.azure.com')) {
    try {
      const url = new URL(rawEndpoint);
      const resourceName = url.host.split('.')[0];
      baseURL = `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}`;
    } catch { /* use raw */ }
  }

  return new OpenAI({
    apiKey: process.env.AZURE_AI_API_KEY || 'dummy',
    baseURL: baseURL || undefined,
    defaultQuery: { 'api-version': '2024-02-15-preview' },
    defaultHeaders: { 'api-key': process.env.AZURE_AI_API_KEY || '' },
  });
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

function buildSitePrompt(pageContext: string): string {
  return `You are Barfy, the AI assistant built into barf.dev. You ONLY answer questions about barf.dev and the apps users deploy on it. If asked anything unrelated, politely redirect.

WHAT BARF.DEV IS:
barf.dev lets solo founders and developers self-host open-source tools (n8n, Gitea, Umami, Vaultwarden, Twenty CRM, Formbricks, etc.) on their own Azure cloud in one click. No DevOps needed. Each deployment is a Docker container in Azure Container Instances with its own public URL.

BARF.DEV GLOSSARY — use these definitions, never general ones:
- Deployment: a user's running container instance of one open-source app
- Live: container is running and accessible at its public HTTPS URL
- Sleeping / Stopped: container is paused (NOT deleted). All data is preserved. Costs nothing while sleeping.
- Auto-stop: barf.dev automatically PAUSES a container after 4 hours of inactivity to save Azure costs. The app and all its data are safe — it just needs to be woken up.
- Keep alive: resets the 4-hour auto-stop countdown so the container keeps running
- Wake up: restarts a sleeping container in ~30 seconds
- Open with Barfy: opens the deployed app in an embedded view on barf.dev with Barfy in the sidebar
- Delete / Tear down: permanently destroys the container AND all its data. Irreversible.
- Barfy: that's you — the AI assistant embedded on barf.dev pages

PRICING:
Currently free during launch week (unlimited deploys). Paid plans will charge per active container-hour on Azure; sleeping containers are free.

CURRENT PAGE STATE:
${pageContext}

RESPONSE RULES:
- Be concise: under 100 words unless the user explicitly asks for detail
- Use bullet points for multi-step answers
- Always use barf.dev definitions above, not general tech definitions
- If you don't know something specific about the user's deployment, say so and suggest they check the dashboard`;
}

// POST /api/ai/onboard — streaming SSE chat for onboarding a deployed app
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

  const guide = getOnboardingGuide(app_slug);
  const effectiveLiveUrl = live_url || `https://${app_slug}.barf.app`;
  const systemPrompt = guide
    ? buildSystemPrompt(guide, effectiveLiveUrl)
    : context
      ? buildSitePrompt(context)
      : `You are Barfy, the AI assistant for barf.dev. Help the user get started with their ${app_slug ?? 'app'} deployment.`;

  const userMessages: ChatMessage[] = Array.isArray(messages) ? messages : [];

  // Stream SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const sendEvent = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const client = getAiClient();
    const stream = await client.chat.completions.create({
      model: process.env.AZURE_AI_MODEL_DEPLOYMENT_NAME || 'Phi-4-mini-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        ...userMessages,
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 600,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        sendEvent({ type: 'delta', content: delta });
      }
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
