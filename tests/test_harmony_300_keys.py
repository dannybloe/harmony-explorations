"""
Which key of a European Harmony 300 raises which scan code, heard by pressing every key with an infrared
receiver listening: `todo-compile-300.md` 2.1 and 2.2, the lab's `h300_every_key_ir` and `h300_keys_ir`.

**The argument is the header of `packages/bench/test/keys300.test.ts`**, which matches both runs again from
their pulses, walks the file the unit held key by key, and asks of every key pressed which of the 56 codes,
raised in its place, gives what was heard to the end of the run. That test is where the four failed steps
of the second run are explained (the steps named keys by the US printing, and the unit is the European one,
skin 79) and where the predictions, `docs/predictions/harmony-300-keys.md`, are scored. **This file is the
reference's footnote for what that settled, and it reads the runs by another route**: the matches the
monitor stored, which the TypeScript test shows a fresh match reproduces, against this file's own reading
of the key maps, `_Config` and `_first_sends` of `tests/test_harmony_350_keys.py`, as
`TheBench350HeardEveryKey` reads the Harmony 350's run. It follows calls and not state variable writes, so
it reads a key by the first code its binding sends, the favourites by the channel they load, and the four
device keys and Watch TV by the map they select or the codes they send.

**What it settles**: 49 keys of the 55, each on the code of the Harmony 350 key in the same place, by the
European drawing's names, `packages/silhouettes/src/models/h300eu.ts`, which carries them. The six left are
Clear, Enter, TV Input, Live and the two arrows between Menu, Info, Exit and Guide: the unit's own file
binds nothing to them in either mode, and the first run's file gives them Info's command, as it gives
twelve codes besides Info's, so neither run tells them apart. **Every tie rests on the keys having been
pressed in the order the steps name**: the receiver hears codes and not keys.

**Sources checked first**: the TypeScript test above and the Harmony 350's classes in
`tests/test_harmony_350_keys.py`; `reference/remotes/harmony-300/keys.md` and `harmony-350/keys.md`.
Logitech's client says nothing about which key raises which code, `tests/test_harmony_350_keys.py`.

**Width**: one Harmony 300, skin 79, two files. No skin 78 unit was pressed.
"""
import json
import os
import unittest

import lab
from test_harmony_350_keys import PRESS, _Config, _first_sends

#: The name the monitor gave both runs' codes, `BENCH_CONFIGS` in `packages/bench`. The first run's file is
#: this configuration with key bindings added and the same infrared codes, which the TypeScript test asserts.
NAMED = 'h300_programmed_config'
#: The first run's file, read by path: a working copy, so outside every fixture population.
EVERY_KEY = ('work', '300-every-key', 'every-key.bin')

#: The two device maps the runs pressed in, and the key table.
KEY_TABLE, KPN_MAP, TV_MAP = 0, 1, 3
NUMBER_SENDER = 0xF3

#: The second run's steps that sent, 1 based, with the map in force and the keys that sent in them, in
#: order, by the European printing. Step 6, the television's colour keys, is not here: the person noted
#: pressing them in the wrong order. Step 15 is the colour keys pressed by the colour the step named.
STEPS_22 = {
    2: (TV_MAP, ['VolumeUp', 'VolumeDown', 'VolumeMute', 'Power', 'Power']),
    3: (TV_MAP, ['ChannelUp', 'ChannelDown', 'PrevChannel']),
    4: (TV_MAP, ['DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft', 'Select']),
    5: (TV_MAP, ['Menu', 'Exit', 'Guide', 'Info']),
    7: (TV_MAP, ['Rewind', 'Play', 'Pause', 'FastForward', 'Record', 'Stop', 'SkipBack', 'SkipForward']),
    8: (TV_MAP, ['Number1', 'Number2', 'Number3', 'Number4', 'Number5', 'Number6', 'Number7', 'Number8',
                 'Number9', 'Number0']),
    11: (KPN_MAP, ['Power']),
    12: (KPN_MAP, ['ChannelUp', 'ChannelDown', 'PrevChannel']),
    13: (KPN_MAP, ['DirectionUp', 'DirectionRight', 'DirectionDown', 'DirectionLeft', 'Select']),
    14: (KPN_MAP, ['Menu', 'Guide', 'Info']),
    15: (KPN_MAP, ['Yellow', 'Blue', 'Red', 'Green']),
    16: (KPN_MAP, ['Rewind', 'Play', 'Pause', 'FastForward', 'Record', 'Stop', 'List']),
    17: (KPN_MAP, ['Number1', 'Number2', 'Number3', 'Number4', 'Number5', 'Number6', 'Number7', 'Number8',
                  'Number9', 'Number0']),
}

