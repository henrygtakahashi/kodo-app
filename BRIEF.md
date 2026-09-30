# ble-app — v1.0 Feature Brief

**Scope:** strictly two sequential components. Nothing else ships in v1.0.

1. **Scanner** — Discovery & Diagnostics
2. **Radar** — Visual Spatial Tracker

Sequential in both senses: Scanner is built first, and Radar consumes the data
pipeline Scanner establishes. Radar adds no new BLE capability — it is a second
rendering of the same store.

> **Hard rule for v1.0: 100% passive listening.** The app never opens a
> connection. No `device.connect()`, no service or characteristic discovery, no
> `requestMTU()`, no `readRSSI()`, no bonding. Every value displayed comes from the
> scan advertisement. This is an architectural boundary, not a backlog item — see
> §5.

Related: [ARCHITECTURE.md](./ARCHITECTURE.md) · [DESIGN.md](./DESIGN.md)

---

## 0. Shared foundations

Both components depend on these. They are Scanner's cost to pay, and Radar
inherits them for free.

**Gate chain.** Nothing renders until each step passes, each with its own
recoverable UI state:

1. Runtime permissions — **`BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` requested
   together** on Android 12+ via `requestMultiple`; `ACCESS_FINE_LOCATION` on
   Android ≤ 11. Both Bluetooth permissions belong to Android 12+'s **Nearby
   devices** permission group, so the user sees a single dialog either way —
   requesting both costs nothing in UX and guarantees `device.name` resolves
   whenever the OS will provide it. Requesting only `SCAN` would risk a `null`
   name for no benefit.
2. Location services enabled — required for scanning on Android ≤ 11 only.
3. Adapter state — `BleManager.onStateChange`. Only `PoweredOn` proceeds;
   `PoweredOff`, `Unauthorized`, `Unsupported`, `Resetting`, `Unknown` each need
   distinct copy. `Unsupported` is terminal.

Permission denial must be distinguishable from "denied forever" (needs a settings
deep-link).

**Device staleness.** BLE has no "device left" event. A device that stops
advertising is indistinguishable from one out of range. Every device carries
`lastSeen`; a sweep expires entries past a TTL. **This is a correctness
requirement, not polish** — without it the list only ever grows and the radar
fills with ghosts.

**Two-stage expiry**, because one threshold cannot serve both goals. Advertising
intervals range from 20 ms to 10.24 s by spec, and power-saving devices sit at the
slow end, so a short TTL flickers legitimate devices out and back:

| Age since `lastSeen` | State | Treatment |
|---|---|---|
| < 3 s | live | normal |
| 3–10 s | stale | dimmed, position frozen, still listed |
| > 10 s | expired | removed from the store |

Stale is the important state: it says "not heard from recently" without claiming
the device left. Expiry fades a blip out rather than popping it.

**RSSI smoothing.** Raw RSSI swings ±10 dBm on a stationary device. All display
and positioning reads an EMA; raw is retained per device for the diagnostics view
only. Shared by both components — the Scanner's signal column and the Radar's
radius must agree.

**No distance estimate in v1.0.** `txPowerLevel` is usually `null`, so a path-loss
model would be uncalibrated guesswork, and a wrong metre figure is worse than no
figure. The split: **Scanner shows dBm** (an honest measurement in its real unit),
**Radar shows bands** (a derived judgement). Neither shows metres.

---

## 1. Scanner — Discovery & Diagnostics

**Purpose:** answer "what is around me, and what can I learn about it without
touching it."

### Diagnostics — strictly passive

Everything below arrives on the scan callback with no connection, no battery cost,
and no failure mode. This is the entirety of v1.0's data surface:

| Field | Use |
|---|---|
| `id` | Identity (MAC on Android) |
| `name`, `localName` | Display; both frequently `null` |
| `rssi` | Signal strength → smoothed, drives both components |
| `txPowerLevel` | Calibration input for distance estimation; often `null` |
| `manufacturerData` | Vendor inference via company ID prefix |
| `serviceUUIDs`, `serviceData` | Capability inference (heart rate, battery, …) |
| `isConnectable` | Displayed as observed metadata only — v1.0 never acts on it |
| `rawScanRecord` | Raw hex view for the power user |

