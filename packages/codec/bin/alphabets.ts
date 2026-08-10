/**
 * Regenerate `src/alphabets.ts`, the table from a glyph's pixels to the character it draws.
 *
 * ```
 * node packages/codec/bin/alphabets.ts            report what the seeds produce and check the file
 * node packages/codec/bin/alphabets.ts --write    rewrite src/alphabets.ts
 * ```
 *
 * **The seeds below are the only hand read thing in this codec**, and they are the reason the rest
 * of it is mechanical. A glyph code is an index into base slot 7 assigned per config, so nothing in
 * a container says which character a code stands for. What is stable is the typeface: the same
 * character at the same size has the same pixels in every config of that skin. So one config per
 * typeface was rendered as ASCII art and read, and every other config is then decoded by matching
 * pixels. `docs/findings.md` section 112.
 *
 * How to read a new seed, when a container turns up that no alphabet explains:
 *
 * 1. `node packages/codec/bin/text.ts --detail` names the container and how much is unread.
 * 2. Render its alphabet: the union of its font sets, tallest set first, one block per code.
 * 3. Read the blocks and write the string here, one character per code, code 1 first.
 * 4. Check it by decoding: boilerplate the generator emits comes out as English words, and a
 *    device name comes out matching base slot 0's ASCII spelling of it.
 *
 * Two traps, both of which cost time here:
 *
 * * **Count the string, do not eyeball it.** A missing character shifts every code after it, and
 *   the result still decodes to something. One seed was written with `t` left out and produced
 *   "V2 cme" for "Volume", which reads as a font problem rather than as an off by one.
 * * **A code can be blank in the set you render and a letter in another.** Render the union, not
 *   one set, or `V`, `?` and `x` come out as spaces.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { load } from '@harmony/lab';
import { parse, fontSets, glyphAt, shapeKey, isBlank, screenStrings, characterMap } from '../src/index.ts';

/** Where an alphabet's shapes come from: a container, and what its codes mean. */
interface Source {
  container: string;
  /**
   * One character per code, code 1 first, or a sparse table for a container that only fills gaps.
   * Absent when the container's codes are ASCII and therefore name themselves.
   */
  codes?: string | Readonly<Record<number, string>>;
}

/** A hand read alphabet: one typeface, its sources, and a string that proves it is not off by one. */
interface Seed {
  name: string;
  /**
   * More than one when a second config of the same typeface draws characters the first never does.
   * The 700 configs need `Z`, `Q`, `I`, an underscore and a quote that the 600's config has no
   * string for, and a second source is cheaper and more honest than pretending the first had them.
   */
  sources: Source[];
  /** A string the first source draws, decoded through the generated table. */
  proof: string;
}

