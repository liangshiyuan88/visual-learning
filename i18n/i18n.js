/* Visual Learning — bilingual runtime (English / Simplified Chinese) */
(function () {
  'use strict';

  var DICT = window.VL_I18N_DICT || {};
  var KEY = 'vl-lang';
  var lang = detectLang();
  var originals = new WeakMap();
  var expected = new WeakMap();
  var attrOriginals = new WeakMap();
  var toggle;
  var originalTitle = document.title;
  var metaDesc = document.querySelector('meta[name="description"]');
  var originalDesc = metaDesc ? metaDesc.getAttribute('content') : null;

  function detectLang() {
    try {
      var params = new URLSearchParams(location.search);
      var fromUrl = params.get('lang');
      if (fromUrl === 'zh' || fromUrl === 'en') {
        if (params.get('save') === '1') localStorage.setItem(KEY, fromUrl);
        return fromUrl;
      }
      var saved = localStorage.getItem(KEY);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) { /* storage blocked */ }
    var locale = (navigator.language || navigator.userLanguage || navigator.browserLanguage || 'en').toLowerCase();
    return locale.indexOf('zh') === 0 ? 'zh' : 'en';
  }

  function lookup(text) {
    if (typeof text !== 'string' || !text.trim()) return text;
    var trimmed = text.trim();
    var hit = DICT[trimmed];
    if (!hit) return text;
    var lead = text.slice(0, text.indexOf(trimmed));
    var trail = text.slice(text.indexOf(trimmed) + trimmed.length);
    return lead + hit + trail;
  }

  var keyCache = null;
  function dictionaryKeys() {
    if (!keyCache) {
      keyCache = Object.keys(DICT).filter(function (k) { return k.length > 2; })
        .sort(function (a, b) { return b.length - a.length; });
    }
    return keyCache;
  }

  function translateString(value) {
    if (typeof value !== 'string' || !value.trim() || lang !== 'zh') return value;
    var exact = DICT[value.trim()];
    if (exact) {
      var lead = value.slice(0, value.indexOf(value.trim()));
      var trail = value.slice(value.indexOf(value.trim()) + value.trim().length);
      return lead + exact + trail;
    }
    var result = value;
    var keys = dictionaryKeys();
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (result.indexOf(k) !== -1) result = result.split(k).join(DICT[k]);
    }
    return result;
  }

  function isSkippable(node) {
    var el = node.parentElement;
    if (!el) return false;
    if (el.closest('script, style, noscript, textarea')) return true;
    if (el.closest('#vl-lang-toggle')) return true;
    return false;
  }

  function translateTextNode(node, force) {
    if (isSkippable(node)) return;
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    var orig = originals.get(node);
    if (typeof orig !== 'string') return;
    if (!force && expected.get(node) === node.nodeValue && node.nodeValue !== orig) return;
    var out = lang === 'zh' ? lookup(orig) : orig;
    expected.set(node, out);
    if (node.nodeValue !== out) node.nodeValue = out;
  }

  function allTextNodes(root) {
    var list = [];
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) list.push(node);
    return list;
  }

  function translateAttrs() {
    var names = ['title', 'aria-label', 'placeholder', 'alt'];
    var elements = document.querySelectorAll('[title],[aria-label],[placeholder],[alt]');
    for (var i = 0; i < elements.length; i++) {
      var el = elements[i];
      if (el.closest && el.closest('#vl-lang-toggle')) continue;
      var saved = attrOriginals.get(el);
      if (!saved) { saved = {}; attrOriginals.set(el, saved); }
      for (var j = 0; j < names.length; j++) {
        var name = names[j];
        var value = el.getAttribute(name);
        if (value == null) continue;
        if (!(name in saved)) saved[name] = value;
        var out = lang === 'zh' ? lookup(saved[name]) : saved[name];
        if (value !== out) el.setAttribute(name, out);
      }
    }
  }

  function translateHeadings() {
    document.title = lang === 'zh' ? lookup(originalTitle) : originalTitle;
    if (metaDesc) metaDesc.setAttribute('content', lang === 'zh' ? lookup(originalDesc) : originalDesc);
  }

  function apply() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    allTextNodes(document.body).forEach(function (node) { translateTextNode(node, true); });
    translateAttrs();
    translateHeadings();
    if (toggle) toggle.textContent = lang === 'zh' ? 'EN' : '中文';
  }

  function patchCanvas() {
    if (typeof CanvasRenderingContext2D === 'undefined') return;
    ['fillText', 'strokeText'].forEach(function (method) {
      var original = CanvasRenderingContext2D.prototype[method];
      if (!original || original.__vlPatched) return;
      var patched = function (text) {
        var args = Array.prototype.slice.call(arguments);
        args[0] = translateString(String(text));
        return original.apply(this, args);
      };
      patched.__vlPatched = true;
      CanvasRenderingContext2D.prototype[method] = patched;
    });
  }

  function patchSetter(proto, name) {
    var desc = Object.getOwnPropertyDescriptor(proto, name);
    if (!desc || !desc.set || desc.set.__vlPatched) return;
    var setter = desc.set;
    var patched = function (value) {
      var raw = typeof value === 'string' ? value : String(value);
      var out = translateString(raw);
      setter.call(this, out);
      if (out !== raw) {
        if (this.nodeType === Node.TEXT_NODE) {
          originals.set(this, raw);
          expected.set(this, out);
        } else if (this.childNodes.length === 1 && this.firstChild.nodeType === Node.TEXT_NODE) {
          originals.set(this.firstChild, raw);
          expected.set(this.firstChild, out);
        }
      }
    };
    patched.__vlPatched = true;
    Object.defineProperty(proto, name, {
      configurable: true,
      enumerable: desc.enumerable,
      get: desc.get,
      set: patched,
    });
  }

  function patchDynamicText() {
    patchSetter(Node.prototype, 'textContent');
    patchSetter(Node.prototype, 'nodeValue');
    if (typeof CharacterData !== 'undefined') patchSetter(CharacterData.prototype, 'data');
  }

  function observeChanges() {
    var observer = new MutationObserver(function (records) {
      records.forEach(function (rec) {
        if (rec.type === 'characterData') {
          var node = rec.target;
          if (expected.get(node) === node.nodeValue) return;
          translateTextNode(node);
        } else if (rec.type === 'childList') {
          Array.prototype.forEach.call(rec.addedNodes, function (added) {
            if (added.nodeType === Node.TEXT_NODE) translateTextNode(added);
            else if (added.nodeType === Node.ELEMENT_NODE) allTextNodes(added).forEach(function (n) { translateTextNode(n); });
          });
        }
      });
    });
    observer.observe(document.documentElement, { childList: true, characterData: true, subtree: true });
  }

  function makeToggle() {
    toggle = document.createElement('button');
    toggle.id = 'vl-lang-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Switch language / 切换语言');
    toggle.style.cssText = [
      'position:fixed', 'right:18px', 'bottom:18px', 'z-index:99999',
      'cursor:pointer', 'font:700 12px ui-monospace,Menlo,Consolas,monospace',
      'letter-spacing:.04em', 'color:#23263a', 'background:#f2c14e',
      'border:1.3px solid #23263a', 'border-radius:999px', 'padding:8px 14px',
      'box-shadow:2px 2px 0 #23263a', 'transition:transform .12s,box-shadow .12s'
    ].join(';');
    toggle.addEventListener('mouseenter', function () {
      toggle.style.transform = 'translate(-1px,-1px)';
      toggle.style.boxShadow = '3px 3px 0 #23263a';
    });
    toggle.addEventListener('mouseleave', function () {
      toggle.style.transform = '';
      toggle.style.boxShadow = '2px 2px 0 #23263a';
    });
    toggle.addEventListener('click', function () {
      lang = lang === 'zh' ? 'en' : 'zh';
      try { localStorage.setItem(KEY, lang); } catch (e) { /* ignore */ }
      apply();
    });
    document.body.appendChild(toggle);
  }

  function init() {
    patchCanvas();
    patchDynamicText();
    makeToggle();
    apply();
    observeChanges();
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
