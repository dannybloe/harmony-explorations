#!/usr/bin/env python3
"""What the Harmony Touch's firmware package holds: a Linux system for TI's DA850, an ARM926EJ-S part of the
DaVinci family, with a signature over what runs, the remote's engine in compiled Lua and its screens in Lua
source.

**The question.** `reference/architectures/harmony-touch/firmware.md` said the remotes' package had not
been opened and its processor was not checked, and both were asked for, as the first step
of finding out where a Touch keeps its configuration. Logitech's update service serves this package under
skin 99, fetched on 28 August 2026 on both of its channels into the lab's `firmware/packages/sus/` (section
196): production 4.15.330 and preview 4.15.250. The descriptor names the skins it is for, asserted below;
which products those skins are is the service's word, `reference/architectures/harmony-touch/README.md`.

**Two builds, and how independent they are.** Production and preview are two builds of one line, not two
remotes: they share the kernel's name, `Linux-2.6.37-ge384483`, the updater byte for byte and the boot
loader's arguments. So a fact holding on both is a fact about the line rather than about one build, and
nothing more; where they differ (inode, engine and screen counts) `BUILDS` says so. The hubs' production
package, 4.15.600, is a third sample for the two facts it is asserted for.

**Sources checked first.** `reference/architectures/harmony-touch/firmware.md` and `usb.md`,
`reference/remotes/harmony-touch/` (all ten files), `docs/findings.md` sections 196 to 203, the lab's
`firmware/packages/sus/META.md` and the lab register for every directory touched. Logitech's clients were
not consulted for this step: the package is the vendor's own artefact and states its own layout, and the
client only hands it to the remote (`reference/usb-protocol/file-protocol.md`).

## What was measured

**1. The package.** A ZIP of exactly two members, `Description.xml` and `ota-update.EzHex`. The descriptor
names one file for the path `/fw/otaupdate`, operation `firmwareupgrade`, with a checksum of type `MD5`,
seed 0, offset 0, over a stated length; it names the skins the image is intended for, **99, 100, 102, 105,
108, 111 and 112**, and asks for a reset after it. **The closure**: the stated length is the length of
`ota-update.EzHex` and the stated value is that member's `MD5`, two fields against the bytes, on both
builds.

**2. The update file.** `ota-update.EzHex` is itself a ZIP of exactly five members: `sdigest`, `update`,
`uImage.bin`, `harmony-image.squashfs` and `digest`, the same five names in the same order as the hubs'
production package. `digest` is four lines of `SHA-1` and name, one for each other member, `sdigest`
included, and **every line matches its member** on both builds.

**3. The signature.** `sdigest` is 256 bytes, and the root filesystem carries a 2048 bit RSA public key at
`opt/luaworks/common/key/sdigest_public.der`, the same key in both builds. Raised to the key's exponent
modulo its modulus, `sdigest` gives PKCS#1 version 1.5 type 1 padding, `00 01`, `FF` bytes, `00`, and then
**exactly the last three lines of `digest`** as plain text, with no `DigestInfo` around them: those for
`update`, `uImage.bin` and the root filesystem, on both builds. The hubs' `sdigest` recovers its own
`digest` lines under **the same key**. So the signature shows those three members are what the key's holder
signed, and one key signs both families; it says nothing about who holds it, and a key carried inside the
image it checks is integrity, not origin. A signature with one byte flipped recovers no padded block, which
is the negative.

**4. The kernel and the updater.** `uImage.bin` is a U-Boot legacy image: magic `0x27051956`, architecture
2 (ARM), system 5 (Linux), type 2 (kernel), load and entry address `0xC0008000`, named
`Linux-2.6.37-ge384483` in both builds, and both CRCs in its header verify, the header's over its own 64
bytes with the field zeroed and the data's over the rest. Its payload is a self extracting kernel with a
gzip stream inside, and the inflated kernel holds the CPU name `ARM926EJ-S` and **board code named for the
codename, `da850_juniper_init`**, whose messages set up the infrared, the LCD, the RF, the ClearPad, the
MSP430 and a `tps6507x` part. A `da830_juniper_init` is there too, with one message, a watchdog, so the
juniper board is DA850 code with a DA830 remnant. `update` is a 32 bit little endian ELF executable for
machine 40, ARM; the hubs' is big endian, machine 8, MIPS.

**5. The root filesystem.** A squashfs 4.0 image, compression 1 (zlib), block size 131072, 2935 inodes in
4.15.330 and 2936 in 4.15.250. Inside it, read with `unsquashfs -lls` and `-cat`:

* `etc/hostname` is `juniper`, the codename Logitech's client templates give skin 99 (section 197).
* `lib/firmware/u-boot.bin` carries the boot arguments `mem=64M` and `mtdparts=davinci_nand.1:...`: the
  kernel is told to use 64 MiB, and the NAND flash is driven by the DaVinci family's driver.
* Every build path inside the compiled engine names the toolchain `armv5te-poky-linux-uclibcgnueabi`, a
  Yocto (Poky) build for the ARMv5TE instruction set with uClibc, which is the ARM926EJ-S's.
* `etc/modules` loads three drivers, USB gadget filesystem, `clearpad` and Logitech's `cc2544`, and
  `lib/firmware` holds `tm2176-003.img`, `cc2544.bin`, `msp430.txt` and `u-boot.bin` with two version files.
  How each is installed, read in `etc/init.d/rcS.local` and the drivers: `msp430.txt` is written to
  `/dev/mspfw` when the part's version file cannot be read or differs; `tm2176-003.img` is written to
  `/dev/clearpad` only when the controller reports `TM2176-003-0`; `u-boot.bin` goes to `flashuboot` on
  every start; and the start up script never names `cc2544`, whose firmware its own driver programs (the
  module's strings carry `cc2544_fw` and a Logitech author). The `clearpad` module describes itself as
  `Synatics Clearpad driver`, spelt so.
* The remote's own program is in two trees: `opt/luaworks`, **172 Lua files (173 in 4.15.250), each one
  compiled Lua 5.1**, checked file by file, and `opt/luadraws`, **243 (244), none compiled**, each one
  holding a Lua keyword. **Every engine file's header is `1b4c75615100010404040804`**, stock Lua 5.1 but
  for its twelfth byte, the integral flag, which stock Lua writes as 0 or 1 and these carry as 4; walked with
  the stock 5.1 layout and 8 byte numbers, each file is consumed to its last byte, so that byte is the only
  departure. It is why an off the shelf decompiler refuses the files as they are and reads them with that
  byte set to 0, which is how the lab's decompiled copy in `work/touch-firmware/luaworks-src/` was made. The engine's module names include `tasks/harmonyengine/loader/userconfigreader.lua`,
  `tasks/harmonywebservices/proxy/sync.lua` and `tasks/hal/core/hbus.lua`. Fourteen more Lua files under
  `opt/share/lua` are libraries and not counted.

**6. The unit agrees.** The bench Touch's `/sys/sysinfo`, read on 2 November 2026 off the remote, states
`fw_ver 4.15.330`, the production build, `skin 0x63` and `ram_size 64MB`, the figure the boot arguments
give the kernel. **That is consistency, not an independent closure**: where the remote computes `ram_size`
is not known, and if it is the kernel's view of memory then `mem=64M` decides it. It does tie the unit to
the image by version.

## What it settles and what it does not

**Settled**: the remotes' package layout, its signature and key, the kernel, the CPU, that the board code
is DA850's, the boot arguments, the firmware files for three other parts and how each is installed, and
that the engine is compiled Lua while the screens are source. **Not settled**: which DA850 variant; the
RAM actually fitted, beyond what the kernel is told; the flash size; what the CC2544 does; and where the
configuration lives, which `reference/architectures/harmony-touch/README.md` has since answered. What the MSP430 and the `tps6507x` do was settled later,
in `tests/harmony_touch/test_harmony_touch_keys.py`: the MSP430 reports the keypad's keys, and the `tps6507x` is the
power controller the board declares, whose LED the screens drive as the key light. The engine's strings name
JSON files under `/data/resources/`, `ActivityList.json`, `DeviceList.json` and others, and that is a lead
for 1.3 and not asserted here.

**Width.** The package is one image for every skin its descriptor names, so what is asserted of the image
holds for each of them; that the hardware of any one of those models is what the image's board code
drives is the Touch's alone, by its version and skin above, and unchecked for the others.

**Standing.** "Read in the firmware" for what the image holds; the unit's fields are "Measured on a unit".
The package and everything unpacked from it stay in the lab, as Logitech's copyrighted firmware.
"""
import hashlib
import io
import os
import re
import shutil
import struct
import subprocess
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile
import zlib

