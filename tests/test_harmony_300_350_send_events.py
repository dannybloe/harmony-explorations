#!/usr/bin/env python3
"""What the four send kinds do on the Harmony 300 and the Harmony 350: each raises one firmware event, each
event runs one list, the four lists are the same list on four output pins.

**Corrected by `tests/test_harmony_300_group_4_send.py`.** This header concluded that a send from an infrared
group above 3 lights another pin on a Harmony 300 than on a Harmony 350 and does nothing else. That was
wrong: the 300's kind for such a group is 0xFF, which raises event 0xFF, to which nothing is bound, so the
list that ends in `07 FFFA` never runs and the send never starts. The measurements below about the four
bound events stand; the sentences about the 300's group above 3, kept as written, do not.

**The question.** `tests/test_harmony_300_350_images.py` found that the two applications are one program but
for one routine: the action list dispatcher's arm for `0x7D`, a send, which maps the group to a send kind
in `0x203`. A group of 4 or more is `0xFF` on the 300 and 3 on the 350, so the 300 raises firmware event
`0x2D`, group 0's, where the 350 raises `0x30`, group 3's. `todo-compile-300.md` 4.2 asks what the events
do, and whether running `0x2D`'s list in place of `0x30`'s changes anything a person or a device meets.

**Sources checked first.** `reference/architectures/harmony-300-350/firmware.md` and `memory.md` for the
events and band `0xE9` (`tests/test_harmony_350_keys.py`, `test_harmony_350_slots.py`,
`test_harmony_350_clock.py`, `test_harmony_300_350_images.py`); `reference/config-format/actions.md` for the
conditional `0x71`. Logitech's client was not consulted: the answer is in the configurations and the image.
`docs/findings.md` was grepped for `0x2D` and for the pin routine and holds nothing on either.

**What was measured.**

1. **Entry 0 of every configuration binds the four events to one list each.** Read in the 13 configurations
   of this family the lab holds: the five bench fixtures (`h350_config`, `h350_programmed_config`,
   `h350_three_devices_config`, `h300_config`, `h300_programmed_config`), Logitech's compile of the 350 test
   setup and its first compile, five compiles from the gathering harvest (four for a 350, among them the
   eight device one, and one for a 300), and the configuration of the contributed 350 in issue 37. One binding per tag in every one, and no other tag below `0x40` is bound.
2. **The four lists are one list on four pins.** Each is `1F FB00`, `71 8111`, `1F E9p2`, `1F E9p0`, `07
   FFFA`: a test of state variable 17 (the sending flag, `test_harmony_350_clock.py`) with two arms, the
   pin `p` switched one way or the other, and the `0x07 FFFA` the compilers append, which no image has been
   read for. `0x2D` is pin 0, `0x2F` pin 1, `0x2E` pin 2 and `0x30` pin 3. **In every one of the 13, `0x2D`'s
   list and `0x30`'s are the same list but for that nibble.**
3. **What the pin is, in the image.** The band `0xE9` routine at `0x14568` on the 350 (`0x1455E` on the 300,
   the shift being 10 there) takes the pin in `0xBD` and the value in `0xBE`: pin 0 is `PORTC` bit 1, pin 1
   `PORTB` bit 0, pin 2 `PORTB` bit 2 and pin 3 `PORTB` bit 3, **set when the value is zero and cleared
   otherwise**, so the `E9p0` arm raises the pin and the `E9p2` arm lowers it. The start up code calls the
   same routine for pins 0 to 3 in turn (`0xDDE8` to `0xDE1E`). The routine is **byte for byte the same
   instructions in the two images**. It touches nothing but those four port bits.
4. **The send handler does not read the kind.** `0x203` has three accesses in each image (`test_harmony_300_350_images.py`),
   its start up clear, the dispatcher's store and the event chain's read at `0x11EAE`, so the code that is
   sent and the group it is sent from are the same on the two models. The only thing the kind changes is
   which pin's list runs.
5. **The difference is reached by configurations of the 350, not of the 300.** Of the 13, four send from a
   group above 3 (the test setup compile and its first compile, the eight device compile, and issue 37's,
   whose groups reach 5), all four of the 350; none of the 300's does, which is the family's own limit: Logitech's
   service puts four infrared groups on a 300 and eight on a 350, `reference/architectures/harmony-300-350/README.md`.

**What it settles.** A Harmony 300 holding a configuration with a device on group 4 to 7 would, on each
send from it, run the list of pin 0 where a Harmony 350 runs pin 3's. **The sent infrared is unchanged and
the only difference is which of two output pins is raised and lowered around it.** What the pins drive is
not read: the fit with the device keys lighting while the remote sends rests on the manual's statement
about the Device buttons and on all four lists switching on the sending flag, not on a trace to the board.
So the difference is invisible if the four pins light the four device keys alike, and visible as another
light blinking if they do not. **Not checked**: that mapping, the `0x07 FFFA`, and whether an event raised
while another list runs is dropped. The bench test written for `todo-compile-300.md` 4.3,
`packages/bench/irtests/300-4-3-350-compile.json`, sends from groups 4 to 7 on a 300, and a receiver hears
the codes and cannot see the pins, so it can confirm the first half of the answer and not the second.

**Width.** Arch 16 alone, one image build per model; 13 configurations, 2 of them read off a 300 and
1 compiled for one.

**What would falsify it.** A configuration whose `0x2D` list differs from its `0x30` list in more than the pin
nibble, or a second access to `0x203` in either image, or a difference between the two images' `0xE9` routine.
"""
import os
import unittest

