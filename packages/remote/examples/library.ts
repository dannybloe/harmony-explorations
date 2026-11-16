// What the other examples start from.
//
// `saved` opens a document saved earlier, as an application opens one of its
// own: the two in `documents/` beside this file, a Harmony One's and a Harmony
// Touch's, are copies of the SDK's own test setups. `carried` takes a device's
// definition from one of them, the way a source of devices hands one over.
// `livingRoom` is a small document made with the toolkit: a television, a
// receiver and one activity. `inventedAccount` stands in for the account a
// Harmony Touch's build needs.
import { readFileSync } from 'node:fs';

import {
  recipe,
  type CarriedDevice,
  type Recipe,
  type RecipeModel,
  type TouchAccount,
} from '@freeharmony-sdk/config';

/** The names of the two saved documents in `documents/`. */
export type SavedName =
  | 'one-test'
  | 'touch-test';

/** The devices the Harmony Touch's saved document carries, by name. */
export type CarriedName =
  | 'LG TV'
  | 'Denon AV Receiver'
  | 'Blu-ray'
  | 'Xbox';

/** A document saved earlier: the Harmony One's or the Harmony Touch's. */
export function saved(name: SavedName): Recipe {

  const file = new URL(`documents/${name}.json`, import.meta.url);

  // `open` checks the shape of what it is given, so a file edited by hand or
  // saved by an older application is read or refused, never misread.
  return recipe.open(JSON.parse(readFileSync(file, 'utf8')));

}

/**
 * One device with its definition, as `recipe.addDevice` takes it, from the
 * devices the Harmony Touch's saved document carries.
 */
export function carried(name: CarriedName): CarriedDevice {

  const library = saved('touch-test');
  const device = library.devices.find((one) => one.name === name)!;

  // The definition is what the device understands: its commands and how each
  // is sent. A document carries it, so it builds with no source attached.
  return {
    source: 'library',
    entry: device.device,
    definition: device.definition!,
    protocols: library.protocols ?? [],
  };

}

/** A television, a receiver and an activity that uses both, for any model. */
export function livingRoom(model: RecipeModel): Recipe {

  let document = recipe.create(model);

  // Every change returns a new document; `.document` is the one to keep.
  document = recipe.addDevice(document, {
    name: 'Television',
    device: carried('LG TV'),
  }).document;

  document = recipe.addDevice(document, {
    name: 'Receiver',
    device: carried('Denon AV Receiver'),
  }).document;

  const [television, receiver] = recipe.devices(document);

  // An activity names its devices by id, with the input each is switched to
  // and the roles it plays: the television shows the picture, the receiver
  // sets the volume.
  return recipe.addActivity(document, {
    name: 'Watch TV',
    type: 'WatchTV',
    devices: [
      {
        device: television!.id,
        input: 'HDMI 1',
        roles: ['Display'],
      },
      {
        device: receiver!.id,
        input: 'CBL/SAT',
        roles: ['Volume'],
      },
    ],
  }).document;

}

/**
 * A Harmony Touch's account: the identifiers its documents carry, which its
 * build needs. An application keeps them with its user's own data, never in
 * the document, and the SDK does not read them off a Touch or its account yet.
 * These are invented.
 */
export const inventedAccount: TouchAccount = {
  context: {
    'AccountId-': '1000001',
    CountryCode: 'NL',
    Email: 'someone@example.com',
    HouseholdUserProfileUri: 'https://example.invalid/household',
    InstallerId: null,
    Language: 'en-GB',
    SetupSession: {
      Type: 0,
      SetupType: null,
    },
  },
  tuning: {
    DeviceProfileUri: 'https://example.invalid/favourites',
    ContentProfileKey: 1,
  },
};
