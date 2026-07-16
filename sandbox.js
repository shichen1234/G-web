const CURSOR_STYLE = `
html, body, *, html *, body *, [style*="cursor"] { cursor: url('mouse/xiaoshou/Zhand.cur'), auto !important; }
a, a *, button:not(:disabled), button:not(:disabled) *, [role="button"], [role="button"] *, summary, label, input[type="checkbox"], input[type="radio"], input[type="range"], select, option { cursor: url('mouse/xiaoshou/Zlink.cur'), pointer !important; }
input[type="text"], input[type="search"], input[type="email"], input[type="password"], input[type="url"], input[type="number"], textarea, [contenteditable="true"] { cursor: url('mouse/xiaoshou/Zbeam.cur') 16 16, text !important; }
button:disabled, button:disabled *, [aria-disabled="true"] { cursor: url('mouse/xiaoshou/Zunavail.cur'), not-allowed !important; }
`;

function applySandboxCursorStyle() {
  let cursorStyle = document.getElementById('dynamic-cursor-style');
  if (!cursorStyle) {
    cursorStyle = document.createElement('style');
    cursorStyle.id = 'dynamic-cursor-style';
    document.head.appendChild(cursorStyle);
  }
  
  // 🔧 核心修复：尝试从全局变量获取，没有则从 localStorage 恢复
  let styleName = window.currentSandboxMouseStyleName;
  let cursorCss = window.currentSandboxCursorCss;
  
  if (!styleName) {
    try {
      styleName = localStorage.getItem('sandbox_mouse_style_name') || 'xiaoshou';
      const cssStr = localStorage.getItem('sandbox_cursor_css');
      cursorCss = cssStr ? JSON.parse(cssStr) : {};
    } catch (e) {
      styleName = 'xiaoshou';
      cursorCss = {};
    }
    window.currentSandboxMouseStyleName = styleName;
    window.currentSandboxCursorCss = cursorCss;
  }
  
  // ============================================================
  // 🔧 核心修复：彻底清理所有元素的inline cursor属性
  // ============================================================
  const allElements = document.querySelectorAll('*');
  allElements.forEach(el => {
    if (el.style.cursor) {
      el.style.removeProperty('cursor');
    }
  });
  
  // 也清理文档元素和body的inline样式
  document.documentElement.style.removeProperty('cursor');
  if (document.body) document.body.style.removeProperty('cursor');

  if (styleName === 'furina') {
    // 芙宁娜模式：彻底隐藏所有系统鼠标
    cursorStyle.textContent = `
      html, body, *, html *, body *,
      a, a *, button, button *, [role="button"], [role="button"] *, summary, label, input, select, option, textarea, [contenteditable="true"],
      button:disabled, button:disabled *, [aria-disabled="true"], [style*="cursor"] {
        cursor: none !important;
      }
    `;
    // 强制作用到文档根元素
    document.documentElement.style.setProperty('cursor', 'none', 'important');
    if (document.body) document.body.style.setProperty('cursor', 'none', 'important');
    console.log('[sandbox] Cursor style applied (furina):', styleName);
  } else {
    // 其他四个样式：使用.cur文件
    const handCss = cursorCss.hand || `auto`;
    const linkCss = cursorCss.link || `pointer`;
    const beamCss = cursorCss.beam || `text`;
    const unavailCss = cursorCss.unavail || `not-allowed`;

    cursorStyle.textContent = `
      html, body, *, html *, body *, [style*="cursor"] { 
        cursor: ${handCss} !important; 
      }
      a, a *, 
      button:not(:disabled), button:not(:disabled) *, 
      [role="button"], [role="button"] *, 
      summary, label, 
      input[type="checkbox"], input[type="radio"], input[type="range"], 
      select, option { 
        cursor: ${linkCss} !important; 
      }
      input[type="text"], input[type="search"], input[type="email"], input[type="password"], 
      input[type="url"], input[type="number"], 
      textarea, [contenteditable="true"] { 
        cursor: ${beamCss} !important; 
      }
      button:disabled, button:disabled *, [aria-disabled="true"] { 
        cursor: ${unavailCss} !important; 
      }
    `;
    console.log('[sandbox] Cursor style applied (non-furina):', styleName, 'with URLs:', cursorCss);
  }
  
  // 🔧 核心修复：强制浏览器重新计算样式
  // 这通过修改DOM来触发重排，但不实际改变任何东西
  if (document.documentElement.offsetHeight) {
    // 访问offsetHeight会触发强制同步布局
  }
  
  // 让所有内联样式元素触发样式重新计算
  allElements.forEach(el => {
    if (el.style.length > 0 || el.classList.length > 0) {
      // 通过读取和重写一个不相关的属性来强制重新计算
      const temp = el.style.transition;
      el.style.transition = temp;
    }
  });
}

