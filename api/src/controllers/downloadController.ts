import { Request, Response } from 'express';
import { BlobServiceClient } from '@azure/storage-blob';
import { createClient } from '@supabase/supabase-js';
import archiver from 'archiver';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getBlobContainer() {
  const client = BlobServiceClient.fromConnectionString(
    process.env.AZURE_STORAGE_CONNECTION_STRING!
  );
  return client.getContainerClient(
    process.env.AZURE_STORAGE_CONTAINER_NAME || 'barf-test'
  );
}

export async function downloadController(req: Request, res: Response): Promise<void> {
  const { buildId } = req.params;

  if (!buildId) {
    res.status(400).json({ error: 'Missing buildId' });
    return;
  }

  const supabase = getSupabase();

  // Load build metadata for the zip filename
  const { data: build, error: buildErr } = await supabase
    .from('builds')
    .select('project_id, version, extraction_id')
    .eq('id', buildId)
    .maybeSingle();

  if (buildErr || !build) {
    res.status(404).json({ error: 'Build not found' });
    return;
  }

  // Load all successfully stored files for this build
  const { data: files, error: filesErr } = await supabase
    .from('build_files')
    .select('path, blob_path')
    .eq('build_id', buildId)
    .eq('step_status', 'done')
    .not('blob_path', 'is', null);

  if (filesErr || !files?.length) {
    res.status(404).json({ error: 'No files found for this build' });
    return;
  }

  const zipName = `barf-${build.project_id.slice(0, 8)}-v${build.version}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

  const archive = archiver('zip', { zlib: { level: 6 } });

  archive.on('error', (err) => {
    console.error('[downloadController] Archive error:', err);
    if (!res.headersSent) res.status(500).json({ error: 'Archive failed' });
  });

  archive.pipe(res);

  const container = getBlobContainer();

  for (const file of files) {
    try {
      const blob   = container.getBlockBlobClient(file.blob_path);
      const buffer = await blob.downloadToBuffer();
      archive.append(buffer, { name: file.path });
    } catch (err) {
      console.warn(`[downloadController] Skipping ${file.path}:`, (err as Error).message);
    }
  }

  await archive.finalize();
}
