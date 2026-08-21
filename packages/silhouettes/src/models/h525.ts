/**
 * The Harmony 525, skin 22, architecture 9.
 *
 * **Geometry from a traced drawing, read by a person.** The drawing is a hand trace of Logitech's own
 * documentation and lives in the lab; `bin/extract.ts` moves it into this package's coordinates. Only
 * the **shapes and the contours** come from it. The symbols and the words are ours, drawn from
 * `src/icons.ts` and typeset here, and they are read off the **photograph** rather than off the
 * document, which is Danny's decision of 21 August 2026: the document printed text on the two central
 * bars that the product does not have.
 *
 * Two consequences of reading the photograph, worth stating because they are silent losses otherwise.
 * The document prints `Off` under the power key and the product prints nothing, so there is no label
 * here. And the four teletext keys carry a coloured **dot** on this model where a Harmony 600 carries a
 * bar, which is why `icons.ts` grew a `dot`.
 *
 * **No scan code appears anywhere in here, and that is not an omission**: `reference/button-maps.md` has
 * no arch 9 table at all, because the calibration configs were compiled for the two bench remotes. A
 * test refuses a `data-scan` in this file.
 *
 * **The four soft keys do carry candidates, from a different source.** `docs/findings.md` section 89
 * derives the matrix from the firmware as 8 by 8 with `scan = group * 8 + column`, and it pins those
 * four to the set 30, 31, 38 and 39 without saying which is which, because nothing establishes which of
 * columns 6 and 7 is the left one. So all four carry the same four candidates, which is what says the
 * block is known and the assignment inside it is not. Picking one would pass every test here while
 * telling an interface something false.
 *
 * The nameplate reads `Harmony 520` on the photograph, which is the same case under a different skin.
 * The drawing is the 525's.
 */
import { segment, traced } from '../shapes.ts';
import { CASE_HEIGHT } from '../types.ts';
import type { Key, Model, Region, Rocker } from '../types.ts';

const REGIONS: readonly Region[] = [
  // The top face, which on the product is the dark band the infrared window sits in.
  { id: 'top-band', form: 'recess', path: 'M 128.119 0 C 49.02 0.113 0 12.733 0 12.733 L 0 38.906 L 259.787 38.906 L 259.787 12.733 C 259.787 12.733 207.206 -0.11 128.119 0 Z' },
  /**
   * The inner panel: the dark face the keys sit on, whose lower edge **is** the outer edge of the
   * volume, channel and Glow band. That is why it is a line and not a filled area: it is one continuous
   * stroke in the drawing, and the band below it is built out of it.
   */
  { id: 'panel', form: 'seam', path: 'M 16.868 38.906 L 16.868 598.782 C 16.868 657.324 66.214 704.78 127.072 704.78 L 134.743 704.78 C 195.611 704.78 244.957 657.324 244.957 598.782 L 244.957 38.906 L 16.868 38.906 Z' },
  // The illuminated bezel around the Activities key, which glows blue on the product.
  { id: 'activities-bezel', form: 'seam', path: 'M 189.183 69.79 C 189.183 77.501 183.043 83.751 175.465 83.751 L 85.267 83.751 C 77.689 83.751 71.549 77.501 71.549 69.79 C 71.549 62.089 77.689 55.839 85.267 55.839 L 175.465 55.839 C 183.043 55.839 189.183 62.089 189.183 69.79 Z' },
  { id: 'screen-bezel', form: 'recess', path: 'M 213.401 261.855 C 213.401 267.811 209.402 272.633 204.47 272.633 L 55.197 272.633 C 50.263 272.633 46.263 267.811 46.263 261.855 L 46.263 172.919 C 46.263 166.965 50.263 162.141 55.197 162.141 L 204.47 162.141 C 209.402 162.141 213.401 166.965 213.401 172.919 L 213.401 261.855 Z' },
];

