// ===== GNB 팝업 전체 닫기 헬퍼 =====
function _closeAllGnbPopups() {
  document.getElementById('gnbBkPopup')?.classList.remove('open');
  document.getElementById('gnbDropdown')?.classList.remove('open');
  document.getElementById('gnbUserDropdown')?.classList.remove('open');
  const helpBubble = document.getElementById('gnbBkHelpBubble');
  const helpBtn    = document.getElementById('gnbBkHelpBtn');
  if (helpBubble) helpBubble.classList.remove('open');
  if (helpBtn)    helpBtn.classList.remove('active');
}

// ===== 즐겨찾기 팝업 =====
function initBookmarkPopup() {
  // detail.html은 인라인 스크립트가 별도 처리 → 2중 등록 방지
  if (document.getElementById('commProfileCard')) return;

  const btn        = document.getElementById('gnbBookmarkBtn');
  const popup      = document.getElementById('gnbBkPopup');
  const helpBtn    = document.getElementById('gnbBkHelpBtn');
  const helpBubble = document.getElementById('gnbBkHelpBubble');
  if (!btn || !popup) return;

  let activeTab = 'char';

  // 팝업 열기/닫기
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const opening = !popup.classList.contains('open');
    _closeAllGnbPopups();
    if (opening) {
      popup.classList.add('open');
      renderBkPopup(activeTab);
    }
  });

  // 도움말 버튼 토글
  if (helpBtn && helpBubble) {
    helpBtn.addEventListener('click', e => {
      e.stopPropagation();
      const open = helpBubble.classList.toggle('open');
      helpBtn.classList.toggle('active', open);
    });
  }

  // 탭 전환
  popup.querySelectorAll('.gnb-bk-tab').forEach(tab => {
    tab.addEventListener('click', e => {
      e.stopPropagation();
      activeTab = tab.dataset.bkTab;
      popup.querySelectorAll('.gnb-bk-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderBkPopup(activeTab);
    });
  });

  // 바깥 클릭 시 닫기
  document.addEventListener('click', e => {
    if (!popup.contains(e.target) && e.target !== btn) {
      popup.classList.remove('open');
      if (helpBubble) {
        helpBubble.classList.remove('open');
        helpBtn && helpBtn.classList.remove('active');
      }
    }
  });
}

function openBkChar(charId, isSupport) {
  // 팝업 닫기
  const popup = document.getElementById('gnbBkPopup');
  if (popup) popup.classList.remove('open');

  // 캐릭터 페이지로 이동
  navigateTo('character');

  // 서브탭 전환 (일반/서폿)
  const targetTab = isSupport ? 'support' : 'all';
  if (typeof charTabMode !== 'undefined') {
    charTabMode = targetTab;
  }
  document.querySelectorAll('.char-subtab-item').forEach(item => {
    item.classList.toggle('active', item.dataset.chartab === targetTab);
  });
  // 속성/타입 필터 표시 동기화
  const attrFilter = document.getElementById('charAttributeFilter');
  const typeFilter  = document.getElementById('charTypeFilter');
  if (attrFilter) attrFilter.style.display = isSupport ? 'none' : '';
  if (typeFilter)  typeFilter.style.display  = isSupport ? 'none' : '';

  // 즐겨찾기 필터 ON
  if (typeof charFavoriteOnly !== 'undefined') {
    charFavoriteOnly = true;
  }
  const favBtn = document.getElementById('charFavBtn');
  if (favBtn) favBtn.classList.add('active');

  // 그리드 재렌더
  if (typeof renderCharGrid === 'function') {
    renderCharGrid();
  }

  // 선택한 캐릭터 모달 오픈
  setTimeout(() => {
    if (typeof openCharModal === 'function') {
      openCharModal(charId, isSupport);
    }
  }, 80);
}

