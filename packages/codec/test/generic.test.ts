/**
 * Code outside `src/families/` is generic, plan 007 and the `code-for-a-family` skill: it names no remote. This
 * holds that executably for the shapes a pattern can find, and lists every module that still breaks it as the
 * debt, `todo-compile-one.md` 3.3.
 *
 * Six shapes are counted per module, comments left out: a test of which remote it is, a name belonging to one
 * family, key scan codes, a set of skins or a model named by its string, a family's module imported directly,
 * and a family's name imported through `compose.ts`'s re-exports, `PATTERNS`. **This is a floor and not the
 * audit**: a module can hold one remote's coordinates, fonts or counts under names no pattern knows. The module
 * by module audit, `todo-compile-one.md` 3.3.2, found the rest: five modules remote specific in substance that the
 * patterns here count in part or not at all, `statetables.ts`, `shared/devices.ts`, `shared/setup.ts`, `sequence.ts` and
 * `composecatalogue.ts`, and 3.3.3 moves them all the same; `statetables.ts`' four slot facts are the family's
 * since 3.3.3.3, the builder taking them from `Family.stateTables`.
 *
 * The counts are asserted exactly, so a module joining the list or a count rising fails, and so does one falling,
 * which is the moment to lower the list and keep the gain. **Never add a module or raise a count to make a commit
 * pass**: move the remote specific part into its family.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SOURCE = new URL('../src/', import.meta.url).pathname;

const PATTERNS: Readonly<Record<string, RegExp>> = {
  // A test of which remote it is: an architecture or skin compared with a number, an architecture's slot or a
  // per architecture table handed a literal architecture. A table of architectures, `*_ARCHITECTURES`, is how a
  // reader is meant to hold one, and is not counted.
  architecture: /\b(architecture|arch)\s*(===|!==)\s*\d+\b|archSlot\(\s*\d+\s*,|\.skin\s*(===|!==)\s*\d+|(firmwareStateVariableMax\(|SCREEN_SIZES\[|VALUE_MAP_COUNT_WIDTH\[|CORNER_LAYOUTS\[)\s*\d+/g,
  // A name belonging to one family. The base slot 17 reader's own names, `touchPages` and its kin, are a
  // reader's and are left out.
  family: /\b(FOUR_SLOT_[A-Z_]+|fourSlot[A-Za-z]*|FourSlot[A-Za-z]*|TOUCH_(?!MAP_|AREA_)[A-Z_]+|touch(?!Pages|MapStart|PageOf|Owner|Area)[A-Z][A-Za-z]*|DEVICE_PAGE_[A-Z_]+|MENU_ROW[A-Z_]*)\b/g,
  // Key scan codes, one keypad's: a constant named for them, or a table entry giving one.
  scans: /^(export )?const [A-Z_]*(SCAN|SCANS)\b|\bscan:\s*\d+/gm,
  // A set of skins or a model named by its string: which remote, by another name.
  models: /_SKINS\b[^\n]*new (Set|Map)\(\[|(===|!==)\s*'harmony-\d{3}'/g,
  // A family's module imported from outside the families, which reaches its internals past `familyOf`.
  imports: /from '(\.\.?\/)+families\/(four-slot|touch)\//g,
};

/**
 * Every module outside `families/` that names a remote, with how often, as of `todo-compile-one.md` 3.3's start.
 *
 * Since 3.3.3.3 `compose.ts` passes nothing of a family's through, so no module has a `barrel` count left: the
 * three four slot modules still outside the family that took a family's names that way, `backgrounds`,
 * `compare` and `screenrecords`, import them from the family's index instead, which shows as one import
 * each where the barrel counted the names, `screenrecords`' joining the import it had.
 *
 * Since 3.3.3.5 `fonttable.ts` asks the family which face a set becomes, whether sets share a glyph and whether
 * its faces were measured on the skin, `Family.fonts`, and `backgrounds.ts` takes the Harmony 650's skin set from
 * the family's index, through the import it had, rather than defining it.
 *
 * Since 3.3.3.4 `shared/activities.ts` asks the family whether composing an activity changes its wiring,
 * `Family.activityRewiring`, where it tested the architecture, and leaves the list; a send's shape and an
 * activity's start are family members too, `Family.sends` and `Family.activityStart`, which the patterns here
 * counted in no module, since each was a test of a trait rather than of the architecture.
 *
 * Since 3.3.3.2's second run `wiring.ts` is the four slot family's, `families/four-slot/wiring.ts`, and so are
 * mode 0's list and the keypad's scan range, `families/four-slot/modezero.ts`, and the assembly with its skin
 * sets, `families/four-slot/assemble.ts` and `skins.ts`; all three leave the list. `modezero.ts` keeps the key
 * list order every family's lists share and `assemble.ts` the renumbering of base slot 10, neither naming a
 * remote, and `screenrecords.ts` takes the wiring's description and the scan range through the family's index,
 * on the import it had, so none of its counts moves.
 *
 * Since 3.3.3.6 the Harmony 600, 650 and 700's corner layout is a reader's table keyed by architecture,
 * `CORNER_LAYOUTS` in `cornerlayout.ts`, which the four slot family takes under its own names through
 * `families/four-slot/geometry.ts`, and the device list reader's two inline tests of the architecture are that table
 * and one more, so `inventory.ts` leaves the list; `compare.ts` reads the layout by the configuration's
 * architecture and keeps only its import of the family's index; `screenrecords.ts` takes the layout from the
 * family's index, on the import it had.
 *
 * And since 3.3.3.2's last run the list is empty: `screenrecords.ts` keeps the machinery every family builds a
 * mode record with and its three Harmony 600, 650 and 700 screens are that family's `screenrecords.ts`; the screen
 * part encoder both halves spell through is shared, `screenparts.ts`; `backgrounds.ts` and `compare.ts` are the
 * family's whole; `pictures.ts` keeps the drawing every family uses and the Harmony 650's pictures are the family's
 * `pictures.ts`; the skins a setup is composed for are `Family.composedSkins`; and `growth.ts`' two names that
 * read like the touch family's were its own locals for base slot 17, renamed. A module that joins the list now
 * has to move its part into a family instead.
 */
