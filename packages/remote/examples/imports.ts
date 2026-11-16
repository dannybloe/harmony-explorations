// What an application imports: each package by its name, and a write subpath only where it writes.
import assert from 'node:assert/strict';

import { MODELS_BY_SKIN } from '@freeharmony-sdk/base';
import { buildFromRecipe, capabilitiesOf, recipe } from '@freeharmony-sdk/config';
import { readConfig } from '@freeharmony-sdk/remote';
import { pretendRemote, syncDocument } from '@freeharmony-sdk/remote/write';
import { listHarmony } from '@freeharmony-sdk/usb';

// Every one of them is an ordinary function or value, loaded with nothing attached.
for (const name of [buildFromRecipe, capabilitiesOf, recipe.create, readConfig, pretendRemote, syncDocument, listHarmony]) {
  assert.equal(typeof name, 'function');
}
assert.equal(MODELS_BY_SKIN[54]?.name, 'One');
