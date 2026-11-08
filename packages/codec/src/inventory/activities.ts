/**
 * A configuration's activities as it states them: the variable that counts them, the keys that start them, the
 * working screen each states, their names, the roles of the binding sets and the steps an activity's start queues.
 * Part of the inventory, `inventory.ts`.
 */
import { Container, type Instruction } from '../container/gspm.ts';
import {
  ACTION_LIST_INDEX_OPCODE, handlerSets, type ModePage, modePages, modeRecords, stateRecords, taggedList,
} from '../container/sections.ts';
import { valueMaps } from '../container/valuemap.ts';
import { IR_QUANTITY_OPCODE } from '../infrared/ir.ts';
import { SCREEN_END, SCREEN_QUEUE_INSTRUCTION, screenProgram } from '../screens/screen.ts';
import { characterMap, type ScreenString, screenStrings } from '../screens/text.ts';
import { MAP_WALK_DEPTH, SHORTEST_USEFUL_LABEL } from './common.ts';
import { deviceListRowMode, deviceModeMarker, infraredCodesPerList } from './devices.ts';
import {
  ENTER_MODE, KEY_EVENT_PRESS, KEY_EVENT_SHIFT, MAP_VALUE_OPCODE, SCAN_CODE_MASK, SELECT_BINDING_SET,
  SELECT_BINDING_SET_MASK, SEND_INFRARED,
} from './instructions.ts';
import { ACTIVITY_STATE_NAME, type StateVariable, stateVariables } from './statevariables.ts';
import { EDGE_CODES, PANEL_LEFT, touchOwner, touchPageOf } from './touch.ts';
/**
 * The instruction that writes a state variable, `STATE_WRITE_BASE + index`, taken from `actions.ts`
 * rather than declared again here.
 *
 * **It said `0x80 | index`, "one instruction with a five bit field"<!--superseded-->, and the code
 * adds.** For every
 * index below 128 the two spellings produce the same byte, so nothing could go wrong; the five is
 * what is wrong, and it under-claims what this reader depends on. The corpus reaches index **93**,
 * seven bits, and `calibration_h600`'s own activity variable is 34, whose chain is measured working
 * in section 121. So a reader "correcting" the code to match the comment's arithmetic would be
 * harmless and one narrowing the field to five bits would break the Harmony 600 calibration sample.
 * Section 139.
 */
import { STATE_WRITE_BASE } from '../container/actions.ts';

/**
 * The state variable that counts the activities, or undefined where the container has no name tree.
 *
 * Matched on the **first token**, because a level 1 name is `<label>_<qualifier>_<values>` and this
 * one is `CurrentActivityState_0_<values>` in every container that has it. One copy on purpose: three
 * readers here need it, and two right copies of a derivation is the state that precedes two diverging
 * ones.
 */
function activityVariable(c: Container): StateVariable | undefined {
  return stateVariables(c).find((v) => v.name.split('_')[0] === ACTIVITY_STATE_NAME);
}

/**
 * How many activities the config defines, or undefined when it has no name tree to say so.
 *
 * The count is the variable's highest value rather than its number of values, and section 121 is why:
 * the values are `0` upward with one of them, `idleActivityValue`, meaning no activity, so `highest`
 * of `highest + 1` values are activities. The calibration is the pair of section 58: a config compiled
 * by Logitech's own service for exactly one activity, read off the remote afterwards, reports one. A
 * safe mode container reports zero, and it is the one container whose lists write the idle value.
 */
export function activityCount(c: Container): number | undefined {
  return activityVariable(c)?.record?.second;
}

/** One way a button reaches one activity. */
export interface ActivityBinding {
  /**
   * The value written into `CurrentActivityState`.
   *
   * **Zero is an activity like any other**, which corrects the reading section 86 gave: it said value<!--superseded-->
   * 0 is "no activity running" and the rest are the activities. The idle value is the record's own
   * `first`, and section 273 replaced the description that used to sit here with a rule: the variable
   * takes `0` to `second`, those values are exactly the activities plus the idle one, and `second` is
   * the activity count, on 15 of 15 user configs. **Where the idle one sits is what varies**, the
   * maximum on 12 and inside the run on 3. `idleActivityValue` is that number and no binding writes it.
   */
  activity: number;
  /** Index into `modePages`, which is the screen the button belongs to. */
  page: number;
  /** The tagged list's key code: an event type in `0xC0` and a scan code in `0x3F`. Section 17. */
  tag: number;
  /** The scan code alone, which is what a silhouette would eventually name. */
  scan: number;
  /** The base slot 10 list the binding runs, which is where the selection happens. */
  list: number;
  /** The base slot 9 set that list selects. */
  set: number;
}

/**
 * Every button binding that starts an activity, and which activity it starts.
 *
 * **This is the chain an interface needs and it took four hops to find.** Section 120. A page's
 * tagged list binds a key to opcode `0x7F`, which names a base slot 10 action list; that list
 * carries `0x1F` with operand `0xFF | set`, which selects a base slot 9 binding set; that set's own
 * tagged list carries another `0x7F`, naming the list that writes `CurrentActivityState`.
 *
 * Two routes were ruled out before this one, section 112: no screen switch reads the variable's
 * index, and base slot 14's value maps point at targets that draw no text. A third was proposed in
 * `CLAUDE.md` and was wrong, the touch hit map, which exists on arch 12 alone.
 *
 * The closure is a count. The number of base slot 10 lists that write the variable equals the
 * activity count exactly, in every container that has a name tree, across four architectures. So
 * there is one such list per activity and no spares.
 */
