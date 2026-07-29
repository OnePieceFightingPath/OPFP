// ===== HOME PAGE =====

let _bannerAutoTimer = null; // 배너 타이머 — 재초기화 시 이전 것 정리용

// [수정 5] document 레벨 드래그 핸들러 참조 보관 — 재등록 전 제거용
let _bannerMouseUpHandler = null;
let _bannerTouchEndHandler = null;

function initBanner() {
  const track = document.getElementById('bannerTrack');
  const dotsWrap = document.getElementById('bannerDots');
  if (!track) return;

  // 이전 타이머 정리 (initBanner가 두 번 이상 호출될 때 중복 방지)
  if (_bannerAutoTimer) {
    clearInterval(_bannerAutoTimer);
    _bannerAutoTimer = null;
  }

  // [수정 5] 이전에 등록된 document 핸들러 제거 (중복 방지)
  if (_bannerMouseUpHandler) {
    document.removeEventListener('mouseup', _bannerMouseUpHandler);
    _bannerMouseUpHandler = null;
  }
  if (_bannerTouchEndHandler) {
    document.removeEventListener('touchend', _bannerTouchEndHandler);
    _bannerTouchEndHandler = null;
  }

  if (!BANNERS.length) {
    track.innerHTML = '<div class="banner-slide-placeholder">등록된 배너가 없습니다</div>';
    return;
  }

  let current = 0;
  let startX = 0;
  let isDragging = false;

  track.innerHTML = BANNERS.map((b, i) => `
    <div class="banner-slide" ${b.link ? `style="cursor:pointer" data-link="${i}"` : ''}>
      <img src="${b.bannerUrl}" alt="${escHtml(b.title || '')}" draggable="false" onerror="this.style.display='none'">
      ${b.title ? `<div class="banner-overlay"><h2>${escHtmlBr(b.title)}</h2></div>` : ''}
    </div>
  `).join('');

  track.addEventListener('click', e => {
    const slide = e.target.closest('.banner-slide[data-link]');
    if (!slide) return;
    const banner = BANNERS[parseInt(slide.dataset.link, 10)];
    if (!banner?.link) return;
    if (/^https?:\/\//i.test(banner.link)) {
      window.open(banner.link, '_blank', 'noopener,noreferrer');
    } else if (/^page:/i.test(banner.link)) {
      const pageId = banner.link.replace(/^page:/i, '').trim();
      if (typeof navigateTo === 'function') navigateTo(pageId);
    }
  });

  dotsWrap.innerHTML = BANNERS.map((_, i) => `
    <div class="banner-dot${i === 0 ? ' active' : ''}" data-i="${i}"></div>
  `).join('');

  function goTo(idx) {
    current = (idx + BANNERS.length) % BANNERS.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    dotsWrap.querySelectorAll('.banner-dot').forEach((d, i) => {
      d.classList.toggle('active', i === current);
    });
  }

  function startAuto() {
    stopAuto();
    _bannerAutoTimer = setInterval(() => goTo(current + 1), 4000);
  }

  function stopAuto() {
    if (_bannerAutoTimer) { clearInterval(_bannerAutoTimer); _bannerAutoTimer = null; }
  }

  document.getElementById('bannerPrev')?.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  document.getElementById('bannerNext')?.addEventListener('click', () => { goTo(current + 1); startAuto(); });

  dotsWrap.addEventListener('click', e => {
    const dot = e.target.closest('.banner-dot');
    if (dot) { goTo(+dot.dataset.i); startAuto(); }
  });

  track.parentElement.addEventListener('mousedown', e => { isDragging = true; startX = e.clientX; stopAuto(); });
  track.parentElement.addEventListener('touchstart', e => { isDragging = true; startX = e.touches[0].clientX; stopAuto(); }, { passive: true });

  // [수정 5] 핸들러를 변수에 저장 후 등록 — 다음 initBanner 호출 시 제거 가능
  _bannerMouseUpHandler = e => {
    if (!isDragging) return;
    isDragging = false;
    const diff = e.clientX - startX;
    if (Math.abs(diff) > 40) goTo(diff < 0 ? current + 1 : current - 1);
    startAuto();
  };

  _bannerTouchEndHandler = e => {
    if (!isDragging) return;
    isDragging = false;
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 40) goTo(diff < 0 ? current + 1 : current - 1);
    startAuto();
  };

  document.addEventListener('mouseup', _bannerMouseUpHandler);
  document.addEventListener('touchend', _bannerTouchEndHandler);

  startAuto();
}

