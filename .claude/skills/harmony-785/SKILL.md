---
name: harmony-785
description: "Everything needed before working on the Harmony 785: where its facts are (read them first), what it shares with the Harmony 885 and what it does not (the Harmony 720's application 4.5 and a bootloader that differs per unit), the two bench units and how to tell them apart, the reads that are safe and how they were taken, and why no write path opens before its write end is read in 4.5. Use before any task on the Harmony 785, before plugging either 785 in, before reading, writing or composing a 785 configuration, before any item of todo/todo-harmony-785.md, and in every agent brief for 785 work."
---

# Working on the Harmony 785

**This skill holds no facts about the remote. It says where they are, and it holds the procedure that has no
other home.** The facts live in the public reference and are not repeated here, because two copies of a fact are
two copies until one of them moves.

**The 785 runs on the Harmony 885's platform and is not an 885.** Its application is the Harmony 720's 4.5 with
ten bytes changed, the skin among them, and its bootloader differs between the two bench units. So every rail of the `harmony-885` skill
applies, and **every procedure there was established on the 885's application 4.4 and bootloader 4.0**: none of it
is carried to a 785 without reading the 785's own build first.

## 1. Read these before anything else

In this order, every time, including in an agent:

1. `reference/remotes/harmony-785/README.md` and the topic file the task touches, above all `firmware.md` and
   `memory.md`.
2. The `harmony-885` skill, sections 1 to 3 and 5: the platform's read hazards, the backup a write needs, and the
   cable. Its write procedure, section 4, is the 885's and is not this model's until the steps below are done.
3. `reference/architectures/harmony-880-885/README.md`, `firmware.md` ("The Harmony 720's images") and `usb.md`.
4. `docs/test-notes/harmony-785.md`: what has been done to the two bench units, in order.
5. `todo/todo-harmony-785.md`: the generated checklist and, below it, the remote's own work.
6. The `recovering-a-remote` skill's section "The Harmony 880 and 885" **before planning any write**.

In conversation say "the Harmony 785", never the bare architecture number.

**The architecture question, every step**: a reading of the 885's application holds for the 885 and 880; a
reading of the 720's application 4.5 holds for the 720 and the 785; a bootloader reading holds for the build it
was read in, and the two 785s carry two builds.

## 2. The two units

`h785_a` and `h785_b`, recorded in the lab's `units/`. **Both report the same product id and skin**, so which one
is on the cable is read off its identity block, never assumed. `read-identity.ts --record <label>` files whatever
remote answers under the label it is given, so before recording a unit, or trusting a recorded one, compare the
block with the other unit's record. A unit check in a write rail does this once a write path names the 785.

## 3. Reads

The reads both units took on first contact, all safe on this platform:

    node packages/usb/bin/read-identity.ts --product 0xc110
    node packages/corpus/bin/read-config.ts --label h785-<a|b> --product 0xc110
    node packages/corpus/bin/read-region.ts --label h785-<a|b>-flash --address 0x000000 --count 0x1FE000 --anywhere --product 0xc110

the last twice, the second with `-flash-2`, and the two compared. **Keep a long read's whole output in a lab file**:
one of unit B's flash reads stopped after its retries and its error was lost to a filtered terminal, so the cause
is unknown. A read that fails after its retries is reported, not rerun blind.

## 4. Writing

**Both units may be written, decision 34, and no write path names a 785 yet.** The order, each step its own item
in `todo/todo-harmony-785.md`:

1. The write end read in application 4.5: the cache drop, the restart and the staged install status address. The
   configuration writer refuses a commit on any build whose write end is not read, so this is not optional.
2. The bootloaders' refusal of an erase or a write below `0x010000`, in the 720's 4.2 and in the 4.4 build.
3. One block of remains written back unchanged, unit A first, as the block rehearsal did for each 885.
4. Then a whole configuration through `write-config.ts`, the unit's own restamped first.

**Never** send the unlock, `WRITE_MISC` selector 7 or selector `0x0A`, and never set the install status: the
`harmony-885` skill says why, and nothing here makes those safer on a 785.

## Where things live

| what | where |
|---|---|
| the public reference | `reference/remotes/harmony-785/`, `reference/architectures/harmony-880-885/` |
| the bench units' record | `docs/test-notes/harmony-785.md` |
| the checklist and the remote's own work | `todo/todo-harmony-785.md` |
| the reads | the lab, named `h785_a_*` and `h785_b_*` in `packages/lab` and `tests/lab.py` |
| the unit records | the lab's `units/h785_a.txt` and `units/h785_b.txt`, never copied into this repository |
| what the reads show | `tests/harmony_880_885/test_harmony_785_first_read.py` |
| the decision | `docs/decisions.md` decision 34 |

## Related

* `harmony-885`: the platform's rails, reads and recovery.
* `recovering-a-remote`: the bootloader and the staged install on this platform.
* `writing-a-config`: every rail a configuration must respect.
* `probe-remote`: reading a remote read only, and the gate before any experimental packet.
* `trace-section`: reading the write end out of the 720's image.
