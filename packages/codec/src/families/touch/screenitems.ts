/**
 * The commands a mode's pages show on the Harmony One, the touch family's `screenItems` and `drawsName`,
 * `todo-compile-one.md` 1.2.9.
 *
 * An item is a pad: one of the six places, `DEVICE_PAGE_SLOTS`, bound by the page's list on its scan,
 * `DEVICE_PAGE_SCANS`, with the lines drawn inside its box. **A label cannot be read back into the name it
 * was drawn from**, since a name breaks at a capital after a lower case letter with nothing drawn between
 * the parts, and a word too wide is cut with `..`, section 394. So a name is matched the other way round:
 * laid out by the same rule, `touchLabelLines`, in the configuration's pad font, and compared line for line.
 */
import type { Container } from '../../gspm.ts';
import { fontSets } from '../../font.ts';
import { ACTION_LIST_INDEX_OPCODE, modeRecords, taggedList } from '../../sections.ts';
import { characterMap, screenStrings } from '../../text.ts';
import { ComposeError } from '../../shared/core.ts';
import type { DeviceScreenItem } from '../../activityroles.ts';
import { DEVICE_PAGE_SCANS, DEVICE_PAGE_SLOTS } from './menus.ts';
import { padFontOf, TOUCH_PAD_HEIGHT, TOUCH_PAD_WIDTH, touchLabelLines } from './labels.ts';

export function touchScreenItems(c: Container, mode: number): DeviceScreenItem[] {
  const record = (modeRecords(c) ?? [])[mode];
  if (record === undefined) throw new ComposeError(`mode ${mode} does not exist`);
  const drawn = screenStrings(c, characterMap(c));
  const out: DeviceScreenItem[] = [];
  for (const page of record.pages) {
    const entries = taggedList(c, page.list)?.entries ?? [];
    DEVICE_PAGE_SCANS.forEach((scan, k) => {
      const entry = entries.find((one) => (one.tag & 0x3f) === scan && one.opcode === ACTION_LIST_INDEX_OPCODE);
      if (entry === undefined) return;
      const [x, y] = DEVICE_PAGE_SLOTS[k] as readonly [number, number];
      const lines = drawn.filter((one) => one.program === page.program
        && one.x >= x && one.x < x + TOUCH_PAD_WIDTH && one.y >= y && one.y < y + TOUCH_PAD_HEIGHT)
        .sort((a, b) => a.y - b.y).map((one) => one.text);
      out.push({ label: lines.join(' '), list: entry.operand, lines });
    });
  }
  return out;
}

/** Whether `name` laid out on a pad by the compiler's rule gives the item's lines; false where it cannot be spelt. */
export function touchDrawsName(c: Container, item: DeviceScreenItem, name: string): boolean {
  const map = characterMap(c);
  const font = padFontOf(c);
  const set = font === undefined ? undefined : (fontSets(c) ?? [])[font];
  if (map === undefined || font === undefined || set === undefined || item.lines === undefined) return false;
  let lines: string[];
  try {
    lines = touchLabelLines(c, map, set, font, name, { x: 0, y: 0 }).map((one) => one.text);
  } catch (error) {
    if (error instanceof ComposeError) return false;
    throw error;
  }
  return lines.length === item.lines.length && lines.every((one, k) => one === item.lines![k]);
}
