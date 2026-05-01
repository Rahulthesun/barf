/**
 * @file buildController.ts
 * @description Phase 2 — Build Pipeline Controller for barf.
 *
 * Pipeline:
 *  1. Load extraction (build_plan + project_id) from Supabase
 *  2. Generate each file + unit tests  (GPT-4.1-mini, Azure)
 *  3. Validation pass — review + strengthen tests  (GPT-4.1, Azure)
 *  4. Store all files in Azure Blob Storage
 *  5. Update build metadata in Supabase
 *
 * All steps stream logs via SSE.
 * Each step has isolated retries (max 3). Failed steps are marked and skipped —
 * they do NOT abort the whole build.
 *
 * Fixes vs original:
 *  - extraction.project_id used everywhere (was aliased to extractionId)
 *  - createBuildRecord(project_id, extractionId) — args were both extractionId
 *  - fileMeta undefined crash in validation loop fixed + properly guarded
 *  - fatal() returns `never` — throws after ending SSE so pipeline cannot continue
 *  - BuildRecord type matches actual DB columns (builds table)
 *  - test file extension preserves .tsx correctly (.tsx → .test.tsx)
 *  - Supabase + Blob clients are module-level singletons (not recreated per request)
 *  - 'email' type files skipped from deep validation (same as config/schema)
 *  - upsertFileRecord writes retries + error columns for debuggability
 *  - version auto-incremented per project instead of hardcoded to 1
 *  - unparseable validator response now throws instead of silently approving
 */

import { Request, Response } from 'express';
import { BlobServiceClient } from '@azure/storage-blob';
import { OpenAI }            from 'openai';
import { createClient }      from '@supabase/supabase-js';
import type { BuildPlan, PlannedFile } from '../services/generateBuildPlan';


// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const MAX_RETRIES = 3;

const MODELS = {
  generator: process.env.AZURE_GPT41_MINI_DEPLOYMENT || 'gpt-4.1',
  validator: process.env.AZURE_GPT41_DEPLOYMENT      || 'gpt-4.1',
} as const;

// ─────────────────────────────────────────────
// Module-level singletons
// FIX: were re-instantiated on every request — now created once at import time
// ─────────────────────────────────────────────

let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Missing Supabase env vars');
    }

    supabaseInstance = createClient(url, key);
  }

  return supabaseInstance;
}
let blobServiceClientInstance: BlobServiceClient | null = null;

function getBlobClient(): BlobServiceClient {
  if (!blobServiceClientInstance) {
    const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connStr) throw new Error('Missing AZURE_STORAGE_CONNECTION_STRING env var');
    blobServiceClientInstance = BlobServiceClient.fromConnectionString(connStr);
  }
  return blobServiceClientInstance;
}

function makeAIClient(): OpenAI {
  const targetUri = process.env.AZURE_GPT41_TARGET_URI || '';
  const key       = process.env.AZURE_GPT41_KEY || process.env.AZURE_AI_API_KEY || '';

  // Strip any trailing path (/responses, /chat/completions, etc.) to get the /v1 base
  const baseURL = (targetUri.split('?')[0] ?? targetUri)
    .replace(/\/(responses|chat\/completions)$/, '');

  console.log(`[AI client] baseURL : ${baseURL}`);

  return new OpenAI({
    apiKey:         key,
    baseURL,
    defaultQuery:   {},
    defaultHeaders: { 'api-key': key },
  });
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type StepStatus = 'pending' | 'running' | 'done' | 'failed';

interface GeneratedFile {
  path:       string;
  code:       string;
  tests:      string | null;
  stepStatus: StepStatus;
  retries:    number;
  error?:     string;
}

/**
 * FIX: Now mirrors the actual `builds` table schema from Supabase.
 * Original had `files: GeneratedFile[]` which is not a DB column.
 */
interface BuildRecord {
  id:              string;
  project_id:      string;    // text in DB
  extraction_id:   string;
  status:          'pending' | 'generating' | 'validating' | 'storing' | 'done' | 'failed';
  version:         number;    // int4
  files_generated: number;    // int4
  files_stored:    number;    // int4
  files_failed:    string[];  // _text (text array) in DB
  created_at:      string;
  updated_at:      string;
}

// ─────────────────────────────────────────────
// SSE helpers
// ─────────────────────────────────────────────

function log(res: Response, msg: string): void {
  res.write(`data: ${JSON.stringify({ type: 'log', message: msg })}\n\n`);
}

function progress(res: Response, current: number, total: number, file: string): void {
  res.write(`data: ${JSON.stringify({ type: 'progress', current, total, file })}\n\n`);
}

function stepUpdate(res: Response, step: string, status: StepStatus, detail?: string): void {
  res.write(`data: ${JSON.stringify({ type: 'step', step, status, detail })}\n\n`);
}

/**
 * FIX: Returns `never` (was `void`).
 * TypeScript now enforces that nothing after a fatal() call can execute.
 * The throw satisfies `never` and stops the pipeline; Express catches it but
 * the response is already ended so nothing double-sends.
 */
function fatal(res: Response, msg: string): never {
  res.write(`data: ${JSON.stringify({ type: 'error', message: msg })}\n\n`);
  res.end();
  throw new Error(`[fatal] ${msg}`);
}


// ─────────────────────────────────────────────
// Retry wrapper
// ─────────────────────────────────────────────

async function withRetry<T>(
  label:      string,
  fn:         () => Promise<T>,
  onRetry:    (attempt: number, err: unknown) => void,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      onRetry(attempt, err);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastErr;
}

// ─────────────────────────────────────────────
// JSON sanitizer — escapes literal control chars inside JSON strings
// GPT often returns real newlines/tabs inside string values, which breaks JSON.parse
// ─────────────────────────────────────────────

function sanitizeJson(raw: string): string {
  let inString = false;
  let escaped  = false;
  let result   = '';

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; result += ch; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }

    if (inString) {
      if (ch === '\n') { result += '\\n';  continue; }
      if (ch === '\r') { result += '\\r';  continue; }
      if (ch === '\t') { result += '\\t';  continue; }
    }

    result += ch;
  }
  return result;
}

