// A remote's configuration read, with progress, and what it holds read out of
// it.
import assert from 'node:assert/strict';

import { activities, devices, parse } from '@freeharmony-sdk/config';
import { type ReadProgress } from '@freeharmony-sdk/remote';

// The pretend remote lives on the write subpath, beside the sync it also
// answers, so even a read only application imports that subpath to try its
// reading screens with nothing attached.
import { pretendReader, pretendRemote } from '@freeharmony-sdk/remote/write';

import { livingRoom } from './library.ts';
import { readRemote, type Opened } from './read-attached.ts';

// On the cable, `readRemote()` opens the one attached remote with
// `openAttached` in `read-attached.ts`. Here a pretend Harmony One stands in,
// holding a configuration built from a document: `pretendReader` gives what
// `openAttached` gives, something to read through and the profile of the
// remote's model.
const harmonyOne = {
  name: 'Harmony One',
};

const remote = pretendRemote({
  model: harmonyOne,
  holds: livingRoom(harmonyOne),
});

async function pretend(): Promise<Opened> {
  return {
    ...pretendReader(remote),
    close: async () => {},
  };
}

// The read takes what the configuration states its own length to be, and
// checks its end marker and its checksum before it hands anything back.
const seen: ReadProgress[] = [];
const read = await readRemote(pretend, (progress) => seen.push(progress));

assert.equal(seen.at(-1)!.done, read.bytes.length);
assert.equal(read.retries, 0);

// What the configuration holds, read by the config package: the devices and
// the activities as the remote has them.
const container = parse(read.bytes);
const deviceNames = devices(container).map((device) => device.name);
const activityNames = activities(container).map((activity) => activity.name);

assert.deepEqual(deviceNames, ['Television', 'Receiver']);
assert.deepEqual(activityNames, ['Watch TV']);
