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

Those three were for a year the only Harmony firmware images anybody had published, all three of
the MyHarmony generation, arch 12 once and arch 14 twice. **That is no longer the shape of it and
the wording here overstated the scarcity twice.** Arch 8 has had firmware since 10 August 2026,
contributed rather than published, sections 113 and 116. And since 28 August 2026 Logitech's own
software update service serves eleven images to an anonymous request, including the **fourth**
package of this kind, which covers the Harmony 300 and the Harmony 350: see "Firmware from
Logitech's software update service" below and section 196.

What has no firmware anywhere is arch 2, 3, 7, 10 and 15. Arch 9 has it off our own remote rather
than from anybody's publication. For an architecture with neither, the only route is `READ_FLASH`
off a physical remote, which is the argument for owning one. See `reference/models.md` for which
models are which architecture.

That repair site is still the only surviving third party source anyone has found, and archiving it
stays worth doing: the vendor's own service can be withdrawn without notice, and the two sources do
not overlap. The repair site has the classic remotes and the service has everything except them. **Strip `Data.xml` of the `UserId`, `CookieKeyValue`, `ServerID`
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

Note the **older** 600 firmware file listed under derived binaries is truncated: the real image is
70336 bytes and concordance returns only the first 65536.

**Use `600-0.2-code-base0x9000-COMPLETE.bin` for arch 14 work on the bench remote**, which is the
complete 70336 byte image read off the device and verified by its own header checksum, listed above.
This paragraph said to use the 700 image instead, which was right while the complete 600 image did not
exist and contradicted the entry sixty lines above it afterwards. The 700 image stays the reference
for anything about the 700 itself and as a second arch 14 sample.

## Contributed by kkong42, 10 August 2026

Eleven configs and two firmware images, posted as issues 18 to 28 and discussion 17 of
harmony-decompiler. The **first arch 8 firmware and the first arch 10 configs** anywhere in this
project. `docs/findings.md` sections 113, 114 and 115.

The firmware was dumped with `concordance -b -f`, which returns the complete firmware region on arch
8 and nothing usable on arch 12 or arch 14; `reference/concordance-notes.md` has why. Two images of
one build, 65536 bytes each, load base `0x010000`, differing at exactly two offsets which are both
the skin byte.

| File | Model | Role | Load base | SHA-256 |
|---|---|---|---|---|
| `H880-firmware.bin` | 880, skin 15 | application, 4.4 | `0x010000` | `815c0933...376c2f86` |
| `H885-firmware.bin` | 885, skin 17 | application, 4.4 | `0x010000` | `8c6b4ef0...11c19a799` |
| `H880-safemode.bin` | 880, skin 15 | **bootloader**, 4.0 | `0x000000` | `30340b74...1332a788` |
| `H885-safemode.bin` | 885, skin 17 | **bootloader**, 4.0 | `0x000000` | `4acf023a...dd531339` |

The two files named `-safemode` came from `concordance --dump-safemode` on 10 August 2026, and **they
are not safe mode images**: both declare software type 3, which Logitech's own firmware package calls
Boot mode, where an arch 12 or arch 14 safe mode image declares 4. The flag names the command, which
reads 64 KiB from `flash_base`, and on arch 8 that is `0x000000`. Section 116, and the third time on
this project that a file named for safe mode has held something else. The corpus calls them
`arch8_boot_880` and `arch8_boot_885`; the file names are left as the contributor sent them.

Unlike the applications, which are one build differing in two bytes, the two bootloaders differ in
15694 bytes including the reset vector, so they were compiled separately.

The configs. Their names are the contributor's room names and **the skin is the authority on the model**:
`H885-Bedroom` carries skin 15, so by its own header it is an 880.

