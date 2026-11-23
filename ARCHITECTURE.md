# Kodo — Architecture

Technical architecture: environment, BLE layer, state management, verification.
For UI, motion and visual decisions see [DESIGN.md](./DESIGN.md).

**Scope:** Android only for now (`expo.platforms: ["android"]` in `app.json`).
**Verified:** 2026-09-29 against the project's actual dependency resolution.

---

## 1. Environment

| | Version |
|---|---|
| Expo SDK | ~57.0.26 |
| React Native | 0.86.3 (New Architecture only) |
| React | 19.2.3 |
| TypeScript | ~6.0.3 |

Continuous Native Generation: `android/` is generated and gitignored. Never edit
it by hand — configure native behaviour through `app.json` and config plugins.

---

## 2. BLE layer — implemented

`react-native-ble-plx@^3.5.1`, configured via **its own bundled Expo config
plugin**.

Do **not** use `@config-plugins/react-native-ble-plx`. It is deprecated on npm
("react-native-ble-plx@>=3.1.1 now ships with an Expo config plugin") and its
last release still pins `expo: ^49`, six SDKs behind this project.

```json
["react-native-ble-plx", {
  "neverForLocation": true,
  "isBackgroundEnabled": false,
  "bluetoothAlwaysPermission": "$(PRODUCT_NAME) uses Bluetooth to scan for nearby devices and show them on the radar."
}]
```

### Generated permissions (verified in `android/app/src/main/AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"
  android:usesPermissionFlags="neverForLocation" tools:targetApi="31"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission-sdk-23 android:name="android.permission.ACCESS_FINE_LOCATION"
  android:maxSdkVersion="30"/>
```

`ACCESS_FINE_LOCATION` is capped at `maxSdkVersion="30"` by `neverForLocation`.
That is intended: location is requested only as the pre-Android-12 fallback.

`plugins/with-ble-manifest.js` (registered in `app.json`) caps the legacy
`BLUETOOTH` and `BLUETOOTH_ADMIN` at `maxSdkVersion="30"`, which ble-plx adds
uncapped, and declares `<uses-feature android.hardware.bluetooth_le
required="true"/>` so Play hides the app from devices without BLE.
`android.blockedPermissions` strips `SYSTEM_ALERT_WINDOW` and
`READ/WRITE_EXTERNAL_STORAGE`, which prebuild adds by default and the app never
uses. Do not list Bluetooth permissions in `android.permissions`: the ble-plx
plugin already adds them.

Android autolinking resolves the module to `BlePlxPackage` with a codegen
`CMakeLists.txt`, so it is New-Architecture-ready — required, since RN 0.86 is
new-arch only.

### Plugin props available

`neverForLocation`, `isBackgroundEnabled`, `modes`, `bluetoothAlwaysPermission`.

`bluetoothAlwaysPermission` maps to iOS `NSBluetoothAlwaysUsageDescription` and is
**inert under the current Android-only scope** — prebuild confirms it produces no
Android output and no warning. It is kept deliberately: the string is already
written and correct, so iOS needs no rediscovery when it returns. Not a
contradiction of the platform boundary, just a dormant value.
Set `isBackgroundEnabled: true` to also emit
`<uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>`,
which restricts installs to BLE-capable devices. Currently off.

### Scan restarts

Android demotes an unfiltered scan to *opportunistic* after a timeout; from then
on the app only hears devices while another app is scanning, and the list
empties. AOSP's timeout is 30 min; the Samsung test phone (SDK 36) does it at
exactly 5 min:

```
ScanManager: Moving unfiltered scan to opportunistic scan for ScanClient(… appName=dev.henrytakahashi.kodo)
```

A scan filter would exempt it, but a scanner must see everything, so
`use-scan.ts` restarts the scan every 3 min (`RESCAN_MS`). Each restart is a new
scan client with a new timer. 3 min rather than 4 because JS timers drift on
device — one 4 min restart landed at 4 min 20 s. Verified over 11 min of logcat:
no demotion of the live scanner.

### One scan owner

`BleProvider` (gate + scan) is mounted once, in the root layout. ble-plx holds
a single native scan handle: a second `startDeviceScan` overwrites it without
disposing the first, and the orphaned scanner stays registered until the
process dies. With the provider in the tab layout, "Hunt this device" used
`router.replace('/hunt')`, which stacked a second `(tabs)` and so a second
provider and scan. Each hunt leaked one scanner; at 27 Android refused new
ones ("Cannot start scanning operation"), and every packet was delivered 27
times, inflating packet rates. The detail screen now uses
`router.dismissTo('/hunt')`. Check with
`adb shell dumpsys bluetooth_manager | grep -c "app: dev.henrytakahashi.kodo"`,
which should print 1.

---

## 3. State management

`zustand@^5.0.15` for the scan stream. **The reason is not speed.** Zustand peers
on `use-sync-external-store`; it *is* `useSyncExternalStore` plus ergonomics. Two
things plain `useState`/Context cannot do:

1. **Writes from outside React.** The scan callback lives in `startDeviceScan`,
   not in a component. `useStore.getState().upsert(d)` needs no hook and has no
   stale-closure problem. With `useState` you would capture state at subscribe
   time and have to resubscribe the scan to read current values.
2. **Selector-granular subscriptions.** Context re-renders every consumer on any
   change — a 30-device radar becomes 30 re-renders per advertisement packet.
   `useDeviceStore(s => s.devices[id]?.rssi)` re-renders one row.

### Coalescing the scan stream

Scan callbacks fire at 5–20 Hz **per device**; a busy room is 100–300/sec.
Neither state library survives a write per packet. Buffer outside React, flush on
a fixed cadence:

```ts
const pending = new Map<string, Device>()

