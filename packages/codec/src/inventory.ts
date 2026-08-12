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
import { irGroups } from './ir.ts';
import {
  handlerSets,
  modePages,
  modeRecords,
  nameNodes,
  stateRecords,
  taggedList,
} from './sections.ts';
import { characterMap, screenStrings } from './text.ts';
import { touchOwner, touchPageOf } from './touch.ts';
import type { ScreenString } from './text.ts';
import type { StateRecord } from './sections.ts';

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
 * The instruction that writes a state variable: `0x80 | index`, one instruction with a five bit
 * field. Section 73.
 */
const STATE_WRITE_BASE = 0x80;
/** Opcode `0x7F`, whose operand indexes base slot 10. Section 34. */
const ACTION_LIST_INDEX = 0x7f;
/**
 * Opcode `0x1F` with operand `0xFFxx` selects the current binding table entry, the low byte being
 * the index into base slot 9. `docs/config-format.md`, from the register machine's own band.
 */
const SELECT_BINDING_SET = 0x1f;
const SELECT_BINDING_SET_MASK = 0xff00;

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
        scan: entry.tag & 0x3f,
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
 * Where this leaves a gap is stated rather than guessed: on **arch 12** a page with more than one
 * activity resolves nothing, because a One's activity mode does not repeat the name its menu draws, and
 * its scan codes cannot stand in for position either. Three pages of `one_config` bind activities on
 * scans {50,51,52}, {50,48,49} and {48,49} while each draws its labels at the same rows, so no fixed
 * code to row map exists on a touch panel and base slot 17's hit map is what would be needed. The two
 * arch 12 activities that do resolve are single activity configs. Sections 121 and 124.
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

/** The one string on `page` that relates to something the activity's own modes say. */
function resolveLabel(
  c: Container,
  page: number,
  spoken: readonly string[],
  pages: readonly { program: number }[],
  textOf: (program: number) => ScreenString[],
): { name?: string; at?: { x: number; y: number } } {
  const target = pages[page];
  if (target === undefined) return {};
  const useful = spoken.filter((one) => one.trim().length >= SHORTEST_USEFUL_LABEL);
  const hits = textOf(target.program).filter(
    (one) =>
      one.text.trim().length >= SHORTEST_USEFUL_LABEL &&
      useful.some((said) => one.text.includes(said) || said.includes(one.text)),
  );
  // Several draws of one string at one row are one label; several rows are an unresolved case.
  const rows = new Set(hits.map((one) => one.y));
  if (rows.size !== 1) return {};
  const label = hits[0] as ScreenString;
  return { name: label.text, at: { x: label.x, y: label.y } };
}

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
  const named = new Map<string, number>();
  for (const variable of deviceVariables(c)) {
    if (!labels.includes(variable.device)) labels.push(variable.device);
    const reached = new Set<number>();
    for (const value of records?.[variable.index]?.values ?? []) {
      if (value.opcode !== ACTION_LIST_INDEX) continue;
      for (const group of groupsOf(value.operand)) reached.add(group);
    }
    if (reached.size !== 1) continue;
    const group = [...reached][0] as number;
    const already = named.get(variable.device);
    // Two variables of one device must agree, and two devices must not claim one group.
    if (already !== undefined && already !== group) continue;
    if (already === undefined && [...named.values()].includes(group)) continue;
    named.set(variable.device, group);
  }
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
  const freeGroups = out.filter((device) => device.name === undefined);
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

/**
 * Which devices each base slot 10 action list talks to, by infrared group.
 *
 * `0x7D` is the only instruction that names a device, so this is the whole of it, plus `0x7F` because
 * a list may hand the work to another. Shared rather than derived twice: `devices` uses it to tie a
 * state variable to a group and `deviceModeTitles` uses it to tie a screen to one, and two copies of
 * one walk is the state that precedes two diverging ones.
 *
 * A list that reaches nothing is absent rather than empty, so a caller can tell "sends no codes" from
 * "no such list".
 */
export function infraredGroupsPerList(c: Container): Map<number, Set<number>> {
  const lists = c.actionLists();
  const out = new Map<number, Set<number>>();
  if (lists === undefined) return out;
  // Each list gets its own walk with its own visited set. **Not a shared cache**: a nested walk stops
  // at whatever the outer one had already visited, so its answer is only correct in that context, and
  // memoising it would let a list inherit a truncated result from whoever reached it first.
  const walk = (index: number, seen: Set<number>): Set<number> => {
    const found = new Set<number>();
    if (seen.has(index) || lists[index] === undefined) return found;
    seen.add(index);
    for (const instruction of lists[index] as { opcode: number; operand: number }[]) {
      if (instruction.opcode === SEND_INFRARED) {
        found.add(instruction.operand >> INFRARED_GROUP_SHIFT);
      } else if (instruction.opcode === ACTION_LIST_INDEX) {
        for (const group of walk(instruction.operand, seen)) found.add(group);
      }
    }
    return found;
  };
  lists.forEach((_, index) => {
    const found = walk(index, new Set());
    if (found.size > 0) out.set(index, found);
  });
  return out;
}
