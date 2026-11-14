#!/usr/bin/env python3
"""The names a Harmony Touch answers to over the file protocol, as its native USB program registers and
handles them.

**The question** was to have every name the remote answers to over the cable documented
in full: file or action, what reading or writing it does and returns, which act on being opened, and how
`/sys/hlapi` reaches the remote's software. Two answers were wanted above the rest: whether a stored
configuration can be read back off a Touch and by which route, and whether `/sys/factoryreset` and
`/sys/reboot` act when they are opened<!--superseded-->, as the reference said, or only on a write. The page is
`reference/architectures/harmony-touch/api/names.md`, with the API overview in `README.md`.

**Where the reading was done.** The native program, `usr/bin/hal` of the production root filesystem, build
4.15.330, read out of the production package itself through `SquashfsReader` and `members` in
`test_harmony_touch_image.py`, and parsed as a 32 bit little endian ELF through `Elf` in
`test_harmony_touch_architecture.py`, which reads words and strings by virtual address through the load
segments. The program is ARM and stripped, so nothing here depends on a symbol.

**What was read, and what this file asserts.** The program registers its names from one static table at
`0x37940`, 54 entries of 56 bytes, each a path or a dotted prefix, an engine name, an optional backing file
and eleven handler slots (note 1.4 said five; eleven is what the entries use). A slot holds the function for
one kind of access: 0 open, 1 close, 2 write, 3 the length of what a read returns, and 4, 8 and 9 the open,
generate and close of the names that build their answer. This said 1 read and 3 close<!--superseded--> until the
request handler's own calls were read, `ThePowerSourceIsAPlainRead` below: the four were listed in the usual order
of file operations and no test read which slot the handler calls for which access. The table is parsed here and
set against the page:

1. **The names.** Asserted: the page's table names, keyed by path or by engine name where there is no path,
   equal the table's, both ways, so a name added to the firmware or the page fails the test; and each row's
   engine name and backing file equal the firmware's.
2. **The kinds.** `read` returns something and changes nothing, `change` stores what is written, `action`
   acts on the remote beyond its stored data, `forward` hands the request to the software. Asserted: each
   row's kind equals `KIND` here; every `read` fills no write slot and every `change` fills one. The acting
   names are derived from their slots: four actions fill the write slot alone (`/sys/reboot`,
   `/sys/factoryreset`, `/tde/shipmode`, `/tde/fb`), beside `/sys/time`, a change; two actions fill the
   generate open slot alone (`/tde/haptic/diagnostic`, `/tde/haptic/calibrate`), beside `/tde/accel`, a read.
   So a native name can act on an open for reading as well as on a write; the slot shape does not say which of
   a write or an open a lone slot does, which is `KIND`, held against the slot sets rather than re-derived.
3. **The handlers that carry the answers.** Read by the strings each one references out of the read only
   data, by its position independent offsets from the global offset table: `/sys/reboot`'s write handler
   names `reboot`; `/sys/factoryreset`'s names `all`, the marker file `/cache/factoryreset`, the mode `w+` and
   the two device nodes `/dev/mspfw` and `/dev/rffw` it opens for writing (what it writes to them and what the
   drivers do is not read); and `/data/resource`'s open slot is the generic generate open the other generate
   names share, which names no `file`, while its generate handler names `file`, the key of its JSON argument,
   and opens the named file for reading with the mode `r`.
4. **The registration.** Asserted: `/sys/mfg` is the last entry, the fifty fourth, and the loop that
   registers the others counts to 53, so 53 are registered unconditionally and `/sys/mfg` is the one the
   program registers only when the test flag is set; and the test flag's file, `/etc/tdeflag`, is named.

**The two answers.** A stored configuration is **not** read back off a Touch by `/data/resource`: that name's
open over the file protocol is the generic generate open, shared with the other generate names, which carries
no `file` argument, so the open of an empty name fails; the argument reaches its generate handler only when
the engine calls it over the radio, `hot.1.data.resource`, to fetch one of four documents from a paired hub.
No software request returns a stored document either, `test_harmony_touch_api_engine.py`; the one read back
route is the engine's resource put followed by `proxy.request`, `test_harmony_touch_api_setup.py`. And the
acting native names do not all act on a write: `/sys/reboot` and `/sys/factoryreset`, with `/tde/shipmode` and
`/tde/fb`, act on a write, each filling the write slot alone, while `/tde/haptic/diagnostic` and
`/tde/haptic/calibrate` act on an open for reading, each filling the generate open slot alone. This file and
the page once read the two actions as both acting on a write, which this corrects.

5. **The library never opens the acting names.** `NEVER_OPENED_PATHS` in `packages/usb/src/filepipe.ts`, the
   paths the transport refuses at any open whatever the flags, is exactly the four names that act on a write,
   the two that act on an open and the two firmware names, `ACT_ON_A_WRITE`, `ACT_ON_AN_OPEN` and
   `TAKE_FIRMWARE` here. Read off the TypeScript source, so the two languages cannot hold different lists, and
   static: it runs without the lab. A review of the request channel's rail found every TypeScript test iterating the
   exported list, so an emptied list passed them all; `touchsession.test.ts` names the eight as literals too.

**The controls.** Each was made by replacing a string in the page or in an expected value and reversing it,
with the file's hash compared before and after, and each made the named test fail alone: a name dropped from
the page's table, an engine name changed in a row, a backing file changed, a kind changed (an action turned
read drops out of the write only or open only set), `reboot` searched for in the factory reset handler and
`factoryreset` in the reboot handler, and the registration count searched for as 54. Negative controls run
every time: a read name holds no write slot while a change name does; the reboot handler names neither the
reset marker nor `all`; a read name (`/proc`) has an open and a read slot, so filling the write slot alone
means something; and the generic generate open names no `file`, so a bare file-protocol open carries no
argument.

**Sources checked first.** `reference/architectures/harmony-touch/` (all pages), `answering-a-sync.md`,
`reference/usb-protocol/file-protocol.md`, the lab's notes `1.3-how-a-configuration-arrives.md` and
`1.4-the-names-the-remote-answers-to.md`, and the lab register's row for the firmware folder. Logitech's
clients were not consulted: the question is what the remote does with a name, which only its firmware states.

**Width.** One firmware build, production 4.15.330, which serves every skin its descriptor names. The
behaviour is a Harmony Touch's, host name `juniper`; the hubs run a sibling image, not read.

**Standing.** Read in the firmware. Nothing in this file quotes Logitech's code: it asserts names, numbers
and counts.
"""
import hashlib
import os
import re
import shutil
import struct
import tempfile
import unittest

