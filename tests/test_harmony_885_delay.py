"""
The Harmony 880 and 885's inter device delay: the opening silence of a device's infrared codes, per device, held
for every later code because the remote has one transmitter.

**Read in the firmware** on 4 November 2026, item 3.11 of `todo/todo-prepare-885.md`, in the 885's application
4.4 (`arch8_code_885`, base `0x010000`). **Measured in configurations** over the sixteen distinct arch 8
containers of `tests/test_harmony_885_start_check.py`'s `CALIBRATION`, six configurations' lineages, one of them
a Harmony 720's; every count below is a sum over copies, so a device read in four copies counts four times. No
remote was opened. Which state variable is `CurrentActivityState` is read through the codec,
`packages/codec/src/inventory.ts`, run under node, as `tests/test_harmony_885_actions.py` does for `Power`.

**Sources checked before the work**: `reference/config-format/state.md`, "A device's delays" (arch 14 keeps the
inter device delay in a state variable, sections 234, 235 and 303; on the other architectures "where they keep an
inter device delay, if they keep one, is open"<!--superseded-->, section 235c), `reference/infrared/sending.md` (the compiler's
lead in silence and its spelling, section 174; the Harmony One's power records opening with the device's delay
between devices, sections 337 and 433), `reference/config-format/actions.md` (the one block copy) and item 3.1
of this track, which found no inter device delay in the interpreter. **Logitech's client, decision 2**: not
searched for this item; Logitech's catalogue was compared in the lab for the devices the owners' sheets name,
and it does not decide the reading either way (three of eight agree, and the same owners demonstrably edited
other delays), so nothing here rests on it.

## Where it lives

**Every record opens with a silence**, 0 of 5792 opening with a mark. Taking the silence before the first mark
of the once block of each record's first pointer group:

| record | 50 ms | 200 ms | 500 ms | 800 ms | 1000 ms |
|---|---|---|---|---|---|
| with a held block | 2850 | 0 | 0 | 0 | 0 |
| without one | 385 | 204 | 1663 | 255 | 435 |

A device's lead is the largest silence among its records without a held block. Over the 84 device groups of the
sixteen containers the leads are 50 ms on 4, 200 on 12, 500 on 51, 800 on 5 and 1000 on 12, and 14 of the 16
containers carry two or three different values, **so it is per device, not per configuration**. Each lead is
spelled the way `reference/infrared/sending.md` gives the Harmony One's compiler: maximal 32767 us words and the
remainder balanced over the last two, `32767, 17233` for 50 ms and thirty maximals and `16990` for a second.

**Every record a state transition or an activity start sends has no held block and opens with its device's
lead**: 407 records reached from transitions and 31 from the lists that write `CurrentActivityState`, following
`0x7F` calls. A record without a held block whose silence is not its device's lead is rare: 16, at 50 ms in two
devices whose lead is 500.

**No `0x7C` follows a send to another device** in any list flattened through its `0x7F` calls, 0 of 28126, so
the compiler states no delay between devices in the action language.

## What the firmware does with it

The player has no case for a record's first words (`tests/test_harmony_885_infrared.py`): a space word turns the
carrier off for its length less six microseconds. **And there is one transmission at a time**: the main loop's
infrared service goes on to `0x14E52` only while nothing plays (`0x182` bit 0 clear, `0x14DE2`), and from there
enters the transmitter `0x14ED8` only when the slot state `0x184` is `0xFF`, idle, which the end of a
transmission sets (`0x14ED4`). The one other branch to it, at `0x14E7E`, tests a state the instructions just
before it have forced to 3, so it is never taken. The transmitter calls the picker `0x14860`, from its one call
site, only when variable 17 is 2. So while a lead plays no other code to any device starts: **the
silence in front of a device's code holds every later code**, which is the delay a person sets "between
devices". A `0x7C` holds only its own device (item 3.1).

## How sure

That this silence is the account's inter device delay is **inferred**: it has the Harmony One's structure,
where the lead was closed against Logitech's account and catalogue (sections 337 and 433), every value is a
multiple of 100 ms but for the four devices at 50 ms, there is one value per device, and the records that carry it are exactly what switching
devices sends. It is not confirmed outside the corpus: no Logitech compile for an 880 or 885 of an account
with known delays, and no timing of an activity start on a unit.

## The Harmony 720

Its five groups carry 500 ms on four and 50 on one, every record with a held block at 50; its player is the
885's (`tests/test_harmony_885_infrared.py`). Its transmitter routine is not compared.

## Reviewers

Two, per the `finding` skill, over the four files of this landing. **The blind re-measurement** reproduced the split of silences by held block (2850 at 50 ms; 385, 204, 1663, 255
and 435 without), the per group leads (51, 12, 12, 5 and 4 of 84), the 2, 4 and 10 containers with one, two and
three values, the 407 transition records all at their group's lead, no `0x7C` after a send to another group, and
the transmitter starting only from the idle state.

**The prose audit** found sentences wider than their evidence across the four landings, all corrected before
the commit: the silence in front of a device's codes stated as the account's inter device delay on five pages
where only this file's header called it inferred, now inferred on every page; "every code a transition sends
opens with 200, 500, 800 or 1000 ms" where 23 transition records and four device groups sit at 50 ms; counts over
the sixteen containers not saying they are copies of six configurations (800 ms is one device of one
configuration); "every value a multiple of 100 ms" in this file's header, false for the four at 50; the 720
"plays the same way" where only its class 1 start, word and stop are compared; the 720's number sender
"working addresses moved by eight" where only three literals are shown to differ; "within half a percent" put as
a consequence of the rounding where it is a corpus result, 0.45% at worst; the skill's "either plays the same"
unscoped where 237 integer frequencies from 15.7 to 100 kHz differ by one count; a fill "can run past the panel"
stated as a visible effect; "no arch 8 set has a zero count" footnoted as firmware and unasserted, now asserted
(140 sets); a mark of 0 us left out of the underflow; the toggle "per device" where the firmware indexes the
infrared group; the 720's twenty four lists called favourite channels as a measurement where what reaches them
is not asserted; and assertions missing for the picture row's clip, a height of 0, opcode 19 sharing the switch,
the toggle flag handed to the loader, the record's field order and the value added to the base, the alignment
loop, `0x10C14` seeking raw 15, and the picker's test on variable 17, all added. It also listed two codec
comments that still state the old readings, `NumberSender.flags` in `packages/codec/src/tables.ts` (never fires)
and the wide code comment in `packages/codec/src/screen.ts`; `packages/` is outside this landing, so they are
reported as candidates.
"""
import collections
import json
import os
import shutil
import subprocess
import tempfile
import unittest