import lab

#: The two builds, with what differs between them. Everything else is asserted equal on both.
BUILDS = {
    'touch_package_production': {'inodes': 2935, 'luaworks': 172, 'luadraws': 243},
    'touch_package_preview': {'inodes': 2936, 'luaworks': 173, 'luadraws': 244},
}
HUB = 'hub_package_production'

INTENDED_SKINS = [99, 100, 102, 105, 108, 111, 112]
UPDATE_MEMBERS = ['sdigest', 'update', 'uImage.bin', 'harmony-image.squashfs', 'digest']
KEY_PATH = 'opt/luaworks/common/key/sdigest_public.der'
FIRMWARE_FILES = {'cc2544.bin', 'cc2544.version', 'msp430.txt', 'msp430.version', 'tm2176-003.img',
                  'u-boot.bin'}
MODULES = ['kernel/drivers/usb/gadget/gadgetfs', 'kernel/drivers/input/touchscreen/clearpad',
           'kernel/drivers/misc/logitech/cc2544']
#: What `da850_juniper_init`'s messages name, one each, read out of the inflated kernel.
JUNIPER_SETUP = [b'ir mux setup', b'lcdc registration', b'RF mux setup', b'clearpad irq setup',
                 b'msp430 irq setup', b'tps6507x irq setup']
