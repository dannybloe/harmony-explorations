/**
 * The commands a mode's pages show on the Harmony 600, 650 and 700, the four slot family's
 * `screenItems` and `drawsName`: an item per corner, `FOUR_SLOT_ITEMS`, its label read back with a space
 * between its two lines. Moved here unchanged from `activityroles.ts`, plan 007.
 */
import type { Container } from '../../gspm.ts';
import { ACTION_LIST_INDEX_OPCODE, modeRecords, taggedList } from '../../sections.ts';

import { characterMap, screenStrings } from '../../text.ts';
import { ComposeError } from '../../shared/core.ts';
import type { DeviceScreenItem } from '../../activityroles.ts';
import { FOUR_SLOT_ITEMS, fourSlotCellAt } from './geometry.ts';

export function fourSlotScreenItems(c: Container, mode: number): DeviceScreenItem[] {
  const record = (modeRecords(c) ?? [])[mode];
  if (record === undefined) throw new ComposeError(`mode ${mode} does not exist`);
  const drawn = screenStrings(c, characterMap(c));
  const out: DeviceScreenItem[] = [];
  for (const page of record.pages) {
    const lines = drawn.filter((one) => one.program === page.program && one.y >= 20 && one.y <= 100);
    const entries = taggedList(c, page.list)?.entries ?? [];
    FOUR_SLOT_ITEMS.forEach((item, k) => {
      const entry = entries.find((one) => (one.tag & 0x3f) === item.scan && one.opcode === ACTION_LIST_INDEX_OPCODE);
      if (entry === undefined) return;
      const label = lines.filter((one) => fourSlotCellAt(one.x, one.y) === k)
        .sort((a, b) => a.y - b.y).map((one) => one.text.trim()).join(' ');
      out.push({ label, list: entry.operand });
    });
  }
  return out;
}

/** A corner's label is the name as written, its two lines read back with a space between them. */
export function fourSlotDrawsName(_c: Container, item: DeviceScreenItem, name: string): boolean {
  return item.label === name;
}
