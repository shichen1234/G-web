// === 🌌 背景动态特效 (极致性能优化版：自动休眠 + 事件驱动) ===

// 1. 全局变量
let bgImg = null;
let bgVid = null;
let parallaxId = null;
let isParallaxPaused = false; // 全局暂停标记（由 main.js 控制）

// 2. 对外接口：重新初始化（换壁纸后调用）
window.reinitParallaxEffect = function() {
    console.log('[Parallax] 正在重新初始化背景元素引用...');
    bgImg = document.getElementById('bgImage');
    bgVid = document.getElementById('bgVideo');
    
    // 初始化位置数据
    [bgImg, bgVid].forEach(el => {
        if (el) {
            // 如果之前没有数据，初始化为中心点
            if (typeof el.currentX === 'undefined') {
                el.currentX = 0;
                el.currentY = 0;
                el.currentScale = 1.0;
                el.targetX = 0; // 新增：目标位置 X
                el.targetY = 0; // 新增：目标位置 Y
            }
        }
    });

    // 重新启动一次循环以确保位置正确
    if (!parallaxId && !isParallaxPaused) {
        renderLoop();
    }
};

// 3. 对外接口：暂停与恢复（供 main.js 休眠逻辑调用）
window.pauseParallax = function() {
    isParallaxPaused = true;
    if (parallaxId) {
        cancelAnimationFrame(parallaxId);
        parallaxId = null;
    }
};

window.resumeParallax = function() {
    isParallaxPaused = false;
    // 不立即启动，等鼠标动了再启动，节省资源
};

// 4. 核心渲染循环 (智能休眠版)
function renderLoop() {
    // 🛑 退出条件 1: 全局暂停
    if (isParallaxPaused) {
        parallaxId = null;
        return;
    }

    const isParallaxOn = localStorage.getItem('parallaxEnabled') === 'true';
    let activeBg = (bgVid && bgVid.style.display !== 'none') ? bgVid : bgImg;

    // 如果没有背景或特效关闭，尝试复位后停止
    if (!activeBg) {
        parallaxId = null;
        return;
    }

    // --- A. 目标位置计算 ---
    // 如果开启特效，目标是鼠标位置；如果关闭，目标是 0 (复位)
    let destX = 0, destY = 0, destScale = 1.0;
    
    if (isParallaxOn) {
        destX = activeBg.targetX || 0;
        destY = activeBg.targetY || 0;
        destScale = 1.05;
    } else {
        destX = 0;
        destY = 0;
        destScale = 1.0;
    }

    // --- B. 运动差值检查 (自动休眠核心) ---
    // 计算当前位置与目标位置的距离
    const diffX = Math.abs(activeBg.currentX - destX);
    const diffY = Math.abs(activeBg.currentY - destY);
    const diffScale = Math.abs(activeBg.currentScale - destScale);

    // 🛑 退出条件 2: 已经到位了 (误差极小)
    if (diffX < 0.05 && diffY < 0.05 && diffScale < 0.001) {
        // 直接设置为最终值，防止微小抖动
        activeBg.style.transform = `scale(${destScale}) translate3d(${destX}px, ${destY}px, 0)`;
        activeBg.currentX = destX;
        activeBg.currentY = destY;
        activeBg.currentScale = destScale;
        
        parallaxId = null; // 💤 标记循环停止
        return; 
    }

    // --- C. 执行平滑插值 (Lerp) ---
    activeBg.currentX += (destX - activeBg.currentX) * 0.05;
    activeBg.currentY += (destY - activeBg.currentY) * 0.05;
    activeBg.currentScale += (destScale - activeBg.currentScale) * 0.05;

    // --- D. 应用样式 ---
    activeBg.style.transition = 'none'; // 必须禁用 CSS transition
    activeBg.style.transform = `scale(${activeBg.currentScale}) translate3d(${activeBg.currentX}px, ${activeBg.currentY}px, 0)`;

    // 请求下一帧
    parallaxId = requestAnimationFrame(renderLoop);
}

// 5. 初始化逻辑
document.addEventListener('DOMContentLoaded', () => {
    const parallaxToggle = document.getElementById('parallaxToggle');

    // 初始化引用
    window.reinitParallaxEffect();

    // 绑定开关
    if (parallaxToggle) {
        parallaxToggle.checked = localStorage.getItem('parallaxEnabled') === 'true';
        parallaxToggle.addEventListener('change', (e) => {
            localStorage.setItem('parallaxEnabled', e.target.checked);
            // 开关变动时，强制唤醒一次循环以应用新状态(复位或开启)
            if (!parallaxId && !isParallaxPaused) {
                renderLoop();
            }
        });
    }

    // 6. 鼠标移动监听 (计算目标值 + 唤醒循环)
// 4.js - 优化视差鼠标监听
let lastFrameTime = 0;

document.addEventListener('mousemove', (e) => {
    // 限制每 16ms 只计算一次 (约 60fps)
    const now = Date.now();
    if (now - lastFrameTime < 16) return; 
    lastFrameTime = now;

    if (isParallaxPaused || localStorage.getItem('parallaxEnabled') !== 'true') return;

    let activeBg = (bgVid && bgVid.style.display !== 'none') ? bgVid : bgImg;
    if (!activeBg) return;

    // 计算逻辑保持不变...
    activeBg.targetX = (window.innerWidth - e.clientX * 2) / 45;
    activeBg.targetY = (window.innerHeight - e.clientY * 2) / 45;

    if (!parallaxId) {
        renderLoop();
    }
}, { passive: true });

});


