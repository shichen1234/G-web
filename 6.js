// =============================================
// 📲 禅模式 · 糯米关怀通知
// =============================================
(function () {
  'use strict';

  const INTERVAL_MS = 3 * 60 * 1000; // 2 分钟

  const CARE_MESSAGES = [
'看屏幕有一会儿啦，眨眨眼睛喝点水吧，喵~',
'在发呆吗？糯米陪你一起放空~',
'深呼吸，放松一下肩膀，闭上眼睛休息一会儿吧！',
'站起来伸个懒腰会舒服很多哦~',
'时间过得真快，揉揉眼睛再继续吧！',
'糯米在这里乖乖陪你，记得劳逸结合呀~',
'眼睛有点酸了吧？看看远处的风景吧！',
'今天也要保持好心情哦，喵~',
'发呆也是一种很好的休息方式呢！',
'保持这个坐姿太久啦，稍微活动一下脖子吧~',
'这里的旋律真好听，糯米也跟着放松下来了呢~',
'沉浸在自己的小世界里感觉真棒，喵~',
'糯米很喜欢和你一起度过这样安静的时光。',
'听到喜欢的节奏了吗？跟着轻轻摇摆吧~',
'把烦恼都抛到脑后，现在是属于你的放松时间。',
'糯米觉得现在的氛围特别好，很适合闭眼休息呢。',
'累了就随时停下来，糯米会一直在这里守着你。',
'享受当下这份宁静吧，喵呜~',
'喝口温水润润嗓子，再继续享受这段时光吧。',
'糯米要把这份惬意偷偷藏进心里啦！'
  ];

  let zenCareTimer = null;

  function showCareNotif() {
    const notif  = document.getElementById('zenCareNotif');
    const textEl = document.getElementById('zenCareText');
    if (!notif || !textEl) return;

    const last = showCareNotif._last ?? -1;
    let idx;
    do { idx = Math.floor(Math.random() * CARE_MESSAGES.length); }
    while (idx === last && CARE_MESSAGES.length > 1);
    showCareNotif._last = idx;

    textEl.textContent = CARE_MESSAGES[idx];

    notif.classList.remove('hiding', 'show');
    void notif.offsetWidth;
    notif.classList.add('show');

    clearTimeout(showCareNotif._hideTimer);
    showCareNotif._hideTimer = setTimeout(() => {
      notif.classList.remove('show');
      notif.classList.add('hiding');
      setTimeout(() => notif.classList.remove('hiding'), 560);
    }, 7000);
  }

  function startZenCareTimer() {
    stopZenCareTimer();
    zenCareTimer = setInterval(showCareNotif, INTERVAL_MS);
  }

  function stopZenCareTimer() {
    if (zenCareTimer) { clearInterval(zenCareTimer); zenCareTimer = null; }
    const notif = document.getElementById('zenCareNotif');
    if (notif && notif.classList.contains('show')) {
      notif.classList.remove('show');
      notif.classList.add('hiding');
      setTimeout(() => notif.classList.remove('hiding'), 560);
    }
  }

  function patchZenHooks() {
    // manageZenTimeWidget 在手动和自动禅模式均会被调用
    const origManage = window.manageZenTimeWidget;
    if (typeof origManage === 'function') {
      let wasZen = false;
      window.manageZenTimeWidget = function () {
        origManage.apply(this, arguments);
        const isNowZen = !!(window.isZenMode || window.isAutoZenActive);
        if (isNowZen && !wasZen)  startZenCareTimer();
        if (!isNowZen && wasZen)  stopZenCareTimer();
        wasZen = isNowZen;
      };
    }
  }

  document.addEventListener('DOMContentLoaded', patchZenHooks);

  // 暴露到全局，方便控制台测试
  window.showCareNotif     = showCareNotif;
  window.startZenCareTimer = startZenCareTimer;
  window.stopZenCareTimer  = stopZenCareTimer;
})();


