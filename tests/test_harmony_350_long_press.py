#!/usr/bin/env python3
"""The Harmony 300 and 350's long press: how the 1.4 firmware times a held key, and how a device key uses it.

`todo-compile-350.md` 2.4. Logitech's setup guide says each of the Harmony 350's four device keys holds
one device on a short press and can hold a second on "a longer two second press"; the Harmony 300 has no
long press. The question was where a configuration stores that a key has a second device, how the
firmware times the press and selects it, and what a key with only one device does on a long press.

## What was established

**The firmware has a long press of its own, and it is one of two endings.** A key raises three events,
the three of section 17: press (`0x80`), release (`0x40`) and the event the reference calls repeat
(`0xC0`), here called **the held event**, since on this image it fires once and never repeats. A press
starts one hold counter, and the press then ends in exactly one of the other two: let go while the
counter runs and the remote raises the release; hold it until the counter runs out and it raises the
held event, after which the release is never raised. So "short press" and "long press" are the release
and the held event, told apart by the firmware and not by the configuration.

**The hold time is a parameter the configuration sets**, parameter 0, written by `0x3F` band `0xF0`, and
the counter is that parameter times 100 ticks. The image starts it at 10 and every configuration read
sets it to 10 again at start, so the hold is 1001 ticks; by the tick that paces the power on delay,
which a receiver measured, that is about **one second**, half the two seconds the guide states.

**Selecting a key map ends the hold.** `0x1F` band `0xFF`, and the stack bands `0xFE` and `0xFD`, call a
routine that clears the hold counter, so a binding that selects a map on the press leaves no release
and no held event to follow.

**Where the second device is stored: the held event, in entry 0.** A Harmony 350 configuration another
owner posted, `h350_issue37_config`, gives two of its four device keys a second device, and each is a
binding of `0xC0 | scan` in raw slot 6's entry 0, `07 FFFB` then `1F FFnn`, beside the key's release
binding, which selects the first device the same way. It sets parameter 0 to 10 like every other file,
so its long press selects after about a second. Each press group of a key with two devices is emitted
once per device, and its timer table holds two records per key assignment, twelve for six assignments
of five devices, one device being on two keys.

**On the configuration side the two models differ, and the firmware does not.** On all four Harmony 350
configurations a device key's first device is selected by the **release**, and its press only switches
one of the four output pins and starts timers of 400 and 600 ticks. On both Harmony 300 configurations
the press selects, which by the paragraph above also ends the hold. **No configuration binds the held
event of a key with one device**, so on a Harmony 350 key with one device a press held past the hold
time selects nothing: the release that would select its device is never raised. That answers the open
question on the model's behaviour page by reading; it was not watched on a unit.

## What was traced, on the 1.4 image (`h350_code`, load base `0x9000`)

* **The events.** The scan code of the key down sits in `0x711`, and four instructions OR an event type
  onto it and hand it to `0x10FC4` through `0x29C`: `0xC0` at `0x18AEA`, `0x80` at `0x18B4A`, and
  `0x40` at `0x18B84` and `0x18BCE`, the last for the old key when a new one goes down without a
  release between. They are the only `IORWF 0x711,W` behind `MOVLB 7` in the image. The image's
  three other raisers of an event take no scan code from `0x711`: two load the event type 0 codes
  `0x26` to `0x28` (`0x145E4`, `0x14602`), and one copies a code from `0x29D` (`0x10FEA`), whose
  writer at `0x11EDC` was not followed. `0x10FC4` pushes the code, `0xFC`
  and `0x1F` onto the action queue, which is how every architecture's firmware raises its own events,
  section 104; the fetch at `0x111D6` recognises `0x1F` band `0xFC` and gives the code to the key map
  walk at `0x1113A` in `0x2A8` instead of the dispatcher, and the walk stops at the first map on the
  stack that binds the code, `tests/test_harmony_350_slots.py`.
* **The hold counter** is four bytes in bank 3: `0x312` and `0x313` the count, `0x314` running and
  `0x315` run out, with its reload in `0x316` and `0x317`. The press path, `0x18B30`, sets the reload to
  `[0x200] * 100` (`MOVF 0x200,W ; MULLW 0x64`) and `0x1959E` starts the counter, `0x314 = 1`. Those
  are the reload's only writers, and nothing in the path compares the scan code, so every key has the
  same hold, unlike the Harmony 650, whose Help key has a longer one of its own, section 340.
* **The tick.** `0x1963E` takes the difference of timer 3 since the last call into `0xC02`; two
  accumulators turn it into ticks of 1000 counts each, one at `0x304` and one at `0x30F`; the second
  serves the hold counter and the keypad's own counter at `0x30C`. Per tick of the first, `0x329` counts down from 100 and sets `0x328`,
  and `0x12A64` runs the pass that counts the power on delay down, `0x12624`, once per `0x328`
  (`tests/test_harmony_350_delay.py`); the same loop calls `0x16D72`, which takes one from every
  running timer of the configuration's timer table whose slot was started as kind 0: the start sets
  bit 4 of the slot for kind 1 (`0x16ADE`) and clears it for kind 0 (`0x16B52`), and the pass skips a
  slot with bit 4 set (`0x16D12`). Per tick of the second, while `0x314` is set
  and `0x315` clear, the count is decremented as a `u16`, and when it passes zero the routine sets
  `0x315` **and clears `0x314`**, `0x1971A` and `0x1971C`. So a reload of 1000 runs out on the 1001st
  tick, and once only: the counter stops.
* **The held event**, `0x18AE4`: when `0x315` is set it raises `0xC0 | scan` and clears `0x315`.
* **The release**, `0x18B6A` and `0x18BB4`: raised only while `0x314` is set, then `0x19592` clears all
  four bytes. `0x314`'s other clear, `0x18B28`, is the keypad's own check that no key is down, behind
  bit 3 of `0x08A`, which `0x12A30` sets; the routine around that was not followed further. So
  after the held event no release follows, and a release means the hold did not run out.
* **What ends a hold from a configuration.** `0x19592` is reached from the keypad (`0x18B92`, `0x18BDC`),
  the tick's start (`0x19628`), and `0x18926`, which `0x11026` calls first thing. `0x11026` is called
  after `0x1F` band `0xFF` selects an entry (`0x1189E` then `0x118C4`), after bands `0xFE` and `0xFD`
  push and pop the stack, and by opcode `0x7E` (`0x11348`), and from nowhere else.
* **Parameter 0.** `0x3F` with an operand high byte of `0xF0` or more (`0x117C4`) puts the high byte's
  low nibble in `0x2AE` and the low byte in `0x2AF` and calls `0x112B6`, whose chain sends 0 to
  `0x200`, 6 to `0x201` and 7 to `0x202` and ignores 1 and 2. The start at `0x10F7C` writes 10 to
  `0x200` and 50 to `0x201`, the Harmony 650's two values, section 340. A third writer, `0x0DA9A`, sits
  in the USB service and was not followed.
* **`0x07` operand `0xFFFB`** (`0x11CA4`) calls `0x16C66`, which clears the running bit of all four
  timer slots: the cancel both of a Harmony 350 device key's bindings open with.

## The tick, against the receiver

The hold counter's ticks and the power on delay's ticks are the same 1000 counts of timer 3, so the
receiver's measurement of the delay fixes the hold. `tests/test_harmony_350_delay.py` heard a wait of
30 units as 3.174 s and of 100 as 10.205 s; seventy units are 7.031 s, so a unit is 100.44 ms and a tick
1.0044 ms, and 1001 ticks are 1.005 s. Nothing here measured the hold itself. The clock register setup
was not used to derive the tick, since the processor part and its configuration words are not checked.

## What the configurations hold

Read over the six configurations of this family: `CONFIGS` in `tests/test_harmony_350_slots.py`, three
of the bench Harmony 350 and two of one Harmony 300, and `h350_issue37_config`, another owner's Harmony
350, a ZIP whose `Result.EzHex` is the container. That file was already in the lab and was first read
here by the second reviewer of this finding; the first draft said no configuration in the lab
holds a long press, from the five alone, and proposed a compile to find out.

| | Harmony 350, four files | Harmony 300, two files |
|---|---|---|
| a key's first device | the release, `0x40 | scan`: `07 FFFB` then `1F FFnn` | the press, `0x80 | scan`: `1F E9p2` then `1F FFnn` |
| a key's second device | the held event, `0xC0 | scan`: `07 FFFB` then `1F FFnn`, on scans 1 and 7 of the issue 37 file (the top right and bottom left keys; the printing on the keys differs between units) | none |
| a device key's press | per device on the key, `07 FFFB`, `1F E9p2` and two `1F EB` starts, whose records are 400 ticks to `E9p0` and 600 to `E9p2` | the first device's binding |
| scan codes | 1, 4, 5 on the two files with three devices, 1, 4, 5, 7 on the others | 1, 5 and 1, 4, 5, 7 |
| parameter 0 at start | `3F F00A`, 10 | `3F F00A`, 10 |

The pin a key's bindings switch is the same per scan code on both models: 1 switches pin 2, 4 pin 3, 5
pin 0 and 7 pin 1. The guide says each device key lights while a code is sent, and four pins for four
keys fits that; what the pins drive is still not checked. A kind 0 timer counts the tick above, so the
two timers are 0.40 and 0.60 s, one pulse of the pin, which settles the unit the family's memory page
listed as unread. A key with two devices carries its press group twice, and the second group's
`07 FFFB` cancels the timers the first started, since `0x16C66` clears all four slots; that the light
then runs one pulse is read, not watched.

In the issue 37 file one map is selected twice, by scan 1's release and scan 7's held event, so one
device is on two keys; every other map is selected once. Nothing in the client's record forbids it: a
key's short and long devices are two fields of one record per key, below.

## What is not settled

* Whether a person meets the long press after about one second, as the firmware and every file read
  say, or after the two the guide states; a unit with a long press device would show it.
* That a long press on a key with one device leaves the mode as it was, which is read and not watched.
* The long press encoding rests on one file of one owner, two keys in it; the firmware reading is why it
  works, and a compile of a long press for the bench 350 would be a second sample.

**Sources checked first.** Logitech's client: `UserModeMappingInfo` in
`work/myharmony/src/Web.Data.HarmonyPlatform/`, the service's record per device key, holds a
`ShortPressActionDeviceId` and a `LongPressActionDeviceId` for each of four modes, TV, Cable, DVD and
Aux, and `DeviceModeMapViewModel` lets the long one be left empty and copies a lone long device into the
short one. The client builds no configuration, so how the service compiles the long device is not in
it. The archive: sections 17 (the event types), 104 (`0x1F` band `0xFC`), 340 (the Harmony 650's keypad,
the same three events and the same `0x200 * 100`), 145 and 265 (the family's devices and activity). The
reference: `reference/config-format/modes-and-keys.md` and `state.md`, this family's `memory.md` and
`firmware.md`, and the Harmony 350's `behaviour.md`. The lab: the guide in `Docs/350 manual.pdf`, whose
wording is quoted above, and, late, the contributed configurations under `dumps/`, where the issue 37
file was; the lab register lists that folder as catalogued and nothing in this repository had read the
file.

**The two reviewers.** A blind re-measurement, given the questions and the five bench files, found the
same four raisers, the same hold counter, that the held event fires once and leaves no release, the
same parameter 0 at 10 in all five, that a select or a stack move ends the hold, and that a 350 key with
one device held two seconds selects nothing; it also read that `0x11026` drops queued key events from
the action queue, which this file does not assert. It saw three lines of this answer by accident before
it started, and said so. The prose audit found the issue 37 file, which killed the first draft's "no
configuration binds the held event" and its two candidate encodings, and narrowed: "does nothing" to
"selects nothing", a pin switched "back and forth" to one pulse, the hold counted at the decrement and not
the accumulator, a third writer of parameter 0 named on the reference page, the 300 scoped to the image
both run, a test title that did not tie the pass to kind 0, and an exact remainder that was arithmetic
rather than a measurement.

**Which architectures.** Arch 16 alone: the one 1.4 image, read here as the Harmony 350's (`h350_code`),
which Logitech's package names for skins 78, 79 and 104, so the Harmony 300 runs the same keypad and
hold; its configurations bind the press instead, which is a difference of configuration and not of
firmware. The Harmony 650's 0.2 build has the same three events and the same reload, section 340;
whether its counter also stops after the held event is not read, and no other image was checked.

**Standing.** Read in the firmware and measured in configurations, the long press encoding in one, with
the tick taken from a unit's measured delay. Nothing was sent to a remote.
"""
import io
import unittest
import zipfile

