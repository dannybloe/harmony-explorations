#!/usr/bin/env python3
"""Which infrared group a device takes on the Harmony 300 and 350, and which key event picks it.

`todo-compile-350.md` 2.3. On the Harmony 300 a device's infrared group is the device key it was put
on, TV 0, Cable/Sat 1, DVD 2 and VCR/Aux 3, section 265, which identified all four groups of a
configuration with one device per key in Logitech's catalogue
(`packages/codec/test/catalogue.test.ts`, "a Harmony 300 device group is indexed by its device type
button"). The Harmony 350 has eight devices on the same four keys, a short press and a two second press
each, and nothing said which group either takes. This file answers the short press and says exactly why
the long press stays open.

## The answer

* **Nothing in the key path picks a group.** A key press reaches the configuration as a key event, which
  the key table looks up, and a device key's binding selects the entry of base slot 9 its operand names,
  with `0x1F` band `0xFF`, `tests/test_harmony_350_slots.py`. The group is whatever that entry's lists send, so which group a
  device gets is the compiler's choice, stated per configuration, and the question is a measurement over
  configurations rather than a reading of code.
* **The compiler gives a device the group of the key position it sits on, on both models.** The device
  keys bind scan codes 5, 1, 7 and 4, and the map each one selects sends from group 0, 1, 2 and 3
  respectively, on every device key of every configuration that binds one: 14 bindings over the five
  configurations select a map with codes and all 14 agree, and the other 2 select an empty map, which
  belongs to the one device with no infrared commands. The order 5, 1, 7, 4 was read off the four device
  Harmony 300 file, so 4 of the 14 are where it came from; the three Harmony 350 files, which played no
  part in choosing it, agree on 8 of 8, with both empty maps theirs. On a Harmony 300 the four scan codes are the keys printed TV, Cable/Sat, DVD and
  VCR/Aux, from which device was put on which key (section 265). The 350 is the same moulding with
  different printing and runs the same image, so the same four codes are the keys printed `TV/Media`,
  `Cable/PC`, `AVR/Game` and `DVD/Music`: **a short press of each takes group 0, 1, 2 and 3**.
* **On the 350 a short press is the key's release.** The 1.4 image's keypad routine queues the held key's
  scan code with one of three event types: press `0x80 | scan`, release `0x40 | scan`, and held
  `0xC0 | scan`, which fires once when the key has been down for the hold time and is followed by no
  release (this called it repeat until `tests/test_harmony_350_long_press.py` read the hold); everything else the image queues as a key event is a fixed code, not a held key's. A Harmony 300's device key
  selects its device on the **press**; a Harmony 350's selects it on the **release**, and its press only
  switches one output pin and starts two timers. That is consistent with a key whose held action has to be
  told from a short one, which cannot be decided before the key comes up; how it is told is the hold,
  `tests/test_harmony_350_long_press.py`.
* **The long press, on one file.** Groups 4 to 7 are allocated on every Harmony 350 configuration and
  empty on all five read here, none of which has a device on a long press. Another owner's Harmony 350
  configuration, `h350_issue37_config`, read by `tests/test_harmony_350_long_press.py`, has two: the top
  right key's long press device sends from group 5, `4 + place`, and the bottom left key's is the top
  right key's short press device, keeping its group 1. This said the long press was not settled until
  that file was read; one file is one sample, so the rule stands on it alone.

## What was traced, on the 1.4 image (`h350_code`, load base `0x9000`)

* **A key event is queued as an instruction.** `0x10FC4` appends three bytes to the action queue: the
  code in `0x29C`, then `0xFC`, then `0x1F`, so `0x1F` band `0xFC` with the code as operand. The
  dispatcher (`0x111EE`) sends `0x1F` band `0xFC` to the key lookup at `0x1113A` with the code in `0x2A8`,
  the walk base slot 9's stack does, `tests/test_harmony_350_slots.py`.
* **Seven calls queue an event, and four carry a scan code.** The keypad routine keeps the held key's
  code in `0x711` and queues it ORed with `0x80` when a key goes down (`0x18B4A`), with `0x40` when it
  comes up (`0x18B84` and `0x18BCE`, the two ways a held key can end), and with `0xC0` when the
  flag `0x315` is up, the hold time having run out (`0x18AEA`). The other three queue fixed codes rather than the held key's: `0x28`,
  `0x27` or `0x26` (`0x145E6`, `0x14604`) and `0x30` or `0xFF` through `0x10FE2` (`0x11EE0`). The first
  four are event type 0, the codes that are not keypad events, and every configuration binds four of that
  kind in its key table, `0x2D` to `0x30`; `0xFF` reads as event `0xC0` with scan 63, and what it is for
  is not read. A gate, `0x11266` with `0x2AA` set to 1, can skip a press or a release, and what it tests
  is not read either. Only direct calls of `0x10FC4` were followed: a computed jump was not excluded.
* **The press arms the hold, and the release is only queued after a press.** After the press is queued,
  `0x200 * 100` goes to `0x316`, and `0x1959E` copies it into the countdown `0x312` and sets `0x314`; the
  release is queued only while `0x314` is set, and `0x19592` clears both. What decrements the countdown
  and raises `0x315` is not located: no direct write sets either, so it is indirect.

Negative results. No direct caller queues the held key's code with an event type other than the three,
so the keypad raises no event of its own for a long press beyond the held `0xC0`. This said it raised
no long press event at all, which was right about the event types and wrong about `0xC0`, read as a
repeat until the hold was read in `tests/test_harmony_350_long_press.py`. The image was not searched for a test of the skin, so whether the 300 and 350
behave differently anywhere in the key path is not read; nothing in what follows needs it, since both
models' differences show up in the configurations.

## What the configurations state

Over the five configurations (`h350_config`, `h350_programmed_config`, `h350_three_devices_config`,
`h300_config`, `h300_programmed_config`), entry 0 of raw slot 6, the key table, holds one binding per
device key that selects a device's map, as the slots test shows. Per configuration, the scan code of that
binding against the group the selected map sends from (a map may also send a few of group 0's codes and
nothing else; its own group is the one other than 0, or 0 when it has none):

| configuration | scan 5 | scan 1 | scan 7 | scan 4 | event |
|---|---|---|---|---|---|
| Harmony 350, factory | 0 | 1 | | 3 | release |
| Harmony 350, four devices | 0 | 1 | 2 | empty map | release |
| Harmony 350, three devices | 0 | 1 | | empty map | release |
| Harmony 300, as found | 0 | 1 | | | press |
| Harmony 300, four devices | 0 | 1 | 2 | 3 | press |

The empty maps are the Chromecast's, the one device with no infrared commands
(`packages/codec/test/filefamilydelays.test.ts` names groups 0, 1 and 2 of the four device file TV, KPN
and PS). The bench Harmony 350's own file, as the backup before its first write read it,
puts the LG television on scan 5 and group 0 and the Denon receiver on scan 7 and group 2,
with group 1 empty; the last test reads it by its path when the lab has it.

**Each device key switches the same pin on both models.** The binding that switches it, the 300's
selecting press and the 350's press, switches output pin `(operand >> 4) & 0xF` of `0x1F` band `0xE9`:
scan 5 pin 0, scan 7 pin 1, scan 1 pin 2, scan 4 pin 3, on every configuration. That is consistent with
the four codes being the same four keys on both models, and does not prove which key is printed what.

**On the 350 each device key's press starts two timers**, records of 400 and 600 units whose instruction
is the same `0x1F` band `0xE9` on that key's pin: the press sets the pin one way (`0xE9n2`), the 400 unit
timer the other (`0xE9n0`) and the 600 unit timer back. Neither the timer's unit nor what the pins drive
is checked.

## What it rules out

* **A position in the device list.** Section 265 already showed the archive's order is alphabetical on
  the 300; here the factory 350 holds groups 0, 1 and 3 with 2 empty, and the bench 350's file 0 and 2
  with 1 empty, so groups are not filled from 0 in any order.
* **An interleaved short and long, `2 * key + long`.** That puts the Cable/PC key's short press in group
  2; it is in group 1 on all three 350 files that bind it.
* **The 350 numbering its eight groups differently from the 300's four.** Every short press group is the
  300's group for the same key.

## What would settle the long press

This was written before the issue 37 file was read, which settles it on one sample in favour of
`4 + key`, above. Three rules fitted the five files equally and differed in where it goes: `4 + key` (TV/Media 4 to DVD/Music 7), the lowest group no short press uses, or interleaving only
the long ones. A compile through Logitech's service onto a 350 that puts **a device on the TV/Media key's
short press, a second on Cable/PC's long press and a third on AVR/Game's long press, with nothing on
either short press of those two keys**, separates them: `4 + key` gives the two long press devices groups
5 and 6, the lowest unused group gives 1 and 2, and any interleaving gives 3 and 5. The same file shows how
the long press is stored, `todo-compile-350.md` 2.4: which event and which binding select the second
device.

A bench check settles the one inference above, that scan 7 is the key printed `AVR/Game` on a 350:
with the bench 350's current file, a short press of `AVR/Game` and then any key should send the Denon's
code, and a short press of `TV/Media` the LG's. No write is needed.

**Sources checked first.** Logitech's client, `../lab/work/myharmony/src/`: its button mapping model
holds, per device key, one `UserModeMappingInfo` with a `Mode` (`ModeTV`, `ModeCable`, `ModeDVD`,
`ModeAux`) and a `ShortPressActionDeviceId` and a `LongPressActionDeviceId`, and its device mode page for
the 350 offers a short and a long device on each of the four keys. So a device key is a mode with two
device slots, stated by Logitech, in their client; the client compiles nothing, so the group each slot
gets is the service's and not visible there. The skin 104 protocol templates are about the transfer and
name no mode or group. The firmware, above. The archive: sections 17 (the event split), 259 and 261 (the
key table and the send operand's group byte), 262 to 265 (the 350's and 300's device to group
identifications and the device type button), 278 (the send pair). The reference: this family's
`memory.md`, both models' `keys.md` and `memory.md`, and `reference/config-format/modes-and-keys.md`. The
library: `devices` in `packages/codec/src/inventory.ts`, which names each group of this family from its
`Power` variable, the source of the device names quoted above.

**Which architectures.** Arch 16 alone, both of its models: the firmware read is the one 1.4 image,
which Logitech's package names for skins 78, 79 and 104; the configurations are three Harmony 350s and
two Harmony 300s. The 350's printed key for each scan code rests on the shared moulding and was not
pressed on a 350.

**Standing.** Read in the firmware, and measured in configurations, with the 300's key identities a
person's statement of where each device was put; the bottom left and top left keys measured on a Harmony
350 with the receiver, `TheBench350SelectsByPlace`.
"""
import os
import unittest

