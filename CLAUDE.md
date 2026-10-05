# Blipfield - Bluetooth Hunt

Play Store title: "Blipfield: Bluetooth Hunt" (25 of 30 characters). Android package: `dev.henrytakahashi.blipfield` (permanent once uploaded to Play).

## Project Docs
Read these before proposing stack, UI or motion changes; keep them updated when a decision changes.
- `BRIEF.md` — v1.0 scope: Scanner, then Radar. Anything not in it is out of scope.
- `ARCHITECTURE.md` — environment, BLE layer, state management, verification.
- `DESIGN.md` — UI/animation stack (with SDK-pinned versions), Skia radar decision, motion budget.
- `AGENTS.md` — pre-existing repo conventions (Expo Router in `src/app/`, `npx expo install`, versioned-docs rule).
- `docs/play-console.md` — privacy policy URL, Data safety and App content answers; re-check before adding storage, networking or SDKs.

## Core Architecture & Stack
- Framework: React Native with Expo SDK (Continuous Native Generation / CNG).
- BLE Engine: `react-native-ble-plx` configured exclusively via its own bundled Expo config plugin (registered in `app.json` as `"react-native-ble-plx"`). Do NOT use `@config-plugins/react-native-ble-plx` — it is deprecated in favour of the built-in plugin and still pins `expo: ^49`. Permission behaviour is set through the plugin's props: `neverForLocation`, `isBackgroundEnabled`, `modes`, `bluetoothAlwaysPermission`.
- Native Environment: Development Client (`npx expo run:android`), NOT Expo Go.
- Platform Scope: Android only for now — `expo.platforms: ["android"]` in `app.json`. Do not add iOS config or an `ios/` dir until that changes.
- State Management: `zustand` for high-frequency scan stream updates.
- Styling & Animations: `react-native-reanimated` for 60/120 FPS radar animations.

## Development Rules
1. Never suggest Expo Go; all BLE testing requires native dev builds.
2. Android Permissions: Always configure `BLUETOOTH_SCAN` (`neverForLocation`), `BLUETOOTH_CONNECT`, and fallback `ACCESS_FINE_LOCATION` in `app.json`.
3. Performance: Scan callbacks fire at 5–20 Hz. Never trigger deep object clones or unmemoized re-renders on the JavaScript thread inside the scan listener.
4. Commands:
   - Lint & Typecheck: `npx tsc --noEmit`
   - Unit tests: `npm test` (Jest, `jest-expo` preset; pure `src/ble/` modules and `src/store/devices.ts`)
   - Prebuild test: `npx expo prebuild --clean`
   - Start Dev Client: `npx expo start --dev-client`
