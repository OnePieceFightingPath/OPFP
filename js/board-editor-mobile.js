/* OPFP 모바일 게시판 글쓰기 에디터 (모바일 전용)
 *
 * PC 에디터(js/board-editor.js 의 pc 렌더/바인딩)는 이 파일에서 전혀 사용하지 않습니다.
 * 저장 포맷은 기존과 동일하게 { prefix, title, text } 를 사용합니다.
 *
 * 상태는 아래 두 축으로만 관리합니다.
 *   inputMode   : 'keyboard' | 'emoji'
 *   toolbarMode : 'main' | 'format' | 'fontSize' | 'textColor' | 'backgroundColor'
 * 두 상태의 조합으로만 화면이 결정되므로 잘못된 상태가 동시에 표시되지 않습니다.
 */
(function () {
  'use strict';

  var SIZES = [11, 13, 15, 16, 19, 24, 28, 30, 34, 38];
  var COLORS = [
    { name: '없음', value: '' },
    { name: '빨강', value: '#ff4d5a' },
    { name: '주황', value: '#ff9f43' },
    { name: '노랑', value: '#ffd166' },
    { name: '연두', value: '#a8e06d' },
    { name: '초록', value: '#35c878' },
    { name: '청록', value: '#20c7bd' },
    { name: '하늘', value: '#6bc7f2' },
    { name: '파랑', value: '#4d9fff' },
    { name: '보라', value: '#a875e8' },
    { name: '핑크', value: '#f478b8' }
  ];
  var EMOJIS = [];
  for (var i = 1; i <= 39; i += 1) EMOJIS.push('img/emoji/emogi' + i + '.png');

  var PLACEHOLDER = '해당 게시판은 PvP 관련 정보를 공유하는 게시판입니다.\n' +
    '• 패치 정보\n• 캐릭터 운용법\n• 콤보\n• 메타\n• PvP 팁 등을 자유롭게 작성해주세요.\n' +
    '욕설 및 비방 게시글은 제재될 수 있습니다.';

  var ICON = {
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.7 5.3 6.3 6.3 6.3-6.3 1.4 1.4-6.3 6.3 6.3 6.3-1.4 1.4-6.3-6.3-6.3 6.3-1.4-1.4 6.3-6.3-6.3-6.3z"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.7 5.3-6.7 6.7 6.7 6.7 1.4-1.4L10.8 12l5.3-5.3z"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5h-3l-1.4-2H8.4L7 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-8 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>',
    smile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM7.4 14h9.2a5 5 0 0 1-9.2 0Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l2.8-2.8a3 3 0 0 1 4.2 4.2l-1.4 1.4-1.4-1.4 1.4-1.4a1 1 0 1 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0Zm2.8-2.8a1 1 0 0 1 0 1.4l-2.8 2.8a3 3 0 0 1-4.2-4.2l1.4-1.4 1.4 1.4-1.4 1.4a1 1 0 1 0 1.4 1.4L12 10.6a1 1 0 0 1 1.4 0Z"/></svg>',
    divider: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16v2H4z"/></svg>',
    alignLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2H3V5Zm0 4h12v2H3V9Zm0 4h18v2H3v-2Zm0 4h12v2H3v-2Z"/></svg>',
    alignCenter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2H3V5Zm3 4h12v2H6V9Zm-3 4h18v2H3v-2Zm3 4h12v2H6v-2Z"/></svg>',
    alignRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2H3V5Zm6 4h12v2H9V9Zm-6 4h18v2H3v-2Zm6 4h12v2H9v-2Z"/></svg>',
    alignFull: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2H3V5Zm0 4h18v2H3V9Zm0 4h18v2H3v-2Zm0 4h18v2H3v-2Z"/></svg>'
  };
  var ALIGN_ICONS = [ICON.alignLeft, ICON.alignCenter, ICON.alignRight, ICON.alignFull];
  var ALIGN_COMMANDS = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function sanitize(html) {
    if (window.OPFPBoardEditor && typeof window.OPFPBoardEditor.sanitize === 'function') {
      return window.OPFPBoardEditor.sanitize(html);
    }
    var div = document.createElement('div');
    div.textContent = html || '';
    return div.innerHTML;
  }

  function toast(message, type) {
    if (typeof showToast === 'function') showToast(message, type || 'error');
  }

  /* ---------------------------------------------------------------- markup */

  function colorCellsHtml(kind) {
    return COLORS.map(function (color) {
      var inner = color.value
        ? '<i style="--swatch:' + color.value + '"></i>'
        : '<i class="opfp-mb-swatch-none"></i>';
      return '<button type="button" class="opfp-mb-cell opfp-mb-swatch" data-' + kind +
        '-option="' + color.value + '" title="' + color.name + '">' + inner + '</button>';
    }).join('');
  }

  function markup() {
    return '' +
      '<header class="opfp-mb-topbar">' +
        '<button type="button" class="opfp-mb-close" data-action="cancel" aria-label="나가기">' + ICON.close + '</button>' +
        '<button type="button" class="opfp-mb-submit" data-action="submit">등록</button>' +
      '</header>' +
      '<div class="opfp-mb-fields">' +
        '<select class="opfp-mb-prefix" data-field="prefix" aria-label="머리말" required>' +
          '<option value="" disabled selected>머리말 선택</option>' +
          '<option value="자유">자유</option>' +
          '<option value="정보">정보</option>' +
          '<option value="질문">질문</option>' +
        '</select>' +
        '<input class="opfp-mb-title" data-field="title" type="text" maxlength="100" placeholder="제목을 입력해주세요." aria-label="제목">' +
      '</div>' +
      '<div class="opfp-mb-content" contenteditable="true" data-editor-content role="textbox" aria-multiline="true" data-placeholder="' + esc(PLACEHOLDER) + '"></div>' +

      '<div class="opfp-mb-dock" data-dock>' +
        '<div class="opfp-mb-formatbar" data-formatbar>' +
          /* ① 서식 툴바 — 8칸 고정 */
          '<div class="opfp-mb-row opfp-mb-row--format" data-row="format">' +
            '<button type="button" class="opfp-mb-cell" data-action="format-close" aria-label="닫기">' + ICON.back + '</button>' +
            '<button type="button" class="opfp-mb-cell" data-action="fontSize" aria-label="글자 크기"><span data-size-label>15</span></button>' +
            '<button type="button" class="opfp-mb-cell" data-action="align" aria-label="정렬" data-align-icon>' + ICON.alignLeft + '</button>' +
            '<button type="button" class="opfp-mb-cell" data-action="bold" aria-label="굵게"><b>B</b></button>' +
            '<button type="button" class="opfp-mb-cell" data-action="underline" aria-label="밑줄"><u>U</u></button>' +
            '<button type="button" class="opfp-mb-cell opfp-mb-colorcell" data-action="textColor" aria-label="글자색">A<i data-color-preview class="is-none"></i></button>' +
            '<button type="button" class="opfp-mb-cell opfp-mb-colorcell" data-action="backgroundColor" aria-label="배경색"><mark>A</mark><i data-bg-preview class="is-none"></i></button>' +
            '<button type="button" class="opfp-mb-cell" data-action="strike" aria-label="취소선"><s>S</s></button>' +
          '</div>' +
          /* ② 글자 크기 선택 — 한 줄 가로 스크롤, 다음 항목이 일부 잘려 보임 */
          '<div class="opfp-mb-row opfp-mb-row--scroll" data-row="fontSize">' +
            '<button type="button" class="opfp-mb-cell opfp-mb-rowback" data-action="format" aria-label="뒤로">' + ICON.back + '</button>' +
            '<div class="opfp-mb-scroller opfp-mb-scroller--size">' +
              SIZES.map(function (size) {
                return '<button type="button" class="opfp-mb-sizecell" data-size-option="' + size + '">' + size + '</button>';
              }).join('') +
            '</div>' +
          '</div>' +
          /* ③ 글자색 — 8칸 정확히 맞추고 나머지는 가로 스크롤 */
          '<div class="opfp-mb-row opfp-mb-row--scroll" data-row="textColor">' +
            '<button type="button" class="opfp-mb-cell opfp-mb-rowback" data-action="format" aria-label="뒤로">' + ICON.back + '</button>' +
            '<div class="opfp-mb-scroller opfp-mb-scroller--color">' + colorCellsHtml('color') + '</div>' +
          '</div>' +
          /* ④ 배경색 */
          '<div class="opfp-mb-row opfp-mb-row--scroll" data-row="backgroundColor">' +
            '<button type="button" class="opfp-mb-cell opfp-mb-rowback" data-action="format" aria-label="뒤로">' + ICON.back + '</button>' +
            '<div class="opfp-mb-scroller opfp-mb-scroller--color">' + colorCellsHtml('bg') + '</div>' +
          '</div>' +
        '</div>' +

        /* 메인 툴바 — 항상 같은 위치 */
        '<div class="opfp-mb-mainbar" data-mainbar>' +
          '<button type="button" class="opfp-mb-cell" data-action="media" aria-label="이미지 / 동영상">' + ICON.image + '</button>' +
          '<button type="button" class="opfp-mb-cell" data-action="format" aria-label="서식"><b>T</b></button>' +
          '<button type="button" class="opfp-mb-cell" data-action="emoji" aria-label="이모티콘">' + ICON.smile + '</button>' +
          '<button type="button" class="opfp-mb-cell" data-action="link" aria-label="링크">' + ICON.link + '</button>' +
          '<button type="button" class="opfp-mb-cell" data-action="divider" aria-label="구분선">' + ICON.divider + '</button>' +
        '</div>' +

        /* 입력 영역: 시스템 키보드 자리 = 이모티콘 영역 (메인 툴바 아래) */
        '<div class="opfp-mb-emoji" data-emoji-area>' +
          '<div class="opfp-mb-emoji-grid">' +
            EMOJIS.map(function (src, index) {
              return '<button type="button" data-emoji="' + src + '"><img src="' + src + '" alt="이모티콘 ' + (index + 1) + '"></button>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<input type="file" data-media-input accept="image/*,video/*" hidden>' +
      '<div class="opfp-mb-modal" data-link-modal aria-hidden="true">' +
        '<div class="opfp-mb-modal-card" role="dialog" aria-label="링크 추가">' +
          '<div class="opfp-mb-modal-title">링크 추가</div>' +
          '<input type="url" data-link-input placeholder="https://example.com" inputmode="url">' +
          '<div class="opfp-mb-modal-actions">' +
            '<button type="button" data-link-cancel>취소</button>' +
            '<button type="button" data-link-apply>적용</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  /* ------------------------------------------------------------ controller */

  function render(target, options) {
    options = options || {};
    var initial = options.initial || {};
    var shell = document.createElement('section');
    shell.className = 'opfp-mb-editor';
    shell.id = options.editorId || 'post-edit-editor';
    shell.innerHTML = markup();
    target.innerHTML = '';
    target.appendChild(shell);

    var area = shell.querySelector('[data-editor-content]');
    shell.querySelector('[data-field="title"]').value = initial.title || '';
    if (initial.prefix) shell.querySelector('[data-field="prefix"]').value = initial.prefix;
    area.innerHTML = sanitize(initial.text || '');

    bind(shell, area, options);
    return shell;
  }

  function bind(shell, area, options) {
    /* ---- 단일 상태 저장소 ---- */
    var state = {
      inputMode: 'keyboard',      // keyboard | emoji
      toolbarMode: 'main',        // main | format | fontSize | textColor | backgroundColor
      size: 15,
      color: '',
      bgcolor: '',
      align: 0,
      sizeLocked: false
    };
    var savedRange = null;
    var linkModal = shell.querySelector('[data-link-modal]');

    /* ---- selection helpers ---- */
    function saveRange() {
      var sel = window.getSelection();
      if (sel && sel.rangeCount && area.contains(sel.anchorNode)) savedRange = sel.getRangeAt(0).cloneRange();
    }
    function restoreRange() {
      area.focus({ preventScroll: true });
      if (!savedRange) return;
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedRange.cloneRange());
    }
    function inEditor() {
      var sel = window.getSelection();
      return !!(sel && sel.rangeCount && area.contains(sel.anchorNode));
    }

    /* ---- 렌더: 상태 -> 화면 (유일한 표시 경로) ---- */
    function apply() {
      var formatOpen = state.toolbarMode !== 'main';
      shell.classList.toggle('is-format-open', formatOpen);
      shell.classList.toggle('is-emoji-open', state.inputMode === 'emoji');
      shell.querySelectorAll('[data-row]').forEach(function (row) {
        row.classList.toggle('is-active', formatOpen && row.dataset.row === state.toolbarMode);
      });
      syncInlineState();
      syncKeyboard();

    }

    function syncInlineState() {
      var active = inEditor();
      [['bold', 'bold'], ['underline', 'underline'], ['strike', 'strikeThrough']].forEach(function (pair) {
        var button = shell.querySelector('[data-action="' + pair[0] + '"]');
        if (!button) return;
        var on = false;
        try { on = active && document.queryCommandState(pair[1]); } catch (e) { on = false; }
        button.classList.toggle('is-on', !!on);
      });
      var sizeLabel = shell.querySelector('[data-size-label]');
      if (sizeLabel) sizeLabel.textContent = state.size;
      var alignButton = shell.querySelector('[data-align-icon]');
      if (alignButton) alignButton.innerHTML = ALIGN_ICONS[state.align];
      setPreview(shell.querySelector('[data-color-preview]'), state.color);
      setPreview(shell.querySelector('[data-bg-preview]'), state.bgcolor);
    }
    function setPreview(el, value) {
      if (!el) return;
      el.style.background = value || 'transparent';
      el.classList.toggle('is-none', !value);
    }

    function readSelectionState() {
      if (!inEditor()) return;
      var sel = window.getSelection();
      var node = sel.anchorNode;
      var element = node && (node.nodeType === 1 ? node : node.parentElement);
      if (!element || !area.contains(element)) return;
      var style = window.getComputedStyle(element);
      var size = parseInt(style.fontSize, 10);
      if (size && !state.sizeLocked) state.size = size;
      var block = element.closest('p,div,li,blockquote,h1,h2,h3,h4,h5,h6') || area;
      var align = window.getComputedStyle(block).textAlign;
      state.align = ({ left: 0, start: 0, center: 1, right: 2, end: 2, justify: 3 })[align] || 0;
    }

    /* ---- 상태 전환 ---- */
    function setToolbarMode(mode) {
      state.toolbarMode = mode;
      apply();
    }
    function setInputMode(mode) {
      if (state.inputMode === mode) return;
      state.inputMode = mode;
      if (mode === 'emoji') {
        saveRange();
        state.toolbarMode = 'main';   // 서식 툴바와 동시 표시 금지
        area.blur();          // 시스템 키보드 종료
        /* 키보드가 닫히므로 Dock 오프셋을 즉시 0 으로 (이모티콘 패널이 화면 밖으로 밀리는 것 방지) */
        shell.style.setProperty('--mb-kb', '0px');
        shell.classList.remove('is-keyboard-open');
      }
      apply();
      if (mode === 'keyboard') restoreRange();   // 시스템 키보드 복원
    }
    /* 이모티콘 상태에서 다른 기능을 누르면: 이모티콘 종료 -> 키보드 복원 -> 기능 실행 */
    function withKeyboard(run) {
      if (state.inputMode === 'emoji') setInputMode('keyboard');
      else restoreRange();
      run();
    }

    /* ---- 편집 명령 ---- */
    function exec(command, value) {
      restoreRange();
      var sel = window.getSelection();
      var collapsed = !sel || !sel.rangeCount || sel.getRangeAt(0).collapsed;
      var keep = !collapsed && savedRange ? savedRange.cloneRange() : null;
      document.execCommand(command, false, value);
      /* 커서만 있는 상태(collapsed)에서는 selection 을 다시 세팅하면
       * 브라우저의 "다음 입력에 적용될 서식(pending state)" 이 사라지므로 그대로 둔다. */
      if (keep) {
        sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(keep);
        savedRange = keep.cloneRange();
      } else saveRange();
      syncInlineState();
    }

    function insertHtml(html) {
      restoreRange();
      document.execCommand('insertHTML', false, html);
      saveRange();
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function setFontSize(size) {
      restoreRange();
      document.execCommand('fontSize', false, '7');
      area.querySelectorAll('font[size="7"]').forEach(function (font) {
        font.removeAttribute('size');
        font.style.fontSize = size + 'px';
      });
      state.size = Number(size);
      state.sizeLocked = true;      // 선택한 크기를 버튼에 유지
      saveRange();
    }
    function setColor(kind, value) {
      restoreRange();
      if (kind === 'textColor') {
        document.execCommand('foreColor', false, value || 'inherit');
        state.color = value;
      } else {
        document.execCommand('hiliteColor', false, value || 'transparent');
        state.bgcolor = value;
      }
      saveRange();
    }

    /* ---- 미디어 업로드 (기존 로직 유지) ---- */
    function upload(file) {
      if (!file || !/^image\/|^video\//.test(file.type)) return;
      var max = file.type.indexOf('video/') === 0 ? 100 : 10;
      if (file.size > max * 1024 * 1024) return toast('파일이 너무 큽니다. (최대 ' + max + 'MB)');
      var id = 'opfp-mb-uploading-' + Date.now();
      insertHtml('<span id="' + id + '" class="opfp-uploading">업로드 중...</span>');
      var form = new FormData();
      form.append('file', file);
      form.append('upload_preset', '게시판미디어');
      form.append('folder', 'fighting-path/board');
      fetch('https://api.cloudinary.com/v1_1/sypoxyqq/auto/upload', { method: 'POST', body: form })
        .then(function (response) { if (!response.ok) throw new Error('upload failed'); return response.json(); })
        .then(function (data) {
          var node = shell.querySelector('#' + id);
          if (!node) return;
          node.outerHTML = file.type.indexOf('video/') === 0
            ? '<video src="' + esc(data.secure_url) + '" controls style="max-width:100%;display:block"></video>'
            : '<img src="' + esc(data.secure_url) + '" alt="첨부 이미지" style="max-width:100%">';
          area.dispatchEvent(new Event('input', { bubbles: true }));
        })
        .catch(function () {
          var node = shell.querySelector('#' + id);
          if (node) node.remove();
          toast('업로드에 실패했습니다. 다시 시도해주세요.');
        });
    }

    /* ---- 링크 ---- */
    function openLinkModal() {
      saveRange();
      linkModal.classList.add('is-open');
      linkModal.setAttribute('aria-hidden', 'false');
      var input = linkModal.querySelector('[data-link-input]');
      input.value = '';
      setTimeout(function () { input.focus(); }, 30);
    }
    function closeLinkModal() {
      linkModal.classList.remove('is-open');
      linkModal.setAttribute('aria-hidden', 'true');
    }

    /* ---- 화면 키보드 추적: 키보드 위에 메인 툴바가 항상 붙어 있도록 ---- */
    var vv = window.visualViewport;
    function syncKeyboard() {
      var kb = 0;
      if (vv && state.inputMode === 'keyboard') {
        kb = Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)));
        if (kb < 80) kb = 0;   // 주소창 축소 등 오차 무시
      }
      shell.style.setProperty('--mb-kb', kb + 'px');
      shell.classList.toggle('is-keyboard-open', kb > 0);
    }
    if (vv) {
      vv.addEventListener('resize', syncKeyboard);
      vv.addEventListener('scroll', syncKeyboard);
    }
    window.addEventListener('orientationchange', function () { setTimeout(syncKeyboard, 300); });

    /* ---- 이벤트 ---- */
    area.addEventListener('input', function () { state.sizeLocked = false; });

    area.addEventListener('mouseup', saveRange);
    area.addEventListener('keyup', saveRange);
    area.addEventListener('touchend', function () { setTimeout(saveRange, 0); });
    area.addEventListener('focus', function () {
      if (state.inputMode === 'emoji') { state.inputMode = 'keyboard'; }
      apply();
      /* 키보드가 실제로 올라오는 타이밍이 기기마다 달라 여러 번 재측정 */
      [60, 180, 350, 600].forEach(function (delay) { setTimeout(syncKeyboard, delay); });
    });
    area.addEventListener('blur', function () {
      setTimeout(syncKeyboard, 60);
    });
    shell.querySelector('[data-field="title"]').addEventListener('focus', function () {
      [60, 180, 350, 600].forEach(function (delay) { setTimeout(syncKeyboard, delay); });
    });

    document.addEventListener('selectionchange', function () {
      if (!inEditor()) return;
      readSelectionState();
      syncInlineState();
    });

    /* 툴바 터치로 본문 포커스가 풀리지 않도록 */
    shell.querySelector('[data-dock]').addEventListener('mousedown', function (event) {
      if (event.target.closest('[data-action], [data-size-option], [data-color-option], [data-bg-option], [data-emoji]')) event.preventDefault();
    });
    /* 서식/이모티콘 버튼은 touchstart 에서 기본동작을 막아 본문 선택(caret)이 풀리지 않게 한다.
     * preventDefault 는 뒤따르는 click 도 취소하므로 여기서 직접 실행하고,
     * 혹시 발생하는 click 은 중복 처리되지 않게 무시한다. */
    var TOUCH_SELECTOR = '[data-action="emoji"], [data-emoji],' +
      '[data-action="bold"], [data-action="underline"], [data-action="strike"],' +
      '[data-action="align"], [data-action="fontSize"], [data-action="textColor"],' +
      '[data-action="backgroundColor"], [data-action="format"], [data-action="format-close"],' +
      '[data-action="divider"], [data-size-option], [data-color-option], [data-bg-option]';
    var touchHandledAt = 0;
    var touchHandledEl = null;
    shell.addEventListener('touchstart', function (event) {
      var hit = event.target.closest(TOUCH_SELECTOR);
      if (!hit || !shell.contains(hit)) return;
      event.preventDefault();
      touchHandledAt = Date.now();
      touchHandledEl = hit;
      handleButton(hit);
    }, { passive: false });

    shell.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action], [data-size-option], [data-color-option], [data-bg-option], [data-emoji]');
      if (!button || !shell.contains(button)) return;
      if (button === touchHandledEl && Date.now() - touchHandledAt < 700) return;
      handleButton(button);
    });


    function handleButton(button) {

      if (button.dataset.sizeOption) {
        setFontSize(button.dataset.sizeOption);
        setToolbarMode('format');
        return;
      }
      if (button.dataset.colorOption !== undefined) {
        setColor('textColor', button.dataset.colorOption);
        setToolbarMode('format');
        return;
      }
      if (button.dataset.bgOption !== undefined) {
        setColor('backgroundColor', button.dataset.bgOption);
        setToolbarMode('format');
        return;
      }
      if (button.dataset.emoji) {
        insertHtml('<img src="' + esc(button.dataset.emoji) + '" alt="이모티콘" class="opfp-editor-emoji">');
        return;
      }

      switch (button.dataset.action) {
        case 'cancel':
          if (typeof options.onCancel === 'function') options.onCancel();
          return;
        case 'submit':
          if (typeof options.onSubmit === 'function') options.onSubmit(api);
          return;
        case 'media':
          return withKeyboard(function () { shell.querySelector('[data-media-input]').click(); });
        case 'format':
          return withKeyboard(function () { setToolbarMode('format'); });
        case 'format-close':
          restoreRange();
          return setToolbarMode('main');
        case 'fontSize':
          saveRange();
          return setToolbarMode('fontSize');
        case 'textColor':
          saveRange();
          return setToolbarMode('textColor');
        case 'backgroundColor':
          saveRange();
          return setToolbarMode('backgroundColor');
        case 'bold':
          return exec('bold');
        case 'underline':
          return exec('underline');
        case 'strike':
          return exec('strikeThrough');
        case 'align':
          state.align = (state.align + 1) % ALIGN_COMMANDS.length;
          exec(ALIGN_COMMANDS[state.align]);
          return syncInlineState();
        case 'divider':
          return withKeyboard(function () { insertHtml('<hr>'); });
        case 'link':
          return withKeyboard(openLinkModal);
        case 'emoji':
          return setInputMode(state.inputMode === 'emoji' ? 'keyboard' : 'emoji');
        default:
          return;
      }
    }

    shell.querySelector('[data-media-input]').addEventListener('change', function (event) {
      upload(event.target.files[0]);
      event.target.value = '';
    });
    linkModal.querySelector('[data-link-cancel]').addEventListener('click', closeLinkModal);
    linkModal.addEventListener('click', function (event) { if (event.target === linkModal) closeLinkModal(); });
    linkModal.querySelector('[data-link-apply]').addEventListener('click', function () {
      var url = linkModal.querySelector('[data-link-input]').value.trim();
      if (!/^https?:\/\//i.test(url)) return toast('http:// 또는 https:// 주소를 입력해주세요.');
      restoreRange();
      var sel = window.getSelection();
      if (sel && sel.toString()) document.execCommand('createLink', false, url);
      else insertHtml('<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>');
      closeLinkModal();
      saveRange();
    });

    var api = {
      element: shell,
      getData: function () {
        return {
          prefix: shell.querySelector('[data-field="prefix"]').value,
          title: shell.querySelector('[data-field="title"]').value.trim(),
          text: sanitize(area.innerHTML.trim()),
          hasContent: !!(area.textContent.trim() || area.querySelector('img,video'))
        };
      },
      focus: function () { area.focus(); },
      close: function () {
        state.inputMode = 'keyboard';
        state.toolbarMode = 'main';
        closeLinkModal();
        apply();
      }
    };

    apply();
    shell._opfpApi = api;
  }

  window.OPFPMobileBoardEditor = { render: render };
}());
