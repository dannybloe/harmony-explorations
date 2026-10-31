# Harmony 300 test notes

The bench Harmony 300: how it arrived, what was read off it and what it settled. What it showed about the
model is in `reference/remotes/harmony-300/` and about the family in
`reference/architectures/harmony-300-350/`; this file keeps what is one unit's, and the sources the
reference could not cite.

## The unit

**A second hand Harmony 300, on the bench since 27 August 2026**, sections 195 and 264. **It is the
European model, skin 79, with the European printing**: it reports 79 in its own `/sys/sysinfo` and its
configuration, and 78 in its `bcdDevice`. Its printing differs from the US Harmony 300's, which Logitech's
setup guide shows, in two places, as stated by the person holding it with a photograph of its upper half
shown at the bench: the colour keys run red, green, yellow, blue with no letters, as on the 350, where the US
printing runs yellow, blue, red, green lettered A to D; and the favourite block prints 1 left of TV Input and
3 right of it, and below them 2, Teletext with a teletext glyph, and 4, where the US printing has favourites 1
to 5. The drawing of this printing is `packages/silhouettes/src/models/h300eu.ts`, and every bench test and
note that names a key of this unit uses this printing. It is read as files through `openFileBasedRemote`. This said nothing had ever been written to it and that the
family was on no write list; decision 26 made it a permitted write target, written through the file write
rail as unit `h300`, and the section below says what was written.

## The two reads

Both were predicted in writing before they were taken, and each section scores its predictions:

| read | predictions | scored in |
|---|---|---|
| as it arrived | `docs/predictions/harmony-300.md` | section 264 |
| after four devices were programmed | `docs/predictions/harmony-300-programmed.md` | section 265 |

**As it arrived**, section 264: a configuration built in 2011 by its own timestamp, 41234 bytes, holding a
previous owner's two devices in groups 0 and 1 of four. Nobody here had programmed it, so the device count
was unknown before the read. This is the configuration whose empty raw slot 8 was first blamed on the
model and then, by the second read, on the fifteen year older compiler.

**Programmed**, section 265: the unit was added to a test account and given one device per device key
through Logitech's service, a KPN VIP1853 set top box on Cable/Sat, a Panasonic DVD-S35 on DVD, a
Panasonic TX-P42GT30E television on TV and a Sony SLV-N700 video recorder on VCR/Aux, with favourite
channels 1, 2, 3 and 666 for the set top box. 97474 bytes. The favourites were entered on this remote,
which a prediction had assumed otherwise because nothing was said about them; that is the lesson
section 265 records about asking what somebody did in Logitech's client.

The two reads are the lab fixtures `h300_config` and `h300_programmed_config`, registered in
`packages/lab/src/index.ts` and `tests/lab.py` outside every corpus wide population.

## What the unit settled that the reference states

* The group index is the device key, by identifying each group of the programmed read in Logitech's
  catalogue, section 265.
* Four infrared groups whatever the device count, the model's stated maximum, section 264.
* `bcdDevice` names the base skin and `/sys/sysinfo` the regional one, sections 195 and 264.
* The Watch TV shortcut, as described by the person who set it up: "not really an activity, more like a
  shortcut button to turn on multiple devices at once", section 265.
* **The face is the Harmony 350's moulding**, a statement made holding both units, which is why
  `packages/silhouettes/src/models/h300.ts` takes every shape from the 350's drawing. The setup guide's
  photograph suggests the pause half of the play key is a separate inset; the unit outranks the
  photograph.
* **The European printing**, above, which is why the model has two drawings, `h300.ts` for skin 78 and
  `h300eu.ts` for skin 79, and the reference's keys page describes both.
* **Every key raises the code of the 350 key in the same place**, 49 keys tied by pressing them, 2.2 below.

## Sources the reference could not cite

The reference's footnotes name an archive section, a test or a public address. These sources have none, so
the facts resting on them are marked not checked in the reference until one exists:

* **Logitech's Harmony 300 setup guide**, in the lab as `Docs/300 manual.pdf`; the printing on the keys is
  read off its cover photograph, PDF page 2, and its quotes about device keys, Watch TV and favourite
  channels are in the model's `behaviour.md` and `features.md`. No public copy of the English guide with
  those sentences was found.

