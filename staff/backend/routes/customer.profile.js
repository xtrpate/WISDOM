/**
 * routes/customer.profile.js
 *
 * POST /api/customer/profile/avatar                  — upload profile photo
 * PUT  /api/customer/profile/basic                   — update name/address
 * POST /api/customer/profile/request-email-change    — send OTP to new email
 * POST /api/customer/profile/verify-email-change     — verify OTP → update email
 * POST /api/customer/profile/request-phone-change    — send SMS OTP via Twilio
 * POST /api/customer/profile/verify-phone-change     — verify SMS OTP → update phone
 * POST /api/customer/profile/request-password-change — verify current pw → send email OTP
 * POST /api/customer/profile/verify-password-change  — verify OTP → update password
 */

const express = require("express");
const router = express.Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const twilio = require("twilio");
const { authenticate } = require("../middleware/auth");

/* ── Customer-only gate ── */
const requireCustomer = (req, res, next) => {
  if (req.user.role !== "customer")
    return res.status(403).json({ message: "Customer access only." });
  next();
};

/* ── Nodemailer ── */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

/* ── Twilio ── */
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

/* ── OTP generator ── */
const genOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

/* ── Multer — avatar upload ── */
const avatarDir = path.join(__dirname, "../uploads/avatars");
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user.id}_${Date.now()}${ext}`);
  },
});
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    cb(null, /jpeg|jpg|png|gif|webp/.test(file.mimetype)),
});

/* ────────────────────────────────────────
   POST /avatar
──────────────────────────────────────── */
router.post(
  "/avatar",
  authenticate,
  requireCustomer,
  uploadAvatar.single("avatar"),
  async (req, res) => {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });
    try {
      /* Delete old avatar */
      const [rows] = await db.execute(
        "SELECT profile_photo FROM users WHERE id=?",
        [req.user.id],
      );
      if (rows[0]?.profile_photo) {
        const old = path.join(avatarDir, rows[0].profile_photo);
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }

      await db.execute("UPDATE users SET profile_photo=? WHERE id=?", [
        req.file.filename,
        req.user.id,
      ]);
      res.json({ profile_photo: req.file.filename });
    } catch (err) {
      console.error("[profile/avatar]", err);
      res.status(500).json({ message: "Upload failed." });
    }
  },
);

/* ────────────────────────────────────────
   PUT /basic  — name + address
──────────────────────────────────────── */
router.put("/basic", authenticate, requireCustomer, async (req, res) => {
  const { name, address } = req.body;
  if (!name?.trim())
    return res.status(400).json({ message: "Name is required." });
  try {
    await db.execute("UPDATE users SET name=?, address=? WHERE id=?", [
      name.trim(),
      address?.trim() || "",
      req.user.id,
    ]);
    res.json({ message: "Profile updated." });
  } catch (err) {
    console.error("[profile/basic]", err);
    res.status(500).json({ message: "Update failed." });
  }
});

/* ────────────────────────────────────────
   POST /request-email-change
──────────────────────────────────────── */
router.post(
  "/request-email-change",
  authenticate,
  requireCustomer,
  async (req, res) => {
    const { new_email } = req.body;
    if (!new_email?.trim())
      return res.status(400).json({ message: "New email is required." });

    /* Check if email already taken */
    const [exists] = await db.execute(
      "SELECT id FROM users WHERE email=? AND id!=?",
      [new_email, req.user.id],
    );
    if (exists.length)
      return res.status(409).json({ message: "Email already in use." });

    const otp = genOtp();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    try {
      /* Store pending change */
      await db.execute(
        `UPDATE users
       SET otp_code=?, otp_expires=?, pending_email=?
       WHERE id=?`,
        [otp, expires, new_email, req.user.id],
      );

      await transporter.sendMail({
        from: `"Spiral Wood Services" <${process.env.MAIL_USER}>`,
        to: new_email,
        subject: "Verify your new email — Spiral Wood",
        html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#8B4513">Verify New Email</h2>
          <p>Use this OTP to confirm your new email address. It expires in 15 minutes.</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:10px;
                      color:#8B4513;background:#fff3e0;padding:20px;
                      border-radius:10px;text-align:center;margin:20px 0">
            ${otp}
          </div>
          <p style="color:#888;font-size:13px">If you didn't request this, ignore this email.</p>
        </div>
      `,
      });

      res.json({ message: "OTP sent to new email." });
    } catch (err) {
      console.error("[profile/request-email-change]", err);
      res.status(500).json({ message: "Failed to send OTP." });
    }
  },
);

/* ────────────────────────────────────────
   POST /verify-email-change
──────────────────────────────────────── */
router.post(
  "/verify-email-change",
  authenticate,
  requireCustomer,
  async (req, res) => {
    const { otp } = req.body;
    try {
      const [rows] = await db.execute(
        "SELECT otp_code, otp_expires, pending_email FROM users WHERE id=?",
        [req.user.id],
      );
      const u = rows[0];
      if (!u || u.otp_code !== otp)
        return res.status(400).json({ message: "Invalid OTP." });
      if (new Date(u.otp_expires) < new Date())
        return res.status(400).json({ message: "OTP has expired." });

      await db.execute(
        `UPDATE users
       SET email=?, pending_email=NULL, otp_code=NULL, otp_expires=NULL
       WHERE id=?`,
        [u.pending_email, req.user.id],
      );
      res.json({ message: "Email updated successfully." });
    } catch (err) {
      console.error("[profile/verify-email-change]", err);
      res.status(500).json({ message: "Verification failed." });
    }
  },
);

