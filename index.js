const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Configure ffmpeg binary from ffmpeg-static if available
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}
// Configure ffprobe if provided via env, otherwise rely on system PATH
const ffprobeEnv = process.env.FFPROBE_PATH;
if (ffprobeEnv) {
  ffmpeg.setFfprobePath(ffprobeEnv);
}

const app = express();
app.use(cors({ origin: '*'}));

const PORT = process.env.PORT || 3000;
const TTL_MIN = Number(process.env.TTL_MINUTES || '15');
const TTL_MS = TTL_MIN * 60 * 1000;
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || '300');
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/mask_uploads';
const OUTPUT_DIR = process.env.OUTPUT_DIR || '/tmp/mask_outputs';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const id = Date.now() + '_' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname || '') || '.mp4';
    cb(null, `upload_${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
});

function cleanupOldFiles(dir) {
  try {
    const now = Date.now();
    for (const f of fs.readdirSync(dir)) {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      if (now - st.mtimeMs > TTL_MS) {
        fs.unlink(p, () => {});
      }
    }
  } catch (e) {
    // no-op
  }
}

setInterval(() => {
  cleanupOldFiles(UPLOAD_DIR);
  cleanupOldFiles(OUTPUT_DIR);
}, 60 * 1000);

app.get('/health', (req, res) => {
  res.json({ ok: true, ttlMinutes: TTL_MIN, maxFileMb: MAX_FILE_MB });
});

// Root OK for platform checks
app.get('/', (req, res) => {
  res.status(200).json({ ok: true, service: 'mask-service', endpoints: ['GET /', 'GET /health', 'POST /mask'] });
});

function buildDelogoFilter(rects) {
  if (!Array.isArray(rects)) return '';
  const parts = [];
  for (const r of rects) {
    if (!r) continue;
    const x = Math.max(0, Math.round(Number(r.x) || 0));
    const y = Math.max(0, Math.round(Number(r.y) || 0));
    const w = Math.max(1, Math.round(Number(r.w) || 1));
    const h = Math.max(1, Math.round(Number(r.h) || 1));
    parts.push(`delogo=x=${x}:y=${y}:w=${w}:h=${h}:show=0`);
  }
  return parts.join(',');
}

app.post('/mask', upload.single('file'), async (req, res) => {
  try {
    const inputPath = req.file && req.file.path;
    const rectsRaw = req.body && req.body.rects;
    if (!inputPath) {
      return res.status(400).json({ error: 'no_file' });
    }
    let rects = [];
    try {
      rects = JSON.parse(rectsRaw || '[]');
    } catch (e) {
      return res.status(400).json({ error: 'bad_rects_json' });
    }
    if (!Array.isArray(rects) || rects.length === 0) {
      return res.status(400).json({ error: 'no_rects' });
    }

    const vf = buildDelogoFilter(rects);
    if (!vf) {
      return res.status(400).json({ error: 'empty_filter' });
    }

    const outName = 'output_' + Date.now() + '_' + crypto.randomBytes(6).toString('hex') + '.mp4';
    const outPath = path.join(OUTPUT_DIR, outName);

    ffmpeg(inputPath)
      .videoFilters(vf)
      .outputOptions([
        '-c:v libx264',
        '-crf 18',
        '-preset slow',
        '-c:a aac',
        '-b:a 192k',
        '-movflags +faststart'
      ])
      .on('error', (err) => {
        console.error('ffmpeg error:', err && err.message);
        return res.status(500).json({ error: 'ffmpeg_error', message: String(err && err.message || err) });
      })
      .on('end', () => {
        res.setHeader('Content-Type', 'video/mp4');
        res.sendFile(outPath, (err) => {
          if (err) {
            console.error('sendFile error:', err && err.message);
          }
          // Keep files for TTL; cleanup job will remove later
        });
      })
      .save(outPath);
  } catch (e) {
    console.error('mask handler error:', e);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Multer / general error handler
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'file_too_large' });
  }
  console.error('unhandled error:', err);
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, () => {
  console.log(`mask-service listening on :${PORT}`);
});
