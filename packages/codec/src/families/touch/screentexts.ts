/**
 * Every text a Harmony One configuration draws, spelled from its word: `todo-compile-one.md` 5.1, section 406,
 * the touch family's half of what section 358 did for the Harmony 600, 650 and 700.
 *
 * A text instruction draws glyph codes, and a code is the configuration's own number for a character in the
 * font set the program has selected, so a word is read off a configuration as characters, through the character
 * map, and spelled again in its font, `speller`. Two things make the text Logitech's bytes, and this pass
 * generates both for every text of every screen program the configuration reaches:
 *
 * * **its glyph codes**, spelled from its word in its font. **One thing here is the touch family's own**: a
 *   start up screen's title, "Starting" and the activity's name, joins the two with a blank glyph of its own
 *   rather than with the configuration's space. In Logitech's letters it is 4 pixels wide where the space is 3,
 *   it is held by the title's font set alone where the space is held by eight or nine sets, and nothing but a
 *   start up title draws it. A character map reads both blanks as a space, since pixels cannot name a blank,
 *   so `touchCharacterMap` names this one `TITLE_JOINER` and spelling it gives its code back. Which character
 *   Logitech's compiler meant by it is not stated anywhere read, so it is named by its role; the French Harmony
 *   650 compile holds a wider blank where French puts a non-breaking space, which makes that the likeliest.
 * * **its form**, inline or by reference, by the configuration's rule that every family follows,
 *   `shareRuns`: the first text in address order to draw a run of codes draws it inline, every later one
 *   points at that copy.
 *
 * **What is read and not generated**: each text's place, the font it is drawn in, the fonts themselves and the
 * character map. Where a text sits on the One's screens is the rule of the screen it is on, and building those
 * screens is `todo-compile-one.md` chapter 4; the device pages and an activity's screens already place theirs,
 * `screens.ts` and `activityscreen.ts`. How a pad label is broken over its lines is the device composer's rule,
 * section 394, `touchLabelLines`, so each line is read as a word of its own here. A code the character map does
 * not resolve leaves no word, and such a text keeps its codes; none of the nineteen compiles draws one.
 *
 * The pattern is the four slot family's: `describeTouchScreenTexts` reads what a composer would supply, through a
 * `ValueReader` that records what it reads, `buildTouchScreenTexts` generates the rest, `withScreenTexts` writes it
 * into a `takeApart` layout and `layOutContainer` lays the container out again. Read only towards hardware.
 */
import type { Container } from '../../gspm.ts';
import type { ContainerLayout } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { fontSets, glyphOf } from '../../font.ts';
import {
  type ScreenInstruction, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, reachablePrograms, screenProgram,
} from '../../screen.ts';
import { type CharacterMap, characterMap } from '../../text.ts';
import { type ValueReader, blobReader, speller } from '../../shared/spelling.ts';
import {
  type BuiltDraw, type BuiltScreenTexts, INLINE_HEAD, ScreenTextError, type ScreenTextsPlace, pieceLocator, shareRuns,
  withScreenTexts,
} from '../../shared/screentexts.ts';

/**
 * The character a start up title's joiner stands for in `touchCharacterMap`: a code point of Unicode's private
 * use area, since the blank's character is not known and must not be mistaken for one that is. Section 406.
 */
export const TITLE_JOINER = '\u{E000}';

/**
 * The code of a start up title's joiner: of the configuration's codes read as a space, the one only one font set
 * holds, where the other is held by several. Undefined on a configuration with one blank, as the four Logitech
 * One compiles with no activity are, and where no blank is held by one set alone.
 *
 * **On a donor lettered in ours both blanks are in every set and draw the same**, `letterTouchDonor`, so the
 * joiner cannot be told from the space there and its titles read as words with a space; spelling them back then
 * gives the space's code, not the joiner's. The rule is for Logitech's compiles, which is what 5.1 reads. Refused
 * where the blanks part any other way, which no compile does.
 */
export function titleJoinerCode(c: Container, map: CharacterMap): number | undefined {
  const sets = fontSets(c) ?? [];
  const blanks = [...map.codes].filter(([, ch]) => ch === ' ').map(([code]) => ({
    code, held: sets.filter((set) => glyphOf(c, set, code) !== undefined).length,
  }));
  if (blanks.length < 2) return undefined;
  const alone = blanks.filter((one) => one.held === 1);
  if (alone.length === 0) return undefined;
  if (blanks.length !== 2 || alone.length !== 1) {
    throw new ScreenTextError(`the configuration reads ${blanks.length} codes as a space, held by ${blanks.map((one) => one.held).join(' and ')} sets`);
  }
  return (alone[0] as { code: number }).code;
}

