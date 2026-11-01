/**
 * A whole setup composed onto a Harmony 300 or 350 configuration, `todo-compile-350.md` 4.5: every device of the
 * setup the configuration lacks, each on its key's short or long press, then the activity where the configuration
 * holds none, and then the favourite channels, by the family's four composers in the order they need. The no screen
 * family's own entry, beside its composers, since the screen families' `composeSetup` builds from a frame and asks
 * members this family refuses. **Built from nothing**, 5.1.6, the same entry runs onto the empty configuration of
 * `empty.ts`, `buildNoScreenSetup`, so no Logitech container goes in at all.
 *
 * **What it composes, in order, and why that order.**
 *
 * 1. **The devices the configuration lacks**, by name, `composeNoScreenDevice`, in the setup's order, a device held
 *    back only until what it needs is there: a long press device until its key's short press device is, since a
 *    long press goes on a key that holds one, and a device whose volume comes from another until that one is, since
 *    its map binds that device's lists. The setup's order is the account's, which is the order Logitech's metadata
 *    archive lists the devices in, and the composer appends each to the archive as it goes, so on the test setup,
 *    whose short presses come first, nothing is held back and the archive lists the devices as Logitech's does. Each
 *    device's volume and mute come from where `volumeSource` says for the setup's account, Logitech's routing, with
 *    every device's type read off the catalogue. Until 5.1.6 every short press went first and every long press
 *    after, which is the same order on the test setup and was not the account's on another.
 * 2. **The activity, where the configuration holds none**, `composeNoScreenActivity`: Watch TV unbound in the key
 *    table, as on the empty configuration. Its devices, their inputs and the device it ends in, the `ChannelChanging`
 *    role, are the setup's, and the composer creates the flag and every input variable it writes, since a
 *    configuration of ours has none to reuse. Where the configuration holds an activity already it is kept, as
 *    before, and the refusals below say when that is not the setup's.
 * 3. **The favourite channels**, `composeNoScreenFavourites`, per device, last, since a channel is a binding in its
 *    device's map and is sent by that device's digit lists.
 *
 * **Which key a device goes on is not in the setup**: Logitech's service chooses it, and `h350-test.json` records
 * its choice in prose only. So the caller states it, `keys`, and `devicePlaces` reads it off a configuration that
 * holds the devices already, Logitech's compile of the same setup among them. A device the configuration holds
 * already is checked against it, so a donor holding a device on another key is refused rather than composed around.
 *
 * **When the configuration's own activity is kept**, the entry refuses a setup whose activity names a device it
 * composes, since the configuration's activity cannot be that setup's activity then; nor one naming a device the
 * configuration does not hold. Replacing an activity whose devices hold input variables already needs the variable
 * removal step of 4.2.1, which nothing has built, so a donor's activity is never replaced here.
 *
 * **Measured** in `noscreensetup.test.ts`: Logitech's first compile of the test setup, with the five devices
 * `withoutNoScreenDevice` can take out taken out, composed back to the whole setup with the five favourite
 * channels, and held part by part against Logitech's second compile. And in `noscreenfromnothing.test.ts`, 5.1.6:
 * the whole setup composed onto the empty configuration, the activity and the Denon's inputs ours too, held against
 * the same compile part by part. The Harmony 350 alone, one setup; the Harmony 300 has no long press and no favourite
 * key table, and its devices on short presses alone are not run through here.
 */
import { catalogueDevice } from '../../catalogue.ts';
import { type Container, parse } from '../../gspm.ts';
import { devices } from '../../inventory.ts';
import type { Recipe } from '../../recipe/recipe.ts';
import { ComposeError, nameOfLabel } from '../../shared/core.ts';
import { type ComposedNoScreenActivity, composeNoScreenActivity, type NoScreenActivityDevice, WATCH_TV_SCAN } from './activity.ts';
import { composeNoScreenDevice, keyMaps, PRESS } from './devices.ts';
import { buildEmptyNoScreenConfiguration } from './empty.ts';
import { type ComposedNoScreenFavourites, composeNoScreenFavourites } from './favourites.ts';
import { type AccountDevice, DEVICE_KEYS, LONG_PRESS_GROUP_BASE, volumeSource } from './keys.ts';

