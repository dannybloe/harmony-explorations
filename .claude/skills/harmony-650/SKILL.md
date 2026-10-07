---
name: harmony-650
description: "Everything needed before working on the Harmony 650: where its facts are (read them first), how a configuration is written to the bench unit step by step, and how a bench test is written and run with the Flirc. Use before any task on the Harmony 650 or a todo-compile-650.md item, before composing, writing or reading a 650 configuration, before writing a bench test for it, and in every agent brief for 650 work."
---

# Working on the Harmony 650

**This skill holds no facts about the remote. It says where they are, and it holds the procedure that
has no other home.** The facts live in the public reference and are not repeated here, because two
copies of a fact are two copies until one of them moves.

The reason this exists: on 7 October 2026 a session proposed checking the 650's clock by looking at its
screen. The 650 shows no clock, and the reference said so in its key numbers table. Nothing was
missing; nobody had read it. So the first section below is not optional.

## 1. Read these before anything else

In this order, every time, including in an agent:

1. `reference/remotes/harmony-650/README.md`: the key numbers, the unit on the bench, and the map of
   its nine topic files. Then open the topic file the task touches: `keys.md`, `display.md`,
   `features.md`, `behaviour.md`, `memory.md`, `firmware.md`, `usb.md`, `hardware.md`, `misc.md`.
2. `reference/architectures/harmony-600-650-700/README.md`: what the 650 shares with the 600 and 700,
   architecture 14, including its memory layout. In conversation say "the Harmony 650", never the bare
   architecture number.
3. `todo-compile-650.md`: the plan, which item the task is, and the evidence already recorded on it.
4. `docs/how-a-harmony-works.md` when the task touches what the remote does for a person: activities,
   device mode, Help, the device list.

**When the reference does not answer a question about the remote, ask Danny** before designing around
the gap, and land the answer in the reference afterwards with its source.

## 2. Writing a configuration to the bench 650

The 650 is a permitted write target. Writing to it follows "Never write to a remote" in `CLAUDE.md` and
the `writing-a-config` skill; this is the procedure on top of those, in the order it is done.

1. **Read the remote's current region into the lab first.** That read is the compare base the write is
   checked against, and the restore point if it fails:

       node packages/corpus/bin/read-region.ts --label <name> --address 0x30000 --count 0x110000

2. **Register that read** under a name like `h650_<what>_base`, in four places: `IMAGES` in
   `packages/lab/src/index.ts` and in `tests/lab.py`, `PARSEABLE_EXCLUDED` in both (a region read is not
   a container), and `H650_DUMPS` in `packages/corpus/bin/write-config.ts`. Then raise the two counts
   in `packages/lab/test/parity.test.ts`. The test fails until all four agree.
3. **Dry run**, which reads only and prints which blocks would be written:

       node packages/corpus/bin/write-config.ts --config <file> --dump <base name>

4. **Commit**:

       HARMONY_ENABLE_WRITES=1 HARMONY_FIRST_WRITE=1 node packages/corpus/bin/write-config.ts \
         --config <file> --dump <base name> --commit

   The writer stamps the configuration with the moment of writing and saves the stamped file over
   `--config` before it erases anything. `--as-is` writes a file's own stamp, for a Logitech compile
   put back unchanged. Each run appends a journal beside the configuration, `<config>.write-*.log`.
5. **After the restart, the remote shows its ordinary screen.** Its clock is checked by reading memory
   over USB, never by looking: it has no clock on screen.

**When a write stops part way, rerun it with exactly the same arguments.** The rerun recognises the half
written blocks and writes the file the stopped run saved. Do not unplug the remote or take its
batteries out first.

**Three things the bench does that are not faults:**

* The remote drops off USB when it sits idle, and every command then answers "no matching Harmony
  remote attached". Danny wakes or replugs it.
* A read sometimes fails with a chunk out of sequence when the machine is busy, for instance while a
  test suite runs. Wait for the load to finish and run it again.
* A failed read can leave the connection holding stale data, and every read after it fails. A replug
  clears it.

## 3. Writing and running a bench test

A bench test is a JSON file in `packages/bench/irtests/` that Danny performs on the remote while the
infrared monitor at `/ir.html` (`make bench`) records what the Flirc receiver hears. The run is filed in
the lab's `reads/`; when it is done, the test file moves to `irtests/done/`.

The shape: `{ "name", "description", "steps": [{ "instruction", "expect": [...] }] }`. An `expect`
entry names a `device` and either a `command` or a `code` with the `config` it is a number in, and may
give `times` and `pauseMs`. Write what is predicted in `description` before the run, so the run can
prove it wrong.

**Rules for the instructions, each learned at the bench:**

* **Take every screen from the written file itself**, drawn by the bench (`GET /api/screen`) or by
  `make render`, never from memory or from another configuration. The device list exists in several
  copies, each with its own order, and the one the ordinary screen opens is the one to describe.
* **Plain English, as a person holding the remote reads it.** Name a key by what is printed on it or
  by its place beside the screen ("the button beside Plasma, bottom right"), and say what the screen
  should show at each step.
* **Trace the path in the file before asking Danny to look**: which key opens which page, and what
  that page binds. A step that asks him to check something the file can answer wastes a bench run.
* **The monitor counts frames.** A held or timed power code shows its total number of frames, so "7
  frames" is one press of a code sent seven times.
* **The Flirc must be on firmware 4.10.7 or later**; older firmware drops the Denon's long codes
  without a trace.

## Related

* `writing-a-config`: every rail a configuration must respect, before changing any byte.
* `probe-remote`: reading the remote read only, and the gate before any experimental packet.
* `recovering-a-remote`: what to do if a write leaves the remote unable to start.
* `myharmony-service`: Logitech's compile, when a step needs a configuration from their service.
