# The EZHex wrapper

When Logitech's software hands a configuration to a computer, it arrives as a file with a short XML
header in front of the [container](container.md). The header says which remote the file is for and lets
the host software warn or stop before writing it; the bytes after it are the container, exactly as they
will sit in the remote's flash. The remote never sees the header: the host software reads it and writes
only the payload, so a configuration read back off a remote has no header at all.[^s225]

This is the outermost layer of the format, and the only one a person handling the files ever sees.

## Where the header ends

**The header ends at the line carrying `</INFORMATION>`**, and the payload is everything after that
line's terminator. That is the split, and everything else in the header is a check on it:[^s87]

```
</INFORMATION>     the last line of the header. The payload starts after its line terminator,
                   which is CR LF in every configuration file read and is not required to be
<BINARYDATASIZE>   optional. The payload length, so the split is also the last N bytes
<CHECKSUM>         optional. XOR of every payload byte, seeded 0x69, compared as a byte
<INTENDEDVERSION>  PROTOCOL, SKIN, FLASH, BOARD, SOFTWARETYPE, ARCHITECTURE
```

Three rules a reader has to get right:[^s87]

* **A file with no header at all is legal** and is the whole payload. The configuration region of the
  Harmony 700's firmware package is one.
* **An absent `BINARYDATASIZE` or `CHECKSUM` is not a failure.** Every firmware wrapper omits both.
* **A `CHECKSUM` may be written signed**, because Logitech's reader parses it as a signed number and
  narrows it to a byte before comparing. No file read does, so this rule is the client's and not a
  measurement.

The split taken from the terminator and the split taken from the declared length agree on every
configuration file in the corpus; `src/harmony/ezfile.py` and `packages/codec/src/ezhex.ts` compute
both.[^t-ezfile] The payload checksum is not the container's own [trailer checksum](container.md#the-trailer-checksum):
this one covers the whole payload and is checked by the host, that one is what the remote validates.[^s87]

## Which remote a file is for

`INTENDEDVERSION` names the remote a file was built for, field by field, and **an absent or empty field
matches anything**, so an entry with no fields at all matches every remote. It is a single entry in every
header read.[^s225] `SOFTWARETYPE` says which firmware personality the file is for: 0 the application,
4 safe mode, 3 the bootloader and 1 test; every configuration file declares 0, and none states an
`ARCHITECTURE`.[^s87]

Each field is a number compared against the version block a remote reports over USB, so the notations
differ and only the value is compared:[^s225]

| field | the file states | the remote's version block | how |
|---|---|---|---|
| `PROTOCOL` | `12` | field 4's high nibble | decimal, and it is the **architecture**, not the platform byte |
| `SKIN` | `54` | field 5 | decimal |
| `FLASH` | `0x1F:0xC8` | fields 3 and 2, manufacturer first | **hex per half**, prefix optional |
| `BOARD` | `0.5.0` | field 1's two nibbles, `0.5` | both sides zero filled to three components |
| `SOFTWARETYPE` | `0` | field 4's low nibble | decimal |
| `ARCHITECTURE` | absent in every file | field 4's high nibble | decimal, and therefore never exercised |

Three rules go with the table.[^s225] **`PROTOCOL` is the architecture**: the byte called the platform
is field 6 of the [version block](../usb-protocol/version-block.md), and it is `0x0C` on both the
Harmony One and the Harmony 600, 650 and 700, so reading `PROTOCOL` as that byte accepts a Harmony 600's
configuration for a Harmony One. **`BOARD`'s third component is not in the version block at all**, and
concordance sets it to zero outright for this whole family, so a two component reading against a three
component statement is a match rather than a gap. And **a field the comparison does not know is a
refusal**, not something skipped, which matters because `SOFTWARE` and `CLIENTSOFTWARE` are real elements
of these headers. `compareIntendedVersion` in `packages/usb/src/compatible.ts` is the comparison.

**A configuration read off a remote states none of the six**, since the remote stores only the payload.
Its statement is empty and, by the rule above, matches anything: that is the truth about such a container
and not a compatibility check that passed.[^s225]

## The messages a host shows

Beside `INTENDEDVERSION` sits `USERMESSAGES`, which is a different mechanism and is the **host
software's**, not the remote's:[^s225]

```
<USERMESSAGES>     a list of <USERMESSAGE>, evaluated in order, first match wins
  <VERSIONS>       a disjunction of <VERSION> entries: any one matching is a match
    <VERSION>      the same matcher, keyed on the six fields above, or on CLIENTSOFTWARE,
                   or on SOFTWARE, or empty, which matches every remote
  <TYPE>           DoNothing, Warning or Abort
  <TEXT>           what to show
  <ABORTPROCESSING>
```

On a Harmony One's configuration the chain is three entries: one matching that exact remote with
`DoNothing` and `ABORTPROCESSING`, then an entry with an empty `<VERSION>` carrying a `Warning` and the
text "This configuration file is not compatible with your Harmony Remote", then an empty `Abort`.[^s225]
**So that message is the host software's**, attached by the empty entry to every remote the first entry
did not match; the remote itself never sees it, nor the header that carries it. Three Harmony 880 and 885
configurations also carry seven entries keyed `CLIENTSOFTWARE` 2.3 to 2.9 warning that the PC software
is out of date, and nine keyed `SOFTWARE` 0.1 to 0.9. **The disjunction rule belongs to this chain and not
to `INTENDEDVERSION`**.[^s225]

## Firmware packages

An `.EZUpgrade` carries its payload hex encoded in `<DATA>` elements instead, 32 bytes each with a short
one at the end, grouped into a `<PHASE>` per destination with a `<TYPE>` naming it. A Harmony One firmware
package has two, `Configuration_Static` then `Firmware_Main`; a Harmony 700 package has one and ships the
configuration as a separate region.[^s3][^s87]

[^s225]: Measured in configurations. [Section 225](../../docs/findings.md#s225)
[^s87]: Stated by Logitech, in their client. [Section 87](../../docs/findings.md#s87)
[^t-ezfile]: Measured in configurations. [The test](../../tests/test_ezfile.py)
[^s3]: Measured in configurations. [Section 3](../../docs/findings.md#s3)
