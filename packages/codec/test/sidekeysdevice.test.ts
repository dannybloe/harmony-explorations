/**
 * The first catalogue device composed onto a Harmony 885's configuration, `todo-compile-885.md` 2.1: the Sony
 * DAV-C540 as `Sony HT`, eight commands, onto bench unit A's own configuration, `h885_a_config`, with the side keys
 * family, `families/harmony-880-885/`.
 *
 * **Why this device.** It is the test setup's own, `todo-compile-885.md` 1.6, so what is learned here carries; its
 * name and every label asked for are spelled in unit A's fonts, where the setup's other names lack letters A's title
 * font does not hold, `lab/work/legacy-remotes/notes/harmony-885/compile-1.6-setup.md` section 3; and its codes are
 * Sony's SIRC in three lengths, 12 bit for Function, 15 bit for power, volume and mute, 20 bit for play, pause and
 * stop, none of which toggles, so its group, the ninth, flips a toggle bit whose partner, group 0, holds no code of
 * two forms on unit A. Eight commands fill one page exactly, every cell and every row, and leave the device mode
 * of several pages to 2.5.
 *
 * **There is no Logitech compile to check against**: their service compiles nothing for the 880 or 885. So the
 * compare base is what every arch 8 configuration the lab holds does, six contributed and the two bench units', and
 * the first half of this file is that census, each figure a fact a builder of the family relies on, asserted as an
 * exact count over the eight configurations. **Two of them carry one remote's device list**, `arch8_config_c` and
 * `arch8_config_d`, the same rows and pages, so the eight are seven remotes and every count over them counts that
 * list twice; no conclusion turns on it. The second half is the composition, read back by the codec's own readers
 * and held to the arch 8 rails of `writing-a-config` a composed device reaches. The start check as the firmware
 * performs it runs on the file the lab holds, `tests/test_harmony_885_start_check.py`.
 *
 * **What is the device's and what is borrowed.** The device's records, its lists, its power variable, its title,
 * its labels and the page's list are built. The pictures, the fonts, the bars, the queued screen program and the
 * mode's own list of handlers are the configuration's own, borrowed off its device modes and its device list, as
 * the 650 track borrowed until its chapter 6.
 *
 * **The device list is several copies**, one per activity, one for outside every activity and one that nothing
 * read enters, each listing every device; the census of them is below, and the device goes onto every copy.
 *
 * **Power, `todo-compile-885.md` 2.2 and 2.3.** 2.1 composed the power step the way Logitech's compiles for the
 * Harmony 650 and 700 spell it, sections 309 and 320: the press with no silence in front, sent at the catalogue's
 * inter key delay, 5 tenths for the Sony. These remotes' compiles spell it otherwise, and the census below is the
 * evidence. **Copies count twice**: `arch8_config_a` to `_d` are one account at four moments, so the 44 power
 * variables of the eight configurations are 28 distinct devices, counted by their set of power records; figures
 * below give both. Over the 88 transitions: every record a transition sends is one block with no held part, and a
 * device's on and off records open with one silence, the device's own: 50 ms on 3 variables and 1 distinct device
 * (one media centre PC in three containers), 200 ms on 3 and 3, 500 ms on 34 and 20, 800 ms on 1 and 1, a second
 * on 3 and 3. Every power on transition ends in a wait of the device's own, 44 of 44, and no off transition does.
 * **The silence is the device's, not the power key's**: on the infrared groups of the 41 power variables whose
 * power code opens with more than 50 ms, every record without a held block opens with that device's silence, 1375
 * of 1375, every record with a held block opens with 50 ms, 1140 of 1140, and no held or tail block opens with a
 * silence at all, all counted over the eight configurations, copies included.
 *
 * **The quantity** after each power send is 0, 1 or 2, on 26, 60 and 2 transitions, and on every one it is the most
 * common quantity of the device's other once only sends, 88 of 88, so there is no quantity of power's own. By
 * model it splits: the 880s' (skin 15) 1 on 13 of 24 variables, 0 on 10 and 2 on 1, the 885s' (skin 17) 1 on 17 of
 * 20 and 0 on 3, and 0 is the commonest in `arch8_config_a` and `_b`. **It is not a function of the records**: the
 * `DVD_speler` of the two bench units has identical power records, sent at 1 on unit A and at 0 on unit B. So 1,
 * what every other send of a composed device carries and so that device's most common, is ours. **The long press
 * version** exists on one device: the Panasonic television whose catalogue entry holds power on and off for 1000
 * ms each, the only hold the archive states for the eight devices of these configurations it names, and its two
 * records are the only power records of seven frames, led by its 800 ms. The six frame power records of the
 * `DVD_speler` and of the LaserDisc player are not holds as far as can be seen: the same code's records with a held
 * block are six frames too (a scratch look, not asserted). The LaserDisc player's the catalogue rebuilds word for
 * word, below; the `DVD_speler` is a device the archive does not name, so nothing explains its count.
 *
 * **The closure is the catalogue against the compile**, independent fields at both ends: the catalogue's codes and
 * holds composed by the codec's own long press and spelling rules, and Logitech's bytes read out of the owners'
 * configurations. Composed onto unit A with each device's own silence passed in (the owners edited their delays,
 * `todo-prepare-885.md` 3.11, so the catalogue's 500 ms would test the edit, not the spelling), the power records
 * of seven of the eight devices are Logitech's word for word, carrier included, 14 transitions, the long press
 * version among them. The eighth, the 32AS500, matches in carrier, length and silence and differs in the code's
 * bits; that the owner's two televisions share their codes is the owner's note, not asserted here. **The control**,
 * in the calibration test: the same records with the silence one microsecond longer match none of Logitech's.
 * **What stays inferred** is that the silence is the account's delay between devices; the calibration closes the
 * spelling, not the value. And the quantity: on these eight devices Logitech's are 1 on 12 of 16 transitions and 0
 * on 4, and never the inter key delay where the catalogue states one other than 100 ms; that rests on two devices of
 * one configuration, the VCR and the LaserDisc player, 500 ms in the catalogue and sent at 1. What chooses 0 or 2 is
 * not read. **Not changed**: a composed device still keeps the power command's own record as an ordinary press
 * beside the step's, where Logitech's compile has one record and one list, which a device page's key binds too on
 * 39 of the 44 power on transitions (asserted below: the send list the on transition calls is the operand of some
 * mode page's tagged list). And a composed device's other page keys send the 50 ms form with a held block, where
 * Logitech's page keys mostly send the device's silence and no held block, `todo-compile-885.md` 2.9.
 *
 * **Width.** Arch 8: the Harmony 880 and 885, which run one application; of the eight configurations five are
 * 880s' and three 885s', by the skin byte each states (15 and 17), `arch8devicelist.test.ts`. The Harmony 720 and
 * 880 Pro, also arch 8, are not among them and nothing here covers them.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { IR_ARCHIVE, load, needing, require_, skipUnless, skipWithoutIrArchive } from '@harmony/lab';
import { u24 } from '../src/bytes.ts';
import { gridCellAt } from '../src/cornerlayout.ts';
import {
  SIDE_KEYS_GRID, SIDE_KEYS_LEFT_X, SIDE_KEYS_LINE_Y, SIDE_KEYS_NUMBER_END, SIDE_KEYS_OF_X, SIDE_KEYS_RIGHT_END,
  SIDE_KEYS_ROW_PITCH, SIDE_KEYS_ROW_TOP, SIDE_KEYS_SEPARATOR_X, SIDE_KEYS_TOTAL_X, SIDE_KEYS_ARROW_X,
  SIDE_KEYS_LABEL_WIDTH,
} from '../src/families/harmony-880-885/index.ts';
import { catalogueDriving } from '../src/driving.node.ts';
import { compiledBlockWords } from '../src/shared/infrared.ts';
import { familyOf } from '../src/families/registry.ts';
import { sideKeysCopyModes, sideKeysDeviceLists } from '../src/families/harmony-880-885/devicescreen.ts';
import { SIDE_KEYS_SENDS } from '../src/families/harmony-880-885/sends.ts';
import type { ComposeDevice } from '../src/shared/devices.ts';
import { textGlyphs, textWidth } from '../src/shared/spelling.ts';
import {
  activities,
  activityBindings,
  assertQueueFits,
  assertStateTableConsistent,
  ComposeError,
  type Container,
  deviceListRows,
  devices,
  irGroups,
  parse,
  saveEdits,
} from '../src/index.ts';
import {
  ACTION_LIST_INDEX_OPCODE,
  archSlot,
  BINDING_SLOT,
  characterMap,
  compilerTagOrder,
  coverage,
  deviceVariables,
  fontSets,
  handlerSets,
  irBlockWords,
  irCarrier,
  irGroupCount,
  irHeaderPointers,
  irRecordStart,
  logArea,
  modePages,
  modeRecords,
  pageListCopies,
  parameterGroupLengthsMatch,
  parameterGroups,
  roundTrip,
  screenProgram,
  screenStrings,
  stateRecords,
  stateTable,
  stateVariableSite,
  taggedList,
  timers,
  trailerAgrees,
} from '../src/internal.ts';
import { composeCatalogueDevice, instructionSites } from '../src/build.ts';
import { archiveAt } from '../src/catalogue.node.ts';
import '../src/resources.node.ts';

/** Every arch 8 configuration the lab holds of the 880 and 885: six contributed, the two bench units'. */
const ARCH8 = ['arch8_config_a', 'arch8_config_b', 'arch8_config_c', 'arch8_config_d', 'arch8_config_880',
  'arch8_config_885', 'h885_a_config', 'h885_b_config'] as const;

