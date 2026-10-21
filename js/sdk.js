/* Firebase SDK 폴백 로더 — 이미 로드된 모듈은 건너뛰고,
   gstatic 실패 시 jsDelivr → unpkg 순으로 재시도한다. */
(function () {
  'use strict';
  var V = '10.12.2';
  var mods = [
    { key: 'app', file: 'firebase-app-compat' },
    { key: 'auth', file: 'firebase-auth-compat' },
    { key: 'firestore', file: 'firebase-firestore-compat' },
    { key: 'messaging', file: 'firebase-messaging-compat' }
  ];
  function loaded(key) {
    return !!(window.firebase && (
      (key === 'app' && window.firebase.apps) ||
      (key === 'auth' && window.firebase.auth) ||
      (key === 'firestore' && window.firebase.firestore) ||
      (key === 'messaging' && window.firebase.messaging)
    ));
  }
  function cdn(host, file) {
    if (host === 'gstatic') return 'https://www.gstatic.com/firebasejs/' + V + '/' + file + '.js';
    if (host === 'jsdelivr') return 'https://cdn.jsdelivr.net/npm/firebase@' + V + '/' + file + '.js';
    return 'https://www.unpkg.com/firebase@' + V + '/' + file + '.js';
  }
  function inject(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  function loadOne(i) {
    if (i >= mods.length) return Promise.resolve();
    var m = mods[i];
    if (loaded(m.key)) return loadOne(i + 1);
    return inject(cdn('gstatic', m.file))
      .catch(function () { return inject(cdn('jsdelivr', m.file)); })
      .catch(function () { return inject(cdn('unpkg', m.file)); })
      .then(function () { return loadOne(i + 1); })
      .catch(function () { return loadOne(i + 1); });
  }
  loadOne(0);
})();
