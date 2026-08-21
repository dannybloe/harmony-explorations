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

_HERE = os.path.dirname(os.path.abspath(__file__))
SILHOUETTES = os.path.normpath(os.path.join(_HERE, '..', 'reference', 'silhouettes'))

SVG = '{http://www.w3.org/2000/svg}'

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

    def test_a_scan_code_appears_only_where_it_has_been_measured(self):
        """
        This said **nothing** may claim a scan code, and that was true when it was written and is not
        now. Section 133 named 32 of a Harmony One's 44 keys and 36 of a Harmony 600's 54, by decoding
        what each scan sends and looking the frame up in the command catalogue of the account that
        generated the config, and `reference/button-maps.md` records the result.

        So the claim becomes the one that still bites: a code is here **only** if that document names
        it. The document is parsed rather than copied, so a drawing cannot drift away from it, and a
        drawing that names none still passes, which is right for the Harmony 525, where the route
        needs a config Logitech compiled for us and no such config exists for that model.

        Section 48 is still why this cannot be finished from hardware: a remote on USB never runs its
        keypad handler, and arch 12 (Harmony One) would not give up a column even if it did.
        """
        buttons = _buttons(_tree(self.NAME).getroot())
        claimed = {k: int(e.get('data-scan')) for k, e in buttons.items() if e.get('data-scan')}
        measured = set()
        with open(os.path.join(SILHOUETTES, '..', 'button-maps.md')) as handle:
            text = handle.read()
        for row in re.finditer(r'^\| (\d+) \| `(\w+)` \| `[^`]*` \|$', text, re.M):
            measured.add(int(row.group(1)))
        for ident, scan in claimed.items():
            with self.subTest(button=ident):
                self.assertIn(scan, measured,
                              f'{ident} claims scan {scan}, which nothing has measured')
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
        self.assertIn('Harmony 525', text)
        self.assertNotIn('520 / 525', text)
        # And the colour keys are the reason, so they have to actually be here.
        buttons = _buttons(_tree(self.NAME).getroot())
        self.assertEqual(sorted(k for k in buttons if k in PALETTE), sorted(PALETTE))


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


class TestTheSilhouetteDirectory(unittest.TestCase):
    """What is drawn and what is not, so the gap is a statement rather than an oversight."""

    # Every drawing in the directory, each with the class that checks it. A file here with no class
    # naming it is the oversight this pairing exists to refuse.
    DRAWN = {
        'h525.svg': TestTheHarmony525Silhouette,
        'h600.svg': TestTheHarmony600Silhouette,
        'one.svg': TestTheHarmonyOneSilhouette,
    }
    # The next pair worth drawing, and the reason is the same as the bench remotes': something can be
    # checked against. The 700 is arch 14 like the 600, so section 17's reading of the key table
    # applies to it and its own count would test whether 54 is the architecture's or the model's. The
    # 650 shares the 600's skin family and differs only in its panel, per `reference/capabilities.md`,
    # so a drawing of it would say whether the panel is the only difference.
    NEXT = ('700.svg', 'h650.svg')

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

    def test_the_three_bench_remotes_are_drawn_and_the_next_pair_is_not(self):
        """
        The three remotes on the bench can be checked against by looking at them, and all three are
        drawn now. The 700 and the 650 are the obvious next pair and neither is, which this records
        rather than leaving to be discovered. When one of them lands, it goes in `DRAWN` with a class
        and comes out of `NEXT`, and the test above is what refuses the first half without the second.
        """
        drawn = set(os.listdir(SILHOUETTES))
        for bench in ('h525.svg', 'h600.svg', 'one.svg'):
            with self.subTest(file=bench):
                self.assertIn(bench, drawn)
        self.assertEqual([n for n in self.NEXT if n in drawn], [],
                         'a drawing landed without a class and a place in DRAWN')
