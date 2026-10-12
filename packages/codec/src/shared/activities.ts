/**
 * Composing an activity: its power transitions, its start and stop sequences and the variables they
 * keep, shared by the Harmony One and the 600, 650 and 700. Plan 007's shared part, cut out of
 * `compose.ts` unchanged. The start sequence's shape still differs by family inside `composeActivity`;
 * `todo-compile-650.md` 10.7.2's last stage hands it to the family.
 */
import { DEFERRED, SILENT_WRITE } from '../actions.ts';
import type { FamilyTraits } from '../families/family.ts';
import { traitsOf } from '../families/registry.ts';
import { STATE_WRITE_BASE } from '../actions.ts';
import { type ActivityKey, activityKeyEntry, setActivityKey } from '../activitykeys.ts';
import { u24 } from '../bytes.ts';
import { applyEdits } from '../edit.ts';
import { Writer } from '../emit.ts';
import { archSlot, Container, type Instruction, parse, SCAN_MASK } from '../gspm.ts';
import {
  activities, ACTIVITY_STATE_NAME, activityBindings, deviceVariables, ENTER_MODE, firmwareStateVariableMax,
  handlerSetRoles, INPUT_PROPERTY, KEY_EVENT_PRESS, KEY_EVENT_SHIFT, MAP_VALUE_OPCODE, SELECT_BINDING_SET,
  SELECT_BINDING_SET_MASK, stateVariables,
} from '../inventory.ts';
import { relocate } from '../relocate.ts';
import {
  ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, HANDLER_TAG_LEAVE, handlerSets, NAME_NODE_HEADER, type NameNode,
  nameNodes, stateTable, taggedList,
} from '../sections.ts';
import {
  ACTION_TABLE_SLOT, assertGeneratedRecord, ComposeError, HANDLER_TAG_RESUME, restamped, STATE_WRITE_LIMIT,
} from '../shared/core.ts';
import { appendTableEntries } from '../shared/infrared.ts';
import { startSequenceVariables, type StateVariableSpec } from '../statetables.ts';

/**
 * One device's target state when an activity is running: a base slot 13 variable and its value.
 *
 * **A composer never names a code here and that is section 273's load bearing point**, restating
 * the anatomy's P4: the enter list writes the *device's* variable, and the code goes out because
 * that variable's transition runs the list that sends it. Over the corpus 424 of the 436 sends an
 * activity causes arrive that way and 12 are inline, so writing state is the design and an inline
 * send is the exception nobody has explained.
 */
export interface ComposeActivityTarget {
  /** A device state variable, in base slot 13's numbering, as `composeDevice` returns it. */
  readonly variable: number;
  /** The value the activity wants it in. Its transition is what sends the code. */
  readonly value: number;
}

