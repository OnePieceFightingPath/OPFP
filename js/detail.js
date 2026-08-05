// ===== DETAIL PAGE (detail.html) =====
// URL: ?type=patchnote&id=N  |  ?type=event&id=X

'use strict';

/* ── 유틸 ── */

function _dFmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function _dIsActive(evt) {
  if (!evt.endDate) return true;
  const end = evt.endDate.toDate ? evt.endDate.toDate() : new Date(evt.endDate);
  return end >= new Date();
}

function _dFmtPatchDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return d ? `${y}.${m}.${d}` : (m ? `${y}.${m}` : y);
}

/* ── HTML 정화 (패치노트용) ── */
function _dSanitizeHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // style·base 태그도 XSS 벡터 → 제거
  tmp.querySelectorAll('script,iframe,object,embed,form,meta,link,style,base').forEach(el => el.remove());
  tmp.querySelectorAll('*').forEach(el => {
    [
        'onclick','ondblclick','onerror','onload','onunload','onbeforeunload',
        'onmouseover','onmouseout','onmousedown','onmouseup','onmousemove',
        'onfocus','onblur','oninput','onchange','onkeydown','onkeyup','onkeypress',
        'onsubmit','onreset','onselect','oncontextmenu','onwheel',
        'ondrag','ondragstart','ondragend','ondrop','ondragover','ondragenter','ondragleave',
        'onpaste','oncopy','oncut','onanimationstart','onanimationend','ontransitionend',
        'onpointerdown','onpointerup','onpointermove','onpointercancel',
        'ontouchstart','ontouchend','ontouchmove'
      ].forEach(a => el.removeAttribute(a));
    // style 속성 — CSS expression/url() 등 CSS 기반 공격 방지
    el.removeAttribute('style');
    const href = el.getAttribute('href') || '';
    if (href && !/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:')) {
      el.removeAttribute('href');
    }
    if (el.tagName === 'A') {
      el.setAttribute('rel', 'noopener noreferrer');
      if (!el.getAttribute('target')) el.setAttribute('target', '_blank');
    }
  });
  return tmp.innerHTML;
}

/* ── 로그인 필요 팝업 (좋아요) ── */
document.addEventListener('DOMContentLoaded', function _initLikeLoginPopup() {
  const overlay  = document.getElementById('likeLoginOverlay');
  const closeBtn = document.getElementById('likeLoginClose');
  const goBtn    = document.getElementById('likeLoginGoBtn');
  if (!overlay) return;

  function _close() { overlay.classList.remove('open'); }

  closeBtn?.addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
  goBtn?.addEventListener('click', () => {
    _close();
    if (typeof openLoginModal === 'function') openLoginModal('login');
  });
});

function _showLikeLoginPopup() {
  document.getElementById('likeLoginOverlay')?.classList.add('open');
}

/* ── 로그인 안내 팝업 (대댓글 작성) ── */
document.addEventListener('DOMContentLoaded', function _initReplyLoginPopup() {
  const overlay  = document.getElementById('replyLoginOverlay');
  const closeBtn = document.getElementById('replyLoginClose');
  const goBtn    = document.getElementById('replyLoginGoBtn');
  if (!overlay) return;

  function _close() { overlay.classList.remove('open'); }

  closeBtn?.addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
  goBtn?.addEventListener('click', () => {
    _close();
    if (typeof openLoginModal === 'function') openLoginModal('login');
    else document.getElementById('loginModalOverlay')?.classList.add('open');
  });
});

function _showReplyLoginPopup() {
  document.getElementById('replyLoginOverlay')?.classList.add('open');
}

/* ── 말머리 선택 안내 팝업 ── */
document.addEventListener('DOMContentLoaded', function _initPrefixAlertPopup() {
  const overlay    = document.getElementById('prefixAlertOverlay');
  const closeBtn   = document.getElementById('prefixAlertClose');
  const confirmBtn = document.getElementById('prefixAlertConfirmBtn');
  if (!overlay) return;

  function _close() { overlay.classList.remove('open'); }

  closeBtn?.addEventListener('click', _close);
  confirmBtn?.addEventListener('click', _close);
  overlay.addEventListener('click', e => { if (e.target === overlay) _close(); });
});

function _showPrefixAlertPopup() {
  const el = document.getElementById('prefixAlertOverlay');
  if (!el) return;
  el.style.zIndex = '9100';
  el.classList.add('open');
}

/* ── URL 입력 프롬프트 (prompt() 대체) ── */
function _showUrlPrompt(title, placeholder, defaultVal) {
  return new Promise(function(resolve) {
    var overlay    = document.getElementById('urlInputOverlay');
    var titleEl    = document.getElementById('urlInputTitle');
    var inputEl    = document.getElementById('urlInputField');
    var confirmBtn = document.getElementById('urlInputConfirm');
    var cancelBtn  = document.getElementById('urlInputCancel');
    var closeBtn   = document.getElementById('urlInputClose');
    if (!overlay || !inputEl) { resolve(window.prompt(title, defaultVal)); return; }

    if (titleEl)  titleEl.textContent = title      || 'URL을 입력하세요';
    inputEl.placeholder               = placeholder || 'https://';
    inputEl.value                     = defaultVal  || '';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function() { inputEl.focus(); inputEl.select(); }, 80);

    function finish(val) {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click',  onCancel);
      if (closeBtn) closeBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click',    onOverlay);
      inputEl.removeEventListener('keydown',  onKey);
      resolve(val);
    }
    function onConfirm()  { finish(inputEl.value.trim() || null); }
    function onCancel()   { finish(null); }
    function onOverlay(e) { if (e.target === overlay) finish(null); }
    function onKey(e)     { if (e.key === 'Enter') { e.preventDefault(); finish(inputEl.value.trim() || null); } else if (e.key === 'Escape') finish(null); }

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click',  onCancel);
    if (closeBtn) closeBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click',    onOverlay);
    inputEl.addEventListener('keydown',  onKey);
  });
}

/* ── 좋아요 초기화 ── */
async function _initLikeBtn(type, id, btnEl, countEl) {
  if (!btnEl || !countEl) return;
  const likeKey = `liked_${type}_${id}`;
  const docId   = `${type}_${String(id)}`;
  const likeRef = db.collection('likes').doc(docId);

  let count = 0;
  try {
    const snap = await likeRef.get();
    count = snap.exists ? (snap.data().count || 0) : 0;
  } catch(e) {}

  let liked = localStorage.getItem(likeKey) === '1';

  function _renderLike() {
    countEl.textContent = count;
    btnEl.classList.toggle('liked', liked);
  }
  _renderLike();

  btnEl.addEventListener('click', async () => {
    // 비로그인 사용자 — 로그인 안내 팝업 노출
    if (typeof currentUser === 'undefined' || !currentUser) {
      _showLikeLoginPopup();
      return;
    }

    const delta = liked ? -1 : 1;
    liked = !liked;
    count = Math.max(0, count + delta);
    if (liked) localStorage.setItem(likeKey, '1');
    else        localStorage.removeItem(likeKey);
    _renderLike();
    try {
      await likeRef.set(
        { count: firebase.firestore.FieldValue.increment(delta) },
        { merge: true }
      );
    } catch(e) {}
  });
}

