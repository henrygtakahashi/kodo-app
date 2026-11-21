const { withAndroidManifest } = require('@expo/config-plugins');

// Legacy Bluetooth permissions only apply up to Android 11 (API 30); Android 12+
// uses BLUETOOTH_SCAN / BLUETOOTH_CONNECT. react-native-ble-plx adds them without
// a cap, so cap them here. Adding them ourselves first is order-independent:
// the ble-plx plugin skips permissions that already exist.
const LEGACY = ['android.permission.BLUETOOTH', 'android.permission.BLUETOOTH_ADMIN'];

// The app is useless without BLE, so Play should hide it from devices that lack it.
const BLE_FEATURE = 'android.hardware.bluetooth_le';

module.exports = function withBleManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    manifest['uses-permission'] ??= [];
    for (const name of LEGACY) {
      let entry = manifest['uses-permission'].find((p) => p.$['android:name'] === name);
      if (!entry) {
        entry = { $: { 'android:name': name } };
        manifest['uses-permission'].push(entry);
      }
      entry.$['android:maxSdkVersion'] = '30';
    }

    manifest['uses-feature'] ??= [];
    if (!manifest['uses-feature'].some((f) => f.$['android:name'] === BLE_FEATURE)) {
      manifest['uses-feature'].push({ $: { 'android:name': BLE_FEATURE, 'android:required': 'true' } });
    }

    return config;
  });
};
