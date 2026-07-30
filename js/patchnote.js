// ===== PATCH NOTE PAGE =====

let _patchSelectedMonth = null;
let _patchInited = false;
let _patchCurrentPage = 1;
const PATCH_PAGE_SIZE = 10;

function _fmtPatchMonth(m) {
  if (!m) return '전체';
  const [y, mo] = m.split('-');
  return `${y}년 ${parseInt(mo)}월`;
}

function _getPatchMonths() {
  return [...new Set(
    PATCH_NOTES.map(p => (p.date || '').slice(0, 7))
  )].filter(Boolean).sort((a, b) => b.localeCompare(a));
}

function initPatchMonthDropdown() {
  const wrap     = document.getElementById('patchMonthWrap');
  const label    = document.getElementById('patchMonthLabel');
  const dropdown = document.getElementById('patchMonthDropdown');
  if (!wrap || !label || !dropdown) return;

  const months = _getPatchMonths();

  if (!months.length) {
    label.textContent = '전체';
    return;
  }

  _patchSelectedMonth = null;
  label.textContent = '전체';

  const allOption = `<div class="pvp-date-option active" data-month="">전체</div>`;
  const monthOptions = months.map(m =>
    `<div class="pvp-date-option" data-month="${m}">${_fmtPatchMonth(m)}</div>`
  ).join('');

  dropdown.innerHTML = allOption + monthOptions;

  dropdown.querySelectorAll('.pvp-date-option').forEach(el => {
    el.addEventListener('click', () => {
      const sel = el.dataset.month;
      dropdown.querySelectorAll('.pvp-date-option').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      _patchSelectedMonth = sel || null;
      _patchCurrentPage = 1;
      label.textContent = _fmtPatchMonth(_patchSelectedMonth);
      renderPatchList();
      wrap.classList.remove('open');
    });
  });
}

function renderPatchPagination(totalCount, container) {
  const totalPages = Math.ceil(totalCount / PATCH_PAGE_SIZE);
  if (totalPages <= 1) return;

  const cur = _patchCurrentPage;

  // 페이지 버튼 범위 계산 (최대 5개 표시)
  let start = Math.max(1, cur - 2);
  let end   = Math.min(totalPages, start + 4);
  if (end - start < 4) start = Math.max(1, end - 4);

  let html = '<div class="patch-recent-pagination">';

  // 이전 버튼
  html += `<button class="patch-pagin-btn" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''}>&#8249;</button>`;

  // 첫 페이지 + 생략
  if (start > 1) {
    html += `<button class="patch-pagin-btn" data-page="1">1</button>`;
    if (start > 2) html += `<button class="patch-pagin-btn" disabled style="border:none;cursor:default">…</button>`;
  }

  // 페이지 번호들
  for (let i = start; i <= end; i++) {
    html += `<button class="patch-pagin-btn${i === cur ? ' active' : ''}" data-page="${i}">${i}</button>`;
  }

  // 마지막 페이지 + 생략
  if (end < totalPages) {
    if (end < totalPages - 1) html += `<button class="patch-pagin-btn" disabled style="border:none;cursor:default">…</button>`;
    html += `<button class="patch-pagin-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  // 다음 버튼
  html += `<button class="patch-pagin-btn" data-page="${cur + 1}" ${cur === totalPages ? 'disabled' : ''}>&#8250;</button>`;

  html += '</div>';

  container.insertAdjacentHTML('beforeend', html);

  // 페이지 클릭 이벤트
  container.querySelectorAll('.patch-pagin-btn[data-page]:not([disabled])').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = parseInt(btn.dataset.page);
      if (!isNaN(page) && page !== _patchCurrentPage) {
        _patchCurrentPage = page;
        renderPatchList();
        // 패치노트 목록 상단으로 스크롤
        const listView = document.getElementById('patchListView');
        if (listView) listView.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function renderPatchList() {
  const list = document.getElementById('patchNoteList');
  if (!list) return;

  let notes = PATCH_NOTES;
  if (_patchSelectedMonth) {
    notes = notes.filter(p => (p.date || '').startsWith(_patchSelectedMonth));
  }

  if (!notes.length) {
    list.innerHTML = `<div class="empty-state"><p>${_patchSelectedMonth ? '해당 월에 패치 노트가 없습니다' : '패치 노트가 없습니다'}</p></div>`;
    return;
  }

  const totalCount = notes.length;
  const totalPages = Math.ceil(totalCount / PATCH_PAGE_SIZE);

  // 현재 페이지 범위 보정
  if (_patchCurrentPage > totalPages) _patchCurrentPage = totalPages;
  if (_patchCurrentPage < 1) _patchCurrentPage = 1;

  const startIdx = (_patchCurrentPage - 1) * PATCH_PAGE_SIZE;
  const pageNotes = notes.slice(startIdx, startIdx + PATCH_PAGE_SIZE);

  const firstId = PATCH_NOTES[0]?.id;
  const eyeSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="11" height="11"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>`;

  list.innerHTML = pageNotes.map(p => `
    <div class="patch-list-item" data-patchid="${p.id}">
      <div class="patch-list-item-title">
        ${p.id === firstId ? '<span class="patch-item-new">NEW</span>' : ''}
        ${escHtml(p.title)}
      </div>
      <div class="patch-list-item-meta">
        <span class="patch-list-item-author">관리자</span>
        <span class="patch-list-item-date">${formatDate(p.date)}</span>
        <span class="patch-list-item-views" id="pv-${p.id}">${eyeSvg}<span>-</span></span>
      </div>
    </div>
  `).join('');

  // 클릭: detail.html로 이동
  list.querySelectorAll('.patch-list-item[data-patchid]').forEach(el => {
    el.addEventListener('click', () => {
      location.href = `detail.html?type=patchnote&id=${el.dataset.patchid}`;
    });
  });

  // 페이지네이션 렌더링
  renderPatchPagination(totalCount, list);

  // 조회수 비동기 로드
  try {
    const ids = pageNotes.map(p => String(p.id));
    Promise.all(ids.map(rid => db.collection('patchViews').doc(rid).get())).then(snaps => {
      snaps.forEach((snap, i) => {
        const numEl = document.querySelector(`#pv-${ids[i]} span`);
        if (numEl) numEl.textContent = snap.exists ? (snap.data().count || 0).toLocaleString() : '0';
      });
    });
  } catch (e) {}
}

function initPatchNote() {
  initPatchMonthDropdown();
  renderPatchList();

  if (_patchInited) return;
  _patchInited = true;

  document.getElementById('patchMonthBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('patchMonthWrap')?.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    document.getElementById('patchMonthWrap')?.classList.remove('open');
  });
}
