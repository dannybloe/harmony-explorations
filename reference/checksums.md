# Binaries: provenance and checksums

No firmware or config binaries are committed to this repository. See the README for why.
Obtain them yourself and verify against the checksums below, rather than accepting copies
from anyone.

## Source

The `.hfw` firmware packages are ZIP archives, retrieved from
<https://www.harmonyremoterepair.com/software-firmware.html>:

* `harmony_one_firmware_3_4.hfw`
* `harmony_700_firmware_2_8__1_.hfw`
* `harmony_650_firmware_0_4.hfw`, SHA-256
  `9fa62f79f6755e2b0e742e6152c143055f9bb115be952f5d52b3322c1998b819` (**arch 14**, corrected
  6 August 2026; this file said arch 15 while the package had not been opened)

Those three are the only Harmony firmware images anybody has published, and all three are the
MyHarmony generation: arch 12 once and arch 14 twice. **No firmware exists in public for arch 2,
3, 7, 8, 9, 10 or 15.** For those the only route is `READ_FLASH` off a physical remote, which is
the argument for owning one. See `reference/models.md` for which models are which architecture.

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
| `650-0.4-Region_2-code-base0x9000.bin` | `591df4b1da4407deb59dbec7c6484a778366ba2ffcef60d5fda00703953b3a8f` | hex-decode `Region_2.EZUpgrade` from the 650 package |
| `650-0.4-Region_3-gspm-base0x20000.bin` | `8c40897c4e043dfd23c7db6249034394961382aa03a2daac980c07c4da0b018d` | the raw payload after the XML header of `Region_3.EZHex`, same package |
| `one-safemode-gspm-base0x2000-raw64k.bin` | `b21dff3e9588fab528e0af623a2e061de950092f74befe81f10b1e898cb17335` | `concordance --dump-safemode` from a Harmony One running fw 3.4 |
| `600-0.2-code-base0x9000-TRUNCATED64k.bin` | `3c923a93216fabdb4f0ba19f7b5123192054c7c84e878e88a9d99d276a5e4db1` | `concordance --dump-safemode` from a Harmony 600 running fw 0.2 |
| `600-0.2-code-base0x9000-COMPLETE.bin` | `8cf8422a3ec3ce6d8a313af72c4fb2eb3215884352fdedbb7ff060ed8f897841` | the same image, complete, read off the remote by `packages/usb` |
| `one-3.4-internal-page-fe.bin` | `bc3b18dc0cdf913b7a21f1b46a072d3f9e78b8ddf9e8d3dae26db4008946cf96` | the Harmony One's `0xFE` internal page, **read off two separate remotes and byte identical** |
| `one-3.4-internal-page-ff-unprogrammed.bin` | not listed | the `0xFF` page of the unprogrammed unit |
| `one-3.4-internal-page-ff-programmed.bin` | not listed | the `0xFF` page of the programmed unit |
| `600-0.2-internal-page-fe.bin` | `d5c7abdfe4f7e41031cf294c77347730c7f99871316720514ec2640b656f1e0f` | the Harmony 600's `0xFE` page: bootloader, safe mode image, application firmware |
| `600-0.2-internal-page-ff.bin` | not listed | the 600's `0xFF` page, which holds its identity block |
| `600-0.2-safemode-gspm-base0x20000.bin` | `18db67b9cb2b187a8e6f775dd66d5c555a2a3950e61d446ad83ab257bba5a767` | the 600's safe mode config, read off external flash at `0x020000` |

Those come from specific physical remotes, so their checksums will not reproduce on anyone else's
hardware. They are listed for the record, not as verification targets, with **one exception**:
`one-3.4-internal-page-fe.bin` was read off two different Harmony Ones running firmware 3.4 and the
two reads are byte identical over all 65534 bytes, so it is a property of the firmware rather than
of a unit. Any Harmony One on 3.4 should reproduce it.

