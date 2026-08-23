// Where does a command made of several presses live? At the button, not inside a record.
import { readFileSync } from 'node:fs';
import { imagePath } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { keyCodes } from '../src/inventory.ts';
const CONTAINERS = ['one_config', 'h600_config', 'h700_config', 'arch8_config_885',
  'arch8_config_a', 'h525_config', 'one_spare_after_sync', 'calibration_one'];
for (const name of CONTAINERS) {
  const p = imagePath(name);
  if (p === undefined) continue;
  const c = parse(new Uint8Array(readFileSync(p)));
  const keys = keyCodes(c) ?? [];
  const multi = keys.filter((k) => (k.codes.length) > 1);
  const lengths = new Map<number, number>();
  for (const k of multi) lengths.set(k.codes.length, (lengths.get(k.codes.length) ?? 0) + 1);
  console.log(`${name.padEnd(22)} ${String(keys.length).padStart(4)} bindings, `
    + `${String(multi.length).padStart(3)} send more than one code   `
    + [...lengths].sort((a, b) => a[0] - b[0]).map(([l, n]) => `${l} codes x${n}`).join(', '));
}
