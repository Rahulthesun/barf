/**
 * Deploy controller HTTP-layer tests.
 * All external services (Supabase, Azure) are mocked — this tests request
 * parsing, validation, and HTTP status codes, not the cloud layer.
 */

import express from 'express';
import request from 'supertest';

// ── Mocks (must be declared before any imports that use them) ─────────────────

jest.mock('../src/middleware/requireAuth', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user-id' };
    next();
  },
}));

// Rate limiters share in-memory state across requests; bypass them in unit tests
// so deploy logic tests don't get 429 from accumulated requests.
const mockPassthrough = (_req: any, _res: any, next: any) => next();
jest.mock('../src/middleware/rateLimiter', () => ({
  browseLimit: (_req: any, _res: any, next: any) => next(),
  pollLimit:   (_req: any, _res: any, next: any) => next(),
  deployLimit: (_req: any, _res: any, next: any) => next(),
  aiLimit:     (_req: any, _res: any, next: any) => next(),
  chatLimit:   (_req: any, _res: any, next: any) => next(),
  RATE_LIMIT_CONFIG: {},
}));

jest.mock('../src/services/azureContainerService', () => ({
  runDeployment:      jest.fn().mockResolvedValue(undefined),
  stopContainer:      jest.fn().mockResolvedValue(undefined),
  startContainer:     jest.fn().mockResolvedValue(undefined),
  tearDownDeployment: jest.fn().mockResolvedValue(undefined),
  missingAzureConfig: jest.fn().mockReturnValue(null), // Azure config present by default
}));

// ── Supabase fluent query builder mock ────────────────────────────────────────
// Jest requires mock factory variables to start with "mock" (case-insensitive).
type MockResult = { data: unknown; error: unknown };

function makeQueryBuilder(result: MockResult) {
  const builder: any = {};
  const chain = () => builder;
  builder.select  = chain;
  builder.eq      = chain;
  builder.neq     = chain;
  builder.not     = chain;
  builder.or      = chain;
  builder.lt      = chain;
  builder.ilike   = chain;
  builder.order   = chain;
  builder.limit   = chain;
  builder.insert  = chain;
  builder.update  = chain;
  builder.upsert  = chain;
  builder.delete  = chain;
  builder.single       = () => Promise.resolve(result);
  builder.maybeSingle  = () => Promise.resolve(result);
  return builder;
}

// Must start with "mock" for Jest's hoisting rules
let mockSupabaseFrom: jest.Mock = jest.fn(() => makeQueryBuilder({ data: null, error: null }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: (table: string) => mockSupabaseFrom(table),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    },
  })),
}));

// ── App setup ────────────────────────────────────────────────────────────────
import deployRoutes from '../src/routes/deployRoutes';

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/deploy', deployRoutes);
  return app;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const { missingAzureConfig } = require('../src/services/azureContainerService');

const mockN8nApp = {
  id: 'app-uuid-123',
  name: 'n8n',
  slug: 'n8n',
  docker_image: 'n8nio/n8n:latest',
  default_port: 5678,
  deploy_env: {},
  deploy_command: null,
  requires_postgres: false,
};

function mockAppNotFound() {
  mockSupabaseFrom = jest.fn(() => makeQueryBuilder({ data: null, error: null }));
}

function mockNoExistingDeployment() {
  let callCount = 0;
  mockSupabaseFrom = jest.fn(() => {
    callCount++;
    if (callCount === 1) return makeQueryBuilder({ data: mockN8nApp, error: null });  // app lookup
    if (callCount === 2) return makeQueryBuilder({ data: null, error: null });         // no existing dep
    // insert returns new deployment
    return makeQueryBuilder({ data: { id: 'new-dep-id', status: 'queued', created_at: new Date().toISOString() }, error: null });
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/deploy — input validation', () => {
  beforeEach(() => {
    mockSupabaseFrom = jest.fn(() => makeQueryBuilder({ data: null, error: null }));
  });

  it('returns 400 when app_slug is missing', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/deploy')
      .send({})
      .expect(400);

    expect(res.body.error).toMatch(/missing app_slug/i);
  });

  it('returns 400 when body has unrelated fields but no app_slug', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/api/deploy')
      .send({ unrelated: 'value' })
      .expect(400);

    expect(res.body.error).toMatch(/missing app_slug/i);
  });
});

