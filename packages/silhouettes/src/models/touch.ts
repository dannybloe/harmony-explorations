/**
 * The Harmony Touch, skin 99, architecture 17.
 *
 * **Architecture 17 is what the remote states and Logitech's specification says 18**, `docs/findings.md`
 * sections 197 and 200: `/sys/sysinfo` on the bench unit reports `arch 0x11`, and the per skin protocol
 * template in the mirrored client gives 18. The drawing takes the remote's word, since it is the one
 * read off hardware, and the disagreement stays open. Skin 99 is the remote's own too, section 195.
 *
 * **Geometry from Logitech's own drawing, read by a person**, the way the Harmony 350's was. The source
 * is the "Know your product" drawing in the Harmony Touch setup guide, printed page 4, which is page 52
 * of the copy in the lab at `Docs/touch manual.pdf` (the user guide and the setup guide are bound into
 * one PDF there; the legend naming the seventeen callouts is on page 53). That page is vector, which
 * `pdfimages -list` confirms by listing no image on it, so `pdftocairo -svg` turns it into strokes and
 * `bin/extract.ts` reads them as they stand. Every path in here is that drawing's own, moved into this
 * package's coordinates and nothing else. The page SVG stays in the lab, like every other trace.
 *
 * **What the extraction carries that is not the front face**, left out by index rather than by filter:
 * the side view of the remote drawn beside it with its two callouts, the IR window and the USB port; the
 * seventeen numbered leader lines; the three square brackets; and the two leader lines that run into
 * the direction pad and onto the OK key. None of them is a key and none appears below.
 *
 * **The symbols and the words are ours**, per Danny's decision of 21 August 2026, drawn from
 * `src/icons.ts` and typeset here, and read off the photograph in the lab at
 * `reference/forum-images/touch-full.jpg`, which shows the whole face. Drawing and photograph agree
 * mark for mark: the direction pad and both rockers print nothing but `Vol` and `Ch`, the colour keys
 * carry a thin stripe each, and the face prints the Logitech logo and no model name, so the nameplate
 * is the word Logitech, as on the Harmony 300. A position and a
 * size come from the drawing's own printed mark, which the extraction reports per key.
 *
 * **No scan code appears anywhere in here.** This library has never read a key off a Harmony Touch:
 * the file based family is opened only to read its identity files, sections 198 to 201, its
 * configuration is not reachable as a file and Logitech's service will not compile one, section 202, and
 * `reference/button-maps.md` has no table for it. So every key is `printed` and none carries a code or
 * a candidate list.
 *
 * **The screen is a touch screen**, Logitech's own words in the legend: "LCD touch screen. View,
 * launch, and edit activities and favorites". The rectangle is the drawing's own glass outline, and
 * its raster is 240 by 320, which is the size of every screen capture in the user guide bound into the
 * same PDF, fifty of them. That is the vendor's picture of the display, not a measurement off the
 * firmware or a configuration, neither of which this project can read on this model.
 *
 * **The two marks above the screen are keys, and their shape is the mark itself**, the way the Harmony
 * One's paging arrows are: the legend lists `Favorites` and `Home` among the buttons, the guide says to
 * "tap" them, and the product prints a star and a house on the bezel with no key edge around either.
 */
import { segment, traced } from '../shapes.ts';
import { CASE_HEIGHT } from '../types.ts';
import type { Key, Model, Region, Rocker } from '../types.ts';

/**
 * The one region: the line across the foot where the gloss face meets the base.
 *
 * Extracted shape 9. The drawing states a single open stroke from edge to edge and the photograph shows
 * the change of material there, so it is a seam.
 */
const REGIONS: readonly Region[] = [
  { id: 'base-seam', form: 'seam', path: 'M 10.863 883.468 C 11.771 893.755 29.181 896.848 39.853 898.335 C 70.024 902.547 90.136 903.572 119.212 904.347 C 123.229 904.449 146.433 904.738 151.139 904.738 C 155.851 904.738 179.049 904.449 183.071 904.347 C 212.148 903.572 232.251 902.547 262.432 898.335 C 273.102 896.848 290.506 893.755 291.422 883.468' },
];

