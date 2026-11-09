"""
Which key of a Harmony 880 raises which scan code, as far as Logitech's own compiles for the 880 can say.

Item 2.5.2 of `todo/todo-prepare-885.md`. **Measured in configurations**: no Harmony 880 has been pressed on
a unit, and nothing in this file opens a remote. The 880's drawing, `packages/silhouettes/src/models/h880.ts`,
carries exactly `ESTABLISHED_880`, which `tests/firmware/test_silhouettes.py` holds it to.

## The idea

A configuration binds a command to a scan code and names neither the key nor the command. But a command is
the device's own infrared code, and Logitech's device database, the infrared archive (decision 15), names
it: decoded and looked up in the device's codeset, a bound code is `Pause`, or `5`, or `Mute`. Logitech's
compiler put a device's `Pause` on the key it calls Pause, so a compile for skin 15 says which code its
Pause key is, without anybody pressing it. That is the claim this file tests, and the 885 is where it can be
scored, because every one of its keys was pressed on a unit, `MEASURED` in `tests/harmony_880_885/test_harmony_885_keys.py`.

## Sources checked before the work

* **Logitech's clients, decision 2.** MyHarmony, `../lab/work/myharmony/src/`, holds no key map per skin: a
  button map (`ButtonMap`, `RemoteSkin`, `Surface` there) is a data contract filled by Logitech's service,
  and MyHarmony does not serve this platform. The classic client, `../lab/software/classic/`, which did
  serve it, lists skin 15 as the 880 in `res/client/skins/logitech/intl/remote/remote.properties` and holds
  no key map either; its button pages are served. So neither client answers the question.
* **The reference**: `reference/remotes/harmony-885/keys.md` held no code for an 880 key and the two
  chevron candidates; sections 177 (the key table states the hardware: an 880's 53 codes are an 885's less
  19 and 60) and 128; section 133, the same naming route for the Harmony One and 600, there through
  Logitech's button maps.
* **The firmware**: the 880's keypad routines are the 885's byte for byte, `TheSameOnTheOtherBuilds` in
  `tests/harmony_880_885/test_harmony_885_keys.py`, so the arithmetic from line and input to code is shared; which key the
  board wires to which line and input is not in the firmware.
* **The archive**, read through `packages/codec/src/catalogue/catalogue.ts` as `packages/codec/test/catalogue/catalogue.test.ts`
  does, and the earlier scratch of this step, a lead re-derived here rather than adopted.

## The population

Ten files state skin 15 in their headers, from **two contributors**: guyman70718's four `Update*.EZHex`,
one installation compiled four times as it grew, and kkong42's six, five of one bedroom installation
(`H885-Bedroom.EZHex` among them, named 885 by its owner and skin 15 by its header) and `H880-Spare-4.EZHex`,
a second 880 set up with other devices. The calibration is the skin 17 files: kkong42's four living room
files, one installation, and the two bench 885s' configurations read off the units, whose previous owners
are not known and so count as one contributor. The unit of evidence is a **device of an installation**, and
the threshold counts **contributors**: a file is a copy, and one person's two setups share that person's
habits.

## The reading

* **Which bindings**: every press binding of an activity's key map (`keyCodes`, base slot 9 sets) and of a
  device's own keypad map (`deviceModeMaps`). All 4871 over the sixteen configurations send one code each, so
  no macro is in play.
* **Which name**: a device's decoded numbers are matched against the archive, and the codesets holding the
  most of them are pinned in `PINS`, every tie included, since Logitech keeps near identical codesets per
  model range. A code's name is the union of what the tied codesets call it.
* **Which key a name is**: `COMMAND_KEYS`, fixed before anything was scored. A command names a key when its
  name is the key's own (`Pause`, `ChannelUp`, `Select`) or what the key carries printed (a digit, `Mute`,
  `OK`). A binding names a key only when every name its code carries names that same key.
* **The rule**: a code gets the key that more devices name on it than any other, provided devices of two
  contributors name it; and a device that names one key on several codes counts for none of them.

## What it found

**29 of the 880's 53 keys get a code, and every one is the code the same key raised on an 885**:
Mute 11, Vol + 13, the d-pad 14, 16, 34 and 35 with OK 33, Vol - 15, Menu 17, Exit 18, Stop 21, Rec 22, Rew 23,
the ten digits on the 885's codes, Ch - 36, Ch + 37, Info 51, Fwd 54, Pause 55 and Play 56.
`PER_CONTRIBUTOR` holds how many devices of each contributor name each key. **The weakest nine** rest on one
device of guyman70718's beside two to five of kkong42's: the channel keys and Exit on a television, and Stop,
Rew, Info, Fwd, Pause and Play on a game console that only the last two of the four files hold. Without that
game console those six would have one contributor and no code; without that television, the other three.
No other single device's removal changes the answer. Every one of the nine is the 885's code all the same.
`PER_FILE` holds the counts per file: 1447 bindings over the ten name a key, 1341 of them on the code
established for that key, 92 on a code that establishes nothing and 14 on another key's; the bedroom
installation's five files are copies and count five times there, and once in everything above.

**24 keys get no code.** Activities, Power, Help, Device, Media, Glow, the eight keys beside the screen and the
two arrows under it: no command bound carries their names, and in the key maps read here no infrared
command at all is bound to the codes they raise on an 885; the ten files' bindings sit on 37 scan codes,
none of them these (the screen keys' pages are not read here). Prev and Enter are bound, but not under a name
of their own: 40 carries `ChannelPrev`, alone or tied with `LastView`, `Back` or a `PreCh`, on six devices
of both contributors, and `COMMAND_KEYS` was fixed without it (`ChannelPrev` is neither the key's own name
nor what it carries printed); `Enter` appears only on OK's code, 33, always beside `Select` or
`NumberEnter`. Four keys are named unambiguously by one contributor only, each on the 885's code: Guide on 50
by three devices of kkong42's bedroom installation (two more, one of each contributor, carry `Guide` tied
with `TeletextStore`), Replay on 24 and Skip on 53 by two of them, and Clear on 31 by one device of
guyman70718's. And the two chevron keys, below. **Had `ChannelPrev` and the names tied with it, `LastView`
and the two spellings of `PreCh`, been taken as Prev's**, 40 would be Prev on the 880, 30 keys, and the 885
would give 33 codes, still none wrong; `ChannelPrev` alone gives Prev one contributor and changes nothing,
`test_prev_would_follow_from_a_wider_name_list`. It is recorded and not taken, since the list was fixed
before scoring.

**The rule changed once, and this is the record.** As first written it counted every naming and gave 31,
Replay on 24 and Skip on 53 beside the 29, their guyman70718 side being the game console alone. The blind
re-measurement, with its own name list, gave 29 and left those two out, and what it pointed at is in the
data: that game console puts `SkipBack` on 20, 24 and 36 and `SkipForward` on 37, 52 and 53, and a television
of kkong42's puts `Rewind` on 23 and 24 and `FastForward` on 53 and 54. A device naming one key on several
codes says nothing about which of them is that key, which is the step's own criterion ("a command whose name
says unambiguously which key it is") applied per device, so such a device now counts for none of them.
**The guard was chosen after the 880's answer was seen, and on the 880 it cost two keys the 885 shows are
right and prevented no wrong answer.** On the 885 it changes nothing at two contributors, 32 either way, and
at one contributor it alone removes the one wrong answer, below. Two keys lost to caution against a code
nobody can check later is the trade taken. `test_replay_and_skip_had_their_second_contributor_from_a_device_naming_each_on_three_codes`
holds the first rule's answer.

**The calibration, the same procedure on the 885**: 32 codes, every one the code its key raised on a unit,
no wrong answer, and 23 of its 55 keys left without one. **Each guard is a control for the other**: with one
contributor enough it gives 37 codes and none wrong; with one contributor enough and a device naming a key
on several codes counted, 39 and one wrong, Green on 40, which is Prev. The 885's compiles name Replay and
Skip on their codes by one device each, so the calibration never reached those two names. **The calibration
is not wholly independent of the 880's evidence**: its two contributors are kkong42, who also gave six of the
ten 880 files, and the bench units' previous owners, and kkong42's 880 and 885 setups share a set top box
family whose tied codesets overlap. The truth it is scored against, the units' presses, is independent.

**What would have falsified it**: a code on which devices of two contributors name, more than any other, a key
the 885 raises on another code. None does. What names a key on another key's code is one device each: on
skin 15 a media player's `Record` on Fwd's code, and four namings by the two devices set aside above; on the
885 one device's `Enter` on OK's code, and the two devices set aside there, which put Green on 19 and 40 and
Enter on 33 and 63. **The pattern that fits every point is one command repeated on several keys of a family**:
a previous command on 20, 24 and 36 and its next on 37, 52 and 53, a rewind on Rew and Replay, a fast forward
on Fwd and Skip, Green beside Prev, Enter beside OK. That the device lacks a command for the other key fits
some of them and not all: the game console has its own `SkipBack` for Replay and repeats it anyway. It is
why one device is not enough, and why a device repeating a key counts for none of its codes.

**Robustness**: names from the first tied codeset alone, or only from devices whose every number a codeset
holds, give the same 29; on the 885 the first codeset alone gives 35, all right.

**The chevrons**: three devices, two of guyman70718's and one of kkong42's second 880, put a previous command
on 20, 24 and 36 and its next on 37, 52 and 53 (`PresetPrev` and `PresetNext`, `SkipBack` and `SkipForward`,
and `ChapterPrev`/`PresetPrev` with `ChapterNext`/`PresetNext`, where tied codesets name the code both ways).
So 20 sits in a family with Replay and Ch -, and 52 with Skip and Ch +. Neither code is established: the
only key name either carries is the game console's `SkipBack` and `SkipForward`, which it repeats on three
codes each, and which chevron raises which stays open, `h880.ts`.

**The board survey**: the contributor's legend of an 880's circuit board has Fwd 52, Pause 53, Play 54 and
Info 55 (and Skip 51), which the 885's units contradicted. The 880's compiles put those four keys on 54, 55,
56 and 51, the units' codes, so as far as compiles can say the survey is wrong for an 880 too.

**Devices with no name at all**: five devices decode to no number `irFrame` reads, three media centre PCs,
a satellite receiver and one with no label, and three more match no codeset; their bindings carry no name.

## Width

The Harmony 880, skin 15, only; the 885 is the calibration. **The 880 Pro is not covered**: its one compile,
skin 39, one contributor's, names 24 codes, 23 of them the 885's code for the same key, and puts Mute on 20
where the 880 and 885 have it on 11, so it is at least one key another layout and this finding is not
carried to it. The 720, skin 44, is not checked.

## Not checked

That an 880's keys raise these codes when pressed: this rests on Logitech's compiler putting a key's own
command on that key, which the 885 shows it does for 32 keys of 32, Replay and Skip not among them. Whether
the contributors reassigned keys themselves is not knowable from a file; a reassignment would show as a
dissent above.

## Reviewers

**A blind re-measurement**, given the question and the corpus and not this answer, built its own name list in
two tiers and its own device threshold. On the 885 it scored 32 right, none wrong, 23 unassigned at two
contributors with its strict tier, the same as here, and one wrong, Green on 40, at one device. On the 880 its
strict tier gave these 29 and no other: its list held no `SkipBack` or `SkipForward`, and its loose tier, which
maps the skip family onto Replay and Skip, put Replay and Skip on 20 and 52 as well as on 24 and 53, which is
the repetition above. That disagreement over Replay and Skip is what the rule change resolves, in its direction.
It also found that the 880's files bind exactly the 885's bound codes less 19 and 60, and that the 880 Pro
agrees on every code but Mute's.

**A prose audit of the whole diff** re-ran every figure. Taken: the keys without a code were said to be named by
no command, where Prev's code carries `ChannelPrev` on six devices and Guide's carries `Guide` in a tie on two
more, so the text now says what the rule excludes and why, and `test_prev_would_follow_from_a_wider_name_list`
records the wider list; all three chevron devices, not one, repeat their pair on Replay's and Skip's codes and
the channel keys, now asserted; the chevrons are not established because the only key names on them come from
the repeating game console, not because a previous command names no key; Skip 53 was still cited as the
compiles' after the rule change; "four devices" set aside were four namings by two devices; the explanation of
the dissent fitted only part of it, and the one that fits every point is a command repeated over a family; the
weakest nine and the dependence on two single devices are now stated and tested; the guard is said to have been
chosen after the 880's answer was seen, and what it cost; the calibration shares a contributor with the 880's
evidence; the 880 Pro agrees on 23 of 24 codes, so it is not "nothing here carries"; "owners" became
"contributors"; and h880.ts counted the chevrons twice.
"""
import collections
import json
import os
import shutil
import subprocess
import tempfile
import unittest

