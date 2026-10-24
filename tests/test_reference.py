"""
The reference stays a reference: plan 009 section 5, decision 25, `todo-reference.md` 2.3.

Five guards, each defined once in `tools/reference_guards.py` and each run here in full:

1. **No bench.** `reference/` describes how a Harmony works and never our own work: no bench, lab,
   dump, test account, our unit, the spare, everyday, friend or todo, no lab fixture name, no link into
   the test notes, the lab register or the lab. Logitech's generated data files are exempt.
2. **No person.** The names come from this repository's commit authors and the contributor headings of
   `docs/checksums.md`, read at run time, so this file names nobody, which the last test here checks.
3. **No copy of Logitech's device database.** Its repository, its checkout, the variable that locates
   it, decision 15, "the archive" in the sense of the copy, and its author, read from the checkout's
   own commits when `packages/lab` finds it. Everything but the author applies without the checkout.
4. **Footnotes well formed**, plan 009 section 4: an allowed label, allowed evidence words that match
   the label, every reference defined and every definition referenced, one source per footnote, and
   the archive section, decision or test it names exists.
5. **Links resolve**, file and anchor, in `reference/`, `docs/`, the root documents and the skills.
   The archive's own links are `tests/test_archive.py`'s.

**The pinned lists, and why they may only shrink.** The reference is not clean when these guards are
written; chapters 3 and 4 of `todo-reference.md` clean it. So `PINNED` below holds exactly what each
guard finds today, as counts per file and per kind, written by `tools/reference_guards.py --pin`. Two
tests per guard hold it to that:

* `..._finds_nothing_beyond_its_pinned_list` fails on a file or kind not on the list and on a count
  that rose: nothing new gets into the reference.
* `..._pinned_list_has_only_shrunk` fails when a count fell and the list did not follow. That is the
  moment to run `--pin`: the list then shrinks, and reading its diff shows what a step removed.

**The list may only ever shrink.** A pin that adds an entry or raises a count is a violation being
waved through and must not be committed; the fix is in the document, not here. A person's name never
reaches a key: `redact` turns a key holding one into a digest.

**Each guard was shown failing before it was relied on**, twice over. Once on the real tree, by
planting one violation per guard in a reference page and watching the first test fail (the
`todo-reference.md` 2.3 note says how). And permanently, in `PlantedViolations`: each checker is run
over a small synthetic tree holding one violation of each kind it knows, and must report every one of
them and nothing on the clean twin. A guard whose checker went blind would pass its pinned list
trivially, which is the failure that class exists to catch.
"""
import collections
import os
import re
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))

import reference_guards as guards  # noqa: E402

