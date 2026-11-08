/**
 * The keys of section 323's activity keypad rule on the Harmony 600, 650 and 700, the four slot family's
 * `activityKeyRules`. The scans are the Harmony 600 drawing's, `packages/silhouettes/src/models/h600.ts`,
 * where the arrow pairs are settled by section 323. Moved here from `activityroles.ts`, plan 007.
 */
import type { ActivityKeyRules } from '../../activityroles.ts';

export const FOUR_SLOT_ACTIVITY_KEYS: ActivityKeyRules = {
  volume: [14, 15, 16],
  // The two arrow keys above the direction pad, bound to nothing in most devices' own maps, take the device's
  // DirectionUp and DirectionDown.
  fallback: new Map([[26, 50], [27, 42]]),
  channel: [31, 32],
  direction: [50, 42],
  skip: [38, 21],
  exit: 12,
};
