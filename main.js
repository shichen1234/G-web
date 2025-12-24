let hasShownInitialTip = false;
    let bubbleLocked = false;
    let bubbleDisabled = false;
    let clickCount = 0;
    let catVisible = true;
let clickTimer = null;
let isLocked = false; // 🔒 是否处于冷却状态
// B站图标悬停
document.addEventListener("DOMContentLoaded", function () {
  const engines = [
    {
      name: "Bing",
      url: "https://www.bing.com/search",
      param: "q",
      smallLogo: "logo/bing-logo-small.png",
      bigLogo: "logo/bing-logo.png",
      placeholder: "通过bing搜索..."
    },
    {
      name: "Google",
      url: "https://www.google.com/search",
      param: "q",
      smallLogo: "logo/google-logo-small.png",
      bigLogo: "logo/google-logo.png",
      placeholder: "Google 搜索..."
    },
    {
      name: "百度",
      url: "https://www.baidu.com/s",
      param: "wd",
      smallLogo: "logo/baidu-logo-small.png",
      bigLogo: "logo/baidu-logo.png",
      placeholder: "百度一下..."
    },
    {
      name: "搜狗",
      url: "https://www.sogou.com/web",
      param: "query",                 // 搜狗必须是 query
      extraParams: "ie=utf-8",        // 防止中文乱码
      smallLogo: "logo/sogou-logo-small.png",
      bigLogo: "logo/sogou-logo.png",
      placeholder: "搜狗搜索..."
    }
    // 继续加你想要的……
  ];

  let current = parseInt(localStorage.getItem("currentEngine") || "0", 10);
  if (isNaN(current) || current >= engines.length) current = 0;

  let isSwitching = false;
  const engineSwitch   = document.getElementById("engineSwitch");
  const engineIcon     = engineSwitch.querySelector(".engine-icon");
  const searchForm     = document.querySelector("form");
  const searchInput    = document.getElementById("searchInput");
  const bigLogo        = document.querySelector(".bing-logo");
  let hiddenInput      = null;  // 全局保存隐藏 input

  // 统一应用引擎配置
  function applyEngine(idx) {
    const eng = engines[idx];
    searchForm.querySelectorAll('input[type="hidden"]').forEach(el => el.remove());
    // 创建新的隐藏 input（关键！）
    hiddenInput = document.createElement("input");
    hiddenInput.type = "hidden";
    hiddenInput.name = eng.param;
    hiddenInput.value = searchInput.value.trim();
    searchForm.appendChild(hiddenInput);

    // 更新界面
    bigLogo.src = eng.bigLogo;
    bigLogo.alt = eng.name + " Logo";
    engineIcon.src = eng.smallLogo;
    searchInput.placeholder = eng.placeholder;
    searchForm.action = eng.url;
    // 额外参数（如搜狗的 ie=utf-8）
    if (eng.extraParams) {
      const extra = document.createElement("input");
      extra.type = "hidden";
      extra.name = "ie";
      extra.value = "utf-8";
      searchForm.appendChild(extra);
    }

    // 实时同步输入内容
    searchInput.oninput = () => {
      hiddenInput.value = searchInput.value.trim();
    };
  }

  // 页面加载时恢复上次选择
  applyEngine(current);

  // 切换引擎
function switchEngine(e) {
  e.stopPropagation();
  if (isSwitching) return;
  isSwitching = true;

  // 小 logo 先淡出
  engineIcon.classList.remove("fade-in");
  engineIcon.classList.add("fade-out");

  setTimeout(() => {
    // 切换索引
    current = (current + 1) % engines.length;
    localStorage.setItem("currentEngine", current);

    // 应用新引擎（会更新 engineIcon.src）
    applyEngine(current);

    // ✅ 切换引擎后弹出小猫评论（随机一句）
    const engineReplies = [
      "换个搜索引擎试试喵～看看谁更聪明！",
      "小猫也想知道哪个搜索结果更好喵～",
      "咕噜咕噜～切换成功喵！"
    ];
    showBubble(engineReplies[Math.floor(Math.random() * engineReplies.length)]);

engineIcon.classList.add("fade-in");
    // 小 logo 淡入
    engineIcon.classList.remove("fade-out");
    engineIcon.classList.add("fade-in");
  }, 200);

  // 大 logo 原有动画（保持你原来的）
  bigLogo.style.opacity = 0;
  setTimeout(() => {
    bigLogo.style.opacity = 1;
  }, 320);

  setTimeout(() => {
    isSwitching = false;
  }, 600);
}
  engineSwitch.removeEventListener("click", switchEngine);
  engineSwitch.addEventListener("click", switchEngine);
});
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("wallpaperModal");
  const grid = document.querySelector(".wallpaper-grid");
  const closeBtn = document.getElementById("closeModal");
  const videoUpload = document.getElementById("videoUpload");
  const bgImage = document.getElementById("bgImage");
  const bgVideo = document.getElementById("bgVideo");

  // 动态插入 1.jpg ~ 18.jpg
  for (let i = 1; i <= 18; i++) {
    const img = document.createElement("img");
    img.src = `wallpapers/${i}.jpg`;
    img.alt = `壁纸${i}`;
    img.loading = "lazy";
    img.addEventListener("click", () => {
      bgVideo.style.display = "none";
      bgImage.style.display = "block";
      bgImage.src = img.src;
      modal.classList.remove("show");
setTimeout(() => {
  modal.style.display = "none";
}, 350); // 与 CSS 动画时间一致

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
// ✅ 新增：动态插入 1.mp4 ~ 17.mp4 视频
for (let i = 1; i <= 17; i++) {
  const videoSrc = `wallpapers/${i}.mp4`;
  const posterSrc = `wallpapers/fengmian/${i}.png`;  // 修改：使用 fengmian 文件夹下的 .png 图片作为缩略图

  // 缩略图 video 元素
  const thumb = document.createElement("div");
  thumb.className = "lazy-video-thumb";
  thumb.dataset.video = videoSrc;
  thumb.dataset.poster = posterSrc; // 视频封面图
  thumb.style.position = "relative";
  thumb.style.width = "100%";
  thumb.style.height = "80px";
  thumb.style.borderRadius = "8px";
  thumb.style.cursor = "pointer";

  const img = document.createElement("img");
  img.src = posterSrc;
  img.style.width = "100%";
  img.style.height = "100%";
  img.style.objectFit = "cover";
  img.style.borderRadius = "8px";

  thumb.appendChild(img);

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

    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 350); // 与 CSS 动画时间一致

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
    modal.classList.remove("show");
setTimeout(() => {
  modal.style.display = "none";
}, 350); // 与 CSS 动画时间一致

  });

  // 打开弹窗
  const openBtn = document.getElementById("openWallpaperModal");
  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      modal.style.display = "flex";
      requestAnimationFrame(() => {
    modal.classList.add("show");
        requestAnimationFrame(() => {
    });
  });
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
modal.classList.remove("show");
setTimeout(() => {
  modal.style.display = "none";
}, 350); // 与 CSS 动画时间一致

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
} else if (weatherInfo.includes("阴") || weatherInfo.includes("雾") || weatherInfo.includes("霾")) {
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

  modal.classList.remove("show");
setTimeout(() => {
  modal.style.display = "none";
}, 350); // 与 CSS 动画时间一致


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
    input.addEventListener("input", async () => {
  const query = input.value.trim();
  if (!query) {
    suggestionList.style.display = "none";
    return;
  }
chrome.runtime.sendMessage({ type: "baiduSuggest", q: input.value }, (res) => {
  // res 就是后台返回的联想数组
  renderSuggestions(res);
});
  // 调用后台代理
  const res = await chrome.runtime.sendMessage({ type: "baiduSuggest", q: query });
  renderSuggestions(res);
});

function renderSuggestions(suggestions) {
  const input = document.getElementById("searchInput");
  const suggestionList = document.getElementById("suggestionList");
  const form = document.querySelector("form");

  suggestionList.innerHTML = "";
  if (!suggestions || !suggestions.length) {
    suggestionList.style.display = "none";
    return;
  }

  suggestions.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;

    // ✅ 封装统一的触发逻辑
    const triggerSearch = () => {
      input.value = s;   
  const hidden = form.querySelector('input[type="hidden"]');
  if (hidden) hidden.value = s.trim();              // 填入搜索框
      suggestionList.style.display = "none";
      form.submit();                    // 自动提交，相当于按下回车
      // 或者：document.getElementById("searchBtn").click();
    };

    // 鼠标点击（包括大多数触控板点击）
    li.addEventListener("click", triggerSearch);

    // 触控板轻触 / 触屏
    li.addEventListener("pointerdown", e => {
      if (e.pointerType === "touch") triggerSearch();
    });

    li.addEventListener("touchstart", triggerSearch, { passive: true });

    suggestionList.appendChild(li);
  });

  suggestionList.style.display = "block";
}
    input.addEventListener('input', () => {
      const query = input.value.trim();
      button.disabled = query === "";
     if (!query) {
    suggestionList.style.display = "none";
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
    case '霾':
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
// ====================== 浏览器音乐播放检测 ======================
if ('mediaSession' in navigator) {

  // 1. 获取封面图逻辑
  function getArtworkUrl(artwork) {
    if (!artwork) return '';
    if (typeof artwork === 'string') return artwork;
    if (Array.isArray(artwork) && artwork.length > 0) {
      // 优先找 512 或 384 尺寸的图，否则用最后一张
      const preferred = artwork.find(a => a.sizes === '512x512') ||
                        artwork.find(a => a.sizes === '384x384') ||
                        artwork[artwork.length - 1];
      return preferred?.src || '';
    }
    return '';
  }

  // 2. 更新界面显示逻辑
  function updateMediaDisplay(message) {
    const metadata = message.metadata || {};
    const widget = document.getElementById('mediaWidget');
    if (!widget) return;

    // 更新标题和艺术家
    const titleEl = widget.querySelector('.title');
    const artistEl = widget.querySelector('.artist');
    if (titleEl) titleEl.textContent = metadata.title || '无标题';
    if (artistEl) artistEl.textContent = metadata.artist || '未知艺术家';

    // 更新封面
    const coverDiv = document.getElementById('mediaCover');
    const coverUrl = getArtworkUrl(metadata.artwork);
    if (coverDiv) {
      if (coverUrl) {
        coverDiv.style.backgroundImage = `url(${coverUrl})`;
      } else {
        coverDiv.style.backgroundImage = 'none'; 
      }
    }
  }
// 3. 核心监听器：接收来自 background.js 的消息并控制组件和波纹
  chrome.runtime.onMessage.addListener((message) => {
    // 获取组件和波纹元素
    const widget = document.getElementById('mediaWidget');
    const wave = document.getElementById('musicWave');
    
    if (!widget) return;

    if (message.type === 'mediaSessionUpdate') {
      updateMediaDisplay(message);

      // ★★★ 核心改动：只要收到更新（意味着组件出现），就显示组件并启动波纹 ★★★
      widget.classList.add('visible'); 
      const record = document.getElementById('recordDisc'); if (record) record.classList.add('visible');
      if (wave) wave.classList.add('playing'); 

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
      if (coverDiv) coverDiv.style.backgroundImage = 'none';
    }
  });

} else {
  console.log("当前浏览器不支持 Media Session API");
}
chrome.runtime.onMessage.addListener((msg) => {
  chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'mediaClear') {
    document.getElementById('music-widget').style.display = 'none';
  }
});

  if (msg.type !== 'mediaSessionUpdate') return;

  const widget = document.getElementById('mediaWidget');
  if (!widget || !msg.metadata) return;

  widget.classList.add('visible');
  const record = document.getElementById('recordDisc'); if (record) record.classList.add('visible');

  widget.querySelector('.title').textContent =
    msg.metadata.title || '未知标题';

  widget.querySelector('.artist').textContent =
    msg.metadata.artist || '';
});
document.addEventListener("DOMContentLoaded", function () {
    // ... (保留你原来的代码) ...

    // ★★★ 新增元素获取 ★★★
    // 兼容处理：页面可能使用不同 id（如只有 #mediaWidget / #mediaCover）。
    const mediaContainer = document.getElementById('mediaContainer') || document.getElementById('mediaWidget');
    const toggleMusicBtn = document.getElementById('toggleMusicBtn');
    
    // 初始化折叠状态
    let isCollapsed = false; 

    // ★★★ 按钮点击事件（存在性检查） ★★★
    if (toggleMusicBtn && mediaContainer) {
      toggleMusicBtn.addEventListener('click', () => {
        isCollapsed = !isCollapsed;
        
        if (isCollapsed) {
          // 状态：展开 -> 折叠 (滑出屏幕)
          mediaContainer.classList.add('collapsed');
          toggleMusicBtn.innerHTML = '&#9664;'; // 更改为朝左三角
        } else {
          // 状态：折叠 -> 展开 (滑回原位)
          mediaContainer.classList.remove('collapsed');
          toggleMusicBtn.innerHTML = '&#9654;'; // 更改为朝右三角
        }
      });
    }

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
    // 1. 侧边栏开关逻辑（最优先保证能点开）
  const quickPanel = document.getElementById('quickPanel');
  const openBtn = document.querySelector('.openBtn');
  // --- 核心：收起逻辑 ---
  function collapseSidebar(e) {
    if (e) e.stopPropagation(); // 阻止冒泡
    quickPanel.classList.add('collapsed');
    if (openBtn) openBtn.textContent = '▶';
    console.log("侧边栏已收起");
  }
  // --- 核心：展开逻辑 ---
  function expandSidebar(e) {
    if (e) e.stopPropagation(); // 阻止冒泡
    quickPanel.classList.remove('collapsed');
    if (openBtn) openBtn.textContent = '◀';
    console.log("侧边栏已展开");
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
      toggleLeftPanel(false);
    }
  });