import lab
from test_harmony_350_slots import BASE, CONFIGS, HARMONY_350, _Config, _code, _configs, _text
from harmony.pic18 import trace

QUEUE_KEY_EVENT = 0x10FC4
KEY_DOWN = 0x18B4A
KEY_UP = (0x18B84, 0x18BCE)
KEY_HELD = 0x18AEA
ARM_RELEASE = 0x1959E
DISARM = 0x19592

#: The scan code each device key binds, in the order of the keys on the remote, from the Harmony 300's
#: device to key statement, section 265: TV, Cable/Sat, DVD, VCR/Aux on a 300; TV/Media, Cable/PC,
#: AVR/Game, DVD/Music on a 350. The position is the group.
DEVICE_KEYS = (5, 1, 7, 4)
#: The output pin each device key's binding switches, by scan code. What the pins drive is not checked.
PIN = {5: 0, 7: 1, 1: 2, 4: 3}

PRESS, RELEASE = 0x80, 0x40

#: The bench Harmony 350's own configuration as the backup before its first write read it, four bytes
#: short of a container as every read of this family is. Read by path rather than registered as a
#: fixture, so it stays out of every population the fixture tables feed.
BENCH_READ = ('reads', '20261027T1700Z-h350-backup', 'cfg_usercfg.bin')