import lab  # noqa: F401, puts `src` on the path
from harmony import ezfile, gspm
from test_harmony_885_infrared import block_words, records, u24
from test_harmony_885_start_check import CALIBRATION, USER_BASE, application, by_name, transfers_to, window

#: Run under node: the index of the variable the codec's name tree calls `CurrentActivityState`, per container.
NODE_PROBE = r'''
import { readFileSync } from 'node:fs';
const [codecDir, ...paths] = process.argv.slice(1);
const { parse } = await import(codecDir + '/gspm.ts');
const { stateVariables } = await import(codecDir + '/inventory.ts');
const out = [];
for (const path of paths) {
  const c = parse(new Uint8Array(readFileSync(path)));
  out.push(stateVariables(c).filter((v) => /(^|_)CurrentActivityState(_\d+)?$/.test(String(v.label))).map((v) => v.index));
}
console.log(JSON.stringify(out));
'''

LEADS = {50000: (32767, 17233), 200000: (32767,) * 5 + (18082, 18083), 500000: (32767,) * 14 + (20631, 20631),
         800000: (32767,) * 23 + (23179, 23180), 1000000: (32767,) * 30 + (16990,)}


def payloads():
    return [(name, ezfile.parse_ezhex(blob, name).payload) for name, blob in zip(CALIBRATION, by_name(*CALIBRATION))]


