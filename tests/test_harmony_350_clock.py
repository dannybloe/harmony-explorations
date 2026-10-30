#!/usr/bin/env python3
"""The Harmony 300 and 350's state variables: where they live, which the firmware owns, and a clock
that runs to the minute and nothing above it.

`todo-compile-350.md` 2.5. `tests/test_harmony_350_slots.py` had read raw slot 9 as base slot 13 for its
layout and its seeder only, and the family's `memory.md` listed the rest as not checked: which variables
the firmware owns, where they sit in data memory, and whether the clock record a configuration carries
seeds a clock the remote then runs. This file answers all three on the 1.4 image, and the answer to the
last is the one nobody expected: **the firmware runs a count it keeps as the second, and the minute, and
on all five configurations of this family read here the hour, the date and the year never move**,
because the step from one minute to the next hour is not the firmware's. It is a transition in the
configuration's own clock records, and none of the five carries one.

## Where the variables live

* The reader at `0x17302` takes an index below `narrow` (`0x1C8`) as one byte at `0x108 + index`, and
  one at or above it as a little endian pair at `0x108 + narrow + 2 * (index - narrow)`; the store at
  `0x172B2`, which the seeder and every state write go through, writes the same places. So the state
  variables start at data memory `0x108`, the address the Harmony One and the Harmony 880 and 885 use,
  and the seeder's `0xFE` fill stops at `0x108 + 0xC0 = 0x1C8`, which is exactly where the seeder keeps
  `narrow`, then `wide` at `0x1C9` and the memory check at `0x1CA`. The area is 192 bytes, so
  `narrow + 2 * wide` cannot pass 192.

## The firmware's block is 0 to 17

Two reads, both in `tests/test_firmware_state_block.py` beside the other architectures', which is the
home of this fact across architectures; the seeder half is `tests/test_harmony_350_slots.py`:

* the seeder's other arm, with the configuration's verdict clear, paints `0xFE` from the literal 18;
* the memory check that decides whether the seeder runs at all is an XOR seeded `0xA5` over `0xAE`
  bytes from `0x11A`, which is `0x108 + 18`, up to `0x1C7`, the end of the area. So variables 0 to 17
  are outside the check: the firmware's own state does not count as evidence that the configuration's
  survived.

And the configurations agree, here: in all five, records 7 to 17 carry the same `first` and `max`, and
they are the Harmony 600, 650 and 700's, read off a Harmony 600 configuration rather than restated.

**What the firmware stores into, directly**, from `trace` over `0x108` to `0x119` with the bank of each
hit checked against its `MOVLB` (exact, test below):

| variable | where | what |
|---|---|---|
| 0, the second | `0x13D12` | the tick adds the elapsed count and takes 60 off while it can, setting the minute flag, bit 1 of `0x370` |
| 3 and 5, day and month | `0x1441C`, `0x14418` | the month end routine at `0x14382`, section 322's, in its rolling mode: a day past its month's last index goes to 0 and the month on by one, modulo 12 |
| 4, the weekday | `0x1437C` | the weekday routine at `0x14288`, reached by `0x07` with operand low byte `0xF8`, which no configuration here issues |
| 11 and 13 | `0x15E2C`, `0x15E30` | 10 and 0, at every start, straight after the seeder; no direct reference in the image reads either, and a read through the indexed reader is not excluded |
| 16 | `0x145B0`, `0x145DC` | 0 or 1 from an input pin, `PORTB` bit 1, stored when it changes, which also queues a firmware event; what the pin senses is not checked |
| 17 | `0x11E8A`, `0x11EA6` | the priority byte of the send queue, `0x11EA6`'s copy of `0x097`, which the send path sets to 0, 1, 2 or 3; `tests/test_harmony_350_delay.py` read the 1 and the 2. It is the Harmony One's priority byte and the Harmony 600, 650 and 700's sending flag, sections 278 and 369 |

None to 1, 2, 6, 7 to 10, 12, 14 or 15. **The minute is stepped through the configuration's own
interpreter instead**, below.

## The clock runs, in the firmware, up to the minute

* **The second.** `0x13C12` is the tick: it adds the elapsed count in `0x373` to a 24 bit counter at
  `0x36C`, to four timer slots, and at `0x13D0E` to variable 0, then takes 60 off while variable 0 is 60
  or more and sets bit 1 of `0x370` each time. The count comes from two places: Timer1's overflow flag,
  polled from the main loop at `0x13E40`, where every eighth overflow (`0x13DFC`) hands on the step in
  `0x35D`; and the sleep at `0x1A6D2`, where a wake by the watchdog (`RCON` bit 3 clear) hands on 8.
  So it is a clock and not a counter of presses, but **whether its unit is a second is not checked**:
  Timer1 runs from the instruction clock through a prescaler of 8 (`T1CON = 0x34` at `0x1AD40`), and
  neither the oscillator's rate nor the watchdog's period, which is in the configuration words, is read.
* **The minute.** The main loop at `0x13E52` takes the flag only when the action queue is empty
  (`0x11262` is `0x10EE4`, which answers 1 when the count at `0x21E` is zero), clears it, and when the
  verdict holds builds the instruction `0x1F` band `0xF2` operand 1, calls the month end routine in
  its rolling mode, and queues the instruction. **Band `0xF2` adds one to the variable its low byte
  names and band `0xF1` takes one off**, `0x11984`, both through `0x171E8`, which reads the record's
  `max` and **wraps**: past `max` it takes `max + 1` off, below 0 it adds it (`0x1723C`, `0x1725A`).
  Then, unless the silent flag is up, it walks the variable's transitions.
* **Above the minute, nothing.** In every one of the 21 containers of the other architectures the
  configuration does the carry, with the instruction this firmware queues for the minute: the minute's
  record carries `-2 to 0: 0x1F F2 02`, one added to the hour when the minute wraps to 0; the hour's
  carries `-2 to 0` calling a list that holds exactly `0x1F F2 03` and `0x1F F2 04`, the day and the
  weekday; the day's `0x1F F2 05`, the month; the month's `0x1F F2 06`, the year; and the second, the
  weekday and the year carry nothing. **On all five configurations of this family read here, the seven
  clock records carry no transition at all**, and no instruction in their lists, key maps, start up
  events, timers or transitions writes, steps or adds to any of variables 0 to 17 (the opcodes looked
  for are `0x80` and up, `0x70` to `0x72`, `0x1F` bands `0xEF` to `0xF2` and `0x07` low bytes `0xF8`
  and `0xF9`; the name tree was not scanned). So the minute runs 0 to 59 and round again, and the hour,
  the day, the month and the year stay what the seeder put there. The month end routine runs every
  minute and changes nothing, since the day never passes its month's end. Five configurations, three of
  a Harmony 350 and two of a Harmony 300, from two generations of Logitech's compiler, is the width of
  this: one compiled for this family that carries the chain would run its clock, and none is known.

So the remote's minutes and its count of seconds, whatever their unit, run on from whatever was seeded, and its hour, date and year stay
what the seeder put there, which at a cold start is the configuration's build stamp. Nothing a person
meets is known to depend on it: neither model has a screen, and no configuration read here reads any
of the clock's variables.

## What seeds it

* **The seven records' `first` are the build stamp**: in all five, record `n` holds base slot 3's field
  for `n`, second to year, and the year's `max` is that year plus one, the rule section 130 found on the
  other architectures.
* The seeder writes them only when the memory check over 18 upward fails, so at a cold start; a warm
  start keeps the running values, the Harmony One's arrangement, section 138. Whether a restart after a
  configuration is written seeds the new configuration's values is decided by the same check, and is not
  checked: at start a clear verdict spoils the stored check (`INCF 0x1CA` at `0x15E0A`), and what
  survives in data memory across this family's restart is not read.
* **The start fills the time since the build, not the clock**: `0x13BDE` seeks raw slot 3, skips 10 bytes
  and reads three into `0x36C`, the counter the tick adds to, as section 310 read on the Harmony One, 600
  and 700. What it loads is `EF 00 00` in all five, the same as there.

## Reading it off a remote

**The file protocol offers no read of data memory**, `reference/usb-protocol/file-protocol.md`, and
nothing on `INERT_PATHS` serves the clock. The image does answer one request with it: the reply
dispatcher at `0x0E4C2` sends the pair the parser stores as `0x03`, `0xC0` (where every file command
carries `0xFF`) to `0x0EC0C`, whose builder at `0x0F3BE` copies the second, minute, hour, day, month and
year into the reply. How that request is framed on the wire is not read, `openFileBasedRemote`'s
transport sends nothing but a ping, an open for reading, a read and a close, and Logitech's templates for
skins 78 and 104 send nothing under any service but `0xFF`. So reading the clock is an experimental packet
behind the `probe-remote` gate, and is not proposed here; what it would settle is the unit of the tick, by
two reads some minutes apart, and that the hour stays.

## Sources checked first

Logitech's client: the templates for skins 78 and 104 (identify, connectivity, user configuration, learn,
test and firmware upgrade) carry no clock command and no service but `0xFF`; the client sets a clock only
through the sync templates of other skins. The archive: sections 111, 130 and 138 (the clock records and
the seeder on the Harmony One), 274 and 276 (the seeder and its fill per image), 284 (the firmware's
block, 0 to 17), 310 (the time since build), 322 (the month end routine, read on this image at
`0x14382`), 278 and 369 (variable 17). The reference: `reference/config-format/state.md` and
`header-records.md`, and this family's `memory.md` and `firmware.md`. The library: `src/harmony/gspm.py`'s
`state_records` for the other architectures' containers.

**Which architectures.** Arch 16 alone: the 1.4 image read as the Harmony 350's (`h350_code`), which
Logitech's package names for skins 78, 79 and 104, so the Harmony 300's too on Logitech's word; and the
five configurations, three of a Harmony 350 and two of a Harmony 300. The control is the 21 containers of
arch 8, 9, 12 and 14.

**Standing.** Read in the firmware and measured in configurations. Nothing was sent to a remote.
"""
import unittest

