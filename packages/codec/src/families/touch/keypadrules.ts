/**
 * The keys of section 323's activity keypad rule on the Harmony One, the touch family's `activityKeyRules`,
 * section 398: fitted to the 50 activities of Logitech's One compiles whose roles the accounts state, nine of
 * them distinct, where with these keys the rule gives 1704 of 1752 keys and 38 of the 50 activities whole.
 *
 * **Which arrow is up is read**: 27 is DirectionUp and 29 DirectionDown, 36 the upper arrow and 26 the lower,
 * from the calibration account's stated device maps, which hold DirectionUp and DirectionDown and no arrows,
 * against each device's own record binding 27 and 29 and leaving 36 and 26 unbound. The lower arrow's partner
 * rule held on 13 of 13 activities: the Denon AVR-X4800H's and a classic Denon's `PageDown` and the
 * PlayStation 3's `StepBack`.
 */
import type { ActivityKeyRules } from '../../activityroles.ts';

export const TOUCH_ACTIVITY_KEYS: ActivityKeyRules = {
  volume: [3, 4, 9],
  fallback: new Map([[36, 27], [26, 29]]),
  channel: [19, 20],
  direction: [27, 29],
  skip: [22, 6],
  exit: 2,
  partners: [{ scan: 26, when: 36, names: ['PageDown', 'StepBack'] }],
};
