---
name: harmony-one
description: "Everything needed before working on the Harmony One: where its facts are (read them first), which of the two bench units may be written (the spare, never the everyday one), how a configuration is written to the spare step by step, and how a bench test is run. Use before any task on a Harmony One, before composing, writing or reading a One configuration, before plugging either One in, before writing a bench test for it, and in every agent brief for Harmony One work."
---

# Working on the Harmony One

**This skill holds no facts about the remote. It says where they are, and it holds the procedure that
has no other home.** The facts live in the public reference and are not repeated here, because two
copies of a fact are two copies until one of them moves.

The reason this exists is the Harmony 650's: a session once proposed checking that model's clock by
looking at its screen, and the reference already said it shows none. **The One is the opposite case and
the same trap**: it does show a clock, and it differs from the 600, 650 and 700 in how it runs its
configuration, how its screen is touched and what it does after a write. Nothing was missing in the 650's
case; nobody had read it. So the first section below is not optional.

## 1. Read these before anything else

In this order, every time, including in an agent:

1. `reference/remotes/harmony-one/README.md`: the key numbers and the map of its nine topic files. Then
   open the topic file the task touches: `keys.md`, `display.md`, `features.md`, `behaviour.md`,
   `memory.md`, `firmware.md`, `usb.md`, `hardware.md`, `misc.md`. There is no architecture folder: the
   One is the only model on its platform, and in conversation it is "the Harmony One", never the bare
   architecture number.
2. `docs/memory-map-one.md`: the long form of its memory, which the reference summarises.
3. `docs/how-a-harmony-works.md` when the task touches what the remote does for a person, and in
   particular its sections on the four keys around the One's screen and on the click before a screen
   command.

**When the reference does not answer a question about the remote, ask** before designing around the gap,
and land the answer in the reference afterwards with its source.

## 2. Two units, and only one may be written

**There are two Harmony Ones on the bench and they enumerate identically.**

* **The spare Harmony One is a write target.** Every write to a One in `docs/findings.md` went to it.
* **The everyday Harmony One is never written.** It is excluded by name in `CLAUDE.md`'s "Never write to
  a remote", and nothing in this skill applies to it beyond reading.

The library tells them apart by reading the identity block off the unit and comparing it with the lab's
record for the spare, `units/one_spare.txt`; the everyday One's identity does not match it, so a write
script refuses it. **Do not rely on knowing which one is plugged in**: ask, and let the unit check decide. Both are read
only for anything that is not a write.

## 3. Writing a configuration to the spare Harmony One

Writing follows "Never write to a remote" in `CLAUDE.md` and the `writing-a-config` skill; this is the
procedure on top of those.

1. **Read the remote's current region into the lab first**, the compare base and the restore point:

       node packages/corpus/bin/read-region.ts --label <name> --address 0x40000 --count <length>

   with the length covering the configuration and rounded up to whole 64 KiB blocks. Writes stop at
   `0x3D0000`, where the stored application copy sits.
2. **Register that read** under a name like `one_spare_<what>_base`: `IMAGES` in
   `packages/lab/src/index.ts` and in `tests/lab.py`, `PARSEABLE_EXCLUDED` in both, and `SPARE_DUMPS` in
   `packages/corpus/bin/write-config.ts`. Then raise the two counts in `packages/lab/test/parity.test.ts`.
3. **Dry run**, which reads only:

       node packages/corpus/bin/write-config.ts --config <file> --dump <region name>

4. **Commit**:

       HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 node packages/corpus/bin/write-config.ts \
         --config <file> --dump <region name> --commit

   The writer drops the cached descriptors, erases and writes only the blocks that differ, reads them
   back, and restarts the remote; it refuses a firmware build other than 3.4. It stamps the
   configuration with the moment of writing and appends a journal beside it.
5. **The One restarts itself after the write** and shows its ordinary screen, findings section 247. If it
   instead shows a status screen, that screen latches until the batteries come out on this model, and the
   `recovering-a-remote` skill is the next read.

When a write stops part way, rerun it with exactly the same arguments, and do not unplug the remote or
take its battery out first.

**Things the One does on the cable that are not faults**: after idling in USB mode it drops its first
command and a retry clears it, findings section 155; and it occasionally strands after sitting idle on
USB, which a battery pull clears, `CLAUDE.md`. An odd count internal read hangs it, and `packages/usb`
refuses one for that reason; never open the named door around that rail.

## 4. Bench tests

The shape, the rules and the Flirc's firmware requirement are the `harmony-650` skill's section 3. Two
things differ on a One: a screen command is touched rather than pressed, so an instruction names the row
on the screen, and a screen command goes out after a click and usually after the device's delay between
devices, so a monitor sees it later than the same command on a key, findings section 337. The One's only
run so far is `packages/bench/irtests/done/one-spare-activities.json`.

## Where things live

| what | where |
|---|---|
| the public reference | `reference/remotes/harmony-one/` |
| the long form of the memory | `docs/memory-map-one.md` |
| the firmware images | the 3.4 package and its derived files in the lab's `firmware/`, `reference/checksums.md` |
| the spare's unit record | the lab's `units/one_spare.txt`, never copied into this repository |
| region reads and configurations | the lab's `reads/` and `dumps/`, named in `packages/lab` and `tests/lab.py` with the prefixes `one_` and `one_spare_` |
| the plan for composing on a One | `docs/adding-a-device.md` |

## Related

* `writing-a-config`: every rail a configuration must respect, before changing any byte.
* `recovering-a-remote`: safe mode, the bootloader and the latch on this model.
* `probe-remote`: reading a remote read only, and the gate before any experimental packet.
* `how-a-harmony-works`: activities, device mode and the One's screen keys.
* `myharmony-service`: Logitech's compile, when a step needs a configuration from their service.
