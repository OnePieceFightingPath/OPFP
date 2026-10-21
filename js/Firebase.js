/* ============================================================
   FPP v2 — Firebase.js (데이터 접근 레이어)
   기존 Firebase 프로젝트(fighting-path-patch)의 실제 데이터에 연결.
   읽기 위주 + Firestore 규칙이 허용하는 쓰기만 수행.
   ============================================================ */
(function () {
  'use strict';

  var CFG = {
    apiKey: 'AIzaSyCF1o7_h-70-HwfC_5YoxOmTJFTBfFa04w',
    authDomain: 'fighting-path-patch.firebaseapp.com',
    projectId: 'fighting-path-patch',
    storageBucket: 'fighting-path-patch.firebasestorage.app',
    messagingSenderId: '1071337898551',
    appId: '1:1071337898551:web:d6f2c10f0f29e430a675b2',
    measurementId: 'G-VMY3PHGN4C'
  };
  /* Firebase Console > Project settings > Cloud Messaging > Web Push certificates. */
  var WEB_PUSH_VAPID_KEY = 'BB6wBHBGcFq2pRLc5oXyrWkyoAwbRBV-KrrU54chZnUcTj1bLXcQTfLNeaAzsizqCw6KSg2XvJI03wfrDdC0QuA';

  /* The service worker imports this file to reuse the existing public Firebase
     app configuration without duplicating it in another source file. */
  if (typeof window === 'undefined') {
    self.FPP_FIREBASE_CONFIG = CFG;
    return;
  }

  window.FB = (function () {
    'use strict';

  var ready = false, readyFailed = false, db = null, _auth = null;
  var messagingListenerReady = false;
  var readyCbs = [];

  function onReady(cb) {
    if (ready || readyFailed) { cb && cb(); return Promise.resolve(ready); }
    return new Promise(function (res) { readyCbs.push(function () { cb && cb(); res(ready); }); });
  }
  function settleReady() {
    readyCbs.forEach(function (cb) { try { cb(); } catch (e) { } });
    readyCbs = [];
  }
  function markReady() {
    ready = true;
    readyFailed = false;
    settleReady();
  }
  function markUnavailable() {
    ready = false;
    readyFailed = true;
    settleReady();
  }

  function init() {
    if (typeof firebase === 'undefined' || !firebase.apps) return false;
    try {
      if (!firebase.apps.length) firebase.initializeApp(CFG);
      _auth = firebase.auth();
      db = firebase.firestore();
      connectForegroundMessaging();
      markReady();
      return true;
    } catch (e) {
      ready = false;
      return false;
    }
  }

  /* SDK가 늦게 도착해도 초기화되도록 폴링 + 즉시 시도 */
  init();
  if (!ready) {
    var tries = 0;
    var iv = setInterval(function () {
      tries++;
      if (!ready) init();
      if (ready || tries >= 60) {
        clearInterval(iv);
        if (!ready) markUnavailable();
      }
    }, 250);
  }
  var pushSdkAttempts = 0;
  var pushSdkTimer = setInterval(function () {
    pushSdkAttempts++;
    connectForegroundMessaging();
    if (messagingListenerReady || pushSdkAttempts >= 40) clearInterval(pushSdkTimer);
  }, 250);

  /* ---------- 유틸 ---------- */
  function auth() { return _auth; }
  function pick(d) {
    for (var i = 1; i < arguments.length; i++) {
      var k = arguments[i];
      if (d && d[k] != null && d[k] !== '') return d[k];
    }
    return null;
  }
  function dateKey(v) {
    if (!v) return '';
    if (v.seconds != null) {
      var dt = new Date(v.seconds * 1000);
      return dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
    }
    var s = String(v);
    if (/^\d+$/.test(s)) {
      var n = +s > 1e12 ? +s : +s * 1000;
      var d2 = new Date(n);
      return d2.getFullYear() + '-' + pad2(d2.getMonth() + 1) + '-' + pad2(d2.getDate());
    }
    var m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);
    return s.slice(0, 10);
  }
  function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  var REPO_CDN = 'https://cdn.jsdelivr.net/gh/OnePieceFightingPath/OPFP@HEAD/';
  function absImg(u) {
    if (!u) return '';
    u = String(u);
    if (/^(https?:|data:|blob:)/.test(u)) return u;
    return REPO_CDN + u.replace(/^\//, '');
  }
  function mapDocs(snap, fn) {
    var out = [];
    snap.forEach(function (d) { out.push(fn(d.data(), d.id)); });
    return out;
  }
  function col(name) { return db.collection(name); }
  var COMMUNITY_VISIBILITY_DEFAULTS = { boards: true, events: true };
  function normalizeCommunityVisibility(data) {
    data = data || {};
    return {
      boards: data.boardsEnabled !== false,
      events: data.eventsEnabled !== false
    };
  }
  function getCommunityVisibility() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('publishMeta').doc('communityVisibility').get()
      .then(function (snap) { return normalizeCommunityVisibility(snap.exists ? snap.data() : null); });
  }
  function watchCommunityVisibility(callback) {
    if (!ready) {
      callback(Object.assign({}, COMMUNITY_VISIBILITY_DEFAULTS));
      return function () {};
    }
    return col('publishMeta').doc('communityVisibility').onSnapshot(
      function (snap) {
        callback(normalizeCommunityVisibility(snap.exists ? snap.data() : null));
      },
      function () {
        callback(Object.assign({}, COMMUNITY_VISIBILITY_DEFAULTS));
      }
    );
  }
  var VIEW_COLLECTIONS = { patch: 'patchViews', board: 'boardViews', event: 'eventViews' };
  var VIEWER_COLLECTIONS = { patch: 'patchViewers', board: 'boardViewers', event: 'eventViewers' };
  function viewCol(type) {
    return VIEW_COLLECTIONS[type] ? col(VIEW_COLLECTIONS[type]) : null;
  }
  function simpleViewHash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }
  function getViewIpHash() {
    return Promise.resolve().then(function () {
      return fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      if (!data || !data.ip) throw new Error('IP를 확인할 수 없습니다.');
      return simpleViewHash(data.ip);
    }).catch(function () {
      var userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      return simpleViewHash('anon_' + userAgent);
    });
  }
  function loadViewCounts(type, items) {
    var vc = viewCol(type);
    if (!vc || !items.length) return Promise.resolve(items);
    return Promise.all(items.map(function (item) {
      if (!item.docId || String(item.docId).indexOf('local_') === 0) return Promise.resolve();
      return vc.doc(String(item.docId)).get().then(function (snap) {
        if (snap.exists) item.viewCount = Number(snap.data().count) || 0;
      }).catch(function () { });
    })).then(function () { return items; });
  }
  function getViewCount(type, id) {
    var vc = viewCol(type);
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    if (!vc || !id || String(id).indexOf('local_') === 0) return Promise.resolve(null);
    return vc.doc(String(id)).get().then(function (snap) {
      return snap.exists ? (Number(snap.data().count) || 0) : 0;
    });
  }
  function bumpViewCount(type, id) {
    var vc = viewCol(type);
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    if (!vc || !id || String(id).indexOf('local_') === 0) return Promise.resolve(null);
    var ref = vc.doc(String(id));
    var viewerCollection = VIEWER_COLLECTIONS[type];
    if (!viewerCollection) return Promise.resolve(null);
    return getViewIpHash().then(function (ipHash) {
      var viewerRef = col(viewerCollection).doc(String(id) + '_' + ipHash);
      return db.runTransaction(function (tx) {
        return Promise.all([tx.get(viewerRef), tx.get(ref)]).then(function (snaps) {
          var viewerSnap = snaps[0];
          var viewSnap = snaps[1];
          var current = viewSnap.exists ? (Number(viewSnap.data().count) || 0) : 0;
          if (viewerSnap.exists) return current;
          var next = current + 1;
          tx.set(viewerRef, { readAt: firebase.firestore.FieldValue.serverTimestamp() });
          if (viewSnap.exists) {
            tx.update(ref, { count: firebase.firestore.FieldValue.increment(1) });
          } else {
            tx.set(ref, { count: 1 });
          }
          return next;
        });
      });
    });
  }
  function errMsg(e) {
    if (!e) return '알 수 없는 오류가 발생했습니다.';
    var c = e.code || '';
    var M = {
      'permission-denied': '접근 권한이 없습니다. 로그인 상태를 확인해 주세요.',
      'unavailable': '네트워크 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.',
      'not-found': '요청한 데이터를 찾을 수 없습니다.',
      'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
      'auth/user-not-found': '해당 이메일로 가입된 계정이 없습니다.',
      'auth/wrong-password': '비밀번호가 일치하지 않습니다.',
      'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
      'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
      'auth/too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
      'auth/popup-closed-by-user': '로그인 창이 닫혔습니다.',
      'auth/requires-recent-login': '보안을 위해 다시 로그인해 주세요.'
    };
    return M[c] || (e.message || '오류가 발생했습니다.');
  }

  /* ---------- 캐릭터 ---------- */
  function normChar(d, id) {
    return {
      docId: id,
      id: pick(d, 'id', 'num', 'no', 'characterId'),
      name: pick(d, 'name', 'title') || '이름 미상',
      image: absImg(pick(d, 'img', 'image', 'imageUrl', 'imageURL', 'icon', 'picture')),
      grade: pick(d, 'grade', 'tier', 'rank') || '',
      attr: pick(d, 'attr', 'attribute', 'element'),
      type: pick(d, 'type') || '',
      battleType: d.attribute ? (d.type || '') : (pick(d, 'battleType', 'battle_type', 'battle') || ''),
      skills: d.skills || [],
      supportSkills: pick(d, 'supportSkills', 'support_skills', 'supportSkill') || [],
      tips: pick(d, 'tips', 'adminTips') || [],
      recentPatches: pick(d, 'recentPatches', 'recent_patches') || []
    };
  }
  function getCharacters() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('characters').get().then(function (s) {
      return mapDocs(s, normChar).sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
    });
  }
  function getSupportCharacters() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('supportCharacters').get().then(function (s) {
      return mapDocs(s, normChar).sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
    });
  }

  /* ---------- PvP 패치 ---------- */
  function normPvpType(v) {
    var s = String(v == null ? '' : v).trim().toLowerCase();
    if (s === 'buff' || s === '버프' || s === '상향' || s === '상향조정') return 'buff';
    if (s === 'nerf' || s === '너프' || s === '하향' || s === '하향조정') return 'nerf';
    if (s === 'upcoming' || s === 'release_soon' || s === 'release-soon' || s === 'soon' || s === '출시예정' || s === '출시 예정') return 'upcoming';
    return 'fix';
  }
  function getPvpPatches() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('pvpPatch').get().then(function (s) {
      var groups = [];
      s.forEach(function (doc) {
        var d = doc.data(), id = doc.id;
        var base = {
          docId: id,
          charId: pick(d, 'charId', 'characterId', 'id'),
          supportCharId: pick(d, 'supportCharId', 'supportCharacterId'),
          name: pick(d, 'name', 'characterName'),
          image: absImg(pick(d, 'image', 'imageUrl', 'img')),
          date: dateKey(pick(d, 'patchDate', 'displayStart', 'date', 'updatedAt'))
        };
        var raw = pick(d, 'patches', 'items', 'list') || [];
        /* 항목별로 type/charId를 가지면 독립 그룹으로 분리 (버프+너프 공존 문서 대응) */
        var typed = raw.filter(function (p) { return p && typeof p === 'object' && pick(p, 'type', 'patchType', 'kind'); });
        if (typed.length) {
          var buckets = {};
          typed.forEach(function (p) {
            var t = normPvpType(pick(p, 'type', 'patchType', 'kind'));
            var itemCharId = pick(p, 'charId', 'characterId');
            var itemSupportCharId = pick(p, 'supportCharId', 'supportCharacterId');
            if (itemCharId == null) itemCharId = base.charId;
            if (itemSupportCharId == null) itemSupportCharId = base.supportCharId;
            var key = t + '|' + (itemCharId != null ? 'char:' + itemCharId : '') +
              '|' + (itemSupportCharId != null ? 'support:' + itemSupportCharId : '');
            if (!buckets[key]) buckets[key] = {
              type: t, charId: itemCharId, supportCharId: itemSupportCharId, items: []
            };
            buckets[key].items.push({ text: pick(p, 'text', 'content', 'desc', 'patch', 'detail', 'note') || '' });
          });
          Object.keys(buckets).forEach(function (k) {
            var b = buckets[k];
            groups.push({
              docId: id, type: b.type, charId: b.charId, supportCharId: b.supportCharId,
              name: base.name, image: base.image, date: base.date, items: b.items
            });
          });
          /* 타입 없는 나머지 항목은 문서 기본 타입으로 */
          var untyped = raw.filter(function (p) { return !(p && typeof p === 'object' && pick(p, 'type', 'patchType', 'kind')); });
          if (untyped.length) {
            groups.push({ docId: id, type: normPvpType(pick(d, 'type', 'patchType', 'kind')), charId: base.charId, supportCharId: base.supportCharId, name: base.name, image: base.image, date: base.date,
              items: untyped.map(function (p) { return typeof p === 'string' ? { text: p } : { text: pick(p, 'text', 'content', 'desc') || '' }; }) });
          }
        } else {
          groups.push({ docId: id, type: normPvpType(pick(d, 'type', 'patchType', 'kind')), charId: base.charId, supportCharId: base.supportCharId, name: base.name, image: base.image, date: base.date,
            items: raw.map(function (p) { return typeof p === 'string' ? { text: p } : { text: pick(p, 'text', 'content', 'desc', 'patch', 'detail') || '' }; }) });
        }
      });
      return groups.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    });
  }

  /* ---------- 콘텐츠 ---------- */
  function getPatchNotes() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('patchNotes').get().then(function (s) {
      var items = mapDocs(s, function (d, id) {
        return {
          docId: id,
          title: pick(d, 'title') || '제목 없음',
          author: pick(d, 'author', 'writer', 'admin') || '관리자',
          date: dateKey(pick(d, 'date', 'createdAt', 'updatedAt')),
          ts: d.createdAt && d.createdAt.seconds ? d.createdAt.seconds : 0,
          content: pick(d, 'content', 'text', 'body') || '',
          likeCount: pick(d, 'likeCount') || 0,
          viewCount: pick(d, 'viewCount', 'views', 'view', 'hitCount', 'hits') || 0
        };
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      return loadViewCounts('patch', items);
    });
  }
  function getNotices() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('notices').get().then(function (s) {
      return mapDocs(s, function (d, id) {
        return {
          docId: id,
          title: pick(d, 'title') || '제목 없음',
          author: pick(d, 'author', 'writer', 'admin') || '관리자',
          date: dateKey(pick(d, 'date', 'createdAt', 'updatedAt')),
          category: pick(d, 'category') || '',
          content: pick(d, 'content', 'text', 'body') || ''
        };
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    });
  }
  function getBanners() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('banners').get().then(function (s) {
      return mapDocs(s, function (d, id) {
        return {
          docId: id,
          image: absImg(pick(d, 'image', 'imageUrl', 'imageURL', 'src', 'url')),
          title: pick(d, 'title') || '',
          tag: pick(d, 'tag', 'subtitle') || '',
          link: pick(d, 'link') || '',
          page: pick(d, 'page', 'type', 'location') || '',
          order: pick(d, 'order') || 0,
          isActive: d.isActive !== false && d.visible !== false
        };
      }).filter(function (b) { return b.isActive && b.image; })
        .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    });
  }
  function getEvents() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('events').get().then(function (s) {
      var items = mapDocs(s, function (d, id) {
        var st = String(pick(d, 'status', 'state') || '').toLowerCase();
        var status = (st === 'ing' || st === '진행중' || st === 'on' || st === 'active') ? 'ing' : (st === 'end' || st === '종료' || st === '종료됨' ? 'end' : 'ing');
        return {
          docId: id,
          title: pick(d, 'title') || '제목 없음',
          author: pick(d, 'author', 'writer', 'admin') || '관리자',
          date: dateKey(pick(d, 'date', 'createdAt', 'updatedAt')),
          ts: d.createdAt && d.createdAt.seconds ? d.createdAt.seconds : 0,
          image: absImg(pick(d, 'image', 'imageUrl', 'thumbnail')),
          content: pick(d, 'content', 'text', 'body') || '',
          startDate: pick(d, 'startDate', 'start') ? dateKey(pick(d, 'startDate', 'start')) : '',
          endDate: pick(d, 'endDate', 'end') ? dateKey(pick(d, 'endDate', 'end')) : '',
          status: status,
          likeCount: pick(d, 'likeCount') || 0,
          commentCount: pick(d, 'commentCount') || 0,
          viewCount: pick(d, 'viewCount', 'views', 'view', 'hitCount', 'hits') || 0
        };
      }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      return loadViewCounts('event', items);
    });
  }
  /* 로컬 임시 게시글 — 원격 쓰기 실패 시 localStorage에 보관했다가 목록에 합친다 */
  function localBoards() {
    try { return JSON.parse(localStorage.getItem('fpp_local_boards') || '[]'); } catch (e) { return []; }
  }
  function getBoards() {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('boards').get().then(function (s) {
      var remote = mapDocs(s, function (d, id) {
        return {
          docId: id,
          title: pick(d, 'title') || '제목 없음',
          author: pick(d, 'author', 'writer', 'nickname') || '선원',
          date: dateKey(pick(d, 'date', 'createdAt', 'updatedAt')),
          ts: d.createdAt && d.createdAt.seconds ? d.createdAt.seconds : 0,
          category: pick(d, 'prefix', 'category') || '자유',
          content: pick(d, 'text', 'content', 'body') || '',
          images: d.images || [],
          authorId: pick(d, 'authorId', 'uid', 'userId') || '',
          uid: pick(d, 'uid') || '',
          likedBy: d.likedBy || [],
          likeCount: pick(d, 'likeCount') || 0,
          commentCount: pick(d, 'commentCount') || 0,
          viewCount: pick(d, 'viewCount', 'views', 'view', 'hitCount', 'hits') || 0
        };
      });
      var items = remote.concat(localBoards())
        .sort(function (a, b) { return (b.ts || 0) - (a.ts || 0) || String(b.date).localeCompare(String(a.date)); });
      return loadViewCounts('board', items);
    }).catch(function (e) {
      var lb = localBoards();
      if (lb.length) return lb;
      throw e;
    });
  }
  /* 게시글 작성 — 원격 boards 컬렉션에 쓰고, 권한/네트워크 실패 시 로컬 보관 */
  function addBoard(item, user, ud) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    var now = new Date();
    var base = {
      title: item.title,
      text: item.content,
      content: item.content,
      category: item.category || '자유',
      prefix: item.category || '자유',
      uid: user.uid,
      authorId: user.uid,
      author: (ud && ud.nickname) || '선원',
      nickname: (ud && ud.nickname) || '선원',
      date: now.toISOString().slice(0, 10),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      likeCount: 0,
      commentCount: 0,
      viewCount: 0
    };
    return col('boards').add(base).then(function (ref) {
      return { remote: true, docId: ref.id };
    }).catch(function () {
      /* 로컬 보관 — 다음 목록 로드에 합쳐서 노출 */
      var lb = localBoards();
      var ts = Math.floor(now.getTime() / 1000);
      lb.unshift({
        docId: 'local_' + ts,
        title: item.title,
        author: (ud && ud.nickname) || '선원',
        date: now.toISOString().slice(0, 10),
        ts: ts,
        category: item.category || '자유',
        content: item.content,
        images: [],
        authorId: user.uid,
        uid: user.uid,
        likedBy: [],
        likeCount: 0,
        commentCount: 0,
        viewCount: 0
      });
      try { localStorage.setItem('fpp_local_boards', JSON.stringify(lb)); } catch (e) { }
      return { remote: false, docId: lb[0].docId };
    });
  }

  /* ---------- 캐릭터 팁 (작성·투표·수정·삭제 / 로컬 폴백) ---------- */
  function tipCol(charId) { return col('tips_' + String(charId).replace(/[^\w-]/g, '_')); }
  function tipLocalKey(charId) { return 'fpp_tips_' + charId; }
  function readLocalTips(charId) {
    try { return JSON.parse(localStorage.getItem(tipLocalKey(charId)) || '[]'); } catch (e) { return []; }
  }
  function writeLocalTips(charId, arr) {
    try { localStorage.setItem(tipLocalKey(charId), JSON.stringify(arr)); } catch (e) { }
  }
  function getTips(charId) {
    var local = readLocalTips(charId);
    if (!ready) return Promise.resolve(local);
    return tipCol(charId).get().then(function (s) {
      var remote = mapDocs(s, function (d, id) {
        return {
          id: id, text: pick(d, 'text', 'content') || '', uid: pick(d, 'uid') || '',
          author: pick(d, 'author', 'nickname') || '선원', avatar: pick(d, 'avatar', 'profileIcon') || '',
          date: dateKey(pick(d, 'date', 'createdAt')) || '', upBy: d.upBy || [], downBy: d.downBy || []
        };
      });
      var ids = {};
      remote.forEach(function (t) { ids[t.id] = 1; });
      /* 원격에 아직 없는 로컬 임시 팁을 뒤에 붙임 */
      return remote.concat(local.filter(function (t) { return !ids[t.id]; }));
    }).catch(function () { return local; });
  }
  function addTip(charId, text, user, ud) {
    var now = new Date();
    var rec = {
      id: 'local_' + now.getTime() + '_' + Math.floor(Math.random() * 1e5),
      text: text, uid: user.uid,
      author: (ud && ud.nickname) || user.displayName || '선원',
      avatar: (ud && ud.profileIcon) || '',
      date: now.toISOString().slice(0, 10),
      createdAt: now.getTime(), upBy: [], downBy: []
    };
    var local = readLocalTips(charId);
    local.unshift(rec);
    writeLocalTips(charId, local);
    if (!ready) return Promise.resolve({ tip: rec, remote: false });
    return tipCol(charId).add({
      text: text, uid: user.uid, author: rec.author, avatar: rec.avatar,
      date: rec.date, upBy: [], downBy: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function (ref) {
      /* 원격 등록 성공 — 로컬 임시본 제거 (중복 노출 방지) */
      writeLocalTips(charId, readLocalTips(charId).filter(function (t) { return t.id !== rec.id; }));
      rec.id = ref.id;
      return { tip: rec, remote: true };
    }).catch(function () { return { tip: rec, remote: false }; });
  }
  function updateTip(charId, tipId, text) {
    var local = readLocalTips(charId).map(function (t) {
      return t.id === tipId ? Object.assign({}, t, { text: text }) : t;
    });
    writeLocalTips(charId, local);
    if (!ready || String(tipId).indexOf('local_') === 0) return Promise.resolve(local);
    return tipCol(charId).doc(tipId).update({ text: text })
      .then(function () { return local; }).catch(function () { return local; });
  }
  function deleteTip(charId, tipId) {
    var local = readLocalTips(charId).filter(function (t) { return t.id !== tipId; });
    writeLocalTips(charId, local);
    if (!ready || String(tipId).indexOf('local_') === 0) return Promise.resolve(local);
    return tipCol(charId).doc(tipId).delete()
      .then(function () { return local; }).catch(function () { return local; });
  }
  function voteTip(charId, tipId, dir, uid) {
    var local = readLocalTips(charId).map(function (t) {
      if (t.id !== tipId) return t;
      var up = (t.upBy || []).slice(), down = (t.downBy || []).slice();
      var hadUp = up.indexOf(uid) > -1, hadDown = down.indexOf(uid) > -1;
      if (dir === 'up') {
        if (hadUp) up = up.filter(function (x) { return x !== uid; });
        else { up.push(uid); down = down.filter(function (x) { return x !== uid; }); }
      } else {
        if (hadDown) down = down.filter(function (x) { return x !== uid; });
        else { down.push(uid); up = up.filter(function (x) { return x !== uid; }); }
      }
      return Object.assign({}, t, { upBy: up, downBy: down });
    });
    writeLocalTips(charId, local);
    var t = local.filter(function (x) { return x.id === tipId; })[0];
    if (ready && t && String(tipId).indexOf('local_') !== 0) {
      tipCol(charId).doc(tipId).update({ upBy: t.upBy, downBy: t.downBy }).catch(function () { });
    }
    return Promise.resolve(local);
  }

  /* ---------- 좋아요 ---------- */
  function getLikeDoc(type, id) {
    if (!ready) return Promise.resolve(null);
    return col('likes').doc(type + '_' + id).get().then(function (d) {
      return d.exists ? d.data() : null;
    }).catch(function () { return null; });
  }
  function toggleGenericLike(type, id, uid) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    var ref = col('likes').doc(type + '_' + id);
    return db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var data = snap.exists ? snap.data() : { likedBy: [], likeCount: 0 };
        var arr = data.likedBy || [];
        var has = arr.indexOf(uid) > -1;
        if (has) arr = arr.filter(function (x) { return x !== uid; });
        else arr.push(uid);
        tx.set(ref, { likedBy: arr, likeCount: Math.max(0, arr.length) }, { merge: true });
        return !has;
      });
    });
  }
  function toggleBoardLike(id, uid, wasLiked) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    var ref = col('boards').doc(id);
    return db.runTransaction(function (tx) {
      return tx.get(ref).then(function (snap) {
        var data = snap.exists ? snap.data() : {};
        var arr = data.likedBy || [];
        var has = arr.indexOf(uid) > -1;
        if (has) arr = arr.filter(function (x) { return x !== uid; });
        else arr.push(uid);
        tx.update(ref, { likedBy: arr, likeCount: Math.max(0, arr.length) });
        return !has;
      });
    }).catch(function () { return !wasLiked; });
  }

  /* ---------- 댓글 ---------- */
  function commentCol(type) { return type === 'event' ? 'eventComments' : 'boardComments'; }
  function getComments(type, id) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col(commentCol(type)).where('targetId', '==', id).get().then(function (s) {
      return mapDocs(s, function (d, cid) {
        return {
          docId: cid,
          targetId: pick(d, 'targetId') || id,
          uid: pick(d, 'uid') || '',
          authorName: pick(d, 'authorName', 'nickname') || '선원',
          authorIcon: pick(d, 'authorIcon', 'profileIcon') || 0,
          text: pick(d, 'text', 'content') || '',
          createdAt: pick(d, 'createdAt') || null
        };
      }).sort(function (a, b) {
        var ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
        var tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
        return ta - tb;
      });
    }).catch(function () {
      return col(commentCol(type)).get().then(function (s) {
        return mapDocs(s, function (d, cid) {
          return { docId: cid, targetId: pick(d, 'targetId') || '', uid: pick(d, 'uid') || '', authorName: pick(d, 'authorName', 'nickname') || '선원', authorIcon: pick(d, 'authorIcon', 'profileIcon') || 0, text: pick(d, 'text', 'content') || '', createdAt: pick(d, 'createdAt') || null };
        }).filter(function (c) { return String(c.targetId) === String(id); });
      });
    });
  }
  function addComment(type, id, text, user, ud) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col(commentCol(type)).add({
      targetId: id,
      uid: user.uid,
      authorName: (ud && ud.nickname) || user.displayName || '선원',
      authorIcon: (ud && ud.profileIcon) || 0,
      text: text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function () {
      /* 게시글/이벤트 commentCount 증가 (규칙 허용 범위) */
      var target = type === 'event' ? col('events').doc(id) : col('boards').doc(id);
      return target.update({ commentCount: firebase.firestore.FieldValue.increment(1) }).catch(function () { });
    });
  }
  function deleteComment(type, cid) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col(commentCol(type)).doc(cid).delete();
  }
  /* 게시판 글 삭제 */
  function deleteBoard(id) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    var u = auth();
    if (!u || !u.currentUser) return Promise.reject(new Error('로그인 필요'));
    return col('boards').doc(id).delete();
  }
  /* 게시판 글 수정 */
  function updateBoard(id, title, content) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    var u = auth();
    if (!u || !u.currentUser) return Promise.reject(new Error('로그인 필요'));
    return col('boards').doc(id).update({
      title: title,
      content: content,
      updatedAt: new Date().toISOString()
    });
  }

  /* ---------- 사용자 ---------- */
  function getUserDoc(uid) {
    if (!ready) return Promise.resolve(null);
    return col('users').doc(uid).get().then(function (d) { return d.exists ? d.data() : null; }).catch(function () { return null; });
  }
  function ensureUserDoc(user, extra) {
    if (!ready) return Promise.resolve(null);
    var ref = col('users').doc(user.uid);
    return ref.get().then(function (snap) {
      if (snap.exists) return snap.data();
      var base = Object.assign({
        uid: user.uid,
        email: user.email || '',
        nickname: user.displayName || '선원',
        profileIcon: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
         settings: { patch: false, fav: false, event: false, comment: false },
        favChars: [], favSupports: [],
        counts: { posts: 0, comments: 0, likes: 0 }
      }, extra || {});
      return ref.set(base).then(function () { return base; });
    });
  }
  function updateUserDoc(uid, patch) {
    if (!ready) return Promise.reject(new Error('Firebase 미준비'));
    return col('users').doc(uid).set(patch, { merge: true });
  }
  function getFavs(uid) {
    return getUserDoc(uid).then(function (d) {
      return { chars: (d && d.favChars) || [], supports: (d && d.favSupports) || [] };
    });
  }
  function bumpUserLikeCount(uid, delta) {
    if (!ready) return;
    col('users').doc(uid).update({ 'counts.likes': firebase.firestore.FieldValue.increment(delta) }).catch(function () { });
  }
  function bumpUserCommentCount(uid, delta) {
    if (!ready) return;
    col('users').doc(uid).update({ 'counts.comments': firebase.firestore.FieldValue.increment(delta) }).catch(function () { });
  }

  /* ---------- 알림 ---------- */
  function normNotification(d, id, path) {
    var rawType = String(pick(d, 'type', 'notificationType', 'category', 'kind') || '').toLowerCase();
    var subType = String(pick(d, 'subType', 'notificationSubtype', 'commentType', 'eventStatus', 'action', 'kind') || '').toLowerCase();
    var type = /^(support|inquiry)/.test(rawType) ? 'support' :
      /^(favorite|favourite|fav)/.test(rawType) ? 'fav' :
      /^patch/.test(rawType) ? 'patch' :
      /^event/.test(rawType) ? 'event' : 'comment';
    var createdAt = pick(d, 'createdAt', 'timestamp', 'date', 'updatedAt') || null;
    var ts = createdAt && createdAt.seconds ? createdAt.seconds :
      (typeof createdAt === 'number' ? (createdAt > 1e12 ? Math.floor(createdAt / 1000) : createdAt) : 0);
    return {
      docId: id,
      path: path || ('notifications/' + id),
      type: type,
      title: pick(d, 'title', 'message', 'text') || '새 알림이 있습니다.',
      body: pick(d, 'body', 'description', 'content') || '',
      targetTitle: pick(d, 'targetTitle', 'contentTitle', 'patchTitle', 'postTitle', 'eventTitle') || '',
      characterName: pick(d, 'characterName', 'charName', 'character', 'targetName') || '',
      subType: subType,
      isReply: d.isReply === true || d.reply === true || !!pick(d, 'replyToId', 'replyId', 'parentCommentId', 'commentParentId') ||
        /reply|recomment|답글|대댓글/.test(rawType + ' ' + subType),
      isEndingSoon: d.isEndingSoon === true || d.eventEndingSoon === true || d.isDeadline === true ||
        /ending.?soon|deadline|종료.?임박/.test(rawType + ' ' + subType),
      date: dateKey(createdAt),
      ts: ts,
      createdAt: createdAt,
      read: d.read === true || d.isRead === true,
      href: pick(d, 'href', 'link', 'url') || '',
      targetId: pick(d, 'targetId', 'postId', 'contentId') || '',
      targetType: pick(d, 'targetType', 'contentType') || ''
    };
  }
  function notificationSnapshot(s, pathPrefix) {
    var out = [];
    s.forEach(function (d) { out.push(normNotification(d.data(), d.id, pathPrefix ? pathPrefix + '/' + d.id : 'notifications/' + d.id)); });
    return out.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0) || String(b.date).localeCompare(String(a.date)); });
  }
  function getNotifications(uid) {
    if (!uid) return Promise.resolve([]);
    if (!ready) return Promise.resolve([]);
    // Cloud Functions write to the owner-scoped path; do not probe legacy
    // top-level collections that have no client read rule.
    return col('users').doc(uid).collection('notifications').get().then(function (s) {
      return notificationSnapshot(s, 'users/' + uid + '/notifications');
    });
  }
  function watchNotifications(uid, onChange, onError) {
    if (!uid || !ready) return function () {};
    return col('users').doc(uid).collection('notifications').onSnapshot(function (s) {
      if (typeof onChange === 'function') {
        onChange(notificationSnapshot(s, 'users/' + uid + '/notifications'));
      }
    }, function (error) {
      if (typeof onError === 'function') onError(error);
    });
  }
  function markNotificationsRead(items) {
    if (!ready || !items || !items.length) return Promise.resolve();
    var batch = db.batch();
    items.forEach(function (n) {
      if (n && n.path) batch.update(db.doc(n.path), { read: true, isRead: true });
    });
    return batch.commit();
  }

  /* ---------- Web Push (Firebase Cloud Messaging) ---------- */
  function pushSupported() {
    if (window.isSecureContext === false || !window.Notification || !navigator.serviceWorker ||
        typeof firebase === 'undefined' || !firebase.messaging ||
        typeof firebase.messaging.isSupported !== 'function') {
      return Promise.resolve(false);
    }
    return firebase.messaging.isSupported().then(Boolean).catch(function () { return false; });
  }
  function currentPushDeviceId() {
    var key = 'fpp_push_device_id';
    try {
      var existing = localStorage.getItem(key);
      if (existing) return existing;
      var id = window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
      localStorage.setItem(key, id);
      return id;
    } catch (e) {
      return 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2);
    }
  }
  function pushTokenRef(uid, deviceId) {
    return col('users').doc(uid).collection('fcmTokens').doc(deviceId);
  }
  function pushState(uid) {
    return pushSupported().then(function (supported) {
      var state = {
        supported: supported,
        configured: !!WEB_PUSH_VAPID_KEY,
        permission: window.Notification ? window.Notification.permission : 'unsupported',
        enabled: false
      };
      if (!supported || !uid || !ready) return state;
      return pushTokenRef(uid, currentPushDeviceId()).get().then(function (snap) {
        state.enabled = snap.exists;
        return state;
      }).catch(function () { return state; });
    });
  }
  function enablePush(uid) {
    if (!uid) return Promise.reject(new Error('OS 알림을 켜려면 로그인해 주세요.'));
    if (!WEB_PUSH_VAPID_KEY) {
      return Promise.reject(new Error('Firebase Cloud Messaging의 Web Push 공개키 설정이 필요합니다.'));
    }
    return pushSupported().then(function (supported) {
      if (!supported) throw new Error('이 브라우저에서는 웹 푸시를 지원하지 않습니다. HTTPS 환경의 최신 브라우저를 사용해 주세요.');
      if (window.Notification.permission === 'denied') {
        throw new Error('브라우저 설정에서 이 사이트의 알림 권한을 허용해 주세요.');
      }
      return window.Notification.requestPermission();
    }).then(function (permission) {
      if (permission !== 'granted') throw new Error('브라우저 알림 권한이 허용되지 않았습니다.');
      var workerUrl = new URL('../firebase-messaging-sw.js', window.location.href);
      return navigator.serviceWorker.register(workerUrl.href);
    }).then(function (registration) {
      return firebase.messaging().getToken({
        vapidKey: WEB_PUSH_VAPID_KEY,
        serviceWorkerRegistration: registration
      });
    }).then(function (token) {
      if (!token) throw new Error('푸시 토큰을 발급받지 못했습니다. Firebase Cloud Messaging 설정을 확인해 주세요.');
      return pushTokenRef(uid, currentPushDeviceId()).set({
        token: token,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }).then(function () { return true; });
  }
  function disablePush(uid) {
    if (!uid) return Promise.resolve(false);
    var ref = pushTokenRef(uid, currentPushDeviceId());
    return ref.get().then(function (snap) {
      var token = snap.exists ? snap.data().token : '';
      return ref.delete().catch(function () {}).then(function () {
        if (!token || typeof firebase === 'undefined' || !firebase.messaging) return true;
        return firebase.messaging().deleteToken(token).catch(function () { return false; }).then(function () { return true; });
      });
    }).then(function () { return true; });
  }
  function displayForegroundPush(payload) {
    var data = payload && payload.data || {};
    if (!data.title || !window.Notification || window.Notification.permission !== 'granted') return;
    var notification = new window.Notification(data.title, {
      body: data.body || '',
      icon: new URL('img/logo-dark.png', document.baseURI).href,
      tag: data.notificationId || undefined,
      data: { link: data.link || 'ko/Main.html#home' }
    });
    notification.onclick = function () {
      var link = notification.data && notification.data.link;
      window.focus();
      if (link) window.location.href = new URL(link, document.baseURI).href;
      notification.close();
    };
    window.dispatchEvent(new CustomEvent('fpp:push-message', { detail: data }));
  }
  function connectForegroundMessaging() {
    if (messagingListenerReady || typeof firebase === 'undefined' || !firebase.messaging ||
        typeof firebase.messaging.isSupported !== 'function') return;
    messagingListenerReady = true;
    firebase.messaging.isSupported().then(function (supported) {
      if (supported) firebase.messaging().onMessage(displayForegroundPush);
    }).catch(function () { messagingListenerReady = false; });
  }

  /* ---------- 고객센터 문의 ---------- */
  function addInquiry(item, user) {
    var local = JSON.parse(localStorage.getItem('fpp_inquiries') || '[]');
    var fallbackProfile = null;
    function createRecord(profile) {
      var nickname = [profile && profile.nickname, item.nickname, user && user.displayName]
        .map(function (value) { return String(value || '').trim(); })
        .find(function (value) { return value && value.indexOf('@') === -1; }) || '선원';
      return {
        title: item.title,
        content: item.content,
        nickname: nickname,
        uid: user ? user.uid : 'guest',
        date: new Date().toISOString().slice(0, 10),
        status: '접수완료'
      };
    };
    if (!ready || !user) {
      var localRecord = createRecord(null);
      local.unshift(localRecord);
      localStorage.setItem('fpp_inquiries', JSON.stringify(local));
      return Promise.resolve({ remote: false });
    }
    return getUserDoc(user.uid).then(function (profile) {
      fallbackProfile = profile;
      var rec = createRecord(profile);
      return col('inquiries').add(Object.assign(rec, { createdAt: firebase.firestore.FieldValue.serverTimestamp() }));
    }).then(function () { return { remote: true }; })
      .catch(function () {
        var rec = createRecord(fallbackProfile);
        local.unshift(rec);
        localStorage.setItem('fpp_inquiries', JSON.stringify(local));
        return { remote: false };
      });
  }
  function getMyInquiries(user) {
    var local = JSON.parse(localStorage.getItem('fpp_inquiries') || '[]');
    if (!ready || !user) return Promise.resolve(local);
    return col('inquiries').where('uid', '==', user.uid).get().then(function (s) {
      var remote = mapDocs(s, function (d) {
        return {
          title: pick(d, 'title') || '',
          content: pick(d, 'content') || '',
          reply: pick(d, 'reply', 'answer', 'adminReply', 'replyContent') || '',
          replyAdminNickname: pick(d, 'replyAdminNickname', 'replyAdminName', 'repliedByNickname', 'replyByNickname', 'adminReplyNickname', 'responderNickname', 'adminNickname', 'adminName') || '',
          date: dateKey(pick(d, 'date', 'createdAt')),
          status: pick(d, 'status') || '접수완료'
        };
      });
      return remote.concat(local);
    }).catch(function () { return local; });
  }

  return {
    get ready() { return ready; }, auth: auth, db: function () { return db; },
    errMsg: errMsg, dateKey: dateKey, onReady: onReady,
    getCharacters: getCharacters, getSupportCharacters: getSupportCharacters,
    getPvpPatches: getPvpPatches, getPatchNotes: getPatchNotes, getNotices: getNotices,
    getBanners: getBanners, getEvents: getEvents, getBoards: getBoards, addBoard: addBoard, deleteBoard: deleteBoard, updateBoard: updateBoard,
    getCommunityVisibility: getCommunityVisibility, watchCommunityVisibility: watchCommunityVisibility,
    getTips: getTips, addTip: addTip, updateTip: updateTip, deleteTip: deleteTip, voteTip: voteTip,
    getLikeDoc: getLikeDoc, toggleGenericLike: toggleGenericLike, toggleBoardLike: toggleBoardLike,
     getViewCount: getViewCount, bumpViewCount: bumpViewCount,
    getComments: getComments, addComment: addComment, deleteComment: deleteComment,
    getUserDoc: getUserDoc, ensureUserDoc: ensureUserDoc, updateUserDoc: updateUserDoc,
    getFavs: getFavs, bumpUserLikeCount: bumpUserLikeCount, bumpUserCommentCount: bumpUserCommentCount,
    getNotifications: getNotifications, watchNotifications: watchNotifications, markNotificationsRead: markNotificationsRead,
    getPushStatus: pushState, enablePushNotifications: enablePush, disablePushNotifications: disablePush,
    addInquiry: addInquiry, getMyInquiries: getMyInquiries
  };
  })();
})();
