#!/usr/bin/env python3
"""Which architecture number the Harmony Touch uses for itself: 17, in the firmware, as the number its
software shares with Logitech's hubs, and never names 18 under `arch`; 18 is the family Logitech's clients file this
generation's remotes under. Nothing on the remote or in either client compares the two.

**The question.** `reference/architectures/harmony-touch/README.md` held two numbers and settled neither:
the remote's `/sys/sysinfo` reports `arch 0x11`, 17 (section 200), and all 22 of Logitech's protocol
templates for skin 99 declare `architectureid` 18 (section 197). The question was which one the
firmware uses for itself. The answer is that the two numbers name different things, and this file holds
what shows it.

**Sources checked first.** `reference/architectures/harmony-touch/` (all three pages),
`reference/remotes/harmony-touch/` (`README.md`, `usb.md`, `memory.md`, `firmware.md`),
`reference/usb-protocol/file-protocol.md`, `docs/findings.md` sections 196 to 200, `tests/logitech/test_client_templates.py`
and `tests/harmony_touch/test_harmony_touch_image.py`, and the lab's note for this step, which this file re-measures
rather than trusts. **Both of Logitech's clients were read before anything was derived**, decision 2:
Harmony Desktop's main script and templates, asserted below, and MyHarmony's decompiled C#, read and
stated here because no fixture names those files. libconcord's source was read for the third row of the
reference's table.

## What was measured, in the firmware

**1. Where the identity file's `arch` comes from.** `/sys/sysinfo` is answered by the remote's native USB
program, `usr/bin/hal`, a 32 bit little endian ARM executable whose two load segments map virtual
`0x8000` to file offset 0 and `0x37100` to `0x27100`. The function that builds the answer, at `0xbbb8`,
first fills a record on its stack with defaults: `mov r9, #97` at `0xbc08`, stored at `sp + 0x68`, the
skin; `mov r12, #17` at `0xbc14`, stored at `sp + 0x6c`, the architecture; and from its literal pool the
vendor `0x046D`, the product `0xC12B` and the hardware version string `99.00`. **Then it calls the reader
at `0x131d0` with that record**, from `0xbc9c`. The reader finds the flash partition named `mfg`, seeks to
36864, reads up to 4000 bytes, compares the first eight with `harmony!`, and walks big endian length
prefixed strings in key and value pairs; for the key `arch` it calls `strtol` with base 16 and stores the
result at the record's second word, `[r11, #4]`, the architecture's slot. A negative return from the
reader branches to a log call and back into the same path, so the defaults stand. **Then it formats and
publishes**: `ldr r1, [sp, #0x6c]` at `0xbcd0`, the slot the 17 was stored into, goes through `0x%02x`,
`json_pack` takes the key `arch` as its first, and the object lands in the first entry of the name table
at `0x37940`, whose path is `/sys/sysinfo`. Every word and string named here is asserted, on both builds.

So **17 is the fallback, and the value reported is the unit's own manufacturing record's `arch` when the
record has one.** An earlier, unreviewed reading in the lab had called it a constant; it never reached the
reference, so there is no dead wording to mark. The unit agrees with the record path: it reports skin
`0x63`, 99, where the fallback is 97, so its record was found and read, and its `arch` key is therefore
either `0x11` or absent. Which of the two is not known; only `/sys/mfg` would show it, and that path is
behind the named door and carries the unit's private key and certificate. It does not change the value.

**2. The engine states 17 as a literal.** The compiled Lua engine's system info handler,
`opt/luaworks/tasks/connectserver/apihandler/system.lua`, holds the string constant `arch=0x11`, and over
every regular file of the root filesystem it is the only file holding `arch=0x` at all, on both builds.
The engine's manufacturing record module, `tasks/mfg/core/mfgdata.lua`, takes the skin, the vendor, the
product and the unit id from the record and holds no string constant `arch`, so the engine's answer is 17
whatever the record says. Whether anything can ask the engine on a Touch is not checked: in the production
build the same module marks the unit as having no network when the host name is `juniper`, a test the
preview build's module does not hold.

**3. No file names 18 under `arch`, in hexadecimal.** The search is for that form and no other: over every regular file of the 4.15.330 and 4.15.250 root
filesystems: `arch=0x12` occurs in none; `arch` as a NUL terminated string of its own, with no letter,
digit or underscore before it, occurs in exactly two files, `usr/bin/hal` and the default record of 4. The
word also occurs as LuaJIT's own `jit.arch`, the processor name, in prose in two JSON content files and in
a shell script about kernel modules, none of them Logitech's number. No file holds the word
`architecture` but the boot loader, that script and two licence texts.

**4. The image carries a hub's default record.** `opt/luaworks/tasks/mfg/data/pimento-20111201145455-000000.mfg`,
the engine's fallback when the partition has no valid record, opens with `harmony!` and walks as eight
key and value pairs closed by a zero length: `unitid`, `arch`, `skin`, `usb_vendor_id`, `usb_product_id`,
`hw_ver`, `key` and `cert`, then four zero bytes to the end of the file. **Four values are read and no
other**: `arch 0x11`, `skin 0x61` (97, Pimento in Logitech's templates), vendor `0x046D` and product `0xC129`, where the Touch is `0xC12B`. The file also
holds a private key and a certificate, which is why this test reads named fields only, prints none of the
rest, and asserts the file's identity between images by comparing bytes, never by stating them.

**5. The hubs' image says the same.** The hubs' production package 4.15.600, whose descriptor names skins
97, 106 and 109, holds a squashfs root filesystem with LZMA blocks whose five byte header lacks the size
field, so `unsquashfs` refuses it and a block decoded as it stands is corrupt input. With an unknown size
spliced in after the header, the data blocks decode one after another from offset 96 and **the chain of
117 lands exactly on the inode table's start**, which is the closure that the blocks were cut right. In
them: exactly one block holds both `processCmdSystemInfo` and `arch=0x11`, and its build path names
`poky_4-15-pimento` and `mips-poky-linux-uclibc` where the Touch's names `poky_4-15-juniper` and
`armv5te-poky-linux-uclibcgnueabi`; `arch=0x` occurs once and `arch=0x12` never; and the Touch's default
record occurs byte for byte in exactly one block. **So one engine, built for a MIPS hub and an ARM remote,
reports the same 17**, and 17 does not tell the two apart. That the hub had it first is an inference from
the default record and the fallback skin, and no file states it. The hub's own native program carries the
same identity strings; its fallback architecture was not read, since it is MIPS and was not disassembled.

## What was read, in Logitech's clients

**6. Neither client compares the remote's number with anything.** In Harmony Desktop's main script the
unit's attribute constant for `arch` is copied into the unit model and from there into the unit's
`architecture`; of the seven property accesses named `architectureId` in the script, exactly two are
reads, one the template's in the protocol choice and one the unit model's copy into `architecture`, and
`architecture` itself is only ever written. The template validator compares the model id, the flash id
and the flash manufacturer id, each skipped when the template does not state it, and parses the
architecture without comparing it. The protocol choice takes the command protocol for 9, 12 and 14 and the
file protocol for everything else, so **17 and 18 choose the same protocol**. MyHarmony does the same,
read and not asserted here: `UnitImplementation.cs` copies the identity file's `arch` into its unit model,
exposed as `Architecture`, and nothing in the decompiled sources reads that property; `RemoteDescription.cs`
parses `architectureid` and its fit test compares the same three ids; `OperationContext.cs` makes the same
protocol choice. Whether either client serialises the unit object somewhere a property is read without its
name was not checked.

**7. What 18 is in the templates.** Over every Harmony Desktop template, the architecture each file
declares, per skin: 99, 102 at 18 in every file; 100, 105 and 108 at 18 in 19 files and at 17 in four,
the same four names each time, the three Wi-Fi files and `getdeviceinfo.xml`; 86, 111, 112 and 116 at 18
throughout; 82, 97, 106, 113, 115 and 400 at 17 throughout. **So three skins sit at both numbers, not
two**, which corrects the reference's map. The `getdeviceinfo.xml` of 105 and 108 is one file, naming
skin 82 under `skinid` and the codename Olive; 100's names skin 100 under `skinid`, also as Olive. Since the
validator reads `modelid`, a file naming its skin under `skinid` does not enforce a model. MyHarmony's own
copy, counted the same way, agrees per skin except that it has 19 files for skins 97 and 106 where Harmony
Desktop has 20. Skin 96 declares 14 in four files and 16 in one, `identifyremote.xml`.

**8. The remotes' image is built for skins the templates put at 18, the hubs' for skins at 17.** Every
skin the remotes' package descriptor names, 99, 100, 102, 105, 108, 111 and 112, has templates, and its
`identifyremote.xml` declares 18. Of the hubs' descriptor's skins, 97 and 106 have templates and declare
17 in every file, and 109 has none.

## What it settles and what it does not

**Settled**: the firmware's number for itself is 17, from a literal in the engine and from a fallback the
unit's record can replace in the USB program; no file of two builds of the remotes' image names 18 under
`arch` in hexadecimal; the
hubs' image states the same 17 from the same engine source; and neither client compares the remote's
number with the template's, whose one use is a protocol choice where 17 and 18 agree. **Not settled**:
which number Logitech's service files the Touch under, which its product capabilities for skin 99 would
say; whether other remotes of the generation report 17, which through the engine they do and through the
USB program depends on each unit's record; whether the bench unit's record holds an `arch` key; and which
number a writer would need, where on present evidence nothing reads the value back.

**libconcord is not a second witness.** It reads the same `arch` field of the same identity file, in base
16, and keys its own behaviour on 17; its source is public and GPLv3, read and not copied.

**Width.** The firmware facts hold for the one image the remotes' package is, so for every skin its
descriptor names, and were checked on two builds of it; the hub fact on one build of the hubs' image. What
a given unit reports through the USB program is its record's business and was measured on one Touch.

**Standing.** "Read in the firmware" for 1 to 5; the unit's field is "Measured on a unit"; 6 to 8 are
"Stated by Logitech, in their client", and the test asserts the client says it, not that a remote does.
Names, counts, words at offsets and structure only: no Logitech code is quoted, the default record's key
and certificate are never read out, and the unit's serial is never touched.
"""
import hashlib
import lzma
import os
import re
import struct
import tempfile
import unittest
import zipfile
import io
import xml.etree.ElementTree as ET
from collections import Counter

