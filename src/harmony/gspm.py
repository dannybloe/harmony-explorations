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

import datetime
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

# The trailer checksum's seed, written as two literals by the boot validator on all three images.
# The checksum is a sixteen bit XOR of the container's little endian words from its first byte up
# to the stored value, which sits six bytes from the end. `docs/findings.md` section 41.
TRAILER_CHECKSUM_SEED = 0x4321
TRAILER_CHECKSUM_OFFSET = 6      # from the end of the container, ahead of the four byte marker


def trailer_checksum(blob: bytes) -> int:
    """Recompute a container's trailer checksum from its bytes.

    An odd trailing byte is not folded in, because the firmware divides the byte count by two and
    counts words. No container in the corpus has an odd body, so that is the firmware's behaviour
    rather than a tested one.
    """
    accumulator = TRAILER_CHECKSUM_SEED
    body = memoryview(blob)[:len(blob) - TRAILER_CHECKSUM_OFFSET]
    for offset in range(0, len(body) - 1, 2):
        accumulator ^= body[offset] | (body[offset + 1] << 8)
    return accumulator

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

# Section slot 3 is an eleven byte framed record holding a timestamp. Its cookie and terminator
# are their own pair, nothing to do with slot 0's, and unlike `0xFEED` this pair occurs exactly
# once in every one of the thirteen samples, so it identifies the record without needing a length
# to validate it.
#
#     +0x00  u16  0xADDF
#     +0x02  u8   second, minute, hour, day of month, day of week, month (0 = January)
#     +0x08  u8   year, offset from 2000
#     +0x09  u16  0xEFBF
#
# The field assignment is not a reading, it is a search result: of the 48 permutations of the four
# date bytes times two month bases times seven weekday offsets, exactly one is consistent with
# every sample. See `docs/findings.md` section 21.
CLOCK_RECORD_SLOT = 3
CLOCK_COOKIE = b'\xdf\xad'
CLOCK_END = b'\xbf\xef'
CLOCK_RECORD_LENGTH = 11
# Day of week is stored as days since this date modulo 7, which is why 0 means Saturday: this
# date was one. The same epoch explains the year offset, so two fields agree on one anchor.
CLOCK_EPOCH = datetime.date(2000, 1, 1)

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

# Base slot 8 holds bindings: one plain action list, then records of instructions that each
# carry an extra leading byte. `docs/findings.md` section 27.
BINDING_TABLE_SLOT = 8
BINDING_LENGTH = 4

# Four opcodes address a second operand space and never leave it: their operand is always at or
# above `OPERAND_HIGH_BAND`, and no other opcode's operand set overlaps theirs. `docs/findings.md`
# section 31. The practical consequence is the reason this is in the library rather than only in
# a test: a value up here survives byte identical between two remotes that share no equipment, so
# it names something the firmware supplies and a codec must carry it through unrenumbered.
OPERAND_HIGH_BAND = 0xC000
HIGH_BAND_OPCODES = frozenset({0x07, 0x0F, 0x1F, 0x3F})

# Base slot 5 is the infrared database, two levels of pointer array over records of mark and
# space durations. `docs/findings.md` section 32.
IR_TABLE_SLOT = 5
IR_POINTER_LENGTH = 3
# Every record in the corpus opens with the same 14 bytes, `{u8; u24; u8; u24; u24; u24}`, whose
# first pointer is always the record's own address minus seven. What the four pointers are for is
# not established, so the header is skipped by length rather than parsed.
IR_RECORD_HEADER = 14
# The pointer array does not point at a record's first byte. It points seven bytes in, at the
# record's **encoding class**, and the three bytes after that point back to the start. Every
# record in the corpus has that same distance of seven. `docs/findings.md` section 42.
IR_RECORD_POINTER_BIAS = 7
# The firmware dispatches the class over exactly these four values, at three sites on each of the
# three images: two in the send dispatcher and one in the record loader. Arch 8, 12 and 14 configs
# use class 1 and nothing else, 2858 records of it; the arch 9 sample reads 5 in every record and
# no arch 9 firmware exists to say what that means.
IR_CLASSES = (1, 2, 3, 4)
IR_CLASS_STREAM = 1
# Below this a record is not carrying a duration stream. The shortest real code in the corpus is
# a 15 bit one, which frames to 34 pulses.
IR_MIN_PULSES = 8
# Opcode 0x7D references an infrared record: high byte the group, low byte the index within it.
# The reference is onto, and one to one: every record in every config is named exactly once.
# `docs/findings.md` section 33.
OPCODE_SEND_IR = 0x7D

# Base slot 13 is the state variable table, named from the firmware routine that reads it.
# `docs/findings.md` section 35.
STATE_TABLE_SLOT = 13

# Base slot 4 maps a firmware raised event number to an entry in the same numbering space
# opcode 0x7E's operand indexes. Thirty events, and the table is a fixed 125 bytes in every
# config in the corpus. `docs/findings.md` section 36.
EVENT_MAP_SLOT = 4
EVENT_MAP_BYTES = 125

# Base slot 6 is the mode table: the things the remote switches between. Opcode 0x7E's operand
# indexes it, and so do the event map's values. `docs/findings.md` section 37.
MODE_TABLE_SLOT = 6
OPCODE_ENTER_MODE = 0x7E
# The firmware runs an entry's tagged action lists by these two tags and no others, on both
# arch 14 images: tag 7 for the mode being left, tag 6 for the one being entered.
MODE_TAG_LEAVE = 7
# A narrow tagged list entry: the tag then a three byte action list instruction.
TAGGED_ENTRY_LENGTH = 4
MODE_TAG_ENTER = 6
# Opcodes whose operand's low byte is a state variable index. 0x71 compares a one byte variable,
# 0x70 the two byte accumulator, 0x72 either.
STATE_INDEX_OPCODES = frozenset({0x70, 0x71, 0x72})

# Base slot 14 is the state value map. Opcode 0x72 names both of its operand bytes at once: the
# low byte is a state variable index and the high byte selects the record to look its value up
# in. `docs/findings.md` section 39.
VALUE_MAP_SLOT = 14
OPCODE_MAP_STATE_VALUE = 0x72
# A record's entry count is a u16 on arch 14 and a u8 on the older architectures; the key is two
# bytes everywhere. Established from the layout rather than assumed: of the four combinations of
# widths, only one makes a record's computed length land on another record's start, and the other
# three score zero, in every config.
VALUE_MAP_COUNT_WIDTH = {8: 1, 9: 1, 12: 1, 14: 2}
VALUE_MAP_KEY_WIDTH = 2
# The range table after it: inclusive bounds and a target, walked only when no value matched.
VALUE_MAP_RANGE_BYTES = 7

# Base slot 16 is the number sender: it converts a value to decimal digits and enqueues one
# instruction per digit. `docs/findings.md` section 39.
NUMBER_SENDER_SLOT = 16
# The consumer reads a flag byte, a u24 base value, a digit count and three u24 instructions
# before it indexes anything, which is fourteen bytes, and then it takes three pointers at fixed
# byte offsets. Those offsets are exactly where the sequential reads leave off, on all three
# images, which is the closure for this layout.
NUMBER_SENDER_HEADER = 14
NUMBER_SENDER_DIGIT_TABLES = (14, 17, 20)     # first digit, middle digits, last digit
NUMBER_SENDER_DIGITS = 10

# The screen language, a second interpreter with its own one byte opcodes, reached from base slot
# 11, from a base slot 14 lookup and from a mode entry. `docs/findings.md` section 40.
SCREEN_TABLE_SLOT = 11
# Operand bytes per opcode, for the fixed length ones. 21 is arch 8 only and its length is
# inferred from the corpus rather than read from a firmware, because no arch 8 image exists.
SCREEN_FIXED_OPERANDS = {1: 6, 2: 5, 3: 9, 4: 5, 16: 1, 17: 3, 20: 3, 21: 4}
SCREEN_END = 0
SCREEN_TEXT_INLINE = 5          # two position bytes then a NUL terminated string
SCREEN_SELECT_FONT = 16         # one operand: the base slot 7 entry every later string draws with
SCREEN_QUEUE_INSTRUCTION = 17   # the bridge to the action list language
SCREEN_SWITCH_NARROW = 18
SCREEN_SWITCH_WIDE = 19
SCREEN_JUMP = 20
# Present in the arch 12 dispatcher and used by no config in the corpus, so their operands are
# not established. Listed so a parser refuses them rather than desynchronising silently.
SCREEN_ARCH12_ONLY = frozenset({22, 23})

