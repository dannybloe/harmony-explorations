/**
 * A Harmony One configuration as a person meets it, reduced to names two configurations of one setup share, so that
 * two of them can be compared by what they draw, what every key and touch does and every action list either can run,
 * rather than byte for byte. `todo-compile-one.md` 8.1.5, findings section 436: the test setup composed onto
 * Logitech's compile of two devices against the same setup composed onto our empty One.
 *
 * **Why not the four slot family's `setupView`.** That one names a screen item by the corner its label sits in, and
 * the Harmony One has no corners: its screen is touched, a page's hit map says which key code a touch reports, and a
 * page's list binds that code. It also leaves out what two of our compositions differ in most, the screens no
 * activity or device names (the help, the settings, the firmware's) and everything below a binding. So the One has a
 * view of its own, built from the readers that already read each part: `modeRecords` and `taggedList` for what a
 * screen and a key bind, `touchPageOf` and `touchOwner` for which text a touch area holds, `renderVariants` and
 * `screenStrings` for what a page draws, `stateRecords`, `valueMaps` and `timers` for what runs without a key, and
 * `recordSent` for what a send emits.
 *
 * **What a name is.** Every number a configuration holds is placement: two compiles of one setup share almost no
 * list, mode, variable, map or timer index, section 154. So the view names each thing by something a person could
 * say, in this order:
 *
 * * a device by the name it is given (`deviceNames`, by default the name tree's label with spaces), and a sent
 *   record by the commands whose record is word for word that one (`commandNames`) with its frame and a key of its
 *   blocks, so two records sending one code are one send;
 * * a device's own screen by the device; any other screen by every text it draws, spaces dropped and device names
 *   spelt as above, where no other screen draws the same; where several do, by that and the devices its bindings
 *   send to, by which binding, and then by its place among the ones still alike;
 * * a device list, and anything else, by **where it is first met**: a walk from the configuration's roots (the
 *   firmware's event map, base slot 9's key maps, the number senders and base slot 8's leading list) names a screen,
 *   a variable, a value map, a timer or a program the first time a binding reaches it, by that binding's place. The
 *   walk takes the next thing to describe in the order of its name, never in the order of its index. The roots
 *   themselves are walked in their stored order (base slot 9's sets by index, a key map's entries as stored), so a
 *   thing two roots reach is named by the first; two configurations that behave alike and store their roots alike
 *   name alike. On the test setup's two compositions no name was given to two different things;
 * * an action list by nothing: every list a binding runs is written out where it is run, calls followed, so a list
 *   is compared by what it does and two configurations that share a list differently do not differ.
 *
 * **What a value is.** For a screen page: the texts it draws that nothing covers, with where, over every variant
 * its switches allow (`renderVariants`, twelve at most, a `+` where that cut it); a key of its pixels per variant;
 * the hit map's codes; what its programs queue; and per binding the texts inside the touch area and what it does.
 * For a key map entry, a variable's transitions, a value map's cases and a timer: what it does. A page list's second
 * copy, which no firmware path is known to read (section 69), is described beside its page too, since its lists are
 * its own and `listsReached` counts them. A thing nothing reaches is described as well, so a table entry one
 * configuration keeps and the other does not is seen: a screen by its texts or its role, a variable by its name, a
 * timer or a value map by its content; and what such a thing meets is named after it. So every mode, timer, value
 * map and state variable a configuration holds has an entry, and every list either runs is written out somewhere.
 *
 * **What it does not see.** How long a pause is between two sends beyond the `0x7C` quantity written out, which the
 * firmware's queue decides; a picture other than through the page's pixels; which of two things nothing reaches
 * first meets a third, where both are timers or value maps, follows their indices. Read only: the result is text.
 *
 * The Harmony One alone, the touch family's: the four slot family compares through `families/four-slot/compare.ts`.
 */
