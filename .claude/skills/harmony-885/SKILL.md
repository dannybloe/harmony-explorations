---
name: harmony-885
description: "Everything needed before working on the Harmony 885 (and the 880, which runs the same application): where its facts are (read them first), the rails that are this model's own (two permitted bench units with A first, an erase and a write with no ceiling above the application, a write end that differs from every other Harmony's, the install statuses that copy over the application), the backup a write needs, the write procedure as far as it is established, and what the key page and Glow do on the cable. Use before any task on the Harmony 880 or 885 or an arch 8 configuration, before any item of todo-compile-885.md, before plugging an 885 in, before reading, writing or composing an 885 configuration, and in every agent brief for 885 work."
---

# Working on the Harmony 885

**This skill holds no facts about the remote. It says where they are, and it holds the procedure that has no
other home.** The facts live in the public reference and are not repeated here, because two copies of a fact
are two copies until one of them moves.

**The 885 is the remote where a wrong address costs the most.** Its firmware checks a floor at `0x010000` and
no ceiling, for an erase and for a write, so from the application upwards nothing in the remote refuses
anything, and `packages/usb/src/rails.ts` is all there is. And its write end is not the other Harmonys': two
of their eight steps hang this one or overwrite its application. Both are written down. So the first section
below is not optional.

## 1. Read these before anything else

In this order, every time, including in an agent:

1. `reference/remotes/harmony-885/README.md`: the key numbers and the map of its topic files. Then open the
   topic file the task touches: `keys.md`, `display.md`, `features.md`, `behaviour.md`, `memory.md`,
   `firmware.md`, `usb.md`, `hardware.md`, `misc.md`.
2. `reference/architectures/harmony-880-885/README.md`: what is the platform's, above all its `memory.md`,
   `firmware.md` and `usb.md`, whose "How a write ends" is the write sequence. In conversation say "the
   Harmony 885", or "the Harmony 880 and 885" for the platform, never the bare architecture number.
3. `docs/test-notes/harmony-885.md`: what has been done to the two bench units, in order.
4. The `recovering-a-remote` skill's section "The Harmony 880 and 885" **before planning any write**, and
   before anything that touches the bootloader, the staged install or the identity block.
5. `reference/how-a-harmony-works.md` when the task touches what the remote does for a person.
6. While `todo-compile-885.md` runs: the lab's `work/legacy-remotes/HANDOVER.md`, and a brief per item in
   `work/legacy-remotes/notes/harmony-885/` written before the item starts.

**When the reference does not answer a question about the remote, ask** before designing around the gap, and
land the answer in the reference afterwards with its source.

**The architecture question, every step**: the 880 and 885 run one application build, so a reading of the
firmware holds for both; what is measured on a bench 885 holds for the 885 until an 880 confirms it. The 720,
785, 880 Pro and 882 are not covered by any of it.

## 2. The rails that are this model's own

All are `CLAUDE.md`'s, from "Never write to a remote", or the reference's, restated here only as what they
require of a session.

* **Two bench units may be written, `h885_a` first**, decision 30. Which unit is on the cable is read off its
  identity block against the lab's `units/h885_a.txt` or `units/h885_b.txt`, never assumed from the port or a
  sticker. **Permission is not a write path**: since `todo-compile-885.md` 1.2 the library opens the flash
  block path for unit A only, through `rehearse-block.ts`, and refuses every other write to this platform:
  the restart, the invalidate, the RAM write and `write-config.ts`. Those refusals are not something to
  work around; each path opens with its own item.
* **Only the user configuration is written**: from `0x020000`, whole 64 KiB sectors, below the staging
  region at `0x1D0000`. Never the bootloader below `0x010000`, the application at `0x010000`, the staging
  region or the log area. **The firmware bounds neither an erase nor a write from `0x010000` up**, so a wrong
  address there erases or overwrites the running application with no condition: never pass an address
  outside the configuration, never ask for a door around a refusal.
* **The write end is not the other Harmonys'.** Never send `WRITE_MISC` selector `0x0A` (no reply, the writer
  hangs) and never set the staged install's status to 2 or 6 (the next restart erases the application and
  copies over it). Selector 2, then the restart `E1 02`, which gets no reply.
* **Never send the unlock**, the one byte write of `0xA7` to `0x000106`, nor `WRITE_MISC` selector 7 to any
  address: it reaches the unlock, the install status and the flash routines' RAM with no bound.
* **Keep base slot 2 as every configuration states it**, `15360, 0x1E0000, 0x1FE000`: a configuration that
  emits the log append (`0x0F` with low byte `0xE0` to `0xE2`) writes the flash at whatever address that slot
  names, `tests/test_harmony_885_log_area.py`. Emit it only on purpose.
* **A read is not always harmless here.** A read whose last byte is `0x000104` or `0x000105` alone in its
  chunk runs code instead of reading, and from `0x1FE000` up is not flash. Read in `0x8000` chunks from a
  `0x8000` boundary and keep the end below `0x1FE000` by hand: the library bounds a read by its start.

## 3. The backup a write needs

