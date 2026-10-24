# Harmony 525: features

What the 525 offers a person and what Logitech's software let them set. It controls up to ten or twelve
devices, depending on which of Logitech's statements is believed, starts activities from a list on its
screen, keeps track of which devices are on, and learns codes from an original remote.[^x-manual] Unlike
the later models, the 525 has **no capability statement from Logitech's live service** beyond its product
record, because the service has the product switched off, below.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 22 | 12 | none | yes | no | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Standing of each column: **max devices** is Logitech's service, `MaxDevicesPerAccount`,[^s136] agreeing
with its product table;[^s145] **long press** is Logitech's service, which declares none for this
model;[^t-long-press] every other column is the forum table's.[^x-forum] The page button's "no" is
consistent with what the configurations do, since paging is a soft key binding, [keys.md](keys.md), and
the sequences' "yes" is consistent with the firmware, whose action lists run many instructions on every
architecture read.[^s34]

## Logitech's service has the product switched off

| | value |
|---|---|
| the product record | `ProductId 35, SkinId 22`, named Harmony 525[^s135] |
| `IsEnabled` | **false**, where every model Logitech's current software supports is true[^s145] |
| adding a 525 to an account | accepted[^s135] |
| compiling a configuration for it | ends in a bare `status='Error'`, while the same session compiles a Harmony One[^s135] |
| remote settings | none listed[^s292] |
| Harmony Desktop | does not recognise the remote at all: skin 22 is on neither of its two product lists[^s135b] |

**So nothing compiles a configuration for a 525 today**, and no vendor built file exists to check one of
this project's against.[^s145] The model's own software, the Harmony Remote Software, is the classic
platform,[^x-manual] and [the architecture's firmware.md](../../architectures/harmony-5xx/firmware.md#the-erase-hazard)
says what that means for a write.

## Devices: twelve or ten

**Logitech's service and the forum table say 12.**[^s136][^x-forum] **Logitech's manual says 10**: "you
can configure the Harmony 525 to control up to 10 devices", "Maximum number of devices per account 10",
and it replaces "up to ten remotes".[^x-manual] Two readings fit, a limit raised in a later software
generation or marketing rounding, and nothing here chooses. Whether a configuration of more than ten
devices loads, and whether the remote itself enforces a limit, are not checked.[^unchecked]

## Activities and device mode

* **Activities** start from the Activities screen with a soft key; the Activities key returns to
  it.[^x-manual]
* **Device mode**: "When you press the Device button, the Harmony 525 screen displays a list of your
  devices ... After you select a device, the Harmony 525 controls only that device. You have access to all
  the commands for the device included in your Harmony 525 configuration".[^x-manual] The way in and out
  is [behaviour.md](behaviour.md#device-mode-in-and-out).
* **How many activities a 525 holds** is not stated by the manual and not checked.[^unchecked]
* **Smart State Technology**: the remote tracks which devices are on, and the Help key's questions put it
  back in step.[^x-manual]

## Delays

The manual's three per device settings are the **Power On Delay**, the **Inter-Key Delay** and the
**Input Delay**.[^x-manual] A `0x7C` operand is a delay in tenths of a second on every architecture, so a
525 configuration states its power on delays the same way.[^s235]

## Sequences

The action queue holds forty instructions on this model: a ring of `0x78` bytes of three byte
instructions, the same forty the Harmony One's has.[^s254] So the rail that refuses an oversized sequence
by its peak queue depth, `assertQueueFits`, rests on a constant read on this architecture as well. A
sequence run on a 525 is not checked.[^unchecked]

## Favourite channels

The forum table states no favourite channel buttons.[^x-forum] The manual shows a picture captioned "One
touch to you favorite channels" beside its delay settings and describes no favourites
feature.[^x-manual] Not checked.[^unchecked]

## Learning

"With the Learn IR feature of the Harmony 525 and the Harmony Remote Software, you can use your original
remote".[^x-manual] The firmware implements the capture commands, `0x70` to start and `0x80` to stop, with
a double buffer like the Harmony One's.[^s123] Learning on a 525 is not checked.[^unchecked]

## Not checked

* The device and activity limits the remote enforces.[^unchecked]
* Favourite channels.[^unchecked]
* Learning, and any setting the remote keeps itself.[^unchecked]

[^x-manual]: Stated by Logitech, in the manual. [The Harmony 525 user manual](https://www.manualslib.com/manual/454951/Logitech-Harmony-525.html)
[^s136]: Stated by Logitech, by their service. [Section 136](../../../docs/findings.md#s136)
[^s145]: Stated by Logitech, by their service. [Section 145](../../../docs/findings.md#s145)
[^t-long-press]: Stated by Logitech, by their service. [The test](../../../packages/usb/test/models.test.ts)
[^x-forum]: Stated by a third party. [The forum comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s34]: Read in the firmware. [Section 34](../../../docs/findings.md#s34)
[^s135]: Stated by Logitech, by their service. [Section 135](../../../docs/findings.md#s135)
[^s292]: Stated by Logitech, by their service. [Section 292](../../../docs/findings.md#s292)
[^s135b]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^unchecked]: Not checked.
[^s235]: Measured in configurations. [Section 235](../../../docs/findings.md#s235)
[^s254]: Read in the firmware. [Section 254](../../../docs/findings.md#s254)
[^s123]: Read in the firmware. [Section 123](../../../docs/findings.md#s123)