const SEND = 0x7d;
const QUANTITY = 0x7c;
const DRAW = 2;
const COPY_REGION = 3;
const FONT = 16;
const QUEUE = 17;
const TEXT_AT = 4;
const TEXT_INLINE = 5;
const BEEP = 0x75;
/** The Devices key's press, the tag an activity's key map binds to its copy of the device list. */
const DEVICES_KEY = 0x8a;
/** The opcodes the 880 and 885's screen interpreter runs, `tests/test_harmony_885_screens.py`, and 0, the end. */
const SCREEN_OPCODES = new Set([0, 1, 2, 3, 4, 5, 16, 17, 18, 19, 20, 21]);

/** The device composed, as `compose-device.ts` was run to make the lab's file: the same request, the same labels. */
const SONY = {
  manufacturer: 'Sony', model: 'DAV-C540', label: 'Sony HT',
  commands: ['PowerToggle', 'VolumeUp', 'VolumeDown', 'Mute', 'Function', 'Play', 'Pause', 'Stop'],
  labels: ['Power', 'Vol +', 'Vol -', 'Mute', 'Function', 'Play', 'Pause', 'Stop'],
} as const;

const open = (name: string): Container => parse(require_(name));

/** The device modes of a configuration. */
const deviceModesOf = (c: Container): number[] => devices(c).flatMap((one) => (one.mode === undefined ? [] : [one.mode]));

test('every send of an arch 8 configuration is the plain pair, every power variable switches on through one call and one wait naming its device\'s group, and no wait is above 100 tenths',
  skipUnless(...ARCH8), () => {
    let pairs = 0;
    let otherSends = 0;
    let onLists = 0;
    let longest = 0;
    const onShapes = new Set<string>();
    for (const name of ARCH8) {
      const c = open(name);
      const lists = c.actionLists() ?? [];
      for (const list of lists) {
        for (const one of list) if (one.opcode === QUANTITY) longest = Math.max(longest, one.operand & 0xff);
        if (!list.some((one) => one.opcode === SEND)) continue;
        const [send, quantity] = list;
        if (list.length === 2 && quantity?.opcode === QUANTITY && send!.operand >> 8 === quantity.operand >> 8) pairs += 1;
        else otherSends += 1;
      }
      for (const variable of deviceVariables(c).filter((one) => one.property === 'Power')) {
        const on = stateRecords(c)?.[variable.index]?.values.find((one) => one.from === 0 && one.to === 1);
        assert.equal(on?.opcode, ACTION_LIST_INDEX_OPCODE, `${name}: ${variable.device} switches on through a list`);
        const body = lists[on!.operand]!;
        onShapes.add(body.map((one) => one.opcode.toString(16)).join(','));
        // The wait names the device's own group, as a send's quantity does.
        assert.equal(body[1]!.operand >> 8, lists[body[0]!.operand]![0]!.operand >> 8, `${name}: ${variable.device}`);
        onLists += 1;
      }
    }
    assert.deepEqual([pairs, otherSends], [3280, 0]);
    assert.equal(onLists, 44);
    assert.deepEqual([...onShapes], ['7f,7c']);
    assert.equal(longest, 100);
  });

/** The silence a block opens with, in microseconds: its space words up to the first mark. */
const leadOf = (words: readonly number[]): number => {
  let sum = 0;
  for (const word of words) {
    if (word === 0 || (word & 0x8000) !== 0) break;
    sum += word;
  }
  return sum;
};

/** The words of the record `send` names, one string per pointer of its groups, `-` for a null pointer. */
const recordWords = (c: Container, send: number): string[] => {
  const address = irGroups(c)![send >> 8]!.addresses[send & 0xff]!;
  return irHeaderPointers(c, address).map((pointer) => (pointer === 0 ? '-' : irBlockWords(c, pointer)!.join(',')));
};

/**
 * What a power transition runs, followed to its send: the transition's list, the send list it names (the list
 * itself for an off transition, the first call of an on list), and that list's send and quantity.
 */
function powerSends(c: Container, variable: number): { from: number; to: number; list: number; send: number; quantity: number }[] {
  const lists = c.actionLists() ?? [];
  return stateRecords(c)![variable]!.values.filter((one) => one.from >= 0 && one.to >= 0).map((one) => {
    assert.equal(one.opcode, ACTION_LIST_INDEX_OPCODE);
    const first = lists[one.operand]![0]!;
    const list = first.opcode === ACTION_LIST_INDEX_OPCODE ? first.operand : one.operand;
    const [send, quantity] = lists[list]!;
    assert.deepEqual([send!.opcode, quantity!.opcode], [SEND, QUANTITY]);
    return { from: one.from, to: one.to, list, send: send!.operand, quantity: quantity!.operand & 0xff };
  });
}

/** The skin byte of a configuration's architecture record, which names the model: 15 an 880, 17 an 885. */
const skinOf = (c: Container): number => c.blob[c.blobOffsetOf(c.sections[archSlot(8, 1)]!.address)! + 2]!;

