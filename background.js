// background.js (修复版)

let clearTimer = null;

function injectMediaScripts(tabId) {
  // ✅ 只注入 content-media.js
  // page-media.js 会由 content-media.js 自动注入到页面内部
  chrome.tabs.executeScript(tabId, { file: 'content-media.js' });
}
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;
  if (!tab.url) return;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;

  injectMediaScripts(tabId);
});

// 收到媒体更新：重置清空计时器
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'mediaUpdate') {
    if (clearTimer) clearTimeout(clearTimer);

    // 转发更新（包含 playbackState）
    chrome.runtime.sendMessage({
      type: 'mediaSessionUpdate',
      metadata: message.metadata,
      playbackState: message.playbackState
    });

    // 1秒无更新则认为已停止，发送清空
    clearTimer = setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'mediaClear' });
    }, 1500);
  }
});

// 百度联想（保留原逻辑）
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "baiduSuggest") return;

  fetch(`https://suggestion.baidu.com/su?wd=${encodeURIComponent(msg.q)}&json=1&p=3`)
    .then(r => r.arrayBuffer())
    .then(buf => {
      const decoder = new TextDecoder("gbk");
      const text = decoder.decode(buf);
      const match = text.match(/window\.baidu\.sug\((.*)\)/);
      if (match) {
        const data = JSON.parse(match[1]);
        sendResponse(data.s);
      } else {
        sendResponse([]);
      }
    })
    .catch(() => sendResponse([]));

  return true;
});
