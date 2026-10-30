#!/usr/bin/env python3
"""The Harmony 300 and 350's raw slots 5, 6, 8, 9, 12 and 14, read where the 1.4 firmware seeks them.

`todo-compile-350.md` 2.1. Section 259 found the family's section seeker at `0x10BCE`, `0x0B + 4 * slot`
from a literal its fourteen callers load, and named six slots from the configuration's side; sections 260
to 265 named two more and measured raw 6 at devices plus one and raw 8 at twice the devices without
naming either. This file reads the callers for the six that were left, and the result is that three of
them are base slots this reference already describes on other architectures, one is this family's own,
one is a table no configuration fills, and one is never read.

| raw | what it is | its reader |
|---|---|---|
| 5 | **the start up event table**, this family's own: a `u8` count and one action list instruction per event. The firmware queues entry 1 once, when a configuration passes the validator at start | `0x11D48`, one caller |
| 6 | **base slot 9, the key map table**: a `u8` count and `u24` pointers to tagged lists, looked up through the key map stack. Entry 0 is the key table after `LWJL`, entries 1 to N one map per device | `0x1AB24` |
| 8 | **base slot 12, the timer table**: a `u8` count and `u24` pointers to seven byte records | `0x16A2E` and `0x1694A` |
| 9 | **base slot 13, the state variable table**: four `u16` header words and `u24` pointers to records | `0x16E6C` and `0x17360` |
| 12 | **a digit entry table**: the place opcode `0x74`'s digits are matched or turned into a number. Empty in all five configurations | `0x19D56` and `0x19DC8` |
| 14 | NULL in every configuration, and nothing in the image seeks it | none |

**Sources checked first.** Logitech's client was not consulted: it builds no section of this container,
it hands the service's compiled file to the remote, and the slots are the firmware's to read. The
archive: sections 259 (the seeker and its fourteen callers), 260 and 261 (raw 13, the action lists),
262 to 265 (raw 6 and 8 measured, the activity candidate for raw 6's extra entry, the compiler's age
behind raw 8's zero), 276 (the state variable bound, which names `0x172A4` on this image), 34, 39 and
176 (base slot 9's stack on arch 14), 43 (base slot 12), 35, 138 and 274 (base slot 13 and its seeder),
74 (opcode `0x74` is the One's digit accumulator, and nothing in the corpus issues it). The reference:
`reference/config-format/modes-and-keys.md`, `state.md` and `container.md`, and this family's
`memory.md` and `firmware.md`. The library: `ARCH16_SLOT_MAP` in `packages/codec/src/gspm.ts`, which
names none of these six and is not changed here.

**The processor.** The image is an ordinary PIC18 program, and which part it runs on is not checked,
the family's README. Every claim below is about the instruction set, data memory addresses and code
addresses, which do not depend on the part; where a listing names a special function register it does
so through the 67J50 map, and nothing here rests on that name.

## How the configuration is read

The configuration sits on the external flash, and every read of it goes through `TBLPTR` used as the
flash address: `0x185CC` opens a read at `TBLPTR`, `0x10A86` returns the next byte and advances,
`0x10A70` reads a `u24` into `TBLPTR` and reopens there, which is following a pointer, and `0x10C2A`
adds `3 * [0x6E1] + [0x6E0]` to `TBLPTR`, which is indexing a `u24` array past a header of `[0x6E0]`
bytes. `0x10A9E` and `0x10ACE` read two and three bytes into a buffer whose address the caller sets in
`0x6D3` or `0x6D5`. So a caller's `MOVLW n; MOVWF 0x6E0` is the header length of the array it indexes,
and that literal is what states each section's layout below.

`0x1111C` reads three bytes, one action list instruction, and hands them to `0x110D0`, which drops an
all zero instruction and appends anything else to the action queue, the same rule as every other
architecture's queue.

## Raw slot 5, the start up event table

* `0x11D48` loads 5, seeks, reads the `u8` count, compares the event in `0x2B6` with it and returns when
  the event is not below it, then indexes with a header of 0 bytes past the count and queues the
  instruction it lands on. **One caller, `0x162B8`**, in the validator's tail: it runs only with the
  verdict bit set, loads 1 into `0x2B6`, the variable's one writer in the image, and calls the reader.
  So **a configuration that passes at start has its entry 1 queued, once**. No other direct reference
  reaches the reader and no other instruction writes the event, so on this image no entry other than 1
  is raised; a computed jump or an indirect write was not excluded.
* In all five configurations: 11 entries, `1 + 3 * 11` bytes, which is exactly the distance to raw 6's
  table. Every entry is a call of an action list (`0x7F`). Entry 1 calls list 0; entries 2, 3 and 4
  call lists 1, 2 and 3; the other seven call one list that is empty. Lists 1 to 3 are list 0 without
  its last instruction, and list 0's last instruction selects a key map entry with `0x1F` band `0xFF`.
  What raises entries 2 to 4 is not read.
* **What a person sees**: after a configuration is accepted, list 0 calls the list that pushes the key
  maps (`0x1F FE00`, then `FEFE`) and selects one device's map, and in all five configurations that
  map sends from infrared group 0 alone. So, read rather than watched on a remote, the remote starts in
  the device mode of the device in group 0: the TV key's device on the Harmony 300 by section 265's
  mapping, and the television on the bench Harmony 350 by section 263's. Neither identification is
  re-measured here; the test asserts group 0.
* It is **not** base slot 4, which has the same role on other architectures, the firmware's own events,
  and a different layout: there a fallback, a `u16` count and `{key; mode}` pairs, here a bare list of
  instructions. Mapping it to base slot 4 would hand that reader the wrong structure. The blind
  reviewer of this finding compared it with base slot 8 instead, whose leading list is the start up
  list on other models; base slot 8 is an array of list pointers and this is instructions, so that is
  not taken either, and the slot stays out of the map.

**The two reviewers, before the commit.** A blind re-measurement, given the question and not this
answer, found the same seeker callers, the same counts per configuration, raw 6 at the devices plus one
with entry 0 at `0x02004B` and an empty map where a device has no commands, raw 8 at twice the devices
on four files, the same `0xFF`, `0xFE` and `0xEB` operands, and raw 14 unread. It read raw 8's record as
a `u32` duration, where the start's bit 0 test of the first byte makes it a kind byte and a `u24`, and it
left 21 bytes after raw 9's table unexplained, which the test below closes on raw 10's first group. It
also noted that the raw 12 reader never reads the byte it skips, so "a count" is the other tables' shape
and not this reader's. The prose audit narrowed six sentences: the group 0 device's identity is section
265's and not re-measured, a device key's timer binding is not shown to be the press, a map is not one
device's codes alone, the empty map's owner is not shown, the activity writes state on four files and
not five, and raw 14's absence is of direct references.

## Raw slot 6 is base slot 9, the key map table

* `0x1AB24` returns at once when the verdict is clear or the entry in `0x722` is `0xFF`, else loads 6,
  seeks, indexes by `0x722` with a header of **1** byte, the `u8` count, follows the pointer and reads a
  tagged list in both of base slot 9's forms: a nonzero first byte is the count of four byte entries, a
  zero is followed by a count of five byte entries whose flags byte's bit 0, after a match, lets the walk
  carry on. A matching tag queues the instruction.
* **Its callers are base slot 9's mechanism.** The key lookup at `0x1113A` walks a byte stack from the
  top and switches on each byte (the chain at `0x11184`): `0xFE` looks up the running entry in `0x218`,
  `0xFC` the entry in `0x219` that `0x1F` band `0xE8` sets, `0xFD` ends the walk, and any other byte is
  itself an index. `0x1F` band `0xFF` stores its operand in `0x2A9` and calls `0x11234`, which runs the
  outgoing entry with tag 2, makes the new one running and runs it with tag 1. That is base slot 9 on
  the Harmony 600, 650 and 700, sections 39, 176 and 333, with one difference: `0xFD`, the current mode
  there, is the bottom of the walk here, since this family has no mode table.
* In all five configurations the count is **the archive's device count plus one**, 4, 5, 4, 3 and 5.
  **The extra entry is entry 0, and it is the key table**: its pointer is the container's own
  `0x020000 + 0x4B`, the list after `LWJL` at `0x47`. The configuration never selects entry 0 with band
  `0xFF`; list 0 pushes it with `0x1F FE00` at start, under the running entry, so it is always looked up
  last. **So the extra entry is not the activity**, and section 265's candidate is answered no.
* Entries 1 to N are the devices' maps, one per device. Entry 0 binds one key event per device whose
  list does nothing but select an entry, possibly after a `0x07` or a `0x1F` band `0xE9`, and those
  bindings select entries 1 to N exactly once each, on all five. A map is not one device's codes alone:
  on the Harmony 350 several also send group 0's. On the two configurations whose archive has one
  device with no infrared commands, exactly one map is empty, in the wide form; which device owns it is
  not shown, since no index mapping between the archive's order and the entries fits both.
* **The activity is a binding in entry 0, not an entry.** Exactly one other binding of entry 0 selects
  an entry: it reaches lists that send codes, in all five, and write state variables, in four, and
  ends by selecting one of the devices' maps, on the same tag, `0x86`, in all five. That is an activity's start without a keypad map
  of its own, which is what the Harmony 300's `PartiallySetupActivities` and the description of it as a
  shortcut say. Tag `0x86` is a press of code 6, which `tests/test_harmony_350_keys.py` reads as Watch TV,
  the only key the face gives an activity; that was not known when this was written.

## Raw slot 8 is base slot 12, the timer table

* `0x1F` band `0xEB` stores its operand in `0x6FB` and calls `0x16A2E`, band `0xEA` stores it in `0x6FC`
  and calls `0x16BDC`: start and cancel, base slot 12's two bands. The start looks for a free one of
  **four** slots (`MOVLW 0x04` at `0x16A34`), loads 8, seeks, indexes by `0x6FB` with a header of 0 bytes
  past the count, follows the pointer and reads a kind byte, whose bit 0 it tests, then a `u24` duration.
  When a timer expires, the pass at `0x1694A`, which returns at once while the verdict is clear, seeks 8
  again with the index the slot kept, skips four bytes and queues the three after them. That is base slot 12's seven byte record, `kind; u24 duration; instruction`, and
  its four concurrent timers.
* In the five configurations: 6, 8, 6, 0 and 8 records, `1 + 3 * count` bytes each table, every record
  of kind 0 with a duration of 400 or 600, every instruction `0x1F` band `0xE9`. On the three Harmony 350
  configurations the indices band `0xEB` starts are exactly 0 to `count - 1`, two from one binding of each
  device key (tags `0x81`, `0x84`, `0x85` and `0x87`; which key event that is, is not checked); on both
  Harmony 300 configurations nothing starts a timer, and one of them holds eight anyway. The count is
  twice the archive's devices on four of the five and zero on the fifth, the 2011 file, which is section
  265's reading that it follows the compiler; on the 300 those timers are never run.
* Band `0xE9` switches one of four output pins, chosen by the operand's high nibble, on for a low byte
  whose bits 1 to 3 are zero and off otherwise (`0x14568`). What the pins drive, and the unit of a kind
  0 duration, are not checked.

## Raw slot 9 is base slot 13, the state variable table

* The seeder at `0x16E6C` loads 9, seeks, reads four `u16` words: the count into `0xC05`, `narrow` into
  `0x1C8`, `wide` into `0x1C9`, and the fourth into a scratch buffer nothing reads. It then walks the
  records with a header of **8** bytes, skips a record whose `first` is `0xFEFE`, and seeds the rest
  unless a check over data memory (`0x16E3C`, an XOR seeded `0xA5`, compared with `0x1CA`) says memory
  survived. Above `narrow + 2 * wide` it paints `0xFE` up to `0xC0` from data memory `0x108`, and from 18
  when the verdict is clear. `0x17360` loads 9 and indexes by `0x1DD` with the same header of 8, the
  record a state write walks. That is base slot 13's header and its seeder on the Harmony 600, sections
  274, 276 and 284, ceiling `0xC0` included.
* In all five configurations `narrow + wide == count`, `narrow again == narrow` and `wide` is 1; the
  table is `8 + 3 * count` bytes and ends exactly where raw 10's first parameter group begins; and every
  record read in base slot 13's layout keeps every non negative `from` and `to` inside its own `max`.
* Which variables the firmware owns, where they live and whether the clock runs is `todo-compile-350.md`
  2.5 and is not read here.

## Raw slot 12, a digit entry table nothing fills

* `0x3F` band `0xE0` stores its operand in `0x3AB`, sets `0x3AC` and calls `0x19D56`; band `0xE1` does the
  same with `0x3AC` cleared, which stops the entry (the chain at `0x117E4`). `0x19D56` loads 12, seeks,
  indexes by `0x3AB` with a header of 1 byte, follows the pointer and reads three bytes into `0x3A7`,
  `0x3A6` and `0x3A8`. Opcode `0x74`, which this image does not tell apart from `0x75`, hands its operand
  to `0x19CF8`, which shifts four bits into the 24 bit register `0x3A3` to `0x3A5`, ORs the digit in and
  counts it in `0x3A2`, the digit accumulator section 74 read on the Harmony One. `0x19DC8` then either
  turns the digits into a number in the accumulator or matches them against a table in the record, by
  bit 0 of the first byte, and queues an instruction.
* In all five configurations raw 12 is two zero bytes, and no instruction anywhere issues
  `0x74`, `0x75` or `0x3F` bands `0xE0` to `0xE3`. So the feature is in the firmware and unused, and the
  record layout beyond its first three bytes has no configuration to be checked against. It is not
  base slot 17, which section 259 offered on its two byte width.

## Raw slot 14 is never read

* The fourteen calls of the seeker load 3 to 12, and the validator's own reads of the header through
  `0x10BBA` ask for offsets 0, 4 and `0x47` only; raw 14's pointer sits at `0x0B + 4 * 14 = 0x43`. It is
  NULL in all five configurations.

**Which architectures.** Arch 16 alone, the one 1.4 image, which Logitech's package names for skins 78,
79 and 104, so the Harmony 300 and the Harmony 350 alike. The five configurations are both models and two
generations of the compiler.

**Standing.** Read in the firmware and measured in configurations. Nothing was sent to a remote.
"""
import io
import unittest
import zipfile

