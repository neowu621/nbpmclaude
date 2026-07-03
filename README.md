# Claude PM 入門手冊（nbpmclaude）

為**產品經理（PM）**設計的 Claude 入門互動手冊。繁體中文。

**全端單一服務**：手冊前端（`public/`，HTML/CSS/Vanilla JS）＋ Node.js 後端
（帳號登入、Email 驗證、行為追蹤、統計 API），同網域運作，登入 cookie 免跨網域設定。

🌐 **正式站**：https://nbpmclaude.zeabur.app

## 內容架構

| 區塊 | 路徑 | 內容 |
|---|---|---|
| 📖 概念學習 | `/learn/` | 八章核心概念：AI 原理、工作模式、Prompt、Agentic、4D 框架、負責任使用 |
| 🧭 引導式學習 | `/tools/` | 四個互動工具：模式診斷、Prompt 組裝器、4D 自評、Agentic 模擬器 |
| 🛠️ 任務實作 | `/tasks/` | 15 個真實 PM 任務（可篩選），附可複製 Prompt 與驗收提醒 |
| 📚 協作資源 | `/resources/` | Prompt 資料庫、案例、詞彙表、官方資源、團隊導入工具包 |

完整結構見 [docs/網站架構地圖.md](docs/網站架構地圖.md)，
操作與維護方式見 [docs/操作說明文件.md](docs/操作說明文件.md)。

## 目錄結構

```
public/        手冊前端（index / learn / tools / tasks / resources / assets / 登入頁 / tracker.js）
server.js      Express 入口：伺服器端登入閘門 + 靜態服務 + API 掛載
routes/        auth（註冊/驗證/登入/忘記密碼/重設）、track、stats
lib/           auth（bcrypt + JWT + cookie）、mailer（Gmail SMTP）、ratelimit
db/schema.sql  PostgreSQL 資料表（啟動自動套用）
.env.example   環境變數範本
```

## 本機執行

```bash
npm install
cp .env.example .env   # 填入 DATABASE_URL / JWT_SECRET / GMAIL_* 等
npm start              # http://localhost:8080
```

## 部署（Zeabur，單一 Node 服務）

GitHub main 分支 → Zeabur 以 Node 服務建置（`npm start`），
綁定 PostgreSQL 並設定環境變數（見 `.env.example`），網域綁定 `nbpmclaude.zeabur.app`。
所有 API 與手冊頁同網域，前端呼叫 `/api/...` 相對路徑即可。

## 聲明

內容為 PM 情境原創編寫；學習方法論與 AI Fluency 4D 框架參考
[Anthropic Academy](https://www.anthropic.com/learn) 公開資源。
「Claude」與「Anthropic」為 Anthropic 之商標，本站為非官方教學資源。
