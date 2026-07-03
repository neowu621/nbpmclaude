const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function hashPassword(pw) { return bcrypt.hash(pw, 12); }
function verifyPassword(pw, hash) { return bcrypt.compare(pw, hash); }

function signToken(user) {
  return jwt.sign(
    { uid: user.id, role: user.role, name: user.display_name },
    SECRET,
    { expiresIn: '7d' }
  );
}
function verifyToken(token) {
  try { return jwt.verify(token, SECRET); } catch (e) { return null; }
}

function cookieOpts() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 3600 * 1000,
    path: '/'
  };
}
function setAuthCookie(res, token) { res.cookie('token', token, cookieOpts()); }
function clearAuthCookie(res) { res.clearCookie('token', cookieOpts()); }

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies.token;
  const payload = token && verifyToken(token);
  if (!payload) return res.status(401).json({ error: '未登入' });
  req.user = payload;
  next();
}
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: '需要管理者權限' });
  next();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isEmail(s) { return typeof s === 'string' && s.length <= 254 && EMAIL_RE.test(s); }

module.exports = {
  hashPassword, verifyPassword, signToken, verifyToken,
  setAuthCookie, clearAuthCookie, requireAuth, requireAdmin, isEmail
};
