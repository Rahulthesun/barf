import rateLimit, { Options } from 'express-rate-limit';

const base: Partial<Options> = { standardHeaders: true, legacyHeaders: false };

// Exported for unit tests — the actual config values
export const RATE_LIMIT_CONFIG = {
  browse:  { windowMs: 60 * 1000,        max: 120 },
  poll:    { windowMs: 60 * 1000,        max: 60  },
  deploy:  { windowMs: 60 * 60 * 1000,  max: 5   },
  ai:      { windowMs: 60 * 60 * 1000,  max: 10  },
  chat:    { windowMs: 60 * 60 * 1000,  max: 60  },
} as const;

// General browsing: apps list, categories, app detail
export const browseLimit = rateLimit({
  ...base,
  ...RATE_LIMIT_CONFIG.browse,
  message: { error: 'Too many requests, please slow down.' },
});

// Deploy status polling (GET /api/deploy/:id)
export const pollLimit = rateLimit({
  ...base,
  ...RATE_LIMIT_CONFIG.poll,
  message: { error: 'Too many requests, please slow down.' },
});

// Deploy creation (POST /api/deploy) — expensive
export const deployLimit = rateLimit({
  ...base,
  ...RATE_LIMIT_CONFIG.deploy,
  message: { error: 'Deploy limit reached. You can deploy 5 apps per hour.' },
});

// AI-heavy routes (extract, build)
export const aiLimit = rateLimit({
  ...base,
  ...RATE_LIMIT_CONFIG.ai,
  message: { error: 'AI usage limit reached. Try again in an hour.' },
});

// Onboarding chat — generous limit suitable for multi-turn conversations
export const chatLimit = rateLimit({
  ...base,
  ...RATE_LIMIT_CONFIG.chat,
  message: { error: 'Chat limit reached (60 messages/hr). Try again in an hour.' },
});
