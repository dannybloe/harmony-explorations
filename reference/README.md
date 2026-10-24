# Remotes, one folder per model

Everything known about one Harmony model, in one place, so that a session never has to assume
something about a remote that nobody has stated. The trigger was exactly that: a session assumed the
Harmony 600, 650 and 700 show a clock on their screen, and they show none, which anyone holding one can
see. Every fact that bore on the question was already somewhere in this repository, in a different
document each time.

**This is a reference and not a derivation.** The arguments live where they always have, in
`docs/findings.md`, the memory maps, `reference/usb-protocol/README.md` and the code, and a folder here links to
them with one sentence of what they say. Where a fact is long, the link is the fact and the sentence is
a summary of it. Two copies of a derivation is the state this repository refuses everywhere else, and a
reference that restated the findings would be the largest such copy it had.

## The structure

```
reference/
  remotes/
    README.md                 every model: its skins, its record, its folder
    harmony-650/              one folder per model, named harmony-<model>
      README.md               one screen: what it is, architecture and skins, key numbers
      hardware.md             processor, memory, battery, charging, what is inside
      keys.md                 every key, its scan code where measured, the drawing
      display.md              size, colour, touch, raster, what the screen shows and does not
      features.md             device and activity limits, favourites, help, sequences, settings
      behaviour.md            what it does in use: device mode, wording, what a person sees
      memory.md               what is specific to this model, plus the architecture's map
      firmware.md             versions known, safe mode, recovery
      usb.md                  product id, identity fields, commands answered, write standing
      misc.md                 notes that fit no other file
  architectures/
    README.md                 what an architecture is, and which model sits on which
    harmony-600-650-700/      architecture 14: what the three models share, stated once
      README.md, memory.md, firmware.md, usb.md, misc.md, and compiler.md
    harmony-one/              architecture 12: the same five files and compiler.md
    harmony-300-350/          architecture 16, the file based family: the same five files
    harmony-5xx/              architecture 9, measured on the Harmony 525 alone: the same five files
    harmony-880-885/          architecture 8, known from configurations: the same five files
    harmony-890-895/          architecture 10, known from configurations: the same five files
    harmony-touch/            the Harmony Touch's generation: README.md, firmware.md and usb.md
```

The Harmony Touch's architecture number is disputed, the remote reporting one and Logitech's templates
another, so its architecture folder is named for the generation and says why.

**Every model folder holds the same ten files**, including a model where a file says little, because a
missing file reads as "nothing known" and an empty section that says "not checked" reads as what it is.
`packages/silhouettes/test/remotes.test.ts` fails when a folder holds anything else.

**What several models share goes in the architecture folder once**, above all the memory map and the
firmware, and the model folders link to it and state only how they differ. An architecture folder is
named for the models it covers rather than for its number, since the number is this project's handle
and means nothing on the desk; its README says which number it is.

## How to read a footnote

Every fact here carries a named footnote. The **label** says where the argument for the fact is, and
the footnote's **definition**, at the end of the page, opens with the kind of evidence it is and then
links to the argument. On a model page that reads:

```
Logitech's service gives the Harmony 650 a limit of eight devices[^s136].

[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
```

**The labels**, the only forms there are:

| label | where the argument is | the definition links to |
|---|---|---|
| `[^s424]` | section 424 of the findings archive, `docs/findings.md` | that section |
| `[^s424b]` | the same section, backing a fact of a second kind on the same page | that section |
| `[^d25]` | a choice this project made, decision 25 in `docs/decisions.md` | that decision |
| `[^t-name]` | established after the findings archive froze, argued in the header of the test that holds it | that test file |
| `[^x-name]` | a public outside source with no archive section, such as a repair shop's procedure | its public address |
| `[^unchecked]` | nowhere: nobody has established it | nothing |

A label may be used several times on a page and is defined once, in order of first use. One footnote
names one section, so a fact resting on two carries two footnotes.

**The evidence words** open every definition, exactly one of these:

| evidence words | what it is | what it is worth |
|---|---|---|
| **Read in the firmware.** | from the disassembled image of the remote's own firmware | what the code does, not proof the hardware does it |
| **Measured on a unit.** | read off a remote over USB, or with an instrument such as an infrared receiver | what one remote did, on its firmware version |
| **Measured in configurations.** | counted over compiled configuration files | what the files hold, never what the product does. For the Harmony 880/885 and 890/895 it is the only measurement there is, and their pages say so at the top |
| **Stated by Logitech.** | the vendor's word, optionally followed by where: ", in the manual", ", by their service", ", in their client" (their desktop client, see [Logitech's clients](logitech/clients.md)) or ", in their catalogue" (their device database) | the vendor's word, sometimes about a different software generation; one manual edition can differ from another |
| **Stated by a third party.** | a public outside source, such as the comparison table at harmony-remote-forum.de; only with an `x` label | a hypothesis |
| **Chosen by this project.** | a decision rather than a fact about a remote; only with a `d` label | the reasoning in the decision |
| **Not checked.** | nobody has established it, written out on purpose; only with `[^unchecked]` | nothing yet |

**"Not checked" is the footnote that matters most.** Each section ends with the questions nobody has
answered, written as such, because the absence of a statement is exactly what let the clock assumption
through. A fact without a footnote is not a fact here; if something is unclear about how a remote
behaves, it is marked not checked rather than guessed.

Where two sources disagree, both are written down, each with its own footnote, and the disagreement is
left open unless something settles it. [The Harmony 650's device limit](remotes/harmony-650/features.md)
is the worked case: its manual says five and two Logitech tables say eight.

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
