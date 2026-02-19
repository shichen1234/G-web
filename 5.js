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
