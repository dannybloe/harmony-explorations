"""
The button silhouettes in `reference/silhouettes/`, checked against what the firmware says.

These are drawings, so the temptation is to treat them as decoration and not test them. They are not
decoration: a silhouette is the physical button map in executable form, and the map is an open item in
`docs/findings.md`. So the count has to agree with the count derived from the firmware, and a shape
must not claim a scan code that nothing has established.

**No lab needed.** The files are our own work and live in the repository, so these run in a fresh
clone, which is deliberate: the assertion that costs nothing should be the one that always runs.
"""
import os
import re
import unittest
import xml.etree.ElementTree as ET

_HERE = os.path.dirname(os.path.abspath(__file__))
SILHOUETTES = os.path.normpath(os.path.join(_HERE, '..', 'reference', 'silhouettes'))

SVG = '{http://www.w3.org/2000/svg}'


def _tree(name):
    return ET.parse(os.path.join(SILHOUETTES, name))


def _buttons(root):
    """Every shape that stands for a button.

    Keyed on an `id` beginning `k-`, and `k-pad` is excluded by name because it is the bezel drawn
    around the direction pad rather than a button. That exclusion is stated here rather than left to
    a reader of the file, since a silent one would make the count wrong by one in the safe direction,
    which is the hardest kind to notice.
    """
    out = {}
    for element in root.iter():
        ident = element.get('id')
        if ident and ident.startswith('k-') and ident != 'k-pad':
            out[ident] = element
    return out


class TestTheHarmony525Silhouette(unittest.TestCase):
    """Section 89 counted fifty matrix buttons before anything was drawn. The drawing has to agree."""

    NAME = 'h525.svg'
    # Section 89: fifty scan codes, bound by both of the 525's configs, none a multiple of eight and
    # contiguous in the resulting lattice to 57. The one architecture where every matrix button is
    # bound and every bound code has a button.
    EXPECTED_BUTTONS = 50
    # The four soft keys' codes, as a set. Section 119's capability table records why they matter: the
    # 5xx has no page button, so these carry the mode switches.
    SOFT_KEY_CODES = {'30', '31', '38', '39'}

    def test_the_drawing_has_the_fifty_buttons_the_firmware_implies(self):
        buttons = _buttons(_tree(self.NAME).getroot())
        self.assertEqual(len(buttons), self.EXPECTED_BUTTONS)

    def test_no_button_is_drawn_twice(self):
        """
        The failure a hand drawing actually has. A duplicated id would leave the count right and make
        one button unaddressable, so this counts the raw ids rather than the dictionary the loop
        builds.
        """
        raw = re.findall(r'id="(k-[^"]+)"', open(os.path.join(SILHOUETTES, self.NAME)).read())
        self.assertEqual(len(raw), len(set(raw)))

    def test_the_four_soft_keys_carry_the_candidate_set_and_not_a_guess(self):
        """
        The assignment inside the block is open, because nothing here establishes which of columns 6
        and 7 is the left one. So all four carry the same candidate list. A file that had picked one
        would pass every other test in here while telling a user interface something false.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        soft = {k: v for k, v in buttons.items() if k.startswith('k-soft-')}
        self.assertEqual(len(soft), 4)
        for name, element in soft.items():
            with self.subTest(button=name):
                candidates = element.get('data-scan-candidates')
                self.assertIsNotNone(candidates, 'a soft key states its candidates')
                self.assertEqual(set(candidates.split()), self.SOFT_KEY_CODES)
                # And it must not also claim a single code, which would be the guess this avoids.
                self.assertIsNone(element.get('data-scan'))

    def test_each_soft_key_names_the_screen_zone_beside_it(self):
        """
        The one thing about them that is not open: four buttons flanking four zones, which is what
        makes this remote's screen navigable with no touch panel. The zones are 1 to 4 and each is
        claimed exactly once.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        zones = [e.get('data-zone') for k, e in buttons.items() if k.startswith('k-soft-')]
        self.assertEqual(sorted(zones), ['1', '2', '3', '4'])

    def test_nothing_claims_a_scan_code_yet(self):
        """
        The honest state of the button map, asserted so that filling one in has to be a deliberate
        change with a measurement behind it. Section 48: a remote on USB never runs its keypad
        handler, so no read path here can produce these.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        claimed = {k: e.get('data-scan') for k, e in buttons.items() if e.get('data-scan')}
        self.assertEqual(claimed, {})

    def test_it_is_outline_only_so_it_takes_the_viewer_s_colour(self):
        """
        The drawing convention, which is a requirement rather than taste: a filled or grey shape is
        wrong in one of the two themes, and a hard coded colour is wrong in both.
        """
        text = open(os.path.join(SILHOUETTES, self.NAME)).read()
        self.assertIn('currentColor', text)
        # No fills but `none`, and no grey. Checked as a refusal on the style block rather than by
        # inspecting each shape, since the shapes take their fill from a class.
        for forbidden in ('fill: grey', 'fill: gray', 'fill: #', 'fill="#'):
            self.assertNotIn(forbidden, text)

    def test_it_is_valid_xml_and_names_itself_for_a_screen_reader(self):
        root = _tree(self.NAME).getroot()
        self.assertEqual(root.tag, f'{SVG}svg')
        self.assertIsNotNone(root.find(f'{SVG}title'))
        self.assertIsNotNone(root.find(f'{SVG}desc'))
        self.assertEqual(root.get('role'), 'img')


class TestTheSilhouetteDirectory(unittest.TestCase):
    """What is drawn and what is not, so the gap is a statement rather than an oversight."""

    def test_every_file_is_an_svg_and_none_is_a_photograph(self):
        """
        The rail this directory exists to keep. A product photograph is third party and unpublishable,
        `../lab/reference/forum-images/PROVENANCE.md`, and the whole point of drawing is that our own
        geometry carries no such problem. So a raster file here would be the thing that undoes it.
        """
        for name in os.listdir(SILHOUETTES):
            with self.subTest(file=name):
                self.assertTrue(name.endswith('.svg'), f'{name} is a drawing')

    def test_the_bench_remotes_are_the_ones_worth_drawing_first(self):
        """
        Three remotes can be checked against by looking at them. The 525 is drawn; the other two are
        not, and this records that rather than leaving it to be discovered.
        """
        drawn = set(os.listdir(SILHOUETTES))
        self.assertIn('h525.svg', drawn)
        undrawn = [n for n in ('one.svg', 'h600.svg') if n not in drawn]
        self.assertEqual(sorted(undrawn), ['h600.svg', 'one.svg'],
                         'when one of these is drawn, this test is what says so')
