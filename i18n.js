(function () {
  'use strict';

  const LOCALES = ['zh_CN', 'en'];
  const STORAGE_KEY = 'gweb_locale';

  function normalizeLocale(value) {
    const lang = String(value || '').replace('-', '_').toLowerCase();
    return lang.startsWith('zh') ? 'zh_CN' : 'en';
  }

  function browserLocale() {
    try {
      if (window.chrome && chrome.i18n && chrome.i18n.getUILanguage) {
        return normalizeLocale(chrome.i18n.getUILanguage());
      }
    } catch (e) {}
    return normalizeLocale(navigator.language || navigator.userLanguage || 'zh_CN');
  }

  function selectedLocale() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return LOCALES.includes(saved) ? saved : browserLocale();
  }

  function readLocaleFile(locale) {
    try {
      const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.overrideMimeType('application/json; charset=utf-8');
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        return JSON.parse(xhr.responseText);
      }
    } catch (e) {}
    return {};
  }

  const locale = selectedLocale();
  const fallbackMessages = readLocaleFile('zh_CN');
  const activeMessages = locale === 'zh_CN'
    ? fallbackMessages
    : Object.assign({}, fallbackMessages, readLocaleFile(locale));

  function rawMessage(key) {
    const entry = activeMessages[key] || fallbackMessages[key];
    return entry && typeof entry.message === 'string' ? entry.message : '';
  }

  function replaceParams(message, params) {
    if (!params) return message;
    return message.replace(/\{(\w+)\}/g, (match, name) => (
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    ));
  }

  function t(key, params, fallback = '') {
    const msg = rawMessage(key);
    return replaceParams(msg || fallback || key, params);
  }

  function list(baseKey, fallback = []) {
    const items = [];
    for (let i = 1; i <= 80; i++) {
      const msg = rawMessage(`${baseKey}_${i}`);
      if (!msg) break;
      items.push(msg);
    }
    return items.length ? items : fallback;
  }

  function pick(baseKey, fallback = []) {
    const items = list(baseKey, fallback);
    return items[Math.floor(Math.random() * items.length)];
  }

  function setText(el, key) {
    const value = rawMessage(key);
    if (value) el.textContent = value;
  }

  function setHtml(el, key) {
    const value = rawMessage(key);
    if (value) el.innerHTML = value;
  }

  function setAttr(el, attr, key) {
    const value = rawMessage(key);
    if (value) el.setAttribute(attr, value);
  }

  function apply(root = document) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('[data-i18n]').forEach(el => setText(el, el.dataset.i18n));
    root.querySelectorAll('[data-i18n-html]').forEach(el => setHtml(el, el.dataset.i18nHtml));
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => setAttr(el, 'placeholder', el.dataset.i18nPlaceholder));
    root.querySelectorAll('[data-i18n-title]').forEach(el => setAttr(el, 'title', el.dataset.i18nTitle));
    root.querySelectorAll('[data-i18n-alt]').forEach(el => setAttr(el, 'alt', el.dataset.i18nAlt));
    root.querySelectorAll('[data-i18n-aria-label]').forEach(el => setAttr(el, 'aria-label', el.dataset.i18nAriaLabel));
  }

  function setLocale(nextLocale) {
    const normalized = normalizeLocale(nextLocale);
    localStorage.setItem(STORAGE_KEY, normalized);
    location.reload();
  }

  function toggleLocale() {
    setLocale(locale === 'zh_CN' ? 'en' : 'zh_CN');
  }

  document.documentElement.lang = locale === 'zh_CN' ? 'zh-CN' : 'en';

  window.GwebI18n = {
    locale,
    isZh: locale === 'zh_CN',
    t,
    list,
    pick,
    apply,
    setLocale,
    toggleLocale
  };

  window.gwT = (key, fallback, params) => t(key, params, fallback);
  window.gwList = (key, fallback) => list(key, fallback);
  window.gwPick = (key, fallback) => pick(key, fallback);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => apply(document));
  } else {
    apply(document);
  }
})();
