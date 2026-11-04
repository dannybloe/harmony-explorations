"""
The Harmony 880 and 885's base slot 15: nine groups demanded, each of a demanded length, and a mismatch that
falls back without a word.

**Read in the firmware** on 4 November 2026, item 3.5 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`) and the Harmony 720's. **Measured in configurations**
over the sixteen distinct arch 8 containers of `tests/test_harmony_885_start_check.py`'s `CALIBRATION` and
the built in configuration inside each of the five application images. No remote was opened. Addresses
are the 885 application's.

**Sources checked before the work**: `reference/config-format/state.md`, "Base slot 15: the parameter
block" (section 44: the guard on the Harmony 700 at `0x0F8F0` and the One at `0x23262`, count 9 and 11,
arch 8 "carries the section and no image read here reads it"), section 105 (the two arm call site the arch
12 scan once missed), `src/harmony/gspm.py` and `packages/codec/src/tables.ts`, `PARAMETER_GROUP_COUNTS`,
which had no arch 8 row, and `tests/test_toolchain.py`'s `TheTwoParameterGroupTablesAgree`. **Logitech's
client, decision 2**: not searched; the guard's literals are the firmware's own answer and no client
builds this section differently per model.

## The guard

`0x10E1A` is the only reader of base slot 15: it returns 0 at once unless a configuration passed (data
`0x086` bit 2 or 1), seeks raw slot `0x10`, which is base slot 15 by the arch 8 map, reads the `u8` count
and **returns 0 unless it is 9** (`MOVLW 0x09` at `0x10E3A`). It then adds its first argument, data
`0x3DD`, a byte offset into the pointer array, follows that pointer, reads the group's `u8` entries and
returns 1 only when they equal its second argument, data `0x3DE`. It is reached only by nine calls, every
one after a `MOVLW` of the length into `0x3DE` and of the offset into `0x3DD` (or a `CLRF` of it, offset
0), and one site, `0x114D0`, has two arms chosen by three input bits that load offsets 18 and 15 with the
same length 14. So the demands are ten literal pairs, decoded below rather than written here, and the
offset divided by three is the group:

| group | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|---|
| length demanded | 1 | 6 | 1 | no call site | 6 | 14 | 14 | 1 | 2 |

Group 7 has three call sites, all length 1. That is the arch 8 row now in both copies of
`PARAMETER_GROUP_COUNTS`; the closure is that this file decodes the row out of the image and compares it
with the Python copy, and `TheTwoParameterGroupTablesAgree` holds the TypeScript copy equal to that.

**A mismatch is silent**: every failure leaves the guard by `RETLW 0x00`, and the callers fall back. What
each caller falls back to is in the item's result note and not asserted here: compiled in defaults for
groups 0, 1, 2, 7 and 8, and no update at all for 4, 5 and 6.

## The corpus

**Twenty one of twenty one pass**: the sixteen containers and the five built in configurations all state
count 9 and lengths `1, 6, 1, 1, 6, 14, 14, 1, 2`, so group 3 is one value no call of the guard asks for. The
sixteen are copies of six configurations, and the five built in ones are two distinct: the 880 and 885
images share one byte for byte and the 720's is its own. Read through
the library for the sixteen and through raw slot 16's pointer for the five, whose architecture record is
zero.

## The Harmony 720

Its guard is at the same address with the same seek of raw slot 16 and the same count of 9, and its nine
call sites load the same ten pairs into its own argument bytes, so the arch 8 row holds for it too.

## Reviewers

Two, per the `finding` skill; their findings are in the landing commit's message.
"""
import unittest

import lab
from harmony import gspm
from test_harmony_885_actions import containers
from test_harmony_885_start_check import (BASE, OTHER_APPLICATIONS, application, by_name, listing, text, transfers_to,
                                          window)

GUARD = 0x10E1A
#: Where the nine callers sit, between the guard and the next module.
CALLERS = (0x10E62, 0x11B40)
RAW_SLOT = 0x10
#: Where the guard takes its two arguments: data 0x3DE the length and 0x3DD the offset, and on the 720
#: 0x201 and 0x200.
ARGUMENTS = ('MOVLB 0x3', '0xde', '0xdd')
ARGUMENTS_720 = ('MOVLB 0x2', '0x01', '0x00')
BUILT_IN = 0xE000
LENGTHS = [1, 6, 1, 1, 6, 14, 14, 1, 2]


def demands(code, arguments=ARGUMENTS):
    """Every (offset, length) the guard is handed, decoded from the loads that precede a call.

    Read straight off the instruction stream: a `MOVLW` into the length's register, then the offset as a
    `MOVLW` into its own or a `CLRF` of it, both under the arguments' bank. The two arm site loads its
    second pair before a `BRA` into the shared store, which is why the pattern ends at the offset's load
    rather than at the call.
    """
    bank, length_at, offset_at = arguments
    ins = [text(i) for _, i in listing(code, *CALLERS)]
    found = []
    for n in range(len(ins) - 4):
        if ins[n] == bank and ins[n + 1].startswith('MOVLW') and ins[n + 2] == 'MOVWF ' + length_at \
                and ins[n + 3] == bank:
            length = int(ins[n + 1].split()[1], 16)
            offset = 0 if ins[n + 4] == 'CLRF ' + offset_at else int(ins[n + 4].split()[1], 16)
            found.append((offset, length))
    return found