/**
 * The mouldings.
 *
 * Eight of them, more than either bench remote, and that is what this model is: almost every key on a
 * Harmony 525 is half of a longer part. The four horizontal bars each hold two keys, each rail beside
 * the screen holds two, the direction pad holds four, and the band around it holds five.
 *
 * **The band is the one shape here that was built rather than taken.** The drawing states its two edges
 * as separate strokes and nothing closes it, so there are no five key shapes in the file to take. It is
 * closed by joining the inner edge to the lower half of the panel outline, with each of that outline's
 * cubics reversed by swapping its control points, so every number in it is still the drawing's own. The
 * five keys are then wedges from the pad centre, cut at the angles the drawing's own seams sit at: 88.5
 * and 135.2 degrees clockwise from twelve on the channel side, 273.1 and 222.6 on the volume side.
 *
 * **The two end wedges run to twelve o'clock and not to the band's own ends**, which were 58.9 either
 * way and are gone. A segment is the moulding clipped by the wedge, so a cut only has to separate one
 * key from its neighbour: where a key ends because the part ends, the moulding already says so. Cutting
 * at 58.9 instead ran a radial line straight across the strip's shoulder and lopped its inner half off,
 * which is invisible in an outline and obvious the moment a key is filled, since the fill then stops on
 * a diagonal rather than following the strip. Extending to twelve costs nothing because the band does
 * not exist above the pad: the ray leaves through the open top of the U.
 */
const ROCKERS: readonly Rocker[] = [
  {
    id: 'rocker-ring',
    keys: ['ChannelUp', 'ChannelDown', 'Glow', 'VolumeDown', 'VolumeUp'],
    seams: ['M 186.687 658.562 L 206.87 679.091', 'M 74.045 660.006 L 54.458 679.938', 'M 244.35 597.441 L 216.223 597.441', 'M 44.609 595.835 L 16.484 595.835'],
    labels: [{ text: 'Vol.', place: 'on', x: 30.54, y: 591, size: 'small' },
             { text: 'Ch.', place: 'on', x: 231.33, y: 591, size: 'small' }],
    path: 'M 16.868 530.443 C 44.264 530.443 44.123 559.305 44.123 559.305 L 44.208 558.743 L 44.208 608.212 C 44.208 638.775 83.041 678.295 130.959 678.295 C 178.866 678.295 217.701 638.775 217.701 590.026 L 217.701 558.743 C 217.701 558.743 217.561 529.882 244.957 529.882 L 244.957 598.782 C 244.957 657.324 195.611 704.78 134.743 704.78 L 127.072 704.78 C 66.214 704.78 16.868 657.324 16.868 598.782 Z',
  },
  {
    id: 'rocker-pad',
    keys: ['DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft'],
    path: 'M 183.986 600.433 C 183.986 631.412 159.309 656.522 128.866 656.522 C 98.423 656.522 73.744 631.412 73.744 600.433 C 73.744 569.454 98.423 544.344 128.866 544.344 C 159.309 544.344 183.986 569.454 183.986 600.433 Z',
  },
  {
    id: 'rocker-rail-left',
    keys: ['SoftUpperLeft', 'SoftLowerLeft'],
    seams: ['M 16.53 224.808 L 28.07 224.808'],
    path: 'M 17.783 177.327 C 17.522 177.327 17.259 177.355 16.988 177.372 L 16.988 276.074 C 17.259 276.091 17.522 276.109 17.783 276.109 C 23.727 276.109 28.538 271.217 28.538 265.175 L 28.538 188.271 C 28.538 182.229 23.727 177.327 17.783 177.327 Z',
  },
  {
    id: 'rocker-rail-right',
    keys: ['SoftUpperRight', 'SoftLowerRight'],
    seams: ['M 233.098 224.808 L 244.638 224.808'],
    path: 'M 243.854 177.327 C 244.117 177.327 244.378 177.355 244.638 177.372 L 244.638 276.074 C 244.378 276.091 244.117 276.109 243.854 276.109 C 237.912 276.109 233.098 271.217 233.098 265.175 L 233.098 188.271 C 233.098 182.229 237.912 177.327 243.854 177.327 Z',
  },
  {
    id: 'rocker-bar-activity',
    keys: ['Devices', 'Help'],
    seams: ['M 130.269 98.894 L 130.269 108.264'],
    path: 'M 220.766 103.475 C 220.766 108.585 216.103 112.732 210.346 112.732 L 50.777 112.732 C 45.02 112.732 40.359 108.585 40.359 103.475 C 40.359 98.358 45.02 94.218 50.777 94.218 L 210.346 94.218 C 216.103 94.218 220.766 98.358 220.766 103.475 Z',
  },
  {
    id: 'rocker-bar-page',
    keys: ['ScreenPrev', 'ScreenNext'],
    seams: ['M 130.583 296.094 L 130.583 305.472'],
    path: 'M 220.766 300.725 C 220.766 305.842 216.103 309.985 210.346 309.985 L 50.777 309.985 C 45.02 309.985 40.359 305.842 40.359 300.725 C 40.359 295.61 45.02 291.468 50.777 291.468 L 210.346 291.468 C 216.103 291.468 220.766 295.61 220.766 300.725 Z',
  },
  {
    id: 'rocker-bar-guide',
    keys: ['Guide', 'Info'],
    seams: ['M 129.946 441.715 L 129.946 451.093'],
    path: 'M 221.821 446.988 C 221.821 452.105 217.15 456.245 211.401 456.245 L 51.832 456.245 C 46.078 456.245 41.414 452.105 41.414 446.988 C 41.414 441.871 46.078 437.731 51.832 437.731 L 211.401 437.731 C 217.15 437.731 221.821 441.871 221.821 446.988 Z',
  },
  {
    id: 'rocker-bar-exit',
    keys: ['Exit', 'Menu'],
    seams: ['M 129.931 474.897 L 129.931 484.277'],
    path: 'M 221.821 480.802 C 221.821 485.911 217.15 490.059 211.401 490.059 L 51.832 490.059 C 46.078 490.059 41.414 485.911 41.414 480.802 C 41.414 475.684 46.078 471.544 51.832 471.544 L 211.401 471.544 C 217.15 471.544 221.821 475.684 221.821 480.802 Z',
  },
];