def activity_variables():
    if shutil.which('node') is None:
        raise unittest.SkipTest('no node on this machine, so the codec cannot be run')
    codec = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'packages', 'codec', 'src')
    with tempfile.TemporaryDirectory() as directory:
        paths = []
        for name, p in payloads():
            path = os.path.join(directory, name + '.payload')
            with open(path, 'wb') as handle:
                handle.write(p)
            paths.append(path)
        run = subprocess.run(['node', '--input-type=module', '-e', NODE_PROBE, os.path.abspath(codec), *paths],
                             capture_output=True, text=True, check=True)
    return dict(zip(CALIBRATION, json.loads(run.stdout)))


def leading(words):
    """The silence before the first mark, in microseconds, the words that spell it, and whether a mark opens."""
    total, spelled = 0, []
    for w in words:
        if w & 0x8000:
            return total, tuple(spelled), not spelled
        total += w & 0x7FFF
        spelled.append(w & 0x7FFF)
    return total, tuple(spelled), False


def record_table(p):
    """(group, index) -> (has a held block, lead us, spelling, opens with a mark)."""
    out = {}
    for g, i, pointer, _, _ in records(p):
        s = u24(p, pointer - USER_BASE + 1) - USER_BASE
        slots = [u24(p, s + 0x0C + 3 * j) for j in range(3)]
        lead, spelled, mark = leading(block_words(p, slots[0]))
        out[(g, i)] = (slots[1] != 0, lead, spelled, mark)
    return out


def device_leads(table):
    leads = collections.defaultdict(int)
    for (g, _), (held, lead, _, _) in table.items():
        if not held:
            leads[g] = max(leads[g], lead)
    return leads


def sends(lists, start, seen):
    """Every (group, index) a list sends, following `0x7F` calls."""
    if start in seen or start >= len(lists):
        return
    seen.add(start)
    for ins in lists[start]:
        if ins.opcode == 0x7D:
            yield ins.operand >> 8, ins.operand & 0xFF
        elif ins.opcode == 0x7F:
            yield from sends(lists, ins.operand, seen)


def flattened(lists, start, seen=frozenset()):
    if start in seen or start >= len(lists):
        return
    for ins in lists[start]:
        if ins.opcode == 0x7F:
            yield from flattened(lists, ins.operand, seen | {start})
        else:
            yield ins


