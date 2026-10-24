# Predictions for a Harmony 300, written before it was read

The bench has a Harmony 300 as well as the Harmony 350, and sections 262 and 263 rest entirely on the
one remote. Logitech's product table separates the two models in the places that matter, which is what
makes this a test rather than a second sample:

| | Harmony 300, skin 78 | Harmony 350, skin 104 |
|---|---|---|
| `MaxDevicesPerAccount` | **4** | 8 |
| `MaxFavoriteChannels` | 5 | 5 |
| `MaxActivities` | absent | 1 |
| activity capability | `PartiallySetupActivities` | `Activities` |
| `LongPressAction` | absent | present |

**Nobody here has programmed this unit**, so whatever is on it is what it shipped with or what a
previous owner left, and the device count is unknown before the read. That weakens nothing in P3 to
P5, which are arithmetic in the device count rather than claims about a particular number, and it is
the honest reason no prediction below names one.

## The predictions

**P1. The read works with no new code.** Same family, same protocol, `/cfg/usercfg` on the allow list.
The product id will differ from the 350's `0xC124` and `isFileBasedRemote` should already report it.

**P2. It states architecture 16 and skin 78**, in its own `/sys/sysinfo`, agreeing with what
concordance reported for it in section 195 and with section 197's map.

**P3. Its infrared table declares four groups, not eight.** This is the sharp one. All three Harmony
350 containers declare eight groups whatever the device count, and eight is that skin's stated maximum,
where base slot 5 on every other architecture here holds exactly one group per device. If the 300
declares four, the table is allocated at the model's maximum and that is a rule across two models. If
it declares eight, then eight is a constant of the architecture and the agreement with the 350's
maximum was a coincidence, which would be worth knowing and is the outcome this document expects less.

**P4. Raw slot 6 holds one entry per device plus one**, as on the 350, **and the interesting case is if
it does not.** The spare entry is a candidate for the activity, and this model's capability list offers
`PartiallySetupActivities` rather than `Activities`, so a 300 with no activity on it would hold devices
and not devices plus one. Either answer says something: the arithmetic transferring means the extra
entry is structural, and it not transferring points at the activity.

**P5. Raw slot 8 holds two entries per device.**

**P6. The container has fifteen pointer slots and passes all fifteen structure checks**, with the four
byte end marker appended the way section 262 established, since the file's stated length excludes it.

**P7. The configuration carries a metadata archive** naming its devices and commands, as both Harmony
350 containers and the two Harmony 890 ones do.

**What this cannot answer.** Whether the 300 can hold an activity at all, since its product record
states no maximum rather than stating zero, and `PartiallySetupActivities` is a capability nothing here
has read. That is a question for Logitech's client or for the firmware, and the firmware is the same
image for both models.

## Scored

Five right, one half wrong and one wrong, in `docs/findings.md` section 264.

P3 came out the way this document hoped: **four groups**, the model's stated maximum, so the infrared
table is allocated by the skin across two models rather than being one model's constant.

P2 was half wrong in an interesting direction. The unit states skin **79** and not 78, and both are a
Harmony 300, 78 for one region and 79 for the other. Its `bcdDevice` says 78, which is where section
195 read it, so the descriptor names the family's base skin and the remote names its own variant.

P5 was wrong and is the useful failure: raw slot 8 holds **nothing** where devices times two predicted
four, so that arithmetic was an artefact of the one model it was measured on.

P4 held, so devices plus one is structural. What this document hoped it might settle, whether the spare
entry is the activity, it does not: the answer would have been informative only if the arithmetic had
broken.
