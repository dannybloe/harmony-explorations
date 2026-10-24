# Harmony 525: behaviour

What the remote does in use, as a person holding it sees it, and what it does on the cable. The operating
concept, activities and device mode, is [how a Harmony works](../../how-a-harmony-works.md), and this page
does not restate it.

## Device mode, in and out

| | how |
|---|---|
| in | the **Devices** key on the keypad, then the soft key beside a device[^x-manual] |
| on a device | "the Harmony 525 controls only that device", with "all the commands for the device included in your Harmony 525 configuration"[^x-manual] |
| out | the **Activities** key, "return to Activities"[^x-manual] |

The 525 has a key of its own for each direction, where the Harmony 600, 650 and 700 use the centre key
below the screen for both and the Harmony One uses its touch keys; [how a Harmony
works](../../how-a-harmony-works.md#getting-into-device-mode-and-back) links each model's way in and out.

## Light and sleep

The backlight comes on with the Glow key and not with movement; after two hours without motion the
remote sleeps and motion wakes it.[^x-manual] Whether a key press also lights it is not
checked.[^unchecked]

## On the cable

* **The first exchange of a session can go unanswered**: the first `GET_VERSION` went unanswered for three
  polls of two seconds, and every exchange after it answered in about 2 ms. A single retry covers it, and
  no reset is needed.[^s76]
* **A whole internal read of 32 KiB**, 529 single chunk commands, completes with no restart.[^s76]
* **An odd count internal read is refused by `packages/usb`** here too, as on the Harmony One, because
  nothing establishes that this model does not hang on one, [the architecture's
  memory.md](../../architectures/harmony-5xx/memory.md#internal-flash-32-kib).[^unchecked]
* **In safe mode the remote still answers reads**, its configuration at `0x820000` included, and
  `GET_VERSION` is flaky enough to need retries.[^s118]
* **A running remote's working memory cannot be read**: the data memory window answers zeros, including
  bytes the answering read is using,[^s137] and `READ_MISC` serves selector 1 alone, [the architecture's
  usb.md](../../architectures/harmony-5xx/usb.md#read_misc-and-why-there-is-no-live-memory-read).[^s90]

## After a write

* **The remote does not restart**: the erase, both neighbour reads, 21 transfers and the read back went
  over one connection.[^s269]
* **The configuration read back afterwards** through a different reader has the SHA-256 of the read
  before.[^s269]
* **Nothing re-checks the configuration on its own**, so no stale verdict can hold a status screen up; the
  restart and the cache drop that a Harmony One write ends with are not needed here, and the restart is
  refused.[^s253][^s269]

The reason is the storage: the configuration sits on a serial chip that is not memory mapped, so nothing
executes out of the block being erased.[^s269] The Harmony One restarts after a write for the opposite
reason.[^s247]

## Safe mode

* **Entered by holding Off while the batteries go in**, a repair shop's published procedure[^x-safe-mode]
  that was followed on a unit.[^s118]
* **It copies the safe mode image over the application**: the 28 KiB application in internal flash is
  gone, replaced by an image of under 10 KiB, everything above `0x3800` erased.[^s118]
* **A power cycle does not leave it**, because the safe mode image is what is resident and nothing asks
  for a change.[^s118][^s119]
* **The USB product string becomes `Harmony Safe Mode!`** and the version block reports firmware 2.0 and
  software type 4; the product id and `bcdDevice` do not change.[^s118]
* **Leaving it needs the application copied back** from external flash, which one byte of EEPROM
  requests, and the screen then reports the upgrade complete until the batteries come out.[^s119b]

[firmware.md](firmware.md) has the mechanism and [the architecture's
firmware.md](../../architectures/harmony-5xx/firmware.md#safe-mode-is-a-one-way-door) the rule: **never
enter safe mode on this model as an experiment.**

## The clock

At the application's own start the firmware seeds every state variable, its own thirteen included, from
the configuration, so a 525 starts its clock from the configuration as a power cycled Harmony One
does.[^s274] The firmware owns variables 0 to 12 on this model, where the other architectures own 0 to
17.[^s284]

**No reading of the running clock is known.** The data memory window answers zeros.[^s137] `READ_MISC`
selector 1 returns a parameter by index;[^s90] it was sent once in a sweep whose decoder took the reply's
high byte as the value, so that zero says nothing about it.[^s90b] What it answers with the corrected
decoder has not been read; a third party reports parameter 0 moving with the clock.[^unchecked]

## Not checked

* Whether the screen shows the clock.[^unchecked]
* Anything about the 525 in use with an infrared receiver.[^unchecked]
* How many activities it holds, and how it behaves at the device limit.[^unchecked]

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 525 user manual](https://www.manualslib.com/manual/454951/Logitech-Harmony-525.html)
[^unchecked]: Not checked.
[^s76]: Measured on a unit. [Section 76](../../../docs/findings.md#s76)
[^s118]: Measured on a unit. [Section 118](../../../docs/findings.md#s118)
[^s137]: Measured on a unit. [Section 137](../../../docs/findings.md#s137)
[^s90]: Read in the firmware. [Section 90](../../../docs/findings.md#s90)
[^s269]: Measured on a unit. [Section 269](../../../docs/findings.md#s269)
[^s253]: Read in the firmware. [Section 253](../../../docs/findings.md#s253)
[^s247]: Measured on a unit. [Section 247](../../../docs/findings.md#s247)
[^x-safe-mode]: Stated by a third party. [A repair shop's safe mode procedure](https://www.harmonyremoterepair.com/files/theme/Documents/Safe_Mode_Instructions.pdf)
[^s119]: Read in the firmware. [Section 119](../../../docs/findings.md#s119)
[^s119b]: Measured on a unit. [Section 119](../../../docs/findings.md#s119)
[^s274]: Read in the firmware. [Section 274](../../../docs/findings.md#s274)
[^s284]: Read in the firmware. [Section 284](../../../docs/findings.md#s284)
[^s90b]: Measured on a unit. [Section 90](../../../docs/findings.md#s90)
