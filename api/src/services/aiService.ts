/**
 * @file aiService.ts
 * @description Azure AI Foundry service layer for barf (buildafreeversion).
 *
 * This service manages all AI model interactions for the Phase 1 planning pipeline:
 *  - Feature extraction via Phi-4-mini-instruct
 *  - Cost & compute estimation for Phase 2 code generation
 *
 * Models used:
 *  - Phi-4-mini-instruct  → feature extraction, resource estimation (cheap, fast)
 *  - GPT-4.1-mini         → code generation in Phase 2 (called separately)
 *
 * Pricing reference (Azure pay-as-you-go):
 *  - Phi-4-mini:    $0.075 input / $0.30 output per 1M tokens
 *  - GPT-4.1-mini:  $1.25  input / $5.00 output per 1M tokens
 *  - GPT-4.1:       $5.00  input / $15.00 output per 1M tokens (backup)
 */

import { OpenAI } from 'openai';

/** Pricing constants (per 1M tokens, Azure pay-as-you-go) */
const PRICING = {
  phi4Mini: {
    input: 0.075,
    output: 0.30,
  },
  gpt41Mini: {
    input: 1.25,
    output: 5.00,
  },
  gpt41: {
    input: 5.00,
    output: 15.00,
  },
} as const;

/** Average tokens per generated file (based on Next.js full-stack components) */
const AVG_TOKENS_PER_FILE = 800;

/** Azure Container Apps estimated hosting cost per preview session (7 days) */
const HOSTING_COST_ESTIMATE = { min: 0.50, max: 1.00 };

// ─────────────────────────────────────────────
// Client singleton
// ─────────────────────────────────────────────

let aiClientInstance: OpenAI | null = null;

/**
 * Returns a singleton OpenAI-compatible client pointed at Azure AI Foundry.
 * Automatically converts Project Management URLs to standard Inference URLs.
 */
function getAiClient() {
  if (!aiClientInstance) {
    const rawEndpoint = process.env.AZURE_AI_ENDPOINT || 'https://dummy.services.ai.azure.com/v1';
    let baseURL = rawEndpoint;
    const deploymentName = process.env.AZURE_AI_MODEL_DEPLOYMENT_NAME || 'Phi-4-mini-instruct';

    // Auto-convert Project Management URLs to standard Inference URLs
    if (rawEndpoint.includes('.services.ai.azure.com')) {
      try {
        const url = new URL(rawEndpoint);
        const resourceName = url.host.split('.')[0];
        baseURL = `https://${resourceName}.openai.azure.com/openai/deployments/${deploymentName}`;
      } catch (e) {
        console.warn("[aiService] Could not parse AZURE_AI_ENDPOINT URL", e);
      }
    }

    aiClientInstance = new OpenAI({
      apiKey: process.env.AZURE_AI_API_KEY || 'dummy_key',
      baseURL: baseURL,
      defaultQuery: { 'api-version': '2024-02-15-preview' },
      defaultHeaders: {
        'api-key': process.env.AZURE_AI_API_KEY || ''
      }
    });
  }
  return aiClientInstance;
}

// ─────────────────────────────────────────────
// Existing function — DO NOT MODIFY
// ─────────────────────────────────────────────

/**
 * Phase 1 — Feature Extraction
 *
 * Sends scraped product data (G2, Reddit, product page) to Phi-4-mini-instruct
 * and extracts a structured JSON containing features, pricing tiers, and
 * resource estimates for the SaaS clone.
 *
 * @param productName  - Name of the SaaS tool being analysed (e.g. "Typeform")
 * @param scrapedData  - Raw scraped text from Firecrawl
 * @param onProgress   - Optional SSE callback for streaming progress to frontend
 * @returns Parsed JSON with features, pricingTiers, and resourceEstimates
 */
