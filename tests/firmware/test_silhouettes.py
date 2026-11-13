"""
The button silhouettes in `reference/silhouettes/`, checked against what the firmware says.

These are drawings, so the temptation is to treat them as decoration and not test them. They are not
decoration: a silhouette is the physical button map in executable form, and the map is an open item in
`docs/findings.md`. So the count has to agree with the count derived from the firmware, and a shape
must not claim a scan code that nothing has established.

**No lab needed.** The files are our own work and live in the repository, so these run in a fresh
clone, which is deliberate: the assertion that costs nothing should be the one that always runs.

**Two kinds of drawing live here now, and the difference is stated rather than left to be noticed.**
`h600.svg` is **generated** from the measured geometry in `packages/silhouettes`, and the rest are
still hand written until they are redrawn. A generated file is edited by changing the geometry and
running `make silhouettes`; a hand edit to one fails a test in that package. What that changed for the
checks below is how a colour is declared, not whether one may be there, so the claims are rewritten
rather than dropped.

**The conventions are asserted once, in a mixin, and not once per drawing.** Three drawings each
carrying its own copy of the same four checks is the state `CLAUDE.md` warns about for the opcode
table: two right copies is what precedes two diverging ones, and no test can see the drift. So
`_SilhouetteConventions` holds everything true of every drawing and a per model class holds only what
is true of that model. Inherited tests are still reported under the subclass, so `-v` names every
drawing for every convention.
"""
import os
import re
import unittest
import xml.etree.ElementTree as ET

from reference_keys import generated_keys
from proves import proves

_HERE = os.path.dirname(os.path.abspath(__file__))
SILHOUETTES = os.path.normpath(os.path.join(_HERE, '..', '..', 'reference', 'silhouettes'))

SVG = '{http://www.w3.org/2000/svg}'

# The model folder whose keys page states each drawing's scan codes, and the block where it is not `keys`.
# The Harmony 650's and 700's drawings take the 600's codes and their own pages carry the same generated
# block; the Harmony 300's European printing has a block of its own beside the US one's, and so have the
# Harmony 880 and 880 Pro beside the 885's. The Harmony 890 Pro's drawing is its folder's, the 890's.
KEYS_PAGE = {
    'h300.svg': 'harmony-300', 'h300eu.svg': ('harmony-300', 'keys-h300eu'), 'h350.svg': 'harmony-350',
    'h515.svg': 'harmony-515', 'h525.svg': 'harmony-525',
    'h600.svg': 'harmony-600', 'h650.svg': 'harmony-650', 'h700.svg': 'harmony-700', 'h885.svg': 'harmony-885',
    'h880.svg': ('harmony-885', 'keys-h880'), 'h880pro.svg': ('harmony-885', 'keys-h880pro'),
    'h890pro.svg': 'harmony-890', 'h720.svg': 'harmony-720', 'h785.svg': 'harmony-785',
    'one.svg': 'harmony-one', 'touch.svg': 'harmony-touch',
}

# The one palette, and the only fills any drawing may declare. A teletext key is the single case where
# the colour is the button's identity rather than decoration: four identical outlined shapes would
# throw away the only thing that tells one from another. Everything else stays `currentColor`, so it
# reads in a light theme and a dark one.
PALETTE = {
    'k-red': ('c-red', '#d23c3c'),
    'k-green': ('c-green', '#2f9e44'),
    'k-yellow': ('c-yellow', '#d9c22b'),
    'k-blue': ('c-blue', '#3b6fd4'),
}

# Shapes that are not buttons even though a reader might take them for one. See `_buttons`.
NOT_BUTTONS = frozenset({'k-pad', 'panel-recess', 'screen-bezel', 'base-cap'})


def _text(name):
    with open(os.path.join(SILHOUETTES, name)) as handle:
        return handle.read()


def _tree(name):
    return ET.parse(os.path.join(SILHOUETTES, name))


def _centre_x(button):
    """Where a key's symbol sits across the face: the x of the `translate` that places its mark on the key."""
    for element in button.iter():
        found = re.match(r'translate\(([-\d.]+) ', element.get('transform', ''))
        if found:
            return float(found.group(1))
    raise ValueError('%s carries no placed mark' % button.get('id'))


def _buttons(root):
    """Every shape that stands for a button.

    Keyed on an `id` beginning `k-`, and `k-pad` is excluded by name because it is the bezel drawn
    around the direction pad rather than a button. That exclusion is stated here rather than left to
    a reader of the file, since a silent one would make the count wrong by one in the safe direction,
    which is the hardest kind to notice.

    `NOT_BUTTONS` is that list. It holds `k-pad` and, belt and braces, the ids of the face regions the
    drawings outline: `panel-recess` is the 525's recessed black bay, `screen-bezel` is the 600's black
    surround, and `base-cap` is the seam where the One's case turns to chrome below the keypad. Those
    three already fail the `k-` test, so naming them here is redundant twice over, and that is the
    point: a rename that accidentally gave a region a `k-` prefix would otherwise promote a piece of
    trim to a button and inflate the count by one, silently.

    Adding a genuinely new exclusion is how a count quietly stops meaning anything, so a new non
    button shape gets no `k-` id at all instead. The screens, the zone guides and the `mark` icons all
    follow that rule.
    """
    out = {}
    for element in root.iter():
        ident = element.get('id')
        if ident and ident.startswith('k-') and ident not in NOT_BUTTONS:
            out[ident] = element
    return out


class _SilhouetteConventions:
    """What is true of every drawing, whichever model it is.

    A subclass sets `NAME` and `EXPECTED_BUTTONS` and inherits the rest. It is not itself a
    `TestCase`, so these run only against a drawing that a subclass names.
    """

    NAME = None
    EXPECTED_BUTTONS = None

    def test_the_drawing_has_the_number_of_buttons_its_class_claims(self):
        """
        The assertion the whole directory exists for. Counted programmatically out of the finished
        file, never by eye: `CLAUDE.md` records a hand count of infrared codes that came out 107/55
        where the answer was 108/54, and a drawing is exactly as easy to miscount.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        self.assertEqual(len(buttons), self.EXPECTED_BUTTONS)

    def test_no_button_is_drawn_twice(self):
        """
        The failure a hand drawing actually has. A duplicated id would leave the count right and make
        one button unaddressable, so this counts the raw ids rather than the dictionary the loop
        builds.
        """
        raw = re.findall(r'id="(k-[^"]+)"', _text(self.NAME))
        self.assertEqual(len(raw), len(set(raw)))

    def test_a_scan_code_appears_only_where_the_reference_states_it(self):
        """
        This said **nothing** may claim a scan code, and that was true when it was written and is not
        now. Section 133 named 32 of a Harmony One's 44 keys and 36 of a Harmony 600's 54, by decoding
        what each scan sends and looking the frame up in the command catalogue of the account that
        generated the config; the devices' own maps decided the four arrow keys of each, sections 323 and
        398; and the Harmony One's touch hit map and the Harmony 600's Help give three more, sections 125
        and 333.

        So the claim becomes the one that still bites: a code is here **only** if the model's keys page
        states it, with the archive section behind it as a footnote, and every code the page states is
        here. Both come from the drawing's data, the page through `make remote-reference` and this file
        through `make silhouettes`, so the test catches either one left behind. It read
        `reference/button-maps.md` until plan 009's step 3.3 moved those codes into the drawings. A drawing
        that names none still passes, which is right for the Harmony 525, where the route needs a config
        Logitech compiled for us and no such config exists for that model.

        Section 48 is still why this cannot be finished from hardware: a remote on USB never runs its
        keypad handler, and arch 12 (Harmony One) would not give up a column even if it did.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        claimed = {e.get('data-name'): int(e.get('data-scan'))
                   for e in buttons.values() if e.get('data-scan')}
        page = KEYS_PAGE[self.NAME]
        page = page if isinstance(page, tuple) else (page,)
        stated = {name: row[2] for name, row in generated_keys(*page).items() if row[2] is not None}
        self.assertEqual(claimed, stated)
        for name, (_, _, scan, section) in generated_keys(*page).items():
            if scan is not None:
                with self.subTest(button=name):
                    self.assertIsNotNone(section, f'{name} states scan {scan} with no section behind it')
        # And no code is claimed twice, which would make one key unreachable by code.
        self.assertEqual(len(set(claimed.values())), len(claimed))

    def test_no_colour_is_placed_beyond_the_interface_s_reach(self):
        """
        What "outline only" was really protecting, restated now that a drawing has fills.

        This asserted `currentColor` and no fill at all, and the requirement changed under it: the
        interface has to colour a key to show which device it drives, so a key has a fill. The claim
        that survives is the one that mattered, that **no colour is placed where the host cannot
        replace it**. Two spellings satisfy it. A hand written drawing uses `currentColor`, so the page
        decides. A generated one declares every colour through a custom property with the literal as a
        fallback, which is also why the same literal appears as a presentation attribute: librsvg drops
        a declaration it cannot parse, and without the attribute the whole drawing rendered black.

        Grey stays refused in every form, because grey was never information.
        """
        text = _text(self.NAME)
        self.assertTrue('currentColor' in text or 'var(--' in text,
                        'every colour has to come from somewhere the host can set')
        for forbidden in ('fill: grey', 'fill: gray', 'fill="grey"', 'fill="gray"'):
            self.assertNotIn(forbidden, text)

    def test_only_the_teletext_colour_keys_carry_a_fill(self):
        """
        The precise form of "outline only", and it has to stay precise rather than become a permission.

        Written as a rule about which shapes may be coloured, not as a requirement that any are, so a
        drawing of a remote with no teletext keys passes it unchanged. What it refuses is a later
        drawing quietly filling something else: every `fill:` with a hex value in the file has to come
        from one of the four palette rules, each rule has to carry the palette's own value, and a
        `k-` shape may only wear the class that belongs to its own id. Inline fills are refused
        outright, since a fill declared on a shape is a fill no style block audit would see.
        """
        text = _text(self.NAME)
        buttons = _buttons(_tree(self.NAME).getroot())
        generated = 'GENERATED FILE' in text

        for ident, element in buttons.items():
            classes = set((element.get('class') or '').split())
            coloured = {c for c in classes if c.startswith('c-')}
            with self.subTest(button=ident):
                if generated:
                    # A generated drawing states a key's own colour as `--accent` on the marking, so
                    # the key's fill stays free for the interface. The palette classes do not exist
                    # there, and the group is what carries the identity.
                    continue
                self.assertIsNone(element.get('fill'),
                                  'a fill comes from a class, never from an attribute')
                if ident in PALETTE:
                    expected, _ = PALETTE[ident]
                    self.assertEqual(coloured, {expected})
                    self.assertIn('key-colour', classes,
                                  'a filled key keeps its currentColor stroke as well')
                else:
                    self.assertEqual(coloured, set(),
                                     'only a teletext key may be coloured')

        if generated:
            # The same claim, in the spelling a generated drawing uses: the only colours in the file
            # beyond the palette of defaults are the four the colour keys state for themselves.
            # The per key form only. `--accent` is also declared once as the palette's default, which
            # is where the record dot's red comes from, and that is not a key stating a colour.
            stated = re.findall(r'style="--accent:\s*(#[0-9a-fA-F]{6})"', text)
            # Per model, not the whole palette: a Harmony One has no teletext keys at all, so the
            # right expectation there is none, and asserting the four everywhere made a correct
            # drawing fail. What the claim is really about is that nothing **else** states one.
            present = sorted(colour for ident, (_, colour) in PALETTE.items()
                             if f'id="{ident}"' in text)
            self.assertEqual(sorted(stated), present,
                             'a stated accent has spread beyond the colour keys this model has')
            return

        used = {c for e in buttons.values() for c in (e.get('class') or '').split()
                if c.startswith('c-')}
        declared = dict(re.findall(r'\.(c-[a-z]+)\s*\{\s*fill:\s*(#[0-9a-fA-F]{6});\s*\}', text))
        self.assertEqual(set(declared), used, 'a palette rule exists if and only if a key uses it')
        for name, value in declared.items():
            with self.subTest(rule=name):
                self.assertEqual(value, dict(PALETTE.values())[name])
        self.assertEqual(len(re.findall(r'fill:\s*#', text)), len(declared),
                         'the palette rules are the only hex fills in the file')
        self.assertNotIn('fill="#', text)

    def test_it_is_valid_xml_and_names_itself_for_a_screen_reader(self):
        root = _tree(self.NAME).getroot()
        self.assertEqual(root.tag, f'{SVG}svg')
        self.assertIsNotNone(root.find(f'{SVG}title'))
        self.assertIsNotNone(root.find(f'{SVG}desc'))
        self.assertEqual(root.get('role'), 'img')


