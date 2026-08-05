# Roadmap: from reverse engineering to a Harmony configuration app

This is the authoritative sequence. [plan.md](plan.md) is the earlier proposal this grew out of
and is kept for its arguments, not as the plan of record.

Status, 2026-08-05: steps 1 and 2 are done, step 3 is next.

## Context

`docs/plan.md` is the roadmap that came out of the harmony-decompiler discussion. It treats the
user-facing tool as Phase 6, last, because it was written as an argument for how to reverse
engineer the format. The project owner's actual goal is the opposite way round: a local,
cross-platform, fully self-contained application that reads a Harmony config off a remote,
edits devices and activities, learns new IR codes and writes the result back. The reverse
engineering is the cost of that application, not the deliverable.

This plan re-sequences the work so that every stage produces something usable, and so that the
format questions get answered in the order the application needs them. It also records eight
decisions taken in the planning session, because several of them are one-way doors.

Scope for now is deliberately narrow: the Harmony One (arch 12) and the Harmony 600 (arch 14),
both of which the owner has on the desk, with the Harmony 700 2.8 image as the arch 14 reference
because the 600 dump is truncated by concordance. Other models are iterated on later.

## Decisions taken

1. **Licence stays MIT.** libconcord and harmony-decompiler are both GPLv3, so their code cannot
   be copied or ported into this repository without relicensing it, which cannot be undone.
   Running concordance as a separate program has no licensing consequence at all, and protocol
   facts (command bytes, length nibble mappings) are not copyrightable expression.
2. **The USB protocol is derived clean-room from the firmware**, which is also what the project
   doctrine already demands: the firmware is the spec. `concordance/specs/protocol.txt` serves as
   corroboration of facts, and concordance itself stays in use as a cross-check oracle and as the
   tool that produces corpus dumps. There are technical reasons beyond the licence: concordance
   has two documented defects on these two architectures, `--dump-firmware` was silently wrong
   for years, and arch 14 IR learning is listed upstream as "believed working" rather than
   confirmed.
3. **TypeScript owns the config codec, Python stays reverse engineering only.** The app-relevant
   Python code is 461 lines today (`ezfile.py` 168, `gspm.py` 180, `firmware.py` 113) and will be
   five times larger in six months, so this is the cheapest moment to move it. The PIC18 tooling
   (`isa.py`, `disasm.py`, `trace.py`, `loadaddr.py`, 694 lines) and the eventual emulator are
   research tools the app never calls. The repository doctrine "never a second opcode table"
   applies equally to config codecs: there will be exactly one, in TypeScript.
4. **Monorepo.** The spec, the codec and the tests stay in one place, because a codec in a second
   repository will drift away from `docs/config-format.md`.
5. **Hardware in the loop first, emulator deferred.** The emulator remains the right tool for
   activity semantics, but it is the largest single build in the plan and the app would sit
   behind it for months. The cheap substitutes are a byte-identical round trip, a read back and
   diff after every write, IR cross learning between the two remotes, and live RAM polling over
   USB.
6. **Safety rails are absolute.** Firmware is never written. The spare, unprogrammed Harmony One
   is the only write target. Details below.
7. **Heads down on our own derivation.** The findings in harmony-decompiler discussion #1 are
   treated as hypotheses to test, not as facts to adopt. The original format designer
   (`glenharris`) is active there and is a privileged source, but asking is held in reserve for
   when we are genuinely stuck.
8. **Version 1 of the app is read only.** Detect the remote, read the config, show the container
   and the labelled sections, export IR codes. The write code is written but sits behind a flag
   that is off in release builds.

## Facts established during planning

* Arch 12 and arch 14 both use the plain non-z-wave HID class in libconcord, 64-byte reports in
  both directions. `node-hid` and Python `hidapi` both cover Windows, macOS and Linux. Linux
  needs a udev rule either way.
* The command set is small: `GET_VERSION 0x10`, `WRITE_FLASH 0x30`, `WRITE_FLASH_DATA 0x40`,
  `READ_FLASH 0x50`, `START_IRCAP 0x70`, `STOP_IRCAP 0x80`, `WRITE_MISC 0xA0`, `READ_MISC 0xB0`,
  `ERASE_FLASH 0xD3`, `RESET 0xE1`, plus a length nibble whose mapping is non-linear and differs
  between mode 0 (safe mode) and the other modes.
