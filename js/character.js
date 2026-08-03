// ===== CHARACTER PAGE =====

let charGrade = '';
let charAttribute = '';
let charBattleType = '';
let charSearch = '';
let charTabMode = 'all'; // 'all' | 'support'

// ===== 즐겨찾기 =====
const FAV_KEY = 'opfp_favorites';
function getFavorites() {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
    return new Set(raw.map(k => typeof k === 'number' ? String(k) : k));
  } catch { return new Set(); }
}
function saveFavorites(set) {
  localStorage.setItem(FAV_KEY, JSON.stringify([...set]));
}
let charFavoriteOnly = false;

function toggleFavorite(favKey, e) {
  e.stopPropagation();
  const favs = getFavorites();
  const adding = !favs.has(favKey);
  if (adding) favs.add(favKey);
  else favs.delete(favKey);
  saveFavorites(favs);
  if (charFavoriteOnly) {
    renderCharGrid();
  } else {
    const btn = e.target.closest('.char-fav-btn');
    if (btn) {
      btn.classList.toggle('active', adding);
      btn.title = adding ? '즐겨찾기 해제' : '즐겨찾기 추가';
    }
  }
}

// ===== 속성/타입 헬퍼 =====

function getAttributeFromChar(c) {
  if (c.attribute) return c.attribute;
  const map = { force: '力', ki: '技', sim: '心' };
  return map[c.type] || '';
}

function getBattleTypeFromChar(c) {
  if (c.attribute) return c.type || '';
  return '';
}

function getAttributeBadgeClass(c) {
  if (c.attribute) {
    const map = { '力': 'force', '技': 'ki', '心': 'sim' };
    return map[c.attribute] || '';
  }
  return c.type || '';
}

function getTypeIconSrc(battleType) {
  const map = { '원소': 'img/type/element.webp', '검사': 'img/type/sword.webp', '격투': 'img/type/fighter.webp', '특수': 'img/type/special.webp' };
  return map[battleType] || '';
}

function renderCharGrid() {
  const grid = document.getElementById('charGrid');
  if (!grid) return;

  if (!CHAR_DATA_LOADED) {
    grid.innerHTML = Array(12).fill(0).map(() => `
      <div class="char-card-skeleton">
        <div class="skeleton-img"></div>
        <div class="skeleton-name"></div>
      </div>`).join('');
    return;
  }

  const favs = getFavorites();

  let list = charTabMode === 'support' ? [...SUPPORT_CHARACTERS] : [...CHARACTERS];
  if (charFavoriteOnly) list = list.filter(c => {
    const favKey = charTabMode === 'support' ? 's_' + c.id : String(c.id);
    return favs.has(favKey);
  });
  if (charGrade) list = list.filter(c => c.grade === charGrade);
  if (charAttribute) list = list.filter(c => getAttributeFromChar(c) === charAttribute);
  if (charBattleType) list = list.filter(c => getBattleTypeFromChar(c) === charBattleType);
  if (charSearch.trim()) {
    const q = charSearch.trim().toLowerCase();
    list = list.filter(c => c.name.toLowerCase().includes(q));
  }

  list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  if (list.length === 0) {
    const msg = charFavoriteOnly
      ? '즐겨찾기한 캐릭터가 없습니다<br><small style="font-size:12px;color:var(--text-dim)">캐릭터 카드의 ★ 버튼을 눌러 추가해보세요</small>'
      : '검색 결과가 없습니다';
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      <p>${msg}</p>
    </div>`;
    return;
  }

  grid.innerHTML = list.map(char => {
    const attr       = getAttributeFromChar(char);
    const attrClass  = getAttributeBadgeClass(char);
    const battleType = getBattleTypeFromChar(char);
    const typeIconSrc = getTypeIconSrc(battleType);
    const imgSrc     = char.img || char.image || '';
    const favKey     = charTabMode === 'support' ? 's_' + char.id : String(char.id);
    const isFav      = favs.has(favKey);
    return `
    <div class="char-card grade-${char.grade}" onclick="openCharModal(${char.id}, ${charTabMode === 'support'})">
      <div class="char-card-img-wrap">
        ${imgSrc
          ? `<img src="${imgSrc}" alt="${escHtml(char.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ''}
        <div class="char-card-placeholder" style="${imgSrc ? 'display:none' : ''}">${escHtml(char.name[0])}</div>
        ${char.grade ? `<div class="char-grade-badge grade-${char.grade}">${char.grade}</div>` : ''}
        ${attrClass ? `<div class="char-badge ${attrClass}"></div>` : ''}
        ${(attrClass || typeIconSrc) ? `<div class="char-card-icons">${attrClass ? `<img class="char-attr-icon" src="img/attr/${attrClass}.png" alt="${attr}" loading="lazy">` : ''}${typeIconSrc ? `<img class="char-type-icon" src="${typeIconSrc}" alt="${battleType}" loading="lazy">` : ''}</div>` : ''}
        <button class="char-fav-btn${isFav ? ' active' : ''}" onclick="toggleFavorite('${favKey}', event)" title="${isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}">★</button>
      </div>
      <div class="char-card-name">${escHtml(char.name)}</div>
    </div>
  `;
  }).join('');
}