class TestTheHarmony525Silhouette(_SilhouetteConventions, unittest.TestCase):
    """Section 89 counted fifty matrix buttons before anything was drawn. The drawing has to agree."""

    NAME = 'h525.svg'
    # Section 89: fifty scan codes, bound by both of the 525's configs, none a multiple of eight and
    # contiguous in the resulting lattice to 57. The one architecture where every matrix button is
    # bound and every bound code has a button.
    EXPECTED_BUTTONS = 50
    # The four soft keys' codes, as a set. Section 119's capability table records why they matter: the
    # 5xx has no page button, so these carry the mode switches.
    SOFT_KEY_CODES = {'30', '31', '38', '39'}
    # The one name of its regional pair this file carries, and the pair written as both.
    MODEL_NAME = 'Harmony 525'
    BOTH_NAMES = '520 / 525'

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

    def test_it_names_one_member_of_the_pair_and_not_both(self):
        """
        A regional alias is not the same hardware, which the reference photographs are the evidence
        for: the two images of this pair differ by exactly the four teletext keys below, and the 880
        and 885 pair splits the same way, four coloured dots on one and a pair of chevrons on the
        other. Two independent pairs differing in the same feature, with a mechanism, since teletext
        is European. So a silhouette belongs to a skin and not to a model, and this file must not
        offer itself as both members. It said "Harmony 520 / 525" until that was noticed.

        **Which name gets the colour keys is not asserted here, on purpose.** The 885 image says 885
        on its own face, so that pair's direction is printed on the product; both 5xx images say
        "Harmony 520", so this file's name follows the community site's file naming and the analogy,
        which is upstream standing rather than measurement. The `<desc>` says so, and this test checks
        only the part that is established: one name, and the colour keys that are the reason for it.
        """
        text = _text(self.NAME)
        self.assertIn(self.MODEL_NAME, text)
        self.assertNotIn(self.BOTH_NAMES, text)
        # And the colour keys are the reason, so they have to actually be here.
        buttons = _buttons(_tree(self.NAME).getroot())
        self.assertEqual(sorted(k for k in buttons if k in PALETTE), sorted(PALETTE))


class TestTheHarmony515Silhouette(TestTheHarmony525Silhouette):
    """
    The Harmony 525's face with `Harmony 515` above the screen and symbols on Mute and Prev: every
    shape is taken from the 525's model, on a statement made holding both, so every claim the 525's
    drawing carries holds here and the three differences are what to check.
    """

    NAME = 'h515.svg'
    MODEL_NAME = 'Harmony 515'
    BOTH_NAMES = '510 / 515'

    def test_the_nameplate_names_this_model(self):
        text = _text(self.NAME)
        self.assertIn('>Harmony 515<', text)
        self.assertNotIn('>Harmony 525<', text)

    def test_mute_and_prev_carry_symbols_where_the_525_prints_words(self):
        mine, theirs = _text(self.NAME), _text(TestTheHarmony525Silhouette.NAME)
        for word in ('>Mute<', '>Prev<'):
            with self.subTest(word=word):
                self.assertIn(word, theirs)
                self.assertNotIn(word, mine)


class TestTheHarmony600Silhouette(_SilhouetteConventions, unittest.TestCase):
    """Fifty four, derived twice from the firmware and a census before this was drawn."""

    NAME = 'h600.svg'
    # Section 17: an event code is an event type plus a scan code, mask 0xC0 and 0x3F, so arch 14's
    # key table is 54 scan codes times three event types rather than the 108 matrix codes against 54
    # non matrix ones that the wrong field split produced. Section 48: a hardware census on the bench
    # 600, pressing every button, gave a per column distribution of 14, 14, 13 and 13, which is 54.
    # Counting this photograph came to 54 as well, which makes the drawing a third independent count.
    EXPECTED_BUTTONS = 54
    # The same census, kept as the shape of the number rather than just its total, since a count that
    # agrees by accident is the failure a total alone cannot see.
    COLUMN_CENSUS = (14, 14, 13, 13)

    def test_the_count_is_the_one_the_column_census_adds_up_to(self):
        """
        Two derivations of the same number, so this asserts they are the same number. Section 48's
        census is per column and section 17's reading is per event code, and neither knows about the
        other.
        """
        self.assertEqual(sum(self.COLUMN_CENSUS), self.EXPECTED_BUTTONS)

    def test_the_four_keys_flanking_the_screen_name_the_zones_beside_them(self):
        """
        Same arrangement as the 525's, four keys against four quadrants, which is what makes the
        arrangement the architecture's rather than the model's. Logitech's own manual says as much:
        "the side buttons beside the screen let you choose those options."

        What is different is that nothing narrows their codes. Section 89 narrowed the 525's to a
        block of four and there is no arch 14 equivalent, so these carry a zone and deliberately no
        candidate list. A candidate list here would be a guess wearing the 525's clothes.

        The ids moved from `k-soft-*` to `k-screen-*` when the drawing became generated, because an id
        is now derived from the key's name and these are named for what the manual calls them.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        flanking = {k: v for k, v in buttons.items()
                    if k.startswith('k-screen-') and k.endswith(('-left', '-right'))}
        self.assertEqual(len(flanking), 4)
        self.assertEqual(sorted(e.get('data-zone') for e in flanking.values()), ['1', '2', '3', '4'])
        for name, element in flanking.items():
            with self.subTest(button=name):
                self.assertIsNone(element.get('data-scan-candidates'))

    def test_the_fifth_screen_key_is_the_one_the_525_does_not_have(self):
        """
        The 600 has a row of three below its screen where the 525 has two arrow bars, and the manual
        splits them by function: the two arrows "move through various options on the remote screen"
        and "the center button below the remote screen" chooses one. So the centre key claims zone 5,
        on the same geometric footing as the other four and nothing stronger, and its printed marking
        is a bar matching the bar the panel draws across its bottom row.

        Named outside the flanking family on purpose, so the count of four above stays four.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        self.assertEqual(buttons['k-screen-select'].get('data-zone'), '5')
        self.assertIn('k-screen-prev', buttons)
        self.assertIn('k-screen-next', buttons)

    def test_the_panel_is_not_a_touch_surface(self):
        """
        The negative half of the one capability this project confirmed on its own: base slot 17 is a
        touch hit map on arch 12 and names the picture bank everywhere else, sections 45 and 62, and
        the 600 is arch 14. So this drawing must not describe a touch surface, and the four keys
        flanking the screen are how its labels are reached instead.

        Checked on the shape rather than on the prose, since the prose has to be free to say the words
        in order to deny them. The One names its panel `touch-surface`; nothing here may.
        """
        root = _tree(self.NAME).getroot()
        self.assertEqual([e for e in root.iter() if e.get('id') == 'touch-surface'], [])
        self.assertIn('not a touch surface', _text(self.NAME))

    def test_the_teletext_keys_are_present_and_each_states_its_own_colour(self):
        """
        The 600 carries all four, checked against the photograph rather than carried over from the
        525. The convention above polices how a colour may be declared; this says that here there is
        one, since a rule about permitted colours passes vacuously on a drawing that forgot them.

        On the product the key itself is a light pill with a small coloured bar inside it, and that is
        how it is drawn: the colour sits on the marking, which leaves the key's own fill free for the
        interface to use for the device it drives.
        """
        text = _text(self.NAME)
        buttons = _buttons(_tree(self.NAME).getroot())
        for ident, (_, colour) in PALETTE.items():
            with self.subTest(button=ident):
                self.assertIn(ident, buttons, f'{ident} is missing')
                self.assertIn(f'--accent: {colour}', text)


