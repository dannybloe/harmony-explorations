# Plan 018: one document shape for every remote, its default maps derived by rule, and everything about one key askable

**Status: open.** Written 15 November 2026, while the walking skeleton of [plan 017](017-contracts-first.md) was
taken from the Harmony One to the Harmony Touch and the Touch's document turned out to be a second shape. Its
decision is [43](../decisions.md#d43); its work is `todo.md` 2.3 and, after the skeleton, the questions of 4.2 and
the tuning of 7.6.

## Why

A recipe for a Harmony Touch carries a block of its own, `Recipe.touch`, that states every key, every screen entry,
every identifier and every delay, and the toolkit's changes are not built for a document that has one. So the
functions an application calls to add a device or change a key work on a Harmony One's document and not on a
Touch's, which is the opposite of what the contracts are for. Three things came out of the conversation:

1. **The toolkit is the same for every model**, decision 43. What a model lacks is a named answer, never a second
   set of functions.
2. **A new device arrives with a sensible map and the person reviews it.** The map does not have to be Logitech's.
   What an application needs is the whole derived map as data, every place with its command or empty, so its
   screen can show what is unbound.
3. **Everything about one key can be asked**: what each press does, whether that is the default, which device's
   command it sends and with which settings. And a person's change to those settings, down to one command of one
   device, stays in the document when the catalogue's definition is fetched again.

## What was measured before this was written

The Touch's default maps are derived by rule since `packages/codec/src/families/harmony-touch/defaultmaps.ts`, and
`packages/codec/test/families/harmony-touch/touch-default-maps.test.ts` scores the rule against the one setup
Logitech's service built: device presses 137 of 139, long presses 15 of 17, screen entries 254 of 254 present,
activity presses 122 of 125, gestures 20 of 20, the activities' number pads 45 of 45. The differences are listed in
the test. Logitech's client does not derive these maps itself, it asks the service, so there is no rule of theirs
to read.

## The document, field by field

Where each part of today's Touch block goes. "Derived" means the family computes it and the document does not hold
it; "stated" means a field of the document, the same field on every model.

| the Touch block today | where it goes |
|---|---|
| the protocol ids | derived: the infrared family is read off each command's code, and the id follows the order in which the devices first name it |
| the settings rows | stated, a new `Recipe.settings`, which `setSetting` addresses; they stay stated whole until the family has a table of defaults |
| a device's link to its recipe device | gone, the device is the recipe's device |
| a device's id, an activity's id, a sequence's id | derived from the toolkit's own ids, which survive a rename and a move |
| the control port | not a person's choice: the family writes the remote's own lamp |
| press count and the delays between keys, between devices, after power on and after an input | stated, a new `RecipeDevice.timing`, in the names the catalogue's timing uses, so a person's value stands over the catalogue's |
| always on | stated, `RecipeDevice.power` |
| kept on between activities | the existing field |
| channel tuning | stated, `RecipeDevice.channelTuning`, in command names |
| a device's keys, short and long press | derived by the rule; a person's choice goes in `RecipeDevice.keys` |
| a device's screen list | derived by the rule; a person's list goes in a new `RecipeDevice.screen`, stated whole |
| a device's number pad | derived; its places are keys named as the Harmony One's digits are, so one `setKey` works on both |
| an activity's place in the list | its position in the document |
| the screen an activity opens on | stated, `RecipeActivity.opensOn`, a word the family names |
| which activity has the favourites | stated, `RecipeActivity.favourites`; the default is the first activity with a device that changes channels |
| the order devices are switched on in | stated, `RecipeActivity.powerOrder`; the Touch's default is display, then volume, then the rest |
| extra steps at start and end | stated, `RecipeActivity.start` and `end`, as the toolkit already declares them |
| an activity's keys | derived from its devices' default maps; a person's choice goes in `RecipeActivity.keys` |
| gestures | derived; they are keys named after the gesture, with a short, a held and a double press |
| an activity's screen list | stated, `RecipeActivity.screen`, with a label on a command entry |
| an activity's sequences | stated, `RecipeActivity.sequences`, their steps by command name and never by scan code |

A press is `short`, `held` or `double`. `held` is the long press, a second command chosen by how long the key is
down, which is a property of the key; repeating while held is a property of the command and a different thing,
[how a Harmony works](../../reference/how-a-harmony-works.md). The Harmony One, 600, 650 and 700 have no long
press, so asking for one there answers "not on this model".

The recipe's version moves to 2. A version 1 document with a Touch block is refused with a message naming the
converter below.

## One derivation, used by the build and by the questions

Both kinds of family carry one data interface, in a new `packages/codec/src/families/maps.ts`:

* the **places** of the model: every key, pad place and gesture, with the presses it has and whether a device, an
  activity or both can bind it;
* the **commands** the family would carry for a device;
* the **default map of a device**, from its commands;
* the **default map of an activity**, from its devices' default maps;
* **resolve**: defaults and the document's choices together, each entry marked default or chosen.

The build calls resolve and the questions call the same resolve, so what an application is shown is what is built.
On the Touch, resolve returns the setup the existing composer builds, so the composer the bench ran stays as it is.
An activity derives from its devices' **default** maps: changing a key in a device's own map changes no activity,
which is the operating concept and what the Harmony One's build already does.

What each compiled family has to provide: the Harmony One and the 600, 650 and 700 already have the device rule as
a pure function; their activity rule reads list numbers off a container today and is extracted as a rule over two
device maps in command names, the container version becoming a caller of it. For the Harmony 300 and 350 how an
activity's keys are derived was not checked.

## The questions

    keys(document, owner, sources?)     every place of the model for that owner, bound or not
    key(document, place, sources?)      one place
    screen(document, owner, sources?)   the owner's screen list
    keyNames(document)                  the places, in place of a list of names

They stay synchronous: a definition the document carries is served before any archive, and the network source of
decision 41 fills a local cache the questions read. With neither a carried definition nor a source, an owner's
answers stop with the error `commands` gives today.

The answer for one key:

* the owner, the key and its surface (keypad, pad or gesture);
* one entry per press the model has for that place: the action, or nothing when unbound; whether it is the
  default; for a command, the **sending**: the target device's press count and delays, each marked default or the
  person's; for a sequence, its steps and pauses;
* whether the key repeats while held;
* where a key cannot be chosen, why (on a Harmony One, the keys its screens bind).

The device's settings are shown at the key and stored only on the device, one home per fact: they change through
`setDevice`, the key's action through `setKey`, a sequence's steps through `setSequence`.

## Where repeat and timing live

Per device on every model, as Logitech's own data model has it: how many times one press sends the code and the
delays are fields of the device, and a command has no timing field. How fast a held key repeats is the code's own
repeat part: on the compiled formats the held block's own length, on the Touch not checked.

Three consequences:

1. A person's device timing goes in `RecipeDevice.timing` and every build reads the document's value before the
   catalogue's. Today only the Touch reads a person's timing, from the block that goes away; the compiled builds
   read the catalogue's alone, and `setDevice` for timing is declared and not built.
2. Two activities that use one device for volume send the same command with the same settings, so a change shows
   in both.
3. **Fetching a definition again replaces the definition and nothing else.** The person's fields are separate
   fields, and a new change, `refreshDevice`, replaces only `RecipeDevice.definition` and reports every choice that
   names a command the new definition lacks. Nothing refreshes on its own.

### Room for tuning one command, `todo.md` 7.6

How long a held key waits before it repeats and how fast it then repeats cannot be set per device, since both are
the command's. The document gets the place for it now, so the shape does not move again:

* `RecipeDevice.commands`, by command name, each entry holding a replaced code (what `setDeviceCommand` writes)
  and a `sending` part: the copies in the first block, the held block's pace, the silence before the first block;
* the key's answer gains the command's own part beside the device's settings, each value marked default or the
  person's; on the compiled families the defaults can be read off the built blocks.

The compiled composer already takes explicit blocks per command, so those families can carry it; nothing in a
recipe reaches those fields yet. On the Touch a command has no timing field, and a pace of its own could only be
said by giving that command a definition of its own, which has not been tried on a unit. What a tuning turns into
on any family, and what the receiver that prompted this needs, is 7.6's work and starts with a measurement on the
infrared monitor.

## Migration

* A converter, `describeTouchDocument`, writes the smallest document in the new shape from an old one by comparing
  its block with the derived defaults.
* The proof is a test: resolving the converted document gives the setup the old block gave, except a listed set of
  differences, and the six documents built from it are compared field by field through the existing comparison.
* The listed differences: the control port 0 where Logitech's service wrote 7 on five devices; two screen entries
  that Logitech's set puts on top of another entry and the rule puts at their own index; one pad label; one key's
  group.
* `Recipe.touch` and its reader are then removed, not kept as a second input. The reference
  `packages/codec/test/references/touch-test.json` is rewritten and recorded again, saying the new build has not
  been on a remote, decision 32. The default maps' score moves to the test setup's description in
  `packages/corpus/touch-setups/`, which holds the same maps.

## Order of work

1. The recipe's version 2 types and reader, with `docs/recipe.md`; the Touch block still read.
2. The maps interface, as an optional member of both kinds of family; no family code.
3. The Touch's maps: places, resolve, the ids, the converter, and the round trip test with its listed differences.
4. The Harmony One's maps, and the activity rule extracted in command names.
5. The toolkit's questions, on both references, with nothing attached.
6. The Touch builds from version 2; the block and its reader go; the reference recorded again.
7. The callers in `packages/corpus` and `packages/bench`.
8. The toolkit's changes for every model: the Touch document changeable, `setKey` for a held and a double press,
   `setScreen`, `setDevice` for timing, power and tuning, sequences with an owning activity, `refreshDevice`, and
   the new checks.
9. End to end with nothing attached: create a Touch document, add a device from a carried definition, change one
   key, ask for the whole map, check, build and sync to the pretend remote.

Steps 3, 4 and 5 touch different files and can run side by side once 2 is in; the 600, 650 and 700 and the 300 and
350 follow the One's pattern after it. A person's timing on the compiled families is a step of its own, off the
path to step 9.

## What strained the contracts, and how each is settled

* **A sequence has no owner** in `addSequence`, and it draws only on its activity's devices: it takes the
  activity.
* **No answer says "not on this model"** in a refused change: one is added, backed by the capabilities.
* **An id is reused after a removal**, so on a Touch a new device would inherit the removed one's id and the
  favourites keyed by it: ids are never reused, the document keeps the highest number given.
* **The control port**: 0, the remote's own lamp, which a device of ours was heard with on the bench; the new set
  is heard once on the infrared monitor before it is called run.
* **The two entries Logitech's set stacks**: the rule's own index stands.
* **An activity after a device's key is changed**: it keeps its own map.
* **The Touch's default settings**: taken from a Settings document Logitech's service wrote, if the lab holds one
  that can be described; until then the rows stay stated.
* **Two defaults that fit one sample**, the power order and the favourites activity, are used and marked as
  hypotheses, as the key rule's are.

## What this plan does not do

It builds no tuning of a command, 7.6. It does not make the Touch's defaults equal Logitech's. It writes nothing to
a remote: the bench half, the new set heard on the monitor, is one run at the end with a person at the bench. And
the code named above was read for the design and not re-measured; each step checks what it leans on before it
acts.