# BEGIN PINNED: written by tools/reference_guards.py --pin, never by hand
PINNED = {
    'bench': {
        ('reference/README.md', 'bench'): 6,
        ('reference/README.md', 'lab'): 2,
        ('reference/architectures/harmony-300-350/README.md', 'bench'): 2,
        ('reference/architectures/harmony-300-350/firmware.md', 'bench'): 1,
        ('reference/architectures/harmony-300-350/firmware.md', 'fixture skin104-harmony350-production-1.4.0.0'): 1,
        ('reference/architectures/harmony-300-350/firmware.md', 'lab'): 1,
        ('reference/architectures/harmony-300-350/misc.md', 'lab'): 2,
        ('reference/architectures/harmony-5xx/firmware.md', 'lab'): 1,
        ('reference/architectures/harmony-5xx/memory.md', 'lab'): 1,
        ('reference/architectures/harmony-5xx/memory.md', 'todo'): 1,
        ('reference/architectures/harmony-5xx/misc.md', 'lab'): 3,
        ('reference/architectures/harmony-5xx/usb.md', 'lab'): 2,
        ('reference/architectures/harmony-600-650-700/README.md', 'bench'): 7,
        ('reference/architectures/harmony-600-650-700/README.md', 'todo'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'bench'): 2,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture calibration_h600'): 3,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h600_config'): 5,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h650_bench_4_2_base'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h650_config_region'): 3,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h650_issue36_config'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h650_issue8_config'): 5,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h650_panasonic_config'): 2,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h650_power_hold_compile'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h650_power_hold_compile_2'): 2,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h650_test_config_clean'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h700_28_config_region'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h700_config'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture h700_power_hold_compile'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture harvest_650_two_devices'): 4,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture one_config_unprogrammed'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'fixture one_friend_asfound_config'): 2,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'lab'): 2,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'test account'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'the spare'): 1,
        ('reference/architectures/harmony-600-650-700/compiler.md', 'todo'): 5,
        ('reference/architectures/harmony-600-650-700/usb.md', 'lab'): 1,
        ('reference/architectures/harmony-one/compiler.md', 'everyday'): 3,
        ('reference/architectures/harmony-one/compiler.md', 'fixture harvest_one_families_1'): 3,
        ('reference/architectures/harmony-one/compiler.md', 'fixture harvest_one_two_devices'): 2,
        ('reference/architectures/harmony-one/compiler.md', 'fixture one_config'): 4,
        ('reference/architectures/harmony-one/compiler.md', 'friend'): 1,
        ('reference/architectures/harmony-one/compiler.md', 'test account'): 1,
        ('reference/architectures/harmony-one/compiler.md', 'the spare'): 3,
        ('reference/architectures/harmony-one/compiler.md', 'todo'): 5,
        ('reference/architectures/harmony-one/memory.md', 'bench'): 1,
        ('reference/architectures/harmony-one/memory.md', 'dump'): 5,
        ('reference/architectures/harmony-one/memory.md', 'lab'): 2,
        ('reference/button-maps.md', 'fixture calibration_h600'): 1,
        ('reference/button-maps.md', 'lab'): 2,
        ('reference/capabilities.md', 'bench'): 8,
        ('reference/capabilities.md', 'dump'): 2,
        ('reference/capabilities.md', 'lab'): 6,
        ('reference/config-format/README.md', 'bench'): 2,
        ('reference/config-format/README.md', 'lab'): 2,
        ('reference/config-format/README.md', 'todo'): 2,
        ('reference/config-format/actions.md', 'fixture calibration_h600'): 2,
        ('reference/config-format/actions.md', 'fixture h600_config'): 1,
        ('reference/config-format/actions.md', 'fixture h650_test_config_clean'): 1,
        ('reference/config-format/actions.md', 'fixture one_config'): 1,
        ('reference/config-format/actions.md', 'the spare'): 1,
        ('reference/config-format/activities-and-devices.md', 'bench'): 1,
        ('reference/config-format/activities-and-devices.md', 'everyday'): 1,
        ('reference/config-format/activities-and-devices.md', 'fixture arch8_config_880'): 1,
        ('reference/config-format/activities-and-devices.md', 'fixture arch8_config_885'): 1,
        ('reference/config-format/activities-and-devices.md', 'fixture one_config'): 6,
        ('reference/config-format/container.md', 'bench'): 1,
        ('reference/config-format/container.md', 'fixture h525_safemode_ahcm'): 1,
        ('reference/config-format/header-records.md', 'bench'): 1,
        ('reference/config-format/header-records.md', 'dump'): 2,
        ('reference/config-format/header-records.md', 'lab'): 3,
        ('reference/config-format/infrared-records.md', 'fixture h525_config'): 2,
        ('reference/config-format/infrared-records.md', 'lab'): 5,
        ('reference/config-format/layout.md', 'fixture calibration_favchannels'): 1,
        ('reference/config-format/layout.md', 'fixture h700_config'): 1,
        ('reference/config-format/layout.md', 'fixture h700_config_2'): 1,
        ('reference/config-format/layout.md', 'fixture phase7_before'): 1,
        ('reference/config-format/layout.md', 'lab'): 1,
        ('reference/config-format/modes-and-keys.md', 'bench'): 1,
        ('reference/config-format/modes-and-keys.md', 'everyday'): 2,
        ('reference/config-format/modes-and-keys.md', 'fixture arch8_config_880'): 1,
        ('reference/config-format/modes-and-keys.md', 'fixture arch8_config_885'): 1,
        ('reference/config-format/modes-and-keys.md', 'fixture arch8_config_a'): 1,
        ('reference/config-format/modes-and-keys.md', 'fixture calibration_h600'): 1,
        ('reference/config-format/modes-and-keys.md', 'fixture h525_safemode_ahcm'): 1,
        ('reference/config-format/modes-and-keys.md', 'fixture harvest_one_two_devices'): 2,
        ('reference/config-format/modes-and-keys.md', 'fixture one_config'): 1,
        ('reference/config-format/modes-and-keys.md', 'fixture one_config_unprogrammed'): 1,
        ('reference/config-format/modes-and-keys.md', 'the spare'): 1,
        ('reference/config-format/relocation.md', 'fixture arch8_config_a'): 1,
        ('reference/config-format/relocation.md', 'fixture h525_config'): 1,
        ('reference/config-format/relocation.md', 'fixture h525_safemode_ahcm'): 1,
        ('reference/config-format/relocation.md', 'fixture h600_config'): 1,
        ('reference/config-format/relocation.md', 'fixture h700_config'): 1,
        ('reference/config-format/relocation.md', 'fixture one_config'): 1,
        ('reference/config-format/screens.md', 'dump'): 1,
        ('reference/config-format/screens.md', 'everyday'): 1,
        ('reference/config-format/screens.md', 'fixture h525_config'): 1,
        ('reference/config-format/state.md', 'bench'): 2,
        ('reference/config-format/state.md', 'fixture calibration_h600'): 1,
        ('reference/config-format/state.md', 'fixture h600_config'): 2,
        ('reference/config-format/state.md', 'fixture h700_config'): 1,
        ('reference/config-format/state.md', 'friend'): 1,
        ('reference/config-format/state.md', 'lab'): 3,
        ('reference/config-format/state.md', 'todo'): 2,
        ('reference/glossary.md', 'dump'): 2,
        ('reference/how-a-harmony-works.md', 'bench'): 7,
        ('reference/how-a-harmony-works.md', 'lab'): 4,
        ('reference/infrared/sending.md', 'lab'): 2,
        ('reference/logitech/classic-client.md', 'bench'): 2,
        ('reference/logitech/classic-client.md', 'lab'): 3,
        ('reference/logitech/clients.md', 'bench'): 5,
        ('reference/logitech/clients.md', 'lab'): 10,
        ('reference/logitech/data-model/model.md', 'bench'): 1,
        ('reference/logitech/data-model/model.md', 'lab'): 2,
        ('reference/logitech/data-model/model.md', 'test account'): 2,
        ('reference/logitech/device-catalogue.md', 'lab'): 2,
        ('reference/logitech/service.md', 'bench'): 1,
        ('reference/logitech/service.md', 'fixture h600_config'): 1,
        ('reference/logitech/service.md', 'fixture one_spare_myharmony'): 1,
        ('reference/logitech/service.md', 'lab'): 2,
        ('reference/logitech/service.md', 'the spare'): 1,
        ('reference/logitech/update-service.md', 'lab'): 1,
        ('reference/models.md', 'bench'): 9,
        ('reference/models.md', 'lab'): 3,
        ('reference/remotes/harmony-300/behaviour.md', 'bench'): 3,
        ('reference/remotes/harmony-300/features.md', 'bench'): 2,
        ('reference/remotes/harmony-300/firmware.md', 'fixture skin104-harmony350-production-1.4.0.0'): 1,
        ('reference/remotes/harmony-300/hardware.md', 'bench'): 1,
        ('reference/remotes/harmony-300/keys.md', 'bench'): 2,
        ('reference/remotes/harmony-350/behaviour.md', 'bench'): 3,
        ('reference/remotes/harmony-350/features.md', 'bench'): 1,
        ('reference/remotes/harmony-350/firmware.md', 'fixture skin104-harmony350-production-1.4.0.0'): 1,
        ('reference/remotes/harmony-350/hardware.md', 'bench'): 1,
        ('reference/remotes/harmony-525/README.md', 'bench'): 1,
        ('reference/remotes/harmony-525/behaviour.md', 'bench'): 1,
        ('reference/remotes/harmony-525/display.md', 'bench'): 1,
        ('reference/remotes/harmony-525/display.md', 'lab'): 1,
        ('reference/remotes/harmony-525/features.md', 'bench'): 2,
        ('reference/remotes/harmony-600/README.md', 'bench'): 3,
        ('reference/remotes/harmony-600/README.md', 'lab'): 1,
        ('reference/remotes/harmony-600/behaviour.md', 'bench'): 2,
        ('reference/remotes/harmony-600/display.md', 'bench'): 6,
        ('reference/remotes/harmony-600/features.md', 'bench'): 1,
        ('reference/remotes/harmony-600/firmware.md', 'bench'): 1,
        ('reference/remotes/harmony-600/firmware.md', 'dump'): 1,
        ('reference/remotes/harmony-600/firmware.md', 'fixture 600-0.2-code-base0x9000-COMPLETE.bin'): 1,
        ('reference/remotes/harmony-600/firmware.md', 'fixture 600-0.2-code-base0x9000-TRUNCATED64k.bin'): 1,
        ('reference/remotes/harmony-600/firmware.md', 'fixture 600-0.2-internal-page-fe.bin'): 1,
        ('reference/remotes/harmony-600/firmware.md', 'fixture 600-0.2-safemode-gspm-base0x20000.bin'): 1,
        ('reference/remotes/harmony-600/firmware.md', 'lab'): 4,
        ('reference/remotes/harmony-600/firmware.md', 'todo'): 2,
        ('reference/remotes/harmony-600/hardware.md', 'bench'): 1,
        ('reference/remotes/harmony-600/keys.md', 'bench'): 1,
        ('reference/remotes/harmony-650/README.md', 'bench'): 5,
        ('reference/remotes/harmony-650/README.md', 'lab'): 5,
        ('reference/remotes/harmony-650/README.md', 'test account'): 1,
        ('reference/remotes/harmony-650/README.md', 'todo'): 1,
        ('reference/remotes/harmony-650/behaviour.md', 'bench'): 14,
        ('reference/remotes/harmony-650/behaviour.md', 'lab'): 1,
        ('reference/remotes/harmony-650/behaviour.md', 'todo'): 4,
        ('reference/remotes/harmony-650/display.md', 'bench'): 9,
        ('reference/remotes/harmony-650/display.md', 'todo'): 3,
        ('reference/remotes/harmony-650/features.md', 'bench'): 7,
        ('reference/remotes/harmony-650/features.md', 'fixture h650_panasonic_config'): 1,
        ('reference/remotes/harmony-650/features.md', 'lab'): 1,
        ('reference/remotes/harmony-650/features.md', 'todo'): 3,
        ('reference/remotes/harmony-650/firmware.md', 'bench'): 6,
        ('reference/remotes/harmony-650/firmware.md', 'fixture 650-0.2-code-base0x9000-bench.bin'): 1,
        ('reference/remotes/harmony-650/firmware.md', 'fixture 650-0.4-Region_2-code-base0x9000.bin'): 1,
        ('reference/remotes/harmony-650/firmware.md', 'fixture 650-0.4-Region_3-gspm-base0x20000.bin'): 1,
        ('reference/remotes/harmony-650/firmware.md', 'fixture h650_bench_code'): 1,
        ('reference/remotes/harmony-650/firmware.md', 'fixture h650_page_ff'): 1,
        ('reference/remotes/harmony-650/firmware.md', 'fixture harmony_650_firmware_0_4.hfw'): 2,
        ('reference/remotes/harmony-650/firmware.md', 'lab'): 5,
        ('reference/remotes/harmony-650/hardware.md', 'bench'): 5,
        ('reference/remotes/harmony-650/hardware.md', 'lab'): 1,
        ('reference/remotes/harmony-650/hardware.md', 'todo'): 1,
        ('reference/remotes/harmony-650/keys.md', 'bench'): 1,
        ('reference/remotes/harmony-650/memory.md', 'bench'): 2,
        ('reference/remotes/harmony-650/memory.md', 'lab'): 5,
        ('reference/remotes/harmony-650/misc.md', 'bench'): 4,
        ('reference/remotes/harmony-650/misc.md', 'lab'): 5,
        ('reference/remotes/harmony-650/misc.md', 'test account'): 3,
        ('reference/remotes/harmony-650/misc.md', 'todo'): 1,
        ('reference/remotes/harmony-650/usb.md', 'bench'): 2,
        ('reference/remotes/harmony-650/usb.md', 'lab'): 2,
        ('reference/remotes/harmony-650/usb.md', 'todo'): 1,
        ('reference/remotes/harmony-700/README.md', 'bench'): 2,
        ('reference/remotes/harmony-700/behaviour.md', 'bench'): 4,
        ('reference/remotes/harmony-700/display.md', 'bench'): 6,
        ('reference/remotes/harmony-700/features.md', 'bench'): 1,
        ('reference/remotes/harmony-700/firmware.md', 'fixture 700-2.8-Region_2-code-base0x9000.bin'): 1,
        ('reference/remotes/harmony-700/firmware.md', 'fixture 700-2.8-Region_3-gspm-base0x20000.bin'): 1,
        ('reference/remotes/harmony-700/firmware.md', 'lab'): 3,
        ('reference/remotes/harmony-700/firmware.md', 'todo'): 1,
        ('reference/remotes/harmony-700/hardware.md', 'bench'): 1,
        ('reference/remotes/harmony-700/keys.md', 'bench'): 2,
        ('reference/remotes/harmony-one/README.md', 'bench'): 2,
        ('reference/remotes/harmony-one/behaviour.md', 'bench'): 6,
        ('reference/remotes/harmony-one/behaviour.md', 'everyday'): 1,
        ('reference/remotes/harmony-one/behaviour.md', 'the spare'): 1,
        ('reference/remotes/harmony-one/display.md', 'bench'): 8,
        ('reference/remotes/harmony-one/display.md', 'everyday'): 2,
        ('reference/remotes/harmony-one/display.md', 'the spare'): 1,
        ('reference/remotes/harmony-one/features.md', 'bench'): 4,
        ('reference/remotes/harmony-one/firmware.md', 'bench'): 1,
        ('reference/remotes/harmony-one/firmware.md', 'dump'): 2,
        ('reference/remotes/harmony-one/firmware.md', 'fixture harmony_one_firmware_3_4.hfw'): 1,
        ('reference/remotes/harmony-one/firmware.md', 'lab'): 2,
        ('reference/remotes/harmony-one/hardware.md', 'bench'): 3,
        ('reference/remotes/harmony-one/keys.md', 'bench'): 2,
        ('reference/remotes/harmony-one/memory.md', 'bench'): 1,
        ('reference/remotes/harmony-one/memory.md', 'lab'): 1,
        ('reference/remotes/harmony-one/memory.md', 'todo'): 3,
        ('reference/remotes/harmony-one/misc.md', 'bench'): 3,
        ('reference/remotes/harmony-touch/README.md', 'bench'): 1,
        ('reference/remotes/harmony-touch/behaviour.md', 'bench'): 1,
        ('reference/remotes/harmony-touch/firmware.md', 'lab'): 1,
        ('reference/remotes/harmony-touch/hardware.md', 'lab'): 1,
        ('reference/remotes/harmony-touch/misc.md', 'lab'): 1,
        ('reference/usb-protocol/README.md', 'dump'): 2,
        ('reference/usb-protocol/README.md', 'the spare'): 1,
        ('reference/usb-protocol/bootloader.md', 'bench'): 2,
        ('reference/usb-protocol/bootloader.md', 'fixture h600_internal_fe'): 1,
        ('reference/usb-protocol/bootloader.md', 'fixture one_internal_fe'): 1,
        ('reference/usb-protocol/commands.md', 'bench'): 8,
        ('reference/usb-protocol/commands.md', 'dump'): 4,
        ('reference/usb-protocol/commands.md', 'lab'): 4,
        ('reference/usb-protocol/commands.md', 'the spare'): 3,
        ('reference/usb-protocol/file-protocol.md', 'bench'): 1,
        ('reference/usb-protocol/transport.md', 'bench'): 2,
        ('reference/usb-protocol/transport.md', 'dump'): 1,
        ('reference/usb-protocol/transport.md', 'fixture 700-2.8-Region_2-code-base0x9000.bin'): 1,
        ('reference/usb-protocol/version-block.md', 'bench'): 8,
    },
    'names': {
        ('reference/capabilities.md', 'a person'): 2,
        ('reference/config-format/actions.md', 'a person'): 1,
        ('reference/config-format/state.md', 'a person'): 1,
        ('reference/glossary.md', 'a person'): 2,
        ('reference/how-a-harmony-works.md', 'a person'): 15,
        ('reference/logitech/clients.md', 'a person'): 2,
        ('reference/logitech/data-model/model.md', 'a person'): 4,
        ('reference/logitech/service.md', 'a person'): 2,
    },
    'copy': {
        ('reference/architectures/harmony-600-650-700/compiler.md', 'the archive, meaning the copy'): 1,
        ('reference/config-format/state.md', 'the archive, meaning the copy'): 2,
        ('reference/infrared/frames.md', 'the archive, meaning the copy'): 1,
        ('reference/infrared/sending.md', 'the archive, meaning the copy'): 3,
    },
    'footnotes': {
    },
    'links': {
    },
}
# END PINNED