class TestTheHarmonyOneSilhouette(_SilhouetteConventions, unittest.TestCase):
    """Forty four, counted off the photograph, and this one has no firmware derived cross check."""

    NAME = 'one.svg'
    # **Not confirmed and not confirmable from here.** Section 48: on arch 14 a press yields its
    # matrix column, `(code - 1) mod 4`, and on arch 12 it yields nothing at all, because sixteen
    # buttons from every region of the One share one sense line. So there is no arch 12 equivalent of
    # section 89's fifty or of the 600's column census, and this number is a count of the photograph
    # and nothing else. If a census ever contradicts it, the drawing is what is wrong.
    EXPECTED_BUTTONS = 44

    def test_the_touch_panel_is_the_screen_and_the_regions_off_it_are_buttons(self):
        """
        The positive half of the capability that base slot 17 confirms: a hit on the One's panel goes
        through a hit map rather than through the keypad matrix, sections 45 and 62, and the One is
        the only arch 12 model.

        This looked for an element called `touch-surface` and there is not one any more, which is a
        change in the claim rather than a regression. The panel is now the **screen rectangle**, which
        says `data-touch="true"` and carries no `k-` id, so it stays out of the button count; and the
        four regions **off** the display, two beside it and two under it, are buttons of the forty
        four, because they are permanent and an interface has to be able to point at them. The buttons
        **on** the display are not here at all: they are drawn from a config, not from the case.
        """
        root = _tree(self.NAME).getroot()
        screen = [e for e in root.iter() if e.get('id') == 'screen']
        self.assertEqual(len(screen), 1, 'the One draws exactly one screen')
        self.assertEqual(screen[0].get('data-touch'), 'true', 'and says it can be pressed')
        self.assertNotIn('screen', _buttons(root))
        self.assertIn('touch surface', _text(self.NAME))
        touch = {k: v for k, v in _buttons(root).items() if v.get('data-kind') == 'touch'}
        self.assertEqual(sorted(touch),
                         ['k-screen-next', 'k-screen-prev', 'k-soft-left', 'k-soft-right'])

    def test_the_two_keys_below_the_screen_name_the_half_of_the_row_above_them(self):
        """
        The One's answer to the 525's four soft keys: two unmarked keys under the panel, each under
        one half of the row the config draws along its bottom. Two zones rather than four quadrants,
        which is why they are not named `k-soft-upper-left` and friends. Geometric adjacency and
        nothing stronger, the same standing the 525's four have.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        soft = {k: v for k, v in buttons.items() if k.startswith('k-soft-')}
        self.assertEqual(sorted(soft), ['k-soft-left', 'k-soft-right'])
        self.assertEqual(sorted(e.get('data-zone') for e in soft.values()), ['1', '2'])

    def test_the_one_carries_no_teletext_keys(self):
        """
        Checked against the photograph rather than assumed from the 525, and it is a data point about
        where the colour keys appear rather than an omission: the One has none, the 600 has four. The
        red dot on its record key is a printed marking and stays unfilled, which the conventions above
        are what enforce.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        self.assertEqual([k for k in buttons if k in PALETTE], [])


