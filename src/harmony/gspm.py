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
  * The architecture is stated by the config itself, in section slot 1, so it does not have
    to be inferred from the cookie. It cannot be: `GSPM` covers both arch 12 and arch 14.

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

# The section table's own layout. An item is four bytes: one spare byte, then a three byte
# little endian flash pointer. So the table begins at 0x0B and the pointers land on 0x0C, 0x10,
# 0x14 and so on, which is what this file read directly while treating 0x0B as header.
#
# That cost one section. The last item's pointer occupies the three bytes immediately before the
# trailer marker, and the old derivation subtracted exactly those three bytes as unexplained
# padding, so every container was parsed one slot short. It went unnoticed because the final
# section is NULL in all thirteen samples.
#
# The reading is closed by arithmetic rather than by inspection: 0x0B + 4 * count lands exactly on
# the measured marker offset in every sample of all four architectures, which the old reading
# could only match by subtracting three bytes it could not account for. See docs/findings.md
# section 20.
SECTION_TABLE_OFFSET = 0x0B
SECTION_ITEM_SIZE = 4
POINTER_SIZE = 3
HEADER_PTR_OFFSET = SECTION_TABLE_OFFSET + 1   # where item 0's pointer lands
MARKER_SEARCH_LIMIT = 0x200
# Arch 9 and 14 carry 20, arch 8 carries 21, arch 12 carries 22.
KNOWN_POINTER_COUNTS = (20, 21, 22)

# Section slot 0 is a single 0xFEED framed block, the structure discussion #1 documents for
# the Harmony 525. Stored little endian, so the cookie reads `ed fe` in a hex dump.
FRAME_COOKIE = b'\xed\xfe'
FRAME_END = b'\xef\xbe'
# An empty frame carries length 0 and its terminator sits five bytes in, so the length rule
# below does not apply to it. Seen only in the One's safe mode config so far.
EMPTY_FRAME_LENGTH = 5
# Every non-empty frame's payload starts with this. Twelve samples, four architectures. The
# 0xA7 looks like a type tag and `Root` names the tree the rest of the section describes.
FRAME_PROLOGUE = b'\xa7\x08\x00\x00\x00\x00\x00Root'

# Section slot 1 is a seven byte record that states the architecture twice over. Confirmed
# against the EZHex header's <PROTOCOL> on nine samples and against the firmware package a
# container was extracted from on three more.
ARCH_RECORD_SLOT = 1
ARCH_RECORD_LENGTH = 7

# The pointer table is one table across architectures, with per architecture insertions rather
# than a per architecture meaning. Arch 9 and arch 14 carry the base layout of 20 slots, whose
# last two, base 18 and base 19, are NULL in every sample. Arch 8 adds a NULL at slot 8, so
# everything from there on shifts up by one and it carries 21. Arch 12 adds that same NULL plus a
# real section at slot 18, so it carries 22 and the two trailing NULLs land at 20 and 21.
#
# The evidence is in `docs/findings.md`: the six pointer array slots and the distinctive one
# byte section both land where this mapping predicts, in all nine config samples.
#
# Worth having because the project decodes arch 14, where every config read passes through one
# SPI primitive, while the popular remote is the arch 12 Harmony One. A section labelled on one
# transfers to the other through this table rather than through a second investigation.
INSERTED_SLOTS: Dict[int, Tuple[int, ...]] = {
    9: (),
    14: (),
    8: (8,),
    12: (8, 18),
}


def base_slot(architecture: int, slot: int) -> Optional[int]:
    """Map a slot on `architecture` to the same section's slot in the 20 slot base layout.

    Returns None for a slot that architecture inserted and the base layout does not have, and
    raises for an architecture whose insertions have not been established.
    """
    if architecture not in INSERTED_SLOTS:
        raise GspmError('slot alignment not established for architecture %s' % architecture)
    inserted = INSERTED_SLOTS[architecture]
    if slot in inserted:
        return None
    return slot - sum(1 for i in inserted if i < slot)


def arch_slot(architecture: int, base: int) -> int:
    """Inverse of `base_slot`: where the base layout's slot sits on `architecture`."""
    if architecture not in INSERTED_SLOTS:
        raise GspmError('slot alignment not established for architecture %s' % architecture)
    slot = base
    for i in sorted(INSERTED_SLOTS[architecture]):
        if i <= slot:
            slot += 1
    return slot