Logitech's service's capability answer for a skin 79 entry, `UserAccountDirector/GetProductCapabilities2`,
asked on 7 October 2026 ([accounts.md](accounts.md)), was on this list until plan 009's step 3.4: sections
264 and 265 held only its device and favourite maxima and its activity capability, and now
`tests/test_product_capabilities.py` holds the whole answer and `tests/test_host_client.py` skin 78's
favourite maximum of 5.

## Not done

* No skin 78 Harmony 300 has been pressed, so the US printing's codes and what its colour keys send are
  not measured.
* Clear, Enter, TV Input, Live and the two arrows between Menu, Info, Exit and Guide have no code: the
  unit's own file binds nothing to them in either mode and they sent nothing in 2.2, and 2.1's file gave
  them Info's command, as it gave twelve codes besides Info's, so they all sent Info there. Teletext was
  heard once, in 2.1, and not pressed in 2.2.

This list said no infrared bench run existed for this unit until 1.4, below.
* The firmware version it runs: `/sys/sysinfo`'s version field was not recorded, and only the product
  string says 1.4.0.
* No other file on `INERT_PATHS` was read off it.

## Its own configuration written back, todo-compile-300 1.2 to 1.4

On 31 October 2026. The unit's identity was recorded as the lab's `units/h300.txt`, and every file on the
inert path list was read into `reads/20261031T1205Z-h300-backup/`, the configuration a second time into
`-second/`, identical: 97470 bytes, the programmed configuration of section 265 byte for byte less the end
marker, so the unit still held what Logitech's service had put on it. `/cfg/log` was 131072 bytes of `0xFF`,
as on the 350. The first two identity reads after plugging in got no reply and the third answered, one more
than the 350 has needed.

The write rail compares the skin in `/sys/sysinfo`, 79, and not the `bcdDevice`'s 78, so the dry run passed
unchanged. `write-file-config.ts --unit h300` then wrote `h300_programmed_config` back: verified by reading,
check answered `m`, restarted. Off the cable, `packages/bench/irtests/done/300-1-4-own-config.json` passed
every step, the run in the lab's `reads/20261031T121348Z-ir-test-harmony-300-its-own-configuration-written-back.json`:
the TV's Volume Up, Channel Up and 1, the KPN's codes 35 and 43, the DVD player's 1 with Volume Up still the
television's, and the recorder's Channel Up and 1. One unreadable fragment followed the KPN's digit by a
third of a second. The monitor names the 300's codes since `h300_programmed_config` joined its list.

## The first change, todo-compile-300 1.5

The television's power on delay, on 31 October 2026, with `packages/bench/irtests/done/300-1-5-delay-10s.json`
and `-5s.json`; the files are the lab's `work/300-delay/`. **On this configuration the delay that any key
reaches is the copy inside Watch TV's own list**: Watch TV toggles the KPN's power, waits 15 tenths,
toggles the television's power and waits 50 tenths, and only then selects the KPN's mode. The Power key
sends the television's toggle code alone, and the copy in the television's power state list is reached by
no key. `packages/codec/bin/set-delay.ts` changed only that unreached copy, so `after.bin` was made with
both copies at 100 tenths instead.

1. `after.bin` written on the second attempt, verified and restarted. The first run lost the TV key and
   Volume Up pressed during Watch TV, `reads/20261031T122346Z-...-10-s.json`. The second, with Volume Up
   pressed five times at once while the remote was still in the television's mode, heard the first Volume
   Up 11.545 s after the television's power code and the other four at about 0.55 s intervals after it,
   `reads/20261031T123224Z-...-10-s.json`. The lights stayed on for about ten seconds.
2. `before.bin` written back on the second attempt, verified and restarted; the same steps, starting in the
   television's mode, heard the first Volume Up 6.543 s after the power code,
   `reads/20261031T124638Z-...-5-s.json`.

The two gaps differ by 5.002 s where the delay changed by 50 tenths, so a unit is a tenth here as on the
350. Both carry the same 1.5 s more than the delay, which is the length of the KPN's wait before the
television's toggle; that the two add is what the numbers show, and why is not traced. Keys pressed while
Watch TV runs are taken in the mode the remote is in at the press and sent once it has finished; the TV key
pressed then was lost. Watch TV ends in the KPN's mode, which binds no Volume Up, as was confirmed at the
bench. The remote holds `before.bin` again, its own configuration.

