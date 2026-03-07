document.addEventListener('DOMContentLoaded', () => {

  const DUAL_COLUMN_LYRIC_SONG_IDS = new Set([
    12, 21, 22, 23, 24, 26, 31, 35, 36, 37, 38, 40, 43, 44, 45, 48,50,54,55,56,58,62
  ]);

  // music-player.js
  // ... (DUAL_COLUMN_LYRIC_SONG_IDS 定义之后) ...

  let isZenModeForPlayer = false; // 新增一个全局变量，记录禅模式状态

  // 新增一个全局函数，供外部调用
  window.setZenModeForPlayer = function(isActive) {
    if (isZenModeForPlayer === isActive) return; // 状态未改变，则不执行任何操作

    isZenModeForPlayer = isActive;

    // 检查当前是否有歌曲在播放
    if (currentSongIndex > -1) {
      // 获取当前歌曲对象
      const currentSong = songDatabase[currentSongIndex];

      // 只要这首歌有翻译文件名，就尝试重新加载双语歌词
      // 或者您可以保留原来的 isDualColumnSong 判断
      const isDualColumnSong = DUAL_COLUMN_LYRIC_SONG_IDS.has(currentSong.id);

      if (isDualColumnSong || currentSong.transLrcFilename) {

        // 【核心修改】使用 Promise.all 同时获取原版歌词和翻译歌词
        Promise.all([
          // 1. 获取原版歌词 (从 STORE_LYRICS)
          new Promise((resolve) => {
             dbOp(STORE_LYRICS, "readonly", store => store.get(currentSong.lrcFilename))
             .then(record => resolve(record ? record.content : null))
             .catch(() => resolve(null));
          }),
          // 2. 获取翻译歌词 (也从 STORE_LYRICS，但是用翻译文件名)
          new Promise((resolve) => {
             // 只有当存在翻译文件名时才去获取
             if (currentSong.transLrcFilename) {
                dbOp(STORE_LYRICS, "readonly", store => store.get(currentSong.transLrcFilename))
                .then(record => resolve(record ? record.content : null))
                .catch(() => resolve(null));
             } else {
                resolve(null);
             }
          })
        ]).then(([originalLyrics, translatedLyrics]) => {
            if (originalLyrics) {
              // 【关键】将原版和翻译同时传给解析函数
              // 这样 parseLyrics 就会更新全局的 currentTransLyrics
              // 禅模式组件读取 currentTransLyrics 时就有数据了
              parseLyrics(originalLyrics, translatedLyrics);
            }
        }).catch(err => {
            console.error("重载歌词失败:", err);
        });
      }
    }
  };

  // ================= 配置区 =================
  const GITHUB_BASE = 'https://ghproxy.net/https://raw.githubusercontent.com/shichen1234/music/main/';
  const PROXY_BASE = ''; 
  const COVER_IMAGE = 'logo/icon.gif';
  
  // 🎵 歌曲列表数据库
  // 您说有50首，这里为了演示写了3首，您可以按照格式补全到50首
  // 格式：文件名必须是 "序号--歌名--作者.mp3"
  const songDatabase = [
    { id: 1, filename: "1--晴天--周杰伦.mp3" },
    { id: 2, filename: "2--起风了--买辣椒也用券.mp3" },
    { id: 3, filename: "3--烟花易冷--周杰伦.mp3" },
    { id: 4, filename: "4--孤勇者--陈奕迅.mp3" },
    { id: 5, filename: "5--平凡之路--朴树.mp3" },
    { id: 6, filename: "6--夜空中最亮的星--逃跑计划.mp3" },
    { id: 7, filename: "7--可惜没如果--林俊杰.mp3" },
    { id: 8, filename: "8--泡沫--G.E.M.邓紫棋.mp3" },
    { id: 9, filename: "9--演员--薛之谦.mp3" },
    { id: 10, filename: "10--突然好想你--五月天.mp3" },
    { id: 11, filename: "11--大鱼--周深.mp3" },
    { id: 12, filename: "12--モニタリング (Best Friend Remix)--DECO27,初音ミク.mp3" },
    { id: 13, filename: "13--成都--赵雷.mp3" },
    { id: 14, filename: "14--海阔天空--Beyond.mp3" },
    { id: 15, filename: "15--小幸运--田馥甄.mp3" },
    { id: 16, filename: "16--时光洪流--程响.mp3" },
    { id: 17, filename: "17--缘分一道桥--王力宏、谭维维.mp3" },
    { id: 18, filename: "18--不将就--李荣浩.mp3" },
    { id: 19, filename: "19--珊瑚海--周杰伦、Lara梁心颐.mp3" },
    { id: 20, filename: "20--雅俗共赏--许嵩.mp3" },
    { id: 21, filename: "21--Shape of You--Ed Sheeran.mp3" },
    { id: 22, filename: "22--Love Story--Taylor Swift.mp3" },
    { id: 23, filename: "23--Maps--Maroon 5.mp3" },
    { id: 24, filename: "24--可爱颂--Hari[韩国].mp3" },
    { id: 25, filename: "25--最初的梦想--范玮琪.mp3" },
    { id: 26, filename: "26--HeartBeats--Amy Diamond.mp3" },
    { id: 27, filename: "27--凤凰花开的路口--林志炫.mp3" },
    { id: 28, filename: "28--像小时候一样--郁可唯.mp3" },
    { id: 29, filename: "29--平凡的一天--毛不易.mp3" },
    { id: 30, filename: "30--如愿--王菲.mp3" },
    { id: 31, filename: "31--pretender--Official髭男dism.mp3" },
    { id: 32, filename: "32--sheluvme--Tai Verdes.mp3" },
    { id: 33, filename: "33--我们的明天--鹿晗.mp3" },
    { id: 34, filename: "34--从你的全世界路过--牛奶咖啡.mp3" },
    { id: 35, filename: "35--Virtual Insanity--Jamiroquai.mp3" },
    { id: 36, filename: "36--Lemon--米津玄师.mp3" },
    { id: 37, filename: "37--爱にできることはまだあるかい--RADWIMPS.mp3" },
    { id: 38, filename: "38--あの夢をなぞって--YOASOBI.mp3" },
    { id: 39, filename: "39--如果可以--韦礼安.mp3" },
    { id: 40, filename: "40--SAKURA--生物股长.mp3" },
    { id: 41, filename: "41--冬眠--司南.mp3" },
    { id: 42, filename: "42--老男孩--筷子兄弟.mp3" },
    { id: 43, filename: "43--Free Loop--Daniel powter.mp3" },
    { id: 44, filename: "44--Psyphone--Maroon 5.mp3" },
    { id: 45, filename: "45--On My Own--Ashes Remain.mp3" },
    { id: 46, filename: "46--We Are the World--U.S.A. For Africa.mp3" },
    { id: 47, filename: "47--紫荆花盛开--梁咏琪、李荣浩.mp3" },
    { id: 48, filename: "48--夢と葉桜--初音ミク&青木月光.mp3" },
    { id: 49, filename: "49--告白の夜--Ayasa绚沙.mp3" },
    { id: 50, filename: "50--カタオモイ(单相思)--Aimer.mp3" },
    { id: 51, filename: "51--我会等--承桓.mp3" },
    { id: 52, filename: "52--那些年--胡夏.mp3" },
    { id: 53, filename: "53--忆夏思乡--MoreanP.mp3" },
    { id: 54, filename: "54--僕らの手には何もないけど、--RAM WIRE.mp3" },
    { id: 55, filename: "55--動く、動く--久保ユリカ&水瀬いのり.mp3" },
    { id: 56, filename: "56--Immortals--Fall Out Boy.mp3" },
    { id: 57, filename: "57--下雨天--南拳妈妈.mp3" },
    { id: 58, filename: "58--TICKING AWAY (VCT ANTHEM 2023) (流光似箭)--Grabbitz&无畏契约&bbno$.mp3" },
    { id: 59, filename: "59--告白气球--周杰伦.mp3" },
    { id: 60, filename: "60--青花瓷--周杰伦.mp3" },
    { id: 61, filename: "61--关键词--林俊杰.mp3" },
    { id: 62, filename: "62--Thank you for dears.--GET IN THE RING.mp3" },
  ];

songDatabase.forEach(song => {
    const parts = song.filename.replace('.mp3', '').split('--');
    if (parts.length >= 3) {
      song.title = parts[1];
      song.artist = parts[2];
    } else {
      song.title = song.filename;
      song.artist = '未知';
    }
    // 自动生成 lrc 文件名
    song.lrcFilename = song.filename.replace('.mp3', '.lrc');

    // 只要是在 ID 列表里的，都生成翻译文件名
    if (DUAL_COLUMN_LYRIC_SONG_IDS.has(song.id)) {
        // 格式：序号--歌名--作者--翻译.lrc (或者是 .txt，根据您之前说的改了后缀)
        // 您的代码里之前是 .lrc，如果之前手动改成了 txt，这里要对应。
        // 根据您最早上传的文件，代码里写的是 .lrc，但文件是 .txt。
        // 不过 downloadSong 函数也是按 .lrc 下载的，这里保持代码一致性 .lrc
        song.transLrcFilename = `${song.id}--${song.title}--${song.artist}--翻译.lrc`;
    }
  });

  // === 变量 ===
  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  let currentSongIndex = -1;
  let isPlaying = false;
  let currentLyrics = [];
  let currentTransLyrics = []; 

  window.GwebMusicPlayer = {
    audio: audio,
    getLyrics: () => currentLyrics,
    getTransLyrics: () => currentTransLyrics
};

  window.isMusicPlayerPlaying = false;
  window.currentLyricLine = "";
  
  // ✅ 新增：用于储存播放状态的键
  const LAST_SONG_INDEX_KEY = 'music_lastSongIndex';
  const LAST_SONG_TIME_KEY = 'music_lastSongTime';
  const LAST_SONG_PLAYING_KEY = 'music_lastSongPlaying';

  const ui = {
    vinyl: document.getElementById('localMusicVinyl'),
    title: document.getElementById('localMusicTitle'),
    artist: document.getElementById('localMusicArtist'),
    playBtn: document.getElementById('playPauseBtn'),
    prevBtn: document.getElementById('prevSongBtn'),
    nextBtn: document.getElementById('nextSongBtn'),
    progress: document.getElementById('musicProgressBar'),
    currTime: document.getElementById('currentTime'),
    totalTime: document.getElementById('totalTime'),
    listBtn: document.getElementById('togglePlaylistBtn'),
    listPanel: document.getElementById('musicPlaylist'),
    listUl: document.getElementById('songListUl'),
    lyricWrapper: document.getElementById('lyricWrapper'),pinPanelToggle: null
  };

  // === IndexedDB ===
  const DB_NAME = "MusicStore";
  const DB_VERSION = 2;
  const STORE_SONGS = "songs";
  const STORE_LYRICS = "lyrics";

  function openMusicDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_SONGS)) {
          db.createObjectStore(STORE_SONGS, { keyPath: "filename" });
        }
        if (!db.objectStoreNames.contains(STORE_LYRICS)) {
          db.createObjectStore(STORE_LYRICS, { keyPath: "filename" });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e);
    });
  }

  async function dbOp(storeName, mode, callback) {
    const db = await openMusicDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const req = callback(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => resolve(req.result);
    });
  }

