/**
 * The touch family's activity start, the Harmony One, section 279: the start up screen entered first and
 * every timer cancelled, as all 60 real enter lists open, then the activity's writes, the list every
 * activity calls to say one is running, and last a deferred call to a list that enters the working screen
 * once what is queued ahead of it has gone. `TOUCH_START` is what the shared activity composer asks for the
 * shape, `Family.activityStart`; `shared/activities.ts` built it inline behind a test of
 * a trait, `startSequence`, until `todo-compile-one.md` 3.3.3.4.
 *
 * **Ours is not the corpus's in two ways**, section 279: every real deferred list calls `{1F:FB02, 7F:...}`,
 * the Remote Assistant's branch, where ours enters the working screen directly, and every real enter list
 * ends with a further call into that branch, which ours leaves out. So the composed activity skips the Remote
 * Assistant's question.
 *
 * It is also the start a configuration no family serves gets, `activityStartOf` in the registry, as it did
 * before plan 007; no such configuration takes a screen, since the screen composers refuse it, so only the
 * enter list's writes are ever built there.
 */
import { DEFERRED } from '../../actions.ts';
import type { ActivityStart, ListBody } from '../family.ts';
import type { Container } from '../../gspm.ts';
import { ENTER_MODE } from '../../inventory.ts';
import { ACTION_LIST_INDEX_OPCODE } from '../../sections.ts';
import { ComposeError } from '../../shared/core.ts';

/** `0x07` band `0xFB`: cancel every running timer, the second instruction of every enter list that
 *  enters a start up screen on the Harmony One, section 279. */
const CANCEL_TIMERS = { opcode: 0x07, operand: 0xfffb } as const;

export const TOUCH_START: ActivityStart = {
  checkScreen(_c: Container, screen, at): void {
    // A screen built rather than copied states the keypad map it selects, and it has to be this activity's.
    if (screen.set !== undefined && screen.set !== at.set) {
      throw new ComposeError(`the screen selects keypad map ${screen.set}, and this activity's is ${at.set}`);
    }
    for (const [what, index] of [['the active list', screen.activeList]] as const) {
      if (index === undefined || !Number.isInteger(index) || index < 0 || index >= at.lists) {
        throw new ComposeError(`${what} names list ${index} of ${at.lists} that exist`);
      }
    }
  },
  lists(screen, first, writes) {
    // After the select list, `first + 1`: the list entering the working screen, then the deferred call to it.
    // The corpus shape is a two slot list of the `0xD0` instruction and a `0x7F`, 73 of 73 over thirteen
    // Harmony One configurations, one per activity called from its enter list, so the payload is a call and
    // not the `0x7E` itself.
    const showList = first + 2;
    const deferList = first + 3;
    const enter: ListBody = [
      [screen.startupMode, ENTER_MODE], [CANCEL_TIMERS.operand, CANCEL_TIMERS.opcode], ...writes,
      [screen.activeList as number, ACTION_LIST_INDEX_OPCODE], [deferList, ACTION_LIST_INDEX_OPCODE],
    ];
    return {
      enter,
      after: [
        [[screen.workingMode, ENTER_MODE]],
        [[DEFERRED.operand, DEFERRED.opcode], [showList, ACTION_LIST_INDEX_OPCODE]],
      ],
    };
  },
  // No tag 5 list of its own: the Harmony One keeps section 273's default, the enter list. A first look, which
  // is not a test, finds its own tag 5 lists follow the four slot rule once the lists they call are compared by
  // content rather than by number; until that is a test this family states none.
};