// =============================================
//  以下是 4.js 文件中原有的其他代码，保持不变
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const aiSwitch = document.getElementById("aiSwitch");
  const searchContainer = document.querySelector(".search-container");
  const searchForm = document.querySelector("form");
  const searchInput = document.getElementById("searchInput");
  
  let isAiMode = false; 
  localStorage.setItem("isAiMode", "false"); 

  aiSwitch.classList.remove("active");
  searchContainer.classList.remove("ai-mode");

  if (aiSwitch) {
    aiSwitch.addEventListener("click", (e) => {
      e.preventDefault();
      isAiMode = !isAiMode;
      
      if (isAiMode) {
        aiSwitch.classList.add("active");
        searchContainer.classList.add("ai-mode");
        if (typeof showBubble === "function") showBubble("AI 模式开启喵！有问题尽管问豆包～");
      } else {
        aiSwitch.classList.remove("active");
        searchContainer.classList.remove("ai-mode");
        if (typeof showBubble === "function") showBubble("回到普通搜索模式啦喵～");
      }
      localStorage.setItem("isAiMode", isAiMode);
    });
  }

if (searchForm) {
  searchForm.addEventListener("submit", (e) => {
    if (isAiMode) {
      e.preventDefault(); 
      const query = searchInput.value.trim();
      if (query) {
        chrome.storage.local.set({ 
          "pending_query": query,
          "auto_send_timestamp": Date.now()
        }, () => {
          window.open("https://www.doubao.com/chat/", "_blank");
        });
      }
    }
  });
}
});
// ... (4.js 中剩余的所有其他代码都复制到这里)

