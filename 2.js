// 2.js - 性能优化完整版 (IndexedDB 长连接)

window.currentWallpaperUrl = null; 
let savedBgVideoVolume = 0;
let savedBgVideoMutedState = false;
let fadeInterval = null;

// Helper: 清理先前通过 URL.createObjectURL 创建的临时 URL
function clearCurrentWallpaperUrl() {
  try {
    if (window.currentWallpaperUrl) {
      try { URL.revokeObjectURL(window.currentWallpaperUrl); } catch (e) { /* ignore */ }
      window.currentWallpaperUrl = null;
    }
  } catch (e) {}
}

// 优化版：彻底清理资源 + 修复声音播放
async function setBackgroundFromBlob(file) {
  const bgImage = document.getElementById("bgImage");
  let bgVideo = document.getElementById("bgVideo");
  if (bgVideo) {
    bgVideo.pause();                // 暂停播放（停止声音）
    bgVideo.removeAttribute('src'); // 移除数据源
    bgVideo.load();                 // 刷新状态
    bgVideo.remove();               // 从DOM中移除
    bgVideo = null;
}
if (bgImage) bgImage.style.display = 'none';  
const bgWebFrame = document.getElementById("bgWebFrame");
  if (bgWebFrame) {
      bgWebFrame.style.display = 'none';
      bgWebFrame.src = ''; // 清空src彻底停止网页运行
  }
  // --- 第一步：释放旧资源，同时用 poster 垫底避免白屏 ---
  // 先把 bgImage 切到 poster，保证销毁旧视频期间有画面兜底
  if (bgImage && file && file.type && file.type.startsWith("video/")) {
    bgImage.src = "wallpapers/poster.jpg";
    bgImage.style.display = 'block';
  }

  if (bgVideo) {
    bgVideo.pause();
    bgVideo.removeAttribute('src');
    bgVideo.load();
    bgVideo.remove();
    bgVideo = null;
  }
  
  clearCurrentWallpaperUrl();

  if (!file) {
    if (bgImage) bgImage.style.display = 'none';
    return null;
  }

  // --- 第二步：重新创建干净的 Video 元素 ---
  const container = document.body;
  const newVideo = document.createElement('video');
  newVideo.id = "bgVideo";
  newVideo.autoplay = true;
  newVideo.loop = true;
  newVideo.muted = true;
  newVideo.style.position = "fixed";
  newVideo.style.top = "0";
  newVideo.style.left = "0";
  newVideo.style.width = "100vw";
  newVideo.style.height = "100vh";
  newVideo.style.objectFit = "cover";
  newVideo.style.zIndex = "-1";
  newVideo.style.display = "none"; // 先隐藏，等播放后再显示
  
  if (bgImage && bgImage.parentNode) {
    bgImage.parentNode.insertBefore(newVideo, bgImage.nextSibling);
  } else {
    container.appendChild(newVideo);
  }
  bgVideo = newVideo;

  // 🔥 通知视差脚本，背景元素已更新
  if (typeof window.reinitParallaxEffect === 'function') {
      window.reinitParallaxEffect();
  }

  // --- 第三步：加载资源 ---
  const objectUrl = URL.createObjectURL(file);
  window.currentWallpaperUrl = objectUrl;

  if (file.type && file.type.startsWith("video/")) {
    bgVideo.src = objectUrl;
    
    bgVideo.onloadedmetadata = () => {
        try {
            const savedMute = localStorage.getItem('backgroundVideoMuted') === 'true';
            const savedVolStr = localStorage.getItem('backgroundVideoVolume');
            const savedVol = savedVolStr ? parseInt(savedVolStr, 10) : 50;
            
            bgVideo.volume = savedVol / 100;
            bgVideo.muted = savedMute;
            if (window.isMusicPlayerPlaying) {
                savedBgVideoMutedState = bgVideo.muted;
                savedBgVideoVolume = bgVideo.volume;
                bgVideo.muted = true;
            }

            const playPromise = bgVideo.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    // ✅ 视频真正开始播放后，显示视频、隐藏 poster
                    bgVideo.style.display = 'block';
                    if (bgImage) bgImage.style.display = 'none';
                }).catch(error => {
                    console.warn("自动播放被拦截，强制静音播放:", error);
                    bgVideo.muted = true;
                    bgVideo.play().then(() => {
                        bgVideo.style.display = 'block';
                        if (bgImage) bgImage.style.display = 'none';
                    }).catch(() => {});
                    if (typeof showBubble === 'function') {
                        showBubble("浏览器限制了自动播放，已静音喵～");
                    }
                });
            } else {
                // 旧版浏览器 play() 不返回 Promise
                bgVideo.style.display = 'block';
                if (bgImage) bgImage.style.display = 'none';
            }
        } catch (e) {
            console.error("视频设置出错:", e);
            bgVideo.style.display = 'block';
            if (bgImage) bgImage.style.display = 'none';
        }
    };

    // 视频加载出错时保持 poster 显示，不闪白
    bgVideo.onerror = () => {
        console.error('[G-web] 视频加载失败，保持 poster 显示');
        if (bgImage) {
            bgImage.src = "wallpapers/poster.jpg";
            bgImage.style.display = 'block';
        }
    };

  } else if (file.type && file.type.startsWith("image/")) {
    // 图片直接切换
    if (bgImage) {
      bgImage.src = objectUrl;
      bgImage.style.display = 'block';
    }
    bgVideo.style.display = 'none';
  }

  return objectUrl;
}

document.getElementById("beijingTime").addEventListener("mouseenter", () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const beijingTime = new Date(utc + 8 * 3600000);
    const month = beijingTime.getMonth() + 1;
    const date = beijingTime.getDate();
    const hours = beijingTime.getHours();
    let timeGreeting = "";
    if (hours >= 6 && hours <= 10) timeGreeting = "清晨的阳光真温柔～";
    else if (hours >= 11 && hours <= 13) timeGreeting = "中午啦，记得吃饭哦～";
    else if (hours >= 14 && hours <= 17) timeGreeting = "下午时光，适合小憩一下～";
    else timeGreeting = "夜深了，早点休息吧～";
    showBubble(`现在是${month}月${date}日｜${timeGreeting}`);
});

document.getElementById("weekDay").addEventListener("mouseenter", () => {
    const weekText = document.getElementById("weekDay").textContent.trim();
    showBubble(`今天是${weekText}，要加油哦！`);
});

// === 变量定义 ===
const bubble = document.getElementById("catSpeechBubble");
const bubbleText = bubble.querySelector(".bubble-text");
const searchInput = document.getElementById("searchInput");
const greetingEl = document.getElementById("greetingMessage");
let bubbleTimeout = null;

// === 气泡功能 (保持不变) ===
function showBubble(message, lock = false, force = false, specialClass = '') {
    if (window.isZenMode && !force) return;
    if (bubbleDisabled && !force) return;
    if (bubbleLocked) return;

    const specialBubbleClasses = [
        'bubble-birthday', 'bubble-chunjie', 'bubble-yuanxiao', 'bubble-duanwu',
        'bubble-zhongqiu', 'bubble-qixi', 'bubble-shengdan', 'bubble-yuandan',
        'bubble-guoqing', 'bubble-ertong', 'bubble-qingrenjie', 'bubble-wanshengjie'
    ];
    bubble.classList.remove(...specialBubbleClasses);
    if (specialClass && specialBubbleClasses.includes(specialClass)) {
        bubble.classList.add(specialClass);
    }
    bubble.classList.remove("show");
    void bubble.offsetWidth;
    bubbleText.textContent = message;
    bubble.classList.add("show");

    if (lock) bubbleLocked = true;
    if (bubbleTimeout) clearTimeout(bubbleTimeout);
    bubbleTimeout = setTimeout(() => {
        bubble.classList.remove("show");
        bubbleLocked = false;
        setTimeout(() => {
            if (!bubble.classList.contains("show")) {
                bubble.classList.remove(...specialBubbleClasses);
            }
        }, 400);
    }, 4000);
}

// 搜索框和问候语监听 (保持不变)
searchInput.addEventListener("focus", () => {
    if (isMenuOperating) return;
    const prompts = ["今天要搜索什么呀？", "想找点什么呢～", "输入关键词，小猫来帮你找！"];
    showBubble(prompts[Math.floor(Math.random() * prompts.length)]);
});

// [NEW] Helper function to check for special day greetings
function checkSpecialDayGreeting() {
    const today = new Date();
    
    // 1. Birthday check (highest priority)
    const birthdayStr = localStorage.getItem('user_birthday_date');
    if (birthdayStr) {
        const parts = birthdayStr.split('-');
        const bMonth = parseInt(parts[1], 10);
        const bDay = parseInt(parts[2], 10);

        if ((today.getMonth() + 1) === bMonth && today.getDate() === bDay) {
            const specialGreetings = [
                "生日快乐喵！🎂 今天你是全宇宙的主角，要开开心心哦！",
                "喵呜！祝你生日快乐！🎉 许个愿望吧，小猫会帮你守护它的！",
                "Happy Birthday！✨ 今天的小鱼干都分给你，祝你万事胜意喵！"
            ];
            const randomMsg = specialGreetings[Math.floor(Math.random() * specialGreetings.length)];
            return { msg: randomMsg, class: 'bubble-birthday' };
        }
    }

    // 2. Festival check (lunar and solar)
    if (window.Solar && window.Lunar) {
        const solar = Solar.fromDate(today);
        const lunar = Lunar.fromDate(today);

        const solarGreetings = {
          "1-1": { msg: "元旦快乐喵！🎆 新的一年，希望你的猫罐头永远吃不完！", class: "bubble-yuandan" },
          "2-14": { msg: "情人节快乐喵！💖 没有对象？没关系，你有我这只可爱的小猫咪呀！", class: "bubble-qingrenjie" },
          "3-8": "妇女节快乐喵！👑 今天你最美，不接受反驳！",
          "3-12": "植树节到了喵！🌳 要不要一起去种猫草？",
          "4-1": "愚人节快乐！🤪 小猫才不会骗你呢... 除非有罐头！",
          "4-5": "清明时节雨纷纷喵... 🌱 记得带伞哦。",
          "5-1": { msg: "劳动节快乐！🛠️ 今天不抓老鼠，我们要一起躺平喵～", class: "bubble-wuYi" },
          "5-4": "青年节快乐喵！💪 永远年轻，永远热泪盈眶！",
          "5-20": "520快乐喵！❤️ 虽然我不懂爱，但我知道我喜欢你！",
          "6-1": { msg: "六一儿童节快乐喵！🎈 谁还不是个几百个月的宝宝呢？", class: "bubble-ertong" },
          "7-1": "建党节快乐喵！🚩 红旗飘飘，小猫敬礼！",
          "8-1": "建军节快乐喵！🫡 向最可爱的人致敬！",
          "9-10": "教师节快乐喵！👩‍🏫 老师辛苦啦，送你一朵小红花！",
          "10-1":  { msg: "国庆节快乐！ 愿祖国繁荣昌盛，国泰民安！", class: "bubble-guoqing" },
          "10-24": "程序员节快乐喵！💻 愿你的代码没有Bug，发量依然浓密！",
          "10-31": { msg: "不给糖就捣蛋！🎃 快把你的小鱼干交出来！", class: "bubble-wanshengjie" }, 
          "11-11": "双十一快乐喵！🛒 购物车满了吗？记得给小猫买零食哦！",
          "12-24": "平安夜快乐喵！🍎 记得吃苹果，平平安安哦～",
          "12-25":  { msg: "圣诞快乐喵！🎄 把袜子挂好，等着收礼物吧！", class: "bubble-shengdan" }
        };
        const lunarGreetings = {
          "1-1":{ msg:"过年啦！🧨 恭喜发财，红包拿来买猫粮喵！新年快乐！", class: "bubble-chunjie" },
          "1-15":{ msg: "元宵节快乐喵！🏮 猜灯谜？不如猜猜我今天吃了多少小鱼干？", class: "bubble-yuanxiao" },
          "2-2": "龙抬头喵！🐉 要不要带我去理个发，剪个帅气猫头？",
          "5-5": { msg: "端午安康！🐲 粽子虽好，可不要贪吃哦，把肉馅的留给我！", class: "bubble-duanwu" },
          "7-7": { msg: "七夕快乐！🌌 今晚的星星会唱歌，你听到了吗？", class: "bubble-qixi" },
          "7-15": "中元节喵... 👻 晚上早点回家，小猫会保护你的！",
          "8-15": { msg: "中秋节快乐！🌕 月饼分我一半，不然...我就对着月亮告状说你欺负我！", class: "bubble-zhongqiu" },
          "12-8": "腊八节快乐喵！🥣 过了腊八就是年，粥好喝吗？",
          "12-23": "小年快乐喵！🍬 灶神爷爷上天言好事，我在凡间讨鱼吃～"
        };
        
        const solarStr = `${solar.getMonth()}-${solar.getDay()}`;
        const lunarStr = `${Math.abs(lunar.getMonth())}-${lunar.getDay()}`;
        
        let festivalData = null; 
        
        if (lunar.getFestivals().includes("除夕")) {
             festivalData = { msg: "除夕快乐喵！🧨 今晚不许睡，陪我守岁抢红包！", class: "bubble-chunjie" };
        } else {
            if (solarGreetings[solarStr]) {
              festivalData = solarGreetings[solarStr];
            } else if (lunarGreetings[lunarStr]) {
              festivalData = lunarGreetings[lunarStr];
            }
        }
        
        if (festivalData) {
            if (typeof festivalData === 'string') {
                return { msg: festivalData, class: '' };
            }
            return festivalData;
        }
    }
    
    return null;
}


