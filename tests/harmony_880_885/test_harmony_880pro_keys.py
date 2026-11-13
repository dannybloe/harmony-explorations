"""
Which printed key of a Harmony 880 Pro raises which scan code, measured on a contributed unit.

**Measured on a unit, not ours.** A contributor ran the key page, `reference/key-reader/`, on their own Harmony
880 Pro and sent the page's report, which the lab holds as `h880pro_contributed_keys`. The page asks for each
key by name, keeps the code the remote reports while it is held, and then asks for every key again to confirm
the map. The remote reported skin 39 and firmware 4.4. 54 keys were asked and 54 confirmed. **Glow is never
asked**, because pressing it while the page reads the keys drops the connection on this platform, so Glow
carries no code on the 880 Pro's drawing.

**Sources checked before the work**: `reference/remotes/harmony-885/keys.md`, whose 880 Pro section said no key
carries a code, since one configuration of the model is known and the rule that names a key from
configurations asks for two; `tests/harmony_880_885/test_harmony_885_keys.py`, the 885's codes measured on two
bench units, and its finding that the 880 Pro's application carries the 885's key routines byte for byte;
`packages/silhouettes/src/models/h880pro.ts`, which places each of the 880 Pro's keys on the 885 key it
replaces. Logitech's clients hold no key map, decision 2, so the firmware and units are the only sources.

## The closure

The codes are read off the contributor's remote. What they are held against is independent of it: **the scan
code the bench Harmony 885 raised for the key in the same place**, with the drawing deciding which 885 key
each 880 Pro key replaces. All 54 agree, the six keys the 880 Pro prints differently among them: `SOUND` and
`PICTURE` raise the codes of the 885's `MUTE` and `PREV`, and the four keys at the foot of the band, `MUTE`,
the two triangles and `PREV`, raise the codes of the 885's Red, Green, Yellow and Blue. So a key raises the
code of its place on this platform, and its printing does not move it. Logitech's one compile for an 880 Pro
had already named Mute on 20, the 885's Red, `tests/harmony_880_885/test_harmony_880_keys.py`; the unit agrees.

**Scope.** One unit of the 880 Pro, read by its owner. The 880 and the 885 are not covered by it, and the
Harmony 890 Pro, whose face is the same, is another architecture, so its drawing keeps no code.
"""
import os
import re
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
import lab  # noqa: E402

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')

#: Every key the page asked for, under the drawing's names, and the code the remote raised for it.
MEASURED = {
    'AllOff': 2, 'Activities': 1, 'Help': 3,
    'ScreenLeft1': 5, 'ScreenRight1': 45, 'ScreenLeft2': 6, 'ScreenRight2': 46,
    'ScreenLeft3': 7, 'ScreenRight3': 48, 'ScreenLeft4': 8, 'ScreenRight4': 44,
    'ScreenPrev': 12, 'ScreenNext': 43,
    'Sound': 11, 'Device': 10, 'Media': 38, 'Picture': 40,
    'VolumeUp': 13, 'DirectionUp': 16, 'ChannelUp': 37, 'DirectionLeft': 14, 'Select': 33,
    'DirectionRight': 35, 'VolumeDown': 15, 'DirectionDown': 34, 'ChannelDown': 36,
    'VolumeMute': 20, 'DownArrow': 19, 'UpArrow': 60, 'PrevChannel': 52,
    'Menu': 17, 'Exit': 18, 'Guide': 50, 'Info': 51,
    'Stop': 21, 'SkipBack': 24, 'SkipForward': 53, 'Play': 56, 'Record': 22, 'Rewind': 23,
    'FastForward': 54, 'Pause': 55,
    'Number1': 25, 'Number2': 57, 'Number3': 58, 'Number4': 26, 'Number5': 61, 'Number6': 59,
    'Number7': 29, 'Number8': 27, 'Number9': 62, 'Clear': 31, 'Number0': 32, 'Enter': 63,
}

#: The six keys the 880 Pro prints otherwise, by the 885 key whose place each takes, as `h880pro.ts` draws them.
PLACE_ON_885 = {
    'Sound': 'VolumeMute', 'Picture': 'PrevChannel',
    'VolumeMute': 'Red', 'DownArrow': 'Green', 'UpArrow': 'Yellow', 'PrevChannel': 'Blue',
}