| File | Protocol | Skin | Bytes |
|---|---|---|---|
| `H880-Bedroom.EZHex` | 8 | 15 | 396194 |
| `H880-Bedroom-Spare-1.EZHex` | 8 | 15 | 396194 |
| `H880-Bedroom-Spare-2.EZHex` | 8 | 15 | 396194 |
| `H880-Bedroom-Spare-3.EZHex` | 8 | 15 | 396194 |
| `H885-Bedroom.EZHex` | 8 | 15 | 396194 |
| `H885-LivingRoom.EZHex` | 8 | 17 | 533078 |
| `H885-LivingRoom-Spare-1.EZHex` | 8 | 17 | 533078 |
| `H885-LivingRoom-Spare-2.EZHex` | 8 | 17 | 533078 |
| `H885-LivingRoom-Spare-3.EZHex` | 8 | 17 | 533078 |
| `H890-Bedroom-1.EZHex` | 10 | 19 | 400083 |
| `H890-Bedroom-2.EZHex` | 10 | 19 | 400894 |
| `H890-Bedroom-1-New.EZHex` | 10 | 19 | 399489 |
| `H890-Bedroom-2-New.EZHex` | 10 | 19 | 399706 |
| `H890-Bedroom-2-Redump-1.EZHez` | 10 | 19 | 399975 |
| `H890-Bedroom-2-Redump-2.EZHez` | 10 | 19 | 400084 |
| `H890-Bedroom-2-Redump-3.EZHez` | 10 | 19 | 400300 |

All sixteen are distinct files, `UserId` 0, no session data, and each was published by its owner who
recorded having reviewed the contents first. Full digests are in the lab's own `META.md`; the eight
that the test suite reaches are `H885-LivingRoom.EZHex` `69c61fb2...6f5a4f05`,
`H890-Bedroom-1.EZHex` `93c9733e...8a4236d8`, `H890-Bedroom-2.EZHex` `4394835d...76b713c8`,
`H890-Bedroom-1-New.EZHex` `eacbea28...bf2b0776`, `H890-Bedroom-2-New.EZHex` `6b4ec0f6...60b32b03`,
`H890-Bedroom-2-Redump-1.EZHez` `e8900c20...0d5d2241`, `H890-Bedroom-2-Redump-2.EZHez`
`322e5791...b7fcf040` and `H890-Bedroom-2-Redump-3.EZHez` `343bc4e2...89fa5344`.

**The three `Redump` files carry the contributor's own extension typo**, `.EZHez`, and it is left as
sent: a corpus name that has to be corrected before the file can be found in the issue it came from
is worse than an ugly one.

**The `-New` and `Redump` files are further reads of the same two remotes**, contributed on 11 and 12
August 2026, and they are what turned a claim about a generator into a claim about a transfer. Section
122: **an arch 10 read duplicates whole 54 byte chunks.** Every one of these seven files is the same
396225 byte container plus a whole number of surplus chunks, and the file size column above is the only
place that shows. **Five of the seven are one remote and not one of them verifies**, while the two
reads of the other verify both times.

**So `H890-Bedroom-2.EZHex` is in the suite for being a damaged read**, and it earns its place twice
over. Its header declares an end 864 bytes before its own end marker and its trailer checksum does not
recompute, which is what turned a check no input could fail into one that fails, section 117. And its
own re-read disagrees with it, which is what established that the damage is in the transfer rather than
in the file the remote holds.

**Both `Bedroom-1` files verify and are byte identical inside the container**, which is the control the
rest of it rests on. A stable arch 10 read exists; it is just not guaranteed.

**`H885-LivingRoom.txt` accompanies one of them**, a hand written sheet naming the remote's devices
and buttons, and it belongs to the EZHex of the same name. It is the only labelled sample in the
whole corpus, which is what `tools/corpus.py` exists to ask for, and it validated the text decoder of
section 112 against a human's own reading.

## Read off a Harmony 525, 8 August 2026

Architecture 9, the first arch 9 hardware here. All three read over USB by this project's own code,
read only; they live in the lab and are not publishable, so these are the checksums. Section 76.

