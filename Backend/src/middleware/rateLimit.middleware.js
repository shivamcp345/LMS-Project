const buckets = new Map();
let lastCleanup = Date.now();

function rateLimit({ windowMs, max, message = "Too many requests. Please try again later." }) {
  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup > 60_000) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      lastCleanup = now;
    }

    const key = `${req.ip || req.socket.remoteAddress || "unknown"}:${req.baseUrl}${req.path}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
}

module.exports = rateLimit;
