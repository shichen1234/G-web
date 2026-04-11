// ===============================
// 通用网页壁纸zip包加载与资源路径替换核心函数
// 支持html/css/js/图片/视频/子文件夹等多结构壁纸包
// 依赖：JSZip (jszip.min.js)
// ===============================
/**
 * 加载并处理任意结构的网页壁纸zip包，返回可直接用于iframe.srcdoc或postMessage的html和Blob映射
 * @param {File|Blob} zipFile - 用户上传的zip包
 * @returns {Promise<{html: string, urlMap: Map<string, string>, mainHtmlPath: string}>}
 */
async function loadWallpaperZip(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);
  const fileMap = new Map();
  // 1. 遍历所有文件，存到 fileMap
  await Promise.all(Object.keys(zip.files).map(async (path) => {
    const file = zip.files[path];
    if (!file.dir) {
      const blob = await file.async('blob');
      fileMap.set(path, blob);
    }
  }));

  // 2. 生成 Blob URL 映射
  const urlMap = new Map();
  for (const [path, blob] of fileMap) {
    urlMap.set(path, URL.createObjectURL(blob));
  }

  // 3. 查找主html
  let mainHtmlPath = [...fileMap.keys()].find(p => /index\.html$/i.test(p)) || 
                     [...fileMap.keys()].find(p => /main\.html$/i.test(p)) ||
                     [...fileMap.keys()].find(p => /\.html$/i.test(p));
  if (!mainHtmlPath) throw new Error('未找到主html文件');
  let htmlText = await zip.file(mainHtmlPath).async('string');

  // 4. 替换html中的资源路径为Blob URL
  // 用DOMParser更安全，兼容img、script、link、video、audio等
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  // 需要替换src/href的标签
  const tags = [
    ['img', 'src'],
    ['script', 'src'],
    ['link', 'href'],
    ['video', 'src'],
    ['audio', 'src'],
    ['source', 'src'],
    ['iframe', 'src']
  ];
  // 新增：支持 /xxx 路径和 zip 内部绝对路径
  function fixPath(orig) {
    if (!orig) return orig;
    if (/^(https?:|data:|blob:)/i.test(orig)) return orig;
    // 统一小写查找，提升容错
    const candidates = [];
    // 原始
    candidates.push(orig);
    // 去掉开头./和/
    candidates.push(orig.replace(/^\.\//, ''));
    candidates.push(orig.replace(/^\//, ''));
    // mainHtmlPath同目录
    const baseDir = mainHtmlPath.substring(0, mainHtmlPath.lastIndexOf('/')+1);
    candidates.push(baseDir + orig);
    candidates.push(baseDir + orig.replace(/^\.\//, ''));
    candidates.push(baseDir + orig.replace(/^\//, ''));
    // 全部小写
    candidates.push(orig.toLowerCase());
    candidates.push((baseDir + orig).toLowerCase());
    // 绝对路径 /xxx
    if (/^\//.test(orig)) {
      candidates.push(orig.slice(1));
      candidates.push((baseDir + orig.slice(1)).toLowerCase());
    }
    // 去掉 query/hash
    let clean = orig.split('?')[0].split('#')[0];
    candidates.push(clean);
    candidates.push((baseDir + clean).toLowerCase());
    // 查找
    for (const c of candidates) {
      if (urlMap.has(c)) return urlMap.get(c);
    }
    // debug 输出未命中
    if (orig.match(/\.(jpg|png|jpeg|gif|webp|svg)$/i)) {
      console.warn('[zip壁纸] 未找到图片资源:', orig, '尝试:', candidates);
    }
    return orig;
  }
  for (const [tag, attr] of tags) {
    doc.querySelectorAll(tag + '[' + attr + ']').forEach(el => {
      const orig = el.getAttribute(attr);
      if (!orig) return;
      const fixed = fixPath(orig);
      el.setAttribute(attr, fixed);
    });
  }
  // 处理style标签和style属性里的url(…)
  function replaceStyleUrls(str) {
    if (!str) return str;
    return str.replace(/url\((['"]?)([^)'"]+)\1\)/g, (m, q, p) => {
      const fixed = fixPath(p);
      if (/^(https?:|data:|blob:)/i.test(fixed)) return `url(${fixed})`;
      if (fixed.startsWith('blob:')) return `url(${fixed})`;
      // fallback: 保持原样
      return `url(${fixed})`;
    });
  }
  // style标签
  doc.querySelectorAll('style').forEach(styleEl => {
    styleEl.textContent = replaceStyleUrls(styleEl.textContent);
  });
  // style属性
  doc.querySelectorAll('[style]').forEach(el => {
    el.setAttribute('style', replaceStyleUrls(el.getAttribute('style')));
  });

  // 5. 注入 polyfill/hack 脚本，提升兼容性
  const polyfillScript = doc.createElement('script');
  polyfillScript.textContent = `
    // --- zip壁纸兼容性polyfill ---
    (function(){
      // 1. 伪造 window.location 全属性为 https://fake.local/index.html
      try {
        const fakeLoc = {
          protocol: 'https:',
          host: 'fake.local',
          hostname: 'fake.local',
          port: '',
          origin: 'https://fake.local',
          pathname: '/index.html',
          search: '',
          hash: '',
          href: 'https://fake.local/index.html'
        };
        Object.defineProperty(window, 'location', {
          get: () => fakeLoc,
          configurable: true
        });
      } catch(e){}

      // 2. Blob URL 映射表注入（由父页面 postMessage 注入，或提前挂载）
      window.__WALLPAPER_BLOB_MAP = window.__WALLPAPER_BLOB_MAP || {};

      // 3. 劫持 fetch，自动映射 zip 内部路径为 Blob URL
      const oldFetch = window.fetch;
      window.fetch = function(input, ...args) {
        if (typeof input === 'string') {
          // 直接是 blob: 则直接用
          if (input.startsWith('blob:')) return oldFetch(input, ...args);
          // zip 内部路径
          let key = input.replace(/^\//, '');
          if (window.__WALLPAPER_BLOB_MAP && window.__WALLPAPER_BLOB_MAP[key]) {
            return oldFetch(window.__WALLPAPER_BLOB_MAP[key], ...args);
          }
        }
        return oldFetch(input, ...args);
      };

      // 4. 劫持 XMLHttpRequest.open
      const oldXHROpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (typeof url === 'string') {
          let key = url.replace(/^\//, '');
          if (window.__WALLPAPER_BLOB_MAP && window.__WALLPAPER_BLOB_MAP[key]) {
            arguments[1] = window.__WALLPAPER_BLOB_MAP[key];
          }
        }
        return oldXHROpen.apply(this, arguments);
      };

      // 5. 劫持 Image/HTMLImageElement.src
      function patchImageProto(proto) {
        const oldSrc = Object.getOwnPropertyDescriptor(proto, 'src');
        Object.defineProperty(proto, 'src', {
          set: function(val) {
            if (typeof val === 'string') {
              let key = val.replace(/^\//, '');
              if (window.__WALLPAPER_BLOB_MAP && window.__WALLPAPER_BLOB_MAP[key]) {
                return oldSrc.set.call(this, window.__WALLPAPER_BLOB_MAP[key]);
              }
            }
            return oldSrc.set.call(this, val);
          },
          get: function() { return oldSrc.get.call(this); },
          configurable: true
        });
      }
      patchImageProto(Image.prototype);
      patchImageProto(HTMLImageElement.prototype);

      // 6. 禁用 Service Worker 注册
      if (navigator.serviceWorker) {
        try { navigator.serviceWorker.register = ()=>Promise.reject('ServiceWorker禁用'); } catch(e){}
      }
    })();
  `;
  doc.head.appendChild(polyfillScript);

  // 6. 注入 Blob URL 映射表到 html（让 iframe 内 polyfill 能访问）
  const blobMapScript = doc.createElement('script');
  blobMapScript.textContent = 'window.__WALLPAPER_BLOB_MAP = ' + JSON.stringify(Object.fromEntries(urlMap)) + ';';
  doc.head.appendChild(blobMapScript);

  // 7. 返回处理结果
  return { html: doc.documentElement.outerHTML, urlMap, mainHtmlPath };
}
// 1.js - 性能优化完整版 (全功能)

// ============================================================
// 📢 作者链接配置区域
// ============================================================
const wallpaperAuthorLinks = [
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3043602786', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3018438776', 'https://zhutix.com/animated/breeze-tree//', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3434597685', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3231822105', 'https://steamcommunity.com/sharedfiles/filedetails/?id=2358176341', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3146924530', 'https://steamcommunity.com/sharedfiles/filedetails/?id=1661383396', 'https://steamcommunity.com/sharedfiles/filedetails/?id=2718086334', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3466567674', // 1-10
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3516806400', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3549235003', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3494551711', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3417214460', 'https://zhutix.com/animated/beautiful-autumn/', 'https://steamcommunity.com/sharedfiles/filedetails/?id=2141213975', 'https://zhutix.com/animated/anime-living-room/', 'https://zhutix.com/animated/liweidan-dtts/', 'https://zhutix.com/animated/aa-12-girls-frontline/', 'https://zhutix.com/animated/blue-eyes-anime-girl-4k/', // 11-20
  'https://steamcommunity.com/sharedfiles/filedetails/?id=1898036753', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3421087163', 'https://steamcommunity.com/sharedfiles/filedetails/?id=2292710588', 'https://steamcommunity.com/sharedfiles/filedetails/?id=2938530319', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3189805199', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3276955573', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3373338973', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3387794230', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3510621996', 'https://steamcommunity.com/sharedfiles/filedetails/?id=1741572995', // 21-30
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3478607320', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3442996884', 'https://steamcommunity.com/sharedfiles/filedetails/?id=2390303351', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3005368270', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3417230341', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3400422354', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3397638941', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3296496150', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3503297592', 'https://steamcommunity.com/sharedfiles/filedetails/?id=2901023083', // 31-40
  'https://steamcommunity.com/sharedfiles/filedetails/?id=2670952853', 'https://steamcommunity.com/sharedfiles/filedetails/?id=2673624751', 'https://steamcommunity.com/sharedfiles/filedetails/?id=2546972216', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3445796221', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3372718116', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3234049197', 'https://steamcommunity.com/sharedfiles/filedetails/?id=3650988126','https://steamcommunity.com/sharedfiles/filedetails/?id=3187662352','https://steamcommunity.com/sharedfiles/filedetails/?id=3235463764','https://steamcommunity.com/sharedfiles/filedetails/?id=3312308424',// 41-50
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3490346406','https://steamcommunity.com/sharedfiles/filedetails/?id=3531777823','https://steamcommunity.com/sharedfiles/filedetails/?id=3444152820','https://steamcommunity.com/sharedfiles/filedetails/?id=3149610244','https://steamcommunity.com/sharedfiles/filedetails/?id=816353979','https://steamcommunity.com/sharedfiles/filedetails/?id=3650448635','https://steamcommunity.com/sharedfiles/filedetails/?id=3326121126','https://steamcommunity.com/sharedfiles/filedetails/?id=3146316866','https://steamcommunity.com/sharedfiles/filedetails/?id=3480796089','https://steamcommunity.com/sharedfiles/filedetails/?id=3390306162', //51-60
  'https://steamcommunity.com/sharedfiles/filedetails/?id=2902931482','https://steamcommunity.com/sharedfiles/filedetails/?id=3174147118','https://steamcommunity.com/sharedfiles/filedetails/?id=2403589212','https://steamcommunity.com/sharedfiles/filedetails/?id=2090397373','https://steamcommunity.com/sharedfiles/filedetails/?id=2853957093','https://steamcommunity.com/sharedfiles/filedetails/?id=3219339117','https://steamcommunity.com/sharedfiles/filedetails/?id=3505612452','https://steamcommunity.com/sharedfiles/filedetails/?id=3120899076','https://steamcommunity.com/sharedfiles/filedetails/?id=2353385661','https://steamcommunity.com/sharedfiles/filedetails/?id=1661376278',//61-70
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3349260373','https://steamcommunity.com/sharedfiles/filedetails/?id=3298268799','https://steamcommunity.com/sharedfiles/filedetails/?id=3635492501','https://steamcommunity.com/sharedfiles/filedetails/?id=3369171553','https://steamcommunity.com/sharedfiles/filedetails/?id=2030846178','https://steamcommunity.com/sharedfiles/filedetails/?id=2499006048','https://steamcommunity.com/sharedfiles/filedetails/?id=3310203979','https://steamcommunity.com/sharedfiles/filedetails/?id=3289037617','https://steamcommunity.com/sharedfiles/filedetails/?id=2385132996','https://steamcommunity.com/sharedfiles/filedetails/?id=2929937768',//71-80
  'https://steamcommunity.com/sharedfiles/filedetails/?id=3429707117','https://steamcommunity.com/sharedfiles/filedetails/?id=2691915794','https://steamcommunity.com/sharedfiles/filedetails/?id=2841018591','https://steamcommunity.com/sharedfiles/filedetails/?id=3480156230','https://steamcommunity.com/sharedfiles/filedetails/?id=2995764284','https://steamcommunity.com/sharedfiles/filedetails/?id=3272631584','https://steamcommunity.com/sharedfiles/filedetails/?id=2902939420','https://steamcommunity.com/sharedfiles/filedetails/?id=3275856487','https://steamcommunity.com/sharedfiles/filedetails/?id=3211762136','https://steamcommunity.com/sharedfiles/filedetails/?id=3369151871',//81-90
  'https://steamcommunity.com/sharedfiles/filedetails/?id=2945859950','https://steamcommunity.com/sharedfiles/filedetails/?id=3639948534','https://steamcommunity.com/sharedfiles/filedetails/?id=2723647705','https://steamcommunity.com/sharedfiles/filedetails/?id=818696361','https://steamcommunity.com/sharedfiles/filedetails/?id=3158513965','https://steamcommunity.com/sharedfiles/filedetails/?id=3415535976','https://steamcommunity.com/sharedfiles/filedetails/?id=2961828444','https://steamcommunity.com/sharedfiles/filedetails/?id=3086767327','https://steamcommunity.com/sharedfiles/filedetails/?id=3023458758','https://steamcommunity.com/sharedfiles/filedetails/?id=3353921298', //91-100
  'https://steamcommunity.com/sharedfiles/filedetails/?id=950308229','https://steamcommunity.com/sharedfiles/filedetails/?id=3678409401','https://steamcommunity.com/sharedfiles/filedetails/?id=3168641857','https://steamcommunity.com/sharedfiles/filedetails/?id=2879252246',
  'https://zhutix.com/animated/haimian-wuzi/','https://zhutix.com/animated/lone-cherry-blossom/','https://zhutix.com/animated/honkai-star-rail/','https://steamcommunity.com/sharedfiles/filedetails/?id=2542785751','https://steamcommunity.com/sharedfiles/filedetails/?id=2700444200','https://steamcommunity.com/sharedfiles/filedetails/?id=3605483059'
];

let hasShownInitialTip = false;
let bubbleLocked = false;
let bubbleDisabled = false;
let isMenuOperating = false;
let clickCount = 0;
let catVisible = true;
let clickTimer = null;
let isLocked = false; 

// ============================================================
// 🚀 [性能优化核心] IndexedDB 预读取缓存
// ============================================================
let downloadedKeys = new Set();

async function cacheDownloadedKeys() {
    try {
        // 假设 openDatabase 已经在 2.js 中定义且是全局的
        if (typeof openDatabase !== 'function') return; 
        
        const db = await openDatabase();
        const tx = db.transaction("Videos", "readonly");
        const store = tx.objectStore("Videos");
        
        return new Promise(resolve => {
            const request = store.getAllKeys();
            request.onsuccess = () => {
                downloadedKeys = new Set(request.result);
                resolve();
            };
            request.onerror = (e) => {
                console.error("[G-web] 读取壁纸 Key 失败", e);
                resolve(); // 失败也继续，避免阻塞
            };
        });
    } catch (e) {
        console.error("[G-web] 缓存 Key 出错", e);
    }
}

// 🚀 [性能优化] 同步检查函数
function checkVideoExistsSync(key) {
    return downloadedKeys.has(key);
}

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
      extraParams: "ie=utf-8",         // 防止中文乱码
      smallLogo: "logo/sogou-logo-small.png",
      bigLogo: "logo/sogou-logo.png",
      placeholder: "搜狗搜索..."
    }
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

    // Update UI
    bigLogo.src = eng.bigLogo;
    bigLogo.alt = eng.name + " Logo";
    engineIcon.src = eng.smallLogo;
    searchForm.action = eng.url;
    // Extra parameters (e.g., Sogou's ie=utf-8)
    if (eng.extraParams) {
      const extra = document.createElement("input");
      extra.type = "hidden";
      extra.name = "ie";
      extra.value = "utf-8";
      searchForm.appendChild(extra);
    }

    // Synchronize input content in real-time
    searchInput.oninput = () => {
      hiddenInput.value = searchInput.value.trim();
    };
  }

  // Restore last selection on page load
  applyEngine(current);

  // Switch engine
function switchEngine(e) {
  e.stopPropagation();
  if (isSwitching) return;
  isSwitching = true;

  // Small logo fades out first
  engineIcon.classList.remove("fade-in");
  engineIcon.classList.add("fade-out");

  setTimeout(() => {
    // Switch index
    current = (current + 1) % engines.length;
    localStorage.setItem("currentEngine", current);

    // Apply new engine (updates engineIcon.src)
    applyEngine(current);

    // ✅ Pop up cat comments after switching engine (random message)
    const engineReplies = [
      "换个搜索引擎试试喵～看看谁更聪明！",
      "小猫也想知道哪个搜索结果更好喵～",
      "咕噜咕噜～切换成功喵！"
    ];
    showBubble(engineReplies[Math.floor(Math.random() * engineReplies.length)]);

engineIcon.classList.add("fade-in");
    // Small logo fades in
    engineIcon.classList.remove("fade-out");
    engineIcon.classList.add("fade-in");
  }, 200);

  // Big logo original animation (keep yours)
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
  (function initWelcomeModal() {
    const STORAGE_KEY_WELCOME = 'has_seen_welcome_v1'; // 💡 Hint: If you update the version later and want to pop up again, just change this name, e.g., v2
    const modal = document.getElementById('welcomeModal');
    const closeBtn = document.getElementById('closeWelcomeBtn');

    if (!modal || !closeBtn) return;

    // 1. Check local storage: if not seen, display
    const hasSeen = localStorage.getItem(STORAGE_KEY_WELCOME);

    if (!hasSeen) {
      // Show pop-up
      modal.style.display = 'flex';
      // Delay adding class to trigger CSS animation
      requestAnimationFrame(() => {
        modal.classList.add('show');
      });
    }

    // 2. Click button to close and record permanently
    closeBtn.addEventListener('click', () => {
      // Record as read
      localStorage.setItem(STORAGE_KEY_WELCOME, 'true');

      // Close animation
      modal.classList.remove('show');
      // Hide element after animation
      setTimeout(() => {
        modal.style.display = 'none';
      }, 400); // 400ms corresponds to CSS transition time
    });
  })();
});
// ============================================================
// 🖼️ Wallpaper popup logic (refactored: categorized switching + retained download logic)
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  // === 🔊 Background Video Volume Control ===
    const bgVideo = document.getElementById("bgVideo");
  const volumeSlider = document.getElementById("volumeSlider");
  const volumeValue = document.getElementById("volumeValue");
  const volumeIcon = document.getElementById("volumeIcon");

  // 检查控制元素是否存在
  if (volumeSlider && volumeValue && volumeIcon) {
      let lastVolume = 100; // 默认最后一次的音量

      // 1. 启动时加载音量设置
      function loadVolumeSettings() {
          const bgVideo = document.getElementById("bgVideo"); // 获取当前视频元素
          if (!bgVideo) return;

          const savedVolume = localStorage.getItem('backgroundVideoVolume');
          const savedMuteState = localStorage.getItem('backgroundVideoMuted') === 'true';

          if (savedVolume !== null) {
              lastVolume = parseInt(savedVolume, 10);
              if (savedMuteState) {
                  bgVideo.muted = true;
                  volumeSlider.value = 0;
                  volumeValue.textContent = '0%';
                  volumeIcon.textContent = '🔇';
              } else {
                  bgVideo.muted = false;
                  bgVideo.volume = lastVolume / 100;
                  volumeSlider.value = lastVolume;
                  volumeValue.textContent = lastVolume + '%';
                  volumeIcon.textContent = '🔊';
              }
          } else {
              // 首次使用的默认设置
              bgVideo.volume = 1.0;
              volumeSlider.value = 100;
              volumeValue.textContent = '100%';
              volumeIcon.textContent = '🔊';
              lastVolume = 100;
          }
      }

      // 2. 滑块交互
      volumeSlider.addEventListener('input', () => {
          // 🔥 核心修复：在事件触发时，重新获取最新的 video 元素
          const currentBgVideo = document.getElementById("bgVideo");
          if (!currentBgVideo) return; // 如果元素不存在，则不执行任何操作

          const newVolume = volumeSlider.value;
          currentBgVideo.volume = newVolume / 100;
          volumeValue.textContent = newVolume + '%';

          if (newVolume > 0) {
              currentBgVideo.muted = false;
              volumeIcon.textContent = '🔊';
              localStorage.setItem('backgroundVideoMuted', 'false');
              lastVolume = newVolume;
          } else {
              volumeIcon.textContent = '🔇';
          }

          localStorage.setItem('backgroundVideoVolume', newVolume);
      });

      // 3. 图标点击静音/取消静音
      volumeIcon.addEventListener('click', () => {
          // 🔥 核心修复：在事件触发时，同样重新获取最新的 video 元素
          const currentBgVideo = document.getElementById("bgVideo");
          if (!currentBgVideo) return;

          if (currentBgVideo.muted) {
              // 取消静音
              currentBgVideo.muted = false;
              volumeIcon.textContent = '🔊';
              const restoreVolume = lastVolume > 0 ? lastVolume : 100;
              volumeSlider.value = restoreVolume;
              volumeValue.textContent = restoreVolume + '%';
              currentBgVideo.volume = restoreVolume / 100;
              localStorage.setItem('backgroundVideoVolume', restoreVolume);
              localStorage.setItem('backgroundVideoMuted', 'false');
          } else {
              // 静音
              if (volumeSlider.value > 0) {
                  lastVolume = volumeSlider.value;
              }
              currentBgVideo.muted = true;
              volumeIcon.textContent = '🔇';
              volumeSlider.value = 0; // 将滑块移动到最左边
              volumeValue.textContent = '0%';
              localStorage.setItem('backgroundVideoMuted', 'true');
          }
      });

      // 初始化加载
      loadVolumeSettings();
  }
  
  // === ✉️ Envelope hint popup logic (modified: with new message red dot) ===
  const tipBtn = document.getElementById('wpTipBtn');
  const tipPopup = document.getElementById('wpTipPopup');
  const closeTipPopup = document.getElementById('closeTipPopup');
  const TIP_STORAGE_KEY = 'has_read_wallpaper_tip'; // Used to record whether the user has read

  // 0. Initial check: if user has not clicked, add red dot and animation class
  if (tipBtn) {
    const hasRead = localStorage.getItem(TIP_STORAGE_KEY);
    // If no record (means new user or never clicked), add prompt style
    if (!hasRead) {
      tipBtn.classList.add('has-new-tip');
    }
  }

  // 1. Click envelope button -> show popup + remove red dot
  if (tipBtn && tipPopup) {
    tipBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent bubbling

      // --- Core logic: user clicked, remove red dot and save record ---
      if (tipBtn.classList.contains('has-new-tip')) {
        tipBtn.classList.remove('has-new-tip'); // Remove style (stop shaking, red dot disappears)
        localStorage.setItem(TIP_STORAGE_KEY, 'true'); // Permanently record as read
      }
      // ---------------------------------------------

      tipPopup.classList.add('show');

      // (Keep your original cat bubble logic, if any)
      if(typeof showBubble === 'function') {
         // showBubble("Check out the notes喵~");
      }
    });
  }

  // 2. Click close button -> hide popup (unchanged)
  if (closeTipPopup && tipPopup) {
    closeTipPopup.addEventListener('click', (e) => {
      e.stopPropagation();
      tipPopup.classList.remove('show');
    });
  }

  // 3. Click outside popup -> close (unchanged)
  document.addEventListener('click', (e) => {
    if (tipPopup && tipPopup.classList.contains('show')) {
      if (!tipPopup.contains(e.target) && e.target !== tipBtn) {
        tipPopup.classList.remove('show');
      }
    }
  });

  // 3. Click outside popup (but inside wallpaper settings box) -> can also close
  document.addEventListener('click', (e) => {
    if (tipPopup && tipPopup.classList.contains('show')) {
      // If click is not inside popup, and not the trigger button
      if (!tipPopup.contains(e.target) && e.target !== tipBtn) {
        tipPopup.classList.remove('show');
      }
    }
  });
  const modal = document.getElementById("wallpaperModal");
  const grid = document.querySelector(".wallpaper-grid");
  const closeBtn = document.getElementById("closeModal");
  const videoUpload = document.getElementById("videoUpload");
  const bgImage = document.getElementById("bgImage");

  // Get sidebar tabs
  const tabs = document.querySelectorAll('.wp-tab');

  // Compatibility check: if HTML not updated, return directly to avoid errors
  if (tabs.length === 0) return;

  // --- Initialization ---
  initWallpaperModal();

function initWallpaperModal() {
    // Bind Tab click event
    tabs.forEach(tab => {
      // 🚀 [性能优化] 标记为 async，等待 Key 加载
      tab.addEventListener('click', async () => {
        // 1. Toggle Active style
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // 2. Switch data rendering
        const type = tab.dataset.type;
        await renderWallpapers(type); // 🚀 [性能优化] 等待加载

        // ✅ [New] After switching categories, automatically scroll back to top
        const rightPanel = document.querySelector('.wp-right-panel');
        if (rightPanel) {
          rightPanel.scrollTop = 0;
        }
      });
    });

    // Default render static wallpapers
    renderWallpapers('static');
  }

// 🚀 [性能优化] 渲染主函数：先加载 Key，再渲染
async function renderWallpapers(type) {
    // 1. 等待 IndexedDB 中的 ID 列表加载到内存
    await cacheDownloadedKeys();

    grid.innerHTML = ''; // Clear current content

    // 1. Reset Grid style
    grid.className = 'wallpaper-grid';

    // 2. Get right scroll container
    const rightPanel = document.querySelector('.wp-right-panel');

    // ✅ Core logic: first remove "no-scroll" by default, to prevent non-scrollable when switching back to other categories
    if (rightPanel) rightPanel.classList.remove('no-scroll');

    // 3. Distribute rendering by type
    if (type === 'custom') {
      grid.classList.add('custom-mode'); // Add center layout

      // ✅ If it is a custom page, add "no-scroll" class to the container
      if (rightPanel) rightPanel.classList.add('no-scroll');

      renderCustomPage();
    } else if (type === 'static') {
      renderStaticWallpapers();
    } else if (type === 'dynamic') {
      renderDynamicWallpapers();
    } else if (type === 'web') {
      renderWebWallpapers();
    }
  }
  // New: Render custom page logic
function renderCustomPage() {
    renderAddButton();

    // Hint text
    const hint = document.createElement('div');
    // ✅ Add text-align: center to center the text as well
    hint.style.cssText = "width:100%; color:#999; font-size:14px; text-align:center; line-height: 1.6;";
    hint.innerHTML = "💡 点击上方按钮上传本地图片或视频 (MP4) <br>上传后将自动应用并保存到浏览器缓存中";
    grid.appendChild(hint);
  }
// 1. Render static wallpapers (🎉 Newly upgraded: supports online download + gear management)
// Find and replace these two functions in 1.js

// Helper: Create and replace placeholder (this is the core of lazy loading)
function createAndReplacePlaceholder(placeholder, type) {
    const grid = placeholder.parentElement;
    const GITHUB_BASE = "https://ghproxy.net/https://raw.githubusercontent.com/shichen1234/wallpapers/main/";

    // Read information from placeholder's data-* attributes
    const i = placeholder.dataset.index;
    const isStatic = type === 'static';
    const fileName = isStatic ? `${i}.jpg` : `${i}.mp4`;
    const onlineUrl = `${GITHUB_BASE}${fileName}`;
    const posterSrc = isStatic ? `wallpapers/pictures/${i}.jpg` : `wallpapers/videos/${i}.png`;
    const dbKey = isStatic ? `static_${i}` : `wallpaper_${i}`;

    // --- Reuse your original wallpaper card creation logic ---
    const tile = document.createElement("div");
    tile.className = "video-tile";
    tile.dataset.downloaded = "false";

    const thumbBox = document.createElement("div");
    thumbBox.className = "lazy-video-thumb";
    thumbBox.style.cssText = "position:relative;width:100%;height:130px;border-radius:8px;cursor:pointer;overflow:hidden;";

    const img = document.createElement("img");
    img.src = posterSrc;
    img.style.cssText = "width:100%;height:100%;object-fit:cover;transition:transform 0.3s;";

    const mask = document.createElement("div");
    mask.className = "download-mask";
    mask.innerHTML = `<div class="loading-spinner"></div><span class="progress-text">0%</span>`;

    const badge = document.createElement("div");
    badge.className = "downloaded-badge";

    const gearBtn = document.createElement("button");
    gearBtn.className = "iconSettings";
    gearBtn.style.cssText = "position:absolute;bottom:8px;right:8px;border:none;cursor:pointer;z-index:10;";
    gearBtn.innerHTML = '<img src="images/chilun.png" alt="管理">';

    const popover = document.createElement("div");
    popover.className = "iconPopover overlay";
    popover.innerHTML = `<button class="delBtn" type="button">删除</button><button class="cancelBtn" type="button">取消</button>`;

    thumbBox.appendChild(img);
    thumbBox.appendChild(mask);
    thumbBox.appendChild(badge);
    thumbBox.appendChild(gearBtn);
    thumbBox.appendChild(popover);

    // ============================================================
    // ✨ Download link modification area (updated)
    // ============================================================
    const link = document.createElement('a');
    link.className = 'wallpaper-author-link';
    link.target = '_blank';
    link.style.cssText = `
        position: absolute;
        bottom: 8px;
        left: 8px;
        font-size: 12px;
        font-weight: bold;
        color: black;
        background-color: white;
        padding: 4px 8px;
        border-radius: 999px;
        text-decoration: none;
        z-index: 15;
        opacity: 0;
        visibility: hidden;
        transform: scale(0.95);
        transition: all 0.2s ease-out;
    `;
    link.addEventListener('click', (e) => e.stopPropagation());
    link.addEventListener('mouseenter', () => link.style.transform = 'scale(1.05)');
    link.addEventListener('mouseleave', () => link.style.transform = 'scale(1)');

    if (!isStatic) { // Dynamic wallpaper
        link.textContent = '壁纸链接 →';
        link.href = wallpaperAuthorLinks[i-1] || '#';
    } else { // Static wallpaper
        link.textContent = '下载链接 →';
        link.href = `https://shichen1234.github.io/wallpapers/${i}.jpg`;
        link.setAttribute('download', `${i}.jpg`); // Key: add download attribute
    }

    thumbBox.appendChild(link);
    // ===========================================================

    tile.appendChild(thumbBox);

    // 🚀 [性能优化] 使用同步检查，不再产生数据库IO
    if (checkVideoExistsSync(dbKey)) {
        badge.style.display = "block";
        tile.dataset.downloaded = "true";
    }

    // ============================================================
    // ✨ Card hover event modification area
    // ============================================================
    tile.addEventListener("mouseenter", () => {
        img.style.transform = "scale(1.1)";
        const link = tile.querySelector('.wallpaper-author-link');
        if (link) {
            link.style.opacity = '1';
            link.style.visibility = 'visible';
            link.style.transform = 'scale(1)';
        }
    });
    tile.addEventListener("mouseleave", () => {
        img.style.transform = "scale(1)";
        const link = tile.querySelector('.wallpaper-author-link');
        if (link) {
            link.style.opacity = '0';
            link.style.visibility = 'hidden';
            link.style.transform = 'scale(0.95)';
        }
    });
    // ============================================================

    gearBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll('.video-tile .iconPopover.show').forEach(el => el.classList.remove('show'));
        popover.classList.add("show");
    });

    popover.querySelector('.cancelBtn').addEventListener("click", (e) => {
        e.stopPropagation();
        popover.classList.remove("show");
    });

    popover.querySelector('.delBtn').addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm(`确定要删除这个壁纸缓存吗？`)) {
            await deleteVideoFromIndexedDB(dbKey);
            // 🚀 [性能优化] 删除后同步更新内存 Set
            downloadedKeys.delete(dbKey);
            
            tile.dataset.downloaded = "false";
            badge.style.display = "none";
            popover.classList.remove("show");
            if(typeof showBubble === 'function') showBubble("壁纸缓存已删除喵！🗑️");
        }
    });