// =============================================
// 🃏 记忆翻牌游戏
// =============================================
(function () {
  'use strict';

  const EMOJI_POOL = [
    '🐱','🐶','🐸','🦊','🐼','🐨','🦁','🐯',
    '🦋','🌸','🍓','🍕','🎵','⚡','🌈','🔥',
    '🎯','💎','🚀','🌙','⭐','🎃','🌺','🦄',
    '🐙','🍦','🎸','🍩','🐳','🦀',
  ];

  const BEST_KEY = 'memoryBestFlips'; // { 9: n, 12: n, 15: n }

  function loadBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}'); } catch(e) { return {}; }
  }
  function saveBest(pairs, flips) {
    const best = loadBest();
    if (best[pairs] === undefined || flips < best[pairs]) {
      best[pairs] = flips;
      localStorage.setItem(BEST_KEY, JSON.stringify(best));
    }
    renderBestRow();
  }
  function renderBestRow() {
    const best = loadBest();
    [9, 12, 15].forEach(p => {
      const el = document.getElementById('bestFlips' + p);
      if (el) el.textContent = best[p] !== undefined ? best[p] + ' 次' : '--';
    });
  }

  let currentPairs  = 9;
  let flippedCards  = [];
  let matchedCount  = 0;
  let flipCount     = 0;
  let isLocked      = false;
  let timerInterval = null;
  let elapsedSecs   = 0;
  let gameStarted   = false;

  function buildBoard(pairs) {
    currentPairs = pairs;
    flippedCards = []; matchedCount = 0; flipCount = 0;
    elapsedSecs  = 0;  isLocked     = false; gameStarted = false;
    clearInterval(timerInterval);

    const emojis = [...EMOJI_POOL].sort(() => Math.random() - 0.5).slice(0, pairs);
    const deck   = [...emojis, ...emojis].sort(() => Math.random() - 0.5);

    const board = document.getElementById('memoryBoard');
    if (!board) return;

    board.style.gridTemplateColumns = 'repeat(6, 1fr)';
    board.innerHTML = '';
    deck.forEach(emoji => {
      const card = document.createElement('div');
      card.className     = 'memory-card';
      card.dataset.emoji = emoji;
      card.innerHTML = `<div class="memory-card-inner">
        <div class="memory-card-front">✦</div>
        <div class="memory-card-back">${emoji}</div>
      </div>`;
      card.addEventListener('click', () => onCardClick(card));
      board.appendChild(card);
    });

    updateStats();
    renderBestRow();
    const win = document.getElementById('memoryWinBanner');
    if (win) win.style.display = 'none';
    const timerEl = document.getElementById('memoryTimer');
    if (timerEl) timerEl.textContent = '00:00';
    const totalEl = document.getElementById('memoryTotal');
    if (totalEl) totalEl.textContent = pairs;
  }

  function startTimerIfNeeded() {
    if (gameStarted) return;
    gameStarted = true;
    timerInterval = setInterval(() => {
      elapsedSecs++;
      const m = Math.floor(elapsedSecs / 60), s = elapsedSecs % 60;
      const el = document.getElementById('memoryTimer');
      if (el) el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    }, 1000);
  }

  function onCardClick(card) {
    if (isLocked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    startTimerIfNeeded();
    card.classList.add('flipped');
    flippedCards.push(card);
    flipCount++;
    updateStats();
    if (flippedCards.length < 2) return;

    isLocked = true;
    const [a, b] = flippedCards;
    flippedCards = [];

    if (a.dataset.emoji === b.dataset.emoji) {
      setTimeout(() => {
        a.classList.add('matched'); b.classList.add('matched');
        matchedCount++; isLocked = false;
        updateStats();
        if (matchedCount === currentPairs) onWin();
      }, 350);
    } else {
      setTimeout(() => {
        a.classList.remove('flipped'); b.classList.remove('flipped');
        isLocked = false;
      }, 400);
    }
  }

  function updateStats() {
    const f = document.getElementById('memoryFlips');
    const m = document.getElementById('memoryMatches');
    if (f) f.textContent = flipCount;
    if (m) m.textContent = matchedCount;
  }

  function onWin() {
    clearInterval(timerInterval);
    const m = Math.floor(elapsedSecs / 60), s = elapsedSecs % 60;
    const timeStr = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const banner  = document.getElementById('memoryWinBanner');
    const stats   = document.getElementById('memoryWinStats');

    // 更新最高记录
    const prevBest = loadBest()[currentPairs];
    saveBest(currentPairs, flipCount);
    const isNewBest = prevBest === undefined || flipCount < prevBest;
    const bestNote  = isNewBest ? ' 🏆 新纪录！' : ` (最佳 ${prevBest} 次)`;

    if (stats)  stats.textContent = `翻牌 ${flipCount} 次 · 用时 ${timeStr}${bestNote}`;
    if (banner) banner.style.display = 'block';
    if (typeof showBubble === 'function')
      showBubble(isNewBest
        ? `通关啦喵！🏆 新纪录 ${flipCount} 次！`
        : `全部翻对啦喵！🎉 共翻了 ${flipCount} 次！`);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const restartBtn = document.getElementById('memoryRestartBtn');
    const diffBtns   = document.querySelectorAll('.memory-diff-btn');
    if (!restartBtn) return;
    buildBoard(9);
    restartBtn.addEventListener('click', () => buildBoard(currentPairs));
    diffBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        diffBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        buildBoard(parseInt(btn.dataset.pairs, 10));
      });
    });

    // ── 左右面板 GPU 合成层预热 ──
    // 背景：面板收起时 backdrop-filter 合成层可能被浏览器 GC，
    // 在用户悬停到开关按钮时提前触发重建，避免点击后才感到卡顿。
    (function initPanelWarmup() {
      const warmupTargets = [
        { btn: '#quickPanel .openBtn',          content: '#quickPanel .panel'          },
        { btn: '#quickPanelright .openBtnright', content: '#quickPanelright .panelright' },
      ];
      warmupTargets.forEach(({ btn, content }) => {
        const btnEl     = document.querySelector(btn);
        const contentEl = document.querySelector(content);
        if (!btnEl || !contentEl) return;
        btnEl.addEventListener('mouseenter', () => {
          // 若面板已展开则无需预热
          const panel = btnEl.closest('#quickPanel, #quickPanelright');
          if (panel && !panel.classList.contains('collapsed') && !panel.classList.contains('collapsedright')) return;
          // 临时写入 will-change 触发浏览器重新分配 GPU 合成层
          contentEl.style.willChange = 'transform, opacity, width';
          // 强制同步布局，使浏览器立即处理提示而非延迟到下一帧
          void contentEl.offsetHeight;
        }, { passive: true });
      });
    })();

    // ── 快捷面板滚动提示箭头 ──
    const SCROLL_SEEN_KEY = 'quickPanelScrollHintSeen';
    const scrollHint  = document.getElementById('quickPanelScrollHint');
    const iconsEl     = document.querySelector('#quickPanel .icons');
    const openBtnEl   = document.querySelector('#quickPanel .openBtn');

    function tryShowScrollHint() {
      if (!scrollHint || !iconsEl) return;
      // 只对首次打开的用户显示
      if (localStorage.getItem(SCROLL_SEEN_KEY)) return;
      // 只在内容超出时显示
      if (iconsEl.scrollHeight <= iconsEl.clientHeight + 4) return;
      scrollHint.classList.remove('hidden');
    }

    function hideScrollHint() {
      if (!scrollHint) return;
      scrollHint.classList.add('hidden');
      localStorage.setItem(SCROLL_SEEN_KEY, '1');
    }

    if (openBtnEl) {
      openBtnEl.addEventListener('click', () => {
        // 面板展开后延迟检测是否需要提示
        setTimeout(tryShowScrollHint, 550);
      });
    }
    if (iconsEl) {
      iconsEl.addEventListener('scroll', hideScrollHint, { once: true });
    }
  });
})();
