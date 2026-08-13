# Models Logitech retired on 28 May 2025

## Source

<https://members.harmonyremote.com/EasyZapper/Help/FAQShowById.asp?FaqId=1220>, retrieved
6 August 2026, still live at that date. Headed "Notice: Discontinuation of Logitech Harmony
Remote Software", with the model list under "Remotes Affected".

The notice says account creation and account access ended on 28 May 2025, so the listed remotes
"will continue to function as they are with their current settings, but no updates or
reconfigurations are possible". It closes with "All other remotes will continue to be supported
through the MyHarmony app or the Harmony mobile application", which dates the list rather than
describing the situation now.

Recorded here because the page is a single point of failure and the list is a useful external
statement of which remotes were served by which of Logitech's two platforms.

## The list, verbatim

Forty two entries, forty distinct models: `Harmony 555` and `Harmony 785` each appear twice.

Harmony 510, Harmony 515, Harmony 520, Harmony 522, Harmony 525, Harmony 555, Harmony 550,
Harmony 555, Harmony 610, Harmony 620, Harmony 628, Harmony 659, Harmony 655, Harmony 660,
Harmony 670, Harmony 675, Harmony 676, Harmony 680, Harmony 688, Harmony 720, Harmony 745,
Harmony 748, Harmony 768, Harmony 785, Harmony 785, Harmony 810, Harmony 820, Harmony 850,
Harmony 880, Harmony 882, Harmony 885, Harmony 890, Harmony 890 Pro, Harmony 892, Harmony 895,
Harmony 897, Harmony 900, Harmony 1000, Harmony 1000i, Harmony 1100, Harmony 1100i,
Harmony for Xbox 360

## By architecture

Architectures are concordance's, from its `SupportedModels.md` table. Where that table names a
family rather than a model, the individual model is marked presumed: it shares a number range and,
in the 89x cases, a skin name in `libconcord/remote_info.h`, which is suggestive and not a
measurement.

| arch | models on the list | count | what this project has |
|---|---|---|---|
| 2 | 745 | 1 | nothing |
| 3 | 748, 768 | 2 | nothing |
| 7 | 610, 620, 628, 655, 659, 660, 670, 675, 676, 680, 688 | 11 | nothing |
| 8 | 720, 785, 880, 882, 885 | 5 | six config samples from two contributors, two application firmware images and two bootloaders, no hardware |
| 9 | 510, 515, 520, 522, 525, 550, 555 | 7 | **hardware on the bench**, a Harmony 525: two configs, a safe mode container, and its whole internal flash |
| 10 | 890, 895, and presumed 890 Pro, 892, 897 | 5 | two Harmony 890 configs and five further reads of them, no firmware, no hardware. Every reader but the container framing is gated, section 117 |
| 15 | 900, 1000, 1000i, 1100, and presumed 1100i, Xbox 360 | 6 | nothing, and see below |
| unknown | 810, 820, 850 | 3 | nothing, and concordance does not name them either |

Two things follow directly.

**Not one of the forty is arch 12 or arch 14**, the two architectures this project has hardware
for. The list is the old EasyZapper platform; the One, the 600, the 650 and the 700 were served by
MyHarmony and are absent from it. Everything measured here transfers to these models only as far as
the container and the protocol are genuinely shared, which is exactly what is not yet known.

**Arch 15 is out of reach of the transport, not just unimplemented.** The 900, 1000, 1000i, 1100
and 1100i enumerate as a network class rather than plain HID, so `packages/usb` cannot address them
at all. That is six of the forty behind a different transport.

## The number range does not predict the architecture

The list contains 610 through 688 but not 600, 650 or 665. Those three are arch 14, the same
architecture as the Harmony 600 on this bench, and they stayed on MyHarmony. So a 6xx model number
covers both arch 7 and arch 14, and the split is by platform generation rather than by number.

Do not infer an architecture from a model number. Read it out of the config, per
`docs/config-format.md`: section slot 1 states it.

## The platform codenames, and the skin number of every model

*Source: Logitech's own classic desktop software, per `docs/host-client.md`. Client-sourced and
therefore unconfirmed except where this project has measured the same number, which is marked.
The tables are restated here rather than copied; the extraction is in the private lab.*

The client identifies a connected remote in two steps that this project had only half of. First
the USB product id names a **platform**, in Logitech's internal codenames, several models to a
platform. Then a **skin number** selects the model within it.

