"""
Which printed key of a Harmony 885 raises which scan code, and where the remote keeps the key just pressed.

Item 2.4 of `todo/todo-prepare-885.md`, row F9 of plan 012. Two halves: **read in the firmware**, the 885
application 4.4 (`arch8_code_885`, base `0x010000`) with the 880's, the 880 Pro's and the Harmony 720's
images as cross checks; and **measured on a unit**, two bench Harmony 885s on 5 November 2026, their data
memory polled over USB while keys were pressed by hand. No remote is opened by this file: it reads the
four watch logs the bench session filed in the lab, and the images.

**Sources checked before the work**: `reference/remotes/harmony-885/keys.md`, which held the lattice and the
empty codes and said which printed key sits at which code is not known; the archive's sections 144 (the
scan arithmetic, `0x08C26` as image offset, `0x018C26` as a host address, the same arithmetic in both
bootloaders) and 177 (the key table states the hardware); section 48, the same watch on the Harmony 600
and the way its variable was found, a pair of the held key and a copy; `packages/usb/bin/watch-keys.ts`,
which had no default for this product. **Logitech's client, decision 2**: neither client holds a key map, a
host names keys and the configuration binds scan codes, checked earlier and recorded in `docs/status.md`;
MyHarmony does not serve this platform. So the firmware and the units are the only sources, and a
contributor's legend the prediction.

## Where the key lives, read in the firmware

The key service at `0x18C3E` runs from the main loop. When the debounce has expired it calls the press
handler at `0x18C68`, which calls the scanner (`0x18A16`) and keeps its result in `0x2B4`:

* a key down that differs from the one held: if another was held, its release may be raised and the hold
  timer cancelled; then `MOVFF 0x2B4,0x295` at `0x18CA2` and `MOVFF 0x295,0x3A1` at `0x18CA6`, the press
  raised as `0x80 | 0x295`, and the hold timer armed;
* no key down while one is held: the release may be raised, the hold timer cancelled and `0x295`
  cleared.

**`0x295` is the key held and `0x3A1` the last key pressed.** Every banked write to an offset `0x95` in the
application's code is one of three `CLRF`, each straight after `MOVLB 0x2`: `0x1891E` (the keypad init),
`0x18C9C` and `0x18CEE` (the handler's two releases). The one `MOVFF` into `0x295` is `0x18CA2`, from the
scan result. `0x3A1` has one access in the image, the `MOVFF` at `0x18CA6`, and no banked write to an
offset `0xA1` runs in bank 3: each one's nearest `MOVLB` names bank 1 or 2, and a reviewer found each of
those within two instructions of its write. So no instruction clears `0x3A1`. Not excluded: a write
through a computed `FSR`, which `pic18_trace.py` cannot see, which is why the reference says no
instruction rather than nothing.

**The event type is never in either byte.** It is ORed on into W only when an event is raised, `MOVLW
type; IORWF 0x95,W; MOVWF 0x39C; CALL 0x12EB4`, which puts it on the action queue as a `0x1F 0xFC` raise:
`0x80` once (the press), `0x40` twice (the two releases) and `0xC0` once (the hold, in the key service).
`0x39C` is the argument byte every raised event shares, so it is no place to watch the type.

**Hold fires once, and release only before it.** The hold timer is armed at `0x19BA0`, whose one caller is
the press handler's `GOTO` at `0x18CCA`: nothing re-arms it, so `0xC0 | key` is raised once per press. The
banked writes to `0x0F0`, the armed flag, are the arm (`0x19BA4`), the cancel (`0x19B96`) and the expiry's
clear (`0x19CA8`); to `0x0F1`, the fired flag, the expiry's set (`0x19CA6`, the only one) and three clears.
Each release raise is skipped by a `BZ` past it to the cancel when `0x0F0` is clear, so a release after
the hold raises nothing. The delay is `0x308 * 10` units (`MOVLB 0x3; MOVF 0x08,W; MULLW 0x0A` at
`0x18CBC`), where `0x308` is set to 75 (`MOVLW 0x4B; MOVWF 0x08` at `0x12EA8`) by the routine at `0x12E94`,
whose one caller is the application's start at `0x16DC6`, and an action instruction can set it
(`MOVFF 0x3AE,0x308` at `0x131A0`; which band selects that arm is the reading's, not asserted here). The
unit is 1000 counts of timer 3 by the reading, whose clock is not read; neither is asserted here, and
the reference states no milliseconds.

**The same in the 880 and the 880 Pro, at another address in the 720.** The keypad init and the scanner
through the handler, `0x1891C` to `0x1893C` and `0x18A16` to `0x18CF6`, are byte identical in the 885's,
the 880's and the 880 Pro's applications, skins 17, 15 and 39 (a reviewer found the whole images differ in
the two skin bytes only). The Harmony 720's (skin 44 by the reading; the skin offsets differ in its build
and this file does not read its skin) press handler is the same routine at `0x184BE`, instruction for
instruction with other register and call addresses by the reviewer's count, and keeps the held key at
**`0x296`**, still copying it to `0x3A1`; its writes census the same way, at `0x1816C`, `0x184F2`,
`0x18544` and the `MOVFF` at `0x184F8`, and none of its banked writes to an offset `0xA1` runs in bank 3.
Its scanner and its hold timer are not compared. On the 885 `0x296` is something else: the keypad init
stores into it what `0x18284` returns for index 2 with default 25 (the flash byte `0x000102` by the
reading), and the port B change handler copies it into `0x0ED`, from which the debounce countdown `0x0E8`
is loaded. So a 720's address watched on an 885 shows a value set at start that the keys never move. That
is why `watch-keys.ts` chooses the address by skin and not by product id, which all of these share. The
785, skin 45, has no image here and gets no default.

## The bench, measured on two units

`node packages/usb/bin/watch-keys.ts --product 0xc110 --address 0x295,0x3a1`, read only, each unit named by
its identity block first (`read-identity.ts --record`). A press is `0x295` going to a nonzero code, or a
change of `0x3A1` alone, `presses` below. Four logs:

* **Unit A before cleaning** (`h885_a_keys_before_cleaning`), fifteen presses: 1, 2, 3, 5, 6, 7, 8 and 10
  (steps 1 to 3 of the step list below as far as Mute), then 32 for 0.07 s straight into 11 (the first
  Mute, the one change from one key straight to another in any log), 11 again, 8 again, 11 again, 14 and
  15. The arrow left below the screen (12) and Vol + (13) never appeared, nor d-pad up (16), and whether
  it was pressed is not recorded. Stopped there and the key contacts cleaned, so nothing is concluded from
  this log about 12, 13 or the 32.
* **Unit A opened, pressed freely** (`h885_a_keys_free_press`): 71 presses over 48 of the 55 codes, 13
  among them; 1, 2, 5, 6, 7, 11 and 37 were not pressed or did not register. No order, so only its codes
  are asserted, each a key's.
* **Unit A, the map** (`h885_a_keys_map`): the step list below, then the five keys that had not registered
  pressed again, then the transport row again, Mute held, and six keys pressed alone. All 55 keys raised
  their code in this run, five of them only on the second press.
* **Unit B, the check** (`h885_b_keys_check`): sixteen presses.

**The names**: every name in this file is the name of the key asked for at that point, not a record of
what was pressed. On unit A that is the step list of the bench brief, `A_MAP`, so the positions of the
screen keys, the digits (8 is 27 and 7 is 29 only because the list asked 8 before 7) and the colour keys
rest on the list's order being kept. On unit B it is the bench notes' list of sixteen names, which gives
them in the order the log shows the codes; it is the same kind of record, the notes and not a log of
names. What the order cannot fake is the agreement between two units and the closure below.

**The closure**: the codes unit A's map run raised are exactly the press codes of unit A's own
configuration's key table, 55 of 55, and the nine codes no key raised are exactly the nine the table leaves
empty. The run reads data memory and the table is read out of flash, two different fields. That no
physical key sits on one of the nine empty codes rests on step 14, "any key on the face not yet pressed:
none", a statement and not a log; and the step list came from a legend whose absent keys already matched
the table, so the list could not have led the presser to an empty code. Unit B's sixteen are a subset of
its table, nothing outside it.

**The prediction and how it failed.** The step list's predictions came from a contributor's survey of a
Harmony 880 circuit board with four 885 additions, `dumps/kkong42/harmony-880/880-key-legend.csv` in the
lab, read here, on the assumption that a board designator `Kn` is scan code `n`. Before the bench, two
things supported it: its absent keys are eight of the table's nine empty codes (it lists no `K64`), and
its eight screen keys sit where one configuration's activity menu puts them (section 128). The units agree
with it on 49 keys and contradict it on six: the survey has Skip 51, Fwd 52, Pause 53, Play 54, Info 55
and Blue 56, and the units give **Info 51, Blue 52, Skip 53, Fwd 54, Pause 55, Play 56**. That is the
survey's sequence for those six numbers rotated by two, the four transport keys keeping their order among
themselves, which is a shape a misread board is more likely to give than six independent slips; whether it
is the 885's layout against the 880's or an error in the survey is not settled, and nothing here measures
an 880. Logitech's compiles for an 880 do weigh in: they put Info, Fwd, Pause and Play on 51, 54, 55 and 56,
the units' codes and not the survey's, `tests/harmony_880_885/test_harmony_880_keys.py`, so as far as compiles can say the
survey is wrong for an 880 too; a pressed 880 would settle it. The legend is not named in the
reference, which describes no contributed file.

**What the logs do not settle, recorded rather than smoothed over.** In unit A's first pass of step 11
(Guide, Skip, Fwd, Pause, Play, Info, Blue asked), the two keys after Fwd raised 56 then 55, the reverse of
Pause 55 and Play 56. Under the same assumption, that names follow the order asked, unit B and A's second
pass of the row give Pause 55 and Play 56: two against one, and the bench notes say the six were settled by
pressing each alone, a press whose names the log does not hold. So that pair is asserted as a pair in A's
first pass and by name on unit B only. A's second pass and the six pressed alone are asserted as codes.

**Settled afterwards by position, which needs no name and no colour** (`h885_b_keys_by_position`, unit B).
The colour keys carry a colour and no text, and their names above rested on the order asked alone. The
885's manual draws them in a curve under the d-pad, red, green, yellow, blue from left to right, and its
transport block with Play top right and Pause below it. Pressed by position, left to right along the curve
and then top right and the key below it, the units gave 20, 19, 60, 52, 56, 55: Red 20, Green 19, Yellow
60, Blue 52, Play 56, Pause 55, every one the code `MEASURED` already held. So A's first pass of the
transport row is the one that was out of order. This log is not in `LOGS`, whose counts describe the four
runs above; `ThePositionCheck` reads it on its own.

**The held byte stays for the whole hold.** Mute held on unit A: `0x295` read 11 for 3.85 s with no
change and went to 0 on release, the third Mute of the run; the second, 0.71 s, was a short hold.

**What a poll sees.** Every value either byte held in any log is 0 to 63, top two bits clear, as the
firmware says. `0x3A1` at rest read 13 at the start of A's map run, Vol +, the last key of the free
pressing on the same unit before it, consistent with nothing clearing it while the remote runs, and 53 at
the start of B's check, which no filed log explains. It read 0 at the start of A's first two sessions, the
second of them after the remote had been opened; that a start leaves it 0 fits, and is not read here.
Glow (41) appeared on `0x3A1` only in the map run, a press shorter than one poll of `0x295`, the one such
press in all four logs, which is why both bytes are watched. The scanner ran with the remote on the
cable and, by the bench notes, its USB screen showing, which is not true of the Harmony 600 and the One,
section 48.

## Width

The firmware facts hold on the 880, 885 and 880 Pro images (one build), the 720's press handler at its
own address; the 785 is not checked. Every key's name is measured on one Harmony 885 and sixteen of them
again on a second; an 880's are not measured, and its two missing codes, 19 and 60, are Green and Yellow
on an 885. The bootloader keys are named through the application's scanner and section 144's shared
arithmetic, not by holding a key at power on.

## Reviewers

A blind re-measurement reproduced the addresses, the writer census, the raise counts, the hold logic, the
880 and 720 comparisons, every name to code pair, the nine never raised and the closure; it doubted the 8
and 7 order and the Pause and Play pair, both recorded above. A prose audit's findings were taken: the
survey is read from the lab rather than restated, the window in `presses` is set from the widest pair, the
free press holds 48 codes and not every key, the closure test is titled for what each unit gives, the hold
flags and the 720's `0xA1` writes are censused, the 720's sentence narrowed to its press handler, `0x296`
shown to feed the debounce, and the reference's bootloader key sentences carry the bootloader's footnote.
"""
import csv
import io
import re
import unittest