Derived: vendor from company ID, device-type guess from service UUIDs, advertising
interval from arrival timestamps.

### Device identity

Most devices advertise no name, so identity is constructed. Label falls back in
order:

`name` → `localName` → inferred type from service UUIDs → vendor from company ID →
`"Unknown device"`

Every row also carries the **last two octets of the id** as a disambiguator — a
screen of identical "Unknown device" rows is useless — and a **stable colour and
glyph derived from a hash of the device id**. That is the *same hash* the Radar
uses for blip angle: one derivation, two uses, so a device keeps its colour and its
position across sessions and becomes recognisable by sight.

### UX surface

- Device list — virtualized (`FlatList`/`FlashList`), never `@expo/ui` `List`
- Row: name-or-fallback, signal, vendor, last-seen, advertising-mode marker
  (connectable vs. broadcast-only — diagnostic information, not an affordance)
- Sort: signal · name · first-seen · last-seen — **order is recomputed on a ~1 Hz
  cadence, not per RSSI tick**, and is suspended while the user is touching the
  list. See DESIGN.md §2: a signal-sorted list that reorders 8×/sec is unusable
  regardless of frame rate — rows move out from under the finger.
- Filter: name/id search, minimum RSSI, named-only
- Detail screen: advertisement fields, derived values, raw record — read-only,
  with no connect affordance anywhere in the UI
- Scan control: start/stop, with a visible scanning indicator
- Empty state distinguishing "scanning, nothing yet" from "scan not running"

### Acceptance criteria

- Survives a dense environment (30+ devices) without dropping frames; verified on
  a release build on the slowest target device.
- Devices leaving range disappear within one TTL window.
- Every gate-chain failure has a recoverable screen; none dead-ends.
- An unnamed device is still usefully identifiable.
- Scanning stops on background/unmount — no leaked scan.
- **No connection is ever attempted.** `connect()` appears nowhere in the
  codebase; the UI offers no path to it.

---

## 2. Radar — Visual Spatial Tracker

**Purpose:** find a specific device by moving, rather than by reading numbers.

### The constraint that defines this feature

**BLE on a single-antenna phone gives distance, not direction.** There is no
bearing to a device. Any radar that shows a device at a compass position is
inventing it.

v1.0 is therefore honest about what it is: **a proximity hunter, not a compass.**
Radius is real (signal-derived). Angle is not.

Consequences, all load-bearing:

- **Angle is deterministic per device**, derived from a hash of its id — stable
  across frames and sessions, so a blip never jumps. It carries no spatial
  meaning and the UI must not imply otherwise.
- **Radius is smoothed RSSI** mapped to proximity bands (immediate / near / far /
  distant), not a false-precision metre reading.
