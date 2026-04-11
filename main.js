// =============================================
// 🔋 强制资源清理 - 改进版内存管理
// =============================================
// main.js - 添加在顶部或 DOMContentLoaded 内

// 全局状态标记
window.isPageVisible = true;
window.isUserActive = true;
let activeSleepTimer = null;

// 1. 监听页面可见性（切换标签页时触发）
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    window.isPageVisible = false;
    stopAllAnimations(); // 立即停止所有动画
  } else {
    window.isPageVisible = true;
    startAllAnimations(); // 恢复动画
  }
});

// 2. 监听用户活跃度（鼠标停止移动 5秒 后触发）
function resetActivityTimer() {
  window.isUserActive = true;
  startAllAnimations(); // 只要鼠标动了，就唤醒动画

  if (activeSleepTimer) clearTimeout(activeSleepTimer);
  
  // 5秒无操作，进入“浅睡眠”状态（只停止高频动画，保留时钟更新）
  activeSleepTimer = setTimeout(() => {
    window.isUserActive = false;
    stopHighCostAnimations(); 
  }, 8500); 
}

// 监听轻量级事件 (使用 passive 提升滚动性能)
window.addEventListener('mousemove', resetActivityTimer, { passive: true });
window.addEventListener('keydown', resetActivityTimer, { passive: true });
window.addEventListener('click', resetActivityTimer, { passive: true });

// --- 控制接口 ---

function stopAllAnimations() {
  // 1. 暂停鼠标拖尾 (调用 3.js 的接口)
  if (window.pauseMouseTrail) window.pauseMouseTrail();
  
  // 2. 暂停视差效果 (调用 4.js 的接口)
  if (window.pauseParallax) window.pauseParallax();
  
  // 3. 暂停背景视频
  const bgVideo = document.getElementById('bgVideo');
  if (bgVideo && !bgVideo.paused) bgVideo.pause();
  
  // 4. 暂停小猫 GIF (如果是 GIF 无法暂停，可以隐藏 DOM 减少重绘)
  // const catBox = document.getElementById('catBox');
  // if (catBox) catBox.style.display = 'none'; 
}

function stopHighCostAnimations() {
  // 仅暂停最吃 CPU 的鼠标拖尾和视差
  if (window.pauseMouseTrail) window.pauseMouseTrail();
  if (window.pauseParallax) window.pauseParallax();
  // 背景视频视情况而定，如果为了极致 0%，这里也要暂停
}
function startAllAnimations() {
  // 核心修改：如果当前窗口没有焦点，绝对不要恢复动画和视频！
  if (!document.hasFocus()) { 
      return; 
  }

  // 恢复所有逻辑
  if (window.resumeMouseTrail) window.resumeMouseTrail();
  if (window.resumeParallax) window.resumeParallax();
  
  const bgVideo = document.getElementById('bgVideo');
  // 只有在非每日图片模式且原本在播放时才恢复
  const wpType = localStorage.getItem("wallpaperType"); 
  
  // 再次检查可见性
  if (bgVideo && wpType !== 'daily_external' && window.isPageVisible) {
      bgVideo.play().catch(()=>{});
  }
}


// 精准计时器注册表：所有定时器创建后都在这里登记，卸载时只清理已知的
const _timerRegistry = { timeouts: new Set(), intervals: new Set() };
const _origSetTimeout = window.setTimeout.bind(window);
const _origSetInterval = window.setInterval.bind(window);
const _origClearTimeout = window.clearTimeout.bind(window);
const _origClearInterval = window.clearInterval.bind(window);

window.setTimeout = function(fn, delay, ...args) {
  const id = _origSetTimeout(() => {
    _timerRegistry.timeouts.delete(id);
    fn(...args);
  }, delay);
  _timerRegistry.timeouts.add(id);
  return id;
};
window.setInterval = function(fn, delay, ...args) {
  const id = _origSetInterval(fn, delay, ...args);
  _timerRegistry.intervals.add(id);
  return id;
};
window.clearTimeout = function(id) {
  _timerRegistry.timeouts.delete(id);
  _origClearTimeout(id);
};
window.clearInterval = function(id) {
  _timerRegistry.intervals.delete(id);
  _origClearInterval(id);
};