// music-player.js (找到并替换)
  function stopSong() {
    if (currentSongIndex === -1) return; // 如果没在播放，就什么也不做
    
    // 1. 暂停播放
    audio.pause(); 
    // setIsPlaying(false) 会在这里被 audio.onpause 事件自动调用
    
    // 2. 将播放头重置到开头
    audio.currentTime = 0;
    
    // 3. 清理主页面的音乐组件 (通过发送 mediaClear 消息)
    chrome.runtime.sendMessage({ type: 'mediaClear', source: 'internal_player' }).catch(() => {});
    
    // 4. ✅ 核心：清除 localStorage 中的播放记录，阻止刷新后自动播放
    localStorage.removeItem(LAST_SONG_INDEX_KEY);
    localStorage.removeItem(LAST_SONG_TIME_KEY);
    localStorage.removeItem(LAST_SONG_PLAYING_KEY);
    
  }

function broadcastMediaUpdateToMainWidget() {
    // 1. 如果没有歌曲被选中，或者当前是暂停状态，则发送“清除”消息，让主页组件消失
    if (currentSongIndex === -1 || !isPlaying) {
      chrome.runtime.sendMessage({ type: 'mediaClear', source: 'internal_player' }).catch(() => {});
      return;
    }
  
    // 2. 只有在正在播放时，才发送“更新”消息
    const song = songDatabase[currentSongIndex];
    const metadata = {
        title: song.title,
        artist: song.artist,
        album: '', 
        artwork: [{ 
            src: chrome.runtime.getURL(COVER_IMAGE), 
            sizes: '512x512', 
            type: 'image/png' 
        }]
    };
    
    chrome.runtime.sendMessage({
        type: 'mediaUpdate',
        source: 'internal_player',
        metadata: metadata,
        playbackState: 'playing' // 既然能到这一步，状态必然是 playing
    }).catch(() => {});
}

  // 1. 渲染列表
  async function renderPlaylist() {
    const scrollPos = ui.listPanel.scrollTop;
    ui.listUl.innerHTML = '';
    for (let i = 0; i < songDatabase.length; i++) {
      const song = songDatabase[i];
      const isDownloaded = await dbOp(STORE_SONGS, "readonly", store => store.count(song.filename)) > 0;
      
      const li = document.createElement('li');
      li.className = `song-item ${i === currentSongIndex ? 'active' : ''}`;
li.innerHTML = `
    <div style="flex:1;">${song.id}. ${song.title} - ${song.artist}</div>
    <div class="song-action-wrapper">
        <span class="download-progress"></span>
        <span class="song-status-icon" title="${isDownloaded ? '删除' : '下载'}">
          ${isDownloaded ? '🗑️' : '⬇️'}
        </span>
    </div>
  `;

      
      li.addEventListener('click', (e) => {
        if (e.target.classList.contains('song-status-icon')) return;
        if (isDownloaded) playSong(i);
        else downloadSong(song, i);
      });

      li.querySelector('.song-status-icon').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (isDownloaded) {
          if (confirm(`删除 "${song.title}" (含歌词)?`)) {
            await dbOp(STORE_SONGS, "readwrite", store => store.delete(song.filename));
            await dbOp(STORE_LYRICS, "readwrite", store => store.delete(song.lrcFilename));
                        if (song.transLrcFilename) {
                await dbOp(STORE_LYRICS, "readwrite", store => store.delete(song.transLrcFilename));
            }
            await renderPlaylist();
          }
        } else {
          downloadSong(song, i);
        }
      });
      ui.listUl.appendChild(li);
    }
    ui.listPanel.scrollTop = scrollPos;
  }

