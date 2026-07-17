import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Writes an uploaded file to disk under STORAGE_PATH/subdir and returns the
 * public URL it's served at (main.ts serves STORAGE_PATH at /uploads).
 * Mirrors the pattern already used for call recordings in call-tracking —
 * kept as a shared util instead of duplicating the same four lines per
 * feature that needs to accept an upload (property images/brochure, project
 * images/brochure).
 */
export function saveUploadedFile(file: Express.Multer.File, subdir: string): string {
  const storagePath = path.resolve(process.env.STORAGE_PATH || './uploads', subdir);
  fs.mkdirSync(storagePath, { recursive: true });

  const ext = path.extname(file.originalname) || '';
  const fileName = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(storagePath, fileName), file.buffer);

  return `/uploads/${subdir}/${fileName}`;
}

export function deleteUploadedFile(publicUrl: string | null | undefined): void {
  if (!publicUrl || !publicUrl.startsWith('/uploads/')) return;
  const relativePath = publicUrl.replace('/uploads/', '');
  const fullPath = path.resolve(process.env.STORAGE_PATH || './uploads', relativePath);
  fs.unlink(fullPath, () => {}); // best-effort; a missing file on disk shouldn't block removing the DB reference
}