import lab
from harmony.pic18 import chains, disasm, isa, trace

BASE = 0x9000
CONFIG_BASE = 0x020000

SEEKER = 0x10BCE
HEADER_READ = 0x10BBA
QUEUE_ONE = 0x1111C
QUEUE_APPEND = 0x110D0

EVENT_READER = 0x11D48
EVENT_CALL = 0x162B8
EVENT = 0x2B6

KEY_MAP_READER = 0x1AB24
KEY_LOOKUP_SWITCH = 0x11184
SELECT_ENTRY = 0x11234

TIMER_START = 0x16A2E
TIMER_BANDS = 0x11A1C
TIMER_EXPIRY_SEEK = 0x169BC

SEEDER_SEEK = 0x16E8E
SEEDER_LOOP = 0x16EE0
SEEDER_FILL = 0x16F32
RECORD_SEEK = 0x17360

DIGIT_READER = 0x19D56
DIGIT_SWITCH = 0x117E4
DIGIT_OPCODE = 0x114A0
DIGIT_SHIFT = 0x19D06

CONFIGS = ('h350_config', 'h350_programmed_config', 'h350_three_devices_config',
           'h300_config', 'h300_programmed_config')
HARMONY_350 = CONFIGS[:3]


def _code():
    return lab.load('h350_code')


