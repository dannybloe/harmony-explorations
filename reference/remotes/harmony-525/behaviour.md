# Harmony 525: behaviour

What the remote does in use, as a person holding it sees it, and what it does on the cable. The operating
concept, activities and device mode, is `docs/how-a-harmony-works.md`, and this page does not restate it.

## Device mode, in and out

| | how | standing and source |
|---|---|---|
| in | the **Devices** key on the keypad, then the soft key beside a device | Logitech's manual, "Controlling your devices individually"; `docs/how-a-harmony-works.md` |
| on a device | "the Harmony 525 controls only that device", with "all the commands for the device included in your Harmony 525 configuration" | Logitech's manual |
| out | the **Activities** key | `docs/how-a-harmony-works.md`; Logitech's manual, "return to Activities" |

The 525 has a key of its own for each direction, where the Harmony 600, 650 and 700 use the centre key
below the screen for both and the Harmony One uses its touch keys, `docs/how-a-harmony-works.md`.

## Light and sleep

The backlight comes on with the Glow key and not with movement; after two hours without motion the
remote sleeps and motion wakes it, Logitech's manual. Whether a key press also lights it is **not
checked**.

## On the cable

| what happens | standing and source |
|---|---|
| the first `GET_VERSION` of a session went unanswered for three polls of two seconds, and every exchange after it answered in about 2 ms; a single retry covers it, and no reset is sent | measured on a unit, section 76 |
| a whole internal read of 32 KiB, 529 single chunk commands, completed with no restart | measured on a unit, section 76 |
| an odd count internal read is refused by `packages/usb` here too, as on the Harmony One, because nothing establishes that this model does not hang on one | `docs/memory-map-525.md`; `CLAUDE.md` |
| in safe mode the remote still answers reads, its configuration at `0x820000` included, and `GET_VERSION` is flaky enough to need retries | measured on a unit, section 118 |
| a running remote's data memory cannot be read: every window answers zeros, including bytes the answering read is using | measured on a unit, sections 90 and 137 |

## After a write

| what happens | standing and source |
|---|---|
| **the remote does not restart**: the erase, both neighbour reads, 21 transfers and the read back went over one connection | measured on a unit, section 269 |
| the configuration read back afterwards through a different reader has the SHA-256 of the read before | measured on a unit, section 269 |
| nothing re-checks the configuration on its own, so no stale verdict can hold a status screen up; the restart and the cache drop that a Harmony One write ends with are not needed here, and the restart is refused | read in the firmware, sections 253 and 269 |

The reason is the storage: the configuration sits on a serial chip that is not memory mapped, so nothing
executes out of the block being erased, section 269. The Harmony One restarts after a write for the
opposite reason, section 247.

## Safe mode

| what happens | standing and source |
|---|---|
| **entered by holding Off while the batteries go in** | third party, a repair shop's published procedure; followed on a unit, section 118 |
| **it copies the safe mode image over the application**: the 28 KiB application in internal flash is gone, replaced by an image of under 10 KiB, everything above `0x3800` erased | measured on a unit, section 118 |
| a power cycle does not leave it, because the safe mode image is what is resident and nothing asks for a change | measured and read in the firmware, sections 118 and 119 |
| the USB product string becomes `Harmony Safe Mode!` and the version block reports firmware 2.0 and software type 4; the product id and `bcdDevice` do not change | measured on a unit, section 118 |
| leaving it needs the application copied back from external flash, which one byte of EEPROM requests; that was done by hand from a private script, and the screen reported the upgrade complete until the batteries came out | measured on a unit, section 119 |

[firmware.md](firmware.md) has the mechanism and the rail. **Never enter safe mode on this model as an
experiment**, `CLAUDE.md`.

## The clock

At the application's own start the firmware seeds every state variable, its own thirteen included, from
the configuration, so a 525 starts its clock from the configuration as a power cycled Harmony One does,
read in the firmware, section 274. The firmware owns variables 0 to 12 on this model, where the other
architectures own 0 to 17, section 284. Whether a running 525's clock can be read is answered in the
negative, section 137; a third party reports reading it through `READ_MISC` selector 1, which nothing
here has sent, section 90.

## Not checked

* Whether the screen shows the clock.
* Anything about the 525 in use with the infrared receiver: no bench infrared run exists for it.
* How many activities it holds, and how it behaves at the device limit.