import lab
import test_harmony_350_delay
from harmony.pic18 import chains, trace
from test_harmony_350_slots import BASE, CONFIGS, _Config, _code, _text, _writes

EVENT_QUEUE = 0x10FC4
HELD_RAISE = 0x18AE4
PRESS_PATH = 0x18B30
RELEASE_PATH = 0x18B6A
RELEASE_ON_CHANGE = 0x18BCE
HOLD_START = 0x1959E
HOLD_CLEAR = 0x19592
TICK_HOLD = 0x196D8
END_HOLD = 0x11026
PARAMETER_BAND = 0x117C4
PARAMETER_SWITCH = 0x112BA

SELECT = (0x1F, 0xFF)
CANCEL_TIMERS = (0xFFFB, 0x07)

#: The four Harmony 350 configurations and the two Harmony 300 ones.
ISSUE_37 = 'h350_issue37_config'
FAMILY = CONFIGS + (ISSUE_37,)
HARMONY_350 = ('h350_config', 'h350_programmed_config', 'h350_three_devices_config', ISSUE_37)


class _Zipped(_Config):
    """A configuration delivered as a ZIP holding the bare container as `Result.EzHex`."""

    def __init__(self, name):
        self.name = name
        with zipfile.ZipFile(io.BytesIO(lab.load(name))) as archive:
            self.blob = archive.read('Result.EzHex')


