# ble-app — Design, UI & Motion

Visual direction, UI stack, and motion rules for the BLE radar. Technical
architecture — BLE config, state management, build setup — lives in
[ARCHITECTURE.md](./ARCHITECTURE.md).

**Scope:** Android only for now. Sections note where a decision is platform-coupled.
**Verified:** 2026-09-29 against the project's actual dependency resolution.

---

## 1. Design intent

A scanner that does not look like a scanner. Store BLE apps are a scrolling list
of MAC addresses because composing native views makes that easy.

Refusing that default is not a licence to invent data — the radar was cut for
exactly that. Distinction has to come from something materially true about BLE
and currently invisible. It comes from **rhythm**.

Devices broadcast on intervals from 20 ms to 10.24 s. A Microsoft beacon at
118 ms draws a near-solid block; a watch at 231 ms a dense comb; a Find My tag at
2 s two lone ticks. The cadence identifies the kind of device before the name
does, and no app on the store shows it. Every pixel of it is measured.

The ground is paper, not near-black. Dark was the obvious choice for a scanner
and also the generic one — and hunting happens outdoors, where a near-black
screen is the hardest thing to read.

---

## 2. Data flow contract

The one architectural fact the render layer depends on. Full reasoning in
[ARCHITECTURE.md §3](./ARCHITECTURE.md#3-state-management).

| Concern | Lives in | Re-renders React? |
|---|---|---|
| Device *set* (appeared / dropped) | zustand store | Yes — infrequent |
| RSSI → radius, angle, trail | Reanimated shared values | **Never** |
| Advertisement stream (5–20 Hz) | Buffered `Map`, flushed ~8 Hz | No |

The 100–300 packets/sec stream must never reach React. Skia reads shared values
directly on the UI thread. Breaking this contract is the one change that will
cost the frame rate outright.

### Where the Scanner list fits

The 8 Hz store flush is deliberate, but it must not become 8 re-renders/sec of a
sorted list. Three separate subscriptions, not one:

| Subscribes to | Cadence | Re-renders |
|---|---|---|
| Ordered array of device **ids** | 3 s cooldown, suspended while the list is touched | the list |
| That device's own `rssi` | 8 Hz | one row's readout cell |
| Nothing — Reanimated shared values | every frame | nothing |

Membership changes (a device appears or expires) bypass the cooldown and land
within one 1 Hz sweep; only *reordering* waits. Explicit sort and filter changes
bypass it too — a control that takes 3 s to answer reads as broken.

The list container subscribes to an **id array only**, so an RSSI change cannot
re-render it. Each row selects its own value
(`useDeviceStore(s => s.devices[id]?.rssi)`), so a tick repaints one dBm cell.

Re-sort cadence is capped and paused on touch for a **UX** reason ahead of a
performance one: a signal-sorted list reordering 8×/sec moves rows out from under
the user's finger. Freezing order while scrolling costs nothing and is what makes
the sort usable at all.

**Cadence alone is not enough.** Raw RSSI swings ±10 dBm, so two devices of
similar strength trade places on *every* recompute no matter how slow it is. The
signal key is therefore quantized to 4 dBm buckets, with the row's previous
position as the tiebreaker inside a bucket. `last-seen` is bucketed to whole
seconds for the same reason.

Bucketing, not an "ignore differences under N" comparator: that comparator is
intransitive (a≈b, b≈c, yet a<c), and `Array.sort` is explicitly undefined for an
inconsistent comparator. Bucket-then-tiebreak stays transitive.

---

## 3. Stack

### Version pinning

SDK 57 pins several of these **behind** their npm `latest` tag. Gesture Handler is
a whole major version apart. Always `npx expo install`.

| Library | npm `latest` | SDK 57 pins |
|---|---|---|
| `react-native-reanimated` | 4.7.0 | **4.5.1** |
| `react-native-gesture-handler` | 3.3.0 | **~2.32.0** |
| `@shopify/react-native-skia` | 2.13.1 | **2.6.2** |
| `react-native-svg` | 15.15.5 | **15.15.4** |

### Install

```bash
npx expo install expo-router react-native-reanimated react-native-worklets \
  react-native-gesture-handler @shopify/react-native-skia \
  expo-haptics @expo/ui expo-linear-gradient expo-system-ui
```

| Layer | Library | Role |
|---|---|---|
| Radar canvas | `@shopify/react-native-skia` 2.6.2 | The differentiator (§4) |
| Motion engine | `react-native-reanimated` 4.5.1 | UI-thread animation |
| Worklets | `react-native-worklets` 0.10.1 | **Separate install**, required by Reanimated 4 |
| Gestures | `react-native-gesture-handler` ~2.32.0 | Pinch radar range, drag cards |
| Touch feel | `expo-haptics` ~57.0.3 | Garnish only — see §5 |
| Chrome | `@expo/ui` ~57.0.21 | Real Jetpack Compose on Android |
| Depth | `expo-linear-gradient` ~57.0.2 | Scrims over the canvas |
| Theme | `expo-system-ui` ~57.0.4 | Required for `userInterfaceStyle` on Android |
| Navigation | `expo-router` ~57.0.24 | Tabs + detail stack; needs an entry-point change, see ARCHITECTURE.md §4 |

Skia 2.6.2 peers (`react >=19`, `react-native >=0.78`, `reanimated >=3.19.1`) are
all satisfied.

### Rejected

| Skip | Use instead |
|---|---|
| `expo-blur` | Nothing — on Android it is only a semi-transparent view, not blur. Blur happens in Skia (§4). |
| `expo-glass-effect` | iOS-only. Revisit if iOS ships. |
| `@gorhom/bottom-sheet` | `@expo/ui` `BottomSheet` |
| `moti` | Reanimated CSS transitions — Moti wraps what we already have |
| `react-native-linear-gradient` | `expo-linear-gradient` |
| Core `Animated` | Reanimated — `useNativeDriver` only handles transform/opacity |
| `react-native-svg` for the radar | Skia. SVG drives updates through React; fine for static icons only |
| Lottie for UI state | Illustration and empty states only, never state indication |

---

## 4. Signal traces in Skia, not a radar

**The radar is removed.** A circle with blips at angles reads as 2D position
however the caption is worded — the *form* made a claim the data cannot support.
BLE gives distance, not bearing, so the display encodes exactly one measured
quantity per device and how it changes.

### Hunt, not a second list

The wall of traces that first replaced the radar was itself cut: a list of
devices with RSSI is what Scanner already is, and a sparkline does not make it a
different screen. Hunt shows **one** device — a dial, a trend state, and its
trace — because finding a specific thing is a different mode, not a different
chart.

| Channel | Encodes | Real? |
|---|---|---|
| Arc fill | smoothed RSSI, fixed −40…−100 scale | **Yes** |
| Trace Y | the same scale | **Yes** |
| Trace X | time, last 20 s | **Yes** |
| — | *no spatial channel exists* | — |

The Y scale is fixed, not per-row auto-scaled: auto-scaling would make rows
incomparable and magnify noise into apparent movement.

History is sampled on a fixed 4 Hz clock, never per packet. Sampling on arrival
would make the x-axis a function of how chattily each device advertises rather
than of time.

Trend compares the mean of the recent half of the window against the older half
and needs 3 dBm to register. Comparing endpoints would report the ±10 dBm noise
floor as movement.

### Why it is still Skia

Trace samples and the dial's fill live in shared values written from a store
subscription, and both paths are rebuilt in worklets — a signal change never
re-renders React. Should a multi-device trace view ever return, it must be a
single `<Canvas>`: one per row is one native surface per device, which is what
kills a list like that.

Trace samples live in shared values written from a store subscription and the
path is rebuilt in a worklet, so a signal change never re-renders React.

**Skia is also the blur.** Platform blur is unavailable on Android, so glow and
bloom are drawn with Skia's GPU blur shaders — real blur, not a fallback, and one
render path instead of per-platform compositing.

---

## 5. Android UI constraints

- **Never animate `elevation`.** Android re-rasterizes the shadow every frame.
  Crossfade a pre-shadowed layer, or draw the shadow in Skia.
- **Haptics are not load-bearing.** Silent on much Android hardware. The visual
  must stand alone. One per commit, never per frame, never on scroll.
- **Refresh rate varies (60/90/120 Hz).** Drive motion from elapsed time; never
  assume a frame interval. iOS needs a `CADisableMinimumFrameDurationOnPhone`
  opt-in for 120 Hz; Android does not.
- **`@expo/ui` `List` is not virtualized** — it is grouped Compose rows. The
  device list is unbounded and updates at 5–20 Hz, so use `FlatList`/`FlashList`.
  Reserve `@expo/ui` for the detail sheet and settings.
- **Ripple only in a Material-styled app.** In a custom-designed app a consistent
  `scale: 0.97` press reads more coherent across platforms.

---

## 6. Motion budget

The trap for an app aiming at "lots of cool animations" is animating the
**chrome**. High-frequency animation makes an app feel slow, not premium.

| Tier | Animate? | Here |
|---|---|---|
| 100+/day | **No** | Tab switches (`animation: 'none'`), list scroll, settings toggles |
| Tens/day | Under 150ms or nothing | Press feedback, row selection |
| Occasional | Standard | Device detail sheet, connect/disconnect |
| Rare | The delight budget | First-detection bloom, empty state, successful pairing |

**Continuous exception:** the range pulses and blip blooms. Not chrome — it is the app's
primary content, a live data display. Legitimately always-on.

Tabs must not slide; tabs are peers, and sliding implies a hierarchy that is not
there.

### Craft rules

- Feedback on press-in, commit on press-out. `scale: 0.97` in 100–150ms.
  Full-width rows highlight their background instead of scaling.
- 48dp minimum touch target; add `hitSlop` rather than growing the visual.
- Springs when a finger was involved (they carry velocity through an
  interruption); timing curves otherwise. Never `ease-in` on UI.
- Never `scale(0)` entrances — `scale(0.95)` + `opacity: 0`.
- Prefer `transform` and `opacity`. Everything else triggers a Yoga pass.
- Reduced motion ships *with* each animation, not after: keep opacity and colour
  changes, drop translation, scale, parallax and overshoot.

### Gotchas

- **Reanimated 4.5.1 rejects raw `'cubic-bezier(...)'` strings.** Use
  `cubicBezier()` from `react-native-reanimated` in CSS-style props, and
  `Easing.bezier()` in `withTiming`.
- Reanimated 4 without `react-native-worklets` installed throws
  `Failed to create a worklet` at runtime.
- `GestureHandlerRootView` must wrap the app or gestures silently do nothing.
- Never `setState` in a gesture or scroll handler.
- `scheduleOnRN` (not the deprecated `runOnJS`), and never per frame — use `onEnd`
  or a `useAnimatedReaction` threshold.
- Shared values via `.get()`/`.set()`; never read or write during render.

---

## 7. Judging feel

**Only a release build on the slowest supported Android counts.** A dev build's JS
thread is slow enough to hide exactly the jank worth finding, and Expo Go is not a
performance environment.

Per animation, check on device: flick it, interrupt it mid-flight, reverse it.
Gesture handoff and haptic timing cannot be judged from code.

---

## 8. Design tokens

Daylight technical. Values are computed against the paper ground, not estimated;
re-run the check in `src/theme/colors.ts` before changing one.

### Colour

| Token | Value | On `bg` |
|---|---|---|
| `bg` | `#F2F0EB` | paper |
| `surface` | `#FFFFFF` | |
| `surfaceRaised` | `#E7E3DA` | pressed |
| `border` | `#D6D2C8` | hairline |
| `textPrimary` | `#1A1814` | 15.56:1 — AAA |
| `textSecondary` | `#4A453D` | 8.34:1 — AAA |
| `textTertiary` | `#655F55` | 5.55:1 — AA |
| `signal` | `#0B6E4F` | 5.49:1 — AA |
| `warning` | `#8A5712` | 5.34:1 — AA |
| `danger` | `#B33A2B` | 5.18:1 — AA |

### Proximity bands, inverted

On paper the strongest band is the **darkest**, the reverse of the old dark
theme.

| Band | Value | On `bg` |
|---|---|---|
| `immediate` | `#15654C` | 6.15 |
| `near` | `#288164` | 4.18 |
| `far` | `#3E9378` | 3.26 |
| `distant` | `#539782` | 3.01 |

**A light ground caps the weak end.** At 3:1 — the floor for non-text graphics —
nothing lighter than relative luminance **0.2573** is legible on this paper, so
the whole ramp is squeezed into 0.0999 → 0.2558, a 2.6x spread. The same ramp on
near-black spanned nearly 10x.

That is a real consequence, not a detail: colour carries **less** of the ordinal
signal here. The band name and the position in the list must carry it, with
colour reinforcing rather than encoding alone.

### Type

Scale: **11 · 12 · 14 · 15 · 17 · 28**.

Numeric readouts use tabular figures — RSSI, intervals, hex. At 8 Hz a
proportional face changes glyph widths as digits change, so the value visibly
jitters and the row reflows. A correctness issue, not a stylistic one.

### Spacing, radius

Spacing on a 4 grid: **4 · 6 · 8 · 10 · 16 · 24**.
Radius: **3** (chips) · **10** (controls) · full (pills).

---

## 9. Open design decisions

**Resolved**

- **Theme is light, and light-only.** `userInterfaceStyle: "light"` with
  `expo-system-ui`. Hunting happens outdoors; a near-black screen is unreadable
  in sunlight. There is no `useColorScheme` branch anywhere.
- **Scanner is organised by cadence, not by row order** — see §1 and §4.
- **Tokens defined and contrast-verified** — see §8.
- **Proximity bands: fixed thresholds** — see §4.

**Still open**

- Dense cadence strips merge into a solid block above roughly 10 Hz. Density is
  itself the signal, so this may be correct as-is; worth a look on a very chatty
  beacon.
- App name is still a placeholder.