export function activityBindings(c: Container): ActivityBinding[] {
  const variable = activityVariable(c);
  const lists = c.actionLists();
  const sets = handlerSets(c);
  if (variable === undefined || lists === undefined || sets === undefined) return [];
  const writeOpcode = STATE_WRITE_BASE + variable.index;

  // Hop one: which base slot 10 lists write the variable, and to what value.
  const writes = new Map<number, number>();
  lists.forEach((list, index) => {
    const found = list.find((i) => i.opcode === writeOpcode);
    if (found !== undefined) writes.set(index, found.operand);
  });

  // Hop two: which base slot 9 sets run one of those.
  const setActivity = new Map<number, number>();
  sets.addresses.forEach((address, index) => {
    for (const entry of taggedList(c, address)?.entries ?? []) {
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const activity = writes.get(entry.operand);
      if (activity !== undefined) setActivity.set(index, activity);
    }
  });

  // Hop three: which action lists select one of those sets.
  const selects = new Map<number, { activity: number; set: number }>();
  lists.forEach((list, index) => {
    for (const i of list) {
      if (i.opcode !== SELECT_BINDING_SET) continue;
      if ((i.operand & SELECT_BINDING_SET_MASK) !== SELECT_BINDING_SET_MASK) continue;
      const set = i.operand & 0xff;
      const activity = setActivity.get(set);
      if (activity !== undefined) selects.set(index, { activity, set });
    }
  });

  // Hop four: which page bindings run one of those lists.
  const out: ActivityBinding[] = [];
  modePages(c).forEach((page, index) => {
    for (const entry of taggedList(c, page.list)?.entries ?? []) {
      if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
      const hit = selects.get(entry.operand);
      if (hit === undefined) continue;
      out.push({
        activity: hit.activity,
        page: index,
        tag: entry.tag,
        scan: entry.tag & SCAN_CODE_MASK,
        list: entry.operand,
        set: hit.set,
      });
    }
  });
  return out;
}

/**
 * How many base slot 10 lists write `CurrentActivityState`, which should be the activity count.
 *
 * Separate from `activityBindings` on purpose: it is the closure the whole chain rests on, so it has
 * to be checkable without walking the other three hops. A container where these two disagree has
 * either an activity nothing starts or a list that writes a value no activity has.
 */
export function activityWriterCount(c: Container): number | undefined {
  const variable = activityVariable(c);
  const lists = c.actionLists();
  if (variable === undefined || lists === undefined) return undefined;
  const writeOpcode = STATE_WRITE_BASE + variable.index;
  return lists.filter((list) => list.some((i) => i.opcode === writeOpcode)).length;
}

/**
 * The value `CurrentActivityState` holds when no activity is running.
 *
 * Base slot 13's record states it, at +0x00, the field section 60 read as an initial value and marked
 * **unconfirmed** because nothing had been traced to it. This is the confirmation, and it comes from
 * the other side: it is exactly the value no activity binding writes, in all 15 user configs. The
 * agreement is not arithmetic, because on 3 of the 15 the idle value sits **inside** the run and an
 * activity holds the maximum, so no rule of the form "the top value is idle" can fit. Section 273
 * states the whole numbering rule, of which this is one row.
 *
 * The arch 9 safe mode container is the single case where a list **does** write it, and that is why
 * it reports zero activities: its one list returns the remote to idle rather than starting anything.
 */
export function idleActivityValue(c: Container): number | undefined {
  return activityVariable(c)?.record?.first;
}

/** Where each activity's working screen is stated: one base slot 14 record, keyed by activity. */
export interface ActivityScreens {
  /** The base slot 14 record, by index, which is what an `0x72` operand's high byte selects. */
  map: number;
  /** Activity value to the base slot 6 mode that activity shows once it is running. */
  screens: Map<number, number>;
}

/**
 * What a base slot 14 case does when it is one instruction: its program is a single `0x11` queueing
 * an action list instruction, then the end, which is every case of the records keyed by the activity
 * on the Harmony One and on the Harmony 600, 650 and 700, sections 279 and 290. Undefined for any
 * other program, so a caller asking "does this case enter a mode" cannot be answered by a longer one.
 */
export function caseQueued(c: Container, address: number): Instruction | undefined {
  const program = screenProgram(c, address);
  const first = program?.[0];
  if (program?.length !== 2 || program[1]?.opcode !== SCREEN_END
      || first?.opcode !== SCREEN_QUEUE_INSTRUCTION) {
    return undefined;
  }
  return { opcode: first.operands[2] as number, operand: (first.operands[0] as number) | ((first.operands[1] as number) << 8) };
}