/** The configuration's character map with the start up title's joiner named `TITLE_JOINER`, where it has one. */
export function touchCharacterMap(c: Container, map: CharacterMap | undefined = characterMap(c)): CharacterMap | undefined {
  if (map === undefined) return undefined;
  const joiner = titleJoinerCode(c, map);
  if (joiner === undefined) return map;
  const codes = new Map(map.codes);
  codes.set(joiner, TITLE_JOINER);
  return { ...map, codes };
}

/** One text as a composer would state it: the word, the font it is drawn in, and the place as read. */
export interface TouchScreenTextSpec {
  /** The word, as characters, a start up title's joiner as `TITLE_JOINER`. Empty where `codes` is given. */
  word: string;
  /** The glyph codes, carried rather than spelled, where a code has no character. */
  codes?: number[];
  font: number;
  x: number;
  y: number;
  /** For a person: the program that draws it. */
  where: string;
}

export interface TouchScreenTextsDescribed {
  /** Every text of the configuration, in address order, which decides which copy is first. */
  texts: TouchScreenTextSpec[];
  place: ScreenTextsPlace;
  /** Blob offsets read as values: the glyph codes a word is read from, and the place. */
  described: Set<number>;
  /** Blob offsets of every text instruction's bytes, which `withScreenTexts` writes. */
  structure: Set<number>;
  /** Per text, the blob offset of the instruction that draws it. */
  draws: number[];
  /** The blob offsets of the texts whose codes are carried, a code having no character. */
  unresolved: Set<number>;
}

/**
 * Read off a configuration what a composer would supply for each of its texts, and where each sat. `layout` is
 * `takeApart(c)`; `read` is where every value is taken from, the instruction and the copy a reference draws being
 * found through the container itself. Refuses a text drawn before its program selects a font.
 */
export function describeTouchScreenTexts(
  c: Container, layout: ContainerLayout, read: ValueReader = blobReader(c), map = touchCharacterMap(c),
): TouchScreenTextsDescribed {
  if (map === undefined) throw new ScreenTextError('the configuration draws no text a character map reads');
  const described = new Set<number>();
  const value = (offset: number): number => {
    described.add(offset);
    return read(offset);
  };
  const pieceAt = pieceLocator(layout, c.blob.length);
  // The codes a text draws, read as values: inline, its own; by reference, the copy's, found by the address.
  const codesOf = (one: ScreenInstruction): number[] => {
    if (one.opcode === SCREEN_TEXT_INLINE) return [...(one.glyphs ?? [])].map((_, k) => value(one.start + INLINE_HEAD + k));
    const o = one.operands;
    const off = c.blobOffsetOf((o[2] as number) | ((o[3] as number) << 8) | ((o[4] as number) << 16));
    if (off === undefined) throw new ScreenTextError(`the text at ${one.start} points outside the configuration`);
    const out: number[] = [];
    for (let k = off; c.blob[k] !== 0; k += 1) out.push(value(k));
    return out;
  };

  const found: { ins: ScreenInstruction; spec: TouchScreenTextSpec }[] = [];
  const structure = new Set<number>();
  const unresolved = new Set<number>();
  const seen = new Set<number>();
  for (const [address, program] of [...reachablePrograms(c)].sort((a, b) => a[0] - b[0])) {
    const where = `the program at 0x${address.toString(16)}`;
    // The font is the program's own: it selects one before it draws, on every program of the nineteen.
    let font = -1;
    for (const ins of program) {
      if (ins.opcode === SCREEN_SELECT_FONT) font = ins.operands[0] ?? -1;
      if (ins.opcode !== SCREEN_TEXT_INLINE && ins.opcode !== SCREEN_TEXT_AT) continue;
      if (seen.has(ins.start)) continue;
      seen.add(ins.start);
      if (font < 0) throw new ScreenTextError(`${where} draws a text before it selects a font`);
      for (let b = 0; b < ins.length; b += 1) structure.add(ins.start + b);
      const codes = codesOf(ins);
      let word: string | undefined = '';
      for (const code of codes) {
        const ch = map.codes.get(code);
        if (ch === undefined) {
          word = undefined;
          break;
        }
        word += ch;
      }
      const x = value(ins.start + 1);
      const y = value(ins.start + 2);
      if (word === undefined) unresolved.add(ins.start);
      found.push({ ins, spec: word === undefined ? { word: '', codes, font, x, y, where } : { word, font, x, y, where } });
    }
  }
  found.sort((a, b) => a.ins.start - b.ins.start);
  return {
    texts: found.map((one) => one.spec),
    place: { texts: found.map((one) => ({ ...pieceAt(one.ins.start), length: one.ins.length })) },
    described,
    structure,
    draws: found.map((one) => one.ins.start),
    unresolved,
  };
}

