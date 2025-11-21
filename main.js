let hasShownInitialTip = false;
    let bubbleLocked = false;
    let bubbleDisabled = false;
    let clickCount = 0;
    let catVisible = true;
let clickTimer = null;
let isLocked = false; // 🔒 是否处于冷却状态
// B站图标悬停
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("wallpaperModal");
  const grid = document.querySelector(".wallpaper-grid");
  const closeBtn = document.getElementById("closeModal");
  const videoUpload = document.getElementById("videoUpload");
  const bgImage = document.getElementById("bgImage");
  const bgVideo = document.getElementById("bgVideo");

  // 动态插入 1.jpg ~ 18.jpg
  for (let i = 1; i <= 9; i++) {
    const img = document.createElement("img");
    img.src = `wallpapers/${i}.jpg`;
    img.alt = `壁纸${i}`;
    img.loading = "lazy";
    img.addEventListener("click", () => {
      bgVideo.style.display = "none";
      bgImage.style.display = "block";
      bgImage.src = img.src;
      modal.style.display = "none";
      localStorage.setItem("wallpaperType", "preset");
      localStorage.setItem("wallpaper", img.src);
      deleteVideoFromIndexedDB().catch(()=>{});
      
      // ✅ 新增：选择壁纸后弹出小猫评论
      const wallpaperComments = [
        "哇~新壁纸好漂亮喵！",
        "小猫喜欢这个背景～很有感觉喵！",
        "换了新壁纸，气氛都不一样了喵～"
      ];
      const comment = wallpaperComments[Math.floor(Math.random() * wallpaperComments.length)];
      showBubble(comment);
    });
    grid.appendChild(img);
  }

  // ✅ 新增：动态插入 1.mp4 ~ 5.mp4 视频
  for (let i = 1; i <= 2; i++) {
    const videoSrc = `wallpapers/${i}.mp4`;

    // 缩略图 video 元素
    const thumb = document.createElement("video");
    thumb.src = videoSrc;
    thumb.preload = "metadata";
    thumb.muted = true;
    thumb.style.width = "100%";
    thumb.style.height = "80px";
    thumb.style.objectFit = "cover";
    thumb.style.borderRadius = "8px";
    thumb.style.cursor = "pointer";
    thumb.disablePictureInPicture = true;
    if (thumb.controlsList) thumb.controlsList.add("nodownload");

    // 包装容器与下方标签（悬停变灰效果由 CSS 控制）
    const tile = document.createElement("div");
    tile.className = "video-tile";
    const label = document.createElement("div");
    label.className = "video-label";
    label.textContent = "动态";

    // 点击即刻应用背景（不等 fetch/IndexedDB 完成）
    tile.addEventListener("click", async (e) => {
      e.stopPropagation();
      // 立即显示视频背景（直接使用相对路径）
      bgImage.style.display = "none";
      bgVideo.style.display = "block";
      bgVideo.poster = ""; // 清除 poster，避免显示海报
      bgVideo.src = videoSrc;
      bgVideo.load();

      // canplay 时尝试 play
      const onCanPlay = () => {
        bgVideo.play().catch(()=>{});
        bgVideo.removeEventListener("canplay", onCanPlay);
      };
      bgVideo.addEventListener("canplay", onCanPlay, { once: true });

      // 若加载失败，则回退到默认图片并打印错误（不阻塞用户）
      const onError = () => {
        console.error("预设视频加载失败：", videoSrc);
        bgVideo.style.display = "none";
        bgImage.style.display = "block";
        bgImage.src = "wallpapers/1.jpg";
        bgVideo.removeEventListener("error", onError);
      };
      bgVideo.addEventListener("error", onError, { once: true });

      // 记录为预设背景（路径），并尝试删除 IndexedDB 中上传的视频
      localStorage.setItem("wallpaperType", "preset");
      localStorage.setItem("wallpaper", videoSrc);
      deleteVideoFromIndexedDB().catch(()=>{});

      modal.style.display = "none";
      showBubble(  "哇~新壁纸好漂亮喵！",
        "小猫喜欢这个背景～很有感觉喵！",
        "换了新壁纸，气氛都不一样了喵～");

      // 后台异步尝试 fetch 并保存到 IndexedDB（仅做缓存，不影响当前显示）
      (async () => {
        try {
          const resp = await fetch(videoSrc);
          if (resp.ok) {
            const blob = await resp.blob();
            await saveVideoToIndexedDB(blob);
          } else {
            console.warn("fetch 返回非 OK:", resp.status, videoSrc);
          }
        } catch (err) {
          console.warn("后台 fetch/保存预设视频失败（可忽略）：", err);
        }
      })();
    });

    tile.appendChild(thumb);
    tile.appendChild(label);
    const grid = document.querySelector(".dynamic-grid") || document.querySelector(".wallpaper-grid");
    grid?.appendChild(tile);
  }

  // 添加"加号"区域
  const addBox = document.createElement("div");
  addBox.className = "add-wallpaper";
  addBox.textContent = "+";
  addBox.addEventListener("click", () => {
    videoUpload.click();
  });
  grid.appendChild(addBox);

  // 关闭弹窗
  closeBtn?.addEventListener("click", () => {
    modal.style.display = "none";
  });

  // 打开弹窗
  const openBtn = document.getElementById("openWallpaperModal");
  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      modal.style.display = "flex";
    });
  }

  // 文件选择后
  videoUpload.addEventListener("change", async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (file.type.startsWith("image/")) {
        bgVideo.style.display = "none";
        bgImage.style.display = "block";
        bgImage.src = result;
        localStorage.setItem("wallpaperType", "upload");
        localStorage.setItem("wallpaper", result);
        deleteVideoFromIndexedDB().catch(()=>{});
      } else if (file.type.startsWith("video/")) {
        bgImage.style.display = "none";
        bgVideo.style.display = "block";
        bgVideo.src = result;
        bgVideo.play().catch(() => {});
        localStorage.setItem("wallpaperType", "upload");
        localStorage.setItem("wallpaper", result);
        deleteVideoFromIndexedDB().catch(()=>{});
      } else {
        alert("请上传有效的 MP4 视频或图片文件。");
      }
      modal.style.display = "none";

      // ✅ 上传壁纸后的小猫评论
      const wallpaperComments = [
        "哇~新壁纸好漂亮喵！",
        "小猫喜欢这个背景～很有感觉喵！",
        "换了新壁纸，气氛都不一样了喵～"
      ];
      const comment = wallpaperComments[Math.floor(Math.random() * wallpaperComments.length)];
      showBubble(comment);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  });
});