/**
 * The mouldings.
 *
 * Five. The play part, the two side rockers and the direction pad are each one outline in the drawing
 * with nothing inside, so their splits are derived: the halves on the outline's own middle, the pad as
 * four triangles from its centre, as on the Harmony One.
 *
 * **The DVR, Guide and Info row is one moulding with two seams, and its outline is closed rather than
 * found.** The drawing states it as five strokes: DVR's outline open at its right end, Info's open at its
 * left, two vertical lines at x 113.052 and 188.059, and Guide's top and bottom edges between them. No
 * gap separates the three. So the outline below is DVR's path run forward, joined along the top to
 * Info's path run backward, its cubics reversed by swapping their control points, which is every number
 * the drawing's own; and the two verticals are the seams, which the photograph shows as parting lines.
 */
const ROCKERS: readonly Rocker[] = [
  {
    // Shape 10, split at y 158.631. Its two printed marks, the play and pause symbols, are its halves'.
    id: 'rocker-play',
    keys: ['Play', 'Pause'],
    path: 'M 174.523 190.396 C 174.523 193.534 171.978 196.071 168.84 196.071 L 133.446 196.071 C 130.305 196.071 127.762 193.534 127.762 190.396 L 127.762 126.872 C 127.762 123.733 130.305 121.19 133.446 121.19 L 168.84 121.19 C 171.978 121.19 174.523 123.733 174.523 126.872 Z',
  },
  {
    // Shape 4, with the OK key, shape 15, inset at its centre.
    id: 'rocker-pad',
    keys: ['DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft'],
    path: 'M 151.139 747.028 C 128.536 747.028 79.458 698.53 79.458 675.347 C 79.458 652.159 128.536 603.66 151.139 603.66 C 173.74 603.66 222.826 652.159 222.826 675.347 C 222.826 698.53 173.74 747.028 151.139 747.028 Z',
  },
  {
    // Shape 8, split at y 675.349. `Vol` is printed on the pivot; the baseline is the drawing's glyph
    // box bottom.
    id: 'rocker-volume',
    keys: ['VolumeUp', 'VolumeDown'],
    labels: [{ text: 'Vol', place: 'on', x: 54.233, y: 681.3 }],
    path: 'M 37.018 626.019 C 37.018 622.88 39.563 620.343 42.701 620.343 L 88.611 620.343 C 92.377 620.343 97.926 623.373 91.695 630.364 L 91.695 630.372 C 81.548 641.621 67.864 659.691 67.864 675.341 C 67.864 690.998 81.548 709.075 91.695 720.317 L 91.695 720.325 C 97.926 727.323 92.377 730.354 88.611 730.354 L 42.701 730.354 C 39.563 730.354 37.018 727.808 37.018 724.67 Z',
  },
  {
    // Shape 7, split the same way.
    id: 'rocker-channel',
    keys: ['ChannelUp', 'ChannelDown'],
    labels: [{ text: 'Ch', place: 'on', x: 246.833, y: 681.3 }],
    path: 'M 264.091 626.019 C 264.091 622.88 261.548 620.343 258.408 620.343 L 212.492 620.343 C 208.734 620.343 203.185 623.373 209.408 630.364 L 209.416 630.372 C 219.561 641.621 233.239 659.691 233.239 675.341 C 233.239 690.998 219.561 709.075 209.416 720.317 L 209.408 720.325 C 203.185 727.323 208.734 730.354 212.492 730.354 L 258.408 730.354 C 261.548 730.354 264.091 727.808 264.091 724.67 Z',
  },
  {
    // Shapes 23 and 22 joined, with lines 56 and 53 as the seams. See above.
    id: 'rocker-satellite',
    keys: ['Dvr', 'Guide', 'Info'],
    seams: ['M 113.052 790.861 L 113.052 822.513', 'M 188.059 790.861 L 188.059 822.513'],
    path: 'M 112.575 822.513 L 54.837 822.513 C 42.733 822.513 37.583 814.943 37.583 806.692 C 37.583 798.439 42.733 790.869 54.837 790.869 L 112.575 790.869 L 188.536 790.869 L 246.274 790.869 C 258.378 790.869 263.528 798.439 263.528 806.692 C 263.528 814.943 258.378 822.513 246.274 822.513 L 188.536 822.513 Z',
  },
];

