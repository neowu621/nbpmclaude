const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const {
  hashPassword, verifyPassword, signToken,
  setAuthCookie, clearAuthCookie, requireAuth, isEmail
} = require('../lib/auth');
const { sendMail } = require('../lib/mailer');

const router = express.Router();
const site = () => process.env.PUBLIC_SITE_URL || '';
const newToken = () => crypto.randomBytes(32).toString('hex');

// 註冊：檢查 Email 唯一 → 建帳號（未驗證）→ 寄確認信
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ error: '請輸入有效的 Email' });
    if (!password || password.length < 8) return res.status(400).json({ error: '密碼至少 8 碼' });

    const lower = email.toLowerCase();
    // 管理者信箱：優先讀環境變數，否則用內建預設值（確保註冊必定成為管理者，不受 env 影響）
    const isAdmin = lower === (process.env.ADMIN_EMAIL || 'neowu62@gmail.com').trim().toLowerCase();
    const hash = await hashPassword(password);
    const name = (displayName && displayName.trim()) || lower.split('@')[0];

    const existing = await pool.query('SELECT id, email_verified FROM users WHERE email=$1', [lower]);
    // 已驗證的帳號不可重複註冊
    if (existing.rows.length && existing.rows[0].email_verified) {
      return res.status(409).json({ error: '這個 Email 已經註冊過了' });
    }

    // 指定的管理者信箱：註冊即成為「已驗證的管理者」，可立即登入（免 Email 驗證）
    if (isAdmin) {
      if (existing.rows.length) {
        await pool.query(
          "UPDATE users SET password_hash=$1, display_name=$2, role='admin', email_verified=TRUE WHERE id=$3",
          [hash, name, existing.rows[0].id]
        );
      } else {
        await pool.query(
          "INSERT INTO users (email, password_hash, display_name, role, email_verified) VALUES ($1,$2,$3,'admin',TRUE)",
          [lower, hash, name]
        );
      }
      return res.json({ ok: true, admin: true, message: '管理者帳號已建立，請直接登入' });
    }

    // 一般會員：建立（或覆寫未驗證的）帳號，寄確認信
    let uid;
    if (existing.rows.length) {
      await pool.query('UPDATE users SET password_hash=$1, display_name=$2 WHERE id=$3', [hash, name, existing.rows[0].id]);
      uid = existing.rows[0].id;
    } else {
      const ins = await pool.query(
        `INSERT INTO users (email, password_hash, display_name, role, email_verified)
         VALUES ($1,$2,$3,'member',FALSE) RETURNING id`,
        [lower, hash, name]
      );
      uid = ins.rows[0].id;
    }
    const token = newToken();
    await pool.query(
      `INSERT INTO email_tokens (user_id, token, purpose, expires_at)
       VALUES ($1,$2,'verify', now() + interval '24 hours')`,
      [uid, token]
    );
    const link = `${site()}/verify.html?token=${token}`;
    await sendMail({
      to: lower,
      subject: '請確認你的 Email — Claude PM 入門手冊',
      html: `<p>歡迎加入！請點擊以下連結完成註冊：</p>
             <p><a href="${link}">${link}</a></p>
             <p>連結 24 小時內有效。若非你本人操作，請忽略此信。</p>`
    });
    res.json({ ok: true, message: '確認信已寄出，請收信完成驗證' });
  } catch (e) { next(e); }
});

// 驗證 Email
router.post('/verify', async (req, res, next) => {
  try {
    const { token } = req.body || {};
    const r = await pool.query(
      `SELECT * FROM email_tokens
       WHERE token=$1 AND purpose='verify' AND used_at IS NULL AND expires_at > now()`,
      [token]
    );
    if (!r.rows.length) return res.status(400).json({ error: '連結無效或已過期' });
    const t = r.rows[0];
    await pool.query('UPDATE users SET email_verified=TRUE WHERE id=$1', [t.user_id]);
    await pool.query('UPDATE email_tokens SET used_at=now() WHERE id=$1', [t.id]);
    res.json({ ok: true, message: '驗證成功，請登入' });
  } catch (e) { next(e); }
});

// 登入
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ error: '請輸入有效的 Email' });
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email.toLowerCase()]);
    const user = r.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return res.status(401).json({ error: 'Email 或密碼錯誤' });
    }
    if (!user.email_verified) return res.status(403).json({ error: '請先完成 Email 驗證再登入' });
    setAuthCookie(res, signToken(user));
    res.json({ ok: true, user: { name: user.display_name, role: user.role, email: user.email } });
  } catch (e) { next(e); }
});

router.post('/logout', (req, res) => { clearAuthCookie(res); res.json({ ok: true }); });

router.get('/me', requireAuth, (req, res) =>
  res.json({ user: { uid: req.user.uid, name: req.user.name, role: req.user.role } })
);

// 忘記密碼：一律回相同訊息，避免洩漏哪些 Email 存在
router.post('/forgot', async (req, res, next) => {
  try {
    const { email } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ error: '請輸入有效的 Email' });
    const r = await pool.query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (r.rows.length) {
      const token = newToken();
      await pool.query(
        `INSERT INTO email_tokens (user_id, token, purpose, expires_at)
         VALUES ($1,$2,'reset', now() + interval '2 hours')`,
        [r.rows[0].id, token]
      );
      const link = `${site()}/reset.html?token=${token}`;
      await sendMail({
        to: email.toLowerCase(),
        subject: '重設密碼 — Claude PM 入門手冊',
        html: `<p>點擊以下連結重設密碼（2 小時內有效）：</p>
               <p><a href="${link}">${link}</a></p>
               <p>若非你本人操作，請忽略此信，你的密碼不會變動。</p>`
      });
    }
    res.json({ ok: true, message: '若該 Email 已註冊，重設連結已寄出' });
  } catch (e) { next(e); }
});

// 重設密碼
router.post('/reset', async (req, res, next) => {
  try {
    const { token, password } = req.body || {};
    if (!password || password.length < 8) return res.status(400).json({ error: '密碼至少 8 碼' });
    const r = await pool.query(
      `SELECT * FROM email_tokens
       WHERE token=$1 AND purpose='reset' AND used_at IS NULL AND expires_at > now()`,
      [token]
    );
    if (!r.rows.length) return res.status(400).json({ error: '連結無效或已過期' });
    const t = r.rows[0];
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [await hashPassword(password), t.user_id]);
    await pool.query('UPDATE email_tokens SET used_at=now() WHERE id=$1', [t.id]);
    res.json({ ok: true, message: '密碼已更新，請重新登入' });
  } catch (e) { next(e); }
});

module.exports = router;
