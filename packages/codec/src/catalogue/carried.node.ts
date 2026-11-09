/**
 * A recipe given its codes out of an archive checkout, plan 014 and `todo.md` 7.3.11.1: every device the recipe names
 * by its catalogue entry gets its definition carried, the archive's record of it and its codeset's commands as a name
 * and a keycode each, and the recipe the protocol definitions those commands are written in. What a recipe carries is
 * read back by `carriedCatalogue`, `carried.ts`, which serves it as the archive would.
 *
 * **Which protocols**: those a carried command's keycode names, found by `catalogueProtocol`, the one reading of a
 * keycode's family the composers use, so a carried recipe holds exactly the definitions its build asks for. A keycode
 * naming no definition is refused, since a build would refuse it too.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { archiveProtocolsByName, catalogueProtocol } from '../compose/cataloguecodes.ts';
import { ArchiveError } from './archive.ts';
import { archiveAt } from './catalogue.node.ts';

type Json = Record<string, unknown>;

/** `recipe` as parsed JSON, with every device's definition and the protocols carried; the rest as it was. */
export function carryCodes(recipe: Json, root: string): Json {
  const protocols = archiveProtocolsByName(archiveAt(root));
  const used = new Map<string, unknown>();
  const devices = (recipe['devices'] as Json[]).map((device) => {
    const [slug, file] = String(device['device']).split('/') as [string, string];
    const record = JSON.parse(readFileSync(join(root, 'devices', slug, `${file}.json`), 'utf8')) as Json;
    const codeset = record['codeset'];
    if (typeof codeset !== 'string') throw new ArchiveError(`${slug}/${file} names no codeset`);
    const parsed = JSON.parse(readFileSync(join(root, codeset), 'utf8')) as { commands?: { name: string; keycode: string }[] };
    const commands = (parsed.commands ?? []).map((one) => ({ name: one.name, keycode: one.keycode }));
    for (const { keycode } of commands) {
      const protocol = catalogueProtocol(keycode, protocols);
      if (protocol === undefined) throw new ArchiveError(`${slug}/${file}'s keycode ${keycode} names no protocol definition`);
      used.set(protocol.name, protocol);
    }
    return { ...device, definition: { record, commands } };
  });
  const carried: Json = { ...recipe, devices };
  carried['protocols'] = [...used.keys()].sort().map((name) => used.get(name));
  return carried;
}
