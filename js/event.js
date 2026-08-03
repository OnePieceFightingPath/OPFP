// ===== EVENT PAGE =====

let _allEvents   = [];
let _currentTab  = 'active';
let _sortBy      = 'recent';
let _evtBannerSlides = [];
let _evtBannerIdx    = 0;
let _evtBannerTimer  = null;

// ── 유틸 ─────────────────────────────────────────────────────────────────
function _fmtDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}
function _isActive(e) {
  if (!e.endDate) return true;
  const end = e.endDate.toDate ? e.endDate.toDate() : new Date(e.endDate);
  return end >= new Date();
}
function _evSanitizeHtml(html) {
  // DOMParser로 비활성 문서에서 파싱 → 파싱 시점에 스크립트/이벤트 핸들러 실행 방지
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const tmp = doc.body;
  tmp.querySelectorAll('script,iframe,object,embed,form,meta,link').forEach(el => el.remove());
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
    const href = el.getAttribute('href') || '';
    if (href && !/^https?:\/\//i.test(href) && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:')) el.removeAttribute('href');
    if (el.tagName === 'A') {
      el.setAttribute('rel', 'noopener noreferrer');
      if (!el.getAttribute('target')) el.setAttribute('target', '_blank');
    }
  });
  return tmp.innerHTML;
}

// ── 이벤트 로드 ──────────────────────────────────────────────────────────
async function loadEvents() {
  const grid = document.getElementById('eventGrid');
  try {
    const snap = await db.collection('events').get();
    _allEvents = snap.docs
      .map(d => ({ _docId: d.id, ...d.data() }))
      .filter(e => e.visible !== false);
    renderEventBanner();
    renderEventCards();
  } catch (e) {
    console.error('이벤트 로드 실패:', e);
    if (grid) grid.innerHTML = '<div class="event-empty"><p style="color:var(--nerf)">이벤트를 불러오지 못했습니다.</p></div>';
  }
}

// ── 카드 렌더링 ───────────────────────────────────────────────────────────
async function renderEventCards() {
  const grid = document.getElementById('eventGrid');
  if (!grid) return;

  const filtered = _allEvents.filter(e =>
    _currentTab === 'active' ? _isActive(e) : !_isActive(e)
  );

  function _evtDate(e) {
    if (e.startDate?.toDate) return e.startDate.toDate();
    if (e.date) return new Date(e.date);
    return new Date(0);
  }
  filtered.sort((a, b) => {
    if (_sortBy === 'recent') return _evtDate(b) - _evtDate(a);
    if (_sortBy === 'oldest') return _evtDate(a) - _evtDate(b);
    const ta = a.endDate?.toDate?.() ?? new Date(8640000000000000);
    const tb = b.endDate?.toDate?.() ?? new Date(8640000000000000);
    return ta - tb;
  });

  const countEl = document.getElementById('eventCountLabel');
  if (countEl) countEl.textContent = `총 ${filtered.length}개`;

  if (!filtered.length) {
    grid.innerHTML = `<div class="event-empty"><p>${_currentTab === 'active' ? '진행 중인 이벤트가 없습니다.' : '종료된 이벤트가 없습니다.'}</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(e => _renderCard(e)).join('');

  // 카드 클릭: detail.html로 이동
  grid.querySelectorAll('.event-card-clickable[data-evtid]').forEach(card => {
    card.addEventListener('click',   () => { location.href = `detail.html?type=event&id=${encodeURIComponent(card.dataset.evtid)}`; });
    card.addEventListener('keydown', e => { if (e.key === 'Enter') location.href = `detail.html?type=event&id=${encodeURIComponent(card.dataset.evtid)}`; });
  });

  // 조회수 배치 로드
  try {
    const evtIds = filtered.map(e => e._docId);
    const snaps  = await Promise.all(evtIds.map(id => db.collection('eventViews').doc(id).get()));
    snaps.forEach((snap, i) => {
      const el = document.querySelector(`#ev-${CSS.escape(evtIds[i])} span`);
      if (el) el.textContent = snap.exists ? (snap.data().count || 0).toLocaleString() : '0';
    });
  } catch {}

  // 댓글 수 배치 로드
  try {
    const evtIds = filtered.map(e => e._docId);
    const cmtSnaps = await Promise.all(
      evtIds.map(id => db.collection('eventComments').where('eventId', '==', id).get())
    );
    cmtSnaps.forEach((snap, i) => {
      const el = document.querySelector(`#ec-${CSS.escape(evtIds[i])} span`);
      if (el) el.textContent = snap.size;
    });
  } catch {}
}