| vendor | product | platform |
|---|---|---|
| `0x046D` | `0xC110` | Espresso |
| `0x046D` | `0xC111` | Mocha |
| `0x046D` | `0xC112` | Cappuccino |
| `0x046D` | `0xC113` | Sugar |
| `0x046D` | `0xC114` | Whisky |
| `0x046D` | `0xC11F` | Cognac, Hennessy and Vodka together |
| `0x046D` | `0xC121` | **Gin**, confirmed: the Harmony One on this bench |
| `0x046D` | `0xC122` | **Molson**, confirmed: the Harmony 600 on this bench |
| `0x0400` | `0xC359` | the older 6xx and 7xx remotes |

The last row is worth noticing: those remotes do not enumerate under Logitech's vendor id at all.
Anything that finds remotes by scanning for `0x046D` will never see one.

`Gin` is the name this project already used for arch 12, taken from the same source in section 81
before the rule in `docs/host-client.md` existed. It is recorded properly here.

**Six of these names are corroborated by a file Logitech shipped rather than by the client**, which
matters because the client is the weaker source. The firmware packages in the lab carry a
`NOTINTENDED` list of architectures they refuse, with a comment naming each: architecture 8 is
Espresso, 9 Mocha, 10 Cappuccino, 11 Cognac, 12 Gin and 14 Molson, and 2, 3, 6 and 7 are named by
model number rather than by codename. `docs/findings.md` section 7 has the table and section 87 the
rest of what those comments settle. So the platform to architecture mapping does not rest on the
decompiled client at all.

**One product id is several models.** `0xC122` covers the 600, the 650 and the 700, which is why
`packages/usb` cannot identify a model by product id alone and why `openHarmony` refusing an
ambiguous selector was the right call for a reason nobody had written down.

### Skin numbers

Forty six entries. The five this project has measured independently all agree exactly, which is
the calibration: they were derived from firmware literals and from live remotes, and the table
was not consulted to produce any of them.

| skin | model | skin | model |
|---|---|---|---|
| 3 | 768 | 45 | Corona, EMEA |
| 7 | 748 | 48 | Mocha Grande, EMEA |
| 9 | 659 | 49 | Cognac |
| 10 | 688 | 50 | Khalua |
| 11 | 655 | 52 | Cognac, Australia |
| 12 | 676 | 53 | Cognac, EMEA |
| 13 | 628 | **54** | **Gin, confirmed: the Harmony One** |
| 14 | 680 | 55 | Cognac Pro |
| **15** | **880, confirmed from four configs** | 56 | Cognac Pro, Australia |
| 16 | 675 | 57 | Cognac Pro, EMEA |
| 17 | 885 | 58 | Baileys |
| 18 | 520 | 60 | Vodka S |
| 19 | 890 | 61 | Vodka |
| 20 | 891 | 62 | Hennessy, AMR |
| 21 | 892 | 63 | Hennessy, EMEA |
| **22** | **525, confirmed: the bench remote** | 64 | Hennessy, AUS |
| 23 | 895 | 65 | 610 |
| 24 | 896 | **66** | **700, confirmed from two configs** |
| 25 | 897 | 67 | 515 |
| 36 | Xbox 360 | 68 | 510 |
| 39 | Espresso Pro | **71** | **600, confirmed: the bench remote** |
| 40 | Cappuccino Pro | **72** | **650, confirmed from its safe mode container** |
| 41 | Mocha Grande | | |
| 44 | Corona, AMR | | |

**This table is incomplete, and the two numbers it lacks are the two that cost the most time.**
Section 81 found that two containers carry a skin the remote does not report, 59 on a Harmony One and
73 on a Harmony 600, and both are absent here. Two rules were derived from that absence and both are
dead, `reference/superseded.md`: the second and better one said each was "the first free number above<!--superseded-->
the run containing that remote's own skin", which is exact on both cases and predicts nothing.

**59 is the Harmony One EMEA and 73 is the Harmony 600 EMEA.** Section 131, from
`ProductsManager/GetAllProducts` on the live service, which lists 80 skins below 100 against the 46
here and pairs 14 base model names with a regional variant each. The arithmetic worked because
Logitech allocated each European variant immediately above the run its American sibling sat in.