import lab
from . import test_harmony_touch_image as image

BUILDS = list(image.BUILDS)
HUB = image.HUB

HAL = 'usr/bin/hal'
SYSTEM_LUA = 'opt/luaworks/tasks/connectserver/apihandler/system.lua'
MFGDATA_LUA = 'opt/luaworks/tasks/mfg/core/mfgdata.lua'
DEFAULT_RECORD = 'opt/luaworks/tasks/mfg/data/pimento-20111201145455-000000.mfg'

#: The record's keys in their order. Values are read for the first four of `READ_VALUES` only.
RECORD_KEYS = ['unitid', 'arch', 'skin', 'usb_vendor_id', 'usb_product_id', 'hw_ver', 'key', 'cert']
READ_VALUES = {'arch': '0x11', 'skin': '0x61', 'usb_vendor_id': '0x046D', 'usb_product_id': '0xC129'}

#: A Lua 5.1 string constant as compiled: tag 4, a four byte length counting the NUL, the bytes, the NUL.
def lua_string(text):
    raw = text.encode('ascii')
    return b'\x04' + struct.pack('<I', len(raw) + 1) + raw + b'\x00'


class Elf:
    """Words and strings of a 32 bit little endian ELF by virtual address, through its load segments."""

    def __init__(self, data):
        self.data = data
        assert data[:4] == b'\x7fELF' and data[4] == 1 and data[5] == 1, 'not a 32 bit little endian ELF'
        phoff = struct.unpack_from('<I', data, 28)[0]
        entsize, count = struct.unpack_from('<HH', data, 42)
        self.segments = []
        for i in range(count):
            kind, offset, vaddr, _, filesz = struct.unpack_from('<5I', data, phoff + i * entsize)
            if kind == 1:
                self.segments.append((vaddr, offset, filesz))

    def offset(self, va):
        for vaddr, offset, size in self.segments:
            if vaddr <= va < vaddr + size:
                return va - vaddr + offset
        raise AssertionError('0x%x is in no load segment' % va)

    def word(self, va):
        return struct.unpack_from('<I', self.data, self.offset(va))[0]

    def string(self, va):
        at = self.offset(va)
        return self.data[at:self.data.index(b'\0', at)]


