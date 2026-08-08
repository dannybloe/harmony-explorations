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
    # The same image, complete, read off the remote across both internal pages. Kept alongside the
    # truncated one rather than replacing it: the agreement between the two is the evidence.
    'h600_code_complete': '600-0.2-code-base0x9000-COMPLETE.bin',
    # The Harmony One's 0xFE internal page, read off the spare remote: the bootloader and the
    # image at +0x1000, which no package in the corpus contains because arch 12 runs its
    # application from external NOR. The 0xFF page is deliberately absent from this table, since
    # it holds that unit's identity block.
    'one_internal_fe': 'one-3.4-internal-page-fe.bin',
    # The 600's 0xFE page: bootloader, the safe mode image at +0x1000 that nothing had read before,
    # and the application firmware from +0x9000. Its 0xFF page is absent for the same reason as the
    # Ones': it holds the identity block.
    'h600_internal_fe': '600-0.2-internal-page-fe.bin',
    # The 600's safe mode config, read off its external flash at 0x020000. That address had only
    # ever been established from the 700's update package, so this is the arch 14 layout confirmed
    # on the model it is claimed for. 8192 bytes as read; the container is the first 7115.
    'h600_safemode_gspm': '600-0.2-safemode-gspm-base0x20000.bin',
    # The Harmony 650 update package, the third and last published Harmony firmware. It sat in
    # reference/checksums.md as "not yet analysed, arch 15" until the package was opened; it is
    # arch 14, so arch 14 has three firmware images and three safe mode configs where arch 12 has
    # one of each.
    'h650_code': '650-0.4-Region_2-code-base0x9000.bin',
    'h650_safemode_gspm': '650-0.4-Region_3-gspm-base0x20000.bin',
    'one_hfw': 'harmony_one_firmware_3_4.hfw',
    'h700_hfw': 'harmony_700_firmware_2_8.hfw',
    'h650_hfw': 'harmony_650_firmware_0_4.hfw',
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
    # Two configs of the same Harmony 700, posted together by their owner. The only controlled
    # pair in the corpus: same remote, one documented change between them.
    'h700_config': 'harmony700.EZHex',
    'h700_config_2': 'harmony700-2.EZHex',
    # The spare Harmony One either side of a sync, 7 August 2026. The change was decided and
    # written down before it was made, which no other pair here can say, and the second half was
    # compiled by the live service rather than found. findings.md section 58.
    'one_spare_before_sync': 'one-spare-before-sync-config.bin',
    'one_spare_after_sync': 'one-spare-after-sync-config.bin',
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


# Every config container in the corpus, in the order the coverage report prints them. One list,
# because the same thirteen are walked by the Python tests, by `packages/codec/test/coverage.test.ts`
# and by `tools/facts.py`, and a corpus total is only comparable between them if they agree on what
# the corpus is. The two Harmony One sync-pair dumps are deliberately absent: they are two states of
# one remote rather than two remotes, so counting them would double one unit in every total.
CONTAINERS = (
    'h700_config', 'h700_config_2', 'h600_config', 'h525_config', 'one_config',
    'one_config_unprogrammed', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
    'arch8_config_d', 'h600_safemode_gspm', 'h700_gspm', 'h650_safemode_gspm',
)


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


def require(*names):
    """Skip the whole test unless every named image is present.

    Call this before a loop that ends in a corpus wide assertion. `load` raises SkipTest, but
    **inside `subTest` unittest skips only that subtest and carries on**, so a loop of subTests
    finishes having loaded nothing and the total afterwards is asserted against zero. That is not
    a clean skip, it is a failure, and it made nine tests fail in a checkout with no lab while the
    documents promised otherwise.

    Also the right call when a test hands a path to something that opens it itself, since `path`
    answers None rather than skipping.
    """
    missing = [IMAGES[name] for name in names if not path(name)]
    if missing:
        raise unittest.SkipTest(
            'no %s found; set HARMONY_LAB (searched: %s)'
            % (', '.join(missing), LAB or 'nothing, HARMONY_LAB unset'))