window.addEventListener('beforeunload', () => {
  // ✅ 只清理真实存在的定时器，避免暴力循环卡死浏览器
  _timerRegistry.timeouts.forEach(id => _origClearTimeout(id));
  _timerRegistry.intervals.forEach(id => _origClearInterval(id));
  _timerRegistry.timeouts.clear();
  _timerRegistry.intervals.clear();

  // 数据库连接关闭
  if (window.dbConnection) {
    try {
      window.dbConnection.close();
      window.dbConnection = null;
    } catch (e) {}
  }

});

let zenTimeInterval = null;
let idleTimer = null;
window.isMusicPlayerPlaying = window.isMusicPlayerPlaying || false;
window.currentLyricLine = window.currentLyricLine || "";

// ⚡ 优化: 缓存歌词内容，避免重复计算
let lastLyricText = '';
// main.js

function manageZenLyricsWidget() {
    const zenLyricsWidget = document.getElementById('zenLyricsWidget');
    const zenLyricsContent = document.getElementById('zenLyricsContent');
    if (!zenLyricsWidget || !zenLyricsContent) return;
  
    const player = window.GwebMusicPlayer;
    const isMusicReady = player && player.audio && typeof player.getLyrics === 'function';
  
    // 检查是否显示
    const shouldBeVisible = (window.isZenMode || window.isAutoZenActive) && isMusicReady && !player.audio.paused;
  
    if (shouldBeVisible) {
        const lyrics = player.getLyrics();
        // ✅ 尝试获取翻译歌词 (如果接口未更新，则默认为空数组)
        const transLyrics = (player.getTransLyrics && typeof player.getTransLyrics === 'function') 
                            ? player.getTransLyrics() 
                            : [];
        
        const currentTime = player.audio.currentTime + 0.3;
        
        let originalText = '...';
        let translationText = ''; // 翻译文本容器
  
        if (lyrics.length > 0) {
            // 1. 找原版歌词
            let activeIndex = lyrics.findIndex(line => line.time > currentTime) - 1;
            if (activeIndex === -2) activeIndex = lyrics.length - 1;
            if (activeIndex < 0) activeIndex = 0;
            
            if (lyrics[activeIndex]) {
                originalText = lyrics[activeIndex].text;
                
                // 2. ✅ 找对应的翻译歌词 (仅当存在翻译数据时)
                if (transLyrics.length > 0) {
                    // 同样的时间轴匹配逻辑
                    let transIndex = transLyrics.findIndex(line => line.time > currentTime) - 1;
                    if (transIndex === -2) transIndex = transLyrics.length - 1;
                    
                    if (transIndex >= 0 && transLyrics[transIndex]) {
                        translationText = transLyrics[transIndex].text;
                    }
                }
            }
        }
        
        // 3. ✅ 组合 HTML (原版在上，翻译在下)
        let finalHtml = `<div class="zen-lyric-origin">${originalText}</div>`;
        
        // 只有当翻译有内容，且当前不是"..."或空的时候才显示
        if (translationText && translationText.trim() !== '') {
            finalHtml += `<div class="zen-lyric-trans" style="font-size: 0.6em; opacity: 0.7; margin-top: 8px; font-weight: normal;">${translationText}</div>`;
        }
  
        // 性能优化: 只在内容变化时更新 DOM
        if (zenLyricsContent.innerHTML !== finalHtml) {
            zenLyricsContent.innerHTML = finalHtml;
        }
  
        if (!zenLyricsWidget.classList.contains('visible')) {
            zenLyricsWidget.classList.add('visible');
        }
    } else {
        if (zenLyricsWidget.classList.contains('visible')) {
            zenLyricsWidget.classList.remove('visible');
        }
    }
}



// ⚡ 优化: 缓存时间字符串，避免每秒都重新计算相同的值
let lastTimeString = '';