export async function extractFeaturesWithAI(productName: string, scrapedData: string, onProgress?: (msg: string) => void) {
  const prompt = `You are an expert SaaS product analyst and engineer.
Your task is to analyze the following scraped data for the product "${productName}" and extract its key features, pricing tiers, and estimate the technical resources needed to build a clone.
<scraped_data>
${scrapedData}
</scraped_data>
Please provide a clean, structured JSON output. The JSON must exactly match this structure:
{
  "features": ["feature 1", "feature 2"],
  "pricingTiers": [
    {
      "name": "tier name",
      "price": "$X/mo",
      "features": ["tier feature 1"]
    }
  ],
  "resourceEstimates": {
    "auth": "Type of authentication needed (e.g. JWT, OAuth)",
    "db": "Database requirements (e.g. Postgres for relational data)",
    "storage": "Storage needs (e.g. Blob storage for uploads)",
    "apiCalls": "Estimated external API needs"
  }
}
Return ONLY valid JSON without any markdown formatting like \`\`\`json.`;

  try {
    const msg = `Sending data to Azure AI Foundry (${productName})...`;
    console.log(`[aiService] ${msg}`);
    if (onProgress) onProgress(`🧠 Initializing Phi-4 model inference...`);
    if (onProgress) onProgress(`📊 Analyzing unstructured data...`);

    const response = await getAiClient().chat.completions.create({
      model: process.env.AZURE_AI_MODEL_DEPLOYMENT_NAME || 'phi-4',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that strictly outputs JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    const content = response.choices?.[0]?.message?.content || '{}';

    // Handle potential markdown code blocks returned by the model
    try {
      const jsonStr = content.replace(/```(?:json)?\n?|\n?```/gi, '').trim();
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn("[aiService] Failed to parse strict JSON, trying to find json block...");
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw e;
    }
  } catch (error) {
    console.error(`[aiService] Error during AI extraction:`, error);
    throw error;
  }
}

// ─────────────────────────────────────────────
// New function — Cost & Compute Estimation
// ─────────────────────────────────────────────

/**
 * Shape of the extracted feature/resource data from extractFeaturesWithAI()
 */
interface ExtractionResult {
  features: string[];
  pricingTiers: Array<{
    name: string;
    price: string;
    features: string[];
  }>;
  resourceEstimates: {
    auth: string;
    db: string;
    storage: string;
    apiCalls: string;
  };
}

/**
 * Full cost & compute estimation report returned to the frontend
 */
export interface CostEstimationReport {
  tool: string;

  /** What Phase 2 will actually build */
  compute: {
    hasAuth: boolean;
    hasStorage: boolean;
    hasEmail: boolean;
    hasPayments: boolean;
    hasRealtime: boolean;
    database: string;
    complexityScore: number;       // 1–10
    complexityLabel: 'Low' | 'Medium' | 'High';
    estimatedFiles: number;
    estimatedDbTables: number;
  };

  /** Token & dollar cost for Phase 2 code generation */
  generationCost: {
    model: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
    inputCostUSD: string;
    outputCostUSD: string;
    totalGenerationCostUSD: string;
    hostingCostUSD: string;
    totalCostUSD: string;
    withinBudget: boolean;
    budgetTargetUSD: string;
  };

  /** Plain-English value report shown to the user on the frontend */
  userReport: {
    currentToolMonthlyCost: string;
    currentToolYearlyCost: string;
    barfGenerationCost: string;
    breakevenDays: number;
    twoYearSaving: string;
    whatYouGet: string[];
    limitations: string[];
  };
}

/**
 * Phase 1 — Cost & Compute Estimation
 *
 * Takes the structured output from extractFeaturesWithAI() and the original
 * tool pricing data, then calculates:
 *  1. Compute requirements (auth, storage, DB tables, complexity score)
 *  2. Phase 2 generation cost in USD using GPT-4.1-mini pricing
 *  3. A plain-English user value report (savings, breakeven, limitations)
 *
 * This output is stored in PostgreSQL and displayed to the user before
 * they confirm generation in Phase 2.
 *
 * @param productName   - Name of the SaaS tool (e.g. "Typeform")
 * @param extraction    - Output from extractFeaturesWithAI()
 * @param monthlyPrice  - The tool's current monthly price in USD (e.g. 50)
 * @param onProgress    - Optional SSE callback for streaming progress to frontend
 * @returns CostEstimationReport
 */
export async function estimateCostAndCompute(
  productName: string,
  extraction: ExtractionResult,
  monthlyPrice: number,
  onProgress?: (msg: string) => void
): Promise<CostEstimationReport> {

  if (onProgress) onProgress(`⚙️ Estimating compute requirements for ${productName}...`);

  // ── Step 1: Derive compute requirements from resource estimates ──
  const resources = extraction.resourceEstimates;
  const features = extraction.features;

  const hasAuth     = /jwt|oauth|auth|login|session/i.test(resources.auth);
  const hasStorage  = /blob|s3|upload|file|storage/i.test(resources.storage);
  const hasEmail    = features.some(f => /email|notif|smtp/i.test(f));
  const hasPayments = features.some(f => /pay|stripe|billing|subscri/i.test(f));
  const hasRealtime = features.some(f => /realtime|websocket|live|collab/i.test(f));

  // Complexity scoring — each infra concern adds weight
  let complexityScore = 3; // base score for any Next.js app
  if (hasAuth)     complexityScore += 1.5;
  if (hasStorage)  complexityScore += 1.0;
  if (hasEmail)    complexityScore += 0.5;
  if (hasPayments) complexityScore += 1.5;
  if (hasRealtime) complexityScore += 2.0;
  if (features.length > 20) complexityScore += 0.5;
  complexityScore = Math.min(complexityScore, 10);

  const complexityLabel: 'Low' | 'Medium' | 'High' =
    complexityScore <= 4 ? 'Low' :
    complexityScore <= 7 ? 'Medium' : 'High';

  // File count estimation based on complexity
  const baseFiles = 18;
  const extraFiles = Math.round(complexityScore * 2.5);
  const estimatedFiles = baseFiles + extraFiles;

  // DB table estimation
  const estimatedDbTables = Math.round(3 + complexityScore * 0.8);

  if (onProgress) onProgress(`💰 Calculating generation cost...`);

  // ── Step 2: Token & cost estimation for Phase 2 ──
  const estimatedOutputTokens = estimatedFiles * AVG_TOKENS_PER_FILE;

  // Input tokens = system prompt + file tree + feature list (rough estimate)
  const estimatedInputTokens = Math.round(estimatedOutputTokens * 0.3);

  const inputCostUSD  = (estimatedInputTokens  / 1_000_000) * PRICING.gpt41Mini.input;
  const outputCostUSD = (estimatedOutputTokens / 1_000_000) * PRICING.gpt41Mini.output;
  const totalGenerationCostUSD = inputCostUSD + outputCostUSD;
  const totalCostUSD = totalGenerationCostUSD + HOSTING_COST_ESTIMATE.min;

  if (onProgress) onProgress(`📈 Building your savings report...`);

  // ── Step 3: User value report ──
  const yearlyPrice      = monthlyPrice * 12;
  const twoYearCost      = monthlyPrice * 24;
  const twoYearSaving    = twoYearCost - totalCostUSD;
  const breakevenDays    = Math.ceil((totalCostUSD / monthlyPrice) * 30);

  // Plain-English feature list (first 8 CORE features)
  const whatYouGet = features.slice(0, 8).map(f =>
    f.charAt(0).toUpperCase() + f.slice(1)
  );

  // Honest limitations based on what was detected
  const limitations: string[] = [];
  if (hasRealtime) limitations.push("Real-time collaboration may have latency on Vercel free tier");
  if (hasStorage)  limitations.push("File storage capped at Vercel's free tier limits (no CDN)");
  limitations.push("No 99.9% uptime SLA — you are self-hosting");
  limitations.push("Enterprise SSO and advanced team permissions not included in MVP scope");

  if (onProgress) onProgress(`✅ Planning complete. Ready for your review.`);

  // ── Step 4: Assemble and return report ──
  return {
    tool: productName,

    compute: {
      hasAuth,
      hasStorage,
      hasEmail,
      hasPayments,
      hasRealtime,
      database: 'postgresql',
      complexityScore: parseFloat(complexityScore.toFixed(1)),
      complexityLabel,
      estimatedFiles,
      estimatedDbTables,
    },

    generationCost: {
      model: 'gpt-4.1-mini',
      estimatedInputTokens,
      estimatedOutputTokens,
      inputCostUSD:            `$${inputCostUSD.toFixed(4)}`,
      outputCostUSD:           `$${outputCostUSD.toFixed(4)}`,
      totalGenerationCostUSD:  `$${totalGenerationCostUSD.toFixed(4)}`,
      hostingCostUSD:          `$${HOSTING_COST_ESTIMATE.min}–${HOSTING_COST_ESTIMATE.max}`,
      totalCostUSD:            `$${totalCostUSD.toFixed(2)}`,
      withinBudget:            totalCostUSD <= 8,
      budgetTargetUSD:         '$3–8',
    },

    userReport: {
      currentToolMonthlyCost: `$${monthlyPrice}/mo`,
      currentToolYearlyCost:  `$${yearlyPrice}/yr`,
      barfGenerationCost:     `$${totalCostUSD.toFixed(2)}`,
      breakevenDays,
      twoYearSaving:          `$${twoYearSaving.toFixed(0)}`,
      whatYouGet,
      limitations,
    },
  };
}