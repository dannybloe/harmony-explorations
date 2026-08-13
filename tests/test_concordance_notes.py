"""
Regression tests for `reference/concordance-notes.md`.

The note describes a defect in someone else's source tree, which makes it the claim in this
repository least able to defend itself: nothing here fails when concordance changes, and nothing
here failed when the note turned out to be scoped more narrowly than it was written. So these tests
read the constants straight out of a concordance checkout and assert what the note says about them.

The checkout is not part of the lab, because it is public source rather than anything proprietary.
It is looked for at `$CONCORDANCE_SRC`, then at a `concordance` directory alongside this repository,
and the tests skip when there is none. Skipping is declared up front rather than raised inside a
loop, for the reason CLAUDE.md gives: a skip inside `subTest` lets the loop finish and a later total
is then asserted against nothing.
"""
import os
import re
import unittest

import lab

_HERE = os.path.dirname(os.path.abspath(__file__))


def _find_source():
    """The concordance checkout, or None."""
    candidates = []
    if os.environ.get('CONCORDANCE_SRC'):
        candidates.append(os.environ['CONCORDANCE_SRC'])
    candidates.append(os.path.normpath(os.path.join(_HERE, '..', '..', 'concordance')))
    for path in candidates:
        if os.path.isfile(os.path.join(path, 'libconcord', 'remote_info.h')):
            return path
    return None


SRC = _find_source()
skipWithoutSource = unittest.skipUnless(
    SRC, 'no concordance checkout; set CONCORDANCE_SRC or clone one beside this repository')


def _read(*parts):
    with open(os.path.join(SRC, *parts), encoding='utf-8', errors='replace') as fh:
        return fh.read()


_REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _read_repo(*parts):
    """A file in this repository, so a test can check what a document tells a stranger to run."""
    with open(os.path.join(_REPO, *parts), encoding='utf-8') as fh:
        return fh.read()


# An architecture entry is a brace block introduced by a `/* arch N */` comment, and every field in
# it is a value followed by a trailing comment naming it. Reading the names rather than counting
# positions means an inserted field cannot silently shift what this test believes it is reading.
_ARCH = re.compile(r'/\*\s*arch\s+(\d+)[^*]*\*/\s*\{(.*?)\n\s*\},', re.S)
_FIELD = re.compile(r'^\s*([^,\n]+?)\s*,\s*//\s*(\w+)', re.M)


def _arch_table():
    """{arch number: {field name: value}}, numeric fields only."""
    table = {}
    for number, body in _ARCH.findall(_read('libconcord', 'remote_info.h')):
        fields = {}
        for value, name in _FIELD.findall(body):
            try:
                fields[name] = int(value, 0)
            except ValueError:
                pass  # SERIAL_LOCATION_*, micro and usb names: not what this test is about
        table[int(number)] = fields
    return table


@skipWithoutSource
class TestTheDumpReadsTheWrongRegion(unittest.TestCase):
    """The defect itself, which is a property of two architectures and not of the tool."""

    def setUp(self):
        self.arch = _arch_table()

    def test_the_two_dumps_differ_only_in_which_base_they_read(self):
        source = _read('libconcord', 'libconcord.cpp')
        safemode = re.search(r'int read_safemode_from_remote\(.*?\n\}', source, re.S).group(0)
        firmware = re.search(r'int read_firmware_from_remote\(.*?\n\}', source, re.S).group(0)
        self.assertIn('ri.arch->flash_base', safemode)
        self.assertIn('ri.arch->firmware_base', firmware)
        for body in (safemode, firmware):
            self.assertIn('FIRMWARE_MAX_SIZE', body, 'the size is fixed, not per architecture')

    def test_firmware_max_size_is_64_kib(self):
        self.assertIn('#define FIRMWARE_MAX_SIZE 64*1024', _read('libconcord', 'remote.h'))

    def test_arch_12_and_14_read_flash_zero_for_both_dumps(self):
        for number in (12, 14):
            entry = self.arch[number]
            self.assertEqual(entry['flash_base'], 0)
            self.assertEqual(entry['firmware_base'], 0,
                             'arch %d aims the firmware dump at the safe mode region' % number)

    def test_arch_12_reads_a_region_that_holds_no_application(self):
        # The application is at flash 0x020000 on the One, which the dump never reaches.
        self.assertEqual(self.arch[12]['config_base'], 0x040000)
        self.assertLess(self.arch[12]['firmware_base'] + 0x10000, 0x020000)

    def test_arch_14_reads_firmware_but_truncates_it(self):
        # Address zero is the firmware here, so the dump is code; it is the 64 KiB cap that bites,
        # against 70336 bytes on the 600 and 76672 on the 700.
        self.assertEqual(self.arch[14]['firmware_base'], 0)
        self.assertLess(self.arch[14]['firmware_base'] + 0x10000, 70336)