function updateZenTimeWidget() {
  const zenDateEl = document.getElementById('zenDate');
  const zenTimeEl = document.getElementById('zenTime');
  const zenWeekDayEl = document.getElementById('zenWeekDay');
  const zenWeatherEl = document.getElementById('zenWeather');
  const sourceWeekDayEl = document.getElementById('weekDay');
  const sourceWeatherEl = document.getElementById('weather-text');

  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const beijingTime = new Date(utc + 8 * 3600000);
  const year = beijingTime.getFullYear();
  const month = (beijingTime.getMonth() + 1).toString().padStart(2, '0');
  const date = beijingTime.getDate().toString().padStart(2, '0');
  const hours = beijingTime.getHours().toString().padStart(2, '0');
  const minutes = beijingTime.getMinutes().toString().padStart(2, '0');
  
  const newTimeString = `${hours}:${minutes}`;
  
  // ⚡ 优化: 只在时间变化时更新DOM
  if (zenTimeEl && lastTimeString !== newTimeString) {
    zenTimeEl.textContent = newTimeString;
    lastTimeString = newTimeString;
  }
  
  if (zenDateEl) zenDateEl.textContent = `${year}年${month}月${date}日`;
  
  if (zenWeekDayEl && sourceWeekDayEl) {
    zenWeekDayEl.textContent = sourceWeekDayEl.textContent;
  }
  if (zenWeatherEl && sourceWeatherEl) {
    const fullWeatherText = sourceWeatherEl.textContent || "天气加载中";
    const weatherParts = fullWeatherText.split('|');
    const weatherInfo = weatherParts.length > 1 ? weatherParts[1].trim() : fullWeatherText;
    zenWeatherEl.textContent = weatherInfo;
  }
}

function manageZenTimeWidget() {
  const zenTimeWidget = document.getElementById('zenTimeWidget');
  if (!zenTimeWidget) return;

  const shouldBeVisible = window.isZenMode || window.isAutoZenActive;

  if (shouldBeVisible) {
    if (!zenTimeWidget.classList.contains('visible')) {
      updateZenTimeWidget();
      zenTimeWidget.classList.add('visible');
    }
    if (!zenTimeInterval) {
      // ⚡ 优化: 将定时器频率从1秒改为2秒
      zenTimeInterval = setInterval(() => {
        updateZenTimeWidget();
        manageZenLyricsWidget();
      }, 2000);
    }
  } else {
    zenTimeWidget.classList.remove('visible');
    if (zenTimeInterval) {
      clearInterval(zenTimeInterval);
      zenTimeInterval = null;
    }
    manageZenLyricsWidget(); 
  }
}

// =============================================
// 🧘 全局禅模式控制 (性能优化版)
// =============================================
window.isZenMode = false;

const zenElements = {};
const zenSelectors = [
  '.search-container', '.bing-logo', '#quickPanel', '#quickPanelright', '#weather', 
  '#greetingMessage', '#beijingTime', '#weekDay', '.wallpaper-change-wrapper', 
  '#biliIcon', '#extraIcon', '#catBox', '#catSpeechBubble', '#suggestionList', 
  '#snakeWidget', '#todoWidget', '#calcWidget', '#fortuneWidget', '#calendarWidget', 
  '#aimWidget', '#keyWidget', '#pomodoroWidget', '#noteWidget', '#noiseWidget',
  '#cmdTrigger', '.content'
];

function cacheZenElements() {
  zenSelectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) zenElements[sel] = el;
  });
}