import lab
from harmony import gspm
from harmony.pic18 import isa
from harmony.pic18 import trace
from .test_harmony_885_start_check import (BASE, CODE_END, OTHER_APPLICATIONS, SKIN_OFFSETS, application,
                                          by_name, listing, text, transfers_to, window)

LOGS = ('h885_a_keys_before_cleaning', 'h885_a_keys_free_press', 'h885_a_keys_map', 'h885_b_keys_check')
HELD, LAST = 0x295, 0x3A1
HELD_720 = 0x296

#: Every key of the face and the scan code it raised on the units.
MEASURED = {
    'Activities': 1, 'Power': 2, 'Help': 3,
    'screen left 1': 5, 'screen left 2': 6, 'screen left 3': 7, 'screen left 4': 8,
    'Device': 10, 'Mute': 11, 'arrow left below the screen': 12,
    'Vol +': 13, 'd-pad left': 14, 'Vol -': 15, 'd-pad up': 16,
    'Menu': 17, 'Exit': 18, 'Green': 19, 'Red': 20,
    'Stop': 21, 'Rec': 22, 'Rew': 23, 'Replay': 24,
    '1': 25, '4': 26, '8': 27, '7': 29, 'Clear': 31, '0': 32,
    'OK': 33, 'd-pad down': 34, 'd-pad right': 35, 'Ch -': 36,
    'Ch +': 37, 'Media': 38, 'Prev': 40, 'Glow': 41,
    'arrow right below the screen': 43,
    'screen right 4': 44, 'screen right 1': 45, 'screen right 2': 46, 'screen right 3': 48,
    'Guide': 50, 'Info': 51, 'Blue': 52, 'Skip': 53, 'Fwd': 54, 'Pause': 55, 'Play': 56,
    '2': 57, '3': 58, '6': 59, 'Yellow': 60, '5': 61, '9': 62, 'Enter': 63,
}
#: The configuration's key table leaves these empty, `reference/remotes/harmony-885/keys.md`.
EMPTY = (4, 9, 28, 30, 39, 42, 47, 49, 64)