// ─────────────────────────────────────────────
// Post-generation sanitizer
// Fixes known GPT mistakes before files are stored
// ─────────────────────────────────────────────

function sanitizeGeneratedFile(filePath: string, code: string): string {
  if (filePath !== 'package.json') return code;

  try {
    const pkg = JSON.parse(code);
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
      if (!pkg[section]) continue;
      for (const key of Object.keys(pkg[section])) {
        if (key.startsWith('@/')) delete pkg[section][key];
      }
    }
    return JSON.stringify(pkg, null, 2);
  } catch {
    return code;
  }
}

// ─────────────────────────────────────────────
// Generate a single file + its tests
// ─────────────────────────────────────────────

async function generateFile(
  client:      OpenAI,
  file:        PlannedFile,
  buildPlan:   BuildPlan,
  systemHints: string
): Promise<{ code: string; tests: string | null }> {

  // FIX: 'email' added — email templates need no tests
  const needsTests = !['config', 'schema', 'email'].includes(file.type);

  const userPrompt = `
Generate the file: ${file.path}
Type: ${file.type}
Description: ${file.description}
${file.dependsOn?.length ? `Imports from: ${file.dependsOn.join(', ')}` : ''}

Tech stack:
- Framework: ${buildPlan.stack.framework}
- Styling:   ${buildPlan.stack.styling}
- Database:  ${buildPlan.stack.database}
- Auth:      ${buildPlan.stack.auth}

Respond with ONLY valid JSON in this exact shape, no markdown:
{
  "code": "<full file content>",
  "tests": ${needsTests ? '"<full Jest test file content>"' : 'null'}
}

Rules:
- code must be the complete, production-ready file. No TODOs, no placeholders.
- ${needsTests ? 'tests must cover the main happy path and at least one error case.' : 'tests is null for config/schema/email files.'}
- All imports use the @/ alias.
- Never use 'any' in TypeScript.
`.trim();

  const response = await client.chat.completions.create({
    model:       MODELS.generator,
    messages: [
      { role: 'system', content: systemHints },
      { role: 'user',   content: userPrompt  },
    ],
    temperature: 0.15,
    max_tokens:  4096,
  });

  const raw = response.choices?.[0]?.message?.content || '{}';

  try {
    const clean = raw.replace(/```(?:json)?\n?|\n?```/gi, '').trim();
    return JSON.parse(sanitizeJson(clean));
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(sanitizeJson(match[0]));
    throw new Error(`Failed to parse AI response for ${file.path}`);
  }
}

// ─────────────────────────────────────────────
// Validate + strengthen a file's tests
// ─────────────────────────────────────────────

interface ValidationResult {
  approved:   boolean;
  issues:     string[];
  fixedCode:  string | null;
  fixedTests: string | null;
}

