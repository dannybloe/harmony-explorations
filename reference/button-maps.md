# Which button a scan code belongs to

A config binds a scan code to an action list and the action list sends an infrared code. Nothing in
the format says which **button** that scan code is, so `keyCodes` returns a number for a hard key and a
name only where a screen drew one. `docs/findings.md` section 48 established that a remote on USB never
runs its keypad handler, and concluded that finishing the map needs a write into the running remote's
memory to drive the matrix rows, which the write rails forbid.

The tables below were obtained without any write, and without asking either remote anything at all.
`docs/findings.md` section 133 is the derivation. In outline: the record a scan code sends is decoded
back into the bit frame a device sees, `packages/codec/src/irframe.ts`; the frame is looked up in the
catalogue of named commands that the account which generated the config holds; and the button map the
same account holds says which button sends that command.

**So this is a calibration instrument and not a reader.** It works for a config we had generated through
an account we control, which is what the two calibration samples are, and it cannot name a button in a
config somebody contributed, because the catalogue and the button maps for that config's own devices are
not ours to have. What it produces is a per model table, once, which is then a fact about the model
rather than about the config.

## Every named scan resolves to exactly one button

There is no ambiguity column, and the first version of these tables had one. Four scans per remote sat
between two buttons, and two pairs on the Harmony One claimed one button between them, which looked
inherent: two buttons that send the same infrared code cannot be told apart by a route that reads the
code. It was not inherent. It was a scope error, and both halves of the fix are worth stating because
neither is obvious from the data:

**A scan's command is per activity and its button is not.** Scan 19 of a Harmony One sends the
television's `ChannelUp` in one activity and the Blu-ray player's `SkipForward` in the other, and both
names exist as buttons, so a vote over every map at once made one physical key look like two. Inside one
activity's own map there is no conflict, and the frame column shows why the answer is `ChannelUp`: that
key sends both codes, and the movie activity puts the player's skip command on the channel key.

**Only an activity's map may name an activity's set.** A `DeviceButtonMap` is the layout for driving one
device directly and a `RootButtonMap` is neither, so the kind is read off the map rather than the map
being chosen by how well it happens to fit. Scoring every map by overlap picked device maps for the
Harmony One and left two scans contradicting themselves across activities.

After that a constraint pass finishes the job: a button that another scan in the same activity has
already taken alone cannot also be this one. What remains unnamed is not undecided, it is **unbound**:
these two configs drive three devices in two activities, so a key neither activity binds to a decodable
code is never reached at all.

## What is deliberately not here

**The physical position of a key.** A scan code's arithmetic says nothing about where the key is:
section 48 derived the electrical column on arch 14 as `(scan - 1) mod 4`, and under it the digits 1, 2
and 3 of a Harmony 600 sit in columns 3, 2 and 2. No modulus and no offset makes each row of three
digits into one line, which was checked over every divisor up to 19 in both directions. A matrix
position is a wiring decision and the tables below are the only route to a name.

That is also why `reference/silhouettes/` still carries no `data-scan` attribute. A name could be placed
on a drawing by hand, since a drawing's `Number4` is not in doubt, but the two remotes here have 31 and
35 of their 44 and 54 buttons named, so filling in a drawing would mean guessing the rest.

## Harmony One, skin 54, architecture 12

31 of its 44 buttons. The `frame` column is what `packages/codec/src/irframe.ts` recovers from the
record, as `bits:value` in hexadecimal, and a scan that sends a code for more than one device carries one
frame per device.

| scan | button | frame |
|---|---|---|
| 1 | `Number4` | `12:c10 48:40040d00c8c5` |
| 2 | `Exit` | `12:c70 48:40040d808a07` |
| 3 | `VolumeUp` | `48:2a4c0280e86a` |
| 4 | `VolumeDown` | `48:2a4c0288e862` |
| 5 | `Rewind` | `15:6ce9 48:40040d00202d` |
| 6 | `SkipBack` | `15:1ee9 48:40040d00929f` |
| 7 | `Record` | `15:2e9` |
| 8 | `Number1` | `12:10 48:40040d000805` |
| 9 | `VolumeMute` | `48:2a4c0284e86e` |
| 10 | `Info` | `12:5d0 48:40040d004944` |
| 11 | `DirectionLeft` | `12:2d0 48:40040d00e1ec` |
| 14 | `Number0` | `12:910 48:40040d009895` |
| 15 | `Number9` | `12:110 48:40040d001815` |
| 16 | `Number8` | `12:e10 48:40040d00e8e5` |
| 17 | `Number6` | `12:a10 48:40040d00a8a5` |
| 18 | `Guide` | `15:6d25 48:40040d00414c` |
| 19 | `ChannelUp` | `12:90 48:40040d00525f` |
| 20 | `ChannelDown` | `12:890 48:40040d00929f` |
| 21 | `FastForward` | `15:1ce9 48:40040d00a0ad` |
| 22 | `SkipForward` | `15:5ee9 48:40040d00525f` |
| 23 | `Stop` | `15:ce9 48:40040d00000d` |
| 24 | `Number3` | `12:410 48:40040d004845` |
| 25 | `Number5` | `12:210 48:40040d002825` |
| 28 | `Select` | `12:a70 48:40040d00414c` |
| 30 | `Play` | `15:2ce9 48:40040d00505d` |
| 31 | `Pause` | `15:4ce9 48:40040d00606d` |
| 32 | `Number2` | `12:810 48:40040d008885` |
| 33 | `DirectionRight` | `12:cd0 48:40040d00111c` |
| 35 | `PrevChannel` | `12:dd0 48:40040d00c1cc` |
| 39 | `Number7` | `12:610 48:40040d006865` |
| 40 | `Menu` | `12:70 48:40040d00d9d4` |

