/**
 * What a config says it is **for**: which devices it drives and how many activities it has.
 *
 * Everything else in this codec is about bytes. This module is about the two nouns the
 * application's interface is built from, and it exists because both turn out to be stated rather
 * than inferred: an infrared group is a device, and one state variable counts the activities.
 * `docs/findings.md` section 86.
 *
 * **The names in here are the user's own equipment.** This module hands them back, because the
 * application is reading its owner's own config; what does not happen is quoting one in a document
 * or a test. The generic role words the generator emits are structure and appear freely, and the
 * tests assert how many variables carry a device identifier rather than which.
 */
import { Container } from './gspm.ts';
import { IR_QUANTITY_OPCODE, irGroups } from './ir.ts';
import {
  handlerSets,
  modePages,
  modeRecords,
  nameNodes,
  stateRecords,
  taggedList,
} from './sections.ts';
import { characterMap, screenStrings } from './text.ts';
import { panelPoint, touchOwner, touchPageOf } from './touch.ts';
import type { ScreenString } from './text.ts';
import type { TouchArea } from './tables.ts';
import type { ModePage, StateRecord } from './sections.ts';
import type { ScreenChoice } from './render.ts';

/**
 * The level base slot 0 names state variables at. Level 0 names the containers, `Root` and `State`
 * and, on the generators that emit it, `HarmonyAssistant`; level 2 is a menu below one of those.
 */
export const STATE_NAME_LEVEL = 1;

/**
 * The variable that counts the activities, by name, in every one of the seventeen containers of
 * the corpus that carry a name tree. Its highest value **is** the number of activities: zero in a
 * safe mode container, one in the config Logitech compiled for a single activity while we watched.
 */
export const ACTIVITY_STATE_NAME = 'CurrentActivityState';

/** How a level 1 name is put together, once the trailing value count is taken off. */
export interface StateVariable {
  /** Index into base slot 13, which is what the name node states. */
  index: number;
  /** The whole name as the config spells it, the user's device name included. */
  name: string;
  /**
   * The name with the trailing `_<values>` removed, or the whole name when there is none. It ends
   * in a qualifier of its own: a device identifier on the arch 14 configs, and a small number
   * elsewhere, `CurrentActivityState_0` being the one every container carries.
   */
  label: string;
  /**
   * The number the name ends in, which is the record's highest value plus one, or undefined when
   * the name does not end in a number. 250 of 250 agree across four architectures.
   */
  stated?: number;
  /**
   * The Logitech device identifier, when the name carries one: a token of six digits or more,
   * which the two arch 14 configs use and the older generators do not. Not stored anywhere in the
   * container as a number, so it is host side metadata like the rest of base slot 0.
   */
  deviceId?: number;
  record?: StateRecord;
}

const DEVICE_ID = /^\d{6,}$/;
const TRAILING_COUNT = /_(\d+)$/;

/** Every named state variable, joined to the base slot 13 record its index names. */
export function stateVariables(c: Container): StateVariable[] {
  const records = stateRecords(c) ?? [];
  const out: StateVariable[] = [];
  for (const node of nameNodes(c) ?? []) {
    if (node.level !== STATE_NAME_LEVEL) continue;
    const tail = TRAILING_COUNT.exec(node.name);
    const parts = node.name.split('_');
    const id = parts.slice(0, -1).find((part) => DEVICE_ID.test(part));
    out.push({
      index: node.index,
      name: node.name,
      label: tail === null ? node.name : node.name.slice(0, node.name.length - tail[0].length),
      ...(tail === null ? {} : { stated: Number(tail[1]) }),
      ...(id === undefined ? {} : { deviceId: Number(id) }),
      ...(records[node.index] === undefined ? {} : { record: records[node.index] }),
    });
  }
  return out;
}

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

/**
 * How many devices the config drives: one infrared group per device.
 *
 * Base slot 5's groups are the device partition of the infrared database, 8 to 164 codes each, and
 * a group may be empty. Two things say a group is a device rather than some other grouping: the
 * config compiled for one device carries exactly one group, and on the two arch 14 configs the
 * number of distinct device identifiers in the state variable names is the number of groups, 4 and
 * 6. Section 86.
 */
export function deviceCount(c: Container): number | undefined {
  return irGroups(c)?.length;
}

/** The distinct device identifiers the names carry, in first appearance order. Arch 14 only. */
export function deviceIds(c: Container): number[] {
  const out: number[] = [];
  for (const variable of stateVariables(c)) {
    if (variable.deviceId !== undefined && !out.includes(variable.deviceId)) {
      out.push(variable.deviceId);
    }
  }
  return out;
}

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
import {
  BYTE_REGISTER_FROM_STATE,
  STATE_BAND,
  STATE_FROM_BYTE_REGISTER,
  STATE_WRITE_BASE,
} from './actions.ts';
/** Opcode `0x7F`, whose operand indexes base slot 10. Section 34. */
const ACTION_LIST_INDEX = 0x7f;
/**
 * Opcode `0x1F` with operand `0xFFxx` selects the current binding table entry, the low byte being
 * the index into base slot 9. `docs/config-format.md`, from the register machine's own band.
 */
const SELECT_BINDING_SET = 0x1f;
const SELECT_BINDING_SET_MASK = 0xff00;
/** A key code's scan code, the rest of it being the event type. Section 17. */
const SCAN_CODE_MASK = 0x3f;
/** How far to shift a key code to leave the event type: 0 none, 1 release, 2 press, 3 repeat. */
const KEY_EVENT_SHIFT = 6;
/** The event type of a press. */
export const KEY_EVENT_PRESS = 2;