* `READ_MISC`/`WRITE_MISC` carry a `MISC_RAM 0x06` sub-command, exposed upstream as
  `ReadRam`/`WriteRam`. **Live RAM of a running remote is readable over USB.** The header also
  defines `MISC_QUEUE_ACTION 0x03` and `MISC_QUEUE_EVENT 0x09`, which concordance never uses;
  whether the firmware services them is an open question worth answering, because event
  injection would let us drive the remote from the host.
* Our parsers reject the two extra sample sets: `gspm.parse` and `ezfile.decode_payload` hardcode
  the `GSPM` magic, so `AHCM` (arch 9, Harmony 525) and `TPTP` (arch 8, 720/785/88x) both fail.
  The claim in `docs/config-format.md` that the container is shared across architectures is
  therefore currently untested against the two architectures that would best prove it.
* Five extra config samples are available in the sibling `harmony-decompiler/samples` checkout,
  already published with permission, `UserId` 0, no account data: four arch 8 and one arch 9.
* Three of the four arch 8 configs were generated about ten minutes apart and still differ in 73
  to 84 percent of their bytes, first difference at offset `0x000004`. **A small logical change
  reshuffles the whole image.** Consequence for the app: byte-identical round tripping is
  achievable, but reproducing what Logitech's generator would have emitted is not, so the editor
  must make minimal diffs against an existing config rather than regenerate one.
* The keypad scanner at `0x190A6` returns a linear index `row * 4 + column`, 1 to 56, 14 rows by
  4 columns, rows active low. Upstream is blocked on mapping physical buttons to codes after
  three failed attempts, none of which involved reading firmware. Polling the RAM variable that
  receives the scanner's index, over USB, while a human presses each key, is a fourth route.
  Supporting evidence that the scanner keeps running while USB is attached: upstream observed a
  key press toggling a backlight boolean.
* Upstream reports a config interpreter in firmware, an accumulator machine at `0x01C86` to
  `0x02401` on their architecture, so action lists are bytecode rather than data. Their claimed
  key chain is physical button, scan code `row << 3 | column`, event code `0x80 | scan`, key
  table, action list, IR command, with event type in the top bits (`0x80` press, `0x40` release,
  `0xC0` repeat). That last detail is the most promising lead on our unexplained LWJL `flags`
  field (`0x00`, `0x07`, `0x7F` across samples).
* The format's designer stated the pointer table "is probably pointing to data for each of the
  various subsystems (IR sending, state variables, menus, action lists etc)". Treat as a prior
  for section labelling, not as an answer.

## Target repository shape

```
src/harmony/            unchanged: PIC18 disassembler, tracer, load address, emulator later
tools/                  unchanged: reverse engineering command line
packages/codec/         TS: EZHex container, GSPM/AHCM/TPTP, records, round trip compiler
packages/usb/           TS: HID transport plus the Harmony command protocol
apps/studio/            Electron: the UI
tests/                  Python reverse engineering tests stay; TS tests live with their package
docs/                   plus docs/usb-protocol.md and this roadmap
```

Conventions: pnpm workspaces, `.nvmrc`, TypeScript strict, `vitest`. TS tests that need real
dumps resolve `../lab` or `HARMONY_LAB` and skip cleanly when absent, mirroring `tests/lab.py`.
Fixtures never enter git; checksums go in `reference/checksums.md`.

## Milestones

**M0 Infrastructure.** Corpus widened, container generalised, monorepo standing up.

**M1 Explorer, read only.** The app finds the remote, reads its config, and shows the container,
the section table with whatever labels exist, an annotated hex view, and an IR code export.

**M2 Round trip codec.** Decompile and recompile byte-identical across the whole corpus, and the
trailer checksum reproducible. This is the gate for any editing at all.

**M3 Offline editor.** Edit understood fields, minimal diff against the original, every change
validated by recompiling and by whatever hardware-free checks exist. Nothing is written yet.

**M4 Writer.** Write to the spare Harmony One only, read back, diff, recover if wrong.

**M5 Learning.** IR capture over USB plus our own encoder from raw timings to a config record.

**M6 Authoring.** Create and edit devices and activities, which needs the action list bytecode.

## Work sequence

### Step 1: corpus and provenance. Done

* The five public samples are in the lab as `dumps/guyman70718/harmony-88x-arch8/` (four arch 8
  configs) and `dumps/trelowney/harmony-525/` (arch 9), each with a `META.md` recording
  contributor, source, permission status and the device details read out of the file itself.
  Checksums match the upstream `SHA256SUMS.txt` and are recorded in
  `reference/checksums.md`.
