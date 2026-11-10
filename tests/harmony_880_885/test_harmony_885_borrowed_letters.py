"""
Unit A's configuration with the letters it lacked borrowed in still passes the Harmony 885's start check.

Bench unit A's fonts lack some of the letters the test setup's names need, since a configuration holds only the
glyphs its own texts use (`reference/config-format/screens.md`), and the codec draws no letters of its own for this
model yet (R42). So the missing glyphs are copied in from other Harmony 880 and 885 configurations, and
`packages/codec/src/drawing/glyphborrow.ts` does it; `packages/codec/test/drawing/glyphborrow.test.ts` holds the
same face proof, the donor table, and that every glyph and text A had reads back unchanged. What that test cannot
hold is the remote's own verdict at start, since the check is read out of the firmware here, in Python:
`tests/harmony_880_885/test_harmony_885_start_check.py`'s `CheckAsRead`, which takes its cookie, markers, offsets and checksum
seeds from the 885 application 4.4's own instructions. A borrow inserts bytes, so it moves the end marker and the
checksum, and a container whose end address or checksum the codec restamped wrongly is shown a "Configuration
Corrupted" message and replaced by the built in configuration. This runs the codec's borrow on the same inputs as
the TypeScript test's borrow into unit A, in the same order (the order decides where each copy lands), through
node, and hands the result to that check. That the two runs produce the same bytes is not compared; their counts
of codes added and glyphs borrowed are.

**What it settles**: the borrowed container passes, its end address is where its length puts it, and it ends below
the staging region at `0x1D0000`, which the writer never touches. **The control**: one byte of the borrowed
container changed fails the check on its checksum, so the pass is the check's and not a check that passes
everything. **Not settled**: that the remote draws the borrowed letters, which is a bench question.

Arch 8, the Harmony 880 and 885: the check is the 885 application's, which the 880's runs too.
"""
import json
import os
import shutil
import subprocess
import tempfile
import unittest

import lab
from harmony import ezfile
from .test_harmony_885_start_check import CheckAsRead, Flash, USER_BASE, application

TARGET = 'h885_a_config'
# The donors in the TypeScript test's order, which decides which supplies a glyph when several hold it.
DONORS = ('h885_b_config', 'arch8_config_885', 'arch8_config_a', 'arch8_config_b', 'arch8_config_c',
          'arch8_config_d', 'arch8_config_880')
# The test setup's names and the three fonts they are drawn in, as in the TypeScript test.
NAMES = ('LG TV', 'Plasma', 'Denon', 'KPN', 'Kodi', 'Switch', 'Sony HT',
         'TV kijken', 'Film kijken', 'Muziek', 'Kodi kijken', 'Plasma kijken', 'Radio')
STAGING = 0x1D0000

NODE_PROBE = r'''
import { readFileSync, writeFileSync } from 'node:fs';
const [codecDir, wantsJson, out, target, ...donorArgs] = process.argv.slice(1);
// Letters are drawn from the font files, which the codec's Node resources supply.
await import(codecDir + '/support/resources.node.ts');
const { parse } = await import(codecDir + '/container/gspm.ts');
const { borrowGlyphs } = await import(codecDir + '/drawing/glyphborrow.ts');
const donors = [];
for (let k = 0; k < donorArgs.length; k += 2) {
  donors.push({ name: donorArgs[k], container: parse(new Uint8Array(readFileSync(donorArgs[k + 1]))) });
}
const result = borrowGlyphs(parse(new Uint8Array(readFileSync(target))), donors, JSON.parse(wantsJson));
writeFileSync(out, result.bytes);
console.log(JSON.stringify({ added: result.added, borrowed: result.borrowed.length }));
'''


def payload(name):
    """A configuration's container: the file itself for a read off a remote, the payload of a contributed EZHex."""
    blob = lab.load(name)
    return ezfile.parse_ezhex(blob, name).payload if lab.IMAGES[name].endswith('.EZHex') else blob


def borrowed():
    """Unit A's configuration with the letters borrowed in, by the codec, and what the codec reported."""
    if shutil.which('node') is None:
        raise unittest.SkipTest('no node on this machine, so the codec cannot be run')
    lab.require(TARGET, *DONORS)
    # In the order each letter first appears, as the TypeScript test's `new Set` gives them.
    letters = ''.join(dict.fromkeys(''.join(NAMES).replace(' ', '')))
    wants = [{'set': 0, 'characters': letters}, {'set': 2, 'characters': letters + 'qJY'},
             {'set': 3, 'characters': letters + 'qJY'}]
    codec = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'packages', 'codec', 'src')
    with tempfile.TemporaryDirectory() as directory:
        args = []
        for name in (TARGET,) + DONORS:
            path = os.path.join(directory, name + '.payload')
            with open(path, 'wb') as handle:
                handle.write(payload(name))
            args += ([path] if name == TARGET else [name, path])
        out = os.path.join(directory, 'borrowed.bin')
        run = subprocess.run(['node', '--input-type=module', '-e', NODE_PROBE, os.path.abspath(codec),
                              json.dumps(wants), out, *args], capture_output=True, text=True, check=True)
        with open(out, 'rb') as handle:
            return handle.read(), json.loads(run.stdout)


class TheBorrowedConfigurationPassesTheStartCheck(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.check = CheckAsRead(application())
        cls.bytes, cls.report = borrowed()

    def test_the_codec_borrowed_what_the_typescript_test_asserts(self):
        self.assertEqual(self.report, {'added': [['q', 74], ['Y', 75]], 'borrowed': 14})

    def test_it_passes_with_its_end_where_its_length_puts_it(self):
        original = payload(TARGET)
        self.assertGreater(len(self.bytes), len(original))
        self.assertEqual(self.check(Flash().place(USER_BASE, original), USER_BASE)[0], 'pass')
        verdict, end = self.check(Flash().place(USER_BASE, self.bytes), USER_BASE)
        self.assertEqual(verdict, 'pass')
        self.assertEqual(end, USER_BASE + len(self.bytes) - 4)
        self.assertLess(USER_BASE + len(self.bytes), STAGING)

    def test_and_one_byte_changed_fails_on_its_checksum(self):
        changed = bytearray(self.bytes)
        changed[0x1000] ^= 0x01
        self.assertEqual(self.check(Flash().place(USER_BASE, bytes(changed)), USER_BASE)[0], 'checksum')


if __name__ == '__main__':
    unittest.main()
