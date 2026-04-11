// =============================================
// 🔊 NES 游戏音频状态管理
// =============================================
window.nesUserMuted  = false;  // 用户手动点喇叭
window.nesMusicMuted = false;  // 音乐播放器播放中

// 每个游戏的 AudioContext 注册表，key = canvasId
const nesAudioContexts = {};

function isNesMuted() {
  return window.nesUserMuted || window.nesMusicMuted;
}

function updateNesMuteButtons() {
  const icon = window.nesUserMuted ? '🔇' : '🔊';
  ['nes-mute-contra', 'nes-mute-mario'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.textContent = icon;
  });
}

// 音乐播放器联动：只更新 nesMusicMuted，不影响用户手动状态
setInterval(() => {
  const playing = !!(window.isMusicPlayerPlaying);
  if (playing !== window.nesMusicMuted) {
    window.nesMusicMuted = playing;
  }
}, 1000);

// 背景视频静音/恢复
function muteBackgroundVideo()   { const v = document.getElementById('bgVideo'); if (v) v.muted = true;  }
function unmuteBackgroundVideo() { const v = document.getElementById('bgVideo'); if (v) v.muted = false; }

// 暂停指定游戏的音频（切离时调用）
function suspendNesAudio(canvasId) {
  const ctx = nesAudioContexts[canvasId];
  if (ctx && ctx.state === 'running') ctx.suspend();
}

// 恢复指定游戏的音频（切入时调用）
function resumeNesAudio(canvasId) {
  const ctx = nesAudioContexts[canvasId];
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

// =============================================
// 🎮 NES 运行逻辑
// =============================================
function initNES(canvasId, romUrl) {
    const canvas = document.getElementById(canvasId);
    const ctx    = canvas.getContext('2d');
    const imageData = ctx.createImageData(256, 240);
    const buf    = new Uint32Array(imageData.data.buffer);

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    nesAudioContexts[canvasId] = audioCtx; // 注册到表里

    const BUFFER_SIZE = 4096;
    const audioBuffer = {
      L: new Float32Array(BUFFER_SIZE * 2),
      R: new Float32Array(BUFFER_SIZE * 2),
      pos: 0
    };

    const scriptNode = audioCtx.createScriptProcessor(BUFFER_SIZE, 0, 2);
    scriptNode.onaudioprocess = (e) => {
        const outL = e.outputBuffer.getChannelData(0);
        const outR = e.outputBuffer.getChannelData(1);
        const muted = isNesMuted();
        for (let i = 0; i < BUFFER_SIZE; i++) {
            if (muted || audioBuffer.pos <= i) {
                outL[i] = 0; outR[i] = 0;
            } else {
                outL[i] = audioBuffer.L[i];
                outR[i] = audioBuffer.R[i];
            }
        }
        const remaining = Math.max(0, audioBuffer.pos - BUFFER_SIZE);
        audioBuffer.L.copyWithin(0, BUFFER_SIZE);
        audioBuffer.R.copyWithin(0, BUFFER_SIZE);
        audioBuffer.pos = remaining;
    };
    scriptNode.connect(audioCtx.destination);

    const nes = new jsnes.NES({
        onFrame: (frameBuffer) => {
            for (let i = 0; i < 256 * 240; i++) {
                buf[i] = 0xFF000000 | frameBuffer[i];
            }
            ctx.putImageData(imageData, 0, 0);
        },
        onAudioSample: (l, r) => {
            if (audioBuffer.pos < audioBuffer.L.length) {
                audioBuffer.L[audioBuffer.pos] = l;
                audioBuffer.R[audioBuffer.pos] = r;
                audioBuffer.pos++;
            }
        },
        sampleRate: 44100
    });

    const KEY_MAP = { 87:4, 83:5, 65:6, 68:7, 74:1, 75:0, 16:2, 13:3 };
    const handleKey = (keyCode, isDown) => {
        const button = KEY_MAP[keyCode];
        if (button !== undefined) {
            isDown ? nes.buttonDown(1, button) : nes.buttonUp(1, button);
            return true;
        }
        return false;
    };
    document.addEventListener('keydown', e => { if (handleKey(e.keyCode, true))  e.preventDefault(); });
    document.addEventListener('keyup',   e => { if (handleKey(e.keyCode, false)) e.preventDefault(); });

    if (audioCtx.state === 'suspended') {
        document.addEventListener('click', () => audioCtx.resume(), { once: true });
    }

    fetch(chrome.runtime.getURL(romUrl))
        .then(res => res.arrayBuffer())
        .then(ab => {
            const bytes = new Uint8Array(ab);
            let binary = "";
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            nes.loadROM(binary);

            const interval = 1000 / 60;
            let lastTime = performance.now();
            function step(currentTime) {
                if (currentTime - lastTime > interval) {
                    lastTime = currentTime - ((currentTime - lastTime) % interval);
                    nes.frame();
                }
                requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        })
        .catch(err => console.error("ROM 加载失败:", err));
}

// =============================================
// 事件监听绑定
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    const btnContra = document.getElementById('load-contra');
    const btnMario  = document.getElementById('load-mario');

    if (btnContra) {
        btnContra.addEventListener('click', () => {
            initNES('contra-canvas', 'roms/contra.nes');
            btnContra.innerText = "运行中";
            btnContra.disabled  = true;
        });
    }
    if (btnMario) {
        btnMario.addEventListener('click', () => {
            initNES('mario-canvas', 'roms/mario.nes');
            btnMario.innerText = "运行中";
            btnMario.disabled  = true;
        });
    }

    ['nes-mute-contra', 'nes-mute-mario'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', () => {
            window.nesUserMuted = !window.nesUserMuted;
            updateNesMuteButtons();
        });
    });

    updateNesMuteButtons();
});