document.addEventListener('DOMContentLoaded', () => {
  const contextMenu = document.getElementById('customContextMenu');
  const scope = document.body;
let menuCloseTimer = null;
document.addEventListener('contextmenu', (event) => {
  event.preventDefault(); // 阻止默认菜单

  const { clientX: mouseX, clientY: mouseY } = event;
  const { innerWidth: winW, innerHeight: winH } = window;
  const target = event.target;

  // 判断是输入框菜单还是主菜单
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  const mainCtxMenu = document.getElementById('customContextMenu');
  const inputCtxMenu = document.getElementById('inputContextMenu');
  
  const targetMenu = isInput ? inputCtxMenu : mainCtxMenu;
  const otherMenu = isInput ? mainCtxMenu : inputCtxMenu;

  // 1. 关闭不需要的那个菜单 (比如从主菜单切换到输入框菜单)
  if (otherMenu.classList.contains('visible')) {
      otherMenu.classList.remove('visible');
      setTimeout(() => otherMenu.style.display = 'none', 250);
  }

  // 2. ✨ 处理“前一个菜单”的消失动画 (幽灵模式)
  // 如果目标菜单已经在显示中，我们需要克隆一个替身留在原地播放“消失”动画
  if (targetMenu.classList.contains('visible')) {
      const ghost = targetMenu.cloneNode(true); // 克隆DOM
      const rect = targetMenu.getBoundingClientRect();

      // 设置替身样式：固定在旧位置
      ghost.id = "ghost-menu-" + Date.now(); 
      ghost.style.position = 'fixed';
      ghost.style.left = `${rect.left}px`;
      ghost.style.top = `${rect.top}px`;
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      ghost.style.display = 'block';
      ghost.style.zIndex = '99998'; // 层级比新菜单低一点
      ghost.style.pointerEvents = 'none'; // 替身不可点击
      
      // 保持 visible 类，确保它初始状态是可见的
      ghost.classList.add('visible'); 
      document.body.appendChild(ghost);

      // 强制重绘，确保浏览器认出了替身
      void ghost.offsetWidth;

      // 让替身播放消失动画 (移除 visible 触发 CSS transition)
      ghost.classList.remove('visible');

      // 动画结束后销毁替身
      setTimeout(() => ghost.remove(), 400); 
  }

  // 3. 准备输入框ID (如果是输入框菜单)
  if (isInput) {
    if (!target.id) target.id = 'temp_input_' + Date.now();
    inputCtxMenu.dataset.targetId = target.id;
  }

  // 4. ✨ 执行“后一个菜单”的出现动画 (真身瞬移并重新弹出)
  positionAndShowMenu(targetMenu, mouseX, mouseY, winW, winH);
});
function positionAndShowMenu(menu, x, y, winW, winH) {
  // 1. 【核心修复】暂时禁用过渡动画
  // 这一步告诉浏览器：“不要慢慢变没，立刻瞬间回到初始状态！”
  menu.style.transition = 'none';
  
  // 2. 重置状态
  // 移除 visible 类，此时因为 transition 被禁用了，菜单会瞬间变成 opacity: 0 和 scale(0.8)
  menu.classList.remove('visible');
  
  // 确保它是 block 状态以便计算尺寸
  menu.style.display = 'block';
  menu.style.visibility = 'visible'; // 保持可见性以便计算尺寸，但因为 opacity 是 0 所以看不见

  // 3. 计算并设置新位置
  const rect = menu.getBoundingClientRect();
  const menuW = rect.width;
  const menuH = rect.height;

  let posX = x;
  let posY = y;

  // 边界判定
  if (posX + menuW > winW) posX = winW - menuW - 8;
  if (posY + menuH > winH) posY = winH - menuH - 8;

  menu.style.left = `${posX}px`;
  menu.style.top = `${posY}px`;

  // 4. 【强制重绘】(Reflow)
  // 强制浏览器确认“我现在已经是透明且缩小的状态了，且位置已更新”
  void menu.offsetWidth; 

  // 5. 【恢复过渡】
  // 清除行内样式，让 CSS 文件里定义的 transition重新生效
  menu.style.transition = ''; 

  // 6. 【激活动画】
  // 下一帧添加 visible 类，浏览器检测到从 scale(0.8) -> scale(1)，于是播放 Q 弹动画
  requestAnimationFrame(() => {
      menu.classList.add('visible');
  });
}
// --- 🔧 辅助：点击空白处关闭菜单 ---
// --- 🔧 辅助：点击空白处关闭菜单 ---
document.addEventListener('click', (e) => {
  // 🛑 核心修复：如果点击的目标在菜单（包括主菜单和子菜单）内部，
  // 直接返回，不要执行下面的关闭逻辑！
  if (e.target.closest('.context-menu')) return;

  // 只有点击菜单“外面”的空白处时，才执行关闭
  const menus = document.querySelectorAll('.context-menu');
  menus.forEach(menu => {
    if (menu.classList.contains('visible')) {
      menu.classList.remove('visible');
      setTimeout(() => {
        // 双重检查，防止动画期间状态改变
        if (!menu.classList.contains('visible')) {
          menu.style.display = 'none';
        }
      }, 250);
    }
  });
});

// 滚动时也关闭
document.addEventListener('scroll', () => {
    document.querySelectorAll('.context-menu.visible').forEach(menu => menu.classList.remove('visible'));
}, { capture: true, passive: true });
// --- 🔧 输入框菜单功能 (复制/粘贴/剪切) ---
const inputCtxMenu = document.getElementById('inputContextMenu');
if (inputCtxMenu) {
  inputCtxMenu.addEventListener('click', async (e) => {
    e.stopPropagation();
    const li = e.target.closest('li');
    if (!li) return;

    const action = li.dataset.action;
    const targetId = inputCtxMenu.dataset.targetId;
    const inputEl = document.getElementById(targetId);

    // 操作后关闭菜单
    inputCtxMenu.classList.remove('visible');
    setTimeout(() => { inputCtxMenu.style.display = 'none'; }, 200);

    if (!inputEl) return;

    // 🔴 修改点：先开启标记，再聚焦，稍后关闭标记
    isMenuOperating = true; 
    inputEl.focus();
    // 100毫秒后关闭标记，足以覆盖 focus 事件的触发时间
    setTimeout(() => { isMenuOperating = false; }, 100);

    switch (action) {
      case 'copy':
        const selectedText = window.getSelection().toString();
        if (selectedText) {
            navigator.clipboard.writeText(selectedText);
            if (typeof showBubble === 'function') showBubble("已复制到剪贴板喵！📄");
        } else {
            document.execCommand('copy');
            if (typeof showBubble === 'function') showBubble("已复制喵！📄");
        }
        break;
      case 'cut':
        document.execCommand('cut');
        if (typeof showBubble === 'function') showBubble("已剪切喵！✂️");
        break;
      case 'paste':
        try {
          const text = await navigator.clipboard.readText();
          if (typeof inputEl.setRangeText === 'function') {
            inputEl.setRangeText(text);
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          } else {
            inputEl.value += text;
          }
          if (typeof showBubble === 'function') showBubble("粘贴成功喵！📋");
        } catch (err) {
            if (typeof showBubble === 'function') showBubble("浏览器限制，请用 Ctrl+V 粘贴喵~");
        }
        break;
      case 'select-all':
        inputEl.select();
        break;
    }
  });
}

// --- 🔧 主菜单点击逻辑 ---
const mainCtxMenu = document.getElementById('customContextMenu');
if (mainCtxMenu) {
    mainCtxMenu.addEventListener('click', (e) => {
        const li = e.target.closest('li');
        if (!li) return;
        
        // 1. 【保持打开】如果点击的是“鼠标拖尾”这种带子菜单的父选项
        // 直接 return，什么都不做（菜单保持打开，方便你展示子菜单）
        if (li.classList.contains('has-submenu')) return;

        // 2. 【关闭菜单】点击其他任何选项（例如“珍珠泡沫”、“刷新页面”）
        // 都会执行这一步：关闭菜单
        mainCtxMenu.classList.remove('visible');
        setTimeout(() => { mainCtxMenu.style.display = 'none'; }, 200);

        // 3. 执行功能
        const action = li.dataset.action;
        if (typeof handleMenuAction === 'function' && action) {
            handleMenuAction(action);
        }
    });
}

// ... 这里的 handleMenuAction 和 toggleZenMode 保持你原来的代码不变 ...
  // 功能分发函数
  function handleMenuAction(action) {
    switch (action) {
      case 'wallpaper':
        // 调用你现有的打开壁纸弹窗逻辑
        const wpModal = document.getElementById('wallpaperModal');
        if (wpModal) {
             wpModal.style.display = "flex";
             setTimeout(() => wpModal.classList.add("show"), 10);
        }
        break;
        
      case 'zen':
        // 禅模式：切换 UI 显示/隐藏 (这是我根据你之前需求建议的功能)
        toggleZenMode();
        break;

      case 'reload':
        location.reload();
        break;

case 'about':
        if (typeof showBubble === 'function') {
           // 1. 把所有文案放在一个数组里
           const aboutMessages = [
            "喵？作者藏在屏幕的某个角落里睡觉呢，把鼠标移过去找找看～",
            "偷偷告诉你，把鼠标移到角落里晃一晃，或许会有神奇的发现喵！✨",
            "这种事情都要问我嘛？自己去角落里翻翻看，找到了算你厉害喵～",
            "作者太害羞躲起来啦！快去屏幕边缘把他“抓”出来喵！🐾"
           ];
           
           // 2. 随机抽取其中一条
           const randomMsg = aboutMessages[Math.floor(Math.random() * aboutMessages.length)];
           
           // 3. 显示抽中的那一条
           showBubble(randomMsg);
        }
        break;
        case 'fullscreen':
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          if (typeof showBubble === 'function') showBubble("沉浸模式开启喵！🖥️");
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
        break;
        // ... 之前的 case ...
      
      // 新增：鼠标拖尾处理
      case 'trail-particle':
        if (window.changeTrailStyle) window.changeTrailStyle('particle');
        break;
      case 'trail-line':
        if (window.changeTrailStyle) window.changeTrailStyle('line');
        break;
      case 'trail-sparkle':
        if (window.changeTrailStyle) window.changeTrailStyle('sparkle');
        break;
        case 'trail-laser':
        if (window.changeTrailStyle) window.changeTrailStyle('laser');
        break;
      case 'trail-off':
        if (window.changeTrailStyle) window.changeTrailStyle('off');
        break;
        
      // ... 原来的 case (zen, reload, about 等) ...
    }
  }
});
// === 🖥️ 全屏状态监听 (自动更新菜单文字) ===
  document.addEventListener('fullscreenchange', () => {
    const fullscreenLi = document.querySelector('li[data-action="fullscreen"] span');
    if (!fullscreenLi) return;

    if (document.fullscreenElement) {
      // 当前是全屏状态 -> 显示“退出全屏”
      fullscreenLi.textContent = "🖥️ 退出全屏";
    } else {
      // 当前不是全屏 -> 显示“切换全屏”
      fullscreenLi.textContent = "🖥️ 切换全屏";
    }
  });
