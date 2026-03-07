// config/upload.js – Multer file upload configuration
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

const ALLOWED_IMAGES = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_DOCS   = ['.pdf', '.jpg', '.jpeg', '.png'];
const MAX_MB         = parseInt(process.env.MAX_FILE_SIZE_MB || '10');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function diskStorage(subFolder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const dest = path.join(process.env.UPLOAD_DIR || './uploads', subFolder);
      ensureDir(dest);
      cb(null, dest);
    },
    filename(req, file, cb) {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    },
  });
}

function fileFilter(allowed) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`File type not allowed. Allowed: ${allowed.join(', ')}`));
  };
}

// ── Specific uploaders ────────────────────────────────────────────────────────
exports.uploadProductImage = multer({
  storage:    diskStorage('products'),
  fileFilter: fileFilter(ALLOWED_IMAGES),
  limits:     { fileSize: MAX_MB * 1024 * 1024 },
}).single('image');

exports.uploadBlueprintFile = multer({
  storage:    diskStorage('blueprints'),
  fileFilter: fileFilter(ALLOWED_DOCS),
  limits:     { fileSize: MAX_MB * 1024 * 1024 },
}).single('file');

exports.uploadPaymentProof = multer({
  storage:    diskStorage('payments'),
  fileFilter: fileFilter(ALLOWED_IMAGES),
  limits:     { fileSize: MAX_MB * 1024 * 1024 },
}).single('proof');

exports.uploadWarrantyProof = multer({
  storage:    diskStorage('warranty'),
  fileFilter: fileFilter(ALLOWED_DOCS),
  limits:     { fileSize: MAX_MB * 1024 * 1024 },
}).single('proof');

exports.uploadDeliveryReceipt = multer({
  storage:    diskStorage('deliveries'),
  fileFilter: fileFilter(ALLOWED_IMAGES),
  limits:     { fileSize: MAX_MB * 1024 * 1024 },
}).single('receipt');

exports.uploadSiteLogo = multer({
  storage:    diskStorage('settings'),
  fileFilter: fileFilter(ALLOWED_IMAGES),
  limits:     { fileSize: 2 * 1024 * 1024 },
}).single('logo');