def _text(code, start, count):
    """The listing's instruction text, bank resolved from `start` on, without address and bytes."""
    lines = []
    for line in disasm.disassemble(code, BASE, start, count):
        tokens = line.split(':', 1)[1].split()
        while tokens and len(tokens[0]) == 2 and all(c in '0123456789abcdef' for c in tokens[0]):
            tokens.pop(0)
        lines.append(' '.join(tokens))
    return lines


def _writes(code, address):
    return [a.addr for a in trace.trace(code, BASE, [address])[address] if 'WRITE' in a.kind]


class _Config:
    """A configuration of this family read by raw slot, with no slot map in between."""

    def __init__(self, name):
        self.name = name
        self.blob = lab.load(name)

    def u(self, address, width):
        at = address - CONFIG_BASE
        return int.from_bytes(self.blob[at:at + width], 'little')

    def pointer(self, slot):
        return self.u(CONFIG_BASE + 0x0B + 4 * slot + 1, 3)

    def array(self, slot):
        """A `u8` count and `u24` pointers, the shape of raw slots 5's neighbours 6, 8 and 12."""
        at = self.pointer(slot)
        return [self.u(at + 1 + 3 * i, 3) for i in range(self.u(at, 1))]

    def lists(self):
        at = self.pointer(7)
        return [self.u(at + 2 + 3 * i, 3) for i in range(self.u(at, 2))]

    def action_list(self, index):
        at = self.lists()[index]
        return [(self.u(at + 1 + 3 * k, 2), self.u(at + 3 + 3 * k, 1)) for k in range(self.u(at, 1))]

    def instructions(self):
        """Every instruction of every action list and every key map entry, as (operand, opcode)."""
        out = [one for i in range(len(self.lists())) for one in self.action_list(i)]
        for entry in self.array(6):
            out.extend((operand, opcode) for _, _, operand, opcode in self.tagged(entry))
        return out

    def tagged(self, at):
        """Base slot 9's tagged list in either form, as (flags, tag, operand, opcode)."""
        count = self.u(at, 1)
        if count:
            return [(0, self.u(at + 1 + 4 * k, 1), self.u(at + 2 + 4 * k, 2), self.u(at + 4 + 4 * k, 1))
                    for k in range(count)]
        return [(self.u(at + 2 + 5 * k, 1), self.u(at + 3 + 5 * k, 1), self.u(at + 4 + 5 * k, 2),
                 self.u(at + 6 + 5 * k, 1)) for k in range(self.u(at + 1, 1))]

    def sends(self, instructions, seen=None):
        """The infrared groups a run of instructions reaches, through the lists it calls."""
        seen = set() if seen is None else seen
        groups = set()
        for operand, opcode in instructions:
            if opcode == 0x7D:
                groups.add(operand >> 8)
            elif opcode == 0x7F and operand not in seen:
                seen.add(operand)
                groups |= self.sends(self.action_list(operand), seen)
        return groups

    def writes_state(self, instructions, seen=None):
        """Whether a run of instructions writes a state variable, opcode 0x80 and up, through calls."""
        seen = set() if seen is None else seen
        for operand, opcode in instructions:
            if opcode >= 0x80:
                return True
            if opcode == 0x7F and operand not in seen:
                seen.add(operand)
                if self.writes_state(self.action_list(operand), seen):
                    return True
        return False

    def archive_devices(self):
        """Commands per device in raw 13's metadata archive, section 260, independent of raw 6."""
        at = self.pointer(13)
        length = self.u(at, 4)
        start = at - CONFIG_BASE + 4
        with zipfile.ZipFile(io.BytesIO(self.blob[start:start + length])) as archive:
            xml = archive.read(archive.namelist()[0]).decode('utf-8')
        devices = xml[xml.index('<Devices>'):xml.index('</Devices>')]
        return [block.count('<Command>') for block in devices.split('<Device>')[1:]]