// 在 main.js 的 DOMContentLoaded 事件中更新
document.addEventListener('DOMContentLoaded', () => {
  const quickPanelRight = document.getElementById('quickPanelright');
  const openBtnRight = document.querySelector('.openBtnright'); // 注意类名大小写与HTML一致
  const closePanelRightX = document.getElementById('closePanelRightX');

  // 统一的切换逻辑函数
  function toggleRightPanel(forceClose = false) {
    if (forceClose) {
      // 强制关闭：添加 collapsed 类，修改箭头为 ◀
      quickPanelRight.classList.add('collapsedright');
      if (openBtnRight) openBtnRight.textContent = '◀';
    } else {
      // 正常切换
      quickPanelRight.classList.toggle('collapsedright');
      const isClosed = quickPanelRight.classList.contains('collapsedright');
      if (openBtnRight) openBtnRight.textContent = isClosed ? '◀' : '▶';
    }
  }

  // 1. 点击左侧小箭头开关
  if (openBtnRight) {
    openBtnRight.addEventListener('click', (e) => {
      e.stopPropagation(); // 阻止冒泡，防止触发“点击其他地方收回”的逻辑
      toggleRightPanel();
    });
  }

  // 2. 点击右面板内部的 X 号关闭，并改变箭头方向
  if (closePanelRightX) {
    closePanelRightX.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleRightPanel(true); // 调用强制关闭逻辑
    });
  }

  // 3. 应用到左快捷栏类似的逻辑：点击页面其他地方收回面板
  document.addEventListener('click', (e) => {
    // 如果点击的不是面板本身，也不是面板内部元素
    if (!quickPanelRight.contains(e.target)) {
      // 且面板当前是展开状态（没有 collapsedright 类），则收回
      if (!quickPanelRight.classList.contains('collapsedright')) {
        toggleRightPanel(true);
      }
    }
  });
});// === Quick panel 初始化（确保点击稳定切换） ===
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
      if (e.target && e.target.closest && e.target.closest('.openBtn')) { e.stopPropagation(); toggle(); return; }
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
      // 等动画完成后隐藏 display
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
    if (cancelBtn) cancelBtn.addEventListener('click', closeAddModal);

    // 点击遮罩或按 Esc 关闭弹窗
    if (addModal) addModal.addEventListener('click', (e)=>{ if (e.target === addModal) closeAddModal(); });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && addModal && addModal.classList.contains('show')) closeAddModal(); });

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

    const STORAGE_KEY = 'quickPanelCustomIcons';

    // ---- 创建单个自定义图标节点（含设置齿轮 & 删除浮层） ----
    function createCustomIconElement(item){
      const id = item.id || ('c'+Date.now()+Math.random()).replace('.', '');
      // 外层容器
      const wrapper = document.createElement('div');
      wrapper.className = 'iconWrapper';
      wrapper.dataset.id = id;

      // 链接与图片
      const a = document.createElement('a');
      a.href = item.url || '#'; a.title = item.name || ''; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('tabindex','0');
      const img = document.createElement('img'); img.src = item.img || makePlaceholderIcon(item.name || '', 256); img.alt = item.name || ''; img.draggable = false;
      a.appendChild(img);
      wrapper.appendChild(a);

      // 齿轮按钮
      const gearBtn = document.createElement('button'); gearBtn.type='button'; gearBtn.className = 'iconSettings'; gearBtn.title = '设置';
      const gearImg = document.createElement('img'); gearImg.src = 'images/齿轮.png'; gearImg.alt = '设置'; gearBtn.appendChild(gearImg);
      wrapper.appendChild(gearBtn);

      // 删除浮层（覆盖在图标上的透明遮罩，包含“删除”与“取消”按钮），挂载到对应的 <a> 上
      const pop = document.createElement('div'); pop.className = 'iconPopover overlay'; pop.dataset.for = id; pop.style.position = 'absolute';
      pop.innerHTML = `
        <button class="delBtn" type="button" aria-label="删除">
          <svg viewBox="0 0 12 24" width="12" height="8" aria-hidden="true" focusable="false" style="flex:0 0 16px;">
            <path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
          <span></span>
        </button>
        <button class="cancelBtn" type="button" aria-label="取消">
          <svg viewBox="0 0 12 24" width="12" height="8" aria-hidden="true" focusable="false" style="flex:0 0 16px;">
            <path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.4 4.29 19.7 2.88 18.29 9.18 12 2.88 5.71 4.29 4.3l6.3 6.29L17.9 4.3z" />
          </svg>
          <span></span>
        </button>
      `;
      // 将 pop 挂载到 wrapper 上（覆盖在图标之上，防止事件穿透到 <a>）
      wrapper.appendChild(pop);

      // 防止点击浮层冒泡（导致 document 的 click 关闭它）
      pop.addEventListener('click', (e) => e.stopPropagation());

      // 事件：齿轮点击切换覆盖式浮层（覆盖在图标上）——同时对下方图标设置禁用
      gearBtn.addEventListener('click', (e)=>{
        e.stopPropagation();
        closeAllPopovers();
        const willShow = !pop.classList.contains('show');
        if (!willShow) { // 隐藏并清理定位
          pop.classList.remove('show');
          // 清理所有被禁用的图标
          if (icons) icons.querySelectorAll('a.icon-disabled').forEach(a=>a.classList.remove('icon-disabled'));
          // 清理 wrapper 的 has-overlay
          wrapper.classList.remove('has-overlay');
          // 如果没有任何打开的弹窗，则移除 overlay-open
          if (!document.querySelector('.iconPopover.show') && icons) icons.classList.remove('overlay-open');
          return;
        }
        // 显示覆盖式遮罩（无需额外定位）
        pop.classList.add('show');
        // 将当前 wrapper 标记为 has-overlay（以避免被淡化并禁用其内部链接的点击）
        wrapper.classList.add('has-overlay');
        if (icons) icons.classList.add('overlay-open');
        console.debug('[addIcon] pop show', id);

        // 禁用位于当前 wrapper 之后的所有图标（按 DOM 顺序）
        if (icons) {
          const wrappers = Array.from(icons.querySelectorAll('.iconWrapper'));
          const idx = wrappers.indexOf(wrapper);
          wrappers.forEach((w,i)=>{
            const link = w.querySelector('a');
            if (!link) return;
            if (i > idx) link.classList.add('icon-disabled'); else link.classList.remove('icon-disabled');
          });
        }
      });

      // 删除操作
// 在 main.js 的 createCustomIconElement 函数内，找到 delBtn 的点击事件
// 假设你的存储 Key 是这个
const STORAGE_KEY = 'quickPanelCustomIcons'; 

// 在创建图标元素的逻辑中，找到删除按钮的点击监听器
pop.querySelector('.delBtn').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. 获取当前图标的唯一 ID (确保你在创建时给 wrapper 设置了 dataset.id)
    const iconId = wrapper.dataset.id; 

    // 2. 从 localStorage 中彻底移除
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            let list = JSON.parse(raw);
            // 过滤掉 ID 匹配的那一项
            list = list.filter(item => item.id !== iconId);
            // 将“干净”的数组重新存回去
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
            console.log('已从本地存储删除:', iconId);
        }
    } catch(err) {
        console.warn('同步删除存储失败', err);
    }

    // 3. 从页面上移除 DOM
    wrapper.remove();
    
    // 4. 关闭设置弹窗
    if (typeof closeAllPopovers === 'function') closeAllPopovers();
});
      // 取消操作：仅关闭浮层（覆盖遮罩）
      pop.querySelector('.cancelBtn').addEventListener('click', (e)=>{
        e.preventDefault(); e.stopPropagation();
        console.debug('[addIcon] pop cancel', id);
        pop.classList.remove('show');
        // 清理所有被禁用的图标
        if (icons) icons.querySelectorAll('a.icon-disabled').forEach(a=>a.classList.remove('icon-disabled'));
        // 清理 wrapper 的 has-overlay
        wrapper.classList.remove('has-overlay');
        // 若没有其他弹窗，移除 overlay-open
        if (!document.querySelector('.iconPopover.show') && icons) icons.classList.remove('overlay-open');
      });

      // 点击链接也应先关闭浮层
      a.addEventListener('click', ()=>{ closeAllPopovers(); });

      return wrapper;
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
      // 清理被禁用和 has-overlay 状态
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
        // 如果弹窗挂载到了 <a>（带有 data-for），也一并移除
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
            // 保证有 id
            if (!it.id) it.id = ('c'+Date.now()+Math.random()).replace('.', '');
            const el = createCustomIconElement(it);
            if (icons){ if (addWrapper) icons.insertBefore(el, addWrapper); else icons.appendChild(el); }
          }catch(e){ console.warn('[addIcon] load item failed', e); }
        });
        console.debug('[addIcon] loaded', (items && items.length) || 0);
      }catch(e){ console.warn('[addIcon] load error', e); }
    }

    // 在初始化时加载已保存的自定义图标
    loadCustomIcons();

    if (saveBtn){
      saveBtn.addEventListener('click', ()=>{
        const name = (nameInput && nameInput.value || '').trim();
        let url = (urlInput && urlInput.value || '').trim();
        if (!name){ alert('请输入名称'); if (nameInput) nameInput.focus(); return; }
        if (!url){ alert('请输入URL'); if (urlInput) urlInput.focus(); return; }
        if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
        let src = uploadedData;
        if (!src) src = makePlaceholderIcon(name, 256);
        // 统一使用 createCustomIconElement 来创建 DOM（包含齿轮与功能）
        const id = ('c'+Date.now()+Math.random()).replace('.', '');
        const item = { id: id, name: name, url: url, img: src };
        const el = createCustomIconElement(item);
        const addWrapper = icons.querySelector('.addWrapper');
        if (addWrapper) icons.insertBefore(el, addWrapper); else icons.appendChild(el);

        // 将新图标保存到 localStorage（追加）
        try{
          const raw = localStorage.getItem(STORAGE_KEY);
          const list = raw ? JSON.parse(raw) : [];
          list.push(item);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
          console.debug('[addIcon] saved to localStorage, total=', list.length, 'id=', id);
        }catch(e){ console.warn('[addIcon] save fail', e); }

        // 清理并关闭
        uploadedData = null;
        closeAddModal();
      });
    }

    if (!quick.classList.contains('collapsed')) expand(); else collapse();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupQuick); else setupQuick();
})();
/* ============================================================
   修复后的侧边栏与图标管理逻辑
   ============================================================ */

