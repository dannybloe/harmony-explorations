/**
 * The Harmony 650, the Harmony 600's face with its own model number printed at the bottom.
 *
 * **Every shape is the Harmony 600's and is taken by reference, not copied.** Danny's statement,
 * holding the three remotes: the Harmony 600, 650 and 700 have exactly the same layout and form factor,
 * and the only difference on the face is the model number printed near the bottom. So this file takes
 * `H600` whole and changes the identity and the nameplate; a correction to a 600 shape or scan code
 * reaches the 650 with it, which is the point. The scan codes are the 600's measurements and stay
 * marked as such: the three share architecture 14 and its key table, section 17, and the 650's own keys
 * have not been censused separately.
 */
import { H600 } from './h600.ts';
import type { Model } from '../types.ts';

export const H650: Model = {
  ...H600,
  id: 'h650',
  label: 'Harmony 650',
  // MODELS_BY_SKIN in packages/usb/src/models.ts: the model and its EMEA twin.
  skins: [72, 74],
  nameplate: { ...H600.nameplate!, text: 'Harmony 650' },
};