/** Where a device goes: the device key's place, `DEVICE_KEYS`, and which press of it. */
export interface DevicePlace {
  readonly place: number;
  readonly press: 'short' | 'long';
}

export interface NoScreenSetupRequest {
  /** The setup: its devices by catalogue entry, its one activity and its favourite channels. */
  readonly recipe: Recipe;
  /** Every device's key and press, by the setup's name for it. */
  readonly keys: Readonly<Record<string, DevicePlace>>;
}

export interface ComposedNoScreenSetup {
  readonly bytes: Uint8Array;
  /** The devices composed, in the order they were, with the infrared group and the key map each took. */
  readonly composed: readonly { readonly name: string; readonly group: number; readonly map: number }[];
  /** The devices the configuration held already and kept, by the setup's name. */
  readonly kept: readonly string[];
  /** The activity composed, where the configuration held none; absent where its own was kept or the setup has none. */
  readonly activity?: ComposedNoScreenActivity;
  /** The favourite channels composed, per device. */
  readonly favourites: readonly ComposedNoScreenFavourites[];
}

/** The infrared group a place takes: the key's place for a short press, four on for a long one. */
export const groupOfPlace = (where: DevicePlace): number =>
  (where.press === 'long' ? LONG_PRESS_GROUP_BASE : 0) + where.place;

/**
 * Every named device's key and press in a configuration, read off its infrared group, which is the key's place for a
 * short press and four on for a long one, `LONG_PRESS_GROUP_BASE`; by the name the configuration gives it, a space
 * where the name tree has an underscore being the caller's to map back, `nameOfLabel`.
 */
export function devicePlaces(c: Container): Record<string, DevicePlace> {
  const out: Record<string, DevicePlace> = {};
  for (const one of devices(c)) {
    if (one.name === undefined || one.group === undefined) continue;
    const long = one.group >= LONG_PRESS_GROUP_BASE;
    out[one.name] = { place: one.group - (long ? LONG_PRESS_GROUP_BASE : 0), press: long ? 'long' : 'short' };
  }
  return out;
}

/** A setup device's catalogue entry, `<manufacturer>/<file>`, split. */
function entryOf(device: string): { manufacturer: string; model: string } {
  const at = device.indexOf('/');
  if (at <= 0) throw new ComposeError(`a device's catalogue entry is <manufacturer>/<file>, not "${device}"`);
  return { manufacturer: device.slice(0, at), model: device.slice(at + 1) };
}

