/**
 * Barfy AI onboard endpoint tests.
 * Mocks the OpenAI client to avoid real API calls.
 */

import express from 'express';
import request from 'supertest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('openai', () => {
  const mockStream = {
    [Symbol.asyncIterator]: async function* () {
      yield { choices: [{ delta: { content: 'Hello' } }] };
      yield { choices: [{ delta: { content: ' world' } }] };
    },
  };

  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue(mockStream),
        },
      },
    })),
  };
});

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: () => ({
      select:  () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      upsert:  () => Promise.resolve({ error: null }),
    }),
  })),
}));

jest.mock('@mendable/firecrawl-js', () => ({
  default: jest.fn().mockImplementation(() => ({
    scrapeUrl: jest.fn().mockResolvedValue({ markdown: '' }),
  })),
}));

// ── App setup ────────────────────────────────────────────────────────────────
import aiRoutes from '../src/routes/aiRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/ai', aiRoutes);
  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/ai/onboard — validation', () => {
  it('returns 400 when app_slug is missing', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/ai/onboard')
      .send({})
      .expect(400);

    expect(res.body.error).toMatch(/missing app_slug/i);
  });

  it('returns 400 when body has irrelevant fields but no app_slug', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/ai/onboard')
      .send({ foo: 'bar' })
      .expect(400);

    expect(res.body.error).toMatch(/missing app_slug/i);
  });
});

describe('POST /api/ai/onboard — SSE streaming', () => {
  it('sets correct SSE headers on success', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/ai/onboard')
      .send({ app_slug: 'n8n', live_url: 'https://barf-n8n-abc.barf.dev' });

    expect(res.headers['content-type']).toMatch(/text\/event-stream/i);
    expect(res.headers['cache-control']).toMatch(/no-cache/i);
    expect(res.headers['connection']).toMatch(/keep-alive/i);
  });

  it('returns 200 status for a valid request', async () => {
    const app = makeApp();
    await request(app)
      .post('/api/ai/onboard')
      .send({ app_slug: 'umami', live_url: 'https://barf-umami-abc.barf.dev' })
      .expect(200);
  });

  it('streams delta and done SSE events in response body', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/ai/onboard')
      .send({ app_slug: 'n8n', live_url: 'https://barf-n8n-abc.barf.dev' });

    expect(res.text).toContain('data: ');
    expect(res.text).toContain('"type":"done"');
    expect(res.text).toContain('"type":"delta"');
  });

  it('delta events contain streamed content', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/ai/onboard')
      .send({ app_slug: 'n8n', live_url: 'https://barf-n8n-abc.barf.dev' });

    expect(res.text).toContain('"content":"Hello"');
    expect(res.text).toContain('"content":" world"');
  });

  it('works without live_url (site-widget mode uses buildSitePrompt)', async () => {
    const app = makeApp();
    await request(app)
      .post('/api/ai/onboard')
      .send({ app_slug: 'n8n', context: 'User is on the browse page' })
      .expect(200);
  });

  it('works with a message history', async () => {
    const app = makeApp();
    await request(app)
      .post('/api/ai/onboard')
      .send({
        app_slug: 'gitea',
        live_url: 'https://barf-gitea-abc.barf.dev',
        messages: [
          { role: 'user', content: 'How do I push code?' },
          { role: 'assistant', content: 'Use git push...' },
          { role: 'user', content: 'What about SSH keys?' },
        ],
      })
      .expect(200);
  });
});

describe('onboarding guides coverage', () => {
  const appsWithGuides = [
    'n8n', 'activepieces', 'umami', 'formbricks', 'twenty', 'corteza',
    'gitea', 'listmonk', 'keycloak', 'nextcloud', 'vaultwarden',
  ];

  it('each guided app has required guide fields', () => {
    const { getOnboardingGuide } = require('../src/services/onboardingGuides');
    for (const slug of appsWithGuides) {
      const guide = getOnboardingGuide(slug);
      expect(guide).not.toBeNull();
      expect(guide.appName.length).toBeGreaterThan(0);
      expect(guide.firstSteps.length).toBeGreaterThan(0);
      expect(guide.tips.length).toBeGreaterThan(0);
    }
  });

  it('apps with default credentials document them', () => {
    const { getOnboardingGuide } = require('../src/services/onboardingGuides');
    const umami = getOnboardingGuide('umami');
    expect(umami.defaultCredentials).toContain('admin');
    expect(umami.defaultCredentials).toContain('umami');

    const listmonk = getOnboardingGuide('listmonk');
    expect(listmonk.defaultCredentials).toContain('admin');
    expect(listmonk.defaultCredentials).toContain('listmonk');
  });

  it('unknown app slugs return null', () => {
    const { getOnboardingGuide } = require('../src/services/onboardingGuides');
    expect(getOnboardingGuide('unknown-app')).toBeNull();
    expect(getOnboardingGuide('')).toBeNull();
  });

  it('apps with no default credentials return null (user creates account on first visit)', () => {
    const { getOnboardingGuide } = require('../src/services/onboardingGuides');
    // n8n, gitea, vaultwarden — no pre-set creds, user creates them
    expect(getOnboardingGuide('n8n').defaultCredentials).toBeNull();
    expect(getOnboardingGuide('gitea').defaultCredentials).toBeNull();
    expect(getOnboardingGuide('vaultwarden').defaultCredentials).toBeNull();
  });
});
