import { Router } from 'express';
import multer from 'multer';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

// Open CORS for public endpoints (cv-upload, job listings)
const openCors = cors({ origin: '*' });

// Applies to the public CV upload — throttled tightly to stop drive-by
// abuse (the endpoint is unauthenticated and writes 50 MB blobs to R2).
const publicUploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many uploads from this address. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Only owners/admins may delete arbitrary R2 objects by key; individual
// records still go through DELETE /records/:id which cleans up the object.
const PRIVILEGED_ROLES = new Set(['owner', 'admin']);
import {
  S3Client, ListObjectsV2Command, PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const router = Router();

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET     = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL || 'https://files.clockwrk.io';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg','image/png','image/gif','image/webp',
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

// Request-linked upload. This is the canonical bridge between the internal
// dashboard and the client portal: the object and its relational metadata are
// created together so a deliverable cannot become an orphaned R2 object.
router.post('/request-upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success:false, message:'No file provided' });
  const requestId = Number(req.body.request_id);
  if (!requestId) return res.status(400).json({success:false,message:'request_id is required'});
  try {
    const [[request]] = await db.execute('SELECT id,client_id,project_id FROM requests WHERE id=?', [requestId]);
    if (!request) return res.status(404).json({success:false,message:'Request not found'});
    const key = `clients/${request.client_id}/requests/${request.id}/${Date.now()}-${safeKey(req.file.originalname)}`;
    await s3.send(new PutObjectCommand({Bucket:BUCKET,Key:key,Body:req.file.buffer,ContentType:req.file.mimetype}));
    const url = `${PUBLIC_URL}/${key}`;
    const [result] = await db.execute(
      `INSERT INTO files (client_id,project_id,request_id,uploaded_by,file_name,file_url,file_type,category,version,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [request.client_id,request.project_id,request.id,req.user.id,req.file.originalname,url,req.file.mimetype,req.body.category||'deliverable',req.body.version||'Latest',req.body.notes||null]
    );
    const [[file]] = await db.execute('SELECT * FROM files WHERE id=?', [result.insertId]);
    return res.json({success:true,file});
  } catch(err) { console.error(err); return res.status(500).json({success:false,message:err.message||'Upload failed'}); }
});

router.get('/records', authenticate, async (req, res) => {
  try {
    const {client_id,project_id,request_id,search} = req.query;
    let sql=`SELECT f.*,c.company AS client_company,p.name AS project_name,r.title AS request_title,e.name AS uploaded_by_name
      FROM files f LEFT JOIN clients c ON c.id=f.client_id LEFT JOIN projects p ON p.id=f.project_id
      LEFT JOIN requests r ON r.id=f.request_id LEFT JOIN employees e ON e.id=f.uploaded_by`;
    const where=[]; const params=[];
    if(client_id){where.push('f.client_id=?');params.push(client_id);} if(project_id){where.push('f.project_id=?');params.push(project_id);}
    if(request_id){where.push('f.request_id=?');params.push(request_id);} if(search){where.push('(f.file_name LIKE ? OR p.name LIKE ? OR r.title LIKE ?)');params.push(`%${search}%`,`%${search}%`,`%${search}%`);}
    if(where.length) sql+=` WHERE ${where.join(' AND ')}`; sql+=' ORDER BY f.created_at DESC LIMIT 250';
    const [files]=await db.execute(sql,params); return res.json({success:true,files});
  } catch(err){console.error(err);return res.status(500).json({success:false,message:'Server error'});}
});

router.patch('/records/:id', authenticate, async (req,res)=>{
  const allowed=['file_name','category','version','notes'];const fields=[];const params=[];
  for(const key of allowed) if(req.body[key]!==undefined){fields.push(`${key}=?`);params.push(req.body[key]);}
  if(!fields.length)return res.status(400).json({success:false,message:'No fields to update'});
  params.push(req.params.id);await db.execute(`UPDATE files SET ${fields.join(',')} WHERE id=?`,params);
  const [[file]]=await db.execute('SELECT * FROM files WHERE id=?',[req.params.id]);return res.json({success:true,file});
});

router.delete('/records/:id', authenticate, async (req,res)=>{
  try{
    const [[file]]=await db.execute('SELECT * FROM files WHERE id=?',[req.params.id]);
    if(!file)return res.status(404).json({success:false,message:'File not found'});
    if(file.file_url?.startsWith(`${PUBLIC_URL}/`)){
      const key=decodeURIComponent(file.file_url.slice(`${PUBLIC_URL}/`.length));
      await s3.send(new DeleteObjectCommand({Bucket:BUCKET,Key:key}));
    }
    await db.execute('DELETE FROM files WHERE id=?',[file.id]);return res.json({success:true});
  }catch(err){console.error(err);return res.status(500).json({success:false,message:err.message||'Delete failed'});}
});

// ─── Get public URL ───────────────────────────────────────────────────────────
router.get('/url', authenticate, async (req, res) => {
  if (!req.query.key) return res.status(400).json({ success: false, message: 'key required' });
  return res.json({ success: true, url: `${PUBLIC_URL}/${req.query.key}` });
});

// ─── Delete file ──────────────────────────────────────────────────────────────
// Restricted to owner/admin: this bypasses the files table and can wipe any
// object in the bucket. Regular delete flows go through DELETE /records/:id.
router.delete('/', authenticate, async (req, res) => {
  if (!PRIVILEGED_ROLES.has(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Owner or admin access required' });
  }
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
router.post('/cv-upload', openCors, publicUploadLimiter, upload.single('cv'), async (req, res) => {
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