@skipWithoutSource
class TestTheDocumentedLongOptionForB(unittest.TestCase):
    """The help text and the man page name a long option the binary rejects."""

    def test_the_option_is_registered_as_binary(self):
        options = _read('concordance', 'concordance.c')
        self.assertIn('{"binary", no_argument, 0, \'b\'}', options)
        self.assertNotIn('{"binary-only"', options)

    def test_both_documents_call_it_binary_only(self):
        # Not a nitpick: it is what a contributor would copy, and getopt matches abbreviations
        # rather than extensions, so the documented spelling cannot resolve to the registered one.
        self.assertIn('--binary-only', _read('concordance', 'concordance.c'))
        self.assertIn(r'\-\-binary\-only', _read('concordance', 'concordance.1'))


@skipWithoutSource
class TestArch8And9DumpTheWholeFirmware(unittest.TestCase):
    """Why asking a stranger for `--dump-firmware` is worth doing on those two and not on ours."""

    def setUp(self):
        self.arch = _arch_table()

    def test_the_firmware_base_is_its_own_region(self):
        for number in (8, 9):
            entry = self.arch[number]
            self.assertNotEqual(entry['firmware_base'], entry['flash_base'],
                                'arch %d does not confuse the two dumps' % number)

    def test_the_region_is_exactly_the_64_kib_that_gets_read(self):
        # firmware_base to config_base is the whole firmware region, and it is 0x10000 on both, so
        # a FIRMWARE_MAX_SIZE read covers it with nothing left over and nothing truncated.
        for number in (8, 9):
            entry = self.arch[number]
            self.assertEqual(entry['config_base'] - entry['firmware_base'], 0x10000,
                             'arch %d firmware region' % number)

    def test_arch_8_addresses(self):
        entry = self.arch[8]
        self.assertEqual(entry['flash_base'], 0x000000)
        self.assertEqual(entry['firmware_base'], 0x010000)
        self.assertEqual(entry['config_base'], 0x020000)

    def test_arch_9_addresses(self):
        entry = self.arch[9]
        self.assertEqual(entry['flash_base'], 0x800000)
        self.assertEqual(entry['firmware_base'], 0x810000)
        self.assertEqual(entry['config_base'], 0x820000)

    def test_an_arch_8_firmware_dump_cannot_contain_the_serial(self):
        # The claim made when asking for a dump: the serial lives below the region that is read.
        entry = self.arch[8]
        self.assertEqual(entry['serial_address'], 0x000110)
        self.assertLess(entry['serial_address'], entry['firmware_base'])


@skipWithoutSource
class TestArch9KeepsItsFirmwareInExternalFlash(unittest.TestCase):
    """Section 118. The row that made a stranded 525 recoverable, and nothing here had read it.

    Asserted against the checkout rather than quoted, because the whole point of this file is that a
    claim about concordance's table is checked against concordance's table.
    """

    def test_the_arch_9_row_puts_firmware_at_its_own_base(self):
        arch9 = _arch_table()[9]
        self.assertEqual(arch9['flash_base'], 0x800000)
        self.assertEqual(arch9['firmware_base'], 0x810000)
        self.assertEqual(arch9['config_base'], 0x820000)
        # Equal to firmware_base, which is what selects concordance's first update branch and so
        # what makes flash 0x200000 the update state cell rather than RAM address 0.
        self.assertEqual(arch9['firmware_update_base'], arch9['firmware_base'])

    def test_the_hg_magic_offset_is_four_on_arch_9_as_on_arch_8(self):
        """
        Section 114 read the arch 8 header's magic at offset 4 and recorded that
        `firmware.parse_header` misreads it. The same offset is declared for arch 9, so the defect
        is not arch 8's alone and the note in section 114 understates its scope.
        """
        table = _arch_table()
        self.assertEqual(table[9]['firmware_4847_offset'], 4)
        self.assertEqual(table[8]['firmware_4847_offset'], 4)

    def test_the_dump_is_the_image_the_external_region_stages(self):
        """
        The measured half, from the dump alone: the internal application starts at 0x1000 and its
        header carries the `HG` magic at offset 4, which is what makes `external 0x810000 + N ==
        internal 0x1000 + N` a claim about the same image rather than about two coincidences. The
        live comparison is in the section.
        """
        lab.require('h525_code')
        code = lab.load('h525_code')
        self.assertEqual(code[0x1000 + 4:0x1000 + 6], b'HG')
        # And the region below is the bootloader, which safe mode leaves alone.
        self.assertNotEqual(code[0x0000:0x0002], b'\xff\xff')


