# The EZHex wrapper

## The EZHex wrapper

A config as handed to a remote is an XML header followed by the container as raw bytes.

**The header ends at the line carrying `</INFORMATION>`**, and the payload is everything after
that line's terminator. That is the split, and everything else in the header is a check on it:

```
</INFORMATION>     the last line of the header. The payload starts after its line terminator,
                   which is CR LF in every config here and is not required to be
<BINARYDATASIZE>   optional. The payload length, so the split is also the last N bytes
<CHECKSUM>         optional. XOR of every payload byte, seeded 0x69, compared as a byte
<INTENDEDVERSION>  PROTOCOL, SKIN, FLASH, BOARD, SOFTWARETYPE, ARCHITECTURE
```

Three rules that a reader has to get right, all of them with a sample in the corpus:

* **A file with no header at all is legal** and is the whole payload. The Harmony 700 package's
  config region is one.
* **An absent `BINARYDATASIZE` or `CHECKSUM` is not a failure.** Every firmware wrapper omits both.
* **A `CHECKSUM` may be written signed**, because the value is narrowed to a byte before
  comparison. No sample in the corpus does, so this is from the consuming reader rather than
  measured.

Both splits are computed and compared, `src/harmony/ezfile.py` and `packages/codec/src/ezhex.ts`,
and they agree on all fifteen config samples. `docs/findings.md` section 87.

`INTENDEDVERSION` is compared field by field, and **an absent or empty field matches anything**, so
an entry with no fields at all matches every remote. `SOFTWARETYPE` says which firmware personality
the file is for, 0 for the application, 4 for safe mode, 3 boot and 1 test; every config in the
corpus declares 0.

**The comparison is implemented and tested since section 225**, `compareIntendedVersion` in
`packages/usb/src/compatible.ts`, and the mapping to what a remote reports is this. Each field is a
number, so the notations differ and only the value is compared:

| field | the file states | the remote's version block | how |
|---|---|---|---|
| `PROTOCOL` | `12` | field 4's high nibble | decimal, and it is the **architecture**, not the platform byte |
| `SKIN` | `54` | field 5 | decimal |
| `FLASH` | `0x1F:0xC8` | fields 3 and 2, manufacturer first | **hex per half**, prefix optional |
| `BOARD` | `0.5.0` | field 1's two nibbles, `0.5` | both sides zero filled to three components |
| `SOFTWARETYPE` | `0` | field 4's low nibble | decimal |
| `ARCHITECTURE` | absent in every sample | field 4's high nibble | decimal, and therefore unexercised |

Three rules the implementation follows and a reader must too. **`PROTOCOL` is the architecture**: the
byte this project once called the protocol is field 6, `platform`, and it is `0x0C` on both arch 12
and arch 14, so reading `PROTOCOL` as that byte accepts an arch 14 config for an arch 12 remote.
**`BOARD`'s third component is not in the version block at all**, and concordance sets it to zero
outright for this whole family, so a two component reading against a three component statement is a
match rather than a gap. And **a field the comparison does not know is a refusal**, not something
skipped, which matters because `SOFTWARE` and `CLIENTSOFTWARE` are real elements of these headers.

**A config read off a remote states none of the six**, because the header is host side and the remote
stores the payload. Ten containers in the corpus carry a header stating five fields each; the three
read over USB carry no header at all, so their statement is empty and, per the rule above, matches
anything. That is the truth about such a container and not a compatibility check that passed.

Beside `INTENDEDVERSION` sits `USERMESSAGES`, which is a different mechanism and is the **host
software's**, not the remote's:

```
<USERMESSAGES>     a list of <USERMESSAGE>, evaluated in order, first match wins
  <VERSIONS>       a disjunction of <VERSION> entries: any one matching is a match
    <VERSION>      the same matcher, keyed on the six fields above, or on CLIENTSOFTWARE,
                   or on SOFTWARE, or empty, which matches every remote
  <TYPE>           DoNothing, Warning or Abort
  <TEXT>           what to show
  <ABORTPROCESSING>
```

Every config here ends that chain with an empty `Warning` carrying "This configuration file is not
compatible with your Harmony Remote" and an empty `Abort`, which is where that message comes from.
Three arch 8 configs also carry seven entries keyed `CLIENTSOFTWARE` 2.3 to 2.9 warning that the PC
software is out of date, and nine keyed `SOFTWARE` 0.1 to 0.9. **The disjunction rule belongs to this
chain and not to `INTENDEDVERSION`**, which is a single entry in all ten headers.

The consequence of a mismatch is **reported, not verified here**: harmony-decompiler states that a
remote refuses a mismatched config with "This configuration file is not compatible with your
Harmony Remote". No configuration has been changed on a remote by this project, so treat that as the reason
to match the header, not as our own observation.

An `.EZUpgrade` carries its payload hex encoded in `<DATA>` elements instead, 32 bytes each with a
short one at the end, grouped into a `<PHASE>` per destination with a `<TYPE>` naming it. An arch
12 firmware package has two, `Configuration_Static` then `Firmware_Main`; arch 14 has one and ships
the config as a separate region.

Not to be confused with the trailer checksum inside the container, which is a different
algorithm. This one covers the whole payload; that one is what the remote validates internally,
and it is derived below.