import lab
from harmony import ezfile
from .test_harmony_885_keys import MEASURED, survey
from .test_harmony_885_start_check import by_name

#: The configurations, each with who contributed it and which installation of theirs it is. A file is not a
#: sample: one installation compiled several times is one setup, so evidence is counted per device of an
#: installation and per contributor.
SKIN_15 = (
    ('Update.EZHex', 'guyman70718', 'guyman70718'),
    ('Update-1.EZHex', 'guyman70718', 'guyman70718'),
    ('Update-2.EZHex', 'guyman70718', 'guyman70718'),
    ('Update-3.EZHex', 'guyman70718', 'guyman70718'),
    ('H880-Bedroom.EZHex', 'kkong42', 'kkong42 bedroom'),
    ('H880-Bedroom-Spare-1.EZHex', 'kkong42', 'kkong42 bedroom'),
    ('H880-Bedroom-Spare-2.EZHex', 'kkong42', 'kkong42 bedroom'),
    ('H880-Bedroom-Spare-3.EZHex', 'kkong42', 'kkong42 bedroom'),
    # Named 885 by its owner and skin 15 by its own header, so an 880's, `META.md` beside it.
    ('H885-Bedroom.EZHex', 'kkong42', 'kkong42 bedroom'),
    ('H880-Spare-4.EZHex', 'kkong42', 'kkong42 second 880'),
)
SKIN_17 = (
    ('H885-LivingRoom.EZHex', 'kkong42', 'kkong42 living room'),
    ('H885-LivingRoom-Spare-1.EZHex', 'kkong42', 'kkong42 living room'),
    ('H885-LivingRoom-Spare-2.EZHex', 'kkong42', 'kkong42 living room'),
    ('H885-LivingRoom-Spare-3.EZHex', 'kkong42', 'kkong42 living room'),
)
#: The two bench 885s' own configurations, read off the units: no header, so no skin stated; whoever set them
#: up before is not known, so the two count as one contributor.
BENCH = (('h885_a_config', 'bench', 'bench a'), ('h885_b_config', 'bench', 'bench b'))
SKIN_39 = (('H880-Pro.EZHex', 'kkong42', 'kkong42 880 pro'),)