#: The survey's legends where they are not spelled as this file names the key.
SURVEY_NAMES = {
    'Custom Button 1 (Top Left)': 'screen left 1', 'Custom Button 3 (2nd Left)': 'screen left 2',
    'Custom Button 5 (3rd Left)': 'screen left 3', 'Custom Button 7 (Bottom Left)': 'screen left 4',
    'Custom Button 2 (Top Right)': 'screen right 1', 'Custom Button 4 (2nd Right)': 'screen right 2',
    'Custom Button 6 (3rd Right)': 'screen right 3', 'Custom Button 8 (Bottom Right)': 'screen right 4',
    'Arrow Left (Below Screen)': 'arrow left below the screen',
    'Arrow Right (Below Screen)': 'arrow right below the screen',
    'D-Pad Left': 'd-pad left', 'D-Pad Up': 'd-pad up', 'D-Pad Down': 'd-pad down', 'D-Pad Right': 'd-pad right',
    'D-Pad OK': 'OK', '7s': '7', '+ Clear': 'Clear', '0 Space': '0', 'E Enter': 'Enter',
}
ABSENT = '[Key Not Present]'

AGAIN = 'the same code again, a second press not named'
PAUSE_OR_PLAY = 'Pause or Play'
UNNAMED = 'not named'

#: Unit A's map run: the step list as pressed, in order, the key named and the code it raised, None where the
#: key registered nothing. Steps 1 to 14 of `2.4-keys-reading.md` section 6 in the lab, then what the bench
#: notes record after them. Names are the step list's; the unnamed entries are said why in the header.
A_MAP = (
    # 1. Activities, Power, Help.
    ('Activities', 1), ('Power', 2), ('Help', 3),
    # 2. The four keys left of the screen, top to bottom.
    ('screen left 1', 5), ('screen left 2', 6), ('screen left 3', 7), ('screen left 4', 8),
    # 3. Device, Mute, the arrow left below the screen.
    ('Device', 10), ('Mute', 11), ('arrow left below the screen', 12),
    # 4. Vol +, d-pad left, Vol -, d-pad up.
    ('Vol +', 13), ('d-pad left', 14), ('Vol -', 15), ('d-pad up', 16),
    # 5. Menu, Exit, Green, Red. Exit did not register.
    ('Menu', 17), ('Exit', None), ('Green', 19), ('Red', 20),
    # 6. Stop, Rec, Rew, Replay.
    ('Stop', 21), ('Rec', 22), ('Rew', 23), ('Replay', 24),
    # 7. 1, 4, 8, 7, Clear, 0. 0 did not register.
    ('1', 25), ('4', 26), ('8', 27), ('7', 29), ('Clear', 31), ('0', None),
    # 8. OK, d-pad down, d-pad right, Ch -. The first three did not register.
    ('OK', None), ('d-pad down', None), ('d-pad right', None), ('Ch -', 36),
    # 9. Ch +, Media, Prev, Glow.
    ('Ch +', 37), ('Media', 38), ('Prev', 40), ('Glow', 41),
    # 10. The arrow right below the screen, then the four keys right of the screen, bottom to top.
    ('arrow right below the screen', 43),
    ('screen right 4', 44), ('screen right 3', 48), ('screen right 2', 46), ('screen right 1', 45),
    # 11. Guide, Skip, Fwd, Pause, Play, Info, Blue. Code 50 twice; the pair after Fwd as the header says.
    ('Guide', 50), (AGAIN, 50), ('Skip', 53), ('Fwd', 54), (PAUSE_OR_PLAY, 56), (PAUSE_OR_PLAY, 55),
    ('Info', 51), ('Blue', 52),
    # 12. 2, 3, 6, Yellow, 5, 9, Enter.
    ('2', 57), ('3', 58), ('6', 59), ('Yellow', 60), ('5', 61), ('9', 62), ('Enter', 63),
    # 13. Hold Mute for three seconds: a short hold this time.
    ('Mute', 11),
    # 14. Any key not yet pressed: none.
    # The five that had not registered, pressed again.
    ('Exit', 18), ('0', 32), ('OK', 33), ('d-pad down', 34), ('d-pad right', 35),
    # Step 11's row again, names not recorded: codes in step 11's order under the measured names.
    (UNNAMED, 50), (UNNAMED, 53), (UNNAMED, 54), (UNNAMED, 55), (UNNAMED, 56), (UNNAMED, 51), (UNNAMED, 52),
    # Mute held, 3.85 s.
    ('Mute', 11),
    # The six pressed alone, names not recorded.
    (UNNAMED, 53), (UNNAMED, 52), (UNNAMED, 54), (UNNAMED, 55), (UNNAMED, 56), (UNNAMED, 51),
)

