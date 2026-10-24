# Harmony 650 test notes

The bench Harmony 650: how it arrived, what has been done to it, what its reads and runs showed, and
where its files are. What it showed about the model is in `reference/remotes/harmony-650/` and about the
architecture in `reference/architectures/harmony-600-650-700/`; this file keeps what is one unit's, and
the bench observations whose argument is in no archive section. These moved out of the model folder in
plan 009 step 3.1.

## The unit

| unit | standing | source |
|---|---|---|
| one Harmony 650, skin 72, second hand | **a write target** since 27 September 2026, the project owner's decision: it may be reprogrammed freely as the work needs. Its identity record is `h650` in the lab's `units/`, and the two GUIDs live only in `units/h650.txt` | `CLAUDE.md`, findings section 281 |

It arrived programmed through MyHarmony on the second test account with the KPN set top box, the Denon
receiver and the LG television, section 281. Its later configurations add a PS3, Kodi and a Panasonic
plasma, the last through a MyHarmony sync, section 305, and this project has composed devices and
activities onto it. What it holds at any moment is in the lab's `reads/` and not here.

* **Version block**: firmware 0.2, **hardware 1.2**, where the bench Harmony 600 reports 1.1; software
  type 0. Measured, version block byte 1, in the JSON beside each configuration read, first
  `reads/20260927T0840Z-h650-programmed-config.json`. Section 281 says the two units differ without
  stating either value, so the hardware version has no archive section and the reference lists it as
  not checked.
* **Not updated to 0.4**, and nothing proposes it.
* **Safe mode has never been entered** on this unit; the reinstall and the staging write have never
  been sent to it.
* `PROFILES` in `packages/corpus/src/read.ts` still labels product id `0xC122` "Harmony 600 or 700".

## The test account

