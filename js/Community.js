/* ============================================================
   FPP v2 — Community.js
   커뮤니티 홈 / 패치노트 / 게시판 / 이벤트 (+ 상세) — 단일 페이지
   ============================================================ */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  var S = {
    patches: [], events: [], boards: [], banners: [], loaded: false,
    visibility: UI.getCommunityVisibility ? UI.getCommunityVisibility() : { boards: true, events: true }
  };
  var likedCache = {};

  function viewMeta(count) {
    var value = count == null ? 0 : count;
    return '<span class="view-count" aria-label="조회수 ' + UI.esc(value) + '">' +
      '<i class="ic-v2-community-number-of-view-line" aria-hidden="true"></i>' +
      '<span>' + UI.esc(value) + '</span></span>';
  }
  function paintDetailViewCount(item, root, count) {
    if (count == null) return;
    item.viewCount = count;
    var el = root.querySelector('.detail-head .detail-meta .view-count');
    if (!el) return;
    el.setAttribute('aria-label', '조회수 ' + count);
    if (el.lastElementChild) el.lastElementChild.textContent = count;
  }
  function trackView(type, item, root) {
    if (!item || !item.docId || String(item.docId).indexOf('local_') === 0 || !FB.bumpViewCount) return;
    var keyPrefix = { patch: 'patch_read_', board: 'board_read_', event: 'event_read_' }[type] || ('fpp_view_' + type + '_');
    var key = keyPrefix + item.docId;
    var legacyKey = 'fpp_view_' + type + '_' + item.docId;
    var seen = false;
    try {
      seen = localStorage.getItem(key) === '1' || localStorage.getItem(legacyKey) === '1';
      if (seen) localStorage.setItem(key, '1');
    } catch (e) { }
    if (seen) {
      if (FB.getViewCount) {
        FB.getViewCount(type, item.docId).then(function (count) {
          paintDetailViewCount(item, root, count);
        }).catch(function () { });
      }
      return;
    }
    FB.bumpViewCount(type, item.docId).then(function (count) {
      if (count == null) return;
      try {
        localStorage.setItem(key, '1');
        localStorage.setItem(legacyKey, '1');
      } catch (e) { }
      paintDetailViewCount(item, root, count);
    }).catch(function () {
      if (FB.getViewCount) {
        FB.getViewCount(type, item.docId).then(function (count) {
          paintDetailViewCount(item, root, count);
        }).catch(function () { });
      }
    });
  }

  function loadAll() {
    if (S.loaded) return Promise.resolve();
    if (!FB.ready) return Promise.reject(new Error('Firebase SDK 없음'));
    return Promise.all([
      FB.getPatchNotes(), FB.getEvents(), FB.getBoards(), FB.getBanners(),
      FB.getCommunityVisibility().catch(function () { return S.visibility; })
    ]).then(function (r) {
      S.patches = r[0]; S.events = r[1]; S.boards = r[2]; S.banners = r[3];
      S.visibility = r[4] || S.visibility;
      S.loaded = true;
    });
  }

  var CAT_CLS = { '자유': 'badge--free', '정보': 'badge--info', '질문': 'badge--q', '자랑': 'badge--brag' };
  function catBadge(c) { return '<span class="badge ' + (CAT_CLS[c] || 'badge--free') + '">' + UI.esc(c || '자유') + '</span>'; }

  function listRow(o) {
    return '<li class="lst-row" data-view="' + UI.esc(o.id) + '" tabindex="0" role="button" aria-label="' + UI.esc(o.title) + '">' +
      '<div class="lst-main"><div class="lst-l1">' + o.badgeHTML +
      '<span class="lst-title">' + UI.esc(o.title) + '</span></div>' +
      '<div class="lst-l2"><span>' + UI.esc(o.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(o.date)) + '</span>' +
      '<span>·</span>' + viewMeta(o.viewCount) + '</div></div>' +
      (UI.isNew(o.date || o.ts) ? '<span class="lst-new">NEW</span>' : '') + '</li>';
  }
  function cardHTML(o) {
    var img = o.image ? '<img src="' + UI.esc(o.image) + '" alt="" loading="lazy" onerror="this.parentElement.classList.add(\'no-img\')">' : '';
    return '<article class="card" data-view="' + UI.esc(o.id) + '" tabindex="0" role="button" aria-label="' + UI.esc(o.title) + '">' +
      '<div class="card-img">' + o.badgeHTML + img + '</div>' +
      '<div class="card-body"><h3 class="card-title">' + UI.esc(o.title) + '</h3>' +
      '<div class="card-meta"><span>' + UI.esc(o.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(o.date)) + '</span>' +
      (o.viewCount != null ? '<span>·</span>' + viewMeta(o.viewCount) : '') + '</div>' +
      '<div class="card-foot"><span>' + UI.IC.heart + ' ' + (o.likeCount || 0) + '</span>' +
      (o.commentCount != null ? '<span>' + UI.IC.chat + ' ' + o.commentCount + '</span>' : '') +
      (o.period ? '<span class="ev-period" style="margin-left:auto">' + o.period + '</span>' : '') + '</div></div></article>';
  }
  function bindView(root, prefix) {
    root.querySelectorAll('[data-view]').forEach(function (el) {
      var go = function () { location.hash = prefix + '/view/' + el.getAttribute('data-view'); };
      el.addEventListener('click', go);
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    });
  }

  /* ================= 커뮤니티 홈 ================= */
  function renderComHome() {
    UI.setActiveNav('comhome');
    $('comBoardBox').hidden = !S.visibility.boards;
    $('comEventBox').hidden = !S.visibility.events;
    var pl = $('comPatchList');
    if (!S.patches.length) UI.empty(pl, { title: '등록된 패치노트가 없습니다.' });
    else {
      pl.innerHTML = '<ul class="lst">' + S.patches.slice(0, 5).map(function (p) {
        return listRow({ id: p.docId, badgeHTML: '<span class="badge badge--patch">패치노트</span>', title: p.title, author: p.author, date: p.date, ts: p.ts, viewCount: p.viewCount });
      }).join('') + '</ul>';
      bindView(pl, 'patch');
    }
    var bl = $('comBoardList');
    if (!S.boards.length) UI.empty(bl, { title: '게시글이 없습니다.' });
    else {
      bl.innerHTML = '<ul class="lst">' + S.boards.slice(0, 5).map(function (b) {
        return listRow({ id: b.docId, badgeHTML: catBadge(b.category), title: b.title, author: b.author, date: b.date, ts: b.ts, viewCount: b.viewCount });
      }).join('') + '</ul>';
      bindView(bl, 'board');
    }
    var evBox = $('comEventList');
    if (!S.events.length) UI.empty(evBox, { title: '진행 중인 이벤트가 없습니다.', desc: '새로운 이벤트가 시작되면 이곳에 표시됩니다.' });
    else {
      evBox.innerHTML = '<ul class="lst">' + S.events.slice(0, 5).map(function (e) {
        return listRow({ id: e.docId, badgeHTML: e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>', title: e.title, author: e.author, date: e.date, ts: e.ts, viewCount: e.viewCount });
      }).join('') + '</ul>';
      bindView(evBox, 'event');
    }
    document.querySelectorAll('#view-comhome [data-go]').forEach(function (b) {
      b.addEventListener('click', function () { location.hash = '#' + b.getAttribute('data-go'); });
    });
    UI.watchReveals($('view-comhome'));
  }

  /* ================= 패치노트 ================= */
  var patchMonth = 'all';
  var patchPage = 1;
  var PATCH_PAGE_SIZE = 10; /* 한 페이지 노출 건수 — 페이지네이션은 항상 노출 */
  function renderMonthFilter() {
    var months = {};
    S.patches.forEach(function (p) {
      var m = String(p.date || '').slice(0, 7);
      if (m) months[m] = (months[m] || 0) + 1;
    });
    var keys = Object.keys(months).sort().reverse();
    var box = $('monthList');
    box.innerHTML = '<button class="month-item' + (patchMonth === 'all' ? ' is-on' : '') + '" data-m="all" type="button">전체</button>' +
      keys.map(function (k) {
        return '<button class="month-item' + (patchMonth === k ? ' is-on' : '') + '" data-m="' + k + '" type="button">' + k.replace('-', '년 ') + '월</button>';
      }).join('');
    box.querySelectorAll('.month-item').forEach(function (b) {
      b.addEventListener('click', function () {
        patchMonth = b.getAttribute('data-m');
        patchPage = 1; /* 월이 바뀌면 첫 페이지로 */
        renderMonthFilter();
        renderPatchList();
      });
    });
    /* 모바일 드롭다운 — 칩 목록과 동일한 옵션 생성 + 선택값 동기화 */
    var sel = $('monthSelect');
    if (sel) {
      sel.innerHTML = '<option value="all">전체</option>' +
        keys.map(function (k) {
          return '<option value="' + k + '">' + k.replace('-', '년 ') + '월</option>';
        }).join('');
      sel.value = patchMonth;
    }
  }
  function renderPatchList() {
    var el = $('patchContent');
    var list = patchMonth === 'all' ? S.patches : S.patches.filter(function (p) { return String(p.date || '').slice(0, 7) === patchMonth; });
    $('monthFilter').style.display = '';
    if (!list.length) { UI.empty(el, { title: '등록된 패치노트가 없습니다.' }); return; }
    /* 페이지네이션 — 10개 이하라도 항상 노출 */
    var totalPages = Math.ceil(list.length / PATCH_PAGE_SIZE);
    if (patchPage > totalPages) patchPage = totalPages;
    if (patchPage < 1) patchPage = 1;
    var pageList = list.slice((patchPage - 1) * PATCH_PAGE_SIZE, patchPage * PATCH_PAGE_SIZE);
    el.innerHTML = '<div class="pn-list">' + pageList.map(function (p) {
      var d = String(p.date || '').split('-');
      return '<div class="pn-row" data-view="' + UI.esc(p.docId) + '" tabindex="0" role="button" aria-label="' + UI.esc(p.title) + '">' +
        '<div class="pn-date"><b>' + UI.esc(d[2] || '') + '</b><small>' + UI.esc((d[0] || '').slice(2) + '.' + (d[1] || '')) + '</small></div>' +
        '<div class="pn-main"><div class="pn-title">' + UI.esc(p.title) + '</div>' +
        '<div class="pn-meta"><span>' + UI.esc(p.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(p.date)) + '</span><span>·</span>' + viewMeta(p.viewCount) + '</div></div>' +
        (UI.isNew(p.date) ? '<span class="lst-new">NEW</span>' : '') +
        '<span class="pn-arrow">›</span></div>';
    }).join('') + '</div>' + pageNavHTML(patchPage, totalPages);
    bindView(el, 'patch');
    bindPageNav(el, function (v) {
      if (v === 'prev') patchPage = Math.max(1, patchPage - 1);
      else if (v === 'next') patchPage = patchPage + 1;
      else patchPage = parseInt(v, 10) || 1;
      renderPatchList();
    });
    UI.watchReveals(el);
  }
  /* 페이지 번호 시퀀스 — 페이지가 많으면 1 … 주변 … 마지막 축약 */
  function pageNums(cur, total) {
    var arr = [];
    if (total <= 7) { for (var i = 1; i <= total; i++) arr.push(i); return arr; }
    arr.push(1);
    if (cur > 3) arr.push('dots');
    for (var j = Math.max(2, cur - 1); j <= Math.min(total - 1, cur + 1); j++) arr.push(j);
    if (cur < total - 2) arr.push('dots');
    arr.push(total);
    return arr;
  }
  function pageNavHTML(cur, totalPages) {
    /* 한 페이지뿐이어도 항상 노출 */
    var chevL = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5l-7 7 7 7"/></svg>';
    var chevR = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 5l7 7-7 7"/></svg>';
    var h = '<nav class="pg-nav" aria-label="페이지 이동">';
    h += '<button class="pg-btn pg-nav-arrow" type="button" data-pg="prev" aria-label="이전 페이지"' + (cur === 1 ? ' disabled' : '') + '>' + chevL + '</button>';
    pageNums(cur, totalPages).forEach(function (n) {
      if (n === 'dots') { h += '<span class="pg-dots" aria-hidden="true">…</span>'; return; }
      h += '<button class="pg-btn' + (n === cur ? ' is-on' : '') + '" type="button" data-pg="' + n + '" aria-label="' + n + ' 페이지로 이동"' + (n === cur ? ' aria-current="page"' : '') + '>' + n + '</button>';
    });
    h += '<button class="pg-btn pg-nav-arrow" type="button" data-pg="next" aria-label="다음 페이지"' + (cur === totalPages ? ' disabled' : '') + '>' + chevR + '</button>';
    return h + '</nav>';
  }
  /* onNav(pageKey) — 'prev' | 'next' | 페이지 번호 문자열 */
  function bindPageNav(root, onNav) {
    root.querySelectorAll('.pg-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.disabled || b.classList.contains('is-on')) return;
        onNav(b.getAttribute('data-pg'));
        /* 목록 상단으로 부드럽게 스크롤 (고정 헤더 고려) */
        var y = root.getBoundingClientRect().top + window.pageYOffset - 90;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
      });
    });
  }
  function renderPatchDetail(id) {
    var p = S.patches.find(function (x) { return x.docId === id; });
    var el = $('patchContent');
    $('monthFilter').style.display = 'none';
    if (!p) { UI.empty(el, { title: '패치노트를 찾을 수 없습니다.', btnText: '목록으로', btnHref: UI.pageUrl('Community.html#patch') }); return; }
    el.innerHTML =
      '<button class="detail-back" type="button" data-back="patch">' + UI.IC.back + ' 패치노트 목록</button>' +
      '<article class="detail"><div class="detail-head"><div class="detail-head-main">' +
      '<span class="badge badge--patch">패치노트</span>' +
      '<h2 class="detail-title">' + UI.esc(p.title) + '</h2></div>' +
      '<div class="detail-meta"><span>' + UI.esc(p.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(p.date)) + '</span><span>·</span>' + viewMeta(p.viewCount) + '</div></div>' +
      '<div class="detail-body">' + UI.renderContent(p.content) + '</div>' +
      actionRow('patch', p.docId, p.title) + '</article>' +
      '<div class="box detail-list-box"><div class="box-head"><h2 class="box-title">패치노트</h2>' +
      '<button class="box-go" type="button" data-back="patch">목록으로</button></div>' +
      '<div class="box-body"><ul class="lst">' + S.patches.slice(0, 6).map(function (x) {
        return listRow({ id: x.docId, badgeHTML: '<span class="badge badge--patch">패치노트</span>', title: x.title, author: x.author, date: x.date, viewCount: x.viewCount });
      }).join('') + '</ul></div></div>';
    bindDetail(el, p, 'patch');
    bindView(el, 'patch');
    trackView('patch', p, el);
    el.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { location.hash = '#patch'; }); });
    guardImages(el);
  }

  /* ================= 좋아요/공유 ================= */
  function likeKey(type, id) { return type + '_' + id; }
  function likeState(type, id, fallbackCount) {
    var key = likeKey(type, id);
    var uid = UI.currentUser() && UI.currentUser().uid;
    if (type === 'board') {
      var b = S.boards.find(function (x) { return x.docId === id; });
      likedCache[key] = !!(uid && b && b.likedBy && b.likedBy.indexOf(uid) > -1);
      return Promise.resolve(b ? b.likeCount : 0);
    }
    return FB.getLikeDoc(type, id).then(function (d) {
      likedCache[key] = !!(uid && d && d.likedBy && d.likedBy.indexOf(uid) > -1);
      return d ? d.likeCount : (fallbackCount || 0);
    }).catch(function () { likedCache[key] = false; return fallbackCount || 0; });
  }
  function actionRow(type, id) {
    return '<div class="detail-actions">' +
      '<button class="act-btn act-like" type="button" aria-pressed="false">' +
      '<svg viewBox="0 0 24 24"><path d="M12 20.4l-7.2-7A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 7.2 6.8z"/></svg>' +
      '<span>좋아요</span> <b class="like-n">…</b></button>' +
      '<button class="act-btn act-share" type="button" aria-label="공유하기">' +
      '<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><path d="M8.4 10.8l6.8-4M8.4 13.2l6.8 4"/></svg>' +
      '<span>공유하기</span></button></div>';
  }
  function bindDetail(el, item, type) {
    var key = likeKey(type, item.docId);
    var likeBtn = el.querySelector('.act-like');
    var likeN = el.querySelector('.like-n');
    function paint(count) {
      likeN.textContent = count;
      var on = !!likedCache[key];
      likeBtn.classList.toggle('on', on);
      likeBtn.setAttribute('aria-pressed', String(on));
    }
    likeState(type, item.docId, item.likeCount).then(paint);
    likeBtn.addEventListener('click', function () {
      var u = UI.currentUser();
      if (!u) { UI.toast('로그인 후 이용할 수 있습니다.'); setTimeout(function () { location.href = UI.pageUrl('Login.html'); }, 700); return; }
      var nowLiked = !!likedCache[key];
      var pr = type === 'board'
        ? FB.toggleBoardLike(item.docId, u.uid, nowLiked)
        : FB.toggleGenericLike(type, item.docId, u.uid);
      pr.then(function (newLiked) {
        likedCache[key] = newLiked;
        var cur = parseInt(likeN.textContent, 10) || 0;
        paint(cur + (newLiked ? 1 : -1));
        if (type === 'board') item.likeCount = cur + (newLiked ? 1 : -1);
        FB.bumpUserLikeCount(u.uid, newLiked ? 1 : -1);
      }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); });
    });
    el.querySelector('.act-share').addEventListener('click', function () {
      UI.share(item.title, location.href);
    });
  }
  function guardImages(root) {
    root.querySelectorAll('.detail-body img').forEach(function (im) { im.onerror = function () { im.style.display = 'none'; }; });
  }

  /* ================= 댓글 ================= */
  function commentSection() {
    return '<section class="comment-sec" id="cmtSec"><h3 class="comment-head">댓글 <em id="cmtCnt"></em></h3>' +
      '<div id="cmtWrite"></div><div id="cmtList"></div></section>';
  }
  function renderComments(type, id) {
    var write = $('cmtWrite');
    var listEl = $('cmtList');
    var u = UI.currentUser();
    if (!u) {
      write.innerHTML = '<div class="cmt-login"><span>댓글은 로그인 후 작성할 수 있습니다.</span><a class="btn btn--gold btn--sm" href="' + UI.pageUrl('Login.html') + '">로그인</a></div>';
    } else {
      var ud = UI.userDoc() || {};
      write.innerHTML = '<div class="comment-write"><span class="c-avatar"><img src="' + UI.esc(UI.avatarOf(ud.profileIcon)) + '" alt="내 프로필"></span>' +
        '<div class="comment-input"><textarea id="cmtText" maxlength="500" placeholder="커뮤니티 규칙을 지키는 건강한 댓글을 남겨주세요." aria-label="댓글 작성"></textarea>' +
        '<button class="btn btn--gold btn--sm" id="cmtSubmit" type="button">댓글 등록</button></div></div>';
      write.querySelector('#cmtSubmit').addEventListener('click', function () {
        var ta = write.querySelector('#cmtText');
        var v = ta.value.trim();
        if (!v) { UI.toast('댓글 내용을 입력해 주세요.', 'err'); return; }
        FB.addComment(type, id, v, u, ud).then(function () {
          ta.value = '';
          UI.toast('댓글이 등록되었습니다.', 'ok');
          FB.bumpUserCommentCount(u.uid, 1);
          renderComments(type, id);
        }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); });
      });
    }
    FB.getComments(type, id).then(function (cmts) {
      $('cmtCnt').textContent = cmts.length ? cmts.length + '개' : '';
      if (!cmts.length) { listEl.innerHTML = '<div class="empty" style="padding:22px 10px"><p>첫 댓글을 남겨보세요.</p></div>'; return; }
      listEl.innerHTML = cmts.map(function (c) {
        var mine = u && c.uid === u.uid;
        return '<div class="cmt"><span class="cmt-av"><img src="' + UI.esc(UI.avatarOf(c.authorIcon)) + '" alt=""></span>' +
          '<div class="cmt-main"><div class="cmt-top"><b>' + UI.esc(c.authorName || '선원') + '</b>' +
          '<time>' + UI.esc(UI.fmtDate(c.createdAt ? FB.dateKey(c.createdAt) : c.createdAt)) + '</time>' +
          (mine ? '<button class="cmt-del" type="button" data-del="' + UI.esc(c.docId) + '">삭제</button>' : '') + '</div>' +
          '<p class="cmt-txt">' + UI.esc(c.text) + '</p></div></div>';
      }).join('');
      listEl.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          FB.deleteComment(type, b.getAttribute('data-del')).then(function () {
            UI.toast('댓글이 삭제되었습니다.');
            renderComments(type, id);
          }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); });
        });
      });
    }).catch(function (e) {
      listEl.innerHTML = '';
      UI.empty(listEl, { title: '댓글을 불러오지 못했습니다.', desc: FB.errMsg(e) });
    });
  }

  /* ================= 게시판 ================= */
  var B = { cat: 'all', view: 'list', sort: 'new' };
  var boardPage = 1;
  var BOARD_PAGE_SIZE = 10;
  function sortItems(list, sort) {
    var arr = list.slice();
    if (sort === 'like') arr.sort(function (a, b) { return (b.likeCount || 0) - (a.likeCount || 0); });
    else if (sort === 'old') arr.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    else arr.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
    return arr;
  }
  function boardListFiltered() {
    var list = B.cat === 'all' ? S.boards : S.boards.filter(function (b) { return b.category === B.cat; });
    return sortItems(list, B.sort);
  }
  function renderBoardList() {
    var el = $('boardContent');
    $('boardToolbar').style.display = '';
    var wt = document.querySelector('#view-board .write-toolbar');
    if (wt) wt.style.display = '';
    var list = boardListFiltered();
    if (!list.length) { UI.empty(el, { title: '게시글이 없습니다.', desc: B.cat === 'all' ? '첫 게시글의 주인공이 되어보세요.' : '\'' + B.cat + '\' 카테고리에 글이 없습니다.' }); return; }
    /* 페이지네이션 — 10개 이하라도 항상 노출 */
    var totalPages = Math.ceil(list.length / BOARD_PAGE_SIZE);
    if (boardPage > totalPages) boardPage = totalPages;
    if (boardPage < 1) boardPage = 1;
    var pageList = list.slice((boardPage - 1) * BOARD_PAGE_SIZE, boardPage * BOARD_PAGE_SIZE);
    if (B.view === 'card') {
      el.innerHTML = '<div class="cards cards--board">' + pageList.map(function (b) {
        return cardHTML({ id: b.docId, badgeHTML: catBadge(b.category), title: b.title, author: b.author, date: b.date, image: b.images && b.images[0], likeCount: b.likeCount, commentCount: b.commentCount, viewCount: b.viewCount });
      }).join('') + '</div>' + pageNavHTML(boardPage, totalPages);
    } else {
      el.innerHTML = '<div class="pn-list"><ul class="lst">' + pageList.map(function (b) {
        return listRow({ id: b.docId, badgeHTML: catBadge(b.category), title: b.title, author: b.author, date: b.date, ts: b.ts, viewCount: b.viewCount });
      }).join('') + '</ul></div>' + pageNavHTML(boardPage, totalPages);
    }
    bindView(el, 'board');
    bindPageNav(el, function (v) {
      if (v === 'prev') boardPage = Math.max(1, boardPage - 1);
      else if (v === 'next') boardPage = boardPage + 1;
      else boardPage = parseInt(v, 10) || 1;
      renderBoardList();
    });
    UI.watchReveals(el);
  }
  function renderBoardDetail(id) {
    var b = S.boards.find(function (x) { return x.docId === id; });
    var el = $('boardContent');
    $('boardToolbar').style.display = 'none';
    var wt = document.querySelector('#view-board .write-toolbar');
    if (wt) wt.style.display = 'none';
    if (!b) { UI.empty(el, { title: '게시글을 찾을 수 없습니다.', btnText: '게시판으로', btnHref: UI.pageUrl('Community.html#board') }); return; }
    
    /* 작성자 확인 — 편집/삭제 버튼 표시 여부 결정 */
    var u = UI.currentUser();
    var isOwner = u && (b.authorId === u.uid || b.uid === u.uid || b.author === u.displayName);
    var editDeleteHTML = isOwner ? 
      '<div class="detail-menu">' +
        '<button class="detail-menu-toggle" type="button" aria-label="게시글 메뉴" aria-expanded="false" aria-controls="board-menu-' + UI.esc(b.docId) + '">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="12" cy="19" r="1.7"/></svg>' +
        '</button>' +
        '<div class="detail-menu-popover" id="board-menu-' + UI.esc(b.docId) + '" hidden>' +
          '<button class="detail-menu-item" type="button" data-edit="' + UI.esc(b.docId) + '">' + UI.IC.edit + '<span>수정</span></button>' +
          '<button class="detail-menu-item detail-menu-item--danger" type="button" data-del="' + UI.esc(b.docId) + '">' + UI.IC.trash + '<span>삭제</span></button>' +
        '</div>' +
      '</div>' : '';
    
    var bodyImages = (b.images || []).map(function (src) { return '<img src="' + UI.esc(src) + '" alt="" loading="lazy">'; }).join('');
    el.innerHTML =
      '<button class="detail-back" type="button" data-back="board">' + UI.IC.back + ' 게시판 목록</button>' +
      '<article class="detail"><div class="detail-head"><div class="detail-head-main">' + catBadge(b.category) +
      '<h2 class="detail-title">' + UI.esc(b.title) + '</h2>' +
      editDeleteHTML + '</div>' +
      '<div class="detail-meta"><span>' + UI.esc(b.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(b.date)) + '</span><span>·</span>' + viewMeta(b.viewCount) +
      (b.commentCount ? '<span>·</span><span>댓글 ' + b.commentCount + '</span>' : '') + '</div></div>' +
      '<div class="detail-body">' + UI.renderContent(b.content || b.text) + bodyImages + '</div>' +
      actionRow('board', b.docId, b.title) + '</article>' +
      commentSection() +
      '<div class="box detail-list-box"><div class="box-head"><h2 class="box-title">게시판</h2>' +
      '<button class="box-go" type="button" data-back="board">목록으로</button></div>' +
      '<div class="box-body"><ul class="lst">' + boardListFiltered().slice(0, 6).map(function (x) {
        return listRow({ id: x.docId, badgeHTML: catBadge(x.category), title: x.title, author: x.author, date: x.date, viewCount: x.viewCount });
      }).join('') + '</ul></div></div>';
    bindDetail(el, b, 'board');
    bindView(el, 'board');
    trackView('board', b, el);
    el.querySelectorAll('[data-back]').forEach(function (x) { x.addEventListener('click', function () { location.hash = '#board'; }); });
    
    /* 편집/삭제 버튼 이벤트 바인딩 */
    if (isOwner) {
      var menu = el.querySelector('.detail-menu');
      var menuToggle = menu.querySelector('.detail-menu-toggle');
      var menuPanel = menu.querySelector('.detail-menu-popover');
      menuToggle.addEventListener('click', function (event) {
        event.stopPropagation();
        var open = menuPanel.hidden;
        menuPanel.hidden = !open;
        menuToggle.setAttribute('aria-expanded', String(open));
      });
      el.querySelector('[data-edit]').addEventListener('click', function () {
        showEditForm(b);
      });
      el.querySelector('[data-del]').addEventListener('click', function () {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        FB.deleteBoard(b.docId).then(function () {
          UI.toast('게시글이 삭제되었습니다.', 'ok');
          location.hash = '#board';
        }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); });
      });
    }
    
    renderComments('board', b.docId);
    guardImages(el);
  }

  /* ================= 게시판 수정 기능 ================= */
  function showEditForm(b) {
    var el = $('boardContent');
    var u = UI.currentUser();
    if (!u) { UI.toast('로그인이 필요합니다.', 'err'); return; }
    
    el.innerHTML =
      '<button class="detail-back" type="button" data-cancel-edit="board">' +
        UI.IC.back + ' 취소</button>' +
      '<article class="detail"><div class="detail-head">' +
        '<h2 class="detail-title">게시글 수정</h2></div>' +
      '<div class="detail-form-group">' +
        '<label class="detail-form-label">제목</label>' +
        '<input class="detail-input" id="editTitle" type="text" value="' +
          UI.esc(b.title) + '" maxlength="100" />' +
      '</div>' +
      '<div class="detail-form-group">' +
        '<label class="detail-form-label">내용</label>' +
        '<textarea class="detail-textarea" id="editContent" maxlength="5000">' +
          UI.esc(b.content || b.text) + '</textarea>' +
      '</div>' +
      '<div class="detail-actions" style="margin-top:20px;text-align:right">' +
        '<button class="btn btn--ghost btn--sm" type="button" id="cancelEditBtn">취소</button>' +
        '<button class="btn btn--gold btn--sm" type="button" id="saveEditBtn">저장</button>' +
      '</div></article>';
    el.querySelector('[data-cancel-edit]').addEventListener('click', function () {
      renderBoardDetail(b.docId);
    });
    el.querySelector('#cancelEditBtn').addEventListener('click', function () {
      renderBoardDetail(b.docId);
    });
    el.querySelector('#saveEditBtn').addEventListener('click', function () {
      saveEdit(b, u);
    });
  }

  function saveEdit(b, u) {
    var title = $('editTitle').value.trim();
    var content = $('editContent').value.trim();
    if (!title) { UI.toast('제목을 입력해 주세요.', 'err'); return; }
    if (!content) { UI.toast('내용을 입력해 주세요.', 'err'); return; }
    
    FB.updateBoard(b.docId, title, content).then(function () {
      UI.toast('게시글이 수정되었습니다.', 'ok');
      S.boards = S.boards.map(function (x) {
        if (x.docId === b.docId) {
          return Object.assign({}, x, { title: title, content: content, date: new Date().toISOString().slice(0, 10) });
        }
        return x;
      });
      renderBoardDetail(b.docId);
    }).catch(function (e) { UI.toast(FB.errMsg(e), 'err'); });
  }

  /* ================= 이벤트 ================= */
  var E = { cat: 'all', view: 'card', sort: 'new' };
  var eventPage = 1;
  var EVENT_PAGE_SIZE = 10;
  function eventListFiltered() {
    var list = E.cat === 'all' ? S.events : S.events.filter(function (e) { return e.status === E.cat; });
    return sortItems(list, E.sort);
  }
  function evPeriod(e) {
    if (e.startDate || e.endDate) return UI.esc(UI.fmtDate(e.startDate) + (e.endDate ? ' ~ ' + UI.fmtDate(e.endDate) : ''));
    return '';
  }
  function renderEventList() {
    var el = $('eventContent');
    $('eventToolbar').style.display = '';
    var list = eventListFiltered();
    if (!list.length) {
      UI.empty(el, { title: E.cat === 'ing' ? '진행 중인 이벤트가 없습니다.' : E.cat === 'end' ? '종료된 이벤트가 없습니다.' : '이벤트가 없습니다.' });
      return;
    }
    /* 페이지네이션 — 10개 이하라도 항상 노출 */
    var totalPages = Math.ceil(list.length / EVENT_PAGE_SIZE);
    if (eventPage > totalPages) eventPage = totalPages;
    if (eventPage < 1) eventPage = 1;
    var pageList = list.slice((eventPage - 1) * EVENT_PAGE_SIZE, eventPage * EVENT_PAGE_SIZE);
    if (E.view === 'card') {
      el.innerHTML = '<div class="cards cards--event">' + pageList.map(function (e) {
        return cardHTML({
          id: e.docId,
          badgeHTML: e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>',
          title: e.title, author: e.author, date: e.date, image: e.image, likeCount: e.likeCount, commentCount: e.commentCount, viewCount: e.viewCount,
          period: evPeriod(e)
        });
      }).join('') + '</div>' + pageNavHTML(eventPage, totalPages);
    } else {
      el.innerHTML = '<div class="pn-list"><ul class="lst">' + pageList.map(function (e) {
        return listRow({ id: e.docId, badgeHTML: e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>', title: e.title, author: e.author, date: e.date, ts: e.ts, viewCount: e.viewCount });
      }).join('') + '</ul></div>' + pageNavHTML(eventPage, totalPages);
    }
    bindView(el, 'event');
    bindPageNav(el, function (v) {
      if (v === 'prev') eventPage = Math.max(1, eventPage - 1);
      else if (v === 'next') eventPage = eventPage + 1;
      else eventPage = parseInt(v, 10) || 1;
      renderEventList();
    });
    UI.watchReveals(el);
  }
  function renderEventDetail(id) {
    var e = S.events.find(function (x) { return x.docId === id; });
    var el = $('eventContent');
    $('eventToolbar').style.display = 'none';
    if (!e) { UI.empty(el, { title: '이벤트를 찾을 수 없습니다.', btnText: '이벤트 목록으로', btnHref: UI.pageUrl('Community.html#event') }); return; }
    el.innerHTML =
      '<button class="detail-back" type="button" data-back="event">' + UI.IC.back + ' 이벤트 목록</button>' +
      '<article class="detail"><div class="detail-head"><div class="detail-head-main">' +
      (e.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>') +
      '<h2 class="detail-title">' + UI.esc(e.title) + '</h2></div>' +
      '<div class="detail-meta"><span>' + UI.esc(e.author) + '</span><span>·</span><span>' + UI.esc(UI.fmtDate(e.date)) + '</span><span>·</span>' + viewMeta(e.viewCount) +
      (evPeriod(e) ? '<span>·</span><span class="ev-period"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2" stroke-linecap="round"/></svg>' + evPeriod(e) + '</span>' : '') +
      '</div></div>' +
      '<div class="detail-body">' + (e.image ? '<img src="' + UI.esc(e.image) + '" alt="" style="width:100%;border-radius:10px;margin-bottom:14px">' : '') +
      UI.renderContent(e.content) + '</div>' +
      actionRow('event', e.docId, e.title) + '</article>' +
      commentSection() +
      '<div class="box detail-list-box"><div class="box-head"><h2 class="box-title">이벤트</h2>' +
      '<button class="box-go" type="button" data-back="event">목록으로</button></div>' +
      '<div class="box-body"><ul class="lst">' + eventListFiltered().slice(0, 6).map(function (x) {
        return listRow({ id: x.docId, badgeHTML: x.status === 'ing' ? '<span class="badge badge--ing">진행중</span>' : '<span class="badge badge--end">종료됨</span>', title: x.title, author: x.author, date: x.date, viewCount: x.viewCount });
      }).join('') + '</ul></div></div>';
    bindDetail(el, e, 'event');
    bindView(el, 'event');
    trackView('event', e, el);
    el.querySelectorAll('[data-back]').forEach(function (x) { x.addEventListener('click', function () { location.hash = '#event'; }); });
    renderComments('event', e.docId);
    guardImages(el);
  }

  /* ================= 라우팅 ================= */
  var PAGE_VIEWS = { home: 'view-comhome', patch: 'view-patch', board: 'view-board', event: 'view-event' };
  function showPage(name) {
    Object.keys(PAGE_VIEWS).forEach(function (k) { $(PAGE_VIEWS[k]).hidden = k !== name; });
  }
  function parseHash() {
    var h = location.hash.replace(/^#/, '') || 'home';
    var parts = h.split('/');
    return { page: parts[0], mode: parts[1] || 'list', id: parts[2] || null };
  }
  function route() {
    var r = parseHash();
    if (!PAGE_VIEWS[r.page]) r.page = 'home';
    if (!S.loaded) {
      showPage('patch');
      return;
    }
    if (r.page === 'patch' && !S.visibility.boards && !S.visibility.events) {
      location.href = UI.pageUrl('Main.html' + location.hash);
      return;
    }
    if ((r.page === 'board' && !S.visibility.boards) || (r.page === 'event' && !S.visibility.events)) {
      location.hash = '#patch';
      return;
    }
    showPage(r.page);
    UI.setActiveNav(r.page === 'home' ? 'comhome' : r.page);
    window.scrollTo({ top: 0 });
    if (r.page === 'home') { renderComHome(); return; }
    if (r.page === 'patch') {
      if (r.mode === 'view' && r.id) renderPatchDetail(r.id);
      else { renderMonthFilter(); renderPatchList(); }
      return;
    }
    if (r.page === 'board') {
      if (r.mode === 'view' && r.id) renderBoardDetail(r.id);
      else renderBoardList();
      return;
    }
    if (r.page === 'event') {
      if (r.mode === 'view' && r.id) renderEventDetail(r.id);
      else renderEventList();
      return;
    }
  }

  /* ================= 글쓰기 ================= */
  function openBoardWrite() {
    var u = UI.currentUser();
    if (!u) {
      UI.toast('로그인 후 글을 작성할 수 있습니다.', 'err');
      setTimeout(function () { location.href = UI.pageUrl('Login.html'); }, 700);
      return;
    }
    var ud = UI.userDoc() || {};
    var cats = ['자유', '정보', '질문', '자랑'];
    var defCat = (B.cat && B.cat !== 'all') ? B.cat : '자유';
    var m = UI.openModal({
      cls: 'write-modal',
      title: '새 글 작성',
      body:
        '<div class="wm-field"><label class="wm-label" for="wmCat">카테고리</label>' +
        '<select id="wmCat">' + cats.map(function (c) {
          return '<option value="' + c + '"' + (c === defCat ? ' selected' : '') + '>' + c + '</option>';
        }).join('') + '</select></div>' +
        '<div class="wm-field"><label class="wm-label" for="wmTitle">제목</label>' +
        '<input id="wmTitle" type="text" maxlength="60" placeholder="제목을 입력해 주세요. (최대 60자)" /></div>' +
        '<div class="wm-field"><label class="wm-label" for="wmContent">내용</label>' +
        '<textarea id="wmContent" maxlength="2000" placeholder="커뮤니티 규칙을 지키는 건강한 글을 남겨주세요."></textarea>' +
        '<div class="wm-count" id="wmCount">0 / 2000</div></div>' +
        '<div class="wm-foot"><button class="btn btn--ghost" id="wmCancel" type="button">취소</button>' +
        '<button class="write-btn" id="wmSubmit" type="button">등록하기</button></div>'
    });
    var ta = m.body.querySelector('#wmContent');
    var cnt = m.body.querySelector('#wmCount');
    ta.addEventListener('input', function () { cnt.textContent = ta.value.length + ' / 2000'; });
    m.body.querySelector('#wmCancel').addEventListener('click', m.close);
    m.body.querySelector('#wmSubmit').addEventListener('click', function () {
      var title = m.body.querySelector('#wmTitle').value.trim();
      var content = ta.value.trim();
      if (!title) { UI.toast('제목을 입력해 주세요.', 'err'); m.body.querySelector('#wmTitle').focus(); return; }
      if (!content) { UI.toast('내용을 입력해 주세요.', 'err'); ta.focus(); return; }
      var btn = m.body.querySelector('#wmSubmit');
      btn.disabled = true; btn.textContent = '등록 중…';
      FB.addBoard({ title: title, content: content, category: m.body.querySelector('#wmCat').value }, u, ud)
        .then(function (res) {
          m.close();
          var now = new Date();
          var rec = {
            docId: res.docId,
            title: title,
            author: ud.nickname || '선원',
            date: now.toISOString().slice(0, 10),
            ts: Math.floor(now.getTime() / 1000),
            category: m.body.querySelector('#wmCat').value,
            content: content,
            images: [],
            authorId: u.uid,
            uid: u.uid,
            likedBy: [],
            likeCount: 0,
            commentCount: 0,
            viewCount: 0
          };
          /* 원격 저장에 성공했으면 새로고침 시 서버 목록에 포함됨 — 로컬 중복 방지 */
          if (res.remote) {
            S.boards = S.boards.filter(function (b) { return b.docId !== rec.docId; });
          }
          S.boards.unshift(rec);
          B.cat = 'all';
          document.querySelectorAll('#boardCats .chip').forEach(function (x) {
            x.classList.toggle('is-on', x.getAttribute('data-cat') === 'all');
          });
          boardPage = 1; /* 새 글이 맨 앞에 오도록 첫 페이지로 */
          renderBoardList();
          UI.toast(res.remote ? '게시글이 등록되었습니다.' : '임시 저장되었습니다. (서버 연결 실패)', res.remote ? 'ok' : 'err');
        })
        .catch(function (e) {
          btn.disabled = false; btn.textContent = '등록하기';
          UI.toast(FB.errMsg(e) + ' — 등록에 실패했습니다.', 'err');
        });
    });
  }

  /* ================= 툴바 ================= */
  function bindToolbars() {
    document.querySelectorAll('#boardCats .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        B.cat = c.getAttribute('data-cat');
        boardPage = 1; /* 조건이 바뀌면 첫 페이지로 */
        document.querySelectorAll('#boardCats .chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderBoardList();
      });
    });
    document.querySelectorAll('#boardToolbar .seg-btn').forEach(function (c) {
      c.addEventListener('click', function () {
        B.view = c.getAttribute('data-view');
        boardPage = 1;
        document.querySelectorAll('#boardToolbar .seg-btn').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderBoardList();
      });
    });
    $('boardSort').addEventListener('change', function (e) { B.sort = e.target.value; boardPage = 1; renderBoardList(); });
    var wb = $('boardWriteBtn');
    if (wb) wb.addEventListener('click', openBoardWrite);

    document.querySelectorAll('#eventCats .chip').forEach(function (c) {
      c.addEventListener('click', function () {
        E.cat = c.getAttribute('data-cat');
        eventPage = 1; /* 조건이 바뀌면 첫 페이지로 */
        document.querySelectorAll('#eventCats .chip').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderEventList();
      });
    });
    document.querySelectorAll('#eventToolbar .seg-btn').forEach(function (c) {
      c.addEventListener('click', function () {
        E.view = c.getAttribute('data-view');
        eventPage = 1;
        document.querySelectorAll('#eventToolbar .seg-btn').forEach(function (x) { x.classList.toggle('is-on', x === c); });
        renderEventList();
      });
    });
    $('eventSort').addEventListener('change', function (e) { E.sort = e.target.value; eventPage = 1; renderEventList(); });
    /* 모바일 월별 드롭다운 */
    var ms = $('monthSelect');
    if (ms) ms.addEventListener('change', function (e) {
      patchMonth = e.target.value;
      patchPage = 1; /* 월이 바뀌면 첫 페이지로 */
      renderMonthFilter();
      renderPatchList();
    });
  }

  /* ================= 부팅 ================= */
  function start() {
    bindToolbars();
    UI.skelRows($('comPatchList'), 4);
    UI.skelRows($('comBoardList'), 4);
    UI.skelRows($('comEventList'), 3);
    UI.skelRows($('patchContent'), 5);
    UI.skelRows($('boardContent'), 5);
    UI.skelCards($('eventContent'), 3);

    route();
    loadAll().then(function () {
      try {
        /* 페이지 전용 배너 — 패치노트/게시판/이벤트 각각 고유 배너 */
        UI.fillPageBanner($('commBannerMedia'), 'community', S.banners);
        UI.fillPageBanner($('patchBannerMedia'), 'patch', S.banners);
        UI.fillPageBanner($('boardBannerMedia'), 'board', S.banners);
        UI.fillPageBanner($('eventBannerMedia'), 'event', S.banners);
        route();
      } catch (re) {
        console.error('[FPP] 렌더링 오류:', re);
        UI.toast('화면을 그리는 중 오류가 발생했습니다. 콘솔을 확인해 주세요.', 'err');
      }
    }).catch(function (e) {
      console.error('[FPP] 데이터 로드 실패:', e);
      UI.toast(FB.errMsg(e) + ' — 데이터를 불러오지 못했습니다.', 'err');
      ['comPatchList', 'comBoardList', 'comEventList', 'patchContent', 'boardContent', 'eventContent'].forEach(function (id) {
        UI.empty($(id), { title: '데이터를 불러오지 못했습니다.', desc: '네트워크 또는 Firebase 연결을 확인해 주세요.' });
      });
    });
    window.addEventListener('hashchange', route);
    document.addEventListener('fpp:community-visibility', function (event) {
      S.visibility = event.detail || { boards: true, events: true };
      if (S.loaded) route();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
