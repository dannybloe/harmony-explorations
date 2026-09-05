# Predictions for a programmed Harmony 300, written before the read

The bench Harmony 300 was read as it arrived, section 264, carrying a previous owner's configuration
with two devices on it. Danny has now put a real configuration on it through Logitech's service, and
what he found while doing it is the point of this document.

**This model has no activities at all.** It has **four device type buttons**, TV, Cable or Satellite,
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