import { type Container, BINDING_SLOT, archSlot } from '../../gspm.ts';
import {
  ACTION_LIST_INDEX_OPCODE, type ModeRecord, type TaggedEntry, eventMap, handlerSets, modePages, modeRecords, pageListCopies,
  stateRecords, taggedList,
} from '../../sections.ts';
import { valueMaps } from '../../valuemap.ts';
import { numberSenders, timers } from '../../tables.ts';
import { SCREEN_QUEUE_INSTRUCTION, SCREEN_TABLE_SLOT, reachablePrograms } from '../../screen.ts';
import { screenStrings } from '../../text.ts';
import { renderVariants } from '../../render.ts';
import {
  DEVICE_QUANTITY, ENTER_MODE, MAP_VALUE_OPCODE, RUN_SCREEN_PROGRAM, SEND_INFRARED, activities, deviceModeMaps, devices,
  firmwareStateVariableMax, handlerSetRoles, stateVariables,
} from '../../inventory.ts';
import { STATE_BAND, STATE_WRITE_BASE, stateVariableSite } from '../../actions.ts';
import { contentKey, modeRoles } from '../../screencategories.ts';
import { touchOwner, touchPageOf } from '../../touch.ts';
import { irGroups } from '../../ir.ts';
import { recordSent } from '../../irframe.ts';
import { touchCharacterMap } from './screentexts.ts';

/** A configuration as a person meets it: a name to what is there, `touchView`. */
export type TouchView = Map<string, string>;

export interface TouchViewOptions {
  /** A device's name by its infrared group, where the name tree's label is not the name to compare by. */
  readonly deviceNames?: ReadonlyMap<number, string>;
  /** Each record's command name by group, record for record, so a send is named; by default it is its frame alone. */
  readonly commandNames?: ReadonlyMap<number, readonly string[]>;
}

/** What `touchView` reads and the action lists its walk ran, for a caller holding the walk to another reader. */
export interface TouchViewResult {
  view: TouchView;
  /** Every base slot 10 list a described binding, transition, case or timer runs, through every call. */
  lists: Set<number>;
}

/** One instruction, as the action list readers hand it out. */
interface Instruction { opcode: number; operand: number }

/** How many variants of a page `renderVariants` draws for the view, its own default. */
const VARIANTS = 12;
/** A call nested deeper than this is written as `deep`: no list of the nineteen compiles nests half as far. */
const CALL_DEPTH = 24;
/** The `0x1F` band's sub opcodes that start and cancel a base slot 12 timer by the low byte, section 43. */
const TIMER_START = 0xeb;
const TIMER_CANCEL = 0xea;
/** The `0x1F` band's sub opcodes that name a base slot 9 entry by the low byte: select, push, remove, section 176. */
const SET_SELECT = 0xff;
const SET_PUSH = 0xfe;
const SET_REMOVE = 0xfd;
/** The infrared group a send names is its operand's high byte, the record its low byte, section 33. */
const GROUP_SHIFT = 8;

const hex = (n: number): string => n.toString(16);
const keyOfText = (text: string): string => contentKey(new TextEncoder().encode(text)).slice(0, 8);

/**
 * A Harmony One configuration as a person meets it, `TouchView`, and the lists its walk ran. See the module comment
 * for what a name and a value are.
 */