/**
 * The screen each activity shows while it runs, read from the table the remote itself consults to
 * get back to it, section 279.
 *
 * **An activity has two screens and this is the second.** Its enter list opens by entering a mode
 * whose page says "Keep the remote pointed at your system" and binds every key to nothing; the
 * screen with the activity's own pads and "Devices" in the corner is entered at the end of the
 * chain, behind the infrared. So the first `0x7E` of an enter list is the wrong place to look, and
 * following the chain is worse, because it branches on the Remote Assistant's state variables and
 * reaches half a dozen help screens.
 *
 * The table is the reliable source, and it is found the way the remote reaches it. **Device mode's
 * "Activities" key** maps a state variable through base slot 14, and while an activity runs that
 * chain lands in a record keyed by `CurrentActivityState` whose cases are the two instruction screen
 * program `queue 0x7E:mode; end`. So this walks the Activities key of every device mode page, follows
 * `0x7F` into lists and `0x72` into the record it selects and on through the instructions its cases
 * queue, and keeps the records the walk selects **on the activity variable**. Only that key: walking
 * every key a device mode page binds reaches the Devices key's record too, which is keyed by the same
 * variable, and then there are two answers.
 *
 * **Shape alone was tried first and is not enough**: on twelve of the thirteen Harmony One
 * configurations with activities, three records are keyed by the activity and enter a mode on every
 * case an activity binds, and on the factory one five. The others map each activity to its own device
 * list, which is what the Devices key of the activity's screen enters. Every one of them also carries
 * a case for the idle value, which enters no mode, so "every case" is the wrong test. The walk
 * separates them where the shape cannot: from the Activities key alone it finds exactly one record on
 * 463 of 463 device mode pages over those thirteen.
 *
 * Cases for values no activity binds are ignored, and so is a binding with no case, which is exactly
 * what a composed activity is before its screen is composed. Undefined when the walk reaches no such
 * record or more than one, since two candidates would be a guess.
 */
export function activityScreens(c: Container): ActivityScreens | undefined {
  const variable = activityVariable(c);
  const lists = c.actionLists();
  const maps = valueMaps(c);
  const marker = deviceModeMarker(c);
  if (variable === undefined || lists === undefined || maps === undefined || marker === undefined) {
    return undefined;
  }
  const values = new Set(activityBindings(c).map((one) => one.activity));
  const queuedBy = (address: number): Instruction[] => (screenProgram(c, address) ?? [])
    .filter((one) => one.opcode === SCREEN_QUEUE_INSTRUCTION)
    .map((one) => ({
      operand: (one.operands[0] as number) | ((one.operands[1] as number) << 8),
      opcode: one.operands[2] as number,
    }));
  const enters = (address: number): number | undefined => {
    const queued = caseQueued(c, address);
    return queued?.opcode === ENTER_MODE ? queued.operand : undefined;
  };

  // The walk. A visited set per instruction, since the chains loop: a case can queue the key's own
  // list again, and the device list's lists call shared machinery several levels deep.
  const reached = new Set<number>();
  const seen = new Set<string>();
  const walk = (instruction: Instruction, depth: number): void => {
    const key = `${instruction.opcode}:${instruction.operand}`;
    if (depth > MAP_WALK_DEPTH || seen.has(key)) return;
    seen.add(key);
    if (instruction.opcode === ACTION_LIST_INDEX_OPCODE) {
      for (const one of lists[instruction.operand] ?? []) walk(one, depth + 1);
    } else if (instruction.opcode === MAP_VALUE_OPCODE) {
      const map = instruction.operand >> 8;
      if ((instruction.operand & 0xff) === variable.index) reached.add(map);
      for (const [, target] of maps[map]?.entries ?? []) {
        for (const one of queuedBy(target)) walk(one, depth + 1);
      }
    }
  };
  const deviceModes = new Set<number>();
  for (const list of lists) {
    const mode = deviceListRowMode(list, c.architecture, marker);
    if (mode !== undefined) deviceModes.add(mode);
  }
  const records = modeRecords(c) ?? [];
  for (const mode of deviceModes) {
    for (const page of records[mode]?.pages ?? []) {
      const left = activitiesKey(c, page);
      if (left === undefined) continue;
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.tag === ((KEY_EVENT_PRESS << KEY_EVENT_SHIFT) | left)) walk(entry, 0);
      }
    }
  }

  const found: ActivityScreens[] = [];
  for (const map of reached) {
    const screens = new Map<number, number>();
    for (const [value, target] of maps[map]?.entries ?? []) {
      if (!values.has(value)) continue;
      const mode = enters(target);
      if (mode !== undefined) screens.set(value, mode);
    }
    if (screens.size > 0) found.push({ map, screens });
  }
  return found.length === 1 ? found[0] : undefined;
}

/**
 * The scan code of a page's **left bottom key**, the one device mode labels "Activities", or
 * undefined where the page offers none.
 *
 * Found by position rather than by code, since a code is an area's place in its hit page, section
 * 275: the lowest content rectangle that starts at the panel's left edge. The right bottom key, where
 * a page has one, is "Devices" and leads to the running activity's device list, which is a different
 * record keyed by the same variable, so walking both keys finds two answers where there is one.
 */
function activitiesKey(c: Container, page: ModePage): number | undefined {
  const areas = (touchPageOf(c, page)?.areas ?? []).filter((one) => !EDGE_CODES.includes(one.code));
  if (areas.length === 0) return undefined;
  const bottom = Math.min(...areas.map((one) => one.y));
  return areas.find((one) => one.y === bottom && one.x === PANEL_LEFT)?.code;
}

/** An activity, the page whose keys start it, and its name where the config lets us name it. */
export interface ActivityName {
  activity: number;
  /** Index into `modePages`: the one page in the container whose keys start this activity. */
  page: number;
  /** The scan codes on that page which start it, in the page's own order. */
  scans: number[];
  /** The base slot 6 modes the chain enters, which is where the name comes from. */
  modes: number[];
  /** The label drawn on the page for this activity, when exactly one string resolves to it. */
  name?: string;
  /** Where that label is drawn, which is what makes it attributable in the first place. */
  at?: { x: number; y: number };
}

