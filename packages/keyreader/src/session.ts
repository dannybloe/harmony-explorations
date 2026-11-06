/**
 * The key reader's two modes, as plain state with no page and no remote: learning a model's keys, and
 * testing them. `page.ts` feeds them presses and draws what they say; the tests drive them directly.
 *
 * **Learning, for a model with a drawing**, `Learning`: the page asks for one key at a time, in the order
 * of the face, and **a press is recorded against the key that was asked for**. That is the whole design.
 * The key map of the Harmony 885 was first measured by pressing keys in a list's order and naming each
 * code after the list, and two names came out swapped, Pause and Play, because the list's order was not
 * the order the keys were pressed in (`tests/test_harmony_885_keys.py`). Asking for a key and taking the
 * next press as that key's code makes the order of pressing irrelevant: a name is never inferred from a
 * position in a sequence.
 *
 * So a press that cannot be the key asked for is not recorded at all, it is noted: a code already learned
 * for another key (each key raises its own code, so a repeat is the wrong key pressed, or the same key
 * pressed twice), or any press once nothing is being asked. A key the person's remote does not have is
 * skipped, and undo takes back the last answer, learned or skipped, which then becomes the key asked again.
 *
 * **Learning, for a model without a drawing**, `Naming`: with no drawing there is no list of keys to ask
 * for, so the order is turned round. The person presses a key and then types what is printed on it, or
 * where it is; the code is recorded against the words typed for that one press. A second press before the
 * words are in is noted, not recorded, for the same reason as above.
 *
 * **Testing**, `Tester`: every key pressed lights and stays lit, so a person sees which keys answer and
 * which never do. It needs the model's codes: a key's scan code, or its candidates where the drawing has
 * narrowed a key to a set (the Harmony 880's two chevron keys, each one of 20 and 52, nobody yet having
 * pressed them), in which case a press of either lights every key that could be it, marked as such. A
 * code no key carries is kept in a list of its own.
 *
 * **The log**, `learningLog`, is what a person sends us: the model as chosen, the skin and firmware the
 * remote reported, and per key its name and its code or that it was skipped, then the presses that did not
 * fit. **Nothing that identifies the unit**: the page never reads a serial number, and the log is built
 * from a fixed set of line shapes that `test/session.test.ts` checks every line against.
 */

/** One key of a drawing, as the page receives it from the build, `bin/drawings.ts`. */
export interface FaceKey {
  /** The drawing's own name for the key, `data-name`: Logitech's word where there is one. */
  readonly name: string;
  /** The words a person knows the key by: its print, or where it is. */
  readonly words: string;
  /** The scan code, present only where the drawing states one. */
  readonly scan?: number;
  /** The codes the key is narrowed to where it is not decided; empty when it is, or when nothing is known. */
  readonly candidates: readonly number[];
}

/** One drawn model as the page receives it: its keys in the order the page asks for them, and its SVG. */
export interface Drawing {
  readonly id: string;
  readonly label: string;
  readonly skins: readonly number[];
  readonly keys: readonly FaceKey[];
  readonly svg: string;
}

/** A press that was noted and not recorded, and why. */
export interface Misfit {
  readonly code: number;
  /** What was being asked when it came: a key's name, or nothing. */
  readonly asked: string | undefined;
  /**
   * `already`: the code is already learned for another key, named in `other`.
   * `nothing-asked`: every key has been answered.
   * `naming`: a press came while the words for the previous one were being typed.
   */
  readonly reason: 'already' | 'nothing-asked' | 'naming';
  readonly other?: string;
}

/** An answer to a key that was asked: its code, or that it was skipped. */
export interface Answer {
  readonly key: FaceKey;
  readonly code: number | 'skipped';
}

/** What happened to one press. */
export type LearnOutcome =
  | { readonly kind: 'learned'; readonly key: FaceKey; readonly code: number }
  | { readonly kind: 'misfit'; readonly misfit: Misfit };

/** How a key looks while learning, which is also what the page colours it by. */
export type LearnState = 'asked' | 'learned' | 'skipped' | 'waiting';

/** The learning mode for a model with a drawing: one key asked at a time, in the face's order. */
export class Learning {
  readonly keys: readonly FaceKey[];
  /**
   * The answers in the order given. Each answers the key asked at the time, which is always the first key
   * not yet answered, so this list follows `keys` and its length says which key is asked next.
   */
  readonly #answers: Answer[] = [];
  readonly #misfits: Misfit[] = [];

  constructor(keys: readonly FaceKey[]) {
    this.keys = keys;
  }