#: Unit B's check: the sixteen names the bench notes give, in the order the log shows the codes.
B_CHECK = (
    ('Guide', 50), ('Info', 51), ('Blue', 52), ('Skip', 53), ('Fwd', 54), ('Pause', 55), ('Play', 56),
    ('Activities', 1), ('Help', 3), ('screen left 4', 8), ('screen right 1', 45), ('Exit', 18), ('0', 32),
    ('OK', 33), ('d-pad right', 35), ('Enter', 63),
)

CHANGE = re.compile(r'^\s*([\d.]+)\s+0x([0-9a-f]+)\s+(\d+)\s+->\s+(\d+)\s*$')
RESTING = re.compile(r'^\s*resting 0x([0-9a-f]+) = (\d+)\s*$')

#: How far apart the two bytes may change and still be one press. The widest pairs in the four logs are
#: 0.15 s (Glow in the free pressing, `0x3A1` at 78.99, `0x295` at 79.14) and 0.11 s (OK in the map run);
#: a reviewer counted 86 of the paired changes in the same poll and 10 with `0x3A1` first by 0.02 to 0.03 s.
#: So the window sits just above the widest pair seen: below 0.15 Glow's free press splits in two.
#: What makes those two pairs wide, a first short contact or a slow poll, is not known.
PAIR_WINDOW = 0.2


def parse(name):
    """(resting {address: value}, [(seconds, address, old, new)]) of one watch log."""
    resting, changes = {}, []
    for line in lab.load(name).decode('utf-8').splitlines():
        m = RESTING.match(line)
        if m:
            resting[int(m.group(1), 16)] = int(m.group(2))
            continue
        m = CHANGE.match(line)
        if m:
            changes.append((float(m.group(1)), int(m.group(2), 16), int(m.group(3)), int(m.group(4))))
    return resting, changes


def presses(name, window_s=PAIR_WINDOW):
    """Every press a log shows, in order: (seconds, code, seconds held or None, which byte saw it).

    A press is `0x295` going to a nonzero code, held until `0x295` next changes. A change of `0x3A1` with no
    change of `0x295` to the same code within `window_s` is a press too short for a poll of `0x295`, and is
    counted once, from `0x3A1`.
    """
    _, changes = parse(name)
    held = [(t, new) for t, a, _, new in changes if a == HELD]
    out = []
    for n, (t, new) in enumerate(held):
        if new:
            end = held[n + 1][0] if n + 1 < len(held) else None
            out.append((t, new, None if end is None else round(end - t, 2), 'both'))
    for t, a, _, new in changes:
        if a == LAST and not any(abs(t - th) <= window_s and c == new for th, c in held):
            out.append((t, new, None, '0x3a1 only'))
    return sorted(out)


