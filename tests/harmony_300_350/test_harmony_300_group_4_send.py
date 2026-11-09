#!/usr/bin/env python3
"""Why a send from an infrared group above 3 sends nothing on a Harmony 300, read in the 300's application:
the send's firmware event is 0xFF, no list is bound to it, and the list that would have acknowledged the
event never runs, so the sender waits for ever.

**The question.** Logitech's compile of the Harmony 350's test setup was written to the bench Harmony 300.
Groups 0 to 3 sent as predicted. After a long press selected the device on group 4, the key that sends a
group 4 code sent nothing in three runs of three, the remote then stopped answering most keys, a device key
pressed afterwards stayed lit, and pulling the batteries recovered it (`docs/test-notes/harmony-300.md`).
`tests/harmony_300_350/test_harmony_300_350_images.py` had read the one routine in which the 300's application differs from
the 350's, the arm for `0x7D`, and had the 300 raising event `0x2D` for a group above 3, which could not
explain any of that. **That reading was wrong, and this test is the correction.**

**Sources checked first.** `reference/architectures/harmony-300-350/firmware.md` and the two tests above;
`docs/findings.md` and `reference/` grepped for `0x8A`, `0x11EE8` and `FFFA`: the arch 12 and arch 14
compiler pages say what `07 FFFA` does is not read, and nothing says what the 300/350 image does with it.
Logitech's client was not consulted: the answer is in the image. Read in the Harmony 300's application,
`h300_code`, and the Harmony 350's, `h350_unit_code`, both at `0x9000`. Addresses are the 300's; the 350's
are those plus 10 from `0x11A86` on and the same below `0x11356`.

**What was traced, in the 300's addresses.**

1. **The send kind has a default, and the default is event 0xFF.** The event chain at `0x11EA0` XORs
   the kind with 3, 1, 3, 1 in turn, so its cases are 3, 2, 1 and, by falling out of the end with zero left,
   0, which raise `0x30`, `0x2E`, `0x2F` and `0x2D`. Anything else is a `BNZ 0x11ECE` to `SETF 0xC19`: **a
   kind of `0xFF` raises event `0xFF`.** The earlier reading took the default for case 0. The 350's build
   has the same chain behind `ANDLW 3`, so its default is unreachable and every group it can send from
   raises a bound event.
2. **A raised event is a three byte item at the head of the action queue**: `0x10FC4` enqueues the event
   byte, `0xFC` and `0x1F`, and the pop at `0x111D6` recognises that shape (`0x1F` third, `0xFC` second) and
   hands the first byte to `0x1113A`, which asks `0x1AB1A` to find a binding of that tag in each active
   map (slot 6, the seeker's literal at `0x1AB32`) and run it. **An unbound tag finds nothing and runs
   nothing.** Over the 13 configurations of the family, 64 maps and 1751 bindings, none is tagged `0xFF`.
3. **Raising an event sets a flag, and only `07 FFFA` clears it.** After a successful enqueue `0x11EE0`
   sets bit 4 of `0x08A`. The dispatcher's arm for opcode `0x07` with operand `0xFFFA` is a `CALL 0x11EE8`
   (`0x11CAC`), which clears bit 4 and sets bit 5. Every bit operation on that byte in the image is listed
   below, so those are the only writers of bit 4: the reset at `0x11E84`, the enqueue, `0x11EE8` and its
   failure branch. The four event lists the compilers write all end in `07 FFFA` (the sibling test), so on
   every bound event the flag is cleared when the list ends.
4. **The sender will not advance while the flag is set.** `0x12BA8`, the sender's step, opens with
   `BTFSC 0x08A,4` and `RETLW 0`. Its state is `0x119`: `0x11FFA`, the arm's call, queues the group and code
   in the 30 byte buffer at `0x65` and, when the state is below 2, sets state 2 and raises the kind's event
   through `0x11E9C`; every later state change (`0x129FE`, `0x12B9E`, `0x12BD6`) raises it again. The step
   that starts transmitting from state 2 is behind the flag. **So with a kind of `0xFF`: the event is
   raised, nothing runs, the flag stays set, the state stays 2 and nothing is transmitted.**

**What it explains, and what it does not.** Observation 1, nothing sent from group 4: explained by 1 to 4,
traced. Observation 2, the remote answering most keys no more: explained as far as the state stays 2 for good,
so a later send (Volume Up included) is queued and never transmitted, and the buffer is the only thing that
takes it; a full buffer makes the `0x7D` arm return 0, which `0x113B2` turns into a retry of the same
instruction, which would hold the interpreter. Three presses do not fill a buffer of 15 sends, so **that
is a hypothesis for the keys that stopped, not a trace**. Observation 3, a lit device key: the sender's
finishing event, which lowers the pin, never comes, so a pin and any key light it drives stay as they
were; that the pins are the key lights is **not read** (`test_harmony_300_350_send_events.py`) and this
step rests on it. **Not read either**: the caller of `0x11EE8`'s failure branch, the writer of `0x8A` as a
whole byte at `0x109AC` (a routine that decodes a two byte command at `0x15D1C`, reached from the
serial side as far as its callers go), and whether the main loop has another reader of state 2.

**Predictions that need no hardware.** (a) A group above 3 on a Harmony 350 raises event `0x30` and works:
the 350's configurations with groups 4 to 7 are the ones Logitech compiles for it. (b) A configuration
holding groups 0 to 3 only works on a 300: Logitech's compiles for a 300 hold four and the 300's first
programmed configuration did. (c) Binding event `0xFF` in entry 0 to a list ending in `07 FFFA` would
make the 300 send. **(c) held on the bench Harmony 300**, see "The measurement" below.
(d) After one group 4 send every later send from groups 0 to 3 is queued and not transmitted until the
batteries are pulled, which the bench has seen once (the keys after the hang).

**Width.** Arch 16 (Harmony 300 and 350), the application 1.4 read on both models' units, one build each.
The event acknowledgement is read on arch 16 only; arch 12 (Harmony One) and arch 14 (Harmony 600, 650 and
700) are not checked, and their compiler pages still say `07 FFFA` is unread.

**The two boards.** A person opened a Harmony 300 and a Harmony 350 and photographed the boards side by side,
`reference/images/300-350-pcb.jpeg` in the lab. Read off the photograph: both boards carry `PEPSI PA3` and
`Logitech P/N 210-000767_010` on the silkscreen, and by the person's inspection the same parts and traces;
the board maker's mark differs (`CPS 94V-0 E243951` on the 350's, `EET-2 E246995 94V-0` on the 300's); a pad row
at the bottom is labelled `ICD_VPP`, `RB7`, `RB6`, `DGND`, `VDD_3V3`, `VBATT`, `UART1 RXD`, `UART1 TXD`. The
test below can only show the photograph is in the lab; the reading is the inspection's, recorded here as the
reference's footnote needs it. It does not bear on the trace above, which is of the images. Nothing was connected.

**The measurement, which closes prediction (c).** One entry was added to key map 0 of Logitech's compile of
the Harmony 350's test setup: tag `0xFF`, the opcode and operand of the entry tagged `0x30`, a call of the list
that event runs, which ends in `07 FFFA`. The file is the lab's `work/300-event-ff/h350-compile-event-ff.bin`,
made with the codec's `withMapEntries` and `restamped` by `bind-ff.ts` beside it, 118513 bytes to 118517, and
`packages/codec/test/families/harmony-300-350/noscreeneventff.test.ts` makes it again byte for byte. It was written to the bench
Harmony 300 and read back identical. Run through the 350's test, the 300 sent from group 4 (the Knoll's Timer),
group 5 (Kodi's Exit), group 6 (the Switch's Input 1) and group 7 (Sony HT's Stop), and went on answering
through all 20 steps with no battery pull, where without the entry the first group 4 send hung it in three runs of
three, `packages/bench/test/harmony-300-350/eventff300.test.ts`. **The long presses of the TV and DVD keys did not take in the
first run** and did in the second and the live repeat; why is not known. **The same file written to the bench
Harmony 350**, whose build masks the kind to two bits and never raises `0xFF`, heard the Denon's Volume Up, the
Knoll's Timer from group 4 and the LG TV's Volume Up and the remote went on working: the entry is harmless there,
measured on one unit. What the measurement does not show: a
send from every key of the four maps, a long press that always takes, another build of the application, or that
the later keys failing before were failing for the reason traced, which the entry's removing the hang bears out
but no trace reads. Its width is arch 16 (Harmony 300 and Harmony 350), one unit of the Harmony 300, one build.
The three tests of `BindingFFIsOneEntryThatCallsTheListEvent30Runs` read the entry in Python, next to the trace
that named it.

**What would falsify it.** A second writer of bit 4 of `0x08A` that a group 4 send reaches, a binding tagged
`0xFF` in a configuration of Logitech's, or a group 4 send that transmits on a 300 given a configuration without
the entry. **Falsified in part**: a group 4 to 7 send that did not transmit with the entry, which the bench did
not see.
"""
import re
import unittest