/**
 * Which activity a drawn name belongs to, section 121.
 *
 * The question the application could not answer: a mode page's screen program draws the activity
 * names and nothing else names them, section 112, so listing them was possible and saying which entry
 * starts which activity was not. `activityBindings` gets as far as the **page**. This gets to the
 * string on it, and the route is not geometry:
 *
 * 1. the activity's chain enters one or more base slot 6 modes, by opcode `0x7E`
 * 2. those modes' own pages draw text, and one of their strings is the activity's name, because a
 *    remote entering an activity puts its name on the screen
 * 3. so the page's string that relates to one of those is this activity's label
 *
 * "Relates to" is a string the modes say **exactly**, and containment either way only where nothing is
 * said exactly, which is what the Harmony 700 needs: its menu label is the name plus a qualifier and
 * its splash screen is a verb plus the name, so the two share the name and neither equals it.
 *
 * **A string several activities of one page claim is chrome**, a title or a footer, and is dropped.
 * That is what separates the label from the "Starting" splash text every row shares.
 *
 * **A label the menu wrapped onto a second row** is looked for last, and only for an activity nothing
 * else resolved, which is a Harmony 525 and nothing else here.
 *
 * **Arch 12 does not use any of that, and it runs first**, section 125. No string rule can work on a
 * touch panel: three pages of `one_config` bind activities on scans {50,51,52}, {50,48,49} and {48,49}
 * while each draws its labels at the same rows, so no fixed code to row map exists. A Harmony One takes
 * the label from base slot 17's hit map instead, through the index in the mode page's own `lead` byte,
 * so the rectangle is stated and the label is the text the firmware's hit test puts inside it. Sections
 * 121, 124 and 125.
 */