import lab
import test_harmony_350_slots as slots
from harmony import gspm
from harmony.pic18 import trace

BASE = slots.BASE
VARIABLES = 0x108

STATE_READ = 0x17302
STATE_STORE = 0x172B2
TICK_SECOND = 0x13D0E
MINUTE = 0x13E52
QUEUE_IDLE = 0x10EE4
STEP_BANDS = 0x11984
ADD = 0x171E8
CLOCK_REPLY = 0x0F3BE

#: The minute's carry into the hour on every other architecture, one transition as stored: lead byte,
#: from -2, to 0, then `0x1F` band `0xF2` operand 2.
MINUTE_CARRIES_THE_HOUR = bytes.fromhex('00feff000002f21f')

#: The rest of the carry on every other architecture: the hour's list, then the day's and the month's
#: transitions, each one added to the next field (the day, the weekday, the month, the year).
HOUR_LIST = [(0xF203, 0x1F), (0xF204, 0x1F)]
DAY_CARRIES_THE_MONTH = bytes.fromhex('00feff000005f21f')
MONTH_CARRIES_THE_YEAR = bytes.fromhex('00feff000006f21f')

#: The clock records' maxima apart from the year's, which is that year plus one.
CLOCK_MAXIMA = (59, 59, 23, 30, 6, 11)