#: Words a Lua source file holds and a compiled one, having no source text, need not; one per screen file.
LUA_WORDS = re.compile(rb'\b(local|function|return|require|end)\b')

UNSQUASHFS = shutil.which('unsquashfs')


def members(name):
    """The package's update file, as a dict of member name to bytes."""
    with zipfile.ZipFile(io.BytesIO(lab.load(name))) as package:
        inner = package.read('ota-update.EzHex')
    with zipfile.ZipFile(io.BytesIO(inner)) as update:
        return {info.filename: update.read(info) for info in update.infolist()}


def der_rsa_public_key(der):
    """`(modulus, exponent)` out of a DER SubjectPublicKeyInfo, by hand, so the test needs no library.

    The structure is SEQUENCE { SEQUENCE { OID, NULL }, BIT STRING { SEQUENCE { INTEGER n, INTEGER e } } },
    and every element is read as tag, length, content, so a key of any other shape raises rather than
    yielding numbers.
    """
    def element(data, at, tag):
        if data[at] != tag:
            raise ValueError('expected tag 0x%02x at %d, found 0x%02x' % (tag, at, data[at]))
        length = data[at + 1]
        at += 2
        if length & 0x80:
            count = length & 0x7F
            length = int.from_bytes(data[at:at + count], 'big')
            at += count
        return at, at + length

    start, _ = element(der, 0, 0x30)
    _, algorithm_end = element(der, start, 0x30)
    bits_start, bits_end = element(der, algorithm_end, 0x03)
    key = der[bits_start + 1:bits_end]  # the first byte counts unused bits, 0 here
    seq_start, _ = element(key, 0, 0x30)
    n_start, n_end = element(key, seq_start, 0x02)
    e_start, e_end = element(key, n_end, 0x02)
    return int.from_bytes(key[n_start:n_end], 'big'), int.from_bytes(key[e_start:e_end], 'big')


def recovered(signature, key):
    """What RSA with the public key recovers from `signature`, as bytes of the modulus' length."""
    n, e = key
    size = (n.bit_length() + 7) // 8
    return pow(int.from_bytes(signature, 'big'), e, n).to_bytes(size, 'big')


def pkcs1_payload(block):
    """The payload of a PKCS#1 v1.5 type 1 block, or None when the padding is not there."""
    if block[:2] != b'\x00\x01':
        return None
    at = 2
    while at < len(block) and block[at] == 0xFF:
        at += 1
    if at < 10 or at >= len(block) or block[at] != 0:
        return None
    return block[at + 1:]


def signed_lines(found):
    """The `digest` lines the signature covers: every line but the first, which is `sdigest`'s own."""
    lines = found['digest'].splitlines(keepends=True)
    assert lines[0].endswith(b'  sdigest\n'), lines[0]
    return b''.join(lines[1:])