import lab
from .test_harmony_touch_image import SquashfsReader, members
from .test_harmony_touch_architecture import Elf

IMAGE = 'touch_package_production'
UNSQUASHFS = shutil.which('unsquashfs')
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
API = os.path.join(ROOT, 'reference', 'architectures', 'harmony-touch', 'api')
HAL = 'usr/bin/hal'

#: The name table: its address, one entry's size, the number of entries, and where the slots start in an
#: entry. An entry is a path pointer, an engine name pointer, a backing file pointer, then eleven slots.
TABLE, ENTRY, COUNT, SLOTS_AT = 0x37940, 56, 54, 12
#: The read only data section, VMA to end, and the global offset table's base, both read from the ELF's
#: section headers once; a position independent string reference is the table base plus a signed offset.
RODATA = (0x27890, 0x2f0fc)
GOT = 0x37634

#: Each name's kind, keyed by its path, or by its engine name where it has no path. Not in the table: this is
#: the reading of what each handler does, set against the page and, for the structural part, against the slots.
KIND = {
    '/sys/sysinfo': 'read', '/sys/reboot': 'action', '/sys/logread': 'read',
    '/fw/otaupdate': 'action', '/fw/hub-otaupdate': 'action',
    'control.': 'forward', 'harmony.': 'forward', 'proxy.': 'forward', 'connect.': 'forward',
    'setup.': 'forward', 'hub.notify': 'forward',
    '/ir/ir_cap': 'read', '/ir/ir_send': 'action', '/ir/ir_loopback': 'action', '/ir/ir_test': 'action',
    '/sys/time': 'change', '/rf/pair': 'action', '/rf/hid': 'change', '/rf/deviceinfo': 'read',
    '/rf/unpair': 'action', 'hot.stats': 'read', '/rf/hot': 'action', '/rf/test': 'action',
    '/sys/ping': 'read', '/sys/led': 'action', '/data/resource': 'read', '/sys/hlapi': 'forward',
    '/proc': 'read', '/sys/factoryreset': 'action', '/tde/flag': 'change', '/tde/powerstate': 'change',
    '/tde/vbat': 'read', '/tde/vdc': 'read', '/tde/vsys': 'read', '/tde/batttemp': 'read',
    '/tde/battcharge': 'read', '/tde/keyled': 'change', '/tde/backlight': 'change', '/tde/fb': 'action',
    '/tde/enable': 'action', '/tde/memtester': 'change', '/tde/msp430/version': 'read',
    '/tde/msp430/time': 'read', '/tde/lcd/model': 'read', '/tde/fgauge/vbat': 'read',
    '/tde/fgauge/current': 'read', '/tde/fgauge/soc': 'read', '/tde/fgauge/all': 'read',
    '/tde/shipmode': 'action', '/tde/haptic/diagnostic': 'action', '/tde/haptic/calibrate': 'action',
    '/tde/accel': 'read', '/sys/dropbear': 'change', '/sys/mfg': 'change',
}

#: The actions that fill the write slot alone, and so act on a write; the slot sets are read in the image below.
ACT_ON_A_WRITE = {'/sys/reboot', '/sys/factoryreset', '/tde/shipmode', '/tde/fb'}
#: The actions that fill the generate open slot alone, and so act on an open for reading.
ACT_ON_AN_OPEN = {'/tde/haptic/diagnostic', '/tde/haptic/calibrate'}
#: The two names that take a firmware package to install.
TAKE_FIRMWARE = {'/fw/otaupdate', '/fw/hub-otaupdate'}

FILEPIPE = os.path.join(ROOT, 'packages', 'usb', 'src', 'filepipe.ts')


def signed(word):
    return word - 0x100000000 if word > 0x7fffffff else word


def c_string(elf, va):
    """The NUL terminated string at a virtual address, as text, or None if it is not all printable."""
    try:
        raw = elf.string(va)
    except AssertionError:
        return None
    if raw and all(0x20 <= b < 0x7f for b in raw):
        return raw.decode('ascii')
    return None


def entries(elf):
    """Each table entry as {path, engine, backing, slots}: the three names as text or None, and the tuple of
    slot indices whose handler pointer is set."""
    out = []
    for i in range(COUNT):
        base = TABLE + i * ENTRY
        path, engine, backing = (elf.word(base + 4 * w) for w in range(3))
        slots = tuple(s for s in range(11)
                      if elf.word(base + SLOTS_AT + 4 * s) != 0)
        out.append({
            'path': c_string(elf, path) if path else None,
            'engine': c_string(elf, engine) if engine else None,
            'backing': c_string(elf, backing) if backing else None,
            'slots': slots,
            'handlers': {s: elf.word(base + SLOTS_AT + 4 * s) for s in slots},
        })
    return out