def _configs():
    lab.require(*CONFIGS)
    return [_Config(name) for name in CONFIGS]


class TheReadPrimitivesQueueOneInstruction(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_0x1111c_reads_three_bytes_and_appends_them(self):
        self.assertEqual(_text(self.code, QUEUE_ONE, 8),
                         ['MOVLB 0x6', 'MOVLW 0x1c', 'MOVWF 0x6d5', 'MOVLW 0x0c', 'MOVWF 0x6d6',
                          'CALL 0x10ace', 'MOVFF 0xc1c,0x2a2', 'MOVFF 0xc1d,0x2a3'])
        # And the append drops an all zero instruction before anything else.
        self.assertEqual(_text(self.code, QUEUE_APPEND, 5),
                         ['MOVLB 0x2', 'MOVF 0x2a2,W', 'IORWF 0x2a3,W', 'IORWF 0x2a4,W', 'BZ 0x110f6'])


class RawSlot5IsTheStartUpEventTable(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_reader_seeks_raw_5_and_queues_the_entry_the_event_names(self):
        self.assertEqual(_text(self.code, EVENT_READER, 15)[2:],
                         ['MOVLW 0x05', 'MOVWF 0x6dd', 'CALL 0x10bce', 'CALL 0x10a86', 'MOVWF 0x14',
                          'MOVLB 0x2', 'MOVF 0x2b6,W', 'BSF STATUS,0', 'SUBFWB 0x14,W', 'BC 0x11d74',
                          'MOVFF 0x2b6,0x6e1', 'MOVLB 0x6', 'CLRF 0x6e0'])
        self.assertEqual(_text(self.code, 0x11D6C, 2), ['CALL 0x10c2a', 'CALL 0x1111c'])

    def test_only_a_configuration_that_passed_at_start_raises_event_1(self):
        refs = trace.xrefs(self.code, BASE, [EVENT_READER])[EVENT_READER]
        self.assertEqual([r.addr for r in refs], [EVENT_CALL])
        self.assertEqual(_text(self.code, 0x162AC, 8),
                         ['MOVLB 0x6', 'BTFSS 0x68e,2', 'BRA 0x162c0', 'MOVLB 0x2', 'MOVLW 0x01',
                          'MOVWF 0x2b6', 'CALL 0x11d48', 'CALL 0x11212'])
        self.assertEqual(_writes(self.code, EVENT), [0x162B6])


class RawSlot5InTheConfigurations(unittest.TestCase):
    def test_eleven_calls_of_which_entry_1_starts_the_remote(self):
        for c in _configs():
            with self.subTest(c.name):
                at = c.pointer(5)
                entries = [(c.u(at + 1 + 3 * i, 2), c.u(at + 3 + 3 * i, 1)) for i in range(c.u(at, 1))]
                self.assertEqual(len(entries), 11)
                self.assertEqual(c.pointer(6) - at, 1 + 3 * 11, 'the table is not the whole section')
                self.assertEqual({opcode for _, opcode in entries}, {0x7F})
                self.assertEqual([operand for operand, _ in entries[1:5]], [0, 1, 2, 3])
                rest = {operand for i, (operand, _) in enumerate(entries) if i not in (1, 2, 3, 4)}
                self.assertEqual(len(rest), 1)
                self.assertEqual(c.action_list(rest.pop()), [])
                first = c.action_list(0)
                for index in (1, 2, 3):
                    self.assertEqual(c.action_list(index), first[:-1])
                operand, opcode = first[-1]
                self.assertEqual((opcode, operand >> 8), (0x1F, 0xFF), 'list 0 does not end in a select')

    def test_the_remote_starts_in_the_mode_of_the_device_on_group_0(self):
        for c in _configs():
            with self.subTest(c.name):
                first = c.action_list(0)
                entry = first[-1][0] & 0xFF
                self.assertEqual(c.sends([(op, opc) for _, _, op, opc in c.tagged(c.array(6)[entry])]),
                                 {0})
                # And it calls the list that pushes the key maps, entry 0 then the running entry.
                pushes = [[(operand, opcode) for operand, opcode in c.action_list(called)
                           if opcode == 0x1F and operand >> 8 == 0xFE]
                          for called, op in first if op == 0x7F]
                self.assertIn([(0xFE00, 0x1F), (0xFEFE, 0x1F)], pushes)


class RawSlot6IsBaseSlot9TheKeyMapTable(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_reader_indexes_raw_6_past_a_one_byte_count_and_follows_the_pointer(self):
        self.assertEqual(_text(self.code, KEY_MAP_READER, 20)[9:],
                         ['MOVLB 0x6', 'MOVLW 0x06', 'MOVWF 0x6dd', 'CALL 0x10bce', 'MOVFF 0x722,0x6e1',
                          'MOVLB 0x6', 'MOVLW 0x01', 'MOVWF 0x6e0', 'CALL 0x10c2a', 'CALL 0x10a70',
                          'MOVFF 0x723,0x724'])

    def test_the_key_lookup_walks_the_stack_as_base_slot_9s_does(self):
        self.assertEqual(chains.chain_table(self.code, BASE, KEY_LOOKUP_SWITCH),
                         {0xFC: 0x111AA, 0xFE: 0x11196, 0xFD: 0x11192})
        self.assertEqual(_text(self.code, 0x11196, 3),
                         ['MOVFF 0x2a8,0x723', 'MOVFF 0x218,0x722', 'CALL 0x1ab24'])
        self.assertEqual(_text(self.code, 0x111AA, 3),
                         ['MOVFF 0x2a8,0x723', 'MOVFF 0x219,0x722', 'CALL 0x1ab24'])
        # 0xFD ends the walk: its case is a branch to the routine's return.
        self.assertEqual(_text(self.code, 0x11192, 1), ['BRA 0x111d4'])
        self.assertEqual(_text(self.code, 0x111D4, 1), ['RETURN'])

    def test_band_0xff_leaves_with_tag_2_and_enters_with_tag_1(self):
        self.assertEqual(_text(self.code, 0x1189E, 2), ['MOVFF 0x2b3,0x2a9', 'RCALL 0x11234'])
        self.assertEqual(_text(self.code, SELECT_ENTRY, 12),
                         ['MOVLB 0x2', 'MOVF 0x218,W', 'SUBWF 0x2a9,W', 'BZ 0x11254', 'MOVLB 0x7',
                          'MOVLW 0x02', 'MOVWF 0x723', 'MOVFF 0x218,0x722', 'CALL 0x1ab24',
                          'MOVFF 0x2a9,0x218', 'MOVLB 0x7', 'MOVLW 0x01'])


class RawSlot6InTheConfigurations(unittest.TestCase):
    def test_one_entry_per_device_and_one_more(self):
        counts = {}
        for c in _configs():
            counts[c.name] = (len(c.array(6)), len(c.archive_devices()))
        self.assertEqual(counts, {'h350_config': (4, 3), 'h350_programmed_config': (5, 4),
                                  'h350_three_devices_config': (4, 3), 'h300_config': (3, 2),
                                  'h300_programmed_config': (5, 4)})

    def test_the_extra_entry_is_entry_0_and_it_is_the_key_table(self):
        sizes = {}
        for c in _configs():
            with self.subTest(c.name):
                self.assertEqual(c.blob[0x47:0x4B], b'LWJL')
                self.assertEqual(c.array(6)[0], CONFIG_BASE + 0x4B)
                selected = {op & 0xFF for op, opc in c.instructions() if opc == 0x1F and op >> 8 == 0xFF}
                self.assertEqual(selected, set(range(1, len(c.array(6)))), 'entry 0 is selected')
                pushed = [op & 0xFF for op, opc in c.instructions() if opc == 0x1F and op >> 8 == 0xFE]
                self.assertEqual(pushed, [0x00, 0xFE])
                sizes[c.name] = len(c.tagged(c.array(6)[0]))
        self.assertEqual(sizes, {'h350_config': 11, 'h350_programmed_config': 13,
                                 'h350_three_devices_config': 11, 'h300_config': 7,
                                 'h300_programmed_config': 9})

    def _selecting_bindings(self, c):
        """Entry 0's bindings whose list selects an entry, as (tag, list, selected entry)."""
        out = []
        for _, tag, operand, opcode in c.tagged(c.array(6)[0]):
            if opcode != 0x7F:
                continue
            body = c.action_list(operand)
            picks = [op & 0xFF for op, opc in body if opc == 0x1F and op >> 8 == 0xFF]
            if picks:
                self.assertEqual(len(picks), 1)
                out.append((tag, body, picks[0]))
        return out

    def test_a_device_key_selects_each_devices_map_once(self):
        for c in _configs():
            with self.subTest(c.name):
                plain = []
                for tag, body, pick in self._selecting_bindings(c):
                    rest = {(opc, op >> 8) for op, opc in body
                            if not (opc == 0x1F and op >> 8 == 0xFF)}
                    if rest <= {(0x07, 0xFF), (0x1F, 0xE9)}:
                        plain.append(pick)
                self.assertEqual(sorted(plain), list(range(1, len(c.array(6)))))

    def test_the_activity_is_one_binding_in_entry_0_and_not_an_entry(self):
        writes = {}
        for c in _configs():
            with self.subTest(c.name):
                busy = [(tag, pick) for tag, body, pick in self._selecting_bindings(c)
                        if any(opc in (0x7F, 0x7D, 0x7C) or opc >= 0x80 for op, opc in body)]
                self.assertEqual(len(busy), 1)
                tag, pick = busy[0]
                self.assertEqual(tag, 0x86)
                self.assertIn(pick, range(1, len(c.array(6))))
                body = next(body for t, body, _ in self._selecting_bindings(c) if t == tag)
                self.assertNotEqual(c.sends(body), set(), 'the activity sends no code')
                writes[c.name] = c.writes_state(body)
        self.assertEqual(writes, {'h350_config': True, 'h350_programmed_config': True,
                                  'h350_three_devices_config': True, 'h300_config': False,
                                  'h300_programmed_config': True})

    def test_one_map_is_empty_where_one_device_has_no_commands(self):
        found = {}
        for c in _configs():
            empty = [i for i, at in enumerate(c.array(6)) if not c.tagged(at)]
            found[c.name] = (len(empty), c.archive_devices().count(0))
            if empty:
                # The empty map is in the wide form, a zero then a count of zero.
                self.assertEqual(c.u(c.array(6)[empty[0]], 2), 0)
        self.assertEqual(found, {'h350_config': (0, 0), 'h350_programmed_config': (1, 1),
                                 'h350_three_devices_config': (1, 1), 'h300_config': (0, 0),
                                 'h300_programmed_config': (0, 0)})


class RawSlot8IsBaseSlot12TheTimerTable(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_bands_0xeb_and_0xea_start_and_cancel(self):
        self.assertEqual(_text(self.code, TIMER_BANDS, 12),
                         ['MOVLW 0xeb', 'SUBWF 0xb4,B,W', 'BNC 0x11a2c', 'MOVFF 0x2b3,0x6fb',
                          'CALL 0x16a2e', 'BRA 0x11d20', 'MOVLW 0xea', 'SUBWF 0xb4,B,W', 'BNC 0x11a3c',
                          'MOVFF 0x2b3,0x6fc', 'CALL 0x16bdc', 'BRA 0x11d20'])
        self.assertEqual(_writes(self.code, 0x6FB), [0x11A22])

    def test_the_start_takes_one_of_four_slots_and_reads_the_kind_and_the_duration(self):
        self.assertEqual(_text(self.code, 0x16A34, 1), ['MOVLW 0x04'])
        self.assertEqual(_text(self.code, 0x16A88, 20),
                         ['MOVLB 0x6', 'MOVLW 0x08', 'MOVWF 0x6dd', 'CALL 0x10bce', 'CALL 0x10a86',
                          'MOVLB 0xc', 'MOVWF 0xc02', 'MOVLB 0x6', 'MOVF 0x6fb,W', 'MOVLB 0x6',
                          'MOVWF 0x6e1', 'MOVLB 0x6', 'CLRF 0x6e0', 'CALL 0x10c2a', 'CALL 0x10a70',
                          'CALL 0x10a86', 'MOVLB 0xc', 'MOVWF 0xc01', 'MOVLB 0x6', 'MOVLW 0x03'])
        self.assertEqual(_text(self.code, 0x16AC4, 2), ['MOVLB 0xc', 'BTFSS 0xc01,0'])

    def test_expiry_skips_four_bytes_and_queues_the_three_after(self):
        self.assertEqual(_text(self.code, TIMER_EXPIRY_SEEK, 4)[1:],
                         ['MOVLW 0x08', 'MOVWF 0x6dd', 'CALL 0x10bce'])
        self.assertEqual(_text(self.code, 0x169EE, 13),
                         ['CALL 0x10c2a', 'CALL 0x10a70', 'CALL 0x10a86', 'CALL 0x10a86', 'CALL 0x10a86',
                          'CALL 0x10a86', 'MOVLB 0x6', 'MOVLW 0x01', 'MOVWF 0x6d5', 'MOVLW 0x0c',
                          'MOVWF 0x6d6', 'CALL 0x10ace', 'MOVFF 0xc01,0x29e'])
        self.assertEqual(_text(self.code, 0x16A20, 1), ['CALL 0x11000'])


class RawSlot8InTheConfigurations(unittest.TestCase):
    def test_seven_byte_records_of_kind_0_each_switching_a_pin(self):
        counts = {}
        for c in _configs():
            with self.subTest(c.name):
                records = c.array(8)
                counts[c.name] = len(records)
                for at in records:
                    kind, duration = c.u(at, 1), c.u(at + 1, 3)
                    operand, opcode = c.u(at + 4, 2), c.u(at + 6, 1)
                    self.assertEqual((kind, opcode, operand >> 8), (0, 0x1F, 0xE9))
                    self.assertIn(duration, (400, 600))
        self.assertEqual(counts, {'h350_config': 6, 'h350_programmed_config': 8,
                                  'h350_three_devices_config': 6, 'h300_config': 0,
                                  'h300_programmed_config': 8})

    def test_the_350_starts_every_timer_and_the_300_none(self):
        started = {}
        for c in _configs():
            started[c.name] = sorted({op & 0xFF for op, opc in c.instructions()
                                      if opc == 0x1F and op >> 8 == 0xEB})
            if c.name in HARMONY_350:
                self.assertEqual(started[c.name], list(range(len(c.array(8)))))
            else:
                self.assertEqual(started[c.name], [])

    def test_twice_the_devices_on_four_files_and_none_on_the_2011_one(self):
        # Records against the archive's devices, per file. The one that breaks the double is the one
        # built in 2011, which is section 265's reading; nothing here reads the compiler's age.
        found = {c.name: (len(c.array(8)), len(c.archive_devices())) for c in _configs()}
        self.assertEqual(found, {'h350_config': (6, 3), 'h350_programmed_config': (8, 4),
                                 'h350_three_devices_config': (6, 3), 'h300_config': (0, 2),
                                 'h300_programmed_config': (8, 4)})

    def test_band_0xe9_switches_one_of_four_pins(self):
        lab.require('h350_code')
        code = _code()
        self.assertEqual(_text(code, 0x11A3C, 3), ['MOVLW 0xe9', 'SUBWF 0xb4,B,W', 'BNC 0x11a66'])
        self.assertEqual(sorted(chains.chain_table(code, BASE, 0x1456C)), [0, 1, 2, 3])


class RawSlot9IsBaseSlot13TheStateVariableTable(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_the_seeder_reads_four_header_words_and_keeps_three(self):
        listing = _text(self.code, SEEDER_SEEK, 33)
        self.assertEqual(listing[:5], ['MOVLB 0x6', 'MOVLW 0x09', 'MOVWF 0x6dd', 'CALL 0x10bce',
                                       'CALL 0x10cd6'])
        kept = [line for line in listing if line.startswith('MOVFF 0xc01,')]
        self.assertEqual(kept, ['MOVFF 0xc01,0xc05', 'MOVFF 0xc01,0x1c8', 'MOVFF 0xc01,0x1c9'])
        self.assertEqual(listing.count('CALL 0x10a9e'), 4)
        # The fourth word is read and the loop starts at once, with nothing taken from it.
        self.assertEqual(_text(self.code, 0x16EDC, 3), ['CALL 0x10a9e', 'MOVLB 0xc', 'MOVF 0xc05,W'])

    def test_records_sit_past_an_eight_byte_header_and_0xfefe_is_skipped(self):
        self.assertEqual(_text(self.code, SEEDER_LOOP, 11)[4:],
                         ['CALL 0x10ce4', 'MOVFF 0xc04,0x6e1', 'MOVLB 0x6', 'MOVLW 0x08', 'MOVWF 0x6e0',
                          'CALL 0x10c2a', 'CALL 0x10a70'])
        self.assertEqual(_text(self.code, 0x16F0C, 4),
                         ['MOVLW 0xfe', 'MOVLB 0xc', 'XORWF 0xc06,W', 'BNZ 0x16f18'])
        self.assertEqual(_text(self.code, RECORD_SEEK, 8),
                         ['MOVLB 0x6', 'MOVLW 0x09', 'MOVWF 0x6dd', 'CALL 0x10bce', 'MOVFF 0x1dd,0x6e1',
                          'MOVLB 0x6', 'MOVLW 0x08', 'MOVWF 0x6e0'])

    def test_one_byte_from_a_check_over_data_memory_decides_for_every_variable(self):
        # The check: an XOR seeded 0xA5 over 0xAE bytes of data memory from 0x11A.
        self.assertEqual(_text(self.code, 0x16E3C, 11),
                         ['MOVLB 0xc', 'CLRF 0xc0a', 'MOVLW 0xa5', 'MOVWF 0xc0b', 'MOVLW 0x1a',
                          'MOVWF 0xc08', 'MOVLW 0x01', 'MOVWF 0xc09', 'MOVLW 0xae', 'SUBWF 0xc0a,W',
                          'BC 0x16e68'])
        # Compared with the stored value, its verdict goes into one byte before the loop...
        self.assertEqual(_text(self.code, 0x16E78, 9),
                         ['RCALL 0x16e3c', 'MOVLB 0x1', 'SUBWF 0x1ca,W', 'BZ 0x16e84', 'MOVLW 0x00',
                          'BRA 0x16e86', 'MOVLW 0x01', 'MOVLB 0xc', 'MOVWF 0xc03'])
        # ...and each variable is seeded only while that byte is zero.
        self.assertEqual(_text(self.code, 0x16F1A, 2), ['MOVF 0x03,B,W', 'BNZ 0x16f2c'])

    def test_the_fill_starts_at_narrow_plus_twice_wide_and_stops_at_0xc0(self):
        self.assertEqual(_text(self.code, SEEDER_FILL, 20),
                         ['BSF LATF,7', 'MOVLB 0x1', 'MOVF 0x1c9,W', 'ADDWF WREG,W', 'ADDWF 0x1c8,W',
                          'MOVLB 0xc', 'BRA 0x16f44', 'MOVLB 0xc', 'MOVLW 0x12', 'MOVWF 0xc00',
                          'MOVLW 0xc0', 'SUBWF 0xc00,W', 'BC 0x16f60', 'MOVF 0x00,B,W', 'CLRF FSR0H',
                          'ADDLW 0x08', 'MOVWF FSR0L', 'MOVLW 0x01', 'ADDWFC FSR0H,F', 'MOVLW 0xfe'])


class RawSlot9InTheConfigurations(unittest.TestCase):
    def test_the_header_and_the_records_are_base_slot_13s(self):
        counts = {}
        for c in _configs():
            with self.subTest(c.name):
                at = c.pointer(9)
                count, narrow, wide, again = (c.u(at + 2 * i, 2) for i in range(4))
                counts[c.name] = count
                self.assertEqual(narrow + wide, count)
                self.assertEqual((again, wide), (narrow, 1))
                # The table ends where raw 10's first parameter group begins, with nothing between.
                self.assertEqual(at + 8 + 3 * count, c.array(10)[0])
                for i in range(count):
                    record = c.u(at + 8 + 3 * i, 3)
                    top, transitions = c.u(record + 2, 2), c.u(record + 4, 2)
                    for k in range(transitions):
                        t = record + 7 + 8 * k
                        for value in (c.u(t + 1, 2), c.u(t + 3, 2)):
                            if value < 0x8000:
                                self.assertLessEqual(value, top, 'variable %d' % i)
        self.assertEqual(counts, {'h350_config': 24, 'h350_programmed_config': 24,
                                  'h350_three_devices_config': 23, 'h300_config': 21,
                                  'h300_programmed_config': 24})


class RawSlot12IsADigitEntryTableNothingFills(unittest.TestCase):
    def setUp(self):
        lab.require('h350_code')
        self.code = _code()

    def test_band_0xe0_arms_an_entry_and_0xe1_stops_it(self):
        self.assertEqual(chains.chain_table(self.code, BASE, DIGIT_SWITCH),
                         {0x3: 0x11816, 0x2: 0x1180C, 0x1: 0x117FE, 0x0: 0x117F6})
        self.assertEqual(_text(self.code, 0x117F6, 8),
                         ['MOVLB 0x3', 'MOVLW 0x01', 'MOVWF 0x3ac', 'BRA 0x11802', 'MOVLB 0x3',
                          'CLRF 0x3ac', 'MOVFF 0x2b3,0x3ab', 'CALL 0x19d56'])
        # That branch is opcode 0x3F's, the dispatcher's range from 0x3F up to 0x64.
        self.assertEqual(_text(self.code, 0x117BE, 3), ['MOVLW 0x3f', 'SUBWF 0xb5,B,W', 'BNC 0x11892'])

    def test_the_reader_indexes_raw_12_past_a_one_byte_count(self):
        self.assertEqual(_text(self.code, DIGIT_READER, 18),
                         ['MOVLB 0x3', 'MOVF 0x3ac,W', 'BZ 0x19da0', 'MOVFF 0x3ab,0x72e', 'BCF LATF,7',
                          'MOVLB 0x6', 'MOVLW 0x0c', 'MOVWF 0x6dd', 'CALL 0x10bce', 'MOVFF 0x3ab,0x6e1',
                          'MOVLB 0x6', 'MOVLW 0x01', 'MOVWF 0x6e0', 'CALL 0x10c2a', 'CALL 0x10a70',
                          'CALL 0x10a86', 'MOVLB 0x3', 'MOVWF 0x3a7'])

    def test_opcode_0x74_shifts_a_digit_in(self):
        self.assertEqual(_text(self.code, 0x11496, 3), ['MOVLW 0x74', 'SUBWF 0xb5,B,W', 'BC 0x114a0'])
        self.assertEqual(_text(self.code, DIGIT_OPCODE, 3),
                         ['MOVFF 0x2b3,0x3aa', 'MOVFF 0x2b4,0x3a9', 'CALL 0x19cf8'])
        self.assertEqual(_text(self.code, DIGIT_SHIFT, 10),
                         ['MOVLW 0x04', 'MOVLB 0x3', 'BCF STATUS,0', 'RLCF 0x3a3,F', 'RLCF 0x3a4,F',
                          'RLCF 0x3a5,F', 'DECF WREG,F', 'BNZ 0x19d0a', 'MOVLB 0x3', 'MOVF 0x3aa,W'])

    def test_no_configuration_fills_it_or_issues_a_digit(self):
        for c in _configs():
            with self.subTest(c.name):
                at = c.pointer(12)
                self.assertEqual(c.pointer(13) - at, 2)
                self.assertEqual(c.blob[at - CONFIG_BASE:at - CONFIG_BASE + 2], b'\x00\x00')
                used = [(op, opc) for op, opc in c.instructions()
                        if opc in (0x74, 0x75) or (opc == 0x3F and 0xE0 <= op >> 8 <= 0xE3)]
                self.assertEqual(used, [])


class RawSlot14IsNeverRead(unittest.TestCase):
    def test_no_seek_and_no_header_read_reaches_it(self):
        lab.require('h350_code')
        code = _code()
        literals = set()
        for ref in trace.xrefs(code, BASE, [SEEKER])[SEEKER]:
            self.assertEqual(_text(code, ref.addr - 4, 1)[0][:6], 'MOVLW ')
            literals.add(isa.decode(code, ref.addr - 4 - BASE, BASE).fields['k'])
        self.assertEqual(sorted(literals), list(range(3, 13)))
        # Every writer of the seeker's slot register is one of those fourteen loads or the seeker.
        self.assertEqual(len(_writes(code, 0x6DD)), 14 + 2)
        # The validator's direct reads of the header, through the routine under the seeker.
        offsets = set()
        for ref in trace.xrefs(code, BASE, [HEADER_READ])[HEADER_READ]:
            if ref.addr == 0x10BE0:
                continue
            before = _text(code, ref.addr - 2, 1)[0]
            offsets.add(0 if before.startswith('CLRF') else
                        isa.decode(code, ref.addr - 4 - BASE, BASE).fields['k'])
        self.assertEqual(offsets, {0x00, 0x04, 0x47})
        self.assertNotIn(0x0B + 4 * 14, offsets)

    def test_it_is_null_in_every_configuration(self):
        for c in _configs():
            self.assertEqual(c.pointer(14), 0, c.name)


if __name__ == '__main__':
    unittest.main()
