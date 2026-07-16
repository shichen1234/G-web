(function () {
  'use strict';

  const LOCALES = ['zh_CN', 'en'];
  const STORAGE_KEY = 'gweb_locale';
  const LIST_SEPARATOR = '|||';
  const ATTRS = ['title', 'placeholder', 'alt', 'aria-label', 'value'];
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);

  function runtimeUrl(path) {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      return chrome.runtime.getURL(path);
    }
    return path;
  }

  function loadJson(path) {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', runtimeUrl(path), false);
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) return JSON.parse(xhr.responseText);
    } catch (_) {}
    return {};
  }

  function preferredLocale() {
    const navLang = (navigator.language || '').toLowerCase();
    return navLang.startsWith('en') ? 'en' : 'zh_CN';
  }

  const locale = preferredLocale();
  document.documentElement.classList.add('lang-' + locale);
  const zhMessages = loadJson('_locales/zh_CN/messages.json');
  const activeMessages = loadJson(`_locales/${locale}/messages.json`);

  function rawMessage(messages, key) {
    const entry = messages && messages[key];
    return entry && typeof entry.message === 'string' ? entry.message : '';
  }

  function format(text, params) {
    if (!params) return text;
    return String(text).replace(/\{(\w+)\}/g, (_, name) => (
      params[name] !== undefined ? String(params[name]) : `{${name}}`
    ));
  }

  function splitList(text) {
    return String(text || '').split(LIST_SEPARATOR).filter(Boolean);
  }

  function t(key, fallback, params) {
    const message = rawMessage(activeMessages, key) || rawMessage(zhMessages, key) || fallback || key;
    return format(message, params);
  }

  function list(key, fallback) {
    const message = rawMessage(activeMessages, key) || rawMessage(zhMessages, key);
    if (message) return splitList(message);
    return Array.isArray(fallback) ? fallback.slice() : [];
  }

  const exactMap = new Map();
  const phraseMap = [];

  Object.keys(zhMessages || {}).forEach(key => {
    const zh = rawMessage(zhMessages, key);
    const active = rawMessage(activeMessages, key);
    if (!zh || !active || zh === active) return;

    const zhParts = splitList(zh);
    const activeParts = splitList(active);
    const pairs = zhParts.length > 1 && zhParts.length === activeParts.length
      ? zhParts.map((source, i) => [source, activeParts[i]])
      : [[zh, active]];

    pairs.forEach(([source, target]) => {
      if (!source || !target || source === target) return;
      exactMap.set(source.trim(), target);
      if (source.trim().length >= 2) phraseMap.push([source.trim(), target]);
    });
  });

  phraseMap.sort((a, b) => b[0].length - a[0].length);

  function translateText(value) {
    if (locale === 'zh_CN' || typeof value !== 'string' || !/[\u4e00-\u9fff]/.test(value)) return value;
    const leading = value.match(/^\s*/)[0];
    const trailing = value.match(/\s*$/)[0];
    const core = value.trim();
    if (exactMap.has(core)) return `${leading}${exactMap.get(core)}${trailing}`;

    let translated = value;
    phraseMap.forEach(([source, target]) => {
      if (translated.includes(source)) translated = translated.split(source).join(target);
    });
    return translated;
  }

  function applyDataAttrs(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n, el.textContent); });
    root.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml, el.innerHTML); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder, el.placeholder); });
    root.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle, el.title); });
    root.querySelectorAll('[data-i18n-alt]').forEach(el => { el.alt = t(el.dataset.i18nAlt, el.alt); });
    root.querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel, el.getAttribute('aria-label'))); });
  }

  function translateAttributes(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE || SKIP_TAGS.has(el.tagName)) return;
    ATTRS.forEach(attr => {
      if (!el.hasAttribute(attr)) return;
      const oldValue = el.getAttribute(attr);
      const newValue = translateText(oldValue);
      if (newValue !== oldValue) el.setAttribute(attr, newValue);
    });
  }

  function translateNode(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return;
      const translated = translateText(node.nodeValue);
      if (translated !== node.nodeValue) node.nodeValue = translated;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE || SKIP_TAGS.has(node.tagName)) return;
    translateAttributes(node);
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode(textNode) {
        const parent = textNode.parentElement;
        return parent && !SKIP_TAGS.has(parent.tagName)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    });
    let current;
    while ((current = walker.nextNode())) translateNode(current);
  }

  let applying = false;
  function apply(root = document) {
    if (applying) return;
    applying = true;
    try {
      applyDataAttrs(root);
      if (root === document) {
        translateNode(document.body);
      } else {
        translateNode(root);
      }
    } finally {
      applying = false;
    }
  }

  function installObserver() {
    const observer = new MutationObserver(records => {
      if (applying || locale === 'zh_CN') return;
      applying = true;
      try {
        records.forEach(record => {
          if (record.type === 'characterData') translateNode(record.target);
          if (record.type === 'attributes') translateAttributes(record.target);
          record.addedNodes && record.addedNodes.forEach(translateNode);
        });
      } finally {
        applying = false;
      }
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS
    });
  }

  function setLocale(nextLocale) {
    if (!LOCALES.includes(nextLocale)) return;
    localStorage.setItem(STORAGE_KEY, nextLocale);
    location.reload();
  }

  function toggleLocale() {
    setLocale(locale === 'zh_CN' ? 'en' : 'zh_CN');
  }

  const nativeAlert = window.alert;
  window.alert = function (message) {
    return nativeAlert.call(window, translateText(String(message)));
  };
  const nativeConfirm = window.confirm;
  window.confirm = function (message) {
    return nativeConfirm.call(window, translateText(String(message)));
  };

  const canvasProto = window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype;
  if (canvasProto && canvasProto.fillText) {
    const nativeFillText = canvasProto.fillText;
    canvasProto.fillText = function (text, ...args) {
      return nativeFillText.call(this, translateText(String(text)), ...args);
    };
    const nativeStrokeText = canvasProto.strokeText;
    if (nativeStrokeText) {
      canvasProto.strokeText = function (text, ...args) {
        return nativeStrokeText.call(this, translateText(String(text)), ...args);
      };
    }
  }

  window.GwebI18n = { locale, t, list, translate: translateText, apply, setLocale, toggleLocale };
  window.gwT = t;
  window.gwList = list;
  window.gwPick = function (key, fallback) {
    const arr = list(key, fallback);
    return arr[Math.floor(Math.random() * arr.length)] || '';
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      apply(document);
      installObserver();
    });
  } else {
    apply(document);
    installObserver();
  }
})();
