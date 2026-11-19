/* Source-level language switch: / (English) <-> /zh/ (Chinese) */
(function () {
  'use strict';

  var KEY = 'vl-lang';
  var path = location.pathname;
  var isZh = path === '/zh' || path.indexOf('/zh/') === 0;

  function otherPath(wantZh) {
    var suffix = location.search + location.hash;
    if (wantZh) {
      if (isZh) return null;
      return '/zh' + (path === '/' ? '/' : path) + suffix;
    }
    if (!isZh) return null;
    var bare = path.replace(/^\/zh(?=\/|$)/, '');
    return (bare || '/') + suffix;
  }

  function preference() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  var pref = preference();
  var locale = (navigator.language || navigator.browserLanguage || 'en').toLowerCase();
  var wantZh = pref ? pref === 'zh' : locale.indexOf('zh') === 0;

  if (wantZh !== isZh) {
    var target = otherPath(wantZh);
    if (target) {
      location.replace(target);
      return;
    }
  }

  var button = document.createElement('button');
  button.type = 'button';
  button.id = 'vl-lang-toggle';
  button.textContent = isZh ? 'EN' : '中文';
  button.setAttribute('aria-label', 'Switch language / 切换语言');
  button.style.cssText = [
    'position:fixed', 'right:18px', 'bottom:18px', 'z-index:99999',
    'cursor:pointer', 'font:700 12px ui-monospace,Menlo,Consolas,monospace',
    'letter-spacing:.04em', 'color:#23263a', 'background:#f2c14e',
    'border:1.3px solid #23263a', 'border-radius:999px', 'padding:8px 14px',
    'box-shadow:2px 2px 0 #23263a', 'transition:transform .12s,box-shadow .12s'
  ].join(';');
  button.addEventListener('click', function () {
    try { localStorage.setItem(KEY, isZh ? 'en' : 'zh'); } catch (e) { /* ignore */ }
    var target = otherPath(!isZh);
    if (target) location.href = target;
  });
  document.body.appendChild(button);
})();