const STORAGE_KEY = 'quick_panel_icons';
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
  { id: 'def-13', name: '豆包', url: 'https://www.doubao.com/', img: 'images/11.jpg' },
  { id: 'def-14', name: 'ChatGPT', url: 'https://chatgpt.com/', img: 'images/12.jpg' },
  { id: 'def-15', name: 'Gemini', url: 'https://gemini.google.com/', img: 'images/13.jpg' },
  { id: 'def-16', name: '网易云音乐', url: 'https://music.163.com/', img: 'images/14.jpg' },
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
  { id: 'def-32', name: 'Pinterest', url: 'https://www.pinterest.com/', img: 'images/31.jpg' }
];

// 辅助：生成占位图标
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

// 核心：创建图标节点 (现在它是全局函数了！)
function createCustomIconElement(item) {
  const id = item.id || ('c' + Date.now() + Math.random()).replace('.', '');
  
  // 外层容器
  const wrapper = document.createElement('div');
  wrapper.className = 'iconWrapper';
  wrapper.dataset.id = id;

  // 链接
  const a = document.createElement('a');
  a.href = item.url || '#';
  a.title = item.name || '';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  
  // 图片
  const img = document.createElement('img');
  img.src = item.img || makePlaceholderIcon(item.name || '', 256);
  img.alt = item.name || '';
  img.draggable = false;
  
  a.appendChild(img);
  wrapper.appendChild(a);

  // 齿轮按钮
  const gearBtn = document.createElement('button');
  gearBtn.type = 'button';
  gearBtn.className = 'iconSettings';
  const gearImg = document.createElement('img');
  gearImg.src = 'images/齿轮.png'; // 确保你有这个图片，或者改用 base64
  gearBtn.appendChild(gearImg);
  wrapper.appendChild(gearBtn);

  // 删除浮层
  const pop = document.createElement('div');
  pop.className = 'iconPopover overlay';
  pop.innerHTML = `
    <button class="delBtn" type="button" style="background:#ff6b6b;color:white;">删除</button>
    <button class="cancelBtn" type="button" style="background:white;color:black;">取消</button>
  `;
  wrapper.appendChild(pop);

  // 事件：齿轮点击显示/隐藏删除层
  gearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const isShown = pop.classList.contains('show');
    // 关闭其他所有打开的
    document.querySelectorAll('.iconPopover.show').forEach(p => p.classList.remove('show'));
    if (!isShown) pop.classList.add('show');
  });

  // 事件：删除
  pop.querySelector('.delBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (confirm(`确定要删除 "${item.name}" 吗？`)) {
      wrapper.remove();
      // 持久化删除
      let list = JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_ICONS;
      list = list.filter(i => i.id !== item.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
  });

  // 事件：取消
  pop.querySelector('.cancelBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    pop.classList.remove('show');
  });

  // 点击其他地方关闭浮层
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) pop.classList.remove('show');
  });

  return wrapper;
}