#: The same for the first run, on its own file; step 7 is the colour keys left to right.
STEPS_21 = {
    7: (TV_MAP, ['Red', 'Green', 'Yellow', 'Blue']),
}

#: The 49, by the European drawing's names: every one the code of the Harmony 350 key in the same place.
DECIDED = {
    'CableSat': 1, 'Favorite3': 2, 'Power': 3, 'VcrAux': 4, 'Tv': 5, 'WatchTV': 6, 'Dvd': 7, 'Favorite1': 8,
    'Favorite2': 9, 'Menu': 10, 'Teletext': 11, 'Exit': 12, 'Red': 13, 'DirectionLeft': 14, 'VolumeMute': 15,
    'List': 16, 'Number4': 17, 'Number7': 18, 'Number0': 20, 'SkipBack': 21, 'Rewind': 22, 'Record': 23,
    'Number1': 24, 'Green': 27, 'Yellow': 28, 'Blue': 29, 'FastForward': 30, 'DirectionRight': 31,
    'PrevChannel': 32, 'Guide': 33, 'Favorite4': 34, 'Info': 36, 'Number6': 37, 'SkipForward': 38,
    'Number3': 39, 'Stop': 40, 'ChannelDown': 41, 'DirectionDown': 42, 'Play': 44, 'Number9': 45, 'Pause': 46,
    'Number2': 47, 'Number5': 48, 'VolumeUp': 49, 'Select': 50, 'DirectionUp': 51, 'VolumeDown': 52,
    'Number8': 53, 'ChannelUp': 55,
}


def _sent(step):
    """A step's presses that are presses: not a bare trailing frame and not an unreadable fragment."""
    return [p for p in step['presses'] if not p['frame']['bare'] and not p['frame'].get('unreadable')]


def _heard(press):
    return {(m['group'], m['code']) for m in press['frame']['matches'] if m['config'] == NAMED}


def _every_key_config():
    path = os.path.join(lab.LAB or '', *EVERY_KEY)
    if not lab.LAB or not os.path.isfile(path):
        raise unittest.SkipTest('the first run\'s file is not in the lab')
    c = _Config.__new__(_Config)
    c.name = 'every-key'
    with open(path, 'rb') as handle:
        c.blob = handle.read()
    return c


