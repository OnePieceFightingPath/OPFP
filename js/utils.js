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
  // 저장 시 한 번 이상 이스케이프된 데이터도 먼저 원래 태그로 정규화합니다.
  // (예: <br>, &lt;br&gt;, &amp;lt;br&amp;gt;)
  let normalized = String(s || '');
  for (let i = 0; i < 3; i++) {
    normalized = normalized.replace(
      /&(?:amp;)*lt;br\s*\/?&(?:amp;)*gt;/gi,
      '<br>'
    );
  }
  return escHtml(normalized)
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}