def inflated_kernel(uimage):
    """The kernel inside a uImage's self extracting payload: the one gzip stream in it, inflated."""
    payload = uimage[64:]
    at = payload.find(b'\x1f\x8b\x08\x00')
    if at < 0:
        raise AssertionError('no gzip stream in the kernel payload')
    return zlib.decompressobj(31).decompress(payload[at:])


#: The header every engine file carries: stock Lua 5.1 (format 0, little endian, 4 byte int, size_t and
#: instruction, 8 byte number) but for the twelfth byte, the integral flag, which stock Lua writes as 0 or 1.
ENGINE_HEADER = bytes.fromhex('1b4c75615100010404040804')


def stock_51_length(chunk):
    """How many bytes a chunk takes when walked with the stock Lua 5.1 layout and the header's sizes.

    Function prototypes nest, constants are nil, boolean, an 8 byte number or a string, and the debug
    sections follow. A chunk in some other layout either raises or stops short of its end, which is the
    point: this is what shows the header's odd byte is the only departure from stock.
    """
    at = 12

    def take(fmt):
        nonlocal at
        value = struct.unpack_from(fmt, chunk, at)[0]
        at += struct.calcsize(fmt)
        return value

    def skip(count):
        nonlocal at
        at += count

    def string():
        skip(take('<I'))

    def prototype():
        string()                        # source name
        take('<i'); take('<i')          # first and last line
        skip(4)                         # upvalues, parameters, vararg flag, stack size
        skip(4 * take('<i'))            # instructions
        for _ in range(take('<i')):     # constants
            tag = take('<B')
            if tag == 1:
                skip(1)
            elif tag == 3:
                skip(8)
            elif tag == 4:
                string()
            elif tag != 0:
                raise ValueError('constant tag %d is not stock Lua 5.1' % tag)
        for _ in range(take('<i')):     # nested prototypes
            prototype()
        skip(4 * take('<i'))            # line information
        for _ in range(take('<i')):     # local names and ranges
            string(); take('<i'); take('<i')
        for _ in range(take('<i')):     # upvalue names
            string()

    prototype()
    return at


class SquashfsReader:
    """Read files out of a squashfs image with `unsquashfs`, writing nothing outside a temporary file.

    Extracting the whole tree fails on this machine's case insensitive disk, where two of the image's
    files differ only in case, so the test lists and cats instead of extracting.
    """

    def __init__(self, image_bytes, directory):
        self.path = os.path.join(directory, 'rootfs.squashfs')
        with open(self.path, 'wb') as fh:
            fh.write(image_bytes)
        listing = subprocess.run([UNSQUASHFS, '-lls', self.path], check=True,
                                 capture_output=True).stdout.decode()
        #: Regular files only, path to size, in listing order.
        self.sizes = {}
        for line in listing.splitlines():
            parts = line.split(None, 5)
            if len(parts) == 6 and parts[0].startswith('-') and '/' in parts[5]:
                self.sizes[parts[5].split('/', 1)[1]] = int(parts[2])

    def names(self):
        return list(self.sizes)

    def cat(self, *paths):
        return subprocess.run([UNSQUASHFS, '-cat', self.path, *paths], check=True,
                              capture_output=True).stdout

    def each(self, paths):
        """Each file's bytes, out of one `-cat` of all of them cut at the sizes the listing states."""
        whole = self.cat(*paths)
        if len(whole) != sum(self.sizes[p] for p in paths):
            raise AssertionError('cat returned %d bytes, the listing states %d'
                                 % (len(whole), sum(self.sizes[p] for p in paths)))
        out, at = {}, 0
        for p in paths:
            out[p] = whole[at:at + self.sizes[p]]
            at += self.sizes[p]
        return out


