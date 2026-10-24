# The file based protocol

## 6. A second protocol for the file based family, from Logitech's own specification

**Client sourced in origin and confirmed on hardware since sections 200 and 201**, so this section
states what Logitech's host sends and, where it says so explicitly, what a remote did. The header said
"unconfirmed on hardware ... never what a remote does"<!--superseded--> until 29 August 2026 while the
body already cited a hardware measurement, because the hardware sentences were added and the frame was
left. It is here rather than only in `reference/logitech/clients.md` because
it is a protocol description of the same kind as the rest of this document, and section 198 is the
argument for it.

The **file based family** does not address flash. It opens a path, gets a handle, and reads or writes
through it. Nineteen of the twenty three skins the mirrored client specifies are in this family and
four are in the one the rest of this document describes; no skin is in both, and the four are skins
50, 54, 66 and 68, which is architectures 12, 14 and 9 plus one skin that declares none.

### The packet

Every request in all nineteen directories begins with the same four bytes.

| offset | field | value |
|---|---|---|
| 0 | service id | `0xFF`, in 1629 of 1629 packets |
| 1 | command id | see below |
| 2 | sequence number | `0x00` in every template; the reply echoes it |
| 3 | parameter count | how many parameters follow |
| 4.. | parameters | a string, a byte, a `u16` or a `u32`, tagged per parameter |

A reply repeats the service and command ids at offsets 0 and 1 and the sequence number at offset 2,
and **`0xFF` at offset 2 is the error marker**: every command in every file checks that byte is not
`0xFF`.

### The commands

| id | name | parameters |
|---|---|---|
| `0x00` | ping | none, or one byte `0x00`, which the client's comment says simulates a USB reset |
| `0x01` | open | path string, mode string `R` or `W`, and for `W` a `u32` size |
| `0x03` | write | handle, `u16` packet count, then that many data packets, then a done packet `0x7E` |
| `0x04` | read | handle, packet count |
| `0x05` | flush, meaning commit | handle, a flag the comment calls "do not validate the region" |
| `0x06` | device control on an open file | handle, subcommand |
| `0x07` | close | handle |
| `0x08` | request and response with no file, which the comments call an HBus command | packet count |
| `0xFF` | device control with no file | `0x66` resets the file system, `0x00` reboots |

An **open** reply carries the handle as one byte at offset 5 and the file size as a **big endian
`u32`** at offset 7. A **read** reply's data packets carry a sequence number at offset 0, a size at
offset 1 and payload from offset 2, and the transfer ends on a packet whose first byte is `0xFE`. A
**write**'s data packets are two zero bytes then a report's worth of payload.

**The size in the open reply is the only statement of where a file ends**, measured on hardware in
section 201 and not a property of the templates. A data packet's own size field is the size of the
transfer unit: the final packet declares a full payload and pads it with NUL rather than declaring
itself short, so a reader that trusts the packets returns more bytes than the file has. Two files on a
Harmony Touch, one stating 83 bytes and returning 124 and one stating 234 and returning 248, both with
the real content ending exactly at the stated size. So a read is cut to that size, and a read that
falls **short** of it is left short, because that is a fact about the transfer.

**A path may be answered rather than stored.** `/rf/deviceinfo` returns the word `Response`, a comma
and a JSON object, where `/sys/sysinfo` returns lines of a name and a value. Both arrive through the
same open, read and close, so the shape is per path and a reader must not generalise from one file to
another.

### The paths

Read out of the templates, with the count of files naming each.

| path | operation |
|---|---|
| `/sys/sysinfo` | the identity block: architecture, skin, firmware version, hardware version, firmware type, GUID, serial number |
| `/rf/deviceinfo` | the paired radio devices |
| `/ir/ir_cap` | an infrared learn session, read as a file |
| `/sys/hlapi` | the hub API, driven by command `0x08` |
| `/sys/factoryreset`, `/sys/reboot`, `/sys/time` | what their names say |
| `/tde/enable` | the debug mode toggle |
| `/cfg/log`, `/cfg/properties` | the log and the properties file |
| `/sys/wifi/connect`, `/sys/wifi/networks` | wireless, plus `/rf/hot/1/...` variants for a paired hub |
| `/fw/normalmode`, `/fw/otaupdate` | a firmware image, named by the package manifest rather than the template |

