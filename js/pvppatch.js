// ===== PVP PATCH PAGE =====

// 현재 선택된 날짜 (null = 최신 활성 패치)
let _pvpSelectedDate = null;

// 이벤트 바인딩 중복 방지 플래그
let _pvpInited = false;

// 선택된 날짜의 데이터 반환 (null이면 전역 PVP_PATCHES)
function getPvpData() {
  if (_pvpSelectedDate === null) return PVP_PATCHES;
  return PVP_PATCH_HISTORY.get(_pvpSelectedDate) || { buff: [], nerf: [], fix: [] };
}

const _pvpEmptyMsg = {
  buff: '이번 패치에는 버프 사항이 없습니다.',
  nerf: '이번 패치에는 너프 사항이 없습니다.',
  fix:  '이번 패치에는 수정 사항이 없습니다.',
};

function renderPvpSection(sectionKey, colorClass, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const entries = getPvpData()[sectionKey] || [];

  const rows = [];
  for (let i = 0; i < entries.length; i += 4) rows.push(entries.slice(i, i + 4));

  const countEl = container.closest('.pvp-section')?.querySelector('.pvp-section-count');
  if (countEl) countEl.textContent = `${entries.length}명`;

  if (!entries.length) {
    const msg = _pvpEmptyMsg[sectionKey] || '이번 패치에는 pvp 패치 사항이 없습니다.';
    container.innerHTML = `<div class="empty-state" style="padding:24px"><p>${msg}</p></div>`;
    return;
  }

  container.innerHTML = rows.map(row => `
    <div class="pvp-char-row">
      ${row.map(entry => {
        // Fix: 서폿 전용 항목(charId null)은 SUPPORT_CHARACTERS에서 직접 조회
        const isSupport = entry.charId == null && entry.supportCharId != null;
        const effectiveId = isSupport ? entry.supportCharId : entry.charId;
        const char = isSupport
          ? SUPPORT_CHARACTERS.find(c => c.id === effectiveId)
          : CHARACTERS.find(c => c.id === effectiveId);
        if (!char) return '';
        const imgSrc = char.img || char.image || '';
        return `
          <div class="pvp-char-btn" onclick="openPvpPatchModal(${effectiveId}, ${isSupport})">
            <div class="pvp-char-icon ${colorClass}-border">
              ${imgSrc
                ? `<img src="${imgSrc}" alt="${char.name}" loading="lazy"
                    onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
                : ''}
              <div class="pvp-char-icon-placeholder" style="${imgSrc ? 'display:none' : ''}">${char.name[0]}</div>
            </div>
            <div class="pvp-char-name">${char.name}</div>
          </div>
        `;
      }).join('')}
    </div>
  `).join('');
}

function renderAllPvpSections() {
  renderPvpSection('buff', 'buff', 'pvpBuffList');
  renderPvpSection('nerf', 'nerf', 'pvpNerfList');
  renderPvpSection('fix',  'fix',  'pvpFixList');
}

function openPvpPatchModal(charId, isSupport) {
  // Fix: isSupport이면 SUPPORT_CHARACTERS에서 직접 조회 (getCharById는 CHARACTERS 우선이라 ID 충돌 시 오작동)
  const char = isSupport
    ? SUPPORT_CHARACTERS.find(c => c.id === charId)
    : CHARACTERS.find(c => c.id === charId);
  if (!char) return;

  const data = getPvpData();
  const sectionOrder = ['buff', 'nerf', 'fix'];
  const sectionLabel = { buff: '버프', nerf: '너프', fix: '기능 수정' };

  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  let allContent = '';
  sectionOrder.forEach(key => {
    // Fix: 서폿 전용 항목은 supportCharId로 탐색
    const entry = isSupport
      ? data[key]?.find(e => e.supportCharId === charId)
      : data[key]?.find(e => e.charId === charId);
    if (!entry) return;
    allContent += entry.patches.map(text => `
      <div class="pvp-patch-entry">
        <span class="patch-entry-type ${key}">${sectionLabel[key]}</span>
        <div class="patch-entry-text">${_esc(text)}</div>
      </div>
    `).join('');
  });

  const overlay     = document.getElementById('pvpModalOverlay');
  const imgEl       = document.getElementById('pvpModalCharImg');
  const placeholder = document.getElementById('pvpModalCharImgPlaceholder');

  document.getElementById('pvpModalCharName').textContent = char.name;
  document.getElementById('pvpModalBody').innerHTML = allContent;

  if (imgEl && placeholder) {
    const imgSrc = char.img || char.image || '';
    if (imgSrc) {
      imgEl.src = imgSrc;
      imgEl.alt = char.name;
      imgEl.style.display = 'block';
      placeholder.style.display = 'none';
      imgEl.onerror = () => {
        imgEl.style.display = 'none';
        placeholder.textContent = char.name[0] || '?';
        placeholder.style.display = 'flex';
      };
    } else {
      imgEl.style.display = 'none';
      placeholder.textContent = char.name[0] || '?';
      placeholder.style.display = 'flex';
    }
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePvpModal() {
  document.getElementById('pvpModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── 날짜 드롭다운 ────────────────────────────────────────────

function _fmtPvpDate(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${y}.${m}.${dd}`;
}