document.getElementById("weather").addEventListener("mouseenter", () => {
 const weatherInfo = document.getElementById("weather-text").textContent.trim();

let replies = [];

if (weatherInfo.includes("晴") || weatherInfo.includes("多云")) {
  replies = ["天气真好喵～出去晒晒太阳吧！", "阳光暖暖的，小猫都想打滚了～"];
} else if (weatherInfo.includes("阴") || weatherInfo.includes("雾")) {
  replies = ["今天灰灰的喵～适合窝在家里～", "雾蒙蒙的，小猫都看不清路啦～"];
} else if (
  weatherInfo.includes("雨") ||
  weatherInfo.includes("雷阵雨") ||
  weatherInfo.includes("雨夹雪")
) {
  replies = ["下雨啦喵～记得带伞别淋湿了～", "雨声好治愈，小猫要蜷起来睡觉～"];
} else if (weatherInfo.includes("雪")) {
  replies = ["下雪啦喵～想和你一起踩雪花～", "雪花飘飘，小猫变成雪球啦～"];
} else {
  replies = ["外面的天气好神秘喵～", "不管什么天气，小猫都陪着你～"];
}

const reply = replies[Math.floor(Math.random() * replies.length)];
showBubble(reply);

});

document.getElementById("biliIcon").addEventListener("mouseenter", () => {
  const biliReplies = [
    "这是作者B站主页哦~",
    "B站也有我的小窝喔，偷偷告诉你~",
    "你居然找到了我的B站入口，好眼力！"
  ];
  const reply = biliReplies[Math.floor(Math.random() * biliReplies.length)];
  showBubble(reply);
});

