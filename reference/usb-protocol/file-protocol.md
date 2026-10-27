# The file protocol

The Harmony 300, the Harmony 350 and the Harmony Touch do not let a computer read their memory by address.
They speak a different protocol over the same kind of USB link: a computer **opens a file by its name**,
gets a handle, reads or writes through it, and closes it. Logitech's own client specifies this protocol in
full, per model, and that specification is the source of most of this page. The read path, open, read and
close, has been driven on a Harmony Touch, a Harmony 350 and a Harmony 300; everything else here is what
Logitech's client sends and not something a remote has been seen to do[^s198][^s200][^s262][^s264].

What each family does with the protocol is on its own pages: [the Harmony 300 and 350](../architectures/harmony-300-350/usb.md),
where the library's transport rails are argued, and [the Harmony Touch generation](../architectures/harmony-touch/usb.md),
with its write check and its provisioning.

## Which remotes speak it

Logitech's client chooses the protocol from the architecture number: 9, 12 and 14, the Harmony 525, One,
600, 650 and 700, take [the command protocol](commands.md), and every other number takes this one[^s197].
Of the twenty three skins the mirrored client specifies, nineteen take this protocol and four the other,
skins 50, 54, 66 and 68; no skin takes both[^s198].

**The identity read is three commands and none of them writes**: open `/sys/sysinfo` for reading, read,
close. It returns the same identity a command protocol remote gives in its
[version block](version-block.md), five of the fields under Logitech's own names matching `readVersion`'s,
so the safest possible first contact with one of these remotes needs no write at all[^s198][^s200].

## The packet

Every request begins with the same four bytes, in all nineteen of the client's directories[^s198]:

| offset | field | value |
|---|---|---|
| 0 | service id | `0xFF`, in 1629 of 1629 packets |
| 1 | command id | below |
| 2 | sequence number | `0x00` in every template; the reply echoes it |
| 3 | parameter count | how many parameters follow |
| 4.. | parameters | each a string, a byte, a `u16` or a `u32`, tagged per parameter |

**The two directions encode their parameters differently.** A request's string parameter is `0x80`, the
characters and a NUL, as Logitech's own parameter encoder writes it[^s200]. A reply's parameters are length
prefixed, which is why Logitech's templates read an open's handle at offset 5 and its size at offset
7[^s200b]. Sent to a Harmony Touch, a bare NUL terminated string draws a refusal and a plain length prefix
draws no reply at all[^s198b].

**A reply repeats the service and command ids at offsets 0 and 1 and the sequence number at offset 2, and
`0xFF` at offset 2 is the error marker**: every command in every template checks that byte is not
`0xFF`[^s198]. A refusal from a Harmony Touch is `ff 01 ff 01 01 0b`, and it comes before the path is
looked up: a file, a directory and a path that does not exist draw the same six bytes[^s198b].

**A malformed packet silences the session**: on a Harmony Touch every command after it in the same session
draws nothing, so each attempt needs a fresh handle. Four well formed opens in one session all answer, so
it is the malformed packet and not the number of attempts[^s198b].

## The commands

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

Stated by Logitech[^s198]. Only `0x00`, `0x01`, `0x04` and `0x07` have been sent to a remote, and only for
reading[^s200].

## Reading a file

An **open** reply carries the handle as one byte at offset 5 and the file's size as a **big endian `u32`**
at offset 7. A **read** reply's data packets carry a sequence number at offset 0, a size at offset 1 and
payload from offset 2, and the transfer ends on a packet whose first byte is `0xFE`[^s198].

**The size in the open reply is the only statement of where a file ends.** A data packet's own size field is
the transfer unit: the final packet declares a full payload and pads it with NUL rather than declaring
itself short, so a reader that trusts the packets returns more bytes than the file has. On a Harmony Touch,
one file stating 83 bytes returned 124 and one stating 234 returned 248, the real content ending exactly at
the stated size each time. So a read is cut to that size, and a read that falls **short** of it is left
short, since that is a fact about the transfer[^s201].

**A path may be answered rather than stored.** `/rf/deviceinfo` returns the word `Response`, a comma and a
JSON object, where `/sys/sysinfo` returns lines of a name and a value. Both arrive through the same open,
read and close, so the shape is per path and a reader must not generalise from one file to
another[^s201].

## The paths

Read out of the client's templates[^s198]:

| path | what it is |
|---|---|
| `/sys/sysinfo` | the identity: architecture, skin, firmware version, hardware version, firmware type, GUID, serial number |
| `/rf/deviceinfo` | the paired radio devices |
| `/ir/ir_cap` | an infrared learn session, read as a file |
| `/sys/hlapi` | the hub API, driven by command `0x08` |
| `/sys/factoryreset`, `/sys/reboot`, `/sys/time` | what their names say |
| `/tde/enable` | the debug mode toggle |
| `/cfg/log`, `/cfg/properties` | the log and the properties file |
| `/sys/wifi/connect`, `/sys/wifi/networks` | wireless, plus `/rf/hot/1/...` variants for a paired hub |
| `/fw/normalmode`, `/fw/otaupdate` | a firmware image, named by the package manifest rather than the template |