def _configs():
    lab.require(*FAMILY)
    return [_Zipped(name) if name == ISSUE_37 else _Config(name) for name in FAMILY]


def _selections(c):
    """Entry 0's bindings that select one device's map and do nothing else.

    As `{(event type, scan code): (selected entry, list)}`. A list qualifies when it selects with band
    `0xFF` once and otherwise only cancels timers or switches a pin, the predicate of
    `RawSlot6InTheConfigurations.test_a_device_key_selects_each_devices_map_once`; the activity's
    binding, which sends codes, does not.
    """
    out = {}
    for _, tag, operand, opcode in c.tagged(c.array(6)[0]):
        if opcode != 0x7F:
            continue
        body = c.action_list(operand)
        picks = [op & 0xFF for op, opc in body if (opc, op >> 8) == SELECT]
        rest = {(opc, op >> 8) for op, opc in body if (opc, op >> 8) != SELECT}
        if len(picks) == 1 and rest <= {(0x07, 0xFF), (0x1F, 0xE9)}:
            out[(tag & 0xC0, tag & 0x3F)] = (picks[0], body)
    return out


def _binding(c, tag):
    found = [operand for _, t, operand, opcode in c.tagged(c.array(6)[0]) if t == tag and opcode == 0x7F]
    return c.action_list(found[0]) if len(found) == 1 else None