// 油管图标悬停
document.getElementById("extraIcon").addEventListener("mouseenter", () => {
  const youtubeReplies = [
    "这是作者油管主页哦~",
    "YouTube 也藏着我的身影喔~",
    "偷偷告诉你，这里是我的油管传送门！"
  ];
  const reply = youtubeReplies[Math.floor(Math.random() * youtubeReplies.length)];
  showBubble(reply);
});
    document.getElementById("beijingTime").addEventListener("mouseenter", () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const beijingTime = new Date(utc + 8 * 3600000);

  const year = beijingTime.getFullYear();
  const month = beijingTime.getMonth() + 1;
  const date = beijingTime.getDate();
  const hours = beijingTime.getHours();

  let timeGreeting = "";
  if (hours >= 6 && hours <= 10) {
    timeGreeting = "清晨的阳光真温柔～";
  } else if (hours >= 11 && hours <= 13) {
    timeGreeting = "中午啦，记得吃饭哦～";
  } else if (hours >= 14 && hours <= 17) {
    timeGreeting = "下午时光，适合小憩一下～";
  } else {
    timeGreeting = "夜深了，早点休息吧～";
  }

  showBubble(`现在是${month}月${date}日｜${timeGreeting}`);
});
document.getElementById("weekDay").addEventListener("mouseenter", () => {
  const weekText = document.getElementById("weekDay").textContent.trim();
  showBubble(`今天是${weekText}，要加油哦！`);
});

const bubble = document.getElementById("catSpeechBubble");
const bubbleText = bubble.querySelector(".bubble-text");
const searchInput = document.getElementById("searchInput");
const greetingEl = document.getElementById("greetingMessage");

// 通用弹出函数
let bubbleTimeout = null;
function playCatAppear() {
  const video = document.getElementById('catAppear');
  video.style.display = 'block';
  video.play();
  video.onended = () => {
    video.style.display = 'none';
  };
}

function playCatDisappear() {
  const video = document.getElementById('catDisappear');
  video.style.display = 'block';
  video.play();
  video.onended = () => {
    video.style.display = 'none';
  };
}
function playCatTransition(type, callback) {
  const transitionVideo = document.getElementById("catTransition");
  if (!transitionVideo || !catVideo || !catShadow) return;

  const folder = "./小猫/";
  const appear = folder + "出现.webm";
  const expand = folder + "展开.webm";
  const close = folder + "闭合.webm";
  const disappear = folder + "消失.webm";
  transitionVideo.style.display = "block";

  transitionVideo.loop = false;
  transitionVideo.onended = null;
if (type === "open") {
    // ✅ 先隐藏小猫和阴影
    catVideo.style.display = "none";
    catShadow.style.display = "none";

    // 播放“出现”
    transitionVideo.src = appear;
    transitionVideo.load();
    transitionVideo.play().catch(() => {});

    transitionVideo.onended = () => {
      // ✅ 出现播放完后再显示小猫和阴影
      catVideo.style.display = "block";
      catShadow.style.display = "block";

      // 播放“展开”
      transitionVideo.src = expand;
      transitionVideo.load();
      transitionVideo.play().catch(() => {});

      transitionVideo.onended = () => {
        transitionVideo.style.display = "none";
        transitionVideo.onended = null;
        if (callback) callback();
      };
    };
  } else if (type === "close") {
    // 播放“闭合”
    transitionVideo.src = close;
    transitionVideo.load();
    transitionVideo.play().catch(() => {});

    transitionVideo.onended = () => {
      // ✅ 闭合播放完后隐藏小猫和阴影
      catVideo.style.display = "none";
      catShadow.style.display = "none";

      // 播放“消失”
      transitionVideo.src = disappear;
      transitionVideo.load();
      transitionVideo.play().catch(() => {});

      transitionVideo.onended = () => {
        transitionVideo.style.display = "none";
        transitionVideo.onended = null;
        if (callback) callback();
      };
    };
  }
}
function showBubble(message, lock = false, force = false) {
if (bubbleDisabled && !force) return; // 禁用状态下仅允许强制显示
  if (bubbleLocked) return;

  bubble.classList.remove("show");
  void bubble.offsetWidth;

  bubbleText.textContent = message;
  bubble.classList.add("show");

  if (lock) bubbleLocked = true;

  if (bubbleTimeout) clearTimeout(bubbleTimeout);
  bubbleTimeout = setTimeout(() => {
    bubble.classList.remove("show");
    bubbleLocked = false;
  }, 4000);
}