const SEEDS: Seed[] = [
  {
    // The Harmony One's own skin, and the seed the whole method was worked out on. Codes 3 to 17
    // spell `Sun Mon Tue Wed Thu Fri Sat` in first appearance order, which is what showed that the
    // assignment follows the generator's string list; code 10 is `W` and is absent from most of its
    // sets, so it was predicted from that order before it was rendered.
    name: 'one',
    sources: [
      {
        container: 'one_spare_after_sync',
      codes: 'HySunMoTeWdhFriat12:34567890/ blvsw!OKUBCcpfgL.mGIzkREDPAq\\NV?Yx,"\'-j JQX',
      },
      // For the plus sign, which only the other Harmony One config draws, once.
      { container: 'one_config', codes: { 72: '+' } },
    ],
    proof: 'The battery level is low!',
  },
  {
    // Arch 14, and it covers the 700 as well as the 600, so the typeface is the architecture's
    // rather than the model's.
    name: 'h600',
    sources: [
      {
        container: 'h600_config',
        codes: "Hy/( 0sec).123456789aUthrmonupfwdAivbExSBCLIlgRTGWZkDPFMq\\NOV?Y,-+!KXj'",
      },
      // The 700 pair, for five characters the 600's config never draws. Each was read from its
      // glyph and then confirmed by the word it sits in: `HDMI`, `Zoom`, an underscore inside a
      // label, the quotes around `"Help"`, and a button label beginning with the letter.
      { container: 'h700_config', codes: { 47: 'I', 70: 'Z', 71: '_', 72: '"', 75: 'Q' } },
    ],
    proof: 'Display',
  },
  {
    // Arch 8. Its codes 3 to 13 are `1 2 : 3 4 5 6 7 8 9 0`, the same run the One's codes 18 to 28
    // are, which is the clearest sign that all these generators walk a similar list.
    name: 'arch8',
    sources: [
      {
        container: 'arch8_config_a',
        codes: "Hy12:34567890AMPOFaBter lvow!chmingsdb.\"->USCNETDGWupIzLkRfq\\V?Yxj/',KJ+QXZ",
      },
      // One config of the four names a device with brackets in it, which is the only place the
      // corpus draws either.
      { container: 'arch8_config_c', codes: { 67: '(', 68: ')' } },
    ],
    proof: 'Everything is OK >',
  },
  {
    // Arch 9, the Harmony 525. Two thirds of this was derived rather than read, from the ASCII
    // alphabet below: the two containers share a typeface, so the safe mode one names the user
    // one's shapes. Only what the safe mode container never draws had to be read.
    name: 'h525',
    sources: [{
      container: 'h525_config',
      codes: 'HyOFaTermint EUSBCNDpgducs0:o2flL.wGWbIzkRPhAMq\\vV-X361?Y8x+/4#5Z~',
    }],
    proof: 'On / Off',
  },
  {
    // The arch 9 safe mode container draws ASCII outright, so its own codes name its shapes and
    // nothing here was read by eye. Its font sets start at code 32, which is `ASCII_FIRST_CODE`.
    name: 'ascii',
    sources: [{ container: 'h525_safemode_ahcm' }],
    proof: 'Choose Activity:',
  },
  {
    // The arch 12 safe mode container's typeface, which the user configs do not share: not one of
    // its 46 shapes matches theirs.
    name: 'one-safemode',
    sources: [{
      container: 'one_safemode',
      codes: 'HyGo tWebsiupdangUSBIlzrLckRTmCEDPhFAMfqw\\vNO.',
    }],
    // `Initialization` is what settled `I` against `l` and `z` against `Z`, all three of which the
    // eye reading had the wrong way round: this typeface draws each pair with one shape.
    proof: 'Bootloader',
  },
  {
    // Arch 14's safe mode typeface, which is a third one again: it shares nothing with either the
    // arch 12 safe mode container or the 600's own configs.
    name: 'h700-safemode',
    sources: [{
      container: 'h700_gspm',
      codes: 'HyaUpdte Sucsflgrino.LFmwGWbBIzkRTCEDPhAMq\\vNO',
    }],
    proof: 'Update Successful',
  },
];

const OUT = new URL('../src/alphabets.ts', import.meta.url);

function shapesOf(seed: Seed): { shapes: Record<string, string>; blank: number; unread: string[] } {
  const shapes = new Map<string, Set<string>>();
  let blank = 0;
  const unread: string[] = [];
  for (const source of seed.sources) {
    const c = parse(load(source.container) as Uint8Array);
    const missing: number[] = [];
    for (const set of fontSets(c) ?? []) {
      for (const [index, address] of set.glyphs.entries()) {
        if (address === undefined) continue;
        const glyph = glyphAt(c, address);
        if (glyph === undefined) continue;
        const code = set.first + index;
        // A blank glyph is a space wherever it appears, so it is deliberately no evidence: a font
        // set carries a blank slot for codes it does not draw, and the same code is a letter in
        // another set.
        if (isBlank(glyph)) {
          blank += 1;
          continue;
        }
        const character =
          source.codes === undefined
            ? String.fromCharCode(code)
            : typeof source.codes === 'string'
              ? source.codes[code - 1]
              : source.codes[code];
        if (character === undefined) {
          if (!missing.includes(code)) missing.push(code);
          continue;
        }
        const key = shapeKey(set.height, glyph);
        if (!shapes.has(key)) shapes.set(key, new Set());
        (shapes.get(key) as Set<string>).add(character);
      }
    }
    // Only the first source is expected to be complete. A gap filling source says nothing about
    // the codes it was not written for, and reporting those as missing would be noise.
    if (source === seed.sources[0] && missing.length > 0) {
      unread.push(`${source.container}: ${missing.sort((a, b) => a - b).join(' ')}`);
    }
  }
  // A shape that draws two characters keeps both, which is how `I` and `l` stay honest rather than
  // whichever was written last silently winning.
  const out: Record<string, string> = {};
  for (const key of [...shapes.keys()].sort()) {
    out[key] = [...(shapes.get(key) as Set<string>)].sort().join('');
  }
  return { shapes: out, blank, unread };
}