import lab
import test_harmony_350_keys as keys

CONFIGS = keys.CONFIGS
#: Compiles read by their path in the lab, which has no name for them.
BY_PATH = (
    'work/setups/h350-test/compile-Result.EzHex',
    'work/setups/h350-test/first-compile/compile-Result.EzHex',
    'work/harvest/check-350/compile-001-Result.EzHex',
    'work/harvest/check-350/compile-002-Result.EzHex',
    'work/harvest/check-350-retry/compile-001-Result.EzHex',
    'work/harvest/check-350-eight/compile-001-Result.EzHex',
    'work/harvest/check-300/compile-001-Result.EzHex',
    'dumps/kkong42/issue-37-harmony-350/unzipped/H350-Sample/H350-Config-inner/Result.EzHex',
)
#: Which of the eight a send kind is, and which pin its event's list switches.
EVENT_PIN = {0x2D: 0, 0x2F: 1, 0x2E: 2, 0x30: 3}
#: The pin in the image: `0x14568` and the `PORT` bit it sets or clears.
PIN_PORT = {0: 'PORTC,1', 1: 'PORTB,0', 2: 'PORTB,2', 3: 'PORTB,3'}
PIN_ROUTINE_350, PIN_ROUTINE_300 = 0x14568, 0x1455E


def _by_path():
    if not lab.LAB:
        raise unittest.SkipTest('no lab; set HARMONY_LAB')
    out = []
    for rel in BY_PATH:
        path = os.path.join(lab.LAB, *rel.split('/'))
        if not os.path.isfile(path):
            raise unittest.SkipTest('%s is not in the lab' % rel)
        c = keys._Config.__new__(keys._Config)
        c.name = rel
        with open(path, 'rb') as handle:
            blob = handle.read()
        c.blob = blob[blob.find(b'GSPM'):]
        out.append(c)
    return out


def _all():
    lab.require(*CONFIGS)
    return keys._configs() + _by_path()


def _event_lists(c):
    """Entry 0's bindings of the four firmware events, as {tag: [flattened lists]}."""
    out = {}
    for tag, operand, opcode in c.tagged(c.maps()[0]):
        if tag < 0x40:
            out.setdefault(tag, []).append(c.flat(operand, opcode))
    return out


