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
 * escHtml 후 <br> / <br/> 태그만 복원 — 텍스트 줄바꿈 허용용
 */
function escHtmlBr(s) {
  return escHtml(s).replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}
