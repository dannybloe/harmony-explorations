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

## No scan codes

**Nothing measured ties a key on this remote to a scan code**, and the drawing's test asserts that no key
claims one or a list of candidates[^t-silhouette]. The configuration does carry a key table after its
`LWJL` marker, an instruction against each scan code[^s259], and mode 0's list in it held 9, 11 or 13
entries over the five configurations of this architecture measured[^s311][^s315], so the codes exist.
Which physical key each one is would need this generation's keypad scanner read in the firmware, which it
has not been. The same holds for the Harmony 300,
[the architecture's README](../../architectures/harmony-300-350/README.md#shared-in-one-table).

## Not checked

* Every key's scan code.
* How the firmware tells a two second device key press from a short one.

[^t-silhouette]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s259]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^s315]: Measured in configurations. [Section 315](../../../docs/findings.md#s315)
