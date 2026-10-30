# Harmony 350 test notes

The bench Harmony 350: what was read off it, what was done to it and what this project holds of it. What
it showed about the model is in `reference/remotes/harmony-350/` and about the platform it shares with the
Harmony 300 in `reference/architectures/harmony-300-350/`; this file keeps what is one unit's. It started
as the bench rows of the model folder, moved here by plan 009 step 3.1.

## The unit

A Harmony 350 has been on the bench since 27 August 2026, one of the three file based remotes that arrived
together, section 193. **It is read only and stays that way**: `openHarmony` refuses its product id, the
one path that reaches it, `openFileBasedRemote`, opens files for reading on the inert path list, and this
architecture is on none of the write lists. **Nothing has ever been written to it** over USB, by concordance
or by this library. Its own records, `/sys/guid` and the `guid` field of `/sys/sysinfo`, identify the
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
test `packages/bench/irtests/350-1-8-delay-*.json`, on 30 October 2026:

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

## What has not been done

* Only one infrared bench test has been run on this model, the power on delay above; a command to another
  device right after a power code was not pressed.
* No key press has been tied to a scan code.
* No firmware version has been read off the unit beyond the product string's 1.4.0.