def key(entry_or_row):
    """A name's key: its path, or its engine name where there is no path."""
    return entry_or_row['path'] or entry_or_row['engine']


def gotoff_strings(elf, start, limit=600):
    """Every read only string a function references, by walking its instructions and resolving each
    `ldr rX, [pc, #imm]` as a position independent offset from the global offset table base. A reference that
    does not land in the read only data, such as the base itself or a code address, is left out. The walk runs
    to the function's literal pool, which sits after the code, so it covers every return branch and not only
    the first; `pool` is the lowest literal address a load has reached, and the code ends where it begins."""
    found, va, pool = set(), start, start + 4 * limit
    while va < pool:
        word = elf.word(va)
        if (word & 0xFF7F0000) == 0xE51F0000:               # ldr rX, [pc, #imm]
            imm = word & 0xFFF
            literal = va + 8 + (imm if word & 0x00800000 else -imm)
            pool = min(pool, literal)
            target = (GOT + signed(elf.word(literal))) & 0xFFFFFFFF
            if RODATA[0] <= target < RODATA[1]:
                text = c_string(elf, target)
                if text is not None:
                    found.add(text)
        va += 4
    return found


def read_page(name):
    with open(os.path.join(API, name), encoding='utf-8') as page:
        return page.read()


def rows_of(text):
    """The big table's data rows, as {path, engine, what, kind, backing}, keyed later by path or engine. A
    cell's backticks are stripped; an empty cell is None."""
    def cell(value):
        value = value.strip().strip('`').strip()
        return value or None
    rows = []
    for line in text.splitlines():
        line = line.strip()
        if not line.startswith('|'):
            continue
        parts = [cell(p) for p in line.strip('|').split('|')]
        if len(parts) != 5 or parts[0] == 'name' or (parts[0] and set(parts[0]) <= set('-: ')):
            continue
        if parts[3] not in ('read', 'change', 'action', 'forward'):
            continue
        rows.append({'path': parts[0], 'engine': parts[1], 'what': parts[2],
                     'kind': parts[3], 'backing': parts[4]})
    return rows


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheNativeProgram(unittest.TestCase):
    """The name table parsed out of the production program, read once."""

    _elf = None

    @classmethod
    def setUpClass(cls):
        lab.require(IMAGE)
        if TheNativeProgram._elf is None:
            with tempfile.TemporaryDirectory() as directory:
                reader = SquashfsReader(members(IMAGE)['harmony-image.squashfs'], directory)
                TheNativeProgram._elf = Elf(reader.each([HAL])[HAL])
        cls.elf = TheNativeProgram._elf
        cls.entries = entries(cls.elf)
        cls.by_key = {key(e): e for e in cls.entries}

    def entry(self, name):
        return self.by_key[name]


class TheTableAndThePageAgree(TheNativeProgram):
    """Fact 1: the page's table against the firmware's, both ways, with each engine name and backing file."""

    def test_the_table_holds_fifty_four_entries_each_with_a_name(self):
        self.assertEqual(len(self.entries), COUNT)
        self.assertEqual(len(self.by_key), COUNT, 'every entry has a distinct path or engine name')
        for entry in self.entries:
            self.assertTrue(entry['path'] or entry['engine'])

    def test_the_names_pages_table_is_exactly_the_firmwares(self):
        page = {key(row): row for row in rows_of(read_page('names.md'))}
        self.assertEqual(set(page), set(self.by_key))             # both ways in one equality
        for name, entry in self.by_key.items():
            self.assertEqual(page[name]['path'], entry['path'], name)
            self.assertEqual(page[name]['engine'], entry['engine'], name)
            self.assertEqual(page[name]['backing'], entry['backing'], name)


class TheKindsFollowTheSlots(TheNativeProgram):
    """Fact 2: the page's kinds, and the slot pattern that bears them out."""

    def test_every_rows_kind_is_the_documented_kind(self):
        page = {key(row): row for row in rows_of(read_page('names.md'))}
        self.assertEqual(set(KIND), set(self.by_key), 'KIND covers exactly the table')
        for name, row in page.items():
            self.assertEqual(row['kind'], KIND[name], name)

    def test_a_read_fills_no_write_slot_and_a_change_fills_one(self):
        for name, kind in KIND.items():
            slots = self.entry(name)['slots']
            if kind == 'read':
                self.assertNotIn(2, slots, name)             # a read cannot be written
            elif kind == 'change':
                self.assertIn(2, slots, name)                # a change is a write


