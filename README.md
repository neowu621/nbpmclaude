# Claude PM 入門手冊（nbpmclaude）

為**產品經理（PM）**設計的 Claude 入門互動手冊。純靜態網站（HTML/CSS/Vanilla JS），
繁體中文，無後端、無追蹤。

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

## 本機預覽

無需建置工具：

```bash
python -m http.server 8080
# 或
npx serve .
```

## 部署

GitHub main 分支 → Zeabur 自動部署（靜態網站服務），
網域綁定 `nbpmclaude.zeabur.app`。詳見操作說明文件第 3.4 節。

## 聲明

內容為 PM 情境原創編寫；學習方法論與 AI Fluency 4D 框架參考
[Anthropic Academy](https://www.anthropic.com/learn) 公開資源。
「Claude」與「Anthropic」為 Anthropic 之商標，本站為非官方教學資源。
