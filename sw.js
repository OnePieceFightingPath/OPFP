const CACHE_NAME = 'opfp-v3';
const PREFS_CACHE = 'opfp-prefs';
const STATIC_ASSETS = [
  './',
  './index.html',
  './detail.html',
  './css/style.css',
  './js/app.js',
  './js/character.js',
  './js/data.js',
  './js/detail.js',
  './js/event.js',
  './js/firebase.js',
  './js/home.js',
  './js/patchnote.js',
  './js/pvppatch.js',
  './js/userauth.js',
  './js/utils.js',
  './img/logo.png',
  './img/logo-dark.png',
  './img/logo-light.png',
  './img/hero-bg.jpg'
];

// ── 아이콘 설정 저장/불러오기 (Cache API로 SW 내 영속 저장) ──
async function getIconPref() {
  try {
    const cache = await caches.open(PREFS_CACHE);
    const res = await cache.match('icon-pref');
    if (res) return await res.text();
  } catch(e) {}
  return 'dark';
}
async function setIconPref(key) {
  const cache = await caches.open(PREFS_CACHE);
  await cache.put('icon-pref', new Response(key));
}

// ── 설치 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── 활성화: 이전 캐시 삭제 (prefs 캐시는 유지) ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== PREFS_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── 메인 스레드 메시지: 아이콘 변경 ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SET_ICON') {
    setIconPref(event.data.iconKey);
  }
});

// ── fetch: logo.png 요청은 선택된 아이콘으로 대체 ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 외부 API 요청은 캐시 건너뜀
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseapp.com') ||
    url.hostname.includes('cloudfunctions.net') ||
    url.hostname.includes('cloudinary.com')
  ) {
    return;
  }

  // logo.png 요청 → 선택된 아이콘 파일로 대체
  if (url.pathname.endsWith('/img/logo.png') || url.pathname.endsWith('/logo.png')) {
    event.respondWith((async () => {
      const pref = await getIconPref();
      const iconPath = pref === 'light' ? './img/logo-light.png' : './img/logo-dark.png';
      try {
        const res = await fetch(iconPath);
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, res.clone());
          return res;
        }
      } catch(e) {}
      const cached = await caches.match(iconPath);
      return cached || caches.match('./img/logo-dark.png');
    })());
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
