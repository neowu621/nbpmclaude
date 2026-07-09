/* Claude PM 入門手冊 — 共用互動腳本 */

/* 版本號（每修改一次 +1）；顯示於頂部 Head，並與後端 /health build 對齊 */
var NBPM_VERSION = 'v20260709_005';

document.addEventListener('DOMContentLoaded', function () {
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