export interface ComposeActivity {
  /**
   * The word the activity is known by, which the **screen half** draws on the menu page as pixels.
   *
   * **It deliberately does not take a device label's grammar**, and the first version of this
   * function did: it refused an underscore, which is right for a device because a state variable is
   * named `<label>_<property>_<values>` and the underscore is the separator that makes the label
   * recoverable. An activity has **no node in the name tree at all**, section 273, so that reason
   * does not transfer and the rule refused `Watch_TV` for nothing. Printable ASCII still holds,
   * since the glyph sets are what draw it.
   *
   * This function only checks and carries it. Nothing here writes it into the container, which is
   * why it comes back in `ComposedActivity`: the screen half is what draws it, and an unused field
   * with a rail in front of it is worse than no field.
   */
  readonly label: string;
  readonly targets: readonly ComposeActivityTarget[];
  /** The activity's keypad map: a scan code and the base slot 10 list its press runs. */
  readonly keys?: readonly { readonly scan: number; readonly list: number }[];
  /**
   * What tag 2, the leave handler, runs. Omitted emits the **null instruction**, opcode 0 with
   * operand 0, which is what 21 of the corpus's 50 activities carry, all on arch 8 and arch 9.
   * So the tag is required and giving it something to run is not. Section 273.
   */
  readonly leaveList?: number;
  /**
   * The activity key to put the new activity on, Watch TV, Watch a Movie or Listen to Music, section
   * 314. Harmony 600, 650 and 700 only, where it is one entry in base slot 9 entry 1 and a same length
   * edit made by `setActivityKey` after everything else here. Omitted leaves every key as it was, and
   * the activity is reachable from the menu only, which is what an activity on no key is on those
   * models. Whatever the key did before is replaced, an activity included; that one keeps its own
   * menu row and loses only the key.
   */
  readonly activityKey?: ActivityKey;
  /**
   * What tag 5 runs. Tag 5 is on all 50 activities and **always runs a real list**, so it cannot be
   * the null instruction the way tag 2 can. What fires it is read now, section 313: the activity
   * switch runs it when the activity asked for is the one already running, so it is what picking the
   * running activity again from the menu or an activity key does. This said "what fires it is not
   * established" until section 313.
   *
   * **On the Harmony 600, 650 and 700, with `screen` given, omitted builds Logitech's own shape**,
   * section 313, measured on 43 of the 43 activities Logitech compiled for those models: the start
   * variable set to 1, the enter list's **input** writes in the enter list's order, the flag set to 1,
   * the working screen entered directly, and the start variable back to 0. No start up screen, no power
   * write and no write of the activity counter, which is already right. Where tag 1 defers its working
   * screen behind `3F D000` so it waits for the infrared ahead of it, tag 5 runs that step directly,
   * which is Logitech's choice too; ours enters the working screen itself, because a composed activity
   * has no Remote Assistant branch to run instead, the form `h600_config` compiles.
   *
   * **Elsewhere omitted still points it at the enter list**, section 273's default and the reasoning
   * below, which replays the whole start including the start up screen. That includes the Harmony
   * One: a first look, which is not a test, finds its own tag 5 lists follow the same rule once the
   * lists they call are compared by content rather than by number, and until that is a test the
   * Harmony One keeps the default.
   *
   * What is measured over every architecture is the envelope, section 273: **the state writes in a tag 5 list are a subset
   * of the enter list's, on 50 of 50**, and the subset is **empty** on 24 of them. One candidate
   * rule dies on that same measurement, so it is not used here: "the enter list without the power
   * writes" matches 0 of 50. A second, "a **prefix** of the enter list", was written up as dying
   * too<!--superseded--> and does not: it holds on 28 of 50, though 24 of those are the empty case,
   * so the load bearing figure is **4 of the 26** that write anything, and it holds on every
   * activity of the four arch 8 containers. Too weak to build on and too strong to call refuted.
   * `ACTIVITY_START_TAG`'s docstring reads the handler off the sends it reaches rather than the
   * writes, as a re-send of the inputs with no power change.
   *
   * Omitted points it at the **enter list**, whose write set is trivially a subset of itself, so
   * the default sits inside the measured envelope instead of outside it. That it is *behaviourally*
   * right is still unestablished, and a caller that knows better should pass a list.
   */
  readonly resumeList?: number;
  /**
   * The activity's two screens, from `composeActivityScreen`, section 279. Given, the enter list
   * opens the way every Harmony One activity's does: enter the start up screen, cancel the timers,
   * write the state, say an activity is running, and enter the working screen **deferred**, through
   * the six byte `0x3F` band `0xD0` instruction every activity's chain uses, so it is not on until
   * the infrared ahead of it is out. Omitted, the enter list writes state and nothing else, which is
   * what this function produced until then and what left the remote on the page that started it.
   */
  readonly screen?: {
    readonly startupMode: number;
    readonly workingMode: number;
    /** Harmony One: the list every activity's enter list calls to say one is running. */
    readonly activeList?: number | undefined;
    /**
     * Harmony 600, 650 and 700: the variable the start sequence holds at 1 while it runs, the one it
     * writes 1 before deferring the working screen, and the base slot 9 entry the screen's keypad map
     * case selects, section 290. All three from `composeActivityScreen`.
     */
    readonly startVariable?: number | undefined;
    readonly flagVariable?: number | undefined;
    readonly set?: number | undefined;
    /** The value the screen's record case was composed for, checked against this activity's. */
    readonly activity: number;
  };
}

export interface ComposedActivity {
  bytes: Uint8Array;
  /** The value of the activity counter, which is what identifies the activity everywhere. */
  activity: number;
  /** The base slot 9 index of its keypad map, which is what a menu row selects. */
  set: number;
  /** The enter list, base slot 10, which is tag 1 and the whole start sequence. */
  enterList: number;
  /** The list a menu row has to run: it selects the set, and the set's tag 1 does the rest. */
  selectList: number;
  /**
   * The list tag 5 runs, picking the activity again while it runs: the caller's, the arch 14 list of
   * Logitech's shape, or the enter list, in that order of preference. Section 313.
   */
  resumeList: number;
  /** The label, carried through for the screen half to draw. Nothing in these bytes holds it. */
  label: string;
}

/**
 * Compose an activity: its number, its keypad map, its three handlers and its start sequence.
 *
 * The counterpart of `composeDevice`, and like that one it stops short of the screen. After this the
 * activity **exists and can be entered**, by running `selectList`; what it does not have is a row on
 * the activity menu or a drawn name, which is the screen half and lives in a separate function for
 * the same reason `composeDeviceScreen` does, since it is arch 12 shaped where this is not.
 *
 * **With `screen` it also shows the activity's two screens**, section 279, which on a Harmony One is
 * what separates an activity that looks like one from a set of key bindings. The screen itself is
 * `composeActivityScreen`'s, composed first; this only writes the enter list that uses it: the start
 * up screen first and every timer cancelled, as all 60 real enter lists open, then the writes,
 * then the list every activity calls to say one is running, and last a deferred call that enters the
 * working screen once what is queued ahead of it has gone.
 *
 * The four changes, in the order the container stays parseable through them, of which only the
 * first two and the last make room:
 *
 * 1. the action lists, in one hole below base slot 10's table, with their pointers appended
 * 2. the base slot 9 entry, its tagged list in a hole below that section, pointer appended
 * 3. the activity counter's `second`, raised **in place**, which needs no room
 * 4. the counter's name tree node, whose trailing value count is text and may get longer
 *
 * **The entry is appended and that is safe rather than convenient**, section 273: an entry's
 * position in base slot 9 does not encode its activity number, none of the ten corpus containers
 * with several activities having its entries in value order. The number is carried by the write
 * inside the enter list and by nothing structural.
 *
 * **What this does not do is emit a second binding on arch 14.** An activity there is bound by two
 * keys and by one on the other three architectures, section 273, but that is a property of the
 * *menu row*, which is the screen half's job. This function produces the one thing a row points at.
 */