/* ── 패치노트 상세 렌더링 ── */
function _renderPatchDetail(id) {
  const allNotes = (typeof PATCH_NOTES !== 'undefined') ? PATCH_NOTES : [];
  const patch    = allNotes.find(p => String(p.id) === String(id));
  const main     = document.getElementById('detailMain');

  if (!patch || !main) {
    if (main) main.innerHTML = '<div style="padding:60px 16px;text-align:center;color:var(--text-muted)">패치노트를 찾을 수 없습니다.</div>';
    return;
  }

  document.title = `${patch.title} — Fighting Path Patch`;

  const idx   = allNotes.findIndex(p => String(p.id) === String(id));
  const older = allNotes[idx + 1];
  const newer = allNotes[idx - 1];
  const isNew = idx === 0;

  main.innerHTML = `
    <div style="padding-bottom:80px">

      <button class="evt-detail-back-btn" id="patchBackBtn">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        패치노트 목록으로
      </button>

      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px 24px;margin-top:8px">

      <div class="evt-detail-header">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;flex:1;min-width:0">
            ${isNew ? `<span class="evt-detail-status-badge active" style="flex-shrink:0">NEW</span>` : ''}
            <h1 class="evt-detail-title" style="margin:0;flex:1;min-width:0">${escHtml(patch.title)}</h1>
          </div>
          <div class="board-detail-more-wrap" style="position:relative;flex-shrink:0">
            <button id="patchDetailMoreBtn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px 6px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center" title="더보기">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
            </button>
            <div class="evt-comment-dropdown board-detail-dropdown" id="patchDetailDropdown" style="display:none;min-width:90px">
              <button class="evt-comment-dropdown-item" id="patchDetailShare">공유</button>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap">
          ${patch.date ? `<div class="evt-detail-period" style="margin-top:0">📅 ${_dFmtPatchDate(patch.date)}</div>` : '<div></div>'}
          <span class="patch-detail-read-count" id="patchDetailReadCount" style="display:none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            <span id="patchDetailReadCountNum">0</span>
          </span>
        </div>
      </div>

      <div class="evt-detail-divider"></div>

      <div class="evt-detail-body">${_dSanitizeHtml(patch.content || '')}</div>

      <div class="detail-like-row">
        <button class="detail-like-btn" id="patchLikeBtn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          <span id="patchLikeCount">—</span>
        </button>
      </div>

      </div><!-- /.bg-card content wrapper -->

      <div class="patch-nav-section">
        <div class="patch-nav-header">
          <span class="patch-nav-header-title">패치노트</span>
          <button class="patch-nav-to-list-btn" id="patchToListBtn">+ 목록</button>
        </div>
        <div class="patch-recent-list" id="detailRecentList"></div>
        <div class="patch-recent-pagination" id="patchRecentPagination"></div>
      </div>

    </div>
  `;

  /* 좋아요 */
  _initLikeBtn('patchnote', id, document.getElementById('patchLikeBtn'), document.getElementById('patchLikeCount'));

  /* 버튼 이벤트 */
  document.getElementById('patchBackBtn')?.addEventListener('click', () => {
    _renderPatchList();
  });
  document.getElementById('patchToListBtn')?.addEventListener('click', () => {
    _renderPatchList();
  });

  /* ⋮ 드롭다운 (패치노트) */
  const _patchMoreBtn = document.getElementById('patchDetailMoreBtn');
  const _patchDropdown = document.getElementById('patchDetailDropdown');
  if (_patchMoreBtn && _patchDropdown) {
    _patchMoreBtn.addEventListener('click', e => {
      e.stopPropagation();
      _patchDropdown.style.display = _patchDropdown.style.display !== 'none' ? 'none' : 'block';
    });
    document.addEventListener('click', function _closePatchDropdown(e) {
      if (!_patchMoreBtn.contains(e.target) && !_patchDropdown.contains(e.target)) {
        _patchDropdown.style.display = 'none';
        document.removeEventListener('click', _closePatchDropdown);
      }
    });
  }
  document.getElementById('patchDetailShare')?.addEventListener('click', () => {
    if (_patchDropdown) _patchDropdown.style.display = 'none';
    const url = location.href.split('?')[0] + '?type=patch&id=' + encodeURIComponent(id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('링크가 복사되었습니다.', 'success'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('링크가 복사되었습니다.', 'success');
    }
  });

  /* 하단 목록 페이지네이션 초기화 */
  _renderPatchRecentPage(allNotes, id, 0);

  window.scrollTo({ top: 0 });
  _trackPatchView(Number(id)).catch(err => console.error('패치 조회수 오류:', err));
}

/* ── 패치노트 하단 목록 페이지네이션 ── */
const _PATCH_RECENT_PAGE_SIZE = 5;

function _renderPatchRecentPage(allNotes, currentId, page) {
  const listEl   = document.getElementById('detailRecentList');
  const paginEl  = document.getElementById('patchRecentPagination');
  if (!listEl) return;

  const total      = allNotes.length;
  const totalPages = Math.ceil(total / _PATCH_RECENT_PAGE_SIZE);
  const start      = page * _PATCH_RECENT_PAGE_SIZE;
  const items      = allNotes.slice(start, start + _PATCH_RECENT_PAGE_SIZE);

  const eyeSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;

  listEl.innerHTML = items.map(p => `
    <div class="patch-recent-item${String(p.id) === String(currentId) ? ' current' : ''}" data-patchid="${escHtml(String(p.id))}">
      <div class="patch-recent-item-title">${escHtml(p.title)}</div>
      <div class="patch-recent-item-meta">
        <span class="patch-recent-item-author">관리자</span>
        <span class="patch-recent-item-date">${_dFmtPatchDate(p.date)}</span>
        <span class="patch-recent-item-views" id="pvrec-${p.id}">${eyeSvg}<span>-</span></span>
      </div>
    </div>
  `).join('');

  /* 클릭 이벤트 */
  listEl.querySelectorAll('.patch-recent-item[data-patchid]:not(.current)').forEach(el => {
    el.addEventListener('click', () => {
      location.href = `detail.html?type=patchnote&id=${el.dataset.patchid}`;
    });
  });

  /* 조회수 로드 */
  try {
    const ids = items.map(p => String(p.id));
    Promise.all(ids.map(rid => db.collection('patchViews').doc(rid).get())).then(snaps => {
      snaps.forEach((snap, i) => {
        const numEl = document.querySelector(`#pvrec-${ids[i]} span`);
        if (numEl) numEl.textContent = snap.exists ? (snap.data().count || 0).toLocaleString() : '0';
      });
    }).catch(() => {});
  } catch {}

  /* 페이지네이션 버튼 */
  if (!paginEl) return;
  if (totalPages <= 1) { paginEl.innerHTML = ''; return; }

  paginEl.innerHTML = '';
  for (let i = 0; i < totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = 'patch-pagin-btn' + (i === page ? ' active' : '');
    btn.textContent = i + 1;
    btn.addEventListener('click', () => _renderPatchRecentPage(allNotes, currentId, i));
    paginEl.appendChild(btn);
  }
}

/* ── 패치노트 조회수 ── */
function _dSimpleHash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

async function _trackPatchView(id) {
  const countEl = document.getElementById('patchDetailReadCount');
  const numEl   = document.getElementById('patchDetailReadCountNum');
  if (!countEl || !numEl) return;

  const lsKey = `patch_read_${id}`;
  const alreadyRead = localStorage.getItem(lsKey);

  async function fetchAndShowCount() {
    try {
      const snap = await db.collection('patchViews').doc(String(id)).get();
      numEl.textContent = (snap.exists ? (snap.data().count || 0) : 0).toLocaleString();
      countEl.style.display = 'inline-flex';
    } catch { countEl.style.display = 'none'; }
  }

  if (alreadyRead) { await fetchAndShowCount(); return; }

  countEl.classList.add('counting');
  countEl.style.display = 'inline-flex';
  numEl.textContent = '...';

  try {
    let ip = null;
    try {
      const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      const j = await r.json();
      ip = j.ip;
    } catch {}

    const ipHash    = ip ? _dSimpleHash(ip) : _dSimpleHash('anon_' + navigator.userAgent);
    const viewerRef = db.collection('patchViewers').doc(`${id}_${ipHash}`);
    const viewRef   = db.collection('patchViews').doc(String(id));
    let finalCount  = 0;

    await db.runTransaction(async t => {
      const [vs, vw] = await Promise.all([t.get(viewerRef), t.get(viewRef)]);
      if (vs.exists) { finalCount = vw.exists ? (vw.data().count || 0) : 0; return; }
      finalCount = (vw.exists ? (vw.data().count || 0) : 0) + 1;
      t.set(viewerRef, { readAt: firebase.firestore.FieldValue.serverTimestamp() });
      if (vw.exists) t.update(viewRef, { count: firebase.firestore.FieldValue.increment(1) });
      else t.set(viewRef, { count: 1 });
    });

    localStorage.setItem(lsKey, '1');
    numEl.textContent = finalCount.toLocaleString();
    countEl.style.display = 'inline-flex';
  } catch { await fetchAndShowCount(); }
  finally { countEl.classList.remove('counting'); }
}

async function _trackEventView(id) {
  const countEl = document.getElementById('evtDetailReadCount');
  const numEl   = document.getElementById('evtDetailReadCountNum');
  if (!countEl || !numEl) return;

  const lsKey      = `event_read_${id}`;
  const alreadyRead = localStorage.getItem(lsKey);

  async function fetchAndShowCount() {
    try {
      const snap = await db.collection('eventViews').doc(String(id)).get();
      numEl.textContent = (snap.exists ? (snap.data().count || 0) : 0).toLocaleString();
      countEl.style.display = 'inline-flex';
    } catch { countEl.style.display = 'none'; }
  }

  if (alreadyRead) { await fetchAndShowCount(); return; }

  countEl.classList.add('counting');
  countEl.style.display = 'inline-flex';
  numEl.textContent = '...';

  try {
    let ip = null;
    try {
      const r = await fetch('https://api.ipify.org?format=json', { cache: 'no-store' });
      const j = await r.json();
      ip = j.ip;
    } catch {}

    const ipHash    = ip ? _dSimpleHash(ip) : _dSimpleHash('anon_' + navigator.userAgent);
    const viewerRef = db.collection('eventViewers').doc(`${id}_${ipHash}`);
    const viewRef   = db.collection('eventViews').doc(String(id));
    let finalCount  = 0;

    await db.runTransaction(async t => {
      const [vs, vw] = await Promise.all([t.get(viewerRef), t.get(viewRef)]);
      if (vs.exists) { finalCount = vw.exists ? (vw.data().count || 0) : 0; return; }
      finalCount = (vw.exists ? (vw.data().count || 0) : 0) + 1;
      t.set(viewerRef, { readAt: firebase.firestore.FieldValue.serverTimestamp() });
      if (vw.exists) t.update(viewRef, { count: firebase.firestore.FieldValue.increment(1) });
      else t.set(viewRef, { count: 1 });
    });

    localStorage.setItem(lsKey, '1');
    numEl.textContent = finalCount.toLocaleString();
    countEl.style.display = 'inline-flex';
  } catch { await fetchAndShowCount(); }
  finally { countEl.classList.remove('counting'); }
}

/* ── 이벤트 목록 캐시 (sessionStorage, 5분) ── */
let _allDetailEvents = [];
const _EVT_CACHE_KEY = 'opfp_events_v1';
const _EVT_CACHE_TTL = 5 * 60 * 1000;

function _saveEvtCache(list) {
  try {
    const ser = list.map(e => {
      const o = {};
      for (const k of Object.keys(e)) {
        const v = e[k];
        o[k] = (v && typeof v.toDate === 'function') ? { _t: v.toDate().toISOString() } : v;
      }
      return o;
    });
    sessionStorage.setItem(_EVT_CACHE_KEY, JSON.stringify({ ts: Date.now(), v: ser }));
  } catch {}
}

function _loadEvtCache() {
  try {
    const raw = sessionStorage.getItem(_EVT_CACHE_KEY);
    if (!raw) return null;
    const { ts, v } = JSON.parse(raw);
    if (Date.now() - ts > _EVT_CACHE_TTL) return null;
    return v.map(e => {
      const o = {};
      for (const k of Object.keys(e)) {
        const v2 = e[k];
        o[k] = (v2 && v2._t !== undefined) ? v2._t : v2;
      }
      return o;
    });
  } catch { return null; }
}

/* ── 사이드바 + 하단 탭 활성 표시 ── */
function _setNavActive(type) {
  // 사이드 네비 초기화
  document.querySelectorAll('.comm-nav-item').forEach(el => el.classList.remove('active'));
  // 하단 탭 초기화
  document.querySelectorAll('.detail-bottom-tab-item').forEach(el => el.classList.remove('active'));

  if (type === 'patchnote') {
    document.getElementById('navPatchnote')?.classList.add('active');
    document.getElementById('btmPatchnote')?.classList.add('active');
  } else if (type === 'event') {
    document.getElementById('navEvent')?.classList.add('active');
    document.getElementById('btmEvent')?.classList.add('active');
  } else if (type === 'board') {
    document.getElementById('navBoard')?.classList.add('active');
    document.getElementById('btmBoard')?.classList.add('active');
  } else {
    document.getElementById('navHome')?.classList.add('active');
    document.getElementById('btmHome')?.classList.add('active');
  }
}

/* ── 게시판 목록 렌더링 ── */
/* ── 게시판 목록 뷰 상태 ── */
let _dlBoardViewMode = 'list'; // 'card' | 'list'
let _dlBoardSortBy   = 'recent'; // 'recent' | 'oldest' | 'recommended'
let _dlBoardCategory = 'all';   // 'all' | '자유' | '정보' | '질문'
let _allBoardPosts   = [];

async function _renderBoardList() {
  const main = document.getElementById('detailMain');
  if (!main) return;
  document.title = '게시판 — Fighting Path Patch';
  history.pushState({}, '', 'detail.html?type=board');
  _setNavActive('board');

  main.innerHTML = `
    <div style="padding-bottom:80px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center">
        <span style="font-size:15px;font-weight:700;color:var(--text)">게시판</span>
      </div>
      <div style="padding:60px 16px;text-align:center">
        <div class="spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto 12px"></div>
        <p style="color:var(--text-muted)">게시판을 불러오는 중...</p>
      </div>
    </div>`;

  try {
    const snap = await db.collection('boards').orderBy('createdAt', 'desc').limit(50).get();
    _allBoardPosts = snap.docs.map(d => ({ docId: d.id, ...d.data() }));

    if (!_allBoardPosts.length) {
      main.innerHTML = `
        <div style="padding-bottom:80px">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center">
            <span style="font-size:15px;font-weight:700;color:var(--text)">게시판</span>
          </div>
          <div class="dl-evt-toolbar">
            <div class="dl-evt-status-filter">
              <button class="dl-evt-status-btn${_dlBoardCategory==='all'?' active':''}" data-bcat="all">전체</button>
              <button class="dl-evt-status-btn${_dlBoardCategory==='자유'?' active':''}" data-bcat="자유">자유</button>
              <button class="dl-evt-status-btn${_dlBoardCategory==='정보'?' active':''}" data-bcat="정보">정보</button>
              <button class="dl-evt-status-btn${_dlBoardCategory==='질문'?' active':''}" data-bcat="질문">질문</button>
            </div>
            <button class="dl-evt-view-btn${_dlBoardViewMode==='card'?' active':''}" data-bview="card" title="카드형으로 보기">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm0 11h7v7h-7z"/></svg>
            </button>
            <button class="dl-evt-view-btn${_dlBoardViewMode==='list'?' active':''}" data-bview="list" title="목록형으로 보기">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7z"/></svg>
            </button>
            <span class="dl-evt-toolbar-sep"></span>
            <select class="event-sort-select" id="dlBoardSortSelect">
              <option value="recent"${_dlBoardSortBy==='recent'?' selected':''}>최신순</option>
              <option value="oldest"${_dlBoardSortBy==='oldest'?' selected':''}>오래된순</option>
              <option value="recommended"${_dlBoardSortBy==='recommended'?' selected':''}>추천순</option>
            </select>
          </div>
          <div style="padding:60px 16px;text-align:center;color:var(--text-muted)">게시글이 없습니다.</div>
        </div>`;
      _initNotifBell('bellEvent', 'notifEvent');
      return;
    }

    main.innerHTML = `
      <div style="padding-bottom:80px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center">
          <span style="font-size:15px;font-weight:700;color:var(--text)">게시판</span>
        </div>
        <div class="dl-evt-toolbar">
          <div class="dl-evt-status-filter">
            <button class="dl-evt-status-btn${_dlBoardCategory==='all'?' active':''}" data-bcat="all">전체</button>
            <button class="dl-evt-status-btn${_dlBoardCategory==='자유'?' active':''}" data-bcat="자유">자유</button>
            <button class="dl-evt-status-btn${_dlBoardCategory==='정보'?' active':''}" data-bcat="정보">정보</button>
            <button class="dl-evt-status-btn${_dlBoardCategory==='질문'?' active':''}" data-bcat="질문">질문</button>
          </div>
          <button class="dl-evt-view-btn${_dlBoardViewMode==='card'?' active':''}" data-bview="card" title="카드형으로 보기">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm0 11h7v7h-7z"/></svg>
          </button>
          <button class="dl-evt-view-btn${_dlBoardViewMode==='list'?' active':''}" data-bview="list" title="목록형으로 보기">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7z"/></svg>
          </button>
          <span class="dl-evt-toolbar-sep"></span>
          <select class="event-sort-select" id="dlBoardSortSelect">
            <option value="recent"${_dlBoardSortBy==='recent'?' selected':''}>최신순</option>
            <option value="oldest"${_dlBoardSortBy==='oldest'?' selected':''}>오래된순</option>
            <option value="recommended"${_dlBoardSortBy==='recommended'?' selected':''}>추천순</option>
          </select>
        </div>
        <div id="detailBoardList"></div>
      </div>`;

    _applyDlBoardFilter(main);

    main.querySelectorAll('.dl-evt-status-btn[data-bcat]').forEach(btn => {
      btn.addEventListener('click', () => {
        _dlBoardCategory = btn.dataset.bcat;
        main.querySelectorAll('.dl-evt-status-btn[data-bcat]').forEach(b => b.classList.toggle('active', b === btn));
        _applyDlBoardFilter(main);
      });
    });
    main.querySelectorAll('.dl-evt-view-btn[data-bview]').forEach(btn => {
      btn.addEventListener('click', () => {
        _dlBoardViewMode = btn.dataset.bview;
        main.querySelectorAll('.dl-evt-view-btn[data-bview]').forEach(b => b.classList.toggle('active', b === btn));
        _applyDlBoardFilter(main);
      });
    });
    document.getElementById('dlBoardSortSelect')?.addEventListener('change', e => {
      _dlBoardSortBy = e.target.value;
      _applyDlBoardFilter(main);
    });

  } catch {
    main.innerHTML = `
      <div style="padding-bottom:80px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center">
          <span style="font-size:15px;font-weight:700;color:var(--text)">게시판</span>
        </div>
        <div style="padding:60px 16px;text-align:center;color:var(--text-muted)">게시판을 불러올 수 없습니다.</div>
      </div>`;
  }

  window.scrollTo({ top: 0 });
}

function _applyDlBoardFilter(main) {
  const container = document.getElementById('detailBoardList');
  if (!container) return;

  let sorted = _dlBoardCategory === 'all'
    ? [..._allBoardPosts]
    : _allBoardPosts.filter(p => (p.prefix || '') === _dlBoardCategory);

  if (_dlBoardSortBy === 'recent') {
    sorted.sort((a, b) => {
      const da = a.createdAt?.toDate?.() ?? (a.createdAt ? new Date(a.createdAt) : new Date(0));
      const db2 = b.createdAt?.toDate?.() ?? (b.createdAt ? new Date(b.createdAt) : new Date(0));
      return db2 - da;
    });
  } else if (_dlBoardSortBy === 'oldest') {
    sorted.sort((a, b) => {
      const da = a.createdAt?.toDate?.() ?? (a.createdAt ? new Date(a.createdAt) : new Date(0));
      const db2 = b.createdAt?.toDate?.() ?? (b.createdAt ? new Date(b.createdAt) : new Date(0));
      return da - db2;
    });
  } else if (_dlBoardSortBy === 'recommended') {
    sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
  }

  function _fmtBoardDate(p) {
    const raw = p.createdAt?.toDate ? p.createdAt.toDate() : (p.createdAt ? new Date(p.createdAt) : null);
    return raw ? raw.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '';
  }

  const eyeSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;

  if (_dlBoardViewMode === 'card') {
    container.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px';
    container.innerHTML = sorted.map((p, i) => {
      const date = _fmtBoardDate(p);
      return `
        <div class="dl-board-card" data-boardid="${escHtml(p.docId)}">
          <div style="display:flex;align-items:center;gap:6px;min-width:0;margin-bottom:8px">
            ${i === 0 ? `<span style="flex-shrink:0;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;background:var(--accent);color:#fff">NEW</span>` : ''}
            ${p.prefix ? `<span style="flex-shrink:0;font-size:13px;font-weight:700;color:var(--text-muted)">[${escHtml(p.prefix)}]</span>` : ""}
            <span style="font-size:13px;font-weight:600;color:var(--text);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;flex:1;min-width:0;line-height:1.4">${escHtml(p.title || '제목 없음')}</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
            <span style="font-size:10px;font-weight:600;color:var(--accent);padding:1px 6px;border-radius:3px;background:rgba(77,159,255,0.12)">${escHtml(p.author || '익명')}</span>
            ${date ? `<span style="font-size:11px;color:var(--text-dim)">${date}</span>` : ''}
            <span class="patch-list-item-views" id="bv-${escHtml(p.docId)}">${eyeSvg}<span>-</span></span>
          </div>
        </div>`;
    }).join('');
  } else {
    container.style.cssText = '';
    container.innerHTML = `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">` +
      sorted.map((p, i) => {
        const date = _fmtBoardDate(p);
        return `
          <div data-boardid="${escHtml(p.docId)}" style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
            <div style="display:flex;align-items:center;gap:6px;min-width:0">
              ${i === 0 ? `<span style="flex-shrink:0;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;background:var(--accent);color:#fff">NEW</span>` : ''}
              ${p.prefix ? `<span style="flex-shrink:0;font-size:13px;font-weight:700;color:var(--text-muted)">[${escHtml(p.prefix)}]</span>` : ""}
              <span style="font-size:14px;font-weight:500;color:var(--text);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0">${escHtml(p.title || '제목 없음')}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
              <span style="font-size:11px;font-weight:600;color:var(--accent);padding:1px 6px;border-radius:3px;background:rgba(77,159,255,0.12)">${escHtml(p.author || '익명')}</span>
              ${date ? `<span style="font-size:11px;color:var(--text-dim)">${date}</span>` : ''}
              <span class="patch-list-item-views" id="bv-${escHtml(p.docId)}">${eyeSvg}<span>-</span></span>
            </div>
          </div>`;
      }).join('') + `</div>`;
  }

  container.querySelectorAll('[data-boardid]').forEach(el => {
    el.addEventListener('click', () => _renderBoardDetail(el.dataset.boardid));
  });

  /* 게시판 목록 조회수 배치 로드 */
  try {
    const ids = sorted.map(p => p.docId);
    Promise.all(ids.map(id => db.collection('boardViews').doc(id).get())).then(snaps => {
      snaps.forEach((snap, i) => {
        const numEl = document.querySelector(`#bv-${ids[i]} span`);
        if (numEl) numEl.textContent = snap.exists ? (snap.data().count || 0).toLocaleString() : '0';
      });
    }).catch(() => {});
  } catch {}
}

/* ── 게시판 글쓰기 ── */
function _renderBoardWrite() {
  const user    = (typeof currentUser !== 'undefined') ? currentUser : null;
  const profile = (typeof currentUserProfile !== 'undefined') ? currentUserProfile : null;
  if (!user || !profile) {
    document.getElementById('loginModalOverlay')?.classList.add('open');
    return;
  }

  const main = document.getElementById('detailMain');
  if (!main) return;
  document.title = '글쓰기 — Fighting Path Patch';
  history.pushState({}, '', 'detail.html?type=board&mode=write');
  _setNavActive('board');

  const isMobile = window.innerWidth <= 768;

  /* ── 모바일: body에 풀스크린 오버레이 직접 마운트 ── */
  if (isMobile) {
    // 기존 오버레이 제거 방어
    document.getElementById('bwMobileOverlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'bwMobileOverlay';
    overlay.className = 'bwm-overlay';
    overlay.innerHTML = `
      <div class="bwm-header">
        <button id="boardWriteBack" class="bwm-close-btn" aria-label="닫기">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="22" height="22">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
        <button id="boardWriteSubmitBtn" class="bwm-submit-btn">등록</button>
      </div>

      <div class="bwm-fields">
        <div class="bwm-prefix-row">
          <select id="boardWritePrefix" class="bwm-prefix-select">
            <option value="">말머리 선택</option>
            <option value="자유">자유</option>
            <option value="정보">정보</option>
            <option value="질문">질문</option>
          </select>
          <svg class="bwm-chevron" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M7 10l5 5 5-5H7z"/></svg>
        </div>
        <div class="bwm-divider"></div>
        <input id="boardWriteTitle" type="text" maxlength="100" placeholder="제목" class="bwm-title-input">
        <div class="bwm-divider"></div>
      </div>

      <div class="bwm-content-area">
        ${_buildEditorHtml('board-write', { bodyMode: true })}
      </div>

      <div class="bwm-toolbar-dock" id="bwmToolbarDock"></div>
    `;

    // body에 직접 마운트 (comm-wrap 스태킹 컨텍스트 밖)
    document.body.appendChild(overlay);
    document.body.classList.add('bwm-active');

    // GNB + 하단 탭바 숨김
    const gnb     = document.querySelector('.gnb');
    const tabBar  = document.querySelector('.detail-bottom-tab');
    if (gnb)    gnb.style.display    = 'none';
    if (tabBar) tabBar.style.display = 'none';

    _initEditor('board-write', {});

    /* 모바일 전용 툴바는 _initEditor 내부에서 bwmToolbarDock에 직접 주입됨 */

    /* visualViewport — 키보드 위에 툴바 고정 */
    function _bwmAdjust() {
      const dock = document.getElementById('bwmToolbarDock');
      if (!dock || !window.visualViewport) return;
      const offset = window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop;
      dock.style.bottom = Math.max(0, Math.round(offset)) + 'px';
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', _bwmAdjust);
      window.visualViewport.addEventListener('scroll', _bwmAdjust);
    }

    /* 정리 함수 */
    function _bwmCleanup() {
      document.getElementById('bwMobileOverlay')?.remove();
      document.body.classList.remove('bwm-active');
      if (gnb)    gnb.style.display    = '';
      if (tabBar) tabBar.style.display = '';
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', _bwmAdjust);
        window.visualViewport.removeEventListener('scroll', _bwmAdjust);
      }
    }

    overlay.querySelector('.bwm-close-btn')?.addEventListener('click', () => {
      _bwmCleanup();
      _renderBoardList();
    });

    /* 등록 버튼 */
    overlay.querySelector('.bwm-submit-btn')?.addEventListener('click', async () => {
      const prefix = (overlay.querySelector('.bwm-prefix-select')?.value || '').trim();
      if (!prefix) { _showPrefixAlertPopup(); return; }
      const title = (overlay.querySelector('.bwm-title-input')?.value || '').trim();
      if (!title) { showToast('제목을 입력해주세요.', 'error'); overlay.querySelector('.bwm-title-input')?.focus(); return; }
      if (!_hasEditorContent('board-write')) { showToast('내용을 입력해주세요.', 'error'); return; }

      const html = _getEditorContent('board-write');
      const submitBtn = overlay.querySelector('.bwm-submit-btn');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const ref = await db.collection('boards').add({
          prefix     : prefix,
          title      : title,
          text       : html,
          uid        : user.uid,
          author     : profile.nickname || '익명',
          avatar     : profile.avatar   || '',
          likedBy    : [],
          likeCount  : 0,
          commentCount: 0,
          createdAt  : firebase.firestore.FieldValue.serverTimestamp(),
        });
        _bwmCleanup();
        _renderBoardDetail(ref.id);
      } catch (e) {
        console.error('게시글 작성 실패:', e);
        showToast('게시글 작성에 실패했습니다. 다시 시도해주세요.', 'error');
        if (submitBtn) submitBtn.disabled = false;
      }
    });

    return; // 모바일은 여기서 종료
  }

  /* ── 데스크탑: 기존 레이아웃 ── */
  main.innerHTML = `
    <div style="padding-bottom:80px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
        <button id="boardWriteBack" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0;display:flex;align-items:center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span style="font-size:15px;font-weight:700;color:var(--text)">글쓰기</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button id="boardWriteCancelBtn" style="padding:7px 16px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-card);color:var(--text-muted);font-size:13px;cursor:pointer">취소</button>
          <button id="boardWriteSubmitBtn" style="padding:7px 18px;border-radius:var(--radius);border:none;background:var(--accent);color:#fff;font-size:13px;font-weight:700;cursor:pointer">등록</button>
        </div>
      </div>

      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex-shrink:0;position:relative;display:inline-flex;align-items:center">
            <select id="boardWritePrefix" style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:10px 28px 10px 12px;font-size:14px;font-weight:600;color:var(--text);outline:none;cursor:pointer;box-sizing:border-box;height:42px;appearance:none;-webkit-appearance:none">
              <option value="">말머리 선택</option>
              <option value="자유">자유</option>
              <option value="정보">정보</option>
              <option value="질문">질문</option>
            </select>
            <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#e85959;font-weight:700;font-size:13px;pointer-events:none">*</span>
          </div>
          <div style="flex:1;min-width:0;position:relative">
            <input id="boardWriteTitle" type="text" maxlength="100" placeholder="제목을 입력하세요"
              style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:10px 56px 10px 12px;font-size:15px;font-weight:600;color:var(--text);outline:none;height:42px">
            <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text-muted);pointer-events:none;white-space:nowrap"><span id="boardWriteTitleCount">0</span> / 100</span>
          </div>
        </div>
      </div>

      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:12px">
        ${_buildEditorHtml('board-write', { bodyMode: true })}
      </div>
    </div>`;

  _initEditor('board-write', {});
  document.getElementById('boardWriteBack')?.addEventListener('click', _renderBoardList);
  document.getElementById('boardWriteCancelBtn')?.addEventListener('click', _renderBoardList);
  document.getElementById('boardWriteTitle')?.addEventListener('input', function() {
    const counter = document.getElementById('boardWriteTitleCount');
    if (counter) counter.textContent = this.value.length;
  });
  document.getElementById('boardWriteSubmitBtn')?.addEventListener('click', async () => {
    const prefix = (document.getElementById('boardWritePrefix')?.value || '').trim();
    if (!prefix) { _showPrefixAlertPopup(); return; }
    const title = (document.getElementById('boardWriteTitle')?.value || '').trim();
    if (!title) { showToast('제목을 입력해주세요.', 'error'); document.getElementById('boardWriteTitle')?.focus(); return; }
    if (!_hasEditorContent('board-write')) { showToast('내용을 입력해주세요.', 'error'); return; }

    const html = _getEditorContent('board-write');
    const submitBtn = document.getElementById('boardWriteSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const ref = await db.collection('boards').add({
        prefix     : prefix,
        title      : title,
        text       : html,
        uid        : user.uid,
        author     : profile.nickname || '익명',
        avatar     : profile.avatar   || '',
        likedBy    : [],
        likeCount  : 0,
        commentCount: 0,
        createdAt  : firebase.firestore.FieldValue.serverTimestamp(),
      });
      _renderBoardDetail(ref.id);
    } catch (e) {
      console.error('게시글 작성 실패:', e);
      showToast('게시글 작성에 실패했습니다. 다시 시도해주세요.', 'error');
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  window.scrollTo({ top: 0 });
}
/* ── 게시판 글 수정 ── */
function _renderBoardEdit(boardId, p) {
  const user    = (typeof currentUser !== 'undefined') ? currentUser : null;
  const profile = (typeof currentUserProfile !== 'undefined') ? currentUserProfile : null;
  if (!user || !profile) return;

  const main = document.getElementById('detailMain');
  if (!main) return;
  document.title = '글 수정 — Fighting Path Patch';
  history.pushState({}, '', 'detail.html?type=board&mode=edit&id=' + boardId);
  _setNavActive('board');

  main.innerHTML = `
    <div style="padding-bottom:80px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center;gap:10px">
        <button id="boardEditBack" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:0;display:flex;align-items:center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <span style="font-size:15px;font-weight:700;color:var(--text)">글 수정</span>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button id="boardEditCancelBtn" style="padding:7px 16px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg-card);color:var(--text-muted);font-size:13px;cursor:pointer">취소</button>
          <button id="boardEditSubmitBtn" style="padding:7px 18px;border-radius:var(--radius);border:none;background:var(--accent);color:#fff;font-size:13px;font-weight:700;cursor:pointer">저장</button>
        </div>
      </div>

      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex-shrink:0;position:relative;display:inline-flex;align-items:center">
            <select id="boardEditPrefix" style="background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:10px 28px 10px 12px;font-size:14px;font-weight:600;color:var(--text);outline:none;cursor:pointer;box-sizing:border-box;height:42px;appearance:none;-webkit-appearance:none">
              <option value="">말머리 선택</option>
              <option value="자유" ${p.prefix==='자유'?'selected':''}>자유</option>
              <option value="정보" ${p.prefix==='정보'?'selected':''}>정보</option>
              <option value="질문" ${p.prefix==='질문'?'selected':''}>질문</option>
            </select>
            <span style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:#e85959;font-weight:700;font-size:13px;pointer-events:none">*</span>
          </div>
          <div style="flex:1;min-width:0;position:relative">
            <input id="boardEditTitle" type="text" maxlength="100" value="${escHtml(p.title || '')}" placeholder="제목을 입력하세요"
              style="width:100%;box-sizing:border-box;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius);padding:10px 56px 10px 12px;font-size:15px;font-weight:600;color:var(--text);outline:none;height:42px">
            <span style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text-muted);pointer-events:none;white-space:nowrap"><span id="boardEditTitleCount">${(p.title||'').length}</span> / 100</span>
          </div>
        </div>
      </div>

      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;margin-bottom:12px">
        ${_buildEditorHtml('board-edit', { bodyMode: true })}
      </div>
    </div>`;

  _initEditor('board-edit', { initialHtml: p.text || '' });

  document.getElementById('boardEditBack')?.addEventListener('click', () => _renderBoardDetail(boardId));
  document.getElementById('boardEditCancelBtn')?.addEventListener('click', () => _renderBoardDetail(boardId));
  document.getElementById('boardEditTitle')?.addEventListener('input', function() {
    const counter = document.getElementById('boardEditTitleCount');
    if (counter) counter.textContent = this.value.length;
  });
  document.getElementById('boardEditSubmitBtn')?.addEventListener('click', async () => {
    const prefix = (document.getElementById('boardEditPrefix')?.value || '').trim();
    if (!prefix) { _showPrefixAlertPopup(); return; }
    const title = (document.getElementById('boardEditTitle')?.value || '').trim();
    if (!title) { showToast('제목을 입력해주세요.', 'error'); document.getElementById('boardEditTitle')?.focus(); return; }
    if (!_hasEditorContent('board-edit')) { showToast('내용을 입력해주세요.', 'error'); return; }

    const html = _getEditorContent('board-edit');
    const submitBtn = document.getElementById('boardEditSubmitBtn');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await db.collection('boards').doc(boardId).update({
        prefix   : prefix,
        title    : title,
        text     : html,
        editedAt : firebase.firestore.FieldValue.serverTimestamp(),
      });
      _renderBoardDetail(boardId);
    } catch (e) {
      console.error('게시글 수정 실패:', e);
      showToast('수정에 실패했습니다. 다시 시도해주세요.', 'error');
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  window.scrollTo({ top: 0 });
}

/* ── 게시판 글 상세 ── */
async function _renderBoardDetail(boardId) {
  const main = document.getElementById('detailMain');
  if (!main) return;
  _setNavActive('board');
  history.pushState({}, '', 'detail.html?type=board&id=' + boardId);

  main.innerHTML = `
    <div style="padding:60px 16px;text-align:center">
      <div class="spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto 12px"></div>
      <p style="color:var(--text-muted)">불러오는 중...</p>
    </div>`;

  try {
    const doc = await db.collection('boards').doc(boardId).get();
    if (!doc.exists) {
      main.innerHTML = `<div style="padding:60px 16px;text-align:center;color:var(--text-muted)">게시글을 찾을 수 없습니다.</div>`;
      return;
    }
    const p       = { docId: doc.id, ...doc.data() };
    const user    = (typeof currentUser !== 'undefined') ? currentUser : null;
    const liked   = user && Array.isArray(p.likedBy) && p.likedBy.includes(user.uid);
    const isOwner = user && p.uid === user.uid;

    const raw     = p.createdAt?.toDate ? p.createdAt.toDate() : (p.createdAt ? new Date(p.createdAt) : null);
    const dateStr = raw ? `${raw.getFullYear()}.${String(raw.getMonth()+1).padStart(2,'0')}.${String(raw.getDate()).padStart(2,'0')}` : '';

    document.title = (p.title || '게시글') + ' — Fighting Path Patch';

    const avatarHtml = p.avatar
      ? `<img src="${escHtml(p.avatar)}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0">`
      : `<div style="width:32px;height:32px;border-radius:50%;background:var(--bg-hover);flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:var(--text-muted)">👤</div>`;

    main.innerHTML = `
      <div style="padding-bottom:80px">

        <button class="evt-detail-back-btn" id="boardDetailBackBtn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          게시판 목록으로
        </button>

        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px 24px;margin-top:8px">

          <div class="evt-detail-header">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;flex-wrap:wrap">
                ${p.prefix ? `<span style="flex-shrink:0;font-size:15px;font-weight:700;color:var(--text-muted)">[${escHtml(p.prefix)}]</span>` : ""}
                <h1 class="evt-detail-title" style="margin:0;flex:1;min-width:0">${escHtml(p.title || '제목 없음')}</h1>
              </div>
              <div class="board-detail-more-wrap" style="position:relative;flex-shrink:0">
                <button id="boardDetailMoreBtn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px 6px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center" title="더보기">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
                </button>
                <div class="evt-comment-dropdown board-detail-dropdown" id="boardDetailDropdown" style="display:none;min-width:90px">
                  ${isOwner ? `<button class="evt-comment-dropdown-item" id="boardDetailEdit">수정</button>` : ''}
                  ${isOwner ? `<button class="evt-comment-dropdown-item evt-comment-delete-btn" id="boardDetailDelete">삭제</button>` : ''}
                  <button class="evt-comment-dropdown-item" id="boardDetailShare">공유</button>
                </div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
              ${avatarHtml}
              <div>
                <span style="font-size:12px;font-weight:600;color:var(--accent)">${escHtml(p.author || '익명')}</span>
                ${dateStr ? `<span style="font-size:11px;color:var(--text-dim);margin-left:6px">${dateStr}</span>` : ''}
                <span class="patch-detail-read-count" id="boardDetailReadCount" style="display:none;margin-left:8px">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  <span id="boardDetailReadCountNum">0</span>
                </span>
              </div>
            </div>
          </div>

          <div class="evt-detail-divider"></div>

          <div class="evt-detail-body">${p.text || ''}</div>

          <div class="detail-like-row">
            <button class="detail-like-btn${liked ? ' liked' : ''}" id="boardLikeBtn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="${liked ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              <span id="boardLikeCount">${p.likeCount || 0}</span>
            </button>
          </div>

        </div>

        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px 24px;margin-top:12px">
          <div class="evt-comment-section" style="margin-top:0">
            <div class="evt-comment-section-title">
              댓글 <span class="evt-comment-count-badge" id="boardCommentCount">0</span>
            </div>
            ${ user ? _buildEditorHtml('board-cmt', {}) : `<div class="evt-comment-login-notice">글을 작성하시려면 <button class="evt-comment-login-link" id="boardCommentLoginBtn">로그인</button> 해주세요.</div>` }
            <div class="evt-comment-list" id="boardCommentList">
              <div class="evt-comment-empty">댓글을 불러오는 중...</div>
            </div>
          </div>
        </div>

        <div class="patch-nav-section">
          <div class="patch-nav-header">
            <span class="patch-nav-header-title">게시판</span>
            <button class="patch-nav-to-list-btn" id="boardToListBtn">+ 목록</button>
          </div>
          <div class="patch-recent-list" id="boardRecentList"></div>
        </div>

      </div>`;

    /* 버튼 이벤트 */
    const _goBackFromBoard = () => {
      if (_evtCommentUnsub) { _evtCommentUnsub(); _evtCommentUnsub = null; }
      _renderBoardList();
    };
    document.getElementById('boardDetailBackBtn')?.addEventListener('click', _goBackFromBoard);
    document.getElementById('boardToListBtn')?.addEventListener('click', _goBackFromBoard);

    /* 좋아요 */
    document.getElementById('boardLikeBtn')?.addEventListener('click', async () => {
      const u = (typeof currentUser !== 'undefined') ? currentUser : null;
      if (!u) { document.getElementById('loginModalOverlay')?.classList.add('open'); return; }
      const likeBtn = document.getElementById('boardLikeBtn');
      if (likeBtn) likeBtn.disabled = true;
      try {
        const snap2      = await db.collection('boards').doc(boardId).get();
        const data2      = snap2.data() || {};
        const arr        = Array.isArray(data2.likedBy) ? data2.likedBy : [];
        const isNowLiked = arr.includes(u.uid);
        const newArr     = isNowLiked ? arr.filter(id => id !== u.uid) : [...arr, u.uid];
        await db.collection('boards').doc(boardId).update({ likedBy: newArr, likeCount: newArr.length });
        const countEl = document.getElementById('boardLikeCount');
        if (countEl) countEl.textContent = newArr.length;
        if (likeBtn) {
          likeBtn.classList.toggle('liked', !isNowLiked);
          likeBtn.querySelector('svg').setAttribute('fill', !isNowLiked ? 'currentColor' : 'none');
        }
      } catch (e) { console.error('추천 실패:', e); }
      finally { if (likeBtn) likeBtn.disabled = false; }
    });

    /* ⋮ 드롭다운 */
    const _moreBtn = document.getElementById('boardDetailMoreBtn');
    const _dropdown = document.getElementById('boardDetailDropdown');
    if (_moreBtn && _dropdown) {
      _moreBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = _dropdown.style.display !== 'none';
        _dropdown.style.display = isOpen ? 'none' : 'block';
      });
      document.addEventListener('click', function _closeBoardDropdown(e) {
        if (!_moreBtn.contains(e.target) && !_dropdown.contains(e.target)) {
          _dropdown.style.display = 'none';
          document.removeEventListener('click', _closeBoardDropdown);
        }
      });
    }

    /* 수정 */
    document.getElementById('boardDetailEdit')?.addEventListener('click', () => {
      if (_dropdown) _dropdown.style.display = 'none';
      _renderBoardEdit(boardId, p);
    });

    /* 삭제 */
    document.getElementById('boardDetailDelete')?.addEventListener('click', async () => {
      if (_dropdown) _dropdown.style.display = 'none';
      if (!await _gnbConfirm('게시글을 삭제하시겠습니까?', '삭제된 게시글은 복구할 수 없습니다.')) return;
      try {
        await db.collection('boards').doc(boardId).delete();
        _renderBoardList();
      } catch (e) { console.error('삭제 실패:', e); showToast('삭제에 실패했습니다.', 'error'); }
    });

    /* 공유 */
    document.getElementById('boardDetailShare')?.addEventListener('click', () => {
      if (_dropdown) _dropdown.style.display = 'none';
      const url = location.href.split('?')[0] + '?type=board&id=' + encodeURIComponent(boardId);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => showToast('링크가 복사되었습니다.', 'success'));
      } else {
        const ta = document.createElement('textarea');
        ta.value = url; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
        showToast('링크가 복사되었습니다.', 'success');
      }
    });

    /* 게시판 댓글 */
    _cmtCtx = { commentCol: 'boardComments', parentCol: 'boards', parentId: boardId, queryField: 'boardId', listElId: 'boardCommentList', countElId: 'boardCommentCount', editorId: 'board-cmt' };
    if (user) {
      _initEditor('board-cmt', { onSubmit: submitDetailComment });
    }
    document.getElementById('boardCommentLoginBtn')?.addEventListener('click', () => {
      document.getElementById('loginModalOverlay')?.classList.add('open');
    });
    loadDetailComments(boardId);

    /* 하단 최근 게시글 목록 */
    _renderBoardRecentList(boardId);

    /* 게시판 조회수 추적 */
    _trackBoardView(boardId).catch(err => console.error('게시판 조회수 오류:', err));

  } catch (e) {
    console.error('게시글 로드 실패:', e);
    main.innerHTML = `<div style="padding:60px 16px;text-align:center;color:var(--text-muted)">게시글을 불러오지 못했습니다.</div>`;
  }

  window.scrollTo({ top: 0 });
}

