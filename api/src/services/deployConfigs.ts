// Curated, tested deployment configs per OSS app.
// These OVERRIDE DB values — source of truth for what works on ACI.
// Rule: never use port 80 for the app (Caddy owns port 80).

export interface DeployConfig {
  docker_image:       string;
  default_port:       number;
  requires_postgres:  boolean;
  deploy_env:         Record<string, string>;
  deploy_command?:    string[];
  deployable:         boolean;
  deployable_note?:   string;
  // Override default container resources (cpu: 1, memoryInGB: 1.5)
  resources?: { cpu: number; memoryInGB: number };
}

export const DEPLOY_CONFIGS: Record<string, DeployConfig> = {

  // ── Automation ───────────────────────────────────────────────────────────────

  'n8n': {
    docker_image:      'n8nio/n8n:latest',
    default_port:      5678,
    requires_postgres: false,
    deploy_env: {
      N8N_SECURE_COOKIE:      'false',
      N8N_ENCRYPTION_KEY:     '{{SECRET_KEY}}',
      N8N_PROXY_HOPS:         '1',
      N8N_EDITOR_BASE_URL:    '{{APP_URL}}',
      WEBHOOK_URL:             '{{APP_URL}}/',
    },
    deployable: true,
  },

  'activepieces': {
    docker_image:      'activepieces/activepieces:latest',
    default_port:      8000,
    requires_postgres: true,
    deploy_env: {
      AP_QUEUE_MODE:       'memory', // eliminates Redis dependency
      AP_DB_TYPE:          'postgres',
      AP_POSTGRES_HOST:    'localhost',
      AP_POSTGRES_PORT:    '5432',
      AP_POSTGRES_USERNAME:'barf',
      AP_POSTGRES_PASSWORD:'{{POSTGRES_PASSWORD}}',
      AP_POSTGRES_DATABASE:'{{POSTGRES_DB}}',
      AP_JWT_SECRET:       '{{SECRET_KEY}}',
      AP_ENCRYPTION_KEY:   '{{SECRET_KEY_HEX16}}',
      AP_FRONTEND_URL:     '{{APP_URL}}',
    },
    deployable: true,
  },

  // ── Analytics ────────────────────────────────────────────────────────────────

  'umami': {
    docker_image:      'ghcr.io/umami-software/umami:postgresql-latest',
    default_port:      3000,
    requires_postgres: true,
    deploy_env: {
      DATABASE_URL: 'postgresql://barf:{{POSTGRES_PASSWORD}}@localhost:5432/{{POSTGRES_DB}}',
      APP_SECRET:   '{{SECRET_KEY}}',
    },
    deployable: true,
  },

  'plausible': {
    docker_image:      'plausible/analytics:latest',
    default_port:      8000,
    requires_postgres: true,
    deploy_env: {},
    deployable:        false,
    deployable_note:   'Requires ClickHouse in addition to Postgres — not supported yet.',
  },

  // ── Chat ─────────────────────────────────────────────────────────────────────

  'rocketchat': {
    docker_image:      'rocketchat/rocket.chat:latest',
    default_port:      3000,
    requires_postgres: false,
    deploy_env: {},
    deployable:        false,
    deployable_note:   'Requires MongoDB — not supported as a sidecar yet.',
  },

  // ── CRM ──────────────────────────────────────────────────────────────────────

  'twenty': {
    docker_image:      'twentyhq/twenty:latest',
    default_port:      3000,
    requires_postgres: true,
    deploy_env: {
      DATABASE_URL:         'postgresql://barf:{{POSTGRES_PASSWORD}}@localhost:5432/{{POSTGRES_DB}}',
      SERVER_URL:           '{{APP_URL}}',
      STORAGE_TYPE:         'local',
      SECRET_KEY:           '{{SECRET_KEY}}',
      ACCESS_TOKEN_SECRET:  '{{SECRET_KEY}}',
      REFRESH_TOKEN_SECRET: '{{SECRET_KEY_2}}',
      LOGIN_TOKEN_SECRET:   '{{SECRET_KEY_2}}',
      FILE_TOKEN_SECRET:    '{{SECRET_KEY_2}}',
    },
    deployable: true,
  },

  'corteza': {
    docker_image:      'cortezaproject/corteza:latest',
    default_port:      18080,
    requires_postgres: true,
    deploy_env: {
      DATABASE_DSN:    'postgres://barf:{{POSTGRES_PASSWORD}}@localhost:5432/{{POSTGRES_DB}}?sslmode=disable',
      AUTH_JWT_SECRET: '{{SECRET_KEY}}',
      HTTP_ADDR:       ':18080',
    },
    deployable: true,
  },

  // ── DevOps ───────────────────────────────────────────────────────────────────

  'gitea': {
    docker_image:      'gitea/gitea:latest',
    default_port:      3000,
    requires_postgres: false,
    deploy_env: {
      GITEA__server__ROOT_URL:   '{{APP_URL}}',
      GITEA__server__HTTP_PORT:  '3000',
      GITEA__server__DOMAIN:     '{{APP_URL}}',
    },
    deployable: true,
  },

  // ── Email ────────────────────────────────────────────────────────────────────

  'listmonk': {
    docker_image:      'listmonk/listmonk:latest',
    default_port:      9000,
    requires_postgres: true,
    deploy_env: {
      LISTMONK_db__host:     'localhost',
      LISTMONK_db__port:     '5432',
      LISTMONK_db__user:     'barf',
      LISTMONK_db__password: '{{POSTGRES_PASSWORD}}',
      LISTMONK_db__database: '{{POSTGRES_DB}}',
    },
    deploy_command: ['sh', '-c', './listmonk --install --idempotent && ./listmonk'],
    deployable: true,
  },

  'mautic': {
    docker_image:      'mautic/mautic:latest',
    default_port:      8080,
    requires_postgres: false,
    deploy_env: {},
    deployable:        false,
    deployable_note:   'Requires MySQL — not supported as a sidecar yet.',
  },

  // ── Forms ────────────────────────────────────────────────────────────────────

  'formbricks': {
    docker_image:      'formbricks/formbricks:latest',
    default_port:      3000,
    requires_postgres: true,
    deploy_env: {
      DATABASE_URL:          'postgresql://barf:{{POSTGRES_PASSWORD}}@localhost:5432/{{POSTGRES_DB}}',
      NEXTAUTH_SECRET:       '{{SECRET_KEY}}',
      ENCRYPTION_KEY:        '{{SECRET_KEY_HEX16}}',
      NEXTAUTH_URL:          '{{APP_URL}}',
      NEXTAUTH_URL_INTERNAL: 'http://localhost:3000',
      WEBAPP_URL:            '{{APP_URL}}',
      CRON_SECRET:           '{{SECRET_KEY_2}}',
      NODE_OPTIONS:          '--max-old-space-size=1800',
    },
    resources:       { cpu: 2, memoryInGB: 2.5 },
    deployable:      false,
    deployable_note: 'Crashes on ACI due to Prisma binary incompatibility — under investigation.',
  },

  'heyform': {
    docker_image:      'heyform/heyform:latest',
    default_port:      3000,
    requires_postgres: false,
    deploy_env: {},
    deployable:        false,
    deployable_note:   'Requires MongoDB and Redis — not supported yet.',
  },

  // ── Auth ─────────────────────────────────────────────────────────────────────

  'keycloak': {
    docker_image:      'quay.io/keycloak/keycloak:latest',
    default_port:      8080,
    requires_postgres: false,
    deploy_env: {
      KEYCLOAK_ADMIN:          'admin',
      KEYCLOAK_ADMIN_PASSWORD: '{{SECRET_KEY_SHORT}}',
    },
    deploy_command: ['start-dev'],
    deployable: true,
  },

  // ── Project Management ───────────────────────────────────────────────────────

  'plane': {
    docker_image:      'makeplane/plane:latest',
    default_port:      3000,
    requires_postgres: false,
    deploy_env: {},
    deployable:        false,
    deployable_note:   'Multi-service app (Django + Next.js + Redis + Celery) — cannot run as a single container.',
  },

  'appflowy': {
    docker_image:      'appflowyio/appflowy_cloud:latest',
    default_port:      8000,
    requires_postgres: false,
    deploy_env: {},
    deployable:        false,
    deployable_note:   'Requires Redis and Minio in addition to Postgres.',
  },

  // ── Storage ──────────────────────────────────────────────────────────────────

  'nextcloud': {
    docker_image:      'nextcloud:apache',
    default_port:      8080,
    requires_postgres: true,
    deploy_env: {
      POSTGRES_HOST:             'localhost',
      POSTGRES_PORT:             '5432',
      POSTGRES_USER:             'barf',
      POSTGRES_PASSWORD:         '{{POSTGRES_PASSWORD}}',
      POSTGRES_DB:               '{{POSTGRES_DB}}',
      NEXTCLOUD_ADMIN_USER:      'admin',
      NEXTCLOUD_ADMIN_PASSWORD:  '{{SECRET_KEY_SHORT}}',
      NEXTCLOUD_TRUSTED_DOMAINS: '{{APP_URL}}',
      APACHE_HTTP_PORT_NUMBER:   '8080',
    },
    deployable: true,
  },

  // ── Security ─────────────────────────────────────────────────────────────────

  'vaultwarden': {
    docker_image:      'vaultwarden/server:latest',
    default_port:      8080,
    requires_postgres: false,
    deploy_env: {
      ROCKET_PORT:     '8080',
      SIGNUPS_ALLOWED: 'true',
      ADMIN_TOKEN:     '{{SECRET_KEY}}',
      DOMAIN:          '{{APP_URL}}',
    },
    deployable: true,
  },

  // ── Monitoring ───────────────────────────────────────────────────────────────

  'uptime-kuma': {
    docker_image:      'louislam/uptime-kuma:1.23.16',
    default_port:      3001,
    requires_postgres: false,
    deploy_env: {
      UPTIME_KUMA_HOST: '0.0.0.0',
      DATA_DIR:         '/tmp/uptime-kuma',
    },
    deployable:      false,
    deployable_note: 'Crashes silently on ACI — under investigation.',
  },

};

export function getDeployConfig(slug: string): DeployConfig | null {
  return DEPLOY_CONFIGS[slug] ?? null;
}
