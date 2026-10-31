# Harmony 300 test notes

The bench Harmony 300: how it arrived, what was read off it and what it settled. What it showed about the
model is in `reference/remotes/harmony-300/` and about the family in
`reference/architectures/harmony-300-350/`; this file keeps what is one unit's, and the sources the
reference could not cite.

## The unit

**A second hand Harmony 300, on the bench since 27 August 2026**, sections 195 and 264. It reports skin
79, the European model, in its own `/sys/sysinfo` and its configuration, and 78 in its `bcdDevice`. It is
read as files through `openFileBasedRemote`. This said nothing had ever been written to it and that the
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

* No infrared bench run exists for this unit, with or without the Flirc.
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