def _code():
    lab.require('h350_code')
    return slots._code()


def _text(code, start, count):
    return slots._text(code, start, count)


def _records(c):
    """Every state record of a family configuration, as (first, max, transitions)."""
    at = c.pointer(9)
    out = []
    for i in range(c.u(at, 2)):
        record = c.u(at + 8 + 3 * i, 3)
        transitions = [(c.u(record + 7 + 8 * k + 5, 2), c.u(record + 7 + 8 * k + 7, 1))
                       for k in range(c.u(record + 4, 2))]
        out.append((c.u(record, 2), c.u(record + 2, 2), transitions))
    return out


def _every_instruction(c):
    """Lists, key maps, start up events, timers and transitions, as (operand, opcode)."""
    out = list(c.instructions())
    at = c.pointer(5)
    out += [(c.u(at + 1 + 3 * i, 2), c.u(at + 3 + 3 * i, 1)) for i in range(c.u(at, 1))]
    out += [(c.u(r + 4, 2), c.u(r + 6, 1)) for r in c.array(8)]
    for _, _, transitions in _records(c):
        out += transitions
    return out


class TheVariablesLiveFrom0x108(unittest.TestCase):
    def setUp(self):
        self.code = _code()

    def test_a_read_takes_one_byte_below_narrow_and_a_pair_past_it(self):
        self.assertEqual(_text(self.code, STATE_READ, 22),
                         ['MOVLB 0x1', 'MOVF 0x1c8,W', 'SUBWF 0x1dc,W', 'BC 0x17328',
                          # Below narrow: one byte at 0x108 plus the index.
                          'MOVF 0xdc,B,W', 'CLRF FSR0H', 'ADDLW 0x08', 'MOVWF FSR0L', 'MOVLW 0x01',
                          'ADDWFC FSR0H,F', 'MOVF INDF0,W', 'MOVWF 0x14', 'CLRF 0x15',
                          'MOVFF 0x014,PRODL', 'MOVFF 0x015,PRODH', 'RETURN', 'RETURN',
                          # At or above it: the index less narrow, doubled, plus narrow.
                          'MOVF 0xc8,B,W', 'SUBWF 0xdc,B,F', 'BCF 0xdc,B,7', 'RLNCF 0xdc,B,F',
                          'MOVF 0xc8,B,W'])

    def test_a_store_writes_the_same_places(self):
        self.assertEqual(_text(self.code, STATE_STORE, 26),
                         ['MOVLB 0x1', 'MOVF 0x1c8,W', 'SUBWF 0x1d9,W', 'BC 0x172cc', 'MOVF 0xd9,B,W',
                          'CLRF FSR0H', 'ADDLW 0x08', 'MOVWF FSR0L', 'MOVLW 0x01', 'ADDWFC FSR0H,F',
                          'MOVFF 0x1da,INDF0', 'BRA 0x172fa', 'MOVF 0xc8,B,W', 'SUBWF 0xd9,B,F',
                          'BCF 0xd9,B,7', 'RLNCF 0xd9,B,F', 'MOVF 0xc8,B,W', 'ADDWF 0xd9,B,F',
                          'MOVF 0xd9,B,W', 'INCF 0xd9,B,F', 'CLRF FSR0H', 'ADDLW 0x08', 'MOVWF FSR0L',
                          'MOVLW 0x01', 'ADDWFC FSR0H,F', 'MOVFF 0x1da,INDF0'])
        # The seeder goes through it, as does every step of a variable.
        refs = sorted(r.addr for r in trace.xrefs(self.code, BASE, [STATE_STORE])[STATE_STORE])
        self.assertEqual(refs, [0x16F2A, 0x171B8, 0x17282])