/** One way a button reaches one activity. */
export interface ActivityBinding {
  /**
   * The value written into `CurrentActivityState`.
   *
   * **Zero is an activity like any other**, which corrects the reading section 86 gave: it said value<!--superseded-->
   * 0 is "no activity running" and the rest are the activities. The idle value is the record's own
   * `first`, which happens to equal `second` in ten of the eleven containers and is 7 where the
   * highest is 8 in the other. `idleActivityValue` is that number, and no binding here ever writes it.
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
      if (entry.opcode !== ACTION_LIST_INDEX) continue;
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
      if (entry.opcode !== ACTION_LIST_INDEX) continue;
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
 * the other side: it is exactly the value no activity binding writes, in all eleven containers of the
 * corpus that name the variable. Ten of them have it equal to the highest value and one has 7 where
 * the highest is 8, so the agreement is not arithmetic.
 *
 * The arch 9 safe mode container is the single case where a list **does** write it, and that is why
 * it reports zero activities: its one list returns the remote to idle rather than starting anything.
 */
export function idleActivityValue(c: Container): number | undefined {
  return activityVariable(c)?.record?.first;
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
        if (i.opcode === ACTION_LIST_INDEX) walk(i.operand, depth + 1);
      }
    };
    walk(binding.list, 0);
    for (const entry of taggedList(c, sets?.addresses[binding.set] ?? 0)?.entries ?? []) {
      if (entry.opcode === ENTER_MODE) modes.add(entry.operand);
      if (entry.opcode === ACTION_LIST_INDEX) walk(entry.operand, 1);
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

/** Opcode `0x7E`: enter the base slot 6 mode the operand indexes. Section 36. */
const ENTER_MODE = 0x7e;
/**
 * How far to follow `0x7F` from the bound list.
 *
 * Three is enough for every container here and the limit is a guard rather than a reading: an action
 * list may name another, so an unbounded walk would visit most of base slot 10 for every activity.
 */
const CHAIN_DEPTH_LIMIT = 3;
/** A string this short says nothing about which activity it belongs to. */
const SHORTEST_USEFUL_LABEL = 2;

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

/**
 * Opcode `0x7D`: send an infrared code, `{ u8 group; u8 index }`. Section 33.
 *
 * The group is the device, section 86, so this instruction is the only place in the format where an
 * action says **which device** it is talking to.
 */
const SEND_INFRARED = 0x7d;
/** The high byte of `0x7D`'s operand: the base slot 5 group. */
const INFRARED_GROUP_SHIFT = 8;

/** One device: an infrared group, and the name the config gives it. */
export interface Device {
  /** Index into base slot 5's group array, which is the device's identity. Section 86. */
  group: number;
  /** How many infrared codes it has. A group may be empty. */
  codes: number;
  /** The name, where the config states one. */
  name?: string;
  /**
   * Where that name came from, because the three routes are not equally strong:
   *
   * * `names` is base slot 0's own ASCII, tied to this group by the variable's transitions. Stated.
   * * `elimination` is the one label left over for the one group left over. Forced, not read.
   * * `screen` is the title the device's own mode draws, decoded from glyph pixels. Last resort.
   */
  source?: 'names' | 'elimination' | 'screen';
  /** The base slot 13 variables whose name carries this device's label. */
  variables: number[];
}

/**
 * A level 1 name that belongs to a device, split into the device's label and the property.
 *
 * A device variable is named `<label>_<property>_<values>` and a global is named
 * `<name>_<values>` or `<name>_<qualifier>_<values>` with a **numeric** qualifier, which is what
 * separates the two: `TV_Power_2` is a device's, `CurrentActivityState_0_4` and
 * `DefaultPowerOnDelay_92595307_255` are not. Section 86 read the shape and called the qualifier "a
 * device identifier on the arch 14 configs, and a small number elsewhere"; that number is exactly the
 * discriminator, since no property word is a number.
 *
 * The label keeps its underscores, because a device label is the user's own words and often several
 * of them: two containers here have a label of four tokens.
 */
export interface DeviceVariable {
  index: number;
  /** The device's label as base slot 0 spells it, underscores included. */
  device: string;
  /** The last token, which is what the variable tracks about that device. */
  property: string;
}

/** The level 1 names that belong to a device rather than to the config as a whole. */
export function deviceVariables(c: Container): DeviceVariable[] {
  const out: DeviceVariable[] = [];
  for (const variable of stateVariables(c)) {
    const cut = variable.label.lastIndexOf('_');
    if (cut <= 0) continue;
    const property = variable.label.slice(cut + 1);
    // A numeric qualifier means the name belongs to the config, not to a device.
    if (property.length === 0 || /^[0-9]+$/.test(property)) continue;
    out.push({ index: variable.index, device: variable.label.slice(0, cut), property });
  }
  return out;
}

/**
 * Every device the config drives, with its name.
 *
 * **The name is stated, and it took a detour to see where.** Base slot 0 names no devices: its level
 * 1 nodes are state variables, and a device's label is only ever a **prefix** of one, `TV_Power_2`.
 * So the label is in the file in ASCII and nothing says which infrared group it belongs to. The link
 * is base slot 13: a variable's record carries its transitions, each holding one action list
 * instruction, section 86, and for a device's `Power` or `Input` variable that list is the one that
 * **sends the code**. So the group is `0x7D`'s own operand, reached from the variable that names it.
 *
 * That is route one and it is exact: 37 of 37 labels across eleven containers reach exactly one
 * group, and no two labels reach the same one. Two routes fill in behind it, in this order:
 *
 * 1. **Elimination**, when exactly one label and one group are left unpaired. Forced rather than
 *    read, and it is what names the device whose only variable has no transitions, which happens when
 *    the remote knows one value for it and therefore has nothing to switch between.
 * 2. **The screen**, for a group with no label at all: the title of the device's own mode, taken only
 *    when one candidate survives. A string that already names an activity is not a candidate, which
 *    is what separates a device called `Roku` from an activity called `Watch Roku`.
 *
 * The independent closure is that the ASCII label is **drawn**: for every device route one names, the
 * label turns up in the screen text as well, and those are two encodings of one string decoded by
 * unrelated code, base slot 0's bytes against base slot 7's glyph pixels.
 */
export function devices(c: Container): Device[] {
  const groups = irGroups(c) ?? [];
  const records = stateRecords(c);
  const out: Device[] = groups.map((group, index) => ({
    group: index,
    codes: group.addresses.length,
    variables: [],
  }));
  const sent = infraredGroupsPerList(c);
  if (sent.size === 0 && groups.length === 0) return out;
  const groupsOf = (index: number): Set<number> => sent.get(index) ?? new Set<number>();

  // Route one: a device variable's transitions send that device's codes and nobody else's.
  const labels: string[] = [];
  const reaches: { label: string; group: number }[] = [];
  for (const variable of deviceVariables(c)) {
    if (!labels.includes(variable.device)) labels.push(variable.device);
    const reached = new Set<number>();
    for (const value of records?.[variable.index]?.values ?? []) {
      if (value.opcode !== ACTION_LIST_INDEX) continue;
      for (const group of groupsOf(value.operand)) reached.add(group);
    }
    if (reached.size !== 1) continue;
    reaches.push({ label: variable.device, group: [...reached][0] as number });
  }
  const { named, contested } = pairLabelsToGroups(reaches);
  for (const [label, group] of named) {
    const device = out[group];
    if (device === undefined) continue;
    device.name = label;
    device.source = 'names';
  }
  for (const variable of deviceVariables(c)) {
    const group = named.get(variable.device);
    if (group !== undefined) out[group]?.variables.push(variable.index);
  }

  // Route two: one label and one group left over pair by force.
  //
  // **A contested group is not "left over"**, it is a group whose evidence contradicts itself, so it
  // is excluded here as well as above. Dropping its label without this would put both back in the
  // free pools and let the forced pairing produce exactly the wrong name the exclusion exists to
  // prevent.
  const freeGroups = out.filter((device) => device.name === undefined && !contested.has(device.group));
  const freeLabels = labels.filter((label) => !named.has(label));
  if (freeGroups.length === 1 && freeLabels.length === 1) {
    const device = freeGroups[0] as Device;
    device.name = freeLabels[0] as string;
    device.source = 'elimination';
    for (const variable of deviceVariables(c)) {
      if (variable.device === device.name) device.variables.push(variable.index);
    }
  }

  // Route three: the title of the device's own mode, for a group base slot 0 does not name at all.
  const stillFree = out.filter((device) => device.name === undefined && device.codes > 0);
  if (stillFree.length > 0) {
    const spokenFor = new Set(activityNames(c).map((one) => one.name));
    const titles = deviceModeTitles(c);
    for (const device of stillFree) {
      const candidates = [...(titles.get(device.group) ?? [])].filter((one) => !spokenFor.has(one));
      if (candidates.length !== 1) continue;
      device.name = candidates[0] as string;
      device.source = 'screen';
    }
  }
  return out;
}

/**
 * The top row a mode draws, for every mode whose own keys address exactly one device.
 *
 * A device's mode is where its buttons live, so the modes worth looking at are the ones whose pages
 * bind keys that send one group's codes and nothing else. **This is a weak route and the calibration
 * says why**: run against the devices route one already names, the top row is the label on arch 9 and
 * arch 14 and is a command name on arch 8 and arch 12, which draw no title. So it is used only where
 * nothing else reaches, and only when it leaves one candidate.
 */
export function deviceModeTitles(c: Container): Map<number, Set<string>> {
  const out = new Map<number, Set<string>>();
  const sent = infraredGroupsPerList(c);
  const drawn = screenStrings(c, characterMap(c));
  for (const mode of modeRecords(c) ?? []) {
    const reached = new Set<number>();
    for (const page of mode.pages) {
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        if (entry.opcode !== ACTION_LIST_INDEX) continue;
        for (const group of sent.get(entry.operand) ?? []) reached.add(group);
      }
    }
    if (reached.size !== 1) continue;
    const texts = mode.pages.flatMap((page) =>
      drawn.filter(
        (one) =>
          one.program === page.program && one.text.trim().length >= SHORTEST_USEFUL_LABEL,
      ),
    );
    if (texts.length === 0) continue;
    const top = Math.min(...texts.map((one) => one.y));
    const group = [...reached][0] as number;
    const acc = out.get(group) ?? new Set<string>();
    for (const one of texts) if (one.y === top) acc.add(one.text.trim());
    out.set(group, acc);
  }
  return out;
}

