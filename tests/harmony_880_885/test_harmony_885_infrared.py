"""
The Harmony 880 and 885's infrared player: the reference's record read through its own start, a carrier from
the processor's PWM rounded to 250 ns with no clamp, one toggle bit per infrared group in eight, a one microsecond word
that is where a released key stops, and six microseconds taken off every duration.

**Read in the firmware** on 4 November 2026, in the 885's application
4.4 (`arch8_code_885`, base `0x010000`; the 880's differs in two skin bytes only,
`tests/harmony_880_885/test_harmony_885_start_check.py`), and compared against the Harmony 720's, the 880 Pro's and a second
880's applications. **Measured in configurations** over the sixteen distinct arch 8 containers of that file's
`CALIBRATION`, six configurations' lineages, one of them a Harmony 720's; the counts below are sums over
copies. No remote was opened. Addresses are the 885 application's.

**Register names outside the processor core are inferred.** The part is not established on this platform; the
names used are a PIC18C801's, and they hang together: the routine that writes `0x0C`, PWM mode, to `0xFBD`
(`CCP1CON`) also writes a period less one to `0xFCB` (`PR2`) and sets bit 2 of `0xFCA` (`TMR2ON`), and the stop
clears bit 2 of `0xF82`, the CCP1 pin on port C.

**Sources checked before the work**: `reference/config-format/infrared-records.md` (the record, sections 75,
92 and 181; once, held and tail, section 127, read on the Harmony 600, 700 and One; the toggle, section 365,
read on the Harmony 650 and One; the 256000 clamp, section 92, on the Harmony 700), `reference/infrared/sending.md`
(the software carrier of section 13 on the Harmony 700 2.8; the compiler's spelling, section 174; the trailing
microsecond, section 309), `docs/findings.md` section 91, which lists CCP1 written `0x0C` on the One 3.4, the
700 2.8, the 600 0.2 and the 525 images, section 80 (the 525's player subtracts six), and `tests/harmony_880_885/test_harmony_885_actions.py`
(the infrared queue, variable 17 and the `0x2D` handshake). **Logitech's client, decision 2**: not
searched; how the remote plays a record is the firmware's alone.

## The loader, `0x17C86`

It seeks raw slot 5, takes the group's pointer at `1 + 3 * group` and the record's at `3 + 3 * index`, both
indices a **byte**, so at most 256 records of a group are reachable and the group's `u16` count is never read.
It reads the class byte where the pointer lands, `+0x07`, saves the cursor and **follows the `u24` at `+0x08`,
the record's own start, and reads the header from there**: on this platform the own start is not a search key
but the address the header is read at. The class switch `{4, 3, 2, 1}` is a chain at `0x17CC8`. Class 1 reads
the byte at `+0x00` into `0x2B3` and then the period at `+0x01` over it into `0x2B4` to `0x2B6`, of which the
low sixteen bits go to the carrier structure, and the on time likewise; nothing in the loader reads `0x2B3`, so
the byte is read and thrown away. Then it restores `+0x08`, steps three bytes to the group count and skips
`count - 1` groups of nine bytes, one fewer when the count is 2 and the toggle flag is set. The count is a byte
decremented before it is tested, **so a count of 0 skips 255 groups** and a count of 3 or more plays the last.
Classes 2 to 4 are dispatched and used by no configuration; their arms are not read here.

## The carrier

`0x19E88` computes `PR2 = (period + 125) / 250 - 1` and the duty `(on + 125) / 250`, each as a byte, and writes
`0x0C` to `CCP1CON`: **the carrier comes from the PWM**, the period rounded to whole 250 ns counts. The quotient
fits `PR2` only up to 256, a period of 64124 ns, about 15.6 kHz; below that the register wraps and another
carrier is played, and the loader has already cut a period of 65536 ns or more to sixteen bits. **No clamp**,
where `reference/config-format/infrared-records.md` states the Harmony 700's at 256000. For every frequency in
whole hundreds of hertz from 16.0 to 100.0 kHz, 841 of them, Logitech's truncated `floor(1e9 / f)` and a rounded
period give the same `PR2` and duty, so truncating changes nothing played; and the ten carriers of the corpus
play within half a percent of what they state. That 250 ns is a `PR2` count rests on the division and the
names: the instruction clock is not measured.

This is the carrier on arch 8 only. `reference/infrared/sending.md` describes a carrier made in software on the
Harmony 700 2.8 (section 13) where section 91 found CCP1 set to PWM on the One, 700, 600 and 525 images; which of
the two drives the lamp on those images is not settled here and is left to the page, not generalised.

## The words

The Timer 0 interrupt takes one word at a time out of a 256 byte ring that the main loop fills (`0x19F26`):

* ring empty or a word of `0x0000`: stop;
* `0x0001`: stop when the streamer's slot state `0x184` is 3 or more, a release or a pending tail; otherwise
  take the next word at once;
* anything else, `0x0002` to `0x000F` included: a duration; bit 15 sets the duty, the carrier on, clear clears
  it; the word is then **reduced by six**, as a sixteen bit subtraction, and counted down on Timer 0.

So a word whose low fifteen bits are 2 to 5, and a mark of 0 to 5 us (`0x8000` to `0x8005`), underflows to about
65.5 ms. The corpus holds none: its shortest mark is 30 us and its shortest space 77 us.

## Once, held and tail

The streamer steps on the slot state `0x184` at each block's zero word (chain `0x17FC4`, `{2, 1}`, 0 by fall
through) and the key flag, `0x182` bit 2. At the end of slot 0 it advances one, or two with the key up; at the
end of slot 1 with the key down it replays slot 1 (advance zero), and with the key up loads the tail and sets
the state to 4, or to 2 when the tail is NULL; at the end of slot 2 it sets 3. **So the one microsecond word every
once and held block ends in is where a released key stops**: the streamer reads ahead of the interrupt, and the
interrupt stops at the first `0x0001` once the state is 3 or more, the end of the copy on the air, rather than
playing what was buffered. **A tail after a held key is a second transmission**: state 4 makes the main loop
set 2, clear the ring and fill and start again (`0x14E58` to `0x14E66`). Whether a tail is sent after a tap, which
the reading says the interrupt cuts at the once block's last word, is not checked on a unit.

## The toggle

The transmitter flips one bit per infrared group in the word at `0x180` at every send, before loading the record
(`0x14F1A`), and passes "the bit is set" to the loader, so the first group plays when it is set. The bit comes
from `0x1A864`, which masks the group to four bits and rotates one byte left without carry that many times, so
**the bit is `1 << (group & 7)`**: groups 8 and up share a bit with groups 0 and up, and `0x181` is never
flipped. The word is cleared by the infrared set up `0x14646`, called once, from main's start sequence. So the
first send to a device after a start plays the first group, the code as stated, as on the Harmony 650 and One.

## The corpus

5792 records over the sixteen, every one class 1, own start equal to the pointer less 7 on all 5792, the byte at
`+0x00` zero on all, the group's spare byte zero on all, 5644 with one pointer group and 148 with two, never 0 or
3; at most 164 records in a group. Per pointer group, once, held and tail: `B00` 2625, `BB0` 2851, `B0B` 369,
`BBB` 95. Of the block pointers, 5940 name a once block and all end in a `0x0001` word, 2946 a held block and
all do, 464 a tail and none does; no `0x0001` occurs anywhere but last. 58810 words hold the maximum 32767.
5917 of 5917 sends name a record that exists.

## The other builds

The class 1 start, run and stop, the toggle helper and the loader on the 880 Pro's and the second 880's
applications are byte for byte the 885's at the same addresses. On the Harmony 720 the class 1 routines sit at
`0x19F18`, `0x19FB6` and `0x19FA8` and match the 885's as mnemonic, literal and bit, the 125 and 250 included.

## Negative results

* No record of the sixteen has a class other than 1, a group count of 0 or 3 and up, or a carrier below 36 kHz.
* No word below sixteen microseconds other than the bare `0x0001`.

## Reviewers

Two, per the `finding` skill, over the four files of this landing. **The blind re-measurement** reproduced the loader through the own start, byte indices, the discarded `+0x00`,
the 255 group skip, the carrier's `(P + 125) / 250 - 1` with no clamp, the word handler's 0, 1 and minus six with
2 to 5 wrapping, the toggle's `1 << (group & 7)` and its hand over to `0x26F`, and the corpus: 5792 records per
container summed, all class 1, groups 1 or 2, every once and held block ending in `0x0001` and no tail, 58810
maximal words and all ten carriers' counts. It reported the own start exact over "6204 records", a count of its
own walk that its per container totals (which sum to 5792) do not reproduce; not pursued.

**The prose audit** found sentences wider than their evidence across the four landings, all corrected before
the commit: the silence in front of a device's codes stated as the account's inter device delay on five pages
where only this file's header called it inferred, now inferred on every page; "every code a transition sends
opens with 200, 500, 800 or 1000 ms" where 23 transition records and four device groups sit at 50 ms; counts over
the sixteen containers not saying they are copies of six configurations (800 ms is one device of one
configuration); "every value a multiple of 100 ms" in this file's header, false for the four at 50; the 720
"plays the same way" where only its class 1 start, word and stop are compared; the 720's number sender
"working addresses moved by eight" where only three literals are shown to differ; "within half a percent" put as
a consequence of the rounding where it is a corpus result, 0.45% at worst; the skill's "either plays the same"
unscoped where 237 integer frequencies from 15.7 to 100 kHz differ by one count; a fill "can run past the panel"
stated as a visible effect; "no arch 8 set has a zero count" footnoted as firmware and unasserted, now asserted
(140 sets); a mark of 0 us left out of the underflow; the toggle "per device" where the firmware indexes the
infrared group; the 720's twenty four lists called favourite channels as a measurement where what reaches them
is not asserted; and assertions missing for the picture row's clip, a height of 0, opcode 19 sharing the switch,
the toggle flag handed to the loader, the record's field order and the value added to the base, the alignment
loop, `0x10C14` seeking raw 15, and the picker's test on variable 17, all added. It also listed two codec
comments that still state the old readings, `NumberSender.flags` in `packages/codec/src/container/tables.ts` (never fires)
and the wide code comment in `packages/codec/src/screens/screen.ts`; `packages/` is outside this landing, so they are
reported as candidates.
"""
import collections
import hashlib
import unittest

