// Claude PM 入門手冊 — 前端追蹤埋點
// 用法：在每個頁面 </body> 前加入：
//   <script>window.NBPM_API='https://你的API網址';</script>
//   <script src="/tracker.js"></script>
(function () {
  var API = window.NBPM_API || '';
  var HEARTBEAT_MS = 12000;   // 每 12 秒回報一次
  var IDLE_MS = 60000;        // 逾 60 秒無操作視為閒置，暫停計時
  var MIN_FLUSH = 10;         // 累積滿 10 秒才送出

  function post(path, data, beacon) {
    var url = API + path;
    if (beacon && navigator.sendBeacon) {
      // text/plain 為 CORS 簡單請求，離站時最可靠
      navigator.sendBeacon(url, new Blob([JSON.stringify(data)], { type: 'text/plain' }));
      return Promise.resolve();
    }
    return fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(data || {})
    });
  }

  // 先確認登入；未登入導向登入頁
  fetch(API + '/api/auth/me', { credentials: 'include' })
    .then(function (r) { if (!r.ok) throw 0; return r.json(); })
    .then(start)
    .catch(function () {
      if (!/\/login\.html$/.test(location.pathname)) {
        var next = encodeURIComponent(location.pathname + location.search);
        location.href = '/login.html?next=' + next;
      }
    });

  function start() {
    var path = location.pathname;
    var visitId = sessionStorage.getItem('nbpm_visit');
    var pending = 0, lastActive = Date.now(), lastBeat = Date.now();

    ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'].forEach(function (ev) {
      window.addEventListener(ev, function () { lastActive = Date.now(); }, { passive: true });
    });

    function ensureVisit() {
      if (visitId) return Promise.resolve(visitId);
      return post('/api/track/start', {}).then(function (r) { return r.json(); }).then(function (d) {
        visitId = String(d.visitSessionId);
        sessionStorage.setItem('nbpm_visit', visitId);
        return visitId;
      });
    }

    function measure() {
      var now = Date.now();
      var visible = document.visibilityState === 'visible';
      var active = (now - lastActive) < IDLE_MS;
      if (visible && active) pending += Math.round((now - lastBeat) / 1000);
      lastBeat = now;
    }

    setInterval(function () {
      measure();
      if (pending >= MIN_FLUSH) {
        var secs = pending; pending = 0;
        ensureVisit().then(function (id) {
          post('/api/track/heartbeat', { visitSessionId: id, path: path, seconds: secs });
        });
      }
    }, HEARTBEAT_MS);

    function flush() {
      measure();
      if (visitId && pending > 0) {
        post('/api/track/end', { visitSessionId: visitId, path: path, seconds: pending }, true);
        pending = 0;
      }
    }
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);

    ensureVisit();
  }
})();
