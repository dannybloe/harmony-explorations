# Harmony 350: keys

Fifty five keys and no screen. Five groups are the ones Logitech's setup guide names, and the rest is the
keypad of any television remote. Which number the remote's own keypad scanner gives each key is
[below](#scan-codes): read in the firmware and in configurations, and not yet checked by pressing the keys,
so the drawing's table leaves that column empty.

The drawing, [`reference/silhouettes/h350.svg`](../../silhouettes/h350.svg), is generated from
`packages/silhouettes/src/models/h350.ts`, traced from the vector button page of Logitech's setup guide and
counted shape by shape[^t-silhouette]. The Harmony 300's drawing takes every shape from it, since the two
share [one case](../../architectures/harmony-300-350/README.md#shared-in-one-table).

## The keys Logitech's setup guide names

1. **Watch TV button**: "Powers devices on/off for your Watch TV Activity".
2. **Device buttons**: "Set the remote to control specific devices", four of them, each with a short press
   and a two second press. They print `TV / AVR`, `Cable/DVD`, `BD / Media` and `Game/MP3` under "My
   Devices"[^t-silhouette].
3. **Favorite Channel buttons**: "Configure these buttons for quick access to favorite TV channels", five.
4. **Color buttons**: "Navigate menus and select options on some TVs, cable/satellite receivers, DVRs, and
   Blu-ray players". Four, red, green, yellow and blue on the drawing.
5. **Power button**: "Select one of the Device buttons, then use the Power button to turn that device on
   or off."

All five from the guide's "Buttons" and "How the remote works" pages[^x-manual]. The rest is an ordinary keypad: menu, guide, info and
exit, the direction pad and OK, volume and channel, mute, DVR, Live, previous channel, the transport keys,
digits, clear and enter[^t-silhouette].

## Every key on the drawing

<!-- generated:keys -->
55 keys on the drawing `h350`, 55 on the keypad and 0 that the screen speaks for. None carries a scan code.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `BdMedia` | keypad | printed | not measured |  | BD / Media |
| `Blue` | keypad | printed | not measured |  |  |
| `CableDvd` | keypad | printed | not measured |  | Cable/DVD |
| `ChannelDown` | keypad | printed | not measured |  |  |
| `ChannelUp` | keypad | printed | not measured |  |  |
| `Clear` | keypad | printed | not measured |  | Clear |
| `DirectionDown` | keypad | printed | not measured |  |  |
| `DirectionLeft` | keypad | printed | not measured |  |  |
| `DirectionRight` | keypad | printed | not measured |  |  |
| `DirectionUp` | keypad | printed | not measured |  |  |
| `DownArrow` | keypad | printed | not measured |  |  |
| `Dvr` | keypad | printed | not measured |  | DVR |
| `Enter` | keypad | printed | not measured |  | E, Enter |
| `Exit` | keypad | printed | not measured |  | Exit |
| `FastForward` | keypad | printed | not measured |  |  |
| `Favorite1` | keypad | printed | not measured |  | 1 |
| `Favorite2` | keypad | printed | not measured |  | 2 |
| `Favorite3` | keypad | printed | not measured |  | 3 |
| `Favorite4` | keypad | printed | not measured |  | 4 |
| `Favorite5` | keypad | printed | not measured |  | 5 |
| `GameMp3` | keypad | printed | not measured |  | Game/MP3 |
| `Green` | keypad | printed | not measured |  |  |
| `Guide` | keypad | printed | not measured |  | Guide |
| `Info` | keypad | printed | not measured |  | Info |
| `Input` | keypad | printed | not measured |  | Input |
| `Live` | keypad | printed | not measured |  | Live |
| `Menu` | keypad | printed | not measured |  | Menu |
| `Number0` | keypad | printed | not measured |  | 0 |
| `Number1` | keypad | printed | not measured |  | 1 |
| `Number2` | keypad | printed | not measured |  | 2, abc |
| `Number3` | keypad | printed | not measured |  | 3, def |
| `Number4` | keypad | printed | not measured |  | 4, ghi |
| `Number5` | keypad | printed | not measured |  | 5, jkl |
| `Number6` | keypad | printed | not measured |  | 6, mno |
| `Number7` | keypad | printed | not measured |  | 7, pqrs |
| `Number8` | keypad | printed | not measured |  | 8, tuv |
| `Number9` | keypad | printed | not measured |  | 9, wxyz |
| `Pause` | keypad | printed | not measured |  |  |
| `Play` | keypad | printed | not measured |  |  |
| `Power` | keypad | printed | not measured |  |  |
| `PrevChannel` | keypad | printed | not measured |  |  |
| `Record` | keypad | printed | not measured |  |  |
| `Red` | keypad | printed | not measured |  |  |
| `Rewind` | keypad | printed | not measured |  |  |
| `Select` | keypad | printed | not measured |  | OK |
| `SkipBack` | keypad | printed | not measured |  |  |
| `SkipForward` | keypad | printed | not measured |  |  |
| `Stop` | keypad | printed | not measured |  |  |
| `TvAvr` | keypad | printed | not measured |  | TV / AVR |
| `UpArrow` | keypad | printed | not measured |  |  |
| `VolumeDown` | keypad | printed | not measured |  |  |
| `VolumeMute` | keypad | printed | not measured |  |  |
| `VolumeUp` | keypad | printed | not measured |  |  |
| `WatchTV` | keypad | printed | not measured |  | Watch TV |
| `Yellow` | keypad | printed | not measured |  |  |

Generated from `packages/silhouettes/src/models/h350.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Scan codes

**Each key raises a number from 1 to 56**, which the firmware computes from where the key sits on a grid
of fourteen lines of four, and a configuration binds that number directly: nothing translates between the
grid and the key maps[^t-harmony-350-keys]. The key maps bind it with an event type in the top two bits,
so `0x80` plus the code is a press, `0x40` plus the code a release, and `0xC0` plus the code a key held
past a timer; a tag below `0x40` is an event the firmware raises itself and not a key, [the family's
firmware page](../../architectures/harmony-300-350/firmware.md#the-keypad-scan)[^t-harmony-350-keys].

| key | code | how it is known |
|---|---|---|
| the four device keys, top left, top right, bottom left, bottom right | 5, 1, 7, 4 | each selects one device's map; that the map's group is the key's is the Harmony 300's measurement, [below](#how-each-code-is-known) |
| Watch TV | 6 | the activity's binding |
| Power | 3 | a device's power toggle, in every device's map that holds codes |
| the five favourites, 1 to 5 | 2, 8, 9, 11 and 34, in an order not settled | the codes that send a favourite channel |
| Menu, Exit, Info, Guide | 10, 12, 36, 33 | named by what they send |
| the arrow pair between them, up and down | 25 and 26, which is which not settled | left over once every other key is placed |
| red, green, yellow, blue | 13, 27, 28, 29 | named by what they send; the Harmony 300 prints another order on the same keys |
| Volume Up, Volume Down, Mute | 49, 52, 15 | named by what they send |
| Channel Up, Channel Down, Previous Channel | 55, 41, 32 | named by what they send |
| the direction keys up, right, down, left, and OK | 51, 31, 42, 14, 50 | named by what they send |
| DVR | 16 | named by what it sends, once, on a Harmony 300 |
| Live | 43 or 56 | left over; no configuration binds either |
| Rewind, Play, Pause, Fast Forward | 22, 44, 46, 30 | named by what they send |
| skip back, skip forward, Record, Stop | 21, 38, 23, 40 | named by what they send |
| the digits 1 to 9 and 0 | 24, 47, 39, 17, 48, 37, 18, 53, 45, 20 | named by what they send |
| Clear, Enter | 19, 54 | named by what they send, once and twice, on a Harmony 300 |
| Input | 35 | named by what it sends, on a Harmony 300 |

So 47 keys have a code, eight share a set of nine codes, and one code of the 56 is no key at
all[^t-harmony-350-keys-c].

### How each code is known

* **The grid and the event types** are read in the firmware[^t-harmony-350-keys]. The same routine scans
  the keypad in the application, in safe mode and in the bootloader, so the codes the start up images react
  to are these codes too, [the family's firmware page](../../architectures/harmony-300-350/firmware.md#the-keypad-scan).
* **Six keys say what they are by what their binding does**[^t-harmony-350-keys-c]. The key table after the
  configuration's `LWJL` marker[^s259], the map every press is looked up in last, binds the device keys and the
  activity's key: 11 or 13 entries over the three Harmony 350 configurations measured[^t-harmony-350-slots-c].
  Codes 5, 1, 7 and 4 each select one device's map, and that map sends from infrared group 0, 1, 2 and 3;
  on a Harmony 300 the group is the device key, TV, Cable/Sat, DVD and VCR/Aux, by position[^s265], and
  the two remotes are one moulding, so the four codes are the top left, top right, bottom left and bottom
  right device keys. That the Harmony 350 puts its groups on its keys the same way is not checked[^unchecked].
  Code 6 is the activity's binding, and Watch TV is the only key the face gives an activity. Code 3 switches
  a device on or off in every device's map that holds codes.
* **A device key on this remote changes the device when it is let go**: its press switches an output pin
  and starts two timers, and its release selects the map. The Harmony 300 selects on the press, and has no
  two second press to wait for[^t-harmony-350-keys-c].
* **The favourite keys are the five codes that send a favourite channel**, 2, 8, 9, 11 and 34, and no other
  code does. Which is favourite 1 is not settled: two Harmony 350 configurations of one setup send channels
  1, 2, 3, 4 and 666 from 8, 9, 11, 34 and 2, and a Harmony 300 configuration sends 1, 2, 3 and 666 from 8, 2,
  9 and 34[^t-harmony-350-keys-c].
* **41 keys are named by what they send**: every code a device's map sends is looked up in Logitech's
  catalogue, and the name most of the bindings of a code agree on is taken as the key Logitech's compile
  bound it to, `VolumeUp` on code 49 in 8 of the 10 bindings the catalogue names[^t-harmony-350-keys-c].
  **The evidence is fewer devices than the counts suggest**: a map often sends another device's volume, so
  those 8 are three distinct codes, and the named maps of the Harmony 350 are one television compiled
  twice; the rest comes from the Harmony 300's files. Input, DVR, Clear and Enter rest on the Harmony 300
  alone, which prints `List` on the DVR key and sends a command of that name from code 16. A key's accepted
  names include another device's word for the same function, `LastView` for the previous channel key,
  `ChapterPrev` for skip back, chosen after the names were counted. The colour keys rest on the command names
  and on the drawing's order, and the Harmony 300's printing of the same four positions disagrees with
  them, [its keys](../harmony-300/keys.md#scan-codes)[^t-harmony-350-keys-c].
* **The rest is elimination.** Codes 25 and 26 are bound and never named by the catalogue here, and the
  arrow pair is the only pair of keys left; codes 43 and 56 are bound by nothing, and Live is the only key
  left[^t-harmony-350-keys-c].

**The drawing carries none of these codes yet**: its test refuses a code on a key until one is
established, and these wait for the keys to be pressed with a receiver listening[^t-silhouette][^unchecked].

**This page called the key table mode 0's list**<!--superseded-->, which is what it is on the models with a
screen[^s311], until the family's slots were read, [the family's memory page](../../architectures/harmony-300-350/memory.md#the-six-slots-the-firmware-was-read-for).

## Not checked

* Any of the codes, by pressing the key with a receiver listening.
* Which favourite key is which code, which arrow is 25, and whether Live is 43 or 56.
* How a two second device key press is stored; the firmware raises a held key's event, and no configuration
  measured binds one[^t-harmony-350-keys][^t-harmony-350-keys-c].

[^t-silhouette]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s259]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^t-harmony-350-slots-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_slots.py)
[^t-harmony-350-keys]: Read in the firmware. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-350-keys-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_keys.py)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
[^unchecked]: Not checked.