function renderHomeBoxes() {
  const patchList = document.getElementById('homePathNoteList');
  if (patchList) {
    if (!PATCH_NOTES.length) {
      patchList.innerHTML = '<div class="patch-item"><div class="patch-item-content"><div class="patch-item-title" style="color:var(--text-muted)">패치 노트가 없습니다</div></div></div>';
    } else {
      patchList.innerHTML = PATCH_NOTES.slice(0, 4).map((p, i) => `
        <div class="patch-item" onclick="navigateTo('patchnote'); openPatchDetail(${p.id})">
          
          <div class="patch-item-content">
            <div class="patch-item-title">${escHtml(p.title)}</div>
            <div class="patch-item-date">${formatDate(p.date)}</div>
          </div>
          ${i === 0 ? '<span class="patch-item-new">NEW</span>' : ''}
        </div>
      `).join('');
    }
  }

  const pvpList = document.getElementById('homePvpList');
  if (pvpList) {
    const pvpMap = new Map();
    ['buff', 'nerf', 'fix'].forEach(type => {
      (PVP_PATCHES[type] || []).forEach(entry => {
        // Fix: 서폿 전용 항목(charId null)은 _pvpDocId 또는 supportCharId를 키로 사용
        const isSupport = entry.charId == null && entry.supportCharId != null;
        const mapKey = isSupport ? `support_${entry.supportCharId}` : entry.charId;
        if (!pvpMap.has(mapKey)) pvpMap.set(mapKey, { charId: entry.charId, supportCharId: entry.supportCharId, isSupport, types: [] });
        pvpMap.get(mapKey).types.push(type);
      });
    });
    const allPvp = [...pvpMap.values()].slice(0, 8);

    const typeLabel = { buff: '버프', nerf: '너프', fix: '기능수정' };

    if (!allPvp.length) {
      pvpList.innerHTML = '<div class="pvp-item"><span class="pvp-item-name" style="color:var(--text-muted)">이번 패치에는 PvP 패치 사항이 없습니다.</span></div>';
    } else {
      pvpList.innerHTML = allPvp.map((entry, i) => {
        // Fix: 서폿 전용 항목은 SUPPORT_CHARACTERS에서 직접 조회
        const effectiveId = entry.isSupport ? entry.supportCharId : entry.charId;
        const char = entry.isSupport
          ? SUPPORT_CHARACTERS.find(c => c.id === effectiveId)
          : CHARACTERS.find(c => c.id === effectiveId);
        if (!char) return '';
        const badge = entry.types.map(t =>
          `<span class="badge-${t}">${typeLabel[t]}</span>`
        ).join('');

        const imgSrc = char.img || char.image || '';
        const iconHtml = imgSrc
          ? `<div class="pvp-char-icon-sm">
               <img src="${imgSrc}" alt="${escHtml(char.name)}" loading="lazy"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
               <div class="pvp-char-icon-sm-placeholder" style="display:none">${escHtml(char.name[0])}</div>
             </div>`
          : `<div class="pvp-char-icon-sm-placeholder">${escHtml(char.name[0])}</div>`;

        return `
          <div class="pvp-item" onclick="navigateTo('pvppatch'); openPvpPatchModal(${effectiveId}, ${entry.isSupport})">
            
            ${iconHtml}
            <span class="pvp-item-name">${escHtml(char.name)}</span>
            <div class="badge-both">${badge}</div>
          </div>
        `;
      }).join('');
    }
  }
}

let _homeInited = false; // 이벤트 리스너 중복 등록 방지

function initHome() {
  initBanner();
  renderHomeBoxes();

  if (_homeInited) return;
  _homeInited = true;

  document.getElementById('homeViewAllPatch')?.addEventListener('click', () => navigateTo('patchnote'));
  document.getElementById('homeViewAllPvp')?.addEventListener('click', () => navigateTo('pvppatch'));
}