class TheLead(unittest.TestCase):
    def test_every_record_opens_with_a_silence_and_the_split_by_held_block(self):
        split = collections.Counter()
        marks = 0
        for _, p in payloads():
            for held, lead, _, mark in record_table(p).values():
                split[(held, lead)] += 1
                marks += mark
        self.assertEqual(marks, 0)
        self.assertEqual(dict(split), {(True, 50000): 2850, (False, 50000): 385, (False, 200000): 204,
                                       (False, 500000): 1663, (False, 800000): 255, (False, 1000000): 435})

    def test_each_lead_is_spelled_in_maximal_words_and_a_balanced_remainder(self):
        spellings = collections.defaultdict(set)
        for _, p in payloads():
            for _, lead, spelled, _ in record_table(p).values():
                spellings[lead].add(spelled)
        self.assertEqual({k: v for k, v in spellings.items()}, {k: {v} for k, v in LEADS.items()})

    def test_per_device_not_per_configuration(self):
        per_group = collections.Counter()
        per_container = collections.Counter()
        exceptions = 0
        for _, p in payloads():
            table = record_table(p)
            leads = device_leads(table)
            per_group.update(leads.values())
            per_container[len(set(leads.values()))] += 1
            exceptions += sum(1 for (g, _), (held, lead, _, _) in table.items() if not held and lead != leads[g])
        self.assertEqual(dict(per_group), {50000: 4, 200000: 12, 500000: 51, 800000: 5, 1000000: 12})
        self.assertEqual(dict(per_container), {1: 2, 2: 4, 3: 10})
        self.assertEqual(exceptions, 16)

    def test_what_a_transition_or_an_activity_start_sends_carries_the_device_lead(self):
        activity = activity_variables()
        found = collections.Counter()
        for name, p in payloads():
            c = gspm.parse(p)
            lists = c.action_lists()
            table = record_table(p)
            leads = device_leads(table)
            (variable,) = activity[name]
            reached = collections.defaultdict(set)
            for record in c.state_records() or []:
                for v in record.values:
                    if v[7] == 0x7F:
                        reached['transition'] |= set(sends(lists, int.from_bytes(v[5:7], 'little'), set()))
                    elif v[7] == 0x7D:
                        operand = int.from_bytes(v[5:7], 'little')
                        reached['transition'].add((operand >> 8, operand & 0xFF))
            for k, li in enumerate(lists):
                if any(ins.opcode == 0x80 + variable for ins in li):
                    reached['start'] |= set(sends(lists, k, set()))
            for kind, rs in reached.items():
                for g, i in rs:
                    held, lead, _, _ = table[(g, i)]
                    found[(kind, held, lead == leads[g])] += 1
        self.assertEqual(dict(found), {('transition', False, True): 407, ('start', False, True): 31})

    def test_no_delay_follows_a_send_to_another_device(self):
        lists_total = between = 0
        for _, p in payloads():
            lists = gspm.parse(p).action_lists()
            for k in range(len(lists)):
                lists_total += 1
                last = None
                for ins in flattened(lists, k):
                    if ins.opcode == 0x7D:
                        last = ins.operand >> 8
                    elif ins.opcode == 0x7C and last is not None and ins.operand >> 8 != last:
                        between += 1
        self.assertEqual((lists_total, between), (28126, 0))

    def test_the_720s_groups(self):
        (p,) = [p for name, p in payloads() if name == 'H720-Config.EZHex']
        table = record_table(p)
        self.assertEqual(sorted(device_leads(table).values()), [50000, 500000, 500000, 500000, 500000])
        self.assertEqual({lead for held, lead, _, _ in table.values() if held}, {50000})


class OneTransmitter(unittest.TestCase):
    def test_a_new_send_starts_only_when_the_transmitter_is_idle(self):
        code = application()
        self.assertEqual(window(code, 0x14E52, 3), ['MOVLW 0xff', 'SUBWF 0x84,W', 'BZ 0x14ed8'])
        self.assertEqual(window(code, 0x14ED2, 3), ['MOVLB 0x1', 'SETF 0x84', 'RETLW 0x00'])
        # The service reaches 0x14E52 only while nothing plays (0x182 bit 0 clear).
        self.assertEqual(window(code, 0x14DE0, 3), ['MOVLB 0x1', 'BTFSS 0x82,0', 'BRA 0x14e52'])
        # The second branch to the transmitter cannot be taken: the slot state is forced to 3 just before it.
        self.assertEqual(transfers_to(code, 0x14ED8), [0x14E56, 0x14E7E])
        self.assertEqual(window(code, 0x14E70, 7), ['MOVLW 0x03', 'SUBWF 0x84,W', 'BZ 0x14e7a', 'MOVLW 0x03',
                                                  'MOVWF 0x84', 'MOVLW 0x03', 'SUBWF 0x84,W'])
        self.assertEqual(window(code, 0x14E7E, 1), ['BNZ 0x14ed8'])
        self.assertEqual(transfers_to(code, 0x14860), [0x14EF6])
        # The picker is called only when variable 17, data 0x119, is 2: XOR with 3 then with 1.
        self.assertEqual(window(code, 0x14ED8, 8), ['BTFSC 0x82,3', 'RETLW 0x00', 'MOVLB 0x1', 'MOVF 0x19,W',
                                                  'XORLW 0x03', 'BZ 0x14f08', 'XORLW 0x01', 'BNZ 0x14f78'])


if __name__ == '__main__':
    unittest.main()