class TheActingNamesActOnAWriteOrAnOpen(TheNativeProgram):
    """Fact 2 and point 1: the names that act, derived from their slots. Four actions fill the write slot
    alone (`/sys/reboot`, `/sys/factoryreset`, `/tde/shipmode`, `/tde/fb`), beside `/sys/time`, a change that
    also fills it; two actions fill the generate open slot alone (`/tde/haptic/diagnostic`,
    `/tde/haptic/calibrate`), beside `/tde/accel`, a read that also fills it. So a native name can act on an
    open for reading, which corrects the earlier reading that the only two actions both acted on a write.

    The slot shape alone does not say whether a lone write stores or acts, nor whether a lone open reads or
    acts: `/sys/time` and `/tde/accel` share those shapes and are a change and a read. That distinction is
    `KIND`, the handler reading, which these tests hold the slot sets against rather than re-derive."""

    def test_the_write_only_names_are_four_actions_and_the_clock(self):
        write_only = {key(e) for e in self.entries if e['slots'] == (2,)}
        self.assertEqual(write_only,
                         {'/sys/reboot', '/sys/factoryreset', '/tde/shipmode', '/tde/fb', '/sys/time'})
        self.assertEqual({n for n in write_only if KIND[n] == 'action'}, ACT_ON_A_WRITE)
        self.assertEqual({n for n in write_only if KIND[n] == 'change'}, {'/sys/time'})
        # The control: a read name has an open and a read slot, so filling the write slot alone means something.
        self.assertEqual(self.entry('/proc')['slots'], (0, 1, 3))

    def test_the_open_only_names_are_two_actions_and_the_accelerometer(self):
        open_only = {key(e) for e in self.entries if e['slots'] == (4,)}
        self.assertEqual(open_only, {'/tde/haptic/diagnostic', '/tde/haptic/calibrate', '/tde/accel'})
        self.assertEqual({n for n in open_only if KIND[n] == 'action'}, ACT_ON_AN_OPEN)
        self.assertEqual({n for n in open_only if KIND[n] == 'read'}, {'/tde/accel'})
        # `/ir/ir_loopback` and `/rf/test` fill an open slot (0) beside a generate (8) and a close (3), so they
        # too run a handler on being opened; what those open time handlers do is not read.
        for name in ('/ir/ir_loopback', '/rf/test'):
            self.assertEqual(self.entry(name)['slots'], (0, 3, 8), name)

    def test_the_reboot_handler_names_reboot_and_not_the_reset(self):
        held = gotoff_strings(self.elf, self.entry('/sys/reboot')['handlers'][2])
        self.assertIn('reboot', held)
        self.assertNotIn('all', held)
        self.assertNotIn('/cache/factoryreset', held)

    def test_the_factoryreset_handler_names_all_the_marker_and_the_two_device_nodes(self):
        held = gotoff_strings(self.elf, self.entry('/sys/factoryreset')['handlers'][2])
        for name in ('all', '/cache/factoryreset', '/dev/mspfw', '/dev/rffw'):
            self.assertIn(name, held, name)
        # It opens the two device nodes for writing (`w+`); what it writes to them, and what the drivers then
        # do, is not read here.
        self.assertIn('w+', held)
        self.assertNotIn('reboot', held)


class TheLibraryNeverOpensTheActingNames(unittest.TestCase):
    """Fact 5: the transport's list of paths it never opens is the acting names and the firmware names, no more
    and no fewer. Static, so it holds with no lab."""

    def never_opened(self):
        with open(FILEPIPE, encoding='utf-8') as f:
            source = f.read()
        found = re.search(r'export const NEVER_OPENED_PATHS: readonly string\[\] = \[(.*?)\];', source, re.S)
        self.assertIsNotNone(found, 'NEVER_OPENED_PATHS is declared in filepipe.ts')
        return re.findall(r"'([^']*)'", found.group(1))

    def test_the_list_is_the_names_that_act_on_a_write_or_an_open_and_the_firmware_names(self):
        paths = self.never_opened()
        self.assertEqual(len(paths), len(set(paths)), 'no path listed twice')
        self.assertEqual(set(paths), ACT_ON_A_WRITE | ACT_ON_AN_OPEN | TAKE_FIRMWARE)
        self.assertEqual(len(paths), 8)

    def test_every_listed_name_is_an_action_by_the_handler_reading(self):
        for path in self.never_opened():
            self.assertEqual(KIND[path], 'action', path)
        # The control: not every action is on the list, `/ir/ir_send` being one left behind the experiment
        # door, so the list is the acting names chosen by their slots and not every name of that kind.
        self.assertNotIn('/ir/ir_send', self.never_opened())


class ResourceIsTheHubRadioFetch(TheNativeProgram):
    """Point 2: /data/resource's open is the generic generate open, shared with the other generate names, so a
    bare open over the file protocol captures no `file` argument; only the generate handler reads `file`, which
    the engine supplies over the radio as `hot.1.data.resource`. So it is not a cable read back of the store;
    the earlier reading that a read of it returns the file named in its argument is corrected."""

    def test_resource_open_is_the_generic_open_shared_with_the_other_generate_names(self):
        resource = self.entry('/data/resource')
        self.assertEqual(resource['slots'], (4, 8, 9))       # the generate family, no write slot
        # The open slot (4) is the same handler the other generate names fill, so it captures no `file`.
        shared = {self.entry(n)['handlers'][4]
                  for n in ('/sys/sysinfo', '/sys/logread', '/rf/deviceinfo', '/data/resource')}
        self.assertEqual(len(shared), 1, 'one generic generate open for all four')
        self.assertNotIn('file', gotoff_strings(self.elf, resource['handlers'][4]))

    def test_only_the_generate_handler_reads_a_file_argument(self):
        held = gotoff_strings(self.elf, self.entry('/data/resource')['handlers'][8])
        self.assertIn('file', held)                          # the key of its JSON argument
        self.assertIn('r', held)                             # opened for reading
        # The argument arrives from the engine's radio call; the file-protocol open above does not carry it.


class TheRegistration(TheNativeProgram):
    """Fact 4: 53 names are registered unconditionally and /sys/mfg only when the test flag is set."""

    def test_mfg_is_the_last_entry(self):
        self.assertEqual(key(self.entries[-1]), '/sys/mfg')

    def test_the_loop_counts_to_fifty_three_and_the_flag_file_is_named(self):
        # The registration loop ends with `cmp r4, #53`; the fifty fourth name is registered after it.
        code = self.elf.data
        needle = struct.pack('<I', 0xE3540035)               # cmp r4, #53
        self.assertEqual(code.count(needle), 1, 'one loop counts to 53')
        self.assertEqual(code.count(b'/etc/tdeflag\x00'), 1, 'the test flag file is named once')