**Neither `0xFF` page has a checksum here, on purpose.** They hold the 64 byte identity block with
each remote's serial GUIDs, and a checksum of one is a fingerprint of one specific device. Comparing
the two units showed the `0xFF` pages differ in 39 bytes and nowhere else: 32 inside the identity
block, two at `+0xF582` and seven at `+0xF643`. Everything else on that page, and the whole `0xFE`
page, is the same firmware.

**The 600's `*-safe.bin` is not a safe mode image.** It is byte identical to
`600-0.2-code-base0x9000-TRUNCATED64k.bin`, that is, the application firmware from program `0x9000`
cut off at 64 KiB. The 600's real safe mode is the 24320 byte image at internal `0xFE+0x1000`, inside
`600-0.2-internal-page-fe.bin`. On the One the file with the same suffix does hold the safe mode
container, so the suffix means different things per architecture.

All internal pages are 65534 bytes rather than 65536. The firmware clamps the read offset at `0xFFC0`
and a 62 byte read from there ends at `0xFFFD`, so the last two bytes of each page cannot be read at
all. Three images inside them verify their own header checksums regardless, since none of them
extends that far.

`600-0.2-safemode-gspm-base0x20000.bin` is 8192 bytes as read, of which the container is the first
7115 and the rest is erased. Its address was previously known only from the 700's package, so this
is the arch 14 layout confirmed on a 600. It is a factory artifact rather than a user config, and
the same length as the 700's to the byte, differing in 83 places.

`600-0.2-code-base0x9000-COMPLETE.bin` supersedes the truncated one and is 70336 bytes against
65536. It is the first binary here that this project produced rather than decoded from somebody
else's file, and unlike the others it is checkable without trusting the reader that made it: the
image's own header checksum verifies over all 70336 bytes, and the 65534 bytes both files can
express agree byte for byte. The truncated file stays listed, because the agreement between the
two is the evidence.

## Publicly shared config samples

Unlike everything else here, these seven files are already public, posted by their owners. They
are used as controls for claims about the container: a rule that survives architectures nobody
tuned it for is a rule about the format. They still live in the lab rather than in this
repository, because the policy is that no config binaries are committed regardless of
provenance.

