/*
|--------------------------------------------------------------------------
| QR Scan Rate Limit Middleware
|--------------------------------------------------------------------------
|
| Prevents a student from sending too many QR scan requests
| in a short period of time.
|
| This is a simple in-memory limiter.
|
|--------------------------------------------------------------------------
*/

const WINDOW_MS = 60 * 1000;

const MAX_REQUESTS = 10;

const requests = new Map();

/*
|--------------------------------------------------------------------------
| Cleanup
|--------------------------------------------------------------------------
*/

function cleanup() {
  const now = Date.now();

  for (const [key, data] of requests.entries()) {
    if (now - data.startTime >= WINDOW_MS) {
      requests.delete(key);
    }
  }
}

/*
|--------------------------------------------------------------------------
| Rate Limit Middleware
|--------------------------------------------------------------------------
*/

function qrScanRateLimit(req, res, next) {
  cleanup();

  const userId =
    req.user?.id ||
    req.user?.userId ||
    req.user?.studentId ||
    req.ip;

  const key = String(userId);

  const now = Date.now();

  let record = requests.get(key);

  /*
  |--------------------------------------------------------------------------
  | Start New Window
  |--------------------------------------------------------------------------
  */

  if (!record || now - record.startTime >= WINDOW_MS) {
    record = {
      startTime: now,
      count: 0,
    };
  }

  /*
  |--------------------------------------------------------------------------
  | Check Limit
  |--------------------------------------------------------------------------
  */

  if (record.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil(
      (WINDOW_MS - (now - record.startTime)) / 1000
    );

    return res.status(429).json({
      message:
        "Too many QR scan attempts. Please try again later.",
      retryAfter,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | Increment Request Count
  |--------------------------------------------------------------------------
  */

  record.count += 1;

  requests.set(key, record);

  next();
}

module.exports = {
  qrScanRateLimit,
};