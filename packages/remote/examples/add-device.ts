// A device found in a source of devices, fetched, and added to a document with
// its definition.
import assert from 'node:assert/strict';

import {
  fetchDevice,
  findDevices,
  recipe,
  type CarriedDevice,
  type DeviceSource,
  type FoundDevice,
} from '@freeharmony-sdk/config';

import { saved as open } from './library.ts';

// A source is anything that can find a device and fetch its definition. On
// Node, `archiveSourceAt` of `@freeharmony-sdk/config/node` reads the device
// archive from a folder that holds one; the SDK neither ships nor fetches an
// archive, and the source that reads one over the network,
// `networkArchiveSource`, is not built yet. This one is a small library of
// devices an application kept: the definitions a saved document carries, here
// the Harmony Touch's document beside these examples.
const saved = open('touch-test');

const library: CarriedDevice[] = saved.devices.map((device) => ({
  source: 'library',
  entry: device.device,
  definition: device.definition!,
  protocols: saved.protocols ?? [],
}));

// What a search lists for one of them: its maker and model, read off its
// catalogue entry, `<manufacturer>/<model>`, and how well it matched.
function found(device: CarriedDevice): FoundDevice {

  const [manufacturer = '', model = ''] = device.entry.split('/');

  return {
    source: 'library',
    entry: device.entry,
    manufacturer,
    model,
    match: 1,
  };

}

// A search by maker, ignoring case, and a fetch by catalogue entry.
const source: DeviceSource = {
  name: 'library',
  find: async (query) => {

    const wanted = query.manufacturer?.toLowerCase();
    const all = library.map(found);

    if (wanted === undefined) {
      return all;
    }

    return all.filter((one) => one.manufacturer.toLowerCase() === wanted);
  },
  fetch: async (result) => {
    return library.find((device) => device.entry === result.entry)!;
  },
};

// One search asks every source at once and lists what they found, best first;
// a source that fails is named in `failed` and the others still answer.
const search = await findDevices([source], {
  manufacturer: 'denon',
});

assert.deepEqual(search.failed, []);

const receiver = search.found[0]!;

assert.equal(receiver.manufacturer, 'Denon');

// Fetching brings the definition, which the document then carries, so it
// builds and stays editable when no source answers any more.
const carried = await fetchDevice([source], receiver);

const empty = recipe.create({
  name: 'Harmony One',
});

const change = recipe.addDevice(empty, {
  name: 'Receiver',
  device: carried,
});

const [device] = recipe.devices(change.document);

assert.equal(device!.name, 'Receiver');
assert.equal(device!.manufacturer, 'Denon');

// Its commands, by name, as a key or a screen entry names them.
const commands = recipe.commands(change.document, device!.id);

assert.ok(commands.some((command) => command.name === 'Mute'));