// 在 1.js 的 createAndReplacePlaceholder 函数内

tile.addEventListener("click", async (e) => {
    if (popover.classList.contains('show')) {
        popover.classList.remove('show');
        return;
    }

    // 如果已下载，直接应用
    if (tile.dataset.downloaded === "true") {
        const file = await getVideoFromDB(dbKey);
        if (file) {
            try {
                await setBackgroundFromBlob(file);
                localStorage.setItem("wallpaperType", "upload");
                localStorage.setItem("currentWallpaperKey", dbKey);
                if (typeof showBubble === 'function') showBubble("壁纸切换成功喵！");
            } catch (err) {
                console.error('[G-web] 设置已下载壁纸失败:', err);
                if (typeof showBubble === 'function') showBubble("应用壁纸失败了喵...");
            }
        }
        return;
    }

    // --- 开始下载逻辑 ---
    mask.classList.add("active");
    const progressText = mask.querySelector(".progress-text");

    try {
        const response = await fetch(onlineUrl);
        if (!response.ok) throw new Error(`连接失败: ${response.status}`);

        const total = parseInt(response.headers.get('content-length'), 10);
        let loaded = 0;
        const reader = response.body.getReader();
        const chunks = [];
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.length;
            if (total) progressText.textContent = `${Math.round((loaded / total) * 100)}%`;
        }
        const blob = new Blob(chunks, { type: isStatic ? 'image/jpeg' : 'video/mp4' });
        chunks.length = 0;

        // 应用壁纸
        progressText.textContent = '100%';
        await setBackgroundFromBlob(blob);

        // 保存壁纸
        progressText.textContent = '保存中...';
        try {
            await saveVideoToIndexedDB(blob, dbKey);
            // 🚀 [性能优化] 下载成功后更新内存 Set
            downloadedKeys.add(dbKey);
            
            // ✅ 只有成功保存后，才更新状态
            tile.dataset.downloaded = "true";
            badge.style.display = "block";
            localStorage.setItem("wallpaperType", "upload");
            localStorage.setItem("currentWallpaperKey", dbKey);
            
            if (typeof showBubble === 'function') showBubble("下载并应用成功喵！🎉");

        } catch (saveErr) {
            // 🔥 核心修复：捕获保存错误并通知用户
            console.error('[G-web] 保存下载壁纸到 IndexedDB 失败:', saveErr);
            if (typeof showBubble === 'function') {
                // 判断是否是空间不足的错误
                if (saveErr.name === 'QuotaExceededError') {
                    showBubble("存储空间不足！请在壁纸管理中删除一些旧壁纸再试喵～😿", true, true);
                } else {
                    showBubble("壁纸保存失败了喵，请稍后再试。", true, true);
                }
            }
            // 即使保存失败，也把壁纸删掉，让用户可以重新下载
            await deleteVideoFromIndexedDB(dbKey).catch(()=>{});
        }

    } catch (fetchErr) {
        console.error('[G-web] 下载壁纸失败:', fetchErr);
        progressText.textContent = "下载失败";
    } finally {
        // 无论成功与否，2秒后都移除遮罩
        setTimeout(() => mask.classList.remove("active"), 2000);
    }
});

    // Add fade-in animation class
    tile.classList.add('tile-fade-in');
    // Replace placeholder with newly created real card
    placeholder.replaceWith(tile);
}

