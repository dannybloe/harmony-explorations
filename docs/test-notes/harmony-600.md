# Harmony 600 test notes

### Confirmed against the bench remote

The Harmony 600 was plugged into a Mac and enumerated read only, with `ioreg`. No command was
sent to it and no protocol code was involved: this is what the operating system learns at
enumeration and nothing more.

That matters more than an extra sample usually would, because the 600's firmware dump is
truncated before its descriptor block, so everything in this section was previously read from
a remote nobody here owns. It is now measured on the arch 14 remote that will actually be
tested against.

Every field agrees, including `iManufacturer 1, iProduct 2, iSerialNumber 0`, one
configuration, full speed, `bMaxPacketSize0 8`, class and subclass and protocol all as the
images have them, one HID interface with **two** endpoints, 64 byte input and output reports
and a 1 ms report interval.

The endpoint descriptors were read separately, with pyusb, because `ioreg` does not report
them. Also enumeration only: libusb caches a device's descriptors when it enumerates, so
these come out of that cache without an open handle and without a transfer reaching the
remote.

```
046D:C122  bcdDevice 0x1071, so skin 71
  configuration 1: bmAttributes 0xC0, 100 mA
    interface 0 alt 0: class 3, subclass 0, protocol 0
      endpoint 0x81: number 1 in  interrupt 64 bytes every 1 ms
      endpoint 0x02: number 2 out interrupt 64 bytes every 1 ms
```

That is the image's `07 05 81 03 40 00 01` and `07 05 02 03 40 00 01`, field for field,
including the asymmetry: **IN on endpoint 1, OUT on endpoint 2, measured.** With
`bmAttributes 0xC0` and 100 mA from the configuration descriptor as well. Nothing in this
section now rests on the 700 image alone. `tools/usbprobe.py` repeats it.

Two results are worth stating separately.

**`bcdDevice` came back `0x1071`, which was the prediction, and the 600 is skin 71.** The
reading of the field was derived from two images and then predicted a third value before it
was measured.

**The 33 byte report descriptor is byte for byte the 700's**, `81 06` included. So the input
item flag difference described below really does track the architecture rather than the
individual model or firmware version: the live arch 14 remote matches the other arch 14
image, not the arch 12 one. The measured bytes are pinned in `tests/test_usbdesc.py`, which
turns the measurement into a regression test.
## 4. Measured against two bench remotes

Everything above was derived from firmware images. This section is what a host actually observed on
the wire, from `packages/usb`, on **both architectures**:

| | Harmony 600 | Harmony One |
|---|---|---|
| Unit | programmed | the **spare, unprogrammed** one |
| Architecture | 14 | 12 |
| Identified as | `0x046D:0xC122`, `bcdDevice 0x1071` | `0x046D:0xC121`, `bcdDevice 0x1054` |
| Skin, firmware | 71, 0.2 | 54, 3.4 |
| Config at | `0x030000` | `0x040000` |

Read only throughout: `GET_VERSION`, `READ_MISC` and `READ_FLASH`, no writes of any kind by any path.

Which Harmony One is on the bench was determined from the data rather than from the label: 256 bytes
read at `0x040000` are identical to the unprogrammed unit's dump and differ from the programmed one's
at offset 4, which is `end_addr` and therefore the config length.
#### A second prediction, for the Harmony 600, before reading it

Everything above is one remote and one architecture, so it predicts the other. Arch 14 differs where
it matters most: the application runs from **internal** flash with an exec base of `0x9000`, where
arch 12 runs from external NOR. So if the paging is the same, the 600's own firmware is inside this
window and readable.

| Predicted | Why it is worth writing down |
|---|---|
| `0xFE` maps from program address zero, with the three PIC18 vectors | the paging is a property of the command, not of the model |
| an identity block at `0xFF` `+0xF400` holding the three GUIDs `concordance -i` reports for that unit | same offset as the One, which the arch 12 result alone cannot establish |
| `0xFE` `+0x9000` onward is the 600's application firmware | arch 14's exec base, already established from its image |

