chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "baiduSuggest") {
    fetch(`https://suggestion.baidu.com/su?wd=${encodeURIComponent(msg.q)}&json=1&p=3`)
      .then(r => r.arrayBuffer()) // 用 arrayBuffer 获取原始字节
      .then(buf => {
        const decoder = new TextDecoder("gbk"); // 指定 GBK 解码
        const text = decoder.decode(buf);

        // 百度返回 JSONP，需要提取
        const match = text.match(/window\.baidu\.sug\((.*)\)/);
        if (match) {
          const data = JSON.parse(match[1]);
          sendResponse(data.s); // 返回联想数组
        } else {
          sendResponse([]);
        }
      })
      .catch(() => sendResponse([]));
    return true; // 异步响应
  }
});