def arm_mov_immediate(word):
    """`(rd, value)` of an ARM `mov rd, #imm` with no condition, or None for any other word."""
    if word & 0xFFF00000 != 0xE3A00000:
        return None
    rotate, imm = (word >> 8) & 0xF, word & 0xFF
    value = ((imm >> (2 * rotate)) | (imm << (32 - 2 * rotate))) & 0xFFFFFFFF if rotate else imm
    return (word >> 12) & 0xF, value


def arm_bl_target(word, va):
    """The target of an unconditional `bl` at `va`."""
    assert word >> 24 == 0xEB, 'not a bl: %08x' % word
    offset = word & 0xFFFFFF
    if offset & 0x800000:
        offset -= 0x1000000
    return va + 8 + (offset << 2)


def record_walk(data, at):
    """The length prefixed strings of a manufacturing record from `at`, and where the zero length ends.

    Returns the strings as bytes; the caller reads names out of it and never prints a value.
    """
    strings = []
    while True:
        size = struct.unpack_from('>I', data, at)[0]
        at += 4
        if size == 0:
            return strings, at
        if at + size > len(data):
            raise AssertionError('a record string runs past the end')
        strings.append(data[at:at + size])
        at += size


def read_record(data, at=0):
    """The record's key names and the values of `READ_VALUES`' keys only, and where its walk closed."""
    if data[at:at + 8] != b'harmony!':
        raise AssertionError('no record magic')
    strings, end = record_walk(data, at + 8)
    if len(strings) % 2:
        raise AssertionError('a key without a value')
    keys = [k.decode('ascii') for k in strings[0::2]]
    values = {k.decode('ascii'): v.decode('ascii') for k, v in zip(strings[0::2], strings[1::2])
              if k.decode('ascii') in READ_VALUES}
    return keys, values, end


