/* Language switch that works both on file:// (double-click) and http://.
   Each page injects: window.VL_LANG = { cur: 'en'|'zh', other: '<relative url>' } */
(function () {
  'use strict';

  var KEY = 'vl-lang';
  var cfg = window.VL_LANG;
  if (!cfg || !cfg.other || (cfg.cur !== 'en' && cfg.cur !== 'zh')) return;

  var cur = cfg.cur;
  var other = cfg.other;

  function wantLang() {
    var pref = null;
    try { pref = localStorage.getItem(KEY); } catch (e) { /* file:// may block */ }
    if (pref === 'zh' || pref === 'en') return pref;
    var loc = (navigator.language || navigator.browserLanguage || 'en').toLowerCase();
    return loc.indexOf('zh') === 0 ? 'zh' : 'en';
  }

  // 首次打开：默认语言跟随系统/浏览器；手动选择过则记住选择。
  if (wantLang() !== cur) {
    location.replace(other);
    return;
  }

  var button = document.createElement('button');
  button.type = 'button';
  button.id = 'vl-lang-toggle';
  button.textContent = cur === 'zh' ? 'EN' : '中文';
  button.setAttribute('aria-label', 'Switch language / 切换语言');
  button.style.cssText = [
    'position:fixed', 'right:18px', 'bottom:18px', 'z-index:99999',
    'cursor:pointer', 'font:700 12px ui-monospace,Menlo,Consolas,monospace',
    'letter-spacing:.04em', 'color:#23263a', 'background:#f2c14e',
    'border:1.3px solid #23263a', 'border-radius:999px', 'padding:8px 14px',
    'box-shadow:2px 2px 0 #23263a', 'transition:transform .12s,box-shadow .12s'
  ].join(';');
  button.addEventListener('click', function () {
    try { localStorage.setItem(KEY, cur === 'zh' ? 'en' : 'zh'); } catch (e) { /* ignore */ }
    location.href = other;
  });
  document.body.appendChild(button);
})();