# Opcode 2 draws a bitmap that lives at an address rather than inline, which makes it the only
# screen instruction that names a place outside the program. `docs/findings.md` section 50.
SCREEN_DRAW_IMAGE = 2
# `u8 kind` then two `u16`, so the pixels start five bytes in.
BITMAP_HEADER = 5
# The kinds the renderer implements. 2 is a bare RETURN in the firmware, so it draws nothing but
# is still a valid byte; anything above it returns without reading the header at all.
BITMAP_RAW = 0        # `rows` rows of `stride` bytes, straight through
BITMAP_ENCODED = 1    # the skip and literal encoding a base slot 7 glyph uses, section 46
BITMAP_NOTHING = 2
# The two control bytes of the encoded kind, both special cased in the firmware before the generic
# bit 7 path, so neither is inferred from the data.
BITMAP_END = 0x00
BITMAP_ROW_BREAK = 0x80

# Base slot 9 is a second table of tagged handler sets, the same shape as the mode table and two
# orders of magnitude smaller. One entry is current at a time; the firmware runs tag 2 on the
# entry being left and tag 1 on the one being entered.
HANDLER_TABLE_SLOT = 9
HANDLER_TAG_ENTER = 1
HANDLER_TAG_LEAVE = 2
# The instruction that proposes a new current entry: opcode 0x1F with the operand's high byte
# 0xFF, the low byte being the index. Its maximum is exactly the table's count minus one in every
# config in the corpus, which is how the slot was placed.
OPCODE_SELECT_HANDLER = 0x1F
SELECT_HANDLER_OPERAND_HIGH = 0xFF

# Base slot 7 is the font table: each entry is one typeface, and each of its slots one glyph,
# run length encoded. The section was placed in section 40, as the table the screen language's
# opcode 16 indexes; the entries are read in section 46.
#
#     +0x00  u8   glyph height in pixels, the same for every glyph in the set
#     +0x01  u8   the glyph count on arch 12, and 1 on arch 8, 9 and 14
#     +0x02  u8   the glyph count on arch 8, 9 and 14, and 0 on arch 12
#     +0x03  u24  glyph[count]     NULL for a code the config never uses
#
# and each glyph
#
#     +0x00  u8   width in pixels
#     then a stream of one byte operations:
#       0x00        end of glyph
#       0x80 | n    n pixels of the background, skipped
#       n           n literal pixels follow, two bytes each
#
# A row is exactly `width` pixels and the next one starts as soon as that many are accounted for.
# The height is not stored per glyph: it is the set's, and every glyph produces exactly that many
# rows, which is one of the two checks that hold the reading up.
IMAGE_TABLE_SLOT = 7
IMAGE_SET_HEADER = 3
IMAGE_END = 0x00
IMAGE_SKIP = 0x80
IMAGE_PIXEL_BYTES = 2
# Which of the two header bytes carries the count. Measured rather than explained: on arch 8, 9
# and 14 the byte at +1 is 1 in every set of every container and the count is at +2, and on arch 12
# it is the other way round with a 0 in the spare byte. The firmware reads the pair as one `u16`
# and does not bound the glyph code with it, so nothing in the code settles which field is which.
IMAGE_COUNT_OFFSET = {8: 2, 9: 2, 12: 1, 14: 2}
# Arch 9's glyphs use the same terminator and a different packing, and no arch 9 firmware exists
# here to read it out of, so `images` refuses that architecture rather than guessing.
IMAGE_ARCHITECTURES = frozenset({8, 12, 14})
# A glyph code is one based: zero terminates an inline string, so the firmware indexes the set by
# the code minus one. `docs/findings.md` sections 40 and 46.
GLYPH_CODE_BIAS = 1

# Base slot 17 is the touch screen hit map, and it is the one section only arch 12 populates,
# because the Harmony One is the only remote here with a touch panel. Two levels: a page, then the
# rectangles on it. The firmware walks a page in order and returns the first rectangle containing
# the point, so overlapping rectangles are resolved by position rather than being a defect.
TOUCH_MAP_SLOT = 17
TOUCH_AREA_LENGTH = 12
# The panel reports a coordinate as five bits of high byte and eight of low, so the space is
# thirteen bits. Rectangles are allowed to run past the panel's own edge and some do.
TOUCH_COORDINATE_BITS = 13

# Base slot 15 is the parameter block: numbered groups of sixteen bit constants, laid out
# contiguously and reached through the usual count prefixed pointer array. The firmware reads a
# group only when its length is exactly what that build expects, and falls back to a compiled in
# default otherwise, which is why `PARAMETER_GROUP_COUNTS` is a rail rather than a curiosity.
PARAMETER_SLOT = 15
# Architecture -> group index -> the length that architecture's firmware demands. Read off the
# call sites of the guard routine, `0x0F8F0` on the Harmony 700 and `0x23262` on the One, so these
# are what the code compares against rather than what the corpus happens to carry. Groups absent
# from a row have no call site on the image that was read, not a length of zero. No image exists
# for arch 8 or arch 9, so they have no row at all.
PARAMETER_GROUP_COUNTS: Dict[int, Dict[int, int]] = {
    14: {0: 1, 1: 4, 2: 1, 3: 4, 5: 14, 6: 14, 7: 1},
    12: {0: 1, 1: 6, 4: 6, 5: 16, 7: 1, 9: 6, 10: 8},
}

# Base slot 12 is the timer table. Two more branches of the same descending ladder start and
# cancel a timer, and the operand's low byte is the index into this section in both. A record
# says how long to wait and which single instruction to queue when the wait is over.
TIMER_SLOT = 12
TIMER_RECORD_LENGTH = 7
TIMER_START_OPERAND_HIGH = 0xEB
TIMER_CANCEL_OPERAND_HIGH = 0xEA
# The firmware has room for exactly this many timers running at once, on all four images.
TIMER_SLOTS_IN_RAM = 4
# The record's first byte. Every record in the corpus carries 1, which is the kind the firmware
# counts down in its one second scheduler; 0 is counted down in software instead, at a rate this
# project has not measured because nothing in the corpus asks for it.
TIMER_KIND_SCHEDULED = 0x01

# Base slot 2 is the log area: three fields declaring a region of flash above the config that the
# firmware appends to and never erases. Nine bytes on arch 12, where the first field is a u24, and
# eight everywhere else, where it is a u16. `docs/findings.md` section 47.
LOG_SLOT = 2
# An erased flash byte. The boot scan walks the whole region and remembers the last byte that is
# not this, which is how the append position survives a power cycle without being stored anywhere.
LOG_ERASED = 0xFF
# `limit - start` divided by the declared capacity. One byte per unit on arch 12, which is what its
# append routine writes per call, and eight on the other three. Nothing has been read that explains
# the eight, because no arch 14 code reads this section at all.
LOG_STRIDE = {8: 8, 9: 8, 12: 1, 14: 8}
# The append branches of the same descending ladder that starts and cancels a timer. Five cases on
# arch 12, appending one, two and six bytes; the low nibble picks the case. No config in the corpus
# uses any of them, so the whole facility is firmware that nothing here exercises.
LOG_APPEND_OPERAND_HIGH = frozenset(range(0xE1, 0xE6))


def is_high_band(instruction: 'Instruction') -> bool:
    """Whether this instruction's operand is a reference into the second operand space.

    Asks about the operand rather than the opcode on purpose. `0x7A` and `0x79` also reach above
    `OPERAND_HIGH_BAND` without being members of the family, and an editor has to leave their
    operands alone for the same reason.
    """
    return instruction.operand >= OPERAND_HIGH_BAND


@dataclass
class Instruction:
    """One action list instruction: a 16 bit operand and an opcode byte.

    Opcode meanings are not established here. The inventory differs by architecture, which is
    itself a finding: arch 14 leans on opcodes that do not appear in the arch 9 sample at all.
    """
    operand: int
    opcode: int


@dataclass
class EventMap:
    """Base slot 4, the firmware event to entry map."""
    fallback: int
    entries: Dict[int, int]
    length: int

    @property
    def keys_are_contiguous(self) -> bool:
        return set(self.entries) == set(range(len(self.entries)))

    @property
    def reserved_block(self) -> Tuple[int, int]:
        """The inclusive range of values this table claims.

        Worth having as a range rather than a set: opcode `0x7E` indexes the same space and
        avoids this block, so a writer that allocates an entry has to allocate outside it.
        """
        values = self.entries.values()
        return min(values), max(values)