def survey():
    """The contributor's legend as {key name: scan code}, its 885 additions applied, and its absent codes.

    Read from the lab by name, not through the registry, like the other contributed files the 885 tests
    use; a skip when it is not there.
    """
    (raw,) = by_name('880-key-legend.csv')
    keys, absent = {}, set()
    for row in csv.reader(io.StringIO(raw.decode('utf-8'))):
        if len(row) != 2 or not re.fullmatch(r'K\d+', row[0]):
            continue
        code = int(row[0][1:])
        # The 885 additions come after the 880's list and override its codes 19, 20, 56 and 60.
        for name in [n for n, c in keys.items() if c == code]:
            del keys[name]
        absent.discard(code)
        if row[1] == ABSENT:
            absent.add(code)
        else:
            keys[SURVEY_NAMES.get(row[1], row[1])] = code
    return keys, absent


def banked_writes(body, offset):
    """Every banked write to `offset` in a listing, with the bank its nearest earlier `MOVLB` names."""
    out = []
    for n, (a, ins) in enumerate(body):
        f = ins.fields
        if 'f' not in f or f.get('a') != 1 or f['f'] != offset:
            continue
        writes = ins.mnemonic in ('CLRF', 'MOVWF', 'SETF', 'NEGF', 'BSF', 'BCF', 'BTG') \
            or ('d' in f and f['d'] == 1 and ins.category != isa.BIT)
        if not writes:
            continue
        bank = next((i.fields['k'] for _, i in reversed(body[:n]) if i.mnemonic == 'MOVLB'), None)
        out.append((a, text(ins), text(body[n - 1][1]), bank))
    return out


class WhereTheKeyLives(unittest.TestCase):
    """Read in the firmware, 885 application 4.4."""

    @classmethod
    def setUpClass(cls):
        cls.code = application()
        cls.body = listing(cls.code, BASE, CODE_END)

    def test_three_clears_and_one_copy_of_the_scan_are_every_write_of_0x295(self):
        writes = banked_writes(self.body, 0x95)
        self.assertEqual([(a, t, before) for a, t, before, _ in writes],
                         [(0x1891E, 'CLRF 0x95', 'MOVLB 0x2'), (0x18C9C, 'CLRF 0x95', 'MOVLB 0x2'),
                          (0x18CEE, 'CLRF 0x95', 'MOVLB 0x2')])
        moves = [(a, text(i)) for a, i in self.body if i.mnemonic == 'MOVFF' and i.fields.get('dst') == HELD]
        self.assertEqual(moves, [(0x18CA2, 'MOVFF 0x2b4,0x295')])
        # The value copied is the scanner's: the handler opens with the call and keeps W in 0x2B4.
        self.assertEqual(window(self.code, 0x18C68, 3), ['RCALL 0x18a16', 'MOVLB 0x2', 'MOVWF 0xb4'])

    def test_0x3a1_is_written_by_one_instruction_from_0x295_and_no_instruction_clears_it(self):
        hits = trace.trace(self.code[:CODE_END - BASE], BASE, [LAST])[LAST]
        self.assertEqual([(h.addr, h.kind, h.detail) for h in hits], [(0x18CA6, 'MOVFF WRITE', '<- 0x295')])
        writes = banked_writes(self.body, 0xA1)
        self.assertEqual(len(writes), 34)
        self.assertEqual(sorted({bank for *_, bank in writes}), [1, 2])

    def test_the_event_type_is_ored_on_only_as_an_event_is_raised(self):
        raised = []
        for n in range(len(self.body) - 4):
            seq = [text(i) for _, i in self.body[n:n + 5]]
            if seq[0].startswith('MOVLW') and seq[1:] == ['MOVLB 0x2', 'IORWF 0x95,W', 'MOVLB 0x3', 'MOVWF 0x9c']:
                raised.append((self.body[n][0], seq[0].split()[1], text(self.body[n + 5][1])))
        self.assertEqual(raised, [(0x18C54, '0xc0', 'CALL 0x12eb4'), (0x18C88, '0x40', 'CALL 0x12eb4'),
                                  (0x18CAE, '0x80', 'CALL 0x12eb4'), (0x18CDA, '0x40', 'CALL 0x12eb4')])

    def test_the_hold_is_armed_by_the_press_alone_and_runs_out_once(self):
        self.assertEqual(transfers_to(self.code, 0x19BA0), [0x18CCA])
        self.assertEqual(window(self.code, 0x18CBC, 3), ['MOVLB 0x3', 'MOVF 0x08,W', 'MULLW 0x0a'])
        self.assertEqual(window(self.code, 0x19BA0, 4), ['MOVLB 0x0', 'MOVLW 0x01', 'MOVWF 0xf0', 'CLRF 0xf1'])
        # Running out sets 0x0F1, the key service's cue to raise 0xC0, and clears 0x0F0.
        self.assertEqual(window(self.code, 0x19CA4, 3), ['MOVLW 0x01', 'MOVWF 0xf1', 'CLRF 0xf0'])
        self.assertEqual(window(self.code, 0x18C50, 2), ['MOVF 0xf1,W', 'BZ 0x18c66'])

    def test_the_hold_flags_have_these_writers_and_no_others(self):
        """The census behind "once": only the press arms, only the expiry sets the fired flag."""
        in_bank_0 = {off: [(a, t) for a, t, _, bank in banked_writes(self.body, off) if bank == 0]
                     for off in (0xF0, 0xF1)}
        self.assertEqual(in_bank_0, {
            0xF0: [(0x19B96, 'CLRF 0xf0'), (0x19BA4, 'MOVWF 0xf0'), (0x19CA8, 'CLRF 0xf0')],
            0xF1: [(0x18C64, 'CLRF 0xf1'), (0x19B98, 'CLRF 0xf1'), (0x19BA6, 'CLRF 0xf1'), (0x19CA6, 'MOVWF 0xf1')],
        })

    def test_a_release_is_raised_only_while_the_hold_is_armed(self):
        # Each release tests the armed flag and, when it is clear, branches past its raise to the cancel.
        for check, raise_at, cancel in ((0x18C84, 0x18C88, 0x18C96), (0x18CD6, 0x18CDA, 0x18CE8)):
            with self.subTest(hex(check)):
                self.assertEqual(window(self.code, check, 2), ['MOVF 0xf0,W', 'BZ 0x%05x' % cancel])
                self.assertEqual(window(self.code, raise_at, 1), ['MOVLW 0x40'])
                self.assertEqual(window(self.code, cancel, 1), ['CALL 0x19b94'])

    def test_the_hold_delay_is_set_to_75_at_start_and_an_instruction_sets_it(self):
        self.assertEqual(window(self.code, 0x12EA8, 2), ['MOVLW 0x4b', 'MOVWF 0x08'])
        self.assertEqual(window(self.code, 0x12E98, 1), ['MOVLB 0x3'])
        self.assertEqual(transfers_to(self.code, 0x12E94), [0x16DC6])
        self.assertEqual(window(self.code, 0x131A0, 1), ['MOVFF 0x3ae,0x308'])
        hits = trace.trace(self.code[:CODE_END - BASE], BASE, [0x308])[0x308]
        self.assertEqual([h.addr for h in hits if 'WRITE' in h.kind], [0x12EAA, 0x131A0])

    def test_on_the_885_0x296_feeds_the_debounce_and_is_not_a_key(self):
        hits = trace.trace(self.code[:CODE_END - BASE], BASE, [HELD_720])[HELD_720]
        self.assertEqual([(h.addr, h.kind) for h in hits], [(0x18932, 'MOVWF WRITE'), (0x18948, 'MOVFF read')])
        # The keypad init: index 2 and default 25 handed to 0x18284, its answer kept at 0x296.
        self.assertEqual(window(self.code, 0x18920, 10),
                         ['MOVLB 0x1', 'MOVLW 0x19', 'MOVWF 0x05', 'MOVLB 0x1', 'MOVLW 0x02', 'MOVWF 0x04',
                          'CALL 0x18284', 'MOVLB 0x2', 'MOVWF 0x96', 'BCF 0xff2,3'])
        # The port B change handler copies it into 0x0ED and arms; the arm loads the countdown 0x0E8 from it,
        # which the timer counts down to set 0x0EA, the key service's cue to scan.
        self.assertEqual(window(self.code, 0x18948, 2), ['MOVFF 0x296,0x0ed', 'CALL 0x19b7e'])
        self.assertEqual(window(self.code, 0x19B86, 1), ['MOVFF 0x0ed,0x0e8'])
        self.assertEqual(window(self.code, 0x19C82, 4), ['DECF 0xe8', 'BNZ 0x19c8c', 'MOVLW 0x01', 'MOVWF 0xea'])
        self.assertEqual(window(self.code, 0x18C3E, 3), ['MOVLB 0x0', 'MOVF 0xea,W', 'BZ 0x18c4e'])


