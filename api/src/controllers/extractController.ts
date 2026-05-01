import { Request, Response } from 'express';
import { scrapeProductData } from '../services/scraperService';
import { extractFeaturesWithAI, estimateCostAndCompute } from '../services/aiService';
import { generateBuildPlan } from '../services/generateBuildPlan';
import { saveExtraction, getExtractionByUrl } from '../services/dbService';

export const extractFeatures = async (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const logProgress = (message: string) => {
    res.write(`data: ${JSON.stringify({ type: 'log', message })}\n\n`);
  };

  const keepAliveInterval = setInterval(() => {
    res.write(': keepalive' + ' '.repeat(2048) + '\n\n');
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }
  }, 10000);

  try {
    const { productName, productUrl, monthlyPrice } = req.body;

    if (!productName || !productUrl) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'productName and productUrl are required' })}\n\n`);
      clearInterval(keepAliveInterval);
      res.end();
      return;
    }

    // Default monthly price to 0 if not provided — frontend can ask user separately
    const resolvedMonthlyPrice = typeof monthlyPrice === 'number' ? monthlyPrice : 0;

    logProgress(`Checking database for existing analysis of ${productUrl}...`);
    const existingExtraction = await getExtractionByUrl(productUrl);

    if (existingExtraction) {
      logProgress(`✓ Found existing analysis! Skipping scraping and AI processing.`);
      const cachedData = {
        id: existingExtraction.id,
        features: existingExtraction.features,
        pricingTiers: existingExtraction.pricing_tiers,
        resourceEstimates: existingExtraction.resource_estimates,
        // Return cached cost report if it exists
        costReport: existingExtraction.cost_report || null,
      };
      res.write(`data: ${JSON.stringify({ type: 'result', data: cachedData })}\n\n`);
      clearInterval(keepAliveInterval);
      res.end();
      return;
    }

    logProgress(`Starting extraction pipeline for ${productName}...`);

    // ── Step 1: Scrape ──
    const scrapedData = await scrapeProductData(productName, productUrl, logProgress);

    if (scrapedData.length === 0) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Could not extract any meaningful text for this product.' })}\n\n`);
      clearInterval(keepAliveInterval);
      res.end();
      return;
    }

    // ── Step 2: AI Feature Extraction (Phi-4) ──
   const extractedData = await extractFeaturesWithAI(productName, scrapedData, logProgress);
logProgress(`✓ AI extraction complete for ${productName}`);

// ── Step 2b: Cost & Compute Estimation ──
logProgress(`🧮 Running cost and compute estimation...`);
const costReport = await estimateCostAndCompute(
  productName,
  extractedData,
  resolvedMonthlyPrice,
  logProgress
);
logProgress(`✓ Cost estimation complete — estimated ${costReport.generationCost.totalCostUSD} to generate`);

// ── Step 2c: Build Plan ──
logProgress(`📐 Generating build plan...`);
const buildPlan = await generateBuildPlan(
  productName,
  extractedData,
  costReport.compute,
  logProgress
);
logProgress(`✓ Build plan ready — ${buildPlan.files.length} files planned`);

// ── Step 3: Save to Database ──
logProgress(`Saving extraction to database...`);
const savedRecord = await saveExtraction(
  productName,
  productUrl,
  extractedData,
  costReport,
  buildPlan        // ← pass build plan alongside cost report
);

if (savedRecord) {
  extractedData.id = savedRecord.id;
  logProgress(`✓ Saved to database successfully!`);
}

// ── Step 4: Return everything to frontend ──
res.write(`data: ${JSON.stringify({
  type: 'result',
  data: {
    ...extractedData,
    costReport,
    buildPlan,       // ← frontend gets full build plan too
  }
})}\n\n`);

    clearInterval(keepAliveInterval);
    res.end();

  } catch (error: any) {
    console.error(`[extractController] Error during extraction:`, error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Internal server error' })}\n\n`);
    clearInterval(keepAliveInterval);
    res.end();
  }
};