class TheFirmwareStoresIntoEightOfItsEighteen(unittest.TestCase):
    """Direct stores into variables 0 to 17, each bank checked against the listing."""

    STORES = {0: [0x13D12], 3: [0x1441C], 4: [0x1437C], 5: [0x14418], 11: [0x15E2C], 13: [0x15E30],
              16: [0x145B0, 0x145DC], 17: [0x11E8A, 0x11EA6]}

    def setUp(self):
        self.code = _code()

    def test_the_direct_stores_are_these_and_no_others(self):
        hits = trace.trace(self.code, BASE, [VARIABLES + i for i in range(18)])
        stores = {i: [h.addr for h in hits[VARIABLES + i]
                      if 'WRITE' in h.kind or h.kind.startswith(('BSF', 'BCF', 'BTG'))]
                  for i in range(18)}
        self.assertEqual({i: a for i, a in stores.items() if a}, self.STORES)

    def test_the_banks_the_tracer_inferred_are_bank_1(self):
        self.assertEqual(_text(self.code, 0x13D10, 2), ['MOVLB 0x1', 'ADDWF 0x108,F'])
        self.assertEqual(_text(self.code, 0x15E28, 5),
                         ['MOVLB 0x1', 'MOVLW 0x0a', 'MOVWF 0x113', 'MOVLB 0x1', 'CLRF 0x115'])
        self.assertEqual(_text(self.code, 0x145AE, 2), ['MOVLB 0x1', 'CLRF 0x118'])
        self.assertEqual(_text(self.code, 0x11E88, 2), ['MOVLB 0x1', 'CLRF 0x119'])

    def test_11_and_13_are_set_at_every_start_straight_after_the_seeder(self):
        self.assertEqual(_text(self.code, 0x15E14, 1), ['CALL 0x16e6c'])
        # Four calls between, none of them conditional on anything before the two stores.
        self.assertEqual([line.split()[0] for line in _text(self.code, 0x15E18, 4)], ['CALL'] * 4)

    def test_4_is_worked_out_only_by_the_instruction_0x07_low_byte_0xf8(self):
        # The case of the dispatcher's arm for opcodes 0x07 to 0x0E, on the operand's low byte.
        self.assertEqual(_text(self.code, 0x11CC8, 4),
                         ['MOVLW 0xf8', 'SUBWF 0xb3,B,W', 'BNC 0x11cd4', 'CALL 0x14288'])
        self.assertEqual([r.addr for r in trace.xrefs(self.code, BASE, [0x14288])[0x14288]], [0x11CCE])

    def test_16_follows_an_input_pin_and_is_stored_only_when_it_changes(self):
        self.assertEqual(_text(self.code, 0x14608, 2), ['BTFSS PORTB,1', 'RETLW 0x00'])
        self.assertEqual(_text(self.code, 0x145C4, 13),
                         ['RCALL 0x14608', 'MOVLB 0xc', 'MOVWF 0xc00', 'MOVLB 0x0', 'MOVF 0x0bf,W',
                          'BNZ 0x145ea', 'MOVLB 0x1', 'MOVF 0x118,W', 'MOVLB 0xc', 'SUBWF 0xc00,W',
                          'BNZ 0x145dc', 'RETURN', 'MOVFF 0xc00,0x118'])

    def test_17_is_the_send_queues_priority_byte(self):
        self.assertEqual(_text(self.code, 0x11EA6, 1), ['MOVFF 0x097,0x119'])
        refs = sorted(r.addr for r in trace.xrefs(self.code, BASE, [0x11EA6])[0x11EA6])
        self.assertEqual(refs, [0x12020, 0x12046, 0x12074, 0x12776, 0x12A08, 0x12BA8, 0x12BE0])
        # The value each call site stores into 0x097 first: 2, 1, 2, then 1 or 0, 0, 1, 3.
        loads = [_text(self.code, a, 3)[1:] for a in (0x1201A, 0x12040, 0x1206E, 0x12A04, 0x12BDA)]
        self.assertEqual(loads, [['MOVLW 0x02', 'MOVWF 0x097'], ['MOVLW 0x01', 'MOVWF 0x097'],
                                 ['MOVLW 0x02', 'MOVWF 0x097'], ['CLRF 0x097', 'CALL 0x11ea6'],
                                 ['MOVLW 0x03', 'MOVWF 0x097']])


