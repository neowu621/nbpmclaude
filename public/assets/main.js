/* Claude PM 入門手冊 — 共用互動腳本 */

/* 版本號（每修改一次 +1）；顯示於頂部 Head，並與後端 /health build 對齊 */
var NBPM_VERSION = 'v20260709_005';

/* 詞彙 tooltip 資料：術語 → { id:詞彙表錨點, t:一句白話 } */
var NBPM_TERMS = {
  'Agentic': { id: 'agent', t: '能自己拆解目標、使用工具、循環執行直到完成的 AI。你的控制點是權限與檢核點。' },
  'Agent': { id: 'agent', t: '能自主拆解目標、使用工具、循環完成任務的 AI 系統。從「問答」升級到「委託」。' },
  'MCP': { id: 'mcp', t: '讓 AI 安全連接外部工具與資料（Jira、Notion…）的開放標準，像 AI 世界的 USB 介面。' },
  'Context Window': { id: 'context-window', t: '模型單次能記住的內容上限，像一張有限大小的工作桌；太長會把早期內容擠出去。' },
  'Context': { id: 'context-window', t: '你給 AI 的背景資訊。給得越足，產出越貼近你的實際情況。' },
  'Token': { id: 'token', t: '模型處理文字的最小單位，一個中文字約 1～2 個；API 按 token 計費。' },
  'LLM': { id: 'llm', t: '用海量文字訓練、預測下一個字的 AI 模型，Claude 就是一個 LLM。' },
  'RAG': { id: 'rag', t: '回答前先從你的知識庫檢索再作答，讓 AI「開書考」而不是「憑記憶答」。' },
  '幻覺': { id: 'hallucination', t: '模型自信地生成看似合理但不存在的內容：假數據、假論文。對外事實一律查證。' },
  'Projects': { id: 'project', t: 'Claude 中可上傳文件、設自訂指令的持續工作空間，讓每次對話自帶你的脈絡。' },
  'Projects（Claude）': { id: 'project', t: 'Claude 中可上傳文件、設自訂指令的持續工作空間，讓每次對話自帶你的脈絡。' },
  'System Prompt': { id: 'system-prompt', t: '對話開始前設定的底層指令，決定 AI 的角色、規則與邊界，用戶通常看不到。' },
  'Human-in-the-loop': { id: 'agent', t: '流程中保留「人工審核」的節點——AI 做到關鍵處停下來等你確認再繼續。' },
  'Claude Code': { id: 'agent', t: 'Claude 的指令列（終端機）版本，能直接讀寫檔案、跑指令，是最進階的 Code 模式工具。' }
};

/* 把頁面中「首次出現」的術語自動加上 hover 說明並連到詞彙表（詞彙表本身不加） */
function nbpmGlossary() {
  if (/\/resources\/glossary/.test(location.pathname)) return;
  var terms = Object.keys(NBPM_TERMS).sort(function (a, b) { return b.length - a.length; });
  var done = {};
  var scope = document.querySelector('main.article') || document.querySelector('main') || document.body;
  if (!scope) return;
  var SKIP = { A: 1, BUTTON: 1, CODE: 1, PRE: 1, H1: 1, H2: 1, H3: 1, H4: 1, SCRIPT: 1, STYLE: 1, SUMMARY: 1 };
  function inSkip(node) {
    for (var el = node.parentNode; el && el !== scope; el = el.parentNode) {
      if (SKIP[el.nodeName]) return true;
      if (el.classList && (el.classList.contains('sk-code') || el.classList.contains('gl-term') ||
        el.classList.contains('cp-btn') || el.classList.contains('crumbs'))) return true;
    }
    return false;
  }
  var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
  var nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(function (node) {
    if (!node.nodeValue || inSkip(node)) return;
    var txt = node.nodeValue;
    for (var i = 0; i < terms.length; i++) {
      var term = terms[i], info = NBPM_TERMS[term];
      if (done[info.id]) continue;
      var idx = txt.indexOf(term);
      if (idx < 0) continue;
      if (/^[A-Za-z]/.test(term)) {
        // ASCII 詞需詞界，避免 Agent 命中 Agentic、Context 命中 Contextual
        var b = txt.charAt(idx - 1), a2 = txt.charAt(idx + term.length);
        if (/[A-Za-z]/.test(b) || /[A-Za-z]/.test(a2)) continue;
      }
      var a = document.createElement('a');
      a.className = 'gl-term';
      a.href = '/resources/glossary.html#' + info.id;
      a.setAttribute('data-tip', info.t);
      a.textContent = term;
      var post = document.createTextNode(txt.slice(idx + term.length));
      node.nodeValue = txt.slice(0, idx);
      node.parentNode.insertBefore(post, node.nextSibling);
      node.parentNode.insertBefore(a, post);
      done[info.id] = 1;
      break;
    }
  });
}