#: An `arch` that is a word of its own and a C string: no word character before it, a NUL after.
ARCH_C_STRING = re.compile(rb'(?<![A-Za-z0-9_])arch\x00')


@unittest.skipUnless(image.UNSQUASHFS, 'unsquashfs is not installed')
class TheRemotesFirmwareStatesSeventeen(unittest.TestCase):
    """Facts 1 to 4, on both builds of the remotes' image."""

    @classmethod
    def setUpClass(cls):
        lab.require(*BUILDS)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.rootfs, cls.files = {}, {}
        for name in BUILDS:
            directory = os.path.join(cls.tmp.name, name)
            os.mkdir(directory)
            reader = image.SquashfsReader(image.members(name)['harmony-image.squashfs'], directory)
            cls.rootfs[name] = reader
            cls.files[name] = reader.each(reader.names())

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_the_identity_files_arch_is_the_records_arch_with_17_as_the_fallback(self):
        for name in BUILDS:
            with self.subTest(build=name):
                hal = Elf(self.files[name][HAL])
                self.assertEqual(struct.unpack_from('<HH', hal.data, 16), (2, 40))  # executable, ARM
                # The defaults: skin 97 into r9 and architecture 17 into r12, stored at sp+0x68 and sp+0x6c.
                self.assertEqual(arm_mov_immediate(hal.word(0xbc08)), (9, 97))
                self.assertEqual(arm_mov_immediate(hal.word(0xbc14)), (12, 17))
                self.assertEqual(hal.word(0xbc18), 0xE58D9068)  # str r9, [sp, #0x68]
                self.assertEqual(hal.word(0xbc1c), 0xE58DC06C)  # str r12, [sp, #0x6c]
                self.assertEqual((hal.word(0xbf84), hal.word(0xbf88)), (0x046D, 0xC12B))
                self.assertEqual(hal.string(hal.word(0xbf80)), b'99.00')
                # The reader is called with the record, sp+0x68 in r4 then r0.
                self.assertEqual(hal.word(0xbbe0), 0xE28D4068)  # add r4, sp, #104
                self.assertEqual(hal.word(0xbc98), 0xE1A00004)  # mov r0, r4
                self.assertEqual(arm_bl_target(hal.word(0xbc9c), 0xbc9c), 0x131d0)
                # Inside the reader: seek 36864, the magic, and `arch` parsed base 16 into the second word.
                self.assertEqual(arm_mov_immediate(hal.word(0x13200)), (1, 36864))
                base = (0x131f4 + 8 + hal.word(0x134cc)) & 0xFFFFFFFF  # the reader's position independent base
                self.assertEqual(hal.string((base + hal.word(0x134dc)) & 0xFFFFFFFF), b'harmony!')
                self.assertEqual(hal.string((base + hal.word(0x134e4)) & 0xFFFFFFFF), b'arch')
                self.assertEqual(arm_mov_immediate(hal.word(0x13404)), (2, 16))
                self.assertEqual(hal.word(0x1340c), 0xE58B0004)  # str r0, [r11, #4]
                # Published: the slot the 17 went into, formatted as two hex digits, under the key `arch`.
                self.assertEqual(hal.word(0xbcd0), 0xE59D106C)  # ldr r1, [sp, #0x6c]
                self.assertEqual(hal.string(hal.word(0xbf94)), b'0x%02x')
                self.assertEqual(hal.string(hal.word(0xbfe0)), b'arch')
                table = hal.word(0xbfe8)
                self.assertEqual(table, 0x37940)
                self.assertEqual(hal.string(hal.word(table)), b'/sys/sysinfo')
                self.assertEqual(hal.string(0x27cb8), b'%s: *** mfgdata is missing ***\n')

    def test_the_engine_states_arch_0x11_as_a_literal_and_reads_no_arch_from_the_record(self):
        for name in BUILDS:
            with self.subTest(build=name):
                files = self.files[name]
                with_prefix = {p: d.count(b'arch=0x') for p, d in files.items() if b'arch=0x' in d}
                self.assertEqual(with_prefix, {SYSTEM_LUA: 1})
                self.assertEqual(files[SYSTEM_LUA].count(lua_string('arch=0x11')), 1)
                mfgdata = files[MFGDATA_LUA]
                # assertTrue rather than assertIn, so a failure names the field and does not print the module.
                self.assertFalse(lua_string('arch') in mfgdata, 'the engine reads an arch out of the record')
                for field in ('skin', 'usb_vendor_id', 'usb_product_id', 'unitid', 'harmony!',
                              DEFAULT_RECORD.split('mfg/', 1)[1]):
                    self.assertTrue(lua_string(field) in mfgdata, field)
                # The host name test that marks a `juniper` as having no network is in the production
                # build's module and not in the preview's.
                for field in ('juniper', 'hasNetwork'):
                    self.assertEqual(lua_string(field) in mfgdata, name == 'touch_package_production', field)

    def test_no_file_names_an_architecture_of_18_under_arch_in_hexadecimal(self):
        for name in BUILDS:
            with self.subTest(build=name):
                files = self.files[name]
                self.assertEqual([p for p, d in files.items() if b'arch=0x12' in d], [])
                self.assertEqual(sorted(p for p, d in files.items() if ARCH_C_STRING.search(d)),
                                 sorted([DEFAULT_RECORD, HAL]))
                self.assertEqual(sorted(p for p, d in files.items() if b'architecture' in d.lower()),
                                 ['lib/firmware/u-boot.bin',
                                  'usr/sbin/update-modules',
                                  'usr/share/common-licenses/gcc-runtime/COPYING.RUNTIME',
                                  'usr/share/common-licenses/generic_GPL-3.0-with-GCC-exception'])

    def test_the_scan_finds_the_one_file_holding_arch_0x11(self):
        """The control on the scan: the same walk does find the literal it says is alone."""
        for name in BUILDS:
            with self.subTest(build=name):
                self.assertEqual([p for p, d in self.files[name].items() if b'arch=0x11' in d], [SYSTEM_LUA])

    def test_the_default_record_is_a_hubs_with_architecture_17(self):
        digests = set()
        for name in BUILDS:
            with self.subTest(build=name):
                record = self.files[name][DEFAULT_RECORD]
                keys, values, end = read_record(record)
                self.assertEqual(keys, RECORD_KEYS)
                self.assertEqual(values, READ_VALUES)
                # The walk closes on a zero length, and four more zero bytes end the file.
                self.assertEqual(len(record) - end, 4)
                self.assertTrue(record[end:] == bytes(4), 'the record does not end in zeroes')
                digests.add(hashlib.sha256(record).digest())
        self.assertEqual(len(digests), 1, 'the two builds carry the same record')

    def test_a_record_without_its_magic_is_refused(self):
        record = bytearray(self.files[BUILDS[0]][DEFAULT_RECORD])
        record[0] ^= 0x01
        with self.assertRaises(AssertionError):
            read_record(bytes(record))