function renderBkPopup(tab) {
  const body = document.getElementById('gnbBkBody');
  if (!body) return;

  const isSupport = (tab === 'support');
  let favs;
  try {
    favs = typeof getFavorites === 'function'
      ? getFavorites()
      : new Set(JSON.parse(localStorage.getItem('opfp_favorites') || '[]').map(String));
  } catch { favs = new Set(); }

  const srcList = isSupport
    ? (typeof SUPPORT_CHARACTERS !== 'undefined' ? SUPPORT_CHARACTERS : [])
    : (typeof CHARACTERS         !== 'undefined' ? CHARACTERS         : []);

  const favList = srcList.filter(c => {
    const key = isSupport ? 's_' + c.id : String(c.id);
    return favs.has(key);
  });

  if (favList.length === 0) {
    body.innerHTML = '<div class="gnb-bk-empty">' +
      '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">' +
      '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" ' +
      'd="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 ' +
      '1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 ' +
      '1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518' +
      '-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951' +
      '-.69l1.519-4.674z"/></svg>' +
      '즐겨찾기한 캐릭터가 없습니다.</div>';
    return;
  }

  const items = favList.map(c => {
    const imgSrc = c.img || c.image || '';
    const name   = c.name || '';
    const imgTag = imgSrc
      ? '<img src="' + imgSrc + '" alt="' + name + '" loading="lazy">'
      : '<div class="gnb-bk-char-img-placeholder"></div>';
    return '<div class="gnb-bk-char-item" title="' + name + '" onclick="openBkChar(' + c.id + ',' + isSupport + ')">' +
      '<div class="gnb-bk-char-img-wrap">' + imgTag + '</div>' +
      '<span class="gnb-bk-char-name">' + name + '</span>' +
      '</div>';
  }).join('');

  body.innerHTML = '<div class="gnb-bk-grid">' + items + '</div>';
}

// ===== MAIN APP =====

let currentPage = 'home';

function moveSubnavSlider(page) {
  const slider = document.querySelector('.subnav-slider');
  const activeItem = document.querySelector(`.subnav-item[data-page="${page}"]`);
  if (!slider || !activeItem) return;
  slider.style.width = activeItem.offsetWidth + 'px';
  slider.style.transform = `translateX(${activeItem.offsetLeft}px)`;
  // 모바일: 활성 탭이 보이도록 subnav 스크롤
  const subnavInner = document.querySelector('.subnav-inner');
  if (subnavInner) {
    subnavInner.scrollLeft = activeItem.offsetLeft - (subnavInner.clientWidth - activeItem.offsetWidth) / 2;
  }
}