/** One infrared code: which device it goes to, and which of that device's codes it is. */
export interface InfraredCode {
  /** Index into base slot 5's group array, so the device. */
  group: number;
  /** Index into that group's own record array. */
  code: number;
}

/**
 * Which codes each base slot 10 action list sends, in the order it sends them.
 *
 * `0x7D` is the only instruction that names a device, section 33, so this is the whole of it, plus
 * `0x7F` because a list may hand the work to another. **Order is kept** because a list is a macro: an
 * activity's start sends several codes and which comes first is part of what it does.
 *
 * Shared rather than derived twice. `devices` uses it to tie a state variable to a group,
 * `deviceModeTitles` to tie a screen to one, `activities` to say which devices an activity drives and
 * `keyCodes` to say what a button sends. Two copies of one walk is the state that precedes two
 * diverging ones.
 *
 * A list that sends nothing is absent rather than empty, so a caller can tell "sends no codes" from
 * "no such list".
 */
export function infraredCodesPerList(c: Container): Map<number, InfraredCode[]> {
  const lists = c.actionLists();
  const out = new Map<number, InfraredCode[]>();
  if (lists === undefined) return out;
  // Each list gets its own walk with its own visited set. **Not a shared cache**: a nested walk stops
  // at whatever the outer one had already visited, so its answer is only correct in that context, and
  // memoising it would let a list inherit a truncated result from whoever reached it first. That is
  // the bug of section 126, which only arch 14 could show, because its send sits one list down.
  const walk = (index: number, seen: Set<number>): InfraredCode[] => {
    const found: InfraredCode[] = [];
    if (seen.has(index) || lists[index] === undefined) return found;
    seen.add(index);
    for (const instruction of lists[index] as { opcode: number; operand: number }[]) {
      if (instruction.opcode === SEND_INFRARED) {
        found.push({
          group: instruction.operand >> INFRARED_GROUP_SHIFT,
          code: instruction.operand & 0xff,
        });
      } else if (instruction.opcode === ACTION_LIST_INDEX) {
        found.push(...walk(instruction.operand, seen));
      }
    }
    return found;
  };
  lists.forEach((_, index) => {
    const found = walk(index, new Set());
    if (found.length > 0) out.set(index, found);
  });
  return out;
}

/** The same, reduced to the set of devices each list talks to. */
export function infraredGroupsPerList(c: Container): Map<number, Set<number>> {
  const out = new Map<number, Set<number>>();
  for (const [index, codes] of infraredCodesPerList(c)) {
    out.set(index, new Set(codes.map((one) => one.group)));
  }
  return out;
}

/** What a button does: the codes it sends, in order, and where it is. */
export interface KeyCode {
  /**
   * Which kind of tagged list the binding is in.
   *
   * **Both matter and for a while this only had the first.** A `page` binding belongs to a screen,
   * which is where a soft key lives. A `set` binding belongs to a base slot 9 handler set, which is
   * the key map an activity installs, and that is where the hard keys are: the volume keys of the
   * bench Harmony One are in its activities' sets and in no mode page at all.
   */
  where: 'page' | 'set';
  /** Index into `modePages` or into base slot 9's addresses, according to `where`. */
  index: number;
  /** The tagged list's key code: an event type in `0xC0` and a scan code in `0x3F`. Section 17. */
  tag: number;
  /**
   * The event type: 0 none, 1 release, 2 press, 3 repeat.
   *
   * **A code sending binding is a press, with seventeen exceptions in the corpus and they are all
   * type 0**, tags 1, 2 and 5 in a base slot 9 set, which are that set's enter and leave handlers
   * rather than keys at all. Nothing sends a code on a release or on a repeat, anywhere.
   */
  event: number;
  /** The scan code alone. Only a key when `event` is not 0. */
  scan: number;
  /** The codes the binding sends, in the order the action list sends them. */
  codes: InfraredCode[];
}

/**
 * Every button binding in the config that sends infrared, and what it sends.
 *
 * This is the button map an interface shows for a device or for a running activity, and it is the last
 * hop of section 126: a page's tagged list binds a key to a base slot 10 list and the list's `0x7D`
 * instructions name the device and the code. **A binding may send several**, 85 of 3106 across the
 * corpus, which is a macro and why the order is kept.
 *
 * Two properties hold on every container here and both are worth knowing before building on this.
 * **A code is sent on the press**, 4431 of 4448 bindings, and the seventeen that are not are event type
 * 0 in a base slot 9 set, tags 1, 2 and 5, which are its enter and leave handlers rather than keys.
 * Nothing sends a code on a release or on a repeat. And most bindings send nothing at all, because
 * navigation and screen switching are bindings too.
 *
 * **A code carries no name of its own**, since an infrared record is a stream of durations and an index
 * in its group, so a label for a button comes from the screen where a screen draws one. This used to
 * end "and from nowhere for a hard key"<!--superseded-->, and section 133 is where that stopped being
 * true: the durations decode back into the bit frame the device sees, `irframe.ts`, and a frame can be
 * matched against a catalogue of named commands. Thirty two buttons of a Harmony One and thirty six of
 * a Harmony 600 are named in `reference/button-maps.md` that way, with nothing written anywhere.
 *
 * **That route is not available from inside this function**, which is why the return value still has a
 * number and no name: it needs the catalogue and the button maps of the account that generated the
 * config, so it works on a config we had made and not on one somebody contributed.
 */