* `tools/corpus.py` now accepts a dump directory that has a `META.md` and a config but no
  concordance identity output, taking the device details from the config's own XML header. The
  corpus reports 5 dumps over 4 architectures, with the arch 8 set correctly flagged as having
  no recorded description.

Still open from this step: all three `lab/dumps/danny/*/META.md` record "Publishing the dump
itself or its contents: no". If any of those dumps has since been shared publicly, the META files
are stale and need correcting, because later policy decisions read them.

### Step 2: generalise the container. Done

* `src/harmony/gspm.py` works from a family table (`GSPM`/`PTYY`, `TPTP`/`DKDK`, `AHCM`/`MCHA`)
  rather than one hardcoded magic, and derives the marker after the pointer table from the data.
  `src/harmony/ezfile.py` gained `parse_ezhex`, which splits a config on its declared
  `BINARYDATASIZE` and verifies the `0x69`-seeded XOR `CHECKSUM` and the `INTENDEDVERSION` block.
* Result: twelve samples, four architectures, five base addresses, three format versions, four
  pointer table lengths, all consistency checks passing. The container claim in
  `docs/config-format.md` is no longer a claim about two models.
* A Harmony 700 config arrived afterwards, which gave arch 14 a second sample and, more to the
  point, a config from the same model as the arch 14 firmware image. Two findings came out of
  it, in `docs/findings.md` section 15: **a config states its own architecture** in section slot
  1, needed because `GSPM` covers both arch 12 and arch 14 and a config read over USB has no
  file header to consult; and slot 0 is the container's **only** `0xFEED` frame, which corrected
  an earlier claim here that every section was one.
* Findings that came out of it, written up in `docs/findings.md` section 14 with tests in
  `tests/test_gspm.py`: `WLWL` on arch 8 is the same key table as `LWJL`; arch 8 and arch 12
  share 47 codes in identical order apart from one transposition, which suggests the key order
  is canonical across the family; `format` is not an architecture identifier, since arch 9 and
  arch 14 both carry `0x1400`.

### Step 3: the USB protocol, clean room

* Find and document the USB HID command dispatcher in the Harmony 700 2.8 image and in the
  Harmony One 3.4 image, using `tools/pic18_disasm.py` and `tools/pic18_trace.py`. Deliverable is
  a new `docs/usb-protocol.md` covering, per command: request layout, response layout, the length
  nibble mapping actually implemented, and which commands the firmware ignores.
* Answer specifically: does the firmware service `MISC_RAM` reads in normal mode, and does it
  implement `MISC_QUEUE_ACTION` or `MISC_QUEUE_EVENT`.
* Work out which `READ_FLASH` PROM type covers which address range: `MCU_FLASH 0x01`,
  `MCU_EEPROM 0x02`, `MCU_ID 0x03`, `EXT_FLASH 0x04`. Arch 12 runs from external NOR mapped into
  program space, arch 14 from internal flash because its SPI part is not executable, so the two
  are unlikely to use the same selector.
* **First deliverable of our own read path: a complete firmware dump of both remotes on the
  bench.** Right now the only arch 14 image we can disassemble is the 700 2.8 package, used as a
  proxy, because concordance truncates the 600 dump at 65536 bytes of a 70336 byte image and
  loses the entry point. Reading it ourselves gives the firmware actually running on the test
  hardware, plus the `MCU_ID`, which would settle the arch 12 part number that is currently
  inferred rather than measured. Read-only, and it does not replace the archived `.hfw` packages,
  which cover models nobody here owns.
* Also locate the routine that validates a config on boot, because that is where the trailer
  checksum algorithm lives. Note it now, derive it in step 6.
* Cross-check the documented protocol against a concordance run on the owner's remotes: same
  bytes on the wire, same answers.

### Step 4: monorepo and the TS codec

* Stand up pnpm workspaces, `packages/codec`, `packages/usb`, `apps/studio`, `vitest`, and a lab
  fixture resolver.
* Port the 461 lines of container logic to `packages/codec`: EZHex/EZUp container, XML header with
  `BINARYDATASIZE` and the `0x69`-seeded XOR checksum, GSPM family header, derived base address,
  derived pointer count, LWJL, the IR parameter block.