async function validateFile(
  client:    OpenAI,
  file:      PlannedFile,
  code:      string,
  tests:     string | null,
  buildPlan: BuildPlan
): Promise<ValidationResult> {

  const prompt = `
You are a senior TypeScript engineer doing a code review.

File: ${file.path}
Type: ${file.type}

=== CODE ===
${code}

${tests ? `=== TESTS ===\n${tests}` : '(no tests for this file type)'}

Review for:
1. TypeScript correctness (no implicit any, proper types)
2. Supabase SSR usage (server vs client client used correctly)
3. Zod validation present on all API routes
4. Auth checks present on all protected routes
5. Test coverage — happy path + at least one error case

Respond ONLY with valid JSON, no markdown:
{
  "approved": true | false,
  "issues": ["issue 1", "issue 2"],
  "fixedCode": "<rewritten code if issues found, else null>",
  "fixedTests": "<rewritten tests if issues found, else null>"
}
`.trim();

  const response = await client.chat.completions.create({
    model:       MODELS.validator,
    messages: [
      { role: 'system', content: `You are a strict TypeScript + Next.js code reviewer for a ${buildPlan.tool} clone.` },
      { role: 'user',   content: prompt },
    ],
    temperature: 0.1,
    max_tokens:  4096,
  });

  const raw = response.choices?.[0]?.message?.content || '{}';

  try {
    const clean = raw.replace(/```(?:json)?\n?|\n?```/gi, '').trim();
    return JSON.parse(sanitizeJson(clean));
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(sanitizeJson(match[0]));
    // FIX: was silently returning { approved: true } on parse failure — now throws
    // so the caller can log it and skip, rather than rubber-stamping bad output
    throw new Error('Validator returned unparseable response');
  }
}

// ─────────────────────────────────────────────
// Store a file in Azure Blob Storage
// ─────────────────────────────────────────────

async function storeFile(
  projectId: string,
  version:   number,
  filePath:  string,
  content:   string
): Promise<string> {
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'barf-projects';
  const blobPath      = `${projectId}/v${version}/${filePath}`;

  const containerClient = getBlobClient().getContainerClient(containerName);
  await containerClient.createIfNotExists();

  const blockBlob = containerClient.getBlockBlobClient(blobPath);
  await blockBlob.upload(content, Buffer.byteLength(content, 'utf8'), {
    blobHTTPHeaders: { blobContentType: 'text/plain; charset=utf-8' },
  });

  return blobPath;
}

// ─────────────────────────────────────────────
// Supabase helpers
// ─────────────────────────────────────────────

/**
 * FIX: Now accepts real projectId (extraction.project_id) separately from extractionId.
 * Original called createBuildRecord(extractionId, extractionId) — project_id was wrong.
 * Also auto-increments version per project instead of always writing 1.
 */