The third one carries a check worth more than the other two together. The lab holds a dump of the
600's firmware made by other software months ago, `600-0.2-code-base0x9000-TRUNCATED64k.bin`, which
covers program `0x09000` to `0x19000`. **65536 bytes have to match byte for byte.**

And if they do, the 4800 bytes concordance never returned, program `0x19000` to `0x1A2C0`, come back
with them. That is one of the open items at the end of this document, and it would be closed not by
trusting this read path but by 65536 bytes of it agreeing with an answer obtained without it.

Reads needed: 462 through `0xFE` and 674 through `0xFF`, at 62 bytes each.

#### The 600, measured, and the firmware that came with it

All three held.

| Predicted | Measured |
|---|---|
| `0xFE` maps from program zero, PIC18 vectors | `84 ef 07 f0` at `0x0000`, `00 ef 4a f0` at `0x0008` |
| identity block at `0xFF` `+0xF400`, three GUIDs from `concordance -i` | all three present, at `+0x00`, `+0x10`, `+0x20` |
| `0xFE` `+0x9000` is the application firmware | a `48 47` image header, exactly there |

So the paging is a property of the command rather than of the model, and **the identity block sits
at the same offset on both architectures**, which one remote could not have established. One
difference worth recording rather than explaining: the One's second and third GUIDs match in mixed
endian byte order and the 600's in big endian.

The firmware read follows from the third row. 1136 reads of 62 bytes, five seconds, program `0x09000`
to `0x1A2C0` across both pages. Against the truncated dump made by other software months earlier:

```
0xFE page vs dump    28670 bytes compared, 28670 identical, 0 differ
0xFF page vs dump    36864 bytes compared, 36864 identical, 0 differ
unreachable          2 bytes, program 0x0FFFE and 0x0FFFF, the offset clamp
```

**65534 of 65536, no differences**, and the 4800 bytes concordance never returned arrive with them.
The image's own header checksum then verifies over all 70336 bytes, where the truncated file verifies
at no candidate length. `docs/findings.md` section 23.

The two unreachable bytes are a protocol fact worth stating on its own: the firmware clamps the read
offset at `0xFFC0` and a 62 byte read from there ends at `0xFFFD`, so **the last two bytes of each
page cannot be read** by this path. They came from the truncated dump instead, and they are inside
the checksum that verifies.

## The bench 600's memory, as read

What the Harmony 600's memory map recorded about this one unit, kept here when the map's architecture
and model rows moved to `reference/architectures/harmony-600-650-700/memory.md` and
`reference/remotes/harmony-600/memory.md`. Read only throughout: both internal pages whole, and the
configuration region.

* **The configuration** read off the unit from `0x030000` is byte identical to the unit's own `.EZHex`,
  738149 of 738149 bytes.
* **The identity block's three printed values**, the `0xEE` serial field and the two GUIDs, all match
  `concordance -i` for this unit, in order at `+0x00`, `+0x10` and `+0x20`, section 22. Its fourth field
  is erased, so 48 bytes of the 64 are written, section 23.
* **The settings store** held 121 bytes of its 2048: 59 records in the first block and the second block
  erased. Two saved delays were live when section 303 read it, the KPN box's power on delay at 10 tenths
  and the PS3's inter device delay at 15; section 305 cleared the first over USB.
* **The external flash is 2 MiB on this unit**, section 88's measurement: `0x130000` is erased and
  differs from `0x030000`, which is the calibration case and rules out a 1 MiB part that would wrap;
  `0x1F0000` answers; `0x230000` is refused.
* **The read at `0x020000`** was 8192 bytes: the 7115 byte safe mode configuration and 1077 erased
  bytes after it, section 24.
* **`concordance --dump-firmware`** returned the first 64 KiB of the stored application at external
  `0x000000` and nothing past it, section 23.
* **Data memory on this unit** was read live only from section 387 on. The map said "The 600 was not
  measured" for the 0.2 build's data memory until then, which was true when written.
