// 簡易記憶體速率限制（防暴力破解登入/註冊）
const buckets = new Map();

function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return req.ip || 'unknown';
}

function rateLimit({ windowMs = 300000, max = 20, key = 'rl' } = {}) {
  return function (req, res, next) {
    const k = key + ':' + clientIp(req);
    const now = Date.now();
    let b = buckets.get(k);
    if (!b || now > b.reset) { b = { count: 0, reset: now + windowMs }; buckets.set(k, b); }
    b.count++;
    if (b.count > max) {
      const retry = Math.ceil((b.reset - now) / 1000);
      res.set('Retry-After', String(retry));
      return res.status(429).json({ error: '嘗試次數過多，請 ' + retry + ' 秒後再試' });
    }
    next();
  };
}

// 定期清理過期紀錄，避免記憶體無限成長
const timer = setInterval(function () {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
}, 600000);
if (timer.unref) timer.unref();

module.exports = { rateLimit };