describe('POST /api/deploy — Azure config check', () => {
  beforeEach(() => {
    mockSupabaseFrom = jest.fn(() => makeQueryBuilder({ data: null, error: null }));
  });

  it('returns 503 when Azure config is missing', async () => {
    (missingAzureConfig as jest.Mock).mockReturnValueOnce('Missing env vars: AZURE_SUBSCRIPTION_ID');
    const app = makeApp();

    const res = await request(app)
      .post('/api/deploy')
      .send({ app_slug: 'n8n' })
      .expect(503);

    expect(res.body.error).toContain('Missing env vars');
  });
});

describe('POST /api/deploy — app lookup', () => {
  beforeEach(() => {
    (missingAzureConfig as jest.Mock).mockReturnValue(null);
  });

  it('returns 404 when app is not found in DB', async () => {
    mockAppNotFound();
    const app = makeApp();

    const res = await request(app)
      .post('/api/deploy')
      .send({ app_slug: 'does-not-exist' })
      .expect(404);

    expect(res.body.error).toMatch(/app not found/i);
  });

  it('returns 400 for a non-deployable app (formbricks)', async () => {
    mockSupabaseFrom = jest.fn(() =>
      makeQueryBuilder({
        data: {
          id: 'app-forms-id',
          name: 'Formbricks',
          slug: 'formbricks',
          docker_image: 'formbricks/formbricks:latest',
          default_port: 3000,
          deploy_env: {},
          deploy_command: null,
          requires_postgres: true,
        },
        error: null,
      }),
    );

    const app = makeApp();
    const res = await request(app)
      .post('/api/deploy')
      .send({ app_slug: 'formbricks' })
      .expect(400);

    expect(res.body.error).toMatch(/Prisma/i);
  });
});

describe('POST /api/deploy — duplicate deployment guard', () => {
  beforeEach(() => {
    (missingAzureConfig as jest.Mock).mockReturnValue(null);
  });

  it('returns 409 when an active deployment already exists for this app', async () => {
    let callCount = 0;
    mockSupabaseFrom = jest.fn(() => {
      callCount++;
      if (callCount === 1) return makeQueryBuilder({ data: mockN8nApp, error: null });
      return makeQueryBuilder({ data: { id: 'existing-dep', status: 'live' }, error: null });
    });

    const app = makeApp();
    const res = await request(app)
      .post('/api/deploy')
      .send({ app_slug: 'n8n' })
      .expect(409);

    expect(res.body.error).toMatch(/already have a n8n deployment/i);
    expect(res.body.existing_id).toBe('existing-dep');
    expect(res.body.existing_status).toBe('live');
  });
});

describe('POST /api/deploy — successful dispatch', () => {
  beforeEach(() => {
    (missingAzureConfig as jest.Mock).mockReturnValue(null);
  });

  it('returns 202 and queued status when deployment is accepted', async () => {
    mockNoExistingDeployment();
    const app = makeApp();

    const res = await request(app)
      .post('/api/deploy')
      .send({ app_slug: 'n8n' })
      .expect(202);

    expect(res.body.id).toBe('new-dep-id');
    expect(res.body.status).toBe('queued');
    expect(res.body.message).toMatch(/n8n/i);
  });
});

describe('GET /api/deploy/:id — deployment status', () => {
  it('returns 404 for a non-existent deployment', async () => {
    mockSupabaseFrom = jest.fn(() => makeQueryBuilder({ data: null, error: null }));
    const app = makeApp();

    await request(app)
      .get('/api/deploy/nonexistent-id')
      .expect(404);
  });

  it('returns deployment data for an existing deployment', async () => {
    const dep = {
      id: 'dep-abc',
      app_slug: 'n8n',
      status: 'live',
      live_url: 'https://barf-n8n-abc.barf.dev',
      azure_app_name: 'barf-n8n-abc123',
      live_since: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockSupabaseFrom = jest.fn(() => makeQueryBuilder({ data: dep, error: null }));
    const app = makeApp();

    const res = await request(app)
      .get('/api/deploy/dep-abc')
      .expect(200);

    expect(res.body.id).toBe('dep-abc');
    expect(res.body.status).toBe('live');
  });
});