function renderStaticWallpapers() {
    const grid = document.querySelector(".wallpaper-grid");
    const fragment = document.createDocumentFragment();
   const dailyPlaceholder = document.createElement("div");
    dailyPlaceholder.className = "wallpaper-placeholder special-external-daily";
    fragment.appendChild(dailyPlaceholder);
    // 1. Create ordinary static wallpaper placeholders (1-45)
    for (let i = 1; i <= 101; i++) {
        const placeholder = document.createElement("div");
        placeholder.className = "wallpaper-placeholder";
        placeholder.dataset.index = i;
        fragment.appendChild(placeholder);
    }

    grid.appendChild(fragment);

    // 2. Intersection Observer logic
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;

                // 🔥【New】Render special card
                if (target.classList.contains('special-external-daily')) {
                    const specialTile = document.createElement("div");
                    specialTile.className = "video-tile";

                    const thumbBox = document.createElement("div");
                    thumbBox.className = "lazy-video-thumb";
                    // Keep the same height and rounded corners as other cards
                    thumbBox.style.cssText = "position:relative;width:100%;height:130px;border-radius:8px;cursor:pointer;overflow:hidden;";

                    const img = document.createElement("img");
                    // ✅ Your custom cover image
                    img.src = "wallpapers/pictures/special image.png";
                    img.style.cssText = "width:100%;height:100%;object-fit:cover;transition:transform 0.3s;";
                    // Fallback: if cover image not found, use default poster
                    img.onerror = () => { img.src = 'wallpapers/poster.jpg'; };

                    // ✅ Top right "daily change" label
                    const timeLabel = document.createElement("div");
                    timeLabel.className = "wallpaper-special-tag1"; // Reuse previous style or ensure CSS has this class
                    timeLabel.textContent = "一天一换";
                    // To ensure style takes effect, if not in CSS, add inline fallback here
                    timeLabel.style.cssText = "position: absolute;top: 6px;left: 6px;background: linear-gradient(135deg, #20b5ff, #ff8b8b); /* Warm gradient */color: white;font-size: 13px;font-weight: bold;padding: 3px 7px;border-radius: 5px;box-shadow: 0 2px 5px rgba(0,0,0,0.3);text-shadow: 1px 1px 1px rgba(0,0,0,0.4);z-index: 10;pointer-events: none;";

                    thumbBox.appendChild(img);
                    thumbBox.appendChild(timeLabel);
                    specialTile.appendChild(thumbBox);

                    // Animation and interaction
                    specialTile.classList.add('tile-fade-in');
                    specialTile.addEventListener("mouseenter", () => { img.style.transform = "scale(1.1)"; });
                    specialTile.addEventListener("mouseleave", () => { img.style.transform = "scale(1)"; });

                    // ✅ Click event: switch to external daily wallpaper mode
                    specialTile.addEventListener("click", () => {
                        // 1. Clear old state
                        localStorage.removeItem("currentWallpaperKey");
                        localStorage.removeItem("wallpaper");

                        // Add this line: Delete custom uploaded video if it was active
                        if (typeof window.deleteVideoFromIndexedDB === 'function') {
                            window.deleteVideoFromIndexedDB("bgVideo");
                        }
                        
                        // Pause and mute the video as this is switching to an image-based daily wallpaper
                        bgVideo.pause();
                        bgVideo.muted = true;

                        // 2. Mark mode as 'daily_external'
                        localStorage.setItem("wallpaperType", "daily_external");

                        // 3. Execute switch
                        if (typeof window.applyDailyExternalWallpaper === 'function') {
                            window.applyDailyExternalWallpaper();
                        }

                        // 4. Close popup and prompt
                        if(typeof showBubble === 'function') showBubble("已切换到每日必应壁纸，每天都有新风景喵～🌏");
                    });

                    target.replaceWith(specialTile);
                    observer.unobserve(specialTile);

                } else {
                    // Normal wallpaper logic (unchanged)
                    createAndReplacePlaceholder(target, 'static');
                    observer.unobserve(target);
                }
            }
        });
    }, { root: document.querySelector('.wp-right-panel'), rootMargin: "200px" });

    grid.querySelectorAll('.wallpaper-placeholder').forEach(ph => observer.observe(ph));
}