test('todo-compile-885 2.2 and 2.3: every record an arch 8 power transition sends is one block opening with its device\'s silence, the same on and off, over 44 variables and 28 distinct devices; only the Panasonic television\'s are seven frames; every on transition ends in a wait; and the send\'s quantity is the device\'s most common once only one, 1 on 60 of 88',
  skipUnless(...ARCH8), () => {
    let transitions = 0;
    let withHeld = 0;
    let onOffDiffer = 0;
    const leads = new Map<number, number>();
    const quantities = new Map<number, number>();
    let modal = 0;
    let onWaits = 0;
    let offWaits = 0;
    let onBound = 0;
    const longest: string[] = [];
    // Distinct devices: a variable's set of power records, so the four copies of one account count once.
    const distinct = new Map<string, number>();
    // The quantity per model, by variable: the on transition's send stands for the variable.
    const bySkin = new Map<string, number>();
    // The silence census, on the groups whose power code opens with more than 50 ms.
    let onceOnly = 0;
    let onceOnlyLed = 0;
    let withHeldBlock = 0;
    let heldAt50 = 0;
    let laterBlocksLed = 0;
    const dvd = new Map<string, { records: string; quantity: number }>();
    for (const name of ARCH8) {
      const c = open(name);
      const lists = c.actionLists() ?? [];
      const bound = new Set(modePages(c).flatMap((page) => (taggedList(c, page.list)?.entries ?? [])
        .filter((one) => one.opcode === ACTION_LIST_INDEX_OPCODE).map((one) => one.operand)));
      const groupLeads = new Map<number, number>();
      for (const variable of deviceVariables(c).filter((one) => one.property === 'Power')) {
        const sends = powerSends(c, variable.index);
        const variableLeads = new Set<number>();
        const records: string[] = [];
        for (const one of sends) {
          transitions += 1;
          const words = recordWords(c, one.send);
          records.push(words.join('|'));
          const [once, held, tail] = words;
          if (held !== '-' || tail !== '-') withHeld += 1;
          const onceWords = once!.split(',').map(Number);
          variableLeads.add(leadOf(onceWords));
          quantities.set(one.quantity, (quantities.get(one.quantity) ?? 0) + 1);
          // The most common quantity of the device's other sends of a record with no held block, strictly.
          const group = one.send >> 8;
          const counts = new Map<number, number>();
          lists.forEach((list, k) => {
            if (k === one.list || list.length !== 2 || list[0]!.opcode !== SEND || list[0]!.operand >> 8 !== group) return;
            if (recordWords(c, list[0]!.operand)[1] !== '-') return;
            const quantity = list[1]!.operand & 0xff;
            counts.set(quantity, (counts.get(quantity) ?? 0) + 1);
          });
          const ranked = [...counts].sort((x, y) => y[1] - x[1]);
          if (ranked[0]?.[0] === one.quantity && (ranked[1] === undefined || ranked[1][1] < ranked[0][1])) modal += 1;
          // The on transition's own list: a call of the send list and a wait; the off transition runs the send list.
          const top = lists[stateRecords(c)![variable.index]!.values.find((t) => t.from === one.from && t.to === one.to)!.operand]!;
          const waits = top !== lists[one.list] && top.some((step) => step.opcode === QUANTITY);
          if (one.from === 0) {
            if (waits) onWaits += 1;
            if (bound.has(one.list)) onBound += 1;
            const skin = `${skinOf(c)} ${one.quantity}`;
            bySkin.set(skin, (bySkin.get(skin) ?? 0) + 1);
          } else if (waits) offWaits += 1;
          // Frames: runs of marks parted by more than 10 ms of silence.
          let frames = 0;
          let gap = Infinity;
          for (const word of onceWords) {
            if (word === 0) break;
            if (word & 0x8000) {
              if (gap > 10000) frames += 1;
              gap = 0;
            } else gap += word;
          }
          if (frames >= 7) longest.push(`${name} ${variable.device} ${frames}`);
          groupLeads.set(group, leadOf(onceWords));
        }
        if (variableLeads.size !== 1) onOffDiffer += 1;
        const lead = [...variableLeads][0]! / 1000;
        leads.set(lead, (leads.get(lead) ?? 0) + 1);
        const key = records.sort().join('#');
        if (!distinct.has(key)) distinct.set(key, lead);
        if (variable.device === 'DVD_speler') dvd.set(name, { records: key, quantity: sends[0]!.quantity });
      }
      for (const [group, lead] of groupLeads) {
        if (lead <= 50000) continue;
        for (const address of irGroups(c)![group]!.addresses) {
          const pointers = irHeaderPointers(c, address);
          const once = irBlockWords(c, pointers[0]!)!;
          if (pointers[1] === 0) {
            onceOnly += 1;
            if (leadOf(once) === lead) onceOnlyLed += 1;
          } else {
            withHeldBlock += 1;
            if (leadOf(once) === 50000) heldAt50 += 1;
          }
          for (const later of [pointers[1]!, pointers[2]!]) if (later !== 0 && leadOf(irBlockWords(c, later)!) > 0) laterBlocksLed += 1;
        }
      }
    }
    assert.equal(transitions, 88);
    assert.equal(withHeld, 0, 'every power record is one block, played once');
    assert.equal(onOffDiffer, 0, 'a device\'s power on and off open with one silence');
    // By variable, then by distinct device: 50 ms is one media centre PC in three containers.
    assert.deepEqual([...leads].sort((a, b) => a[0] - b[0]), [[50, 3], [200, 3], [500, 34], [800, 1], [1000, 3]]);
    assert.equal(distinct.size, 28);
    const distinctLeads = new Map<number, number>();
    for (const lead of distinct.values()) distinctLeads.set(lead, (distinctLeads.get(lead) ?? 0) + 1);
    assert.deepEqual([...distinctLeads].sort((a, b) => a[0] - b[0]), [[50, 1], [200, 3], [500, 20], [800, 1], [1000, 3]]);
    // The silence is the device's: every once only record of those devices carries it, every held one 50 ms.
    assert.deepEqual([onceOnlyLed, onceOnly, heldAt50, withHeldBlock, laterBlocksLed], [1375, 1375, 1140, 1140, 0]);
    // A wait ends every on transition and no off transition; a page's key binds the on transition's send list on 39.
    assert.deepEqual([onWaits, offWaits, onBound], [44, 0, 39]);
    // The quantity: 0, 1 or 2, always the device's most common once only one; by model per variable.
    assert.deepEqual([...quantities].sort((a, b) => a[0] - b[0]), [[0, 26], [1, 60], [2, 2]]);
    assert.equal(modal, 88);
    assert.deepEqual([...bySkin].sort(), [['15 0', 10], ['15 1', 13], ['15 2', 1], ['17 0', 3], ['17 1', 17]]);
    // Not a function of the records: the bench units' DVD player, identical power records, 1 on A and 0 on B.
    assert.equal(dvd.get('h885_a_config')!.records, dvd.get('h885_b_config')!.records);
    assert.deepEqual([dvd.get('h885_a_config')!.quantity, dvd.get('h885_b_config')!.quantity], [1, 0]);
    // The only power records of seven frames: the Panasonic television whose catalogue entry holds the key a second.
    assert.deepEqual(longest, ['arch8_config_880 Pana_32AS600 7', 'arch8_config_880 Pana_32AS600 7']);
  });

/**
 * The devices of the owners' sheets that Logitech's catalogue in the archive names, each with the configuration
 * holding it, its name there, its power commands and the silence its codes open with there, in tenths: what the
 * calibration composes with, since the owners' delays are edited, `todo-prepare-885.md` 3.11.
 */
const SHEET = [
  ['arch8_config_880', 'Pana_32AS600', 'Panasonic', 'TX-32AS600B', 8, ['PowerOn', 'PowerOff']],
  ['arch8_config_880', 'Pana_32AS500', 'Panasonic', 'TX-32AS500B', 5, ['PowerOn', 'PowerOff']],
  ['arch8_config_885', 'TX-55GZ950B', 'Panasonic', 'TX-55GZ950B', 5, ['PowerOn', 'PowerOff']],
  ['arch8_config_885', 'HR-S6855', 'JVC', 'HR-S6855', 2, ['PowerToggle']],
  ['arch8_config_885', 'DTR-T2110', 'Humax', 'DTR-T2110', 5, ['PowerToggle']],
  ['arch8_config_885', 'TX-NR626', 'Onkyo', 'TX-NR626', 10, ['PowerOn', 'PowerOff']],
  ['arch8_config_885', 'DMP-BD60', 'Panasonic', 'DMP-BD60', 2, ['PowerToggle']],
  ['arch8_config_885', 'DVL-909', 'Pioneer', 'DVL-909', 2, ['PowerToggle']],
] as const;

