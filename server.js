const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { pool, init, purgeOld } = require('./db');
const { hashPassword, verifyToken } = require('./lib/auth');
const { rateLimit } = require('./lib/ratelimit');

const app = express();
app.set('trust proxy', 1);

const origins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true, credentials: true }));

// 同時解析 application/json 與 text/plain（sendBeacon 用後者，避免 CORS 預檢）
app.use(express.json({ type: ['application/json', 'text/plain'], limit: '32kb' }));
app.use(cookieParser());

app.get('/health', (req, res) => res.json({ ok: true, service: 'nbpmtracker' }));

// API（登入/註冊等加上速率限制，防暴力破解）
app.use('/api/auth', rateLimit({ windowMs: 300000, max: 20, key: 'auth' }), require('./routes/auth'));
app.use('/api/track', require('./routes/track'));
app.use('/api/stats', require('./routes/stats'));

// ── 伺服器端守門：未登入者不得取得手冊頁面 ──
// 開放（免登入）：登入相關頁、靜態資源、追蹤腳本
const OPEN = [
  /^\/login\.html/, /^\/verify\.html/, /^\/reset\.html/,
  /^\/assets\//, /^\/tracker\.js/, /^\/favicon/, /^\/robots\.txt/
];
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const p = req.path;
  if (OPEN.some(re => re.test(p))) return next();
  // 只守「頁面」請求（根路徑、.html、或無副檔名）；資源類放行由 static 處理
  const isPage = p === '/' || p.endsWith('.html') || !path.extname(p);
  if (!isPage) return next();
  const token = req.cookies && req.cookies.token;
  if (token && verifyToken(token)) return next();
  return res.redirect('/login.html?next=' + encodeURIComponent(p));
});

// 通過守門後才提供手冊與前端頁面
app.use(express.static(path.join(__dirname, 'public')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: '伺服器錯誤' });
});

// 首次啟動自動建立管理者帳號（已存在則略過）
async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!email) return;
  const r = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
  if (r.rows.length) {
    // 已存在：只確保「管理者角色 + 已驗證」，不覆寫密碼
    // （避免每次重啟就把使用者自行設定/重設的密碼洗掉，導致登不進去）
    await pool.query(
      "UPDATE users SET role='admin', email_verified=TRUE WHERE email=$1",
      [email]
    );
    console.log('管理者帳號已就緒:', email);
  } else {
    // 不存在：需有 ADMIN_PASSWORD 才能建立初始管理者（建立後可自行改密碼，之後不會再被覆寫）
    const pw = (process.env.ADMIN_PASSWORD || '').trim();
    if (!pw) { console.log('管理者不存在且未設 ADMIN_PASSWORD，略過建立'); return; }
    const hash = await hashPassword(pw);
    await pool.query(
      "INSERT INTO users (email, password_hash, display_name, role, email_verified) VALUES ($1,$2,'管理者','admin',TRUE)",
      [email, hash]
    );
    console.log('已建立管理者帳號:', email);
  }
}

const PORT = process.env.PORT || 8080;
init()
  .then(ensureAdmin)
  .then(() => {
    setInterval(() => purgeOld().catch(e => console.error('清除舊資料失敗', e)), 24 * 3600 * 1000);
    app.listen(PORT, () => console.log('nbpmtracker API 啟動於 port', PORT));
  })
  .catch(e => { console.error('啟動失敗', e); process.exit(1); });
