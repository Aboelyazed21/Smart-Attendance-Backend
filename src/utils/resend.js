// ============================================================
// RESEND EMAIL SENDER (weekly attendance reports)
// Uses process.env.RESEND_API_KEY only — never hardcoded,
// logged, or returned by any API. Lazy client so the app
// boots even when the key is missing. Returns outcome
// objects ({ success, messageId?, error? }), never throws
// for transport problems.
// ============================================================

let cachedClient = null;

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

// Production should set EMAIL_FROM to a verified domain
// sender, e.g. "Smart Attendance <reports@your-domain>".
// Falls back to the Resend testing sender (delivers only
// to the Resend account owner until a domain is verified).
function getFromAddress() {
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }

  return "Smart Attendance <onboarding@resend.dev>";
}

function getAppName() {
  return process.env.APP_NAME || "Smart Attendance";
}

function isValidEmail(email) {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  // Lazy require so boot never fails on a missing SDK.
  // eslint-disable-next-line global-require
  const { Resend } = require("resend");

  cachedClient = new Resend(process.env.RESEND_API_KEY);

  return cachedClient;
}

async function sendResendEmail({ to, subject, html }) {
  if (!isValidEmail(to)) {
    return {
      success: false,
      error: "Invalid recipient email address",
    };
  }

  if (!subject || !html) {
    return {
      success: false,
      error: "Subject and HTML body are required",
    };
  }

  let client;

  try {
    client = getClient();
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromAddress(),
      to: [to.trim()],
      subject,
      html,
    });

    if (error) {
      return {
        success: false,
        error: error.message || "Resend API error",
      };
    }

    return {
      success: true,
      messageId: (data && data.id) || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

module.exports = {
  isResendConfigured,
  isValidEmail,
  getFromAddress,
  getAppName,
  sendResendEmail,
};
