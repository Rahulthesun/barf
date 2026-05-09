import { interpolateEnv } from '../src/services/azureContainerService';

describe('interpolateEnv', () => {
  it('replaces a single placeholder', () => {
    const result = interpolateEnv(
      { DB_URL: 'postgres://user:{{POSTGRES_PASSWORD}}@localhost/mydb' },
      { POSTGRES_PASSWORD: 'secret123' },
    );
    expect(result['DB_URL']).toBe('postgres://user:secret123@localhost/mydb');
  });

  it('replaces multiple placeholders in one value', () => {
    const result = interpolateEnv(
      { DB_URL: 'postgresql://{{POSTGRES_USER}}:{{POSTGRES_PASSWORD}}@localhost/{{POSTGRES_DB}}' },
      { POSTGRES_USER: 'barf', POSTGRES_PASSWORD: 'pass', POSTGRES_DB: 'myapp' },
    );
    expect(result['DB_URL']).toBe('postgresql://barf:pass@localhost/myapp');
  });

  it('replaces placeholders across multiple keys', () => {
    const result = interpolateEnv(
      {
        KEY_A: '{{SECRET_KEY}}',
        KEY_B: '{{SECRET_KEY}}',
      },
      { SECRET_KEY: 'abc' },
    );
    expect(result['KEY_A']).toBe('abc');
    expect(result['KEY_B']).toBe('abc');
  });

  it('leaves values unchanged when no placeholders match', () => {
    const result = interpolateEnv(
      { FOO: 'bar', BAZ: 'qux' },
      { SECRET_KEY: 'secret' },
    );
    expect(result['FOO']).toBe('bar');
    expect(result['BAZ']).toBe('qux');
  });

  it('leaves unknown placeholders in place', () => {
    const result = interpolateEnv(
      { FOO: '{{UNKNOWN_PLACEHOLDER}}' },
      { SECRET_KEY: 'secret' },
    );
    expect(result['FOO']).toBe('{{UNKNOWN_PLACEHOLDER}}');
  });

  it('handles empty deploy_env', () => {
    const result = interpolateEnv({}, { SECRET_KEY: 'x' });
    expect(result).toEqual({});
  });

  it('handles empty vars map', () => {
    const result = interpolateEnv({ FOO: '{{BAR}}' }, {});
    expect(result['FOO']).toBe('{{BAR}}');
  });

  it('handles repeated same placeholder in one value', () => {
    const result = interpolateEnv(
      { MSG: '{{KEY}}-{{KEY}}' },
      { KEY: 'val' },
    );
    expect(result['MSG']).toBe('val-val');
  });

  it('does not mutate the original deployEnv', () => {
    const original = { DB: '{{SECRET_KEY}}' };
    interpolateEnv(original, { SECRET_KEY: 'replaced' });
    expect(original['DB']).toBe('{{SECRET_KEY}}');
  });

  it('resolves APP_URL and APP_HOSTNAME as distinct values', () => {
    const result = interpolateEnv(
      {
        ROOT_URL: '{{APP_URL}}',
        DOMAIN:   '{{APP_HOSTNAME}}',
      },
      {
        APP_URL:      'https://barf-gitea-abc.barf.dev',
        APP_HOSTNAME: 'barf-gitea-abc.barf.dev',
      },
    );
    expect(result['ROOT_URL']).toBe('https://barf-gitea-abc.barf.dev');
    expect(result['DOMAIN']).toBe('barf-gitea-abc.barf.dev');
  });

  it('gitea DOMAIN does not contain https:// scheme after interpolation', () => {
    const gitea_env = {
      'GITEA__server__ROOT_URL':  '{{APP_URL}}',
      'GITEA__server__DOMAIN':    '{{APP_HOSTNAME}}',
      'GITEA__server__HTTP_PORT': '3000',
    };
    const vars = {
      APP_URL:      'https://barf-gitea-abc123.barf.dev',
      APP_HOSTNAME: 'barf-gitea-abc123.barf.dev',
    };
    const result = interpolateEnv(gitea_env, vars);
    expect(result['GITEA__server__DOMAIN']).toBe('barf-gitea-abc123.barf.dev');
    expect(result['GITEA__server__DOMAIN']).not.toContain('https://');
    expect(result['GITEA__server__ROOT_URL']).toBe('https://barf-gitea-abc123.barf.dev');
  });

  it('nextcloud TRUSTED_DOMAINS does not contain https:// scheme after interpolation', () => {
    const nc_env = { 'NEXTCLOUD_TRUSTED_DOMAINS': '{{APP_HOSTNAME}}' };
    const vars = {
      APP_URL:      'https://barf-nextcloud-abc123.barf.dev',
      APP_HOSTNAME: 'barf-nextcloud-abc123.barf.dev',
    };
    const result = interpolateEnv(nc_env, vars);
    expect(result['NEXTCLOUD_TRUSTED_DOMAINS']).toBe('barf-nextcloud-abc123.barf.dev');
    expect(result['NEXTCLOUD_TRUSTED_DOMAINS']).not.toContain('https://');
  });
});
