---
name: harmony-700
description: "Everything needed before working on the Harmony 700: where its facts are (read them first), how a configuration is written to the bench unit step by step, how its firmware is reinstalled or staged, and how a bench test is run. Use before any task on the Harmony 700, before composing, writing or reading a 700 configuration, before any firmware step on it, before writing a bench test for it, and in every agent brief for 700 work."
---

# Working on the Harmony 700

**This skill holds no facts about the remote. It says where they are, and it holds the procedure that
has no other home.** The facts live in the public reference and are not repeated here, because two
copies of a fact are two copies until one of them moves.

The reason this exists is the Harmony 650's: a session once proposed checking that model's clock by
looking at its screen, and the reference already said it shows none. The 700 shows none either.
Nothing was missing; nobody had read it. So the first section below is not optional.

## 1. Read these before anything else

In this order, every time, including in an agent:

1. `reference/remotes/harmony-700/README.md`: the key numbers and the map of its nine topic files. Then
   open the topic file the task touches: `keys.md`, `display.md`, `features.md`, `behaviour.md`,
   `memory.md`, `firmware.md`, `usb.md`, `hardware.md`, `misc.md`.
2. `reference/architectures/harmony-600-650-700/README.md`: what the 700 shares with the 600 and 650,
   architecture 14. In conversation say "the Harmony 700", never the bare architecture number.
3. `docs/how-a-harmony-works.md` when the task touches what the remote does for a person.

**`docs/memory-map-700.md` predates every measurement of a 700** and its "presumed" rows are not to be
trusted; the reference's `memory.md` says which have been measured since.

**When the reference does not answer a question about the remote, ask** before designing around the gap,
and land the answer in the reference afterwards with its source.

**What differs from the 650 and catches a session out**: the 700 runs build 2.8, not 0.2, so no address
read on the 0.2 builds transfers without checking; its mode 0 is a charging battery and its "add an
Activity" placeholder is another mode; and it charges, so it may be on its adaptor rather than on a
computer.

## 2. Writing a configuration to the bench 700

The bench 700 is a permitted write target since 29 September 2026. Writing to it follows "Never write to a
remote" in `CLAUDE.md` and the `writing-a-config` skill; this is the procedure on top of those, the same
as the Harmony 650's in `harmony-650` with the 700's names.

1. **Read the remote's current region into the lab first**, the compare base and the restore point:

       node packages/corpus/bin/read-region.ts --label <name> --address 0x30000 --count 0x120000

   which covers the configuration as it has been with room to spare; take more if the file has grown.
2. **Register that read** under a name like `h700_<what>_region`: `IMAGES` in `packages/lab/src/index.ts`
   and in `tests/lab.py`, `PARSEABLE_EXCLUDED` in both, and `H700_DUMPS` in
   `packages/corpus/bin/write-config.ts`. Then raise the two counts in `packages/lab/test/parity.test.ts`.
3. **Dry run**, which reads only:

       node packages/corpus/bin/write-config.ts --config <file> --dump <region name>

4. **Commit**:

       HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 node packages/corpus/bin/write-config.ts \
         --config <file> --dump <region name> --commit

   The identity block read off the remote must match the lab's `h700` record, and the writer refuses a
   build other than 2.8, whose cache drop and restart were read, findings sections 97 and 299.

When a write stops part way, rerun it with exactly the same arguments, and do not unplug the remote or
take its batteries out first.

## 3. Firmware: reinstalling and staging

The 700 is the one model both install routes were run on. Read the `recovering-a-remote` skill and the
reference's `firmware.md` first. The script is `packages/usb/bin/reinstall-firmware.ts`, read only without
`--commit`:

    HARMONY_ENABLE_WRITES=1 HARMONY_FIRMWARE_REINSTALL=1 \
      node packages/usb/bin/reinstall-firmware.ts --unit h700 --commit

reinstalls what is staged. Staging Logitech's own unmodified image first adds `--image <file> --backup
<lab read of the staging region>` and `HARMONY_FIRMWARE_STAGE=1`, decision 18; the backup must equal the
remote's region before anything is erased, which is the script's check and not the rail's. Nothing here
writes the processor's flash and nothing modifies firmware.

## 4. Bench tests

The shape, the rules and the Flirc's firmware requirement are the `harmony-650` skill's section 3, and
they apply unchanged. The 700's runs are in `packages/bench/irtests/done/`, those whose names start
`700-`; their recordings are in the lab's `reads/`.

## Where things live

| what | where |
|---|---|
| the public reference | `reference/remotes/harmony-700/` and `reference/architectures/harmony-600-650-700/` |
| the firmware images | `700-2.8-Region_2-code-base0x9000.bin` and the 2.8 package in the lab's `firmware/` |
| the unit record | the lab's `units/h700.txt`, never copied into this repository |
| region reads and compiles | the lab's `reads/`, named in `packages/lab` and `tests/lab.py` with the prefix `h700_` |
| the published pair of a contributor's 700 | `h700_config` and its sibling, `reference/checksums.md` |

## Related

* `harmony-650`: the sibling's skill, whose bench procedure this one borrows.
* `writing-a-config`: every rail a configuration must respect, before changing any byte.
* `recovering-a-remote`: safe mode, the reinstall and the staging route.
* `probe-remote`: reading the remote read only, and the gate before any experimental packet.
* `myharmony-service`: Logitech's compile, and the software update service.
