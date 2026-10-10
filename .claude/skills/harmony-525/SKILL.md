---
name: harmony-525
description: "Everything needed before working on the Harmony 525: where its facts are (read them first), the three rails that are this model's own (a permitted write target, an erase bounded only by the flash part with the application firmware one block below the configuration, and safe mode destroying the application), how a block of its configuration is written step by step, and what is not a fault on the cable. Use before any task on the Harmony 525 or an arch 9 configuration, before reading, rehearsing or writing a 525 block, before plugging the 525 in, before anything near its safe mode, and in every agent brief for 525 work."
---

# Working on the Harmony 525

**This skill holds no facts about the remote. It says where they are, and it holds the procedure that
has no other home.** The facts live in the public reference and are not repeated here, because two
copies of a fact are two copies until one of them moves.

The reason this exists is the Harmony 650's: a session once proposed checking that model's clock by
looking at its screen, and the reference already said it shows none. **The 525 is the remote where not
reading first costs the most**: it is the one whose firmware sits next to its configuration with nothing in
the remote to stop an erase reaching it, and the one where a documented key combination destroys the
application. Both are written down. So the first section below is not optional.

## 1. Read these before anything else

In this order, every time, including in an agent:

1. `reference/remotes/harmony-525/README.md`: the key numbers and the map of its nine topic files. Then
   open the topic file the task touches: `keys.md`, `display.md`, `features.md`, `behaviour.md`,
   `memory.md`, `firmware.md`, `usb.md`, `hardware.md`, `misc.md`.
2. `reference/architectures/harmony-5xx/README.md`: what is the architecture's, measured on this model,
   above all its `memory.md`, `firmware.md` and `usb.md`. In conversation say "the Harmony 525", never
   the bare architecture number.
3. `docs/memory-map-525.md`: the long form of its memory, with the predictions made before the remote
   arrived kept beside what was measured.
4. The `recovering-a-remote` skill **before anything that touches safe mode, the bootloader or the
   EEPROM**, including a plan that only mentions them.
5. `docs/how-a-harmony-works.md` when the task touches what the remote does for a person.

**When the reference does not answer a question about the remote, ask** before designing around the gap,
and land the answer in the reference afterwards with its source.

## 2. The three rails that are this model's own

All three are `CLAUDE.md`'s, from "Never write to a remote", and are restated here only as what they
require of a session. The reasons are in that section and in the reference.

* **The 525 is a permitted write target.** One of the units that section names, and its first write, one
  block of its own bytes put back unchanged, is findings section 269. **Permitted is not capable**:
  nothing can compile a configuration for this model, so there is no vendor built file to check one of
  ours against, and the next step on it is `todo-later.md` 5.4 rather than anything improvised.
* **An erase is bounded only by the flash part.** The firmware erases any of the eight 64 KiB blocks it is
  handed, and the block directly below the configuration holds the application firmware, the one below
  that the safe mode image. `packages/usb/src/rails.ts` is the only thing that refuses a wrong address, so
  **never ask for a door around it, never pass an address outside the configuration region, and never
  treat a refusal as something to work around.** An erase on this model is a 64 KiB decision every time.
* **Entering safe mode destroys the application firmware, and it must never be entered as an
  experiment.** Holding Off while the batteries go in is that entry: never ask for it, never suggest it as
  a reset, and never write EEPROM byte 0, which is what installs an image. A power cycle does not leave
  safe mode. Leaving it was done once, by hand, from a script in the private lab, and this project's write
  path does not do it.

And the paths that are closed on this model and stay closed: the restart, the data memory write and the
odd count internal read, each refused by `packages/usb`. `HARMONY_ODD_READ_EXPERIMENT` is never opened for
this model.

## 3. Writing a block of the 525's configuration

The writer for this model is `packages/usb/bin/rehearse-block.ts`. `packages/corpus/bin/write-config.ts`
has no arch 9 target and refuses a 525. Follow "Never write to a remote" and the `writing-a-config` skill;
this is the procedure on top of those.

1. **A region read of the block must be in the lab and match the remote.** All five blocks of the
   configuration region were read before the first write, and they are the dumps the script accepts. After
   any write that changes bytes, the old dump no longer matches: read the block again first,

       node packages/corpus/bin/read-region.ts --label <name> --address 0x820000 --count 0x10000

   and register it under a name like `h525_region_<what>`: `IMAGES` in `packages/lab/src/index.ts` and in
   `tests/lab.py`, `PARSEABLE_EXCLUDED` in both (a region read is not a container), and `H525_DUMPS` in
   `rehearse-block.ts`. Then raise the two counts in `packages/lab/test/parity.test.ts`.
2. **Pick a block that can prove something.** The reference's `memory.md` and findings section 270 say
   which blocks hold content and which are erased throughout; a rehearsal on an erased block cannot tell a
   working write from one that sent nothing.
3. **Dry run**, which reads only, checks the unit off its identity block, compares the block with the
   dump and prints what a commit would send:

       node packages/usb/bin/rehearse-block.ts --dump <dump name> --block 0x820000

4. **Commit**:

       HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 node packages/usb/bin/rehearse-block.ts \
         --dump <dump name> --block 0x820000 --commit

   The script reads both neighbouring blocks before and after the erase, and **the lower neighbour of
   `0x820000` is the application firmware**: if a neighbour differs afterwards, stop, say so, and touch
   nothing else. `--set <address>=<byte>` changes named bytes inside the block; no edit has been written
   to a 525 yet.
5. **Verify the whole configuration through a different reader**, and compare its SHA-256 with what the
   lab expects:

       node packages/corpus/bin/read-config.ts --label <name> --product 0xc111

6. **The remote does not restart and nothing needs sending afterwards.** If it does restart, or shows a
   status screen, that is a finding: stop and report it.

When a run stops part way, do not unplug the remote or take its batteries out; report the first failure
as it happened and rerun only with the same arguments once the cause is understood.

**Things the 525 does on the cable that are not faults**: the first `GET_VERSION` of a session can go
unanswered and a retry covers it, findings section 76; and every data memory read answers zeros, which
is the firmware and not the cable, sections 90 and 137.

## 4. Bench tests

**No bench infrared test exists for this model.** The shape, the rules and the Flirc's firmware
requirement are the `harmony-650` skill's section 3. A first test for the 525 follows them; its screen
pages are drawn by `make render` from the configuration the lab holds, and a step names a soft key by its
corner of the screen.

## Where things live

| what | where |
|---|---|
| the public reference | `reference/remotes/harmony-525/`, `reference/architectures/harmony-5xx/` |
| the long form of the memory | `docs/memory-map-525.md` |
| the drawing | `packages/silhouettes/src/models/h525.ts`, rendered into `reference/silhouettes/h525.svg` |
| the writer | `packages/usb/bin/rehearse-block.ts`, with `H525_DUMPS` |
| the rails | `packages/usb/src/rails.ts`: `CONFIG_REGION_BASE`, `WRITABLE_CEILING`, `ERASE_BLOCK_SIZE` and the per path lists |
| the unit record | the lab's `units/h525.txt`, never copied into this repository |
| configurations, region reads and firmware images | the lab, named in `packages/lab` and `tests/lab.py` with the prefix `h525_` |

## Related

* `recovering-a-remote`: safe mode, the bootloader and the EEPROM install byte on this model.
* `writing-a-config`: every rail a configuration must respect, before changing any byte.
* `probe-remote`: reading a remote read only, and the gate before any experimental packet.
* `trace-section`: reading a configuration field out of the 525's own image.
