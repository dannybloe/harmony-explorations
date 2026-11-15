/**
 * **The maps a family carries**, decision 43: the data interface both kinds of family state, so that what a key does
 * is derived once per family and asked the same way of every model. A compiled family, `Family.maps`, and a document
 * family, `DocumentFamily.maps`, carry the same four members; the lookup by model is `mapsOfModel` in `registry.ts`.
 *
 * **What a family states, and why these four.** The keys a person can press are the model's, so the family names its
 * **places**, every key, pad place and gesture, with the presses each has and whose map can bind it. Which of a
 * device's commands a remote can be given is the family's too, since each family writes codes its own way, so the
 * family answers the **commands** it would carry. A new device arrives with a sensible map that a person reviews, so
 * the family derives the **default map of a device** from those commands, and the **default map of an activity** from
 * the default maps of its devices and the jobs they do. That last one reads the devices' default maps and never their
 * resolved ones: a person's change to a device's own key changes no activity, because an activity and device mode are
 * two maps of the same keypad, authored separately, `reference/how-a-harmony-works.md`.
 *
 * **What a family does not state is resolve.** Putting the document's choices over the defaults, each entry marked
 * default or chosen, is the same work on every model, so it is written once, here, `resolveMaps`, over the four
 * members; the build and the questions both call it, so what an application is shown is what is built. A member on
 * each family would be a second copy of the same overlay.
 *
 * **Everything is in words and names**, never in a family's own numbers: a key by Logitech's word for it, as the
 * model's drawing names it (`VolumeMute`, `Number1`, `SwipeUp`), a command by its name in the device's definition, a
 * device by its name in the document. The family turns a word into its own number when it builds.
 *
 * Generic: nothing here is true of one remote and not another. Which families implement the interface is each family's
 * `maps`; the Harmony One's is `families/harmony-one/recipemaps.ts`.
 */
import type { CatalogueSource } from '../catalogue/catalogue.ts';
import type { ActivityRoleName } from '../compose/activityroles.ts';
import {
  RecipeError, type Recipe, type RecipeDevice, type RecipeKey, type RecipeKeyAction, type RecipePress, type RecipeScreenCommand,
} from '../recipe/recipe.ts';

// ---------------------------------------------------------------------------------------------------
// What a family states
// ---------------------------------------------------------------------------------------------------

/**
 * Where a place is on the remote: the keypad's keys, the number pad a screen draws, a gesture on a touch surface, or a
 * touch key, a key of a touch panel beside a screen, such as the Harmony One's page strips at each side of its screen
 * and the two keys below it, which its drawing and `reference/remotes/harmony-one/keys.md` call touch keys.
 * A pad place is a key all the same, named as the keypad's digits are, so one choice of a key works on a model whose
 * digits are keys and on one whose digits are drawn.
 */
export type MapSurface = 'keypad' | 'pad' | 'gesture' | 'touch';

/**
 * Whose map can bind a place: a device's own, device mode's, an activity's, or both; or `remote`, neither, where no
 * device's or activity's map binds the place and the configuration binds it outside those maps, as the Harmony One's
 * Off key and the keys around its screen are, `reference/architectures/harmony-one/compiler.md`. `resolveMaps` answers
 * a `remote` place for no owner, since no owner's map says what it does; `places` still lists it, with `built` false and
 * why.
 */
export type MapBinder = 'device' | 'activity' | 'both' | 'remote';

/**
 * One place of a model, `FamilyMaps.places`: its word, where it is, the presses it has, whose map binds it, and whether
 * the family builds a choice on it. A place that is on the remote and takes no choice, a key a model's own screens
 * bind, is listed with `built` false and the reason, so an application can show it and say why it cannot be changed.
 */
export interface MapPlace {
  /** Logitech's word for the key, as the model's drawing names it. */
  readonly key: string;
  readonly surface: MapSurface;
  /** The presses this place has on this model, the short press first. */
  readonly presses: readonly RecipePress[];
  readonly boundBy: MapBinder;
  readonly built: boolean;
  /** Why a person's choice is not built on it, where `built` is false. */
  readonly why?: string;
}

/**
 * One command of a device's definition as the family answers it, `FamilyMaps.commands`: its name, and whether the
 * family carries it, that is whether a configuration of the family can send it. A command the family cannot carry is
 * still listed, since a default map is laid out over every command and one left out leaves its place to the next.
 */
export interface MapCommand {
  readonly name: string;
  readonly carried: boolean;
}

/** One place and press of a device's default map: the device's own command it sends, and the label a pad shows. */
export interface DeviceMapBinding {
  readonly key: string;
  readonly press: RecipePress;
  readonly command: string;
  readonly label?: string;
}

/**
 * One entry of a screen list as a family derives it: a command, labelled with its own name where no label is given,
 * or an entry the remote acts on itself and that sends nothing, such as one that opens the number pad, by the name
 * the family gives that action.
 */
export type DeviceMapEntry =
  | { readonly command: string; readonly label?: string }
  | { readonly label: string; readonly client: string };

