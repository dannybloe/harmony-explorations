/**
 * The Harmony One, skins 54 and 59, architecture 12.
 *
 * **Geometry from a traced drawing, read by a person.** The drawing is a hand trace of Logitech's own
 * documentation and lives in the lab; `bin/extract.ts` moves it into this package's coordinates. Only
 * the **shapes and the contours** come from it, per Danny's decision of 21 August 2026; the symbols and
 * the words are ours, drawn from `src/icons.ts` and typeset here, and read off the **photograph**.
 *
 * **This drawing came out upside down first, and the cause is worth carrying.** 57 elements of this
 * trace, the case outline among them, carry
 * `translate(...) scale(-1, 1) rotate(-180) translate(...)`, which is a mirror top to bottom.
 * `parseTransform` read `matrix`, `translate` and `scale` and **silently ignored** the rest, so every one
 * of them came through as a mirror left to right instead. Nothing failed: a mirror about a shape's own
 * centre leaves its bounding box alone, so every key stayed where it belonged and only the asymmetric
 * shapes were wrong. The two visible symptoms were the case, whose wide end went to the bottom, and the
 * paging arrows beside the screen, which pointed inward. Both were read here as a badly traced source
 * before the parser was suspected. It refuses an unknown transform now rather than dropping it.
 *
 * **The two keys beside the screen are the arrow itself**, because that is all the product prints
 * there: no outline, no key edge, a solid triangle on the bezel. They were drawn for a while as the
 * rectangle the firmware answers for, which is bigger, and it read as two boxes that are not on the
 * remote. So the region is recorded here and not drawn. It comes from base slot 17's own hit map,
 * `docs/findings.md` section 125: codes 46 and 47 hold one rectangle across all 74 hit pages of the two
 * Harmony One configs, and `packages/codec/src/touch.ts` maps a panel point to a display pixel, which
 * the screen rectangle below turns into 11.568 to 45.978 by 126.661 to 240.617 on the left and its
 * mirror on the right. What the codes are for is what that buys, and the arrows are what is drawn.
 *
 * **The two pads under the screen carry no code, and that is the measurement rather than a gap.** Codes
 * 43 and 44 do sit there, but so do 48 and 49 on pages where a screen block reaches down, and 43 alone
 * appears at four different rectangles. So the pads take their outline from the drawing, which does state
 * one, and no scan: what they send is per page.
 *
 * **Four keys carry candidates in two pairs**, `reference/button-maps.md`: 27 and 36 are `DirectionUp`
 * and `UpArrow`, 26 and 29 are `DirectionDown` and `DownArrow`, and every activity gives the two members
 * of a pair the same command, so no amount of decoding separates them.
 *
 * The Menu, Exit, Info and Guide keys are **sharp cornered quadrilaterals** here because that is what
 * the drawing states; the product rounds them. Changing that would mean inventing a radius, so it is
 * left as traced and said out loud instead.
 */
import { segment, traced } from '../shapes.ts';
import { CASE_HEIGHT } from '../types.ts';
import type { Key, Model, Region, Rocker } from '../types.ts';

/**
 * The one region: the arch where the black body meets the silver cap.
 *
 * The drawing states it as a band rather than as a line, so it is a seam with a real width, and the
 * bottom keypad row genuinely crosses it, which the photograph confirms.
 */
const REGIONS: readonly Region[] = [
  { id: 'cap-seam', form: 'seam', path: 'M 228.392 910.997 C 218.46 937.366 211.544 955.925 204.798 966.33 C 204.798 966.33 196.366 998.291 130.915 1000 C 64.69 1001.729 50.973 966.33 50.973 966.33 C 44.468 956.282 38.234 944.333 28.225 913.562 C 61.538 958.904 184.492 962.622 228.392 910.997 Z' },
];

