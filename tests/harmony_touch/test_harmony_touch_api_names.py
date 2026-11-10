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
one kind of access: 0 open, 1 read, 2 write, 3 close, and 4, 8 and 9 the open, generate and close of the
names that build their answer. The table is parsed here and set against the page:

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


if __name__ == '__main__':
    unittest.main()