window.toggleZenMode = function() {
  window.isZenMode = !window.isZenMode;
  const isZen = window.isZenMode;
  if (window.setZenModeForPlayer) {
    window.setZenModeForPlayer(isZen);
  }
  Object.entries(zenElements).forEach(([sel, el]) => {
    if (!el) return;
    
    // 🎯 新增：专门处理 .content 的出场/入场动画
    if (sel === '.content') {
      if (isZen) {
        // 进入禅模式：先变透明(0.4s)，再移出屏幕(延迟0.4s执行)
        el.style.transition = 'opacity 0.4s ease, transform 0.4s ease 0.4s';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-100vh)'; // 移出屏幕外
        el.style.pointerEvents = 'none';
      } else {
        // 退出禅模式：先移回原位(0.4s)，再显示(延迟0.4s执行)
        el.style.transition = 'transform 0.03s ease, opacity 0.2s ease 0.05s';
        el.style.transform = '';
        el.style.opacity = '';
        el.style.pointerEvents = '';
      }
      return; // 处理完直接返回，不走下面的通用逻辑
    }

    if (el.id === 'mediaWidget') {
      el.style.transition = 'opacity 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), right 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
      el.style.willChange = 'opacity, transform, right';
    } else {
      el.style.transition = 'opacity 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
      el.style.willChange = 'opacity, transform';
    }

    if (isZen) {
      if (el.id === 'quickPanel') {
        el.style.transform = 'translate(-100%, -50%)';
        el.style.opacity = '0';
      } else if (el.id === 'quickPanelright') {
        el.style.transform = 'translate(100%, -50%)';
        el.style.opacity = '0';
      } else {
        el.style.opacity = '0';
        el.style.transform = 'scale(0.95)'; 
      }
      el.style.pointerEvents = 'none';    
    } else {
      el.style.opacity = '';       
      el.style.transform = '';
      el.style.pointerEvents = '';
      
      setTimeout(() => {
        if (!window.isZenMode) {
          if (el.id === 'mediaWidget') {
            el.style.willChange = '';
          } else {
            el.style.transition = ''; 
            el.style.willChange = ''; 
          }
        }
      }, 600);
    }
  });

  manageZenTimeWidget();

  if (typeof showBubble === 'function') {
    const catVideo = document.getElementById('catVideo');
    const isCatVisible = catVideo && catVideo.style.display !== 'none';
    
    if (isCatVisible) {
        showBubble(isZen ? "禅模式已开启,享受宁静吧喵~🍃" : "欢迎回来喵!✨", false, true);
    }
  }
};