class TheUnitTookTheRecordPath(unittest.TestCase):
    """Fact 1's consequence on one Touch: its skin is not the fallback, so its record was read."""

    def test_the_touch_reports_17_and_a_skin_that_is_not_the_fallback(self):
        lab.require('touch_sysinfo')
        text = lab.load('touch_sysinfo').decode('ascii', 'replace')
        fields = dict(line.split(' ', 1) for line in text.split('as text:', 1)[1].splitlines() if ' ' in line)
        self.assertEqual(fields['arch'].strip(), '0x11')
        self.assertEqual(fields['skin'].strip(), '0x63')
        self.assertNotEqual(int(fields['skin'].strip(), 16), 97)


def lzma_blocks(img, start, end):
    """Decode the LZMA blocks of a squashfs image from `start`, one after another, until `end`.

    Each block's header is the five byte properties and dictionary size with no size field, so an
    unknown size is spliced in for Python's decoder. Returns `[(offset, decoded)]` and where the chain
    stopped, which is the closure: blocks cut wrongly do not land on `end`.
    """
    blocks, at = [], start
    while at < end:
        decoder = lzma.LZMADecompressor(lzma.FORMAT_ALONE)
        source = img[at:at + 5] + b'\xff' * 8 + img[at + 5:at + 5 + 262144]
        decoded = decoder.decompress(source)
        used = len(source) - len(decoder.unused_data) - 8
        blocks.append((at, decoded))
        at += used
    return blocks, at


