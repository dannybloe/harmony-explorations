/**
 * How the touch family's font sets are lettered in our letters, `withOxaniumFonts`: which of our faces a set of
 * Logitech's becomes and whether sets may share a glyph. `fonttable.ts` held both as tests of the architecture
 * until `todo-compile-one.md` 3.3.3.5; it measures a set and asks the family, `Family.fonts`.
 *
 * **The Harmony One's faces go by height**, `lettering.ts`'s `OXANIUM_FACE_SPECS`: every 14 pixel set of its
 * nineteen compiles is bold and every 16 pixel set the greeting's, so only the 15 pixel sets need the stroke,
 * the median run of ink along a row, to tell them apart. Findings section 396.
 *
 * | height | stroke | face |
 * |---|---|---|
 * | 16 | any | One16, the greeting |
 * | 15 | two | One15 |
 * | 15 | one | OneR15 |
 * | 14 | two | One14; a regular 14 is refused, no compile draws one |
 * | 11 | any | One11 |
 */
import type { FamilyFonts } from '../family.ts';
// Types alone: the font table asks the family through the registry, so a value import back would close a
// cycle that leaves this module's constant unset when it is the first one loaded.
import type { FaceOrRefusal, SetMeasurement } from '../../fonttable.ts';
import type { OxaniumFaceName } from '../../lettering.ts';

/** The five faces measured on the Harmony One, `todo-compile-one.md` 5.2. `lettering.ts` held this until 3.3.3.5. */
export const HARMONY_ONE_FACES: readonly OxaniumFaceName[] = ['One16', 'One15', 'OneR15', 'One14', 'One11'];

/** The face of ours a Harmony One set measured so is lettered in, by the table in the header. */
function touchFaceOf(set: SetMeasurement): FaceOrRefusal {
  switch (set.height) {
    case 16: return 'One16';
    case 15: return set.stroke >= 2 ? 'One15' : 'OneR15';
    case 14:
      if (set.stroke < 2) return { refusal: `font set at ${set.address.toString(16)} is a regular 14, which no Harmony One compile draws` };
      return 'One14';
    case 11: return 'One11';
    default: return { refusal: `font set at ${set.address.toString(16)} is ${set.height} pixels high, which no Harmony One face is` };
  }
}

export const TOUCH_FONTS: FamilyFonts = {
  faces: HARMONY_ONE_FACES,
  faceOf: touchFaceOf,
  // The Harmony One's text routine is unread, so no glyph is shared between its sets, section 368 being the
  // Harmony 650's and 700's: each set gets glyphs of its own, which with a pair of colours per set costs 95
  // glyphs of 1520 on Logitech's compile of the Denon and the LG.
  sharesGlyphs: false,
  // The faces hold on all nineteen distinct Harmony One compiles, section 396, so none of the family's
  // configurations is refused for its skin.
  refusal: () => undefined,
};