/**
 * The keys, 29 of them, in reading order.
 *
 * Each comment names the extracted shape it came from, so a reading can be checked against
 * `bin/extract.ts` run on the page. A `markAt` is the centre of the drawing's own printed mark and a
 * `markSize` that mark's longer side, both in this package's units. A label's `x` and `y` where given
 * are the centre and the baseline of the drawing's own printed word.
 */
const KEYS: readonly Key[] = [
  // Shape 32. Off switches the whole activity off, per the legend.
  { name: 'Off', src: 'printed', kind: 'keypad', shape: traced('M 94.044 104.882 C 101.309 104.882 104.394 100.332 104.394 95.386 C 104.394 90.438 101.309 85.888 94.044 85.888 L 64.497 85.888 C 57.232 85.888 54.139 90.438 54.139 95.386 C 54.139 100.332 57.232 104.882 64.497 104.882 Z'), angle: 0, labels: [{ text: 'Off', place: 'on', size: 'small' }] },
  // Shapes 17, 19, 18 and 20 round the play part.
  { name: 'Rewind', src: 'printed', kind: 'keypad', shape: traced('M 37.058 148.831 C 37.058 151.964 39.601 154.515 42.741 154.515 L 109.262 154.515 C 112.402 154.515 114.946 151.964 114.946 148.831 L 114.946 128.291 C 114.946 125.15 112.402 122.613 109.262 122.613 L 58.204 122.613 C 46.734 122.613 37.058 126.411 37.058 138.977 Z'), angle: 0, icon: 'rewind', markAt: { x: 77.133, y: 138.9 }, markSize: 22.9 },
  { name: 'Play', src: 'printed', kind: 'keypad', shape: segment('M 118.733 115 L 183.733 115 L 183.733 158.631 L 118.733 158.631 Z'), angle: 0, icon: 'play', markAt: { x: 151.333, y: 138.9 }, markSize: 13.6 },
  { name: 'FastForward', src: 'printed', kind: 'keypad', shape: traced('M 264.045 148.831 C 264.045 151.964 261.5 154.515 258.37 154.515 L 191.839 154.515 C 188.701 154.515 186.164 151.964 186.164 148.831 L 186.164 128.291 C 186.164 125.15 188.701 122.613 191.839 122.613 L 242.907 122.613 C 254.369 122.613 264.045 126.411 264.045 138.977 Z'), angle: 0, icon: 'forward', markAt: { x: 225.333, y: 138.9 }, markSize: 22.9 },
  { name: 'Record', src: 'printed', kind: 'keypad', shape: traced('M 37.058 169.382 C 37.058 166.243 39.601 163.698 42.741 163.698 L 109.262 163.698 C 112.402 163.698 114.946 166.243 114.946 169.382 L 114.946 189.919 C 114.946 193.057 112.402 195.6 109.262 195.6 L 58.204 195.6 C 46.734 195.6 37.058 191.805 37.058 179.23 Z'), angle: 0, icon: 'record', markAt: { x: 77.333, y: 180 }, markSize: 13.3 },
  { name: 'Pause', src: 'printed', kind: 'keypad', shape: segment('M 118.733 158.631 L 183.733 158.631 L 183.733 202 L 118.733 202 Z'), angle: 0, icon: 'pause', markAt: { x: 151.233, y: 180 }, markSize: 14.7 },
  { name: 'Stop', src: 'printed', kind: 'keypad', shape: traced('M 264.045 169.382 C 264.045 166.243 261.5 163.698 258.37 163.698 L 191.839 163.698 C 188.701 163.698 186.164 166.243 186.164 169.382 L 186.164 189.919 C 186.164 193.057 188.701 195.6 191.839 195.6 L 242.907 195.6 C 254.369 195.6 264.045 191.805 264.045 179.23 Z'), angle: 0, icon: 'stop', markAt: { x: 225.433, y: 180 }, markSize: 12.5 },
  // The two marks above the screen, each a mark in the drawing that falls inside no shape. The key is the
  // mark, as on the Harmony One's paging arrows, because the product prints nothing else there.
  { name: 'Favorites', src: 'printed', kind: 'touch', shape: traced('M 90.928 227.441 L 93.072 234.016 L 99.984 234.016 L 94.387 238.089 L 96.525 244.664 L 90.928 240.602 L 85.338 244.664 L 87.466 238.089 L 81.877 234.016 L 88.797 234.016 Z'), angle: 0 },
  { name: 'Home', src: 'printed', kind: 'touch', shape: traced('M 219.507 243.951 L 213.949 243.951 L 213.949 238.684 L 208.923 238.684 L 208.923 243.951 L 203.363 243.951 L 203.363 233.97 L 211.436 226.705 L 219.507 233.97 Z'), angle: 0 },
  // Shapes 14 and 13. Each word sits off its key's box centre, towards the square end, as printed.
  { name: 'Exit', src: 'printed', kind: 'keypad', shape: traced('M 115.932 608.17 C 120.661 604.638 125.922 601.179 131.3 598.486 L 131.308 598.486 C 134.979 596.614 137.869 595.964 137.869 591.587 L 137.869 585.881 C 137.869 582.749 135.324 580.198 132.185 580.198 L 58.196 580.198 C 46.734 580.198 37.066 583.994 37.066 596.568 L 37.066 606.424 C 37.066 609.563 39.601 612.1 42.741 612.1 L 104.73 612.1 C 109.663 612.1 112.033 611.044 115.932 608.17 Z'), angle: 0, labels: [{ text: 'Exit', place: 'on', dx: -2.3, dy: -1.6 }] },
  { name: 'Menu', src: 'printed', kind: 'keypad', shape: traced('M 185.177 608.17 C 180.45 604.638 175.189 601.179 169.81 598.486 L 169.793 598.486 C 166.13 596.614 163.242 595.964 163.242 591.587 L 163.242 585.881 C 163.242 582.749 165.785 580.198 168.926 580.198 L 242.907 580.198 C 254.377 580.198 264.045 583.994 264.045 596.568 L 264.045 606.424 C 264.045 609.563 261.5 612.1 258.37 612.1 L 196.381 612.1 C 191.448 612.1 189.07 611.044 185.177 608.17 Z'), angle: 0, labels: [{ text: 'Menu', place: 'on', dx: 2.1, dy: -1.6 }] },
  // The two halves of shape 8. Neither end prints a mark, on the drawing or on the photograph.
  { name: 'VolumeUp', src: 'printed', kind: 'keypad', shape: segment('M 28.733 612 L 103.733 612 L 103.733 675.349 L 28.733 675.349 Z'), angle: 0 },
  { name: 'VolumeDown', src: 'printed', kind: 'keypad', shape: segment('M 28.733 675.349 L 103.733 675.349 L 103.733 738 L 28.733 738 Z'), angle: 0 },
  // The four quadrants of shape 4, about its centre. The pad prints no arrows.
  { name: 'DirectionUp', src: 'printed', kind: 'keypad', shape: segment('M 151.139 675.347 L -48.861 475.347 L 351.139 475.347 Z'), angle: 0 },
  { name: 'DirectionRight', src: 'printed', kind: 'keypad', shape: segment('M 151.139 675.347 L 351.139 475.347 L 351.139 875.347 Z'), angle: 0 },
  { name: 'DirectionDown', src: 'printed', kind: 'keypad', shape: segment('M 151.139 675.347 L 351.139 875.347 L -48.861 875.347 Z'), angle: 0 },
  { name: 'DirectionLeft', src: 'printed', kind: 'keypad', shape: segment('M 151.139 675.347 L -48.861 875.347 L -48.861 475.347 Z'), angle: 0 },
  // Shape 15.
  { name: 'Select', src: 'printed', kind: 'keypad', shape: traced('M 178.195 675.347 C 178.195 690.286 166.084 702.398 151.139 702.398 C 136.202 702.398 124.091 690.286 124.091 675.347 C 124.091 660.402 136.202 648.291 151.139 648.291 C 166.084 648.291 178.195 660.402 178.195 675.347 Z'), angle: 0, labels: [{ text: 'OK', place: 'on' }] },
  // The two halves of shape 7.
  { name: 'ChannelUp', src: 'printed', kind: 'keypad', shape: segment('M 198.733 612 L 273.733 612 L 273.733 675.349 L 198.733 675.349 Z'), angle: 0 },
  { name: 'ChannelDown', src: 'printed', kind: 'keypad', shape: segment('M 198.733 675.349 L 273.733 675.349 L 273.733 738 L 198.733 738 Z'), angle: 0 },
  // Shapes 12 and 11.
  { name: 'VolumeMute', src: 'printed', kind: 'keypad', shape: traced('M 115.932 742.519 C 120.661 746.058 125.922 749.509 131.3 752.203 L 131.308 752.203 C 134.979 754.075 137.869 754.732 137.869 759.099 L 137.869 764.807 C 137.869 767.948 135.324 770.491 132.185 770.491 L 58.196 770.491 C 46.734 770.491 37.066 766.695 37.066 754.121 L 37.066 744.273 C 37.066 741.134 39.601 738.589 42.741 738.589 L 104.73 738.589 C 109.663 738.589 112.033 739.645 115.932 742.519 Z'), angle: 0, icon: 'mute', markAt: { x: 85.133, y: 757.1 }, markSize: 13.6 },
  { name: 'PrevChannel', src: 'printed', kind: 'keypad', shape: traced('M 185.177 742.519 C 180.45 746.058 175.189 749.509 169.81 752.203 L 169.793 752.203 C 166.13 754.075 163.242 754.732 163.242 759.099 L 163.242 764.807 C 163.242 767.948 165.785 770.491 168.926 770.491 L 242.907 770.491 C 254.377 770.491 264.045 766.695 264.045 754.121 L 264.045 744.273 C 264.045 741.134 261.5 738.589 258.37 738.589 L 196.381 738.589 C 191.448 738.589 189.07 739.645 185.177 742.519 Z'), angle: 0, icon: 'back', markAt: { x: 215.633, y: 757 }, markSize: 15 },
  // The three segments of the satellite row, cut on its two seams.
  { name: 'Dvr', src: 'printed', kind: 'keypad', shape: segment('M 28.733 780 L 113.052 780 L 113.052 830 L 28.733 830 Z'), angle: 0, labels: [{ text: 'DVR', place: 'on', x: 81.733, y: 812.2 }] },
  { name: 'Guide', src: 'printed', kind: 'keypad', shape: segment('M 113.052 780 L 188.059 780 L 188.059 830 L 113.052 830 Z'), angle: 0, labels: [{ text: 'Guide', place: 'on', x: 151.033, y: 812.2 }] },
  { name: 'Info', src: 'printed', kind: 'keypad', shape: segment('M 188.059 780 L 273.733 780 L 273.733 830 L 188.059 830 Z'), angle: 0, labels: [{ text: 'Info', place: 'on', x: 224.033, y: 812.2 }] },
  // Shapes 31, 28, 29 and 30, in the drawing's colour order, which the photograph shows too: red, green,
  // yellow, blue. The extraction misses the yellow stripe, whose fill is light enough to read as a face,
  // so its place comes from the page SVG's own yellow path, 169.457 to 188.125 at page scale 2.003, which
  // is the green stripe's width exactly.
  { name: 'Red', src: 'printed', kind: 'keypad', shape: traced('M 85.009 846.361 C 85.009 843.22 82.464 840.677 79.326 840.677 L 50.109 840.677 C 41.998 840.677 37.575 844.85 37.575 851.7 C 37.575 858.558 41.998 862.723 50.109 862.723 L 79.326 862.723 C 82.464 862.723 85.009 860.177 85.009 857.047 Z'), angle: 0, icon: 'stripe', markAt: { x: 64.833, y: 849.3 }, markSize: 32.2, accent: '#d23c3c' },
  { name: 'Green', src: 'printed', kind: 'keypad', shape: traced('M 102.161 862.723 C 99.022 862.723 96.477 860.177 96.477 857.047 L 96.477 846.361 C 96.477 843.22 99.022 840.677 102.161 840.677 L 138.769 840.677 C 141.908 840.677 144.453 843.22 144.453 846.361 L 144.453 857.047 C 144.453 860.177 141.908 862.723 138.769 862.723 Z'), angle: 0, icon: 'stripe', markAt: { x: 121.533, y: 849.3 }, markSize: 37.4, accent: '#2f9e44' },
  { name: 'Yellow', src: 'printed', kind: 'keypad', shape: traced('M 198.948 862.723 C 202.089 862.723 204.632 860.177 204.632 857.047 L 204.632 846.361 C 204.632 843.22 202.089 840.677 198.948 840.677 L 162.342 840.677 C 159.201 840.677 156.658 843.22 156.658 846.361 L 156.658 857.047 C 156.658 860.177 159.201 862.723 162.342 862.723 Z'), angle: 0, icon: 'stripe', markAt: { x: 180.833, y: 849.3 }, markSize: 37.4, accent: '#d9c22b' },
  { name: 'Blue', src: 'printed', kind: 'keypad', shape: traced('M 216.102 846.361 C 216.102 843.22 218.645 840.677 221.786 840.677 L 251.002 840.677 C 259.113 840.677 263.536 844.85 263.536 851.7 C 263.536 858.558 259.113 862.723 251.002 862.723 L 221.786 862.723 C 218.645 862.723 216.102 860.177 216.102 857.047 Z'), angle: 0, icon: 'stripe', markAt: { x: 237.633, y: 849.3 }, markSize: 32.3, accent: '#3b6fd4' },
];

