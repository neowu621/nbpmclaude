-- Claude PM 入門手冊 追蹤系統資料表
-- 全部使用 IF NOT EXISTS，可重複執行（每次啟動自動套用）

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  display_name   TEXT NOT NULL,
  role           TEXT NOT NULL DEFAULT 'member',   -- 'member' | 'admin'
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 造訪工作階段：一次瀏覽器造訪（可跨多頁）
CREATE TABLE IF NOT EXISTS visit_sessions (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at             TIMESTAMPTZ,
  total_active_seconds INTEGER NOT NULL DEFAULT 0,
  user_agent           TEXT
);

-- 頁面停留：每個工作階段 × 每個頁面一列，累加活躍秒數
CREATE TABLE IF NOT EXISTS page_views (
  id               BIGSERIAL PRIMARY KEY,
  visit_session_id BIGINT NOT NULL REFERENCES visit_sessions(id) ON DELETE CASCADE,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  path             TEXT NOT NULL,
  entered_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_seconds   INTEGER NOT NULL DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (visit_session_id, path)
);

-- Email 驗證 / 密碼重設 一次性權杖
CREATE TABLE IF NOT EXISTS email_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  purpose    TEXT NOT NULL,                          -- 'verify' | 'reset'
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_views_user   ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_path   ON page_views(path);
CREATE INDEX IF NOT EXISTS idx_visits_user       ON visit_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_started    ON visit_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_tokens_token      ON email_tokens(token);