// [MODIFIED] 问候语悬停触发
greetingEl.addEventListener("mouseenter", () => {
  // ✅ NEW: First, check for a special day greeting
  const specialGreeting = checkSpecialDayGreeting();
  if (specialGreeting) {
    showBubble(specialGreeting.msg, false, true, specialGreeting.class);
    return; // Show special greeting and stop
  }
  
  // If not a special day, continue with the original logic
  const greetingText = greetingEl.textContent.trim();

  const replies = {
    "早上好": ["早上好呀！", "新的一天开始啦～", "早安早安，今天也要元气满满！"],
    "中午好": ["中午好呀～", "午饭时间到啦，吃饱才有力气喵！", "中午好，来休息一下吧～"],
    "下午好": ["下午好呀！", "下午时光最适合发呆了～", "下午好，来杯咖啡或下午茶，享受片刻的悠闲吧。"],
    "晚上好": ["晚上好呀～", "辛苦啦，今晚早点休息哦～", "夜晚是属于放松的时间～"],
    "默认": ["你好呀～", "喵～你来啦！", "嘿嘿，在想什么呢？"]
  };

  let matchedKey = Object.keys(replies).find(key => greetingText.includes(key));
  if (!matchedKey) matchedKey = "默认";

  const options = replies[matchedKey];
  const reply = options[Math.floor(Math.random() * options.length)];

  showBubble(reply);
});


// ============================================================
// 🐱 核心修改区：GIF 播放控制逻辑
// ============================================================

// ⏱️ 配置区：请根据你的 GIF 实际长度调整这些时间（单位：毫秒）
const GIF_DURATION = {
    expand: 1267,    // "展开.gif" 的时长
    close: 1867,     // "闭合.gif" 的时长
    dizzy: 4000      // 头晕动作的时长
};

// 辅助：给 GIF URL 加时间戳，强制浏览器从头播放 GIF
function getGifUrl(path) {
    return `${path}?t=${new Date().getTime()}`;
}

// 进出场动画控制
function playCatTransition(type, callback) {
    const transitionImg = document.getElementById("catTransition");
    const catImg = document.getElementById("catVideo");
    const catShadow = document.getElementById("catShadow");
    
    if (!transitionImg || !catImg || !catShadow) return;

    const folder = "./cat/";
    const screenPng = folder + "pingfeng.png"; // ✅ 屏风图片路径
    const expand = folder + "zhankai.gif";
    const close = folder + "bihe.gif";

    if (type === "open") {
        // --- 1. 屏风渐显 (0.7秒) ---
        catImg.style.display = "none";
        catShadow.style.display = "none";
        
        transitionImg.src = screenPng;
        transitionImg.style.transition = 'opacity 0.7s ease-in-out';
        transitionImg.style.opacity = '0';
        transitionImg.style.display = "block";
        
        void transitionImg.offsetWidth; // 强制浏览器应用初始样式
        transitionImg.style.opacity = '1'; // 开始渐显

        // --- 2. 屏风渐显后，播放“展开”GIF ---
        setTimeout(() => {
            catImg.style.display = "block";
            catShadow.style.display = "block";
            
            // 切换到“展开”GIF，并确保它完全不透明
            transitionImg.style.transition = 'none'; // 播放GIF时移除渐变
            transitionImg.src = getGifUrl(expand);

            // --- 3. 等待“展开”GIF播放完毕 ---
            setTimeout(() => {
                transitionImg.style.display = "none";
                transitionImg.src = "";
                if (callback) callback();
            }, GIF_DURATION.expand); // 使用配置中“展开”的时长

        }, 700); // 屏风渐显时长

    } else if (type === "close") {
        // --- 1. 播放“闭合”GIF ---
        transitionImg.style.display = "block";
        transitionImg.style.opacity = '1';
        transitionImg.style.transition = 'none';
        transitionImg.src = getGifUrl(close);

        // --- 2. “闭合”GIF播放完毕后，用屏风渐隐 (0.7秒) ---
        setTimeout(() => {
            catImg.style.display = "none";
            catShadow.style.display = "none";
            
            transitionImg.src = screenPng;
            transitionImg.style.transition = 'opacity 0.7s ease-in-out';
            
            void transitionImg.offsetWidth;
            transitionImg.style.opacity = '0'; // 开始渐隐

            // --- 3. 屏风渐隐后，清理现场 ---
            setTimeout(() => {
                transitionImg.style.display = "none";
                transitionImg.src = "";
                if (callback) callback();
            }, 700); // 屏风渐隐时长

        }, GIF_DURATION.close); // 使用“闭合”动画的时长
    }
}


// 快捷键呼叫小猫 (Alt+C)
document.addEventListener("keydown", (event) => {
    if (event.altKey && event.code === "KeyC") {
        const catImg = document.getElementById("catVideo");
        const catShadow = document.getElementById("catShadow");
        
        if (catVisible) {
            bubbleDisabled = true;
            playCatTransition("close", () => {
                catVisible = false;
                showBubble("小猫先躲起来啦～", true, true);
                localStorage.setItem("catVisible", "false");
            });
        } else {
            // 先让容器占位
            if (catImg) { catImg.style.display = "block"; catImg.style.visibility = "visible"; }
            if (catShadow) { catShadow.style.display = "block"; catShadow.style.visibility = "visible"; }
            
            playCatTransition("open", () => {
                catVisible = true;
                bubbleDisabled = false;
                showBubble("小猫回来啦喵～", true);
                localStorage.setItem("catVisible", "true");
            });
        }
    }
});

// 初始化与交互逻辑
document.addEventListener("DOMContentLoaded", () => {
    const catImg = document.getElementById("catVideo");
    const standbySrc = "./cat/daijizhuyaodongzuo.gif";

    // ✅ 新增：配置每个反应GIF的路径和专属时长 (单位: 毫秒)
    // 您可以在这里自由修改每个GIF的播放时间
    const reactionConfig = [
        { path: "./cat/weixiao.gif", duration: 10130 },         // 微笑动画的时长
        { path: "./cat/lianhong.gif", duration: 4730 },         // 脸红动画的时长
        { path: "./cat/daijiciyaodongzuo.gif", duration: 10050 }, // 待机次要动作的时长
        { path: "./cat/youchou.gif", duration: 8080 }          // "忧愁"作为普通随机反应时的时长
    ];

    let actionTimer = null; // 用于控制动作恢复的定时器

    if (catImg) {
        // 确保初始加载待机 GIF
        if (!catImg.src.includes("待机主要动作")) {
            catImg.src = standbySrc;
        }

        // 点击交互
        catImg.addEventListener("click", () => {
            if (isLocked) return;

            // --- 统计点击频率 (头晕逻辑) ---
            clickCount++;
            if (clickTimer) clearTimeout(clickTimer);
            clickTimer = setTimeout(() => { clickCount = 0; }, 2000);

            // 清除之前的恢复定时器，防止冲突
            if (actionTimer) clearTimeout(actionTimer);

            // 🌀 触发头晕
            if (clickCount >= 8) {
                isLocked = true;
                showBubble("喵呜呜……有点晕了喵～");

                // 切换到忧愁 GIF (使用 dizzy 专属时长)
                catImg.src = getGifUrl("./cat/youchou.gif");

                actionTimer = setTimeout(() => {
                    catImg.src = standbySrc;
                    isLocked = false;
                    clickCount = 0;
                }, GIF_DURATION.dizzy); // 注意：这里使用 dizzy 的时长
                return;
            }

            // 🐱 正常点击互动
            const meowReplies = ["喵~", "喵呜~", "喵喵喵？"];
            showBubble(meowReplies[Math.floor(Math.random() * meowReplies.length)]);

            // ✅ 核心修改：从 reactionConfig 中随机选择并播放
            const reaction = reactionConfig[Math.floor(Math.random() * reactionConfig.length)];
            
            // 播放反应 GIF
            catImg.src = getGifUrl(reaction.path);

            // 播放完毕后，根据该GIF的专属时长切回待机
            actionTimer = setTimeout(() => {
                catImg.src = standbySrc;
            }, reaction.duration); // 使用 reaction 对象中定义的专属 duration
        });
    }
});
// ✅ V2.0 - 支持特殊节日样式的 showBubble 函数
function showBubble(message, lock = false, force = false, specialClass = '') { 
  if (window.isZenMode && !force) return;
  if (bubbleDisabled && !force) return;
  if (bubbleLocked) return;

  // 核心修改：在显示前，先移除所有可能的特殊样式
  const specialBubbleClasses = [
    'bubble-birthday', 'bubble-chunjie', 'bubble-yuanxiao', 'bubble-duanwu', 
    'bubble-zhongqiu', 'bubble-qixi', 'bubble-shengdan', 'bubble-yuandan', 
    'bubble-guoqing', 'bubble-ertong', 'bubble-qingrenjie', 
    'bubble-wanshengjie'
  ];
  bubble.classList.remove(...specialBubbleClasses);

  // 如果传入了有效的特殊样式名，就添加它
  if (specialClass && specialBubbleClasses.includes(specialClass)) {
    bubble.classList.add(specialClass);
  }

  bubble.classList.remove("show");
  void bubble.offsetWidth;

  bubbleText.textContent = message;
  bubble.classList.add("show");

  if (lock) bubbleLocked = true;

  if (bubbleTimeout) clearTimeout(bubbleTimeout);
  bubbleTimeout = setTimeout(() => {
    bubble.classList.remove("show");
    bubbleLocked = false;
    // 动画结束后，再次确保移除特殊样式，恢复默认
    setTimeout(() =>{
      if (!bubble.classList.contains("show")) {
        bubble.classList.remove(...specialBubbleClasses);
      }
    }, 400); }, 4000);
}

// 搜索框点击触发
searchInput.addEventListener("focus", () => {
  // 🔴 新增：如果是菜单操作触发的聚焦，直接忽略，不弹气泡
  if (isMenuOperating) return; 

  const prompts = [
    "今天要搜索什么呀？",
    "想找点什么呢～",
    "输入关键词，小猫来帮你找！"
  ];
  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  showBubble(randomPrompt);
});

document.addEventListener("keydown", (event) => {
  
  if (event.altKey && event.code === "KeyC") {
    const catVideo = document.getElementById("catVideo");
    const catShadow = document.getElementById("catShadow"); 
    if (catVisible) {
      bubbleDisabled = true;

      // 播放闭合动画，结束后再隐藏小猫
      playCatTransition("close", () => {
        if (catVideo) catVideo.style.display = "none";
        if (catShadow) catShadow.style.display = "none"; 
        catVisible = false;
        showBubble("小猫先躲起来啦～", true, true);
        localStorage.setItem("catVisible", "false");
      });
    } else {
      // ✅ 先显示小猫容器（但暂时隐藏内容）
      if (catVideo) {
        catVideo.style.display = "block";
        catVideo.style.visibility = "visible"; // ✅ 立即显示
      }
      if (catShadow) {
        catShadow.style.display = "block";
        catShadow.style.visibility = "visible"; // ✅ 立即显示
      }

      // 播放展开动画，结束后再让小猫可见
      playCatTransition("open", () => {
        if (catVideo) catVideo.style.visibility = "visible";
        if (catShadow) catShadow.style.visibility = "visible";
        catVisible = true;
        bubbleDisabled = false;
        showBubble("小猫回来啦喵～", true);
        localStorage.setItem("catVisible", "true");
      });
    }
  }
});

