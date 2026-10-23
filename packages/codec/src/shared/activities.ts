/**
 * Composing an activity: its power transitions, its start and stop sequences and the variables they
 * keep, shared by the Harmony One and the 600, 650 and 700. Plan 007's shared part, cut out of
 * `compose.ts` unchanged. The start sequence's shape is the family's, `Family.activityStart`, and so is what
 * an activity changes in the family's wiring, `Family.activityRewiring`, since `todo-compile-one.md` 3.3.3.4;
 * the four slot family's readers of its start, `startSequenceOf` and `arch14Starts`, moved to
 * that family's `start.ts` with them.
 */
import { SILENT_WRITE } from '../actions.ts';
import type { ActivityStart, Family, ListBody } from '../families/family.ts';
import { STATE_WRITE_BASE } from '../actions.ts';
import { u24 } from '../bytes.ts';
import { applyEdits } from '../edit.ts';
import { Writer } from '../emit.ts';
import { archSlot, Container, type Instruction, parse, SCAN_MASK } from '../gspm.ts';
import {
  activities, ACTIVITY_STATE_NAME, caseQueued, devices, deviceVariables, ENTER_MODE, firmwareStateVariableMax,
  infraredGroupsPerList, INPUT_PROPERTY, KEY_EVENT_PRESS, KEY_EVENT_SHIFT, MAP_VALUE_OPCODE, POWER_PROPERTY,
  SELECT_BINDING_SET, SELECT_BINDING_SET_MASK, stateVariables,
} from '../inventory.ts';
import { relocate } from '../relocate.ts';
import {
  ACTION_LIST_INDEX_OPCODE, HANDLER_TAG_ENTER, HANDLER_TAG_LEAVE, handlerSets, NAME_NODE_HEADER, type NameNode,
  modeRecords, nameNodes, stateTable, taggedList,
} from '../sections.ts';
import {
  ACTION_TABLE_SLOT, ComposeError, HANDLER_TAG_RESUME, restamped, STATE_WRITE_LIMIT,
} from '../shared/core.ts';
import { appendTableEntries } from '../shared/infrared.ts';
import { valueMaps } from '../valuemap.ts';

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
   * The activity key to put the new activity on, by the name printed on it, Watch TV, Watch a Movie or
   * Listen to Music, section 314. Only where the family has activity keys, `Family.activityKeyEditor`: the
   * Harmony 600, 650 and 700, where it is one entry in base slot 9 entry 1 and a same length edit made after
   * everything else here. Omitted leaves every key as it was, and the activity is reachable from the menu
   * only, which is what an activity on no key is on those models. Whatever the key did before is replaced,
   * an activity included; that one keeps its own menu row and loses only the key.
   */
  readonly activityKey?: string;
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
 *
 * `family` is the configuration's, `familyOf`, asked for its activity keys and the wiring an activity
 * changes; the start's shape is passed apart, `activityStartOf`, since a configuration no family serves
 * still has one.
 */
