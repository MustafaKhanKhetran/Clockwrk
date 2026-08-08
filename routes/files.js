import { Router } from 'express';
import multer from 'multer';
import https from 'https';
import cors from 'cors';
import { authenticate } from '../middleware/auth.js';

// Open CORS for public endpoints (cv-upload, job listings)
const openCors = cors({ origin: '*' });
import {
  S3Client, ListObjectsV2Command, PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';

const router = Router();

const tlsAgent = new https.Agent({
  rejectUnauthorized: false,
  secureOptions: 0x4, // SSL_OP_LEGACY_SERVER_CONNECT
  ciphers: 'ALL',
});

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler({ httpsAgent: tlsAgent }),
});

const BUCKET     = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://files.clockwrk.io';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
      'application/pdf','application/zip','application/x-zip-compressed',
      'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain','text/csv','video/mp4','video/quicktime',
    ];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error('File type not allowed'));
  },
});

const safeKey    = k => k.replace(/[^a-zA-Z0-9._\-/]/g, '_');
const formatSize = b => b < 1024 ? b+' B' : b < 1048576 ? (b/1024).toFixed(1)+' KB' : (b/1048576).toFixed(1)+' MB';

// ─── List files/folders ───────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const prefix = req.query.folder ? req.query.folder.replace(/\/$/,'')+'/' : '';
  try {
    const data = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: prefix, Delimiter: '/',
    }));

    const folders = (data.CommonPrefixes || []).map(p => ({
      type: 'folder',
      name: p.Prefix.replace(prefix, '').replace('/', ''),
      path: p.Prefix,
    }));

    const files = (data.Contents || [])
      .filter(f => f.Key !== prefix)
      .map(f => ({
        type:          'file',
        key:           f.Key,
        name:          f.Key.split('/').pop(),
        path:          f.Key,
        size:          f.Size,
        size_label:    formatSize(f.Size),
        last_modified: f.LastModified,
        url:           `${PUBLIC_URL}/${f.Key}`,
      }));

    return res.json({ success: true, folders, files, prefix });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Upload file ──────────────────────────────────────────────────────────────
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
  const folder = req.query.folder || 'internal';
  const key    = folder.replace(/\/$/,'') + '/' + Date.now() + '-' + safeKey(req.file.originalname);
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key,
      Body: req.file.buffer, ContentType: req.file.mimetype,
    }));
    return res.json({
      success: true, key,
      name:       req.file.originalname,
      size:       req.file.size,
      size_label: formatSize(req.file.size),
      mime:       req.file.mimetype,
      url:        `${PUBLIC_URL}/${key}`,
    });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Get public URL ───────────────────────────────────────────────────────────
router.get('/url', authenticate, async (req, res) => {
  if (!req.query.key) return res.status(400).json({ success: false, message: 'key required' });
  return res.json({ success: true, url: `${PUBLIC_URL}/${req.query.key}` });
});

// ─── Delete file ──────────────────────────────────────────────────────────────
router.delete('/', authenticate, async (req, res) => {
  if (!req.query.key) return res.status(400).json({ success: false, message: 'key required' });
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: req.query.key }));
    return res.json({ success: true });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Create folder (zero-byte placeholder) ───────────────────────────────────
router.post('/folder', authenticate, async (req, res) => {
  if (!req.body.path) return res.status(400).json({ success: false, message: 'path required' });
  const key = req.body.path.replace(/\/$/,'') + '/';
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key, Body: '', ContentType: 'application/x-directory',
    }));
    return res.json({ success: true, key });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PUBLIC: CV upload from careers form ─────────────────────────────────────
router.options('/cv-upload', openCors); // handle preflight
router.post('/cv-upload', openCors, upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
  const date = new Date().toISOString().slice(0,7);
  const name = req.body.applicant_name
    ? safeKey(req.body.applicant_name.toLowerCase().replace(/\s+/g,'-'))
    : 'applicant';
  const ext = req.file.originalname.split('.').pop();
  const key = `cvs/${date}/${name}-${Date.now()}.${ext}`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET, Key: key,
      Body: req.file.buffer, ContentType: req.file.mimetype,
    }));
    return res.json({ success: true, key, url: `${PUBLIC_URL}/${key}` });
  } catch(err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