// IndexedDB 背景视频存储
const DB_NAME = "WallpaperDB";
const DB_STORE_NAME = "Videos";

// 🚀 [性能优化] 全局单例数据库连接
let globalDb = null;

function openDatabase() {
  // 如果连接已存在且处于打开状态，直接复用
  if (globalDb) return Promise.resolve(globalDb);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    
    request.onupgradeneeded = function (e) {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
        db.createObjectStore(DB_STORE_NAME, { keyPath: "id" });
      }
    };
    
    request.onsuccess = function (e) {
      globalDb = e.target.result;
      
      // 监听连接断开，防止后续操作失败
      globalDb.onclose = () => { 
        console.warn("[G-web] IndexedDB 连接已关闭");
        globalDb = null; 
      };
      
      // 处理版本变更导致的连接关闭
      globalDb.onversionchange = () => { 
        console.warn("[G-web] IndexedDB 版本变更，关闭旧连接");
        globalDb.close(); 
        globalDb = null; 
      };
      
      resolve(globalDb);
    };
    
    request.onerror = function (e) {
      console.error("[G-web] IndexedDB 打开失败:", e);
      reject(e);
    };
  });
}

// 2.js - 修复后的 saveVideoToIndexedDB 函数
async function saveVideoToIndexedDB(file, key = "bgVideo") {
    // 1. 首先，在开启事务之前，完成所有需要等待的异步操作。
    //    准备好将要被保存的数据记录。
    let recordToSave;
    if (file instanceof Blob) {
        // 等待文件转换成 ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();
        recordToSave = { id: key, data: arrayBuffer, mimeType: file.type || 'application/octet-stream' };
    } else {
        // 如果传入的不是 Blob，假定它已经是正确的格式。
        recordToSave = { id: key, data: file };
    }

    // 2. 现在，在数据准备好之后，再打开数据库并执行同步的事务。
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        try {
            // 开启一个全新的、干净的事务
            const tx = db.transaction(DB_STORE_NAME, "readwrite");
            const store = tx.objectStore(DB_STORE_NAME);

            // 执行 'put' 操作
            const request = store.put(recordToSave);

            // 监听事务完成事件
            tx.oncomplete = () => {
                // 整个事务成功提交
                console.log(`[G-web] 壁纸已成功保存到 IndexedDB: ${key}`);
                resolve(); // Promise 成功
            };

            // 监听事务错误事件
            tx.onerror = () => {
                console.error('[G-web] IndexedDB 保存事务失败:', tx.error);
                reject(tx.error || new Error('IndexedDB transaction error')); // Promise 失败
            };

        } catch (err) {
            reject(err);
        }
    });
}

// ✅ 检查壁纸是否存在 (返回 true/false)
async function checkVideoExists(key) {
  try {
    const db = await openDatabase();
    const tx = db.transaction(DB_STORE_NAME, "readonly");
    const store = tx.objectStore(DB_STORE_NAME);
    const request = store.count(key); // 只查数量，比读取文件快得多

    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result > 0);
      request.onerror = () => resolve(false);
    });
  } catch (e) {
    return false;
  }
}

async function getVideoFromDB(key) {
  const db = await openDatabase();
  const tx = db.transaction(DB_STORE_NAME, "readonly");
  const store = tx.objectStore(DB_STORE_NAME);
  const request = store.get(key);
  return new Promise((resolve, reject) => {
    request.onsuccess = (e) => {
      // 【关键修正】: 检查结果是否存在，并返回 .data 属性
      const res = e.target.result;
      if (res) {
        // 兼容 background.js 保存的 ArrayBuffer + mimeType 结构
        try {
          if (res.data && !(res.data instanceof Blob)) {
            const mime = res.mimeType || 'image/jpeg';
            const blob = new Blob([res.data], { type: mime });
            resolve(blob);
            return;
          }
          // 如果已经是 Blob 或直接是文件对象，直接返回
          resolve(res.data || null);
          return;
        } catch (err) {
          console.error('[G-web] 从 IndexedDB 构建 Blob 失败:', err);
          resolve(null);
          return;
        }
      } else {
        resolve(null); // 如果没找到，返回 null
      }
    };
    request.onerror = (e) => reject(e);
  });
}

// ✅ 页面加载时的读取逻辑 (读取 localStorage 记录的当前 ID)
async function loadVideoFromIndexedDB() {
  try {
    const currentKey = localStorage.getItem("currentWallpaperKey") || "bgVideo"; 
    const file = await getVideoFromDB(currentKey);
    
    if (!file) return null;
    // 使用统一的 helper 来设置背景并管理 objectURL（会自动释放旧的 URL）
    try {
        await setBackgroundFromBlob(file);
    } catch (e) {
        console.error('[G-web] 设置背景失败:', e);
    }
    return file;
  } catch (e) {
    console.error('loadVideoFromIndexedDB 出错', e);
    return null;
  }
}
// ✅ 删除 IndexedDB 中已保存的壁纸 (支持删除指定 Key)
// 如果不传 key，默认删除 bgVideo (用于自定义上传的清理)
function deleteVideoFromIndexedDB(key) {
  const targetKey = key || "bgVideo"; 
  return openDatabase().then(db => {
    const tx = db.transaction(DB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DB_STORE_NAME);
    store.delete(targetKey);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject();
    });
  }).catch((e) => console.error("删除失败", e));
}
window.addEventListener("DOMContentLoaded", () => {
  updateBeijingTime();
  setInterval(updateBeijingTime, 1000);
  const savedVisible = localStorage.getItem("catVisible");
  if (savedVisible === "false") {
    const catVideo = document.getElementById("catVideo");
    if (catVideo) catVideo.style.display = "none";
    catVisible = false;
    bubbleDisabled = true;
  } else {
    if (catVisible) {
      playCatTransition("open", () => {
        const catVideo = document.getElementById("catVideo");
        if (catVideo) catVideo.style.display = "block";
      });
    }
    catVisible = true;
    bubbleDisabled = false;
  }

  // ✅ [修正] 初始问候逻辑 (包含生日、公历节日、农历节日)
  if (catVisible && !hasShownInitialTip) {
    let greetingShown = false;
    
    // 1. Check for special day greetings by calling the new helper function
    const specialGreeting = checkSpecialDayGreeting();
    if (specialGreeting) {
      showBubble(specialGreeting.msg, false, true, specialGreeting.class);
      greetingShown = true;
    }

    // 2. If no special greeting was shown, show the default initial greeting
    if (!greetingShown) {
      showBubble("喵喵！！（你好！！）", false, true);
    }
    
    // Mark that the initial greeting routine has run to prevent it from running again in the same session
    hasShownInitialTip = true;
  }
});
document.getElementById("videoUpload").addEventListener("change", async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const bgImage = document.getElementById("bgImage");
  const bgVideo = document.getElementById("bgVideo");
  const modal = document.getElementById("wallpaperModal");

  // 使用统一 helper 来设置背景（会清理旧的 objectURL）
  try {
    await setBackgroundFromBlob(file);
  } catch (e) {
    console.error('[G-web] 设置上传壁纸失败:', e);
  }

  modal.classList.remove("show");
setTimeout(() => {
  modal.style.display = "none";
}, 350); // 与 CSS 动画时间一致


// ✅ 后台异步保存到 IndexedDB（不阻塞 UI）
  saveVideoToIndexedDB(file).then(() => {
    // 🛠️ 修复开始：明确指定当前壁纸类型和 Key
    localStorage.setItem("wallpaperType", "upload");      // 标记为上传类型
    localStorage.setItem("currentWallpaperKey", "bgVideo"); // 强制指针回到默认的自定义位置
    localStorage.removeItem("wallpaper");                 // 清理旧的 base64 缓存
  }).catch((err) => {
    console.error("保存失败:", err);
    // 即使保存失败，也不影响当前显示
  });

  // ✅ 选择背景后弹出小猫评论
  const wallpaperComments = [
    "哇~新壁纸好漂亮喵！",
    "小猫喜欢这个背景～很有感觉喵！",
    "换了新壁纸，气氛都不一样了喵～"
  ];
  const comment = wallpaperComments[Math.floor(Math.random() * wallpaperComments.length)];
  showBubble(comment);
// 重置 input
  event.target.value = "";
});

    const input = document.getElementById('searchInput');
    const button = document.getElementById('searchBtn');
    const suggestionList = document.getElementById('suggestionList');

// 渲染建议列表的函数 (已添加：空值安全锁)
function renderSuggestions(suggestions) {
  const suggestionList = document.getElementById("suggestionList");
  const input = document.getElementById("searchInput");
  
  // 🛡️🔥🔥【最终安全锁】🔥🔥🛡️
  // 无论谁调用这个函数，只要检测到输入框现在是空的，强制隐藏列表！
  // 这能完美解决“删除太快导致建议残留”的问题
  if (!input || !input.value.trim()) {
    if (suggestionList) {
      suggestionList.style.display = "none";
      suggestionList.innerHTML = "";
    }
    return; // 直接结束，不准渲染
  }

  // 如果没有建议数据，也隐藏
  if (!suggestions || !suggestions.length) {
    suggestionList.style.display = "none";
    return;
  }

  // --- 下面是正常的渲染逻辑 ---
  suggestionList.innerHTML = "";
  suggestions.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;
    
    // 点击建议项的逻辑
    const clickHandler = () => {
        input.value = s;
        suggestionList.style.display = "none";
        
        // 判断是否是 AI 模式
        const isAiMode = localStorage.getItem("isAiMode") === "true";
        if (isAiMode) {
             chrome.storage.local.set({ 
                "pending_query": s,
                "auto_send_timestamp": Date.now()
             }, () => {
                window.open("https://www.doubao.com/chat/", "_blank");
             });
        } else {
             // 普通搜索提交
             const form = document.querySelector("form");
             // 尝试找到 hidden input，如果没有就创建一个 (兼容不同搜索引擎)
             let hidden = form.querySelector('input[type="hidden"]');
             if (!hidden && s) { 
                hidden = document.createElement("input");
                hidden.type = "hidden";
                form.appendChild(hidden);
             }
             if (hidden) hidden.value = s;
             form.submit();
        }
    };

    li.addEventListener("mousedown", clickHandler);
    li.addEventListener("touchstart", clickHandler, {passive: true});
    suggestionList.appendChild(li);
  });

  suggestionList.style.display = "block";
}
// ✅ 请用这段代码替换 main.js 底部原有的 input 监听逻辑

// 在 input 监听器外部定义一个定时器变量
let suggestTimer = null;
// 再次获取元素，防止变量作用域问题
const searchInputEl = document.getElementById('searchInput');
const searchButtonEl = document.getElementById('searchBtn');
const suggestionListEl = document.getElementById('suggestionList');

if (searchInputEl) {
  searchInputEl.addEventListener('input', () => {
    const query = searchInputEl.value.trim();
    
    // 控制按钮状态
    if (searchButtonEl) searchButtonEl.disabled = query === "";

    // 1. 【防抖核心】每次输入先清除上一次的定时器
    if (suggestTimer) clearTimeout(suggestTimer);

    // 2. 【立即清空】如果是空字符，立即隐藏建议列表，并直接返回
    if (!query) {
      suggestionListEl.style.display = "none";
      suggestionListEl.innerHTML = "";
      return; // ⛔️ 关键：不再执行后面的请求
    }

suggestTimer = setTimeout(() => {
      // 再次检查（防止定时器触发时刚好删完了）
      if (!searchInputEl.value.trim()) return;

      chrome.runtime.sendMessage({ type: "baiduSuggest", q: query }, (data) => {
        // 数据回来后，交给带“安全锁”的 renderSuggestions 处理
        const items = Array.isArray(data) ? data : (data?.s || []);
        renderSuggestions(items);
      });
    }, 200);
  });
}    input.addEventListener("blur", () => {
      setTimeout(() => {
        suggestionList.style.display = "none";
      }, 150);
    });
    input.addEventListener("focus", () => {
      if (suggestionList.children.length > 0) {
        suggestionList.style.display = "block";
      }
    });const wallpaperBtn = document.querySelector('.wallpaper-btn');
