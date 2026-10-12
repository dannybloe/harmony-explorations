# Plan 007: one pipeline, a family per kind of remote

**Status: open.** Written 12 October 2026 for `todo-compile-650.md` 10.7.1. Items 10.7.2 to 10.7.4 and
11.1.1 carry it out.

## What it is for

The code that builds a configuration is a deliverable: FreeHarmony will run it, first for the Harmony
650 and then, one family at a time, for every remote MyHarmony supports and after that the legacy ones.
So its structure has to take a new family as a contained job, a module filled in behind interfaces that
already exist, and never as a reshaping of the code. And a configuration has to be built from a recipe
alone, the recipe stating everything that is our choice and nothing that is a fact about the remote.

**This track still builds for the Harmony 650 only.** The seams below are designed from every family on
the roadmap, so they do not move when a family arrives; what is built behind them is the 650's, and the
Harmony One's composers only move, because they share a file with the 650's today.

## Where the code stands

Measured for this plan, read only, over `packages/codec/src`:

* **The composers patch a donor.** Every public composer in `compose.ts` (8536 lines) takes a parsed
  Logitech configuration and returns new bytes: it cuts holes with `relocate` (58 calls), splices in bytes
  built with `Writer`, parses again and restamps the checksum. Nothing in it builds from a description.
  What a device or an activity does and the bytes that say it are decided in the same functions,
  `composeDevice` and `composeActivity` most of all.
* **Both screen families share that file.** The Harmony One's touch screens and the four slot screens of
  the 600, 650 and 700 sit side by side, chosen by about 27 tests of the architecture inside functions.
  The public composers mostly branch once at the top and hand off to a `FourSlot` function, so the split
  is half drawn; but `archSlot(12, ...)` and `archSlot(14, ...)` also appear inside paths of one family.
* **The newer modules already have the right shape.** The wiring, the state tables, the screen texts,
  the firmware screens, the screen records and the rule drawn pictures each describe a part, build it
  from the description and lay the container out again through `frame.ts`. The four slot menu pages are
  half way: `menuPageParts` decides and `menuPartsBytes` encodes, and `screenrecords.ts` uses them that
  way. These are the serializers this plan needs.
* **Choices are constants in code**: the state colours, the faces of our letters, the default delays, the
  activity type to key mapping (`KEY_OF_TYPE`), the menu words, the Harmony One's row fonts, the screen
  light (`TRACK_SETTINGS`). A recipe cannot reach any of them.
* **Some facts have two copies**, which the one copy rule forbids: `compose.ts` declares the screen
  opcodes `OP_END` to `OP_RETURN` beside `screen.ts`'s `SCREEN_*`, the enter mode opcode `0x7E` is
  declared in seven modules, and `assemble.ts` has its own send and quantity opcodes.
* **FreeHarmony uses no composer yet**, only readers and infrared helpers, so the public surface of the
  composers can change now at no cost to it.

## The families on the roadmap

Surveyed from this repository's documents for this plan; "read" means what this repository has read.