export function activityNames(c: Container): ActivityName[] {
  const bindings = activityBindings(c);
  if (bindings.length === 0) return [];
  const lists = c.actionLists() ?? [];
  const sets = handlerSets(c);
  const records = modeRecords(c) ?? [];
  const pages = records.flatMap((record) => record.pages);
  const map = characterMap(c);
  const drawn = map === undefined ? [] : screenStrings(c, map);
  const textOf = (program: number): ScreenString[] => drawn.filter((one) => one.program === program);
  const useful = (one: ScreenString): boolean => one.text.trim().length >= SHORTEST_USEFUL_LABEL;

  interface Draft {
    binding: ActivityBinding;
    scans: number[];
    modes: number[];
    /** Label key to the string that draws it, for every candidate this activity has. */
    candidates: Map<string, ScreenString>;
  }

  interface Spec {
    binding: ActivityBinding;
    scans: number[];
    modes: number[];
    /** Every string the modes this activity enters put on a screen. */
    spoken: string[];
  }

  const specs: Spec[] = [];
  for (const activity of [...new Set(bindings.map((b) => b.activity))].sort((a, b) => a - b)) {
    const mine = bindings.filter((b) => b.activity === activity);
    const binding = mine[0] as ActivityBinding;
    // **The page comes from the first binding and the scans from all of them**, which is only sound
    // because all of an activity's keys are on one page, section 120. That closure was measured and
    // then depended on with nothing stating it: were it ever to fail, the label would be looked up
    // on one page using scans from another and come back plausible. 0 counterexamples in the corpus,
    // so this refuses a container rather than guarding against one that exists. Section 139.
    if (mine.some((b) => b.page !== binding.page)) continue;

    // Hop one: every mode the chain enters. The bound list may enter one itself, and the base slot 9
    // set it selects has its own tagged list whose entries enter more.
    const modes = new Set<number>();
    const walked = new Set<number>();
    const walk = (index: number, depth: number): void => {
      if (depth > CHAIN_DEPTH_LIMIT || walked.has(index)) return;
      walked.add(index);
      for (const i of lists[index] ?? []) {
        if (i.opcode === ENTER_MODE) modes.add(i.operand);
        if (i.opcode === ACTION_LIST_INDEX_OPCODE) walk(i.operand, depth + 1);
      }
    };
    walk(binding.list, 0);
    for (const entry of taggedList(c, sets?.addresses[binding.set] ?? 0)?.entries ?? []) {
      if (entry.opcode === ENTER_MODE) modes.add(entry.operand);
      if (entry.opcode === ACTION_LIST_INDEX_OPCODE) walk(entry.operand, 1);
    }

    // Hop two: what those modes put on the screen. One of these strings is the activity's own name,
    // because a remote entering an activity says which one it entered.
    const spoken: string[] = [];
    for (const mode of modes) {
      for (const page of records[mode]?.pages ?? []) {
        for (const one of textOf(page.program)) if (useful(one)) spoken.push(one.text);
      }
    }

    specs.push({ binding, scans: mine.map((b) => b.scan), modes: [...modes], spoken });
  }

  // Hop three: the page's strings that relate to one of those. Containment either way rather than
  // equality, which is what the Harmony 700 needs: its menu label is the name plus a qualifier and its
  // splash screen is a verb plus the name, so the two share the name and neither equals it.
  //
  // **A string the modes say exactly beats one they only contain**, and that is not a tie break, it is
  // what stops containment crossing a word boundary. An activity's chain also enters the mode that
  // lists its devices, and that list is the same for every activity, so on a Harmony 880 whose owner
  // described his own config every activity said every device's name. One of the four menu labels is
  // the first word of a device's name, so containment made it a candidate for all four activities, the
  // chrome rule below then read a label four activities claim as a footer, and the activity it belonged
  // to lost its only candidate. Two other arch 8 configs and the 885 gained a name from the same rule.
  //
  // The alternative was dropping a string every activity says, on the ground that it distinguishes none
  // of them. It fixes exactly the same eight names and costs a pass, because the chrome rule one hop
  // later then has less to work with rather than more. Section 124.
  const candidatesFor = (spec: Spec, wrapped: boolean): Map<string, ScreenString> => {
    const { binding, spoken } = spec;
    const target = pages[binding.page];
    const rows = (target === undefined ? [] : textOf(target.program)).filter(useful);
    const exact = new Map<string, ScreenString>();
    const loose = new Map<string, ScreenString>();
    for (const one of rows) {
      for (const phrase of wrapped ? continuations(one, rows) : [one.text]) {
        const equal = spoken.some((said) => said === phrase);
        // **A wrapped label has to be a prefix of what the mode says**, not merely related to it, and
        // that is the menu's own behaviour: it truncates a long name to the rows it has. Containment
        // both ways is what the unwrapped case needs and it is far too loose here, because a joined
        // phrase ends up containing a device's name and every activity says all of those. It also
        // rejects a join that crosses from one menu item into the next, which containment accepted.
        const related = wrapped
          ? spoken.some((said) => said.startsWith(phrase))
          : spoken.some((said) => phrase.includes(said) || said.includes(phrase));
        if (!equal && !related) continue;
        const into = equal ? exact : loose;
        const key = labelKey(binding.page, { ...one, text: phrase });
        if (!into.has(key)) into.set(key, { ...one, text: phrase });
      }
    }
    return exact.size > 0 ? exact : loose;
  };

  // Hop four: drop the page's chrome, then propagate.
  //
  // **Chrome first, because it is not a label and would jam the propagation.** A page's title and its
  // footer relate to every activity's modes, since every activity's screens carry the same
  // boilerplate. Two rules find them, and both are needed: a key every activity of a page claims is
  // chrome, which is what catches a footer on a page with several activities; and a key some other
  // activity page of the same mode draws identically is chrome too, which is what catches it on a page
  // with only one. Testing only the first left the Harmony 600's single activity page holding its
  // footer as a rival candidate.
  const assigned = new Map<number, ScreenString>();
  const taken = new Set<string>();
  const resolve = (drafts: Draft[]): void => {
    const perPage = new Map<number, Draft[]>();
    for (const draft of drafts) {
      const on = perPage.get(draft.binding.page) ?? [];
      on.push(draft);
      perPage.set(draft.binding.page, on);
    }
    const activityPages = new Set(drafts.map((draft) => draft.binding.page));
    const elsewhere = new Map<number, Set<string>>();
    for (const page of activityPages) {
      const mode = modeOfPage(records, page);
      const others = new Set<string>();
      for (const sibling of activityPages) {
        if (sibling === page || modeOfPage(records, sibling) !== mode) continue;
        const program = pages[sibling]?.program;
        if (program === undefined) continue;
        for (const one of textOf(program)) {
          if (useful(one)) others.add(sameRowElsewhere(labelKey(sibling, one)));
        }
      }
      elsewhere.set(page, others);
    }
    for (const [page, on] of perPage) {
      const claims = new Map<string, number>();
      for (const draft of on) for (const key of draft.candidates.keys()) {
        claims.set(key, (claims.get(key) ?? 0) + 1);
      }
      const sharedElsewhere = elsewhere.get(page) ?? new Set<string>();
      for (const draft of on) {
        for (const key of [...draft.candidates.keys()]) {
          const everyone = on.length > 1 && claims.get(key) === on.length;
          const already = taken.has(key);
          if (everyone || already || sharedElsewhere.has(sameRowElsewhere(key))) {
            draft.candidates.delete(key);
          }
        }
      }
    }

    // **One label belongs to one activity**, so a candidate another activity has been assigned is no
    // longer a candidate here. That is a constraint rather than a preference, and propagating it is
    // what finishes the arch 8 pages: two of three activities resolve on their own and the third is
    // then the only claimant left on the label the other two gave up.
    for (let progress = true; progress; ) {
      progress = false;
      for (const draft of drafts) {
        if (assigned.has(draft.binding.activity) || draft.candidates.size !== 1) continue;
        const [key, label] = [...draft.candidates][0] as [string, ScreenString];
        assigned.set(draft.binding.activity, label);
        taken.add(key);
        for (const other of drafts) {
          if (other === draft) continue;
          other.candidates.delete(key);
        }
        progress = true;
      }
    }
  };

  // **On a Harmony One the label is stated rather than matched**, so that route runs first and the
  // string matching above only sees what it leaves. Section 125: the mode page's `lead` byte indexes
  // base slot 17's hit map, so the key that starts an activity has a rectangle, and the label is the
  // text the firmware's own hit test puts inside it. No containment, no chrome rule and no propagation,
  // which is why the eight activities of `one_config` resolve where every string based rule failed:
  // its three activity pages draw their labels on the same rows and bind different scan codes to them,
  // and that is the contradiction section 121 proved rather than a shortfall in the matching.
  for (const spec of specs) {
    const page = pages[spec.binding.page];
    if (page === undefined) continue;
    const areas = touchPageOf(c, page)?.areas;
    if (areas === undefined || areas.length === 0) continue;
    for (const scan of spec.scans) {
      const area = areas.find((one) => one.code === scan);
      if (area === undefined) continue;
      const inside = textOf(page.program)
        .filter(useful)
        .filter((one) => touchOwner(areas, one.x, one.y) === area);
      // One label to a region. Several means the region holds a wrapped label or a second line, and
      // this route does not guess which part is the name.
      const distinct = [...new Map(inside.map((one) => [one.text, one])).values()];
      if (distinct.length !== 1) continue;
      const label = distinct[0] as ScreenString;
      assigned.set(spec.binding.activity, label);
      taken.add(labelKey(spec.binding.page, label));
      break;
    }
  }

  const drafts: Draft[] = specs.map((spec) => ({
    binding: spec.binding,
    scans: spec.scans,
    modes: spec.modes,
    candidates: candidatesFor(spec, false),
  }));
  resolve(drafts);

  // **A page with one activity has nothing to tell its footer from its label by**, and a configuration
  // of ours with one activity is that page: its menu draws "TV" and the footer "Devices", and the
  // activity's own screen draws both, the name as its title and "Devices" in its corner. Neither chrome
  // rule above can fire, since both need a second activity. So a tie is broken by what the rest of the
  // configuration draws: a candidate drawn identically on a screen of neither the page's mode nor the
  // activity's own is chrome, the way the device lists' title "Devices" is. Only as a tie break, and only
  // where it leaves a candidate, so a label some device's page happens to draw too is never lost when it
  // is the only one. Section 379.
  const drawnByMode = new Map<string, Set<number>>();
  records.forEach((record, mode) => {
    for (const page of record.pages) {
      for (const one of textOf(page.program)) {
        const modes = drawnByMode.get(one.text) ?? new Set<number>();
        modes.add(mode);
        drawnByMode.set(one.text, modes);
      }
    }
  });
  let broken = false;
  for (const draft of drafts) {
    if (assigned.has(draft.binding.activity) || draft.candidates.size < 2) continue;
    const own = new Set([modeOfPage(records, draft.binding.page), ...draft.modes]);
    const elsewhere = [...draft.candidates].filter(([, label]) => [...(drawnByMode.get(label.text) ?? [])].some((mode) => !own.has(mode)));
    if (elsewhere.length === 0 || elsewhere.length === draft.candidates.size) continue;
    for (const [key] of elsewhere) draft.candidates.delete(key);
    broken = true;
  }
  if (broken) resolve(drafts);

  // **And a tie the rest of the configuration draws both sides of is broken by the activity's own modes**,
  // todo-compile-650 11.2.2. One activity named as a device, "LG TV", or as a word of the menus, "Devices",
  // is drawn on the device pages or the device lists as well, so the rule above finds both candidates
  // elsewhere and keeps both. What still tells them apart is how many of the modes the activity enters say
  // the candidate: the label is said by its start up screen, inside "Starting LG TV", and by its working
  // screen as the title, where the footer "Devices" is said by the working screen alone. So the candidates
  // said by the most of those modes are kept. Where what is left is one text drawn in several places, an
  // activity called "Devices" over the footer "Devices", the name is that text either way, and the place
  // is the one no page of the activity's own modes draws that text at: the footer is drawn at the same
  // place on its working screen, the menu label is not. Only as a tie break, after both rules above.
  const placesOf = (mode: number): ScreenString[] => (records[mode]?.pages ?? []).flatMap((page) => textOf(page.program));
  let tied = false;
  for (const draft of drafts) {
    if (assigned.has(draft.binding.activity) || draft.candidates.size < 2) continue;
    const said = (text: string): number => draft.modes.filter((mode) =>
      placesOf(mode).some((one) => one.text === text || one.text.includes(text))).length;
    const most = Math.max(...[...draft.candidates.values()].map((label) => said(label.text)));
    for (const [key, label] of [...draft.candidates]) if (said(label.text) < most) draft.candidates.delete(key);
    const texts = new Set([...draft.candidates.values()].map((label) => label.text));
    if (draft.candidates.size > 1 && texts.size === 1) {
      const repeated = [...draft.candidates].filter(([, label]) => draft.modes.some((mode) =>
        placesOf(mode).some((one) => one.text === label.text && one.x === label.x && one.y === label.y)));
      if (repeated.length < draft.candidates.size) for (const [key] of repeated) draft.candidates.delete(key);
    }
    tied = true;
  }
  if (tied) resolve(drafts);

  // Hop five, and only for what is left: **a label the menu wraps onto a second row**, which is the
  // Harmony 525 and nothing else here. Its menu is two columns of two lines each, so an activity's own
  // label is drawn as two strings on consecutive rows, and matching one row at a time returns a
  // fragment. `docs/findings.md` section 121 has the layout.
  //
  // A fallback rather than a rule, and deliberately: a wrapped candidate is only looked for once an
  // activity has failed to resolve on single rows, so this pass can add a name and cannot change one.
  // It also gives up the whole single row candidate set, because keeping both leaves every fragment as
  // a rival of the label it is a fragment of.
  const stuck = specs.filter((spec) => !assigned.has(spec.binding.activity));
  if (stuck.length > 0) {
    resolve(stuck.map((spec) => ({
      binding: spec.binding,
      scans: spec.scans,
      modes: spec.modes,
      candidates: candidatesFor(spec, true),
    })));
  }

  return drafts.map((draft): ActivityName => {
    const base = {
      activity: draft.binding.activity,
      page: draft.binding.page,
      scans: draft.scans,
      modes: draft.modes,
    };
    const label = assigned.get(draft.binding.activity);
    if (label === undefined) return base;
    return { ...base, name: label.text, at: { x: label.x, y: label.y } };
  });
}