export function composeActivityFor(c: Container, activity: ComposeActivity, traits: FamilyTraits): ComposedActivity {
  if (activity.label === ''
      || [...activity.label].some((ch) => ch.charCodeAt(0) < 0x20 || ch.charCodeAt(0) > 0x7e)) {
    throw new ComposeError('an activity label is printable ASCII, which is what the glyphs draw');
  }
  if (c.architecture === undefined) throw new ComposeError('the container states no architecture');

  const variable = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  const record = variable?.record;
  if (variable === undefined || record === undefined) {
    throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable to add an activity to`);
  }
  if (record.count !== 0) {
    // Every activity record in the corpus carries zero transitions, so raising `second` is a two
    // byte poke. One with transitions would need them extended to cover the new value, which is a
    // length change, and refusing is better than writing a record whose values stop short.
    throw new ComposeError('the activity counter carries transitions, which this does not extend');
  }
  const value = record.second + 1;

  const states = stateTable(c);
  if (states === undefined) throw new ComposeError('base slot 13 does not read as a table');
  // The highest value each variable takes, so a target can be checked against its own range rather
  // than only against the count of variables. A variable whose record does not read is left out and
  // its target passes, which is deliberate: refusing on a reader's silence would make this rail
  // fire on a container this composer has no other complaint about.
  const ranges = new Map(stateVariables(c)
    .filter((one) => one.record !== undefined)
    .map((one) => [one.index, (one.record as { second: number }).second]));
  for (const target of activity.targets) {
    if (target.variable <= firmwareStateVariableMax(c.architecture)) {
      throw new ComposeError(
        `variable ${target.variable} is the firmware's, and an activity may not write one`);
    }
    if (target.variable >= states.count) {
      throw new ComposeError(`variable ${target.variable} is past the ${states.count} that exist`);
    }
    if (target.variable >= STATE_WRITE_LIMIT) {
      // The index is the low **seven** bits of the opcode, so 128 is where a write silently becomes
      // an instruction of another band rather than a bad write.
      //
      // **This is unreachable on every container that exists and is kept anyway**, which the audit
      // of 6 September 2026 established rather than assumed: the check above refuses anything at or
      // above `states.count`, and the largest base slot 13 in this corpus holds 94 variables. So the
      // format allows 128 and no sample comes within 34 of it. It stays because it guards the
      // **encoding** rather than the corpus, and the day a container has 130 variables the other
      // check stops refusing and this is the only thing between a write and another band's opcode.
      throw new ComposeError(
        `variable ${target.variable} cannot be written: the opcode carries seven bits of index`);
    }
    if (target.variable === variable.index) {
      // Writing the counter as if it were a device defeats the ordering the enter list depends on,
      // since the reader takes the **first** write of the counter it finds and would then report a
      // device's value as the activity's.
      throw new ComposeError('the activity counter is not a device an activity can put into a state');
    }
    if (target.value > (ranges.get(target.variable) ?? target.value)) {
      // A value outside the variable's own range matches no transition, so the device is never
      // driven and the activity is silently dead. Exactly the failure this composer's design note
      // is about: state is what sends the code.
      throw new ComposeError(
        `variable ${target.variable} does not take the value ${target.value}`);
    }
  }
  if (variable.index >= STATE_WRITE_LIMIT) {
    throw new ComposeError('the activity counter is past the index a state write can carry');
  }
  if (activity.activityKey !== undefined) {
    // Checked before anything is built, so a key this configuration cannot take refuses the whole
    // composition rather than leaving a composed activity and a refusal behind. It is the same location
    // the edit at the end uses: the architecture, entry 1 and the key's press entry.
    try {
      activityKeyEntry(c, activity.activityKey);
    } catch (error) {
      throw new ComposeError(`the activity cannot go on ${activity.activityKey}: ${(error as Error).message}`);
    }
  }

  // Every list index a caller hands over is checked against base slot 10 before anything is
  // written. `composeDevice` does the same for its power command, and the reason is the same: an
  // index past the end names no list, the entry still parses, and the key does nothing at all.
  const existingLists = c.actionLists()?.length;
  if (existingLists === undefined) throw new ComposeError('base slot 10 does not read as lists');
  const named: [string, number | undefined][] = [
    ['the leave handler', activity.leaveList],
    ['the resume handler', activity.resumeList],
    ...(activity.keys ?? []).map((key): [string, number] => [`the key on scan ${key.scan}`, key.list]),
  ];
  for (const [what, index] of named) {
    if (index === undefined) continue;
    if (!Number.isInteger(index) || index < 0 || index >= existingLists) {
      throw new ComposeError(`${what} names list ${index} of ${existingLists} that exist`);
    }
  }

  const sets = handlerSets(c);
  if (sets === undefined) throw new ComposeError('base slot 9 does not read as a table');
  const set = sets.addresses.length;
  if (set >= 0xff) {
    // Two separate one byte ceilings, and this said `set > 0xff`<!--superseded--> until the audit of
    // 6 September 2026, which is off by one in the direction that does damage: at 255 existing
    // entries the count written below is 256, `Writer.u8` masks that to **0**, and the section reads
    // back as holding nothing. So the last usable index is 254. The largest base slot 9 in the
    // corpus holds 17 entries, so nothing is near it, which is exactly why the bound had to be
    // reasoned about rather than measured.
    throw new ComposeError('base slot 9 is full: its count and the selector operand are one byte');
  }

  // ---- 1. the action lists ----
  //
  // The enter list writes each device's target and then the counter, in that order, because the
  // counter is what the four hop reader finds and a reader that stopped at the first write would
  // otherwise report a device value as the activity. The select list is one instruction and is
  // what a menu row runs.
  let current = c;
  const actionSlot = archSlot(c.architecture, ACTION_TABLE_SLOT);
  const actionTable = current.pointerArrayAt(actionSlot);
  if (actionTable === undefined) throw new ComposeError('base slot 10 does not read as a table');
  const firstList = actionTable.values.length;
  const enterList = firstList;
  const selectList = firstList + 1;
  // With a screen, two more: the working screen's entry, and the deferred call that reaches it. The
  // corpus shape is a two slot list of the `0xD0` instruction and a `0x7F`, 73 of 73 over thirteen
  // Harmony One configurations, one per activity called from its enter list, so the payload is a call
  // and not the `0x7E` itself. **Ours is not the corpus's in two ways**, section 279: every real
  // payload calls `{1F:FB02, 7F:...}`, the Remote Assistant's branch, where ours enters the working
  // screen directly, and every real enter list ends with a further call into that branch, which ours
  // leaves out. So the composed activity skips the Remote Assistant's question.
  const screen = activity.screen;
  // On the Harmony 600, 650 and 700 the start sequence has another shape, `FamilyTraits.startSequence`, section 290: no timer
  // cancel and no "an activity is running" list, and instead a variable held at 1 while it runs, which
  // gates the inter device delay, and a flag written 1 before the working screen is deferred. And the
  // deferred list enters the working screen itself, `h600_config`'s form, where the Harmony One's calls
  // a list that does.
  const withStartVariable = traits.startSequence === 'start variable and flag';
  if (screen !== undefined) {
    if (screen.activity !== value) {
      throw new ComposeError(`the screen was composed for activity ${screen.activity}, this is ${value}`);
    }
    if (withStartVariable) {
      if (screen.set !== set) {
        throw new ComposeError(`the screen selects keypad map ${screen.set}, and this activity's is ${set}`);
      }
      for (const [what, index] of [['start', screen.startVariable], ['flag', screen.flagVariable]] as const) {
        if (index === undefined || !Number.isInteger(index) || index <= firmwareStateVariableMax(c.architecture)
            || index >= Math.min(states.count, STATE_WRITE_LIMIT)) {
          throw new ComposeError(`the ${what} variable ${index} is not one an enter list can write`);
        }
      }
    } else {
      for (const [what, index] of [['the active list', screen.activeList]] as const) {
        if (index === undefined || !Number.isInteger(index) || index < 0 || index >= existingLists) {
          throw new ComposeError(`${what} names list ${index} of ${existingLists} that exist`);
        }
      }
    }
  }
  const showList = firstList + 2;
  const deferList = withStartVariable ? firstList + 2 : firstList + 3;

  const opening = screen === undefined ? 0 : 2;
  const closing = screen === undefined ? 0 : withStartVariable ? 3 : 2;
  const enterBody = new Writer(1 + 3 * (opening + activity.targets.length + 1 + closing));
  enterBody.u8(opening + activity.targets.length + 1 + closing);
  if (screen !== undefined) {
    enterBody.u16(screen.startupMode).u8(ENTER_MODE);
    if (withStartVariable) enterBody.u16(1).u8(STATE_WRITE_BASE + (screen.startVariable as number));
    else enterBody.u16(CANCEL_TIMERS.operand).u8(CANCEL_TIMERS.opcode);
  }
  for (const target of activity.targets) {
    enterBody.u16(target.value).u8(STATE_WRITE_BASE + target.variable);
  }
  enterBody.u16(value).u8(STATE_WRITE_BASE + variable.index);
  if (screen !== undefined && withStartVariable) {
    enterBody.u16(1).u8(STATE_WRITE_BASE + (screen.flagVariable as number));
    enterBody.u16(deferList).u8(ACTION_LIST_INDEX_OPCODE);
    enterBody.u16(0).u8(STATE_WRITE_BASE + (screen.startVariable as number));
  } else if (screen !== undefined) {
    enterBody.u16(screen.activeList as number).u8(ACTION_LIST_INDEX_OPCODE);
    enterBody.u16(deferList).u8(ACTION_LIST_INDEX_OPCODE);
  }
  const selectBody = new Writer(4)
    .u8(1).u16(SELECT_BINDING_SET_MASK | set).u8(SELECT_BINDING_SET);
  const extra = screen === undefined ? [] : withStartVariable ? [
    new Writer(7).u8(2).u16(DEFERRED.operand).u8(DEFERRED.opcode)
      .u16(screen.workingMode).u8(ENTER_MODE).bytes,
  ] : [
    new Writer(4).u8(1).u16(screen.workingMode).u8(ENTER_MODE).bytes,
    new Writer(7).u8(2).u16(DEFERRED.operand).u8(DEFERRED.opcode)
      .u16(showList).u8(ACTION_LIST_INDEX_OPCODE).bytes,
  ];
  // Tag 5, picking the running activity again, section 313. On arch 14 with a screen, and only when the
  // caller names no list of its own, it gets a list of its own in Logitech's shape: `S := 1`, the input
  // writes, `F := 1`, the working screen entered directly, `S := 0`. What it leaves out is the point:
  // the start up screen, which tag 1 enters first and would show again to somebody who only picked the
  // activity a second time; every power write, so nothing is switched; and the counter write, which
  // already holds this activity. The inputs stay because Logitech keeps them. What they are for is a
  // reading rather than a measurement: putting a device back on the activity's input after somebody
  // changed it by hand, which needs a write of a variable's current value to fire its transition, and
  // whether it does is unread, section 313.
  //
  // **An input is recognised by its name**, `deviceVariables`' property, since that is the only thing
  // in the file that says what a variable tracks. A target whose property is neither is left out: no
  // configuration Logitech compiled for these models writes any other property in a start, so there is
  // no example to follow, and leaving it out keeps tag 5's writes inside tag 1's, which is the
  // envelope section 273 measured on every architecture.
  //
  // The inputs are written **inline** in the targets' own order, the same instructions the enter list
  // carries. Logitech's tag 5 reuses whatever tag 1 has, an inline write or a call to a list of them,
  // and our tag 1 writes every target inline, so this is that rule applied to ours.
  const ownResume = withStartVariable && screen !== undefined && activity.resumeList === undefined;
  const inputs = new Set(deviceVariables(c).filter((one) => one.property === INPUT_PROPERTY)
    .map((one) => one.index));
  const resumeTargets = activity.targets.filter((one) => inputs.has(one.variable));
  const resumeBody = new Writer(1 + 3 * (4 + resumeTargets.length));
  if (ownResume) {
    resumeBody.u8(4 + resumeTargets.length);
    resumeBody.u16(1).u8(STATE_WRITE_BASE + (screen.startVariable as number));
    for (const target of resumeTargets) resumeBody.u16(target.value).u8(STATE_WRITE_BASE + target.variable);
    resumeBody.u16(1).u8(STATE_WRITE_BASE + (screen.flagVariable as number));
    resumeBody.u16(screen.workingMode).u8(ENTER_MODE);
    resumeBody.u16(0).u8(STATE_WRITE_BASE + (screen.startVariable as number));
  }
  const bodies = [enterBody.bytes, selectBody.bytes, ...extra, ...(ownResume ? [resumeBody.bytes] : [])];
  // It is the last list appended, so its index is the first list's plus everything before it.
  const ownResumeList = firstList + bodies.length - 1;

  const listsAt = actionTable.start;
  const listsHole = relocate(current, listsAt, bodies.reduce((sum, one) => sum + one.length, 0));
  const starts: number[] = [];
  let cursor = listsAt;
  for (const one of bodies) {
    listsHole.bytes.set(one, cursor);
    starts.push(current.flashBase + cursor);
    cursor += one.length;
  }
  current = parse(appendTableEntries(parse(listsHole.bytes), actionSlot, starts));

  // ---- 2. the base slot 9 entry ----
  //
  // A tagged list in the narrow form: `u8 count` then `{ u8 tag; u16 operand; u8 opcode }`. Three
  // handlers of event type 0 and one press per key.
  // A caller's own list wins, then the arch 14 list built above, then section 273's default.
  const resumeList = activity.resumeList ?? (ownResume ? ownResumeList : enterList);
  const entries: { tag: number; operand: number; opcode: number }[] = [
    { tag: HANDLER_TAG_ENTER, operand: enterList, opcode: ACTION_LIST_INDEX_OPCODE },
    activity.leaveList === undefined
      ? { tag: HANDLER_TAG_LEAVE, operand: 0, opcode: 0 }
      : { tag: HANDLER_TAG_LEAVE, operand: activity.leaveList, opcode: ACTION_LIST_INDEX_OPCODE },
    { tag: HANDLER_TAG_RESUME, operand: resumeList, opcode: ACTION_LIST_INDEX_OPCODE },
  ];
  const bound = new Set<number>();
  for (const key of activity.keys ?? []) {
    if (!Number.isInteger(key.scan) || (key.scan & ~SCAN_MASK) !== 0) {
      // `Number.isInteger` rather than the mask alone, since a bitwise `&` truncates: 63.5 passed
      // the mask and became 63, which is a different button.
      throw new ComposeError(`scan ${key.scan} does not fit the six bits a key code gives it`);
    }
    if (bound.has(key.scan)) {
      // Two entries with one tag in a tagged list, where the reader takes the first and the second
      // is unreachable. A silently ignored binding is the failure class this whole file is about.
      throw new ComposeError(`scan ${key.scan} is bound twice in one keypad map`);
    }
    bound.add(key.scan);
    entries.push({
      tag: (KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | key.scan,
      operand: key.list,
      opcode: ACTION_LIST_INDEX_OPCODE,
    });
  }
  if (entries.length > 0xff) throw new ComposeError('a narrow tagged list states its count in a byte');

  // **Base slot 9's append is spelled out rather than going through `appendTableEntries`**, and
  // that is not a style choice: it is `u8 count` then `u24 address[count]` but it is **not** one of
  // the six counted pointer arrays `pointerArrayAt` recognises, because that reader demands the
  // count and the pointers account for the section **exactly** and here the tagged lists sit in the
  // same section behind them. So the helper returns undefined for this slot on every architecture.
  //
  // Two relocations in the order that keeps the container parseable: the tagged list first, into a
  // hole immediately below the section, where it is unreferenced filler until the pointer names it;
  // then the three bytes of pointer at the array's own end, and the count byte last.
  const entryBody = new Writer(1 + 4 * entries.length).u8(entries.length);
  for (const one of entries) entryBody.u8(one.tag).u16(one.operand).u8(one.opcode);
  const sets2 = handlerSets(current);
  if (sets2 === undefined) throw new ComposeError('base slot 9 stopped reading');
  const bodyAt = sets2.start;
  const bodyHole = relocate(current, bodyAt, entryBody.bytes.length);
  bodyHole.bytes.set(entryBody.bytes, bodyAt);
  const entryAddress = current.flashBase + bodyAt;
  current = parse(bodyHole.bytes);

  const sets3 = handlerSets(current);
  if (sets3 === undefined) throw new ComposeError('base slot 9 stopped reading after its content');
  const pointerAt = sets3.start + sets3.length;
  const pointerHole = relocate(current, pointerAt, 3);
  pointerHole.bytes.set(new Writer(3).u24(entryAddress).bytes, pointerAt);
  pointerHole.bytes.set(new Writer(1).u8(sets3.addresses.length + 1).bytes, sets3.start);
  current = parse(pointerHole.bytes);

  // ---- 3. the counter's own record ----
  //
  // `second` is the `u16` at +0x02 and the record carries no values, so this is a poke with no
  // relocation. Re-read the table rather than reusing the offset from before, since everything
  // above has moved.
  const grownStates = stateTable(current);
  const moved = grownStates?.entries[variable.index];
  if (grownStates === undefined || moved === undefined) {
    throw new ComposeError('base slot 13 stopped reading');
  }
  const recordAt = current.blobOffsetOf(moved);
  if (recordAt === undefined) throw new ComposeError('the activity record is outside the container');
  const withSecond = Uint8Array.from(current.blob);
  withSecond.set(new Writer(2).u16(value).bytes, recordAt + 2);
  current = parse(withSecond);

  // ---- 4. the name tree's stated value count ----
  //
  // The node is `CurrentActivityState_0_<values>` and the number is `second + 1`, section 86's rule
  // over every named variable. It is **text**, so raising it can lengthen the node, which is why
  // this is a relocation and not another poke.
  const node = (nameNodes(current) ?? [])
    .find((one: NameNode) => one.name.startsWith(ACTIVITY_STATE_NAME));
  const treeSection = current.sections[archSlot(c.architecture, 0)];
  if (node === undefined || treeSection === undefined || current.frameLength === undefined) {
    throw new ComposeError('the container has no name tree to state the activity count in');
  }
  const treeStart = current.blobOffsetOf(treeSection.address);
  if (treeStart === undefined) throw new ComposeError('the name tree is outside the container');
  const renamed = `${node.name.slice(0, node.name.lastIndexOf('_') + 1)}${value + 1}`;
  const grew = renamed.length - node.name.length;
  const nameAt = node.start + NAME_NODE_HEADER;
  const nameHole = grew === 0
    ? { bytes: Uint8Array.from(current.blob) }
    : relocate(current, nameAt + node.name.length, grew);
  nameHole.bytes.set(new Writer(renamed.length).ascii(renamed).bytes, nameAt);
  nameHole.bytes.set(new Writer(2).u16(4 + renamed.length).bytes, node.start + 1);
  if (grew !== 0) {
    nameHole.bytes.set(new Writer(3).u24(current.frameLength + grew).bytes, treeStart + 2);
  }

  // ---- 5. the activity key, when one was asked for ----
  //
  // Last, because it is the one same length edit here and the only step that needs every structure
  // above to read: it checks that `set` is an activity by reading the enter handler this function just
  // wrote. `applyEdits` recomputes the trailer itself, so the restamp before it is what lets its own
  // check, that the input's checksum agrees with its bytes, pass.
  let bytes = restamped(nameHole.bytes);
  if (activity.activityKey !== undefined) {
    const finished = parse(bytes);
    bytes = applyEdits(finished, setActivityKey(finished, activity.activityKey, set)).bytes;
  }

  return {
    bytes, activity: value, set, enterList, selectList, resumeList,
    label: activity.label,
  };
}

