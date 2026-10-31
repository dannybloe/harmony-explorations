# Harmony 300 and 350: miscellaneous

**The rule for this file** is the model folders' rule: a note goes here only when it fits none of the
other files, and a kind of note that recurs gets a file of its own.

## Why an architecture folder for two screenless models

The two run applications that are one program but for one routine, [firmware.md](firmware.md#the-two-models-images-compared)[^t-harmony-300-350-images], both named by one package[^s196], one file table and so one memory map[^s199], one
product id and protocol[^s193][^s195], one container format and slot map[^s194][^s259], and one
moulding[^t-moulding], [README.md](README.md). That is the pattern of the Harmony 600, 650 and 700, and
stating it twice would be two copies of one derivation.

## A configuration is linked for its address

Every configuration of this architecture measured relinks to an address 64 KiB higher and back byte for
byte, which is the same property the other architectures' configurations have[^s353].

## A configuration names its devices

Raw slot 13 holds a metadata archive naming the devices and their commands and stating the log area's
record layout, [the metadata archive](../../config-format/container.md#the-metadata-archive), with
[the container's slots for this family](../../config-format/container.md#the-harmony-300-and-350s-slots).
Its compiler's class path says `binarizer.pepsi`, Pepsi being Logitech's name for skin 78[^s260][^s197].

## Not checked

* Nothing in this file is a claim about a remote beyond the cited sources.

[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^s199]: Read in the firmware. [Section 199](../../../docs/findings.md#s199)
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s194]: Measured in configurations. [Section 194](../../../docs/findings.md#s194)
[^s259]: Read in the firmware. [Section 259](../../../docs/findings.md#s259)
[^t-moulding]: Measured on a unit. [The test](../../../packages/silhouettes/test/models.test.ts)
[^s353]: Measured in configurations. [Section 353](../../../docs/findings.md#s353)
[^s260]: Measured in configurations. [Section 260](../../../docs/findings.md#s260)
[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^t-harmony-300-350-images]: Read in the firmware. [The test](../../../tests/test_harmony_300_350_images.py)
