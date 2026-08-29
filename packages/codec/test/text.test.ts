/**
 * What the screen says, and how much of it. `docs/findings.md` section 112.
 *
 * The tests that carry weight here are the negatives. A decoder that guesses produces readable
 * nonsense, which is indistinguishable from success unless something checks that a container whose
 * typeface is unknown reads as **nothing**, and that a shape which draws two characters says so
 * rather than picking one.
 *
 * No decoded string is asserted except through base slot 0, which is a section this decoder never
 * reads: a config's strings are its owner's own equipment names and this repository is public. The
 * closure is that the two agree, counted rather than quoted.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, skipUnless, skipWithoutLab, require_ } from '@harmony/lab';
import {
  ALPHABETS,
  ASCII_FIRST_CODE,
  SCREEN_TEXT_AT,
  SCREEN_TEXT_INLINE,
  characterMap,
  decode,
  decodedSet,
  drawnCodes,
  fontSets,
  glyphAt,
  glyphRunAt,
  isBlank,
  parse,
  reachablePrograms,
  referencedStringAddress,
  screenStrings,
  shapeKey,
  stateVariables,
  textCoverage,
  usesAscii,
} from '../src/index.ts';
import type { CharacterMap } from '../src/index.ts';

/** Every container in the corpus, and which alphabet each is expected to be read by. */
const EXPECTED: Readonly<Record<string, string>> = {
  one_safemode: 'one-safemode',
  one34_region2: 'one-safemode',
  h700_gspm: 'h700-safemode',
  h600_safemode_gspm: 'h700-safemode',
  h650_safemode_gspm: 'h700-safemode',
  one_config: 'one',
  one_config_unprogrammed: 'one',
  one_spare_before_sync: 'one',
  one_spare_after_sync: 'one',
  h600_config: 'h600',
  h700_config: 'h600',
  h700_config_2: 'h600',
  h525_config: 'h525',
  h525_config_2: 'h525',
  h525_safemode_ahcm: 'ascii',
  arch8_config_a: 'arch8',
  arch8_config_b: 'arch8',
  arch8_config_c: 'arch8',
  arch8_config_d: 'arch8',
  arch8_config_880: 'arch8',
  arch8_config_885: 'arch8',
};

const SAMPLES = Object.keys(EXPECTED);

/**
 * The two glyphs in the corpus whose character is not identified: one code, drawn once in each of
 * the two Harmony 700 configs, in a string that reads `Options` followed by it. Named here so that
 * "everything else decodes" is an assertion and not a rounding.
 */
const UNIDENTIFIED: Readonly<Record<string, number[]>> = {
  h700_config: [73],
  h700_config_2: [73],
};

test('every container in the corpus is read by the alphabet its typeface belongs to',
  skipUnless(...SAMPLES), () => {
    for (const [name, alphabet] of Object.entries(EXPECTED)) {
      const c = parse(load(name) as Uint8Array);
      assert.equal(characterMap(c)?.alphabet, alphabet, name);
    }
  });

test('every glyph the corpus draws has a character behind it, bar two that are named',
  skipUnless(...SAMPLES), () => {
    let glyphs = 0;
    let read = 0;
    for (const name of SAMPLES) {
      const c = parse(load(name) as Uint8Array);
      const map = characterMap(c) as CharacterMap;
      const coverage = textCoverage(c);
      glyphs += coverage.glyphs;
      read += coverage.read;
      const unread = [...drawnCodes(c)].filter((code) => !map.codes.has(code)).sort((a, b) => a - b);
      assert.deepEqual(unread, UNIDENTIFIED[name] ?? [], `${name} has unread codes`);
    }
    // Not a share: the count of unread glyphs, which is what a rounded percentage would hide.
    assert.equal(glyphs - read, 2);
    assert.equal(glyphs, 170922, 'every drawn glyph in the corpus, the `text_glyphs` figure');
  });