function renderDynamicWallpapers() {
    const grid = document.querySelector(".wallpaper-grid");
    const fragment = document.createDocumentFragment();

      const specialPlaceholder = document.createElement("div");
    specialPlaceholder.className = "wallpaper-placeholder special-tile"; // Add a special class
    fragment.appendChild(specialPlaceholder);
    // 1. Create placeholders
    for (let i = 1; i <= 110; i++) {
        const placeholder = document.createElement("div");
        placeholder.className = "wallpaper-placeholder";
        placeholder.dataset.index = i;
        fragment.appendChild(placeholder);
    }

    grid.appendChild(fragment);

    // 2. Create Intersection Observer
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                if (target.classList.contains('special-tile')) {
                    // This is the special card for "smart switch"
                    const specialTile = document.createElement("div");
                    specialTile.className = "video-tile";
                    const thumbBox = document.createElement("div");
                    thumbBox.className = "lazy-video-thumb";
                    thumbBox.style.cssText = "position:relative;width:100%;height:90px;border-radius:8px;cursor:pointer;overflow:hidden;";
                    const img = document.createElement("img");
                    img.src = "wallpapers/videos/video special image.png";
                    img.style.cssText = "width:100%;height:100%;object-fit:cover;transition:transform 0.3s;";
                    img.onerror = () => { img.src = 'wallpapers/poster.jpg'; };
                    const timeLabel = document.createElement("div");
                    timeLabel.className = "wallpaper-special-tag";
                    timeLabel.textContent = "随时间变化";
                    thumbBox.appendChild(img);
                    thumbBox.appendChild(timeLabel);

                    // ============================================================
                    // ✨ Also add author link for "Time-varying" card
                    // ============================================================
                    const authorLink = document.createElement('a');
                    authorLink.className = 'wallpaper-author-link';
                    authorLink.href = 'https://steamcommunity.com/sharedfiles/filedetails/?id=3373205871';
                    authorLink.target = '_blank';
                    authorLink.textContent = '壁纸链接 →';
                    authorLink.style.cssText = `
                        position: absolute;
                        bottom: 8px;
                        left: 8px;
                        font-size: 12px;
                        font-weight: bold;
                        color: black;
                        background-color: white;
                        padding: 4px 8px;
                        border-radius: 999px;
                        text-decoration: none;
                        z-index: 15;
                        opacity: 0;
                        visibility: hidden;
                        transform: scale(0.95);
                        transition: all 0.2s ease-out;
                    `;
                    authorLink.addEventListener('click', (e) => e.stopPropagation());
                    authorLink.addEventListener('mouseenter', () => authorLink.style.transform = 'scale(1.05)');
                    authorLink.addEventListener('mouseleave', () => authorLink.style.transform = 'scale(1)');
                    thumbBox.appendChild(authorLink);
                    // ============================================================

                    specialTile.appendChild(thumbBox);
                    specialTile.addEventListener("click", () => {
                      if (bgWebFrame) {
                            bgWebFrame.style.display = 'none';
                            bgWebFrame.src = ''; // 清空src彻底停止网页运行
                        }
                        localStorage.removeItem("wallpaperType");
                        localStorage.removeItem("currentWallpaperKey");
                        localStorage.removeItem("wallpaper");

                        // Clear uploaded video data from IndexedDB
                        if (typeof window.deleteVideoFromIndexedDB === 'function') {
                            window.deleteVideoFromIndexedDB("bgVideo");
                        }

   // 这里加个保险：确保 bgVideo 存在再操作，避免报错阻塞执行
                        const bgVideo = document.getElementById("bgVideo"); 
                        if (bgVideo) {
                            bgVideo.pause(); // Pause the video
                            bgVideo.muted = true; // Mute the video
                        }
                        if (typeof initializeDefaultWallpaperByTime === 'function') {
                            initializeDefaultWallpaperByTime();
                        } else {
                            location.reload();
                        }
                        if(typeof showBubble === 'function') showBubble("已切换为随时间变化的智能壁纸喵！☀️🌧️");
                    });

                    // ============================================================
                    // ✨ "Time-varying" card hover event
                    // ============================================================
                    specialTile.addEventListener("mouseenter", () => {
                        img.style.transform = "scale(1.1)";
                        const link = specialTile.querySelector('.wallpaper-author-link');
                        if(link) {
                            link.style.opacity = '1';
                            link.style.visibility = 'visible';
                            link.style.transform = 'scale(1)';
                        }
                    });
                    specialTile.addEventListener("mouseleave", () => {
                        img.style.transform = "scale(1)";
                        const link = specialTile.querySelector('.wallpaper-author-link');
                        if(link) {
                            link.style.opacity = '0';
                            link.style.visibility = 'hidden';
                            link.style.transform = 'scale(0.95)';
                        }
                    });
                    // ============================================================

                    specialTile.classList.add('tile-fade-in');
                    target.replaceWith(specialTile);

                } else {
                    // Normal dynamic wallpaper
                    createAndReplacePlaceholder(target, 'dynamic');
                }
                observer.unobserve(target);
            }
        });
    }, { root: document.querySelector('.wp-right-panel'), rootMargin: "200px" });

    // 3. Start observing all placeholders
    grid.querySelectorAll('.wallpaper-placeholder').forEach(ph => observer.observe(ph));
}


  // 3. Render "Add" button (displayed on both sides)