// =============================================
// 🎮 游戏大厅视图切换逻辑
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    // 视图名 → 对应的 canvasId
    const VIEW_CANVAS_MAP = {
        contraView: 'contra-canvas',
        marioView:  'mario-canvas',
    };
    const NES_VIEWS = Object.keys(VIEW_CANVAS_MAP);

    // 记录当前正在显示的 NES 游戏 canvasId（null = 不在游戏页）
    let activeNesCanvas = null;

    function switchGameView(viewId) {
        const views = ['gameLobbyView', 'snakeView', 'memoryView', 'contraView', 'marioView'];
        views.forEach(v => {
            const el = document.getElementById(v);
            if (el) el.style.display = 'none';
        });

        const target   = viewId === 'lobby' ? 'gameLobbyView' : viewId + 'View';
        const targetEl = document.getElementById(target);

        // ── 音频 & 背景视频管理 ──
        if (NES_VIEWS.includes(target)) {
            // 进入 NES 游戏页
            // 1. 先暂停所有其他 NES 游戏的音频
            NES_VIEWS.forEach(v => {
                const cid = VIEW_CANVAS_MAP[v];
                if (cid !== VIEW_CANVAS_MAP[target]) suspendNesAudio(cid);
            });
            // 2. 恢复本游戏音频
            resumeNesAudio(VIEW_CANVAS_MAP[target]);
            activeNesCanvas = VIEW_CANVAS_MAP[target];
            // 3. 静音背景视频
            muteBackgroundVideo();
        } else {
            // 返回大厅或其他页面
            // 1. 暂停所有 NES 音频
            NES_VIEWS.forEach(v => suspendNesAudio(VIEW_CANVAS_MAP[v]));
            activeNesCanvas = null;
            // 2. 恢复背景视频声音
            unmuteBackgroundVideo();
        }

        if (targetEl) {
            targetEl.style.display = 'block';
            targetEl.style.opacity = '0';
            setTimeout(() => {
                targetEl.style.transition = 'opacity 0.3s ease-in-out';
                targetEl.style.opacity    = '1';
            }, 10);
        }
    }

    const gameButtons = document.querySelectorAll('.game-entry-btn, .back-lobby-btn');
    gameButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetView = btn.getAttribute('data-target');
            if (targetView) switchGameView(targetView);
        });
    });
});