import lab  # noqa: F401, puts `src` on the path
from harmony import ezfile, gspm
from harmony.pic18 import chains
from .test_harmony_885_start_check import (BASE, CALIBRATION, OTHER_APPLICATIONS, USER_BASE, application, by_name,
                                          listing, text, transfers_to, window)

LOADER = 0x17C86
LOADER_END = 0x17ECE
CARRIER_START = 0x19E88
WORD = 0x19F26
STOP = 0x19F18
TOGGLE_BIT = 0x1A864
FLIP = 0x14F1A
SET_UP = 0x14646

#: Every carrier of the corpus, (period ns, on ns): records.
CARRIERS = {(17241, 8620): 64, (25000, 12500): 524, (26212, 13106): 1, (26315, 13157): 2677, (26385, 13192): 333,
            (26474, 13237): 66, (26855, 13427): 10, (27472, 13736): 1462, (27624, 13812): 148, (27777, 13888): 507}


def u16(b, o):
    return b[o] | b[o + 1] << 8


def u24(b, o):
    return b[o] | b[o + 1] << 8 | b[o + 2] << 16


def payloads():
    return [(name, ezfile.parse_ezhex(blob, name).payload) for name, blob in zip(CALIBRATION, by_name(*CALIBRATION))]


def block_words(p, address):
    """A class 1 block's words up to and excluding its zero word."""
    o, out = address - USER_BASE, []
    while u16(p, o):
        out.append(u16(p, o))
        o += 2
    return out


