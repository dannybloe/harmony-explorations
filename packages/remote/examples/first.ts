// A first program: a document for a Harmony One, one device added to it, the
// document checked and built into the file the remote is sent. Nothing needs
// to be attached.
import assert from 'node:assert/strict';

// On Node, the config package's Node entry. It carries the main entry whole
// and supplies the fonts the check and the build draw the remote's screens
// with.
import {
  buildFromRecipe,
  localTimestamp,
  recipe,
} from '@freeharmony-sdk/config/node';

// A device's definition, taken from the saved document in `documents/`
// beside these examples. A definition is the device's and not the remote's,
// so a television a Harmony Touch's document carries goes into a Harmony
// One's as it is.
import { carried } from './library.ts';

// 1. A document for one remote, created empty for its model, which is named
// as Logitech names it. In the code a document is a `Recipe`, and `recipe` is
// the toolkit that makes and changes one.
let document = recipe.create({
  name: 'Harmony One',
});

// 2. A device added. The change returns a new document, which is the one
// kept.
const change = recipe.addDevice(document, {
  name: 'Television',
  device: carried('LG TV'),
});

document = change.document;

// 3. The document checked: no problems, so it can be built.
assert.deepEqual(recipe.check(document), []);

// 4. Built into what a Harmony One is sent: one configuration file, stamped
// with the moment it is built at.
const built = buildFromRecipe(document, {
  builtAt: localTimestamp(new Date()),
});

assert.equal(built.kind, 'configuration');

// The bytes are what a sync writes to the remote, later in the guide.
if (built.kind === 'configuration') {

  const size = built.bytes.length;

  console.log(`a configuration for the ${built.model}, ${size} bytes`);
}
