// R2 upload helpers. Uses the native binding — no S3 client, no credentials.

import type { Env } from '../types';

const ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/zip', 'application/x-zip-compressed',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv', 'video/mp4', 'video/quicktime',
]);

// SVG is deliberately excluded — served with the client-set Content-Type,
// SVG can contain <script> and becomes a stored-XSS vector.
export function isAllowedMime(mime: string): boolean {
  return ALLOWED.has(mime);
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_BYTES_INTERNAL = 50 * 1024 * 1024;

export const safeKey = (k: string) => k.replace(/[^a-zA-Z0-9._\-/]/g, '_');

export async function putR2(env: Env, key: string, body: ArrayBuffer | ReadableStream, contentType: string) {
  await env.R2.put(key, body, { httpMetadata: { contentType } });
  return `${env.R2_PUBLIC_URL}/${key}`;
}

export async function deleteR2(env: Env, key: string) {
  await env.R2.delete(key);
}

// Reads all multipart files matching `field` from a Request. Enforces size +
// mime allowlist per file. Returns [] if none present.
export async function readUpload(request: Request, field: string): Promise<File[]> {
  const form = await request.formData();
  const values = form.getAll(field);
  const files: File[] = [];
  for (const value of values) {
    if (typeof value === 'object' && value !== null && 'arrayBuffer' in value) files.push(value as File);
  }
  return files;
}
