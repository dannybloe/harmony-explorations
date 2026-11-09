/**
 * A recipe given its codes out of the infrared archive, plan 014 and `todo.md` 7.3.11.1: every device's definition and
 * the protocol definitions its commands use, written into a copy of the recipe, so a build of that copy needs no
 * archive. `carryCodes` in `src/catalogue/carried.node.ts` does the work.
 *
 *   node packages/codec/bin/carry-codes.ts --setup <recipe.json> --out <recipe.json> [--archive <checkout>]
 *
 * The archive is `--archive`, or `HARMONY_IR_ARCHIVE`, or the checkout beside this repository.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { IR_ARCHIVE } from '@harmony/lab';
import { commandLine, fail } from '@harmony/lab/cli';
import { carryCodes } from '../src/node.ts';

const cli = commandLine({
  usage: 'usage: node packages/codec/bin/carry-codes.ts --setup <recipe.json> --out <recipe.json> [--archive <checkout>]',
  values: ['setup', 'out', 'archive'],
});
const setup = cli.value('setup') ?? fail('--setup is the recipe to carry codes into');
const out = cli.value('out') ?? fail('--out is where the recipe with its codes goes');
const archive = cli.value('archive') ?? IR_ARCHIVE ?? fail('no archive: pass --archive, set HARMONY_IR_ARCHIVE or clone it beside this repository');

const carried = carryCodes(JSON.parse(readFileSync(setup, 'utf8')) as Record<string, unknown>, archive);
writeFileSync(out, `${JSON.stringify(carried, null, 1)}\n`);
const devices = carried['devices'] as { definition: { commands: unknown[] } }[];
console.log(`${out}: ${devices.length} devices, ${devices.reduce((n, d) => n + d.definition.commands.length, 0)} commands, ${(carried['protocols'] as unknown[]).length} protocols carried`);
