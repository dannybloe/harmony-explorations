# Logitech's device catalogue

A Harmony could control a television it had never seen because Logitech kept a catalogue of devices: for
each manufacturer and model, the commands its own remote sends, each with a name and the infrared code
behind it. A person picked their devices from it in Logitech's software, and the service put those
devices' codes into the configuration it compiled. The catalogue is reached through Logitech's
configuration service with a plain login, [the service](service.md#the-device-catalogue-is-its-own-call).

## What it holds

**It is large**: 7889 manufacturers and 276236 devices, 257720 of them with codes, in 54118 codesets
holding 2067863 commands, and every command carries a name beside its code[^s229].

**A device's codes come as a codeset, which Logitech calls a language.** A catalogue device lists the
languages it comes in and which one is the default, and the service fetches a language's commands by its
version identifier[^t-model][^s132]. One device model can have several codesets, which is what the
service's code detection chooses between, [the service](service.md#the-device-catalogue-is-its-own-call).

**A command is symbolic**: a name, a protocol family and a value written in the catalogue's own code
grammar, not a pulse train[^s132]. The family's rhythm turns the value into pulses,
[Infrared](../infrared/README.md), and the grammar is described with [the service](service.md).

**The catalogue states each protocol family's definition too**, 684 of them in the shape of the data
model's `IrProtocol`: a carrier, the segments of a code and the durations that spell each digit[^s227].
**A family is named by the catalogue and never by Logitech's analyser**, which named three families
wrongly where the catalogue's definitions name them right[^s227]. The families are
[their own page](../infrared/families.md).

**A catalogue device also states its features**: how its power is switched, which inputs it has, how long
a power command is held, its delays and how often a press repeats[^s305]. How the service hands them over
is [the service](service.md#the-device-catalogue-is-its-own-call).

## How it names a device's commands

**Named groups carry the platform's button vocabulary, and a catch all carries the rest.** A command in
a named group such as `Volume` or `NavigationBasic` states no transport, while one in `Miscellaneous`
states infrared, and the same command name can sit in a named group for one device and in the catch all
for another[^s220]. The groups are in [the data model](data-model/model.md#what-a-devices-commands-are-called).

**A device can be recognised from the codes it sends, because a code's number is specific.** Collect
the numbers a configuration's codes for one device decode to and ask which codeset holds the most of
them, and that codeset is the device[^s229]. Two things about the answer are the catalogue's own shape
rather than a detail of any reader:

* **The margin is part of the answer.** The catalogue holds ranges of near identical codesets, one per
  model of a range, so a device matching every one of its codes often has a runner up only a few codes
  behind, and the honest answer is a model range rather than a model[^s229].
* **A command's name comes from the identified codeset and never from the catalogue at large**, since
  one number is held by several manufacturers' codesets under different names[^s229].

## Categories, and the era that had no pictures

**The category a device belongs to is a short list**: `DeviceCategory` has six values, while the kind of
device, `DeviceType`, and the picture shown for it, `Icon`, are one list of the same names in the same
order, `Icon` adding two[^t-model]. The values are in [the data model](data-model/model.md#the-vocabularies).

**The software of the Harmony One and 600's era listed equipment as text and drew no category
pictures.** What MyHarmony's and the classic software's graphics hold is photographs of remotes, setup
illustrations and window furniture: 1554 distinct images across every era of Logitech's software and not
one category icon among them[^s216]. The only set Logitech drew is the **hub** generation's, a later
product, and its drawings are Logitech's artwork, so only their names are recorded here.

The hub generation's 95 icon names, read from the stylesheet that cuts its sprite strips, so they are the
application's own class names[^s216]:

| group | count | what it is |
|---|---|---|
| audio video equipment | 26 | the part that maps onto what an infrared remote drives |
| smart home | 36 | lights, locks, thermostats, sensors, plugs, blinds, and the bridges for them |
| alert badge variants | 17 | the same drawing again with a warning marker, not separate categories |
| activity role placeholders | 16 | "not set up yet" states for an activity, not equipment at all |

So **more of the set is equipment a Harmony One cannot drive than equipment it can**, 36 against 26[^s216].
The audio video names in full:

```
avr Music        Computer         dvd              fireTV           fireTVStick
GameConsole      HDMI             heos             keypad           MacPC
nintendoWii      nintendoWiiu     nvidiaShield     PC MediaCenter   ps3
roku roku        sonos sonos      sonyPs4          stb              TV
TV-Hd            TVCam            WindowsPC        xbox             xbox360
xboxone
```

**It is a poor basis for a category list**: a fifth of it names a product rather than a kind of
equipment, `keypad` is not equipment at all, and it has no category for an amplifier that is not an AV
receiver, a tuner, a tape machine or a projector, all of which the catalogue carries commands for[^s216].

[^s229]: Stated by Logitech, in their catalogue. [Section 229](../../docs/findings.md#s229)
[^t-model]: Stated by Logitech, in their client. [The test](../../tests/test_myharmony_model.py)
[^s132]: Stated by Logitech, by their service. [Section 132](../../docs/findings.md#s132)
[^s227]: Stated by Logitech, in their catalogue. [Section 227](../../docs/findings.md#s227)
[^s305]: Stated by Logitech, in their catalogue. [Section 305](../../docs/findings.md#s305)
[^s220]: Stated by Logitech, by their service. [Section 220](../../docs/findings.md#s220)
[^s216]: Stated by Logitech, in their client. [Section 216](../../docs/findings.md#s216)