class TheHubsImageStatesTheSameSeventeen(unittest.TestCase):
    """Fact 5: the hubs' 4.15.600 root filesystem, decoded block by block."""

    @classmethod
    def setUpClass(cls):
        lab.require(HUB)
        cls.img = image.members(HUB)['harmony-image.squashfs']
        magic, _, _, _, _, compression = struct.unpack_from('<4sIIIIH', cls.img, 0)
        assert magic == b'hsqs', 'not a squashfs 4 image'
        cls.compression = compression
        cls.inode_table = struct.unpack_from('<Q', cls.img, 64)[0]
        cls.blocks, cls.stopped = lzma_blocks(cls.img, 96, cls.inode_table)

    def test_the_descriptor_names_skins_97_106_and_109(self):
        with zipfile.ZipFile(io.BytesIO(lab.load(HUB))) as package:
            root = ET.fromstring(package.read('Description.xml'))
        self.assertEqual([int(s.text) for s in root.findall('INTENDED/SKIN')], [97, 106, 109])

    def test_the_blocks_are_lzma_without_a_size_and_tile_up_to_the_inode_table(self):
        self.assertEqual(self.compression, 2)  # LZMA
        with self.assertRaises(lzma.LZMAError):
            lzma.LZMADecompressor(lzma.FORMAT_ALONE).decompress(self.img[96:96 + 262144])
        self.assertEqual(len(self.blocks), 117)
        self.assertEqual(self.stopped, self.inode_table)

    def test_one_block_holds_the_system_info_handler_with_arch_0x11_built_for_mips(self):
        both = [i for i, (_, d) in enumerate(self.blocks) if b'processCmdSystemInfo' in d and b'arch=0x11' in d]
        self.assertEqual(len(both), 1)
        decoded = self.blocks[both[0]][1]
        self.assertEqual(set(re.findall(rb'jobs/([\w-]+)/([\w-]+)/tmp/work/([a-z0-9]+-poky-linux-[a-z]+)/', decoded)),
                         {(b'poky_4-15-pimento', b'pimentoblue_build', b'mips-poky-linux-uclibc')})
        self.assertEqual(sum(d.count(b'arch=0x') for _, d in self.blocks), 1)
        self.assertEqual([i for i, (_, d) in enumerate(self.blocks) if b'arch=0x12' in d], [])

    @unittest.skipUnless(image.UNSQUASHFS, 'unsquashfs is not installed')
    def test_the_touchs_default_record_is_in_the_hubs_image_byte_for_byte(self):
        lab.require(BUILDS[0])
        with tempfile.TemporaryDirectory() as directory:
            reader = image.SquashfsReader(image.members(BUILDS[0])['harmony-image.squashfs'], directory)
            record = reader.cat(DEFAULT_RECORD)
        holding = [i for i, (_, d) in enumerate(self.blocks) if record in d]
        self.assertEqual(len(holding), 1)
        at = self.blocks[holding[0]][1].index(record)
        keys, values, _ = read_record(self.blocks[holding[0]][1], at)
        self.assertEqual(keys, RECORD_KEYS)
        self.assertEqual(values, READ_VALUES)