class TheFirmwareRunsTheSecondsAndTheMinute(unittest.TestCase):
    def setUp(self):
        self.code = _code()

    def test_the_tick_adds_to_the_second_and_flags_each_sixty(self):
        self.assertEqual(_text(self.code, TICK_SECOND, 13),
                         ['MOVF 0x73,B,W', 'MOVLB 0x1', 'ADDWF 0x108,F', 'MOVLW 0x3c', 'MOVLB 0x1',
                          'SUBWF 0x108,W', 'BNC 0x13d26', 'MOVLW 0x3c', 'SUBWF 0x08,B,F', 'MOVLB 0x3',
                          'BSF 0x370,1', 'BRA 0x13d14', 'RETURN'])

    def test_the_count_comes_from_timer1_and_from_each_watchdog_wake(self):
        self.assertEqual(_text(self.code, 0x13E2A, 2), ['MOVFF 0x374,0x373', 'RCALL 0x13c12'])
        self.assertEqual(_text(self.code, 0x13E40, 8),
                         ['BTFSS PIR1,0', 'BRA 0x13e52', 'BCF PIR1,0', 'RCALL 0x13dfc', 'IORLW 0x00',
                          'BZ 0x13e52', 'MOVFF 0x35d,0x374', 'RCALL 0x13e2a'])
        # Every eighth overflow answers 1.
        self.assertEqual(_text(self.code, 0x13E0E, 5),
                         ['MOVLB 0x3', 'MOVLW 0x08', 'SUBWF 0x35e,W', 'MOVLW 0x00', 'SUBWFB 0x35f,W'])
        # Asleep, a wake by the watchdog counts 8.
        self.assertEqual(_text(self.code, 0x1A6D2, 10),
                         ['BCF T1CON,0', 'BSF OSCCON,0', 'BSF OSCCON,1', 'SLEEP', 'BTFSC RCON,3',
                          'BRA 0x1a6e8', 'MOVLB 0x3', 'MOVLW 0x08', 'MOVWF 0x374', 'CALL 0x13e2a'])
        # Timer1 from the instruction clock through a prescaler of 8.
        self.assertEqual(_text(self.code, 0x1AD40, 2), ['MOVLW 0x34', 'MOVWF T1CON'])

    def test_the_minute_is_a_queued_step_of_variable_1_when_the_queue_is_idle(self):
        self.assertEqual(_text(self.code, MINUTE, 25),
                         ['MOVLB 0x3', 'BTFSS 0x370,1', 'BRA 0x13e8e', 'CALL 0x11262', 'IORLW 0x00',
                          'BZ 0x13e8e', 'MOVLB 0x3', 'BCF 0x370,1', 'MOVLB 0x6', 'BTFSS 0x68e,2',
                          'BRA 0x13e8e', 'MOVLB 0xc', 'MOVLW 0x1f', 'MOVWF 0xc0d', 'MOVLW 0xf2',
                          'MOVWF 0xc0c', 'MOVLW 0x01', 'MOVWF 0xc0b', 'MOVLB 0x3', 'MOVWF 0x37d',
                          'RCALL 0x14382', 'MOVFF 0xc0b,0x2a5', 'MOVFF 0xc0c,0x2a6',
                          'MOVFF 0xc0d,0x2a7', 'CALL 0x110f8'])
        self.assertEqual(_text(self.code, 0x11262, 1), ['GOTO 0x10ee4'])
        self.assertEqual(_text(self.code, QUEUE_IDLE, 5),
                         ['MOVLB 0x2', 'MOVF 0x21e,W', 'BZ 0x10eec', 'RETLW 0x00', 'RETLW 0x01'])

    def test_bands_0xf2_and_0xf1_add_one_and_take_one_off(self):
        self.assertEqual(_text(self.code, STEP_BANDS, 9),
                         ['MOVLW 0xf2', 'SUBWF 0xb4,B,W', 'BNC 0x11998', 'MOVFF 0x2b3,0x1d7',
                          'MOVLW 0x01', 'MOVLB 0x1', 'MOVWF 0x1d5', 'CLRF 0x1d6', 'BRA 0x119a8'])
        self.assertEqual(_text(self.code, 0x1199E, 4),
                         ['MOVFF 0x2b3,0x1d7', 'MOVLB 0x1', 'SETF 0x1d5', 'SETF 0x1d6'])
        self.assertEqual(_text(self.code, 0x119A8, 2), ['MOVFF 0x21a,0x1d4', 'CALL 0x171e8'])

    def test_the_step_reads_the_records_max_and_wraps_through_it(self):
        # The record, then two bytes skipped and two read: `max`, at +2.
        self.assertEqual(_text(self.code, ADD, 13)[1:],
                         ['MOVFF 0x1d7,0x1dd', 'RCALL 0x17360', 'CALL 0x10cd6', 'MOVFF 0x1d7,0x1dc',
                          'RCALL 0x17302', 'MOVFF PRODL,0xc16', 'MOVFF PRODH,0xc17', 'MOVLB 0x6',
                          'MOVLW 0x02', 'MOVWF 0x6d9', 'CALL 0x10b88', 'MOVLB 0x6'])
        self.assertEqual(_text(self.code, 0x1720C, 5),
                         ['MOVLB 0x6', 'MOVLW 0x18', 'MOVWF 0x6d3', 'MOVLW 0x0c', 'MOVWF 0x6d4'])
        # Up: past max, take max + 1 off. Down: add it.
        self.assertEqual(_text(self.code, 0x1723C, 14)[6:],
                         ['MOVF 0x18,B,W', 'SUBWF 0x1a,B,F', 'MOVF 0x19,B,W', 'SUBWFB 0x1b,B,F',
                          'DECF 0x1a,B,F', 'MOVLW 0x00', 'SUBWFB 0x1b,B,F', 'BRA 0x1723c'])
        self.assertEqual(_text(self.code, 0x1725A, 14)[6:],
                         ['MOVF 0x18,B,W', 'ADDWF 0x1a,B,F', 'MOVF 0x19,B,W', 'ADDWFC 0x1b,B,F',
                          'INCF 0x1a,B,F', 'MOVLW 0x00', 'ADDWFC 0x1b,B,F', 'BRA 0x1725a'])

    def test_the_image_builds_one_band_0xf2_instruction_the_minutes(self):
        # Every `MOVLW 0xf2` stored straight into the middle byte of the instruction the minute builds.
        # It does not exclude a step built another way; the direct stores above are the other half.
        listing = _text(self.code, BASE, 40000)
        built = [i for i in range(len(listing) - 1)
                 if listing[i] == 'MOVLW 0xf2' and listing[i + 1] == 'MOVWF 0xc0c']
        self.assertEqual(len(built), 1)


