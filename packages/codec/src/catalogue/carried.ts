/**
 * **A recipe's own codes as a catalogue**, plan 014 and `todo.md` 7.3.11.1: a recipe device may carry its definition,
 * the catalogue's record of it and its codeset's commands, and a recipe the protocol definitions those commands are
 * written in, so a build needs no archive. That is what a code learned off a remote needs, which no archive holds, and
 * what lets a test of a whole setup run on a checkout with nothing beside it.
 *
 * **The same readers as the archive's**, `deviceOfRecord`, `deviceDriving` and `commandsOfCodeset`'s shape, so a
 * carried device builds exactly as the archive's file of it does; the test of 7.3.11.1 holds a setup built both ways to
 * the same bytes. A carried command is a name and a keycode, the two fields a builder reads: the rendered waveform the
 * archive holds beside them is never carried, and is refused if asked for, since nothing that builds asks for it.
 *
 * **Carried first, then the archive**: a device the recipe carries is served from the recipe, any other from the
 * archive given, and a device neither holds is refused naming it. The protocols are the recipe's and then those of the
 * archive the recipe does not carry, by name.
 */
import { ArchiveError, type ArchiveProtocol } from './archive.ts';
import { deviceOfRecord, type CatalogueCommand, type CatalogueSource } from './catalogue.ts';
import { deviceDriving } from './driving.ts';
import type { Recipe } from '../recipe/recipe.ts';

/** A catalogue entry as a recipe and the archive's readers name it, `<manufacturer>/<file>`, with no `.json`. */
function entry(slug: string, file: string): string {
  return `${slug}/${file.endsWith('.json') ? file.slice(0, -5) : file}`;
}

/**
 * The catalogue a build of `recipe` reads: what the recipe carries, over `archive` where one is given. Undefined where
 * the recipe carries nothing and no archive is given, so a build that needs no catalogue is not handed an empty one.
 */
export function carriedCatalogue(recipe: Recipe, archive?: CatalogueSource): CatalogueSource | undefined {
  const carried = recipe.devices.filter((d) => d.definition !== undefined);
  if (carried.length === 0 && recipe.protocols === undefined) return archive;
  const byEntry = new Map(carried.map((d) => [d.device, d.definition!]));
  const byCodeset = new Map<string, readonly CatalogueCommand[]>();
  for (const d of carried) {
    const codeset = d.definition!.record['codeset'];
    if (typeof codeset === 'string') byCodeset.set(codeset, d.definition!.commands);
  }
  const ownProtocols = (recipe.protocols ?? []) as unknown as readonly ArchiveProtocol[];
  const missing = (what: string): never => {
    throw new ArchiveError(`the recipe carries no ${what}, and no archive was given`);
  };
  return {
    protocols: () => {
      if (archive === undefined) return [...ownProtocols];
      const named = new Set(ownProtocols.map((p) => p.name));
      return [...ownProtocols, ...archive.protocols().filter((p) => !named.has(p.name))];
    },
    device: (slug, file) => {
      const definition = byEntry.get(entry(slug, file));
      if (definition !== undefined) return deviceOfRecord(definition.record);
      return archive?.device(slug, file) ?? missing(`definition of ${entry(slug, file)}`);
    },
    commands: (codeset, options) => {
      const commands = byCodeset.get(codeset);
      if (commands !== undefined) {
        if (options?.pronto === true) throw new ArchiveError(`a carried codeset holds no rendered waveforms, and ${codeset}'s were asked for`);
        return commands.map((one) => ({ name: one.name, keycode: one.keycode }));
      }
      return archive?.commands(codeset, options) ?? missing(`codeset ${codeset}`);
    },
    driving: (slug, file) => {
      const definition = byEntry.get(entry(slug, file));
      if (definition !== undefined) return deviceDriving(definition.record);
      return archive?.driving(slug, file) ?? missing(`definition of ${entry(slug, file)}`);
    },
  };
}