class TheSameOnTheOtherBuilds(unittest.TestCase):
    """Skins 15 and 39 run the 885's routine byte for byte; the 720's press handler is its own build."""

    def test_the_880_and_the_880_pro_have_the_routines_byte_for_byte(self):
        code = application()
        lab.require('arch8_code_880')
        others = {'880': lab.load('arch8_code_880')}
        (others['880 Pro'],) = by_name(OTHER_APPLICATIONS['880 Pro'])
        skins = {}
        for model, image in others.items():
            with self.subTest(model):
                for start, end in ((0x1891C, 0x1893C), (0x18A16, 0x18CF6)):
                    self.assertEqual(image[start - BASE:end - BASE], code[start - BASE:end - BASE])
                skins[model] = image[SKIN_OFFSETS[0]]
        self.assertEqual(skins, {'880': 15, '880 Pro': 39})
        self.assertEqual(code[SKIN_OFFSETS[0]], 17)

    def test_the_720_keeps_the_held_key_at_0x296_and_copies_it_to_0x3a1(self):
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        hits = trace.trace(h720[:CODE_END - BASE], BASE, [HELD_720, LAST])
        writes = [(h.addr, h.kind, h.detail) for h in hits[HELD_720] if 'WRITE' in h.kind]
        self.assertEqual(writes, [(0x1816C, 'CLRF WRITE', ''), (0x184F2, 'CLRF WRITE', ''),
                                  (0x184F8, 'MOVFF WRITE', '<- 0x2BC'), (0x18544, 'CLRF WRITE', '')])
        self.assertEqual([(h.addr, h.kind, h.detail) for h in hits[LAST]], [(0x184FC, 'MOVFF WRITE', '<- 0x296')])
        # No banked write to an offset 0xA1 runs in bank 3 there either.
        banks = {bank for *_, bank in banked_writes(listing(h720, BASE, CODE_END), 0xA1)}
        self.assertNotIn(3, banks)
        # The same handler shape: scan, keep, compare with the held key.
        self.assertEqual(window(h720, 0x184BE, 6),
                         ['RCALL 0x1826c', 'MOVLB 0x2', 'MOVWF 0xbc', 'MOVF 0xbc,W', 'BZ 0x18524', 'MOVLB 0x2'])
        self.assertEqual(window(h720, 0x184CA, 1), ['MOVF 0x96,W'])


