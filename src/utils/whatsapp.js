// ============================================================
// WHATSAPP SENDING (Twilio WhatsApp API)
// Official provider only. No automation, no scraping.
// Credentials stay in backend environment variables and are
// never exposed to the frontend. Only message SIDs and
// delivery status are logged — never message bodies.
// ============================================================

function isWhatsAppConfigured() {
  if (
    process.env.WHATSAPP_ENABLED !== "true"
  ) {
    return false;
  }

  const provider = String(
    process.env.WHATSAPP_PROVIDER || "twilio"
  )
    .trim()
    .toLowerCase();

  if (provider !== "twilio") {
    return false;
  }

  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  );
}

function normalizeFrom(value) {
  const text = String(value || "").trim();

  return text.startsWith("whatsapp:")
    ? text
    : `whatsapp:${text}`;
}

async function sendWhatsAppMessage(
  toE164,
  body
) {
  const accountSid =
    process.env.TWILIO_ACCOUNT_SID;

  const authToken =
    process.env.TWILIO_AUTH_TOKEN;

  const from = normalizeFrom(
    process.env.TWILIO_WHATSAPP_FROM
  );

  if (!accountSid || !authToken || !from) {
    throw new Error(
      "WhatsApp provider is not configured"
    );
  }

  const credentials = Buffer.from(
    `${accountSid}:${authToken}`
  ).toString("base64");

  const params = new URLSearchParams({
    To: `whatsapp:${toE164}`,
    From: from,
    Body: body,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    }
  );

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Twilio request failed with status ${response.status}`
    );
  }

  return { sid: data.sid || null };
}

module.exports = {
  isWhatsAppConfigured,
  sendWhatsAppMessage,
};
