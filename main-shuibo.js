import LiquidBackground from './liquid1.js';

document.addEventListener('DOMContentLoaded', () => {
    // 💡 辅助函数：实时获取最新 DOM，彻底解决“僵尸节点”导致的刷新失效问题
    const getEl = (id) => document.getElementById(id);

    if (!getEl('liquidCanvas') || !getEl('liquidToggleBtn')) return;

    let app = null;

    // ── Toast 提示框 ──
    function showMessage(msg) {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `
            position: fixed; top: 30px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.85); color: #fff; padding: 10px 20px;
            border-radius: 8px; z-index: 99999; font-size: 14px; letter-spacing: 1px;
            transition: opacity 0.3s ease; pointer-events: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3); backdrop-filter: blur(4px);
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    // 🌟🌟🌟 全局拦截：属性级精准打击，绝不误伤 🌟🌟🌟
    document.addEventListener('click', (e) => {
        const path = e.composedPath();
        let isClickingDynamic = false;
        
        for (let el of path) {
            if (!el.tagName || el.tagName.toLowerCase() === 'body') break; 
            
            const tag = el.tagName.toLowerCase();
            
            // 扫描元素自身的所有属性 (能完美捕获 onclick="setWallpaper('xxx.webm')" 的情况)
            let hasDynamicAttr = false;
            if (el.attributes) {
                for (let i = 0; i < el.attributes.length; i++) {
                    const val = (el.attributes[i].value || '').toLowerCase();
                    if (val.includes('.webm') || val.includes('.mp4') || val.includes('.zip')) {
                        hasDynamicAttr = true;
                        break;
                    }
                }
            }
            
            if (tag === 'video' || hasDynamicAttr) {
                isClickingDynamic = true;
                break; 
            }
        }

        // 如果确定点击的是动态壁纸
        if (isClickingDynamic) {
            window.__forceDynamicLock = true;
            setTimeout(() => { window.__forceDynamicLock = false; }, 2000); 

            if (localStorage.getItem('liquidEffect') === 'true') {
                stopEffect();
                const toggleBtn = getEl('liquidToggleBtn');
                if (toggleBtn) toggleBtn.checked = false;
                localStorage.setItem('liquidEffect', 'false');
                showMessage('ℹ️ 切换至动态壁纸，水波特效已强制关闭');
            }
        }
    }, true);


    // ── 严谨判断当前是否为静态壁纸 (每次都重新获取最新 DOM) ──
    function isStaticWallpaper() {
        if (window.__forceDynamicLock) return false;

        const wpType = localStorage.getItem('wallpaperType');
        if (wpType === 'video' || wpType === 'web') return false;

        // 每次调用都重新寻找元素，无视 1.js 的销毁重建
        const bgVideo = getEl('bgVideo');
        const bgWebFrame = getEl('bgWebFrame');
        const bgImage = getEl('bgImage');

        if (bgVideo && bgVideo.src && !bgVideo.src.includes('about:blank')) {
            const style = window.getComputedStyle(bgVideo);
            if (style.display !== 'none' && style.opacity !== '0') return false;
        }
        if (bgWebFrame && bgWebFrame.src && !bgWebFrame.src.includes('about:blank')) {
            const style = window.getComputedStyle(bgWebFrame);
            if (style.display !== 'none' && style.opacity !== '0') return false;
        }

        return bgImage && bgImage.src && !bgImage.src.includes('about:blank');
    }

    // ── 1. 开启特效 ──
    function startEffect() {
        if (!isStaticWallpaper()) return;
        
        const bgImage = getEl('bgImage');
        const canvas = getEl('liquidCanvas');
        if (!bgImage || !canvas) return;

        bgImage.style.opacity = '0'; 
        canvas.style.display = 'block';

        if (!app) {
            app = LiquidBackground(canvas);
            app.liquidPlane.material.metalness = 0.28;
            app.liquidPlane.material.roughness = 1;
            app.liquidPlane.uniforms.displacementScale.value = 2.3;
            app.setRain(false);
        }
        app.loadImage(bgImage.src);
    }

    // ── 2. 关闭特效 ──
    function stopEffect() {
        if (app) {
            if (typeof app.dispose === 'function') app.dispose();
            app = null;
        }
        const canvas = getEl('liquidCanvas');
        const bgImage = getEl('bgImage');
        if (canvas) canvas.style.display = 'none';
        if (bgImage) bgImage.style.opacity = '1';
    }

    // ── 3. 初始化状态 ──
    const isEnabled = localStorage.getItem('liquidEffect') === 'true';
    const toggleBtn = getEl('liquidToggleBtn');
    if (toggleBtn) {
        toggleBtn.checked = isEnabled;
    }
    
    if (isEnabled) {
        setTimeout(() => {
            if (isStaticWallpaper()) startEffect();
            else {
                if (toggleBtn) toggleBtn.checked = false;
                localStorage.setItem('liquidEffect', 'false');
            }
        }, 300);
    }

    // ── 4. 监听水波开关点击 ──
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            if (e.target.checked) {
                if (!isStaticWallpaper()) {
                    e.preventDefault(); 
                    e.target.checked = false; 
                    showMessage('⚠️ 只有静态壁纸才可以开启水波特效');
                    return;
                }
                localStorage.setItem('liquidEffect', 'true');
                startEffect();
            } else {
                localStorage.setItem('liquidEffect', 'false');
                stopEffect();
            }
        });
    }

    // ── 5. 全方位监听全局 DOM 变化 (不再局限于初始元素) ──
    let debounceTimer;
    const observerCallback = () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (localStorage.getItem('liquidEffect') === 'true') {
                if (isStaticWallpaper()) {
                    const bgImage = getEl('bgImage');
                    if (app && bgImage) app.loadImage(bgImage.src);
                    else startEffect();
                } else {
                    stopEffect();
                    const btn = getEl('liquidToggleBtn');
                    if (btn) btn.checked = false;
                    localStorage.setItem('liquidEffect', 'false');
                }
            }
        }, 150);
    };

    // 监听整个 body，只要相关元素发生变化或被重新插入 DOM，就触发检查
    const globalObserver = new MutationObserver((mutations) => {
        let shouldTrigger = false;
        for (let mutation of mutations) {
            const target = mutation.target;
            if (target && (target.id === 'bgImage' || target.id === 'bgVideo' || target.id === 'bgWebFrame')) {
                shouldTrigger = true;
                break;
            }
            if (mutation.type === 'childList') {
                for (let node of mutation.addedNodes) {
                    if (node.id === 'bgImage' || node.id === 'bgVideo' || node.id === 'bgWebFrame') {
                        shouldTrigger = true;
                        break;
                    }
                }
            }
        }
        if (shouldTrigger) observerCallback();
    });

    globalObserver.observe(document.body, { 
        attributes: true, 
        attributeFilter: ['src', 'style', 'class'],
        childList: true, 
        subtree: true 
    });
});