export function keyCodes(c: Container): KeyCode[] {
  const codes = infraredCodesPerList(c);
  const out: KeyCode[] = [];
  const collect = (where: 'page' | 'set', index: number, list: number): void => {
    for (const entry of taggedList(c, list)?.entries ?? []) {
      if (entry.opcode !== ACTION_LIST_INDEX) continue;
      const sent = codes.get(entry.operand);
      if (sent === undefined) continue;
      out.push({
        where,
        index,
        tag: entry.tag,
        event: entry.tag >> KEY_EVENT_SHIFT,
        scan: entry.tag & SCAN_CODE_MASK,
        codes: sent,
      });
    }
  };
  modePages(c).forEach((page, index) => collect('page', index, page.list));
  (handlerSets(c)?.addresses ?? []).forEach((address, index) => collect('set', index, address));
  return out;
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

/** Everything an interface needs to show a config, in one object. */
export interface Inventory {
  /** The architecture the config states, section 20, which is the only place it says so. */
  architecture?: number;
  /** When the config was built, from base slot 3. On arch 12 this is also what the clock is set to. */
  builtAt?: string;
  devices: Device[];
  activities: Activity[];
  /** The value `CurrentActivityState` holds when no activity is running. */
  idle?: number;
}

/**
 * The state variables the firmware owns, by index, section 130.
 *
 * **Not a guess from their ranges**: every one of them is `first` equal to the corresponding field of
 * the config's own build timestamp, in all 21 containers of the corpus, with `second` equal to the
 * field's maximum. Section 74 had already read three of them out of the action list language, where
 * opcode `0x07` band `0xF8` steps a date held in variables 3, 5 and 6, and this says which is which
 * and adds the other four.
 *
 * The weekday's zero is a Saturday, which is not a convention picked to make the numbers fit: base slot
 * 3's own day of week byte is days since 1 January 2000 modulo 7, section 21, and that day was a
 * Saturday. Two records, two encodings, one epoch.
 *
 * **A writer must stamp these, not copy them**, the same rail as base slot 3's timestamp, section 111.
 * A config carried over with its old values sets the remote's clock to the moment the old config was
 * generated.
 *
 * **The clock is not read out of base slot 3 at all**, section 138: the firmware seeds state variable `n`
 * from record `n`'s `first`, and on arch 12 variable `n` lives at RAM `0x108 + n`, so the clock at
 * `0x108` to `0x10E` **is** records 0 to 6. Base slot 3 is the epoch it subtracts against to work out how
 * long ago the config was built. The rail does not move, because both records get stamped by a save.
 *
 * **The block runs to 12 and not to 6.** Indices 7 to 12 carry exactly one `first`/`second` pair per
 * architecture across all 21 containers and base slot 0 names none of them, and four of their maxima
 * agree with bytes measured on a connected Harmony One by a route with no shared code. They are listed
 * here so that a writer refuses to reuse them; the ones with a meaning say which architecture it was read
 * on, because arch 9 states different maxima for the same indices and nothing establishes that it puts
 * the same things there.
 */
export const FIRMWARE_STATE_VARIABLES: Readonly<Record<number, string>> = {
  0: 'second',
  1: 'minute',
  2: 'hour',
  3: 'day of the month',
  4: 'day of the week, where 0 is a Saturday',
  5: 'month, zero based',
  6: 'year since 2000',
  // Firmware owned by the same evidence as the clock, fixed per architecture and named by no config.
  // Sections 111 and 103 measured 8, 9, 10 and 11 on a Harmony One and read their level counts out of
  // the firmware, which is where the meanings come from and why they carry that scope.
  7: 'firmware reserved, meaning unread',
  8: 'display light band on arch 12, four levels',
  9: 'battery gauge on arch 12, eight levels',
  10: 'saved display light state on arch 12',
  11: 'cached display light level on arch 12',
  12: 'firmware reserved, meaning unread',
};

/**
 * The highest index the firmware owns, so a writer can refuse the whole block in one test.
 *
 * Section 138. Thirteen, not seven: index 13 is where variation inside an architecture starts and where
 * two configs name a variable through base slot 0, which is the boundary rather than a chosen cut.
 */
export const FIRMWARE_STATE_VARIABLE_MAX = 12;

/**
 * A screen variant's conditions in words, one per branch the program took.
 *
 * **The name is the point.** A variant is a list of switch arms, and "arm 1 of 2 at state 35" tells a
 * person nothing, while `PS3_Power = 1` tells them exactly when the screen looks like that. Base slot 0
 * names the state variables, section 77, so the two readings meet here.
 *
 * Only some variables are named: `one_config` has 46 base slot 13 records and 12 names, so an unnamed
 * one is shown by its index rather than invented. That is the same rule `VERSION_FIELDS` follows in the
 * bench instrument, and for the same reason.
 */
export function describeChoices(c: Container, choices: readonly ScreenChoice[]): string[] {
  const names = new Map(stateVariables(c).map((one) => [one.index, one.label]));
  return choices.map((choice) => {
    const name = names.get(choice.variable)
      ?? FIRMWARE_STATE_VARIABLES[choice.variable]
      ?? `state variable ${choice.variable}`;
    const when = choice.value !== undefined
      ? `= ${choice.value}`
      : `in ${choice.from} to ${choice.to}`;
    return `${name} ${when}`;
  });
}

/**
 * The whole inventory of a config, composed.
 *
 * **Here so that a caller does not have to know the order.** Naming a device needs the infrared groups,
 * the state variables, the action lists and, for three devices in the corpus, the screen text; naming an
 * activity needs the touch hit map on arch 12 and the modes elsewhere. An application that assembled
 * that itself would be a second copy of the composition, and the first thing to drift.
 */
export function inventory(c: Container): Inventory {
  const out: Inventory = { devices: devices(c), activities: activities(c) };
  if (c.architecture !== undefined) out.architecture = c.architecture;
  if (c.builtAt !== undefined) out.builtAt = c.builtAt;
  const idle = idleActivityValue(c);
  if (idle !== undefined) out.idle = idle;
  return out;
}

/**
 * The scan codes this config's screens label, meaning its soft keys.
 *
 * **Derived rather than tabulated**, section 128, because the container states it: a mode page's tagged
 * list belongs to a screen, so a scan bound there is a key that screen labels, and a base slot 9 set
 * belongs to a running activity, so a scan bound there is a key on the keypad. The closure is that the
 * two are **disjoint**: across the corpus arch 9 (Harmony 525), arch 12 (Harmony One) and arch 14
 * (Harmony 600 and 700) share not one scan between the two, and arch 8 (Harmony 880) shares exactly
 * one. The census is 8 scans on arch 8, 5 on arch 9, 8 on arch 12 and 4 on arch 14, and it is per
 * architecture rather than per config: six arch 8 configs agree exactly, as do four arch 12 ones and
 * three arch 14 ones. Two independent agreements, both partial and both worth having: arch 12's eight
 * are section 125's touch codes bar the two side keys, and arch 9's include the four that
 * `reference/silhouettes/h525.svg` narrows its soft keys to by a route through the firmware.
 */
export function softKeyScans(c: Container): number[] {
  const found = new Set<number>();
  for (const scans of pageScans(c)) for (const scan of scans) found.add(scan);
  return [...found].sort((a, b) => a - b);
}

/**
 * The scan codes each mode page binds, in page order, whatever the binding does.
 *
 * **Not the same population as `keyCodes`**, and the difference has bitten twice: `keyCodes` only
 * reports a binding that ends in an infrared code, so a key that starts an activity or opens another
 * menu is absent from it. Anything asking "which pages are there and what do they bind" wants this,
 * or it silently loses every activity page. Section 129.
 */
export function pageScans(c: Container): number[][] {
  return modePages(c).map((page) => {
    const found = new Set<number>();
    for (const entry of taggedList(c, page.list)?.entries ?? []) {
      if (entry.opcode === ACTION_LIST_INDEX) found.add(entry.tag & SCAN_CODE_MASK);
    }
    return [...found].sort((a, b) => a - b);
  });
}

/**
 * A screen row: the two keys beside it, and the band of pixel rows its label is drawn in.
 *
 * **Measured, not laid out by eye**, section 128. Every architecture but arch 12 (Harmony One) puts its
 * soft keys in two columns down the side of the screen, and the row a key belongs to is fixed by the
 * hardware rather than stated by the config. The bands come from where the labels of activities are
 * actually drawn, which section 121 attributes without using geometry at all: on arch 8 (Harmony 880)
 * four rows at pixel 42, 74, 106 and 138, on arch 14 (Harmony 600 and 700) two at 35 and 79, and on
 * arch 9 (Harmony 525) two at 13 and 35. An item may wrap onto a second line, so a band is roughly a
 * row and a half rather than a line.
 *
 * **Which key is the left one is settled per architecture and not assumed.** On arch 8 the activity
 * route names all eight keys of one page, four at x 3 and four at x 70 to 97, so the left column is
 * `5, 6, 7, 8`. On arch 9 the same route names three keys, and it puts the **larger** scan of each pair
 * on the left, so the 525's left column is the odd one; that also answers what
 * `reference/silhouettes/h525.svg` deliberately left open, which of matrix columns 6 and 7 is the left.
 * On arch 14 the route only ever names centred labels, so the side comes from behaviour instead: the
 * help screens draw "No" at x 5 and "Yes" at x 97, and scan 9's action list is the one that differs per
 * screen while scan 34's is identical on all of them, which is what a retry and a finish look like.
 */
export interface ScreenRow {
  left: number;
  right: number;
  /** Pixel rows `[from, to)`, which is where this row's label and its wrapped continuation are drawn. */
  from: number;
  to: number;
}

export const SCREEN_ROWS: Readonly<Record<number, readonly ScreenRow[]>> = {
  8: [
    { left: 5, right: 45, from: 36, to: 62 },
    { left: 6, right: 46, from: 68, to: 94 },
    { left: 7, right: 48, from: 100, to: 126 },
    { left: 8, right: 44, from: 132, to: 158 },
  ],
  9: [
    { left: 39, right: 38, from: 8, to: 30 },
    { left: 31, right: 30, from: 30, to: 52 },
  ],
  14: [
    { left: 2, right: 8, from: 29, to: 55 },
    { left: 9, right: 34, from: 73, to: 99 },
  ],
};

/**
 * The gap in pixels that separates the two columns of a row from one wrapped label's own indentation.
 *
 * A row holds either one item across the screen or one per column, and the two cases have to be told
 * apart from the drawing: 24 pixels is comfortably above the few pixels a second line is indented by
 * and comfortably below the 50 to 90 that separate two columns in every sample here.
 */
const COLUMN_GAP = 24;

/**
 * How far below a label's line its wrapped continuation can start, in pixels.
 *
 * A band is wide enough to hold a two line label and that means it is also wide enough to catch a line
 * of something else. The two are told apart by the line pitch: a continuation sits one text line below
 * its own first line, 11 pixels on arch 9 (Harmony 525) and 14 on arch 8 (Harmony 880) and arch 14
 * (Harmony 600 and 700), where the menu footers that share these bands sit 19 or more below. Four of
 * the five labels that disagreed with the activity route before this test were a footer's first line
 * joined onto an item's name.
 */
const LINE_GAP = 16;

/** A drawn label attributed to a button. */
export interface KeyLabel {
  /** Index into `modePages`. Only a page binding can have a label; a set binding is a hard key. */
  index: number;
  scan: number;
  /** The text, with a wrapped label's rows joined by a space. */
  text: string;
  /**
   * How it was attributed, and the two are not equally strong.
   *
   * `touch` is stated: base slot 17 gives the key's rectangle and the label is the text inside it, so
   * it exists on arch 12 (Harmony One) alone. `row` is `SCREEN_ROWS`, whose band is measured and whose
   * side is established per architecture, so it is a reading of the hardware's layout rather than of
   * the config. Neither is the chain of section 121, which names an activity's key without geometry of
   * any kind: that is `activityNames`, and it is what these two are calibrated against rather than a
   * third route here, since it agrees with them on 62 of the 63 keys where both have an opinion.
   */
  source: 'touch' | 'row';
}

/** Reading order: down the screen, then across it. */
function inReadingOrder(a: ScreenString, b: ScreenString): number {
  return a.y === b.y ? a.x - b.x : a.y - b.y;
}

/**
 * The label drawn for each button that a screen labels, keyed by `<page>:<scan>`.
 *
 * This is what turns "device 0, code 29" into a word on a page, and there is no other source for it:
 * an infrared record has no name, section 126, so a button's name is the text beside it or nothing.
 *
 * **A label is attributed to the nearest region, not to the first one that contains it.**
 * `touchOwner` implements the firmware's rule, which is the first rectangle containing the point, and
 * that is right for a touch and wrong for a label: a label's `x` is where its first glyph starts, so a
 * long string in the right hand column starts inside the left hand rectangle where the two overlap.
 * Nearest centre fixes seven labels in `one_config` that first match put on the wrong key, and it is
 * the same seven either way, since a region a label is wholly inside is also the nearest.
 *
 * **Off arch 12 the route is `SCREEN_ROWS`**, and the rule it replaced is worth stating because it fits
 * the counts and is wrong: the k-th soft key in ascending scan order taking the k-th row of text from
 * the top. On the 600's own activity menu that pairs four keys with four rows perfectly and gets two of
 * them wrong, because scans 2 and 8 both belong to the first row and 9 and 34 both to the second, while
 * the outer two rows of text are a title and a footer. A key belongs to a **place** on the screen, and
 * the places are two columns of rows, so that is what is measured.
 */
/**
 * Which label owns which infrared group, given what each device variable reaches.
 *
 * Extracted from `devices` so the refusal below has a caller that can reach it: no container in the
 * corpus contests a group, 0 in nineteen, so the branch is unreachable through `devices` and a rail
 * nobody can trigger is a rail nobody has tested. Same move as `eraseBoundsFor` in `packages/usb`.
 *
 * **A contested group names nobody, and it is not "left over" either.** The rule used to be a bare
 * `continue`, which kept the group for the first label and left the second **free**, so the forced
 * pairing in `devices` could hand that label an unrelated leftover group and return it as
 * `source: 'elimination'`. That reads as a weaker but real answer where the evidence in fact
 * contradicts itself, and it is where a wrong device name would reach FreeHarmony. So both the
 * label and the group are withdrawn, and `contested` is what keeps the group out of the free pool.
 * Section 139.
 */
export function pairLabelsToGroups(
  reaches: readonly { label: string; group: number }[],
): { named: Map<string, number>; contested: Set<number> } {
  const named = new Map<string, number>();
  const contested = new Set<number>();
  for (const { label, group } of reaches) {
    const already = named.get(label);
    // Two variables of one device must agree, and two devices must not claim one group.
    if (already !== undefined && already !== group) continue;
    if (already === undefined && [...named.values()].includes(group)) {
      contested.add(group);
      continue;
    }
    named.set(label, group);
  }
  for (const group of contested) {
    for (const [label, mine] of [...named]) if (mine === group) named.delete(label);
  }
  return { named, contested };
}

/**
 * The scan codes one mode page binds, which is the population both label routes answer for.
 *
 * One derivation rather than two: the row route computed it and the touch route did not, which is
 * how the touch route came to label keys a page has not got. Section 139.
 */
function boundScans(c: Container, page: ModePage): Set<number> {
  return new Set(
    (taggedList(c, page.list)?.entries ?? [])
      .filter((entry) => entry.opcode === ACTION_LIST_INDEX)
      .map((entry) => entry.tag & SCAN_CODE_MASK),
  );
}

export function keyLabels(c: Container): Map<string, KeyLabel> {
  const out = new Map<string, KeyLabel>();
  const pages = modePages(c);
  const map = characterMap(c);
  const drawn = screenStrings(c, map);
  pages.forEach((page, index) => {
    const texts = drawn
      .filter((one) => one.program === page.program && one.text.trim().length > 0)
      .sort(inReadingOrder);
    if (texts.length === 0) return;
    const areas = touchPageOf(c, page)?.areas;
    if (areas === undefined || areas.length === 0) return;
    // **Only scans this page actually binds**, which the row route below has always required and
    // this one did not: a region holding text got a label whether or not the page has a key there.
    // 292 of `one_config`'s 1103 entries named a scan its page does not bind. Inert for the bench,
    // which looks up by bound scan, and not inert for a consumer that **iterates** the map, which
    // is what a `Map` invites: it would get labels for keys that page has not got. Section 139.
    const bound = boundScans(c, page);
    if (bound.size === 0) return;
    // The stated route. Group the page's strings by the region each belongs to, then join the strings
    // of one region in reading order, which is what a label wrapped onto a second line is.
    const perArea = new Map<number, ScreenString[]>();
    for (const one of texts) {
      const inside = areas.filter((area) => panelInside(area, one));
      const nearest = nearestArea(inside, one);
      if (nearest === undefined) continue;
      const acc = perArea.get(nearest.code) ?? [];
      acc.push(one);
      perArea.set(nearest.code, acc);
    }
    for (const [scan, found] of perArea) {
      if (!bound.has(scan)) continue;
      out.set(`${index}:${scan}`, {
        index,
        scan,
        text: found.map((one) => one.text.trim()).join(' '),
        source: 'touch',
      });
    }
  });
  // The row route, for every architecture whose keys sit beside the screen rather than on it. A row's
  // band is read for the text it holds, which is split into columns only where there is a real gap,
  // since a label wrapped onto a second line is indented by a few pixels and a second column is not.
  const rows = SCREEN_ROWS[c.architecture ?? -1] ?? [];
  if (rows.length > 0) {
    pages.forEach((page, index) => {
      const bound = boundScans(c, page);
      if (bound.size === 0) return;
      const texts = distinct(drawn.filter((one) => one.program === page.program
        && one.text.trim().length > 0));
      for (const row of rows) {
        if (!bound.has(row.left) && !bound.has(row.right)) continue;
        const on = texts.filter((one) => one.y >= row.from && one.y < row.to).sort(inReadingOrder);
        if (on.length === 0) continue;
        const columns = byColumn(on);
        // One item across the row belongs to both its keys, since either of them chooses it. Two items
        // belong to one key each, and that is the only place the side of the row matters.
        const [first, second] = columns.map(contiguous);
        for (const [scan, found] of [[row.left, first], [row.right, second ?? first]] as const) {
          if (!bound.has(scan) || found === undefined || found.length === 0) continue;
          const key = `${index}:${scan}`;
          if (out.has(key)) continue;
          out.set(key, {
            index,
            scan,
            text: found.map((one) => one.text.trim()).join(' '),
            source: 'row',
          });
        }
      }
    });
  }
  return out;
}

/**
 * A column's lines from its first one down, stopping at the first line that is too far below the last.
 *
 * This is what keeps a menu's footer out of the bottom row's label: a wrapped second line is one text
 * line below, a footer is a line and a half or more.
 */
function contiguous(on: readonly ScreenString[]): ScreenString[] {
  const out: ScreenString[] = [];
  for (const one of on) {
    const last = out[out.length - 1];
    if (last !== undefined && one.y - last.y > LINE_GAP) break;
    out.push(one);
  }
  return out;
}

/** The same string drawn twice at the same place is one label, which is what a page's copies are. */
function distinct(texts: readonly ScreenString[]): ScreenString[] {
  const seen = new Set<string>();
  return texts.filter((one) => {
    const key = `${one.x}:${one.y}:${one.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * A row's strings split into its columns, in reading order, one entry per column.
 *
 * The split is the widest gap between adjacent x positions, taken only if it is at least `COLUMN_GAP`,
 * so a two line label whose second line starts a few pixels in stays one item and a left and a right
 * item do not. A row never holds three, which is why this returns one entry or two.
 */
function byColumn(on: readonly ScreenString[]): ScreenString[][] {
  const xs = [...new Set(on.map((one) => one.x))].sort((a, b) => a - b);
  let at = -1;
  let widest = 0;
  for (let i = 1; i < xs.length; i += 1) {
    const gap = (xs[i] as number) - (xs[i - 1] as number);
    if (gap <= widest) continue;
    widest = gap;
    at = i;
  }
  if (widest < COLUMN_GAP || at < 0) return [[...on]];
  const split = xs[at] as number;
  return [on.filter((one) => one.x < split), on.filter((one) => one.x >= split)];
}

/** Whether a drawn string's own start point is inside a rectangle, in panel coordinates. */
function panelInside(area: TouchArea, one: ScreenString): boolean {
  const point = panelPoint(one.x, one.y);
  return (
    point.x >= area.x &&
    point.x < area.x + area.width &&
    point.y >= area.y &&
    point.y < area.y + area.height
  );
}

/** Of the rectangles a point is inside, the one whose centre is closest to it. */
function nearestArea(areas: readonly TouchArea[], one: ScreenString): TouchArea | undefined {
  const point = panelPoint(one.x, one.y);
  let best: TouchArea | undefined;
  let bestDistance = Infinity;
  for (const area of areas) {
    const dx = area.x + area.width / 2 - point.x;
    const dy = area.y + area.height / 2 - point.y;
    const distance = dx * dx + dy * dy;
    if (distance >= bestDistance) continue;
    bestDistance = distance;
    best = area;
  }
  return best;
}

/**
 * The four delay properties a device carries, as base slot 0 spells them.
 *
 * There are eight variables per device and only these four hold a duration. The other four are
 * `PowerOnDelayFlagCounter`, `PowerOnDelayFixingTriggered` and their inter device twins, whose
 * highest values are 5 and 100: a counter and a flag belonging to whatever the remote does when a
 * delay turns out to be too short. Nothing here reads them.
 */
const DELAY_PROPERTIES = [
  'PowerOnDelay',
  'DefaultPowerOnDelay',
  'InterDeviceDelay',
  'DefaultInterDeviceDelay',
] as const;

/** A state variable whose name is `<property>_<device identifier>`, split into the two. */
const DELAY_NAME = new RegExp(`^(${DELAY_PROPERTIES.join('|')})_([0-9]+)$`);

/**
 * The exact string the page that resets a device's delays draws, in the middle of the screen.
 *
 * **English, and that is a real limitation rather than an oversight.** Every container in the
 * corpus was generated in English, so nothing here can say what the German build draws. A config
 * whose screen says something else loses the join below and keeps everything else, which is why the
 * join is a separate function from the delays themselves.
 */
const DELAY_DEFAULT_LABEL = 'Set to default';

/** How long a device makes the remote wait, in tenths of a second, and which device it is. */
export interface DeviceDelays {
  /** The infrared group, which is what identifies a device everywhere else in this codec. */
  group: number;
  /** The device's own label, as `devices` gives it, underscores and all. */
  name: string;
  /**
   * Where the number was read, because the two architectures keep it in unrelated places and a
   * caller that wants to **change** one has to know which.
   *
   * `variable` is arch 14 (Harmony 600 and 700): a state variable in base slot 13 whose name carries
   * Logitech's device identifier. `instruction` is arch 8, 9 and 12 (Harmony 880 and 885, Harmony
   * 525, Harmony One): a `0x7C` inline in the action list that switches the device on. Section 235.
   */
  source: 'variable' | 'instruction';
  /** Tenths of a second between switching the device on and sending it anything. */
  powerOn: number;
  /**
   * Logitech's numeric identifier for the device. **Arch 14 only**, since it is the variable's name
   * that carries it and the other architectures have no variable.
   */
  id?: number;
  /** What the remote's own "set to default" page would put back into `powerOn`. Arch 14 only. */
  defaultPowerOn?: number;
  /**
   * Tenths of a second between two codes when the second goes to a different device. **Arch 14
   * only**, and its absence elsewhere is honest rather than settled: where arch 8, 9 and 12 keep
   * this, if they keep it at all, is open.
   */
  interDevice?: number;
  /** What that page would put back into `interDevice`. Arch 14 only. */
  defaultInterDevice?: number;
}

/**
 * The base slot 13 property whose transitions switch a device on and off.
 *
 * `deviceVariables` splits a level 1 name into a device and a property, so this is that property's
 * spelling rather than a suffix match on the whole name.
 */
const POWER_PROPERTY = 'Power';

/** The transition that switches a device on: its off value to its on value. */
const POWER_OFF = 0;
const POWER_ON = 1;

/**
 * Which of Logitech's device identifiers belongs to each infrared group, read off the screen.
 *
 * **Two vocabularies name a device and base slot 0 joins neither to the other.** A device's
 * buttons and its infrared group are reached through an ASCII **label**, `TV_Power_2`, which is
 * what `devices` returns. Its delays are held in variables named after a numeric **identifier**,
 * `PowerOnDelay_<identifier>`, an eight digit number that is Logitech's own key for the device on
 * the account. The name tree
 * is flat: level 1 holds both kinds of name side by side and nothing relates them.
 *
 * The screen relates them. The remote has a page per device offering to put that device's delays
 * back to their defaults, and it is the one place where a device's drawn name and its identifier
 * meet: the page draws the label in its title row, and its action list copies
 * `DefaultPowerOnDelay_<id>` into `PowerOnDelay_<id>` and the same for the inter device pair. So
 * the title says which device the user thinks they are looking at and the instructions say which
 * device the remote will change.
 *
 * Two details the corpus forced and neither was guessable:
 *
 * 1. **The drawn title is truncated to fit**, `Panasonic Blu-ray Pl..`, so a title ending in two
 *    dots matches a label it is a prefix of, and only when exactly one label matches.
 * 2. **An underscore in a label is a space on the screen**, because the underscore is base slot 0's
 *    own separator: `A/V_Switch` is drawn `A/V Switch`.
 *
 * 19 of 19 devices across the four arch 14 containers that carry delay variables, ids distinct, and
 * three of those devices were chosen by us before the config was compiled. Section 234.
 */
export function deviceIdOfGroup(c: Container): Map<number, number> {
  const out = new Map<number, number>();
  const lists = c.actionLists();
  const byIndex = new Map(stateVariables(c).map((one) => [one.index, one]));
  if (lists === undefined) return out;

  // Every state variable a page's chain writes with `0x1F` sub opcode `0xEE`. The read side,
  // `0xF0`, names the same device on every page in the corpus and is checked below rather than
  // matched here, so a page that copied across devices would be dropped instead of believed.
  const walk = (index: number, seen: Set<number>, taken: Set<number>): void => {
    const list = lists[index];
    if (list === undefined || seen.has(index)) return;
    seen.add(index);
    for (const instruction of list) {
      if (instruction.opcode === STATE_BAND) {
        const sub = instruction.operand >>> 8;
        if (sub === STATE_FROM_BYTE_REGISTER || sub === BYTE_REGISTER_FROM_STATE) {
          taken.add(instruction.operand & 0xff);
        }
      } else if (instruction.opcode === ACTION_LIST_INDEX) {
        walk(instruction.operand, seen, taken);
      }
    }
  };

  const drawn = screenStrings(c, characterMap(c));
  const titles = new Map<string, number>();
  for (const page of modePages(c)) {
    const texts = drawn.filter((one) => one.program === page.program);
    if (!texts.some((one) => one.text.trim() === DELAY_DEFAULT_LABEL)) continue;
    const top = Math.min(...texts.map((one) => one.y));
    const title = texts.filter((one) => one.y === top).map((one) => one.text.trim()).join(' ');
    const touched = new Set<number>();
    for (const entry of taggedList(c, page.list)?.entries ?? []) {
      if (entry.opcode === ACTION_LIST_INDEX) walk(entry.operand, new Set(), touched);
    }
    const ids = new Set(
      [...touched].flatMap((one) => {
        const id = byIndex.get(one)?.deviceId;
        return id === undefined ? [] : [id];
      }),
    );
    // A page that reaches two devices says nothing, and one that reaches none is some other page
    // that happens to draw the same words.
    if (ids.size === 1) titles.set(title, [...ids][0] as number);
  }

  for (const device of devices(c)) {
    if (device.name === undefined) continue;
    const label = device.name.replaceAll('_', ' ');
    const exact = titles.get(label);
    if (exact !== undefined) {
      out.set(device.group, exact);
      continue;
    }
    const cut = [...titles].filter(
      ([title]) => title.endsWith('..') && label.startsWith(title.slice(0, -2)),
    );
    if (cut.length === 1) out.set(device.group, (cut[0] as [string, number])[1]);
  }
  return out;
}

/**
 * How long each device makes the remote wait, in tenths of a second.
 *
 * **This is the answer to a question that was asked the wrong way round for weeks.** The roadmap
 * carried "which base slot 15 group holds a device's delays" as the last reading before the first<!--superseded-->
 * write that changes something, and base slot 15 holds no such group: its shape and its values are
 * per **model**, identical across containers with 0, 1, 3, 4, 6 and 7 devices, and the two
 * containers that share a device count are the two that share a model. Section 234.
 *
 * The delays are ordinary state variables in base slot 13, eight per device, and the value is the
 * record's `first`, which is both what the generator wrote and what the firmware seeds the running
 * variable from, section 138.
 *
 * **The unit is stated by the config itself**, which is the independent closure: an arch 14 config
 * draws 451 strings reading `( 0 sec )` through `( 45 sec )`, contiguous in tenths with no gap, one
 * per position of the slider the remote offers. So a `first` of 80 is eight seconds and not eighty.
 * The arch 8, 9 and 12 containers draw none of those strings and carry none of these variables.
 *
 * A device with no join to a group is left out rather than reported with a guessed name, because
 * the caller wants a device and half of one is worse than none.
 */
export function deviceDelays(c: Container): DeviceDelays[] {
  const byId = new Map<number, Map<string, number>>();
  for (const variable of stateVariables(c)) {
    const match = DELAY_NAME.exec(variable.label);
    const value = variable.record?.first;
    if (match === null || value === undefined) continue;
    const id = Number(match[2]);
    const acc = byId.get(id) ?? new Map<string, number>();
    acc.set(match[1] as string, value);
    byId.set(id, acc);
  }
  const groups = deviceIdOfGroup(c);
  const inline = powerOnInstructions(c);
  const out: DeviceDelays[] = [];
  for (const device of devices(c)) {
    if (device.name === undefined) continue;
    const id = groups.get(device.group);
    const held = id === undefined ? undefined : byId.get(id);
    // All four or none: a device missing one of them would give a caller a zero it cannot tell
    // from a real zero, and a real zero is what most televisions carry.
    if (id !== undefined && held !== undefined
      && !DELAY_PROPERTIES.some((one) => held.get(one) === undefined)) {
      out.push({
        group: device.group,
        name: device.name,
        source: 'variable',
        id,
        powerOn: held.get('PowerOnDelay') as number,
        defaultPowerOn: held.get('DefaultPowerOnDelay') as number,
        interDevice: held.get('InterDeviceDelay') as number,
        defaultInterDevice: held.get('DefaultInterDeviceDelay') as number,
      });
      continue;
    }
    const at = inline.get(device.group);
    if (at === undefined) continue;
    out.push({
      group: device.group,
      name: device.name,
      source: 'instruction',
      powerOn: at.tenths,
    });
  }
  return out;
}

/** Where a device's power on delay sits when it is an instruction rather than a variable. */
export interface PowerOnInstruction {
  /** The base slot 10 list the device's `Power` variable runs when it goes from off to on. */
  list: number;
  /** Which instruction of that list it is, counting from zero, so a writer can address the byte. */
  at: number;
  /** The delay itself, in tenths of a second, which is the instruction's low byte. */
  tenths: number;
}

/**
 * The `0x7C` that holds each device's power on delay, on the architectures that inline it.
 *
 * **Arch 8, 9 and 12 keep a device's power on delay in the action list rather than in a variable**,
 * and this is where. A device's `Power` variable has a transition from 0 to 1 carrying one action
 * list instruction, section 86; that list sends the power code through a nested list and then, at
 * its own top level, carries exactly one `0x7C` naming the same infrared group. Section 70 read
 * `0x7C` as a per device quantity and left its unit open; it is tenths of a second, section 235.
 *
 * **Top level only, and that is the whole rule.** The nested list that sends the code carries a
 * `0x7C` of its own with the value 1, one per send, and a reader that walked into it would sum the
 * two. Every one of the 57 transitions on those three architectures has exactly one at the top
 * level and every one of the 16 on arch 14 has none, which is a split with no exception either way.
 *
 * The group is not taken on trust: a `0x7C` naming a different group than the device would be some
 * other quantity and is dropped. 56 of 56 agree, the odd one out being a device no route names.
 */
export function powerOnInstructions(c: Container): Map<number, PowerOnInstruction> {
  const out = new Map<number, PowerOnInstruction>();
  const lists = c.actionLists();
  const records = stateRecords(c);
  if (lists === undefined || records === undefined) return out;
  const byLabel = new Map(devices(c).flatMap((one) => (one.name === undefined ? [] : [[one.name, one.group] as const])));
  for (const variable of deviceVariables(c)) {
    if (variable.property !== POWER_PROPERTY) continue;
    const group = byLabel.get(variable.device);
    if (group === undefined) continue;
    for (const value of records[variable.index]?.values ?? []) {
      if (value.opcode !== ACTION_LIST_INDEX) continue;
      if (value.from !== POWER_OFF || value.to !== POWER_ON) continue;
      const held = (lists[value.operand] ?? [])
        .map((one, at) => ({ one, at }))
        .filter(({ one }) => one.opcode === IR_QUANTITY_OPCODE);
      if (held.length !== 1) continue;
      const only = held[0] as { one: { operand: number }; at: number };
      if (only.one.operand >> 8 !== group) continue;
      out.set(group, { list: value.operand, at: only.at, tenths: only.one.operand & 0xff });
    }
  }
  return out;
}

/** The infrared send, the companion of `IR_QUANTITY_OPCODE` and one bit away from it. Section 70. */
const IR_SEND_OPCODE = 0x7d;

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
 * The other two are named by what they do rather than guessed at. Tag 5 exists on the same 92 set
 * entries and re-sends **only** the input commands, with no power change, which is the shape of a
 * "fix it" chain; tag 2 writes state variables and reaches 5 sends in the whole corpus. Neither is
 * read further here, because neither carries a power on delay.
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
          if (value.opcode !== ACTION_LIST_INDEX) continue;
          if (value.to !== instruction.operand) continue;
          walk(value.operand, new Set(), depth + 1);
        }
      } else if (instruction.opcode === IR_SEND_OPCODE) {
        steps.push({ kind: 'send', group: instruction.operand >>> 8, value: instruction.operand & 0xff });
      } else if (instruction.opcode === IR_QUANTITY_OPCODE) {
        steps.push({ kind: 'delay', group: instruction.operand >>> 8, value: instruction.operand & 0xff });
      } else if (instruction.opcode === ACTION_LIST_INDEX) {
        walk(instruction.operand, seen, depth + 1);
      }
    }
  };
  for (const entry of taggedList(c, address)?.entries ?? []) {
    if (entry.opcode !== ACTION_LIST_INDEX) continue;
    if (entry.tag !== ACTIVITY_START_TAG) continue;
    walk(entry.operand, new Set(), 0);
  }
  return steps;
}

/** How deep `activityStartSteps` follows a chain before giving up. */
const WALK_DEPTH = 8;

/** One activity's power on delay for one device, and whether that activity can ever feel it. */
export interface DelayReach {
  /** The value written into `CurrentActivityState`, as `activityBindings` reports it. */
  activity: number;
  /** The device's infrared group. */
  group: number;
  /** Its power on delay, in tenths of a second. */
  tenths: number;
  /**
   * How many further commands this activity sends to that same device after queueing the delay.
   *
   * **Zero means the delay is never felt**, section 236: the queue holds back a command only when an
   * earlier entry names the same group, so a quantity with nothing behind it runs down in the
   * background while other devices carry on.
   */
  laterCommands: number;
}

/**
 * Every activity's power on delay per device, with the thing that decides whether it does anything.
 *
 * **This is section 236's claim in executable form.** The number in the config is not a pause in the
 * start sequence: the firmware's send queue tags every entry with a device and emits a command only
 * when no earlier entry names the same device, so a delay stalls exactly one thing, the next command
 * to its own device. An activity that sends a device its power code and nothing else therefore
 * cannot show that device's delay, however large it is, which is what the hardware measurement of
 * 1 September 2026 found the hard way.
 *
 * Arch 14 (Harmony 600 and 700) keeps a power on delay in a state variable rather than inline, so
 * `powerOnInstructions` is empty there and so is this.
 */
export function powerOnDelayReach(c: Container): DelayReach[] {
  const power = powerOnInstructions(c);
  if (power.size === 0) return [];
  const out: DelayReach[] = [];
  for (const binding of activityBindings(c)) {
    const steps = activityStartSteps(c, binding.set);
    if (steps.length === 0) continue;
    for (const [group, instruction] of power) {
      // The delay itself, identified by its group **and** its value, so the `1` that every send
      // carries alongside it is not mistaken for the power on delay.
      const at = steps.findIndex(
        (step) => step.kind === 'delay' && step.group === group && step.value === instruction.tenths,
      );
      if (at < 0) continue;
      const laterCommands = steps
        .slice(at + 1)
        .filter((step) => step.kind === 'send' && step.group === group).length;
      out.push({ activity: binding.activity, group, tenths: instruction.tenths, laterCommands });
    }
  }
  return out;
}
