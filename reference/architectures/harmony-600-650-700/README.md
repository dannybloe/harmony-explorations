# Harmony 600, 650 and 700: the shared platform

**Architecture 14** in Logitech's own client and in this project, codename Molson. Three models built
on one processor, one flash part family, one firmware program and one configuration format, which
differ in the panel, the power supply, the device limit and the build of firmware each runs. This
folder states what they share, once; each model's folder states only how it differs.

| model | folder | bench unit |
|---|---|---|
| Harmony 600 | [harmony-600](../../remotes/harmony-600/README.md) | one, a write target since 29 September 2026 |
| Harmony 650 | [harmony-650](../../remotes/harmony-650/README.md) | one, a write target since 27 September 2026 |
| Harmony 700 | [harmony-700](../../remotes/harmony-700/README.md) | one, a write target since 29 September 2026 |
| Harmony 665 | none | none. `models.ts` and `reference/models.md` place skin 75 here; nothing of it has been read |

The face, the layout of keys and the form factor are shared by the 600, 650 and 700, Danny's
statement, and the 600's drawing serves all three: `h650.ts` and `h700.ts` in `packages/silhouettes/src/models/` take it by reference and print their own model number.

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

Skins 66, 71 and 72 are confirmed by firmware literals or live remotes, `reference/models.md`; 69, 73,
74 and 75 are Logitech's service, section 131. Panel, favourites and firmware columns are the forum
table's, third party, except the 600's monochrome panel, which is seen on the bench unit.

## Shared, in one table

| | value | standing and source |
|---|---|---|
| processor | `PIC18F67J50`, 64 pins, no external memory bus | read in the firmware, `CLAUDE.md` key facts and `docs/memory-map.md`; the device id is outside the read window, so not measured |
| external flash | 2 MiB SPI, EON F16, reported as `15:1C` | measured on all three bench units, sections 281, 300 and 302 |
| execution | the application is stored in external flash and copied into internal flash at `0x9000` to run; the configuration is read through one SPI routine and never executed in place | read in the firmware, `docs/memory-map.md` |
| user configuration | external `0x030000`, container format 1.4, 20 pointer slots, cookies `GSPM` and `PTYY` | measured, `CLAUDE.md` key facts |
| screen raster | 128 by 128 | measured from the configurations, section 129; and all three manuals |
| screen size | 1.5 inch | all three manuals |
| keys | 54 scan codes, three events each | read from configurations, sections 17 and 311 |
| device mode | the centre key below the display, under "Devices"; no Devices key | manuals, `docs/how-a-harmony-works.md` |
| clock on screen | **none** | seen at the bench, 4 October 2026, `docs/how-a-harmony-works.md` |
| long press | none | Logitech's service, `reference/capabilities.md` |
| USB product id | `0xC122` for all three | measured, section 281 |
| battery voltage over USB | in millivolts, `READ_MISC` `0x0C` detail 1, see [usb.md](usb.md) | firmware on all three, sent to the 650 only, sections 212 and 340 |
| infrared | 2 transmitters, up to 50 ft, learning up to 200 kHz | all three manuals |
| size | 8.75 x 2.3 x 1.3 inch, 6 oz | all three manuals |

## How the three differ

| | Harmony 600 | Harmony 650 | Harmony 700 |
|---|---|---|---|
| panel | monochrome, seen | colour, manual | colour, manual |
| power | AA cells, manual | AA alkaline, manual | rechargeable NiMH AA, charged over USB with an AC adaptor, manual |
| keypad backlight | white, manual | yellow, manual | white, manual |
| devices, manual | 5 | 5 | 6 |
| devices, Logitech's service | 5 | 8 | 8 |
| firmware on the bench unit | 0.2 | 0.2, a different build | 2.8, staged by this project, section 297 |
| application copy at external `0x000000` | yes | **no**, erased but for an identity copy | the staging region, section 297 |
| hardware version reported | 1.1 | 1.2 | not recorded here |
| mode 0, the empty activity key's screen | "add an Activity" | "add an Activity" | a charging battery; the placeholder is mode 4, section 311 |
| picture look in compiles | monochrome | colour, 2026 | colour, 2021 to 2026, section 330 |

## The files

| file | what it holds |
|---|---|
| [memory.md](memory.md) | the shared memory map and its constants, and which parts of the per unit maps it carries |
| [firmware.md](firmware.md) | images, builds, safe mode, the staging and reinstall routes |
| [usb.md](usb.md) | the command set, the identity, the write lists and rails |
| [misc.md](misc.md) | the rest |

## Not checked

* The Harmony 665: whether it is architecture 14 in anything but Logitech's table.
* Whether the 600's and 650's device limits differ in the remote or only in Logitech's software.
* The 700's hardware version as reported, and whether its screen differs physically from the 650's.