function initCharFilters() {
  const gradeFilter     = document.getElementById('charGradeFilter');
  const attributeFilter = document.getElementById('charAttributeFilter');
  const typeFilter      = document.getElementById('charTypeFilter');
  const searchInput     = document.getElementById('charSearchInput');
  const searchBtn       = document.getElementById('charSearchBtn');
  const refreshBtn      = document.getElementById('charRefreshBtn');

  // 즐겨찾기 필터 버튼 동적 삽입 (새로고침 버튼 앞에)
  let favBtn = document.getElementById('charFavBtn');
  if (!favBtn && refreshBtn) {
    favBtn = document.createElement('button');
    favBtn.id = 'charFavBtn';
    favBtn.className = 'char-fav-filter-btn';
    favBtn.title = '즐겨찾기만 보기';
    favBtn.innerHTML = '★ 즐겨찾기';
    refreshBtn.parentElement.insertBefore(favBtn, refreshBtn);
  }

  gradeFilter?.addEventListener('change', () => {
    charGrade = gradeFilter.value;
    renderCharGrid();
  });

  attributeFilter?.addEventListener('change', () => {
    charAttribute = attributeFilter.value;
    renderCharGrid();
  });

  typeFilter?.addEventListener('change', () => {
    charBattleType = typeFilter.value;
    renderCharGrid();
  });

  searchBtn?.addEventListener('click', () => {
    charSearch = searchInput ? searchInput.value : '';
    renderCharGrid();
  });

  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      charSearch = searchInput.value;
      renderCharGrid();
    }
  });

  searchInput?.addEventListener('input', e => {
    charSearch = e.target.value;
    renderCharGrid();
  });

  favBtn?.addEventListener('click', () => {
    charFavoriteOnly = !charFavoriteOnly;
    favBtn.classList.toggle('active', charFavoriteOnly);
    renderCharGrid();
  });

  refreshBtn?.addEventListener('click', () => {
    charGrade      = '';
    charAttribute  = '';
    charBattleType = '';
    charSearch     = '';
    charFavoriteOnly = false;
    if (gradeFilter)     gradeFilter.value     = '';
    if (attributeFilter) attributeFilter.value = '';
    if (typeFilter)      typeFilter.value       = '';
    if (searchInput)     searchInput.value      = '';
    if (favBtn)          favBtn.classList.remove('active');
    requestAnimationFrame(() => renderCharGrid());
  });
}

// ===== CHARACTER MODAL =====
let activeTab = 'skill';

