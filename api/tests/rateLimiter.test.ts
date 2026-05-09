import { browseLimit, pollLimit, deployLimit, aiLimit, chatLimit, RATE_LIMIT_CONFIG } from '../src/middleware/rateLimiter';

describe('rateLimiter middleware exports', () => {
  it('all limiters are defined', () => {
    expect(browseLimit).toBeDefined();
    expect(pollLimit).toBeDefined();
    expect(deployLimit).toBeDefined();
    expect(aiLimit).toBeDefined();
    expect(chatLimit).toBeDefined();
  });

  it('all limiters are Express middleware functions (3-arg signature)', () => {
    expect(typeof browseLimit).toBe('function');
    expect(typeof pollLimit).toBe('function');
    expect(typeof deployLimit).toBe('function');
    expect(typeof aiLimit).toBe('function');
    expect(typeof chatLimit).toBe('function');
  });

  it('RATE_LIMIT_CONFIG is exported with all keys', () => {
    expect(RATE_LIMIT_CONFIG).toHaveProperty('browse');
    expect(RATE_LIMIT_CONFIG).toHaveProperty('poll');
    expect(RATE_LIMIT_CONFIG).toHaveProperty('deploy');
    expect(RATE_LIMIT_CONFIG).toHaveProperty('ai');
    expect(RATE_LIMIT_CONFIG).toHaveProperty('chat');
  });
});

describe('rate limiter configuration values', () => {
  it('browseLimit — 120 requests per minute', () => {
    expect(RATE_LIMIT_CONFIG.browse.windowMs).toBe(60 * 1000);
    expect(RATE_LIMIT_CONFIG.browse.max).toBe(120);
  });

  it('pollLimit — 60 requests per minute', () => {
    expect(RATE_LIMIT_CONFIG.poll.windowMs).toBe(60 * 1000);
    expect(RATE_LIMIT_CONFIG.poll.max).toBe(60);
  });

  it('deployLimit — 5 requests per hour (expensive operation)', () => {
    expect(RATE_LIMIT_CONFIG.deploy.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMIT_CONFIG.deploy.max).toBe(5);
  });

  it('aiLimit — 10 requests per hour', () => {
    expect(RATE_LIMIT_CONFIG.ai.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMIT_CONFIG.ai.max).toBe(10);
  });

  it('chatLimit — 60 messages per hour', () => {
    expect(RATE_LIMIT_CONFIG.chat.windowMs).toBe(60 * 60 * 1000);
    expect(RATE_LIMIT_CONFIG.chat.max).toBe(60);
  });

  it('deploy limit is stricter than browse limit (lower max, longer window)', () => {
    expect(RATE_LIMIT_CONFIG.deploy.windowMs).toBeGreaterThan(RATE_LIMIT_CONFIG.browse.windowMs);
    expect(RATE_LIMIT_CONFIG.deploy.max).toBeLessThan(RATE_LIMIT_CONFIG.browse.max);
  });

  it('chat window matches deploy and ai windows (all 1 hour)', () => {
    expect(RATE_LIMIT_CONFIG.chat.windowMs).toBe(RATE_LIMIT_CONFIG.deploy.windowMs);
    expect(RATE_LIMIT_CONFIG.chat.windowMs).toBe(RATE_LIMIT_CONFIG.ai.windowMs);
  });

  it('chat limit is more generous than deploy limit', () => {
    expect(RATE_LIMIT_CONFIG.chat.max).toBeGreaterThan(RATE_LIMIT_CONFIG.deploy.max);
  });
});