/* ============================================================
   右侧面板：开关逻辑 + 布局调整 (修复版：绑定组件不散开)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const panel = document.getElementById('quickPanelright');
  const openBtnRight = document.querySelector('.openBtnright');
  const closePanelRightX = document.getElementById('closePanelRightX');
  
  // 编辑模式相关
  const container = panel ? panel.querySelector('.icons') : null;
  const settingBtn = document.getElementById('panelSettingBtn');

  if (!panel) return;

  // --- 1. 辅助函数：保存当前顺序 ---
  function saveCurrentOrder() {
    if (!container) return;
    // 只保存带有 draggable-widget 的顶层元素 ID
    const currentOrder = Array.from(container.querySelectorAll('.draggable-widget')).map(el => el.id);
    localStorage.setItem('right_panel_order', JSON.stringify(currentOrder));
  }

  // --- 2. 辅助函数：退出编辑模式 ---
  function exitEditMode(shouldSave = false) {
    if (!panel.classList.contains('edit-mode')) return;
    
    if (shouldSave) {
      saveCurrentOrder();
    }

    panel.classList.remove('edit-mode');
    document.querySelectorAll('.draggable-widget').forEach(w => {
      w.setAttribute('draggable', 'false');
    });
  }
  // --- 3. 面板开关逻辑 (防卡顿最终版) ---
  function toggleRightPanel(forceClose = false) {
    const musicWidget = document.getElementById('mediaWidget');
    const panelContent = panel.querySelector('.panelright'); // 获取内部内容容器

    // ⚡️ 性能优化核心：动画开始前，暂时移除毛玻璃和阴影
    // 这会让 GPU 渲染帧率从 30fps 提升到 60fps+
    if (panelContent) {
        panelContent.style.backdropFilter = 'none';
        panelContent.style.webkitBackdropFilter = 'none';
        panelContent.style.boxShadow = 'none'; 
        // 稍微降低透明度补偿视觉，避免背景全黑太突兀
        panelContent.style.background = 'rgba(0, 0, 0, 0.85)'; 
    }

    // 1. 执行开关操作 (CSS transform 动画)
    if (forceClose) {
      panel.classList.add('collapsedright');
      if (openBtnRight) openBtnRight.textContent = '◀';
      exitEditMode(false); 
    } else {
      panel.classList.toggle('collapsedright');
      const isClosed = panel.classList.contains('collapsedright');
      
      if (openBtnRight) openBtnRight.textContent = isClosed ? '◀' : '▶';
      if (isClosed) exitEditMode(false);
    }

    // 2. 处理音乐组件的避让逻辑
    if (musicWidget) {
      const isPanelClosed = panel.classList.contains('collapsedright');
      if (isPanelClosed) {
        musicWidget.classList.remove('shifted-left');
      } else {
        if (musicWidget.classList.contains('visible')) {
          musicWidget.classList.add('shifted-left');
        }
      }
    }

    // ⚡️ 性能优化核心：动画结束 (400ms) 后，悄悄恢复特效
    // 420ms 比 CSS 的 0.4s 稍长，确保停稳后再渲染
    setTimeout(() => {
        if (panelContent) {
            // 清空行内样式，让 CSS 类中定义的高级特效重新生效
            panelContent.style.backdropFilter = '';
            panelContent.style.webkitBackdropFilter = '';
            panelContent.style.boxShadow = '';
            panelContent.style.background = ''; // 恢复原来的背景色
        }
        
        // 额外优化：如果面板打开了，通知贪吃蛇等组件可以开始刷新画面了
        const isClosed = panel.classList.contains('collapsedright');
        if (!isClosed) {
             // 如果你有组件需要在打开时唤醒，可以在这里处理
             // 例如: if (window.resumeSnakeGame) window.resumeSnakeGame();
        }
    }, 420);
  }


  if (openBtnRight) {
    openBtnRight.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRightPanel();
    });
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#panelSettingBtn')) return;
    if (!panel.contains(e.target) && !panel.classList.contains('collapsedright')) {
      toggleRightPanel(true);
    }
  });

  // --- 4. 布局调整核心逻辑 (关键修复) ---
  
  function loadSavedOrder() {
    const savedOrder = JSON.parse(localStorage.getItem('right_panel_order') || '[]');
    if (savedOrder.length > 0 && container) {
      const fragment = document.createDocumentFragment();
      let hasChange = false;
      
      savedOrder.forEach(id => {
        const el = document.getElementById(id);
        // 🔴 关键修复：必须检查 el 是否包含 draggable-widget 类
        // 这样可以防止旧数据把内部的备忘录(没有该类)从父容器里错误的提取出来
        if (el && container.contains(el) && el.classList.contains('draggable-widget')) {
          fragment.appendChild(el);
          hasChange = true;
        }
      });
      
      // 追加未保存的新元素
      const allWidgets = Array.from(container.querySelectorAll('.draggable-widget'));
      allWidgets.forEach(el => {
        if (!fragment.contains(el) && container.contains(el)) {
          fragment.appendChild(el);
        }
      });
      if (hasChange) container.appendChild(fragment);
    }
  }

  // 初始化
  if (container) {
    const allWidgets = container.querySelectorAll('.draggable-widget');
    allWidgets.forEach(w => w.setAttribute('draggable', 'false'));
    loadSavedOrder();
  }

  // 齿轮点击事件
  if (settingBtn) {
    settingBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const isEditing = panel.classList.contains('edit-mode');

      if (isEditing) {
        exitEditMode(true); 
        if (typeof showBubble === 'function') showBubble("布局已保存，下次也是这样喵～💾");
      } else {
        panel.classList.add('edit-mode');
        container.querySelectorAll('.draggable-widget').forEach(w => {
          w.setAttribute('draggable', 'true');
        });
        if (typeof showBubble === 'function') showBubble("开始调整布局吧！调整完再点齿轮保存哦～🛠️");
      }
    });
  }

// --- 5. 拖拽排序逻辑 (升级版：带 FLIP 丝滑动画) ---
  let dragSrcWidget = null;
  if (container) {
    const widgets = container.querySelectorAll('.draggable-widget');
    
    widgets.forEach(widget => {
      // A. 开始拖拽
      widget.addEventListener('dragstart', function(e) {
        if (!panel.classList.contains('edit-mode')) {
          e.preventDefault(); return;
        }
        // 防冲突：备忘录条目等
        if (e.target.closest('#todoList li') || e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') {
           return; 
        }

        dragSrcWidget = this;
        e.dataTransfer.effectAllowed = 'move';
        
        // 延迟添加样式，让幻影保持原样，本体变半透明
        setTimeout(() => this.classList.add('dragging'), 0);
      });

      // B. 结束拖拽
      widget.addEventListener('dragend', function() {
        this.classList.remove('dragging');
        dragSrcWidget = null;
        
        // 🧹 清理所有动画残留样式 (防止下次拖拽位置错乱)
        container.querySelectorAll('.draggable-widget').forEach(child => {
          child.style.transition = '';
          child.style.transform = '';
        });
      });

      // C. 拖拽经过 (核心排序 + FLIP 动画)
      widget.addEventListener('dragover', function(e) {
        e.preventDefault();
        if (!panel.classList.contains('edit-mode')) return;
        if (this === dragSrcWidget) return;
        if (!dragSrcWidget) return;

        // [FLIP - First] 1. 记录变动前所有兄弟组件的位置
        // 只记录 .draggable-widget，忽略标题等静态元素
        const siblings = Array.from(container.querySelectorAll('.draggable-widget')).filter(c => c !== dragSrcWidget);
        const positions = new Map();
        siblings.forEach(el => positions.set(el, el.getBoundingClientRect()));

        // 2. DOM 移动逻辑
        const rect = this.getBoundingClientRect();
        const offset = e.clientY - rect.top - rect.height / 2;
        let hasMoved = false;
        
        if (offset < 0) {
          // 鼠标在元素上半部分 -> 插在前面
          if (this.previousElementSibling !== dragSrcWidget) {
            container.insertBefore(dragSrcWidget, this);
            hasMoved = true;
          }
        } else {
          // 鼠标在元素下半部分 -> 插在后面
          if (this.nextElementSibling !== dragSrcWidget) {
            container.insertBefore(dragSrcWidget, this.nextSibling);
            hasMoved = true;
          }
        }

        if (!hasMoved) return;

        // [FLIP - Invert & Play] 3. 执行动画
        siblings.forEach(el => {
          const oldPos = positions.get(el);
          const newPos = el.getBoundingClientRect();
          
          // 只要位置变了 (无论是上下还是左右)
          if (oldPos.top !== newPos.top || oldPos.left !== newPos.left) {
            const deltaX = oldPos.left - newPos.left;
            const deltaY = oldPos.top - newPos.top;
            
            // Invert: 瞬间移回旧位置 (关闭过渡)
            el.style.transition = 'none';
            el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

            // Play: 强制浏览器重绘后，开启过渡滑向新位置
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)'; // 丝滑曲线
                el.style.transform = ''; // 移除偏移，自动滑向 0
              });
            });

            // 动画结束后清理
            setTimeout(() => {
               if(el.style.transform === '') {
                 el.style.transition = '';
               }
            }, 300);
          }
        });
      });
    });
  }
});
// ============================================================
// ⌨️ 极客终端 (Command Palette) 完整逻辑 (修复版)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  const cmdOverlay = document.getElementById('cmdPaletteOverlay');
  const cmdInput = document.getElementById('cmdInput');
  const cmdList = document.getElementById('cmdList');
  const cmdTrigger = document.getElementById('cmdTrigger'); // 图标按钮
  
  let selectedIndex = 0;
  let filteredCommands = [];
function openLeftPanel() {
    const panel = document.getElementById('quickPanel');
    const btn = document.querySelector('.openBtn');
    // 如果面板存在且是收起状态(collapsed)，就移除该类名来展开
    if (panel && panel.classList.contains('collapsed')) {
      panel.classList.remove('collapsed');
      if(btn) btn.textContent = '◀'; // 修正按钮箭头
    }
  }

  // ✅ 2. 修正后的命令列表
  const commands = [
    // --- 核心功能 ---
    { 
      id: 'toggle-cat', 
      icon: '🐱', 
      title: '小猫盒子', 
      desc: '小猫会和你说话哦，显示/隐藏小猫 (快捷键 Alt+C)', 
      action: () => {
        const event = new KeyboardEvent('keydown', { code: 'KeyC', altKey: true, bubbles: true });
        document.dispatchEvent(event);
      } 
    },
    // ✅ 新增：切换搜索引擎
    { 
      id: 'engine', 
      icon: '🌐', 
      title: '切换搜索引擎', 
      desc: '切换搜索引擎 (Bing/Google/百度/搜狗)', 
      action: () => document.getElementById('engineSwitch').click() 
    },

    // ✅ 新增：切换全屏
    { 
      id: 'fullscreen', 
      icon: '🖥️', 
      title: '全屏', 
      desc: '切换全屏模式(右键菜单)', 
      action: () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          if (typeof showBubble === 'function') showBubble("沉浸模式开启喵！🖥️");
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      }
    },
    { id: 'zen', icon: '🍃', title: '禅模式', desc: '隐藏所有UI，仅留壁纸(右键菜单)', action: () => toggleZenMode() },
    { id: 'wall', icon: '🖼️', title: '更换壁纸', desc: '更换壁纸 / 上传动态壁纸(右键菜单)', action: () => {
    // ✅ 直接获取弹窗元素并显示
    const wpModal = document.getElementById('wallpaperModal');
    if (wpModal) {
         wpModal.style.display = "flex";
         // 添加延时以触发 CSS transition 动画
         setTimeout(() => wpModal.classList.add("show"), 10);
    }
  } 
},
        { id: 'refresh', icon: '🔄', title: '刷新页面', desc: '刷新当前页面(右键菜单)', action: () => location.reload() },
    { id: 'trail', icon: '✨', title: '切换鼠标拖尾', desc: '切换鼠标拖尾特效 (光球/线条/极光等)(右键菜单)', action: () => {
         const styles = ['off', 'particle', 'line', 'sparkle', 'laser'];
         let current = localStorage.getItem('trailStyle') || 'particle';
         let nextIdx = (styles.indexOf(current) + 1) % styles.length;
         window.changeTrailStyle(styles[nextIdx]);
    }},
    { 
      id: 'about', 
      icon: '👨‍💻', 
      title: '关于作者', 
      desc: '关于作者 (右键菜单)', 
      action: () => {
         const msgs = [
          "喵？作者藏在屏幕的某个角落里睡觉呢，把鼠标移过去找找看～",
          "偷偷告诉你，把鼠标移到角落里晃一晃，或许会有神奇的发现喵！✨",
          "这种事情都要问我嘛？自己去角落里翻翻看，找到了算你厉害喵～",
          "作者太害羞躲起来啦！快去屏幕边缘把他“抓”出来喵！🐾"
         ];
         if (typeof showBubble === 'function') showBubble(msgs[Math.floor(Math.random() * msgs.length)]);
      }
    },
    { id: 'ai', icon: '🧠', title: 'AI搜索', desc: '切换 AI 搜索模式 (豆包)', action: () => document.getElementById('aiSwitch').click() },

    // 🔥 修复：这里改为调用 openLeftPanel()
    { id: 'app', icon: '🪟', title: '快捷应用栏', desc: '打开快捷应用，可拖动改变位置，最下面可自定义添加网站 (左侧快捷栏)', action: () => openLeftPanel() },
// --- 组件功能介绍 (自动定位版) ---
{ 
      id: 'music', 
      icon: '🎵', 
      title: '音乐播放器', 
      desc: '打开右侧面板查看内置的本地音乐播放器 (右侧面板)', 
      action: () => {
        openRightPanel();
        setTimeout(() => {
          // 对应 HTML 中的 musicPlayerWidget
          const el = document.getElementById('musicPlayerWidget'); 
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 350);
      } 
    },
{ 
      id: 'ai-assistant', 
      icon: '🐱', 
      title: 'AI 聊天喵', 
      desc: '哼，既然你求我了，那就勉强帮你一下吧喵！ (右侧面板)', 
      action: () => {
        openRightPanel();
        const tsundereMsgs = ["干嘛？没事别随便点我喵！💢", "想让我画画？先说好，不满意不许抱怨喵！", "哼，真是拿你没办法喵～"];
        const randomMsg = tsundereMsgs[Math.floor(Math.random() * tsundereMsgs.length)];
        setTimeout(() => {
          // 这里的 ID 必须对应 index.html 中的 AI 聊天区域
          const el = document.getElementById('chatMessages')?.parentElement; 
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          if (typeof appendMessage === 'function') appendMessage(randomMsg, false);
        }, 350); // 稍微增加延迟，确保面板展开动画完成
      } 
    },    { 
      id: 'todo', 
      icon: '📝', 
      title: '备忘录', 
      desc: '记录待办事项 (右侧面板)', 
      action: () => {
        openRightPanel();
        setTimeout(() => {
          const el = document.getElementById('todoWidget');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      } 
    },
    { 
      id: 'calc', 
      icon: '🧮', 
      title: '计算器', 
      desc: '简单的数值计算 (右侧面板)', 
      action: () => {
        openRightPanel();
        setTimeout(() => {
          // 定位到备忘录同级或计算器容器
          const el = document.getElementById('todoWidget'); 
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      } 
    },
    { 
      id: 'birthday', 
      icon: '🎂', 
      title: '记录生日', 
      desc: '记录生日 (右侧面板)', 
      action: () => {
        openRightPanel();
        setTimeout(() => {
          const el = document.getElementById('birthdayWidget');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      } 
    },
{ 
      id: 'dino', 
      icon: '🐍', 
      title: '小游戏', 
      desc: '摸鱼贪吃蛇游戏 (右侧面板)', 
      action: () => {
        openRightPanel();
        setTimeout(() => {
          // 对应 HTML 中的 snakeWidget
          const el = document.getElementById('snakeWidget');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 350);
      } 
    },    { 
      id: 'calendar', 
      icon: '📅', 
      title: '日历', 
      desc: '查看农历与节日 (右侧面板)', 
      action: () => {
        openRightPanel();
        setTimeout(() => {
          const el = document.getElementById('calendarWidget');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      } 
    },
    { 
      id: 'fortune', 
      icon: '🎐', 
      title: '每日一签', 
      desc: '抽取今日运势 (右侧面板)', 
      action: () => {
        openRightPanel();
        setTimeout(() => {
          const el = document.getElementById('fortuneWidget');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      } 
    },    { 
      id: 'music-hint', 
      icon: '🎵', 
      title: '音乐组件', 
      desc: '它很害羞，只有听到浏览器播放歌声时，才会从右下角探出头来...', 
      action: () => {} // 什么都不做，executeCommand 会自动关闭菜单
    },

    // ✅ 修改：关于作者 (神秘彩蛋风格) - 点击无反应，引导用户探索边缘
    { 
      id: 'about-hint', 
      icon: '👨‍💻', 
      title: '关于作者', 
      desc: '作者正在屏幕的某个边缘角落里发呆呢... (试着把鼠标移过去找找？)', 
      action: () => {} // 什么都不做，executeCommand 会自动关闭菜单
    }
  ];

  // 辅助函数：打开右侧面板
  function openRightPanel() {
    const panel = document.getElementById('quickPanelright');
    const btn = document.querySelector('.openBtnright');
    if (panel && panel.classList.contains('collapsedright')) {
      panel.classList.remove('collapsedright');
      if(btn) btn.textContent = '▶'; // 修正按钮箭头
    }
  }

  // 2. 核心函数定义 (之前可能缺失的部分)
  window.openCmdPalette = function() {
    cmdOverlay.classList.add('visible');
    cmdInput.value = '';
    cmdInput.focus();
    renderCmdList('');
  };

  function closeCmdPalette() {
    cmdOverlay.classList.remove('visible');
    cmdInput.blur();
  }

// 🔴 找到 renderCmdList 函数，替换为这个版本：
  function renderCmdList(filterText) {
    cmdList.innerHTML = '';
    const lowerFilter = filterText.toLowerCase();

    // 搜索模式检测 (保持不变)
    const isBiliSearch = lowerFilter.startsWith('b ');
    const isGoogleSearch = lowerFilter.startsWith('g ');

    if (isBiliSearch || isGoogleSearch) {
      renderSpecialSearch(lowerFilter, isBiliSearch ? 'Bilibili' : 'Google');
      return;
    }

    // 常规命令过滤 (保持不变)
    filteredCommands = commands.filter(cmd => 
      !cmd.isSearch && (
        cmd.title.toLowerCase().includes(lowerFilter) || 
        cmd.desc.toLowerCase().includes(lowerFilter) ||
        (cmd.id && cmd.id.includes(lowerFilter))
      )
    );
    
    selectedIndex = 0;

    if (filteredCommands.length === 0) {
      const li = document.createElement('li');
      li.className = 'cmd-item';
      li.style.justifyContent = 'center';
      li.style.opacity = '0.5';
      li.textContent = 'No matching commands';
      cmdList.appendChild(li);
      return;
    }

    filteredCommands.forEach((cmd, index) => {
      const li = document.createElement('li');
      li.className = 'cmd-item';
      if (index === 0) li.classList.add('selected');
      
      li.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">${cmd.icon}</span>
          <div style="display:flex; flex-direction:column;">
            <span style="font-weight:bold; color:#eee;">${cmd.title}</span>
            <span style="font-size:12px; color:#aaa;">${cmd.desc}</span>
          </div>
        </div>
        ${index < 20 ? `<span class="cmd-key">${index + 1}</span>` : ''}
      `;

      // 🔥 关键修改在这里：增加 (e) 和 e.stopPropagation()
      li.addEventListener('click', (e) => {
        e.stopPropagation(); // ✋ 阻止事件冒泡，防止触发“点击外部自动关闭面板”的逻辑
        executeCommand(cmd);
      });
      
      li.addEventListener('mouseenter', () => {
        selectedIndex = index;
        updateSelection();
      });

      cmdList.appendChild(li);
    });
  }

  function renderSpecialSearch(text, type) {
    const query = text.slice(2);
    filteredCommands = [{
      special: true,
      action: () => {
        const url = type === 'Bilibili' 
          ? `https://search.bilibili.com/all?keyword=${encodeURIComponent(query)}`
          : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        window.open(url, '_blank');
      }
    }];
    
    cmdList.innerHTML = `
      <li class="cmd-item selected">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:18px;">${type === 'Bilibili' ? '📺' : '🌏'}</span>
          <div style="display:flex; flex-direction:column;">
            <span style="font-weight:bold; color:#eee;">Search ${type}</span>
            <span style="font-size:12px; color:#aaa;">Searching for: "${query}"</span>
          </div>
        </div>
        <span class="cmd-key">Enter</span>
      </li>
    `;
  }

  function executeCommand(cmd) {
    if (cmd.action) cmd.action();
    closeCmdPalette();
  }

  function updateSelection() {
    const items = cmdList.querySelectorAll('.cmd-item');
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // 3. 事件监听
  // 点击图标打开
  if (cmdTrigger) {
    cmdTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openCmdPalette();
    });
  }

  // 全局快捷键 Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cmdOverlay.classList.contains('visible')) {
        closeCmdPalette();
      } else {
        openCmdPalette();
      }
    }
  });

  // 输入框事件
  cmdInput.addEventListener('input', (e) => {
    renderCmdList(e.target.value);
  });

  cmdInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % filteredCommands.length;
      updateSelection();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + filteredCommands.length) % filteredCommands.length;
      updateSelection();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      closeCmdPalette();
    }
  });

  // 点击遮罩关闭
  cmdOverlay.addEventListener('click', (e) => {
    if (e.target === cmdOverlay) closeCmdPalette();
  });
});
