/**
 * The Harmony Touch's bench test for favourites of ours, `todo-touch.md` 8.3: every favourite tapped in the order the
 * favourites screen is to show them, with what the remote is predicted to send derived from the documents by
 * `families/harmony-touch/engine.ts`, never written by hand, and what the person is to look at: the order and the logo of ours. The
 * same derivation as 7.1's, `touchTest` in `touchbench.ts`; only the plan is new.
 *
 * **The configuration it is derived from** is what the bench Touch holds once `work/touch-firmware/sets/8.3-favourites`
 * is committed: that set's six documents, which are `8.2-activity-back`'s, its user's favourites document, and the
 * tuning device's favourites and the line up as the recorded full sync delivered them, which the set leaves the remote
 * to keep. `packages/corpus/bin/touch-device-set.ts --favourites` built it from
 * `packages/corpus/touch-favourites/8.3-favourites.json`.
 *
 * **What the plan holds, and why each step.**
 *
 * * Off, unjudged, so no activity runs and every device is held off whatever ran before.
 * * The favourites screen, and the first favourite of the new order tapped: the channel added from the line up, by
 *   the number its tile shows, which starts Watch TV first and sends the digits at the end of the start.
 * * Every other favourite in the order shown, each its digits alone, Watch TV running.
 * * Off, judged, as 7.1's favourites test ends.
 *
 * **What the model cannot say, the description asks the person to note**: the tiles' order, and that the added
 * channel's tile shows the logo of ours where the station's logo was, with every other logo as before.
 */
import type { harmonyTouch } from '@harmony/codec/node';

import type { TestDefinition } from '../src/irsession.ts';
import { touchTest, type TouchAction, type TouchStep, type TouchTestPlan } from '../src/touchbench.ts';

type Configuration = harmonyTouch.Configuration;

/** The set the predictions read and the remote is to hold for the bench test, by its path in the lab. */
export const TOUCH_8_3_SET = 'work/touch-firmware/sets/8.3-favourites/set.json';
/** The put back: the user's favourites and the station's logo as the remote held them before. */
export const TOUCH_8_3_BACK_SET = 'work/touch-firmware/sets/8.3-favourites-back/set.json';

const OFF: TouchStep = { actions: [{ start: null }], judged: false };
const OFF_JUDGED: TouchStep = { actions: [{ start: null }], judged: true };

/**
 * The plan of 8.3, from the configuration: the favourites in the order the documents give, each tapped by its name, or
 * by its number when it is the channel added, whose tile shows our logo and its number and no station's name.
 */
export function touch83Plans(c: Configuration, added: readonly string[], logoText: string): TouchTestPlan[] {
  const tuning = c.favourites[0];
  if (tuning === undefined || c.favourites.length !== 1) throw new Error('the plan expects one favourites activity');
  const shown = tuning.favourites;
  const handle = (f: harmonyTouch.ReadFavourite): string => (added.includes(f.number ?? '') ? f.number! : f.name ?? '');
  const tap = (f: harmonyTouch.ReadFavourite): TouchAction => ({ favourite: handle(f) });
  const steps: TouchStep[] = [
    OFF,
    { actions: [{ favourites: true }, tap(shown[0]!)], judged: true },
    ...shown.slice(1).map((f) => ({ actions: [tap(f)], judged: true })),
    OFF_JUDGED,
  ];
  const listed = shown.map((f) => `${f.name} (channel ${f.number}${added.includes(f.number ?? '') ? `, added, its tile showing our logo, the text ${logoText} in dark blue on yellow` : ''})`);
  return [{
    id: 'touch-8-3-favourites',
    name: 'Harmony Touch 8.3, favourites of ours and a logo of ours',
    summary: 'The favourites in a new order with a channel added, each tapped: its channel as digits to the LG TV; and the logo of ours.',
    description: 'todo-touch.md 8.3, on the bench Harmony Touch holding work/touch-firmware/sets/8.3-favourites: the six documents of '
      + '8.2\'s put back, the user\'s favourites document of ours and a logo of ours; the tuning device\'s favourites and the line up '
      + 'as the remote held them (packages/corpus/touch-favourites/8.3-favourites.json). Every expectation is derived by '
      + 'packages/bench/src/touchengine.ts. Step 1 presses Off and is not judged. '
      + `In step 2, before tapping, write in the problem field the order the favourites screen shows, reading each row left to right, `
      + `and which logos show; predicted ${shown.length} tiles in this order: ${listed.join(', ')}. Every logo but the added channel's is `
      + 'the one it showed before; the added channel\'s tile shows the number under our logo. If the old station logo shows there instead, '
      + 'note it: the screens keep a picture they have drawn in memory by its file name until it is pushed out or the remote restarts. '
      + `Predicted: the first tap, with no activity running, starts ${tuning.activity.name} and sends the digits at the end of the start; `
      + `every later tap only the digits, padded to ${tuning.tuning?.fixedDigits ?? 'no fixed'} digits, each about `
      + `${tuning.device?.interKeyDelayMs ?? 0} ms after the one before. Two equal digits in a row are separate presses. `
      + 'Wait for the codes to stop before pressing Next: an activity start runs about 15 seconds, most of it the LG TV\'s power on delay.',
    steps,
  }];
}

/** Every 8.3 test, derived. */
export function touch83Tests(c: Configuration, added: readonly string[], logoText: string): { id: string; definition: TestDefinition }[] {
  return touch83Plans(c, added, logoText).map((plan) => ({ id: plan.id, definition: touchTest(c, plan) }));
}