| File | SHA-256 | What |
|---|---|---|
| `20260808T1645Z-harmony-525-config.bin` | `a5bdb588638d81fb0b491eb47a90cfd2f9e9a4bd1ca374ad16550af0e0910ffb` | the user config, 51195 bytes, flash `0x820000` |
| `20260808-harmony-525-flash-810000.bin` | `2c29005c1080690a9d6716c94b3bb1e49856b47b448a452c329ec1c41a1e6282` | the application firmware image, 65536 bytes |
| `20260808-harmony-525-flash-800000.bin` | `dbb57d128aa8b3b0f03a7ec0de9522f09dd04cb30c350c804a25ba91b4c1412a` | a second `HG` framed image, the safe mode application, and that label is confirmed rather than inferred: see below |
| `20260808-harmony-525-internal-0x0000.bin` | `21a8cb3d1e0f512738a2cae3b7981512bfb893271d8b4056e315b8727e5626d0` | internal program memory, 32768 bytes, read in 529 single chunk commands |
| `20260808-harmony-525-safemode-ahcm.bin` | `cf0d0ece48352d7078c7333d98de68473a38945fa8a77bd78ab11f17d15bac68` | the safe mode config, cut out of the `0x810000` dump at offset `0x8000` |

`0x1000` to `0x7FFF` of the internal read is byte identical to the first 28672 bytes of the
`0x810000` image, which is what confirms both the load address and that the external image is the
running code.

## Read off the same Harmony 525 while it was stranded in safe mode, 11 August 2026

The remote was put into safe mode by the published key procedure and would not come out, so the state
was measured rather than wasted. Read only, over USB, by this project's own code. Section 118.

| File | SHA-256 | What |
|---|---|---|
| `20260811-harmony-525-flash-810000-safemode.bin` | `facf26f411f39432cc0fac674c729177c21840791821d06470d606d50be1e0b9` | the staged application image, 28672 bytes, external `0x810000` |

Its whole value is a comparison, so the digest above is also the digest of the first 28672 bytes of
the 8 August `0x810000` read and of `0x1000` to `0x7FFF` of the 8 August internal read. Three copies,
one value: entering safe mode erased internal program flash and left external flash alone.

**The 8 August dump of `0x800000` is what the label on it said.** Section 87's five accessors are
emitted as a `RETLW` run, and the values a safe mode remote reports, `20 04 16 00 09`, sit at file
offset `0x1406` of that image and nowhere in the `0x810000` one, where the application's
`30 00 16 09 09` sits at `0x4774`. The label was written on 8 August from the header alone and the
device agreed with it on 11 August. A 62 byte window read at internal `0x002400` in safe mode is byte
identical to file offset `0x1400` of that image, so the internal application region is a copy of it.

## Harmony Desktop's web application, mirrored 9 August 2026

Not a binary and not firmware, but the same rule applies: the files stay in the private lab and only
provenance is published. Logitech's `Harmony Desktop.app` is a shell around a hosted web
application, so the application itself is fetchable from their content network without an account.
Everything its own cache manifest lists was mirrored the day it was found, because a live service
can be withdrawn without notice. `docs/host-client.md` has the rule that governs using it.

| what | value |
|---|---|
| bootstrap | `https://sl.dhg.myharmony.com/desktop/2/production/` |
| discovery service it names | `https://svcs.myharmony.com/Discovery/Discovery.svc` |
| files mirrored | 368, all answering 200 |
| bundle | 5486245 bytes, sha256 `ce6bfb3f...5c7fb0fc` |
| manifest of per file hashes | sha256 `45c25743...a06a6bf0` |

The build identifier is in the asset paths, so those move; the bootstrap two levels up is the stable
entry point. The six locale manifests list the same files plus locale variants of the two large
script bundles, which are the same code with different strings.

## Firmware from Logitech's software update service, 28 August 2026

**These are reproducible for anybody**, unlike the images read off specific remotes, because they
come from the vendor's own endpoint rather than from hardware. Section 196 has the route and why it
looked closed for a day; the short version is that `sus.dhg.myharmony.com` requires the header
`Logitech-SUS-Key`, whose value is hardcoded in Harmony Desktop's web application, and refuses
everything without it. No login and no registered remote is involved, and `unit/0` is accepted in
place of a serial.

    .../SoftwareUpdates/product/<skin>/unit/0/image/latest?channel=<production|preview>&criticalOnly=false

