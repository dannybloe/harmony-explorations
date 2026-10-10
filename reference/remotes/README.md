# Remotes, one folder per model

Everything known about one Harmony model, in one place, so that a session never has to assume
something about a remote that nobody has stated. The trigger was exactly that: a session assumed the
Harmony 600, 650 and 700 show a clock on their screen, and they show none, which Danny saw at the
bench. Every fact that bore on the question was already somewhere in this repository, in a different
document each time.

**This is a reference and not a derivation.** The arguments live where they always have, in
`docs/findings.md`, the memory maps, `docs/usb-protocol.md` and the code, and a folder here links to
them with one sentence of what they say. Where a fact is long, the link is the fact and the sentence is
a summary of it. Two copies of a derivation is the state this repository refuses everywhere else, and a
reference that restated the findings would be the largest such copy it had.

## The structure

```
reference/
  remotes/
    README.md                 this file
    harmony-650/              one folder per model, named harmony-<model>
      README.md               one screen: what it is, architecture and skins, bench units, key numbers
      hardware.md             processor, memory, battery, charging, what is inside
      keys.md                 every key, its scan code where measured, the drawing
      display.md              size, colour, touch, raster, what the screen shows and does not
      features.md             device and activity limits, favourites, help, sequences, settings
      behaviour.md            what it does in use: device mode, wording, bench observations
      memory.md               what is specific to this model, plus the architecture's map
      firmware.md             versions seen, images in the lab, safe mode, recovery
      usb.md                  product id, identity fields, commands answered, write standing
      misc.md                 notes that fit no other file
  architectures/
    harmony-600-650-700/      architecture 14: what the three models share, stated once
      README.md, memory.md, firmware.md, usb.md, misc.md
    harmony-300-350/          architecture 16, the file based family: the same five files
    harmony-5xx/              architecture 9, measured on the Harmony 525 alone: the same five files
```

The Harmony Touch has a model folder and no architecture folder, because its architecture number is
disputed and nothing here has read a second model on either number; its `misc.md` says why.

**Every model folder holds the same ten files**, including a model where a file says little, because a
missing file reads as "nothing known" and an empty section that says "not checked" reads as what it is.
`packages/silhouettes/test/remotes.test.ts` fails when a folder holds anything else.

**What several models share goes in the architecture folder once**, above all the memory map and the
firmware, and the model folders link to it and state only how they differ. An architecture folder is
named for the models it covers rather than for its number, since the number is this project's handle
and means nothing on the desk; its README says which number it is.

## Every fact carries its source and its standing

A row or a sentence says where the fact came from and how strong it is, in one of these words:

| standing | what it means |
|---|---|
| **measured** | read off one of our own units, over USB or with an instrument such as the infrared receiver. Names the unit and the findings section |
| **seen at the bench** | Danny looked at the remote and said so. Strong for what a person can see, silent on why |
| **read in the firmware** | from the disassembled image, with the image named. What the code does, not proof the hardware does it |
| **Logitech's manual** | the user manual for that model, in the lab's `Docs/`. The vendor's word, sometimes about a different software generation |
| **Logitech's service** | stated by their live service, usually a product record. The vendor's word, current |
| **Logitech's client** | from their decompiled desktop client, `docs/host-client.md` |
| **third party** | the comparison table at harmony-remote-forum.de, `reference/capabilities.md`, or another outside source. A hypothesis |
| **not checked** | nobody has established it. Written out on purpose |

**"Not checked" is the row that matters most.** Each section ends with the questions nobody has
answered, written as such, because the absence of a statement is exactly what let the clock assumption
through. A fact that is not marked is not a fact here; if something is unclear about how a remote
behaves, it is marked not checked rather than guessed.

Where two sources disagree, both are written down with their standing and the disagreement is left
open unless something settles it. The Harmony 650's device limit is the worked case: its manual says
five and two Logitech tables say eight.

## Generated blocks

Some facts already live in code, and those are **generated** into the documents rather than typed:
the skin table and capability fields of `packages/usb/src/models.ts`, the key list and measured scan
codes of the drawing in `packages/silhouettes`, the screen raster in `packages/codec/src/render.ts`, the
product id in `packages/corpus/src/read.ts`, and the memory constants and write lists in
`packages/usb/src/rails.ts`, `protocol.ts` and `settings.ts`.

A generated block sits between two markers:

```
<!-- generated:keys -->
... owned by the generator ...
<!-- /generated -->
```

Text outside the markers is hand written and never touched. `packages/silhouettes/bin/remotes.ts` is
the generator; it keeps the list of model and architecture folders and which block goes in which file.

```
make remote-reference         check every block against the code, exit 1 naming each one that differs
make remote-reference-write   rewrite every block from the code
```

The check also runs in the suite, `packages/silhouettes/test/remotes.test.ts`, so a change to any of
those tables that leaves a document behind fails `make ts`. To change a generated fact, change the code
it comes from and run the write target; editing inside the markers is undone by the next write and
fails the check before that.

The names are `remote-reference` rather than `remotes` because `make remotes` already lists the
remotes attached to this machine.

## Adding a model

1. Make `reference/remotes/harmony-<model>/` with the same ten files, copying the headings of an
   existing folder.
2. Add the model to `REMOTES` in `packages/silhouettes/bin/remotes.ts`: its skins, the drawing it
   uses and its architecture. A model with no drawing of its own uses its sibling's where Danny or the
   manual says the face is shared, and says so in `keys.md`.
3. Put the markers where the generator expects them and run `make remote-reference-write`.
4. If its architecture has no folder yet, add one and a row in `ARCHITECTURES`.

## What this does not replace yet

* `reference/capabilities.md` covers every skin, not only the bench models, and carries the argument
  about the forum table's standing. It stays until every bench model has a folder here, and is then to
  be absorbed into them.
* `docs/memory-map-600.md` and `docs/memory-map-700.md` stay. The architecture folder carries what the
  three models share and links to them for the per unit rows; which parts it carries is stated in
  `reference/architectures/harmony-600-650-700/memory.md`.
* `reference/models.md` keeps the skin and architecture table for every model Logitech made, and
  `reference/button-maps.md` the per model scan code derivation.
