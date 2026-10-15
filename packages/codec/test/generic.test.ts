/**
 * Code outside `src/families/` is generic, plan 007 and the `code-for-a-family` skill: it names no remote. This
 * holds that executably for the shapes a pattern can find, and lists every module that still breaks it as the
 * debt, `todo-compile-one.md` 3.3.
 *
 * Three shapes are counted per module: a test of which remote it is (an architecture or skin compared with a
 * number, an architecture's slot named by number, a set of architectures), a name belonging to one family (the
 * four slot family's and the touch family's constants and functions), and a constant of key scan codes, which
 * are one keypad's. **This is a floor and not the audit**: a module can hold one remote's coordinates, fonts or
 * counts under names no pattern knows, `wiring.ts` holding the Harmony 600 family's parameter values among them,
 * and the module by module audit is 3.3's.
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
  architecture: /\b(architecture|arch)\s*(===|!==)\s*\d+\b|archSlot\(\s*\d+\s*,|\.skin\s*(===|!==)\s*\d+|ARCHITECTURES\b[^\n]*new Set\(\[\s*\d/g,
  family: /\b(FOUR_SLOT_[A-Z_]+|fourSlot[A-Za-z]*|FourSlot[A-Za-z]*|TOUCH_[A-Z_]+|touch[A-Z][A-Za-z]*|DEVICE_PAGE_[A-Z_]+|MENU_ROW[A-Z_]*)\b/g,
  scans: /^(export )?const [A-Z_]*(SCAN|SCANS)\b/gm,
};

/** Every module outside `families/` that names a remote, with how often, as of `todo-compile-one.md` 3.3's start. */
const DEBT: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  'actions.ts': { architecture: 4 },
  'activitykeys.ts': { architecture: 1 },
  'activityroles.ts': { scans: 6 },
  'assemble.ts': { architecture: 2, family: 12 },
  'backgrounds.ts': { architecture: 3, family: 1 },
  'blending.ts': { architecture: 1 },
  'compare.ts': { architecture: 1, family: 5 },
  'compose.ts': { family: 18 },
  'coverage.ts': { family: 7 },
  'devicemode.ts': { family: 12 },
  'emit.ts': { architecture: 1, family: 6 },
  'firmwarescreens.ts': { architecture: 1, family: 2, scans: 2 },
  'font.ts': { architecture: 2 },
  'fonttable.ts': { architecture: 4 },
  'frame.ts': { family: 3 },
  'growth.ts': { family: 12 },
  'inputs.ts': { architecture: 1 },
  'inventory.ts': { architecture: 2, family: 27 },
  'lettering.ts': { family: 2 },
  'modezero.ts': { scans: 3 },
  'pictures.ts': { architecture: 1, family: 1 },
  'recipe/recipe.ts': { family: 1 },
  'screen.ts': { architecture: 2, family: 2 },
  'screencategories.ts': { architecture: 1 },
  'screenrecords.ts': { architecture: 2, family: 25 },
  'screentexts.ts': { architecture: 1, family: 26 },
  'sections.ts': { architecture: 3 },
  'shared/activities.ts': { architecture: 1 },
  'tables.ts': { architecture: 3, family: 14 },
  'touch.ts': { family: 4 },
  'wiring.ts': { scans: 3 },
};

function census(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  const walk = (directory: string): void => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) {
        if (name !== 'families') walk(path);
        continue;
      }
      if (!name.endsWith('.ts')) continue;
      const text = readFileSync(path, 'utf8');
      for (const [kind, pattern] of Object.entries(PATTERNS)) {
        const count = (text.match(pattern) ?? []).length;
        if (count > 0) (out[relative(SOURCE, path)] ??= {})[kind] = count;
      }
    }
  };
  walk(SOURCE);
  return out;
}

test('code outside the families names no remote but in the modules of the debt list, each as often as listed', () => {
  assert.deepEqual(census(), DEBT);
});

test('the census finds each shape it counts, so an empty count is the code\'s and not a blind pattern', () => {
  // The control: one line of each shape, which every pattern has to find once.
  const sample = 'if (c.architecture === 14) x = archSlot(12, 9);\nconst y = FOUR_SLOT_ITEMS;\nexport const EXIT_SCAN = 12;\n';
  const found = Object.fromEntries(Object.entries(PATTERNS).map(([kind, pattern]) => [kind, (sample.match(pattern) ?? []).length]));
  assert.deepEqual(found, { architecture: 2, family: 1, scans: 1 });
});