#: The drawing's name for each key the bench map names, `MEASURED` in `tests/harmony_880_885/test_harmony_885_keys.py`.
DRAWING = {
    'Activities': 'Activities', 'Power': 'AllOff', 'Help': 'Help',
    'screen left 1': 'ScreenLeft1', 'screen left 2': 'ScreenLeft2', 'screen left 3': 'ScreenLeft3',
    'screen left 4': 'ScreenLeft4', 'Device': 'Device', 'Mute': 'VolumeMute',
    'arrow left below the screen': 'ScreenPrev', 'Vol +': 'VolumeUp', 'd-pad left': 'DirectionLeft',
    'Vol -': 'VolumeDown', 'd-pad up': 'DirectionUp', 'Menu': 'Menu', 'Exit': 'Exit', 'Green': 'Green',
    'Red': 'Red', 'Stop': 'Stop', 'Rec': 'Record', 'Rew': 'Rewind', 'Replay': 'SkipBack',
    '1': 'Number1', '4': 'Number4', '8': 'Number8', '7': 'Number7', 'Clear': 'Clear', '0': 'Number0',
    'OK': 'Select', 'd-pad down': 'DirectionDown', 'd-pad right': 'DirectionRight', 'Ch -': 'ChannelDown',
    'Ch +': 'ChannelUp', 'Media': 'Media', 'Prev': 'PrevChannel', 'Glow': 'Glow',
    'arrow right below the screen': 'ScreenNext', 'screen right 4': 'ScreenRight4',
    'screen right 1': 'ScreenRight1', 'screen right 2': 'ScreenRight2', 'screen right 3': 'ScreenRight3',
    'Guide': 'Guide', 'Info': 'Info', 'Blue': 'Blue', 'Skip': 'SkipForward', 'Fwd': 'FastForward',
    'Pause': 'Pause', 'Play': 'Play', '2': 'Number2', '3': 'Number3', '6': 'Number6', 'Yellow': 'Yellow',
    '5': 'Number5', '9': 'Number9', 'Enter': 'Enter',
}
#: The 885's keys by the drawing's names, and the code each raised on the units.
BENCH_885 = {DRAWING[name]: code for name, code in MEASURED.items()}

#: The Harmony 880 drawing's 53 keys: the 885's less its four colour keys, plus the two chevron keys.
KEYS_880 = tuple(sorted(set(BENCH_885) - {'Red', 'Green', 'Yellow', 'Blue'})) + ('UpArrow', 'DownArrow')

#: **Which command names name a key, fixed before anything was scored.** A command names a key when its
#: name is the key's own name, the one the drawings use and Logitech's button maps use for that key, or what
#: the key carries printed: a digit, `Mute`, `OK`. Nothing else, so `Back`, `Return`, `LastView`,
#: `ChannelPrev`, `Display`, `TopMenu`, `NumberEnter`, `PageUp` and every input or mode command name no key,
#: however likely a reading each has.
COMMAND_KEYS = {name: name for name in BENCH_885}
COMMAND_KEYS.update({str(n): 'Number%d' % n for n in range(10)})
COMMAND_KEYS.update({'Mute': 'VolumeMute', 'OK': 'Select', 'Ok': 'Select'})

#: What this file establishes: the Harmony 880's keys with the code Logitech's compiles for skin 15 put the
#: command named for each key on. `h880.ts` carries exactly these, `tests/firmware/test_silhouettes.py`.
ESTABLISHED_880 = {
    'VolumeMute': 11, 'VolumeUp': 13, 'DirectionLeft': 14, 'VolumeDown': 15, 'DirectionUp': 16, 'Menu': 17,
    'Exit': 18, 'Stop': 21, 'Record': 22, 'Rewind': 23, 'Number1': 25, 'Number4': 26,
    'Number8': 27, 'Number7': 29, 'Number0': 32, 'Select': 33, 'DirectionDown': 34, 'DirectionRight': 35,
    'ChannelDown': 36, 'ChannelUp': 37, 'Info': 51, 'FastForward': 54, 'Pause': 55,
    'Play': 56, 'Number2': 57, 'Number3': 58, 'Number6': 59, 'Number5': 61, 'Number9': 62,
}
#: What the rule gave before a device naming one key on several codes was set aside: two more, Replay and
#: Skip, whose second contributor was one game console naming each on three codes.
FIRST_RULE_ALSO = {'SkipBack': 24, 'SkipForward': 53}

#: Per established key, how many devices of guyman70718's and of kkong42's name it on its code. Five devices of
#: the one and six of the other name any key at all.
PER_CONTRIBUTOR = {
    'VolumeMute': (5, 5), 'VolumeUp': (5, 6), 'DirectionLeft': (4, 6), 'VolumeDown': (4, 5), 'DirectionUp': (3, 6),
    'Menu': (2, 3), 'Exit': (1, 3), 'Stop': (1, 5), 'Record': (2, 4), 'Rewind': (1, 2),
    'Number1': (3, 5), 'Number4': (4, 6), 'Number8': (4, 6), 'Number7': (4, 5), 'Number0': (3, 5), 'Select': (2, 3),
    'DirectionDown': (3, 6), 'DirectionRight': (4, 6), 'ChannelDown': (1, 4), 'ChannelUp': (1, 3), 'Info': (1, 5),
    'FastForward': (1, 2), 'Pause': (1, 5), 'Play': (1, 5), 'Number2': (4, 6),
    'Number3': (4, 6), 'Number6': (4, 6), 'Number5': (4, 6), 'Number9': (4, 6),
}
#: Per skin 15 file: bindings naming a key, of them on the code established for that key, on a code that
#: establishes nothing, and on a code established for another key.
PER_FILE = {
    'Update.EZHex': (28, 28, 0, 0), 'Update-1.EZHex': (61, 61, 0, 0), 'Update-2.EZHex': (98, 91, 5, 2),
    'Update-3.EZHex': (112, 103, 7, 2), 'H880-Bedroom.EZHex': (217, 199, 16, 2),
    'H880-Bedroom-Spare-1.EZHex': (217, 199, 16, 2), 'H880-Bedroom-Spare-2.EZHex': (217, 199, 16, 2),
    'H880-Bedroom-Spare-3.EZHex': (217, 199, 16, 2), 'H885-Bedroom.EZHex': (217, 199, 16, 2),
    'H880-Spare-4.EZHex': (63, 63, 0, 0),
}

