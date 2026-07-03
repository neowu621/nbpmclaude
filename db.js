const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : false
});

async function init() {
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);
}

// 每日清除超過保存期限（預設 360 天）的資料
async function purgeOld() {
  const days = parseInt(process.env.RETENTION_DAYS || '360', 10);
  await pool.query(
    `DELETE FROM visit_sessions WHERE started_at < now() - ($1 || ' days')::interval`,
    [days]
  );
}

module.exports = { pool, init, purgeOld };