function renderAddButton() {
    const addBox = document.createElement("div");
    addBox.className = "add-wallpaper";
    addBox.innerHTML = `<span>+</span><div style="font-size:16px;margin-top:5px;font-weight:bold;">点击上传</div>`;
    addBox.style.flexDirection = "column";
    addBox.addEventListener("click", () => {
      videoUpload.click();
    });
    grid.appendChild(addBox);
  }

  // Helper: Close popup
  function closeWallpaperModal() {
    modal.classList.remove("show");
    setTimeout(() => { modal.style.display = "none"; }, 350);
  }

  // --- Bind general events ---
  closeBtn?.addEventListener("click", closeWallpaperModal);
  // Upload file listener (logic unchanged)
  videoUpload.addEventListener("change", async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    // 使用统一 helper 来设置背景并管理临时 URL
    try {
      await setBackgroundFromBlob(file);
      window.cleanupUnusedWallpapers(); 
    } catch (e) {
      console.error('[G-web] 设置上传壁纸失败:', e);
    }

    closeWallpaperModal();
    saveVideoToIndexedDB(file).then(() => {
      localStorage.setItem("wallpaperType", "upload");
      localStorage.setItem("currentWallpaperKey", "bgVideo");
      localStorage.removeItem("wallpaper");
    });
    if(typeof showBubble === 'function') showBubble("自定义壁纸设置成功喵！✨");
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
}else if (weatherInfo.includes("扬沙")) {
replies = [
    "咳咳……外面风沙好大喵，快把窗户关紧！",
    "呜哇～外面黄沙漫天，小猫不想吃土喵～",
    "要戴好口罩哦，小猫会心疼你的肺喵～"
  ];
}
 else if (weatherInfo.includes("雪")) {
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

// YouTube icon hover
document.getElementById("extraIcon").addEventListener("mouseenter", () => {
  const youtubeReplies = [
    "这是作者油管主页哦~",
    "YouTube 也藏着我的身影喔~",
    "偷偷告诉你，这里是我的油管传送门！"
  ];
  const reply = youtubeReplies[Math.floor(Math.random() * youtubeReplies.length)];
  showBubble(reply);
});
/* --- New: make popup draggable --- */

/**
 * Make a popup content draggable.
 * @param {HTMLElement} modalContentElement - The popup content element to drag (.modal-content).
 * @param {HTMLElement} dragHandleElement - The handle element for dragging (e.g., the popup header).
 */
function makeDraggable(modalContentElement, dragHandleElement) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
    const modalContainer = modalContentElement.parentElement;

    // Bind mouse down event to drag handle
    if(dragHandleElement) {
      dragHandleElement.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault(); // Prevent default behavior, such as text selection

        // Record initial mouse position
        pos3 = e.clientX;
        pos4 = e.clientY;

        // Listen for mouse up and move events on the entire document
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;

        // Change cursor style
        if(dragHandleElement) {
            dragHandleElement.style.cursor = 'grabbing';
        }
        document.body.style.cursor = 'grabbing';
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();

        // First move, perform one-time setup
        if (!isDragging) {
            isDragging = true;
            
            // Get current visual position of popup calculated by flex layout
            const rect = modalContentElement.getBoundingClientRect();
            
            // Disable parent container's flex centering, prepare for absolute positioning
            if (modalContainer && modalContainer.style.justifyContent !== 'flex-start') {
                modalContainer.style.justifyContent = 'flex-start';
                modalContainer.style.alignItems = 'flex-start';
            }
            
            // Switch popup content to absolute positioning, and set its initial top/left
            modalContentElement.style.position = 'absolute';
            modalContentElement.style.top = rect.top + 'px';
            modalContentElement.style.left = rect.left + 'px';
            
            // Remove transform styles that might affect positioning (usually for centering or intro animations)
            modalContentElement.style.transform = 'none';
        }

        // Calculate mouse movement distance
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;

        // Update popup position
        modalContentElement.style.top = (modalContentElement.offsetTop - pos2) + "px";
        modalContentElement.style.left = (modalContentElement.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // When mouse is released, restore cursor and remove event listeners
        if(dragHandleElement) {
            dragHandleElement.style.cursor = 'move';
        }
        document.body.style.cursor = '';
        
        document.onmouseup = null;
        document.onmousemove = null;
        isDragging = false; // Reset drag state
    }
}


// After page loaded, apply draggable function to specified popup
document.addEventListener('DOMContentLoaded', () => {
    const DRAG_HINT_DISMISSED_KEY = 'hasDismissedDragHint';
    const wallpaperModal = document.getElementById('wallpaperModal');

    const hasDismissedHint = localStorage.getItem(DRAG_HINT_DISMISSED_KEY);

    if (!hasDismissedHint && wallpaperModal) {
        const dragHint = document.getElementById('dragHint');
        const wallpaperContent = wallpaperModal.querySelector('.modal-content');

        if (dragHint && wallpaperContent) {
            const observer = new MutationObserver((mutationsList, obs) => {
                for (const mutation of mutationsList) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style' && wallpaperModal.style.display === 'flex') {
                        
                        // Delay showing hint, ensure panel animation is basically complete
                        setTimeout(() => {
                            // 1. First make hint bar visible
                            dragHint.classList.add('visible');

                            // 2. 【Core fix】After hint bar is visible, add one-time event listener to "dismiss" it
                            wallpaperContent.addEventListener('mousedown', function dismissHint() {
                                dragHint.classList.remove('visible');
                                localStorage.setItem(DRAG_HINT_DISMISSED_KEY, 'true');
                                // Listener is now 'once', will automatically remove, no extra action needed
                            }, { once: true });

                        }, 500);

                        // Task complete, stop observing, avoid repeated triggers
                        obs.disconnect();
                        break;
                    }
                }
            });

            // Start observer
            observer.observe(wallpaperModal, { attributes: true });
        }
    }    // Make "Change Wallpaper" popup draggable
const wallpaperModalContent = document.querySelector('#wallpaperModal .modal-content');
    if (wallpaperModal) {
        const modalContent = wallpaperModal.querySelector('.modal-content');
        const header = wallpaperModal.querySelector('.modal-header');
        if (modalContent && header) {
            makeDraggable(modalContent, header);
        }
    }
});
// ============================================================
// 🌐 网页壁纸模块 (Wallpaper Engine Web Type)
// ============================================================