#: Per installation, per device by its own label and its count of decoded numbers: how many of those numbers
#: the codesets below hold, and every codeset holding that many, which is the most any codeset in the archive
#: holds. Found by a full pass over the archive, `codeIndex` in `packages/codec/src/catalogue/catalogue.ts`, and pinned,
#: as `packages/codec/test/catalogue/catalogue.test.ts` pins its own, so the test reads named files rather than all of
#: them. A codeset is `codesets/<first two>/<name>.json`.
PINS = {
    ('bench a', 'AV-ontvanger-Woonkamer', 1): (1,
        '034d079ee77f99aa 0378f78c773fa0b4 037e9d2bdd815001 094ec1c282cc692c 0b0fa559de914e1f '
        '109c418b4ac0b71e 12c0934750a8cddb 13515e8c32008db0 171c33e13e5b9cff 18d6b44242396e11 '
        '1f85ae6ba8c8d034 1fa0f83b23a754cc 2569cca88b55f8f1 28e78554311f4d34 2f4c7a7578ac4d13 '
        '33d681618e023b6a 38d647dd2adbc51c 3a0d5470da1d0150 3fb1494d7b386372 5683a36c1fce7284 '
        '593c8d87a9dec6ed 7f1e3296642590e0 81544e3e01483097 817945593d653981 8b6d61041d0b7bdf '
        '8bfb709df1f5a312 8e34c7b766e32170 91d895fe317c5f00 9626ff740ad61cb9 9f44a15e39630467 '
        'a468f98fd30b9b7c aaa1779b2a6a7158 b1ccad078213afb8 b9399c028f466a93 bea38e1fe15b2f67 '
        'cfb98a916b86e9df d0c83ec2e16e439a d1cab5834a2a84ee d55feab96d8e7a6d db20fe2ea54b74ef '
        'dbdc616adbb6e620 dd49846eff793dbc df745e6770249453 e6e7cb2fc032e04d ed5197a9b4b1903c '
        'f4866dc0f58ed578 ffb6f6ad0a5b428e'),
    ('bench a', 'DVD_speler', 6): (6,
        '057d699814967f41 0f8fed4a1f64ad99 1c62fcd39901e42b 260818f2d3c00212 4ab96b16e32ec585 '
        '5102732eb063c819 542f67a900b482ad 57105173a234cf3e 5d346615dda05449 68b17aa3b18502cb '
        '6c715fe5aa83c02c 6cc6b69cc0b2e892 8b267c0e2b8fddf3 912d1558a79bc20f 9224884bad03ec19 '
        'db99f416f144631c de9779e14b14df73 e7b839f0153a6b01 ffb46105e780eb8b'),
    ('bench a', 'Media_Center-pc_2', 24): (24,
        '0352707afa821c76 0ff74110476d0def 12c5c8f3d88c5761 25f96ebe2ea03c25 26535f00ff964f0f '
        '2c44d429e5d1acf3 33bcd6e3bec4930c 4235905d24ca020b 46252d39b8c5a986 4db2c921a51e8bcf '
        '521ed762c5b5581b 531ac1f64a531cf9 548de29abeb26e01 56f778f2cddef436 583e67367a12a603 '
        '5a1b55066abc3429 5e473031af52908c 778b33428e2a668a 78fd4931165fed9e 7d91d5b19a2237d1 '
        '856d437a0995f1a4 86889142314a07bb 873ade685199bb72 892d0da82f7bb2a2 93fdb145bf01367b '
        '9937262bbc3532cc 9b38a101b0424462 9c9f5a5f60b4798c a522a6c4a554bb37 a85ee73e87e7521f '
        'b06fd65bd1c63cfe be25bd1990b96158 c1a59489792d89fb d3a0c75816f42173 d7d1d08b2dbc4a26 '
        'd88be8ff30d1fe84 e07a5015c307ff1b eba99fab624d83e9'),
    ('bench a', 'PVR', 1): (0, ''),
    # Unit A's fifth device. The name reader took its name from the mode's top row and printed 'Pwr' until it
    # was corrected on the 885 branch to read the device list's own label: Cd-speler, as
    # packages/codec/test/inventory/arch8devicelist.test.ts argues. The count and the matching codeset are unchanged,
    # since they come from the codes and not from the name.
    ('bench a', 'Cd-speler', 34): (34, '73ce20582349375e'),
    ('bench a', 'Tv', 59): (59, '50aceab743e77976 78ac52739d3b8828'),
    ('bench a', 'old_media_Center', 54): (54,
        '4d7728a565bd1858 74551a1b041496e2 98e297c230c32e3d fa5890fb5dc0da01 fb3fd3a51475ec1d'),
    # Unit B's third device, the same name and codeset as unit A's Cd-speler. B's file states no name for it,
    # so the old reader gave an empty one; the device list draws it, and the corrected reader reads that.
    ('bench b', 'Cd-speler', 34): (34, '73ce20582349375e'),
    ('bench b', 'CEC AMP', 9): (9, 'e941d9659ae6db3a'),
    ('bench b', 'DVD_speler', 6): (6,
        '057d699814967f41 0f8fed4a1f64ad99 1c62fcd39901e42b 260818f2d3c00212 4ab96b16e32ec585 '
        '5102732eb063c819 542f67a900b482ad 57105173a234cf3e 5d346615dda05449 68b17aa3b18502cb '
        '6c715fe5aa83c02c 6cc6b69cc0b2e892 8b267c0e2b8fddf3 912d1558a79bc20f 9224884bad03ec19 '
        'db99f416f144631c de9779e14b14df73 e7b839f0153a6b01 ffb46105e780eb8b'),
    ('bench b', 'Media_Centre', 54): (54,
        '4d7728a565bd1858 74551a1b041496e2 98e297c230c32e3d fa5890fb5dc0da01 fb3fd3a51475ec1d'),
    ('bench b', 'Polsat_ontvanger', 23): (0, ''),
    ('bench b', 'Teufel', 26): (26, 'd2492ed4bcf98d0c e41bbcc2232c46f3 fe03109ce1a8fb06'),
    ('bench b', 'Tv', 63): (63, '739b5e84df7e5da6'),
    ('guyman70718', 'AV_Receiver', 48): (42, '46535e216039d94b'),
    ('guyman70718', 'Amplifier', 14): (14, '141aa5fc53a56d61 7debadc496dbaf0d de8e7dd8baa97292'),
    ('guyman70718', 'Game_Console_(With_DVD)', 52): (52, '7b83d22cdb7fefad'),
    ('guyman70718', 'TV', 47): (47, '8a44dcc743874f32'),
    ('guyman70718', 'TV_2', 64): (64, '78ac52739d3b8828 78dcc7239af85d11'),
    ('guyman70718', 'TV_2', 68): (68, '78ac52739d3b8828'),
    ('kkong42 880 pro', 'AV_Receiver', 94): (94,
        '17330795091c8c5d a8bc3ac34180e526 a9891da37d8e3dd7 bbe1669d410074c2 c23806a9a9083850 '
        'cd7865d7a8315363 e2e017b513b3208d e411db0b7dec9c93 e9934c51f75dc85f faa9c53208095634'),
    ('kkong42 880 pro', 'DVD', 1): (0, ''),
    ('kkong42 880 pro', 'Projector', 43): (43, '462e8a9bb83e5dab e9922c04856c5ff6'),
    ('kkong42 bedroom', 'DTR-T2200', 47): (47, '8bf0ed189d2de1e4 b399921f66dfc197 cd471049d4b8ebd1'),
    ('kkong42 bedroom', 'Dune_RealBox', 53): (38, 'd9a40abec3545eae'),
    ('kkong42 bedroom', 'Pana_32AS500', 52): (52,
        '185bc10f210e317b 28b195e7d26cf4ab 550cb047fd82927b 55815f284b219869 a2b93bd76ca4a616 '
        'bc9b34032dc7993e bcd19bfcf8f4f82c e33ee231aeb873a8 f710892a3abcdd5e'),
    ('kkong42 bedroom', 'Pana_32AS600', 58): (58,
        '185bc10f210e317b 28b195e7d26cf4ab 550cb047fd82927b 55815f284b219869 a2b93bd76ca4a616 '
        'bc9b34032dc7993e bcd19bfcf8f4f82c e33ee231aeb873a8 f710892a3abcdd5e'),
    ('kkong42 living room', 'DMP-BD60', 37): (36,
        '41432ed3dd4354b4 6d38ff625d11d04e 8a8c22331628156b b3078ffa91c3059b c117878a2eda3c20 '
        'e1e8705641fd80db e31c1e671adb47f1'),
    ('kkong42 living room', 'DTR-T2110', 43): (43,
        '257f4ff8bae78490 3ba241663003027f 5c65a5138c161724 6aedcb9463371ed1 6d53657a6fd791eb '
        '7d35857d08e8436a 8bf0ed189d2de1e4 b399921f66dfc197 cd471049d4b8ebd1 f40915dd4ea3eb42 '
        'f43f14eb916f285d ff96b78c4b3da40c'),
    ('kkong42 living room', 'DVL-909', 8): (8,
        '057d699814967f41 1c62fcd39901e42b 260818f2d3c00212 5102732eb063c819 57105173a234cf3e '
        '5d346615dda05449 68b17aa3b18502cb 8b267c0e2b8fddf3 912d1558a79bc20f e7b839f0153a6b01 '
        'ffb46105e780eb8b'),
    ('kkong42 living room', 'HR-S6855', 31): (31, '0a27841f961215a2'),
    ('kkong42 living room', 'RealBox_4K', 49): (44, '8ae319cb23455b98 eda6f606993a2041'),
    ('kkong42 living room', 'TX-55GZ950B', 59): (58,
        '111d1d5daf9d9060 17998a37d75df8d2 1fe4eb697be1a5ac 22d47e2193090779 27cad52d50199d46 '
        '338521891c20ac22 70ba9a54e8c58e16 84aac487867baefd 8dd0b3d56be2e03d c5b7c9cf768aa785 '
        'f0f4380a376ac7ac'),
    ('kkong42 living room', 'TX-NR626', 65): (52, 'cb0250fa796c0d34'),
    ('kkong42 second 880', 'Game_Console_(With_DVD)', 49): (0, ''),
    ('kkong42 second 880', 'Mini_System_(DVD,_CD,_Radio)-Living_Room', 51): (51,
        '416d4e1d1866d82c 46eaa6b152bd8a6a 56e23ca3c0713649'),
    ('kkong42 second 880', 'PVR', 7): (4, '3790d1632574e1e5 72c4cc812c6e24c6 766182a5f7ff823b b787526e9a3781e5'),
    ('kkong42 second 880', 'TV', 67): (67, '235b87bedbaf13e0 78ac52739d3b8828 dc37991bd62297d8'),
}