input.addEventListener("focus", () => {
  wallpaperBtn.classList.add('disabled');
});
input.addEventListener("blur", () => {
  setTimeout(() => {
    wallpaperBtn.classList.remove('disabled');
  }, 150); // 等待用户可能点击建议列表
});
    // ✅ 北京时间 + 问候语
    function updateBeijingTime() {
      const now = new Date();
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const beijingTime = new Date(utc + 8 * 3600000);
      const padZero = num => num.toString().padStart(2, '0');const year = beijingTime.getFullYear();
      const month = padZero(beijingTime.getMonth() + 1);
      const date = padZero(beijingTime.getDate());
      const hours = beijingTime.getHours();
      const minutes = padZero(beijingTime.getMinutes());
      const seconds = padZero(beijingTime.getSeconds());
      const formatted = `${year}.${month}.${date} ${padZero(hours)}:${minutes}:${seconds}`;
      document.getElementById('beijingTime').textContent = formatted;
      // ✅ 星期几显示
const weekDays = ["星期日💜","星期一❤️","星期二🧡","星期三💛","星期四💚","星期五💙","星期六🩵"];
document.getElementById('weekDay').textContent = weekDays[beijingTime.getDay()];
      // 问候语逻辑
      const greetingEl = document.getElementById('greetingMessage');
      let greeting = "";
      if (hours >= 6 && hours <= 10) {
        greeting = " 😉 早上好 ";
      } else if (hours >= 11 && hours <= 12) {
        greeting = "😊️ 中午好 ";
      } else if (hours >= 13 && hours <= 17) {
        greeting = "️😘️ 下午好 ";
      } else {
        greeting = "😌 晚上好 ";
      }
      greetingEl.textContent = greeting;
    }
// =======================================================
// ☁️ 心知天气 (Seniverse) - 统一私钥版
// =======================================================

const WEATHER_KEY = (window.APP_CONFIG && window.APP_CONFIG.WEATHER_KEY) || ""; // 从 config.js 读取
const DEFAULT_CITY = "Beijing"; // 默认城市

// 1. 渲染天气 UI
function renderWeatherUI(data) {
  const location = data.location.name; // 城市名
  const weatherText = data.now.text;   // 天气现象 (晴/多云)
  const temp = data.now.temperature;   // 温度
  
  // 获取表情 (复用您已有的函数)
  const emoji = typeof getWeatherEmoji === 'function' ? getWeatherEmoji(weatherText) : '🌤';
  
  const textEl = document.getElementById("weather-text");
  if (textEl) {
    textEl.textContent = `${location} | ${emoji} ${weatherText} ${temp}℃`;
  }
}

// 在 2.js 中找到 async function fetchWeather(locationStr)
async function fetchWeather(locationStr) {
  if (!locationStr) return;

  // --- A. 检查本地缓存 (30分钟) ---
  const CACHE_KEY = `seniverse_v2_${locationStr}`;
  const CACHE_TIME = 30 * 60 * 1000; 

  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      // 如果缓存有效
      if (Date.now() - timestamp < CACHE_TIME) {
        console.log(`☁️ 使用缓存天气: ${data.location.name}`);
        renderWeatherUI(data);
        setWallpaperForWeather(data); // <<< 在这里添加调用
        return; 
      }
    } catch (e) { /* 忽略缓存错误 */ }
  }

  // --- B. 发起网络请求 ---
  try {
    // 心知天气 API: 支持直接传 "lat:lon" 格式
    const url = `https://api.seniverse.com/v3/weather/now.json?key=${WEATHER_KEY}&location=${locationStr}&language=zh-Hans&unit=c`;
    
    const res = await fetch(url);
    const json = await res.json();

    if (json.results && json.results.length > 0) {
      const result = json.results[0];
      
      // 更新 UI
      renderWeatherUI(result);
      setWallpaperForWeather(result); // <<< 在这里添加调用

      // 写入缓存
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: result,
        timestamp: Date.now()
      }));
    } else {
      console.warn("心知天气返回异常:", json);
    }
  } catch (e) {
    console.error("天气请求失败:", e);
    const textEl = document.getElementById("weather-text");
    if(textEl) textEl.textContent = "天气加载失败";
  }
}


// 3. 供外部调用的接口
// 场景A: 定位成功后调用 (直接传坐标字符串)
async function getWeatherByCoords(lat, lon) {
  const locationParam = `${lat}:${lon}`;
  console.log("定位成功，请求坐标天气:", locationParam);
  fetchWeather(locationParam);
}

// 场景B: 定位失败或默认调用 (传城市名)
async function getWeatherByCity(cityName) {
  fetchWeather(cityName || DEFAULT_CITY);
}

// 进入网站时尝试定位
window.addEventListener("load", () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        getWeatherByCoords(latitude, longitude);
      },
      (err) => {
        console.warn("定位失败，使用默认城市", err);
        getWeatherByCity(DEFAULT_CITY);
      },
      { timeout: 10000 }
    );
  } else {
    console.warn("浏览器不支持定位，使用默认城市");
    getWeatherByCity(DEFAULT_CITY);
  }
});
window.addEventListener('message', (e) => {
  if (e.origin !== 'chrome-extension://<YOUR_EXT_ID>' && e.origin !== 'https://your-extension-host-if-any') {
    // 只接受你知道的来源，或在开发时先放开
    // return;
  }
  const data = e.data;
  if (!data) return;
  if (data.type === 'location') {
    // 使用 data.coords.latitude / longitude
    // 在页面上显示或调用天气 API...
  } else if (data.type === 'location-error') {
    console.warn('Location error:', data.message);
  }
});
document.addEventListener("DOMContentLoaded", async () => {
  const bgImage = document.getElementById("bgImage");
  const bgVideo = document.getElementById("bgVideo");
  // === 定义外部每日壁纸函数 ===
window.applyDailyExternalWallpaper = async function() {
    const bgImage = document.getElementById("bgImage");
    const bgVideo = document.getElementById("bgVideo");
    const DAILY_WALLPAPER_KEY = 'daily_external_wallpaper';

    // 统一的UI准备（bgVideo 可能因网页壁纸模式被隐藏或移除，加 null 保护）
    if (bgVideo) bgVideo.style.display = "none";
    if (bgImage) bgImage.style.display = "block";
    const bgWebFrame = document.getElementById("bgWebFrame");
    if (bgWebFrame) {
        bgWebFrame.style.display = "none";
        bgWebFrame.src = ""; 
    }
    const displayImageFromBlob = (blob) => {
      // 使用统一 helper 处理 blob（会自动释放旧的临时 URL）
      if (!(blob instanceof Blob)) {
        clearCurrentWallpaperUrl();
        console.error('[G-web] 期望获取 Blob，但得到:', blob);
        if (bgImage) bgImage.src = "wallpapers/1.jpg"; // 回退
        return;
      }
      setBackgroundFromBlob(blob).catch(err => {
        console.error('[G-web] displayImageFromBlob 设置失败:', err);
      });
    };

    try {
        // 1. 优先尝试从 IndexedDB 获取
        // 【关键修正】：getVideoFromDB 直接返回 blob，不再需要 .data
        const cachedBlob = await getVideoFromDB(DAILY_WALLPAPER_KEY);

        if (cachedBlob) {
            // 缓存命中，这是最快的路径
            displayImageFromBlob(cachedBlob);
            return;
        }
        
        // 2. 缓存未命中：请求后台脚本去下载
        console.warn("[G-web] 本地缓存未找到，请求后台脚本下载...");
        bgImage.src = "wallpapers/1.jpg"; // 先显示一个临时的

        chrome.runtime.sendMessage({ action: 'getDailyWallpaper' }, async (response) => {
            if (response && response.success) {
                // 【关键修正】：再次读取时，也直接使用返回的 blob
                const newlyCachedBlob = await getVideoFromDB(DAILY_WALLPAPER_KEY);
                if (newlyCachedBlob) {
                    displayImageFromBlob(newlyCachedBlob);
                } else {
                    console.error("[G-web] 后台报告成功但无法从缓存读取，回退到默认壁纸。");
                    bgImage.src = "wallpapers/1.jpg";
                }
            } else {
                console.error("[G-web] 后台脚本缓存壁纸失败，使用默认壁纸。");
                bgImage.src = "wallpapers/1.jpg";
            }
        });

    } catch (error) {
        console.error("[G-web] 加载每日壁纸主流程出错:", error);
        bgImage.src = "wallpapers/1.jpg";
    }
}
  const wallpaperType = localStorage.getItem("wallpaperType");
  const wallpaperPath = localStorage.getItem("wallpaper");
  
  // 尝试从 IndexedDB 加载 (用户自定义或下载的壁纸)
  let loadedFromDB = false;
  if (!wallpaperType || wallpaperType === "upload") {
    try {
      const file = await loadVideoFromIndexedDB();
      if (file) {
        loadedFromDB = true;
      }
    } catch (err) {
    }
  }
  
  // 如果已从 IndexedDB 加载成功，说明是用户选择，直接返回
  if (loadedFromDB) return;
  if (wallpaperType === 'web') return;  // 网页壁纸由 1.js 自行恢复，此处跳过，避免 initializeDefaultWallpaperByTime 破坏恢复逻辑
  if (wallpaperType === "daily_external") {
      window.applyDailyExternalWallpaper();
      return; // 结束，不执行后续逻辑
  }
  // 加载预设壁纸（用户从壁纸库选择的）
  if (wallpaperType === "preset" && wallpaperPath) {
    if (wallpaperPath.includes(".mp4")) {
      clearCurrentWallpaperUrl();
      // poster 垫底：bgImage 保持显示，视频就绪后再切换
      if (bgImage) {
        bgImage.src = "wallpapers/poster.jpg";
        bgImage.style.display = "block";
      }
      bgVideo.style.display = "none";
      try { bgVideo.pause(); } catch (e) {}
      bgVideo.removeAttribute('src');
      bgVideo.src = wallpaperPath;
      bgVideo.load();
      try {
        const savedMute = localStorage.getItem('backgroundVideoMuted') === 'true';
        const savedVol = parseInt(localStorage.getItem('backgroundVideoVolume') || '', 10);
        if (!isNaN(savedVol)) bgVideo.volume = Math.max(0, Math.min(1, savedVol / 100));
        else if (typeof bgVideo.volume === 'number' && bgVideo.volume === 0) bgVideo.volume = 0.5;
        if (window.isMusicPlayerPlaying) {
          savedBgVideoMutedState = savedMute;
          savedBgVideoVolume = bgVideo.volume;
          bgVideo.muted = true;
        } else {
          bgVideo.muted = savedMute;
        }
      } catch (e) {}
      bgVideo.addEventListener("canplay", () => {
        bgVideo.play().then(() => {
          bgVideo.style.display = "block";
          if (bgImage) bgImage.style.display = "none";
        }).catch(() => {
          try {
            if (!bgVideo.muted) { bgVideo.muted = true; }
            bgVideo.play().then(() => {
              bgVideo.style.display = "block";
              if (bgImage) bgImage.style.display = "none";
            }).catch(()=>{});
          } catch (e) {}
        });
      }, { once: true });
      bgVideo.addEventListener("error", () => {
        console.error("视频加载失败:", wallpaperPath);
        if (bgImage) {
          bgImage.src = "wallpapers/1.jpg";
          bgImage.style.display = "block";
        }
        bgVideo.style.display = "none";
      }, { once: true });
      return;
    } else {
      // 如果是远程图片，先清理本地临时 URL
      clearCurrentWallpaperUrl();
      bgVideo.style.display = "none";
      bgImage.style.display = "block";
      bgImage.src = wallpaperPath;
      return;
    }
  }

  // 最后兜底：如果用户没有设置任何壁纸，则执行新的按时间切换逻辑
  // vvvvvvvvvvvvvvvv 修改部分 vvvvvvvvvvvvvvvv
  initializeDefaultWallpaperByTime();
  // ^^^^^^^^^^^^^^^^ 修改部分 ^^^^^^^^^^^^^^^^
});
// ====================== 浏览器音乐播放检测 ======================
if ('mediaSession' in navigator) {

  // ... (getArtworkUrl 和 updateMediaDisplay 函数保持不变) ...

  function getArtworkUrl(artwork) {
    if (!artwork) return '';
    if (typeof artwork === 'string') return artwork;
    if (Array.isArray(artwork) && artwork.length > 0) {
      const preferred = artwork.find(a => a.sizes === '512x512') ||
                        artwork.find(a => a.sizes === '384x384') ||
                        artwork[artwork.length - 1];
      return preferred?.src || '';
    }
    return '';
  }

  function updateMediaDisplay(message) {
    const metadata = message.metadata || {};
    const widget = document.getElementById('mediaWidget');
    if (!widget) return;

    const titleEl = widget.querySelector('.title');
    const artistEl = widget.querySelector('.artist');
    if (titleEl) titleEl.textContent = metadata.title || '无标题';
    if (artistEl) artistEl.textContent = metadata.artist || '未知艺术家';

    const coverDiv = document.getElementById('mediaCover');
    const coverUrl = getArtworkUrl(metadata.artwork);
    
    const fallbackUrl = 'logo/icon.png'; 

    if (coverDiv) {
      if (coverUrl) {
        coverDiv.style.backgroundImage = `url(${coverUrl})`;
        
        const imgTester = new Image();
        imgTester.src = coverUrl;
        imgTester.onerror = () => {
            console.warn("封面加载失败，使用默认图标");
            coverDiv.style.backgroundImage = `url(${fallbackUrl})`;
        };
      } else {
        coverDiv.style.backgroundImage = `url(${fallbackUrl})`; 
      }
    }
  }


  // 3. 核心监听器：接收来自 background.js 的消息并控制组件和波纹
  chrome.runtime.onMessage.addListener((message) => {
    // 获取组件和波纹元素
    const widget = document.getElementById('mediaWidget');
    const wave = document.getElementById('musicWave');
    const bgVideo = document.getElementById('bgVideo'); // 获取背景视频元素
    
    if (!widget) return;

    if (message.type === 'mediaSessionUpdate') {
      updateMediaDisplay(message);

      // ★★★ 核心改动：只要收到更新（意味着组件出现），就显示组件并启动波纹 ★★★
      widget.classList.add('visible'); 
      const record = document.getElementById('recordDisc'); if (record) record.classList.add('visible');
      if (wave) wave.classList.add('playing'); 
      const rightPanel = document.getElementById('quickPanelright');
    // 只有在“非自动禅模式”下，才执行这个判断
    if (rightPanel && !rightPanel.classList.contains('collapsedright') && !window.isAutoZenActive) {
        // 如果面板已打开，立即添加位移类
        widget.classList.add('shifted-left');
    }

      // ==== 新增音频处理逻辑：音乐组件显示时，背景视频静音 ====
      if (bgVideo && bgVideo.style.display !== 'none' && !bgVideo.muted) {
          savedBgVideoVolume = bgVideo.volume;       // 保存当前音量
          savedBgVideoMutedState = bgVideo.muted;   // 保存当前静音状态 (通常为 false)
          bgVideo.muted = true;                     // 立即静音
          if (fadeInterval) clearInterval(fadeInterval); // 清除任何正在进行的淡入
      }
      // =======================================================

    } else if (message.type === 'mediaClear') {
      // 彻底停止或关闭标签页时：隐藏组件并复位
      widget.classList.remove('visible');
      const record = document.getElementById('recordDisc'); if (record) record.classList.remove('visible');
      if (wave) wave.classList.remove('playing'); // 停止波纹
      
      const titleEl = widget.querySelector('.title');
      const artistEl = widget.querySelector('.artist');
      const coverDiv = document.getElementById('mediaCover');
      
      if (titleEl) titleEl.textContent = '无标题';
      if (artistEl) artistEl.textContent = '未知艺术家';
      
      // ✅ 清空时也恢复为默认图标，或者隐藏
      if (coverDiv) coverDiv.style.backgroundImage = 'none';

      // ==== 新增音频处理逻辑：音乐组件隐藏时，背景视频恢复音量（淡入）====
      if (bgVideo && bgVideo.style.display !== 'none') { // 仅当背景视频是活动的
          // 如果是由于音乐组件显示而静音的，且之前不是静音状态，则淡入恢复
          if (bgVideo.muted && !savedBgVideoMutedState) { 
              bgVideo.muted = false; // 先取消静音
              let currentVolume = 0;
              const targetVolume = savedBgVideoVolume; // 目标音量
              const fadeDuration = 1000; // 淡入持续时间 (1秒)
              const steps = 50; // 分50步进行音量调整
              let step = 0;

              if (fadeInterval) clearInterval(fadeInterval); // 清除任何之前的淡入定时器

              fadeInterval = setInterval(() => {
                  step++;
                  currentVolume = targetVolume * (step / steps);
                  if (currentVolume >= targetVolume) {
                      currentVolume = targetVolume;
                      clearInterval(fadeInterval);
                      fadeInterval = null;
                  }
                  bgVideo.volume = currentVolume;
              }, fadeDuration / steps);
          } else if (!bgVideo.muted && !savedBgVideoMutedState) {
              // 如果音乐组件显示时背景视频就没被静音（比如用户手动设置了），或者之前就是静音的
              // 那么直接恢复到之前的音量，不需要淡入
              bgVideo.volume = savedBgVideoVolume;
          }
      }
      // =======================================================
    }
  });

} else {
  console.log("当前浏览器不支持 Media Session API");
}
// ... (2.js 文件的其余代码保持不变) ...


