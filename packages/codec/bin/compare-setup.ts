/**
 * Two configurations of the same setup compared by what a person sees and hears, `todo-compile-650.md`
 * 5.2: every key and screen item in every activity, device mode and the idle state.
 *
 *   node packages/codec/bin/compare-setup.ts --a <lab name or file> --b <lab name or file> [--records] [--menu-order]
 *
 * Prints how many slots each file has, then every difference grouped by kind. Record differences, the
 * same command stored differently, are counted and only listed with `--records`, since they are what
 * the receiver cannot hear. `compare.ts` says what the comparison does not see.
 *
 * The activity menu is compared by which activities it holds and not by their order, unless
 * `--menu-order` is given: MyHarmony gives a Harmony 650 owner no control over that order, so ours
 * follows the setup description and Logitech's compiler picks its own, section 351.
 */
import { existsSync, readFileSync } from 'node:fs';

import { load } from '@harmony/lab';
import { compareViews, parse, setupView } from '../src/index.ts';

const argument = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const open = (name: string | undefined): Uint8Array => {
  if (name === undefined) throw new Error('--a and --b name a lab fixture or a file');
  if (existsSync(name)) return new Uint8Array(readFileSync(name));
  const blob = load(name);
  if (blob === undefined) throw new Error(`no file and no lab fixture called ${name}`);
  return blob;
};

const a = setupView(parse(open(argument('a'))));
const b = setupView(parse(open(argument('b'))));
const menuOrder = process.argv.includes('--menu-order');
const differences = compareViews(a, b, { menuOrder });
console.log(`a: ${a.size} slots, b: ${b.size} slots, ${differences.length} differences` +
  (menuOrder ? '' : ', the activity menu compared by which activities it holds'));
const kinds = ['only in a', 'only in b', 'label', 'frames', 'records'] as const;
for (const kind of kinds) {
  const of = differences.filter((one) => one.kind === kind);
  console.log(`\n${kind}: ${of.length}`);
  if (kind === 'records' && !process.argv.includes('--records')) continue;
  for (const one of of) {
    const show = (item: typeof one.a): string => item === undefined ? '' :
      `${item.label === undefined ? '' : `"${item.label}" `}${item.frames.join(', ') || 'sends nothing'}`;
    console.log(`  ${one.key}`);
    if (one.a !== undefined) console.log(`    a: ${show(one.a)}`);
    if (one.b !== undefined) console.log(`    b: ${show(one.b)}`);
  }
}
