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

The written description of what changed between them, which their owner posted alongside, is
not here and is worth obtaining.

Note the 600 firmware file listed under derived binaries is **truncated**: the real image is
70336 bytes and concordance returns only the first 65536. Use the 700 image for arch 14 work,
since it is complete.

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