document.addEventListener("DOMContentLoaded", function () {
    // ... (保留你原来的代码) ...

    // ★★★ 新增元素获取 ★★★
    // 兼容处理：页面可能使用不同 id（如只有 #mediaWidget / #mediaCover）。
    const mediaContainer = document.getElementById('mediaContainer') || document.getElementById('mediaWidget');
    
    // 初始化折叠状态
    let isCollapsed = false; 
    // 音乐组件悬停时小猫随机评论（优先绑定到实际存在的元素）
    // 新增：仅在组件可见且未折叠/隐藏时才触发
    function isElementVisible(el) {
      if (!el) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return false;
      // 如果有折叠类或被标记为不可见，也视为不可见
      if (el.classList.contains('collapsed')) return false;
      return true;
    }

    if (mediaContainer) {
      mediaContainer.addEventListener('mouseenter', () => {
        // 如果组件当前不可见或处于折叠/隐藏状态，则不触发小猫评论
        if (!isElementVisible(mediaContainer)) return;

        const musicComments = [
          "这个歌曲口味不错喵～",
          "好听喵～小猫都想跟着摇摆了～",
          "哇，这歌让我想打滚喵～",
          "听到好歌，小猫要喵喵叫了～",
          "好听喵～给我听一整天也不腻～",
          "这封面也很有感觉喵～"
        ];
        showBubble(musicComments[Math.floor(Math.random() * musicComments.length)]);
      });
    }
  const quickPanel = document.getElementById('quickPanel');
  const openBtn = document.querySelector('.openBtn');
  // --- 核心：收起逻辑 ---
  function collapseSidebar(e) {
    if (e) e.stopPropagation(); // 阻止冒泡
    quickPanel.classList.add('collapsed');
    if (openBtn) openBtn.textContent = '▶';
  }
  // --- 核心：展开逻辑 ---
  function expandSidebar(e) {
    if (e) e.stopPropagation(); // 阻止冒泡
    quickPanel.classList.remove('collapsed');
    if (openBtn) openBtn.textContent = '◀';
  }
  // 1. 点击 ▶ 按钮逻辑
  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      if (quickPanel.classList.contains('collapsed')) {
        expandSidebar(e);
      } else {
        collapseSidebar(e);
      }
    });
  }
 // 4. 加载图标 (请确保这个函数已定义)
  try {
    loadIcons();
  } catch (err) {
    console.error("加载图标出错，但不影响侧边栏开关:", err);
  }
});
// 2. 点击外部区域自动收起
document.addEventListener('click', (e) => {
    // 如果点击的不是面板本身，也不是面板内部元素，且面板当前是展开状态，则收回
    if (!quickPanel.contains(e.target) && !quickPanel.classList.contains('collapsed')) {
      toggleLeftPanel();
    }
  });
(function quickPanelInit(){
  function setupQuick(){
    const quick = document.getElementById('quickPanel');
    if (!quick) { console.debug('[quickPanel] not present'); return; }
    const openBtn = quick.querySelector('.openBtn');
    const icons = quick.querySelector('.icons');

    function expand(){
      quick.classList.remove('collapsed');
      quick.setAttribute('aria-hidden','false');
      if (openBtn) { openBtn.textContent = '◀';  openBtn.setAttribute('aria-expanded','true'); }
      console.debug('[quickPanel] expand');
    }
    function collapse(){
      quick.classList.add('collapsed');
      quick.setAttribute('aria-hidden','true');
      if (openBtn) { openBtn.textContent = '▶';  openBtn.setAttribute('aria-expanded','false'); }
      console.debug('[quickPanel] collapse');
    }
    function toggle(){ if (quick.classList.contains('collapsed')) expand(); else collapse(); }

    if (openBtn){
      openBtn.addEventListener('click', (e)=>{ e.stopPropagation(); toggle(); });
      openBtn.addEventListener('keydown', (e)=>{ if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }});
    }

document.addEventListener('click', (e)=>{
      // 如果点击的是打开按钮，由上面的监听器处理，这里跳过
      if (e.target && e.target.closest && e.target.closest('.openBtn')) { e.stopPropagation(); toggle(); return; }
      
      // ✨ 新增逻辑：如果点击的是【添加图标弹窗】内部（包括输入框、预览图等），不要关闭侧边栏
      if (e.target.closest('#addIconModal')) return;

      // 原有逻辑：点击侧边栏外部时收起
      if (quick && !quick.contains(e.target) && !quick.classList.contains('collapsed')) collapse();
    });

    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') collapse(); });

    icons && icons.querySelectorAll('img').forEach(img => img.draggable = false);
    icons && icons.querySelectorAll('a').forEach(a => a.setAttribute('tabindex','0'));

    // === 添加 新建快捷 的交互逻辑 ===
    const addBtn = icons && icons.querySelector('.addBtn');
    const addModal = document.getElementById('addIconModal');
    const nameInput = document.getElementById('newIconName');
    const fileInput = document.getElementById('newIconFile');
    const previewImg = document.getElementById('newIconPreview');
    const urlInput = document.getElementById('newIconUrl');
    const saveBtn = document.getElementById('saveNewIcon');
    const cancelBtn = document.getElementById('cancelNewIcon');
    let uploadedData = null;

function closeAddModal(){
      if (!addModal) return;
      console.debug('[addIcon] closing');
      addModal.classList.remove('show'); addModal.setAttribute('aria-hidden','true');
      
      // ✨ 新增：关闭弹窗时，顺便把左侧栏也收起来（满足点击取消/遮罩关闭侧边栏的需求）
      //collapse();

      setTimeout(()=>{ try{ addModal.style.display = 'none'; } catch(e){} }, 350);
      if (fileInput) { fileInput.value = ''; uploadedData = null; }
      if (previewImg) { previewImg.style.display = 'none'; previewImg.src = ''; }
      if (nameInput) nameInput.value = '';
      if (urlInput) urlInput.value = '';
    }

    function openAddModal(){
      if (!addModal) return;
      console.debug('[addIcon] opening');
      // 参考 wallpaper 弹窗：先设置 display 再添加 show 类以触发动画
      try{ addModal.style.display = 'flex'; } catch(e){}
      requestAnimationFrame(()=>{
        addModal.classList.add('show'); addModal.setAttribute('aria-hidden','false');
        requestAnimationFrame(()=>{ if (nameInput) nameInput.focus(); });
      });
    }

    if (addBtn){
      addBtn.addEventListener('click', (e)=>{ e.stopPropagation(); openAddModal(); });
    }
    if (document.getElementById('closeAddModal')){
      document.getElementById('closeAddModal').addEventListener('click', closeAddModal);
    }
// 1. 修改取消按钮的点击事件
if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
        closeAddModal();
        collapse(); // ✨ 只有点击取消时，才顺便收起侧边栏
    });
}

// 2. 修改遮罩层（点击弹窗外部）的点击事件
if (addModal) {
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) {
            closeAddModal();
            collapse(); // ✨ 只有点击背景遮罩时，才顺便收起侧边栏
        }
    });
}

// 3. 修改右上角关闭按钮（如果有的话）
const closeX = document.getElementById('closeAddModal');
if (closeX) {
    closeX.addEventListener('click', () => {
        closeAddModal();
        collapse(); // ✨ 点击 X 关闭也收起
    });
}
    if (fileInput){
      fileInput.addEventListener('change', (e)=>{
        const f = e.target.files && e.target.files[0];
        if (f){
          const reader = new FileReader();
          reader.onload = ()=>{ uploadedData = reader.result; if (previewImg){ previewImg.src = uploadedData; previewImg.style.display='block'; } };
          reader.readAsDataURL(f);
        } else {
          uploadedData = null;
          if (previewImg){ previewImg.style.display='none'; previewImg.src=''; }
        }
      });
    }

    function makePlaceholderIcon(name, size=128){
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      // simple color from name hash
      let hash = 0; for (let i=0;i<name.length;i++) hash = name.charCodeAt(i) + ((hash<<5)-hash);
      const hue = Math.abs(hash) % 360;
      ctx.fillStyle = 'hsl('+hue+',70%,35%)';
      ctx.fillRect(0,0,size,size);
      // draw initial
      const char = name.trim().charAt(0).toUpperCase() || '?';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = Math.floor(size*0.5)+'px Arial';
      ctx.fillText(char, size/2, size/2+2);
      return canvas.toDataURL('image/png');
    }

    const STORAGE_KEY = 'quick_panel_icons';

    // ---- 创建单个自定义图标节点（含设置齿轮 & 删除浮层） ----