class TheBenchLogs(unittest.TestCase):
    """Measured on a unit, two units."""

    def setUp(self):
        lab.require(*LOGS)

    def test_every_value_either_byte_held_is_a_bare_scan_code(self):
        values = set()
        for name in LOGS:
            resting, changes = parse(name)
            values |= set(resting.values())
            for _, a, old, new in changes:
                self.assertIn(a, (HELD, LAST))
                values |= {old, new}
        self.assertEqual(max(values), 63)
        self.assertEqual(sorted(v for v in values if v & 0xC0), [])

    def test_unit_a_s_map_run_is_the_step_list_as_asked(self):
        logged = [code for _, code, _, _ in presses('h885_a_keys_map')]
        expected = [code for _, code in A_MAP if code is not None]
        self.assertEqual(logged, expected)
        self.assertEqual(len(logged), 71)

    def test_every_named_key_raised_its_measured_code_on_unit_a(self):
        named = [(n, c) for n, c in A_MAP if c is not None and n not in (AGAIN, PAUSE_OR_PLAY, UNNAMED)]
        self.assertEqual([(n, c) for n, c in named if MEASURED[n] != c], [])
        # 53 of the 55 keys by name; Pause and Play only as the pair below.
        self.assertEqual(len({n for n, _ in named}), 53)
        pair = [c for n, c in A_MAP if n == PAUSE_OR_PLAY]
        self.assertEqual(sorted(pair), [MEASURED['Pause'], MEASURED['Play']])

    def test_the_first_pass_of_the_transport_row_raised_pause_and_play_in_the_reverse_order(self):
        """The step text asks Pause then Play, and the log has 56 then 55: the keys were pressed in the other
        order, as the check by position shows, `ThePositionCheck`."""
        pair = [c for n, c in A_MAP if n == PAUSE_OR_PLAY]
        self.assertEqual(pair, [56, 55])
        self.assertEqual((MEASURED['Pause'], MEASURED['Play']), (55, 56))

    def test_unit_b_raised_the_code_of_each_of_its_sixteen_named_keys(self):
        logged = [code for _, code, _, _ in presses('h885_b_keys_check')]
        self.assertEqual(logged, [c for _, c in B_CHECK])
        self.assertEqual([(n, c) for n, c in B_CHECK if MEASURED[n] != c], [])
        self.assertEqual(len(B_CHECK), 16)

    def test_both_units_give_the_six_the_survey_names_otherwise(self):
        legend, _ = survey()
        six = {n for n in MEASURED if MEASURED[n] != legend[n]}
        self.assertEqual(six, {'Info', 'Blue', 'Skip', 'Fwd', 'Pause', 'Play'})
        self.assertEqual({n: legend[n] for n in six},
                         {'Skip': 51, 'Fwd': 52, 'Pause': 53, 'Play': 54, 'Info': 55, 'Blue': 56})
        self.assertEqual({n: MEASURED[n] for n in six},
                         {'Info': 51, 'Blue': 52, 'Skip': 53, 'Fwd': 54, 'Pause': 55, 'Play': 56})
        # Unit B by name, all six.
        self.assertEqual({n: c for n, c in B_CHECK if n in six}, {n: MEASURED[n] for n in six})
        # Unit A by name, the four its first pass names; every one contradicts the survey.
        on_a = {n: c for n, c in A_MAP if n in six}
        self.assertEqual(on_a, {'Skip': 53, 'Fwd': 54, 'Info': 51, 'Blue': 52})
        self.assertEqual([n for n, c in on_a.items() if legend[n] == c], [])
        # Unit A's second pass of the row, in step 11's order: Guide, Skip, Fwd, Pause, Play, Info, Blue.
        second = [c for n, c in A_MAP if n == UNNAMED][:7]
        self.assertEqual(second, [MEASURED[k] for k in ('Guide', 'Skip', 'Fwd', 'Pause', 'Play', 'Info', 'Blue')])
        # The six pressed alone are the six codes, each once.
        alone = [c for n, c in A_MAP if n == UNNAMED][7:]
        self.assertEqual(sorted(alone), list(range(51, 57)))

    def test_the_survey_agrees_on_the_other_49_and_its_six_are_a_rotation(self):
        """The calibration: the comparison that finds the six finds no other key, read from the survey itself."""
        legend, absent = survey()
        self.assertEqual(set(legend), set(MEASURED))
        self.assertEqual(sum(1 for n in MEASURED if MEASURED[n] == legend[n]), 49)
        self.assertEqual(sorted(absent), list(EMPTY[:-1]))
        order = ('Skip', 'Fwd', 'Pause', 'Play', 'Info', 'Blue')
        surveyed = [legend[n] for n in order]
        measured = [MEASURED[n] for n in order]
        self.assertEqual(surveyed, list(range(51, 57)))
        self.assertEqual(measured, surveyed[2:] + surveyed[:2])

    def test_the_codes_never_raised_are_the_key_tables_empty_codes(self):
        seen = set()
        for name in LOGS:
            seen |= {code for _, code, _, _ in presses(name)}
        self.assertEqual(len(seen), 55)
        self.assertEqual(sorted(set(range(1, 65)) - seen), list(EMPTY))
        self.assertEqual(seen, set(MEASURED.values()))

    def test_unit_a_raised_exactly_its_tables_press_codes_and_unit_b_a_subset_of_its_own(self):
        """Data memory against flash, the closure: on A the run and the key table are the same 55 codes."""
        lab.require('h885_a_config', 'h885_b_config')
        sizes = {}
        for unit, log in (('h885_a_config', 'h885_a_keys_map'), ('h885_b_config', 'h885_b_keys_check')):
            with self.subTest(unit):
                c = gspm.parse(lab.load(unit))
                table = {k.event_code & gspm.SCAN_MASK for k in c.keys if k.event_type == gspm.EVENT_PRESS}
                self.assertEqual(len(table), 55)
                raised = {code for _, code, _, _ in presses(log)}
                self.assertEqual(raised - table, set())
                sizes[unit] = len(raised)
                if unit == 'h885_a_config':
                    self.assertEqual(raised, table)
        self.assertEqual(sizes, {'h885_a_config': 55, 'h885_b_config': 16})

    def test_the_held_byte_stays_for_a_whole_hold(self):
        mute = [(t, held) for t, code, held, _ in presses('h885_a_keys_map') if code == MEASURED['Mute']]
        self.assertEqual([held for _, held in mute], [0.16, 0.71, 3.85])
        _, changes = parse('h885_a_keys_map')
        start = mute[-1][0]
        during = [(t, a, o, n) for t, a, o, n in changes if a == HELD and start <= t <= start + 3.85]
        self.assertEqual([(o, n) for _, _, o, n in during], [(0, 11), (11, 0)])

    def test_one_press_in_all_four_logs_was_seen_on_0x3a1_alone_and_it_was_glow(self):
        only = {name: [(code, seen) for _, code, _, seen in presses(name) if seen != 'both'] for name in LOGS}
        self.assertEqual(only, {'h885_a_keys_before_cleaning': [], 'h885_a_keys_free_press': [],
                                'h885_a_keys_map': [(MEASURED['Glow'], '0x3a1 only')], 'h885_b_keys_check': []})
        self.assertEqual({name: len(presses(name)) for name in LOGS}, {
            'h885_a_keys_before_cleaning': 15, 'h885_a_keys_free_press': 71, 'h885_a_keys_map': 71,
            'h885_b_keys_check': 16})

    def test_the_pair_window_sits_just_above_the_widest_pair(self):
        """The control on `PAIR_WINDOW`: below 0.15 s Glow's free press, 0.15 s apart, counts twice."""
        narrow = [code for _, code, _, seen in presses('h885_a_keys_free_press', 0.14) if seen != 'both']
        self.assertEqual(narrow, [MEASURED['Glow']])
        self.assertEqual(len(presses('h885_a_keys_free_press', 0.14)), 72)

    def test_0x3a1_rests_on_a_key_and_on_unit_a_the_last_one_pressed(self):
        """At rest 0x295 is 0. 0x3A1 is 0 at the start of the first two sessions, which this file does not
        explain, the last key of the session before on unit A's map run, and on unit B a key no filed log
        shows."""
        self.assertEqual({name: parse(name)[0] for name in LOGS}, {
            'h885_a_keys_before_cleaning': {HELD: 0, LAST: 0},
            'h885_a_keys_free_press': {HELD: 0, LAST: 0},
            'h885_a_keys_map': {HELD: 0, LAST: 13},
            'h885_b_keys_check': {HELD: 0, LAST: 53},
        })
        # The map run on unit A started where the free pressing on the same unit ended, Vol +.
        _, changes = parse('h885_a_keys_free_press')
        self.assertEqual([n for _, a, _, n in changes if a == LAST][-1], MEASURED['Vol +'])

    def test_before_cleaning_mute_read_32_first_and_12_and_13_never_came(self):
        logged = [code for _, code, _, _ in presses('h885_a_keys_before_cleaning')]
        self.assertEqual(logged, [1, 2, 3, 5, 6, 7, 8, 10, 32, 11, 11, 8, 11, 14, 15])
        _, changes = parse('h885_a_keys_before_cleaning')
        straight = [(t, o, n) for t, a, o, n in changes if a == HELD and o and n]
        self.assertEqual([(o, n) for _, o, n in straight], [(32, 11)])
        t32 = next(t for t, a, o, n in changes if a == HELD and n == 32)
        self.assertEqual(round(straight[0][0] - t32, 2), 0.07)
        for code in (12, 13, 16):
            self.assertNotIn(code, logged)

    def test_the_free_pressing_raised_48_codes_each_a_key(self):
        codes = {code for _, code, _, _ in presses('h885_a_keys_free_press')}
        self.assertEqual(codes - set(MEASURED.values()), set())
        self.assertEqual(len(codes), 48)
        self.assertEqual(sorted(set(MEASURED.values()) - codes), [1, 2, 5, 6, 7, 11, 37])
        self.assertIn(MEASURED['Vol +'], codes)


