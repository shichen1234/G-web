// =============================================
// 🚀 豆包AI自动填充脚本 v4 - 粘贴事件方案
// =============================================
(function () {
    'use strict';

    if (window.__G_WEB_DOUBAO_INJECTED__) return;
    window.__G_WEB_DOUBAO_INJECTED__ = true;

    chrome.storage.local.get(['pending_query', 'pending_query_type'], function (data) {
        if (!data || !data.pending_query) return;

        const query   = data.pending_query;
        const isImage = (data.pending_query_type === 'image');
        chrome.storage.local.remove(['pending_query', 'pending_query_type']);

        console.log('[G-web Inject] 启动, 模式:', isImage ? '画图' : '聊天', '内容:', query);

        const MAX_WAIT = 30000;
        const INTERVAL = 300;
        let elapsed = 0;

        const timer = setInterval(() => {
            elapsed += INTERVAL;
            if (elapsed > MAX_WAIT) {
                clearInterval(timer);
                console.error('[G-web Inject] 超时：找不到输入框或发送按钮');
                return;
            }

            // ── 找输入框 ──────────────────────────────────
            const slateEditor = document.querySelector('div[data-slate-editor]');
            const textarea    =
                document.querySelector('textarea[placeholder*="发消息"]') ||
                document.querySelector('textarea[placeholder*="提问"]')   ||
                document.querySelector('textarea[placeholder*="输入"]')   ||
                document.querySelector('textarea');

            const inputEl = (isImage ? slateEditor : textarea) || slateEditor || textarea;
            if (!inputEl) return;

            // ── 找发送按钮 ────────────────────────────────
            const sendBtn =
                document.querySelector('#flow-end-msg-send') ||
                document.querySelector('button[type="submit"]') ||
                document.querySelector('button[aria-label*="发送"]');
            if (!sendBtn) return;

            clearInterval(timer);
            console.log('[G-web Inject] 找到输入框:', inputEl.tagName,
                inputEl.hasAttribute('data-slate-editor') ? '(Slate)' : '(textarea)');

            if (inputEl.tagName === 'TEXTAREA') {
                fillTextarea(inputEl, query, () => doSend(sendBtn, inputEl));
            } else {
                fillSlate(inputEl, query, () => doSend(sendBtn, inputEl));
            }

        }, INTERVAL);
    });

    // ── Slate 填充：模拟粘贴事件（最可靠）────────────────
    function fillSlate(el, text, onDone) {
        el.focus();
        el.click();

        setTimeout(() => {
            // 先清空：全选 + 模拟输入空字符串覆盖
            document.execCommand('selectAll', false, null);

            // 核心：用 ClipboardEvent paste 写入
            // Slate 内置了完整的 paste 处理器，这是最可靠的注入方式
            const dt = new DataTransfer();
            dt.setData('text/plain', text);

            const pasteEvent = new ClipboardEvent('paste', {
                clipboardData: dt,
                bubbles      : true,
                cancelable   : true,
            });

            const pasted = el.dispatchEvent(pasteEvent);
            console.log('[G-web Inject] paste 事件触发结果:', pasted, '当前内容:', el.textContent.slice(0, 30));

            // 给 Slate 600ms 处理粘贴并更新 React 状态
            setTimeout(() => {
                console.log('[G-web Inject] 填充后内容:', el.textContent.slice(0, 50));
                onDone();
            }, 600);
        }, 500);
    }

    // ── textarea 填充 ────────────────────────────────────
    function fillTextarea(el, text, onDone) {
        el.focus();
        el.value = '';
        el.dispatchEvent(new Event('input', { bubbles: true }));

        setTimeout(() => {
            const nativeSetter = Object.getOwnPropertyDescriptor(
                window.HTMLTextAreaElement.prototype, 'value'
            ).set;
            let i = 0;
            const t = setInterval(() => {
                if (i < text.length) {
                    nativeSetter.call(el, text.slice(0, i + 1));
                    el.dispatchEvent(new InputEvent('input', {
                        inputType: 'insertText', data: text[i], bubbles: true
                    }));
                    i++;
                } else {
                    clearInterval(t);
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                    setTimeout(onDone, 600);
                }
            }, 30);
        }, 300);
    }

    // ── 发送 ─────────────────────────────────────────────
    function doSend(btn, inputEl) {
        console.log('[G-web Inject] 准备发送, 按钮 disabled:', btn.disabled);
        btn.disabled = false;
        btn.removeAttribute('disabled');

        // 点击一次，400ms 后用 Enter 兜底
        btn.click();
        setTimeout(() => {
            btn.dispatchEvent(new MouseEvent('click', {
                bubbles: true, cancelable: true, view: window
            }));
        }, 400);
        setTimeout(() => {
            inputEl.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'Enter', code: 'Enter', keyCode: 13,
                bubbles: true, cancelable: true
            }));
            console.log('[G-web Inject] 发送指令完毕');
        }, 800);
    }
})();
