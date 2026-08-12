"""The arch 12 internal read loop, modelled so its outcome can be predicted.

`docs/findings.md` sections 94 and 96. A `READ_FLASH` of internal program memory is served by a
loop at `0x26BC8` that fetches a word at a time, emits both bytes, subtracts two from its count and
exits only when the count is exactly zero. An odd count therefore never terminates.

That alone does not say what happens next, and for a while this project believed the answer was an
address threshold. It is not. The byte sender at `0x20394` has no bound: it writes through a 16 bit
pointer and increments it, so a caller that sends more than the response buffer holds walks that
pointer up through data memory writing whatever it is sending. The loop is such a caller, and the
loop's own state sits above the buffer in that path. When the pointer reaches the count, the count
becomes a byte of flash, and the read completes if and only if that byte is even.

So the outcome is decided by content rather than by location, and it is predictable from an image of
the memory being read. This module is that prediction, kept out of the tests so that it can be run
against a real page dump by anyone who has one.

Every constant here was read out of the firmware, not fitted:

* `BUFFER_BASE` is the literal at `0x2015E`, reloaded before every response report.
* `PREAMBLE` is the two bytes the read body sends before the loop, at `0x26B9C` and `0x26BA8`.
* `COUNTER`, `WORD` and `ADDRESS` are the loop's variables, from `0x26BAC` and `0x26BBC`.
* the chunk sizes are what `0x26AF0` produces.
"""

from __future__ import annotations

BUFFER_BASE = 0x0468
PREAMBLE = 2
COUNTER = 0xD31
WORD = 0xD32
ADDRESS = 0xD34

#: How far the loop writes before it overwrites its own count, in bytes. The write pointer only
#: climbs and the two scratch bytes are rewritten every pass, so nothing before this changes
#: anything the loop uses.
DECIDING_DISTANCE = COUNTER - (BUFFER_BASE + PREAMBLE)

#: The same four numbers on every architecture with a firmware image here, read the same way. The
#: defect is not arch 12's: all three share the buffer base, the response length counter at `0x40D`,
#: the two byte preamble, and a loop counter that sits below its own address bytes so the counter is
#: always the first thing the runaway pointer reaches. What differs is only how far it has to go.
#:
#: `(sender, loop head, exit test, buffer base, counter)`. `distance` is not listed because it is a
#: difference of two of the others and a number written twice is a number that can disagree.
_MEASURED = {
    12: {'sender': 0x20394, 'loop': 0x26BC8, 'exit': 0x26C16, 'buffer': 0x0468, 'counter': 0xD31},
    14: {'sender': 0x172DA, 'loop': 0x0CA8A, 'exit': 0x0CAD6, 'buffer': 0x0468, 'counter': 0xD5D},
    9: {'sender': 0x0173C, 'loop': 0x03372, 'exit': 0x033A4, 'buffer': 0x0468, 'counter': 0x70B},
}

#: The same table with `distance` filled in. Derived in a comprehension rather than by a loop that
#: mutates the table afterwards, because that loop left its variable bound at module level and had
#: to `del` it, which is a shape a checker cannot tell from a variable used before it is set.
PROFILES = {
    architecture: dict(fields, distance=fields['counter'] - (fields['buffer'] + PREAMBLE))
    for architecture, fields in _MEASURED.items()
}

#: FSR0 is twelve bits, so the pointer wraps here rather than running off the end of the file
#: registers. It matters only for reads that keep going long enough to come back round.
FSR_MASK = 0xFFF


def chunk_sizes(count):
    """The data sizes the chunker at `0x26AF0` produces for a request of `count` bytes.

    It takes 62 at a time, and clamps what is left down to 62, 30, 14 or 6 rather than sending an
    arbitrary remainder. An odd request therefore always ends in an odd chunk, which is why the
    library's refusal is on the total.
    """
    sizes = []
    while count:
        if count >= 0x3F:
            payload = 0x3F
        else:
            payload = count + 1
            for limit in (0x3F, 0x1F, 0x0F, 0x07):
                if payload >= limit:
                    payload = limit
                    break
        sizes.append(payload - 1)
        count -= payload - 1
    return sizes


def chunk_terminates(read_word, start, count, cap=200000):
    """Whether one chunk's loop ends by itself, given a way to read a word of program memory.

    `read_word(address)` returns the two bytes at that address, the way `0x2E70A` does. `start` is a
    full 24 bit program address, so page `0xFF` offset `n` is `0x010000 + n`.
    """
    ram = {
        COUNTER: count & 0xFF,
        ADDRESS: start & 0xFF,
        ADDRESS + 1: (start >> 8) & 0xFF,
        ADDRESS + 2: (start >> 16) & 0xFF,
    }
    pointer = BUFFER_BASE + PREAMBLE
    for _ in range(cap):
        address = ram[ADDRESS] | ram[ADDRESS + 1] << 8 | ram[ADDRESS + 2] << 16
        low, high = read_word(address)
        # The scratch word is rewritten every pass, so a write that lands on it changes nothing.
        ram[WORD], ram[WORD + 1] = low, high
        address = (address + 2) & 0xFFFFFF
        ram[ADDRESS] = address & 0xFF
        ram[ADDRESS + 1] = (address >> 8) & 0xFF
        ram[ADDRESS + 2] = (address >> 16) & 0xFF
        for byte in (low, high):
            if pointer in ram:
                ram[pointer] = byte
            pointer = (pointer + 1) & FSR_MASK
        ram[COUNTER] = (ram[COUNTER] - 2) & 0xFF
        if ram[COUNTER] == 0:
            return True
    return False


def read_returns(read_word, start, count, cap=200000):
    """Whether a whole `READ_FLASH` of internal memory comes back, chunk by chunk."""
    address = start
    for size in chunk_sizes(count):
        if not chunk_terminates(read_word, address, size, cap=cap):
            return False
        address += size
    return True


def word_reader(image, base):
    """A `read_word` over a flat image loaded at `base`, answering `0xFF` outside it."""

    def read(address):
        offset = address - base
        if 0 <= offset < len(image) - 1:
            return image[offset], image[offset + 1]
        return 0xFF, 0xFF

    return read