/* ── 게시판 조회수 ── */
async function _trackBoardView(boardId) {
  const countEl = document.getElementById('boardDetailReadCount');
  const numEl   = document.getElementById('boardDetailReadCountNum');
  if (!countEl || !numEl) return;

  const lsKey = `board_read_${boardId}`;
  const alreadyRead = localStorage.getItem(lsKey);

  async function fetchAndShowCount() {
    try {
      const snap = await db.collection('boardViews').doc(boardId).get();
      numEl.textContent = (snap.exists ? (snap.data().count || 0) : 0).toLocaleString();
      countEl.style.display = 'inline-flex';
    } catch { countEl.style.display = 'none'; }
  }

  if (alreadyRead) { await fetchAndShowCount(); return; }

  countEl.classList.add('counting');
  countEl.style.display = 'inline-flex';
  numEl.textContent = '...';

  try {
    const viewRef = db.collection('boardViews').doc(boardId);
    await db.runTransaction(async tx => {
      const snap = await tx.get(viewRef);
      const cur  = snap.exists ? (snap.data().count || 0) : 0;
      tx.set(viewRef, { count: cur + 1 }, { merge: true });
    });
    localStorage.setItem(lsKey, '1');
    await fetchAndShowCount();
  } catch {
    await fetchAndShowCount();
  }
  countEl.classList.remove('counting');
}

