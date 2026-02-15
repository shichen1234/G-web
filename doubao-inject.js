// =============================================
// 🚀 豆包AI自动填充脚本 - 终极版（模拟真实用户输入）
// =============================================

(function() {
    'use strict';

    if (window.__G_WEB_DOUBAO_INJECTED__) {
        console.log('[G-web Inject] 脚本已注入，跳过');
        return;
    }
    window.__G_WEB_DOUBAO_INJECTED__ = true;

    chrome.storage.local.get('pending_query', function(data) {
        if (!data || !data.pending_query) {
            console.log('[G-web Inject] 无待处理查询');
            return;
        }

        const query = data.pending_query;
        console.log('[G-web Inject] 🎯 待处理查询:', query);
        chrome.storage.local.remove('pending_query');

        const MAX_ATTEMPTS = 80;
        const CHECK_INTERVAL = 300;
        let attempts = 0;

        const findAndFillInterval = setInterval(() => {
            attempts++;

            const textarea = 
                document.querySelector('textarea[placeholder*="发消息"]') ||
                document.querySelector('textarea[placeholder*="提问"]') ||
                document.querySelector('textarea[placeholder*="输入"]') ||
                document.querySelector('#root textarea') ||
                document.querySelector('main textarea') ||
                document.querySelector('textarea');

            let sendButton = 
                document.querySelector('#flow-end-msg-send') ||
                document.querySelector('button[type="submit"]');

            if (!sendButton && textarea) {
                const buttons = Array.from(document.querySelectorAll('button'));
                sendButton = buttons.find(btn => {
                    const text = (btn.textContent || '').trim();
                    const ariaLabel = btn.getAttribute('aria-label') || '';
                    return text.includes('发送') || 
                           ariaLabel.includes('发送') ||
                           ariaLabel.includes('send') ||
                           btn.querySelector('svg');
                }) || Array.from(textarea.closest('form, div')?.querySelectorAll('button') || []).pop();
            }

            if (textarea && sendButton) {
                console.log('[G-web Inject] ✅ 元素定位成功');
                clearInterval(findAndFillInterval);

                // ============================================
                // 🎭 终极方案：逐字符模拟真实用户输入
                // ============================================
                
                textarea.focus();
                textarea.click();
                
                // 清空输入框
                textarea.value = '';
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                
                console.log('[G-web Inject] 🖊️ 开始模拟逐字输入...');
                
                setTimeout(() => {
                    // 获取原生setter
                    const nativeSetter = Object.getOwnPropertyDescriptor(
                        window.HTMLTextAreaElement.prototype, 
                        "value"
                    ).set;
                    
                    let currentText = '';
                    let charIndex = 0;
                    
                    // 逐字符输入
                    const typeInterval = setInterval(() => {
                        if (charIndex < query.length) {
                            currentText += query[charIndex];
                            
                            // 更新值
                            nativeSetter.call(textarea, currentText);
                            textarea.value = currentText;
                            
                            // 触发事件（模拟真实输入）
                            textarea.dispatchEvent(new InputEvent('beforeinput', {
                                inputType: 'insertText',
                                data: query[charIndex],
                                bubbles: true,
                                cancelable: true
                            }));
                            
                            textarea.dispatchEvent(new InputEvent('input', {
                                inputType: 'insertText',
                                data: query[charIndex],
                                bubbles: true,
                                cancelable: false
                            }));
                            
                            textarea.dispatchEvent(new Event('input', { bubbles: true }));
                            
                            charIndex++;
                            
                            // 显示进度
                            if (charIndex % 5 === 0 || charIndex === query.length) {
                                console.log(`[G-web Inject] 📝 输入进度: ${charIndex}/${query.length}`);
                            }
                        } else {
                            // 输入完成
                            clearInterval(typeInterval);
                            
                            // 触发change事件
                            textarea.dispatchEvent(new Event('change', { bubbles: true }));
                            
                            console.log('[G-web Inject] ✅ 输入完成:', currentText);
                            console.log('[G-web Inject] 📊 验证 textarea.value:', textarea.value);
                            
                            // ============================================
                            // 🚀 发送消息（增强版）
                            // ============================================
                            setTimeout(() => {
                                console.log('[G-web Inject] 🔍 检查发送按钮状态...');
                                console.log('  - disabled属性:', sendButton.disabled);
                                console.log('  - disabled特性:', sendButton.hasAttribute('disabled'));
                                console.log('  - className:', sendButton.className);
                                
                                // 强制启用按钮
                                sendButton.disabled = false;
                                sendButton.removeAttribute('disabled');
                                sendButton.classList.remove('disabled');
                                
                                // 尝试多种发送方式
                                let sendAttempt = 0;
                                const trySend = setInterval(() => {
                                    sendAttempt++;
                                    
                                    if (sendAttempt === 1) {
                                        // 第1次：直接点击
                                        sendButton.click();
                                        console.log('[G-web Inject] 🔘 尝试1: 直接点击');
                                    } else if (sendAttempt === 2) {
                                        // 第2次：鼠标事件点击
                                        sendButton.dispatchEvent(new MouseEvent('click', {
                                            bubbles: true,
                                            cancelable: true,
                                            view: window
                                        }));
                                        console.log('[G-web Inject] 🔘 尝试2: 鼠标事件点击');
                                    } else if (sendAttempt === 3) {
                                        // 第3次：回车发送
                                        textarea.dispatchEvent(new KeyboardEvent('keydown', {
                                            key: 'Enter',
                                            code: 'Enter',
                                            keyCode: 13,
                                            which: 13,
                                            bubbles: true,
                                            cancelable: true
                                        }));
                                        console.log('[G-web Inject] ⌨️ 尝试3: 回车发送');
                                    } else if (sendAttempt === 4) {
                                        // 第4次：查找form并提交
                                        const form = textarea.closest('form');
                                        if (form) {
                                            form.dispatchEvent(new Event('submit', {
                                                bubbles: true,
                                                cancelable: true
                                            }));
                                            console.log('[G-web Inject] 📝 尝试4: 表单提交');
                                        }
                                    } else {
                                        clearInterval(trySend);
                                        console.log('[G-web Inject] ✅ 已完成所有发送尝试');
                                    }
                                }, 400); // 每400ms尝试一次
                                
                            }, 800); // 输入完成后等待800ms
                        }
                    }, 30); // 每30ms输入一个字符（模拟快速打字）
                    
                }, 300);

            } else if (attempts >= MAX_ATTEMPTS) {
                clearInterval(findAndFillInterval);
                console.error('[G-web Inject] ⏱️ 超时');
                console.log('[G-web Inject] 调试:');
                console.log('  - textarea:', !!textarea);
                console.log('  - sendButton:', !!sendButton);
                
                if (textarea) {
                    console.log('  - textarea.placeholder:', textarea.placeholder);
                    console.log('  - textarea.id:', textarea.id);
                    console.log('  - textarea.className:', textarea.className);
                }
            } else if (attempts % 10 === 0) {
                console.log(`[G-web Inject] 🔍 查找中... (${attempts}/${MAX_ATTEMPTS})`);
            }
        }, CHECK_INTERVAL);
    });

})();