@skipWithoutSource
class TestNoCommandLineDoesTheFinishStepAlone(unittest.TestCase):
    """Section 118. Asked whether `concordance` can run only the finalise step. It cannot.

    Asserted against the checkout because the answer is a property of concordance's source and the
    whole point of this file is not to quote that from memory. It matters because two steps of the
    full sequence would destroy exactly what makes a stranded arch 9 remote recoverable.
    """

    def test_no_cli_mode_reaches_finish_firmware(self):
        cli = _read('concordance', 'concordance.c')
        self.assertIn('update_firmware(', cli)
        # The finalise step is never invoked on its own from the command line, so the only route to
        # it is the library. If a later concordance grows such a mode, this fails and the section
        # needs rewriting rather than quietly going stale.
        self.assertNotIn('finish_firmware(', cli)
        self.assertNotIn('prep_firmware(', cli)

    def test_the_full_sequence_erases_the_region_that_holds_the_good_image(self):
        """Which is why the full sequence is the wrong tool when the staged image is already right."""
        lib = _read('libconcord', 'libconcord.cpp')
        sequence = lib[lib.index('int update_firmware('):]
        sequence = sequence[:sequence.index('\n}')]
        for step in ('prep_firmware', 'invalidate_flash', 'erase_firmware',
                     'write_firmware_to_remote', 'finish_firmware'):
            with self.subTest(step=step):
                self.assertIn(step, sequence)

    def test_the_finish_step_is_exported_so_the_library_reaches_it(self):
        header = _read('libconcord', 'libconcord.h')
        for symbol in ('init_concord', 'get_identity', 'finish_firmware', 'deinit_concord'):
            with self.subTest(symbol=symbol):
                self.assertIn(symbol, header)

    def test_a_raw_image_is_not_an_acceptable_firmware_file(self):
        """
        So the documented `--firmware` route cannot be pointed at a dump. The parser wants a zip or
        an XML envelope, which is why the section says a package would have to be fabricated.
        """
        opfile = _read('libconcord', 'operationfile.cpp')
        self.assertIn('ReadZipFile', opfile)
        self.assertIn('INFORMATION', opfile)

    def test_an_arch_9_config_survives_a_firmware_update(self):
        """
        concordance's own rule, and it is the reassuring half: the two bases differ on arch 9, so a
        firmware update there does not take the config with it.
        """
        arch9 = _arch_table()[9]
        self.assertNotEqual(arch9['firmware_update_base'], arch9['config_base'])

    def test_the_progress_callback_is_not_optional_because_one_call_site_is_unguarded(self):
        """
        The correction. Section 118 said the callbacks are optional on the strength of every `cb` use
        in `remote.cpp` being guarded by `if (cb)`, and they all are. `_report_stages` is in
        `libconcord.cpp` and is not, so a caller passing NULL segfaults inside `get_identity`, which
        is what happened on 11 August 2026.

        Asserted both ways round, because the interesting part is the disagreement between the two
        files: the guard the reading was based on is real, and it is not where the crash is.
        """
        lib = _read('libconcord', 'libconcord.cpp')
        body = lib[lib.index('void _report_stages('):]
        body = body[:body.index('\n}')]
        self.assertIn('cb(LC_CB_STAGE_NUM_STAGES', body)
        self.assertNotIn('if (cb)', body)
        # And `get_identity` reaches it, so it is the first call a ctypes caller makes and the first
        # one that can die.
        identity = lib[lib.index('int get_identity('):]
        identity = identity[:identity.index('\n}')]
        self.assertIn('_report_stages(', identity)

    def test_the_guard_that_justified_the_wrong_claim_really_is_there(self):
        """
        The other half, and the reason this is a scoping error rather than a misreading: every `cb`
        use in `FinishFirmware` is guarded, so the reading was correct about the file it read.
        """
        remote = _read('libconcord', 'remote.cpp')
        body = remote[remote.index('int CRemote::FinishFirmware('):]
        body = body[:body.index('\n}\n')]
        self.assertGreater(body.count('cb('), 1)
        # **Adjacency, which a count cannot state.** This asserted `body.count('if (cb)') ==
        # body.count('cb(cb_stage')`, and equal counts say nothing about where they are: a refactor
        # that guards four of five calls and adds an `if (cb)` somewhere else keeps them equal, and the
        # unguarded call is exactly the segfault this test exists for. So each call is required to have
        # nothing but whitespace between it and its own guard.
        calls = [m.start() for m in re.finditer(r'cb\(cb_stage', body)]
        self.assertEqual(len(calls), 5, 'the call sites moved, so check this still fits')
        for at in calls:
            before = body[:at]
            guard = before.rfind('if (cb)')
            self.assertNotEqual(guard, -1, 'a cb(cb_stage call with no guard anywhere above it')
            between = before[guard + len('if (cb)'):]
            self.assertEqual(between.strip(), '',
                             'a cb(cb_stage call whose nearest guard is not its own: %r' % between)

    def test_the_arch_9_finish_step_writes_one_byte_of_0x02(self):
        """
        What the write actually is, quoted from the source rather than from concordance's table. The
        branch is taken on arch 9 because its two bases are equal, which the row above asserts.
        """
        remote = _read('libconcord', 'remote.cpp')
        body = remote[remote.index('int CRemote::FinishFirmware('):]
        body = body[:body.index('\n}\n')]
        self.assertIn('ri.arch->firmware_update_base == ri.arch->firmware_base', body)
        self.assertIn('data[0] = 0x02', body)
        self.assertIn('WriteFlash(0x200000, 1, data', body)
        arch9 = _arch_table()[9]
        self.assertEqual(arch9['firmware_update_base'], arch9['firmware_base'])


