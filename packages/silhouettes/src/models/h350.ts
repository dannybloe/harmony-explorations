/**
 * The Harmony 350, skin 104, architecture 16.
 *
 * **Geometry from Logitech's own drawing, read by a person.** The source is the line drawing on the
 * "Buttons" page of the Harmony 350 setup guide, printed page 4, which is page 5 of the copy in the lab
 * at `Docs/350 manual.pdf`. Unlike the other three models there was no hand trace to start from and none
 * was needed: that page is vector, so `pdftocairo -svg` turns it into an SVG of real strokes and
 * `bin/extract.ts` reads it as it stands. Every path in here is that drawing's own, moved into this
 * package's coordinates and nothing else. The page SVG stays in the lab, like every other trace.
 *
 * **What the extraction carries that is not the remote**, and is left out by index rather than by
 * filter: the page's header rule, the five numbered leader lines and the three square brackets of the
 * manual's callouts, two of which cross the case's left edge. None of them is a key and none of them
 * appears below.
 *
 * **The symbols and the words are ours**, per Danny's decision of 21 August 2026, drawn from
 * `src/icons.ts` and typeset here. They are read off the **photograph** on the guide's cover where it
 * reaches, which is down to the DVR and Live row, and off the drawing below that, since the cover
 * photograph is cropped there and no other photograph of this model is in the lab. Where both exist they
 * agree, mark for mark. A position comes from the drawing's own printed mark, which the extraction
 * reports per key, so a symbol sits where the document prints it rather than where a key's centre is.
 *
 * **No scan code appears anywhere in here, and that is not an omission.** This architecture has never
 * been opened over USB by this library, `reference/button-maps.md` has no table for it, and nothing in
 * the repository or the lab ties a key on this remote to a code. The configuration does state a key
 * table, `docs/findings.md` section 259, so the codes exist; which physical key each one belongs to has
 * not been measured. Nor are there candidates: the Harmony 525's four come from its firmware's matrix
 * arithmetic, section 89, and nobody has read this generation's keypad scanner. So every key is
 * `printed` and none carries a code.
 *
 * **Names follow the marking**, or Logitech's vocabulary where the marking is a symbol, the same rule
 * the Harmony 525 used. Three groups needed a choice. The four device keys are named for what they
 * print, `TV / AVR` and so on, which is the honest reading and is **not** a name shared across models:
 * the Harmony 300 prints `TV`, `Cable/Sat`, `DVD` and `VCR/Aux` on the same four keys, and section 265
 * found that the key's position is what picks the infrared group. The key printed `Clear` under a dot and
 * a plus is named `Clear`, although a Harmony One's `+` over `clear` measured as `NumberPlus`, because
 * that is the One's code and not this remote's. And the five favourite keys are `Favorite1` to
 * `Favorite5`, from the word printed between them.
 *
 * **No screen.** The Harmony 300 and 350 have none, so `screen` is absent rather than empty.
 */
import { segment, traced } from '../shapes.ts';
import { CASE_HEIGHT } from '../types.ts';
import type { Key, Model, Region, Rocker } from '../types.ts';

/**
 * The three bays the drawing outlines, each a single stroke around a group of keys.
 *
 * Seams and not recesses, because the drawing gives a line and nothing about depth: on the photograph
 * the device bay and the navigation bay read as raised gloss panels and the transport bay is not shown
 * at all. The two flourishes either side of `My Devices` are printing on the bay and are left out, the
 * way a decorative relief line is.
 */
const REGIONS: readonly Region[] = [
  // Extracted shape 2: the device bay, around the four device keys, with the power key at its corner.
  { id: 'devices-bay', form: 'seam', path: 'M 132.773 184.728 L 69.668 184.728 C 44.02 184.728 33.51 177.898 36.307 148.985 C 37.149 140.305 37.574 130.316 38.214 121.623 C 40.223 94.338 48.445 88.252 73.317 86.041 C 93.233 84.273 111.849 83.647 132.773 83.647 C 153.71 83.647 172.326 84.273 192.228 86.041 C 217.1 88.252 225.333 94.338 227.334 121.623 C 227.972 130.316 228.397 140.305 229.238 148.985 C 232.035 177.898 221.526 184.728 195.888 184.728 Z' },
  // Shape 1: the navigation bay, around Menu, Exit, Info, Guide and the arrow pair.
  { id: 'navigation-bay', form: 'seam', path: 'M 56.798 387.212 C 31.266 387.212 23.244 380.543 22.097 354.097 C 21.915 349.925 21.266 322.204 21.193 317.321 C 20.735 287.12 32.713 282.449 56 282.449 L 209.559 282.449 C 232.833 282.449 244.813 287.12 244.355 317.321 C 244.282 322.204 243.631 349.925 243.451 354.097 C 242.302 380.543 234.282 387.212 208.751 387.212 Z' },
  // Shape 0: the transport bay.
  { id: 'transport-bay', form: 'seam', path: 'M 69.829 745.212 C 42.021 745.212 32.288 735.552 32.288 704.15 C 32.288 700.171 34.224 653.981 34.382 650.075 C 35.733 617.567 40.553 611.47 69.488 611.47 L 196.057 611.47 C 225.003 611.47 229.813 617.567 231.163 650.075 C 231.324 653.981 233.26 700.171 233.26 704.15 C 233.26 735.552 223.525 745.212 195.717 745.212 Z' },
];

/**
 * The mouldings.
 *
 * Four, and every split is derived rather than drawn: the drawing gives one outline per part and no seam
 * inside any of them, and the photograph shows none either. So each splits on its own middle, which is
 * the box centre of the extracted outline, and a segment is the moulding clipped to that half.
 *
 * **The play and pause part is a moulding here and that is checked, not assumed**: on a Harmony 600 the
 * same tall key carries a smaller pause key inset in it and is therefore an ordinary key with another on
 * top, and the Harmony 300's drawing has that inset too. This drawing gives the 350's part one outline
 * with the two symbols printed on it and nothing inside, so it is one part with two halves.
 */
