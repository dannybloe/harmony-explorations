"""
Locating the binaries the tests need.

Firmware and config binaries are not in this repository: they are proprietary, and the
archived packages they came from also contain a third party's account details. So tests
that need them look for a local copy and skip cleanly when there is none.

Point HARMONY_LAB at a directory holding the files named in reference/checksums.md:

    export HARMONY_LAB=/path/to/your/binaries
    make test
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src'))

LAB = os.environ.get('HARMONY_LAB')

# Logical name -> filename, as named in reference/checksums.md.
IMAGES = {
    'one34_code': 'one-3.4-code-base0x20000.bin',
    'one34_region2': 'one-3.4-Region_2-decoded.bin',
    'one_safemode': 'one-safemode-gspm-base0x2000-raw64k.bin',
    'h700_code': '700-2.8-Region_2-code-base0x9000.bin',
    'h700_gspm': '700-2.8-Region_3-gspm-base0x20000.bin',
    'h600_code': '600-0.2-code-base0x9000-TRUNCATED64k.bin',
    'one_hfw': 'harmony_one_firmware_3_4.hfw',
    'h700_hfw': 'harmony_700_firmware_2_8.hfw',
}


def path(name):
    if not LAB:
        return None
    candidate = os.path.join(LAB, IMAGES[name])
    return candidate if os.path.exists(candidate) else None


def load(name):
    """Return the bytes of a named image, or raise SkipTest if unavailable."""
    p = path(name)
    if not p:
        raise unittest.SkipTest(
            'set HARMONY_LAB to a directory containing %s' % IMAGES[name])
    with open(p, 'rb') as fh:
        return fh.read()