import lab
from harmony.pic18 import chains, disasm

from . import test_harmony_300_350_images as images
from . import test_harmony_300_350_send_events as events

BASE = images.BASE
text = images._text

#: The shift of the 350's address against the 300's at the routines read here.
SHIFT_350 = 10


def _bit_operations_on(code, name):
    """(address, text) of every instruction that touches bit 4 or 5 of the flag byte `0x8A`, or writes it whole."""
    pattern = re.compile(r'\b0x0?8a,(B,)?[45]\b|(MOVWF|CLRF|SETF|ANDWF|IORWF|XORWF|INCF|DECF|MOVFF)\b.* 0x0?8a\b'
                         r'|(MOVWF|CLRF|SETF) 0x8a,B')
    out = []
    for line in disasm.disassemble(code, BASE, BASE, len(code) // 2):
        instruction = line[21:].strip()
        if pattern.search(' ' + instruction):
            out.append((int(line[2:7], 16), instruction))
    return out


class AKindOfFF_RaisesEventFF(unittest.TestCase):
    def setUp(self):
        lab.require('h300_code', 'h350_unit_code')
        self.a, self.b = lab.load('h300_code'), lab.load('h350_unit_code')

    def test_the_chain_has_a_default_and_the_default_stores_ff(self):
        self.assertEqual(text(self.a, BASE, 0x11EA0, 17),
                         ['MOVLB 0x2', 'MOVF 0x203,W', 'XORLW 0x03', 'BZ 0x11ec6', 'XORLW 0x01', 'BZ 0x11ec0',
                          'XORLW 0x03', 'BZ 0x11eba', 'XORLW 0x01', 'BNZ 0x11ece', 'MOVLB 0xc', 'MOVLW 0x2d',
                          'BRA 0x11eca', 'MOVLB 0xc', 'MOVLW 0x2f', 'BRA 0x11eca', 'MOVLB 0xc'])
        self.assertEqual(text(self.a, BASE, 0x11ECE, 5),
                         ['MOVLB 0xc', 'SETF 0xc19', 'MOVFF 0xc19,0x29d', 'CALL 0x10fe2', 'IORLW 0x00'])
        # The cases the chain names are 1, 2 and 3; 0 is falling out of the end and everything else is the
        # BNZ. The earlier reading sent the BNZ's branch to case 0.
        self.assertEqual(set(chains.chain_table(self.a, BASE, 0x11EA4)), {1, 2, 3})

    def test_the_350s_chain_is_the_same_and_its_default_cannot_be_reached(self):
        ours = text(self.b, BASE, 0x11EA0 + SHIFT_350, 12)
        theirs = text(self.a, BASE, 0x11EA0, 12)
        strip = lambda lines: [re.sub(r'0x1[0-9a-f]{4}', '@', t) for t in lines]
        self.assertEqual(strip(ours), strip(theirs))
        # `ANDLW 3` in front of all three stores of the kind: 0 to 3 are all it can hold.
        self.assertEqual(text(self.b, BASE, 0x1137E, 6),
                         ['MOVLB 0xd', 'SETF 0xd06', 'MOVF 0xd06,W', 'ANDLW 0x03', 'MOVLB 0x2', 'MOVWF 0x203'])

    def test_an_event_is_queued_as_the_tag_then_0xfc_then_0x1f_and_the_pop_recognises_it(self):
        for code in (self.a, self.b):
            self.assertEqual(text(code, BASE, 0x10FC4 + 6, 6),
                             ['MOVFF 0x29c,0x29b', 'RCALL 0x10eba', 'MOVLB 0x2', 'MOVLW 0xfc', 'MOVWF 0x29b',
                              'RCALL 0x10eba'])
            self.assertEqual(text(code, BASE, 0x111EE, 6),
                             ['MOVLW 0x1f', 'SUBWF 0x38,B,W', 'BNZ 0x11202', 'MOVLW 0xfc', 'SUBWF 0x37,B,W',
                              'BNZ 0x11202'])
            self.assertEqual(text(code, BASE, 0x111FA, 2), ['MOVFF 0xc36,0x2a8', 'GOTO 0x1113a'])

    def test_no_configuration_binds_a_tag_of_0xff_so_the_lookup_finds_nothing(self):
        configurations = events._all()
        maps = bindings = 0
        for c in configurations:
            for entry in c.maps():
                tags = [tag for tag, _, _ in c.tagged(entry)]
                maps += 1
                bindings += len(tags)
                self.assertNotIn(0xFF, tags, c.name)
        self.assertEqual((len(configurations), maps, bindings), (13, 64, 1751))

    def test_the_lookup_seeks_slot_6_which_is_the_maps(self):
        self.assertEqual(text(self.a, BASE, 0x1AB2E, 3), ['MOVLW 0x06', 'MOVWF 0xdd,B', 'CALL 0x10bce'])


class OnlyFFFAClearsTheFlagTheSenderWaitsOn(unittest.TestCase):
    def setUp(self):
        lab.require('h300_code', 'h350_unit_code')
        self.a, self.b = lab.load('h300_code'), lab.load('h350_unit_code')

    def test_every_bit_operation_on_the_flag_byte_is_listed(self):
        self.assertEqual(_bit_operations_on(self.a, 'h300'), [
            (0x109AC, 'MOVWF 0x8a,B'), (0x11E84, 'BCF 0x08a,4'), (0x11E86, 'BCF 0x08a,5'),
            (0x11EE0, 'BSF 0x08a,4'), (0x11EEA, 'BCF 0x08a,4'), (0x11EEC, 'BSF 0x08a,5'),
            (0x12BAA, 'BTFSC 0x08a,4'), (0x12BE0, 'BCF 0x08a,5')])
        self.assertEqual(_bit_operations_on(self.b, 'h350')[0], (0x109AC, 'MOVWF 0x8a,B'))
        mine = [(a, t) for a, t in _bit_operations_on(self.a, 'h300') if a > 0x11E00]
        theirs = [(a, t) for a, t in _bit_operations_on(self.b, 'h350') if a > 0x11E00]
        self.assertEqual([(a + SHIFT_350, t) for a, t in mine], theirs)

    def test_the_enqueue_sets_the_flag_and_07_fffa_calls_the_routine_that_clears_it(self):
        self.assertEqual(text(self.a, BASE, 0x11EDA, 5),
                         ['IORLW 0x00', 'BZ 0x11ee4', 'MOVLB 0x0', 'BSF 0x08a,4', 'RETURN'])
        self.assertEqual(text(self.a, BASE, 0x11EE8, 4), ['MOVLB 0x0', 'BCF 0x08a,4', 'BSF 0x08a,5', 'RETURN'])
        self.assertEqual(text(self.a, BASE, 0x11CA2, 6),
                         ['NOP', 'BRA 0x11d16', 'MOVLW 0xfa', 'SUBWF 0xb3,B,W', 'BNC 0x11cb2', 'CALL 0x11ee8'])
        # In front of that arm: the opcode is 0x07 and the operand's high byte is 0xFF.
        self.assertEqual(text(self.a, BASE, 0x11C26, 6),
                         ['MOVLW 0x07', 'SUBWF 0xb5,B,W', 'BNC 0x11d16', 'MOVLW 0xff', 'SUBWF 0xb3,B,W',
                          'BNC 0x11c38'])
        self.assertEqual(text(self.b, BASE, 0x11CA2 + SHIFT_350, 6)[-1], 'CALL 0x11ef2')

    def test_the_sender_returns_while_the_flag_is_set(self):
        self.assertEqual(text(self.a, BASE, 0x12BA8, 5),
                         ['MOVLB 0x0', 'BTFSC 0x08a,4', 'RETLW 0x00', 'MOVLB 0x1', 'MOVF 0x119,W'])
        self.assertEqual(text(self.b, BASE, 0x12BA8 + SHIFT_350, 3), ['MOVLB 0x0', 'BTFSC 0x08a,4', 'RETLW 0x00'])

    def test_the_state_is_set_and_the_kinds_event_raised_by_the_same_routine(self):
        self.assertEqual(text(self.a, BASE, 0x11E9C, 4), ['MOVFF 0x097,0x119', 'MOVLB 0x2', 'MOVF 0x203,W', 'XORLW 0x03'])
        # The arm's call queues the send and raises the event only when the state is below 2.
        self.assertEqual(text(self.a, BASE, 0x12008, 9),
                         ['MOVLW 0x02', 'MOVLB 0x1', 'SUBWF 0x119,W', 'BC 0x12018', 'MOVLB 0x0', 'MOVLW 0x02',
                          'MOVWF 0x097', 'RCALL 0x11e9c', 'RETLW 0x01'])

    def test_the_four_event_lists_end_in_07_fffa_in_every_configuration(self):
        for c in events._all():
            for tag, lists in events._event_lists(c).items():
                self.assertEqual(lists[0][-1], (0xFFFA, 0x07), (c.name, tag))


COMPILE = 'work/setups/h350-test/compile-Result.EzHex'
PATCHED = 'work/300-event-ff/h350-compile-event-ff.bin'


def _patched_pair():
    """The compile and the patched file, read by raw slot like the rest of the family."""
    if not lab.LAB:
        raise unittest.SkipTest('no lab; set HARMONY_LAB')
    import os
    pair = []
    for rel in (COMPILE, PATCHED):
        path = os.path.join(lab.LAB, *rel.split('/'))
        if not os.path.isfile(path):
            raise unittest.SkipTest('%s is not in the lab' % rel)
        c = events.keys._Config.__new__(events.keys._Config)
        c.name = rel
        with open(path, 'rb') as handle:
            blob = handle.read()
        c.blob = blob[blob.find(b'GSPM'):]
        pair.append(c)
    return pair


class BindingFFIsOneEntryThatCallsTheListEvent30Runs(unittest.TestCase):
    def setUp(self):
        self.compile, self.patched = _patched_pair()

    def test_the_patched_file_binds_ff_once_in_map_0_and_nowhere_else_and_the_compile_not_at_all(self):
        maps = self.patched.maps()
        self.assertEqual(len(maps), 9)
        found = [(i, [tag for tag, _, _ in self.patched.tagged(m)].count(0xFF)) for i, m in enumerate(maps)]
        self.assertEqual(found, [(0, 1)] + [(i, 0) for i in range(1, 9)])
        self.assertEqual(sum(tag == 0xFF for m in self.compile.maps() for tag, _, _ in self.compile.tagged(m)), 0)
        self.assertEqual((len(self.compile.blob), len(self.patched.blob)), (118513, 118517))

    def test_the_entry_is_event_30s_call_and_that_list_ends_in_the_acknowledgement(self):
        entries = {tag: (operand, opcode) for tag, operand, opcode in self.patched.tagged(self.patched.maps()[0])}
        self.assertEqual(entries[0xFF], entries[0x30])
        self.assertEqual(entries[0xFF][1], 0x7F, 'a call of an action list')
        self.assertEqual(self.patched.flat(*entries[0xFF])[-1], (0xFFFA, 0x07))
        # The rest of map 0 is the compile's seventeen entries, in order, the new one between 0x2D and 0x30.
        before = self.compile.tagged(self.compile.maps()[0])
        after = self.patched.tagged(self.patched.maps()[0])
        self.assertEqual([e for e in after if e[0] != 0xFF], before)
        self.assertEqual(len(before), 17)
        tags = [tag for tag, _, _ in after]
        self.assertEqual(tags[tags.index(0xFF) - 1:tags.index(0xFF) + 2], [0x2D, 0xFF, 0x30])

    def test_the_other_maps_and_every_action_list_are_the_compiles(self):
        for i in range(1, 9):
            self.assertEqual(self.patched.tagged(self.patched.maps()[i]), self.compile.tagged(self.compile.maps()[i]), i)
        count = self.compile.u(self.compile.pointer(7), 2)
        self.assertEqual(self.patched.u(self.patched.pointer(7), 2), count)
        for index in range(count):
            self.assertEqual(self.patched.action_list(index), self.compile.action_list(index), index)


class TheBenchHeardGroups4To7WithTheEntry(unittest.TestCase):
    """The runs' stored verdicts, which the monitor judged with the compile loaded; the TypeScript test
    `packages/bench/test/harmony-300-350/eventff300.test.ts` matches the pulses again and holds group 6, heard live."""

    def setUp(self):
        lab.require('h300_event_ff_ir', 'h300_event_ff_ir_redo', 'h350_event_ff_ir')
        import json
        self.first = json.loads(lab.load('h300_event_ff_ir'))
        self.redo = json.loads(lab.load('h300_event_ff_ir_redo'))
        self.on_350 = json.loads(lab.load('h350_event_ff_ir'))

    def test_the_first_run_passed_every_verdict_but_the_two_long_presses_that_did_not_take(self):
        failed = [(i + 1, v['expected']) for i, step in enumerate(self.first['steps']) for v in step.get('verdicts') or []
                  if not v['ok']]
        self.assertEqual(failed, [(2, 'denon \u00b7 VolumeUp'), (2, 'knoll \u00b7 Timer'), (6, 'switch \u00b7 Input1')])
        self.assertEqual(len(self.first['steps']), 20)
        # Group 5 and group 7 sends, steps 4 and 8, heard.
        step4 = [v for v in self.first['steps'][3]['verdicts'] if v['expected'].startswith('kodi')]
        step8 = [v for v in self.first['steps'][7]['verdicts'] if v['expected'] == 'sony_ht \u00b7 Stop']
        self.assertEqual([v['ok'] for v in step4 + step8], [True, True])

    def test_the_redone_steps_heard_the_denon_and_the_knolls_timer_from_group_4(self):
        verdicts = [[(v['expected'], v['ok']) for v in step.get('verdicts') or []] for step in self.redo['steps'][:2]]
        self.assertEqual(verdicts, [[('lg_tv \u00b7 VolumeUp', True), ('lg_tv \u00b7 Info', True)],
                                    [('denon \u00b7 VolumeUp', True), ('knoll \u00b7 Timer', True)]])

    def test_the_same_file_on_a_350_heard_the_denon_the_knoll_and_the_lg_tv(self):
        verdicts = [[(v['expected'], v['ok']) for v in step.get('verdicts') or []] for step in self.on_350['steps']]
        self.assertEqual(verdicts, [[('denon \u00b7 VolumeUp', True), ('knoll \u00b7 Timer', True)],
                                    [('lg_tv \u00b7 VolumeUp', True)]])


class ThePhotographOfTheTwoBoardsIsInTheLab(unittest.TestCase):
    def test_it_is_there(self):
        import os
        if not lab.LAB:
            self.skipTest('no lab; set HARMONY_LAB')
        path = os.path.join(lab.LAB, 'reference', 'images', '300-350-pcb.jpeg')
        if not os.path.isfile(path):
            self.skipTest('the photograph is not in the lab')
        with open(path, 'rb') as handle:
            self.assertEqual(handle.read(2), b'\xff\xd8', 'a JPEG')


if __name__ == '__main__':
    unittest.main()