function openCharModal(charId, isSupport) {
  const char = isSupport
    ? SUPPORT_CHARACTERS.find(c => c.id === charId)
    : CHARACTERS.find(c => c.id === charId);
  if (!char) return;

  const overlay     = document.getElementById('charModalOverlay');
  const img         = document.getElementById('charModalImg');
  const name        = document.getElementById('charModalName');
  const badge       = document.getElementById('charModalBadge');
  const placeholder = document.getElementById('charModalImgPlaceholder');

  const imgSrc = char.img || char.image || '';
  if (imgSrc) {
    img.src = imgSrc;
    img.alt = char.name;
    img.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    img.onerror = function() {
      this.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
    };
  } else {
    img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
  }

  name.textContent = char.name;

  const attr      = getAttributeFromChar(char);
  const attrClass = getAttributeBadgeClass(char);
  badge.textContent = attr;
  badge.className   = `type-badge ${attrClass}`;

  const gradeEl = document.getElementById('charModalGrade');
  if (gradeEl) {
    if (char.grade) {
      gradeEl.textContent = char.grade;
      gradeEl.className   = `grade-badge grade-${char.grade}`;
      gradeEl.style.display = 'inline-flex';
    } else {
      gradeEl.style.display = 'none';
    }
  }

  const skillTab  = document.querySelector('#charModal .modal-tab[data-tab="skill"]');
  const recentTab = document.querySelector('#charModal .modal-tab[data-tab="recent"]');
  if (skillTab)  skillTab.style.display  = isSupport ? 'none' : '';
  if (recentTab) recentTab.style.display = isSupport ? 'none' : '';

  overlay.dataset.charId = charId;
  switchCharTab(isSupport ? 'support' : 'skill', charId);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCharModal() {
  document.getElementById('charModalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

async function switchCharTab(tab, charId) {
  activeTab = tab;
  const cid = charId || +document.getElementById('charModalOverlay').dataset.charId;

  document.querySelectorAll('#charModal .modal-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });

  const body = document.getElementById('charModalBody');

  if (tab === 'skill') {
    const skills = SKILLS[cid] || [];
    body.innerHTML = skills.length
      ? skills.map(s => `
          <div class="skill-item">
            <div class="skill-name">${s.name}</div>
            <div class="skill-desc">${s.desc}</div>
          </div>`).join('')
      : '<div class="empty-state"><p>등록된 스킬이 없습니다</p></div>';

  } else if (tab === 'support') {
    const skills = SUPPORT_SKILLS[cid] || [];
    body.innerHTML = skills.length
      ? skills.map(s => `
          <div class="skill-item">
            <div class="skill-name">${s.name}</div>
            <div class="skill-desc">${s.desc}</div>
          </div>`).join('')
      : '<div class="empty-state"><p>등록된 서포트 스킬이 없습니다</p></div>';

  } else if (tab === 'tips') {
    const adminTips = CHAR_TIPS[cid] || [];
    body.innerHTML = '<div class="user-tips-loading"><div class="spinner-sm"></div><span>불러오는 중...</span></div>';

    // 유저 꿀팁 Firestore 로드
    let userTipsList = [];
    try {
      const snap = await db.collection('userTips')
        .where('charId', '==', cid)
        .orderBy('createdAt', 'desc')
        .get();
      userTipsList = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
    } catch (_) {
      try {
        const snap2 = await db.collection('userTips').where('charId', '==', cid).get();
        userTipsList = snap2.docs.map(d => ({ _id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      } catch (err2) {
        console.error('꿀팁 로드 실패 (재시도 포함):', err2);
        // 탭 컨테이너에 오류 메시지 표시
        const tipsWrap = document.getElementById('charTipsWrap');
        if (tipsWrap) tipsWrap.innerHTML = '<p style="color:var(--nerf);padding:16px 0;text-align:center">꿀팁을 불러오지 못했습니다.<br>네트워크 상태를 확인 후 다시 시도해주세요.</p>';
      }
    }

    const uid = typeof currentUser !== 'undefined' ? currentUser?.uid : null;

    // 어드민 팁 렌더링
    let tipsHtml = '';
    adminTips.forEach((t, i) => {
      tipsHtml += `
        <div class="tip-item">
          <div class="tip-num">${i + 1}</div>
          <div class="tip-text">${_tipEsc(t.text || t)}</div>
        </div>`;
    });

    // 좋아요 순 정렬 후 순위 맵 생성
    const sortedByLikes = [...userTipsList].sort((a, b) =>
      ((b.likedBy||[]).length - (a.likedBy||[]).length) ||
      ((b.createdAt?.seconds||0) - (a.createdAt?.seconds||0))
    );
    const rankMap = {};
    sortedByLikes.forEach((t, i) => { rankMap[t._id] = i + 1; });

    // 유저 팁 렌더링 (좋아요 순)
    sortedByLikes.forEach(t => {
      const isOwn      = t.authorUid === uid;
      const author     = _tipEsc(t.authorName || '익명');
      const text       = _tipEsc(t.text || '');
      const photo      = t.authorPhoto || '';
      const initial    = _tipEsc((t.authorName || '?')[0]);
      const likedBy    = t.likedBy    || [];
      const dislikedBy = t.dislikedBy || [];
      const likeCount  = likedBy.length;
      const dislikeCount = dislikedBy.length;
      const isLiked    = uid && likedBy.includes(uid);
      const isDisliked = uid && dislikedBy.includes(uid);
      const rank       = rankMap[t._id];
      const badgeHtml  = _tipBadgeHtml(rank, likeCount);
      const dateStr    = _formatTipDate(t.createdAt);

      const tipAvatarHtml = photo
        ? `<img class="tip-item-avatar" src="${_tipEsc(photo)}" alt=""
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
           <div class="tip-item-avatar-initial" style="display:none">${initial}</div>`
        : `<div class="tip-item-avatar-initial">${initial}</div>`;

      const voteDisabled = !uid ? 'disabled title="로그인 후 이용 가능"' : '';
      tipsHtml += `
        <div class="tip-item tip-item-user" data-tipid="${_tipEsc(t._id)}">
          <div class="tip-item-avatar-wrap">${tipAvatarHtml}</div>
          <div class="tip-body">
            <div class="tip-author-line">${badgeHtml}<span class="tip-author-name">${author}</span></div>
            ${dateStr ? `<div class="tip-date">${dateStr}</div>` : ''}
            <div class="tip-text">${text}</div>
            <div class="tip-vote-wrap">
              <button class="tip-vote-btn${isLiked?' liked':''}" ${voteDisabled}
                onclick="toggleTipVote('${_tipEsc(t._id)}', ${cid}, 'like')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="15" height="15" style="flex-shrink:0"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                <span class="tip-vote-count">${likeCount}</span>
              </button>
              <button class="tip-vote-btn dislike${isDisliked?' disliked':''}" ${voteDisabled}
                onclick="toggleTipVote('${_tipEsc(t._id)}', ${cid}, 'dislike')">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="15" height="15" style="flex-shrink:0"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                <span class="tip-vote-count">${dislikeCount}</span>
              </button>
            </div>
          </div>
          ${isOwn ? `
          <div class="tip-own-actions">
            <button class="tip-edit-btn" onclick="editUserTip('${_tipEsc(t._id)}', ${cid})" title="수정">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </button>
            <button class="tip-delete-btn" onclick="deleteUserTip('${_tipEsc(t._id)}', ${cid})" title="삭제">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="13" height="13">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>` : ''}
        </div>`;
    });

    if (!adminTips.length && !userTipsList.length) {
      tipsHtml = '<div class="empty-state"><p>등록된 꿀팁이 없습니다</p><p class="empty-sub">첫 번째 꿀팁을 작성해보세요!</p></div>';
    }

    // 작성 폼 또는 로그인 유도
    let writeSection = '';
    if (uid) {
      const user    = currentUser;
      const profile = typeof currentUserProfile !== 'undefined' ? currentUserProfile : null;
      const isBlocked = profile?.canWrite === false;

      if (isBlocked) {
        writeSection = `
          <div class="user-tip-blocked">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20" style="flex-shrink:0;color:var(--danger,#f85149)">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
            </svg>
            <p>유저 신고로 인해 글쓰기 권한이 제한되었습니다.</p>
          </div>`;
      } else {
        const photoURL    = profile?.avatar || '';
        const displayName = _tipEsc(profile?.nickname || user.displayName || '사용자');
        const avatarHtml  = photoURL
          ? `<img class="user-tip-avatar" src="${_tipEsc(photoURL)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
             <div class="user-tip-avatar-initial" style="display:none">${_tipEsc((profile?.nickname||'?')[0])}</div>`
          : `<img class="user-tip-avatar" src="" alt="" style="display:none">
             <div class="user-tip-avatar-initial">${_tipEsc((profile?.nickname||user.displayName||user.email||'?')[0])}</div>`;
        writeSection = `
          <div class="user-tip-form" id="userTipForm_${cid}">
            <div class="user-tip-form-top">
              ${avatarHtml}
              <span class="user-tip-name">${displayName}</span>
            </div>
            <textarea class="user-tip-textarea" id="userTipInput_${cid}"
              placeholder="이 캐릭터의 꿀팁을 공유해보세요 (최대 200자)" maxlength="200" rows="3"></textarea>
            <div class="user-tip-form-footer">
              <span class="user-tip-char-count"><span id="userTipCount_${cid}">0</span>/200</span>
              <button class="user-tip-submit-btn" onclick="submitUserTip(${cid})">등록하기</button>
            </div>
          </div>`;
      }
    } else {
      writeSection = `
        <div class="user-tip-login-prompt">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20" style="flex-shrink:0">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          <p>로그인하고 꿀팁을 공유해보세요!</p>
          <button class="btn-login-prompt" onclick="openLoginModal('login')">로그인</button>
        </div>`;
    }

    body.innerHTML = writeSection + tipsHtml;

    // 글자 수 카운터
    const textarea = document.getElementById(`userTipInput_${cid}`);
    const counter  = document.getElementById(`userTipCount_${cid}`);
    if (textarea && counter) {
      textarea.addEventListener('input', () => { counter.textContent = textarea.value.length; });
    }

  } else if (tab === 'recent') {
    const patches     = CHAR_RECENT_PATCHES[cid] || [];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recent = patches.filter(p => new Date(p.date) >= oneMonthAgo);
    if (recent.length) {
      // 날짜별 그룹핑
      const groupMap = {};
      const groupOrder = [];
      recent.forEach(p => {
        if (!groupMap[p.date]) { groupMap[p.date] = []; groupOrder.push(p.date); }
        groupMap[p.date].push(p);
      });
      body.innerHTML = groupOrder.map(date => `
        <div class="patch-date-group">
          <div class="patch-group-date">${formatDate(date)}</div>
          ${groupMap[date].map(p => `
            <div class="patch-entry">
              <span class="patch-entry-type ${p.type}">${p.type === 'buff' ? '버프' : p.type === 'nerf' ? '너프' : '수정'}</span>
              <div class="patch-entry-text">${p.text}</div>
            </div>`).join('')}
        </div>`).join('');
    } else {
      body.innerHTML = '<div class="empty-state"><p>최근 1개월 내 패치 내용이 없습니다</p></div>';
    }
  }
}

// ── 유저 꿀팁 헬퍼 ──────────────────────────────────────────────────────────
function _tipEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _formatTipDate(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds * 1000 : ts);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function _tipBadgeHtml(rank, likeCount) {
  if (likeCount <= 0) return '';
  if (rank === 1) return `<span class="tip-best-badge best-1">BEST 1</span>`;
  if (rank === 2) return `<span class="tip-best-badge best-2">BEST 2</span>`;
  if (rank === 3) return `<span class="tip-best-badge best-3">BEST 3</span>`;
  if (rank <= 5)  return `<span class="tip-best-badge best-rest">BEST</span>`;
  return '';
}

async function submitUserTip(charId) {
  const user    = typeof currentUser !== 'undefined' ? currentUser : null;
  const profile = typeof currentUserProfile !== 'undefined' ? currentUserProfile : null;
  if (!user) { loginWithGoogle(); return; }
  if (!profile) { _openProfileSetup(); return; }
  if (profile.canWrite === false) {
    if (typeof showToast === 'function') showToast('유저 신고로 인해 글쓰기 권한이 제한되었습니다.', 'error');
    return;
  }

  const textarea = document.getElementById(`userTipInput_${charId}`);
  if (!textarea) return;
  const text = textarea.value.trim();
  if (!text) { textarea.focus(); return; }
  if (text.length > 200) return;

  const btn = document.querySelector(`#userTipForm_${charId} .user-tip-submit-btn`);
  if (btn) { btn.disabled = true; btn.textContent = '등록 중...'; }

  try {
    await db.collection('userTips').add({
      charId,
      text,
      authorUid:   user.uid,
      authorName:  profile.nickname || '익명',
      authorPhoto: profile.avatar || '',
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
      likedBy:     [],
      dislikedBy:  [],
    });
    await switchCharTab('tips', charId);
  } catch (err) {
    console.error('꿀팁 등록 실패:', err);
    if (btn) { btn.disabled = false; btn.textContent = '등록하기'; }
    alert('등록에 실패했습니다.\n\n[Firestore 규칙] userTips 컬렉션에 인증된 사용자의 쓰기 권한이 필요합니다.');
  }
}

function editUserTip(tipId, charId) {
  const item = document.querySelector(`.tip-item-user[data-tipid="${tipId}"]`);
  if (!item) return;
  const textEl = item.querySelector('.tip-text');
  if (!textEl) return;
  const rawText = textEl.textContent;

  const ownActions = item.querySelector('.tip-own-actions');
  if (ownActions) ownActions.style.display = 'none';

  // 안전한 DOM API 방식 — outerHTML 문자열 주입 대신 사용
  const ta = document.createElement('textarea');
  ta.className = 'tip-edit-textarea user-tip-textarea';
  ta.maxLength = 200;
  ta.rows = 3;
  ta.value = rawText;

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'tip-edit-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'tip-cancel-btn';
  cancelBtn.textContent = '취소';
  cancelBtn.addEventListener('click', () => switchCharTab('tips', charId));

  const saveBtn = document.createElement('button');
  saveBtn.className = 'tip-save-btn';
  saveBtn.textContent = '저장';
  saveBtn.addEventListener('click', () => saveUserTip(tipId, charId));

  actionsDiv.appendChild(cancelBtn);
  actionsDiv.appendChild(saveBtn);

  const editWrap = document.createElement('div');
  editWrap.appendChild(ta);
  editWrap.appendChild(actionsDiv);

  textEl.replaceWith(editWrap);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = ta.value.length;
}

async function saveUserTip(tipId, charId) {
  const profile = typeof currentUserProfile !== 'undefined' ? currentUserProfile : null;
  if (profile?.canWrite === false) {
    if (typeof showToast === 'function') showToast('유저 신고로 인해 글쓰기 권한이 제한되었습니다.', 'error');
    await switchCharTab('tips', charId);
    return;
  }
  const item = document.querySelector(`.tip-item-user[data-tipid="${tipId}"]`);
  const textarea = item?.querySelector('.tip-edit-textarea');
  if (!textarea) return;
  const newText = textarea.value.trim();
  if (!newText) { textarea.focus(); return; }
  const saveBtn = item.querySelector('.tip-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '저장 중...'; }
  try {
    await db.collection('userTips').doc(tipId).update({ text: newText });
    await switchCharTab('tips', charId);
  } catch (err) {
    console.error('꿀팁 수정 실패:', err);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '저장'; }
    if (typeof showToast === 'function') showToast('수정에 실패했습니다. 다시 시도해주세요.', 'error');
  }
}

async function toggleTipVote(tipId, charId, type) {
  const user = typeof currentUser !== 'undefined' ? currentUser : null;
  if (!user) { if (typeof openLoginModal === 'function') openLoginModal('login'); return; }

  const uid = user.uid;
  const ref = db.collection('userTips').doc(tipId);
  try {
    const snap = await ref.get();
    if (!snap.exists) return;
    const data = snap.data();
    const likedBy    = data.likedBy    || [];
    const dislikedBy = data.dislikedBy || [];
    const alreadyLiked    = likedBy.includes(uid);
    const alreadyDisliked = dislikedBy.includes(uid);

    if (type === 'like') {
      if (alreadyLiked) {
        await ref.update({ likedBy: firebase.firestore.FieldValue.arrayRemove(uid) });
      } else {
        await ref.update({
          likedBy:    firebase.firestore.FieldValue.arrayUnion(uid),
          dislikedBy: firebase.firestore.FieldValue.arrayRemove(uid),
        });
      }
    } else {
      if (alreadyDisliked) {
        await ref.update({ dislikedBy: firebase.firestore.FieldValue.arrayRemove(uid) });
      } else {
        await ref.update({
          dislikedBy: firebase.firestore.FieldValue.arrayUnion(uid),
          likedBy:    firebase.firestore.FieldValue.arrayRemove(uid),
        });
      }
    }
    await switchCharTab('tips', charId);
  } catch (err) {
    console.error('투표 실패:', err);
    if (typeof showToast === 'function') showToast('처리에 실패했습니다.', 'error');
  }
}

async function deleteUserTip(tipId, charId) {
  if (!confirm('이 꿀팁을 삭제하시겠습니까?')) return;
  try {
    await db.collection('userTips').doc(tipId).delete();
    await switchCharTab('tips', charId);
  } catch (err) {
    console.error('꿀팁 삭제 실패:', err);
    if (typeof showToast === 'function') showToast('삭제에 실패했습니다.', 'error');
  }
}

let _charInited = false;

function initCharPage() {
  renderCharGrid();

  if (_charInited) return;
  _charInited = true;

  initCharFilters();

  document.getElementById('charModalClose')?.addEventListener('click', closeCharModal);
  document.getElementById('charModalOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeCharModal();
  });

  document.querySelectorAll('#charModal .modal-tab').forEach(tab => {
    tab.addEventListener('click', () => switchCharTab(tab.dataset.tab));
  });

  document.querySelectorAll('.char-subtab-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.char-subtab-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      charTabMode = item.dataset.chartab;
      const attrFilter = document.getElementById('charAttributeFilter');
      const typeFilter  = document.getElementById('charTypeFilter');
      const isSupport   = charTabMode === 'support';
      if (attrFilter) attrFilter.style.display = isSupport ? 'none' : '';
      if (typeFilter)  typeFilter.style.display  = isSupport ? 'none' : '';
      renderCharGrid();
    });
  });
}