/**
 * Build every text of a description: spelled in its font from its word, at its place, and drawn inline where it is
 * the first draw of the configuration of its codes and by reference to that one otherwise. `c` is read for its
 * fonts only and `map` is its character map with the title joiner named, `touchCharacterMap`. Refuses a word its
 * font cannot spell.
 */
export function buildTouchScreenTexts(
  texts: readonly TouchScreenTextSpec[], c: Container, map: CharacterMap | undefined = touchCharacterMap(c),
): BuiltScreenTexts {
  const spell = speller(c, map);
  const draws: BuiltDraw[] = texts.map((one) => ({
    codes: one.codes ?? spell(one.font, one.word).codes, x: one.x, y: one.y,
  }));
  shareRuns(draws);
  return { draws, spans: draws.map((_, k) => [k, k + 1]) };
}

/** What `checkTouchScreenTexts` compared. */
export interface TouchScreenTextsChecked {
  /** Text instructions, inline and by reference. */
  inline: number;
  references: number;
  /** Of the inline ones, how many draw a start up title's joiner. */
  joined: number;
  /** Bytes of text instructions. */
  bytes: number;
  /** Texts whose codes are carried, a code having no character. */
  unresolved: number;
}

/**
 * Every text of a Harmony One configuration against the one built for it: a configuration whose texts are not
 * spelled and shared by the rules here is refused, naming the first text that differs and how, and then the
 * whole container is laid out again with the built texts and compared byte for byte.
 */
export function checkTouchScreenTexts(c: Container): TouchScreenTextsChecked {
  const layout = takeApart(c);
  const map = touchCharacterMap(c);
  const d = describeTouchScreenTexts(c, layout, blobReader(c), map);
  const built = buildTouchScreenTexts(d.texts, c, map);
  const joiner = map === undefined ? undefined : [...map.codes].find(([, ch]) => ch === TITLE_JOINER)?.[0];
  const tally = { inline: 0, references: 0, joined: 0, bytes: d.structure.size, unresolved: d.unresolved.size };
  d.draws.forEach((offset, k) => {
    const spec = d.texts[k] as TouchScreenTextSpec;
    const one = built.draws[k] as BuiltDraw;
    const what = `${spec.where}'s text '${spec.word}' at ${spec.x}, ${spec.y}`;
    const ins = screenProgram(c, c.flashBase + offset)?.[0];
    if (ins === undefined) throw new ScreenTextError(`${what} is not a text`);
    const inline = ins.opcode === SCREEN_TEXT_INLINE;
    if (inline !== (one.home === undefined)) {
      throw new ScreenTextError(`${what} is drawn ${inline ? 'inline' : 'by reference'} where it is built ${inline ? 'by reference' : 'inline'}`);
    }
    if (inline && [...(ins.glyphs ?? [])].join(',') !== one.codes.join(',')) {
      throw new ScreenTextError(`${what} is drawn in other glyph codes than it spells`);
    }
    if (inline) tally.inline += 1;
    else tally.references += 1;
    if (inline && joiner !== undefined && one.codes.includes(joiner)) tally.joined += 1;
  });
  const out = layOutContainer(withScreenTexts(layout, built, d.place)).bytes;
  if (out.length !== c.blob.length) {
    throw new ScreenTextError(`the texts built are ${out.length - c.blob.length} bytes longer than the configuration's`);
  }
  const k = out.findIndex((byte, i) => byte !== c.blob[i]);
  if (k >= 0) throw new ScreenTextError(`the configuration differs from its texts built at byte ${k}`);
  return tally;
}