// ============================================================
function handleCursorStyleMessage(event) {
  if (!event.data || event.data.type !== 'CHANGE_MOUSE_STYLE') return;
  const { styleName } = event.data;

  // 必须保存styleName到全局变量和localStorage，以防沙盒重载
  window.currentSandboxMouseStyleName = styleName;
  if (event.data.config) window.currentSandboxMouseConfig = event.data.config;
  if (event.data.cursorCss) window.currentSandboxCursorCss = event.data.cursorCss;

  // 保存到 localStorage 以便沙盒重载后恢复
  try {
    localStorage.setItem('sandbox_mouse_style_name', styleName);
    localStorage.setItem('sandbox_cursor_css', JSON.stringify(event.data.cursorCss || {}));
  } catch (e) {
    console.warn('[sandbox] Failed to save to localStorage:', e);
  }

  applySandboxCursorStyle();
  console.log('[sandbox] CHANGE_MOUSE_STYLE received:', styleName);
}

function bindCursorStyleListener() {
  // 先移除（如果存在）再添加，避免同一个函数引用被重复注册
  window.removeEventListener('message', handleCursorStyleMessage);
  window.addEventListener('message', handleCursorStyleMessage);
}

// 脚本刚加载、壁纸内容还没写入前，也需要先绑定一次
bindCursorStyleListener();

let pendingPointerMove = null;
let pointerMoveRaf = 0;

function postPointerEvent(eventType, e) {
  if (!e) return;
  window.parent.postMessage({
    type: 'WEB_WP_POINTER_EVENT', eventType,
    clientX: e.clientX || 0, clientY: e.clientY || 0,
    screenX: e.screenX || 0, screenY: e.screenY || 0,
    button: typeof e.button === 'number' ? e.button : 0,
    buttons: typeof e.buttons === 'number' ? e.buttons : 0,
    ctrlKey: !!e.ctrlKey, shiftKey: !!e.shiftKey, altKey: !!e.altKey, metaKey: !!e.metaKey
  }, '*');
}