// =============================================
// 💤 自动闲置禅模式 (性能优化版)
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  const IDLE_TIMEOUT = 12000; 

  window.isAutoZenActive = false;
  
  let lastResetTime = 0;
  const RESET_THROTTLE = 3000;
  
  function enterAutoZen() {
    if (window.isZenMode || window.isAutoZenActive) return;
    window.isAutoZenActive = true;
    if (window.setZenModeForPlayer) {
      window.setZenModeForPlayer(true);
    }
    const musicWidget = document.getElementById('mediaWidget');
    if (musicWidget && musicWidget.classList.contains('visible')) {
      musicWidget.classList.remove('shifted-left');
    }

    Object.entries(zenElements).forEach(([sel, el]) => {
      if (sel === '#mediaWidget' || !el) return;
      
      // 🎯 新增：.content 专属逻辑 (进入禅模式：隐藏)
      if (sel === '.content') {
        // 【隐藏】总用时 0.45s：先变透明(0.2s)，再移出屏幕(耗时0.25s，延迟0.2s后执行)
        el.style.transition = 'opacity 0.2s ease, transform 0.25s ease 0.2s';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-100vh)'; 
        el.style.pointerEvents = 'none';
        return; 
      }
      
      el.style.transition = 'opacity 0.6s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.6s cubic-bezier(0.25, 0.8, 0.25, 1)';
      el.style.willChange = 'opacity, transform';
      
      if (el.id === 'quickPanel') {
        el.style.transform = 'translate(-100%, -50%)';
        el.style.opacity = '0';
      } else if (el.id === 'quickPanelright') {
        el.style.transform = 'translate(100%, -50%)';
        el.style.opacity = '0';
      } else {
        el.style.transform = 'scale(0.95)';
        el.style.opacity = '0';
      }
      el.style.pointerEvents = 'none';
    });
    
    manageZenTimeWidget();
  }

  function exitAutoZen() {
    if (!window.isAutoZenActive) return;
    window.isAutoZenActive = false; 

    Object.entries(zenElements).forEach(([sel, el]) => {
      if (sel === '#mediaWidget' || !el) return;
      if (!window.isZenMode && window.setZenModeForPlayer) {
        window.setZenModeForPlayer(false);
      }

      // 🎯 新增：.content 专属逻辑 (退出禅模式：显示并恢复)
      if (sel === '.content') {
        // 【显示】接力总用时 0.45s：先隐身移回原位(0.25s)，再渐显(耗时0.2s，延迟0.25s后执行)
        el.style.transition = 'transform 0.25s cubic-bezier(0.1, 0.7, 0.1, 1), opacity 0.2s ease 0.25s';
        el.style.transform = '';
        el.style.opacity = '';
        el.style.pointerEvents = '';
        return;
      }

      el.style.opacity = '';
      el.style.transform = '';
      el.style.pointerEvents = '';
      
      setTimeout(() => {
        if (!window.isAutoZenActive && !window.isZenMode) {
          el.style.transition = '';
          el.style.willChange = '';
        }
      }, 600);
    });

    manageZenTimeWidget();

    const musicWidget = document.getElementById('mediaWidget');
    const rightPanel = document.getElementById('quickPanelright');

    if (musicWidget && musicWidget.classList.contains('visible') && 
        rightPanel && !rightPanel.classList.contains('collapsedright')) {
      musicWidget.classList.add('shifted-left');
    }
  }

  window.isIdleTimerGloballyDisabled = false; 

  function resetIdleTimer() {
    const now = Date.now();
    if (now - lastResetTime < RESET_THROTTLE) return;
    lastResetTime = now;

    if (window.isAutoZenActive) {
        exitAutoZen();
    }
    if (idleTimer) clearTimeout(idleTimer);

    if (!window.isIdleTimerGloballyDisabled && !window.isZenMode) {
        idleTimer = setTimeout(enterAutoZen, IDLE_TIMEOUT);
    }
  }

  let idleTimer; // 确保这里有声明
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'wheel'];
  events.forEach(evt => {
    document.addEventListener(evt, resetIdleTimer, { 
      passive: true,
      capture: false 
    });
  });

  cacheZenElements();
  resetIdleTimer();
});// =============================================
// 🔋 强制省电策略：失去焦点立即暂停
// =============================================
window.addEventListener('blur', () => {
    const bgVideo = document.getElementById('bgVideo');
    // 只要失去焦点，无条件尝试暂停
    if (bgVideo && !bgVideo.paused) {
        bgVideo.pause();
    }
    
    // 停止其他耗能动画
    if (window.pauseMouseTrail) window.pauseMouseTrail();
    if (window.pauseParallax) window.pauseParallax();
}, { passive: true });


window.addEventListener('focus', () => {
    // 只有当用户主动点回来时，才恢复所有动画
    window.isPageVisible = true;
    window.isUserActive = true;
    startAllAnimations(); // 调用上面修改过的带锁函数
}, { passive: true });


document.addEventListener('visibilitychange', () => {
  const bgVideo = document.getElementById('bgVideo');
  if (!bgVideo || bgVideo.style.display === 'none') return;
  
  if (document.hidden) {
    bgVideo.pause();
  } else {
    if (!bgVideo.src.includes('.jpg')) {
       bgVideo.play().catch(() => {});
    }
  }
}, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
    const copyrightLink = document.getElementById('copyrightLink');
    const copyrightModal = document.getElementById('copyrightModal');
    const copyrightCloseBtn = document.getElementById('copyrightClose');

    if (!copyrightLink || !copyrightModal || !copyrightCloseBtn) {
        console.error('未能找到版权声明相关的必要元素。');
        return;
    }

    copyrightLink.addEventListener('click', (e) => {
        e.preventDefault();
        copyrightModal.style.display = 'flex';
        requestAnimationFrame(() => {
            copyrightModal.classList.add('show');
        });
    });

    copyrightCloseBtn.addEventListener('click', () => {
        copyrightModal.classList.add('closing');
        setTimeout(() => {
            copyrightModal.classList.remove('show');
            copyrightModal.classList.remove('closing');
            copyrightModal.style.display = 'none';
        }, 520);
    });
    
    copyrightModal.addEventListener('click', (e) => {
        if (e.target === copyrightModal) {
            copyrightCloseBtn.click();
        }
    });
});

