"""
The Harmony 880 and 885's action queue: forty instructions, a full push dropped in silence, the Harmony
One's model exactly, and two pops that do not look before they take.

**Read in the firmware** on 4 November 2026, item 3.2 of `todo/todo-prepare-885.md`, in the 885's
application 4.4 (`arch8_code_885`, base `0x010000`; the 880's and the 880 Pro's differ in the two skin bytes
only, `tests/harmony_880_885/test_harmony_885_start_check.py`) and the Harmony 720's application. **Measured in
configurations** over the sixteen distinct arch 8 containers of that file's `CALIBRATION`, the peaks by the
codec's own model, `packages/codec/src/container/queue.ts`, run under node through
`tests/harmony_880_885/test_harmony_885_actions.py`'s probe rather than copied. No remote was opened.

**Sources checked before the work**: `reference/config-format/actions.md`, "The action queue holds forty
instructions", read on arch 12, 14 and 9 (sections 238, 254 and 255), with the Harmony 880 and 885 in its
table of peaks at 13 from six containers (`packages/codec/test/container/queue.test.ts`); `tests/firmware/test_action_queue.py`
for the shape of the reading; section 140 for the zero arm. **Logitech's client, decision 2**: the forty is
the firmware's and the client was not searched for it; the Harmony One's hang, section 238, is the reason
the bound is a rail.

## The ring

`0x12DB4` clears the count `0x31E` and sets both cursors, read `0x397`/`0x398` and write `0x399`/`0x39A`, to
`0x031F`. The pop `0x12E0A` and the push wrap at `0x0397` back to `0x031F`, and the full test `0x12DCA` is
`count == 0x78`. **Three constants close on each other**: `0x0397 - 0x031F` is `0x78`, the full test's own
literal, and `0x78 / 3` is forty instructions, the Harmony One's and the Harmony 525's figure, read here
from a fourth image. The main loop is execute (`0x16E6E`, `CALL 0x13090`) then rotate (`0x16E72`, `CALL
0x130CC`), section 238's shape, so a `0x7F` runs its list next and the ring holds the call stack.

**A full push is dropped in silence**: the counted push `0x12F9A` tests the three bytes for zero, then
calls the full test and returns on a full queue before counting, so a dropped instruction is not rotated
either. Its callers are the event delivery, `0x7B`'s arm, the `0x1F` `0xF7` arm, the transition loop and
two binding lookups; the uncounted push `0x12FC2` serves the head push `0x12EE8`, the infrared drain's
release of a deferred instruction (`0x14C2A`) and one event (`0x15238`).

**Two pops take without looking.** The executor's fetch calls the empty test `0x12E00` before its three
pops. The pop `0x12E0A` itself tests nothing, and it has nine callers: the fetch's three, the skip of a
false comparison (`0x13524`, `0x13526`, `0x13528`) and the deferred instruction's (`0x135BE`, `0x135C4`,
`0x135CA`). Within one list that is safe when the instruction taken was pushed with the one taking it: every one of
the 998 comparisons of the sixteen is followed in its own list by its one or two arms, and every deferred
instruction by its argument, 77 of 77. **The sixteen updates are the exception**: each is `0x70 0x07vv`
followed only by the all zero filler, which is never queued, so its skip takes the caller's next
instruction, as `tests/harmony_880_885/test_harmony_885_actions.py` shows. This header first counted all 1014 `0x70` and
`0x71` as comparisons; the prose audit split them. On an empty queue the count would go below zero and wrap,
inferred and not reached by anything in the corpus. The two armed conditional's zeroing at `0x134AA`
writes three bytes after the next instruction without a test either.

**The infrared queue is a second, smaller ring**: thirty bytes from `0x15D`, cleared by `0x14552`, wrapping
at `0x17B` (`0x17B - 0x15D` is `0x1E`, the full test `0x14568`'s literal). A push that does not fit is put
back, `tests/harmony_880_885/test_harmony_885_actions.py`, so the action queue waits behind it and loses nothing.

## The corpus

**Every one of the sixteen peaks at 13**, no list over forty and none the model cannot follow; the six
of them `queue.test.ts` already holds are 13 there too; the sixteen are six configurations, several read
more than once. The model is the firmware's ring with the same call and rotate, so **`assertQueueFits`
carries over unchanged as a floor**, with `ACTION_QUEUE_BYTES` at `0x78`, a peak above forty still proving
loss. Where
the model and this firmware part: it counts the all zero instructions, which this firmware never queues
(`tests/harmony_880_885/test_harmony_885_actions.py`), so it counts more there; it runs a deferred instruction's call at
once, where the firmware releases it later at the tail, which this file does not bound in either
direction; and, as on every platform, it leaves out what a state write's transitions push and the event a
send posts at the head when the infrared queue changes state, so on those it counts less (section 238 calls
the figure a floor for that reason).

## The Harmony 720

Its ring's clear, its full test and its pop's wrap carry the same literals, `0x1F`/`0x03`, `0x78` and
`0x97`/`0x03`, at addresses `0x46` lower, and its main loop calls execute then rotate as the 885's does.
Its pushes, infrared queue and transmitter are not compared here.

## Negative results

* The interrupt vectors were walked over static edges in item 3.2's reading and reach no push, pop or
  rotate; a computed transfer at `0x19812` was not followed, so this is not asserted here.
* No arch 8 configuration carries a hand authored sequence, so nothing in this corpus approaches the
  Harmony One's hang.

## Reviewers

Two, per the `finding` skill. **The blind re-measurement** reproduced the ring's 120 bytes, the silent drop,
the unchecked pops and the peak of 13 in all sixteen. **The prose audit** found this header counting all
1014 `0x70` and `0x71` as comparisons, when 16 are updates whose following slot is the never queued filler,
and "carries over unchanged" said without the model being a floor; both corrected, the test renamed, and
the 720's wrap constant, claimed and not asserted, now asserted.
"""
import collections
import unittest