test('a string drawn on screen turns up verbatim inside a base slot 0 name, which this decoder never reads',
  skipUnless(...SAMPLES), () => {
    // The closure. Base slot 0 spells a state variable's name in ASCII, and a device's name is the
    // leading part of it: the drawn text is a different encoding of the same words, reached through
    // a different section, so agreement is not something the decoder could have arranged.
    let checked = 0;
    for (const name of SAMPLES) {
      const c = parse(load(name) as Uint8Array);
      const labels = stateVariables(c).map((v) => v.label.replace(/_/g, ' '));
      if (labels.length === 0) continue;
      const strings = [...new Set(screenStrings(c).map((one) => one.text))].filter(
        (text) => text.length >= 4,
      );
      const matched = strings.filter((text) => labels.some((label) => label.includes(text)));
      // The arch 9 safe mode container is the exception and says why: it names one variable and
      // draws none of it, because it holds no devices.
      if (name === 'h525_safemode_ahcm') {
        assert.equal(matched.length, 0);
      } else {
        assert.ok(matched.length > 0, `${name} draws nothing that a name spells`);
      }
      checked += 1;
    }
    assert.equal(checked, 16);
  });

test('the alphabets span four architectures and seven typefaces', skipWithoutLab(), () => {
  assert.equal(ALPHABETS.length, 7);
  const architectures = new Set<number | undefined>();
  for (const name of SAMPLES) {
    const blob = require_(name);
    architectures.add(parse(blob).architecture);
  }
  assert.deepEqual([...architectures].sort((a, b) => (a ?? 0) - (b ?? 0)), [8, 9, 12, 14]);
});

test('a config drawn with an unknown typeface reads as nothing rather than as nonsense',
  skipUnless('one_safemode', 'one_spare_after_sync'), () => {
    // The arch 12 safe mode container and the arch 12 user configs are the same architecture, the
    // same remote and the same font height, and they share not one shape. So a decoder keyed on
    // codes rather than on pixels would read one through the other's alphabet and produce words.
    const one = ALPHABETS.find((a) => a.name === 'one');
    const safemode = ALPHABETS.find((a) => a.name === 'one-safemode');
    assert.ok(one !== undefined && safemode !== undefined);
    const shared = Object.keys(safemode.shapes).filter((key) => key in one.shapes);
    assert.deepEqual(shared, []);
  });

test('a code with no character decodes to a marker, never to a guess', () => {
  const map: CharacterMap = {
    alphabet: 'test',
    codes: new Map([[1, 'A']]),
    ambiguous: new Map(),
    drawn: { resolved: 1, total: 2 },
  };
  assert.equal(decode(new Uint8Array([1, 2, 1]), map), 'A¿A');
  assert.equal(decode(new Uint8Array([2]), map, '?'), '?');
});

test('a shape is keyed by its font height, because I and l are one shape at some sizes', () => {
  const rows = [[1, undefined], [1, undefined]];
  assert.notEqual(
    shapeKey(14, { address: 0, width: 2, rows, length: 0 }),
    shapeKey(15, { address: 0, width: 2, rows, length: 0 }),
  );
  // Same height and same pixels is the same shape, whatever address it was read from.
  assert.equal(
    shapeKey(14, { address: 0, width: 2, rows, length: 0 }),
    shapeKey(14, { address: 0x40000, width: 2, rows, length: 0 }),
  );
});

test('a shape that draws two characters keeps both, so the ambiguity is reported not resolved',
  skipUnless(...SAMPLES), () => {
    // `I` and `l` are the same pixels in these typefaces at several sizes. That is a property of the
    // typeface, so no shape may claim one of them: the table keeps both and the code is settled, or
    // not, by something other than the pixels.
    //
    // Two pairs turn up, and both are pairs whose members are drawn the same on purpose: `I` against
    // `l`, and `O` against a zero with no slash through it.
    let both = 0;
    for (const alphabet of ALPHABETS) {
      for (const characters of Object.values(alphabet.shapes)) {
        if (characters.length === 1) continue;
        assert.ok(
          characters === 'Il' || characters === '0O',
          `${alphabet.name}: a shape draws ${characters}`,
        );
        both += 1;
      }
    }
    assert.equal(both, 22, 'shapes that draw two characters');
    // Wherever a container is left holding one, the pair is that same one and nothing else, and the
    // container still decodes: the fallbacks name a character rather than dropping the code.
    let ambiguous = 0;
    for (const name of SAMPLES) {
      const map = characterMap(parse(load(name) as Uint8Array)) as CharacterMap;
      for (const [code, candidates] of map.ambiguous) {
        assert.deepEqual([...candidates].sort(), ['I', 'l'], name);
        assert.ok(map.codes.has(code), `${name} code ${code} still decodes`);
        ambiguous += 1;
      }
    }
    assert.ok(ambiguous > 0, 'and at least one container is left with the pair');
  });