class TheConfigurationsCarryNothingAboveTheMinute(unittest.TestCase):
    def test_no_clock_record_here_carries_a_transition_and_every_other_container_carries_the_whole_chain(self):
        lab.require(*lab.ALL_CONTAINERS)
        others = []
        for name in lab.ALL_CONTAINERS:
            c = gspm.parse(lab.load(name))
            records = c.state_records()[:7]
            # The minute adds to the hour; the hour calls a list adding to the day and the weekday; the
            # day adds to the month and the month to the year; the second, the weekday and the year
            # carry nothing.
            hour = records[2].values
            called = (int.from_bytes(hour[0][5:7], 'little')
                      if len(hour) == 1 and hour[0][:5] == bytes.fromhex('00feff0000') and hour[0][7] == 0x7F
                      else None)
            if (MINUTE_CARRIES_THE_HOUR in records[1].values
                    and called is not None
                    and [(i.operand, i.opcode) for i in c.action_lists()[called]] == HOUR_LIST
                    and records[3].values == [DAY_CARRIES_THE_MONTH]
                    and records[5].values == [MONTH_CARRIES_THE_YEAR]
                    and (records[0].count, records[4].count, records[6].count) == (0, 0, 0)):
                others.append(name)
        self.assertEqual(len(others), 21)
        self.assertEqual(others, list(lab.ALL_CONTAINERS))
        here = {c.name: [len(t) for _, _, t in _records(c)[:7]] for c in slots._configs()}
        self.assertEqual(here, {name: [0] * 7 for name in slots.CONFIGS})

    def test_nothing_in_a_configuration_writes_steps_or_reads_the_clock(self):
        for c in slots._configs():
            with self.subTest(c.name):
                touched = sorted({(opcode, operand & 0xFF) for operand, opcode in _every_instruction(c)
                                  if (opcode >= 0x80 and opcode & 0x7F < 18)
                                  or (opcode in (0x70, 0x71, 0x72) and operand & 0xFF < 18)
                                  or (opcode == 0x1F and operand >> 8 in (0xEF, 0xF0, 0xF1, 0xF2)
                                      and operand & 0xFF < 18)
                                  or (opcode == 0x07 and operand & 0xFF in (0xF8, 0xF9))})
                # The one variable of the eighteen a configuration names is 17, read.
                self.assertEqual(touched, [(0x71, 17)])

    def test_variable_17_is_read_before_each_of_four_pins(self):
        for c in slots._configs():
            with self.subTest(c.name):
                tests = [c.action_list(i) for i in range(len(c.lists()))
                         if any(opc == 0x71 and op & 0xFF == 17 for op, opc in c.action_list(i))]
                self.assertEqual(len(tests), 4)
                pins = set()
                for body in tests:
                    # Two arms after a flagged "not equal": the same pin switched one way or the other.
                    self.assertEqual(body[0], (0x8111, 0x71))
                    self.assertEqual([(op >> 8, opc) for op, opc in body[1:]], [(0xE9, 0x1F)] * 2)
                    self.assertEqual(body[1][0] & 0xF0, body[2][0] & 0xF0)
                    pins.add(body[1][0] & 0xF0)
                self.assertEqual(pins, {0x00, 0x10, 0x20, 0x30})

    def test_the_clock_records_hold_the_build_stamp(self):
        for c in slots._configs():
            with self.subTest(c.name):
                at = c.pointer(3)
                self.assertEqual(c.u(at, 2), 0xADDF)
                second, minute, hour, day, weekday, month, year = (c.u(at + 2 + i, 1) for i in range(7))
                records = _records(c)[:7]
                self.assertEqual([first for first, _, _ in records],
                                 [second, minute, hour, day, weekday, month, year])
                self.assertEqual([top for _, top, _ in records], list(CLOCK_MAXIMA) + [year + 1])

    def test_records_7_to_17_are_the_harmony_600_650_and_700s(self):
        lab.require('h600_config')
        h600 = gspm.parse(lab.load('h600_config'))
        first = lambda r: int.from_bytes(h600.blob[h600.blob_offset_of(r.address):][:2], 'little')
        arch14 = [(first(r), r.second) for r in h600.state_records()[7:18]]
        for c in slots._configs():
            with self.subTest(c.name):
                self.assertEqual([(first, top) for first, top, _ in _records(c)[7:18]], arch14)
        self.assertEqual(arch14, [(0, 2), (0, 3), (5, 7), (0, 7), (0, 32), (0, 1), (0, 32), (1, 1),
                                  (0, 3), (0, 1), (0, 3)])


