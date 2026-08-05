// ===== 공통 유틸리티 =====

/**
 * HTML 특수문자 이스케이프 — XSS 방어용
 * index.html, detail.html 에서 모든 JS 파일보다 먼저 로드됩니다.
 */
function escHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * <br> / <br/> 태그만 줄바꿈으로 허용하고 나머지 HTML은 이스케이프합니다.
 * 기존 데이터에 저장된 &lt;br&gt; 형식도 함께 지원합니다.
 */
function escHtmlBr(s) {
  const brPlaceholder = '\uE000BR\uE000';
  const normalized = String(s || '').replace(
    /(?:<br\s*\/?>|(?:&amp;)*&lt;br\s*\/?(?:&gt;|&amp;gt;))/gi,
    brPlaceholder
  );
  return escHtml(normalized).replace(new RegExp(brPlaceholder, 'g'), '<br>');
}