# An event code is an event type in the top two bits plus a scan code in the rest. NOT a
# matrix address with 0x80 as an "is a key" flag, which is what this file said until the
# reading below was checked; see `docs/findings.md` section 17 for the correction and its
# evidence. The old reading split the arch 14 table into 108 "matrix" and 54 "non matrix"
# codes, which is really 54 press plus 54 repeat against 54 release.
EVENT_MASK = 0xC0
SCAN_MASK = 0x3F
EVENT_NONE, EVENT_RELEASE, EVENT_PRESS, EVENT_REPEAT = 0x00, 0x40, 0x80, 0xC0
EVENT_NAMES = {EVENT_NONE: 'none', EVENT_RELEASE: 'release',
               EVENT_PRESS: 'press', EVENT_REPEAT: 'repeat'}


@dataclass
class KeyRecord:
    """One LWJL entry."""
    index_in_table: int
    event_code: int
    index: int
    flags: int

    @property
    def event_type(self) -> int:
        """`EVENT_PRESS`, `EVENT_RELEASE`, `EVENT_REPEAT`, or `EVENT_NONE`."""
        return self.event_code & EVENT_MASK

    @property
    def event_name(self) -> str:
        return EVENT_NAMES[self.event_type]

    @property
    def scan_code(self) -> int:
        """The keypad scanner's own linear index, or a virtual event's number.

        On arch 14 these run 1 to 54 within the scanner's range of 1 to 56, which is one of
        the three agreements that established this reading.
        """
        return self.event_code & SCAN_MASK

    @property
    def is_keypad(self) -> bool:
        """False for the handful of codes that carry no event bits at all."""
        return self.event_type != EVENT_NONE


# Base slot 10 is a table of addresses of action lists, and a list is a count followed by
# that many three byte instructions. Established in `docs/findings.md` section 17.
ACTION_LIST_TABLE_SLOT = 10
INSTRUCTION_LENGTH = 3


@dataclass
class Instruction:
    """One action list instruction: a 16 bit operand and an opcode byte.

    Opcode meanings are not established here. The inventory differs by architecture, which is
    itself a finding: arch 14 leans on opcodes that do not appear in the arch 9 sample at all.
    """
    operand: int
    opcode: int


