"""
Locating the binaries the tests need.

Firmware and config binaries are not in this repository: they are proprietary, and the
archived packages they came from also contain a third party's account details. So tests
that need them look for a local copy and skip cleanly when there is none.

Set HARMONY_LAB to the private working directory. If it is unset, a `lab` directory
alongside the repository is used when one exists:

    export HARMONY_LAB=/path/to/lab
    make test

Files are located by name anywhere beneath that directory, so the corpus can be arranged
however suits it. See reference/checksums.md for what the names refer to.
"""
import os
import sys
import unittest

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, '..', 'src'))


def _default_lab():
    sibling = os.path.normpath(os.path.join(_HERE, '..', '..', 'lab'))
    return sibling if os.path.isdir(sibling) else None


LAB = os.environ.get('HARMONY_LAB') or _default_lab()

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
    # Config dumps out of the corpus. The two public sample sets are mirrored from
    # harmony-decompiler; the rest are dumps of specific remotes, so their file names are
    # whatever the contributor's concordance run produced.
    'h525_config': 'config.EZHex',
    'arch8_config_a': 'Update.EZHex',
    'arch8_config_b': 'Update-1.EZHex',
    'arch8_config_c': 'Update-2.EZHex',
    'arch8_config_d': 'Update-3.EZHex',
    'one_config': 'harmony-one-programmed-config.EZHex',
    'one_config_unprogrammed': 'harmony-one-config.EZHex',
    'h600_config': 'harmony-600-programmed-config.EZHex',
    # The second arch 14 config, and the only one from the same model as the arch 14
    # firmware image this project disassembles.
    'h700_config': 'harmony700.EZHex',
}

_cache = {}


def _find(filename):
    """First match for `filename` anywhere under LAB, or None."""
    if filename in _cache:
        return _cache[filename]
    found = None
    if LAB and os.path.isdir(LAB):
        for root, dirs, files in os.walk(LAB):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            if filename in files:
                found = os.path.join(root, filename)
                break
    _cache[filename] = found
    return found


def path(name):
    """Absolute path to a named image, or None when it is not available."""
    return _find(IMAGES[name])


def load(name):
    """Bytes of a named image, or raise SkipTest when it is not available."""
    p = path(name)
    if not p:
        raise unittest.SkipTest(
            'no %s found; set HARMONY_LAB (searched: %s)'
            % (IMAGES[name], LAB or 'nothing, HARMONY_LAB unset'))
    with open(p, 'rb') as fh:
        return fh.read()