#: Run under node: per configuration, each device's decoded numbers held by its pinned codesets, and every
#: press binding of an activity's set or a device's own keypad with the names its codes carry. A name is the
#: union over the device's pinned codesets (`names`) and, for the control, the first pinned codeset's alone
#: (`first`).
NODE_PROBE = r'''
import { readFileSync, existsSync } from 'node:fs';
const [codecDir, labDir, pinsPath, ...rest] = process.argv.slice(1);
const { IR_ARCHIVE } = await import(labDir + '/index.ts');
if (IR_ARCHIVE === undefined || !existsSync(IR_ARCHIVE)) { console.log(JSON.stringify({ skip: 'no infrared archive' })); process.exit(0); }
// Reading a character map can draw our own letters to recognise them, from the font files the codec's Node
// resources supply.
await import(codecDir + '/support/resources.node.ts');
const { parse } = await import(codecDir + '/container/gspm.ts');
const { irGroups } = await import(codecDir + '/infrared/ir.ts');
const { irFrame } = await import(codecDir + '/infrared/irframe.ts');
const { keyCodes, deviceModeMaps, devices } = await import(codecDir + '/inventory/inventory.ts');
const { codeKey } = await import(codecDir + '/catalogue/catalogue.ts');
const { catalogueCommands } = await import(codecDir + '/catalogue/catalogue.node.ts');
const pins = JSON.parse(readFileSync(pinsPath, 'utf8'));
const tables = new Map();
const namesOf = (name) => {
  if (!tables.has(name)) {
    const t = new Map();
    for (const command of catalogueCommands(IR_ARCHIVE, `codesets/${name.slice(0, 2)}/${name}.json`)) {
      for (const v of command.keycode.matchAll(/\(0x([0-9A-Fa-f]+)\)/g)) {
        const k = codeKey(v[1]);
        t.set(k, [...new Set([...(t.get(k) ?? []), command.name])]);
      }
    }
    tables.set(name, t);
  }
  return tables.get(name);
};
const out = [];
for (let n = 0; n < rest.length; n += 2) {
  const installation = rest[n];
  const c = parse(new Uint8Array(readFileSync(rest[n + 1])));
  const labels = new Map(devices(c).map((d) => [d.group, d.name]));
  const groups = (irGroups(c) ?? []).map((g, group) => {
    const numbers = new Map();
    g.addresses.forEach((a, code) => { const f = irFrame(c, a); if (f) numbers.set(code, codeKey(f.value.toString(16))); });
    const label = labels.get(group) ?? '';
    const distinct = [...new Set(numbers.values())];
    const pin = pins[`${installation}|${label}|${distinct.length}`];
    const codesets = pin === undefined ? [] : pin;
    const held = codesets.map((cs) => distinct.filter((v) => namesOf(cs).has(v)).length);
    return { group, label, numbers: distinct.length, pinned: pin !== undefined, held, codesets, byCode: Object.fromEntries(numbers) };
  });
  const named = (group, code) => {
    const g = groups[group];
    const number = g?.byCode[code];
    if (number === undefined) return { names: [], first: [] };
    const all = new Set();
    for (const cs of g.codesets) for (const name of namesOf(cs).get(number) ?? []) all.add(name);
    const first = g.codesets.length ? (namesOf(g.codesets[0]).get(number) ?? []) : [];
    return { names: [...all].sort(), first: [...first].sort() };
  };
  const bindings = [];
  const add = (kind, scan, codes) => bindings.push({ kind, scan, codes: codes.map((x) => ({ group: x.group, label: groups[x.group]?.label ?? '', ...named(x.group, x.code) })) });
  for (const b of keyCodes(c)) if (b.where === 'set' && b.event === 2) add('activity', b.scan, b.codes);
  for (const m of deviceModeMaps(c)) for (const b of m.keypad) if (b.event === 2) add('device', b.scan, b.codes);
  out.push({ groups: groups.map(({ byCode, codesets, ...g }) => g), bindings });
}
console.log(JSON.stringify(out));
'''

_RUN = {}


def probe():
    """Every configuration's groups and bindings, by file name: one node run, kept for the whole module."""
    if 'out' in _RUN:
        return _RUN['out']
    if shutil.which('node') is None:
        raise unittest.SkipTest('no node on this machine, so the codec cannot be run')
    ez = SKIN_15 + SKIN_17 + SKIN_39
    blobs = by_name(*[name for name, _, _ in ez])
    lab.require(*[name for name, _, _ in BENCH])
    here = os.path.dirname(os.path.abspath(__file__))
    codec = os.path.abspath(os.path.join(here, '..', '..', 'packages', 'codec', 'src'))
    labsrc = os.path.abspath(os.path.join(here, '..', '..', 'packages', 'lab', 'src'))
    pins = {'%s|%s|%d' % key: hashes.split() for key, (_, hashes) in PINS.items()}
    skins = {}
    with tempfile.TemporaryDirectory() as directory:
        args = []
        for (name, _, installation), blob in zip(ez, blobs):
            parsed = ezfile.parse_ezhex(blob, name)
            skins[name] = parsed.intended_version.get('SKIN')
            path = os.path.join(directory, name + '.payload')
            with open(path, 'wb') as handle:
                handle.write(parsed.payload)
            args += [installation, path]
        for name, _, installation in BENCH:
            path = os.path.join(directory, name + '.payload')
            with open(path, 'wb') as handle:
                handle.write(lab.load(name))
            args += [installation, path]
        pins_path = os.path.join(directory, 'pins.json')
        with open(pins_path, 'w', encoding='utf-8') as handle:
            json.dump(pins, handle)
        run = subprocess.run(['node', '--input-type=module', '-e', NODE_PROBE, codec, labsrc, pins_path, *args],
                             capture_output=True, text=True, check=True)
    answer = json.loads(run.stdout)
    if isinstance(answer, dict) and 'skip' in answer:
        raise unittest.SkipTest(answer['skip'])
    names = [name for name, _, _ in ez + BENCH]
    _RUN['out'] = (dict(zip(names, answer)), skins)
    return _RUN['out']


