(function () {
  // 防止重复运行
  if (window.__G_WEB_MEDIA_INJECTED__) return;
  window.__G_WEB_MEDIA_INJECTED__ = true;

  // 辅助:获取图片绝对路径
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

      const imgEl = document.querySelector('.song_info__cover img')
                 || document.getElementById('song_pic')
                 || document.querySelector('.song_info__pic')
                 || document.querySelector('.music_pic__img');

      const pauseBtn = document.querySelector('.player_btn__pause') 
                    || document.querySelector('.btn_big_play--pause')
                    || document.querySelector('.btn_pause');

      if (songEl) title = songEl.innerText;
      if (singerEl) artist = singerEl.innerText;
      
      if (imgEl) {
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
    // 4. 哔哩哔哩 (Bilibili)
    // -------------------------------------------------
    else if (host.includes('bilibili.com')) {
      const titleEl = document.querySelector('.video-title') || document.querySelector('.video-info-title-inner');
      if (titleEl) title = titleEl.getAttribute('title') || titleEl.innerText;
      
      artist = document.querySelector('.up-name')?.innerText || 'Bilibili UP主';
      
      const video = document.querySelector('video');
      if (video && !video.paused) isPlaying = true;
    }

    // -------------------------------------------------
    // 5. 抖音 (Douyin)
    // -------------------------------------------------
    else if (host.includes('douyin.com')) {
        
        function findClosestToCenter(selector) {
            const els = document.querySelectorAll(selector);
            let closestEl = null;
            let minDistance = Infinity;
            const screenCenter = window.innerHeight / 2;

            for (let el of els) {
                if (!el || el.offsetParent === null) continue;
                
                const rect = el.getBoundingClientRect();
                if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

                const elCenter = rect.top + (rect.height / 2);
                const distance = Math.abs(screenCenter - elCenter);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestEl = el;
                }
            }
            return closestEl;
        }

        const titleSelectors = [
            '[data-e2e="video-desc"] span',
            '[data-e2e="video-desc"]',
            '.video-info-detail',
            '.account-card-description',
            'h1.title'
        ];

        for (let sel of titleSelectors) {
            const el = findClosestToCenter(sel);
            if (el && el.innerText.trim()) {
                title = el.innerText.replace(/[\r\n]/g, ' ').substring(0, 50);
                break;
            }
        }

        const artistSelectors = [
            '[data-e2e="video-author-name"]',
            '.author-info .name',
            '.account-name',
            '.user-name'
        ];

        for (let sel of artistSelectors) {
            const el = findClosestToCenter(sel);
            if (el && el.innerText.trim()) {
                artist = el.innerText.trim();
                break;
            }
        }

        const posterEls = document.querySelectorAll('xg-poster, .xgplayer-poster');
        let closestPoster = null;
        let minPDist = Infinity;
        const screenCenter = window.innerHeight / 2;

        for(let el of posterEls) {
             const rect = el.getBoundingClientRect();
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

        if (!artwork) {
            const videoEls = document.querySelectorAll('video');
            let closestVideo = null;
            let minVDist = Infinity;
            
            for(let v of videoEls) {
                const rect = v.getBoundingClientRect();
                if(rect.height > 50) {
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
            if (closestVideo && !closestVideo.paused) isPlaying = true;
        }
    }

    if (title) {
      return {
        title: title.trim(),
        artist: artist ? artist.trim() : '未知艺术家',
        album: '',
        artwork: artwork ? [{ src: resolveUrl(artwork), sizes: '512x512', type: 'image/jpeg' }] : [],
        playbackState: isPlaying ? 'playing' : 'paused'
      };
    }
    return null;
  }

  // ⚡ 优化1: 缓存上次发送的数据，避免重复发送相同内容
  let lastSentData = null;
  
  function dataChanged(newData) {
    if (!lastSentData) return true;
    
    // 简单对比主要字段
    if (lastSentData.title !== newData.title) return true;
    if (lastSentData.artist !== newData.artist) return true;
    if (lastSentData.playbackState !== newData.playbackState) return true;
    
    return false;
  }

  // === 主循环函数 (智能合并策略) ===
  function extract() {
    // 1. 获取原生 MediaSession 数据
    let msData = null;
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
      const md = navigator.mediaSession.metadata;
      msData = {
        title: md.title || '',
        artist: md.artist || '',
        album: md.album || '',
        artwork: md.artwork ? JSON.parse(JSON.stringify(md.artwork)) : [],
        playbackState: navigator.mediaSession.playbackState || 'none'
      };
    }

    // 2. 获取 DOM 数据
    const domData = fallbackScraper();
    
    // 3. 最终合并数据
    let finalPayload = {
      title: '',
      artist: '',
      album: '',
      artwork: [],
      playbackState: 'none'
    };

    if (msData) {
      finalPayload = { ...msData };
    }

    if (domData) {
      if (domData.title) finalPayload.title = domData.title;
      if (domData.artist) finalPayload.artist = domData.artist;
      if (domData.playbackState !== 'none') finalPayload.playbackState = domData.playbackState;
      
      if (domData.artwork && domData.artwork.length > 0) {
        finalPayload.artwork = domData.artwork;
      }
    }

    // 如果最终什么都没抓到，就不发送
    if (!finalPayload.title && !finalPayload.artist) return;

    // ⚡ 优化2: 只在数据变化时才发送
    if (!dataChanged(finalPayload)) return;
    
    lastSentData = { ...finalPayload };

    // 发送消息
    window.postMessage({
      source: 'G_WEB_MEDIA',
      payload: finalPayload,
      playbackState: finalPayload.playbackState || 'playing'
    }, '*');
  }

  // ⚡ 优化3: 降低轮询频率到2.5秒 (原来是1秒)
  let intervalId = setInterval(extract, 2500);
  
  // ⚡ 优化4: 页面不可见时停止轮询
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    } else {
      if (!intervalId) {
        intervalId = setInterval(extract, 2500);
        extract(); // 立即执行一次
      }
    }
  });
  
  // 立即执行一次
  extract();
})();
