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
 * `composecatalogue.ts`, and 3.3.3 moves them all the same.
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
  architecture: /\b(architecture|arch)\s*(===|!==)\s*\d+\b|archSlot\(\s*\d+\s*,|\.skin\s*(===|!==)\s*\d+|(firmwareStateVariableMax\(|SCREEN_SIZES\[|VALUE_MAP_COUNT_WIDTH\[)\s*\d+/g,
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

/** Every module outside `families/` that names a remote, with how often, as of `todo-compile-one.md` 3.3's start. */
const DEBT: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  'activitykeys.ts': { architecture: 1 },
  'assemble.ts': { architecture: 2, family: 11, models: 3, imports: 5 },
  'backgrounds.ts': { architecture: 3, models: 4, barrel: 2 },
  'compare.ts': { family: 5, barrel: 1 },
  'compose.ts': { family: 18, imports: 7 },
  'devicemode.ts': { family: 9, scans: 41 },
  'firmwarescreens.ts': { architecture: 1, family: 2, scans: 2, models: 2, barrel: 2 },
  'fonttable.ts': { architecture: 4 },
  'growth.ts': { family: 6 },
  'inventory.ts': { architecture: 2, family: 17, scans: 4 },
  'modezero.ts': { scans: 3, models: 1 },
  'pictures.ts': { architecture: 1 },
  'screenrecords.ts': { architecture: 2, family: 21, imports: 1, barrel: 18 },
  'screentexts.ts': { architecture: 1, family: 23, barrel: 8 },
  'shared/activities.ts': { architecture: 1 },
  'shared/setup.ts': { models: 1 },
  'wiring.ts': { scans: 3, models: 5 },
};

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
        const count = (text.match(pattern) ?? []).length;
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
});