class TestTheHarmony350Silhouette(_SilhouetteConventions, unittest.TestCase):
    """Fifty five, counted off Logitech's own drawing, and 53 of them tied to a code by pressing them."""

    NAME = 'h350.svg'
    # The count is the button page of the Harmony 350 setup guide, counted shape by shape out of its vector
    # drawing; the guide's box contents drawing and the cover photograph agree where they reach. The 1.4
    # firmware's keypad scan numbers 56 codes, `tests/harmony_300_350/test_harmony_350_keys.py`, one more than the keys.
    EXPECTED_BUTTONS = 55
    # The codes heard at the bench, `TheBench350HeardEveryKey` in `tests/harmony_300_350/test_harmony_350_keys.py` and the nine
    # more heard on Logitech's compile of the test setup, `packages/bench/test/harmony-300-350/setup350.test.ts`, by the
    # drawing's names, and the key narrowed to a set. Stated here rather than read back from the drawing,
    # so a code that moves in the drawing moves in this file's diff too.
    CODES = {
        'TvMedia': 5, 'AvrGame': 7, 'Power': 3, 'Input': 35, 'Favorite5': 2, 'Info': 36, 'Exit': 12,
        'Guide': 33, 'UpArrow': 25, 'DownArrow': 26, 'Red': 13, 'Green': 27, 'Yellow': 28, 'Blue': 29,
        'VolumeUp': 49, 'VolumeDown': 52, 'DirectionUp': 51, 'DirectionRight': 31, 'DirectionDown': 42,
        'DirectionLeft': 14, 'Select': 50, 'ChannelUp': 55, 'ChannelDown': 41, 'VolumeMute': 15,
        'PrevChannel': 32, 'Rewind': 22, 'FastForward': 30, 'SkipBack': 21, 'SkipForward': 38, 'Record': 23,
        'Stop': 40, 'Play': 44, 'Pause': 46, 'Number1': 24, 'Number2': 47, 'Number3': 39, 'Number4': 17,
        'Number5': 48, 'Number6': 37, 'Number7': 18, 'Number8': 53, 'Number9': 45, 'Clear': 19, 'Number0': 20,
        'CablePc': 1, 'DvdMusic': 4, 'WatchTV': 6, 'Favorite1': 8, 'Favorite2': 9, 'Menu': 10, 'Favorite3': 11,
        'Favorite4': 34, 'Enter': 54,
    }
    CANDIDATES = {'Live': '43 56'}

    def test_exactly_the_stated_keys_carry_a_code_or_candidates(self):
        """
        On the Harmony 350, 53 keys carry the code they were heard sending with, 44 in the run
        that pressed every key and nine on Logitech's compile of the test setup, and Live a set of candidates; DVR carries neither, because its press sent a
        frame OK's binding sends as well, and the drawing takes a code from a press that decides it alone.
        This said no key on this remote was tied to a scan code, and none carried candidates either, until
        the every key run, and that 44 carried a code and five a set until the run on the test setup. The Harmony 300's class states
        none.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        codes = {e.get('data-name'): int(e.get('data-scan')) for e in buttons.values() if e.get('data-scan')}
        candidates = {e.get('data-name'): e.get('data-scan-candidates') for e in buttons.values()
                      if e.get('data-scan-candidates')}
        self.assertEqual(codes, self.CODES)
        self.assertEqual(candidates, self.CANDIDATES)

    def test_there_is_no_screen(self):
        """
        The Harmony 300 and 350 have no display, so a drawing with a screen rectangle would be offering
        the interface somewhere to put a page that does not exist.
        """
        root = _tree(self.NAME).getroot()
        self.assertEqual([e for e in root.iter() if e.get('id') == 'screen'], [])

    def test_the_teletext_keys_are_present_and_each_states_its_own_colour(self):
        """
        Four, under the navigation bay, as the guide's drawing and photograph both show, with the
        colour on a bar inside the key as on a Harmony 600.
        """
        text = _text(self.NAME)
        buttons = _buttons(_tree(self.NAME).getroot())
        for ident, (_, colour) in PALETTE.items():
            with self.subTest(button=ident):
                self.assertIn(ident, buttons, f'{ident} is missing')
                self.assertIn(f'--accent: {colour}', text)


class TestTheHarmony300Silhouette(TestTheHarmony350Silhouette):
    """
    The Harmony 350's moulding with the US Harmony 300's printing, skin 78: every shape is taken from the
    350's model, on a statement made holding a 300 and a 350 that the two are the same part with different
    labels, so every convention the 350's drawing is held to holds here, and what this class adds is the
    printing that differs.
    """

    NAME = 'h300.svg'
    EXPECTED_BUTTONS = 55
    # **None**, although the 350's drawing carries 53 and the European 300's 49: those were heard on a
    # Harmony 350 and on a skin 79 Harmony 300, and no skin 78 remote has been pressed. The moulding makes it
    # likely the codes are the same by place, which is an inference, so `h300.ts` drops every code and
    # candidate it takes over with the shapes. This said no Harmony 300 had been pressed until
    # the European one was.
    CODES = {}
    CANDIDATES = {}

    def test_the_printing_is_the_300s(self):
        """
        Read off the cover photograph of the Harmony 300 setup guide: its own device names, `List` where
        the 350 prints `DVR`, and the colour keys lettered A to D, which a drawing reprinted from the 350
        would not carry.
        """
        text = _text(self.NAME)
        for word in ('Cable/Sat', 'VCR/Aux', 'List', 'Replay', 'Harmony 300', 'A', 'D'):
            with self.subTest(word=word):
                self.assertIn(f'>{word}<', text)
        for word in ('Cable/PC', 'AVR/Game', 'DVR', 'Favorites', 'Teletext'):
            with self.subTest(absent=word):
                self.assertNotIn(f'>{word}<', text)
        # Five favourites: each of 1 to 5 is printed twice, on a favourite and on a digit key.
        self.assertEqual([text.count(f'>{n}<') for n in '12345'], [2, 2, 2, 2, 2])


class TestTheHarmony300EuropeanSilhouette(TestTheHarmony350Silhouette):
    """
    The Harmony 300's European printing, skin 79, on the same moulding, and 49 keys tied to a code by pressing
    every key of a skin 79 unit, `packages/bench/test/harmony-300-350/keys300.test.ts`.

    The printing is the statement of a person holding that unit, with a photograph of its upper half shown at
    the bench and not kept: the colour keys red, green, yellow, blue with no letters, as on the 350, and the
    favourite block 1 left of TV Input, 3 right of it, and 2, Teletext and 4 below, where the US printing has
    favourites 1 to 5; the rest as the US printing. No manual of the European model is in the lab.
    """

    NAME = 'h300eu.svg'
    EXPECTED_BUTTONS = 55
    # Every one the code of the 350 key in the same place, by this drawing's names. Clear, Enter, TV Input,
    # Live and the two arrows carry none: one configuration on the unit binds nothing to them, and the other
    # gives them Info's command, as it gives several codes, so neither tells them apart.
    CODES = {
        'CableSat': 1, 'Favorite3': 2, 'Power': 3, 'VcrAux': 4, 'Tv': 5, 'WatchTV': 6, 'Dvd': 7,
        'Favorite1': 8, 'Favorite2': 9, 'Menu': 10, 'Teletext': 11, 'Exit': 12, 'Red': 13,
        'DirectionLeft': 14, 'VolumeMute': 15, 'List': 16, 'Number4': 17, 'Number7': 18, 'Number0': 20,
        'SkipBack': 21, 'Rewind': 22, 'Record': 23, 'Number1': 24, 'Green': 27, 'Yellow': 28, 'Blue': 29,
        'FastForward': 30, 'DirectionRight': 31, 'PrevChannel': 32, 'Guide': 33, 'Favorite4': 34, 'Info': 36,
        'Number6': 37, 'SkipForward': 38, 'Number3': 39, 'Stop': 40, 'ChannelDown': 41, 'DirectionDown': 42,
        'Play': 44, 'Number9': 45, 'Pause': 46, 'Number2': 47, 'Number5': 48, 'VolumeUp': 49, 'Select': 50,
        'DirectionUp': 51, 'VolumeDown': 52, 'Number8': 53, 'ChannelUp': 55,
    }
    CANDIDATES = {}

    def test_the_printing_is_the_european_300s(self):
        """
        The US printing's device names and words, the colour keys without letters, four favourites and
        Teletext; no fifth favourite and no `Favorites` word.
        """
        text = _text(self.NAME)
        for word in ('Cable/Sat', 'VCR/Aux', 'List', 'Replay', 'Harmony 300', 'Teletext'):
            with self.subTest(word=word):
                self.assertIn(f'>{word}<', text)
        for word in ('Cable/PC', 'AVR/Game', 'DVR', 'Favorites', 'A', 'B', 'C', 'D'):
            with self.subTest(absent=word):
                self.assertNotIn(f'>{word}<', text)
        # Four favourites: 1 to 4 printed twice, on a favourite and on a digit key, and 5 once, on the digit.
        self.assertEqual([text.count(f'>{n}<') for n in '12345'], [2, 2, 2, 2, 1])

    def test_the_colour_keys_run_red_green_yellow_blue_left_to_right(self):
        """
        As on the 350, by place, as the printing was read off the unit. Only the order of the drawn keys is
        checked here; the codes on them are `CODES` above, and which press raised which is
        `packages/bench/test/harmony-300-350/keys300.test.ts`, resting on the order the keys were pressed in.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        order = sorted(('k-red', 'k-green', 'k-yellow', 'k-blue'), key=lambda one: _centre_x(buttons[one]))
        self.assertEqual(order, ['k-red', 'k-green', 'k-yellow', 'k-blue'])


class TestTheHarmony650Silhouette(TestTheHarmony600Silhouette):
    """
    The Harmony 600's face with `Harmony 650` printed at the bottom: every shape and code is taken from
    the 600's model, on Danny's statement that the three models share one face, so every claim the 600's
    drawing carries holds here and the one thing to check is the number.
    """

    NAME = 'h650.svg'
    MODEL = '650'

    def test_the_nameplate_names_this_model(self):
        """The only printing that differs from the 600's, and the reason this file exists at all."""
        text = _text(self.NAME)
        self.assertIn(f'>Harmony {self.MODEL}<', text)
        self.assertNotIn('>Harmony 600<', text)


class TestTheHarmony700Silhouette(TestTheHarmony650Silhouette):
    """The same for the Harmony 700."""

    NAME = 'h700.svg'
    MODEL = '700'


class TestTheHarmonyTouchSilhouette(_SilhouetteConventions, unittest.TestCase):
    """Twenty nine, counted off Logitech's own drawing, with a touch screen and no measured code."""

    NAME = 'touch.svg'
    # As weak as the Harmony 350's count and for the same reason: nothing has read this model's keypad,
    # so the number is the "Know your product" drawing in its setup guide, page 52 of the manual PDF in
    # the lab, counted shape by shape. 27 keys plus the star and the house above the screen, which the
    # legend lists as buttons, and the product photograph shows the same 29.
    EXPECTED_BUTTONS = 29

    def test_no_key_claims_a_code_or_a_candidate(self):
        """
        This library has never read a key off a Harmony Touch: its file based protocol is used only to
        read identity files, its configuration is reachable neither as a file nor as a compile, and
        no calibration configuration exists for it, section 133. So no key carries a code or a candidate
        list.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        for ident, element in buttons.items():
            with self.subTest(button=ident):
                self.assertIsNone(element.get('data-scan'))
                self.assertIsNone(element.get('data-scan-candidates'))

    def test_the_screen_is_a_touch_screen_with_the_guide_s_raster(self):
        """
        The manual calls it an LCD touch screen, and every screen capture in its user guide is 240 by
        320, so the rectangle says both. It does **not** claim the Harmony One's hit map: nothing about
        how this model resolves a press has been read, so the description stops at "a touch surface".
        """
        root = _tree(self.NAME).getroot()
        screen = [e for e in root.iter() if e.get('id') == 'screen']
        self.assertEqual(len(screen), 1)
        self.assertEqual(screen[0].get('data-touch'), 'true')
        self.assertEqual(screen[0].get('data-pixels'), '240x320')
        self.assertNotIn('screen', _buttons(root))
        text = _text(self.NAME)
        self.assertIn('Its screen is a touch surface.', text)
        self.assertNotIn('hit map', text)

    def test_the_star_and_the_house_are_the_two_touch_keys(self):
        """
        The only keys with no moulded part: the product prints a star and a house on the bezel above
        the glass and the guide says to tap them. Everything else is a physical key.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        touch = sorted(k for k, v in buttons.items() if v.get('data-kind') == 'touch')
        self.assertEqual(touch, ['k-favorites', 'k-home'])

    def test_the_colour_keys_are_present_and_each_states_its_own_colour(self):
        """
        Four, in a row under the satellite keys, red, green, yellow and blue on the drawing and on the
        photograph, each marked with a thin stripe in its colour.
        """
        text = _text(self.NAME)
        buttons = _buttons(_tree(self.NAME).getroot())
        for ident, (_, colour) in PALETTE.items():
            with self.subTest(button=ident):
                self.assertIn(ident, buttons, f'{ident} is missing')
                self.assertIn(f'--accent: {colour}', text)