KEY_LINE = re.compile(r'^(\w+) \(.*\): (\d+)$')
SVG_KEY = re.compile(r'<g class="key-group" [^>]*data-name="(\w+)"[^>]*>')
SVG_SCAN = re.compile(r'data-scan="(\d+)"')


def report():
    """(the header lines, {name: code}) of the key page's report."""
    text = lab.load('h880pro_contributed_keys').decode('utf-8')
    head, _, rest = text.partition('keys, in the order asked:')
    asked, _, tail = rest.partition('presses that did not fit:')
    keys = {}
    for line in asked.splitlines():
        m = KEY_LINE.match(line.strip())
        if m:
            keys[m.group(1)] = int(m.group(2))
    return head + tail, keys


def drawn(svg):
    """{name: code or None} of every key in a generated drawing."""
    with open(os.path.join(ROOT, 'reference', 'silhouettes', svg), encoding='utf-8') as f:
        text = f.read()
    out = {}
    for m in SVG_KEY.finditer(text):
        scan = SVG_SCAN.search(m.group(0))
        out[m.group(1)] = int(scan.group(1)) if scan else None
    return out


def codes_885():
    """The 885 drawing's codes by key name, the table `h885.ts` holds to the bench units' measurement."""
    with open(os.path.join(ROOT, 'packages', 'silhouettes', 'src', 'models', 'h885.ts'), encoding='utf-8') as f:
        source = f.read()
    body = source[source.index('const CODES'):]
    body = body[:body.index('};')]
    return {k: int(v) for k, v in re.findall(r'(\w+): (\d+)', body)}


class TheContributedKeyDump(unittest.TestCase):

    def setUp(self):
        lab.require('h880pro_contributed_keys')

    def test_the_page_read_an_880_pro_on_skin_39_and_firmware_4_4(self):
        head, _ = report()
        self.assertIn('model chosen: Harmony 880 Pro', head)
        self.assertIn('remote reported: Harmony 880 Pro, skin 39, firmware 4.4', head)

    def test_every_key_asked_raised_the_measured_code(self):
        _, keys = report()
        self.assertEqual(keys, MEASURED)

    def test_the_second_pass_confirmed_all_54_and_found_no_other_code(self):
        head, _ = report()
        self.assertIn('key map check: 54 of 54 learned keys confirmed', head)
        self.assertIn('key map check, codes the map does not have: none', head)

    def test_glow_was_never_asked(self):
        _, keys = report()
        self.assertNotIn('Glow', keys)


class TheCodesAreThe885sByPlace(unittest.TestCase):

    def test_every_key_raises_the_code_of_the_885_key_in_its_place(self):
        bench = codes_885()
        self.assertEqual({n: bench[PLACE_ON_885.get(n, n)] for n in MEASURED}, MEASURED)

    def test_the_six_printed_otherwise_are_the_ones_whose_885_name_differs(self):
        bench = codes_885()
        moved = {n for n in MEASURED if n in bench and bench[n] != MEASURED[n]}
        self.assertEqual(moved, {'VolumeMute', 'PrevChannel'})
        self.assertEqual(set(MEASURED) - set(bench), {'Sound', 'Picture', 'DownArrow', 'UpArrow'})

    def test_the_54_codes_are_the_885s_55_without_glow(self):
        bench = codes_885()
        self.assertEqual(sorted(MEASURED.values()), sorted(c for n, c in bench.items() if n != 'Glow'))


class TheDrawing(unittest.TestCase):

    def test_the_880_pro_drawing_carries_exactly_these_codes_and_glow_none(self):
        keys = drawn('h880pro.svg')
        self.assertEqual(len(keys), 55)
        self.assertEqual({n: c for n, c in keys.items() if c is not None}, MEASURED)
        self.assertIsNone(keys['Glow'])

    def test_the_890_pro_drawing_carries_no_code(self):
        keys = drawn('h890pro.svg')
        self.assertEqual(len(keys), 55)
        self.assertEqual([n for n, c in keys.items() if c is not None], [])


if __name__ == '__main__':
    unittest.main()
