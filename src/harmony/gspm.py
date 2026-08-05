"""
Parser for the Harmony config container: `GSPM` and its relatives.

The format is specified in `docs/config-format.md`. It is one container with a per
architecture four letter cookie rather than one format per architecture, which is why this
module is written against the shape and not against a model table:

  * The flash base address the blob was linked for is recoverable from the header's
    absolute `end_addr` field, because `end_addr` points at the trailing end marker:
    `base = end_addr - (offset_of_end_marker - offset_of_magic)`.
  * The pointer table length differs per architecture and is not stated in the header, but
    it follows from where the marker after the table sits:
    `count = (marker_offset - 3 - 0x0C) / 4`.
  * That marker is itself found from the data: it is the first four uppercase letters
    preceded by zero padding. Which four letters they are is a per architecture fact and
    not derivable, so it is recorded per family and asserted rather than computed. `LWJL`
    and `WLWL` are followed by a key table; whether `CMAH` is has not been established,
    because the byte where a count would sit is zero in the only arch 9 sample.

Accepts a bare blob or a raw flash dump with the blob somewhere inside it.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


@dataclass(frozen=True)
class Family:
    """One container cookie and the end marker that goes with it."""
    magic: bytes
    end_marker: bytes
    architectures: str
    header_marker: bytes         # observed marker after the pointer table
    key_table_at_marker: bool    # whether a key table starts at that marker


# Verified against samples. The cookies themselves also appear in concordance's per
# architecture table, where arch 7 (the older 6xx) is listed as `BMBM`; no arch 7 sample has
# been seen here, so its end marker is unknown and it is deliberately absent. Archs 2 and 3
# use a two byte cookie and are a different layout entirely.
FAMILIES: Tuple[Family, ...] = (
    Family(b'GSPM', b'PTYY', '12 (One), 14 (600, 700)', b'LWJL', True),
    Family(b'TPTP', b'DKDK', '8 (720, 785, 88x)', b'WLWL', True),
    Family(b'AHCM', b'MCHA', '9 (36x, 51x, 52x, 55x)', b'CMAH', False),
)

MAGIC = b'GSPM'                  # the architectures this project targets
END_MARKER = b'PTYY'

HEADER_PTR_OFFSET = 0x0C
MARKER_SEARCH_LIMIT = 0x200
KNOWN_POINTER_COUNTS = (19, 20, 21)


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
    marker_offset: int
    marker: bytes
    family: Family
    trailer_checksum: int
    sections: List[Section] = field(default_factory=list)
    keys: List[KeyRecord] = field(default_factory=list)
    checks: Dict[str, bool] = field(default_factory=dict)

    @property
    def has_key_table(self) -> bool:
        return self.family.key_table_at_marker

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


def find_magic(data: bytes) -> Tuple[Family, int]:
    """Locate the earliest known container cookie in `data`."""
    hits = [(data.find(f.magic), f) for f in FAMILIES]
    hits = [(off, f) for off, f in hits if off >= 0]
    if not hits:
        raise GspmError('no known container magic found (looked for %s)'
                        % ', '.join(f.magic.decode() for f in FAMILIES))
    off, family = min(hits, key=lambda h: h[0])
    return family, off


def find_marker(blob: bytes) -> int:
    """Offset of the four letter marker that follows the pointer table.

    Derived rather than looked up: it is the first run of four uppercase letters that is
    preceded by three zero bytes. That holds whether the padding is three bytes or seven,
    which is the difference between the architectures seen so far.
    """
    for off in range(HEADER_PTR_OFFSET + 4, min(len(blob) - 4, MARKER_SEARCH_LIMIT)):
        if blob[off - 3:off] != b'\0\0\0':
            continue
        if all(0x41 <= c <= 0x5A for c in blob[off:off + 4]):
            return off
    raise GspmError('no four letter marker found after the pointer table')


def parse(data: bytes) -> Container:
    """Parse the first Harmony config container found in `data`."""
    family, start = find_magic(data)
    end_marker = data.find(family.end_marker, start)
    if end_marker < 0:
        raise GspmError('no %s end marker found after %s'
                        % (family.end_marker.decode(), family.magic.decode()))

    blob = data[start:end_marker + 4]
    if len(blob) < 0x68:
        raise GspmError('blob too short to hold a header: %d bytes' % len(blob))

    end_addr, format_raw = struct.unpack_from('<II', blob, 4)
    flash_base = end_addr - (end_marker - start)

    marker_offset = find_marker(blob)
    pointer_count = (marker_offset - 3 - HEADER_PTR_OFFSET) // 4
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
        marker_offset=marker_offset,
        marker=bytes(blob[marker_offset:marker_offset + 4]),
        family=family,
        trailer_checksum=struct.unpack_from('<H', blob, len(blob) - 6)[0],
        sections=[Section(i, p) for i, p in enumerate(pointers)],
    )

    end_off = end_addr - flash_base
    container.checks = {
        'end_addr_points_at_end_marker': blob[end_off:end_off + 4] == family.end_marker,
        'padding_before_marker_is_zero': blob[marker_offset - 3:marker_offset] == b'\0\0\0',
        'marker_as_expected_for_family': container.marker == family.header_marker,
        'pointer_count_known': pointer_count in KNOWN_POINTER_COUNTS,
        'sections_within_blob': all(
            s.is_null or 0 <= s.address - flash_base < len(blob)
            for s in container.sections),
    }

    if family.key_table_at_marker:
        count = blob[marker_offset + 4]
        for k in range(count):
            o = marker_offset + 5 + 4 * k
            if o + 4 > len(blob):
                break
            code = blob[o]
            idx = struct.unpack_from('<H', blob, o + 1)[0]
            container.keys.append(KeyRecord(k, code, idx, blob[o + 3]))

    return container


def report(c: Container):
    """Render a parse result as text."""
    yield 'blob at file offset 0x%X, length %d (0x%X)' % (c.blob_offset, c.length, c.length)
    yield 'container        %s ... %s   (architecture %s)' % (
        c.family.magic.decode(), c.family.end_marker.decode(), c.family.architectures)
    yield 'flash base       0x%06X   (recovered from end_addr)' % c.flash_base
    yield 'end_addr         0x%06X' % c.end_addr
    yield 'format version   %s   (raw 0x%04X)' % (c.format_version, c.format_raw)
    yield 'pointer slots    %d        (%s at 0x%02X%s)' % (
        c.pointer_count, c.marker.decode('ascii', 'replace'), c.marker_offset,
        ', key table' if c.has_key_table else ', contents not established')
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