# The client side. Every template file is read for the architecture its description declares; a file
# declaring none counts under no number, and none here declares two.

def declared(skin, name):
    """The `architectureid` values a template's descriptions declare, as a sorted tuple."""
    found = set()
    for attrs in re.findall(r'<remotedescription([^>]*)>', lab.template(skin, name)):
        fields = dict(re.findall(r'(\w+)="([^"]*)"', attrs))
        if 'architectureid' in fields:
            found.add(int(fields['architectureid']))
    return tuple(sorted(found))


def description(skin, name):
    for attrs in re.findall(r'<remotedescription([^>]*)>', lab.template(skin, name)):
        fields = dict(re.findall(r'(\w+)="([^"]*)"', attrs))
        if 'architectureid' in fields:
            return fields
    return None


#: Harmony Desktop's templates, per skin: how many files declare each number. Read out of the files.
PER_SKIN = {
    82: {17: 11}, 86: {18: 6}, 96: {14: 4, 16: 1}, 97: {17: 20}, 99: {18: 22}, 100: {18: 19, 17: 4},
    102: {18: 22}, 105: {18: 19, 17: 4}, 106: {17: 20}, 108: {18: 19, 17: 4}, 111: {18: 23},
    112: {18: 23}, 113: {17: 19}, 115: {17: 19}, 116: {18: 23}, 400: {17: 19},
}
AT_17_IN_A_REMOTE_SKIN = ['getavailablewifinetworks.xml', 'getdeviceinfo.xml', 'getwifinetworkstatus.xml',
                          'savewifinetwork.xml']
REMOTE_IMAGE_SKINS = image.INTENDED_SKINS


