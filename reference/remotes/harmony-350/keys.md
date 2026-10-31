# Harmony 350: keys

Fifty five keys and no screen. Five groups are the ones Logitech's setup guide names, and the rest is the
keypad of any television remote. Which number the remote's own keypad scanner gives each key is
[below](#scan-codes): read in the firmware, narrowed in configurations, and checked by pressing every key
with an infrared receiver listening, which tied 44 keys to their code[^t-harmony-350-keys-u], and nine more
on a configuration that binds them[^t-harmony-350-setup-u]. The drawing's table carries those 53 and
nothing else.

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
55 keys on the drawing `h350`, 55 on the keypad and 0 that the screen speaks for. 53 carry a scan code: 44 heard by pressing each key with a receiver listening, its code the one binding of the configuration on the remote that sends what was heard[^t-harmony-350-keys-u]; 9 heard by pressing each key with a receiver listening, on a configuration that binds it, its code the one of the 56 that, raised at that point of the presses, gives what was heard[^t-harmony-350-setup-u]. 1 are narrowed to a set of candidate codes and not decided.

| key | kind | name from | scan code | screen zone | printed on or beside it |
|---|---|---|---|---|---|
| `CablePc` | keypad | printed | 1 (0x01)[^t-harmony-350-setup-u] |  | Cable/PC |
| `Favorite5` | keypad | printed | 2 (0x02)[^t-harmony-350-keys-u] |  | 5 |
| `Power` | keypad | printed | 3 (0x03)[^t-harmony-350-keys-u] |  |  |
| `DvdMusic` | keypad | printed | 4 (0x04)[^t-harmony-350-setup-u] |  | DVD/Music |
| `TvMedia` | keypad | printed | 5 (0x05)[^t-harmony-350-keys-u] |  | TV/Media |
| `WatchTV` | keypad | printed | 6 (0x06)[^t-harmony-350-setup-u] |  | Watch TV |
| `AvrGame` | keypad | printed | 7 (0x07)[^t-harmony-350-keys-u] |  | AVR/Game |
| `Favorite1` | keypad | printed | 8 (0x08)[^t-harmony-350-setup-u] |  | 1 |
| `Favorite2` | keypad | printed | 9 (0x09)[^t-harmony-350-setup-u] |  | 2 |
| `Menu` | keypad | printed | 10 (0x0A)[^t-harmony-350-setup-u] |  | Menu |
| `Favorite3` | keypad | printed | 11 (0x0B)[^t-harmony-350-setup-u] |  | 3 |
| `Exit` | keypad | printed | 12 (0x0C)[^t-harmony-350-keys-u] |  | Exit |
| `Red` | keypad | printed | 13 (0x0D)[^t-harmony-350-keys-u] |  |  |
| `DirectionLeft` | keypad | printed | 14 (0x0E)[^t-harmony-350-keys-u] |  |  |
| `VolumeMute` | keypad | printed | 15 (0x0F)[^t-harmony-350-keys-u] |  |  |
| `Number4` | keypad | printed | 17 (0x11)[^t-harmony-350-keys-u] |  | 4, ghi |
| `Number7` | keypad | printed | 18 (0x12)[^t-harmony-350-keys-u] |  | 7, pqrs |
| `Clear` | keypad | printed | 19 (0x13)[^t-harmony-350-keys-u] |  | Clear |
| `Number0` | keypad | printed | 20 (0x14)[^t-harmony-350-keys-u] |  | 0 |
| `SkipBack` | keypad | printed | 21 (0x15)[^t-harmony-350-keys-u] |  |  |
| `Rewind` | keypad | printed | 22 (0x16)[^t-harmony-350-keys-u] |  |  |
| `Record` | keypad | printed | 23 (0x17)[^t-harmony-350-keys-u] |  |  |
| `Number1` | keypad | printed | 24 (0x18)[^t-harmony-350-keys-u] |  | 1 |
| `UpArrow` | keypad | printed | 25 (0x19)[^t-harmony-350-keys-u] |  |  |
| `DownArrow` | keypad | printed | 26 (0x1A)[^t-harmony-350-keys-u] |  |  |
| `Green` | keypad | printed | 27 (0x1B)[^t-harmony-350-keys-u] |  |  |
| `Yellow` | keypad | printed | 28 (0x1C)[^t-harmony-350-keys-u] |  |  |
| `Blue` | keypad | printed | 29 (0x1D)[^t-harmony-350-keys-u] |  |  |
| `FastForward` | keypad | printed | 30 (0x1E)[^t-harmony-350-keys-u] |  |  |
| `DirectionRight` | keypad | printed | 31 (0x1F)[^t-harmony-350-keys-u] |  |  |
| `PrevChannel` | keypad | printed | 32 (0x20)[^t-harmony-350-keys-u] |  |  |
| `Guide` | keypad | printed | 33 (0x21)[^t-harmony-350-keys-u] |  | Guide |
| `Favorite4` | keypad | printed | 34 (0x22)[^t-harmony-350-setup-u] |  | 4 |
| `Input` | keypad | printed | 35 (0x23)[^t-harmony-350-keys-u] |  | Input |
| `Info` | keypad | printed | 36 (0x24)[^t-harmony-350-keys-u] |  | Info |
| `Number6` | keypad | printed | 37 (0x25)[^t-harmony-350-keys-u] |  | 6, mno |
| `SkipForward` | keypad | printed | 38 (0x26)[^t-harmony-350-keys-u] |  |  |
| `Number3` | keypad | printed | 39 (0x27)[^t-harmony-350-keys-u] |  | 3, def |
| `Stop` | keypad | printed | 40 (0x28)[^t-harmony-350-keys-u] |  |  |
| `ChannelDown` | keypad | printed | 41 (0x29)[^t-harmony-350-keys-u] |  |  |
| `DirectionDown` | keypad | printed | 42 (0x2A)[^t-harmony-350-keys-u] |  |  |
| `Play` | keypad | printed | 44 (0x2C)[^t-harmony-350-keys-u] |  |  |
| `Number9` | keypad | printed | 45 (0x2D)[^t-harmony-350-keys-u] |  | 9, wxyz |
| `Pause` | keypad | printed | 46 (0x2E)[^t-harmony-350-keys-u] |  |  |
| `Number2` | keypad | printed | 47 (0x2F)[^t-harmony-350-keys-u] |  | 2, abc |
| `Number5` | keypad | printed | 48 (0x30)[^t-harmony-350-keys-u] |  | 5, jkl |
| `VolumeUp` | keypad | printed | 49 (0x31)[^t-harmony-350-keys-u] |  |  |
| `Select` | keypad | printed | 50 (0x32)[^t-harmony-350-keys-u] |  | OK |
| `DirectionUp` | keypad | printed | 51 (0x33)[^t-harmony-350-keys-u] |  |  |
| `VolumeDown` | keypad | printed | 52 (0x34)[^t-harmony-350-keys-u] |  |  |
| `Number8` | keypad | printed | 53 (0x35)[^t-harmony-350-keys-u] |  | 8, tuv |
| `Enter` | keypad | printed | 54 (0x36)[^t-harmony-350-setup-u] |  | E, Enter |
| `ChannelUp` | keypad | printed | 55 (0x37)[^t-harmony-350-keys-u] |  |  |
| `Dvr` | keypad | printed | not measured |  | DVR |
| `Live` | keypad | printed | one of 43 or 56 |  | Live |

Generated from `packages/silhouettes/src/models/h350.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

## Scan codes

**Each key raises a number from 1 to 56**, which the firmware computes from where the key sits on a grid
of fourteen lines of four, and a configuration binds that number directly: nothing translates between the
grid and the key maps[^t-harmony-350-keys]. The key maps bind it with an event type in the top two bits,
so `0x80` plus the code is a press, `0x40` plus the code a release, and `0xC0` plus the code a key held
past a timer; a tag below `0x40` is an event the firmware raises itself and not a key, [the family's
firmware page](../../architectures/harmony-300-350/firmware.md#the-keypad-scan)[^t-harmony-350-keys].

| key | code | how it is known | heard |
|---|---|---|---|
| the four device keys, top left, top right, bottom left, bottom right | 5, 1, 7, 4 | each selects one device's map, [below](#how-each-code-is-known) | yes, a short and a long press each |
| Watch TV | 6 | the activity's binding | yes |
| Power | 3 | a device's power toggle, in every device's map that holds codes | yes |
| favourite 5, right of Input | 2 | heard sending the television's code that the configuration on the unit binds to code 2 alone | yes |
| favourites 1 to 4 | 8, 9, 11 and 34, in that order | heard sending the channels the configuration on the unit binds to those four codes | yes |
| Menu, Exit, Info, Guide | 10, 12, 36, 33 | named by what they send | yes |
| the arrow pair between them, up and down | 25, 26 | heard sending the receiver's channel up and down, the only bindings of 25 and 26 | yes |
| red, green, yellow, blue | 13, 27, 28, 29 | named by what they send; the Harmony 300 prints another order on the same keys | yes |
| Volume Up, Volume Down, Mute | 49, 52, 15 | named by what they send | yes |
| Channel Up, Channel Down, Previous Channel | 55, 41, 32 | named by what they send | yes |
| the direction keys up, right, down, left, and OK | 51, 31, 42, 14, 50 | named by what they send | yes |
| DVR | 16 | named by what it sends, once, on a Harmony 300 | pressed, and sent a code that OK's binding sends too, so not decided by it |
| Live | 43 or 56 | left over; no configuration binds either | no |
| Rewind, Play, Pause, Fast Forward | 22, 44, 46, 30 | named by what they send | yes |
| skip back, skip forward, Record, Stop | 21, 38, 23, 40 | named by what they send | yes |
| the digits 1 to 9 and 0 | 24, 47, 39, 17, 48, 37, 18, 53, 45, 20 | named by what they send | yes |
| Clear, Enter | 19, 54 | named by what they send, once and twice, on a Harmony 300 | yes |
| Input | 35 | named by what it sends, on a Harmony 300 | yes |

So 54 keys have a code, Live is on one of two codes, and one code of the 56 is no key at
all[^t-harmony-350-keys-c]. This said 50 and five keys sharing a set of six codes until favourites 1 to 4
were heard. **53 of the 54 were heard.** 44 of them each pressed with a receiver listening, on a unit
holding a television and a receiver, and each heard sending the code the configuration on it binds to that
number and no other, in the television's mode, the receiver's or both[^t-harmony-350-keys-u]. That settled
three the configurations could not, favourite 5 and the two arrows, and agreed with the 38 they had named
and the three device and power keys their bindings place. Six more were pressed and sent nothing there,
because that configuration binds nothing to them, and favourites 1 to 4 sent nothing either.
**The other nine were heard on a configuration that binds them**: each key's code is the one of the 56
that, raised at that point of the presses, gives what the receiver heard[^t-harmony-350-setup-u]. That settled
favourites 1 to 4 and agreed with the five the configurations had placed: Menu, Enter, Watch TV and the top
right and bottom right device keys. DVR was pressed and is not among them: it sent the receiver a code
whose bytes OK's binding sends as well, so the press fits 16 and 50 alike, and it rests on configurations,
with OK heard on 50[^t-harmony-350-setup-u].

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
  right device keys. On a Harmony 350 the top left and bottom left keys were pressed and heard selecting the
  devices on groups 0 and 2[^t-device-groups-u], and on a configuration with a device on every key all four
  were, short press and long, the top right selecting groups 1 and 5 and the bottom right 3 and
  7[^t-harmony-350-setup-u]. They rested on the Harmony 300's order until then.
  Code 6 is the activity's binding, and Watch TV is the only key the face gives an activity. Code 3 switches
  a device on or off in every device's map that holds codes.
* **A device key on this remote changes the device when it is let go**: its press switches an output pin
  and starts two timers, and its release selects the map. The Harmony 300 selects on the press, and has no
  two second press to wait for[^t-harmony-350-keys-c].
* **The favourite keys are the five codes that send a favourite channel**, 2, 8, 9, 11 and 34, and no other
  code does. The configurations do not say which is which: two Harmony 350 configurations of one setup send
  channels 1, 2, 3, 4 and 666 from 8, 9, 11, 34 and 2, and a Harmony 300 configuration sends 1, 2, 3 and 666
  from 8, 2, 9 and 34[^t-harmony-350-keys-c]. Pressed one by one on a unit whose television map binds only
  code 2 among the five, only favourite 5, the key right of Input, sent anything, so favourite 5 is code
  2[^t-harmony-350-keys-u]. **Favourites 1 to 4 are 8, 9, 11 and 34, in that order**: on a unit holding a
  compile whose five favourites are channels 1, 2, 3, 666 and 07 on codes 8, 9, 11, 34 and 2, favourite 1
  sent channel 1, favourite 2 channel 2, favourite 3 channel 3 and favourite 4 channel
  666[^t-harmony-350-setup-u]. This page listed which is which as open until then.
* **A favourite's channel goes out digit by digit**: on a set top box whose digits were each heard as a
  frame and one repeat, 666 arrived as three 6s 0.32 to 0.33 seconds apart, 0.21 seconds of silence between
  them, and 07 as a 0 and a 7 the same distance apart, with nothing after the last
  digit[^t-harmony-350-setup-u]. The configuration waits a tenth of a second after each digit; what makes up
  the rest of the silence is not traced, and another device's digits, being another length, would arrive
  another distance apart[^unchecked].
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
* **The rest the configurations narrow and cannot decide.** Codes 25 and 26 are bound and never named by
  the catalogue here, and the arrow pair is the only pair of keys left; codes 43 and 56 are bound by
  nothing, and Live is the only key left[^t-harmony-350-keys-c]. **The arrows were decided by pressing
  them**: in the receiver's mode the upper sent the receiver's channel up and the lower its channel down,
  which that configuration binds to 25 and 26 alone, so the upper arrow is 25 and the lower
  26[^t-harmony-350-keys-u]. This page listed which arrow is which as open until then.

**The drawing carries the 53 codes that were heard**, and Live's two as candidates; DVR carries neither,
since a code goes on the drawing only once a press has decided it[^t-harmony-350-keys-u][^t-harmony-350-setup-u].
The drawing carried none until the keys were pressed, and the four favourites as candidates and nothing on
the five keys the first configuration left unbound until the second was pressed.

**This page called the key table mode 0's list**<!--superseded-->, which is what it is on the models with a
screen[^s311], until the family's slots were read, [the family's memory page](../../architectures/harmony-300-350/memory.md#the-six-slots-the-firmware-was-read-for).

## Not checked

* DVR by a press that decides it: on a unit where its binding sends a code no other key's does[^unchecked].
  Menu, Enter and Watch TV were listed here until they were heard on a configuration that binds them.
* Whether Live is 43 or 56[^unchecked]. Which of favourites 1 to 4 is which was listed here until it was
  heard.
* What is printed on the four device keys differs between units, so a key is named by its
  place[^unchecked]. Which device key the codes 1 and 4 are on a Harmony 350 itself was listed here until
  the two were heard selecting their devices. How a two second press is stored was listed here until it was
  read: the long press device is bound to the held event,
  [the family's firmware](../../architectures/harmony-300-350/firmware.md#a-held-key)[^t-long-press].

[^t-silhouette]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
[^x-manual]: Stated by Logitech, in the manual. [The Harmony 350 setup guide](https://www.logitech.com/assets/51207/harmony-350-qsg-and-iid.pdf)
[^s259]: Measured in configurations. [Section 259](../../../docs/findings.md#s259)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^t-harmony-350-slots-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_slots.py)
[^t-device-groups-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_device_groups.py)
[^unchecked]: Not checked.
[^t-long-press]: Read in the firmware. [The test](../../../tests/test_harmony_350_long_press.py)
[^t-harmony-350-keys]: Read in the firmware. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-350-keys-c]: Measured in configurations. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-350-keys-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_keys.py)
[^t-harmony-350-setup-u]: Measured on a unit. [The test](../../../tests/test_harmony_350_keys.py)
[^s265]: Measured in configurations. [Section 265](../../../docs/findings.md#s265)