// 搜索框点击触发
searchInput.addEventListener("focus", () => {
  const prompts = [
    "今天要搜索什么呀？",
    "想找点什么呢～",
    "输入关键词，小猫来帮你找！"
  ];
  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
  showBubble(randomPrompt);
});

// 问候语悬停触发
greetingEl.addEventListener("mouseenter", () => {
  const greetingText = greetingEl.textContent.trim();

  const replies = {
    "早上好": ["早上好呀！", "新的一天开始啦～", "早安早安，今天也要元气满满！"],
    "中午好": ["中午好呀～", "午饭时间到啦，吃饱才有力气喵！", "中午好，来休息一下吧～"],
    "下午好": ["下午好呀！", "下午时光最适合发呆了～", "继续加油，离下班不远啦！"],
    "晚上好": ["晚上好呀～", "辛苦啦，今晚早点休息哦～", "夜晚是属于放松的时间～"],
    "默认": ["你好呀～", "喵～你来啦！", "嘿嘿，在想什么呢？"]
  };

  let matchedKey = Object.keys(replies).find(key => greetingText.includes(key));
  if (!matchedKey) matchedKey = "默认";

  const options = replies[matchedKey];
  const reply = options[Math.floor(Math.random() * options.length)];

  showBubble(reply);
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

    document.addEventListener("DOMContentLoaded", () => {
  const catVideo = document.getElementById("catVideo");
  const standbySrc = "./小猫/待机主要动作.webm";
  const reactionVideos = ["./小猫/微笑.webm", "./小猫/脸红.webm", "./小猫/待机次要动作.webm", "./小猫/忧愁.webm"];

  if (catVideo) {
    // 初始状态标记为待机
    catVideo.dataset.state = "standby";

    catVideo.play().catch(() => {
      document.addEventListener("click", () => catVideo.play(), { once: true });
    });

catVideo.addEventListener("click", () => {
  if (catVideo.dataset.state !== "standby" || isLocked) return;

  // 🧠 点击频率统计
  clickCount++;
  if (clickTimer) clearTimeout(clickTimer);
  clickTimer = setTimeout(() => {
    clickCount = 0;
  }, 2000);

  // 🌀 触发头晕逻辑
  if (clickCount >= 8) {
    isLocked = true; // 🔒 进入冷却状态
    const dizzyReplies = [
      "喵呜呜……有点晕了喵～",
      "别戳啦，小猫要转圈圈了～",
      "喵……让我缓缓……@_@"
    ];
    const dizzy = dizzyReplies[Math.floor(Math.random() * dizzyReplies.length)];
    showBubble(dizzy);

    // 播放忧愁视频
    catVideo.pause();
    catVideo.loop = false;
    catVideo.src = "./小猫/忧愁.webm";
    catVideo.load();
    catVideo.play().catch(() => {});

    catVideo.onended = () => {
      catVideo.loop = true;
      catVideo.src = standbySrc;
      catVideo.load();
      catVideo.play().catch(() => {});
      catVideo.onended = null;
    };

    // 🔓 3 秒后解除锁定
    setTimeout(() => {
      isLocked = false;
      clickCount = 0;
    }, 3000);

    return;
  }

  // 🐱 正常“喵”回应
  const meowReplies = ["喵~", "喵呜~", "喵喵喵？"];
  const meow = meowReplies[Math.floor(Math.random() * meowReplies.length)];
  showBubble(meow);

  // 🎬 播放反应视频
  const reaction = reactionVideos[Math.floor(Math.random() * reactionVideos.length)];
  catVideo.pause();
  catVideo.loop = false;
  catVideo.src = reaction;
  catVideo.load();
  catVideo.play().catch(() => {});

  catVideo.onended = () => {
    catVideo.loop = true;
    catVideo.src = standbySrc;
    catVideo.load();
    catVideo.play().catch(() => {});
    catVideo.onended = null;
  };
});

  }
});

    
// ...existing code...
// 搜索引擎切换逻辑
const engines = [
  { name: 'bing', url: 'https://www.bing.com/search', param: 'q', icon: 'logo/bing-logo-small.png', largeIcon: 'logo/bing-logo.png' },
  { name: 'google', url: 'https://www.google.com/search', param: 'q', icon: 'logo/google-logo-small.png', largeIcon: 'logo/google-logo.png' },
  { name: 'baidu', url: 'https://www.baidu.com/s', param: 'wd', icon: 'logo/baidu-logo-small.png', largeIcon: 'logo/baidu-logo.png' },
  { name: 'sogou', url: 'https://www.sogou.com/web', param: 'query', icon: 'logo/sogou-logo-small.png', largeIcon: 'logo/sogou-logo.png' }
];

let currentEngineIndex = 0;
const engineSwitch = document.getElementById('engineSwitch');
const searchForm = document.querySelector('form');

function applyEngine(index, save = false) {
  index = Number(index) || 0;
  if (index < 0 || index >= engines.length) index = 0;
  const engine = engines[index];

  // 更新表单与输入名
  searchForm.action = engine.url;
  searchInput.name = engine.param;

  // 更新左侧小图标
  const engineIcon = engineSwitch.querySelector('.engine-icon');
  if (engineIcon) {
    engineIcon.src = engine.icon;
    engineIcon.alt = engine.name;
  }

  // 更新页面顶部大图标
  const bigLogo = document.querySelector('.bing-logo');
  if (bigLogo) {
    bigLogo.src = engine.largeIcon;
    bigLogo.alt = engine.name + ' Logo';
  }

  currentEngineIndex = index;
  if (save) {
    localStorage.setItem('selectedEngineIndex', String(index));
  }
}

engineSwitch.addEventListener('click', () => {
  const next = (currentEngineIndex + 1) % engines.length;
  applyEngine(next, true); // 点击时保存
  const engineReplies = [
    "换个搜索引擎试试喵～看看谁更聪明！",
    "小猫也想知道哪个搜索结果更好喵～",
    "咕噜咕噜～切换成功喵！"
  ];
  const reply = engineReplies[Math.floor(Math.random() * engineReplies.length)];
  showBubble(reply);
});

// 页面加载时恢复上次选择（若有）
const saved = localStorage.getItem('selectedEngineIndex');
if (saved !== null) {
  applyEngine(parseInt(saved, 10), false);
} else {
  applyEngine(0, false);
}
// ...existing code...
    // IndexedDB 背景视频存储
    const DB_NAME = "WallpaperDB";
    const DB_STORE_NAME = "Videos";
    const DB_KEY = "bgVideo";
    function openDatabase() {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = function (e) {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(DB_STORE_NAME)) {
            db.createObjectStore(DB_STORE_NAME);
          }
        };
        request.onsuccess = function (e) {
          resolve(e.target.result);
        };
        request.onerror = function (e) {
          reject(e);
        };
      });
    }async function saveVideoToIndexedDB(file) {
      const db = await openDatabase();
      const tx = db.transaction(DB_STORE_NAME, "readwrite");
      const store = tx.objectStore(DB_STORE_NAME);
      store.put(file, DB_KEY);
    }
    async function loadVideoFromIndexedDB() {
      try {
        const db = await openDatabase();
        const tx = db.transaction(DB_STORE_NAME, "readonly");
        const store = tx.objectStore(DB_STORE_NAME);
        const request = store.get(DB_KEY);

        return new Promise((resolve, reject) => {
          request.onsuccess = function (e) {
            const file = e.target.result;
            if (!file) {
              resolve(null); // 未找到，显式返回 null
              return;
            }

            const bgVideo = document.getElementById("bgVideo");
            const bgImage = document.getElementById("bgImage");
            const fileURL = URL.createObjectURL(file);

            if (file.type && file.type.startsWith("video/")) {
              try {
                if (bgVideo.dataset.objectUrl) {
                  try { URL.revokeObjectURL(bgVideo.dataset.objectUrl); } catch (e) {}
                }
                bgImage.style.display = "none";
                bgVideo.style.display = "block";
                bgVideo.src = fileURL;
                bgVideo.dataset.objectUrl = fileURL;
                bgVideo.load();
                bgVideo.play().catch(()=>{});
                bgVideo.addEventListener('ended', function onEnded() {
                  if (bgVideo.dataset.objectUrl) {
                    try { URL.revokeObjectURL(bgVideo.dataset.objectUrl); } catch(e){}
                    delete bgVideo.dataset.objectUrl;
                  }
                  bgVideo.removeEventListener('ended', onEnded);
                });
                resolve(file); // ✅ 找到时返回 file
              } catch (err) {
                console.error('播放视频出错', err);
                try { URL.revokeObjectURL(fileURL); } catch(e){}
                resolve(null);
              }
            } else if (file.type && file.type.startsWith("image/")) {
              try {
                if (bgImage.dataset.objectUrl) {
                  try { URL.revokeObjectURL(bgImage.dataset.objectUrl); } catch (e) {}
                }
                bgVideo.pause();
                bgVideo.style.display = "none";
                bgImage.src = fileURL;
                bgImage.dataset.objectUrl = fileURL;
                bgImage.style.display = "block";
                bgImage.onload = () => {
                  try { URL.revokeObjectURL(fileURL); } catch(e){}
                  delete bgImage.dataset.objectUrl;
                };
                bgImage.onerror = () => {
                  console.error('图片加载失败');
                  try { URL.revokeObjectURL(fileURL); } catch(e){}
                  delete bgImage.dataset.objectUrl;
                };
                resolve(file); // ✅ 找到时返回 file
              } catch (err) {
                console.error('显示图片出错', err);
                try { URL.revokeObjectURL(fileURL); } catch(e){}
                resolve(null);
              }
            } else {
              console.warn('IndexedDB 中存储的数据不是图片或视频', file);
              try { URL.revokeObjectURL(fileURL); } catch(e){}
              resolve(null);
            }
          };

          request.onerror = function(e) {
            console.error('读取 IndexedDB 失败', e);
            reject(e);
          };
        });
      } catch (e) {
        console.error('loadVideoFromIndexedDB 出错', e);
        return null;
      }
    }
    // 删除 IndexedDB 中已保存的壁纸（当用户选择预设或使用 Base64 存储时调用）
