# Harmony 300 and 350: miscellaneous

**The rule for this file** is the model folders' rule: a note goes here only when it fits none of the
other files, and a kind of note that recurs gets a file of its own.

## Why an architecture folder for two screenless models

The two share one firmware image byte for byte, one file table and so one memory map, one product id and
protocol, one container format and slot map, and one moulding, [README.md](README.md). That is the
pattern of the Harmony 600, 650 and 700, and stating it twice would be two copies of one derivation.

## Configurations in the corpus

Five configurations of this architecture are lab fixtures, three of a Harmony 350 and two of a Harmony 300,
and they sit outside the corpus wide totals by decision, section 194 and `packages/lab`. Every one of them
relinks to an address 64 KiB higher and back byte for byte, section 353.

## A configuration names its devices

Raw slot 13 is a ZIP holding `MetaData.xml`, which names the devices and their commands and states the log
area's record layout; its compiler's class path says `binarizer.pepsi`, Pepsi being Logitech's name for
skin 78, section 260.

## Not checked

* Nothing in this file is a claim about a remote beyond the cited sources.