// 核心：加载所有图标
function loadIcons() {
  const iconsContainer = document.querySelector('#quickPanel .icons');
  const addWrapper = document.querySelector('#quickPanel .addWrapper'); // 获取加号容器
  
  if (!iconsContainer || !addWrapper) {
    console.error("HTML结构不匹配，请检查 .icons 和 .addWrapper");
    return;
  }

  // 清理现有图标（除了加号按钮）
  iconsContainer.querySelectorAll('.iconWrapper:not(.addWrapper)').forEach(el => el.remove());

  // 读取数据
  let list = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    list = raw ? JSON.parse(raw) : DEFAULT_ICONS;
  } catch(e) {
    list = DEFAULT_ICONS;
  }
  // 如果首次加载为空，强制写入默认
  if (list.length === 0 && !localStorage.getItem(STORAGE_KEY)) {
    list = DEFAULT_ICONS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // 渲染
  list.forEach(item => {
    const el = createCustomIconElement(item);
    iconsContainer.insertBefore(el, addWrapper); // 插在加号前面
  });
}

// 初始化侧边栏交互 (加号功能、开关面板)
document.addEventListener('DOMContentLoaded', () => {
  // 1. 加载图标
  loadIcons();

  // 2. 侧边栏开关
  const quickPanel = document.getElementById('quickPanel');
  const openBtn = quickPanel.querySelector('.openBtn');
  const closeBtn = quickPanel.querySelector('.closeBtn');
  
  function togglePanel() {
    quickPanel.classList.toggle('collapsed');
    const isClosed = quickPanel.classList.contains('collapsed');
    openBtn.textContent = isClosed ? '▶' : '◀';
  }
  
  if (openBtn) openBtn.addEventListener('click', togglePanel);
  if (closeBtn) closeBtn.addEventListener('click', togglePanel);
});
// 在 main.js 的 DOMContentLoaded 事件中更新
document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEY_BIRTHDAY = 'user_birthday_date';
  const pickerSection = document.getElementById('birthdayPicker');
  const displaySection = document.getElementById('birthdayDisplay');
  const dateInput = document.getElementById('birthdayDateInput');
  const daysNumber = document.getElementById('daysNumber');
  const saveBtn = document.getElementById('saveBirthdayBtn');
  const resetBtn = document.getElementById('resetBirthdayBtn');

  // 计算剩余天数
