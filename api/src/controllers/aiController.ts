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

// POST /api/ai/onboard — streaming SSE chat for onboarding a deployed app
export async function onboardChat(req: Request, res: Response): Promise<void> {
  const { app_slug, live_url, messages } = req.body as {
    app_slug?: string;
    live_url?: string;
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
    : `You are Barfy, an onboarding assistant for ${app_slug} deployed via barf.dev. Help the user get started.`;

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
