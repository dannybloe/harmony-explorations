# What each model's hardware can do

The join a user interface needs: a connected remote reports a **skin** number, the skin names a model,
and the model has capabilities. `packages/usb/src/models.ts` is this table in executable form, which is
where a caller should read it from; this page is the argument and the verification status.

**A config cannot answer this question.** It states its architecture, section slot 1, and an
architecture spans a monochrome and a colour panel at once: the 600 and the 650 are both arch 14. So
anything that renders a screen needs the model, not the file.

## The source, and what it is worth

The capability columns come from the comparison table at
`harmony-remote-forum.de/harmony_compare.php`, read on 11 August 2026. It is a community site, a
private non commercial project by one person per its own Impressum, and its disclaimer says plainly
that no warranty of currency, correctness or completeness is given. So it has the standing of an
upstream finding: a generator of hypotheses, good enough to decide what to build, never the basis of a
rail. That is the same rule `docs/host-client.md` applies to Logitech's own client, and it is why every
row below carries a verification column.

**Parsed rather than summarised, and that mattered.** A first pass asked a summarising reader for the
values and it got the sound and picture column wrong on at least three models, including the Harmony
One. The table below comes from the page's own HTML, cell by cell. When a source is a table, take the
table.

**Two structural facts the summary would have hidden.** The comparison table has a comment column, and
in it the 520 says `Eur#525`, the 510 says `Eur#515`, the 550 says `Eur#555`, the 720 says `Eur#785`,
the 880 says `Eur#885` and the 890 says `Eur#895`. So those are not six pairs of models but six models
with two regional names, which is exactly what the skin table in `reference/models.md` shows from the
other side: skin 18 is the 520 and skin 22 the 525. **A skin names a region, a model owns several
skins.** And the 5xx has no page button, which is not a gap but the explanation of something already
measured here, below.

**The images are not usable and are not here.** The page's product photos carry no licence to third
parties: its terms grant rights to the operator, not to visitors, and the photos are most plausibly
Logitech's own. They are in the private lab as bench reference, full size only. **Drawn is the answer**,
and `reference/silhouettes/` is where those live: one shape per button with an id, no grey and no fill
bar the teletext keys, so a drawing is our own work. All three bench remotes are drawn.

**What a silhouette is good for is narrower than "the button map in a form code can address", which is
what this said for a day.** Every key in all three files sits on a horizontal axis, and on a real Harmony
many rows sit at an angle or follow a curve across the face. So the case contour is measured and the
placement inside it is schematic: the drawings say which keys exist and roughly where, and they are not
accurate enough to put a hit region on a screen. Thirty three further drawings were started on 11 August
2026 and stopped for exactly that reason, by the owner, who saw it in the output. The rule the case
outline already follows, sample the photograph rather than draw the obvious shape, has to apply to the key
rows too before the fleet is worth having, and the work is parked until FreeHarmony needs it.

**Two of the three counts are confirmed and the third cannot be**, which is the useful thing the set
says. The 525 came out at **fifty**, what section 89 derived from the firmware and the config before
anything was drawn. The 600 came out at **54**, which section 17 gets from the key table's field split
and section 48's hardware census gets from a per column distribution of 14, 14, 13 and 13, so three
routes agree. The One came out at **44** and nothing checks it: section 48 explains why, since sixteen
of its buttons share one sense line and a USB census on arch 12 yields nothing at all. So the first
two drawings are third independent counts of numbers that had cost a firmware read and a census, and
the third is a first count with no cross check, marked as such.

**A silhouette belongs to a skin, not to a model**, which the photographs establish and which matters
for the table above: the two images of the 520 and 525 pair differ by exactly four teletext colour
keys, and the 880 and 885 pair splits the same way. Two independent pairs, one feature, and a
mechanism, since teletext is European. **Which name carries them is settled on one pair only**: the
885's own face says 885. Both 5xx images say "Harmony 520" on the face, so there the direction rests on
the community site's file naming and the analogy, which is upstream standing and not measurement.

## The models this library can address

Arch 2 through 14. Arch 15, the 900, 1000, 1000i, 1100 and 1100i, enumerates as a network class rather
than HID, so `packages/usb` cannot reach it and it is deliberately absent rather than listed as
unknown. `reference/models.md` has the architecture map and the full skin table.