class TheBench300HeardEveryKey(unittest.TestCase):

    def setUp(self):
        lab.require('h300_keys_ir', 'h300_every_key_ir', NAMED)
        self.run22 = json.loads(lab.load('h300_keys_ir'))
        self.run21 = json.loads(lab.load('h300_every_key_ir'))
        self.c22 = _Config(NAMED)
        self.c21 = _every_key_config()

    def _codes(self, run, config, steps):
        found = {}
        for step, (entry, keys) in steps.items():
            presses = _sent(run['steps'][step - 1])
            self.assertEqual(len(presses), len(keys), 'step %d' % step)
            first = _first_sends(config, entry)
            for key, press in zip(keys, presses):
                scans = {scan for scan, send in first.items() if send in _heard(press)}
                found[key] = found.get(key, scans) & scans
        return found

    def test_the_runs_are_the_two_tests_and_the_second_failed_four_steps_on_its_wording(self):
        self.assertEqual(self.run21['name'], 'Harmony 300, every key sends something')
        self.assertEqual(self.run22['name'], "Harmony 300, every key in the TV's and the KPN's modes")
        failed = [i + 1 for i, step in enumerate(self.run22['steps']) if not all(v['ok'] for v in step['verdicts'])]
        self.assertEqual(failed, [6, 9, 15, 18])
        self.assertEqual([i + 1 for i, step in enumerate(self.run21['steps'])
                          if not all(v['ok'] for v in step['verdicts'])], [])

    def test_the_keys_that_send_have_one_code_each_over_both_modes(self):
        found = self._codes(self.run22, self.c22, STEPS_22)
        for key, scans in self._codes(self.run21, self.c21, STEPS_21).items():
            found[key] = found.get(key, scans) & scans
        self.assertEqual({key: sorted(scans) for key, scans in found.items()},
                         {key: [DECIDED[key]] for key in found})
        self.assertEqual(len(found), 39)

    def test_the_colour_keys_left_to_right_and_by_colour_are_13_27_28_29(self):
        by_place = self._codes(self.run21, self.c21, STEPS_21)
        self.assertEqual([sorted(by_place[k]) for k in ('Red', 'Green', 'Yellow', 'Blue')], [[13], [27], [28], [29]])
        # Pressed by the colour the second run's step named, yellow, blue, red, green, in the KPN box's mode.
        by_colour = self._codes(self.run22, self.c22, {15: STEPS_22[15]})
        self.assertEqual([sorted(by_colour[k]) for k in ('Yellow', 'Blue', 'Red', 'Green')], [[28], [29], [13], [27]])

    def test_the_favourites_printed_1_to_4_are_8_9_2_and_34_by_the_channel_each_loads(self):
        # The KPN box's map loads a channel for the number sender from four codes, and nothing else does.
        loads = {}
        for tag, operand, opcode in self.c22.tagged(self.c22.maps()[KPN_MAP]):
            body = self.c22.flat(operand, opcode)
            if tag & 0xC0 == PRESS and any(opc == 0x1F and op >> 8 == NUMBER_SENDER for op, opc in body):
                loads[[op for op, opc in body if opc == 0x7A][0]] = tag & 0x3F
        self.assertEqual(loads, {1: 8, 2: 2, 3: 9, 666: 34})
        # The KPN box's own digit codes, from its digit keys' bindings, and what the four presses after TV
        # Input in step 18 were heard as, digit by digit: 1, then 3, then 2, then 6 three times.
        first = _first_sends(self.c22, KPN_MAP)
        digit = {d: first[DECIDED['Number%d' % d]] for d in (1, 2, 3, 6)}
        heard = [next(d for d, send in digit.items() if send in _heard(p)) for p in _sent(self.run22['steps'][17])]
        self.assertEqual(heard, [1, 3, 2, 6, 6, 6])
        # The keys were pressed by printed number, 1 to 4, so the nth channel heard is the nth key's. Pressed
        # by the step's places instead, skipping Teletext, the keys printed 3 and 4 would trade codes, against
        # the places measured on the Harmony 350; this test cannot tell the two orders apart by itself.
        channels = [1, 3, 2, 666]
        self.assertEqual(''.join(str(n) for n in channels), ''.join(str(n) for n in heard))
        printed = {key: loads[n] for key, n in zip(('Favorite1', 'Favorite2', 'Favorite3', 'Favorite4'), channels)}
        self.assertEqual(printed, {k: DECIDED[k] for k in printed})

    def test_teletext_is_11_the_one_binding_that_sends_what_the_first_run_heard(self):
        presses = _sent(self.run21['steps'][11])
        self.assertEqual(len(presses), 7)
        first = _first_sends(self.c21, TV_MAP)
        info = first[DECIDED['Info']]
        odd = [_heard(p) for p in presses if info not in _heard(p)]
        self.assertEqual(len(odd), 1)
        self.assertEqual(sorted(scan for scan, send in first.items() if send in odd[0]), [DECIDED['Teletext']])

    def test_the_device_keys_select_the_map_whose_codes_were_heard_next_and_watch_tv_sends_what_was_heard(self):
        selects = {}
        for tag, operand, opcode in self.c22.tagged(self.c22.maps()[KEY_TABLE]):
            chosen = [op & 0xFF for op, opc in self.c22.flat(operand, opcode) if opc == 0x1F and op >> 8 == 0xFF]
            if tag & 0xC0 == PRESS and chosen:
                selects[tag & 0x3F] = chosen[-1]
        # TV, Cable/Sat, DVD and VCR/Aux, and Watch TV, which ends in the KPN box's mode.
        self.assertEqual(selects, {5: TV_MAP, 1: KPN_MAP, 7: 2, 4: 4, 6: KPN_MAP})
        # The next key after each device key, heard sending from the group its map sends: the second run's
        # steps 2 and 11, the first run's 14, 15 and 16.
        self.assertEqual({g for g, _ in _heard(_sent(self.run22['steps'][1])[0])}, {0})
        self.assertEqual({g for g, _ in _heard(_sent(self.run22['steps'][10])[0])}, {1})
        self.assertEqual([{g for g, _ in _heard(_sent(self.run21['steps'][s])[0])} for s in (13, 14, 15)],
                         [{2}, {3}, {1}])
        # Watch TV, code 6: its binding's sends, the KPN box's power then the television's, are what step 17
        # of the first run heard.
        watch = [tag for tag, _, _ in self.c21.tagged(self.c21.maps()[KEY_TABLE]) if tag == PRESS | DECIDED['WatchTV']]
        self.assertEqual(len(watch), 1)
        self.assertEqual([sorted(_heard(p)) for p in _sent(self.run21['steps'][16])], [[(1, 29)], [(0, 5)]])


if __name__ == '__main__':
    unittest.main()
