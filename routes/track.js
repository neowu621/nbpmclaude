const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);

// sendBeacon 會以 text/plain 送出，body 可能是字串，統一解析
function body(req) {
  if (typeof req.body === 'string') { try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; } }
  return req.body || {};
}

// 開始一次造訪（整個瀏覽器造訪一次，跨頁共用）
router.post('/start', async (req, res, next) => {
  try {
    const ua = (req.headers['user-agent'] || '').slice(0, 300);
    const r = await pool.query(
      'INSERT INTO visit_sessions (user_id, user_agent) VALUES ($1,$2) RETURNING id',
      [req.user.uid, ua]
    );
    res.json({ visitSessionId: r.rows[0].id });
  } catch (e) { next(e); }
});

async function accumulate(uid, visitSessionId, path, seconds) {
  seconds = Math.max(0, Math.min(3600, parseInt(seconds, 10) || 0));
  if (!visitSessionId || !path || seconds === 0) return;
  // 確認這個工作階段屬於本人，避免竄改他人資料
  const own = await pool.query('SELECT id FROM visit_sessions WHERE id=$1 AND user_id=$2', [visitSessionId, uid]);
  if (!own.rows.length) return;
  await pool.query(
    `INSERT INTO page_views (visit_session_id, user_id, path, active_seconds)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (visit_session_id, path)
     DO UPDATE SET active_seconds = page_views.active_seconds + EXCLUDED.active_seconds, updated_at = now()`,
    [visitSessionId, uid, String(path).slice(0, 300), seconds]
  );
  await pool.query(
    'UPDATE visit_sessions SET total_active_seconds = total_active_seconds + $1, last_seen_at = now() WHERE id=$2',
    [seconds, visitSessionId]
  );
}

// 心跳：每 10~15 秒累加一次活躍秒數
router.post('/heartbeat', async (req, res, next) => {
  try {
    const b = body(req);
    await accumulate(req.user.uid, b.visitSessionId, b.path, b.seconds);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// 離站：sendBeacon 送出最終秒數並結束工作階段
router.post('/end', async (req, res, next) => {
  try {
    const b = body(req);
    await accumulate(req.user.uid, b.visitSessionId, b.path, b.seconds);
    if (b.visitSessionId) {
      await pool.query('UPDATE visit_sessions SET ended_at = now() WHERE id=$1 AND user_id=$2', [b.visitSessionId, req.user.uid]);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
