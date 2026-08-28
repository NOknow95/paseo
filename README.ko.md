<p align="center">
  <img src="packages/website/public/logo.svg" width="64" height="64" alt="Paseo 로고">
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

<p align="center">Claude Code, Codex, Copilot, OpenCode, Pi 에이전트를 위한 하나의 인터페이스</p>

> 이 브랜치는 공식 Paseo 제품에 아래의 확장 기능을 더한 것입니다. 제품 전체 소개(빠른 시작, CLI, SDK, 스킬)는 [공식 README](https://github.com/getpaseo/paseo)와 [Paseo 문서](https://paseo.sh/docs)를 참고하세요.

## 이 브랜치의 추가 기능

### AI 탭 제목 자동 생성

에이전트 탭 이름을 클릭 한 번으로 변경할 수 있습니다. 이름 바꾸기 모달에 **자동 생성(Auto-generate)** 버튼이 추가되었습니다. 데몬이 에이전트 대화 타임라인에서 시드를 만들어 구조화 생성하며, 에이전트 자체 provider/model을 우선 사용하고 실패하면 설정된 폴백 체인을 따릅니다. 시간 초과와 생성 실패는 현지화된 메시지로 안내됩니다. `agentTitleGenerate`를 지원하는 데몬(v0.6.1+)이 필요합니다.

### 생각 중 라이브 미리 보기

에이전트가 생각하는 동안 Thinking 배지가 정적인 "Thinking"에 머물지 않고, 모델이 현재 생각하고 있는 내용의 뒷부분을 실시간으로 표시합니다. 해당 단계가 끝나면 일반 라벨로 돌아갑니다. 긴 추론 단계도 맹목적으로 기다리지 않아도 됩니다.

### 타임라인의 Todo 작업

`todowrite` 호출로 만들어진 Todo 목록이 타임라인에 바로 표시되며, provider를 넘나들며 위치마다 안정적인 ID를 갖습니다. Todo 패널은 타임라인과 동기화되어, provider가 같은 목록을 다시 보내도 ID 기준으로 diff를 정렬하고, 작업 텍스트는 줄바꿈되며, 진행 중인 작업은 라이브 pill로 표시됩니다.

### 요청 시 업데이트(데스크톱)

데스크톱 앱이 더 이상 업데이트를 백그라운드로 자동 다운로드하지 않습니다. 새 버전을 발견하면 알려 주고, 사용자가 명시적으로 설치를 실행할 때만 다운로드합니다(종료 시 이미 다운로드된 업데이트가 있으면 적용합니다).

## 로컬 "Paseo Dev" 데스크톱 앱 빌드

이 브랜치는 현재 코드를 로컬용 **Paseo Dev** 데스크톱 앱으로 패키징할 수 있고, 배포된 Paseo.app과 나란히 설치됩니다——별도 `appId`(`sh.paseo.desktop.dev`), 제품명·산출물 이름 변경, macOS에서는 ad-hoc 서명——그래서 정식 앱을 덮어쓰지 않습니다. 전체 절차는 `.agents/skills/release-dev/SKILL.md`에 있습니다. 간단한 버전은 다음과 같습니다.

```bash
# 1. dev 빌드 설정 생성(electron-builder.yml을 변경한 뒤에는 다시 실행)
cd packages/desktop && node scripts/make-dev-config.js

# 2. 스크립트가 번들 오래됨 경고를 띄우면 먼저 다시 빌드한 뒤 1번부터 재실행
npm run build:desktop

# 3. 현재 플랫폼용으로 빌드
cd packages/desktop
npx electron-builder --config electron-builder.dev.yml

# macOS는 첫 빌드 시 dmgbuild 설정을 한 번 필요로 합니다. SKILL.md 참조
# (로컬 다운로드 미러 경로는 머신별 세부 사항이라 여기에는 적지 않음)

# 4. 생성된 임시 파일 정리
rm -f electron-builder.dev.yml scripts/after-pack.dev.js
```

산출물은 `packages/desktop/release/`에 생성됩니다(macOS는 dmg/zip, Linux는 AppImage/deb/rpm/tar.gz, Windows는 nsis/zip). 설치는 항상 사용자 몫입니다——빌드 자체는 아무것도 설치하거나 교체하지 않습니다. 참고로 dev 앱은 정식 앱과 `~/.paseo`, 6767 포트, 업데이트 피드를 공유하므로 동시에 실행하지 마세요.

## 공식 리소스

- [공식 README](https://github.com/getpaseo/paseo) — 전체 제품 소개, 빠른 시작, CLI, SDK, 스킬
- [paseo.sh](https://paseo.sh) — 웹사이트 및 문서
- [Releases](https://github.com/getpaseo/paseo/releases)