## Every key sends something, todo-compile-300 2.1

On 31 October 2026, with no cleaning beforehand. The lab's `work/300-every-key/every-key.bin` is the unit's
own configuration with the television's map given a press for the 12 scan codes it left unbound and the
key table does not bind, 2, 8, 9, 16, 19, 25, 26, 34, 35, 43, 54 and 56, each calling Info's list; its `NOTE.md` says how
it was built. Written on the second attempt, verified and restarted. `packages/bench/irtests/done/300-2-1-every-key.json`,
whose every expectation was traced through that file's lists, passed all 18 steps, the run in the lab's
`reads/20261031T125339Z-ir-test-harmony-300-every-key-sends-something.json`: every key sent its expected
code in order, and no press went unheard or was heard twice, apart from two Info codes more than the
favourites step asked for. The device keys and Watch TV passed by what the next key sent. This checks the
keypad; which code each key raises is 2.2.


## Its three firmware images read, and compared with the 350's

The unit's three images, read as the files `/fw/normalmode`, `/fw/bootloader` and `/fw/safemode`, read only,
each twice with identical results: the lab's `reads/20261031T-h300-fw/` and `-second/`, each with a note and
the unit's `/sys/sysinfo` (its guid is not quoted anywhere). The first request after plugging in got no
reply, as usual on this family, and was repeated. The unit reports firmware 1.4.0, skin `0x4F`.

Sizes served: the application 73464 bytes, the bootloader 4096, safe mode 25400. The same day the
Harmony 350's application was read the same way, `reads/20261031T-h350-fw-first/` and `-second/`, 73464
bytes and byte for byte the first 73464 bytes of Logitech's package image. So the comparison in
`tests/test_harmony_300_350_images.py` is unit against unit. Its result, against the belief that both
models run one image: the applications are one program but for a mask on the send kind, the bootloaders are
different builds, and this unit's safe mode image is version 1.2 where the 350's is 1.4. Nothing was written
to the unit. Which image Logitech's service would serve this unit, asked by its own skin, was not asked.
The favourites step heard seven presses where five keys were named: six Info, which every key of the block
but Teletext sends on that file, and one the television's Teletext; the steps were worded for the US printing, and on this
unit the key the step called favourite 3 is Teletext and there is no favourite 5. 2.2 holds the run again
from its pulses, `packages/bench/test/keys300.test.ts`, which ties Teletext to code 11 from that press, by
elimination, and ties the colour keys from step 7, pressed left to right: red, green, yellow and blue sent
the television's Red, Green, Yellow and Blue, codes 13, 27, 28 and 29.

## Every key in two modes, todo-compile-300 2.2

On 31 October 2026. The unit held its own configuration, `h300_programmed_config` (the lab's
`work/300-delay/before.bin`), written back after 2.1. The predictions, `docs/predictions/harmony-300-keys.md`,
and the bench test, `packages/bench/irtests/done/300-2-2-keys.json`, were committed before the run, the test
generated from the file by the lab's `work/300-every-key/k2300.ts`, each step expecting what the file binds
to the code of the 350 key in the same place. The run is the lab's
`reads/20261031T131916Z-ir-test-harmony-300-every-key-in-the-tv-s-and-the-kpn-s-modes.json`, fixture
`h300_keys_ir`; 2.1's is `h300_every_key_ir`. `packages/bench/test/keys300.test.ts` matches both runs again
from their pulses and holds every step to what the file sends for the presses this unit's printing implies.

**Four steps failed their stored verdicts, 6, 9, 15 and 18, and all four are the test's wording**, step 6
with a press order of the person's own on top. The steps named keys by the US printing, and this unit has
the European one:

* **Step 6**, the colour keys in the television's mode, "A (yellow), B (blue), C (red), D (green)": there
  are no letters on this unit. Heard were the television's Red, Yellow, Blue, Red and Green, five presses,
  one press more than asked, and the person noted pressing in the wrong order. Each is the code of one
  colour key, so the step is consistent with the file and ties nothing; it would have failed on the
  letters alone.
* **Step 9**, TV Input and favourites 1 to 5 in the television's mode, expecting Teletext from the key the
  US printing calls favourite 3: nothing was heard, and the person noted that there is no favourite 5, only
  Teletext. TV Input and the four favourites send nothing in that mode, as predicted; Teletext was not
  pressed.
