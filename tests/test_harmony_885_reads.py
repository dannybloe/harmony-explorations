"""
The Harmony 880 and 885's flash read: chunk sizes, two last bytes that are not flash, and a window that is
devices.

**Read in the firmware** on 4 November 2026, item 1.8 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`; the 880's differs in the skin bytes only) and, for the
special cases, in both bootloaders. No remote was opened, and `packages/usb` was read and not changed.
Decoded through `harmony.pic18.isa`.

**Sources checked before the work**: `tests/test_arch8_usb.py`, which found the read path's one table read
and that nothing on it calls the address checker, and left the two one byte cases uninterpreted;
`tests/test_harmony_885_bootloader.py`, the same cases in the bootloader and the top 8 KiB's devices;
`reference/usb-protocol/commands.md`, the odd count hazard of the Harmony One and 525; and
`packages/usb/src/protocol.ts`, the arch 8 read bound. **Logitech's client, decision 2**: neither client says
anything about these reads; the classic client reads this platform with the same `0x50` framing as every
other.

## The read

**Parse** (`0x15886`, shared with the write's announce): state 4, three address bytes and two count bytes,
no check, no reply. **Executor** (`0x15D0C`): a count of zero sends `F0 50` and ends. Otherwise one chunk per
call. With `n` the remaining count, the chunk's length is 63 when `n >= 63`, and otherwise `n + 1`
rounded down to 63, 31, 15 or 7, or left as it is below 7. **The length counts the sequence byte**, so a
chunk carries 62, 30, 14 or 6 data bytes, or the last 1 to 5. That refines what item 1.1 and
`tests/test_arch8_usb.py` said, chunks of 63, 31, 15 and 7: those are the lengths, not the data. The
header byte is `0x60` or'd with the length nibble, 63, 31 and 15 coded `0x0A`, `0x09`, `0x08`. Each data byte
is one `TBLRD*` at a 24 bit address with no mask (`0x1A29C`). **Advance** (`0x15F5E`): the sequence plus
`0x10`, which with the executor's own increment steps it by `0x11`, the library's measured
`FLASH_SEQUENCE_STEP`; the count minus the chunk's data bytes and the address plus them, 24 bit with carry.

**No odd count hang.** Every chunk's data count is between 1 and what remains, the byte loop counts down by
one, and the advance subtracts exactly what was sent, so the count reaches zero for every value: the model
below runs all 65536. The Harmony One's hang is a loop stepping by two past zero; nothing here steps by more
than one. A remote's behaviour on an odd count is not measured.

## Two last bytes that are not flash

The executor tests the chunk's start address against `0x000104` and `0x000105` **and** its data count
against one (`0x15DBC`, `0x15DF2`). A chunk of one data byte happens only when one byte remains, so it is
always a read's **last** byte, and since every earlier chunk carries an even count it needs an **odd**
count. A longer chunk starting there is an ordinary fetch.

* **`0x000104`** returns the newest entry of the hardware log at `0x000140` to `0x000147` instead of the
  flash byte (`SETF 0x106`, `CALL 0x182FA`: the first byte from `0x000147` down that is not `0xFF`, or `0xFF`).
  It is the call the version reply makes for its hardware field (`0x11C3E` from `0x15C5A`), so a lone read
  of `0x104` returns the version block's second byte. In both published bootloader images the flash byte at
  `0x000104` is `0x18`; the 885's newest log entry is `0x21`, the 880's `0x18`.
* **`0x000105` takes a measurement** (`0x11C1C` to `0x11BBE`): it drives bit 4 of the latch at `0xF87` high,
  runs eight conversions of the analogue converter on channel 1, sums and divides by eight, keeps ten bits,
  drives the pin low again, and returns the result divided by four. It is the one read that acts on the
  hardware. That the registers are the classic PIC18 port and converter is inferred from their layout, not
  checked in a datasheet; what channel 1 measures is not identified.

Both bootloaders hold the same two cases, reaching the same log reader and the same measurement
(`tests/test_harmony_885_bootloader.py`), so a remote held in its bootloader behaves the same. The
bootloader's executor is a different layout of the same logic and was compared at those cases only. The
reading's result note said instruction for instruction; a comparison here found the layouts differ, so that
was not landed.

## Where a read can go

**The address is not masked**: the three bytes go into the table pointer unchanged and increment with a
full 24 bit carry, so a read that starts below `0x200000` and runs past it continues above it. The top
8 KiB below `0x200000` is devices (item 1.1): the keypad latches at `0x1FE040` and `0x1FE041`, the USB
controller's data and index at `0x1FE080` and `0x1FE081`, the display controller's command and data at
`0x1FE0C0` and `0x1FE0C1`, and the RAM window from `0x1FFE00`. A read there is a bus cycle on a device: of
the display's data port it would, on the controller family its commands fit, advance the controller's
address pointer, and of the USB controller's data port it reads whichever register is selected. Inferred,
not checked. **Above `0x1FFFFF`** the processor decides: by the PIC18 family the table pointer is 22 bits, so
`0x200000` to `0x3FFFFF` is the configuration space and `0x400000` up aliases the bottom 4 MiB, `0x400105`
included. Inferred from the family, not checked against the part.

## The safe window, and what the library would bound

**Safe to read: `0x000000` to `0x1FDFFF`**, all flash, with one rule: do not end a transfer at `0x000104` or
`0x000105` with an odd count. A whole region read in `0x8000` transfers from any `0x8000` boundary never meets
them, and neither does the identity read, 64 bytes from `0x000110` (chunks of 62 and 2): asserted on the
model. `readFlash` in `packages/usb` checks only where a read **starts**, by its top byte, so
`readFlash(0x1F8000, 0x8000)` would read the whole device window and `readFlash(0x1FFFF0, 0x8000)` would run
past `0x200000`; an arch 8 bound of address plus count at `0x1FE000`, and a refusal of an odd read ending at
`0x000105`, are proposals for whoever decides on `packages/usb`. No odd count rail is needed on this
platform.

## Reviewers

Recorded in the commit that landed this file.
"""
import unittest