/**
 * The keys.
 *
 * Every one is `src: 'printed'`, since nothing about this model has been measured through a config we had
 * compiled: a name comes from the marking on the product, or from Logitech's own vocabulary where the
 * marking is a symbol.
 */
const KEYS: readonly Key[] = [
  { name: 'AllOff', src: 'printed', kind: 'keypad', shape: traced('M 58.55 38.933 C 58.55 45.9 53.002 51.543 46.161 51.543 C 39.312 51.543 33.761 45.9 33.761 38.933 C 33.761 31.967 39.312 26.321 46.161 26.321 C 53.002 26.321 58.55 31.967 58.55 38.933 Z'), angle: 0, icon: 'power', markSize: 14 },
  { name: 'Activities', src: 'printed', kind: 'keypad', shape: traced('M 182.194 69.79 C 182.194 74.243 178.65 77.846 174.277 77.846 L 86.452 77.846 C 82.079 77.846 78.538 74.243 78.538 69.79 C 78.538 65.349 82.079 61.743 86.452 61.743 L 174.277 61.743 C 178.65 61.743 182.194 65.349 182.194 69.79 Z'), angle: 0, labels: [{ text: 'Activities', place: 'on' }] },
  { name: 'Devices', src: 'printed', kind: 'keypad', shape: segment('M 40.359 94.218 L 130.563 94.218 L 130.563 112.732 L 40.359 112.732 Z'), angle: 0, labels: [{ text: 'Devices', place: 'on' }] },
  { name: 'Help', src: 'printed', kind: 'keypad', shape: segment('M 130.563 94.218 L 220.766 94.218 L 220.766 112.732 L 130.563 112.732 Z'), angle: 0, labels: [{ text: 'Help', place: 'on' }] },
  { name: 'SoftUpperLeft', src: 'printed', kind: 'screen', shape: segment('M 16.988 177.327 L 28.538 177.327 L 28.538 226.718 L 16.988 226.718 Z'), angle: 0, icon: 'dash', scanCandidates: [30, 31, 38, 39], zone: 1, markSize: 8 },
  { name: 'SoftLowerLeft', src: 'printed', kind: 'screen', shape: segment('M 16.988 226.718 L 28.538 226.718 L 28.538 276.109 L 16.988 276.109 Z'), angle: 0, icon: 'dash', scanCandidates: [30, 31, 38, 39], zone: 3, markSize: 8 },
  { name: 'SoftUpperRight', src: 'printed', kind: 'screen', shape: segment('M 233.098 177.327 L 244.638 177.327 L 244.638 226.718 L 233.098 226.718 Z'), angle: 0, icon: 'dash', scanCandidates: [30, 31, 38, 39], zone: 2, markSize: 8 },
  { name: 'SoftLowerRight', src: 'printed', kind: 'screen', shape: segment('M 233.098 226.718 L 244.638 226.718 L 244.638 276.109 L 233.098 276.109 Z'), angle: 0, icon: 'dash', scanCandidates: [30, 31, 38, 39], zone: 4, markSize: 8 },
  { name: 'ScreenPrev', src: 'printed', kind: 'screen', shape: segment('M 40.359 291.468 L 130.563 291.468 L 130.563 309.985 L 40.359 309.985 Z'), angle: 0, icon: 'triangleLeft', markSize: 13 },
  { name: 'ScreenNext', src: 'printed', kind: 'screen', shape: segment('M 130.563 291.468 L 220.766 291.468 L 220.766 309.985 L 130.563 309.985 Z'), angle: 0, icon: 'triangleRight', markSize: 13 },
  { name: 'Stop', src: 'printed', kind: 'keypad', shape: traced('M 72.539 343.495 C 72.539 353.426 64.625 361.483 54.861 361.483 C 45.106 361.483 37.192 353.426 37.192 343.495 C 37.192 333.574 45.106 325.517 54.861 325.517 C 64.625 325.517 72.539 333.574 72.539 343.495 Z'), angle: 0, labels: [{ text: 'Stop', place: 'below', size: 'small' }], icon: 'stop', markSize: 14 },
  { name: 'SkipBack', src: 'printed', kind: 'keypad', shape: traced('M 123.165 343.495 C 123.165 353.426 115.251 361.483 105.495 361.483 C 95.732 361.483 87.825 353.426 87.825 343.495 C 87.825 333.574 95.732 325.517 105.495 325.517 C 115.251 325.517 123.165 333.574 123.165 343.495 Z'), angle: 0, labels: [{ text: 'Replay', place: 'below', size: 'small' }], icon: 'skipBack', markSize: 16 },
  { name: 'SkipForward', src: 'printed', kind: 'keypad', shape: traced('M 173.801 343.495 C 173.801 353.426 165.887 361.483 156.131 361.483 C 146.368 361.483 138.452 353.426 138.452 343.495 C 138.452 333.574 146.368 325.517 156.131 325.517 C 165.887 325.517 173.801 333.574 173.801 343.495 Z'), angle: 0, labels: [{ text: 'Skip', place: 'below', size: 'small' }], icon: 'skipForward', markSize: 16 },
  { name: 'Play', src: 'printed', kind: 'keypad', shape: traced('M 224.428 343.495 C 224.428 353.426 216.524 361.483 206.758 361.483 C 196.994 361.483 189.088 353.426 189.088 343.495 C 189.088 333.574 196.994 325.517 206.758 325.517 C 216.524 325.517 224.428 333.574 224.428 343.495 Z'), angle: 0, labels: [{ text: 'Play', place: 'below', size: 'small' }], icon: 'play', markSize: 15 },
  { name: 'Record', src: 'printed', kind: 'keypad', shape: traced('M 72.539 395.324 C 72.539 405.256 64.625 413.312 54.861 413.312 C 45.106 413.312 37.192 405.256 37.192 395.324 C 37.192 385.393 45.106 377.344 54.861 377.344 C 64.625 377.344 72.539 385.393 72.539 395.324 Z'), angle: 0, labels: [{ text: 'Rec', place: 'below', size: 'small' }], icon: 'record', markSize: 13 },
  { name: 'Rewind', src: 'printed', kind: 'keypad', shape: traced('M 123.165 395.324 C 123.165 405.256 115.251 413.312 105.495 413.312 C 95.732 413.312 87.825 405.256 87.825 395.324 C 87.825 385.393 95.732 377.344 105.495 377.344 C 115.251 377.344 123.165 385.393 123.165 395.324 Z'), angle: 0, labels: [{ text: 'Rew', place: 'below', size: 'small' }], icon: 'rewind', markSize: 16 },
  { name: 'FastForward', src: 'printed', kind: 'keypad', shape: traced('M 173.801 395.324 C 173.801 405.256 165.887 413.312 156.131 413.312 C 146.368 413.312 138.452 405.256 138.452 395.324 C 138.452 385.393 146.368 377.344 156.131 377.344 C 165.887 377.344 173.801 385.393 173.801 395.324 Z'), angle: 0, labels: [{ text: 'Fwd', place: 'below', size: 'small' }], icon: 'forward', markSize: 16 },
  { name: 'Pause', src: 'printed', kind: 'keypad', shape: traced('M 224.428 395.324 C 224.428 405.256 216.524 413.312 206.758 413.312 C 196.994 413.312 189.088 405.256 189.088 395.324 C 189.088 385.393 196.994 377.344 206.758 377.344 C 216.524 377.344 224.428 385.393 224.428 395.324 Z'), angle: 0, labels: [{ text: 'Pause', place: 'below', size: 'small' }], icon: 'pause', markSize: 13 },
  { name: 'Guide', src: 'printed', kind: 'keypad', shape: segment('M 41.414 437.731 L 131.618 437.731 L 131.618 456.245 L 41.414 456.245 Z'), angle: 0, labels: [{ text: 'Guide', place: 'on' }] },
  { name: 'Info', src: 'printed', kind: 'keypad', shape: segment('M 131.618 437.731 L 221.821 437.731 L 221.821 456.245 L 131.618 456.245 Z'), angle: 0, labels: [{ text: 'Info', place: 'on' }] },
  { name: 'Exit', src: 'printed', kind: 'keypad', shape: segment('M 41.414 471.544 L 131.618 471.544 L 131.618 490.059 L 41.414 490.059 Z'), angle: 0, labels: [{ text: 'Exit', place: 'on' }] },
  { name: 'Menu', src: 'printed', kind: 'keypad', shape: segment('M 131.618 471.544 L 221.821 471.544 L 221.821 490.059 L 131.618 490.059 Z'), angle: 0, labels: [{ text: 'Menu', place: 'on' }] },
  { name: 'VolumeMute', src: 'printed', kind: 'keypad', shape: traced('M 119.484 515.292 C 119.484 520.173 115.587 524.143 110.785 524.143 L 49.591 524.143 C 44.777 524.143 40.88 520.173 40.88 515.292 C 40.88 510.397 44.777 506.43 49.591 506.43 L 110.785 506.43 C 115.587 506.43 119.484 510.397 119.484 515.292 Z'), angle: 0, labels: [{ text: 'Mute', place: 'on' }] },
  { name: 'PrevChannel', src: 'printed', kind: 'keypad', shape: traced('M 219.709 515.292 C 219.709 520.173 215.812 524.143 211.01 524.143 L 149.816 524.143 C 145.012 524.143 141.115 520.173 141.115 515.292 C 141.115 510.397 145.012 506.43 149.816 506.43 L 211.01 506.43 C 215.812 506.43 219.709 510.397 219.709 515.292 Z'), angle: 0, labels: [{ text: 'Prev', place: 'on' }] },
  { name: 'ChannelUp', src: 'printed', kind: 'keypad', shape: segment('M 128.865 600.433 L 128.865 200.433 A 400 400 0 0 1 528.728 589.962 Z'), angle: 0, markAt: { x: 231.33, y: 562 }, markSize: 11, icon: 'plus' },
  { name: 'ChannelDown', src: 'printed', kind: 'keypad', shape: segment('M 128.865 600.433 L 528.728 589.962 A 400 400 0 0 1 410.719 884.261 Z'), angle: 0, markAt: { x: 221.98, y: 635 }, markSize: 11, icon: 'minus' },
  { name: 'Glow', src: 'printed', kind: 'keypad', shape: segment('M 128.865 600.433 L 410.719 884.261 A 400 400 0 0 1 -141.885 894.872 Z'), angle: 0, labels: [{ text: 'Glow', place: 'on', x: 130.74, y: 697.92 }] },
  { name: 'VolumeDown', src: 'printed', kind: 'keypad', shape: segment('M 128.865 600.433 L -141.885 894.872 A 400 400 0 0 1 -270.55 578.801 Z'), angle: 0, markAt: { x: 38.1, y: 635 }, markSize: 11, icon: 'minus' },
  { name: 'VolumeUp', src: 'printed', kind: 'keypad', shape: segment('M 128.865 600.433 L -270.55 578.801 A 400 400 0 0 1 128.865 200.433 Z'), angle: 0, markAt: { x: 30.54, y: 562 }, markSize: 11, icon: 'plus' },
  { name: 'DirectionUp', src: 'printed', kind: 'keypad', shape: segment('M 128.865 600.433 L 73.744 544.344 L 183.986 544.344 Z'), angle: 0, markAt: { x: 128.87, y: 564.05 }, markSize: 11, icon: 'triangleUp' },
  { name: 'DirectionRight', src: 'printed', kind: 'keypad', shape: segment('M 128.865 600.433 L 183.986 544.344 L 183.986 656.522 Z'), angle: 0, markAt: { x: 165.24, y: 600.43 }, markSize: 11, icon: 'triangleRight' },
  { name: 'DirectionDown', src: 'printed', kind: 'keypad', shape: segment('M 128.865 600.433 L 183.986 656.522 L 73.744 656.522 Z'), angle: 0, markAt: { x: 128.87, y: 636.81 }, markSize: 11, icon: 'triangleDown' },
  { name: 'DirectionLeft', src: 'printed', kind: 'keypad', shape: segment('M 128.865 600.433 L 73.744 656.522 L 73.744 544.344 Z'), angle: 0, markAt: { x: 92.49, y: 600.43 }, markSize: 11, icon: 'triangleLeft' },
  { name: 'Select', src: 'printed', kind: 'keypad', shape: traced('M 149.077 600.433 C 149.077 611.79 140.033 620.995 128.866 620.995 C 117.699 620.995 108.655 611.79 108.655 600.433 C 108.655 589.073 117.699 579.869 128.866 579.869 C 140.033 579.869 149.077 589.073 149.077 600.433 Z'), angle: 0, labels: [{ text: 'OK', place: 'on' }] },
  { name: 'Number1', src: 'printed', kind: 'keypad', shape: traced('M 85.986 736.614 C 85.986 741.844 81.322 746.087 75.566 746.087 L 45.461 746.087 C 39.705 746.087 35.041 741.844 35.041 736.614 L 35.041 735.587 C 35.041 730.357 39.705 726.112 45.461 726.112 L 75.566 726.112 C 81.322 726.112 85.986 730.357 85.986 735.587 L 85.986 736.614 Z'), angle: 0, labels: [{ text: '1', place: 'on', dx: -9 }] },
  { name: 'Number2', src: 'printed', kind: 'keypad', shape: traced('M 155.74 736.614 C 155.74 741.844 151.087 746.087 145.331 746.087 L 115.213 746.087 C 109.457 746.087 104.796 741.844 104.796 736.614 L 104.796 735.587 C 104.796 730.357 109.457 726.112 115.213 726.112 L 145.331 726.112 C 151.087 726.112 155.74 730.357 155.74 735.587 L 155.74 736.614 Z'), angle: 0, labels: [{ text: '2', place: 'on', dx: -9 }, { text: 'abc', place: 'on', size: 'small', dx: 9 }] },
  { name: 'Number3', src: 'printed', kind: 'keypad', shape: traced('M 225.503 736.614 C 225.503 741.844 220.839 746.087 215.093 746.087 L 184.978 746.087 C 179.222 746.087 174.558 741.844 174.558 736.614 L 174.558 735.587 C 174.558 730.357 179.222 726.112 184.978 726.112 L 215.093 726.112 C 220.839 726.112 225.503 730.357 225.503 735.587 L 225.503 736.614 Z'), angle: 0, labels: [{ text: '3', place: 'on', dx: -9 }, { text: 'def', place: 'on', size: 'small', dx: 9 }] },
  { name: 'Number4', src: 'printed', kind: 'keypad', shape: traced('M 85.986 769.435 C 85.986 774.665 81.322 778.908 75.566 778.908 L 45.461 778.908 C 39.705 778.908 35.041 774.665 35.041 769.435 L 35.041 768.405 C 35.041 763.168 39.705 758.933 45.461 758.933 L 75.566 758.933 C 81.322 758.933 85.986 763.168 85.986 768.405 L 85.986 769.435 Z'), angle: 0, labels: [{ text: '4', place: 'on', dx: -9 }, { text: 'ghi', place: 'on', size: 'small', dx: 9 }] },
  { name: 'Number5', src: 'printed', kind: 'keypad', shape: traced('M 155.74 769.435 C 155.74 774.665 151.087 778.908 145.331 778.908 L 115.213 778.908 C 109.457 778.908 104.796 774.665 104.796 769.435 L 104.796 768.405 C 104.796 763.168 109.457 758.933 115.213 758.933 L 145.331 758.933 C 151.087 758.933 155.74 763.168 155.74 768.405 L 155.74 769.435 Z'), angle: 0, labels: [{ text: '5', place: 'on', dx: -9 }, { text: 'jkl', place: 'on', size: 'small', dx: 9 }] },
  { name: 'Number6', src: 'printed', kind: 'keypad', shape: traced('M 225.503 769.435 C 225.503 774.665 220.839 778.908 215.093 778.908 L 184.978 778.908 C 179.222 778.908 174.558 774.665 174.558 769.435 L 174.558 768.405 C 174.558 763.168 179.222 758.933 184.978 758.933 L 215.093 758.933 C 220.839 758.933 225.503 763.168 225.503 768.405 L 225.503 769.435 Z'), angle: 0, labels: [{ text: '6', place: 'on', dx: -9 }, { text: 'mno', place: 'on', size: 'small', dx: 9 }] },
  { name: 'Number7', src: 'printed', kind: 'keypad', shape: traced('M 85.986 802.256 C 85.986 807.484 81.322 811.729 75.566 811.729 L 45.461 811.729 C 39.705 811.729 35.041 807.484 35.041 802.256 L 35.041 801.219 C 35.041 795.989 39.705 791.744 45.461 791.744 L 75.566 791.744 C 81.322 791.744 85.986 795.989 85.986 801.219 L 85.986 802.256 Z'), angle: 0, labels: [{ text: '7', place: 'on', dx: -9 }, { text: 'pqrs', place: 'on', size: 'small', dx: 9 }] },
  { name: 'Number8', src: 'printed', kind: 'keypad', shape: traced('M 155.74 802.256 C 155.74 807.484 151.087 811.729 145.331 811.729 L 115.213 811.729 C 109.457 811.729 104.796 807.484 104.796 802.256 L 104.796 801.219 C 104.796 795.989 109.457 791.744 115.213 791.744 L 145.331 791.744 C 151.087 791.744 155.74 795.989 155.74 801.219 L 155.74 802.256 Z'), angle: 0, labels: [{ text: '8', place: 'on', dx: -9 }, { text: 'tuv', place: 'on', size: 'small', dx: 9 }] },
  { name: 'Number9', src: 'printed', kind: 'keypad', shape: traced('M 225.503 802.256 C 225.503 807.484 220.839 811.729 215.093 811.729 L 184.978 811.729 C 179.222 811.729 174.558 807.484 174.558 802.256 L 174.558 801.219 C 174.558 795.989 179.222 791.744 184.978 791.744 L 215.093 791.744 C 220.839 791.744 225.503 795.989 225.503 801.219 L 225.503 802.256 Z'), angle: 0, labels: [{ text: '9', place: 'on', dx: -9 }, { text: 'wxyz', place: 'on', size: 'small', dx: 9 }] },
  { name: 'Star', src: 'printed', kind: 'keypad', shape: traced('M 85.986 835.067 C 85.986 840.305 81.322 844.54 75.566 844.54 L 45.461 844.54 C 39.705 844.54 35.041 840.305 35.041 835.067 L 35.041 834.038 C 35.041 828.81 39.705 824.565 45.461 824.565 L 75.566 824.565 C 81.322 824.565 85.986 828.81 85.986 834.038 L 85.986 835.067 Z'), angle: 0, labels: [{ text: '*', place: 'on' }, { text: 'clear', place: 'below', size: 'small' }] },
  { name: 'Number0', src: 'printed', kind: 'keypad', shape: traced('M 155.74 835.067 C 155.74 840.305 151.087 844.54 145.331 844.54 L 115.213 844.54 C 109.457 844.54 104.796 840.305 104.796 835.067 L 104.796 834.038 C 104.796 828.81 109.457 824.565 115.213 824.565 L 145.331 824.565 C 151.087 824.565 155.74 828.81 155.74 834.038 L 155.74 835.067 Z'), angle: 0, labels: [{ text: '0', place: 'on', dx: -9 }], icon: 'dash', markAt: { x: 139, y: 836 }, markSize: 8 },
  { name: 'Hash', src: 'printed', kind: 'keypad', shape: traced('M 225.503 835.067 C 225.503 840.305 220.839 844.54 215.093 844.54 L 184.978 844.54 C 179.222 844.54 174.558 840.305 174.558 835.067 L 174.558 834.038 C 174.558 828.81 179.222 824.565 184.978 824.565 L 215.093 824.565 C 220.839 824.565 225.503 828.81 225.503 834.038 L 225.503 835.067 Z'), angle: 0, labels: [{ text: '#', place: 'on' }, { text: 'enter', place: 'below', size: 'small' }] },
  { name: 'Red', src: 'printed', kind: 'keypad', shape: traced('M 73.95 867.879 C 73.95 873.116 70.381 877.351 65.988 877.351 L 42.993 877.351 C 38.602 877.351 35.041 873.116 35.041 867.879 L 35.041 866.851 C 35.041 861.621 38.602 857.376 42.993 857.376 L 65.988 857.376 C 70.381 857.376 73.95 861.621 73.95 866.851 L 73.95 867.879 Z'), angle: 0, icon: 'dot', accent: '#d23c3c', markSize: 9 },
  { name: 'Green', src: 'printed', kind: 'keypad', shape: traced('M 124.428 867.879 C 124.428 873.116 120.867 877.351 116.476 877.351 L 93.471 877.351 C 89.078 877.351 85.517 873.116 85.517 867.879 L 85.517 866.851 C 85.517 861.621 89.078 857.376 93.471 857.376 L 116.476 857.376 C 120.867 857.376 124.428 861.621 124.428 866.851 L 124.428 867.879 Z'), angle: 0, icon: 'dot', accent: '#2f9e44', markSize: 9 },
  { name: 'Yellow', src: 'printed', kind: 'keypad', shape: traced('M 174.904 867.879 C 174.904 873.116 171.343 877.351 166.952 877.351 L 143.957 877.351 C 139.564 877.351 135.996 873.116 135.996 867.879 L 135.996 866.851 C 135.996 861.621 139.564 857.376 143.957 857.376 L 166.952 857.376 C 171.343 857.376 174.904 861.621 174.904 866.851 L 174.904 867.879 Z'), angle: 0, icon: 'dot', accent: '#d9c22b', markSize: 9 },
  { name: 'Blue', src: 'printed', kind: 'keypad', shape: traced('M 225.39 867.879 C 225.39 873.116 221.821 877.351 217.428 877.351 L 194.433 877.351 C 190.043 877.351 186.482 873.116 186.482 867.879 L 186.482 866.851 C 186.482 861.621 190.043 857.376 194.433 857.376 L 217.428 857.376 C 221.821 857.376 225.39 861.621 225.39 866.851 L 225.39 867.879 Z'), angle: 0, icon: 'dot', accent: '#3b6fd4', markSize: 9 },
];

export const H525: Model = {
  id: 'h525',
  label: 'Harmony 525',
  skins: [22],
  architecture: 9,
  width: 259.787,
  height: CASE_HEIGHT,
  case: 'M 259.787 17.815 L 259.787 943.114 C 259.787 975.797 258.376 1000 128.463 1000 C -0.028 1000 0 966.289 0 938.197 L 0 12.733 C 0 12.733 49.02 0.113 128.119 0 C 207.206 -0.11 259.787 12.733 259.787 12.733 L 259.787 17.815 Z',
  regions: REGIONS,
  rockers: ROCKERS,
  // The glass, and the raster arch 9 draws into it.
  screen: { x: 46.263, y: 162.141, w: 167.138, h: 110.492, pixels: { width: 96, height: 64 }, touch: false },
  keys: KEYS,
  nameplate: { text: 'Harmony 525', place: 'on', x: 130, y: 155, size: 'small' },
};