/** Which base slot 6 record a flattened page index belongs to, since chrome is a per mode notion. */
function modeOfPage(
  records: readonly { pages: readonly unknown[] }[],
  page: number,
): number | undefined {
  let seen = 0;
  for (const [index, record] of records.entries()) {
    if (page < seen + record.pages.length) return index;
    seen += record.pages.length;
  }
  return undefined;
}

/** The same label key with the page dropped, so one page's chrome can be recognised on another. */
function sameRowElsewhere(key: string): string {
  return key.slice(key.indexOf(',') + 1);
}

/**
 * What makes two draws the same label: the page, the row and the text.
 *
 * **The row alone is not enough and neither is the position.** Arch 8 lays its activity menu out in
 * two columns, so two activities of one page have labels at the same `y`, which keying on the row
 * merged. And a 525 draws one label twice on a row at two `x` values, a selected and an unselected
 * copy, which keying on the position split. The text settles both: same row and same text is one
 * label however many times it is drawn, and two columns differ because their words do.
 */
function labelKey(page: number, one: ScreenString): string {
  return `${page},${one.y},${one.text}`;
}

/**
 * A draw's text joined with each draw on the next row down, which is what a wrapped label looks like.
 *
 * **Not the same column, because the second line is not aligned with the first.** The 525 draws
 * "Watch" at x 63 and its continuation at x 72, so a column test would miss it; what selects the right
 * continuation is the caller's own filter, that the joined text is something the activity's modes say.
 * Only one row down: no label in the corpus wraps three ways, and allowing two would let a fragment of
 * one item join a fragment of the next.
 */
