// mp4-faststart.js
// 纯 JS 实现 MP4 moov 前移（faststart），无需任何外部依赖
// 原理：解析 MP4 的 box 结构，把 moov 移到 mdat 前面，
//       同时修正 moov 内所有 stco/co64 的绝对偏移量。

(function () {
  'use strict';

  // ─────────────────────────────────────────────
  // 对外暴露的主函数
  // ─────────────────────────────────────────────

  /**
   * 对视频 Blob 做 faststart 处理（moov 前移）。
   * - 如果 moov 已在 mdat 前：原样返回
   * - 如果文件超过 800 MB：原样返回（避免 OOM）
   * - 处理失败：原样返回（静默降级）
   * @param {Blob} blob
   * @returns {Promise<Blob>}
   */
  async function mp4Faststart(blob) {
    if (!blob || !blob.type || !blob.type.startsWith('video/')) return blob;
    if (blob.size > 800 * 1024 * 1024) {
      console.warn('[mp4-faststart] 文件超过 800 MB，跳过 moov 前移');
      return blob;
    }

    let buffer;
    try {
      buffer = await blob.arrayBuffer();
    } catch (e) {
      console.error('[mp4-faststart] 读取视频数据失败:', e);
      return blob;
    }

    try {
      const result = processMp4(buffer);
      if (!result) return blob; // 已经是 faststart，或非标准 MP4
      const newBlob = new Blob([result], { type: blob.type });
      console.log(
        `[mp4-faststart] moov 前移完成：${(blob.size / 1048576).toFixed(1)} MB → ${(newBlob.size / 1048576).toFixed(1)} MB`
      );
      return newBlob;
    } catch (e) {
      console.error('[mp4-faststart] 处理异常，使用原始文件:', e);
      return blob;
    }
  }

  // ─────────────────────────────────────────────
  // 核心处理逻辑
  // ─────────────────────────────────────────────

  /**
   * 处理 ArrayBuffer，返回 moov 已前移的新 ArrayBuffer；
   * 如果无需处理则返回 null。
   */
  function processMp4(buffer) {
    const uint8 = new Uint8Array(buffer);
    const view  = new DataView(buffer);

    // 1. 解析所有顶层 box
    const boxes = parseTopLevelBoxes(uint8, view);
    if (!boxes.length) return null;

    const moovIdx = boxes.findIndex(b => b.type === 'moov');
    const mdatIdx = boxes.findIndex(b => b.type === 'mdat');
    if (moovIdx === -1 || mdatIdx === -1) return null;

    // moov 已在 mdat 前：无需处理
    if (moovIdx < mdatIdx) return null;

    const moovBox = boxes[moovIdx];
    const mdatBox = boxes[mdatIdx];

    // 2. 新文件布局：ftyp → moov → 其余 box（含 mdat，保持原顺序）
    const newOrder = [];
    const ftypBox  = boxes.find(b => b.type === 'ftyp');
    if (ftypBox) newOrder.push(ftypBox);
    newOrder.push(moovBox);
    for (const box of boxes) {
      if (box.type === 'ftyp' || box.type === 'moov') continue;
      newOrder.push(box);
    }

    // 3. 计算 mdat 在新文件中的偏移
    let newMdatStart = 0;
    for (const box of newOrder) {
      if (box === mdatBox) break;
      newMdatStart += box.size;
    }
    const delta = newMdatStart - mdatBox.start; // 通常为正数（mdat 向后移了）
    if (delta === 0) return null;

    // 4. 深拷贝 moov 并修正所有 stco / co64 里的绝对偏移
    const moovCopy = uint8.slice(moovBox.start, moovBox.start + moovBox.size);
    const moovView = new DataView(moovCopy.buffer); // slice() 产生独立 buffer，byteOffset=0
    walkAndPatch(moovCopy, moovView, 8, moovCopy.length, delta);

    // 5. 拼装新文件
    const totalSize = newOrder.reduce((s, b) => s + b.size, 0);
    const out    = new Uint8Array(totalSize);
    let   outPos = 0;
    for (const box of newOrder) {
      const chunk = box === moovBox
        ? moovCopy
        : uint8.subarray(box.start, box.start + box.size);
      out.set(chunk, outPos);
      outPos += chunk.byteLength;
    }
    return out.buffer;
  }

  // ─────────────────────────────────────────────
  // Box 解析
  // ─────────────────────────────────────────────

  function parseTopLevelBoxes(uint8, view) {
    const boxes    = [];
    const fileSize = uint8.length;
    let   pos      = 0;

    while (pos + 8 <= fileSize) {
      let  boxSize   = view.getUint32(pos, false);
      const boxType  = fourCC(uint8, pos + 4);
      let  hdrSize   = 8;

      if (boxSize === 1) {
        if (pos + 16 > fileSize) break;
        boxSize = readU64(view, pos + 8);
        hdrSize = 16;
      } else if (boxSize === 0) {
        boxSize = fileSize - pos;
      }

      if (boxSize < hdrSize || pos + boxSize > fileSize) break;

      boxes.push({ type: boxType, start: pos, size: boxSize, hdrSize });
      pos += boxSize;
    }
    return boxes;
  }

  // ─────────────────────────────────────────────
  // 递归修正偏移
  // ─────────────────────────────────────────────

  /**
   * 递归遍历容器 box，找到 stco / co64 并修正偏移。
   * data/view 是 moovCopy 的引用，所有 pos 都是相对于 moovCopy[0] 的偏移。
   */
  function walkAndPatch(data, view, start, end, delta) {
    let pos = start;

    while (pos + 8 <= end) {
      let  boxSize  = view.getUint32(pos, false);
      const boxType = fourCC(data, pos + 4);
      let  hdrSize  = 8;

      if (boxSize === 1) {
        if (pos + 16 > end) break;
        boxSize = readU64(view, pos + 8);
        hdrSize = 16;
      } else if (boxSize === 0) {
        boxSize = end - pos;
      }

      if (boxSize < 8 || pos + boxSize > end) break;

      const innerStart = pos + hdrSize;
      const innerEnd   = pos + boxSize;

      if (boxType === 'stco') {
        patchStco(view, innerStart, delta);
      } else if (boxType === 'co64') {
        patchCo64(view, innerStart, delta);
      } else if (isContainer(boxType)) {
        // meta 是 FullBox，其子 box 从 hdrSize+4 开始（跳过 version+flags）
        const childStart = boxType === 'meta' ? innerStart + 4 : innerStart;
        walkAndPatch(data, view, childStart, innerEnd, delta);
      }

      pos += boxSize;
    }
  }

  /**
   * 修正 stco box 的偏移表（每项 4 字节）
   * 结构：version(1) + flags(3) + entry_count(4) + entries[entry_count * 4]
   */
  function patchStco(view, start, delta) {
    const count = view.getUint32(start + 4, false); // 跳过 version+flags
    const base  = start + 8;
    for (let i = 0; i < count; i++) {
      const off = base + i * 4;
      const old = view.getUint32(off, false);
      view.setUint32(off, (old + delta) >>> 0, false);
    }
  }

  /**
   * 修正 co64 box 的偏移表（每项 8 字节）
   * 结构：version(1) + flags(3) + entry_count(4) + entries[entry_count * 8]
   */
  function patchCo64(view, start, delta) {
    const count = view.getUint32(start + 4, false);
    const base  = start + 8;
    for (let i = 0; i < count; i++) {
      const off = base + i * 8;
      const hi  = view.getUint32(off,     false);
      const lo  = view.getUint32(off + 4, false);
      // delta 通常远小于 2^32，直接加法安全
      const val   = hi * 0x100000000 + lo + delta;
      const newHi = Math.floor(val / 0x100000000);
      const newLo = val >>> 0;
      view.setUint32(off,     newHi, false);
      view.setUint32(off + 4, newLo, false);
    }
  }

  // ─────────────────────────────────────────────
  // 工具函数
  // ─────────────────────────────────────────────

  // 需要递归进入的容器 box 类型
  const CONTAINERS = new Set([
    'moov', 'trak', 'mdia', 'minf', 'stbl',
    'udta', 'edts', 'dinf', 'mvex', 'moof',
    'traf', 'mfra', 'skip', 'meta',
  ]);
  function isContainer(type) { return CONTAINERS.has(type); }

  function fourCC(uint8, pos) {
    return String.fromCharCode(uint8[pos], uint8[pos+1], uint8[pos+2], uint8[pos+3]);
  }

  function readU64(view, pos) {
    return view.getUint32(pos, false) * 0x100000000 + view.getUint32(pos + 4, false);
  }

  // ─────────────────────────────────────────────
  // 挂载到全局
  // ─────────────────────────────────────────────
  window.mp4Faststart = mp4Faststart;

})();