@dataclass
class Section:
    slot: int
    address: int
    # The item's leading byte, the one the three byte pointer does not use. Zero in every
    # section of every sample, so its meaning is unestablished rather than known to be padding.
    # Parsed and checked rather than skipped, because reading the item as a four byte pointer
    # instead would turn a nonzero value here into a silently wrong address.
    spare: int = 0

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
    architecture: Optional[int] = None    # stated by slot 1, see ARCH_RECORD_SLOT
    version_word: Optional[int] = None    # the u16 beside it, meaning not established
    frame_length: Optional[int] = None    # slot 0's 0xFEED frame, None when absent
    blob: bytes = b''                     # the container itself, cookie through end marker
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

    def blob_offset_of(self, address: int) -> Optional[int]:
        """Convert an absolute flash address to an offset within the container blob."""
        if address == 0:
            return None
        return address - self.flash_base

    def file_offset(self, address: int) -> Optional[int]:
        """Convert an absolute flash address to an offset within the file that was parsed.

        Distinct from `blob_offset_of` by `blob_offset`, which is non zero whenever the
        container sits inside something larger: an EZHex file with its XML header, or a
        flash dump. Conflating the two silently shifts every section by the header length
        and produces a plausible looking wrong answer rather than an error, which has
        already cost time here.
        """
        off = self.blob_offset_of(address)
        return None if off is None else self.blob_offset + off

    @property
    def all_checks_pass(self) -> bool:
        return all(self.checks.values())

    def section_length(self, slot: int) -> Optional[int]:
        """Bytes from this section's start to the next non NULL one, or to the end marker.

        The header does not state section lengths, so they come from the layout: the non NULL
        pointers ascend with the slot number in every sample, which is what makes this well
        defined. NULL slots have no length.
        """
        if slot >= len(self.sections) or self.sections[slot].is_null:
            return None
        start = self.sections[slot].address
        following = [s.address for s in self.sections[slot + 1:] if s.address]
        return (following[0] if following else self.end_addr) - start

    def pointer_array(self, slot: int) -> Optional[List[int]]:
        """Read a section as a count followed by that many three byte flash pointers.

        Six sections per architecture are arrays of this shape, and they are recognised rather
        than tabulated: the count is a `u8` or a `u16` and is accepted only when
        `width + 3 * count` accounts for the section exactly. That test is strict enough to
        pick out the same six slots in all nine config samples and no others.

        Three bytes rather than four because 24 bits covers the whole config region with room
        to spare, and Logitech evidently cared: slot 10 of the Harmony 700 config holds 8037
        of them, so the fourth byte would have cost 8 KiB in that section alone.

        Returns None when the section is not this shape, or when there is no blob to read.
        """
        length = self.section_length(slot)
        if length is None or not self.blob:
            return None
        off = self.blob_offset_of(self.sections[slot].address)
        for width in (1, 2):
            count = int.from_bytes(self.blob[off:off + width], 'little')
            if count and width + 3 * count == length:
                base = off + width
                return [int.from_bytes(self.blob[base + 3 * k:base + 3 * k + 3], 'little')
                        for k in range(count)]
        return None

    @property
    def pointer_array_slots(self) -> List[int]:
        """Which slots read as pointer arrays. A per architecture fingerprint in practice."""
        return [i for i in range(len(self.sections)) if self.pointer_array(i) is not None]

    def action_list(self, address: int) -> Optional[List[Instruction]]:
        """The action list at an absolute flash address: a count, then that many instructions.

        ```
        +0x00  u8   count
               { u16 operand; u8 opcode }[count]
        ```

        Returns None when the address is outside the container. Nothing else is validated,
        because there is nothing to validate against: what makes this reading believable is
        that consecutive entries of the table sit `1 + 3 * count` apart, which
        `action_lists` checks in aggregate rather than per list.
        """
        off = self.blob_offset_of(address)
        if off is None or not self.blob or not 0 <= off < len(self.blob):
            return None
        count = self.blob[off]
        end = off + 1 + INSTRUCTION_LENGTH * count
        if end > len(self.blob):
            return None
        return [Instruction(
            operand=int.from_bytes(self.blob[off + 1 + 3 * k:off + 3 + 3 * k], 'little'),
            opcode=self.blob[off + 3 + 3 * k])
            for k in range(count)]

    def action_lists(self) -> Optional[List[List[Instruction]]]:
        """Every action list the table at base slot 10 addresses, in table order."""
        if self.architecture is None:
            return None
        try:
            slot = arch_slot(self.architecture, ACTION_LIST_TABLE_SLOT)
        except GspmError:
            return None
        table = self.pointer_array(slot) if slot < len(self.sections) else None
        if table is None:
            return None
        lists = [self.action_list(a) for a in table]
        return None if any(l is None for l in lists) else lists

    def action_list_packing(self) -> Tuple[int, int]:
        """How many consecutive table entries sit exactly `1 + 3 * count` apart, and of how many.

        This is the check that carries the whole reading: the addresses come from the pointer
        table and the counts come from the lists themselves, so agreement between them is two
        unrelated parts of the file telling the same story. Across the corpus it holds for all
        but exactly four pairs per config, and those four are the boundaries between the runs
        the lists are packed into.
        """
        slot = arch_slot(self.architecture, ACTION_LIST_TABLE_SLOT)
        table = self.pointer_array(slot)
        fit = 0
        for k in range(len(table) - 1):
            count = self.blob[self.blob_offset_of(table[k])]
            if table[k + 1] - table[k] == 1 + INSTRUCTION_LENGTH * count:
                fit += 1
        return fit, max(0, len(table) - 1)


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
    preceded by three zero bytes.

    Those three bytes are not padding, which is what this docstring used to imply. They are the
    final section's pointer, and it is NULL in every sample, so the heuristic works for a reason
    rather than by luck. It would stop working on a container whose last section is populated,
    and nothing in the format says one cannot be.
    """
    for off in range(HEADER_PTR_OFFSET + 4, min(len(blob) - 4, MARKER_SEARCH_LIMIT)):
        if blob[off - 3:off] != b'\0\0\0':
            continue
        if all(0x41 <= c <= 0x5A for c in blob[off:off + 4]):
            return off
    raise GspmError('no four letter marker found after the pointer table')


def frame_length(blob: bytes, off: int) -> Optional[int]:
    """Length of the 0xFEED frame at `off`, or None if there is not one there.

    The frame is:

        +0x00  u16     0xFEED
        +0x02  u16     length, counted from the cookie and excluding the terminator
        +0x04  u8      zero in every sample
        +0x05  ...     payload, starting with FRAME_PROLOGUE
        +len   u16     0xBEEF

    So the frame occupies `length + 2` bytes, and that lands exactly on the next section in
    all twelve samples. The length is validated by requiring the terminator where it says,
    which is what distinguishes a real frame from the `ed fe` byte pair that turns up by
    chance roughly once per 64 KiB: the One's 1.6 MB config holds 31 of those pairs and only
    one of them is a frame.
    """
    if blob[off:off + 2] != FRAME_COOKIE:
        return None
    length = struct.unpack_from('<H', blob, off + 2)[0]
    if length == 0:
        # Degenerate empty frame: cookie, a zero length, a zero byte, terminator.
        return 0 if blob[off + EMPTY_FRAME_LENGTH:off + 7] == FRAME_END else None
    if blob[off + length:off + length + 2] != FRAME_END:
        return None
    return length


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
    pointer_count = (marker_offset - SECTION_TABLE_OFFSET) // SECTION_ITEM_SIZE
    if pointer_count < 1:
        raise GspmError('implausible pointer count %d' % pointer_count)

    # Three byte pointers, read as three bytes. Reading four worked on the whole corpus only
    # because the next item's spare byte is always zero; one nonzero byte would have added
    # 0x1000000 to a section address and produced a plausible looking wrong answer.
    sections = []
    for i in range(pointer_count):
        item = SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * i
        address = int.from_bytes(blob[item + 1:item + 1 + POINTER_SIZE], 'little')
        sections.append(Section(i, address, blob[item]))

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
        blob=blob,
        sections=sections,
    )

    # Slot 0's frame and slot 1's architecture record, both read here because `parse` is the
    # only place holding the blob. Guarded rather than assumed: a container with fewer than
    # two slots, or with either slot NULL, simply leaves these as None.
    slot0 = container.sections[0].address if container.sections else 0
    if slot0:
        container.frame_length = frame_length(blob, slot0 - flash_base)

    if len(container.sections) > ARCH_RECORD_SLOT:
        arch_addr = container.sections[ARCH_RECORD_SLOT].address
        o = arch_addr - flash_base if arch_addr else -1
        if 0 <= o and o + ARCH_RECORD_LENGTH <= len(blob):
            # The architecture is stored twice. Reading it only when the two copies agree
            # keeps a coincidence from being reported as a fact.
            if blob[o] == blob[o + 1]:
                container.architecture = blob[o]
            container.version_word = struct.unpack_from('<H', blob, o + 2)[0]

    end_off = end_addr - flash_base
    container.checks = {
        'end_addr_points_at_end_marker': blob[end_off:end_off + 4] == family.end_marker,
        # The table has to end exactly where the marker begins, which fails if the marker offset
        # is not congruent to the table start. This is the check that would have caught the off
        # by one had it existed: under the old derivation the table stopped three bytes short.
        'section_table_ends_at_the_marker':
            SECTION_TABLE_OFFSET + SECTION_ITEM_SIZE * pointer_count == marker_offset,
        'last_section_is_null': container.sections[-1].is_null,
        'section_spare_bytes_are_zero': all(s.spare == 0 for s in container.sections),
        'marker_as_expected_for_family': container.marker == family.header_marker,
        'pointer_count_known': pointer_count in KNOWN_POINTER_COUNTS,
        'sections_within_blob': all(
            s.is_null or 0 <= s.address - flash_base < len(blob)
            for s in container.sections),
        'slot0_is_a_feed_frame': container.frame_length is not None,
        'slot1_states_the_architecture': container.architecture is not None,
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


def summary(c: Container) -> Dict[str, object]:
    """The container as a plain dictionary, JSON ready.

    This is the golden vector format, and the reason it lives here rather than in the command
    line tool that used to hold it: `packages/codec` has a `summary` that must produce the same
    object, and `tools/golden.py` compares them. A shape defined inside a tool cannot be a
    contract between two implementations.

    Pointer array entries are counted rather than listed, because the largest array seen holds
    8037 of them and would bury everything else.
    """
    return {
        'blob_offset': c.blob_offset,
        'length': c.length,
        'flash_base': c.flash_base,
        'end_addr': c.end_addr,
        'format_version': c.format_version,
        'format_raw': c.format_raw,
        'pointer_count': c.pointer_count,
        'architecture': c.architecture,
        'version_word': c.version_word,
        'frame_length': c.frame_length,
        'trailer_checksum': c.trailer_checksum,
        'checks': c.checks,
        # Both offsets, because they differ by the length of whatever the container is wrapped
        # in, and picking the wrong one shifts every section silently.
        'sections': [
            {'slot': s.slot, 'address': s.address, 'spare': s.spare,
             'blob_offset': c.blob_offset_of(s.address),
             'file_offset': c.file_offset(s.address),
             'length': c.section_length(s.slot),
             'pointer_array_entries': (
                 len(c.pointer_array(s.slot))
                 if c.pointer_array(s.slot) is not None else None)}
            for s in c.sections],
        'keys': [
            {'i': k.index_in_table, 'code': k.event_code, 'index': k.index,
             'flags': k.flags, 'event': k.event_name, 'scan': k.scan_code}
            for k in c.keys],
    }


def report(c: Container):
    """Render a parse result as text."""
    yield 'blob at file offset 0x%X, length %d (0x%X)' % (c.blob_offset, c.length, c.length)
    yield 'container        %s ... %s   (family covers architecture %s)' % (
        c.family.magic.decode(), c.family.end_marker.decode(), c.family.architectures)
    yield 'architecture     %s        (stated by section slot %d, version word %s)' % (
        c.architecture if c.architecture is not None else 'unstated', ARCH_RECORD_SLOT,
        c.version_word if c.version_word is not None else '?')
    yield 'flash base       0x%06X   (recovered from end_addr)' % c.flash_base
    yield 'end_addr         0x%06X' % c.end_addr
    yield 'format version   %s   (raw 0x%04X)' % (c.format_version, c.format_raw)
    yield 'slot 0 frame     %s' % (
        'FEED, %d bytes, BEEF at +%d' % (c.frame_length, c.frame_length)
        if c.frame_length else ('empty FEED frame' if c.frame_length == 0 else 'absent'))
    yield 'pointer slots    %d        (%s at 0x%02X%s)' % (
        c.pointer_count, c.marker.decode('ascii', 'replace'), c.marker_offset,
        ', key table' if c.has_key_table else ', contents not established')
    yield 'trailer checksum 0x%04X   (algorithm not yet derived)' % c.trailer_checksum
    for name, ok in c.checks.items():
        yield '  check %-28s %s' % (name, 'PASS' if ok else 'FAIL')
    yield 'sections:'
    for s in c.sections:
        if s.is_null:
            base = c.architecture is not None and base_slot(c.architecture, s.slot)
            yield '   [%2d] NULL%s' % (s.slot, '' if base is None else '   base slot %s' % base)
            continue
        # The base slot is what a section is called in `docs/config-format.md`, and the pointer
        # array reading is the most useful orientation there is on an unfamiliar config.
        try:
            base = '' if c.architecture is None else '  base %-2s' % base_slot(
                c.architecture, s.slot)
        except GspmError:
            base = ''
        entries = c.pointer_array(s.slot)
        kind = '' if entries is None else '  array of %d pointers' % len(entries)
        if entries is not None and c.architecture is not None:
            try:
                if base_slot(c.architecture, s.slot) == ACTION_LIST_TABLE_SLOT:
                    fit, of = c.action_list_packing()
                    kind += ', action lists (%d of %d packed)' % (fit, of)
            except GspmError:
                pass
        yield '   [%2d] 0x%06X  blob+0x%06X  %7s bytes%s%s' % (
            s.slot, s.address, s.address - c.flash_base,
            c.section_length(s.slot), base, kind)
    if c.keys:
        yield '%s: count=%d' % (c.marker.decode('ascii', 'replace'), len(c.keys))
        by_event: Dict[int, List[int]] = {}
        for k in c.keys:
            by_event.setdefault(k.event_type, []).append(k.scan_code)
        for ev in sorted(by_event):
            scans = sorted(by_event[ev])
            span = ('%d..%d contiguous' % (scans[0], scans[-1])
                    if scans == list(range(scans[0], scans[-1] + 1))
                    else ' '.join(str(s) for s in scans))
            yield '  %-8s %3d scan codes: %s' % (EVENT_NAMES[ev], len(scans), span)
        yield '  codes in order: %s' % ' '.join('0x%02X' % k.event_code for k in c.keys)