class TestTheFrontPageOnlyTellsStrangersToRead(unittest.TestCase):
    """The command block in `README.md` is the one text here a stranger copies onto their own remote.

    **No lab and no concordance checkout needed**, deliberately: this is the assertion that has to run
    in a fresh clone, because the harm it prevents lands on somebody else's irreplaceable device.

    concordance's read and write modes differ by one shift key. `-c` dumps the config and `-C` writes
    one; `-f` dumps the firmware and `-F` overwrites it. It also has an automatic mode, where a bare
    filename with no flag at all makes it work out what to do, and for a config that means writing it
    to the remote. So a helpful edit to the front page could turn an instruction to read into an
    instruction to reflash, and nothing else in this repository would notice: `make prose` checks
    punctuation and `tools/facts.py` checks numbers and dead phrasings.
    """

    # Everything that only reads, plus the two that print and exit. `-s` dumps safe mode, which is a
    # read even though what it returns is mislabelled on arch 8.
    READ_ONLY = frozenset('-c -i -f -b -s -v -w -k -V -h'.split())
    # Named rather than inferred, so the message says which one was found.
    WRITES = {
        '-C': 'writes a config to the remote',
        '-F': 'overwrites the remote firmware',
        '-K': 'sets the remote clock',
        '-r': 'reboots the remote',
        '-R': 'suppresses the reboot after a write, so it implies one',
        '-l': 'starts a learn session, which writes to the remote',
        '-t': 'runs a connectivity test, which writes',
    }

    def _invocations(self):
        """Every concordance command line inside a fenced block in `README.md`."""
        text = _read_repo('README.md')
        fenced = re.findall(r'```[a-z]*\n(.*?)```', text, re.S)
        out = []
        for block in fenced:
            for line in block.splitlines():
                bare = line.split('#')[0].strip()
                if bare.startswith('concordance'):
                    out.append(bare)
        return out

    def test_the_front_page_does_invoke_concordance(self):
        # Without this the rest passes vacuously the moment somebody reformats the section.
        self.assertGreaterEqual(len(self._invocations()), 2, self._invocations())

    def test_every_flag_on_the_front_page_only_reads(self):
        for line in self._invocations():
            with self.subTest(line=line):
                for token in line.split()[1:]:
                    if token.startswith('>'):
                        break
                    if not token.startswith('-'):
                        continue
                    self.assertNotIn(token, self.WRITES,
                                     '%s %s' % (token, self.WRITES.get(token, '')))
                    self.assertIn(token, self.READ_ONLY, '%s is not a known read flag' % token)

    def test_no_invocation_passes_a_bare_filename(self):
        # Automatic mode. `concordance <file>` with no flag decides for itself what the file is for,
        # and for a config that is a write to the remote.
        for line in self._invocations():
            with self.subTest(line=line):
                tokens = line.split()[1:]
                for index, token in enumerate(tokens):
                    if token.startswith('>'):
                        break
                    if token.startswith('-'):
                        continue
                    # An argument to a flag that takes one is fine; a first bare token is not.
                    self.assertTrue(index > 0 and tokens[index - 1].startswith('-'),
                                    'bare filename in: %s' % line)

    def test_the_long_form_of_b_is_not_used_on_the_front_page(self):
        # Because concordance's own help documents `--binary-only` and its getopt registers `binary`,
        # per the test above. The short form is the only spelling that works everywhere.
        self.assertNotIn('--binary-only', _read_repo('README.md'))


if __name__ == '__main__':
    unittest.main()