/*
 * ---- An activity's own screen, Harmony One (arch 12) only, section 279 ----
 *
 * An activity has two screens and a composed one had neither: its enter list opened with no mode at
 * all, so the remote stayed on whatever page started it, which is `todo.md` 1.2.4. The first is the
 * **start up** screen, "Keep the remote pointed at your system", whose record binds every key to
 * nothing; every activity's enter list opens by entering its own, 60 of 60 across the thirteen
 * Harmony One configurations with activities. The second is the **working** screen, blue pads and "Devices" in
 * the corner, and it is entered at the **end** of the chain, behind the infrared, through the six
 * byte `0x3F` band `0xD0` instruction. Device mode's "Activities" key comes back to it through a
 * base slot 14 record keyed by the activity, `activityScreens`.
 *
 * So composing the screen is three things: a new mode shaped like the configuration's own one page
 * working screens, a case in that record, and an enter list that opens with the start up screen and
 * defers the working one. The first two are `composeActivityScreen`; the third is `composeActivity`'s
 * `screen` option, because the enter list is that function's.
 */

/** `0x07` band `0xFB`: cancel every running timer, the second instruction of every enter list that
 *  enters a start up screen on the Harmony One, section 279. */
const CANCEL_TIMERS = { opcode: 0x07, operand: 0xfffb } as const;