async function downloadSong(song, index) {
    const li = ui.listUl.children[index];
    const actionWrapper = li.querySelector('.song-action-wrapper');
    const statusIcon = actionWrapper.querySelector('.song-status-icon');
    const progressSpan = actionWrapper.querySelector('.download-progress');

    // 如果不是下载图标(说明已下载或正在下载)，则不执行
    if (statusIcon.textContent.trim() !== '⬇️') return;

    // 更新UI，开始下载状态
    statusIcon.style.display = 'none'; // 隐藏下载图标
    progressSpan.style.display = 'inline-block'; // 显示进度百分比的span
    progressSpan.textContent = '0%'; // 初始为0%

    try {
        // 1. 下载 MP3 并跟踪进度
        const mp3Url = PROXY_BASE + GITHUB_BASE + encodeURIComponent(song.filename);
        const mp3Resp = await fetch(mp3Url);
        if (!mp3Resp.ok) throw new Error(`MP3 download failed: ${mp3Resp.status}`);

        const contentLength = +mp3Resp.headers.get('Content-Length'); // 获取文件总大小
        const reader = mp3Resp.body.getReader(); // 创建读取器

        let receivedLength = 0; // 已接收大小
        let chunks = []; // 存储下载的数据块
        while (true) {
            const { done, value } = await reader.read(); // 读取一块数据
            if (done) {
                break;
            }
            chunks.push(value);
            receivedLength += value.length;

            // 如果有文件总大小，就计算并显示百分比
            if (contentLength) {
                const progress = Math.round((receivedLength / contentLength) * 100);
                progressSpan.textContent = `${progress}%`;
            } else {
                progressSpan.textContent = '...'; // 否则显示省略号
            }
        }

        const mp3Blob = new Blob(chunks); // 将所有数据块合并成一个Blob

        // 存入 MP3
        await dbOp(STORE_SONGS, "readwrite", store =>
            store.put({ filename: song.filename, blob: mp3Blob, timestamp: Date.now() })
        );

        // (这部分下载歌词的代码与原版逻辑相同，保持不变)
        // 2. 下载原版 LRC
        try {
            const lrcUrl = PROXY_BASE + GITHUB_BASE + encodeURIComponent(song.lrcFilename);
            const lrcResp = await fetch(lrcUrl);
            if (lrcResp.ok) {
                const lrcText = await lrcResp.text();
                await dbOp(STORE_LYRICS, "readwrite", store =>
                    store.put({ filename: song.lrcFilename, content: lrcText })
                );
            }
        } catch (e) { console.warn('LRC download failed:', e); }

        // 3. 下载翻译版 LRC (如果存在)
        if (song.transLrcFilename) {
            try {
                const transUrl = PROXY_BASE + GITHUB_BASE + encodeURIComponent(song.transLrcFilename);
                const transResp = await fetch(transUrl);
                if (transResp.ok) {
                    const transText = await transResp.text();
                    await dbOp(STORE_LYRICS, "readwrite", store =>
                        store.put({ filename: song.transLrcFilename, content: transText })
                    );
                }
            } catch (e) { console.warn('Translation LRC download failed:', e); }
        }
        // --- 歌词下载部分结束 ---

        if (typeof showBubble === 'function') showBubble(`"${song.title}" 下载完毕！`);
        
        // 重新渲染整个列表，UI会自动恢复正常（下载图标变为删除图标）
        await renderPlaylist();

    } catch (error) {
        console.error('Download failed:', error);
        await renderPlaylist();
    }
}


  // 3. 播放
  async function playSong(index) {
    const song = songDatabase[index];
    const record = await dbOp(STORE_SONGS, "readonly", store => store.get(song.filename));
    
    if (!record) {
      if (typeof showBubble === 'function') showBubble('请先下载！');
      return;
    }

    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(record.blob);
    
    currentSongIndex = index;
    ui.title.textContent = song.title;
    ui.artist.textContent = song.artist;

    // ✅ 读取原版歌词
    const lrcRecord = await dbOp(STORE_LYRICS, "readonly", store => store.get(song.lrcFilename));
    
    // ✅ 读取翻译歌词 (如果有)
    let transLrcRecord = null;
    if (song.transLrcFilename) {
        transLrcRecord = await dbOp(STORE_LYRICS, "readonly", store => store.get(song.transLrcFilename));
    }

    // 调用解析
    if (lrcRecord && lrcRecord.content) {
      parseLyrics(lrcRecord.content, transLrcRecord ? transLrcRecord.content : null);
    } else {
      // 无歌词情况
      ui.lyricWrapper.innerHTML = '<p class="lyric-line current">纯音乐 / 无歌词</p>';
      currentLyrics = [];
      currentTransLyrics = []; // 清空翻译
      window.currentLyricLine = "";
    }
    
    audio.play().then(() => {
      setIsPlaying(true);
      renderPlaylist();
      updateMediaSession(song);
      broadcastMediaUpdateToMainWidget();
    }).catch(console.error);
  }

  // ✅ 新增：用于恢复会话的加载函数（不自动播放）
  async function loadSongForResume(index, startTime = 0) {
    if (index < 0 || index >= songDatabase.length) return false;
    const song = songDatabase[index];
    const record = await dbOp(STORE_SONGS, "readonly", store => store.get(song.filename));

    if (!record) {
      console.warn('Cannot resume: Last played song is not downloaded.');
      return false;
    }

    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(record.blob);
    
    audio.onloadedmetadata = () => {
        audio.currentTime = startTime;
        ui.progress.value = audio.currentTime;
        if (!isNaN(audio.duration)) {
            ui.totalTime.textContent = formatTime(audio.duration);
        }
        ui.currTime.textContent = formatTime(startTime);
        audio.onloadedmetadata = null; 
    };
    
    currentSongIndex = index;
    ui.title.textContent = song.title;
    ui.artist.textContent = song.artist;

    const lrcRecord = await dbOp(STORE_LYRICS, "readonly", store => store.get(song.lrcFilename));
    // 读取翻译用于恢复状态
    let transLrcRecord = null;
    if (song.transLrcFilename) {
        transLrcRecord = await dbOp(STORE_LYRICS, "readonly", store => store.get(song.transLrcFilename));
    }

    if (lrcRecord && lrcRecord.content) {
      parseLyrics(lrcRecord.content, transLrcRecord ? transLrcRecord.content : null);
    } else {
      ui.lyricWrapper.innerHTML = '<p class="lyric-line current">纯音乐 / 无歌词</p>';
      currentLyrics = [];
      window.currentLyricLine = "";
    }
    await renderPlaylist();
    updateMediaSession(song);
    return true;
  }

  // --- 辅助：将 LRC 文本解析为对象数组 ---
  function parseLrcToObj(lrcText) {
      if (!lrcText) return [];
      const lines = lrcText.split('\n');
      // 匹配时间标签 [mm:ss.xx] 或 [mm:ss.xxx]
      const timeExp = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/;
      const result = [];
      
      lines.forEach(line => {
          const match = timeExp.exec(line);
          if (match) {
              const min = parseInt(match[1]);
              const sec = parseInt(match[2]);
              // 处理毫秒，有的lrc是2位，有的是3位
              const ms = match[3] ? parseInt(match[3].padEnd(3, '0')) : 0;
              const time = min * 60 + sec + ms / 1000;
              const text = line.replace(timeExp, '').trim();
              
              // 只有当有文本内容时才保留
              if (text) result.push({ time, text });
          }
      });
      return result;
  }

  // --- 4. 核心解析逻辑 (修改版) ---
  // 参数1: 原版歌词文本
  // 参数2: 翻译版歌词文本 (可选，如果没有则为 null)
  function parseLyrics(lrcText, transLrcText = null) {
    // 1. 解析并保存到全局变量
    // currentLyrics 用于播放器内部滚动 + 禅模式原版显示
    // currentTransLyrics 仅用于禅模式翻译显示
    currentLyrics = parseLrcToObj(lrcText);
    currentTransLyrics = transLrcText ? parseLrcToObj(transLrcText) : [];

    // 2. 清空播放器内部 UI 容器
    ui.lyricWrapper.innerHTML = '';
    
    // 3. 处理无歌词情况
    if (currentLyrics.length === 0) {
      ui.lyricWrapper.innerHTML = '<p class="lyric-line current">纯音乐 / 无歌词</p>';
      window.currentLyricLine = "";
      return;
    }

    // 4. 渲染播放器内部歌词 (始终保持单列原版，整洁美观)
    // 之前复杂的“双列模式”逻辑已移除，双语显示现在由 main.js 的禅模式组件全权负责
    ui.lyricWrapper.classList.remove('dual-column'); 
    currentLyrics.forEach((line, idx) => {
        const p = document.createElement('p');
        p.className = 'lyric-line';
        p.textContent = line.text;
        p.dataset.index = idx; // 用于 syncLyrics 函数进行滚动定位
        ui.lyricWrapper.appendChild(p);
    });
    
    // 重置滚动位置
    ui.lyricWrapper.style.transform = 'translateY(0px)';
  }

  function syncLyrics() {
    if (!currentLyrics.length) {
      window.currentLyricLine = "";
      return;
    }
    const currentTime = audio.currentTime;
    let activeIndex = currentLyrics.findIndex(line => line.time > currentTime) - 1;

    if (activeIndex === -2) activeIndex = currentLyrics.length - 1;
    if (activeIndex < 0) activeIndex = 0;

    // 如果是双列模式，高亮索引必须是偶数
    if (ui.lyricWrapper.classList.contains('dual-column')) {
      if (activeIndex % 2 !== 0) {
        activeIndex -= 1;
      }
    }

    const activeElement = ui.lyricWrapper.querySelector(`[data-index="${activeIndex}"]`);
    if (activeElement && !activeElement.classList.contains('current')) {
      ui.lyricWrapper.querySelector('.current')?.classList.remove('current');
      activeElement.classList.add('current');
      
      // 更新全局歌词行（用于其他地方显示）
      window.currentLyricLine = currentLyrics[activeIndex].text;
      
      // 滚动到视图
      const offset = activeElement.offsetTop;
      ui.lyricWrapper.style.transform = `translateY(-${offset - 40}px)`; // 40是您之前的滚动中心值
    }
    // 如果禅模式开启，顺便更新禅模式歌词，这样就和正常模式一样丝滑了
if (window.isZenMode || window.isAutoZenActive) {
    if (typeof window.manageZenLyricsWidget === 'function') {
        window.manageZenLyricsWidget();
    }
}

  }

  // === 事件监听 ===
  audio.addEventListener('timeupdate', () => {
    if (isNaN(audio.duration)) return;
    ui.progress.value = audio.currentTime;
    ui.progress.max = audio.duration;
    ui.currTime.textContent = formatTime(audio.currentTime);
    ui.totalTime.textContent = formatTime(audio.duration);
    syncLyrics();
  });
  
  function setIsPlaying(state) {
    isPlaying = state;
    window.isMusicPlayerPlaying = state;
    ui.playBtn.textContent = state ? '⏸️' : '▶️';
    state ? ui.vinyl.classList.add('rotating') : ui.vinyl.classList.remove('rotating');
    if (state) {
      broadcastMediaUpdateToMainWidget();
    }
  }
  
  function formatTime(s) {
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${Math.floor(s%60).toString().padStart(2,'0')}`;
  }

  function updateMediaSession(song) {
      if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title,
        artist: song.artist,
        artwork: [{ src: COVER_IMAGE, sizes: '128x128', type: 'image/png' }]
      });

      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => ui.prevBtn.click());
      navigator.mediaSession.setActionHandler('nexttrack', () => ui.nextBtn.click());
    }
  }
  
  ui.playBtn.onclick = () => {
      if(currentSongIndex === -1) {
          if(typeof showBubble === 'function') showBubble('请先选择歌曲'); 
          return;
      }
      audio.paused ? audio.play() : audio.pause();
  };

// music-player.js (替换后的新代码)
/**
 * 🎵 从 IndexedDB 获取所有已下载的歌曲，并按序号排序
 * @returns {Promise<Array<Object>>} 返回一个包含所有已下载歌曲对象的Promise
 */
async function getDownloadedSongs() {
    // 使用您代码中已有的 dbOp 函数来简化操作
    const downloadedRecords = await dbOp("songs", "readonly", store => store.getAll());
    
    // 根据文件名中的序号进行排序，确保播放顺序是 1, 2, 3...
    downloadedRecords.sort((a, b) => {
        const numA = parseInt(a.filename.split('--')[0], 10);
        const numB = parseInt(b.filename.split('--')[0], 10);
        return numA - numB;
    });
    return downloadedRecords;
}

// 播放上一首 (已更新为播放已下载歌曲的上一首)
ui.prevBtn.onclick = async () => {
    const downloadedSongs = await getDownloadedSongs();
    if (downloadedSongs.length === 0) {
        if(typeof showBubble === 'function') showBubble('没有已下载的歌曲');
        return;
    }

    // 找到当前歌曲在“已下载列表”中的位置
    const currentSongFilename = songDatabase[currentSongIndex]?.filename;
    let currentIndex = -1;
    if (currentSongFilename) {
        currentIndex = downloadedSongs.findIndex(song => song.filename === currentSongFilename);
    }
    
    // 计算上一首的索引
    let prevIndex = (currentIndex <= 0) ? downloadedSongs.length - 1 : currentIndex - 1;
    
    const prevSongRecord = downloadedSongs[prevIndex];
    if (prevSongRecord) {
        // 找到这首歌在原始 songDatabase 中的索引，然后调用 playSong
        const originalIndex = songDatabase.findIndex(s => s.filename === prevSongRecord.filename);
        if (originalIndex > -1) {
            playSong(originalIndex);
        }
    }
};

// 播放下一首 (已更新为播放已下载歌曲的下一首)
ui.nextBtn.onclick = async () => {
    const downloadedSongs = await getDownloadedSongs();
    if (downloadedSongs.length === 0) {
        if(typeof showBubble === 'function') showBubble('没有已下载的歌曲');
        return;
    }
    
    // 找到当前歌曲在“已下载列表”中的位置
    const currentSongFilename = songDatabase[currentSongIndex]?.filename;
    let currentIndex = -1;
    if (currentSongFilename) {
        currentIndex = downloadedSongs.findIndex(song => song.filename === currentSongFilename);
    }

    // 计算下一首的索引
    let nextIndex = (currentIndex === -1 || currentIndex >= downloadedSongs.length - 1) ? 0 : currentIndex + 1;
    
    const nextSongRecord = downloadedSongs[nextIndex];
    if (nextSongRecord) {
        // 找到这首歌在原始 songDatabase 中的索引，然后调用 playSong
        const originalIndex = songDatabase.findIndex(s => s.filename === nextSongRecord.filename);
        if (originalIndex > -1) {
            playSong(originalIndex);
        }
    }
};

    const stopBtn = document.getElementById('stopSongBtn');
  if (stopBtn) {
    stopBtn.onclick = stopSong;
  }

  ui.listBtn.onclick = () => {
      ui.listPanel.style.display = ui.listPanel.style.display === 'none' ? 'block' : 'none';
  };

  ui.progress.oninput = (e) => audio.currentTime = e.target.value;
  audio.onplay = () => setIsPlaying(true);
  
  audio.onpause = () => {
    // 1. 更新播放状态为“暂停”
    setIsPlaying(false);
    
    // 2. 暂停时，立即清理主页面的音乐组件
    chrome.runtime.sendMessage({ type: 'mediaClear', source: 'internal_player' }).catch(() => {});
  };

audio.onended = async () => {
    const downloadedSongs = await getDownloadedSongs(); // 复用我们之前创建的函数

    if (downloadedSongs.length === 0) {
        setIsPlaying(false);
        return;
    }
    
    // 1. 找到当前结束的这首歌，在“已下载列表”中的位置
    const currentSongFilename = songDatabase[currentSongIndex]?.filename;
    let currentIndexInDownloadedList = -1;
    if (currentSongFilename) {
        currentIndexInDownloadedList = downloadedSongs.findIndex(song => song.filename === currentSongFilename);
    }

    // 2. 计算“已下载列表”中的下一首歌曲的索引
    //    如果当前歌曲是列表的最后一首，或者没找到，则从 0 开始
    let nextIndexInDownloadedList = (currentIndexInDownloadedList === -1 || currentIndexInDownloadedList >= downloadedSongs.length - 1) 
                                    ? 0 
                                    : currentIndexInDownloadedList + 1;
    
    const nextSongRecord = downloadedSongs[nextIndexInDownloadedList];
    
    if (nextSongRecord) {
        // 3. 找到这首歌在原始 songDatabase 中的全局索引
        const originalIndex = songDatabase.findIndex(s => s.filename === nextSongRecord.filename);
        if (originalIndex > -1) {
            // 4. 调用 playSong 播放
            playSong(originalIndex);
        } else {
             console.error("在已下载列表中找到了歌曲，但在主数据库中找不到，逻辑可能存在问题。");
             setIsPlaying(false);
        }
    } else {
        // 理论上，只要 downloadedSongs.length > 0，这里就不会执行
        setIsPlaying(false);
    }
};

// ✅ 辅助函数：尝试播放指定索引的歌曲，如果未下载则返回 false
  async function playNext() {
    const downloadedSongs = await getDownloadedSongs();
    if (downloadedSongs.length === 0) {
        return;
    }

    const currentSrc = audio.src;
    // 找到当前歌曲在下载列表中的索引
    const currentIndex = downloadedSongs.findIndex(song => currentSrc.includes(song.id));
    
    // 计算下一首歌曲的索引
    let nextIndex = (currentIndex === -1 || currentIndex === downloadedSongs.length - 1) ? 0 : currentIndex + 1;
    
    const nextSong = downloadedSongs[nextIndex];
    if (nextSong) {
        // 直接使用 song 对象加载和播放
        loadAndPlaySong(nextSong);
    }
  }

  // ✅ 新增：在页面卸载前保存状态
  window.addEventListener('beforeunload', () => {
    if (currentSongIndex > -1) {
        localStorage.setItem(LAST_SONG_INDEX_KEY, currentSongIndex);
        localStorage.setItem(LAST_SONG_TIME_KEY, audio.currentTime);
        localStorage.setItem(LAST_SONG_PLAYING_KEY, isPlaying);
    } else {
        localStorage.removeItem(LAST_SONG_INDEX_KEY);
        localStorage.removeItem(LAST_SONG_TIME_KEY);
        localStorage.removeItem(LAST_SONG_PLAYING_KEY);
    }
  });

// music-player.js 
async function initializePlayer() {
    const musicPlayerContainer = document.getElementById('musicPlayerWidget');

    // --- 这部分是之前修复开关位置的代码，保持不变 ---
    if (musicPlayerContainer) {
        musicPlayerContainer.style.position = 'relative';
        
        const pinToggleContainer = document.createElement('div');
        pinToggleContainer.className = 'pin-panel-container';
        pinToggleContainer.title = '开启后可阻止在无操作时自动进入禅模式';
        
        pinToggleContainer.innerHTML = `
            <span class="pin-panel-label">固定</span>
            <label class="switch small-switch">
                <input type="checkbox" id="pinPanelCheckbox">
                <span class="slider"></span>
            </label>
        `;
        musicPlayerContainer.appendChild(pinToggleContainer);

        ui.pinPanelToggle = document.getElementById('pinPanelCheckbox');
    }

    const isPanelPinned = localStorage.getItem('isMusicPanelPinned') === 'true';
    if (ui.pinPanelToggle) {
        ui.pinPanelToggle.checked = isPanelPinned;
    }
    window.isIdleTimerGloballyDisabled = isPanelPinned;

    if (ui.pinPanelToggle) {
        ui.pinPanelToggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            localStorage.setItem('isMusicPanelPinned', isChecked);
            window.isIdleTimerGloballyDisabled = isChecked;

            if (!isChecked) {
                if (typeof resetIdleTimer === 'function') {
                    resetIdleTimer();
                }
            }
            
            if (typeof showBubble === 'function') {
                showBubble(isChecked ? '播放器已固定，将不会自动进入禅模式' : '播放器已取消固定');
            }
        });
    }
    // --- 开关位置代码结束 ---

    // 渲染播放列表
    await renderPlaylist();

    const lastIndexStr = localStorage.getItem(LAST_SONG_INDEX_KEY);
    if (lastIndexStr !== null) {
        const lastIndex = parseInt(lastIndexStr, 10);
        const lastTime = parseFloat(localStorage.getItem(LAST_SONG_TIME_KEY) || '0');
        
        // ✅ 核心修改：我们不再读取 wasPlaying 状态，只加载歌曲和进度
        // const wasPlaying = localStorage.getItem(LAST_SONG_PLAYING_KEY) === 'true';
        
        // 调用 loadSongForResume 来设置歌曲和进度条，但之后不做任何操作
        await loadSongForResume(lastIndex, lastTime); 
        
        // ❌ 核心修改：删除了下面这段自动播放的代码
        /*
        if (loaded && wasPlaying) {
            setTimeout(() => {
                audio.play().catch(e => ('Autoplay was prevented by browser.', e));
            }, 100);
        }
        */
    }
}

  initializePlayer();

});
document.addEventListener('DOMContentLoaded', () => {
    const playlistContainer = document.getElementById('musicPlaylist');
    
    if (playlistContainer) {
        const scrollSensitivity = 0.3; // 灵敏度因子。0.3 表示滚动速度为原来的30%。您可以根据需要调整这个值。

        playlistContainer.addEventListener('wheel', function(event) {
            // event.preventDefault() 会阻止默认的滚动行为
            event.preventDefault();
            
            // event.deltaY 是原始的滚动距离
            // 我们将它乘以灵敏度因子来得到一个新的、更小的滚动距离
            const scrollAmount = event.deltaY * scrollSensitivity;

            // 将计算出的滚动量应用到容器的 scrollTop 上
            playlistContainer.scrollTop += scrollAmount;
        }, { passive: false }); // passive: false 是必需的，因为它允许我们调用 event.preventDefault()
    }
});