@dataclass
class StateTable:
    """Base slot 13, the state variable table's header and its entry pointers."""
    count: int
    narrow: int          # variables stored as one byte, indices 0 to narrow - 1
    wide: int            # variables stored as two bytes, indices narrow to count - 1
    narrow_again: int    # the header repeats `narrow`; why is not established
    entries: List[int]

    @property
    def is_consistent(self) -> bool:
        return (self.narrow + self.wide == self.count
                and self.narrow_again == self.narrow
                and len(self.entries) == self.count)

    def is_narrow(self, index: int) -> bool:
        """Whether this index reads one byte rather than two."""
        return index < self.narrow

    @property
    def ram_bytes(self) -> int:
        """What the table occupies in the remote's memory once loaded."""
        return self.narrow + 2 * self.wide


@dataclass
class ScreenInstruction:
    """One instruction of the screen language.

    `operands` is the raw operand bytes, because most of them are coordinates and identifiers
    whose meaning is not established. `glyphs` is set only for the inline string opcode and
    `targets` only for the ones that transfer control, which is what makes a program walkable.

    They are glyph indices and not characters: the renderer indexes a font table by the code minus
    one, so nothing here is text in any encoding and none of it decodes to ASCII.
    """
    opcode: int
    operands: bytes
    glyphs: Optional[bytes] = None
    targets: List[int] = field(default_factory=list)

    @property
    def transfers(self) -> bool:
        """Whether the stream continues somewhere else rather than after this instruction."""
        return self.opcode in (SCREEN_JUMP, SCREEN_SWITCH_NARROW, SCREEN_SWITCH_WIDE)


@dataclass
class TaggedEntry:
    """One entry of a tagged list: an instruction the firmware runs when a tag matches.

    Base slots 6 and 9 both point at lists in this encoding and both are read by the same
    firmware routine, which stops at the first entry whose tag matches and runs nothing else.
    `flags` is present only in the second of the two forms; bit 0 is tested and what it means is
    not established.
    """
    tag: int
    operand: int
    opcode: int
    flags: Optional[int] = None


@dataclass
class ValueMap:
    """One base slot 14 record: a value, then a range, then a flash address.

    The firmware walks `entries` comparing each key against the state variable's value and stops
    at the first that matches, so a duplicate key is reachable only through the first copy. If
    nothing matches it walks `ranges`, which are inclusive bounds. Either way the answer is an
    address it follows and hands to the second interpreter at `0x1879C` on the 700, which is a
    different bytecode from the action lists and is not decoded here.
    """
    address: int
    entries: List[Tuple[int, int]]                # value -> flash address
    ranges: List[Tuple[int, int, int]]            # low, high, flash address
    length: int

    def lookup(self, value: int) -> Optional[int]:
        """What this record maps a value to, by the firmware's own order and match rules."""
        for key, target in self.entries:
            if key == value:
                return target
        for low, high, target in self.ranges:
            if low <= value <= high:
                return target
        return None


@dataclass
class NumberSender:
    """One base slot 16 record: how to transmit a number one decimal digit at a time.

    The firmware adds `base` to the value it was handed, converts the sum to packed decimal by
    repeated subtraction of 10000, 1000, 100 and 10, and enqueues one instruction per digit taken
    from `first`, `middle` or `last` according to where the digit sits. `digits` is a floor: the
    conversion raises it to the number of digits the value actually needs.
    """
    address: int
    flags: int
    base: int
    digits: int
    prologue: Instruction        # enqueued before anything else
    epilogue: Instruction        # enqueued after the last digit
    prefix: Instruction          # enqueued first when the value is long enough, see `flags`
    first: List[Instruction]
    middle: List[Instruction]
    last: List[Instruction]


@dataclass
class FontSet:
    """One base slot 7 entry: a typeface, as a sparse array of glyph addresses.

    `height` is the set's, not each glyph's, and every glyph in it decodes to exactly that many
    rows. A None in `glyphs` is a code this config never draws, which is most of them.
    """
    address: int
    height: int
    count: int
    glyphs: List[Optional[int]]


@dataclass
class Image:
    """One glyph out of a base slot 7 set.

    `rows` holds one list per row, `width` long, with None where the encoding skipped a pixel and
    a sixteen bit value where it supplied one. None is kept distinct from a black pixel because
    the format distinguishes them and a renderer will need to.
    """
    address: int
    width: int
    rows: List[List[Optional[int]]]

    @property
    def height(self) -> int:
        return len(self.rows)


@dataclass
class ModeRecord:
    """One base slot 6 entry, with both of its addresses.

    `address` is what the section's pointer array holds and `start` is where the record actually
    begins; the two differ by the record's whole body, so a reader that takes the first for the
    second decodes the tail as if it were the head.
    """
    address: int
    start: int
    kind: int
    entries: List['TaggedEntry']
    length: int


@dataclass
class Bitmap:
    """What a screen opcode 2 addresses: a picture stored away from the program that draws it.

    `stride` is in bytes and not in pixels, because that is what the firmware counts: it draws a
    row by handing `stride` bytes to the row writer and then advances the stream by `stride`. A
    pixel is two bytes here as it is in a glyph, so a raw row is `stride / 2` pixels wide, but the
    file states the byte count and this keeps it.

    `length` is the whole object including its header. `BITMAP_RAW` states it, and `BITMAP_ENCODED`
    is walked to its terminator; None means the walk ran off the end of the container, which is a
    refusal and not a picture.

    `row_breaks` is how many row breaks the encoding contains, and it is set only for the encoded
    kind. It is the closure the extent rests on: the encoded body discards the header, so the two
    agreeing on the row count is two independent statements of the same number.
    """
    address: int
    kind: int
    stride: int
    rows: int
    length: Optional[int]
    row_breaks: Optional[int] = None


@dataclass
class TouchArea:
    """One base slot 17 record: a rectangle on the touch panel and the key code it reports.

    The trailing `self_address` is the record's own address, which is the same back pointer the
    infrared records carry, and it is kept because a reader that finds it wrong has found a
    misaligned record rather than an odd value.
    """
    address: int
    x: int
    width: int
    y: int
    height: int
    code: int
    self_address: int

    def contains(self, x: int, y: int) -> bool:
        """The firmware's own test, half open on both axes."""
        return self.x <= x < self.x + self.width and self.y <= y < self.y + self.height


@dataclass
class Timer:
    """One base slot 12 record: wait this long, then queue this instruction.

    Seven bytes, and the whole of the delayed action is the single `instruction`. Anything longer
    is expressed by making that instruction one that runs an action list, which is what 116 of the
    159 records in the corpus do.
    """
    address: int
    kind: int
    duration: int
    instruction: Instruction


@dataclass
class LogArea:
    """Base slot 2: the region of flash the firmware appends log records to.

    `capacity` is in units of `stride` bytes, and `start + capacity * stride == limit` in every
    container in the corpus, which is the closure that fixes the three field boundaries. The region
    always sits above the config and ends at or near the top of the flash chip.
    """
    address: int
    capacity: int
    start: int
    limit: int

    @property
    def span(self) -> int:
        """The region's length in bytes."""
        return self.limit - self.start

    @property
    def stride(self) -> Optional[int]:
        """Bytes per unit of `capacity`, or None if the declaration does not divide."""
        if self.capacity <= 0 or self.span % self.capacity:
            return None
        return self.span // self.capacity


