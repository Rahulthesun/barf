import { DEPLOY_CONFIGS, getDeployConfig, DeployConfig } from '../src/services/deployConfigs';

const VALID_TOKENS = new Set([
  'POSTGRES_PASSWORD', 'POSTGRES_USER', 'POSTGRES_DB', 'POSTGRES_HOST',
  'POSTGRES_PORT', 'POSTGRES_URL', 'SECRET_KEY', 'SECRET_KEY_2',
  'SECRET_KEY_HEX16', 'SECRET_KEY_SHORT', 'APP_URL', 'APP_HOSTNAME',
]);

const PLACEHOLDER_RE = /\{\{([A-Z_0-9]+)\}\}/g;

describe('getDeployConfig', () => {
  it('returns a config for known apps', () => {
    expect(getDeployConfig('n8n')).not.toBeNull();
    expect(getDeployConfig('umami')).not.toBeNull();
    expect(getDeployConfig('gitea')).not.toBeNull();
    expect(getDeployConfig('vaultwarden')).not.toBeNull();
    expect(getDeployConfig('nextcloud')).not.toBeNull();
  });

  it('returns null for unknown slugs', () => {
    expect(getDeployConfig('unknown-app-xyz')).toBeNull();
    expect(getDeployConfig('')).toBeNull();
    expect(getDeployConfig('GITEA')).toBeNull(); // case-sensitive
  });

  it('returns the correct config for n8n', () => {
    const cfg = getDeployConfig('n8n')!;
    expect(cfg.docker_image).toBe('n8nio/n8n:latest');
    expect(cfg.default_port).toBe(5678);
    expect(cfg.requires_postgres).toBe(false);
    expect(cfg.deployable).toBe(true);
    expect(cfg.health_check_path).toBe('/healthz');
  });
});

describe('DEPLOY_CONFIGS — structural integrity', () => {
  const entries = Object.entries(DEPLOY_CONFIGS) as [string, DeployConfig][];

  it('every config has a docker_image and default_port', () => {
    for (const [slug, cfg] of entries) {
      expect(typeof cfg.docker_image).toBe('string');
      expect(cfg.docker_image.length).toBeGreaterThan(0);
      expect(typeof cfg.default_port).toBe('number');
      expect(cfg.default_port).toBeGreaterThan(0);
      // Port 80 is reserved for the nginx proxy sidecar
      expect(cfg.default_port).not.toBe(80);
    }
  });

  it('every non-deployable config has a deployable_note', () => {
    for (const [slug, cfg] of entries) {
      if (!cfg.deployable) {
        expect(cfg.deployable_note).toBeTruthy();
      }
    }
  });

  it('every {{PLACEHOLDER}} token in deploy_env is a known interpolation variable', () => {
    for (const [slug, cfg] of entries) {
      for (const value of Object.values(cfg.deploy_env)) {
        let m: RegExpExecArray | null;
        while ((m = PLACEHOLDER_RE.exec(value)) !== null) {
          const token = m[1];
          expect(VALID_TOKENS).toContain(token);
        }
        // Reset regex state for next iteration
        PLACEHOLDER_RE.lastIndex = 0;
      }
    }
  });

  it('deployable configs have a docker image with a tag', () => {
    for (const [slug, cfg] of entries) {
      if (cfg.deployable) {
        expect(cfg.docker_image).toMatch(/:/);
      }
    }
  });
});

describe('per-app deploy config correctness', () => {
  it('gitea — DOMAIN uses APP_HOSTNAME (not APP_URL)', () => {
    const cfg = getDeployConfig('gitea')!;
    // DOMAIN must be bare hostname, not a URL with scheme
    expect(cfg.deploy_env['GITEA__server__DOMAIN']).toBe('{{APP_HOSTNAME}}');
    // ROOT_URL should still be the full URL
    expect(cfg.deploy_env['GITEA__server__ROOT_URL']).toBe('{{APP_URL}}');
  });

  it('nextcloud — TRUSTED_DOMAINS uses APP_HOSTNAME (not APP_URL)', () => {
    const cfg = getDeployConfig('nextcloud')!;
    expect(cfg.deploy_env['NEXTCLOUD_TRUSTED_DOMAINS']).toBe('{{APP_HOSTNAME}}');
  });

  it('n8n — editor base URL and webhook URL are set', () => {
    const cfg = getDeployConfig('n8n')!;
    expect(cfg.deploy_env['N8N_EDITOR_BASE_URL']).toBe('{{APP_URL}}');
    expect(cfg.deploy_env['WEBHOOK_URL']).toBe('{{APP_URL}}/');
  });

  it('vaultwarden — DOMAIN is the full URL (intentional — Bitwarden clients use it)', () => {
    // Vaultwarden uses DOMAIN as the server URL that Bitwarden clients connect to,
    // so it needs the full URL with scheme.
    const cfg = getDeployConfig('vaultwarden')!;
    expect(cfg.deploy_env['DOMAIN']).toBe('{{APP_URL}}');
  });

  it('umami — requires postgres', () => {
    const cfg = getDeployConfig('umami')!;
    expect(cfg.requires_postgres).toBe(true);
    expect(cfg.deploy_env['DATABASE_URL']).toContain('{{POSTGRES_PASSWORD}}');
  });

  it('listmonk — has deploy_command for --install --idempotent', () => {
    const cfg = getDeployConfig('listmonk')!;
    expect(cfg.deploy_command).toBeDefined();
    const cmdStr = cfg.deploy_command!.join(' ');
    expect(cmdStr).toContain('--install');
    expect(cmdStr).toContain('--idempotent');
  });

  it('keycloak — uses start-dev command', () => {
    const cfg = getDeployConfig('keycloak')!;
    expect(cfg.deploy_command).toContain('start-dev');
  });

  it('activepieces — uses AP_QUEUE_MODE=memory to avoid Redis dependency', () => {
    const cfg = getDeployConfig('activepieces')!;
    expect(cfg.deploy_env['AP_QUEUE_MODE']).toBe('memory');
  });

  it('twenty — has all required JWT secrets', () => {
    const cfg = getDeployConfig('twenty')!;
    expect(cfg.deploy_env['SECRET_KEY']).toBeDefined();
    expect(cfg.deploy_env['ACCESS_TOKEN_SECRET']).toBeDefined();
    expect(cfg.deploy_env['REFRESH_TOKEN_SECRET']).toBeDefined();
    expect(cfg.deploy_env['LOGIN_TOKEN_SECRET']).toBeDefined();
  });

  it('formbricks — not deployable (Prisma binary issue)', () => {
    const cfg = getDeployConfig('formbricks')!;
    expect(cfg.deployable).toBe(false);
    expect(cfg.deployable_note).toMatch(/Prisma/i);
  });

  it('non-deployable apps are marked not deployable', () => {
    const notDeployable = ['plausible', 'rocketchat', 'mautic', 'heyform', 'plane', 'appflowy', 'uptime-kuma', 'formbricks'];
    for (const slug of notDeployable) {
      expect(getDeployConfig(slug)?.deployable).toBe(false);
    }
  });

  it('deployable apps have a docs_urls array or the field is undefined', () => {
    const deployable = ['n8n', 'activepieces', 'umami', 'twenty', 'corteza', 'gitea', 'listmonk', 'keycloak', 'nextcloud', 'vaultwarden'];
    for (const slug of deployable) {
      const cfg = getDeployConfig(slug)!;
      if (cfg.docs_urls !== undefined) {
        expect(Array.isArray(cfg.docs_urls)).toBe(true);
        expect(cfg.docs_urls!.length).toBeGreaterThan(0);
      }
    }
  });
});
