# Harmony 885: firmware

The program a Harmony 885 runs, its versions, and what makes it an 885 rather than an 880. How the images
are laid out, where they load and how a copy is obtained is the platform's, in
[the architecture's firmware page](../../architectures/harmony-880-885/firmware.md).

| image | version | the 885's own | source |
|---|---|---|---|
| application | 4.4 | the skin, 17, at image offsets `0x1C4A` and `0xA63C`, where the 880's image holds 15; nothing else differs | [^s114] |
| bootloader | 4.0 | a build of its own: 15694 bytes differ from the 880's, its reset vector `GOTO 0x06392` against the 880's `0x0637C`. While it copies a staged application it records which source it copies from, status 4 or 7, where the 880's records 4 for both | [^s116][^t-885-boot] |

**Both bootloaders make the same decision at power on and answer the same commands**: install a staged
application if asked, stay resident while one of two keys is held, otherwise check the application and
start it, [the architecture's firmware page](../../architectures/harmony-880-885/firmware.md#what-the-bootloader-does-at-power-on).[^t-885-boot]

**The newest firmware the community comparison table knows is 4.4.2**, in the generated table in
[the README](README.md), where the images read here are 4.4.[^x-forum-table][^s114]

## Not checked

* Which version a unit runs, and whether 4.4.2 differs from 4.4 in anything that matters here.[^unchecked]

[^s114]: Read in the firmware. [Section 114](../../../docs/findings.md#s114)
[^s116]: Read in the firmware. [Section 116](../../../docs/findings.md#s116)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^unchecked]: Not checked.
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
