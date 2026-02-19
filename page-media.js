(function () {
  // 防止重复运行
  if (window.__G_WEB_MEDIA_INJECTED__) return;
  window.__G_WEB_MEDIA_INJECTED__ = true;

  // 辅助：获取图片绝对路径
  function resolveUrl(url) {
    if (!url) return '';
    if (url.startsWith('//')) return 'https:' + url;
    if (url.startsWith('/')) return window.location.origin + url;
    return url;
  }

  // === 核心抓取逻辑 (从页面 DOM 获取信息) ===
  function fallbackScraper() {
    const host = window.location.hostname;
    let title = '';
    let artist = '';
    let artwork = '';
    let isPlaying = false; 
// -------------------------------------------------
    // 1. QQ音乐 (y.qq.com) - ✅ 修复版
    // -------------------------------------------------
    if (host.includes('y.qq.com')) {
      const songEl = document.querySelector('.song_info__name a') 
                  || document.querySelector('.song_info__name')
                  || document.getElementById('song_name') 
                  || document.querySelector('.music_name__text');

      const singerEl = document.querySelector('.song_info__singer a') 
                    || document.querySelector('.song_info__singer')
                    || document.getElementById('singer_name') 
                    || document.querySelector('.singer_name__text');

      // 🔥 关键修改：增加 'img' 后缀，确保抓到的是图片而不是外面的框
      const imgEl = document.querySelector('.song_info__cover img')  // 新版：抓取容器内的 img
                 || document.getElementById('song_pic')              // 旧版
                 || document.querySelector('.song_info__pic')        // 备用
                 || document.querySelector('.music_pic__img');

      const pauseBtn = document.querySelector('.player_btn__pause') 
                    || document.querySelector('.btn_big_play--pause')
                    || document.querySelector('.btn_pause');

      if (songEl) title = songEl.innerText;
      if (singerEl) artist = singerEl.innerText;
      
      if (imgEl) {
        // 优先取 src，处理部分懒加载图片可能放在 data-src 的情况
        artwork = imgEl.src || imgEl.getAttribute('src');
        if ((!artwork || artwork.endsWith('g.png')) && imgEl.dataset && imgEl.dataset.src) {
           artwork = imgEl.dataset.src;
        }
      }
      
      if (pauseBtn) isPlaying = true;
    }

    // -------------------------------------------------
    // 2. 酷狗音乐 (kugou.com)
    // -------------------------------------------------
    else if (host.includes('kugou.com')) {
      const songNameEl = document.querySelector('.change-song .songName') || document.getElementById('songName');
      const activeItem = document.querySelector('#songList .active') || document.querySelector('.songList .active');
      
      if (songNameEl) {
        title = songNameEl.innerText;
      } else if (activeItem) {
        title = activeItem.querySelector('.song_name')?.innerText || '';
      }

      const imgEl = document.querySelector('.albumImg img') || document.querySelector('.pic img');
      if (imgEl) artwork = imgEl.src;
      
      if (!artist && title.includes('-')) {
        const parts = title.split('-');
        artist = parts[0].trim();
        title = parts[1].trim();
      }
      
      const pauseBtn = document.querySelector('.btn-pause');
      if (pauseBtn && window.getComputedStyle(pauseBtn).display !== 'none') isPlaying = true;
    }

    // -------------------------------------------------
    // 3. 酷我音乐 (kuwo.cn)
    // -------------------------------------------------
    else if (host.includes('kuwo.cn')) {
      const nameEl = document.querySelector('.song_name') || document.querySelector('.control_left .name');
      const artistEl = document.querySelector('.artist') || document.querySelector('.control_left .artist');
      const imgEl = document.querySelector('.play_cover img') || document.querySelector('.control_left img');
      
      if (nameEl) title = nameEl.innerText;
      if (artistEl) artist = artistEl.innerText;
      if (imgEl) artwork = imgEl.src;

      const statusBtn = document.querySelector('.icon-play') || document.querySelector('.icon-pause');
      if (statusBtn && statusBtn.classList.contains('icon-pause')) {
        isPlaying = true;
      }
    }

    // -------------------------------------------------
    // 4. 哔哩哔哩 (Bilibili) - 🔴 重点修改区域
    // -------------------------------------------------
    else if (host.includes('bilibili.com')) {
      const titleEl = document.querySelector('.video-title') || document.querySelector('.video-info-title-inner');
      if (titleEl) title = titleEl.getAttribute('title') || titleEl.innerText;
      
      // ❌ 删除：不要抓取 meta 标签，因为连播时它不会更新，导致图片卡在上一张
      // const metaImg = document.querySelector('meta[property="og:image"]');
      // if (metaImg) artwork = metaImg.content;
      
      // ✅ 策略：B站 DOM 文字更新很快，但图片很难抓。我们只抓文字，图片留给 MediaSession 处理。
      
      artist = document.querySelector('.up-name')?.innerText || 'Bilibili UP主';
      
      const video = document.querySelector('video');
      if (video && !video.paused) isPlaying = true;
    }
// -------------------------------------------------
    // 5. 抖音 (Douyin) - ✅ 终极修复：只抓取屏幕中心的视频信息
    // -------------------------------------------------
    else if (host.includes('douyin.com')) {
        
        // --- 辅助函数：找离屏幕中心最近的元素 ---
        function findClosestToCenter(selector) {
            const els = document.querySelectorAll(selector);
            let closestEl = null;
            let minDistance = Infinity;
            const screenCenter = window.innerHeight / 2;

            for (let el of els) {
                // 1. 必须是可见的
                if (!el || el.offsetParent === null) continue;
                
                const rect = el.getBoundingClientRect();
                // 2. 必须在屏幕可视范围内 (或者稍微偏出一点点)
                if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

                // 3. 计算元素中心点到屏幕中心点的距离
                const elCenter = rect.top + (rect.height / 2);
                const distance = Math.abs(screenCenter - elCenter);

                // 4. 只有距离更近，才更新
                if (distance < minDistance) {
                    minDistance = distance;
                    closestEl = el;
                }
            }
            return closestEl;
        }

        // --- A. 获取标题 (取屏幕正中间的那个) ---
        const titleSelectors = [
            '[data-e2e="video-desc"] span',      
            '[data-e2e="video-desc"]',           
            '.video-info-detail',                
            '.account-card-description',         
            'h1.title'                           
        ];

        for (let sel of titleSelectors) {
            const el = findClosestToCenter(sel); // 🔥 使用新函数
            if (el && el.innerText.trim()) {
                title = el.innerText.replace(/[\r\n]/g, ' ').substring(0, 50);
                break; 
            }
        }

        // --- B. 获取作者 (取屏幕正中间的那个) ---
        const artistSelectors = [
            '[data-e2e="video-author-name"]',    
            '.author-info .name',                
            '.account-name',                     
            '.user-name'                         
        ];

        for (let sel of artistSelectors) {
            const el = findClosestToCenter(sel); // 🔥 使用新函数
            if (el && el.innerText.trim()) {
                artist = el.innerText.trim();
                break;
            }
        }

        // --- C. 获取封面图 (同样找屏幕中间的播放器) ---
        // 策略1: 找 xgplayer-poster (背景图模式)
        // 注意：抖音有很多个 .xgplayer-poster，我们只取离中心最近的
        const posterEls = document.querySelectorAll('xg-poster, .xgplayer-poster');
        let closestPoster = null;
        let minPDist = Infinity;
        const screenCenter = window.innerHeight / 2;

        for(let el of posterEls) {
             const rect = el.getBoundingClientRect();
             // 必须有一定的尺寸，且在屏幕内
             if(rect.height > 100 && rect.top < window.innerHeight && rect.bottom > 0) {
                 const dist = Math.abs(screenCenter - (rect.top + rect.height/2));
                 if(dist < minPDist) {
                     minPDist = dist;
                     closestPoster = el;
                 }
             }
        }

        if (closestPoster) {
            const bg = window.getComputedStyle(closestPoster).backgroundImage;
            if (bg && bg !== 'none' && bg.startsWith('url')) {
                const match = bg.match(/url\(["']?(.*?)["']?\)/);
                if (match && match[1]) artwork = match[1];
            }
        }

        // 策略2: 如果没找到，尝试找 closest video 的 poster
        if (!artwork) {
            const videoEls = document.querySelectorAll('video');
            let closestVideo = null;
            let minVDist = Infinity;
            
            for(let v of videoEls) {
                const rect = v.getBoundingClientRect();
                if(rect.height > 50) { // 忽略微小视频
                    const dist = Math.abs(screenCenter - (rect.top + rect.height/2));
                    if(dist < minVDist) {
                        minVDist = dist;
                        closestVideo = v;
                    }
                }
            }
            
            if (closestVideo && closestVideo.poster) {
                artwork = closestVideo.poster;
            }
            // 顺便更新播放状态：只有屏幕中间的视频在播放才算
            if (closestVideo && !closestVideo.paused) isPlaying = true;
        }
    }
    // 只有当至少抓取到了标题时，才返回数据对象
    if (title) {
      return {
        title: title.trim(),
        artist: artist ? artist.trim() : '未知艺术家',
        album: '',
        // 如果上面没抓到图片(如B站)，这里就是空字符串
        artwork: artwork ? [{ src: resolveUrl(artwork), sizes: '512x512', type: 'image/jpeg' }] : [],
        playbackState: isPlaying ? 'playing' : 'paused'
      };
    }
    return null;
  }

  // === 主循环函数 (智能合并策略) ===
  function extract() {
    // 1. 获取原生 MediaSession 数据 (通常图片最准)
    let msData = null;
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
      const md = navigator.mediaSession.metadata;
      msData = {
        title: md.title || '',
        artist: md.artist || '',
        album: md.album || '',
        artwork: md.artwork ? JSON.parse(JSON.stringify(md.artwork)) : [], // 深拷贝防止引用问题
        playbackState: navigator.mediaSession.playbackState || 'none'
      };
    }

    // 2. 获取 DOM 数据 (通常状态和中文标题最准)
    const domData = fallbackScraper();
    
    // 3. 最终合并数据
    let finalPayload = {
      title: '',
      artist: '',
      album: '',
      artwork: [],
      playbackState: 'none'
    };

    // 策略：以 MediaSession 为基础
    if (msData) {
      finalPayload = { ...msData };
    }

    // 策略：如果有 DOM 数据，用它来修正标题和状态 (解决部分网站 MediaSession 标题滞后问题)
    if (domData) {
      if (domData.title) finalPayload.title = domData.title;
      if (domData.artist) finalPayload.artist = domData.artist;
      if (domData.playbackState !== 'none') finalPayload.playbackState = domData.playbackState;
      
      // 🔥 关键图片逻辑 🔥
      // 只有当 DOM 明确抓到了图片(artwork长度>0)时，才覆盖 MediaSession 的图片
      // 因为我们把 B站 的 DOM 图片抓取删掉了，所以 B站 会保留 MediaSession 的正确图片
      // 而 QQ音乐 等 DOM 图片准确的网站，依然会使用 DOM 图片
      if (domData.artwork && domData.artwork.length > 0) {
        finalPayload.artwork = domData.artwork;
      }
    }

    // 如果最终什么都没抓到，就不发送
    if (!finalPayload.title && !finalPayload.artist) return;

    // 发送消息
    window.postMessage({
      source: 'G_WEB_MEDIA',
      payload: finalPayload,
      playbackState: finalPayload.playbackState || 'playing'
    }, '*');
  }

  // 启动轮询 (每秒检查一次)
  setInterval(extract, 1000);
  
  // 立即执行一次
  extract();
})();