// 1. 定义一个全局变量记录当前拖拽的元素
    let dragSrcEl = null;

    // ---- 创建单个自定义图标节点（含设置齿轮 & 删除浮层 & 拖拽逻辑） ----
    function createCustomIconElement(item){
      const id = item.id || ('c'+Date.now()+Math.random()).replace('.', '');
      
      // 外层容器
      const wrapper = document.createElement('div');
      wrapper.className = 'iconWrapper';
      wrapper.dataset.id = id;
      
      // 🔥 开启拖拽功能 🔥
      wrapper.draggable = true;
      wrapper.style.cursor = 'grab'; // 鼠标手势

      // --- 拖拽事件监听 ---
      
      // 1. 开始拖拽
      wrapper.addEventListener('dragstart', function(e) {
        dragSrcEl = this;
        e.dataTransfer.effectAllowed = 'move';
        // 延迟一点添加样式，否则拖拽的幻影也会变成半透明
        setTimeout(() => this.classList.add('dragging'), 0);
      });

      // 2. 拖拽结束
      wrapper.addEventListener('dragend', function(e) {
        this.classList.remove('dragging');
        dragSrcEl = null;
        // 每次拖拽结束，保存新顺序
        saveIconOrder(); 
      });
// 3. 拖拽经过其他元素 (核心排序逻辑 + FLIP 动画)
      wrapper.addEventListener('dragover', function(e) {
        e.preventDefault(); 
        e.dataTransfer.dropEffect = 'move';

        if (this === dragSrcEl) return;

        const container = document.querySelector('#quickPanel .icons');
        const addWrapper = container.querySelector('.addWrapper');
        
        // --- 1. 记录变动前的位置 (First) ---
        // 获取除了“正在拖拽的那个”以外的所有图标
        const siblings = Array.from(container.querySelectorAll('.iconWrapper:not(.dragging)'));
        const positions = new Map();
        siblings.forEach(el => positions.set(el, el.getBoundingClientRect()));

        // --- 2. 执行 DOM 移动 ---
        const rect = this.getBoundingClientRect();
        // 计算鼠标在目标元素的高度比例
        const offset = e.clientY - rect.top - rect.height / 2;
        
        let hasMoved = false;

        // 只有当位置确实需要改变时才移动 DOM，防止动画抖动
        if (offset < 0) {
          // 鼠标在元素上半部分 -> 应该插在它前面
          if (this.previousElementSibling !== dragSrcEl) {
            container.insertBefore(dragSrcEl, this);
            hasMoved = true;
          }
        } else {
          // 鼠标在元素下半部分 -> 应该插在它后面
          if (this.nextElementSibling !== dragSrcEl) {
            container.insertBefore(dragSrcEl, this.nextSibling);
            hasMoved = true;
          }
        }

        // 强制把加号按钮保持在最后
        if (addWrapper && container.lastElementChild !== addWrapper) {
            container.appendChild(addWrapper);
        }

        // 如果 DOM 没有发生实质性变化，就不执行动画
        if (!hasMoved) return;

        // --- 3. 计算位置差并执行动画 (Last + Invert + Play) ---
        siblings.forEach(el => {
          const oldPos = positions.get(el);       // 旧位置
          const newPos = el.getBoundingClientRect(); // 新位置 (DOM 变动后)

          // 只有位置发生变化的元素才需要动画
          if (oldPos.top !== newPos.top || oldPos.left !== newPos.left) {
            const deltaX = oldPos.left - newPos.left;
            const deltaY = oldPos.top - newPos.top;

            // Invert:先把元素“瞬间”移回老位置（看起来像没动）
            el.style.transition = 'none';
            el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

            // Play: 强制浏览器重绘后，开启过渡，移除偏移，让它滑到新位置
            requestAnimationFrame(() => {
              // Trigger reflow
              void el.offsetWidth; 
              
              // Enable smooth transition
              el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)';
              el.style.transform = ''; // Remove translate, element slides to new position
            });

            // Clean up styles after animation
            setTimeout(() => {
              el.style.transition = '';
            }, 300);
          }
        });
      });

      // --- Original logic remains unchanged ---

      // Link and image
      const a = document.createElement('a');
      a.href = item.url || '#'; a.title = item.name || ''; a.target = '_blank'; a.rel = 'noopener noreferrer';
      const img = document.createElement('img'); img.src = item.img || makePlaceholderIcon(item.name || '', 256); img.alt = item.name || ''; 
      img.draggable = false; // The image itself should not trigger native drag, let the wrapper handle it
      a.appendChild(img);
      a.draggable = false;
      wrapper.appendChild(a);

      // Gear button
      const gearBtn = document.createElement('button'); gearBtn.type='button'; gearBtn.className = 'iconSettings';
      const gearImg = document.createElement('img'); gearImg.src = 'images/chilun.png'; 
      gearBtn.appendChild(gearImg);
      wrapper.appendChild(gearBtn);

      // Delete overlay
      const pop = document.createElement('div');
      pop.className = 'iconPopover overlay';
      pop.innerHTML = `
        <button class="delBtn" type="button" style="background:#ff6b6b;color:white;">删除</button>
        <button class="cancelBtn" type="button" style="background:white;color:black;">取消</button>
      `;
      wrapper.appendChild(pop);

      // Gear event
      gearBtn.addEventListener('click', (e)=>{
        e.stopPropagation(); e.preventDefault();
        const isShown = pop.classList.contains('show');
        document.querySelectorAll('.iconPopover.show').forEach(p => p.classList.remove('show'));
        if (!isShown) pop.classList.add('show');
      });
pop.querySelector('.delBtn').addEventListener('click', (e) => {
  e.stopPropagation(); e.preventDefault();
  
  if (confirm(`确定要删除 "${item.name}" 吗？`)) {
    // 1. Close pop-up window to avoid it shrinking strangely
    pop.classList.remove('show');

    // 2. Add CSS animation class
    wrapper.classList.add('is-deleting');

    // 3. Wait for the animation to finish (300ms matches CSS transition time)
    setTimeout(() => {
      wrapper.remove(); // Actually remove from DOM
      saveIconOrder();  // Save latest state
      
      // Optional: Small bubble notification for successful deletion
      if(typeof showBubble === 'function') showBubble("应用已删除喵！🗑️");
    }, 300);
  }
});

      // Cancel event
      pop.querySelector('.cancelBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        pop.classList.remove('show');
      });

      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) pop.classList.remove('show');
      });

      return wrapper;
    }
// ---- Core: Save new order of icons ----
    function saveIconOrder() {
      const container = document.querySelector('#quickPanel .icons');
      if (!container) return;

      // 1. Get all icon wrappers on the page (excluding the plus button)
      const allWrappers = Array.from(container.querySelectorAll('.iconWrapper:not(.addWrapper)'));
      
      // 2. Get current ID order
      const newOrderIds = allWrappers.map(el => el.dataset.id);

      // 3. Read existing data (we need full data objects, not just IDs)
      let currentData = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEY); // Using your previously defined STORAGE_KEY ('quick_panel_icons')
        currentData = raw ? JSON.parse(raw) : (typeof DEFAULT_ICONS !== 'undefined' ? DEFAULT_ICONS : []);
      } catch(e) {
        currentData = [];
      }

      // 4. Reorder data according to ID order
      const newData = [];
      newOrderIds.forEach(id => {
        const item = currentData.find(d => d.id === id);
        if (item) {
          newData.push(item);
        }
      });

      // 5. If new icons were added and not yet synced to currentData, or data is incorrect, add a fallback
      // (usually not needed, as we only sort existing IDs)

      // 6. Save back to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    }
    function closeAllPopovers(){
      const open = document.querySelectorAll('.iconPopover.show');
      if (!open) return;
      open.forEach(p => {
        p.classList.remove('show');
        p.style.left = '';
        p.style.top = '';
        p.removeAttribute('data-side');
      });
      // Clear disabled and has-overlay states
      if (icons) {
        icons.querySelectorAll('a.icon-disabled').forEach(a=>a.classList.remove('icon-disabled'));
        icons.querySelectorAll('.iconWrapper.has-overlay').forEach(w=>w.classList.remove('has-overlay'));
        icons.classList.remove('overlay-open');
      }
    }

    function deleteCustomIcon(id){
      try{
        const wrapper = icons && icons.querySelector('.iconWrapper[data-id="'+id+'"]');
        if (wrapper) wrapper.remove();
        // If popover is mounted to <a> (with data-for), remove it as well
        const attachedPop = document.querySelector('.iconPopover[data-for="'+id+'"]');
        if (attachedPop) attachedPop.remove();
        const raw = localStorage.getItem(STORAGE_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(it => it.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        console.debug('[addIcon] deleted', id, 'remain=', filtered.length);
      }catch(e){ console.warn('[addIcon] delete fail', e); }
    }

    function loadCustomIcons(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const items = JSON.parse(raw);
        if (!Array.isArray(items)) return;
        const addWrapper = icons && icons.querySelector('.addWrapper');
        items.forEach(it => {
          try{
            // Ensure ID exists
            if (!it.id) it.id = ('c'+Date.now()+Math.random()).replace('.', '');
            const el = createCustomIconElement(it);
            if (icons){ if (addWrapper) icons.insertBefore(el, addWrapper); else icons.appendChild(el); }
          }catch(e){ console.warn('[addIcon] load item failed', e); }
        });
        console.debug('[addIcon] loaded', (items && items.length) || 0);
      }catch(e){ console.warn('[addIcon] load error', e); }
    }
if (saveBtn){
  saveBtn.addEventListener('click', ()=>{
    const name = (nameInput && nameInput.value || '').trim();
    let url = (urlInput && urlInput.value || '').trim();
    if (!name){ alert('请输入名称'); if (nameInput) nameInput.focus(); return; }
    if (!url){ alert('请输入URL'); if (urlInput) urlInput.focus(); return; }
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    let src = uploadedData;
    if (!src) src = makePlaceholderIcon(name, 256);
    showBubble('应用已添加喵！🎉');
    const id = ('c'+Date.now()+Math.random()).replace('.', '');
    const item = { id: id, name: name, url: url, img: src };

    // 🟢 Core Fix Start 🟢
    try {
      // 1. Read current storage
      const raw = localStorage.getItem(STORAGE_KEY);
      let list;

      if (raw) {
        // If storage exists, parse it
        list = JSON.parse(raw);
      } else {
        // ❗ Key: If no storage, use global default icons list as base!
        // This prevents overwriting default icons like Bilibili
        list = (typeof DEFAULT_ICONS !== 'undefined') ? [...DEFAULT_ICONS] : [];
      }

      // 2. Add new icon
      list.push(item);

      // 3. Save full list
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      console.debug('[addIcon] saved, total=', list.length);

      // 4. Immediately call the global load function to update the interface
      if (typeof loadIcons === 'function') {
        loadIcons();
      } else {
        // If global function not found, manually insert into DOM (fallback)
        const el = createCustomIconElement(item);
        const addWrapper = icons.querySelector('.addWrapper');
        if (addWrapper) icons.insertBefore(el, addWrapper);
      }

    } catch(e) { console.warn('[addIcon] save fail', e); }
    // 🟢 Core Fix End 🟢

    // Clean up and close
    uploadedData = null;
    closeAddModal();
  });
}
    if (!quick.classList.contains('collapsed')) expand(); else collapse();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupQuick); else setupQuick();
})();

/* ============================================================
   Repaired sidebar and icon management logic (drag and drop merged)
   ============================================================ */

const STORAGE_KEY = 'quick_panel_icons';
// Global variable: record the element currently being dragged
let dragSrcEl = null;