**A user configuration's path is not in the template**: it is `%%file.path%%`, supplied by the package
manifest, whose `PATH` attribute is what the open sends and whose `OPERATIONTYPE` names the template to
use[^s198]. On the Harmony 300 and 350 it is `/cfg/usercfg`[^s262].

**On this protocol a path can be an action.** On a Harmony Touch `/sys/factoryreset` and `/sys/reboot` both
open for reading, so a mode of `R` says what the handle will be used for and nothing about what opening the
path does[^s200]. That is why `packages/usb` opens only the paths on its `INERT_PATHS` list, and any other
path needs the named door `HARMONY_FILE_PATH_EXPERIMENT=1`; the code is `packages/usb/src/filepipe.ts`.

## Writing a file, checked by the remote

Logitech's client writes a file this way: reset the file system, open `W` with the size, write in chunks,
then command `0x06` subcommand `0x01` with five parameters, a type string, a `u16` seed, a `u32` offset, a
`u32` length and an expected value string. The remote answers one character at offset 7, and the commit
runs only when it is `m`[^s198].

Those five are the same five fields, under the same names, that a firmware package's manifest states. Where
the manifest says `XOR` with seed `0x4321`, on the Harmony 300 and 350 package, it is the configuration
container's own trailer checksum, reached by a route that shares no bytes with the one that found it; on the
Harmony Touch generation the type is `MD5`. So the check is one shape across both and **the algorithm is a
field rather than a constant**[^s196][^s198]. Nothing in this reference has sent a write, a commit or a
device control, and `packages/usb` implements none of them[^s198].

**What a remote does with these steps has been read in one firmware, the Harmony 300 and 350's 1.4
build**, and three of them do less than their names suggest: the file system reset only closes whatever
file is open, the check uses none of the type, seed, offset and length and, for `/cfg/usercfg`, compares
the checksum word stored in the file with the expected value, and the flush reads no flag. The open for writing does more, since it erases the file
before it answers. The detail is [their USB page](../architectures/harmony-300-350/usb.md#what-the-firmware-does-with-a-write)[^t-harmony-350-file-write].
The same reading also places the bytes the templates check: the reply to the reset carries no parameter,
the check's character is byte 7 and a write chunk ending in the done packet answers `0xFE`, as the client
expects[^t-harmony-350-file-write]. The Harmony Touch generation's firmware is not read[^unchecked].

Logitech's template for writing a Harmony Touch's configuration carries the read of the same file commented
out, under a header calling it "for testing only", so its client writes a configuration to that generation
and does not read one back, by choice rather than by capability,
[the Touch generation's usb page](../architectures/harmony-touch/usb.md)[^s198].

## Not checked

* The write, the commit, both device controls and the request and response command, on any
  remote[^unchecked].
* What the `0x0b` at the end of a refusal means[^unchecked].
* **Skin 96.** It declares model id 66 and architecture 14, which is the Harmony 700, and specifies a file
  protocol operation identical to the Harmony Touch's. It is absent from Logitech's own live product table
  of 97 skins, and the client's own rule would pick the command protocol for that architecture. Whether the
  rule and the template disagree or the skin never shipped is not known, and **nothing about the Harmony
  600 or 700 follows from it**: both speak the command protocol, measured on units[^s198][^s19][^s295][^unchecked].

[^s198]: Stated by Logitech, in their client. [Section 198](../../docs/findings.md#s198)
[^s200]: Measured on a unit. [Section 200](../../docs/findings.md#s200)
[^s262]: Measured on a unit. [Section 262](../../docs/findings.md#s262)
[^s264]: Measured on a unit. [Section 264](../../docs/findings.md#s264)
[^s197]: Stated by Logitech, in their client. [Section 197](../../docs/findings.md#s197)
[^s200b]: Stated by Logitech, in their client. [Section 200](../../docs/findings.md#s200)
[^s198b]: Measured on a unit. [Section 198](../../docs/findings.md#s198)
[^s201]: Measured on a unit. [Section 201](../../docs/findings.md#s201)
[^s196]: Stated by Logitech. [Section 196](../../docs/findings.md#s196)
[^unchecked]: Not checked.
[^s19]: Measured on a unit. [Section 19](../../docs/findings.md#s19)
[^s295]: Measured on a unit. [Section 295](../../docs/findings.md#s295)
[^t-harmony-350-file-write]: Read in the firmware. [The test](../../tests/test_harmony_350_file_write.py)
