/**
 * Which base slot 10 lists a set of screens owns, shared by the Harmony One's fixed screens test
 * (`touchfixedscreens.test.ts`, findings section 411) and its tour and Remote Assistant test
 * (`touchtourscreens.test.ts`, section 412), and since `todo-compile-one.md` 6.7 the lists anything can run,
 * `listsReached`, by the composed setup's test (`composesetup.test.ts`).
 *
 * **It lives in one file because it is one derivation**, as `tagfive.ts` is: both tests claim that the lists a
 * builder makes are named by nothing outside its screens, and that the lists below them split into those the
 * screens alone run and those the rest of the configuration runs too. Two copies of the walk would be two
 * claims about one measurement, and the day one of them learned a new holder the other would go on passing.
 *
 * Not a test file itself, the name does not end in `.test.ts`, so the runner does not pick it up.
 */
import {
  type Container, SCREEN_QUEUE_INSTRUCTION, archSlot, handlerSets, modePages, modeRecords, numberSenders, pageListCopies,
  reachablePrograms, stateRecords, taggedList, timers, valueMaps,
} from '../src/index.ts';

const CALL = 0x7f;

/**
 * Every list a holder outside the given modes names with `0x7F`, wherever section 408's walk finds an
 * instruction: other lists, other modes' key maps, page lists and copies, base slot 9's sets, the timers, base
 * slot 13's transitions, the value maps' payloads, base slot 8's leading list and every screen program the
 * given modes' pages do not reach. `own` are lists whose own calls are not counted, the screens' own.
 */
export function namedOutside(c: Container, modes: ReadonlySet<number>, own: ReadonlySet<number>): Set<number> {
  const named = new Set<number>();
  const records = modeRecords(c) ?? [];
  const theirs = new Set([...reachablePrograms(c, [...modes].flatMap((mode) => (records[mode]?.pages ?? []).map((page) => page.program))).keys()]);
  for (const [address, program] of reachablePrograms(c)) {
    if (theirs.has(address)) continue;
    for (const one of program) {
      if (one.opcode === SCREEN_QUEUE_INSTRUCTION && one.operands[2] === CALL) named.add((one.operands[0] as number) | ((one.operands[1] as number) << 8));
    }
  }
  for (const record of stateRecords(c) ?? []) for (const v of record.values) if (v.opcode === CALL) named.add(v.operand);
  for (const map of valueMaps(c) ?? []) {
    for (const address of [...map.entries.map((one) => one[1]), ...map.ranges.map((one) => one[2])]) {
      const at = c.blobOffsetOf(address);
      if (at !== undefined && c.blob[at] === 0x11 && c.blob[at + 3] === CALL) named.add((c.blob[at + 1] as number) | ((c.blob[at + 2] as number) << 8));
    }
  }
  const lead = c.blobOffsetOf((c.sections[archSlot(c.architecture as number, 8)] as { address: number }).address) as number;
  for (let k = 0; k < (c.blob[lead] as number); k += 1) {
    if (c.blob[lead + 3 + 3 * k] === CALL) named.add((c.blob[lead + 1 + 3 * k] as number) | ((c.blob[lead + 2 + 3 * k] as number) << 8));
  }
  (c.actionLists() ?? []).forEach((list, index) => {
    if (own.has(index)) return;
    for (const one of list) if (one.opcode === CALL) named.add(one.operand);
  });
  const pages = modePages(c);
  const copies = pageListCopies(c);
  records.forEach((record, mode) => {
    if (modes.has(mode)) return;
    const lists = [record.entries, ...record.pages.flatMap((page) => {
      const rank = pages.findIndex((one) => one.address === page.address);
      return [taggedList(c, page.list)?.entries ?? [], taggedList(c, c.flashBase + (copies[rank] as number))?.entries ?? []];
    })];
    for (const entries of lists) for (const one of entries) if (one.opcode === CALL) named.add(one.operand);
  });
  for (const address of handlerSets(c)?.addresses ?? []) {
    for (const one of taggedList(c, address)?.entries ?? []) if (one.opcode === CALL) named.add(one.operand);
  }
  for (const timer of timers(c)?.records ?? []) if (timer.instruction.opcode === CALL) named.add(timer.instruction.operand);
  return named;
}

/**
 * The lists below a set of screens' built lists, the ones those call through every call and the builder leaves
 * as the configuration's: how many there are, how many of them something outside the screens names directly
 * (`shared`), and how many any of those reaches through every call down (`sharedBelow`), which run for the rest
 * of the configuration too; the others run for these screens alone. Also every built list a holder outside the
 * screens names, which a builder's claim needs empty.
 */
export function listsBelow(
  c: Container, modes: ReadonlySet<number>, built: ReadonlySet<number>,
): { namedFromOutside: number[]; below: number; shared: number; sharedBelow: number } {
  const outside = namedOutside(c, modes, built);
  const lists = c.actionLists() ?? [];
  const below = new Set<number>();
  const queue = [...built];
  while (queue.length > 0) {
    for (const one of lists[queue.shift() as number] ?? []) {
      if (one.opcode !== CALL || built.has(one.operand) || below.has(one.operand)) continue;
      below.add(one.operand);
      queue.push(one.operand);
    }
  }
  // The control that the walk finds a name where there is one: of the lists below, those something outside the
  // screens and every list they reach names too.
  const reached = namedOutside(c, modes, new Set([...built, ...below]));
  const down = new Set([...reached].filter((index) => below.has(index)));
  const shared = down.size;
  const more = [...down];
  while (more.length > 0) {
    for (const one of lists[more.shift() as number] ?? []) {
      if (one.opcode !== CALL || !below.has(one.operand) || down.has(one.operand)) continue;
      down.add(one.operand);
      more.push(one.operand);
    }
  }
  return { namedFromOutside: [...built].filter((index) => outside.has(index)), below: below.size, shared, sharedBelow: down.size };
}

/**
 * The base slot 10 lists something can run, `todo-compile-one.md` 6.7: every list `namedOutside` finds named by
 * a holder that is not an action list (with no modes set apart, so every mode, every screen program reachable
 * from base slot 11, the value maps and the modes, and every other holder it walks), and every instruction a
 * base slot 16 number sender queues, its own three and its digit tables', section 154, which `namedOutside`
 * does not read; then every list those call, through every call down. A list only lists nothing reaches call,
 * a dead chain, is not reached.
 *
 * **Why that is what the remote can run**, section 408 on the Harmony One's 3.4 image: base slot 10 is spooled
 * at one place, whose list number comes only from an `0x7F` operand, and an instruction is rebuilt at run time
 * only by `0x7B` or by an opcode `0x1F` to `0x3E` over `0xF7`, every one of which on the nineteen compiles is
 * `1F F776`, building an `0x76`. So a list no `0x7F` reached from a root names is one the firmware never runs.
 */
export function listsReached(c: Container): Set<number> {
  const lists = c.actionLists() ?? [];
  const roots = namedOutside(c, new Set(), new Set(lists.keys()));
  for (const sender of numberSenders(c)?.records ?? []) {
    for (const one of [sender.prologue, sender.epilogue, sender.prefix, ...sender.tables.flatMap((table) => table.instructions)]) {
      if (one.opcode === CALL) roots.add(one.operand);
    }
  }
  const reached = new Set<number>();
  const queue = [...roots];
  while (queue.length > 0) {
    const index = queue.pop() as number;
    if (reached.has(index)) continue;
    reached.add(index);
    for (const one of lists[index] ?? []) if (one.opcode === CALL && !reached.has(one.operand)) queue.push(one.operand);
  }
  return reached;
}