/** A device's default map: its bindings, unbound places left out, and its screen list in order. */
export interface DeviceMap {
  readonly keys: readonly DeviceMapBinding[];
  readonly screen: readonly DeviceMapEntry[];
}

/** One place and press of an activity's default map: a command of one of its devices. */
export interface ActivityMapBinding extends DeviceMapBinding {
  readonly device: string;
}

/**
 * One entry of an activity's or a resolved screen list: a device's command, one of the activity's sequences by its
 * name, or an entry the remote acts on itself.
 */
export type MapScreenEntry =
  | RecipeScreenCommand
  | { readonly sequence: string; readonly label?: string }
  | { readonly label: string; readonly client: string };

/** An activity's default map: its bindings, unbound places left out, and its screen list in order. */
export interface ActivityMap {
  readonly keys: readonly ActivityMapBinding[];
  readonly screen: readonly MapScreenEntry[];
}

/** An activity as a default map is derived from it: Logitech's type, and its devices by name with their jobs. */
export interface MapActivity {
  readonly type: string;
  readonly devices: readonly { readonly device: string; readonly roles: readonly ActivityRoleName[] }[];
}

/** One device of an activity as the activity's rule reads it: its commands and its own default map. */
export interface MapDeviceView {
  readonly commands: readonly MapCommand[];
  readonly map: DeviceMap;
}

/**
 * **The maps a family carries**, decision 43. Four members, each pure: the same inputs give the same answer, and none
 * reads a container or a document of a remote, so the questions can ask them with nothing attached.
 */
export interface FamilyMaps {
  /** Every place of the model of `skin`, bound or not, in the family's order. */
  places(skin: number): readonly MapPlace[];
  /**
   * The commands of a document's device in its definition's order, each with whether the family carries it. The
   * definition comes from `catalogue`, which a caller makes from the document's carried definitions over any archive,
   * `carriedCatalogue`; the device is given whole, so a person's own code for a command can count as well.
   */
  commands(device: RecipeDevice, catalogue: CatalogueSource): readonly MapCommand[];
  /** A device's default map, from its commands. */
  deviceMap(commands: readonly MapCommand[]): DeviceMap;
  /** An activity's default map, from its type, its devices' jobs and its devices' **default** maps, `deviceOf`. */
  activityMap(activity: MapActivity, deviceOf: (device: string) => MapDeviceView): ActivityMap;
  /**
   * **Why the family's build refuses a person's choice on a place it has**, in a sentence a person reads, or undefined
   * where it takes it. Asked only of a choice the places already allow, a place the owner binds and a press it has,
   * since those are judged once for every family by `places`; this is for what a family refuses beyond them, such as
   * a command its screen draws on no key. The toolkit's `setKey` and `check` ask it, so a choice is refused where it is
   * made and listed in a document that holds one, rather than met first at the build. **Optional**: a family whose
   * build takes every choice its places allow states none.
   */
  refusedChoice?(skin: number, choice: MapChoice): string | undefined;
  /**
   * **The screens an activity of the family's can open on**, R91, by the words a document states them in,
   * `RecipeActivity.opensOn`: the toolkit holds a person's choice to these where it is made and its check holds a
   * document to them, so a word the model lacks is refused as not on this model rather than met first at the build.
   * **Optional**: a family stating none has not named its screens yet, and a choice of one is not built there, which is
   * not the same as a model without the choice.
   */
  readonly openingScreens?: readonly string[];
}

/** One choice of a key as `FamilyMaps.refusedChoice` is asked about it, in the document's words. */
export interface MapChoice {
  /** Whose map it is in, and the words for it in a sentence: `activity Watch TV`, `LG TV's own map`. */
  readonly owner: 'device' | 'activity';
  readonly what: string;
  readonly key: string;
  readonly press: RecipePress;
  /** A command of a device by the device's name in the document, a sequence by its name, or nothing. */
  readonly action: RecipeKeyAction;
  /**
   * The commands a device of the document has by its name: its definition's and those the document adds, or undefined
   * where neither the document nor a source given says, in which case a family judges nothing it would need them for.
   */
  readonly commandsOf: (device: string) => readonly string[] | undefined;
}

// ---------------------------------------------------------------------------------------------------
// Resolve: the defaults and the document's choices together, once for every family
// ---------------------------------------------------------------------------------------------------

/** One place and press of an owner's map as the remote will have it: what it does, and whether that is the default. */
export interface ResolvedKey {
  readonly key: string;
  readonly surface: MapSurface;
  readonly press: RecipePress;
  /** A command of any device of the document, a sequence, or nothing where the place is unbound. */
  readonly action: RecipeKeyAction;
  readonly label?: string;
  /** True where the family derived it, false where the document chose it. */
  readonly isDefault: boolean;
}

/** An owner's screen list as the remote will have it, and whether that is the default or the document's, whole. */
export interface ResolvedScreen {
  readonly items: readonly MapScreenEntry[];
  readonly isDefault: boolean;
}

/** One owner, a device in device mode or an activity, resolved: every place it can bind, and its screen. */
export interface ResolvedOwner {
  /** The owner's id in the document, where it has one. */
  readonly id?: string;
  readonly name: string;
  readonly keys: readonly ResolvedKey[];
  readonly screen: ResolvedScreen;
}

