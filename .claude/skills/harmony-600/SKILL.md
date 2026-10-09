---
name: harmony-600
description: "Everything needed before working on the Harmony 600: where its facts are (read them first), how a configuration is written to the bench unit step by step, how a delay the remote saved is read and cleared, and how a bench test is run. Use before any task on the Harmony 600, before composing, writing or reading a 600 configuration, before touching its settings store, before writing a bench test for it, and in every agent brief for 600 work."
---

# Working on the Harmony 600

**This skill holds no facts about the remote. It says where they are, and it holds the procedure that
has no other home.** The facts live in the public reference and are not repeated here, because two
copies of a fact are two copies until one of them moves.

The reason this exists is the Harmony 650's: a session once proposed checking that model's clock by
looking at its screen, and the reference already said it shows none. The 600 shows none either.
Nothing was missing; nobody had read it. So the first section below is not optional.

## 1. Read these before anything else

In this order, every time, including in an agent:

1. `reference/remotes/harmony-600/README.md`: the key numbers and the map of its nine topic files. Then
   open the topic file the task touches: `keys.md`, `display.md`, `features.md`, `behaviour.md`,
   `memory.md`, `firmware.md`, `usb.md`, `hardware.md`, `misc.md`.
2. `reference/architectures/harmony-600-650-700/README.md`: what the 600 shares with the 650 and 700,
   architecture 14, including its memory layout. In conversation say "the Harmony 600", never the bare
   architecture number.
3. `docs/memory-map-600.md`: the 600's measured map row by row, which the reference links rather than
   restates.
4. `docs/how-a-harmony-works.md` when the task touches what the remote does for a person: activities,
   device mode, Help, the device list.

**When the reference does not answer a question about the remote, ask** before designing around the gap,
and land the answer in the reference afterwards with its source.

**Two things about the 600 that differ from the 650 and catch a session out**, both in the reference:
its screen is monochrome while its configuration carries colour pixels, and it **has delays saved on
the remote** that override the configuration's at every start, so a delay changed in the file can do
nothing. Read `features.md` and `memory.md` on the settings store before any delay work.

## 2. Writing a configuration to the bench 600

The bench 600 is a permitted write target since 29 September 2026. Writing to it follows "Never write to a
remote" in `CLAUDE.md` and the `writing-a-config` skill; this is the procedure on top of those, the same
as the Harmony 650's in `harmony-650` with the 600's names.

1. **Read the remote's current region into the lab first**, the compare base and the restore point:

       node packages/corpus/bin/read-region.ts --label <name> --address 0x30000 --count 0x1d0000

2. **Register that read** under a name like `h600_<what>_region`: `IMAGES` in `packages/lab/src/index.ts`
   and in `tests/lab.py`, `PARSEABLE_EXCLUDED` in both, and `H600_DUMPS` in
   `packages/corpus/bin/write-config.ts`. Then raise the two counts in `packages/lab/test/parity.test.ts`.
3. **Dry run**, which reads only:

       node packages/corpus/bin/write-config.ts --config <file> --dump <region name>

4. **Commit**:

       HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 node packages/corpus/bin/write-config.ts \
         --config <file> --dump <region name> --commit

   The dump names which unit is expected and the identity block read off the remote must match the
   lab's `h600` record; the 650 enumerates identically and is refused by that check. The writer refuses
   a firmware build other than 0.2, whose cache drop and restart were read.
5. **A change to a delay may not be heard** if the remote holds a saved value for that device. Read the
   store first:

       node packages/usb/bin/read-settings.ts --product 0xc122

   and clear a saved slot, read only without `--commit`:

       HARMONY_ENABLE_WRITES=1 HARMONY_SETTINGS_WRITE=1 \
         node packages/usb/bin/write-settings.ts --unit h600 --table 'power on' --key <key> --commit

   The 600 is the only unit this has been sent to, findings section 305.

When a write stops part way, rerun it with exactly the same arguments, and do not unplug the remote or
take its batteries out first. The 650 skill's notes on idle disconnects and out of sequence reads apply
to this architecture as a whole.

**The 600 has no clock on its screen.** A clock is checked by reading memory over USB, and on the cable
the 600 has not loaded its configuration, findings section 110, so ask before relying on a live read.

## 3. Bench tests

The shape, the rules and the Flirc's firmware requirement are the `harmony-650` skill's section 3, and
they apply unchanged. The 600's runs are in `packages/bench/irtests/done/`, those whose names start
`600-`; their recordings are in the lab's `reads/`.

## Where things live

| what | where |
|---|---|
| the public reference | `reference/remotes/harmony-600/` and `reference/architectures/harmony-600-650-700/` |
| the measured map | `docs/memory-map-600.md` |
| the firmware image to read | `600-0.2-code-base0x9000-COMPLETE.bin` in the lab's `firmware/derived/` |
| the unit record | the lab's `units/h600.txt`, never copied into this repository |
| region reads and compiles | the lab's `reads/`, named in `packages/lab` and `tests/lab.py` with the prefix `h600_` |
| the button map's calibration | `reference/button-maps.md`, the configuration `calibration_h600` |

## Related

* `harmony-650`: the sibling's skill, whose bench procedure this one borrows.
* `writing-a-config`: every rail a configuration must respect, before changing any byte.
* `probe-remote`: reading the remote read only, and the gate before any experimental packet.
* `recovering-a-remote`: what to do if a write leaves the remote unable to start.
* `myharmony-service`: Logitech's compile, when a step needs a configuration from their service.