// ⚙️ 配置区 —— 只需修改这两行
const WEB_WP_GITHUB_RAW = 'https://raw.githubusercontent.com/shichen1234/wallpapers/main/';
const WEB_WP_PROXY_BASE = 'https://ghproxy.net/' + WEB_WP_GITHUB_RAW;
const WEB_WP_TOTAL = 9; // 仓库 web/ 目录下 zip 的总数 (1.zip ~ N.zip)

// 当前已创建的 Blob URL 列表，切换壁纸时统一 revoke
let currentWebWpBlobUrls = [];
// 交互模式状态
let webWpInteractive = false;

// ── 渲染网页壁纸卡片列表 ────────────────────────────────────
function renderWebWallpapers() {
  const grid = document.querySelector('.wallpaper-grid');
  grid.innerHTML = '';

  // 不再添加顶部说明卡片

  for (let i = 1; i <= WEB_WP_TOTAL; i++) {
    const dbKey = `webwp_${i}`;

    const tile = document.createElement('div');
    tile.className = 'video-tile';
    tile.dataset.downloaded = checkVideoExistsSync(dbKey) ? 'true' : 'false';

    const thumbBox = document.createElement('div');
    thumbBox.className = 'lazy-video-thumb';
    thumbBox.style.cssText = 'position:relative;width:100%;height:130px;border-radius:8px;cursor:pointer;overflow:hidden;';

    // 封面图：wallpapers/web/1.jpg，没有则用 poster
    const img = document.createElement('img');
    img.src = `wallpapers/web/${i}.jpg`;
    img.onerror = () => { img.src = 'wallpapers/poster.jpg'; };
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;transition:transform 0.3s;';


    // 下载进度遮罩
    const mask = document.createElement('div');
    mask.className = 'download-mask';
    mask.innerHTML = `<div class="loading-spinner"></div><span class="progress-text">0%</span>`;

    // 已缓存勾
    const badge = document.createElement('div');
    badge.className = 'downloaded-badge';
    if (tile.dataset.downloaded === 'true') badge.style.display = 'block';

    // 下载/网页链接按钮（左下角，悬停显示）
    const webWallpaperLinks = [
      'https://codepen.io/donotfold/pen/yyapzOP', // 1
      'https://codepen.io/LeonLinBuild/pen/emdgRJj', // 2
      'https://codepen.io/BalintFerenczy/pen/qENdpoL',// 3
      'https://steamcommunity.com/sharedfiles/filedetails/?id=888689688' ,// 4
      'https://codepen.io/Mant0uStudio/pen/ZYWywJB', // 5
      'https://codepen.io/aleksa-rakocevic/pen/bNeeGMa', // 6
      'https://codepen.io/ed-demircioglu/pen/yyaOJKO', // 7 
      'https://steamcommunity.com/sharedfiles/filedetails/?id=3553519395', // 8 
      'https://steamcommunity.com/sharedfiles/filedetails/?id=3419679793' // 9 
    ];
    const dlLink = document.createElement('a');
    dlLink.className = 'wallpaper-author-link';
    dlLink.target = '_blank';
    dlLink.textContent = '网页链接 →';
    dlLink.href = webWallpaperLinks[i-1] || `${WEB_WP_GITHUB_RAW}${i}.zip`;
    dlLink.style.cssText = `
      position:absolute;bottom:8px;left:8px;font-size:12px;font-weight:bold;
      color:black;background-color:white;padding:4px 8px;border-radius:999px;
      text-decoration:none;z-index:15;opacity:0;visibility:hidden;
      transform:scale(0.95);transition:all 0.2s ease-out;
    `;
    dlLink.addEventListener('click', e => e.stopPropagation());

    // 管理齿轮
    const gearBtn = document.createElement('button');
    gearBtn.className = 'iconSettings';
    gearBtn.style.cssText = 'position:absolute;bottom:8px;right:8px;border:none;cursor:pointer;z-index:10;background:none;';
    gearBtn.innerHTML = '<img src="images/chilun.png" alt="管理">';

    const popover = document.createElement('div');
    popover.className = 'iconPopover overlay';
    popover.innerHTML = `<button class="delBtn" type="button">删除缓存</button><button class="cancelBtn" type="button">取消</button>`;

    thumbBox.append(img, mask, badge, dlLink, gearBtn, popover);
    tile.appendChild(thumbBox);

    // 悬停效果
    tile.addEventListener('mouseenter', () => {
      img.style.transform = 'scale(1.1)';
      dlLink.style.opacity = '1';
      dlLink.style.visibility = 'visible';
      dlLink.style.transform = 'scale(1)';
    });
    tile.addEventListener('mouseleave', () => {
      img.style.transform = 'scale(1)';
      dlLink.style.opacity = '0';
      dlLink.style.visibility = 'hidden';
      dlLink.style.transform = 'scale(0.95)';
    });

    // 齿轮按钮
    gearBtn.addEventListener('click', e => {
      e.stopPropagation();
      document.querySelectorAll('.iconPopover.show').forEach(el => el.classList.remove('show'));
      popover.classList.add('show');
    });
    popover.querySelector('.cancelBtn').addEventListener('click', e => {
      e.stopPropagation();
      popover.classList.remove('show');
    });
    popover.querySelector('.delBtn').addEventListener('click', async e => {
      e.stopPropagation();
      if (confirm('确定删除这个网页壁纸的缓存吗？')) {
        await deleteVideoFromIndexedDB(dbKey);
        downloadedKeys.delete(dbKey);
        tile.dataset.downloaded = 'false';
        badge.style.display = 'none';
        popover.classList.remove('show');
        if (typeof showBubble === 'function') showBubble('缓存已删除喵！🗑️');
      }
    });

    // ── 点击：应用或下载 ──────────────────────────────────────
    tile.addEventListener('click', async e => {
      if (popover.classList.contains('show')) { popover.classList.remove('show'); return; }

      const progressText = mask.querySelector('.progress-text');

      // 已缓存，直接从 IndexedDB 读取
      if (tile.dataset.downloaded === 'true') {
        try {
          const zipBlob = await getVideoFromDB(dbKey);
          if (zipBlob) {
            mask.classList.add('active');
            progressText.textContent = '解析中...';
            await applyWebWallpaper(zipBlob);
            localStorage.setItem('wallpaperType', 'web');
            localStorage.setItem('currentWallpaperKey', dbKey);
            if (typeof showBubble === 'function') showBubble('网页壁纸切换成功喵！🌐');
          }
        } catch (err) {
          console.error('[G-web] 应用网页壁纸失败:', err);
          if (typeof showBubble === 'function') showBubble('应用失败了喵，请重试～');
        } finally {
          setTimeout(() => mask.classList.remove('active'), 1500);
        }
        return;
      }

      // 下载流程
      mask.classList.add('active');
      progressText.textContent = '0%';

      try {
        const response = await fetch(WEB_WP_PROXY_BASE + `${i}.zip`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const total = parseInt(response.headers.get('content-length'), 10);
        let loaded = 0;
        const reader = response.body.getReader();
        const chunks = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          if (total) progressText.textContent = `${Math.round(loaded / total * 100)}%`;
        }

        const zipBlob = new Blob(chunks, { type: 'application/zip' });
        chunks.length = 0;

        progressText.textContent = '解析中...';
        await applyWebWallpaper(zipBlob);
        localStorage.setItem('wallpaperType', 'web');
        localStorage.setItem('currentWallpaperKey', dbKey);

        progressText.textContent = '保存中...';
        try {
          await saveVideoToIndexedDB(zipBlob, dbKey);
          downloadedKeys.add(dbKey);
          tile.dataset.downloaded = 'true';
          badge.style.display = 'block';
          if (typeof showBubble === 'function') showBubble('下载并应用成功喵！🎉');
        } catch (saveErr) {
          console.error('[G-web] 保存失败:', saveErr);
          if (typeof showBubble === 'function') {
            if (saveErr.name === 'QuotaExceededError') {
              showBubble('存储空间不足！请先删除旧壁纸再试喵～😿', true, true);
            } else {
              showBubble('壁纸保存失败了喵，请稍后再试。', true, true);
            }
          }
          await deleteVideoFromIndexedDB(dbKey).catch(() => {});
        }

      } catch (fetchErr) {
        console.error('[G-web] 下载失败:', fetchErr);
        progressText.textContent = '下载失败';
      } finally {
        setTimeout(() => mask.classList.remove('active'), 2000);
      }
    });

    tile.classList.add('tile-fade-in');
    grid.appendChild(tile);
  }
}