The unit is registered on the second MyHarmony test account, the one `MYHARMONY_EMAIL` selects, lab
`reads/20260927T0840Z-h650-programmed-NOTES.md` and the `myharmony-service` skill. The account's contents
change and are never asserted, per the project's rule that test accounts are not a population. This
paragraph belongs in `docs/test-notes/accounts.md` once that file exists (plan 009's move table).

Logitech's service answers for this unit's account entry, read 7 October 2026 and filed in the lab's
`work/myharmony/responses-per-model/`: `GetProductCapabilities2` states `MaxFavoriteChannels` 23 and
`LeaveDevicesPoweredOn`; `GetRemoteSettings` lists `GlowTime` at a default of 20 and `TiltSensor` and
`RemoteAssistant` on, and no other setting. No archive section or test holds these answers for the 650,
so the reference marks them not checked; `reference/capabilities.md` carries the table until step 3.4.
MyHarmony's "Remote Backlight Settings" dialog sets the glow time with a slider from 5 to 30 seconds, and
its "Select Language For Your Remote" dialog offers English, Français, Español, Deutsch, Nederlands,
Italiano and more; both are MyHarmony's screens as seen, with no archive section.

## Memory, as read

Read only on 27 September 2026, section 281: both internal pages, the whole external flash and the
configuration, which agree byte for byte over the configuration's range. A whole external flash read of
this unit carries its identity in the block at zero, so a region read of the 650 never leaves the lab for
one more reason than a configuration does.

* **The settings store** as found: three records, all setting `0x80`, values `0xF8`, `0xFF` and `0xFE`,
  the second block erased, section 282. No delay saved.
* **The configuration** as found: 907660 bytes from `0x030000`, built by Logitech's service the day
  before it was read, section 281; `narrow` 62, section 284. After the Panasonic sync, 1016225 bytes,
  section 305.
* **The clock is the write's stamp after a restart**, measured on 8 October 2026: a write stamped the
  seven clock records with seconds 37, minutes 34, hour 8, day 7, weekday 4, month 9, year 26, and
  straight after the writer's restart the first seven state variables read 48, 34, 8, 7, 4, 9 and 26,
  the stamp plus the 11 seconds since the restart. Day and month count from 0 and the weekday from
  Sunday, section 322, so that is Thursday 8 October 2026, 08:34:48. No archive section records this
  run; the reference rests the same claim on section 283.

The lab's `reads/` holds the 650's configuration and region reads in the order they were taken, from the
as found read through every write; `tests/lab.py` and `packages/lab` name the ones the tests use, all
beginning `h650_`. Which one is current is the newest read, and nothing here asserts it.

## Firmware images in the lab

Never in this repository. Checksums, where published, are in `docs/checksums.md`.

| file in `lab/firmware/` | what | checksum |
|---|---|---|
| `packages/harmony_650_firmware_0_4.hfw` | Logitech's 0.4 package, from the repair site | SHA-256 in `docs/checksums.md` |
| `derived/650-0.4-Region_2-code-base0x9000.bin` | its application | in `docs/checksums.md` |
| `derived/650-0.4-Region_3-gspm-base0x20000.bin` | its safe mode configuration, 7115 bytes | in `docs/checksums.md` |
| `derived/650-0.2-code-base0x9000-bench.bin` | the bench unit's own 0.2 application, read off it | not listed, being one unit's |

The unit's two internal pages are in the lab's `reads/` as region reads; `tests/lab.py` names the second
`h650_page_ff` and the 0.2 application cut from the first `h650_bench_code`.

## What has been sent to this unit

| command | standing and source |
|---|---|
| `GET_VERSION`, `READ_FLASH` external and both internal pages | read only, section 281 |
| `READ_MISC` selector 7, live data memory | config derived variables read live, section 283; the verdict flags `0x68B` and setting `0x80`'s copy `0x744`, section 354 |
| `READ_MISC` selector `0x0C` detail 1, the battery voltage | in millivolts, section 340 |
| `ERASE_FLASH` and `WRITE_FLASH`, configuration blocks | first a block written back unchanged, section 281; then real changes, sections 283 onwards |
| the cache drop, `WRITE_MISC` selector `0x02` | section 282 |
| the restart, the escape's `0x02` | section 282; the restart was also seen on the remote |
| the settings read and write | **never sent** to this unit |
| the reinstall, the staging write | **never sent** |

**Reads that misbehave**: flash reads during write runs occasionally drop out of sequence on this unit,
"expected 0x45, got 0x0", and a rerun succeeds, section 294 and `todo.md` L8. The cause is not checked.
The `harmony-650` skill lists the other things the bench does that are not faults.

## Bench runs

Step lists in `packages/bench/irtests/` for the 650: `done/650-activities.json`, the reference run of its
activities and Off; `done/650-panasonic-power-hold.json`, section 306; `done/650-lg-volume.json`, the
runner's smoke test; `done/650-composed-power.json`, section 320; and `650-combined.json`, the combined
bench file. Their recordings are in the lab's `reads/`.

Observations at the bench whose argument is in `todo-compile-650.md` and the lab's recordings rather than
in an archive section, so the reference states them only as far as a section carries them:

* **Six, seven and eight devices.** The unit holds six devices in `h650_panasonic_config` and accepted a
  MyHarmony sync with them, section 305 and section 317's table. Logitech's service compiled seven for
  it, the test setup's seven devices put on a 650 record and compiled by a MyHarmony sync,
  `todo-compile-650.md` 1.6 (`h650_start_config`, section 364). **The remote runs eight**: the TX-29AK40F
  and the Knoll composed in one run onto the six device configuration each sent their codes from their
  own pages, `todo-compile-650.md` 2.7; section 331 composed them and says nothing composed that way had
  been written when it was written.
* **A fifth device opens a second device list page** on a list a person reaches: the Sony DAV-C540
  composed onto a four device configuration opened a second page on the idle list and on both
  activities' own lists, `todo-compile-650.md` 2.3,
  `reads/20261008T082745Z-ir-test-harmony-650-a-fifth-device-opens-a-second-device-list-page.json`.
* **The activity menu paged** 1/3, 2/3 and 3/3 and wrapped on the combined file, and in Kijk TV volume and
  mute went to the Denon and channels, digits and OK to the KPN box, measured on air,
  `todo-compile-650.md`. Section 316 composed the page and lists what the 650 should show, not run there.
* **The composed plasma's power** went out from its activity, its device page and All Off,
  `todo-compile-650.md` and `reads/20261004T063001Z-ir-test-harmony-650-the-combined-bench-file.json`.
* **Letters**: a file whose font sets share glyphs drew every letter, and letters blended into their
  background in many colours drew as Logitech's one bit ones do, in a configuration of 1156 KB holding
  more sets than Logitech's 18, `todo-compile-650.md` 8.2.2 and 8.2.6.
* **The four activities** the unit held at section 317's reading.
* **The screen light**: as compiled the screen went dark after six or seven seconds, section 292. Once,
  after the 20 second write, the screen stayed black after unplugging until the batteries came out,
  section 292.
* **The infrared indicator**: an icon in the bottom right corner while the remote sends, seen on
  11 October 2026 and watched routinely to tell when a bench test step has finished sending.
* **No clock on the screen**: the ordinary screen shows no time, the project owner's observation at the
  bench on 4 October 2026. The reference rests it on the manual and on section 430.
* **The panel's colour as seen** has not been written down.
* **The composer refuses skin 74**, section 330; no skin 74 unit or compile has been read.

## Where the 650's work is planned

`todo-compile-650.md` is the plan for composing whole configurations for this model, and the place to
look for what is next on it.