/**
 * The mouldings.
 *
 * Five, and every split is derived rather than drawn: the drawing gives one outline per part and states
 * a seam only inside the play moulding. So the direction pad is four quadrants about its own centre, the
 * two side rockers and the page rocker split on their own middle, and the play moulding splits on the
 * groove the drawing does state. A segment is the moulding clipped to that region, so a half is exactly
 * half of the real part.
 */
const ROCKERS: readonly Rocker[] = [
  {
    id: 'rocker-pad',
    keys: ['DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft'],
    path: 'M 136.316 464.836 C 138.101 464.876 139.82 466.354 140.128 468.112 L 144.193 491.234 C 144.51 492.992 146.19 494.721 147.958 495.048 L 172.484 499.669 C 174.25 500.006 175.76 501.745 175.846 503.53 L 176.709 522.034 C 176.788 523.819 175.423 525.607 173.674 526.01 L 149.102 531.553 C 147.343 531.957 145.72 533.735 145.479 535.51 L 141.992 561.342 C 141.763 563.12 140.091 564.561 138.303 564.561 L 113.932 564.436 C 112.137 564.426 110.521 562.955 110.349 561.16 L 107.939 535.992 C 107.764 534.195 106.19 532.485 104.422 532.168 L 78.868 527.614 C 77.102 527.306 75.651 525.577 75.651 523.782 L 75.651 505.011 C 75.651 503.213 77.11 501.514 78.878 501.236 L 105.162 497.038 C 106.938 496.757 108.61 495.078 108.888 493.31 L 112.904 467.613 C 113.182 465.835 114.874 464.414 116.669 464.443 L 136.316 464.836 Z',
  },
  {
    id: 'rocker-volume',
    keys: ['VolumeUp', 'VolumeDown'],
    labels: [{ text: 'Vol', place: 'on', x: 49, y: 506, size: 'small' }],
    path: 'M 28.638 474.846 C 28.136 467.401 33.834 461.042 41.288 460.705 L 54.189 460.139 C 61.643 459.812 67.755 463.703 67.755 468.803 C 67.755 473.904 65.428 481.975 62.595 486.748 C 59.762 491.532 57.399 501.543 57.332 509.007 L 57.273 516.001 C 57.217 523.455 59.742 533.263 62.893 537.797 C 66.053 542.332 68.965 550.276 69.358 555.445 C 69.771 560.641 63.997 565.176 56.543 565.55 L 48.349 565.953 C 40.895 566.327 34.38 560.536 33.891 553.091 L 28.638 474.846 Z',
  },
  {
    id: 'rocker-channel',
    keys: ['ChannelUp', 'ChannelDown'],
    labels: [{ text: 'Ch', place: 'on', x: 206.8, y: 506, size: 'small' }],
    path: 'M 225.368 474.846 C 225.857 467.401 220.159 461.042 212.715 460.705 L 199.814 460.139 C 192.36 459.812 186.258 463.703 186.258 468.803 C 186.258 473.904 188.575 481.975 191.398 486.748 C 194.231 491.532 196.604 501.543 196.673 509.007 L 196.73 516.001 C 196.796 523.455 194.261 533.263 191.11 537.797 C 187.95 542.332 185.038 550.276 184.635 555.445 C 184.232 560.641 190.006 565.176 197.46 565.55 L 205.654 565.953 C 213.108 566.327 219.613 560.536 220.122 553.091 L 225.368 474.846 Z',
  },
  {
    id: 'rocker-page',
    keys: ['UpArrow', 'DownArrow'],
    path: 'M 145.558 403.048 L 145.558 431.888 C 144.837 435.768 138.131 438.948 130.667 438.948 L 123.683 438.948 C 116.219 438.948 109.522 434.836 108.802 429.812 L 108.802 375.104 C 109.522 372.509 116.219 370.397 123.683 370.397 L 130.667 370.397 C 138.131 370.397 144.837 372.106 145.558 374.208 L 145.558 403.048 Z',
  },
  {
    id: 'rocker-play',
    keys: ['Play', 'Pause'],
    seams: ['M 141.271 682.106 C 141.271 682.989 140.57 683.68 139.697 683.68 L 115.211 683.68 C 114.345 683.68 113.644 682.989 113.644 682.106 L 113.644 679.012 C 113.644 678.137 114.345 677.426 115.211 677.426 L 139.697 677.426 C 140.57 677.426 141.271 678.137 141.271 679.012 L 141.271 682.106 Z'],
    path: 'M 103.787 637.684 C 105.814 630.961 116.209 625.216 126.882 624.879 C 137.565 624.552 147.958 630.25 149.975 637.539 C 151.994 644.821 151.59 658.78 149.062 668.57 C 146.537 678.358 144.087 695.573 143.615 706.821 C 143.155 718.062 139.073 728.868 134.538 730.809 C 130.003 732.739 122.992 733.01 118.936 731.387 C 114.893 729.781 110.868 719.176 110.002 707.859 C 109.119 696.524 106.554 678.847 104.267 668.57 C 101.982 658.3 101.761 644.391 103.787 637.684 Z',
  },
];

