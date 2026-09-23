const crypto = require("crypto");

// ============================================================
// MAILER (nodemailer abstraction)
//
// Configuration (environment variables, never hardcoded):
//   MAIL_HOST, MAIL_PORT, MAIL_SECURE, MAIL_USER, MAIL_PASS,
//   MAIL_FROM, FRONTEND_URL
//
// If MAIL_HOST is not configured, the service runs in
// development mode: the reset link is written to the server
// console and nothing is sent. The reset token itself is
// NEVER included in API responses.
// ============================================================

let cachedTransporter = null;

function isMailConfigured() {
  return Boolean(
    process.env.MAIL_HOST &&
      process.env.MAIL_USER &&
      process.env.MAIL_PASS
  );
}

function getTransporter() {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  // Lazy require so the application boots even when
  // nodemailer is not installed (dev fallback below).
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  const nodemailer = require("nodemailer");

  cachedTransporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure:
      String(
        process.env.MAIL_SECURE || "false"
      ).toLowerCase() === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  return cachedTransporter;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildResetLink(token) {
  const base = String(
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/+$/, "");

  return `${base}/reset-password?token=${encodeURIComponent(
    token
  )}`;
}

async function sendPasswordResetEmail({
  to,
  firstName,
  token,
  expiresMinutes,
}) {
  const resetLink = buildResetLink(token);
  const safeName = escapeHtml(firstName || "there");

  const subject = "Reset your Attendify password";

  const text =
    `Hello ${firstName || "there"},\n\n` +
    `You requested a password reset for your Attendify account.\n\n` +
    `Reset your password using this link (valid for ${expiresMinutes} minutes):\n` +
    `${resetLink}\n\n` +
    `If you did not request this, ignore this message. ` +
    `Never share this link with anyone.\n\n` +
    `Attendify - Smart Attendance System`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
      <div style="background: #0f2851; border-radius: 12px 12px 0 0; padding: 22px 26px;">
        <div style="color: #ffffff; font-size: 20px; font-weight: 800;">Attendify</div>
        <div style="color: rgba(255,255,255,0.72); font-size: 11px; letter-spacing: 1.5px;">SMART ATTENDANCE SYSTEM</div>
      </div>
      <div style="border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px; padding: 26px;">
        <h2 style="margin: 0 0 10px; font-size: 18px;">Reset your password</h2>
        <p style="margin: 0 0 8px; font-size: 14px; color: #475569;">Hello ${safeName},</p>
        <p style="margin: 0 0 18px; font-size: 14px; color: #475569;">
          You requested a password reset for your Attendify account.
          This link is valid for <strong>${expiresMinutes} minutes</strong>
          and can be used only once.
        </p>
        <a href="${resetLink}" style="display: inline-block; background: #0f2851; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 22px; border-radius: 8px;">
          Reset Password
        </a>
        <p style="margin: 18px 0 0; font-size: 12px; color: #94a3b8; word-break: break-all;">
          If the button does not work, copy this link:<br>${resetLink}
        </p>
        <p style="margin: 14px 0 0; font-size: 12px; color: #94a3b8;">
          If you did not request this, ignore this message.
          Never share this link with anyone. Attendify will never
          ask for your password by email.
        </p>
      </div>
    </div>
  `;

  if (!isMailConfigured()) {
    console.log(
      "[mailer:dev] MAIL_HOST is not configured - " +
        `reset link for ${to}: ${resetLink}`
    );

    return { delivered: false, devMode: true };
  }

  await getTransporter().sendMail({
    from:
      process.env.MAIL_FROM ||
      `"Attendify" <${process.env.MAIL_USER}>`,
    to,
    subject,
    text,
    html,
  });

  return { delivered: true, devMode: false };
}

function hashResetToken(token) {
  return crypto
    .createHash("sha256")
    .update(String(token))
    .digest("hex");
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = {
  isMailConfigured,
  buildResetLink,
  sendPasswordResetEmail,
  hashResetToken,
  generateResetToken,
};