function continuations(one: ScreenString, rows: readonly ScreenString[]): string[] {
  const below = rows.filter((other) => other.y > one.y).map((other) => other.y);
  if (below.length === 0) return [];
  const next = Math.min(...below);
  return rows.filter((other) => other.y === next).map((other) => `${one.text} ${other.text}`);
}

/**
 * How far to follow `0x7F` from the bound list.
 *
 * Three is enough for every container here and the limit is a guard rather than a reading: an action
 * list may name another, so an unbounded walk would visit most of base slot 10 for every activity.
 */
const CHAIN_DEPTH_LIMIT = 3;

/**
 * `resolveLabel` was here and is gone, which is a removal this file records rather than performs
 * quietly.
 *
 * It had **zero callers** and it implemented the rule section 124 refuted: it accepted a page string
 * that merely **contained** one of the activity's spoken strings, or was contained by it, where the
 * live route in `activities` requires an exact match first and falls back to containment only after.
 * That is not a style difference. An activity's chain enters the mode that lists the devices, so every
 * activity says every device's name, and reading containment as sufficient let one label be claimed by
 * all four activities of an arch 8 (Harmony 880) config and then dropped from all four as chrome. The
 * corpus wide figure sat at 23 of 35 for a day because of it, and three of those 23 were fragments of a
 * wrapped label belonging to a different activity than the one they were reported for.
 *
 * So the measurement that decides between the two copies already existed, in section 124, and the copy
 * that lost is the one that was removed. That order matters here: the rule is to reproduce the
 * disagreement and find an external answer **before** deleting either half, and the answer in this case
 * is the calibration pair, whose three devices and two activities were chosen before the bytes existed.
 */

/** What a base slot 9 entry is for, which is one of three things and not one of two. */
export type HandlerSetRole = 'unselected' | 'activity' | 'idle';

/**
 * Every base slot 9 entry with what it is for, which settles what the table corresponds to.
 *
 * `reference/config-format/modes-and-keys.md` recorded this as not established and offered "devices and activities
 * together" as the reading the counts support. It is not: a device never has an entry, and the count
 * is a fixed per model prefix plus one entry per activity plus exactly one more. Section 272.
 *
 * * **`unselected`**: an entry no `0x1F` in the configuration ever selects. These are a contiguous
 *   prefix in all fifteen user configurations, 7 entries long on arch 8 and arch 12 (Harmony One),
 *   5 on arch 14 (Harmony 600 and 700) and 4 on arch 9 (Harmony 525), and the length does not move
 *   with the number of devices or activities.
 * * **`activity`**: the key map one activity installs while it runs, which is what `activities`
 *   already reports as its `set`.
 * * **`idle`**: the one remaining entry. There is exactly one in every user configuration here, it is
 *   always selected, and it always carries an enter handler as an activity's does. **What installs it
 *   and when is not established**, so the name says where it sits in the count and not what it does.
 */
export function handlerSetRoles(c: Container): HandlerSetRole[] {
  const sets = handlerSets(c);
  if (sets === undefined) return [];
  const selected = new Set<number>();
  for (const list of c.actionLists() ?? []) {
    for (const instruction of list ?? []) {
      if (instruction.opcode !== SELECT_BINDING_SET) continue;
      if ((instruction.operand & SELECT_BINDING_SET_MASK) !== SELECT_BINDING_SET_MASK) continue;
      selected.add(instruction.operand & 0xff);
    }
  }
  const byActivity = new Set(activityBindings(c).map((one) => one.set));
  return sets.addresses.map((_, index) => {
    if (!selected.has(index)) return 'unselected';
    return byActivity.has(index) ? 'activity' : 'idle';
  });
}