So **the table predates MyHarmony**, which is why the later models and every European variant are
missing from it, and why it must not be treated as the complete numbering. What it is still good for
is the codenames, which the live catalogue does not carry, and as the corroboration for the numbers
both sources hold.

### The live catalogue, which resolves seventeen codenames

*Source: `ProductsManager/GetAllProducts`, read 13 August 2026 from a plain logged in session with no
Harmony account record and no remote. Vendor stated and current, so it is the stronger of the two,
and it agrees with the classic table on every skin both name.*

| skin | this table called it | the service calls it |
|---|---|---|
| 20 | 891 | RF Wireless Extender |
| 24 | 896 | RF Wireless Extender, EU |
| 39 | Espresso Pro | Harmony 880 Pro |
| 40 | Cappuccino Pro | Harmony 890 Pro |
| 41 | Mocha Grande | Harmony 550 |
| 44 | Corona, AMR | Harmony 720 |
| 45 | Corona, EMEA | Harmony 785 |
| 48 | Mocha Grande, EMEA | Harmony 555 |
| 49 | Cognac | Harmony 1000 |
| 50 | Khalua | Harmony 670 |
| 52 | Cognac, Australia | Harmony 1000i |
| 53 | Cognac, EMEA | Harmony 1000EU |
| 55 | Cognac Pro | Harmony 2000 Pro |
| 58 | Baileys | Harmony 620 |
| 60 | Vodka S | Harmony 900 EMEA |
| 61 | Vodka | Harmony 900 |
| 62 | Hennessy, AMR | Harmony 1100 |
| 63 | Hennessy, EMEA | Harmony 1100eu |
| 64 | Hennessy, AUS | Harmony 1100i |

Nineteen rows, of which the two extender entries are the only disagreement rather than a translation:
this table names them 891 and 896, the service calls both an RF Wireless Extender. Everything else is
the same product under two naming schemes.

And the skins neither table had, all regional variants of models already listed: 59 Harmony One EMEA,
69 Harmony 700 EMEA, 73 Harmony 600 EMEA, 74 Harmony 650 EMEA, 75 Harmony 665, plus the Harmony 200,
300, 350 and 800, the Olive, the Telus Advanced Remote, nine Monster AVL models and four Harman Kardon
TC 30 variants. `packages/usb/src/models.ts` takes only those whose architecture is known from the
table above; the rest are a recorded gap, because a capability record with an invented architecture is
worse than no record.

## Three protocol families, and only one of them is addressable

Architecture is a config format property. It is not the same question as how the host talks to the
remote, and for deciding whether a given model is worth connecting the second question decides
more. Concordance's source separates its remotes into three classes, and the split is visible in
which operations each class implements rather than in any table.

| family | models | how the host reads a config | what else is reachable |
|---|---|---|---|
| flash addressed | arch 2 through 14, so everything on the list above except the 900, 1000 and 1100 | `READ_FLASH` at an address | firmware, RAM, misc registers, the whole memory map |
| network | arch 15: 900, 1000, 1000i, 1100, 1100i | a network class interface, not HID | not investigated here |
| file based | 200, 300, Link, Hub, Touch, Ultimate, and presumably 350 and 950 | reading a **named file**, `/cfg/usercfg` | nothing: flash, RAM, misc and firmware are all refused |

The third row is the one that surprises. Those remotes are HID, 64 byte reports, and they
enumerate in the same Logitech product range, so the transport in `packages/usb` reaches them.
What they do not have is an address space. Concordance's read for them takes an address argument
and ignores it, and its RAM read, misc read, flash write, erase and both firmware calls all return
"unsupported" rather than doing anything.

For this project that closes the door rather than narrowing it. **No firmware can be read off
them**, so the doctrine that the firmware is the authoritative spec has no entry point, and **no
RAM can be polled**, so the live polling that stands in for the emulator does not work either. The
one thing they do offer is a user config, and the end marker concordance expects from them is
`PTYY`, which says the `GSPM` container survived into that generation.

**The Harmony 350 is not classified.** Concordance names it in its model table and nowhere else: it
is absent from the architecture table and from the list of file based product ids. It arrived after
the Touch, so the file based family is the likely home, but that is a guess from chronology and
this file will not record it as anything more.

## Not recorded here

Which models this project or FreeHarmony would support, and in what order. That is a product
decision, it belongs to FreeHarmony, and FreeHarmony has not started. This file is the external
fact only.