- **No rotating sweep line** — it implies directional sampling. Concentric pulses
  expanding outward read as *range* instead. Approved and recorded in
  [DESIGN.md §4](./DESIGN.md#4-render-the-radar-in-skia-not-composed-views).

### What makes it actually useful

Hot/cold hunting. Walking changes RSSI; the radar makes that change legible at a
glance. The valuable signals are **trend and rate**, not position:

- Blip moves inward/outward as you approach or retreat
- A short trail showing the last few seconds of approach
- Single-device focus mode — tap a blip to lock onto it, everything else recedes
- Haptic or visual confirmation on entering the nearest band

### UX surface

- One Skia `<Canvas>` for the whole scene (see DESIGN.md §4)
- Proximity band rings with band labels, not numeric distances
- **Tap a blip = focus it** (target lock). This is the radar's primary action —
  hunting is the feature, so the cheapest gesture serves it.
- The focused device raises a compact card; **tapping that card** navigates to
  `device/[id]`. Detail is deliberately the secondary action, one level removed.
- Tap the empty canvas to clear focus
- Reuses the Scanner's gate chain unchanged

Tap cannot both toggle canvas focus and navigate, so focus wins the tap and detail
moves to the card. Long-press is not used for detail — it is undiscoverable for the
primary path a user needs.

### Acceptance criteria

- Holds frame rate with 30+ blips on a release build on the slowest target device.
- The advertisement stream never re-renders React — the §0 contract holds.
- Blips do not jitter when a device is stationary (smoothing is doing its job).
- Walking toward a device produces unmistakable inward motion within ~2 seconds.
- The UI never implies directional accuracy it does not have.

---

## 3. Navigation

**Two tabs over one screen with a mode toggle.** Scanner and Radar are peers
rendering the same store, which is what tabs mean; a toggle would imply one is a
sub-mode of the other. A detail screen reachable from both needs real back
handling, which is where hand-rolled navigation state stops paying.

`expo-router` with `NativeTabs`, routes under `src/app/` per the project
convention in AGENTS.md. Tabs must not slide — `animation: 'none'` (DESIGN.md §6).

```
src/app/
├── _layout.tsx           Stack (headerShown: false)
├── (tabs)/
│   ├── _layout.tsx       NativeTabs — scanner + radar
│   ├── scanner.tsx
│   └── radar.tsx
└── device/
    └── [id].tsx          Stack screen, pushed over the tabs
```

**The root layout must be the Stack, not the tabs.** If `app/_layout.tsx` rendered
the tab navigator directly, `device/[id].tsx` would be registered as another tab
route, and there would be no parent stack — so pushing the detail screen, its
native header, and hardware-back popping would all have nowhere to go. Tabs nest
one level down inside `(tabs)/_layout.tsx`.

---

## 4. Why Scanner first

Scanner forces every hard problem into the open: the gate chain, the staleness
sweep, smoothing, and the coalescing store. All are invisible infrastructure that
the Radar would otherwise have to debug *through* an animation layer — the worst
possible place to find out the TTL is wrong.

Scanner is also independently shippable. Radar is not: without a proven pipeline
it is a demo.

---

## 5. Out of scope for v1.0

Named explicitly so they do not creep in:

- Background scanning and logging (`isBackgroundEnabled` stays off)
- **All active BLE operations** — `connect()`, GATT service and characteristic
  discovery, characteristic reads or writes, notifications/subscriptions,
  `requestMTU()`, `requestConnectionPriority()`, connected-mode `readRSSI()`,
  and bonding/pairing flows
- Persistence and scan history across launches
- Device nicknaming, favourites, tagging
- Export/share of scan data
- Multi-device trilateration or any real direction-finding
- iOS (`expo.platforms: ["android"]`)
- Onboarding, settings beyond what the gate chain needs, analytics

---

## 6. Resolved

| Decision | Where |
|---|---|
| 100% passive listening — no connections in v1.0 | hard rule above, §5 |
| `lastSeen` TTL sweep, two-stage (3 s stale / 10 s expire) | §0 |
| EMA smoothing; no distance estimate — dBm in Scanner, bands in Radar | §0 |
| Pulses not a sweep; angle is a deterministic id hash | DESIGN.md §4 |
| Proximity bands use fixed RSSI thresholds, not auto-scaling | DESIGN.md §4 |
| Unnamed-device identity: fallback chain + id-hash colour | §1 |
| Two tabs via `expo-router`, shared detail route | §3 |
| Theme dark; tokens defined | DESIGN.md §8 |
| Request `SCAN` + `CONNECT` together (one Nearby-devices dialog) | §0 |

---

## 7. Open questions

**None blocking.** Every architectural decision for v1.0 is settled.

### Tuning targets, not open questions

Two sets of numbers are defensible starting values that want a real dense
environment to calibrate. Neither blocks implementation:

| Value | Starting point |
|---|---|
| Proximity band thresholds | −55 / −70 / −85 dBm |
| Staleness thresholds | 3 s stale · 10 s expire |
