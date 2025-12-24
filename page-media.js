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

  // === 核心抓取逻辑 ===
  function fallbackScraper() {
    const host = window.location.hostname;
    let title = '';
    let artist = '';
    let artwork = '';
    let isPlaying = false; // 尝试判断是否正在播放

    // -------------------------------------------------
    // 1. QQ音乐 (y.qq.com)
    // -------------------------------------------------
    if (host.includes('y.qq.com')) {
      // 底部播放栏
      const songEl = document.getElementById('song_name') || document.querySelector('.music_name__text');
      const singerEl = document.getElementById('singer_name') || document.querySelector('.singer_name__text');
      const imgEl = document.getElementById('song_pic') || document.querySelector('.music_pic__img');
      const playBtn = document.querySelector('.btn_big_play'); // 播放按钮

      if (songEl) title = songEl.innerText;
      if (singerEl) artist = singerEl.innerText;
      if (imgEl) artwork = imgEl.src;
      // 如果播放按钮上有 'btn_big_play--pause' 类，说明正在播放（显示的是暂停图标）
      if (playBtn && playBtn.classList.contains('btn_big_play--pause')) {
        isPlaying = true;
      }
    }

    // -------------------------------------------------
    // 2. 酷狗音乐 (kugou.com)
    // -------------------------------------------------
    else if (host.includes('kugou.com')) {
      // 酷狗网页版播放器 (www.kugou.com/yy/html/rank.html 等)
      // 这里的 DOM 结构比较老旧
      const songNameEl = document.querySelector('.change-song .songName') || document.getElementById('songName');
      const singerNameEl = document.querySelector('.change-song .singerName'); // 某些页面结构
      
      // 尝试获取播放列表中的当前激活项
      const activeItem = document.querySelector('#songList .active') || document.querySelector('.songList .active');
      
      if (songNameEl) {
        title = songNameEl.innerText;
      } else if (activeItem) {
        // 尝试从列表激活项获取
        title = activeItem.querySelector('.song_name')?.innerText || '';
      }

      // 酷狗封面通常很难抓，尝试抓取类似 albumImg 的元素
      const imgEl = document.querySelector('.albumImg img') || document.querySelector('.pic img');
      if (imgEl) artwork = imgEl.src;
      
      // 尝试从标题分割 "歌手 - 歌名"
      if (!artist && title.includes('-')) {
        const parts = title.split('-');
        artist = parts[0].trim();
        title = parts[1].trim();
      }
      
      // 判断播放状态: 酷狗播放按钮通常变更为暂停样式
      const pauseBtn = document.querySelector('.btn-pause');
      const playBtn = document.querySelector('.btn-play');
      // 如果暂停按钮是可见的，或者播放按钮处于“暂停”态
      if (pauseBtn && window.getComputedStyle(pauseBtn).display !== 'none') isPlaying = true;
    }

    // -------------------------------------------------
    // 3. 酷我音乐 (kuwo.cn)
    // -------------------------------------------------
    else if (host.includes('kuwo.cn')) {
      // 酷我新版 (React/Vue 构建)
      const nameEl = document.querySelector('.song_name') || document.querySelector('.control_left .name');
      const artistEl = document.querySelector('.artist') || document.querySelector('.control_left .artist');
      const imgEl = document.querySelector('.play_cover img') || document.querySelector('.control_left img');
      
      if (nameEl) title = nameEl.innerText;
      if (artistEl) artist = artistEl.innerText;
      if (imgEl) artwork = imgEl.src;

      // 播放状态：酷我播放按钮切换 class 为 icon-pause
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
      const metaImg = document.querySelector('meta[property="og:image"]');
      if (metaImg) artwork = metaImg.content;
      artist = document.querySelector('.up-name')?.innerText || 'Bilibili UP主';
      // B站只要有视频元素且没暂停，就算播放
      const video = document.querySelector('video');
      if (video && !video.paused) isPlaying = true;
    }

    // -------------------------------------------------
    // 5. 抖音 (Douyin)
    // -------------------------------------------------
    else if (host.includes('douyin.com')) {
        const descEl = document.querySelector('.video-info-detail') || document.querySelector('[data-e2e="video-desc"]');
        if (descEl) title = descEl.innerText.substring(0, 40);
        const authorEl = document.querySelector('.author-info .name') || document.querySelector('[data-e2e="video-author-name"]');
        if (authorEl) artist = authorEl.innerText;
        // 抖音视频状态
        const video = document.querySelector('video');
        if (video && !video.paused) isPlaying = true;
    }

    // 整理结果
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

  // === 主循环函数 ===
  function extract() {
    let payload = null;

    // 策略 A: 优先尝试标准 API (网易云音乐、Spotify、YouTube 等支持得很好)
    if (navigator.mediaSession && navigator.mediaSession.metadata) {
      const md = navigator.mediaSession.metadata;
      payload = {
        title: md.title || '',
        artist: md.artist || '',
        album: md.album || '',
        artwork: md.artwork || [],
        playbackState: navigator.mediaSession.playbackState || 'none'
      };
    }

    // 策略 B: 如果标准 API 没数据，或者处于这几个特定的“顽固”网站，强制使用 DOM 抓取
    // 注意：即使 mediaSession 有数据，有时国内网站的数据也是错的，所以对特定域名优先 DOM 抓取
    const host = window.location.hostname;
    const forceDom = host.includes('kugou') || host.includes('kuwo') || host.includes('qq.com') || host.includes('bilibili') || host.includes('douyin');

    if (!payload || (forceDom)) {
      const domData = fallbackScraper();
      // 如果抓到了 DOM 数据，就覆盖它
      if (domData) {
        payload = domData;
      }
    }

    // 发送消息
    if (payload) {
      window.postMessage({
        source: 'G_WEB_MEDIA',
        payload: payload,
        playbackState: payload.playbackState || 'playing'
      }, '*');
    }
  }

  // 启动轮询 (每秒检查一次)
  // 这种方式虽然看起来“笨”，但对于酷狗/酷我这种单页应用(SPA)是最稳定的
  setInterval(extract, 1000);
  
  // 立即执行一次
  extract();
})();