A **user configuration's path is not in the template**: it is `%%file.path%%`, supplied by the
package manifest, whose `PATH` attribute is what the open command sends and whose `OPERATIONTYPE`
names the template file to use.

### The write is gated on a checksum the remote computes

Reset the file system, open `W` with the size, write in chunks, then command `0x06` subcommand `0x01`
with five parameters, a type string, a `u16` seed, a `u32` offset, a `u32` length and an expected
value string. The remote answers one character at offset 7 and the commit only runs when it is `m`.

Those five are the same five fields, under the same names, that a firmware package's manifest states,
section 196. The type is `XOR` with seed `0x4321` on the Harmony 300 and 350 package, which is
section 41's container checksum, and `MD5` on the Harmony Touch generation. So the descriptor is one
shape across both and **the algorithm is a field rather than a constant.**

### What this means for `packages/usb`

`openHarmony` refuses the five file based product ids, section 193, and the reason recorded there was
that there is no protocol here to reach them with. That reason no longer holds, and neither does the
sentence that followed it here: **an implementation exists and it has read a remote**,
`packages/usb/src/filepipe.ts`, sections 200 and 201. What has not changed is that the family's own
write commands (`0x03`, `0x05` and both device controls) are writes in this project's sense and belong
behind `WRITES_ENABLED` if they are ever built, and that `openHarmony` still refuses these product ids
because the **config** path does not reach them. The identity read is a ping, `0x01`, `0x04` and `0x07`
and changes nothing.
## The file based family's protocol, stated whole and never driven

Added 28 August 2026, section 198. The mirrored desktop client specifies the protocol of the
**nineteen** skins this project does not read, per skin, in the same XML directories section 197
found. The full description is in `reference/usb-protocol/file-protocol.md`, which is the right home because
it is a protocol description; this entry is the ledger line saying it is believed on the client's
word alone.

**Confirmed on hardware for the read path, and only for it.** A Harmony Touch answered the open, read
and close packets, section 200, once the request framing was taken from Logitech's own encoder; the
Harmony 350 and the Harmony 300 answered the same packets and gave up their configurations as files,
sections 262 and 264. Nothing in this project has sent any other packet of the family, the write, the
device control and the HBus command among them, so those stay unconfirmed entirely. This said
nothing here had sent one of these packets and no remote of the family had answered beyond its USB
descriptors until 10 October 2026, which section 200 had already overtaken. The standing caveat
applies with full force to the rest: the client states what it sends, never what the remote does with it, and section 197
already has this family disagreeing with the hardware about its own architecture number.

Three things in it that change what is possible rather than only what is known.

* **The identity read is three commands and none of them writes.** Open `/sys/sysinfo` for reading,
  read, close. It returns the same seven identity fields the HID family's version block carries, five
  of them under the vendor's own names matching `readVersion`'s. So the safest possible first contact
  with a Harmony Touch is specified and permitted by this project's own rails.
* **Reading a user configuration back is specified and commented out**, under a header calling it
  "for testing only". So Logitech's client writes a configuration to that family and does not read
  one, by choice rather than by capability, and the three commands are in the file.
* **The write is gated on a checksum the remote computes and reports**, and its five parameters are
  the five a firmware package's manifest states, section 196. Where that manifest says `XOR` with seed
  `0x4321` it is section 41's own container checksum, arrived at by a route with no shared bytes; on
  the Harmony Touch generation the type is `MD5`. So the checksum is a described algorithm rather than
  a fixed one.

**One thing in it is unresolved and must not be tidied away.** Skin 96 declares model id 66 and
architecture 14, which is the Harmony 700, and specifies a file protocol operation identical to the
Harmony Touch's. Skin 96 is absent from Logitech's own live product table of 97 skins, and the
client's own rule would pick the HID protocol for that architecture. Nothing here decides whether the
rule and the template disagree or the skin never shipped, and **no conclusion about the Harmony 600 or
700 follows from it**: both bench remotes of that architecture speak the HID protocol, measured.