async function createBuildRecord(
  projectId:    string,
  extractionId: string
): Promise<{ buildId: string; version: number }> {


  const { data: latest } = await getSupabase()
    .from('builds')
    .select('version')
    .eq('project_id', projectId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { version: number } | null, error: unknown };

  const version = (latest?.version ?? 0) + 1;

  const { data, error } = await (getSupabase()
    .from('builds')as any)
    .insert({
      project_id:      projectId,
      extraction_id:   extractionId,
      status:          'pending',
      version,
      files_generated: 0,
      files_stored:    0,
      files_failed:    [],
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create build record: ${error.message}`);
  return { buildId: (data as any).id, version };

}

async function updateBuildStatus(
  buildId: string,
  status:  BuildRecord['status'],
  extra?:  Record<string, unknown>
): Promise<void> {
  await (getSupabase()
    .from('builds') as any)
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', buildId);
}

/**
 * FIX: Now also writes `retries` and `error` so failed files are debuggable.
 * Add these columns to build_files if not already present:
 *   ALTER TABLE build_files ADD COLUMN retries int4 DEFAULT 0;
 *   ALTER TABLE build_files ADD COLUMN error   text;
 */
async function upsertFileRecord(
  buildId:  string,
  file:     GeneratedFile,
  blobPath: string
): Promise<void> {
  await getSupabase().from('build_files').upsert({
    build_id:    buildId,
    path:        file.path,
    blob_path:   blobPath,
    has_tests:   file.tests !== null,
    step_status: file.stepStatus,
    retries:     file.retries,
    error:       file.error ?? null,
    updated_at:  new Date().toISOString(),
  } as any );
}

// ─────────────────────────────────────────────
// Main controller
// ─────────────────────────────────────────────

export async function buildController(req: Request, res: Response): Promise<void> {

  // ── SSE headers ──
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  const { id: extractionId } = req.body as { id?: string };

  if (!extractionId) {
    fatal(res, 'Missing extraction id');
  }

  // ── Load extraction ──
  log(res, `🔍 Loading extraction ${extractionId}...`);

  const { data: extraction, error: loadErr } = await getSupabase()
    .from('extractions')
    // FIX: original only selected '*' but never used project_id — now explicit
    .select('id, build_plan, cost_report, product_name')
    .eq('id', extractionId)
    .maybeSingle();

  if (loadErr || !extraction) {
    fatal(res, `Extraction not found: ${loadErr?.message || 'no record'}`);
  }

const buildPlan: BuildPlan = (extraction as any).build_plan;

  if (!buildPlan || !buildPlan.files?.length) {
    fatal(res, 'No build plan found on this extraction. Run Phase 1 first.');
  }

  // extractions table has no project_id column — use extractionId as the project key
const projectId: string = (extraction as any).project_id ?? extractionId;

  log(res, `✓ Loaded build plan — ${buildPlan.files.length} files, project ${projectId}`);

  // ── Create build record ──
  let buildId!: string;
  let version!: number;

  try {
    ({ buildId, version } = await createBuildRecord(projectId, extractionId));
    log(res, `✓ Build record created (id=${buildId}, version=${version})`);
  } catch (err: unknown) {
    fatal(res, `DB error creating build record: ${(err as Error).message}`);
  }

  await updateBuildStatus(buildId, 'generating');

  // ── Init AI clients ──
  const generatorClient = makeAIClient();
  const validatorClient = makeAIClient();
  const systemHints     = buildPlan.systemPromptHints.join('\n');

  const generatedFiles: GeneratedFile[] = [];
  const totalFiles = buildPlan.generationOrder.length;

  // ═════════════════════════════════════════
  // PHASE A — Generate files in order
  // ═════════════════════════════════════════

  stepUpdate(res, 'generation', 'running', `0 / ${totalFiles} files`);

  for (let i = 0; i < buildPlan.generationOrder.length; i++) {
  const filePath = buildPlan.generationOrder[i];

  if (typeof filePath !== 'string') {
    log(res, `⚠ Invalid filePath at index ${i}, skipping`);
    continue;
  }

  const fileMeta = buildPlan.files.find(f => f.path === filePath);

  if (!fileMeta) {
    log(res, `⚠ Unknown path in generationOrder, skipping: ${filePath}`);
    continue;
  }

  progress(res, i + 1, totalFiles, filePath);
    log(res, `⚙ [${i + 1}/${totalFiles}] Generating ${filePath}...`);

    const record: GeneratedFile = {
      path:       filePath,
      code:       '',
      tests:      null,
      stepStatus: 'running',
      retries:    0,
    };

    try {
      const result = await withRetry(
        filePath,
        () => generateFile(generatorClient, fileMeta, buildPlan, systemHints),
        (attempt, err) => {
          record.retries = attempt;
          const msg = (err as any)?.response?.data?.error?.message
            || (err as any)?.response?.statusText
            || (err as Error).message;
          log(res, `  ↺ Retry ${attempt}/${MAX_RETRIES} for ${filePath} — ${msg}`);
        }
      );

      record.code       = sanitizeGeneratedFile(filePath, result.code);
      record.tests      = result.tests;
      record.stepStatus = 'done';
      log(res, `  ✓ ${filePath}${result.tests ? ' + tests' : ''}`);

    } catch (err: unknown) {
      record.stepStatus = 'failed';
      record.error      = (err as Error).message;
      log(res, `  ✗ ${filePath} failed after ${MAX_RETRIES} retries — ${record.error}`);
    }

    generatedFiles.push(record);
  }

  const generatedCount = generatedFiles.filter(f => f.stepStatus === 'done').length;
  stepUpdate(res, 'generation', 'done', `${generatedCount} / ${totalFiles} files`);
  log(res, `✓ Generation complete — ${generatedCount}/${totalFiles}`);

  // ═════════════════════════════════════════
  // PHASE B — Validation pass (GPT-4.1)
  // ═════════════════════════════════════════

  await updateBuildStatus(buildId, 'validating');
  stepUpdate(res, 'validation', 'running');
  log(res, `🔬 Validation pass with ${MODELS.validator}...`);

  let validatedCount = 0;
  let fixedCount     = 0;

  for (const file of generatedFiles) {
    if (file.stepStatus !== 'done') continue;

    // FIX: fileMeta lookup moved inside loop with explicit guard.
    // Original: looked up outside loop body, then passed `fileMeta!` — crash if undefined.
    const fileMeta = buildPlan.files.find(f => f.path === file.path);
    if (!fileMeta) {
      log(res, `⚠ No metadata for ${file.path}, skipping validation`);
      continue;
    }

    // FIX: 'email' type added — no auth/Zod review makes sense for email templates
    if (['config', 'schema', 'email'].includes(fileMeta.type)) {
      validatedCount++;
      continue;
    }

    log(res, `  🔎 Validating ${file.path}...`);

    try {
      const result = await withRetry(
        `validate:${file.path}`,
        () => validateFile(validatorClient, fileMeta, file.code, file.tests, buildPlan),
        (attempt, err) => {
          log(res, `  ↺ Validator retry ${attempt} for ${file.path} — ${(err as Error).message}`);
        }
      );

      if (!result.approved) {
        log(res, `  ⚠ ${file.path}: ${result.issues.join('; ')}`);
        if (result.fixedCode)  { file.code  = result.fixedCode;  fixedCount++; log(res, `  ✎ Code rewritten`); }
        if (result.fixedTests) { file.tests = result.fixedTests;               log(res, `  ✎ Tests rewritten`); }
      } else {
        log(res, `  ✓ ${file.path} approved`);
      }
      validatedCount++;

    } catch (err: unknown) {
      // FIX: unparseable response throws (was silently approved) — logged and skipped
      log(res, `  ✗ Validation error for ${file.path} — ${(err as Error).message}`);
    }
  }

  stepUpdate(res, 'validation', 'done', `${validatedCount} validated, ${fixedCount} fixed`);
  log(res, `✓ Validation complete — ${fixedCount} files auto-fixed`);

  // ═════════════════════════════════════════
  // PHASE C — Store in Azure Blob
  // ═════════════════════════════════════════

  await updateBuildStatus(buildId, 'storing');
  stepUpdate(res, 'storage', 'running');
  log(res, `☁ Storing in Azure Blob (project=${projectId}, v${version})...`);

  let storedCount = 0;

  for (const file of generatedFiles) {
    if (file.stepStatus !== 'done' || !file.code) continue;

    try {
      const blobPath = await storeFile(projectId, version, file.path, file.code);
      log(res, `  ☁ ${file.path}`);

      if (file.tests) {
        // FIX: .tsx files were getting .test.ts extension — now preserved correctly
        const ext      = file.path.endsWith('.tsx') ? '.test.tsx' : '.test.ts';
        const testPath = file.path.replace(/\.tsx?$/, ext);
        await storeFile(projectId, version, testPath, file.tests);
        log(res, `  ☁ ${testPath}`);
      }

      await upsertFileRecord(buildId, file, blobPath);
      storedCount++;

    } catch (err: unknown) {
      log(res, `  ✗ Storage failed for ${file.path} — ${(err as Error).message}`);
    }
  }

  stepUpdate(res, 'storage', 'done', `${storedCount} files stored`);
  log(res, `✓ Storage complete — ${storedCount} files`);

  // ═════════════════════════════════════════
  // Done
  // ═════════════════════════════════════════

  const failedFiles = generatedFiles.filter(f => f.stepStatus === 'failed').map(f => f.path);

  await updateBuildStatus(buildId, 'done', {
    files_generated: generatedCount,
    files_stored:    storedCount,
    files_failed:    failedFiles,
    project_id:      projectId,
    version,
  });

  log(res, `\n🎉 Build complete!`);
  log(res, `   Generated : ${generatedCount}/${totalFiles}`);
  log(res, `   Validated : ${validatedCount}`);
  log(res, `   Fixed     : ${fixedCount}`);
  log(res, `   Stored    : ${storedCount}`);
  if (failedFiles.length) {
    log(res, `   Failed    : ${failedFiles.join(', ')}`);
  }

  res.write(`data: ${JSON.stringify({
    type:      'result',
    buildId,
    projectId,
    version,
    stats: {
      total:     totalFiles,
      generated: generatedCount,
      validated: validatedCount,
      fixed:     fixedCount,
      stored:    storedCount,
      failed:    failedFiles.length,
    },
    failedFiles,
  })}\n\n`);

  res.end();
}