export function composeActivityFor(
  c: Container, activity: ComposeActivity, start: ActivityStart, family: Family | undefined,
): ComposedActivity {
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
  // The family's activity keys, where its remotes have them, which is the only way this reaches them.
  const keyEditor = family?.activityKeyEditor;
  if (activity.activityKey !== undefined) {
    // Checked before anything is built, so a key this configuration cannot take refuses the whole
    // composition rather than leaving a composed activity and a refusal behind. It is the same location
    // the edit at the end uses: the family's check, on the Harmony 600, 650 and 700 the architecture,
    // entry 1 and the key's press entry.
    if (keyEditor === undefined) {
      throw new ComposeError(`the activity cannot go on ${activity.activityKey}: `
        + `${family?.name ?? `a configuration of architecture ${c.architecture}`} has no activity keys a composer knows`);
    }
    try {
      keyEditor.check(c, activity.activityKey);
    } catch (error) {
      throw new ComposeError(`the activity cannot go on ${activity.activityKey}: ${(error as Error).message}`);
    }
  }

  // What the activity changes in the family's own wiring, asked before anything is built and applied at the
  // end, `Family.activityRewiring`: on the Harmony 600, 650 and 700 the first activity, or one put on an
  // empty key, changes scan 4's front list and the empty keys' own, section 379. Undefined where nothing
  // changes, so a donor whose wiring is already right for the activity is left byte for byte as it was.
  const rewire = family?.activityRewiring?.(c, activity.activityKey);

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
  // With a screen, the start's shape is the family's, `Family.activityStart`, since `todo-compile-one.md`
  // 3.3.3.4: what the enter list opens and closes with around the writes below, and the lists after the
  // select list. On the Harmony One the start up screen, the timers cancelled, the "an activity is
  // running" list and a deferred call to the list entering the working screen, section 279; on the Harmony
  // 600, 650 and 700 a start variable held at 1 while it runs, which gates the inter device delay, and a
  // flag written 1 before the working screen is deferred, whose list enters it itself, section 290.
  // Without a screen the enter list writes state and nothing else, which is what this function produced
  // until section 279 and what left the remote on the page that started it.
  const screen = activity.screen;
  if (screen !== undefined) {
    if (screen.activity !== value) {
      throw new ComposeError(`the screen was composed for activity ${screen.activity}, this is ${value}`);
    }
    start.checkScreen(c, screen, { set, lists: existingLists, variables: states.count });
  }
  const writes: ListBody = [
    ...activity.targets.map((target) => [target.value, STATE_WRITE_BASE + target.variable] as const),
    [value, STATE_WRITE_BASE + variable.index],
  ];
  const shaped = screen === undefined ? { enter: writes, after: [] } : start.lists(screen, firstList, writes);
  const selectBody: ListBody = [[SELECT_BINDING_SET_MASK | set, SELECT_BINDING_SET]];
  // Tag 5, picking the running activity again, section 313: a list of the family's own where it builds one,
  // with a screen and only when the caller names no list of its own, the Harmony 600, 650 and 700's. It
  // keeps the start's inputs, whatever they are for, which is a reading rather than a measurement: putting a
  // device back on the activity's input after somebody changed it by hand, which needs a write of a
  // variable's current value to fire its transition, and whether it does is unread, section 313.
  //
  // **An input is recognised by its name**, `deviceVariables`' property, since that is the only thing
  // in the file that says what a variable tracks. A target whose property is neither is left out: no
  // configuration Logitech compiled for these models writes any other property in a start, so there is
  // no example to follow, and leaving it out keeps tag 5's writes inside tag 1's, which is the
  // envelope section 273 measured on every architecture.
  const inputs = new Set(deviceVariables(c).filter((one) => one.property === INPUT_PROPERTY)
    .map((one) => one.index));
  const resumeTargets = activity.targets.filter((one) => inputs.has(one.variable));
  const ownResume = screen !== undefined && activity.resumeList === undefined && start.resume !== undefined
    ? start.resume(screen, resumeTargets.map((target) => [target.value, STATE_WRITE_BASE + target.variable] as const))
    : undefined;
  const bodies = [shaped.enter, selectBody, ...shaped.after, ...(ownResume === undefined ? [] : [ownResume])]
    .map(encodedList);
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
  const resumeList = activity.resumeList ?? (ownResume !== undefined ? ownResumeList : enterList);
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
  if (activity.activityKey !== undefined && keyEditor !== undefined) {
    const finished = parse(bytes);
    bytes = applyEdits(finished, keyEditor.set(finished, activity.activityKey, set)).bytes;
  }
  if (rewire !== undefined) bytes = rewire(bytes);

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

export { SILENT_WRITE };

/** An action list's bytes, `u8 count` and then `u16 operand; u8 opcode` per instruction. */
function encodedList(body: ListBody): Uint8Array {
  const out = new Writer(1 + 3 * body.length).u8(body.length);
  for (const [operand, opcode] of body) out.u16(operand).u8(opcode);
  return out.bytes;
}

/** The value the next composed activity will take: one past the counter's highest, section 273. */
export function nextActivityValue(c: Container): number {
  const record = stateVariables(c).find((one) => one.label.startsWith(ACTIVITY_STATE_NAME))?.record;
  if (record === undefined) throw new ComposeError(`no ${ACTIVITY_STATE_NAME} variable`);
  return record.second + 1;
}

/** The base slot 14 records keyed by the activity, by what their cases do. */
export interface ActivityMaps {
  working: number;
  devices: number[];
  /**
   * The keypad map record, whose case per activity selects its handler set. Undefined on a Harmony 600, 650
   * or 700 configuration with no activity, which has no case to hold, so an empty configuration of ours
   * holds no such record, section 379; the first activity composed there adds none either. The Harmony
   * One's compile of two devices holds it with no case at all, `todo-compile-one.md` 1.2.11.
   */
  select: number | undefined;
}

/**
 * The base slot 14 records keyed by the activity counter `counter`, found by their keys and what their cases
 * queue: every activity and the idle value, activities entering a mode and the idle value not, is the
 * working screen's; the same keys all entering a mode are the key under Devices'; every activity and not
 * the idle value, each selecting that activity's own keypad map from `sets`, is the binding set's. One, one
 * or more, and at most one, and anything else is refused rather than guessed at. Measured on the thirteen
 * compiles of the Harmony 600, 650 and 700, section 329, and on the Harmony One's fifteen, whose records are
 * the same three kinds, section 399.
 *
 * **With no activity** each record holds the idle case alone and the keys cannot tell them apart, among
 * the records mapped through on the counter, section 379. What the case does can: the working screen
 * record's queues a further record, the one that enters the activity menu, section 336, and each record
 * under the key under Devices enters a mode, the idle device list, section 330. A record mapped through on
 * the counter with no case at all is the keypad map record, which the Harmony One's compile of two devices
 * holds and no configuration of the Harmony 600, 650 or 700 without an activity does.
 */
export function activityKeyedMaps(
  c: Container, counter: number, idle: number, activities: readonly number[], sets: ReadonlyMap<number, number>,
): ActivityMaps {
  const maps = valueMaps(c);
  if (maps === undefined) throw new ComposeError('base slot 14 does not read');
  const same = (keys: readonly number[], want: readonly number[]): boolean =>
    keys.length === want.length && [...keys].sort((a, b) => a - b).every((key, k) => key === [...want].sort((a, b) => a - b)[k]);
  const everything = [...activities, idle];
  if (activities.length === 0) {
    // Only the records something maps through on the counter: a mode's key map, an action list or a case's
    // program, `0x72` on `(record << 8) | counter`. The location's records hold an idle looking case too.
    const named = new Set<number>();
    const note = (opcode: number, operand: number): void => {
      if (opcode === MAP_VALUE_OPCODE && (operand & 0xff) === counter) named.add(operand >> 8);
    };
    for (const record of modeRecords(c) ?? []) for (const entry of record.entries) note(entry.opcode, entry.operand);
    for (const list of c.actionLists() ?? []) for (const one of list) note(one.opcode, one.operand);
    for (const map of maps) for (const [, target] of map.entries) {
      const queued = caseQueued(c, target);
      if (queued !== undefined) note(queued.opcode, queued.operand);
    }
    const working: number[] = [];
    const devices: number[] = [];
    const select: number[] = [];
    maps.forEach((map, index) => {
      if (!named.has(index) || map.ranges.length !== 0) return;
      if (map.entries.length === 0) {
        select.push(index);
        return;
      }
      if (!same(map.entries.map(([key]) => key), [idle])) return;
      const queued = caseQueued(c, (map.entries[0] as [number, number])[1]);
      if (queued?.opcode === MAP_VALUE_OPCODE) working.push(index);
      else if (queued?.opcode === ENTER_MODE) devices.push(index);
    });
    if (working.length !== 1 || devices.length === 0 || select.length > 1) {
      throw new ComposeError(`with no activity the records keyed by it read as ${working.length} working screen, `
        + `${devices.length} Devices key and ${select.length} keypad map records, not 1, some and at most 1`);
    }
    return { working: working[0] as number, devices, select: select[0] };
  }
  const working: number[] = [];
  const devices: number[] = [];
  const select: number[] = [];
  maps.forEach((map, index) => {
    if (map.ranges.length !== 0) return;
    const keys = map.entries.map(([key]) => key);
    const queued = new Map(map.entries.map(([key, target]) => [key, caseQueued(c, target)]));
    const enters = (key: number): boolean => queued.get(key)?.opcode === ENTER_MODE;
    if (same(keys, everything) && activities.every(enters)) {
      (enters(idle) ? devices : working).push(index);
    } else if (same(keys, activities) && activities.every((key) => {
      const one = queued.get(key);
      return one?.opcode === SELECT_BINDING_SET && one.operand === (SELECT_BINDING_SET_MASK | (sets.get(key) as number));
    })) {
      select.push(index);
    }
  });
  if (working.length !== 1 || devices.length === 0 || select.length > 1) {
    throw new ComposeError(`the activity keyed records read as ${working.length} working screen, `
      + `${devices.length} Devices key and ${select.length} keypad map records, not 1, some and at most 1`);
  }
  return { working: working[0] as number, devices, select: select[0] };
}

/**
 * The devices an activity's start switches on, as the device modes a device list enters for them, in the order its
 * enter list switches them on: the head of the activity's own device list, whose rows are those devices first and
 * then the rest in the idle list's order. **One rule for both families**, measured on each: the Harmony 600, 650
 * and 700's lists, 78 of 82, findings section 352, and the Harmony One's on 61 of Logitech's 64 activities, section
 * 424, the other three refused below. The transition route below was added for the Harmony One, where the devices'
 * variables alone fit 44 of the 64; on the 82 four slot activities the two routes give the same answer on all 82. It was the four slot family's own, `devicelist.ts`, until
 * `todo-compile-one.md` 4.3.3 took it for the Harmony One too.
 *
 * **The enter list's own instructions and the lists it calls, and no deeper**: a real one groups its power writes
 * into a called list on 12 of 13 four slot activities, every Harmony One one calls a list (nine of the 64 also hold a
 * power write inline), and a composed one writes them inline, and all are found at that depth. Deeper is the Remote Assistant's branch, whose lists this has no
 * business reading a device out of.
 *
 * **Which device a power write switches on** is read off the variable's own transition to 1, which sends that
 * device's code and no other's, section 86, and then off the device's variables where the transition sends nothing:
 * on five Harmony One compiles, all of one account, the set top box's power variable is named by no device, `devices` pairing that one
 * by its screen, so the device's variables alone miss it, which `activityPauseGroups` met first, section 327.
 *
 * **A device with no power variable is a placeholder in that group**, an instruction of opcode and operand zero
 * where its power write would be: Kodi on the Harmony 650, the Chromecast on the Harmony 600, the Roku on the
 * Harmony 700 and Kodi on the Harmony One, first in its group on all four. Nothing in the enter list says which
 * device it stands for, so it is the one device on the list with no power variable, by elimination, and two such
 * devices are refused rather than guessed between: one Harmony One compile, `compiled_protocols_3`, holds two, and
 * its three activities with a placeholder are the three refused. `composeActivity` never writes one, since a device
 * without a power variable cannot be one of its targets.
 *
 * `set` is the activity's base slot 9 entry, whose enter handler is the start; `listed` the device modes the list
 * holds, its rows.
 */
export function startSwitchedOn(c: Container, set: number, listed: readonly number[], what: string): number[] {
  const lists = c.actionLists() ?? [];
  const address = handlerSets(c)?.addresses[set];
  const enter = address === undefined ? undefined
    : taggedList(c, address)?.entries.find((one) => one.tag === HANDLER_TAG_ENTER);
  const enterList = enter === undefined ? undefined : lists[enter.operand];
  if (enterList === undefined) throw new ComposeError(`${what} has no enter list to read its devices from`);

  const inventory = devices(c);
  const byGroup = new Map(inventory.flatMap((one) => (one.group === undefined || one.mode === undefined ? [] : [[one.group, one.mode] as const])));
  const sends = infraredGroupsPerList(c);
  const records = new Map(stateVariables(c).map((one) => [one.index, one.record]));
  const modeOf = new Map<number, number>();
  for (const variable of deviceVariables(c)) {
    if (variable.property !== POWER_PROPERTY) continue;
    const reached = new Set<number>();
    for (const value of records.get(variable.index)?.values ?? []) {
      if (value.to !== 1 || value.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      for (const group of sends.get(value.operand) ?? []) reached.add(group);
    }
    const mode = reached.size === 1 ? byGroup.get([...reached][0] as number)
      : inventory.find((one) => one.variables.includes(variable.index))?.mode;
    if (mode !== undefined && listed.includes(mode)) modeOf.set(variable.index, mode);
  }
  const powered = new Set(modeOf.values());
  const unpowered = listed.filter((mode) => !powered.has(mode));

  const out: number[] = [];
  const add = (mode: number): void => { if (!out.includes(mode)) out.push(mode); };
  const read = (instructions: readonly Instruction[], depth: number): void => {
    for (const one of instructions) {
      if (one.opcode === ACTION_LIST_INDEX_OPCODE && depth === 0) {
        read(lists[one.operand] ?? [], depth + 1);
      } else if (one.opcode === 0 && one.operand === 0) {
        if (unpowered.length !== 1) {
          throw new ComposeError(`${what} switches on a device with no power variable and `
            + `${unpowered.length} devices on the list have none, so which one it is cannot be told`);
        }
        add(unpowered[0] as number);
      } else if (one.opcode >= STATE_WRITE_BASE && one.operand !== 0) {
        const mode = modeOf.get(one.opcode - STATE_WRITE_BASE);
        if (mode !== undefined) add(mode);
      }
    }
  };
  read(enterList, 0);
  return out;
}