@dataclass
class Binding:
    """One entry of a base slot 8 record: an action list instruction with a tag in front.

    The tag is a key event code by the same split as the key table, `EVENT_MASK` and
    `SCAN_MASK`: every tag observed on every architecture is a press with a scan code, and the
    scan codes differ per model, which is what physical buttons would do. What the buttons are
    is not established. `docs/findings.md` section 27.
    """
    tag: int
    operand: int
    opcode: int

    @property
    def event_type(self) -> int:
        return self.tag & EVENT_MASK

    @property
    def scan_code(self) -> int:
        return self.tag & SCAN_MASK


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
    built_at: Optional[datetime.datetime] = None   # slot 3's timestamp, see CLOCK_RECORD_SLOT
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

    def binding_records(self) -> Optional[List[List['Binding']]]:
        """Base slot 8, parsed: a leading action list, then records of tagged instructions.

        ```
        +0x00  u8 count; { u16 operand; u8 opcode }[count]     one ordinary action list
               repeated:
                 u8 count; { u8 tag; u16 operand; u8 opcode }[count]
                 0x00 bytes between records are skipped
        ```

        The leading list is what fixes the offset the records start at: `1 + 3 * count` lands
        exactly on the first record in every sample. Returns None when the walk cannot consume
        the section, which is the only validation available and is also the point: a wrong
        reading of the header desynchronises immediately rather than producing plausible
        records. `docs/findings.md` section 27.
        """
        if self.architecture is None:
            return None
        slot = arch_slot(self.architecture, BINDING_TABLE_SLOT)
        if slot >= len(self.sections) or self.sections[slot].is_null:
            return None
        start = self.blob_offset_of(self.sections[slot].address)
        length = self.section_length(slot)
        if start is None or length is None:
            return None
        body = self.blob[start:start + length]
        if not body:
            return None

        records: List[List[Binding]] = []
        at = 1 + INSTRUCTION_LENGTH * body[0]
        while at < len(body):
            count = body[at]
            if count == 0:          # padding between records
                at += 1
                continue
            end = at + 1 + BINDING_LENGTH * count
            if end > len(body):
                return None
            records.append([
                Binding(tag=body[at + 1 + 4 * k],
                        operand=int.from_bytes(body[at + 2 + 4 * k:at + 4 + 4 * k], 'little'),
                        opcode=body[at + 4 + 4 * k])
                for k in range(count)])
            at = end
        return records

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

    def ir_groups(self) -> Optional[List[List[int]]]:
        """Base slot 5, the infrared database: one list of record addresses per group.

        Base slot 5 is a count prefixed array of pointers, and each of those points at a second
        array of the same shape:

        ```
        +0x00  u8   zero, the same spare byte the section table carries
        +0x01  u16  count
        +0x03  u24  record address [count]
        ```

        The number of groups equals the number of distinct high bytes a `0x7C` operand takes, in
        every config in the corpus, and the group indices are contiguous from zero. What a group
        is remains unnamed; the count runs from 1 to 7 across the corpus, which is the right size
        for the equipment somebody owns. `docs/findings.md` section 32.
        """
        try:
            slot = arch_slot(self.architecture, IR_TABLE_SLOT)
        except GspmError:
            return None
        table = self.pointer_array(slot) if slot < len(self.sections) else None
        if table is None:
            return None
        groups = []
        for address in table:
            off = self.blob_offset_of(address)
            if off is None or off + 3 > len(self.blob):
                return None
            count = int.from_bytes(self.blob[off + 1:off + 3], 'little')
            end = off + 3 + IR_POINTER_LENGTH * count
            if end > len(self.blob):
                return None
            groups.append([
                int.from_bytes(self.blob[p:p + IR_POINTER_LENGTH], 'little')
                for p in range(off + 3, end, IR_POINTER_LENGTH)
            ])
        return groups

    def ir_pulses(self, address: int, limit: int = 1024) -> List[Tuple[bool, int]]:
        """The mark and space run inside one infrared record, as `(is_mark, microseconds)`.

        A record is a `IR_RECORD_HEADER` byte header followed by `u16` durations in microseconds
        with **bit 15 set on a mark**. The run is located rather than assumed to start at a fixed
        offset: some records carry a prefix of `0x7FFF` words before the first mark, and how many
        varies. So this returns the longest strictly alternating run in the record, which is what
        a decoder has to do anyway.

        Records whose longest run is shorter than `IR_MIN_PULSES` are not this encoding. The whole
        arch 9 sample is like that, which is consistent with the four infrared encoding classes
        the firmware's dispatcher routes between: this decodes one of them.
        """
        start = self.blob_offset_of(address)
        if start is None:
            return []
        start += IR_RECORD_HEADER
        words = [
            int.from_bytes(self.blob[o:o + 2], 'little')
            for o in range(start, min(start + 2 * limit, len(self.blob) - 1), 2)
        ]
        best = (0, 0)
        i = 0
        while i < len(words):
            j = i + 1
            while j < len(words) and (words[j] >> 15) != (words[j - 1] >> 15):
                j += 1
            if j - i > best[1] - best[0]:
                best = (i, j)
            i = j
        return [(bool(w >> 15), w & 0x7FFF) for w in words[best[0]:best[1]]]

    def ir_frame(self, address: int) -> Optional[Tuple[int, int, int]]:
        """One record read as a framed code: `(header_mark, header_space, bit_count)`.

        The framing is `header mark, header space, bits * (mark, space), trailing mark, trailing
        gap`, so a run of `2 * bits + 4` from the first mark. Returns None when the record does
        not have that shape, which includes every record of the arch 9 sample.

        The closure that carries this reading is in `docs/findings.md` section 32: the bit count
        derived from the length agrees with the bit count of the protocol the header timings name,
        for every well formed record in the corpus.
        """
        pulses = self.ir_pulses(address)
        if len(pulses) < IR_MIN_PULSES:
            return None
        for start, (is_mark, _) in enumerate(pulses):
            if is_mark:
                break
        else:
            return None
        rest = len(pulses) - start - 2
        if rest < 4 or rest % 2:
            return None
        return pulses[start][1], pulses[start + 1][1], (rest - 2) // 2

    def ir_class(self, address: int) -> Optional[int]:
        """The encoding class byte of an infrared record, which selects the send routine.

        The byte the pointer array actually lands on. The firmware reads exactly this one byte and
        branches on it before reading anything else, so it is the first thing a decoder has to
        look at and the last thing section 32 did. `docs/findings.md` section 42.
        """
        offset = self.blob_offset_of(address)
        if offset is None or offset >= len(self.blob):
            return None
        return self.blob[offset]

    def ir_record_start(self, address: int) -> Optional[int]:
        """Where the record's own data begins, from the pointer three bytes after the class.

        Returned rather than computed as `address - IR_RECORD_POINTER_BIAS` on purpose: the bias
        is an observation about the corpus and this is what the firmware follows.
        """
        offset = self.blob_offset_of(address)
        if offset is None or offset + 4 > len(self.blob):
            return None
        return int.from_bytes(self.blob[offset + 1:offset + 4], 'little')

    def mode_table(self) -> Optional[List[int]]:
        """Base slot 6: the address of every mode the remote can switch between.

        ```
        +0x00  u24  count
        +0x03  u24  address[count]
        ```

        A `u24` count rather than the `u8` or `u16` the six recognised pointer arrays use, which
        is why `pointer_array` does not pick this slot up. The entries themselves are not laid out
        immediately after the table, so its size is `3 + 3 * count` and not the gap to slot 7.

        Opcode `OPCODE_ENTER_MODE` indexes this, and so do the event map's values.
        `docs/findings.md` section 37.
        """
        try:
            slot = arch_slot(self.architecture, MODE_TABLE_SLOT)
        except GspmError:
            return None
        if slot >= len(self.sections):
            return None
        off = self.blob_offset_of(self.sections[slot].address)
        if off is None or off + 3 > len(self.blob):
            return None
        count = int.from_bytes(self.blob[off:off + 3], 'little')
        end = off + 3 + 3 * count
        if end > len(self.blob):
            return None
        return [int.from_bytes(self.blob[p:p + 3], 'little')
                for p in range(off + 3, end, 3)]

    def mode_records(self) -> Optional[List['ModeRecord']]:
        """Base slot 6's entries, located the way the firmware locates them.

        **The pointer does not land on the entry.** It lands inside the record, on a discriminator
        byte with a `u24` back pointer to the record's start immediately after, which is exactly
        the shape base slot 5's infrared records have (`docs/findings.md` section 42). The tagged
        list section 37 describes is at the **start**, not at the pointer.

        ```
        at the record start   u8 count; { u8 tag; u16 operand; u8 opcode }[count]
        at the table pointer  u8 kind; u24 the record's own start
        ```

        Reading the list at the pointer instead is what made every mode look like the wide form
        with counts running to 255: the byte there is usually zero, which the wide form's marker
        also is. `docs/findings.md` section 52.
        """
        table = self.mode_table()
        if table is None:
            return None
        out = []
        for address in table:
            off = self.blob_offset_of(address)
            if off is None or off + 4 > self.length:
                return None
            start = int.from_bytes(self.blob[off + 1:off + 4], 'little')
            start_off = self.blob_offset_of(start)
            if start_off is None or start_off >= off:
                return None
            entries = self.tagged_list(start)
            if entries is None:
                return None
            out.append(ModeRecord(address=address, start=start, kind=self.blob[off],
                                  entries=entries, length=1 + TAGGED_ENTRY_LENGTH * len(entries)))
        return out

    def event_map(self) -> Optional['EventMap']:
        """Base slot 4: what each of the thirty firmware events maps to.

        ```
        +0x00  u24  fallback        the value used when no key matches
        +0x03  u16  count           thirty in every config in the corpus
        +0x05  { u8 key; u24 value }[count]
        ```

        The firmware raises an event by loading a literal key and looking it up here, and the
        value it gets goes to the same place opcode `0x7E`'s operand goes. `docs/findings.md`
        section 36.

        Note the size. This table is 125 bytes and the distance from slot 4's pointer to slot 5's
        is between 419 and 1532, because the infrared group arrays are laid out in between. A
        section's size is not the gap to the next pointer.
        """
        try:
            slot = arch_slot(self.architecture, EVENT_MAP_SLOT)
        except GspmError:
            return None
        if slot >= len(self.sections):
            return None
        off = self.blob_offset_of(self.sections[slot].address)
        if off is None or off + 5 > len(self.blob):
            return None
        fallback = int.from_bytes(self.blob[off:off + 3], 'little')
        count = int.from_bytes(self.blob[off + 3:off + 5], 'little')
        end = off + 5 + 4 * count
        if end > len(self.blob):
            return None
        entries = {}
        for k in range(count):
            p = off + 5 + 4 * k
            entries[self.blob[p]] = int.from_bytes(self.blob[p + 1:p + 4], 'little')
        return EventMap(fallback=fallback, entries=entries, length=5 + 4 * count)

    def state_table(self) -> Optional['StateTable']:
        """Base slot 13: how many state variables there are and how wide each one is.

        ```
        +0x00  u16  count           total number of variables
        +0x02  u16  narrow          how many of them are one byte
        +0x04  u16  wide            how many are two bytes; narrow + wide == count
        +0x06  u16  narrow again    the same value repeated, purpose unknown
        +0x08  u24  entry[count]
        ```

        The split is what the firmware's lookup uses: an index below `narrow` reads one byte and
        an index at or above it reads two, so the widths are a property of the index rather than
        of the value. `docs/findings.md` section 35.
        """
        try:
            slot = arch_slot(self.architecture, STATE_TABLE_SLOT)
        except GspmError:
            return None
        if slot >= len(self.sections):
            return None
        off = self.blob_offset_of(self.sections[slot].address)
        if off is None or off + 8 > len(self.blob):
            return None
        count, narrow, wide, again = (
            int.from_bytes(self.blob[off + 2 * k:off + 2 * k + 2], 'little') for k in range(4))
        end = off + 8 + 3 * count
        if end > len(self.blob):
            return None
        entries = [int.from_bytes(self.blob[p:p + 3], 'little')
                   for p in range(off + 8, end, 3)]
        return StateTable(count=count, narrow=narrow, wide=wide, narrow_again=again,
                          entries=entries)

    def state_index(self, instruction: 'Instruction') -> Optional[int]:
        """The state variable an instruction reads, or None if it does not read one."""
        if instruction.opcode not in STATE_INDEX_OPCODES:
            return None
        return instruction.operand & 0xFF

    def _counted_pointers(self, slot: int, width: int) -> Optional[List[int]]:
        """A section read as a count of `width` bytes followed by that many three byte pointers.

        `pointer_array` will not serve here. It accepts a section only when the array accounts
        for the whole of it, and slots 9, 14 and 16 are each followed by the records they point
        at, so the array is a header rather than the section.
        """
        if slot >= len(self.sections) or self.sections[slot].is_null or not self.blob:
            return None
        off = self.blob_offset_of(self.sections[slot].address)
        if off is None or off + width > len(self.blob):
            return None
        count = int.from_bytes(self.blob[off:off + width], 'little')
        end = off + width + 3 * count
        if end > len(self.blob):
            return None
        return [int.from_bytes(self.blob[p:p + 3], 'little')
                for p in range(off + width, end, 3)]

    def _instruction_at(self, offset: int) -> 'Instruction':
        """The three byte instruction at a blob offset, in the action list's own encoding."""
        return Instruction(operand=int.from_bytes(self.blob[offset:offset + 2], 'little'),
                           opcode=self.blob[offset + 2])

    def handler_sets(self) -> Optional[List[int]]:
        """Base slot 9: the address of each tagged handler set.

        ```
        +0x00  u8   count
        +0x01  u24  address[count]
        ```

        Each address is a tagged list in the same encoding base slot 6's mode entries use, so
        `tagged_lists` reads it. The firmware keeps one entry current and runs `HANDLER_TAG_LEAVE`
        on the outgoing one and `HANDLER_TAG_ENTER` on the incoming one when that changes.
        `docs/findings.md` section 39.
        """
        try:
            return self._counted_pointers(arch_slot(self.architecture, HANDLER_TABLE_SLOT), 1)
        except GspmError:
            return None

    def tagged_list(self, address: int) -> Optional[List['TaggedEntry']]:
        """The tagged list at an absolute flash address, in either of the two forms.

        ```
        +0x00  u8   count
        +0x01  { u8 tag; u16 operand; u8 opcode }[count]
        ```

        and, when that count is zero, a second count follows and the entries carry a flags byte:

        ```
        +0x00  u8   0
        +0x01  u8   count
        +0x02  { u8 flags; u8 tag; u16 operand; u8 opcode }[count]
        ```

        Which form applies is decided by the first byte, exactly as the firmware decides it. Base
        slot 6's mode entries and base slot 9's handler sets both point at lists of this shape.
        """
        off = self.blob_offset_of(address)
        if off is None or off >= len(self.blob):
            return None
        count = self.blob[off]
        if count:
            base, stride, wide = off + 1, 4, False
        else:
            if off + 1 >= len(self.blob):
                return None
            count, base, stride, wide = self.blob[off + 1], off + 2, 5, True
        if base + stride * count > len(self.blob):
            return None
        out = []
        for k in range(count):
            p = base + stride * k
            flags = self.blob[p] if wide else None
            tag = self.blob[p + 1] if wide else self.blob[p]
            instruction = self._instruction_at(p + stride - 3)
            out.append(TaggedEntry(tag=tag, operand=instruction.operand,
                                   opcode=instruction.opcode, flags=flags))
        return out

    def handler_index(self, instruction: 'Instruction') -> Optional[int]:
        """The handler set an instruction selects, or None if it does not select one."""
        if instruction.opcode != OPCODE_SELECT_HANDLER:
            return None
        if instruction.operand >> 8 != SELECT_HANDLER_OPERAND_HIGH:
            return None
        return instruction.operand & 0xFF

    def value_maps(self) -> Optional[List['ValueMap']]:
        """Base slot 14: for each record, a map from a state variable's value to a flash address.

        ```
        +0x00  u8   count
        +0x01  u24  address[count]
        ```

        and at each address

        ```
        +0x00  u8   ignored          the firmware steps over it; 2 in every record in the corpus
        +0x01  count                 u16 on arch 14, u8 on arch 8, 9 and 12
        +...   { u16 value; u24 address }[count]
        +...   u8   count of the range table
        +...   { u16 low; u16 high; u24 address }[count]
        ```

        A few addresses point into the middle of a longer record rather than to a record of its
        own, which is the generator sharing tails, so two records can overlap by design.
        """
        counter = VALUE_MAP_COUNT_WIDTH.get(self.architecture)
        if counter is None:
            return None
        try:
            addresses = self._counted_pointers(arch_slot(self.architecture, VALUE_MAP_SLOT), 1)
        except GspmError:
            return None
        if addresses is None:
            return None
        stride = VALUE_MAP_KEY_WIDTH + 3
        out = []
        for address in addresses:
            off = self.blob_offset_of(address)
            if off is None or off + 1 + counter > len(self.blob):
                return None
            count = int.from_bytes(self.blob[off + 1:off + 1 + counter], 'little')
            base = off + 1 + counter
            if base + stride * count >= len(self.blob):
                return None
            entries = []
            for k in range(count):
                p = base + stride * k
                entries.append((int.from_bytes(self.blob[p:p + 2], 'little'),
                                int.from_bytes(self.blob[p + 2:p + 5], 'little')))
            spans = base + stride * count
            span_count = self.blob[spans]
            if spans + 1 + VALUE_MAP_RANGE_BYTES * span_count > len(self.blob):
                return None
            ranges = []
            for k in range(span_count):
                p = spans + 1 + VALUE_MAP_RANGE_BYTES * k
                ranges.append((int.from_bytes(self.blob[p:p + 2], 'little'),
                               int.from_bytes(self.blob[p + 2:p + 4], 'little'),
                               int.from_bytes(self.blob[p + 4:p + 7], 'little')))
            out.append(ValueMap(
                address=address, entries=entries, ranges=ranges,
                length=2 + counter + stride * count + VALUE_MAP_RANGE_BYTES * span_count))
        return out

    def screen_program(self, address: int) -> Optional[List['ScreenInstruction']]:
        """The screen language program at an absolute flash address.

        Instructions are variable length with no length field anywhere, so the walk either stays
        in step or falls off a cliff, and returning None is the cliff. It stops at the end
        opcode, at a jump, or at a switch, since after any of those the stream is somewhere else;
        the successors are in each instruction's `targets`.

        ```
        0        end
        1        6 operand bytes
        2, 4     5, of which the last three are a flash address
        3        9, likewise
        5        two position bytes then a NUL terminated string
        16       1, an index into base slot 7
        17       3, an action list instruction, queued
        18, 19   a switch on a state variable, below
        20       3, a flash address, and the program continues there
        21       4, arch 8 only, length inferred from the corpus
        ```

        A switch reads a state variable index, then a table of exact values and a table of
        inclusive ranges, and jumps to the first target that matches. The counts, the values and
        the bounds are one byte in opcode 18 and two in opcode 19; the target is always three.
        `docs/findings.md` section 40.
        """
        off = self.blob_offset_of(address)
        if off is None:
            return None
        out = []
        limit = len(self.blob)
        while True:
            if not 0 <= off < limit:
                return None
            opcode = self.blob[off]
            off += 1
            if opcode == SCREEN_END:
                out.append(ScreenInstruction(opcode=opcode, operands=b''))
                return out
            if opcode == SCREEN_JUMP:
                target = int.from_bytes(self.blob[off:off + 3], 'little')
                out.append(ScreenInstruction(opcode=opcode, operands=self.blob[off:off + 3],
                                             targets=[target]))
                return out
            if opcode in SCREEN_FIXED_OPERANDS:
                width = SCREEN_FIXED_OPERANDS[opcode]
                if off + width > limit:
                    return None
                out.append(ScreenInstruction(opcode=opcode,
                                             operands=self.blob[off:off + width]))
                off += width
                continue
            if opcode == SCREEN_TEXT_INLINE:
                # A code with bit 7 set is the first half of a wide one and takes a second byte
                # with it, so the terminator cannot be found by scanning for a zero. No string in
                # the corpus is wide, but a parser that assumed narrow would desynchronise on the
                # first one that is.
                end = off + 2
                while end < limit and self.blob[end]:
                    end += 2 if self.blob[end] & 0x80 else 1
                if end >= limit:
                    return None
                out.append(ScreenInstruction(opcode=opcode, operands=self.blob[off:off + 2],
                                             glyphs=self.blob[off + 2:end]))
                off = end + 1
                continue
            if opcode in (SCREEN_SWITCH_NARROW, SCREEN_SWITCH_WIDE):
                width = 2 if opcode == SCREEN_SWITCH_WIDE else 1
                start = off
                off += 1                                  # the state variable index
                targets = []
                for entry in (width + 3, 2 * width + 3):   # values, then ranges
                    count = int.from_bytes(self.blob[off:off + width], 'little')
                    off += width
                    if off + entry * count > limit:
                        return None
                    for k in range(count):
                        p = off + entry * k + entry - 3
                        targets.append(int.from_bytes(self.blob[p:p + 3], 'little'))
                    off += entry * count
                out.append(ScreenInstruction(opcode=opcode, operands=self.blob[start:off],
                                             targets=targets))
                return out
            return None

    def screen_program_roots(self) -> List[int]:
        """Every address the firmware is known to start a screen program at.

        Two sources, both derived rather than guessed: base slot 11 is an array of them, and every
        target of a base slot 14 lookup is one. A mode entry carries a third on arch 8 and arch 14,
        which is not included here because the same rule finds nothing on arch 9 and arch 12.
        """
        try:
            slot = arch_slot(self.architecture, SCREEN_TABLE_SLOT)
        except GspmError:
            return []
        out = list(self.pointer_array(slot) or [])
        for record in self.value_maps() or []:
            out += [target for _, target in record.entries]
            out += [target for _, _, target in record.ranges]
        return out

    def reachable_screen_programs(self) -> Tuple[Dict[int, List['ScreenInstruction']], List[int]]:
        """Every screen program reachable from a root, plus the addresses that did not decode.

        Reachability rather than the root list alone, because a program transfers to others and
        the generator shares tails, so most of them are named by a jump and not by a table.
        """
        seen, queue, failed = set(), list(self.screen_program_roots()), []
        programs: Dict[int, List['ScreenInstruction']] = {}
        while queue:
            address = queue.pop()
            if address in seen:
                continue
            seen.add(address)
            program = self.screen_program(address)
            if program is None:
                failed.append(address)
                continue
            programs[address] = program
            for instruction in program:
                queue += [t for t in instruction.targets if t not in seen]
        return programs, failed

    def bitmap_reference(self, instruction: 'ScreenInstruction') -> Optional[int]:
        """The address a `SCREEN_DRAW_IMAGE` names, which is its last three operand bytes.

        Five operands: two of position and then the address. Returned rather than resolved, so a
        caller that only wants to know which places are addressed does not have to parse them.
        """
        if instruction.opcode != SCREEN_DRAW_IMAGE or len(instruction.operands) < 5:
            return None
        at = len(instruction.operands) - 3
        return int.from_bytes(instruction.operands[at:at + 3], 'little')

    def bitmap_at(self, address: int) -> Optional['Bitmap']:
        """Decode the header of the picture at `address`.

        ```
        +0x00  u8   kind
        +0x01  u16  stride, in bytes per row
        +0x03  u16  rows
        +0x05       the pixels
        ```

        The firmware loads only the **low byte** of each of those two `u16`, so a writer that emits
        a stride or a row count above 255 gets the value modulo 256 and no error. Both fields are
        far below that everywhere in the corpus, which is why the two readings cannot be told apart
        from data and the firmware settles it.
        """
        off = self.blob_offset_of(address)
        if off is None or off + BITMAP_HEADER > self.length:
            return None
        kind = self.blob[off]
        if kind > BITMAP_NOTHING:
            return None
        stride = int.from_bytes(self.blob[off + 1:off + 3], 'little')
        rows = int.from_bytes(self.blob[off + 3:off + 5], 'little')
        length, breaks = None, None
        if kind == BITMAP_RAW:
            length = BITMAP_HEADER + stride * rows
            if off + length > self.length:
                return None
        elif kind == BITMAP_ENCODED:
            length, breaks = self._encoded_extent(off + BITMAP_HEADER)
            if length is None:
                return None
        return Bitmap(address=address, kind=kind, stride=stride, rows=rows, length=length,
                      row_breaks=breaks)

    def _encoded_extent(self, off: int) -> Tuple[Optional[int], Optional[int]]:
        """Walk the encoded body from `off` and return `(whole object length, row breaks)`.

        One byte at a time, exactly as the firmware does it: `BITMAP_END` stops, `BITMAP_ROW_BREAK`
        starts the next row, any other byte with bit 7 set skips that many pixels, and a byte below
        it introduces that many literal **two byte** pixels. The first two are separate cases in
        the code rather than a skip of zero, which is why the row break is a fact and not a guess.
        """
        start, breaks = off, 0
        while off < self.length:
            control = self.blob[off]
            off += 1
            if control == BITMAP_END:
                return BITMAP_HEADER + off - start, breaks
            if control == BITMAP_ROW_BREAK:
                breaks += 1
            elif control & 0x80 == 0:
                off += 2 * control
        return None, None

    def bitmaps(self) -> List['Bitmap']:
        """Every distinct picture any reachable screen program addresses, in address order."""
        addresses = set()
        programs, _ = self.reachable_screen_programs()
        for program in programs.values():
            for instruction in program:
                reference = self.bitmap_reference(instruction)
                if reference is not None:
                    addresses.add(reference)
        out = [self.bitmap_at(address) for address in sorted(addresses)]
        return [bitmap for bitmap in out if bitmap is not None]

    def value_map_reference(self, instruction: 'Instruction') -> Optional[Tuple[int, int]]:
        """The `(state variable, value map record)` an `OPCODE_MAP_STATE_VALUE` names.

        Both halves of the operand are indices, into two different sections. Returned as a pair
        rather than resolved, for the same reason `ir_reference` is: the caller that wants the
        record can ask for the table and will find an out of range index itself.
        """
        if instruction.opcode != OPCODE_MAP_STATE_VALUE:
            return None
        return instruction.operand & 0xFF, instruction.operand >> 8

    def number_senders(self) -> Optional[List['NumberSender']]:
        """Base slot 16: how to transmit a number as decimal digits.

        ```
        +0x00  u8   count
        +0x01  u24  address[count]
        ```

        and at each address, the fourteen bytes the consumer reads in sequence followed by the
        three digit tables it indexes at fixed offsets:

        ```
        +0x00  u8   flags
        +0x01  u24  base added to the value before conversion
        +0x04  u8   minimum number of digits
        +0x05  u24  instruction enqueued first
        +0x08  u24  instruction enqueued last
        +0x0B  u24  instruction enqueued before the digits when the value is long enough
        +0x0E  u24  first digit table
        +0x11  u24  middle digit table
        +0x14  u24  last digit table
        ```

        Each digit table is ten three byte instructions, indexed by the digit. `docs/findings.md`
        section 39. Every config in the corpus carries a count of zero, so this reader has never
        had a record to read; it exists because the firmware's layout is unambiguous and a writer
        would otherwise have nothing to write against.
        """
        try:
            addresses = self._counted_pointers(arch_slot(self.architecture, NUMBER_SENDER_SLOT), 1)
        except GspmError:
            return None
        if addresses is None:
            return None
        out = []
        for address in addresses:
            off = self.blob_offset_of(address)
            if off is None or off + NUMBER_SENDER_HEADER + 9 > len(self.blob):
                return None
            tables = []
            for at in NUMBER_SENDER_DIGIT_TABLES:
                target = self.blob_offset_of(
                    int.from_bytes(self.blob[off + at:off + at + 3], 'little'))
                if target is None or target + 3 * NUMBER_SENDER_DIGITS > len(self.blob):
                    return None
                tables.append([self._instruction_at(target + 3 * d)
                               for d in range(NUMBER_SENDER_DIGITS)])
            out.append(NumberSender(
                address=address,
                flags=self.blob[off],
                base=int.from_bytes(self.blob[off + 1:off + 4], 'little'),
                digits=self.blob[off + 4],
                prologue=self._instruction_at(off + 5),
                epilogue=self._instruction_at(off + 8),
                prefix=self._instruction_at(off + 11),
                first=tables[0], middle=tables[1], last=tables[2]))
        return out

    def timers(self) -> Optional[List['Timer']]:
        """Base slot 12: the timer table.

        ```
        +0x00  u8   count
        +0x01  u24  address[count]
        ```

        and at each address a seven byte record:

        ```
        +0x00  u8   kind, see TIMER_KIND_SCHEDULED
        +0x01  u24  duration, in seconds for the scheduled kind
        +0x04  u24  the instruction queued when it expires
        ```

        The firmware runs at most `TIMER_SLOTS_IN_RAM` of these at once, so a config with thirty
        records is describing thirty possible timers rather than thirty concurrent ones.
        `docs/findings.md` section 43.
        """
        try:
            addresses = self._counted_pointers(arch_slot(self.architecture, TIMER_SLOT), 1)
        except GspmError:
            return None
        if addresses is None:
            return None
        out = []
        for address in addresses:
            off = self.blob_offset_of(address)
            if off is None or off + TIMER_RECORD_LENGTH > len(self.blob):
                return None
            out.append(Timer(address=address,
                             kind=self.blob[off],
                             duration=int.from_bytes(self.blob[off + 1:off + 4], 'little'),
                             instruction=self._instruction_at(off + 4)))
        return out

    def log_area(self) -> Optional['LogArea']:
        """Base slot 2: the flash region the firmware appends log records to.

        ```
        +0x00  u16  capacity        u24 on arch 12, where the section is nine bytes
        +0x02  u24  start           the first byte of the region
        +0x05  u24  limit           one past its last byte
        ```

        Not a pointer array and not indexed by anything: three numbers describing a region. The
        arch 12 firmware scans `[start, limit)` at boot for the last byte that is not `LOG_ERASED`
        and appends after it, refusing once `capacity` units are used up. `docs/findings.md`
        section 47.
        """
        slot = arch_slot(self.architecture, LOG_SLOT)
        if slot >= len(self.sections) or self.sections[slot].is_null:
            return None
        address = self.sections[slot].address
        off = self.blob_offset_of(address)
        length = self.section_length(slot)
        # The capacity field takes up whatever the section has left over after the two addresses,
        # so the arch 12 widening is read rather than special cased.
        if off is None or length is None or length < 8 or off + length > len(self.blob):
            return None
        width = length - 6
        if width not in (2, 3):
            return None
        return LogArea(
            address=address,
            capacity=int.from_bytes(self.blob[off:off + width], 'little'),
            start=int.from_bytes(self.blob[off + width:off + width + 3], 'little'),
            limit=int.from_bytes(self.blob[off + width + 3:off + width + 6], 'little'))

    def log_reference(self, instruction: 'Instruction') -> Optional[int]:
        """The append case an instruction selects, 1 to 5, or None if it is not one.

        The case decides how many bytes of what the record holds; the arch 12 dispatcher is the
        only implementation that has been read. Nothing in the corpus returns anything but None.
        """
        if instruction.opcode != OPCODE_SELECT_HANDLER:
            return None
        high = instruction.operand >> 8
        if high not in LOG_APPEND_OPERAND_HIGH:
            return None
        return high & 0x0F

    def font_sets(self) -> Optional[List['FontSet']]:
        """Base slot 7: one entry per typeface, with the address of each glyph or None.

        ```
        +0x00  u8   glyph height, shared by every glyph in the set
        +0x01  u8   count on arch 12, else 1
        +0x02  u8   count on arch 8, 9 and 14, else 0
        +0x03  u24  glyph[count]     NULL for a code this config never draws
        ```

        The section itself is a plain pointer array, `pointer_array`, and opcode 16 of the screen
        language indexes it. `docs/findings.md` sections 40 and 46.
        """
        slot = arch_slot(self.architecture, IMAGE_TABLE_SLOT)
        entries = self.pointer_array(slot)
        at = IMAGE_COUNT_OFFSET.get(self.architecture)
        if entries is None or at is None:
            return None
        out: List[FontSet] = []
        for entry in entries:
            off = self.blob_offset_of(entry)
            if off is None or off + IMAGE_SET_HEADER > len(self.blob):
                return None
            count = self.blob[off + at]
            end = off + IMAGE_SET_HEADER + 3 * count
            if end > len(self.blob):
                return None
            addresses = [int.from_bytes(self.blob[p:p + 3], 'little')
                         for p in range(off + IMAGE_SET_HEADER, end, 3)]
            out.append(FontSet(address=entry, height=self.blob[off], count=count,
                               glyphs=[a or None for a in addresses]))
        return out

    def image(self, address: int, limit: Optional[int] = None) -> Optional['Image']:
        """Decode the glyph at an absolute flash address, or None if the stream does not fit.

        Returns None rather than a partial image, because a row that does not come to exactly
        `width` pixels means the encoding was misread and a half decoded bitmap would hide that.
        """
        if self.architecture not in IMAGE_ARCHITECTURES:
            return None
        off = self.blob_offset_of(address)
        if off is None or off >= len(self.blob):
            return None
        end = len(self.blob) if limit is None else min(limit, len(self.blob))
        width = self.blob[off]
        if width == 0:
            return None
        at = off + 1
        rows: List[List[Optional[int]]] = []
        row: List[Optional[int]] = []
        while at < end:
            op = self.blob[at]
            at += 1
            if op == IMAGE_END:
                return Image(address=address, width=width, rows=rows) if rows and not row else None
            if op & IMAGE_SKIP:
                row.extend([None] * (op & 0x7F))
            else:
                if at + IMAGE_PIXEL_BYTES * op > end:
                    return None
                for _ in range(op):
                    row.append(int.from_bytes(self.blob[at:at + IMAGE_PIXEL_BYTES], 'little'))
                    at += IMAGE_PIXEL_BYTES
            if len(row) == width:
                rows.append(row)
                row = []
            elif len(row) > width:
                return None
        return None

    def images(self) -> Optional[List[List['Image']]]:
        """Every glyph in base slot 7, grouped by set, with the NULL codes dropped.

        Each glyph is bounded by the next one's address, and the last by the set's own header,
        because the glyphs are laid out immediately before the array that points at them.
        """
        sets = self.font_sets()
        if sets is None:
            return None
        out = []
        for font in sets:
            live = sorted(a for a in font.glyphs if a is not None)
            decoded = []
            for i, address in enumerate(live):
                nxt = self.blob_offset_of(live[i + 1] if i + 1 < len(live) else font.address)
                picture = self.image(address, nxt)
                if picture is None:
                    return None
                decoded.append(picture)
            out.append(decoded)
        return out

    def glyph(self, font: 'FontSet', code: int) -> Optional['Image']:
        """The glyph an inline string's code names, or None if it names nothing.

        The code is one based, because zero terminates a string, so this is where `- 1` lives
        rather than in every caller.
        """
        index = code - GLYPH_CODE_BIAS
        if index < 0 or index >= len(font.glyphs):
            return None
        address = font.glyphs[index]
        if address is None:
            return None
        live = sorted(a for a in font.glyphs if a is not None)
        after = [a for a in live if a > address]
        return self.image(address, self.blob_offset_of(after[0] if after else font.address))

    def touch_pages(self) -> Optional[List[List['TouchArea']]]:
        """Base slot 17: the touch screen hit map, one list of rectangles per page.

        ```
        +0x00  u8   pages
        +0x01  u24  page[pages]
        ```

        each page

        ```
        +0x00  u8   areas
        +0x01  u24  area[areas]
        ```

        and each area twelve bytes

        ```
        +0x00  u16  x
        +0x02  u16  width
        +0x04  u16  y
        +0x06  u16  height
        +0x08  u8   the key code a hit reports
        +0x09  u24  the record's own address
        ```

        Empty on every architecture but 12, where both Harmony One configs carry it.
        `docs/findings.md` section 45.
        """
        try:
            pages = self._counted_pointers(arch_slot(self.architecture, TOUCH_MAP_SLOT), 1)
        except GspmError:
            return None
        if pages is None:
            return None
        out: List[List[TouchArea]] = []
        for page in pages:
            addresses = self._counted_pointers_at(page)
            if addresses is None:
                return None
            areas = []
            for address in addresses:
                off = self.blob_offset_of(address)
                if off is None or off + TOUCH_AREA_LENGTH > len(self.blob):
                    return None
                fields = [int.from_bytes(self.blob[off + 2 * k:off + 2 * k + 2], 'little')
                          for k in range(4)]
                areas.append(TouchArea(address=address, x=fields[0], width=fields[1],
                                       y=fields[2], height=fields[3],
                                       code=self.blob[off + 8],
                                       self_address=int.from_bytes(
                                           self.blob[off + 9:off + 12], 'little')))
            out.append(areas)
        return out

    @staticmethod
    def touch_hit(page: List['TouchArea'], x: int, y: int) -> Optional[int]:
        """The code the firmware would report for a touch, or None if the point misses.

        First match wins, in table order, because that is what the firmware's loop does. The
        rectangles on a page do overlap, so the order is part of the data rather than incidental.
        """
        for area in page:
            if area.contains(x, y):
                return area.code
        return None

    def _counted_pointers_at(self, address: int) -> Optional[List[int]]:
        """A `{ u8 count; u24 address[count] }` array at an absolute flash address."""
        off = self.blob_offset_of(address)
        if off is None or off >= len(self.blob):
            return None
        count = self.blob[off]
        if off + 1 + 3 * count > len(self.blob):
            return None
        return [int.from_bytes(self.blob[p:p + 3], 'little')
                for p in range(off + 1, off + 1 + 3 * count, 3)]

    def parameter_groups(self) -> Optional[List[List[int]]]:
        """Base slot 15: the parameter block, as a list of groups of sixteen bit constants.

        ```
        +0x00  u8   count
        +0x01  u24  address[count]
        ```

        and at each address

        ```
        +0x00  u8   entries
        +0x01  u16  value[entries]
        ```

        The section's own count is demanded by the firmware, 9 on arch 14 and 11 on arch 12, and so
        is each group's length: see `PARAMETER_GROUP_COUNTS`. `docs/findings.md` section 44.
        """
        slot = arch_slot(self.architecture, PARAMETER_SLOT)
        if slot >= len(self.sections) or self.sections[slot].is_null:
            return None
        addresses = self.pointer_array(slot)
        if addresses is None:
            return None
        out = []
        for address in addresses:
            off = self.blob_offset_of(address)
            if off is None or off >= len(self.blob):
                return None
            entries = self.blob[off]
            if off + 1 + 2 * entries > len(self.blob):
                return None
            out.append([int.from_bytes(self.blob[off + 1 + 2 * i:off + 3 + 2 * i], 'little')
                        for i in range(entries)])
        return out

    def parameter_group_lengths_match(self) -> Optional[bool]:
        """Whether every group the firmware knows about is the length it demands.

        None when no firmware for this architecture has been read, which is arch 8 and arch 9. A
        writer that gets this wrong is not refused: the subsystem quietly uses its own defaults.
        """
        wanted = PARAMETER_GROUP_COUNTS.get(self.architecture)
        groups = self.parameter_groups()
        if wanted is None or groups is None:
            return None
        return all(index < len(groups) and len(groups[index]) == length
                   for index, length in wanted.items())

    def timer_reference(self, instruction: 'Instruction') -> Optional[Tuple[bool, int]]:
        """`(starts, index)` for an instruction that starts or cancels a timer, else None.

        `starts` is False for the cancel branch, which takes the same index. Returned unresolved
        for the same reason `ir_reference` is: a caller that wants the record asks `timers`.
        """
        if instruction.opcode != OPCODE_SELECT_HANDLER:
            return None
        high = instruction.operand >> 8
        if high not in (TIMER_START_OPERAND_HIGH, TIMER_CANCEL_OPERAND_HIGH):
            return None
        return high == TIMER_START_OPERAND_HIGH, instruction.operand & 0xFF

    def ir_reference(self, instruction: 'Instruction') -> Optional[Tuple[int, int]]:
        """The `(group, index)` an `OPCODE_SEND_IR` instruction names, or None if it is not one.

        Returns the pair without checking it against the table, because a caller that wants the
        record should ask `ir_groups` and would then find an out of range index by itself. No
        operand in the corpus is out of range.
        """
        if instruction.opcode != OPCODE_SEND_IR:
            return None
        return instruction.operand >> 8, instruction.operand & 0xFF

    def ir_references(self) -> Optional[List[Tuple[int, int]]]:
        """Every infrared reference in the config's action lists, in list order."""
        lists = self.action_lists()
        if lists is None:
            return None
        return [(i.operand >> 8, i.operand & 0xFF)
                for lst in lists for i in lst if i.opcode == OPCODE_SEND_IR]

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