class TheKeypadRaisesThreeEventsAndAPressEndsInOneOfTwo(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_four_ors_put_an_event_type_on_the_key_down(self):
        # MOVLB 7 ; IORWF 0x711,W, found by its encoding; the event type is the MOVLW in front of it.
        pattern = bytes([0x07, 0x01, 0x11, 0x11])
        found, start = [], 0
        while (at := self.code.find(pattern, start)) >= 0:
            found.append(at + BASE - 2)
            start = at + 1
        self.assertEqual(found, [0x18AEA, 0x18B4A, 0x18B84, 0x18BCE])
        self.assertEqual([self.code[a - BASE] for a in found], [0xC0, 0x80, 0x40, 0x40])
        # Every raiser of an event, and the four of them carry the scan code; the other three do not.
        callers = [r.addr for r in trace.xrefs(self.code, BASE, [EVENT_QUEUE])[EVENT_QUEUE]]
        self.assertEqual(callers, [0x10FEE, 0x145E6, 0x14604, 0x18AF4, 0x18B54, 0x18B8E, 0x18BD8])

    def test_an_event_is_queued_as_0x1f_band_0xfc_and_handed_to_the_key_map_walk(self):
        self.assertEqual(_text(self.code, EVENT_QUEUE, 12),
                         ['RCALL 0x10eae', 'IORLW 0x00', 'BNZ 0x10fe0', 'MOVFF 0x29c,0x29b', 'RCALL 0x10eba',
                          'MOVLB 0x2', 'MOVLW 0xfc', 'MOVWF 0x29b', 'RCALL 0x10eba', 'MOVLB 0x2',
                          'MOVLW 0x1f', 'MOVWF 0x29b'])
        self.assertEqual(_text(self.code, 0x111EE, 8),
                         ['MOVLW 0x1f', 'SUBWF 0x38,B,W', 'BNZ 0x11202', 'MOVLW 0xfc', 'SUBWF 0x37,B,W',
                          'BNZ 0x11202', 'MOVFF 0xc36,0x2a8', 'GOTO 0x1113a'])

    def test_a_press_starts_the_hold_at_parameter_0_times_100_for_every_key(self):
        self.assertEqual(_text(self.code, PRESS_PATH, 21),
                         ['MOVFF 0x713,0x711', 'MOVFF 0x711,0x2a1', 'CALL 0x110ce', 'MOVLB 0x2',
                          'MOVLW 0x01', 'MOVWF 0x2aa', 'CALL 0x11266', 'IORLW 0x00', 'BNZ 0x18b58',
                          'MOVLW 0x80', 'MOVLB 0x7', 'IORWF 0x711,W', 'MOVLB 0x2', 'MOVWF 0x29c',
                          'CALL 0x10fc4', 'MOVLB 0x2', 'MOVF 0x200,W', 'MULLW 0x64', 'MOVFF PRODL,0x316',
                          'MOVFF PRODH,0x317', 'GOTO 0x1959e'])
        self.assertEqual(_text(self.code, HOLD_START, 7),
                         ['MOVLB 0x3', 'MOVLW 0x01', 'MOVWF 0x314', 'CLRF 0x315', 'MOVFF 0x316,0x312',
                          'MOVFF 0x317,0x313', 'RETURN'])
        # The reload has one writer each, the press path, so no key has a hold of its own.
        self.assertEqual((_writes(self.code, 0x316), _writes(self.code, 0x317)), ([0x18B5E], [0x18B62]))

    def test_running_out_stops_the_counter_and_raises_the_held_event_once(self):
        # Bank 3 from the MOVLB at the start: 0x14 is 0x314, running, and 0x15 is 0x315, run out.
        self.assertEqual(_text(self.code, TICK_HOLD, 35)[20:],
                         ['MOVF 0x14,B,W', 'BZ 0x196dc', 'MOVF 0x15,B,W', 'BNZ 0x196dc', 'DECF 0x12,B,F',
                          'MOVLW 0xff', 'SUBWF 0x12,B,W', 'BNZ 0x196dc', 'DECF 0x13,B,F', 'MOVLW 0xff',
                          'SUBWF 0x13,B,W', 'BNZ 0x196dc', 'MOVLW 0x01', 'MOVWF 0x15,B', 'CLRF 0x14,B'])
        self.assertEqual(_text(self.code, TICK_HOLD, 1), ['MOVLB 0x3'])
        self.assertEqual(_text(self.code, HELD_RAISE, 9) + _text(self.code, 0x18AF8, 2),
                         ['MOVLB 0x3', 'MOVF 0x315,W', 'BZ 0x18afc', 'MOVLW 0xc0', 'MOVLB 0x7',
                          'IORWF 0x711,W', 'MOVLB 0x2', 'MOVWF 0x29c', 'CALL 0x10fc4', 'MOVLB 0x3',
                          'CLRF 0x315'])

    def test_a_reload_of_1000_runs_out_on_the_1001st_tick(self):
        # The listing above, run: the count is a u16 decremented while running, and it has run out
        # when the high byte wraps to 0xFF.
        low, high, ticks = 1000 & 0xFF, 1000 >> 8, 0
        while True:
            ticks += 1
            low = (low - 1) & 0xFF
            if low != 0xFF:
                continue
            high = (high - 1) & 0xFF
            if high == 0xFF:
                break
        self.assertEqual(ticks, 1001)

    def test_a_release_is_raised_only_while_the_hold_runs(self):
        self.assertEqual(_text(self.code, RELEASE_PATH, 19),
                         ['MOVLB 0x7', 'MOVF 0x711,W', 'BZ 0x18b9a', 'MOVLB 0x3', 'MOVF 0x314,W',
                          'BZ 0x18b92', 'MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0x2aa', 'CALL 0x11266',
                          'IORLW 0x00', 'BNZ 0x18b92', 'MOVLW 0x40', 'MOVLB 0x7', 'IORWF 0x711,W',
                          'MOVLB 0x2', 'MOVWF 0x29c', 'CALL 0x10fc4', 'CALL 0x19592'])
        self.assertEqual(_text(self.code, 0x18BBA, 3), ['MOVLB 0x3', 'MOVF 0x314,W', 'BZ 0x18bdc'])
        self.assertEqual(_text(self.code, RELEASE_ON_CHANGE, 7),
                         ['MOVLW 0x40', 'MOVLB 0x7', 'IORWF 0x711,W', 'MOVLB 0x2', 'MOVWF 0x29c',
                          'CALL 0x10fc4', 'CALL 0x19592'])
        self.assertEqual(_text(self.code, HOLD_CLEAR, 6),
                         ['MOVLB 0x3', 'CLRF 0x314', 'CLRF 0x315', 'CLRF 0x312', 'CLRF 0x313', 'RETURN'])
        # Running is set by the press and cleared by the clear, by the keypad's no key check, and by
        # running out (the tick's banked CLRF, which the tracer does not attribute, asserted above).
        self.assertEqual(_writes(self.code, 0x314), [0x18B28, 0x19594, 0x195A2])

    def _refs(self, target):
        return [r.addr for r in trace.xrefs(self.code, BASE, [target])[target]]

    def test_selecting_a_map_or_moving_the_stack_ends_the_hold(self):
        refs = self._refs
        self.assertEqual(refs(HOLD_CLEAR), [0x18926, 0x18B92, 0x18BDC, 0x19628])
        self.assertEqual(_text(self.code, 0x18926, 1), ['GOTO 0x19592'])
        self.assertEqual(refs(0x18926), [0x11032])
        self.assertEqual(_text(self.code, END_HOLD, 4),
                         ['MOVFF 0x297,0xc00', 'MOVFF 0x298,0xc01', 'MOVFF 0x21e,0xc02', 'CALL 0x18926'])
        self.assertEqual(refs(END_HOLD), [0x11348, 0x118C4])
        # Opcode 0x1F's bands from 0xF8 up: 0xFF goes to the select, which falls through to the call,
        # and bands 0xFE and 0xFD branch to the same call.
        self.assertEqual(_text(self.code, 0x11892, 6), ['MOVLW 0xf8', 'SUBWF 0xb4,B,W', 'BNC 0x11930',
                                                        'MOVLW 0xff', 'SUBWF 0xb4,B,W', 'BNC 0x118a6'])
        self.assertEqual(_text(self.code, 0x1189E, 3), ['MOVFF 0x2b3,0x2a9', 'RCALL 0x11234', 'BRA 0x118c4'])
        self.assertEqual(_text(self.code, 0x118B0, 2), ['CALL 0x10dea', 'BRA 0x118c4'])
        self.assertEqual(_text(self.code, 0x118C0, 2), ['CALL 0x10e34', 'CALL 0x11026'])
        self.assertEqual(_text(self.code, 0x11342, 4), ['MOVLW 0x7e', 'SUBWF 0xb5,B,W', 'BNC 0x1134e',
                                                        'RCALL 0x11026'])


class TheHoldTimeIsParameter0AndEveryConfigurationSetsItToTen(unittest.TestCase):
    def test_0x3f_band_0xf0_writes_a_parameter_and_0_is_the_hold(self):
        lab.require('h350_code')
        code = _code()
        self.assertEqual(_text(code, PARAMETER_BAND, 9),
                         ['MOVLW 0xf0', 'SUBWF 0xb4,B,W', 'BNC 0x117da', 'MOVFF 0x2b3,0x2af', 'MOVLW 0x0f',
                          'ANDWF 0xb4,B,W', 'MOVLB 0x2', 'MOVWF 0x2ae', 'RCALL 0x112b6'])
        self.assertEqual(chains.chain_table(code, BASE, PARAMETER_SWITCH),
                         {0x7: 0x112E0, 0x2: 0x112E6, 0x1: 0x112E6, 0x6: 0x112D6, 0x0: 0x112D0})
        self.assertEqual(_text(code, 0x112D0, 1), ['MOVFF 0x2af,0x200'])
        self.assertEqual(_writes(code, 0x200), [0x0DA9A, 0x10F8E, 0x112D0])

    def test_the_image_starts_it_at_10(self):
        lab.require('h350_code')
        self.assertEqual(_text(_code(), 0x10F7C, 12)[8:], ['MOVLW 0x0a', 'MOVWF 0x200', 'MOVLW 0x32',
                                                           'MOVWF 0x201'])

    def test_every_configuration_sets_it_to_10_at_start(self):
        found = {}
        for c in _configs():
            with self.subTest(c.name):
                # Start up entry 1 calls list 0, which calls the list that opens with it.
                first = [c.action_list(op)[0] for op, opc in c.action_list(0) if opc == 0x7F
                         and c.action_list(op)]
                self.assertIn((0xF00A, 0x3F), first)
                found[c.name] = [op for op, opc in c.instructions() if opc == 0x3F and op >> 8 >= 0xF0]
        self.assertEqual(found, {name: [0xF00A] for name in FAMILY})


class TheHoldIsAboutOneSecondByTheMeasuredDelay(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_hold_and_the_delay_pass_count_the_same_tick(self):
        # The first accumulator: 1000 counts of timer 3 a tick, then the hundred tick count to 0x328.
        self.assertEqual(_text(self.code, 0x1966C, 7),
                         ['MOVLB 0x3', 'ADDWFC 0x305,F', 'MOVLW 0xe8', 'SUBWF 0x304,W', 'MOVLW 0x03',
                          'SUBWFB 0x305,W', 'BNC 0x196c6'])
        self.assertEqual(_text(self.code, 0x196A0, 6),
                         ['DECF 0x29,B,F', 'BNZ 0x196ac', 'MOVLW 0x01', 'MOVWF 0x28,B', 'MOVLW 0x64',
                          'MOVWF 0x29,B'])
        self.assertEqual(_text(self.code, 0x12A64, 10)[:3] + _text(self.code, 0x12A76, 1),
                         ['MOVLB 0x3', 'MOVF 0x328,W', 'BZ 0x12a7e', 'RCALL 0x12624'])
        # The hold's own accumulator takes the same difference, 0xC02 and 0xC03, 1000 to a tick.
        self.assertEqual(_text(self.code, 0x196CC, 13),
                         ['MOVLB 0xc', 'MOVF 0xc02,W', 'MOVLB 0x3', 'ADDWF 0x30f,F', 'MOVLB 0xc',
                          'MOVF 0xc03,W', 'MOVLB 0x3', 'ADDWFC 0x310,F', 'MOVLW 0xe8', 'SUBWF 0x30f,W',
                          'MOVLW 0x03', 'SUBWFB 0x310,W', 'BNC 0x19720'])

    def test_a_kind_0_timer_loses_one_a_tick(self):
        self.assertEqual(_text(self.code, 0x19682, 1), ['CALL 0x16d72'])
        self.assertEqual(_text(self.code, 0x16D72, 4), ['MOVLB 0x6', 'MOVLW 0x02', 'MOVWF 0x6fd', 'GOTO 0x16cd0'])
        # The start marks a kind 1 slot with bit 4 and clears it for kind 0, and the pass takes only a
        # running slot, bit 0, without bit 4.
        self.assertEqual(_text(self.code, 0x16AC4, 2) + _text(self.code, 0x16ADE, 1)
                         + _text(self.code, 0x16B52, 1),
                         ['MOVLB 0xc', 'BTFSS 0xc01,0', 'BSF INDF0,4', 'BCF INDF0,4'])
        self.assertEqual(_text(self.code, 0x16CF8, 3) + _text(self.code, 0x16D12, 3),
                         ['MOVF INDF0,W', 'ANDLW 0x01', 'BZ 0x16d6a', 'MOVF INDF0,W', 'ANDLW 0x10',
                          'BNZ 0x16d6a'])
        self.assertEqual(_text(self.code, 0x16D60, 5),
                         ['MOVLW 0x00', 'ADDWFC FSR0H,F', 'DECF POSTINC0,F', 'SUBWFB POSTINC0,F',
                          'SUBWFB POSTINC0,F'])

    def test_1001_ticks_are_1_005_seconds_by_the_receiver(self):
        silences = test_harmony_350_delay.TheBench350WaitsTenthsOfASecond(
            'test_the_held_volume_up_follows_power_on_by_the_delay')._silences()
        # Seventy units of the delay are 7000 ticks; the hold is 1001, in microseconds.
        span = silences[100] - silences[30]
        self.assertEqual((1001 * span) // 7000, 1005433)


class TheDeviceKeysInTheConfigurations(unittest.TestCase):
    def test_the_350_selects_on_release_and_on_the_held_event_and_the_300_on_press(self):
        found = {c.name: {key: pick for key, (pick, _) in _selections(c).items()} for c in _configs()}
        release, held, press = 0x40, 0xC0, 0x80
        self.assertEqual(found, {
            'h350_config': {(release, 1): 2, (release, 4): 3, (release, 5): 1},
            'h350_programmed_config': {(release, 1): 1, (release, 4): 2, (release, 5): 3, (release, 7): 4},
            'h350_three_devices_config': {(release, 1): 2, (release, 4): 3, (release, 5): 1},
            # Two keys with a second device, on the held event; entry 1 is on two keys.
            ISSUE_37: {(release, 1): 1, (release, 4): 4, (release, 5): 2, (release, 7): 5,
                       (held, 1): 3, (held, 7): 1},
            'h300_config': {(press, 1): 2, (press, 5): 1},
            'h300_programmed_config': {(press, 1): 1, (press, 4): 4, (press, 5): 3, (press, 7): 2}})

    def test_every_device_map_is_selected_and_the_issue_37_file_selects_one_twice(self):
        found = {}
        for c in _configs():
            picks = sorted(pick for pick, _ in _selections(c).values())
            found[c.name] = (len(c.array(6)) - 1, picks)
        self.assertEqual(found, {'h350_config': (3, [1, 2, 3]), 'h350_programmed_config': (4, [1, 2, 3, 4]),
                                 'h350_three_devices_config': (3, [1, 2, 3]),
                                 ISSUE_37: (5, [1, 1, 2, 3, 4, 5]),
                                 'h300_config': (2, [1, 2]), 'h300_programmed_config': (4, [1, 2, 3, 4])})

    def test_a_350_selecting_binding_cancels_the_timers_first(self):
        for c in _configs():
            if c.name not in HARMONY_350:
                continue
            with self.subTest(c.name):
                for _, body in _selections(c).values():
                    self.assertEqual((body[0], len(body)), (CANCEL_TIMERS, 2))

    def test_a_press_switches_its_keys_pin_and_on_the_350_starts_two_timers_per_device(self):
        pins, groups = {}, {}
        for c in _configs():
            with self.subTest(c.name):
                records = c.array(8)
                devices = {}
                for _, scan in _selections(c):
                    devices[scan] = devices.get(scan, 0) + 1
                for scan, count in sorted(devices.items()):
                    body = _binding(c, 0x80 | scan)
                    pin = sorted({op for op, opc in body if (opc, op >> 8) == (0x1F, 0xE9)})
                    self.assertEqual(len(pin), 1)
                    self.assertEqual(pin[0] & 0x0F, 2)
                    pins.setdefault(scan, set()).add((pin[0] >> 4) & 0x0F)
                    if c.name not in HARMONY_350:
                        self.assertEqual(len(body), 2)
                        continue
                    # One group of four per device on the key, each the cancel, the pin, two starts.
                    self.assertEqual(len(body), 4 * count)
                    for k in range(count):
                        group = body[4 * k:4 * k + 4]
                        self.assertEqual(group[:2], [CANCEL_TIMERS, (pin[0], 0x1F)])
                        started = [op & 0xFF for op, opc in group[2:] if (opc, op >> 8) == (0x1F, 0xEB)]
                        timers = {c.u(records[i] + 1, 3): c.u(records[i] + 4, 2) for i in started}
                        self.assertEqual(timers, {400: pin[0] & 0xFFF0, 600: pin[0]})
                    groups[(c.name, scan)] = count
                if c.name in HARMONY_350:
                    # Two records for each device a key selects.
                    self.assertEqual(len(records), 2 * sum(devices.values()))
        # One pin per key, and the same pin for a scan code on both models.
        self.assertEqual(pins, {1: {2}, 4: {3}, 5: {0}, 7: {1}})
        self.assertEqual(sorted(key for key, count in groups.items() if count == 2),
                         [(ISSUE_37, 1), (ISSUE_37, 7)])

    def test_only_a_key_with_a_second_device_binds_the_held_event(self):
        found = {}
        for c in _configs():
            tags = [(entry, tag) for entry, at in enumerate(c.array(6)) for _, tag, _, _ in c.tagged(at)]
            found[c.name] = (sorted(tag for _, tag in tags if tag & 0xC0 == 0xC0),
                             sum(1 for entry, tag in tags if tag & 0xC0 == 0x40 and entry != 0))
        self.assertEqual(found, {'h350_config': ([], 0), 'h350_programmed_config': ([], 0),
                                 'h350_three_devices_config': ([], 0), ISSUE_37: ([0xC1, 0xC7], 0),
                                 'h300_config': ([], 0), 'h300_programmed_config': ([], 0)})

    def test_0x07_0xfffb_cancels_all_four_timer_slots(self):
        lab.require('h350_code')
        code = _code()
        self.assertEqual(_text(code, 0x11CA4, 4), ['MOVLW 0xfb', 'SUBWF 0xb3,B,W', 'BNC 0x11cb0', 'CALL 0x16c66'])
        listing = _text(code, 0x16C66, 14)
        self.assertEqual(listing[2:5], ['MOVLW 0x04', 'SUBWF 0xc00,W', 'BC 0x16cce'])
        self.assertEqual(listing[13], 'BCF INDF0,0')


if __name__ == '__main__':
    unittest.main()
