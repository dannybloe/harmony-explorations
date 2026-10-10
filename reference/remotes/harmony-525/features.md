# Harmony 525: features

What the 525 offers a person and what Logitech's software let them set. The starting point is Logitech's
own statement as `reference/capabilities.md` records it: the 525's row in the capability table and the
paragraph on its device limit. Unlike the six models of that file's "The six bench models" table, the
525 has **no capability statement from Logitech's live service**, because the service has the product
switched off, below.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 22 | 12 | none | yes | no | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Standing of each column, per `reference/capabilities.md`: **max devices** is Logitech's service,
`MaxDevicesPerAccount`, adopted in section 136 and agreeing with the product table, section 145; **long
press** is Logitech's service, which declares none for this model; every other column is the forum
table's, **third party**. The page button's "no" is consistent with what the configurations do, since
paging is a soft key binding, [keys.md](keys.md), and sequences are consistent with the firmware, which
runs action lists of many instructions on every architecture read, section 34.

## Logitech's service has the product switched off

| | value | standing and source |
|---|---|---|
| the product record | `ProductId 35, SkinId 22`, named Harmony 525 | Logitech's service, section 135 |
| `IsEnabled` | **false**, where every model Logitech's current software supports is true | Logitech's service, section 145 |
| adding a 525 to an account | accepted | Logitech's service, section 135 |
| compiling a configuration for it | ends in a bare `status='Error'`, while the same session compiles a Harmony One | Logitech's service, section 135 |
| remote settings | none listed | Logitech's service, section 292 |
| Harmony Desktop | does not recognise the remote at all: skin 22 is on neither of its two product lists | Logitech's client, section 135 |

**So nothing can compile a configuration for a 525 today**, and no vendor built file exists to check one
of this project's against, `CLAUDE.md` and section 269. The model's own software, the Harmony Remote
Software, is the classic platform, Logitech's manual, whose site now serves a discontinuation notice,
`docs/memory-map-525.md`.

## Devices: twelve or ten

**Logitech's service and the forum table say 12. Logitech's manual says 10**: "you can configure the
Harmony 525 to control up to 10 devices", "Maximum number of devices per account 10", and it replaces "up
to ten remotes". Two readings fit, a limit raised in a later software generation or marketing rounding,
and nothing here chooses, `reference/capabilities.md`. **No configuration read reaches either**: the
bench unit's holds four, `reference/capabilities.md`. Whether the remote itself enforces a limit is **not
checked**.

## Activities and device mode

* **Activities** start from the Activities screen with a soft key; the Activities key returns to it,
  Logitech's manual, "Selecting an Activity".
* **Device mode**: "When you press the Device button, the Harmony 525 screen displays a list of your
  devices ... After you select a device, the Harmony 525 controls only that device. You have access to all
  the commands for the device included in your Harmony 525 configuration", Logitech's manual,
  "Controlling your devices individually". The way back is the Activities key,
  `docs/how-a-harmony-works.md`.
* **How many activities a 525 holds** is **not stated** by the manual and not checked.
* **Smart State Technology**: the remote tracks which devices are on, and the Help key's questions put it
  back in step, Logitech's manual.

## Delays

The manual's three per device settings are the **Power On Delay**, the **Inter-Key Delay** and the **Input
Delay**, Logitech's manual, "Types of delays or speed settings". A `0x7C` operand is a delay in tenths of a second on
every architecture, so a 525 configuration states its power on delays the same way, read from
configurations, section 235.

## Sequences

The action queue holds forty instructions on this model, read in the firmware: a ring of `0x78` bytes of
three byte instructions, the same forty the Harmony One's has, section 254. So the rail that refuses an
oversized sequence by its peak queue depth, `assertQueueFits`, rests on a constant read on this
architecture as well. No sequence has been run on a 525 here.

## Favourite channels

The forum table states no favourite channel buttons, `MODELS_BY_SKIN`. The manual shows a picture
captioned "One touch to you favorite channels" beside its delay settings and describes no favourites
feature. **Not checked.**

## Learning

"With the Learn IR feature of the Harmony 525 and the Harmony Remote Software, you can use your original
remote", Logitech's manual. The firmware implements the capture commands, `0x70` to start and `0x80` to
stop, with a double buffer like the Harmony One's, read in the firmware, section 123. Nothing here has
sent either, and learning on a 525 is **not checked**.

## Not checked

* The device and activity limits the remote enforces.
* Favourite channels.
* Learning, and any setting the remote keeps itself.