import lab  # noqa: F401, puts `src` on the path
from .test_harmony_885_actions import codec_probe, containers
from .test_harmony_885_start_check import CALIBRATION, OTHER_APPLICATIONS, application, by_name, transfers_to, window

INIT = 0x12DB4
FULL = 0x12DCA
POP = 0x12E0A
EMPTY = 0x12E00
SPOOL = 0x12F9A
SPOOL_UNCOUNTED = 0x12FC2
FETCH = 0x13090
QUEUE_BYTES = 0x78
INSTRUCTION_BYTES = 3
#: The action queue's limit as the codec states it, `ACTION_QUEUE_INSTRUCTIONS` in `queue.ts`.
CODEC_LIMIT = 40


def literal_pair(code, address):
    """A sixteen bit literal loaded as `MOVLW low; MOVWF; MOVLW high`, from `address`."""
    low, _, high = window(code, address, 3)
    return int(high.split()[1], 16) << 8 | int(low.split()[1], 16)


class TheRing(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_start_end_and_full_close_on_forty(self):
        self.assertEqual(window(self.code, INIT, 2), ['MOVLB 0x3', 'CLRF 0x1e'])
        start = literal_pair(self.code, 0x12DB8)
        self.assertEqual(literal_pair(self.code, 0x12DC0), start)
        self.assertEqual(window(self.code, 0x12E20, 4), ['MOVLW 0x97', 'SUBWF 0x97,W', 'MOVLW 0x03', 'SUBWFB 0x98,W'])
        end = 0x0397
        self.assertEqual(literal_pair(self.code, 0x12E2A), start)
        self.assertEqual(window(self.code, FULL, 6),
                         ['MOVLW 0x78', 'MOVLB 0x3', 'SUBWF 0x1e,W', 'BZ 0x12dd4', 'RETLW 0x00', 'RETLW 0x01'])
        self.assertEqual((start, end - start), (0x031F, QUEUE_BYTES))
        self.assertEqual(QUEUE_BYTES // INSTRUCTION_BYTES, CODEC_LIMIT)

    def test_execute_then_rotate(self):
        self.assertEqual(window(self.code, 0x16E6E, 2), ['CALL 0x13090', 'CALL 0x130cc'])
        # The rotate turns three bytes per instruction counted in 0x309, then clears the count.
        self.assertEqual(window(self.code, 0x130CC, 14),
                         ['MOVLB 0x2', 'CLRF 0xb2', 'MOVLB 0x3', 'MOVF 0x09,W', 'MOVLB 0x2', 'SUBWF 0xb2,W',
                          'BC 0x130e6', 'RCALL 0x12e38', 'RCALL 0x12e38', 'RCALL 0x12e38', 'MOVLB 0x2', 'INCF 0xb2',
                          'BRA 0x130d0', 'MOVLB 0x3'])
        self.assertEqual(window(self.code, 0x130E8, 1), ['CLRF 0x09'])

    def test_a_full_push_is_dropped_before_it_is_counted(self):
        self.assertEqual(window(self.code, SPOOL + 0x0A, 4),
                         ['RCALL 0x12dca', 'IORLW 0x00', 'BNZ 0x12fc0', 'MOVLB 0x3'])
        self.assertEqual(window(self.code, SPOOL + 0x12, 1), ['INCF 0x09'])
        self.assertEqual(transfers_to(self.code, SPOOL), [0x13000, 0x1329E, 0x136DA, 0x1759A, 0x19528, 0x195F2])
        self.assertEqual(transfers_to(self.code, SPOOL_UNCOUNTED), [0x12EFA, 0x14C2A, 0x15238])

    def test_the_fetch_looks_first_and_the_skip_and_the_deferral_do_not(self):
        self.assertEqual(window(self.code, FETCH, 3), ['RCALL 0x12e00', 'IORLW 0x00', 'BNZ 0x130ca'])
        self.assertEqual(window(self.code, POP, 5), ['MOVFF 0x397,0xfe9', 'MOVFF 0x398,0xfea', 'MOVFF 0xfef,0x2b2',
                                                   'MOVLB 0x3', 'DECF 0x1e'])
        self.assertEqual(transfers_to(self.code, POP), [0x13096, 0x1309C, 0x130A2, 0x13524, 0x13526, 0x13528,
                                                        0x135BE, 0x135C4, 0x135CA])
        self.assertEqual(transfers_to(self.code, EMPTY), [FETCH, 0x1311A])

    def test_the_infrared_queue_is_thirty_bytes(self):
        start = literal_pair(self.code, 0x14556)
        self.assertEqual(literal_pair(self.code, 0x1455E), start)
        self.assertEqual(window(self.code, 0x1458A, 4), ['MOVLW 0x7b', 'SUBWF 0x7d,W', 'MOVLW 0x01', 'SUBWFB 0x7e,W'])
        self.assertEqual(window(self.code, 0x14568, 3), ['MOVLW 0x1e', 'MOVLB 0x1', 'SUBWF 0x5c,W'])
        self.assertEqual((start, 0x017B - start), (0x015D, 0x1E))


class TheCorpus(unittest.TestCase):
    def test_every_one_of_the_sixteen_peaks_at_13(self):
        probe = codec_probe()
        self.assertEqual({name: (a['peak'], a['over'], a['undecided']) for name, a in probe.items()},
                         {name: (13, 0, 0) for name in CALIBRATION})

    def test_every_comparison_and_deferral_has_its_successor_in_its_own_list_and_no_update_does(self):
        comparisons = deferred = 0
        short = []
        updates = collections.Counter()
        for name, c in containers():
            lists = c.action_lists()
            for n, li in enumerate(lists):
                for k, ins in enumerate(li):
                    if ins.opcode in (0x70, 0x71) and (ins.operand >> 8 & 0x0F) in (6, 7):
                        # An add or a subtract: the successor in its list is the all zero filler, never queued.
                        following = [(x.opcode, x.operand) for x in li[k + 1:]]
                        updates[tuple(following)] += 1
                    elif ins.opcode in (0x70, 0x71):
                        comparisons += 1
                        if k + (2 if ins.operand & 0x8000 else 1) >= len(li):
                            short.append((name, n, k))
                    if 0x3F <= ins.opcode < 0x6F and 0xD0 <= ins.operand >> 8 <= 0xDF:
                        deferred += 1
                        if k + 1 >= len(li):
                            short.append((name, n, k))
        self.assertEqual((comparisons, deferred, short), (998, 77, []))
        self.assertEqual(updates, {((0x00, 0x0000),): 16})


class TheHarmony720(unittest.TestCase):
    def test_its_ring_has_the_same_literals_0x46_lower(self):
        (h720,) = by_name(OTHER_APPLICATIONS['720'])
        self.assertEqual(window(h720, INIT - 0x46, 11), window(application(), INIT, 11))
        self.assertEqual(window(h720, FULL - 0x46, 6)[:3], ['MOVLW 0x78', 'MOVLB 0x3', 'SUBWF 0x1e,W'])
        self.assertEqual(window(h720, 0x12E20 - 0x46, 4), window(application(), 0x12E20, 4))
        self.assertEqual(window(h720, 0x16EE6, 2), ['CALL 0x1304a', 'CALL 0x13086'])


if __name__ == '__main__':
    unittest.main()
