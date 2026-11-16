// What the other examples start from. `saved` opens a document saved earlier, as an application opens one of its own:
// the two in `documents/` beside this file, a Harmony One's and a Harmony Touch's, are copies of the SDK's own test
// setups. `carried` takes a device's definition from one of them, the way a source of devices hands one over; and
// `livingRoom` is a small document made with the toolkit, a television, a receiver and one activity.
import { readFileSync } from 'node:fs';

import { recipe, type CarriedDevice, type Recipe, type RecipeModel } from '@freeharmony-sdk/config';

/** A document saved earlier: the one for a Harmony One or for a Harmony Touch in `documents/`. */
export function saved(name: 'one-test' | 'touch-test'): Recipe {
  const file = new URL(`documents/${name}.json`, import.meta.url);
  return recipe.open(JSON.parse(readFileSync(file, 'utf8')));
}

/** One device with its definition, as `recipe.addDevice` takes it, from the devices the Touch's test setup carries. */
export function carried(name: 'LG TV' | 'Denon AV Receiver' | 'Blu-ray' | 'Xbox'): CarriedDevice {
  const library = saved('touch-test');
  const device = library.devices.find((one) => one.name === name)!;
  return { source: 'library', entry: device.device, definition: device.definition!, protocols: library.protocols ?? [] };
}

/** A television, a receiver and an activity that uses both, for any model. */
export function livingRoom(model: RecipeModel): Recipe {
  let document = recipe.create(model);
  document = recipe.addDevice(document, { name: 'Television', device: carried('LG TV') }).document;
  document = recipe.addDevice(document, { name: 'Receiver', device: carried('Denon AV Receiver') }).document;
  const [television, receiver] = recipe.devices(document);
  return recipe.addActivity(document, {
    name: 'Watch TV',
    type: 'WatchTV',
    devices: [
      { device: television!.id, input: 'HDMI 1', roles: ['Display'] },
      { device: receiver!.id, input: 'CBL/SAT', roles: ['Volume'] },
    ],
  }).document;
}