def key_of(binding, field='names', command_keys=None):
    """The key a one code binding names, or None: every name its code carries has to name the same key."""
    if len(binding['codes']) != 1:
        return None
    names = binding['codes'][0][field]
    keys = {(command_keys or COMMAND_KEYS).get(n) for n in names}
    if not names or None in keys or len(keys) != 1:
        return None
    return keys.pop()


def evidence(population, field='names', whole_devices_only=False, unambiguous=True, command_keys=None):
    """{code: {key: {(contributor, installation, device)}}}: which devices name which key on which code.

    With `unambiguous`, which is the rule, a device counts for a key only where it names that key on one code
    alone: a device naming one key on several codes says nothing about which of them is that key.
    """
    out = collections.defaultdict(lambda: collections.defaultdict(set))
    files, _ = probe()
    for name, contributor, installation in population:
        groups = {g['group']: g for g in files[name]['groups']}
        for b in files[name]['bindings']:
            key = key_of(b, field, command_keys)
            if key is None:
                continue
            g = groups[b['codes'][0]['group']]
            if whole_devices_only and not (g['held'] and g['held'][0] == g['numbers']):
                continue
            out[b['scan']][key].add((contributor, installation, g['label']))
    if not unambiguous:
        return out
    codes = collections.defaultdict(set)
    for code, keys in out.items():
        for key, devices in keys.items():
            for device in devices:
                codes[(device, key)].add(code)
    kept = collections.defaultdict(lambda: collections.defaultdict(set))
    for code, keys in out.items():
        for key, devices in keys.items():
            for device in devices:
                if len(codes[(device, key)]) == 1:
                    kept[code][key].add(device)
    return kept


def ambiguous(population):
    """Every device naming one key on several codes: (installation, device, key, codes)."""
    codes = collections.defaultdict(set)
    for code, keys in evidence(population, unambiguous=False).items():
        for key, devices in keys.items():
            for _, installation, device in devices:
                codes[(installation, device, key)].add(code)
    return sorted((i, d, k, tuple(sorted(c))) for (i, d, k), c in codes.items() if len(c) > 1)


def established(per, contributors=2):
    """{code: key}: the key more devices name on that code than any other, named by devices of at least
    `contributors` contributors."""
    out = {}
    for code, keys in per.items():
        ranked = sorted(keys.items(), key=lambda kv: -len(kv[1]))
        key, devices = ranked[0]
        if len(ranked) > 1 and len(ranked[1][1]) == len(devices):
            continue
        if len({c for c, _, _ in devices}) >= contributors:
            out[code] = key
    return out


def dissent(per):
    """Every naming that is not the most named key on its code: (code, key, devices)."""
    out = []
    for code, keys in sorted(per.items()):
        ranked = sorted(keys.items(), key=lambda kv: (-len(kv[1]), kv[0]))
        for key, devices in ranked[1:]:
            out.append((code, key, sorted('%s: %s' % (i, d) for _, i, d in devices)))
    return out


class ThePopulation(unittest.TestCase):

    def test_ten_files_state_skin_15_and_four_skin_17(self):
        _, skins = probe()
        self.assertEqual({name: skins[name] for name, _, _ in SKIN_15}, {name: '15' for name, _, _ in SKIN_15})
        self.assertEqual({name: skins[name] for name, _, _ in SKIN_17}, {name: '17' for name, _, _ in SKIN_17})
        self.assertEqual(skins['H880-Pro.EZHex'], '39')

    def test_two_contributors_and_three_installations_compiled_for_an_880(self):
        self.assertEqual(collections.Counter(c for _, c, _ in SKIN_15), {'guyman70718': 4, 'kkong42': 6})
        self.assertEqual(collections.Counter(i for _, _, i in SKIN_15),
                         {'guyman70718': 4, 'kkong42 bedroom': 5, 'kkong42 second 880': 1})

    def test_every_device_with_a_decoded_number_is_pinned_and_its_codesets_hold_what_was_pinned(self):
        files, _ = probe()
        seen = {}
        for name, _, installation in SKIN_15 + SKIN_17 + BENCH + SKIN_39:
            for g in files[name]['groups']:
                if not g['numbers']:
                    continue
                with self.subTest(file=name, device=g['label']):
                    self.assertTrue(g['pinned'])
                    hits, hashes = PINS[(installation, g['label'], g['numbers'])]
                    self.assertEqual(g['held'], [hits] * len(hashes.split()))
                seen[(installation, g['label'], g['numbers'])] = True
        self.assertEqual(sorted(seen), sorted(PINS))

    def test_every_press_binding_read_sends_one_code(self):
        files, _ = probe()
        sizes = collections.Counter(len(b['codes']) for name, _, _ in SKIN_15 + SKIN_17 + BENCH
                                    for b in files[name]['bindings'])
        self.assertEqual(sizes, {1: 4871})

    def test_the_devices_with_no_decoded_number(self):
        """Their frames decode to nothing `irFrame` reads, so none of their bindings carries a name.

        Unit B's entry read as an empty name until the device name reader was corrected on the 885 branch. It is
        Lichtcont.., the label the device list draws, whose two dots are the screen's own elision of a name too
        long for its cell (`packages/codec/test/inventory/arch8devicelist.test.ts`). It has no decoded number either way.
        """
        files, _ = probe()
        empty = sorted({(i, g['label']) for name, _, i in SKIN_15 + SKIN_17 + BENCH
                        for g in files[name]['groups'] if not g['numbers']})
        self.assertEqual(empty, [
            ('bench a', 'Media_Center-pc'), ('bench b', 'Lichtcont..'), ('bench b', 'SAT_ontvanger'),
            ('guyman70718', 'Media_Center_PC'), ('guyman70718', 'Media_Center_PC_2'),
        ])


