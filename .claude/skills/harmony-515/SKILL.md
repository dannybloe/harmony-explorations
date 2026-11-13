---
name: harmony-515
description: "Everything needed before working on the Harmony 515: where its facts are (read them first), what it shares with the Harmony 525 and what it does not (its own application 3.4, the same platform hazards: an erase bounded only by the flash part, the application one block below the configuration, safe mode destroying the application), how the bench unit was read, and why no write path opens before the 525's rails are checked against it. Use before any task on the Harmony 515 or 510, before plugging the 515 in, before reading, writing or composing a 515 configuration, before any item of todo/todo-harmony-515.md, and in every agent brief for 515 work."
---

# Working on the Harmony 515

**This skill holds no facts about the remote. It says where they are, and it holds the procedure that has no
other home.** The facts live in the public reference and are not repeated here.

**The 515 runs on the Harmony 525's platform and is not a 525.** Its application is a build of its own, 3.4,
where the 525's is 3.0; its face is the 525's with three keys printed otherwise. **Every rail of the `harmony-525`
skill applies to it**, and every procedure there was established on a 525: none of it is carried to the 515
without checking the 515's own memory first.

## 1. Read these before anything else

In this order, every time, including in an agent:

1. `reference/remotes/harmony-515/README.md` and the topic file the task touches.
2. The `harmony-525` skill, whole: its three rails are this platform's, above all **safe mode destroys the
   application and is never entered as an experiment**, and **an erase is bounded only by the flash part**, with
   the application one 64 KiB block below the configuration.
3. `reference/architectures/harmony-5xx/README.md`, `memory.md` and `firmware.md`.
4. `docs/test-notes/harmony-515.md`: what has been done to the bench unit, in order.
5. `todo/todo-harmony-515.md`: the generated checklist and, below it, the remote's own work.
6. The `recovering-a-remote` skill before planning any write.

In conversation say "the Harmony 515", never the bare architecture number.

**The architecture question, every step**: a reading of the 525's application holds for the 525; the 515's 3.4
is read on its own; and whether the 510, skin 68, is the 515's face is not checked.

## 2. The unit

`h515`, recorded in the lab's `units/`. It enumerates with the Harmony 525's product id, so which model is on
the cable is read off its skin in `bcdDevice` or its version block, and which unit off its identity.

## 3. Reads

What the unit has taken, all read only:

    node packages/usb/bin/read-identity.ts --product 0xc111
    node packages/corpus/bin/read-config.ts --label h515-<what> --product 0xc111
    node packages/corpus/bin/read-region.ts --label h515-region --address 0x820000 --count 0x50000 --product 0xc111

the region twice, compared. Keep a long read's whole output in a lab file. The processor's internal flash and
its EEPROM have not been read on the 515; the 525's were, by steps that have no library script, so that is a
step of its own and **never an odd count internal read**.

## 4. Writing

**The unit may be written, decision 35, and no write path names a 515 yet.** The order, each step its own item in
`todo/todo-harmony-515.md`: the 525's rails and addresses checked against the 515's memory; one block of its
configuration region written back unchanged, as the 525's first write was (the `harmony-525` skill's section on
writing a block); then a whole configuration, once a writer serves this platform.

## Where things live

| what | where |
|---|---|
| the public reference | `reference/remotes/harmony-515/`, `reference/architectures/harmony-5xx/` |
| the bench unit's record | `docs/test-notes/harmony-515.md` |
| the checklist and the remote's own work | `todo/todo-harmony-515.md` |
| the reads | the lab, named `h515_*` in `packages/lab` and `tests/lab.py` |
| the unit record | the lab's `units/h515.txt`, never copied into this repository |
| what the reads show | `tests/harmony_5xx/test_harmony_515.py` |
| the drawing | `packages/silhouettes/src/models/h515.ts` |
| the decision | `docs/decisions.md` decision 35 |

## Related

* `harmony-525`: the platform's rails, the block write and safe mode.
* `recovering-a-remote`: safe mode, the bootloader and the EEPROM install byte on this platform.
* `writing-a-config`: every rail a configuration must respect.
* `probe-remote`: reading a remote read only, and the gate before any experimental packet.