test('todo-compile-885 2.2 and 2.3: the catalogue\'s power of the eight sheet devices, composed onto unit A with each device\'s own silence, is Logitech\'s power record word for word on seven, the Panasonic\'s long press version included, and differs in the code alone on the eighth',
  needing(skipUnless('h885_a_config', 'arch8_config_880', 'arch8_config_885'), skipWithoutIrArchive()), () => {
    const a = open('h885_a_config');
    const same: string[] = [];
    const differ: string[] = [];
    let atOne = 0;
    let controlMatches = 0;
    const theirQuantities: string[] = [];
    for (const [config, device, manufacturer, model, lead, commands] of SHEET) {
      const c = open(config);
      const variable = deviceVariables(c).find((one) => one.device === device && one.property === 'Power')!;
      const theirSends = powerSends(c, variable.index);
      for (const one of theirSends) theirQuantities.push(`${device} ${one.quantity}`);
      const theirs = new Map(theirSends.map((one) => [`${one.from}${one.to}`,
        [irCarrier(c, irGroups(c)![one.send >> 8]!.addresses[one.send & 0xff]!)?.periodNs, ...recordWords(c, one.send)]]));
      // The label and pad words are A's own letters; what is compared is the records.
      const composed = parse(composeCatalogueDevice(a, archiveAt(IR_ARCHIVE!), {
        manufacturer, model, label: 'Sony HT', commands: [...commands], labels: ['Power', 'Mute'].slice(0, commands.length),
        interDeviceDelay: lead,
      }).bytes);
      const ours = deviceVariables(composed).find((one) => one.device === 'Sony_HT' && one.property === 'Power')!;
      for (const one of powerSends(composed, ours.index)) {
        const words = [irCarrier(composed, irGroups(composed)![one.send >> 8]!.addresses[one.send & 0xff]!)?.periodNs,
          ...recordWords(composed, one.send)];
        const key = `${one.from}${one.to}`;
        if (one.quantity === 1) atOne += 1;
        (JSON.stringify(words) === JSON.stringify(theirs.get(key)) ? same : differ).push(`${device} ${key}`);
        // The control: the same record with its silence one microsecond longer, spelled by the same rule, must match
        // nothing of Logitech's, or the comparison above could not tell a silence from its neighbour.
        const onceWords = (words[1] as string).split(',').map(Number);
        const silence = leadOf(onceWords);
        const longer = compiledBlockWords([{ mark: false, us: silence + 1 }], 0, { carve: false }).map((one) => one.microseconds);
        const body = onceWords.slice(onceWords.findIndex((word) => (word & 0x8000) !== 0));
        const control = [words[0], [...longer, ...body].join(','), ...words.slice(2)];
        if (JSON.stringify(control) === JSON.stringify(theirs.get(key))) controlMatches += 1;
        if (device === 'Pana_32AS500') {
          // The same carrier, length and silence, and other bits: the owner's two televisions share their codes.
          const [period, once] = words as [number, string];
          const [theirPeriod, theirOnce] = theirs.get(key) as [number, string];
          assert.equal(period, theirPeriod);
          assert.equal(once.split(',').length, theirOnce.split(',').length);
          assert.equal(leadOf(once.split(',').map(Number)), leadOf(theirOnce.split(',').map(Number)));
        }
      }
    }
    assert.deepEqual(differ, ['Pana_32AS500 01', 'Pana_32AS500 10']);
    assert.equal(same.length, 14);
    assert.equal(controlMatches, 0, 'one microsecond more of silence loses every match');
    assert.ok(same.includes('Pana_32AS600 01') && same.includes('Pana_32AS600 10'), 'the long press version, led');
    // Ours sends every one at 1; Logitech's at 1 on all but the 32AS500's and the Blu-ray player's, at 0. Never at the
    // catalogue's inter key delay where it is not 1: the VCR and the LaserDisc player state 500 ms and are sent at 1.
    assert.equal(atOne, 16);
    assert.deepEqual(theirQuantities.filter((one) => !one.endsWith(' 1')),
      ['Pana_32AS500 0', 'Pana_32AS500 0', 'DMP-BD60 0', 'DMP-BD60 0']);
    assert.equal(theirQuantities.length, 16);
    assert.deepEqual(SHEET.map(([, , manufacturer, model]) => catalogueDriving(IR_ARCHIVE!, manufacturer, model).timing.interKeyDelay),
      [100, 100, 100, 500, 100, 100, 100, 500]);
    // The one device whose catalogue entry holds the power key, for a second each way: the seven frame records.
    const held = SHEET.flatMap(([, device, manufacturer, model]) => {
      const power = catalogueDriving(IR_ARCHIVE!, manufacturer, model).power!;
      return [...(power.on ?? []), ...(power.off ?? []), ...(power.toggle ?? [])]
        .flatMap((step) => (step.kind === 'send' && step.holdMs !== undefined ? [`${device} ${step.command} ${step.holdMs}`] : []));
    });
    assert.deepEqual(held, ['Pana_32AS600 PowerOn 1000', 'Pana_32AS600 PowerOff 1000']);
  });

test('on every page of an arch 8 configuration a label line 18 below its row starts at x 3 in the left column or ends at x 125 in the right, is at most 59 wide and is followed by its column\'s separator, and a counter\'s number ends at 52, OF sits at 57, the total at 75 and the arrows at 25 and 88',
  skipUnless(...ARCH8), () => {
    let left = 0;
    let right = 0;
    let wrong = 0;
    let widest = 0;
    let separatorsAfter = 0;
    let counters = 0;
    let countersWrong = 0;
    for (const name of ARCH8) {
      const c = open(name);
      const sets = fontSets(c) ?? [];
      const records = modeRecords(c) ?? [];
      for (const mode of records.keys()) {
        for (const page of (records[mode]?.pages ?? [])) {
          const program = screenProgram(c, page.program) ?? [];
          let font = -1;
          program.forEach((one, k) => {
            if (one.opcode === FONT) font = one.operands[0]!;
            if (one.opcode !== TEXT_AT && one.opcode !== TEXT_INLINE) return;
            const [x, y] = [one.operands[0]!, one.operands[1]!];
            const codes = [...(textGlyphs(c, one) ?? [])];
            const width = textWidth(c, sets[font]!, codes);
            if (y === 152 && x === SIDE_KEYS_OF_X) {
              counters += 1;
              // The number before `OF` and the total after it.
              const number = program[k - 1]!;
              const total = program[k + 1]!;
              const numberWidth = textWidth(c, sets[font]!, [...(textGlyphs(c, number) ?? [])]);
              if (number.operands[0]! + numberWidth !== SIDE_KEYS_NUMBER_END || total.operands[0] !== SIDE_KEYS_TOTAL_X) countersWrong += 1;
              const arrows = program.filter((p) => p.opcode === DRAW && p.operands[1] === 152).map((p) => p.operands[0]);
              if (arrows.join() !== SIDE_KEYS_ARROW_X.join()) countersWrong += 1;
              return;
            }
            const cell = gridCellAt(SIDE_KEYS_GRID, x, y);
            if (cell === undefined || codes.length === 0) return;
            const item = SIDE_KEYS_GRID.items[cell]!;
            const offset = y - SIDE_KEYS_ROW_TOP - SIDE_KEYS_ROW_PITCH * item.row;
            if (offset !== SIDE_KEYS_LINE_Y) return;
            widest = Math.max(widest, width);
            if (item.column === 0) { if (x === SIDE_KEYS_LEFT_X) left += 1; else wrong += 1; }
            else if (x + width === SIDE_KEYS_RIGHT_END) right += 1;
            else wrong += 1;
            // The instruction after a cell's lower line is its separator, at its column's x and its row's top.
            const next = program[k + 1];
            if (next?.opcode === DRAW && next.operands[0] === SIDE_KEYS_SEPARATOR_X[item.column]
              && next.operands[1] === SIDE_KEYS_ROW_TOP + SIDE_KEYS_ROW_PITCH * item.row) separatorsAfter += 1;
          });
        }
      }
    }
    // Lines at 18 below the row: one line labels and the lower lines of two line ones, every one placed by column.
    assert.deepEqual([left, right, wrong], [1918, 1823, 0]);
    assert.equal(widest, SIDE_KEYS_LABEL_WIDTH);
    assert.equal(separatorsAfter, left + right, 'every such line is followed by its separator');
    assert.deepEqual([counters, countersWrong], [473, 0]);
  });

