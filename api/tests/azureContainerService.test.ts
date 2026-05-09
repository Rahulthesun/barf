import { missingAzureConfig } from '../src/services/azureContainerService';

const REQUIRED_VARS = [
  'AZURE_SUBSCRIPTION_ID',
  'AZURE_TENANT_ID',
  'AZURE_CLIENT_ID',
  'AZURE_CLIENT_SECRET',
  'AZURE_RESOURCE_GROUP',
];

// Capture and restore env around each test
let savedEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  savedEnv = { ...process.env };
  // Clear all required Azure vars
  for (const v of REQUIRED_VARS) delete process.env[v];
});

afterEach(() => {
  // Restore original env
  for (const v of REQUIRED_VARS) delete process.env[v];
  Object.assign(process.env, savedEnv);
});

describe('missingAzureConfig', () => {
  it('returns null when all required env vars are set', () => {
    for (const v of REQUIRED_VARS) process.env[v] = 'test-value';
    expect(missingAzureConfig()).toBeNull();
  });

  it('returns an error string when all vars are missing', () => {
    const result = missingAzureConfig();
    expect(typeof result).toBe('string');
    expect(result!.length).toBeGreaterThan(0);
  });

  it('mentions which vars are missing', () => {
    const result = missingAzureConfig();
    expect(result).toContain('AZURE_SUBSCRIPTION_ID');
  });

  it('returns null with only the five required vars (AZURE_REGION is optional)', () => {
    for (const v of REQUIRED_VARS) process.env[v] = 'x';
    delete process.env['AZURE_REGION']; // optional
    expect(missingAzureConfig()).toBeNull();
  });

  it('returns error when exactly one var is missing', () => {
    for (const v of REQUIRED_VARS) process.env[v] = 'x';
    delete process.env['AZURE_CLIENT_SECRET'];
    const result = missingAzureConfig();
    expect(result).not.toBeNull();
    expect(result).toContain('AZURE_CLIENT_SECRET');
    expect(result).not.toContain('AZURE_SUBSCRIPTION_ID'); // others are present
  });

  it('lists all missing vars when multiple are absent', () => {
    process.env['AZURE_SUBSCRIPTION_ID'] = 'x'; // only this one set
    const result = missingAzureConfig();
    expect(result).not.toBeNull();
    for (const v of REQUIRED_VARS.slice(1)) {
      expect(result).toContain(v);
    }
  });
});
