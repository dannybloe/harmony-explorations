---
name: code-for-a-family
description: "The family split of plan 007, kept at the moment code is written. Use before adding or changing anything in packages/codec/src that builds or composes configuration bytes: a composer, a generator, a serializer, a layout rule, a table of keys, fonts, pictures or menus, a choice, or a fact a builder relies on; and when a measurement on one remote is about to become code. Also load it in every agent brief that touches the codec's build side."
---

# Code for a family: where a difference between remotes lives

**The rule, in one sentence: code outside `families/` is generic.** It holds nothing that is true of one
remote and not another: no scan code, no coordinate, no font number, no picture, no list shape, no count, no
table of keys, no test of the architecture or the skin. Everything that differs between remotes is data or
code **in a family**, and a module outside `families/` reaches it only by asking the configuration's
family, `familyOf(c)`, `traitsOf(c)`, `choicesOf(c)`. A fact goes outside `families/` only when it is
measured the same on every family that module serves, and its docstring names those families.

**Readers of Logitech's formats are the one place an architecture may be named outside a family**, because
reading a format is per architecture by nature (a slot number, a header length, a container cookie). Even
there the architecture is looked up in **one table per fact** (`archSlot` is the model), never tested inline
in a function's body, and a reader never decides how something is **built**.

**This skill holds no rules of its own. The rules are plan 007's, and this is the moment that makes them
bite.** The plan is `docs/plans/007-one-pipeline-many-families.md`, sections "A family is a bundle of
parts, not a subclass", "The rules the structure keeps" and "Where the files go"; the interface is
`packages/codec/src/families/family.ts`. Read both before writing.

**Why a skill and not the plan alone.** The plan reads as an architecture to agree with, and it is
agreed with. The moment that matters is the middle of a task: a builder half works, the next refusal
comes from one remote, and the quickest fix is a test of which remote it is, or the shape of that
remote's bytes written straight into a shared module. Twice in one stretch of `todo-compile-one.md` 1.2.9
this happened: a composer for a donor device's inputs matched the Harmony One's send list shape inline
in a shared module where the family already stated it as a trait, and the device mode key table stayed
the Harmony 650's alone in a shared file when the Harmony One turned out to bind other commands. Both
were caught by the person reading along, not by the code. So the trigger is the **act** of writing build
code, whatever the task was.

## Before writing, answer four questions

1. **Is this a fact about one family, or about all of them?** A measurement on the Harmony One is a
   fact about the One family until another family is measured too, `CLAUDE.md` decision 16. Say which
   families it was measured on in the docstring.
