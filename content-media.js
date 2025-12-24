// content-media.js - 负责注入脚本和转发消息

// 1. 注入 page-media.js 到网页主世界 (Main World)
// 这样脚本才能像网页原生代码一样运行，读取所有 DOM 和变量
const script = document.createElement('script');
script.src = chrome.runtime.getURL('page-media.js');
script.onload = function() {
  this.remove(); // 执行后移除标签，保持页面整洁
};
(document.head || document.documentElement).appendChild(script);

// 2. 监听来自 page-media.js 的消息并转发给 background.js
window.addEventListener('message', (e) => {
  // 只接收来自当前窗口的消息
  if (e.source !== window) return;
  // 只接收特定标识的消息
  if (e.data?.source !== 'G_WEB_MEDIA') return;

  // 转发给 background.js
  chrome.runtime.sendMessage({
    type: 'mediaUpdate',
    metadata: e.data.payload,
    playbackState: e.data.playbackState
  });
});