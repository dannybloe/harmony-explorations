# The FHSDK's requirements, per remote

<!-- introduction -->
What the FHSDK must be able to do for an application such as FreeHarmony, and how far each bench model has it.
[Decision 33](decisions.md#d33) is the rule this rests on, and [plan 015](plans/015-requirements-and-capabilities.md)
how it was decided.

**A requirement** is one ability an application gets from the FHSDK, stated as what the application can do for its
user: read a configuration off the remote, add a device from the catalogue, learn a code. It is not an implementation
step and not a screen of any application. Each has a number, `R1` onwards, that is **never renumbered and never
reused**: a requirement that is dropped stays in the list, marked withdrawn. Open work in code and tests points at a
requirement by its number, never at a todo.

**A status** says, per bench model, where the requirement stands:

* **met**: in the FHSDK, shown by a test in this repository, and, for anything that shows on a remote, shown working
  on a bench unit of that model, by a bench test or a passage of the model's test notes in `docs/test-notes/`. A build
  that passes every test and never ran on the remote is open.
* **open**: the model can plainly do it and the FHSDK does not yet, or does it without that evidence.
* **impossible**: the model cannot, by its hardware or firmware, and a page of `reference/` says so; or this project
  does not do it on that model by a decision, which is then the evidence, as the firmware install is the Harmony 600,
  650 and 700's alone by decision 18.
* **unknown**: it is not known whether the model can. It counts as open.

An application offers a feature where it is met; the other statuses are for a developer. The last subject's
requirements, and R68, the report about a remote this project does not support, are about the FHSDK as a whole and
carry one status for every model.

**This document is generated** from `packages/base/src/requirements.ts`, which holds every requirement, every status,
the evidence behind each and the sentence that says why; the codec's `capabilitiesOf` returns the same per model with
the model's properties. Change a status there, in the commit with the test or bench run that moves it, and run
`make requirements-write`; only this introduction is written by hand. `make requirements` fails when the two disagree.
<!-- /introduction -->

<!-- Generated from packages/base/src/requirements.ts by make requirements-write. Change the data, not what follows. -->

## Counts

Over the 71 requirements that have a status per model.

| model | met | open | impossible | unknown |
|---|---|---|---|---|
| Harmony One | 13 | 51 | 5 | 2 |
| Harmony 600 | 16 | 49 | 3 | 3 |
| Harmony 650 | 11 | 54 | 4 | 2 |
| Harmony 700 | 14 | 50 | 3 | 4 |
| Harmony 525 | 7 | 50 | 5 | 9 |
| Harmony 885 | 10 | 53 | 5 | 3 |
| Harmony 300 | 7 | 39 | 17 | 8 |
| Harmony 350 | 12 | 37 | 16 | 6 |
| Harmony Touch | 23 | 39 | 3 | 6 |

## The whole configuration

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R1 Read the configuration off the remote, whole and checked. | met | met | met | open | met | met | open | met | open |
| R2 Understand a configuration: its devices, activities, keys, screens, delays and codes, and what each key will send. | met | met | met | open | met | open | open | open | met |
| R3 Read a configuration back into a recipe, so a setup can be edited and rebuilt; from our own builds whole, favourites included, through a record of ours carried inside. | open | open | open | open | open | open | open | open | met |
| R4 Build a whole configuration from a recipe. | met | met | open | met | open | open | open | met | met |
| R5 Write a configuration to the remote, verified by reading it back, and the remote runs it. | met | met | met | met | open | met | met | met | open |
| R6 Write the user's own remote: take a remote never seen, record its identity and a full backup, and from then on write to that unit only. | open | open | open | open | open | open | open | open | open |
| R7 Refuse a configuration that does not fit the model or would be mishandled, and say what is over. | met | met | met | met | open | open | met | met | open |
| R8 Detect changes made on the remote since the app last wrote it, the help's own delay fixes among them, and keep or discard them. | open | open | open | open | open | unknown | unknown | open | open |

* **R1**, Harmony One, met: The configuration is read whole and checked, and the spare's read matched its stored copy byte for byte. Tests `packages/corpus/test/read/read.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#every-bench-remote-checked-against-its-own-backups`.
* **R1**, Harmony 600, met: The read stops at the header's length and refuses a bad end marker or checksum; the unit's read matched its own file byte for byte. Tests `packages/corpus/test/read/read.test.ts`, `tests/harmony_600_650_700/test_arch14_write_target.py`; shown on a unit in `docs/test-notes/harmony-600.md#the-bench-600s-memory-as-read`.
* **R1**, Harmony 650, met: The configuration is read whole with its end marker and checksum checked, and the bench read matched the flash byte for byte. Tests `packages/corpus/test/read/read.test.ts`; shown on a unit in `docs/test-notes/harmony-650.md#memory-as-read`.
* **R1**, Harmony 525, met: readConfig reads the 525 at its own base and length, and a read off the unit was filed with its checksum recomputing. Tests `packages/corpus/test/read/read.test.ts`; shown on a unit in `docs/test-notes/harmony-525.md#the-first-session-8-august-2026`.
* **R1**, Harmony 885, met: readConfig read both units' configurations whole, end marker and checksum passing, and each unit's two reads agree. Tests `packages/corpus/test/read/read.test.ts`, `tests/harmony_880_885/test_harmony_885_bench_reads.py`; shown on a unit in `docs/test-notes/harmony-885.md#5-november-2026-each-units-configuration-and-region-and-unit-as-clock`.
* **R1**, Harmony 350, met: The configuration file is read off the unit, the end marker put back, and its checksum checks. Tests `packages/usb/test/file-protocol/filewrite.test.ts`, `packages/usb/test/file-protocol/filepipe.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md#what-has-been-read-off-it`.
* **R2**, Harmony One, met: The readers name devices, activities, keys, screens and codes on One compiles, and the view says what every binding sends. Tests `packages/codec/test/inventory/inventory.test.ts`, `packages/codec/test/families/harmony-one/composecompare.test.ts`.
* **R2**, Harmony 600, met: The 600's own configuration reads into its devices, activities and keys, and a 600 setup's view is compared slot by slot. Tests `packages/codec/test/inventory/inventory.test.ts`, `packages/codec/test/families/harmony-600-650-700/empty.test.ts`.
* **R2**, Harmony 650, met: The readers and setupView turn a 650 configuration into its devices, activities, keys, screens and what each sends. Tests `packages/codec/test/families/harmony-600-650-700/compare.test.ts`, `packages/codec/test/inventory/inventory.test.ts`.
* **R2**, Harmony 525, met: The readers give the devices, activities, key bindings, delays and codes of both 525 configurations, and draw every page. Tests `packages/codec/test/inventory/inventory.test.ts`, `packages/codec/test/screens/render.test.ts`.
* **R2**, Harmony Touch, met: The Touch reader turns a set of documents into devices, activities, maps, entries, delays and codes, and the engine model predicts every send. Tests `packages/codec/test/families/harmony-touch/touch-reader.test.ts`, `packages/bench/test/harmony-touch/touch-full-bench-predicted.test.ts`.
* **R3**, Harmony Touch, met: describeTouchSetup turns a set into a setup description, favourites included, and composing it again gives the same remote. Tests `packages/codec/test/families/harmony-touch/touch-setup.test.ts`.
* **R4**, Harmony One, met: The test setup recipe builds to the fingerprint of the file written to the spare, which drove its devices as predicted. Tests `packages/codec/test/recipe/references.test.ts`, `packages/codec/test/families/fromrecipe.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#the-empty-configuration-and-the-setup-on-it`.
* **R4**, Harmony 600, met: The empty 600 and the five device setup build from recipes, byte for byte the files the 600 ran. Tests `packages/codec/test/recipe/references.test.ts`, `packages/codec/test/families/harmony-600-650-700/empty.test.ts`; shown on a unit in `docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit`.
* **R4**, Harmony 700, met: The seven device test setup, built from its recipe alone, ran on the 700 as the file predicts. Tests `packages/codec/test/recipe/references.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#the-configurations-run-on-it`.
* **R4**, Harmony 350, met: The recipe build of the test setup is the file the unit ran, every expected code heard. Tests `packages/codec/test/recipe/references.test.ts`, `packages/codec/test/families/harmony-300-350/noscreenfromnothing.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md`, `packages/codec/test/families/harmony-300-350/noscreenfinalunits.test.ts`.
* **R4**, Harmony Touch, met: All six documents and a background built from a setup file were committed and every activity played its codes. Tests `packages/codec/test/families/harmony-touch/touch-fromnothing.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-from-nothing-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R5**, Harmony One, met: The writer erases, writes, reads back and restarts, and the spare started on what was written. Tests `packages/corpus/test/write/write-config-run.test.ts`, `packages/usb/test/write/blockwrite.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#the-empty-configuration-and-the-setup-on-it`.
* **R5**, Harmony 600, met: Whole writes with the cache drop and restart read back identical on the 600, and a changed delay was then heard. Tests `tests/harmony_600_650_700/test_arch14_write_target.py`, `packages/corpus/test/write/write-config-run.test.ts`; shown on a unit in `docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit`.
* **R5**, Harmony 650, met: Configurations are erased, written, read back, compared and restarted, and the 650 ran the changed delay straight after. Tests `packages/corpus/test/write/write-config-run.test.ts`; shown on a unit in `docs/test-notes/harmony-650.md#what-has-been-sent-to-this-unit`.
* **R5**, Harmony 700, met: Whole configurations went to the unit with the drop and restart, each block read back byte for byte, and ran. Tests `packages/corpus/test/write/write-config-run.test.ts`, `tests/harmony_600_650_700/test_arch14_write_target.py`; shown on a unit in `docs/test-notes/harmony-700.md#what-was-sent-to-the-unit`.
* **R5**, Harmony 885, met: writeConfiguration wrote unit B, read it back identical, restarted it, and B came back running the written file. Tests `packages/corpus/test/write/write-config-run.test.ts`, `tests/harmony_880_885/test_harmony_885_first_config_write.py`; shown on a unit in `docs/test-notes/harmony-885.md#7-november-2026-the-first-whole-configuration-unit-bs-own-restarted`.
* **R5**, Harmony 300, met: The file write verifies by reading back and restarts, and the unit then ran what was written. Tests `packages/usb/test/file-protocol/file-family-run.test.ts`, `packages/usb/test/file-protocol/filewrite.test.ts`; shown on a unit in `docs/test-notes/harmony-300.md`, `packages/codec/test/families/harmony-300-350/noscreenfinalunits.test.ts`.
* **R5**, Harmony 350, met: The file writer wrote, read back identical, restarted, and the unit then sent the file's codes. Tests `packages/usb/test/file-protocol/filewrite.test.ts`, `packages/usb/test/file-protocol/file-family-run.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md`.
* **R7**, Harmony One, met: An overflowing action queue, too many devices and an unserved model are refused, each saying what is wrong. Tests `packages/codec/test/container/queue.test.ts`, `packages/codec/test/families/fromrecipe.test.ts`, `packages/codec/test/compose/composecatalogue.test.ts`.
* **R7**, Harmony 600, met: A setup past the 600's five devices is refused naming the limit; a container overflowing the action queue is refused naming the list. Tests `packages/codec/test/families/harmony-600-650-700/empty.test.ts`, `packages/codec/test/container/queue.test.ts`, `packages/corpus/test/read/compatibility.test.ts`.
* **R7**, Harmony 650, met: Too many devices, an overfull action queue and a configuration for another remote are refused, each naming what is wrong. Tests `packages/codec/test/compose/composecatalogue.test.ts`, `packages/codec/test/compose/sequence.test.ts`, `packages/corpus/test/read/compatibility.test.ts`.
* **R7**, Harmony 700, met: A queue overflow, a configuration for another remote and a device past the model's count are each refused with what is wrong. Tests `packages/codec/test/container/queue.test.ts`, `packages/usb/test/transport/compatible.test.ts`, `packages/codec/test/compose/composecatalogue.test.ts`.
* **R7**, Harmony 300, met: A setup past the 300's four infrared groups is refused naming the group, and an oversized or broken container is refused. Tests `packages/codec/test/families/harmony-300-350/noscreenfromnothing.test.ts`, `packages/usb/test/file-protocol/filewrite.test.ts`.
* **R7**, Harmony 350, met: Builds and writes refuse a second activity, a bad key, too many favourites and an oversized file, naming each. Tests `packages/codec/test/families/fromrecipe.test.ts`, `packages/codec/test/families/harmony-300-350/noscreensetup.test.ts`, `packages/usb/test/file-protocol/filewrite.test.ts`.

## Devices and codes

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R9 Find a device in the catalogue by manufacturer, model number and type, with help for typing errors. | open | open | open | open | open | open | open | open | open |
| R10 Add a device from the catalogue with its commands, power and inputs, choosing the code set version where a device has several. | open | open | open | open | open | open | open | open | open |
| R11 Add a device the catalogue does not know, from its type and commands taught from its original remote, its definition saying it was learned. | open | open | open | open | open | open | unknown | open | open |
| R12 Rename a device. | open | open | open | open | open | open | open | open | open |
| R13 Remove a device, and say and settle what happens to the activities and favourites that used it. | open | open | open | open | open | open | open | open | met |
| R14 Set how a device is powered: one key or two, none, always on, kept on between activities, extra commands to power up, a power code that must be held. | open | open | open | open | open | open | open | open | open |
| R15 Set how a device changes inputs and which inputs it has. | open | open | open | open | open | open | open | open | open |
| R16 Set a device's delays, and put them back to their defaults. | open | open | open | open | open | open | open | open | open |
| R17 Set how many times a device's commands repeat. | open | open | open | open | open | open | open | open | open |
| R18 Set how a device tunes a channel number. | open | open | open | open | open | open | open | open | open |
| R19 Add, fix and remove a device's command, and put a fixed one back to its original code. | open | open | open | open | open | open | open | open | open |
| R20 Export and import codes as Pronto Hex. | met | met | met | met | met | met | met | met | met |

* **R13**, Harmony Touch, met: A receiver used by three activities was taken out with everything naming it; removing the favourites' tuning device is refused and said. Tests `packages/codec/test/families/harmony-touch/touch-removal.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-removal-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R20**, Harmony One, met: Codes are written and read as Pronto Hex, and malformed strings are refused, whatever the remote. Tests `packages/codec/test/infrared/pronto.test.ts`.
* **R20**, Harmony 600, met: Codes are written as Pronto Hex and read from it, and a written string reads back as the train that wrote it. Tests `packages/codec/test/infrared/pronto.test.ts`.
* **R20**, Harmony 650, met: Pronto Hex is both read and written, and a written string reads back as the pulse train that wrote it. Tests `packages/codec/test/infrared/pronto.test.ts`.
* **R20**, Harmony 700, met: The codec writes and reads Pronto Hex, refusing malformed strings, independent of the remote. Tests `packages/codec/test/infrared/pronto.test.ts`.
* **R20**, Harmony 525, met: Pronto Hex is read and written by the codec, whatever the remote. Tests `packages/codec/test/infrared/pronto.test.ts`.
* **R20**, Harmony 885, met: readPronto and writePronto read and write Pronto Hex and refuse malformed strings, whatever the remote. Tests `packages/codec/test/infrared/pronto.test.ts`.
* **R20**, Harmony 300, met: Pronto Hex strings are read and written, and malformed ones are refused. Tests `packages/codec/test/infrared/pronto.test.ts`.
* **R20**, Harmony 350, met: Codes are read from and written to Pronto Hex, the same for every model. Tests `packages/codec/test/infrared/pronto.test.ts`.
* **R20**, Harmony Touch, met: writePronto and readPronto export and import codes as Pronto Hex, the same for every model. Tests `packages/codec/test/infrared/pronto.test.ts`.

## Activities

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R21 Create an activity of a kind with its devices; starting, switching and Off behave as the manuals describe. | met | met | open | met | open | open | open | met | met |
| R22 Say which device does which job in an activity, and map its keys from that, a learned command with a standard name landing on its usual key. | open | open | open | open | open | open | open | open | open |
| R23 Set each device's input in an activity, or leave it alone. | met | met | open | open | open | open | open | met | met |
| R24 Include a pass through device in an activity. | open | open | open | open | open | open | open | open | met |
| R25 Rename an activity. | open | open | open | open | open | open | unknown | open | open |
| R26 Remove an activity. | open | open | open | open | open | open | open | open | met |
| R27 Give an activity an icon. | open | unknown | impossible | unknown | unknown | open | impossible | impossible | open |
| R28 Order the activity menu and an activity's device list. | open | open | open | open | open | open | impossible | impossible | open |
| R29 Choose which activities the activity keys start. | impossible | met | open | met | impossible | impossible | impossible | impossible | impossible |
| R30 Add steps to an activity's start and end: commands, pauses, a sequence. | open | open | open | open | open | open | open | open | met |

* **R21**, Harmony One, met: Typed activities are built, and on the spare starting, switching and Off sent exactly the codes the file predicted. Tests `packages/codec/test/families/harmony-one/oneactivity.test.ts`, `packages/codec/test/recipe/references.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#the-empty-configuration-and-the-setup-on-it`.
* **R21**, Harmony 600, met: Activities composed for the 600 started, switched and ended with All Off on it, every code as the file predicted. Tests `packages/codec/test/compose/compose.test.ts`; shown on a unit in `docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit`.
* **R21**, Harmony 700, met: Four activities of four kinds started, switched and ended with All Off on the 700, every decoded code as the file sends. Tests `packages/codec/test/compose/compose.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#the-configurations-run-on-it`.
* **R21**, Harmony 350, met: Watch TV built from a recipe started and stopped its devices on the unit; with one activity there is nothing to switch to. Tests `packages/codec/test/families/harmony-300-350/noscreenactivity.test.ts`, `packages/codec/test/recipe/references.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md`, `packages/codec/test/families/harmony-300-350/noscreenfinalunits.test.ts`.
* **R21**, Harmony Touch, met: An activity composed by us was listed, started, used, switched to Watch TV and back, and stopped by Off as its record states. Tests `packages/codec/test/families/harmony-touch/touch-activity-add.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-activity-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R23**, Harmony One, met: An activity sets each named device's input or leaves it alone, and the LG and Denon went to the inputs asked for. Tests `packages/codec/test/compose/inputs.test.ts`, `packages/codec/test/families/harmony-one/composecompare.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#the-empty-configuration-and-the-setup-on-it`.
* **R23**, Harmony 600, met: Each device's input in an activity, or none, is composed; the 600 sent the LG's HDMI 1 and the Denon's CBL/SAT. Tests `packages/codec/test/compose/inputs.test.ts`; shown on a unit in `docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit`.
* **R23**, Harmony 350, met: The recipe's input for each device in Watch TV is set, others left alone, and the receiver's input was heard. Tests `packages/codec/test/families/harmony-300-350/noscreenactivity.test.ts`, `packages/codec/test/families/harmony-300-350/noscreenfromnothing.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md`.
* **R23**, Harmony Touch, met: The activity of ours set the television to HDMI 2 and left the player's input alone, heard as composed. Tests `packages/codec/test/families/harmony-touch/touch-activity-add.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-activity-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R24**, Harmony Touch, met: The HDMI switch with no job in Switch Box is built as a pass through device and its power and input were heard. Tests `packages/codec/test/families/harmony-touch/touch-fromnothing.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-from-nothing-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R26**, Harmony Touch, met: Listen to Music was taken out with everything naming it, gone from the list, and the rest ran. Tests `packages/codec/test/families/harmony-touch/touch-removal.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-removal-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R27**, Harmony 650, impossible: The 650 draws no device or activity icons. `reference/remotes/harmony-650/display.md#what-the-screen-does-not-show`.
* **R27**, Harmony 300, impossible: The 300 has no screen, so an activity icon has nowhere to show. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R27**, Harmony 350, impossible: The 350 has no screen to show an icon on. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R28**, Harmony 300, impossible: With no screen and one activity there is no activity menu or device list to order. `reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity`.
* **R28**, Harmony 350, impossible: With one activity and no screen there is no activity menu or device list to order. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R29**, Harmony One, impossible: The One has one Activities key that opens the list and no keys that start an activity. `reference/remotes/harmony-one/keys.md#every-key-on-the-drawing`.
* **R29**, Harmony 600, met: Activities go on the activity keys by a stated choice; on the 600 Watch TV and Watch a Movie started theirs. Tests `packages/codec/test/families/harmony-600-650-700/activitykeys.test.ts`; shown on a unit in `docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit`.
* **R29**, Harmony 700, met: Activities went on the keys the recipe's choice names and started from them on the 700; an unused key showed the placeholder. Tests `packages/codec/test/families/harmony-600-650-700/activitykeys.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#the-configurations-run-on-it`.
* **R29**, Harmony 525, impossible: None of the 525's fifty keys is an activity key; activities start from a list opened by the Activities key. `reference/remotes/harmony-525/keys.md#every-key-on-the-drawing`.
* **R29**, Harmony 885, impossible: The 885's 55 keys have one Activities key and no activity keys; activities start from its menu. `reference/remotes/harmony-885/keys.md#harmony-885-skin-17`.
* **R29**, Harmony 300, impossible: The 300 holds one activity, started by its Watch TV key, so there is nothing to choose. `reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity`.
* **R29**, Harmony 350, impossible: The 350 holds one activity, always started by its Watch TV key. `reference/how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity`.
* **R29**, Harmony Touch, impossible: The Touch has no activity keys; its 27 keypad keys and two touch zones include none. `reference/remotes/harmony-touch/keys.md#every-key-on-the-drawing`.
* **R30**, Harmony Touch, met: A composed start pause and command and an end command were heard; a sequence is not a step kind a Touch activity holds. Tests `packages/codec/test/families/harmony-touch/touch-activity-add.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-activity-runs.test.ts`, `docs/test-notes/harmony-touch.md`.

## Keys and screens

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R31 Change what a key does in an activity: any command of its devices, a sequence, or nothing. | open | open | open | open | open | open | open | open | met |
| R32 Change what a key does for a device in device mode, any device's command included, such as the receiver's volume in TV mode. | open | open | open | open | open | open | open | open | open |
| R33 Give a device its device mode map from the catalogue, every key and screen page, as Logitech's software would. | open | open | open | met | open | open | open | open | open |
| R34 Put commands on an activity's screen, labelled and ordered, across pages. | open | open | open | open | open | open | impossible | impossible | met |
| R35 Put commands on a device's screen pages in device mode. | open | open | met | open | open | open | impossible | impossible | met |
| R36 A screen button that opens a page of the user's own commands, and a button back. | open | open | open | open | open | open | impossible | impossible | unknown |
| R37 Make a named sequence with pauses and put it on a key or the screen, within what the remote survives. | open | met | met | met | open | open | open | open | met |
| R38 Give a key a second command when held. | impossible | impossible | impossible | impossible | unknown | unknown | open | open | met |
| R39 Put devices on the device keys, a short and a long press each. | impossible | impossible | impossible | impossible | impossible | impossible | open | met | impossible |
| R40 Give an activity's touch gestures their commands. | unknown | impossible | impossible | impossible | impossible | impossible | impossible | impossible | open |
| R41 Show every screen as the remote will draw it, before writing. | open | open | open | open | open | open | impossible | impossible | open |
| R42 Choose the look of the screens: typeface, inks, colours, icons, background, theme, choices per screen. | open | open | open | open | open | open | impossible | impossible | open |
| R43 Draw the remote's face and know which key is which. | open | met | open | open | open | met | open | open | met |
| R44 Give every activity the remote's own help, the advanced help and its delay fixing included. | open | open | open | open | open | open | impossible | impossible | open |

* **R31**, Harmony Touch, met: Keys composed by us sent their devices' commands and sequences, heard on the unit, and keys left unbound sent nothing. Tests `packages/codec/test/families/harmony-touch/touch-activity-add.test.ts`, `packages/codec/test/families/harmony-touch/touch-setup.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-activity-runs.test.ts`, `packages/bench/test/harmony-touch/touch-setup-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R33**, Harmony 700, met: Device mode is laid out from the catalogue as Logitech's compiles do, and the receiver's pages and keys ran on the 700. Tests `packages/codec/test/families/harmony-600-650-700/devicemode.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#the-configurations-run-on-it`.
* **R34**, Harmony 300, impossible: The 300 has no screen. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R34**, Harmony 350, impossible: The 350 has no screen. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R34**, Harmony Touch, met: Four labelled entries composed for an activity showed in their order and each sent its command when tapped. Tests `packages/codec/test/families/harmony-touch/touch-activity-add.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-activity-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R35**, Harmony 650, met: Commands chosen for a composed device go on its device mode pages, and two composed devices sent from their pages. Tests `packages/codec/test/compose/composecatalogue.test.ts`; shown on a unit in `docs/test-notes/harmony-650.md#bench-runs`.
* **R35**, Harmony 300, impossible: The 300 has no screen, so device mode has no screen pages. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R35**, Harmony 350, impossible: The 350 has no screen. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R35**, Harmony Touch, met: A device of ours showed its eleven screen entries in order and its Power entry sent its own code. Tests `packages/codec/test/families/harmony-touch/touch-device-add.test.ts`, `packages/codec/test/families/harmony-touch/touch-compose.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-device-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R36**, Harmony 300, impossible: The 300 has no screen to hold a button or a page. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R36**, Harmony 350, impossible: The 350 has no screen. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R37**, Harmony 600, met: The Radio sequence, two commands with a 2 second pause, was sent from the 600's screen; an overflowing one is refused. Tests `packages/codec/test/compose/sequence.test.ts`, `packages/codec/test/container/queue.test.ts`; shown on a unit in `docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit`.
* **R37**, Harmony 650, met: A sequence with pauses is composed within the action queue, bound to a key, and heard with its pauses. Tests `packages/codec/test/compose/sequence.test.ts`; shown on a unit in `docs/test-notes/harmony-650.md#bench-runs`.
* **R37**, Harmony 700, met: Radio, the box's 1, a 2 second pause and its 2, on a screen button, was heard on the 700; overflow is refused. Tests `packages/codec/test/compose/sequence.test.ts`, `packages/codec/test/recipe/references.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#the-configurations-run-on-it`.
* **R37**, Harmony Touch, met: A sequence with a pause composed by us on a key and an entry was heard; the composer refuses one the remote would not run. Tests `packages/codec/test/families/harmony-touch/touch-setup.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-setup-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R38**, Harmony One, impossible: The One has no long press; a held key repeats its command. `reference/remotes/harmony-one/keys.md#what-pressing-or-holding-does`.
* **R38**, Harmony 600, impossible: The firmware tells no long press from a short one, and Logitech declares none for the 600. `reference/remotes/harmony-600/features.md#the-capability-fields`, `reference/architectures/harmony-600-650-700/README.md#keys`.
* **R38**, Harmony 650, impossible: The firmware raises press, repeat and release only, so no key has a held action. `reference/remotes/harmony-650/keys.md#what-pressing-a-key-raises`.
* **R38**, Harmony 700, impossible: The 700 has no long press, by Logitech's service. `reference/remotes/harmony-700/README.md#key-numbers`.
* **R38**, Harmony Touch, met: Long presses composed by us were held in every activity and device test and sent their second commands. Tests `packages/codec/test/families/harmony-touch/touch-setup.test.ts`, `packages/codec/test/families/harmony-touch/touch-compose.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-setup-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R39**, Harmony One, impossible: The One has no device keys; a device is picked from the list the Devices key opens. `reference/remotes/harmony-one/keys.md#every-key-on-the-drawing`.
* **R39**, Harmony 600, impossible: The 600 has no device keys; a device is chosen from a list under the centre key. `reference/remotes/harmony-600/behaviour.md#device-mode-in-and-out`.
* **R39**, Harmony 650, impossible: The 650 has no device keys and no long press. `reference/remotes/harmony-650/keys.md#what-pressing-a-key-raises`.
* **R39**, Harmony 700, impossible: The 700 has no device keys; device mode is a list opened by the centre key below the screen. `reference/remotes/harmony-700/behaviour.md#device-mode-in-and-out`.
* **R39**, Harmony 525, impossible: The 525 has no device keys; its Devices key opens a list. `reference/remotes/harmony-525/keys.md#every-key-on-the-drawing`.
* **R39**, Harmony 885, impossible: The 885 has one Device key and a device list, and no device keys. `reference/remotes/harmony-885/keys.md#harmony-885-skin-17`.
* **R39**, Harmony 350, met: Eight devices on the four device keys, short and long, were each heard selected on the unit. Tests `packages/codec/test/families/harmony-300-350/noscreen.test.ts`, `packages/codec/test/recipe/references.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md`, `packages/codec/test/families/harmony-300-350/noscreenfinalunits.test.ts`.
* **R39**, Harmony Touch, impossible: The Touch has no device keys; its keys and touch zones list none. `reference/remotes/harmony-touch/keys.md#every-key-on-the-drawing`.
* **R40**, Harmony 600, impossible: The 600 has no touch panel. `reference/remotes/harmony-600/display.md#the-panel`.
* **R40**, Harmony 650, impossible: The 650's screen has no touch, so there are no gestures. `reference/remotes/harmony-650/display.md#the-panel`.
* **R40**, Harmony 700, impossible: The 700's screen has no touch panel, so there are no gestures. `reference/remotes/harmony-700/display.md#the-panel`.
* **R40**, Harmony 525, impossible: The 525's screen is not a touch screen. `reference/remotes/harmony-525/display.md#the-panel`.
* **R40**, Harmony 885, impossible: The 885's screen is not a touch screen, so there are no gestures. `reference/remotes/harmony-885/display.md#the-panel`.
* **R40**, Harmony 300, impossible: The 300 has no screen and so no touch gestures. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R40**, Harmony 350, impossible: The 350 has no screen, so no touch gestures. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R41**, Harmony 300, impossible: The 300 has no screen to draw. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R41**, Harmony 350, impossible: The 350 has no screen to draw. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R42**, Harmony 300, impossible: The 300 has no screen, so there is no look to choose. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R42**, Harmony 350, impossible: The 350 has no screen. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R43**, Harmony 600, met: The 600 is drawn with its 54 keys, each named and carrying its scan code, checked against keys pressed on a unit. Tests `packages/silhouettes/test/models.test.ts`, `tests/harmony_600_650_700/test_keypad.py`.
* **R43**, Harmony 885, met: The 885's face is drawn, and every key carries the scan code measured on the units. Tests `tests/firmware/test_silhouettes.py`, `packages/silhouettes/test/models.test.ts`.
* **R43**, Harmony Touch, met: The Touch's face is drawn with all 29 keys and each key is addressable by name. Tests `packages/silhouettes/test/models.test.ts`, `packages/silhouettes/test/svg.test.ts`.
* **R44**, Harmony 300, impossible: The 300 has no Help key and no screen, so the remote's help cannot run. `reference/remotes/harmony-300/keys.md#european-printing-skin-79`.
* **R44**, Harmony 350, impossible: The 350 has no Help key and no screen to ask its questions on. `reference/remotes/harmony-350/keys.md#every-key-on-the-drawing`.

## Favourites

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R45 Favourite channels: the number kept as text, a name, on keys or screen pages, ordered and removed. | open | open | open | open | unknown | open | open | open | open |
| R46 A favourite with an icon. | open | open | open | unknown | unknown | open | impossible | impossible | met |

* **R46**, Harmony 300, impossible: The 300 has no screen to show a favourite's icon. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R46**, Harmony 350, impossible: The 350 has no screen to show a favourite's icon. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R46**, Harmony Touch, met: A logo drawn by us was stored and shown on its favourite's tile. Tests `packages/codec/test/families/harmony-touch/touch-favourites.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-favourites-runs.test.ts`, `docs/test-notes/harmony-touch.md`.

## Settings

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R47 Read and change the remote's own settings as far as the model offers them, the touch sound and the tutorial after the first write among them, and put them back to defaults. | open | open | open | open | open | open | unknown | unknown | open |
| R48 How long the screen stays lit, and its brightness. | open | open | open | open | open | open | impossible | impossible | met |
| R49 The motion sensor on or off. | unknown | open | open | open | unknown | open | unknown | unknown | unknown |
| R50 The Remote Assistant and the "Starting Activity" message on or off. | open | open | open | open | open | open | impossible | impossible | unknown |
| R51 The kind of help, Smart or Full. | open | unknown | unknown | unknown | open | open | impossible | impossible | unknown |
| R52 The clock: the right time, how it is shown, and read back. | open | open | open | open | unknown | open | impossible | unknown | open |
| R53 A slideshow of the user's pictures. | open | unknown | unknown | unknown | unknown | open | impossible | impossible | unknown |

* **R48**, Harmony 300, impossible: The 300 has no screen to light or dim. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R48**, Harmony 350, impossible: The 350 has no screen to light. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R48**, Harmony Touch, met: Brightness 20 and a 30 second timeout composed by us dimmed the screen and timed about 30 seconds. Tests `packages/codec/test/families/harmony-touch/touch-settings.test.ts`; shown on a unit in `packages/corpus/test/touch/touch-settings-runs.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R50**, Harmony 300, impossible: Both are screen messages, and the 300 has no screen. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R50**, Harmony 350, impossible: The 350 has no screen to show the message on. `reference/remotes/harmony-350/display.md#harmony-350-display`.
* **R51**, Harmony 300, impossible: The 300 has no Help key and no screen, so there is no kind of help to pick. `reference/remotes/harmony-300/keys.md#european-printing-skin-79`.
* **R51**, Harmony 350, impossible: The 350 has no Help key and no screen, so there is no kind of help to choose. `reference/remotes/harmony-350/keys.md#every-key-on-the-drawing`.
* **R52**, Harmony 300, impossible: Nothing on a 300 can show a clock, and its firmware never moves the hour. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R53**, Harmony 300, impossible: The 300 has no screen for pictures. `reference/remotes/harmony-300/display.md#harmony-300-display`.
* **R53**, Harmony 350, impossible: The 350 has no screen. `reference/remotes/harmony-350/display.md#harmony-350-display`.

## Learning

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R54 Learn an infrared command from the original remote through the Harmony's own receiver. | open | open | open | open | open | open | unknown | unknown | open |
| R55 Use a learned code in a device, on any key or screen button, input commands included. | open | open | open | open | open | open | open | open | open |
| R56 Recognise a learned code as a known kind and keep it compactly, or as captured when it is not. | open | open | open | open | open | open | open | open | met |
| R57 Identify a device the catalogue does not recognise from a few taught commands. | open | open | open | open | open | open | open | open | open |

* **R56**, Harmony Touch, met: A learned code is recognised as its family and value, or kept as its raw capture when it fits none. Tests `packages/codec/test/families/harmony-touch/touch-learned.test.ts`.

## Backup and restore

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R58 Back up a remote whole and keep it on the computer. | met | met | met | met | met | met | met | met | open |
| R59 Put a backup back on the same remote. | open | met | met | met | open | met | met | met | met |
| R60 Move a setup to another remote or model, or copy devices and activities from one setup into another, adapted to the target's limits. | open | open | open | open | open | open | open | open | open |
| R61 Clear a remote's setup so it starts fresh, by writing an empty configuration, never through the firmware's own reset. | met | met | open | met | open | open | open | met | met |

* **R58**, Harmony One, met: The configuration is read whole and filed on the computer, and the spare's stored copies match the remote. Tests `packages/corpus/test/read/read.test.ts`, `packages/corpus/test/read/file.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#every-bench-remote-checked-against-its-own-backups`.
* **R58**, Harmony 600, met: Reads and region reads are filed to disk; the 600's whole flash was backed up and reads back as that backup. Tests `packages/corpus/test/read/file.test.ts`, `tests/harmony_600_650_700/test_arch14_write_target.py`; shown on a unit in `docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit`.
* **R58**, Harmony 650, met: The whole configuration and flash are read off the 650 and filed on the computer. Tests `packages/corpus/test/read/file.test.ts`, `packages/corpus/test/read/read.test.ts`; shown on a unit in `docs/test-notes/harmony-650.md#memory-as-read`.
* **R58**, Harmony 700, met: The unit's configuration region, external flash and both internal pages were read and kept on the computer. Tests `packages/corpus/test/read/file.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#arrival-and-repair`.
* **R58**, Harmony 525, met: The unit's configuration region, firmware images, internal flash and EEPROM were read and filed on the computer. Tests `packages/corpus/test/read/file.test.ts`, `tests/harmony_5xx/test_harmony_525_region.py`; shown on a unit in `docs/test-notes/harmony-525.md#what-has-been-done-over-usb-in-sum`.
* **R58**, Harmony 885, met: Each unit's configuration and whole flash were read twice and kept, and the two copies are identical. Tests `packages/corpus/test/read/read.test.ts`, `tests/harmony_880_885/test_harmony_885_flash_backup.py`; shown on a unit in `docs/test-notes/harmony-885.md#7-november-2026-unit-as-whole-flash-and-the-first-write-to-a-harmony-885`.
* **R58**, Harmony 300, met: Every readable file, the configuration among them, was read off the unit twice with identical results. Tests `packages/usb/test/file-protocol/filepipe.test.ts`; shown on a unit in `docs/test-notes/harmony-300.md`.
* **R58**, Harmony 350, met: Every readable file, the configuration among them, was read off the unit twice, identical, and kept. Tests `packages/usb/test/file-protocol/filepipe.test.ts`, `packages/usb/test/file-protocol/filewrite.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md#what-has-been-read-off-it`.
* **R59**, Harmony 600, met: The 600's original configuration was written back after a change, and the region then read as the backup. Tests `tests/harmony_600_650_700/test_arch14_write_target.py`; shown on a unit in `docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit`.
* **R59**, Harmony 650, met: The earlier configuration was written back onto the same 650 and read back. Tests `packages/corpus/test/write/write-config-run.test.ts`; shown on a unit in `docs/test-notes/harmony-650.md#what-has-been-sent-to-this-unit`.
* **R59**, Harmony 700, met: The unit's own earlier configuration, Logitech's, was written back and read back byte for byte, and ran. Tests `packages/corpus/test/write/write-config-run.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#the-configurations-run-on-it`.
* **R59**, Harmony 885, met: Unit B's own backed up configuration went back onto it, and the remote holds it byte for byte. Tests `packages/corpus/test/write/write-config-run.test.ts`, `tests/harmony_880_885/test_harmony_885_first_config_write.py`; shown on a unit in `docs/test-notes/harmony-885.md#7-november-2026-the-first-whole-configuration-unit-bs-own-restarted`.
* **R59**, Harmony 300, met: The unit's own backup, as read, went back with its end marker restored, verified, and ran. Tests `packages/usb/test/file-protocol/file-family-run.test.ts`; shown on a unit in `docs/test-notes/harmony-300.md`.
* **R59**, Harmony 350, met: The unit's own backed up configuration was written back, verified, and the remote ran it. Tests `packages/usb/test/file-protocol/filewrite.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md`.
* **R59**, Harmony Touch, met: The remote's own six documents held by the app were delivered back and committed, and the remote ran normally. Tests `packages/corpus/test/touch/touch-answer.test.ts`, `packages/corpus/test/touch/touch-sync.test.ts`; shown on a unit in `packages/usb/test/touch/touch-own-set-sync.test.ts`, `docs/test-notes/harmony-touch.md`.
* **R61**, Harmony One, met: An empty recipe builds the empty One, which was written to the spare and started with no activity. Tests `packages/codec/test/families/fromrecipe.test.ts`, `packages/codec/test/recipe/references.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#the-empty-configuration-and-the-setup-on-it`.
* **R61**, Harmony 600, met: The empty 600 configuration, no device or activity, builds from a recipe and was written to the 600 and run. Tests `packages/codec/test/families/harmony-600-650-700/empty.test.ts`, `packages/codec/test/recipe/references.test.ts`; shown on a unit in `docs/test-notes/harmony-600.md#what-has-been-sent-to-this-unit`.
* **R61**, Harmony 700, met: An empty configuration built from nothing was written to the 700 and it started with no device or activity. Tests `packages/codec/test/recipe/references.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#the-configurations-run-on-it`.
* **R61**, Harmony 350, met: The empty configuration was written to the unit, read back identical, and the remote then sent nothing. Tests `packages/codec/test/families/harmony-300-350/noscreenempty.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md`, `packages/codec/test/families/harmony-300-350/noscreenemptyunit.test.ts`.
* **R61**, Harmony Touch, met: A configuration with no device and no activity was committed and the remote started on it with its empty pages. Tests `packages/codec/test/families/harmony-touch/touch-empty.test.ts`; shown on a unit in `packages/bench/test/harmony-touch/touch-empty-runs.test.ts`, `docs/test-notes/harmony-touch.md`.

## Status and identity

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R62 Find the attached remotes and their models without claiming them. | met | open | open | open | met | met | met | open | open |
| R63 Tell one unit from another, and say when the wrong one is connected. | met | met | met | met | met | met | open | met | open |
| R64 The firmware version and hardware details. | met | met | met | open | met | met | met | open | met |
| R65 The battery level, and a warning or refusal before a write when it is low. | open | open | open | open | unknown | unknown | unknown | unknown | open |
| R66 Progress during a read or a write, and the remote showing it is being written. | open | open | open | open | open | open | open | open | open |
| R67 Show live which key is pressed on a connected remote. | impossible | open | open | open | unknown | met | unknown | unknown | unknown |
| R68 A report about a remote this project does not support, which its owner can publish. | open | open | open | open | open | open | open | open | open |

* **R62**, Harmony One, met: Attached remotes are listed and named by vendor, product and skin without opening them, and the bench Ones enumerate. Tests `packages/usb/test/transport/remote.test.ts`, `packages/usb/test/transport/hardware.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#telling-the-two-ones-apart`.
* **R62**, Harmony 525, met: Product id 0xC111 is recognised as a Harmony, and skin 22 from its bcdDevice names the 525, as the unit reported. Tests `packages/usb/test/transport/remote.test.ts`, `packages/base/test/models.test.ts`; shown on a unit in `docs/test-notes/harmony-525.md#the-first-session-8-august-2026`.
* **R62**, Harmony 885, met: Product 0xC110 is listed as a Harmony, and bcdDevice 0x0811 names skin 17, as enumerated on a unit. Tests `packages/usb/test/transport/remote.test.ts`, `tests/usb_protocol/test_usbdesc.py`; shown on a unit in `docs/test-notes/harmony-885.md#the-first-unit-h885_a`.
* **R62**, Harmony 300, met: The family is listed without being opened, and the descriptor read off the unit names a Harmony 300. Tests `packages/usb/test/transport/remote.test.ts`, `packages/usb/test/package/surface.test.ts`; shown on a unit in `docs/test-notes/harmony-300.md#the-unit`.
* **R63**, Harmony One, met: Units are told apart by the identity block's two GUIDs, and a write to the wrong One is refused. Tests `packages/usb/test/transport/identity.test.ts`, `packages/corpus/test/write/write-config-run.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#telling-the-two-ones-apart`.
* **R63**, Harmony 600, met: The identity block's two GUIDs tell the 600 from the 650, which shares its ids; every 600 write matched its record first. Tests `packages/usb/test/transport/identity.test.ts`, `tests/harmony_600_650_700/test_arch14_write_target.py`; shown on a unit in `docs/test-notes/harmony-600.md#the-bench-600s-memory-as-read`.
* **R63**, Harmony 650, met: The unit is told apart by its two identity GUIDs, recorded for the bench 650, and another unit is refused. Tests `packages/usb/test/transport/identity.test.ts`, `packages/corpus/test/write/write-config-run.test.ts`; shown on a unit in `docs/test-notes/harmony-650.md#the-unit`.
* **R63**, Harmony 700, met: The unit is told apart by its identity block, matched to its record before every write; a wrong label is refused. Tests `packages/usb/test/transport/identity.test.ts`, `tests/harmony_600_650_700/test_arch14_write_target.py`, `packages/corpus/test/write/write-config-run.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#what-was-sent-to-the-unit`.
* **R63**, Harmony 525, met: The 525's identity block is read from EEPROM and units are compared by their two GUIDs, so a different unit does not match. Tests `packages/usb/test/transport/identity.test.ts`; shown on a unit in `docs/test-notes/harmony-525.md#what-has-been-done-over-usb-in-sum`.
* **R63**, Harmony 885, met: Each unit is named by its identity block, and unit B was refused when unit A was expected. Tests `packages/usb/test/transport/identity.test.ts`, `packages/corpus/test/write/write-config-run.test.ts`; shown on a unit in `docs/test-notes/harmony-885.md#7-november-2026-unit-as-whole-flash-and-the-first-write-to-a-harmony-885`.
* **R63**, Harmony 350, met: The writer checks the unit's own identity file against its record and refuses another unit. Tests `packages/usb/test/file-protocol/filewrite.test.ts`, `packages/usb/test/file-protocol/file-family-run.test.ts`; shown on a unit in `docs/test-notes/harmony-350.md`.
* **R64**, Harmony One, met: The version block gives firmware, hardware and architecture, and the spare's firmware matched the archived package. Tests `packages/usb/test/transport/remote.test.ts`, `packages/usb/test/transport/hardware.test.ts`; shown on a unit in `docs/test-notes/harmony-one.md#every-bench-remote-checked-against-its-own-backups`.
* **R64**, Harmony 600, met: The version block gives firmware, hardware version, skin and flash id, read off the 600 by the FHSDK. Tests `packages/usb/test/transport/protocol.test.ts`, `packages/bench/test/instrument/bench.test.ts`; shown on a unit in `docs/test-notes/harmony-600.md#measured-against-two-bench-remotes`.
* **R64**, Harmony 650, met: The version block is read off the 650: firmware, hardware and software type. Tests `packages/usb/test/transport/remote.test.ts`, `packages/usb/test/transport/protocol.test.ts`; shown on a unit in `docs/test-notes/harmony-650.md#the-unit`.
* **R64**, Harmony 525, met: The 525's seven field version block decodes to firmware, board, flash id, architecture and skin, matching the unit's reply. Tests `packages/usb/test/transport/protocol.test.ts`, `packages/usb/test/transport/remote.test.ts`; shown on a unit in `docs/test-notes/harmony-525.md#the-first-session-8-august-2026`.
* **R64**, Harmony 885, met: The version block read through the library gives firmware 4.4, hardware 2.1, the skin and the flash ids, on both units. Tests `tests/harmony_880_885/test_arch8_usb.py`; shown on a unit in `docs/test-notes/harmony-885.md#the-first-unit-h885_a`.
* **R64**, Harmony 300, met: The identity file gives architecture, skin and firmware version, and the unit reported its firmware and skin. Tests `packages/usb/test/file-protocol/filepipe.test.ts`; shown on a unit in `docs/test-notes/harmony-300.md#its-three-firmware-images-read-and-compared-with-the-350s`.
* **R64**, Harmony Touch, met: The identity file read on the unit gave its firmware version, architecture, skin and hardware version. Tests `packages/usb/test/file-protocol/filepipe.test.ts`; shown on a unit in `docs/test-notes/harmony-touch.md`.
* **R67**, Harmony One, impossible: On the cable the One's keypad handler stops, so a key press cannot be watched live. `reference/remotes/harmony-one/behaviour.md#on-the-cable`.
* **R67**, Harmony 885, met: The held key and the last key pressed are polled over USB, and every key was mapped that way on a unit. Tests `packages/usb/test/transport/watch-keys.test.ts`, `tests/harmony_880_885/test_harmony_885_keys.py`; shown on a unit in `docs/test-notes/harmony-885.md#5-november-2026-every-key-pressed-watched-over-usb`.

## Firmware

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R69 Know the firmware state: running, safe mode or bootloader, and whether a newer version exists. | open | open | open | open | open | open | open | open | open |
| R70 Install Logitech's own unmodified firmware, from a file the user has or from Logitech's update service; the 600, 650 and 700 only, by decision 18. | impossible | open | open | met | impossible | impossible | impossible | impossible | impossible |
| R71 Bring a stuck remote back. | open | open | open | met | open | open | open | open | met |

* **R70**, Harmony One, impossible: Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here. `docs/decisions.md#d18`.
* **R70**, Harmony 700, met: Logitech's 2.8 image, from a file, was staged and installed on the unit; fetching it from the update service is in no library. Tests `packages/usb/test/write/firmware.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#arrival-and-repair`.
* **R70**, Harmony 525, impossible: Logitech publishes no firmware package for the 525, and decision 18 allows the install on the 600, 650 and 700 only. `reference/remotes/harmony-525/firmware.md#harmony-525-firmware`.
* **R70**, Harmony 885, impossible: Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here. `docs/decisions.md#d18`.
* **R70**, Harmony 300, impossible: Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here. `docs/decisions.md#d18`.
* **R70**, Harmony 350, impossible: Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here. `docs/decisions.md#d18`.
* **R70**, Harmony Touch, impossible: Decision 18 allows the firmware install on the Harmony 600, 650 and 700 alone, so the FHSDK never installs firmware here. `docs/decisions.md#d18`.
* **R71**, Harmony 700, met: The unit arrived stuck in safe mode and was repaired by asking it to reinstall its staged application. Tests `packages/usb/test/write/firmware.test.ts`; shown on a unit in `docs/test-notes/harmony-700.md#arrival-and-repair`.
* **R71**, Harmony Touch, met: A sync left running was recovered on the unit by abort and restart, and the remote started normally. Tests `packages/usb/test/touch/touchsession.test.ts`, `tests/harmony_touch/test_harmony_touch_recovery.py`; shown on a unit in `packages/usb/test/touch/touch-first-sync.test.ts`, `docs/test-notes/harmony-touch.md`.

## Logitech's service

| requirement | One | 600 | 650 | 700 | 525 | 885 | 300 | 350 | Touch |
|---|---|---|---|---|---|---|---|---|---|
| R72 Import devices and activities from the user's own Logitech account, if they ask and give their own credentials; the app works the same without it. | open | open | open | open | impossible | impossible | open | open | open |

* **R72**, Harmony 525, impossible: Logitech's service has the 525 switched off and compiles nothing for it. `reference/remotes/harmony-525/features.md#logitechs-service-has-the-product-switched-off`.
* **R72**, Harmony 885, impossible: Logitech's service has the 885's skins switched off and refuses its serial, so it serves no 885 account. `reference/remotes/harmony-885/features.md#logitechs-service`.

## The FHSDK as a whole

| requirement | every model |
|---|---|
| R73 Everything works offline, with no account. | met |
| R74 Reading and building run in a browser or an app window, the USB half in the app's main process. | met |
| R75 An app depends on published packages, not on a checkout beside it. | open |

* **R73**, every model, met: A recipe that carries its codes builds with no archive, and the only client of Logitech's service is reached by no entry, so nothing an application loads needs a network or an account. Tests `packages/codec/test/catalogue/carried.test.ts`, `packages/lab/test/dependencies.test.ts`.
* **R74**, every model, met: The codec's three entries and the base load with no Node module, and the main entry reads every family with no resource supplied; the USB half is Node's. Tests `packages/codec/test/package/mainentry.test.ts`, `packages/codec/test/package/mainentryreads.test.ts`, `packages/base/test/base.test.ts`.