class ThePackage(unittest.TestCase):
    """Facts 1 and 2: the two layers of ZIP, and the descriptor's checksum closing on the bytes."""

    def setUp(self):
        lab.require(*BUILDS)

    def test_the_package_holds_a_descriptor_and_one_update_file(self):
        lab.require(*BUILDS)
        for name in BUILDS:
            with self.subTest(build=name), zipfile.ZipFile(io.BytesIO(lab.load(name))) as package:
                self.assertEqual(package.namelist(), ['Description.xml', 'ota-update.EzHex'])

    def test_the_descriptor_states_the_length_and_md5_of_the_update_file(self):
        lab.require(*BUILDS)
        for name in BUILDS:
            with self.subTest(build=name), zipfile.ZipFile(io.BytesIO(lab.load(name))) as package:
                root = ET.fromstring(package.read('Description.xml'))
                inner = package.read('ota-update.EzHex')
                file = root.find('FILES/FILE')
                checksum = file.find('CHECKSUM')
                self.assertEqual(file.get('PATH'), '/fw/otaupdate')
                self.assertEqual(file.get('OPERATIONTYPE'), 'firmwareupgrade')
                self.assertEqual((checksum.get('TYPE'), checksum.get('SEED'), checksum.get('OFFSET')),
                                 ('MD5', '0', '0'))
                self.assertEqual(int(checksum.get('LENGTH')), len(inner))
                self.assertEqual(checksum.get('EXPECTEDVALUE'), hashlib.md5(inner).hexdigest())
                self.assertEqual([int(s.text) for s in root.findall('INTENDED/SKIN')], INTENDED_SKINS)
                self.assertEqual(root.find('ORDER/ORDER_ELEMENT').get('RESET'), 'true')

    def test_the_update_file_holds_five_members_and_its_digest_matches_each(self):
        for name in BUILDS:
            with self.subTest(build=name):
                found = members(name)
                self.assertEqual(list(found), UPDATE_MEMBERS)
                lines = found['digest'].decode('ascii').splitlines()
                stated = dict(reversed(line.split('  ', 1)) for line in lines)
                self.assertEqual(sorted(stated), sorted(UPDATE_MEMBERS[:-1]))
                for member, digest in stated.items():
                    self.assertEqual(hashlib.sha1(found[member]).hexdigest(), digest, member)

    def test_the_hubs_package_has_the_same_two_layers_and_five_member_names(self):
        lab.require(HUB)
        with zipfile.ZipFile(io.BytesIO(lab.load(HUB))) as package:
            self.assertEqual(package.namelist(), ['Description.xml', 'ota-update.EzHex'])
        self.assertEqual(list(members(HUB)), UPDATE_MEMBERS)


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheSignatureAndTheRootFilesystem(unittest.TestCase):
    """Facts 3 and 5, which need the root filesystem opened."""

    @classmethod
    def setUpClass(cls):
        lab.require(*BUILDS)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.found = {name: members(name) for name in BUILDS}
        cls.rootfs = {}
        for name, found in cls.found.items():
            directory = os.path.join(cls.tmp.name, name)
            os.mkdir(directory)
            cls.rootfs[name] = SquashfsReader(found['harmony-image.squashfs'], directory)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def key(self, name='touch_package_production'):
        return der_rsa_public_key(self.rootfs[name].cat(KEY_PATH))

    def test_the_signature_recovers_the_digest_lines_of_the_three_members_that_run(self):
        keys = {name: self.rootfs[name].cat(KEY_PATH) for name in BUILDS}
        self.assertEqual(len(set(keys.values())), 1, 'the two builds carry the same key')
        for name in BUILDS:
            with self.subTest(build=name):
                key = der_rsa_public_key(keys[name])
                self.assertEqual(key[0].bit_length(), 2048)
                sdigest = self.found[name]['sdigest']
                self.assertEqual(len(sdigest), 256)
                self.assertEqual(pkcs1_payload(recovered(sdigest, key)), signed_lines(self.found[name]))

    def test_the_hubs_signature_recovers_its_digest_lines_under_the_same_key(self):
        lab.require(HUB)
        hub = members(HUB)
        self.assertEqual(pkcs1_payload(recovered(hub['sdigest'], self.key())), signed_lines(hub))

    def test_a_signature_with_one_byte_flipped_recovers_no_padded_block(self):
        flipped = bytearray(self.found['touch_package_production']['sdigest'])
        flipped[100] ^= 0x01
        self.assertIsNone(pkcs1_payload(recovered(bytes(flipped), self.key())))

    def test_the_superblock_states_squashfs_4_zlib_and_the_inode_count(self):
        for name, expected in BUILDS.items():
            with self.subTest(build=name):
                image = self.found[name]['harmony-image.squashfs']
                # magic, inode count, creation time, block size, fragment count, compression, block log,
                # flags, id count, major, minor: the version 4 superblock's first eleven fields.
                magic, inodes, _, block_size, _, compression, _, _, _, major, minor = struct.unpack_from(
                    '<4sIIIIHHHHHH', image, 0)
                self.assertEqual(magic, b'hsqs')
                self.assertEqual((major, minor), (4, 0))
                self.assertEqual(compression, 1)
                self.assertEqual(block_size, 131072)
                self.assertEqual(inodes, expected['inodes'])

    def test_the_boot_loaders_arguments_tell_the_kernel_64_mib_and_name_a_davinci_nand(self):
        for name in BUILDS:
            with self.subTest(build=name):
                uboot = self.rootfs[name].cat('lib/firmware/u-boot.bin')
                stated = re.findall(rb'bootargs=([ -~]+)', uboot)
                self.assertEqual(len(stated), 1)
                self.assertIn(b'mem=64M', stated[0])
                self.assertIn(b'mtdparts=davinci_nand.1:', stated[0])

    def test_every_engine_build_path_names_armv5te_and_the_host_is_juniper(self):
        for name in BUILDS:
            with self.subTest(build=name):
                reader = self.rootfs[name]
                self.assertEqual(reader.cat('etc/hostname').strip(), b'juniper')
                engine = [p for p in reader.names() if p.startswith('opt/luaworks/') and p.endswith('.lua')]
                files = reader.each(engine)
                per_file = {p: set(re.findall(rb'tmp/work/([a-z0-9]+-poky-linux-[a-z]+)/', data))
                            for p, data in files.items()}
                self.assertEqual(set().union(*per_file.values()), {b'armv5te-poky-linux-uclibcgnueabi'})
                self.assertEqual([p for p, triples in per_file.items() if not triples], [])

    def test_firmware_for_three_other_parts_and_how_each_is_installed(self):
        for name in BUILDS:
            with self.subTest(build=name):
                reader = self.rootfs[name]
                firmware = {p.split('/', 2)[2] for p in reader.names() if p.startswith('lib/firmware/')}
                self.assertEqual(firmware, FIRMWARE_FILES)
                modules = [line for line in reader.cat('etc/modules').decode().splitlines()
                           if line and not line.startswith('#')]
                self.assertEqual(modules, MODULES)
                script = reader.cat('etc/init.d/rcS.local')
                self.assertIn(b'/usr/bin/flashuboot /lib/firmware/u-boot.bin', script)
                self.assertEqual(script.count(b'cat /lib/firmware/msp430.txt > /dev/mspfw'), 2)
                self.assertIn(b'if [ $VERSION == "TM2176-003-0" ]; then', script)
                self.assertIn(b'cat /lib/firmware/tm2176-003.img > /dev/clearpad', script)
                self.assertNotIn(b'cc2544', script)
                ko = {p.rsplit('/', 1)[1]: p for p in reader.names() if p.endswith('.ko')}
                radio = reader.cat(ko['cc2544.ko'])
                self.assertIn(b'cc2544_fw', radio)
                self.assertIn(b'author=rtitmuss@logitech.com', radio)
                self.assertIn(b'description=Synatics Clearpad driver', reader.cat(ko['clearpad.ko']))

    def test_each_engine_file_is_compiled_lua_51_and_no_screen_file_is_compiled(self):
        for name, expected in BUILDS.items():
            with self.subTest(build=name):
                reader = self.rootfs[name]
                names = reader.names()
                engine = [p for p in names if p.startswith('opt/luaworks/') and p.endswith('.lua')]
                screens = [p for p in names if p.startswith('opt/luadraws/') and p.endswith('.lua')]
                self.assertEqual(len(engine), expected['luaworks'])
                self.assertEqual(len(screens), expected['luadraws'])
                engine_files = reader.each(engine)
                self.assertEqual([p for p, d in engine_files.items() if d[:12] != ENGINE_HEADER], [])
                self.assertEqual([p for p, d in engine_files.items() if stock_51_length(d) != len(d)], [])
                # The negative: a file one byte short cannot be walked, so the walk is not merely lenient.
                shortest = min(engine_files.values(), key=len)
                with self.assertRaises(struct.error):
                    stock_51_length(shortest[:-1])
                screen_files = reader.each(screens)
                self.assertEqual([p for p, d in screen_files.items() if d.startswith(b'\x1bLua')], [])
                self.assertEqual([p for p, d in screen_files.items() if not LUA_WORDS.search(d)], [])
                for module in ('tasks/harmonyengine/loader/userconfigreader.lua',
                               'tasks/harmonywebservices/proxy/sync.lua', 'tasks/hal/core/hbus.lua'):
                    self.assertIn('opt/luaworks/' + module, engine)


