// =====================================================================
//  userauth.js  —  Firebase Auth + 프로필 관리
// =====================================================================

// ── 아바타 목록 ──────────────────────────────────────────────────────
const AVATAR_LIST = {
  strawhats: [
    { id: 'luffy',   src: 'img/avatars/luffy.png',   label: '루피'   },
    { id: 'zoro',    src: 'img/avatars/zoro.png',    label: '조로'   },
    { id: 'nami',    src: 'img/avatars/nami.png',    label: '나미'   },
    { id: 'usopp',   src: 'img/avatars/usopp.png',   label: '우솝'   },
    { id: 'sanji',   src: 'img/avatars/sanji.png',   label: '상디'   },
    { id: 'chopper', src: 'img/avatars/chopper.png', label: '쵸파'   },
    { id: 'robin',   src: 'img/avatars/robin.png',   label: '로빈'   },
    { id: 'franky',  src: 'img/avatars/franky.png',  label: '프랑키' },
    { id: 'brook',   src: 'img/avatars/brook.png',   label: '브룩'   },
    { id: 'jinbe',   src: 'img/avatars/jinbe.png',   label: '진베'   },
  ],
  warlords: [
    { id: 'mihawk',     src: 'img/avatars/mihawk.png',     label: '미호크'    },
    { id: 'crocodile',  src: 'img/avatars/crocodile.png',  label: '크로커다일' },
    { id: 'doflamingo', src: 'img/avatars/doflamingo.png', label: '도플라밍고' },
    { id: 'hancock',    src: 'img/avatars/hancock.png',    label: '행콕'      },
    { id: 'kuma',       src: 'img/avatars/kuma.png',       label: '쿠마'      },
    { id: 'teach',      src: 'img/avatars/teach.png',      label: '티치'      },
    { id: 'law',        src: 'img/avatars/law.png',        label: '로'        },
    { id: 'buggy',      src: 'img/avatars/buggy.png',      label: '버기'      },
  ],
  marines: [
    { id: 'akainu', src: 'img/avatars/akainu.png', label: '아카이누' },
    { id: 'kizaru', src: 'img/avatars/kizaru.png', label: '키자루'   },
    { id: 'smoker', src: 'img/avatars/smoker.png', label: '스모커'   },
    { id: 'garp',   src: 'img/avatars/garp.png',   label: '가프'     },
    { id: 'koby',   src: 'img/avatars/koby.png',   label: '코비'     },
  ],
  yonko: [
    { id: 'whitebeard', src: 'img/avatars/whitebeard.png', label: '흰수염' },
    { id: 'bigmom',     src: 'img/avatars/bigmom.png',     label: '빅맘'   },
    { id: 'kaido',      src: 'img/avatars/kaido.png',      label: '카이도' },
    { id: 'nika',       src: 'img/avatars/nika.png',       label: '니카'   },
    { id: 'shanks',     src: 'img/avatars/shanks.png',     label: '샹크스' },
  ],
  allies: [
    { id: 'vivi',        src: 'img/avatars/vivi.png',        label: '비비'    },
    { id: 'ace',         src: 'img/avatars/ace.png',         label: '에이스'  },
    { id: 'sabo',        src: 'img/avatars/sabo.png',        label: '사보'    },
    { id: 'bonney',      src: 'img/avatars/bonney.png',      label: '보니'    },
    { id: 'carrot',      src: 'img/avatars/carrot.png',      label: '캐럿'    },
    { id: 'yamato',      src: 'img/avatars/yamato.png',      label: '야마토'  },
    { id: 'kid',         src: 'img/avatars/kid.png',         label: '키드'    },
    { id: 'dragon',      src: 'img/avatars/dragon.png',      label: '드래곤'  },
    { id: 'katakuri',    src: 'img/avatars/katakuri.png',    label: '카타쿠리' },
    { id: 'dendenmushi', src: 'img/avatars/dendenmushi.png', label: '전보벌레' },
  ],
  pirate_king: [
    { id: 'roger', src: 'img/avatars/roger.png', label: '로저' },
  ],
};