class TestTheHarmony885Silhouette(_SilhouetteConventions, unittest.TestCase):
    """
    Fifty five, every one pressed on a unit, and the first drawing measured off a photograph rather than
    traced, `packages/silhouettes/src/models/h885.ts`.
    """

    NAME = 'h885.svg'
    # The units' count: 55 keys raised 55 codes on a Harmony 885, exactly the press codes of its key table,
    # and none raised one of the nine codes the table leaves empty, `tests/harmony_880_885/test_harmony_885_keys.py`.
    EXPECTED_BUTTONS = 55
    # `MEASURED` there is named by what the bench was asked to press; this is how each of those names is
    # called on the drawing. Stated rather than derived, so a renamed key shows in this file's diff.
    DRAWING_NAMES = {
        'Activities': 'Activities', 'Power': 'AllOff', 'Help': 'Help',
        'screen left 1': 'ScreenLeft1', 'screen left 2': 'ScreenLeft2', 'screen left 3': 'ScreenLeft3',
        'screen left 4': 'ScreenLeft4', 'screen right 1': 'ScreenRight1', 'screen right 2': 'ScreenRight2',
        'screen right 3': 'ScreenRight3', 'screen right 4': 'ScreenRight4',
        'Device': 'Device', 'Mute': 'VolumeMute', 'arrow left below the screen': 'ScreenPrev',
        'arrow right below the screen': 'ScreenNext', 'Media': 'Media', 'Prev': 'PrevChannel', 'Glow': 'Glow',
        'Vol +': 'VolumeUp', 'Vol -': 'VolumeDown', 'Ch +': 'ChannelUp', 'Ch -': 'ChannelDown',
        'd-pad left': 'DirectionLeft', 'd-pad up': 'DirectionUp', 'd-pad down': 'DirectionDown',
        'd-pad right': 'DirectionRight', 'OK': 'Select',
        'Menu': 'Menu', 'Exit': 'Exit', 'Guide': 'Guide', 'Info': 'Info',
        'Red': 'Red', 'Green': 'Green', 'Yellow': 'Yellow', 'Blue': 'Blue',
        'Stop': 'Stop', 'Rec': 'Record', 'Rew': 'Rewind', 'Replay': 'SkipBack', 'Skip': 'SkipForward',
        'Fwd': 'FastForward', 'Pause': 'Pause', 'Play': 'Play',
        '1': 'Number1', '2': 'Number2', '3': 'Number3', '4': 'Number4', '5': 'Number5', '6': 'Number6',
        '7': 'Number7', '8': 'Number8', '9': 'Number9', '0': 'Number0', 'Clear': 'Clear', 'Enter': 'Enter',
    }

    def test_every_key_carries_the_code_the_units_raised_for_it(self):
        """
        The drawing's codes are the bench's and nothing else: `MEASURED`, read off the remote's memory while
        each key was pressed, under the drawing's names, in both directions. A code typed wrongly into the
        model file fails here, and no key carries a set of candidates.
        """
        proves(43, ['harmony-885'])
        from harmony_880_885.test_harmony_885_keys import MEASURED
        self.assertEqual(sorted(self.DRAWING_NAMES), sorted(MEASURED))
        buttons = _buttons(_tree(self.NAME).getroot())
        codes = {e.get('data-name'): int(e.get('data-scan')) for e in buttons.values() if e.get('data-scan')}
        self.assertEqual(codes, {self.DRAWING_NAMES[n]: c for n, c in MEASURED.items()})
        self.assertEqual([e for e in buttons.values() if e.get('data-scan-candidates')], [])

    def test_the_eight_keys_beside_the_screen_are_the_screen_s_and_read_in_rows(self):
        """
        Section 128's screen population on arch 8 is exactly 5, 6, 7, 8, 44, 45, 46 and 48, the eight keys
        beside the glass; the arrows under it are keypad keys. Zones run left then right on each row, top to
        bottom, as the survey's legend numbers them and as the Harmony 525's drawing does.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        screen = {e.get('data-name'): (int(e.get('data-scan')), int(e.get('data-zone')))
                  for e in buttons.values() if e.get('data-kind') == 'screen'}
        self.assertEqual(screen, {
            'ScreenLeft1': (5, 1), 'ScreenRight1': (45, 2), 'ScreenLeft2': (6, 3), 'ScreenRight2': (46, 4),
            'ScreenLeft3': (7, 5), 'ScreenRight3': (48, 6), 'ScreenLeft4': (8, 7), 'ScreenRight4': (44, 8),
        })

    def test_the_screen_carries_arch_8_s_raster_and_is_not_a_touch_surface(self):
        root = _tree(self.NAME).getroot()
        screen = [e for e in root.iter() if e.get('id') == 'screen']
        self.assertEqual(len(screen), 1)
        self.assertEqual(screen[0].get('data-pixels'), '128x160')
        self.assertEqual(screen[0].get('data-touch'), 'false')

    def test_the_colour_keys_run_red_green_yellow_blue_left_to_right(self):
        """
        As the manual draws them and as the units were pressed by position, `ThePositionCheck` in
        `tests/harmony_880_885/test_harmony_885_keys.py`; each states its own colour.
        """
        text = _text(self.NAME)
        buttons = _buttons(_tree(self.NAME).getroot())
        order = sorted(('k-red', 'k-green', 'k-yellow', 'k-blue'), key=lambda one: _centre_x(buttons[one]))
        self.assertEqual(order, ['k-red', 'k-green', 'k-yellow', 'k-blue'])
        for _, colour in PALETTE.values():
            self.assertIn(f'--accent: {colour}', text)

    def test_it_says_it_was_measured_off_a_photograph(self):
        """Not traced, unlike every drawing before it, and the description a screen reader gets says which."""
        text = _text(self.NAME)
        self.assertIn('measured off a product photograph', text)
        self.assertNotIn('traced from the product documentation', text)


class TestTheHarmony880Silhouette(_SilhouetteConventions, unittest.TestCase):
    """
    The Harmony 885's face with two chevron keys where the 885 has four colour keys and another nameplate,
    `packages/silhouettes/src/models/h880.ts`: every other shape is taken from the 885's model, so what this
    class adds is what differs, and that a key carries a code only where Logitech's compiles for the 880 name
    it, never because the 885's key in its place raised one.

    The printing is read off the 880's product photograph in the lab and the picture of it in Logitech's
    reviewer's guide for the 880, page 11 of `Docs/880 manual.pdf`, which agree: the up chevron on the left,
    the down chevron on the right, and `HARMONY TECHNOLOGY` above the screen.
    """

    NAME = 'h880.svg'
    # The 885's 55 less its four colour keys and plus two chevron keys, which is the 53 codes an 880's
    # configurations' key tables hold, the 885's less 19 and 60, `reference/remotes/harmony-885/keys.md`.
    EXPECTED_BUTTONS = 53

    def test_the_keys_logitech_s_compiles_name_carry_their_code_and_the_chevrons_two_candidates(self):
        """
        No Harmony 880 has been pressed. The 29 keys Logitech's compiles for skin 15 name carry the code they
        name them on, exactly `ESTABLISHED_880` in `tests/harmony_880_885/test_harmony_880_keys.py`, and no other key carries
        one. The two chevron keys carry 20 and 52, the two of the 885's four colour key codes an 880's key
        table keeps; which of them each raises is not settled, and both carry the pair. No other key carries a
        candidate. This said no key claims a code until the 880's keys were measured in configurations.
        """
        from harmony_880_885.test_harmony_880_keys import ESTABLISHED_880
        buttons = _buttons(_tree(self.NAME).getroot())
        codes = {e.get('data-name'): int(e.get('data-scan')) for e in buttons.values() if e.get('data-scan')}
        self.assertEqual(codes, ESTABLISHED_880)
        candidates = {e.get('data-name'): e.get('data-scan-candidates')
                      for e in buttons.values() if e.get('data-scan-candidates')}
        self.assertEqual(candidates, {'UpArrow': '20 52', 'DownArrow': '20 52'})

    def test_the_chevrons_take_the_colour_keys_place_up_on_the_left(self):
        """
        As printed on the photograph and in the reviewer's guide: no colour key, the up chevron's key left of
        the down chevron's, each marked with its chevron, and the screen keys' arrows and Glow unchanged.
        """
        text = _text(self.NAME)
        buttons = _buttons(_tree(self.NAME).getroot())
        for ident in PALETTE:
            with self.subTest(absent=ident):
                self.assertNotIn(ident, buttons)
        self.assertEqual(re.findall(r'style="--accent:\s*(#[0-9a-fA-F]{6})"', text), [],
                         'no key states a colour of its own')
        order = sorted(('k-up-arrow', 'k-down-arrow'), key=lambda one: _centre_x(buttons[one]))
        self.assertEqual(order, ['k-up-arrow', 'k-down-arrow'])

    def test_the_nameplate_is_the_880_s(self):
        """`HARMONY TECHNOLOGY` above the screen, where the 885 prints its model name."""
        text = _text(self.NAME)
        self.assertIn('>Harmony Technology<', text)
        self.assertNotIn('>Harmony 885<', text)


def _words(button):
    """The words printed on or beside a key, in document order."""
    return [t.text for t in button.iter(f'{SVG}text')]


def _press_codes(filename):
    """The press codes of a contributed configuration's key table, found in the lab by name, or a skip."""
    from harmony import gspm
    from harmony_880_885.test_harmony_885_start_check import by_name
    (raw,) = by_name(filename)
    config = gspm.parse(raw)
    return {k.event_code & gspm.SCAN_MASK for k in config.keys if k.event_type == gspm.EVENT_PRESS}


