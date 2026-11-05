# Harmony Touch: USB

The Touch speaks the **file protocol**, not the command protocol of the Harmony One, 525, 600, 650 and 700:
a host opens a named path, reads through a handle and closes it[^s198]. The protocol is
[the file protocol](../../usb-protocol/file-protocol.md), from Logitech's own specification, and what this
generation does with it, its write check and its provisioning, is
[the platform's usb.md](../../architectures/harmony-touch/usb.md). The Harmony 300 and 350 speak the same
family's protocol, [their architecture's usb.md](../../architectures/harmony-300-350/usb.md), which is where
the transport's rails are argued.

## Identity on the bus

<!-- generated:usb-identity -->
| field | value | from |
|---|---|---|
| USB product id | 0xC12B, file based | `FILE_BASED_PRODUCTS` in `packages/usb/src/transport.ts`, and the model's row in `REMOTES` |
| flash addresses and escape sub commands | none: a file based remote is read by file name, and `openHarmony` refuses it | `isFileBasedRemote` in `packages/usb/src/transport.ts` |

Generated from `packages/usb` and `REMOTES` in `packages/silhouettes/bin/remotes.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

The product id comes from `FILE_BASED_PRODUCTS` in `packages/usb/src/transport.ts`, which lists it as
"Harmony Touch, and the Harmony Ultimate", and the command protocol's profiles hold no entry for it.

| field | value | evidence |
|---|---|---|
| vendor and product id | `046D:C12B`, which `FILE_BASED_PRODUCTS` also names for the Harmony Ultimate | [^s193] |
| `bcdDevice` | `0x1099`, skin 99 | [^s195] |
| product string | `Logitech Harmony Remote`, with no firmware version in it, where a Harmony 350 states `Harmony Remote 0-1.4.0` | [^s193] |
| `/sys/sysinfo` | `arch 0x11`, 17; `skin 0x63`, 99; `fw_ver 4.15.330`; `fw_type 0x00`; `link_packet_length 64`; and a serial, among fourteen fields. The identifying values never appear here | [^s200], [^s201] |

## Telling one Touch from another

A Touch has no identity block to read: it refuses `/sys/guid` at open[^s200]. **What tells one unit from
another on the cable is the identity file's `serial_number`**, which the remote's native program copies at
start out of the unit's manufacturing record, the `unitid` key of its `mfg` partition, at most 63
characters[^t-touch-serial]. When the partition is missing, or its record holds no `unitid`, the program
states the empty string instead, which is then the same on every such unit, so an empty serial identifies
nothing[^t-touch-serial]. Whether
two units' records can hold the same `unitid` is not read: the record is written at manufacture, and nothing
on the image makes one[^unchecked].

## The protocol, as far as it was used

The packet, how a request and a reply encode their parameters, what a refusal looks like and why one
malformed packet silences a session are [the file protocol](../../usb-protocol/file-protocol.md#the-packet),
measured there on a Touch. What is this model's own:

* **This library has sent the Touch four commands**, a bare ping, open, read and close, and only to read[^s200].
* **In every recorded sync, Logitech's client worked through one file, `/sys/hlapi`, and sent no request and
  response command `0x08`**; in the two syncs down it also tried to write `/sys/time`, and the remote refused
  that write both times[^t-touch-sync][^t-touch-both-ways]. Changes made on the remote travel up through the
  same file: a change of settings went up as a `put` of the whole settings document. What the exchanges carry is [the platform's usb.md](../../architectures/harmony-touch/usb.md#provisioning-instead-of-a-compile)[^t-touch-sync][^t-touch-both-ways].
* Through the charging dock the remote is not detected by a computer; only a direct cable is[^x-touch-manual].

## Paths

Nineteen paths were probed and eight open, with the sizes in [memory.md](memory.md)[^s200]. **On this
protocol a path can be an action**: `/sys/factoryreset` and `/sys/reboot` both open for reading, so a mode of
`R` says what a handle will be used for and nothing about what the path does[^s200]. Read in the remote's
native program, both act on a write and run nothing when opened, [the names](../../architectures/harmony-touch/api/names.md#the-names-that-act-on-a-write-and-on-an-open)[^t-touch-api-names];
what any other path does is known only where its handler has been read. That is why `INERT_PATHS` is an
allow list of paths rather than a check on the mode.

**The configuration is not one of them.** `/cfg/usercfg`, the Harmony 300 and 350's configuration path, does
not exist on a Touch, nor do five other spellings[^s200], and Logitech's own template carries the read of a
user configuration commented out[^s198].

## What this library does with a Touch

| | evidence |
|---|---|
| **`openHarmony` refuses it**, by product id, and `make remotes` lists it separately | [^s193] |
| **`openFileBasedRemote` opens it read only**: a bare ping, an open for reading, a read and a close, and only for the paths on `INERT_PATHS`. Two of those twelve answer on a Touch, `/sys/sysinfo` and `/rf/deviceinfo`; the other ten are refused at open | [^s200], [^s201] |
| any other path needs `HARMONY_FILE_PATH_EXPERIMENT=1`, because a path can be an action, except eight that are never opened whatever the flags, `NEVER_OPENED_PATHS` in `packages/usb/src/filepipe.ts`: the four names that act on a write, the two that act on an open and the two that take firmware, [the names](../../architectures/harmony-touch/api/names.md#the-names-that-act-on-a-write-and-on-an-open) | [^s200], [^t-touch-api-names] |
| **requests to its software go through a rail of their own**: `openTouchRequestSession` in `packages/usb/src/touchsession.ts` writes request lines into `/sys/hlapi` behind `assertTouchRequestAllowed` in `packages/usb/src/rails.ts`, with `HARMONY_ENABLE_WRITES=1` and `HARMONY_TOUCH_REQUESTS=1`. It opens `/sys/hlapi` and nothing else for writing, refuses any unit but the one it is meant for, told apart by its serial as above, and carries two reads, the provisioning information and `getconfighash`, and the four requests of a sync, [answering a sync](../../architectures/harmony-touch/answering-a-sync.md#which-request-names-act); and behind `HARMONY_TOUCH_RECOVERY=1` as well, three recovery requests, the abort of a sync, the delete of every stored document and the restart, [recovery](../../architectures/harmony-touch/firmware.md#recovery); the transport refuses every other request name off the bytes of the line it is about to send, and a recovery name without that flag | [^d29] |
| **no configuration is written as a file**: the file write path is the Harmony 300 and 350's, and it refuses a remote whose identity file states any architecture but 16, which a Touch's does not; no request and response command is implemented | [^s198] |

> The last row said no write list in `packages/usb/src/rails.ts` names this model<!--superseded-->, until the
> request channel's rail was added there.

**So there is nothing left to read on a Touch without the named door**[^s201]. What the remote asks for during
a sync goes through `/sys/hlapi`, which is not on `INERT_PATHS`; this library opened it once, behind the
named door, to learn its size, and has never read it[^s200][^t-touch-sync].

> This page said a sync rides on the request and response command, `0x08`<!--superseded-->, until a recorded
> sync through Logitech's client sent no `0x08` at all[^t-touch-sync].

## Not checked

* The files `INERT_PATHS` permits and the Touch refuses, beyond their refusal[^unchecked].
* The provisioning session, which none of the recorded syncs ran[^unchecked].

[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s193]: Measured on a unit. [Section 193](../../../docs/findings.md#s193)
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s201]: Measured on a unit. [Section 201](../../../docs/findings.md#s201)
[^x-touch-manual]: Stated by Logitech, in the manual. [The Harmony Touch user guide](https://www.manualslib.com/manual/641224/Logitech-Harmony-Touch.html)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^unchecked]: Not checked.
[^t-touch-api-names]: Read in the firmware. [The test](../../../tests/test_harmony_touch_api_names.py)
[^t-touch-serial]: Read in the firmware. [The test](../../../tests/test_harmony_touch_serial.py)
[^d29]: Chosen by this project. [Decision 29](../../../docs/decisions.md#d29)
