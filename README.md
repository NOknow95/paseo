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

<p align="center">One interface for Claude Code, Codex, Copilot, OpenCode, and Pi agents.</p>

> This branch extends the official Paseo product with the enhancements below. For the full product overview — quick start, CLI, SDK, and skills — see the [official README](https://github.com/getpaseo/paseo) and [Paseo docs](https://paseo.sh/docs).

## Features in this branch

### AI-generated tab titles

Rename any agent tab in one click: the rename modal has an **Auto-generate** button. The daemon builds a seed from the agent's conversation timeline and runs structured generation, trying the agent's own provider/model first, then falling back through your configured chain. Timeouts and failed generations surface as localized messages. Requires a daemon that exposes `agentTitleGenerate` (v0.6.1+).

### Live thinking preview


While an agent is thinking, the thinking badge no longer just reads "Thinking" — it streams the tail of what the model is currently working through, reverting to a plain label when the step finishes. No more waiting blind on long reasoning steps.

### Todo tasks in the timeline

Todo lists from `todowrite` calls appear right in the timeline with stable per-position ids across providers. The todo panel stays in sync: aligned diffs even when a provider re-emits the same list, wrapping task text, and a live pill for the in-flight task.

### On-demand updates (desktop)

The desktop app no longer downloads updates in the background. It discovers new versions and reports them, and a download starts only when you explicitly trigger an install (or when the app applies an already-downloaded update on quit).

## Building the local "Paseo Dev" desktop app

This branch can package itself as a local **Paseo Dev** desktop app that installs side-by-side with the released Paseo.app — distinct `appId` `sh.paseo.desktop.dev`, renamed product name and artifacts, ad-hoc signed on macOS — so it never replaces the real app. Full procedure: `.agents/skills/release-dev/SKILL.md`. Short version:

```bash
# 1. Generate the dev build config (re-run after any electron-builder.yml change)
cd packages/desktop && node scripts/make-dev-config.js

# 2. If the script warns the bundle is stale, rebuild it, then redo step 1
npm run build:desktop

# 3. Build for the current platform
cd packages/desktop
npx electron-builder --config electron-builder.dev.yml

# On macOS the first build needs a one-time dmgbuild setup; see the skill
# (the local download mirror path is a machine-specific detail, not in here).

# 4. Remove the generated temp files
rm -f electron-builder.dev.yml scripts/after-pack.dev.js
```

Output lands in `packages/desktop/release/` (dmg/zip on macOS, AppImage/deb/rpm/tar.gz on Linux, nsis/zip on Windows). Installing it is always your call — the build never installs or replaces anything on its own. Note that the dev app shares `~/.paseo`, port `6767`, and the update feed with the release, so don't run both at the same time.

## Official resources

- [Official README](https://github.com/getpaseo/paseo) — full product intro, quick start, CLI, SDK, and skills
- [paseo.sh](https://paseo.sh) — website and docs
- [Releases](https://github.com/getpaseo/paseo/releases)