/* ── 게시판 상세 하단 목록 ── */
async function _renderBoardRecentList(currentId) {
  const listEl = document.getElementById('boardRecentList');
  if (!listEl) return;
  try {
    const posts = _allBoardPosts.length ? _allBoardPosts
      : await db.collection('boards').orderBy('createdAt', 'desc').limit(20).get()
          .then(s => s.docs.map(d => ({ docId: d.id, ...d.data() })));
    if (!posts.length) { listEl.innerHTML = ''; return; }
    listEl.innerHTML = posts.map(post => {
      const raw2 = post.createdAt?.toDate ? post.createdAt.toDate() : (post.createdAt ? new Date(post.createdAt) : null);
      const d2   = raw2 ? raw2.toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) : '';
      const isCurrent = post.docId === currentId;
      const eyeSvgSm = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;
      return `<div class="patch-recent-item${isCurrent ? ' current' : ''}" ${isCurrent ? '' : `data-boardid="${escHtml(post.docId)}"`}>
        <div class="patch-recent-item-title">${escHtml(post.title || '제목 없음')}</div>
        <div class="patch-recent-item-meta">
          <span class="patch-recent-item-author">${escHtml(post.author || '익명')}</span>
          ${d2 ? `<span class="patch-recent-item-date">${d2}</span>` : ''}
          <span class="patch-recent-item-views" id="bvrec-${escHtml(post.docId)}">${eyeSvgSm}<span>-</span></span>
        </div>
      </div>`;
    }).join('');
    listEl.querySelectorAll('[data-boardid]').forEach(el => {
      el.addEventListener('click', () => _renderBoardDetail(el.dataset.boardid));
    });
    /* 하단 목록 조회수 배치 로드 */
    try {
      const ids2 = posts.map(p => p.docId);
      Promise.all(ids2.map(id => db.collection('boardViews').doc(id).get())).then(snaps => {
        snaps.forEach((snap, i) => {
          const numEl = document.querySelector(`#bvrec-${ids2[i]} span`);
          if (numEl) numEl.textContent = snap.exists ? (snap.data().count || 0).toLocaleString() : '0';
        });
      }).catch(() => {});
    } catch {}
  } catch (e) { console.error('게시판 목록 로드 실패:', e); }
}
/* ── 홈 렌더링 ── */
function _renderHome() {
  const main = document.getElementById('detailMain');
  if (!main) return;
  document.title = '홈 — Fighting Path Patch';
  history.pushState({}, '', 'detail.html');
  _setNavActive('home');

  main.innerHTML = `
    <div style="padding-bottom:80px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px 20px;margin-bottom:12px;text-align:center">
        <p style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:4px">파이팅 패스 패치 ROOM에 오신 것을 환영합니다</p>
        <p style="font-size:12px;color:var(--text-muted)">게시판, 패치노트, 이벤트를 한곳에서 확인하세요</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button onclick="_renderBoardList();" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px;transition:background 0.15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20" style="color:var(--accent);flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2h2m10-4H7a2 2 0 00-2 2v0a2 2 0 002 2h10a2 2 0 002-2v0a2 2 0 00-2-2z"/></svg>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text)">게시판</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">커뮤니티 게시글을 확인하세요</div>
          </div>
        </button>
        <button onclick="_renderPatchList();" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px;transition:background 0.15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20" style="color:var(--accent);flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text)">패치노트</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">최신 패치 내역을 확인하세요</div>
          </div>
        </button>
        <button onclick="_renderEventList();" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px 20px;cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px;transition:background 0.15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20" style="color:var(--accent);flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <div>
            <div style="font-size:14px;font-weight:600;color:var(--text)">이벤트</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px">진행 중인 이벤트를 확인하세요</div>
          </div>
        </button>
      </div>
    </div>`;

  window.scrollTo({ top: 0 });
}

/* ── 패치노트 목록 렌더링 ── */
async function _renderPatchList() {
  const main = document.getElementById('detailMain');
  if (!main) return;
  document.title = '패치노트 — Fighting Path Patch';
  history.pushState({}, '', 'detail.html?type=patchnote');
  _setNavActive('patchnote');

  const allNotes = (typeof PATCH_NOTES !== 'undefined') ? PATCH_NOTES : [];
  if (!allNotes.length) {
    main.innerHTML = `<div style="padding:60px 16px;text-align:center">
      <div class="spinner" style="width:32px;height:32px;border-width:3px;margin:0 auto 12px"></div>
      <p style="color:var(--text-muted)">패치노트를 불러오는 중...</p>
    </div>`;
    if (typeof initData === 'function') {
      try { await Promise.race([initData(), new Promise(r => setTimeout(r, 8000))]); } catch {}
    }
  }

  const notes = (typeof PATCH_NOTES !== 'undefined') ? PATCH_NOTES : [];
  if (!notes.length) {
    main.innerHTML = `
      <div style="padding-bottom:80px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center">
          <span style="font-size:15px;font-weight:700;color:var(--text)">패치노트</span>
          <button id="bellPatch" class="dl-notif-bell${localStorage.getItem('notifPatch')==='true'?' active':''}" aria-label="알림 설정" title="알림 설정"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>
        </div>
        <div style="padding:60px 16px;text-align:center;color:var(--text-muted)">패치노트가 없습니다.</div>
      </div>`;
    _initNotifBell('bellPatch', 'notifPatch');
    return;
  }

  const firstId = notes[0]?.id;
  main.innerHTML = `
    <div style="padding-bottom:80px">
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center">
        <span style="font-size:15px;font-weight:700;color:var(--text)">패치노트</span>
        <button id="bellPatch" class="dl-notif-bell${localStorage.getItem('notifPatch')==='true'?' active':''}" aria-label="알림 설정" title="알림 설정"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>
      </div>
      <div id="detailPatchList" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">
        ${notes.map((p, i) => `
          <div data-patchid="${escHtml(String(p.id))}" style="
            padding:14px 16px;
            border-bottom:1px solid var(--border);
            cursor:pointer;
            transition:background 0.15s;
          " onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
            <div style="display:flex;align-items:center;gap:6px;min-width:0">
              ${i === 0 ? `<span style="flex-shrink:0;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;background:var(--accent);color:#fff">NEW</span>` : ''}
              <span style="
                font-size:14px;font-weight:500;color:var(--text);
                overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0;
              ">${escHtml(p.title)}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
              <span style="font-size:11px;font-weight:600;color:var(--accent);padding:1px 6px;border-radius:3px;background:rgba(77,159,255,0.12)">관리자</span>
              <span style="font-size:11px;color:var(--text-dim)">${_dFmtPatchDate(p.date)}</span>
              <span id="pv-${p.id}" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text-dim)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>-</span>
              </span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  main.querySelectorAll('#detailPatchList [data-patchid]').forEach(el => {
    el.addEventListener('click', () => {
      history.pushState({}, '', `detail.html?type=patchnote&id=${el.dataset.patchid}`);
      _renderPatchDetail(el.dataset.patchid);
    });
  });

  /* 패치노트 조회수 배치 로드 */
  try {
    const ids = notes.map(p => String(p.id));
    const snaps = await Promise.all(ids.map(id => db.collection('patchViews').doc(id).get()));
    snaps.forEach((snap, i) => {
      const el = document.querySelector(`#pv-${ids[i]} span`);
      if (el) el.textContent = snap.exists ? (snap.data().count || 0).toLocaleString() : '0';
    });
  } catch {}

  _initNotifBell('bellPatch', 'notifPatch');
  window.scrollTo({ top: 0 });
}

/* ── 이벤트 목록 렌더링 ── */
/* ── 이벤트 목록 뷰 상태 ── */
let _dlViewMode     = 'card'; // 'card' | 'list'
let _dlSortBy       = 'recent'; // 'recent' | 'updated' | 'recommended'
let _dlStatusFilter = 'all'; // 'all' | 'active' | 'ended'

async function _renderEventList() {
  const main = document.getElementById('detailMain');
  if (!main) return;
  document.title = '이벤트 — Fighting Path Patch';
  history.pushState({}, '', 'detail.html?type=event');
  _setNavActive('event');

  main.innerHTML = `<div class="sk-detail-wrap">
      <div class="sk-detail-header"><div class="sk-block" style="height:15px;width:55px"></div></div>
      <div class="sk-event-grid"><div class="sk-event-card"><div class="sk-block sk-event-thumb"></div><div class="sk-event-body"><div class="sk-block" style="height:13px;width:85%"></div><div class="sk-block" style="height:13px;width:60%"></div><div class="sk-block" style="height:10px;width:40%"></div></div></div><div class="sk-event-card"><div class="sk-block sk-event-thumb"></div><div class="sk-event-body"><div class="sk-block" style="height:13px;width:60%"></div><div class="sk-block" style="height:13px;width:40%"></div><div class="sk-block" style="height:10px;width:40%"></div></div></div><div class="sk-event-card"><div class="sk-block sk-event-thumb"></div><div class="sk-event-body"><div class="sk-block" style="height:13px;width:50%"></div><div class="sk-block" style="height:13px;width:45%"></div><div class="sk-block" style="height:10px;width:40%"></div></div></div><div class="sk-event-card"><div class="sk-block sk-event-thumb"></div><div class="sk-event-body"><div class="sk-block" style="height:13px;width:80%"></div><div class="sk-block" style="height:13px;width:55%"></div><div class="sk-block" style="height:10px;width:40%"></div></div></div><div class="sk-event-card"><div class="sk-block sk-event-thumb"></div><div class="sk-event-body"><div class="sk-block" style="height:13px;width:65%"></div><div class="sk-block" style="height:13px;width:40%"></div><div class="sk-block" style="height:10px;width:40%"></div></div></div><div class="sk-event-card"><div class="sk-block sk-event-thumb"></div><div class="sk-event-body"><div class="sk-block" style="height:13px;width:45%"></div><div class="sk-block" style="height:13px;width:35%"></div><div class="sk-block" style="height:10px;width:40%"></div></div></div></div>
    </div>`;

  try {
    if (!_allDetailEvents.length) {
      // 캐시 우선
      const cached = _loadEvtCache();
      if (cached) {
        _allDetailEvents = cached;
        // 백그라운드 갱신
        db.collection('events').get().then(snap => {
          const fresh = snap.docs
            .map(d => ({ _docId: d.id, ...d.data() }))
            .filter(e => e.visible !== false)
            .sort((a, b) => {
              const da = a.startDate?.toDate?.() ?? (a.date ? new Date(a.date) : new Date(0));
              const db2 = b.startDate?.toDate?.() ?? (b.date ? new Date(b.date) : new Date(0));
              return db2 - da;
            });
          _allDetailEvents = fresh;
          _saveEvtCache(fresh);
        }).catch(() => {});
      } else {
        const snap = await db.collection('events').get();
        _allDetailEvents = snap.docs
          .map(d => ({ _docId: d.id, ...d.data() }))
          .filter(e => e.visible !== false)
          .sort((a, b) => {
            const da = a.startDate?.toDate?.() ?? (a.date ? new Date(a.date) : new Date(0));
            const db2 = b.startDate?.toDate?.() ?? (b.date ? new Date(b.date) : new Date(0));
            return db2 - da;
          });
        _saveEvtCache(_allDetailEvents);
      }
    }

    if (!_allDetailEvents.length) {
      main.innerHTML = `
        <div style="padding-bottom:80px">
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center">
            <span style="font-size:15px;font-weight:700;color:var(--text)">이벤트</span>
            <button id="bellEvent" class="dl-notif-bell${localStorage.getItem('notifEvent')==='true'?' active':''}" aria-label="알림 설정" title="알림 설정"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>
          </div>
          <div style="padding:60px 16px;text-align:center;color:var(--text-muted)">이벤트가 없습니다.</div>
        </div>`;
      return;
    }

    main.innerHTML = `
      <div style="padding-bottom:80px">
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:14px 16px;margin-bottom:12px;display:flex;align-items:center">
          <span style="font-size:15px;font-weight:700;color:var(--text)">이벤트</span>
          <button id="bellEvent" class="dl-notif-bell${localStorage.getItem('notifEvent')==='true'?' active':''}" aria-label="알림 설정" title="알림 설정"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></button>
        </div>
        <div class="dl-evt-toolbar">
          <div class="dl-evt-status-filter">
            <button class="dl-evt-status-btn${_dlStatusFilter==='all'?' active':''}" data-status="all">전체</button>
            <button class="dl-evt-status-btn${_dlStatusFilter==='active'?' active':''}" data-status="active">진행중</button>
            <button class="dl-evt-status-btn${_dlStatusFilter==='ended'?' active':''}" data-status="ended">종료</button>
          </div>
          <button class="dl-evt-view-btn${_dlViewMode==='card'?' active':''}" data-view="card" title="카드형으로 보기">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm0 11h7v7h-7z"/></svg>
          </button>
          <button class="dl-evt-view-btn${_dlViewMode==='list'?' active':''}" data-view="list" title="목록형으로 보기">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7zm-4 6h2v2H3zm4 0h14v2H7z"/></svg>
          </button>
          <span class="dl-evt-toolbar-sep"></span>
          <select class="event-sort-select" id="dlEvtSortSelect">
            <option value="recent"${_dlSortBy==='recent'?' selected':''}>최신순</option>
            <option value="updated"${_dlSortBy==='updated'?' selected':''}>업데이트순</option>
            <option value="recommended"${_dlSortBy==='recommended'?' selected':''}>추천순</option>
          </select>
        </div>
        <div id="detailEventGrid"></div>
      </div>
    `;

    _applyDlFilter();

    main.querySelectorAll('.dl-evt-status-btn[data-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        _dlStatusFilter = btn.dataset.status;
        main.querySelectorAll('.dl-evt-status-btn').forEach(b => b.classList.toggle('active', b === btn));
        _applyDlFilter();
      });
    });
    main.querySelectorAll('.dl-evt-view-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        _dlViewMode = btn.dataset.view;
        main.querySelectorAll('.dl-evt-view-btn').forEach(b => b.classList.toggle('active', b === btn));
        _applyDlFilter();
      });
    });
    document.getElementById('dlEvtSortSelect')?.addEventListener('change', e => {
      _dlSortBy = e.target.value;
      _applyDlFilter();
    });

    await _loadDlEventCounts();
  } catch (err) {
    console.error('이벤트 목록 로드 실패:', err);
    if (main) main.innerHTML = '<div style="padding:60px 16px;text-align:center;color:var(--text-muted)">이벤트를 불러오지 못했습니다.</div>';
  }
  _initNotifBell('bellEvent', 'notifEvent');
  window.scrollTo({ top: 0 });
}

/* ── 이벤트 목록 필터/뷰 렌더 ── */
function _applyDlFilter() {
  const grid = document.getElementById('detailEventGrid');
  if (!grid) return;

  const now = new Date();
  function _dlIsActive(e) {
    if (!e.endDate) return true;
    const end = e.endDate.toDate ? e.endDate.toDate() : new Date(e.endDate);
    return end >= now;
  }
  function _dlFmtDate(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }

  let sorted = [..._allDetailEvents];
  if (_dlSortBy === 'recent') {
    sorted.sort((a, b) => {
      const da = a.startDate?.toDate?.() ?? (a.date ? new Date(a.date) : new Date(0));
      const db2 = b.startDate?.toDate?.() ?? (b.date ? new Date(b.date) : new Date(0));
      return db2 - da;
    });
  } else if (_dlSortBy === 'updated') {
    sorted.sort((a, b) => {
      const da = a.updatedAt?.toDate?.() ?? a.startDate?.toDate?.() ?? new Date(0);
      const db2 = b.updatedAt?.toDate?.() ?? b.startDate?.toDate?.() ?? new Date(0);
      return db2 - da;
    });
  } else if (_dlSortBy === 'recommended') {
    sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
  }

  if (_dlStatusFilter === 'active') {
    sorted = sorted.filter(e => _dlIsActive(e));
  } else if (_dlStatusFilter === 'ended') {
    sorted = sorted.filter(e => !_dlIsActive(e));
  }

  const metaHtml = (e) => `
    <div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">
      <span style="font-size:10px;font-weight:700;color:var(--accent);padding:1px 5px;border-radius:3px;background:rgba(77,159,255,0.12)">관리자</span>
      <span id="ev-${escHtml(e._docId)}" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text-dim)">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        <span>-</span>
      </span>
      <span id="ec-${escHtml(e._docId)}" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text-dim)">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        <span>${e.commentCount ?? 0}</span>
      </span>
    </div>`;

  if (_dlViewMode === 'card') {
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px';
    grid.innerHTML = sorted.map(e => {
      const active   = _dlIsActive(e);
      const dateStr  = e.startDate ? _dlFmtDate(e.startDate) : (e.date || '');
      const thumb    = e.thumbnailUrl
        ? `<img src="${escHtml(e.thumbnailUrl)}" alt="${escHtml(e.title||'')}" loading="lazy">`
        : `<div class="event-card-thumb-placeholder">이미지 없음</div>`;
      const dateBadge = dateStr ? `<span class="event-card-period">${escHtml(dateStr)}</span>` : '';
      return `
        <div class="event-card event-card-clickable${active?'':' event-card-ended'}" data-evtid="${escHtml(e._docId)}">
          <div class="event-card-thumb">
            ${thumb}
            ${e.tag ? `<span class="event-card-tag">${escHtml(e.tag)}</span>` : ''}
            ${dateBadge}
            ${!active ? `<div class="event-card-ended-overlay"><span>종료</span></div>` : ''}
          </div>
          <div class="event-card-body">
            <div class="event-card-title">${escHtml(e.title||'제목 없음')}</div>
            ${metaHtml(e)}
          </div>
        </div>`;
    }).join('');
  } else {
    grid.style.cssText = 'display:flex;flex-direction:column;gap:0';
    grid.innerHTML = `<div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden">` +
      sorted.map(e => {
        const active  = _dlIsActive(e);
        const dateStr = e.startDate ? _dlFmtDate(e.startDate) : (e.date || '');
        const statusBadge = active
          ? `<span style="flex-shrink:0;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;background:rgba(34,197,94,0.15);color:#22c55e">진행중</span>`
          : `<span style="flex-shrink:0;font-size:10px;font-weight:700;padding:1px 6px;border-radius:3px;background:rgba(150,150,150,0.15);color:var(--text-dim)">종료</span>`;
        return `
          <div class="event-card-clickable" data-evtid="${escHtml(e._docId)}" style="padding:14px 16px;border-bottom:1px solid var(--border);cursor:pointer;transition:background 0.15s" onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background=''">
            <div style="display:flex;align-items:center;gap:6px;min-width:0">
              ${statusBadge}
              <span style="font-size:14px;font-weight:500;color:var(--text);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex:1;min-width:0">${escHtml(e.title||'제목 없음')}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
              <span style="font-size:11px;font-weight:600;color:var(--accent);padding:1px 6px;border-radius:3px;background:rgba(77,159,255,0.12)">관리자</span>
              ${dateStr ? `<span style="font-size:11px;color:var(--text-dim)">${escHtml(dateStr)}</span>` : ''}
              <span id="ev-${escHtml(e._docId)}" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text-dim)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                <span>-</span>
              </span>
              <span id="ec-${escHtml(e._docId)}" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text-dim)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                <span>${e.commentCount ?? 0}</span>
              </span>
            </div>
          </div>`;
      }).join('') + `</div>`;
  }

  grid.querySelectorAll('.event-card-clickable[data-evtid]').forEach(el => {
    el.addEventListener('click', () => {
      history.pushState({}, '', `detail.html?type=event&id=${encodeURIComponent(el.dataset.evtid)}`);
      _renderEventDetail(el.dataset.evtid);
    });
  });

  _loadDlEventCounts();
}

