// =============================================
// 🎁 每日一签逻辑 - 优化版
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('fortuneWidget');
  const drawBtn = document.getElementById('drawFortuneBtn');
  const resetBtn = document.getElementById('resetFortune');
  const titleEl = document.getElementById('fortuneTitle');
  const textEl = document.getElementById('fortuneText');

  // 🔧 提前检查元素是否存在
  if (!container || !drawBtn || !titleEl || !textEl) return;

  // 🔧 使用 const 而非创建新数组
  const fortunes = [
    { t: "大吉", c: "宜:攻克难题,给小猫加餐 | 忌:犹豫不决" },
    { t: "中吉", c: "宜:学习新知识,整理桌面 | 忌:久坐不动" },
    { t: "小吉", c: "宜:喝杯咖啡,听首好歌 | 忌:忘记保存" },
    { t: "平",   c: "宜:保持平常心,按时睡觉 | 忌:暴饮暴食" },
    { t: "上上签", c: "桃花运旺盛,代码一次过 | 忌:无" },
    { t: "上签", c: "宜:及早回家,摸猫解压 | 忌:乱改需求" }
  ];

  const todayStr = new Date().toDateString();
  const STORAGE_KEY = 'daily_fortune_record';

  // 🔧 缓存 localStorage 读取结果
  let cachedRecord = null;
  
  function getCachedRecord() {
    if (!cachedRecord) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        cachedRecord = stored ? JSON.parse(stored) : null;
      } catch (e) {
        console.error('[Fortune] 读取缓存失败:', e);
        cachedRecord = null;
      }
    }
    return cachedRecord;
  }

  function checkDailyFortune() {
    const record = getCachedRecord();
    
    if (record && record.date === todayStr) {
      titleEl.textContent = record.data.t;
      textEl.textContent = record.data.c;
      container.classList.add('flipped');
      drawBtn.textContent = "今日已签 (点击查看)";
    }
  }

  // 🔧 使用 once: true 避免重复绑定
  drawBtn.addEventListener('click', (e) => {
    e.stopPropagation();

    const record = getCachedRecord();
    if (record && record.date === todayStr) {
      container.classList.add('flipped');
      if (typeof showBubble === 'function') {
        showBubble("贪心是不行的喵~今天已经抽过啦!");
      }
      return;
    }

    const random = fortunes[Math.floor(Math.random() * fortunes.length)];

    titleEl.textContent = random.t;
    textEl.textContent = random.c;

    // 🔧 更新缓存
    cachedRecord = {
      date: todayStr,
      data: random
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedRecord));
    } catch (e) {
      console.error('[Fortune] 保存失败:', e);
    }

    container.classList.add('flipped');
    drawBtn.textContent = "今日已签 (点击查看)";

    if (typeof showBubble === 'function') {
      showBubble(`哇!是${random.t}喵!记得看运势哦~`);
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      container.classList.remove('flipped');
    });
  }

  checkDailyFortune();
});

// =============================================
// 🧹 内存清理监听 - 优化版
// =============================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'memoryCleanupSuggestion') {
    
    // 🔧 轻量级清理
    performLightCleanup();
    
    sendResponse({ status: 'suggestion_received' });
  }
  
  return true;
});

// 🔧 轻量级内存清理函数
function performLightCleanup() {
  // 1. 清理过期的 localStorage 项
  try {
    const today = new Date().toDateString();
    const fortuneRecord = localStorage.getItem('daily_fortune_record');
    
    if (fortuneRecord) {
      const parsed = JSON.parse(fortuneRecord);
      if (parsed.date !== today) {
        // 过期数据，可以考虑清理
      }
    }
  } catch (e) {
    console.error('[G-web] 清理失败:', e);
  }
  
  // 2. 触发浏览器垃圾回收（如果可用）
  if (window.gc && typeof window.gc === 'function') {
    try {
      window.gc();
    } catch (e) {
      // 忽略错误
    }
  }
}