/** The first source's own code string, which is what breaks a shape tie the pixels cannot. */
function seedCodes(seed: Seed): string | undefined {
  const codes = seed.sources[0]?.codes;
  return typeof codes === 'string' ? codes : undefined;
}

function render(built: { seed: Seed; shapes: Record<string, string> }[]): string {
  const head = `/**
 * GENERATED by \`node packages/codec/bin/alphabets.ts --write\`. Do not edit.
 *
 * Per typeface, a table from a glyph's pixels to the character it draws, plus the codes the seed
 * config itself used. The seeds and the method are in the generator; the reasoning is in
 * \`docs/findings.md\` section 112. A shape that draws more than one character carries all of them,
 * which is how the \`I\` and \`l\` ambiguity stays visible instead of being resolved by accident.
 */

/** One typeface's shapes, and what the config it was read from called each code. */
export interface Alphabet {
  name: string;
  /** The container the shapes were read from, for provenance. */
  container: string;
  /** One character per code, code 1 first. Absent when the container's codes are ASCII. */
  codes?: string;
  /** A glyph's \`shapeKey\` to the character or characters it draws. */
  shapes: Readonly<Record<string, string>>;
}

export const ALPHABETS: readonly Alphabet[] = [
`;
  const body = built
    .map(({ seed, shapes }) => {
      const entries = Object.entries(shapes)
        .map(([key, character]) => `    '${key}': ${JSON.stringify(character)},`)
        .join('\n');
      return `  {
    name: ${JSON.stringify(seed.name)},
    container: ${JSON.stringify(seed.sources.map((one) => one.container).join(' '))},
${seedCodes(seed) === undefined ? '' : `    codes: ${JSON.stringify(seedCodes(seed))},\n`}    shapes: {
${entries}
    },
  },`;
    })
    .join('\n');
  return `${head}${body}\n];\n`;
}

const built = SEEDS.map((seed) => {
  const { shapes, blank, unread } = shapesOf(seed);
  const codes = seedCodes(seed) === undefined ? 'ascii' : `${(seedCodes(seed) as string).length} codes`;
  console.log(
    `${seed.name.padEnd(14)} ${seed.sources.map((one) => one.container).join(' ').padEnd(36)} ${codes.padEnd(10)} ` +
      `${Object.keys(shapes).length} shapes, ${blank} blank` +
      (unread.length > 0 ? `, NOT IN THE SEED: ${unread.join('; ')}` : ''),
  );
  return { seed, shapes };
});

const text = render(built);
if (process.argv.includes('--write')) {
  writeFileSync(OUT, text);
  console.log(`\nwrote ${OUT.pathname}`);
} else {
  const current = (() => {
    try {
      return readFileSync(OUT, 'utf8');
    } catch {
      return undefined;
    }
  })();
  console.log(current === text ? '\nsrc/alphabets.ts is up to date' : '\nsrc/alphabets.ts DIFFERS, rerun with --write');
}

// The proof is the check that a seed is not off by one: a string the container draws, decoded
// through the table that was just built. It has to run against the generated table rather than the
// seed string, so that a mistake in the generator shows up here too.
console.log('');
for (const seed of SEEDS) {
  const c = parse(load(seed.sources[0]!.container) as Uint8Array);
  const map = characterMap(c);
  const strings = screenStrings(c, map);
  const found = strings.some((one) => one.text.includes(seed.proof));
  const read = strings.reduce((sum, one) => sum + one.text.length - one.unread, 0);
  const total = strings.reduce((sum, one) => sum + one.text.length, 0);
  console.log(
    `${seed.sources[0]!.container.padEnd(20)} alphabet ${String(map?.alphabet).padEnd(14)} ` +
      `${read}/${total} glyphs read, proof ${found ? 'FOUND' : 'MISSING: ' + JSON.stringify(seed.proof)}` +
      (map && map.ambiguous.size > 0 ? `, ambiguous ${[...map.ambiguous].map(([code, cands]) => `${code}:${cands.join('')}`).join(' ')}` : ''),
  );
}