function navigateTo(page) {
  currentPage = page;

  document.querySelectorAll('.subnav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  moveSubnavSlider(page);

  document.querySelectorAll('.page').forEach(p => {
    p.classList.toggle('active', p.id === `page-${page}`);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== THEME =====
let themeChannel = null;

if ('BroadcastChannel' in window) {
  themeChannel = new BroadcastChannel('opfp-theme');
  themeChannel.addEventListener('message', event => {
    if (event.data && event.data.type === 'theme-change') {
      applyTheme(event.data.theme, { broadcast: false });
    }
  });
}

window.addEventListener('storage', event => {
  if (event.key === 'theme') {
    applyTheme(event.newValue || 'system', { broadcast: false });
  }
});

function initTheme() {
  const saved = localStorage.getItem('theme') || 'system';
  applyTheme(saved);
  // 시스템 테마 변경 감지
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function() {
    if (localStorage.getItem('theme') === 'system') applyTheme('system');
  });
}

function applyTheme(theme, options) {
  const isLight = theme === 'light' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
  if (isLight) {
    document.documentElement.classList.add('light');
  } else {
    document.documentElement.classList.remove('light');
  }
  localStorage.setItem('theme', theme);
  const label = document.getElementById('themeCurrentLabel');
  if (label) label.textContent = theme === 'light' ? '라이트' : theme === 'system' ? '시스템' : '다크';
  // 테마 옵션 active 상태 동기화
  document.querySelectorAll('.gnb-theme-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  // 로고 테마 전환 (CSS content 미지원 브라우저 대비)
  var logoSrc = isLight ? 'img/logo-light.png' : 'img/logo-dark.png';
  document.querySelectorAll('img.logo-img').forEach(function(img) { img.src = logoSrc; });

  if (!options || options.broadcast !== false) {
    if (themeChannel) {
      themeChannel.postMessage({ type: 'theme-change', theme: theme });
    }
  }
}

// ===== 앱 아이콘 적용 =====
function applyAppIcon(iconKey) {
  var src = (iconKey === 'light') ? 'img/logo-light.png' : 'img/logo-dark.png';
  var touchIcon = document.getElementById('appTouchIcon');
  var faviconIcon = document.getElementById('appFaviconIcon');
  if (touchIcon) touchIcon.href = src;
  if (faviconIcon) faviconIcon.href = src;
  localStorage.setItem('appIcon', iconKey || 'dark');

  // SW에 아이콘 변경 메시지 전송 (이미 설치된 PWA에도 적용)
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SET_ICON', iconKey: iconKey || 'dark' });
  }

  // Cache API에서 logo.png를 선택된 아이콘으로 직접 교체
  if ('caches' in window) {
    fetch(src, { cache: 'no-store' }).then(function(res) {
      if (!res || !res.ok) return;
      caches.keys().then(function(keys) {
        keys.filter(function(k) { return k.startsWith('opfp-'); }).forEach(function(k) {
          caches.open(k).then(function(cache) {
            cache.put('./img/logo.png', res.clone());
            cache.put('img/logo.png', res.clone());
          });
        });
      });
    }).catch(function(){});
  }
}

// ===== GNB MENU =====
function initGnbMenu() {
  const btn      = document.getElementById('gnbMenuBtn');
  const dropdown = document.getElementById('gnbDropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (window.innerWidth <= 480) {
      // 모바일: 설정 페이지로 이동
      const currentPage = location.pathname.endsWith('detail.html') ? 'detail' : 'index';
      window.location.href = 'setting.html?from=' + currentPage;
    } else {
      const opening = !dropdown.classList.contains('open');
      _closeAllGnbPopups();
      if (opening) dropdown.classList.add('open');
    }
  });
  document.addEventListener('click', e => {
    if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
  });

  // ── 내 정보 ──
  document.getElementById('settingMyInfo')?.addEventListener('click', () => {
    dropdown.classList.remove('open');
    _initMyInfoModal();
    _openSubModal('myInfoModalOverlay');
  });
  document.getElementById('myInfoModalClose')?.addEventListener('click', () => _closeSubModal('myInfoModalOverlay'));

  // ── 테마 변경 ──
  document.getElementById('settingTheme')?.addEventListener('click', () => {
    dropdown.classList.remove('open');
    _openSubModal('themeModalOverlay');
  });
  document.querySelectorAll('.gnb-theme-option').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
      _closeSubModal('themeModalOverlay');
    });
  });
  document.getElementById('themeModalClose')?.addEventListener('click', () => _closeSubModal('themeModalOverlay'));

  // ── 앱 아이콘 변경 ──
  document.getElementById('settingAppIcon')?.addEventListener('click', () => {
    dropdown.classList.remove('open');
    _initAppIconModal();
    _openSubModal('appIconModalOverlay');
  });
  document.getElementById('appIconModalClose')?.addEventListener('click', () => _closeSubModal('appIconModalOverlay'));

  // ── 언어 변경 ──
  document.getElementById('settingLang')?.addEventListener('click', () => {
    dropdown.classList.remove('open');
    _initLangModal();
    _openSubModal('langModalOverlay');
  });
  document.getElementById('langModalClose')?.addEventListener('click', () => _closeSubModal('langModalOverlay'));

  // ── 알림 설정 ──
  document.getElementById('settingNotif')?.addEventListener('click', () => {
    dropdown.classList.remove('open');
    _initNotifModal();
    _openSubModal('notifModalOverlay');
  });
  document.getElementById('notifModalClose')?.addEventListener('click', () => _closeSubModal('notifModalOverlay'));

  // ── 공지사항 ──
  document.getElementById('settingNotice')?.addEventListener('click', () => {
    dropdown.classList.remove('open');
    _loadNotices();
    _openSubModal('noticeModalOverlay');
  });
  document.getElementById('noticeModalClose')?.addEventListener('click', () => _closeSubModal('noticeModalOverlay'));
  document.getElementById('noticeDetailBack')?.addEventListener('click', _backToNoticeList);
  document.getElementById('noticeDetailClose')?.addEventListener('click', () => {
    _backToNoticeList();
    _closeSubModal('noticeModalOverlay');
  });

  // 오버레이 배경 클릭 시 닫기
  document.querySelectorAll('.gnb-sub-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });
}