## Harmony 600, skin 71, architecture 14

35 of its 54 buttons.

| scan | button | frame |
|---|---|---|
| 10 | `Menu` | `12:70 48:40040d00d9d4` |
| 12 | `Exit` | `12:c70 48:40040d808a07` |
| 13 | `Red` | `15:52e9 48:40040d80820f` |
| 14 | `VolumeUp` | `48:2a4c0280e86a` |
| 15 | `VolumeDown` | `48:2a4c0288e862` |
| 16 | `VolumeMute` | `48:2a4c0284e86e` |
| 17 | `Number4` | `12:c10 48:40040d00c8c5` |
| 18 | `Number7` | `12:610 48:40040d006865` |
| 20 | `Number0` | `12:910 48:40040d009895` |
| 21 | `SkipBack` | `15:1ee9 48:40040d00929f` |
| 22 | `Rewind` | `15:6ce9 48:40040d00202d` |
| 23 | `Record` | `15:2e9` |
| 24 | `Number1` | `12:10 48:40040d000805` |
| 28 | `Yellow` | `15:72e9 48:40040d80c24f` |
| 29 | `Blue` | `15:12e9 48:40040d80028f` |
| 30 | `FastForward` | `15:1ce9 48:40040d00a0ad` |
| 31 | `ChannelUp` | `12:90 48:40040d00525f` |
| 32 | `ChannelDown` | `12:890 48:40040d00929f` |
| 33 | `Guide` | `15:6d25 48:40040d00414c` |
| 36 | `Info` | `12:5d0 48:40040d004944` |
| 37 | `Number6` | `12:a10 48:40040d00a8a5` |
| 38 | `SkipForward` | `15:5ee9 48:40040d00525f` |
| 39 | `Number3` | `12:410 48:40040d004845` |
| 40 | `Stop` | `15:ce9 48:40040d00000d` |
| 41 | `DirectionRight` | `12:cd0 48:40040d00111c` |
| 43 | `PrevChannel` | `12:dd0 48:40040d00c1cc` |
| 44 | `Play` | `15:2ce9 48:40040d00505d` |
| 45 | `Number9` | `12:110 48:40040d001815` |
| 46 | `Pause` | `15:4ce9 48:40040d00606d` |
| 47 | `Number2` | `12:810 48:40040d008885` |
| 48 | `Number5` | `12:210 48:40040d002825` |
| 49 | `Green` | `15:32e9 48:40040d8042cf` |
| 51 | `Select` | `12:a70 48:40040d00414c` |
| 52 | `DirectionLeft` | `12:2d0 48:40040d00e1ec` |
| 53 | `Number8` | `12:e10 48:40040d00e8e5` |

The two remotes agree: every one of the 31 names in both tables carries an identical frame, and the four
the 600 has on top are exactly the teletext colour keys a Harmony One does not have.

## Provenance

Derived on 13 August 2026 from the two calibration containers, `docs/findings.md` section 132, and from
the button maps and command catalogue of the throwaway account that generated them. The button names are
Logitech's own vocabulary, which is what makes them worth recording: they are the names its software uses
for the same physical keys, so a table here and a table anywhere else in the ecosystem mean the same
thing.

The account data itself stays in the lab, and so does the instrument, `lab/work/myharmony/buttonmap.ts`,
which imports the repository's own decoder rather than carrying a second copy of it.
`packages/codec/test/irframe.test.ts` reads the tables above out of this file and checks each scan
against the container's own bytes, so the numbers cannot drift away from the configs they were measured
on.