/**
 * The keys.
 *
 * `catalogue` where `reference/button-maps.md` names the button, which is 32 of the 44 and every one of
 * them measured through the account that compiled our own configs. `printed` for the rest, where the
 * name is Logitech's own word for a key the tables never reached.
 */
const KEYS: readonly Key[] = [
  { name: 'Off', src: 'printed', kind: 'keypad', shape: traced('M 51.135 31.24 C 51.135 35.236 47.869 38.504 43.883 38.504 L 33.104 38.504 C 29.108 38.504 25.842 35.236 25.842 31.24 L 25.842 21.472 C 25.842 17.475 29.108 14.219 33.104 14.219 L 43.883 14.219 C 47.869 14.219 51.135 17.475 51.135 21.472 L 51.135 31.24 Z'), angle: 0, icon: 'power', markSize: 13, labels: [{ text: 'Off', place: 'below', size: 'small' }] },
  { name: 'ScreenPrev', src: 'printed', kind: 'touch', shape: traced('M 38.895 187.345 L 38.895 214.781 L 30.288 201.159 Z'), angle: 0, scan: 46 },
  { name: 'ScreenNext', src: 'printed', kind: 'touch', shape: traced('M 213.32 186.039 L 213.32 213.475 L 221.937 199.853 Z'), angle: 0, scan: 47 },
  { name: 'SoftLeft', src: 'printed', kind: 'touch', shape: traced('M 122.463 288.012 C 122.463 288.885 121.772 289.586 120.896 289.586 L 47.552 289.586 C 46.676 289.586 45.976 288.885 45.976 288.012 L 45.976 280.565 C 45.976 279.692 46.676 278.991 47.552 278.991 L 120.896 278.991 C 121.772 278.991 122.463 279.692 122.463 280.565 L 122.463 288.012 Z'), angle: 0, zone: 1 },
  { name: 'SoftRight', src: 'printed', kind: 'touch', shape: traced('M 206.318 288.012 C 206.318 288.885 205.615 289.586 204.742 289.586 L 131.397 289.586 C 130.532 289.586 129.821 288.885 129.821 288.012 L 129.821 280.565 C 129.821 279.692 130.532 278.991 131.397 278.991 L 204.742 278.991 C 205.615 278.991 206.318 279.692 206.318 280.565 L 206.318 288.012 Z'), angle: 0, zone: 2 },
  { name: 'Activities', src: 'printed', kind: 'keypad', shape: traced('M 28.751 349.55 C 28.358 351.308 29.501 352.739 31.289 352.739 L 117.726 352.739 C 119.524 352.739 121.002 351.269 121.002 349.473 L 121.002 333.046 C 121.002 331.26 119.524 329.79 117.726 329.79 L 36.532 329.79 C 34.737 329.79 32.942 331.221 32.546 332.969 L 28.751 349.55 Z'), angle: 0, labels: [{ text: 'Activities', place: 'on' }] },
  { name: 'Help', src: 'printed', kind: 'keypad', shape: traced('M 224.713 349.55 C 225.117 351.308 223.973 352.739 222.178 352.739 L 135.738 352.739 C 133.953 352.739 132.472 351.269 132.472 349.473 L 132.472 333.046 C 132.472 331.26 133.953 329.79 135.738 329.79 L 216.942 329.79 C 218.728 329.79 220.535 331.221 220.929 332.969 L 224.713 349.55 Z'), angle: 0, labels: [{ text: 'Help', place: 'on' }] },
  { name: 'Menu', src: 'catalogue', kind: 'keypad', shape: traced('M 20.837 395.046 L 88.629 395.7 L 88.629 371.855 L 24.765 373.171 Z'), angle: 0, labels: [{ text: 'Menu', place: 'on' }], scan: 40 },
  { name: 'Info', src: 'catalogue', kind: 'keypad', shape: traced('M 232.217 396.976 L 164.405 397.62 L 164.405 373.795 L 228.277 375.104 Z'), angle: 0, labels: [{ text: 'Info', place: 'on' }], scan: 10 },
  { name: 'Exit', src: 'catalogue', kind: 'keypad', shape: traced('M 20.837 413.424 L 88.629 412.76 L 88.629 436.602 L 24.765 435.286 Z'), angle: 0, labels: [{ text: 'Exit', place: 'on' }], scan: 2 },
  { name: 'Guide', src: 'catalogue', kind: 'keypad', shape: traced('M 232.217 415.354 L 164.405 414.7 L 164.405 438.535 L 228.277 437.217 Z'), angle: 0, labels: [{ text: 'Guide', place: 'on' }], scan: 18 },
  { name: 'UpArrow', src: 'catalogue', kind: 'keypad', shape: segment('M 100 362 L 154 362 L 154 404.54 L 100 404.54 Z'), angle: 0, icon: 'chevronUp', markAt: { x: 127.2, y: 385 }, markSize: 13, scanCandidates: [27, 36] },
  { name: 'DownArrow', src: 'catalogue', kind: 'keypad', shape: segment('M 100 404.54 L 154 404.54 L 154 448 L 100 448 Z'), angle: 0, icon: 'chevronDown', markAt: { x: 127.2, y: 424 }, markSize: 13, scanCandidates: [26, 29] },
  { name: 'VolumeUp', src: 'catalogue', kind: 'keypad', shape: segment('M 20 450 L 78 450 L 78 512.911 L 20 512.911 Z'), angle: 0, icon: 'plus', markAt: { x: 49.4, y: 478 }, markSize: 12, scan: 3 },
  { name: 'VolumeDown', src: 'catalogue', kind: 'keypad', shape: segment('M 20 512.911 L 78 512.911 L 78 576 L 20 576 Z'), angle: 0, icon: 'minus', markAt: { x: 52, y: 546 }, markSize: 10, scan: 4 },
  { name: 'ChannelUp', src: 'catalogue', kind: 'keypad', shape: segment('M 176 450 L 234 450 L 234 512.911 L 176 512.911 Z'), angle: 0, icon: 'plus', markAt: { x: 206.4, y: 478 }, markSize: 12, scan: 19 },
  { name: 'ChannelDown', src: 'catalogue', kind: 'keypad', shape: segment('M 176 512.911 L 234 512.911 L 234 576 L 176 576 Z'), angle: 0, icon: 'minus', markAt: { x: 203.8, y: 546 }, markSize: 10, scan: 20 },
  { name: 'DirectionUp', src: 'catalogue', kind: 'keypad', shape: segment('M 126.19 514.37 L -73.81 314.37 L 326.19 314.37 Z'), angle: 0, icon: 'triangleUp', markAt: { x: 126.19, y: 476 }, markSize: 13, scanCandidates: [27, 36] },
  { name: 'DirectionRight', src: 'catalogue', kind: 'keypad', shape: segment('M 126.19 514.37 L 326.19 314.37 L 326.19 714.37 Z'), angle: 0, icon: 'triangleRight', markAt: { x: 163.9, y: 514.37 }, markSize: 13, scan: 33 },
  { name: 'DirectionDown', src: 'catalogue', kind: 'keypad', shape: segment('M 126.19 514.37 L 326.19 714.37 L -73.81 714.37 Z'), angle: 0, icon: 'triangleDown', markAt: { x: 126.19, y: 552.5 }, markSize: 13, scanCandidates: [26, 29] },
  { name: 'DirectionLeft', src: 'catalogue', kind: 'keypad', shape: segment('M 126.19 514.37 L -73.81 714.37 L -73.81 314.37 Z'), angle: 0, icon: 'triangleLeft', markAt: { x: 88.5, y: 514.37 }, markSize: 13, scan: 11 },
  { name: 'Select', src: 'catalogue', kind: 'keypad', shape: traced('M 144.222 522.225 C 144.222 527.441 140.005 531.679 134.789 531.679 L 117.717 531.679 C 112.501 531.679 108.273 527.441 108.273 522.225 L 108.273 506.749 C 108.273 501.524 112.501 497.296 117.717 497.296 L 134.789 497.296 C 140.005 497.296 144.222 501.524 144.222 506.749 L 144.222 522.225 Z'), angle: 0, labels: [{ text: 'OK', place: 'on' }], scan: 28 },
  { name: 'VolumeMute', src: 'catalogue', kind: 'keypad', shape: traced('M 105.998 600.161 C 105.998 605.368 101.771 609.585 96.555 609.585 L 84.239 609.585 C 79.033 609.585 74.815 605.368 74.815 600.161 L 74.815 590.777 C 74.815 585.571 79.033 581.343 84.239 581.343 L 96.555 581.343 C 101.771 581.343 105.998 585.571 105.998 590.777 L 105.998 600.161 Z'), angle: 0, icon: 'mute', markSize: 15, scan: 9 },
  { name: 'PrevChannel', src: 'catalogue', kind: 'keypad', shape: traced('M 178.064 600.161 C 178.064 605.368 173.846 609.585 168.64 609.585 L 156.324 609.585 C 151.118 609.585 146.891 605.368 146.891 600.161 L 146.891 590.777 C 146.891 585.571 151.118 581.343 156.324 581.343 L 168.64 581.343 C 173.846 581.343 178.064 585.571 178.064 590.777 L 178.064 600.161 Z'), angle: 0, icon: 'back', markSize: 15, scan: 35 },
  { name: 'Rewind', src: 'catalogue', kind: 'keypad', shape: traced('M 78.696 631.718 C 79.704 628.125 77.486 625.187 73.748 625.187 L 38.185 625.187 C 34.449 625.187 30.615 628.135 29.666 631.748 L 28.704 635.397 C 27.762 639.01 30.04 641.949 33.765 641.949 L 69.031 641.949 C 72.769 641.949 76.64 639.02 77.658 635.417 L 78.696 631.718 Z'), angle: 0, icon: 'rewind', markSize: 15, scan: 5 },
  { name: 'FastForward', src: 'catalogue', kind: 'keypad', shape: traced('M 221.266 635.417 C 222.264 639.02 220.046 641.949 216.308 641.949 L 180.735 641.949 C 177.009 641.949 173.175 639.01 172.223 635.397 L 171.274 631.748 C 170.322 628.135 172.6 625.187 176.325 625.187 L 211.601 625.187 C 215.329 625.187 219.21 628.125 220.218 631.718 L 221.266 635.417 Z'), angle: 0, icon: 'forward', markSize: 15, scan: 21 },
  { name: 'SkipBack', src: 'catalogue', kind: 'keypad', shape: traced('M 84.315 676.063 C 85.402 679.637 83.221 682.556 79.493 682.556 L 40.425 682.556 C 36.697 682.556 32.816 679.617 31.808 676.024 L 30.75 672.316 C 29.732 668.723 31.96 665.784 35.689 665.784 L 74.449 665.784 C 78.177 665.784 82.117 668.703 83.181 672.286 L 84.315 676.063 Z'), angle: 0, icon: 'skipBack', markSize: 15, labels: [{ text: 'Replay', place: 'below', size: 'small' }], scan: 6 },
  { name: 'SkipForward', src: 'catalogue', kind: 'keypad', shape: traced('M 221.583 672.286 C 222.638 668.703 220.466 665.784 216.731 665.784 L 178.209 665.784 C 174.471 665.784 170.59 668.723 169.592 672.316 L 168.554 676.024 C 167.556 679.617 169.784 682.556 173.512 682.556 L 211.736 682.556 C 215.472 682.556 219.401 679.637 220.459 676.063 L 221.583 672.286 Z'), angle: 0, icon: 'skipForward', markSize: 15, labels: [{ text: 'Skip', place: 'below', size: 'small' }], scan: 22 },
  { name: 'Record', src: 'catalogue', kind: 'keypad', shape: traced('M 91.098 718.274 C 92.172 721.857 89.994 724.776 86.265 724.776 L 47.188 724.776 C 43.46 724.776 39.579 721.837 38.571 718.244 L 37.523 714.546 C 36.505 710.953 38.733 708.004 42.461 708.004 L 81.212 708.004 C 84.94 708.004 88.88 710.933 89.954 714.506 L 91.098 718.274 Z'), angle: 0, icon: 'record', markSize: 11, scan: 7 },
  { name: 'Stop', src: 'catalogue', kind: 'keypad', shape: traced('M 217.173 714.506 C 218.238 710.933 216.057 708.004 212.321 708.004 L 173.79 708.004 C 170.052 708.004 166.181 710.953 165.173 714.546 L 164.145 718.244 C 163.136 721.837 165.374 724.776 169.112 724.776 L 207.327 724.776 C 211.052 724.776 214.992 721.857 216.05 718.274 L 217.173 714.506 Z'), angle: 0, icon: 'stop', markSize: 11, scan: 23 },
  { name: 'Play', src: 'catalogue', kind: 'keypad', shape: segment('M 96 618 L 158 618 L 158 680.42 L 96 680.42 Z'), angle: 0, icon: 'play', markAt: { x: 126.8, y: 645 }, markSize: 17, scan: 30 },
  { name: 'Pause', src: 'catalogue', kind: 'keypad', shape: segment('M 96 680.42 L 158 680.42 L 158 740 L 96 740 Z'), angle: 0, icon: 'pause', markAt: { x: 126.8, y: 700 }, markSize: 11, scan: 31 },
  { name: 'Number1', src: 'catalogue', kind: 'keypad', shape: traced('M 80.193 770.752 C 80.193 775.97 75.978 780.195 70.76 780.195 L 53.68 780.195 C 48.474 780.195 44.247 775.97 44.247 770.752 L 44.247 755.276 C 44.247 750.06 48.474 745.825 53.68 745.825 L 70.76 745.825 C 75.978 745.825 80.193 750.06 80.193 755.276 L 80.193 770.752 Z'), angle: 0, labels: [{ text: '1', place: 'on' }], scan: 8 },
  { name: 'Number2', src: 'catalogue', kind: 'keypad', shape: traced('M 146.2 776.804 C 146.2 782.022 141.972 786.247 136.766 786.247 L 119.677 786.247 C 114.47 786.247 110.243 782.022 110.243 776.804 L 110.243 761.328 C 110.243 756.102 114.47 751.897 119.677 751.897 L 136.766 751.897 C 141.972 751.897 146.2 756.102 146.2 761.328 L 146.2 776.804 Z'), angle: 0, labels: [{ text: '2', place: 'on' }, { text: 'abc', place: 'below', size: 'small' }], scan: 32 },
  { name: 'Number3', src: 'catalogue', kind: 'keypad', shape: traced('M 208.576 770.752 C 208.576 775.97 204.368 780.195 199.15 780.195 L 182.07 780.195 C 176.854 780.195 172.627 775.97 172.627 770.752 L 172.627 755.276 C 172.627 750.06 176.854 745.825 182.07 745.825 L 199.15 745.825 C 204.368 745.825 208.576 750.06 208.576 755.276 L 208.576 770.752 Z'), angle: 0, labels: [{ text: '3', place: 'on' }, { text: 'def', place: 'below', size: 'small' }], scan: 24 },
  { name: 'Number4', src: 'catalogue', kind: 'keypad', shape: traced('M 82.308 820.994 C 82.308 826.2 78.081 830.418 72.875 830.418 L 55.795 830.418 C 50.577 830.418 46.362 826.2 46.362 820.994 L 46.362 805.489 C 46.362 800.282 50.577 796.065 55.793 796.065 L 72.875 796.065 C 78.081 796.065 82.308 800.282 82.308 805.489 L 82.308 820.994 Z'), angle: 0, labels: [{ text: '4', place: 'on' }, { text: 'ghi', place: 'below', size: 'small' }], scan: 1 },
  { name: 'Number5', src: 'catalogue', kind: 'keypad', shape: traced('M 146.2 826.279 C 146.2 831.485 141.972 835.713 136.766 835.713 L 119.677 835.713 C 114.47 835.713 110.243 831.485 110.243 826.279 L 110.243 810.783 C 110.243 805.567 114.47 801.35 119.677 801.35 L 136.766 801.35 C 141.972 801.35 146.2 805.567 146.2 810.783 L 146.2 826.279 Z'), angle: 0, labels: [{ text: '5', place: 'on' }, { text: 'jkl', place: 'below', size: 'small' }], scan: 25 },
  { name: 'Number6', src: 'catalogue', kind: 'keypad', shape: traced('M 205.932 820.994 C 205.932 826.2 201.707 830.418 196.499 830.418 L 179.419 830.418 C 174.203 830.418 169.976 826.2 169.976 820.994 L 169.976 805.489 C 169.976 800.282 174.203 796.065 179.419 796.065 L 196.499 796.065 C 201.707 796.065 205.932 800.282 205.932 805.489 L 205.932 820.994 Z'), angle: 0, labels: [{ text: '6', place: 'on' }, { text: 'mno', place: 'below', size: 'small' }], scan: 17 },
  { name: 'Number7', src: 'catalogue', kind: 'keypad', shape: traced('M 82.308 869.633 C 82.308 874.839 78.081 879.064 72.875 879.064 L 55.795 879.064 C 50.577 879.064 46.362 874.839 46.362 869.633 L 46.362 854.127 C 46.362 848.921 50.577 844.704 55.795 844.704 L 72.875 844.704 C 78.081 844.704 82.308 848.921 82.308 854.127 L 82.308 869.633 Z'), angle: 0, labels: [{ text: '7', place: 'on' }, { text: 'pqrs', place: 'below', size: 'small' }], scan: 39 },
  { name: 'Number8', src: 'catalogue', kind: 'keypad', shape: traced('M 146.2 874.377 C 146.2 879.593 141.972 883.811 136.766 883.811 L 119.677 883.811 C 114.47 883.811 110.243 879.593 110.243 874.377 L 110.243 858.891 C 110.243 853.685 114.47 849.457 119.677 849.457 L 136.766 849.457 C 141.972 849.457 146.2 853.685 146.2 858.891 L 146.2 874.377 Z'), angle: 0, labels: [{ text: '8', place: 'on' }, { text: 'tuv', place: 'below', size: 'small' }], scan: 16 },
  { name: 'Number9', src: 'catalogue', kind: 'keypad', shape: traced('M 205.932 869.633 C 205.932 874.839 201.707 879.064 196.499 879.064 L 179.419 879.064 C 174.203 879.064 169.976 874.839 169.976 869.633 L 169.976 854.137 C 169.976 848.931 174.203 844.704 179.419 844.704 L 196.499 844.704 C 201.707 844.704 205.932 848.931 205.932 854.137 L 205.932 869.633 Z'), angle: 0, labels: [{ text: '9', place: 'on' }, { text: 'wxyz', place: 'below', size: 'small' }], scan: 15 },
  { name: 'Number0', src: 'catalogue', kind: 'keypad', shape: traced('M 146.2 924.609 C 146.2 929.825 141.972 934.043 136.766 934.043 L 119.677 934.043 C 114.47 934.043 110.243 929.825 110.243 924.609 L 110.243 909.114 C 110.243 903.898 114.47 899.68 119.677 899.68 L 136.766 899.68 C 141.972 899.68 146.2 903.898 146.2 909.114 L 146.2 924.609 Z'), angle: 0, labels: [{ text: '0', place: 'on' }], scan: 14 },
  { name: 'NumberPlus', src: 'catalogue', kind: 'keypad', shape: traced('M 82.308 915.473 C 82.308 919.143 79.33 922.13 75.651 922.13 L 63.584 922.13 C 59.915 922.13 56.927 919.143 56.927 915.473 L 56.927 904.542 C 56.927 900.853 59.915 897.875 63.584 897.875 L 75.651 897.875 C 79.33 897.875 82.308 900.853 82.308 904.542 L 82.308 915.473 Z'), angle: 0, icon: 'plus', markSize: 11, labels: [{ text: 'clear', place: 'below', size: 'small' }], scan: 12 },
  { name: 'Enter', src: 'printed', kind: 'keypad', shape: traced('M 194.175 915.473 C 194.175 919.152 191.196 922.13 187.508 922.13 L 175.452 922.13 C 171.783 922.13 168.795 919.152 168.795 915.473 L 168.795 904.542 C 168.795 900.853 171.783 897.885 175.452 897.885 L 187.508 897.885 C 191.196 897.885 194.175 900.853 194.175 904.542 L 194.175 915.473 Z'), angle: 0, labels: [{ text: 'E', place: 'on' }, { text: 'enter', place: 'below', size: 'small' }] },
];