export const TOUCH: Model = {
  id: 'touch',
  label: 'Harmony Touch',
  skins: [99],
  architecture: 17,
  width: 302.285,
  height: CASE_HEIGHT,
  case: 'M 151.139 1000 C 135.097 1000 111.987 997.29 99.766 995.006 C 33.111 982.534 15.23 947.116 9.837 871.168 C -3.244 686.785 -2.939 302.424 8.733 114.111 C 13.555 36.285 44.048 12.47 104.235 3.195 C 113.701 1.73 131.285 0 151.139 0 C 171 0 188.583 1.73 198.048 3.195 C 258.235 12.47 288.721 36.285 293.551 114.111 C 305.225 302.424 305.53 686.785 292.448 871.168 C 287.053 947.116 269.164 982.534 202.52 995.006 C 190.29 997.29 167.188 1000 151.139 1000 Z',
  regions: REGIONS,
  rockers: ROCKERS,
  /**
   * The glass, extracted shape 3, and the raster of the user guide's own screen captures. The aperture is
   * 201.206 by 266.985, an aspect of 0.754 against the raster's 0.75, so the two sources agree to half a
   * per cent without either having been fitted to the other.
   */
  screen: { x: 50.54, y: 252.994, w: 201.206, h: 266.985, pixels: { width: 240, height: 320 }, touch: true },
  keys: KEYS,
  /**
   * The face prints Logitech's logo and wordmark and no model name, on the drawing and the photograph
   * alike. As on the Harmony 300 the logo's mark is not drawn and the word stands for it, centred and on
   * the baseline of the drawing's own wordmark.
   */
  nameplate: { text: 'Logitech', place: 'on', x: 162.433, y: 58.6, size: 'normal' },
};