// ── 전역 상태 ─────────────────────────────────────────────────────────
let currentUser        = null;
let currentUserProfile = null;
let _profileUnsub      = null;

// =====================================================================
//  Firebase Auth 상태 감지
// =====================================================================
auth.onAuthStateChanged(user => {
  currentUser = user;

  if (_profileUnsub) { _profileUnsub(); _profileUnsub = null; }

  if (!user) {
    currentUserProfile = null;
    _updateGnbAuth(null, null);
    _refreshCharTipsIfOpen();
    return;
  }

  // 이메일/비밀번호 가입자 → 이메일 인증 전 차단
  const isEmailProvider = user.providerData.some(p => p.providerId === 'password');
  if (isEmailProvider && !user.emailVerified) {
    currentUserProfile = null;
    _updateGnbAuth(null, null);
    return;
  }

  let firstSnapshot = true;
  _profileUnsub = db.collection('users').doc(user.uid).onSnapshot(
    snap => {
      if (snap.exists) {
        currentUserProfile = snap.data();
        // 기존 가입자 email 필드 보완
        if (!currentUserProfile.email && user.email) {
          db.collection('users').doc(user.uid).set({ email: user.email }, { merge: true });
        }
        _updateGnbAuth(user, currentUserProfile);
        window.refreshSettingMyInfo?.(user);
      } else if (firstSnapshot) {
        const ADMIN_EMAILS = [
          'gichan1005kim@gmail.com',
          'gimbaein7@gmail.com',
          'kyg12555@gmail.com',
          'skadlstj9081@gmail.com',
          'brawnstars201596@gmail.com',
        ];
        if (user.email && ADMIN_EMAILS.includes(user.email)) {
          // 관리자 계정은 프로필 설정 없이 자동 생성
          db.collection('users').doc(user.uid).set({
            nickname:  user.displayName || user.email.split('@')[0],
            avatar:    user.photoURL || '',
            email:     user.email,
            canWrite:  true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        } else {
          currentUserProfile = null;
          _openProfileSetup();
          _updateGnbAuth(null, null);
        }
      }
      firstSnapshot = false;
      _refreshCharTipsIfOpen();
    },
    err => {
      console.error('Firestore 프로필 onSnapshot 오류:', err);
      currentUserProfile = null;
      _updateGnbAuth(null, null);
      window.refreshSettingMyInfo?.(user);
    }
  );
});

// 꿀팁 탭 열려 있으면 갱신
function _refreshCharTipsIfOpen() {
  const overlay = document.getElementById('charModalOverlay');
  if (overlay?.classList.contains('open') &&
      typeof activeTab !== 'undefined' && activeTab === 'tips') {
    const cid = +overlay.dataset.charId;
    if (cid) switchCharTab('tips', cid);
  }
}

// =====================================================================
//  GNB 로그인 상태 업데이트
// =====================================================================
function _updateGnbAuth(user, profile) {
  const authSk = document.getElementById('gnbAuthSkeleton');
  if (authSk) authSk.style.display = 'none';

  const loginBtn = document.getElementById('gnbLoginBtn');
  if (!loginBtn) return;

  const signupBtn = document.getElementById('gnbSignupBtn');
  const userWrap  = document.getElementById('gnbUserWrap');
  const avatarImg = document.getElementById('gnbUserAvatarImg');
  const initial   = document.getElementById('gnbUserInitial');
  const nameEl    = document.getElementById('gnbUserDisplayName');
  const emailEl   = document.getElementById('gnbUserEmailText');
  const loggedIn  = !!(user && profile);

  loginBtn.style.display              = loggedIn ? 'none' : 'flex';
  if (signupBtn) signupBtn.style.display = loggedIn ? 'none' : 'flex';
  if (userWrap)  userWrap.style.display  = loggedIn ? 'flex' : 'none';

  if (!loggedIn) {
    document.getElementById('gnbUserDropdown')?.classList.remove('open');
  } else {
    const src = profile.avatar || '';
    if (src) {
      avatarImg.src           = src;
      avatarImg.style.display = 'block';
      initial.style.display   = 'none';
    } else {
      avatarImg.style.display = 'none';
      initial.style.display   = 'flex';
      initial.textContent     = (profile.nickname || '?')[0];
    }
    if (nameEl)  nameEl.textContent  = profile.nickname || '사용자';
    if (emailEl) emailEl.textContent = user.email || '';
  }

  // 내 정보 메뉴 노출 제어
  const myInfoBtn = document.getElementById('settingMyInfo');
  if (myInfoBtn) {
    myInfoBtn.style.display = loggedIn ? '' : 'none';
    const next = myInfoBtn.nextElementSibling;
    if (next?.classList.contains('gnb-setting-divider')) next.style.display = loggedIn ? '' : 'none';
  }
}

// =====================================================================
//  공통 유틸
// =====================================================================

// 에러/성공 메시지 표시
const AUTH_ERROR_MAP = {
  'auth/user-not-found':       '등록되지 않은 이메일입니다.',
  'auth/wrong-password':       '비밀번호가 올바르지 않습니다.',
  'auth/invalid-credential':   '이메일 또는 비밀번호가 올바르지 않습니다.',
  'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
  'auth/weak-password':        '비밀번호는 6자 이상이어야 합니다.',
  'auth/invalid-email':        '올바른 이메일 형식이 아닙니다.',
  'auth/too-many-requests':    '잠시 후 다시 시도해주세요.',
  'auth/rejoin-blocked':       '탈퇴 후 24시간 동안 재가입할 수 없습니다.',
};

function _authErrMsg(code) {
  return AUTH_ERROR_MAP[code] || '오류가 발생했습니다. 다시 시도해주세요.';
}

function _showMsg(elId, msg, isSuccess = false) {
  const el = document.getElementById(elId);
  if (!el) return;
  if (isSuccess) {
    el.style.color       = '#a6e3a1';
    el.style.background  = 'rgba(166,227,161,0.1)';
    el.style.borderColor = 'rgba(166,227,161,0.3)';
  } else {
    el.style.color = el.style.background = el.style.borderColor = '';
  }
  el.textContent   = msg;
  el.style.display = 'block';
}

function _hideMsg(elId) {
  const el = document.getElementById(elId);
  if (el) el.style.display = 'none';
}

// 비밀번호 표시 토글
function _togglePw(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (!input || !btn) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보이기');
  const open  = btn.querySelector('.pw-eye-open');
  const close = btn.querySelector('.pw-eye-close');
  if (open)  open.style.display  = show ? 'none'  : 'block';
  if (close) close.style.display = show ? 'block' : 'none';
}

function _resetPwToggle(inputId, btnId) {
  const input = document.getElementById(inputId);
  if (input) input.type = 'password';
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const open  = btn.querySelector('.pw-eye-open');
  const close = btn.querySelector('.pw-eye-close');
  if (open)  open.style.display  = 'block';
  if (close) close.style.display = 'none';
}

// ── 탈퇴 재가입 차단 확인 ─────────────────────────────────────────────
async function _getWithdrawalBlock(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !window.crypto?.subtle) return null;
  const bytes  = new TextEncoder().encode(normalized);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  const hash   = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
  const snap   = await db.collection('withdrawalBlocks').doc(hash).get();
  if (!snap.exists) return null;
  const data         = snap.data() || {};
  const blockedUntil = data.blockedUntil?.toMillis?.() ?? Number(data.blockedUntil);
  return Number.isFinite(blockedUntil) && blockedUntil > Date.now() ? { ...data, blockedUntil } : null;
}

function _rejoinBlockMsg(blockedUntil) {
  const ms   = Math.max(0, Number(blockedUntil) - Date.now());
  const mins = Math.max(1, Math.ceil(ms / 60000));
  const h    = Math.floor(mins / 60);
  const m    = mins % 60;
  const time = h > 0 ? `${h}시간${m ? ` ${m}분` : ''}` : `${m}분`;
  return `${time} 이후 재시도해주세요.`;
}

// =====================================================================
//  로그인 모달
// =====================================================================
function openLoginModal(tab) {
  if (tab === 'register') { openRegisterModal(); return; }
  _hideMsg('loginError');
  _resetPwToggle('loginPassword', 'loginPasswordToggle');
  const emailEl = document.getElementById('loginEmail');
  const pwEl    = document.getElementById('loginPassword');
  if (emailEl) emailEl.value = '';
  if (pwEl)    pwEl.value    = '';
  document.getElementById('loginModalOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => emailEl?.focus(), 80);
}

function _closeLoginModal() {
  document.getElementById('loginModalOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// =====================================================================
//  회원가입 모달
// =====================================================================
function openRegisterModal() {
  _hideMsg('registerError');
  _resetPwToggle('registerPassword',        'registerPasswordToggle');
  _resetPwToggle('registerPasswordConfirm', 'registerPasswordConfirmToggle');
  ['registerEmail', 'registerPassword', 'registerPasswordConfirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const matchEl = document.getElementById('registerPasswordMatch');
  if (matchEl) matchEl.style.display = 'none';
  document.getElementById('registerModalOverlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('registerEmail')?.focus(), 80);
}

function _closeRegisterModal() {
  document.getElementById('registerModalOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

// =====================================================================
//  구글 로그인
// =====================================================================
function loginWithGoogle(isRegistration = false) {
  const errorId = isRegistration ? 'registerError' : 'loginError';
  const btnIds  = ['loginGoogleBtn', 'registerGoogleBtn'];

  btnIds.forEach(id => { const b = document.getElementById(id); if (b) b.disabled = true; });
  _hideMsg(errorId);

  const provider = new firebase.auth.GoogleAuthProvider();
  return auth.signInWithPopup(provider)
    .then(async cred => {
      // 탈퇴 재가입 차단 체크 — 실패해도 로그인 자체는 허용
      let block = null;
      try { block = await _getWithdrawalBlock(cred.user.email); } catch (_) { /* ignore */ }

      if (block) {
        await auth.signOut();
        _closeLoginModal();
        _closeRegisterModal();
        // 해당 모달 재표시 후 에러 메시지
        if (isRegistration) {
          document.getElementById('registerModalOverlay')?.classList.add('open');
          document.body.style.overflow = 'hidden';
          _showMsg('registerError', _rejoinBlockMsg(block.blockedUntil));
        } else {
          document.getElementById('loginModalOverlay')?.classList.add('open');
          document.body.style.overflow = 'hidden';
          _showMsg('loginError', _rejoinBlockMsg(block.blockedUntil));
        }
        return;
      }
      _closeLoginModal();
      _closeRegisterModal();
    })
    .catch(err => {
      if (err.code === 'auth/popup-blocked') {
        _showMsg(errorId, '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해 주세요.');
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        _showMsg(errorId, _authErrMsg(err.code));
      }
    })
    .finally(() => {
      btnIds.forEach(id => { const b = document.getElementById(id); if (b) b.disabled = false; });
    });
}

// =====================================================================
//  이메일 로그인
// =====================================================================
async function loginWithEmail() {
  const email    = document.getElementById('loginEmail')?.value.trim() || '';
  const password = document.getElementById('loginPassword')?.value     || '';
  const btn      = document.getElementById('loginSubmitBtn');

  _hideMsg('loginError');
  if (!email || !password) { _showMsg('loginError', '이메일과 비밀번호를 입력해주세요.'); return; }

  btn.disabled = true; btn.textContent = '로그인 중...';
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password);
    if (!cred.user.emailVerified) {
      await auth.signOut();
      _showMsg('loginError', '이메일 인증이 필요합니다. 메일함에서 인증 링크를 클릭해주세요.');
      return;
    }
    _closeLoginModal();
  } catch (err) {
    _showMsg('loginError', _authErrMsg(err.code));
  } finally {
    btn.disabled = false; btn.textContent = '로그인';
  }
}

// =====================================================================
//  비밀번호 재설정
// =====================================================================
async function sendPasswordReset() {
  const email = document.getElementById('loginEmail')?.value.trim() || '';
  const btn   = document.getElementById('loginForgotBtn');

  _hideMsg('loginError');
  if (!email) {
    _showMsg('loginError', '이메일을 먼저 입력해주세요.');
    document.getElementById('loginEmail')?.focus();
    return;
  }

  btn.disabled = true; btn.textContent = '전송 중...';
  try {
    await auth.sendPasswordResetEmail(email);
    _showMsg('loginError', `${email}로 재설정 링크를 보냈습니다. 메일함을 확인해주세요.`, true);
  } catch (err) {
    _showMsg('loginError', _authErrMsg(err.code));
  } finally {
    btn.disabled = false; btn.textContent = '비밀번호를 잊으셨나요?';
  }
}

// =====================================================================
//  이메일 회원가입
// =====================================================================
async function registerWithEmail() {
  const email    = document.getElementById('registerEmail')?.value.trim()    || '';
  const password = document.getElementById('registerPassword')?.value        || '';
  const confirm  = document.getElementById('registerPasswordConfirm')?.value || '';
  const btn      = document.getElementById('registerSubmitBtn');

  _hideMsg('registerError');
  if (!email || !password)  { _showMsg('registerError', '이메일과 비밀번호를 입력해주세요.'); return; }
  if (password !== confirm) { _showMsg('registerError', '비밀번호가 일치하지 않습니다.'); return; }
  if (password.length < 6)  { _showMsg('registerError', '비밀번호는 6자 이상이어야 합니다.'); return; }

  btn.disabled = true; btn.textContent = '처리 중...';
  try {
    const block = await _getWithdrawalBlock(email);
    if (block) { _showMsg('registerError', _rejoinBlockMsg(block.blockedUntil)); return; }

    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.sendEmailVerification();
    await auth.signOut();

    _showMsg('registerError', `${email}로 인증 이메일을 보냈습니다. 메일함에서 링크를 클릭한 후 로그인해주세요.`, true);
    setTimeout(() => { _closeRegisterModal(); openLoginModal(); }, 4000);
  } catch (err) {
    _showMsg('registerError', _authErrMsg(err.code));
  } finally {
    btn.disabled = false; btn.textContent = '회원가입';
  }
}

function logoutUser() { return auth.signOut(); }

// =====================================================================
//  토스트 알림
// =====================================================================
let _toastTimer = null;
function showToast(msg, type = 'error') {
  const el = document.getElementById('toastNotification');
  if (!el) return;
  el.textContent = msg;
  el.className   = `toast-notification toast-${type} toast-show`;
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('toast-show'), 3000);
}

// =====================================================================
//  프로필 설정 모달 (신규 가입자)
// =====================================================================
let _selectedAvatar    = '';
let _selectedAvatarTab = 'strawhats';

const _AVATAR_GRID_MAP = {
  strawhats:  'avatarGridStrawhats',
  warlords:   'avatarGridWarlords',
  marines:    'avatarGridMarines',
  yonko:      'avatarGridYonko',
  allies:     'avatarGridAllies',
  pirate_king:'avatarGridPirateKing',
};
const _EDIT_GRID_MAP = {
  strawhats:  'avatarEditGridStrawhats',
  warlords:   'avatarEditGridWarlords',
  marines:    'avatarEditGridMarines',
  yonko:      'avatarEditGridYonko',
  allies:     'avatarEditGridAllies',
  pirate_king:'avatarEditGridPirateKing',
};

function _openProfileSetup() {
  const overlay = document.getElementById('profileSetupOverlay');
  if (!overlay) return;
  _selectedAvatar    = '';
  _selectedAvatarTab = 'strawhats';
  const input = document.getElementById('profileNicknameInput');
  if (input) input.value = '';
  const lenEl = document.getElementById('profileNicknameLen');
  if (lenEl) lenEl.textContent = '0';
  _hideMsg('profileSetupError');
  _renderAvatarGrid('strawhats');
  _switchAvatarTab('strawhats');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function _closeProfileSetup() {
  document.getElementById('profileSetupOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function _switchAvatarTab(tab) {
  _selectedAvatarTab = tab;
  document.querySelectorAll('#profileSetupOverlay .avatar-picker-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.avatartab === tab);
  });
  Object.values(_AVATAR_GRID_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const active = document.getElementById(_AVATAR_GRID_MAP[tab]);
  if (active) active.style.display = 'grid';
}

function _selectAvatar(src, el) {
  _selectedAvatar = src;
  document.querySelectorAll('.avatar-option').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  const preview = document.getElementById('profileAvatarPreview');
  if (preview) { preview.src = src; preview.style.display = 'block'; }
  const init = document.getElementById('profileAvatarPreviewInitial');
  if (init) init.style.display = 'none';
}

function _renderAvatarGrid(tab) {
  const grid  = document.getElementById(_AVATAR_GRID_MAP[tab]);
  const items = AVATAR_LIST[tab] || [];
  if (!grid) return;
  grid.innerHTML = items.map(item => `
    <button type="button" class="avatar-option${_selectedAvatar === item.src ? ' selected' : ''}"
      onclick="_selectAvatar('${item.src}', this)" title="${item.label}" aria-label="${item.label}">
      <img src="${item.src}" alt="${item.label}" loading="lazy">
    </button>`).join('');
}

async function _submitProfileSetup() {
  const input    = document.getElementById('profileNicknameInput');
  const nickname = input?.value.trim() || '';
  if (nickname.length < 2 || nickname.length > 12) {
    _showMsg('profileSetupError', '닉네임은 2~12자로 입력해주세요.'); input?.focus(); return;
  }
  if (!_selectedAvatar) { _showMsg('profileSetupError', '프로필 사진을 선택해주세요.'); return; }
  if (!currentUser) return;

  const btn = document.getElementById('profileSetupSubmit');
  if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }
  _hideMsg('profileSetupError');

  try {
    const profile = {
      uid:       currentUser.uid,
      email:     currentUser.email || '',
      nickname,
      avatar:    _selectedAvatar,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('users').doc(currentUser.uid).set(profile);
    currentUserProfile = profile;
    _updateGnbAuth(currentUser, currentUserProfile);
    _closeProfileSetup();
    _refreshCharTipsIfOpen();
  } catch (err) {
    console.error('프로필 저장 실패:', err);
    _showMsg('profileSetupError', '저장에 실패했습니다. 다시 시도해주세요.');
    if (btn) { btn.disabled = false; btn.textContent = '완료'; }
  }
}

// =====================================================================
//  내 정보 편집 모달
// =====================================================================
let _editSelectedAvatar    = '';
let _selectedEditAvatarTab = 'strawhats';

function openProfileEdit() {
  if (!currentUser || !currentUserProfile) return;
  const overlay = document.getElementById('profileEditOverlay');
  if (!overlay) return;

  _editSelectedAvatar = currentUserProfile.avatar || '';
  const input = document.getElementById('profileEditNicknameInput');
  if (input) {
    input.value = currentUserProfile.nickname || '';
    const lenEl = document.getElementById('profileEditNicknameLen');
    if (lenEl) lenEl.textContent = input.value.length;
  }
  _updateEditPreview(currentUserProfile.nickname || '', _editSelectedAvatar);
  _selectedEditAvatarTab = 'strawhats';
  _renderEditAvatarGrid('strawhats');
  _switchEditAvatarTab('strawhats');
  _hideMsg('profileEditError');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function _closeProfileEdit() {
  document.getElementById('profileEditOverlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

function _updateEditPreview(nickname, avatarSrc) {
  const preview = document.getElementById('profileEditAvatarPreview');
  const init    = document.getElementById('profileEditAvatarPreviewInitial');
  const nameEl  = document.getElementById('profileEditPreviewName');
  if (avatarSrc) {
    if (preview) { preview.src = avatarSrc; preview.style.display = 'block'; }
    if (init) init.style.display = 'none';
  } else {
    if (preview) preview.style.display = 'none';
    if (init) { init.style.display = 'flex'; init.textContent = (nickname || '?')[0]; }
  }
  if (nameEl) nameEl.textContent = nickname || '닉네임 입력';
}

function _switchEditAvatarTab(tab) {
  _selectedEditAvatarTab = tab;
  document.querySelectorAll('#profileEditOverlay .avatar-picker-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.avatartab === tab);
  });
  Object.values(_EDIT_GRID_MAP).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const active = document.getElementById(_EDIT_GRID_MAP[tab]);
  if (active) active.style.display = 'grid';
}

function _selectEditAvatar(src, el) {
  _editSelectedAvatar = src;
  document.querySelectorAll('#profileEditOverlay .avatar-option').forEach(a => a.classList.remove('selected'));
  el.classList.add('selected');
  _updateEditPreview(document.getElementById('profileEditNicknameInput')?.value.trim() || '', src);
}

function _renderEditAvatarGrid(tab) {
  const grid  = document.getElementById(_EDIT_GRID_MAP[tab]);
  const items = AVATAR_LIST[tab] || [];
  if (!grid) return;
  grid.innerHTML = items.map(item => `
    <button type="button" class="avatar-option${_editSelectedAvatar === item.src ? ' selected' : ''}"
      onclick="_selectEditAvatar('${item.src}', this)" title="${item.label}" aria-label="${item.label}">
      <img src="${item.src}" alt="${item.label}" loading="lazy">
    </button>`).join('');
}

async function _submitProfileEdit() {
  const input    = document.getElementById('profileEditNicknameInput');
  const nickname = input?.value.trim() || '';
  if (nickname.length < 2 || nickname.length > 12) {
    _showMsg('profileEditError', '닉네임은 2~12자로 입력해주세요.'); input?.focus(); return;
  }
  if (!_editSelectedAvatar) { _showMsg('profileEditError', '프로필 사진을 선택해주세요.'); return; }
  if (!currentUser) return;

  const btn = document.getElementById('profileEditSubmit');
  if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; }
  _hideMsg('profileEditError');

  try {
    await db.collection('users').doc(currentUser.uid).update({
      nickname, avatar: _editSelectedAvatar,
    });
    currentUserProfile = { ...currentUserProfile, nickname, avatar: _editSelectedAvatar };
    _updateGnbAuth(currentUser, currentUserProfile);
    if (btn) { btn.disabled = false; btn.textContent = '저장'; }
    _closeProfileEdit();
    window.closeSettingProfileEditor?.();
  } catch (err) {
    console.error('프로필 저장 실패:', err);
    if (btn) { btn.disabled = false; btn.textContent = '저장'; }
    _closeProfileEdit();
    showToast('저장에 실패했습니다. 다시 시도해주세요.', 'error');
  }
}

// =====================================================================
//  DOMContentLoaded 이벤트 바인딩
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {

  // URL 파라미터로 모달 자동 열기
  const authIntent = new URLSearchParams(location.search).get('auth');
  if (authIntent) {
    history.replaceState(null, '', location.pathname);
    setTimeout(() => authIntent === 'register' ? openRegisterModal() : openLoginModal(), 0);
  }

  // GNB 버튼
  document.getElementById('gnbLoginBtn')?.addEventListener('click',  () => openLoginModal());
  document.getElementById('gnbSignupBtn')?.addEventListener('click', () => openRegisterModal());

  // ── 로그인 모달 ──────────────────────────────────────────────────
  document.getElementById('loginModalClose')?.addEventListener('click', _closeLoginModal);
  document.getElementById('loginModalOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'loginModalOverlay') _closeLoginModal();
  });
  document.getElementById('loginToRegisterBtn')?.addEventListener('click', () => {
    _closeLoginModal(); openRegisterModal();
  });
  document.getElementById('loginSubmitBtn')?.addEventListener('click', loginWithEmail);
  document.getElementById('loginGoogleBtn')?.addEventListener('click', () => loginWithGoogle(false));
  document.getElementById('loginForgotBtn')?.addEventListener('click', sendPasswordReset);
  document.getElementById('loginPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginWithEmail();
  });
  document.getElementById('loginPasswordToggle')?.addEventListener('click', () => {
    _togglePw('loginPassword', 'loginPasswordToggle');
  });

  // ── 회원가입 모달 ────────────────────────────────────────────────
  document.getElementById('registerModalClose')?.addEventListener('click', _closeRegisterModal);
  document.getElementById('registerModalOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'registerModalOverlay') _closeRegisterModal();
  });
  document.getElementById('registerToLoginBtn')?.addEventListener('click', () => {
    _closeRegisterModal(); openLoginModal();
  });
  document.getElementById('registerSubmitBtn')?.addEventListener('click', registerWithEmail);
  document.getElementById('registerGoogleBtn')?.addEventListener('click', () => loginWithGoogle(true));
  document.getElementById('registerPasswordConfirm')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') registerWithEmail();
  });
  document.getElementById('registerPasswordToggle')?.addEventListener('click', () => {
    _togglePw('registerPassword', 'registerPasswordToggle');
  });
  document.getElementById('registerPasswordConfirmToggle')?.addEventListener('click', () => {
    _togglePw('registerPasswordConfirm', 'registerPasswordConfirmToggle');
  });

  // 비밀번호 일치 실시간 검사
  function _checkPwMatch() {
    const pw  = document.getElementById('registerPassword')?.value        || '';
    const cfw = document.getElementById('registerPasswordConfirm')?.value || '';
    const el  = document.getElementById('registerPasswordMatch');
    if (!el || !cfw) return;
    el.style.display = 'block';
    const match = pw === cfw;
    el.textContent = match ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.';
    el.style.color  = match ? '#a6e3a1' : '#f38ba8';
  }
  document.getElementById('registerPassword')?.addEventListener('input', _checkPwMatch);
  document.getElementById('registerPasswordConfirm')?.addEventListener('input', _checkPwMatch);

  // ── 유저 드롭다운 ────────────────────────────────────────────────
  document.getElementById('gnbUserAvatarBtn')?.addEventListener('click', e => {
    e.stopPropagation();
    const ud      = document.getElementById('gnbUserDropdown');
    const opening = !ud?.classList.contains('open');
    if (typeof _closeAllGnbPopups === 'function') _closeAllGnbPopups();
    else document.getElementById('gnbDropdown')?.classList.remove('open');
    if (ud && opening) ud.classList.add('open');
  });
  document.getElementById('gnbProfileBtn')?.addEventListener('click', () => {
    document.getElementById('gnbUserDropdown')?.classList.remove('open');
    openProfileEdit();
  });
  document.getElementById('gnbLogoutBtn')?.addEventListener('click', async () => {
    await logoutUser();
    document.getElementById('gnbUserDropdown')?.classList.remove('open');
  });
  document.addEventListener('click', () => {
    document.getElementById('gnbUserDropdown')?.classList.remove('open');
  });

  // ── 프로필 설정 모달 ─────────────────────────────────────────────
  document.querySelectorAll('#profileSetupOverlay .avatar-picker-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.avatartab;
      _switchAvatarTab(t);
      _renderAvatarGrid(t);
    });
  });
  document.getElementById('profileNicknameInput')?.addEventListener('input', e => {
    const lenEl = document.getElementById('profileNicknameLen');
    if (lenEl) lenEl.textContent = e.target.value.length;
  });
  document.getElementById('profileNicknameInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _submitProfileSetup();
  });
  document.getElementById('profileSetupSubmit')?.addEventListener('click', _submitProfileSetup);

  // ── 내 정보 편집 모달 ────────────────────────────────────────────
  document.querySelectorAll('#profileEditOverlay .avatar-picker-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.avatartab;
      _switchEditAvatarTab(t);
      _renderEditAvatarGrid(t);
    });
  });
  document.getElementById('profileEditNicknameInput')?.addEventListener('input', e => {
    const lenEl = document.getElementById('profileEditNicknameLen');
    if (lenEl) lenEl.textContent = e.target.value.length;
    _updateEditPreview(e.target.value.trim(), _editSelectedAvatar);
  });
  document.getElementById('profileEditNicknameInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') _submitProfileEdit();
  });
  document.getElementById('profileEditSubmit')?.addEventListener('click', _submitProfileEdit);
  document.getElementById('profileEditCancel')?.addEventListener('click', _closeProfileEdit);
  document.getElementById('profileEditOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'profileEditOverlay') _closeProfileEdit();
  });

  // 초기 아바타 그리드 렌더
  _renderAvatarGrid('strawhats');
});
