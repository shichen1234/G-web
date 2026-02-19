// =============================================
// 🚀 优化版 background.js - 修复豆包集成
// =============================================

let clearTimer = null;
let lastUpdateTime = 0;
const UPDATE_THROTTLE = 1000;

// ====== 媒体脚本注入 ======
function injectMediaScripts(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['content-media.js']
  }).catch(() => {});
}

// ====== 标签页监听 ======
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  
  if (tab.url.startsWith('chrome://') || 
      tab.url.startsWith('edge://') || 
      tab.url.startsWith('about:') ||
      tab.url.startsWith('chrome-extension://')) {
    return;
  }

  const mediaHosts = [
    'y.qq.com', 'music.163.com', 'kugou.com',
    'youtube.com', 'bilibili.com', 'douyin.com', 'spotify.com'
  ];
  
  if (mediaHosts.some(host => tab.url.includes(host))) {
    injectMediaScripts(tabId);
  }
});

// ====== 消息监听 ======
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. 媒体更新
  if (message.type === 'mediaUpdate') {
    const now = Date.now();
    if (now - lastUpdateTime < UPDATE_THROTTLE) return;
    lastUpdateTime = now;
    
    if (clearTimer) clearTimeout(clearTimer);
    
    // 转发更新消息到主界面
    chrome.runtime.sendMessage({
      type: 'mediaSessionUpdate',
      metadata: message.metadata,
      playbackState: message.playbackState
    }).catch(() => {});

    // [💡 已修复] 关键逻辑：只有当消息来源不是内置播放器时，才设置自动清除的定时器
    if (message.source !== 'internal_player') {
        clearTimer = setTimeout(() => {
          chrome.runtime.sendMessage({ type: 'mediaClear' }).catch(() => {});
        }, 2500);
    }
    return;
  }

  // 2. 百度联想
  if (message.type === "baiduSuggest") {
    fetch(`https://suggestion.baidu.com/su?wd=${encodeURIComponent(message.q)}&json=1&p=3`)
      .then(r => r.arrayBuffer())
      .then(buf => {
        const decoder = new TextDecoder("gbk");
        const text = decoder.decode(buf);
        const match = text.match(/window\.baidu\.sug\((.*)\)/);
        sendResponse(match ? JSON.parse(match[1]).s : []);
      })
      .catch(() => sendResponse([]));
    return true;
  }
  if (message.type === 'mediaClear') {
    // 将 'mediaClear' 消息转发给当前活动的标签页
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0 && tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'mediaClear' });
      }
    });
    return; // 结束处理
  }
  // 3. 内存清理请求
  if (message.action === 'requestCleanup') {
    sendResponse({ status: 'acknowledged' });
    return true;
  }

  // 4. 壁纸缓存
  if (message.action === 'getDailyWallpaper') {
    cacheDailyWallpaper()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // 5. 🔧 修复：豆包AI查询处理（改进版）
  if (message.action === "openDoubao") {

    // 验证查询内容
    if (!message.query || typeof message.query !== 'string' || message.query.trim() === '') {
      console.error('[G-web Background] 无效的查询内容');
      sendResponse({ success: false, error: '查询内容为空' });
      return true;
    }

    const queryContent = message.query.trim();

    // 步骤1: 存储查询内容
    chrome.storage.local.set({ 'pending_query': queryContent }, () => {
      if (chrome.runtime.lastError) {
        console.error('[G-web Background] 存储失败:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
        return;
      }


      // 步骤2: 检查是否已有豆包标签页打开
      chrome.tabs.query({ url: "https://www.doubao.com/*" }, (tabs) => {
        if (tabs && tabs.length > 0) {
          // 如果已有标签页，激活它并刷新
          const existingTab = tabs[0];
          
          chrome.tabs.update(existingTab.id, { active: true }, () => {
            // 刷新页面以触发注入脚本
            chrome.tabs.reload(existingTab.id);
          });
        } else {
          // 没有标签页，创建新的
          chrome.tabs.create({ 
            url: "https://www.doubao.com/chat/",
            active: true 
          });
        }

        sendResponse({ success: true });
      });
    });

    return true; // 异步响应
  }
});

// ====== 扩展卸载清理 ======
chrome.runtime.onSuspend.addListener(() => {
  if (clearTimer) clearTimeout(clearTimer);
});

// =============================================
// 🖼️ 壁纸缓存逻辑（保持不变）
// =============================================

const DAILY_WALLPAPER_KEY = 'daily_external_wallpaper';
const MAX_WALLPAPER_CACHE = 3;
let dbConnection = null;
let isCachingInProgress = false;

async function getDatabase() {
  if (dbConnection && dbConnection.readyState === 'done') {
    return dbConnection;
  }
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("WallpaperDB", 3);
    
    request.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("Videos")) {
        db.createObjectStore("Videos", { keyPath: "id" });
      }
    };
    
    request.onsuccess = e => {
      dbConnection = e.target.result;
      resolve(dbConnection);
    };
    
    request.onerror = e => {
      console.error('[G-web] 数据库打开失败:', e.target.error);
      reject(e.target.error);
    };
  });
}