class TheKernelAndTheUpdater(unittest.TestCase):
    """Fact 4: the kernel's header, both of its CRCs, the board code inside it, and the two updaters."""

    def setUp(self):
        lab.require(*BUILDS)

    def test_the_kernel_is_a_uimage_for_arm_linux_and_both_crcs_verify(self):
        for name in BUILDS:
            with self.subTest(build=name):
                image = members(name)['uImage.bin']
                (magic, header_crc, _, size, load, entry, data_crc, os_, arch, kind
                 ) = struct.unpack_from('>IIIIIIIBBB', image, 0)
                self.assertEqual(magic, 0x27051956)
                self.assertEqual((os_, arch, kind), (5, 2, 2))
                self.assertEqual((load, entry), (0xC0008000, 0xC0008000))
                self.assertEqual(image[32:64].rstrip(b'\0'), b'Linux-2.6.37-ge384483')
                header = image[:4] + b'\0\0\0\0' + image[8:64]
                self.assertEqual(zlib.crc32(header), header_crc)
                self.assertEqual(zlib.crc32(image[64:64 + size]), data_crc)
                self.assertEqual(len(image), 64 + size)

    def test_a_flipped_kernel_byte_breaks_the_data_crc(self):
        image = bytearray(members('touch_package_production')['uImage.bin'])
        data_crc, size = struct.unpack_from('>I', image, 24)[0], struct.unpack_from('>I', image, 12)[0]
        image[1000] ^= 0x01
        self.assertNotEqual(zlib.crc32(bytes(image[64:64 + size])), data_crc)

    def test_the_kernel_names_an_arm926ej_s_and_its_juniper_board_code_is_da850s(self):
        for name in BUILDS:
            with self.subTest(build=name):
                kernel = inflated_kernel(members(name)['uImage.bin'])
                self.assertIn(b'ARM926EJ-S', kernel)
                self.assertIn(b'DA850_JUNIPER', kernel)
                for setup in JUNIPER_SETUP:
                    self.assertEqual(len(re.findall(rb'da850_juniper_init: ' + re.escape(setup), kernel)),
                                     1, setup)
                da830 = re.findall(rb'da830_juniper_init: ([ -~]+)', kernel)
                self.assertEqual(da830, [b'watchdog registration failed: %d'])

    def test_the_updater_is_arm_little_endian_and_the_hubs_is_mips_big_endian(self):
        for name in BUILDS:
            with self.subTest(build=name):
                elf = members(name)['update']
                self.assertEqual(elf[:4], b'\x7fELF')
                self.assertEqual((elf[4], elf[5]), (1, 1))  # 32 bit, little endian
                self.assertEqual(struct.unpack_from('<HH', elf, 16), (2, 40))  # executable, ARM
        lab.require(HUB)
        hub = members(HUB)['update']
        self.assertEqual((hub[:4], hub[4], hub[5]), (b'\x7fELF', 1, 2))  # 32 bit, big endian
        self.assertEqual(struct.unpack_from('>HH', hub, 16), (2, 8))  # executable, MIPS


class TheUnitAgrees(unittest.TestCase):
    """Fact 6: the bench Touch runs this production build and reports the memory its kernel is given."""

    def test_the_touch_runs_4_15_330_and_reports_the_64_mib_its_kernel_is_given(self):
        lab.require('touch_sysinfo')
        text = lab.load('touch_sysinfo').decode('ascii', 'replace')
        fields = dict(line.split(' ', 1) for line in text.split('as text:', 1)[1].splitlines()
                      if ' ' in line)
        self.assertEqual(fields['fw_ver'].strip(), '4.15.330')
        self.assertEqual(fields['skin'].strip(), '0x63')
        self.assertEqual(fields['ram_size'].strip(), '64MB')


if __name__ == '__main__':
    unittest.main()
