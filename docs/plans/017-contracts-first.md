# Plan 017: the FHSDK's contracts first, an application built against them, and the hub and the Elite as bench remotes

**Status: open.** Written 14 November 2026, in a conversation that began as a question about what an application
needs from the FHSDK beyond what `todo.md` held, after the hubs' firmware and the hub paired remote's had been
read for the reference. Its decisions are [37 to 41](../decisions.md#d37); its work is `todo.md` chapters 2 to 6
and 15, and the new requirements R76 to R88.

## Why

[Plan 015](015-requirements-and-capabilities.md) gave the FHSDK a list of what it must be able to do and a way for
an application to ask how far each model has it. What it did not give is the shape an application holds while it
works. Five gaps came out of the conversation:

1. **An application has to know how a recipe is laid out to build one.** The types are public and a reader checks a
   recipe that arrives as JSON, but nothing adds a device, removes one from every activity that used it, or says
   what is wrong before a build is tried. Each application would write that itself, and write it differently.
2. **Writing to a remote is three functions that speak in lines of text.** One per kind of remote, each reporting
   for a journal on a terminal. A screen needs phases, progress and the moments a user must do or leave something.
3. **The catalogue is a folder of 2.4 GiB beside the repository.** A user with five devices has no use for 276236
   of them, and the application should not need to know what an infrared code is to offer a search.
4. **The Harmony Hub and the Harmony Elite are on the bench and in no list.** [Decision 36](../decisions.md#d36)
   put the set there to be read; no requirement, no row and no checklist names either.
5. **FreeHarmony waited for all of it.** It was kept apart until the libraries were complete, to be opened up in one
   pass. That couples the application's start to the last remote's last ability.

## What was decided

1. **The application's document is plain data of the FHSDK, with functions beside it**, [decision
   37](../decisions.md#d37). The recipe is the document of one remote. Functions change it and return a new one,
   keeping the whole consistent; functions answer what it holds; a check returns every problem as a list without
   building. No classes: the document goes to disk, across the boundary between an application's two processes and
   into undo as it is, and an interface that redraws on a new value needs nothing more.
2. **The contracts first, then the filling in**, [decision 38](../decisions.md#d38). The outside of the FHSDK for
   everything an application does is fixed before the inside is complete, proven by a walking skeleton that really
   works on two remotes, the spare Harmony One and the Harmony Touch, one of each kind of family, and by a pretend
   remote an application can run against with nothing attached. From then on FreeHarmony is built against that
   outside while the FHSDK is filled in per remote, by whoever takes a remote up. An ability a model does not have
   yet is an answer the capability API already gives, so an application offers what is met and gains the rest as it
   lands. **This reverses the earlier arrangement** that FreeHarmony stays apart until the libraries are complete.
   The everyday Harmony One takes no part in any of it; the spare may be wiped and rebuilt as the work needs.
3. **Numbered versions**, [decision 39](../decisions.md#d39). The FHSDK is released in versions and FreeHarmony takes
   it through its `package.json`, never as the folder next door, so the two move independently and a change of a
   contract shows in a number. A request for something the FHSDK lacks, or the other way round, is an ordinary
   change to the outside. This brings R75 forward to directly after the skeleton.
4. **The Harmony Hub and the Harmony Elite are bench remotes like the rest**, [decision 40](../decisions.md#d40):
   two lines in chapter 1, a checklist each. The hub is sold on its own and is, for these lists, a remote without
   keys that has more: it is reached over the network, it joins a Wi-Fi network, it changes hands, and it knows the
   smart home devices it found. Because it has no keys, the FHSDK also drives it a little: start and stop an
   activity, send one command of a device, read which activity is on. That is how a setup on a hub is tried at all,
   and it lets a bench test run with the infrared monitor and no hand on a key. Driving lamps, locks and thermostats
   live is another product and is left out. Writing to either unit stays closed until a decision of its own.
5. **The catalogue a device at a time**, [decision 41](../decisions.md#d41). The FHSDK, not the application, asks the
   catalogue and Logitech's service. The archive is read over the network from its own index, one device at a time,
   into a local cache; the whole archive on disk stays as the other source. A document carries the definitions of
   its devices, as a recipe already can, so a setup stays editable when neither source answers any more. A user's
   documents are the user's: the FHSDK and an application create, read, change and delete them, and that is all.

**Not for the first version**: taking over a configuration Logitech's software built, as a recipe that rebuilds to
the same behaviour. A setup is entered again through the toolkit until then. It is requirement R83, last in the
order. Reading back one of our own builds, R3, stands apart from it and is not moved.

**Left open on purpose**: whether an application ever runs in a browser alone. The codec's core already does; the
USB half would need a second bottom layer on WebHID, which Chromium browsers alone have, and the hub's network
channel and Logitech's service are likely out of a page's reach. Nothing is built for it; the one thing kept is
that the USB transport stays replaceable beneath the protocol.

## What exists, measured before anything was planned

* **The recipe's types are on the codec's main entry**, with `readRecipe`, which checks a recipe that arrives as
  JSON, and `buildFromRecipe`. Nothing changes a recipe, and nothing returns a recipe from a configuration.
* **A recipe carries its devices' definitions**, plan 014: the catalogue's record of a device, every command of its
  codeset and the protocol definitions they are written in, served before the archive is asked. Made for learned
  codes, it is also what keeps a setup editable offline.
* **The archive's layout fits a read per device.** At its release of 2 September 2026, the one these numbers and
  the 276236 above are of, its top index is one file of 300 KiB naming 7889 manufacturers;
  each manufacturer's folder has an index of its own; a device is a file of a few hundred bytes that names a
  codeset kept elsewhere. A builder is already handed a source rather than a path, so a network source is a second
  one beside the disk's.
* **Reading reports progress as numbers; the three writes report lines.** `writeConfiguration`,
  `writeFileFamilyConfiguration` and `answerTouchSync` each take a line sink, required, for the journal.
* **The write paths name bench units.** The lists of writable units are the library's and hold this bench's units by
  label. Writing a user's own remote is R6, with nothing built.
* **A client of Logitech's service exists as a research tool**, four modules of `packages/corpus` that no entry
  offers.
* **The capability API answers per model**, `capabilitiesOf`, from the model's properties and the proofs.
* **The hub's setup is the same kind of documents the Harmony Touch is given**, read in the hubs' image, and a hub
  paired remote takes its setup from its hub. Reading a hub over the network is [plan
  016](016-the-hub-over-the-network.md), written and not built.

## The order

0. **The contracts and the skeleton.** The outside for the four blocks below is written as types and functions and
   held by the surface tests; one path runs for real on the spare Harmony One and on the Harmony Touch: find a
   device, put it in a document, check, build, sync with events. A pretend remote stands in where no remote is
   attached. Then the first numbered version, and FreeHarmony may begin.
1. **The toolkit on the document**: change, ask, check without building. First, because everything an application
   touches goes through it and it needs no remote.
2. **Sync for an application**: one function for every kind of remote, events instead of lines, a stop only where
   it is safe, and the user's own remote, R6: its identity and a whole backup first, then that unit alone.
3. **Finding devices**: one search over the archive and Logitech's service, the archive over the network with its
   cache, each result saying where it came from.
4. **Taking over a configuration Logitech built**, last.

**The hub and the Elite run beside this as a track of their own**, since their work waits for the bench and the
blocks above do not: read over the network, plan 016; drive it, which is at once the way to test; set its Wi-Fi
with no service of Logitech's; take over a second hand hub; write a setup of our own. Each step that sends the hub
anything but a read opens behind a rail and a decision of its own.

## Refined the same day: which requirements are a remote's

Reading the checklists against decision 37 showed that the requirements had been judged as if a configuration were
changed in place. "Rename an activity" stood open on twelve remotes, each with a reason such as "no run shows an
existing activity renamed", where an application renames in a recipe and hands the whole recipe over. Three changes,
none of them a new decision:

1. **Six requirements became the FHSDK's as a whole**, one status for every model and on no remote's checklist:
   finding a device, R9; renaming a device and an activity, R12 and R25; Pronto Hex, R20, which was already proven for
   every model; identifying a device from taught codes, R57; moving a setup between models, R60. Renaming and moving
   no longer ask for a run on a unit, since a test shows a function on a recipe whole. Removing a device or an
   activity, R13 and R26, is the same kind of ability and stayed a model's, because the Harmony Touch has both proven
   on a unit and a requirement of the whole is proven for every model or for none.
2. **Every open status says whose work is missing**: the FHSDK's for every model alike, the model's family's, the
   model's own, or only a run on a unit. It is read off the reason as written. The requirements document counts each
   remote's open requirements by it and a checklist says it per box, so a remote's own work can be told from what the
   chapters of `todo.md` do once for all of them.
3. **The requirements that touch got their line written down**, in the requirements document's introduction: R7 and
   R78, R66 and R79, R9 and R82, and R12, R13, R25 and R26 beside R76.

## What this does not decide

How FreeHarmony itself is set up, which is the application's own plan. Which functions the toolkit has, name by
name, which is the first item of chapter 2. How the versions are published, which is chapter 3's.