* **Step 15**, the colour keys in the KPN box's mode, pressed by the colour named, yellow, blue, red, green:
  heard the KPN's codes 38, 1, 10 and 18, which the file binds to codes 28, 29, 13 and 27, the 350's yellow,
  blue, red and green. The verdict expected the US places' order, 10, 18, 38 and 1.
* **Step 18**, the favourites in the KPN box's mode, pressed by their printed numbers 1 to 4: channel 1,
  channel 3, channel 2 and 666. The verdict expected channels in the US places' order and code 22 from the
  favourite 3 place, which on this unit is Teletext and was not pressed.

**Every other step passed as stored**, and every step of both runs, matched again, is what the file sends
for the presses this printing implies: 53 sends in 2.1 outside its favourites step and 79 in 2.2,
compared code by code. Five of the 79 are step 6, held to the order heard rather than one asked, so they
test nothing. Five unreadable fragments in 2.2 each follow a readable frame of the press before them within
90 ms of silence, so they are more of that press, its tail or a repeat, and not presses of their own.

**49 keys are tied to one code**, each the one of the 56 that, raised in the key's place with every other
key on its 350 code, gives what was heard from there to the end of the run, and **every one is the code of
the 350 key in the same place**: `DECIDED` in that test, carried by `h300eu.ts`. **Every tie takes the keys
to have been pressed in the order the step names**, since the receiver hears codes and not keys. Where that
order carries the tie alone:

* the colour keys: the one other reading of the four that fits both 2.1's step 7 and 2.2's step 15 has
  neither pressed in the order asked;
* the favourites: pressed by printed number they are 8, 9, 2 and 34; pressed by the step's places,
  skipping Teletext, the keys printed 3 and 4 would trade 2 and 34, against the 350's measured places;
* Teletext: one press of the favourite block in 2.1 sent the television's Teletext, which only code 11
  sends, and every other key of the block holds another code or was silent where 11 sends.

The six left, Clear, Enter, TV Input, Live and the two arrows, sent nothing in both modes of 2.2, where the
unit's own file binds nothing to them, and Info's command in 2.1, where the file gave it to them and to
several other codes; neither run tells them apart. The favourites printed 1, 2 and 3
send a digit the digit keys send too, and are told apart from them by the television's mode, where the
digit keys send and they do not. The KPN's Play and Pause are one frame in this file, codes 20 and 31 the
same bytes; the television's mode decides them.

The predictions, scored:

* **P1**, every key raises the 350's code for its place: **holds** for all 49 keys tied, with the press
  order above; no key sent another key's code and no key predicted silent sent anything. Its counts of keys the file could tie per mode, 39
  and 32, are the file's and were not re-measured.
* **P2**, the nine keys the file cannot tie: **holds**. Clear, Enter, TV Input, Live and the two arrows sent
  nothing in either mode. The three favourites that send a digit, which it named 1, 2 and 5 by the US places
  and which this unit prints 1, 2 and 3, were tied by position after all, through the television's mode.
* **P3**, the device keys: **holds**. TV selected the television's mode and Cable/Sat the KPN's, neither
  sending anything; in 2.1 DVD, VCR/Aux and Watch TV were tied the same way, codes 7, 4 and 6.
* **P4**, the favourites in the KPN's mode, by the US places: **holds for the four pressed**, read by
  printed number as above. The place of
  favourite 1 sent channel 1, favourite 2's channel 3, favourite 4's 666 and favourite 5's channel 2, which
  on this unit are the keys printed 1, 2, 4 and 3. Favourite 3's place, predicted to send the KPN's code 22,
  is this unit's Teletext key, not pressed in that mode. The prediction left a favourite sending 3 and
  another sending code 22 unexplained; the second is explained by the printing, and the order of the
  channels on the keys printed 2 and 3 is reported and not explained.
* **P5**, every other key as the test's expectations state: **holds**, with steps 6, 9, 15 and 18 restated
  for the European printing.

**What the run settled for the drawing**: the 49 codes on `h300eu.ts`, source `t-harmony-300-keys-u`. The US
drawing, `h300.ts`, takes none, since no skin 78 unit was pressed. The bench test moved to
`packages/bench/irtests/done/`; the remote still holds its own configuration.