async function _loadDlEventCounts() {
  try {
    const ids = _allDetailEvents.map(e => e._docId);
    const snaps = await Promise.all(ids.map(id => db.collection('eventViews').doc(id).get()));
    snaps.forEach((snap, i) => {
      const el = document.querySelector(`#ev-${CSS.escape(ids[i])} span`);
      if (el) el.textContent = snap.exists ? (snap.data().count || 0).toLocaleString() : '0';
    });
  } catch {}
  try {
    const ids = _allDetailEvents.map(e => e._docId);
    const cmtSnaps = await Promise.all(ids.map(id => db.collection('eventComments').where('eventId','==',id).get()));
    cmtSnaps.forEach((snap, i) => {
      const el = document.querySelector(`#ec-${CSS.escape(ids[i])} span`);
      if (el) el.textContent = snap.size;
    });
  } catch {}
}

/* ── 이벤트 상세 ── */
let _evtCommentUnsub = null;
let _detailEventId   = null;

/* 댓글 컨텍스트 — 이벤트/게시판 댓글 공용 */
let _cmtCtx = {
  commentCol : 'eventComments',
  parentCol  : 'events',
  parentId   : null,
  queryField : 'eventId',
  listElId   : 'evtCommentList',
  countElId  : 'evtCommentCount',
  editorId   : 'main',
};

async function _renderEventDetail(id) {
  _detailEventId = id;
  const main = document.getElementById('detailMain');
  if (!main) return;

  main.innerHTML = `<div class="sk-content-wrap">
      <div class="sk-block sk-back-btn-sk"></div>
      <div class="sk-content-card">
        <div class="sk-block" style="height:11px;width:55px;border-radius:3px"></div>
        <div class="sk-block" style="height:22px;width:78%;border-radius:5px;margin-top:10px"></div>
        <div class="sk-block" style="height:11px;width:130px;margin-top:8px"></div>
        <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:16px"></div>
        <div class="sk-content-lines"><div class="sk-block" style="height:12px;width:90%"></div><div class="sk-block" style="height:12px;width:75%"></div><div class="sk-block" style="height:12px;width:80%"></div><div class="sk-block" style="height:12px;width:60%"></div><div class="sk-block" style="height:12px;width:85%"></div><div class="sk-block" style="height:12px;width:70%"></div></div>
      </div>
    </div>`;

  try {
    const snap = await db.collection('events').doc(id).get();
    if (!snap.exists) throw new Error('not found');
    const snapData = snap.data();
    if (!snapData) throw new Error('snap.data() null');
    const evt = { id: snap.id, ...snapData };
    document.title = `${evt.title || '이벤트'} — Fighting Path Patch`;
    _buildEventHtml(evt);
    _trackEventView(id).catch(err => console.error('이벤트 조회수 오류:', err));
    _cmtCtx = { commentCol: 'eventComments', parentCol: 'events', parentId: id, queryField: 'eventId', listElId: 'evtCommentList', countElId: 'evtCommentCount', editorId: 'main' };
    loadDetailComments(id);
  } catch (e) {
    console.error('이벤트 로드 실패:', e);
    const main2 = document.getElementById('detailMain');
    if (main2) main2.innerHTML = '<div style="padding:60px 16px;text-align:center;color:var(--text-muted)">이벤트를 찾을 수 없습니다.</div>';
  }
}

function _buildEventHtml(evt) {
  const active  = _dIsActive(evt);
  const start   = evt.startDate ? _dFmtDate(evt.startDate) : (evt.date || '');
  const end     = _dFmtDate(evt.endDate);
  const period  = start && end ? `${start} ~ ${end}` : (start || end || '');
  const content = evt.content || evt.description || evt.excerpt || '';

  const main = document.getElementById('detailMain');
  if (!main) return;

  main.innerHTML = `
    <div style="padding-bottom:80px">
      <button class="evt-detail-back-btn" id="evtDetailBackBtn">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
        이벤트 목록으로
      </button>

      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px 24px;margin-top:8px">

      ${evt.thumbnailUrl ? `
      <div class="evt-detail-thumb">
        <img src="${escHtml(evt.thumbnailUrl)}" alt="${escHtml(evt.title || '')}">
      </div>` : ''}

      <div class="evt-detail-header">
        <div class="evt-detail-header-top">
          ${evt.tag ? `<span class="evt-detail-tag">${escHtml(evt.tag)}</span>` : ''}
          <span class="evt-detail-status-badge ${active ? 'active' : 'ended'}">${active ? '진행 중' : '종료'}</span>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <h1 class="evt-detail-title" style="flex:1;min-width:0">${escHtml(evt.title || '제목 없음')}</h1>
          <div class="board-detail-more-wrap" style="position:relative;flex-shrink:0">
            <button id="evtDetailMoreBtn" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px 6px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center" title="더보기">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
            </button>
            <div class="evt-comment-dropdown board-detail-dropdown" id="evtDetailDropdown" style="display:none;min-width:90px">
              <button class="evt-comment-dropdown-item" id="evtDetailShare">공유</button>
            </div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px;flex-wrap:wrap">
          ${period ? `<div class="evt-detail-period" style="margin-top:0">📅 ${escHtml(period)}</div>` : '<div></div>'}
          <span class="evt-detail-read-count" id="evtDetailReadCount" style="display:none">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            <span id="evtDetailReadCountNum">0</span>
          </span>
        </div>
      </div>

      <div class="evt-detail-divider"></div>

      <div class="evt-detail-body">${content
        ? _dSanitizeHtml(content)
        : '<p style="color:var(--text-muted)">상세 내용이 없습니다.</p>'
      }</div>

      ${evt.link && /^https?:\/\//i.test(evt.link) ? `
      <div class="evt-detail-link-wrap">
        <a class="evt-detail-link-btn" href="${escHtml(evt.link)}" target="_blank" rel="noopener noreferrer">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
          이벤트 페이지 바로가기
        </a>
      </div>` : ''}

      <div class="detail-like-row">
        <button class="detail-like-btn" id="evtLikeBtn">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          <span id="evtLikeCount">—</span>
        </button>
      </div>

      </div><!-- /.bg-card content wrapper -->

      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:20px 24px 24px;margin-top:12px">
      <div class="evt-comment-section" style="margin-top:0">
        <div class="evt-comment-section-title">
          댓글 <span class="evt-comment-count-badge" id="evtCommentCount">0</span>
        </div>
        ${ (typeof currentUser !== 'undefined' && currentUser) ? `
        ${ _buildEditorHtml('main', {}) }
        </div>` : `
        <div class="evt-comment-login-notice">
          글을 작성하시려면 <button class="evt-comment-login-link" id="evtCommentLoginBtn">로그인</button> 해주세요.
        </div>` }
        <div class="evt-comment-list" id="evtCommentList">
          <div class="evt-comment-empty">댓글을 불러오는 중...</div>
        </div>
      </div>
      </div><!-- /.bg-card comment wrapper -->
    </div>
  `;

  /* 좋아요 */
  _initLikeBtn('event', _detailEventId, document.getElementById('evtLikeBtn'), document.getElementById('evtLikeCount'));

  /* 이벤트 바인딩 */
  document.getElementById('evtDetailBackBtn')?.addEventListener('click', () => {
    if (_evtCommentUnsub) { _evtCommentUnsub(); _evtCommentUnsub = null; }
    _renderEventList();
  });

  /* ⋮ 드롭다운 (이벤트) */
  const _evtMoreBtn = document.getElementById('evtDetailMoreBtn');
  const _evtDropdown = document.getElementById('evtDetailDropdown');
  if (_evtMoreBtn && _evtDropdown) {
    _evtMoreBtn.addEventListener('click', e => {
      e.stopPropagation();
      _evtDropdown.style.display = _evtDropdown.style.display !== 'none' ? 'none' : 'block';
    });
    document.addEventListener('click', function _closeEvtDropdown(e) {
      if (!_evtMoreBtn.contains(e.target) && !_evtDropdown.contains(e.target)) {
        _evtDropdown.style.display = 'none';
        document.removeEventListener('click', _closeEvtDropdown);
      }
    });
  }
  document.getElementById('evtDetailShare')?.addEventListener('click', () => {
    if (_evtDropdown) _evtDropdown.style.display = 'none';
    const url = location.href.split('?')[0] + '?type=event&id=' + encodeURIComponent(_detailEventId);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => showToast('링크가 복사되었습니다.', 'success'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
      showToast('링크가 복사되었습니다.', 'success');
    }
  });

  if (typeof currentUser !== 'undefined' && currentUser) {
    _initEditor('main', { onSubmit: submitDetailComment });
  }

  // 미로그인 로그인 안내 버튼
  document.getElementById('evtCommentLoginBtn')?.addEventListener('click', () => {
    document.getElementById('loginModalOverlay')?.classList.add('open');
  });
}

/* ── 댓글 로드 ── */
function loadDetailComments(parentId) {
  const list = document.getElementById(_cmtCtx.listElId);
  if (!list) return;

  if (_evtCommentUnsub) { _evtCommentUnsub(); _evtCommentUnsub = null; }
  list.innerHTML = '<div class="evt-comment-empty">댓글을 불러오는 중...</div>';

  _evtCommentUnsub = db.collection(_cmtCtx.commentCol)
    .where(_cmtCtx.queryField, '==', parentId)
    .onSnapshot(snap => {
      const comments = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
          return ta - tb;
        });
      _renderDetailComments(comments);
    }, err => {
      console.error('댓글 로드 실패:', err);
      const l = document.getElementById(_cmtCtx.listElId);
      if (l) l.innerHTML = '<div class="evt-comment-empty"><div class="evt-comment-empty-title">등록 된 댓글이 없습니다.</div><div class="evt-comment-empty-sub">첫번째 댓글을 작성해보세요!</div></div>';
    });
}

/* ── 댓글 렌더링 ── */
function _fmtCommentTime(ts) {
  const d = ts && ts.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
  if (!d) return '';
  // UTC+9 변환
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCFullYear() + '.' +
    String(kst.getUTCMonth()+1).padStart(2,'0') + '.' +
    String(kst.getUTCDate()).padStart(2,'0') + ' ' +
    String(kst.getUTCHours()).padStart(2,'0') + ':' +
    String(kst.getUTCMinutes()).padStart(2,'0') + ' (UTC+9)';
}

function _buildCommentHtml(c, isReply, replies) {
  const uid        = (typeof currentUser !== 'undefined') && currentUser ? currentUser.uid : null;
  const avatarSrc  = c.avatar || '';
  const initial    = (c.nickname || '?')[0].toUpperCase();
  const avatarHtml = avatarSrc
    ? `<img src="${escHtml(avatarSrc)}" alt="${escHtml(c.nickname || '')}" class="evt-comment-avatar-img">`
    : `<span class="evt-comment-avatar-initial">${escHtml(initial)}</span>`;
  const isOwner    = !!(uid && uid === c.uid);
  const likedBy    = c.likedBy    || [];
  const dislikedBy = c.dislikedBy || [];
  const myLike     = uid ? likedBy.includes(uid)    : false;
  const myDislike  = uid ? dislikedBy.includes(uid) : false;
  const timeStr    = _fmtCommentTime(c.createdAt);
  const editedMark = c.editedAt ? ` <span class="evt-comment-edited">(수정됨)</span>` : '';
  const cid        = escHtml(c.id);
  const roleBadge  = c.role ? `<span class="evt-comment-role-badge">${escHtml(c.role)}</span>` : '';

  /* 세로 ⋮ 메뉴 — 본인 댓글만 표시 */
  const menuHtml = isOwner ? `
    <div class="evt-comment-menu-wrap">
      <button class="evt-comment-menu-btn" data-cid="${cid}" title="더 보기">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
          <circle cx="12" cy="5"  r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      <div class="evt-comment-dropdown" id="cmt-menu-${cid}" style="display:none">
        <button class="evt-comment-dropdown-item evt-comment-edit-btn"   data-cid="${cid}">수정</button>
        <button class="evt-comment-dropdown-item evt-comment-delete-btn" data-cid="${cid}">삭제</button>
      </div>
    </div>` : '';

  /* 대댓글 수 + 입력 영역 (최상위 댓글만) */
  const replyCount   = isReply ? 0 : (replies ? replies.filter(r => r.replyTo === c.id).length : 0);
  const replyAreaHtml = isReply ? '' : `
    <div class="evt-comment-reply-area" id="reply-area-${cid}" style="display:none">
      ${_buildEditorHtml('reply-' + cid, { showCancel: true })}
    </div>`;

  /* 하단 액션 행 */
  const footerHtml = `
    <div class="evt-comment-footer">
      <div class="evt-comment-footer-left">
        ${!isReply ? `
        <button class="evt-comment-reply-count-btn" data-cid="${cid}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          ${replyCount}
        </button>
        <button class="evt-comment-reply-btn" data-cid="${cid}">댓글달기</button>` : ''}
      </div>
      <div class="evt-comment-footer-right">
        <button class="tip-vote-btn ${myLike ? 'liked' : ''}" data-cid="${cid}" data-action="like">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="15" height="15" style="flex-shrink:0"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
          <span class="tip-vote-count">${likedBy.length}</span>
        </button>
        <button class="tip-vote-btn dislike ${myDislike ? 'disliked' : ''}" data-cid="${cid}" data-action="dislike">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="15" height="15" style="flex-shrink:0"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
          <span class="tip-vote-count">${dislikedBy.length}</span>
        </button>
      </div>
    </div>`;

  const wrapClass = isReply ? 'evt-comment-item evt-comment-reply-item' : 'evt-comment-item';

  return `
    <div class="${wrapClass}" data-cid="${cid}">
      ${isReply ? '<div class="evt-comment-reply-indent"></div>' : ''}
      <div class="evt-comment-avatar">${avatarHtml}</div>
      <div class="evt-comment-body">
        <div class="evt-comment-header">
          <div class="evt-comment-meta-left">
            <div class="evt-comment-name-row">${roleBadge}<span class="evt-comment-nickname">${escHtml(c.nickname || '익명')}</span></div>
            <div class="evt-comment-time">${escHtml(timeStr)}${editedMark}</div>
          </div>
          ${menuHtml}
        </div>
        <div class="evt-comment-text" id="cmt-text-${cid}">${_sanitizeHtml(c.text || '')}</div>
        <div class="evt-comment-edit-area" id="cmt-edit-${cid}" style="display:none">
          ${_buildEditorHtml('edit-' + cid, { showCancel: true, submitLabel: '저장' })}
        </div>
        ${footerHtml}
        ${replyAreaHtml}
      </div>
    </div>`;
}

function _renderDetailComments(comments) {
  const list    = document.getElementById(_cmtCtx.listElId);
  const countEl = document.getElementById(_cmtCtx.countElId);
  if (!list) return;

  const topLevel = comments.filter(c => !c.replyTo);
  const replies  = comments.filter(c => !!c.replyTo);
  if (countEl) countEl.textContent = comments.length;
  // 이벤트 카드 댓글 수 배지도 실제 값으로 갱신
  if (_detailEventId && _cmtCtx.commentCol === 'eventComments') {
    const cardCmtEl = document.getElementById('ec-' + _detailEventId);
    if (cardCmtEl) {
      const numSpan = cardCmtEl.querySelector('span');
      if (numSpan) numSpan.textContent = comments.length;
    }
  }

  if (!topLevel.length) {
    list.innerHTML = '<div class="evt-comment-empty"><div class="evt-comment-empty-title">등록 된 댓글이 없습니다.</div><div class="evt-comment-empty-sub">첫번째 댓글을 작성해보세요!</div></div>';
    return;
  }

  list.innerHTML = topLevel.map(c => {
    const childReplies = replies
      .filter(r => r.replyTo === c.id)
      .sort((a, b) => {
        const ta = a.createdAt && a.createdAt.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const tb = b.createdAt && b.createdAt.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return ta - tb;
      });
    return _buildCommentHtml(c, false, replies) + childReplies.map(r => _buildCommentHtml(r, true, null)).join('');
  }).join('');

  // 이벤트 위임: list 자체에 한 번만 리스너를 등록하여
  // onSnapshot 재호출 시 리스너 중복 등록 방지
  if (!list._commentDelegated) {
    list._commentDelegated = true;
    list.addEventListener('click', e => {
      const del   = e.target.closest('.evt-comment-delete-btn[data-cid]');
      const edit  = e.target.closest('.evt-comment-edit-btn[data-cid]');
      const react = e.target.closest('.evt-comment-react-btn[data-action]');
      const reply = e.target.closest('.evt-comment-reply-btn[data-cid]');
      const menu  = e.target.closest('.evt-comment-menu-btn[data-cid]');

      if (del)   { _deleteDetailComment(del.dataset.cid); return; }
      if (edit)  { _openCommentEdit(edit.dataset.cid); return; }
      if (react) { _toggleCommentReaction(react.dataset.cid, react.dataset.action); return; }
      if (reply) { _toggleReplyArea(reply.dataset.cid); return; }
      if (menu)  { e.stopPropagation(); _toggleCommentMenu(menu.dataset.cid); return; }
    });
  }
}