// 최신 패치 날짜에서 한 달 전 날짜를 계산합니다.
// Date.setMonth()를 사용해 연초/연말 경계를 자동 처리합니다.
function _pvpOneMonthAgo(dateKey) {
  const d = new Date(dateKey + 'T00:00:00');
  d.setMonth(d.getMonth() - 1);
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

// 타이틀 배지 상태 업데이트
function _updatePvpBadges(selectedDate, latestDate) {
  const noPatchEl  = document.getElementById('pvpNoPatchBadge');
  const currentEl  = document.getElementById('pvpCurrentBadge');
  const dk         = selectedDate || latestDate;
  const hist       = PVP_PATCH_HISTORY.get(dk);
  const isEmpty    = hist && !hist.buff.length && !hist.nerf.length && !hist.fix.length;
  const isCurrent  = !selectedDate || selectedDate === latestDate;

  if (noPatchEl)  noPatchEl.style.display  = isEmpty   ? '' : 'none';
  if (currentEl)  currentEl.style.display  = isCurrent ? '' : 'none';
}

function initPvpDateDropdown() {
  const dropdown = document.getElementById('pvpDateDropdown');
  const label    = document.getElementById('pvpDateLabel');
  if (!dropdown || !label) return;

  const allDates = [...PVP_PATCH_HISTORY.keys()].sort((a, b) => b.localeCompare(a));

  if (!allDates.length) {
    label.textContent = '패치 없음';
    return;
  }

  const latestDate = allDates[0];
  const cutoffDate = _pvpOneMonthAgo(latestDate);
  const dates = allDates.filter(date => date >= cutoffDate);
  _pvpSelectedDate = null;
  label.textContent = _fmtPvpDate(latestDate);
  _updatePvpBadges(null, latestDate);

  dropdown.innerHTML = dates.map(d => `
    <div class="pvp-date-option${d === latestDate ? ' active' : ''}" data-date="${d}">
      ${_fmtPvpDate(d)}
    </div>
  `).join('');

  dropdown.querySelectorAll('.pvp-date-option').forEach(el => {
    el.addEventListener('click', () => {
      const sel = el.dataset.date;
      dropdown.querySelectorAll('.pvp-date-option').forEach(e => e.classList.remove('active'));
      el.classList.add('active');
      label.textContent = _fmtPvpDate(sel);
      _pvpSelectedDate = sel === latestDate ? null : sel;
      _updatePvpBadges(_pvpSelectedDate, latestDate);
      renderAllPvpSections();
      document.getElementById('pvpDateWrap')?.classList.remove('open');
    });
  });
}

// ── 도움말 툴팁 ──────────────────────────────────────────────

function initPvpHelp() {
  const btn     = document.getElementById('pvpHelpBtn');
  const tooltip = document.getElementById('pvpHelpTooltip');
  if (!btn || !tooltip) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    tooltip.classList.toggle('visible');
  });

  document.addEventListener('click', () => tooltip.classList.remove('visible'));
}

// ── 진입점 ───────────────────────────────────────────────────

function initPvpPatch() {
  initPvpDateDropdown();
  renderAllPvpSections();

  if (_pvpInited) return;
  _pvpInited = true;

  initPvpHelp();

  document.getElementById('pvpDateBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    document.getElementById('pvpDateWrap')?.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    document.getElementById('pvpDateWrap')?.classList.remove('open');
  });

  document.getElementById('pvpModalClose')?.addEventListener('click', closePvpModal);
  document.getElementById('pvpModalOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closePvpModal();
  });
}
