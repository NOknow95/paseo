<p align="center">
  <img src="packages/website/public/logo.svg" width="64" height="64" alt="Paseo logo">
</p>

<h1 align="center">Paseo</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.zh-CN.md">简体中文</a> ·
  <a href="README.ja.md">日本語</a> ·
  <a href="README.ko.md">한국어</a>
</p>

<p align="center">
  <a href="https://github.com/getpaseo/paseo/stargazers">
    <img src="https://img.shields.io/github/stars/getpaseo/paseo?style=flat&logo=github" alt="GitHub stars">
  </a>
  <a href="https://github.com/getpaseo/paseo/releases">
    <img src="https://img.shields.io/github/v/release/getpaseo/paseo?style=flat&logo=github" alt="GitHub release">
  </a>
  <a href="https://x.com/moboudra">
    <img src="https://img.shields.io/badge/%40moboudra-555?logo=x" alt="X">
  </a>
  <a href="https://discord.gg/jz8T2uahpH">
    <img src="https://img.shields.io/badge/Discord-555?logo=discord" alt="Discord">
  </a>
  <a href="https://www.reddit.com/r/PaseoAI/">
    <img src="https://img.shields.io/badge/Reddit-555?logo=reddit" alt="Reddit">
  </a>
</p>

<p align="center">Claude Code、Codex、Copilot、OpenCode 和 Pi agents 的统一界面。</p>

> 本分支在官方 Paseo 产品之上增加了以下增强功能。完整的产品介绍、快速开始、CLI、SDK 和 Skills 请参见[官方 README](https://github.com/getpaseo/paseo)与 [Paseo 文档](https://paseo.sh/docs)。

## 本分支新增功能

### AI 自动生成 tab 标题

一键重命名 agent tab：重命名弹窗里新增 **Auto-generate（自动生成）** 按钮。daemon 从 agent 的对话时间线构建种子并做结构化生成，优先使用 agent 自己的 provider/model，失败时顺着配置的 fallback chain 回退；超时和生成失败都会给出本地化提示。需要支持 `agentTitleGenerate` 的 daemon（v0.6.1+）。

### 思考内容实时预览

agent 思考时，thinking 徽章不再只是静态的 "Thinking"，而是实时显示模型当前思考内容的尾部，该步骤一结束就恢复为普通标签。长推理步骤不用再干等。

### 时间线中的 Todo 任务

`todowrite` 产生的 todo 列表直接进入时间线，并按位置携带跨 provider 的稳定 ID。todo 面板与时间线保持同步：即使 provider 重复发出同一份列表也能按 ID 对齐 diff，任务文本自动换行，进行中的任务有 live 状态 pill。

### 按需更新（桌面端）

桌面 app 不再后台自动下载更新，改为发现新版本后提示你；只有你显式触发安装时才下载（退出时若已有已下载的更新会直接应用）。

## 本地 "Paseo Dev" 桌面打包

本分支可以把当前代码打包成一个本地 **Paseo Dev** 桌面 app，与已发布的 Paseo.app 并排安装——独立 `appId`（`sh.paseo.desktop.dev`）、产品名与产物重命名、macOS 上 ad-hoc 签名——因此永远不会覆盖正式版。完整流程见 `.agents/skills/release-dev/SKILL.md`，简版如下：

```bash
# 1. 生成 dev 构建配置（electron-builder.yml 有改动后需重新执行）
cd packages/desktop && node scripts/make-dev-config.js

# 2. 若脚本警告 bundle 过期，先重建，再回到第 1 步
npm run build:desktop

# 3. 按当前平台打包
cd packages/desktop
npx electron-builder --config electron-builder.dev.yml

# macOS 首次构建需要一次性配置 dmgbuild，见 SKILL.md
# （本地下载镜像路径是机器相关的细节，此处不写）

# 4. 清理生成的临时文件
rm -f electron-builder.dev.yml scripts/after-pack.dev.js
```

产物输出到 `packages/desktop/release/`（macOS 为 dmg/zip，Linux 为 AppImage/deb/rpm/tar.gz，Windows 为 nsis/zip）。安装与否完全由你决定——构建本身不会安装或替换任何东西。注意：dev app 与正式版共用 `~/.paseo`、6767 端口和更新源，不要同时运行两者。

## 官方资源

- [官方 README](https://github.com/getpaseo/paseo) — 完整产品介绍、快速开始、CLI、SDK 与 Skills
- [paseo.sh](https://paseo.sh) — 官网与文档
- [Releases](https://github.com/getpaseo/paseo/releases)