#: The native program's SHA-256, production build 4.15.330's. The request handler's addresses below are this
#: build's, so the class that reads them skips on any other program rather than decoding the wrong instructions.
HAL_SHA256 = '81c92aed6bc15a09c40a7d9f4fa40020ccf15f9cd673b49b63734459a39c1134'
#: Where the request handler of build 4.15.330 walks an open's mode letters, and where it loads each slot it calls.
MODE_WALK = 0x122F4
CALLS_OPEN, CALLS_OPEN_BY_GENERATE, CALLS_CLOSE, CALLS_READ_BY_SLOT_5, CALLS_LENGTH, CALLS_WRITE = (
    0x123E4, 0x1244C, 0x114D8, 0x119C4, 0x119E4, 0x11D90)
#: How many names share the plain file backed open, close and length functions.
PLAIN_FILE_NAMES = 19
#: The socket handler's call of its opener for command 1, that opener, and the radio handler with its own opener.
#: The radio's opener is written with a leading zero because its plain spelling opens with the digits of a flash
#: write address that `TheWriteReviewWithholdListIsComplete` sweeps for, which this file does not state.
SOCKET_CALLS_OPENER, SOCKET_OPENER, RADIO_HANDLER, RADIO_OPENER, RADIO_CALLS_OPENER = (
    0xD2F0, 0x12044, 0x1A7C8, 0x01A4C0, 0x1ADE8)
#: The program's code, from its first routine to its read only data, for a scan of every call.
CODE = (0xAC00, RODATA[0])


def ldr_str(word):
    """(cond, load, rd, rn, offset) of an ARM `ldr` or `str` of a word with an immediate offset and no write back,
    or None for any other instruction."""
    if (word & 0x0E400000) != 0x04000000 or not word & (1 << 24) or word & (1 << 21):
        return None
    offset = word & 0xFFF
    return (word >> 28, bool(word & (1 << 20)), (word >> 12) & 0xF, (word >> 16) & 0xF,
            offset if word & (1 << 23) else -offset)


def branch(word, va):
    """(cond, link, target) of an ARM `b` or `bl`, or None."""
    if (word & 0x0E000000) != 0x0A000000 or word >> 28 == 0xF:
        return None
    imm = word & 0xFFFFFF
    imm = imm - 0x1000000 if imm & 0x800000 else imm
    return word >> 28, bool(word & (1 << 24)), (va + 8 + 4 * imm) & 0xFFFFFFFF


def blx_register(word):
    """The register of an unconditional `blx rm`, or None."""
    return word & 0xF if (word & 0xFFFFFFF0) == 0xE12FFF30 else None


def rotated(word):
    rotate, imm = (word >> 8) & 0xF, word & 0xFF
    return ((imm >> (2 * rotate)) | (imm << (32 - 2 * rotate))) & 0xFFFFFFFF if rotate else imm


def cmp_immediate(word):
    """(rn, value) of an unconditional `cmp rn, #imm`, or None."""
    return ((word >> 16) & 0xF, rotated(word)) if (word & 0xFFF0F000) == 0xE3500000 else None


def orr_immediate(word):
    """(rd, rn, value) of an unconditional `orr rd, rn, #imm`, or None."""
    return ((word >> 12) & 0xF, (word >> 16) & 0xF, rotated(word)) if (word & 0xFFE00000) == 0xE3800000 else None


def add_register(word):
    """(rd, rn, rm) of an unconditional `add rd, rn, rm` with no shift, or None."""
    return ((word >> 12) & 0xF, (word >> 16) & 0xF, word & 0xF) if (word & 0xFFE00FF0) == 0xE0800000 else None


EQ, LT, AL = 0x0, 0xB, 0xE