def _own_group(c, entry):
    """The group a device's map sends from: the one other than group 0, or 0, or None when empty."""
    groups = c.sends([(op, opc) for _, _, op, opc in c.tagged(c.array(6)[entry])])
    others = groups - {0}
    if len(others) > 1:
        raise AssertionError('map %d sends from %s' % (entry, sorted(groups)))
    if others:
        return others.pop()
    return 0 if groups else None


def _device_keys(c):
    """Entry 0's bindings that select a device's map, as {scan: (event, entry)}."""
    out = {}
    for _, tag, operand, opcode in c.tagged(c.array(6)[0]):
        if opcode != 0x7F:
            continue
        body = c.action_list(operand)
        picks = [op & 0xFF for op, opc in body if opc == 0x1F and op >> 8 == 0xFF]
        busy = [opc for op, opc in body if opc in (0x7F, 0x7D, 0x7C) or opc >= 0x80]
        if picks and not busy:
            assert tag & 0x3F not in out, 'two bindings select for scan %d' % (tag & 0x3F)
            out[tag & 0x3F] = (tag & 0xC0, picks[0])
    return out


def _bindings_of(c, scan):
    """Every binding of entry 0 for one scan code, as {event: action list}."""
    return {tag & 0xC0: c.action_list(operand) for _, tag, operand, opcode in c.tagged(c.array(6)[0])
            if tag & 0x3F == scan and opcode == 0x7F}


