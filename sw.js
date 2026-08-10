const CACHE_NAME = 'opfp-v8';
const PREFS_CACHE = 'opfp-prefs';
const STATIC_ASSETS = [
  './',
  './index.html',
  './detail.html',
  './setting.html',
  './manifest.json',
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
  './js/board-editor.js?v=3',
  './js/board-editor-mobile.js?v=3',
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
// cache.addAll은 하나라도 실패하면 전체 설치가 취소되므로
// Promise.allSettled로 개별 캐싱 → 일부 누락돼도 설치 완료 보장
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(err => {
          console.warn('[SW] 캐시 실패:', url, err);
        }))
      )
    )
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
    // iconKey 유효성 검증 — 'dark'/'light' 외 임의 값 저장 방지
    const iconKey = event.data.iconKey;
    if (iconKey !== 'dark' && iconKey !== 'light') return;
    // event.waitUntil 없이 호출하면 비동기 쓰기가 SW 종료로 중단될 수 있음 → waitUntil로 완료 보장
    event.waitUntil(setIconPref(iconKey));
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
      const iconRelPath = pref === 'light' ? './img/logo-light.png' : './img/logo-dark.png';
      // self.registration.scope 기준으로 절대 URL 생성 (서브 경로 배포 대응)
      const iconUrl = new URL(iconRelPath, self.registration.scope).href;
      const fallbackUrl = new URL('./img/logo-dark.png', self.registration.scope).href;
      try {
        const res = await fetch(iconUrl);
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          // await 없으면 SW 종료 시 캐시 쓰기 미완료 → await로 보장
          await cache.put(event.request, res.clone());
          return res;
        }
      } catch(e) {}
      const cached = await caches.match(iconUrl);
      return cached || caches.match(fallbackUrl);
    })());
    return;
  }

  // POST/PUT 등 non-GET 요청은 캐시 불가 → 그냥 네트워크로 통과
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  const isNavigate = event.request.mode === 'navigate';

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 정상 GET 응답만 캐시에 저장 (404, 500 등 오류 응답은 캐시 오염 방지)
        if (response && response.ok) {
          const clone = response.clone();
          // event.waitUntil로 캐시 쓰기 완료를 SW에 알림 (fire-and-forget 방지)
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)));
          return response;
        }
        // 서버 오류 응답 → 캐시에 유효한 버전이 있으면 그것을 우선 반환
        return caches.match(event.request).then(cached => cached || response);
      })
      .catch(() =>
        // 오프라인 또는 네트워크 오류 → 캐시 폴백
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          // 페이지 이동 요청(navigate)에만 오프라인 안내 HTML 반환
          // 이미지·JS·CSS 등에 HTML을 반환하면 파싱 오류 유발
          if (isNavigate) {
            return new Response(
              '<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2>오프라인 상태입니다</h2><p>인터넷 연결을 확인하고 다시 시도해주세요.</p></body></html>',
              { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
          }
          // 그 외 리소스는 빈 응답 반환 (이미지/스크립트에 HTML 주입 방지)
          return new Response('', { status: 503, statusText: 'Service Unavailable' });
        })
      )
  );
});