export function touchView(c: Container, options: TouchViewOptions = {}): TouchViewResult {
  const out: TouchView = new Map();
  const ran = new Set<number>();
  const records = modeRecords(c) ?? [];
  const lists = c.actionLists() ?? [];
  const states = stateRecords(c) ?? [];
  const maps = valueMaps(c) ?? [];
  const timerRecords = timers(c)?.records ?? [];
  const sets = handlerSets(c)?.addresses ?? [];
  const setRoles = handlerSetRoles(c);
  const named = activities(c);
  const architecture = c.architecture as number;
  const programs = c.pointerArray(archSlot(architecture, SCREEN_TABLE_SLOT)) ?? [];
  const groups = irGroups(c) ?? [];
  const roles = modeRoles(c);
  const pages = modePages(c);
  const copies = pageListCopies(c);
  const strings = new Map(screenStrings(c, touchCharacterMap(c)).map((one) => [one.at, one.text]));

  // ---- devices and what they send ----
  const deviceName = new Map<number, string>();
  for (const one of devices(c)) {
    if (one.group === undefined) continue;
    deviceName.set(one.group, options.deviceNames?.get(one.group) ?? (one.name ?? `group ${one.group}`).replaceAll('_', ' '));
  }
  const device = (group: number): string => deviceName.get(group) ?? `group ${group}`;
  // A label as the name tree spells it, and as a screen draws it with its spaces dropped, to the name compared by.
  // Longest label first, so a label another begins with, `LG_TV` beside `LG_TV_2`, does not take the longer one's
  // texts and variables.
  const labels = new Map<string, string>();
  for (const one of [...devices(c)].sort((x, y) => (y.name?.length ?? 0) - (x.name?.length ?? 0))) {
    if (one.group === undefined || one.name === undefined) continue;
    labels.set(one.name, device(one.group));
  }
  /** What a record sends: the commands holding word for word that record, its frame, and a key of its blocks. */
  const sent = new Map<number, string[]>();
  groups.forEach((group, g) => {
    const byStored = new Map<string, string[]>();
    const each = group.addresses.map((address, r) => {
      const { frame, stored } = recordSent(c, address);
      const name = options.commandNames?.get(g)?.[r];
      if (name !== undefined) byStored.set(stored, [...(byStored.get(stored) ?? []), name]);
      return { frame, stored };
    });
    sent.set(g, each.map(({ frame, stored }) => {
      const names = [...new Set(byStored.get(stored) ?? [])].sort().join('/');
      return `${names === '' ? '' : `${names} `}${frame} r${keyOfText(stored)}`;
    }));
  });
  const send = (operand: number): string => {
    const g = operand >> GROUP_SHIFT;
    return `send ${device(g)} ${sent.get(g)?.[operand & 0xff] ?? `record ${operand & 0xff} missing`}`;
  };

  // ---- the screens' names ----
  const screenName = new Map<number, string>();
  for (const map of deviceModeMaps(c)) screenName.set(map.mode, `device ${device(map.group)}`);
  const squeeze = (text: string): string => {
    let t = text.replace(/\s+/g, '');
    for (const [label, name] of labels) t = t.replaceAll(label.replaceAll('_', ''), name.replace(/\s+/g, ''));
    return t;
  };
  // Every text a mode's pages draw, in the order the programs are walked, which is structure and not placement.
  const textOf = records.map((record) => squeeze([...reachablePrograms(c, record.pages.map((page) => page.program)).values()]
    .flat().map((one) => strings.get(one.start) ?? '').join('')));
  /** The devices a mode's bindings send to, by which binding, through every call: what tells alike screens apart. */
  const sendsOf = (record: ModeRecord): string => {
    const found = new Set<string>();
    const walk = (one: Instruction, where: string, seen: Set<number>): void => {
      if (one.opcode === ACTION_LIST_INDEX_OPCODE) {
        if (seen.has(one.operand)) return;
        seen.add(one.operand);
        for (const inner of lists[one.operand] ?? []) walk(inner, where, seen);
      } else if (one.opcode === SEND_INFRARED) found.add(`${where} ${device(one.operand >> GROUP_SHIFT)}`);
    };
    for (const entry of record.entries) walk(entry, 'key', new Set());
    for (const page of record.pages) for (const entry of taggedList(c, page.list)?.entries ?? []) walk(entry, 'touch', new Set());
    return [...found].sort().join(', ');
  };
  const candidates = records.map((record, m) => {
    // A device list is named by where it is reached: its texts are its rows, which two setups may order apart.
    if (screenName.has(m) || roles[m] === 'device-list' || textOf[m] === '') return undefined;
    return `"${(textOf[m] as string).slice(0, 48)}"`;
  });
  const tally = (names: readonly (string | undefined)[]): Map<string, number> => {
    const counted = new Map<string, number>();
    for (const one of names) if (one !== undefined) counted.set(one, (counted.get(one) ?? 0) + 1);
    return counted;
  };
  const once = tally(candidates);
  const refined = candidates.map((one, m) => (one === undefined || once.get(one) === 1 ? one : `${one} {${sendsOf(records[m] as ModeRecord)}}`));
  const twice = tally(refined);
  const placeOf = new Map<string, number>();
  refined.forEach((one, m) => {
    if (one === undefined) return;
    if (twice.get(one) === 1) { screenName.set(m, one); return; }
    const k = (placeOf.get(one) ?? 0) + 1;
    placeOf.set(one, k);
    screenName.set(m, `${one} #${k}`);
  });

  // ---- the other names ----
  const variableName = new Map<number, string>();
  for (const one of stateVariables(c)) {
    let name = one.name;
    const label = [...labels.keys()].find((one) => name.startsWith(`${one}_`));
    if (label !== undefined) name = `${(labels.get(label) as string).replaceAll(' ', '_')}${name.slice(label.length)}`;
    variableName.set(one.index, name);
  }
  // The firmware's own variables are one meaning on every configuration of the architecture, section 284.
  for (let k = 0; k <= firmwareStateVariableMax(architecture); k += 1) if (!variableName.has(k)) variableName.set(k, `firmware ${k}`);
  const timerName = new Map<number, string>();
  const mapName = new Map<number, string>();
  const programName = new Map<number, string>();
  const setName = (k: number): string => (setRoles[k] === 'idle' ? 'idle'
    : setRoles[k] === 'activity' ? `activity ${named.find((one) => one.set === k)?.name ?? k}` : `set ${k}`);

  // ---- the walk ----
  const queued: { key: string; run: () => void }[] = [];
  const described = new Set<string>();
  /** A thing's name, given where it is first met if nothing named it before, and its description queued once. */
  const nameOf = (table: Map<number, string>, kind: string, k: number, where: string, describe: (name: string) => void): string => {
    let name = table.get(k);
    if (name === undefined) {
      name = `${kind}@(${where})`;
      table.set(k, name);
    }
    if (!described.has(`${kind} ${k}`)) {
      described.add(`${kind} ${k}`);
      const fixed = name;
      queued.push({ key: `${kind} ${fixed}`, run: () => describe(fixed) });
    }
    return name;
  };
  const screen = (m: number, where: string): string => nameOf(screenName, 'screen', m, where, (name) => describeScreen(name, m));
  const variable = (k: number, where: string): string => nameOf(variableName, 'variable', k, where, (name) => describeVariable(name, k));

  /** One instruction, every number in it a name, a list called written out where it is called. */
  const instruction = (one: Instruction, where: string, stack: readonly number[]): string => {
    const { opcode, operand } = one;
    if (opcode === ACTION_LIST_INDEX_OPCODE) {
      if (stack.includes(operand)) return 'loop';
      if (stack.length >= CALL_DEPTH) return 'deep';
      return `{${list(operand, where, [...stack, operand])}}`;
    }
    if (opcode === ENTER_MODE) return `enter ${screen(operand, where)}`;
    if (opcode === SEND_INFRARED) return send(operand);
    if (opcode === DEVICE_QUANTITY) return `wait ${device(operand >> GROUP_SHIFT)} ${operand & 0xff}`;
    if (opcode === RUN_SCREEN_PROGRAM) {
      return `run ${nameOf(programName, 'program', operand, where, (name) => describeProgram(`program ${name}`, programs[operand]))}`;
    }
    if (opcode === MAP_VALUE_OPCODE) {
      const map = nameOf(mapName, 'map', operand >> 8, where, (name) => describeMap(name, operand >> 8));
      return `map ${map} on ${variable(operand & 0xff, where)}`;
    }
    if (opcode === STATE_BAND) {
      const sub = operand >> 8;
      const low = operand & 0xff;
      if (sub === TIMER_START || sub === TIMER_CANCEL) {
        return `${sub === TIMER_START ? 'start' : 'cancel'} ${nameOf(timerName, 'timer', low, where, (name) => describeTimer(name, low))}`;
      }
      if (sub === SET_SELECT || sub === SET_PUSH || sub === SET_REMOVE) return `1f${hex(sub)} ${setName(low)}`;
    }
    const site = stateVariableSite(one);
    if (site !== undefined) {
      if (site.where === 'opcode') return `${variable(opcode - STATE_WRITE_BASE, where)}=${operand}`;
      return `${hex(opcode)}.${hex(operand >> 8)} ${variable(site.index, where)}`;
    }
    return `${hex(opcode)}:${hex(operand)}`;
  };
  const list = (k: number, where: string, stack: readonly number[]): string => {
    ran.add(k);
    return (lists[k] ?? []).map((one, j) => instruction(one, `${where}.${j}`, stack)).join('; ');
  };
  const binding = (entry: TaggedEntry, where: string): string =>
    (entry.opcode === ACTION_LIST_INDEX_OPCODE ? list(entry.operand, where, [entry.operand]) : instruction(entry, where, []));
  const tag = (t: number): string => `event ${t >> 6} code ${t & 0x3f}`;

  /** What a program queues when it runs, in the order its transfers are walked. */
  const programQueues = (address: number | undefined, where: string): string[] => {
    if (address === undefined) return ['missing'];
    const out: string[] = [];
    for (const [, program] of reachablePrograms(c, [address])) {
      for (const one of program) {
        if (one.opcode !== SCREEN_QUEUE_INSTRUCTION) continue;
        const operand = (one.operands[0] as number) | ((one.operands[1] as number) << 8);
        out.push(instruction({ opcode: one.operands[2] as number, operand }, `${where}.${out.length}`, []));
      }
    }
    return out;
  };
  /** What a program draws: its visible texts over its variants, and a key of each variant's pixels. */
  const drawn = (address: number): { texts: string[]; pixels: string; at: { text: string; x: number; y: number; w: number; h: number }[] } => {
    const texts = new Set<string>();
    const at: { text: string; x: number; y: number; w: number; h: number }[] = [];
    const { variants, truncated } = renderVariants(c, address, VARIANTS, (one) => {
      if (one.covered) return;
      const text = strings.get(one.at) ?? '?';
      texts.add(`${text}@${one.x},${one.y}`);
      at.push({ text, x: one.x, y: one.y, w: one.width, h: one.height });
    });
    const pixels = [...new Set(variants.map((one) => contentKey(new Uint8Array(one.page.raster.pixels.buffer)).slice(0, 8)))].sort();
    return { texts: [...texts].sort(), pixels: `${pixels.join(',')}${truncated ? '+' : ''}`, at };
  };

  const describeScreen = (name: string, m: number): void => {
    const record = records[m] as ModeRecord;
    for (const entry of record.entries) out.set(`screen ${name} | keys | ${tag(entry.tag)}`, binding(entry, `screen ${name} key ${entry.tag}`));
    record.pages.forEach((page, p) => {
      const at = `screen ${name} | page ${p + 1}`;
      const seen = drawn(page.program);
      out.set(`${at} | texts`, seen.texts.join(' / '));
      out.set(`${at} | pixels`, seen.pixels);
      const queues = programQueues(page.program, `screen ${name} page ${p + 1} queue`);
      if (queues.length > 0) out.set(`${at} | queues`, queues.join('; '));
      const areas = touchPageOf(c, page)?.areas ?? [];
      out.set(`${at} | touch codes`, areas.map((one) => one.code).join(','));
      // The texts inside the area a code reports, each once though several variants draw it.
      const inside = (code: number): string => [...new Set(seen.at
        .filter((one) => touchOwner(areas, one.x + one.w / 2, one.y + one.h / 2)?.code === code)
        .map((one) => `${one.text}@${one.x},${one.y}`))].map((one) => one.replace(/@[^@]*$/, '')).join(' ');
      for (const entry of taggedList(c, page.list)?.entries ?? []) {
        out.set(`${at} | ${tag(entry.tag)}`, `[${inside(entry.tag & 0x3f)}] ${binding(entry, `screen ${name} page ${p + 1} ${entry.tag}`)}`);
      }
      // The page list's second copy, which no firmware path is known to read, section 69: described all the same, since
      // its lists are its own and `listsReached` counts them, so a difference there is seen too.
      const copy = copies[pages.findIndex((one) => one.address === page.address)];
      for (const entry of (copy === undefined ? undefined : taggedList(c, c.flashBase + copy))?.entries ?? []) {
        out.set(`${at} | copy | ${tag(entry.tag)}`, binding(entry, `screen ${name} page ${p + 1} copy ${entry.tag}`));
      }
    });
  };
  const describeVariable = (name: string, k: number): void => {
    const record = states[k];
    out.set(`variable ${name}`, record === undefined ? 'no record' : `starts ${record.first}, at most ${record.second}`);
    record?.values.forEach((one, j) => out.set(`variable ${name} | ${one.from} to ${one.to}`, instruction(one, `variable ${name} ${j}`, [])));
  };
  const describeTimer = (name: string, k: number): void => {
    const one = timerRecords[k];
    out.set(`timer ${name}`, one === undefined ? 'no record' : `kind ${one.kind}, ${one.duration} s: ${instruction(one.instruction, `timer ${name}`, [])}`);
  };
  const describeCase = (key: string, address: number, where: string): void => {
    const seen = drawn(address);
    out.set(key, `${seen.texts.join(' / ')} :: ${programQueues(address, where).join('; ')}`);
  };
  const describeMap = (name: string, k: number): void => {
    const map = maps[k];
    if (map === undefined) { out.set(`map ${name}`, 'no record'); return; }
    for (const [value, address] of map.entries) describeCase(`map ${name} | ${value}`, address, `map ${name} ${value}`);
    for (const [low, high, address] of map.ranges) describeCase(`map ${name} | ${low} to ${high}`, address, `map ${name} ${low} to ${high}`);
  };
  const describeProgram = (key: string, address: number | undefined): void => {
    if (address === undefined) { out.set(key, 'missing'); return; }
    describeCase(key, address, key);
  };

  // The roots: the firmware's events, every base slot 9 key map, the number senders and base slot 8's leading list.
  const events = eventMap(c);
  if (events !== undefined) {
    out.set('event fallback', `enter ${screen(events.fallback, 'event fallback')}`);
    for (const [code, m] of [...events.entries].sort((a, b) => a[0] - b[0])) out.set(`event ${code}`, `enter ${screen(m, `event ${code}`)}`);
  }
  sets.forEach((address, k) => {
    for (const entry of taggedList(c, address)?.entries ?? []) {
      out.set(`keys ${setName(k)} | ${tag(entry.tag)}`, binding(entry, `keys ${setName(k)} ${entry.tag}`));
    }
  });
  (numberSenders(c)?.records ?? []).forEach((one, k) => {
    const all = [one.prologue, one.epilogue, one.prefix, ...one.tables.flatMap((table) => table.instructions)];
    out.set(`number sender ${k}`, all.map((each, j) => instruction(each, `number sender ${k}.${j}`, [])).join('; '));
  });
  const lead = c.sections[archSlot(architecture, BINDING_SLOT)];
  const leadAt = lead === undefined || lead.isNull ? undefined : c.blobOffsetOf(lead.address);
  if (leadAt !== undefined) {
    for (let k = 0; k < (c.blob[leadAt] as number); k += 1) {
      const at = leadAt + 1 + 3 * k;
      const one = { opcode: c.blob[at + 2] as number, operand: (c.blob[at] as number) | ((c.blob[at + 1] as number) << 8) };
      out.set(`leading list ${k}`, instruction(one, `leading list ${k}`, []));
    }
  }
  // Whatever was met, described in the order of its name, so placement decides nothing. Run again after each thing
  // nothing reaches is described below, since what that meets is met nowhere else.
  const drain = (): void => {
    while (queued.length > 0) {
      let next = 0;
      for (let k = 1; k < queued.length; k += 1) if ((queued[k] as { key: string }).key < (queued[next] as { key: string }).key) next = k;
      queued.splice(next, 1)[0]!.run();
    }
  };
  drain();

  // What nothing reaches, named by its content where its index is all there is. A trial under a placeholder gives
  // the content, everything the trial changed is put back, and the description runs again under the name, so a
  // thing that starts itself, a timer restarting its own record, and what it meets are named after it and not after
  // the placeholder.
  const tables = [screenName, timerName, mapName, programName, variableName];
  const byContent = (kind: string, table: Map<number, string>, k: number, describe: (name: string) => void, prefix = 'unreached'): void => {
    const saved = {
      out: new Map(out), ran: new Set(ran), described: new Set(described), tables: tables.map((one) => new Map(one)),
    };
    const as = (name: string): void => {
      table.set(k, name);
      described.add(`${kind} ${k}`);
      describe(name);
      drain();
    };
    as('unreached ?');
    const added = [...out.entries()].filter(([key, value]) => saved.out.get(key) !== value);
    const name = `${prefix} ${keyOfText(added.map(([key, value]) => `${key}=${value}`).join('|'))}`;
    out.clear();
    for (const [key, value] of saved.out) out.set(key, value);
    ran.clear();
    for (const one of saved.ran) ran.add(one);
    described.clear();
    for (const one of saved.described) described.add(one);
    tables.forEach((one, j) => {
      one.clear();
      for (const [key, value] of saved.tables[j] as Map<number, string>) one.set(key, value);
    });
    as(name);
  };
  // Screens nothing enters: those a text names in the order of their names, so which of two first meets a thing does
  // not hang on their indices; then those no text names, by their role, and by their content too where several
  // share the role, two status screens on the test setup's compositions.
  records.map((_, m) => m).filter((m) => !described.has(`screen ${m}`) && screenName.has(m))
    .map((m) => ({ m, name: `unreached ${screenName.get(m)}` }))
    .sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : x.m - y.m))
    .forEach(({ m, name }) => {
      if (described.has(`screen ${m}`)) return;
      described.add(`screen ${m}`);
      describeScreen(name, m);
      drain();
    });
  const roleless = records.map((_, m) => m).filter((m) => !described.has(`screen ${m}`));
  const shared = (m: number): boolean => roleless.filter((one) => roles[one] === roles[m]).length > 1;
  for (const m of roleless) {
    if (described.has(`screen ${m}`)) continue;
    if (shared(m)) {
      byContent('screen', screenName, m, (name) => describeScreen(name, m), `unreached ${roles[m]}`);
      continue;
    }
    described.add(`screen ${m}`);
    describeScreen(`unreached ${roles[m]}`, m);
    drain();
  }
  timerRecords.forEach((_, k) => { if (!described.has(`timer ${k}`)) byContent('timer', timerName, k, (name) => describeTimer(name, k)); });
  maps.forEach((_, k) => { if (!described.has(`map ${k}`)) byContent('map', mapName, k, (name) => describeMap(name, k)); });
  states.forEach((_, k) => {
    if (described.has(`variable ${k}`)) return;
    described.add(`variable ${k}`);
    describeVariable(`unreached ${variableName.get(k) ?? keyOfText(JSON.stringify(states[k]?.values.map((one) => [one.from, one.to])))}`, k);
    drain();
  });
  return { view: out, lists: ran };
}

/** One name two views hold differently, or one of them alone: `a` or `b` absent where that view lacks the name. */
export interface TouchViewDifference {
  key: string;
  a?: string;
  b?: string;
}

/** Every name where two views differ, in name order. */
export function compareTouchViews(a: TouchView, b: TouchView): TouchViewDifference[] {
  const out: TouchViewDifference[] = [];
  for (const key of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(key);
    const y = b.get(key);
    if (x === y) continue;
    out.push({ key, ...(x === undefined ? {} : { a: x }), ...(y === undefined ? {} : { b: y }) });
  }
  return out;
}