**Before the first write to a unit, the whole flash from `0x000000` to `0x1FDFFF`** in the lab, read twice
and identical, as the `recovering-a-remote` section says. **Unit A's is in the lab**, `h885_a_flash` and
`h885_a_flash_2`, and `tests/test_harmony_885_flash_backup.py` checks its parts against the published images;
**unit B's is not yet**, its reads cover the configuration region, `0x020000` to `0x1D0000`. Take it with

    node packages/corpus/bin/read-region.ts --label h885-b-flash --address 0x000000 --count 0x1FE000 --anywhere --product 0xc110

twice, the second with `--label h885-b-flash-2`. The reader reads `0x4000` chunks from zero, so no chunk ends
alone on `0x000104` or `0x000105`. **A `flash chunk out of sequence` stops it and files nothing**: it has no
window retry. Both units met it before a hand restart and neither after, so restart the unit by hand rather
than rerunning blind. The identity block at `0x000110` and the battery calibration
word at `0x000160` are what a recovery puts back and nothing else holds them.

## 4. Writing the 885's configuration

**One block at a time, unit A only, and one block performed.** `todo-compile-885.md` 1.2 made the platform a
flash block target; 1.3 wrote one block of unit A back unchanged, `0x0C0000`, and 1.4 writes the whole
configuration. Each lands its procedure here as the `harmony-525` and `harmony-650` skills hold theirs.

**The order 1.3 took, which is the order for unit B too**: the dry run first, which also says which unit is
on the cable (it refuses the other unit at the identity); the whole flash backup twice, compared; then the
commit:

    HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 node packages/usb/bin/rehearse-block.ts --dump h885_a_region --block 0x0c0000 --commit

then `read-config.ts` once, its SHA-256 equal to the configuration read before, and the remote used for a
moment. Nothing on the screen changes during a block write, and no restart is needed when nothing the
remote reads changed.

The block writer is `packages/usb/bin/rehearse-block.ts`, with the dumps `h885_a_region` and
`h885_a_region_2`, which start at `0x020000`. A dry run reads only: it checks the unit off its identity
block, compares the block with the dump and prints what a commit would send.

    node packages/usb/bin/rehearse-block.ts --dump h885_a_region --block 0x0c0000

**Which block**: not one of the live configuration, which ends at `0x0AAAD4` on unit A. The firmware runs
from the same flash part, so a block of the configuration is blank between the erase and the write while
the remote may look it up. `0x0C0000` holds remains of earlier configurations, which the remote never reads
and which are not `0xFF`, so a write that sent nothing would show. The rehearsal reads the blocks either
side before and after the erase, which measures the sector size on the part.

**The commit waits for the backup** in section 3, and for the flags `CLAUDE.md` names.

When a run stops part way, do not unplug the remote or take its batteries out; report the first failure as
it happened and rerun only with the same arguments once the cause is understood.

## 5. On the cable

* **Glow while the key page or a key watcher polls**: on a bench 885 the screen went fully off and the remote
  stopped answering on the cable; a second Glow did not bring it back, unplugging and plugging in did, and the
  remote was fine after. The key page warns against it. `docs/test-notes/harmony-885.md`.
* **The key page**, `reference/key-reader/`, built from `packages/keyreader/`, reads the held key and nothing
  else; its one send function is the only path to the remote and a test holds it to two requests.
* **A long read can meet a sequence break**, and the reader asks for the window again; unit B's region read
  stopped on one twice. Reported, not explained, in the test notes.

## 6. Bench tests

**No bench infrared test exists for this model.** The shape, the rules and the Flirc's firmware requirement
are the `harmony-650` skill's section 3; a Flirc older than 4.10.7 drops long Denon codes. A first test for
the 885 follows them.

## Where things live

| what | where |
|---|---|
| the public reference | `reference/remotes/harmony-885/`, `reference/architectures/harmony-880-885/` |
| the bench units' record | `docs/test-notes/harmony-885.md` |
| the drawing | `packages/silhouettes/src/models/h885.ts`, rendered into `reference/silhouettes/h885.svg`; the 880's printing beside it |
| the key page | `packages/keyreader/`, built into `reference/key-reader/` by `make key-reader` |
| the rails | `packages/usb/src/rails.ts`: `CONFIG_REGION_BASE`, `WRITABLE_CEILING`, `ERASE_BLOCK_SIZE` and the per path lists |
| the unit records | the lab's `units/h885_a.txt` and `units/h885_b.txt`, never copied into this repository |
| configurations, region reads, key logs | the lab, named in `packages/lab` and `tests/lab.py` with the prefix `h885_` |
| the track | `todo/todo-compile-885.md`, after `todo/todo-prepare-885.md`, plan 012 |

## Related

* `recovering-a-remote`: the bootloader, the built in configuration and the staged install on this platform.
* `writing-a-config`: every rail a configuration must respect, before changing any byte.
* `code-for-a-family`: before any build code for this platform in `packages/codec/src`.
* `probe-remote`: reading a remote read only, and the gate before any experimental packet.
* `trace-section`: reading a configuration field out of the 885's own image.
* `draw-remote`: the drawings of the 880, 885 and their printings.