class ThePowerSourceIsAPlainRead(TheNativeProgram):
    """**Opening `/tde/powerstate` for reading reads the power controller's file and writes nothing to it**, so the library
    may open it on a Harmony Touch, and the slot table of the names page had its read and close the wrong way round.

    **Why it was read.** A Touch's screens take part in a sync only on the power source its software calls `usb`,
    `TheScreensTakePartOnlyOnUSBPower` in `test_harmony_touch_host.py`, and nothing on the request channel names the
    source. The factory test name `/tde/powerstate` does, backed by the power controller's `powersource` file. Before
    a sync may read it, an open of it for reading had to be shown to be a plain read, since on this model some names
    act on an open, `TheActingNamesActOnAWriteOrAnOpen` above.

    **What was traced**, in the native program of build 4.15.330, by decoding its ARM instructions:

    1. **The entry.** `/tde/powerstate` fills slots 0, 1, 2, 3 and 8. Slots 0, 1 and 3 hold the same three functions
       as nineteen names, every plain file backed name among them, `/proc`, `/tde/vbat` and `/tde/vdc` included; slot 2
       is the write five other change names share (an `fwrite` into the file the open left open), and slot 8 its own
       answer to the engine's request by its engine name. An open over the cable reaches neither of those two.
    2. **The open routine** (slot 0) keeps the handle in `r4` and loads the handle's mode at handle + 4; `cmp` with 2
       and a `beq` lead to the one load of the mode string `w+`, which is passed with the backing file to `fopen` and
       the file kept open for the write slot. No other branch of the routine reaches that block. Every other mode
       stats the file and, for a regular file, passes `r` to the same `fopen`, reads the file whole into a buffer it
       keeps at handle + 12, keeping the length read at handle + 8, and closes the file; a directory is listed instead.
       The routine names exactly two mode strings, `r` and `w+`. So an open whose mode is not 2 writes nothing.
    3. **The mode** is built by the request handler from the open's mode letters into one field: `R` ORs 1, `W` ORs
       2, `C` ORs 4. An open with the mode `R` alone is mode 1, never 2; the library's read route sends `R` alone and
       its guard checks the mode off the bytes.
    4. **Which slot is which, by the request handler's own calls.** It loads slot 0 (entry + 12) and calls it with the
       handle and the path: the open; where slot 0 is empty it calls slot 4 instead, the generate family's open, and
       only when the mode has bit 1, `R`. It loads slot 1 (entry + 16), calls it with the handle and then clears the
       handle record's first word: the close. To answer a read it calls slot 5 (entry + 32) where one is filled, else
       slot 3 (entry + 24), and takes what slot 3 returns as a length, refusing a negative one; the data are the
       buffer the open filled. Slot 2 (entry + 20) is called for a write. The length function itself is two
       instructions, a load of handle + 8 and a return: **the length the open kept**, which closes the reading from
       the other end. The close function frees that buffer unless the mode is 2.
    5. **Two entry points over the same slots.** The letter walk of point 3 is in the opener the socket handler calls for command 1, the file
       protocol's open, and no other direct call in the program reaches that opener. It takes a request of two or three typed
       parameters, the first two of them strings, which is the shape of an open on the cable: a path, a mode and
       an optional size. The radio's handler, whose routines name `src/libhal/rf/libhal_hot_handler.c` and
       `libhal_hot_decode_open_handler`, reaches an opener of its own, which stores a word out of its request as the
       mode, compares no letter, and calls slot 0 itself. So the letters are the socket's route, and over the radio
       the mode is whatever number the request carries. **Not read**: which program hands the cable's requests to
       that socket, the tie being the request's shape; and what a hub sends as the mode over the radio.

    **The correction.** The names page and this file's header listed slot 1 as the read and slot 3 as the close.
    By the calls above slot 1 is the close and slot 3 the length of what a read returns; there is no read slot,
    the read being served from the open's buffer. The four had been listed in the usual order of file operations,
    and no test had read which slot the request handler calls for which access.

    **Negative results.** No branch but the one after `cmp` with 2 reaches the `w+` load; the close function's
    special case, a symbolic link made when the backing path equals one constant, is the secure shell name's and not
    this one's. **Not read**: the kernel driver's routine behind the `powersource` file, so whether a read does
    anything inside the driver is not known from the image; the remote's own screens watch the same file,
    `TheScreensTakePartOnlyOnUSBPower`. **What a unit answers is measured for `usb` alone**, that name and a line feed,
    `packages/usb/test/touch/touch-power-read.test.ts`.

    **Scope.** One build, production 4.15.330, of the Harmony Touch, host name `juniper`; the instruction addresses
    are that build's, held by the program's SHA-256, and the class skips on another. Whether a Harmony 300 or 350 has
    the name is not read, which is why the library's allowance is keyed on the Touch's product id.

    **Sources checked first.** `reference/architectures/harmony-touch/api/names.md`, `answering-a-sync.md`,
    `test_harmony_touch_host.py`, `test_harmony_touch_keys.py` for the five source names the driver knows, and this
    project's own brief of the reading in the lab, whose addresses were each decoded again here. Logitech's clients
    were not consulted: what the remote does with an open is its firmware's alone.

    **Controls**, each a string replacement reversed with a hash check: the expected count of sharing names as 18,
    the mode compared as 1 instead of 2, the letter `W`'s bit as 4, and slot 1's offset as slot 3's, each failed the
    test it aimed at."""

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        if hashlib.sha256(cls.elf.data).hexdigest() != HAL_SHA256:
            raise unittest.SkipTest('the native program is not build 4.15.330\'s, whose addresses this class reads')

    def instructions(self, start, count):
        return [(va, self.elf.word(va)) for va in range(start, start + 4 * count, 4)]

    def routine(self, start, limit=600):
        """The routine's instructions from `start` to its literal pool, found as `gotoff_strings` finds it."""
        out, va, pool = [], start, start + 4 * limit
        while va < pool:
            word = self.elf.word(va)
            if (word & 0xFF7F0000) == 0xE51F0000:
                imm = word & 0xFFF
                pool = min(pool, va + 8 + (imm if word & 0x00800000 else -imm))
            out.append((va, word))
            va += 4
        return out

    def literal_strings(self, start):
        """Each `ldr rd, [pc, #imm]` of the routine whose literal resolves to a read only string, as (va, rd, text)."""
        found = []
        for va, word in self.routine(start):
            if (word & 0xFF7F0000) == 0xE51F0000:
                imm = word & 0xFFF
                literal = va + 8 + (imm if word & 0x00800000 else -imm)
                target = (GOT + signed(self.elf.word(literal))) & 0xFFFFFFFF
                if RODATA[0] <= target < RODATA[1]:
                    text = c_string(self.elf, target)
                    if text is not None:
                        found.append((va, (word >> 12) & 0xF, text))
        return found

    def handlers(self):
        entry = self.entry('/tde/powerstate')
        return entry['handlers']

    def test_it_shares_the_plain_file_names_open_close_and_length(self):
        entry = self.entry('/tde/powerstate')
        self.assertEqual(entry['slots'], (0, 1, 2, 3, 8))
        self.assertEqual(entry['backing'], '/sys/bus/i2c/devices/1-0048/tps6507x-juniper/powersource')
        trio = tuple(entry['handlers'][s] for s in (0, 1, 3))
        sharing = {key(e) for e in self.entries
                   if all(s in e['handlers'] for s in (0, 1, 3)) and tuple(e['handlers'][s] for s in (0, 1, 3)) == trio}
        self.assertEqual(len(sharing), PLAIN_FILE_NAMES)
        self.assertTrue({'/proc', '/tde/vbat', '/tde/vdc', '/tde/powerstate'} <= sharing)
        # Each of them a read or a change by the handler reading, never an action.
        self.assertEqual({KIND[n] for n in sharing}, {'read', 'change'})
        # The control: a generate name's open is another function, so sharing the trio means something.
        self.assertNotEqual(self.entry('/sys/sysinfo')['handlers'][4], trio[0])

    def test_the_open_names_r_and_w_plus_and_takes_w_plus_only_on_mode_two(self):
        start = self.handlers()[0]
        code = self.routine(start)
        loads = self.literal_strings(start)
        modes = {text for _, _, text in loads if text and set(text) <= set('rwab+')}
        self.assertEqual(modes, {'r', 'w+'})
        # Each mode string goes in r1 to the first call after its load, and both calls are to one function.
        targets = []
        for va, rd, text in loads:
            if text not in modes:
                continue
            after = [(v, w) for v, w in code if v > va][:6]
            self.assertTrue(any(add_register(w) and add_register(w)[0] == 1 and add_register(w)[2] == rd for _, w in after),
                            text + ' is placed in r1')
            call = next(branch(w, v) for v, w in after if branch(w, v) and branch(w, v)[1])
            targets.append(call[2])
        self.assertEqual(len(targets), 2)
        self.assertEqual(len(set(targets)), 1, 'one function, fopen, takes both')
        # The handle is r4, and its mode at handle + 4 is compared with 2 before anything else is decided.
        head = code[:12]
        self.assertIn(0xE1A04000, [w for _, w in head], 'mov r4, r0: the handle kept in r4')
        mode_load = next(i for i, (_, w) in enumerate(head) if ldr_str(w) and ldr_str(w)[1] and ldr_str(w)[3] == 4
                         and ldr_str(w)[4] == 4)
        mode_reg = ldr_str(head[mode_load][1])[2]
        compare = next(i for i, (_, w) in enumerate(head) if cmp_immediate(w) == (mode_reg, 2))
        jump = next(branch(w, v) for v, w in head[compare + 1:] if branch(w, v))
        self.assertEqual(jump[0], EQ)
        # The w+ load is the block that beq reaches, and nothing else in the routine branches into it.
        w_plus = next(va for va, _, text in loads if text == 'w+')
        self.assertTrue(jump[2] <= w_plus <= jump[2] + 8)
        into = [(v, branch(w, v)) for v, w in code if branch(w, v) and jump[2] <= branch(w, v)[2] <= w_plus]
        self.assertEqual(len(into), 1, 'one branch reaches the w+ block')
        # The r path keeps the length read at handle + 8 and the buffer at handle + 12, which the close and the
        # length read back.
        stores = {ldr_str(w)[4] for _, w in code if ldr_str(w) and not ldr_str(w)[1] and ldr_str(w)[3] == 4}
        self.assertTrue({8, 12} <= stores)

    def test_the_length_is_what_the_open_read_and_the_close_loads_the_buffer_and_tests_for_mode_two(self):
        handlers = self.handlers()
        self.assertEqual([w for _, w in self.instructions(handlers[3], 2)], [0xE5900008, 0xE12FFF1E],
                         'ldr r0, [r0, #8]; bx lr')
        close = self.routine(handlers[1])
        loads = [ldr_str(w) for _, w in close if ldr_str(w) and ldr_str(w)[1] and ldr_str(w)[3] == 4]
        self.assertIn(12, [l[4] for l in loads], 'the close loads the buffer the open kept')
        mode = next(i for i, (_, w) in enumerate(close) if ldr_str(w) and ldr_str(w)[1] and ldr_str(w)[3] == 4
                    and ldr_str(w)[4] == 4)
        self.assertEqual(cmp_immediate(close[mode + 1][1]), (ldr_str(close[mode][1])[2], 2))
        self.assertEqual(branch(close[mode + 2][1], close[mode + 2][0])[0], EQ)

    def test_the_request_handler_ors_one_bit_per_mode_letter(self):
        code = self.instructions(MODE_WALK, 30)
        bits, fields = {}, set()
        for letter in 'RWC':
            at = next(i for i, (_, w) in enumerate(code) if cmp_immediate(w) and cmp_immediate(w)[1] == ord(letter))
            va, word = code[at + 1]
            cond, _, target = branch(word, va)
            # R and W branch to their block on a match; C falls through to its own when it matches.
            start = target if cond == EQ else code[at + 2][0]
            block = self.instructions(start, 4)
            orr = next(orr_immediate(w) for _, w in block if orr_immediate(w))
            bits[letter] = orr[2]
            loaded = next(ldr_str(w) for _, w in block if ldr_str(w) and ldr_str(w)[1])
            stored = next(ldr_str(w) for _, w in block if ldr_str(w) and not ldr_str(w)[1])
            fields.add((loaded[3], loaded[4]))
            fields.add((stored[3], stored[4]))
        self.assertEqual(bits, {'R': 1, 'W': 2, 'C': 4})
        self.assertEqual(len(fields), 1, 'all three letters build one field')

    def test_the_request_handler_calls_slot_zero_to_open_one_to_close_three_for_the_length_and_two_to_write(self):
        def loads_slot_and_calls(va, slot):
            load = ldr_str(self.elf.word(va))
            self.assertIsNotNone(load, hex(va))
            self.assertTrue(load[1], 'a load')
            self.assertEqual(load[4], SLOTS_AT + 4 * slot, 'slot %d' % slot)
            following = self.instructions(va + 4, 8)
            self.assertIn(load[2], [blx_register(w) for _, w in following], 'and calls it')
            return following
        loads_slot_and_calls(CALLS_OPEN, 0)
        # Where slot 0 is empty, slot 4, the generate open, and only when the mode has bit 1, R.
        generate = loads_slot_and_calls(CALLS_OPEN_BY_GENERATE, 4)
        self.assertIn(0xE3100001, [w for _, w in generate], 'tst r0, #1')
        # The close: slot 1 called, and the handle record's first word cleared after it.
        after_close = loads_slot_and_calls(CALLS_CLOSE, 1)
        called = next(i for i, (_, w) in enumerate(after_close) if blx_register(w) is not None)
        clear = next(branch(w, v)[2] for v, w in after_close[called:] if branch(w, v) and branch(w, v)[0] == EQ)
        self.assertEqual([w for _, w in self.instructions(clear, 2)], [0xE3A0C000, 0xE585C000],
                         'mov r12, #0; str r12, [r5]')
        # A read: slot 5 if filled, else slot 3, whose return is a length refused when negative.
        loads_slot_and_calls(CALLS_READ_BY_SLOT_5, 5)
        after_length = loads_slot_and_calls(CALLS_LENGTH, 3)
        call = next(i for i, (_, w) in enumerate(after_length) if blx_register(w) is not None)
        self.assertEqual(after_length[call + 1][1] & 0xFFFF0FFF, 0xE2500000, 'subs rX, r0, #0')
        self.assertEqual(branch(after_length[call + 2][1], after_length[call + 2][0])[0], LT)
        loads_slot_and_calls(CALLS_WRITE, 2)
        # The control: the slots are distinct offsets, so a load of one is not a load of another.
        self.assertEqual(len({SLOTS_AT + 4 * s for s in (0, 1, 2, 3, 4, 5)}), 6)

    def test_the_letter_walk_is_the_socket_handlers_opener_and_the_radio_has_an_opener_of_its_own(self):
        word = self.elf.word
        # The socket handler compares the command with 1, the file protocol's open, and calls the opener; no other
        # call in the program reaches it.
        self.assertEqual(cmp_immediate(word(SOCKET_CALLS_OPENER - 0x10)), (3, 1))
        self.assertEqual(branch(word(SOCKET_CALLS_OPENER), SOCKET_CALLS_OPENER), (AL, True, SOCKET_OPENER))
        callers = [va for va in range(CODE[0], CODE[1], 4)
                   if branch(word(va), va) == (AL, True, SOCKET_OPENER)]
        self.assertEqual(callers, [SOCKET_CALLS_OPENER])
        # It takes two or three parameters, `sub r2, r3, #2; cmp r2, #1; bhi`, and tests the first two for type 4.
        self.assertEqual([word(SOCKET_OPENER + at) for at in (0x2C, 0x30)], [0xE2432002, 0xE3520001])
        self.assertEqual(branch(word(SOCKET_OPENER + 0x34), SOCKET_OPENER + 0x34)[0], 0x8, 'bhi')
        self.assertEqual([cmp_immediate(word(SOCKET_OPENER + at)) for at in (0x40, 0x54)], [(7, 4), (6, 4)])
        # The mode letter walk is inside that opener, and its three letters are compared nowhere in the radio's.
        letters = {ord('R'), ord('W'), ord('C')}
        socket = self.routine(SOCKET_OPENER, limit=1500)
        radio = self.routine(RADIO_OPENER, limit=1500)
        self.assertIn(MODE_WALK, [va for va, _ in socket])
        compared = lambda routine: {c[1] for c in (cmp_immediate(w) for _, w in routine) if c} & letters
        self.assertEqual(compared(socket), letters)
        self.assertEqual(compared(radio), set())
        # The radio's handler and opener name their source, and the socket's opener does not.
        self.assertIn('src/libhal/rf/libhal_hot_handler.c', gotoff_strings(self.elf, RADIO_HANDLER, limit=1500))
        self.assertIn('libhal_hot_decode_open_handler', gotoff_strings(self.elf, RADIO_OPENER, limit=1500))
        self.assertNotIn('libhal_hot_decode_open_handler', gotoff_strings(self.elf, SOCKET_OPENER, limit=1500))
        self.assertEqual(branch(word(RADIO_CALLS_OPENER), RADIO_CALLS_OPENER), (AL, True, RADIO_OPENER))
        # The radio's opener stores a word loaded out of its request as the mode, at the record offset the letter walk
        # ORs into, and loads slot 0 and calls it.
        self.assertEqual(ldr_str(word(0x1A6D4)), (AL, True, 2, 2, 0))
        self.assertEqual(ldr_str(word(0x1A6EC)), (AL, False, 2, 5, 0x24))
        self.assertEqual(ldr_str(word(MODE_WALK + 0x70)), (AL, False, 12, 7, 0x24), 'the walk stores R at the same offset')
        self.assertEqual(ldr_str(word(0x1A6C4)), (AL, True, 6, 1, SLOTS_AT))
        self.assertEqual(blx_register(word(0x1A6FC)), 6)


if __name__ == '__main__':
    unittest.main()
