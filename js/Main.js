/* ============================================================
   FPP v2 — Main.js
   홈 / 캐릭터(중앙 팝업) / 현질 서폿 / PvP 패치 — 단일 페이지 라우팅
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var S = {
    chars: [], supports: [], pvps: [], patches: [], events: [], boards: [], banners: [], loaded: false,
    visibility: UI.getCommunityVisibility ? UI.getCommunityVisibility() : { boards: true, events: true }
  };
  var F = { tab: 'char', grade: 'all', attr: 'all', type: 'all', sort: 'id', fav: false, q: '' };
  var pvpSelDate = '';
  var homeEventTimer = null;
  var mainPatchMonth = 'all';
  var mainPatchPage = 1;
  var MAIN_PATCH_PAGE_SIZE = 10;

  /* 한 컬렉션이 실패해도 나머지는 표시 — 실패한 쪽은 빈 배열로 처리 */
  function safe(p, label) {
    return p.catch(function (e) { console.error('[FPP] ' + label + ' 로드 실패:', e); return []; });
  }
  function loadAll() {
    if (S.loaded) return Promise.resolve();
    if (!FB.ready) return Promise.reject(new Error('Firebase SDK 없음'));
    return Promise.all([
      safe(FB.getCharacters(), 'characters'), safe(FB.getSupportCharacters(), 'supportCharacters'),
      safe(FB.getPvpPatches(), 'pvpPatch'), safe(FB.getPatchNotes(), 'patchNotes'),
      safe(FB.getEvents(), 'events'), safe(FB.getBoards(), 'boards'), safe(FB.getBanners(), 'banners'),
      safe(FB.getCommunityVisibility(), 'communityVisibility')
    ]).then(function (r) {
      S.chars = r[0]; S.supports = r[1];
      S.pvps = r[2].map(function (g, i) { g.uid = (g.docId || 'g') + '_' + i; return g; });
      S.patches = r[3]; S.events = r[4]; S.boards = r[5]; S.banners = r[6];
      if (r[7] && !Array.isArray(r[7])) S.visibility = r[7];
      S.loaded = true;
    });
  }

  function findChar(id, tab) {
    var pool = tab === 'support' ? S.supports : S.chars;
    var c = pool.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!c) c = S.chars.concat(S.supports).filter(function (x) { return String(x.id) === String(id); })[0];
    return c || null;
  }
  window.__FPP_CHARS = function (id, kind) { return findChar(id, kind === 'support' ? 'support' : 'char'); };

  /* 속성/타입 매핑 (원본 레포: 力/技/心) */
  function charAttrClass(c) {
    var a = String(c.attr || c.type || '').toLowerCase();
    if (a === 'force' || a === '힘' || a === '力') return 'attr-force';
    if (a === 'ki' || a === '기' || a === '技') return 'attr-ki';
    if (a === 'sim' || a === '심' || a === '心') return 'attr-sim';
    return '';
  }
  function charAttrLabel(c) {
    var k = charAttrClass(c);
    if (k === 'attr-force') return '힘';
    if (k === 'attr-ki') return '기';
    if (k === 'attr-sim') return '심';
    return '';
  }
  function attrIconSrc(cls) {
    var m = { 'attr-force': 'force', 'attr-ki': 'ki', 'attr-sim': 'sim' };
    return m[cls] ? 'img/attr/' + m[cls] + '.png' : '';
  }
  function typeIconSrc(bt) {
    var m = { '원소': 'element', 'element': 'element', '검사': 'sword', 'sword': 'sword', '격투': 'fighter', 'fighter': 'fighter', '특수': 'special', 'special': 'special' };
    var k = m[bt];
    return k ? 'img/type/' + k + '.webp' : '';
  }

  var BNAME = { buff: '버프', nerf: '너프', fix: '기능수정', upcoming: '출시예정' };
  var BSYM = { buff: '▲', nerf: '▼', fix: '✦' };

  function pvpCharacter(g) {
    if (!g) return null;
    if (g.supportCharId != null && String(g.supportCharId).trim() !== '') {
      return findChar(g.supportCharId, 'support');
    }
    return g.charId != null ? findChar(g.charId) : null;
  }
  function pvpCharacterKey(g) {
    if (g.supportCharId != null && String(g.supportCharId).trim() !== '') return 'support:' + String(g.supportCharId);
    if (g.charId != null && String(g.charId).trim() !== '') return 'char:' + String(g.charId);
    return 'name:' + (g.name || g.docId || g.uid || '');
  }
  /* PvP 문서의 현질 서폿 ID도 등록된 서폿 캐릭터 데이터에서 조회 */
  function pvpCharacterName(g) {
    if (!g) return '';
    var c = pvpCharacter(g);
    var name = (c && c.name) || g.name;
    if (name != null && String(name).trim()) return String(name).trim();
    if (g.supportCharId != null && String(g.supportCharId).trim() !== '') return 'No.' + g.supportCharId;
    if (g.charId != null && String(g.charId).trim() !== '') return 'No.' + g.charId;
    return '';
  }

  function pvpDaysUntil(date) {
    var match = String(date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());
    var todayValues = {};
    parts.forEach(function (part) { todayValues[part.type] = part.value; });
    var target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    var today = Date.UTC(Number(todayValues.year), Number(todayValues.month) - 1, Number(todayValues.day));
    return Math.floor((target - today) / 86400000);
  }
  function pvpUpcomingDays(groups) {
    var days = (groups || []).filter(function (g) { return g.type === 'upcoming'; })
      .map(function (g) { return pvpDaysUntil(g.date); })
      .filter(function (value) { return value !== null && value > 0; });
    return days.length ? Math.min.apply(Math, days) : null;
  }
  function pvpUpcomingForCharacter(character, kind) {
    if (!character || character.id == null) return null;
    var key = (kind === 'support' ? 'support:' : 'char:') + String(character.id);
    return pvpUpcomingDays(S.pvps.filter(function (g) {
      return pvpCharacterKey(g) === key;
    }));
  }

  /* 같은 캐릭터의 버프/너프/기능수정 그룹을 하나의 아이콘으로 합침 (등장 순서 유지) */
  function mergePvpByChar(groups) {
    var map = {}, order = [];
    (groups || []).forEach(function (g) {
      var key = pvpCharacterKey(g);
      if (!map[key]) {
        map[key] = {
          charId: g.charId, supportCharId: g.supportCharId,
          name: g.name, image: g.image, date: g.date, types: [], groups: []
        };
        order.push(map[key]);
      }
      var m = map[key];
      if (m.types.indexOf(g.type) < 0) m.types.push(g.type);
      m.groups.push(g);
    });
    return order;
  }
  /* 타입 뱃지 — 1개면 우측 하단, 2개면 중앙·우측 하단, 3개면 좌측·중앙·우측 하단에 반쯤 걸쳐 노출 */
  function orbBadgesHTML(types) {
    var canon = ['buff', 'nerf', 'fix'].filter(function (t) { return (types || []).indexOf(t) > -1; });
    if (!canon.length) return '';
    var pos = canon.length === 1 ? ['r'] : canon.length === 2 ? ['c', 'r'] : ['l', 'c', 'r'];
    return canon.map(function (t, i) {
      return '<span class="orb-badge badge badge--' + t + ' orb-b--' + pos[i] + '" aria-hidden="true">' + BSYM[t] + '</span>';
    }).join('');
  }

  /* ================= 목록 행 (홈 공용) ================= */
  function viewMeta(count) {
    var value = count == null ? 0 : count;
    return '<span class="view-count" aria-label="조회수 ' + UI.esc(value) + '">' +
      '<i class="ic-v2-community-number-of-view-line" aria-hidden="true"></i>' +
      '<span>' + UI.esc(value) + '</span></span>';
  }
  function rowHTML(o) {
    return '<li class="lst-row" data-go="' + UI.esc(UI.pageUrl(o.page)) + '" tabindex="0" role="button" aria-label="' + UI.esc(o.title) + '">' +
      '<div class="lst-main"><div class="lst-l1">' + o.badge +
      '<span class="lst-title">' + UI.esc(o.title) + '</span></div>' +
      '<div class="lst-l2"><span>' + UI.esc(o.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(o.date)) + '</span>' +
      '<span>·</span>' + viewMeta(o.viewCount) + '</div></div>' +
      (UI.isNew(o.date || o.ts) ? '<span class="lst-new">NEW</span>' : '') + '</li>';
  }
  function bindRows(root) {
    root.querySelectorAll('.lst-row').forEach(function (r) {
      var go = function () { location.href = r.getAttribute('data-go'); };
      r.addEventListener('click', go);
      r.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }

  /* ================= 홈 ================= */
  function renderHome() {
    UI.setActiveNav('home');
    UI.fillBanner($('homeBannerMedia'), 'FPP', S.banners);

    /* 진행 중이면서 실제 내용(제목·본문·이미지 중 하나라도)이 있는 이벤트만 */
    var patchLink = $('homePatchLink');
    if (patchLink) {
      patchLink.href = UI.pageUrl(!S.visibility.boards && !S.visibility.events ? 'Main.html#patch' : 'Community.html#patch');
    }
    var evs = (S.visibility.events ? S.events : []).filter(function (e) {
      return e.status === 'ing' && (e.title || e.content || e.image);
    }).slice(0, 5);
    var noEv = !evs.length;
    var patchBox = $('homePatchBox');
    if (patchBox) {
      patchBox.classList.toggle('no-event', noEv);
      patchBox.classList.toggle('no-board', !S.visibility.boards);
    }

    /* 1) 패치노트 — 이벤트·게시판 모두 없으면 6개, 이벤트만 없고 게시판 박스가 있으면 데스크톱 12개 */
    var pl = $('homePatchList');
    if (!S.patches.length) UI.empty(pl, { title: '등록된 패치노트가 없습니다.' });
    else {
      var n = window.matchMedia('(min-width:768px)').matches ? 6 : 5;
      pl.innerHTML = '<ul class="lst">' + S.patches.slice(0, n).map(function (p) {
        var patchPage = !S.visibility.boards && !S.visibility.events
          ? '#patch/view/' + encodeURIComponent(p.docId)
          : 'Community.html#patch/view/' + encodeURIComponent(p.docId);
        return rowHTML({ page: patchPage, badge: '<span class="badge badge--patch">패치노트</span>', title: p.title, author: p.author, date: p.date, ts: p.ts, viewCount: p.viewCount });
      }).join('') + '</ul>';
      bindRows(pl);
    }

    /* 2) PvP 패치 — 최신 날짜 아이콘 그리드 (데스크톱 12 / 모바일 8)
       같은 캐릭터의 버프/너프/기능수정은 아이콘 하나로 합치고,
       타입 뱃지를 좌측 하단·중앙 하단·우측 하단에 반쯤 걸쳐 노출 */
    var pg = $('homePvpGrid');
    var scheduledGroups = S.pvps.filter(function (g) {
      return g.type === 'upcoming' && pvpDaysUntil(g.date) > 0;
    });
    var publishedGroups = S.pvps.filter(function (g) { return g.type !== 'upcoming'; });
    var latestPublishedDate = publishedGroups.length ? String(publishedGroups[0].date || '') : '';
    var dayGroups = scheduledGroups.concat(latestPublishedDate
      ? publishedGroups.filter(function (g) { return String(g.date) === latestPublishedDate; })
      : []);
    var orbs = mergePvpByChar(dayGroups).slice(0, 12);
    if (!orbs.length) UI.empty(pg, { title: 'PvP 패치 내역이 없습니다.' });
    else {
      pg.innerHTML = orbs.map(function (o, i) {
        var c = pvpCharacter(o);
        var nm = pvpCharacterName(o);
        var img = (c && c.image) || o.image || UI.PLACEHOLDER_IMG;
        var label = o.types.map(function (t) { return BNAME[t] || '수정'; }).join('·');
        var upcomingDays = pvpUpcomingDays(o.groups);
        var countdown = upcomingDays !== null
          ? '<span class="orb-countdown" aria-hidden="true">D-' + upcomingDays + '</span>'
          : '';
        return '<button class="orb" type="button" data-i="' + i + '" aria-label="' + UI.esc(nm) + ' — ' + UI.esc(label) + (upcomingDays !== null ? ', 출시 예정 D-' + upcomingDays : '') + '">' +
          '<span class="orb-img"><img src="' + UI.esc(img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' +
          orbBadgesHTML(o.types) + countdown + '</span>' +
          '<span class="orb-name">' + UI.esc(nm) + '</span></button>';
      }).join('');
      pg.querySelectorAll('.orb').forEach(function (b) {
        b.addEventListener('click', function () {
          var o = orbs[Number(b.getAttribute('data-i'))];
          /* 홈에서 화면만 전환하면 #home 해시가 남아 홈 탭을 다시 눌러도 hashchange가 발생하지 않음 */
          if (location.hash === '#pvp') route('pvp');
          else location.hash = '#pvp';
          openPvpPatchDetail(o.groups[0]);
        });
      });
    }

    /* 3) 이벤트 — 진행 중만 롤링, 없으면 Box 숨김 */
    var evBox = $('homeEventBox'), evRoll = $('homeEventRoll');
    if (homeEventTimer) {
      clearInterval(homeEventTimer);
      homeEventTimer = null;
    }
    if (noEv) {
      if (evBox) evBox.hidden = true;
    } else {
      evBox.hidden = false;
      evRoll.innerHTML = evs.map(function (e) {
        return '<article class="ev-card" data-ev="' + UI.esc(e.docId) + '" role="button" tabindex="0">' +
          '<div class="ev-img">' + (e.image ? '<img src="' + UI.esc(e.image) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
          '<span class="badge badge--ing">진행중</span></div>' +
          '<div class="ev-tx"><b>' + UI.esc(e.title) + '</b><small>' + UI.esc(UI.fmtDate(e.date)) + '</small></div></article>';
      }).join('');
      var cards = evRoll.querySelectorAll('.ev-card');
      var idx = 0;
      function showEv(i) {
        idx = (i + cards.length) % cards.length;
        cards.forEach(function (cc, j) { cc.classList.toggle('on', j === idx); });
      }
      showEv(0);
      var evBody = evRoll.parentElement;
      var prev = $('homeEventPrev'), next = $('homeEventNext');
      function startEvTimer() {
        if (cards.length > 1 && !homeEventTimer) {
          homeEventTimer = setInterval(function () { showEv(idx + 1); }, 4200);
        }
      }
      function pauseEvTimer() {
        if (homeEventTimer) {
          clearInterval(homeEventTimer);
          homeEventTimer = null;
        }
      }
      if (prev) prev.onclick = function () { pauseEvTimer(); showEv(idx - 1); startEvTimer(); };
      if (next) next.onclick = function () { pauseEvTimer(); showEv(idx + 1); startEvTimer(); };
      if (evBody) {
        evBody.onmouseenter = pauseEvTimer;
        evBody.onmouseleave = startEvTimer;
      }
      startEvTimer();
      cards.forEach(function (cc) {
        cc.addEventListener('click', function () { location.href = UI.pageUrl('Community.html#event/view/' + cc.getAttribute('data-ev')); });
      });
    }

    /* 4) 커뮤니티 */
    var boardBox = $('homeBoardBox');
    if (boardBox) boardBox.hidden = !S.visibility.boards;
    var bl = $('homeBoardList');
    if (!S.boards.length) UI.empty(bl, { title: '게시글이 없습니다.' });
    else {
      var CAT_CLS = { '자유': 'badge--free', '정보': 'badge--info', '질문': 'badge--q', '자랑': 'badge--brag' };
      bl.innerHTML = '<ul class="lst">' + S.boards.slice(0, 5).map(function (b) {
        return rowHTML({ page: 'Community.html#board/view/' + b.docId, badge: '<span class="badge ' + (CAT_CLS[b.category] || 'badge--free') + '">' + UI.esc(b.category) + '</span>', title: b.title, author: b.author, date: b.date, ts: b.ts, viewCount: b.viewCount });
      }).join('') + '</ul>';
      bindRows(bl);
    }
    UI.watchReveals($('view-home'));
  }

  /* ================= 메인 페이지 패치노트 ================= */
  function filteredMainPatches() {
    return mainPatchMonth === 'all'
      ? S.patches
      : S.patches.filter(function (patch) { return String(patch.date || '').slice(0, 7) === mainPatchMonth; });
  }
  function renderMainPatchMonth() {
    var months = {};
    S.patches.forEach(function (patch) {
      var month = String(patch.date || '').slice(0, 7);
      if (month) months[month] = (months[month] || 0) + 1;
    });
    var keys = Object.keys(months).sort().reverse();
    var box = $('monthList');
    box.innerHTML = '<button class="month-item' + (mainPatchMonth === 'all' ? ' is-on' : '') + '" data-m="all" type="button">전체 <small>' + S.patches.length + '</small></button>' +
      keys.map(function (month) {
        return '<button class="month-item' + (mainPatchMonth === month ? ' is-on' : '') + '" data-m="' + UI.esc(month) + '" type="button">' +
          UI.esc(month.replace('-', '년 ') + '월') + '<small>' + months[month] + '</small></button>';
      }).join('');
    box.querySelectorAll('.month-item').forEach(function (button) {
      button.addEventListener('click', function () {
        mainPatchMonth = button.getAttribute('data-m');
        mainPatchPage = 1;
        renderMainPatchMonth();
        renderMainPatchList();
      });
    });
    var select = $('monthSelect');
    if (select) {
      select.innerHTML = '<option value="all">전체</option>' + keys.map(function (month) {
        return '<option value="' + UI.esc(month) + '">' + UI.esc(month.replace('-', '년 ') + '월') + '</option>';
      }).join('');
      if (mainPatchMonth !== 'all' && keys.indexOf(mainPatchMonth) < 0) mainPatchMonth = 'all';
      select.value = mainPatchMonth;
    }
  }
  function renderMainPatchPager(totalPages) {
    var arr = [];
    if (totalPages <= 7) {
      for (var i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (mainPatchPage > 3) arr.push('dots');
      for (var j = Math.max(2, mainPatchPage - 1); j <= Math.min(totalPages - 1, mainPatchPage + 1); j++) arr.push(j);
      if (mainPatchPage < totalPages - 2) arr.push('dots');
      arr.push(totalPages);
    }
    var left = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5l-7 7 7 7"/></svg>';
    var right = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 5l7 7-7 7"/></svg>';
    var html = '<nav class="pg-nav" aria-label="페이지 이동">' +
      '<button class="pg-btn pg-nav-arrow" type="button" data-pg="prev" aria-label="이전 페이지"' + (mainPatchPage === 1 ? ' disabled' : '') + '>' + left + '</button>';
    arr.forEach(function (number) {
      if (number === 'dots') { html += '<span class="pg-dots" aria-hidden="true">…</span>'; return; }
      html += '<button class="pg-btn' + (number === mainPatchPage ? ' is-on' : '') + '" type="button" data-pg="' + number +
        '" aria-label="' + number + ' 페이지로 이동"' + (number === mainPatchPage ? ' aria-current="page"' : '') + '>' + number + '</button>';
    });
    html += '<button class="pg-btn pg-nav-arrow" type="button" data-pg="next" aria-label="다음 페이지"' +
      (mainPatchPage === totalPages ? ' disabled' : '') + '>' + right + '</button></nav>';
    var el = $('patchContent');
    el.insertAdjacentHTML('beforeend', html);
    el.querySelectorAll('.pg-btn').forEach(function (button) {
      button.addEventListener('click', function () {
        if (button.disabled || button.classList.contains('is-on')) return;
        var page = button.getAttribute('data-pg');
        if (page === 'prev') mainPatchPage = Math.max(1, mainPatchPage - 1);
        else if (page === 'next') mainPatchPage = Math.min(totalPages, mainPatchPage + 1);
        else mainPatchPage = parseInt(page, 10) || 1;
        renderMainPatchList();
        var y = el.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      });
    });
  }
  function renderMainPatchList() {
    var el = $('patchContent');
    $('monthFilter').style.display = '';
    var list = filteredMainPatches();
    if (!list.length) {
      UI.empty(el, { title: '등록된 패치노트가 없습니다.' });
      return;
    }
    var totalPages = Math.ceil(list.length / MAIN_PATCH_PAGE_SIZE);
    mainPatchPage = Math.max(1, Math.min(mainPatchPage, totalPages));
    var current = list.slice((mainPatchPage - 1) * MAIN_PATCH_PAGE_SIZE, mainPatchPage * MAIN_PATCH_PAGE_SIZE);
    el.innerHTML = '<div class="pn-list">' + current.map(function (patch) {
      var date = String(patch.date || '').split('-');
      return '<div class="pn-row" data-view="' + UI.esc(patch.docId) + '" tabindex="0" role="button" aria-label="' + UI.esc(patch.title) + '">' +
        '<div class="pn-date"><b>' + UI.esc(date[2] || '') + '</b><small>' + UI.esc((date[0] || '').slice(2) + '.' + (date[1] || '')) + '</small></div>' +
        '<div class="pn-main"><div class="pn-title">' + UI.esc(patch.title) + '</div>' +
        '<div class="pn-meta"><span>' + UI.esc(patch.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(patch.date)) +
        '</span><span>·</span>' + viewMeta(patch.viewCount) + '</div></div>' +
        (UI.isNew(patch.date) ? '<span class="lst-new">NEW</span>' : '') +
        '<span class="pn-arrow">›</span></div>';
    }).join('') + '</div>';
    el.querySelectorAll('.pn-row').forEach(function (row) {
      function open() { location.hash = '#patch/view/' + encodeURIComponent(row.getAttribute('data-view')); }
      row.addEventListener('click', open);
      row.addEventListener('keydown', function (event) { if (event.key === 'Enter') open(); });
    });
    renderMainPatchPager(totalPages);
    UI.watchReveals(el);
  }
  function renderMainPatchDetail(id) {
    var patch = S.patches.find(function (item) { return String(item.docId) === String(id); });
    var el = $('patchContent');
    $('monthFilter').style.display = 'none';
    if (!patch) {
      UI.empty(el, { title: '패치노트를 찾을 수 없습니다.', btnText: '목록으로', btnHref: '#patch' });
      return;
    }
    function actions() {
      return '<div class="detail-actions">' +
        '<button class="act-btn act-like" type="button" aria-pressed="false">' +
        '<svg viewBox="0 0 24 24"><path d="M12 20.4l-7.2-7A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 7.2 6.8z"/></svg>' +
        '<span>좋아요</span> <b class="like-n">…</b></button>' +
        '<button class="act-btn act-share" type="button" aria-label="공유하기">' +
        '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="M8.4 10.8l6.8-4M8.4 13.2l6.8 4"/></svg>' +
        '<span>공유하기</span></button></div>';
    }
    var related = S.patches.slice(0, 6).map(function (item) {
      return rowHTML({
        page: '#patch/view/' + encodeURIComponent(item.docId),
        badge: '<span class="badge badge--patch">패치노트</span>',
        title: item.title, author: item.author, date: item.date, ts: item.ts, viewCount: item.viewCount
      });
    }).join('');
    el.innerHTML =
      '<button class="detail-back" type="button" data-main-patch-back>' + UI.IC.back + ' 패치노트 목록</button>' +
      '<article class="detail">' +
      '<div class="detail-head"><div class="detail-head-main"><span class="badge badge--patch">패치노트</span>' +
      '<h2 class="detail-title">' + UI.esc(patch.title) + '</h2></div>' +
      '<div class="detail-meta"><span>' + UI.esc(patch.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(patch.date)) +
      '</span><span>·</span>' + viewMeta(patch.viewCount) + '</div></div>' +
      '<div class="detail-body">' + UI.renderContent(patch.content) + '</div>' + actions() + '</article>' +
      '<div class="box detail-list-box"><div class="box-head"><h2 class="box-title">패치노트</h2>' +
      '<button class="box-go" type="button" data-main-patch-back>목록으로</button></div>' +
      '<div class="box-body"><ul class="lst">' + related + '</ul></div></div>';
    el.querySelectorAll('[data-main-patch-back]').forEach(function (button) {
      button.addEventListener('click', function () { location.hash = '#patch'; });
    });
    bindRows(el);
    var key = 'patch_read_' + patch.docId;
    var legacyKey = 'fpp_view_patch_' + patch.docId;
    var seen = false;
    try {
      seen = localStorage.getItem(key) === '1' || localStorage.getItem(legacyKey) === '1';
      if (seen) localStorage.setItem(key, '1');
    } catch (_) {}
    function paintPatchViewCount(count) {
      if (count == null) return;
      patch.viewCount = count;
      var countEl = el.querySelector('.detail-head .detail-meta .view-count');
      if (countEl) {
        countEl.setAttribute('aria-label', '조회수 ' + count);
        if (countEl.lastElementChild) countEl.lastElementChild.textContent = count;
      }
    }
    if (seen && FB.getViewCount) {
      FB.getViewCount('patch', patch.docId).then(paintPatchViewCount).catch(function () {});
    }
    if (!seen && String(patch.docId).indexOf('local_') !== 0 && FB.bumpViewCount) {
      FB.bumpViewCount('patch', patch.docId).then(function (count) {
        if (count == null) return;
        paintPatchViewCount(count);
        try {
          localStorage.setItem(key, '1');
          localStorage.setItem(legacyKey, '1');
        } catch (_) {}
      }).catch(function () {
        if (FB.getViewCount) FB.getViewCount('patch', patch.docId).then(paintPatchViewCount).catch(function () {});
      });
    }
    var likeButton = el.querySelector('.act-like');
    var likeCount = el.querySelector('.like-n');
    var liked = false;
    function paintLike(count) {
      likeCount.textContent = count || 0;
      likeButton.classList.toggle('on', liked);
      likeButton.setAttribute('aria-pressed', String(liked));
    }
    FB.getLikeDoc('patch', patch.docId).then(function (doc) {
      var user = UI.currentUser();
      liked = !!(user && doc && doc.likedBy && doc.likedBy.indexOf(user.uid) > -1);
      patch.likeCount = doc ? doc.likeCount : (patch.likeCount || 0);
      paintLike(patch.likeCount);
    }).catch(function () { paintLike(patch.likeCount || 0); });
    likeButton.addEventListener('click', function () {
      var user = UI.currentUser();
      if (!user) {
        UI.toast('로그인 후 이용할 수 있습니다.');
        setTimeout(function () { location.href = UI.pageUrl('Login.html'); }, 700);
        return;
      }
      FB.toggleGenericLike('patch', patch.docId, user.uid).then(function (nextLiked) {
        liked = nextLiked;
        patch.likeCount = Math.max(0, (parseInt(likeCount.textContent, 10) || 0) + (nextLiked ? 1 : -1));
        paintLike(patch.likeCount);
        FB.bumpUserLikeCount(user.uid, nextLiked ? 1 : -1);
      }).catch(function (error) { UI.toast(FB.errMsg(error), 'err'); });
    });
    el.querySelector('.act-share').addEventListener('click', function () { UI.share(patch.title, location.href); });
    el.querySelectorAll('.detail-body img').forEach(function (image) {
      image.onerror = function () { image.style.display = 'none'; };
    });
    UI.watchReveals(el);
  }
  function renderMainPatches(params) {
    UI.setActiveNav('community');
    renderMainPatchMonth();
    if (params && params.view === 'view' && params.id) renderMainPatchDetail(params.id);
    else renderMainPatchList();
    UI.watchReveals($('view-patch'));
  }
  function bindMainPatchPage() {
    var select = $('monthSelect');
    if (select) select.addEventListener('change', function () {
      mainPatchMonth = select.value;
      mainPatchPage = 1;
      renderMainPatchMonth();
      renderMainPatchList();
    });
  }

  /* ================= 캐릭터 ================= */
  function setTab(tab) {
    F.tab = tab;
    var tc = $('charTabChar'), ts = $('charTabSupport');
    if (tc) { tc.classList.toggle('is-on', tab === 'char'); tc.setAttribute('aria-selected', String(tab === 'char')); }
    if (ts) { ts.classList.toggle('is-on', tab === 'support'); ts.setAttribute('aria-selected', String(tab === 'support')); }
    var isSupport = tab === 'support';
    ['fAttr', 'fType'].forEach(function (id) {
      var el = $(id);
      if (el) el.style.display = isSupport ? 'none' : '';
    });
    if (isSupport) { F.attr = 'all'; F.type = 'all'; }
  }
  function syncFavBtn() {
    var b = $('fFav');
    if (b) {
      b.classList.toggle('is-on', F.fav);
      b.setAttribute('aria-pressed', String(F.fav));
    }
  }
  function fillSelect(sel, options, allLabel) {
    if (!sel) return;
    sel.innerHTML = '<option value="all">' + allLabel + '</option>' +
      options.map(function (o) { return '<option value="' + UI.esc(o) + '">' + UI.esc(o) + '</option>'; }).join('');
  }
  function buildFilterOptions() {
    var src = F.tab === 'support' ? S.supports : S.chars;
    var grades = [], attrs = [], types = [];
    src.forEach(function (c) {
      if (c.grade && grades.indexOf(c.grade) < 0) grades.push(c.grade);
      var al = charAttrLabel(c);
      if (al && attrs.indexOf(al) < 0) attrs.push(al);
      if (c.battleType && types.indexOf(c.battleType) < 0) types.push(c.battleType);
    });
    grades.sort();
    fillSelect($('fGrade'), grades, '등급 전체');
    fillSelect($('fAttr'), attrs, '속성 전체');
    fillSelect($('fType'), types, '타입 전체');
    var sortSel = $('fSort');
    if (sortSel) {
      sortSel.innerHTML = '<option value="id">번호순</option><option value="name">이름순</option><option value="grade">등급순</option>';
      sortSel.value = F.sort;
    }
    if ($('fGrade')) $('fGrade').value = F.grade;
    if ($('fAttr')) $('fAttr').value = F.attr;
    if ($('fType')) $('fType').value = F.type;
  }
  function sortChars(list, sort) {
    var arr = list.slice();
    if (sort === 'name') arr.sort(function (a, b) { return String(a.name).localeCompare(String(b.name), 'ko'); });
    else if (sort === 'grade') {
      var order = { SS: 0, S: 1, A: 2, B: 3, C: 4 };
      arr.sort(function (a, b) {
        return (order[a.grade] == null ? 9 : order[a.grade]) - (order[b.grade] == null ? 9 : order[b.grade]);
      });
    } else arr.sort(function (a, b) { return (Number(b.id) || 0) - (Number(a.id) || 0); });
    return arr;
  }
  function renderChars() {
    var grid = $('charGrid');
    if (!grid) return;
    UI.setActiveNav('characters');
    var kind = F.tab === 'support' ? 'support' : 'char';
    var list = (F.tab === 'support' ? S.supports : S.chars).slice();
    if (F.grade !== 'all') list = list.filter(function (c) { return c.grade === F.grade; });
    if (F.tab !== 'support') {
      if (F.attr !== 'all') list = list.filter(function (c) { return charAttrLabel(c) === F.attr; });
      if (F.type !== 'all') list = list.filter(function (c) { return c.battleType === F.type; });
    }
    if (F.fav) list = list.filter(function (c) { return UI.isFav(kind, c.id); });
    if (F.q) {
      var q = F.q.toLowerCase();
      list = list.filter(function (c) { return String(c.name || '').toLowerCase().indexOf(q) > -1; });
    }
    list = sortChars(list, F.sort);

    if (!list.length) {
      grid.innerHTML = '';
      UI.empty(grid, {
        title: F.fav ? '즐겨찾기한 캐릭터가 없습니다.' : '조건에 맞는 캐릭터가 없습니다.',
        desc: F.fav ? '카드의 ☆ 버튼을 눌러 추가해 보세요.' : '필터를 조정해 보세요.'
      });
      return;
    }

    grid.innerHTML = list.map(function (c) {
      var attrCls = charAttrClass(c);
      var bt = c.battleType;
      var favOn = UI.isFav(kind, c.id);
      var upcomingDays = pvpUpcomingForCharacter(c, kind);
      return '<article class="char-card rv' + (upcomingDays !== null ? ' char-card--upcoming' : '') + (c.grade ? ' grade-' + UI.esc(c.grade) : '') + (attrCls ? ' ' + attrCls : '') + '" data-id="' + UI.esc(c.id) + '" tabindex="0" role="button" aria-label="' + UI.esc(c.name) + (upcomingDays !== null ? ' — 출시 예정 D-' + upcomingDays : '') + '">' +
        '<div class="char-card-img-wrap">' +
        (c.image ? '<img src="' + UI.esc(c.image) + '" alt="' + UI.esc(c.name) + '" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">' : '') +
        '<div class="char-card-placeholder"' + (c.image ? ' style="display:none"' : '') + '>' + UI.esc((c.name || '?').charAt(0)) + '</div>' +
        (attrCls ? '<div class="char-badge ' + attrCls + '" aria-hidden="true"></div>' : '') +
        ((attrCls || bt) ? '<div class="char-card-icons">' +
          (attrCls ? '<img class="char-attr-icon" src="' + attrIconSrc(attrCls) + '" alt="' + UI.esc(charAttrLabel(c)) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
          (bt && typeIconSrc(bt) ? '<img class="char-type-icon" src="' + typeIconSrc(bt) + '" alt="' + UI.esc(bt) + '" loading="lazy" onerror="this.style.display=\'none\'">' : '') +
          '</div>' : '') +
        (upcomingDays !== null ? '<div class="char-upcoming-overlay" aria-hidden="true"><span>D-' + upcomingDays + '</span></div>' : '') +
        (c.grade ? '<span class="char-grade-badge grade-' + UI.esc(c.grade) + '">' + UI.esc(c.grade) + '</span>' : '') +
        '<button class="char-fav-btn' + (favOn ? ' active' : '') + '" data-fav="' + UI.esc(String(c.id)) + '" aria-pressed="' + favOn + '" aria-label="즐겨찾기" type="button"><i class="' + (favOn ? 'ic-v2-community-star-fill' : 'ic-v2-community-star-line') + '" aria-hidden="true"></i></button>' +
        '</div><div class="char-card-name">' + UI.esc(c.name) + '</div></article>';
    }).join('');

    grid.querySelectorAll('.char-card').forEach(function (card) {
      var id = card.getAttribute('data-id');
      var isSupportTab = F.tab === 'support';
      var open = function () { openCharPanel(findChar(id, F.tab) || { id: id, name: '캐릭터' + id }, isSupportTab); };
      card.addEventListener('click', function (e) { if (e.target.closest('.char-fav-btn')) return; open(); });
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(); });
    });
    grid.querySelectorAll('[data-fav]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var id = b.getAttribute('data-fav');
        var key = /^-?\d+$/.test(String(id)) ? Number(id) : id;
        var willBeOn = !UI.isFav(kind, key);
        UI.toggleFav(kind, key).then(function () {
          b.classList.toggle('active', willBeOn);
          b.setAttribute('aria-pressed', String(willBeOn));
          var favIcon = b.querySelector('i');
          if (favIcon) favIcon.className = willBeOn ? 'ic-v2-community-star-fill' : 'ic-v2-community-star-line';
          if (F.fav) renderChars();
        });
      });
    });
    UI.watchReveals($('view-characters'));
  }

  /* ================= 캐릭터 정보 슬라이드 패널 ================= */
  var CP = null; /* { c, tab, support } */
  /* 현질 서폿 캐릭터 판별 — 서폿에만 존재하는 캐릭터 */
  function isSupportChar(c) {
    var inSupport = S.supports.some(function (x) { return String(x.id) === String(c.id); });
    var inChars = S.chars.some(function (x) { return String(x.id) === String(c.id); });
    return inSupport && !inChars;
  }
  function ensureCharPanel() {
    if ($('cpPanel')) return;
    var back = document.createElement('div');
    back.className = 'cp-backdrop';
    back.id = 'cpBackdrop';
    var panel = document.createElement('aside');
    panel.className = 'cp-panel';
    panel.id = 'cpPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-hidden', 'true');
    panel.innerHTML =
      '<div class="cp-hero">' +
      '<button class="cp-close" id="cpClose" type="button" aria-label="닫기">' +
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
      '<span class="cp-ava" id="cpAva"></span>' +
      '<div class="cp-side">' +
      '<h3 class="cp-name" id="cpName"></h3>' +
      '<div class="cp-meta" id="cpMeta"></div>' +
      '<button class="cp-fav" id="cpFav" type="button"><i id="cpFavIcon" class="ic-v2-community-star-line" aria-hidden="true"></i><span id="cpFavTx">즐겨찾기 추가</span></button></div>' +
      '</div>' +
      '<div class="cp-tabs" id="cpTabs" role="tablist">' +
      '<button class="cp-tab is-on" data-cpt="skills" type="button" role="tab">스킬</button>' +
      '<button class="cp-tab" data-cpt="support" type="button" role="tab">서폿 스킬</button>' +
      '<button class="cp-tab" data-cpt="tips" type="button" role="tab">캐릭터 팁</button>' +
      '<button class="cp-tab" data-cpt="patches" type="button" role="tab">최근패치</button>' +
      '</div>' +
      '<div class="cp-scroll">' +
      '<div class="cp-body" id="cpBody"></div>' +
      '</div>' +
      '<div class="cp-related" id="cpRelated">' +
      '<div class="cp-related-head">관련 캐릭터</div>' +
      '<div class="cp-related-icons" id="cpRelatedIcons"></div>' +
      '</div>';
    document.body.appendChild(back);
    document.body.appendChild(panel);

    back.addEventListener('click', closeCharPanel);
    panel.querySelector('#cpClose').addEventListener('click', closeCharPanel);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('cpPanel') && $('cpPanel').classList.contains('open')) closeCharPanel();
    });
    panel.querySelectorAll('.cp-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        CP.tab = t.getAttribute('data-cpt');
        panel.querySelectorAll('.cp-tab').forEach(function (x) { x.classList.toggle('is-on', x === t); });
        renderCpBody();
      });
    });
    panel.querySelector('#cpFav').addEventListener('click', function () {
      if (!CP || !CP.c) return;
      var kind = (S.supports.filter(function (x) { return String(x.id) === String(CP.c.id); }).length &&
        !S.chars.filter(function (x) { return String(x.id) === String(CP.c.id); }).length) ? 'support' : 'char';
      UI.toggleFav(kind, CP.c.id).then(paintCpFav);
    });
  }
  function cpSectionHTML(items) {
    if (!items || !items.length) return '<p class="cp-empty">등록된 내용이 없습니다.</p>';
    return '<ul class="cp-list">' + items.map(function (s) {
      var nm = typeof s === 'string' ? s : (s.name || '');
      var ds = typeof s === 'string' ? '' : (s.desc || s.description || '');
      return '<li><b>' + UI.escBr(nm) + '</b>' + (ds ? '<small>' + UI.escBr(ds) + '</small>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  /* ================= 캐릭터 꿀팁 — 작성·투표·수정·삭제 ================= */
  var tipCache = {}; /* charId → 팁 배열 캐시 */
  var TIP_MAX = 300;
  var TIP_IC = {
    up: '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M12 5l7 9H5z"/></svg>',
    down: '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M12 19L5 10h14z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l4.5-1L20 7.5 16.5 4 5 15.5z"/><path d="M14.5 6l3.5 3.5"/></svg>',
    del: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M9.5 7V5h5v2M7 7l1 13h8l1-13M10 11v6M14 11v6"/></svg>'
  };
  function tipScore(t) { return (t.upBy || []).length - (t.downBy || []).length; }
  /* BEST 랭킹 — 점수 순 1/2/3위는 금·은·동, 나머지 양수 점수는 BEST 테두리 배지 */
  function tipBestHTML(t, rank) {
    if (rank <= 3) return '<span class="tip-best best-' + rank + '">BEST ' + rank + '</span>';
    if (tipScore(t) > 0) return '<span class="tip-best best-rest">BEST</span>';
    return '';
  }
  function tipAvaHTML(t, author, currentProfileIcon, mine) {
    var icon = mine && currentProfileIcon != null && currentProfileIcon !== '' ? currentProfileIcon : t.avatar;
    var value = icon == null ? '' : String(icon).trim();
    var src = '';
    if (/^\d+$/.test(value)) src = UI.avatarOf(parseInt(value, 10));
    else if (/^https?:\/\//i.test(value)) src = value;
    else if (/^(?:\.\/)?img\/avatars\/[a-z0-9._-]+$/i.test(value)) src = value.replace(/^\.\//, '');
    if (src) {
      return '<span class="tip-ava"><span class="tip-ava-imgwrap"><img src="' + UI.esc(src) + '" alt="" loading="lazy"></span></span>';
    }
    var ch = (author || t.author || '선').charAt(0).toUpperCase();
    return '<span class="tip-ava"><span class="tip-ava-initial">' + UI.esc(ch) + '</span></span>';
  }
  function tipRowHTML(t, rank, uid, currentNickname, currentProfileIcon) {
    var mine = !!(uid && t.uid && t.uid === uid);
    var author = (mine && currentNickname) || t.author || '선원';
    var upOn = !!(uid && (t.upBy || []).indexOf(uid) > -1);
    var downOn = !!(uid && (t.downBy || []).indexOf(uid) > -1);
    var h = '<li class="tip-row' + (mine ? ' tip-row--own' : '') + '" data-tip="' + UI.esc(t.id) + '" data-tip-source="' + UI.esc(t.sourceCollection || '') + '">';
    h += tipAvaHTML(t, author, currentProfileIcon, mine);
    h += '<div class="tip-main">' +
      '<div class="tip-top"><b>' + UI.esc(author) + (mine ? ' (나)' : '') + '</b>' +
      '<time>' + UI.esc(UI.fmtDate(t.date)) + '</time>' + tipBestHTML(t, rank) + '</div>' +
      '<p class="tip-txt">' + UI.escBr(t.text || '') + '</p>' +
      '<div class="tip-foot">' +
      '<button class="tip-vote' + (upOn ? ' on' : '') + '" type="button" data-vote="up" aria-label="추천" aria-pressed="' + upOn + '"' + (uid ? '' : ' disabled') + '>' + TIP_IC.up + ' ' + (t.upBy || []).length + '</button>' +
      '<button class="tip-vote tip-vote--down' + (downOn ? ' on' : '') + '" type="button" data-vote="down" aria-label="비추천" aria-pressed="' + downOn + '"' + (uid ? '' : ' disabled') + '>' + TIP_IC.down + ' ' + (t.downBy || []).length + '</button>' +
      '</div></div>';
    if (mine) {
      h += '<div class="tip-own">' +
        '<button class="tip-act tip-edit" type="button" aria-label="팁 수정">' + TIP_IC.edit + '</button>' +
        '<button class="tip-act tip-del" type="button" aria-label="팁 삭제">' + TIP_IC.del + '</button>' +
        '</div>';
    }
    return h + '</li>';
  }
  function tipWriteHTML(u) {
    if (!u) {
      return '<div class="tip-write tip-login"><span>꿀팁은 로그인 후 남길 수 있습니다.</span>' +
        '<a class="btn btn--gold btn--sm" href="' + UI.pageUrl('Login.html') + '">로그인</a></div>';
    }
    return '<div class="tip-write">' +
      '<div class="tip-write-head"><b>꿀팁 남기기</b></div>' +
      '<textarea class="tip-input" id="tipInput" maxlength="' + TIP_MAX + '" placeholder="이 캐릭터를 쓸 때 알면 좋은 운영법·콤보·카운터 등을 공유해 주세요."></textarea>' +
      '<div class="tip-write-foot"><span class="tip-count" id="tipCount">0/' + TIP_MAX + '</span>' +
      '<button class="btn btn--gold btn--sm" id="tipSubmit" type="button">등록</button></div></div>';
  }
  function tipsHTML(c, list) {
    var u = UI.currentUser();
    var uid = u && u.uid;
    var profile = UI.userDoc() || {};
    var currentNickname = profile.nickname || profile.displayName || (u && u.displayName) || '';
    var currentProfileIcon = profile.profileIcon;
    /* 점수(추천-비추천) 내림차순 → 같은 점수면 최신순 */
    var sorted = list.slice().sort(function (a, b) {
      var s = tipScore(b) - tipScore(a);
      if (s) return s;
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
    var rank = 0;
    var rows = sorted.map(function (t) {
      if (tipScore(t) > 0) rank += 1;
      return tipRowHTML(t, rank || 99, uid, currentNickname, currentProfileIcon);
    }).join('');
    var empty = '<p class="cp-empty">아직 등록된 꿀팁이 없습니다.<br>첫 꿀팁의 주인공이 되어보세요!</p>';
    return (sorted.length ? '<ul class="tip-list">' + rows + '</ul>' : empty) + tipWriteHTML(u);
  }
  function paintTips(c, list) {
    if (!Array.isArray(list)) return;
    tipCache[c.id] = list;
    var body = $('cpBody');
    if (!body || !CP || String(CP.c.id) !== String(c.id) || CP.tab !== 'tips') return;
    body.innerHTML = tipsHTML(c, list);
    bindTipEvents(c);
  }
  function voteCachedTip(c, tipId, dir, uid) {
    return (tipCache[c.id] || []).map(function (t) {
      if (String(t.id) !== String(tipId)) return t;
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
  }
  function renderTips(c) {
    var body = $('cpBody');
    if (!body) return;
    if (Array.isArray(tipCache[c.id])) { paintTips(c, tipCache[c.id]); return; }
    UI.skelRows(body, 4);
    FB.getTips(c.id, c.name).then(function (list) {
      paintTips(c, list);
    }).catch(function () {
      if (Array.isArray(tipCache[c.id])) {
        paintTips(c, tipCache[c.id]);
      } else if (CP && String(CP.c.id) === String(c.id) && CP.tab === 'tips') {
        body.innerHTML = '<p class="cp-empty">캐릭터 팁을 불러오지 못했습니다.<br>잠시 후 다시 시도해 주세요.</p>';
      }
    });
  }
  function bindTipEvents(c) {
    var body = $('cpBody');
    if (!body) return;
    var u = UI.currentUser();
    var uid = u && u.uid;
    /* 투표 */
    body.querySelectorAll('.tip-vote').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!uid) return;
        var row = b.closest('.tip-row');
        var tipId = row.getAttribute('data-tip');
        var direction = b.getAttribute('data-vote');
        b.disabled = true;
        FB.voteTip(c.id, tipId, direction, uid,
          row.getAttribute('data-tip-source'), c.name).then(function () {
          paintTips(c, voteCachedTip(c, tipId, direction, uid));
        }).catch(function () {
          b.disabled = false;
          UI.toast('추천을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'err');
        });
      });
    });
    /* 작성 */
    var ta = body.querySelector('#tipInput');
    if (ta) {
      var cnt = body.querySelector('#tipCount');
      ta.addEventListener('input', function () { cnt.textContent = ta.value.length + '/' + TIP_MAX; });
      body.querySelector('#tipSubmit').addEventListener('click', function () {
        var v = ta.value.trim();
        if (!v) { UI.toast('팁 내용을 입력해 주세요.', 'err'); ta.focus(); return; }
        var submit = body.querySelector('#tipSubmit');
        submit.disabled = true;
        var cachedProfile = UI.userDoc() || {};
        var profileLookup = FB.getUserDoc ? FB.getUserDoc(u.uid) : Promise.resolve(null);
        Promise.resolve(profileLookup).catch(function () { return null; }).then(function (profile) {
          var ud = Object.assign({}, cachedProfile, profile || {});
          if (!ud.nickname && cachedProfile.nickname) ud.nickname = cachedProfile.nickname;
          return FB.addTip(c.id, v, u, ud, c.name);
        }).then(function (res) {
          UI.toast(res.remote ? '꿀팁이 등록되었습니다.' : '임시 저장되었습니다. (서버 연결 실패)', res.remote ? 'ok' : 'err');
          var list = tipCache[c.id] || [];
          if (!list.some(function (tip) { return String(tip.id) === String(res.tip.id); })) {
            list = [res.tip].concat(list);
          }
          paintTips(c, list);
        }).catch(function () {
          submit.disabled = false;
          UI.toast('팁을 등록하지 못했습니다. 다시 시도해 주세요.', 'err');
        });
      });
    }
    /* 수정 (인라인) */
    body.querySelectorAll('.tip-edit').forEach(function (b) {
      b.addEventListener('click', function () {
        var row = b.closest('.tip-row');
        var main = row.querySelector('.tip-main');
        var own = row.querySelector('.tip-own');
        var old = row.querySelector('.tip-txt').textContent;
        if (own) own.style.display = 'none';
        main.innerHTML = '<div class="tip-edit-wrap">' +
          '<textarea class="tip-input tip-edit-area" maxlength="' + TIP_MAX + '">' + UI.esc(old) + '</textarea>' +
          '<div class="tip-edit-actions">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-act="cancel">취소</button>' +
          '<button class="btn btn--gold btn--sm" type="button" data-act="save">저장</button>' +
          '</div></div>';
        var area = main.querySelector('.tip-edit-area');
        area.focus();
        main.querySelector('[data-act="cancel"]').addEventListener('click', function () {
          tipCache[c.id] = tipCache[c.id] || [];
          body.innerHTML = tipsHTML(c, tipCache[c.id]);
          bindTipEvents(c);
        });
        main.querySelector('[data-act="save"]').addEventListener('click', function () {
          var v = area.value.trim();
          if (!v) { UI.toast('팁 내용을 입력해 주세요.', 'err'); area.focus(); return; }
          var save = main.querySelector('[data-act="save"]');
          var tipId = row.getAttribute('data-tip');
          save.disabled = true;
          FB.updateTip(c.id, tipId, v,
            row.getAttribute('data-tip-source'), c.name).then(function () {
            var list = (tipCache[c.id] || []).map(function (tip) {
              return String(tip.id) === String(tipId) ? Object.assign({}, tip, { text: v }) : tip;
            });
            UI.toast('팁이 수정되었습니다.', 'ok');
            paintTips(c, list);
          }).catch(function () {
            save.disabled = false;
            UI.toast('팁 수정에 실패했습니다. 권한 또는 연결 상태를 확인해 주세요.', 'err');
          });
        });
      });
    });
    /* 삭제 (확인 모달) */
    body.querySelectorAll('.tip-del').forEach(function (b) {
      b.addEventListener('click', function () {
        var row = b.closest('.tip-row');
        var tipId = row.getAttribute('data-tip');
        var m = UI.openModal({
          title: '팁 삭제',
          cls: 'modal--center',
          body: '<p style="font-size:13.5px;color:var(--text-2);line-height:1.7;text-align:center">이 꿀팁을 삭제할까요?<br>삭제 후에는 되돌릴 수 없습니다.</p>' +
            '<div class="tip-edit-actions" style="margin-top:16px;justify-content:center">' +
            '<button class="btn btn--ghost btn--sm" id="tipDelNo" type="button">취소</button>' +
            '<button class="btn btn--gold btn--sm" id="tipDelYes" type="button">삭제</button></div>'
        });
        m.body.querySelector('#tipDelNo').addEventListener('click', m.close);
        m.body.querySelector('#tipDelYes').addEventListener('click', function () {
          m.close();
          FB.deleteTip(c.id, tipId, row.getAttribute('data-tip-source'), c.name).then(function () {
            var list = (tipCache[c.id] || []).filter(function (tip) {
              return String(tip.id) !== String(tipId);
            });
            UI.toast('팁이 삭제되었습니다.', 'ok');
            paintTips(c, list);
          }).catch(function () {
            UI.toast('팁 삭제에 실패했습니다. 권한 또는 연결 상태를 확인해 주세요.', 'err');
          });
        });
      });
    });
  }
  /* 최근패치 — 날짜별로 묶고, 가장 최근 5개 날짜분만 노출 */
  function cpPatchesHTML(c) {
    var items = [];
    S.pvps.forEach(function (g) {
      if (String(g.charId) === String(c.id)) {
        g.items.forEach(function (it) {
          items.push({ type: g.type, date: String(g.date || ''), text: it.text || '' });
        });
      }
    });
    if (c.recentPatches && c.recentPatches.length) {
      c.recentPatches.forEach(function (p) { items.push({ type: p.type || 'fix', date: String(p.date || ''), text: typeof p === 'string' ? p : (p.text || '') }); });
    }
    if (!items.length) return '<p class="cp-empty">패치 내역이 없습니다.</p>';

    /* 날짜별 그룹 (내림차순) */
    var byDate = {};
    items.forEach(function (it) {
      var k = it.date || '미상';
      if (!byDate[k]) byDate[k] = [];
      byDate[k].push(it);
    });
    var dates = Object.keys(byDate).sort(function (a, b) { return b.localeCompare(a); });
    var recent = dates.slice(0, 5); /* 최근 5개 날짜 */

    var order = { buff: 0, nerf: 1, fix: 2 };
    return '<div class="pvp-date-groups">' + recent.map(function (d) {
      var list = byDate[d].slice().sort(function (a, b) {
        return (order[a.type] == null ? 9 : order[a.type]) - (order[b.type] == null ? 9 : order[b.type]);
      });
      return '<div class="pvp-date-group">' +
        '<button class="pg-head" type="button" aria-expanded="false">' +
        '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4" stroke-linecap="round"/></svg>' +
        UI.esc(d === '미상' ? '날짜 미상' : UI.fmtDate(d)) +
        '<span class="pg-count">' + list.length + '건</span>' +
        '<svg class="pg-chev" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9.5l6 6 6-6"/></svg></button>' +
        '<div class="pg-body"><div class="pg-body-inner">' +
        '<ul class="cp-list">' + list.map(function (it) {
          var patchLabel = BNAME[it.type] || '패치';
          var patchTypeText = it.type === 'upcoming' ? patchLabel : (BSYM[it.type] || '✦') + ' ' + patchLabel;
          return '<li class="cp-patch-row cp-patch-row--' + it.type + '"><b>' + UI.esc(patchTypeText) + '</b>' +
            '<small>' + UI.escBr(it.text) + '</small></li>';
        }).join('') + '</ul></div></div></div>';
    }).join('') + '</div>';
  }
  function renderCpBody() {
    if (!CP) return;
    var c = CP.c;
    var body = $('cpBody');
    if (CP.tab === 'skills') body.innerHTML = cpSectionHTML(c.skills);
    else if (CP.tab === 'support') body.innerHTML = cpSectionHTML(c.supportSkills);
    else if (CP.tab === 'tips') { renderTips(c); return; } /* 비동기 로드 — 스켈레톤 후 렌더 */
    else body.innerHTML = cpPatchesHTML(c);
    /* 최근패치 날짜 그룹 — 헤더 클릭 시 펼치기/접기 (기본 접힘) */
    if (CP.tab === 'patches') {
      body.querySelectorAll('.pg-head').forEach(function (h) {
        h.addEventListener('click', function () {
          var g = h.closest('.pvp-date-group');
          if (!g) return;
          var open = g.classList.toggle('is-open');
          h.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
      });
    }
    body.classList.remove('swap'); void body.offsetWidth; body.classList.add('swap');
  }
  /* 이름 정규화 — 공백·기호·버전 표기를 걷어낸다 (괄호 안 표기는 검색에서 제외) */
  function nameKey(n) {
    /* '루피 (니카)' → '루피' : 괄호 안 글자는 관련 캐릭터 매칭에서 제외 */
    var s = String(n || '').replace(/\s*[(（][^)）]*[)）]\s*/g, ' ');
    s = s.replace(/[\s\-·・.,()（）\[\]【】'’""]/g, '').toLowerCase();
    return s.replace(/(진화|각성|한계돌파|초월|개화|한돌)$/g, '');
  }
  function isRelatedName(a, b) {
    if (!a || !b) return false;
    if (a === b) return true;
    var ka = nameKey(a), kb = nameKey(b);
    if (!ka || !kb) return false;
    if (ka === kb) return true;
    /* 검색과 동일한 포함 관계 매칭 */
    if (ka.length >= 2 && kb.length >= 2 && (ka.indexOf(kb) > -1 || kb.indexOf(ka) > -1)) return true;
    return false;
  }
  function renderCpRelated() {
    var box = $('cpRelatedIcons');
    var wrap = $('cpRelated');
    /* 현질 서폿 캐릭터는 관련 캐릭터에 미노출 — 서폿 상세에서도 섹션 자체를 숨김 */
    if (!CP || !CP.c || CP.support) { wrap.hidden = true; return; }
    var name = CP.c.name;
    var rel = S.chars.filter(function (x) {
      return isRelatedName(x.name, name) && String(x.id) !== String(CP.c.id);
    });
    if (!rel.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    box.innerHTML = rel.map(function (r) {
      return '<button class="cp-rel" type="button" data-rid="' + UI.esc(r.id) + '" aria-label="' + UI.esc(r.name) + '">' +
        '<span class="cp-rel-circle">' +
        '<span class="cp-rel-img"><img src="' + UI.esc(r.image || UI.PLACEHOLDER_IMG) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"></span>' +
        (r.grade ? '<span class="cp-rel-grade grade-' + UI.esc(r.grade) + '">' + UI.esc(r.grade) + '</span>' : '') +
        '</span>' +
        '<span class="cp-rel-name">' + UI.esc(r.name) + '</span>' +
        '</button>';
    }).join('');
    box.querySelectorAll('.cp-rel').forEach(function (b) {
      b.addEventListener('click', function () {
        var rid = b.getAttribute('data-rid');
        var next = S.chars.filter(function (x) { return String(x.id) === String(rid); })[0];
        if (next) openCharPanel(next, false); /* 관련 캐릭터는 항상 일반 캐릭터 구성으로 */
      });
    });
  }
  function paintCpFav() {
    if (!CP || !CP.c) return;
    var kind = (S.supports.filter(function (x) { return String(x.id) === String(CP.c.id); }).length &&
      !S.chars.filter(function (x) { return String(x.id) === String(CP.c.id); }).length) ? 'support' : 'char';
    var on = UI.isFav(kind, CP.c.id);
    var btn = $('cpFav');
    btn.classList.toggle('on', on);
    var icon = $('cpFavIcon');
    if (icon) icon.className = on ? 'ic-v2-community-star-fill' : 'ic-v2-community-star-line';
    $('cpFavTx').textContent = on ? '즐겨찾기 해제' : '즐겨찾기 추가';
  }
  function openCharPanel(c, supportOverride) {
    ensureCharPanel();
    /* 서폿 탭에서 열었으면 무조건 서폿 구성 — ID 중복과 무관하게 컨텍스트 우선 */
    var support = (supportOverride === true) || (supportOverride === false ? false : isSupportChar(c));
    /* 서폿 캐릭터는 서폿 스킬이 Default, 일반 캐릭터는 스킬이 Default */
    CP = { c: c, tab: support ? 'support' : 'skills', support: support };
    var panel = $('cpPanel'), back = $('cpBackdrop');
    var wasOpen = panel.classList.contains('open'); /* 관련 캐릭터 전환 시 잠금 중복 방지 */
    /* 서폿 캐릭터는 스킬 탭 미노출 */
    var skillsTab = panel.querySelector('.cp-tab[data-cpt="skills"]');
    if (skillsTab) skillsTab.style.display = support ? 'none' : '';
    var attrCls = charAttrClass(c);
    $('cpName').textContent = c.name || '이름 미상';
    $('cpAva').innerHTML = '<img src="' + UI.esc(c.image || UI.PLACEHOLDER_IMG) + '" alt="' + UI.esc(c.name || '') + '" onerror="this.style.display=\'none\'">';
    /* 등급은 파스텔 배지, 속성·타입은 원본 레포 이미지 아이콘으로 노출 */
    var attrSrc = attrCls ? attrIconSrc(attrCls) : '';
    var typeSrc = c.battleType ? typeIconSrc(c.battleType) : '';
    $('cpMeta').innerHTML =
      (c.grade ? '<span class="char-grade-badge grade-' + UI.esc(c.grade) + '">' + UI.esc(c.grade) + '</span>' : '') +
      (attrSrc ? '<img class="cp-ic" src="' + attrSrc + '" alt="' + UI.esc(charAttrLabel(c)) + '" title="속성: ' + UI.esc(charAttrLabel(c)) + '" onerror="this.style.display=\'none\'">' : '') +
      (typeSrc ? '<img class="cp-ic" src="' + typeSrc + '" alt="' + UI.esc(c.battleType) + '" title="타입: ' + UI.esc(c.battleType) + '" onerror="this.style.display=\'none\'">' : '');
    paintCpFav();
    panel.querySelectorAll('.cp-tab').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-cpt') === CP.tab); });
    renderCpBody();
    renderCpRelated();
    back.classList.add('open');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    if (!wasOpen) UI.lockBody(); /* 뒷배경 스크롤 잠금 (이미 열려있던 관련 캐릭터 전환이면 스킵) */
  }
  function closeCharPanel() {
    var panel = $('cpPanel'), back = $('cpBackdrop');
    if (!panel) return;
    back.classList.remove('open');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    UI.unlockBody();
  }

  /* ================= PvP 패치 ================= */
  function pvpDates() {
    var seen = {};
    return S.pvps.filter(function (g) {
      /* 출시 예정일은 날짜 필터를 만들지 않고, 실제 패치 날짜만 필터에 노출 */
      return g.type !== 'upcoming';
    }).map(function (g) { return String(g.date || ''); })
      .filter(function (d) { if (!d || seen[d]) return false; seen[d] = 1; return true; })
      .sort()
      .reverse();
  }
  function renderPvpDateFilter() {
    var btn = $('pvpDateBtn'), list = $('pvpDateList'), tx = $('pvpDateText');
    if (!btn || !list) return;
    var dates = pvpDates();
    if (!dates.length) {
      pvpSelDate = '';
      if (tx) tx.textContent = '날짜 없음';
      list.innerHTML = '';
      return;
    }
    if (!pvpSelDate || dates.indexOf(pvpSelDate) < 0) pvpSelDate = dates[0];
    if (tx) tx.textContent = UI.fmtDate(pvpSelDate);
    list.innerHTML = dates.map(function (d) {
      return '<button class="pvp-date-item' + (d === pvpSelDate ? ' is-on' : '') + '" data-d="' + UI.esc(d) + '" type="button" role="option">' + UI.esc(UI.fmtDate(d)) + '</button>';
    }).join('');
    list.querySelectorAll('.pvp-date-item').forEach(function (b) {
      b.addEventListener('click', function () {
        pvpSelDate = b.getAttribute('data-d');
        closePvpDate();
        renderPvpDateFilter();
        renderPvpCols();
        UI.watchReveals($('view-pvp'));
      });
    });
  }
  function openPvpDate() {
    var l = $('pvpDateList'), b = $('pvpDateBtn');
    if (l) l.hidden = false;
    if (b) { b.setAttribute('aria-expanded', 'true'); b.classList.add('is-open'); }
  }
  function closePvpDate() {
    var l = $('pvpDateList'), b = $('pvpDateBtn');
    if (l) l.hidden = true;
    if (b) { b.setAttribute('aria-expanded', 'false'); b.classList.remove('is-open'); }
  }
  function renderPvpCols() {
    var cols = { buff: $('buffCol'), nerf: $('nerfCol'), fix: $('fixCol') };
    ['buff', 'nerf', 'fix'].forEach(function (kind) {
      var colEl = cols[kind];
      if (!colEl) return;
      var groups = S.pvps.filter(function (g) {
        var upcoming = g.type === 'upcoming';
        var inColumn = g.type === kind || (kind === 'fix' && upcoming);
        /* 예정 항목은 출시일까지 유지하며 선택한 실제 패치 날짜와 무관하게 함께 표시 */
        var inDateRange = upcoming
          ? pvpDaysUntil(g.date) > 0
          : (!pvpSelDate || String(g.date) === pvpSelDate);
        return inColumn && inDateRange;
      });
      /* 선택 날짜 기준 컬럼별 인원 카운트 */
      var cntEl = $(kind + 'Cnt');
      if (cntEl) cntEl.textContent = groups.length + '명';
      if (!groups.length) {
        colEl.innerHTML = '<div class="empty" style="padding:18px 10px"><p>' + BNAME[kind] + ' 내역이 없습니다.</p></div>';
        return;
      }
      colEl.innerHTML = '<div class="pvp-col-grid">' + groups.map(function (g) {
        var c = pvpCharacter(g);
        var name = pvpCharacterName(g);
        var img = (c && c.image) || g.image || UI.PLACEHOLDER_IMG;
        var upcoming = g.type === 'upcoming';
        var upcomingDays = upcoming ? pvpDaysUntil(g.date) : null;
        var badgeType = upcoming ? 'upcoming' : kind;
        var badgeName = BNAME[badgeType] || BNAME[kind];
        var badge = upcoming ? '' :
          '<span class="orb-badge badge badge--' + badgeType + '" aria-hidden="true">' + BSYM[badgeType] + '</span>';
        var countdown = upcomingDays !== null
          ? '<span class="orb-countdown" aria-hidden="true">D-' + upcomingDays + '</span>'
          : '';
        return '<button class="orb' + (upcoming ? ' orb--upcoming' : '') + '" type="button" data-gid="' + UI.esc(g.uid) + '" aria-label="' + UI.esc(name) + ' (' + badgeName + (upcomingDays !== null ? ' D-' + upcomingDays : '') + ')">' +
          '<span class="orb-img"><img src="' + UI.esc(img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">' + countdown +
          badge + '</span>' +
          '<span class="orb-name">' + UI.esc(name) + '</span></button>';
      }).join('') + '</div>';
      colEl.querySelectorAll('.orb').forEach(function (el) {
        var gid = el.getAttribute('data-gid');
        var g = groups.filter(function (x) { return x.uid === gid; })[0];
        el.addEventListener('click', function () { openPvpPatchDetail(g); });
      });
    });
  }
  /* PvP 패치 정보 팝업 — 버프/너프/기능수정 한 번에 */
  function openPvpPatchDetail(g) {
    if (!g) return;
    var c = pvpCharacter(g);
    var name = pvpCharacterName(g);
    var img = (c && c.image) || g.image || UI.PLACEHOLDER_IMG;
    var same = S.pvps.filter(function (x) {
      return pvpCharacterKey(x) === pvpCharacterKey(g) && String(x.date) === String(g.date);
    });
    /* 내역이 없는 타입(버프/너프/기능수정)은 섹션 자체를 미노출 */
    var sections = ['upcoming', 'buff', 'nerf', 'fix'].map(function (k) {
      var groups = same.filter(function (x) { return x.type === k; });
      if (!groups.length) return '';
      var body = '<ul class="pvp-list">' + groups.map(function (gr) {
          return gr.items.map(function (it) { return '<li><small>' + UI.escBr(it.text || '') + '</small></li>'; }).join('');
        }).join('') + '</ul>';
      var heading = k === 'upcoming'
        ? '<span class="orb-badge badge badge--upcoming">' + BNAME[k] + '</span>'
        : '<span class="badge badge--' + k + '">' + BSYM[k] + '</span> ' + BNAME[k];
      return '<div class="pvp-sec pvp-sec--' + k + '"><h4>' + heading + '</h4>' + body + '</div>';
    }).join('');
    UI.openModal({
      cls: 'pvp-modal',
      title: 'PvP 밸런스 패치',
      headHTML:
      '<div class="pvp-top">' +
      '<span class="pvp-ava"><img src="' + UI.esc(img) + '" alt="" onerror="this.style.display=\'none\'"></span>' +
      '<div class="pvp-id"><div class="pvp-name">' + UI.esc(name) + '</div>' +
      '<div class="pvp-sub"><span class="badge badge--patch">PvP 패치</span><span class="pvp-modal-date">' + UI.esc(UI.fmtDate(g.date)) + '</span></div></div>' +
      '</div>',
      body: sections
    });
  }
  function renderPvp() {
    UI.setActiveNav('pvp');
    renderPvpDateFilter();
    renderPvpCols();
    UI.watchReveals($('view-pvp'));
  }

  /* ================= 라우팅 ================= */
  var VIEWS = { home: 'view-home', patch: 'view-patch', characters: 'view-characters', pvp: 'view-pvp' };
  function syncScrollTopButton() {
    var button = $('scrollTopBtn');
    var viewChars = $('view-characters');
    if (!button) return;
    var visible = !!(viewChars && !viewChars.hidden && window.scrollY > 300);
    button.classList.toggle('is-visible', visible);
    button.setAttribute('aria-hidden', String(!visible));
    button.tabIndex = visible ? 0 : -1;
  }
  function route(name, params) {
    name = VIEWS[name] ? name : 'home';
    Object.keys(VIEWS).forEach(function (k) { $(VIEWS[k]).hidden = k !== name; });
    window.scrollTo({ top: 0 });
    syncScrollTopButton();
    if (!S.loaded) return;
    if (name === 'patch' && (S.visibility.boards || S.visibility.events)) {
      location.href = UI.pageUrl('Community.html' + location.hash);
      return;
    }
    if (name === 'home') renderHome();
    if (name === 'patch') renderMainPatches(params);
    if (name === 'characters') {
      UI.setActiveNav('characters');
      if (params) {
        if (params.tab) setTab(params.tab === 'support' ? 'support' : 'char');
        if (params.fav) { F.fav = true; syncFavBtn(); }
      }
      buildFilterOptions();
      renderChars();
      if (params && params.char != null) {
        var c = findChar(params.char, F.tab);
        if (c) setTimeout(function () { openCharPanel(c, F.tab === 'support'); }, 80);
      }
    }
    if (name === 'pvp') renderPvp();
  }
  function parseHash() {
    var h = location.hash.replace(/^#/, '') || 'home';
    var qi = h.indexOf('?');
    var routePath = qi > -1 ? h.slice(0, qi) : h;
    var parts = routePath.split('/');
    var name = parts[0] || 'home';
    var params = {};
    if (parts[1] === 'view' && parts[2]) {
      params.view = 'view';
      try { params.id = decodeURIComponent(parts.slice(2).join('/')); }
      catch (_) { params.id = parts.slice(2).join('/'); }
    }
    if (qi > -1) {
      h.slice(qi + 1).split('&').forEach(function (kv) {
        var p = kv.split('=');
        params[decodeURIComponent(p[0])] = p[1] ? decodeURIComponent(p[1]) : '1';
      });
    }
    return { name: name, params: params };
  }
  function pageBanners() {
    UI.fillPageBanner($('charBannerMedia'), 'characters', S.banners);
    UI.fillPageBanner($('pvpBannerMedia'), 'pvp', S.banners);
    UI.fillPageBanner($('patchBannerMedia'), 'patch', S.banners);
  }

  /* ================= 부팅 ================= */
  function bindCharPage() {
    var tc = $('charTabChar'), ts = $('charTabSupport');
    if (tc) tc.addEventListener('click', function () { setTab('char'); buildFilterOptions(); renderChars(); });
    if (ts) ts.addEventListener('click', function () { setTab('support'); buildFilterOptions(); renderChars(); });
    ['fGrade', 'fAttr', 'fType', 'fSort'].forEach(function (id) {
      var el = $(id);
      if (el) el.addEventListener('change', function () {
        F[id.slice(1).toLowerCase()] = el.value;
        renderChars();
      });
    });
    var fav = $('fFav');
    if (fav) fav.addEventListener('click', function () { F.fav = !F.fav; syncFavBtn(); renderChars(); });
    var sch = $('fSearch');
    if (sch) {
      var tm = null;
      sch.addEventListener('input', function () {
        clearTimeout(tm);
        tm = setTimeout(function () { F.q = sch.value.trim(); renderChars(); }, 200);
      });
    }
    var rf = $('fRefresh');
    if (rf) rf.addEventListener('click', function () {
      F.grade = 'all'; F.attr = 'all'; F.type = 'all'; F.sort = 'id'; F.fav = false; F.q = '';
      if (sch) sch.value = '';
      buildFilterOptions(); syncFavBtn(); renderChars();
    });
  }

  function start() {
    bindCharPage();
    bindMainPatchPage();
    UI.skelGrid($('charGrid'), 8);
    UI.skelRows($('homePatchList'), 4);
    UI.skelRows($('homeBoardList'), 4);
    var pg = $('homePvpGrid');
    if (pg) pg.innerHTML = '<div class="skel" style="height:150px;margin:10px"></div>';
    var er = $('homeEventRoll');
    if (er) er.innerHTML = '<div class="skel" style="height:120px;margin:8px"></div>';

    var dbtn = $('pvpDateBtn');
    if (dbtn) {
      dbtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var l = $('pvpDateList');
        if (l && !l.hidden) closePvpDate(); else openPvpDate();
      });
      document.addEventListener('click', function (e) {
        var l = $('pvpDateList');
        if (l && !l.hidden && (!e.target.closest || !e.target.closest('#pvpDateWrap'))) closePvpDate();
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closePvpDate(); });
    }

    var r = parseHash();
    route(r.name, r.params);
    document.addEventListener('fpp:community-visibility', function (event) {
      S.visibility = event.detail || { boards: true, events: true };
      var currentRoute = parseHash();
      if (S.loaded && (currentRoute.name === 'home' || currentRoute.name === 'patch')) route(currentRoute.name, currentRoute.params);
    });

    FB.onReady().then(function (isReady) {
      if (!isReady || !FB.ready) throw new Error('Firebase SDK 없음');
      return loadAll();
    }).then(function () {
      try {
        pageBanners();
        var r2 = parseHash();
        route(r2.name, r2.params);
      } catch (re) {
        console.error('[FPP] 렌더링 오류:', re);
        UI.toast('화면을 그리는 중 오류가 발생했습니다. 콘솔을 확인해 주세요.', 'err');
      }
    }).catch(function (e) {
      console.error('[FPP] 데이터 로드 실패:', e);
      var msg = (e && e.message === 'Firebase SDK 없음')
        ? 'Firebase SDK를 불러오지 못했습니다. 네트워크를 확인해 주세요.'
        : (FB.errMsg ? FB.errMsg(e) : '오류') + ' — 데이터를 불러오지 못했습니다.';
      UI.toast(msg, 'err');
      ['homePatchList', 'homeBoardList'].forEach(function (id) {
        UI.empty($(id), { title: '데이터를 불러오지 못했습니다.', desc: '네트워크 또는 Firebase 연결을 확인해 주세요.' });
      });
      UI.empty($('homePvpGrid'), { title: 'PvP 패치를 불러오지 못했습니다.' });
      UI.empty($('homeEventRoll'), { title: '이벤트를 불러오지 못했습니다.' });
      UI.empty($('charGrid'), { title: '캐릭터를 불러오지 못했습니다.' });
    });

    window.addEventListener('hashchange', function () {
      try {
        var rr = parseHash();
        route(rr.name, rr.params);
      } catch (re) {
        console.error('[FPP] 렌더링 오류:', re);
      }
    });
    document.addEventListener('fpp:fav-changed', function () {
      var vc = $('view-characters');
      if (vc && !vc.hidden) renderChars();
    });

    /* ===== Scroll to Top Button (캐릭터 페이지 전용) ===== */
    var scrollTopBtn = $('scrollTopBtn');
    if (scrollTopBtn) {
      window.addEventListener('scroll', syncScrollTopButton, { passive: true });
      syncScrollTopButton();

      scrollTopBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
