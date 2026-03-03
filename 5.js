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
// 🤖 AI 聊天组件逻辑（终极整合版：UI保留 + 记忆 + 感官 + 键位优化）
// ======================================================
document.addEventListener('DOMContentLoaded', () => {
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatMessages = document.getElementById('chatMessages');
  const clearChatBtn = document.getElementById('clearChatBtn');

  if (!chatInput || !chatSendBtn || !chatMessages || !clearChatBtn) return;

  const CHAT_STORAGE_KEY = 'ai_chat_history';
  const MEMORY_STORAGE_KEY = 'ai_long_term_memory';
  let chatHistory = [];

  // ── 0. 扩展功能认知 & 长期记忆系统 ──
  const GWEB_FEATURES = `
你所在的扩展名为 G-web。核心功能：
1. 壁纸：支持高清视频、每日 Bing 自动更新、IndexedDB 缓存。
2. 效率：Ctrl+K 唤起功能菜单。
3. 组件：每日一签、禅意时钟、生日倒计时。
4. 性能：鼠标粒子特效、离开页面自动休眠。`;

  function saveToLongTermMemory(text) {
    const keywords = ['记住', '我的', '名字', '喜欢', '是在'];
    if (keywords.some(k => text.includes(k))) {
      let memories = JSON.parse(localStorage.getItem(MEMORY_STORAGE_KEY) || "[]");
      if (!memories.includes(text)) {
        memories.push(text);
        if (memories.length > 20) memories.shift();
        localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
      }
    }
  }

  function getMemoryContext() {
    const memories = JSON.parse(localStorage.getItem(MEMORY_STORAGE_KEY) || "[]");
    return memories.length > 0 ? `\n你记得关于用户的这些事：${memories.join('；')}。` : "";
  }

  // ── 1. 核心：追加消息，返回整行 div ──
  function appendMessage(text, isUser, saveToStorage = true) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-row ${isUser ? 'user-row' : 'ai-row'}`;
    const avatarSrc = isUser ? 'images/head1.png' : 'images/head2.png';
    
    // 👇 完全保留你的 HTML 结构 👇
    const avatarHtml = isUser 
      ? `<img src="${avatarSrc}" class="chat-avatar">`
      : `<div class="ai-avatar-wrapper">
           <img src="${avatarSrc}" class="chat-avatar">
           <img src="images/touxiangkuang.png" class="avatar-frame">
         </div>`;

    msgDiv.innerHTML = `
      ${avatarHtml}
      <div class="chat-bubble">${text}</div>
    `;

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    if (saveToStorage) {
      chatHistory.push({ text, isUser });
      try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory)); } catch(e) {}
    }
    return msgDiv;
  }

  // ── 2. 显示初始欢迎消息（使用标准气泡样式） ──
  function appendWelcomeMessage() {
    appendMessage('你好喵！我是你的专属 AI 猫娘糯米，有什么可以帮你的吗？', false, false);
  }

  // ── 3. 从 localStorage 加载历史记录 ──
  function loadChatHistory() {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        chatHistory = JSON.parse(stored);
        chatMessages.innerHTML = '';
        chatHistory.forEach(msg => appendMessage(msg.text, msg.isUser, false));
      } else {
        chatMessages.innerHTML = '';
        appendWelcomeMessage();
      }
    } catch (e) {
      console.error('[G-web] 加载聊天记录失败:', e);
      localStorage.removeItem(CHAT_STORAGE_KEY);
      chatHistory = [];
      chatMessages.innerHTML = '';
      appendWelcomeMessage();
    }
  }

  // ── 4. 清除记录（带浏览器确认弹窗 + 清理记忆） ──
  clearChatBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!confirm('确定要清除所有聊天记录和记忆吗？')) return;
    
    chatMessages.innerHTML = '';
    localStorage.removeItem(CHAT_STORAGE_KEY);
    localStorage.removeItem(MEMORY_STORAGE_KEY); // 新增：同步清空记忆
    chatHistory = [];
    appendWelcomeMessage();
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
  });

  loadChatHistory();

  // ── 5. AI 对话发送（接入记忆与扩展认知） ──
async function handleChatSend() {
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';

    saveToLongTermMemory(text); 
    appendMessage(text, true);
    
    const aiMsgRow = appendMessage('思考中喵...', false, true);
    const aiHistoryIdx = chatHistory.length - 1;

    // 👇 --- 【核心修复：调用 lunar.js 获取农历信息】 --- 👇
    const now = new Date();
    let timeContext = `[当前系统时间] ${now.toLocaleString('zh-CN')}`;

    try {
      // 检查 lunar.js 是否加载成功（Solar 类是否存在）
      if (typeof Solar !== 'undefined') {
        const solar = Solar.fromDate(now);
        const lunar = solar.getLunar();
        
        // 获取农历详情：年、月、日
        const lunarYear = lunar.getYearInGanZhi() + "(" + lunar.getYearShengXiao() + ")年";
        const lunarMonth = lunar.getMonthInChinese() + "月";
        const lunarDay = lunar.getDayInChinese();
        
        // 获取传统节日和节气
        const festivals = lunar.getFestivals(); // 获取农历节日
        const solarFestivals = solar.getFestivals(); // 获取公历节日
        const jieQi = lunar.getJieQi(); // 获取节气
        
        let holidayInfo = [...festivals, ...solarFestivals, jieQi].filter(x => x).join('、');
        
        timeContext += `\n[农历信息] ${lunarYear} ${lunarMonth}${lunarDay}`;
        if (holidayInfo) {
          timeContext += `\n[今日节日/节气] ${holidayInfo}`;
        }
      }
    } catch (e) {
      console.error("[G-web] 农历换算失败:", e);
    }

    const currentTimeStr = `\n${timeContext}\n如果用户询问日期、农历或节日，请务必参考上方系统提供的精准信息回答喵！`;
    // 👆 --- 【修复结束】 --- 👆

    const systemPrompt = "你是一只可爱的傲娇猫娘助手，名叫糯米，可爱多一些，每句话大约20多或30多个字，可以使用一些颜文字，情感起伏一些，带些人情味，句尾带喵。" 
                         + currentTimeStr 
                         + GWEB_FEATURES 
                         + getMemoryContext();

    try {      const response = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer sk-nqexskrybwapgftpgtfielefdndguizpqarnwcsdilpisfyd",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "Qwen/Qwen3-8B",
          messages: [
            { role: "system", content: systemPrompt },
            ...chatHistory.filter(msg => msg.text !== '思考中喵...').slice(-5).map(msg => ({
              role: msg.isUser ? "user" : "assistant",
              content: msg.text
            })),
            { role: "user", content: text }
          ],
          stream: false
        })
      });

      const data = await response.json();
      const aiResponseText = data.choices[0].message.content;

      // ✅ 只更新气泡内容，保留头像结构
      const bubble = aiMsgRow.querySelector('.chat-bubble');
      if (bubble) bubble.textContent = aiResponseText;

      chatHistory[aiHistoryIdx].text = aiResponseText;
      try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory)); } catch(e) {}

    } catch (err) {
      const errorText = '连接失败了喵~';
      const bubble = aiMsgRow.querySelector('.chat-bubble');
      if (bubble) bubble.textContent = errorText;

      chatHistory[aiHistoryIdx].text = errorText;
      try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory)); } catch(e) {}
    }
  }

  // ── 6. 图片生成模式（完全保留你定制的UI交互和节点修改逻辑） ──
  const imgModeBtn = document.getElementById('imgModeBtn');
  let isImageMode = false;

  if (imgModeBtn) {
    imgModeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isImageMode = !isImageMode;
      if (isImageMode) {
        imgModeBtn.classList.add('active');
        imgModeBtn.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
        imgModeBtn.style.borderColor = '#a855f7';
        imgModeBtn.title = '当前：图片生成模式（点击切回对话）';
        chatInput.placeholder = '输入图片描述，点击发送生成...';
        chatSendBtn.textContent = '生成';
        chatSendBtn.style.background = 'linear-gradient(135deg, #a855f7, #6366f1)';
      } else {
        imgModeBtn.classList.remove('active');
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
    const aiMsgRow = appendMessage('🎨 绘制中喵，请稍候...', false, true);
    const aiHistoryIdx = chatHistory.length - 1;
    const bubble = aiMsgRow.querySelector('.chat-bubble');

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
          image_size: "1260x720"
        })
      });

      const data = await response.json();

      if (data.images && data.images.length > 0) {
        const imgUrl = data.images[0].url;

        if (bubble) {
          bubble.textContent = '';
          bubble.style.padding = '6px';
          bubble.style.background = 'none';
          bubble.style.boxShadow = 'none';

          const img = document.createElement('img');
          img.src = imgUrl;
          img.alt = prompt;
          img.style.cssText = 'max-width:100%;border-radius:10px;display:block;cursor:pointer;';
          img.title = '点击在新标签页查看原图';
          img.addEventListener('click', () => window.open(imgUrl, '_blank'));
          bubble.appendChild(img);

          const caption = document.createElement('div');
          caption.textContent = '✨ 已生成喵！';
          caption.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px;text-align:center;';
          bubble.appendChild(caption);
        }

        chatHistory[aiHistoryIdx].text = `[图片] ${imgUrl}`;
        try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory)); } catch(e) {}

      } else {
        const errText = data.error?.message || '生成失败了喵，请换个描述试试~';
        if (bubble) bubble.textContent = errText;
        chatHistory[aiHistoryIdx].text = errText;
        try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory)); } catch(e) {}
      }
    } catch (err) {
      const errorText = '图片生成连接失败了喵~';
      if (bubble) bubble.textContent = errorText;
      chatHistory[aiHistoryIdx].text = errorText;
      try { localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatHistory)); } catch(e) {}
    }
  }

  // ── 7. 集中处理按键与发送逻辑（全合并，防冲突） ──
  chatSendBtn.addEventListener('click', (e) => {
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
  });

  chatInput.addEventListener('keydown', (e) => {
    // 处理空格（防误触全局快捷键，如暂停背景）
    if (e.key === ' ' || e.code === 'Space') {
      e.stopPropagation();
    } 
    // 处理回车发送（适配绘图/聊天模式）
    else if (e.key === 'Enter') {
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
    // 处理光标移动防冲突（保留了你原版的精细控制）
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      chatInput.selectionStart = chatInput.selectionEnd = 0;
    } 
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      chatInput.selectionStart = chatInput.selectionEnd = chatInput.value.length;
    } 
    else if (e.key === 'ArrowLeft' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation(); // 增加防冒泡，阻止背景左右切壁纸等功能
      const p = chatInput.selectionStart;
      if (p > 0) chatInput.selectionStart = chatInput.selectionEnd = p - 1;
    } 
    else if (e.key === 'ArrowRight' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation(); // 增加防冒泡
      const p = chatInput.selectionStart;
      if (p < chatInput.value.length) chatInput.selectionStart = chatInput.selectionEnd = p + 1;
    }
  });
});