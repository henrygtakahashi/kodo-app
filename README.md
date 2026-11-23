# Kodo — Bluetooth Signal Hunt

Kodo lists the Bluetooth Low Energy devices around you and helps you walk to
one of them. It only listens: it never connects to, pairs with or writes to a
device. Everything it shows comes from what devices already broadcast.

- **Scanner** — every BLE device in range, with signal strength (dBm), vendor,
  device type, advertising interval and the raw advertisement for the curious.
- **Hunt** — pick a device and follow its signal. Shows an approximate
  distance (`≈ 1.2 m`, with a likely range), which you can calibrate at 1 m.
- Favourites and labels, English and Portuguese (Brazil), dark and light themes.

Android 7.0+ (API 24) with Bluetooth LE.

## Install

From the [latest release](https://github.com/henrygtakahashi/kodo-app/releases/latest), download one APK:

- `kodo-vX.Y.Z-arm64-v8a.apk` for almost every phone made since 2017. Pick this one if unsure.
- `kodo-vX.Y.Z-armeabi-v7a.apk` for older 32-bit phones.
- `kodo-vX.Y.Z.apk` works on both, but is larger.

Open it on your phone and allow installs from that source when Android asks.
Each APK has a `.sha256` file next to it that lets you check the download.

## Permissions and privacy

- **Nearby devices** (`BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`) on Android 12+.
  The scan permission is declared `neverForLocation`.
- **Location** only on Android 11 and older, where the system requires it
  for any Bluetooth scan. Foreground only.

No account, no ads, no analytics, no network calls. Favourites and
calibrations stay on the device.
[Privacy policy](https://henrygtakahashi.github.io/kodo-web/privacy).

## Build from source

Requires Node 22, JDK 17 and the Android SDK.

```sh
npm ci
npx tsc --noEmit && npm test
npx expo run:android          # development build on a connected phone
npm run build:apk             # signed release APK (needs the release key, see ARCHITECTURE.md §5)
```

Expo Go is not supported; BLE needs a native build.

## License

[MIT](./LICENSE) © 2026 Henry Takahashi
