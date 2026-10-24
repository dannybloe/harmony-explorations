# Harmony 600, 650 and 700: the shared platform

The Harmony 600, 650 and 700 are one remote in three versions. They look the same, take the same keys,
run the same program and read the same kind of configuration; they differ in the screen (grey on the 600,
colour on the other two), in the batteries (the 700 charges its own), in how many devices Logitech lets a
person set up, and in which build of the firmware each runs. This folder states what the three share,
once; each model's folder states only how it differs.

Logitech's own client calls this **architecture 14**, codename Molson[^s197], and this project uses the
same number.

| model | folder |
|---|---|
| Harmony 600 | [harmony-600](../../remotes/harmony-600/README.md) |
| Harmony 650 | [harmony-650](../../remotes/harmony-650/README.md) |
| Harmony 700 | [harmony-700](../../remotes/harmony-700/README.md) |
| Harmony 665 | none: Logitech's service places skin 75 here[^s131], and nothing of it has been read |

**The three share one face**: the same keys in the same places and the same form factor, with only the
model number near the bottom differing[^t-models]. The three manuals give the same dimensions and
weight[^x-manual-600][^x-manual-650][^x-manual-700-2010]. So the 600's drawing serves all three: `h650.ts`
and `h700.ts` in `packages/silhouettes/src/models/` take it by reference and print their own model number.

## Skins

<!-- generated:skins -->
| skin | model | panel | max devices | favourite channel buttons | newest firmware the forum table knows |
|---|---|---|---|---|---|
| 66 | Harmony 700 | colour | 8 | 23 | 2.5.0 |
| 69 | Harmony 700 EMEA | colour | 8 | 23 | 2.5.0 |
| 71 | Harmony 600 | monochrome | 5 | 23 | 0.2 |
| 72 | Harmony 650 | colour | 8 | 23 | 0.2 |
| 73 | Harmony 600 EMEA | monochrome | 5 | 23 | 0.2 |
| 74 | Harmony 650 EMEA | colour | 8 | 23 | 0.2 |
| 75 | Harmony 665 | colour | 10 | 23 | 0.2 |

Generated from `MODELS_BY_SKIN` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Skins 71 and 72 are what a Harmony 600 and a Harmony 650 report[^s281], and 66 what a Harmony 700
reports[^s295]; 69, 73, 74 and 75 are Logitech's service[^s131]. The max devices column is Logitech's
service too[^s136]. The panel, favourites and firmware columns are a forum's table[^x-forum], except the
600's monochrome panel, which its manual states[^x-manual-600].

## Shared, in one table

