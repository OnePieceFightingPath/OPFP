/* FPP v2 — 모바일 설정 페이지 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    view: 'blank', notices: [], noticeDetail: null, user: null, userDoc: null, authResolved: false,
    pendingProtectedView: null,
    favoriteTab: 'char', favoriteCatalog: { chars: [], supports: [] }, favoriteCatalogLoaded: false,
    notificationItems: [], notificationUid: null, notificationLoadedUid: null, notificationLoadingUid: null,
    notificationUnsubscribe: null, notificationListenerUid: null,
    notificationLoadError: false, notificationFilter: 'all',
    pushEnabled: false, pushBusy: false, pushStatusSequence: 0,
    toastTimer: null, deferredInstall: null, profileEditorUid: null, profileDraftIcon: 0,
    profileInitialIcon: 0, profileInitialNickname: '', profileSaving: false, avatarPickerIcon: 0
  };
  var NOTIFY_ROWS = [
    ['patch', '패치노트 알림', '새로운 패치노트가 등록되면 알려드립니다.'],
    ['fav', '즐겨찾기 알림', '즐겨찾기한 캐릭터의 밸런스 패치를 알려드립니다.'],
    ['comment', '댓글 알림', '댓글과 대댓글이 달리면 알려드립니다.'],
    ['event', '이벤트 알림', '새로운 이벤트와 종료 임박 소식을 알려드립니다.']
  ];
  var PROFILE_ICON_FILES = [
    'ace.png', 'akainu.png', 'bigmom.png', 'bonney.png', 'brook.png',
    'buggy.png', 'carrot.png', 'chopper.png', 'crocodile.png', 'dendenmushi.png',
    'doflamingo.png',
    'dragon.png', 'franky.png', 'garp.png', 'hancock.png', 'jinbe.png',
    'kaido.png', 'katakuri.png', 'kid.png', 'kizaru.png', 'koby.png',
    'kuma.png', 'law.png', 'luffy.png', 'mihawk.png', 'nami.png',
    'nika.png', 'robin.png', 'roger.png', 'sabo.png', 'sanji.png',
    'shanks.png', 'smoker.png', 'teach.png', 'usopp.png', 'vivi.png',
    'whitebeard.png', 'yamato.png', 'zoro.png'
  ];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function avatarOf(icon) {
    var index = parseInt(icon, 10);
    if (isNaN(index)) index = 0;
    index = Math.abs(index) % PROFILE_ICON_FILES.length;
    return 'img/avatars/' + PROFILE_ICON_FILES[index];
  }

  function dateText(value) {
    if (!value) return '';
    if (value.seconds != null) return new Date(value.seconds * 1000).toLocaleDateString('ko-KR');
    var text = String(value).replace(/-/g, '.');
    return text.length > 10 ? text.slice(0, 10) : text;
  }

  function renderContent(value) {
    if (!value) return '<p class="content-empty">내용이 없습니다.</p>';
    var text = String(value);
    if (/<[a-z][\s\S]*>/i.test(text)) {
      return window.FPPContentSanitizer
        ? window.FPPContentSanitizer.sanitize(text)
        : '<p>' + esc(text).replace(/\n/g, '<br>') + '</p>';
    }
    return '<p>' + esc(text).replace(/\n/g, '<br>') + '</p>';
  }

  function readTheme() {
    try {
      var value = localStorage.getItem('fpp_theme');
      value = value ? JSON.parse(value) : 'dark';
      return value === 'light' ? 'light' : 'dark';
    } catch (e) { return 'dark'; }
  }

  function applyTheme(theme) {
    theme = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('fpp_theme', JSON.stringify(theme)); } catch (e) {}
    $('themeSummary').textContent = theme === 'light' ? '라이트 모드' : '다크 모드';
    document.querySelectorAll('[data-theme-choice]').forEach(function (button) {
      var selected = button.getAttribute('data-theme-choice') === theme;
      button.classList.toggle('is-on', selected);
      button.setAttribute('aria-checked', String(selected));
    });
  }

  function showToast(message) {
    var el = $('settingsToast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(function () { el.classList.remove('is-visible'); }, 2600);
  }

  function renderMobileHeader() {
    var userBox = $('settingsMobileUser');
    if (!userBox) return;
    if (!state.authResolved) {
      userBox.classList.add('is-loading');
      userBox.setAttribute('aria-busy', 'true');
      userBox.setAttribute('aria-disabled', 'true');
      userBox.setAttribute('aria-label', '계정 정보를 불러오는 중');
      userBox.tabIndex = -1;
      userBox.innerHTML =
        '<span class="skel settings-mobile-user-skeleton-avatar" aria-hidden="true"></span>' +
        '<span class="skel settings-mobile-user-skeleton-name" aria-hidden="true"></span>';
      return;
    }
    userBox.classList.remove('is-loading');
    userBox.removeAttribute('aria-busy');
    userBox.removeAttribute('aria-disabled');
    userBox.removeAttribute('aria-label');
    userBox.removeAttribute('tabindex');
    if (!state.user) {
      userBox.innerHTML =
        '<span class="settings-mobile-profile settings-mobile-profile-icon ic-v2-navigation-profile-fill" aria-hidden="true"></span>' +
        '<span class="settings-mobile-login"><span>로그인 해주세요</span><span class="settings-mobile-login-icon ic-v2-control-arrow-right-line" aria-hidden="true"></span></span>';
      return;
    }
    var nickname = (state.userDoc && state.userDoc.nickname) || state.user.displayName || '선원';
    userBox.innerHTML =
      '<span class="settings-mobile-profile settings-mobile-profile--image" aria-hidden="true">' +
      '<img src="' + esc(avatarOf(state.userDoc && state.userDoc.profileIcon)) + '" alt="내 프로필"></span>' +
      '<span class="settings-mobile-login">' + esc(nickname) + '</span>';
  }

  function dashboardCounts() {
    return (state.userDoc && state.userDoc.counts) || {};
  }

  function loadFavoriteCatalog() {
    if (state.favoriteCatalogLoaded || typeof FB === 'undefined') return Promise.resolve();
    return Promise.all([
      FB.getCharacters().catch(function () { return []; }),
      FB.getSupportCharacters().catch(function () { return []; })
    ]).then(function (result) {
      state.favoriteCatalog = { chars: result[0] || [], supports: result[1] || [] };
      state.favoriteCatalogLoaded = true;
      renderDashboardFavorites();
    });
  }

  function renderDashboardFavorites() {
    var body = $('dashboardFavoriteBody');
    if (!body) return;
    if (state.user && !state.userDoc) {
      body.setAttribute('aria-busy', 'true');
      body.innerHTML = favoriteSkeletonMarkup(4);
      return;
    }
    body.removeAttribute('aria-busy');
    var settings = state.userDoc || {};
    var key = state.favoriteTab === 'support' ? 'favSupports' : 'favChars';
    var ids = Array.isArray(settings[key]) ? settings[key] : [];
    var page = state.favoriteTab === 'support' ? 'Main.html#characters?tab=support' : 'Main.html#characters';
    var catalog = state.favoriteTab === 'support' ? state.favoriteCatalog.supports : state.favoriteCatalog.chars;
    if (!ids.length) {
      body.innerHTML =
        '<div class="settings-favorite-empty">' +
        '<strong>즐겨찾기한 ' + (state.favoriteTab === 'support' ? '서폿 캐릭터' : '캐릭터') + ' 없음</strong>' +
        '<span>추가해보세요</span>' +
        '<a class="settings-favorite-button" href="ko/' + page + '">캐릭터 페이지로</a>' +
        '</div>';
      return;
    }
    if (state.user && !state.favoriteCatalogLoaded) {
      body.setAttribute('aria-busy', 'true');
      body.innerHTML = favoriteSkeletonMarkup(Math.min(ids.length, 4));
      return;
    }
    var itemPage = state.favoriteTab === 'support' ? 'Main.html#characters?tab=support&' : 'Main.html#characters?';
    var visibleIds = ids.slice(0, 16);
    var slides = [];
    for (var start = 0; start < visibleIds.length; start += 4) {
      var group = visibleIds.slice(start, start + 4);
      slides.push('<div class="settings-favorite-slide" aria-label="' + (Math.floor(start / 4) + 1) + '번째 즐겨찾기">' +
        '<div class="settings-favorite-grid">' + group.map(function (id) {
          var character = catalog.filter(function (item) { return String(item.id) === String(id); })[0];
          var image = character && character.image ? character.image : 'img/avatars/luffy.png';
          var name = character && character.name ? character.name : '캐릭터 ' + id;
          return '<a class="settings-favorite-item" href="ko/' + itemPage + 'fav=1&char=' + encodeURIComponent(id) + '">' +
            '<span class="settings-favorite-item-icon"><img src="' + esc(image) + '" alt="" loading="lazy" onerror="this.src=\'img/avatars/luffy.png\'"></span>' +
            '<strong>' + esc(name) + '</strong><span class="settings-favorite-item-star ic-v2-community-star-fill" aria-hidden="true"></span></a>';
        }).join('') + '</div></div>');
    }
    body.innerHTML = '<div class="settings-favorite-slider" aria-label="즐겨찾기 카드 목록">' + slides.join('') + '</div>' +
      (slides.length > 1 ? '<div class="settings-favorite-pagination" role="tablist" aria-label="즐겨찾기 페이지">' +
        slides.map(function (_, index) {
          return '<button class="settings-favorite-page' + (index === 0 ? ' is-on' : '') + '" type="button" role="tab" aria-label="' + (index + 1) + '페이지" aria-selected="' + (index === 0 ? 'true' : 'false') + '" data-favorite-page="' + index + '"></button>';
        }).join('') + '</div>' : '');
    if (slides.length > 1) {
      var slider = body.querySelector('.settings-favorite-slider');
      var pages = body.querySelectorAll('[data-favorite-page]');
      function paintFavoritePage(index) {
        index = Math.max(0, Math.min(slides.length - 1, index));
        pages.forEach(function (page, pageIndex) {
          var selected = pageIndex === index;
          page.classList.toggle('is-on', selected);
          page.setAttribute('aria-selected', String(selected));
        });
      }
      function setFavoritePage(index, smooth) {
        index = Math.max(0, Math.min(slides.length - 1, index));
        var target = slider.children[index];
        if (target) slider.scrollTo({ left: target.offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
        paintFavoritePage(index);
      }
      function syncFavoritePage() {
        var current = 0;
        var distance = Infinity;
        Array.prototype.forEach.call(slider.children, function (slide, index) {
          var nextDistance = Math.abs(slider.scrollLeft - slide.offsetLeft);
          if (nextDistance < distance) {
            distance = nextDistance;
            current = index;
          }
        });
        paintFavoritePage(current);
      }
      pages.forEach(function (page) {
        page.addEventListener('click', function () {
          setFavoritePage(Number(page.getAttribute('data-favorite-page')) || 0, true);
        });
      });
      slider.addEventListener('scroll', syncFavoritePage, { passive: true });
    }
  }

  function renderDashboard() {
    var counts = dashboardCounts();
    var loading = !state.authResolved || (!!state.user && !state.userDoc);
    var stats = document.querySelector('.settings-stats');
    var writeButton = document.querySelector('.settings-write-button');
    if (stats) stats.setAttribute('aria-busy', String(loading));
    if (writeButton) {
      writeButton.classList.toggle('is-loading', loading);
      writeButton.setAttribute('aria-busy', String(loading));
      if (loading) {
        writeButton.setAttribute('aria-disabled', 'true');
        writeButton.setAttribute('aria-label', '글쓰기 상태를 불러오는 중');
        writeButton.tabIndex = -1;
      } else {
        writeButton.removeAttribute('aria-disabled');
        writeButton.removeAttribute('aria-label');
        writeButton.removeAttribute('tabindex');
      }
    }
    [['dashboardPosts', counts.posts], ['dashboardComments', counts.comments], ['dashboardLikes', counts.likes]].forEach(function (item) {
      var target = $(item[0]);
      if (!target) return;
      if (loading) {
        target.innerHTML = '<span class="skel settings-stat-skeleton" aria-hidden="true"></span>';
        target.setAttribute('aria-label', '활동 통계를 불러오는 중');
      } else {
        target.textContent = item[1] || 0;
        target.removeAttribute('aria-label');
      }
    });
    renderDashboardFavorites();
  }

  function favoriteSkeletonMarkup(count) {
    var cards = '';
    for (var i = 0; i < count; i++) {
      cards += '<div class="settings-favorite-item settings-favorite-skeleton" aria-hidden="true">' +
        '<span class="settings-favorite-item-icon"><span class="skel"></span></span>' +
        '<span class="skel settings-favorite-skeleton-title"></span></div>';
    }
    return '<div class="settings-favorite-grid settings-favorite-skeleton-grid" aria-hidden="true">' + cards + '</div>';
  }

  function closeSettings() {
    location.href = 'ko/Main.html#home';
  }

  function setHeaderSelection(view) {
    var settings = $('settingsMobileSettings');
    var notify = $('settingsMobileNotify');
    var back = $('settingsMobileBack');
    var title = $('settingsMobileTitle');
    var user = $('settingsMobileUser');
    if (!settings || !notify || !back || !title || !user) return;
    var inSettings = view !== 'blank';
    var headerTitles = {
      main: '설정',
      myInfo: '내 정보',
      profileInfo: '정보 설정',
      notice: '공지사항',
      notify: '알림',
      notifications: '알림',
      theme: '테마',
      appIcon: '앱 아이콘 변경'
    };
    back.hidden = !inSettings;
    title.hidden = !inSettings;
    title.textContent = headerTitles[view] || '설정';
    user.hidden = inSettings;
    var settingsSelected = view !== 'blank' && view !== 'notify' && view !== 'notifications';
    var hideTopActions = inSettings;
    settings.hidden = hideTopActions;
    notify.hidden = hideTopActions;
    settings.setAttribute('aria-hidden', String(hideTopActions));
    notify.setAttribute('aria-hidden', String(hideTopActions));
    settings.toggleAttribute('aria-current', settingsSelected);
    if (settingsSelected) settings.setAttribute('aria-current', 'page');
    notify.toggleAttribute('aria-current', view === 'notifications');
    if (view === 'notifications') notify.setAttribute('aria-current', 'page');
  }

  function settingsRouteUrl(view) {
    var fileUrl = new URL('ko/Settings.html', document.baseURI);
    var hash = view === 'main' ? '#Setting' : view === 'blank' ? '' : '#setting-' + view;
    return fileUrl.pathname + location.search + hash;
  }

  function requiresLogin(view) {
    return view === 'myInfo' || view === 'profileInfo' || view === 'notify' || view === 'notifications';
  }

  function showLoginRequiredPopup(view) {
    var gate = $('settingsAuthGate');
    var message = $('settingsAuthMessage');
    if (!gate) {
      location.href = 'ko/Login.html';
      return;
    }
    var messages = {
      myInfo: '내 정보를 확인하려면 로그인해 주세요.',
      profileInfo: '프로필을 설정하려면 로그인해 주세요.',
      notify: '알림 설정을 이용하려면 로그인해 주세요.',
      notifications: '알림을 확인하려면 로그인해 주세요.'
    };
    if (message) message.textContent = messages[view] || '로그인 후 이용해 주세요.';
    gate.hidden = false;
    gate.setAttribute('aria-hidden', 'false');
    document.body.classList.add('settings-auth-blocked');
  }

  function hideLoginRequiredPopup() {
    var gate = $('settingsAuthGate');
    if (gate) {
      gate.hidden = true;
      gate.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('settings-auth-blocked');
  }

  function resolvePendingProtectedView(isLoggedIn) {
    if (isLoggedIn) hideLoginRequiredPopup();
    var pending = state.pendingProtectedView;
    if (!pending) {
      if (!isLoggedIn && requiresLogin(state.view)) {
        var blockedView = state.view;
        showView('main', false);
        showLoginRequiredPopup(blockedView);
      }
      return;
    }
    state.pendingProtectedView = null;
    if (isLoggedIn) {
      showView(pending.view, pending.addHistory);
      return;
    }
    showView('main', false);
    showLoginRequiredPopup(pending.view);
  }

  function showView(view, addHistory) {
    if (!document.getElementById('settings-' + view)) view = 'main';
    if (requiresLogin(view) && !state.user) {
      if (!state.authResolved) {
        state.pendingProtectedView = { view: view, addHistory: !!addHistory };
        return;
      }
      showLoginRequiredPopup(view);
      return;
    }
    state.pendingProtectedView = null;
    hideLoginRequiredPopup();
    if (view === state.view) {
      if (view === 'notifications' && !state.notificationListenerUid && !state.notificationLoadingUid) {
        renderNotificationInbox();
      }
      return;
    }
    if (state.view === 'notifications') stopNotificationInboxListener();
    document.querySelectorAll('.settings-view').forEach(function (section) {
      var active = section.getAttribute('data-view') === view;
      section.classList.toggle('is-active', active);
      section.setAttribute('aria-hidden', String(!active));
    });
    state.view = view;
    setHeaderSelection(view);
    if (addHistory) history.pushState({ settingsView: view }, '', settingsRouteUrl(view));
    else history.replaceState({ settingsView: view }, '', settingsRouteUrl(view));
    if (view === 'notice') loadNotices();
    if (view === 'notify') renderNotifications();
    if (view === 'notifications') renderNotificationInbox();
    if (view === 'myInfo') renderMyInfo();
    if (view === 'profileInfo') prepareProfileEditor();
    if (view === 'theme') applyTheme(readTheme());
    if (view === 'appIcon') renderAppIcons();
    if (view === 'blank') renderDashboard();
    window.scrollTo(0, 0);
  }

  function goToSettingsMain() {
    state.noticeDetail = null;
    if ($('noticeDetail')) $('noticeDetail').hidden = true;
    if ($('noticeList')) $('noticeList').hidden = false;
    if (state.view === 'main') {
      location.href = 'ko/Settings.html';
      return;
    }
    history.replaceState({ settingsView: 'main' }, '', settingsRouteUrl('main'));
    showView('main', false);
  }

  function setFavoriteTab(button) {
    state.favoriteTab = button.getAttribute('data-favorite-tab') === 'support' ? 'support' : 'char';
    document.querySelectorAll('[data-favorite-tab]').forEach(function (tab) {
      var selected = tab === button;
      tab.classList.toggle('is-on', selected);
      tab.setAttribute('aria-selected', String(selected));
    });
    renderDashboardFavorites();
  }

  function goBack() {
    if (state.noticeDetail) {
      state.noticeDetail = null;
      $('noticeDetail').hidden = true;
      $('noticeList').hidden = false;
      return;
    }
    if (state.view !== 'main') {
      if (history.state && history.state.settingsView && history.length > 1) history.back();
      else if (state.view === 'profileInfo') closeSettings();
      else showView('main', false);
      return;
    }
    if (document.referrer && document.referrer.indexOf(location.origin) === 0 && history.length > 1) history.back();
    else location.href = 'ko/Main.html#home';
  }

  function loadNotices() {
    var list = $('noticeList');
    if (!list || list.dataset.loaded === 'true') return;
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = noticeSkeletonMarkup(4);
    if (typeof FB === 'undefined') {
      list.removeAttribute('aria-busy');
      list.innerHTML = '<div class="settings-empty">공지사항을 불러올 수 없습니다.</div>';
      return;
    }
    FB.onReady().then(function () {
      return FB.ready ? FB.getNotices() : [];
    }).then(function (items) {
      state.notices = items || [];
      list.dataset.loaded = 'true';
      list.removeAttribute('aria-busy');
      if (!state.notices.length) {
        list.innerHTML = '<div class="settings-empty">등록된 공지사항이 없습니다.</div>';
        return;
      }
      list.innerHTML = state.notices.map(function (notice, index) {
        return '<button class="notice-row" type="button" data-notice-index="' + index + '">' +
          '<span class="notice-row-title"><b>공지</b><span>' + esc(notice.title) + '</span></span>' +
          '<span class="notice-row-meta">' + esc(notice.author || '관리자') + ' · ' + esc(dateText(notice.date)) + '</span></button>';
      }).join('');
      list.querySelectorAll('[data-notice-index]').forEach(function (button) {
        button.addEventListener('click', function () { openNotice(Number(button.dataset.noticeIndex)); });
      });
    }).catch(function () {
      list.removeAttribute('aria-busy');
      list.innerHTML = '<div class="settings-empty">공지사항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>';
    });
  }

  function noticeSkeletonMarkup(count) {
    var rows = '';
    for (var i = 0; i < (count || 4); i++) {
      rows += '<div class="notice-skeleton-row" aria-hidden="true"><div class="notice-skeleton-title">' +
        '<span class="skel notice-skeleton-badge"></span><span class="skel notice-skeleton-heading"></span></div>' +
        '<span class="skel notice-skeleton-meta"></span></div>';
    }
    return '<div class="notice-skeleton-list" aria-hidden="true">' + rows + '</div>';
  }

  function openNotice(index) {
    var notice = state.notices[index];
    if (!notice) return;
    state.noticeDetail = notice;
    $('noticeList').hidden = true;
    $('noticeDetail').hidden = false;
    $('noticeDetailMeta').textContent = (notice.author || '관리자') + ' · ' + dateText(notice.date);
    $('noticeDetailTitle').textContent = notice.title || '제목 없음';
    $('noticeDetailContent').innerHTML = renderContent(notice.content);
    $('settings-notice').scrollTop = 0;
  }

  function currentSettings() {
    return state.userDoc && state.userDoc.settings ? Object.assign({}, state.userDoc.settings) : {};
  }

  function renderNotifications() {
    var card = $('notifyCard');
    if (!card) return;
    if (!state.user) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    if (!state.userDoc) {
      card.setAttribute('aria-busy', 'true');
      card.innerHTML = NOTIFY_ROWS.map(function (_, index) {
        var titleWidth = 38 + (index % 3) * 10;
        var detailWidth = 56 + (index % 2) * 12;
        return '<div class="notify-row settings-notify-skeleton" aria-hidden="true">' +
          '<span class="notify-copy"><strong><span class="skel settings-notify-title" style="width:' + titleWidth + '%"></span></strong>' +
          '<small><span class="skel settings-notify-detail" style="width:' + detailWidth + '%"></span></small></span>' +
          '<span class="notify-switch settings-notify-switch"><i class="skel"></i></span></div>';
      }).join('');
      return;
    }
    card.removeAttribute('aria-busy');
    var settings = currentSettings();
    card.innerHTML = NOTIFY_ROWS.map(function (row) {
      var on = settings[row[0]] === true;
      return '<div class="notify-row"><span class="notify-copy"><strong>' + row[1] + '</strong><small>' + row[2] + '</small></span>' +
        '<button class="notify-switch' + (on ? ' is-on' : '') + '" data-notify-key="' + row[0] + '" type="button" role="switch" aria-checked="' + on + '" aria-label="' + row[1] + '"><i></i></button></div>';
    }).join('') +
      '<div class="settings-push-card"><div><strong>이 기기의 OS 푸시</strong>' +
      '<small id="pushSettingsStatus">브라우저 알림 상태를 확인하고 있습니다.</small></div>' +
      '<button class="settings-push-button" id="pushSettingsButton" type="button" disabled>확인 중…</button></div>';
    card.querySelectorAll('[data-notify-key]').forEach(function (button) {
      button.addEventListener('click', function () { toggleNotification(button); });
    });
    var pushButton = $('pushSettingsButton');
    if (pushButton) pushButton.addEventListener('click', togglePushNotifications);
    renderPushSettings();
  }

  function renderPushSettings() {
    var button = $('pushSettingsButton');
    var status = $('pushSettingsStatus');
    if (!button || !status || !state.user || typeof FB === 'undefined' || !FB.getPushStatus) return;
    var uid = state.user.uid;
    var sequence = ++state.pushStatusSequence;
    button.disabled = true;
    status.textContent = '브라우저 알림 상태를 확인하고 있습니다.';
    FB.getPushStatus(uid).then(function (push) {
      if (sequence !== state.pushStatusSequence || !state.user || state.user.uid !== uid) return;
      state.pushEnabled = !!push.enabled;
      if (!push.supported) {
        status.textContent = '이 브라우저에서는 OS 푸시를 지원하지 않습니다. HTTPS와 최신 브라우저가 필요합니다.';
        button.textContent = '지원하지 않는 브라우저';
        button.disabled = true;
      } else if (push.enabled) {
        status.textContent = '이 기기에서 OS 푸시를 받고 있습니다.';
        button.textContent = '이 기기 푸시 끄기';
        button.disabled = !!state.pushBusy;
      } else if (!push.configured) {
        status.textContent = 'Firebase Web Push 공개키 설정이 완료되어야 사용할 수 있습니다.';
        button.textContent = '푸시 설정 필요';
        button.disabled = true;
      } else if (push.permission === 'denied') {
        status.textContent = '브라우저 사이트 설정에서 알림 권한을 허용해 주세요.';
        button.textContent = '브라우저 권한 필요';
        button.disabled = true;
      } else {
        status.textContent = push.enabled
          ? '이 기기에서 OS 푸시를 받고 있습니다.'
          : '브라우저가 닫혀 있어도 이 기기로 알림을 보냅니다.';
        button.textContent = push.enabled ? '이 기기 푸시 끄기' : '이 기기 푸시 켜기';
        button.disabled = !!state.pushBusy;
      }
    }).catch(function () {
      if (sequence !== state.pushStatusSequence) return;
      state.pushEnabled = false;
      status.textContent = '푸시 상태를 확인하지 못했습니다.';
      button.textContent = '다시 확인';
      button.disabled = false;
    });
  }

  function togglePushNotifications() {
    if (!state.user || state.pushBusy || typeof FB === 'undefined') return;
    state.pushBusy = true;
    var button = $('pushSettingsButton');
    if (button) { button.disabled = true; button.textContent = '처리 중…'; }
    var task = state.pushEnabled
      ? FB.disablePushNotifications(state.user.uid)
      : FB.enablePushNotifications(state.user.uid);
    Promise.resolve(task).then(function () {
      state.pushEnabled = !state.pushEnabled;
      showToast(state.pushEnabled ? '이 기기의 OS 푸시를 켰습니다.' : '이 기기의 OS 푸시를 껐습니다.');
    }).catch(function (error) {
      showToast(error && error.message ? error.message : 'OS 푸시 설정을 변경하지 못했습니다.');
    }).then(function () {
      state.pushBusy = false;
      renderPushSettings();
    });
  }

  function notificationInboxUrl(path) {
    path = String(path || '');
    if (/^(?:[a-z]+:|\/\/|#|\/)/i.test(path)) return path;
    return new URL('ko/' + path.replace(/^ko\//i, ''), document.baseURI).href;
  }

  function notificationInboxHref(item) {
    if (item.href) return notificationInboxUrl(item.href);
    if (!item.targetId) return '';
    var targetId = encodeURIComponent(item.targetId);
    if (item.type === 'patch') return notificationInboxUrl('Community.html#patch/view/' + targetId);
    if (item.type === 'event') return notificationInboxUrl('Community.html#event/view/' + targetId);
    if (item.type === 'comment') {
      return notificationInboxUrl((String(item.targetType).toLowerCase() === 'event' ?
        'Community.html#event/view/' : 'Community.html#board/view/') + targetId);
    }
    return notificationInboxUrl('Main.html#pvp');
  }

  function notificationInboxMessage(item) {
    function value(value) {
      value = String(value == null ? '' : value).trim();
      return value === '새 알림이 있습니다.' ? '' : value;
    }
    var title = value(item.targetTitle) || value(item.title) || value(item.body);
    var character = value(item.characterName) || value(item.title) || value(item.body) || '즐겨찾기 캐릭터';
    if (item.type === 'patch') {
      if (/^\[패치노트\]/.test(title)) return title;
      return '[패치노트] 최신 ' + (title || '패치노트') + ' 등록! 지금 확인해보세요.';
    }
    if (item.type === 'fav') {
      if (/^즐겨찾기한 .+의 밸런스 패치/.test(title)) return title;
      return '즐겨찾기한 ' + character + '의 밸런스 패치! 지금 바로 확인해보세요.';
    }
    if (item.type === 'comment') {
      return item.isReply ?
        '작성하신 댓글에 대댓글이 달렸어요! 지금 확인해 보세요.' :
        '작성하신 게시글에 댓글이 달렸어요! 지금 확인해 보세요.';
    }
    if (item.type === 'support') {
      return value(item.title) || (value(item.targetTitle) ?
        value(item.targetTitle) + ' 문의에 답변이 등록되었습니다.' : '고객센터 문의에 답변이 등록되었습니다.');
    }
    if (item.type === 'event') {
      var eventTitle = title.replace(/^\[이벤트\]\s*/, '').replace(/\s*이벤트\s*종료\s*임박.*$/i, '').trim();
      if (item.isEndingSoon || /종료\s*임박|ending.?soon|deadline/i.test(String(item.subType || '') + ' ' + String(item.title || '') + ' ' + String(item.body || ''))) {
        var eventName = eventTitle.replace(/\s*이벤트$/i, '').trim();
        return (eventName ? eventName + ' 이벤트' : '이벤트') + ' 종료 임박! 놓치기 전에 확인해 보세요.';
      }
      return '새로운 이벤트가 시작되었어요! 지금 바로 확인해 보세요.';
    }
    return title || '새 알림이 있습니다.';
  }

  function notificationInboxIcon(type) {
    var icons = {
      patch: 'ic-v2-community-view-update-line',
      fav: 'ic-v2-community-star-fill',
      event: 'ic-v2-community-calendar-line',
      comment: 'ic-v2-community-comment-line',
      support: 'ic-v2-community-comment-line'
    };
    return '<i class="settings-font-icon settings-notification-icon ' + (icons[type] || icons.comment) + '" aria-hidden="true"></i>';
  }

  function notificationInboxTime(value) {
    var ms = 0;
    if (value && value.seconds != null) ms = Number(value.seconds) * 1000;
    else if (typeof value === 'number') ms = value > 1e12 ? value : value * 1000;
    else if (value) ms = Date.parse(String(value).replace(/\./g, '-').replace(' ', 'T')) || 0;
    if (!ms) return '';
    var diff = Math.max(0, Date.now() - ms);
    if (diff < 60 * 1000) return '방금 전';
    if (diff < 60 * 60 * 1000) return Math.floor(diff / (60 * 1000)) + '분 전';
    if (diff < 24 * 60 * 60 * 1000) return Math.floor(diff / (60 * 60 * 1000)) + '시간 전';
    if (diff < 7 * 24 * 60 * 60 * 1000) return Math.floor(diff / (24 * 60 * 60 * 1000)) + '일 전';
    return dateText(new Date(ms).toISOString());
  }

  function notificationInboxSkeleton(count) {
    var html = '';
    for (var i = 0; i < count; i++) {
      var titleWidth = 46 + (i % 3) * 12;
      var timeWidth = 32 + (i % 2) * 12;
      html += '<div class="profile-notification-row notification-skeleton-row" aria-hidden="true">' +
        '<span class="notify-icon notify-skeleton-icon"><span class="skel notification-skeleton-avatar"></span></span>' +
        '<span class="profile-notification-copy"><b><span class="skel notification-skeleton-title" style="width:' + titleWidth + '%"></span></b>' +
        '<time><span class="skel notification-skeleton-time" style="width:' + timeWidth + '%"></span></time></span>' +
        '<i class="skel notification-skeleton-dot"></i></div>';
    }
    return html;
  }

  function filteredNotificationInbox() {
    var items = state.notificationItems.slice();
    if (state.notificationFilter === 'unread') return items.filter(function (item) { return !item.read; });
    if (state.notificationFilter === 'read') return items.filter(function (item) { return !!item.read; });
    return items;
  }

  function writeClipboardText(text) {
    text = String(text || '');
    function legacyCopy() {
      return new Promise(function (resolve, reject) {
        var input = document.createElement('textarea');
        input.value = text;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.left = '-9999px';
        document.body.appendChild(input);
        input.select();
        var copied = false;
        try { copied = document.execCommand('copy'); } catch (error) {}
        document.body.removeChild(input);
        if (copied) resolve();
        else reject(new Error('클립보드 복사에 실패했습니다.'));
      });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(legacyCopy);
    }
    return legacyCopy();
  }

  function isGoogleAccount(user) {
    return !!(user && (user.providerData || []).some(function (provider) {
      return provider.providerId === 'google.com';
    }));
  }

  function infoLoginMethod(user) {
    return isGoogleAccount(user) ? '구글' : '이메일';
  }

  function requestInfoPasswordChange() {
    if (!state.user) return;
    if (isGoogleAccount(state.user)) {
      showToast('구글 계정의 비밀번호는 Google 계정에서 변경해 주세요.');
      return;
    }
    if (!state.user.email) {
      showToast('비밀번호를 변경할 이메일 정보가 없습니다.');
      return;
    }
    var auth = typeof FB !== 'undefined' && FB.auth && FB.auth();
    if (typeof FB === 'undefined' || !FB.ready || !auth || !auth.sendPasswordResetEmail) {
      showToast('Firebase가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    auth.sendPasswordResetEmail(state.user.email).then(function () {
      showToast('비밀번호 변경 메일을 보냈습니다. 메일함을 확인해 주세요.');
    }).catch(function (error) {
      showToast((typeof FB.errMsg === 'function' ? FB.errMsg(error) : '비밀번호 변경 메일을 보내지 못했습니다.') +
        ' 최근 로그인 후 다시 시도해 주세요.');
    });
  }

  function signOutSettingsAccount() {
    if (!state.user) {
      showToast('로그인이 필요합니다.');
      return;
    }
    var auth = typeof FB !== 'undefined' && FB.auth && FB.auth();
    var button = $('settingsInfoLogout');
    if (!auth || !auth.signOut) {
      showToast('Firebase가 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.');
      return;
    }
    if (button) button.disabled = true;
    auth.signOut().then(function () {
      showToast('로그아웃 되었습니다.');
      window.setTimeout(function () { location.href = 'ko/Main.html#home'; }, 700);
    }).catch(function (error) {
      if (button) button.disabled = false;
      showToast(typeof FB.errMsg === 'function' ? FB.errMsg(error) : '로그아웃하지 못했습니다.');
    });
  }

  function confirmSettingsAccountDelete() {
    if (!state.user) {
      showToast('로그인이 필요합니다.');
      return;
    }
    if (!window.confirm('정말 회원 탈퇴하시겠습니까? 계정 삭제 후에는 복구할 수 없습니다.')) return;
    var auth = typeof FB !== 'undefined' && FB.auth && FB.auth();
    var user = auth && auth.currentUser;
    if (!user) {
      showToast('로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
      return;
    }
    var button = $('settingsInfoDelete');
    if (button) button.disabled = true;
    user.delete().then(function () {
      showToast('탈퇴가 완료되었습니다.');
      window.setTimeout(function () { location.href = 'ko/Main.html#home'; }, 700);
    }).catch(function (error) {
      var message = typeof FB.errMsg === 'function' ? FB.errMsg(error) : '회원 탈퇴를 완료하지 못했습니다.';
      showToast(message + ' 보안 정책상 최근 로그인 후 다시 시도해 주세요.');
    }).then(function () {
      if (button) button.disabled = false;
    });
  }

  function renderNotificationInboxRows() {
    var list = $('settingsNotificationList');
    if (!list) return;
    if (state.notificationLoadingUid === state.notificationUid) return;
    list.removeAttribute('aria-busy');
    document.querySelectorAll('[data-settings-notify-filter]').forEach(function (button) {
      var active = button.getAttribute('data-settings-notify-filter') === state.notificationFilter;
      button.classList.toggle('is-on', active);
      button.setAttribute('aria-selected', String(active));
    });
    var items = filteredNotificationInbox();
    if (state.notificationLoadError) {
      list.innerHTML = '<div class="empty profile-notification-empty"><p>알림을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p></div>';
      return;
    }
    if (!items.length) {
      var emptyMessage = state.notificationFilter === 'unread' ? '읽지 않은 알림이 없습니다.' :
        state.notificationFilter === 'read' ? '읽은 알림이 없습니다.' : '알림이 없습니다.';
      list.innerHTML = '<div class="empty profile-notification-empty"><p>' + emptyMessage + '</p></div>';
      return;
    }
    list.innerHTML = items.map(function (item) {
      return '<button class="profile-notification-row' + (item.read ? '' : ' is-unread') + '" type="button" data-settings-notification-id="' + esc(item.docId) + '">' +
        '<span class="notify-icon notify-icon--' + esc(item.type) + '">' + notificationInboxIcon(item.type) + '</span>' +
        '<span class="profile-notification-copy"><b>' + esc(notificationInboxMessage(item)) + '</b>' +
        '<time>' + esc(notificationInboxTime(item.createdAt || item.date)) + '</time></span>' +
        (item.read ? '' : '<i class="notify-unread-dot" aria-hidden="true"></i>') + '</button>';
    }).join('');
    list.querySelectorAll('[data-settings-notification-id]').forEach(function (row) {
      row.addEventListener('click', function () {
        var item = state.notificationItems.filter(function (entry) {
          return String(entry.docId) === String(row.getAttribute('data-settings-notification-id'));
        })[0];
        if (!item) return;
        if (!item.read) {
          item.read = true;
          if (typeof FB !== 'undefined' && FB.markNotificationsRead) {
            FB.markNotificationsRead([item]).catch(function () {});
          }
        }
        var href = notificationInboxHref(item);
        if (href) location.href = href;
        else renderNotificationInboxRows();
      });
    });
  }

  function stopNotificationInboxListener() {
    if (state.notificationUnsubscribe) {
      state.notificationUnsubscribe();
      state.notificationUnsubscribe = null;
    }
    state.notificationListenerUid = null;
  }

  function renderNotificationInbox() {
    var content = $('notificationsContent');
    var list = $('settingsNotificationList');
    if (!content || !list) return;
    if (!state.user) {
      content.hidden = true;
      return;
    }
    content.hidden = false;
    var uid = state.user.uid;
    if (state.notificationUid !== uid) {
      stopNotificationInboxListener();
      state.notificationUid = uid;
      state.notificationItems = [];
      state.notificationLoadedUid = null;
      state.notificationLoadingUid = null;
      state.notificationLoadError = false;
      state.notificationFilter = 'all';
    }
    if (state.notificationListenerUid === uid) {
      renderNotificationInboxRows();
      return;
    }
    if (state.notificationLoadingUid === uid) return;
    state.notificationLoadingUid = uid;
    state.notificationLoadError = false;
    list.setAttribute('aria-busy', 'true');
    list.innerHTML = notificationInboxSkeleton(5);
    var ready = typeof FB !== 'undefined' && FB.onReady ? FB.onReady() : Promise.resolve();
    ready.then(function () {
      if (!state.user || state.user.uid !== uid || state.view !== 'notifications') {
        if (state.notificationLoadingUid === uid) state.notificationLoadingUid = null;
        return;
      }
      if (typeof FB !== 'undefined' && FB.ready && FB.watchNotifications) {
        state.notificationListenerUid = uid;
        state.notificationUnsubscribe = FB.watchNotifications(uid, function (items) {
          if (!state.user || state.user.uid !== uid || state.notificationListenerUid !== uid) return;
          state.notificationItems = items || [];
          state.notificationLoadedUid = uid;
          state.notificationLoadError = false;
          state.notificationLoadingUid = null;
          renderNotificationInboxRows();
        }, function () {
          if (!state.user || state.user.uid !== uid || state.notificationListenerUid !== uid) return;
          stopNotificationInboxListener();
          state.notificationLoadingUid = null;
          state.notificationLoadError = true;
          renderNotificationInboxRows();
        });
        state.notificationLoadingUid = null;
        return;
      }
      return typeof FB !== 'undefined' && FB.ready && FB.getNotifications ? FB.getNotifications(uid) : [];
    }).then(function (items) {
      if (!items) return;
      if (state.notificationLoadingUid === uid) state.notificationLoadingUid = null;
      if (!state.user || state.user.uid !== uid) return;
      state.notificationItems = items || [];
      state.notificationLoadedUid = uid;
      state.notificationLoadError = false;
      renderNotificationInboxRows();
    }).catch(function () {
      if (state.notificationLoadingUid === uid) state.notificationLoadingUid = null;
      if (!state.user || state.user.uid !== uid || state.view !== 'notifications') return;
      stopNotificationInboxListener();
      state.notificationLoadError = true;
      renderNotificationInboxRows();
    });
  }

  function renderMyInfo() {
    var content = $('infoContent');
    var card = $('infoCard');
    if (!content || !card) return;
    if (!state.user) {
      content.hidden = true;
      return;
    }
    content.hidden = false;
    if (!state.userDoc) {
      card.setAttribute('aria-busy', 'true');
      card.innerHTML =
        '<div class="settings-info-row"><span>닉네임</span><span class="skel settings-info-skeleton"></span></div>' +
        '<div class="settings-info-row"><span>로그인 방식</span><span class="skel settings-info-skeleton"></span></div>' +
        '<div class="settings-info-row"><span>아이디</span><span class="skel settings-info-skeleton"></span></div>' +
        '<div class="settings-info-row"><span>비밀번호</span><span class="skel settings-info-skeleton"></span></div>' +
        '<div class="settings-info-row"><span>회원번호</span><span class="settings-info-value-group"><span class="skel settings-info-skeleton"></span></span></div>';
      return;
    }
    card.removeAttribute('aria-busy');
    var profile = state.userDoc || {};
    var nickname = profile.nickname || state.user.displayName || '선원';
    var email = state.user.email || '이메일 없음';
    var memberId = profile.memberNumber || profile.memberId || profile.uid || state.user.uid || '확인 불가';
    card.innerHTML =
      '<div class="settings-info-row"><span>닉네임</span><strong>' + esc(nickname) + '</strong></div>' +
      '<div class="settings-info-row"><span>로그인 방식</span><strong>' + esc(infoLoginMethod(state.user)) + '</strong></div>' +
      '<div class="settings-info-row"><span>아이디</span><strong>' + esc(email) + '</strong></div>' +
      '<div class="settings-info-row"><span>비밀번호</span><button class="my-info-action" id="settingsInfoPassword" type="button">변경</button></div>' +
      '<div class="settings-info-row"><span>회원번호</span><span class="settings-info-value-group">' +
      '<strong class="settings-info-member-id" title="' + esc(memberId) + '">' + esc(memberId) + '</strong>' +
      '<button class="my-info-copy" id="settingsInfoCopyMemberId" type="button" aria-label="회원번호 복사" title="회원번호 복사">복사</button></span></div>';
    $('settingsInfoPassword').addEventListener('click', requestInfoPasswordChange);
    $('settingsInfoCopyMemberId').addEventListener('click', function () {
      writeClipboardText(memberId).then(function () {
        showToast('회원번호를 복사했습니다.');
      }).catch(function () {
        showToast('회원번호 복사에 실패했습니다.');
      });
    });
  }

  function updateProfilePreview() {
    var src = avatarOf(state.profileDraftIcon);
    if ($('profileSettingCover')) $('profileSettingCover').src = src;
    if ($('profileSettingAvatar')) $('profileSettingAvatar').src = src;
    var input = $('settingsProfileNickname');
    if ($('profileSettingName')) $('profileSettingName').textContent = input && input.value.trim() ? input.value.trim() : '선원';
    var counts = (state.userDoc && state.userDoc.counts) || {};
    if ($('profilePosts')) $('profilePosts').textContent = counts.posts || 0;
    if ($('profileComments')) $('profileComments').textContent = counts.comments || 0;
    if ($('profileLikes')) $('profileLikes').textContent = counts.likes || 0;
  }

  function syncProfileEditor() {
    var input = $('settingsProfileNickname');
    var save = $('settingsProfileSave');
    if (!input || !save) return;
    updateProfilePreview();
    var nickname = input.value.trim();
    var changed = state.profileDraftIcon !== state.profileInitialIcon || nickname !== state.profileInitialNickname;
    save.disabled = state.profileSaving || !nickname || !changed;
  }

  function prepareProfileEditor() {
    var form = $('profileSettingsForm');
    var loading = $('profileSettingsLoading');
    if (!state.user) {
      if (form) form.hidden = true;
      if (loading) loading.hidden = true;
      state.profileEditorUid = null;
      return;
    }
    if (!state.userDoc) {
      if (form) form.hidden = true;
      if (loading) loading.hidden = false;
      return;
    }
    if (loading) loading.hidden = true;
    if (form) form.hidden = false;
    if (state.profileEditorUid !== state.user.uid) {
      var profile = state.userDoc || {};
      var icon = parseInt(profile.profileIcon, 10);
      if (isNaN(icon)) icon = 0;
      state.profileDraftIcon = Math.abs(icon) % PROFILE_ICON_FILES.length;
      state.profileInitialIcon = state.profileDraftIcon;
      state.profileInitialNickname = profile.nickname || state.user.displayName || '선원';
      state.profileEditorUid = state.user.uid;
      $('settingsProfileNickname').value = state.profileInitialNickname;
    }
    syncProfileEditor();
  }

  function openSettingsAvatarPicker() {
    if (!state.user) return;
    var overlay = $('settingsAvatarOverlay');
    var grid = $('settingsAvatarGrid');
    if (!overlay || !grid) return;
    state.avatarPickerIcon = state.profileDraftIcon;
    grid.innerHTML = PROFILE_ICON_FILES.map(function (filename, index) {
      var selected = index === state.avatarPickerIcon;
      return '<button class="settings-avatar-item' + (selected ? ' is-selected' : '') + '" type="button" data-settings-avatar="' + index + '" aria-label="' + esc(filename.replace(/\.png$/i, '')) + '" aria-pressed="' + selected + '">' +
        '<img src="img/avatars/' + esc(filename) + '" alt=""></button>';
    }).join('');
    $('settingsAvatarPreview').src = avatarOf(state.avatarPickerIcon);
    overlay.hidden = false;
    grid.querySelectorAll('[data-settings-avatar]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.avatarPickerIcon = Number(button.getAttribute('data-settings-avatar')) || 0;
        $('settingsAvatarPreview').src = avatarOf(state.avatarPickerIcon);
        grid.querySelectorAll('[data-settings-avatar]').forEach(function (item) {
          var selected = item === button;
          item.classList.toggle('is-selected', selected);
          item.setAttribute('aria-pressed', String(selected));
        });
      });
    });
  }

  function closeSettingsAvatarPicker() {
    var overlay = $('settingsAvatarOverlay');
    if (overlay) overlay.hidden = true;
  }

  function registerSettingsAvatar() {
    state.profileDraftIcon = state.avatarPickerIcon;
    closeSettingsAvatarPicker();
    syncProfileEditor();
  }

  function saveProfileSettings() {
    if (!state.user) {
      showToast('로그인이 필요합니다.');
      return;
    }
    var nickname = $('settingsProfileNickname').value.trim();
    if (!nickname) {
      showToast('닉네임을 입력해 주세요.');
      $('settingsProfileNickname').focus();
      return;
    }
    if (state.profileSaving) return;
    state.profileSaving = true;
    syncProfileEditor();
    FB.updateUserDoc(state.user.uid, { profileIcon: state.profileDraftIcon, nickname: nickname }).then(function () {
      state.userDoc = Object.assign({}, state.userDoc || {}, { profileIcon: state.profileDraftIcon, nickname: nickname });
      state.profileInitialIcon = state.profileDraftIcon;
      state.profileInitialNickname = nickname;
      state.profileEditorUid = state.user.uid;
      renderMobileHeader();
      showToast('프로필이 저장되었습니다.');
    }).catch(function (error) {
      var message = typeof FB.errMsg === 'function' ? FB.errMsg(error) : '프로필을 저장하지 못했습니다.';
      showToast(message);
    }).then(function () {
      state.profileSaving = false;
      syncProfileEditor();
    });
  }

  function toggleNotification(button) {
    var key = button.dataset.notifyKey;
    var settings = currentSettings();
    var enabled = !button.classList.contains('is-on');
    settings[key] = enabled;
    button.disabled = true;
    FB.updateUserDoc(state.user.uid, { settings: settings }).then(function () {
      state.userDoc = Object.assign({}, state.userDoc, { settings: settings });
      button.classList.toggle('is-on', enabled);
      button.setAttribute('aria-checked', String(enabled));
      showToast((NOTIFY_ROWS.filter(function (row) { return row[0] === key; })[0] || [key])[1] + '이 ' + (enabled ? '켜졌습니다.' : '꺼졌습니다.'));
    }).catch(function () {
      showToast('알림 설정을 저장하지 못했습니다.');
    }).then(function () { button.disabled = false; });
  }

  function selectedIcon() {
    var settings = currentSettings();
    if (settings.appIcon === 'logo-dark' || settings.appIcon === 'logo-light') return settings.appIcon;
    try {
      var saved = localStorage.getItem('fpp_appIcon');
      if (saved === 'logo-dark' || saved === 'logo-light') return saved;
    } catch (e) {}
    return readTheme() === 'light' ? 'logo-light' : 'logo-dark';
  }

  function renderAppIcons() {
    var selected = selectedIcon();
    $('iconSummary').textContent = selected === 'logo-light' ? '라이트 로고' : '다크 로고';
    document.querySelectorAll('[data-icon-choice]').forEach(function (button) {
      var active = button.dataset.iconChoice === selected;
      button.classList.toggle('is-on', active);
      button.setAttribute('aria-checked', String(active));
    });
  }

  function chooseIcon(button) {
    var value = button.dataset.iconChoice;
    try { localStorage.setItem('fpp_appIcon', value); } catch (e) {}
    renderAppIcons();
    if (!state.user) {
      showToast('이 브라우저에 아이콘 설정을 저장했습니다.');
      return;
    }
    var settings = currentSettings();
    settings.appIcon = value;
    FB.updateUserDoc(state.user.uid, { settings: settings }).then(function () {
      state.userDoc = Object.assign({}, state.userDoc, { settings: settings });
      showToast('앱 아이콘 설정을 저장했습니다.');
    }).catch(function () { showToast('앱 아이콘 설정을 저장하지 못했습니다.'); });
  }

  function installShortcut() {
    if (state.deferredInstall) {
      state.deferredInstall.prompt();
      state.deferredInstall.userChoice.then(function (choice) {
        showToast(choice.outcome === 'accepted' ? '홈 화면에 추가했습니다.' : '홈 화면 추가를 취소했습니다.');
        state.deferredInstall = null;
      });
    } else {
      showToast('브라우저 메뉴에서 홈 화면에 추가를 선택해 주세요.');
    }
  }

  function isMobileLayout() {
    return window.matchMedia
      ? window.matchMedia('(max-width: 767px)').matches
      : window.innerWidth <= 767;
  }

  function applyBoardVisibility(visibility) {
    var hidden = !!visibility && visibility.boards === false;
    var stats = document.querySelector('.settings-stats');
    var profileStats = $('profileSettingStats');
    var writeButton = document.querySelector('.settings-write-button');
    if (stats) stats.hidden = hidden;
    if (profileStats) profileStats.hidden = hidden;
    if (writeButton) writeButton.hidden = hidden;
  }

  function initCommunityVisibility() {
    if (typeof FB === 'undefined') return;
    FB.onReady().then(function () {
      if (FB.ready && FB.watchCommunityVisibility) {
        FB.watchCommunityVisibility(applyBoardVisibility);
      }
    });
  }

  function initAuth() {
    function settleAsGuest() {
      stopNotificationInboxListener();
      state.user = null;
      state.userDoc = null;
      state.authResolved = true;
      renderMobileHeader();
      renderDashboard();
      if (state.view === 'notify') renderNotifications();
      if (state.view === 'notifications') renderNotificationInbox();
      if (state.view === 'myInfo') renderMyInfo();
      if (state.view === 'profileInfo') prepareProfileEditor();
      resolvePendingProtectedView(false);
    }
    if (typeof FB === 'undefined') {
      settleAsGuest();
      return;
    }
    FB.onReady().then(function () {
      var auth = FB.ready && FB.auth && FB.auth();
      if (!auth) {
        settleAsGuest();
        return;
      }
      auth.onAuthStateChanged(function (user) {
        var notificationUid = user && user.uid || null;
        if (state.notificationUid !== notificationUid) {
          stopNotificationInboxListener();
          state.notificationUid = notificationUid;
          state.notificationItems = [];
          state.notificationLoadedUid = null;
          state.notificationLoadingUid = null;
          state.notificationLoadError = false;
        }
        state.user = user;
        state.userDoc = null;
        state.profileEditorUid = null;
        if (state.view === 'notify') renderNotifications();
        if (state.view === 'notifications') renderNotificationInbox();
        if (state.view === 'myInfo') renderMyInfo();
        if (state.view === 'profileInfo') prepareProfileEditor();
        if (!user) {
          state.authResolved = true;
          renderMobileHeader();
          renderDashboard();
          resolvePendingProtectedView(false);
          return;
        }
        state.authResolved = false;
        renderMobileHeader();
        renderDashboard();
        resolvePendingProtectedView(true);
        FB.getUserDoc(user.uid).then(function (profile) {
          state.userDoc = profile || {};
          state.authResolved = true;
          renderMobileHeader();
          renderDashboard();
          loadFavoriteCatalog();
           if (state.view === 'profileInfo') prepareProfileEditor();
           if (state.view === 'notify') renderNotifications();
           if (state.view === 'myInfo') renderMyInfo();
          if (state.view === 'appIcon') renderAppIcons();
        }).catch(function () {
          state.userDoc = {};
          state.authResolved = true;
          renderMobileHeader();
          renderDashboard();
           if (state.view === 'profileInfo') prepareProfileEditor();
           if (state.view === 'notify') renderNotifications();
           if (state.view === 'myInfo') renderMyInfo();
        });
      });
    }).catch(settleAsGuest);
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* HTML의 조기 리다이렉트가 막히는 환경을 위한 2차 방어 */
    if (!isMobileLayout()) {
      location.replace('ko/Main.html#home');
      return;
    }
    applyTheme(readTheme());
    $('settingsMobileBack').addEventListener('click', function () {
      if (state.view === 'profileInfo' || state.view === 'notifications') goBack();
      else goToSettingsMain();
    });
    $('settingsMobileUser').addEventListener('click', function () {
      showView('profileInfo', true);
    });
    $('settingsInfoLogout').addEventListener('click', signOutSettingsAccount);
    $('settingsInfoDelete').addEventListener('click', confirmSettingsAccountDelete);
    $('settingsMobileSettings').addEventListener('click', function () {
      showView('main', true);
    });
    $('settingsMobileNotify').addEventListener('click', function () {
      showView('notifications', true);
    });
    $('settingsMobileClose').addEventListener('click', closeSettings);
    $('settingsProfileImage').addEventListener('click', openSettingsAvatarPicker);
    $('settingsProfileNickname').addEventListener('input', syncProfileEditor);
    $('settingsProfileSave').addEventListener('click', saveProfileSettings);
    $('settingsAvatarClose').addEventListener('click', closeSettingsAvatarPicker);
    $('settingsAvatarCancel').addEventListener('click', closeSettingsAvatarPicker);
    $('settingsAvatarRegister').addEventListener('click', registerSettingsAvatar);
    $('settingsAvatarOverlay').addEventListener('click', function (event) {
      if (event.target === $('settingsAvatarOverlay')) closeSettingsAvatarPicker();
    });
    $('settingsAuthGate').addEventListener('click', function (event) {
      if (event.target === $('settingsAuthGate')) hideLoginRequiredPopup();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        if (!$('settingsAuthGate').hidden) hideLoginRequiredPopup();
        else closeSettingsAvatarPicker();
      }
    });
    $('noticeDetailBack').addEventListener('click', goBack);
    document.querySelectorAll('[data-open]').forEach(function (button) {
      button.addEventListener('click', function () { showView(button.dataset.open, true); });
    });
    document.querySelectorAll('[data-favorite-tab]').forEach(function (button) {
      button.addEventListener('click', function () { setFavoriteTab(button); });
    });
    document.querySelectorAll('[data-theme-choice]').forEach(function (button) {
      button.addEventListener('click', function () {
        applyTheme(button.dataset.themeChoice);
        showToast('테마가 적용되었습니다.');
      });
    });
    document.querySelectorAll('[data-settings-notify-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        state.notificationFilter = button.getAttribute('data-settings-notify-filter');
        renderNotificationInboxRows();
        window.scrollTo(0, 0);
      });
    });
    document.querySelectorAll('[data-icon-choice]').forEach(function (button) {
      button.addEventListener('click', function () { chooseIcon(button); });
    });
    $('installShortcut').addEventListener('click', installShortcut);
    window.addEventListener('fpp:push-message', function () {
      if (!state.user) return;
      state.notificationLoadedUid = null;
      state.notificationLoadError = false;
      if (state.view === 'notifications') {
        state.notificationLoadingUid = null;
        renderNotificationInbox();
      }
    });
    window.addEventListener('beforeinstallprompt', function (event) {
      event.preventDefault();
      state.deferredInstall = event;
    });
    window.addEventListener('popstate', function (event) {
      if (event.state && event.state.settingsView) showView(event.state.settingsView, false);
      else showView('main', false);
    });
    initAuth();
    initCommunityVisibility();
    renderMobileHeader();
    renderDashboard();
    var initial = (location.hash === '#Setting' || location.hash === '#setting') ? 'main' : location.hash.replace(/^#setting-/, '');
    if (['blank', 'main', 'myInfo', 'profileInfo', 'notice', 'notify', 'notifications', 'theme', 'appIcon'].indexOf(initial) < 0) initial = 'blank';
    if (initial === 'main' && location.hash === '#setting-main') history.replaceState({ settingsView: 'main' }, '', settingsRouteUrl('main'));
    else history.replaceState({ settingsView: initial }, '', settingsRouteUrl(initial));
    if (initial !== state.view) showView(initial, false);
    else setHeaderSelection(initial);
  });
})();