# Harmony 350 test notes

The bench Harmony 350: what was read off it, what was done to it and what this project holds of it. What
it showed about the model is in `reference/remotes/harmony-350/` and about the platform it shares with the
Harmony 300 in `reference/architectures/harmony-300-350/`; this file keeps what is one unit's. It started
as the bench rows of the model folder, moved here by plan 009 step 3.1.

## The unit

A Harmony 350 has been on the bench since 27 August 2026, one of the three file based remotes that arrived
together, section 193. This said it was read only and that nothing had ever been written to it, which
stopped being true with decision 26: it is a permitted write target, written through the file write rail
(`writeFileConfig`, `/cfg/usercfg` only, unit `h350`) since `todo-compile-350.md` 1.7, and the sections
below say what was written for each item. `openHarmony` still refuses its product id. Its own records, `/sys/guid` and the `guid` field of `/sys/sysinfo`, identify the
unit and stay on the terminal.

Its configurations were changed only through Logitech's own service, by syncing, never from here.

## What has been read off it

| read | how | section |
|---|---|---|
| the configuration it arrived with, 121251 bytes, three devices and 130 infrared records | concordance's file family support, the first configuration of this architecture read anywhere here; the pointer slot count of 15 was found on it | 194 |
| `/sys/sysinfo`, then `/cfg/usercfg` | this library's `openFileBasedRemote`, read only, with the end marker appended to make the file a container, byte for byte concordance's copy | 262 |
| the configuration after programming, 83840 bytes | the same, after the unit was given four devices, one activity and five favourite channels through Logitech's service, copying the bench Harmony 600's setup | 262 |
| the configuration with one device removed, 68985 bytes | the same, after the Playstation 3 was taken off and nothing else changed | 263 |
| every file on the inert path list, the backup before the first write, decision 26: the configuration now 35587 bytes as stated, read twice and identical | the same, all twelve paths, filed whole in the lab's `reads/20261027T1700Z-h350-backup/` | `todo-compile-350.md` 1.5 |
| `/fw/bootloader`, 4096 bytes, and `/fw/safemode`, 26040 bytes, the safe mode image less its last eight bytes because the remote serves an internal image's header length as its size | the same, read only, those two paths opened through `HARMONY_FILE_PATH_EXPERIMENT=1` by decision at the bench; the lab's `reads/20261027T1929Z-h350-fw/`, fixtures `h350_bootloader` and `h350_safemode` | `todo-compile-350.md` 1.4, `tests/test_harmony_350_boot.py` |

**The five favourites** the unit was given through Logitech's service are five action lists of two
instructions, `0x7A n` and then `0x1F`, which is what named the slot their channels go through, section
262; the reference states the slot without the unit.

The three configurations are lab fixtures, `h350_config`, `h350_programmed_config` and
`h350_three_devices_config`, named in `tests/lab.py` and `packages/lab`, and outside every corpus wide
total by decision, section 194. The archive calls the first the factory configuration; it held three
devices a previous owner had named, section 261.

## The first writes, todo-compile-350 1.7

Three runs of `write-file-config.ts` with the unit's own configuration, from the backup, on 27 October 2026:

1. The open answered with sequence `0x81`, the high bit set on the echo, where the writer expected `0x01`,
   so the run stopped after the open had erased the configuration. The writer accepts both forms since.
2. The unit check passed after the restart, the open answered, chunk 1 (50 data packets, 3100 bytes) was
   answered `0xB4`, and the next host write timed out in IOKit; every later write timed out the same way
   until the remote was restarted.
3. With the done packet ending every chunk, as the client's template sends it: chunk 1 answered `0xFE`, and
   the same timeout on the next write. So the done packet was not the cause.

4. The cause was ours: hidapi took the first byte of every write as a report ID and dropped it when it
   was zero, and the 11th data packet of chunk 2 is the first whose sequence number wraps to zero, so it
   went out 63 bytes long. With a zero report ID in front of every report, the fourth run wrote all 12
   chunks, the check answered `m`, the read back was identical and the reboot was sent.

Off the cable after the fourth run the lights stopped flashing, and eleven presses reached the bench's
infrared monitor as the bench TV's codes, volume, channel and three digits, each matched to its command.

After each failed run's restart the remote flashed the lights under its activity buttons eight times, the firmware's
error 8, a missing marker, and answered reads normally. Its configuration is erased until a write
completes; the backup is the lab's `reads/20261027T1700Z-h350-backup/`.