const ROCKERS: readonly Rocker[] = [
  {
    // Shape 6, split at y 335.071.
    id: 'rocker-arrows',
    keys: ['UpArrow', 'DownArrow'],
    path: 'M 132.773 377.648 C 116.561 377.809 109.731 375.796 108.581 361.128 C 107.89 352.362 108.23 316.564 108.775 308.906 C 109.529 298.427 111.381 292.343 132.773 292.493 C 154.178 292.343 156.016 298.427 156.773 308.906 C 157.315 316.564 157.656 352.362 156.964 361.128 C 155.815 375.796 148.985 377.809 132.773 377.648 Z',
  },
  {
    // Shape 4, split at y 493.991. `Vol` is printed on the pivot, centred on the drawing's own glyphs.
    id: 'rocker-volume',
    keys: ['VolumeUp', 'VolumeDown'],
    labels: [{ text: 'Vol', place: 'on', x: 54.7, y: 497.4, size: 'small' }],
    path: 'M 47.083 438.04 C 40 438.04 37.105 441.485 37.713 448.253 C 37.914 450.508 44.447 538.994 44.66 541.015 C 45.297 547.303 47.734 549.952 54.042 549.952 C 57.043 549.952 67.446 549.952 69.2 549.952 C 77.669 549.952 81.721 545.187 81.721 537.006 C 81.721 527.749 79.423 525.165 76.136 520.813 C 65.232 506.431 63.105 488.572 73.456 471.423 C 76.604 466.21 77.457 463.868 77.457 457.847 L 77.457 450.551 C 77.457 443.868 74.232 438.03 64.935 438.03 C 61.201 438.03 50.956 438.04 47.083 438.04 Z',
  },
  {
    // Shape 5, split the same way.
    id: 'rocker-channel',
    keys: ['ChannelUp', 'ChannelDown'],
    labels: [{ text: 'Ch', place: 'on', x: 211.9, y: 497.4, size: 'small' }],
    path: 'M 218.462 438.04 C 225.548 438.04 228.451 441.485 227.833 448.253 C 227.631 450.508 221.101 538.994 220.888 541.015 C 220.248 547.303 217.814 549.952 211.504 549.952 C 208.516 549.952 198.111 549.952 196.357 549.952 C 187.887 549.952 183.835 545.187 183.835 537.006 C 183.835 527.749 186.123 525.165 189.42 520.813 C 200.314 506.431 202.452 488.572 192.089 471.423 C 188.952 466.21 188.102 463.868 188.102 457.847 L 188.102 450.551 C 188.102 443.868 191.324 438.03 200.621 438.03 C 204.355 438.03 214.589 438.04 218.462 438.04 Z',
  },
  {
    // Shape 3, split at y 680.319.
    id: 'rocker-play',
    keys: ['Play', 'Pause'],
    path: 'M 132.773 732.488 C 116.561 732.69 109.731 730.223 108.581 712.243 C 107.89 701.511 108.23 657.649 108.775 648.267 C 109.529 635.427 111.381 627.97 132.773 628.15 C 154.178 627.97 156.016 635.427 156.773 648.267 C 157.315 657.649 157.656 701.511 156.964 712.243 C 155.815 730.223 148.985 732.69 132.773 732.488 Z',
  },
];

/**
 * The keys, 55 of them, in reading order.
 *
 * Each comment names the extracted shape it came from, so a reading can be checked against
 * `bin/extract.ts` run on the page. A `markAt` is the centre of the drawing's own printed mark and a
 * `markSize` that mark's longer side, both in this package's units.
 */
