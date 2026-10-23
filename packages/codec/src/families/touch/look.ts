/**
 * The Harmony One's look over a configuration composed onto a Logitech compile, `todo-compile-one.md`
 * 1.2.11.2.7: the steps findings sections 396 to 400 measured and the spare Harmony One showed, moved here out
 * of the lab script that ran them, in the order that script ran them.
 *
 * Two halves, because the letters have to be in place before anything is composed: every name a composer spells
 * has to find its letters in the configuration's sets, section 396, so the donor is lettered first, and the rest
 * runs on the composed file, the blending last, since it smooths each label against what ends up behind it.
 */
import { type BlendedSet, checkBlendedLetters, withBlendedLetters } from '../../blending.ts';
import { type FontSet, IMAGE_SET_HEADER, fontSets, glyphOf } from '../../font.ts';
import { type SetFace, withOxaniumFonts } from '../../fonttable.ts';
import { ComposeError } from '../../shared/core.ts';
import { buildTouchFontTable } from './fontsets.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import type { Container } from '../../gspm.ts';
import { touchLabelWeight } from './activitypictures.ts';
import { touchActivityFonts } from './activityscreen.ts';
import { withCentredPadLabels } from './centring.ts';
import type { TouchChoices } from './choices.ts';
import { withColourButtons } from './colourbuttons.ts';
import { withTouchDeviceLook } from './devicelook.ts';
import { withScreenLight } from './screenlight.ts';
import { withoutStartupAssistant } from './startupassistant.ts';

/** A donor lettered in ours, and the face each of its font sets was given, which the blending needs. */
export interface LetteredDonor {
  readonly bytes: Uint8Array;
  readonly faces: readonly SetFace[];
}

/**
 * The donor in our letters, every set in its own colours, section 396, with the two sets more the activity
 * screens draw in: the start up title's face in its lighter weight and the page counter's, each smoothed against
 * what it is drawn on.
 */
export function letterTouchDonor(c: Container, choices: TouchChoices): LetteredDonor {
  const fonts = withOxaniumFonts(takeApart(c), 'own', {}, touchActivityFonts(c, choices));
  return { bytes: layOutContainer(fonts.layout).bytes, faces: fonts.faces };
}

/**
 * The faces of a donor of ours, `todo-compile-one.md` 8.1.2: the empty One, section 434, unblended, which a setup is
 * composed onto in place of a Logitech compile. A donor is ours where its font table is the stated one,
 * `buildTouchFontTable` in `choices`' weights, set for set and glyph for glyph, as the Harmony 650's `donorFaces` holds
 * an empty configuration to its stated table, findings section 377; its faces are then the stated table's, which the
 * look's blending letters. Undefined for any other donor, a Logitech compile, which `letterTouchDonor` letters.
 * Refuses a donor whose stated sets are ours and which holds more, a donor of ours already blended: the blending runs
 * once, last, over every text the composers add, and a screen's description knows a role by one font.
 */
export function touchDonorFaces(c: Container, choices: TouchChoices): readonly SetFace[] | undefined {
  const stated = buildTouchFontTable(choices);
  const sets = fontSets(c) ?? [];
  if (sets.length < stated.sets.length) return undefined;
  const same = stated.sets.every((piece, k) => {
    const theirs = sets[k] as FontSet;
    const head = c.blobOffsetOf(theirs.address);
    if (head === undefined || piece.bytes.subarray(0, IMAGE_SET_HEADER).some((one, n) => c.blob[head + n] !== one)) return false;
    for (let code = theirs.first; code < theirs.first + theirs.count; code += 1) {
      const ref = piece.refs.find((one) => one.at === IMAGE_SET_HEADER + 3 * (code - 1));
      const want = ref !== undefined && 'to' in ref ? ref.to.bytes : undefined;
      const glyph = glyphOf(c, theirs, code);
      const at = glyph === undefined ? undefined : c.blobOffsetOf(glyph.address);
      if (want === undefined || at === undefined || want.some((one, n) => c.blob[at + n] !== one)) return false;
    }
    return true;
  });
  if (!same) return undefined;
  if (sets.length > stated.sets.length) {
    throw new ComposeError(`a donor of ours holds ${sets.length} font sets where the stated table holds ${stated.sets.length}, so it is blended`);
  }
  return stated.faces;
}

/**
 * The look over the composed configuration: device mode in flat boxes and our icons, the colour buttons as
 * circles, every pad's label centred by its letters, every text smoothed against the colour under it, and the
 * screen light's time, and the Remote Assistant and welcome screen at start left out unless chosen. `deviceType` names a device's catalogue type by the name the configuration states, which
 * picks its icon from `choices.deviceIcons`.
 *
 * Returns the copies the blending made with the configuration, since a select it repointed names a copy and a
 * reader that knows a role by one font, a screen builder's description, has to be pointed back at the set the
 * copy was blended from to read the result, `unblendedSelects`; `todo-compile-one.md` 3.2.2's attribution does.
 */
export function withTouchLook(
  c: Container, faces: readonly SetFace[], choices: TouchChoices, deviceType: (name: string | undefined) => number | undefined,
): { container: Container; blended: readonly BlendedSet[] } {
  const looked = withTouchDeviceLook(c, choices, (name) => {
    const type = deviceType(name);
    return type === undefined ? undefined : choices.deviceIcons[type];
  });
  const centred = withCentredPadLabels(withColourButtons(looked, choices));
  const blending = withBlendedLetters(takeApart(centred), faces, touchLabelWeight(choices));
  const blended = layOutContainer(blending.layout).container;
  checkBlendedLetters(blended, faces, blending.blended);
  const lit = withScreenLight(blended, choices.screenLightSeconds);
  return { container: choices.startupAssistant ? lit : withoutStartupAssistant(lit), blended: blending.blended };
}