class TheFourSendEventsAreOneListOnFourPins(unittest.TestCase):
    def test_the_population_is_thirteen_configurations(self):
        self.assertEqual(len(_all()), 13)

    def test_every_configuration_binds_exactly_the_four_events_below_0x40_once_each(self):
        for c in _all():
            with self.subTest(c.name):
                lists = _event_lists(c)
                self.assertEqual(sorted(lists), sorted(EVENT_PIN))
                self.assertEqual([len(v) for v in lists.values()], [1, 1, 1, 1])

    def test_each_list_switches_variable_17s_pin_and_carries_the_same_tail(self):
        for c in _all():
            with self.subTest(c.name):
                for tag, pin in EVENT_PIN.items():
                    self.assertEqual(_event_lists(c)[tag][0],
                                     [(0xFB00, 0x1F), (0x8111, 0x71), (0xE902 | pin << 4, 0x1F),
                                      (0xE900 | pin << 4, 0x1F), (0xFFFA, 0x07)])

    def test_0x2d_and_0x30_differ_in_the_pin_nibble_alone_in_all_thirteen(self):
        agree = 0
        for c in _all():
            lists = _event_lists(c)
            a, b = lists[0x2D][0], lists[0x30][0]
            strip = lambda seq: [(op & ~0x30 if op >> 8 == 0xE9 else op, opc) for op, opc in seq]
            self.assertNotEqual(a, b)
            self.assertEqual(strip(b), [(op & ~0x30 if op >> 8 == 0xE9 else op, opc) for op, opc in a])
            agree += 1
        self.assertEqual(agree, 13)

    def test_four_of_the_thirteen_send_from_a_group_above_3_and_all_four_are_350s(self):
        above = {}
        for c in _all():
            groups = set()
            for entry in range(len(c.maps())):
                groups |= c.groups(entry)
            if max(groups) > 3:
                above[c.name] = max(groups)
        self.assertEqual(above, {
            'work/setups/h350-test/compile-Result.EzHex': 7,
            'work/setups/h350-test/first-compile/compile-Result.EzHex': 7,
            'work/harvest/check-350-eight/compile-001-Result.EzHex': 7,
            'dumps/kkong42/issue-37-harmony-350/unzipped/H350-Sample/H350-Config-inner/Result.EzHex': 5})


class ThePinRoutineIsTheSameInBothImages(unittest.TestCase):
    def setUp(self):
        lab.require('h350_unit_code', 'h300_code')
        self.c350, self.c300 = lab.load('h350_unit_code'), lab.load('h300_code')

    def test_it_sets_the_pin_when_the_value_is_zero_and_clears_it_otherwise(self):
        listing = keys._listing(self.c350, keys.BASE, PIN_ROUTINE_350, 35)
        # Pin 0 first: the chain ends on a zero, and each arm is `MOVF 0xbe` then BSF or BCF of one bit.
        arms = {}
        for i, line in enumerate(listing):
            if line.startswith('BSF'):
                self.assertTrue(listing[i - 2].startswith('MOVF 0xbe'))
                arms[line.split()[1]] = (line, listing[i + 2])
        self.assertEqual(sorted(arms), sorted(PIN_PORT.values()))
        for line, clear in arms.values():
            self.assertTrue(clear.startswith('BCF'))
            self.assertEqual(line.split()[1], clear.split()[1])

    def test_the_four_pins_are_these_four_port_bits_by_the_chain_on_0xbd(self):
        listing = keys._listing(self.c350, keys.BASE, PIN_ROUTINE_350, 12)
        self.assertEqual(listing[:9], ['MOVLB 0x0', 'MOVF 0x0bd,W', 'XORLW 0x03', 'BZ 0x145a2', 'XORLW 0x01',
                                       'BZ 0x14596', 'XORLW 0x03', 'BZ 0x1458a', 'XORLW 0x01'])
        # The running xor is 3, 2, 1, 0, so the arms are for pin 3, 2, 1 and 0: the targets' ports.
        for target, port in {0x145A2: 'PORTB,3', 0x14596: 'PORTB,2', 0x1458A: 'PORTB,0', 0x1457E: 'PORTC,1'}.items():
            self.assertEqual(keys._listing(self.c350, keys.BASE, target, 3)[2].split()[1], port)

    def test_the_300s_copy_is_the_same_instructions_at_the_address_less_ten(self):
        ours = keys._listing(self.c350, keys.BASE, PIN_ROUTINE_350, 60)
        theirs = keys._listing(self.c300, keys.BASE, PIN_ROUTINE_300, 60)

        def mask(lines):
            # A branch's target moves with the shift of the place it points at, so compare the mnemonic.
            return [line.split()[0] if line.split()[0] in ('BZ', 'BNZ', 'BRA', 'CALL', 'GOTO', 'RCALL') else line
                    for line in lines]
        self.assertEqual(mask(ours), mask(theirs))

    def test_the_start_up_code_calls_it_for_pins_0_to_3(self):
        listing = keys._listing(self.c350, keys.BASE, 0xDDE8, 20)
        self.assertEqual([l for l in listing if l.startswith('MOVLW')], ['MOVLW 0x01', 'MOVLW 0x02', 'MOVLW 0x03'])
        self.assertEqual(listing[0], 'CLRF 0xbd,B')
        self.assertEqual(len([l for l in listing if l.startswith('CALL 0x14568')]), 3)


if __name__ == '__main__':
    unittest.main()
