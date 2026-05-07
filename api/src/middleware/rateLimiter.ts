import rateLimit, { Options } from 'express-rate-limit';

const base: Partial<Options> = { standardHeaders: true, legacyHeaders: false };

// General browsing: apps list, categories, app detail
export const browseLimit = rateLimit({
  ...base,
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Too many requests, please slow down.' },
});

// Deploy status polling (GET /api/deploy/:id)
export const pollLimit = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests, please slow down.' },
});

// Deploy creation (POST /api/deploy) — expensive
export const deployLimit = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { error: 'Deploy limit reached. You can deploy 5 apps per hour.' },
});

// AI-heavy routes (extract, build)
export const aiLimit = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'AI usage limit reached. Try again in an hour.' },
});

// Onboarding chat — generous limit suitable for multi-turn conversations
export const chatLimit = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  message: { error: 'Chat limit reached (60 messages/hr). Try again in an hour.' },
});
