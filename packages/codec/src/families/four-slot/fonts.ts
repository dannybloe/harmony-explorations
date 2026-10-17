/**
 * How the four slot family's font sets are lettered in our letters, `withOxaniumFonts`: which of our faces a
 * set of Logitech's becomes, whether sets may share a glyph, and which of the family's remotes the faces were
 * measured on. `fonttable.ts` held all three as tests of the architecture and the skin until
 * `todo-compile-one.md` 3.3.3.5; it measures a set and asks the family, `Family.fonts`.
 *
 * **Which of our faces a set gets is read off the set**, by four measurements that tell Logitech's faces
 * apart: its height, whether its glyphs carry a shadow, the stroke, as the median run of ink along a row,
 * and on the 14 pixel bold sets the median row a capital starts on. The rule was derived on the 13 Harmony
 * 650 compiles in the lab (`work/fonts-8-2/faces.ts`), so on those it is a description; out of sample it
 * places all 18 sets of a fourteenth compile, `harvest_650_two_devices`, in the same groups. Nine faces,
 * `lettering.ts`'s `OXANIUM_FACE_SPECS`, sized to land on Logitech's rows:
 *
 * | height | stroke | face |
 * |---|---|---|
 * | 15 | one pixel | R15 |
 * | 15 | two | F15 |
 * | 14 | one | R14 |
 * | 14 | two, a capital from row 1 | F14W |
 * | 14 | two, a capital lower | F14 |
 * | 13 | one | R13, a Help style |
 * | 13 | two | F13 |
 * | 11 | any | F11 |
 * | 10 | any | F10 |
 *
 * Measured on the Harmony 650 alone; the rule names a Harmony 600's or 700's sets all the same, which is
 * what a reader of their compiles relies on, but the font table refuses to re-letter them, `refusal`.
 */
import type { FamilyFonts } from '../family.ts';
// Types alone: the font table asks the family through the registry, so a value import back would close a
// cycle that leaves this module's constant unset when it is the first one loaded.
import type { FaceOrRefusal, SetMeasurement } from '../../fonttable.ts';
import type { OxaniumFaceName } from '../../lettering.ts';
import { HARMONY_650_SKINS } from './skins.ts';

/** The nine faces measured on the Harmony 650, `todo-compile-650.md` 8.2. `lettering.ts` held this until 3.3.3.5. */
export const HARMONY_650_FACES: readonly OxaniumFaceName[] = ['F15', 'F14W', 'F14', 'F13', 'F11', 'F10', 'R15', 'R14', 'R13'];

/** The face of ours a four slot set measured so is lettered in, by the table in the header. */
function fourSlotFaceOf(set: SetMeasurement): FaceOrRefusal {
  switch (set.height) {
    case 15: return set.stroke >= 2 ? 'F15' : 'R15';
    case 14: return set.stroke < 2 ? 'R14' : set.capitalTop === 1 ? 'F14W' : 'F14';
    case 13: return set.stroke >= 2 ? 'F13' : 'R13';
    case 11: return 'F11';
    case 10: return 'F10';
    default: return { refusal: `font set at ${set.address.toString(16)} is ${set.height} pixels high, which no face is` };
  }
}

export const FOUR_SLOT_FONTS: FamilyFonts = {
  faces: HARMONY_650_FACES,
  faceOf: fourSlotFaceOf,
  // The firmware's text routine finds every glyph from scratch through its set's own pointer, consulting no
  // neighbour, no count and no cache, read on the Harmony 650 0.2 and the Harmony 700 2.8, section 368: so one
  // face in one colouring draws a character once and every set of that face points at it.
  sharesGlyphs: true,
  // The faces were measured on the Harmony 650's compiles, so the 600's and the 700's are refused rather than
  // lettered by a rule nobody checked on them, section 382.
  refusal: (skin) => (HARMONY_650_SKINS.has(skin)
    ? undefined
    : `the four slot family's faces were measured on the Harmony 650's compiles alone, skins ${[...HARMONY_650_SKINS].join(' and ')}, and this is skin ${skin}`),
};
