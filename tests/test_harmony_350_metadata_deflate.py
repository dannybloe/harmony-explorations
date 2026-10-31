#!/usr/bin/env python3
"""The metadata archive's deflate stream on the Harmony 300 and 350, and which zlib writes it.

`todo-compile-350.md` 5.1, measured for plan 011. Raw slot 13 of every configuration of this family is a ZIP of
one file, `MetaData.xml`, deflated, `packages/codec/src/metadata.ts`. A configuration built with nothing copied
has to write that archive, and the first question is whether the deflate stream is something we can write
byte for byte or only something that inflates to the same text. `packages/codec/test/noscreencensus.test.ts`
found that Node's zlib reproduces none of three streams at 3465 settings of level, strategy, memory level and
window; this file is the other half.

**What it settled.** Stock zlib, the version Python links here, 1.2.12, at level 6 (what a caller that asks for the
default gets), memory level 8 and the default strategy, reproduces the stream of all six distinct archives the lab
holds, byte for byte: the factory 350, the three device 350, the programmed 350, the test setup's compile (its twin
without favourites holds the same archive, the same eight device names), the programmed 300 and the 2011 as found
300. Seven files, six archives. The same bytes also come out at level -1 and at memory levels 5, 7 and 9, which is
why the check below names level 6 and memory level 8 and no other setting: for texts this size they agree. So
**Logitech's compiler writes its archive as stock zlib does at its defaults**, and Node's zlib, which reproduces
none of the three streams the TypeScript census tried at any setting, cannot be the generator's deflate: a generator
of ours writes its own, calibrated against these six streams.

**What it does not settle.** That other versions of stock zlib agree with 1.2.12 on these texts (not checked: one
version is linked here), what a longer text would do, since the longest here is 25088 bytes of XML, and why Node's
differs, which is only observed.

**Controls.** The same texts at level 1 do not reproduce any stream, so the equality is not a property of deflate in
general; and the archive is found by its signature, of which each file holds exactly one, so the stream compared is
the archive's and not one that happened to be nearby.

**Sources checked first.** `packages/codec/src/metadata.ts` ("The deflated bytes are this machine's zlib's and not
Logitech's"); `reference/config-format/container.md` on the archive; the lab's `work/setups/h350-test/
chapter4-reading.md`, which reads the archive's shape and does not look at its stream. Logitech's client compiles
nothing for this family. **Which architectures**: architecture 16 alone, six archives of one generation of the
service and one of 2011.
"""
import os
import struct
import unittest
import zlib

import lab

# The archive's local header: signature, then at +6 the flags, +26 the name length and +28 the extra length; its
# sizes are in the central directory when a descriptor follows, which is the shape of every archive here.
LOCAL = b'PK\x03\x04'
CENTRAL = b'PK\x01\x02'

NAMED = ('h350_config', 'h350_three_devices_config', 'h350_programmed_config', 'h300_config', 'h300_programmed_config')
SETUP = os.path.join('work', 'setups', 'h350-test', 'compile-Result.EzHex')


def archive_of(data):
    """The deflate stream and the text it holds, taken out of a configuration by the archive's own signature."""
    assert data.count(LOCAL) == 1, 'the configuration holds one archive'
    at = data.index(LOCAL)
    name_length, extra_length = struct.unpack_from('<HH', data, at + 26)
    central = data.index(CENTRAL, at)
    compressed, plain = struct.unpack_from('<II', data, central + 20)
    start = at + 30 + name_length + extra_length
    stream = data[start:start + compressed]
    text = zlib.decompress(stream, -15)
    assert len(text) == plain
    return stream, text


def deflated(text, level, memory=8):
    """A raw deflate stream of `text`, which is what a ZIP entry holds: no zlib header, no checksum."""
    packer = zlib.compressobj(level, zlib.DEFLATED, -15, memory, zlib.Z_DEFAULT_STRATEGY)
    return packer.compress(text) + packer.flush()


def configurations():
    """The six distinct archives' configurations, by name, skipping what the lab does not hold."""
    lab.require(*NAMED)
    found = {name: lab.load(name) for name in NAMED}
    setup = os.path.join(lab.LAB or '', SETUP)
    if not os.path.isfile(setup):
        raise unittest.SkipTest('no %s in the lab' % SETUP)
    with open(setup, 'rb') as handle:
        found['setup'] = handle.read()
    return found


ARCH10 = ('h890_config', 'h890_config_2', 'h895_config')


class StockZlibWritesLogitechsMetadataArchive(unittest.TestCase):
    def test_level_6_memory_level_8_reproduces_the_stream_of_all_six_archives_the_lab_holds(self):
        # Six, not seven: the test setup's compile and its twin without favourites hold one archive between
        # them, and the twin is not in the lab under a name this file loads.
        found = configurations()
        self.assertEqual(len(found), 6)
        for name, data in found.items():
            with self.subTest(name):
                stream, text = archive_of(data)
                self.assertEqual(deflated(text, 6), stream)

    def test_it_also_reproduces_the_harmony_890_and_895_archives_which_cannot_tell_it_from_other_settings(self):
        # Architecture 10 (Harmony 890 and 895) keeps a 270 byte archive in raw slot 3, and stock zlib writes its
        # 132 byte stream at level 6 too, in three files from two owners. That is consistent with one compiler
        # and not evidence for it: a text this small is reproduced at 54 of the 495 settings of level, memory level
        # and strategy tried, so the control that the level matters, level 1, is the 350's and not these.
        lab.require(*ARCH10)
        for name in ARCH10:
            with self.subTest(name):
                stream, text = archive_of(lab.load(name))
                self.assertEqual(deflated(text, 6), stream)

    def test_the_streams_are_not_trivially_alike(self):
        found = configurations()
        streams = {len(archive_of(data)[0]) for data in found.values()}
        self.assertEqual(len(streams), 6, 'six archives, six different stream lengths')

    def test_another_level_does_not_reproduce_them(self):
        # The control: the equality above is about level 6 and not about deflate, so level 1 differs on every one.
        for name, data in configurations().items():
            with self.subTest(name):
                stream, text = archive_of(data)
                self.assertNotEqual(deflated(text, 1), stream)


if __name__ == '__main__':
    unittest.main()