class TheCalibrationOnThe885(unittest.TestCase):
    """The same procedure on the 885's compiles, scored against the codes its keys raised on the units."""

    def test_32_codes_are_established_and_every_one_is_the_key_that_raised_it(self):
        found = established(evidence(SKIN_17 + BENCH))
        self.assertEqual(len(found), 32)
        self.assertEqual({code: key for code, key in found.items() if BENCH_885[key] != code}, {})

    def test_the_885_keys_it_leaves_without_a_code(self):
        found = established(evidence(SKIN_17 + BENCH))
        left = sorted(set(BENCH_885) - set(found.values()))
        self.assertEqual(left, sorted([
            'Activities', 'AllOff', 'Help', 'Device', 'ScreenPrev', 'ScreenNext', 'Media', 'Glow', 'PrevChannel',
            'Exit', 'SkipBack', 'SkipForward', 'Clear', 'Guide', 'Enter',
            'ScreenLeft1', 'ScreenLeft2', 'ScreenLeft3', 'ScreenLeft4',
            'ScreenRight1', 'ScreenRight2', 'ScreenRight3', 'ScreenRight4',
        ]))

    def test_with_both_guards_dropped_one_answer_is_wrong(self):
        """The controls: one contributor enough gives 37 codes and none wrong; one contributor enough and a
        device naming one key on several codes counted gives 39, and Green on 40, which is Prev."""
        found = established(evidence(SKIN_17 + BENCH), contributors=1)
        self.assertEqual(len(found), 37)
        self.assertEqual({code: key for code, key in found.items() if BENCH_885[key] != code}, {})
        found = established(evidence(SKIN_17 + BENCH, unambiguous=False), contributors=1)
        self.assertEqual(len(found), 39)
        self.assertEqual({code: key for code, key in found.items() if BENCH_885[key] != code}, {40: 'Green'})
        # Two contributors with the several codes counted: the same 32 as the rule.
        self.assertEqual(established(evidence(SKIN_17 + BENCH, unambiguous=False)),
                         established(evidence(SKIN_17 + BENCH)))

    def test_what_the_885_compiles_name_against_the_most_named_key(self):
        self.assertEqual(dissent(evidence(SKIN_17 + BENCH)), [
            (33, 'Enter', ['kkong42 living room: HR-S6855']),
        ])
        # Replay and Skip are named on their own codes by one device each, so the calibration never reaches them.
        per = evidence(SKIN_17 + BENCH)
        self.assertEqual({code: {k: len(d) for k, d in per[code].items()} for code in (24, 53)},
                         {24: {'SkipBack': 1}, 53: {'SkipForward': 1}})
        self.assertEqual(ambiguous(SKIN_17 + BENCH), [
            ('bench b', 'Media_Centre', 'Green', (19, 40)),
            ('kkong42 living room', 'RealBox_4K', 'Enter', (33, 63)),
        ])


