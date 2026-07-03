const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../lib/auth');

const router = express.Router();
router.use(requireAuth);
// 全透明：任何已登入者都能看全部人的數據

// 概覽三卡：註冊人數、今日活躍、平均造訪時長
router.get('/overview', async (req, res, next) => {
  try {
    const users = await pool.query('SELECT COUNT(*)::int AS n FROM users WHERE email_verified');
    const active = await pool.query(
      "SELECT COUNT(DISTINCT user_id)::int AS n FROM visit_sessions WHERE started_at::date = now()::date"
    );
    const avg = await pool.query(
      'SELECT COALESCE(AVG(total_active_seconds),0)::int AS s FROM visit_sessions WHERE total_active_seconds > 0'
    );
    res.json({ users: users.rows[0].n, activeToday: active.rows[0].n, avgSessionSeconds: avg.rows[0].s });
  } catch (e) { next(e); }
});

// 每人總停留 + 每人最久頁面
router.get('/people', async (req, res, next) => {
  try {
    const r = await pool.query(`
      SELECT u.display_name, u.email,
        COALESCE(SUM(pv.active_seconds),0)::int AS total_seconds,
        (SELECT p2.path FROM page_views p2
           WHERE p2.user_id = u.id
           GROUP BY p2.path ORDER BY SUM(p2.active_seconds) DESC LIMIT 1) AS top_path
      FROM users u
      LEFT JOIN page_views pv ON pv.user_id = u.id
      GROUP BY u.id
      ORDER BY total_seconds DESC`);
    res.json({ people: r.rows });
  } catch (e) { next(e); }
});

// 全站最黏頁面排行
router.get('/pages', async (req, res, next) => {
  try {
    const r = await pool.query(`
      SELECT path,
        SUM(active_seconds)::int AS total_seconds,
        COUNT(DISTINCT user_id)::int AS viewers,
        (SUM(active_seconds) / GREATEST(COUNT(DISTINCT user_id),1))::int AS avg_seconds
      FROM page_views
      GROUP BY path
      ORDER BY total_seconds DESC
      LIMIT 30`);
    res.json({ pages: r.rows });
  } catch (e) { next(e); }
});

module.exports = router;