const DEFAULT_ICONS = [
  { id: 'def-1', name: '哔哩哔哩', url: 'https://www.bilibili.com', img: 'images/01.jpg' },
  { id: 'def-2', name: '抖音', url: 'https://www.douyin.com', img: 'images/02.jpg' },
  { id: 'def-3', name: 'YouTube', url: 'https://www.youtube.com/', img: 'images/03.jpg' },
  { id: 'def-4', name: '小红书', url: 'https://www.xiaohongshu.com/', img: 'images/04.jpg' },
  { id: 'def-5', name: '快手', url: 'https://www.kuaishou.com', img: 'images/29.jpg' },
  { id: 'def-6', name: 'TikTok', url: 'https://www.tiktok.com', img: 'images/30.jpg' },
  { id: 'def-7', name: 'Instagram', url: 'https://www.Instagram.com/', img: 'images/05.jpg' },
  { id: 'def-8', name: '微博', url: 'https://www.weibo.com/', img: 'images/06.jpg' },
  { id: 'def-9', name: '爱奇艺', url: 'https://www.iqiyi.com/', img: 'images/07.jpg' },
  { id: 'def-10', name: '优酷', url: 'https://www.youku.com/', img: 'images/08.jpg' },
  { id: 'def-11', name: '芒果TV', url: 'https://www.mgtv.com/', img: 'images/09.jpg' },
  { id: 'def-12', name: 'Netflix', url: 'https://www.netflix.com/', img: 'images/10.jpg' },
  { id: 'def-13', name: 'KIMI', url: 'https://www.kimi.com/', img: 'images/11.jpg' },
  { id: 'def-14', name: 'ChatGPT', url: 'https://chatgpt.com/', img: 'images/12.jpg' },
  { id: 'def-15', name: 'Gemini', url: 'https://gemini.google.com/', img: 'images/13.jpg' },
  { id: 'def-16', name: '网易云音乐', url: 'https://music.163.com/', img: 'images/14.jpg' },
  { id: 'def-33', name: 'QQ音乐', url: 'https://y.qq.com/', img: 'images/33.jpg' },
  { id: 'def-17', name: '酷狗音乐', url: 'https://www.kugou.com/', img: 'images/28.jpg' },
  { id: 'def-18', name: 'Spotify', url: 'https://open.spotify.com/', img: 'images/15.jpg' },
  { id: 'def-19', name: '淘宝', url: 'https://www.taobao.com/', img: 'images/16.jpg' },
  { id: 'def-20', name: '拼多多', url: 'https://www.pinduoduo.com/', img: 'images/17.jpg' },
  { id: 'def-21', name: '京东', url: 'https://www.jd.com/', img: 'images/18.jpg' },
  { id: 'def-22', name: '亚马逊', url: 'https://amazon.com/', img: 'images/19.jpg' },
  { id: 'def-23', name: 'Github', url: 'https://github.com/', img: 'images/20.jpg' },
  { id: 'def-24', name: 'CSDN', url: 'https://www.csdn.net/', img: 'images/21.jpg' },
  { id: 'def-25', name: '知乎', url: 'https://www.zhihu.com/', img: 'images/22.jpg' },
  { id: 'def-26', name: '百度贴吧', url: 'https://tieba.baidu.com/', img: 'images/23.jpg' },
  { id: 'def-27', name: 'Reddit', url: 'https://www.reddit.com/', img: 'images/24.jpg' },
  { id: 'def-28', name: 'Twitch', url: 'https://www.twitch.tv/', img: 'images/25.jpg' },
  { id: 'def-29', name: 'X', url: 'https://www.x.com', img: 'images/32.jpg' },
  { id: 'def-30', name: 'Discord', url: 'https://www.discord.com/', img: 'images/26.jpg' },
  { id: 'def-31', name: 'Wikipedia', url: 'https://www.wikipedia.org/', img: 'images/27.jpg' },
  { id: 'def-32', name: 'Pinterest', url: 'https://www.pinterest.com/', img: 'images/31.jpg' },
  { id: 'def-34', name: 'steam', url: 'https://store.steampowered.com/', img: 'images/34.jpg' },
  { id: 'def-35', name: '腾讯视频', url: 'https://v.qq.com/', img: 'images/35.jpg' }
];

// Helper: Generate placeholder icon
function makePlaceholderIcon(name, size=128){
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');
  let hash = 0; for (let i=0;i<name.length;i++) hash = name.charCodeAt(i) + ((hash<<5)-hash);
  const hue = Math.abs(hash) % 360;
  ctx.fillStyle = 'hsl('+hue+',70%,35%)';
  ctx.fillRect(0,0,size,size);
  const char = name.trim().charAt(0).toUpperCase() || '?';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = Math.floor(size*0.5)+'px Arial';
  ctx.fillText(char, size/2, size/2+2);
  return canvas.toDataURL('image/png');
}
// Core: Create icon node (fixed: double RAF optimization for FLIP animation)
function createCustomIconElement(item) {
  const id = item.id || ('c' + Date.now() + Math.random()).replace('.', '');
  
  // Outer container
  const wrapper = document.createElement('div');
  wrapper.className = 'iconWrapper';
  wrapper.dataset.id = id;

  // 🔥 Enable drag and drop functionality 🔥
  wrapper.draggable = true;
  wrapper.style.cursor = 'grab'; 

  // --- Drag event listeners ---
  
  // 1. Start drag
  wrapper.addEventListener('dragstart', function(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = 'move';
    // Delay adding style to ensure the "ghost image" of the drag is not transparent
    setTimeout(() => this.classList.add('dragging'), 0);
  });

  // 2. End drag
  wrapper.addEventListener('dragend', function(e) {
    this.classList.remove('dragging');
    dragSrcEl = null;
    saveIconOrder(); // Save order
    
    // Clean up all possible residual styles after dragging
    document.querySelectorAll('#quickPanel .icons .iconWrapper').forEach(el => {
      el.style.transition = '';
      el.style.transform = '';
    });
  });

  // 3. Drag over other elements (core sorting logic + FLIP animation)
  wrapper.addEventListener('dragover', function(e) {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';

    if (this === dragSrcEl) return;

    const container = document.querySelector('#quickPanel .icons');
    const addWrapper = container.querySelector('.addWrapper');
    
    // --- 1. First: Record pre-change positions ---
    const siblings = Array.from(container.querySelectorAll('.iconWrapper:not(.dragging)'));
    const positions = new Map();
    siblings.forEach(el => positions.set(el, el.getBoundingClientRect()));

    // --- 2. DOM operation ---
    const rect = this.getBoundingClientRect();
    const offset = e.clientY - rect.top - rect.height / 2;
    
    let hasMoved = false;

    if (offset < 0) {
      if (this.previousElementSibling !== dragSrcEl) {
        container.insertBefore(dragSrcEl, this);
        hasMoved = true;
      }
    } else {
      if (this.nextElementSibling !== dragSrcEl) {
        container.insertBefore(dragSrcEl, this.nextSibling);
        hasMoved = true;
      }
    }

    // Keep the plus button at the end
    if (addWrapper && container.lastElementChild !== addWrapper) {
        container.appendChild(addWrapper);
    }

    if (!hasMoved) return;

    // --- 3. Last & Invert & Play: Execute animation ---
    siblings.forEach(el => {
      const oldPos = positions.get(el);       
      const newPos = el.getBoundingClientRect(); 

      // Only elements whose position has changed need animation
      if (oldPos.top !== newPos.top || oldPos.left !== newPos.left) {
        const deltaX = oldPos.left - newPos.left;
        const deltaY = oldPos.top - newPos.top;

        // Invert: Instantly move the element back to its old position (looks like it hasn't moved)
        el.style.transition = 'none';
        el.style.transform = `translate(${deltaX}px, ${deltaY}px)`;

        // Play: Force the browser to execute the animation in the next frame
        // Key fix: Use two layers of requestAnimationFrame to ensure rendering cycle separation
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)';
            el.style.transform = ''; // Remove offset, let it slide to the new position
          });
        });

        // Clean up after animation
        setTimeout(() => {
          if (el.style.transform === '') {
             el.style.transition = '';
          }
        }, 300);
      }
    });
  });

  // Link
  const a = document.createElement('a');
  a.href = item.url || '#';
  a.title = item.name || '';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.draggable = false; 
  
  // Image
  const img = document.createElement('img');
  img.src = item.img || makePlaceholderIcon(item.name || '', 256);
  img.alt = item.name || '';
  img.draggable = false;
  
  a.appendChild(img);
  wrapper.appendChild(a);

  // 图标名称标签
  const label = document.createElement('span');
  label.className = 'iconLabel';
  label.textContent = item.name || '';
  wrapper.appendChild(label);

  // Gear button
  const gearBtn = document.createElement('button');
  gearBtn.type = 'button';
  gearBtn.className = 'iconSettings';
  const gearImg = document.createElement('img');
  gearImg.src = 'images/chilun.png'; 
  gearBtn.appendChild(gearImg);
  wrapper.appendChild(gearBtn);

  // Delete overlay
  const pop = document.createElement('div');
  pop.className = 'iconPopover overlay';
  pop.innerHTML = `
    <button class="delBtn" type="button" style="background:#ff6b6b;color:white;">删除</button>
    <button class="cancelBtn" type="button" style="background:white;color:black;">取消</button>
  `;
  wrapper.appendChild(pop);

  // Event handler
  gearBtn.addEventListener('click', (e) => {
    e.stopPropagation(); e.preventDefault();
    const isShown = pop.classList.contains('show');
    document.querySelectorAll('.iconPopover.show').forEach(p => p.classList.remove('show'));
    if (!isShown) pop.classList.add('show');
  });
pop.querySelector('.delBtn').addEventListener('click', (e) => {
  e.stopPropagation(); e.preventDefault();
  
  if (confirm(`确定要删除 "${item.name}" 吗？`)) {
    // 1. Close pop-up window to avoid it shrinking strangely
    pop.classList.remove('show');

    // 2. Add CSS animation class
    wrapper.classList.add('is-deleting');

    // 3. Wait for the animation to finish (300ms matches CSS transition time)
    setTimeout(() => {
      wrapper.remove(); // Actually remove from DOM
      saveIconOrder();  // Save latest state
      
      // Optional: Small bubble notification for successful deletion
      if(typeof showBubble === 'function') showBubble("应用已删除喵！🗑️");
    }, 300);
  }
});

  pop.querySelector('.cancelBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    pop.classList.remove('show');
  });

  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) pop.classList.remove('show');
  });

  return wrapper;
}

// Core: Save icon order
function saveIconOrder() {
  const container = document.querySelector('#quickPanel .icons');
  if (!container) return;

  // 1. Get all icon wrappers on the page (excluding the plus button)
  const allWrappers = Array.from(container.querySelectorAll('.iconWrapper:not(.addWrapper)'));
  
  // 2. Get current ID order
  const newOrderIds = allWrappers.map(el => el.dataset.id);

  // 3. Read existing data
  let currentData = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    currentData = raw ? JSON.parse(raw) : DEFAULT_ICONS;
  } catch(e) {
    currentData = DEFAULT_ICONS;
  }

  // 4. Reorder data according to ID order
  const newData = [];
  newOrderIds.forEach(id => {
    const item = currentData.find(d => d.id === id);
    if (item) newData.push(item);
  });

  // 5. Save back to localStorage
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
}

// Core: Load all icons
function loadIcons() {
  const iconsContainer = document.querySelector('#quickPanel .icons');
  const addWrapper = document.querySelector('#quickPanel .addWrapper'); 
  
  if (!iconsContainer || !addWrapper) {
    console.error("HTML structure does not match, please check .icons and .addWrapper");
    return;
  }

  // Clear existing icons (except for the plus button)
  iconsContainer.querySelectorAll('.iconWrapper:not(.addWrapper)').forEach(el => el.remove());

  // Read data
  let list = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    list = raw ? JSON.parse(raw) : DEFAULT_ICONS;
  } catch(e) {
    list = DEFAULT_ICONS;
  }
  
  if (list.length === 0 && !localStorage.getItem(STORAGE_KEY)) {
    list = DEFAULT_ICONS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // Render
  list.forEach(item => {
    // The createCustomIconElement here now refers to the global version with drag and drop functionality
    const el = createCustomIconElement(item);
    iconsContainer.insertBefore(el, addWrapper); 
  });
}

// Initialize sidebar interactions (plus button functionality, toggle panel)
document.addEventListener('DOMContentLoaded', () => {
  // 1. Load icons
  loadIcons();

  // 2. Sidebar toggle
  const quickPanel = document.getElementById('quickPanel');
  const openBtn = quickPanel.querySelector('.openBtn');
  const closeBtn = quickPanel.querySelector('.closeBtn');
  
  function togglePanel() {
    quickPanel.classList.toggle('collapsed');
    const isClosed = quickPanel.classList.contains('collapsed');
    if(openBtn) openBtn.textContent = isClosed ? '▶' : '◀';
  }
  
  if (openBtn) openBtn.addEventListener('click', togglePanel);
  if (closeBtn) closeBtn.addEventListener('click', togglePanel);
});
/**
 * @description If it is rainy, set the wallpaper to the initial background 6.mp4, but only if the user has not set their own wallpaper.
 * @param {object} weatherData - Weather data object obtained from the Seniverse API.
 */