/** A whole document resolved: the devices and the activities in its order. */
export interface ResolvedMaps {
  readonly devices: readonly ResolvedOwner[];
  readonly activities: readonly ResolvedOwner[];
}

/**
 * Whether an owner of this kind binds a place: a place bound by both kinds, or by this kind. The one judgement of who
 * binds a place, which `resolveMaps` resolves by and the toolkit's questions and check ask, so the places a question
 * lists for an owner are the ones resolve answers for it.
 */
export const binds = (place: MapPlace, owner: 'device' | 'activity'): boolean => place.boundBy === 'both' || place.boundBy === owner;

/**
 * Every place and press an owner binds, the document's choice where it states one and the default otherwise. A
 * choice on a place the model does not have, or for a press the place lacks, is not here: it is a problem of the
 * document, which the toolkit's check lists, and it builds nothing.
 */
function resolveKeys(
  places: readonly MapPlace[], owner: 'device' | 'activity', chosen: readonly RecipeKey[] | undefined,
  defaults: readonly ActivityMapBinding[],
): ResolvedKey[] {
  const out: ResolvedKey[] = [];
  for (const place of places) {
    if (!binds(place, owner)) continue;
    for (const press of place.presses) {
      const choice = (chosen ?? []).find((one) => one.key === place.key && (one.press ?? 'short') === press);
      if (choice !== undefined) {
        out.push({ key: place.key, surface: place.surface, press, action: choice.action, isDefault: false });
        continue;
      }
      const bound = defaults.find((one) => one.key === place.key && one.press === press);
      out.push({
        key: place.key, surface: place.surface, press,
        action: bound === undefined ? { nothing: true } : { device: bound.device, command: bound.command },
        ...(bound?.label === undefined ? {} : { label: bound.label }),
        isDefault: true,
      });
    }
  }
  return out;
}

/** A device's default screen as resolved entries: its own commands, by the device's name. */
function deviceScreen(name: string, entries: readonly DeviceMapEntry[]): MapScreenEntry[] {
  return entries.map((one) => ('client' in one ? one : { device: name, command: one.command, ...(one.label === undefined ? {} : { label: one.label }) }));
}

/**
 * **A document's maps as the remote will have them**: every place of every owner with what it does, the document's
 * choices over the family's defaults, each marked default or chosen, and every screen list. What the build reads and
 * what the questions answer, so an application is shown what is built.
 *
 * `catalogue` serves each device's definition, the document's carried ones first, `carriedCatalogue`. An activity is
 * derived from its devices' default maps, never their resolved ones, as the module docstring says. Refused, as a
 * `RecipeError`, where an activity names a device the document does not hold, since there is no map to derive from.
 *
 * **One device whose commands cannot be read fails the whole resolve**, with whatever the family's `commands` throws
 * for it, deliberately: the answer is meant to be what is built, and a build of that document fails on the same
 * device, so maps for the rest would show a remote that no build makes. And an activity using the device would have
 * to be left out or derived without it, either of which answers something other than the document says. An
 * application wanting the other devices' maps fixes or removes that device first, as the check tells it to.
 */
export function resolveMaps(maps: FamilyMaps, skin: number, document: Recipe, catalogue: CatalogueSource): ResolvedMaps {
  const places = maps.places(skin);
  // Each device's commands and default map once, since every activity that uses a device reads the same.
  const views = new Map<string, MapDeviceView>();
  const viewOf = (name: string): MapDeviceView => {
    const known = views.get(name);
    if (known !== undefined) return known;
    const device = document.devices.find((one) => one.name === name);
    if (device === undefined) throw new RecipeError(`an activity uses ${name}, which is no device of the document`);
    const commands = maps.commands(device, catalogue);
    const view = { commands, map: maps.deviceMap(commands) };
    views.set(name, view);
    return view;
  };
  const devices = document.devices.map((device): ResolvedOwner => {
    const { map } = viewOf(device.name);
    const defaults = map.keys.map((one) => ({ ...one, device: device.name }));
    return {
      ...(device.id === undefined ? {} : { id: device.id }),
      name: device.name,
      keys: resolveKeys(places, 'device', device.keys, defaults),
      screen: device.screen === undefined
        ? { items: deviceScreen(device.name, map.screen), isDefault: true }
        : { items: device.screen, isDefault: false },
    };
  });
  const activities = document.activities.map((activity): ResolvedOwner => {
    const map = maps.activityMap({ type: activity.type, devices: activity.devices.map((one) => ({ device: one.device, roles: one.roles })) }, viewOf);
    return {
      ...(activity.id === undefined ? {} : { id: activity.id }),
      name: activity.name,
      keys: resolveKeys(places, 'activity', activity.keys, map.keys),
      screen: activity.screen === undefined
        ? { items: map.screen, isDefault: true }
        // A sequence of version 1, stated with its steps where it sits, is shown by its name, as one of version 2 is.
        : { items: activity.screen.map((item): MapScreenEntry => ('sequence' in item ? { sequence: item.sequence } : item)), isDefault: false },
    };
  });
  return { devices, activities };
}
