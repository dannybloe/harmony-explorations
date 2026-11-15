# The FHSDK's requirements, per remote

<!-- introduction -->
What the FHSDK must be able to do for an application such as FreeHarmony, and how far each bench model has it.
[Decision 33](decisions.md#d33) is the rule this rests on, and [plan 015](plans/015-requirements-and-capabilities.md)
how it was decided; R76 to R88 came with [plan 017](plans/017-contracts-first.md).

**A requirement** is one ability an application gets from the FHSDK, stated as what the application can do for its
user: read a configuration off the remote, add a device from the catalogue, learn a code. It is not an implementation
step and not a screen of any application. Each has a number, `R1` onwards, that is **never renumbered and never
reused**: a requirement that is dropped stays in the list, marked withdrawn. Open work in code and tests points at a
requirement by its number, never at a todo.

**A status** says, per bench model, where the requirement stands:

* **met**, which the tables call proven: in the FHSDK, shown by a test in this repository, and, for anything that
  shows on a remote, shown working on a bench unit of that model, by a bench test or a passage of the model's test
  notes in `docs/test-notes/`. A build that passes every test and never ran on the remote is open.
* **open**: the model can plainly do it and the FHSDK does not yet, or does it without that evidence. An open status
  says whose work is missing, below.
* **impossible**: the model cannot, by its hardware or firmware, and a page of `reference/` says so; or this project
  does not do it on that model by a decision, which is then the evidence, as the firmware install is the Harmony 600,
  650 and 700's alone by decision 18.
* **unknown**: it is not known whether the model can. It counts as open.

An application offers a feature where it is met; the other statuses are for a developer. The hub's own
requirements, R84 to R88, are impossible on every model that is not a hub, by [decision 40](decisions.md#d40).

**Which requirements are a remote's, and which are the FHSDK's as a whole.** An application never changes a
configuration in place. It changes a recipe, the document of one remote, hands the whole recipe over, and the FHSDK
builds and writes it in one go. So an ability that only changes what a recipe says, or only asks the catalogue, is the
same for every model and has one status for all of them; what is a model's is what its family builds from the recipe
and what the remote then does. The requirements of two subjects are the FHSDK's as a whole, how it is delivered and
what an application builds on, and so are seven listed under other subjects: finding a device, R9; renaming a device
or an activity, R12 and R25; Pronto Hex, R20; identifying a device from taught codes, R57; moving a setup between
models, R60; and the report about a remote this project does not support, R68. They are on no remote's checklist.
Removing a device or an activity, R13 and R26, is the same kind of ability and stays a model's only because the
Harmony Touch has it proven on a unit, on the documents it is given; everywhere else it waits on the shared function.

**What an open status waits on.** Open covers work of four different owners, and each open status names its own:

* **the FHSDK**: something missing for every model alike, a thing a recipe cannot state or a function nobody has.
  It is done once, in `todo.md`'s chapters, and no remote's own work brings it closer.
* **its family**: the reader, the builder or the protocol of the model's family, or the absence of a family.
* **the remote itself**: a fact to find out on this model, its write path, its record, a behaviour not explained.
* **a run on a unit**, named only when it stands alone: everything is built and tested, and the model's bench unit
  has not shown it.

A status names every owner its written reason names, so most open requirements of a model no family serves wait on
both the FHSDK and a family. It is read off the reason as written and judged no further: it says where work is known
to be missing, not that nothing else will turn up once that is done. The second table below counts each remote's open
requirements by it, and a checklist says it per box.

**Where two requirements touch, the line is this.** R7 is a model's own limits, what its builder and its writer
refuse; R78 is the form a check takes for an application, every problem as a list without building. R66 is what a
model's read and write report and what the remote itself shows meanwhile; R79 is the one function that carries that to
an application as events. R9 is the search in the catalogue; R82 is the same question asked of every source at once.
R12, R25, R13 and R26 are abilities an application has; R76 is the functions it has them through.

**A met is proven by the test, never written down.** A test that shows a requirement says so itself, with a line
inside it naming the requirement, the models it proves it for and, where the requirement shows on a remote, the bench
run or the passage of the test notes that shows it on a unit: `proves(1, ['harmony-650'], [...])`, from
`@harmony/testkit/proof` in TypeScript and `tests/proves.py` in Python. A model's met is derived from those lines, so a
test rewritten to show something else takes its proof with it. Only open, unknown and impossible are written by hand,
each with its reason, in `packages/base/src/requirements.ts`; a requirement on a model is proven or written, never
both. An application reads statuses at run time and cannot read test sources, so the proofs are generated into
`packages/base/src/proofs.ts`, which the codec's `capabilitiesOf` answers from together with the model's properties.

**This document is generated**, but for this introduction: one table of where each remote stands, one of what its
open requirements wait on, and the requirements by subject. What each status rests on, the proving tests by file and title and the reasons for the rest,
is [the evidence](remote-requirements-evidence.md), and each bench remote's requirements as a checklist are its file in
`todo/`, both generated too. After a proof is added to a test or a status changed, run `make requirements-write`;
`make requirements` fails while any of these files, or the proofs module, differs from what the sources give.
<!-- /introduction -->

<!-- Generated by make requirements-write from packages/base/src/requirements.ts and the proofs in the tests. Change those, not what follows. -->

## Where each remote stands

Over the 74 requirements that have a status per model. Possible is every one but the impossible ones; the evidence behind each status is [the evidence](remote-requirements-evidence.md), and each remote's list of them its checklist.

| remote | proven | open | unknown | impossible | proven of possible | checklist |
|---|---|---|---|---|---|---|
| Harmony One | 13 | 48 | 3 | 10 | 13 of 64 | [todo-harmony-one.md](../todo/todo-harmony-one.md) |
| Harmony 600 | 15 | 47 | 4 | 8 | 15 of 66 | [todo-harmony-600.md](../todo/todo-harmony-600.md) |
| Harmony 650 | 10 | 52 | 3 | 9 | 10 of 65 | [todo-harmony-650.md](../todo/todo-harmony-650.md) |
| Harmony 700 | 13 | 48 | 5 | 8 | 13 of 66 | [todo-harmony-700.md](../todo/todo-harmony-700.md) |
| Harmony 525 | 6 | 48 | 10 | 10 | 6 of 64 | [todo-harmony-525.md](../todo/todo-harmony-525.md) |
| Harmony 515 | 4 | 50 | 12 | 8 | 4 of 66 | [todo-harmony-515.md](../todo/todo-harmony-515.md) |
| Harmony 885 | 9 | 51 | 4 | 10 | 9 of 64 | [todo-harmony-885.md](../todo/todo-harmony-885.md) |
| Harmony 785 | 3 | 57 | 8 | 6 | 3 of 68 | [todo-harmony-785.md](../todo/todo-harmony-785.md) |
| Harmony 300 | 6 | 38 | 7 | 23 | 6 of 51 | [todo-harmony-300.md](../todo/todo-harmony-300.md) |
| Harmony 350 | 11 | 35 | 6 | 22 | 11 of 52 | [todo-harmony-350.md](../todo/todo-harmony-350.md) |
| Harmony Touch | 22 | 38 | 6 | 8 | 22 of 66 | [todo-harmony-touch.md](../todo/todo-harmony-touch.md) |
| Harmony Elite | 0 | 59 | 9 | 6 | 0 of 68 | [todo-harmony-elite.md](../todo/todo-harmony-elite.md) |
| Harmony Hub | 0 | 52 | 14 | 8 | 0 of 66 | [todo-harmony-hub.md](../todo/todo-harmony-hub.md) |

## What the open ones wait on

Each remote's open requirements by whose work is missing, every one counted once: those that need work on the remote itself or in its family, whatever else they wait on; those that wait only on something the FHSDK does once for every remote; and those where everything is built and tested and only a run on a unit of the model is missing.

| remote | open | its own or its family's work | the FHSDK's work alone | a run on a unit alone |
|---|---|---|---|---|
| Harmony One | 48 | 28 | 16 | 4 |
| Harmony 600 | 47 | 24 | 18 | 5 |
| Harmony 650 | 52 | 24 | 19 | 9 |
| Harmony 700 | 48 | 23 | 19 | 6 |
| Harmony 525 | 48 | 46 | 2 | 0 |
| Harmony 515 | 50 | 49 | 1 | 0 |
| Harmony 885 | 51 | 45 | 5 | 1 |
| Harmony 785 | 57 | 55 | 1 | 1 |
| Harmony 300 | 38 | 20 | 16 | 2 |
| Harmony 350 | 35 | 19 | 16 | 0 |
| Harmony Touch | 38 | 19 | 8 | 11 |
| Harmony Elite | 59 | 57 | 1 | 1 |
| Harmony Hub | 52 | 49 | 2 | 1 |

The 17 requirements of the FHSDK as a whole carry one status each, for every remote: R9 open, R12 proven, R20 proven, R25 proven, R57 open, R60 open, R68 open, R73 proven, R74 proven, R75 open, R76 open, R77 open, R78 open, R79 open, R80 proven, R81 open, R82 open.

## The requirements

### The whole configuration

* **R1** Read the configuration off the remote, whole and checked.
* **R2** Understand a configuration: its devices, activities, keys, screens, delays and codes, and what each key will send.
* **R3** Read a configuration back into a recipe, so a setup can be edited and rebuilt; from our own builds whole, favourites included, through a record of ours carried inside.
* **R4** Build a whole configuration from a recipe.
* **R5** Write a configuration to the remote, verified by reading it back, and the remote runs it.
* **R6** Write the user's own remote: take a remote never seen, record its identity and a full backup, and from then on write to that unit only.
* **R7** Refuse a configuration that does not fit the model or would be mishandled, and say what is over.
* **R8** Detect changes made on the remote since the app last wrote it, the help's own delay fixes among them, and keep or discard them.

### Devices and codes

* **R9** Find a device in the catalogue by manufacturer, model number and type, with help for typing errors.
* **R10** Add a device from the catalogue with its commands, power and inputs, choosing the code set version where a device has several.
* **R11** Add a device the catalogue does not know, from its type and commands taught from its original remote, its definition saying it was learned.
* **R12** Rename a device.
* **R13** Remove a device, and say and settle what happens to the activities and favourites that used it.
* **R14** Set how a device is powered: one key or two, none, always on, kept on between activities, extra commands to power up, a power code that must be held.
* **R15** Set how a device changes inputs and which inputs it has.
* **R16** Set a device's delays, and put them back to their defaults.
* **R17** Set how many times a device's commands repeat.
* **R18** Set how a device tunes a channel number.
* **R19** Add, fix and remove a device's command, and put a fixed one back to its original code.
* **R20** Export and import codes as Pronto Hex.
* **R89** Tune one command of a device: how many times a press sends it, how long a held key waits before it repeats and how fast it then repeats, kept in the document and never replaced by the catalogue's value.

### Activities

* **R21** Create an activity of a kind with its devices; starting, switching and Off behave as the manuals describe.
* **R22** Say which device does which job in an activity, and map its keys from that, a learned command with a standard name landing on its usual key.
* **R23** Set each device's input in an activity, or leave it alone.
* **R24** Include a pass through device in an activity.
* **R25** Rename an activity.
* **R26** Remove an activity.
* **R27** Give an activity an icon.
* **R28** Order the activity menu and an activity's device list.
* **R29** Choose which activities the activity keys start.
* **R30** Add steps to an activity's start and end: commands, pauses, a sequence.
* **R90** Choose the order in which an activity switches its devices on and off.
* **R91** Choose the screen an activity opens on, where the remote has more than one.

### Keys and screens

* **R31** Change what a key does in an activity: any command of its devices, a sequence, or nothing.
* **R32** Change what a key does for a device in device mode, any device's command included, such as the receiver's volume in TV mode.
* **R33** Give a device its device mode map from the catalogue, every key and screen page, as Logitech's software would.
* **R34** Put commands on an activity's screen, labelled and ordered, across pages.
* **R35** Put commands on a device's screen pages in device mode.
* **R36** A screen button that opens a page of the user's own commands, and a button back.
* **R37** Make a named sequence with pauses and put it on a key or the screen, within what the remote survives.
* **R38** Give a key a second command when held.
* **R39** Put devices on the device keys, a short and a long press each.
* **R40** Give an activity's touch gestures their commands.
* **R41** Show every screen as the remote will draw it, before writing.
* **R42** Choose the look of the screens: typeface, inks, colours, icons, background, theme, choices per screen.
* **R43** Draw the remote's face and know which key is which.
* **R44** Give every activity the remote's own help, the advanced help and its delay fixing included.

### Favourites

* **R45** Favourite channels: the number kept as text, a name, on keys or screen pages, ordered and removed.
* **R46** A favourite with an icon.

### Settings

* **R47** Read and change the remote's own settings as far as the model offers them, the touch sound and the tutorial after the first write among them, and put them back to defaults.
* **R48** How long the screen stays lit, and its brightness.
* **R49** The motion sensor on or off.
* **R50** The Remote Assistant and the "Starting Activity" message on or off.
* **R51** The kind of help, Smart or Full.
* **R52** The clock: the right time, how it is shown, and read back.
* **R53** A slideshow of the user's pictures.

### Learning

* **R54** Learn an infrared command from the original remote through the Harmony's own receiver.
* **R55** Use a learned code in a device, on any key or screen button, input commands included.
* **R56** Recognise a learned code as a known kind and keep it compactly, or as captured when it is not.
* **R57** Identify a device the catalogue does not recognise from a few taught commands.

### Backup and restore

* **R58** Back up a remote whole and keep it on the computer.
* **R59** Put a backup back on the same remote.
* **R60** Move a setup to another remote or model, or copy devices and activities from one setup into another, adapted to the target's limits.
* **R61** Clear a remote's setup so it starts fresh, by writing an empty configuration, never through the firmware's own reset.

### Status and identity

* **R62** Find the attached remotes and their models without claiming them.
* **R63** Tell one unit from another, and say when the wrong one is connected.
* **R64** The firmware version and hardware details.
* **R65** The battery level, and a warning or refusal before a write when it is low.
* **R66** Progress during a read or a write, and the remote showing it is being written.
* **R67** Show live which key is pressed on a connected remote.
* **R68** A report about a remote this project does not support, which its owner can publish.

### Firmware

* **R69** Know the firmware state: running, safe mode or bootloader, and whether a newer version exists.
* **R70** Install Logitech's own unmodified firmware, from a file the user has or from Logitech's update service; the 600, 650 and 700 only, by decision 18.
* **R71** Bring a stuck remote back.

### Logitech's service

* **R72** Import devices and activities from the user's own Logitech account, if they ask and give their own credentials; the app works the same without it.

### The FHSDK as a whole

* **R73** Everything works offline, with no account.
* **R74** Reading and building run in a browser or an app window, the USB half in the app's main process.
* **R75** An app depends on published packages, not on a checkout beside it.

### What an application builds on

* **R76** Change a recipe through functions that each return a new one and keep it consistent: add, change and remove a device, an activity, a key, a screen item, a sequence and a favourite, with no knowledge of how a recipe is laid out.
* **R77** Ask a recipe what it holds: what a key does, which devices an activity uses, what is not yet filled in.
* **R78** Check a recipe without building it, and get every problem as a list, each naming the place it concerns.
* **R79** Write a recipe to a remote through one function for every model, which reports its phases, its progress, what the user must do or leave and its outcome as events, and stops only where it is safe.
* **R80** A pretend remote an application reads and writes with nothing attached, its progress and its failures included.
* **R81** Read the catalogue over the network a device at a time, from its index, kept in a local cache; the whole archive on disk is the other source.
* **R82** Find a device across every source at once, the archive and Logitech's service, each result saying where it came from.

### An existing setup

* **R83** Take over a configuration Logitech's software built as a recipe that rebuilds to the same behaviour, so an existing setup is not entered again.

### The hub

* **R84** Find a hub on the local network and reach it there, with no account and no service of Logitech's.
* **R85** Set the Wi-Fi network a hub joins, with no service of Logitech's.
* **R86** Take over a hub somebody else set up, so it is the user's own and holds nothing of its previous owner.
* **R87** Through a hub, start and stop an activity, send one command of a device, and read which activity is on.
* **R88** Read the smart home devices a hub found, with their kind and what each can do, and leave them intact when a setup is written.
