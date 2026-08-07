/* OPFP 게시판 전용 리치 에디터
 * 게시글 저장 포맷은 기존 boards/{id} 문서의 title, prefix, text 필드를 그대로 사용합니다.
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

  var icons = {
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 5h-3l-1.4-2H8.4L7 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-8 12a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-2a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/></svg>',
    video: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h10a2 2 0 0 1 2 2v2l4-2v10l-4-2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm5 3v8l5-4-5-4Z"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l2.8-2.8a3 3 0 0 1 4.2 4.2l-1.4 1.4-1.4-1.4 1.4-1.4a1 1 0 1 0-1.4-1.4L12 13.4a1 1 0 0 1-1.4 0Zm2.8-2.8a1 1 0 0 1 0 1.4l-2.8 2.8a3 3 0 0 1-4.2-4.2l1.4-1.4 1.4 1.4-1.4 1.4a1 1 0 1 0 1.4 1.4L12 10.6a1 1 0 0 1 1.4 0Z"/></svg>',
    alignLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2H3V5Zm0 4h12v2H3V9Zm0 4h18v2H3v-2Zm0 4h12v2H3v-2Z"/></svg>',
    alignCenter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2H3V5Zm3 4h12v2H6V9Zm-3 4h18v2H3v-2Zm3 4h12v2H6v-2Z"/></svg>',
    alignRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2H3V5Zm6 4h12v2H9V9Zm-6 4h18v2H3v-2Zm6 4h12v2H9v-2Z"/></svg>',
    alignFull: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v2H3V5Zm0 4h18v2H3V9Zm0 4h18v2H3v-2Zm0 4h18v2H3v-2Z"/></svg>',
    divider: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16v2H4z"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.7 5.3 6.3 6.3 6.3-6.3 1.4 1.4-6.3 6.3 6.3 6.3-1.4 1.4-6.3-6.3-6.3 6.3-1.4-1.4 6.3-6.3-6.3-6.3z"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.7 5.3-6.7 6.7 6.7 6.7 1.4-1.4L10.8 12l5.3-5.3z"/></svg>',
    smile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-3.5 7a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm7 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM7.4 14h9.2a5 5 0 0 1-9.2 0Z"/></svg>'
  };

  function esc(value) {
    return typeof escHtml === 'function' ? escHtml(value) : String(value || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function sanitize(html) {
    var root = document.createElement('div');
    root.innerHTML = html || '';
    ['script', 'iframe', 'object', 'embed', 'form', 'input', 'meta', 'link', 'base', 'style'].forEach(function (tag) {
      root.querySelectorAll(tag).forEach(function (node) { node.remove(); });
    });
    root.querySelectorAll('*').forEach(function (node) {
      Array.from(node.attributes).forEach(function (attr) {
        var name = attr.name.toLowerCase();
        if (name.indexOf('on') === 0) node.removeAttribute(attr.name);
        if (name === 'style') {
          var allowed = [];
          attr.value.split(';').forEach(function (declaration) {
            var pair = declaration.split(':');
            if (pair.length < 2) return;
            var property = pair.shift().trim().toLowerCase();
            var value = pair.join(':').trim();
            if (['color', 'background-color', 'font-size', 'font-weight', 'font-style', 'text-decoration', 'text-align', 'max-width', 'display', 'margin'].indexOf(property) < 0) return;
            if (/expression|javascript:|url\s*\(/i.test(value)) return;
            allowed.push(property + ':' + value);
          });
          if (allowed.length) node.setAttribute('style', allowed.join(';'));
          else node.removeAttribute('style');
        }
        if ((name === 'href' || name === 'src') && !/^(https?:|mailto:|data:image\/)/i.test(attr.value)) node.removeAttribute(attr.name);
      });
      if (node.tagName === 'A') {
        node.setAttribute('rel', 'noopener noreferrer');
        node.setAttribute('target', '_blank');
      }
    });
    return root.innerHTML;
  }

  function paletteHtml(kind) {
    return '<div class="opfp-palette" data-palette="' + kind + '">' +
      COLORS.map(function (color) {
        if (!color.value) return '<button type="button" class="opfp-color-swatch opfp-color-none" data-color="" title="색상 없음"><span>/</span></button>';
        return '<button type="button" class="opfp-color-swatch" data-color="' + color.value + '" title="' + color.name + '" style="--swatch:' + color.value + '"></button>';
      }).join('') +
      '<label class="opfp-hex-label">HEX<input type="text" maxlength="7" placeholder="#FFFFFF" data-hex-input></label>' +
      '<button type="button" class="opfp-palette-apply" data-apply-color>적용</button></div>';
  }

  function renderToolbar(mode) {
    var pc = [
      '<button type="button" class="opfp-tool" data-action="media" title="이미지 / 동영상">' + icons.image + '</button>',
      '<button type="button" class="opfp-tool opfp-size-button" data-action="size" title="글자 크기"><span data-size-label>15</span><small>px</small></button>',
      '<button type="button" class="opfp-tool" data-action="bold" title="굵게"><b>B</b></button>',
      '<button type="button" class="opfp-tool" data-action="underline" title="밑줄"><u>U</u></button>',
      '<button type="button" class="opfp-tool" data-action="strike" title="취소선"><s>S</s></button>',
      '<button type="button" class="opfp-tool opfp-color-button" data-action="color" title="글자색"><span data-color-preview></span>A</button>',
      '<button type="button" class="opfp-tool opfp-color-button" data-action="bgcolor" title="배경색"><span data-bg-preview></span><mark>A</mark></button>',
      '<button type="button" class="opfp-tool opfp-align-button" data-action="align" title="정렬">' + icons.alignLeft + '</button>',
      '<button type="button" class="opfp-tool" data-action="divider" title="Divider">' + icons.divider + '</button>',
      '<button type="button" class="opfp-tool" data-action="link" title="링크">' + icons.link + '</button>',
      '<button type="button" class="opfp-tool" data-action="emoji" title="이모티콘">' + icons.smile + '</button>'
    ].join('');
    if (mode === 'mobile') return [
      '<div class="opfp-mobile-format" data-format-panel>',
      '<div class="opfp-format-page" data-format-page="format">',
      '<button type="button" class="opfp-tool" data-action="format-back" title="돌아가기">' + icons.back + '</button>',
      '<button type="button" class="opfp-tool opfp-size-button" data-action="size" title="글자 크기"><span data-size-label>15</span></button>',
      '<button type="button" class="opfp-tool opfp-align-button" data-action="align" title="정렬">' + icons.alignLeft + '</button>',
      '<button type="button" class="opfp-tool" data-action="bold" title="굵게"><b>B</b></button>',
      '<button type="button" class="opfp-tool" data-action="underline" title="밑줄"><u>U</u></button>',
      '<button type="button" class="opfp-tool opfp-color-button" data-action="color" title="글자색"><span data-color-preview></span>A</button>',
      '<button type="button" class="opfp-tool opfp-color-button" data-action="bgcolor" title="배경색"><span data-bg-preview></span><mark>A</mark></button>',
      '<button type="button" class="opfp-tool" data-action="strike" title="취소선"><s>S</s></button>',
      '</div><div class="opfp-format-page" data-format-page="sizes"><button type="button" class="opfp-tool opfp-page-back" data-action="format-back">' + icons.back + '</button><div class="opfp-horizontal-options">' +
      SIZES.map(function (size) { return '<button type="button" data-size-option="' + size + '">' + size + '</button>'; }).join('') +
      '</div></div><div class="opfp-format-page" data-format-page="colors"><button type="button" class="opfp-tool opfp-page-back" data-action="format-back">' + icons.back + '</button><div class="opfp-horizontal-options opfp-color-options">' +
      COLORS.map(function (color) { return '<button type="button" data-color-option="' + color.value + '" title="' + color.name + '">' + (color.value ? '<i style="background:' + color.value + '"></i>' : '<i class="opfp-color-none">/</i>') + '</button>'; }).join('') +
      '</div></div></div><div class="opfp-mobile-mainbar">' +
      '<button type="button" class="opfp-tool" data-action="media" title="이미지 / 동영상">' + icons.image + '</button>' +
      '<button type="button" class="opfp-tool" data-action="format" title="서식"><b>T</b></button>' +
      '<button type="button" class="opfp-tool" data-action="emoji" title="이모티콘">' + icons.smile + '</button>' +
      '<button type="button" class="opfp-tool" data-action="link" title="링크">' + icons.link + '</button>' +
      '<button type="button" class="opfp-tool" data-action="divider" title="Divider">' + icons.divider + '</button></div>'
    ].join('');
    return '<div class="opfp-toolbar">' + pc + '</div><div class="opfp-size-popover" data-size-popover>' +
      SIZES.map(function (size) { return '<button type="button" data-size-option="' + size + '">' + size + '</button>'; }).join('') +
      '</div><div class="opfp-align-popover" data-align-popover>' +
      ['좌측', '가운데', '우측', '양끝'].map(function (label, index) {
        return '<button type="button" data-align-option="' + index + '">' + [icons.alignLeft, icons.alignCenter, icons.alignRight, icons.alignFull][index] + '<span>' + label + '</span></button>';
      }).join('') +
      '</div>' + paletteHtml('color') + paletteHtml('bgcolor');
  }

  function render(target, options) {
    options = options || {};
    var mode = options.mode === 'mobile' ? 'mobile' : 'pc';
    var id = options.editorId || 'board-editor';
    var initial = options.initial || {};
    var placeholder = '해당 게시판은 PvP 관련 정보를 공유하는 게시판입니다.\\n• 패치 정보\\n• 캐릭터 운용법\\n• 콤보\\n• 메타\\n• PvP 팁 등을 자유롭게 작성해주세요.\\n욕설 및 비방 게시글은 제재될 수 있습니다.';
    var shell = document.createElement('section');
    shell.className = 'opfp-board-editor opfp-board-editor--' + mode;
    shell.id = id;
    shell.innerHTML = '<div class="opfp-editor-topbar"><button type="button" class="opfp-editor-cancel" data-action="cancel" aria-label="나가기">' + (mode === 'mobile' ? icons.close : icons.back) + '<span>' + (mode === 'mobile' ? '' : '게시판 글쓰기') + '</span></button><strong>' + (mode === 'mobile' ? '게시판 글쓰기' : '') + '</strong><button type="button" class="opfp-editor-submit" data-action="submit">등록</button></div>' +
      (mode === 'pc' ? '<div class="opfp-editor-heading">게시판 글쓰기</div>' : '') +
      '<div class="opfp-editor-fields"><select data-field="prefix" aria-label="머리말"><option value="">자유</option><option value="정보">정보</option><option value="질문">질문</option></select><input data-field="title" type="text" maxlength="100" placeholder="제목을 입력해주세요." aria-label="제목"></div>' +
      '<div class="opfp-editor-body"><div class="opfp-editor-toolbar-wrap">' + renderToolbar(mode) + '</div><div class="opfp-editor-content" contenteditable="true" data-editor-content data-placeholder="' + esc(placeholder) + '" role="textbox" aria-multiline="true"></div></div>' +
      '<input type="file" data-media-input accept="image/*,video/*" hidden><div class="opfp-emoji-panel" data-emoji-panel><div class="opfp-emoji-grid">' + EMOJIS.map(function (src, index) { return '<button type="button" data-emoji="' + src + '"><img src="' + src + '" alt="이모티콘 ' + (index + 1) + '"></button>'; }).join('') + '</div></div>' +
      '<div class="opfp-link-modal" data-link-modal aria-hidden="true"><div class="opfp-link-card" role="dialog" aria-label="링크 추가"><div class="opfp-link-title">링크 추가</div><input type="url" data-link-input placeholder="https://example.com"><div class="opfp-link-actions"><button type="button" data-link-cancel>취소</button><button type="button" data-link-apply>생성</button></div></div></div>';
    target.innerHTML = '';
    target.appendChild(shell);
    shell.querySelector('[data-field="prefix"]').value = initial.prefix || '';
    shell.querySelector('[data-field="title"]').value = initial.title || '';
    shell.querySelector('[data-editor-content]').innerHTML = sanitize(initial.text || '');
    bind(shell, options);
    return shell;
  }

  function bind(shell, options) {
    var mode = shell.classList.contains('opfp-board-editor--mobile') ? 'mobile' : 'pc';
    var area = shell.querySelector('[data-editor-content]');
    var range = null;
    var state = { size: 15, color: '', bgcolor: '', align: 0 };
    var alignCommands = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'];
    var alignIcons = [icons.alignLeft, icons.alignCenter, icons.alignRight, icons.alignFull];

    function inEditor() {
      var selection = window.getSelection();
      return selection && selection.rangeCount && area.contains(selection.anchorNode);
    }
    function saveRange() {
      var selection = window.getSelection();
      if (selection && selection.rangeCount && area.contains(selection.anchorNode)) range = selection.getRangeAt(0).cloneRange();
    }
    function restoreRange() {
      area.focus();
      if (!range) return;
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    function updateState() {
      shell.querySelectorAll('[data-action="bold"],[data-action="underline"],[data-action="strike"]').forEach(function (button) {
        var cmd = button.dataset.action === 'bold' ? 'bold' : button.dataset.action === 'underline' ? 'underline' : 'strikeThrough';
        button.classList.toggle('active', inEditor() && document.queryCommandState(cmd));
      });
      shell.querySelectorAll('[data-size-label]').forEach(function (el) { el.textContent = state.size; });
      shell.querySelectorAll('[data-color-preview]').forEach(function (el) { el.style.background = state.color || 'transparent'; el.classList.toggle('is-none', !state.color); });
      shell.querySelectorAll('[data-bg-preview]').forEach(function (el) { el.style.background = state.bgcolor || 'transparent'; el.classList.toggle('is-none', !state.bgcolor); });
      shell.querySelectorAll('[data-action="align"]').forEach(function (button) { button.innerHTML = alignIcons[state.align]; });
    }
    function exec(command, value) {
      restoreRange();
      document.execCommand(command, false, value);
      saveRange();
      updateState();
    }
    function setFontSize(size) {
      restoreRange();
      document.execCommand('fontSize', false, '7');
      area.querySelectorAll('font[size="7"]').forEach(function (font) {
        font.removeAttribute('size');
        font.style.fontSize = size + 'px';
      });
      state.size = Number(size);
      saveRange();
      updateState();
    }
    function setColor(kind, value) {
      restoreRange();
      if (kind === 'color') {
        document.execCommand('foreColor', false, value || 'inherit');
        state.color = value;
      } else {
        document.execCommand('hiliteColor', false, value || 'transparent');
        state.bgcolor = value;
      }
      saveRange();
      updateState();
    }
    function openPanel(name) {
      shell.querySelectorAll('[data-palette]').forEach(function (panel) { panel.classList.toggle('open', panel.dataset.palette === name); });
    }
    function closePanels() {
      shell.querySelectorAll('[data-palette]').forEach(function (panel) { panel.classList.remove('open'); });
      shell.querySelector('[data-emoji-panel]').classList.remove('open');
      shell.querySelector('[data-link-modal]').classList.remove('open');
      shell.querySelector('[data-link-modal]').setAttribute('aria-hidden', 'true');
    }
    function showFormatPage(page) {
      if (mode !== 'mobile') return;
      shell.querySelectorAll('[data-format-page]').forEach(function (el) { el.classList.toggle('is-visible', el.dataset.formatPage === page); });
      shell.querySelector('[data-format-panel]').classList.add('open');
    }
    function insertHtml(html) {
      restoreRange();
      document.execCommand('insertHTML', false, html);
      saveRange();
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function openLink() {
      saveRange();
      var modal = shell.querySelector('[data-link-modal]');
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      modal.querySelector('[data-link-input]').focus();
    }
    function upload(file) {
      if (!file || !/^image\/|^video\//.test(file.type)) return;
      var max = file.type.indexOf('video/') === 0 ? 100 : 10;
      if (file.size > max * 1024 * 1024) {
        if (typeof showToast === 'function') showToast('파일이 너무 큽니다. (최대 ' + max + 'MB)', 'error');
        return;
      }
      var placeholderId = 'opfp-uploading-' + Date.now();
      insertHtml('<span id="' + placeholderId + '" class="opfp-uploading">업로드 중...</span>');
      var form = new FormData();
      form.append('file', file);
      form.append('upload_preset', '게시판미디어');
      form.append('folder', 'fighting-path/board');
      fetch('https://api.cloudinary.com/v1_1/sypoxyqq/auto/upload', { method: 'POST', body: form })
        .then(function (response) {
          if (!response.ok) throw new Error('upload failed');
          return response.json();
        })
        .then(function (data) {
          var placeholder = shell.querySelector('#' + placeholderId);
          if (!placeholder) return;
          var media = file.type.indexOf('video/') === 0
            ? '<video src="' + esc(data.secure_url) + '" controls style="max-width:100%;display:block"></video>'
            : '<img src="' + esc(data.secure_url) + '" alt="첨부 이미지" style="max-width:100%">';
          placeholder.outerHTML = media;
          area.dispatchEvent(new Event('input', { bubbles: true }));
        })
        .catch(function () {
          var placeholder = shell.querySelector('#' + placeholderId);
          if (placeholder) placeholder.remove();
          if (typeof showToast === 'function') showToast('업로드에 실패했습니다. 다시 시도해주세요.', 'error');
        });
    }
    function submit() {
      if (typeof options.onSubmit === 'function') options.onSubmit(api);
    }
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
      close: function () { closePanels(); }
    };

    area.addEventListener('mouseup', saveRange);
    area.addEventListener('keyup', saveRange);
    area.addEventListener('focus', function () { saveRange(); closePanels(); });
    document.addEventListener('selectionchange', updateState);
    shell.addEventListener('mousedown', function (event) {
      var tool = event.target.closest('[data-action], [data-size-option], [data-color-option], [data-align-option], [data-emoji]');
      if (tool && shell.contains(tool) && tool.dataset.action !== 'submit' && tool.dataset.action !== 'cancel') event.preventDefault();
    });
    shell.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action], [data-size-option], [data-color-option], [data-align-option], [data-emoji]');
      if (!button || !shell.contains(button)) return;
      var action = button.dataset.action;
      if (button.dataset.sizeOption) {
        setFontSize(button.dataset.sizeOption);
        if (mode === 'mobile') showFormatPage('format');
        else shell.querySelector('[data-size-popover]').classList.remove('open');
        return;
      }
      if (button.dataset.colorOption !== undefined) {
        setColor(shell.dataset.mobileColorKind === 'bgcolor' ? 'bgcolor' : 'color', button.dataset.colorOption);
        if (mode === 'mobile') showFormatPage('format');
        return;
      }
      if (button.dataset.alignOption !== undefined) {
        state.align = Number(button.dataset.alignOption);
        exec(alignCommands[state.align]);
        shell.querySelector('[data-align-popover]').classList.remove('open');
        return;
      }
      if (button.dataset.emoji) {
        saveRange();
        insertHtml('<img src="' + esc(button.dataset.emoji) + '" alt="이모티콘" class="opfp-editor-emoji">');
        return;
      }
      if (action === 'submit') return submit();
      if (action === 'cancel') return typeof options.onCancel === 'function' ? options.onCancel() : null;
      if (action === 'media') {
        saveRange();
        shell.querySelector('[data-emoji-panel]').classList.remove('open');
        if (mode === 'mobile') area.blur();
        return shell.querySelector('[data-media-input]').click();
      }
      if (action === 'format') {
        saveRange();
        shell.querySelector('[data-emoji-panel]').classList.remove('open');
        if (mode === 'mobile') area.focus();
        return showFormatPage('format');
      }
      if (action === 'format-back') {
        shell.querySelector('[data-format-panel]').classList.remove('open');
        return;
      }
      if (action === 'size') { saveRange(); return mode === 'mobile' ? showFormatPage('sizes') : shell.querySelector('[data-size-popover]')?.classList.toggle('open'); }
      if (action === 'bold') return exec('bold');
      if (action === 'underline') return exec('underline');
      if (action === 'strike') return exec('strikeThrough');
      if (action === 'divider') return insertHtml('<hr>');
      if (action === 'link') {
        shell.querySelector('[data-emoji-panel]').classList.remove('open');
        if (mode === 'mobile') area.blur();
        return openLink();
      }
      if (action === 'emoji') {
        saveRange();
        if (mode === 'mobile') area.blur();
        shell.querySelector('[data-emoji-panel]').classList.toggle('open');
        if (mode === 'mobile') shell.querySelector('[data-format-panel]').classList.remove('open');
        return;
      }
      if (action === 'color' || action === 'bgcolor') {
        saveRange();
        if (mode === 'mobile') {
          shell.dataset.mobileColorKind = action;
          return showFormatPage('colors');
        }
        openPanel(action);
        shell.querySelector('[data-palette="' + action + '"]').dataset.colorKind = action;
        return;
      }
      if (action === 'align') {
        if (mode === 'pc') {
          saveRange();
          shell.querySelector('[data-align-popover]').classList.toggle('open');
          return;
        }
        state.align = (state.align + 1) % alignCommands.length;
        return exec(alignCommands[state.align]);
      }
    });
    shell.querySelector('[data-media-input]').addEventListener('change', function (event) {
      upload(event.target.files[0]);
      event.target.value = '';
    });
    shell.querySelectorAll('[data-palette]').forEach(function (panel) {
      panel.addEventListener('click', function (event) {
        var swatch = event.target.closest('[data-color]');
        if (swatch) {
          setColor(panel.dataset.palette === 'color' ? 'color' : 'bgcolor', swatch.dataset.color);
          panel.querySelector('[data-hex-input]').value = swatch.dataset.color || '';
        }
        if (event.target.closest('[data-apply-color]')) {
          var hex = panel.querySelector('[data-hex-input]').value.trim();
          if (hex === '' || /^#[0-9a-f]{6}$/i.test(hex)) setColor(panel.dataset.palette === 'color' ? 'color' : 'bgcolor', hex);
          panel.classList.remove('open');
        }
      });
    });
    shell.querySelector('[data-link-cancel]').addEventListener('click', closePanels);
    shell.querySelector('[data-link-apply]').addEventListener('click', function () {
      var url = shell.querySelector('[data-link-input]').value.trim();
      if (!/^https?:\/\//i.test(url)) {
        if (typeof showToast === 'function') showToast('http:// 또는 https:// 주소를 입력해주세요.', 'error');
        return;
      }
      restoreRange();
      var selection = window.getSelection();
      if (selection && selection.toString()) document.execCommand('createLink', false, url);
      else insertHtml('<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(url) + '</a>');
      closePanels();
    });
    updateState();
    shell._opfpApi = api;
  }

  window.OPFPBoardEditor = {
    render: render,
    sanitize: sanitize,
    get: function (id) {
      var el = document.getElementById(id);
      return el && el._opfpApi;
    }
  };
}());