/* ────────────────────────────────────────
   POST /request-phone-change  (Twilio Verify)
──────────────────────────────────────── */
router.post(
  "/request-phone-change",
  authenticate,
  requireCustomer,
  async (req, res) => {
    const { new_phone } = req.body;
    if (!new_phone?.trim())
      return res.status(400).json({ message: "Phone number is required." });

    /* Format PH number to E.164: 09XX → +639XX */
    let e164 = new_phone.trim();
    if (e164.startsWith("09")) e164 = "+63" + e164.slice(1);
    else if (!e164.startsWith("+")) e164 = "+63" + e164;

    try {
      /* Store pending phone in DB */
      await db.execute(`UPDATE users SET pending_phone=? WHERE id=?`, [
        new_phone.trim(),
        req.user.id,
      ]);

      /* Send OTP via Twilio Verify */
      await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verifications.create({ to: e164, channel: "sms" });

      res.json({ message: "SMS OTP sent." });
    } catch (err) {
      console.error("[profile/request-phone-change]", err);
      res
        .status(500)
        .json({ message: "Failed to send SMS. " + (err.message || "") });
    }
  },
);

/* ────────────────────────────────────────
   POST /verify-phone-change  (Twilio Verify)
──────────────────────────────────────── */
router.post(
  "/verify-phone-change",
  authenticate,
  requireCustomer,
  async (req, res) => {
    const { otp } = req.body;
    try {
      const [rows] = await db.execute(
        "SELECT pending_phone FROM users WHERE id=?",
        [req.user.id],
      );
      const pending_phone = rows[0]?.pending_phone;
      if (!pending_phone)
        return res
          .status(400)
          .json({ message: "No pending phone change found." });

      /* Format to E.164 */
      let e164 = pending_phone.trim();
      if (e164.startsWith("09")) e164 = "+63" + e164.slice(1);
      else if (!e164.startsWith("+")) e164 = "+63" + e164;

      /* Check OTP via Twilio Verify */
      const check = await twilioClient.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verificationChecks.create({ to: e164, code: otp });

      if (check.status !== "approved")
        return res.status(400).json({ message: "Invalid or expired OTP." });

      /* Save new phone */
      await db.execute(
        `UPDATE users SET phone=?, pending_phone=NULL WHERE id=?`,
        [pending_phone, req.user.id],
      );
      res.json({ message: "Phone number updated successfully." });
    } catch (err) {
      console.error("[profile/verify-phone-change]", err);
      res
        .status(500)
        .json({ message: "Verification failed. " + (err.message || "") });
    }
  },
);

/* ────────────────────────────────────────
   POST /request-password-change
   Verifies current password → sends email OTP
──────────────────────────────────────── */
router.post(
  "/request-password-change",
  authenticate,
  requireCustomer,
  async (req, res) => {
    const { current_password } = req.body;
    try {
      const [rows] = await db.execute(
        "SELECT password, email FROM users WHERE id=?",
        [req.user.id],
      );
      const u = rows[0];
      const match = await bcrypt.compare(current_password, u.password);
      if (!match)
        return res
          .status(400)
          .json({ message: "Current password is incorrect." });

      const otp = genOtp();
      const expires = new Date(Date.now() + 15 * 60 * 1000);
      await db.execute(
        "UPDATE users SET otp_code=?, otp_expires=? WHERE id=?",
        [otp, expires, req.user.id],
      );

      await transporter.sendMail({
        from: `"Spiral Wood Services" <${process.env.MAIL_USER}>`,
        to: u.email,
        subject: "Confirm password change — Spiral Wood",
        html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#8B4513">Confirm Password Change</h2>
          <p>Use this OTP to confirm your password change. Valid for 15 minutes.</p>
          <div style="font-size:36px;font-weight:900;letter-spacing:10px;
                      color:#8B4513;background:#fff3e0;padding:20px;
                      border-radius:10px;text-align:center;margin:20px 0">
            ${otp}
          </div>
          <p style="color:#c62828;font-size:13px">
            ⚠ If you didn't request this, secure your account immediately.
          </p>
        </div>
      `,
      });

      res.json({ message: "OTP sent to your email." });
    } catch (err) {
      console.error("[profile/request-password-change]", err);
      res.status(500).json({ message: "Failed." });
    }
  },
);

/* ────────────────────────────────────────
   POST /verify-password-change
──────────────────────────────────────── */
router.post(
  "/verify-password-change",
  authenticate,
  requireCustomer,
  async (req, res) => {
    const { otp, new_password } = req.body;
    try {
      const [rows] = await db.execute(
        "SELECT otp_code, otp_expires FROM users WHERE id=?",
        [req.user.id],
      );
      const u = rows[0];
      if (!u || u.otp_code !== otp)
        return res.status(400).json({ message: "Invalid OTP." });
      if (new Date(u.otp_expires) < new Date())
        return res.status(400).json({ message: "OTP has expired." });

      const hashed = await bcrypt.hash(new_password, 12);
      await db.execute(
        "UPDATE users SET password=?, otp_code=NULL, otp_expires=NULL WHERE id=?",
        [hashed, req.user.id],
      );
      res.json({ message: "Password changed successfully." });
    } catch (err) {
      console.error("[profile/verify-password-change]", err);
      res.status(500).json({ message: "Failed." });
    }
  },
);

module.exports = router;
