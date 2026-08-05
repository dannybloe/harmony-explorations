"""
The Harmony firmware image header, and its checksum.

Every image examined so far, across both architectures, starts with the same 16 bytes:

    0x00  u16   checksum
    0x02  ff ff
    0x04  u16   (image_size - 8) & 0xFFFF, the byte count from offset 8 to the end
    0x06  u8    0x00 on architecture 12, 0x01 on architecture 14
    0x07  u8    firmware version, nibble BCD: 0x34 is 3.4, 0x28 is 2.8, 0x02 is 0.2
    0x08  48 47  magic, which concordance's _fix_magic_bytes() writes
    0x0A  GOTO <entry point>, which sits near the end of the image
    0x0E  RETURN

The size field is useful beyond validation: it recovers the true length of an image that
was truncated in transit. concordance's firmware dump truncates architecture 14 images at
64 KiB, and `recover_size` is what establishes how much is missing.

The checksum differs from concordance's model. concordance starts the sum at
`firmware_4847_offset` and always runs to `FIRMWARE_MAX_SIZE`; the observed format uses two
independent constants and stops at the real end of the image. See
`reference/concordance-notes.md`.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass
from typing import Optional

MAGIC_OFFSET = 8
MAGIC = b'\x48\x47'
CHECKSUM_START = 4
CHECKSUM_SEED_EVEN = 0x21
CHECKSUM_SEED_ODD = 0x43

ARCH_FAMILY_BYTE = {0x00: 'architecture 12 (Gin)', 0x01: 'architecture 14'}


@dataclass
class Header:
    checksum: int
    size_field: int
    family_byte: int
    version_bcd: int
    has_magic: bool
    entry_point: Optional[int]

    @property
    def version(self) -> str:
        return '%d.%d' % (self.version_bcd >> 4, self.version_bcd & 0x0F)

    @property
    def family(self) -> str:
        return ARCH_FAMILY_BYTE.get(self.family_byte, 'unknown (0x%02X)' % self.family_byte)


def parse_header(code: bytes, base: int = 0) -> Header:
    """Parse the 16-byte image header. `base` only affects the entry point address."""
    if len(code) < 0x0E:
        raise ValueError('too short to hold a firmware header: %d bytes' % len(code))
    checksum, filler, size_field = struct.unpack_from('<HHH', code, 0)
    del filler
    family, version = code[6], code[7]
    from .pic18 import loadaddr
    return Header(
        checksum=checksum,
        size_field=size_field,
        family_byte=family,
        version_bcd=version,
        has_magic=code[MAGIC_OFFSET:MAGIC_OFFSET + 2] == MAGIC,
        entry_point=loadaddr.entry_point(code, base),
    )


def compute_checksum(code: bytes) -> int:
    """The image's u16 checksum, as stored at offset 0.

    XOR of the even-offset bytes into one seed and the odd-offset bytes into another, over
    `[CHECKSUM_START .. end]`. Returned in the same byte order as the header field, so it
    compares directly against `Header.checksum`.
    """
    even, odd = CHECKSUM_SEED_EVEN, CHECKSUM_SEED_ODD
    for i in range(CHECKSUM_START, len(code) - 1, 2):
        even ^= code[i]
        odd ^= code[i + 1]
    return even | (odd << 8)


def verify_checksum(code: bytes) -> bool:
    """True if the stored checksum matches the computed one over the whole image."""
    return compute_checksum(code) == struct.unpack_from('<H', code, 0)[0]


def recover_size(code: bytes) -> Optional[int]:
    """The image's true length, from the size field, even if `code` is truncated.

    The field holds `(size - 8) & 0xFFFF`, so the top bits are lost and the answer is
    ambiguous modulo 64 KiB.

    A candidate that lies inside `code` can be **checked** rather than guessed at, because the
    header carries a checksum over the whole image: the right length is the one whose checksum
    verifies. That is tried first, smallest candidate up, and it is the only branch that returns
    an answer with evidence behind it.

    Only when no candidate can be checked, which is the truncated case the function was written
    for, does it fall back to the rule it used to apply always: the smallest candidate at least
    as long as what we have. That rule is wrong for a buffer holding more than the image, which
    is what a live read of the surrounding memory produces. It reported 135872 for the Harmony
    600 read off the device, where the checked answer is 70336.

    Returns None if nothing plausible fits.
    """
    if len(code) < 6:
        return None
    size_field = struct.unpack_from('<H', code, 4)[0]
    candidates = [(high << 16) + size_field + 8 for high in range(0, 8)]
    for candidate in candidates:
        if candidate <= len(code) and verify_checksum(code[:candidate]):
            return candidate
    for candidate in candidates:
        if candidate >= len(code):
            return candidate
    return None