/** Compose a whole setup onto a Harmony 350 configuration. Restamped, by the last composer that ran. */
export function composeNoScreenSetup(c: Container, archive: string, request: NoScreenSetupRequest): ComposedNoScreenSetup {
  const { recipe, keys } = request;
  const skin = (c.versionWord ?? -1) & 0xff;
  if (recipe.model.skin !== undefined && recipe.model.skin !== skin) {
    throw new ComposeError(`the setup is for skin ${recipe.model.skin} and the configuration is skin ${skin}`);
  }
  const names = recipe.devices.map((one) => one.name);
  if (new Set(names.map(nameOfLabel)).size !== names.length) throw new ComposeError('the setup names a device twice');

  // Every device's place, checked before anything is composed: one device per place, and a device the configuration
  // holds already on the place the setup gives it.
  const held = new Map(devices(c).flatMap((one) => (one.name === undefined || one.group === undefined ? [] : [[one.name, one.group] as const])));
  const taken = new Map<number, string>();
  for (const name of names) {
    const where = keys[name];
    if (where === undefined) throw new ComposeError(`the keys give ${name} no place`);
    if (DEVICE_KEYS[where.place] === undefined) throw new ComposeError(`${name}'s place is 0 to ${DEVICE_KEYS.length - 1}, not ${where.place}`);
    const group = groupOfPlace(where);
    const other = taken.get(group);
    if (other !== undefined) throw new ComposeError(`${name} and ${other} are both on group ${group}`);
    taken.set(group, name);
    const there = held.get(nameOfLabel(name));
    if (there !== undefined && there !== group) {
      throw new ComposeError(`the configuration holds ${name} on group ${there}, and the keys put it on group ${group}`);
    }
  }
  const missing = names.filter((name) => !held.has(nameOfLabel(name)));
  const kept = names.filter((name) => held.has(nameOfLabel(name)));

  // The activity: composed where the configuration holds none, Watch TV's press bound to nothing, and otherwise the
  // configuration's own, which may then name only what the configuration holds already.
  if (recipe.activities.length > 1) throw new ComposeError(`${recipe.activities.length} activities, where this family has one, Watch TV`);
  const ownActivity = keyMaps(c)[0]!.entries.some((one) => one.tag === (PRESS | WATCH_TV_SCAN));
  for (const activity of recipe.activities) {
    for (const one of activity.devices) {
      if (!names.includes(one.device)) throw new ComposeError(`${activity.name} names ${one.device}, which is no device of the setup`);
      if (ownActivity && missing.includes(one.device)) {
        throw new ComposeError(`${activity.name} names ${one.device}, which is composed here, so the configuration's own activity is not the setup's; `
          + 'composing the activity over one whose devices hold input variables needs the variable removal step, todo-compile-350.md 4.2.1');
      }
    }
  }
  // Planned before any device is composed, so that a setup this family cannot compose an activity for is refused
  // with nothing done.
  const activityRequest = ownActivity || recipe.activities.length === 0 ? undefined : activityOf(recipe);

  // Logitech's routing of volume asks every device's type, the account's in the setup's order.
  const account: AccountDevice[] = recipe.devices.map((one) => {
    const { manufacturer, model } = entryOf(one.device);
    return { name: one.name, deviceType: catalogueDevice(archive, manufacturer, model).deviceType };
  });
  const volumeFrom = new Map(account.map((one) => [one.name, volumeSource(one, account)]));

  let current = c;
  const composed: { name: string; group: number; map: number }[] = [];
  for (const name of compositionOrder(missing, kept, keys, volumeFrom)) {
    const { manufacturer, model } = entryOf(recipe.devices.find((one) => one.name === name)!.device);
    const where = keys[name]!;
    const out = composeNoScreenDevice(current, archive, {
      manufacturer, model, name, place: where.place, press: where.press, volumeFrom: volumeFrom.get(name)!,
    });
    composed.push({ name, group: out.group, map: out.map });
    current = parse(out.bytes);
  }

  let activity: ComposedNoScreenActivity | undefined;
  if (activityRequest !== undefined) {
    activity = composeNoScreenActivity(current, archive, activityRequest);
    current = parse(activity.bytes);
  }

  const favourites: ComposedNoScreenFavourites[] = [];
  for (const one of recipe.favourites ?? []) {
    const device = recipe.devices.find((d) => d.name === one.device);
    if (device === undefined) throw new ComposeError(`favourite channels on ${one.device}, which is no device of the setup`);
    const out = composeNoScreenFavourites(current, archive, { name: one.device, ...entryOf(device.device), channels: one.channels });
    favourites.push(out);
    current = parse(out.bytes);
  }

  // A setup with nothing to compose returns a copy, so the caller never holds the input's own bytes.
  return { bytes: current === c ? c.blob.slice() : current.blob, composed, kept, ...(activity === undefined ? {} : { activity }), favourites };
}

/**
 * The order the devices are composed in: the setup's, each device held back only until what it needs is there, the
 * module comment's first step. A device is ready once its key's short press device is there, for a long press, and
 * once the device whose volume it sends is there; each round takes the first ready device in the setup's order, so
 * the order departs from the setup's only where a device would otherwise be refused. A setup where no device is
 * ready, a long press on a key with no short press device or two devices each taking the other's volume, is refused.
 */