function initAuthMenuEntry() {
  const authMode = new URLSearchParams(location.search).get('auth');
  if (authMode !== 'menu') return;

  const authMenu = document.getElementById('gnbAuthMenu');
  const dropdown = document.getElementById('gnbDropdown');
  if (authMenu) authMenu.style.display = 'block';
  if (dropdown) {
    dropdown.classList.add('open');
    dropdown.classList.add('auth-menu-mode');
  }

  const currentPage = location.pathname.endsWith('detail.html') ? 'detail' : 'index';
  const goHomeForAuth = mode => {
    window.location.href = currentPage + '.html?auth=' + encodeURIComponent(mode);
  };
  document.getElementById('authEmailLoginBtn')?.addEventListener('click', () => goHomeForAuth('email'));
  document.getElementById('authGoogleLoginBtn')?.addEventListener('click', () => goHomeForAuth('google'));
  document.getElementById('authRegisterBtn')?.addEventListener('click', () => goHomeForAuth('register'));
}

function _openSubModal(id) {
  document.getElementById(id)?.classList.add('open');
}
function _closeSubModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// ── 앱 아이콘 컬러 핸들러 ──
function _initAppIconModal() {
  const saved = localStorage.getItem('accentColor') || '#4d9fff';
  document.querySelectorAll('.gnb-icon-color-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === saved);
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      document.documentElement.style.setProperty('--accent', color);
      localStorage.setItem('accentColor', color);
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute('content', color);
      document.querySelectorAll('.gnb-icon-color-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  // 저장된 accent 색상 복원
  document.documentElement.style.setProperty('--accent', saved);
}

// ── 언어 선택 핸들러 ──
function _initLangModal() {
  const saved = localStorage.getItem('appLang') || 'ko';
  const labelEl = document.getElementById('langCurrentLabel');
  document.querySelectorAll('.gnb-lang-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === saved);
    btn.addEventListener('click', () => {
      localStorage.setItem('appLang', btn.dataset.lang);
      document.querySelectorAll('.gnb-lang-option').forEach(b => b.classList.toggle('active', b === btn));
      if (labelEl) labelEl.textContent = btn.dataset.lang === 'ko' ? '한국어' : 'English';
      _closeSubModal('langModalOverlay');
    });
  });
  if (labelEl) labelEl.textContent = saved === 'ko' ? '한국어' : 'English';
}

// ── 내 정보 모달 핸들러 ──
function _initMyInfoModal() {
  const list    = document.getElementById('gnbMyInfoList');
  const emailEl = document.getElementById('gnbMyInfoEmail');
  if (!list) return;

  const user = (typeof auth !== 'undefined') ? auth.currentUser : null;
  if (!user) {
    list.innerHTML = '<div class="gnb-myinfo-loading">로그인이 필요합니다.</div>';
    if (emailEl) emailEl.textContent = '';
    return;
  }

  const profile       = (typeof currentUserProfile !== 'undefined' && currentUserProfile) || {};
  const nickname      = profile.nickname || user.displayName || '닉네임 없음';
  const isEmailUser   = (user.providerData || []).some(p => p.providerId === 'password');
  const providerLabel = isEmailUser ? '이메일' : 'Google';

  const arrowSvg = '<svg class="gnb-myinfo-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

  function _icon(path) {
    return '<span class="gnb-myinfo-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg></span>';
  }
  function _esc(v) {
    return String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  list.innerHTML =
    '<button type="button" class="gnb-myinfo-row is-action" id="gnbMyInfoNickname">' +
      _icon('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>') +
      '<span class="gnb-myinfo-label">닉네임</span>' +
      '<span class="gnb-myinfo-value">' + _esc(nickname) + '</span>' +
      arrowSvg +
    '</button>' +
    '<div class="gnb-myinfo-row">' +
      _icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>') +
      '<span class="gnb-myinfo-label">가입 계정 정보</span>' +
      '<span class="gnb-myinfo-value">' + _esc(providerLabel) + '</span>' +
    '</div>' +
    (isEmailUser
      ? '<button type="button" class="gnb-myinfo-row is-action" id="gnbMyInfoPassword">' +
          _icon('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>') +
          '<span class="gnb-myinfo-label">비밀번호 변경</span>' +
          arrowSvg +
        '</button>'
      : '') +
    '<button type="button" class="gnb-myinfo-row is-action" id="gnbMyInfoLogout">' +
      _icon('<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M21 19V5a2 2 0 0 0-2-2h-6"/>') +
      '<span class="gnb-myinfo-label">로그아웃</span>' +
      arrowSvg +
    '</button>' +
    '<button type="button" class="gnb-myinfo-row is-action is-danger" id="gnbMyInfoDelete">' +
      _icon('<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/>') +
      '<span class="gnb-myinfo-label">탈퇴하기</span>' +
      arrowSvg +
    '</button>';

  if (emailEl) emailEl.textContent = user.email || '';

  document.getElementById('gnbMyInfoNickname')?.addEventListener('click', () => {
    _closeSubModal('myInfoModalOverlay');
    if (typeof openProfileEdit === 'function') openProfileEdit();
  });

  document.getElementById('gnbMyInfoPassword')?.addEventListener('click', async () => {
    const u = (typeof auth !== 'undefined') ? auth.currentUser : null;
    if (!u || !u.email) return;
    const ok = await _gnbConfirm('비밀번호 변경', u.email + '으로 비밀번호 재설정 이메일을 보내시겠습니까?');
    if (!ok) return;
    try {
      await auth.sendPasswordResetEmail(u.email);
      _closeSubModal('myInfoModalOverlay');
      if (typeof showToast === 'function') showToast('비밀번호 재설정 이메일을 보냈습니다.', 'success');
    } catch(e) {
      if (typeof showToast === 'function') showToast('이메일 전송에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  });

  document.getElementById('gnbMyInfoLogout')?.addEventListener('click', async () => {
    const ok = await _gnbConfirm('로그아웃 확인', '로그아웃하시겠습니까?');
    if (!ok) return;
    try {
      if (typeof logoutUser === 'function') await logoutUser();
      _closeSubModal('myInfoModalOverlay');
    } catch(e) {
      if (typeof showToast === 'function') showToast('로그아웃에 실패했습니다.', 'error');
    }
  });

  document.getElementById('gnbMyInfoDelete')?.addEventListener('click', async () => {
    const ok = await _gnbConfirm('탈퇴 확인', '지금 탈퇴 시 24시간 동안 재가입이 불가능합니다.\n진행하시겠습니까?');
    if (!ok) return;
    try {
      const u = (typeof auth !== 'undefined') ? auth.currentUser : null;
      if (!u) return;
      if (typeof db !== 'undefined') {
        const restrictUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await db.collection('withdrawRestrictions').doc(u.uid).set({
          withdrawnAt: firebase.firestore.FieldValue.serverTimestamp(),
          restrictUntil: firebase.firestore.Timestamp.fromDate(restrictUntil),
          email: u.email || '',
        });
      }
      await u.delete();
      _closeSubModal('myInfoModalOverlay');
      if (typeof showToast === 'function') showToast('탈퇴가 완료되었습니다.', 'success');
    } catch(e) {
      const msg = (e.code === 'auth/requires-recent-login')
        ? '보안을 위해 다시 로그인한 후 탈퇴해주세요.'
        : '탈퇴에 실패했습니다. 다시 시도해주세요.';
      if (typeof showToast === 'function') showToast(msg, 'error');
    }
  });
}

function _gnbConfirm(title, message) {
  return new Promise(resolve => {
    const overlay   = document.getElementById('gnbConfirmOverlay');
    const titleEl   = document.getElementById('gnbConfirmTitle');
    const msgEl     = document.getElementById('gnbConfirmMessage');
    const okBtn     = document.getElementById('gnbConfirmOk');
    const cancelBtn = document.getElementById('gnbConfirmCancel');
    if (!overlay) { resolve(window.confirm(message)); return; }
    if (titleEl) titleEl.textContent = title;
    if (msgEl)   msgEl.textContent   = message;
    overlay.classList.add('open');
    function finish(result) {
      overlay.classList.remove('open');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      resolve(result);
    }
    const onOk      = () => finish(true);
    const onCancel  = () => finish(false);
    const onOverlay = e => { if (e.target === overlay) finish(false); };
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
  });
}

// ── 알림 설정 핸들러 ──
function _initNotifModal() {
  const keys = ['notifPatch', 'notifFavorite', 'notifEvent', 'notifReply'];
  keys.forEach(key => {
    const el = document.getElementById(key);
    if (!el) return;
    el.checked = localStorage.getItem(key) === 'true';
    el.addEventListener('change', () => {
      localStorage.setItem(key, el.checked);
      if (el.checked && 'Notification' in window) {
        Notification.requestPermission();
      }
    });
  });
}

// ── 공지사항 로드 (Firestore 'notices' 컬렉션) ──
let _noticeDocsCache = [];

function _loadNotices() {
  const listEl = document.getElementById('gnbNoticeList');
  if (!listEl) return;
  listEl.innerHTML = '<div class="gnb-notice-loading">공지사항을 불러오는 중...</div>';
  if (typeof db === 'undefined') {
    listEl.innerHTML = '<div class="gnb-notice-empty">공지사항을 불러올 수 없습니다.</div>';
    return;
  }
  db.collection('notices').orderBy('createdAt', 'desc').limit(20).get()
    .then(snap => {
      if (snap.empty) {
        _noticeDocsCache = [];
        listEl.innerHTML = '<div class="gnb-notice-empty">등록된 공지사항이 없습니다.</div>';
        return;
      }
      _noticeDocsCache = snap.docs
        .map(doc => doc.data())
        .filter(d => d.visible !== false);
      if (!_noticeDocsCache.length) {
        listEl.innerHTML = '<div class="gnb-notice-empty">등록된 공지사항이 없습니다.</div>';
        return;
      }
      listEl.innerHTML = _noticeDocsCache.map((d, i) => {
        const date = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('ko-KR') : '';
        const isNew = d.createdAt?.toDate && (Date.now() - d.createdAt.toDate().getTime() < 7 * 24 * 60 * 60 * 1000);
        const isPinned = !!d.pinned;
        return `<div class="gnb-notice-item" onclick="_openNoticeDetail(${i})">
          <div class="gnb-notice-item-title">${isPinned ? '<span class="gnb-notice-item-pin">📌</span>' : ''}${isNew ? '<span class="gnb-notice-item-badge">NEW</span>' : ''}${escHtml(d.title || '제목 없음')}</div>
          <div class="gnb-notice-item-date">${escHtml(date)}</div>
        </div>`;
      }).join('');
    })
    .catch(() => {
      listEl.innerHTML = '<div class="gnb-notice-empty">공지사항을 불러올 수 없습니다.</div>';
    });
}

function _openNoticeDetail(idx) {
  const d = _noticeDocsCache[idx];
  if (!d) return;

  // 헤더 전환
  document.getElementById('noticeListHeader').style.display = 'none';
  document.getElementById('noticeDetailHeader').style.display = '';

  // 목록 ↔ 상세 전환
  document.getElementById('gnbNoticeList').style.display = 'none';
  document.getElementById('gnbNoticeDetail').style.display = '';

  // 모바일 바텀시트 스크롤 상단 리셋
  const modal = document.querySelector('#noticeModalOverlay .gnb-sub-modal');
  if (modal) modal.scrollTop = 0;

  // 제목
  document.getElementById('gnbNoticeDetailTitle').textContent = d.title || '제목 없음';

  // 메타 (날짜 + 뱃지)
  const date = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('ko-KR') : '';
  const isNew = d.createdAt?.toDate && (Date.now() - d.createdAt.toDate().getTime() < 7 * 24 * 60 * 60 * 1000);
  const metaEl = document.getElementById('gnbNoticeDetailMeta');
  metaEl.innerHTML =
    (isNew ? '<span class="gnb-notice-item-badge">NEW</span>' : '') +
    (d.pinned ? '<span class="gnb-notice-detail-pin-badge">📌 상단 고정</span>' : '') +
    `<span class="gnb-notice-detail-date">${escHtml(date)}</span>`;

  // 본문 (summernote HTML — XSS 방지 위해 DOMPurify 없이 innerHTML 사용 / 신뢰된 관리자 콘텐츠)
  document.getElementById('gnbNoticeDetailContent').innerHTML = d.content || '<p style="color:var(--text-dim)">내용이 없습니다.</p>';
}

function _backToNoticeList() {
  document.getElementById('noticeListHeader').style.display = '';
  document.getElementById('noticeDetailHeader').style.display = 'none';
  document.getElementById('gnbNoticeList').style.display = '';
  document.getElementById('gnbNoticeDetail').style.display = 'none';
}

// ===== SMART STICKY SUBNAV =====
(function initSubnavScroll() {
  const subnav  = document.querySelector('.subnav');
  const subtab  = document.querySelector('.char-subtab-nav');
  if (!subnav) return;

  // subtab의 top을 subnav 높이에 맞게 설정
  // 모바일(≤640px)에서는 subnav가 하단 고정이므로 GNB 바로 아래(56px) 고정
  function _syncSubtabTop(subnavHidden) {
    if (!subtab) return;
    const isMobileBottomNav = window.matchMedia('(max-width: 640px)').matches;
    subtab.style.top = (subnavHidden || isMobileBottomNav)
      ? '56px'
      : (56 + subnav.offsetHeight) + 'px';
  }

  // 초기값 세팅
  _syncSubtabTop(false);

  let lastY = window.scrollY;
  const THRESHOLD = 80;

  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;
    if (currentY > lastY && currentY > THRESHOLD) {
      subnav.classList.add('hidden');
      subtab?.classList.add('hidden');
      _syncSubtabTop(true);
    } else if (currentY < lastY) {
      subnav.classList.remove('hidden');
      subtab?.classList.remove('hidden');
      _syncSubtabTop(false);
    }
    lastY = currentY;
  }, { passive: true });
})();

// ===== BACK TO TOP =====
(function initBackToTop() {
  const btn = document.getElementById('backToTopBtn');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 300);
  }, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  applyAppIcon(localStorage.getItem('appIcon') || 'dark');
  initGnbMenu();
  initAuthMenuEntry();
  initBookmarkPopup();

  document.querySelectorAll('.subnav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // 슬라이더 초기 위치 — 애니메이션 없이 즉시 배치
  const slider = document.querySelector('.subnav-slider');
  if (slider) {
    slider.style.transition = 'none';
    moveSubnavSlider('home');
    requestAnimationFrame(() => { slider.style.transition = ''; });
  }

  // URL 파라미터로 캐릭터 팝업 자동 오픈 (detail.html에서 넘어온 경우)
  // openChar 정보를 먼저 저장해두고 URL은 즉시 정리 — navigateTo('home') 덮어쓰기 방지
  let _pendingOpenChar = null;
  (function() {
    const params = new URLSearchParams(location.search);
    const openChar = params.get('openChar');
    if (!openChar) return;
    const isSupport = params.get('support') === 'true';
    _pendingOpenChar = { charId: Number(openChar) || openChar, isSupport };
    // URL 파라미터 제거 (히스토리 오염 방지)
    history.replaceState(null, '', location.pathname);
  })();

  initHome();
  initCharPage();
  initPatchNote();
  initPvpPatch();
  initEvent();

  // URL ?page= 파라미터로 직접 탭 진입 지원
  // _pendingOpenChar 가 있으면 캐릭터 탭으로, 없으면 page 파라미터 또는 홈
  const _urlPage = new URLSearchParams(location.search).get('page');
  navigateTo(_pendingOpenChar ? 'character' : (_urlPage || 'home'));

  // Firestore 데이터 로드 후 재렌더
  let _timedOut = false;
  await Promise.race([
    initData(),
    new Promise(resolve => setTimeout(() => { _timedOut = true; resolve(); }, 10000))
  ]);
  if (_timedOut) {
    const notice = document.createElement('div');
    notice.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#c0392b;color:#fff;text-align:center;padding:10px 16px;font-size:14px;cursor:pointer;letter-spacing:0.01em;';
    notice.textContent = '데이터를 불러오지 못했습니다. 클릭하여 새로고침';
    notice.addEventListener('click', () => location.reload());
    document.body.prepend(notice);
  }

  initHome();
  initCharPage();
  initPatchNote();
  initPvpPatch();

  // detail.html 즐겨찾기에서 넘어온 경우:
  // 데이터 로드 완료 후 캐릭터 탭 이동 + 즐겨찾기 필터 ON + 선택 캐릭터 팝업 오픈
  if (_pendingOpenChar) {
    const { charId, isSupport } = _pendingOpenChar;
    const targetTab = isSupport ? 'support' : 'all';

    navigateTo('character');

    // 서브탭 전환 (일반/서폿)
    if (typeof charTabMode !== 'undefined') charTabMode = targetTab;
    document.querySelectorAll('.char-subtab-item').forEach(item => {
      item.classList.toggle('active', item.dataset.chartab === targetTab);
    });
    // 속성/타입 필터 표시 동기화
    const attrFilter = document.getElementById('charAttributeFilter');
    const typeFilter  = document.getElementById('charTypeFilter');
    if (attrFilter) attrFilter.style.display = isSupport ? 'none' : '';
    if (typeFilter)  typeFilter.style.display  = isSupport ? 'none' : '';

    // 즐겨찾기 필터 ON
    if (typeof charFavoriteOnly !== 'undefined') charFavoriteOnly = true;
    const favBtn = document.getElementById('charFavBtn');
    if (favBtn) favBtn.classList.add('active');

    // 그리드 재렌더
    if (typeof renderCharGrid === 'function') renderCharGrid();

    // 선택한 캐릭터 모달 오픈
    setTimeout(() => {
      if (typeof openCharModal === 'function') openCharModal(charId, isSupport);
    }, 80);
  }
  // initEvent()는 Firestore 직접 조회하므로 재호출 불필요
});

// ── accent 색상 초기화 ──
(function _restoreAccentColor() {
  const saved = localStorage.getItem('accentColor');
  if (saved) document.documentElement.style.setProperty('--accent', saved);
})();
