/* ============================================================
   postedit.js — Mobile 전용 게시판 글쓰기 (PostEdit.html)
   ============================================================ */
(function () {
  'use strict';

  var ICON = null;
  var ed = null;
  var curPrefix = '';
  var editingId = null;
  var trayView = null;      // null | 'fmt' | 'size' | 'color' | 'bgcolor'
  var emojiOpen = false;
  var kbHeight = 0;

  var dock, tray, trayInner, emojiPanel, area, fmtBtn, emojiBtn;

  /* ── 테마 (기존 사이트와 동일) ── */
  function initTheme() {
    var saved = localStorage.getItem('theme') || 'system';
    if (typeof applyTheme === 'function') applyTheme(saved);
  }

  /* ── 키보드 높이 추적 : 툴바를 항상 키보드 바로 위에 고정 ── */
  function initKeyboardTracking() {
    var vv = window.visualViewport;
    if (!vv) return;
    function update() {
      var h = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      if (!emojiOpen) {
        kbHeight = h;
        if (h > 120) document.documentElement.style.setProperty('--bem-kb', h + 'px');
        dock.style.transform = 'translateY(-' + h + 'px)';
      }
    }
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    update();
  }

  /* ── 서식 트레이 ── */
  function trayHtml(view) {
    var st = ed.state;
    if (view === 'fmt') {
      return [
        '<button type="button" class="bem-tray-btn" data-act="close">' + ICON.back + '</button>',
        '<button type="button" class="bem-tray-btn" data-act="size"><span>' + st.size + '</span></button>',
        '<button type="button" class="bem-tray-btn" data-act="align">' + ICON.align[st.align] + '</button>',
        '<button type="button" class="bem-tray-btn' + (st.bold ? ' active' : '') + '" data-cmd="bold"><b>B</b></button>',
        '<button type="button" class="bem-tray-btn' + (st.underline ? ' active' : '') + '" data-cmd="underline"><u>U</u></button>',
        '<button type="button" class="bem-tray-btn" data-act="color"><span style="display:flex;flex-direction:column;align-items:center;line-height:1"><b>A</b><span class="bed-colorchip' + (st.color ? '' : ' bed-none-chip') + '" style="background:' + (st.color || '') + '"></span></span></button>',
        '<button type="button" class="bem-tray-btn" data-act="bgcolor"><span style="display:flex;flex-direction:column;align-items:center;line-height:1"><b style="padding:0 2px;border-radius:3px;background:' + (st.bg || 'transparent') + '">A</b><span class="bed-colorchip' + (st.bg ? '' : ' bed-none-chip') + '" style="background:' + (st.bg || '') + '"></span></span></button>',
        '<button type="button" class="bem-tray-btn' + (st.strike ? ' active' : '') + '" data-cmd="strikeThrough"><s>S</s></button>'
      ].join('');
    }
    if (view === 'size') {
      return '<button type="button" class="bem-tray-btn" data-act="back" style="margin-right:6px">' + ICON.back + '</button>' +
        BED.SIZES.map(function (s) {
          return '<button type="button" class="bem-size-btn' + (s === st.size ? ' active' : '') + '" data-size="' + s + '">' + s + '</button>';
        }).join('');
    }
    if (view === 'color' || view === 'bgcolor') {
      var cur = view === 'color' ? st.color : st.bg;
      return '<button type="button" class="bem-tray-btn" data-act="back" style="margin-right:6px">' + ICON.back + '</button>' +
        BED.COLORS.map(function (c) {
          if (!c.value) return '<button type="button" class="bem-color-btn bem-color-none' + (cur === '' ? ' active' : '') + '" data-color="" aria-label="없음"></button>';
          return '<button type="button" class="bem-color-btn' + (cur === c.value ? ' active' : '') + '" data-color="' + c.value + '" aria-label="' + c.label + '" style="background:' + c.value + '"></button>';
        }).join('');
    }
    return '';
  }

  function renderTray(view, animate) {
    trayView = view;
    if (!view) {
      tray.classList.remove('open');
      fmtBtn.classList.remove('active');
      setTimeout(function () { if (!trayView) trayInner.innerHTML = ''; }, 260);
      return;
    }
    trayInner.className = 'bem-tray-inner' + (view === 'fmt' ? ' cols8' : ' scroll') + (animate ? ' swap' : '');
    trayInner.innerHTML = trayHtml(view);
    if (animate) setTimeout(function () { trayInner.classList.remove('swap'); }, 220);
    tray.classList.add('open');
    fmtBtn.classList.add('active');
    bindTray();
  }

  function bindTray() {
    trayInner.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
      b.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false });
    });

    trayInner.querySelectorAll('[data-cmd]').forEach(function (b) {
      b.addEventListener('click', function () { ed.exec(b.dataset.cmd); renderTray('fmt', false); });
    });

    trayInner.querySelectorAll('[data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.dataset.act;
        if (act === 'close') { renderTray(null); ed.restoreRange(); return; }
        if (act === 'back') { renderTray('fmt', true); ed.restoreRange(); return; }
        if (act === 'align') { ed.nextAlign(); renderTray('fmt', false); return; }
        renderTray(act, true);
      });
    });

    trayInner.querySelectorAll('[data-size]').forEach(function (b) {
      b.addEventListener('click', function () {
        ed.applyFontSize(parseInt(b.dataset.size, 10));
        renderTray('fmt', true);   /* 적용 → 서식 툴바 복귀 */
      });
    });

    trayInner.querySelectorAll('[data-color]').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = b.dataset.color;
        if (trayView === 'color') ed.applyColor(v); else ed.applyBgColor(v);
        renderTray('fmt', true);
      });
    });
  }

  /* ── 이모티콘 영역 (키보드 대체) ── */
  function openEmoji() {
    if (emojiOpen) { closeEmoji(true); return; }
    emojiOpen = true;
    emojiBtn.classList.add('active');
    ed.saveRange();
    area.blur();                               /* 시스템 키보드 종료 */
    dock.style.transform = 'translateY(0)';
    emojiPanel.classList.add('open');
  }

  function closeEmoji(restoreKeyboard) {
    if (!emojiOpen) return;
    emojiOpen = false;
    emojiBtn.classList.remove('active');
    emojiPanel.classList.remove('open');
    if (restoreKeyboard) {
      ed.restoreRange();                        /* 시스템 키보드 복원 */
    }
  }

  function buildEmojiPanel() {
    var scroll = document.getElementById('bemEmojiScroll');
    scroll.innerHTML = BED.EMOJIS.map(function (src, i) {
      return '<button type="button" class="bem-emoji-cell" data-src="' + src + '"><img src="' + src + '" alt="이모티콘' + (i + 1) + '" loading="lazy"></button>';
    }).join('');
    scroll.querySelectorAll('.bem-emoji-cell').forEach(function (c) {
      c.addEventListener('click', function () { ed.insertEmoji(c.dataset.src); });
    });
  }

  /* 이모티콘이 열린 상태에서 다른 기능 선택 → 이모티콘 종료 + 키보드 복원 + 기능 실행 */
  function withKeyboard(fn) {
    if (emojiOpen) {
      closeEmoji(true);
      setTimeout(fn, 240);
    } else {
      fn();
    }
  }

  /* ── 머리말 ── */
  function initPrefix() {
    var btn = document.getElementById('bemPrefixBtn');
    var menu = document.getElementById('bemPrefixMenu');
    menu.innerHTML = BED.PREFIXES.map(function (p) {
      return '<button type="button" class="bed-prefix-item" data-prefix="' + p + '">' + p + '</button>';
    }).join('');
    btn.addEventListener('click', function (e) { e.stopPropagation(); menu.classList.toggle('open'); });
    document.addEventListener('click', function () { menu.classList.remove('open'); });
    menu.querySelectorAll('.bed-prefix-item').forEach(function (it) {
      it.addEventListener('click', function () {
        curPrefix = it.dataset.prefix;
        document.getElementById('bemPrefixLabel').textContent = curPrefix;
        btn.classList.add('chosen');
        menu.querySelectorAll('.bed-prefix-item').forEach(function (x) { x.classList.toggle('active', x === it); });
        menu.classList.remove('open');
      });
    });
  }

  /* ── 초기화 ── */
  async function init() {
    ICON = BED.ICON;
    initTheme();

    dock = document.getElementById('bemDock');
    tray = document.getElementById('bemTray');
    trayInner = document.getElementById('bemTrayInner');
    emojiPanel = document.getElementById('bemEmojiPanel');
    area = document.getElementById('bemArea');
    fmtBtn = document.getElementById('bemFmt');
    emojiBtn = document.getElementById('bemEmoji');

    area.setAttribute('data-placeholder', BED.PLACEHOLDER);
    ed = BED.createEditor(area);

    /* 메인 툴바 아이콘 */
    document.getElementById('bemMedia').innerHTML = ICON.media;
    fmtBtn.innerHTML = ICON.T;
    emojiBtn.innerHTML = ICON.emoji;
    document.getElementById('bemLink').innerHTML = ICON.link;
    document.getElementById('bemHr').innerHTML = ICON.hr;

    initPrefix();
    buildEmojiPanel();
    initKeyboardTracking();

    /* 메인 툴바 동작 */
    document.querySelectorAll('.bem-tb-btn').forEach(function (b) {
      b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    });

    fmtBtn.addEventListener('click', function () {
      withKeyboard(function () { renderTray(trayView ? null : 'fmt', false); });
    });

    emojiBtn.addEventListener('click', function () {
      renderTray(null);
      openEmoji();
    });

    var file = document.getElementById('bemFile');
    document.getElementById('bemMedia').addEventListener('click', function () {
      withKeyboard(function () { ed.saveRange(); file.click(); });
    });
    file.addEventListener('change', function () {
      if (file.files && file.files[0]) ed.uploadMedia(file.files[0]);
      file.value = '';
    });

    document.getElementById('bemHr').addEventListener('click', function () {
      withKeyboard(function () { ed.insertDivider(); });
    });

    /* 링크 모달 */
    var modal = document.getElementById('bemLinkModal');
    var input = document.getElementById('bemLinkInput');
    document.getElementById('bemLink').addEventListener('click', function () {
      ed.saveRange();
      withKeyboard(function () {
        input.value = '';
        modal.classList.add('open');
        setTimeout(function () { input.focus(); }, 80);
      });
    });
    document.getElementById('bemLinkCancel').addEventListener('click', function () { modal.classList.remove('open'); });
    document.getElementById('bemLinkOk').addEventListener('click', function () {
      modal.classList.remove('open');
      ed.insertLink(input.value);
    });

    /* 상태 → 툴바 반영 */
    ed.onChange(function () {
      if (trayView === 'fmt') {
        var scrollLeft = trayInner.scrollLeft;
        trayInner.innerHTML = trayHtml('fmt');
        trayInner.scrollLeft = scrollLeft;
        bindTray();
      }
    });

    /* 닫기 */
    document.getElementById('bemClose').addEventListener('click', function () {
      history.length > 1 ? history.back() : (location.href = 'detail.html?type=board');
    });

    /* 등록 */
    var submit = document.getElementById('bemSubmit');
    submit.addEventListener('click', async function () {
      var title = document.getElementById('bemTitle').value.trim();
      if (!curPrefix) { BED.toast('머리말을 선택해주세요.'); return; }
      if (!title) { BED.toast('제목을 입력해주세요.'); return; }
      if (ed.isEmpty()) { BED.toast('내용을 입력해주세요.'); return; }
      submit.disabled = true;
      try {
        var id = await BED.savePost({ docId: editingId, prefix: curPrefix, title: title, html: ed.getHTML() });
        location.replace('detail.html?type=board&id=' + encodeURIComponent(id));
      } catch (e) {
        console.error('게시글 저장 실패:', e);
        BED.toast('등록에 실패했습니다. 다시 시도해주세요.');
        submit.disabled = false;
      }
    });

    /* 로그인 확인 + 수정 모드 로드 */
    if (window.authReady) { try { await window.authReady; } catch (e) {} }
    if (typeof currentUser === 'undefined' || !currentUser) {
      BED.toast('로그인이 필요합니다.');
      location.replace('detail.html?type=board');
      return;
    }

    var id = new URLSearchParams(location.search).get('id');
    if (id) {
      editingId = id;
      try {
        var doc = await db.collection('boards').doc(id).get();
        if (doc.exists) {
          var p = doc.data();
          if (p.uid !== currentUser.uid) { location.replace('detail.html?type=board&id=' + id); return; }
          document.getElementById('bemTitle').value = p.title || '';
          ed.setHTML(p.text || '');
          if (p.prefix) {
            curPrefix = p.prefix;
            document.getElementById('bemPrefixLabel').textContent = curPrefix;
            document.getElementById('bemPrefixBtn').classList.add('chosen');
          }
        }
      } catch (e) { console.error('게시글 로드 실패:', e); }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
