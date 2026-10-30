# Harmony 350: keys

Fifty five keys and no screen. Five groups are the ones Logitech's setup guide names, and the rest is the
keypad of any television remote. Nothing yet ties a key to the number the remote's own keypad scanner
gives it, so the table below names every key and leaves that column empty.

The drawing, [`reference/silhouettes/h350.svg`](../../silhouettes/h350.svg), is generated from
`packages/silhouettes/src/models/h350.ts`, traced from the vector button page of Logitech's setup guide and
counted shape by shape[^t-silhouette]. The Harmony 300's drawing takes every shape from it, since the two
share [one case](../../architectures/harmony-300-350/README.md#shared-in-one-table).

## The keys Logitech's setup guide names

1. **Watch TV button**: "Powers devices on/off for your Watch TV Activity".
2. **Device buttons**: "Set the remote to control specific devices", four of them, each with a short press
   and a two second press. They print `TV/Media`, `Cable/PC`, `AVR/Game` and `DVD/Music` under "My
   Devices"[^t-silhouette], or in an earlier printing `TV / AVR`, `Cable/DVD`, `BD / Media` and `Game/MP3`
   on the same four places, so a device key is known by its place rather than its printing[^x-manual]. The
   drawing showed the earlier printing until it was corrected.
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
| `AvrGame` | keypad | printed | not measured |  | AVR/Game |
| `Blue` | keypad | printed | not measured |  |  |
| `CablePc` | keypad | printed | not measured |  | Cable/PC |
| `ChannelDown` | keypad | printed | not measured |  |  |
| `ChannelUp` | keypad | printed | not measured |  |  |
| `Clear` | keypad | printed | not measured |  | Clear |
| `DirectionDown` | keypad | printed | not measured |  |  |
| `DirectionLeft` | keypad | printed | not measured |  |  |
| `DirectionRight` | keypad | printed | not measured |  |  |
| `DirectionUp` | keypad | printed | not measured |  |  |
| `DownArrow` | keypad | printed | not measured |  |  |
| `DvdMusic` | keypad | printed | not measured |  | DVD/Music |
| `Dvr` | keypad | printed | not measured |  | DVR |
| `Enter` | keypad | printed | not measured |  | E, Enter |
| `Exit` | keypad | printed | not measured |  | Exit |
| `FastForward` | keypad | printed | not measured |  |  |
| `Favorite1` | keypad | printed | not measured |  | 1 |
| `Favorite2` | keypad | printed | not measured |  | 2 |
| `Favorite3` | keypad | printed | not measured |  | 3 |
| `Favorite4` | keypad | printed | not measured |  | 4 |
| `Favorite5` | keypad | printed | not measured |  | 5 |
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
| `TvMedia` | keypad | printed | not measured |  | TV/Media |
| `UpArrow` | keypad | printed | not measured |  |  |
| `VolumeDown` | keypad | printed | not measured |  |  |
| `VolumeMute` | keypad | printed | not measured |  |  |
| `VolumeUp` | keypad | printed | not measured |  |  |
| `WatchTV` | keypad | printed | not measured |  | Watch TV |
| `Yellow` | keypad | printed | not measured |  |  |

Generated from `packages/silhouettes/src/models/h350.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## No scan codes

**Only the four device keys' scan codes are known, from a Harmony 300's configurations and the shared
moulding rather than from the scanner**: `TV/Media` 5, `Cable/PC` 1, `AVR/Game` 7 and `DVD/Music` 4,
the codes a Harmony 300's configuration binds to the same four keys, and the four a 350's binds too; a short press of each
is its release,
[the family's memory page](../../architectures/harmony-300-350/memory.md#which-infrared-group-a-device-takes)[^t-device-groups-c].
No 350 key was pressed to confirm them, which is why the drawing still claims no code, and its test
asserts that no key claims one or a list of candidates[^t-silhouette]. This said nothing measured tied a
key on this remote to a scan code<!--superseded--> until the device keys were read out of the
configurations. The configuration does carry a key table after its
`LWJL` marker, an instruction against each scan code[^s259], which on this family is the map every key
press is looked up in last, holding the device keys and the activity's key: 11 or 13 entries over the
three Harmony 350 configurations measured, so the codes exist[^t-harmony-350-slots-c]. An earlier
version of this page called it mode 0's list<!--superseded-->, which is what it is on the models with a
screen[^s311], [the family's memory page](../../architectures/harmony-300-350/memory.md#the-six-slots-the-firmware-was-read-for).
Which physical key each of the others is would need this generation's keypad scanner read in the
firmware, which it has not been. The same holds for the Harmony 300,
[the architecture's README](../../architectures/harmony-300-350/README.md#shared-in-one-table).

## Not checked

* Every key's scan code.
* Which device key each of the scan codes 1, 4, 5 and 7 is on a Harmony 350 itself: they are taken to be
  the top right, bottom right, top left and bottom left keys from the Harmony 300's order, and what is
  printed on the four keys differs between units, so a key is named by its place[^unchecked]. This listed how the firmware tells a two second device key press from a short one,
  until it was read: a press ends in a release or, held past the hold time, in a held event, and the
  long press device is bound to the held event,
  [the family's firmware](../../architectures/harmony-300-350/firmware.md#a-held-key)[^t-long-press].

[^t-silhouette]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s259]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^t-harmony-350-slots-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_slots.py)
[^t-device-groups-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_device_groups.py)
[^unchecked]: Not checked.
[^t-long-press]: Read in the firmware. [The test](../../../tests/test_harmony_350_long_press.py)