const DEBT: Readonly<Record<string, Readonly<Record<string, number>>>> = {};

/** The names `compose.ts` passes through from a family's modules, read off its own `export { ... } from` lists. */
function familyNamesThroughCompose(): Set<string> {
  const text = readFileSync(join(SOURCE, 'compose.ts'), 'utf8');
  const names = new Set<string>();
  for (const match of text.matchAll(/export\s*\{([^}]*)\}\s*from\s*'\.\/families\/(four-slot|touch)\//g)) {
    for (const one of match[1]!.split(',')) {
      const name = one.replace(/\btype\b/, '').split(/\s+as\s+/).at(-1)!.trim();
      if (name !== '') names.add(name);
    }
  }
  return names;
}

function census(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  // A family's internals reached through `compose.ts`'s re-exports, past the direct import pattern.
  const passed = familyNamesThroughCompose();
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        if (name !== 'families') walk(path);
        continue;
      }
      if (!name.endsWith('.ts')) continue;
      // Comments are where a module says which remotes a fact was measured on, which is what they are for.
      const text = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');
      for (const [kind, pattern] of Object.entries(PATTERNS)) {
        const count = ((kind === 'scans' ? withoutArchitectureTables(text) : text).match(pattern) ?? []).length;
        if (count > 0) (out[relative(SOURCE, path)] ??= {})[kind] = count;
      }
      if (name !== 'compose.ts') {
        let through = 0;
        for (const match of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(\.\.?\/)+compose\.ts'/g)) {
          through += match[1]!.split(',').map((one) => one.replace(/\btype\b/, '').split(/\s+as\s+/)[0]!.trim())
            .filter((one) => passed.has(one)).length;
        }
        if (through > 0) (out[relative(SOURCE, path)] ??= {}).barrel = through;
      }
    }
  };
  walk(SOURCE);
  return out;
}

/**
 * A module's text with the bodies of its per architecture tables left out, `PerArchitecture` in `gspm.ts`: a key
 * scan inside one is a reader's table holding a remote's fact, plan 007's sanctioned form, where a scan anywhere
 * else is code knowing one keypad. Only the scans are counted this way; a table indexed with a literal
 * architecture is still the architecture pattern's. Since `todo-compile-one.md` 3.3.3.6, whose corner layout is
 * the first such table holding scans.
 */
function withoutArchitectureTables(text: string): string {
  let out = text;
  for (;;) {
    const head = /:\s*PerArchitecture<[^=]*=\s*\{/.exec(out);
    if (head === null) return out;
    let depth = 0;
    let end = head.index + head[0].length - 1;
    for (; end < out.length; end += 1) {
      if (out[end] === '{') depth += 1;
      else if (out[end] === '}' && --depth === 0) break;
    }
    out = out.slice(0, head.index) + out.slice(end + 1);
  }
}

// `GENERIC_CENSUS=1` prints the census as the list's source, for lowering it after a move.
if (process.env.GENERIC_CENSUS === '1') console.log(JSON.stringify(census()));

test('code outside the families names no remote but in the modules of the debt list, each as often as listed', () => {
  assert.deepEqual(census(), DEBT);
});

test('the census finds each shape it counts, so an empty count is the code\'s and not a blind pattern', () => {
  // The control: one line of each shape, which every pattern has to find once.
  const sample = 'if (c.architecture === 14) x = archSlot(12, 9);\nconst y = FOUR_SLOT_ITEMS;\nexport const EXIT_SCAN = 12;\n'
    + "const S_SKINS = new Set([72]);\nimport { a } from '../families/touch/menus.ts';\n";
  const found = Object.fromEntries(Object.entries(PATTERNS).map(([kind, pattern]) => [kind, (sample.match(pattern) ?? []).length]));
  assert.deepEqual(found, { architecture: 2, family: 1, scans: 1, models: 1, imports: 1 });
  // A scan inside a per architecture table is the table's, and the same entry outside one is counted.
  const table = 'const T: PerArchitecture<Item[]> = { 14: [{ scan: 8 }, { scan: 2 }] };\n';
  assert.equal((withoutArchitectureTables(table).match(PATTERNS.scans!) ?? []).length, 0);
  assert.equal((withoutArchitectureTables(`const u = [{ scan: 8 }];\n${table}`).match(PATTERNS.scans!) ?? []).length, 1);
});