async function saveToIndexedDB(blob, key) {
  try {
    const db = await getDatabase();
    const arrayBuffer = await blob.arrayBuffer();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("Videos", "readwrite");
      const store = tx.objectStore("Videos");
      
      const request = store.put({ 
        id: key, 
        data: arrayBuffer,
        mimeType: blob.type,
        size: blob.size,
        timestamp: Date.now()
      });
      
      tx.oncomplete = () => {
        resolve();
      };
      
      tx.onerror = () => {
        console.error('[G-web] 保存事务失败:', tx.error);
        reject(tx.error);
      };
    });
  } catch (error) {
    console.error('[G-web] 保存到IndexedDB失败:', error);
    throw error;
  }
}

async function getVideoFromDB(key) {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("Videos", "readonly");
      const request = tx.objectStore("Videos").get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.data) {
          const blob = new Blob([result.data], { type: result.mimeType || 'image/jpeg' });
          resolve(blob);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        console.error('[G-web] 读取失败:', request.error);
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[G-web] 读取失败:', error);
    return null;
  }
}

async function deleteFromIndexedDB(key) {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("Videos", "readwrite");
      const request = tx.objectStore("Videos").delete(key);
      
      tx.oncomplete = () => {
        resolve();
      };
      
      tx.onerror = () => {
        console.error('[G-web] 删除失败:', tx.error);
        reject(tx.error);
      };
    });
  } catch (error) {
    throw error;
  }
}

async function cleanOldWallpapers() {
  try {
    const db = await getDatabase();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction("Videos", "readwrite");
      const store = tx.objectStore("Videos");
      const getAllKeysRequest = store.getAllKeys();
      
      getAllKeysRequest.onsuccess = () => {
        const allKeys = getAllKeysRequest.result;
        let deletedCount = 0;
        
        const keysToDelete = allKeys.filter(key => 
          key !== DAILY_WALLPAPER_KEY && 
          !key.startsWith('daily_external_wallpaper_pending')
        );
        
        if (keysToDelete.length > MAX_WALLPAPER_CACHE - 1) {
          const excess = keysToDelete.slice(0, keysToDelete.length - (MAX_WALLPAPER_CACHE - 1));
          excess.forEach(key => {
            store.delete(key);
            deletedCount++;
          });
        }
      };
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[G-web] 清理失败:', error);
  }
}

async function cacheDailyWallpaper() {
  const dailyApiUrl = "https://bing.img.run/1920x1080.php";
  const PENDING_KEY = 'daily_external_wallpaper_pending';

  let imageBlob = null;
  
  try {
    const response = await fetch(dailyApiUrl);
    if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
    
    imageBlob = await response.blob();
    if (!imageBlob.type.startsWith('image/')) {
      throw new Error(`获取到的文件不是图片: ${imageBlob.type}`);
    }

    await saveToIndexedDB(imageBlob, PENDING_KEY);

    const tempBlob = await getVideoFromDB(PENDING_KEY);
    if (!tempBlob) throw new Error("无法从临时仓库中读取新壁纸");

    await saveToIndexedDB(tempBlob, DAILY_WALLPAPER_KEY);

    await deleteFromIndexedDB(PENDING_KEY);

    const today = new Date().toISOString().slice(0, 10);
    await chrome.storage.local.set({ 'dailyWallpaperCacheDate': today });
    
    await cleanOldWallpapers();

  } catch (error) {
    await deleteFromIndexedDB(PENDING_KEY).catch(()=>{});
  } finally {
    imageBlob = null;
  }
}

async function checkAndCacheWallpaper() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const result = await chrome.storage.local.get('dailyWallpaperCacheDate');
    
    if (result.dailyWallpaperCacheDate !== today) {
      await cacheDailyWallpaper();
    } else {
      console.log('[G-web] 今日壁纸已缓存');
    }
  } catch(e) {
    console.error("[G-web] 检查壁纸缓存出错:", e);
  }
}

// ====== 触发器设置 ======
chrome.runtime.onInstalled.addListener(() => {
  cacheDailyWallpaper();
});

chrome.runtime.onStartup.addListener(() => {
  checkAndCacheWallpaper();
});

chrome.alarms.create('dailyWallpaperAlarm', {
  when: new Date(new Date().setHours(28, 0, 0, 0)).getTime(),
  periodInMinutes: 24 * 60
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === 'dailyWallpaperAlarm') {
    cacheDailyWallpaper();
  }
  
  if (alarm.name === 'memoryCheckAlarm') {
    chrome.runtime.sendMessage({ 
      type: 'memoryCleanupSuggestion',
      timestamp: Date.now()
    }).catch(() => {});
  }
});

chrome.alarms.create('memoryCheckAlarm', {
  delayInMinutes: 30,
  periodInMinutes: 30
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  chrome.tabs.query({ url: chrome.runtime.getURL('index.html') }, (tabs) => {
    tabs.forEach(tab => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        chrome.tabs.sendMessage(tab.id, { action: "osFocusControl", state: "pause" }).catch(()=>{});
      } else {
        chrome.tabs.sendMessage(tab.id, { action: "osFocusControl", state: "play" }).catch(()=>{});
      }
    });
  });
});