// 5–20 Hz — touches no store, no React.
// allowDuplicates is iOS-only; LowLatency is the Android equivalent.
// legacyScan: false also admits BLE 5 extended advertisers.
manager.startDeviceScan(null, { scanMode: ScanMode.LowLatency, legacyScan: false }, (err, d) => {
  if (d) pending.set(d.id, d)
})

// ~8 Hz — one store write for the whole batch
setInterval(() => {
  if (pending.size === 0) return
  useDeviceStore.getState().merge(pending)   // mutate in place, no deep clone
  pending.clear()
}, 125)
```

### The staleness sweep is a second, independent timer

The flush above early-returns when nothing arrived — which is exactly the case
where a device has gone away. **A device that stops advertising produces no
packets, so a packet-driven loop can never notice it.** Expiry therefore needs its
own clock, independent of arrivals:

```ts
// ~1 Hz — runs even when nothing is advertising
setInterval(() => useDeviceStore.getState().sweepStale(), 1000)
```

`sweepStale` walks `lastSeen` and applies the two-stage thresholds from
[BRIEF.md §0](./BRIEF.md) — `live` → `stale` at 3 s, removed at 10 s. It must
**write only when something actually changed**, or it re-renders every subscriber
once a second for nothing.

Two timers, two jobs: 125 ms drains arrivals, 1000 ms ages out absences. Collapsing
them into one loop is the mistake that leaves permanent ghosts on the radar.

This is the contract the render layer depends on — see
[DESIGN.md §2](./DESIGN.md#2-data-flow-contract).

### Persistence

`expo-sqlite/kv-store`, through `src/storage/kv.ts`. Chosen for its synchronous
reads: a store hydrates before the first render, so the saved theme is on screen
from the first frame rather than the default flashing first.

| Store | What persists | How |
|---|---|---|
| Theme | `themeId` | zustand `persist`; an unknown id falls back to Graphite |
| Favorites | address, broadcast name, label, kind | zustand `persist` |
| Devices | sort, signal floor, named-only, favorites-only, legacy-only | by hand |
| Language | `system`, `en` or `pt-BR` | by hand (`src/i18n`); anything else reads as `system` |

The device store is persisted by hand because `persist` writes on every `set`,
and that store is written 8+ times a second. A subscriber checks references
first and writes only when a preference actually changed.

### Language

Every user-facing string lives in `src/i18n/en.ts`; `src/i18n/pt-BR.ts` is
typed against it, so a missing translation fails `tsc`. No i18n library: the
tables are plain objects, with functions where a string takes values or
plurals. Components read them with `useT()`, code outside React (alerts, the
store's search) with `getT()`. The pure BLE modules take the table as an
argument defaulting to English, so they and their tests stay free of native
imports.

The language follows the phone (`expo-localization`, re-read when the app
returns to the foreground, since Android changes it without a restart), unless
Settings overrides it. Any `pt` locale gets pt-BR; everything else English.
`supportedLocales` in `app.json` also lists both for Android 13's per-app
language setting. Labels the app makes up for unnamed devices ("Unknown
device") are stored in English and translated at display by `labelOf`, so a
language switch relabels devices already in the list. pt-BR numbers use a
decimal comma (`decimal()`).

---

## 4. Expo Router entry point

`expo-router@~57.0.24` is **installed and wired up**:

- `package.json` → `"main": "expo-router/entry"`
- `app.json` → `"scheme": "kodo"` (deep links into `device/[id]`, dev-client
  linking). Prebuild emits both `kodo` and `exp+kodo` schemes.
- `index.ts` and `App.tsx` are deleted; `src/app/_layout.tsx` is the entry.
- `tsconfig.json` → `paths: { "@/*": ["./src/*"] }`

`src/app/` (not `app/`) is the route root per AGENTS.md. Expo Router supports it:
its `getRootDir()` matches `/[\\/]src[\\/]app$/`.

**No `baseUrl`.** TypeScript 6.0.3 errors `TS5101: Option 'baseUrl' is deprecated`.
With `moduleResolution: "bundler"`, `paths` resolves relative to the tsconfig, so
`baseUrl` is unnecessary. Metro resolves the alias too — verified by a real
`npx expo export --platform android` bundle, not just by typecheck.

### Route tree

```
src/app/
├── _layout.tsx           Stack, headerShown: false, dark theme
├── (tabs)/
│   ├── _layout.tsx       NativeTabs — Scanner + Radar
│   ├── index.tsx         Scanner — the "/" route
│   └── radar.tsx
└── device/
    └── [id].tsx          Stack screen with a header, pushed over the tabs
