/* Allowlist sanitizer for user-authored rich text. */
(function (root) {
  'use strict';

  var allowedTags = Object.create(null);
  var dropContentTags = Object.create(null);
  var allowed = 'a b blockquote br code del div em h1 h2 h3 h4 h5 h6 hr i img li ol p pre s span strong sub sup u ul table thead tbody tfoot tr th td';
  var dropped = 'script style svg math iframe object embed template noscript noembed noframes frame frameset form input button textarea select option video audio source track applet';

  allowed.split(' ').forEach(function (tag) { allowedTags[tag] = true; });
  dropped.split(' ').forEach(function (tag) { dropContentTags[tag] = true; });

  function escapeText(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function safeUrl(value, isImage) {
    if (!value) return '';
    var candidate = String(value).trim();
    if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate)) return '';

    var parsed;
    try { parsed = new root.URL(candidate, root.document.baseURI); }
    catch (e) { return ''; }

    var protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') return candidate;
    if (!isImage && protocol === 'mailto:') return candidate;
    return '';
  }

  function appendSafeChildren(source, target) {
    for (var child = source.firstChild; child; child = child.nextSibling) {
      target.appendChild(copySafeNode(child));
    }
  }

  function copySafeNode(node) {
    if (node.nodeType === 3) return root.document.createTextNode(node.nodeValue);
    if (node.nodeType !== 1) return root.document.createDocumentFragment();

    var tag = node.tagName.toLowerCase();
    if (dropContentTags[tag]) return root.document.createDocumentFragment();

    if (!allowedTags[tag]) {
      var unwrapped = root.document.createDocumentFragment();
      appendSafeChildren(node, unwrapped);
      return unwrapped;
    }

    var clean = root.document.createElement(tag);
    if (tag === 'a') {
      var href = safeUrl(node.getAttribute('href'), false);
      if (href) clean.setAttribute('href', href);
      var title = node.getAttribute('title');
      if (title) clean.setAttribute('title', title);
      if (node.getAttribute('target') === '_blank') {
        clean.setAttribute('target', '_blank');
        clean.setAttribute('rel', 'noopener noreferrer');
      }
    } else if (tag === 'img') {
      var src = safeUrl(node.getAttribute('src'), true);
      if (!src) return root.document.createDocumentFragment();
      clean.setAttribute('src', src);
      clean.setAttribute('alt', node.getAttribute('alt') || '');
      clean.setAttribute('loading', 'lazy');
    }

    if (tag !== 'img' && tag !== 'br' && tag !== 'hr') appendSafeChildren(node, clean);
    return clean;
  }

  function sanitize(value) {
    var text = String(value == null ? '' : value);
    try {
      var template = root.document.createElement('template');
      template.innerHTML = text;
      var output = root.document.createElement('div');
      appendSafeChildren(template.content, output);
      return output.innerHTML;
    } catch (e) {
      return escapeText(text);
    }
  }

  root.FPPContentSanitizer = { sanitize: sanitize };
})(window);