  /** The key being asked for, or undefined when every key has been answered. */
  get asked(): FaceKey | undefined {
    return this.keys[this.#answers.length];
  }

  get answers(): readonly Answer[] {
    return this.#answers;
  }

  get misfits(): readonly Misfit[] {
    return this.#misfits;
  }

  /** Whether every key has been answered. */
  get done(): boolean {
    return this.asked === undefined;
  }

  /** The key a code has been learned for, if any. */
  learnedFor(code: number): FaceKey | undefined {
    return this.#answers.find((answer) => answer.code === code)?.key;
  }

  /** A press: recorded against the key asked for, or noted when it cannot be that key. */
  press(code: number): LearnOutcome {
    const asked = this.asked;
    if (asked === undefined) return this.#note({ code, asked: undefined, reason: 'nothing-asked' });
    const other = this.learnedFor(code);
    if (other !== undefined) return this.#note({ code, asked: asked.name, reason: 'already', other: other.name });
    this.#answers.push({ key: asked, code });
    return { kind: 'learned', key: asked, code };
  }

  /** The person's remote has no such key: answer it as skipped and ask the next. */
  skip(): FaceKey | undefined {
    const asked = this.asked;
    if (asked !== undefined) this.#answers.push({ key: asked, code: 'skipped' });
    return asked;
  }

  /** Take back the last answer, so that its key is asked again. */
  undo(): Answer | undefined {
    return this.#answers.pop();
  }

  /** How a key looks now. */
  stateOf(name: string): LearnState {
    const answer = this.#answers.find((a) => a.key.name === name);
    if (answer !== undefined) return answer.code === 'skipped' ? 'skipped' : 'learned';
    return this.asked?.name === name ? 'asked' : 'waiting';
  }

  #note(misfit: Misfit): LearnOutcome {
    this.#misfits.push(misfit);
    return { kind: 'misfit', misfit };
  }

  /** The rows of the log: every key in the order asked, with its code, `skipped`, or `not asked`. */
  rows(): LogRow[] {
    return this.keys.map((key, index) => {
      const answer = this.#answers[index];
      return { name: key.name, words: key.words, code: answer === undefined ? 'not asked' : answer.code };
    });
  }
}

/** A key learned without a drawing: the words the person typed for it, and its code. */
export interface Named {
  readonly words: string;
  readonly code: number;
}

export type NameOutcome =
  | { readonly kind: 'pending'; readonly code: number }
  | { readonly kind: 'misfit'; readonly misfit: Misfit };

/**
 * The learning mode for a model without a drawing: a press, then the words for it.
 *
 * There is no key to ask for, so `asked` in a misfit is the code waiting for its words, written as such.
 */
export class Naming {
  readonly #named: Named[] = [];
  readonly #misfits: Misfit[] = [];
  #pending: number | undefined;

  get named(): readonly Named[] {
    return this.#named;
  }

  get misfits(): readonly Misfit[] {
    return this.#misfits;
  }

  /** The code pressed and waiting for its words, if any. */
  get pending(): number | undefined {
    return this.#pending;
  }

  /** A press: held until it is named, or noted when it comes too soon or repeats a learned code. */
  press(code: number): NameOutcome {
    if (this.#pending !== undefined) {
      return this.#note({ code, asked: `the words for ${this.#pending}`, reason: 'naming' });
    }
    const other = this.#named.find((n) => n.code === code);
    if (other !== undefined) return this.#note({ code, asked: undefined, reason: 'already', other: other.words });
    this.#pending = code;
    return { kind: 'pending', code };
  }

  /** The words for the pending press; nothing happens without a press or without words. */
  name(words: string): Named | undefined {
    // A double quote would end the quoted words in the log early, so it becomes a single one.
    const trimmed = words.trim().replaceAll('"', "'");
    if (this.#pending === undefined || trimmed === '') return undefined;
    const named = { words: trimmed, code: this.#pending };
    this.#named.push(named);
    this.#pending = undefined;
    return named;
  }

  /** Forget the pending press without naming it. */
  discard(): number | undefined {
    const code = this.#pending;
    this.#pending = undefined;
    return code;
  }

  /** Take back the last key named. */
  undo(): Named | undefined {
    return this.#named.pop();
  }

  #note(misfit: Misfit): NameOutcome {
    this.#misfits.push(misfit);
    return { kind: 'misfit', misfit };
  }

  rows(): LogRow[] {
    return this.#named.map((n) => ({ name: n.words, code: n.code }));
  }
}

/** What a press lit in test mode. */
export interface TestOutcome {
  readonly code: number;
  /** The keys whose code it is. */
  readonly exact: readonly string[];
  /** The keys it may be, by their candidates, when no key has it as its code. */
  readonly possible: readonly string[];
}

/** How a key looks while testing. */
export type TestState = 'lit' | 'possible' | 'unlit';

/** The key test mode: every key pressed lights and stays lit. */
export class Tester {
  readonly #keys: readonly Pick<FaceKey, 'name' | 'scan' | 'candidates'>[];
  readonly #lit = new Set<string>();
  readonly #possible = new Set<string>();
  readonly #unknown: number[] = [];

