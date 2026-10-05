# Play Console: privacy and Data safety

Answers for the Play Console's **App content** section, derived from what the
app actually does. Re-check them before any release that adds storage,
networking or an SDK.

## Privacy policy

URL: https://henrygtakahashi.github.io/blipfield-web/privacy

Source: the public `blipfield-web` repo (`privacy.html`), served by GitHub
Pages. Contact on the page: henryrezende.dev@gmail.com.

## What the answers rest on

Audited on 2026-10-05:

- No network calls in `src/`: no `fetch`, sockets or URLs. No analytics,
  crash-reporting, ads or update SDKs in `package.json`.
- Stored on the device only (`expo-sqlite` key-value store): favourites
  (address, broadcast name, label, kind, date), 1 m calibrations (address,
  name, RSSI), list preferences, theme.
- Devices in range live in memory and expire 10 s after their last packet.
- Clipboard is written only on an explicit Copy tap and never read.
- `INTERNET` is in the manifest (React Native includes it; the dev client
  needs it) but the release app sends nothing.

Play's definition of "collected" is data transmitted off the device. Data
processed only on the device is not collected and is not declared.

## Data safety form

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | Not asked once the answer above is No |
| Do you provide a way for users to request that their data is deleted? | Not asked; there are no accounts and nothing is collected |

Resulting label: "No data collected" and "No data shared with third
parties".

If Sentry or any other crash reporter is ever added, this changes to:
**Collected: App info and performance → Crash logs, Diagnostics**, not
shared, optional if behind a Settings opt-in. Update the privacy policy in
the same release.

## Other App content items

| Item | Answer |
|---|---|
| Ads | The app contains no ads |
| App access | All functionality is available without special access (no login) |
| Target audience | 13 and over. Not designed for children, so the Families policy does not apply |
| Content rating | Utility. No violence, sexual content, gambling, user interaction or sharing of location |
| News app | No |
| Government app | No |
| Financial features | None |
| Health | None |

### Permissions

No Play declaration form is needed:

- Location (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`) is capped at
  `maxSdkVersion="30"` and is foreground only, so the background-location
  declaration does not apply.
- `BLUETOOTH_SCAN` carries `neverForLocation`.
- No SMS, call log, accessibility, all-files or exact-alarm permissions.