// ── 核心：解压 zip，重写路径，注入 iframe (沙盒通信版) ────────────────────
async function applyWebWallpaper(zipBlob) {
  if (!window.JSZip) {
    throw new Error('JSZip 未加载，请确认 lib/jszip.min.js 已引入');
  }

  // 撤销上一组 Blob URL，防止内存泄漏
  currentWebWpBlobUrls.forEach(u => { try { URL.revokeObjectURL(u); } catch (_) {} });
  currentWebWpBlobUrls = [];

  const zip = await JSZip.loadAsync(zipBlob);

  // 第一步：把所有文件并行解压
  // ⚠️ 沙盒 iframe 运行在 null origin，父页面创建的 blob URL 无法被 sandbox 跨源读取。
  // 解决方案：对图片/字体/媒体等"静态嵌入"文件使用 base64 data URL（自包含，无跨源限制）；
  //           对 JS/CSS 不生成 URL（走 extractedJsString/extractedCssString 内联注入），
  //           对大体积的 video/audio 保留 blob URL（避免 base64 过大），可在此调整。
  const INLINE_AS_DATA_URL_EXTS = new Set([
    'png','jpg','jpeg','gif','webp','svg','ico','bmp',   // 图片
    'woff','woff2','ttf','otf',                           // 字体
  ]);
  const blobUrlMap = {};
  const tasks = [];
  zip.forEach((relativePath, fileEntry) => {
    if (fileEntry.dir) return;
    const ext = (relativePath.split('.').pop() || '').toLowerCase();
    const mime = getWebWpMime(relativePath);

    tasks.push(
      fileEntry.async(INLINE_AS_DATA_URL_EXTS.has(ext) ? 'base64' : 'blob').then(data => {
        let url;
        if (INLINE_AS_DATA_URL_EXTS.has(ext)) {
          // data URL：沙盒可直接读取，无跨源限制
          url = `data:${mime};base64,${data}`;
        } else {
          // blob URL（video / audio / 其他大文件）
          const typed = new Blob([data], { type: mime });
          url = URL.createObjectURL(typed);
          currentWebWpBlobUrls.push(url);
        }
        // 同时注册带 ./ 前缀和不带的两种 key
        blobUrlMap[relativePath] = url;
        blobUrlMap['./' + relativePath] = url;
        // 兼容 Windows 路径分隔符
        const normalized = relativePath.replace(/\\/g, '/');
        if (normalized !== relativePath) {
          blobUrlMap[normalized] = url;
          blobUrlMap['./' + normalized] = url;
        }
      })
    );
  });
  await Promise.all(tasks);

  // 第二步：找 index.html（兼容放在子目录的情况）
  let indexEntry = zip.file('index.html') || zip.file('index.htm');
  if (!indexEntry) {
    // 尝试在第一层子目录中查找
    let found = null;
    zip.forEach((path, entry) => {
      if (!found && (path.endsWith('/index.html') || path.endsWith('/index.htm'))) {
        found = entry;
      }
    });
    if (found) indexEntry = found;
  }
  if (!indexEntry) throw new Error('压缩包中没有找到 index.html，请检查壁纸 zip 结构');

  // 第三步：重写 HTML 中所有资源引用 (这会让 HTML 里的图片、外部 JS 指向合法的本地 Blob)
  let html = await indexEntry.async('string');
  html = rewriteWebWpHTML(html, blobUrlMap);

  // 额外提取可能的纯代码文件 (双重保险，发送给沙盒执行)
  let extractedCssString = "";
  if (zip.file("style.css")) extractedCssString = await zip.file("style.css").async("string");
  let extractedJsString = "";
  if (zip.file("main.js")) extractedJsString = await zip.file("main.js").async("string");
  else if (zip.file("script.js")) extractedJsString = await zip.file("script.js").async("string");

  // ============================================================
  // 🔧 防止双重执行 & 消除 blob 跨源错误：
  // 如果 extractedJsString 已提取到 JS，则从 HTML 中移除对应的
  // <script src="..."> 标签（已被路径重写为 blob URL）。
  // 原因：扩展沙盒的 null origin 无法 fetch 父页面创建的 blob URL，
  // 会产生 net::ERR_FAILED 控制台错误；且 sandbox.js 会内联注入
  // extractedJsString，保留 src 标签会导致重复执行。
  // ============================================================
  if (extractedJsString) {
    // 移除所有外部 script 标签（src 已被 rewriteWebWpHTML 替换为 blob: 或保留原路径）
    html = html.replace(/<script\b[^>]+\bsrc\s*=\s*["'][^"']*["'][^>]*>[\s\S]*?<\/script>/gi, (match) => {
      // 保留 importmap，只移除 src 型外部脚本
      if (/type\s*=\s*["']importmap["']/i.test(match)) return match;
      return '<!-- [G-web] script src removed, injected inline by sandbox -->';
    });
  }

  // 停止动态视频层（bgImage 暂时保留，作为加载兜底，后面延迟隐藏）
  const bgImg   = document.getElementById('bgImage');
  const bgVideo = document.getElementById('bgVideo');
  if (bgVideo) {
    bgVideo.pause();
    bgVideo.muted = true;
    bgVideo.removeAttribute('src');
    bgVideo.load();         // 刷新解码器，彻底清空音频缓冲区
    bgVideo.style.display = 'none';
  }

  // 显示 Web 壁纸 iframe
  const frame = document.getElementById('bgWebFrame');
  frame.style.display = 'block';
  frame.style.pointerEvents = 'auto'; // 默认关闭交互，不遮挡扩展 UI
  webWpInteractive = false;

  // ====== 自动重发机制，彻底消除白屏 ======
  let webWpRendered = false;
  let webWpRetryCount = 0;
  const MAX_RETRY = 3;
  let webWpRetryTimer = null;

  // 先移除旧监听，防止多次触发
  if (window._webWpSandboxReadyHandler) {
    window.removeEventListener('message', window._webWpSandboxReadyHandler);
    window._webWpSandboxReadyHandler = null;
  }
  if (window._webWpRenderedHandler) {
    window.removeEventListener('message', window._webWpRenderedHandler);
    window._webWpRenderedHandler = null;
  }

  // 监听 WP_RENDERED，收到后停止重发
  window._webWpRenderedHandler = function(event) {
    if (event.source === frame.contentWindow && event.data && event.data.type === 'WP_RENDERED') {
      webWpRendered = true;
      if (webWpRetryTimer) {
        clearTimeout(webWpRetryTimer);
        webWpRetryTimer = null;
      }
      window.removeEventListener('message', window._webWpRenderedHandler);
      window._webWpRenderedHandler = null;
    }
  };
  window.addEventListener('message', window._webWpRenderedHandler);

  // 监听 SANDBOX_READY，收到后开始发送壁纸数据
  window._webWpSandboxReadyHandler = function(event) {
    if (event.source === frame.contentWindow && event.data && event.data.type === 'SANDBOX_READY') {
      // 只允许第一次触发
      window.removeEventListener('message', window._webWpSandboxReadyHandler);
      window._webWpSandboxReadyHandler = null;

      function sendWallpaperToSandbox() {
        if (webWpRendered || webWpRetryCount >= MAX_RETRY) return;
        if (localStorage.getItem('wallpaperType') !== 'web') return;

        // 清除上一次可能残留的兜底定时器
        if (window._webWpFallbackTimer) {
          clearTimeout(window._webWpFallbackTimer);
          window._webWpFallbackTimer = null;
        }

        frame.contentWindow.postMessage({
          type: 'RENDER_WALLPAPER',
          html: html,
          css: extractedCssString,
          js: extractedJsString
        }, '*');

        // 握手式隐藏：等 sandbox 发回 WP_RENDERED 信号后再隐藏 bgImage
        // 兜底：1500ms 内未收到信号也强制隐藏，防止因渲染错误永远卡住
        window._webWpFallbackTimer = setTimeout(() => {
          window._webWpFallbackTimer = null;
          const latestBgImg = document.getElementById('bgImage');
          if (latestBgImg && localStorage.getItem('wallpaperType') === 'web') {
            latestBgImg.style.display = 'none';
          }
        }, 1500);

        webWpRetryCount++;
        if (!webWpRendered && webWpRetryCount < MAX_RETRY) {
          webWpRetryTimer = setTimeout(sendWallpaperToSandbox, 1000);
        }
      }

      webWpRendered = false;
      webWpRetryCount = 0;
      sendWallpaperToSandbox();
    }
  };
  window.addEventListener('message', window._webWpSandboxReadyHandler);

  // 强制刷新 iframe，确保每次都能收到 SANDBOX_READY
  frame.src = 'sandbox.html';
}

// ── HTML 静态路径重写 ────────────────────────────────────────
function rewriteWebWpHTML(html, blobUrlMap) {
  function resolve(val) {
    if (!val) return null;
    const direct = blobUrlMap[val];
    if (direct) return direct;
    const stripped = val.replace(/^\.\//, '');
    return blobUrlMap[stripped] || null;
  }

  // src/href 属性
  html = html.replace(/(src|href)=(["'])([^"']+)\2/g, (match, attr, q, val) => {
    if (/^(https?:|blob:|data:|#|javascript:)/i.test(val)) return match;
    const blob = resolve(val);
    return blob ? `${attr}=${q}${blob}${q}` : match;
  });

  // CSS url(...)
  html = html.replace(/url\(\s*(["']?)([^)"']+)\1\s*\)/g, (match, q, val) => {
    if (/^(https?:|blob:|data:)/i.test(val)) return match;
    const blob = resolve(val);
    return blob ? `url(${q}${blob}${q})` : match;
  });

  // <source src="..."> 媒体标签
  html = html.replace(/(<source[^>]+src=)(["'])([^"']+)\2/gi, (match, pre, q, val) => {
    if (/^(https?:|blob:|data:)/i.test(val)) return match;
    const blob = resolve(val);
    return blob ? `${pre}${q}${blob}${q}` : match;
  });

  return html;
}

// ── MIME 类型表 ──────────────────────────────────────────────
function getWebWpMime(filename) {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const map = {
    'js':'application/javascript','mjs':'application/javascript',
    'css':'text/css','html':'text/html','htm':'text/html',
    'json':'application/json',
    'png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg',
    'gif':'image/gif','webp':'image/webp','svg':'image/svg+xml',
    'ico':'image/x-icon','bmp':'image/bmp',
    'mp4':'video/mp4','webm':'video/webm','ogg':'video/ogg',
    'mp3':'audio/mpeg','wav':'audio/wav','flac':'audio/flac',
    'woff':'font/woff','woff2':'font/woff2',
    'ttf':'font/ttf','otf':'font/otf',
    'glsl':'text/plain','vert':'text/plain','frag':'text/plain',
    'txt':'text/plain','xml':'application/xml',
  };
  return map[ext] || 'application/octet-stream';
}

// ── 页面刷新后恢复网页壁纸 ───────────────────────────────────
async function restoreWebWallpaper(key) {
  try {
    const zipBlob = await getVideoFromDB(key);
    if (!zipBlob) return;

    // 竞态保护：await 期间用户可能已切换到其他壁纸，此时应放弃恢复
    if (localStorage.getItem('wallpaperType') !== 'web') return;

    // 将所有 iframe / bgImage / bgVideo 的管理交给 applyWebWallpaper 统一处理
    await applyWebWallpaper(zipBlob);

  } catch (err) {
    console.warn('[G-web] 恢复网页壁纸失败:', err);
    // 失败时回退：确保 bgImage 可见
    const bgImg = document.getElementById('bgImage');
    if (bgImg) { bgImg.src = 'wallpapers/poster.jpg'; bgImg.style.display = 'block'; }
  }
}

// ── 启动时检查是否需要恢复网页壁纸 ─────────────────────────
// ── 启动时检查是否需要恢复网页壁纸 ─────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('wallpaperType') === 'web') {
    // 静音+隐藏视频，防止它在后台发声
    // ⚠️ 不能用 remove()：applyDailyExternalWallpaper / initializeDefaultWallpaperByTime
    //    一进来就 getElementById("bgVideo")，remove 后拿到 null → TypeError → 切换完全失效
    // ⚠️ 不调用 bgVideo.load()：会触发 emptied 事件，可能级联触发其他监听逻辑
    const bgVideo = document.getElementById("bgVideo");
    if (bgVideo) {
        try {
            bgVideo.pause();
            bgVideo.muted = true;
            bgVideo.removeAttribute('src');
            bgVideo.style.display = 'none';
        } catch (e) {
            console.warn('[G-web] 清理 bgVideo 出错（可忽略）:', e);
        }
    }
    // ⚠️ 不在此处隐藏 bgImage：
    // 保留 poster.jpg 作为网页壁纸加载期间的兜底画面，防止白屏。
    // applyWebWallpaper 会在 postMessage 发出后延迟隐藏 bgImage。

    const key = localStorage.getItem('currentWallpaperKey');
    if (key) {
        restoreWebWallpaper(key);
    }
  } else {
    const bgWebFrame = document.getElementById('bgWebFrame');
    if (bgWebFrame) bgWebFrame.style.display = 'none';
  }
});

// ── Alt+W 交互模式切换 ───────────────────────────────────────
(function initWebWpInteractiveToggle() {
  const tip = document.getElementById('webWpInteractiveTip');
  let tipTimer = null;

  function showWpTip(msg) {
    if (!tip) return;
    tip.textContent = msg;
    tip.style.opacity = '1';
    clearTimeout(tipTimer);
    tipTimer = setTimeout(() => { tip.style.opacity = '0'; }, 2200);
  }
})();
// ... (1.js 文件其余内容) ...

// ============================================================
// 新增：监听来自沙盒 iframe 的消息，以触发父窗口的右键菜单
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('message', function(event) {
    // 确保消息来自我们的 iframe，并且消息类型是我们定义的 WEB_WP_CONTEXT_MENU
    if (event.data && event.data.type === 'WEB_WP_CONTEXT_MENU') {
      const { clientX, clientY } = event.data;

      // 创建一个合成的 contextmenu 事件
      const syntheticEvent = new MouseEvent('contextmenu', {
        bubbles: true,       // 允许事件冒泡
        cancelable: true,    // 允许阻止默认行为
        view: window,
        button: 2,           // 右键 (0:左, 1:中, 2:右)
        buttons: 2,          // 同样表示右键
        clientX: clientX,    // 鼠标 X 坐标
        clientY: clientY     // 鼠标 Y 坐标
      });

      // 派发事件到 document，这将触发 4.js 中已有的 document.addEventListener('contextmenu', ...) 监听器
      document.dispatchEvent(syntheticEvent);
    }
    else if (event.data && event.data.type === 'WEB_WP_CLICK') {
      // 在父窗口模拟一次左键点击，触发全局的点击关闭菜单逻辑
      const syntheticClick = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0,
        buttons: 1
      });
      document.body.dispatchEvent(syntheticClick);
    }
    else if (event.data && event.data.type === 'SANDBOX_READY') {
        if (window.pendingWebWallpaper) {
            const bgWebFrame = document.getElementById("bgWebFrame");
            if (bgWebFrame && bgWebFrame.contentWindow) {
                console.log('[父窗口] 收到沙盒就绪信号，开始发送壁纸数据！');
                bgWebFrame.contentWindow.postMessage({
                    type: 'RENDER_WALLPAPER',
                    html: window.pendingWebWallpaper.html,
                    css: window.pendingWebWallpaper.css,
                    js: window.pendingWebWallpaper.js
                }, '*');
            }
        }
    }
    // ─── 握手接收端：sandbox 壁纸渲染上屏后通知父窗口，立刻隐藏兜底 bgImage ───
    else if (event.data && event.data.type === 'WP_RENDERED') {
      if (window._webWpFallbackTimer) {
        clearTimeout(window._webWpFallbackTimer);
        window._webWpFallbackTimer = null;
      }
      const bgImg = document.getElementById('bgImage');
      if (bgImg && localStorage.getItem('wallpaperType') === 'web') {
        bgImg.style.display = 'none';
      }
    }
  });
  });
// ==========================================
// 修复：当加载系统壁纸/动态壁纸时，强制干掉网页壁纸的遮挡
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const bgImage = document.getElementById('bgImage');
    const bgVideo = document.getElementById('bgVideo');

    function clearWebWallpaper() {
        const bgWebFrame = document.getElementById('bgWebFrame');
        if (bgWebFrame && bgWebFrame.style.display !== 'none') {
            bgWebFrame.style.display = 'none';
            bgWebFrame.src = 'about:blank'; // 彻底清空并停止后台运行
        }
    }

    // 当普通图片/一天一换壁纸图片加载完成时，立刻触发清理
    if (bgImage) {
        bgImage.addEventListener('load', clearWebWallpaper);
    }
    // 当动态视频壁纸加载完成出画面时，立刻触发清理
    if (bgVideo) {
        bgVideo.addEventListener('loadeddata', clearWebWallpaper);
    }
});