// =============================================
// 🔧 页面可见性优化
// =============================================
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 可以在这里暂停一些不必要的更新
  } else {
  }
}, { passive: true });
// ======================================================
// 🤖 AI 聊天组件逻辑
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatMessages = document.getElementById('chatMessages');
  const clearChatBtn = document.getElementById('clearChatBtn'); // Get the new button
  const initialWelcomeMessageHtml = document.getElementById('initialWelcomeMessage'); // Get the initial welcome message HTML element

  if (!chatInput || !chatSendBtn || !chatMessages || !clearChatBtn || !initialWelcomeMessageHtml) return;

  const CHAT_STORAGE_KEY = 'ai_chat_history';
  let chatHistory = []; // Array to store message objects

  // Helper to append message to DOM and save to history
  function appendMessage(text, isUser, save = true) {
    const msgDiv = document.createElement('div');
    msgDiv.style.alignSelf = isUser ? 'flex-end' : 'flex-start';
    msgDiv.style.background = isUser ? 'linear-gradient(135deg, #ffffff25, #4fadffb5)' : 'linear-gradient(135deg, #4fadffb5, #ffffff25 )';
    msgDiv.style.borderRadius = isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px';
    msgDiv.style.padding = '8px 12px';
    msgDiv.style.maxWidth = '85%';
    msgDiv.style.fontSize = '13px';
    msgDiv.style.lineHeight = '1.5';
    msgDiv.style.wordBreak = 'break-word';
    msgDiv.style.color = 'white';
    msgDiv.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    // Ensure text is selectable and copyable
    msgDiv.style.userSelect = 'text';
    msgDiv.style.webkitUserSelect = 'text';
    msgDiv.style.mozUserSelect = 'text';
    msgDiv.style.msUserSelect = 'text';

    msgDiv.textContent = text;
    chatMessages.appendChild(msgDiv);

    // Smooth scroll to latest message
    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: 'smooth'
    });

    if (save) {
      chatHistory.push({ text, isUser });
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
    }

    return msgDiv;
  }

  // Load chat history from localStorage on page load
  function loadChatHistory() {
    try {
      const storedHistory = localStorage.getItem(CHAT_STORAGE_KEY);
      if (storedHistory) {
        chatHistory = JSON.parse(storedHistory);
        // Clear the initial "你好喵！" message from HTML before loading saved history
        chatMessages.innerHTML = ''; // Clear existing DOM content
        chatHistory.forEach(msg => appendMessage(msg.text, msg.isUser, false)); // Don't re-save when loading
      } else {
        // If no history, ensure the initial welcome message is displayed
        chatMessages.innerHTML = ''; // Clear any previous content
        chatMessages.appendChild(initialWelcomeMessageHtml.cloneNode(true)); // Append a clone of the initial message
      }
    } catch (e) {
      console.error('[G-web] Error loading chat history:', e);
      localStorage.removeItem(CHAT_STORAGE_KEY); // Clear potentially corrupted history
      chatHistory = []; // Reset history in memory
      chatMessages.innerHTML = ''; // Clear existing DOM content
      chatMessages.appendChild(initialWelcomeMessageHtml.cloneNode(true)); // Display initial message
    }
  }

  // Handle clearing the chat history
  clearChatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chatMessages.innerHTML = ''; // Clear all messages from the DOM
    localStorage.removeItem(CHAT_STORAGE_KEY); // Remove history from localStorage
    chatHistory = []; // Reset in-memory history
    chatMessages.appendChild(initialWelcomeMessageHtml.cloneNode(true)); // Display the initial welcome message again
    // Ensure the initial welcome message also has selectable text properties
    const clonedMessage = chatMessages.querySelector('#initialWelcomeMessage');
    if (clonedMessage) {
        clonedMessage.style.userSelect = 'text';
        clonedMessage.style.webkitUserSelect = 'text';
        clonedMessage.style.mozUserSelect = 'text';
        clonedMessage.style.msUserSelect = 'text';
    }

    chatMessages.scrollTo({
      top: chatMessages.scrollHeight,
      behavior: 'smooth'
    });
  });

  // Call loadChatHistory when the DOM is ready
  loadChatHistory();

  // 1. 修复：防止在输入框按空格时触发全局快捷键或事件
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); // Prevent default browser behavior (e.g., page scrolling)
      chatInput.selectionStart = 0; // Move cursor to the beginning
      chatInput.selectionEnd = 0;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); // Prevent default browser behavior
      chatInput.selectionStart = chatInput.value.length; // Move cursor to the end
      chatInput.selectionEnd = chatInput.value.length;
    } else if (e.key === 'ArrowLeft' && !e.shiftKey) { // Move cursor left one char
      e.preventDefault();
      const currentPos = chatInput.selectionStart;
      if (currentPos > 0) {
        chatInput.selectionStart = currentPos - 1;
        chatInput.selectionEnd = currentPos - 1;
      }
    } else if (e.key === 'ArrowRight' && !e.shiftKey) { // Move cursor right one char
      e.preventDefault();
      const currentPos = chatInput.selectionStart;
      const maxLength = chatInput.value.length;
      if (currentPos < maxLength) {
        chatInput.selectionStart = currentPos + 1;
        chatInput.selectionEnd = currentPos + 1;
      }
    }
  });

  async function handleChatSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendMessage(text, true); // Now saving to localStorage inside appendMessage
    const aiMsgDomElement = appendMessage("思考中喵...", false); // Store the DOM element for direct update

    // The AI message is initially added to chatHistory as "思考中喵..."
    // We need to find its corresponding object in chatHistory to update its text.
    let currentAiMessageObject = null;
    if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].text === "思考中喵...") {
        currentAiMessageObject = chatHistory[chatHistory.length - 1];
    }
    
    try {
      const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer sk-nqexskrybwapgftpgtfielefdndguizpqarnwcsdilpisfyd",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "Qwen/Qwen3-8B",
          messages: [
            { role: "system", content: "你是一只可爱的傲娇猫娘助手，句尾带喵。" },
            // Include recent chat history in the API call for better context (optional but recommended)
            // Ensure not to send the "思考中喵..." message itself if it's the last one
            ...chatHistory.filter(msg => msg.text !== "思考中喵...").slice(-0).map(msg => ({ 
              role: msg.isUser ? "user" : "assistant",
              content: msg.text
            })),
            { role: "user", content: text } // Current user message
          ],
          stream: false
        })
      });

      const data = await response.json();
      const aiResponseText = data.choices[0].message.content;

      // Update the DOM element with the final AI response
      aiMsgDomElement.textContent = aiResponseText;

      // Update the chatHistory object with the final AI response and save
      if (currentAiMessageObject) {
          currentAiMessageObject.text = aiResponseText;
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
      }
    } catch (err) {
      const errorText = "连接失败了喵~";
      aiMsgDomElement.textContent = errorText;
      // Update the chatHistory object for error case
      if (currentAiMessageObject) {
          currentAiMessageObject.text = errorText;
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
      }
    }
  }

  // =============================================
  // 🖼️ 图片生成模式
  // =============================================
  const imgModeBtn = document.getElementById('imgModeBtn');
  let isImageMode = false;

  if (imgModeBtn) {
    imgModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isImageMode = !isImageMode;
      if (isImageMode) {
        imgModeBtn.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
        imgModeBtn.style.borderColor = '#a855f7';
        imgModeBtn.title = '当前：图片生成模式（点击切回对话）';
        chatInput.placeholder = '输入图片描述，点击发送生成...';
        chatSendBtn.textContent = '生成';
        chatSendBtn.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
      } else {
        imgModeBtn.style.background = 'rgba(255,255,255,0.15)';
        imgModeBtn.style.borderColor = 'rgba(255,255,255,0.25)';
        imgModeBtn.title = '切换图片生成模式';
        chatInput.placeholder = '输入你想说的话...';
        chatSendBtn.textContent = '发送';
        chatSendBtn.style.background = '#0b74de';
      }
    });
  }

  async function handleImageGenerate(prompt) {
    const aiMsgDomElement = appendMessage("🎨 绘制中喵，请稍候...", false);
    let currentAiMessageObject = chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;

    try {
      const response = await fetch("https://api.siliconflow.cn/v1/images/generations", {
        method: "POST",
        headers: {
          "Authorization": "Bearer sk-nqexskrybwapgftpgtfielefdndguizpqarnwcsdilpisfyd",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "Kwai-Kolors/Kolors",
          prompt: prompt,
          n: 1,
          image_size: "1024x1024"
        })
      });

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        const imgUrl = data.images[0].url;

        // Replace text with an image element
        aiMsgDomElement.textContent = '';
        aiMsgDomElement.style.padding = '6px';
        aiMsgDomElement.style.background = 'none';
        aiMsgDomElement.style.boxShadow = 'none';

        const img = document.createElement('img');
        img.src = imgUrl;
        img.alt = prompt;
        img.style.maxWidth = '100%';
        img.style.borderRadius = '10px';
        img.style.display = 'block';
        img.style.cursor = 'pointer';
        img.title = '点击在新标签页查看原图';
        img.addEventListener('click', () => window.open(imgUrl, '_blank'));
        aiMsgDomElement.appendChild(img);

        const caption = document.createElement('div');
        caption.textContent = `✨ 已生成喵！`;
        caption.style.cssText = 'font-size:11px; color:rgba(255,255,255,0.6); margin-top:4px; text-align:center;';
        aiMsgDomElement.appendChild(caption);

        if (currentAiMessageObject) {
          currentAiMessageObject.text = `[图片] ${imgUrl}`;
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
        }
      } else {
        const errText = data.error?.message || "生成失败了喵，请换个描述试试~";
        aiMsgDomElement.textContent = errText;
        if (currentAiMessageObject) {
          currentAiMessageObject.text = errText;
          localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
        }
      }
    } catch (err) {
      const errorText = "图片生成连接失败了喵~";
      aiMsgDomElement.textContent = errorText;
      if (currentAiMessageObject) {
        currentAiMessageObject.text = errorText;
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory));
      }
    }
  }

  // 4. 绑定发送事件
  chatSendBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // 防止拖拽
    if (isImageMode) {
      const text = chatInput.value.trim();
      if (!text) return;
      chatInput.value = '';
      appendMessage(`🖼️ ${text}`, true);
      handleImageGenerate(text);
    } else {
      handleChatSend();
    }
  });

  // 绑定回车键发送
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (isImageMode) {
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';
        appendMessage(`🖼️ ${text}`, true);
        handleImageGenerate(text);
      } else {
        handleChatSend();
      }
    }
  });
});