Four architecture 8 configs (720/785/88x class), shared by
[@guyman70718](https://github.com/guyman70718) on 2025-09-18 as `EZHex.Samples.zip` in
<https://github.com/jaymzh/concordance/issues/66>, mirrored in `samples/arch8/` of
harmony-decompiler:

| File | SHA-256 |
|---|---|
| `Update.EZHex` | `e25b6c0d500a329e9cf4ea069bfdafe7237be33908667d74093f8898cea62f93` |
| `Update-1.EZHex` | `5b28a88347f13b117cd7219697a8467284e9673b5b57ff27632ba59824029d25` |
| `Update-2.EZHex` | `ca582add1839b17b7ba6e689ca19715ade63a3c6af7592288dd334f89e8155b8` |
| `Update-3.EZHex` | `74d2a7383c4632d41a7a32d2c1168871bb5ba2fa06bf3ac279587d30a3780b5a` |

One architecture 9 config (Harmony 525), dumped on 2026-08-02 and published by
[@trelowney](https://github.com/trelowney) in `samples/harmony525/`:

| File | SHA-256 |
|---|---|
| `config.EZHex` | `c6082ebbd4e53c3c26ac41445bcf6bf5f535e7bfaef36ea06640a659925d3220` |
| `config.bin` | `bba8f7f0efd12684112c0663759e0a035438c244dea31e5d73ad156a2c78e555` |
| `header.xml` | `72a49968cdbfb4427aa19a855b94e5a0ebc6ed19129e57d8c1499e81f7c49662` |

`config.bin` and `header.xml` are the two halves of `config.EZHex` and are redundant; they are
listed because the upstream sample set includes them. Both sets carry `UserId` 0 and no serial
number or account data, which their publishers checked and which is worth re-checking rather
than assuming:

```sh
python3 -c "import sys; sys.path.insert(0, 'src'); from harmony import ezfile; \
print(ezfile.parse_ezhex(open(sys.argv[1], 'rb').read()).xml)" <file>
```

Two architecture 14 configs of the **same Harmony 700**, posted publicly by
[@dmrzzz](https://github.com/dmrzzz) in the harmony-decompiler discussion:

| File | SHA-256 |
|---|---|
| `harmony700.EZHex` | `86ff26c8e2aae0c891809a8d7b0129b09cf8c4d57d8763a65878da8b62e04c3d` |
| `harmony700-2.EZHex` | `286aafc4e5255abee904d77feb8dada29689cc80559df0793484349ab2d631d7` |

982340 and 982398 bytes, skin 66, `UserId` 0, no session data. These are the only config
samples from the same model as the arch 14 firmware image analysed here, and the only
**controlled pair** in the corpus: one remote, one installation, one change between the two.
That is what `docs/findings.md` section 16 rests on, and it is worth more than a fifth
architecture would be.

`harmony700-2.EZHex` is the older of the two. Their owner posted a written account of what
differs alongside them, which is what makes the pair a controlled sample rather than two files:
<https://github.com/trelowney/harmony-decompiler/issues/9>.

Note the 600 firmware file listed under derived binaries is **truncated**: the real image is
70336 bytes and concordance returns only the first 65536. Use the 700 image for arch 14 work,
since it is complete.

## Read off a Harmony 525, 8 August 2026

Architecture 9, the first arch 9 hardware here. All three read over USB by this project's own code,
read only; they live in the lab and are not publishable, so these are the checksums. Section 76.

| File | SHA-256 | What |
|---|---|---|
| `20260808T1645Z-harmony-525-config.bin` | `a5bdb588638d81fb0b491eb47a90cfd2f9e9a4bd1ca374ad16550af0e0910ffb` | the user config, 51195 bytes, flash `0x820000` |
| `20260808-harmony-525-flash-810000.bin` | `2c29005c1080690a9d6716c94b3bb1e49856b47b448a452c329ec1c41a1e6282` | the application firmware image, 65536 bytes |
| `20260808-harmony-525-flash-800000.bin` | `dbb57d128aa8b3b0f03a7ec0de9522f09dd04cb30c350c804a25ba91b4c1412a` | a second `HG` framed image, the safe mode application |
| `20260808-harmony-525-internal-0x0000.bin` | `21a8cb3d1e0f512738a2cae3b7981512bfb893271d8b4056e315b8727e5626d0` | internal program memory, 32768 bytes, read in 529 single chunk commands |
| `20260808-harmony-525-safemode-ahcm.bin` | `cf0d0ece48352d7078c7333d98de68473a38945fa8a77bd78ab11f17d15bac68` | the safe mode config, cut out of the `0x810000` dump at offset `0x8000` |

`0x1000` to `0x7FFF` of the internal read is byte identical to the first 28672 bytes of the
`0x810000` image, which is what confirms both the load address and that the external image is the
running code.

## Load addresses

Required. Without these a disassembler produces plausible-looking garbage rather than
obviously failing.

| Image | Execution base | Entry point | Notes |
|---|---|---|---|
| One 3.4 code half | `0x20000` | `0x2EA38` | mark `0x20000-0x2002F` as data: header plus `DEADDEAD` fill |
| 700 2.8 `Region_2` | `0x9000` | `0x1BB38` | header is `0x00-0x0F` only, code starts at `0x9010` |
| 600 0.2 dump | `0x9000` | `0x1A26E` | entry point falls in the truncated tail |
| 525 flash `0x810000` | `0x1000` | `GOTO 0x07FB4` at `0x1008` | derived at 717 boundary hits against 326, then **confirmed against the device's own internal memory**; framed `HG` at `+4` and `GH` at `0x6FFE` |
| 525 flash `0x800000` | `0x1000` | `GOTO 0x0BF5*2` at `0x1008` | the safe mode application, 182 boundary hits of 183 |
| 525 internal | `0x0000` | reset `GOTO 0x0EF6` | bootloader below `0x1000`, application above it |

Ghidra language: `PIC-18:LE:24:PIC-18`. Only a generic variant exists, so SFRs come out
unnamed; `tools/pic18_disasm.py` resolves them instead.
