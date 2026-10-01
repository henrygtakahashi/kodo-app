# ble-app — Architecture

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
manager.startDeviceScan(null, { scanMode: ScanMode.LowLatency }, (err, d) => {
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

---

## 4. Expo Router entry point

`expo-router@~57.0.24` is **installed and wired up**:

- `package.json` → `"main": "expo-router/entry"`
- `app.json` → `"scheme": "bleapp"` (deep links into `device/[id]`, dev-client
  linking). Prebuild emits both `bleapp` and `exp+ble-app` schemes.
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
npx expo-doctor                  # 21 checks
npx expo prebuild --clean        # regenerate android/
npx expo run:android             # dev build
npx expo start --dev-client      # Metro
```

Expo Go cannot load BLE at all — native dev builds only.

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

- App name is a placeholder (`ble-app`).
- Background scanning (`isBackgroundEnabled`) off; revisit if the radar should
  keep logging while backgrounded.
- iOS deferred. Re-adding it means dropping `platforms` from `app.json`; note the
  design implications in DESIGN.md §5.