  constructor(keys: readonly Pick<FaceKey, 'name' | 'scan' | 'candidates'>[]) {
    this.#keys = keys;
  }

  press(code: number): TestOutcome {
    const exact = this.#keys.filter((k) => k.scan === code).map((k) => k.name);
    // A candidate stands in only where no key has the code as its own: a decided key wins.
    const possible = exact.length > 0 ? [] : this.#keys.filter((k) => k.candidates.includes(code)).map((k) => k.name);
    for (const name of exact) this.#lit.add(name);
    for (const name of possible) this.#possible.add(name);
    if (exact.length === 0 && possible.length === 0 && !this.#unknown.includes(code)) this.#unknown.push(code);
    return { code, exact, possible };
  }

  stateOf(name: string): TestState {
    if (this.#lit.has(name)) return 'lit';
    return this.#possible.has(name) ? 'possible' : 'unlit';
  }

  /** The codes pressed that no key carries, in the order first pressed. */
  get unknown(): readonly number[] {
    return this.#unknown;
  }

  /** How many keys have answered, counting a key lit by its candidates. */
  get answered(): number {
    return this.#keys.filter((k) => this.stateOf(k.name) !== 'unlit').length;
  }

  get total(): number {
    return this.#keys.length;
  }

  reset(): void {
    this.#lit.clear();
    this.#possible.clear();
    this.#unknown.length = 0;
  }
}

/** One key's line in the log: its name, the words for it where they differ, and what was found. */
export interface LogRow {
  readonly name: string;
  readonly words?: string;
  readonly code: number | 'skipped' | 'not asked';
}

/** What the remote said about itself and what the person chose: the log's head. */
export interface LogHead {
  readonly chosen: string;
  readonly reported: string;
  readonly skin: number;
  readonly firmware: string;
}

/** The first line of every log, which is also how a reader of an issue recognises one. */
export const LOG_TITLE = 'Harmony key map, from the key reader page';

/**
 * The log a person copies and sends: a fixed set of line shapes, nothing else.
 *
 * The head says which model was chosen and what the remote reported, its model name, skin and firmware
 * version, which is what tells us which build of which model the codes are from. Then one line per key,
 * `Name (words): code`, in the order asked (or, without a drawing, pressed), and then the presses that did not fit, each with its code and
 * why. No line carries anything about the unit itself, because the page reads nothing that could.
 */
export function learningLog(
  head: LogHead,
  rows: readonly LogRow[],
  misfits: readonly Misfit[],
  order: 'asked' | 'pressed' = 'asked',
): string {
  const lines = [
    LOG_TITLE,
    `model chosen: ${head.chosen}`,
    `remote reported: ${head.reported}, skin ${head.skin}, firmware ${head.firmware}`,
    '',
    // Without a drawing nothing is asked: the keys come in the order the person pressed and named them.
    `keys, in the order ${order}:`,
  ];
  for (const row of rows) {
    if (order === 'pressed') {
      // The person's own words, quoted, so that a reader can tell them from the line's shape whatever
      // they are; `Naming.name` keeps a double quote out of them.
      lines.push(`"${row.name}": ${row.code}`);
      continue;
    }
    const words = row.words === undefined || row.words === row.name ? '' : ` (${row.words})`;
    lines.push(`${row.name}${words}: ${row.code}`);
  }
  lines.push('', 'presses that did not fit:');
  if (misfits.length === 0) lines.push('none');
  for (const misfit of misfits) lines.push(`${misfit.code}: ${misfitWords(misfit)}`);
  return `${lines.join('\n')}\n`;
}

/** Why a press was not recorded, in words, for the log and for the page. */
export function misfitWords(misfit: Misfit): string {
  const when = misfit.asked === undefined ? '' : ` while ${misfit.asked} was asked`;
  switch (misfit.reason) {
    case 'already':
      return `already the code of ${misfit.other ?? 'another key'}${when}`;
    case 'nothing-asked':
      return 'pressed after every key was answered';
    case 'naming':
      return `pressed before the words for the previous key were in`;
  }
}
