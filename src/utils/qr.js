const crypto = require("crypto");

function createQrToken(sessionId, version, expiresAt) {
  const payload = `${sessionId}.${version}.${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", process.env.QR_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(JSON.stringify({
    sessionId,
    version,
    expiresAt,
    signature
  })).toString("base64url");
}

function verifyQrToken(token) {
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));

    if (!decoded.sessionId || !decoded.version || !decoded.expiresAt || !decoded.signature) {
      return null;
    }

    const payload = `${decoded.sessionId}.${decoded.version}.${decoded.expiresAt}`;
    const expected = crypto
      .createHmac("sha256", process.env.QR_SECRET)
      .update(payload)
      .digest("hex");

    if (!crypto.timingSafeEqual(
      Buffer.from(decoded.signature),
      Buffer.from(expected)
    )) return null;

    if (Date.now() > new Date(decoded.expiresAt).getTime()) return null;

    return decoded;
  } catch {
    return null;
  }
}

module.exports = { createQrToken, verifyQrToken };
