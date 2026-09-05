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

**P4. The k-th named device is the k-th non-empty group.**<!--superseded--> This is the candidate section 261 recorded
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

## Scored

Scored in `docs/findings.md` section 262 and repeated here so the document carries its own verdict.
Five right or partly right, three wrong.

| | outcome |
|---|---|
| P1, larger than the factory file | **wrong**. 83840 bytes against 121251. A factory configuration carries codes for equipment nobody owns |
| P2, four devices named | right, and the name lengths are his four names in his order |
| P3, two devices with no codes | **half right**. The Chromecast has none, the Playstation has 59, which is the half this document flagged as most likely wrong |
| P4, the k-th device is the k-th non-empty group | supported and not settled. The digit tables put the set top box on the group its position predicts, and the other three are unresolved |
| P5, one activity | not answerable. No reader here reports an activity count on this architecture |
| P6, the number sender rather than digit by digit | right, including the risk it named: the architecture does have the slot, and finding **which** slot is what the read bought |
| P7, the exact cover breaks | **wrong**, and the most useful of the three. It holds on a programmed configuration, so it is a property of this architecture |
| P8, a slot goes from empty to occupied | wrong in the letter, since every slot was already occupied, and right in substance: one went from a count of zero to a count of one, which is what named it |

**What the wrong ones bought.** P1 and P7 were both wrong in the direction of expecting this
architecture to behave like the others, and both corrections are facts about arch 16 that no amount
of reading the factory file would have produced. P3's wrong half is the reminder that a device's
codeset is Logitech's business and not the remote's: a Playstation that cannot be driven by infrared
still arrives with 59 infrared commands.

## A second differential: the Playstation removed

Danny then took the Playstation 3 off the remote, leaving the set top box, the Chromecast and the
television. Written before this read too, and the point of it is narrow: the previous pair moved two
things at once, the device count and the favourites, so raw slots 6 and 8 both grew and neither could
be attributed. This pair moves **one** thing.

**Q1. Raw slot 6 goes from five pointers to four.** It went from four to five when the devices went
from three to four, so if it is one entry per device this is the read that says so. If it does not
move, it tracks something else that happened to change with the devices, and the candidate is dead.

**Q2. Raw slot 8 goes from eight pointers to six.** It moved by two when one device arrived, so two
per device is the arithmetic to test. This is the weaker of the two, since a device that carries no
codes may cost nothing here and the Playstation carried 59.

**Q3. The archive names three devices**, and the one it drops is the Playstation.

**Q4. One infrared group empties**, and it is group 0 or group 2. Group 1 is the set top box, which
the digit tables settled, and the Chromecast has no codes at all, so the Playstation owns one of the
other two and the television owns the other. **This is the read that says which**, and with it the
device to group mapping for every device on the remote.

**Q5. The number sender is untouched**, one record, since the favourites are on the set top box and
that device did not move.

**Q6. The file is smaller again**, by roughly the size of a codeset, since 51 or 45 records leave.

**Q7. The exact cover still holds** on whatever groups remain.

### Scored

Six of the seven yes, in `docs/findings.md` section 263. Q4 was the open one and it is answered: the
Playstation owned group 2, so the devices that carry codes own groups 2, 1 and 0 in the order the
archive names them, which is the **reverse** of the order section 261 proposed as a candidate. That
candidate is refuted rather than confirmed, which is the more useful outcome: it was fitted to a
container where it could not fail.