class TheHarmony880(unittest.TestCase):
    """Measured in configurations: Logitech's compiles for skin 15."""

    def test_29_keys_get_the_code_the_compiles_name_them_on(self):
        found = established(evidence(SKIN_15))
        self.assertEqual({key: code for code, key in found.items()}, ESTABLISHED_880)

    def test_every_one_is_the_code_the_same_key_raised_on_an_885(self):
        self.assertEqual({key: code for key, code in ESTABLISHED_880.items() if BENCH_885[key] != code}, {})

    def test_every_established_key_is_named_by_devices_of_both_contributors(self):
        per = evidence(SKIN_15)
        counts = {key: tuple(len({d for c, _, d in per[code][key] if c == who}) for who in ('guyman70718', 'kkong42'))
                  for key, code in ESTABLISHED_880.items()}
        self.assertEqual(counts, PER_CONTRIBUTOR)
        self.assertEqual(min(min(one) for one in counts.values()), 1)

    def test_the_keys_left_without_a_code(self):
        self.assertEqual(sorted(set(KEYS_880) - set(ESTABLISHED_880)), sorted([
            # Named by nothing: no command bears their names, or they sit beside the screen.
            'Activities', 'AllOff', 'Help', 'Device', 'ScreenPrev', 'ScreenNext', 'Media', 'Glow', 'PrevChannel',
            'Enter', 'ScreenLeft1', 'ScreenLeft2', 'ScreenLeft3', 'ScreenLeft4',
            'ScreenRight1', 'ScreenRight2', 'ScreenRight3', 'ScreenRight4',
            # Named by one contributor only, each on the 885's code, below.
            'Guide', 'Clear', 'SkipBack', 'SkipForward',
            # The chevrons keep their candidates.
            'UpArrow', 'DownArrow',
        ]))
        per = evidence(SKIN_15)
        named = {key for keys in per.values() for key in keys}
        self.assertEqual(sorted(named & set(KEYS_880) - set(ESTABLISHED_880)),
                         ['Clear', 'Guide', 'SkipBack', 'SkipForward'])
        self.assertEqual({code: {k: sorted(d) for k, d in per[code].items()} for code in (50, 31, 24, 53)}, {
            50: {'Guide': [('kkong42', 'kkong42 bedroom', 'DTR-T2200'), ('kkong42', 'kkong42 bedroom', 'Pana_32AS500'),
                           ('kkong42', 'kkong42 bedroom', 'Pana_32AS600')]},
            31: {'Clear': [('guyman70718', 'guyman70718', 'Game_Console_(With_DVD)')]},
            24: {'SkipBack': [('kkong42', 'kkong42 bedroom', 'DTR-T2200'), ('kkong42', 'kkong42 bedroom', 'Dune_RealBox')]},
            53: {'SkipForward': [('kkong42', 'kkong42 bedroom', 'DTR-T2200'),
                                 ('kkong42', 'kkong42 bedroom', 'Dune_RealBox')]},
        })

    def test_replay_and_skip_had_their_second_contributor_from_a_device_naming_each_on_three_codes(self):
        """The rule as first written counted every naming and gave 31, these two beside the 29. The blind
        re-measurement left them out; the game console that was their guyman70718 side names Replay's command on
        20, 24 and 36 and Skip's on 37, 52 and 53, so it says nothing about which code is which key."""
        found = established(evidence(SKIN_15, unambiguous=False))
        self.assertEqual({key: code for code, key in found.items()}, {**ESTABLISHED_880, **FIRST_RULE_ALSO})
        self.assertEqual(ambiguous(SKIN_15), [
            ('guyman70718', 'Game_Console_(With_DVD)', 'SkipBack', (20, 24, 36)),
            ('guyman70718', 'Game_Console_(With_DVD)', 'SkipForward', (37, 52, 53)),
            ('kkong42 bedroom', 'Pana_32AS500', 'FastForward', (53, 54)),
            ('kkong42 bedroom', 'Pana_32AS500', 'Rewind', (23, 24)),
        ])

    def test_every_naming_against_the_most_named_key_is_one_device(self):
        """The falsification check: what names a key on a code that gives another key, here one device."""
        self.assertEqual(dissent(evidence(SKIN_15)), [
            (54, 'Record', ['kkong42 bedroom: Dune_RealBox']),
        ])

    def test_the_two_chevron_codes_carry_a_previous_and_a_next_command_in_a_family_of_three(self):
        """20 and 52, the chevrons' candidates: three devices, each a previous command on 20, 24 and 36 and its next
        on 37, 52 and 53, and nothing else on the chevron codes carries a name."""
        files, _ = probe()
        family = collections.defaultdict(set)
        on_chevrons = set()
        for name, _, installation in SKIN_15:
            for b in files[name]['bindings']:
                names = tuple(b['codes'][0]['names'])
                if b['scan'] in (20, 52) and names:
                    on_chevrons.add((installation, b['codes'][0]['label']))
                if b['scan'] in (20, 24, 36, 37, 52, 53) and names:
                    family[(installation, b['codes'][0]['label'])].add((b['scan'], names))
        previous, following = (20, 24, 36), (37, 52, 53)
        self.assertEqual({k: sorted(family[k]) for k in on_chevrons}, {
            ('guyman70718', 'AV_Receiver'):
                [(c, ('PresetPrev',)) for c in previous] + [(c, ('PresetNext',)) for c in following],
            ('guyman70718', 'Game_Console_(With_DVD)'):
                [(c, ('SkipBack',)) for c in previous] + [(c, ('SkipForward',)) for c in following],
            ('kkong42 second 880', 'Mini_System_(DVD,_CD,_Radio)-Living_Room'):
                [(c, ('ChapterPrev', 'PresetPrev')) for c in previous]
                + [(c, ('ChapterNext', 'PresetNext')) for c in following],
        })
        self.assertNotIn(20, established(evidence(SKIN_15)))
        self.assertNotIn(52, established(evidence(SKIN_15)))
        # Only the game console's names are key names there, and it repeats them on three codes each.
        self.assertEqual({code: {k: len(d) for k, d in keys.items()}
                          for code, keys in evidence(SKIN_15, unambiguous=False).items() if code in (20, 52)},
                         {20: {'SkipBack': 1}, 52: {'SkipForward': 1}})

    def test_prev_and_enter_are_bound_under_names_that_are_not_their_own(self):
        """`ChannelPrev` on Prev's code by six devices of both contributors; `Enter` only on OK's code, beside
        `Select` or `NumberEnter`; `Guide` tied with `TeletextStore` on two more devices of 50. And the sixteen
        keys no command names: neither their names nor the codes they raise on an 885 occur in a binding."""
        files, _ = probe()
        where = collections.defaultdict(set)
        beside_enter = set()
        for name, contributor, installation in SKIN_15:
            for b in files[name]['bindings']:
                names = b['codes'][0]['names']
                for one in ('ChannelPrev', 'Enter', 'Guide'):
                    if one in names:
                        where[one].add((b['scan'], contributor, installation, b['codes'][0]['label']))
                if 'Enter' in names:
                    beside_enter.add(tuple(n for n in names if n != 'Enter'))
        self.assertEqual({c for c, _, _, _ in where['ChannelPrev']}, {40})
        self.assertEqual(len(where['ChannelPrev']), 6)
        self.assertEqual({c for _, c, _, _ in where['ChannelPrev']}, {'guyman70718', 'kkong42'})
        self.assertEqual({c for c, _, _, _ in where['Enter']}, {33})
        # The codes the bindings sit on: 37, and none of them a code the keys no command names raise on an 885.
        bound = {b['scan'] for name, _, _ in SKIN_15 for b in files[name]['bindings']}
        self.assertEqual(len(bound), 37)
        unnamed = ('Activities', 'AllOff', 'Help', 'Device', 'Media', 'Glow', 'ScreenPrev', 'ScreenNext',
                   'ScreenLeft1', 'ScreenLeft2', 'ScreenLeft3', 'ScreenLeft4',
                   'ScreenRight1', 'ScreenRight2', 'ScreenRight3', 'ScreenRight4')
        self.assertEqual(bound & {BENCH_885[k] for k in unnamed}, set())
        names = {n for name, _, _ in SKIN_15 for b in files[name]['bindings'] for n in b['codes'][0]['names']}
        self.assertEqual(names & set(unnamed), set())
        self.assertEqual(sorted(beside_enter), [('NumberEnterv28',), ('NumberEnterv28', 'Select'), ('Select',)])
        self.assertEqual(sorted((c, i, d) for _, c, i, d in where['Guide'] if (c, i, d) not in evidence(SKIN_15)[50]['Guide']),
                         [('guyman70718', 'guyman70718', 'TV_2'), ('kkong42', 'kkong42 second 880', 'TV')])

    def test_prev_would_follow_from_a_wider_name_list(self):
        """Recorded and not taken: with `ChannelPrev` and the names tied with it as Prev's the 880 gets Prev on
        40, and the 885's calibration 33 codes, still none wrong; `ChannelPrev` alone changes nothing."""
        alone = {**COMMAND_KEYS, 'ChannelPrev': 'PrevChannel'}
        self.assertEqual(established(evidence(SKIN_15, command_keys=alone)), established(evidence(SKIN_15)))
        wider = {**alone, 'LastView': 'PrevChannel', 'PreChv27': 'PrevChannel', 'Pre-Ch': 'PrevChannel'}
        found = established(evidence(SKIN_15, command_keys=wider))
        self.assertEqual({key: code for code, key in found.items()}, {**ESTABLISHED_880, 'PrevChannel': 40})
        found = established(evidence(SKIN_17 + BENCH, command_keys=wider))
        self.assertEqual(len(found), 33)
        self.assertEqual({code: key for code, key in found.items() if BENCH_885[key] != code}, {})

    def test_the_weakest_nine_rest_on_one_device_each_and_no_other_device_matters(self):
        """Taking out each device in turn: only the game console and one television change the answer."""
        per = evidence(SKIN_15)
        devices = {d for keys in per.values() for found in keys.values() for d in found}
        changed = {}
        for device in sorted(devices):
            without = {code: {key: found - {device} for key, found in keys.items()} for code, keys in per.items()}
            lost = sorted(set(established(per).values()) - set(established(without).values()))
            if lost:
                changed[device[2]] = lost
        self.assertEqual(changed, {
            'Game_Console_(With_DVD)': ['FastForward', 'Info', 'Pause', 'Play', 'Rewind', 'Stop'],
            'TV': ['ChannelDown', 'ChannelUp', 'Exit'],
        })

    def test_the_answer_does_not_hang_on_which_tied_codeset_names_a_code(self):
        """Names from the first pinned codeset alone, or from wholly matched devices alone: the same 29."""
        for kwargs in ({'field': 'first'}, {'whole_devices_only': True}):
            with self.subTest(**kwargs):
                found = established(evidence(SKIN_15, **kwargs))
                self.assertEqual({key: code for code, key in found.items()}, ESTABLISHED_880)
        # On the 885 the first codeset alone gives three more codes, all of them right.
        found = established(evidence(SKIN_17 + BENCH, field='first'))
        self.assertEqual(len(found), 35)
        self.assertEqual({code: key for code, key in found.items() if BENCH_885[key] != code}, {})

    def test_counts_per_file(self):
        """(bindings naming a key, of them on the code established for it, on a code establishing nothing,
        against the established key)."""
        files, _ = probe()
        found = established(evidence(SKIN_15))
        counts = {}
        for name, _, _ in SKIN_15:
            tally = [0, 0, 0, 0]
            for b in files[name]['bindings']:
                key = key_of(b)
                if key is None:
                    continue
                tally[0] += 1
                if found.get(b['scan']) == key:
                    tally[1] += 1
                elif b['scan'] not in found:
                    tally[2] += 1
                else:
                    tally[3] += 1
            counts[name] = tuple(tally)
        self.assertEqual(counts, PER_FILE)
        self.assertEqual([sum(one[n] for one in counts.values()) for n in range(4)], [1447, 1341, 92, 14])

    def test_the_legend_s_codes_are_not_an_880_s_either(self):
        """The board survey's codes for Info, Fwd, Pause and Play, read off an 880, against its compiles."""
        legend, _ = survey()
        four = {'Info': 'Info', 'Fwd': 'FastForward', 'Pause': 'Pause', 'Play': 'Play'}
        self.assertEqual({n: legend[n] for n in four}, {'Fwd': 52, 'Pause': 53, 'Play': 54, 'Info': 55})
        self.assertEqual({n: ESTABLISHED_880[k] for n, k in four.items()},
                         {'Info': 51, 'Fwd': 54, 'Pause': 55, 'Play': 56})


class TheWidth(unittest.TestCase):

    def test_the_880_pro_agrees_on_23_codes_and_puts_mute_on_20(self):
        """Skin 39, one compile of one contributor: 24 codes named at one contributor, 23 the 885's code for the
        same key, and Mute on 20, where the 880 and 885 have it on 11."""
        found = established(evidence(SKIN_39), contributors=1)
        self.assertEqual(len(found), 24)
        self.assertEqual({code: key for code, key in found.items() if BENCH_885[key] != code}, {20: 'VolumeMute'})
        self.assertEqual(sorted(code for code, keys in evidence(SKIN_39).items() if 'VolumeMute' in keys), [20])


if __name__ == '__main__':
    unittest.main()