def records(p):
    """(group, index, record pointer, group spare byte, group count) the firmware's way: raw bytes, no codec."""
    slot5 = u24(p, 0x0B + 4 * 5 + 1) - USER_BASE
    for g in range(p[slot5]):
        group = u24(p, slot5 + 1 + 3 * g) - USER_BASE
        for i in range(u16(p, group + 1)):
            yield g, i, u24(p, group + 3 + 3 * i), p[group], u16(p, group + 1)


def pr2_and_duty(period, on):
    """What `0x19E88` writes: `PR2` and the duty, each a byte."""
    return ((period + 125) // 250 - 1) & 0xFF, ((on + 125) // 250) & 0xFF


class TheLoader(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_group_and_index_are_bytes_and_the_header_is_read_from_the_own_start(self):
        self.assertEqual(window(self.code, LOADER, 22), [
            'MOVLB 0x0', 'MOVLW 0x05', 'MOVWF 0xd3', 'CALL 0x191de', 'MOVFF 0x26d,0x0d7', 'MOVLB 0x0',
            'MOVLW 0x01', 'MOVWF 0xd6', 'CALL 0x1923a', 'CALL 0x19062', 'MOVFF 0x26e,0x0d7', 'MOVLB 0x0',
            'MOVLW 0x03', 'MOVWF 0xd6', 'CALL 0x1923a', 'CALL 0x19062', 'CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xb2',
            'CALL 0x19324', 'CALL 0x19062', 'MOVLB 0x2'])
        # 0x19324 saves the cursor, at +0x08 after the class byte; 0x19062 follows the u24 there.
        self.assertEqual(window(self.code, 0x19324, 3),
                         ['MOVFF 0x080,0x083', 'MOVFF 0x081,0x084', 'MOVFF 0x082,0x085'])

    def test_the_class_switch_is_four_three_two_one(self):
        cases = [(c.value, c.target) for c in chains.xor_chain(self.code, BASE, 0x17CC8)]
        self.assertEqual(cases, [(4, 0x17E1C), (3, 0x17DCA), (2, 0x17D32), (1, 0x17CDE)])

    def test_class_1_reads_the_zero_byte_and_throws_it_away(self):
        self.assertEqual(window(self.code, 0x17CDE, 12), [
            'MOVLB 0x1', 'MOVLW 0x01', 'MOVWF 0x83', 'CALL 0x1908e', 'MOVLB 0x2', 'MOVWF 0xb3', 'MOVLB 0x0',
            'MOVLW 0xb4', 'MOVWF 0xcd', 'MOVLW 0x02', 'MOVWF 0xce', 'CALL 0x190d2'])
        # The period's low two bytes, 0x2B4 and 0x2B5, are what goes to the carrier structure.
        self.assertEqual(window(self.code, 0x17CFA, 4), ['MOVFF 0x270,0xfe9', 'MOVFF 0x271,0xfea',
                                                       'MOVFF 0x2b4,0xfee', 'MOVFF 0x2b5,0xfed'])
        # Nothing in the loader reads 0x2B3 after it is written: no MOVFF from it, no banked read of 0xB3 in bank 2.
        reads = []
        bank = None
        for a, ins in listing(self.code, LOADER, LOADER_END):
            f = ins.fields
            if ins.mnemonic == 'MOVLB':
                bank = f['k']
            elif ins.mnemonic == 'MOVFF' and f.get('src') == 0x2B3:
                reads.append(a)
            elif f.get('f') == 0xB3 and f.get('a') == 1 and bank == 2 and ins.mnemonic not in ('MOVWF', 'CLRF', 'SETF'):
                reads.append(a)
        self.assertEqual(reads, [])

    def test_a_group_count_of_0_skips_255_groups(self):
        self.assertEqual(window(self.code, 0x17E7E, 23), [
            'CALL 0x19332', 'MOVLB 0x0', 'MOVLW 0x03', 'MOVWF 0xd1', 'CALL 0x191aa', 'CALL 0x1908e', 'MOVLB 0x2',
            'MOVWF 0xb7', 'MOVLW 0x02', 'SUBWF 0xb7,W', 'BNZ 0x17ea4', 'MOVLB 0x2', 'MOVF 0x6f,W', 'BZ 0x17ea4',
            'MOVLB 0x2', 'DECF 0xb7', 'MOVLB 0x2', 'DECF 0xb7', 'MOVF 0xb7,W', 'SUBLW 0x00', 'BC 0x17eba',
            'MOVLB 0x0', 'MOVLW 0x09'])

        def skipped(count, toggle):
            n = count
            if n == 2 and toggle:
                n -= 1
            n = (n - 1) & 0xFF
            return n
        self.assertEqual([skipped(c, False) for c in (0, 1, 2, 3, 4)], [255, 0, 1, 2, 3])
        self.assertEqual(skipped(2, True), 0)


class TheCarrier(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_PR2_is_the_period_rounded_to_250_ns_less_one_and_CCP1_is_put_in_PWM(self):
        ins = window(self.code, CARRIER_START, 56)
        self.assertEqual(ins[5:17], ['MOVLW 0x7d', 'MOVLB 0x2', 'ADDWF 0xb2', 'MOVLW 0x00', 'ADDWFC 0xb3',
                                     'MOVLW 0xfa', 'MOVWF 0x023', 'CLRF 0x024', 'MOVFF 0x2b2,0x01e',
                                     'MOVFF 0x2b3,0x01f', 'CALL 0x107ce', 'MOVFF 0x01e,0x2b2'])
        self.assertEqual(ins[18:21], ['MOVLB 0x2', 'DECF 0xb2,W', 'MOVWF 0xfcb'])
        self.assertEqual([x for x in ins[21:41] if x.startswith(('MOVLW', 'CALL'))],
                         ['MOVLW 0x02', 'MOVLW 0x00', 'MOVLW 0x7d', 'MOVLW 0x00', 'MOVLW 0xfa', 'CALL 0x107ce'])
        self.assertEqual(ins[41:52], ['MOVFF 0x2b2,0x185', 'CLRF 0xfbe', 'BSF 0xfca,2', 'MOVLB 0x1', 'BTFSS 0x82,1',
                                      'BSF 0xff2,5', 'SETF 0xfd7', 'SETF 0xfd6', 'MOVLW 0x0c', 'MOVWF 0xfbd',
                                      'BSF 0xfd5,7'])
        # The stop clears the duty, the CCP1 pin, CCP1CON and Timer 2.
        self.assertEqual(window(self.code, STOP, 4), ['CLRF 0xfbe', 'BCF 0xf82,2', 'CLRF 0xfbd', 'BCF 0xfca,2'])

    def test_no_clamp_so_the_register_fits_only_from_about_15_6_kHz(self):
        fits = [p for p in range(1, 65536) if (p + 125) // 250 - 1 <= 255]
        self.assertEqual(max(fits), 64124)
        self.assertEqual(round(1e9 / 64124), 15595)
        # One nanosecond more and the register wraps to a carrier above 3.9 MHz.
        self.assertEqual(pr2_and_duty(64125, 32062)[0], 0)

    def test_truncating_or_rounding_a_whole_hundred_hertz_plays_the_same(self):
        frequencies = range(16000, 100001, 100)
        differ = [f for f in frequencies
                  if pr2_and_duty(int(1e9 // f), int(1e9 // f) // 2)
                  != pr2_and_duty(round(1e9 / f), round(1e9 / f) // 2)]
        self.assertEqual((len(frequencies), differ), (841, []))

    def test_the_corpus_carriers_and_what_plays(self):
        found = collections.Counter()
        for _, p in payloads():
            for _, _, pointer, _, _ in records(p):
                start = u24(p, pointer - USER_BASE + 1) - USER_BASE
                found[(u24(p, start + 1), u24(p, start + 4))] += 1
        self.assertEqual(dict(found), CARRIERS)
        for (period, on), _ in CARRIERS.items():
            pr2, duty = pr2_and_duty(period, on)
            played = 1e9 / ((pr2 + 1) * 250)
            with self.subTest(period=period):
                self.assertLess(abs(played - 1e9 / period) / (1e9 / period), 0.005)
                self.assertEqual(on, period // 2)
                self.assertLess(period, 0x10000)


class TheWords(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_zero_stops_one_stops_only_on_a_release_and_the_rest_lose_six(self):
        self.assertEqual(window(self.code, WORD, 7)[:5],
                         ['MOVLB 0x2', 'MOVF 0xa1,W', 'BNZ 0x19f34', 'CALL 0x14616', 'MOVLW 0x00'])
        self.assertEqual(window(self.code, 0x19F62, 28), [
            'MOVLB 0x2', 'MOVF 0xeb,W', 'BNZ 0x19f9a', 'MOVLW 0xf0', 'MOVLB 0x2', 'ANDWF 0xea,W', 'BNZ 0x19f9a',
            'MOVLB 0x2', 'DECF 0xea,W', 'BNZ 0x19f8c', 'MOVLW 0x03', 'MOVLB 0x1', 'SUBWF 0x84,W', 'BNC 0x19f86',
            'CALL 0x14616', 'MOVLW 0x00', 'BRA 0x19fec', 'MOVLW 0x01', 'BRA 0x19fec', 'BRA 0x19f9a', 'MOVLB 0x2',
            'MOVF 0xea,W', 'BNZ 0x19f9a', 'CALL 0x14616', 'MOVLW 0x00', 'BRA 0x19fec', 'MOVLB 0x2', 'BTFSS 0xeb,7'])
        self.assertEqual(window(self.code, 0x19FA0, 10), [
            'MOVFF 0x185,0xfbe', 'MOVLB 0x2', 'BCF 0xeb,7', 'BRA 0x19fac', 'CLRF 0xfbe', 'MOVLW 0x06', 'MOVLB 0x2',
            'SUBWF 0xea', 'MOVLW 0x00', 'MOVLB 0x2'])
        self.assertEqual(window(self.code, 0x19FB6, 1), ['SUBWFB 0xeb'])
        # Class 1's run is called from the interrupt's class switch, again at once while it answers 1, and its
        # start and stop are what the other two class switches name for class 1.
        self.assertEqual(transfers_to(self.code, WORD), [0x14F8C])
        self.assertEqual(window(self.code, 0x14F86, 7), ['MOVLB 0x1', 'DECF 0x83,W', 'BNZ 0x14f96', 'CALL 0x19f26',
                                                       'IORLW 0x00', 'BZ 0x14fc4', 'BRA 0x14f8c'])
        self.assertEqual(transfers_to(self.code, CARRIER_START), [0x145F6])
        self.assertEqual(transfers_to(self.code, STOP), [0x1462A])

    def test_a_word_of_2_to_5_and_a_mark_of_1_to_5_underflow(self):
        def counted(word):
            if word in (0x0000, 0x0001):
                return None
            return ((word & 0x7FFF) - 6) & 0xFFFF
        self.assertEqual([counted(w) for w in (2, 5, 6, 0x8000, 0x8001, 0x8005, 0x8006)],
                         [65532, 65535, 0, 65530, 65531, 65535, 0])


class OnceHeldAndTail(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_the_slot_step(self):
        cases = [(c.value, c.target) for c in chains.xor_chain(self.code, BASE, 0x17FC4)]
        self.assertEqual(cases, [(2, 0x18038), (1, 0x17FDE)])
        # Slot 0: advance one, and two with the key flag clear.
        self.assertEqual(window(self.code, 0x17FBA, 3), ['MOVLB 0x2', 'MOVLW 0x01', 'MOVWF 0xb4'])
        self.assertEqual(window(self.code, 0x17FD0, 6),
                         ['MOVLB 0x1', 'BTFSC 0x82,2', 'BRA 0x1805e', 'MOVLB 0x2', 'MOVLW 0x02', 'MOVWF 0xb4'])
        # Slot 1, key down and a held block: advance zero.
        self.assertEqual(window(self.code, 0x17FDE, 10),
                         ['MOVLB 0x1', 'BTFSS 0x82,2', 'BRA 0x17ff4', 'MOVLB 0x2', 'MOVF 0x67,W', 'IORWF 0x68,W',
                          'IORWF 0x69,W', 'BZ 0x1805e', 'MOVLB 0x2', 'CLRF 0xb4'])
        # Slot 1, key up: the tail loaded and state 4, or state 2 when it is NULL.
        self.assertEqual(window(self.code, 0x18016, 4), ['BZ 0x18030', 'MOVLB 0x1', 'MOVLW 0x04', 'MOVWF 0x84'])
        self.assertEqual(window(self.code, 0x18030, 3), ['MOVLB 0x1', 'MOVLW 0x02', 'MOVWF 0x84'])
        # Slot 2: state 3.
        self.assertEqual(window(self.code, 0x18046, 3), ['MOVLB 0x1', 'MOVLW 0x03', 'MOVWF 0x84'])

    def test_a_tail_after_a_held_key_is_a_fresh_transmission(self):
        self.assertEqual(window(self.code, 0x14E52, 12), [
            'MOVLW 0xff', 'SUBWF 0x84,W', 'BZ 0x14ed8', 'MOVLW 0x04', 'SUBWF 0x84,W', 'BNZ 0x14e6a', 'MOVLW 0x02',
            'MOVWF 0x84', 'CALL 0x1a88a', 'RCALL 0x14d7a', 'RETLW 0x01', 'CLRF 0x83'])


class TheToggle(unittest.TestCase):
    def setUp(self):
        self.code = application()

    def test_one_bit_per_group_in_eight(self):
        self.assertEqual(window(self.code, TOGGLE_BIT, 10), [
            'CLRF 0xff3', 'CLRF 0xff4', 'INCF 0xff3', 'ANDLW 0x0f', 'BZ 0x1a876', 'RLNCF 0xff3', 'RLNCF 0xff4',
            'DECF 0xfe8,W', 'BNZ 0x1a86e', 'RETURN'])
        self.assertEqual(transfers_to(self.code, TOGGLE_BIT), [0x14F1E])

        def bit(group):
            lo, hi = 1, 0
            for _ in range(group & 0x0F):
                lo, hi = (lo << 1 | lo >> 7) & 0xFF, (hi << 1 | hi >> 7) & 0xFF
            return hi << 8 | lo
        self.assertEqual([bit(g) for g in range(16)], [1 << (g & 7) for g in range(16)])

    def test_it_is_flipped_per_send_and_cleared_at_start(self):
        self.assertEqual(window(self.code, FLIP, 12), [
            'MOVLB 0x2', 'MOVF 0xc5,W', 'CALL 0x1a864', 'MOVFF 0xff3,0x2c6', 'MOVFF 0xff4,0x2c7', 'MOVLB 0x2',
            'MOVF 0xc6,W', 'MOVLB 0x1', 'XORWF 0x80', 'MOVLB 0x2', 'MOVF 0xc7,W', 'MOVLB 0x1'])
        self.assertEqual(window(self.code, 0x14652, 2), ['CLRF 0x80', 'CLRF 0x81'])
        # The flag "the bit is set after the flip" is 0x2C8, and it is what the loader's skip tests at 0x26F.
        self.assertEqual(window(self.code, 0x14F4C, 7), ['MOVF 0x000,W', 'IORWF 0x001,W', 'BNZ 0x14f56',
                                                       'MOVLW 0x00', 'BRA 0x14f58', 'MOVLW 0x01', 'MOVWF 0xc8'])
        self.assertEqual(window(self.code, 0x14F64, 1), ['MOVFF 0x2c8,0x26f'])
        self.assertEqual(window(self.code, 0x17E9A, 3), ['MOVLB 0x2', 'MOVF 0x6f,W', 'BZ 0x17ea4'])
        self.assertEqual(transfers_to(self.code, SET_UP), [0x16DBE])


class TheCorpus(unittest.TestCase):
    def test_5792_class_1_records_read_the_firmwares_way(self):
        t = collections.Counter()
        groups = collections.Counter()
        shapes = collections.Counter()
        ends = collections.Counter()
        largest = 0
        maxima = inside = short = 0
        for _, p in payloads():
            for _, _, pointer, spare, count in records(p):
                largest = max(largest, count)
                o = pointer - USER_BASE
                t['class %d' % p[o]] += 1
                start = u24(p, o + 1)
                t['own start'] += start == pointer - 7
                s = start - USER_BASE
                t['byte 0x00 zero'] += p[s] == 0
                t['spare zero'] += spare == 0
                groups[p[s + 0x0B]] += 1
                for k in range(p[s + 0x0B]):
                    slots = [u24(p, s + 0x0C + 9 * k + 3 * j) for j in range(3)]
                    shapes[''.join('B' if a else '0' for a in slots)] += 1
                    for j, a in enumerate(slots):
                        if not a:
                            continue
                        words = block_words(p, a)
                        ends[(j, words[-1] == 1)] += 1
                        inside += words[:-1].count(1)
                        maxima += sum(1 for w in words if w & 0x7FFF == 0x7FFF)
                        short += sum(1 for w in words if w != 1 and w & 0x7FFF < 16)
        self.assertEqual(dict(t), {'class 1': 5792, 'own start': 5792, 'byte 0x00 zero': 5792, 'spare zero': 5792})
        self.assertEqual(dict(groups), {1: 5644, 2: 148})
        self.assertEqual(largest, 164)
        self.assertEqual(dict(shapes), {'B00': 2625, 'BB0': 2851, 'B0B': 369, 'BBB': 95})
        self.assertEqual(dict(ends), {(0, True): 5940, (1, True): 2946, (2, False): 464})
        self.assertEqual((inside, maxima, short), (0, 58810, 0))

    def test_the_shortest_mark_and_space(self):
        marks, spaces = set(), set()
        for _, p in payloads():
            seen = set()
            for _, _, pointer, _, _ in records(p):
                s = u24(p, pointer - USER_BASE + 1) - USER_BASE
                for k in range(p[s + 0x0B]):
                    for j in range(3):
                        a = u24(p, s + 0x0C + 9 * k + 3 * j)
                        if a and a not in seen:
                            seen.add(a)
                            for w in block_words(p, a):
                                if w != 1:
                                    (marks if w & 0x8000 else spaces).add(w & 0x7FFF)
        self.assertEqual((min(marks), min(spaces)), (30, 77))

    def test_every_send_names_a_record_that_exists(self):
        found = collections.Counter()
        for _, p in payloads():
            index = {(g, i) for g, i, _, _, _ in records(p)}
            for li in gspm.parse(p).action_lists():
                for x in li:
                    if x.opcode == 0x7D:
                        found[(x.operand >> 8, x.operand & 0xFF) in index] += 1
        self.assertEqual(found, {True: 5917})

    def test_the_sixteen_are_distinct(self):
        self.assertEqual(len({hashlib.sha256(p).digest() for _, p in payloads()}), 16)


class TheOtherBuilds(unittest.TestCase):
    RANGES = ((LOADER, LOADER_END), (CARRIER_START, 0x19FEE), (TOGGLE_BIT, 0x1A878), (FLIP, 0x14F6A))

    def test_the_880s_play_with_the_885s_bytes(self):
        code = application()
        for label in ('880 Pro', 'second 880'):
            (other,) = by_name(OTHER_APPLICATIONS[label])
            for start, end in self.RANGES:
                with self.subTest(label=label, start=hex(start)):
                    self.assertEqual(other[start - BASE:end - BASE], code[start - BASE:end - BASE])

    def test_the_720s_class_1_routines_match_as_mnemonic_literal_and_bit(self):
        code = application()
        (h720,) = by_name(OTHER_APPLICATIONS['720'])

        def shape(image, start, end):
            return [(i.mnemonic, i.fields.get('k'), i.fields.get('b')) for _, i in listing(image, start, end)]
        for ours, theirs, count in ((CARRIER_START, 0x19F18, 53), (WORD, 0x19FB6, 90), (STOP, 0x19FA8, 7)):
            with self.subTest(hex(ours)):
                a = shape(code, ours, ours + 4 * count)[:count]
                b = shape(h720, theirs, theirs + 4 * count)[:count]
                self.assertEqual(a, b)
                self.assertNotEqual(a, shape(h720, theirs + 2, theirs + 2 + 4 * count)[:count])


if __name__ == '__main__':
    unittest.main()