#: The position check as asked: the colour keys along their curve from left to right, then the top right key
#: of the transport block and the key below it. The names are the manual's drawing of those positions, so
#: no name here rests on telling the colours apart or on an order of names.
BY_POSITION = [('Red', 20), ('Green', 19), ('Yellow', 60), ('Blue', 52), ('Play', 56), ('Pause', 55)]


class ThePositionCheck(unittest.TestCase):
    """Measured on a unit, unit B, keys asked by where they sit rather than by name."""

    def setUp(self):
        lab.require('h885_b_keys_by_position')

    def test_the_colour_keys_and_play_and_pause_raised_their_codes_by_position(self):
        logged = [code for _, code, _, _ in presses('h885_b_keys_by_position')]
        self.assertEqual(logged, [c for _, c in BY_POSITION])

    def test_every_name_the_position_check_gives_is_the_code_the_map_already_held(self):
        self.assertEqual([(n, c) for n, c in BY_POSITION if MEASURED[n] != c], [])
        self.assertEqual(len(BY_POSITION), 6)

    def test_so_the_first_pass_of_the_transport_row_is_the_one_out_of_order(self):
        first = [c for n, c in A_MAP if n == PAUSE_OR_PLAY]
        by_position = dict(BY_POSITION)
        self.assertEqual(first, [by_position['Play'], by_position['Pause']])


if __name__ == '__main__':
    unittest.main()
