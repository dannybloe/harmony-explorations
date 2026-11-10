/**
 * Build a recipe from nothing for whichever remote it names, `buildFromRecipe`, plan 014: a
 * configuration file for a compiled family, or for the Harmony Touch a folder of its six documents as JSON and its
 * pictures as PNG files. Opens no remote; sending is the write scripts' work, behind their rails.
 *
 *   node packages/codec/bin/build-recipe.ts --setup <recipe.json> --out <file or folder> --built-at YYYY-MM-DDTHH:MM:SS
 *        [--archive <checkout> | --no-archive] [--account <account.json>]
 *
 * The archive is needed only for a device the recipe does not carry: `--archive`, or `HARMONY_IR_ARCHIVE`, or the
 * checkout beside this repository when one is there. The account is the Harmony Touch's own identifiers, a file that
 * stays in the lab.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { IR_ARCHIVE } from '@harmony/lab';
import { commandLine, fail } from '@harmony/lab/cli';
import { archiveAt, buildFromRecipe, type BuildSources } from '../src/node.ts';

const cli = commandLine({
  usage: 'usage: node packages/codec/bin/build-recipe.ts --setup <recipe.json> --out <file or folder> --built-at YYYY-MM-DDTHH:MM:SS [--archive <checkout> | --no-archive] [--account <account.json>]',
  flags: ['no-archive'],
  values: ['setup', 'out', 'built-at', 'archive', 'account'],
});
const setup = cli.value('setup') ?? fail('--setup is the recipe to build');
const out = cli.value('out') ?? fail('--out is where the build goes');
const builtAt = cli.value('built-at') ?? fail('--built-at is the stamp, so a build can be repeated byte for byte');
// `--no-archive` builds from what the recipe carries alone, which is how a recipe's carried codes are checked.
const archivePath = cli.flag('no-archive') ? undefined : cli.value('archive') ?? IR_ARCHIVE;
const accountPath = cli.value('account');

const sources: BuildSources = {
  builtAt,
  ...(archivePath === undefined ? {} : { archive: archiveAt(archivePath) }),
  ...(accountPath === undefined ? {} : { account: JSON.parse(readFileSync(accountPath, 'utf8')) as NonNullable<BuildSources['account']> }),
};
const built = buildFromRecipe(JSON.parse(readFileSync(setup, 'utf8')), sources);
if (built.kind === 'configuration') {
  writeFileSync(out, built.bytes);
  console.log(`${out}: the ${built.model}, skin ${built.skin}, ${built.bytes.length} bytes, built at ${builtAt}`);
} else {
  mkdirSync(out, { recursive: true });
  for (const [name, document] of Object.entries(built.documents)) writeFileSync(join(out, `${name}.json`), `${JSON.stringify(document, null, 1)}\n`);
  for (const picture of built.pictures) writeFileSync(join(out, picture.uri.split('/').pop()!), picture.png);
  console.log(`${out}: the ${built.model}, ${Object.keys(built.documents).length} documents and ${built.pictures.length} pictures, built at ${builtAt}`);
}