## The first change, todo-compile-350 1.8

The TV's power on delay, written at 30 and put back at 100, each heard with the infrared monitor and the
test `packages/bench/irtests/done/350-1-8-delay-*.json`, on 30 October 2026:

1. `work/350-delay/after.bin` written, verified and restarted. The run was started as the 10 s test while the
   remote held this 3 s file, so its file in the lab is named for 10 s and its verdict on the gap failed;
   the gap it measured, 3.174 s of silence between PowerOn and the held Volume Up, is the 3 s one.
   `h350_delay_ir_3s`.
2. `before.bin` written back. The first attempt got no reply to its first request, as a freshly plugged
   in 350 has done before, and wrote nothing; the second was refused, correctly, because the remote held
   the 3 s file and that was named neither as the backup nor as the file being written; the third, naming
   `after.bin` as the backup, was verified and restarted. The 10 s test then measured 10.205 s and passed.
   `h350_delay_ir_10s`.

So a unit is a tenth of a second, and Volume Up pressed long after went out at once in both runs. The
argument is the header of `tests/test_harmony_350_delay.py`. The remote holds `before.bin` again, its
own configuration.

## Which device each device key selects, todo-compile-350 2.3

Run with the unit's own configuration, no write, `packages/bench/irtests/done/350-2-3-device-keys.json`,
on 30 October 2026, `h350_device_keys_ir`: AVR/Game (bottom left) then Volume Up sent the Denon's
VolumeUp, TV/Media (top left) then Volume Up the LG's, and Cable/PC (top right), which the file binds
nothing to, left the remote in the LG's mode. The unit's device keys print TV/Media, Cable/PC, AVR/Game
and DVD/Music, not what the earlier setup guide's drawing showed; the drawing was corrected.

## Every key in two modes, todo-compile-350 2.2.2

**The run.** `packages/bench/irtests/350-2-2-keys.json`, with the unit holding `work/350-delay/before.bin`,
the LG television on the top left key and the Denon receiver on the bottom left, written back after the
keypad check below. The run file is the lab's
`reads/20261030T142422Z-ir-test-harmony-350-every-key-in-the-tv-s-and-the-receiver-s-modes.json`, fixture
`h350_keys_ir`, and `TheBench350HeardEveryKey` in `tests/test_harmony_350_keys.py` holds it. Every key was
pressed in the television's mode and again in the receiver's, each step naming what the monitor should hear.

**Scored against [the predictions](../predictions/harmony-350-keys.md)**:

| prediction | result |
|---|---|
| P1, the receiver is on the bottom left key, AVR/Game | confirmed: AVR/Game, then Volume Up, Volume Down and Mute sent the Denon's |
| P2, a device key sends nothing | confirmed: nothing heard on TV/Media, AVR/Game, Cable/PC or DVD/Music |
| P3, exactly one favourite sends the television's Home | confirmed, and it is favourite 5, the one right of Input, so code 2; favourites 1 to 4 sent nothing, leaving 8, 9, 11 and 34 in an order this run could not give, which 3.3 settled below |
| P4, the upper arrow sends the receiver's ChannelUp and the lower its ChannelDown, both silent in the television's mode | confirmed, so the upper arrow is code 25 and the lower 26 |
| P5, every other key as the table says, in both modes | confirmed for every key but one press: digit 0 sent nothing in the television's mode, and sent its code in the receiver's |

So 37 of the 38 keys predicted to send in the television's mode did, all with the predicted command, and
29 of 29 in the receiver's. **Three presses heard where silence was predicted are not a finding**: Info,
Exit and Guide in the television's silent step, which the tester pressed because the step's wording named
them as landmarks for the arrows; each sent its own code. Live is still 43 or 56: the file binds neither,
so this run cannot split them, and Menu, DVR, Enter and Watch TV sent nothing for the same reason.

**Digit 0 is an intermittent contact on this unit**, not a fact about the model: it sent its code in an
earlier run of another test after the keypad was cleaned, and in this run's receiver steps.

