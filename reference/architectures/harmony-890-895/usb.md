# Harmony 890 and 895: USB

A Harmony 890 or 895 does not speak the command protocol the other remotes described here speak over
their cable. It wraps a datagram protocol inside the USB channel and offers named services through it, so
none of the commands in [the USB protocol](../../usb-protocol/README.md) reaches it. Its configurations
were read off remotes by a tool that implements that tunnel, and those reads come back damaged often
enough that a configuration of this architecture has to be checked before it is believed.

## The tunnelled transport

| | value | source |
|---|---|---|
| vendor and product id | `0x046D:0xC112`, Logitech's **Cappuccino** platform | [^s207] |
| what Logitech's classic client puts on the channel | a datagram processor wrapping the USB device channel, then services addressed through it: system, diagnostic, update, learn infrared, time, a remote interface and a Z-Wave module | [^s207] |
| what concordance does with it | routes `0xC112` to `0xC115` to a separate class, whose first command is named for initiating a TCP channel | [^x-concordance] |
| the platforms beside it on the same transport | Sugar, `0xC113`, and Whisky, `0xC114`; the Harmony 1000 family's `0xC11F` takes a third transport again | [^s207] |

**Two sources with nothing in common agree on the boundary**: Logitech's client hands these product ids to
a different channel from the one it uses for the Harmony 525, the Harmony One and the Harmony 600, 650 and
700, and concordance routes them to a different class.[^s207][^x-concordance] So a host that speaks the
command reports has nothing to say to one of these remotes, however it enumerates.

**`bcdDevice` is not read from this family here**, and its encoding is not known: `0x0A` in the high byte
is the obvious guess and is deliberately not implemented. The skin comes out of a configuration's own
architecture record instead.[^s113][^s182]

## A read can insert bytes without losing any

**Every read of a configuration off one of these remotes that has been measured came back with whole 54
byte chunks duplicated**, between 2 and 28 of them, with nothing ever lost.[^s122] A duplicate that lands in
the zero fill past the container's end is harmless; one that lands inside it moves everything after it,
and the file still parses and still resolves every pointer. One remote read twice gave a byte identical
container both times; another read twice gave two different files, neither of them the configuration.[^s122]

**Removing the duplicates closes it**: on the damaged reads, deleting one copy of each repeated chunk lands
the container on exactly 396225 bytes, the size the clean reads have, puts the end marker exactly where the
header says and makes the trailer checksum recompute to the value the file declares, which the repair never
touched.[^s122]

**What catches it is two checks, and neither alone**: the trailer checksum, which the remote's own boot
validator computes, and the end marker's position against the header's declared end. A duplicated run of
zeros leaves the checksum unchanged, and the checksum cannot see two transposed words. The length a file's
own wrapper declares is no check at all, since the tool writes it afterwards from what it received.[^s122]
The container checks report both on any file, `end_addr_points_at_end_marker` and
`trailer_checksum_recomputes`.[^s115]

**So a failed check is a reason to read the remote again**, not to reason about the file: of five reads of
one Harmony 895, three were byte identical and two differed, and the consensus is the configuration.[^s177]
Whether the remote or the tool duplicates the chunks, and why the unit is 54 bytes, is not known; every
damaged stream ends 27 bytes past a multiple of 54.[^s122]

## Not checked

* Anything on a cable here: the descriptors, the services, the datagram format.[^unchecked]
* Whether a read through Logitech's own client damages a configuration the same way.[^unchecked]

[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s113]: Measured in configurations. [Section 113](../../../docs/findings.md#s113)
[^s182]: Measured in configurations. [Section 182](../../../docs/findings.md#s182)
[^s122]: Measured in configurations. [Section 122](../../../docs/findings.md#s122)
[^s115]: Measured in configurations. [Section 115](../../../docs/findings.md#s115)
[^s177]: Measured in configurations. [Section 177](../../../docs/findings.md#s177)
[^unchecked]: Not checked.