Only those two channel names are real: nine invented ones all return the production build silently,
so a wrong channel is a wrong answer rather than an error.

| File | Bytes | SHA-256 | What |
|---|---|---|---|
| `skin99-touch-production-4.15.330.hfw2` | 13041774 | `9bc09874...ef1ed652` | Touch, Ultimate, Ultimate One, Ultimate Home, Elite, 950 |
| `skin112-950-production-4.15.330.hfw2` | 13041774 | `9bc09874...ef1ed652` | the same image served under skin 112 |
| `skin99-touch-preview-4.15.250.hfw2` | 13044888 | `52107c93...39624b32` | the same family, preview stream |
| `skin97-ultimatehub-production-4.15.600.hfw2` | 4771065 | `9eda076d...a0f8029d` | Ultimate Hub and Hub / Home Hub |
| `skin106-hub-production-4.15.600.hfw2` | 4771065 | `9eda076d...a0f8029d` | the same image served under skin 106 |
| `skin97-ultimatehub-preview-4.15.250.hfw2` | 4670138 | `891ca5a5...c7c832f9` | hub, preview stream, the XMPP candidate |
| `skin110-hubextender-production-1.2.9.pkg` | 2087100 | `5ea4776f...6c5ecb19` | Home Hub Extender |
| `skin115-pro2400hub-production-10.0.230.hfw2` | 4773033 | `01dedf3e...e52ef888` | Pro 2400 Hub |
| `skin116-pro2400-production-10.0.215.hfw2` | 13042989 | `3116ab02...afd34e66` | Pro 2400 |
| `skin104-harmony350-production-1.4.0.0` | 46773 | `4be38271...2e14371b` | **Harmony 300 and Harmony 350**, skins 78, 79 and 104 |
| `skin106-hub-firmware_factory.hfw2` | 4662377 | `0893c4cf...304e181e` | hub factory image, from the content network with no key |

Every length above is the length the service stated before the download. **One image serves a whole
family and that is measured, not inferred from the sizes**: skins 99 and 112 are byte identical, as
are skins 97 and 106, and only the download filename differs per skin. Eight skins have no image on
either channel: 78 and 104 by this route, 98, 101, 107, 109, 113 and 114. The last row comes from a
second, keyless route, `Firmware/<skin>/firmware_factory.hfw2` on the content network, which serves
skin 99 and skin 106 and answers 403 for every other skin. The Harmony Touch factory image from that
route was fetched a day earlier and is recorded in the lab's own notes.

The nine `.hfw2` and `.pkg` files are the Linux generation, ARM with a squashfs root, and nothing
here reads them yet. The one that matters is the small one.

### The Harmony 300 and 350 package

`skin104-harmony350-production-1.4.0.0` is a ZIP holding a `Description.xml` and a
`Region_2.EZUpgrade`, the same shape as the three `.hfw` packages above, and its `<INTENDED>` names
skins 78, 79 and 104: both regional Harmony 300 skins and the Harmony 350. It is the **fourth**
package of this kind and the first that did not come from a third party site.

| File | SHA-256 | How to produce it |
|---|---|---|
| `350-1.4-Region_2-code-base0x9000.bin` | `7762d37273b8a22fcb58e733ddb064d77ec91c358a65d5e6062d325f0649c300` | `tools/ezextract.py` on `Region_2.EZUpgrade` from that ZIP, 73472 bytes |

Its `Description.xml` states `SEED="0x4321" OFFSET="0x0004" LENGTH="0x11EF8"
EXPECTEDVALUE="0x8F7B" TYPE="XOR"`, and that recomputes over the decoded payload. The seed, the word
width and the algorithm are section 41's, derived here from config container trailers, so **the
vendor states a rule this project inferred** by a route with no shared bytes. `gspm.xor_words` is the
one implementation both use.

Verify it yourself:

```sh
python3 -c "import sys; sys.path.insert(0, 'src'); from harmony import ezfile, gspm; p = ezfile.decode_payload(open(sys.argv[1], 'rb').read()).payload; print(hex(gspm.xor_words(p[4:4 + 0x11EF8], 0x4321)))" <Region_2.EZUpgrade>
```