function setWallpaperForWeather(weatherData) {
    const wallpaperType = localStorage.getItem("wallpaperType");
    const currentWallpaperKey = localStorage.getItem("currentWallpaperKey");

    // If the user has already selected a preset wallpaper or a custom wallpaper (upload/currentWallpaperKey), do nothing.
    if (wallpaperType === "preset" || currentWallpaperKey) {
        return;
    }

    const weatherText = weatherData.now.text;
    // Check if the weather text contains "rain"
    if (weatherText && weatherText.includes('雨')) {
        const bgVideo = document.getElementById("bgVideo");
        const rainVideo = 'wallpapers/video6.mp4';
        
        // To avoid unnecessary reloads, only change if the current wallpaper is not not already the rainy wallpaper
        if (!bgVideo.src.endsWith('video6.mp4')) {
            bgVideo.src = rainVideo;
            bgVideo.load();
            bgVideo.play().catch(()=>{});
        }
    }
}

/**
 * @description Sets the default initial wallpaper based on the current time.
 */
function initializeDefaultWallpaperByTime() {
    let bgVideo = document.getElementById("bgVideo");
    const bgImage = document.getElementById("bgImage");

    // bgImage 保持显示 poster.jpg 作为垫底，等视频播放后再隐藏
    if (bgImage) {
        bgImage.src = "wallpapers/poster.jpg";
        bgImage.style.display = "block";
    }

    // ── bgVideo 重建逻辑 ──────────────────────────────────────────────────────
    // 网页壁纸模式下，1.js 的 DOMContentLoaded 恢复逻辑可能已调用 bgVideo.remove()
    // 导致 getElementById 返回 null。此处检测到缺失时，按 index.html 原始属性重新创建
    // 并插回 bgImage 之后，保持 DOM 层叠顺序（bgImage z-index:-2 / bgVideo z-index:-1）
    if (!bgVideo) {
        console.log('[G-web] initializeDefaultWallpaperByTime: bgVideo 缺失，正在重建...');
        bgVideo = document.createElement('video');
        bgVideo.id = 'bgVideo';
        bgVideo.muted = true;
        bgVideo.loop = true;
        bgVideo.setAttribute('poster', 'wallpapers/poster.jpg');
        bgVideo.setAttribute('disablePictureInPicture', '');
        bgVideo.setAttribute('controlsList', 'nodownload');
        bgVideo.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;' +
                                 'object-fit:cover;z-index:-1;display:none;' +
                                 'user-select:none;-webkit-user-select:none;';
        const bgImageEl = document.getElementById('bgImage');
        if (bgImageEl && bgImageEl.parentNode) {
            bgImageEl.parentNode.insertBefore(bgVideo, bgImageEl.nextSibling);
        } else {
            document.body.insertBefore(bgVideo, document.body.firstChild);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────

    bgVideo.style.display = "none"; // 先隐藏，canplay 后再显示

    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const beijingTime = new Date(utc + 8 * 3600000);
    const hours = beijingTime.getHours();
    
    let videoFile = '';

    if (hours >= 5 && hours < 8) {
        videoFile = 'video1.mp4';
    } else if (hours >= 8 && hours < 12) {
        videoFile = 'video2.mp4';
    } else if (hours >= 12 && hours < 16) {
        videoFile = 'video3.mp4';
    } else if (hours >= 16 && hours < 18) {
        videoFile = 'video4.mp4';
    } else {
        videoFile = 'video5.mp4';
    }

    const savedMuteState = localStorage.getItem('backgroundVideoMuted') === 'true';
    if (window.isMusicPlayerPlaying) {
        savedBgVideoMutedState = savedMuteState;
        bgVideo.muted = true;
    } else {
        bgVideo.muted = savedMuteState;
    }

    bgVideo.src = `wallpapers/${videoFile}`;
    bgVideo.load();

    bgVideo.addEventListener('canplay', function onCanPlay() {
        bgVideo.removeEventListener('canplay', onCanPlay);
        bgVideo.play().then(() => {
            bgVideo.style.display = "block";
            if (bgImage) bgImage.style.display = "none";
        }).catch(() => {
            bgVideo.muted = true;
            bgVideo.play().then(() => {
                bgVideo.style.display = "block";
                if (bgImage) bgImage.style.display = "none";
            }).catch(() => {});
        });
    }, { once: true });
}
// =======================================================
// 🧹 localStorage cache auto-cleanup program
// =======================================================
document.addEventListener("DOMContentLoaded", () => {
    // Define a function to clean up expired weather cache
    function cleanupExpiredWeatherCache() {
        const CACHE_PREFIX = 'seniverse_v2_';
        // Set maximum cache retention time to 7 days (in milliseconds)
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        
        let itemsToRemove = [];

        // 1. Iterate through all keys in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            // 2. Filter out our weather cache
            if (key && key.startsWith(CACHE_PREFIX)) {
                const cached = localStorage.getItem(key);
                if (cached) {
                    try {
                        const { timestamp } = JSON.parse(cached);
                        // 3. Check if the timestamp has exceeded 7 days
                        if (now - timestamp > MAX_AGE) {
                            itemsToRemove.push(key); // If expired, record it for deletion
                        }
                    } catch (e) {
                        // If parsing fails (data format error), delete directly
                        itemsToRemove.push(key);
                    }
                }
            }
        }

        // 4. Batch delete all marked expired caches
        if (itemsToRemove.length > 0) {
            itemsToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
        }
    }

    // Execute cleanup function
    cleanupExpiredWeatherCache();
});

window.deleteWallpaperCompletely = async function(key) {
  const bgImage = document.getElementById("bgImage");
  const bgVideo = document.getElementById("bgVideo");
  
  // If no key is specified, try to get the currently used wallpaper
  const targetKey = key || localStorage.getItem("currentWallpaperKey");
  
  if (!targetKey) {
    console.warn('No wallpaper to delete');
    if (typeof showBubble === 'function') {
      showBubble('The current wallpaper is the default, no need to delete喵～');
    }
    return false;
  }
  
  try {
    
    // 1. Release Blob URL
    if (window.currentWallpaperUrl) {
      URL.revokeObjectURL(window.currentWallpaperUrl);
      window.currentWallpaperUrl = null;
    }
    
    // 2. Clear image element
    if (bgImage) {
      bgImage.src = '';
      bgImage.removeAttribute('src');
    }
    
    // 3. Clear video element
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.src = '';
      bgVideo.load();  // Reload to release decoder
      bgVideo.removeAttribute('src');
    }
    
    // 4. Delete IndexedDB data
    await deleteVideoFromIndexedDB(targetKey);
    
    // 5. Clear localStorage cache
    if (localStorage.getItem("currentWallpaperKey") === targetKey) {
      localStorage.removeItem("wallpaperType");
      localStorage.removeItem("currentWallpaperKey");
    }
    
    // 6. Suggest garbage collection (if available)
    if (window.gc && typeof window.gc === 'function') {
      window.gc();
    }
    
    // 7. Restore default wallpaper
    if (typeof initializeDefaultWallpaperByTime === 'function') {
      initializeDefaultWallpaperByTime();
    }
    
    // 8. Show notification
    if (typeof showBubble === 'function') {
      showBubble('Wallpaper deleted, default wallpaper restored喵～🗑️');
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Failed to delete wallpaper:', error);
    if (typeof showBubble === 'function') {
      showBubble('Failed to delete wallpaper喵... Please try again later');
    }
    return false;
  }
};

/**
 * Cleans up all unused wallpapers (keeps currently used and daily wallpapers)
 * @returns {Promise<number>} Number of deleted wallpapers
 */
window.cleanupUnusedWallpapers = async function() {
  try {
    const db = await openDatabase(); // 使用全局复用连接
    const tx = db.transaction("Videos", "readwrite");
    const store = tx.objectStore("Videos");
    
    const allKeys = await new Promise((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    const currentKey = localStorage.getItem("currentWallpaperKey");
    const DAILY_KEY = 'daily_external_wallpaper';
    
    const keysToDelete = allKeys.filter(key => 
      key !== currentKey && 
      key !== DAILY_KEY &&
      !key.startsWith('custom_video_')
    );
    
    for (const key of keysToDelete) {
      store.delete(key);
    }
    
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        // ❌ 不要手动关闭连接！
        if (typeof showBubble === 'function' && keysToDelete.length > 0) {
        }
        resolve(keysToDelete.length);
      };
      tx.onerror = () => {
        reject(tx.error);
      };
    });
    
  } catch (error) {
    console.error('❌ Failed to clean up unused wallpapers:', error);
    return 0;
  }
};

/**
 * Get wallpaper memory usage information
 * @returns {Promise<object>} Memory usage information
 */
window.getWallpaperMemoryInfo = async function() {
  try {
    const db = await openDatabase(); // 使用全局复用连接
    const tx = db.transaction("Videos", "readonly");
    const store = tx.objectStore("Videos");
    
    const allKeys = await new Promise((resolve) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
    });
    
    let totalSize = 0;
    const details = [];
    
    for (const key of allKeys) {
      const data = await new Promise((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
      });
      
      if (data && data.data) {
        const size = data.data.size || 0;
        totalSize += size;
        details.push({
          key: key,
          size: size,
          sizeInMB: (size / 1048576).toFixed(2),
          type: data.data.type
        });
      }
    }
    
    const info = {
      totalWallpapers: allKeys.length,
      totalSize: totalSize,
      totalSizeInMB: (totalSize / 1048576).toFixed(2),
      details: details
    };
    
    // ❌ 不要手动关闭连接！
    return info;
    
  } catch (error) {
    console.error('❌ Failed to get memory information:', error);
    return null;
  }
};

// =============================================
// 🎨 Optional: Add delete button to menu
// =============================================

/**
 * Create "Delete current wallpaper" menu item
 * Add this function to your menu initialization code
 */
function addDeleteWallpaperMenuItem() {
  // Assume you have a menu container with ID 'menuContainer'
  // Adjust according to your actual HTML structure
  const menuContainer = document.getElementById('menuContainer');
  if (!menuContainer) return;
  
  // Create delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'menu-button';
  deleteBtn.innerHTML = '🗑️ Delete current wallpaper';
  deleteBtn.addEventListener('click', async () => {
    const currentKey = localStorage.getItem("currentWallpaperKey");
    
    if (!currentKey) {
      alert('The current wallpaper is the default, no need to delete');
      return;
    }
    
    if (confirm('Are you sure you want to delete the current wallpaper? It will revert to the default wallpaper after deletion.')) {
      const success = await window.deleteWallpaperCompletely(currentKey);
      if (success) {
        alert('Wallpaper deleted successfully!');
      } else {
        alert('Failed to delete wallpaper, please check console for details.');
      }
    }
  });
  
  // Create cleanup button
  const cleanupBtn = document.createElement('button');
  cleanupBtn.className = 'menu-button';
  cleanupBtn.innerHTML = '🧹 Clean up unused wallpapers';
  cleanupBtn.addEventListener('click', async () => {
    if (confirm('This will delete all unused wallpapers (keeping currently used and daily wallpapers). Continue?')) {
      const count = await window.cleanupUnusedWallpapers();
      if (count > 0) {
        alert(`Successfully cleaned up ${count} unused wallpapers!`);
      } else {
        alert('No wallpapers to clean up');
      }
    }
  });
  
  // Create view memory button
  const memoryBtn = document.createElement('button');
  memoryBtn.className = 'menu-button';
  memoryBtn.innerHTML = '📊 View wallpaper memory usage';
  memoryBtn.addEventListener('click', async () => {
    const info = await window.getWallpaperMemoryInfo();
    if (info) {
      alert(
        `Wallpaper memory usage information:
        
Total wallpapers: ${info.totalWallpapers}
Total size: ${info.totalSizeInMB} MB

See console (F12) for detailed information`
      );
    } else {
      alert('Failed to get memory information');
    }
  });
  
  // Add to menu
  menuContainer.appendChild(deleteBtn);
  menuContainer.appendChild(cleanupBtn);
  menuContainer.appendChild(memoryBtn);
}

