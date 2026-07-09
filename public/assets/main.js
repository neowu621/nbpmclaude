/* Claude PM 入門手冊 — 共用互動腳本 */

/* 版本號（每修改一次 +1）；顯示於頂部 Head，並與後端 /health build 對齊 */
var NBPM_VERSION = 'v20260709_001';

document.addEventListener('DOMContentLoaded', function () {
  /* 注入頂部 Head：站名（連回首頁）+ 版本號 */
  if (!document.querySelector('.topbar')) {
    var bar = document.createElement('div');
    bar.className = 'topbar';
    bar.innerHTML = '<a class="topbar-title" href="/index.html">Claude <span>PM</span> 入門手冊</a>' +
                    '<span class="topbar-ver" title="版本號">' + NBPM_VERSION + '</span>';
    document.body.insertBefore(bar, document.body.firstChild);
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
