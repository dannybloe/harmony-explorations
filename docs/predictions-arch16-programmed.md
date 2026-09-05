# Predictions for a programmed Harmony 350, written before the configuration was read

The bench Harmony 350 held its factory configuration, which exercises almost nothing: three device
groups, one hundred and thirty infrared records, no favourites, and nine of its fifteen container
slots that nothing here could name. Danny programmed it on the test account by copying the settings
of his Harmony 600, so the two remotes now carry the same equipment.

**What he set up**, in his words and before the read:

* four devices, a Sony Playstation 3, a KPN VIP1853 set top box, a Google Chromecast and a Panasonic
  TX-P42GT30E television
* one activity, Watch TV
* five favourite channels on the set top box, numbered 1, 2, 3, 4 and 666

The point of writing this down is the one section 194 and section 125 both make: a reader that is
run first and interpreted afterwards agrees with itself. These are scored in `docs/findings.md` after
the read, wrong ones included.

## The predictions

**P1. The configuration is larger than the factory one**, which is 121251 bytes. Anything smaller
means the sync did not land and the read is of the old file.

**P2. The metadata archive names four devices.** The factory file names three and all 165 of their
commands. The archive is the only naming route on this remote, so this is also the check that the
archive tracks the configuration rather than being a factory artefact. The names should be the ones
on his screen rather than the manufacturer's model numbers.

**P3. Two of the four devices carry no infrared codes at all.** A Playstation 3 is driven by
Bluetooth and a Chromecast has no infrared receiver, and his own screen marks both with a warning
badge where the television and the set top box carry none. So the expectation is codes for the
television and the set top box and empty groups for the other two. **This is the prediction most
likely to be wrong**, because Logitech does sell an infrared adapter for a Playstation 3 and their
catalogue carries codesets for it, so the device may well arrive with a full codeset that nothing on
this remote can usefully send.

**P4. The k-th named device is the k-th non-empty group.** This is the candidate section 261 recorded
and could not settle, and this configuration is the case that settles it: if two groups are empty and
the naming still lines up by skipping them, the rule holds against a real test rather than against a
file where it could not fail.

**P5. One activity.** Whatever slot holds them on this architecture carries exactly one entry.

**P6. The five favourites go through the number sender, not digit by digit.** Section 156 measured
both routes on a Harmony One: a channel that survives being written as an integer gets one record in
the number sender slot per device, and one that does not, meaning anything with a leading zero, is
spelled out as one action list per digit. All five of these are plain integers, so the prediction is
one number sender record for the set top box and five action lists, and **no** new infrared group.
The risk here is that the number sender is an arch 12 mechanism and this architecture has fifteen
slots rather than twenty two, so it may have no such slot at all, in which case every favourite is
spelled out.

**P7. The send instruction still covers the records exactly.** Section 261 measured every infrared
record of the factory file referenced exactly once, contiguously within its group. A programmed
configuration is where that could break, since a device's codeset can now hold codes no activity
binds. **So the honest prediction is that it breaks**: the cover stays inside the group and stops
being complete, which is what every other architecture does.

**P8. At least one of the nine unread slots is no longer empty.** The factory file cannot say whether
a slot is unread or simply unused, and this is the file that can.