class TheStartFillsTheTimeSinceTheBuild(unittest.TestCase):
    def test_three_bytes_at_index_10_of_raw_slot_3_go_to_the_ticks_counter(self):
        code = _code()
        self.assertEqual(_text(code, 0x13BDE, 18),
                         ['MOVLB 0x6', 'BTFSS 0x68e,2', 'BRA 0x13c0a', 'BCF LATF,7', 'MOVLB 0x6',
                          'MOVLW 0x03', 'MOVWF 0x6dd', 'CALL 0x10bce', 'MOVLB 0x6', 'MOVLW 0x0a',
                          'MOVWF 0x6d9', 'CALL 0x10b88', 'MOVLB 0x6', 'MOVLW 0x6c', 'MOVWF 0x6d5',
                          'MOVLW 0x03', 'MOVWF 0x6d6', 'CALL 0x10ace'])
        # The tick adds its count to that counter first.
        self.assertEqual(_text(code, 0x13C12, 6),
                         ['MOVFF 0x373,0x014', 'CLRF 0x15', 'CLRF 0x16', 'MOVF 0x14,W', 'MOVLB 0x3',
                          'ADDWF 0x36c,F'])

    def test_it_loads_ef_00_00_in_every_configuration(self):
        for c in slots._configs():
            at = c.pointer(3) - slots.CONFIG_BASE
            self.assertEqual(c.blob[at + 10:at + 13], b'\xef\x00\x00', c.name)


class TheClockIsServedToOneRequest(unittest.TestCase):
    def test_the_pair_0x03_0xc0_is_answered_with_the_time_and_the_date(self):
        code = _code()
        self.assertEqual(_text(code, 0x0E4C2, 8),
                         ['MOVLW 0x03', 'MOVLB 0x3', 'XORWF 0x331,W', 'BNZ 0x0e4ce', 'MOVLW 0xc0',
                          'XORWF 0x32,B,W', 'BNZ 0x0e4d2', 'BRA 0x0ec0c'])
        self.assertEqual(_text(code, 0x0EC0C, 6)[-1], 'RCALL 0x0f3be')
        self.assertEqual(_text(code, CLOCK_REPLY, 6),
                         ['MOVFF 0x108,0xc00', 'MOVFF 0x109,0xc01', 'MOVFF 0x10a,0xc02',
                          'MOVFF 0x10b,0xc03', 'MOVFF 0x10d,0xc04', 'MOVFF 0x10e,0xc05'])


if __name__ == '__main__':
    unittest.main()