2. **Where does it go?** By the plan's table:
   * the same on every compiled family: `shared/` or the container modules (`frame.ts`, `placer.ts`,
     `inputs.ts`, the infrared and action list modules);
   * different per family, as **data** a shared composer asks about: a field of `FamilyTraits` (how
     action lists differ, `screenItemsBeep`) or of the family's choices
     (`CommonChoices` and the family's own `choices.ts`, every choice of ours with its default);
   * different per family, as **code**: a member of the `Family` interface, implemented in
     `families/four-slot/` and `families/one/`, with the shared composer calling it.
3. **Does the shared code ask its family, or test which remote it is?** `traitsOf(c)`, `choicesOf(c)`
   and `familyOf(c)` in `families/registry.ts` are the questions; the registry is the one place a family
   is chosen. A new `c.architecture === 12`, `archSlot(14, ...)` or skin test in a builder is the thing
   this skill exists to stop. **Readers are exempt**: reading Logitech's compiles stays per architecture,
   since reading is not building.
4. **Is the other family's half stated?** A trait or interface member is filled in for every family. Where
   the other family's answer is not measured, it refuses with a message that says so, rather than
   borrowing the measured family's answer.

## Checks before committing

Run these over the change; each prints nothing when the change keeps the split.

    # a new test of which remote it is, in build code
    git diff -U0 -- packages/codec/src | grep -nE '^\+.*(architecture (===|!==) ?[0-9]|archSlot\((12|14),|\.skin (===|!==))'

    # a family importing another family, or a shared part importing a family
    grep -rn "from '\.\./four-slot\|from '\.\./one/" packages/codec/src/families/
    grep -rn "families/\(four-slot\|one\)" packages/codec/src/shared/

A hit in a builder needs moving behind the family before it is committed. **`test/generic.test.ts` is the
executable half**: it lists every module outside `families/` that still names a remote, with what it names,
and fails when a module joins the list or a count on it rises. The list is the debt, `todo-compile-one.md`
3.3, and it is empty since that item was finished: a module that would join it moves its part into a family instead.
**Never add a module to that list to make a commit pass**; move the part instead.

## The cases met so far

| what | where it belongs |
|---|---|
| a send is three lists with a delay prelude, or the send and its quantity alone: a device's lists and delays, a composed device's new send, a sequence's sends, the donor input matcher | `Family.sends`, the family's `sends.ts`; a trait the four composers each tested until `todo-compile-one.md` 3.3.3.4, now one member they ask; the four slot delay maximum is the family's `statetables.ts` |
| the shape of an activity's start, its tag 5 list, and the readers of the four slot start variable and flag | `Family.activityStart`, the family's `start.ts`, with `startSequenceOf` and `arch14Starts` in the four slot one |
| what composing an activity changes in a family's own wiring | `Family.activityRewiring`, absent where nothing changes; not a test of the architecture in the shared activity composer |
| a screen item's list opens with the beeper | `FamilyTraits.screenItemsBeep` |
| the activity key a type of activity takes; the delays a device starts with | the family's choices, `CommonChoices` |
| the device page, the activity screen, a menu row | `Family` members, one implementation per family |
| which command each hard key sends in device mode | per family, since the Harmony 650's `HARD_KEYS` does not carry over to the Harmony One by key name |
| our faces' weights, the pad font, the menu row fonts | the family's choices |
| a layout a reader needs to read Logitech's pages and a builder needs to write ours | a reader's table of type `PerArchitecture` (`CORNER_LAYOUTS`), which the family takes under its own names; `generic.test.ts` counts no scan inside one |
| the skins a shared step has been run on | a `Family` member, as `composedSkins` |
| a character only one family's compiles draw, such as the Harmony One's start up title joiner, a blank a plain character map reads as a space | the family's own character map over the shared one, `oneCharacterMap`; the speller and the form rule stay shared |
| the activity keys an activity is put on, read and edited | `Family.activityKeyEditor`, absent where a family has none |
| the values a family's state tables hold that another's do not, the Harmony One's minute call and width line among them | `Family.stateTables`, which the generic `buildStateTables` takes; not a per architecture table in the shared module, which is how `todo-compile-one.md` 6.4 first held the One's |
| a family whose clock carries nothing and which keeps no value maps, the Harmony 300 and 350's | two more of those facts, `clockCarry: false` and `caseCountWidth: undefined`, which the generic builder, reader and `withStateTables` ask; the numbering of a setup's own variables is the family's allocator beside them, `noScreenStateVariables`, `todo-compile-350.md` 5.1.2 |
| how a four slot page sizes, splits and places a label, the title and the counter | the four slot family's `devicemode.ts`; which command goes to which key or to the screen stays shared |
| a remote's own wiring, the lists, entries and timers that connect its firmware to a configuration, whose catalogue differs whole between families | the family's catalogue and numbering, `families/one/wiring.ts`, over the generic engine `wiringparts.ts`, and asked as `Family.wiring`; not a second catalogue beside the four slot one, `families/four-slot/wiring.ts` |
| which of our faces a set of Logitech's becomes, whether two sets may share a glyph, and which of a family's skins its faces were measured on | `Family.fonts`, the family's `fonts.ts`; the shared font table measures a set the same way for every family and asks, and the faces themselves stay one catalogue in `lettering.ts`, since every family's are drawn and read back by the same code |
| a keypad's scan range, the key map over it and mode 0's list; the chain that builds a whole configuration from a setup, with the skins it takes | the family's `modezero.ts`, `assemble.ts` and `skins.ts`; what every family's lists share stays outside: the order a key list is stored in, `modezero.ts`, and the renumbering of base slot 10, `assemble.ts`. A module still outside the family takes a family's name through the family's index, on an import it already has |

| which of a family's builders run over a setup composed onto a Logitech compile, in place of the donor's parts, and what of the finished file they reproduce | `Family.composedBuilders`, the Harmony One's `families/one/builders.ts` with its attribution `oneBuiltBytes`; `composeSetup` calls the member and names no builder, `todo-compile-one.md` 3.2.2 |
| which base slot 14 records an activity's cases go in beyond those `activityKeyedMaps` finds, and whether they are entered in base slot 11's table | the family's activity composer asking its own catalogue and table rule, the Harmony One's `oneValueMapRoles` and `withOneScreenTable` in `families/one/caseprograms.ts`, `todo-compile-one.md` 3.2.2.3; not a change to the shared finder, which the Harmony 600 family uses too and where no unread copy is measured |
| what a builder on the composed path needs of a composed device that the configuration does not say, its setup name and the power type the catalogue states | `ComposedDeviceNote`, which the shared `composeSetup` passes to `Family.composedBuilders`; the Harmony One's power off help asks it, `withOneHelpChain`, `todo-compile-one.md` 3.2.2.4. Not a test of the remote in the shared setup: it passes the same note to every family |
| screens a family's configurations leave out, the Harmony One's welcome tour and start up Remote Assistant | the family's choice, `OneChoices.welcomeTour`, which `composeSetup` hands to `Family.composedBuilders` with the family's other choices, and the step in the family, `families/one/withouttour.ts`; taking modes, pages and pictures out and renumbering them is generic and shared, `shared/dropmodes.ts`, as base slot 10's renumbering is `assemble.ts`'s, `todo-compile-one.md` 4.10 |

| a list below a family's screens that several of its screen sets reach, and whose bytes it is | stated in each set's template and built alike by each, the One family's `screentemplate.ts` steps (`PAGE_KEYS_OFF`, `LIGHT_5_OFF`, `LIGHT_7_OFF`, `ASSISTANT_ON`); the family's attribution credits the first in its build order, `oneBuiltBytes`, `todo-compile-one.md` 6.5; not an owner table outside the family |
| the devices an activity's own device list puts first, and how each family builds that list and puts a composed device's row on its lists | the order is one rule measured on both families, `startSwitchedOn` in `shared/activities.ts`; the list is `Family.activityDeviceList`, the four slot family's `composeActivityDeviceList` and the One family's `withOneActivityDeviceList`, and a row on the One family's lists is `withOneDeviceListRow` in `families/one/devicelists.ts`, `todo-compile-one.md` 4.3.3 |
| how a family puts an activity's row on its activity menu, copied or built | `Family.composeActivityRow`: the Harmony One builds its whole menu again from a description, `withOneActivityMenuRow` in `families/one/activitymenu.ts`, wherever the activity's type is given, and keeps the copying composer where it is not; not a menu step skipped in the shared activity composer, whose later steps read the row, `todo-compile-one.md` 4.1 |
| where Logitech parks what a table names, and the picture bank's order, measured the same on both families | nowhere in a family: `placer.ts`, shared, with the Harmony One's raw slot 18 the frame's data, `FRAME_ARCHITECTURES`; `todo-compile-one.md` 6.2 found no difference to record, section 426. A fact measured alike on every family a module serves is the case where no family member is the right answer |
| where a composed device's parts go when a family allocates them at fixed places, the Harmony 300 and 350's eight infrared groups, and its action lists after the last list body since the key map table sits right before them | `DevicePlacement`, which the family's composer passes to the shared `composeDeviceFor`: the named group filled by `fillIrGroup` in `shared/infrared.ts` rather than a group appended, and the lists where the family says; not a test of the architecture in `shared/devices.ts`, `todo-compile-350.md` 4.1 |
| where a one block copy's record goes when a section of the family's own sits right above the infrared table, the Harmony 300 and 350's clock record | `recordsAt`, which the family's composer passes to the shared `appendCopyRecord` in `sequence.ts`: where the group arrays begin, as `fillIrGroup` puts a group's; not a test of the architecture in the shared module, `todo-compile-350.md` 4.3 |
| which key a favourite channel goes on, where two models of one family differ | a table by skin in the family, `FAVOURITE_SCANS` in `families/no-screen/keys.ts`, which the composer asks and which refuses a skin it has no row for; not an inline test of the skin, `todo-compile-350.md` 4.3 |
| the places an index sits that a renumbering rewrites, where a family keeps sections no base slot names, the Harmony 300 and 350's start up events, key maps and timers | the family's census over the shared one, `noScreenSites` in `families/no-screen/remove.ts` adding raw slots 5, 6 and 8 to `instructionSites`; not those slots placed in `ARCH16_SLOT_MAP` for one composer, which hands every reader of a base slot a container it has not been run on, `todo-compile-350.md` 4.1.3 |
| the metadata archive's text around the devices, and the two numbers a build chooses for it | the family's `families/no-screen/metadata.ts`, `noScreenMetadataSection`; the ZIP and the deflate stay shared, `metadata.ts` and `deflate.ts`, since the ZIP's shape is measured alike on the Harmony 300 and 350 and the Harmony 890 and 895. The device element, `metadataDeviceElement`, sits in `metadata.ts` beside the editor that already wrote it and is measured on the Harmony 300 and 350 alone, the only family whose archive names devices, `todo-compile-350.md` 5.1.4 |
| how many infrared groups a model's configuration allocates, and the count widths of the family's tables of addresses, for a configuration built with no Logitech file | tables in the family, `INFRARED_GROUPS_BY_SKIN` by skin, refusing a skin no configuration of has been read, and `NO_SCREEN_COUNT_WIDTHS` by raw slot, in `families/no-screen/empty.ts`; the counted table itself stays the frame's shared `countedTable`, `todo-compile-350.md` 5.1.5 |
| an activity with no record, no map and no screen, one list on one key, and inputs that exist only for the activity's devices and send one block copies after a tenth | the family's own composer, `composeNoScreenActivity` in `families/no-screen/activity.ts`, as its device and favourite composers are; the shared activity composer's `activityStart` and `activityKeyRules` and the shared input composer's `sendWriter` and `switchOnList` refuse there for good rather than answer with the screen families' rule, `todo-compile-350.md` 4.2 |
| how a family's container frame differs, the Harmony 300 and 350's fifteen stated slots, sections of their own, a key table named by the key map table's first entry and no picture bank | a row of the frame's reader table, `FRAME_ARCHITECTURES[16]` (`pointerCount`, `insertedSections`, `keyTableList`, `pictureBank`), which `takeApart` and `layOutContainer` read; not a test of the architecture in either, `todo-compile-350.md` 5.1.1 |
| which generator writes each byte of a finished configuration, and the lists it reads back through their writers | the family's attribution, the Harmony 300 and 350's `noScreenAttributedBytes` in `families/no-screen/attribution.ts`, with one writer per kind of list beside its reader in the family's `lists.ts`, which the composers call too; the ledger that counts, the description apart and the carried by region, is shared, `attribution.ts`, since it knows no byte of any remote. The four slot and One families' attributions keep ledgers of their own, `todo-compile-350.md` 5.2.1 |
| an entry every build of a family carries that Logitech's compiles do not, the Harmony 300 and 350's binding of firmware event `0xFF` to the list event `0x30` runs, which makes one build serve both models | the family's constants beside the entries it borrows its list from, `noScreenAcknowledgingEntry` in `families/no-screen/constants.ts`, put in by the builders from nothing, `buildEmptyNoScreenConfiguration` and, last, `buildNoScreenSetup`, and not by the composers onto a donor; the family's attribution credits it where a file holds it. Not a test of the skin: the entry is harmless on the model that never raises the event, `todo-compile-350.md` 5.4 |
| a copy of a setting that a key reaches beyond the one a shared edit knows, the Harmony 300 and 350's Watch TV keeping its own wait after a one code device's power | `Family.powerOnDelayCopies`, the family's `delay.ts`, which the shared `setPowerOnDelay` asks and changes along with the device's own; absent where the one copy is all; not a test of the architecture in `edit.ts`, `todo-compile-350.md` 4.6 |
| a device's send lists that are the plain pair with an on list of one call and one wait, measured alike on the Harmony One and the Harmony 880 and 885, and the longest wait each allows | the pair in `shared/sendpair.ts`, `pairDeviceSends`, which both families' `sends.ts` call with their own longest wait; the 880 and 885's own rails, 64 state bytes and the toggle bit groups 8 and up share, stay in `families/side-keys/sends.ts`, `todo-compile-885.md` 2.1 |
| how a composed device's power step is spelled where a family's compiles differ: the Harmony 880 and 885 open its record, the long press version included, with the device's delay between devices and send it at 1, where the Harmony 650 and 700 send the press bare at the inter key delay | `SendShape.powerStep`, the side keys family's `sideKeysPowerStep` in `families/side-keys/sends.ts`, which `composeDeviceFor` asks before building the records; absent keeps the default, `todo-compile-885.md` 2.2 and 2.3 |
| a remote whose device modes and device list are one page grammar, labels beside eight side keys with a separator each, the Harmony 880 and 885 | the family's `families/side-keys/pages.ts`, read off the configuration's own pages and built from their pictures and fonts; appending a page to a mode, its list, its pool copy and its record, is shared, `appendModePage` in `shared/modes.ts`, which the four slot menu composer uses too, `todo-compile-885.md` 2.1 |

Add a row when a new kind of difference lands.

## Related

* `writing-a-config`: the rails a configuration must respect, whichever family built it.
* `finding`: a measurement that becomes a builder's fact goes through the finding gate first.
* `harmony-one`, `harmony-650`, `harmony-600`, `harmony-700`: where each remote's facts are.
