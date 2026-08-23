import { readFileSync } from 'node:fs';
import { imagePath } from '@harmony/lab';
import { parse, archSlot } from '../src/gspm.ts';
import { devices } from '../src/inventory.ts';
const CONTAINERS = ['one_config', 'h600_config', 'h700_config', 'one_spare_after_sync',
  'arch8_config_885', 'h525_config'];
for (const name of CONTAINERS) {
  const p = imagePath(name); if (p === undefined) continue;
  const c = parse(new Uint8Array(readFileSync(p)));
  const slot = archSlot(c.architecture!, 16);
  const s16 = c.sections[slot];
  console.log(`${name.padEnd(22)} arch ${c.architecture}  raw slot ${slot}  `
    + `address ${s16 === undefined ? 'no slot' : `0x${s16.address.toString(16)}`}  `
    + `length ${c.sectionLength(slot) ?? '-'}`);
}
console.log('\nh600_config devices:');
const c = parse(new Uint8Array(readFileSync(imagePath('h600_config')!)));
for (const d of devices(c) ?? []) {
  console.log(`  group ${d.group}  ${d.label ?? '(unnamed)'}  via ${d.source}`);
}
