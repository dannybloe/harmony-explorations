# Predictions for a programmed Harmony 300, written before the read

The bench Harmony 300 was read as it arrived, section 264, carrying a previous owner's configuration
with two devices on it. Danny has now put a real configuration on it through Logitech's service, and
what he found while doing it is the point of this document.

**This model has no activities at all.**<!--superseded--> It has **four device type buttons**, TV, Cable or Satellite,
DVD, and VCR or Aux, and a device is assigned to one of them. That is Danny's account of the client's
own interface, and it agrees with Logitech's product record for the skin, which declares
`PartiallySetupActivities` where the Harmony 350 declares `Activities` and a maximum of one.

He assigned four devices, one to each button: a set top box, a DVD player, a television and a video
recorder. All four send infrared, unlike the Chromecast on the Harmony 350, so this is the first
configuration here in which **every** infrared group should be occupied.

**One conclusion is already available from the as found read and is worth stating before this one.**
Raw slot 6 held three entries for two devices on a remote that has no activities. So the spare entry
in "devices plus one" is **not** an activity, which was the standing candidate from section 263. That
is worth recording whatever this read says.

## The predictions

**P1. Four infrared groups and all four occupied.** Section 264 established that the table is
allocated at the skin's maximum, four here, with the unused groups empty. This is the read that shows
a full one.

**P2. Raw slot 6 holds five entries**, being four devices plus one. If it holds four, the spare entry
tracks something the as found configuration had and this one does not, and the paragraph above is
wrong.

**P3. Raw slot 8 holds nothing**, as on the as found read, since this model declares no long press.

**P4. The archive names four devices**, with name lengths 3, 13, 12 and 8 for the set top box, the DVD
player, the television and the video recorder.

**P5. The group index is the device type button and not a list position.** This is the one this
document is for. The Harmony 350's groups were ordered opposite to the archive's device order, section
263, and the Harmony 300's as found pair fitted the forward order, section 264, which left the whole
question in doubt. If a group is indexed by **which of the four buttons** a device sits on, both
observations can be true and neither ordering rule is right. The read alone cannot settle it; what
settles it is removing a middle device afterwards, since each candidate predicts a different group
going empty.

**P6. No number sender**, since no favourite channels were added.

**P7. The exact cover holds**, every record referenced by exactly one send instruction.

**P8. The file is larger than the as found one**, 41234 bytes, since it has four devices rather than
two and all four send codes.

## Scored

Read on 4 September 2026, 97474 bytes, all fifteen container checks pass. **Six of eight right**, and
both failures were worth more than the six.

| | prediction | outcome |
|---|---|---|
| P1 | four groups, all four occupied | right, 50, 44, 25 and 35 records |
| P2 | raw slot 6 holds five | right |
| P3 | raw slot 8 holds nothing | **wrong**, eight |
| P4 | four devices named, lengths 3, 13, 12, 8 | right |
| P5 | the group index is the device type button | right, and settled rather than suggested |
| P6 | no number sender | **wrong**, one record |
| P7 | the exact cover holds | right, 154 sends over 154 records |
| P8 | larger than 41234 bytes | right |

**P3 is the one that matters.** It was predicted from section 264's reading that raw slot 8 is a per
model field, and the reading was wrong: this remote holds twice its device count like the other model,
and the one configuration that holds nothing was compiled in 2011. So the prediction failed because the
section it was drawn from had attributed a difference to the wrong variable, which is what a prediction
document is for.

**P6 failed because its premise was never checked with the person who knows.** The prediction reads
"no number sender, since no favourite channels were added", and no favourite channel being added was an
inference from Danny having listed the four devices without mentioning favourites. **He entered 1, 2, 3
and 666 on this remote**, which is exactly what the file states. So the prediction is not a failed
prediction at all, it is a prediction built on an invented fact, and the write up that followed it, that
a favourite travels with the account's device and is truncated to the skin's stated maximum, is
withdrawn in section 265. What is left is a known answer check on the favourite channel path, four
chosen in advance and four in the file.

This is the second premise in this document that came from somewhere other than Danny, the first being
the claim below that the model has no activities. Both were stated as background rather than as
predictions, which is exactly why neither was scored: **a prediction document scores its predictions
and not its preamble**, so an assumption placed in the preamble is the one thing in it that nothing
checks.

**The premise in the preamble was withdrawn, and that is the correction to carry.** This document
asserted that the model "has no activities at all" and used it to retire the activity candidate for raw
slot 6's spare entry. Danny withdrew it: the client does offer something, a shortcut that switches
several devices on without remapping the keypad, and Logitech's own product record calls that
`PartiallySetupActivities`. So the candidate stands and this document argued it away on a premise that
was not checked.

**P5 was scored right by a route this document did not name.** It says "the read alone cannot settle it;
what settles it is removing a middle device afterwards". No device was removed: every group was
identified independently in Logitech's device catalogue by the numbers its records send, which named
three of the four outright and left the fourth to the favourites. So the prediction was right and its
stated method was unnecessary, which is the cheaper finding.

Section 265 is the write up.
