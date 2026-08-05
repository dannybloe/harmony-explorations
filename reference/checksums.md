# Binaries: provenance and checksums

No firmware or config binaries are committed to this repository. See the README for why.
Obtain them yourself and verify against the checksums below, rather than accepting copies
from anyone.

## Source

The `.hfw` firmware packages are ZIP archives, retrieved from
<https://www.harmonyremoterepair.com/software-firmware.html>:

* `harmony_one_firmware_3_4.hfw`
* `harmony_700_firmware_2_8__1_.hfw`
* `harmony_650_firmware_0_4.hfw` (not yet analysed, arch 15)

That page is the only surviving source anyone has found. It is worth archiving, and doing so
is the most time-sensitive item in the project: these files are irreplaceable and there is no
authoritative source left. **Strip `Data.xml` of the `UserId`, `CookieKeyValue`, `ServerID`
and `ASPSESSIONID` fields before mirroring anywhere**, since those are a stranger's account
and session details.

Each `.hfw` contains a `Data.xml` plus one or more region files. The region payloads are
hex-encoded inside `<DATA>` XML elements and need decoding to get the binary.

## Derived binaries

| File | SHA-256 | How to produce it |
|---|---|---|
| `one-3.4-Region_2-decoded.bin` | `df282e4efae34f9118c2c22238c759f125d5ae9308db37848f11e42e21162174` | hex-decode the `<DATA>` elements of `Region_2.EZUpgrade` from the One package |
| `one-3.4-code-base0x20000.bin` | `812350eacfd9ff244fa9ec0a9e96fc1bcb6d3cfa7e274158a0f754b96c35c0f6` | the above, from offset `0x22C6` to the end (the code half) |
| `700-2.8-Region_2-code-base0x9000.bin` | `ae341df2d4255743de46466dcfca9081bc01d93f10a8ba1072a1c1be341d1cc3` | hex-decode `Region_2.EZUpgrade` from the 700 package |
| `700-2.8-Region_3-gspm-base0x20000.bin` | `cd5073d0f3b99c4a58fb72a3e790594c68da6ba48b350236b392555297989bea` | the raw payload after the XML header of `Region_3.EZHex`, same package |
| `one-safemode-gspm-base0x2000-raw64k.bin` | `b21dff3e9588fab528e0af623a2e061de950092f74befe81f10b1e898cb17335` | `concordance --dump-safemode` from a Harmony One running fw 3.4 |
| `600-0.2-code-base0x9000-TRUNCATED64k.bin` | `3c923a93216fabdb4f0ba19f7b5123192054c7c84e878e88a9d99d276a5e4db1` | `concordance --dump-safemode` from a Harmony 600 running fw 0.2 |

The last two come from specific physical remotes, so their checksums will not reproduce on
anyone else's hardware. They are listed for the record, not as verification targets.

Note the 600 file is **truncated**: the real image is 70336 bytes and concordance returns only
the first 65536. Use the 700 image for arch 14 work, since it is complete.

## Load addresses

Required. Without these a disassembler produces plausible-looking garbage rather than
obviously failing.

| Image | Execution base | Entry point | Notes |
|---|---|---|---|
| One 3.4 code half | `0x20000` | `0x2EA38` | mark `0x20000-0x2002F` as data: header plus `DEADDEAD` fill |
| 700 2.8 `Region_2` | `0x9000` | `0x1BB38` | header is `0x00-0x0F` only, code starts at `0x9010` |
| 600 0.2 dump | `0x9000` | `0x1A26E` | entry point falls in the truncated tail |

Ghidra language: `PIC-18:LE:24:PIC-18`. Only a generic variant exists, so SFRs come out
unnamed; `tools/pic18_disasm.py` resolves them instead.
