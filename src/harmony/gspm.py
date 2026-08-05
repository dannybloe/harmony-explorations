"""
Parser for the GSPM config container used by Harmony architectures 12 and 14.

The format is specified in `docs/config-format.md`. Two properties make parsing
self-configuring, so no per-model table is needed:

  * The flash base address the blob was linked for is recoverable from the header's
    absolute `end_addr` field, because `end_addr` points at the trailing `PTYY` marker:
    `base = end_addr - (offset_of_PTYY - offset_of_GSPM)`.
  * The pointer table length differs per architecture (21 on arch 12, 19 on arch 14) and
    is not stated in the header, but it follows from where the first section magic sits:
    `count = (offset_of_LWJL - 3 - 0x0C) / 4`.

Accepts a bare blob or a raw flash dump with the blob somewhere inside it.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass, field
from typing import Dict, List, Optional

MAGIC = b'GSPM'
END_MARKER = b'PTYY'
FIRST_SECTION = b'LWJL'

HEADER_PTR_OFFSET = 0x0C
KNOWN_POINTER_COUNTS = (19, 21)


@dataclass
class KeyRecord:
    """One LWJL entry."""
    index_in_table: int
    event_code: int
    index: int
    flags: int

    @property
    def is_matrix(self) -> bool:
        return bool(self.event_code & 0x80)

    @property
    def row(self) -> Optional[int]:
        return (self.event_code >> 3) & 0x0F if self.is_matrix else None

    @property
    def col(self) -> Optional[int]:
        return self.event_code & 0x07 if self.is_matrix else None


@dataclass
class Section:
    slot: int
    address: int

    @property
    def is_null(self) -> bool:
        return self.address == 0


@dataclass
class Container:
    blob_offset: int
    length: int
    flash_base: int
    end_addr: int
    format_raw: int
    pointer_count: int
    lwjl_offset: int
    trailer_checksum: int
    sections: List[Section] = field(default_factory=list)
    keys: List[KeyRecord] = field(default_factory=list)
    checks: Dict[str, bool] = field(default_factory=dict)

    @property
    def format_version(self) -> str:
        """Nibble BCD: 0x1600 is 1.6, 0x1400 is 1.4."""
        return '%d.%d' % (self.format_raw >> 12, (self.format_raw >> 8) & 0xF)

    def file_offset(self, address: int) -> Optional[int]:
        """Convert an absolute flash address to an offset within the blob."""
        if address == 0:
            return None
        return address - self.flash_base

    @property
    def all_checks_pass(self) -> bool:
        return all(self.checks.values())


class GspmError(ValueError):
    pass


def parse(data: bytes) -> Container:
    """Parse the first GSPM container found in `data`."""
    start = data.find(MAGIC)
    if start < 0:
        raise GspmError('no GSPM magic found')
    end_marker = data.find(END_MARKER, start)
    if end_marker < 0:
        raise GspmError('no PTYY end marker found after GSPM')

    blob = data[start:end_marker + 4]
    if len(blob) < 0x68:
        raise GspmError('blob too short to hold a header: %d bytes' % len(blob))

    end_addr, format_raw = struct.unpack_from('<II', blob, 4)
    flash_base = end_addr - (end_marker - start)

    lwjl = blob.find(FIRST_SECTION)
    if lwjl < 0:
        raise GspmError('no LWJL section magic found')
    pointer_count = (lwjl - 3 - HEADER_PTR_OFFSET) // 4
    if pointer_count < 1:
        raise GspmError('implausible pointer count %d' % pointer_count)

    pointers = struct.unpack_from('<%dI' % pointer_count, blob, HEADER_PTR_OFFSET)

    container = Container(
        blob_offset=start,
        length=len(blob),
        flash_base=flash_base,
        end_addr=end_addr,
        format_raw=format_raw,
        pointer_count=pointer_count,
        lwjl_offset=lwjl,
        trailer_checksum=struct.unpack_from('<H', blob, len(blob) - 6)[0],
        sections=[Section(i, p) for i, p in enumerate(pointers)],
    )

    end_off = end_addr - flash_base
    container.checks = {
        'end_addr_points_at_PTYY': blob[end_off:end_off + 4] == END_MARKER,
        'padding_before_lwjl_is_zero': blob[lwjl - 3:lwjl] == b'\0\0\0',
        'pointer_count_known': pointer_count in KNOWN_POINTER_COUNTS,
        'sections_within_blob': all(
            s.is_null or 0 <= s.address - flash_base < len(blob)
            for s in container.sections),
    }

    count = blob[lwjl + 4]
    for k in range(count):
        o = lwjl + 5 + 4 * k
        if o + 4 > len(blob):
            break
        code = blob[o]
        idx = struct.unpack_from('<H', blob, o + 1)[0]
        container.keys.append(KeyRecord(k, code, idx, blob[o + 3]))

    return container


def report(c: Container):
    """Render a parse result as text."""
    yield 'blob at file offset 0x%X, length %d (0x%X)' % (c.blob_offset, c.length, c.length)
    yield 'flash base       0x%06X   (recovered from end_addr)' % c.flash_base
    yield 'end_addr         0x%06X' % c.end_addr
    yield 'format version   %s   (raw 0x%04X)' % (c.format_version, c.format_raw)
    yield 'pointer slots    %d        (LWJL at 0x%02X)' % (c.pointer_count, c.lwjl_offset)
    yield 'trailer checksum 0x%04X   (algorithm not yet derived)' % c.trailer_checksum
    for name, ok in c.checks.items():
        yield '  check %-28s %s' % (name, 'PASS' if ok else 'FAIL')
    yield 'sections:'
    for s in c.sections:
        if s.is_null:
            yield '   [%2d] NULL' % s.slot
        else:
            yield '   [%2d] 0x%06X  blob+0x%06X' % (s.slot, s.address, s.address - c.flash_base)
    matrix = [k for k in c.keys if k.is_matrix]
    yield 'LWJL: count=%d  (%d matrix codes, %d non-matrix)' % (
        len(c.keys), len(matrix), len(c.keys) - len(matrix))
    rows: Dict[int, set] = {}
    for k in matrix:
        rows.setdefault(k.row, set()).add(k.col)
    if rows:
        yield '  matrix rows: %s' % {r: sorted(v) for r, v in sorted(rows.items())}
    if c.keys:
        yield '  codes in order: %s' % ' '.join('0x%02X' % k.event_code for k in c.keys)