export { SILENT_WRITE };

/** The value the next composed activity will take: one past the counter's highest, section 273. */
export function nextActivityValue(c: Container): number {
  const record = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))?.record;
  if (record === undefined) throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable`);
  return record.second + 1;
}

/** What every arch 14 activity's enter list states, read off all of them rather than one. */
export interface Arch14Starts {
  counter: number;
  idle: number;
  /** The variable a start, All Off or Help holds at 1 while it runs, which gates the inter device delay. */
  startVariable: number;
  /** The variable written 1 just before the working screen is deferred. */
  flagVariable: number;
  /** Per activity value: its start up mode and its base slot 9 entry. */
  startup: Map<number, number>;
  sets: Map<number, number>;
  /**
   * Per activity value: the working screen its start sequence ends on, the last `0x7E` of the deferred
   * list or of the Remote Assistant's branch below it, section 333; absent where neither reads, which
   * `checkActivityScreens` refuses. Section 336.
   */
  endsOn: Map<number, number>;
}

/** The variable a state write names, if it is a write of `value`. */
function writtenWith(one: Instruction | undefined, value: number): number | undefined {
  return one !== undefined && one.opcode >= STATE_WRITE_BASE && one.operand === value
    ? one.opcode - STATE_WRITE_BASE : undefined;
}

/** The variable the Off key map's enter list maps through base slot 14, section 280. */
export const LOCATION_STATE_NAME = 'CurrentLocation';

/** The two variables an arch 14 start brackets itself with, `startSequenceOf`'s answer. */
export interface StartSequenceVariables {
  /** `S`: held at 1 while a start runs, tested by every command prelude, section 319. */
  startVariable: number;
  /** `F`: written 1 by an activity before it defers its working screen, and 0 by the Off key map. */
  flagVariable: number;
}

/**
 * The start variable and the flag of a Harmony 600, 650 or 700 configuration, read off its **Off**
 * key map rather than off an activity, section 329, `todo-compile-650.md` 6.2.4.
 *
 * Until then both were read off the activities' enter lists, `arch14Starts`, which made a
 * configuration with no activity uncomposable: nothing in it said which variable a command prelude
 * should test. The Off key map is base slot 9's `idle` entry, `handlerSetRoles`, the key map the
 * remote installs when no activity runs, whose enter list maps `CurrentLocation` through base slot 14,
 * section 280; the second condition is what tells it from an activity composed without its menu row
 * yet, which no row binds either, and whose enter list raises `S` as the Off's lists do. **It is in each
 * of the thirteen compiles, one per configuration**; no configuration without an activity exists here
 * to show that it always is, the fewest being two. Both its lists bracket themselves the way an activity's start does, and with the same
 * two variables: its enter list `[7F, 72 location, S:=1, F:=0, 7F, 72 location, S:=0]` and its tag 5
 * list `[S:=1, F:=0, ..., S:=0]`, 26 lists of 26 on the thirteen compiles. So `S` is the variable the
 * first write of 1 names, provided the list ends by writing it 0, and `F` the variable written 0 straight
 * after it.
 *
 * **What is generated is each variable's record**, `startSequenceVariables`, and both are checked:
 * an unnamed 0 of maximum 1 with no transition. **What is not generated is the index**, which is the
 * configuration's own and can be nothing else, since Logitech's lists already name it; where it comes
 * from in a configuration built from nothing is the description's order, section 324.
 *
 * Refused when there is no Off key map, which is what the safe mode containers give, or when its lists
 * disagree, or when either variable is not the generated record.
 */
export function startSequenceOf(c: Container): StartSequenceVariables {
  if (traitsOf(c).startSequence !== 'start variable and flag') {
    throw new ComposeError('the start sequence variables are the Harmony 600, 650 and 700\'s alone');
  }
  const lists = c.actionLists() ?? [];
  const sets = handlerSets(c);
  const roles = handlerSetRoles(c);
  // The Off key map is the `idle` entry whose enter list maps `CurrentLocation` through base slot 14,
  // section 280. The role alone is not enough: an activity composed without its menu row yet is selected
  // and bound by no row, so `handlerSetRoles` calls it `idle` too, and its enter list starts the way
  // the Off's does.
  const location = stateVariables(c).find((one) => one.label === LOCATION_STATE_NAME)?.index;
  const offs = (sets?.addresses ?? []).flatMap((address, index) => {
    if (roles[index] !== 'idle' || location === undefined) return [];
    const entries = taggedList(c, address)?.entries ?? [];
    const enter = entries.find((one) => one.tag === HANDLER_TAG_ENTER && one.opcode === ACTION_LIST_INDEX_OPCODE);
    const maps = (lists[enter?.operand ?? -1] ?? []).some((one) =>
      one.opcode === MAP_VALUE_OPCODE && (one.operand & 0xff) === location);
    return maps ? [entries] : [];
  });
  if (offs.length > 1) throw new ComposeError(`${offs.length} key maps here read as the Off key map`);
  const found = new Set<string>();
  for (const entries of offs) {
    for (const entry of entries) {
      if (entry.tag !== HANDLER_TAG_ENTER && entry.tag !== HANDLER_TAG_RESUME) continue;
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const list = lists[entry.operand] ?? [];
      const at = list.findIndex((one) => writtenWith(one, 1) !== undefined);
      const start = writtenWith(list[at], 1);
      const flag = writtenWith(list[at + 1], 0);
      if (start === undefined || flag === undefined || flag === start || writtenWith(list.at(-1), 0) !== start) {
        throw new ComposeError(`the Off key map's list ${entry.operand} does not bracket itself with a start `
          + 'variable and a flag');
      }
      found.add(`${start}:${flag}`);
    }
  }
  if (found.size !== 1) {
    throw new ComposeError(found.size === 0
      ? 'no Off key map with an enter list to read the start sequence variables from'
      : `the Off key map's lists name ${found.size} different pairs of start variable and flag`);
  }
  const [startVariable, flagVariable] = ([...found][0] as string).split(':').map(Number) as [number, number];
  const [startSpec, flagSpec] = startSequenceVariables() as [StateVariableSpec, StateVariableSpec];
  assertGeneratedRecord(c, startVariable, startSpec, 'the start variable');
  assertGeneratedRecord(c, flagVariable, flagSpec, 'the flag');
  return { startVariable, flagVariable };
}