_RESULTS = None


def results():
    """Every guard's findings over the real tree, computed once for the whole module."""
    global _RESULTS
    if _RESULTS is None:
        _RESULTS = guards.run_all()
    return _RESULTS


def compare(found, pinned, uncomputed=()):
    """(new, stale): entries above their pinned count, and pinned entries now below it.

    Kinds in `uncomputed` were not looked for on this machine and are left out of both directions.
    """
    found = {k: v for k, v in found.items() if k[1] not in uncomputed}
    pinned = {k: v for k, v in pinned.items() if k[1] not in uncomputed}
    new = sorted((k, pinned.get(k, 0), v) for k, v in found.items() if v > pinned.get(k, 0))
    stale = sorted((k, v, found.get(k, 0)) for k, v in pinned.items() if found.get(k, 0) < v)
    return new, stale


def describe(rows):
    return '\n'.join('%s: %s, pinned %d, found %d' % (path, kind, was, now)
                     for (path, kind), was, now in rows)


class GuardsAgainstThePinnedList(unittest.TestCase):
    """The real tree against `PINNED`, two tests per guard."""

    def check(self, guard):
        found, uncomputed = results()
        new, stale = compare(found[guard], PINNED.get(guard, {}), uncomputed.get(guard, ()))
        return new, stale

    def assert_nothing_new(self, guard):
        new, _ = self.check(guard)
        self.assertEqual(new, [], 'new %s violations, fix the document rather than the pin:\n%s'
                         % (guard, describe(new)))

    def assert_only_shrunk(self, guard):
        _, stale = self.check(guard)
        self.assertEqual(stale, [], '%s violations were removed: run tools/reference_guards.py --pin '
                         'so the list shrinks with them:\n%s' % (guard, describe(stale)))

    def test_bench_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('bench')

    def test_bench_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('bench')

    def test_names_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('names')

    def test_names_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('names')

    def test_copy_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('copy')

    def test_copy_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('copy')

    def test_footnotes_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('footnotes')

    def test_footnotes_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('footnotes')

    def test_links_finds_nothing_beyond_its_pinned_list(self):
        self.assert_nothing_new('links')

    def test_links_pinned_list_has_only_shrunk(self):
        self.assert_only_shrunk('links')

    def test_the_pin_holds_every_guard_and_nothing_else(self):
        """A guard missing from `PINNED` would be compared against an empty list and look clean."""
        self.assertEqual(sorted(PINNED), sorted(guards.GUARDS))

    def test_the_comparison_reports_both_directions(self):
        """`compare` itself: one entry risen, one new, one fallen, one gone, one unchanged."""
        pinned = {('a', 'x'): 2, ('b', 'x'): 1, ('c', 'x'): 3, ('d', 'x'): 1}
        found = collections.Counter({('a', 'x'): 3, ('e', 'x'): 1, ('c', 'x'): 1, ('d', 'x'): 1})
        new, stale = compare(found, pinned)
        self.assertEqual([k for k, _, _ in new], [('a', 'x'), ('e', 'x')])
        self.assertEqual([k for k, _, _ in stale], [('b', 'x'), ('c', 'x')])
        self.assertEqual(compare(found, pinned, uncomputed=('x',)), ([], []))