/* ── 댓글 작성 ── */
async function submitDetailComment() {
  if (!_cmtCtx.parentId) return;
  const user    = (typeof currentUser !== 'undefined') ? currentUser : null;
  const profile = (typeof currentUserProfile !== 'undefined') ? currentUserProfile : null;

  if (!user || !profile) {
    document.getElementById('loginModalOverlay')?.classList.add('open');
    return;
  }

  const html = _getEditorContent(_cmtCtx.editorId);
  if (!_hasEditorContent(_cmtCtx.editorId)) return;
  const btn = document.getElementById('editor-submit-' + _cmtCtx.editorId);
  if (btn) btn.disabled = true;

  try {
    const commentData = {
      replyTo   : null,
      text      : html,
      uid       : user.uid,
      nickname  : profile.nickname || '익명',
      avatar    : profile.avatar   || '',
      likedBy   : [],
      dislikedBy: [],
      createdAt : firebase.firestore.FieldValue.serverTimestamp(),
    };
    commentData[_cmtCtx.queryField] = _cmtCtx.parentId;
    await db.collection(_cmtCtx.commentCol).add(commentData);
    await db.collection(_cmtCtx.parentCol).doc(_cmtCtx.parentId).update({
      commentCount: firebase.firestore.FieldValue.increment(1),
    });
    _clearEditor(_cmtCtx.editorId);
  } catch (e) {
    console.error('댓글 작성 실패:', e);
    showToast('댓글 작성에 실패했습니다. 다시 시도해주세요.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

/* ── 댓글 삭제 ── */
function _deleteDetailComment(cid) {
  const user = (typeof currentUser !== 'undefined') ? currentUser : null;
  if (!user) return;
  const overlay = document.getElementById('commentDeleteOverlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const close = () => {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  // 이벤트 중복 방지: 버튼 clone
  const confirmBtn = document.getElementById('commentDeleteConfirmBtn');
  const cancelBtn  = document.getElementById('commentDeleteCancelBtn');
  const newConfirm = confirmBtn.cloneNode(true);
  const newCancel  = cancelBtn.cloneNode(true);
  confirmBtn.replaceWith(newConfirm);
  cancelBtn.replaceWith(newCancel);

  newConfirm.addEventListener('click', async () => {
    close();
    try {
      await db.collection(_cmtCtx.commentCol).doc(cid).delete();
      await db.collection(_cmtCtx.parentCol).doc(_cmtCtx.parentId).update({
        commentCount: firebase.firestore.FieldValue.increment(-1),
      });
    } catch (e) {
      console.error('댓글 삭제 실패:', e);
      showToast('댓글 삭제에 실패했습니다.', 'error');
    }
  });
  newCancel.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); }, { once: true });
}


/* ── 댓글 수정: 열기 / 닫기 / 저장 ── */
function _openCommentEdit(cid) {
  const textEl = document.getElementById('cmt-text-' + cid);
  const editEl = document.getElementById('cmt-edit-' + cid);
  if (!textEl || !editEl) return;
  textEl.style.display = 'none';
  editEl.style.display = 'block';
  const editorId = 'edit-' + cid;
  const editorWrap = editEl.querySelector('[data-editor-id="' + editorId + '"]');
  if (editorWrap && !editorWrap.dataset.editorInit) {
    editorWrap.dataset.editorInit = '1';
    _initEditor(editorId, {
      onCancel: function() { _closeCommentEdit(cid); },
      onSubmit: function() { _saveCommentEdit(cid); }
    });
  }
  const contentEl = document.getElementById('editor-' + editorId);
  if (contentEl) {
    contentEl.innerHTML = textEl.innerHTML || '';
    const countEl = document.getElementById('editor-count-' + editorId);
    if (countEl) {
      const len = (contentEl.innerText || contentEl.textContent || '').length;
      countEl.textContent = len + ' / 1,000';
    }
    contentEl.focus();
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(contentEl);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function _closeCommentEdit(cid) {
  const textEl = document.getElementById('cmt-text-' + cid);
  const editEl = document.getElementById('cmt-edit-' + cid);
  if (textEl) textEl.style.display = '';
  if (editEl) editEl.style.display = 'none';
}

async function _saveCommentEdit(cid) {
  const user = (typeof currentUser !== 'undefined') ? currentUser : null;
  if (!user) return;
  const editorId = 'edit-' + cid;
  const html = _getEditorContent(editorId);
  if (!_hasEditorContent(editorId)) return;
  const saveBtn = document.getElementById('editor-submit-' + editorId);
  if (saveBtn) saveBtn.disabled = true;
  try {
    await db.collection(_cmtCtx.commentCol).doc(cid).update({
      text    : html,
      editedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    _closeCommentEdit(cid);
  } catch (e) {
    console.error('댓글 수정 실패:', e);
    showToast('댓글 수정에 실패했습니다.', 'error');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

/* ── 좋아요 / 싫어요 토글 ── */
async function _toggleCommentReaction(cid, action) {
  const user = (typeof currentUser !== 'undefined') ? currentUser : null;
  if (!user) { document.getElementById('loginModalOverlay')?.classList.add('open'); return; }
  const uid = user.uid;
  try {
    const ref  = db.collection(_cmtCtx.commentCol).doc(cid);
    const snap = await ref.get();
    if (!snap.exists) return;
    const data       = snap.data();
    const likedBy    = data.likedBy    || [];
    const dislikedBy = data.dislikedBy || [];
    const update     = {};
    if (action === 'like') {
      if (likedBy.includes(uid)) {
        update.likedBy = firebase.firestore.FieldValue.arrayRemove(uid);
      } else {
        update.likedBy = firebase.firestore.FieldValue.arrayUnion(uid);
        if (dislikedBy.includes(uid)) update.dislikedBy = firebase.firestore.FieldValue.arrayRemove(uid);
      }
    } else {
      if (dislikedBy.includes(uid)) {
        update.dislikedBy = firebase.firestore.FieldValue.arrayRemove(uid);
      } else {
        update.dislikedBy = firebase.firestore.FieldValue.arrayUnion(uid);
        if (likedBy.includes(uid)) update.likedBy = firebase.firestore.FieldValue.arrayRemove(uid);
      }
    }
    await ref.update(update);
  } catch (e) { console.error('반응 처리 실패:', e); }
}

/* ── 대댓글 입력창 토글 ── */
function _toggleReplyArea(parentId) {
  const user = (typeof currentUser !== 'undefined') ? currentUser : null;
  if (!user) { _showReplyLoginPopup(); return; }
  const area = document.getElementById('reply-area-' + parentId);
  if (!area) return;
  const isHidden = !area.style.display || area.style.display === 'none';
  area.style.display = isHidden ? 'block' : 'none';
  // '댓글달기' ↔ '취소' 라벨 토글
  const replyBtn = document.querySelector('.evt-comment-reply-btn[data-cid="' + parentId + '"]');
  if (replyBtn) replyBtn.textContent = isHidden ? '취소' : '댓글달기';
  if (isHidden) {
    if (!area.dataset.editorInit) {
      area.dataset.editorInit = '1';
      _initEditor('reply-' + parentId, {
        onCancel: function() { _toggleReplyArea(parentId); },
        onSubmit: function() { _submitReply(parentId); },
      });
    }
    const editorArea = document.getElementById('editor-reply-' + parentId);
    if (editorArea) editorArea.focus();
  }
}

/* ── 대댓글 제출 ── */
async function _submitReply(parentId) {
  const user    = (typeof currentUser !== 'undefined') ? currentUser : null;
  const profile = (typeof currentUserProfile !== 'undefined') ? currentUserProfile : null;
  if (!user || !profile) { document.getElementById('loginModalOverlay')?.classList.add('open'); return; }
  const html = _getEditorContent('reply-' + parentId);
  if (!_hasEditorContent('reply-' + parentId)) return;
  const btn = document.querySelector('.evt-comment-reply-submit[data-parent="' + parentId + '"]');
  if (btn) btn.disabled = true;
  try {
    const replyData = {
      replyTo   : parentId,
      text      : html,
      uid       : user.uid,
      nickname  : profile.nickname || '익명',
      avatar    : profile.avatar   || '',
      likedBy   : [],
      dislikedBy: [],
      createdAt : firebase.firestore.FieldValue.serverTimestamp(),
    };
    replyData[_cmtCtx.queryField] = _cmtCtx.parentId;
    await db.collection(_cmtCtx.commentCol).add(replyData);
    await db.collection(_cmtCtx.parentCol).doc(_cmtCtx.parentId).update({
      commentCount: firebase.firestore.FieldValue.increment(1),
    });
    _clearEditor('reply-' + parentId);
    _toggleReplyArea(parentId);
  } catch (e) {
    console.error('대댓글 작성 실패:', e);
    showToast('대댓글 작성에 실패했습니다.', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}


/* ── ⋮ 댓글 메뉴 토글 ── */
function _toggleCommentMenu(cid) {
  const menu = document.getElementById('cmt-menu-' + cid);
  if (!menu) return;
  const isOpen = menu.style.display !== 'none';
  // 다른 열린 메뉴 닫기
  document.querySelectorAll('.evt-comment-dropdown').forEach(m => { m.style.display = 'none'; });
  if (!isOpen) {
    menu.style.display = 'block';
    // 외부 클릭 시 닫기 (one-shot)
    const onOutside = e => {
      if (!menu.contains(e.target)) { menu.style.display = 'none'; document.removeEventListener('click', onOutside, true); }
    };
    setTimeout(() => document.addEventListener('click', onOutside, true), 0);
  }
}


/* ── Rich-text 에디터 헬퍼 ── */
function _sanitizeHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // meta·link·base·style 태그도 XSS/CSS injection 벡터 → 제거
  ['script','iframe','object','embed','form','input','meta','link','base','style'].forEach(function(tag) {
    tmp.querySelectorAll(tag).forEach(function(el) { el.remove(); });
  });
  tmp.querySelectorAll('*').forEach(function(el) {
    Array.from(el.attributes).forEach(function(attr) {
      if (attr.name.startsWith('on')) el.removeAttribute(attr.name);
      // style 속성 제거 — CSS expression/url() 기반 공격 방지
      if (attr.name === 'style') el.removeAttribute(attr.name);
      if ((attr.name === 'href' || attr.name === 'src') && /^javascript:/i.test(attr.value))
        el.removeAttribute(attr.name);
    });
  });
  return tmp.innerHTML;
}

function _getEditorContent(editorId) {
  var el = document.getElementById('editor-' + editorId);
  return el ? el.innerHTML.trim() : '';
}

function _getEditorText(editorId) {
  var el = document.getElementById('editor-' + editorId);
  return el ? (el.innerText || el.textContent || '').trim() : '';
}

function _hasEditorContent(editorId) {
  var el = document.getElementById('editor-' + editorId);
  if (!el) return false;
  if ((el.innerText || el.textContent || '').trim()) return true;
  return el.querySelector('img') !== null;
}

function _clearEditor(editorId) {
  var el  = document.getElementById('editor-' + editorId);
  var cnt = document.getElementById('editor-count-' + editorId);
  if (el)  el.innerHTML = '';
  if (cnt) cnt.textContent = '0 / 1,000';
}

function _buildEditorHtml(editorId, opts) {
  opts = opts || {};
  var cancelHtml = opts.showCancel
    ? '<button type="button" class="evt-comment-cancel-btn-sm evt-editor-cancel" data-editor-id="' + editorId + '">취소</button>'
    : '';
  var CUSTOM_EMOJIS = (function(){ var a=[]; for(var i=1;i<=39;i++) a.push('img/emoji/emogi'+i+'.png'); return a; })();
  var emojiItems = CUSTOM_EMOJIS.map(function(src,i){ return '<span class="evt-editor-emoji-item" data-src="'+src+'"><img src="'+src+'" alt="이모지'+(i+1)+'"></span>'; }).join('');
  var fontSizes = [11,13,15,16,19,24,28,30,34,38];
  var fontSizeItems = fontSizes.map(function(s){ return '<button type="button" class="evt-editor-fontsize-item" data-size="'+s+'">'+s+'</button>'; }).join('');
  return [
    '<div class="evt-editor-wrap' + (opts.bodyMode ? ' evt-body-editor' : '') + '" data-editor-id="' + editorId + '"' + (opts.bodyMode ? ' data-body="true"' : '') + '>',
    '  <div class="evt-editor-toolbar">',
    '    <button type="button" class="evt-editor-tool evt-editor-image-btn" data-editor-id="' + editorId + '" title="이미지/동영상"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M20 4h-3.17L15 2H9L7.17 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z"/></svg></button>',
    '    <span class="evt-editor-fontsize-wrap">',
    '      <button type="button" class="evt-editor-tool evt-editor-fontsize-btn" data-editor-id="' + editorId + '" title="글자 크기"><span class="evt-editor-fontsize-label" id="fontsize-label-' + editorId + '">15</span><svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10" style="margin-left:2px;flex-shrink:0"><path d="M7 10l5 5 5-5H7z"/></svg></button>',
    '      <div class="evt-editor-fontsize-dd" id="fontsize-dd-' + editorId + '" style="display:none">',
    fontSizeItems,
    '      </div>',
    '    </span>',
    '    <button type="button" class="evt-editor-tool" data-cmd="bold"          title="굵게"><b>B</b></button>',
    '    <button type="button" class="evt-editor-tool" data-cmd="italic"        title="기울임"><i>i</i></button>',
    '    <button type="button" class="evt-editor-tool" data-cmd="underline"     title="밑줄"><u>U</u></button>',
    '    <button type="button" class="evt-editor-tool" data-cmd="strikeThrough" title="취소선"><s>S</s></button>',
    '    <span class="evt-editor-color-wrap">',
    '      <button type="button" class="evt-editor-tool evt-editor-color-btn" data-editor-id="' + editorId + '" title="글자색"><span class="evt-editor-color-preview" id="color-preview-' + editorId + '" style="background:#ffffff"></span>A</button>',
    '      <div class="evt-editor-color-palette" id="color-palette-' + editorId + '" style="display:none">',
    '        <div class="evt-editor-color-swatches" id="color-swatches-' + editorId + '"></div>',
    '        <div class="evt-editor-color-actions">',
    '          <button type="button" class="evt-editor-color-clear-btn" id="color-clear-' + editorId + '" title="색상 제거"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>',
    '        </div>',
    '        <div class="evt-editor-color-hex-wrap">',
    '          <span class="evt-editor-color-hex-label">HEX Color</span>',
    '          <div class="evt-editor-color-hex-row">',
    '            <input type="text" class="evt-editor-color-hex-input" id="color-hex-' + editorId + '" placeholder="#ffffff" maxlength="7">',
    '            <button type="button" class="evt-editor-color-ok-btn" id="color-ok-' + editorId + '">OK</button>',
    '          </div>',
    '        </div>',
    '      </div>',
    '    </span>',
    '    <span class="evt-editor-align-wrap">',
    '      <button type="button" class="evt-editor-tool evt-editor-align-btn" data-editor-id="' + editorId + '" title="정렬"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M7 10l5 5 5-5H7z"/></svg></button>',
    '      <div class="evt-editor-align-dd" id="align-dd-' + editorId + '" style="display:none">',
    '        <button type="button" class="evt-editor-align-item" data-cmd="justifyLeft"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg>왼쪽 정렬</button>',
    '        <button type="button" class="evt-editor-align-item" data-cmd="justifyCenter"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M3 5h18v2H3V5zm3 4h12v2H6V9zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg>가운데 정렬</button>',
    '        <button type="button" class="evt-editor-align-item" data-cmd="justifyRight"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M3 5h18v2H3V5zm6 4h12v2H9V9zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/></svg>오른쪽 정렬</button>',
    '        <button type="button" class="evt-editor-align-item" data-cmd="justifyFull"><svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg>양끝 정렬</button>',
    '      </div>',
    '    </span>',
    '    <span class="evt-editor-emoji-wrap">',
    '      <button type="button" class="evt-editor-tool evt-editor-emoji-btn" data-editor-id="' + editorId + '" title="이모지"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg></button>',
    '      <div class="evt-editor-emoji-picker" id="emoji-picker-' + editorId + '" style="display:none">',
    '        <div class="evt-editor-emoji-scroll" id="emoji-grid-' + editorId + '">' + emojiItems + '</div>',
    '      </div>',
    '    </span>',
    '    <button type="button" class="evt-editor-tool evt-editor-link-btn" data-editor-id="' + editorId + '" title="링크"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg></button>',
    '    <button type="button" class="evt-editor-tool" data-cmd="insertHorizontalRule" title="구분선"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M19 11H5c-.55 0-1 .45-1 1s.45 1 1 1h14c.55 0 1-.45 1-1s-.45-1-1-1z"/></svg></button>',
    '  </div>',
    '  <div class="evt-editor-area" id="editor-' + editorId + '" contenteditable="true" data-placeholder="' + (opts.bodyMode ? '내용을 입력하세요' : '댓글을 입력하세요') + '"></div>',
    '  <div class="evt-editor-footer">',
    '    <span class="evt-editor-charcount" id="editor-count-' + editorId + '">0 / 1,000</span>',
    opts.bodyMode
      ? '    <div class="evt-editor-actions"></div>'
      : '    <div class="evt-editor-actions">' + cancelHtml + '<button type="button" class="evt-comment-submit-btn" id="editor-submit-' + editorId + '">' + (opts.submitLabel || '등록') + '</button></div>',
    '  </div>',
    '</div>'
  ].join('\n');
}

function _initEditor(editorId, opts) {
  opts = opts || {};
  var wrap  = document.querySelector('.evt-editor-wrap[data-editor-id="' + editorId + '"]');
  if (!wrap) return;
  var area  = document.getElementById('editor-' + editorId);
  var count = document.getElementById('editor-count-' + editorId);
  if (!area) return;

  var isBody = wrap.dataset.body === 'true';
  var MAX = isBody ? Infinity : 1000;
  if (isBody && count) count.style.display = 'none';
  var _savedRange = null;

  function saveRange() {
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && area.contains(sel.anchorNode)) {
      _savedRange = sel.getRangeAt(0).cloneRange();
    }
  }
  function restoreRange() {
    area.focus();
    if (!_savedRange) return;
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(_savedRange);
  }
  function updateCount() {
    if (isBody) return;
    var len = (area.innerText || area.textContent || '').replace(/\n$/, '').length;
    if (count) count.textContent = Math.min(len, MAX) + ' / 1,000';
  }

  area.addEventListener('input', function() {
    if (!isBody) {
      var txt = area.innerText || area.textContent || '';
      if (txt.length > MAX) document.execCommand('undo');
      updateCount();
    }
  });

  /* 포맷 버튼 활성 상태 표시 (B/i/U/S) */
  var _fmtCmds = ['bold','italic','underline','strikeThrough'];
  var _fmtBtns = {};
  _fmtCmds.forEach(function(cmd) { _fmtBtns[cmd] = wrap.querySelector('.evt-editor-tool[data-cmd="' + cmd + '"]'); });
  function _isSelectionInArea() {
    var sel = window.getSelection();
    return sel && sel.rangeCount > 0 && area.contains(sel.getRangeAt(0).commonAncestorContainer);
  }
  function _updateFmtActive() {
    var inArea = _isSelectionInArea();
    _fmtCmds.forEach(function(cmd) {
      if (_fmtBtns[cmd]) _fmtBtns[cmd].classList.toggle('active', inArea && document.queryCommandState(cmd));
    });
  }
  area.addEventListener('keydown', _updateFmtActive);
  area.addEventListener('mousedown', _updateFmtActive);
  document.addEventListener('selectionchange', _updateFmtActive);

  /* execCommand 버튼 */
  wrap.querySelectorAll('.evt-editor-tool[data-cmd]').forEach(function(btn) {
    btn.addEventListener('mousedown', function(e) {
      e.preventDefault();
      document.execCommand(btn.dataset.cmd, false, null);
      _updateFmtActive();
      area.focus(); updateCount();
    });
  });

  /* ── 모바일 트레이 헬퍼 (드롭다운 → 툴바 위 슬라이드 트레이) ── */
  function _getMTray(btn) {
    var dock = btn.closest('.bwm-toolbar-dock');
    if (!dock) return null;
    var tray = dock.querySelector('.evt-mobile-tray');
    if (!tray) {
      tray = document.createElement('div');
      tray.className = 'evt-mobile-tray';
      var tb = dock.querySelector('.evt-editor-toolbar');
      dock.insertBefore(tray, tb || dock.firstChild);
      document.addEventListener('click', function(e) {
        if (!dock.contains(e.target)) _closeMTray(tray);
      });
    }
    return tray;
  }
  function _closeMTray(tray) {
    if (!tray) return;
    tray.classList.remove('open');
    setTimeout(function() { if (!tray.classList.contains('open')) tray.innerHTML = ''; }, 250);
  }
  function _openMTray(btn, key, innerHtml, onReady) {
    var tray = _getMTray(btn);
    if (!tray) return false;
    var already = tray.classList.contains('open') && tray.dataset.tk === key;
    _closeMTray(tray);
    if (!already) {
      tray.dataset.tk = key;
      tray.innerHTML = '<div class="evt-tray-inner">' + innerHtml + '</div>';
      void tray.offsetWidth;
      tray.classList.add('open');
      if (onReady) onReady(tray.querySelector('.evt-tray-inner'));
    }
    return true;
  }

  /* 정렬 드롭다운 */
  var alignBtn = wrap.querySelector('.evt-editor-align-btn');
  var alignDd  = document.getElementById('align-dd-' + editorId);
  if (alignBtn && alignDd) {
    alignBtn.addEventListener('mousedown', function(e) { e.preventDefault(); });
    alignBtn.addEventListener('click', function() {
      var tHtml = [
        '<button class="evt-editor-tool evt-tray-item" data-cmd="justifyLeft" title="왼쪽 정렬"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z"/></svg></button>',
        '<button class="evt-editor-tool evt-tray-item" data-cmd="justifyCenter" title="가운데 정렬"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 5h18v2H3V5zm3 4h12v2H6V9zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z"/></svg></button>',
        '<button class="evt-editor-tool evt-tray-item" data-cmd="justifyRight" title="오른쪽 정렬"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 5h18v2H3V5zm6 4h12v2H9V9zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z"/></svg></button>',
        '<button class="evt-editor-tool evt-tray-item" data-cmd="justifyFull" title="양끝 정렬"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z"/></svg></button>'
      ].join('');
      if (_openMTray(alignBtn, 'align', tHtml, function(inner) {
        inner.querySelectorAll('.evt-tray-item[data-cmd]').forEach(function(it) {
          it.addEventListener('mousedown', function(e) { e.preventDefault(); });
          it.addEventListener('click', function() {
            document.execCommand(it.dataset.cmd, false, null);
            _closeMTray(_getMTray(alignBtn));
            area.focus();
          });
        });
      })) return;
      alignDd.style.display = alignDd.style.display === 'none' ? 'block' : 'none';
    });
    alignDd.querySelectorAll('.evt-editor-align-item').forEach(function(item) {
      item.addEventListener('mousedown', function(e) {
        e.preventDefault();
        document.execCommand(item.dataset.cmd, false, null);
        alignDd.style.display = 'none';
        area.focus();
      });
    });
    document.addEventListener('click', function(e) {
      if (!alignBtn.contains(e.target) && !alignDd.contains(e.target))
        alignDd.style.display = 'none';
    });
  }

  /* 글자 크기 드롭다운 */
  var fontsizeBtn   = wrap.querySelector('.evt-editor-fontsize-btn');
  var fontsizeDd    = document.getElementById('fontsize-dd-' + editorId);
  var fontsizeLabel = document.getElementById('fontsize-label-' + editorId);
  if (fontsizeBtn && fontsizeDd) {
    function _applyFontSize(px) {
      restoreRange();
      document.execCommand('fontSize', false, '7');
      area.querySelectorAll('font[size="7"]').forEach(function(el) {
        el.removeAttribute('size');
        el.style.fontSize = px + 'px';
      });
      if (fontsizeLabel) fontsizeLabel.textContent = px;
      area.focus(); updateCount();
    }
    fontsizeBtn.addEventListener('mousedown', function(e) { e.preventDefault(); saveRange(); });
    fontsizeBtn.addEventListener('click', function() {
      var sizes = [11,13,15,16,19,24,28,30,34,38];
      var tHtml = sizes.map(function(s) {
        return '<button class="evt-editor-tool evt-tray-fs-item" data-size="'+s+'" style="min-width:34px;font-size:12px;font-weight:600;">'+s+'</button>';
      }).join('');
      if (_openMTray(fontsizeBtn, 'fontsize', tHtml, function(inner) {
        inner.querySelectorAll('.evt-tray-fs-item').forEach(function(it) {
          it.addEventListener('mousedown', function(e) { e.preventDefault(); });
          it.addEventListener('click', function() {
            _applyFontSize(it.dataset.size);
            _closeMTray(_getMTray(fontsizeBtn));
          });
        });
      })) return;
      fontsizeDd.style.display = fontsizeDd.style.display === 'none' ? 'block' : 'none';
    });
    fontsizeDd.querySelectorAll('.evt-editor-fontsize-item').forEach(function(item) {
      item.addEventListener('mousedown', function(e) { e.preventDefault(); });
      item.addEventListener('click', function() {
        _applyFontSize(item.dataset.size);
        fontsizeDd.style.display = 'none';
      });
    });
    document.addEventListener('click', function(e) {
      if (!fontsizeBtn.contains(e.target) && !fontsizeDd.contains(e.target))
        fontsizeDd.style.display = 'none';
    });
  }

  /* 글자색 */
  var colorBtn      = wrap.querySelector('.evt-editor-color-btn');
  var colorPalette  = document.getElementById('color-palette-'  + editorId);
  var colorPreview  = document.getElementById('color-preview-'  + editorId);
  var colorSwatches = document.getElementById('color-swatches-' + editorId);
  var colorHexInput = document.getElementById('color-hex-'      + editorId);
  var colorOkBtn    = document.getElementById('color-ok-'       + editorId);
  var colorClearBtn = document.getElementById('color-clear-'    + editorId);
  if (colorBtn && colorPalette) {
    var _palette = [
      '#006464','#006480','#003280','#480080','#000000',
      '#008040','#008080','#0040c0','#800080','#404040',
      '#60c030','#00c0c0','#4080d0','#a040c0','#808080',
      '#c0c000','#d06000','#d03030','#d04080','#c0c0c0',
      '#ffffa0','#ffc060','#ff8080','#ffb0c0','#ffffff'
    ];
    colorSwatches.innerHTML = _palette.map(function(c) {
      return '<span class="evt-editor-color-swatch" data-color="'+c+'" style="background:'+c+'"></span>';
    }).join('');
    function _applyColor(color) {
      restoreRange();
      document.execCommand('foreColor', false, color);
      if (colorPreview) colorPreview.style.background = color;
      if (colorHexInput) colorHexInput.value = color;
      colorPalette.style.display = 'none';
      area.focus();
    }
    colorBtn.addEventListener('mousedown', function(e) { e.preventDefault(); saveRange(); });
    colorBtn.addEventListener('click', function() {
      var tHtml = _palette.map(function(c) {
        return '<span class="evt-tray-color-sw" data-color="'+c+'" style="background:'+c+';width:26px;height:26px;border-radius:3px;cursor:pointer;border:1px solid rgba(255,255,255,0.08);flex-shrink:0;display:inline-block;"></span>';
      }).join('') +
      '<span class="evt-tray-color-clear" style="cursor:pointer;padding:0 6px;display:flex;align-items:center;flex-shrink:0;" title="색상 제거"><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></span>';
      if (_openMTray(colorBtn, 'color', tHtml, function(inner) {
        inner.querySelectorAll('.evt-tray-color-sw').forEach(function(sw) {
          sw.addEventListener('mousedown', function(e) { e.preventDefault(); });
          sw.addEventListener('click', function() { _applyColor(sw.dataset.color); _closeMTray(_getMTray(colorBtn)); });
        });
        var clr = inner.querySelector('.evt-tray-color-clear');
        if (clr) {
          clr.addEventListener('mousedown', function(e) { e.preventDefault(); });
          clr.addEventListener('click', function() {
            restoreRange();
            document.execCommand('removeFormat', false, null);
            if (colorPreview) colorPreview.style.background = '#ffffff';
            _closeMTray(_getMTray(colorBtn));
            area.focus();
          });
        }
      })) return;
      colorPalette.style.display = colorPalette.style.display === 'none' ? 'block' : 'none';
    });
    colorSwatches.querySelectorAll('.evt-editor-color-swatch').forEach(function(sw) {
      sw.addEventListener('mousedown', function(e) { e.preventDefault(); });
      sw.addEventListener('click', function() { _applyColor(sw.dataset.color); });
    });
    if (colorClearBtn) {
      colorClearBtn.addEventListener('mousedown', function(e) { e.preventDefault(); });
      colorClearBtn.addEventListener('click', function() {
        restoreRange();
        document.execCommand('removeFormat', false, null);
        if (colorPreview) colorPreview.style.background = '#ffffff';
        colorPalette.style.display = 'none';
        area.focus();
      });
    }
    if (colorOkBtn && colorHexInput) {
      colorOkBtn.addEventListener('mousedown', function(e) { e.preventDefault(); });
      colorOkBtn.addEventListener('click', function() {
        var val = colorHexInput.value.trim();
        if (!/^#[0-9a-fA-F]{3,6}$/.test(val)) return;
        _applyColor(val);
      });
      colorHexInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { e.preventDefault(); colorOkBtn.click(); }
      });
    }
    document.addEventListener('click', function(e) {
      if (!colorBtn.contains(e.target) && !colorPalette.contains(e.target))
        colorPalette.style.display = 'none';
    });
  }

  /* 링크 */
  var linkBtn = wrap.querySelector('.evt-editor-link-btn');
  if (linkBtn) {
    linkBtn.addEventListener('mousedown', function(e) { e.preventDefault(); saveRange(); });
    linkBtn.addEventListener('click', async function() {
      var url = await _showUrlPrompt('링크 URL을 입력하세요', 'https://');
      if (!url) return;
      restoreRange();
      document.execCommand('createLink', false, url);
      area.querySelectorAll('a:not([target])').forEach(function(a) { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
      area.focus();
    });
  }

  /* 이모지 — _getOrCreateEmojiKbPanel은 모바일 툴바에서도 사용 */
  function _getOrCreateEmojiKbPanel() {
    var panel = document.getElementById('evt-emoji-kb-panel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'evt-emoji-kb-panel';
    panel.className = 'evt-emoji-kb-panel';
    var srcs = [];
    for (var k = 1; k <= 39; k++) srcs.push('img/emoji/emogi'+k+'.png');
    var items = srcs.map(function(src, idx) {
      return '<span class="evt-ekb-item" data-src="'+src+'"><img src="'+src+'" alt="이모지'+(idx+1)+'" loading="lazy"></span>';
    }).join('');
    panel.innerHTML =
      '<div class="evt-ekb-header"><span class="evt-ekb-title">이모지</span><button type="button" class="evt-ekb-close-btn" aria-label="닫기"><svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button></div>' +
      '<div class="evt-ekb-grid">'+items+'</div>';
    panel.querySelector('.evt-ekb-close-btn').addEventListener('click', function() {
      panel.classList.remove('open');
      panel.style.bottom = '';
      var eb = document.getElementById('bwmMEmojiBtn');
      if (eb) eb.classList.remove('active');
    });
    document.body.appendChild(panel);
    return panel;
  }

  var emojiBtn    = wrap.querySelector('.evt-editor-emoji-btn');
  var emojiPicker = document.getElementById('emoji-picker-' + editorId);
  if (emojiBtn && emojiPicker) {
    /* 데스크탑용 팝업 아이템 클릭 핸들러 */
    var emojiGrid = document.getElementById('emoji-grid-' + editorId);
    if (emojiGrid) {
      emojiGrid.querySelectorAll('.evt-editor-emoji-item').forEach(function(item) {
        item.addEventListener('click', function() {
          restoreRange();
          document.execCommand('insertHTML', false, '<img src="'+item.dataset.src+'" class="evt-comment-emoji-img" alt="이모지">');
          emojiPicker.style.display = 'none';
          updateCount();
        });
      });
    }
    emojiBtn.addEventListener('mousedown', function(e) { e.preventDefault(); saveRange(); });
    emojiBtn.addEventListener('click', function() {
      var isMob = ('ontouchstart' in window) || window.innerWidth <= 768;
      if (isMob) {
        area.blur(); /* 키보드 내리기 */
        var panel = _getOrCreateEmojiKbPanel();
        if (panel.classList.contains('open') && panel._eid === editorId) {
          panel.classList.remove('open');
          return;
        }
        panel._eid = editorId;
        /* 이모지 클릭 → 현재 에디터에 삽입 */
        panel.onclick = function(e) {
          var it = e.target.closest('.evt-ekb-item');
          if (!it) return;
          restoreRange();
          document.execCommand('insertHTML', false, '<img src="'+it.dataset.src+'" class="evt-comment-emoji-img" alt="이모지">');
          updateCount();
        };
        void panel.offsetWidth;
        panel.classList.add('open');
        return;
      }
      /* 데스크탑: 기존 팝업 */
      emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'block' : 'none';
    });
    document.addEventListener('click', function(e) {
      if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target))
        emojiPicker.style.display = 'none';
    });
    /* 에디터 포커스 시 이모지 패널 닫기 */
    area.addEventListener('focus', function() {
      var panel = document.getElementById('evt-emoji-kb-panel');
      if (panel) { panel.classList.remove('open'); panel.style.bottom = ''; }
      var eb2 = document.getElementById('bwmMEmojiBtn');
      if (eb2) eb2.classList.remove('active');
    });
  }

  /* 이미지 / 동영상 */
  var imageBtn = wrap.querySelector('.evt-editor-image-btn');
  if (imageBtn) {
    var fileInput = document.getElementById('img-file-' + editorId);
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.type = 'file'; fileInput.accept = 'image/*,video/*';
      fileInput.id = 'img-file-' + editorId;
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
    } else {
      fileInput.accept = 'image/*,video/*';
    }
    imageBtn.addEventListener('mousedown', function(e) { e.preventDefault(); saveRange(); });
    imageBtn.addEventListener('click', function() { fileInput.click(); });
    fileInput.addEventListener('change', function() {
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        restoreRange();
        if (file.type.startsWith('video/')) {
          document.execCommand('insertHTML', false,
            '<video src="' + ev.target.result + '" controls style="max-width:100%;display:block;margin:4px 0"></video>');
        } else {
          document.execCommand('insertImage', false, ev.target.result);
          area.querySelectorAll('img').forEach(function(img) { img.style.maxWidth = '100%'; });
        }
        area.focus(); updateCount();
      };
      reader.readAsDataURL(file);
      fileInput.value = '';
    });
  }

  /* 초기 HTML (수정 모드) */
  if (opts.initialHtml) {
    area.innerHTML = opts.initialHtml;
    updateCount();
  }

  /* 취소 버튼 */
  var cancelBtn = wrap.querySelector('.evt-editor-cancel');
  if (cancelBtn && opts.onCancel) cancelBtn.addEventListener('click', opts.onCancel);

  /* 등록 버튼 */
  var submitBtn = document.getElementById('editor-submit-' + editorId);
  if (submitBtn && opts.onSubmit) submitBtn.addEventListener('click', opts.onSubmit);

  /* ── 모바일 전용 도크 툴바 (bwm 오버레이에서만) ── */
  (function() {
    if (!wrap.closest('.bwm-overlay')) return;
    var mDock = document.getElementById('bwmToolbarDock');
    if (!mDock) return;

    var SIZES = [11,13,15,16,19,24,28,30,34,38];
    var SWATCHES = [
      {label:'색 없음', value:''},
      {label:'흰색',   value:'#ffffff'},
      {label:'회색',   value:'#888888'},
      {label:'검은색', value:'#000000'},
      {label:'빨강',   value:'#ff4444'},
      {label:'주황',   value:'#ff8c00'},
      {label:'노랑',   value:'#ffd600'},
      {label:'연두',   value:'#a8e06d'},
      {label:'초록',   value:'#22c55e'},
      {label:'청록',   value:'#00b4b4'},
      {label:'하늘',   value:'#5bc4ef'},
      {label:'파랑',   value:'#3b7aff'},
      {label:'보라',   value:'#9b59b6'},
      {label:'핑크',   value:'#ff69b4'}
    ];
    var BACK_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';

    mDock.innerHTML = [
      '<div class="bwm-mtb">',
      '  <div class="bwm-fmt-tray" id="bwmFmtTray"><div class="bwm-tray-panel" id="bwmTrayPanel"></div></div>',
      '  <div class="bwm-main-tb">',
      '    <button type="button" class="bwm-mtb-btn" id="bwmMMediaBtn" title="미디어">',
      '      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M20 4h-3.17L15 2H9L7.17 4H4C2.9 4 2 4.9 2 6v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.65 0-3 1.35-3 3s1.35 3 3 3 3-1.35 3-3-1.35-3-3-3z"/></svg>',
      '    </button>',
      '    <button type="button" class="bwm-mtb-btn bwm-fmt-toggle" id="bwmFmtToggle" title="서식">',
      '      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M5 4v3h5.5v12h3V7H19V4z"/></svg>',
      '    </button>',
      '    <button type="button" class="bwm-mtb-btn" id="bwmMEmojiBtn" title="이모지">',
      '      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/></svg>',
      '    </button>',
      '    <button type="button" class="bwm-mtb-btn" id="bwmMLinkBtn" title="링크">',
      '      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
      '    </button>',
      '    <button type="button" class="bwm-mtb-btn" id="bwmMHrBtn" title="구분선">',
      '      <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M19 11H5c-.55 0-1 .45-1 1s.45 1 1 1h14c.55 0 1-.45 1-1s-.45-1-1-1z"/></svg>',
      '    </button>',
      '  </div>',
      '</div>'
    ].join('');

    var fmtTray   = document.getElementById('bwmFmtTray');
    var trayPanel = document.getElementById('bwmTrayPanel');
    var fmtToggle = document.getElementById('bwmFmtToggle');
    var fmtOpen   = false;
    var trayView  = '';
    /* 서식 상태 — BWM 트레이 ↔ 서식 툴바 동기화용 */
    var _curFontSize = 15;
    var _curAlignCmd = 'justifyLeft';
    var _curColor    = '#ffffff';
    var _curBgColor  = '';

    function _isDark() {
      var th = document.documentElement.getAttribute('data-theme');
      if (th === 'dark') return true;
      if (th === 'light') return false;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function _swatchesHtml() {
      return SWATCHES.map(function(sw) {
        if (!sw.value) return '<button type="button" class="bwm-tray-sw bwm-sw-none" data-color="" title="'+sw.label+'">없음</button>';
        return '<button type="button" class="bwm-tray-sw" data-color="'+sw.value+'" title="'+sw.label+'" style="background:'+sw.value+'"></button>';
      }).join('');
    }

    var _alignPaths = {
      justifyLeft:   'M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z',
      justifyCenter: 'M3 5h18v2H3V5zm3 4h12v2H6V9zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z',
      justifyRight:  'M3 5h18v2H3V5zm6 4h12v2H9V9zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z',
      justifyFull:   'M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z',
    };
    function _viewHtml(v) {
      var alignPath = _alignPaths[_curAlignCmd] || _alignPaths['justifyLeft'];
      var bgStyle   = _curBgColor ? ' style="background:' + _curBgColor + ';border-radius:3px;"' : '';
      if (v === 'fmt') return [
        '<button type="button" class="bwm-tray-btn bwm-tv" data-view="size"><span class="bwm-sizelabel">' + _curFontSize + '</span></button>',
        '<button type="button" class="bwm-tray-btn bwm-tv" data-view="align"><svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="' + alignPath + '"/></svg></button>',
        '<button type="button" class="bwm-tray-btn bwm-tc" data-cmd="bold"><b>B</b></button>',
        '<button type="button" class="bwm-tray-btn bwm-tc" data-cmd="underline"><u>U</u></button>',
        '<button type="button" class="bwm-tray-btn bwm-tv" data-view="color"><span class="bwm-colorlabel" style="color:' + _curColor + ';-webkit-text-stroke:' + (_curColor === '#ffffff' || _curColor === '' ? '0.5px #888' : '0') + '">T</span></button>',
        '<button type="button" class="bwm-tray-btn bwm-tv" data-view="bgcolor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" width="20" height="20"><rect x="4" y="4" width="16" height="16" rx="2"' + bgStyle + '/></svg></button>',
        '<button type="button" class="bwm-tray-btn bwm-tc" data-cmd="strikeThrough"><s>S</s></button>',
      ].join('');

      if (v === 'size') return '<button type="button" class="bwm-tray-btn bwm-back">'+BACK_SVG+'</button>' +
        SIZES.map(function(s){ return '<button type="button" class="bwm-tray-btn bwm-ts" data-size="'+s+'">'+s+'</button>'; }).join('');

      if (v === 'align') return '<button type="button" class="bwm-tray-btn bwm-back">'+BACK_SVG+'</button>' + [
        ['justifyLeft',  '왼쪽',  'M3 5h18v2H3V5zm0 4h12v2H3V9zm0 4h18v2H3v-2zm0 4h12v2H3v-2z'],
        ['justifyCenter','가운데','M3 5h18v2H3V5zm3 4h12v2H6V9zm-3 4h18v2H3v-2zm3 4h12v2H6v-2z'],
        ['justifyRight', '오른쪽','M3 5h18v2H3V5zm6 4h12v2H9V9zm-6 4h18v2H3v-2zm6 4h12v2H9v-2z'],
        ['justifyFull',  '양쪽',  'M3 5h18v2H3V5zm0 4h18v2H3V9zm0 4h18v2H3v-2zm0 4h18v2H3v-2z'],
      ].map(function(a){
        return '<button type="button" class="bwm-tray-btn bwm-ta" data-cmd="'+a[0]+'" title="'+a[1]+'">' +
          '<svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="'+a[2]+'"/></svg>' +
          '<span class="bwm-ta-lbl">'+a[1]+'</span></button>';
      }).join('');

      if (v === 'color' || v === 'bgcolor')
        return '<button type="button" class="bwm-tray-btn bwm-back">'+BACK_SVG+'</button>' + _swatchesHtml();

      return '';
    }

    function _bindView() {
      /* back → fmt */
      trayPanel.querySelectorAll('.bwm-back').forEach(function(b) {
        b.addEventListener('mousedown', function(e){ e.preventDefault(); });
        b.addEventListener('click', function(){ _showView('fmt'); });
      });
      /* view switch (size/align/color/bgcolor) */
      trayPanel.querySelectorAll('.bwm-tv').forEach(function(b) {
        b.addEventListener('mousedown', function(e){ e.preventDefault(); });
        b.addEventListener('click', function(){ _showView(b.dataset.view); });
      });
      /* direct format cmd: B, U, S */
      trayPanel.querySelectorAll('.bwm-tc').forEach(function(b) {
        b.addEventListener('mousedown', function(e){ e.preventDefault(); saveRange(); });
        b.addEventListener('click', function(){
          restoreRange();
          document.execCommand(b.dataset.cmd, false, null);
          area.focus();
        });
      });
      /* align items */
      trayPanel.querySelectorAll('.bwm-ta').forEach(function(b) {
        b.addEventListener('mousedown', function(e){ e.preventDefault(); saveRange(); });
        b.addEventListener('click', function(){
          restoreRange();
          document.execCommand(b.dataset.cmd, false, null);
          _curAlignCmd = b.dataset.cmd;
          area.focus();
          _showView('fmt');
        });
      });
      /* font size */
      trayPanel.querySelectorAll('.bwm-ts').forEach(function(b) {
        b.addEventListener('mousedown', function(e){ e.preventDefault(); saveRange(); });
        b.addEventListener('click', function(){
          restoreRange();
          document.execCommand('fontSize', false, '7');
          area.querySelectorAll('font[size="7"]').forEach(function(el){
            el.removeAttribute('size');
            el.style.fontSize = b.dataset.size + 'px';
          });
          _curFontSize = b.dataset.size;
          if (fontsizeLabel) fontsizeLabel.textContent = b.dataset.size;
          area.focus();
          _showView('fmt');
        });
      });
      /* color swatches */
      if (trayView === 'color') {
        trayPanel.querySelectorAll('.bwm-tray-sw').forEach(function(b) {
          b.addEventListener('mousedown', function(e){ e.preventDefault(); saveRange(); });
          b.addEventListener('click', function(){
            restoreRange();
            var c = b.dataset.color || (_isDark() ? '#ffffff' : '#000000');
            document.execCommand('foreColor', false, c);
            _curColor = c;
            if (colorPreview) colorPreview.style.background = c;
            if (colorHexInput) colorHexInput.value = c;
            area.focus();
            _showView('fmt');
          });
        });
      }
      /* bgcolor swatches */
      if (trayView === 'bgcolor') {
        trayPanel.querySelectorAll('.bwm-tray-sw').forEach(function(b) {
          b.addEventListener('mousedown', function(e){ e.preventDefault(); saveRange(); });
          b.addEventListener('click', function(){
            restoreRange();
            var c = b.dataset.color;
            document.execCommand('hiliteColor', false, c || 'transparent');
            _curBgColor = c || '';
            area.focus();
            _showView('fmt');
          });
        });
      }
    }

    function _updateFmtTrayActive() {
      if (trayView !== 'fmt') return;
      var inArea = _isSelectionInArea();
      trayPanel.querySelectorAll('.bwm-tc').forEach(function(b) {
        var active = inArea && document.queryCommandState(b.dataset.cmd);
        b.classList.toggle('active', active);
      });
    }
    function _showView(v) {
      trayView = v;
      trayPanel.innerHTML = _viewHtml(v);
      /* fmt 뷰: 아이콘 균등 배치 클래스 */
      if (v === 'fmt') {
        trayPanel.classList.add('bwm-panel-fmt');
        _updateFmtTrayActive();
      } else {
        trayPanel.classList.remove('bwm-panel-fmt');
      }
      _bindView();
    }
    /* 선택 변경 시 B/U/S 활성 상태 동기화 */
    document.addEventListener('selectionchange', function() {
      if (fmtOpen && trayView === 'fmt') _updateFmtTrayActive();
    });

    /* 서식 토글 */
    fmtToggle.addEventListener('mousedown', function(e){ e.preventDefault(); });
    fmtToggle.addEventListener('click', function(){
      fmtOpen = !fmtOpen;
      fmtToggle.classList.toggle('active', fmtOpen);
      fmtTray.classList.toggle('open', fmtOpen);
      /* 서식 트레이가 열리면 content-area 패딩 확장해서 내용 가려짐 방지 */
      var contentArea = document.querySelector('.bwm-content-area');
      if (contentArea) {
        contentArea.style.paddingBottom = fmtOpen ? '108px' : '58px';
      }
      if (fmtOpen) _showView('fmt');
    });

    /* 📷 미디어 */
    var mMediaBtn = document.getElementById('bwmMMediaBtn');
    if (mMediaBtn) {
      mMediaBtn.addEventListener('mousedown', function(e){ e.preventDefault(); saveRange(); });
      mMediaBtn.addEventListener('click', function(){
        var fi = document.getElementById('img-file-' + editorId);
        if (fi) fi.click();
      });
    }

    /* 😊 이모지 */
    var mEmojiBtn = document.getElementById('bwmMEmojiBtn');
    if (mEmojiBtn) {
      /* 이모지 패널 닫기 (도크 위치 복원) */
      function _closeEmojiPanel() {
        var panel = document.getElementById('evt-emoji-kb-panel');
        if (!panel) return;
        panel.classList.remove('open');
        panel.style.bottom = '';
        mEmojiBtn.classList.remove('active');
      }
      /* 에디터 포커스 시 패널 자동 닫기 */
      area.addEventListener('focus', function() { _closeEmojiPanel(); });

      mEmojiBtn.addEventListener('mousedown', function(e){ e.preventDefault(); saveRange(); });
      mEmojiBtn.addEventListener('click', function(){
        var panel = _getOrCreateEmojiKbPanel();
        /* 토글: 열려 있으면 닫고 키보드 복귀 */
        if (panel.classList.contains('open') && panel._eid === editorId) {
          _closeEmojiPanel();
          setTimeout(function(){ area.focus(); }, 50);
          return;
        }
        area.blur(); /* 키보드 내리기 */
        mEmojiBtn.classList.add('active');
        panel._eid = editorId;
        panel.onclick = function(e) {
          var it = e.target.closest('.evt-ekb-item');
          if (!it) return;
          restoreRange();
          document.execCommand('insertHTML', false, '<img src="'+it.dataset.src+'" class="evt-comment-emoji-img" alt="이모지">');
          updateCount();
        };
        /* 키보드 사라진 후 도크 높이 계산해서 패널을 도크 바로 위에 배치 */
        setTimeout(function() {
          var dockH = mDock.getBoundingClientRect().height;
          panel.style.bottom = (dockH > 0 ? dockH : 54) + 'px';
          void panel.offsetWidth;
          panel.classList.add('open');
        }, 60);
      });
    }

    /* 🔗 링크 */
    var mLinkBtn = document.getElementById('bwmMLinkBtn');
    if (mLinkBtn) {
      mLinkBtn.addEventListener('mousedown', function(e){ e.preventDefault(); saveRange(); });
      mLinkBtn.addEventListener('click', async function(){
        var sel = window.getSelection();
        var hasSelection = sel && !sel.isCollapsed;
        saveRange();
        var url = await _showUrlPrompt('링크 URL을 입력하세요', 'https://');
        if (!url) return;
        restoreRange();
        if (hasSelection) {
          document.execCommand('createLink', false, url);
        } else {
          document.execCommand('insertHTML', false,
            '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>');
        }
        area.querySelectorAll('a:not([target])').forEach(function(a){ a.target='_blank'; a.rel='noopener noreferrer'; });
        area.focus();
      });
    }

    /* ─ 구분선 */
    var mHrBtn = document.getElementById('bwmMHrBtn');
    if (mHrBtn) {
      mHrBtn.addEventListener('mousedown', function(e){ e.preventDefault(); });
      mHrBtn.addEventListener('click', function(){
        restoreRange();
        document.execCommand('insertHorizontalRule', false, null);
        area.focus();
      });
    }
  })();
}

/* ── 초기화 ── */
document.addEventListener('DOMContentLoaded', async () => {
  /* 테마 */
  const saved = localStorage.getItem('theme') || 'system';
  if (typeof applyTheme === 'function') applyTheme(saved);
  const themeLabel = document.getElementById('themeLabel');
  if (themeLabel) themeLabel.textContent = saved === 'light' ? '다크모드' : '라이트모드';
  const toggle = document.getElementById('themeToggle');
  if (toggle) {
    toggle.checked = saved === 'light';
    toggle.addEventListener('change', () => {
      const theme = toggle.checked ? 'light' : 'dark';
      if (typeof applyTheme === 'function') applyTheme(theme);
      if (themeLabel) themeLabel.textContent = theme === 'light' ? '다크모드' : '라이트모드';
    });
  }

  /* 사이드바 네비게이션 — 페이지 이동 없이 detailMain에 렌더링 */
  document.getElementById('navBoard')?.addEventListener('click', e => {
    e.preventDefault();
    _renderBoardList();
  });
  document.getElementById('navPatchnote')?.addEventListener('click', async e => {
    e.preventDefault();
    if (typeof initData === 'function') {
      try { await Promise.race([initData(), new Promise(r => setTimeout(r, 8000))]); } catch {}
    }
    _renderPatchList();
  });
  document.getElementById('navEvent')?.addEventListener('click', e => {
    e.preventDefault();
    _renderEventList();
  });
  document.getElementById('navHome')?.addEventListener('click', e => {
    e.preventDefault();
    _renderHome();
  });

  /* Firebase 인증 상태가 확정될 때까지 대기 (새로고침 시 로그인 팝업 오동작 방지) */
  if (window.authReady) await window.authReady;

  /* URL 파라미터 */
  const params = new URLSearchParams(location.search);
  const type   = params.get('type');
  const id     = params.get('id');
  const main   = document.getElementById('detailMain');

  /* 데이터 로드 */
  if (type === 'patchnote') {
    if (typeof initData === 'function') {
      try { await Promise.race([initData(), new Promise(r => setTimeout(r, 8000))]); } catch {}
    }
    if (!id) {
      _renderPatchList();
    } else {
      _setNavActive('patchnote');
      _renderPatchDetail(id);
    }
  } else if (type === 'event') {
    if (!id) {
      _renderEventList();
    } else {
      _setNavActive('event');
      _renderEventDetail(id);
    }
  } else if (type === 'board') {
    const mode = params.get('mode');
    if (mode === 'write') {
      // 새로고침/강력 새로고침 시 write URL로 진입하면 authReady 직후에도
      // Firestore onSnapshot(currentUserProfile)이 아직 미도착이라 profile=null →
      // 로그인 팝업 오노출 버그 발생. 어차피 새로고침하면 작성 내용도 유실되므로
      // 게시판 목록으로 리다이렉트한다.
      history.replaceState({}, '', 'detail.html?type=board');
      _renderBoardList();
    } else if (id) {
      _renderBoardDetail(id);
    } else {
      _renderBoardList();
    }
  } else {
    /* type 없음 = 홈 */
    _renderHome();
  }

  /* ── 히어로 배경 스크롤 페이드아웃 ── */
  const heroBg    = document.querySelector('.hero-bg');
  const heroTitle = document.querySelector('.hero-title-wrap');
  if (heroBg) {
    const fadeEnd = 400;
    window.addEventListener('scroll', () => {
      const opacity = Math.max(0, 1 - window.scrollY / fadeEnd);
      heroBg.style.opacity    = opacity;
      if (heroTitle) heroTitle.style.opacity = opacity;
    }, { passive: true });
  }
});

/* ── 알림 벨 버튼 초기화 ─────────────────────────────────────────
 * bellId : 버튼 element id
 * lsKey  : localStorage key ('notifPatch' | 'notifEvent' 등)
 * 클릭 시 localStorage 토글 + 알림 설정 모달 체크박스 동기화 + 권한 요청
 */
function _initNotifBell(bellId, lsKey) {
  const btn = document.getElementById(bellId);
  if (!btn) return;
  btn.classList.toggle('active', localStorage.getItem(lsKey) === 'true');
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    const newVal = localStorage.getItem(lsKey) !== 'true';
    localStorage.setItem(lsKey, newVal);
    btn.classList.toggle('active', newVal);
    // 알림 설정 모달 체크박스 동기화
    const cb = document.getElementById(lsKey);
    if (cb) cb.checked = newVal;
    // 알림 권한 요청
    if (newVal && 'Notification' in window) {
      Notification.requestPermission();
    }
  });
}
