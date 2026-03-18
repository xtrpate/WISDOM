/**
 * routes/customer.auth.js
 *
 * POST /api/customer/auth/register
 * POST /api/customer/auth/verify-otp
 * POST /api/customer/auth/resend-otp
 * POST /api/customer/auth/login
 */

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const db = require("../db");
require("dotenv").config();

const OTP_EXPIRY_MINUTES = 15;

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/* ── Gmail transporter ── */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER, // baluktottite7@gmail.com
    pass: process.env.MAIL_PASS, // Gmail App Password (16 chars)
  },
});

/* ── Send OTP email ── */
const sendOtpEmail = async (email, otp, name) => {
  await transporter.sendMail({
    from: `"Spiral Wood Services" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Your Spiral Wood Verification Code",
    html: `
      <!DOCTYPE html>
      <html>
        <body style="margin:0;padding:0;background:#f4f6f9;font-family:'Segoe UI',sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0"
                  style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px;text-align:center;">
                      <div style="width:56px;height:56px;background:linear-gradient(135deg,#8B4513,#D2691E);
                                  border-radius:14px;display:inline-flex;align-items:center;justify-content:center;
                                  font-size:26px;font-weight:900;color:white;font-family:Georgia,serif;
                                  line-height:56px;">W</div>
                      <h1 style="color:#ffffff;font-size:20px;font-weight:800;margin:12px 0 4px;
                                 letter-spacing:2px;">SPIRAL WOOD SERVICES</h1>
                      <p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0;">
                        Email Verification
                      </p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding:36px 40px;">
                      <p style="font-size:16px;color:#1a1a2e;margin:0 0 8px;">
                        Hi <strong>${name}</strong>,
                      </p>
                      <p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 28px;">
                        Thank you for registering with Spiral Wood Services!
                        Use the verification code below to confirm your email address.
                      </p>

                      <!-- OTP Box -->
                      <div style="background:#fff3e0;border:2px dashed #D2691E;border-radius:12px;
                                  padding:24px;text-align:center;margin-bottom:28px;">
                        <p style="font-size:12px;color:#8B4513;font-weight:700;
                                  letter-spacing:2px;margin:0 0 10px;text-transform:uppercase;">
                          Your Verification Code
                        </p>
                        <div style="font-size:42px;font-weight:900;color:#8B4513;
                                    letter-spacing:12px;font-family:'Courier New',monospace;">
                          ${otp}
                        </div>
                        <p style="font-size:12px;color:#aaa;margin:10px 0 0;">
                          Expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>
                        </p>
                      </div>

                      <p style="font-size:13px;color:#888;line-height:1.7;margin:0;">
                        Enter this code on the verification page to continue your registration.
                        If you did not create an account, please ignore this email.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background:#f7f8fa;padding:20px 40px;text-align:center;
                               border-top:1px solid #eee;">
                      <p style="font-size:12px;color:#aaa;margin:0;line-height:1.6;">
                        © ${new Date().getFullYear()} Spiral Wood Services. All rights reserved.<br/>
                        This is an automated email — please do not reply.
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });
};

/* ══════════════════════════════════════════════════════════════
   POST /api/customer/auth/register
══════════════════════════════════════════════════════════════ */
router.post("/register", async (req, res) => {
  const { first_name, last_name, email, phone, address, password } = req.body;

  if (!first_name || !last_name || !email || !phone || !address || !password)
    return res.status(400).json({ message: "All fields are required." });

  if (password.length < 8)
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters." });

  try {
    const [existing] = await db.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    if (existing.length > 0)
      return res
        .status(409)
        .json({ message: "An account with this email already exists." });

    const hashed = await bcrypt.hash(password, 12);
    const otp = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const fullName = `${first_name.trim()} ${last_name.trim()}`;

    const [result] = await db.execute(
      `
      INSERT INTO users
        (name, email, password, phone, address, role,
         is_verified, otp_code, otp_expires,
         approval_status, is_active)
      VALUES (?, ?, ?, ?, ?, 'customer',
              FALSE, ?, ?, 'pending', TRUE)
    `,
      [fullName, email, hashed, phone, address, otp, expiry],
    );

    await sendOtpEmail(email, otp, first_name.trim());

    res.status(201).json({
      message:
        "Registration successful. Please check your email for the 6-digit verification code.",
      user_id: result.insertId,
    });
  } catch (err) {
    console.error("[register]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /api/customer/auth/verify-otp
══════════════════════════════════════════════════════════════ */
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ message: "Email and OTP are required." });

  try {
    const [rows] = await db.execute(
      `SELECT id, otp_code, otp_expires, is_verified
       FROM users WHERE email = ? AND role = 'customer' LIMIT 1`,
      [email],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Account not found." });

    const user = rows[0];

    if (user.is_verified)
      return res.status(400).json({ message: "Email is already verified." });

    if (user.otp_code !== otp)
      return res.status(400).json({ message: "Invalid verification code." });

    if (new Date() > new Date(user.otp_expires))
      return res.status(400).json({
        message: "Verification code has expired. Please request a new one.",
        code: "OTP_EXPIRED",
      });

    await db.execute(
      `UPDATE users SET is_verified = TRUE, otp_code = NULL, otp_expires = NULL WHERE id = ?`,
      [user.id],
    );

    res.json({
      message: "Email verified! Your account is now pending admin approval.",
    });
  } catch (err) {
    console.error("[verify-otp]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /api/customer/auth/resend-otp
══════════════════════════════════════════════════════════════ */
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required." });

  try {
    const [rows] = await db.execute(
      `SELECT id, name, is_verified FROM users
       WHERE email = ? AND role = 'customer' LIMIT 1`,
      [email],
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "Account not found." });

    if (rows[0].is_verified)
      return res.status(400).json({ message: "Email is already verified." });

    const otp = generateOtp();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await db.execute(
      "UPDATE users SET otp_code = ?, otp_expires = ? WHERE id = ?",
      [otp, expiry, rows[0].id],
    );

    const firstName = rows[0].name.split(" ")[0];
    await sendOtpEmail(email, otp, firstName);

    res.json({
      message: "A new verification code has been sent to your email.",
    });
  } catch (err) {
    console.error("[resend-otp]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* ══════════════════════════════════════════════════════════════
   POST /api/customer/auth/login
══════════════════════════════════════════════════════════════ */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res
      .status(400)
      .json({ message: "Email and password are required." });

  try {
    const [rows] = await db.execute(
      `SELECT id, name, email, password, role,
              phone, address, profile_photo,
              is_verified, approval_status, is_active
       FROM users WHERE email = ? AND role = 'customer' LIMIT 1`,
      [email],
    );

    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid email or password." });

    const user = rows[0];

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password." });

    if (!user.is_verified)
      return res.status(403).json({
        message: "Please verify your email before logging in.",
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });

    if (user.approval_status === "rejected")
      return res.status(403).json({
        message: "Your account was not approved. Please contact support.",
        code: "ACCOUNT_REJECTED",
      });

    if (user.approval_status === "pending")
      return res.status(403).json({
        message:
          "Your account is pending admin approval. You will be notified by email once approved.",
        code: "PENDING_APPROVAL",
      });

    if (!user.is_active)
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact support.",
        code: "ACCOUNT_INACTIVE",
      });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" },
    );

    await db.execute("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        profile_photo: user.profile_photo,
      },
    });
  } catch (err) {
    console.error("[login]", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