function deleteVideoFromIndexedDB() {
  return openDatabase().then(db => {
    const tx = db.transaction(DB_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DB_STORE_NAME);
    store.delete(DB_KEY);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject();
    });
  }).catch(() => {});
}
window.addEventListener("DOMContentLoaded", () => {
      loadVideoFromIndexedDB();
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
   if (catVisible && !hasShownInitialTip) {
    showBubble("喵喵！！（你好！！）", false, true);
    hasShownInitialTip = true;
}});
    document.getElementById("videoUpload").addEventListener("change", async function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const bgImage = document.getElementById("bgImage");
  const bgVideo = document.getElementById("bgVideo");
  const modal = document.getElementById("wallpaperModal");

  // ✅ 立即创建本地 URL，不等待 IndexedDB
  const fileURL = URL.createObjectURL(file);

  // ✅ 检测文件类型
  if (file.type.startsWith("video/")) {
    // 视频文件：立即显示
    bgImage.style.display = "none";
    bgVideo.style.display = "block";
    bgVideo.poster = ""; // 清除 poster
    bgVideo.src = fileURL;
    bgVideo.load();
    
    bgVideo.addEventListener("canplay", () => {
      bgVideo.play().catch(() => {});
    }, { once: true });
    
  } else if (file.type.startsWith("image/")) {
    // 图片文件：立即显示
    bgVideo.style.display = "none";
    bgImage.style.display = "block";
    bgImage.src = fileURL;
  }

  modal.style.display = "none";

  // ✅ 后台异步保存到 IndexedDB（不阻塞 UI）
  saveVideoToIndexedDB(file).then(() => {
    // 清除 localStorage，表示使用 IndexedDB 中的数据
    localStorage.removeItem("wallpaperType");
    localStorage.removeItem("wallpaper");
    console.log("背景已保存到本地存储");
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
    // 搜索建议（点击自动填充 + 自动搜索）
    function getBaiduSuggest(query, callback) {
      const cbName = "baidu_suggest_callback_" + Date.now();
      window[cbName] = function(data) {
        callback(data);
        delete window[cbName];
        document.body.removeChild(script);
      };
      const script = document.createElement("script");
      script.src = `https://suggestion.baidu.com/su?wd=${encodeURIComponent(query)}&json=1&p=3&cb=${cbName}`;
      document.body.appendChild(script);
    }const input = document.getElementById('searchInput');
    const button = document.getElementById('searchBtn');
    const suggestionList = document.getElementById('suggestionList');
    input.addEventListener('input', () => {
      const query = input.value.trim();
      button.disabled = query === "";
      if (query === "") {
        suggestionList.style.display = "none";
        suggestionList.innerHTML = "";
        return;
      }
      getBaiduSuggest(query, (data) => {
        suggestionList.innerHTML = "";
        if (!data || !data.s) {
          suggestionList.style.display = "none";
          return;
        }
        data.s.forEach(s => {
          const li = document.createElement("li");
          li.textContent = s;
          li.addEventListener("mousedown", () => {
            input.value = s;
            button.disabled = false;
            suggestionList.style.display = "none";
            suggestionList.innerHTML = "";
            button.click(); // ✅ 自动点击搜索按钮
          });
          suggestionList.appendChild(li);
        });
        suggestionList.style.display = data.s.length ? "block" : "none";
      });
    });
    input.addEventListener("blur", () => {
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
    const AMAP_KEY = "3d6743c0066c22bf4a5390818b39df2e"; // ← 替换为你的高德 Web 服务 key
const DEFAULT_CITY = "北京";

// 根据城市名获取天气
async function getWeatherByCity(cityName) {
  try {
    const url = `https://restapi.amap.com/v3/weather/weatherInfo?key=${AMAP_KEY}&city=${cityName}&extensions=base`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.status === "1" && data.lives?.length > 0) {
      const info = data.lives[0];
      const emoji = getWeatherEmoji(info.weather); // 获取对应的天气表情
      document.getElementById("weather-text").textContent =
        `${info.city} | ${emoji} ${info.weather} ${info.temperature}℃`;
    } else {
      document.getElementById("weather-text").textContent = "天气加载失败";
    }
  } catch (e) {
    console.error(e);
    document.getElementById("weather-text").textContent = "天气加载失败";
  }
}
// 根据天气描述返回对应的表情符号
// 根据天气类型返回相应的天气表情符号
function getWeatherEmoji(weatherType) {
  switch (weatherType) {
    case '晴':
      return '☀️';
    case '多云':
      return '🌤️';
    case '阴':
      return '☁️';
    case '雾':
      return '🌫️';
    case '雷阵雨':
      return '⛈️';
    case '小雨':
      return '🌧️';
    case '中雨':
      return '🌧️';
    case '大雨':
      return '🌧️';
    case '暴雨':
      return '🌧️';
    case '小雪':
      return '❄️';
    case '中雪':
      return '❄️';
    case '大雪':
      return '❄️';
    case '暴雪':
      return '❄️';
    case '雨夹雪':
      return '🌧️❄️';
    default:
      return '🌥️'; // 默认使用云朵表情
  }
}

// 根据经纬度反查城市并获取天气
async function getWeatherByCoords(lat, lon) {
  try {
    const geoUrl = `https://restapi.amap.com/v3/geocode/regeo?key=${AMAP_KEY}&location=${lon},${lat}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (geoData.status === "1" && geoData.regeocode) {
      const city =
        geoData.regeocode.addressComponent.city ||
        geoData.regeocode.addressComponent.province;
      getWeatherByCity(city);
    } else {
      throw new Error("地理位置解析失败");
    }
  } catch (e) {
    console.warn("定位失败，使用默认城市", e);
    getWeatherByCity(DEFAULT_CITY);
  }
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
    console.log('Received location from parent:', data.coords);
    // 在页面上显示或调用天气 API...
  } else if (data.type === 'location-error') {
    console.warn('Location error:', data.message);
  }
  /* ✅ 页面加载后自动播放小猫视频（防止某些浏览器静音策略问题） */
window.addEventListener("DOMContentLoaded", () => {
  const catVideo = document.getElementById("catVideo");
  if (catVideo) {
    catVideo.play().catch(() => {
      console.warn("自动播放被阻止，等待用户交互后再播放。");
      document.addEventListener("click", () => catVideo.play(), { once: true });
    });
  }
});
});

// 页面加载时的统一初始化
document.addEventListener("DOMContentLoaded", async () => {
  const bgImage = document.getElementById("bgImage");
  const bgVideo = document.getElementById("bgVideo");
  
  const wallpaperType = localStorage.getItem("wallpaperType");
  const wallpaperPath = localStorage.getItem("wallpaper");
  
  // 尝试从 IndexedDB 加载
  let loadedFromDB = false;
  if (!wallpaperType || wallpaperType === "upload") {
    try {
      const file = await loadVideoFromIndexedDB();
      if (file) {
        loadedFromDB = true;
        // loadVideoFromIndexedDB 已经设置了 DOM 并返回 file
      }
    } catch (err) {
      console.log("没有保存的视频/图片，使用默认背景");
    }
  }
  
  // 如果已从 IndexedDB 加载成功，直接返回（已显示）
  if (loadedFromDB) return;
  
  // 加载预设壁纸（图片或视频）
  if (wallpaperType === "preset" && wallpaperPath) {
    if (wallpaperPath.includes(".mp4")) {
      bgImage.style.display = "none";
      bgVideo.style.display = "block";
      bgVideo.poster = "";
      bgVideo.src = wallpaperPath;
      bgVideo.load();
      bgVideo.addEventListener("canplay", () => { bgVideo.play().catch(()=>{}); }, { once: true });
      bgVideo.addEventListener("error", () => {
        console.error("视频加载失败:", wallpaperPath);
        bgVideo.style.display = "none";
        bgImage.style.display = "block";
        bgImage.src = "wallpapers/1.jpg";
      }, { once: true });
      return;
    } else {
      bgVideo.style.display = "none";
      bgImage.style.display = "block";
      bgImage.src = wallpaperPath;
      return;
    }
  }

  // 最后兜底：设置内置默认背景（当既没有 IndexedDB 文件也没有 preset 时）
  // 这里使用扩展包内的 video3.mp4（或你希望的默认图片）
  bgImage.style.display = "none";
  bgVideo.style.display = "block";
  bgVideo.poster = "poster.jpg";
  bgVideo.src = "video3.mp4";
  bgVideo.load();
  bgVideo.addEventListener("canplay", () => { bgVideo.play().catch(()=>{}); }, { once: true });
});