function compositionOrder(missing: readonly string[], kept: readonly string[], keys: Readonly<Record<string, DevicePlace>>,
  volumeFrom: ReadonlyMap<string, string>): string[] {
  const there = new Set(kept);
  const waiting = [...missing];
  const order: string[] = [];
  const ready = (name: string): boolean => {
    const where = keys[name]!;
    const shortThere = where.press !== 'long'
      || [...there].some((other) => keys[other]?.place === where.place && keys[other]?.press !== 'long');
    const source = volumeFrom.get(name);
    return shortThere && (source === undefined || source === name || there.has(source));
  };
  while (waiting.length > 0) {
    const next = waiting.findIndex(ready);
    if (next < 0) throw new ComposeError(`${waiting.join(', ')} cannot be composed: each needs a device that is not there, `
      + 'a short press device on its key or the device whose volume it sends');
    const [name] = waiting.splice(next, 1);
    order.push(name!);
    there.add(name!);
  }
  return order;
}

/**
 * The setup's one activity as the activity composer takes it: its devices, each put on the input the setup names
 * with the catalogue entry that input is read from, and the device it ends in, its `ChannelChanging` role, which is
 * the device whose map Logitech's compiles select at the end of Watch TV, `activity.ts`. An activity with no such
 * device, or with two, is refused: no compile of the family shows which map either would end in.
 */
function activityOf(recipe: Recipe): { devices: NoScreenActivityDevice[]; channel: string } {
  const activity = recipe.activities[0]!;
  const channel = activity.devices.filter((one) => one.roles.includes('ChannelChanging'));
  if (channel.length !== 1) {
    throw new ComposeError(`${activity.name} gives ${channel.length} devices the ChannelChanging role, and Watch TV ends in the map of one`);
  }
  return {
    devices: activity.devices.map((one) => {
      if (one.input === undefined) return { name: one.device };
      const { manufacturer, model } = entryOf(recipe.devices.find((device) => device.name === one.device)!.device);
      return { name: one.device, input: one.input, manufacturer, model };
    }),
    channel: channel[0]!.device,
  };
}

/** What to build a setup from nothing from: the setup and its keys, and the moment the file is built at. */
export interface NoScreenSetupFromNothing extends NoScreenSetupRequest {
  /** When it is built, `YYYY-MM-DDTHH:MM:SS`: the stamp, the clock records and the archive's time. */
  readonly builtAt: string;
  /** The archive's zone in whole hours, `EMPTY_ZONE_HOURS` unless given. */
  readonly zoneHours?: number;
}

/**
 * A whole setup built from nothing, `todo-compile-350.md` 5.1.6, step 6 of plan 011: the empty configuration for the
 * setup's skin, `buildEmptyNoScreenConfiguration`, with every device, the activity and the favourite channels
 * composed onto it by `composeNoScreenSetup`. **Nothing goes in but the setup, its keys, a moment and the infrared
 * catalogue**: no Logitech container, which is what 5.2.3 will check. The skin is the setup's, refused where the
 * setup states none, since the infrared allocation is the model's, `INFRARED_GROUPS_BY_SKIN`. Unstamped by nothing
 * after the last composer, which restamps; a caller writing it restamps again last, as every writer does.
 */
export function buildNoScreenSetup(archive: string, request: NoScreenSetupFromNothing): ComposedNoScreenSetup {
  const skin = request.recipe.model.skin;
  if (skin === undefined) throw new ComposeError('the setup states no skin, so the model the configuration is built for is not known');
  const empty = buildEmptyNoScreenConfiguration({
    skin, builtAt: request.builtAt, ...(request.zoneHours === undefined ? {} : { zoneHours: request.zoneHours }),
  });
  return composeNoScreenSetup(empty.container, archive, { recipe: request.recipe, keys: request.keys });
}