function _renderCard(e) {
  const ended   = !_isActive(e);
  const dateStr = e.startDate ? _fmtDate(e.startDate) : (e.date || '');
  const commentCount = e.commentCount ?? 0;
  const tag   = e.tag ? `<span class="event-card-tag">${escHtml(e.tag)}</span>` : '';
  const dateBadge = dateStr ? `<span class="event-card-period">${escHtml(dateStr)}</span>` : '';
  const thumb = e.thumbnailUrl
    ? `<img src="${escHtml(e.thumbnailUrl)}" alt="${escHtml(e.title)}" loading="lazy">`
    : `<div class="event-card-thumb-placeholder">이미지 없음</div>`;

  return `
    <div class="event-card event-card-clickable${ended ? ' event-card-ended' : ''}"
         role="link" tabindex="0" data-evtid="${escHtml(e._docId)}">
      <div class="event-card-thumb">
        ${thumb}
        ${tag}
        ${dateBadge}
        ${ended ? '<div class="event-card-ended-overlay"><span>종료</span></div>' : ''}
      </div>
      <div class="event-card-body">
        <div class="event-card-title">${escHtml(e.title || '제목 없음')}</div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">
          <span style="font-size:10px;font-weight:700;color:var(--accent);padding:1px 5px;border-radius:3px;background:rgba(77,159,255,0.12)">관리자</span>
          <span id="ev-${escHtml(e._docId)}" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text-dim)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            <span>-</span>
          </span>
          <span id="ec-${escHtml(e._docId)}" style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:var(--text-dim)">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <span>${commentCount}</span>
          </span>
        </div>
      </div>
    </div>`;
}


// ── 배너 ──────────────────────────────────────────────────────────────────
async function renderEventBanner() {
  const carousel = document.getElementById('eventBannerCarousel');
  const track    = document.getElementById('eventBannerTrack');
  const dots     = document.getElementById('eventBannerDots');
  if (!carousel || !track || !dots) return;

  try {
    const snap = await db.collection('eventBanners').orderBy('order', 'asc').get();
    _evtBannerSlides = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .filter(b => b.visible !== false && b.imageUrl);
  } catch {
    _evtBannerSlides = [];
  }

  if (!_evtBannerSlides.length) {
    track.innerHTML = '<div class="banner-slide banner-slide-empty"><div class="banner-empty-placeholder">이벤트 배너가 등록되지 않았습니다</div></div>';
    carousel.style.display = 'block';
    return;
  }

  carousel.style.display = 'block';
  const multi = _evtBannerSlides.length > 1;

  track.innerHTML = _evtBannerSlides.map((e, i) => `
    <div class="banner-slide" data-banneridx="${i}"${e.link && /^https?:\/\//i.test(e.link) ? ' style="cursor:pointer"' : ''}>
      <img src="${escHtml(e.imageUrl)}" alt="${escHtml(e.title || '')}" loading="${i === 0 ? 'eager' : 'lazy'}">
      ${e.title ? `<div class="banner-slide-title">${escHtml(e.title)}</div>` : ''}
    </div>`).join('');

  track.querySelectorAll('.banner-slide[data-banneridx]').forEach((slide, i) => {
    const link = _evtBannerSlides[i]?.link;
    if (link && /^https?:\/\//i.test(link))
      slide.addEventListener('click', () => window.open(link, '_blank'));
  });

  dots.innerHTML = multi ? _evtBannerSlides.map((_, i) =>
    `<span class="banner-dot${i===0?' active':''}" data-dotidx="${i}"></span>`
  ).join('') : '';

  dots.querySelectorAll('.banner-dot[data-dotidx]').forEach(dot => {
    dot.addEventListener('click', () => _goEvtBanner(Number(dot.dataset.dotidx)));
  });

  if (multi) {
    if (_evtBannerTimer) clearInterval(_evtBannerTimer);
    _evtBannerTimer = setInterval(() => {
      _goEvtBanner((_evtBannerIdx + 1) % _evtBannerSlides.length);
    }, 4000);
  }
}

function _goEvtBanner(idx) {
  _evtBannerIdx = idx;
  const track = document.getElementById('eventBannerTrack');
  if (track) track.style.transform = `translateX(-${idx * 100}%)`;
  document.querySelectorAll('#eventBannerDots .banner-dot').forEach(
    (d, i) => d.classList.toggle('active', i === idx)
  );
}

// ── 탭/정렬/초기화 ───────────────────────────────────────────────────────
function initEvent() {
  document.querySelectorAll('.event-status-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.event-status-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      _currentTab = tab.dataset.tab;
      renderEventCards();
    });
  });

  document.getElementById('eventSortSelect')?.addEventListener('change', e => {
    _sortBy = e.target.value;
    renderEventCards();
  });

  // 배너 버튼
  document.getElementById('evtBannerPrev')?.addEventListener('click', () => {
    const n = _evtBannerSlides.length;
    _goEvtBanner((_evtBannerIdx - 1 + n) % n);
  });
  document.getElementById('evtBannerNext')?.addEventListener('click', () => {
    _goEvtBanner((_evtBannerIdx + 1) % _evtBannerSlides.length);
  });

  loadEvents();
}