* Cross-validate: a golden vector file per sample, asserted by both the Python tests and the TS
  tests, so the port is provably equivalent before Python's copy is retired. After that, Python
  keeps only the reverse engineering tools.
* `packages/usb`: HID transport over `node-hid`, the command layer from `docs/usb-protocol.md`,
  read paths and RAM reads enabled, write and erase paths implemented but gated behind a build
  flag that is off by default.

### Step 5: M1, the explorer

* Electron shell, single window, no network access at all, with a content security policy that
  makes that structural rather than a promise.
* Views: device identity from `GET_VERSION`, config read with progress, container summary, section
  table, annotated hex view, and a raw JSON export of everything decoded so far.
* Save every read config into the lab corpus automatically, with a timestamp, because a dump
  taken before an experiment is the only cheap insurance there is.

### Step 6: the first reverse engineering block, section labelling

* Statically: find every RAM location a config-derived pointer is copied into, then find its
  consumers, exactly as `0x3BD`/`0x3BE` was resolved into the IR subsystem pointer. Prior from
  the designer: IR sending, state variables, menus, action lists.
* Dynamically: poll those RAM slots over USB while operating the remote by hand, and see which
  pointer is live for which on-screen activity or device. This is the poor version of the
  emulator's read trace and it costs a day rather than a month.
* First visible payoff: an IR database extractor, exporting the codes people cannot recreate out
  of configs they already own, into documented JSON in the explorer.
* Then the trailer checksum, from the boot validation routine located in step 3.
* Then the button mapping experiment: poll the scanner's RAM variable while pressing every key on
  both remotes, and publish the resulting table. This also unblocks upstream.

### Step 7: keep the documents honest

Ongoing rather than a step, and it applies to every step above: a confirmed fact lands in
`docs/config-format.md`, its reasoning in `docs/findings.md`, and a regression test in `tests/`
or in the TypeScript package's own suite. `CLAUDE.md` and `README.md` state the product goal and
these decisions so a future session does not relitigate them.

## Hardware safety rails

Not optional, and they belong in the code rather than in a document:

* Firmware is never written. `WRITE_FLASH` is restricted to the config region for the detected
  architecture (One `0x040000`, 600/700 `0x030000`) and a write outside it is refused by the
  library, not by the UI.
* The programmed Harmony One and the Harmony 600 are read only in practice. The spare
  unprogrammed One is the only write target until a write has been demonstrated repeatable there.
* No write proceeds unless a verified original dump of that exact unit exists in the lab, with a
  matching checksum, and unless the config's `INTENDEDVERSION` matches the connected remote's
  protocol, skin, board and flash id.
* Every write is followed by a `READ_FLASH` of the same range and a byte comparison. A mismatch is
  reported as a failure, not a warning.
* Recovery paths are documented before the first write: the safe mode config already dumped for
  each unit (`*-safe.bin`), and the hardwired reset key combination at `0x19120`.
* Concordance stays available as an independent second opinion, and a patched concordance build is
  treated as read only because the architecture patch also redirects `erase_firmware()`.

## Verification

* `make test`, `make lint`, `make prose`, `make corpus` keep working unchanged; the Python suite
  gains arch 8 and arch 9 container cases.
* `pnpm test` runs the TS suite. Every finding that lands in `packages/codec` also lands as a test
  over a lab fixture, and skips cleanly without a lab.
* Golden vectors shared between the Python and TS suites during the port window, so equivalence is
  proven rather than assumed.
* Round trip harness: for every config in the corpus, decompile then recompile and assert byte
  equality. Report coverage as the fraction of bytes that are decoded rather than opaque, so
  progress is a number.
* USB layer: compare our command traces against concordance's behaviour on the same operation, and
  assert that a config read by us and a config read by concordance are identical.
* End to end for M1: plug in the Harmony 600, run the app, read the config, confirm the container
  summary matches `python3 tools/gspm_parse.py` on the same file.

## Known unknowns, unchanged

* The trailer checksum algorithm. Still on the critical path for anything that writes.
* Three of the four IR encoding classes at the dispatcher `0x12F08`.
* The encoder from raw learned timings to a config IR record. This ran on Logitech's servers, so
  nobody has it, and M5 depends on deriving it from the four decoder classes.
* Activity semantics, which upstream evidence says is bytecode for an accumulator machine.
* The LWJL difference between architectures, and the translation from the scanner's linear index
  to config event codes.
* Whether the firmware implements event injection over USB.