const KEYS: readonly Key[] = [
  // Shape 32. The television mark on the key and `Watch TV` printed beneath it.
  { name: 'WatchTV', src: 'printed', kind: 'keypad', shape: traced('M 77.86 53.968 C 77.86 60.063 72.871 65.052 66.787 65.052 L 56 65.052 C 49.902 65.052 44.913 60.063 44.913 53.968 L 44.913 45.553 C 44.913 39.455 49.902 34.477 56 34.477 L 66.787 34.477 C 72.871 34.477 77.86 39.455 77.86 45.553 Z'), angle: 0, icon: 'tv', markSize: 20.1, labels: [{ text: 'Watch TV', place: 'below', size: 'small' }] },
  // Shapes 27, 26, 25 and 24: the four device keys, left to right and top to bottom.
  { name: 'TvAvr', src: 'printed', kind: 'keypad', shape: traced('M 117.784 127.41 C 116.294 129.91 114.358 132.007 108.892 132.933 C 101.795 134.156 85.147 134.2 78.562 132.933 C 71.966 131.678 70.499 128.911 69.668 127.41 C 68.2 124.782 68.222 117.252 69.668 114.987 C 70.583 113.541 71.966 110.73 78.562 109.475 C 85.147 108.211 101.795 108.263 108.892 109.475 C 114.358 110.401 116.37 112.454 117.784 114.987 C 119.317 117.721 119.05 125.294 117.784 127.41 Z'), angle: 0, labels: [{ text: 'TV / AVR', place: 'on', size: 'tiny' }] },
  { name: 'CableDvd', src: 'printed', kind: 'keypad', shape: traced('M 147.762 127.41 C 149.262 129.91 151.188 132.007 156.656 132.933 C 163.75 134.156 180.409 134.2 186.983 132.933 C 193.579 131.678 195.047 128.911 195.888 127.41 C 197.345 124.782 197.324 117.252 195.888 114.987 C 194.962 113.541 193.579 110.73 186.983 109.475 C 180.409 108.211 163.75 108.263 156.656 109.475 C 151.188 110.401 149.189 112.454 147.762 114.987 C 146.242 117.721 146.495 125.294 147.762 127.41 Z'), angle: 0, labels: [{ text: 'Cable/DVD', place: 'on', size: 'tiny' }] },
  { name: 'BdMedia', src: 'printed', kind: 'keypad', shape: traced('M 117.784 166.539 C 116.294 169.039 114.358 171.133 108.892 172.07 C 101.795 173.282 85.147 173.326 78.562 172.07 C 71.966 170.804 70.499 168.037 69.668 166.539 C 68.2 163.911 68.222 156.378 69.668 154.124 C 70.583 152.667 71.966 149.859 78.562 148.592 C 85.147 147.337 101.795 147.378 108.892 148.592 C 114.358 149.527 116.37 151.58 117.784 154.124 C 119.317 156.847 119.05 164.42 117.784 166.539 Z'), angle: 0, labels: [{ text: 'BD / Media', place: 'on', size: 'tiny' }] },
  { name: 'GameMp3', src: 'printed', kind: 'keypad', shape: traced('M 147.762 166.539 C 149.262 169.039 151.188 171.133 156.656 172.07 C 163.75 173.282 180.409 173.326 186.983 172.07 C 193.579 170.804 195.047 168.037 195.888 166.539 C 197.345 163.911 197.324 156.378 195.888 154.124 C 194.962 152.667 193.579 149.859 186.983 148.592 C 180.409 147.337 163.75 147.378 156.656 148.592 C 151.188 149.527 149.189 151.58 147.762 154.124 C 146.242 156.847 146.495 164.42 147.762 166.539 Z'), angle: 0, labels: [{ text: 'Game/MP3', place: 'on', size: 'tiny' }] },
  // Shape 59. It switches the selected device, per the guide, so it is `Power` and not an all off key.
  { name: 'Power', src: 'printed', kind: 'keypad', shape: traced('M 231.46 178.219 C 231.46 172.122 226.482 167.133 220.387 167.133 L 216.174 167.133 C 210.09 167.133 205.101 172.122 205.101 178.219 L 205.101 181.994 C 205.101 188.091 210.09 193.07 216.174 193.07 L 220.387 193.07 C 226.482 193.07 231.46 188.091 231.46 181.994 Z'), angle: 0, icon: 'power', markAt: { x: 218.1, y: 180 }, markSize: 12.6 },
  // Shape 17.
  { name: 'Input', src: 'printed', kind: 'keypad', shape: traced('M 107.754 218.887 C 109.295 221.387 111.294 223.473 116.945 224.41 C 124.295 225.622 141.517 225.662 148.326 224.41 C 155.145 223.143 156.667 220.387 157.528 218.887 C 159.039 216.248 159.017 208.718 157.528 206.463 C 156.569 205.014 155.145 202.196 148.326 200.94 C 141.517 199.676 124.295 199.728 116.945 200.94 C 111.294 201.877 109.221 203.919 107.754 206.463 C 106.169 209.186 106.433 216.76 107.754 218.887 Z'), angle: 0, labels: [{ text: 'Input', place: 'on', size: 'small' }] },
  // Shapes 53, 50, 52, 51 and 54. The numbering runs down the left, along the bottom and up the right.
  { name: 'Favorite1', src: 'printed', kind: 'keypad', shape: traced('M 89.701 230.728 C 88.551 233.152 87.073 235.186 82.892 236.09 C 77.468 237.28 64.722 237.324 59.679 236.09 C 54.638 234.864 53.51 232.185 52.871 230.728 C 51.754 228.162 51.776 220.834 52.871 218.642 C 53.573 217.239 54.638 214.494 59.679 213.282 C 64.722 212.046 77.468 212.1 82.892 213.282 C 87.073 214.186 88.614 216.174 89.701 218.642 C 90.869 221.302 90.667 228.663 89.701 230.728 Z'), angle: 0, labels: [{ text: '1', place: 'on' }] },
  { name: 'Favorite2', src: 'printed', kind: 'keypad', shape: traced('M 89.701 266.61 C 88.551 269.034 87.073 271.066 82.892 271.981 C 77.468 273.163 64.722 273.206 59.679 271.981 C 54.638 270.758 53.51 268.067 52.871 266.61 C 51.754 264.045 51.776 256.727 52.871 254.524 C 53.573 253.119 54.638 250.387 59.679 249.162 C 64.722 247.939 77.468 247.983 82.892 249.162 C 87.073 250.066 88.614 252.057 89.701 254.524 C 90.869 257.185 90.667 264.557 89.701 266.61 Z'), angle: 0, labels: [{ text: '2', place: 'on' }] },
  { name: 'Favorite3', src: 'printed', kind: 'keypad', shape: traced('M 151.199 266.61 C 150.06 269.034 148.582 271.066 144.39 271.981 C 138.966 273.163 126.22 273.206 121.188 271.981 C 116.147 270.758 115.019 268.067 114.379 266.61 C 113.252 264.045 113.274 256.727 114.379 254.524 C 115.082 253.119 116.147 250.387 121.188 249.162 C 126.22 247.939 138.966 247.983 144.39 249.162 C 148.582 250.066 150.112 252.057 151.199 254.524 C 152.367 257.185 152.165 264.557 151.199 266.61 Z'), angle: 0, labels: [{ text: '3', place: 'on' }] },
  { name: 'Favorite4', src: 'printed', kind: 'keypad', shape: traced('M 175.847 266.61 C 176.994 269.034 178.473 271.066 182.656 271.981 C 188.091 273.163 200.823 273.206 205.867 271.981 C 210.91 270.758 212.038 268.067 212.675 266.61 C 213.791 264.045 213.781 256.727 212.675 254.524 C 211.972 253.119 210.91 250.387 205.867 249.162 C 200.823 247.939 188.091 247.983 182.656 249.162 C 178.473 250.066 176.931 252.057 175.847 254.524 C 174.676 257.185 174.878 264.557 175.847 266.61 Z'), angle: 0, labels: [{ text: '4', place: 'on' }] },
  { name: 'Favorite5', src: 'printed', kind: 'keypad', shape: traced('M 175.847 230.728 C 176.994 233.152 178.473 235.186 182.656 236.09 C 188.091 237.28 200.823 237.324 205.867 236.09 C 210.91 234.864 212.038 232.185 212.675 230.728 C 213.791 228.162 213.781 220.834 212.675 218.642 C 211.972 217.239 210.91 214.494 205.867 213.282 C 200.823 212.046 188.091 212.1 182.656 213.282 C 178.473 214.186 176.931 216.174 175.847 218.642 C 174.676 221.302 174.878 228.663 175.847 230.728 Z'), angle: 0, labels: [{ text: '5', place: 'on' }] },
  // Shapes 13, 11, 12 and 14.
  { name: 'Menu', src: 'printed', kind: 'keypad', shape: traced('M 89.796 322.449 C 88.031 325.192 85.755 327.479 79.338 328.5 C 71 329.84 51.435 329.895 43.69 328.5 C 35.956 327.117 34.224 324.097 33.244 322.449 C 31.52 319.554 31.552 311.289 33.244 308.811 C 34.319 307.215 35.956 304.129 43.69 302.746 C 51.435 301.362 71 301.417 79.338 302.746 C 85.755 303.767 88.116 306.022 89.796 308.811 C 91.582 311.809 91.275 320.118 89.796 322.449 Z'), angle: 0, labels: [{ text: 'Menu', place: 'on' }] },
  { name: 'Info', src: 'printed', kind: 'keypad', shape: traced('M 175.76 322.449 C 177.517 325.192 179.794 327.479 186.207 328.5 C 194.559 329.84 214.121 329.895 221.855 328.5 C 229.6 327.117 231.324 324.097 232.313 322.449 C 234.037 319.554 234.004 311.289 232.313 308.811 C 231.229 307.215 229.6 304.129 221.855 302.746 C 214.121 301.362 194.559 301.417 186.207 302.746 C 179.794 303.767 177.432 306.022 175.76 308.811 C 173.963 311.809 174.271 320.118 175.76 322.449 Z'), angle: 0, labels: [{ text: 'Info', place: 'on' }] },
  { name: 'Exit', src: 'printed', kind: 'keypad', shape: traced('M 93.083 360.576 C 91.327 363.307 89.053 365.606 82.636 366.627 C 74.298 367.967 54.733 368.01 46.988 366.627 C 39.243 365.243 37.522 362.212 36.531 360.576 C 34.818 357.681 34.839 349.405 36.531 346.937 C 37.617 345.341 39.243 342.256 46.988 340.872 C 54.733 339.489 74.298 339.543 82.636 340.872 C 89.053 341.894 91.414 344.149 93.083 346.937 C 94.88 349.936 94.573 358.244 93.083 360.576 Z'), angle: 0, labels: [{ text: 'Exit', place: 'on' }] },
  { name: 'Guide', src: 'printed', kind: 'keypad', shape: traced('M 172.462 360.576 C 174.219 363.307 176.496 365.606 182.909 366.627 C 191.261 367.967 210.823 368.01 218.557 366.627 C 226.302 365.243 228.026 362.212 229.015 360.576 C 230.739 357.681 230.706 349.405 229.015 346.937 C 227.931 345.341 226.302 342.256 218.557 340.872 C 210.823 339.489 191.261 339.543 182.909 340.872 C 176.496 341.894 174.134 344.149 172.462 346.937 C 170.665 349.936 170.975 358.244 172.462 360.576 Z'), angle: 0, labels: [{ text: 'Guide', place: 'on' }] },
  // The two halves of shape 6.
  { name: 'UpArrow', src: 'printed', kind: 'keypad', shape: segment('M 100 285 L 165 285 L 165 335.071 L 100 335.071 Z'), angle: 0, icon: 'chevronUp', markAt: { x: 132.8, y: 312.9 }, markSize: 17.4 },
  { name: 'DownArrow', src: 'printed', kind: 'keypad', shape: segment('M 100 335.071 L 165 335.071 L 165 385 L 100 385 Z'), angle: 0, icon: 'chevronDown', markAt: { x: 132.8, y: 357.4 }, markSize: 17.4 },
  // Shapes 55, 58, 57 and 56. The drawing shades the four bars in four greys and the photograph shows
  // the third as the lightest, which is the yellow in the usual red, green, yellow, blue order.
  { name: 'Red', src: 'printed', kind: 'keypad', shape: traced('M 76.158 413.223 C 75.052 415.499 73.617 417.403 69.573 418.253 C 64.328 419.358 52.01 419.402 47.138 418.253 C 42.266 417.104 41.179 414.593 40.553 413.223 C 39.477 410.818 39.499 403.944 40.553 401.88 C 41.245 400.562 42.266 397.999 47.138 396.85 C 52.01 395.701 64.328 395.745 69.573 396.85 C 73.617 397.7 75.104 399.574 76.158 401.88 C 77.285 404.38 77.094 411.287 76.158 413.223 Z'), angle: 0, icon: 'bar', markSize: 20.2, accent: '#d23c3c' },
  { name: 'Green', src: 'printed', kind: 'keypad', shape: traced('M 126.06 413.223 C 124.954 415.499 123.519 417.403 119.486 418.253 C 114.232 419.358 101.912 419.402 97.04 418.253 C 92.168 417.104 91.084 414.593 90.466 413.223 C 89.382 410.818 89.401 403.944 90.466 401.88 C 91.147 400.562 92.168 397.999 97.04 396.85 C 101.912 395.701 114.232 395.745 119.486 396.85 C 123.519 397.7 125.009 399.574 126.06 401.88 C 127.187 404.38 126.997 411.287 126.06 413.223 Z'), angle: 0, icon: 'bar', markSize: 20.2, accent: '#2f9e44' },
  { name: 'Yellow', src: 'printed', kind: 'keypad', shape: traced('M 139.486 413.223 C 140.591 415.499 142.029 417.403 146.071 418.253 C 151.327 419.358 163.633 419.402 168.505 418.253 C 173.377 417.104 174.475 414.593 175.079 413.223 C 176.166 410.818 176.144 403.944 175.079 401.88 C 174.399 400.562 173.377 397.999 168.505 396.85 C 163.633 395.701 151.327 395.745 146.071 396.85 C 142.029 397.7 140.54 399.574 139.486 401.88 C 138.358 404.38 138.549 411.287 139.486 413.223 Z'), angle: 0, icon: 'bar', markSize: 20.2, accent: '#d9c22b' },
  { name: 'Blue', src: 'printed', kind: 'keypad', shape: traced('M 189.388 413.223 C 190.493 415.499 191.931 417.403 195.973 418.253 C 201.229 419.358 213.535 419.402 218.418 418.253 C 223.282 417.104 224.377 414.593 224.992 413.223 C 226.068 410.818 226.057 403.944 224.992 401.88 C 224.312 400.562 223.282 397.999 218.418 396.85 C 213.535 395.701 201.229 395.745 195.973 396.85 C 191.931 397.7 190.453 399.574 189.388 401.88 C 188.26 404.38 188.454 411.287 189.388 413.223 Z'), angle: 0, icon: 'bar', markSize: 20.2, accent: '#3b6fd4' },
  // The two halves of shape 4: the louder end carries the waves, the quieter end the bare cone.
  { name: 'VolumeUp', src: 'printed', kind: 'keypad', shape: segment('M 30 430 L 90 430 L 90 493.991 L 30 493.991 Z'), angle: 0, icon: 'speakerWaves', markAt: { x: 57.3, y: 456.9 }, markSize: 15.1 },
  { name: 'VolumeDown', src: 'printed', kind: 'keypad', shape: segment('M 30 493.991 L 90 493.991 L 90 558 L 30 558 Z'), angle: 0, icon: 'speaker', markAt: { x: 61.4, y: 531.1 }, markSize: 10.1 },
  // Shapes 22, 21, 23 and 20: four separate keys round the OK key, not a moulding.
  { name: 'DirectionUp', src: 'printed', kind: 'keypad', shape: traced('M 124.486 439.211 C 130.009 438.326 135.177 438.04 141.038 439.211 C 153.582 441.731 154.102 445.805 151.931 455.87 C 151.73 456.826 150.591 461.273 150.218 462.273 C 148.699 466.273 146.016 468.847 141.092 468.836 C 139.793 468.836 126.242 468.828 124.358 468.942 C 120.199 469.187 116.487 466.317 115.21 462.273 C 114.72 460.72 113.816 457.39 113.497 455.881 C 111.498 446.613 112.135 441.199 124.486 439.211 Z'), angle: 0, icon: 'triangleUp', markAt: { x: 132.8, y: 452.3 }, markSize: 14.3 },
  { name: 'DirectionRight', src: 'printed', kind: 'keypad', shape: traced('M 187.879 486.039 C 188.761 491.548 189.058 496.72 187.879 502.591 C 185.357 515.124 181.283 515.644 171.218 513.485 C 170.262 513.272 165.815 512.134 164.826 511.761 C 160.815 510.241 158.252 507.559 158.252 502.635 C 158.263 501.347 158.263 487.782 158.154 485.9 C 157.901 481.742 160.782 478.027 164.815 476.752 C 166.368 476.273 169.698 475.369 171.207 475.039 C 180.474 473.038 185.888 473.689 187.879 486.039 Z'), angle: 0, icon: 'triangleRight', markAt: { x: 174.6, y: 494.1 }, markSize: 14.3 },
  { name: 'DirectionDown', src: 'printed', kind: 'keypad', shape: traced('M 124.486 549.419 C 130.009 550.304 135.177 550.601 141.038 549.419 C 153.582 546.9 154.102 542.834 151.931 532.76 C 151.73 531.804 150.591 527.368 150.218 526.366 C 148.699 522.357 146.016 519.792 141.092 519.803 C 139.793 519.803 126.242 519.803 124.358 519.696 C 120.199 519.451 116.487 522.324 115.21 526.366 C 114.72 527.91 113.816 531.241 113.497 532.749 C 111.498 542.025 112.135 547.442 124.486 549.419 Z'), angle: 0, icon: 'triangleDown', markAt: { x: 132.8, y: 535.9 }, markSize: 14.3 },
  { name: 'DirectionLeft', src: 'printed', kind: 'keypad', shape: traced('M 77.669 486.039 C 76.787 491.548 76.498 496.72 77.669 502.591 C 80.191 515.124 84.265 515.644 94.328 513.485 C 95.286 513.272 99.731 512.134 100.722 511.761 C 104.731 510.241 107.296 507.559 107.296 502.635 C 107.296 501.347 107.296 487.782 107.402 485.9 C 107.636 481.742 104.763 478.027 100.733 476.752 C 99.178 476.273 95.85 475.369 94.338 475.039 C 85.074 473.038 79.657 473.689 77.669 486.039 Z'), angle: 0, icon: 'triangleLeft', markAt: { x: 91, y: 494.1 }, markSize: 14.3 },
  // Shape 45.
  { name: 'Select', src: 'printed', kind: 'keypad', shape: traced('M 148.08 490.187 C 148.08 484.092 143.091 479.114 137.007 479.114 L 128.549 479.114 C 122.454 479.114 117.476 484.092 117.476 490.187 L 117.476 498.506 C 117.476 504.601 122.454 509.579 128.549 509.579 L 137.007 509.579 C 143.091 509.579 148.08 504.601 148.08 498.506 Z'), angle: 0, labels: [{ text: 'OK', place: 'on', size: 'small' }] },
  // The two halves of shape 5.
  { name: 'ChannelUp', src: 'printed', kind: 'keypad', shape: segment('M 176 430 L 236 430 L 236 493.991 L 176 493.991 Z'), angle: 0, icon: 'plus', markAt: { x: 209.2, y: 456.2 }, markSize: 12.7 },
  { name: 'ChannelDown', src: 'printed', kind: 'keypad', shape: segment('M 176 493.991 L 236 493.991 L 236 558 L 176 558 Z'), angle: 0, icon: 'minus', markAt: { x: 203.9, y: 531.6 }, markSize: 11.5 },
  // Shapes 19, 47, 46 and 18.
  { name: 'VolumeMute', src: 'printed', kind: 'keypad', shape: traced('M 43.668 572.673 C 43.668 566.589 48.658 561.6 54.744 561.6 L 66.659 561.6 C 72.753 561.6 77.732 566.589 77.732 572.673 L 77.732 584.481 C 77.732 590.579 72.753 595.557 66.659 595.557 L 54.744 595.557 C 48.658 595.557 43.668 590.579 43.668 584.481 Z'), angle: 0, icon: 'mute', markAt: { x: 61.5, y: 578.8 }, markSize: 11.3 },
  { name: 'Dvr', src: 'printed', kind: 'keypad', shape: traced('M 126.465 593.866 C 125.273 596.407 123.731 598.534 119.401 599.481 C 113.764 600.726 100.529 600.77 95.294 599.481 C 90.063 598.193 88.892 595.397 88.222 593.866 C 87.062 591.184 87.084 583.515 88.222 581.216 C 88.954 579.737 90.063 576.875 95.294 575.59 C 100.529 574.302 113.764 574.356 119.401 575.59 C 123.731 576.546 125.338 578.621 126.465 581.216 C 127.677 583.994 127.476 591.706 126.465 593.866 Z'), angle: 0, labels: [{ text: 'DVR', place: 'on', size: 'small' }] },
  { name: 'Live', src: 'printed', kind: 'keypad', shape: traced('M 139.083 593.866 C 140.284 596.407 141.817 598.534 146.155 599.481 C 151.784 600.726 165.017 600.77 170.251 599.481 C 175.485 598.193 176.654 595.397 177.326 593.866 C 178.484 591.184 178.465 583.515 177.326 581.216 C 176.591 579.737 175.485 576.875 170.251 575.59 C 165.017 574.302 151.784 574.356 146.155 575.59 C 141.817 576.546 140.221 578.621 139.083 581.216 C 137.868 583.994 138.07 591.706 139.083 593.866 Z'), angle: 0, labels: [{ text: 'Live', place: 'on', size: 'small' }] },
  { name: 'PrevChannel', src: 'printed', kind: 'keypad', shape: traced('M 221.877 572.673 C 221.877 566.589 216.899 561.6 210.804 561.6 L 198.889 561.6 C 192.792 561.6 187.814 566.589 187.814 572.673 L 187.814 584.481 C 187.814 590.579 192.792 595.557 198.889 595.557 L 210.804 595.557 C 216.899 595.557 221.877 590.579 221.877 584.481 Z'), angle: 0, icon: 'back', markAt: { x: 204.7, y: 577.5 }, markSize: 13.4 },
  // Shapes 16 and 15, then 31 and 28, then 29 and 30, with the play part between them.
  { name: 'Rewind', src: 'printed', kind: 'keypad', shape: traced('M 97.636 645.862 C 96.147 649.098 94.221 651.799 88.786 653.011 C 81.732 654.585 65.158 654.65 58.606 653.011 C 52.054 651.385 50.583 647.809 49.766 645.862 C 48.309 642.447 48.339 632.684 49.766 629.757 C 50.67 627.886 52.054 624.236 58.606 622.608 C 65.158 620.971 81.732 621.034 88.786 622.608 C 94.221 623.823 96.22 626.47 97.636 629.757 C 99.156 633.289 98.903 643.109 97.636 645.862 Z'), angle: 0, icon: 'rewind', markAt: { x: 72.3, y: 637.8 }, markSize: 13.7 },
  { name: 'FastForward', src: 'printed', kind: 'keypad', shape: traced('M 167.912 645.862 C 169.399 649.098 171.324 651.799 176.762 653.011 C 183.813 654.585 200.387 654.65 206.942 653.011 C 213.495 651.385 214.962 647.809 215.793 645.862 C 217.25 642.447 217.217 632.684 215.793 629.757 C 214.867 627.886 213.495 624.236 206.942 622.608 C 200.387 620.971 183.813 621.034 176.762 622.608 C 171.324 623.823 169.325 626.47 167.912 629.757 C 166.389 633.289 166.656 643.109 167.912 645.862 Z'), angle: 0, icon: 'forward', markAt: { x: 193.3, y: 637.8 }, markSize: 13.7 },
  { name: 'SkipBack', src: 'printed', kind: 'keypad', shape: traced('M 91.242 684.318 C 89.924 687.148 88.222 689.512 83.413 690.574 C 77.157 691.946 62.5 692.001 56.691 690.574 C 50.893 689.149 49.583 686.02 48.862 684.318 C 47.574 681.32 47.595 672.788 48.862 670.236 C 49.671 668.597 50.893 665.394 56.691 663.97 C 62.5 662.543 77.157 662.608 83.413 663.97 C 88.222 665.032 89.987 667.352 91.242 670.236 C 92.593 673.319 92.359 681.905 91.242 684.318 Z'), angle: 0, icon: 'skipBack', markAt: { x: 69.4, y: 677.2 }, markSize: 13.7 },
  { name: 'SkipForward', src: 'printed', kind: 'keypad', shape: traced('M 174.303 684.318 C 175.624 687.148 177.326 689.512 182.144 690.574 C 188.388 691.946 203.059 692.001 208.868 690.574 C 214.666 689.149 215.962 686.02 216.686 684.318 C 217.983 681.32 217.961 672.788 216.686 670.236 C 215.888 668.597 214.666 665.394 208.868 663.97 C 203.059 662.543 188.388 662.608 182.144 663.97 C 177.326 665.032 175.559 667.352 174.303 670.236 C 172.953 673.319 173.187 681.905 174.303 684.318 Z'), angle: 0, icon: 'skipForward', markAt: { x: 195.6, y: 677.2 }, markSize: 13.7 },
  { name: 'Record', src: 'printed', kind: 'keypad', shape: traced('M 93.361 723.594 C 92.051 726.434 90.338 728.806 85.531 729.86 C 79.276 731.244 64.616 731.287 58.807 729.86 C 52.999 728.436 51.713 725.307 50.978 723.594 C 49.679 720.617 49.711 712.085 50.978 709.52 C 51.787 707.883 52.999 704.691 58.807 703.256 C 64.616 701.829 79.276 701.895 85.531 703.256 C 90.338 704.318 92.105 706.639 93.361 709.52 C 94.712 712.616 94.477 721.2 93.361 723.594 Z'), angle: 0, icon: 'record', markAt: { x: 72.4, y: 717 }, markSize: 9.2 },
  { name: 'Stop', src: 'printed', kind: 'keypad', shape: traced('M 172.187 723.594 C 173.505 726.434 175.207 728.806 180.028 729.86 C 186.272 731.244 200.94 731.287 206.749 729.86 C 212.547 728.436 213.846 725.307 214.568 723.594 C 215.867 720.617 215.845 712.085 214.568 709.52 C 213.759 707.883 212.547 704.691 206.749 703.256 C 200.94 701.829 186.272 701.895 180.028 703.256 C 175.207 704.318 173.443 706.639 172.187 709.52 C 170.837 712.616 171.071 721.2 172.187 723.594 Z'), angle: 0, icon: 'stop', markAt: { x: 193.8, y: 716.5 }, markSize: 8 },
  // The two halves of shape 3.
  { name: 'Play', src: 'printed', kind: 'keypad', shape: segment('M 100 620 L 165 620 L 165 680.319 L 100 680.319 Z'), angle: 0, icon: 'play', markAt: { x: 132.9, y: 657.3 }, markSize: 13.7 },
  { name: 'Pause', src: 'printed', kind: 'keypad', shape: segment('M 100 680.319 L 165 680.319 L 165 740 L 100 740 Z'), angle: 0, icon: 'pause', markAt: { x: 132.8, y: 701.9 }, markSize: 12.1 },
  // Shapes 41, 38, 39, 42, 37, 40, 36, 35, 34, then 43, 33 and 44.
  { name: 'Number1', src: 'printed', kind: 'keypad', shape: traced('M 94.137 774.082 C 92.903 776.753 91.307 778.986 86.806 779.975 C 80.978 781.285 67.263 781.328 61.838 779.975 C 56.424 778.635 55.213 775.688 54.532 774.082 C 53.317 771.263 53.339 763.21 54.532 760.795 C 55.286 759.253 56.424 756.244 61.838 754.89 C 67.263 753.54 80.978 753.594 86.806 754.89 C 91.307 755.893 92.966 758.082 94.137 760.795 C 95.392 763.722 95.177 771.816 94.137 774.082 Z'), angle: 0, labels: [{ text: '1', place: 'on' }] },
  { name: 'Number2', src: 'printed', kind: 'keypad', shape: traced('M 112.955 774.082 C 114.189 776.753 115.785 778.986 120.284 779.975 C 126.114 781.285 139.826 781.328 145.251 779.975 C 150.665 778.635 151.879 775.688 152.571 774.082 C 153.761 771.263 153.75 763.21 152.571 760.795 C 151.803 759.253 150.665 756.244 145.251 754.89 C 139.826 753.54 126.114 753.594 120.284 754.89 C 115.785 755.893 114.126 758.082 112.955 760.795 C 111.7 763.722 111.912 771.816 112.955 774.082 Z'), angle: 0, labels: [{ text: '2', place: 'on' }, { text: 'abc', place: 'below', size: 'small' }] },
  { name: 'Number3', src: 'printed', kind: 'keypad', shape: traced('M 171.422 774.082 C 172.656 776.753 174.241 778.986 178.74 779.975 C 184.581 781.285 198.282 781.328 203.707 779.975 C 209.132 778.635 210.336 775.688 211.027 774.082 C 212.228 771.263 212.206 763.21 211.027 760.795 C 210.27 759.253 209.132 756.244 203.707 754.89 C 198.282 753.54 184.581 753.594 178.74 754.89 C 174.241 755.893 172.59 758.082 171.422 760.795 C 170.167 763.722 170.368 771.816 171.422 774.082 Z'), angle: 0, labels: [{ text: '3', place: 'on' }, { text: 'def', place: 'below', size: 'small' }] },
  { name: 'Number4', src: 'printed', kind: 'keypad', shape: traced('M 94.137 814.528 C 92.903 817.208 91.307 819.433 86.806 820.433 C 80.978 821.729 67.263 821.783 61.838 820.433 C 56.424 819.082 55.213 816.135 54.532 814.528 C 53.317 811.71 53.339 803.657 54.532 801.241 C 55.286 799.7 56.424 796.688 61.838 795.348 C 67.263 793.997 80.978 794.049 86.806 795.348 C 91.307 796.347 92.966 798.529 94.137 801.241 C 95.392 804.166 95.177 812.263 94.137 814.528 Z'), angle: 0, labels: [{ text: '4', place: 'on' }, { text: 'ghi', place: 'below', size: 'small' }] },
  { name: 'Number5', src: 'printed', kind: 'keypad', shape: traced('M 112.955 814.528 C 114.189 817.208 115.785 819.433 120.284 820.433 C 126.114 821.729 139.826 821.783 145.251 820.433 C 150.665 819.082 151.879 816.135 152.571 814.528 C 153.761 811.71 153.75 803.657 152.571 801.241 C 151.803 799.7 150.665 796.688 145.251 795.348 C 139.826 793.997 126.114 794.049 120.284 795.348 C 115.785 796.347 114.126 798.529 112.955 801.241 C 111.7 804.166 111.912 812.263 112.955 814.528 Z'), angle: 0, labels: [{ text: '5', place: 'on' }, { text: 'jkl', place: 'below', size: 'small' }] },
  { name: 'Number6', src: 'printed', kind: 'keypad', shape: traced('M 171.422 814.528 C 172.656 817.208 174.241 819.433 178.74 820.433 C 184.581 821.729 198.282 821.783 203.707 820.433 C 209.132 819.082 210.336 816.135 211.027 814.528 C 212.228 811.71 212.206 803.657 211.027 801.241 C 210.27 799.7 209.132 796.688 203.707 795.348 C 198.282 793.997 184.581 794.049 178.74 795.348 C 174.241 796.347 172.59 798.529 171.422 801.241 C 170.167 804.166 170.368 812.263 171.422 814.528 Z'), angle: 0, labels: [{ text: '6', place: 'on' }, { text: 'mno', place: 'below', size: 'small' }] },
  { name: 'Number7', src: 'printed', kind: 'keypad', shape: traced('M 98.53 854.877 C 97.296 857.549 95.7 859.782 91.201 860.781 C 85.371 862.08 71.659 862.132 66.234 860.781 C 60.817 859.43 59.605 856.495 58.914 854.877 C 57.713 852.069 57.734 844.006 58.914 841.601 C 59.668 840.049 60.817 837.039 66.234 835.686 C 71.659 834.346 85.371 834.39 91.201 835.686 C 95.7 836.699 97.359 838.878 98.53 841.601 C 99.785 844.518 99.573 852.611 98.53 854.877 Z'), angle: 0, labels: [{ text: '7', place: 'on' }, { text: 'pqrs', place: 'below', size: 'small' }] },
  { name: 'Number8', src: 'printed', kind: 'keypad', shape: traced('M 112.955 854.877 C 114.189 857.549 115.785 859.782 120.284 860.781 C 126.114 862.08 139.826 862.132 145.251 860.781 C 150.665 859.43 151.879 856.495 152.571 854.877 C 153.761 852.069 153.75 844.006 152.571 841.601 C 151.803 840.049 150.665 837.039 145.251 835.686 C 139.826 834.346 126.114 834.39 120.284 835.686 C 115.785 836.699 114.126 838.878 112.955 841.601 C 111.7 844.518 111.912 852.611 112.955 854.877 Z'), angle: 0, labels: [{ text: '8', place: 'on' }, { text: 'tuv', place: 'below', size: 'small' }] },
  { name: 'Number9', src: 'printed', kind: 'keypad', shape: traced('M 167.016 854.877 C 168.26 857.549 169.845 859.782 174.347 860.781 C 180.186 862.08 193.889 862.132 199.314 860.781 C 204.739 859.43 205.94 856.495 206.632 854.877 C 207.836 852.069 207.814 844.006 206.632 841.601 C 205.877 840.049 204.739 837.039 199.314 835.686 C 193.889 834.346 180.186 834.39 174.347 835.686 C 169.845 836.699 168.198 838.878 167.016 841.601 C 165.771 844.518 165.975 852.611 167.016 854.877 Z'), angle: 0, labels: [{ text: '9', place: 'on' }, { text: 'wxyz', place: 'below', size: 'small' }] },
  { name: 'Clear', src: 'printed', kind: 'keypad', shape: traced('M 67.925 882.696 C 67.925 876.612 72.914 871.612 79.009 871.612 L 87.465 871.612 C 93.551 871.612 98.541 876.612 98.541 882.696 L 98.541 891.026 C 98.541 897.11 93.551 902.099 87.465 902.099 L 79.009 902.099 C 72.914 902.099 67.925 897.11 67.925 891.026 Z'), angle: 0, icon: 'dotPlus', markAt: { x: 83.1, y: 886.8 }, markSize: 12.2, labels: [{ text: 'Clear', place: 'below', size: 'small' }] },
  { name: 'Number0', src: 'printed', kind: 'keypad', shape: traced('M 112.955 895.207 C 114.189 897.876 115.785 900.111 120.284 901.111 C 126.114 902.407 139.826 902.451 145.251 901.111 C 150.665 899.76 151.879 896.803 152.571 895.207 C 153.761 892.388 153.75 884.324 152.571 881.92 C 151.803 880.367 150.665 877.355 145.251 876.015 C 139.826 874.665 126.114 874.716 120.284 876.015 C 115.785 877.015 114.126 879.207 112.955 881.92 C 111.7 884.844 111.912 892.941 112.955 895.207 Z'), angle: 0, labels: [{ text: '0', place: 'on' }] },
  { name: 'Enter', src: 'printed', kind: 'keypad', shape: traced('M 197.623 882.696 C 197.623 876.612 192.645 871.612 186.536 871.612 L 178.091 871.612 C 171.997 871.612 167.016 876.612 167.016 882.696 L 167.016 891.026 C 167.016 897.11 171.997 902.099 178.091 902.099 L 186.536 902.099 C 192.645 902.099 197.623 897.11 197.623 891.026 Z'), angle: 0, labels: [{ text: 'E', place: 'on', size: 'small' }, { text: 'Enter', place: 'below', size: 'small' }] },
];