class _TheProPrinting(_SilhouetteConventions):
    """
    The Harmony 885's 55 shapes with six keys printed otherwise, `packages/silhouettes/src/models/h880pro.ts`,
    which the 880 Pro and the 890 Pro share. A subclass names its drawing and its nameplate.

    **The printing is read off each model's product photograph in the lab**, with the 885's drawing laid over
    it, where the case and every shape fall on the photograph. Logitech's manuals for the 880 Pro and the 890
    Pro, `Docs/880Pro manual.pdf` and `Docs/890 pro manual.pdf`, name the keys the photographs show: SOUND
    and PICTURE, each of which switches the remote into a mode that controls that feature of one device, and
    PREV. Both print `PICTURE` in full on the right end key, the 890 Pro's photograph legibly. This said the
    880 Pro prints `PIC`, read off its low resolution photograph and the manual's small picture, where the
    word looked centred on the key; somebody who knows the remote corrected it, and the word is placed as
    the 890 Pro's is. At the foot of the band, where the 885 has its four colour keys,
    both print `MUTE`, a down triangle, an up triangle and `PREV`, left to right, and the band keeps the 885's
    five parting lines, so those are four keys.
    """

    NAMEPLATE = None
    EXPECTED_BUTTONS = 55

    #: The codes the face carries: the 880 Pro's own, measured on a unit, and none on the 890 Pro.
    CODES = {}

    def test_a_key_carries_a_code_only_where_this_model_s_unit_raised_it_and_no_candidates(self):
        """
        Configurations name no code here: the 880's rule asks for two contributors' configurations, and one
        880 Pro configuration is known and none of an 890 Pro. What carries a code is a key read on a unit of
        the model itself, the 880 Pro's 54, `tests/harmony_880_885/test_harmony_880pro_keys.py`; the 890 Pro is
        another architecture, so the 880 Pro's codes are not carried to it. No key carries a candidate list.
        This said no key carries a code at all, until a contributed 880 Pro was read with the key page.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        carried = {element.get('data-name'): int(element.get('data-scan'))
                   for element in buttons.values() if element.get('data-scan') is not None}
        self.assertEqual(carried, self.CODES)
        for ident, element in buttons.items():
            with self.subTest(button=ident):
                self.assertIsNone(element.get('data-scan-candidates'))

    def test_the_band_prints_sound_and_picture_at_its_ends_and_four_keys_at_its_foot(self):
        buttons = _buttons(_tree(self.NAME).getroot())
        self.assertEqual(_words(buttons['k-sound']), ['SOUND'])
        self.assertEqual(_words(buttons['k-picture']), ['PICTURE'])
        self.assertEqual(_words(buttons['k-volume-mute']), ['MUTE'])
        self.assertEqual(_words(buttons['k-prev-channel']), ['PREV'])
        for ident in PALETTE:
            with self.subTest(absent=ident):
                self.assertNotIn(ident, buttons)

        def across(ident):
            text = next(buttons[ident].iter(f'{SVG}text'), None)
            return float(text.get('x')) if text is not None else _centre_x(buttons[ident])
        foot = ('k-volume-mute', 'k-down-arrow', 'k-up-arrow', 'k-prev-channel')
        self.assertEqual(sorted(foot, key=across), list(foot), 'MUTE, down, up, PREV, left to right')
        # The triangles point the way their names say: the down mark's apex is below its base.
        down = next(e for e in buttons['k-down-arrow'].iter() if 'mark' in (e.get('class') or ''))
        up = next(e for e in buttons['k-up-arrow'].iter() if 'mark' in (e.get('class') or ''))
        self.assertTrue(down.get('d').endswith('L 0 0.85 Z'))
        self.assertTrue(up.get('d').endswith('L 0 -0.85 Z'))

    def test_the_nameplate_is_this_model_s(self):
        text = _text(self.NAME)
        self.assertIn(f'>{self.NAMEPLATE}<', text)
        self.assertNotIn('>Harmony 885<', text)

    def test_it_says_it_was_measured_off_a_photograph(self):
        self.assertIn('measured off a product photograph', _text(self.NAME))


class TestTheHarmony880ProSilhouette(_TheProPrinting, unittest.TestCase):
    """The Harmony 880 Pro, skin 39, `h880pro.ts`."""

    NAME = 'h880pro.svg'
    NAMEPLATE = 'Harmony 880 Pro'

    @property
    def CODES(self):
        from harmony_880_885.test_harmony_880pro_keys import MEASURED
        return MEASURED

    def test_its_key_table_holds_exactly_the_885_s_55_press_codes(self):
        """
        The count's closure: the one 880 Pro configuration's key table, `H880-Pro.EZHex`, holds as press codes
        exactly the 55 the keys of a Harmony 885 raised on a unit, so the 880 Pro has the 885's 55 positions
        and the drawing's 55 keys are that many. It does not say which printed key raises which code.
        """
        from harmony_880_885.test_harmony_885_keys import MEASURED
        self.assertEqual(_press_codes('H880-Pro.EZHex'), set(MEASURED.values()))


class TestTheHarmony890ProSilhouette(_TheProPrinting, unittest.TestCase):
    """
    The Harmony 890 Pro, skin 40, architecture 10, `h890pro.ts`: the 880 Pro's face with its own nameplate. No configuration of it is known, so its count is the drawing's, which its photograph
    shows key for key.
    """

    NAME = 'h890pro.svg'
    NAMEPLATE = 'Harmony 890 Pro'

    def test_it_is_the_880_pro_s_drawing_with_only_the_nameplate_changed(self):
        """
        A statement made holding both remotes: the 880 Pro and the 890 Pro are exactly the same face apart from
        the model name above the screen. So the 890 Pro's file, with its own id and model name written as the
        880 Pro's, is the 880 Pro's file byte for byte once the 880 Pro's measured codes are set aside, the
        `data-scan` attributes and the count of them in the description: every shape, word, mark and seam the
        same. The control is that the files do differ before that, and only on lines that carry the id, the
        name or a code.
        """
        mine, theirs = _text(self.NAME), _text('h880pro.svg')
        self.assertNotEqual(mine, theirs)
        as_880 = mine.replace('h890pro', 'h880pro').replace('Harmony 890 Pro', 'Harmony 880 Pro')
        uncoded = re.sub(r' data-scan="\d+"', '', theirs).replace('of which 54 carry', 'of which 0 carry')
        self.assertEqual(as_880, uncoded)
        differing = [a for a, b in zip(mine.split('\n'), uncoded.split('\n')) if a != b]
        self.assertTrue(differing)
        for line in differing:
            with self.subTest(line=line[:80]):
                self.assertTrue('h890pro' in line or 'Harmony 890 Pro' in line)
        # The nameplate is among them: the one printed word that differs.
        self.assertIn('>Harmony 890 Pro<', mine)
        self.assertNotIn('>Harmony 880 Pro<', mine)


class TestTheHarmony720Silhouette(_SilhouetteConventions, unittest.TestCase):
    """
    The Harmony 720, skin 44, its own face, `packages/silhouettes/src/models/h720.ts`, measured off its product
    photograph in the lab.

    **The printing agrees with the picture in Logitech's manual for the 720**, page 2 of `Docs/720 manual.pdf`:
    the power key alone at the top left, a wide Activities key, Devices and Help on one moulding, the screen
    with its display buttons, the left and right arrows under it, Guide and Info, Exit and Menu, two smart
    buttons printed with a down and an up chevron, the direction pad around OK, volume on the left and channel
    on the right, Mute and Prev at the bottom of the silver U, the transport block and the digits. Neither
    the manual nor the photograph shows a colour key or a Glow key.

    **The 785, skin 45, is not this drawing's**, though a community table pairs it with the 720 as one remote:
    the 785's manual, `Docs/785 manual.pdf`, page 13, names teletext buttons, which the 720's does not, so its
    face is another, as the 885's is beside the 880's. It has its own drawing, the 720's face with a row of
    colour keys, and its own class below.
    """

    NAME = 'h720.svg'
    # The 49 press codes of its one configuration's key table, below, and the 49 shapes on its photograph and
    # in its manual's picture.
    EXPECTED_BUTTONS = 49
    # Measured on that configuration. Six of them, 4, 9, 39, 42, 47 and 49, are in no Harmony 885's table,
    # so the 720's wiring is its own and the 885's code for a key says nothing of the 720's.
    PRESS_CODES = (list(range(1, 12)) + list(range(17, 26)) + [27] + list(range(33, 50))
                   + list(range(51, 60)) + [61, 62])

    def test_no_key_claims_a_code_or_a_candidate(self):
        """One Harmony 720 configuration is known, and the 880's rule asks for two contributors."""
        buttons = _buttons(_tree(self.NAME).getroot())
        for ident, element in buttons.items():
            with self.subTest(button=ident):
                self.assertIsNone(element.get('data-scan'))
                self.assertIsNone(element.get('data-scan-candidates'))

    def test_its_key_table_holds_49_press_codes(self):
        """
        The count's closure, from a source other than the photograph: the key table of the one 720
        configuration, `H720-Config.EZHex`, lists 49 press codes, the number of keys on the face.
        """
        self.assertEqual(len(self.PRESS_CODES), 49)
        codes = _press_codes('H720-Config.EZHex')
        self.assertEqual(sorted(codes), self.PRESS_CODES)
        from harmony_880_885.test_harmony_885_keys import MEASURED
        self.assertEqual(sorted(codes - set(MEASURED.values())), [4, 9, 39, 42, 47, 49])

    def test_the_six_keys_beside_the_screen_are_the_screen_s_and_read_in_rows(self):
        """Three a side, zones left then right on each row, top to bottom, as the 885's are numbered."""
        buttons = _buttons(_tree(self.NAME).getroot())
        screen = {e.get('data-name'): int(e.get('data-zone'))
                  for e in buttons.values() if e.get('data-kind') == 'screen'}
        self.assertEqual(screen, {
            'ScreenLeft1': 1, 'ScreenRight1': 2, 'ScreenLeft2': 3, 'ScreenRight2': 4,
            'ScreenLeft3': 5, 'ScreenRight3': 6,
        })

    def test_the_screen_carries_arch_8_s_raster_and_is_not_a_touch_surface(self):
        root = _tree(self.NAME).getroot()
        screen = [e for e in root.iter() if e.get('id') == 'screen']
        self.assertEqual(len(screen), 1)
        self.assertEqual(screen[0].get('data-pixels'), '128x160')
        self.assertEqual(screen[0].get('data-touch'), 'false')

    def test_there_is_no_colour_key_and_no_glow_key(self):
        buttons = _buttons(_tree(self.NAME).getroot())
        for ident in (*PALETTE, 'k-glow', 'k-media'):
            with self.subTest(absent=ident):
                self.assertNotIn(ident, buttons)
        self.assertEqual(re.findall(r'style="--accent:', _text(self.NAME)), [])

    def test_the_chevrons_are_down_on_the_left_and_the_nameplate_is_the_720_s(self):
        buttons = _buttons(_tree(self.NAME).getroot())
        order = sorted(('k-up-arrow', 'k-down-arrow'), key=lambda one: _centre_x(buttons[one]))
        self.assertEqual(order, ['k-down-arrow', 'k-up-arrow'])
        self.assertIn('>Harmony 720<', _text(self.NAME))

    def test_it_says_it_was_measured_off_a_photograph(self):
        self.assertIn('measured off a product photograph', _text(self.NAME))


