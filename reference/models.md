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
| 8 | 720, 785, 880, 882, 885 | 5 | four config samples, no hardware |
| 9 | 510, 515, 520, 522, 525, 550, 555 | 7 | one config sample (525), no hardware |
| 10 | 890, 895, and presumed 890 Pro, 892, 897 | 5 | nothing |
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

## Not recorded here

Which models this project or FreeHarmony would support, and in what order. That is a product
decision, it belongs to FreeHarmony, and FreeHarmony has not started. This file is the external
fact only.
