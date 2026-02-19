// content-media.js - 性能优化版

(function() {
    'use strict';
    
    // 避免重复注入
    if (window.__G_WEB_MEDIA_INJECTED__) {
        return;
    }
    window.__G_WEB_MEDIA_INJECTED__ = true;

    // 注入 page-media.js 到网页主世界
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('page-media.js');
    script.onload = function() {
        this.remove();
    };
    script.onerror = function() {
        console.error('G-web: 无法加载 page-media.js');
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);

    // 消息转发 - 添加节流
    let lastMessageTime = 0;
    const MESSAGE_THROTTLE = 300; // 300ms 节流

    window.addEventListener('message', (e) => {
        // 只接收来自当前窗口的消息
        if (e.source !== window) return;
        // 只接收特定标识的消息
        if (e.data?.source !== 'G_WEB_MEDIA') return;

        // 节流处理
        const now = Date.now();
        if (now - lastMessageTime < MESSAGE_THROTTLE) {
            return;
        }
        lastMessageTime = now;

        // 转发给 background.js
        chrome.runtime.sendMessage({
            type: 'mediaUpdate',
            metadata: e.data.payload,
            playbackState: e.data.playbackState
        }).catch(() => {
            // 忽略错误（例如扩展已禁用）
        });
    });
})();