class TheTemplatesFileTheGenerationUnderTwoNumbers(unittest.TestCase):
    """Facts 7 and 8: what 17 and 18 are in Logitech's templates. Stated by Logitech, in their client."""

    def setUp(self):
        if not lab.template_skins():
            self.skipTest('no mirrored client in the lab')

    def counts(self, skin):
        return Counter(a for n in lab.template_names(skin) for a in declared(skin, n))

    def test_the_count_per_skin_and_number(self):
        for skin, expected in PER_SKIN.items():
            with self.subTest(skin=skin):
                self.assertEqual(dict(self.counts(skin)), expected)
                self.assertEqual([n for n in lab.template_names(skin) if len(declared(skin, n)) > 1], [])

    def test_the_two_numbers_map_these_skins_and_three_sit_at_both(self):
        at = {17: set(), 18: set()}
        for skin in lab.template_skins():
            for number in self.counts(skin):
                if number in at:
                    at[number].add(skin)
        self.assertEqual(sorted(at[17]), [82, 97, 100, 105, 106, 108, 113, 115, 400])
        self.assertEqual(sorted(at[18]), [86, 99, 100, 102, 105, 108, 111, 112, 116])
        self.assertEqual(sorted(at[17] & at[18]), [100, 105, 108])

    def test_the_files_at_17_in_skins_100_105_and_108_are_the_same_four(self):
        for skin in (100, 105, 108):
            with self.subTest(skin=skin):
                self.assertEqual([n for n in lab.template_names(skin) if declared(skin, n) == (17,)],
                                 AT_17_IN_A_REMOTE_SKIN)
        # Compared by digest, so a failure does not print Logitech's file.
        self.assertEqual(*(hashlib.sha256(lab.template(s, 'getdeviceinfo.xml').encode()).hexdigest()
                           for s in (105, 108)))
        for skin, named in ((100, '100'), (105, '82'), (108, '82')):
            with self.subTest(getdeviceinfo=skin):
                fields = description(skin, 'getdeviceinfo.xml')
                self.assertNotIn('modelid', fields)
                self.assertEqual((fields['skinid'], fields['comment']), (named, 'Olive'))

    def test_skin_96_declares_14_in_four_files_and_16_in_its_identity_operation(self):
        self.assertEqual([n for n in lab.template_names(96) if declared(96, n) == (16,)], ['identifyremote.xml'])

    def test_the_remotes_image_skins_are_at_18_and_the_hubs_at_17(self):
        skins = lab.template_skins()
        for skin in REMOTE_IMAGE_SKINS:
            with self.subTest(remote_skin=skin):
                self.assertIn(skin, skins)
                self.assertEqual(declared(skin, 'identifyremote.xml'), (18,))
        self.assertNotIn(109, skins)
        for skin in (97, 106):
            with self.subTest(hub_skin=skin):
                self.assertEqual(dict(self.counts(skin)), {17: len(lab.template_names(skin))})


class TheClientComparesTheRemotesNumberWithNothing(unittest.TestCase):
    """Fact 6, Harmony Desktop's half. Names only: the script is Logitech's.

    MyHarmony's half is stated in the header and not asserted, because no fixture names its files.
    """

    def setUp(self):
        self.src = lab.load('desktop_webapp_main').decode('utf-8', 'replace')

    def test_the_units_arch_attribute_is_copied_and_never_read(self):
        self.assertIn('ConstantUnitArchitectureId="arch"', self.src)
        accesses = [m for m in re.finditer(r'(\w+)\.architectureId\b', self.src)]
        self.assertEqual(len(accesses), 7)
        reads = [m.group(1) for m in accesses if self.src[m.end()] != '=' or self.src[m.end():m.end() + 2] == '==']
        self.assertEqual(sorted(reads), ['remoteDescription', 'unitModel'])
        written_only = [m for m in re.finditer(r'\.architecture\b', self.src)]
        self.assertEqual(len(written_only), 2)
        self.assertEqual([m.start() for m in written_only
                          if self.src[m.end()] != '=' or self.src[m.end():m.end() + 2] == '=='], [])

    def test_the_validator_compares_three_ids_and_not_the_architecture(self):
        compared = set(re.findall(r'expected(\w+)!=current(\w+)', self.src))
        self.assertEqual(compared, {('ModelId', 'ModelId'), ('Flashid', 'Flashid'), ('Flashmfgid', 'Flashmfgid')})
        self.assertNotRegex(self.src, r'architectureId\s*!==?|!==?\s*\w+\.architectureId')

    def test_17_and_18_choose_the_same_protocol(self):
        m = re.search(r'supportedLegacyArchitectures=\[([0-9,]+)\]', self.src)
        legacy = {int(x) for x in m.group(1).split(',')}
        self.assertEqual(legacy, {9, 12, 14})
        self.assertEqual(17 in legacy, 18 in legacy)
        self.assertFalse(17 in legacy)


if __name__ == '__main__':
    unittest.main()