test('an arch 8 device mode of one page is its own program, the device modes of a configuration share their tags, handlers and queued list\'s content, and every device page stores its keys in the compiler\'s order, names the same lists in its pool copy and binds no list opening with a beep',
  skipUnless(...ARCH8), () => {
    let onePage = 0;
    let modes = 0;
    let pageListsInOrder = 0;
    let pageListsOutOfOrder = 0;
    let copiesSame = 0;
    let pages = 0;
    let items = 0;
    let beeps = 0;
    for (const name of ARCH8) {
      const c = open(name);
      const records = modeRecords(c) ?? [];
      const lists = c.actionLists() ?? [];
      const all = modePages(c);
      const copies = pageListCopies(c);
      const tagSets = new Set<string>();
      const handlers = new Set<string>();
      const queued = new Set<string>();
      for (const mode of deviceModesOf(c)) {
        modes += 1;
        const record = records[mode]!;
        tagSets.add(record.entries.map((one) => one.tag).join(','));
        handlers.add(record.entries.filter((one) => one.tag < 0x40).map((one) => `${one.tag}:${one.opcode}:${one.operand}`).join(' '));
        const head = screenProgram(c, record.start + record.length) ?? [];
        for (const one of head) {
          if (one.opcode === QUEUE && one.operands[2] === ACTION_LIST_INDEX_OPCODE) {
            queued.add(lists[one.operands[0]! | (one.operands[1]! << 8)]!.map((i) => `${i.opcode}:${i.operand}`).join(' '));
          }
        }
        if (record.pageCount === 1) {
          onePage += 1;
          assert.equal(record.pages[0]!.program, record.start + record.length, `${name}: mode ${mode}`);
        }
        for (const page of record.pages) {
          pages += 1;
          const tags = taggedList(c, page.list)!.entries.map((one) => one.tag);
          if (tags.length >= 2) {
            if (compilerTagOrder(tags).join() === tags.join()) pageListsInOrder += 1;
            else pageListsOutOfOrder += 1;
          }
          // A device page's item calls its list with no beep in front, the device page half of `screenItemsBeep`.
          for (const entry of taggedList(c, page.list)!.entries) {
            if (entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
            items += 1;
            if (lists[entry.operand]?.[0]?.opcode === BEEP) beeps += 1;
          }
          // A device page's pool copy names the same lists as the page.
          const copy = copies[all.findIndex((one) => one.address === page.address)]!;
          const own = taggedList(c, page.list)!.entries.map((one) => `${one.tag}:${one.operand}`).join();
          if (taggedList(c, copy + c.flashBase)!.entries.map((one) => `${one.tag}:${one.operand}`).join() === own) copiesSame += 1;
        }
      }
      assert.equal(tagSets.size, 1, `${name}: one order of tags on every device mode`);
      assert.equal(handlers.size, 1, `${name}: one set of handlers`);
      assert.equal(queued.size, 1, `${name}: one queued list's content`);
    }
    assert.deepEqual([modes, onePage], [51, 10]);
    // Every device page, 204 of them and each of two or more items, stores its tags in the compiler's order, and its
    // copy names the same lists.
    assert.deepEqual([pages, pageListsInOrder, pageListsOutOfOrder, copiesSame], [204, 204, 0, 204]);
    assert.deepEqual([items > 0, beeps], [true, 0]);
    assert.equal(items, 1455);
  });

test('an arch 8 configuration holds one copy of its device list per activity, entered from the Devices key in that activity\'s key map, one entered from the key map outside every activity, and one nothing reads as entering, each listing every device once; an activity\'s copy lists some devices first and the rest in the outside copy\'s order, which the unentered copy shares',
  skipUnless(...ARCH8), () => {
    const counts: number[] = [];
    let prefixes = 0;
    let outsideByGroup = 0;
    const heads: number[] = [];
    for (const name of ARCH8) {
      const c = open(name);
      const lists = c.actionLists() ?? [];
      const copies = sideKeysDeviceLists(c);
      const modes = deviceModesOf(c).sort((a, b) => a - b).join();
      for (const menu of copies) {
        assert.equal([...sideKeysCopyModes(c, menu)].sort((a, b) => a - b).join(), modes, `${name}: copy ${menu}`);
        assert.equal(modeRecords(c)![menu]!.pageCount, Math.ceil(deviceModesOf(c).length / 8), `${name}: copy ${menu}`);
      }
      // Which key map enters which copy: the Devices key of every base slot 9 set, an activity's or not.
      const setOfActivity = new Map(activityBindings(c).map((one) => [one.set, one.activity]));
      const entered = new Map<number, number | 'outside'>();
      handlerSets(c)!.addresses.forEach((address, set) => {
        for (const entry of taggedList(c, address)?.entries ?? []) {
          if (entry.tag !== DEVICES_KEY || entry.opcode !== ACTION_LIST_INDEX_OPCODE) continue;
          const menu = lists[entry.operand]?.find((one) => one.opcode === 0x7e)?.operand;
          if (menu !== undefined) entered.set(menu, setOfActivity.get(set) ?? 'outside');
        }
      });
      const activityCount = activities(c).length;
      const byActivity = [...entered.values()].filter((one) => one !== 'outside');
      assert.deepEqual([...new Set(byActivity)].length, activityCount, `${name}: one copy per activity`);
      const outside = [...entered.entries()].filter(([, who]) => who === 'outside').map(([menu]) => menu);
      assert.equal(outside.length, 1, `${name}: one copy outside every activity`);
      const unentered = copies.filter((menu) => !entered.has(menu));
      assert.equal(unentered.length, 1, `${name}: one copy nothing enters`);
      assert.deepEqual([...entered.keys()].filter((menu) => !copies.includes(menu)), [], `${name}: every Devices key enters a copy`);
      counts.push(copies.length);

      // The orders, in fill order: page by page, cell by cell.
      const order = (menu: number): number[] => {
        const rows: { page: number; cell: number; mode: number }[] = [];
        modeRecords(c)![menu]!.pages.forEach((page, k) => {
          for (const entry of taggedList(c, page.list)!.entries) {
            const mode = lists[entry.operand]?.find((one) => one.opcode === 0x7e)?.operand;
            if (mode === undefined) continue;
            rows.push({ page: k, cell: SIDE_KEYS_GRID.items.findIndex((item) => item.scan === (entry.tag & 0x3f)), mode });
          }
        });
        return rows.sort((a, b) => a.page - b.page || a.cell - b.cell).map((one) => one.mode);
      };
      const outsideOrder = order(outside[0]!);
      assert.deepEqual(order(unentered[0]!), outsideOrder, `${name}: the unentered copy in the outside order`);
      const groupOf = new Map(devices(c).map((one) => [one.mode, one.group]));
      const groups = outsideOrder.map((mode) => groupOf.get(mode)!);
      if (groups.join() === [...groups].sort((a, b) => a - b).join()) outsideByGroup += 1;
      for (const [menu, who] of entered) {
        if (who === 'outside') continue;
        const mine = order(menu);
        // The shortest head after which the copy runs in the outside order.
        const head = [...Array(mine.length + 1).keys()].find((p) => {
          const first = new Set(mine.slice(0, p));
          return mine.slice(p).join() === outsideOrder.filter((mode) => !first.has(mode)).join();
        });
        assert.ok(head !== undefined, `${name}: copy ${menu}`);
        heads.push(head);
        prefixes += 1;
      }
    }
    // a 3, b 4, c 5, d 5, the 880 6, the 885 11, unit A 5, unit B 9: the activities plus two on each.
    assert.deepEqual(counts, [3, 4, 5, 5, 6, 11, 5, 9]);
    assert.equal(prefixes, 32);
    assert.deepEqual([Math.min(...heads), Math.max(...heads)], [1, 4]);
    // The outside order is the infrared groups' order on none of the eight, and what it is instead is not read, so
    // where a new device falls in it is not known.
    assert.equal(outsideByGroup, 0);
  });

/** The Sony composed onto unit A, unstamped, as the composer returns it. */
function composeSony(): ReturnType<typeof composeCatalogueDevice> {
  return composeCatalogueDevice(open('h885_a_config'), archiveAt(IR_ARCHIVE!), { ...SONY, commands: [...SONY.commands], labels: [...SONY.labels] });
}

test('todo-compile-885 2.1: the Sony DAV-C540 composed onto unit A reads back as a ninth device with its codes, its power, its page and a row on a second page of every copy of the device list',
  needing(skipUnless('h885_a_config'), skipWithoutIrArchive()), () => {
    const base = open('h885_a_config');
    const composed = composeSony();
    const c = parse(composed.bytes);
    assert.equal(familyOf(c)?.name, 'the Harmony 880 and 885');

    // The device: group 8, the next free one, named by its power variable, with its own mode.
    const sony = devices(c).find((one) => one.name === 'Sony_HT');
    assert.deepEqual([sony?.group, sony?.mode, sony?.source], [8, 154, 'names']);
    assert.deepEqual(devices(c).filter((one) => one.group !== 8).map((one) => [one.group, one.name, one.mode]),
      devices(base).map((one) => [one.group, one.name, one.mode]), 'the base\'s devices as they were');

    // Its records: the eight commands and the power step, a record of its own. Since 2.2 the step is sent at a
    // quantity of 1 as every power send of these remotes' compiles but one device's, not at the catalogue's inter
    // key delay of 5 as the Harmony 650 and 700's are; 2.1 sent it at 5.
    const lists = c.actionLists() ?? [];
    assert.equal(irGroups(c)![8]!.addresses.length, 9);
    composed.device.lists.forEach((list, k) => {
      assert.deepEqual(lists[list]!.map((one) => [one.opcode, one.operand]), [[SEND, 0x800 | k], [QUANTITY, 0x801]]);
    });
    const powerSteps = composed.device.powerSteps!;
    assert.deepEqual(lists[powerSteps.off!]!.map((one) => [one.opcode, one.operand]), [[SEND, 0x808], [QUANTITY, 0x801]]);
    // Since 2.3 the step's record opens with the catalogue's delay between devices, 500 ms, spelled as Logitech
    // spells it, in front of the press: the ordinary command's record without its 50 ms. One block, no held part.
    const [stepOnce, stepHeld] = recordWords(c, 0x808);
    const [pressOnce] = recordWords(c, 0x800);
    const halfSecond = [...Array(14).fill(32767), 20631, 20631];
    assert.deepEqual(stepOnce!.split(',').map(Number), [...halfSecond, ...pressOnce!.split(',').map(Number).slice(2)]);
    assert.deepEqual(pressOnce!.split(',').slice(0, 2).map(Number), [32767, 17233]);
    assert.equal(stepHeld, '-');

    // Its power variable: off runs the power step, on calls it and waits the catalogue's 1.5 seconds.
    const power = deviceVariables(c).find((one) => one.device === 'Sony_HT' && one.property === 'Power')!;
    const transitions = stateRecords(c)![power.index]!.values;
    const on = transitions.find((one) => one.from === 0 && one.to === 1)!;
    const off = transitions.find((one) => one.from === 1 && one.to === 0)!;
    assert.equal(off.operand, powerSteps.off);
    assert.deepEqual(lists[on.operand]!.map((one) => [one.opcode, one.operand]),
      [[ACTION_LIST_INDEX_OPCODE, powerSteps.on], [QUANTITY, 0x800 | 15]]);
    // And it is switched off by the Off key's list and by every activity's start, the shared composer's.
    assert.deepEqual([composed.joined?.allOff !== undefined, composed.joined?.enterLists.length], [true, 3]);

    // Its mode: one page, every item's key bound to its command's list in the compiler's order, the copy the same.
    // The Power pad performs the power step rather than the plain press, the shared composer's choice for a power
    // command, `composecatalogue.ts`; Logitech's device mode sends the plain press, section 331.
    const record = modeRecords(c)![154]!;
    assert.equal(record.pageCount, 1);
    const page = record.pages[0]!;
    const bound = taggedList(c, page.list)!.entries;
    assert.deepEqual(bound.map((one) => one.tag), compilerTagOrder(SIDE_KEYS_GRID.items.map((one) => 0x80 | one.scan)));
    for (const one of bound) {
      const k = SIDE_KEYS_GRID.items.findIndex((item) => (0x80 | item.scan) === one.tag);
      const expected = k === 0 ? powerSteps.on : composed.device.lists[k];
      assert.deepEqual([one.opcode, one.operand], [ACTION_LIST_INDEX_OPCODE, expected], `the key of item ${k}`);
    }
    const copy = pageListCopies(c)[modePages(c).findIndex((one) => one.address === page.address)]!;
    assert.deepEqual(taggedList(c, copy + c.flashBase)!.entries, bound);
    // The mode's own list: the template's tags in its order, its handlers, and no call: no key sends another device's code.
    const template = modeRecords(base)![130]!;
    assert.deepEqual(record.entries.map((one) => one.tag), template.entries.map((one) => one.tag));
    assert.equal(record.entries.filter((one) => one.opcode === ACTION_LIST_INDEX_OPCODE).length, 0);
    assert.deepEqual(record.entries.filter((one) => one.tag < 0x40), template.entries.filter((one) => one.tag < 0x40));

    // What the page draws: the title and the eight labels, each in its cell, read back through the character map.
    const drawn = screenStrings(c, characterMap(c)).filter((one) => one.program === page.program);
    assert.deepEqual(drawn.filter((one) => one.y === 10).map((one) => [one.x, one.text]), [[3, 'Sony HT']]);
    const byCell = new Map(drawn.flatMap((one) => {
      const cell = gridCellAt(SIDE_KEYS_GRID, one.x, one.y);
      return cell === undefined ? [] : [[cell, one.text]];
    }));
    assert.deepEqual(SIDE_KEYS_GRID.items.map((_, k) => byCell.get(k)), [...SONY.labels]);
    assert.equal(page.program, record.start + record.length, 'the page is the mode\'s own program, as a one page mode\'s is');

    // The device list, on every copy: unit A's five, one per activity, the one outside every activity and the one
    // nothing enters. Each gains a second page holding the row in the top left cell, scan 5, entering the mode and
    // marking device mode, with lists of its own for the page and for its pool copy; each page counts, 1 OF 2 and
    // 2 OF 2; and the first page's rows are the base's, unchanged.
    const copies = sideKeysDeviceLists(c);
    assert.deepEqual(copies, [42, 64, 74, 106, 139]);
    assert.deepEqual(composed.screen.menus, copies);
    const strings = screenStrings(c, characterMap(c));
    const counter = (program: number): string => strings
      .filter((one) => one.program === program && one.y === 152).sort((a, b) => a.x - b.x).map((one) => one.text).join(' ');
    const rowLists = new Set<number>();
    for (const menu of copies) {
      const record = modeRecords(c)![menu]!;
      assert.equal(record.pageCount, 2, `copy ${menu}`);
      assert.deepEqual(taggedList(c, record.pages[0]!.list)!.entries, taggedList(base, modeRecords(base)![menu]!.pages[0]!.list)!.entries,
        `copy ${menu}: the first page's rows as they were`);
      const row = taggedList(c, record.pages[1]!.list)!.entries;
      assert.deepEqual(row.map((one) => [one.tag, one.opcode]), [[0x85, ACTION_LIST_INDEX_OPCODE]], `copy ${menu}`);
      assert.deepEqual(lists[row[0]!.operand]!.map((one) => [one.opcode, one.operand]), [[0x7e, 154], [0x9a, 1]]);
      const rowCopy = pageListCopies(c)[modePages(c).findIndex((one) => one.address === record.pages[1]!.address)]!;
      const copied = taggedList(c, rowCopy + c.flashBase)!.entries;
      assert.deepEqual(lists[copied[0]!.operand], lists[row[0]!.operand]);
      rowLists.add(row[0]!.operand);
      rowLists.add(copied[0]!.operand);
      assert.deepEqual(strings.filter((one) => one.program === record.pages[1]!.program && one.y !== 152)
        .map((one) => [one.x, one.y, one.text]), [[3, 10, 'Apparaten'], [3, 42, 'Sony HT']], `copy ${menu}`);
      assert.deepEqual(record.pages.map((one) => counter(one.program)), ['1 OF 2', '2 OF 2'], `copy ${menu}`);
    }
    assert.equal(rowLists.size, 2 * copies.length, 'every row binds lists of its own, as every copy read does');
    // The reader that names devices reads one copy, and reads the new row on it.
    assert.deepEqual(deviceListRows(c).filter((one) => one.mode === 154).map((one) => [one.page, one.scan, one.label]),
      [[1, 5, 'Sony HT']]);
  });

test('todo-compile-885 2.1 and 2.3: the composed configuration holds the arch 8 rails of writing-a-config a composed device reaches, the opening silence of both its power records included',
  needing(skipUnless('h885_a_config'), skipWithoutIrArchive()), () => {
    const base = open('h885_a_config');
    const c = parse(composeSony().bytes);

    // The opening silence, `writing-a-config` and 2.3: both records the device's power variable sends, on and off,
    // the only switching codes this family composes yet (inputs are 2.6, activity starts chapter 3), open with the
    // device's delay between devices, the catalogue's 500 ms. This was the one rail 2.1's composition did not hold:
    // its power step opened with no silence at all. And the on transition ends in its wait, as all 44 of
    // Logitech's do: a call of the step's list, then the catalogue's 1.5 seconds.
    const power = deviceVariables(c).find((one) => one.device === 'Sony_HT' && one.property === 'Power')!;
    const switching = powerSends(c, power.index);
    assert.equal(switching.length, 2);
    for (const one of switching) assert.equal(leadOf(recordWords(c, one.send)[0]!.split(',').map(Number)), 500000);
    const onList = (c.actionLists() ?? [])[stateRecords(c)![power.index]!.values.find((one) => one.from === 0 && one.to === 1)!.operand]!;
    assert.deepEqual(onList.map((one) => one.opcode), [ACTION_LIST_INDEX_OPCODE, QUANTITY]);

    // The container: every byte accounted for once, the checksum its own, the emitter reproducing it, the queue.
    const report = coverage(c);
    assert.deepEqual([report.accounted, report.overlaps.length], [report.total, 0]);
    assert.equal(trailerAgrees(c), true);
    assert.equal(roundTrip(c).equal, true);
    assertQueueFits(c);
    assertStateTableConsistent(c);

    // The state variables in their 64 bytes: one one byte variable more than the base's 39.
    const table = stateTable(c)!;
    const before = stateTable(base)!;
    assert.deepEqual([table.narrow, table.wide], [before.narrow + 1, before.wide]);
    assert.equal(table.narrow + 2 * table.wide, 40);

    // Base slot 2 as every configuration states it, and base slot 8's leading list still one instruction.
    assert.deepEqual(logArea(c), logArea(base));
    assert.deepEqual([logArea(c)?.capacity, logArea(c)?.start, logArea(c)?.limit], [15360, 0x1e0000, 0x1fe000]);
    const leading = (one: Container): number => one.blob[one.blobOffsetOf(one.sections[archSlot(8, BINDING_SLOT)]!.address)!]!;
    assert.deepEqual([leading(c), leading(base)], [1, 1]);

    // The infrared records as the 885's player reads them, on the new group and, as the calibration, every group
    // of the base: the own start exact, one or two pointer groups, a carrier from about 15.6 kHz up, every once and
    // held block ended by a `0x0001` word, and no word whose duration bits are 0 to 5 but the bare 0 and 1.
    // Read the way `tests/test_harmony_885_infrared.py` reads them, off the raw bytes as the player does: the own
    // start three bytes after the class byte, the group count at the own start plus 0x0B and each group's three
    // pointers after it, and a block's words up to its terminating zero.
    const playable = (one: Container, group: number): string[] => {
      const faults: string[] = [];
      const addresses = irGroups(one)![group]!.addresses;
      if (addresses.length > 256) faults.push(`${addresses.length} records`);
      for (const address of addresses) {
        const start = irRecordStart(one, address)!;
        if (start !== address - 7) faults.push(`${address}: own start`);
        const at = one.blobOffsetOf(start)!;
        const count = one.blob[at + 0x0b]!;
        if (count < 1 || count > 2) faults.push(`${address}: ${count} groups`);
        if ((irCarrier(one, address)?.periodNs ?? Infinity) > 64124) faults.push(`${address}: carrier`);
        for (let g = 0; g < count; g += 1) {
          for (const slot of [0, 1]) {
            const pointer = u24(one.blob, at + 0x0c + 9 * g + 3 * slot);
            if (pointer === 0) continue;
            const all = irBlockWords(one, pointer)!;
            if (all.at(-1) !== 0) faults.push(`${address}: block ${slot} has no terminating zero`);
            const words = all.slice(0, -1);
            if (words.at(-1) !== 1) faults.push(`${address}: block ${slot} ends ${words.at(-1)}`);
            if (words.slice(0, -1).includes(1)) faults.push(`${address}: a 0x0001 before the end`);
            if (words.some((w) => w !== 1 && (w & 0x7fff) <= 5)) faults.push(`${address}: a short word`);
          }
        }
      }
      return faults;
    };
    assert.deepEqual(playable(c, 8), []);
    for (let group = 0; group < 8; group += 1) assert.deepEqual(playable(base, group), [], `base group ${group}`);
    assert.equal(irGroups(c)!.length, 9);

    // No toggling code in the new group: every record one pointer group. Its partner, group 0, holds none either,
    // the other half of the shared bit.
    assert.deepEqual(irGroups(c)![8]!.addresses.filter((one) => irGroupCount(c, one) !== 1), []);
    assert.deepEqual(irGroups(c)![0]!.addresses.filter((one) => irGroupCount(c, one) !== 1), []);

    // Every program of the new mode and of every copy's pages uses only the opcodes the interpreter runs and decodes
    // to its end, and each second page draws its pictures from the addresses its first page draws them from.
    const copies = sideKeysDeviceLists(c);
    for (const page of [...copies.flatMap((menu) => modeRecords(c)![menu]!.pages), ...modeRecords(c)![154]!.pages]) {
      const program = screenProgram(c, page.program)!;
      assert.equal(program.at(-1)?.opcode, 0);
      assert.deepEqual(program.filter((one) => !SCREEN_OPCODES.has(one.opcode)).map((one) => one.opcode), []);
    }
    const pictures = (program: number): number[] => (screenProgram(c, program) ?? [])
      .filter((one) => one.opcode === DRAW || one.opcode === COPY_REGION)
      .map((one) => u24(c.blob, one.start + one.length - 3));
    for (const menu of copies) {
      const record = modeRecords(c)![menu]!;
      const first = new Set(pictures(record.pages[0]!.program));
      assert.deepEqual(pictures(record.pages[1]!.program).filter((one) => !first.has(one)), [], `copy ${menu}`);
    }

    // Instructions the composition must not add: the log append, `0x0F` with a low byte `0xE0` to `0xEF`, and the
    // counter's band, `0x0F` to `0x1E` with a low byte `0xC3` or `0xC7`, over every holder `instructionSites` walks.
    const banned = (one: Container): number => {
      let found = 0;
      for (let opcode = 0x0f; opcode <= 0x1e; opcode += 1) {
        for (const site of instructionSites(one, opcode)) {
          const low = site.operand & 0xff;
          if ((opcode === 0x0f && low >= 0xe0 && low <= 0xef) || low === 0xc3 || low === 0xc7) found += 1;
        }
      }
      return found;
    };
    assert.deepEqual([banned(c), banned(base)], [0, 0]);

    // Base slot 3's framing, the tag and the terminator Logitech's client finds the record by, as the base has it.
    const slot3 = (one: Container): number[] => {
      const at = one.blobOffsetOf(one.sections[archSlot(8, 3)]!.address)!;
      return [...one.blob.subarray(at, at + 14)];
    };
    const framing = (bytes: number[]): number[] => [...bytes.slice(0, 2), ...bytes.slice(9, 14)];
    assert.deepEqual(framing(slot3(c)), [0xdf, 0xad, 0xbf, 0xef, 0, 0, 0]);
    assert.deepEqual(framing(slot3(base)), framing(slot3(c)));

    // The timers and base slot 15's groups, untouched: the same records and the same lengths the firmware demands.
    const timerRecords = (one: Container): unknown => timers(one)?.records.map(({ address: _, ...rest }) => rest);
    assert.deepEqual(timerRecords(c), timerRecords(base));
    assert.equal(parameterGroupLengthsMatch(c), true);
    assert.deepEqual(parameterGroups(c)?.map((one) => one.values), parameterGroups(base)?.map((one) => one.values));

    // The variables' renumbering: the new power variable went in at `narrow`, 37, and the one wide variable moved
    // from 37 to 38 with every reference to it, over every holder; what names 37 now is the new device's.
    const naming = (one: Container): Map<number, number> => {
      const counts = new Map<number, number>();
      for (let opcode = 0; opcode < 0x100; opcode += 1) {
        for (const site of instructionSites(one, opcode)) {
          const variable = stateVariableSite({ opcode, operand: site.operand })?.index;
          if (variable !== undefined) counts.set(variable, (counts.get(variable) ?? 0) + 1);
        }
      }
      return counts;
    };
    const was = naming(base);
    const now = naming(c);
    assert.equal(before.narrow, 37);
    assert.deepEqual([was.get(37), was.get(38) ?? 0], [31, 0]);
    assert.equal(now.get(38), was.get(37));
    // Four: its writes of 0 in the Off key's list and in the three activities' starts, `joinPowerOff`.
    assert.equal(now.get(37), 4);
  });

/**
 * Rewritten for 2.3: this test said the lab's 2.1 file was this composition, stamped, which stopped being true by
 * design when the power step gained its silence and lost its quantity of 5. The file is still the record of what
 * unit B was given in 2.1, so what is held now is that it spells the power step the way 2.1 did, and that 2.3's file
 * is this composition.
 */
test('todo-compile-885 2.1 and 2.3: the lab\'s 2.1 file spells the power step with no silence and at 5, and the 2.3 file is this composition, stamped, 32 bytes longer for the step\'s sixteen words of silence',
  needing(skipUnless('h885_a_config', 'h885_composed_2_1', 'h885_composed_2_3'), skipWithoutIrArchive()), () => {
    const first = parse(load('h885_composed_2_1') as Uint8Array);
    const [once, held] = recordWords(first, 0x808);
    const [press] = recordWords(first, 0x800);
    assert.deepEqual([once, held], [press!.split(',').slice(2).join(','), '-'], '2.1: the press without its 50 ms, no silence');
    const variable = deviceVariables(first).find((one) => one.device === 'Sony_HT' && one.property === 'Power')!;
    assert.deepEqual(powerSends(first, variable.index).map((one) => [one.send, one.quantity]), [[0x808, 5], [0x808, 5]]);

    const filed = parse(load('h885_composed_2_3') as Uint8Array);
    assert.ok(filed.builtAt !== undefined);
    const stamped = saveEdits(parse(composeSony().bytes), [], filed.builtAt).bytes;
    assert.ok(Buffer.from(stamped).equals(Buffer.from(filed.blob)));
    assert.equal(filed.blob.length - first.blob.length, 32);
  });

test('todo-compile-885 2.1: what the side keys family refuses rather than guesses',
  needing(skipUnless('h885_a_config'), skipWithoutIrArchive()), () => {
    const a = open('h885_a_config');
    // A whole device needs the keys a device mode's commands take, which no compile of an 885 has been read for.
    assert.throws(() => composeCatalogueDevice(a, archiveAt(IR_ARCHIVE!), { manufacturer: 'Sony', model: 'DAV-C540', label: 'Sony HT', full: true }),
      (error: unknown) => error instanceof ComposeError && /todo-compile-885.md 2.5/.test(error.message));
    // Nine commands are a second page of a device mode.
    assert.throws(() => composeCatalogueDevice(a, archiveAt(IR_ARCHIVE!), {
      ...SONY, commands: [...SONY.commands, 'Eject'], labels: [...SONY.labels, 'Eject'],
    }), /more than one page/);
    // A label wider than a cell, rather than cut.
    assert.throws(() => composeCatalogueDevice(a, archiveAt(IR_ARCHIVE!), {
      ...SONY, commands: ['PowerToggle'], labels: ['Power the receiver'],
    }), /a cell holds 59/);
    // A toggling code in group 8, which shares its toggle bit with group 0. The Thomson 14MG115's codes toggle,
    // `togglegroups.test.ts`.
    assert.throws(() => composeCatalogueDevice(a, archiveAt(IR_ARCHIVE!), {
      manufacturer: 'Thomson', model: '14MG115', label: 'Thomson', commands: ['PowerToggle'], labels: ['Power'],
    }), /toggle bit with group 0/);
    // A second device on the lists' new pages fills a cell of an existing page, which is a step of its own.
    const once = parse(composeSony().bytes);
    assert.throws(() => composeCatalogueDevice(once, archiveAt(IR_ARCHIVE!), {
      manufacturer: 'Plex', model: 'Plex_Player', label: 'Kodi', commands: ['Play'], labels: ['Play'],
    }), /room on its last page.*todo-compile-885.md 2.8/);
    // Unit B's copies have two pages each, the second with room: the ordinary case of a free cell, refused too.
    if (load('h885_b_config') !== undefined) {
      assert.throws(() => composeCatalogueDevice(open('h885_b_config'), archiveAt(IR_ARCHIVE!), {
        ...SONY, commands: [...SONY.commands], labels: [...SONY.labels],
      }), /copy at mode 86 has room on its last page.*todo-compile-885.md 2.8/);
    }
  });

test('todo-compile-885 2.1: the side keys family\'s send refuses past the 64 state bytes, past group 15, a wait over 100 tenths and a group whose partner toggles, and passes each limit itself',
  skipUnless('h885_a_config'), () => {
    const a = open('h885_a_config');
    const device = (extra: Partial<ComposeDevice> = {}): ComposeDevice => ({ label: 'Probe', commands: [], ...extra });
    const send = (c: Container, group: number, one: ComposeDevice = device()): unknown => SIDE_KEYS_SENDS.device(c, group, one, undefined);

    // The 64 bytes, `todo-compile-885.md` 4.3: A's header restated with `narrow` raised, one more variable to fit.
    // 61 narrow and 1 wide take 63, so the power variable makes 64 and passes; 62 makes 65 and is refused.
    const withNarrow = (narrow: number): Container => {
      const bytes = Uint8Array.from(a.blob);
      const at = stateTable(a)!.start;
      bytes[at + 2] = narrow & 0xff;
      bytes[at + 3] = narrow >> 8;
      return parse(bytes);
    };
    assert.equal(stateTable(a)!.wide, 1);
    assert.doesNotThrow(() => send(withNarrow(61), 8));
    assert.throws(() => send(withNarrow(62), 8), /take 65 bytes and the Harmony 880 and 885 have 64/);

    // Sixteen groups: 15 passes, its partner group 7 holding no code of two forms on A; 16 is refused.
    assert.doesNotThrow(() => send(a, 15));
    assert.throws(() => send(a, 16), /group 16 is past the 16/);

    // One wait of at most 100 tenths.
    assert.doesNotThrow(() => send(a, 8, device({ powerOnDelay: 100 })));
    assert.throws(() => send(a, 8, device({ powerOnDelay: 101 })), /101 tenths is not one wait/);

    // A device in group 10, whose partner group 2 holds unit A's 53 codes of two forms; group 8's partner holds none.
    assert.deepEqual([0, 2].map((group) => irGroups(a)![group]!.addresses.filter((one) => irGroupCount(a, one) === 2).length), [0, 53]);
    assert.throws(() => send(a, 10), /group 2 holds 53 toggling codes/);
  });

test('todo-compile-885 2.2 and 2.3: the side keys family spells a power step with the device\'s delay between devices in front and a quantity of 1, 500 ms where none is stated, 50 ms for 0, and refuses past 100 tenths',
  () => {
    const step = (extra: Partial<ComposeDevice> = {}) => SIDE_KEYS_SENDS.powerStep!({ label: 'Probe', commands: [], ...extra });
    assert.deepEqual(step(), { leadInUs: 500000, quantity: 1 });
    assert.deepEqual(step({ interDeviceDelay: 8 }), { leadInUs: 800000, quantity: 1 });
    // 0 is no silence, a shape no arch 8 record has; the 50 ms every code with a held block opens with stands in.
    assert.deepEqual(step({ interDeviceDelay: 0 }), { leadInUs: 50000, quantity: 1 });
    assert.deepEqual(step({ interDeviceDelay: 100 }), { leadInUs: 10000000, quantity: 1 });
    // The inter key delay is not the power send's quantity here, whatever it states.
    assert.deepEqual(step({ interKeyDelay: 5 }), { leadInUs: 500000, quantity: 1 });
    assert.throws(() => step({ interDeviceDelay: 101 }), /101 tenths is not composed for the Harmony 880 and 885/);
    assert.throws(() => step({ interDeviceDelay: 2.5 }), /2.5 tenths is not composed/);
  });