/** An activity, with the devices it drives and the key map it installs. */
export interface Activity extends ActivityName {
  /** The base slot 9 set the chain selects: the activity's own key map while it runs. Section 39. */
  set: number;
  /** The devices it addresses, by infrared group, ascending. */
  devices: number[];
}

/**
 * The activities, with what each one actually does.
 *
 * `activityNames` says which key starts an activity and what it is called; this adds which **devices**
 * it drives, which is the other half of what an interface shows. The route is the base slot 9 set the
 * starting chain selects, section 120: that set is the key map the activity installs, so the devices
 * its bindings send to are the devices the activity uses. An activity in the corpus drives one to three
 * of them.
 *
 * The union is over the whole set rather than over the start sequence alone, deliberately: an activity
 * that sends the volume to a receiver is using that receiver whether or not it switched it on.
 */
export function activities(c: Container): Activity[] {
  const codes = infraredCodesPerList(c);
  const sets = handlerSets(c);
  const bindings = new Map(activityBindings(c).map((one) => [one.activity, one.set]));
  return activityNames(c).map((one) => {
    const set = bindings.get(one.activity);
    const groups = new Set<number>();
    if (set !== undefined) {
      for (const entry of taggedList(c, sets?.addresses[set] as number)?.entries ?? []) {
        for (const sent of codes.get(entry.operand) ?? []) groups.add(sent.group);
      }
    }
    return { ...one, set: set ?? -1, devices: [...groups].sort((a, b) => a - b) };
  });
}

/**
 * The handler set entry that runs an activity's start sequence.
 *
 * A base slot 9 set's tagged list carries key bindings, whose tags are key codes with an event type
 * in the top two bits (section 17), and a handful of entries below `0x80` that are not keys. Three
 * of those appear in this corpus, tags 1, 2 and 5, and **tag 1 is the start sequence**: over 21
 * containers it holds 735 of the 917 quantity instructions any low tag reaches and every power on
 * delay `powerOnInstructions` finds, and reading one out shows it switching each device on, setting
 * the inputs, switching off what the activity does not want and finally writing
 * `CurrentActivityState`.
 *
 * The other two are named by what fires them, section 313: the activity switch runs the activity
 * being left with tag 2 and the one being entered with tag 1, and when the activity asked for is the
 * one already running it runs it with tag **5** instead. Tag 5 exists on the same 92 set entries and
 * re-sends **only** the input commands, with no power change. This docstring called that the shape of
 * a fix it chain<!--superseded--> while what fires it was unread. Tag 2 writes state variables and
 * reaches 5 sends in the whole corpus. Neither is read further here, because neither carries a power
 * on delay.
 */
export const ACTIVITY_START_TAG = 1;

/** One thing an activity's start sequence puts on the send queue, in order. */
export interface QueuedStep {
  /** A code going out, or a quantity for the group named beside it. */
  kind: 'send' | 'delay';
  /** The infrared group, which is the operand's high byte for both opcodes. */
  group: number;
  /** The code number for a send, tenths of a second for a delay. */
  value: number;
}

/**
 * What an activity's start sequence pushes onto the send queue, in the order it pushes it.
 *
 * `set` is a base slot 9 handler set index, as `activityBindings` reports it. The walk follows
 * `0x7F` into nested lists and follows a state variable write into the base slot 13 transition it
 * triggers, which is where the sends actually live: the start list writes `TV_Power = 1` and the
 * code goes out because that variable's 0 to 1 transition runs a list, section 86.
 *
 * **Depth and revisits are bounded and that is not a detail.** A transition can write a variable
 * whose transition writes the first one back, so the walk carries a visited set per branch and a
 * depth ceiling. Without them a config that does that would hang the reader rather than misreport.
 */
export function activityStartSteps(c: Container, set: number): QueuedStep[] {
  const lists = c.actionLists();
  const records = stateRecords(c);
  const sets = handlerSets(c);
  if (lists === undefined || records === undefined || sets === undefined) return [];
  const address = sets.addresses[set];
  if (address === undefined) return [];

  const steps: QueuedStep[] = [];
  const walk = (index: number, seen: Set<number>, depth: number): void => {
    const list = lists[index];
    if (list === undefined || seen.has(index) || depth > WALK_DEPTH) return;
    seen.add(index);
    for (const instruction of list) {
      if (instruction.opcode >= STATE_WRITE_BASE) {
        // A write to a state variable, which runs whatever that value's transition names.
        const variable = instruction.opcode - STATE_WRITE_BASE;
        for (const value of records[variable]?.values ?? []) {
          if (value.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
          if (value.to !== instruction.operand) continue;
          walk(value.operand, new Set(), depth + 1);
        }
      } else if (instruction.opcode === SEND_INFRARED) {
        steps.push({ kind: 'send', group: instruction.operand >>> 8, value: instruction.operand & 0xff });
      } else if (instruction.opcode === IR_QUANTITY_OPCODE) {
        steps.push({ kind: 'delay', group: instruction.operand >>> 8, value: instruction.operand & 0xff });
      } else if (instruction.opcode === ACTION_LIST_INDEX_OPCODE) {
        walk(instruction.operand, seen, depth + 1);
      }
    }
  };
  for (const entry of taggedList(c, address)?.entries ?? []) {
    if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
    if (entry.tag !== ACTIVITY_START_TAG) continue;
    walk(entry.operand, new Set(), 0);
  }
  return steps;
}

/** How deep `activityStartSteps` follows a chain before giving up. */
const WALK_DEPTH = 8;
