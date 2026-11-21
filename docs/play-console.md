# Play Console: privacy and Data safety

Answers for the Play Console's **App content** section, derived from what the
app actually does. Re-check them before any release that adds storage,
networking or an SDK.

## Privacy policy

URL: https://henrygtakahashi.github.io/kodo-web/privacy

Portuguese (Brazil): https://henrygtakahashi.github.io/kodo-web/privacy-pt-br.
Play takes one policy URL per app, so the English one goes in the console;
each page links to the other.

Source: the public `kodo-web` repo (`privacy.html`, `privacy-pt-br.html`),
served by GitHub Pages. Contact on the page: henryrezende.dev@gmail.com.

## What the answers rest on

Audited on 2026-10-05:

- No network calls in `src/`: no `fetch`, sockets or URLs. No analytics,
  crash-reporting, ads or update SDKs in `package.json`.
- Stored on the device only (`expo-sqlite` key-value store): favourites
  (address, broadcast name, label, kind, date), 1 m calibrations (address,
  name, RSSI), list preferences, theme, language.
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

## Store listing

English (United States) is the default listing; Portuguese (Brazil) is added
as a translation under **Store presence → Main store listing → Manage
translations**. Limits: title 30, short description 80, full 4000 characters.
Neither language claims an exact distance: the app shows an approximate one.

### English (en-US)

Title (27): `Kodo: Bluetooth Signal Hunt`

Short description (80):
`Find a lost Bluetooth device by its signal, and see what is broadcasting nearby.`

Full description:

```
Lost your earbuds, watch or tracker? Kodo listens to the Bluetooth signals around you and helps you walk to the one you are looking for.

NEARBY
See every Bluetooth Low Energy device broadcasting around you: headphones, watches, TVs, trackers, beacons and more. Each one shows its signal strength and how often it broadcasts, live.
• Search by name or address, filter by signal, star your favorites
• Open any device to see what it is broadcasting, decoded field by field, down to the raw bytes

HUNT
Pick a device and walk. Kodo shows an approximate distance, the range it is likely in, and whether you are getting WARMER or COLDER, with a vibration as you close in.
• Calibrate a device at 1 m for a tighter estimate
• Bluetooth signal has no direction, so Kodo never pretends to: walk, and watch the distance shrink

PRIVATE BY DESIGN
• Passive only: Kodo never connects to or pairs with any device
• No account, no ads, no analytics
• Nothing leaves your phone

Available in English and Portuguese (Brazil).
```

### Portuguese, Brazil (pt-BR)

Title (27): `Kodo: Localizador Bluetooth`

Short description (79):
`Encontre um dispositivo Bluetooth perdido pelo sinal e veja o que há por perto.`

Full description:

```
Perdeu fones, relógio ou rastreador? O Kodo escuta os sinais Bluetooth ao redor e guia você até o dispositivo que está procurando.

POR PERTO
Veja todos os dispositivos Bluetooth Low Energy em broadcast ao seu redor: fones, relógios, TVs, rastreadores, beacons e mais. Cada um mostra o RSSI e o advertising interval, ao vivo.
• Busque por nome ou MAC Address, filtre por RSSI e marque favoritos
• Abra qualquer dispositivo para ver o Advertisement Data decodificado campo a campo, até o packet bruto

LOCALIZAR
Escolha um dispositivo e caminhe. O Kodo mostra uma distância aproximada, a faixa provável e se você está APROXIMANDO ou AFASTANDO, com vibração conforme chega perto.
• Calibre um dispositivo a 1 m para uma estimativa mais precisa
• O sinal Bluetooth não tem direção, e o Kodo não finge ter: caminhe e observe a distância diminuir

PRIVADO POR PADRÃO
• Scan passivo: o Kodo nunca se conecta nem pareia com nenhum dispositivo
• Sem conta, sem anúncios, sem analytics
• Nenhum dado sai do seu celular

Disponível em português (Brasil) e inglês.
```