// =============================================
// ⌨️ 禅模式快捷键提示按钮管理
// =============================================
(function() {
  'use strict';

  const POPUP_ID = 'zenHintPopup';
  const BTN_ID   = 'zenHintBtn';

  // 将按钮定位到 mediaWidget 正左侧（仅在 rect 有效时才写入坐标）
  function positionBtn() {
    const btn    = document.getElementById(BTN_ID);
    const widget = document.getElementById('mediaWidget');
    if (!btn || !widget) return;

    const rect  = widget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // widget 尚未渲染完毕，跳过

    const GAP   = 10;
    const BTN_W = 28;
    btn.style.top    = (rect.top + rect.height / 2 - BTN_W / 2) + 'px';
    btn.style.left   = (rect.left - BTN_W - GAP) + 'px';
    btn.style.bottom = '';
    btn.style.right  = '';
  }

  // 更新按钮的可见性（隐藏时只改透明度，坐标保持不变）
  function updateZenHintBtn() {
    const btn    = document.getElementById(BTN_ID);
    const popup  = document.getElementById(POPUP_ID);
    const widget = document.getElementById('mediaWidget');
    if (!btn || !popup || !widget) return;

    const zenActive    = !!(window.isZenMode || window.isAutoZenActive);
    const musicVisible = widget.classList.contains('visible');

    if (!zenActive) {
      // 退出禅模式：隐藏并关闭弹窗
      btn.style.opacity       = '0';
      btn.style.pointerEvents = 'none';
      popup.classList.remove('open');
      return;
    }

    if (musicVisible) {
      // 音乐播放中：先定位（等过渡完成后），再显示
      positionBtn();
      btn.style.opacity       = '1';
      btn.style.pointerEvents = 'auto';
    } else {
      // 音乐暂停：只淡出，坐标不动，弹窗关闭
      btn.style.opacity       = '0';
      btn.style.pointerEvents = 'none';
      popup.classList.remove('open');
    }
  }

  // 点击按钮切换弹窗
  function initZenHintToggle() {
    const btn   = document.getElementById(BTN_ID);
    const popup = document.getElementById(POPUP_ID);
    if (!btn || !popup) return;

    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      popup.classList.toggle('open');
    });

    // 点击其他区域关闭弹窗
    document.addEventListener('click', function(e) {
      if (!popup.classList.contains('open')) return;
      if (popup.contains(e.target) || e.target === btn) return;
      popup.classList.remove('open');
    });
  }

  // 拦截 toggleZenMode 和 enterAutoZen/exitAutoZen，在其执行后刷新按钮状态
  function patchZenHooks() {
    const orig = window.toggleZenMode;
    if (orig) {
      window.toggleZenMode = function() {
        orig.apply(this, arguments);
        setTimeout(updateZenHintBtn, 50);
      };
    }
  }

  // 监听 mediaWidget 的 class 变化（visible 被加减时）
  function observeMediaWidget() {
    const widget = document.getElementById('mediaWidget');
    if (!widget) return;
    const mo = new MutationObserver(function() {
      // 延迟等待 CSS 过渡完成后再计算坐标，避免拿到动画中途的错误位置
      setTimeout(updateZenHintBtn, 220);
    });
    mo.observe(widget, { attributes: true, attributeFilter: ['class', 'style'] });
  }

  // 禅状态改变时 manageZenTimeWidget 会被调用，给它挂钩
  const origManageZen = window.manageZenTimeWidget;
  if (typeof origManageZen === 'function') {
    window.manageZenTimeWidget = function() {
      origManageZen.apply(this, arguments);
      setTimeout(updateZenHintBtn, 50);
    };
  }

  document.addEventListener('DOMContentLoaded', function() {
    initZenHintToggle();
    patchZenHooks();
    observeMediaWidget();
    // 每 2 秒轮询一次，兜底同步
    setInterval(updateZenHintBtn, 2000);
    updateZenHintBtn();
  });
})();
