/* ============================================================
   FPP v2 — common.js
   공통 UI 레이어: 헤더/데스크톱 내비/탭/팝업/모달/테마/배너/토스트
   ============================================================ */
window.UI = (function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function pageUrl(path) {
    path = String(path || '');
    if (/^(?:[a-z]+:|\/\/|#|\/)/i.test(path)) return path;
    return new URL('ko/' + path.replace(/^ko\//i, ''), document.baseURI).href;
  }
  var SETTINGS_ROUTE = 'ko/Settings.html#Setting';
  var PROFILE_ROUTE = 'ko/Settings.html';
  function settingsPageUrl() { return pageUrl(SETTINGS_ROUTE); }
  function profilePageUrl() { return pageUrl(PROFILE_ROUTE); }

  /* ---------- 유틸 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function writeClipboardText(text) {
    text = String(text || '');
    function legacyCopy() {
      return new Promise(function (resolve, reject) {
        var input = document.createElement('textarea');
        input.value = text;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        var copied = false;
        try { copied = document.execCommand('copy'); } catch (error) {}
        document.body.removeChild(input);
        if (copied) resolve();
        else reject(new Error('클립보드 복사에 실패했습니다.'));
      });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(legacyCopy);
    }
    return legacyCopy();
  }
  function escBr(s) {
    return esc(s).replace(/&lt;br\s*\/?&gt;/gi, '<br>').replace(/\n/g, '<br>');
  }
  function pad2(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
  function fmtDate(d) {
    if (!d) return '';
    var s = String(d);
    if (/^\d+$/.test(s)) {
      var dt = new Date(+s > 1e12 ? +s : +s * 1000);
      s = dt.getFullYear() + '-' + pad2(dt.getMonth() + 1) + '-' + pad2(dt.getDate());
    }
    var m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return m[1] + '.' + pad2(m[2]) + '.' + pad2(m[3]);
    return s.slice(0, 10).replace(/-/g, '.');
  }
  function isNew(d) {
    if (!d) return false;
    var t = new Date(String(d).replace(/-/g, '/')).getTime();
    if (isNaN(t)) return false;
    return Date.now() - t < 3 * 24 * 3600 * 1000;
  }
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('fpp_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('fpp_' + k, JSON.stringify(v)); } catch (e) { } }
  };

  /* ---------- 프로필 아이콘 ---------- */
  /* 선택 가능한 아이콘은 레포지토리의 실제 에셋만 사용한다. */
  var PROFILE_ICON_FILES = [
    'ace.png', 'akainu.png', 'bigmom.png', 'bonney.png', 'brook.png',
    'buggy.png', 'carrot.png', 'chopper.png', 'crocodile.png', 'dendenmushi.png',
    'doflamingo.png', 'dragon.png', 'franky.png', 'garp.png', 'hancock.png',
    'jinbe.png', 'kaido.png', 'katakuri.png', 'kid.png', 'kizaru.png',
    'koby.png', 'kuma.png', 'law.png', 'luffy.png', 'mihawk.png',
    'nami.png', 'nika.png', 'robin.png', 'roger.png', 'sabo.png',
    'sanji.png', 'shanks.png', 'smoker.png', 'teach.png', 'usopp.png',
    'vivi.png', 'whitebeard.png', 'yamato.png', 'zoro.png'
  ];
  var PROFILE_ICONS = PROFILE_ICON_FILES.map(function (filename) { return 'img/avatars/' + filename; });
  var AVATARS = PROFILE_ICONS; /* 기존 호출부 호환용 별칭 */
  var PLACEHOLDER_IMG = PROFILE_ICONS[0];
  function avatarOf(icon) {
    var i = parseInt(icon, 10);
    return PROFILE_ICONS[isNaN(i) ? 0 : Math.abs(i) % PROFILE_ICONS.length];
  }

  /* ---------- 아이콘 (인라인 SVG, 폰트 폴백) ---------- */
  var IC = {
    /* 설정 — 표준 톱니바퀴 */
    gear: '<span class="ficon ficon-gear" aria-hidden="true"><svg class="ficon-fb" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span>',
    /* 즐겨찾기 — 북마크 아이콘 폰트 사용 (SVG 제거) */
    bookmark: '<span class="ficon ficon-bookmark" aria-hidden="true"></span>',
    heart: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20l-7-6.8A4.6 4.6 0 0 1 12 6.4a4.6 4.6 0 0 1 7 6.8z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5l-7 7 7 7"/></svg>',
    burger: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20c1.2-4 4-6 7.5-6s6.3 2 7.5 6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
  };

  /* ---------- 테마 ---------- */
  function applyTheme(th) {
    document.documentElement.setAttribute('data-theme', th === 'light' ? 'light' : 'dark');
    store.set('theme', th === 'light' ? 'light' : 'dark');
  }

  /* ---------- 사용자 상태 ---------- */
  var _fbUser = null, _userDoc = null, _userCbs = [], _authResolved = false, _headerNotificationsResolved = false;
  function currentUser() {
    if (_fbUser) return _fbUser;
    return null;
  }
  function userDoc() {
    if (_userDoc) return _userDoc;
    return null;
  }
  function saveUserPatch(patch) {
    var u = currentUser();
    if (!u) return Promise.reject(new Error('로그인이 필요합니다.'));
    return FB.updateUserDoc(u.uid, patch).then(function () {
      _userDoc = Object.assign(_userDoc || {}, patch);
      return _userDoc;
    });
  }

  /* ---------- 알림 ---------- */
  var notificationState = { uid: null, items: [], loaded: false, loading: null, unsubscribe: null };
  var activeNotificationPopup = null, activeProfileMenuPopup = null, activeProfileNotificationsRenderer = null;
  var NOTIFY_DESCRIPTIONS = {
    patch: '새로운 패치노트 등록 시 알림 받기',
    fav: '즐겨찾기 캐릭터 밸런스 패치 알림 받기',
    comment: '댓글 및 대댓글 알림 받기',
    event: '신규 이벤트 및 종료 임박 알림 받기'
  };
  function notificationEnabled(type) {
    if (type === 'support') return true;
    var settings = (userDoc() && userDoc().settings) || {};
    return settings[type] === true;
  }
  function visibleNotifications() {
    return notificationState.items.filter(function (n) { return notificationEnabled(n.type); });
  }
  function notifyTime(value) {
    var ms = 0;
    if (value && value.seconds != null) ms = Number(value.seconds) * 1000;
    else if (typeof value === 'number') ms = value > 1e12 ? value : value * 1000;
    else if (value) ms = Date.parse(String(value).replace(/\./g, '-').replace(' ', 'T')) || 0;
    if (!ms) return '';
    var diff = Math.max(0, Date.now() - ms);
    if (diff < 60 * 1000) return '방금 전';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '분 전';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '시간 전';
    if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + '일 전';
    return fmtDate(new Date(ms).toISOString());
  }
  function updateNotificationBadge() {
    var btn = $('btnNotify');
    if (!btn) return;
    var unread = visibleNotifications().filter(function (n) { return !n.read; }).length;
    var dot = btn.querySelector('.notify-dot');
    if (dot) {
      dot.hidden = !unread;
      dot.setAttribute('aria-label', unread ? '읽지 않은 알림 ' + unread + '개' : '');
    }
    btn.classList.toggle('has-notifications', unread > 0);
  }
  function updateNotificationViews() {
    updateNotificationBadge();
    if (activeNotificationPopup) {
      if (activeNotificationPopup.el && activeNotificationPopup.el.isConnected) {
        renderNotificationPopup(activeNotificationPopup);
      } else {
        activeNotificationPopup = null;
      }
    }
    if (activeProfileMenuPopup) {
      if (activeProfileMenuPopup.el && activeProfileMenuPopup.el.isConnected) {
        var badge = activeProfileMenuPopup.el.querySelector('#pfNotice em');
        if (badge) badge.textContent = String(visibleNotifications().filter(function (n) { return !n.read; }).length);
      } else {
        activeProfileMenuPopup = null;
      }
    }
    if (activeProfileNotificationsRenderer && !activeProfileNotificationsRenderer()) {
      activeProfileNotificationsRenderer = null;
    }
  }
  function stopNotificationWatch() {
    if (notificationState.unsubscribe) {
      notificationState.unsubscribe();
      notificationState.unsubscribe = null;
    }
  }
  function startNotificationWatch(uid) {
    if (!uid || !FB.ready || !FB.watchNotifications) return;
    if (notificationState.uid === uid && notificationState.unsubscribe) return;
    stopNotificationWatch();
    if (notificationState.uid !== uid) {
      notificationState = { uid: uid, items: [], loaded: false, loading: null, unsubscribe: null };
    }
    notificationState.unsubscribe = FB.watchNotifications(uid, function (items) {
      var user = currentUser();
      if (!user || user.uid !== uid || notificationState.uid !== uid) return;
      notificationState.items = items || [];
      notificationState.loaded = true;
      notificationState.loading = null;
      updateNotificationViews();
    }, function (error) {
      if (notificationState.uid !== uid) return;
      console.warn('알림 실시간 구독에 실패했습니다:', error);
      stopNotificationWatch();
      updateNotificationViews();
    });
  }
  function loadNotifications(force) {
    var u = currentUser();
    if (!u) {
      stopNotificationWatch();
      notificationState = { uid: null, items: [], loaded: true, loading: null };
      updateNotificationViews();
      return Promise.resolve([]);
    }
    if (!force && notificationState.loaded && notificationState.uid === u.uid) return Promise.resolve(notificationState.items);
    if (notificationState.loading && notificationState.uid === u.uid) return notificationState.loading;
    notificationState.uid = u.uid;
    notificationState.loading = FB.getNotifications(u.uid).then(function (items) {
      if (!currentUser() || currentUser().uid !== u.uid || notificationState.uid !== u.uid) return [];
      notificationState.items = items || [];
      notificationState.loaded = true;
      notificationState.loading = null;
      updateNotificationViews();
      return notificationState.items;
    }).catch(function (error) {
      if (!currentUser() || currentUser().uid !== u.uid || notificationState.uid !== u.uid) return [];
      console.warn('알림 목록을 불러오지 못했습니다:', error);
      notificationState.items = [];
      notificationState.loaded = true;
      notificationState.loading = null;
      updateNotificationViews();
      return [];
    });
    return notificationState.loading;
  }
  function notificationHref(n) {
    if (n.href) return pageUrl(n.href);
    if (!n.targetId) return '';
    if (n.type === 'patch') return pageUrl(patchNotesPage() + '#patch/view/' + encodeURIComponent(n.targetId));
    if (n.type === 'event') return pageUrl('Community.html#event/view/' + encodeURIComponent(n.targetId));
    if (n.type === 'comment') return pageUrl((String(n.targetType).toLowerCase() === 'event' ? 'Community.html#event/view/' : 'Community.html#board/view/') + encodeURIComponent(n.targetId));
    return pageUrl('Main.html#pvp');
  }
  function notificationMessage(n) {
    n = n || {};
    function value(v) {
      v = String(v == null ? '' : v).trim();
      return v === '새 알림이 있습니다.' ? '' : v;
    }
    var title = value(n.targetTitle) || value(n.title) || value(n.body);
    var character = value(n.characterName) || value(n.title) || value(n.body) || '즐겨찾기 캐릭터';
    if (n.type === 'patch') {
      if (/^\[패치노트\]/.test(title)) return title;
      return '[패치노트] 최신 ' + (title || '패치노트') + ' 등록! 지금 확인해보세요.';
    }
    if (n.type === 'fav') {
      if (/^즐겨찾기한 .+의 밸런스 패치/.test(title)) return title;
      return '즐겨찾기한 ' + character + '의 밸런스 패치! 지금 바로 확인해보세요.';
    }
    if (n.type === 'comment') {
      return n.isReply ?
        '작성하신 댓글에 대댓글이 달렸어요! 지금 확인해 보세요.' :
        '작성하신 게시글에 댓글이 달렸어요! 지금 확인해 보세요.';
    }
    if (n.type === 'support') {
      return value(n.title) || (value(n.targetTitle) ?
        value(n.targetTitle) + ' 문의에 답변이 등록되었습니다.' : '고객센터 문의에 답변이 등록되었습니다.');
    }
    if (n.type === 'event') {
      var eventTitle = title.replace(/^\[이벤트\]\s*/, '').replace(/\s*이벤트\s*종료\s*임박.*$/i, '').trim();
      if (n.isEndingSoon || /종료\s*임박|ending.?soon|deadline/i.test(String(n.subType || '') + ' ' + String(n.title || '') + ' ' + String(n.body || ''))) {
        var eventName = eventTitle.replace(/\s*이벤트$/i, '').trim();
        return (eventName ? eventName + ' 이벤트' : '이벤트') + ' 종료 임박! 놓치기 전에 확인해 보세요.';
      }
      return '새로운 이벤트가 시작되었어요! 지금 바로 확인해 보세요.';
    }
    return title || '새 알림이 있습니다.';
  }
  function notificationIcon(type) {
    var paths = {
      patch: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9.5 12h6M9.5 15.5h4"/>',
      fav: '<path d="M12 20.4l-7.2-7A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 7.2 6.8z"/>',
      event: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>',
      comment: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
      support: '<path d="M4 12a8 8 0 0 1 16 0"/><path d="M4 12v5a2 2 0 0 0 2 2h2v-6H6a2 2 0 0 0-2 2zM20 12v5a2 2 0 0 1-2 2h-2v-6h2a2 2 0 0 1 2 2z"/>'
    };
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (paths[type] || paths.comment) + '</svg>';
  }
  function notificationSkeletonRows(count, profile) {
    var rows = '';
    for (var i = 0; i < (count || 4); i++) {
      var titleWidth = (64 + (i % 3) * 9) + '%';
      var timeWidth = (24 + (i % 2) * 8) + '%';
      var copyClass = profile ? 'profile-notification-copy' : 'notify-copy';
      var rowClass = profile ? 'profile-notification-row' : 'notify-row';
      rows += '<div class="' + rowClass + ' notification-skeleton-row" aria-hidden="true">' +
        '<span class="notify-icon notify-skeleton-icon"><span class="skel notification-skeleton-avatar"></span></span>' +
        '<span class="' + copyClass + '"><b><span class="skel notification-skeleton-title" style="width:' + titleWidth + '"></span></b>' +
        '<time><span class="skel notification-skeleton-time" style="width:' + timeWidth + '"></span></time></span>' +
        '<i class="skel notification-skeleton-dot"></i></div>';
    }
    return rows;
  }
  function notificationPopupSkeleton() {
    return '<div class="notify-popup" aria-busy="true">' +
      '<div class="notify-head"><b>알림 <span class="skel notification-skeleton-count" aria-hidden="true"></span></b>' +
      '<div class="notify-head-actions" aria-hidden="true"><span class="skel notification-skeleton-action"></span><span class="skel notification-skeleton-action"></span></div></div>' +
      '<div class="notify-list notification-skeleton-list" aria-hidden="true">' + notificationSkeletonRows(4, false) + '</div></div>';
  }
  function markNotificationRead(n) {
    if (!n || n.read) return;
    n.read = true;
    updateNotificationBadge();
    if (currentUser()) FB.markNotificationsRead([n]).catch(function () { });
  }
  function renderNotificationPopup(pop) {
    var items = visibleNotifications();
    var unread = items.filter(function (n) { return !n.read; }).length;
    var html = '<div class="notify-popup">' +
      '<div class="notify-head"><b>알림 <em>' + unread + '</em></b>' +
      '<div class="notify-head-actions"><button id="notifyReadAll" type="button">모두 읽음</button><button id="notifyAll" type="button">전체보기 <span aria-hidden="true">→</span></button></div></div>';
    if (!items.length) {
      html += '<div class="empty notify-empty"><p>새로운 알림이 없습니다.</p><small>알림 설정을 켜면 새 소식을 알려드려요.</small></div>';
    } else {
      html += '<div class="notify-list">' + items.map(function (n) {
        return '<button class="notify-row' + (n.read ? '' : ' is-unread') + '" type="button" data-notify-id="' + esc(n.docId) + '">' +
          '<span class="notify-icon notify-icon--' + esc(n.type) + '">' + notificationIcon(n.type) + '</span>' +
          '<span class="notify-copy"><b>' + esc(notificationMessage(n)) + '</b>' +
          '<time>' + esc(notifyTime(n.createdAt || n.date)) + '</time></span>' +
          (n.read ? '' : '<i class="notify-unread-dot" aria-hidden="true"></i>') + '</button>';
      }).join('') + '</div>';
    }
    html += '</div>';
    pop.el.innerHTML = html;
    var readAll = pop.el.querySelector('#notifyReadAll');
    if (readAll) readAll.addEventListener('click', function () {
      var unreadItems = items.filter(function (n) { return !n.read; });
      unreadItems.forEach(function (n) { n.read = true; });
      updateNotificationBadge();
      if (currentUser()) FB.markNotificationsRead(unreadItems).catch(function () { });
      renderNotificationPopup(pop);
    });
    var allBtn = pop.el.querySelector('#notifyAll');
    if (allBtn) allBtn.addEventListener('click', function () {
      closePopups();
      if (isMobileLayout()) {
        location.href = pageUrl('Settings.html#setting-notifications');
        return;
      }
      openMyInfoPopup('notifications');
    });
    pop.el.querySelectorAll('[data-notify-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        var n = notificationState.items.filter(function (x) { return String(x.docId) === String(row.getAttribute('data-notify-id')); })[0];
        if (!n) return;
        markNotificationRead(n);
        var href = notificationHref(n);
        closePopups();
        if (href) location.href = href;
      });
    });
  }
  function openNotifyPopup(anchor) {
    var u = currentUser();
    var pop = openPopup(anchor, notificationPopupSkeleton(), '390px', 'pop--notifications');
    activeNotificationPopup = pop;
    if (!u) {
      pop.el.innerHTML = '<div class="notify-popup"><div class="empty notify-empty"><p>로그인 후 알림을 확인할 수 있습니다.</p><a class="btn btn--gold btn--sm" href="' + pageUrl('Login.html') + '">로그인</a></div></div>';
      return;
    }
    loadNotifications(true).then(function () { renderNotificationPopup(pop); });
  }
  function onUser(cb) { _userCbs.push(cb); }
  function notifyUser() {
    updateAuthArea();
    _userCbs.forEach(function (cb) { try { cb(currentUser(), userDoc()); } catch (e) { } });
  }

  /* ---------- 즐겨찾기 ---------- */
  var favCache = { chars: [], supports: [] };
  var charCache = { chars: [], supports: [], loaded: false };
  function emitFavChanged() {
    document.dispatchEvent(new CustomEvent('fpp:fav-changed'));
  }
  
  function loadCharCache() {
    if (charCache.loaded) return Promise.resolve();
    if (!FB.ready) return Promise.resolve();
    return Promise.all([
      FB.getCharacters().catch(function () { return []; }),
      FB.getSupportCharacters().catch(function () { return []; })
    ]).then(function (r) {
      charCache.chars = r[0];
      charCache.supports = r[1];
      charCache.loaded = true;
    });
  }
  
  function findCharInCache(id, kind) {
    var pool = kind === 'support' ? charCache.supports : charCache.chars;
    var c = pool.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!c) {
      var all = charCache.chars.concat(charCache.supports);
      c = all.filter(function (x) { return String(x.id) === String(id); })[0];
    }
    return c || null;
  }
  
  function loadFavs() {
    var u = currentUser();
    if (!u) {
      favCache = { chars: [], supports: [] };
      emitFavChanged();
      return Promise.resolve(favCache);
    }
    return FB.getFavs(u.uid).then(function (f) {
      favCache = f;
      emitFavChanged();
      return f;
    }).catch(function () {
      emitFavChanged();
      return favCache;
    });
  }
  function isFav(kind, id) {
    var arr = kind === 'support' ? favCache.supports : favCache.chars;
    return arr.indexOf(id) > -1 || arr.indexOf(String(id)) > -1;
  }
  function toggleFav(kind, id) {
    var u = currentUser();
    if (!u) { toast('로그인 후 이용할 수 있습니다.'); return Promise.resolve(false); }
    var key = kind === 'support' ? 'favSupports' : 'favChars';
    var doc = userDoc();
    var arr = (doc && doc[key]) ? doc[key].slice() : (kind === 'support' ? favCache.supports.slice() : favCache.chars.slice());
    var idx = arr.indexOf(id);
    if (idx < 0) idx = arr.indexOf(String(id));
    var nowOn;
    if (idx < 0 && arr.length >= 16) {
      toast('즐겨찾기는 최대 16개만 등록 할 수 있어요.');
      return Promise.resolve(false);
    }
    if (idx > -1) { arr.splice(idx, 1); nowOn = false; }
    else { arr.push(id); nowOn = true; }
    var patch = {}; patch[key] = arr;
    return saveUserPatch(patch).then(function () {
      favCache[key === 'favSupports' ? 'supports' : 'chars'] = arr;
      document.dispatchEvent(new CustomEvent('fpp:fav-changed'));
      return nowOn;
    });
  }

  /* ---------- 내비게이션 ---------- */
  var NAV = [
    { key: 'home', page: 'Main.html', hash: '#home', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"/></svg>', tabIcon: '<span class="btab-icon btab-icon--line ic-v2-navigation-home-line" aria-hidden="true"></span><span class="btab-icon btab-icon--fill ic-v2-navigation-home-fill" aria-hidden="true"></span>' },
    { key: 'characters', page: 'Main.html', hash: '#characters', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9"><circle cx="9" cy="8" r="3.4"/><path d="M2.8 19.5c.9-3.6 3.2-5.4 6.2-5.4s5.3 1.8 6.2 5.4" stroke-linecap="round"/><circle cx="17" cy="9" r="2.6"/><path d="M15.5 14.4c2.9-.4 5 1.2 5.8 4.3" stroke-linecap="round"/></svg>', tabIcon: '<span class="btab-icon btab-icon--line ic-v2-community-group-line" aria-hidden="true"></span><span class="btab-icon btab-icon--fill ic-v2-community-group-fill" aria-hidden="true"></span>' },
    { key: 'pvp', page: 'Main.html', hash: '#pvp', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 19l4.5-4.5M14.5 4.5l-9 9 3 3 9-9zM13 6l5 5M17.5 3.5l3 3"/></svg>', tabIcon: '<span class="btab-icon btab-icon--line ic-v2-navigation-store-line" aria-hidden="true"></span><span class="btab-icon btab-icon--fill ic-v2-navigation-store-fill" aria-hidden="true"></span>' },
    { key: 'community', page: 'Community.html', hash: '#home', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 5h16v12h-9l-4.5 3.5V17H4z"/><path d="M8 9.5h8M8 12.5h5" stroke-linecap="round"/></svg>', tabIcon: '<span class="btab-icon btab-icon--line ic-v2-navigation-board-timeline-line" aria-hidden="true"></span><span class="btab-icon btab-icon--fill ic-v2-navigation-board-timeline-fill" aria-hidden="true"></span>' },
    { key: 'cs', page: 'CustomerService.html', hash: '', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 12a7 7 0 0 1 14 0v3.5a2 2 0 0 1-2 2h-1.5V13H19" stroke-linejoin="round"/><path d="M5 12v5.5a2 2 0 0 0 2 2H8.5V13H5" stroke-linejoin="round"/><path d="M12 21c2 0 3.5-1 4-2.5" stroke-linecap="round"/></svg>' }
  ];
  var NAV_LABELS = {
    home: '홈',
    characters: '캐릭터',
    pvp: 'PvP 패치',
    community: '커뮤니티',
    cs: '고객센터',
    comhome: '커뮤니티 홈',
    patch: '패치노트',
    board: '게시판',
    event: '이벤트',
    mainhome: '메인 홈'
  };
  /* 커뮤니티 전용 메뉴 (§27) */
  var COMM_NAV = [
    { key: 'comhome', page: 'Community.html', hash: '#home', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 5h16v11h-8l-4 3.5V16H4z"/><path d="M8.5 9h7M8.5 12h4.5" stroke-linecap="round"/></svg>', tabIcon: '<span class="btab-icon btab-icon--line ic-v2-navigation-board-timeline-line" aria-hidden="true"></span><span class="btab-icon btab-icon--fill ic-v2-navigation-board-timeline-fill" aria-hidden="true"></span>', label: '홈' },
    { key: 'patch', page: 'Community.html', hash: '#patch', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9.5 12h6M9.5 15.5h4" stroke-linecap="round"/></svg>', tabIcon: '<span class="btab-icon btab-icon--line ic-v2-community-board-all-line" aria-hidden="true"></span><span class="btab-icon btab-icon--fill ic-v2-community-board-all-fill" aria-hidden="true"></span>', label: '패치노트' },
    { key: 'board', page: 'Community.html', hash: '#board', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 6.5h16M4 12h16M4 17.5h10"/></svg>', tabIcon: '<span class="btab-icon btab-icon--line ic-v2-community-board-line" aria-hidden="true"></span><span class="btab-icon btab-icon--fill ic-v2-community-board-fill" aria-hidden="true"></span>', label: '게시판' },
    { key: 'event', page: 'Community.html', hash: '#event', icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="4" y="9.5" width="16" height="4"/><path d="M5.5 13.5v6.5h13v-6.5M12 9.5v10.5"/><path d="M12 9.5S7.8 9.7 6.8 7.5C6 5.8 7.2 4.4 8.8 4.6c2.1.3 3.2 4.9 3.2 4.9zM12 9.5s4.2.2 5.2-2c.8-1.7-.4-3.1-2-2.9-2.1.3-3.2 4.9-3.2 4.9z"/></svg>', tabIcon: '<span class="btab-icon btab-icon--line ic-v2-navigation-community-event-line" aria-hidden="true"></span><span class="btab-icon btab-icon--fill ic-v2-navigation-community-event-fill" aria-hidden="true"></span>', tabLabel: { ko: '이벤트' } },
    { key: 'mainhome', page: 'Main.html', hash: '#home', exit: true, icon: '<svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 3.5h4A1.5 1.5 0 0 1 20 5v14a1.5 1.5 0 0 1-1.5 1.5h-4"/><path d="M10 16.5L5.5 12 10 7.5"/><path d="M5.5 12H15"/></svg>', tabIcon: '<span class="btab-icon ic-v2-navigation-login-line" aria-hidden="true"></span>', label: '메인 홈' }
  ];
  var communityVisibility = { boards: true, events: true };
  function navForPage() {
    if (document.body && document.body.getAttribute('data-page') === 'community') {
      return COMM_NAV.filter(function (item) {
        return !(item.key === 'board' && !communityVisibility.boards) &&
          !(item.key === 'event' && !communityVisibility.events);
      });
    }
    return NAV;
  }
  var activeNav = 'home';
  var deskNavResizeBound = false;
  function getCommunityVisibility() {
    return { boards: communityVisibility.boards, events: communityVisibility.events };
  }
  function patchNotesPage() {
    return communityVisibility.boards || communityVisibility.events ? 'Community.html' : 'Main.html';
  }
  function applyCommunityVisibility(next) {
    communityVisibility = {
      boards: !next || next.boards !== false,
      events: !next || next.events !== false
    };
    var allSectionsOff = !communityVisibility.boards && !communityVisibility.events;
    NAV_LABELS.community = allSectionsOff ? '패치노트' : '커뮤니티';
    NAV[3].page = allSectionsOff ? 'Main.html' : 'Community.html';
    NAV[3].hash = allSectionsOff ? '#patch' : '#home';
    COMM_NAV[1].page = allSectionsOff ? 'Main.html' : 'Community.html';
    document.querySelectorAll('.profile-menu-stats, .profile-card-stats').forEach(function (stats) {
      stats.hidden = !communityVisibility.boards;
    });
    if (document.getElementById('desktopNav')) {
      buildDeskNav();
      buildTabs();
      buildDrawer();
      setActiveNav(activeNav);
    }
    document.dispatchEvent(new CustomEvent('fpp:community-visibility', { detail: getCommunityVisibility() }));
  }

  function toggleHeaderPopup(anchor, opener) {
    if (anchor.classList.contains('is-selected')) {
      closePopups();
    } else {
      opener(anchor);
    }
  }
  function isMobileLayout() {
    return window.matchMedia ? window.matchMedia('(max-width: 767px)').matches : window.innerWidth <= 767;
  }

  function buildHeader() {
    var hd = $('appHeader');
    if (!hd) return;
    hd.innerHTML =
      '<div class="hd-in">' +
      '<button class="hd-burger icon-btn" id="btnBurger" aria-label="전체 메뉴 열기" aria-expanded="false"><span class="top-menu-icon ic-v2-navigation-menu-line" aria-hidden="true"></span></button>' +
      '<a class="logo" href="' + pageUrl('Main.html#home') + '" aria-label="FPP 홈으로">' +
      '<img class="logo-img" src="img/logo-light.png" alt="FPP 로고" />' +
      '<img class="logo-img-dark" src="img/logo-dark.png" alt="FPP 로고" />' +
      '</a>' +
      '<div class="hd-right">' +
      '<button class="icon-btn hd-settings" id="btnSet" aria-label="설정" title="설정" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="top-menu-icon top-menu-icon--fill ic-v2-navigation-setting-fill" aria-hidden="true"></span></button>' +
      '<button class="icon-btn" id="btnFav" aria-label="즐겨찾기" title="즐겨찾기" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="top-menu-icon top-menu-icon--fill ic-v2-community-favorite-fill" aria-hidden="true"></span></button>' +
      '<button class="icon-btn hd-notify" id="btnNotify" aria-label="알림" title="알림" aria-haspopup="dialog" aria-expanded="false">' +
      '<span class="top-menu-icon top-menu-icon--fill ic-v2-navigation-alarm-fill" aria-hidden="true"></span>' +
      '<span class="skel hd-notify-skeleton" aria-hidden="true"></span><i class="notify-dot" hidden></i></button>' +
      '<div class="hd-auth" id="hdAuth"></div>' +
      '</div></div>';
    $('btnBurger').addEventListener('click', toggleDrawer);
    $('btnSet').addEventListener('click', function (e) {
      e.stopPropagation();
      if (isMobileLayout()) {
        location.href = settingsPageUrl();
        return;
      }
      toggleHeaderPopup($('btnSet'), onSettingsClick);
    });
    $('btnFav').addEventListener('click', function (e) { e.stopPropagation(); toggleHeaderPopup($('btnFav'), openFavPopup); });
    $('btnNotify').addEventListener('click', function (e) {
      e.stopPropagation();
      if (!_authResolved) return;
      if (isMobileLayout() && !currentUser()) {
        location.href = pageUrl('Login.html');
        return;
      }
      toggleHeaderPopup($('btnNotify'), openNotifyPopup);
    });
    updateNotificationBadge();
  }

  function buildDeskNav() {
    var nv = $('desktopNav');
    if (!nv) return;
    var items = navForPage();
    nv.innerHTML = '<div class="fpp-nav__bar"><span class="fpp-nav__indicator" aria-hidden="true"></span>' + items.map(function (n) {
      return '<a class="dnav' + (n.exit ? ' dnav--exit' : '') + '" data-nav="' + n.key + '" href="' + pageUrl(n.page + n.hash) + '">' + (n.label || NAV_LABELS[n.key] || n.key) + '</a>';
    }).join('') + '</div>';
    if (!deskNavResizeBound) {
      window.addEventListener('resize', moveDeskNavIndicator, { passive: true });
      deskNavResizeBound = true;
    }
  }

  function moveDeskNavIndicator() {
    var bar = document.querySelector('.fpp-nav__bar');
    if (!bar) return;
    var indicator = bar.querySelector('.fpp-nav__indicator');
    var active = bar.querySelector('.dnav.active');
    if (!indicator || !active) return;

    var barRect = bar.getBoundingClientRect();
    var activeRect = active.getBoundingClientRect();
    var firstPosition = !indicator.dataset.ready;
    if (firstPosition) indicator.style.transition = 'none';
    indicator.style.width = activeRect.width + 'px';
    indicator.style.height = activeRect.height + 'px';
    indicator.style.transform = 'translate(' +
      (activeRect.left - barRect.left - bar.clientLeft) + 'px,' +
      (activeRect.top - barRect.top - bar.clientTop) + 'px)';
    indicator.classList.toggle('is-exit', active.classList.contains('dnav--exit'));

    if (firstPosition) {
      indicator.dataset.ready = 'true';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (indicator.isConnected) indicator.style.removeProperty('transition');
        });
      });
    }
  }

  function updateAuthArea() {
    var box = $('hdAuth');
    if (!box) return;
    var u = currentUser();
    var mobile = isMobileLayout();
    var loading = !_authResolved;
    var notificationLoading = loading || !_headerNotificationsResolved;
    var settingsButton = $('btnSet');
    var favoriteButton = $('btnFav');
    var notify = $('btnNotify');
    if (settingsButton) {
      settingsButton.hidden = mobile;
      settingsButton.setAttribute('aria-hidden', String(mobile));
    }
    if (favoriteButton) {
      favoriteButton.hidden = mobile;
      favoriteButton.setAttribute('aria-hidden', String(mobile));
    }
    if (notify) {
      var notifyHidden = !loading && !u && !mobile;
      notify.hidden = notifyHidden;
      notify.setAttribute('aria-hidden', String(notifyHidden));
      notify.tabIndex = notificationLoading ? -1 : (u || mobile ? 0 : -1);
      notify.classList.toggle('is-loading', notificationLoading);
      notify.setAttribute('aria-busy', String(notificationLoading));
      notify.setAttribute('aria-disabled', String(notificationLoading));
      if (!u && !loading) {
        notify.classList.remove('is-selected');
        notify.setAttribute('aria-expanded', 'false');
      }
    }
    if (loading) {
      box.setAttribute('aria-busy', 'true');
      box.innerHTML =
        '<div class="hd-auth-desktop hd-auth-skeleton-desktop" aria-hidden="true">' +
        '<span class="skel hd-auth-skeleton-signup"></span>' +
        '<span class="skel hd-auth-skeleton-login"></span>' +
        '</div>' +
        '<span class="hd-auth-mobile hd-auth-skeleton-mobile skel" aria-hidden="true"></span>';
      return;
    }
    box.removeAttribute('aria-busy');
    if (!u) {
      box.innerHTML =
        '<div class="hd-auth-desktop">' +
        '<button class="btn btn--ghost btn--sm" data-auth="signup">회원가입</button>' +
        '<button class="btn btn--gold btn--sm" data-auth="login">로그인</button>' +
        '</div>' +
        '<a class="hd-auth-mobile icon-btn" href="' + profilePageUrl() + '" aria-label="내 프로필" title="내 프로필">' +
        '<span class="top-menu-icon ic-v2-navigation-profile-fill" aria-hidden="true"></span></a>';
      box.querySelectorAll('[data-auth]').forEach(function (button) {
        button.addEventListener('click', function () {
          location.href = pageUrl(button.getAttribute('data-auth') === 'signup' ? 'Login.html#signup' : 'Login.html');
        });
      });
      updateNotificationBadge();
      return;
    }
    var ud = userDoc() || {};
    box.innerHTML =
      '<button class="hd-avatar" id="btnProfile" aria-label="프로필 메뉴"><img src="' + esc(avatarOf(ud.profileIcon)) + '" alt="내 프로필"></button>';
     box.querySelector('#btnProfile').addEventListener('click', function (e) {
       e.stopPropagation();
       if (isMobileLayout()) {
          location.href = profilePageUrl();
         return;
       }
       openProfilePopup(box.querySelector('#btnProfile'));
     });
    updateNotificationBadge();
  }

  function buildTabs() {
    var tabs = $('bottomTabs');
    if (!tabs) return;
    var items = navForPage();
    if (items === NAV) items = NAV.slice(0, 4);
    /* 탭 개수만큼 1열로 분할 — 커뮤니티(5탭)가 4열 그리드에 밀려 2행으로 꺾이던 문제 방지 */
    tabs.style.gridTemplateColumns = 'repeat(' + items.length + ', minmax(0,1fr))';
    tabs.classList.toggle('cols5', items.length === 5);
    tabs.innerHTML = items.map(function (n) {
      var label = n.label || NAV_LABELS[n.key] || n.key;
      return '<a class="btab' + (n.exit ? ' btab--exit' : '') + '" data-nav="' + n.key + '" href="' + pageUrl(n.page + n.hash) + '" aria-label="' + label + '">' + (n.tabIcon || n.icon) + '<span>' + label + '</span></a>';
    }).join('');
  }
  function buildDrawer() {
    var dw = $('navDrawer');
    if (!dw) return;
    var onlyMainTab = isMobileLayout() && !communityVisibility.boards && !communityVisibility.events;

    // 메인 홈 메뉴 항목
    var mainHomeItems = [
      { key: 'home', page: 'Main.html', hash: '#home', icon: NAV[0].tabIcon || NAV[0].icon, label: NAV_LABELS.home },
      { key: 'characters', page: 'Main.html', hash: '#characters', icon: NAV[1].tabIcon || NAV[1].icon, label: NAV_LABELS.characters },
      { key: 'pvp', page: 'Main.html', hash: '#pvp', icon: NAV[2].tabIcon || NAV[2].icon, label: NAV_LABELS.pvp }
    ];
    if (onlyMainTab) {
      mainHomeItems.push(
        { key: 'patch', page: 'Main.html', hash: '#patch', icon: COMM_NAV[1].icon, label: '패치노트' },
        { key: 'cs', page: 'CustomerService.html', hash: '', icon: NAV[4].icon, label: NAV_LABELS.cs }
      );
    } else {
      mainHomeItems.push({ key: 'cs', page: 'CustomerService.html', hash: '', icon: NAV[4].icon, label: NAV_LABELS.cs });
    }
    
    // 커뮤니티 홈 메뉴 항목
    var commHomeItems = [
      { key: 'comhome', page: 'Community.html', hash: '#home', icon: COMM_NAV[0].tabIcon || COMM_NAV[0].icon, label: '커뮤니티 홈' },
      { key: 'patch', page: COMM_NAV[1].page, hash: '#patch', icon: COMM_NAV[1].tabIcon || COMM_NAV[1].icon, label: '패치노트' },
    ];
    if (communityVisibility.boards) commHomeItems.push({ key: 'board', page: 'Community.html', hash: '#board', icon: COMM_NAV[2].tabIcon || COMM_NAV[2].icon, label: '게시판' });
    if (communityVisibility.events) commHomeItems.push({ key: 'event', page: 'Community.html', hash: '#event', icon: COMM_NAV[3].tabIcon || COMM_NAV[3].icon, label: '이벤트' });

    var drawerTabsHTML =
      '<div class="drawer-tabs">' +
      '<button class="drawer-tab active" data-tab="main">메인 홈</button>' +
      (onlyMainTab ? '' : '<button class="drawer-tab" data-tab="community">' + (communityVisibility.boards || communityVisibility.events ? '커뮤니티 홈' : '패치노트') + '</button>') +
      '</div>';
    var communityNavHTML = onlyMainTab ? '' :
      '<nav class="drawer-nav drawer-nav-community" style="display:none;">' + commHomeItems.map(function (n) {
        return '<a class="drawer-item" href="' + pageUrl(n.page + n.hash) + '">' + n.icon + '<span>' + n.label + '</span></a>';
      }).join('') + '</nav>';
    
    dw.innerHTML =
      '<div class="drawer-head"><span class="logo-txt">FPP</span>' +
      '<button class="icon-btn" id="btnDrawerClose" aria-label="메뉴 닫기"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      drawerTabsHTML +
      '<nav class="drawer-nav drawer-nav-main">' + mainHomeItems.map(function (n) {
        return '<a class="drawer-item" href="' + pageUrl(n.page + n.hash) + '">' + n.icon + '<span>' + n.label + '</span></a>';
      }).join('') + '</nav>' + communityNavHTML;
    
    // 탭 전환 이벤트
    var tabs = dw.querySelectorAll('.drawer-tab');
    var navs = dw.querySelectorAll('.drawer-nav');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.toggle('active', t === tab); });
        navs.forEach(function (n) { 
          n.style.display = n.classList.contains('drawer-nav-' + target) ? 'block' : 'none'; 
        });
      });
    });
    
    $('btnDrawerClose').addEventListener('click', toggleDrawer);
    var bd = $('drawerBackdrop');
    if (bd) bd.addEventListener('click', toggleDrawer);
    dw.classList.add('drawer-ready');
  }
  function toggleDrawer() {
    var dw = $('navDrawer'), bd = $('drawerBackdrop');
    var open = dw.classList.toggle('open');
    if (bd) bd.hidden = !open;
    dw.setAttribute('aria-hidden', String(!open));
    var burger = $('btnBurger');
    if (burger) {
      burger.classList.toggle('is-selected', open);
      burger.setAttribute('aria-expanded', String(open));
    }
  }
  function setActiveNav(key) {
    activeNav = key;
    var map = { comhome: 'community', patch: 'community', board: 'community', event: 'community' };
    var k = document.querySelector('[data-nav="' + key + '"]') ? key : (map[key] || key);
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-nav') === k);
    });
    moveDeskNavIndicator();
  }

  /* ---------- 팝업 ---------- */
  var activePopupAnchor = null;
  function closePopups() {
    var root = $('popupRoot');
    if (root) root.innerHTML = '';
    if (activePopupAnchor) {
      activePopupAnchor.classList.remove('is-selected');
      activePopupAnchor.setAttribute('aria-expanded', 'false');
      activePopupAnchor = null;
    }
    activeNotificationPopup = null;
    activeProfileMenuPopup = null;
    document.removeEventListener('click', onDocClickPop);
  }
  function onDocClickPop(e) {
    if (!e.target.closest || !e.target.closest('.pop')) closePopups();
  }
  function openPopup(anchor, html, width, extraClass) {
    closePopups();
    var el = document.createElement('div');
    el.className = 'pop' + (extraClass ? ' ' + extraClass : '');
    if (width) el.style.width = width;
    el.innerHTML = html;
    $('popupRoot').appendChild(el);
    if (anchor && anchor.classList) {
      activePopupAnchor = anchor;
      anchor.classList.add('is-selected');
      anchor.setAttribute('aria-expanded', 'true');
    }
    
    /* 중앙 고정 팝업은 앵커 위치 계산을 건너뛴다. */
    var isCentered = el.classList.contains('pop--fav') || el.classList.contains('pop--myinfo');
    if (!isCentered) {
      var r = anchor.getBoundingClientRect();
      var pw = width ? Math.min(parseInt(width, 10), Math.max(0, window.innerWidth - 16)) : 300;
      var left = Math.min(Math.max(8, r.right - pw), window.innerWidth - pw - 8);
      el.style.left = left + 'px';
      el.style.top = (r.bottom + 10) + 'px';
    }
    
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () { document.addEventListener('click', onDocClickPop); }, 0);
    return { el: el, close: closePopups };
  }

  function openFavPopup(anchor) {
    var u = currentUser();
    var pop = openPopup(anchor,
      '<div class="pop-head"><b>즐겨찾기</b></div>' +
      '<div class="pop-tabs"><button class="pop-tab is-on" data-ft="char" type="button">캐릭터</button>' +
      '<button class="pop-tab" data-ft="support" type="button">현질 서포터</button></div>' +
      '<div class="pop-body" id="favBody"></div>', '320px');
    pop.el.classList.add('pop--fav');
    var kind = 'char';
    function paint() {
      var body = pop.el.querySelector('#favBody');
      var arr = kind === 'char' ? favCache.chars : favCache.supports;
      var pageTab = kind === 'char' ? '' : '?tab=support';
      if (!arr.length) {
        body.innerHTML = '<div class="empty fav-empty"><p>즐겨찾기한 캐릭터 없음</p><small>추가해보세요</small>' +
          '<a class="btn btn--gold btn--sm" href="' + pageUrl('Main.html#characters' + pageTab) + '">캐릭터 페이지로</a></div>';
        return;
      }
      body.innerHTML = '<div class="fav-grid">' + arr.slice(0, 16).map(function (id) {
        var c = findCharInCache(id, kind);
        var img = c ? (c.image || PLACEHOLDER_IMG) : PLACEHOLDER_IMG;
        var nm = c && c.name ? c.name : ('캐릭터 ' + id);
        return '<button class="fav-cell" type="button" data-fid="' + esc(id) + '" aria-label="' + esc(nm) + '">' +
          '<span class="fav-ava"><img src="' + esc(img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"></span>' +
          '<span class="fav-nm">' + esc(nm) + '</span></button>';
      }).join('') + '</div>';
      body.querySelectorAll('.fav-cell').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.getAttribute('data-fid');
          location.href = pageUrl('Main.html#characters' + pageTab + (pageTab ? '&' : '?') + 'fav=1&char=' + encodeURIComponent(id));
        });
      });
    }
    pop.el.querySelectorAll('.pop-tab').forEach(function (tb) {
      tb.addEventListener('click', function () {
        kind = tb.getAttribute('data-ft');
        pop.el.querySelectorAll('.pop-tab').forEach(function (x) { x.classList.toggle('is-on', x === tb); });
        paint();
      });
    });
    loadFavs().then(function() {
      loadCharCache().then(paint);
    });
  }

  function openAuthPopup(anchor) {
    var pop = openPopup(anchor,
      '<div class="pop-head"><b>계정</b></div>' +
      '<div class="pop-body">' +
      '<a class="pop-item" href="' + pageUrl('Login.html') + '">' + IC.user + '<span>로그인</span></a>' +
      '<a class="pop-item" href="' + pageUrl('Login.html#signup') + '">' + IC.edit + '<span>회원가입</span></a>' +
      '</div>', '240px');
    pop.el.classList.add('pop--auth');
  }

  function onSettingsClick(anchor) {
    var items = [
      ['notice', '공지사항', '<span class="menu-icon ic-v2-object-notice-line" aria-hidden="true"></span>'],
      ['notify', '알림 설정', '<span class="menu-icon ic-v2-navigation-alarm-line" aria-hidden="true"></span>'],
      ['theme', '테마 변경', '<span class="menu-icon ic-v2-control-theme-device-fill" aria-hidden="true"></span>'],
      ['appIcon', '앱 아이콘 변경', '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 13.5l2.2 2.2L15.5 11" stroke-linecap="round" stroke-linejoin="round"/></svg>']
    ];
    var pop = openPopup(anchor,
      '<div class="pop-head"><b>설정</b></div>' +
      '<div class="pop-body">' + items.map(function (it) {
        return '<button class="pop-item" data-act="' + it[0] + '" type="button">' + it[2] + '<span>' + it[1] + '</span></button>';
      }).join('') + '</div>', '260px');
    pop.el.classList.add('pop--settings');
    pop.el.querySelectorAll('.pop-item').forEach(function (b) {
      b.addEventListener('click', function () {
        closePopups();
        var fn = SET_ACTIONS[b.getAttribute('data-act')];
        if (fn) fn();
      });
    });
  }

  function openProfilePopup(anchor) {
    var u = currentUser();
    if (!u) return;
    var ud = userDoc() || {};
    var c = ud.counts || {};
    var noticeCount = visibleNotifications().filter(function (n) { return !n.read; }).length;
    var pop = openPopup(anchor,
      '<div class="profile-menu">' +
      '<div class="profile-menu-head">' +
      '<div class="profile-menu-user"><button class="prof-ava" id="pfAvatar" type="button" aria-label="프로필 정보 열기"><img src="' + esc(avatarOf(ud.profileIcon)) + '" alt="프로필 이미지"><span class="prof-ava-home ic-v2-navigation-home-fill" aria-hidden="true"></span></button>' +
      '<div class="profile-menu-name"><div><b class="prof-nick">' + esc(ud.nickname || u.displayName || '선원') + '</b>' +
      '<button class="profile-copy" id="pfCopy" type="button" aria-label="닉네임 복사">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></div></div>' +
      '</div><button class="profile-logout" id="pfOut" type="button">로그아웃</button></div>' +
      '<div class="profile-menu-stats"' + (communityVisibility.boards ? '' : ' hidden') + '>' +
      '<div class="profile-stat-row"><span class="profile-stat-icon profile-stat-icon--post" aria-hidden="true"><span class="menu-icon ic-v2-community-write-line"></span></span><span class="profile-stat-label">게시글 작성</span><b>' + (c.posts || 0) + '</b></div>' +
      '<div class="profile-stat-row"><span class="profile-stat-icon profile-stat-icon--comment" aria-hidden="true"><span class="menu-icon ic-v2-community-reply-line"></span></span><span class="profile-stat-label">댓글 작성</span><b>' + (c.comments || 0) + '</b></div>' +
      '<div class="profile-stat-row"><span class="profile-stat-icon profile-stat-icon--like" aria-hidden="true"><span class="menu-icon ic-v2-community-like-line"></span></span><span class="profile-stat-label">좋아요 한 글</span><b>' + (c.likes || 0) + '</b></div>' +
      '</div>' +
      '<div class="profile-menu-actions">' +
      '<button class="profile-menu-action" id="pfNotice" type="button">' +
      '<span class="menu-icon ic-v2-navigation-alarm-line" aria-hidden="true"></span><span>알림</span><em>' + esc(noticeCount) + '</em></button>' +
      '<div class="profile-menu-divider"></div>' +
      '<button class="profile-menu-action" id="pfMy" type="button"><span class="top-menu-icon ic-v2-navigation-profile-fill" aria-hidden="true"></span><span>내 정보</span></button>' +
      '<button class="profile-menu-action" id="pfMessages" type="button">' +
      '<span class="menu-icon ic-v2-navigation-message-line" aria-hidden="true"></span><span>쪽지</span></button>' +
      '</div>', '340px');
    pop.el.classList.add('pop--profile');
    activeProfileMenuPopup = pop;
    pop.el.querySelector('#pfCopy').addEventListener('click', function () {
      var nickname = ud.nickname || u.displayName || '선원';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(nickname).then(function () { toast('닉네임을 복사했습니다.', 'ok'); }).catch(function () { toast('닉네임 복사에 실패했습니다.', 'err'); });
      } else {
        toast('이 브라우저에서는 복사를 지원하지 않습니다.');
      }
    });
    pop.el.querySelector('#pfAvatar').addEventListener('click', function () { closePopups(); openMyInfoPopup('profile'); });
    pop.el.querySelector('#pfMy').addEventListener('click', function () { closePopups(); openMyInfoPopup('my-info'); });
    pop.el.querySelector('#pfOut').addEventListener('click', function () {
      closePopups();
      var auth = FB.ready && FB.auth();
      if (!auth || !auth.signOut) return;
      _authResolved = false;
      _headerNotificationsResolved = false;
      updateAuthArea();
      auth.signOut().then(function () {
        toast('로그아웃 되었습니다.');
      }).catch(function (error) {
        _authResolved = true;
        _headerNotificationsResolved = true;
        notifyUser();
        toast(FB.errMsg(error), 'err');
      });
    });
    pop.el.querySelector('#pfNotice').addEventListener('click', function () {
      closePopups();
      openNotifyPopup($('btnNotify'));
    });
    pop.el.querySelector('#pfMessages').addEventListener('click', function () {
      closePopups();
      toast('쪽지 기능은 준비 중입니다.');
    });
    loadNotifications(true);
  }

  /* ---------- 바디 스크롤 잠금 (패널·모달 오픈 시 뒷배경 고정) ---------- */
  var lockCount = 0, lockY = 0;
  function lockBody() {
    if (lockCount === 0) {
      lockY = window.scrollY || document.documentElement.scrollTop || 0;
      var sw = window.innerWidth - document.documentElement.clientWidth; /* 스크롤바 폭 보정 */
      document.body.classList.add('body-lock');
      document.body.style.top = -lockY + 'px';
      if (sw > 0) document.body.style.paddingRight = sw + 'px';
    }
    lockCount++;
  }
  function unlockBody() {
    if (lockCount === 0) return;
    lockCount--;
    if (lockCount === 0) {
      document.body.classList.remove('body-lock');
      document.body.style.top = '';
      document.body.style.paddingRight = '';
      window.scrollTo(0, lockY);
    }
  }

  /* ---------- 모달 ---------- */
  function openModal(opts) {
    var back = document.createElement('div');
    back.className = 'modal-back' + (opts.backCls ? ' ' + opts.backCls : '');
    back.innerHTML = '<div class="modal ' + (opts.cls || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '">' +
      '<div class="modal-head"><h3>' + esc(opts.title) + '</h3>' +
      '<button class="modal-x" type="button" aria-label="닫기"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>' +
      '<div class="modal-body">' + opts.body + '</div></div>';
    $('popupRoot').appendChild(back);
    requestAnimationFrame(function () { back.classList.add('show'); });
    lockBody(); /* 뒷배경 스크롤 잠금 */
    var closed = false;
    function close() {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onModalKeydown);
      back.classList.remove('show');
      unlockBody();
      setTimeout(function () { back.remove(); }, 260);
    }
    function onModalKeydown(e) {
      if (e.key === 'Escape') close();
    }
    back.querySelector('.modal-x').addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', onModalKeydown);
    return { el: back, body: back.querySelector('.modal-body'), close: close };
  }

  /* ---------- FPP 이용약관, 개인정보처리방침 및 운영정책 ---------- */
  var FPP_LEGAL_DOCS = {
    terms: {
      title: 'FPP 이용약관',
      effective: '시행일: 2026.10.29',
      sections: [
        { title: '제1조 (목적)', paragraphs: [
          '이 약관은 FPPatch 운영자(이하 “운영자”)가 제공하는 FPP 사이트 및 관련 기능(이하 “서비스”)의 이용에 관한 기본 사항과 이용자 및 운영자의 권리·의무를 정합니다.'
        ] },
        { title: '제2조 (정의)', paragraphs: [
          '“이용자”는 사이트를 방문하거나 계정을 만들어 서비스 기능을 이용하는 사람을 말합니다. “회원”은 계정으로 로그인하여 프로필, 즐겨찾기, 게시물·댓글, 고객센터 문의 등 회원 기능을 사용하는 이용자를 말합니다.',
          '“이용자 콘텐츠”는 회원이 서비스에 등록한 닉네임, 프로필 이미지, 게시물, 댓글, 문의 내용 및 첨부 자료 등 이용자가 작성하거나 제공한 정보를 말합니다.'
        ] },
        { title: '제3조 (서비스의 내용과 성격)', paragraphs: [
          '서비스는 항해왕 열혈항로 관련 캐릭터·서포터 정보, PvP 패치 정보, 패치노트·커뮤니티·이벤트 콘텐츠, 계정 프로필, 즐겨찾기, 댓글 및 고객센터 문의 기능을 제공합니다. 운영자는 기능을 추가·변경하거나 제공을 중단할 수 있습니다.',
          'FPPatch는 팬 커뮤니티 및 정보 제공을 위한 독립 사이트입니다. 별도의 명시가 없는 한 게임의 개발사·배급사·권리자와 공식 제휴, 후원 또는 보증 관계를 의미하지 않습니다. 게임명·캐릭터·게임 이미지 등 제3자 권리는 각 권리자에게 귀속됩니다.',
          '게임 정보와 패치 내용은 변경되거나 늦게 반영될 수 있으며, 중요한 내용은 게임 내 공지 등 공식 채널에서도 확인해 주세요.'
        ] },
        { title: '제4조 (약관의 게시와 변경)', paragraphs: [
          '운영자는 이 약관을 사이트에서 확인할 수 있도록 게시합니다. 운영자는 관련 법령을 준수하는 범위에서 약관을 변경할 수 있으며, 변경 시 적용일과 주요 내용을 서비스 화면 또는 공지로 사전에 안내합니다.',
          '이용자는 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 회원 탈퇴를 요청할 수 있습니다. 변경 내용이 이용자에게 중대한 영향을 주는 경우에는 관련 법령과 이용자 보호 기준에 따라 안내합니다.'
        ] },
        { title: '제5조 (계정과 이용자의 의무)', paragraphs: [
          '회원은 가입 및 프로필 설정 시 타인을 사칭하거나 권리를 침해하는 정보를 사용해서는 안 됩니다. 계정 접근 정보를 안전하게 관리하고, 무단 사용이나 보안 문제가 의심되면 고객센터로 알려야 합니다.',
          '미성년자는 관련 법령상 필요한 경우 법정대리인의 동의를 받아 서비스를 이용해야 합니다. 회원은 계정과 서비스 기능을 이용해 다른 이용자나 운영자에게 피해를 주거나 서비스 운영을 방해해서는 안 됩니다.'
        ] },
        { title: '제6조 (금지 행위)', paragraphs: [
          '이용자는 법령 또는 제3자의 권리를 침해하는 행위, 타인의 개인정보·계정정보를 무단으로 수집·공개하는 행위, 운영자나 다른 이용자를 사칭하는 행위를 해서는 안 됩니다.',
          '괴롭힘·혐오·협박·성적 수치심을 유발하는 콘텐츠, 불법 촬영물이나 아동·청소년 대상 성착취물, 사기·피싱·악성코드, 불법 프로그램 또는 보안 우회 방법을 게시하거나 유포해서는 안 됩니다.',
          '반복 게시·도배, 허위 정보의 고의적 유포, 무단 광고·영리 홍보, 계정·아이템 등의 현금 거래 유도, 과도한 자동화 접근이나 서비스 장애를 유발하는 행위도 금지됩니다.'
        ] },
        { title: '제7조 (이용자 콘텐츠와 지식재산권)', paragraphs: [
          '이용자는 자신이 작성한 콘텐츠에 대한 권리를 보유합니다. 이용자는 운영자가 서비스 제공·유지·개선에 필요한 범위에서 콘텐츠를 저장, 표시, 검색 및 기술적으로 변환할 수 있도록 비독점적이고 무상인 이용을 허락합니다. 운영자는 이용자의 별도 동의 없이 이용자 콘텐츠를 서비스 운영 목적을 벗어나 상업적으로 이용하지 않습니다.',
          '이용자는 게시할 권한이 있는 콘텐츠만 등록해야 합니다. 타인의 저작권·상표권·초상권 등 권리를 침해하는 콘텐츠가 확인되면 운영자는 관련 법령과 절차에 따라 노출 제한 또는 삭제 조치를 할 수 있습니다.',
          '사이트의 자체 제작 콘텐츠와 제3자 게임 콘텐츠의 권리는 각 운영자 또는 해당 권리자에게 있습니다. 사전 허가 없이 복제·배포하거나 영리 목적으로 이용해서는 안 됩니다.'
        ] },
        { title: '제8조 (게시물 조치와 이용 제한)', paragraphs: [
          '운영자는 약관·운영정책 위반, 권리 침해 신고, 법령상 요청, 보안 또는 서비스 안정성 문제를 확인한 경우 게시물의 노출 제한·이동·삭제, 글쓰기 등 기능 제한 또는 계정 이용 제한을 할 수 있습니다.',
          '조치는 위반의 내용·반복 여부·피해 정도와 긴급성을 고려하여 필요한 범위에서 적용합니다. 긴급하거나 법령상 필요한 경우 먼저 조치한 뒤 안내할 수 있으며, 이용자는 고객센터를 통해 조치 사유를 문의하거나 재검토를 요청할 수 있습니다.'
        ] },
        { title: '제9조 (서비스의 변경·중단)', paragraphs: [
          '운영자는 점검, 장애, 보안 대응, 외부 서비스 문제 또는 운영상 필요에 따라 서비스의 전부 또는 일부를 변경·일시 중단할 수 있습니다. 가능한 경우 사이트 공지 등으로 안내하되, 긴급 상황에서는 사후 안내할 수 있습니다.',
          '운영자는 서비스의 연속성, 게시물의 영구 보존 또는 정보의 최신성을 보장하지 않습니다. 이용자는 중요한 게시물이나 자료를 별도로 보관해야 합니다.'
        ] },
        { title: '제10조 (유료 서비스 및 외부 링크)', paragraphs: [
          '현재 FPP 사이트 자체는 유료 이용권이나 게임 내 상품을 판매하거나 결제를 중개하지 않습니다. 외부 사이트에서 이루어지는 거래와 게임 내 결제는 해당 제공자의 조건에 따르며 운영자는 이를 대행하지 않습니다.',
          '사이트에는 외부 웹사이트나 커뮤니티로 연결되는 링크가 포함될 수 있습니다. 외부 서비스의 내용·개인정보 처리·거래에는 해당 서비스의 약관과 정책이 적용됩니다.'
        ] },
        { title: '제11조 (책임과 안내)', paragraphs: [
          '운영자는 관련 법령이 허용하는 범위에서 정보의 정확성·완전성·중단 없는 제공을 보증하지 않습니다. 이용자는 서비스 정보를 참고 자료로 활용하고, 게임 관련 중요한 결정은 공식 채널에서 확인해야 합니다.',
          '운영자는 고의 또는 과실이 있는 경우를 포함하여 관련 법령에 따라 부담하는 책임을 제한하지 않습니다. 그 밖의 책임 범위는 관계 법령에 따릅니다.'
        ] },
        { title: '제12조 (회원 탈퇴 및 분쟁 처리)', paragraphs: [
          '회원은 사이트에서 제공하는 계정 삭제 기능 또는 고객센터를 통해 회원 탈퇴를 요청할 수 있습니다. 탈퇴 후 계정과 연결된 기능을 이용할 수 없으며, 법령상 보존 의무가 있거나 기술적으로 필요한 정보는 해당 범위에서 처리될 수 있습니다.',
          '서비스 이용에 관한 문의와 분쟁은 고객센터를 통해 먼저 해결을 요청할 수 있습니다. 이 약관과 서비스 이용에는 관계 법령이 적용되며, 분쟁의 관할은 관계 법령에 따릅니다.'
        ] }
      ]
    },
    privacy: {
      title: 'FPP 개인정보처리방침',
      effective: '시행일: 2026.10.29',
      notice: '현재 저장소에서 확인한 FPP 기능을 기준으로 작성한 초안이며 법률 자문이 아닙니다. 게시 전 운영자 법적 명칭·연락처, Firebase의 실제 처리·저장 위치와 보유기간을 확인해 보완하세요.',
      sections: [
        { title: '1. 개인정보 처리자와 적용 범위', paragraphs: [
          'FPPatch 사이트 운영자는 서비스 제공에 필요한 범위에서 개인정보를 처리합니다. 이 방침은 FPP 사이트의 회원가입·로그인, 프로필, 커뮤니티, 알림 및 고객센터 기능에 적용됩니다.',
          '개인정보 관련 문의와 권리행사는 고객센터를 통해 접수할 수 있습니다. 회원 탈퇴 후에도 요청할 수 있도록 운영자 명칭과 로그인 없이 이용 가능한 연락 경로를 게시 전에 확인해야 합니다.'
        ] },
        { title: '2. 개인정보 처리 목적', paragraphs: [
          '운영자는 회원 가입·로그인 및 계정 관리, 이메일 인증·비밀번호 재설정, 닉네임·프로필·즐겨찾기·알림 설정 제공을 위해 정보를 처리합니다.',
          '커뮤니티 게시물·댓글·캐릭터 팁의 작성과 표시, 좋아요 및 조회수 집계, 서비스 운영·보안, 고객센터 문의 접수와 답변을 위해 관련 정보를 처리합니다.',
          '브라우저 알림은 이용자가 알림 권한을 허용하고 기능을 켠 경우에만 등록·전송을 위해 처리합니다.'
        ] },
        { title: '3. 처리하는 개인정보 항목과 수집 방법', paragraphs: [
          '회원 계정: Firebase 사용자 식별자(UID), 이메일 주소, 닉네임, 프로필 아이콘, 가입 시각 및 계정 설정 정보가 처리됩니다. 이메일·비밀번호 로그인과 Google 로그인을 지원합니다. 비밀번호 인증은 Firebase Authentication이 처리하며, FPP의 회원 프로필 문서에는 비밀번호를 저장하지 않습니다.',
          '서비스 이용 및 이용자 콘텐츠: 즐겨찾기 캐릭터·서포터, 알림 설정, 게시물 제목·내용·분류·작성 시각, 댓글·캐릭터 팁, 좋아요 정보와 작성자 UID·닉네임·프로필 아이콘이 처리됩니다. 게시물·댓글·팁과 표시 이름은 커뮤니티에서 다른 방문자에게 공개될 수 있습니다.',
          '고객센터 문의: 문의 제목·내용, 회원 UID·닉네임, 접수 시각·상태 및 운영자 답변이 처리됩니다. 문의 기록은 작성 회원과 권한이 있는 운영자가 확인할 수 있습니다.',
          '선택형 웹 푸시: 이용자가 브라우저 알림을 허용한 경우 Firebase Cloud Messaging 토큰, 브라우저별 식별자와 알림 설정이 처리됩니다. 알림을 끄면 저장된 토큰 삭제를 요청합니다.',
          '조회수 중복 집계: 조회수 중복을 줄이기 위해 브라우저가 api.ipify.org에 IP 주소 조회 요청을 보냅니다. FPP 코드는 응답받은 IP의 해시값을 콘텐츠 식별자 및 조회 시각과 함께 Firebase에 저장하며, IP 조회에 실패하면 브라우저 User-Agent 문자열의 해시값을 대신 사용합니다. IPify 서비스에는 요청자의 IP가 전달되며, 해시값도 개인을 식별할 가능성이 완전히 제거되었다고 보장할 수 없습니다.',
          '브라우저 저장소: 화면 설정, 로그인 후 돌아갈 페이지, 푸시 기기 식별자와 서버 연결 실패 시 임시 게시물·팁·문의 내용 등이 이용자의 브라우저 localStorage 또는 sessionStorage에 남을 수 있습니다. 브라우저의 사이트 데이터 삭제 기능으로 제거할 수 있습니다.',
          '정보는 회원이 직접 입력하거나 로그인·콘텐츠 작성·문의·알림 설정을 하는 과정에서 수집됩니다. 저장소 코드에서 별도의 Google Analytics 또는 Unity 분석 기능은 확인되지 않았습니다.'
        ] },
        { title: '4. 공개 및 제3자 제공', paragraphs: [
          '운영자는 이용자의 동의가 있거나 법령상 근거가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 다만 게시물·댓글·팁과 닉네임·프로필 아이콘은 서비스 기능상 사이트 방문자에게 공개될 수 있으므로 공개를 원하지 않는 개인정보를 콘텐츠에 포함하지 마세요.',
          'FPP 사이트에는 외부 웹사이트 링크가 포함될 수 있습니다. 외부 서비스로 이동하면 해당 사업자의 개인정보처리방침이 적용됩니다.'
        ] },
        { title: '5. 처리 위탁과 국외 처리', paragraphs: [
          '현재 코드에서 확인되는 주요 외부 서비스는 Google Firebase의 Authentication(계정 인증), Cloud Firestore(서비스 데이터 저장·조회), Cloud Messaging(선택형 웹 푸시)과 사이트 정적 호스팅을 제공하는 GitHub Pages입니다. 페이지 조회수 집계에는 IP 조회 서비스인 api.ipify.org가 사용됩니다.',
          'Firebase 프로젝트의 데이터베이스 리전, 각 서비스의 실제 처리 국가, 국외 이전 항목·시점·보유기간은 소스 코드만으로 확인할 수 없습니다. 운영자는 Firebase와 호스팅 설정 및 각 사업자의 계약·정책을 확인해 실제 국외 이전 여부와 세부 정보를 이 방침에 반영해야 합니다.'
        ] },
        { title: '6. 보유 및 이용 기간, 파기', paragraphs: [
          '운영자는 처리 목적에 필요한 기간 동안 정보를 보유하고, 목적이 달성되거나 삭제 요청이 확인되면 관련 법령상 보존 의무가 있는 경우를 제외하고 지체 없이 삭제하는 것을 원칙으로 합니다. 다만 현재 코드에는 게시물·문의·조회 식별 기록의 자동 보유기간이나 일괄 파기 일정이 설정되어 있지 않으므로, 실제 보유기간은 운영자가 확정해 공개해야 합니다.',
          '현재 회원 탈퇴 기능은 Firebase Authentication 계정을 삭제하지만 Firestore의 프로필·게시물·댓글·팁·문의 및 조회 중복 방지 기록을 일괄 삭제하지 않습니다. 따라서 일부 기록은 탈퇴 후에도 남을 수 있습니다. 탈퇴 전 삭제할 게시물은 직접 삭제하고, 그 밖의 삭제 요청은 운영자에게 접수해 주세요.',
          '브라우저에 저장된 임시 데이터는 운영자의 서버에서 원격 삭제할 수 없으며, 이용자가 브라우저의 사이트 데이터 삭제 기능을 이용해야 제거됩니다.'
        ] },
        { title: '7. 이용자의 권리와 행사 방법', paragraphs: [
          '이용자는 관계 법령에 따라 개인정보 열람·정정·삭제·처리정지 또는 동의 철회를 요청할 수 있습니다. 프로필과 계정 기능은 사이트 설정에서 직접 변경하거나 삭제할 수 있으며, 그 밖의 요청은 고객센터를 통해 접수할 수 있습니다.',
          '요청을 처리하기 위해 본인 확인을 요청할 수 있습니다. 현재 1:1 문의는 로그인 후 이용하도록 되어 있으므로, 탈퇴 후 권리행사를 위한 비회원 연락 방법과 운영자 연락처를 게시 전에 마련해야 합니다.'
        ] },
        { title: '8. 안전성 확보와 자동 저장 장치', paragraphs: [
          '운영자는 개인정보 접근 권한을 제한하고 Firebase 보안 규칙 등 서비스에 적용된 보호조치를 유지하도록 노력합니다. 서비스에 필요한 브라우저 저장소와 알림 권한은 브라우저 설정에서 확인·삭제하거나 해제할 수 있습니다.',
          '현재 사이트 코드에서 직접 설정하는 광고 쿠키나 분석 쿠키는 확인되지 않았습니다. 외부 서비스와 브라우저 기능은 각 사업자·브라우저의 정책에 따라 필요한 기술 정보를 처리할 수 있습니다.'
        ] },
        { title: '9. 개인정보 보호 문의와 방침 변경', paragraphs: [
          '개인정보 처리 문의는 FPP 사이트 고객센터로 접수할 수 있습니다. 개인정보 처리자 명칭, 담당자 및 로그인 없이 이용할 수 있는 연락처는 운영자가 확인하여 이 방침에 게시해야 합니다.',
          '이 방침이 변경되면 변경 내용과 시행일을 사이트에서 안내합니다. 이 방침은 2026.10.29부터 적용됩니다.'
        ] }
      ]
    },
    operations: {
      title: 'FPP 운영정책',
      effective: '시행일: 2026.10.29',
      sections: [
        { title: '1. 목적과 적용 범위', paragraphs: [
          '이 운영정책은 FPP 사이트의 계정·프로필, 게시물·댓글, 패치노트·커뮤니티·이벤트, 고객센터 기능을 안전하고 원활하게 이용하기 위한 기준입니다. 사이트 이용약관과 함께 적용되며, 관련 법령이 우선합니다.'
        ] },
        { title: '2. 이용자의 권리와 책임', paragraphs: [
          '이용자는 사이트가 제공하는 정보를 확인하고, 회원 기능을 이용하며, 서비스 이용 중 발생한 문제를 고객센터에 문의할 수 있습니다.',
          '이용자는 본인의 계정을 안전하게 관리하고, 다른 이용자의 권리와 개인정보를 존중해야 합니다. 계정 공유·양도 또는 타인의 계정 사용으로 발생한 문제에 대해서는 관련 법령과 이용약관에 따라 처리합니다.'
        ] },
        { title: '3. 닉네임과 프로필', paragraphs: [
          '다음과 같은 닉네임·프로필 이미지·소개 정보는 변경 요청, 노출 제한 또는 삭제 대상이 될 수 있습니다: 타인이나 운영자 사칭, 욕설·혐오·성적 표현, 개인정보 노출, 광고·거래 유도, 저작권·상표권·초상권 침해, 불법 또는 서비스 목적과 현저히 맞지 않는 내용.',
          '운영자는 문제가 확인되면 이용자에게 수정을 요청하거나 서비스에서 지원하는 범위에서 해당 프로필을 제한할 수 있습니다.'
        ] },
        { title: '4. 게시물과 댓글 금지 기준', paragraphs: [
          '게시물·댓글·이미지·문의 등 이용자 콘텐츠에 다음 내용을 포함해서는 안 됩니다.',
          '① 불법 정보, 범죄 조장, 위협 또는 폭력 선동  ② 혐오·차별·괴롭힘·모욕·명예훼손  ③ 성적 착취물, 불법 촬영물 또는 동의 없이 유포한 사적 이미지  ④ 본인 또는 타인의 주소·연락처·계정정보 등 민감한 개인정보',
          '⑤ 저작권·상표권·초상권 등 제3자 권리를 침해하는 자료  ⑥ 사기·피싱·악성코드·불법 프로그램 및 보안 우회 정보  ⑦ 무단 광고·영리 홍보·현금 거래 유도  ⑧ 반복 게시·도배·허위 신고·게시판 목적과 무관한 내용',
          '⑨ 자동화 접근이나 조작으로 서비스·게시물·이용자에게 피해를 주는 행위. 위 항목은 예시이며, 유사한 피해를 일으키는 콘텐츠도 제한될 수 있습니다.'
        ] },
        { title: '5. 고객센터 문의와 신고', paragraphs: [
          '문제 게시물, 권리 침해 또는 계정 보안 문제는 고객센터의 1:1 문의로 접수할 수 있습니다. 확인을 돕기 위해 게시물 주소나 제목, 발생 시점, 문제 내용을 구체적으로 기재해 주세요.',
          '타인을 괴롭히거나 허위 사실로 피해를 주기 위한 신고, 반복적·무관한 문의, 운영자에 대한 욕설·협박·성희롱은 제한 대상이 될 수 있습니다. 민감한 개인정보는 문의 내용에 불필요하게 포함하지 마세요.'
        ] },
        { title: '6. 운영 조치와 기준', paragraphs: [
          '운영자는 위반의 심각성, 반복 여부, 고의성, 발생한 피해와 긴급성을 고려하여 게시물의 노출 제한·이동·삭제, 닉네임 변경 요청, 글쓰기 등 일부 기능 제한, 일시 또는 지속적인 계정 이용 제한을 적용할 수 있습니다.',
          '가벼운 위반은 안내나 수정 요청으로 처리할 수 있으며, 중대한 위반·반복 위반·이용자 안전이나 서비스 보안에 즉각적인 위험이 있는 경우에는 사전 안내 없이 콘텐츠를 제한하거나 계정을 임시 제한할 수 있습니다. 필요한 경우 관련 법령에 따라 조치합니다.',
          '신고가 접수되었다는 이유만으로 위반이 확정되는 것은 아닙니다. 운영자는 확인 가능한 자료와 서비스 기록을 검토하여 조치를 결정하며, 신고 내용이나 증거를 조작한 경우에도 제한 조치가 적용될 수 있습니다.'
        ] },
        { title: '7. 조치에 대한 문의와 재검토', paragraphs: [
          '이용자는 조치 안내를 받은 경우 고객센터에 계정 식별 정보, 조치 내용 및 재검토를 요청하는 이유를 제출할 수 있습니다. 운영자는 가능한 범위에서 확인 후 결과를 안내합니다. 처리 기간은 사안과 자료 확인에 따라 달라질 수 있습니다.'
        ] },
        { title: '8. 정책 변경과 시행', paragraphs: [
          '운영자는 서비스 기능이나 안전 기준의 변경에 따라 이 정책을 수정할 수 있으며, 변경 내용은 사이트 공지 또는 연결된 화면으로 안내합니다. 운영정책 관련 문의는 고객센터를 이용해 주세요.'
        ] }
      ]
    }
  };

  function renderLegalDocument(doc) {
    var notice = doc.notice || '이 문서는 FPP 사이트의 이용 기준을 안내하며, 개별 사안에 대한 법률 자문을 대신하지 않습니다. 실제 운영 내용과 관련 법령에 따라 조정될 수 있습니다.';
    var html = '<div class="legal-document">' +
      '<div class="legal-disclaimer"><strong>안내</strong><p>' + esc(notice) + '</p></div>' +
      '<p class="legal-effective">' + esc(doc.effective) + '</p>';
    doc.sections.forEach(function (section) {
      html += '<section class="legal-section"><h4>' + esc(section.title) + '</h4>' +
        section.paragraphs.map(function (paragraph) { return '<p>' + esc(paragraph) + '</p>'; }).join('') +
        '</section>';
    });
    return html + '</div>';
  }

  var FPP_LEGAL_TAB_KEYS = ['terms', 'privacy', 'operations'];
  var FPP_LEGAL_TAB_LABELS = {
    terms: '이용약관',
    privacy: '개인정보처리방침',
    operations: '운영정책'
  };

  function renderLegalTabs(activeKey) {
    var tabs = FPP_LEGAL_TAB_KEYS.map(function (key) {
      var selected = key === activeKey;
      return '<button class="legal-tab' + (selected ? ' is-active' : '') + '" type="button" role="tab"' +
        ' id="legal-tab-' + key + '" aria-controls="legal-document-panel" aria-selected="' + (selected ? 'true' : 'false') + '"' +
        ' tabindex="' + (selected ? '0' : '-1') + '" data-legal-tab="' + key + '">' +
        esc(FPP_LEGAL_TAB_LABELS[key]) + '</button>';
    }).join('');
    return '<div class="legal-tabs" role="tablist" aria-label="약관 및 정책">' + tabs + '</div>' +
      '<div class="legal-tab-panel" id="legal-document-panel" role="tabpanel" tabindex="0"' +
      ' aria-labelledby="legal-tab-' + activeKey + '">' + renderLegalDocument(FPP_LEGAL_DOCS[activeKey]) + '</div>';
  }

  function selectLegalTab(body, key, moveFocus) {
    var doc = FPP_LEGAL_DOCS[key];
    if (!doc) return;
    var tabs = Array.prototype.slice.call(body.querySelectorAll('[data-legal-tab]'));
    tabs.forEach(function (tab) {
      var selected = tab.getAttribute('data-legal-tab') === key;
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.setAttribute('tabindex', selected ? '0' : '-1');
      if (selected && moveFocus) tab.focus();
    });
    var panel = body.querySelector('#legal-document-panel');
    panel.innerHTML = renderLegalDocument(doc);
    panel.setAttribute('aria-labelledby', 'legal-tab-' + key);
    body.scrollTop = 0;
  }

  function bindLegalModalTabs(body) {
    var tabs = Array.prototype.slice.call(body.querySelectorAll('[data-legal-tab]'));
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        selectLegalTab(body, tab.getAttribute('data-legal-tab'), false);
      });
      tab.addEventListener('keydown', function (event) {
        var index = tabs.indexOf(tab);
        var next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        selectLegalTab(body, tabs[next].getAttribute('data-legal-tab'), true);
      });
    });
  }

  function openLegalDocument(key) {
    if (!FPP_LEGAL_DOCS[key]) return;
    var modal = openModal({
      title: 'FPP 정책 안내',
      cls: 'modal--legal',
      body: renderLegalTabs(key)
    });
    bindLegalModalTabs(modal.body);
  }

  function initLegalFooterLinks() {
    document.querySelectorAll('[data-legal-doc]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        openLegalDocument(link.getAttribute('data-legal-doc'));
      });
    });
  }

  /* ---------- 설정 액션 ---------- */
  var SET_ACTIONS = {
    notice: function () {
      var m = openModal({
        title: '공지사항',
        cls: 'modal--settings-choice modal--notice',
        backCls: 'modal-back--settings-choice',
        body: '<div class="skel-row"><div class="skel" style="height:14px;width:70%"></div></div><div class="skel-row"><div class="skel" style="height:14px;width:55%"></div></div>'
      });
      FB.getNotices().then(function (list) {
        if (!list.length) { m.body.innerHTML = '<div class="empty"><p>등록된 공지사항이 없습니다.</p></div>'; return; }
        m.body.innerHTML = list.map(function (n) {
          return '<div class="ntc-row" data-nid="' + esc(n.docId) + '" role="button" tabindex="0"><div class="ntc-t"><span class="badge badge--patch">공지</span>' + esc(n.title) + '</div>' +
            '<div class="ntc-m">' + esc(n.author) + ' · ' + esc(fmtDate(n.date)) + '</div></div>';
        }).join('');
        m.body.querySelectorAll('.ntc-row').forEach(function (r) {
          r.addEventListener('click', function () {
            var n = list.filter(function (x) { return x.docId === r.getAttribute('data-nid'); })[0];
            if (n) {
              m.body.innerHTML = '<button class="btn btn--ghost btn--sm" id="ntcBack" type="button">← 목록</button>' +
                '<h4 style="margin:14px 0 6px;font-size:16px">' + esc(n.title) + '</h4>' +
                '<p style="font-size:12px;color:var(--text-3);margin-bottom:12px">' + esc(n.author) + ' · ' + esc(fmtDate(n.date)) + '</p>' +
                '<div class="rich">' + renderContent(n.content) + '</div>';
              m.body.querySelector('#ntcBack').addEventListener('click', function () { m.close(); SET_ACTIONS.notice(); });
            }
          });
        });
      }).catch(function (e) { m.body.innerHTML = '<div class="empty"><p>' + esc(FB.errMsg(e)) + '</p></div>'; });
    },
    notify: function () {
      var s = (userDoc() && userDoc().settings) || {};
      var rows = [
        ['patch', '패치노트', NOTIFY_DESCRIPTIONS.patch],
        ['fav', '즐겨찾기', NOTIFY_DESCRIPTIONS.fav],
        ['comment', '댓글', NOTIFY_DESCRIPTIONS.comment],
        ['event', '이벤트', NOTIFY_DESCRIPTIONS.event]
      ];
      var m = openModal({
        title: '알림 설정',
        cls: 'modal--settings-choice modal--notification-settings',
        backCls: 'modal-back--settings-choice',
        body: rows.map(function (r) {
          var on = s[r[0]] === true;
          return '<div class="tgl-row"><span class="tgl-copy"><b>' + r[1] + ' 알림</b><small>' + r[2] + '</small></span>' +
            '<button class="tgl' + (on ? ' on' : '') + '" data-k="' + r[0] + '" role="switch" aria-checked="' + on + '" aria-label="' + r[1] + ' 알림" type="button"><i></i></button></div>';
        }).join('')
      });
      m.body.querySelectorAll('.tgl').forEach(function (b) {
        b.addEventListener('click', function () {
          var k = b.getAttribute('data-k');
          var on = !b.classList.contains('on');
          b.classList.toggle('on', on);
          b.setAttribute('aria-checked', String(on));
          var st = (userDoc() && userDoc().settings) || {};
          st[k] = on;
          saveUserPatch({ settings: st }).catch(function () { });
           var label = rows.filter(function (r) { return r[0] === k; })[0][1];
           updateNotificationBadge();
          toast(label + ' 알림이 ' + (on ? '켜졌습니다.' : '꺼졌습니다.'), 'ok');
        });
      });
    },
    theme: function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'dark';
      var m = openModal({
        title: '테마 설정',
        cls: 'modal--settings-choice modal--theme',
        backCls: 'modal-back--settings-choice',
        body: '<div class="setting-choice-list">' +
          '<button class="setting-choice' + (cur === 'light' ? ' is-on' : '') + '" data-th="light" type="button"><span class="setting-choice-icon ic-v2-control-theme-light-fill" aria-hidden="true"></span><span>라이트 모드</span></button>' +
          '<button class="setting-choice' + (cur === 'dark' ? ' is-on' : '') + '" data-th="dark" type="button"><span class="setting-choice-icon ic-v2-control-theme-dark-fill" aria-hidden="true"></span><span>다크 모드</span></button>' +
          '</div>'
      });
      m.body.querySelectorAll('.setting-choice').forEach(function (b) {
        b.addEventListener('click', function () {
          applyTheme(b.getAttribute('data-th'));
          m.body.querySelectorAll('.setting-choice').forEach(function (x) { x.classList.toggle('is-on', x === b); });
          toast('테마가 적용되었습니다.', 'ok');
        });
      });
    },
    appIcon: function () {
      var doc = userDoc();
      var userSettings = (doc && doc.settings) || {};
      var savedIcon = userSettings.appIcon;
      var hasUnsupportedIcon = savedIcon != null && savedIcon !== 'logo-dark' && savedIcon !== 'logo-light';
      var cur = savedIcon === 'logo-dark' || savedIcon === 'logo-light' ? savedIcon :
        (document.documentElement.getAttribute('data-theme') === 'light' ? 'logo-light' : 'logo-dark');
      if (hasUnsupportedIcon) {
        var cleanSettings = Object.assign({}, userSettings);
        delete cleanSettings.appIcon;
        if (doc) doc.settings = cleanSettings;
        saveUserPatch({ settings: cleanSettings }).catch(function () { });
      }
      var icons = [
        ['logo-dark', '다크 로고', 'img/logo-dark.png'],
        ['logo-light', '라이트 로고', 'img/logo-light.png']
      ];
      var m = openModal({
        title: '앱 아이콘 변경',
        cls: 'modal--settings-choice modal--app-icon',
        backCls: 'modal-back--settings-choice',
        body: '<div class="pick-grid">' + icons.map(function (ic) {
          return '<button class="pick pick--icon' + (cur === ic[0] ? ' is-on' : '') + '" data-ic="' + ic[0] + '" type="button">' +
            '<span class="icon-prev icon-' + ic[0] + '"><img src="' + esc(ic[2]) + '" alt="" aria-hidden="true"></span><span>' + ic[1] + '</span></button>';
        }).join('') + '</div>' +
        '<p class="pick-note">선택한 앱 아이콘은 바탕화면 바로가기 생성 시 적용됩니다.</p>' +
        '<button class="btn btn--gold btn--block" id="mkShortcut" type="button" style="margin-top:12px">바탕화면 바로가기 만들기</button>'
      });
      m.body.querySelectorAll('.pick').forEach(function (b) {
        b.addEventListener('click', function () {
          cur = b.getAttribute('data-ic');
          m.body.querySelectorAll('.pick').forEach(function (x) { x.classList.toggle('is-on', x === b); });
          var s = (userDoc() && userDoc().settings) || {};
          s.appIcon = cur;
          saveUserPatch({ settings: s }).catch(function () { });
        });
      });
      var deferred = null;
      window.addEventListener('beforeinstallprompt', function (e) { deferred = e; });
      m.body.querySelector('#mkShortcut').addEventListener('click', function () {
        if (deferred) {
          deferred.prompt();
          deferred.userChoice.then(function (ch) {
            toast(ch.outcome === 'accepted' ? '바로가기가 생성되었습니다.' : '바로가기 생성이 취소되었습니다.');
            deferred = null;
          });
        } else {
          toast('이 브라우저는 바로가기 생성을 지원하지 않습니다. 브라우저 메뉴의 "홈 화면에 추가"를 이용해 주세요.');
        }
      });
    }
  };

  /* ---------- 프로필 설정 ---------- */
  function openMyInfoPopup(initialPanel) {
    var u = currentUser();
    if (!u) return;
    var ud = userDoc() || {};
    var initialIcon = Number(ud.profileIcon);
    if (isNaN(initialIcon)) initialIcon = 0;
    var initialNick = ud.nickname || u.displayName || '선원';
    var draftIcon = initialIcon;
    var isGoogle = (u.providerData || []).some(function (p) { return p.providerId === 'google.com'; });
    var authMethod = isGoogle ? '구글' : '이메일';
    var memberId = ud.memberNumber || ud.memberId || ud.uid || u.uid;

    var m = openModal({
      title: '정보 설정',
      cls: 'profile-settings-modal',
      body:
        '<div class="profile-settings-shell">' +
        '<aside class="profile-settings-nav">' +
        '<button class="profile-nav-item is-on" type="button" data-profile-panel="profile" aria-selected="true">프로필 정보</button>' +
        '<button class="profile-nav-item" type="button" data-profile-panel="notifications" aria-selected="false">알림 정보</button>' +
        '<button class="profile-nav-item" type="button" data-profile-panel="my-info" aria-selected="false">내 정보</button>' +
        '</aside>' +
        '<section class="profile-settings-content">' +
        '<div class="profile-panel" id="profileInfoPanel">' +
        '<div class="profile-settings-grid">' +
        '<div class="profile-preview-card">' +
        '<div class="profile-cover"><img id="profileSettingCover" src="' + esc(avatarOf(draftIcon)) + '" alt=""></div>' +
        '<div class="profile-card-info">' +
        '<div class="profile-card-avatar">' +
        '<img id="profileSettingAvatar" src="' + esc(avatarOf(draftIcon)) + '" alt="프로필 이미지"></div>' +
        '<b class="profile-card-name" id="profileSettingName">' + esc(initialNick) + '</b>' +
        '<div class="profile-card-stats"' + (communityVisibility.boards ? '' : ' hidden') + '>' +
        '<div><b>' + ((ud.counts && ud.counts.posts) || 0) + '</b><small>게시글</small></div>' +
        '<div><b>' + ((ud.counts && ud.counts.comments) || 0) + '</b><small>댓글</small></div>' +
        '<div><b>' + ((ud.counts && ud.counts.likes) || 0) + '</b><small>좋아요</small></div>' +
        '</div></div></div>' +
        '<div class="profile-settings-fields">' +
        '<div class="profile-field">' +
        '<label>프로필 이미지 <span class="field-help" title="레포지토리에 포함된 프로필 아이콘을 선택합니다.">?</span></label>' +
        '<button class="profile-image-register" id="profileImageRegister" type="button">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="M3 16l4.5-4.5 3.5 3 2.5-2.5L21 17" stroke-linecap="round" stroke-linejoin="round"/></svg> 이미지 등록</button>' +
        '</div>' +
        '<div class="profile-field">' +
        '<label for="profileNickname">닉네임 <span class="field-help" tabindex="0" aria-describedby="nicknameHelp">?</span>' +
        '<span class="field-tooltip" id="nicknameHelp" role="tooltip">• 한글, 영어, 숫자만 사용할 수 있어요.<br>• 20자까지 입력할 수 있어요.<br>• 72시간마다 한 번만 변경할 수 있어요.</span></label>' +
        '<div class="profile-input-wrap"><input id="profileNickname" maxlength="20" value="' + esc(initialNick) + '" autocomplete="nickname"><button id="profileNicknameClear" type="button" aria-label="닉네임 지우기">×</button></div>' +
        '</div>' +
        '</div></div></div>' +
        '<div class="profile-panel my-info-panel" id="myInfoPanel" hidden>' +
        '<h3 class="my-info-heading">기본정보</h3>' +
        '<div class="my-info-card">' +
        '<div class="my-info-row"><span>닉네임</span><b class="my-info-value">' + esc(initialNick) + '</b></div>' +
        '<div class="my-info-row"><span>로그인 방식</span><b>' + authMethod + '</b></div>' +
        '<div class="my-info-row"><span>아이디</span><b class="my-info-value">' + esc(u.email || '이메일 없음') + '</b></div>' +
        '<div class="my-info-row"><span>비밀번호</span><button class="my-info-action" id="myInfoPassword" type="button">변경</button></div>' +
        '<div class="my-info-row"><span>회원번호</span><span class="my-info-member-tools">' +
        '<b class="my-info-value my-info-member-id" title="' + esc(memberId) + '">' + esc(memberId) + '</b>' +
        '<button class="my-info-copy" id="myInfoCopyMemberId" type="button" aria-label="회원번호 복사" title="회원번호 복사">복사</button></span></div>' +
        '</div>' +
        '<div class="my-info-delete-wrap"><button class="my-info-delete" id="myInfoDelete" type="button">회원탈퇴 <span aria-hidden="true">›</span></button></div>' +
        '</div>' +
        '<div class="profile-panel profile-notifications-panel" id="profileNotificationsPanel" hidden>' +
        '<div class="profile-notify-filters" role="tablist" aria-label="알림 종류">' +
        '<button class="profile-notify-filter is-on" type="button" data-notify-filter="all" role="tab" aria-selected="true">전체 알림</button>' +
        '<button class="profile-notify-filter" type="button" data-notify-filter="unread" role="tab" aria-selected="false">읽지 않음</button>' +
        '<button class="profile-notify-filter" type="button" data-notify-filter="read" role="tab" aria-selected="false">읽은 알림</button>' +
        '</div>' +
        '<div class="profile-notification-list" id="profileNotificationList" role="tabpanel" aria-live="polite"></div>' +
        '</div>' +
        '</section></div>' +
        '<div class="profile-settings-footer">' +
        '<button class="btn btn--ghost" id="profileClose" type="button">닫기</button>' +
        '<button class="btn btn--gold" id="profileSave" type="button" disabled>저장</button>' +
        '</div>'
    });

    var nickInput = m.body.querySelector('#profileNickname');
    var saveBtn = m.body.querySelector('#profileSave');
    var profileName = m.body.querySelector('#profileSettingName');
    var coverImg = m.body.querySelector('#profileSettingCover');
    var avatarImg = m.body.querySelector('#profileSettingAvatar');
    var profilePanel = m.body.querySelector('#profileInfoPanel');
    var myInfoPanel = m.body.querySelector('#myInfoPanel');
    var notificationsPanel = m.body.querySelector('#profileNotificationsPanel');
    var notificationListEl = m.body.querySelector('#profileNotificationList');
    var notificationFilter = 'all';
    var notificationVisibleCount = 10;
    var notificationBatchLoading = false;
    var notificationBatchToken = 0;

    function currentNick() { return nickInput.value.trim(); }
    function isDirty() { return draftIcon !== initialIcon || currentNick() !== initialNick; }
    function syncDraft() {
      profileName.textContent = currentNick() || '선원';
      saveBtn.disabled = !currentNick() || !isDirty();
    }
    function updateDraftIcon(index) {
      draftIcon = index;
      var src = avatarOf(index);
      coverImg.src = src;
      avatarImg.src = src;
      syncDraft();
    }
    function selectPanel(panel) {
      activeProfileNotificationsRenderer = null;
      profilePanel.hidden = panel !== 'profile';
      myInfoPanel.hidden = panel !== 'my-info';
      notificationsPanel.hidden = panel !== 'notifications';
      m.body.querySelectorAll('.profile-nav-item').forEach(function (item) {
        var active = item.getAttribute('data-profile-panel') === panel;
        item.classList.toggle('is-on', active);
        item.setAttribute('aria-selected', String(active));
      });
      saveBtn.hidden = panel !== 'profile';
      if (panel === 'notifications') {
        activeProfileNotificationsRenderer = function () {
          if (!m.el.isConnected || notificationsPanel.hidden) return false;
          renderProfileNotifications(false);
          return true;
        };
        notificationListEl.setAttribute('aria-busy', 'true');
        notificationListEl.innerHTML = notificationSkeletonRows(5, true);
        loadNotifications(true).then(function () {
          if (m.el.isConnected && !notificationsPanel.hidden) renderProfileNotifications(true);
        });
      }
    }
    function filteredProfileNotifications() {
      var items = notificationState.items.slice();
      if (notificationFilter === 'unread') return items.filter(function (n) { return !n.read; });
      if (notificationFilter === 'read') return items.filter(function (n) { return !!n.read; });
      return items;
    }
    function profileNotificationRows(items) {
      return items.map(function (n) {
        return '<button class="profile-notification-row' + (n.read ? '' : ' is-unread') + '" type="button" data-profile-notify-id="' + esc(n.docId) + '">' +
          '<span class="notify-icon notify-icon--' + esc(n.type) + '">' + notificationIcon(n.type) + '</span>' +
          '<span class="profile-notification-copy"><b>' + esc(notificationMessage(n)) + '</b>' +
          '<time>' + esc(notifyTime(n.createdAt || n.date)) + '</time></span>' +
          (n.read ? '' : '<i class="notify-unread-dot" aria-hidden="true"></i>') + '</button>';
      }).join('');
    }
    function renderProfileNotifications(reset) {
      if (reset) notificationVisibleCount = 10;
      notificationListEl.removeAttribute('aria-busy');
      var items = filteredProfileNotifications();
      m.body.querySelectorAll('[data-notify-filter]').forEach(function (button) {
        var active = button.getAttribute('data-notify-filter') === notificationFilter;
        button.classList.toggle('is-on', active);
        button.setAttribute('aria-selected', String(active));
      });
      var visible = items.slice(0, notificationVisibleCount);
      if (!items.length) {
        notificationListEl.innerHTML = '<div class="empty profile-notification-empty"><p>' +
          (notificationFilter === 'unread' ? '읽지 않은 알림이 없습니다.' : notificationFilter === 'read' ? '읽은 알림이 없습니다.' : '알림이 없습니다.') +
          '</p></div>';
        return;
      }
      notificationListEl.innerHTML = profileNotificationRows(visible);
      bindProfileNotificationRows();
    }
    function bindProfileNotificationRows() {
      notificationListEl.querySelectorAll('[data-profile-notify-id]').forEach(function (row) {
        if (row.getAttribute('data-notify-bound') === 'true') return;
        row.setAttribute('data-notify-bound', 'true');
        row.addEventListener('click', function () {
          var n = notificationState.items.filter(function (item) {
            return String(item.docId) === String(row.getAttribute('data-profile-notify-id'));
          })[0];
          if (!n) return;
          markNotificationRead(n);
          var href = notificationHref(n);
          if (href) {
            m.close();
            location.href = href;
          } else {
            renderProfileNotifications(false);
          }
        });
      });
    }
    function loadMoreProfileNotifications() {
      if (notificationBatchLoading) return;
      var items = filteredProfileNotifications();
      if (notificationVisibleCount >= items.length) return;
      notificationBatchLoading = true;
      var batchToken = ++notificationBatchToken;
      var currentTop = notificationListEl.scrollTop;
      var loader = document.createElement('div');
      loader.className = 'profile-notify-skeleton-batch';
      loader.setAttribute('aria-hidden', 'true');
      loader.innerHTML = notificationSkeletonRows(3, true);
      notificationListEl.setAttribute('aria-busy', 'true');
      notificationListEl.appendChild(loader);
      window.setTimeout(function () {
        if (batchToken !== notificationBatchToken || !m.el.isConnected || notificationsPanel.hidden) {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
          notificationListEl.removeAttribute('aria-busy');
          notificationBatchLoading = false;
          return;
        }
        if (loader.parentNode) loader.parentNode.removeChild(loader);
        notificationListEl.removeAttribute('aria-busy');
        var currentItems = filteredProfileNotifications();
        var nextCount = Math.min(currentItems.length, notificationVisibleCount + 10);
        notificationListEl.insertAdjacentHTML('beforeend', profileNotificationRows(currentItems.slice(notificationVisibleCount, nextCount)));
        notificationVisibleCount = nextCount;
        bindProfileNotificationRows();
        notificationListEl.scrollTop = currentTop;
        notificationBatchLoading = false;
      }, 120);
    }
    notificationListEl.addEventListener('scroll', function () {
      if (notificationListEl.scrollTop + notificationListEl.clientHeight >= notificationListEl.scrollHeight - 120) {
        loadMoreProfileNotifications();
      }
    });
    m.body.querySelectorAll('[data-notify-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        notificationFilter = button.getAttribute('data-notify-filter');
        notificationVisibleCount = 10;
          notificationBatchToken++;
          notificationBatchLoading = false;
        renderProfileNotifications(false);
        notificationListEl.scrollTop = 0;
      });
    });
    function confirmAccountDelete() {
      var cf = openModal({
        title: '탈퇴 확인',
        body: '<p style="font-size:14px;line-height:1.7">정말 탈퇴하시겠습니까?<br><b style="color:var(--red)">계정과 Firebase 사용자 데이터가 삭제되며 복구할 수 없습니다.</b></p>' +
          '<div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn--ghost btn--block" id="delNo" type="button">취소</button>' +
          '<button class="btn btn--danger btn--block" id="delYes" type="button">탈퇴하기</button></div>'
      });
      cf.body.querySelector('#delNo').addEventListener('click', cf.close);
      cf.body.querySelector('#delYes').addEventListener('click', function () {
        var user = FB.auth().currentUser;
        if (!user) { cf.close(); return; }
        user.delete().then(function () {
          cf.close(); m.close();
          toast('탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
        }).catch(function (e) {
          cf.close();
          toast(FB.errMsg(e) + ' — 보안 정책상 최근 로그인 후 다시 시도해 주세요.', 'err');
        });
      });
    }

    m.body.querySelector('#profileClose').addEventListener('click', m.close);
    m.body.querySelectorAll('.profile-nav-item').forEach(function (item) {
      item.addEventListener('click', function () { selectPanel(item.getAttribute('data-profile-panel')); });
    });
    nickInput.addEventListener('input', syncDraft);
    m.body.querySelector('#profileNicknameClear').addEventListener('click', function () {
      nickInput.value = '';
      nickInput.focus();
      syncDraft();
    });
    m.body.querySelector('#profileSave').addEventListener('click', function () {
      var nickname = currentNick();
      if (!nickname || !isDirty()) return;
      saveBtn.disabled = true;
      saveUserPatch({ profileIcon: draftIcon, nickname: nickname }).then(function () {
        notifyUser();
        m.close();
        toast('프로필이 저장되었습니다.', 'ok');
      }).catch(function (e) {
        saveBtn.disabled = false;
        toast(FB.errMsg(e), 'err');
      });
    });

    m.body.querySelector('#profileImageRegister').addEventListener('click', function () {
      openProfileImagePicker(draftIcon, function (index) { updateDraftIcon(index); });
    });
    m.body.querySelector('#myInfoDelete').addEventListener('click', confirmAccountDelete);
    m.body.querySelector('#myInfoCopyMemberId').addEventListener('click', function () {
      writeClipboardText(memberId).then(function () {
        toast('회원번호를 복사했습니다.', 'ok');
      }).catch(function () {
        toast('회원번호 복사에 실패했습니다.', 'err');
      });
    });
    m.body.querySelector('#myInfoPassword').addEventListener('click', function () {
      if (isGoogle) {
        toast('구글 계정의 비밀번호는 Google 계정에서 변경해 주세요.');
        return;
      }
      if (!u.email) {
        toast('비밀번호를 변경할 이메일 정보가 없습니다.', 'err');
        return;
      }
      if (!FB.ready) {
        toast('Firebase가 준비 중입니다. 잠시 후 다시 시도해 주세요.', 'err');
        return;
      }
      FB.auth().sendPasswordResetEmail(u.email).then(function () {
        toast('비밀번호 변경 메일을 보냈습니다. 메일함을 확인해 주세요.', 'ok');
      }).catch(function (e) {
        toast(FB.errMsg(e), 'err');
      });
    });
    selectPanel(initialPanel === 'my-info' ? 'my-info' : initialPanel === 'notifications' ? 'notifications' : 'profile');
  }

  function openProfileImagePicker(currentIcon, onRegister) {
    var pickedIcon = currentIcon;
    var picker = openModal({
      title: '프로필 이미지 등록',
      cls: 'profile-image-modal',
      body:
        '<div class="avatar-picker-preview"><img id="avatarPickerPreview" src="' + esc(avatarOf(pickedIcon)) + '" alt="선택한 프로필 이미지"></div>' +
        '<div class="avatar-picker-list"><div class="avatar-picker-grid">' +
        PROFILE_ICONS.map(function (src, i) {
          var name = PROFILE_ICON_FILES[i].replace(/\.png$/i, '');
          return '<button class="avatar-picker-item' + (i === pickedIcon ? ' is-selected' : '') + '" type="button" data-avatar-index="' + i + '" aria-label="' + esc(name) + '">' +
            '<img src="' + esc(src) + '" alt="' + esc(name) + '"></button>';
        }).join('') +
        '</div></div>' +
        '<div class="avatar-picker-footer"><button class="btn btn--ghost" id="avatarPickerCancel" type="button">취소</button>' +
        '<button class="btn btn--gold" id="avatarPickerRegister" type="button">등록</button></div>'
    });
    var preview = picker.body.querySelector('#avatarPickerPreview');
    picker.body.querySelectorAll('.avatar-picker-item').forEach(function (button) {
      button.addEventListener('click', function () {
        pickedIcon = Number(button.getAttribute('data-avatar-index'));
        preview.src = avatarOf(pickedIcon);
        picker.body.querySelectorAll('.avatar-picker-item').forEach(function (item) {
          item.classList.toggle('is-selected', item === button);
        });
      });
    });
    picker.body.querySelector('#avatarPickerCancel').addEventListener('click', picker.close);
    picker.body.querySelector('#avatarPickerRegister').addEventListener('click', function () {
      onRegister(pickedIcon);
      picker.close();
    });
  }

  /* ---------- 배너 ---------- */
  var PAGE_BANNERS = {
    characters: { image: 'https://image.qwenlm.ai/generated-images/987f7614-9aa7-4d15-8615-e46b88e3b65b/_result.png', title: '캐릭터', tag: 'CHARACTER ARCHIVE' },
    pvp: { image: 'https://image.qwenlm.ai/generated-images/f6395166-19bd-4970-8d7b-b86ac14dc624/_result.png', title: 'PvP 패치', tag: 'BALANCE UPDATE' },
    community: { image: 'https://image.qwenlm.ai/generated-images/6675fceb-63e6-4e40-830f-3de5669b163a/_result.png', title: '커뮤니티', tag: 'COMMUNITY' },
    patch: { image: 'https://image.qwenlm.ai/generated-images/dde0cd4a-dbb2-4686-bd7e-6e4493d52f77/_result.png', title: '패치노트', tag: 'PATCH NOTE' },
    board: { image: 'https://image.qwenlm.ai/generated-images/f81f7d7e-65e0-41f7-902f-7a0309e951fd/_result.png', title: '게시판', tag: 'BOARD' },
    event: { image: 'https://image.qwenlm.ai/generated-images/5e736e5b-ebea-4077-9479-ff5ee9aeae09/_result.png', title: '이벤트', tag: 'EVENTS' },
    cs: { image: 'https://image.qwenlm.ai/generated-images/1f2f41ad-4373-4c23-a185-5a2b8a6bd506/_result.png', title: '고객센터', tag: 'HELP CENTER' }
  };
  function renderHomeHero(mediaEl, parent, list, fallbackTitle) {
    var items = (list || []).map(function (b) {
      var link = String(b.link || '').trim();
      if (/^\s*(?:javascript|data|vbscript):/i.test(link)) link = '';
      return {
        image: b.image || b.imageUrl || b.imageURL || b.src || b.url || '',
        title: b.title || fallbackTitle || '',
        desc: b.tag || b.subtitle || '',
        link: link
      };
    });
    if (!items.length && fallbackTitle) items.push({ image: '', title: fallbackTitle, desc: '', link: '' });
    if (!items.length) { mediaEl.innerHTML = ''; return; }

    parent.classList.add('store-hero');
    parent.setAttribute('aria-roledescription', 'carousel');
    parent.setAttribute('aria-label', '메인 배너');

    var count = items.length;
    var loop = count > 1 ? items.concat(items, items) : items.slice();
    var pos = count > 1 ? count : 0;
    var cardsHTML = loop.map(function (b, i) {
      var index = i % count;
      var title = String(b.title || '');
      var classes = 'store-hero__card' + (!b.image ? ' noimg' : '');
      return '<article class="' + classes + '" data-index="' + index + '" data-link="' + (b.link ? '1' : '0') + '"' +
        ' role="' + (b.link ? 'link' : 'group') + '" tabindex="-1" aria-hidden="' + (i !== pos) + '"' +
        ' aria-label="' + esc(title) + '">' +
        (b.image ? '<img class="store-hero__img" src="' + esc(b.image) + '" alt="" draggable="false" loading="' + (i === pos ? 'eager' : 'lazy') + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'noimg\')">' : '') +
        '<div class="store-hero__text"><h2 class="store-hero__title">' + escBr(title) + '</h2>' +
        (b.desc ? '<p class="store-hero__desc">' + escBr(b.desc) + '</p>' : '') +
        '</div></article>';
    }).join('');
    mediaEl.innerHTML = '<div class="store-hero__track">' + cardsHTML + '</div>';
    var track = mediaEl.querySelector('.store-hero__track');
    var cards = Array.prototype.slice.call(track.children);
    var previous = null, next = null;
    if (count > 1) {
      previous = document.createElement('button');
      previous.className = 'store-hero__arrow store-hero__arrow--prev';
      previous.type = 'button';
      previous.setAttribute('aria-label', '이전 배너');
      previous.innerHTML = '<i class="ic-v2-control-arrow-left-line" aria-hidden="true"></i>';
      next = document.createElement('button');
      next.className = 'store-hero__arrow store-hero__arrow--next';
      next.type = 'button';
      next.setAttribute('aria-label', '다음 배너');
      next.innerHTML = '<i class="ic-v2-control-arrow-right-line" aria-hidden="true"></i>';
      parent.appendChild(previous);
      parent.appendChild(next);
    }

    var pager = null, countEl = null, playIcon = null, progressPaths = [];
    if (count > 1) {
      pager = document.createElement('button');
      pager.className = 'store-hero__pager';
      pager.type = 'button';
      pager.setAttribute('aria-label', '자동 배너 재생 일시정지');
      pager.setAttribute('aria-pressed', 'false');
      pager.innerHTML =
        '<svg class="store-hero__pager-border" viewBox="0 0 76 26" preserveAspectRatio="none" aria-hidden="true">' +
        '<path class="store-hero__pager-path" d="M 0.75 13.5 A 12.75 12.75 0 0 1 13.5 0.75 H 62.5 A 12.75 12.75 0 0 1 75.25 13.5" />' +
        '<path class="store-hero__pager-path" d="M 0.75 13.5 A 12.75 12.75 0 0 0 13.5 26.25 H 62.5 A 12.75 12.75 0 0 0 75.25 13.5" />' +
        '</svg><span class="store-hero__count" aria-live="polite"></span>' +
        '<i class="ic-v2-media-av-pause-fill" aria-hidden="true"></i>';
      parent.appendChild(pager);
      countEl = pager.querySelector('.store-hero__count');
      playIcon = pager.querySelector('i');
      progressPaths = Array.prototype.slice.call(pager.querySelectorAll('.store-hero__pager-path'));
    }

    var delay = 4200, transitionMs = 400;
    var playing = count > 1, elapsed = 0, lastFrame = null, frameId = null;
    var dragging = false, dragStart = 0, dragX = 0, pointerId = null, suppressClick = false;
    var animate = false, resizeObserver = null;
    function currentIndex() { return ((pos % count) + count) % count; }
    function restartPagerAnimation() {
      if (!pager) return;
      pager.classList.remove('is-animating');
      void pager.offsetWidth;
      pager.classList.add('is-animating');
    }
    function updateTransform() {
      var cardWidth = cards[0] ? cards[0].getBoundingClientRect().width : 0;
      if (!cardWidth) cardWidth = Math.min(mediaEl.clientWidth * 0.84, 644);
      var styles = window.getComputedStyle(track);
      var gap = parseFloat(styles.columnGap || styles.gap) || 20;
      parent.style.setProperty('--store-hero-card-half', (cardWidth / 2) + 'px');
      track.style.transition = animate && !dragging ? 'transform ' + transitionMs + 'ms ease' : 'none';
      track.style.transform = 'translate3d(' + (-(cardWidth / 2) - pos * (cardWidth + gap) + dragX) + 'px,0,0)';
    }
    function syncSlides() {
      cards.forEach(function (card, i) {
        var isActive = i === pos;
        card.setAttribute('aria-hidden', String(!isActive));
        card.tabIndex = isActive && card.getAttribute('data-link') === '1' ? 0 : -1;
      });
      if (countEl) countEl.textContent = (currentIndex() + 1) + '/' + count;
      updateTransform();
    }
    function progressTick(timestamp) {
      if (!playing) { frameId = null; return; }
      if (lastFrame !== null) elapsed += timestamp - lastFrame;
      lastFrame = timestamp;
      if (elapsed >= delay) {
        elapsed = 0;
        restartPagerAnimation();
        goBy(1, false);
      }
      frameId = window.requestAnimationFrame(progressTick);
    }
    function startProgress() {
      if (!playing || count < 2 || frameId !== null) return;
      frameId = window.requestAnimationFrame(progressTick);
    }
    function restartProgress() {
      elapsed = 0;
      lastFrame = null;
      restartPagerAnimation();
      startProgress();
    }
    function goBy(delta, resetTimer) {
      if (count < 2) return;
      if (resetTimer) restartProgress();
      var move = function () {
        animate = true;
        pos += delta;
        syncSlides();
      };
      if (pos < count || pos >= count * 2) {
        animate = false;
        pos = count + currentIndex();
        syncSlides();
        window.requestAnimationFrame(function () { window.requestAnimationFrame(move); });
      } else {
        move();
      }
    }
    function onTransitionEnd(event) {
      if (event.target !== track || event.propertyName !== 'transform') return;
      if (pos < count || pos >= count * 2) {
        animate = false;
        pos = count + currentIndex();
        syncSlides();
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () { animate = true; });
        });
      }
    }
    function onCardClick(event) {
      if (suppressClick) {
        event.preventDefault();
        suppressClick = false;
        return;
      }
      if (event.currentTarget.getAttribute('data-link') !== '1') return;
      var item = items[Number(event.currentTarget.getAttribute('data-index'))];
      if (item && item.link) location.href = item.link;
    }
    function onCardKeydown(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.currentTarget.getAttribute('data-link') !== '1') return;
      event.preventDefault();
      var item = items[Number(event.currentTarget.getAttribute('data-index'))];
      if (item && item.link) location.href = item.link;
    }
    function onPointerMove(event) {
      if (!dragging || (pointerId != null && event.pointerId !== pointerId)) return;
      dragX = event.clientX - dragStart;
      if (Math.abs(dragX) > 6) suppressClick = true;
      updateTransform();
    }
    function onPointerEnd(event) {
      if (!dragging || (pointerId != null && event.pointerId !== pointerId)) return;
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerEnd);
      document.removeEventListener('pointercancel', onPointerEnd);
      if (pager) pager.classList.remove('is-dragging');
      var dx = dragX;
      dragging = false;
      pointerId = null;
      dragX = 0;
      var threshold = (cards[0] ? cards[0].getBoundingClientRect().width : mediaEl.clientWidth) / 6;
      if (Math.abs(dx) > 6) {
        suppressClick = true;
        window.setTimeout(function () { suppressClick = false; }, 0);
      } else {
        suppressClick = false;
      }
      if (Math.abs(dx) > threshold) {
        goBy(dx < 0 ? 1 : -1, true);
      } else {
        updateTransform();
        restartProgress();
      }
    }
    function onPointerDown(event) {
      if (count < 2 || (event.button != null && event.button !== 0)) return;
      dragging = true;
      dragStart = event.clientX;
      dragX = 0;
      pointerId = event.pointerId;
      animate = false;
      if (pager) pager.classList.add('is-dragging');
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = null;
      lastFrame = null;
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerEnd);
      document.addEventListener('pointercancel', onPointerEnd);
      updateTransform();
    }
    function togglePlay() {
      playing = !playing;
      pager.setAttribute('aria-pressed', String(!playing));
      pager.setAttribute('aria-label', playing ? '자동 배너 재생 일시정지' : '자동 배너 재생');
      playIcon.className = playing ? 'ic-v2-media-av-pause-fill' : 'ic-v2-media-av-play-fill';
      pager.classList.toggle('is-paused', !playing);
      if (playing) restartProgress();
      else {
        if (frameId !== null) window.cancelAnimationFrame(frameId);
        frameId = null;
        elapsed = 0;
        lastFrame = null;
        restartPagerAnimation();
      }
    }
    function onResize() { updateTransform(); }

    cards.forEach(function (card) {
      card.addEventListener('click', onCardClick);
      card.addEventListener('keydown', onCardKeydown);
    });
    track.addEventListener('pointerdown', onPointerDown);
    track.addEventListener('transitionend', onTransitionEnd);
    if (previous) previous.addEventListener('click', function () { goBy(-1, true); });
    if (next) next.addEventListener('click', function () { goBy(1, true); });
    if (pager) pager.addEventListener('click', togglePlay);
    syncSlides();
    if (pager) restartPagerAnimation();
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) {
      resizeObserver = new window.ResizeObserver(onResize);
      resizeObserver.observe(mediaEl);
    }
    window.requestAnimationFrame(function () { animate = true; updateTransform(); });
    if (playing) startProgress();

    parent.__fppHomeHeroCleanup = function () {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerEnd);
      document.removeEventListener('pointercancel', onPointerEnd);
      window.removeEventListener('resize', onResize);
      if (resizeObserver) resizeObserver.disconnect();
      parent.style.removeProperty('--store-hero-card-half');
      parent.__fppHomeHeroCleanup = null;
    };
  }
  function fillBanner(mediaEl, fallbackTitle, items) {
    if (!mediaEl) return;
    var parent = mediaEl.parentElement;
    if (parent.__fppHomeHeroCleanup) parent.__fppHomeHeroCleanup();
    var oldTag = parent.querySelector('.banner-tag');
    if (oldTag) oldTag.remove();
    var oldDots = parent.querySelector('.banner-dots');
    if (oldDots) oldDots.remove();
    parent.querySelectorAll('.store-hero__arrow,.store-hero__pager').forEach(function (el) { el.remove(); });
    var list = (items || []).filter(function (b) {
      return b && (b.image || b.imageUrl || b.imageURL || b.src || b.url || b.title || fallbackTitle);
    });
    if (parent.classList.contains('banner--home')) {
      renderHomeHero(mediaEl, parent, list, fallbackTitle);
      return;
    }
    if (!list.length) {
      mediaEl.innerHTML = '';
      if (fallbackTitle) {
        var tg = document.createElement('div');
        tg.className = 'banner-tag';
        tg.innerHTML = '<span class="banner-tag-txt">' + escBr(fallbackTitle) + '</span>';
        parent.appendChild(tg);
      }
      return;
    }
    mediaEl.innerHTML = list.map(function (b, i) {
      var img = b.image || b.imageUrl || b.imageURL || b.src || b.url || '';
      var plain = String(b.title || '').replace(/<[^>]*>/g, ' ');
      return '<div class="bimg' + (i === 0 ? ' on' : '') + '" data-t="' + esc(b.title || '') + '" data-s="' + esc(b.tag || '') + '" data-link="' + esc(b.link || '') + '">' +
        (img ? '<img src="' + esc(img) + '" alt="' + esc(plain) + '" loading="' + (i === 0 ? 'eager' : 'lazy') + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'noimg\')">' : '') + '</div>';
    }).join('');
    var slides = mediaEl.querySelectorAll('.bimg');
    var tag = document.createElement('div');
    tag.className = 'banner-tag';
    parent.appendChild(tag);
    function paint(slide) {
      var tt = slide.getAttribute('data-t');
      var ss = slide.getAttribute('data-s');
      if (!tt) { tag.style.display = 'none'; return; }
      tag.style.display = '';
      tag.classList.remove('swap');
      void tag.offsetWidth;
      tag.innerHTML = '<span class="banner-tag-txt">' + escBr(tt) + '</span>' + (ss ? '<small class="banner-tag-sub">' + escBr(ss) + '</small>' : '');
      tag.classList.add('swap');
    }
    paint(slides[0]);
    if (slides.length > 1) {
      var idx = 0, timer = null;
      var isHomeBanner = parent.classList.contains('banner--home');
      var dots = document.createElement('div');
      dots.className = 'banner-dots' + (isHomeBanner ? ' banner-dots--pill' : '');
      if (isHomeBanner) {
        var pillOutline = 'M 0.75 13.5 A 12.75 12.75 0 0 1 13.5 0.75 H 62.5 A 12.75 12.75 0 0 1 75.25 13.5 A 12.75 12.75 0 0 1 62.5 26.25 H 13.5 A 12.75 12.75 0 0 1 0.75 13.5 Z';
        var pillProgressOutline = 'M 2 13.5 A 11.5 11.5 0 0 1 13.5 2 H 62.5 A 11.5 11.5 0 0 1 74 13.5 A 11.5 11.5 0 0 1 62.5 25 H 13.5 A 11.5 11.5 0 0 1 2 13.5 Z';
        dots.innerHTML =
          '<svg class="banner-progress-svg" viewBox="0 0 76 27" aria-hidden="true" focusable="false">' +
          '<path class="banner-progress-track" d="' + pillOutline + '" />' +
          '<path class="banner-progress-line" d="' + pillProgressOutline + '" pathLength="100" stroke-dasharray="100" stroke-dashoffset="100" />' +
          '</svg>' +
          '<span class="banner-count" aria-live="polite">1/' + slides.length + '</span>' +
          '<button class="banner-toggle" type="button" aria-label="배너 자동 재생 일시정지" title="배너 자동 재생 일시정지" aria-pressed="false">' +
          '<span class="banner-toggle-icon" aria-hidden="true"></span></button>';
      } else {
        dots.innerHTML = list.map(function (_, i) {
          return '<button class="bdot' + (i === 0 ? ' on' : '') + '" type="button" aria-label="배너 ' + (i + 1) + '"></button>';
        }).join('');
      }
      parent.appendChild(dots);
      if (isHomeBanner) {
        var count = dots.querySelector('.banner-count');
        var toggle = dots.querySelector('.banner-toggle');
        var duration = 6000;
        var elapsed = 0;
        var lastFrame = null;
        var frameId = null;
        var paused = false;
        var progressLine = dots.querySelector('.banner-progress-line');

        function setProgress() {
          var remaining = 100 - Math.min(100, elapsed / duration * 100);
          progressLine.setAttribute('stroke-dashoffset', remaining.toFixed(2));
        }
        function showHome(i) {
          idx = (i + slides.length) % slides.length;
          slides.forEach(function (s, j) { s.classList.toggle('on', j === idx); });
          count.textContent = (idx + 1) + '/' + slides.length;
          paint(slides[idx]);
        }
        function tick(timestamp) {
          if (paused) { frameId = null; return; }
          if (lastFrame !== null) elapsed += timestamp - lastFrame;
          lastFrame = timestamp;
          if (elapsed >= duration) {
            elapsed = 0;
            showHome(idx + 1);
          }
          setProgress();
          frameId = requestAnimationFrame(tick);
        }
        function startProgress() {
          lastFrame = null;
          if (frameId === null && !paused) frameId = requestAnimationFrame(tick);
        }

        setProgress();
        toggle.addEventListener('click', function () {
          paused = !paused;
          toggle.classList.toggle('is-paused', paused);
          toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
          toggle.setAttribute('aria-label', paused ? '배너 자동 재생 시작' : '배너 자동 재생 일시정지');
          toggle.title = paused ? '배너 자동 재생 시작' : '배너 자동 재생 일시정지';
          if (paused) {
            if (frameId !== null) cancelAnimationFrame(frameId);
            frameId = null;
            lastFrame = null;
            elapsed = 0;
            setProgress();
          } else {
            startProgress();
          }
        });
        startProgress();
      } else {
        function show(i) {
          idx = (i + slides.length) % slides.length;
          slides.forEach(function (s, j) { s.classList.toggle('on', j === idx); });
          dots.querySelectorAll('.bdot').forEach(function (d, j) { d.classList.toggle('on', j === idx); });
          paint(slides[idx]);
        }
        function restart() { clearInterval(timer); timer = setInterval(function () { show(idx + 1); }, 4600); }
        restart();
        dots.querySelectorAll('.bdot').forEach(function (d, i) {
          d.addEventListener('click', function () { show(i); restart(); });
        });
        parent.addEventListener('mouseenter', function () { clearInterval(timer); });
        parent.addEventListener('mouseleave', function () { restart(); });
      }
    }
    slides.forEach(function (s) {
      s.addEventListener('click', function () {
        var lk = s.getAttribute('data-link');
        if (lk) location.href = lk;
      });
    });
  }
  function fillPageBanner(mediaEl, key, fbBanners) {
    if (!mediaEl) return;
    var def = PAGE_BANNERS[key];
    var local = fbBanners || [];
    var found = local.filter(function (b) {
      var p = String(b.page || b.type || b.location || '').toLowerCase();
      return p && p.indexOf(key === 'characters' ? 'char' : key) > -1;
    });
    fillBanner(mediaEl, null, found.length ? found : [def]);
  }

  /* ---------- 공유 ---------- */
  function share(title, url) {
    var u = url || location.href;
    if (navigator.share) {
      navigator.share({ title: title || 'FPP v2', url: u }).catch(function () { });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(u).then(function () { toast('링크가 복사되었습니다.', 'ok'); })
        .catch(function () { toast('링크 복사에 실패했습니다.', 'err'); });
    } else { toast('공유를 지원하지 않는 환경입니다.'); }
  }

  /* ---------- 토스트 ---------- */
  function toast(msg, type) {
    var root = $('toastRoot');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (type === 'err' ? 'err' : type === 'ok' ? 'ok' : '');
    el.textContent = msg;
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('show'); });
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 320);
    }, 2800);
  }

  /* ---------- 스켈레톤 / 빈 상태 ---------- */
  function skelRows(el, n) {
    if (!el) return;
    var h = '';
    for (var i = 0; i < (n || 4); i++) h += '<div class="skel-row"><div class="skel" style="height:13px;width:' + (86 - i * 7) + '%"></div><div class="skel" style="height:10px;width:' + (48 - i * 4) + '%"></div></div>';
    el.innerHTML = h;
  }
  function skelCards(el, n) {
    if (!el) return;
    var h = '<div class="skel-cards">';
    for (var i = 0; i < (n || 3); i++) h += '<div class="skel-card"><div class="skel" style="height:110px"></div><div class="skel" style="height:13px;width:80%"></div><div class="skel" style="height:10px;width:50%"></div></div>';
    el.innerHTML = h + '</div>';
  }
  function skelGrid(el, n) {
    if (!el) return;
    var h = '';
    for (var i = 0; i < (n || 8); i++) h += '<div class="skel" style="aspect-ratio:3/4;border-radius:10px"></div>';
    el.innerHTML = h;
  }
  function empty(el, opts) {
    if (!el) return;
    opts = opts || {};
    el.innerHTML = '<div class="empty"><p>' + esc(opts.title || '데이터가 없습니다.') + '</p>' +
      (opts.desc ? '<small>' + esc(opts.desc) + '</small>' : '') +
      (opts.btnText ? '<a class="btn btn--ghost btn--sm" href="' + esc(pageUrl(opts.btnHref || '#')) + '">' + esc(opts.btnText) + '</a>' : '') + '</div>';
  }

  /* ---------- 본문 렌더 ---------- */
  function renderContent(raw) {
    if (raw == null || raw === '') return '<p style="color:var(--text-3)">내용이 없습니다.</p>';
    var s = String(raw);
    if (/<[a-z][\s\S]*>/i.test(s)) {
      return window.FPPContentSanitizer
        ? window.FPPContentSanitizer.sanitize(s)
        : '<div class="rich">' + esc(s).replace(/\n/g, '<br>') + '</div>';
    }
    return '<div class="rich">' + esc(s)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(https?:\/\/[^\s<]+\.(?:png|jpe?g|gif|webp))/gi, '<img src="$1" alt="" loading="lazy">')
      .replace(/\n/g, '<br>') + '</div>';
  }

  /* ---------- 스크롤 리빌 ---------- */
  function watchReveals(root) {
    var scope = root || document;
    var els = scope.querySelectorAll('.rv:not(.on)');
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('on'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }) : null;
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top < window.innerHeight + 140) el.classList.add('on');
      else if (io) io.observe(el);
      else el.classList.add('on');
    });
    setTimeout(function () {
      scope.querySelectorAll('.rv:not(.on)').forEach(function (el) { el.classList.add('on'); });
    }, 900);
  }

  function initFooterAdminShortcut() {
    var footer = document.querySelector('.app-footer');
    if (!footer) return;

    var small = footer.querySelector('.foot-bottom small');
    var brand = footer.querySelector('.foot-brand');
    if (!small || !brand) return;

    var smallClickCount = 0;
    small.addEventListener('click', function () {
      smallClickCount += 1;
    });
    brand.addEventListener('click', function (event) {
      if (smallClickCount < 5) return;
      event.preventDefault();
      window.location.href = 'https://onepiecefightingpath.github.io/FPPatchStudio/admin.html';
    });
  }

  /* ---------- 부팅 ---------- */
  function boot() {
    applyTheme(store.get('theme', 'dark'));
    buildHeader();
    buildDeskNav();
    buildTabs();
    buildDrawer();
    initFooterAdminShortcut();
    initLegalFooterLinks();
    updateAuthArea();
    window.addEventListener('fpp:push-message', function () {
      if (currentUser()) loadNotifications(true);
    });
    FB.onReady().then(function () {
      var auth = FB.ready && FB.auth && FB.auth();
      if (!auth) {
        _fbUser = null;
        _userDoc = null;
        _authResolved = true;
        _headerNotificationsResolved = true;
        notifyUser();
        return;
      }
      if (FB.watchCommunityVisibility) FB.watchCommunityVisibility(applyCommunityVisibility);
      auth.onAuthStateChanged(function (u) {
        _authResolved = false;
        _headerNotificationsResolved = !u;
        if (u && notificationState.uid !== u.uid) {
          stopNotificationWatch();
          notificationState = { uid: u.uid, items: [], loaded: false, loading: null, unsubscribe: null };
        }
        _fbUser = u;
        _userDoc = u ? {
          nickname: u.displayName || (u.email ? u.email.split('@')[0] : '선원'),
          email: u.email || '',
          profileIcon: 0,
          favChars: [],
          favSupports: []
        } : null;
        if (u) {
          var authUid = u.uid;
          favCache = { chars: [], supports: [] };
          _authResolved = true;
          notifyUser();
          startNotificationWatch(authUid);
          FB.ensureUserDoc(u).then(function (profile) {
            if (!_fbUser || _fbUser.uid !== authUid) return null;
            _userDoc = profile || _userDoc;
            var userProfile = _userDoc || {};
            favCache = {
              chars: Array.isArray(userProfile.favChars) ? userProfile.favChars : [],
              supports: Array.isArray(userProfile.favSupports) ? userProfile.favSupports : []
            };
            emitFavChanged();
            loadCharCache();
            notifyUser();
            updateNotificationViews();
            return loadNotifications(true);
          }).then(function () {
            if (!_fbUser || _fbUser.uid !== authUid) return;
            _headerNotificationsResolved = true;
            updateAuthArea();
          }).catch(function () {
            if (!_fbUser || _fbUser.uid !== authUid) return;
            _authResolved = true;
            _headerNotificationsResolved = true;
            notifyUser();
          });
        } else {
          stopNotificationWatch();
          _userDoc = null;
          favCache = { chars: [], supports: [] };
          notificationState = { uid: null, items: [], loaded: true, loading: null, unsubscribe: null };
          _authResolved = true;
          _headerNotificationsResolved = true;
          notifyUser();
        }
      });
    }).catch(function () {
      _fbUser = null;
      _userDoc = null;
      _authResolved = true;
      _headerNotificationsResolved = true;
      notifyUser();
    });
    watchReveals();
    window.addEventListener('load', function () { watchReveals(); });
    /* 페이지 전환 베일 제거 — 스타일·부팅이 완료된 시점에 부드럽게 페이드아웃 (깜빡임 방지) */
    var veil = document.getElementById('pageVeil');
    if (veil) {
      requestAnimationFrame(function () {
        veil.classList.add('off');
        setTimeout(function () { if (veil.parentNode) veil.parentNode.removeChild(veil); }, 450);
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return {
    esc: esc, escBr: escBr, fmtDate: fmtDate, isNew: isNew, pageUrl: pageUrl,
    AVATARS: AVATARS, PLACEHOLDER_IMG: PLACEHOLDER_IMG, avatarOf: avatarOf,
    IC: IC,
    currentUser: currentUser, userDoc: userDoc, saveUserPatch: saveUserPatch, onUser: onUser,
    loadFavs: loadFavs, isFav: isFav, toggleFav: toggleFav,
    setActiveNav: setActiveNav,
    getCommunityVisibility: getCommunityVisibility,
    openModal: openModal, openPopup: openPopup, closePopups: closePopups,
    lockBody: lockBody, unlockBody: unlockBody,
    SET_ACTIONS: SET_ACTIONS,
    PAGE_BANNERS: PAGE_BANNERS, fillBanner: fillBanner, fillPageBanner: fillPageBanner,
    share: share, toast: toast,
    skelRows: skelRows, skelCards: skelCards, skelGrid: skelGrid, empty: empty,
    renderContent: renderContent, watchReveals: watchReveals
  };
})();