test('a container gives one code to one character, which is what settles I against l',
  skipUnless(...SAMPLES), () => {
    // The generator's own rule: a code is a position in the string list it walks, so no character is
    // on two codes. Asserted over the corpus because it is used as a resolver, and using a rule to
    // decide something without checking it holds is how three hand read seed labels survived. Each of
    // those three showed up here as a character on two codes at once, section 112.
    for (const name of SAMPLES) {
      const map = characterMap(parse(load(name) as Uint8Array)) as CharacterMap;
      const per = new Map<string, number[]>();
      for (const [code, character] of map.codes) {
        // A blank code is a space whatever the generator meant by it, so many codes share that one.
        if (character === ' ') continue;
        per.set(character, [...(per.get(character) ?? []), code]);
      }
      const twice = [...per].filter(([, codes]) => codes.length > 1);
      assert.deepEqual(twice, [], `${name} puts a character on two codes`);
    }
    // And the rule does work rather than merely holding: one_config draws `I` and `l` with identical
    // pixels at every size but one, so its `I` is settled only because its `l` is settled first.
    const c = parse(load('one_config') as Uint8Array);
    const map = characterMap(c) as CharacterMap;
    assert.equal(map.codes.get(32), 'l');
    assert.equal(map.codes.get(50), 'I');
  });

test('a blank glyph is a space and is no evidence about anything else',
  skipUnless('arch8_config_a'), () => {
    // Three arch 8 codes are blank in the tallest set that carries them and are `V`, `?` and `x`
    // in another. Reading the blank as evidence made all three decode as spaces.
    const c = parse(load('arch8_config_a') as Uint8Array);
    const map = characterMap(c) as CharacterMap;
    assert.equal(map.codes.get(62), 'V');
    assert.equal(map.codes.get(63), '?');
    assert.equal(map.codes.get(65), 'x');
    // And a code whose every glyph is blank is a space, which is what code 24 is here.
    assert.equal(map.codes.get(24), ' ');
    let blanks = 0;
    for (const set of fontSets(c) ?? []) {
      for (const address of set.glyphs) {
        if (address === undefined) continue;
        const glyph = glyphAt(c, address);
        if (glyph !== undefined && isBlank(glyph)) blanks += 1;
      }
    }
    assert.ok(blanks > 0, 'no blank glyphs, so this test proves nothing');
  });

test('the codes follow the order characters first appear in the generator string list',
  skipUnless('one_spare_after_sync'), () => {
    // Codes 3 to 17 of the Harmony One's alphabet are the distinct characters of the seven weekday
    // abbreviations in first appearance order. That is the mechanism, and it is what predicted that
    // code 10 is `W` before any set carrying it had been rendered.
    const alphabet = ALPHABETS.find((a) => a.name === 'one');
    assert.ok(alphabet?.codes !== undefined);
    const order: string[] = [];
    for (const character of 'SunMonTueWedThuFriSat') {
      if (!order.includes(character)) order.push(character);
    }
    assert.equal(alphabet.codes.slice(2, 2 + order.length), order.join(''));
    assert.equal(alphabet.codes[9], 'W');
  });

test('the arch 9 safe mode container states ASCII, and nothing else in the corpus does',
  skipUnless(...SAMPLES), () => {
    for (const name of SAMPLES) {
      const c = parse(load(name) as Uint8Array);
      assert.equal(usesAscii(c), name === 'h525_safemode_ahcm', name);
    }
    const c = parse(load('h525_safemode_ahcm') as Uint8Array);
    assert.equal(Math.min(...(fontSets(c) ?? []).map((set) => set.first)), ASCII_FIRST_CODE);
    // Which is why that alphabet needed no eye reading at all: the code is the character.
    assert.equal(ALPHABETS.find((a) => a.name === 'ascii')?.codes, undefined);
  });

test('the two arch 9 containers share a typeface, which is how the user one was derived',
  skipUnless('h525_config', 'h525_safemode_ahcm'), () => {
    // The ASCII container names the shapes and the user config reuses them under its own codes, so
    // two thirds of the arch 9 alphabet was read off the other container rather than by eye.
    const ascii = ALPHABETS.find((a) => a.name === 'ascii');
    const h525 = ALPHABETS.find((a) => a.name === 'h525');
    assert.ok(ascii !== undefined && h525 !== undefined);
    const shared = Object.keys(ascii.shapes).filter((key) => key in h525.shapes);
    assert.equal(shared.length, 48, 'shapes two alphabets have in common');
    for (const key of shared) {
      // The same pixels mean the same character in both, which is the claim that made the
      // derivation legitimate.
      const both = new Set([...(ascii.shapes[key] as string)].filter((one) =>
        (h525.shapes[key] as string).includes(one)));
      assert.ok(both.size > 0, `${key} disagrees`);
    }
  });