export const ONE: Model = {
  id: 'one',
  label: 'Harmony One',
  skins: [54, 59],
  architecture: 12,
  width: 255.791,
  height: CASE_HEIGHT,
  case: 'M 130.915 1000 C 64.71 1002.585 50.973 966.33 50.973 966.33 C 33.864 939.884 3.814 853.628 3.814 767.142 C 3.814 680.655 14.947 607.251 13.592 546.98 C 12.24 486.709 1.355 444.634 0 406.776 C -1.375 368.658 7.887 52.672 10.356 26.744 C 12.345 5.87 32.634 4.468 32.634 4.468 C 32.634 4.468 85.987 0 128.294 0 C 179.112 0 223.157 4.468 223.157 4.468 C 223.157 4.468 243.436 5.87 245.435 26.744 C 247.904 52.672 257.153 368.658 255.791 406.776 C 254.436 444.634 243.551 486.709 242.186 546.98 C 240.834 607.251 251.996 680.655 251.996 767.142 C 251.996 853.628 221.927 939.884 204.798 966.33 C 204.798 966.33 197.249 997.408 130.915 1000 Z',
  regions: REGIONS,
  rockers: ROCKERS,
  // The glass, and the raster arch 12 draws into it. `touch` because this is the one model here whose
  // display is a touch panel, which is also what makes the two side keys measurable at all.
  screen: { x: 45.978, y: 72.213, w: 160.64, h: 202.342, pixels: { width: 176, height: 220 }, touch: true },
  keys: KEYS,
  nameplate: { text: 'Harmony One', place: 'on', x: 128, y: 964, size: 'small' },
};
