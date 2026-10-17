/**
 * The Harmony One's parameter block, base slot 15: the model's values, which `firmwaresections.ts` builds
 * into the eleven groups and the twelve bytes past group 9 that its firmware reads, `todo-compile-one.md`
 * 6.4. One set on all 19 distinct Harmony One compiles the lab holds, `ONE_COMPILES` in
 * `test/startupassistant.test.ts`, as the Harmony 600, 650 and 700 each carry one set of their own,
 * `families/four-slot/wiring.ts`' `PARAMETER_VALUES`.
 *
 * What the groups hold is `docs/config-format.md` under base slot 15, read off the 3.4 image: 0 the display
 * light fade's step delay, 1 four display light levels, 4 the analogue channel 1 band thresholds, 5 and 6
 * the battery millivolt curves, 7 a timeout in seconds, 9 the I2C device's level pairs, with band 3's pair
 * and the two bit field table past its declared entries, section 103. Groups 2, 3, 8 and 10 are not read.
 * They are facts measured on Logitech's compiles, one set on all 19, and not choices of ours; whether any
 * MyHarmony setting changes them is not established.
 */
import type { ParameterBlockSpec } from '../../firmwaresections.ts';

export const TOUCH_PARAMETERS: ParameterBlockSpec = {
  groups: [
    [44],
    [38, 38, 20, 20, 26, 26],
    [60],
    [80],
    [96, 98, 308, 310, 768, 770],
    [3000, 3015, 3627, 3652, 3674, 3704, 3725, 3751, 3772, 3850, 3875, 3952, 4025, 4051, 9999, 9999],
    [3000, 3015, 3627, 3652, 3674, 3704, 3725, 3751, 3772, 3850, 3875, 3952, 4025, 4170, 9999, 9999],
    [0],
    [2500, 10980],
    [16, 16, 64, 64, 128, 128],
    [129, 21, 3, 1, 0, 0, 0, 0],
  ],
  lightBand: { pair: [255, 255], fields: [0, 0, 0, 0, 0x55, 0x55, 0x55, 0x55] },
};