window.addEventListener('message', function(event) {
  // CHANGE_MOUSE_STYLE 统一交给 handleCursorStyleMessage 处理（见上方），
  // 这里直接跳过，避免 document.write 之前这个监听器还存活的短暂窗口期内
  // 两个监听器同时触发导致重复执行。
  if (event.data && event.data.type === 'CHANGE_MOUSE_STYLE') {
    return;
  }

  if (event.data && event.data.resourceMap) {
    window.resourceMap = event.data.resourceMap;
  }

  function getCleanPath(url) {
    if (!url) return '';
    let cleanPath = url;
    try {
      let u = new URL(url, window.location.href);
      if (u.protocol === 'chrome-extension:') {
        cleanPath = decodeURIComponent(u.pathname.replace(/^\/(sandbox\.html)?\/?/, ''));
      }
    } catch (e) {}
    return cleanPath.replace(/^\.\//, '').split('?')[0].split('#')[0];
  }

  function findResourceBase64(path) {
    if (!window.resourceMap || !path || path.startsWith('data:') || path.startsWith('http') || path.startsWith('blob:')) return null;
    let cleanPath = getCleanPath(path);
    let fileName = cleanPath.split('/').pop();
    if (!fileName) return null;

    for (let key in window.resourceMap) {
      if (key === fileName || key.endsWith('/' + fileName) || decodeURIComponent(key).endsWith('/' + fileName)) {
        return window.resourceMap[key];
      }
    }
    return null;
  }

  if (!window.__api_hijacked && window.resourceMap) {
    // ==== 核心升级：隐身模式代理（Stealth Proxy）====
    // 欺骗 JS 引擎，当它读取 src 属性时，返回原始路径，防止游戏引擎的资源校验崩溃
    const origValues = new WeakMap();

    function safeHijackProp(prototype, propName) {
      const origDesc = Object.getOwnPropertyDescriptor(prototype, propName);
      if (!origDesc) return;
      Object.defineProperty(prototype, propName, {
        set(value) {
          origValues.set(this, value); // 记住引擎原始想设置的路径
          let b64 = findResourceBase64(value);
          origDesc.set.call(this, b64 || value); // 底层交给浏览器渲染 Base64
        },
        get() { 
          // 引擎读取时，骗它一切正常，返回原始路径
          return origValues.has(this) ? origValues.get(this) : origDesc.get.call(this); 
        }
      });
    }

    safeHijackProp(HTMLImageElement.prototype, 'src');
    safeHijackProp(HTMLMediaElement.prototype, 'src');
    safeHijackProp(HTMLScriptElement.prototype, 'src');
    safeHijackProp(HTMLLinkElement.prototype, 'href');

    const origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if ((name === 'src' || name === 'href') && typeof value === 'string') {
        let b64 = findResourceBase64(value);
        if (b64) {
          this.dataset['orig' + name] = value;
          value = b64;
        }
      }
      return origSetAttr.call(this, name, value);
    };

    const origGetAttr = Element.prototype.getAttribute;
    Element.prototype.getAttribute = function(name) {
      if (name === 'src' || name === 'href') {
        let orig = this.dataset['orig' + name];
        if (orig) return orig;
      }
      return origGetAttr.call(this, name);
    };

    const origInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
    if (origInnerHTML) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        set(value) {
          if (typeof value === 'string') {
            value = value.replace(/(src|href)\s*=\s*["']([^"']+)["']/gi, (match, attr, url) => {
              if (url.startsWith('data:') || url.startsWith('http')) return match;
              let b64 = findResourceBase64(url);
              return b64 ? `${attr}="${b64}" data-orig${attr}="${url}"` : match;
            });
          }
          origInnerHTML.set.call(this, value);
        },
        get() { return origInnerHTML.get.call(this); }
      });
    }

    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
      let url = typeof resource === 'string' ? resource : (resource instanceof Request ? resource.url : '');
      let base64 = findResourceBase64(url);
      return originalFetch(base64 || resource, init);
    };

    const origXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      let base64 = findResourceBase64(url);
      return origXhrOpen.call(this, method, base64 || url, ...rest);
    };

    window.__api_hijacked = true;
  }

  if (!event.data || event.data.type !== 'RENDER_WALLPAPER') return;

  try {
    document.open();
    let finalHtml = event.data.html || event.data.scripts || '';
    if (Array.isArray(finalHtml)) {
      finalHtml = finalHtml.join('');
    }

    if (window.resourceMap) {
      // 0. 提取外部 JS 文件为明文内联代码（附带防崩溃转义修复）
      finalHtml = finalHtml.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, function(match, attrs, innerContent) {
        let srcMatch = attrs.match(/src=["']([^"']+)["']/i);
        if (!srcMatch) return match;
        let url = srcMatch[1];
        if (url.startsWith('data:') || url.startsWith('http')) return match;
        
        let base64 = findResourceBase64(url);
        if (base64) {
          try {
            let b64Data = base64.substring(base64.indexOf(',') + 1);
            let binStr = atob(b64Data);
            let bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
            let decodedJs = new TextDecoder('utf-8').decode(bytes);
            
            // ==== 核心修复：防止内联脚本中含有 </script> 导致 HTML 提前截断崩溃 ====
            decodedJs = decodedJs.replace(/<\/script>/gi, '<\\/script>');
            
            let newAttrs = attrs.replace(/src=["'][^"']+["']/i, '');
            return `<script ${newAttrs} data-origin="${url}">\n${decodedJs}\n</script>`;
          } catch(e) { return match; }
        }
        return match;
      });

      // 1. 提取外部 CSS 文件
      finalHtml = finalHtml.replace(/<link\b([^>]*)>/gi, function(match, attrs) {
        if (!/rel=["']stylesheet["']/i.test(attrs)) return match;
        let hrefMatch = attrs.match(/href=["']([^"']+)["']/i);
        if (!hrefMatch) return match;
        let url = hrefMatch[1];
        if (url.startsWith('data:') || url.startsWith('http')) return match;
        
        let base64 = findResourceBase64(url);
        if (base64) {
          try {
            let b64Data = base64.substring(base64.indexOf(',') + 1);
            let binStr = atob(b64Data);
            let bytes = new Uint8Array(binStr.length);
            for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
            let decodedCss = new TextDecoder('utf-8').decode(bytes);
            return `<style data-origin="${url}">\n${decodedCss}\n</style>`;
          } catch(e) { return match; }
        }
        return match;
      });

      // 2. 替换常规图片等 src
      finalHtml = finalHtml.replace(/(src|href)\s*=\s*["']([^"']+)["']/gi, (match, attr, url) => {
        if (url.startsWith('data:') || url.startsWith('http')) return match;
        let b64 = findResourceBase64(url);
        return b64 ? `${attr}="${b64}" data-orig${attr}="${url}"` : match;
      });

      // 3. 终极修复：替换所有的 CSS url(...) 
      finalHtml = finalHtml.replace(/url\(\s*['"]?([^'"()]+)['"]?\s*\)/gi, function(m, url) {
        if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('blob:') || url.startsWith('#')) return m;
        let b64 = findResourceBase64(url);
        return b64 ? `url("${b64}")` : m;
      });
    }

    document.write(finalHtml);
    document.close();
  } catch (e) {}

  // 🔧 核心修复：document.open()/write()/close() 已经把 window 上原有的
  // message 监听器（包括这次事件正在执行的这个监听器自身）全部清空了。
  // 必须在这里立刻重新绑定一次鼠标样式监听器，否则壁纸加载完成后，
  // 用户在菜单里切换鼠标样式时，父页面发出的 CHANGE_MOUSE_STYLE 消息
  // 将不会被任何监听器接收到，沙盒里显示的鼠标永远停在切换前的样式，
  // 直到刷新整个页面重新执行 sandbox.js 顶层代码为止。
  bindCursorStyleListener();

  const injectCustomAssets = () => {
    const baseStyle = document.createElement('style');
    // ==== 移除了破坏壁纸自带背景色的代码，只保留必要的边距清理和 Doki Doki 强制拉伸 ====
    baseStyle.textContent = `
      html, body { 
        margin: 0 !important; 
        padding: 0 !important; 
        width: 100vw !important; 
        height: 100vh !important; 
        overflow: hidden !important; 
      }
      /* 仅针对 Doki Doki 等 GameMaker 引擎的画布进行强制拉伸修复 */
      .gm4html5_div_class, #gm4html5_div_id {
         width: 100vw !important;
         height: 100vh !important;
      }
      canvas#canvas {
         width: 100vw !important;
         height: 100vh !important;
         object-fit: cover !important;
      }
    `;
    document.head.appendChild(baseStyle);

    applySandboxCursorStyle();

    const storagePolyfill = document.createElement('script');
    storagePolyfill.textContent = `
(function () {
  function makeSafeStorage() {
    const store = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[String(k)] = String(v); },
      removeItem: function (k) { delete store[k]; },
      clear: function () { Object.keys(store).forEach(function (k) { delete store[k]; }); },
      key: function (i) { return Object.keys(store)[i] !== undefined ? Object.keys(store)[i] : null; },
      get length() { return Object.keys(store).length; }
    };
  }
  let storageOK = false;
  try { window.localStorage.getItem('__sandboxTest__'); storageOK = true; } catch (e) {}
  if (!storageOK) {
    try {
      Object.defineProperty(window, 'localStorage', { value: makeSafeStorage(), configurable: true, writable: true });
      Object.defineProperty(window, 'sessionStorage', { value: makeSafeStorage(), configurable: true, writable: true });
    } catch (e) {}
  }
})();
    `;
    document.head.insertBefore(storagePolyfill, document.head.firstChild);

    if (event.data.css) {
      const style = document.createElement('style');
      style.textContent = event.data.css;
      document.head.appendChild(style);
    }

    const originalJs = event.data.js || '';
    const isESModule = event.data.isModule === true
      || /(?:^|[\r\n])[ \t]*import[ \t*{]/.test(originalJs)
      || /(?:^|[\r\n])[ \t]*export[ \t]/.test(originalJs);

    let resolvedJs = originalJs;
    try {
      const cdnModules = (event.data.cdnModules
        && typeof event.data.cdnModules === 'object'
        && Object.keys(event.data.cdnModules).length > 0)
        ? event.data.cdnModules
        : null;

      if (cdnModules) {
        function getKnownDeps(text) {
          const re = /(?:^|[^a-zA-Z0-9_$'"/])from\s*(['"])(https?:\/\/[^'"#\s]+)\1/gm;
          return [...new Set([...text.matchAll(re)].map(m => m[2]))].filter(u => cdnModules[u]);
        }

        const visited = new Set();
        const order = [];
        function visit(url) {
          if (visited.has(url)) return;
          visited.add(url);
          getKnownDeps(cdnModules[url] || '').forEach(visit);
          order.push(url);
        }
        Object.keys(cdnModules).forEach(visit);

        const blobMap = {};
        function substitute(text) {
          for (const [cdnUrl, blobUrl] of Object.entries(blobMap)) {
            const escaped = cdnUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            text = text.replace(
              new RegExp(`([^a-zA-Z0-9_$])from(\\s*['"])${escaped}(['"])`, 'g'),
              (_, pre, open, close) => `${pre}from${open}${blobUrl}${close}`
            );
            text = text.replace(
              new RegExp(`\\bimport(\\s*['"])${escaped}(['"])`, 'g'),
              (_, open, close) => `import${open}${blobUrl}${close}`
            );
            text = text.replace(
              new RegExp(`\\bimport(\\s*\\(\\s*['"])${escaped}(['"]\\s*\\))`, 'g'),
              (_, open, close) => `import${open}${blobUrl}${close}`
            );
          }
          return text;
        }

        for (const url of order) {
          const rewritten = substitute(cdnModules[url]);
          blobMap[url] = URL.createObjectURL(new Blob([rewritten], { type: 'text/javascript' }));
        }

        resolvedJs = substitute(originalJs);
      }
    } catch (e) {
      resolvedJs = originalJs;
    }

    if (resolvedJs) {
      const script = document.createElement('script');
      if (isESModule) {
        script.type = 'module';
      }
      script.textContent = resolvedJs;
      document.body.appendChild(script);
    }

    if (event.data && Array.isArray(event.data.scripts)) {
      event.data.scripts.forEach(scriptContent => {
        if (scriptContent && typeof scriptContent === 'string' && scriptContent.trim() !== '') {
          const scriptEl = document.createElement('script');
          scriptEl.textContent = scriptContent;
          document.body.appendChild(scriptEl);
        }
      });
    }

    // 稍微延迟触发 load 事件，确保内联脚本有时间绑定监听器
    setTimeout(() => {
      applySandboxCursorStyle();
      window.dispatchEvent(new Event('DOMContentLoaded'));
      window.dispatchEvent(new Event('load'));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          applySandboxCursorStyle();
          window.parent.postMessage({ type: 'WP_RENDERED' }, '*');
        });
      });
    }, 50);

    document.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      window.parent.postMessage({ type: 'WEB_WP_CONTEXT_MENU', clientX: e.clientX, clientY: e.clientY }, '*');
    }, true);

    document.addEventListener('mousedown', function (e) {
      if (typeof postPointerEvent !== 'undefined') postPointerEvent('mousedown', e);
      // 确保 iframe 内部元素能正常获得焦点
renderer.domElement.style.pointerEvents = 'auto'; // 如果有 three.js canvas
    }, true);

    document.addEventListener('mouseup', function (e) {
      if (typeof postPointerEvent !== 'undefined') postPointerEvent('mouseup', e);
    }, true);

    document.addEventListener('mousemove', function (e) {
      if (typeof pendingPointerMove !== 'undefined') {
        pendingPointerMove = e;
        if (typeof pointerMoveRaf !== 'undefined' && pointerMoveRaf) return;
        pointerMoveRaf = requestAnimationFrame(() => {
          pointerMoveRaf = 0;
          if (!pendingPointerMove) return;
          if (typeof postPointerEvent !== 'undefined') postPointerEvent('mousemove', pendingPointerMove);
          pendingPointerMove = null;
        });
      }
    }, { capture: true, passive: true });

    window.addEventListener('click', function (e) {
      if (e.button !== 0) return;
      window.parent.postMessage({ type: 'WEB_WP_CLICK', clientX: e.clientX, clientY: e.clientY }, '*');
    }, true);

    window.addEventListener('mousemove', function(e) {
      window.parent.postMessage({ type: 'WEB_WP_MOUSEMOVE', clientX: e.clientX, clientY: e.clientY }, '*');
    }, { passive: true });
  };

  if (document.readyState === 'complete') {
    injectCustomAssets();
  } else {
    window.addEventListener('load', injectCustomAssets, { once: true });
  }
});

window.addEventListener('load', function() {
  console.log('[sandbox] ready');
  
  // 🔧 核心修复：沙盒加载完成时，尝试恢复保存的鼠标样式
  // 这对于沙盒重载或初始加载都很重要
  setTimeout(() => {
    applySandboxCursorStyle();
  }, 50);
  
  window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
});