def clock_record(blob: bytes, off: int) -> Optional[datetime.datetime]:
    """The timestamp in the slot 3 record at `off`, or None if there is not one there.

    Returns None rather than raising for anything that does not fit, including a stored day of
    week that disagrees with the date. That check is the reason to trust the reading at all, so
    it stays in the parser rather than only in a test: a record that fails it is not a record
    this code understands.
    """
    if blob[off:off + 2] != CLOCK_COOKIE:
        return None
    if blob[off + 9:off + 11] != CLOCK_END:
        return None
    second, minute, hour, day, dow, month, year = blob[off + 2:off + 9]
    try:
        stamp = datetime.datetime(2000 + year, month + 1, day, hour, minute, second)
    except ValueError:
        return None
    if (stamp.date() - CLOCK_EPOCH).days % 7 != dow:
        return None
    return stamp


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

    if len(container.sections) > CLOCK_RECORD_SLOT:
        clock_addr = container.sections[CLOCK_RECORD_SLOT].address
        o = clock_addr - flash_base if clock_addr else -1
        if 0 <= o and o + CLOCK_RECORD_LENGTH <= len(blob):
            container.built_at = clock_record(blob, o)

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
        # Passing this means the stored day of week agrees with the date, so it is a closure and
        # not just a shape match. Slots 1 and 3 sit below the first insertion at 8, so a base
        # slot number indexes them directly on all four architectures.
        'slot3_is_a_timestamp': container.built_at is not None,
        # The one check a writer cannot skip: the remote refuses a config whose trailer checksum
        # does not recompute, so this is the boot validator's own test run here.
        'trailer_checksum_recomputes':
            trailer_checksum(blob) == container.trailer_checksum,
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
        'built_at': c.built_at.isoformat() if c.built_at is not None else None,
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
    yield 'built at        %s   (slot %d timestamp)' % (
        c.built_at.isoformat(sep=' ') if c.built_at else 'unstated', CLOCK_RECORD_SLOT)
    yield 'trailer checksum 0x%04X   (seeded word XOR, section 41)' % c.trailer_checksum
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