```

Scanner is `index.tsx`, not `scanner.tsx`: Expo Router requires a route matching
`/`, and Scanner is the first screen built (§Why Scanner first in BRIEF.md).

Imports: `Stack` from `expo-router/stack`, `NativeTabs` from
`expo-router/unstable-native-tabs`, theme from `expo-router/react-navigation` —
never `@react-navigation/*` directly on SDK 56+.

Note: NativeTabs' `md=` icons pull in `@expo-google-fonts/material-symbols`
(~967 KB) via expo-router's own dependencies. Expected, not a stray install.

---

## 5. Verification

```bash
npx tsc --noEmit                 # typecheck
npm test                         # Jest unit tests
npx expo-doctor                  # 21 checks
npx expo prebuild --clean        # regenerate android/
npx expo run:android             # dev build
npx expo start --dev-client      # Metro
```

Expo Go cannot load BLE at all — native dev builds only.

Unit tests (`jest-expo`) cover what runs without a radio: advertisement
parsing, base64, smoothing and bands, distance and calibration, and the device
store (immediate listing, stale and expiry, ordering, filters). `jest.setup.ts`
swaps `expo-sqlite/kv-store` for an in-memory map. BLE itself, permissions and
rendering are verified on the phone, not in Jest.

A render error anywhere below the root lands on `ErrorBoundary` in
`src/app/_layout.tsx`, which shows `CrashScreen`: the error message, Try again,
and Copy error details for testers.

Release builds are not EAS. Distribution is GitHub Releases first, then
IzzyOnDroid (which republishes the GitHub APK with its original signature);
Google Play is deferred (decided 2026-11-21).

- **APK (GitHub / IzzyOnDroid):** `npm run build:apk` runs
  `expo prebuild --clean --platform android` and
  `./gradlew assembleRelease --build-cache
  -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
  -Pexpo.useLegacyPackaging=true` (phones only; x86 dropped, and native
  libraries compressed in the APK: v1.0.0-test was 75 MB with 54 MB of them
  stored uncompressed). `plugins/with-release-size.js` turns on R8 and
  resource shrinking for every release build (APK and AAB) and ABI splits
  for the APK, so `android/app/build/outputs/apk/release/` holds
  `app-arm64-v8a-release.apk`, `app-armeabi-v7a-release.apk` and
  `app-universal-release.apk`. v1.0.0 (one APK, no R8) was 43 MB: 14 MB of
  dex and ~11 MB of native libraries per ABI.
- **CI:** `.github/workflows/release.yml`. On a `v*` tag, which must equal
  `app.json`'s `version`, it uploads `kodo-vX.Y.Z-arm64-v8a.apk`,
  `kodo-vX.Y.Z-armeabi-v7a.apk` and `kodo-vX.Y.Z.apk` (universal), each with
  a `.sha256`, plus `kodo-vX.Y.Z-r8-mapping.txt` (to deobfuscate Java stack
  traces) to a **draft** release. The job summary lists APK sizes and warns
  when a per-ABI APK passes 30 MB, IzzyOnDroid's usual limit; IzzyOnDroid
  takes the arm64 APK. Run manually (Actions → Release APK → Run workflow) it
  builds the same files as a 14-day run artifact named
  `kodo-vX.Y.Z-test.<sha>`, with no tag or release. They are signed with the
  release key, so a later release installs over them.
  CI caches `~/.gradle/caches` and `~/.gradle/wrapper` (never
  `~/.gradle/gradle.properties`, which holds the secrets); native CMake builds
  are not cacheable.
- **R8 keep rules** for modules that use reflection or JNI without shipping
  consumer rules (ble-plx with RxAndroidBle, Skia, expo-sqlite,
  gesture-handler, screens) live in `with-release-size.js`. A new native
  dependency without consumer rules must be checked on a phone with a release
  build: R8 failures show up at runtime, not at build time.
- **AAB (Play, later):** `npm run build:android` → `bundleRelease`.

`plugins/with-release-signing.js` signs release builds with the Kodo release
key, read from `KODO_UPLOAD_STORE_FILE`, `KODO_UPLOAD_STORE_PASSWORD`,
`KODO_UPLOAD_KEY_ALIAS` and `KODO_UPLOAD_KEY_PASSWORD` in
`~/.gradle/gradle.properties` locally or from repository secrets
(`KODO_KEYSTORE_BASE64`, `KODO_KEYSTORE_PASSWORD`, `KODO_KEY_ALIAS`,
`KODO_KEY_PASSWORD`) in CI — never the repo. Without them any release task
fails; debug builds are unaffected. The same plugin sets
`dependenciesInfo.includeInApk = false`, since IzzyOnDroid and F-Droid reject
APKs carrying AGP's Google-encrypted dependency blob.

**One key for every channel.** Android only installs an update signed with the
same key. When Play is set up, choose to upload this key as the app signing key
in Play App Signing (not a Google-generated one), or Play and GitHub installs
will not update each other. Back the keystore and passwords up outside this
machine: losing them means users must uninstall to get updates.

Raise `android.versionCode` and `version` in `app.json` before every release.

---

## 6. Status

**Installed:** `react-native-ble-plx@^3.5.1`, `expo-dev-client@~57.0.19`,
`zustand@^5.0.15`, `expo-system-ui@~57.0.4`, and the routing set —
`expo-router@~57.0.24`, `react-native-screens@~4.26.0`,
`react-native-safe-area-context@~5.7.0`, `expo-linking@~57.0.11`,
`expo-constants@~57.0.20`. Typecheck clean, `expo-doctor` 21/21, Android prebuild
clean with BLE permissions and dark theme intact.

**Wired up:** BLE plugin, dark theme, `expo-router` navigation shell (§4).

**Next:** Scanner gate chain (BRIEF.md §0) — permissions, adapter state, and a
recoverable screen per failure. Screens under `(tabs)/` are placeholders.

**Not yet installed:** the UI and animation stack — see
[DESIGN.md §3](./DESIGN.md#3-stack).

### Open decisions

- Background scanning (`isBackgroundEnabled`) off; revisit if the radar should
  keep logging while backgrounded.
- iOS deferred. Re-adding it means dropping `platforms` from `app.json`; note the
  design implications in DESIGN.md §5.