document.addEventListener('DOMContentLoaded', function () {
  /* 注入詞彙 tooltip 樣式（放 JS 內，避免動到 style.css 快取） */
  if (!document.getElementById('nbpm-gl-css')) {
    var st = document.createElement('style');
    st.id = 'nbpm-gl-css';
    st.textContent =
      '.gl-term{border-bottom:1px dashed var(--accent);color:inherit;text-decoration:none;cursor:help;position:relative}' +
      '.gl-term::after{content:attr(data-tip);position:absolute;left:0;bottom:calc(100% + 9px);width:250px;max-width:74vw;' +
      'background:#1e2430;color:#e6edf3;font-size:12.5px;line-height:1.65;font-weight:400;text-align:left;padding:9px 11px;' +
      'border-radius:8px;opacity:0;visibility:hidden;transform:translateY(4px);transition:.15s;z-index:120;' +
      'pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,.2);white-space:normal}' +
      '.gl-term::before{content:"";position:absolute;left:16px;bottom:calc(100% + 3px);border:6px solid transparent;' +
      'border-top-color:#1e2430;opacity:0;visibility:hidden;transition:.15s;z-index:121}' +
      '.gl-term:hover::after,.gl-term:hover::before,.gl-term:focus::after,.gl-term:focus::before{opacity:1;visibility:visible;transform:translateY(0)}';
    document.head.appendChild(st);
  }

  /* 注入頂部 Head：站名（連回首頁）+ 版本號 */
  if (!document.querySelector('.topbar')) {
    var bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML = '<a class="topbar-title" href="/index.html">Claude <span>PM</span> 入門手冊</a>' +
                    '<span class="topbar-ver" id="nbpm-ver" title="版本號">' + NBPM_VERSION + '</span>';
    document.body.insertBefore(bar, document.body.firstChild);
    /* 版本號以後端 /health 的 build 為準（即時抓）；日後改版只需改後端一行，不必再破前端快取 */
    fetch('/health', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var v = document.getElementById('nbpm-ver');
      if (v && j && j.build) v.textContent = j.build;
    }).catch(function () {});
  }

  /* 側欄最下方加入「決策思維鏈」入口（進階頁），與上方其他項目以分隔線隔開；同網域用絕對路徑 */
  var menu = document.querySelector('.nav-menu');
  if (menu && !menu.querySelector('.nav-dc')) {
    var onDC = location.pathname.indexOf('/learn/pm-decision-chain') !== -1;
    var sep = document.createElement('div');
    sep.className = 'nav-sep';
    var dc = document.createElement('a');
    dc.className = 'nav-link nav-dc' + (onDC ? ' active' : '');
    dc.href = '/learn/pm-decision-chain.html';
    dc.textContent = '決策思維鏈';
    menu.appendChild(sep);   /* 分隔線 */
    menu.appendChild(dc);    /* 置於最下面 */
    if (onDC) menu.querySelectorAll('a.nav-link').forEach(function (a) { if (a !== dc) a.classList.remove('active'); });
  }

  /* 複製按鈕：把最近的 pre 內容複製到剪貼簿 */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.parentElement.querySelector('pre');
      if (!pre) return;
      navigator.clipboard.writeText(pre.innerText).then(function () {
        btn.textContent = '已複製 ✓';
        btn.classList.add('copied');
        setTimeout(function () {
          btn.textContent = '複製';
          btn.classList.remove('copied');
        }, 1800);
      });
    });
  });

  /* 詞彙 tooltip：自動標註首次出現的術語 */
  try { nbpmGlossary(); } catch (e) { /* 靜默失敗，不影響其他功能 */ }
});

/* 任務頁篩選（依 data-* 屬性） */
function setupTaskFilters() {
  var state = { role: 'all', level: 'all', mode: 'all' };
  function apply() {
    document.querySelectorAll('.task').forEach(function (t) {
      var ok =
        (state.role === 'all' || t.dataset.role === state.role) &&
        (state.level === 'all' || t.dataset.level === state.level) &&
        (state.mode === 'all' || t.dataset.mode === state.mode);
      t.style.display = ok ? '' : 'none';
    });
    var visible = Array.from(document.querySelectorAll('.task')).filter(function (t) {
      return t.style.display !== 'none';
    }).length;
    var counter = document.getElementById('task-count');
    if (counter) counter.textContent = '符合條件的任務：' + visible + ' 項';
  }
  document.querySelectorAll('.fbtn').forEach(function (b) {
    b.addEventListener('click', function () {
      var group = b.dataset.group;
      state[group] = b.dataset.val;
      document.querySelectorAll('.fbtn[data-group="' + group + '"]').forEach(function (x) {
        x.classList.remove('on');
      });
      b.classList.add('on');
      apply();
    });
  });
  apply();
}