| skin | model | Eur name | arch | max dev | fav | panel | touch | RF | macros | page btn | snd/pic | fw seen | verified |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 54 | One | | 12 | 15 | 24 | colour | **yes** | | yes | yes | no | 3.4.0 | skin, arch, touch, fw; devices consistent |
| 71 | 600 | | 14 | 5 | 23 | **monochrome** | no | | yes | yes | no | 0.2 | skin, arch, panel, touch, fw; devices consistent |
| 72 | 650 | | 14 | 8 | 23 | colour | no | | yes | yes | no | 0.2 | skin, arch; devices were a copy of the 600's, section 136; fw is a lower bound, the lab holds 0.4 |
| 66 | 700 | | 14 | 8 | 23 | colour | no | | yes | yes | no | 2.5.0 | skin, arch, touch; devices **not** confirmed, section 136; fw is a lower bound, the lab holds 2.8 |
| 22 | 525 | 520 | 9 | 12 | | monochrome | no | | yes | no | no | 3.0 | skin, arch, fw; page button consistent; devices 12 per the live service, 4 held |
| 18 | 520 | 525 | 9 | 12 | | monochrome | no | | yes | no | no | 3.0 | arch; the 525's row, same remote |
| 68 | 510 | 515 | 9 | 5 | | monochrome | no | | yes | no | no | 3.4.0 | arch only |
| 67 | 515 | 510 | 9 | 5 | | monochrome | no | | yes | no | no | 3.4.0 | arch only |
| 36 | Xbox 360 | | 9 | 11 | | monochrome | no | | yes | no | no | 3.0.0 | arch only |
| 15 | 880 | 885 | 8 | 15 | 16 | colour | no | | yes | yes | no | 4.4.2 | skin, arch, touch; devices consistent |
| 17 | 885 | 880 | 8 | 15 | 16 | colour | no | | yes | yes | no | 4.4.2 | skin, arch; the 880's row, same remote |
| 19 | 890 | 895 | 10 | 15 | 16 | colour | no | 6 | yes | yes | no | 4.9.0 | arch, touch |
| 23 | 895 | 890 | 10 | 15 | 16 | colour | no | 6 | yes | yes | no | 4.9.0 | arch; the 890's row, same remote |
| 65 | 610 | | 7 | 5 | 23 | monochrome | no | | yes | no | no | 3.5.0 | arch only |
| 13 | 628 | | 7 | 12 | | monochrome | no | | yes | no | no | 4.1.0 | arch only |
| 9 | 659 | | 7 | 15 | 18 | monochrome | no | | yes | yes | yes | 4.1.0 | arch only |
| 12 | 676 | | 7 | 15 | 18 | monochrome | no | | yes | yes | yes | 4.1.0 | arch only |
| 14 | 680 | | 7 | 15 | 18 | monochrome | no | | yes | no | yes | 4.1.0 | arch only |
| 10 | 688 | | 7 | 15 | 18 | monochrome | no | | yes | yes | yes | 4.1.0 | arch only |
| 3 | 768 | | 3 | 15 | | monochrome | no | | yes | no | no | | arch only |
| 7 | 748 | | 3 | 15 | | monochrome | no | | **no** | no | no | | arch only |

Eight more models have capability data and **no skin number anywhere**, so a connected one cannot be
recognised: the 550 and 555, the 620, the 665, the 670, the 720 and 785, the 745, the 880 Pro and the
890 Pro. They are in `MODELS_WITHOUT_A_SKIN` rather than dropped, because an empty list there would
suggest the skin table is complete and it is not.

## What is verified, field by field, and how

The verification column above is per model. This is the same thing per field, which is the more useful
cut, because a field is either checkable here or it is not.

| field | standing | how |
|---|---|---|
| skin, architecture | **confirmed** for six skins | 15, 22, 54, 66, 71, 72, from firmware literals and live remotes, none of which consulted the client's table. `reference/models.md` |
| touch screen | **confirmed, including its negative** | base slot 17 is a touch hit map on arch 12 and names the picture bank everywhere else, sections 45 and 62. The One is the only arch 12 model and the only one this table calls touch, so the two agree without either being derived from the other |
| panel | **confirmed for the 600 only, and confirmed not derivable from a config** | the owner has the remote and its screen is monochrome. Its config still carries two byte pixels, 43 distinct low bytes and 96 distinct high bytes over 15 raw pictures, and only 3.3% of its values are grey read as RGB565. So the format is the architecture's and the panel is the model's, and a renderer cannot infer one from the other |
| page button | **consistent, and it explains a measurement** | the 5xx has none, and the four soft keys on a 525 carry opcode `0x7E`, "enter the base slot 6 mode the operand indexes", 57 and 18 times across its two configs. So paging is a soft key binding there rather than a missing feature |
| max devices | **bounded below only, and the earlier claim was circular** | a device is an infrared group, section 86. This row claimed consistency at a limit<!--superseded--> on the strength of the 700's config holding exactly 6 against a stated 6, and the stated 6 had been set from that same count, section 136. A config holding six devices forbids no seventh. **No sample reaches any stated maximum**: the 600 holds 4 of 5, the One 5 of 15, the 525 4 of 12, the arch 8 sample 3 of 15, the 700 6 of 8. What is confirmed is that nothing exceeds its figure, and the figures themselves rest on two vendor tables that agree on 28 of 35 skins |
| macros | **consistent** | every architecture read here runs action lists of many instructions, section 34. The 748's lone "no" is unchecked, since nothing here has an arch 3 sample |
| firmware seen | **contradicted as a ceiling, correct as a floor** | the table says 2.5.0 for the 700 where the lab holds 2.8, and 0.2 for the 650 where it holds 0.4. It is right about the three bench remotes: 3.4.0 on the One, 0.2 on the 600, 3.0 on the 525 |
| favourites, battery, RF channels, sound and picture buttons | **unchecked** | nothing measured here bears on any of them |

## What this is for

Three things a user interface cannot do without it.

**Render a screen.** The panel is the model's property, per above, so a picture's bytes are not enough.

**Know whether a touch map exists.** `architectureHasTouch` answers it from this table rather than from
a guess about a model number, and it is the same answer the firmware gives.

**Refuse an edit that the hardware cannot carry.** `maxDevices` is the host software's own limit, and
the one sample at that limit is the 700, so a sixth device on a 700 is the last one it will take.

## What would improve it

The verification column is mostly "arch only" below the six confirmed skins, and that is honest rather
than fixable from here: it needs either a sample or a remote per model. The cheapest improvements, in
order: a config from any arch 7 or arch 10 remote would confirm a skin and its panel at once, since
`GET_VERSION` names the skin and section slot 1 names the architecture; and asking a contributor to say
which model a dump came from turns a row from "arch only" into a confirmed skin for the price of an
email. `tools/corpus.py` already reports which dumps have no description, which is the same gap seen
from the other end.