**The keypad was cleaned inside before this run.** A first partial run of this test, the lab's
`reads/20261030T113234Z-ir-test-harmony-350-every-key-in-the-tv-s-and-the-receiver-s-modes.json`, had Mute
silent and digits 5 and 9 sending twice. After cleaning, `work/350-every-key/every-key.bin` was written, the
bench file with the 16 codes the television's map leaves unbound given a press sending Info's list
(`work/350-every-key/NOTE.md`), and every key sent something. The bench tests for that check and for the
Watch TV runs below are `packages/bench/irtests/done/350-every-key.json`, `350-every-key-2.json`,
`350-watch-tv.json`, `350-device-key-watch-tv.json`, `350-avr-watch-tv.json` and
`350-usb-restart-watch-tv.json`. Then `before.bin` was written back.

**Watch TV sent nothing in three runs before a battery pull, and has sent in every run since**, including
after TV/Media, after AVR/Game and after a restart over USB. The cause was not found; it was seen and not
reproduced.

**`/cfg/log` was read over USB after many presses since the last write, and all 131072 bytes were erased,
`0xFF`.** So this firmware with this configuration logs no key press or send there. That read was not
saved to the lab, so nothing pins it. The backup read before the first write,
`reads/20261027T1700Z-h350-backup/cfg_log.bin`, is 131072 bytes of `0xFF` as well.

## Logitech's compile of the test setup, todo-compile-350 3.3

**What was written.** The test setup, `packages/corpus/setups/h350-test.json`, compiled by Logitech's
service onto the unit's own record on the first test account: eight devices, the service putting a short
and a long press device on each of the four device keys, Watch TV, and the favourite channels 1, 2, 3, 666
and 07 on the KPN. **The favourites were typed into MyHarmony's own favourite channel screen**, not saved by
`build-setup.ts`: its stage saved them with `SaveButtonMaps`, which the service accepts for a 350 and the
compile then ignores, so the first compile, the lab's `work/setups/h350-test/first-compile/`, bound no
favourite. MyHarmony's screen for this model saves them on the device's mode map with
`UpdateDeviceModeButtonMaps` (commit 00ab8d5b, `reference/logitech/service.md`, "Button maps"), and the
second compile, `work/setups/h350-test/compile-Result.EzHex`, binds them. That file was written with
`write-file-config.ts`, the first compile named as the backup since the remote held it. The first attempt
found no remote of the family attached and the second got no reply to its first request, neither writing
anything; the third wrote 39 chunks, the check answered `m`, the read back was identical less the end
marker and the reboot was sent. The write logs are beside the
compile in the lab.

**The runs.** `packages/bench/irtests/done/350-3-3-logitech-setup.json`, twenty steps, run twice with the
Flirc: the lab's `reads/20261031T111033Z-...-logitech-s-compile-of-the-test-setup.json`, fixture
`h350_logitech_setup_ir`, and `reads/20261031T112340Z-...`, fixture `h350_logitech_setup_ir_2`. A run of the
same test between them, `20261031T112137Z`, heard presses in step 1 only and is not used.

**The first run's stored verdicts are wrong, and the remote is not why.** The bench server had been
started before `BENCH_CONFIGS` named this compile, so the monitor matched every frame against the other
bench remotes' files only and never this one. Every code only this file holds went unrecognised, the
Knoll's, the Switch's, the Sony's, the Denon's power codes and the KPN's DVR, and the run file records
seven of twenty steps failed, 2, 6, 7, 8, 10, 11 and 14. Matched again from the pulses against the compile
alone and judged again, it passes 20 of 20. The server was restarted for the second run, whose stored
verdicts pass all nineteen steps with an expectation, step 13 being the silent one, and judging it again
from its pulses gives the same verdicts word for word. `packages/bench/test/setup350.test.ts` does both and
reads no stored verdict as the result.

**The tester's notes in the second run**: a 9 pressed by accident in step 4, heard as Kodi's 9 between
two of Kodi's Enter, the second of which no note explains; Input pressed first in step 16, heard as the television's Input before favourite 2's
channel; and Watch TV perhaps pressed twice in step 11, of which one sequence was heard. In the first run
DVR was heard twice in step 7, 3.8 seconds apart, where once was asked.

**The result.**

* Favourites 1 to 4 sent channels 1, 2, 3 and 666 in both runs, so they are codes 8, 9, 11 and 34 in that
  order, the order the channels were entered; favourite 5 sent 0 then 7, code 2, as known.
* Every device key's short press and its long press selected the device the file puts there, all eight,
  how long each key was held not recorded, about two seconds being asked; Menu, Enter and Watch TV each sent what the file binds them to. With favourites 1
  to 4 that is nine codes onto the drawing, 53 of 55 keys now.