def _key_box(button):
    """
    The box of a key's own outline, `(x0, y0, x1, y1)`, read off the `path.key` of its group.

    The outlines here are written with absolute `M`, `H`, `V`, `L`, `A` and `Z` only, so the box is the
    extent of the points those commands reach; a rounded rectangle's arcs end on its sides, so their end
    points are enough. Anything else in the path is refused rather than skipped, since a box read past a
    command it did not understand would be wrong without saying so.
    """
    (path,) = [e for e in button.iter() if e.get('class') == 'key']
    tokens = re.findall(r'[A-Za-z]|-?[\d.]+', path.get('d'))
    xs, ys, i, x, y = [], [], 0, 0.0, 0.0
    while i < len(tokens):
        op = tokens[i]
        i += 1
        if op in 'ML':
            x, y = float(tokens[i]), float(tokens[i + 1])
            i += 2
        elif op == 'H':
            x = float(tokens[i])
            i += 1
        elif op == 'V':
            y = float(tokens[i])
            i += 1
        elif op == 'A':
            x, y = float(tokens[i + 5]), float(tokens[i + 6])
            i += 7
        elif op == 'Z':
            continue
        else:
            raise ValueError('a key outline with a %s command' % op)
        xs.append(x)
        ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


class TestTheHarmony785Silhouette(_SilhouetteConventions, unittest.TestCase):
    """
    The Harmony 785, skin 45, `packages/silhouettes/src/models/h785.ts`: the Harmony 720's drawing with a row of
    four colour keys between the transport block and the digits.

    **What the drawing rests on.** A person holding both a Harmony 720 and a Harmony 785 states that the two
    faces differ in the colour keys alone, a row of them between the digits and the transport keys. The 785's
    own sources show the same and are what the row is measured on: its product photograph in the lab,
    `reference/forum-images/785-full.jpg`, and the picture on page 13 of `Docs/785 manual.pdf`, its page 9,
    whose legend names the four the teletext buttons. That picture is raster, the same product shot at about
    two and a half times the photograph's size, so there is no vector drawing of the 785 to take. On both,
    each colour key has the outline and the column of the transport key above it and sits one transport
    pitch below the Rec row, Red, Green, Yellow and Blue from the left, the whole key moulded in its colour.

    **What the row costs the rest of the face.** The 720 leaves 24 pixels of its photograph between the Rec
    row's words and the digits, where the 785 has about 45, so the two blocks are not where the 720's are:
    registered on the bottom edge of the silver U above them, both 785 sources put the transport block 7 of
    the 720 photograph's pixels higher and the digits 16 lower, and the drawing moves the two blocks by that
    and nothing else. `test_every_key_but_the_two_blocks_and_the_colour_row_is_the_720_s` holds the rest to
    the 720's drawing byte for byte, so a change to the 720's face reaches the 785's and nothing else drifts.

    **Two printed words differ**: the 785 prints `Vol` and `Ch` with no full stop, plainly so in the manual's
    picture, where the 720 prints `Vol.` and `Ch.`; and the nameplate reads `Harmony 785`.

    **The count's closure** is the configurations: the key tables of both bench remotes' configurations hold
    the same 53 press codes, the Harmony 720's 49 and four more, 12, 26, 28 and 63, which is the 720's 49 keys
    and the four colour keys. They do not say which colour key raises which of the four: no Harmony 785 has
    been pressed, and the 885's codes say nothing of this wiring, as the 720's class says of the 720's.
    """

    NAME = 'h785.svg'
    # The 720's 49 and the four colour keys; the 53 press codes of both 785 configurations, below.
    EXPECTED_BUTTONS = 53
    # The four press codes the 785's key tables hold beyond the 720's.
    MORE_THAN_THE_720 = [12, 26, 28, 63]
    # The colour keys, left to right, each with the transport key above it.
    COLOUR_UNDER = {'k-red': 'k-record', 'k-green': 'k-rewind', 'k-yellow': 'k-fast-forward', 'k-blue': 'k-pause'}
    # How far the two blocks moved, in drawing units, measured off the 785's sources: 7 and 16 of the 720
    # photograph's pixels, which are 1000 / 991.95 units each.
    TRANSPORT_DY = -7 * 1000 / 991.95
    DIGITS_DY = 16 * 1000 / 991.95
    TRANSPORT = ('k-stop', 'k-skip-back', 'k-skip-forward', 'k-play',
                 'k-record', 'k-rewind', 'k-fast-forward', 'k-pause')
    DIGITS = tuple('k-number%d' % n for n in range(10)) + ('k-clear', 'k-enter')

    def test_no_key_claims_a_code_or_a_candidate(self):
        """No Harmony 785 has been pressed, and its two configurations do not say which key raises which code."""
        buttons = _buttons(_tree(self.NAME).getroot())
        for ident, element in buttons.items():
            with self.subTest(button=ident):
                self.assertIsNone(element.get('data-scan'))
                self.assertIsNone(element.get('data-scan-candidates'))

    def test_both_configurations_hold_the_720_s_49_press_codes_and_four_more(self):
        """
        The count's closure, from a source other than the photographs: both bench remotes' configurations hold
        the same 53 press codes, exactly the 720's one configuration's 49 and 12, 26, 28 and 63.
        """
        import lab
        from harmony import gspm
        lab.require('h785_a_config', 'h785_b_config')
        tables = []
        for name in ('h785_a_config', 'h785_b_config'):
            config = gspm.parse(lab.load(name))
            tables.append(sorted({k.event_code & gspm.SCAN_MASK for k in config.keys
                                  if k.event_type == gspm.EVENT_PRESS}))
        self.assertEqual(tables[0], tables[1])
        self.assertEqual(len(tables[0]), self.EXPECTED_BUTTONS)
        self.assertEqual(tables[0], sorted(TestTheHarmony720Silhouette.PRESS_CODES + self.MORE_THAN_THE_720))

    def test_the_colour_keys_run_red_green_yellow_blue_each_under_its_transport_key(self):
        """
        Each colour key has the outline of the transport key above it, its column and its height, sits one
        transport pitch below it and above the first row of digits, and states its own colour.
        """
        text = _text(self.NAME)
        buttons = _buttons(_tree(self.NAME).getroot())
        order = sorted(self.COLOUR_UNDER, key=lambda one: _centre_x(buttons[one]))
        self.assertEqual(order, ['k-red', 'k-green', 'k-yellow', 'k-blue'])
        stop = _key_box(buttons['k-stop'])
        pitch = _key_box(buttons['k-record'])[1] - stop[1]
        first_digit = _key_box(buttons['k-number1'])[1]
        for colour, above in self.COLOUR_UNDER.items():
            with self.subTest(key=colour):
                mine, theirs = _key_box(buttons[colour]), _key_box(buttons[above])
                self.assertAlmostEqual(mine[0], theirs[0], places=3)
                self.assertAlmostEqual(mine[2], theirs[2], places=3)
                self.assertAlmostEqual(mine[3] - mine[1], theirs[3] - theirs[1], places=3)
                self.assertAlmostEqual(mine[1] - theirs[1], pitch, places=3)
                self.assertLess(mine[3], first_digit)
        for _, colour in PALETTE.values():
            self.assertIn(f'--accent: {colour}', text)

    def test_every_key_but_the_two_blocks_and_the_colour_row_is_the_720_s(self):
        """
        The person's statement as a test: the 785's keys are the 720's and the four colour keys, every key
        above the transport block drawn exactly as on the 720, and each of the two blocks the 720's moved by
        one distance for the whole block.
        """
        self.assertIn(b'clip-h785-', _text(self.NAME).encode())
        mine = _buttons(_tree(self.NAME).getroot())
        theirs = _buttons(_tree(TestTheHarmony720Silhouette.NAME).getroot())
        self.assertEqual(sorted(mine), sorted([*theirs, *self.COLOUR_UNDER]))
        for ident, element in theirs.items():
            with self.subTest(button=ident):
                if ident in self.TRANSPORT or ident in self.DIGITS:
                    dy = self.TRANSPORT_DY if ident in self.TRANSPORT else self.DIGITS_DY
                    a, b = _key_box(mine[ident]), _key_box(element)
                    for got, want in zip(a, (b[0], b[1] + dy, b[2], b[3] + dy)):
                        self.assertAlmostEqual(got, want, delta=0.002)
                else:
                    # A segment's clip region carries its drawing's id, so the two pages cannot share one,
                    # `clipId` in `packages/silhouettes/src/svg.ts`; that id is the one difference allowed.
                    self.assertEqual(ET.tostring(mine[ident]).replace(b'clip-h785-', b'clip-h720-'),
                                     ET.tostring(element))

    def test_the_six_keys_beside_the_screen_are_the_screen_s_and_read_in_rows(self):
        """Three a side, as on the 720."""
        buttons = _buttons(_tree(self.NAME).getroot())
        screen = {e.get('data-name'): int(e.get('data-zone'))
                  for e in buttons.values() if e.get('data-kind') == 'screen'}
        self.assertEqual(screen, {
            'ScreenLeft1': 1, 'ScreenRight1': 2, 'ScreenLeft2': 3, 'ScreenRight2': 4,
            'ScreenLeft3': 5, 'ScreenRight3': 6,
        })

    def test_the_screen_carries_arch_8_s_raster_and_is_not_a_touch_surface(self):
        root = _tree(self.NAME).getroot()
        screen = [e for e in root.iter() if e.get('id') == 'screen']
        self.assertEqual(len(screen), 1)
        self.assertEqual(screen[0].get('data-pixels'), '128x160')
        self.assertEqual(screen[0].get('data-touch'), 'false')

    def test_the_nameplate_is_the_785_s_and_vol_and_ch_carry_no_full_stop(self):
        text = _text(self.NAME)
        self.assertIn('>Harmony 785<', text)
        self.assertNotIn('>Harmony 720<', text)
        for printed, not_printed in (('>Vol<', '>Vol.<'), ('>Ch<', '>Ch.<')):
            with self.subTest(word=printed):
                self.assertIn(printed, text)
                self.assertNotIn(not_printed, text)

    def test_it_says_it_was_measured_off_a_photograph(self):
        self.assertIn('measured off a product photograph', _text(self.NAME))