def write(root, relative, text):
    path = os.path.join(root, relative)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write(text)
    return path


# A token no person carries, standing in for a name, so the controls name nobody either.
NOT_A_NAME = 'qwxyzzyv'


class PlantedViolations(unittest.TestCase):
    """Every checker on a synthetic tree: each planted violation found, the clean twin silent."""

    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = self.temporary.name
        write(self.root, 'docs/findings.md', '# Findings\n\n<a id="s1"></a>\n## 1. One\n\ntext\n')
        write(self.root, 'docs/decisions.md', '# Decisions\n\n1. <a id="d1"></a>**One.** text\n')
        write(self.root, 'docs/test-notes/harmony-one.md', '# Notes\n')
        write(self.root, 'tests/test_thing.py', '"""The argument."""\n')

    def tearDown(self):
        self.temporary.cleanup()

    def kinds(self, counter):
        return sorted({kind for _, kind in counter})

    def test_bench(self):
        write(self.root, 'reference/clean.md', '# Clean\n\nA label, a dumpling, a benchmark.\n')
        write(self.root, 'reference/logitech/data-model/entities.md', 'the lab, the bench\n')
        write(self.root, 'reference/page.md', (
            'Read off the bench, from a dump in the lab, on our unit, the spare, the everyday one, a '
            "friend's, a test account; see todo.md, and the fixture `h600_config` or one.bin.\n"
            '[notes](../docs/test-notes/harmony-one.md)\n'))
        found = guards.bench_violations(self.root, fixtures={'h600_config', 'one.bin'})
        self.assertEqual({path for path, _ in found}, {'reference/page.md'})
        self.assertEqual(self.kinds(found), sorted(
            [kind for kind, _ in guards.BENCH_WORDS]
            + ['fixture h600_config', 'fixture one.bin', 'link into docs/test-notes/']))

    def test_names(self):
        write(self.root, 'reference/clean.md', 'Nobody here.\n')
        write(self.root, 'reference/page.md', 'As %s said.\n' % NOT_A_NAME.capitalize())
        found = guards.name_violations(self.root, people={NOT_A_NAME})
        self.assertEqual(dict(found), {('reference/page.md', 'a person'): 1})
        self.assertEqual(guards.redact('by %s' % NOT_A_NAME, {NOT_A_NAME})[:9], 'redacted ')
        self.assertEqual(guards.redact('by nobody', {NOT_A_NAME}), 'by nobody')

    def test_names_come_from_the_contributor_headings(self):
        write(self.root, 'docs/checksums.md', '## Contributed by %s, a date\n' % NOT_A_NAME)
        self.assertIn(NOT_A_NAME, guards.person_names(self.root))

    def test_copy(self):
        write(self.root, 'reference/clean.md', (
            'The metadata archive, an archived package, archive section 3, the findings archive.\n'))
        write(self.root, 'reference/page.md', (
            'Cloned from logitech-harmony-ir-archive, located by HARMONY_IR_ARCHIVE under decision 15, '
            'the infrared archive by %s; the archive names it.\n' % NOT_A_NAME))
        with_author = guards.copy_violations(self.root, authors={NOT_A_NAME})
        self.assertEqual({path for path, _ in with_author}, {'reference/page.md'})
        self.assertEqual(self.kinds(with_author),
                         sorted([kind for kind, _ in guards.COPY_PATTERNS] + ['its author']))
        without = guards.copy_violations(self.root, authors=None)
        self.assertNotIn('its author', self.kinds(without))
        self.assertEqual(len(self.kinds(without)), len(guards.COPY_PATTERNS))

    def test_footnotes(self):
        good = (
            'Fact[^s1], choice[^d1], later[^t-thing], outside[^x-forum], open[^unchecked], again[^s1b].\n\n'
            '[^s1]: Read in the firmware. [Section 1](../docs/findings.md#s1)\n'
            '[^d1]: Chosen by this project. [Decision 1](../docs/decisions.md#d1)\n'
            '[^t-thing]: Measured on a unit. [The test](../tests/test_thing.py)\n'
            '[^x-forum]: Stated by a third party. [The table](https://example.org/table)\n'
            '[^unchecked]: Not checked.\n'
            '[^s1b]: Stated by Logitech, in their client. [Section 1](../docs/findings.md#s1)\n'
            '```\n[^s9]: an example in a fence is not a footnote\n```\n')
        path = write(self.root, 'reference/clean.md', good)
        self.assertEqual(guards.footnote_problems(path, good, self.root), [])
        bad = (
            'A[^S1] b[^s2] c[^s1] d[^d1] e[^d7] f[^t-thing] g[^x-a] h[^unchecked] i[^s3] j[^nodef] k[^d2].\n\n'
            '[^S1]: Read in the firmware. [Section 1](../docs/findings.md#s1)\n'
            '[^s2]: Read in the firmware. [Section 2](../docs/findings.md#s2)\n'
            '[^s1]: Guessed. [Section 1](../docs/findings.md#s1)\n'
            '[^d1]: Read in the firmware. [Decision 1](../docs/decisions.md#d1)\n'
            '[^d7]: Chosen by this project. [Decision 7](../docs/decisions.md#d7)\n'
            '[^t-thing]: Measured on a unit. [Not a test](../docs/findings.md)\n'
            '[^x-a]: Stated by a third party. [Local](../docs/findings.md)\n'
            '[^unchecked]: Not checked. [Section 1](../docs/findings.md#s1)\n'
            '[^s3]: Read in the firmware. [Section 1](../docs/findings.md#s1) [Section 3](../docs/findings.md#s3)\n'
            '[^orphan]: Not checked.\n'
            '[^d2]: Chosen by this project. [Decision 1](../docs/decisions.md#d1)\n'
            '[^s1]: Read in the firmware. [Section 1](../docs/findings.md#s1)\n')
        path = write(self.root, 'reference/page.md', bad)
        problems = set(guards.footnote_problems(path, bad, self.root))
        self.assertEqual(problems, {
            ('S1', 'label not of an allowed form'),
            ('s2', 'names a section the archive does not hold'),
            ('s1', 'evidence words not allowed'),
            ('s1', 'defined more than once'),
            ('d1', 'evidence words do not match the label'),
            ('d7', 'names a decision that does not exist'),
            ('t-thing', 'does not link a test file'),
            ('x-a', 'outside source without a public address'),
            ('unchecked', 'links although not checked'),
            ('s3', 'does not name exactly one source'),
            ('nodef', 'referenced and never defined'),
            ('nodef', 'label not of an allowed form'),
            ('orphan', 'defined and never referenced'),
            ('orphan', 'label not of an allowed form'),
            ('d2', 'does not link its own decision'),
        })
        counted = guards.footnote_violations(self.root)
        self.assertEqual({path for path, _ in counted}, {'reference/page.md'})

    def test_links(self):
        write(self.root, 'reference/target.md', (
            '# Target\n\n## A heading, with `code` and [a link](clean.md)\n\n## Twice\n\n## Twice\n\n'
            '<a id="s5"></a>\n'))
        clean = ('[a](target.md) [b](target.md#a-heading-with-code-and-a-link) [c](target.md#twice-1) '
                 '[d](target.md#s5) [e](#self) [f](https://example.org/x) ![g](target.md)\n\n'
                 '## Self\n\n`[not](a-link.md)`\n\n```\n[not](a-link.md)\n```\n[ref]: target.md#twice\n')
        path = write(self.root, 'reference/clean.md', clean)
        self.assertEqual(guards.broken_links(path, clean, self.root), [])
        bad = ('[a](gone.md) [b](../reference/target.md#nowhere) [c](../../outside.md) [d](#nothing)\n'
               '[ref]: gone-too.md\n<a href="also-gone.md">e</a>\n')
        path = write(self.root, 'docs/page.md', bad)
        self.assertEqual(sorted(reason for _, _, reason in guards.broken_links(path, bad, self.root)),
                         ['leaves the repository', 'missing anchor', 'missing anchor',
                          'missing file', 'missing file', 'missing file'])
        self.assertEqual({p for p, _ in guards.link_violations(self.root)}, {'docs/page.md'})

    def test_links_leave_the_archive_to_its_own_test(self):
        write(self.root, 'docs/findings.md', '[a](gone.md)\n')
        self.assertEqual(guards.link_violations(self.root), collections.Counter())


class ThisGuardNamesNobody(unittest.TestCase):
    """Plan 009 section 5: the names are read at run time, so the guard's own files carry none."""

    def test_neither_the_test_nor_the_script_names_a_person(self):
        people = guards.person_names()
        authors = guards.catalogue_authors(guards.catalogue_checkout()) or set()
        pattern = guards.word_pattern(people | authors)
        self.assertIsNotNone(pattern, 'no names were read, so this checks nothing')
        for path in (os.path.abspath(__file__), os.path.join(ROOT, 'tools', 'reference_guards.py')):
            with open(path, encoding='utf-8') as handle:
                self.assertEqual(pattern.findall(handle.read()), [], path)


if __name__ == '__main__':
    unittest.main()