### The hub generation packages, catalogued and not dug into

A **catalogue entry**, per `docs/lab-excavation.md`: the hub family is that plan's stated exclusion,
so this records what the packages are and stops rather than pretending the question is open work. No
test, because nothing here is a claim this project depends on.

Both hub packages are a Linux system rather than a microcontroller image, and their shape is the same:
a ZIP holding a `Description.xml` and an `ota-update.EzHex`, where the EzHex is **itself a ZIP** of
five members.

| member | what it is |
|---|---|
| `sdigest`, `digest` | SHA-1 per member, so a package states its own component digests |
| `update` | the updater: a statically linked, stripped 32 bit big endian MIPS ELF |
| `uImage.bin` | a U-Boot image, lzma compressed, whose own header names it `Pimento Kernel Image` |
| `harmony-image.squashfs` | the root filesystem, squashfs 4.0, lzma compressed |

Two things worth knowing came out of it and neither needed the filesystem opened. The kernel's header
**names its own product**, and Pimento is Logitech's codename for skin 97 in the templates section 197
read, so a header written by their build system agrees with a comment in their client. And the
`update` binary is **byte identical** between the February 2019 preview build and the August 2025
production one, same SHA-1, so six years of change sits entirely in the kernel and the root filesystem.

**What `xmppupdate` installs is not settled**, and the honest state of it is: the root filesystem uses
the legacy lzma variant that mainline `unsquashfs` refuses, reporting file system corruption on a
superblock it has just called valid, and no other unpacker is installed here. The remaining evidence
is circumstantial and stays labelled as such. The recovery tool passes `SpecialSUSStream=preview`, and
the preview stream is frozen at a February 2019 build across the whole family while production has
moved to August 2025. That is the shape a "keep the old behaviour" firmware would have and it is not a
demonstration that this one is.

## Logitech's classic client reading a Harmony One, captured 7 August 2026

Not a binary and not a config: the packet log of the classic client, rebuilt from its own decompiled
source, reading a Harmony One over USB against a local stand-in for its discontinued server. It stays
in the lab because it carries that unit's identity block in the clear, so this is the checksum.
Section 210, and `packages/usb/test/classic-capture.test.ts` reads it as the fixture
`classic_read_capture`.

| File | SHA-256 | What |
|---|---|---|
| `run.log` | `735b193d12cba3a4aeef24983b7627c499c984bf891f4de4541a5f68a2823d7a` | 11770605 bytes, 69572 lines, of which 69344 are packets in both directions |
| `requests.jsonl` | `bcf06c149c82adf1ee5b178658382fc3833215aa8167378dc52147853a289aa3` | the client's 48 HTTP calls to the stand-in, four distinct paths |
| `localserver.log` | `62e2b75d9d09e5f580e83f72ee6d1e422706e3daf90657133185e0bd8b073880` | the stand-in's own view, ending in the client's report of a completed read |
| `repack.txt` | `f59b5753a8f76a700f25a546c3ab3e2b4768907e49a2efc2abf3e3944ca04496` | the rebuild receipt: 827 of 829 classes compiled from recovered source |

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
| 880 / 885 application | `0x010000` | not in the image | the `HG` magic is at offset **4** here, not 8; 979 boundary hits against 602 |
| 880 / 885 bootloader | `0x000000` | reset `GOTO 0x0637C` on the 880 | 342 boundary hits against 46; both interrupt vectors go to `0x010400` and `0x010800`, inside the application |
| 300 / 350 1.4 `Region_2` | `0x9000` | `GOTO 0x1AED4` at `0x900A` | 1581 of 1582 targets land on a boundary, 99.9%, against 475 of 1460 for the runner up, 32.5%. The header's own entry point field says `0x1AED4`, so the base has a closure and not only a score. Section 196 |

Ghidra language: `PIC-18:LE:24:PIC-18`. Only a generic variant exists, so SFRs come out
unnamed; `tools/pic18_disasm.py` resolves them instead.