export const H350: Model = {
  id: 'h350',
  label: 'Harmony 350',
  skins: [104],
  architecture: 16,
  width: 265.545,
  height: CASE_HEIGHT,
  case: 'M 132.773 1000 C 83.317 1000 54.638 968.704 33.796 912.652 C 21.468 879.493 15.172 836.549 12.119 798.251 C 2.5 677.755 22.255 624.299 10.714 498.049 C 6.767 454.933 0.384 362.191 0 352.223 C -3.148 268.939 3.415 130.232 13.499 47.764 C 16.767 21.084 23.159 12.914 48.042 7.906 C 76.403 2.192 103.775 0 132.773 0 C 161.784 0 189.143 2.192 217.503 7.906 C 242.386 12.914 248.781 21.084 252.046 47.764 C 262.13 130.232 268.694 268.939 265.545 352.223 C 265.172 362.191 258.781 454.933 254.832 498.049 C 243.29 624.299 263.045 677.755 253.429 798.251 C 250.376 836.549 244.077 879.493 231.749 912.652 C 210.918 968.704 182.239 1000 132.773 1000 Z',
  regions: REGIONS,
  rockers: ROCKERS,
  keys: KEYS,
  /**
   * The face prints `Harmony` beside the Watch TV key and no model number, on the photograph and on the
   * drawing alike, so the nameplate says exactly that.
   */
  nameplate: { text: 'Harmony', place: 'on', x: 131.8, y: 55.4, size: 'normal' },
  /**
   * The two words printed on the case that belong to a group of keys rather than to one, so they are
   * captions and not labels: a label lights up with its key, and neither of these is any one key's.
   */
  captions: [
    { text: 'My Devices', place: 'on', x: 133.1, y: 96.5, size: 'small' },
    { text: 'Favorites', place: 'on', x: 133.1, y: 239.3, size: 'small' },
  ],
};