def built_in_groups(image):
    """The built in configuration's base slot 15 as a list of group lengths, read by pointer."""
    blob = image[BUILT_IN:]

    def at(address):
        return address - (BASE + BUILT_IN)
    item = 0x0B + 4 * RAW_SLOT
    section = at(int.from_bytes(blob[item + 1:item + 4], 'little'))
    count = blob[section]
    return [blob[at(int.from_bytes(blob[section + 1 + 3 * g:section + 4 + 3 * g], 'little'))] for g in range(count)]


class TheGuard(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_it_reads_raw_slot_16_and_demands_a_count_of_9(self):
        self.assertEqual(gspm.base_slot(8, RAW_SLOT), 15)
        self.assertEqual(window(self.code, GUARD + 0x10, 9),
                         ['MOVLW 0x10', 'MOVWF 0xd3', 'CALL 0x191de', 'CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xc2',
                          'MOVLW 0x09', 'SUBWF 0xc2,W', 'BNZ 0x10e60'])

    def test_it_compares_the_groups_entries_with_its_second_argument_and_fails_silently(self):
        self.assertEqual(window(self.code, GUARD + 0x26, 13),
                         ['MOVFF 0x3dd,0x0d1', 'CALL 0x191aa', 'CALL 0x19062', 'CALL 0x1908e', 'MOVLB 0x2',
                          'MOVWF 0xc2', 'MOVLB 0x3', 'MOVF 0xde,W', 'MOVLB 0x2', 'SUBWF 0xc2,W', 'BNZ 0x10e60',
                          'RETLW 0x01', 'RETLW 0x00'])

    def test_it_is_the_only_seek_of_raw_slot_16(self):
        from test_harmony_885_slots import SEEKER, seeks
        self.assertEqual([call for call, slot in seeks(self.code, SEEKER) if slot == RAW_SLOT], [GUARD + 0x14])

    def test_nine_call_sites_reach_it_and_only_from_its_callers_block(self):
        sites = transfers_to(self.code, GUARD)
        self.assertEqual(len(sites), 9)
        self.assertTrue(all(CALLERS[0] <= s < CALLERS[1] for s in sites))

    def test_the_demands_decoded_from_the_image_are_the_arch_8_row(self):
        found = demands(self.code)
        self.assertEqual(len(found), 10, 'nine sites, one of them with two arms')
        self.assertTrue(all(offset % 3 == 0 for offset, _ in found))
        decoded = {}
        for offset, length in found:
            self.assertEqual(decoded.setdefault(offset // 3, length), length)
        self.assertEqual(decoded, gspm.PARAMETER_GROUP_COUNTS[8])
        self.assertNotIn(3, decoded)

    def test_the_row_is_not_another_architectures(self):
        """The control: the decoded row would be vacuous if it matched every table."""
        row = gspm.PARAMETER_GROUP_COUNTS[8]
        self.assertNotEqual(row, gspm.PARAMETER_GROUP_COUNTS[14])
        self.assertNotEqual(row, gspm.PARAMETER_GROUP_COUNTS[12])

    def test_the_720_demands_the_same(self):
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        self.assertEqual(demands(h720, ARGUMENTS_720), demands(self.code))
        self.assertEqual(demands(h720), [], 'the registers of the 885 find nothing on the 720, so the match is not loose')
        self.assertEqual(len(transfers_to(h720, GUARD)), 9)
        self.assertEqual(window(h720, GUARD + 0x10, 9),
                         ['MOVLW 0x10', 'MOVWF 0xd3', 'CALL 0x1926e', 'CALL 0x1911e', 'MOVLB 0x2', 'MOVWF 0xca',
                          'MOVLW 0x09', 'SUBWF 0xca,W', 'BNZ 0x10e60'])


class TheCorpus(unittest.TestCase):
    def test_sixteen_containers_pass_with_the_same_lengths(self):
        found = {}
        for name, c in containers():
            found[name] = (tuple(len(g) for g in c.parameter_groups()), c.parameter_group_lengths_match())
        self.assertEqual(set(found.values()), {(tuple(LENGTHS), True)})
        self.assertEqual(len(found), 16)

    def test_the_five_built_in_configurations_pass_with_the_same_lengths(self):
        lab.require('arch8_code_880')
        images = {'885': application(), '880': lab.load('arch8_code_880')}
        images.update(zip(OTHER_APPLICATIONS, by_name(*OTHER_APPLICATIONS.values())))
        found = {model: built_in_groups(image) for model, image in images.items()}
        self.assertEqual(found, {model: LENGTHS for model in images})
        self.assertEqual(len(found), 5)

    def test_a_group_of_another_length_fails_the_check(self):
        """The negative: one group shortened by a value, read through the same check."""
        name, c = containers()[0]
        groups = c.parameter_groups()
        groups[1] = groups[1][:-1]
        wanted = gspm.PARAMETER_GROUP_COUNTS[8]
        self.assertFalse(all(len(groups[i]) == n for i, n in wanted.items()))


if __name__ == '__main__':
    unittest.main()
