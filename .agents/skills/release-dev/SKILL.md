---
name: release-dev
description: Build a local "Paseo Dev" desktop app from the current branch without touching the released Paseo.app. Use when the user wants a dev/current-branch desktop build — "build the dev desktop app", "package Paseo Dev", "打 dev 包", "dev 包", "打包 dev 版", "打 Paseo Dev 的包", "release-dev", or "/release-dev".
user-invocable: true
---

# Release dev

Builds a local desktop app named **Paseo Dev** from the current branch, for the **current platform** (macOS: dmg + zip; Linux: AppImage/deb/rpm/tar.gz; Windows: nsis + zip — electron-builder defaults to the host platform, no extra flags needed). It keeps the release behavior — `~/.paseo`, port `6767`, update feed `github getpaseo/paseo` — but installs side-by-side with the released app: on macOS the renamed DMG never triggers a replace prompt and the app is ad-hoc signed so it launches on macOS 15; on other platforms the distinct `appId` keeps it from colliding with the released app.

## Why the overrides exist

The release `electron-builder.yml` cannot be used as-is:

- `productName: Paseo` → `Paseo Dev`, so dragging the DMG into `/Applications` never asks to replace the released app (the prompt keys off the filename). Artifact names are prefixed with `Paseo-Dev-` on all platforms so the build output is visually distinct from the release.
- `appId: sh.paseo.desktop` → `sh.paseo.desktop.dev`, so Launch Services / protocol handlers / single-instance identity don't collide.
- `hardenedRuntime: true` → `false`. macOS 15.7's dyld rejects ad-hoc + hardened-runtime Electron apps at launch: "different Team IDs" loading `Electron Framework`. Keep ad-hoc signing, drop the runtime flag.
- `afterPack` → a renamed-bundle copy of `scripts/after-pack.js`. The original hardcodes `EXECUTABLE_NAME = "Paseo"` and silently skips native-module pruning when the bundle is renamed, shipping ~246 MB of foreign platform binaries.

The transforms are encoded in a committed script, `packages/desktop/scripts/make-dev-config.js`, instead of being re-typed by hand each run. Hand-retyping rotted silently: any new field in `electron-builder.yml` or new prune step in `after-pack.js` would be silently dropped from the dev build, and the old sed/string-replace command broke on the backslash in `\.app$`. The script also warns if a built `dist` is older than its source.

## Steps

### 1. Confirm state

- Branch is what the user wants to package (`git branch --show-current`).

### 2. Generate the dev config

`packages/desktop/scripts/make-dev-config.js` derives both files from the release config:

```bash
cd packages/desktop && node scripts/make-dev-config.js
```

It writes `electron-builder.dev.yml` and `scripts/after-pack.dev.js`, replacing exactly:

- `appId: sh.paseo.desktop.dev`, `productName: Paseo Dev`, `executableName: Paseo Dev`
- `artifactName` prefixed with `Paseo-Dev-` on all four platform blocks: mac `Paseo-Dev-${version}-${arch}.${ext}`, linux `Paseo-Dev-${version}-${arch}.${ext}`, appImage `Paseo-Dev-${arch}.${ext}` (stays versionless like release), win `Paseo-Dev-Setup-${version}-${arch}.${ext}`
- `hardenedRuntime: false`, `notarize: false`
- `afterPack: ./scripts/after-pack.dev.js`
- `after-pack.dev.js`: replaces `const EXECUTABLE_NAME = "Paseo";` with a `getExecutableName(appOutDir)` that derives the bundle name (first `.app` entry), and uses it in `pruneNativeModules`' `resourcesDir`. Without this, pruning silently returns and the app is ~246 MB larger.

The script **also checks dist freshness**: if `../app/src` or `src` is more recent than `../app/dist` / `dist`, it warns that the bundle may contain stale code. **A warning is a real failure, not a hint — do not package until it's gone.** The loop is:

1. If the warning prints, rebuild the bundle: `npm run build:desktop` (this walks the workspace dependency chain and rebuilds `server`/`client`/`protocol`, then re-exports the app into `app/dist`). If you edited `packages/protocol` or `packages/server` and the desktop build didn't pick them up, run `npm run build:server` / `npm run build:client` explicitly.
2. Re-run `node scripts/make-dev-config.js`. If the freshness warning no longer prints, `dist` has caught up — do the existing `diff` check to confirm only the expected fields changed, then proceed to build. If the warning still prints, something is stale; don't guess, fix the stale output first.

> Skip step 1 only if you're confident the source you changed does not flow into the bundle (e.g. a test-only edit). When in doubt, rebuild.

### 3. Prepare dmgbuild (macOS only, once per machine)

Skip this step entirely on Linux and Windows — only the macOS dmg target needs it.

`electron-builder` fetches the `dmg-builder` binary from GitHub. On this machine Surge MITMs that download: curl trusts it (system keychain), Node/`got` fails with "self-signed certificate in certificate chain" or stalls mid-transfer. Bypass with `CUSTOM_DMGBUILD_PATH`. It normally persists at `$HOME/anything/temp/dmgbuild`; **only re-download when it's missing**:

```bash
[ -x $HOME/anything/temp/dmgbuild ] || { mkdir -p $HOME/anything/temp && cd $HOME/anything/temp && curl -sL --retry 3 --max-time 240 "https://github.com/electron-userland/electron-builder-binaries/releases/download/dmg-builder%401.2.0/dmgbuild-bundle-arm64-75c8a6c.tar.gz" -o dmgbuild-bundle.tar.gz && echo "a785f2a385c8c31996a089ef8e26361904b40c772d5ea65a36001212f1fc25e0  dmgbuild-bundle.tar.gz" | shasum -a 256 -c - && tar -xzf dmgbuild-bundle.tar.gz; }
```

Expected size is 20675673 bytes; the direct download can stall and needs a retry. Clean up the tarball after the build; the extracted `dmgbuild` script and `python/` directory persist for reuse.

### 4. Ask about clearing last build's output

Before building, ask the user whether to clear the previous build's output under `packages/desktop/release/`:

```bash
rm -rf packages/desktop/release/*   # proposed command; run only if the user confirms
```

This directory is git-ignored build output (DMG, zip, blockmap, `latest-mac.yml`, `mac-arm64/`). Default is not to clear unless the user says so — a fresh build overwrites same-name artifacts anyway, but leave no stale files from an older version behind if they want a clean slate.

### 5. Build

macOS (needs the dmgbuild bypass from step 3):

```bash
cd packages/desktop
CUSTOM_DMGBUILD_PATH=$HOME/anything/temp/dmgbuild npx electron-builder --config electron-builder.dev.yml
```

Linux / Windows (no env var needed):

```bash
cd packages/desktop
npx electron-builder --config electron-builder.dev.yml
```

Electron and workspace `dist` builds are reused from the last full `npm run build:desktop`, so this takes minutes. Confirm the log shows `Pruned native modules: ... MB removed` — absence means the name derivation regressed on macOS, or the resources path changed on Linux/Windows (they use `resources/` directly and are unaffected by the bundle rename).

### 6. Verify

**macOS:**

```bash
codesign -dv "release/mac-arm64/Paseo Dev.app" | grep flags          # flags=0x2(adhoc), NO runtime
codesign --verify --deep --strict "release/mac-arm64/Paseo Dev.app"
/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" -c "Print :CFBundleName" \
  "release/mac-arm64/Paseo Dev.app/Contents/Info.plist"               # sh.paseo.desktop.dev / Paseo Dev
cat "release/mac-arm64/Paseo Dev.app/Contents/Resources/app-update.yml"  # github, owner getpaseo, repo paseo
```

**Linux:**

```bash
ls -lh release/*.AppImage release/*.deb release/*.rpm release/*.tar.gz 2>/dev/null
grep -o 'name="[^"]*"' release/linux-unpacked/*.desktop | head -1     # Paseo Dev
cat release/linux-unpacked/resources/app-update.yml                    # github, owner getpaseo, repo paseo
```

**Windows:**

```bash
ls -lh release/*.exe release/*.zip 2>/dev/null
cat release/win-unpacked/resources/app-update.yml                      # github, owner getpaseo, repo paseo
```

No launch smoke test: launching a freshly built bundle against a running Paseo instance just hits the single-instance lock and tells you nothing. Leave launching to the user.

### 7. Copy the output folder path to the clipboard, clean up — never auto-install

**Never install or replace anything in `/Applications` yourself.** No auto-install, no auto-replace of an existing app. Installation is the user's call and only they run it.

Copy the build output folder's absolute path to the clipboard, then report **only** that single path — do not list the artifacts inside:

```bash
RELEASE_DIR="$(cd packages/desktop/release && pwd)"
if command -v pbcopy >/dev/null; then printf '%s' "$RELEASE_DIR" | pbcopy
elif command -v wl-copy >/dev/null; then printf '%s' "$RELEASE_DIR" | wl-copy
elif command -v xclip >/dev/null; then printf '%s' "$RELEASE_DIR" | xclip -selection clipboard
fi
echo "$RELEASE_DIR"
```

How clipboard copying works: `pbcopy` (macOS), `wl-copy` (Wayland) and `xclip -selection clipboard` (X11) read stdin and write it to the system clipboard. Use `printf '%s'` (or `echo -n`) instead of plain `echo` — `echo` appends a newline, and pasting then carries a trailing blank line. The `cd ... && pwd` pattern resolves the relative path to an absolute one regardless of the shell's starting directory. If no clipboard tool exists, just print the path.

`packages/desktop/release/` is git-ignored build output (app bundle, DMG, zip, blockmap, `latest-mac.yml`, `mac-arm64/`) — the folder is the artifact. Install command goes in the reply only if the user asks for it; never run it yourself. Then clean up the temp build files in the repo:

```bash
rm -f electron-builder.dev.yml scripts/after-pack.dev.js   # never leave temp files in the repo (they were generated by node scripts/make-dev-config.js)
```

## Behavior notes

- **Update install target**: electron-updater replaces the app at its own running location, not a fixed path. Installed as `Paseo Dev.app`, clicking install replaces that location with the latest release content; the released `Paseo.app` is only overwritten if the dev app is put there manually.
- **Version stamp**: comes from `packages/desktop/package.json` (e.g. `0.5.0-beta.3` on the dev branch). Until a newer release is published the updater reports no update — it checks the same GitHub feed as the release.
- **Install is manual, always**: the skill only builds and reports the output folder path (see step 7). The user installs/replaces the app themselves.
- **First launch (macOS)**: ad-hoc signed, so Gatekeeper needs right-click → Open once.
- **Never run release and dev together**: shared `~/.paseo`, port 6767, and Electron userData make them the same app.
