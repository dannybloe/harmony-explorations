/**
 * A whole setup composed onto a Harmony 300 or 350 configuration, `todo-compile-350.md` 4.5: every device of the
 * setup the configuration lacks, each on its key's short or long press, and then the favourite channels, by the
 * family's three composers in the order they need. The no screen family's own entry, beside its composers, since the
 * screen families' `composeSetup` builds from a frame and asks members this family refuses.
 *
 * **What it composes, in order, and why that order.**
 *
 * 1. **The devices the configuration lacks**, by name, `composeNoScreenDevice`: every short press first, then every
 *    long press, each half in the setup's order. A long press goes on a key that already holds a short press device,
 *    so the short one has to be there first; within a half the setup's order is the account's, which is the order
 *    Logitech's metadata archive lists the devices in and the composer appends them in. Each device's volume and mute
 *    come from where `volumeSource` says for the setup's account, Logitech's routing, with every device's type read
 *    off the catalogue.
 * 2. **The favourite channels**, `composeNoScreenFavourites`, per device, after the devices, since a channel is a
 *    binding in its device's map and is sent by that device's digit lists.
 *
 * **Which key a device goes on is not in the setup**: Logitech's service chooses it, and `h350-test.json` records
 * its choice in prose only. So the caller states it, `keys`, and `devicePlaces` reads it off a configuration that
 * holds the devices already, Logitech's compile of the same setup among them. A device the configuration holds
 * already is checked against it, so a donor holding a device on another key is refused rather than composed around.
 *
 * **What it does not compose: the activity.** The configuration's own Watch TV is kept, and the entry refuses a
 * setup whose activity names a device it composes, since the configuration's activity cannot be that setup's
 * activity then; nor one naming a device the configuration does not hold. `composeNoScreenActivity` composes one,
 * held step for step against Logitech's in 4.2, and replacing an activity whose devices hold input variables
 * already needs the variable removal step of 4.2.1, which nothing has built. Chapter 5 builds the whole file from
 * nothing, plan 011, and composes the activity there.
 *
 * **Measured** in `noscreensetup.test.ts`: Logitech's first compile of the test setup, with the five devices
 * `withoutNoScreenDevice` can take out taken out, composed back to the whole setup with the five favourite
 * channels, and held part by part against Logitech's second compile. The Harmony 350 alone, one setup; the Harmony
 * 300 has no long press and no favourite key table, and its devices on short presses alone are not run through here.
 */
import { catalogueDevice } from '../../catalogue.ts';
import { type Container, parse } from '../../gspm.ts';
import { devices } from '../../inventory.ts';
import type { Recipe } from '../../recipe/recipe.ts';
import { ComposeError, nameOfLabel } from '../../shared/core.ts';
import { composeNoScreenDevice } from './devices.ts';
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

  // The activity is the configuration's own, so it may name only what the configuration holds already.
  if (recipe.activities.length > 1) throw new ComposeError(`${recipe.activities.length} activities, where this family has one, Watch TV`);
  for (const activity of recipe.activities) {
    for (const one of activity.devices) {
      if (!names.includes(one.device)) throw new ComposeError(`${activity.name} names ${one.device}, which is no device of the setup`);
      if (missing.includes(one.device)) {
        throw new ComposeError(`${activity.name} names ${one.device}, which is composed here, so the configuration's own activity is not the setup's; `
          + 'composing the activity over one whose devices hold input variables needs the variable removal step, todo-compile-350.md 4.2.1');
      }
    }
  }

  // Logitech's routing of volume asks every device's type, the account's in the setup's order.
  const account: AccountDevice[] = recipe.devices.map((one) => {
    const { manufacturer, model } = entryOf(one.device);
    return { name: one.name, deviceType: catalogueDevice(archive, manufacturer, model).deviceType };
  });

  let current = c;
  const composed: { name: string; group: number; map: number }[] = [];
  const order = [...missing.filter((name) => keys[name]!.press === 'short'), ...missing.filter((name) => keys[name]!.press === 'long')];
  for (const name of order) {
    const { manufacturer, model } = entryOf(recipe.devices.find((one) => one.name === name)!.device);
    const where = keys[name]!;
    const out = composeNoScreenDevice(current, archive, {
      manufacturer, model, name, place: where.place, press: where.press,
      volumeFrom: volumeSource(account.find((one) => one.name === name)!, account),
    });
    composed.push({ name, group: out.group, map: out.map });
    current = parse(out.bytes);
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
  return { bytes: current === c ? c.blob.slice() : current.blob, composed, kept, favourites };
}