/**
 * The start sequence's shape, `[7E startup, S:=1, ..., counter:=activity, F:=1, 7F deferred, S:=0]`,
 * where the deferred list opens with the `0x3F` band `0xD0` instruction, section 290.
 *
 * `S` and `F` are `startSequenceOf`'s, from the Off key map, and **every activity is checked against
 * them** rather than supplying them, 40 activities of 40 on the thirteen compiles; one that raises
 * another variable is refused. A configuration with no activity is no longer refused here, since
 * nothing about the start sequence needs one: what does is the caller that wants an activity to copy
 * a screen or a record from, and `activityMaps` refuses that itself.
 */
export function arch14Starts(c: Container): Arch14Starts {
  const lists = c.actionLists() ?? [];
  const sets = handlerSets(c);
  const counterVariable = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME));
  if (sets === undefined || counterVariable?.record === undefined) {
    throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable or no base slot 9 to read activities from`);
  }
  const counter = counterVariable.index;
  const { startVariable, flagVariable } = startSequenceOf(c);
  const startup = new Map<number, number>();
  const setOf = new Map<number, number>();
  const endsOn = new Map<number, number>();
  for (const binding of activityBindings(c)) {
    if (startup.has(binding.activity)) continue;
    const address = sets.addresses[binding.set];
    const entry = address === undefined ? undefined
      : taggedList(c, address)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
    const enter = entry === undefined ? undefined : lists[entry.operand];
    const call = enter?.at(-2);
    const deferred = call?.opcode === ACTION_LIST_INDEX_OPCODE ? lists[call.operand] : undefined;
    if (enter === undefined || enter[0]?.opcode !== ENTER_MODE
        || writtenWith(enter.at(-4), binding.activity) !== counter
        || deferred?.[0]?.opcode !== DEFERRED.opcode || deferred[0].operand !== DEFERRED.operand) {
      throw new ComposeError(`activity ${binding.activity}'s enter list is not the shape every arch 14 one has`);
    }
    const start = writtenWith(enter[1], 1);
    const flag = writtenWith(enter.at(-3), 1);
    if (start !== startVariable || writtenWith(enter.at(-1), 0) !== startVariable || flag !== flagVariable) {
      throw new ComposeError(`activity ${binding.activity}'s enter list brackets itself with variables `
        + `${start} and ${flag}, where the Off key map's start sequence uses ${startVariable} and ${flagVariable}`);
    }
    startup.set(binding.activity, enter[0].operand);
    // The deferred list enters the working screen itself, `[3F D000, 7E working]`, or calls the Remote
    // Assistant's branch, `[1F FB00, 7F b]` with `b` ending `7E assistant, 7E working`, section 333.
    const branch = deferred[1]?.opcode === ACTION_LIST_INDEX_OPCODE ? lists[deferred[1].operand] ?? [] : [];
    const inner = lists[branch.find((one) => one.opcode === ACTION_LIST_INDEX_OPCODE)?.operand ?? -1] ?? [];
    const working = deferred[1]?.opcode === ENTER_MODE ? deferred[1].operand
      : inner.filter((one) => one.opcode === ENTER_MODE).at(-1)?.operand;
    if (working !== undefined) endsOn.set(binding.activity, working);
    setOf.set(binding.activity, binding.set);
  }
  return {
    counter, idle: counterVariable.record.first, startVariable, flagVariable, startup, sets: setOf, endsOn,
  };
}