* DVR sent the KPN's `List`, a frame the file's codes 11 and 14 hold in the same bytes, and OK's binding
  sends 11, so the press does not decide DVR's code. It stays off the drawing.
* Watch TV from everything off sent the TV's power on, the Denon's arriving 0.19 s later and the KPN's
  toggle 0.50 s after that, inside the TV's ten second and the Denon's two second waits, and the Denon's
  input 2.54 s after its power code. So in this activity a power on delay held back its own device's code
  and no other device's power code, the first time that was measured on this family. The times are when
  each frame reached the host, not when it began.
* Channel 666 went out as three 6s arriving 0.32 to 0.33 s apart, with 0.21 s of silence between them, not the tenth of a second the bench test's text gave; the file waits a tenth after each digit.
  Past the monitor's 200 ms window, so the monitor showed three presses.
* Channel Up and the digit 1 in the KPN's mode sent nothing, as the file binds neither there.

The argument is the header of `packages/bench/test/setup350.test.ts`; `TheBench350HeardTheTestSetup` in
`tests/test_harmony_350_keys.py` holds the second run for the reference. The remote holds the compile.

## What was predicted

Each programmed read was predicted in writing and committed before it was taken:
[the predictions](../predictions/harmony-350-programmed.md), scored in sections 262 (P1 to P6) and 263 (the
seven questions, six answered yes). The configuration it arrived with was read before any prediction
document existed for this family.

## The configuration it arrived with

Its three device groups are all biphase codes: one is Logitech's `Microsoft 30 Bit` family and two are
biphase families nobody has identified, the first found in a configuration rather than in Logitech's
catalogue, section 261. Every one of its 130 records decodes since section 266, once the biphase reader
stopped needing its caller to trim the leading gap. 106 of the 130 state a send count and all of those state
3, section 259, and one list holds a pause of 170, section 327; both are in the model's reference as what a
compiled configuration holds.

## Logitech's service, about this unit's model

`UserAccountDirector/GetProductCapabilities2` was asked for the account entry of this unit, skin 104, on 7
October 2026, with the five other bench models, [accounts.md](accounts.md). It is what
`reference/remotes/harmony-350/features.md` restates in "What Logitech's service states", and
`tests/test_product_capabilities.py` holds it since plan 009's step 3.4, so those rows carry that test as
their footnote rather than being marked not checked.

## The case

The statement that the Harmony 300 and the 350 are one moulding with different printing is a person's,
made holding both units, and is recorded in `packages/silhouettes/src/models/h300.ts`. The 350's drawing is
traced from the button page of its setup guide, whose copy in the lab is `Docs/350 manual.pdf`, the same
text as the guide Logitech publishes.

## Which device is on which key

Nobody recorded which device key each device was put on when the unit was programmed through Logitech's
service. The configurations state it: the scan code whose release selects each device's map,
`tests/test_harmony_350_device_groups.py`, read as a printed key through the Harmony 300's device to key
statement, with each group's device named by the codec's `devices` from its `Power` variable
(`packages/codec/test/filefamilydelays.test.ts` for the lab fixtures; the names are not asserted by the
first test). On the four device file the television is on `TV/Media`, the KPN box on `Cable/PC`, the
Playstation 3 on `AVR/Game` and the Chromecast on `DVD/Music`. On the file the unit held through 2.3 and
2.2.2, the same file as the backup read the test opens, the LG television is on `TV/Media` and the Denon
receiver on `AVR/Game`. Pressing `AVR/Game` and hearing a Denon code checked the one inference in that,
which key a scan code is on a 350, for the two keys that file binds, 2.3 and 2.2.2 above. On the test
setup's compile, which the unit holds since 3.3, the service placed the eight devices itself, and all four
keys were heard selecting them, short and long, 3.3 above.

## What has not been done

* DVR has not been tied to a code by pressing it: on the test setup's compile it sends the frame OK sends.
  Live has not either, since no file the unit held binds it. Menu, Enter, Watch TV, favourites 1 to 4 and
  the top right and bottom right device keys were listed here until 3.3 heard them.
* A long press held for one second rather than two has not been tried. A command to another device right
  after a power code was listed here until Watch TV sent three in 3.3.
* No firmware version has been read off the unit beyond the product string's 1.4.0.