| family | models | configuration | screen | read here |
|---|---|---|---|---|
| four slot | 600, 650, 700, 665 (arch 14) | container `GSPM`, 20 slots, sent over the HID command protocol, copied by the remote into internal flash | 128 by 128, four items a page, pictures and glyph fonts in RGB565 (the 600's panel is monochrome) | whole; written; assembled from a recipe plus a donor |
| touch | One (arch 12) | the same container, 22 slots, run in place from flash | touch, 176 by 220, a hit map over the drawing | whole; written; composers for devices, activities and pages |
| no screen | 300, 350, probably 200 (arch 16) | the same container, 15 slots, stored as a file on the remote and reached over the file protocol | none | read, never written; nine slots unnamed |
| provisioned | Touch, Ultimate One, 950, Elite, Companion, Smart Control, hubs (arch 17 and 18) | no compiled file: the remote fetches its configuration from Logitech's service | touch on the handsets, not read | almost nothing |
| soft keys | 525 and its siblings (arch 9) | container `AHCM`, 20 slots, HID command protocol | 96 by 64 monochrome, soft keys | whole; one block written back; no composer |
| side keys | 880, 885 and siblings (arch 8) | container `TPTP`, HID command protocol | 128 by 160 colour | whole, from contributed files |
| tunnelled | 890, 895 and siblings (arch 10) | container `TPTP`, 23 slots, a tunnelled USB transport | 128 by 160 colour | mostly, without firmware |
| out of reach | 900, 1000, 1100 (arch 15); 610 to 688 (arch 7); 745, 748, 768 | network class USB, or unknown | not read | nothing |

**What they share**, which decides where the seams go:

* **One container format** for every compiled family, a cookie per architecture, the same trailer
  checksum, one pointer table that maps across architectures by `gspm.base_slot`.
* **One action list language**: one opcode table, a send always the `0x7D` and `0x7C` pair, the 650's
  family adding a `0x7F` delay step.
* **One infrared layout** on the arch 8, 10, 12, 14 and 16 families, records of three pointers into shared
  duration blocks; the 525's family spells a code from a dictionary instead.
* **One picture and glyph encoding** on the arch 8, 10, 12 and 14 families; the 525's is one and two bits.
* **The screens are where they part**, and so does how a configuration reaches the remote: a container
  over the HID protocol, a container as a file over the file protocol, or nothing compiled at all.

## The shape: a compiler with a back end per family

A configuration is a program the firmware runs, so the code is shaped like a compiler:

```
recipe ──► description ──► family layout ──► family serializer ──► container or files ──► delivery
 (ours)    (generic)        (per family)       (per family)          (shared per kind)      (packages/usb)
```

1. **The recipe**, the setup file: the target model by name, the devices by catalogue entry, the
   activities, the screens' items and sequences, and every choice of ours (colours, letters, blending,
   icons, settings, the activity type to key mapping), each with a default. It states nothing a model
   can or cannot do.
2. **The model's definition**, `packages/usb/src/models.ts`, documented in `reference/remotes/`: the
   architecture, how many devices it takes, its screen, and which family serves it. A recipe naming a
   model no family serves is refused here, once.
3. **The description**, generic: devices with their infrared codes from the catalogue, their power
   behaviour, inputs and delays; activities with the devices they switch on, their inputs, which key
   sends what, and their screen items; the settings. No byte and no family in it. The front end builds it
   from the recipe, the catalogue and the model's limits, and it is shared by every family. Today's pure
   decision helpers are its first pieces: `activityPowerTargets`, `activitySwitchedOn`,
   `startsSwitchingOff`, `startSequenceOf`, `deviceDriving`, `catalogueDevicePower`, the roles of `activityroles.ts`.
4. **The family's layout**: the decisions only a kind of screen can make. On the four slot family, which
   item goes in which corner, how pages break, which size a label takes (`devicemode.ts`'s rules, with
   the ladder of our letters), the menu pages as parts. On the touch family, rows and hit areas. Its output
   is still free of bytes, which is what makes a screen previewable before anything is built.
5. **The family's serializer**: the layout turned into pieces of the family's storage, through the shared
   encoders: action lists, infrared records, glyphs and pictures, state tables. The describe and build
   modules above are already this.
6. **The storage**, shared per kind: the container's linker, `frame.ts` and `placer.ts`, for every
   compiled family; a set of files for the arch 16 family when it is built. The provisioned family has
   none, since nothing is compiled for it; its seam exists so that is stated, not discovered.
7. **Delivery** is not the codec's: `packages/usb` writes a container over the HID protocol or a file over
   the file protocol, behind its rails, as now.

### A family is a bundle of parts, not a subclass

Each family implements the same roles, layout and serializer, and plugs in shared parts for everything
it has in common with others. Inheritance from a base family is avoided on purpose: the differences
between remotes cut across each other (the One and the 650 share a container and infrared but not a
screen; the 350 shares infrared but not a container format nor a screen), and a base class grows
conditions for its exceptions until it is the if and else this plan removes.

| family | storage | infrared | action lists | glyphs and pictures | screen layout and serializer |
|---|---|---|---|---|---|
| four slot | container linker | shared records | shared | shared RGB565 | four slot |
| touch | container linker | shared records | shared | shared RGB565 | touch |
| no screen, later | file set | shared records | shared, its `0x07` send | none | none |
| soft keys, later | container linker | dictionary | shared | one and two bit | soft keys |

