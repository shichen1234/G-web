#!/usr/bin/env node
// build.js — 打包脚本
// 用法：WEATHER_KEY=xxx AI_KEY=yyy node build.js
// 或由 GitHub Actions 自动调用（密钥来自 Secrets）

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const WEATHER_KEY = process.env.WEATHER_KEY;
const AI_KEY = process.env.AI_KEY;

if (!WEATHER_KEY || !AI_KEY) {
  console.error("❌ 缺少环境变量 WEATHER_KEY 或 AI_KEY");
  process.exit(1);
}

// 1. 生成 config.js（含真实密钥，仅存在于构建产物中）
const configContent = `// 此文件由构建脚本自动生成，请勿手动编辑
window.APP_CONFIG = {
  WEATHER_KEY: "${WEATHER_KEY}",
  AI_KEY: "${AI_KEY}",
};
`;

fs.writeFileSync(path.join(__dirname, "config.js"), configContent, "utf-8");
console.log("✅ config.js 已生成");

// 2. 打包为 zip（排除不需要的文件）
const outputName = "g-web-extension.zip";

// 删除旧的 zip
if (fs.existsSync(outputName)) fs.unlinkSync(outputName);

// 排除列表：不打包进 zip 的文件/目录
const excludes = [
  ".git",
  ".gitignore",
  "node_modules",
  "build.js",
  "config.example.js",
  "*.zip",
  ".github",
  "README.md",
    ".DS_Store",
  "Thumbs.db",
].map(e => `--exclude='${e}'`).join(" ");

execSync(`zip -r ${outputName} . ${excludes}`, { stdio: "inherit" });
console.log(`✅ 已打包：${outputName}`);

// 3. 构建完成后删除 config.js（避免意外提交）
fs.unlinkSync(path.join(__dirname, "config.js"));
console.log("✅ 已清理临时 config.js");
