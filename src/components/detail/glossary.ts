/**
 * Plain explanations behind the ⓘ buttons on the detail screen. Written for
 * someone who has never heard of Bluetooth LE; an expert never needs to open
 * one, so the screen itself can stay terse.
 */
export type Term =
  | 'signal'
  | 'interval'
  | 'seen'
  | 'packets'
  | 'cadence'
  | 'address'
  | 'advertisement'
  | 'connectable'
  | 'packet'
  | 'distance';

export const GLOSSARY: Record<Term, { title: string; body: string }> = {
  signal: {
    title: 'Signal strength (dBm)',
    body:
      'How strongly this phone hears the device, in decibel-milliwatts. Closer to zero is stronger: −45 is right next to you, −90 is barely audible.\n\n' +
      'It is not a distance by itself. Walls, bodies and the way a device is held all change it, so this screen shows a band (immediate, near, far, distant) and whether the signal is rising or falling. Hunt turns it into a rough distance range.',
  },
  interval: {
    title: 'Advertising interval',
    body:
      'How often the device announces itself. Every Bluetooth LE device repeats a short broadcast on a fixed rhythm, from 20 ms (50 times a second) to over 10 seconds.\n\n' +
      'The rhythm says a lot: beacons and devices being paired shout fast, trackers and sensors whisper slowly to save battery.',
  },
  seen: {
    title: 'Seen for',
    body: 'How long this phone has been hearing the device without a gap long enough to drop it from the list.',
  },
  packets: {
    title: 'Packets',
    body: 'How many broadcasts this phone has received from the device since it first appeared. Some broadcasts are always missed; Bluetooth scanning listens on one channel at a time.',
  },
  cadence: {
    title: 'Live signal and rhythm',
    body:
      'Both rows cover the last 10 seconds, with now on the right.\n\n' +
      'The line is the signal strength: higher is stronger. Each tick below it is one broadcast received, at the moment it arrived. A solid block means the device broadcasts faster than the eye can separate.',
  },
  address: {
    title: 'Address',
    body:
      'The hardware address the device is broadcasting under. Phones, Apple devices and many others change it every few minutes on purpose, so they cannot be tracked. When that happens, the same device appears as a new entry.',
  },
  advertisement: {
    title: 'What it is broadcasting',
    body:
      'Everything on this screen comes from the device’s public broadcast. The app never connects to it.\n\n' +
      'A broadcast is made of small labelled fields: a name, the manufacturer, a category, the services it offers. Each row here is one of those fields, decoded. The code next to it (0x09, 0xFF…) is the field’s official type number.',
  },
  connectable: {
    title: 'Accepts connections',
    body:
      'Whether the device lets other devices connect to it, for pairing or exchanging data. Broadcast-only devices, like beacons and many trackers, only ever announce themselves. This app does not connect either way.',
  },
  packet: {
    title: 'Raw packet',
    body:
      'The broadcast exactly as received, byte by byte. It is a run of fields, each one written as: a length byte, a type byte, then the data.\n\n' +
      'Android pads the packet with zeros to its full size; that padding is not part of what the device sent.',
  },
  distance: {
    title: 'Distance estimate',
    body:
      'A guess from signal strength, so it shows a range, not an exact figure. Walls and bodies can make a device seem further away.\n\n' +
      '"Uncalibrated" means the device does not say how strong it is, so the range can be off by 2–3 times. To fix it, hold the phone still, 1 m from the device, for 5 seconds and tap "Calibrate at 1 m".\n\n' +
      'Without calibration, still follow the trend: a shrinking range and WARMER mean you are getting closer.',
  },
};