class TestTheSilhouetteDirectory(unittest.TestCase):
    """What is drawn and what is not, so the gap is a statement rather than an oversight."""

    # Every drawing in the directory, each with the class that checks it. A file here with no class
    # naming it is the oversight this pairing exists to refuse.
    DRAWN = {
        'h300.svg': TestTheHarmony300Silhouette,
        'h300eu.svg': TestTheHarmony300EuropeanSilhouette,
        'h350.svg': TestTheHarmony350Silhouette,
        'h515.svg': TestTheHarmony515Silhouette,
        'h525.svg': TestTheHarmony525Silhouette,
        'h600.svg': TestTheHarmony600Silhouette,
        'h650.svg': TestTheHarmony650Silhouette,
        'h700.svg': TestTheHarmony700Silhouette,
        'h720.svg': TestTheHarmony720Silhouette,
        'h785.svg': TestTheHarmony785Silhouette,
        'h880.svg': TestTheHarmony880Silhouette,
        'h880pro.svg': TestTheHarmony880ProSilhouette,
        'h885.svg': TestTheHarmony885Silhouette,
        'h890pro.svg': TestTheHarmony890ProSilhouette,
        'one.svg': TestTheHarmonyOneSilhouette,
        'touch.svg': TestTheHarmonyTouchSilhouette,
    }
    # Drawings named here are wanted and not yet landed. Every model on the bench is drawn now: the 650
    # and 700 as the 600's face with their own number, the 300 as the 350's with its own printing, and
    # the Harmony Touch last. A model added later starts here, goes in `DRAWN` when it lands and comes
    # out of here, which the test below enforces.
    NEXT: tuple[str, ...] = ()

    # A `d` attribute has to contain one of these to be a curve rather than a polygon. `A` counts as
    # well, since an elliptical arc is a curve, but a path made only of `M`, `L`, `H`, `V` and `Z` is
    # a rectangle however many vertices it spells out.
    CURVE_COMMANDS = 'CcSsQqTtAa'

    def test_every_case_is_a_measured_contour_and_not_a_rounded_box(self):
        """
        The property that decides whether these drawings are worth having, so it is asserted over the
        directory rather than per model.

        A silhouette whose body is a rounded rectangle is not recognisable as any particular remote,
        and recognisability by shape is the whole point of drawing one. All three of these started as
        `<rect rx="34">` and all three had to be replaced with a contour sampled off the photograph,
        which is a change no test would have asked for. So the rule is written down: the case is a
        `path`, it carries at least one curve command, and there is exactly one of it. The curve check
        is what stops a path that merely spells out the same rectangle in `M`, `L` and `Z`, which is
        the obvious way to satisfy the letter of this and none of its point.
        """
        for name in sorted(os.listdir(SILHOUETTES)):
            with self.subTest(file=name):
                root = _tree(name).getroot()
                bodies = [e for e in root.iter() if 'body' in (e.get('class') or '').split()]
                self.assertEqual(len(bodies), 1, 'one case outline, no more and no fewer')
                body = bodies[0]
                self.assertEqual(body.tag, f'{SVG}path',
                                 'the case is a contour, so it cannot be a rect or a circle')
                d = body.get('d') or ''
                self.assertTrue(any(c in d for c in self.CURVE_COMMANDS),
                                'a path of straight segments is a polygon, not a contour')

    def test_every_file_is_an_svg_and_none_is_a_photograph(self):
        """
        The rail this directory exists to keep. A product photograph is third party and unpublishable,
        `../lab/reference/forum-images/PROVENANCE.md`, and the whole point of drawing is that our own
        geometry carries no such problem. So a raster file here would be the thing that undoes it.
        """
        for name in os.listdir(SILHOUETTES):
            with self.subTest(file=name):
                self.assertTrue(name.endswith('.svg'), f'{name} is a drawing')

    def test_every_drawing_present_is_checked_by_a_class_of_its_own(self):
        """
        What the old form of this test was really protecting, now that the list it named is complete.

        It used to assert that `one.svg` and `h600.svg` were the two undrawn files, which was a
        statement with a shelf life: drawing them was what made it fail, and the temptation then is to
        delete it. The durable version is the pairing. A new drawing that nobody wrote a class for
        would sit in the directory with its button count unasserted, which is exactly the state the
        directory exists to prevent, and this is what says so.
        """
        self.assertEqual(sorted(os.listdir(SILHOUETTES)), sorted(self.DRAWN))
        for name, klass in self.DRAWN.items():
            with self.subTest(file=name):
                self.assertEqual(klass.NAME, name)
                self.assertIsInstance(klass.EXPECTED_BUTTONS, int)

    def test_the_bench_remotes_are_drawn_and_nothing_waiting_has_half_landed(self):
        """
        The first three remotes on the bench are drawn, and a drawing still listed in `NEXT` is not in
        the directory. When one lands, it goes in `DRAWN` with a class and comes out of `NEXT`, and the
        test above is what refuses the first half without the second. The 650 and the 700 came out of
        `NEXT` that way.
        """
        drawn = set(os.listdir(SILHOUETTES))
        for bench in ('h525.svg', 'h600.svg', 'one.svg'):
            with self.subTest(file=bench):
                self.assertIn(bench, drawn)
        self.assertEqual([n for n in self.NEXT if n in drawn], [],
                         'a drawing landed without a class and a place in DRAWN')