class TheImageRaisesPressReleaseAndHeldOnly(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_a_key_event_is_queued_as_0x1f_band_0xfc(self):
        self.assertEqual(_text(self.code, QUEUE_KEY_EVENT, 13)[3:],
                         ['MOVFF 0x29c,0x29b', 'RCALL 0x10eba', 'MOVLB 0x2', 'MOVLW 0xfc', 'MOVWF 0x29b',
                          'RCALL 0x10eba', 'MOVLB 0x2', 'MOVLW 0x1f', 'MOVWF 0x29b', 'RCALL 0x10eba'])

    def test_the_keypad_queues_the_held_code_with_one_of_three_event_types(self):
        queue = ['MOVLB 0x7', 'IORWF 0x711,W', 'MOVLB 0x2', 'MOVWF 0x29c', 'CALL 0x10fc4']
        self.assertEqual(_text(self.code, KEY_DOWN, 6), ['MOVLW 0x80'] + queue)
        for at in KEY_UP:
            self.assertEqual(_text(self.code, at, 6), ['MOVLW 0x40'] + queue)
        self.assertEqual(_text(self.code, KEY_HELD - 6, 9),
                         ['MOVLB 0x3', 'MOVF 0x315,W', 'BZ 0x18afc', 'MOVLW 0xc0'] + queue)

    def test_the_other_three_callers_queue_fixed_codes(self):
        callers = sorted(r.addr for r in trace.xrefs(self.code, BASE, [QUEUE_KEY_EVENT])[QUEUE_KEY_EVENT])
        self.assertEqual(callers, [0x10FEE, 0x145E6, 0x14604, 0x18AF4, 0x18B54, 0x18B8E, 0x18BD8])
        # The four with the held key's code are the calls in the listings above.
        for at in (KEY_DOWN, KEY_UP[0], KEY_UP[1], KEY_HELD):
            self.assertIn(at + 10, callers)
            self.assertEqual(_text(self.code, at + 10, 1), ['CALL 0x10fc4'])
        # The other three queue literals: 0x28, then 0x27 or 0x26...
        self.assertEqual(_text(self.code, 0x145E0, 4),
                         ['MOVLB 0x2', 'MOVLW 0x28', 'MOVWF 0x29c', 'CALL 0x10fc4'])
        self.assertEqual(_text(self.code, 0x145F8, 7),
                         ['MOVLB 0x2', 'MOVLW 0x27', 'BRA 0x14602', 'MOVLB 0x2', 'MOVLW 0x26',
                          'MOVWF 0x29c', 'GOTO 0x10fc4'])
        # ...and 0x30 or 0xFF through 0x10FE2, which one call reaches.
        self.assertEqual([r.addr for r in trace.xrefs(self.code, BASE, [0x10FE2])[0x10FE2]], [0x11EE0])
        self.assertEqual(_text(self.code, 0x11ED0, 9),
                         ['MOVLB 0xc', 'MOVLW 0x30', 'MOVWF 0xc19', 'BRA 0x11edc', 'MOVLB 0xc',
                          'SETF 0xc19', 'MOVFF 0xc19,0x29d', 'CALL 0x10fe2', 'IORLW 0x00'])
        self.assertEqual(_text(self.code, 0x10FEA, 2), ['MOVFF 0x29d,0x29c', 'RCALL 0x10fc4'])

    def test_the_press_arms_the_release_and_the_release_needs_it(self):
        self.assertEqual(_text(self.code, KEY_DOWN + 14, 6),
                         ['MOVLB 0x2', 'MOVF 0x200,W', 'MULLW 0x64', 'MOVFF PRODL,0x316',
                          'MOVFF PRODH,0x317', 'GOTO 0x1959e'])
        self.assertEqual(_text(self.code, ARM_RELEASE, 6),
                         ['MOVLB 0x3', 'MOVLW 0x01', 'MOVWF 0x314', 'CLRF 0x315', 'MOVFF 0x316,0x312',
                          'MOVFF 0x317,0x313'])
        for at in KEY_UP:
            # The branch lands at at + 14, the instruction after the four byte CALL at at + 10, so a
            # clear 0x314 skips the queueing.
            self.assertEqual(_text(self.code, at - 20, 3), ['MOVLB 0x3', 'MOVF 0x314,W',
                                                            'BZ 0x%x' % (at + 14)])
            self.assertEqual(_text(self.code, at + 10, 1), ['CALL 0x10fc4'])
        self.assertEqual(_text(self.code, DISARM, 5),
                         ['MOVLB 0x3', 'CLRF 0x314', 'CLRF 0x315', 'CLRF 0x312', 'CLRF 0x313'])


class TheDeviceKeysInTheConfigurations(unittest.TestCase):
    def test_a_300_selects_on_the_press_and_a_350_on_the_release(self):
        events = {}
        for c in _configs():
            events[c.name] = sorted({event for event, _ in _device_keys(c).values()})
        self.assertEqual(events, {'h350_config': [RELEASE], 'h350_programmed_config': [RELEASE],
                                  'h350_three_devices_config': [RELEASE], 'h300_config': [PRESS],
                                  'h300_programmed_config': [PRESS]})

    def test_the_device_keys_are_the_same_four_scan_codes_on_both_models(self):
        scans = {c.name: sorted(_device_keys(c)) for c in _configs()}
        self.assertEqual(scans, {'h350_config': [1, 4, 5], 'h350_programmed_config': [1, 4, 5, 7],
                                 'h350_three_devices_config': [1, 4, 5], 'h300_config': [1, 5],
                                 'h300_programmed_config': [1, 4, 5, 7]})
        per_model = {}
        for name, found in scans.items():
            per_model.setdefault(name[:4], set()).update(found)
        self.assertEqual(per_model, {'h350': set(DEVICE_KEYS), 'h300': set(DEVICE_KEYS)})

    def test_each_scan_code_selects_the_group_of_its_place_in_the_300s_order(self):
        found = {}
        for c in _configs():
            found[c.name] = {scan: _own_group(c, entry) for scan, (_, entry) in _device_keys(c).items()}
        self.assertEqual(found, {
            'h350_config': {5: 0, 1: 1, 4: 3},
            'h350_programmed_config': {5: 0, 1: 1, 7: 2, 4: None},
            'h350_three_devices_config': {5: 0, 1: 1, 4: None},
            'h300_config': {5: 0, 1: 1},
            'h300_programmed_config': {5: 0, 1: 1, 7: 2, 4: 3},
        })
        # One rule over all of them: the group is the key's position, wherever the map has codes.
        agree = sum(1 for groups in found.values() for scan, group in groups.items()
                    if group == DEVICE_KEYS.index(scan))
        empty = sum(1 for groups in found.values() for group in groups.values() if group is None)
        self.assertEqual((agree, empty), (14, 2))
        # And on the Harmony 350 alone, which played no part in reading the order off the 300.
        agree = sum(1 for name in HARMONY_350 for scan, group in found[name].items()
                    if group == DEVICE_KEYS.index(scan))
        empty = sum(1 for name in HARMONY_350 for group in found[name].values() if group is None)
        self.assertEqual((agree, empty), (8, 2))

    def test_the_empty_maps_belong_to_the_one_device_with_no_commands(self):
        for c in _configs():
            with self.subTest(c.name):
                empty = sum(1 for _, entry in _device_keys(c).values() if _own_group(c, entry) is None)
                self.assertEqual(empty, c.archive_devices().count(0))

    def test_each_scan_code_switches_the_same_pin_on_both_models(self):
        lit = {}
        for c in _configs():
            for scan in _device_keys(c):
                bindings = _bindings_of(c, scan)
                # The 300 switches it in the binding that selects, the 350 in the press.
                pins = {(op >> 4) & 0xF for op, opc in bindings[PRESS] if opc == 0x1F and op >> 8 == 0xE9}
                self.assertEqual(len(pins), 1, '%s scan %d' % (c.name, scan))
                lit.setdefault(scan, set()).update(pins)
        self.assertEqual(lit, {scan: {pin} for scan, pin in PIN.items()})

    def test_a_350s_press_starts_two_timers_on_its_own_pin_and_selects_nothing(self):
        lab.require(*HARMONY_350)
        for name in HARMONY_350:
            c = _Config(name)
            timers = c.array(8)
            for scan in _device_keys(c):
                with self.subTest(name, scan=scan):
                    press = _bindings_of(c, scan)[PRESS]
                    self.assertEqual([op >> 8 for op, opc in press if opc == 0x1F and op >> 8 == 0xFF], [])
                    pin = PIN[scan] << 4
                    self.assertEqual([op for op, opc in press if opc == 0x1F and op >> 8 == 0xE9],
                                     [0xE902 | pin])
                    started = [op & 0xFF for op, opc in press if opc == 0x1F and op >> 8 == 0xEB]
                    self.assertEqual(len(started), 2)
                    records = sorted((c.u(timers[i] + 1, 3), c.u(timers[i] + 4, 2)) for i in started)
                    self.assertEqual(records, [(400, 0xE900 | pin), (600, 0xE902 | pin)])

    def test_a_device_key_binds_only_its_press_and_release_and_no_list_sends_from_groups_4_to_7(self):
        for c in _configs():
            with self.subTest(c.name):
                for scan in _device_keys(c):
                    self.assertLessEqual(set(_bindings_of(c, scan)), {PRESS, RELEASE})
                sent = {op >> 8 for op, opc in c.instructions() if opc == 0x7D}
                self.assertEqual(sent - {0, 1, 2, 3}, set())

    def test_an_interleaved_numbering_would_put_cable_in_group_2(self):
        # The control: `2 * key + long` is the obvious other way to number eight devices on four keys,
        # and it is wrong on every Harmony 350 file that binds the second key.
        lab.require(*HARMONY_350)
        checked = 0
        for name in HARMONY_350:
            c = _Config(name)
            keys = _device_keys(c)
            self.assertEqual(_own_group(c, keys[1][1]), 1)
            self.assertNotEqual(_own_group(c, keys[1][1]), 2 * DEVICE_KEYS.index(1))
            checked += 1
        self.assertEqual(checked, 3)

    def test_occupied_groups_are_not_filled_from_0(self):
        occupied = {}
        for c in _configs():
            occupied[c.name] = sorted(g for g in (_own_group(c, e) for _, e in _device_keys(c).values())
                                      if g is not None)
        self.assertEqual(occupied, {'h350_config': [0, 1, 3], 'h350_programmed_config': [0, 1, 2],
                                    'h350_three_devices_config': [0, 1], 'h300_config': [0, 1],
                                    'h300_programmed_config': [0, 1, 2, 3]})


class TheBench350sOwnFile(unittest.TestCase):
    def test_the_television_on_the_first_key_and_the_receiver_on_the_third(self):
        if not lab.LAB or not os.path.isfile(os.path.join(lab.LAB, *BENCH_READ)):
            raise unittest.SkipTest('the bench Harmony 350 backup read is not in the lab')
        c = _Config.__new__(_Config)
        c.name = 'bench'
        with open(os.path.join(lab.LAB, *BENCH_READ), 'rb') as handle:
            c.blob = handle.read()
        # The read is identified by what it holds: two devices, 118 and 63 commands.
        self.assertEqual(c.archive_devices(), [118, 63])
        keys = _device_keys(c)
        self.assertEqual({scan: (event, _own_group(c, entry)) for scan, (event, entry) in keys.items()},
                         {5: (RELEASE, 0), 7: (RELEASE, 2)})


class TheBench350SelectsByPlace(unittest.TestCase):
    """The receiver run of 2.3: the bottom left key gives the Denon, the top left the LG, on a 350.

    With the bench 350 holding the file above, AVR/Game then Volume Up sent the Denon's VolumeUp and
    TV/Media then Volume Up the LG's; Cable/PC, which the file binds nothing to, left the remote in the
    LG's mode, so Volume Up after it was the LG's again. So scans 7 and 5 are the bottom left and top left
    keys on a Harmony 350 itself, where above they rested on the 300's order; the top right and bottom
    right keys are still taken from the 300, since this file binds neither.
    """

    @staticmethod
    def _heard(step):
        out = []
        for press in step['presses']:
            names = [(m['device'], m.get('command')) for m in press['frame']['matches']
                     if m['config'] == 'work/350-delay/before.bin']
            out.append(names[0] if names else None)
        return out

    def test_each_device_key_selected_the_device_of_its_place(self):
        import json
        lab.require('h350_device_keys_ir')
        run = json.loads(lab.load('h350_device_keys_ir'))
        self.assertEqual(run['name'], 'Harmony 350, which device each device key selects')
        heard = [self._heard(step) for step in run['steps'][:3]]
        self.assertEqual(heard, [[('Denon_AV_Receiver', 'VolumeUp')], [('LG_TV', 'VolumeUp')],
                                 [('LG_TV', 'VolumeUp')]])


if __name__ == '__main__':
    unittest.main()