In TypeScript a role is an interface and a family is a plain object implementing it. The existing code
is functions over containers, and stays that style:

```ts
interface Family {
  readonly name: string;
  /** The choices this family understands, with its defaults; what the recipe may set for it. */
  readonly choices: FamilyChoices;
  lay(description: Description, model: ModelDefinition, choices: FamilyChoices): FamilyLayout;
  serialize(layout: FamilyLayout): Storage;
}
```

The names are placeholders for the plan; 10.7.2 settles them.

### The rules the structure keeps

* **One place chooses a family**, a registry from the model's definition to the family. No test of the
  architecture or the skin anywhere else; a family that needs a variant, the 600's monochrome look beside
  the 650's colour one, gets it from the model's definition through its own choices.
* **A family never imports another family**, and a shared part never imports a family. That is what
  keeps a change to one family inside it.
* **Every fact once**, a named constant with the measurement that gives it, in the shared part or the
  family it belongs to. The duplicated opcodes go in the first step.
* **Every choice once**, a family's choice with its default, set from the recipe.
* **Nothing from the lab.** The codec's source imports nothing from `../lab` and reads nothing there:
  the lab is for tests and research scripts, through `@harmony/lab`, a development dependency only. What
  a build needs comes from the recipe, the model's definition, the catalogue archive whose location the
  caller passes, or this repository. Measured when this was written: no module of `packages/codec/src`
  imports the lab. The one gap is a source, not a build: our letters are generated from the Oxanium
  font in the lab's `fonts/`, so the font files a build depends on, Oxanium's and later the icons', are to
  live in this repository with their licences, which both permit. **Closed the same day**: Oxanium's
  seven static weights and its `OFL.txt` are in `packages/codec/fonts/Oxanium/`, and the letters
  regenerated from that copy are byte identical to the committed module.
* **Build, do not patch.** A configuration of ours is serialized from its description through the
  linker. Patching a donor retires for our own builds at 11.1.1; the readers of Logitech's compiles stay
  as they are, since reading is not building and they already work per architecture.
* **The public surface is the pipeline**: recipe in, configuration out, and the layout step for a
  preview. Individual composers stop being exported once nothing outside the codec needs them.

### Where the files go

```
packages/codec/src/
  recipe/          the setup file's format, its validation, the defaults
  description/     the generic description and the front end that builds it
  shared/          infrared records, action lists, text spelling, glyphs and pictures, opcodes
  families/
    registry.ts    the model to family map, the one place a family is chosen
    four-slot/     the 600, 650 and 700: layout, serializer, choices, facts
    touch/         the Harmony One: its composers, moved as they are
```

The container's linker stays where it is, `frame.ts` and `placer.ts`, since every compiled family uses
it. `index.ts` keeps exporting what tests and scripts use while the move is in progress, so the move
changes no caller at once.

## The steps

1. **10.7.2, the move, no behaviour changed.** The shared parts out of `compose.ts` first, the duplicated
   opcodes removed; then the four slot composers into `families/four-slot/` and the Harmony One's into
   `families/touch/`, the entry points choosing through the registry, the architecture tests inside
   functions gone. **Every existing test passes unchanged**, and the assembled test setup is byte equal
   before and after, which is what shows the move changed nothing. The 650's composers still patch the
   donor at the end of this step; they are only in their place.
   **Done 12 October 2026.** The names it settled: `Family` in `src/families/family.ts`, which carries
   the three screen composers and `FamilyTraits`, the three ways a family's action lists differ that the
   shared composers ask about (the delay prelude on every send, the shape of an activity's start, a beep
   opening every screen item); `familyOf` and `traitsOf` in `src/families/registry.ts`, the only place
   that maps a configuration to a family, with `PLAIN_TRAITS` for a configuration no family serves; the
   shared parts in `src/shared/`, which reach a family only through the registry. `lay` and `serialize`
   of the interface above are not there yet: they arrive with 11.1.1, when a family builds rather than
   patches. What stays as an architecture test is a guard at the door of a family's own exported
   function, eight of them, and the check that a container states an architecture at all. The three
   hashes of the assembled test setup, Logitech's letters, ours, and no working screen, were equal
   after each of the three stages.
