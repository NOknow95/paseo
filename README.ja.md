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

<p align="center">Claude Code、Codex、Copilot、OpenCode、Pi のエージェントを、ひとつのインターフェースで。</p>

> このブランチは公式の Paseo 製品に以下の拡張を加えたものです。製品の完全な紹介（クイックスタート・CLI・SDK・スキル）は[公式 README](https://github.com/getpaseo/paseo)と [Paseo ドキュメント](https://paseo.sh/docs)を参照してください。

## このブランチの追加機能

### AI によるタブタイトル自動生成

エージェントタブの名前をワンクリックで変更できます。リネームモーダルに **Auto-generate（自動生成）** ボタンが追加されました。デーモンがエージェントの会話タイムラインからシードを構築して構造化生成を行い、エージェント自身の provider/model を優先、失敗時は設定済みのフォールバックチェーンに切り替わります。タイムアウトや生成失敗はローカライズされたメッセージで通知されます。`agentTitleGenerate` に対応したデーモン（v0.6.1+）が必要です。

### 思考中のライブプレビュー

エージェントが思考している間、Thinking バッジは静的な "Thinking" のままでなく、モデルが現在考えている内容の末尾をリアルタイムで表示します。ステップが終わると通常のラベルに戻ります。長い推論ステップを待つ間も、何を考えているかが分かります。

### タイムライン上の Todo タスク

`todowrite` 呼び出しによる Todo リストがタイムラインに直接表示され、プロバイダーをまたいで位置ごとに安定した ID を持ちます。Todo パネルはタイムラインと同期し、プロバイダーが同じリストを再送しても ID ベースで diff を揃え、タスクテキストは折り返し表示、進行中のタスクはライブのピルで示されます。

### オンデマンド更新（デスクトップ）

デスクトップアプリは更新をバックグラウンドで自動ダウンロードしません。新バージョンを検出して通知し、ユーザーが明示的にインストールを実行したときだけダウンロードします（終了時にダウンロード済みの更新があれば適用します）。

## ローカル「Paseo Dev」デスクトップアプリのビルド

このブランチは現在のコードをローカル用の **Paseo Dev** デスクトップアプリとしてパッケージでき、公開済みの Paseo.app と並行インストールされます——独立した `appId`（`sh.paseo.desktop.dev`）、製品名と成果物のリネーム、macOS では ad-hoc 署名——そのため正式版を上書きすることはありません。完全な手順は `.agents/skills/release-dev/SKILL.md` にあります。簡易版は以下のとおりです。

```bash
# 1. dev ビルド設定を生成（electron-builder.yml を変更したら再実行）
cd packages/desktop && node scripts/make-dev-config.js

# 2. ビルドが古いという警告が出たら、先に再ビルドしてから手順 1 をやり直す
npm run build:desktop

# 3. 現在のプラットフォーム向けにビルド
cd packages/desktop
npx electron-builder --config electron-builder.dev.yml

# macOS は初回ビルド時に dmgbuild のセットアップが一度必要。SKILL.md 参照
# （ローカルダウンロードミラーのパスはマシン固有の詳細なのでここには書かない）

# 4. 生成された一時ファイルを削除
rm -f electron-builder.dev.yml scripts/after-pack.dev.js
```

成果物は `packages/desktop/release/` に出力されます（macOS は dmg/zip、Linux は AppImage/deb/rpm/tar.gz、Windows は nsis/zip）。インストールするかどうかは常にあなたの判断です——ビルド自体が何かをインストールしたり置き換えたりすることはありません。なお、dev アプリは正式版と `~/.paseo`・ポート 6767・更新フィードを共有するため、両方を同時に実行しないでください。

## 公式リソース

- [公式 README](https://github.com/getpaseo/paseo) — 製品の完全な紹介・クイックスタート・CLI・SDK・スキル
- [paseo.sh](https://paseo.sh) — ウェブサイトとドキュメント
- [Releases](https://github.com/getpaseo/paseo/releases)
