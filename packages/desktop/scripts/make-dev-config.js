// Generates the temporary dev build config from the release config:
//   - electron-builder.dev.yml      (from electron-builder.yml)
//   - scripts/after-pack.dev.js     (from scripts/after-pack.js)
//
// Run it, build with `--config electron-builder.dev.yml`, then delete both
// outputs. Keeping the transforms in one place means the dev config drifts with
// the release config instead of rotting when electron-builder.yml or
// after-pack.js gains a field (e.g. a new prune step). It also avoids the
// hand-written sed/replace that silently produces a ~246 MB oversized app when
// the derived-bundle-name change is dropped.
//
// Every override is applied through replaceExactly, which asserts the target
// string is still present exactly the expected number of times. A `.replace()`
// that silently no-ops (because the release config changed shape and the anchor
// no longer matches) is exactly the drift this script exists to catch, so it
// fails loudly instead of shipping a config missing a developer-facing override.
//
// Also prints a warning if any built `dist` output is older than its source, so
// you don't ship a stale bundle from a forgotten `npm run build:desktop`.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const YML = path.join(ROOT, "electron-builder.yml");
const AFTER_PACK = path.join(ROOT, "scripts", "after-pack.js");
const OUT_YML = path.join(ROOT, "electron-builder.dev.yml");
const OUT_AFTER_PACK = path.join(ROOT, "scripts", "after-pack.dev.js");

if (!fs.existsSync(YML) || !fs.existsSync(AFTER_PACK)) {
  console.error("release config not found; run this from packages/desktop");
  process.exit(1);
}

// Replace `from` with `to` in `src`, but only if `from` occurs exactly
// `expected` times. On any mismatch, print why and exit non-zero.
function replaceExactly(src, from, to, label, expected = 1) {
  let count = 0;
  for (let i = src.indexOf(from); i !== -1; i = src.indexOf(from, i + from.length)) {
    count++;
  }
  if (count !== expected) {
    console.error(
      `FAILED: expected "${label}" ${expected} time(s) but found ${count}. ` +
        `The release config or after-pack script likely changed; update make-dev-config.js.`,
    );
    process.exit(1);
  }
  return src.split(from).join(to);
}

// --- YAML: drop-in replacements for the fields the dev build overrides ---
let yml = fs.readFileSync(YML, "utf8");
yml = replaceExactly(yml, "appId: sh.paseo.desktop", "appId: sh.paseo.desktop.dev", "dev appId");
yml = replaceExactly(yml, "productName: Paseo", "productName: Paseo Dev", "dev productName");
yml = replaceExactly(
  yml,
  "executableName: Paseo",
  "executableName: Paseo Dev",
  "dev executableName",
);
yml = replaceExactly(
  yml,
  "afterPack: ./scripts/after-pack.js",
  "afterPack: ./scripts/after-pack.dev.js",
  "dev afterPack",
);
// Platform artifact names — prefix with "Paseo-Dev" so built files are
// distinguishable. Anchor mac and linux on the parent block plus a unique
// nearby line (mac icon is `assets/icon.icns`, linux icon is `assets` — distinct).
// win's artifactName line is unique ("Paseo-Setup-..."). appImage's artifactName
// uses ${arch} without ${version}, making the string itself unique.
yml = replaceExactly(
  yml,
  'mac:\n  artifactName: "Paseo-${version}-${arch}.${ext}"',
  'mac:\n  artifactName: "Paseo-Dev-${version}-${arch}.${ext}"',
  "mac artifactName",
);
yml = replaceExactly(
  yml,
  '  icon: assets\n  artifactName: "Paseo-${version}-${arch}.${ext}"',
  '  icon: assets\n  artifactName: "Paseo-Dev-${version}-${arch}.${ext}"',
  "linux artifactName",
);
yml = replaceExactly(
  yml,
  '"Paseo-${arch}.${ext}"',
  '"Paseo-Dev-${arch}.${ext}"',
  "appImage artifactName",
);
yml = replaceExactly(
  yml,
  'win:\n  artifactName: "Paseo-Setup-${version}-${arch}.${ext}"',
  'win:\n  artifactName: "Paseo-Dev-Setup-${version}-${arch}.${ext}"',
  "win artifactName",
);
yml = replaceExactly(
  yml,
  "hardenedRuntime: true",
  "hardenedRuntime: false",
  "disable hardened runtime",
);
yml = replaceExactly(yml, "notarize: true", "notarize: false", "disable notarize");

fs.writeFileSync(OUT_YML, yml);

// --- after-pack: derive the bundle name so native-module pruning still runs ---
let js = fs.readFileSync(AFTER_PACK, "utf8");
js = replaceExactly(
  js,
  'const EXECUTABLE_NAME = "Paseo";',
  `function getExecutableName(appOutDir) {
  // Derive the bundle name from appOutDir so pruning works even when the
  // bundle is renamed (e.g. "Paseo Dev.app" for the dev config). The release
  // config hardcodes "Paseo", which silently returns when the name differs.
  const appEntry = fs.readdirSync(appOutDir).find((entry) => entry.endsWith(".app"));
  return appEntry ? appEntry.replace(/\\.app$/, "") : "Paseo Dev";
}`,
  "EXECUTABLE_NAME const",
);
js = replaceExactly(
  js,
  "`${EXECUTABLE_NAME}.app`",
  "`${getExecutableName(appOutDir)}.app`",
  "EXECUTABLE_NAME use",
);

fs.writeFileSync(OUT_AFTER_PACK, js);

console.log(`wrote ${path.relative(ROOT, OUT_YML)}`);
console.log(`wrote ${path.relative(ROOT, OUT_AFTER_PACK)}`);

// --- dist freshness: warn if built output falls behind its source ---
const pairs = [
  [path.join(ROOT, "..", "app", "src"), path.join(ROOT, "..", "app", "dist")],
  [path.join(ROOT, "src"), path.join(ROOT, "dist")],
];
for (const [srcDir, distDir] of pairs) {
  if (!fs.existsSync(srcDir) || !fs.existsSync(distDir)) continue;
  const srcNewest = newestMtime(srcDir);
  const distNewest = newestMtime(distDir);
  if (srcNewest > distNewest) {
    console.warn(
      `WARNING: ${path.relative(ROOT, srcDir)} is more recent than ${path.relative(
        ROOT,
        distDir,
      )}. Run npm run build:desktop (and build:server/build:client if you changed those) before packaging — this bundle may contain stale code.`,
    );
  }
}

function newestMtime(dir) {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      newest = Math.max(newest, newestMtime(full));
    } else {
      try {
        newest = Math.max(newest, fs.statSync(full).mtimeMs);
      } catch {}
    }
  }
  return newest;
}
