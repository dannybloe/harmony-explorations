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
 *
 * **Since `todo.md` 7.3.9 the families are read off the directory**, so the import pattern covers every family and
 * not the two it named when it was written: until then a shared module importing the Harmony 300 and 350's, the
 * Harmony 880 and 885's or the Harmony Touch's folder passed. The four entries at the top are exempt from that
 * pattern and from the family's names, since publishing a family's parts is what an entry is for, the `architecture`
 * skill; the names were counted in `build.ts` once 7.3.9 put the Harmony One's whole builds there, and failed. And the last test
 * holds that no family imports another, which the skill's check over a diff was the only thing holding before.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';

const SOURCE = new URL('../../src/', import.meta.url).pathname;

/**
 * Every family's folder, read off `families/` rather than listed, so a family added there is covered by the import
 * pattern and the cross family check below without anybody remembering to name it. The control holds the list to
 * the five folders there are, so a read that found nothing fails rather than passing everything.
 */
const FAMILY_FOLDERS: readonly string[] = readdirSync(join(SOURCE, 'families'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

/** The entries at the top of `src`, the one place outside the families that may name a family's module. */
const ENTRIES: ReadonlySet<string> = new Set(['index.ts', 'build.ts', 'internal.ts', 'node.ts']);

/**
 * The Harmony One family's own names, read off its modules' exports. Until plan 013 step 7.3.2 the family was
 * `touch` and a prefix pattern caught its names; `one` as a prefix also catches `oneMark` and `oneBlockCopy`,
 * which are ordinary words, so the names are listed from the family itself, those that carry its name.
 */
const ONE_FAMILY_NAMES: readonly string[] = readdirSync(join(SOURCE, 'families/harmony-one'))
  .flatMap((file) => [...readFileSync(join(SOURCE, 'families/harmony-one', file), 'utf8')
    .matchAll(/export (?:const|function|type|interface|class) ([A-Za-z0-9_]+)/g)].map((m) => m[1]!))
  // The family constant itself is left out, as `TOUCH` was: `wiringparts.ts` has an `ONE` of its own, a name per symbol.
  .filter((name) => /one/i.test(name) && name !== 'ONE')
  .sort((a, b) => b.length - a.length);

const PATTERNS: Readonly<Record<string, RegExp>> = {
  // A test of which remote it is: an architecture or skin compared with a number, an architecture's slot or a
  // per architecture table handed a literal architecture. A table of architectures, `*_ARCHITECTURES`, is how a
  // reader is meant to hold one, and is not counted.
  architecture: /\b(architecture|arch)\s*(===|!==)\s*\d+\b|archSlot\(\s*\d+\s*,|\.skin\s*(===|!==)\s*\d+|(firmwareStateVariableMax\(|SCREEN_SIZES\[|VALUE_MAP_COUNT_WIDTH\[|CORNER_LAYOUTS\[)\s*\d+/g,
  // A name belonging to one family. The base slot 17 reader's own names, `touchPages` and its kin, name the
  // Harmony One's touch screen rather than a family, so they no longer match since the family became `one`.
  family: new RegExp(`\\b(FOUR_SLOT_[A-Z_]+|fourSlot[A-Za-z]*|FourSlot[A-Za-z]*|${ONE_FAMILY_NAMES.join('|')}|DEVICE_PAGE_[A-Z_]+|MENU_ROW[A-Z_]*)\\b`, 'g'),
  // Key scan codes, one keypad's: a constant named for them, or a table entry giving one.
  scans: /^(export )?const [A-Z_]*(SCAN|SCANS)\b|\bscan:\s*\d+/gm,
  // A set of skins or a model named by its string: which remote, by another name.
  models: /_SKINS\b[^\n]*new (Set|Map)\(\[|(===|!==)\s*'harmony-\d{3}'/g,
  // A family's module imported from outside the families, which reaches its internals past `familyOf`. Every
  // family's folder since `todo.md` 7.3.9, where it named the Harmony 600 family's and the Harmony One's alone.
  imports: new RegExp(`from '(\\.\\.?\\/)+families\\/(${FAMILY_FOLDERS.join('|')})\\/`, 'g'),
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
 * Since 3.3.3.2's second run `wiring.ts` is the four slot family's, `families/harmony-600-650-700/wiring.ts`, and so are
 * mode 0's list and the keypad's scan range, `families/harmony-600-650-700/modezero.ts`, and the assembly with its skin
 * sets, `families/harmony-600-650-700/assemble.ts` and `skins.ts`; all three leave the list. `modezero.ts` keeps the key
 * list order every family's lists share and `assemble.ts` the renumbering of base slot 10, neither naming a
 * remote, and `screenrecords.ts` takes the wiring's description and the scan range through the family's index,
 * on the import it had, so none of its counts moves.
 *
 * Since 3.3.3.6 the Harmony 600, 650 and 700's corner layout is a reader's table keyed by architecture,
 * `CORNER_LAYOUTS` in `cornerlayout.ts`, which the four slot family takes under its own names through
 * `families/harmony-600-650-700/geometry.ts`, and the device list reader's two inline tests of the architecture are that table
 * and one more, so `inventory.ts` leaves the list; `compare.ts` reads the layout by the configuration's
 * architecture and keeps only its import of the family's index; `screenrecords.ts` takes the layout from the
 * family's index, on the import it had.
 *
 * And since 3.3.3.2's last run the list is empty: `screenrecords.ts` keeps the machinery every family builds a
 * mode record with and its three Harmony 600, 650 and 700 screens are that family's `screenrecords.ts`; the screen
 * part encoder both halves spell through is shared, `screenparts.ts`; `backgrounds.ts` and `compare.ts` are the
 * family's whole; `pictures.ts` keeps the drawing every family uses and the Harmony 650's pictures are the family's
 * `pictures.ts`; the skins a setup is composed for are `Family.composedSkins`; and `growth.ts`' two names that
 * read like the One family's were its own locals for base slot 17, renamed. A module that joins the list now
 * has to move its part into a family instead.
 */
const DEBT: Readonly<Record<string, Readonly<Record<string, number>>>> = {};

/** The names `compose.ts` passes through from a family's modules, read off its own `export { ... } from` lists. */
function familyNamesThroughCompose(): Set<string> {
  const text = readFileSync(join(SOURCE, 'compose', 'compose.ts'), 'utf8');
  const names = new Set<string>();
  const fromFamily = new RegExp(`export\\s*\\{([^}]*)\\}\\s*from\\s*'(?:\\.\\.?\\/)+families\\/(${FAMILY_FOLDERS.join('|')})\\/`, 'g');
  for (const match of text.matchAll(fromFamily)) {
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
        // An entry publishes a family's parts, `./build` the Harmony 300 and 350's and the Touch's, which is its job.
        // An entry publishes a family's parts, by its modules and by their names, which is what it is for.
        if ((kind === 'imports' || kind === 'family') && directory === SOURCE && ENTRIES.has(name)) continue;
        const count = ((kind === 'scans' ? withoutArchitectureTables(text) : text).match(pattern) ?? []).length;
        if (count > 0) (out[relative(SOURCE, path)] ??= {})[kind] = count;
      }
      if (name !== 'compose.ts') {
        let through = 0;
        for (const match of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*'(\.\.?\/)+(compose\/)?compose\.ts'/g)) {
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
 * A module's text with the bodies of its per architecture tables left out, `PerArchitecture` in `slots.ts`: a key
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
  // The second import is a family the pattern named no folder of before `todo.md` 7.3.9.
  const sample = 'if (c.architecture === 14) x = archSlot(12, 9);\nconst y = FOUR_SLOT_ITEMS;\nexport const EXIT_SCAN = 12;\n'
    + "const S_SKINS = new Set([72]);\nimport { a } from '../families/harmony-one/menus.ts';\n"
    + "import { b } from '../families/harmony-880-885/pages.ts';\n";
  const found = Object.fromEntries(Object.entries(PATTERNS).map(([kind, pattern]) => [kind, (sample.match(pattern) ?? []).length]));
  assert.deepEqual(found, { architecture: 2, family: 1, scans: 1, models: 1, imports: 2 });
  // The folders were read off the directory rather than found empty, which would make the pattern match nothing.
  assert.deepEqual(FAMILY_FOLDERS, ['harmony-300-350', 'harmony-600-650-700', 'harmony-880-885', 'harmony-one', 'harmony-touch']);
  // A scan inside a per architecture table is the table's, and the same entry outside one is counted.
  const table = 'const T: PerArchitecture<Item[]> = { 14: [{ scan: 8 }, { scan: 2 }] };\n';
  assert.equal((withoutArchitectureTables(table).match(PATTERNS.scans!) ?? []).length, 0);
  assert.equal((withoutArchitectureTables(`const u = [{ scan: 8 }];\n${table}`).match(PATTERNS.scans!) ?? []).length, 1);
});

/**
 * The module specifiers of a family's file that land in another family's folder, resolved against the file's own
 * folder, so `../harmony-one/x.ts` and `../../families/harmony-one/x.ts` are the same reach. Read by the compiler's
 * own scanner, so a comment naming another family's module, which is how a fact says where its other half is, and
 * a string that reads like an import are left alone; the scanner skips `export * as name from`, which a pattern
 * anchored at a line's start adds.
 */
function otherFamilies(family: string, file: string, text: string): string[] {
  const specifiers = ts.preProcessFile(text, true, true).importedFiles.map((one) => one.fileName);
  for (const match of text.matchAll(/^\s*export\s+\*\s+as\s+\w+\s+from\s+['"]([^'"]+)['"]/gm)) specifiers.push(match[1]!);
  const reached: string[] = [];
  for (const specifier of specifiers.filter((one) => one.startsWith('.'))) {
    const target = relative(join(SOURCE, 'families'), join(file, '..', specifier));
    const folder = target.split('/')[0]!;
    if (FAMILY_FOLDERS.includes(folder) && folder !== family) reached.push(`${folder}: ${specifier}`);
  }
  return reached;
}

test('no family imports another family\'s module, so each is reached through the registry alone', () => {
  // Plan 007 "The rules the structure keeps" and the `architecture` skill: a family that needs what another has
  // takes it from below both, `shared/` or a generic module, or states its own. The registry and the two
  // interfaces at the top of `families/` are not a family and are not scanned.
  const offending: string[] = [];
  const walked: string[] = [];
  for (const family of FAMILY_FOLDERS) {
    const walk = (directory: string): void => {
      for (const name of readdirSync(directory)) {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) { walk(path); continue; }
        if (!name.endsWith('.ts')) continue;
        walked.push(relative(SOURCE, path));
        for (const reach of otherFamilies(family, path, readFileSync(path, 'utf8'))) offending.push(`${relative(SOURCE, path)} -> ${reach}`);
      }
    };
    walk(join(SOURCE, 'families', family));
  }
  // The walk reached every family, by its index, rather than finding nothing and passing.
  for (const family of FAMILY_FOLDERS) assert.ok(walked.includes(`families/${family}/index.ts`), family);
  assert.deepEqual(offending, []);
});

test('the control: an import of another family is found however it is spelled, and a family\'s own is not', () => {
  const file = join(SOURCE, 'families', 'harmony-300-350', 'empty.ts');
  const text = "import { a } from '../harmony-one/empty.ts';\n"
    + "export { b } from '../../families/harmony-touch/view.ts';\n"
    + "const c = await import('../harmony-880-885/pages.ts');\n"
    + "export * as d from '../harmony-600-650-700/index.ts';\n"
    + "import { e } from './keys.ts';\nimport { f } from '../registry.ts';\nimport { g } from '../../shared/devices.ts';\n"
    + "/** See `../harmony-one/empty.ts`, from '../harmony-one/empty.ts'. */\n"
    + "const h = \"import { i } from '../harmony-one/empty.ts'\";\n";
  assert.deepEqual(otherFamilies('harmony-300-350', file, text), [
    'harmony-one: ../harmony-one/empty.ts',
    'harmony-touch: ../../families/harmony-touch/view.ts',
    'harmony-880-885: ../harmony-880-885/pages.ts',
    'harmony-600-650-700: ../harmony-600-650-700/index.ts',
  ]);
});