2. **10.7.3, the choices.** Every constant sorted into fact or choice; each choice a field of its family's
   choices with today's value as its default.
   **Done 12 October 2026, three choices excepted.** The census ran over every constant of the composer
   modules, about 200. What came out a choice is in `src/families/four-slot/choices.ts`, `FourSlotChoices`:
   the letters (Logitech's or ours), blending, the backgrounds (designed or a colour per state) and their
   colours, the bars' colour, a label too wide (a size down or refused), the activity type to key mapping,
   the settings and the delays a device starts with; and in `src/families/touch/choices.ts` the Harmony
   One's device title font, the one of its three row fonts that is ours. `Family` carries them as
   `choices`, a composer takes them in its options and falls back to its family's, and `assembleSetup`
   takes one `choices` input in place of its `settings` and `ourLetters` options. The state colours and
   blending, until then steps only the lab's scripts ran, are steps 14 and 15 of the assembly, each held
   to its own check, and the assembly's own checks now run before them, since several know a page by
   Logitech's designed backgrounds. With the defaults the assembled test setup is byte equal to before.
   Fixed for now, with the reason on `FourSlotChoices`: the words, until a configuration is built rather
   than patched (11.1.1); the letters' colours, until our letters are read by shape rather than ink
   (10.7.5); which face letters each size, until the ladder is computed from the faces a configuration
   carries (10.8). The sort also found facts with two copies outside `compose.ts`, which went to one
   home each: the mode push and pop, the silent flag, the deferred instruction, the screen item beep, the
   condition's two arms, the value map's lead byte, the menu marker values, a delay's stated maximum and
   the firmware's variable count. Constants a recipe should never reach stayed facts even where the
   value is ours, the activity row's marker value for one, since readers depend on it.
3. **10.7.4, the recipe and the description.** The recipe holds everything a configuration depends on and
   names its model; the description is a written type and the front end builds it; the format is
   written down as a preliminary definition FreeHarmony can produce, its fields checked against
   FreeHarmony's data model.
   **The recipe done 12 October 2026, the description not.** `src/recipe/recipe.ts` reads and checks a
   recipe and looks its model up in `packages/usb`'s table, which made that package a dependency of the
   codec rather than of its tests; the registry chooses a family by the model's architecture, and a
   model no family serves is refused there. The setup files are recipes: each names the Harmony 650,
   skin 72, and the test setup states Plasma kijken's working screen. The assembly takes the recipe and
   two inputs that are not a configuration's content, the donor and the catalogue's checkout; the
   device count comes from the model, the screens and choices from the recipe. `docs/recipe.md` is the
   format, with FreeHarmony's model beside it: three gaps there (the catalogue entry behind a device,
   the keep on flag, a pass through device) and the choices. The assembled test setup is byte equal.
   **The description was not built**, and `todo-compile-650.md` 10.7.4 never asked for it: while the
   composers patch a donor, nothing would read one, so it would be a type with no consumer and no test
   that can fail. It belongs with 11.1.1, where a family's layout and serializer are what read it.
4. **11.1.1, the 650 built from its description.** The four slot family serializes from the description
   with no donor, which retires its patching; the starting configuration is empty and ours.

The Harmony One's composers keep patching until the One is worked on; behind the family interface that
is a detail of one module and no longer a property of the codebase.

## What it does not do

* Build a family other than the 650's. The no screen, soft keys, side keys and tunnelled families are
  rows in the table above and nothing more until they are worked on.
* Change a reader, a rail or the write route.
* Decide FreeHarmony's own document format. The recipe is ours and preliminary; FreeHarmony produces it.

## Open

* **Whether FreeHarmony calls the layout step** for a live preview of a screen while a user edits, or
  only the whole pipeline. The plan exposes both; which one FreeHarmony uses is its decision.
* **The provisioned family's seam** is stated from Logitech's client alone; nothing compiles for it, and
  whether anything of ours can configure it at all is not known.