// 修改后的 calculateDays 函数
function calculateDays(birthdayStr) {
  const today = new Date();
  // 【关键修复 1】：强制将当前时间设置为今天的凌晨 00:00:00.000
  today.setHours(0, 0, 0, 0);

  const parts = birthdayStr.split('-');
  const bMonth = parseInt(parts[1], 10) - 1;
  const bDay = parseInt(parts[2], 10);
  
  // 【关键修复 2】：强制将生日日期也设置为当天的凌晨 00:00:00.000
  let nextBirthday = new Date(today.getFullYear(), bMonth, bDay);
  nextBirthday.setHours(0, 0, 0, 0);

  // 如果今年的生日已经过了，算明年的
  if (nextBirthday < today) {
    nextBirthday.setFullYear(today.getFullYear() + 1);
  }

  const diffTime = nextBirthday - today;
  // 【关键修复 3】：使用 Math.round 或 Math.floor 确保结果是一个纯整数 0
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

  // 更新界面显示
  function updateUI() {
    const savedDate = localStorage.getItem(STORAGE_KEY_BIRTHDAY);
    if (savedDate) {
      const days = calculateDays(savedDate);
      daysNumber.textContent = days === 0 ? "今" : days;
      
      // 显示倒计时卡片
      pickerSection.style.display = 'none';
      displaySection.style.display = 'block';
      surpriseScreen.style.display = 'none'; // 确保惊喜屏默认隐藏

      // 如果是今天，显示惊喜入口
      if (days === 0) {
        surpriseLink.style.display = 'block';
        daysNumber.nextElementSibling.textContent = "天";
      } else {
        surpriseLink.style.display = 'none';
      }
    } else {
      pickerSection.style.display = 'block';
      displaySection.style.display = 'none';
      surpriseScreen.style.display = 'none';
    }
  }
  // 保存生日
  saveBtn.addEventListener('click', () => {
    const dateVal = dateInput.value;
    if (!dateVal) {
      alert("请选择日期喵~");
      return;
    }
    localStorage.setItem(STORAGE_KEY_BIRTHDAY, dateVal);
    updateUI();
    // 使用现有的 showBubble 函数反馈
    if (typeof showBubble === 'function') {
      showBubble("已经记下你的生日啦喵！✨");
    }
  });

  // 重置生日
  resetBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY_BIRTHDAY);
    updateUI();
  });

  // 初始化加载
  updateUI();
  // 更新UI的函数
  // 点击“去看看”
  document.getElementById('goSurprise').addEventListener('click', () => {
    // 1. 切换显示区域
    displaySection.style.display = 'none';
    surpriseScreen.style.display = 'block';
    
    // 2. 小猫弹出祝福（假设你已有名为 showBubble 的函数）
    if (typeof showBubble === 'function') {
      showBubble("✨ 哇！祝你生日快乐喵！快看我为你准备的蛋糕~ 🎂");
    }
  });

  // 点击“返回”
  document.getElementById('backFromSurprise').addEventListener('click', () => {
    updateUI();
  });

  // 其余代码保持不变 (calculateDays, saveBtn, resetBtn 等)
  // ... (见上一条回复的逻辑)
});