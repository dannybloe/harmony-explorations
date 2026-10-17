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
import { type SetFace, withOxaniumFonts } from '../../fonttable.ts';
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
