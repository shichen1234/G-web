// 下面是你原本的代码...
window.addEventListener('message', function(event) {
    if (!event.data || event.data.type !== 'RENDER_WALLPAPER') return;

    console.log('[sandbox] ① 收到 RENDER_WALLPAPER 消息，html 长度:', event.data.html ? event.data.html.length : 0,
                '| css 长度:', event.data.css ? event.data.css.length : 0,
                '| js 长度:', event.data.js ? event.data.js.length : 0);

    // 1. 纯净重写文档（⛔ 绝对不能在 html 字符串前面加任何东西，否则会破坏 DOCTYPE）
    try {
        document.open();
        document.write(event.data.html);
        document.close();
        console.log('[sandbox] ② document.write 完成，readyState:', document.readyState);
    } catch (e) {
        console.error('[sandbox] ❌ document.write 失败:', e);
    }

    // 2. 稍微延迟，确保 DOM 树挂载后，再安全地注入 CSS 和 JS
    setTimeout(() => {
        console.log('[sandbox] ③ 开始注入 CSS/JS，body 子元素数:', document.body ? document.body.children.length : '(无body)');

        // ✅ 关键修复：用正规的 DOM 操作创建 style，而不是暴力拼接字符串
        const baseStyle = document.createElement('style');
        baseStyle.textContent = 'body,html{margin:0;padding:0;width:100vw;height:100vh;overflow:hidden;background:transparent;}';
        document.head.appendChild(baseStyle);

        // ============================================================
        // 💾 localStorage / sessionStorage 安全垫片
        // 沙盒页面运行在 null origin，访问真实 storage 会抛出 SecurityError
        // 导致壁纸脚本在变量声明前就崩溃（动画从未启动）
        // 此垫片提供内存版实现，行为与真实 API 完全一致
        // ============================================================
        const storagePolyfill = document.createElement('script');
        storagePolyfill.textContent = `
(function () {
    function makeSafeStorage() {
        const _store = {};
        return {
            getItem:    function(k)    { return Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null; },
            setItem:    function(k, v) { _store[String(k)] = String(v); },
            removeItem: function(k)    { delete _store[String(k)]; },
            clear:      function()     { Object.keys(_store).forEach(function(k){ delete _store[k]; }); },
            key:        function(i)    { return Object.keys(_store)[i] !== undefined ? Object.keys(_store)[i] : null; },
            get length() { return Object.keys(_store).length; }
        };
    }
    // 检测真实 localStorage 是否可用
    var storageOK = false;
    try { window.localStorage.getItem('__sandboxTest__'); storageOK = true; } catch(e) {}
    if (!storageOK) {
        try {
            Object.defineProperty(window, 'localStorage',   { value: makeSafeStorage(), configurable: true, writable: true });
            Object.defineProperty(window, 'sessionStorage', { value: makeSafeStorage(), configurable: true, writable: true });
            console.log('[sandbox] 💾 localStorage/sessionStorage 垫片已注入（null origin 沙盒）');
        } catch(e) {
            console.warn('[sandbox] ⚠️ 无法注入 storage 垫片:', e);
        }
    }
})();
        `;
        document.head.insertBefore(storagePolyfill, document.head.firstChild);
        // ============================================================

        if (event.data.css) {
            const style = document.createElement('style');
            style.textContent = event.data.css;
            document.head.appendChild(style);
        }

        if (event.data.js) {
            const script = document.createElement('script');
            // ============================================================
            // 🔧 ES Module 修复：
            // 如果脚本包含顶级 import/export（ES Module 语法），
            // 必须设置 type="module"，否则浏览器抛 SyntaxError，脚本整体崩溃。
            // 扩展沙盒中 HTML 的 <script type="module" src="blob:..."> 因
            // null origin 跨源限制加载失败，必须走此内联注入路径。
            // ============================================================
            const isESModule = /(?:^|\n)\s*import\s+[\s\S]*?\s+from\s+['"]|(?:^|\n)\s*export\s+(?:default|class|function|const|let|var|\{)/.test(event.data.js);
            if (isESModule) {
                script.type = 'module';
                console.log('[sandbox] 🔧 检测到 ES Module 脚本，已设置 type="module"');
            }
            script.textContent = event.data.js;
            document.body.appendChild(script);
        }

        // 主动触发加载事件，唤醒壁纸引擎开始监听鼠标
        window.dispatchEvent(new Event('DOMContentLoaded'));
        window.dispatchEvent(new Event('load'));

        console.log('[sandbox] ④ CSS/JS 注入完毕，等待浏览器渲染...');

        // ============================================================
        // 握手：等浏览器真正画出第一帧后，通知父窗口可以隐藏 bgImage 了
        // 双层 rAF：第一层保证 layout/paint 提交，第二层保证帧已合成上屏
        // ============================================================
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                console.log('[sandbox] ⑤ 双层 rAF 完成，发送 WP_RENDERED');
                window.parent.postMessage({ type: 'WP_RENDERED' }, '*');

                // ── 白屏检测 ──────────────────────────────────────────────
                // 延迟 800ms 检测：此时壁纸应该已经开始渲染
                // 若 body/html 背景仍是白色/透明且无任何可见渲染元素，判定为白屏
                setTimeout(() => {
                    try {
                        const bodyBg  = window.getComputedStyle(document.body).backgroundColor;
                        const htmlBg  = window.getComputedStyle(document.documentElement).backgroundColor;
                        const hasCanvas  = !!document.querySelector('canvas');
                        const hasVideo   = !!document.querySelector('video');
                        const hasWebGL   = !!document.querySelector('canvas[data-engine], canvas[id]');
                        const hasBgStyle = !!document.querySelector('[style*="background"]');

                        const isTransparentOrWhite = (c) =>
                            c === 'rgba(0, 0, 0, 0)' || c === 'transparent' ||
                            c === 'rgba(255, 255, 255, 0)' || c === 'rgba(255, 255, 255, 0)';

                        const noVisibleContent = !hasCanvas && !hasVideo && !hasBgStyle;

                        if (isTransparentOrWhite(bodyBg) && isTransparentOrWhite(htmlBg) && noVisibleContent) {
                            console.error('[sandbox] ⚠️ 白屏检测触发！',
                                '\n  body background:', bodyBg,
                                '\n  html background:', htmlBg,
                                '\n  canvas:', hasCanvas, '| video:', hasVideo, '| bg-style元素:', hasBgStyle,
                                '\n  body.children 数量:', document.body.children.length,
                                '\n  body innerHTML 前300字符:', document.body.innerHTML.slice(0, 300)
                            );
                        } else {
                            console.log('[sandbox] ✅ 白屏检测通过',
                                '| bodyBg:', bodyBg,
                                '| canvas:', hasCanvas, '| video:', hasVideo
                            );
                        }
                    } catch (e) {
                        console.error('[sandbox] 白屏检测执行出错:', e);
                    }
                }, 800);
                // ─────────────────────────────────────────────────────────
            });
        });
        // ============================================================

        // ============================================================
        // 新增：在 iframe 内部监听右键菜单事件，并 postMessage 给父窗口
        // ============================================================
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault(); // 阻止 iframe 内部的默认右键菜单
            // 使用 '*' 作为 targetOrigin，表示发送给任何来源的父窗口
            window.parent.postMessage({
                type: 'WEB_WP_CONTEXT_MENU',
                clientX: e.clientX,
                clientY: e.clientY
            }, '*');
        });
        // ============================================================
        // 新增：在 iframe 内部监听左键点击事件，并 postMessage 给父窗口
        // ============================================================
        window.addEventListener('click', function(e) {
            // e.button === 0 代表必须是鼠标左键
            if (e.button === 0) {
                window.parent.postMessage({
                    type: 'WEB_WP_CLICK'
                }, '*');
            }
        }, true); // 👈 核心关键：true。开启捕获阶段，防止壁纸代码吞掉点击事件
        // ============================================================
        // ============================================================

    }, 20); 
});
// 确保沙盒本身的生命周期完全结束后，再呼叫父窗口
window.addEventListener('load', function() {
    console.log('[sandbox] 沙盒环境完全就绪，请求父窗口发送数据...');
    window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
});
// sandbox.js 底部
// 告诉父窗口：沙盒环境已经完全加载好了，可以发数据了
window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');