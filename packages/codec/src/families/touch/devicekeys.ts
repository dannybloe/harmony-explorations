/**
 * Which command each hard key of the Harmony One sends in a catalogue device's device mode, as Logitech's
 * compiler binds them: the touch family's `deviceModeKeys`, `todo-compile-one.md` 1.2.10.
 *
 * **Fitted to the One's own compiles, not carried over from the Harmony 650's `HARD_KEYS` by key name**,
 * which binds other commands to the same keys: on the One, Channel Up sends PresetNext on the Philips
 * 70FA930/00S and SkipForward's code on the Denon AVR-X4800H, OK comes before Select on the Select, Play,
 * Pause and Guide keys where the 650 has Select first, and the One has no colour keys. The population is
 * 33 catalogue devices of eight Logitech compiles for the One, each device's records named by matching
 * them with the catalogue's codes; the table reproduces 1521 of their 1526 key bindings, every miss on the
 * Denon AVR-28, whose iPod commands Logitech binds to no key where the Pioneer VSX-90TXV's take them, and
 * held out one entry at a time it predicts 1452 of 1480. Findings section 397 has the counts and the
 * control, and `test/composecatalogue.test.ts` scores the harvest's devices end to end.
 *
 * **Several orders are a choice**, no device offering both candidates: Exit's Clear against Exit and
 * Return against Back, every candidate of the skip, rewind and fast forward keys, Channel Up's ChannelUp
 * against TuneUp, and Select's OK against Enter. OK on Guide and Cancel on Previous channel have no device
 * of the population behind them and come from the 650's table and the account's Panasonic Blu-ray, a
 * control. Scans 27 and 29 are the direction keys and 36 and 26 the other pair of the four around them;
 * which of each pair is up is not read here, and 26 binds nothing on all 33 devices.
 */
import type { HardKey } from '../../devicemode.ts';

export const TOUCH_HARD_KEYS: readonly HardKey[] = [
  { scan: 40, button: 'Menu', prefer: ['Menu', 'Home'] },
  { scan: 2, button: 'Exit', prefer: ['Cancel', 'Exit', 'Clear', 'Return', 'Back'] },
  { scan: 3, button: 'Volume up', prefer: ['VolumeUp'] },
  { scan: 4, button: 'Volume down', prefer: ['VolumeDown'] },
  { scan: 9, button: 'Mute', prefer: ['Mute'] },
  { scan: 12, button: 'Number plus', prefer: ['.', '-', 'Delete', '*', 'Clear'] },
  { scan: 14, button: '0', prefer: ['0'] },
  { scan: 8, button: '1', prefer: ['1'] },
  { scan: 32, button: '2', prefer: ['2'] },
  { scan: 24, button: '3', prefer: ['3'] },
  { scan: 1, button: '4', prefer: ['4'] },
  { scan: 25, button: '5', prefer: ['5'] },
  { scan: 17, button: '6', prefer: ['6'] },
  { scan: 39, button: '7', prefer: ['7'] },
  { scan: 16, button: '8', prefer: ['8'] },
  { scan: 15, button: '9', prefer: ['9'] },
  { scan: 6, button: 'Skip back', prefer: ['ChapterPrev', 'SkipBack', 'PreviousTrack', 'iPodPrevious'] },
  { scan: 22, button: 'Skip forward', prefer: ['ChapterNext', 'SkipForward', 'NextTrack', 'iPodNext'] },
  { scan: 5, button: 'Rewind', prefer: ['Rewind', 'iPodRewind'] },
  { scan: 21, button: 'Fast forward', prefer: ['FastForward', 'iPodFastForward'] },
  { scan: 7, button: 'Record', prefer: ['Record'] },
  { scan: 19, button: 'Channel up', prefer: ['ChannelUp', 'TuneUp', 'PresetNext', 'DirectionUp'] },
  { scan: 20, button: 'Channel down', prefer: ['ChannelDown', 'TuneDown', 'PresetPrev', 'DirectionDown'] },
  { scan: 18, button: 'Guide', prefer: ['Guide', 'Select', 'Enter', 'OK'] },
  { scan: 10, button: 'Info', prefer: ['Info', 'Display', 'DirectionDown'] },
  { scan: 23, button: 'Stop', prefer: ['Stop', 'iPodStop', 'Return'] },
  { scan: 33, button: 'Right', prefer: ['DirectionRight'] },
  { scan: 11, button: 'Left', prefer: ['DirectionLeft'] },
  { scan: 27, button: 'Up or down', prefer: ['DirectionUp'] },
  { scan: 29, button: 'Down or up', prefer: ['DirectionDown'] },
  { scan: 36, button: 'Page up or down', prefer: ['PageUp'] },
  { scan: 35, button: 'Previous channel', prefer: ['ChannelPrev', 'Cancel', 'Return', 'Back'] },
  { scan: 30, button: 'Play', prefer: ['Play', 'iPodPlay', 'OK', 'Select'] },
  { scan: 31, button: 'Pause', prefer: ['Pause', 'iPodPause', 'OK', 'Select'] },
  { scan: 28, button: 'Select', prefer: ['OK', 'Select', 'Enter', 'Stop'] },
  // Not on the drawing, `packages/silhouettes`; NumberEnter on four devices, and Enter only where no other
  // key sends it, `HardKey.ifFree`.
  { scan: 13, button: 'Enter', prefer: ['NumberEnter'], ifFree: ['Enter'] },
];