import lab
from test_harmony_885_start_check import BASE, application, listing, transfers_to, window

READ_PARSE = 0x15886
EXECUTOR = 0x15D0C
ADVANCE = 0x15F5E
FETCH = 0x1A29C
LOG_READER = 0x182FA
MEASUREMENT = 0x11BBE
SPECIAL = {0x000104: 0x15DBC, 0x000105: 0x15DF2}
DEVICE_WINDOW = 0x1FE000


def chunks(count):
    """The data bytes of each chunk a read of `count` sends, by the executor's rule as asserted below."""
    out = []
    n = count
    while n:
        length = 63 if n >= 63 else n + 1
        for size in (63, 31, 15, 7):
            if length >= size:
                length = size
                break
        out.append(length - 1)
        n -= length - 1
    return out


def substituted(start, count):
    """The addresses a read would answer from a routine rather than from flash."""
    hits, address = [], start
    for data in chunks(count):
        if data == 1 and address in SPECIAL:
            hits.append(address)
        address += data
    return hits


class TheChunks(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_length_is_63_or_n_plus_1_rounded_down_to_63_31_15_7(self):
        self.assertEqual(window(self.code, 0x15D34, 30),
                         ['MOVLW 0x3f', 'SUBWF 0x5e,W', 'MOVLW 0x00', 'SUBWFB 0x5f,W', 'BC 0x15d68', 'INCF 0x5e,W',
                          'MOVLB 0x2', 'MOVWF 0xbc', 'MOVLW 0x3f', 'SUBWF 0xbc,W', 'BC 0x15d6a', 'MOVLW 0x1f',
                          'SUBWF 0xbc,W', 'BNC 0x15d54', 'MOVLW 0x1f', 'BRA 0x15d6c', 'MOVLW 0x0f', 'SUBWF 0xbc,W',
                          'BNC 0x15d5e', 'MOVLW 0x0f', 'BRA 0x15d6c', 'MOVLW 0x07', 'SUBWF 0xbc,W', 'BNC 0x15d6e',
                          'MOVLW 0x07', 'BRA 0x15d6c', 'MOVLB 0x2', 'MOVLW 0x3f', 'MOVWF 0xbc', 'DECF 0xbc,W'])
        # The data count is the length less one, kept apart from the length; the sequence counts up.
        self.assertEqual(window(self.code, 0x15D70, 3), ['MOVLB 0x2', 'MOVWF 0x60', 'INCF 0x61'])

    def test_a_count_of_zero_answers_F0_50(self):
        self.assertEqual(window(self.code, EXECUTOR, 3), ['MOVF 0x5e,W', 'IORWF 0x5f,W', 'BNZ 0x15d34'])
        self.assertEqual(window(self.code, 0x15D20, 2), ['MOVLB 0x1', 'MOVLW 0x50'])

    def test_each_byte_is_one_unmasked_table_read_and_the_loop_counts_down_by_one(self):
        self.assertEqual(window(self.code, FETCH, 4),
                         ['MOVFF 0x080,0xff6', 'MOVFF 0x081,0xff7', 'MOVFF 0x082,0xff8', 'TBLRD*'])
        self.assertEqual(window(self.code, 0x15E58, 5),
                         ['MOVLB 0x2', 'DECF 0xbd', 'MOVF 0xbd,W', 'SUBLW 0x00', 'BNC 0x15e38'])

    def test_the_advance_steps_the_sequence_and_moves_count_and_address_by_the_data(self):
        self.assertEqual(window(self.code, 0x15F70, 23),
                         ['MOVLW 0x10', 'ADDWF 0x61', 'MOVF 0x5e,W', 'IORWF 0x5f,W', 'BNZ 0x15f7e', 'CLRF 0x62',
                          'RETURN', 'MOVF 0x60,W', 'MOVWF 0x000', 'CLRF 0x001', 'MOVF 0x000,W', 'SUBWF 0x5e',
                          'MOVF 0x001,W', 'SUBWFB 0x5f', 'CLRF 0x001', 'CLRF 0x002', 'MOVF 0x000,W', 'ADDWF 0x5b',
                          'MOVF 0x001,W', 'ADDWFC 0x5c', 'MOVF 0x002,W', 'ADDWFC 0x5d', 'RETURN'])
        self.assertEqual(0x10 + 1, 0x11)

    def test_every_count_ends_and_sends_exactly_its_bytes(self):
        for count in range(0x10000):
            sizes = chunks(count)
            if sum(sizes) != count or any(s < 1 for s in sizes):
                self.fail('count %d' % count)
        self.assertEqual(chunks(0x105), [62, 62, 62, 62, 6, 6, 1])
        self.assertEqual(chunks(64), [62, 2])
        self.assertEqual(sorted({s for c in range(1, 200) for s in chunks(c)}), [1, 2, 3, 4, 5, 6, 14, 30, 62])


class TwoLastBytesAreNotFlash(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_test_is_the_address_and_a_single_data_byte(self):
        for address, at in SPECIAL.items():
            with self.subTest(hex(address)):
                skip = '0x15df2' if address == 0x104 else '0x15e2c'
                self.assertEqual(window(self.code, at, 12),
                                 ['MOVLW 0x%02x' % (address & 0xFF), 'MOVLB 0x2', 'XORWF 0x5b,W', 'BNZ %s' % skip,
                                  'MOVLW 0x01', 'XORWF 0x5c,W', 'BNZ %s' % skip, 'MOVF 0x5d,W', 'BNZ %s' % skip,
                                  'MOVLB 0x2', 'DECF 0xbd,W', 'BNZ %s' % skip])

    def test_0x104_returns_the_hardware_log_the_version_reply_also_reads(self):
        self.assertEqual(window(self.code, 0x15DD4, 3), ['MOVLB 0x1', 'SETF 0x06', 'CALL 0x182fa'])
        self.assertEqual(window(self.code, 0x11C3E, 3), ['MOVLB 0x1', 'SETF 0x06', 'GOTO 0x182fa'])
        self.assertEqual(window(self.code, 0x15C5A, 1), ['CALL 0x11c3e'])
        # From 0x000140 plus seven down, the first that is not 0xFF.
        self.assertEqual(window(self.code, LOG_READER, 6),
                         ['MOVLB 0x2', 'MOVLW 0x40', 'MOVWF 0xcc', 'MOVLW 0x01', 'MOVWF 0xcd', 'CLRF 0xce'])
        self.assertEqual(window(self.code, 0x18326, 2), ['MOVLW 0x07', 'MOVLB 0x2'])
        self.assertEqual(window(self.code, 0x18346, 4), ['TBLRD*', 'MOVF 0xff5,W', 'SUBLW 0xff', 'BZ 0x18360'])

    def test_0x105_switches_a_pin_on_averages_eight_conversions_and_switches_it_off(self):
        self.assertEqual(window(self.code, 0x15E0A, 1), ['CALL 0x11c1c'])
        self.assertEqual(transfers_to(self.code, 0x11C1C), [0x15E0A])
        self.assertEqual(window(self.code, 0x11C1C, 1), ['RCALL 0x11bbe'])
        self.assertEqual(window(self.code, 0x11BA2, 4), ['BSF 0xf87,4', 'MOVLW 0xef', 'ANDWF 0xf99,W', 'MOVWF 0xf99'])
        self.assertEqual(window(self.code, 0x11BAC, 1), ['BCF 0xf87,4'])
        body = window(self.code, MEASUREMENT, 40)
        self.assertEqual(body[3], 'RCALL 0x11ba2')
        self.assertEqual(body[5:8], ['CLRF 0xc3', 'MOVLW 0x08', 'SUBWF 0xc3,W'])
        self.assertEqual(body[13:16], ['MOVLW 0x01', 'MOVWF 0xdf', 'CALL 0x10e62'])
        # Three right shifts, ten bits kept, the pin off.
        self.assertEqual(body[25:31], ['MOVLW 0x03', 'BCF 0xfd8,0', 'RRCF 0x001', 'RRCF 0x000', 'DECF 0xfe8,W',
                                       'BNZ 0x11bf8'])
        self.assertEqual(body[34:40], ['MOVWF 0xc4', 'MOVLW 0x03', 'ANDWF 0x001,W', 'MOVWF 0xc5', 'RCALL 0x11bac',
                                       'MOVFF 0x2c4,0xff3'])

    def test_both_published_bootloaders_hold_0x18_at_0x104_and_their_logs_differ(self):
        lab.require('arch8_boot_880', 'arch8_boot_885')
        images = {name: lab.load(name) for name in ('arch8_boot_880', 'arch8_boot_885')}

        def newest(image):
            log = [b for b in image[0x140:0x148] if b != 0xFF]
            return log[-1] if log else 0xFF
        self.assertEqual({name: image[0x104] for name, image in images.items()},
                         {'arch8_boot_880': 0x18, 'arch8_boot_885': 0x18})
        self.assertEqual({name: newest(image) for name, image in images.items()},
                         {'arch8_boot_880': 0x18, 'arch8_boot_885': 0x21})


class TheSafeWindow(unittest.TestCase):
    def test_a_substitution_needs_an_odd_count_ending_on_the_address(self):
        self.assertEqual(substituted(0x104, 1), [0x104])
        self.assertEqual(substituted(0x104, 2), [])
        self.assertEqual(substituted(0x000000, 0x105), [0x104])
        # An even count ending on 0x105 fetches flash; an odd one ending there takes the measurement.
        self.assertEqual(substituted(0x000000, 0x106), [])
        self.assertEqual(substituted(0x000001, 0x105), [0x105])
        for count in range(1, 0x400):
            for start in (0x000000, 0x000100, 0x000104):
                if substituted(start, count):
                    self.assertEqual(count % 2, 1, (hex(start), count))
                    self.assertIn(start + count - 1, SPECIAL)

    def test_whole_region_reads_and_the_identity_read_never_meet_them(self):
        self.assertEqual([a for a in range(0, DEVICE_WINDOW, 0x8000) if substituted(a, 0x8000)], [])
        self.assertEqual(substituted(0x000110, 64), [])
        self.assertEqual(chunks(64), [62, 2])
        self.assertEqual(BASE, 0x010000)

    def test_the_parse_checks_nothing(self):
        code = application()
        self.assertEqual(window(code, READ_PARSE, 2), ['MOVLB 0x2', 'MOVLW 0x04'])
        calls = [i.fields['target'] for _, i in listing(code, 0x1588A, 0x158CA) if i.mnemonic == 'CALL']
        self.assertEqual(set(calls), {0x11F5E})
        self.assertEqual(len(calls), 5)


if __name__ == '__main__':
    unittest.main()
