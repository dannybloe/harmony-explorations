"""
The Harmony 880 and 885's action interpreter: the same instruction language with a ladder of its own, a
send that waits for the configuration's acknowledgement, and an all zero instruction that never runs.

**Read in the firmware** on 4 November 2026, item 3.1 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`; the 880's and the 880 Pro's differ in the two skin bytes
only, `tests/test_harmony_885_start_check.py`). **Measured in configurations** over the sixteen byte
distinct arch 8 containers of that file's `CALIBRATION`, six configurations' lineages, one of them a
Harmony 720's. No remote was opened. Instructions decode through `harmony.pic18.isa`, switches through
`harmony.pic18.chains`, configurations through `harmony.gspm`; the power transitions are read through the
codec, `packages/codec/src/inventory.ts`, run under node, because the name tree that says which variable
is a device's `Power` is read there and nowhere in Python. Addresses are the 885 application's.

**Sources checked before the work**: `reference/config-format/actions.md`, whose interpreter section is
the Harmony 700's and 600's reading (sections 34, 72, 73, 107) with arch 12 and arch 9 added for the
arithmetic block, which said of the Harmony 880 and 885 that whether they implement `0x65` and `0x66` was
not read; its `0x7C` paragraphs, sections 70 and 236 (the fold, the per device ordering, read on the
Harmony 700 and the Harmony One); section 140 (the two armed conditional and the zero arm); section 278
(a bare send from a transition sends nothing on a Harmony One); `reference/config-format/state.md`'s
firmware variables table, which had no meaning for variable 17 on arch 8; and items 1.1 to 1.9 of this
track, which named the power down routine. **Logitech's client, decision 2**: MyHarmony's source was
searched by the names `ActionList`, `StateVariable` and `InterDeviceDelay`; the hits are account fields of
a device and the Harmony Touch's driver, nothing about this platform's interpreter. The classic client was
not searched for this item.

## The dispatch

The main loop (`0x16E6E`) calls the fetch `0x13090`, which returns on an empty queue (`0x12E00`), pops
three bytes into `0x2EE` to `0x2F0` (operand low, operand high, opcode), sends `0x1F` with high byte `0xFC`
to the event delivery `0x13004`, and copies anything else to `0x3B2` to `0x3B4` for the dispatcher
`0x131E6`. The dispatcher is a **descending chain of `SUBWF` and branch**, not the binary search arch 14
uses: opcode at or above `0x6F` goes to the individual handlers, then below `0x1F` to the `0x0F` and `0x07`
ladders (`0x1383C`, `0x1390C`), and at or above `0x3F` to the `0x3F` bands (`0x13550`), the rest to the
`0x1F` bands (`0x1361A`). **No literal from `0x40` to `0x6E` is compared with the opcode anywhere in the
dispatcher**, so `0x40` to `0x6E` reach the `0x3F` bands by their operand's high byte. On arch 9 and arch
12 the ladder tests `0x65` to `0x6E` and ignores them (section 107); here they act as `0x3F`.

The bands, by the literals each ladder compares:

* `0x3F`, on the operand's high byte (`0x3B3`): `0xF0`, `0xE0`, `0xD0` and nothing else, so **no `0xC0` or
  `0xB0` band** (arch 12 has `0xC0`, arch 14 `0xB0`, section 73). The `0xF0` band's chain at `0x13192`
  decodes `{2, 1, 0}` on the low nibble, so **no case 3, no sound gate**: arch 12's gate is `0x3F` `0xF3`
  (section 74), and the tone routine here, `0x11AEA` from `0x75`'s arm at `0x1335C`, tests nothing before
  its loop.
* `0x0F`, on the operand's low byte (`0x3B2`): `0xF0`, `0xE0`, `0xD0`, `0xC0`, `0xB0`, `0xA0`, `0x80`,
  `0x70`, so **no `0x40` band**; `0xE0` is the log append, `tests/test_harmony_885_log_area.py`.
* `0x07`, on the operand's low byte: `0xFF` down to `0xF6` one by one, and **`0xF6` calls the power down
  routine `0x180C6`**, its one caller (`0x139AE`). So the power down is opcode `0x07` with low byte `0xF6`.
  `tests/test_harmony_885_write_end.py`'s header said an operand **high** byte of `0xF6`, reached through
  the `0x3F` band; it is corrected there in the commit that lands this file. Opcodes below `0x07` exit at
  `0x13910` before the operand is read.

## An all zero instruction is never queued

The counted push `0x12F9A` ORs the three bytes `0x3A2` to `0x3A4` and returns without pushing when the
result is zero, before it tests whether the queue is full; the uncounted push `0x12FC2` does the same with
`0x3A5` to `0x3A7`. Every list call, transition, tagged entry and queued screen instruction reaches the
queue through one of them (callers listed in `tests/test_harmony_885_queue.py`); the third writer, the
event push `0x12EB4`, writes opcode `0x1F` and so never three zeros. So `0x00 0x0000` is never pushed on
this platform. A zero slot can still arise inside the queue, where the two armed conditional and the event
purge `0x12F06` zero three bytes in place, and the fetch then runs it as nothing (read, not asserted). **What that does to a conditional**: the comparison handler (`0x133B2`) clears its
result flag `0x2CD` at `0x133B4` and sets it only at `0x13464`, the comparison cases; selectors 6 and 7
(chain `0x133EC`: 7 at `0x13476`, 6 at `0x13468`, both on to `0x13492`) never set it. With bit 15 clear,
`0x1351C` pops the next three bytes when the flag is clear, at `0x13524`, without testing that anything is
queued. **So an add or subtract always skips the next instruction**, and when the next slot was an all zero
filler, the instruction skipped is whatever is queued after it.

Logitech's configurations hold exactly this: one list per container, `70:07vv 00:0000`, a subtract from
variable `vv` and a filler, sixteen of sixteen; every call of it is followed by `1F:FB00` (load the byte
register with 0) and then `1F:F0vv` (load the byte register from the same `vv`), so the skip takes the
first load and the second overwrites what it would have set. The other four all zero instructions open a
list. `reference/config-format/actions.md` calls a `0x00` arm "an explicitly empty one"; on this platform
it is no arm at all. **A queued no-op here** is an opcode `0x01` to `0x06` with any operand: not all zero,
so spooled, and the dispatcher exits at `0x13910`; that it behaves so on a unit is not checked.

## A send, a delay and the handshake

`0x7D` (`0x1324C`) hands `{group, index}` to `0x146B8` and `0x7C` (`0x13266`) hands `{group, value}` to
`0x146DA`, which sets bit 6 of the group byte (`0x146DC`); both push one two byte entry through `0x14692`,
which is a full test (`0x1E`, thirty bytes), an empty test that starts the drain's countdown when the
ring was empty, and two byte pushes, with no comparison against an entry already queued. **So there is no
fold**: arch 12 and arch 14 merge a quantity into the last entry of the same tag (section 70); here each
`0x7C` is an entry of its own. Whether the drain then counts consecutive ones for a device down one after
the other, so that they add up, is not read here. A push that does not
fit returns 0 and the arm sets `0x2C8`, the dispatcher's put back flag (`0x13278`), so the instruction
runs again on the next turn: the interpreter stalls rather than losing it.

**The handshake.** The infrared queue's state is data `0x119`, which is `0x108 + 17`, state variable 17's
byte: 2 after a send into a state below 2 (`0x146C6`), 1 after a delay into a state below 1
(`0x146EC`), 3 when the transmitter starts (`0x14EFE`), 0 when the drain empties the queue (`0x14D74`);
the end of a transmission writes 2, 1 or 0 by what is left (`0x14E92` on, not asserted). `0x1466E` writes it with a plain `MOVFF` (so variable 17's transitions never fire), posts
event `0x2D` at the head of the action queue through `0x12ED2`, and on success sets bit 3 of `0x182`. The
transmitter `0x14ED8` returns at once while that bit is set (`BTFSC 0x82,3` at its first instruction).
`0x1468A` clears it and sets bit 4, and its two callers are the `0x07` band `0xFA` (`0x1397E`) and the post
failing because the queue was full (`0x14686`). The infrared engine's reset at start (`0x14646`, from main
at `0x16DBE`) clears it too, at `0x14666`, which the blind reviewer found and this header first left out. **So after every change of the queue's state the remote
sends nothing more until the configuration runs `0x07 0xFFFA`.** `0x1466E` is called from five places,
`0x146D4` and `0x146FA` above and three in the drain and the transmitter.

**Every configuration answers**, sixteen of sixteen: base slot 8's leading list is `7F:000A` in all, and
handler set 1 binds tag `0x2D` to `0x07 0xFFFA`. Every mode but thirty per container binds tag `0x2D` to a
`0x73` of one screen program, 2351 of 2831 modes; that program opens with a narrow switch on variable 17
whose cases each jump to the instruction after the switch, which queues `0x07 0xFFFA` (screen opcode 17,
operand `FA FF 07`) and ends. The thirty other modes per container bind nothing at all, and handler set 1
answers for them; list 10, which the leading list calls, pushes handler set 1 before any other set, and
that a set pushed first is consulted last is the reading of other platforms, not of this one. What the
cases draw, and whether it is the sending mark of the Harmony 600, 650 and 700 (section 369), is not
asserted. The sixteen containers are six configurations, several read more than once, so the counts in this
file are sums over copies.

**Every send is paired**: 5917 lists hold a `0x7D`, every one is exactly `[0x7D, 0x7C]` with the `0x7C`
naming the send's group, and no `0x7F` delay step opens any (arch 14's, section 287). Whether a bare send
from a transition transmits here, where on a Harmony One it does not (section 278), is not read to a cause:
nothing in the infrared path reads where an entry came from, and no unit was tried.

**No inter device delay in the interpreter.** Only three arms call the infrared queue's push, `0x7D`,
`0x7C` and the deferred instruction, so the interpreter adds no delay of its own between devices; how the
drain orders entries by device is not read here. Where an account's inter device delay goes on this
platform is item 3.11.

## The deferred instruction, `0x3F` band `0xD0`

`0x135B2` tests the high byte against `0xD0`, saves the operand's low byte, pops the next three bytes
(`0x135BE`, `0x135C4`, `0x135CA`, no empty test) as its argument and pushes the four into the infrared
queue at `0x14700`, its only caller (`0x135E8`). The drain releases it into the action queue's tail by a
rule the nibble selects (the drain's entry type chain is asserted in `tests/test_harmony_885_write_end.py`);
by item 3.1's reading, nibble 0 waits until nothing but delays and finished sends is ahead. **That release
rule is not asserted here.** 77 uses, every one nibble 0, every one the first of a two instruction list
whose second is a `0x7F`. Item 3.1 found such a list called last in each of four activity start lists of one
configuration, by hand; that is not asserted either.

## Power transitions

Over the sixteen, 160 transitions on the variables the name tree calls `Power`: 80 from 1 to 0, each a
`0x7F` of a send list `[0x7D, 0x7C]`; 79 from 0 to 1, a `0x7F` of a list `[0x7F, 0x7C]` whose call is the
send list, so the power code and then the power on delay; and one from 0 to 1 whose delay is spelled out
as four `0x7C`, 100, 100, 100 and 20 of group 3, 320 in all: 32 seconds if a unit is a tenth of a second
as on the Harmony One and 600 (section 235), which is not established on this platform.

## The Harmony 720

The 720's dispatcher (`0x131B6`) has the 885's mnemonics, literals and bit numbers, instruction for
instruction over the whole ladder; the differences are file registers and branch targets, its scratch
moved by a few bytes. So the ladder, the bands and their literals are this build's too. Its pushes, its
infrared queue and its transmitter are not compared; its configuration is in the census above.

## Negative results

* No opcode from `0x40` to `0x6E`, and no `0x74`, `0x76` or `0x7B`, occurs in any action list of the
  sixteen.
* No `0x7C` value exceeds 100 and no group exceeds 6.
* Every `0x7C` in the sixteen is in a send list or in a power transition's list; this file does not
  assert that partition.

## Reviewers

Two, per the `finding` skill. **The blind re-measurement** reproduced every firmware reading and corpus
count here (the ladders, the power down's operand, the zero test, no fold, the handshake, selectors 6 and 7,
the 720's dispatcher, 28126 and 69387, 5917, 20 zero instructions, 77 deferrals, 2351 of 2831, 13) and found
one thing this header had left out: the infrared engine's reset at start also clears the transmitter's hold,
now asserted. **The prose audit** found sentences wider than their evidence, all corrected before landing:
"32 seconds" where only 320 units are measured and the tick is unread; delays that "add up" where only the
absence of a fold is read; "nothing else" of a push that also starts the drain's countdown; a sending mark
the test never showed being drawn; "no inter device delay" stated of behaviour where only the interpreter's
callers are read; "both pushes" where a third, the event push, exists; the 720's whole interpreter where its
dispatcher alone was compared; the corpus sums not saying they are over six configurations read in copies;
and two titles wider than their bodies, renamed. It also found a reference rule broken by this corpus, that
no inline power on delay exceeds 100 on arch 8, corrected in place in the actions page.
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
from harmony.pic18 import chains
from test_harmony_885_start_check import (BASE, CALIBRATION, OTHER_APPLICATIONS, application, by_name, listing, text,
                                          transfers_to, window)

DISPATCHER = 0x131E6
DISPATCHER_END = 0x139DA
LADDER_3F = 0x13550
LADDER_1F = 0x1361A
LADDER_0F = 0x1383C
LADDER_07 = 0x1390C
COMMON_EXIT = 0x139B2
POWER_DOWN = 0x180C6
SPOOL = 0x12F9A
SPOOL_UNCOUNTED = 0x12FC2
COMPARE = 0x133B2
SELECTOR_CHAIN = 0x133EC
SKIP = 0x13524
DEFERRED = 0x135B2
DEFERRED_PUSH = 0x14700
SEND_PUSH = 0x146B8
DELAY_PUSH = 0x146DA
WORD_PUSH = 0x14692
POST = 0x1466E
ACKNOWLEDGE = 0x1468A
TRANSMITTER = 0x14ED8
TONE = 0x11AEA
#: State variable 17's byte: the storage starts at 0x108, `tests/test_harmony_885_state.py`.
STATE_BASE = 0x108
#: The Harmony 720's dispatcher, found by the 885's opening instructions.
DISPATCHER_720 = 0x131B6
#: The infrared queue's event, which the post at 0x1466E loads.
QUEUE_EVENT = 0x2D
ACK = (0x07, 0xFFFA)

#: Run under node: the codec's own reading of which variables are a device's `Power`, and their
#: transitions with the lists they call. Paths of the payloads follow the codec's directory.
NODE_PROBE = r'''
import { readFileSync } from 'node:fs';
const [codecDir, ...paths] = process.argv.slice(1);
const { parse } = await import(codecDir + '/gspm.ts');
const { worstQueueRun, overflowingLists, undecidedLists } = await import(codecDir + '/queue.ts');
const { stateVariables } = await import(codecDir + '/inventory.ts');
const out = [];
for (const path of paths) {
  const c = parse(new Uint8Array(readFileSync(path)));
  const lists = c.actionLists();
  const power = [];
  for (const v of stateVariables(c)) {
    if (!/Power$/.test(v.label)) continue;
    for (const t of v.record?.values ?? []) {
      const body = t.opcode === 0x7f ? (lists[t.operand] ?? []) : [];
      const nested = body.filter((x) => x.opcode === 0x7f).map((x) => (lists[x.operand] ?? []).map((y) => y.opcode));
      power.push({ from: t.from, to: t.to, opcode: t.opcode, body: body.map((x) => [x.opcode, x.operand]), nested });
    }
  }
  out.push({ peak: worstQueueRun(c)?.peak ?? null, over: overflowingLists(c).length,
             undecided: undecidedLists(c).length, power });
}
console.log(JSON.stringify(out));
'''


def containers():
    """The sixteen, parsed, in `CALIBRATION` order."""
    return [(name, gspm.parse(ezfile.parse_ezhex(blob, name).payload))
            for name, blob in zip(CALIBRATION, by_name(*CALIBRATION))]


def codec_probe():
    """The node probe's answer per container, or a skip when node or a configuration is missing.

    Shared with `tests/test_harmony_885_queue.py`, which reads the peaks from the same run.
    """
    if shutil.which('node') is None:
        raise unittest.SkipTest('no node on this machine, so the codec cannot be run')
    blobs = by_name(*CALIBRATION)
    codec = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'packages', 'codec', 'src')
    with tempfile.TemporaryDirectory() as directory:
        paths = []
        for name, blob in zip(CALIBRATION, blobs):
            path = os.path.join(directory, name + '.payload')
            with open(path, 'wb') as handle:
                handle.write(ezfile.parse_ezhex(blob, name).payload)
            paths.append(path)
        run = subprocess.run(['node', '--input-type=module', '-e', NODE_PROBE, os.path.abspath(codec), *paths],
                             capture_output=True, text=True, check=True)
    return dict(zip(CALIBRATION, json.loads(run.stdout)))


def compared(code, start, end, register):
    """Every literal a `MOVLW` loads and the next or second next instruction subtracts from `register`."""
    ins = [text(i) for _, i in listing(code, start, end)]
    out = []
    for n in range(len(ins) - 2):
        if ins[n].startswith('MOVLW') and register in (ins[n + 1], ins[n + 2]):
            out.append(int(ins[n].split()[1], 16))
    return out


class TheLadder(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_fetch_hands_low_high_and_opcode_to_the_dispatcher(self):
        self.assertEqual(window(self.code, 0x130BC, 4),
                         ['MOVFF 0x2ee,0x3b2', 'MOVFF 0x2ef,0x3b3', 'MOVFF 0x2f0,0x3b4', 'RCALL 0x131e6'])
        self.assertEqual(window(self.code, 0x16E6E, 2), ['CALL 0x13090', 'CALL 0x130cc'])
        # 0x80 and up: bit 7 cleared, and the state write 0x175C4 called with index, value and the silent flag.
        self.assertEqual(window(self.code, 0x131F4, 9),
                         ['MOVLW 0x80', 'SUBWF 0xb4,W', 'BNC 0x13216', 'BCF 0xb4,7', 'MOVFF 0x3b2,0x150',
                          'MOVFF 0x3b3,0x151', 'MOVFF 0x3b4,0x14f', 'MOVFF 0x31a,0x14e', 'CALL 0x175c4'])

    def test_no_opcode_from_0x40_to_0x6E_is_tested_so_they_reach_the_0x3F_bands(self):
        opcodes = compared(self.code, DISPATCHER, DISPATCHER_END, 'SUBWF 0xb4,W')
        self.assertEqual([k for k in opcodes if 0x40 <= k <= 0x6E], [])
        # The first test sends 0x6F and up to the handlers, the next ones split the rest by floor.
        self.assertEqual(window(self.code, 0x131EA, 5), ['MOVLW 0x6f', 'MOVLB 0x3', 'SUBWF 0xb4,W', 'BC 0x131f4',
                                                       'BRA 0x13548'])
        self.assertEqual(window(self.code, 0x13548, 7), ['MOVLW 0x1f', 'SUBWF 0xb4,W', 'BC 0x13550', 'BRA 0x1383c',
                                                       'MOVLW 0x3f', 'SUBWF 0xb4,W', 'BNC 0x1361a'])
        self.assertEqual(window(self.code, LADDER_0F, 3), ['MOVLW 0x0f', 'SUBWF 0xb4,W', 'BNC 0x1390c'])
        self.assertEqual(window(self.code, LADDER_07, 3), ['MOVLW 0x07', 'SUBWF 0xb4,W', 'BNC 0x139b2'])

    def test_the_0x3F_bands_are_F0_E0_and_D0_and_F0_has_no_sound_gate(self):
        self.assertEqual(compared(self.code, LADDER_3F, LADDER_1F, 'SUBWF 0xb3,W'), [0xF0, 0xE0, 0xD0])
        self.assertEqual(window(self.code, 0x135B6, 2), ['BC 0x135ba', 'BRA 0x139b2'])
        cases = {c.value: c.target for c in chains.xor_chain(self.code, BASE, 0x13192)}
        self.assertEqual(sorted(cases), [0, 1, 2])
        # The tone: 0x75 calls it, and its one conditional branch before the pin toggles is the loop's.
        self.assertEqual(window(self.code, 0x13354, 3), ['MOVFF 0x3b2,0x3f1', 'MOVFF 0x3b3,0x3f0', 'CALL 0x11aea'])
        branches = [t for _, i in listing(self.code, TONE, 0x11B18) for t in [text(i)]
                    if t.split()[0] in ('BZ', 'BNZ', 'BC', 'BNC', 'BN', 'BNN', 'BOV', 'BNOV', 'BTFSC', 'BTFSS')]
        self.assertEqual(branches, ['BC 0x11b3e'])

    def test_the_0x0F_bands_have_no_0x40_band(self):
        self.assertEqual(compared(self.code, LADDER_0F, LADDER_07, 'SUBWF 0xb2,W'),
                         [0xF0, 0xE0, 0xD0, 0xC0, 0xB0, 0xA0, 0x80, 0x70])

    def test_the_power_down_is_0x07_with_low_byte_0xF6(self):
        self.assertEqual(compared(self.code, LADDER_07, COMMON_EXIT, 'SUBWF 0xb2,W'),
                         [0xFF, 0xFE, 0xFC, 0xFD, 0xFB, 0xFA, 0xF9, 0xF8, 0xF7, 0xF6])
        # 0x3B2 is the operand's low byte, by the fetch's copy above.
        self.assertEqual(window(self.code, 0x139A8, 4), ['MOVLW 0xf6', 'SUBWF 0xb2,W', 'BNC 0x139b2', 'CALL 0x180c6'])
        self.assertEqual(transfers_to(self.code, POWER_DOWN), [0x139AE])
        # Below 0x07 the dispatcher leaves before reading the operand.
        self.assertEqual(window(self.code, 0x13910, 1), ['BNC 0x139b2'])


class AnAllZeroInstructionIsNeverQueued(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_both_instruction_pushes_drop_three_zero_bytes_and_the_event_push_writes_opcode_0x1F(self):
        self.assertEqual(window(self.code, SPOOL, 6),
                         ['MOVLB 0x3', 'MOVF 0xa2,W', 'IORWF 0xa3,W', 'IORWF 0xa4,W', 'BZ 0x12fc0', 'RCALL 0x12dca'])
        self.assertEqual(window(self.code, SPOOL_UNCOUNTED, 6),
                         ['MOVLB 0x3', 'MOVF 0xa5,W', 'IORWF 0xa6,W', 'IORWF 0xa7,W', 'BZ 0x12fe4', 'RCALL 0x12dca'])
        # The third writer, the event push, has no zero test and needs none: its opcode byte is 0x1F.
        self.assertEqual(window(self.code, 0x12EB4, 11)[6:],
                         ['MOVLW 0xfc', 'MOVWF 0x9b', 'RCALL 0x12dd6', 'MOVLB 0x3', 'MOVLW 0x1f'])

    def test_selectors_6_and_7_never_set_the_result_so_the_next_instruction_is_always_skipped(self):
        cases = {c.value: c.target for c in chains.xor_chain(self.code, BASE, SELECTOR_CHAIN)}
        self.assertEqual(cases[7], 0x13476)
        self.assertEqual(cases[6], 0x13468)
        self.assertEqual(window(self.code, 0x13474, 1), ['BRA 0x13492'])
        self.assertEqual(window(self.code, 0x13492, 2), ['MOVFF 0x31a,0x152', 'CALL 0x1760a'])
        # The result flag 0x2CD: cleared on entry, set in one place, which the comparison cases reach.
        handler = [(a, text(i)) for a, i in listing(self.code, COMPARE, SKIP + 8)]
        self.assertEqual([a for a, t in handler if t in ('MOVWF 0xcd', 'SETF 0xcd', 'INCF 0xcd', 'BSF 0xcd,0')],
                         [0x13464])
        self.assertEqual(window(self.code, COMPARE, 2), ['MOVLB 0x2', 'CLRF 0xcd'])
        # Bit 15 clear: a clear flag pops three bytes, with no empty test.
        self.assertEqual(window(self.code, 0x134A0, 2), ['BTFSS 0xb3,7', 'BRA 0x1351c'])
        self.assertEqual(window(self.code, 0x1351C, 7), ['MOVLB 0x2', 'MOVF 0xcd,W', 'BZ 0x13524', 'BRA 0x139b2',
                                                       'RCALL 0x12e0a', 'RCALL 0x12e0a', 'RCALL 0x12e0a'])

    def test_the_corpus_zero_instructions_and_the_load_the_skip_takes(self):
        filler = callers = heads = zeros = 0
        followed = collections.Counter()
        for name, c in containers():
            lists = c.action_lists()
            zero_arm = [n for n, li in enumerate(lists)
                        if [(x.opcode, x.operand) for x in li[1:]] == [(0x00, 0x0000)] and len(li) == 2]
            with self.subTest(name):
                self.assertEqual(len(zero_arm), 1)
            (arm,) = zero_arm
            subtract = lists[arm][0]
            self.assertEqual((subtract.opcode, subtract.operand >> 8), (0x70, 0x07))
            filler += 1
            for li in lists:
                zeros += sum(1 for x in li if (x.opcode, x.operand) == (0x00, 0x0000))
                if li and (li[0].opcode, li[0].operand) == (0x00, 0x0000):
                    heads += 1
                for k, ins in enumerate(li):
                    if (ins.opcode, ins.operand) == (0x7F, arm):
                        callers += 1
                        following = li[k + 1:k + 3]
                        followed[tuple((x.opcode, x.operand) for x in following)
                                 == ((0x1F, 0xFB00), (0x1F, 0xF000 | subtract.operand & 0xFF))] += 1
        self.assertEqual((filler, heads, zeros), (16, 4, 20))
        self.assertEqual(callers, 16)
        self.assertEqual(followed, {True: 16})

    def test_opcodes_below_0x07_leave_the_dispatcher_before_the_operand_is_read(self):
        # So 0x01 0x0000, which is not all zero and is therefore spooled, does nothing when it runs.
        self.assertEqual(window(self.code, LADDER_07, 3), ['MOVLW 0x07', 'SUBWF 0xb4,W', 'BNC 0x139b2'])


class ASendADelayAndTheHandshake(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_a_delay_is_a_send_with_bit_6_and_neither_folds(self):
        self.assertEqual(transfers_to(self.code, SEND_PUSH), [0x13254])
        self.assertEqual(transfers_to(self.code, DELAY_PUSH), [0x1326E])
        self.assertEqual(window(self.code, DELAY_PUSH, 2), ['MOVLB 0x1', 'BSF 0x94,6'])
        self.assertEqual(window(self.code, WORD_PUSH, 18),
                         ['RCALL 0x14568', 'IORLW 0x00', 'BNZ 0x146b6', 'RCALL 0x1459e', 'IORLW 0x00', 'BZ 0x146a8',
                          'CALL 0x19cbc', 'MOVLB 0x0', 'MOVLW 0x01', 'MOVWF 0xf4', 'MOVFF 0x190,0x17f',
                          'RCALL 0x14574', 'MOVFF 0x191,0x17f', 'RCALL 0x14574', 'RETLW 0x01', 'RETLW 0x00',
                          'MOVFF 0x193,0x191', 'MOVFF 0x192,0x190'])
        self.assertEqual(window(self.code, 0x14568, 1), ['MOVLW 0x1e'])
        # A push that does not fit sets the put back flag, and the common exit backs the read cursor up.
        self.assertEqual(window(self.code, 0x13278, 3), ['MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0xc8'])
        self.assertEqual(window(self.code, COMMON_EXIT, 5),
                         ['MOVLB 0x2', 'MOVF 0xc8,W', 'BZ 0x139d8', 'MOVLW 0x03', 'MOVLB 0x3'])

    def test_only_a_send_a_delay_and_a_deferral_fill_the_infrared_queue(self):
        pushes = transfers_to(self.code, WORD_PUSH)
        self.assertEqual([a for a in pushes if not DEFERRED_PUSH <= a < 0x1473E], [0x146C0, 0x146E6])
        self.assertEqual(transfers_to(self.code, DEFERRED_PUSH), [0x135E8])
        self.assertEqual(transfers_to(self.code, 0x14574), [0x146AC, 0x146B2])

    def test_the_queue_state_is_variable_17_and_each_change_waits_for_0x07_0xFFFA(self):
        self.assertEqual(window(self.code, POST, 8),
                         ['MOVFF 0x18f,0x119', 'MOVLB 0x3', 'MOVLW 0x2d', 'MOVWF 0x9d', 'CALL 0x12ed2', 'IORLW 0x00',
                          'BZ 0x14686', 'MOVLB 0x1'])
        self.assertEqual(0x119 - STATE_BASE, 17)
        # 0x12ED2 pushes the event 0x1F 0xFC2D through the event push and turns it to the head.
        self.assertEqual(window(self.code, 0x12ED2, 9),
                         ['RCALL 0x12dca', 'IORLW 0x00', 'BNZ 0x12ee6', 'MOVFF 0x39d,0x39c', 'RCALL 0x12eb4',
                          'RCALL 0x12e38', 'RCALL 0x12e38', 'RCALL 0x12e38', 'RETLW 0x01'])
        self.assertEqual(window(self.code, 0x130A8, 7),
                         ['MOVLW 0x1f', 'SUBWF 0xf0,W', 'BNZ 0x130bc', 'MOVLW 0xfc', 'SUBWF 0xef,W', 'BNZ 0x130bc',
                          'MOVFF 0x2ee,0x3a8'])
        self.assertEqual(window(self.code, 0x14682, 3), ['BSF 0x82,3', 'RETURN', 'GOTO 0x1468a'])
        self.assertEqual(window(self.code, TRANSMITTER, 2), ['BTFSC 0x82,3', 'RETLW 0x00'])
        self.assertEqual(window(self.code, ACKNOWLEDGE, 4), ['MOVLB 0x1', 'BCF 0x82,3', 'BSF 0x82,4', 'RETURN'])
        self.assertEqual(transfers_to(self.code, ACKNOWLEDGE), [0x1397E, 0x14686])
        # The other clear is the infrared engine's own reset at start, found by the blind reviewer.
        self.assertEqual(window(self.code, 0x14666, 2), ['BCF 0x82,3', 'BCF 0x82,4'])
        self.assertEqual(transfers_to(self.code, 0x14646), [0x16DBE])
        self.assertEqual(window(self.code, 0x13978, 4), ['MOVLW 0xfa', 'SUBWF 0xb2,W', 'BNC 0x13984', 'CALL 0x1468a'])
        self.assertEqual(transfers_to(self.code, POST), [0x146D4, 0x146FA, 0x14D76, 0x14ECE, 0x14F02])
        # The send raises it to 2 from below 2, the delay to 1 from below 1.
        self.assertEqual(window(self.code, 0x146C6, 7),
                         ['MOVLW 0x02', 'MOVLB 0x1', 'SUBWF 0x19,W', 'BC 0x146d6', 'MOVLB 0x1', 'MOVLW 0x02',
                          'MOVWF 0x8f'])
        self.assertEqual(window(self.code, 0x146EC, 7),
                         ['MOVLW 0x01', 'MOVLB 0x1', 'SUBWF 0x19,W', 'BC 0x146fc', 'MOVLB 0x1', 'MOVLW 0x01',
                          'MOVWF 0x8f'])
        # The transmitter starting is 3, the drain emptying is 0.
        self.assertEqual(window(self.code, 0x14EFE, 3), ['MOVLW 0x03', 'MOVWF 0x8f', 'CALL 0x1466e'])
        self.assertEqual(window(self.code, 0x14D74, 2), ['CLRF 0x8f', 'RCALL 0x1466e'])
        # The only absolute write to that byte in the application.
        writes = [a for a, i in listing(self.code, 0x010400, 0x01E000)
                  if i.mnemonic == 'MOVFF' and i.fields.get('dst') == 0x119]
        self.assertEqual(writes, [POST])

    def test_every_configuration_answers_the_event(self):
        modes = bound = answering = 0
        programs = collections.Counter()
        for name, c in containers():
            with self.subTest(name):
                leading = c.blob_offset_of(c.sections[gspm.arch_slot(c.architecture, gspm.BINDING_TABLE_SLOT)].address)
                self.assertEqual(c.blob[leading], 1)
                self.assertEqual(c._instruction_at(leading + 1), gspm.Instruction(0x000A, 0x7F))  # noqa: SLF001
                sets = c.handler_sets()
                entries = [(e.opcode, e.operand) for e in c.tagged_list(sets[1]) if e.tag == QUEUE_EVENT]
                self.assertEqual(entries, [ACK])
                answering += 1
                # List 10, which the leading list calls, pushes handler set 1 before any other.
                pushes = [x.operand & 0xFF for x in c.action_lists()[0x0A]
                          if x.opcode == 0x1F and x.operand >> 8 == 0xFE]
                self.assertEqual(pushes[0], 1)
                records = c.mode_records()
                hits = collections.Counter()
                for r in records:
                    for e in r.entries or []:
                        if e.tag == QUEUE_EVENT:
                            hits[(e.opcode, e.operand)] += 1
                # The thirty that bind nothing for the event bind nothing at all.
                self.assertEqual([len(r.entries or []) for r in records
                                  if not any(e.tag == QUEUE_EVENT for e in r.entries or [])], [0] * 30)
                modes += len(records)
                bound += sum(hits.values())
                self.assertEqual(len(records) - sum(hits.values()), 30)
                ((opcode, operand),) = hits
                self.assertEqual(opcode, 0x73)
                programs[operand] += 1
                table = c.pointer_array(gspm.arch_slot(c.architecture, gspm.SCREEN_TABLE_SLOT))
                address = table[operand & 0xFF]
                (switch, *_rest) = c.screen_program(address)
                self.assertEqual((switch.opcode, switch.operands[0]), (gspm.SCREEN_SWITCH_NARROW, 17))
                after = address + 1 + len(switch.operands)
                for target in switch.targets:
                    last = c.screen_program(target)[-1]
                    self.assertEqual((last.opcode, last.targets), (gspm.SCREEN_JUMP, [after]))
                answer, end = c.screen_program(after)[:2]
                self.assertEqual((answer.opcode, answer.operands), (gspm.SCREEN_QUEUE_INSTRUCTION, bytes([0xFA, 0xFF, 0x07])))
                self.assertEqual(end.opcode, gspm.SCREEN_END)
        self.assertEqual((answering, modes, bound), (16, 2831, 2351))
        self.assertEqual(programs, {2: 14, 3: 2})

    def test_every_send_is_paired_and_no_delay_step_opens_one(self):
        shapes = collections.Counter()
        for _, c in containers():
            for li in c.action_lists():
                if any(x.opcode == 0x7D for x in li):
                    paired = (len(li) == 2 and (li[0].opcode, li[1].opcode) == (0x7D, 0x7C)
                              and li[0].operand >> 8 == li[1].operand >> 8)
                    shapes[paired] += 1
        self.assertEqual(shapes, {True: 5917})


class TheDeferredInstruction(unittest.TestCase):
    def test_it_takes_the_next_instruction_without_an_empty_test_and_queues_four_bytes(self):
        code = application()
        self.assertEqual(window(code, DEFERRED, 11),
                         ['MOVLW 0xd0', 'SUBWF 0xb3,W', 'BC 0x135ba', 'BRA 0x139b2', 'MOVFF 0x3b2,0x2d0',
                          'RCALL 0x12e0a', 'MOVLB 0x3', 'MOVWF 0xb2', 'RCALL 0x12e0a', 'MOVLB 0x3', 'MOVWF 0xb3'])
        self.assertEqual(window(code, 0x135CA, 1), ['RCALL 0x12e0a'])
        self.assertEqual(window(code, 0x135E8, 1), ['CALL 0x14700'])

    def test_every_one_in_the_corpus_is_nibble_0_heading_a_call(self):
        found = collections.Counter()
        for _, c in containers():
            for li in c.action_lists():
                for k, ins in enumerate(li):
                    if 0x3F <= ins.opcode < 0x6F and 0xD0 <= ins.operand >> 8 <= 0xDF:
                        found[(ins.operand >> 8, k, len(li), li[1].opcode)] += 1
        self.assertEqual(found, {(0xD0, 0, 2, 0x7F): 77})


class TheCorpus(unittest.TestCase):
    def test_sixteen_containers_28126_lists_69387_instructions(self):
        lists = instructions = 0
        unused = collections.Counter()
        delays = set()
        for _, c in containers():
            for li in c.action_lists():
                lists += 1
                instructions += len(li)
                for ins in li:
                    if 0x40 <= ins.opcode <= 0x6E or ins.opcode in (0x74, 0x76, 0x7B):
                        unused[ins.opcode] += 1
                    if ins.opcode == 0x7C:
                        delays.add(ins.operand)
        self.assertEqual((lists, instructions), (28126, 69387))
        self.assertEqual(unused, {})
        self.assertEqual(max(d & 0xFF for d in delays), 100)
        self.assertEqual(sorted({d >> 8 for d in delays}), [0, 1, 2, 3, 4, 5, 6])

    def test_power_transitions_send_the_code_then_the_delay(self):
        probe = codec_probe()
        shapes = collections.Counter()
        spelled = []
        for name, answer in probe.items():
            for t in answer['power']:
                body = tuple(op for op, _ in t['body'])
                nested = tuple(tuple(n) for n in t['nested'])
                shapes[(t['from'], t['to'], t['opcode'], body, nested)] += 1
                if body.count(0x7C) > 1:
                    spelled.append((name, [operand for op, operand in t['body'] if op == 0x7C]))
        self.assertEqual(shapes, {
            (1, 0, 0x7F, (0x7D, 0x7C), ()): 80,
            (0, 1, 0x7F, (0x7F, 0x7C), ((0x7D, 0x7C),)): 79,
            (0, 1, 0x7F, (0x7F, 0x7C, 0x7C, 0x7C, 0x7C), ((0x7D, 0x7C),)): 1,
        })
        self.assertEqual(spelled, [('H880-Pro.EZHex', [0x0364, 0x0364, 0x0364, 0x0314])])
        self.assertEqual(sum(v & 0xFF for v in spelled[0][1]), 320)


class TheHarmony720(unittest.TestCase):
    def test_its_dispatcher_is_the_885s_instruction_for_instruction(self):
        code = application()
        (h720,) = by_name(OTHER_APPLICATIONS['720'])

        def shape(image, start, count):
            out = []
            for _, ins in listing(image, start, start + 8 * count):
                f = ins.fields
                out.append((ins.mnemonic, f.get('k'), f.get('b'), f.get('a'), f.get('d')))
                if len(out) == count:
                    break
            return out
        ours = [i for _, i in listing(code, DISPATCHER, DISPATCHER_END)]
        self.assertEqual(len(ours), 831)
        self.assertEqual(shape(code, DISPATCHER, 831), shape(h720, DISPATCHER_720, 831))
        self.assertNotEqual(shape(code, DISPATCHER, 831), shape(h720, DISPATCHER_720 + 2, 831))


if __name__ == '__main__':
    unittest.main()