test('the same typeface serves the 600 and the 700, so it belongs to the architecture',
  skipUnless('h600_config', 'h700_config'), () => {
    for (const name of ['h600_config', 'h700_config', 'h700_config_2']) {
      const c = parse(load(name) as Uint8Array);
      assert.equal(characterMap(c)?.alphabet, 'h600', name);
    }
    // And the two remotes hand out different codes for the same characters, which is the reason
    // this is keyed on pixels: a shared code table would decode one of them wrongly.
    const a = characterMap(parse(load('h600_config') as Uint8Array)) as CharacterMap;
    const b = characterMap(parse(load('h700_config') as Uint8Array)) as CharacterMap;
    const differing = [...a.codes].filter(([code, character]) => {
      const other = b.codes.get(code);
      return other !== undefined && other !== character;
    });
    assert.ok(differing.length > 0, 'the two configs agree about every code, so nothing is proven');
  });

test('the commoner text opcode names a string another program carries', skipUnless(...SAMPLES), () => {
  // Section 121, and the closure is that there is **no exception**: every `SCREEN_TEXT_AT` target in
  // the corpus is the glyph payload of a `SCREEN_TEXT_INLINE` instruction somewhere in a reachable
  // program. So a string is stored once by whichever program draws it inline and referenced by every
  // other program that wants it, which is why the byte accounting closed while nobody had read this
  // opcode: the bytes were already claimed by the program holding them.
  let references = 0;
  let onAPayload = 0;
  let distinct = 0;
  for (const name of SAMPLES) {
    const data = require_(name);
    const c = parse(data);
    const programs = reachablePrograms(c);
    // Every place an inline string's glyphs begin: the instruction, plus its two position bytes.
    const payloads = new Set<number>();
    for (const [, instructions] of programs) {
      for (const one of instructions) {
        if (one.opcode === SCREEN_TEXT_INLINE && one.glyphs !== undefined) {
          payloads.add(one.start + 3);
        }
      }
    }
    const targets = new Set<number>();
    for (const [, instructions] of programs) {
      for (const one of instructions) {
        const address = referencedStringAddress(one);
        if (address === undefined) continue;
        references += 1;
        targets.add(address);
        const offset = c.blobOffsetOf(address);
        if (offset !== undefined && payloads.has(offset)) onAPayload += 1;
      }
    }
    distinct += targets.size;
    // And a container references far fewer strings than it draws, which is what makes this a shared
    // store rather than an odd way of spelling the same thing twice.
    const drawnByReference = [...programs.values()]
      .flat()
      .filter((one) => one.opcode === SCREEN_TEXT_AT).length;
    if (drawnByReference > 0) {
      assert.ok(targets.size <= drawnByReference, `${name}: ${targets.size} strings, ${drawnByReference} draws`);
    }
  }
  assert.equal(references, 15742, 'referenced strings, the `text_referenced` figure');
  assert.equal(onAPayload, references, 'every reference lands on an inline payload');
  assert.ok(distinct * 3 < references, `a string is shared: ${distinct} distinct, ${references} draws`);
});

test('a referenced draw is counted and marked, and there are more of them than inline ones',
  skipUnless(...SAMPLES), () => {
    // The correction section 121 makes to the coverage number. `screenStrings` and `textCoverage`
    // read only `SCREEN_TEXT_INLINE` until then, which was an undercount rather than a definition:
    // two thirds of the corpus's draws are references, so the old figure described a third of the
    // screen. A reader that regressed to inline only would pass every other test in this file.
    let inline = 0;
    let referenced = 0;
    for (const name of SAMPLES) {
      const data = require_(name);
      const c = parse(data);
      const coverage = textCoverage(c);
      inline += coverage.strings - coverage.referenced;
      referenced += coverage.referenced;
      // The two agree with each other, which is the check that `screenStrings` and `textCoverage`
      // cannot drift apart: they are two walks over the same programs.
      const strings = screenStrings(c);
      assert.equal(strings.length, coverage.strings, `${name}: draws counted the same way twice`);
      assert.equal(
        strings.filter((one) => one.referencedFrom !== undefined).length,
        coverage.referenced,
        `${name}: references counted the same way twice`,
      );
      // A marked draw really does point at a glyph run, and an unmarked one carries its own. The run
      // may be **empty**: nine references in each arch 8 config name a zero length string, which is a
      // blank label drawn at a position, and a reader that treated an empty run as a failure would
      // report those as unreadable text. So what is asserted is that the address resolves, not that
      // it resolves to something.
      for (const one of strings) {
        if (one.referencedFrom === undefined) continue;
        const run = glyphRunAt(c, one.referencedFrom);
        assert.ok(run !== undefined, `${name}: the reference at ${one.at} resolves`);
        assert.equal(one.text.length, run.length, `${name}: the draw at ${one.at} decodes its run`);
      }
    }
    assert.ok(referenced > inline, `references outnumber inline draws: ${referenced} to ${inline}`);
  });