| | value | evidence |
|---|---|---|
| processor | `PIC18F67J50`, 64 pins, no external memory bus, [the comparison of architectures](../README.md#two-ways-to-run-a-program); the device id is outside what a USB read reaches, so it is not measured | [^s3] |
| external flash | 2 MiB SPI, reporting flash id `15:1C`, on all three models; [memory.md](memory.md) | [^s88], [^s281b], [^s300], [^s302] |
| execution | the application is stored in external flash and copied into internal flash at `0x9000` to run; the configuration is read a few bytes at a time and never executed in place | [^s3] |
| user configuration | external `0x030000`, [memory.md](memory.md); container format 1.4 with 20 pointer slots, [the container](../../config-format/container.md) | [^s88], [^s7] |
| screen | 1.5 inch, 128 by 128; [each model's display page](../../remotes/harmony-650/display.md) | [^x-manual-600], [^x-manual-650], [^x-manual-700-2010], [^s129] |
| keys | 54 scan codes, each raising a press, a repeat and a release, below | [^s17], [^s311] |
| device mode | the centre key below the display, under the word "Devices"; there is no Devices key, [how a Harmony works](../../how-a-harmony-works.md) | [^x-manual-650], [^s311] |
| clock on screen | **none**: the ordinary screen has no time on it, and these configurations hold no timer that would redraw one, [how a Harmony works](../../how-a-harmony-works.md#what-the-screen-does-and-what-it-does-not) | [^s430] |
| long press | none | [^t-long-press], [^s340] |
| USB product id | `0xC122` for all three | [^s281b], [^s295] |
| battery voltage over USB | in millivolts, `READ_MISC` `0x0C` detail 1, see [usb.md](usb.md) | [^s212], [^s340b] |
| infrared | 2 transmitters, up to 50 ft, learning up to 200 kHz | [^x-manual-600], [^x-manual-650], [^x-manual-700-2010] |
| size | 8.75 x 2.3 x 1.3 inch, 6 oz | [^x-manual-600], [^x-manual-650], [^x-manual-700-2010] |

## Keys

A key is either on the **keypad**, bound by the activity and device maps, or one **the screen speaks
for**, whose meaning is whatever the current page draws beside it. On this architecture the two share no
scan code at all, measured over the Harmony 600's and 700's configurations[^s128]. The screen keys are the
four flanking the display and the three below it; each model's keys page has the codes.

A key raises three events and no others[^s340]:

| event | when |
|---|---|
| press | the key goes down |
| repeat | the key is still down when a timer started at the press runs out |
| release | the key is let go |

**There is no long press.** Nothing in the firmware tells a short press from a long one, so a long press
action could only be imitated by a configuration binding a key's repeat, and Logitech's compiler binds the
activity keys' press alone[^s340]. **Help waits longer**: the repeat timer is one value for every key and
another for Help, scan 3, starting at 10 and 50, each multiplied by 100 before the timer starts, so Help
waits five times longer before its repeat[^s340]. Read on the Harmony 650's 0.2 build; the Harmony 600's
0.2 build is the same program[^s392], and the Harmony 700's builds are not read for this[^unchecked]. The
timer's unit and whether the repeat keeps firing while the key is held are not read[^unchecked].

## How the three differ

| | Harmony 600 | Harmony 650 | Harmony 700 |
|---|---|---|---|
| panel | monochrome[^x-manual-600] | colour[^x-manual-650] | colour[^x-manual-700-2010] |
| power | AA cells[^x-manual-600] | AA alkaline[^x-manual-650] | rechargeable NiMH AA, charged over USB with an AC adaptor[^x-manual-700-2010] |
| keypad backlight | white[^x-manual-600] | yellow[^x-manual-650] | white[^x-manual-700-2010] |
| devices, Logitech's manual | 5[^x-manual-600] | 5[^x-manual-650] | 6 in the 2009 edition[^x-manual-700-2009], 8 in the 2010 edition[^x-manual-700-2010] |
| devices, Logitech's service | 5 | 8 | 8[^s136] |
| most devices a remote has run | 6[^s390] | 6[^s305], and more in runs no archive section holds[^unchecked] | 7[^s386] |
| firmware builds known | 0.2[^s23] | 0.2[^s281], and 0.4 in Logitech's package[^s30] | 2.5[^s295] and 2.8[^s297] |
| model number in the build's version reply | 71[^s392] | 72[^s392] | not read[^unchecked] |
| the firmware's own screens in a configuration | 14 | 14 | 19, the charging frames added[^s347][^s357] |
| state variables in data memory | from `0xE10`, build 0.2[^s303][^s387] | from `0xE10`, build 0.2[^s283] | from `0x900`, build 2.8[^s384][^s386] |
| parameter group 3, a light's four levels, in Logitech's compiles | 1, 3, 5, 32 | 10, 20, 8, 32 | 3, 5, 10, 32[^s392] |
| external `0x000000` | a stored copy of the application[^s281b] | erased but for a copy of the identity block's first bytes[^s281b] | the staging region an update installs from[^s297] |
| hardware version reported | 1.1[^s302] | 1.2, read with no archive section to hold it[^unchecked] | not read[^unchecked] |
| mode 0, the empty activity key's screen | "add an Activity" | "add an Activity" | a charging battery; the placeholder is mode 4[^s311] |
| picture look in Logitech's compiles | monochrome | colour, 2026 | colour, 2021 to 2026[^s330] |

**The Harmony 700's device count, settled**: Logitech's manual says 6 in its 2009 English edition, "up to 6
devices" and "Maximum number of devices per account 6"[^x-manual-700-2009], and 8 in its 2010 edition, in
English "up to 8 devices" and "Maximum # of devices per account 8"[^x-manual-700-2010], as Logitech's
service does[^s136]. So the figure was raised between the two editions, and a remote has run seven[^s386].

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the shared memory map and its constants |
| [firmware.md](firmware.md) | images, builds, safe mode, the staging and reinstall routes |
| [usb.md](usb.md) | the command set, the identity, the write lists and rails |
| [compiler.md](compiler.md) | what Logitech's compiler writes into a configuration for these models |
| [misc.md](misc.md) | the rest |

## Not checked

* The Harmony 665: whether it is architecture 14 in anything but Logitech's table[^unchecked].
* Whether the remote enforces any device limit at all: each model has run more devices than an edition of
  its manual names, the 600 six, the 650 six and the 700 seven, above[^unchecked].
* Which light parameter group 3 sets[^s392].
* The 700's hardware version as reported, and whether its screen differs physically from the 650's[^unchecked].

[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s131]: Stated by Logitech, by their service. [Section 131](../../../docs/findings.md#s131)
[^t-models]: Measured on a unit. [The test](../../../packages/silhouettes/test/models.test.ts)
[^x-manual-600]: Stated by Logitech, in the manual. [The Harmony 600 user manual](https://support.myharmony.com/harmony-600-user-manual)
[^x-manual-650]: Stated by Logitech, in the manual. [The Harmony 650 user manual, 2010](https://www.logitech.com/assets/44635/3/harmony650-user-guide.pdf)
[^x-manual-700-2010]: Stated by Logitech, in the manual. [The Harmony 700 user manual, 2010 edition](https://cdn-cx-images.dynamite.myharmony.com/usermanuals/harmony700-usermanual-en.pdf)
[^s281]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s295]: Measured on a unit. [Section 295](../../../docs/findings.md#s295)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^x-forum]: Stated by a third party. [The comparison table of harmony-remote-forum.de](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s3]: Read in the firmware. [Section 3](../../../docs/findings.md#s3)
[^s88]: Read in the firmware. [Section 88](../../../docs/findings.md#s88)
[^s281b]: Measured on a unit. [Section 281](../../../docs/findings.md#s281)
[^s300]: Measured on a unit. [Section 300](../../../docs/findings.md#s300)
[^s302]: Measured on a unit. [Section 302](../../../docs/findings.md#s302)
[^s7]: Measured in configurations. [Section 7](../../../docs/findings.md#s7)
[^s129]: Measured in configurations. [Section 129](../../../docs/findings.md#s129)
[^s17]: Measured in configurations. [Section 17](../../../docs/findings.md#s17)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s430]: Measured in configurations. [Section 430](../../../docs/findings.md#s430)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^s340]: Read in the firmware. [Section 340](../../../docs/findings.md#s340)
[^s212]: Read in the firmware. [Section 212](../../../docs/findings.md#s212)
[^s340b]: Measured on a unit. [Section 340](../../../docs/findings.md#s340)
[^s128]: Measured in configurations. [Section 128](../../../docs/findings.md#s128)
[^s392]: Read in the firmware. [Section 392](../../../docs/findings.md#s392)
[^unchecked]: Not checked.
[^x-manual-700-2009]: Stated by Logitech, in the manual. [The Harmony 700 user manual, 2009 edition](https://www.manualslib.com/manual/96454/Logitech-Harmony-700.html)
[^s390]: Measured on a unit. [Section 390](../../../docs/findings.md#s390)
[^s305]: Measured on a unit. [Section 305](../../../docs/findings.md#s305)
[^s386]: Measured on a unit. [Section 386](../../../docs/findings.md#s386)
[^s23]: Measured on a unit. [Section 23](../../../docs/findings.md#s23)
[^s30]: Read in the firmware. [Section 30](../../../docs/findings.md#s30)
[^s297]: Measured on a unit. [Section 297](../../../docs/findings.md#s297)
[^s347]: Measured in configurations. [Section 347](../../../docs/findings.md#s347)
[^s357]: Measured in configurations. [Section 357](../../../docs/findings.md#s357)
[^s303]: Read in the firmware. [Section 303](../../../docs/findings.md#s303)
[^s387]: Measured on a unit. [Section 387](../../../docs/findings.md#s387)
[^s283]: Measured on a unit. [Section 283](../../../docs/findings.md#s283)
[^s384]: Read in the firmware. [Section 384](../../../docs/findings.md#s384)
[^s330]: Measured in configurations. [Section 330](../../../docs/findings.md#s330)
