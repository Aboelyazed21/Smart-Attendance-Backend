const rateLimit = require("express-rate-limit");

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many scan attempts. Try again shortly." }
});

module.exports = { scanLimiter };