test('a code that only ever appears in a referenced string is still a drawn code',
  skipUnless(...SAMPLES), () => {
    // Why `drawnCodes` had to change too. It scores which alphabet explains a container, so leaving
    // two thirds of the draws out of it was scoring the choice on a third of the evidence. The
    // assertion is the containment: every code an inline string draws is in the set, and so is every
    // code a referenced one draws.
    let seen = 0;
    for (const name of SAMPLES) {
      const data = require_(name);
      const c = parse(data);
      const codes = drawnCodes(c);
      for (const [, instructions] of reachablePrograms(c)) {
        for (const one of instructions) {
          const address = referencedStringAddress(one);
          const glyphs = address === undefined ? one.glyphs : glyphRunAt(c, address);
          if (glyphs === undefined || one.opcode === SCREEN_TEXT_AT === (address === undefined)) continue;
          for (const code of glyphs) assert.ok(codes.has(code), `${name}: code ${code} is drawn`);
          seen += glyphs.length;
        }
      }
    }
    // Every assertion above sits behind two `continue`s and there was no counter, so the containment
    // could have been checked on nothing at all. This is the number `make text` reports for the same
    // population, which is what the claim is about.
    assert.equal(seen, 170922, 'every drawn code checked for containment');
  });

test('a set states its glyph height and every route that has the set enforces it', skipWithoutLab(), () => {
  // `FontSet.height` said it was "checked against every decoded glyph" and nothing checked it: the
  // only comparison in the repository was an assertion in `screen.test.ts`, so the promise held for
  // the corpus and not for a caller. `decodedSet` and `glyphOf` refuse a glyph that disagrees now.
  // Section 139.
  let glyphs = 0;
  for (const name of SAMPLES) {
    const c = parse(require_(name));
    for (const set of fontSets(c) ?? []) {
      for (const { glyph } of decodedSet(c, set)) {
        assert.notEqual(glyph, undefined, `${name} set 0x${set.address.toString(16)}`);
        assert.equal((glyph as { rows: unknown[] }).rows.length, set.height);
        glyphs += 1;
      }
    }
  }
  // Every live glyph in the corpus, exactly, so the refusal costs nothing today and the number
  // moves in a diff rather than silently.
  assert.equal(glyphs, 5814);
});

test('a glyph whose height contradicts its set is refused rather than resolved', skipUnless('one_config'), () => {
  // The control, since the corpus cannot supply the case: flip a set's declared height and the
  // routes that hold the set stop answering, where they used to hand the resolver a glyph keyed by
  // a height its pixels do not have. `glyphAt` still answers, because it is given an address and no
  // set and therefore cannot know.
  const c = parse(require_('one_config'));
  const set = (fontSets(c) ?? [])[0] as { address: number; height: number; first: number };
  const before = decodedSet(c, set as never);
  assert.ok(before.length > 0 && before.every((d) => d.glyph !== undefined));
  const lying = { ...set, height: set.height + 1 };
  assert.ok(decodedSet(c, lying as never).every((d) => d.glyph === undefined));
  const address = (before[0] as { address: number }).address;
  assert.notEqual(glyphAt(c, address), undefined, 'glyphAt has no set and cannot check');
});

test('a glyph run with no terminator is refused, not truncated', skipUnless('one_config'), () => {
  // The guard was `end > c.blob.length`, so a run that walked to the last byte without meeting a
  // zero came back as a string. Unreachable in the corpus, since every container ends in a six byte
  // trailer, so the case is constructed. Section 139.
  const c = parse(require_('one_config'));
  const last = c.flashBase + c.blob.length - 1;
  const nonZero = c.blob[c.blob.length - 1] !== 0;
  assert.ok(nonZero, 'the constructed case needs the final byte to be nonzero');
  assert.equal(glyphRunAt(c, last), undefined);
  // And the positive control: a real referenced string still reads, so the guard did not simply
  // stop answering.
  const real = screenStrings(c).find((one) => one.referencedFrom !== undefined);
  assert.notEqual(real, undefined);
  assert.notEqual(glyphRunAt(c, (real as { referencedFrom: number }).referencedFrom), undefined);
});

/**
 * Hash every glyph in a container exactly once, which is the unit of work `resolveContext` does.
 *
 * This mirrors `resolveContext`'s inner loop deliberately rather than calling it, because the
 * point is to have a yardstick the test owns: if `resolveContext` starts costing seven times more,
 * this does not, and the comparison below is what notices.
 */
function hashEveryGlyphOnce(c: ReturnType<typeof parse>): void {
  for (const set of fontSets(c) ?? []) {
    for (const { glyph } of decodedSet(c, set)) {
      if (glyph === undefined || isBlank(glyph)) continue;
      shapeKey(set.height, glyph);
    }
  }
}

/**
 * The fastest of several runs, which is the estimator a loaded machine cannot inflate.
 *
 * Fifteen and not five, measured: at five the healthy ratio below spread from 1.08 to **2.80**
 * against a ceiling of 3, because the minimum of a short series is still noisy. At fifteen it
 * settles between 1.06 and 2.00.
 */
function fastestMs(run: () => void, times = 15): number {
  let best = Infinity;
  for (let i = 0; i < times; i += 1) {
    const started = process.hrtime.bigint();
    run();
    best = Math.min(best, Number(process.hrtime.bigint() - started) / 1e6);
  }
  return best;
}

test('resolving a container costs the pixel hash once, not once per alphabet', skipUnless('one_config'), () => {
  // **This measured against a fixed number of milliseconds until 29 August 2026, and it flaked.**
  // The bound was 12 ms, set from a control: with `shapeKey` put back inside the alphabet loop it
  // measured 15.3 ms against 4.7 ms as it stands. The control was right and the shape was wrong.
  // The healthy case, the broken case and ordinary machine noise all sit in the same narrow band,
  // so on a loaded machine this measured 12 to 27 ms and failed while nothing was wrong. Raising
  // the ceiling is not available: 15.3 is the bug, so any bound above it stops catching the bug.
  //
  // What the mistake really costs is not milliseconds, it is **a factor**, because the hash was
  // being redone once per alphabet and there are seven of them. So the test measures that factor
  // instead. One pass of hashing every glyph is the unit `resolveContext` spends; correct code
  // spends about one of them and the regression spends several. Both numbers are taken on the same
  // machine moments apart, so its speed and its load cancel out, and the fastest of fifteen runs is
  // used on each side because load can only ever make a run slower.
  //
  // **The review that prompted the original hoist named the wrong two inputs**: hoisting
  // `drawnCodes` and `usesAscii` moved `characterMap` from 31.2 ms to 33.4 ms. Section 139.
  const c = parse(require_('one_config'));
  // Warm both paths first, so neither measurement pays for the other's compilation.
  hashEveryGlyphOnce(c);
  characterMap(c);

  const unit = fastestMs(() => hashEveryGlyphOnce(c));
  const whole = fastestMs(() => characterMap(c));

  // **Four, and the number is measured rather than argued.** The first version of this line said
  // "three of the seven" and reasoned it: one unit for the context, and the per alphabet work is
  // cheap. Then the healthy case was actually run and reached 2.80, which is the same mistake the
  // old millisecond ceiling made, one line lower down. Measured on 29 August 2026, fifteen runs a
  // side: **healthy 1.06 to 2.00, and with `resolveContext` back inside the alphabet loop 6.43 to
  // 13.37.** So the two populations are a factor of three apart and 4 sits between them, at twice
  // the worst healthy reading and well under the best broken one.
  //
  // The healthy figure is not 1 because the seven alphabet comparisons are not free; they are
  // simply not where the cost was.
  const ceiling = unit * 4;
  assert.ok(
    whole < ceiling,
    `characterMap cost ${whole.toFixed(1)} ms against ${unit.toFixed(1)} ms for one hashing pass, ` +
      `a factor of ${(whole / unit).toFixed(1)} where ${ALPHABETS.length} alphabets would mean the ` +
      'per alphabet hashing is back',
  );
});
