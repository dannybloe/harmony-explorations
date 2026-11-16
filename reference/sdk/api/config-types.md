# More types of `@freeharmony-sdk/config`

<!-- introduction -->
Types that names of the config package use and that it does not export by name. An application meets them inside
what it is given and never has to import them.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

### `ACTIVITY_ROLE_KINDS`

```ts
const ACTIVITY_ROLE_KINDS = [
  'DisplayActivityRole', 'VolumeActivityRole', 'ChannelChangingActivityRole', 'PlayMovieActivityRole',
  'PlayMediaActivityRole', 'PlayGameActivityRole', 'PassThroughActivityRole',
] as const
```

**The role kinds an activity of ours may give a device**: the ones the reference describes and the documents
measured hold, `activities-and-buttons.md`, "An activity: what it is made of". The smart TV, Roku, Sonos, speaker
and app roles take paths of their own in the engine and the screens that no document measured exercises, so they
are refused here rather than written.

### `ACTIVITY_START_SCREENS`

```ts
const ACTIVITY_START_SCREENS = ['Commands', 'Favorites', 'Gesturepad'] as const
```

The start screens an activity of ours may open on. `Commands` is the command list, the screens' fallback for any
value whose condition fails, `activities-and-buttons.md`, the table under "An activity: what it is made of".
`Favorites` and `Gesturepad` were added for the whole test setup, [`setup.ts`](../../../packages/config/src/families/harmony-touch/setup.ts), whose Watch TV opens on its
favourites and Watch a Blu-ray on its gesture screen: each is written only where what it needs is, the favourites
only on the tuning default activity with a channel changing role, the gesture screen only on a map with gestures,
`composeTouchActivity`. The others (Numpad, Trackpad, Nowplaying) each need something of the activity this composer
does not write, so they are refused until it does.

### `ACTIVITY_TYPES`

```ts
const ACTIVITY_TYPES = [
  'NotSpecified', 'WatchTV', 'WatchDvd', 'PlayGame', 'ListenToMusic', 'Custom', 'SurfWeb', 'WatchNetflix', 'MakeVideoCall',
  'WatchAppleTV', 'WatchRoku', 'PCTV', 'SmartTV', 'WatchFireTV', 'ListenToSonos', 'WatchApp', 'ListenToSpeaker',
] as const
```

**Logitech's `ActivityType`, by position**, [`reference/logitech/data-model/model.md`](../../logitech/data-model/model.md): an activity's `Type` is the
position and its `SuggestedDisplay` the name, on every activity measured, `activities-and-buttons.md`, "An
activity: what it is made of". The Touch acts on the number (its default picture, the gesture pad's play and
pause target), and the engine only copies the name into an answer to other clients.

### `ActivityKeyEditor`

```ts
interface ActivityKeyEditor {
  /** Refuses, with the reason, a key this configuration cannot take an activity on; asked before anything is built. */
  check(c: Container, key: string): void;
  /** What each of the family's activity keys does, in the family's order. */
  read(c: Container): readonly ActivityKeyState[];
  /** The edits that put the activity whose key map is base slot 9 entry `set` on `key`. */
  set(c: Container, key: string, set: number): Edit[];
}
```

The hard keys that each start one activity, read and put an activity on, where a family's remotes have
them: the three of the Harmony 600, 650 and 700. What a shared composer asks of them, so it
neither knows where a family keeps its keys nor which names they have.

Uses [`Container`](config.md#container), [`ActivityKeyState`](#activitykeystate), [`Edit`](config.md#edit).

### `ActivityKeyRules`

```ts
interface ActivityKeyRules<K = number> {
  /** VolumeUp, VolumeDown and Mute: the keys taken from the volume device. */
  readonly volume: readonly K[];
  /**
   * Keys taken from another key of the control device when its own map leaves them unbound, as key and the
   * key it falls back to: the arrows beside the direction pad, which an activity sends DirectionUp and
   * DirectionDown on.
   */
  readonly fallback: ReadonlyMap<K, K>;
  /**
   * ChannelUp and ChannelDown, and what an activity puts on them instead when the control device's own map has
   * them doing the direction pad's job: SkipForward and SkipBack. A disc player carries its DirectionUp and
   * DirectionDown on the channel keys, and the compiler gives the activity the skip keys there instead.
   */
  readonly channel: readonly [K, K];
  readonly direction: readonly [K, K];
  readonly skip: readonly [K, K];
  /** The Exit key, which takes the control device's own `Exit` screen command where it has one. */
  readonly exit: K;
  /**
   * A key whose partner the control device's own map binds and which it leaves unbound itself, and the screen
   * commands of the device it then takes, in order: the Harmony One's lower arrow, which takes `PageDown` or
   * `StepBack` off the device's screen where its own map put `PageUp` or `StepForward` on the upper one. The
   * order is a choice of ours: no control device of the three activities it was read on draws both.
   * `scan` is the key, named so from when every key here was one.
   */
  readonly partners?: readonly { readonly scan: K; readonly when: K; readonly names: readonly string[] }[];
}
```

The keys the activity keypad rule names, per family, [`Family.activityKeyRules`](#family): which keys an activity takes from
its volume device, and the keys its three refinements move. Data of the family because they are its keypad's
scans; the rule is the same on the Harmony 600, 650 and 700 and on the Harmony One.

**A key is a scan by default and may be anything a caller names keys by**, `K`: the rule itself,
`activityKeysOfDevices`, only asks whether two keys are the same key, so the container's caller hands it scans and a
family's maps hand it Logitech's words for the same keys, `keyRulesIn` turning the one into the other.

### `ActivityKeyState`

```ts
interface ActivityKeyState {
  /** The key by the name printed on it. */
  readonly key: string;
  /**
   * `activity` when it starts the activity whose key map is base slot 9 entry `set`, `placeholder` when it
   * opens the family's screen for a key with no activity, and `other` for anything else.
   */
  readonly kind: 'activity' | 'placeholder' | 'other';
  readonly set?: number;
}
```

What one activity key does, as a family's `activityKeyEditor` reads it.

### `ActivityMap`

```ts
interface ActivityMap {
  readonly keys: readonly ActivityMapBinding[];
  readonly screen: readonly MapScreenEntry[];
}
```

An activity's default map: its bindings, unbound places left out, and its screen list in order.

Uses [`ActivityMapBinding`](#activitymapbinding), [`MapScreenEntry`](#mapscreenentry).

### `ActivityMapBinding`

```ts
interface ActivityMapBinding extends DeviceMapBinding {
  readonly device: string;
}
```

One place and press of an activity's default map: a command of one of its devices.

Uses [`DeviceMapBinding`](#devicemapbinding).

### `ActivityRoleKind`

```ts
type ActivityRoleKind = (typeof ACTIVITY_ROLE_KINDS)[number];
```

Uses [`ACTIVITY_ROLE_KINDS`](#activity_role_kinds).

### `ActivityStart`

```ts
interface ActivityStart {
  /**
   * Refuses a screen this start cannot run, before anything is built: `set` is the activity's keypad map, `lists`
   * how many base slot 10 lists exist, `variables` how many state variables.
   */
  checkScreen(c: Container, screen: ActivityStartScreen, at: { set: number; lists: number; variables: number }): void;
  /**
   * The enter list around `writes`, the activity's own state writes and the counter's last, with the enter
   * list at `first`, the select list after it, and `after` the lists from `first + 2` on.
   */
  lists(screen: ActivityStartScreen, first: number, writes: ListBody): { enter: ListBody; after: readonly ListBody[] };
  /**
   * Tag 5's own list, picking the running activity again, where a caller names none: `inputs` are the start's
   * input writes in its order. Absent where the family keeps the default, the enter list.
   */
  resume?(screen: ActivityStartScreen, inputs: ListBody): ListBody;
}
```

The shape of an activity's start: what the shared activity composer asks once an activity has its screens. On the
Harmony 600, 650 and 700, a variable held at 1 while the start runs, gating the inter device delay, and a flag
written 1 before the working screen is deferred, whose list enters the working screen itself; on the Harmony One,
the timers cancelled, the "an activity is
running" list called, and a deferred list that calls the one showing the working screen. The composer asks this
rather than testing a trait of its own and building both itself.

Uses [`Container`](config.md#container), [`ActivityStartScreen`](#activitystartscreen), [`ListBody`](#listbody).

### `ActivityStartScreen`

```ts
type ActivityStartScreen = NonNullable<ComposeActivity['screen']>;
```

The screens an activity's start enters, [`ComposeActivity.screen`](#composeactivity).

Uses [`ComposeActivity`](#composeactivity).

### `ActivityTypeName`

```ts
type ActivityTypeName = (typeof ACTIVITY_TYPES)[number];
```

Uses [`ACTIVITY_TYPES`](#activity_types).

### `ArchiveKeyCode`

```ts
interface ArchiveKeyCode {
  readonly Start: readonly SegmentRef[] | null;
  readonly Repeat: readonly SegmentRef[] | null;
  readonly Finish: readonly SegmentRef[] | null;
}
```

The three cycles of a transmission: what precedes it, what repeats, and what a release sends.

Uses [`SegmentRef`](#segmentref).

### `Atom`

```ts
interface Atom {
  readonly Type: number;
  readonly Value: number;
}
```

An atom of a segment: `Type` 1 is carrier on, 0 is carrier off, and `Value` is microseconds.

### `BiphaseTimings`

```ts
interface BiphaseTimings {
  /** One half cell of carrier. */
  mark: number;
  /** One half cell of silence. */
  space: number;
  /** A different opening mark where the family sends one, as `FrameTimings.firstMark`. */
  firstMark?: number;
  /** Everything before the first bit cell, exactly as a record stores it. */
  lead: readonly Pulse[];
  /** Whether a mark in the **first** half of a cell means a set bit. RC-6 is the other way up. */
  setIsMark: boolean;
}
```

What a biphase family's pulses are made of, which is the encoder's side of `biphaseFrames`.

**Three numbers and a lead in, against a pulse distance frame's five.** There is one cell length, so
a bit is which half of it carries, and the only durations are the mark and the space that make one
half cell. What varies between families is the lead in, which is a fixed prelude they all send and
none of them derives from the bits: `Magnavox 13 Bit` sends a single mark, `Microsoft 30 Bit` sends
eleven intervals of RC-6 preamble, and `Kreatel IP 22 Bit` sends nothing at all.

The lead in is carried as the intervals a record stores rather than as a count of half cells, because
that is what makes an emitted frame byte identical to a stored one: RC-6's preamble holds a 2632 and a
1323 that are six and three half cells long, and their own generator writes 443 and 439 in two places
where the cell is 441.

Uses [`Pulse`](config.md#pulse).

### `BlendedSet`

```ts
interface BlendedSet {
  source: number;
  background: number;
  set: number;
  /** The weight it is lettered in where `weightFor` chose one other than its source's. */
  weight?: OxaniumWeight;
}
```

A blended copy of a set: which set it copies, the colour it is blended for, and its own index.

Uses [`OxaniumWeight`](#oxaniumweight).

### `BlockRefusal`

```ts
type BlockRefusal =
  | 'the rhythm itself could not be read'
  | 'the definition states no repeat cycle'
  | 'a cycle names a segment the definition does not hold'
  | 'a cycle names an infrared segment stating no readable rhythm'
  | 'a padded cycle of several frames whose shared period is not one number'
  | 'a copy stating its constant half last follows a mark';
```

Why a block could not be derived from a definition. Counted rather than thrown, as a refusal is.

### `BUTTON_KEYS`

```ts
const BUTTON_KEYS = [
  'Blue', 'ChannelDown', 'ChannelUp', 'DVR', 'DirectionDown', 'DirectionLeft', 'DirectionRight', 'DirectionUp',
  'Exit', 'FastForward', 'Green', 'Guide', 'Info', 'Menu', 'Pause', 'Play', 'PrevChannel', 'Record', 'Red',
  'Rewind', 'Select', 'Stop', 'VolumeDown', 'VolumeMute', 'VolumeUp', 'Yellow',
] as const
```

The names a Touch's documents give its 26 keys: the drawing's 27 keypad keys less Off, which the screens
handle themselves, with the DVR key spelt as the documents spell it.

### `CatalogueFamily`

```ts
interface CatalogueFamily {
  readonly family: string;
  readonly bits: number | undefined;
}
```

A catalogue family at a rhythm, with the width its keycode field states.

### `CatalogueRules`

```ts
interface CatalogueRules {
  readonly globalDeviceId: number;
  /** Source: the archive checkout, `driving.ts`. */
  readonly archive: DeviceDriving;
  /** Source: the raw capture's side file. Absent when no raw directory was given. */
  readonly raw?: RawDrivingFields;
  /** Which build of each the answer came from. */
  readonly sources: {
    readonly archive: { readonly generated: string };
    readonly raw?: { readonly sha256: string; readonly release?: string; readonly archiveGenerated: string };
  };
}
```

A device's driving rules from both sources, each marked as such.

Uses [`DeviceDriving`](config.md#devicedriving-type), [`RawDrivingFields`](#rawdrivingfields).

### `CellTimings`

```ts
interface CellTimings {
  /** The lead in as it stands, signed microseconds: positive a mark, negative a space. May be empty. */
  readonly lead: readonly number[];
  /** One entry per symbol value in value order, each the cell's own intervals in wire order. */
  readonly cells: readonly (readonly number[])[];
  /** How many bits one cell carries. `cells.length` is two to this power. */
  readonly bits: number;
}
```

A frame whose cell is one of several lengths, rather than one of two.

**What this is.** An ordinary infrared family sends one bit per cell, so it needs two cells and our
[`FrameTimings`](#frametimings) names them `zero` and `one`. Logitech's catalogue also holds families that send **two**
bits per cell, out of four lengths, and families that send **four**, out of sixteen. 75 of their
families are base four and 67 base sixteen.

**Which base a family uses comes from its definition and never from its name**, the number of cells in
its frame segment: `Quad 5 Bit` has two symbols, five bits, and values in hexadecimal.

**A cell is a list of intervals and nothing is assumed about its shape**, which is why this is not
[`FrameTimings`](#frametimings) with more fields. Of the 75 base four families, 33 have a constant half and four
varying ones, 31 have **no** constant half, and 10 state a cell that is not one mark and one space at
all. A reader that demanded a constant half would refuse three fifths of them, and the reason our
two cell shape has `flat` is that a **stored** record needs it, not that infrared does.

`bits` is how many bits one cell carries, 2 or 4, and the cells are indexed by the symbol value.

### `CLIENT_ACTIONS`

```ts
const CLIENT_ACTIONS = ['Numpad'] as const
```

**The client actions a button of ours may carry**: `Numpad`, which opens the number pad, the one the documents
measured hold (six maps, each on an entry labelled `123` of group 36). A client action sends nothing from the engine
and the screens act on it themselves, `activities-and-buttons.md`, "What a writer must carry".

### `CommonChoices`

```ts
interface CommonChoices {
  readonly delays?: DelayDefaults;
  /**
   * The activity key each MyHarmony type of activity takes, where the family's remotes have activity keys:
   * the Harmony 600, 650 and 700. The Harmony One has none. A key by the name printed on it,
   * which names the family's `activityKeyEditor` knows.
   */
  readonly activityKeys?: Readonly<Record<string, string | undefined>>;
}
```

The choices a shared composer asks a family for, which every family's own choices include: a family
whose devices carry no delay variables, the Harmony One's send, [`Family.sends`](#family), has no delays to choose.

Uses [`DelayDefaults`](#delaydefaults).

### `ComposeActivity`

```ts
interface ComposeActivity {
  /** The word the activity is known by, which the **screen half** draws on the menu page as pixels. */
  readonly label: string;
  readonly targets: readonly ComposeActivityTarget[];
  /**
   * The activity's keypad map: a scan code and the base slot 10 list its press runs, in the order written. A key with
   * no list is swallowed: an entry of opcode and operand 0, which matches the key and runs nothing, so no map below
   * the activity's sees it, `reference/config-format/modes-and-keys.md`; a key a recipe chooses to do nothing,
   * where a key left out of the map falls through to the maps below instead.
   */
  readonly keys?: readonly { readonly scan: number; readonly list: number | undefined }[];
  /**
   * What tag 2, the leave handler, runs. Omitted emits the **null instruction**, opcode 0 with
   * operand 0, which Logitech's own configurations of the Harmony 880 and 885 and the Harmony 525
   * carry for some activities. So the tag is required and giving it something to run is not.
   */
  readonly leaveList?: number;
  /**
   * The activity key to put the new activity on, by the name printed on it, Watch TV, Watch a Movie or
   * Listen to Music. Only where the family has activity keys, `Family.activityKeyEditor`: the
   * Harmony 600, 650 and 700, where it is one entry in base slot 9 entry 1 and a same length edit made after
   * everything else here. Omitted leaves every key as it was, and the activity is reachable from the menu
   * only, which is what an activity on no key is on those models. Whatever the key did before is replaced,
   * an activity included; that one keeps its own menu row and loses only the key.
   */
  readonly activityKey?: string;
  /**
   * What tag 5 runs. Tag 5 is on all 50 activities and **always runs a real list**, so it cannot be
   * the null instruction the way tag 2 can. What fires it is read now: the activity
   * switch runs it when the activity asked for is the one already running, so it is what picking the
   * running activity again from the menu or an activity key does.
   */
  readonly resumeList?: number;
  /**
   * The activity's two screens, from `composeActivityScreen`. Given, the enter list
   * opens the way every Harmony One activity's does: enter the start up screen, cancel the timers,
   * write the state, say an activity is running, and enter the working screen **deferred**, through
   * the six byte `0x3F` band `0xD0` instruction every activity's chain uses, so it is not on until
   * the infrared ahead of it is out. Omitted, the enter list writes state and nothing else, which is
   * what this function produced until then and what left the remote on the page that started it.
   */
  readonly screen?: {
    readonly startupMode: number;
    readonly workingMode: number;
    /** Harmony One: the list every activity's enter list calls to say one is running. */
    readonly activeList?: number | undefined;
    /**
     * Harmony 600, 650 and 700: the variable the start sequence holds at 1 while it runs, the one it
     * writes 1 before deferring the working screen, and the base slot 9 entry the screen's keypad map
     * case selects. All three from `composeActivityScreen`.
     */
    readonly startVariable?: number | undefined;
    readonly flagVariable?: number | undefined;
    readonly set?: number | undefined;
    /** The value the screen's record case was composed for, checked against this activity's. */
    readonly activity: number;
  };
}
```

Uses [`ComposeActivityTarget`](#composeactivitytarget).

### `ComposeActivityRowOptions`

```ts
interface ComposeActivityRowOptions {
  /**
   * An existing activity menu row whose icon the new row wears, by its drawn label, so a television
   * activity gets the television icon. Without it the first row's icon is copied, whatever it shows,
   * which is `composeDeviceScreen`'s behaviour and its documented wart: on a Harmony One whose first
   * row is a music activity an unqualified television activity comes out wearing a disc.
   */
  iconLike?: string;
  /**
   * The activity's MyHarmony type: on the Harmony One the row is then drawn in our pictures, the row box and
   * the type's icon, `OneChoices.activityIcons`, rather than copied off the first row; a menu with no row
   * needs it. The Harmony 600, 650 and 700 draw no icon on a row and ignore it.
   */
  type?: string;
}
```

### `ComposeActivityScreenOptions`

```ts
interface ComposeActivityScreenOptions {
  /**
   * An existing activity, by its drawn menu label, whose start up screen the new activity shows.
   * That screen draws the activity's icon, so a television activity wants a television one. Without
   * it, on the Harmony One, the start up screen of the activity whose working screen served as the
   * template is used. **Harmony One only**: on a Harmony 600, 650 or 700 every start up screen draws one picture and is
   * built, so it is refused there rather than ignored.
   */
  startupLike?: string;
  /**
   * The activity's MyHarmony type, `WatchTV`, `ListenToMusic` and so on, which decides the icon a built
   * screen draws: the Harmony One's, `OneChoices.activityIcons`. The Harmony 600, 650 and 700 draw one
   * picture for every type and ignore it.
   */
  type?: string;
}
```

### `ComposeActivityTarget`

```ts
interface ComposeActivityTarget {
  /** A device state variable, in base slot 13's numbering, as `composeDevice` returns it. */
  readonly variable: number;
  /** The value the activity wants it in. Its transition is what sends the code. */
  readonly value: number;
}
```

One device's target state when an activity is running: a base slot 13 variable and its value.

### `ComposeCommand`

```ts
interface ComposeCommand {
  /** The code, whole: `G:Toshiba 32 Bit:(0x20DF10EF)(Repeat)():3`. */
  readonly stated: string;
  /**
   * `stated` as its family's definition reads it, `statedCodeOfDefinition` in `archive.ts`, where the
   * caller has the archive; absent, `stated` is read at the widths its family's name spells.
   *
   * **The name is not enough to read a code**: the number before `Bit` is the digit count on
   * some families whose cell carries more than one bit and neither count on as many, and several names state
   * no width at all, so a code
   * the name cannot read is one the table's block and the held power step cannot be built for either. The
   * catalogue composer passes this for every command, so the record is built from one reading of the
   * string, the one `make prontocheck` holds against the archive's renderings.
   */
  readonly read?: StatedCode;
  /**
   * Whether the command repeats while its key is held, which nothing states:
   * a record's held block is per command in the format and the catalogue does not say. Absent means
   * take the family's repeat block where the family has one, which is right for volume and channel
   * keys and harmless for the rest, and `false` refuses it for a command that must not repeat.
   */
  readonly held?: boolean;
  /**
   * The silence in front of the once block: every once block in every
   * Logitech compile leads with one, 2032 of 2032 across both generator eras, 50 ms on most
   * commands and 500 ms or a second on the ones that deserve a settling time, power and inputs
   * mostly. Absent means the 50 ms the majority carries; the catalogue does not state the longer
   * ones, so a caller that knows better says so here.
   */
  readonly leadInUs?: number;
  /**
   * A power step the catalogue holds for this many milliseconds: the record is
   * `longPressBlockOfStatedCode`'s, its frames counted for the hold, with no held block, the way
   * Logitech's compiler writes one. `held` does not apply and is refused. **The lead in defaults to none
   * here**, as every long press version of the Harmony 650 and 700 compiles has none; a
   * `leadInUs` given goes in front of the frames, which is how the Harmony 880 and 885 compiles open one,
   * with the device's delay between devices, `reference/infrared/sending.md`, "The delay between devices on the
   * Harmony 880 and 885".
   */
  readonly holdMs?: number;
  /**
   * The press's blocks where the caller derived them at the device's count: `once`
   * is the record's first block without its lead in and `held` the second.
   *
   * **The table cannot hold these because the count is the device's and not the family's.** A whole block
   * is the family's shape plus how many repetitions a press sends, and for the families whose definition
   * states no count the compiler takes it from the device, so one family has as many blocks as its
   * devices have counts. `catalogueCommandBlocks` in `cataloguecodes.ts` derives them from the
   * family's definition at the device's count, where the table holds no block for the family and where
   * its block was measured on a device stating another count; a caller without the archive leaves this
   * out and gets the table's block, or a refusal where it has none. **Given, they win over the table's
   * block**: a table block carries the count of the one device it
   * was measured on, so where the caller has derived another one the table's is the wrong one.
   */
  readonly blocks?: StatedBlocks;
  /**
   * The same command with its toggle bit flipped, which becomes the record's **second pointer group**,
   * `reference/config-format/infrared-records.md`: `read` and `blocks` as above, for the flipped code, composed
   * the same way as the command itself, so the second group is the first group's derivation applied to other
   * frames.
   */
  readonly toggled?: ToggledCode;
}
```

One command to put on the new device, as the catalogue spells it.

Uses [`StatedCode`](config.md#statedcode-type), [`StatedBlocks`](#statedblocks), [`ToggledCode`](#toggledcode).

### `ComposedActivityRow`

```ts
interface ComposedActivityRow {
  bytes: Uint8Array;
  /** The mode the activity menu is, which the row was added to. */
  menu: number;
  /** Which page of that menu gained the row, counting from zero. */
  page: number;
  /**
   * The base slot 10 list the row runs: beep, select the entry, clear the device mode marker, and on
   * the Harmony 600, 650 and 700 the first of `rowLists`, which carry no beep.
   */
  rowList: number;
  /** The scan code the new row answers to, which is its position in the page's hit rectangles. */
  scan: number;
  /**
   * Every scan the row answers to: `scan` alone on the Harmony One, and on the Harmony 600, 650 and
   * 700 both buttons of the row, top or bottom.
   */
  scans: number[];
  /**
   * How many row lists were written from `rowList` on: one on the Harmony One, where every binding
   * shares it, and on the Harmony 600, 650 and 700 one per button on the page and another per button
   * on its copy, as the compiler
   * writes them.
   */
  rowLists: number;
}
```

What `composeActivityMenuRow` put on the screen, for a caller that has to find it again.

### `ComposedActivityScreen`

```ts
interface ComposedActivityScreen {
  bytes: Uint8Array;
  /** The activity value the screen was composed for, which `composeActivity` must then produce. */
  activity: number;
  /** The new working screen, base slot 6. */
  mode: number;
  /** The start up screen the enter list should open with: an existing one on the Harmony One, the one composed with it on the Harmony 600, 650 and 700. */
  startupMode: number;
  /** The existing list every activity's enter list calls to say an activity is running. Harmony One only. */
  activeList?: number;
  /** The base slot 14 record that gained the activity's case: on the Harmony 600, 650 and 700, the working screen's. */
  map: number;
  /** The list the page's "Devices" key runs: beep, enter the device list. Harmony One only. */
  devicesList?: number;
  /** The scan codes the pads answer to, in row order. Empty on the Harmony 600, 650 and 700, whose pads are the corners. */
  scans: number[];
  /** Harmony 600, 650 and 700 only: the variable the start sequence holds at 1, and the one it writes before deferring. */
  startVariable?: number;
  flagVariable?: number;
  /** Harmony 600, 650 and 700 only: the base slot 9 entry the keypad map case selects, which `composeActivity` must add. */
  set?: number;
  /** Harmony 600, 650 and 700 only: the base slot 14 records that gained a case, working screen's first. */
  maps?: number[];
  /** Harmony 600, 650 and 700 only: how many pages the working screen has. */
  pages?: number;
  /**
   * Keys the screens need the activity's own keypad to bind, which `composeActivity` adds to the ones the
   * roles give: on the Harmony One, scan 55, the key that opens the device list, bound in every activity of
   * Logitech's compiles.
   */
  keys?: { scan: number; list: number }[];
}
```

### `ComposedBuildersOptions`

```ts
interface ComposedBuildersOptions {
  /**
   * Whether the donor is one of ours, `composedLook.donorOfOurs`: its pictures are ours
   * already, so no step turning Logitech's into ours runs.
   */
  readonly donorOfOurs?: boolean;
}
```

What `composedBuilders` is told of the donor beyond the configuration itself.

### `ComposedDevice`

```ts
interface ComposedDevice {
  bytes: Uint8Array;
  group: number;
  /** The base slot 10 list index per command, which is what a binding's 0x7f names. */
  lists: readonly number[];
  /**
   * The lists that perform the power actions, where `powerOn` and `powerOff` were given: what a
   * device page's power keys should name so that they send what the catalogue asks for rather than an
   * ordinary press. For an action of one step that is the step's own send list, equal for a toggle;
   * for several it is a list calling each step's send list in order. `off` is also what
   * the power variable runs to switch the device off. `on` never carries the power on delay, which
   * only the transition adds: no device mode key Logitech compiled runs one.
   */
  powerSteps?: { on?: number; off?: number };
  /** The device's power variable, in base slot 13's numbering. */
  variable: number;
  /**
   * Harmony 600, 650 and 700 only: what every command opens with. `variable` is the device's
   * `InterDeviceDelay_<identifier>`, `table` the base slot 14 record mapping it, `list` the one list
   * of the device's own that applies it, and `identifier` the number the variable's name carries.
   */
  delay?: { variable: number; table: number; list: number; identifier: number };
  /**
   * Harmony 600, 650 and 700 only: the power on delay. `variable` is `PowerOnDelay_<identifier>`,
   * `table` the base slot 14 record mapping it, `list` the list holding that `0x72`, and `on` the
   * list the power variable runs to switch the device on: the power command, then `list`.
   */
  powerOnDelay?: { variable: number; table: number; list: number; on: number };
}
```

### `ComposedDeviceNote`

```ts
interface ComposedDeviceNote {
  /** The setup's name for it, which a screen asking about it draws. */
  readonly name: string;
  /** Its label in the configuration, the stem of its state variables' names, `deviceVariables`. */
  readonly label: string;
  /** The power type the catalogue states, where it states one: a toggle sends the same steps on and off. */
  readonly power?: 'discrete' | 'toggle';
}
```

A device the composers added to a donor, as a builder on the composed path is told of it, `composedBuilders`:
what the setup and the catalogue say of it that the configuration does not.

### `ComposeDevice`

```ts
interface ComposeDevice {
  /**
   * The word the config knows the device by, ASCII with no underscore, because a state
   * variable's name is `<label>_<property>_<values>` and the underscore is the separator that
   * makes the label recoverable.
   */
  readonly label: string;
  readonly commands: readonly ComposeCommand[];
  /** Which command is the power toggle, driving the device's one state variable. Default 0. */
  readonly power?: number;
  /**
   * The catalogue's power on and power off steps, each composed as a record of its own,
   * which the power variable's two transitions then send in place of `commands[power]`'s list. The two
   * may be the same step, a toggle, and then share one record. Absent means `power` is sent both ways,
   * which is what a composed device did before and what sends an ordinary press where Logitech's
   * catalogue asks for a held one: three frames where the Harmony 650's Panasonic needs four.
   *
   * **Several steps are an action performed in order**: the Knoll HDP-1100's catalogue
   * switches it off with its power toggle held for half a second, three times, and Logitech's compiler
   * wrote one list calling that step's send list three times, which is what the off transition runs. A
   * step stated twice is one record and one send list, called twice. `catalogueDevicePower` in
   * `devicepower.ts` reads these out of the catalogue.
   */
  readonly powerOn?: ComposePowerStep | readonly ComposePowerStep[];
  readonly powerOff?: ComposePowerStep | readonly ComposePowerStep[];
  /**
   * The amount of the `0x7C` paired with each power step's send, in tenths of a second: the catalogue's
   * inter key delay. Every power step send list Logitech compiled for the test devices of
   * the six power hold compiles carries its device's inter key delay there, 1, 4 or 5, while the same
   * devices' ordinary presses carry 1, which is what `commands` still get. Their compiler also adds, on
   * some devices, an uncalled second list per digit at the inter key delay and a second list for some
   * input commands at the input delay; what decides either is not read and neither is composed.
   * Default `DEVICE_QUANTITY_DEFAULT`.
   */
  readonly interKeyDelay?: number;
  /**
   * The inter device delay in tenths of a second. On the Harmony 600, 650 and 700, 0 to 20, which an
   * activity's start, All Off and Help queue in front of each of this device's commands; default
   * `INTER_DEVICE_DELAY_DEFAULT`. On the Harmony 880 and 885 the silence each power step's record opens
   * with, `SendShape.powerStep` in the side keys family, `reference/infrared/sending.md`; default its
   * `SIDE_KEYS_INTER_DEVICE_DEFAULT`. The Harmony One's composer reads none.
   */
  readonly interDeviceDelay?: number;
  /**
   * The power on delay in tenths of a second, waited after the power command when the device is
   * switched on. On the Harmony 600, 650 and 700 0 to 450, a variable mapped through base slot 14, default
   * `POWER_ON_DELAY_DEFAULT`. On the Harmony One 1 to 255, a bare `0x7C` wait at the end of the on list,
   * and none where it is not given.
   */
  readonly powerOnDelay?: number;
}
```

A device to compose whole: its label, its commands, and which command toggles the power.

Uses [`ComposeCommand`](#composecommand), [`ComposePowerStep`](#composepowerstep).

### `ComposedScreen`

```ts
interface ComposedScreen {
  bytes: Uint8Array;
  /** The new mode's index in base slot 6's table, which is what a menu row's 0x7e names. */
  mode: number;
  /** The device list modes that gained a row, by table index. */
  menus: readonly number[];
  /**
   * The base slot 10 list the new menu rows run: beep, enter the mode, mark device mode. On the Harmony One every
   * row runs a list of its own, as Logitech's do, and this is the first list index the rebuilt device
   * lists took.
   */
  rowList: number;
  /** The menus whose last page was full, so a new one row page was added to each. */
  pagesAdded: number[];
  /** Harmony 600, 650 and 700 only: how many row lists were written, from `rowList` on, one per menu binding and copy. */
  rowLists?: number;
  /** Harmony 600, 650 and 700 only: how many keys of the new device mode's key map send one of its commands. */
  keys?: number;
  /** Harmony 600, 650 and 700 only: how many pages the new device mode has. */
  pages?: number;
  /**
   * Harmony 600, 650 and 700 with `compiled` only: the texts drawn in a font of another size than
   * the compiler's rules pick, because no font of that size in the configuration carries every glyph
   * they need, or because a character has no width in the size that decides them. Each is a page that differs from the
   * compiler's, and a caller reports them rather than discovering them on the remote.
   */
  substituted?: string[];
}
```

### `ComposePowerStep`

```ts
interface ComposePowerStep {
  readonly stated: string;
  /** `stated` as its family's definition reads it, `ComposeCommand.read`. */
  readonly read?: StatedCode;
  readonly holdMs?: number;
  /** The press's blocks where the rhythm table has none for its family, `ComposeCommand.blocks`. */
  readonly blocks?: StatedBlocks;
  /** The code with its toggle bit flipped, the record's second group, `ComposeCommand.toggled`. */
  readonly toggled?: ToggledCode;
}
```

One step of a power action as the catalogue states it: a command, and how long it is held where the
catalogue says, [`DriveStep`](#drivestep) in `driving.ts`. A step held for a time gets a record of its own holding
the frames that time sends; a step that is not still gets a record of its own, the
ordinary press without its lead in silence, which is what every power step record Logitech compiled
for the Harmony 650 holds, measured on three devices word for word.

Uses [`StatedCode`](config.md#statedcode-type), [`StatedBlocks`](#statedblocks), [`ToggledCode`](#toggledcode).

### `ComposeRow`

```ts
interface ComposeRow {
  readonly label: string;
  /** The base slot 10 list the row runs, from `ComposedDevice.lists`. */
  readonly list: number;
}
```

A command as it appears on the device's page: the row's word.

### `ComposeScreenOptions`

```ts
interface ComposeScreenOptions {
  /**
   * A device list row whose icon a new page's row wears, by its drawn label, so a television gets
   * the television icon. Without it the first row's icon is copied, whatever it shows.
   */
  iconLike?: string;
  /**
   * Harmony 600, 650 and 700 only: the device list row whose device mode the new one takes its key
   * map from, by its drawn label. Every key that mode binds is bound in the new one too, to the new device's command
   * sending the same frame where exactly one does and to nothing otherwise, so a key never falls
   * through to another device's map. Without it the first row's mode is the template and no key
   * matches unless the numbers happen to agree.
   */
  keysLike?: string;
  /**
   * Lay the device mode out the way Logitech's compiler does, `devicemode.ts`, rather than with one label font and a key map copied from another device. The rows' labels
   * are then sized, split and cut by the compiler's rules and drawn in a font of the size those rules
   * pick, the title is `title` cut to what the page counter leaves, a counter of two digits is drawn
   * where the compiler draws one, and the key map is `keys`, a list per scan, with every other key
   * bound to nothing. On the Harmony 600, 650 and 700 `keysLike` is still the mode whose key map's shape
   * is copied, its 47 tags and its two navigation entries, but none of its bindings. On the Harmony One the
   * rows are laid out by the One family's own rules, and of this only `keys` is read, into
   * the shape of an existing device mode of as many pages.
   */
  compiled?: { title: string; keys: ReadonlyMap<number, number> };
}
```

Compose the screen half of a device: its own mode with one page drawing its label and its
commands, and one new row on every device list menu, entering that mode. Harmony One only: a page's hit
rectangles, its lead byte and every position here are that model's.

### `CONTEXT_FIELDS_READ`

```ts
const CONTEXT_FIELDS_READ = ['AccountId-', 'HouseholdUserProfileUri', 'Language', 'Email', 'InstallerId', 'SetupSession', 'CountryCode'] as const
```

The seven Context fields read on a Touch synced through a computer, the module header: the six that act and the
country of the usage report. A description states each of them and nothing else.

### `ContextFieldRead`

```ts
type ContextFieldRead = (typeof CONTEXT_FIELDS_READ)[number];
```

Uses [`CONTEXT_FIELDS_READ`](#context_fields_read).

### `Definition`

```ts
interface Definition {
  readonly CarrierFrequency: number | null;
  readonly IRSegments: readonly Segment[] | null;
  readonly CodeSegments: readonly Segment[] | null;
  readonly Attributes: readonly unknown[] | null;
  readonly Flags: readonly unknown[] | null;
  readonly HoldDelay: number | null;
  readonly HoldMinimumRepeats: number | null;
  /** Which segments a block is made of, which is the block structure stated outright. */
  readonly KeyCode: ArchiveKeyCode | null;
}
```

Logitech's `IrProtocol`, the same contract [`reference/logitech/data-model/model.md`](../../logitech/data-model/model.md) records from their schema.

Uses [`Segment`](#segment), [`ArchiveKeyCode`](#archivekeycode).

### `DelayDefaults`

```ts
interface DelayDefaults {
  readonly powerOn: number;
  readonly interDevice: number;
}
```

The delays a composed device starts with where nothing states one, in tenths of a second.

### `DeviceMap`

```ts
interface DeviceMap {
  readonly keys: readonly DeviceMapBinding[];
  readonly screen: readonly DeviceMapEntry[];
}
```

A device's default map: its bindings, unbound places left out, and its screen list in order.

Uses [`DeviceMapBinding`](#devicemapbinding), [`DeviceMapEntry`](#devicemapentry).

### `DeviceMapBinding`

```ts
interface DeviceMapBinding {
  readonly key: string;
  readonly press: RecipePress;
  readonly command: string;
  readonly label?: string;
}
```

One place and press of a device's default map: the device's own command it sends, and the label a pad shows.

Uses [`RecipePress`](config.md#recipepress).

### `DeviceMapEntry`

```ts
type DeviceMapEntry =
  | { readonly command: string; readonly label?: string }
  | { readonly label: string; readonly client: string };
```

One entry of a screen list as a family derives it: a command, labelled with its own name where no label is given,
or an entry the remote acts on itself and that sends nothing, such as one that opens the number pad, by the name
the family gives that action.

### `DeviceScreenItem`

```ts
interface DeviceScreenItem {
  /** The label as drawn, its lines joined with a space. */
  readonly label: string;
  readonly list: number;
  /** The label's lines as drawn, where a family breaks a name over lines by a rule `drawsName` reapplies. */
  readonly lines?: readonly string[];
}
```

One item of a device's own screen pages: its drawn label and the list it runs.

### `DeviceSend`

```ts
interface DeviceSend {
  readonly record: number;
  readonly quantity: number;
}
```

One send of a device being composed: the record it sends and the quantity its `0x7C` carries.

### `DeviceSends`

```ts
interface DeviceSends {
  /** The configuration the lists go into: the infrared group's, with whatever the family's sends need first. */
  readonly container: Container;
  /** The device's lists, from `firstList` on; `onCalls` are the lists the on action calls, in order. */
  lay(firstList: number, sends: readonly DeviceSend[], onCalls: readonly number[]): LaidDeviceSends;
}
```

What the device composer gets from its family's send before it reads base slot 10, [`SendShape.device`](#sendshape).

Uses [`Container`](config.md#container), [`DeviceSend`](#devicesend), [`LaidDeviceSends`](#laiddevicesends).

### `DeviceStateSelect`

```ts
interface DeviceStateSelect {
  readonly setType: number;
  readonly steps: readonly DriveStep[];
}
```

One way to reach a state value. `setType` is a Logitech enumeration, 0 to 2, not decoded here.

Uses [`DriveStep`](#drivestep).

### `DeviceStateValue`

```ts
interface DeviceStateValue {
  readonly name: string;
  /** Absent where the value is reached by stepping with the state's `next`, or not at all. */
  readonly select?: readonly DeviceStateSelect[];
}
```

Uses [`DeviceStateSelect`](#devicestateselect).

### `DriveStep`

```ts
type DriveStep =
  | { readonly kind: 'send'; readonly command: string; readonly holdMs?: number }
  | { readonly kind: 'hold'; readonly command: string }
  | { readonly kind: 'wait'; readonly ms: number }
  | { readonly kind: 'state'; readonly state: string; readonly value: string };
```

One step of an action list. A list is performed in order, and every actionable field below is one. The
archive's order is the service's own step numbering rather than its array position, checked on every
list of every device, the per input and per state ones included. The fields the archive
drops from a step or an input are in [`catalogueraw.ts`](../../../packages/config/src/catalogue/catalogueraw.ts), whose [`catalogueRules`](config-node.md#cataloguerules) returns these rules with
them attached.

Five shapes in the archive, mapped to four kinds:

- a bare string is `send`, the command of that name from the device's codeset, sent as one press;
- `{command, durationMs}` is `send` with `holdMs`, the command kept going for that long. **This is the
  field a held command's length lives in**: Logitech's compiler turns it into as many copies of the code as fit.
  The service also states a duration of 0, and the archive writes that as a bare string;
- `{hold}` is `hold`, a press held for a time nobody stated. Its operand is passed through as written,
  and it is not always a command that exists: on 14 of the 49 the archive holds it is digits, such as
  `1000`, and on the one device checked, BenQ's MW851UST, its codeset has no command of that name. The
  archive's raw capture says the service states this step as a command name with no duration, so it
  is passed through as stated and a caller checks the name before sending;
- `{delayMs}` is `wait`, nothing sent;
- `{set, to}` is `state`, **not a transmission**: it records that the device's state `state` now holds
  `value`, which is what lets a later input change know where it starts from.

### `Encoding`

```ts
type Encoding = 'hex-data-elements' | 'raw-after-header' | 'bare-container';
```

How the payload was carried, kept so a round trip can put it back the same way.

### `Encoding` (type)

```ts
interface Encoding {
  readonly BitType: number;
  readonly Atoms: readonly Atom[] | null;
}
```

One bit value's cell, `BitType` 0 for a clear bit and 1 for a set one.

Uses [`Atom`](#atom).

### `FaceOrRefusal`

```ts
type FaceOrRefusal = OxaniumFaceName | { readonly refusal: string };
```

A family's answer to `faceOf`: the face, or why none of its faces fits the set, which `measureSet` refuses with.

Uses [`OxaniumFaceName`](#oxaniumfacename).

### `Family`

```ts
interface Family {
  readonly magic: string;
  readonly endMarker: string;
  readonly architectures: string;
  /** The observed marker after the pointer table. */
  readonly headerMarker: string;
  /** Whether a key table starts at that marker. */
  readonly keyTableAtMarker: boolean;
}
```

One container cookie and the end marker that goes with it.

### `Family` (type)

```ts
interface Family<Choices extends CommonChoices = CommonChoices> {
  /**
   * Which of the two kinds of family this is: a compiled family builds the container the remote
   * is written with, where a document family, `DocumentFamily` in `document.ts`, builds documents.
   */
  readonly kind: 'compiled';
  /** For a refusal or a report: the models this family serves, as a person names them. */
  readonly name: string;
  readonly traits: FamilyTraits;
  /** Every choice of ours this family makes, at its default: what a recipe may set for it. */
  readonly choices: Choices;
  /**
   * Which command each hard key sends in a catalogue device's device mode, as Logitech's compiler binds them
   * for this family: per key, the commands it takes in order of preference, `deviceModeLayout`.
   */
  readonly deviceModeKeys: readonly HardKey[];
  /** The keys the activity keypad rule names, `ActivityKeyRules`, on this family's keypad. */
  readonly activityKeyRules: ActivityKeyRules;
  /** The family's activity keys, where its remotes have them: the Harmony 600, 650 and 700's three. Absent on the Harmony One, which has none, so a composer asked to put an activity on one refuses. */
  readonly activityKeyEditor?: ActivityKeyEditor;
  /**
   * The keys a recipe chooses otherwise, `RecipeKey`, built for this family: which keys a
   * recipe may name, by Logitech's word for each, and how a device mode's own map is rebound. Absent where the family builds none yet, and then a
   * recipe stating a key is refused rather than built without it, since an ignored choice gives a file the remote
   * accepts and a key that does something else. The Harmony One has it, `families/harmony-one/recipekeys.ts`.
   */
  readonly recipeKeys?: RecipeKeyBuilder;
  /**
   * The family's maps, `maps.ts`: the model's places, the commands it carries for a device, and the
   * default maps of a device and of an activity, which `resolveMaps` puts the document's choices over for the build and
   * the questions alike. The same interface as a document family's, so a key is asked the same way of every model.
   * Absent where the family states none yet, which is every compiled family.
   */
  readonly maps?: FamilyMaps;
  /**
   * The remote's own settings a document may state, `settings.ts`: the rows the build writes with their kind and
   * default, the ones not built yet, and the build's judgement of a value. Absent where the build reads no setting
   * from a document, which is every compiled family: their settings are build choices of their own.
   */
  readonly settings?: FamilySettings;
  /**
   * What `buildStateTables` builds this family's base slots 0, 13 and 14 from, and `describeStateTables` reads
   * them by: the Harmony 600, 650 and 700's, and the Harmony One's, whose tables differ in four values.
   */
  readonly stateTables: StateTableFacts;
  /**
   * The family's own wiring, the event map, the leading list, the timers, base slot 9's fixed entries and the
   * lists they reach: a configuration's checked against what the family's builder makes from the description
   * read off it, byte for byte, refused at the first difference. The Harmony 600, 650 and 700's is
   * `families/harmony-600-650-700/wiring.ts`; the Harmony One's `families/harmony-one/wiring.ts`.
   */
  readonly wiring: { check(c: Container): WiringChecked };
  /**
   * How the family's font sets become our letters: the Harmony 600, 650 and 700's nine faces, measured on the
   * 650 alone, `families/harmony-600-650-700/fonts.ts`; the Harmony One's five, `families/harmony-one/fonts.ts`.
   */
  readonly fonts: FamilyFonts;
  /**
   * How the family's commands are sent: the Harmony 600, 650 and 700's delay prelude,
   * `families/harmony-600-650-700/sends.ts`, and the Harmony One's send and quantity alone, `families/harmony-one/sends.ts`.
   */
  readonly sends: SendShape;
  /**
   * The shape of an activity's start: the Harmony 600, 650 and 700's, `families/harmony-600-650-700/start.ts`, and the
   * Harmony One's, `families/harmony-one/start.ts`.
   */
  readonly activityStart: ActivityStart;
  /**
   * What composing an activity changes in the family's own wiring, asked before anything is built with the key
   * the activity goes on: undefined where nothing changes, or what rebuilds the finished configuration's
   * wiring. On the Harmony 600, 650 and 700 the first activity, or one put on an empty key, changes scan 4's
   * front list and the empty keys' own. Absent on the Harmony One, whose wiring an activity leaves.
   */
  activityRewiring?(c: Container, activityKey: string | undefined): ((bytes: Uint8Array) => Uint8Array) | undefined;
  /**
   * The copies of a device's inline power on delay that a key reaches besides the `0x7C` in its `Power` variable's
   * switch on list, each as a list and an instruction's place in it, which `setPowerOnDelay` changes along with
   * that one. The Harmony 300 and 350's Watch TV keeps its own copy for a device with one power code,
   * `families/harmony-300-350/delay.ts`. Absent where the switch on list is the only copy: the
   * Harmony One's activities reach a device's delay through its variable, and the Harmony 600, 650 and 700 keep the
   * delay as a stored setting, `setPowerOnDelayVariable`.
   */
  powerOnDelayCopies?(c: Container, group: number): readonly { readonly list: number; readonly at: number }[];
  /** The commands a mode's pages show, page by page in this family's item order, with each one's drawn label. */
  screenItems(c: Container, mode: number): DeviceScreenItem[];
  /** Whether an item is drawn the way this family draws a command called `name`. */
  drawsName(c: Container, item: DeviceScreenItem, name: string): boolean;
  /** A device's own screen: its page or pages, `composeDeviceScreen`. */
  composeDeviceScreen(c: Container, label: string, rows: readonly ComposeRow[], options: WithChoices<ComposeScreenOptions, Choices>): ComposedScreen;
  /**
   * The activity menu's mode, or undefined where the configuration has none this family can find. How a
   * family finds it differs: by structure on the four slot screens, by its rows on the touch
   * screens.
   */
  activityMenu(c: Container): number | undefined;
  /**
   * The menu marker as a writer other than a menu row names it, or undefined where the family has none
   * measured, which `menuMarkerOf` holds to the rows' answer: on the four slot screens the list the press of
   * More Activities runs from base slot 9 entry 1 writes it 0 first.
   */
  menuMarkerWriter(c: Container): number | undefined;
  /** A row on the activity menu, once the shared prelude has found the menu and its marker. */
  composeActivityRow(
    c: Container, label: string, set: number, menu: number, marker: Instruction, options: WithChoices<ComposeActivityRowOptions, Choices>,
  ): ComposedActivityRow;
  /**
   * The device list an activity's Devices key opens, given after the activity has its row: one of the activity's
   * own on both families, every device with those its start switches on first, `startSwitchedOn`; the Harmony 600,
   * 650 and 700's `composeActivityDeviceList`, and the Harmony One's `withOneActivityDeviceList`. Returns the configuration's bytes.
   */
  activityDeviceList(c: Container, activity: number): Uint8Array;
  /** An activity's working screen, `composeActivityScreen`. */
  composeActivityScreen(
    c: Container, activity: number, label: string, rows: readonly ComposeRow[], options: WithChoices<ComposeActivityScreenOptions, Choices>,
  ): ComposedActivityScreen;
  /**
   * The family's look over a setup composed onto a Logitech compile, `composeSetup`, where it has one: the donor
   * lettered in ours before anything is composed, and the rest over the composed file. Absent, the composed
   * file keeps the donor's look. The Harmony One has one.
   */
  readonly composedLook?: {
    letterDonor(c: Container, choices: Choices): { readonly bytes: Uint8Array; readonly faces: readonly SetFace[] };
    /**
     * The faces of a donor of ours, an empty configuration of the family's, which is in our letters already and is
     * not lettered again; undefined for a Logitech compile. Refuses a donor of ours that is blended, since the look's
     * blending runs once, over the composed file. The Harmony One has one. Absent, every donor is lettered.
     */
    donorOfOurs?(c: Container, choices: Choices): readonly SetFace[] | undefined;
    /**
     * The look over the composed file, with the copies of each set its blending made, `withBlendedLetters`, so
     * that a reader of the result can point a blended select back at the set it was blended from,
     * `unblendedSelects`; empty where the look blends nothing.
     */
    look(c: Container, faces: readonly SetFace[], choices: Choices, deviceType: (name: string | undefined) => number | undefined):
      { readonly container: Container; readonly blended: readonly BlendedSet[] };
  };
  /**
   * The parts the family's builders make from a description over a setup composed onto a Logitech compile,
   * `composeSetup`, where it has builders for parts the donor carries: run after the composers and before the
   * look, each part described off the configuration composed so far, built, and put in place of the donor's,
   * so its bytes come out of the builder rather than out of the donor. Refuses with the builder's refusal where
   * a builder refuses the configuration, never falling back to the donor's part; returns the configuration and
   * the names of the parts built, in the order built. The Harmony One's is `families/harmony-one/builders.ts`. Absent,
   * every part no composer writes stays the donor's.
   *
   * `composed` is the devices the composers added, in the order composed: a part that asks about every device, the
   * Harmony One's power off help, has to be told which devices are new and what the catalogue states of them, which
   * the configuration does not say.
   *
   * `choices` is the family's: what a configuration of ours holds that Logitech's
   * do not, the Harmony One's welcome tour and Remote Assistant left out unless chosen, is the builders' to make.
   */
  composedBuilders?(
    c: Container, composed: readonly ComposedDeviceNote[], choices: Choices, options?: ComposedBuildersOptions,
  ): { readonly container: Container; readonly built: readonly string[] };
  /**
   * The skins `composeSetup` has been run on for this family, where it composes a setup onto a donor at all; a
   * skin outside it is refused. Absent, the family's setups are not composed that way. The Harmony One's is skin
   * 54, which a Harmony One reports.
   */
  readonly composedSkins?: ReadonlySet<number>;
  /**
   * **The configuration a recipe describes, built from nothing**: no compile of Logitech's
   * goes in, so what comes out is ours byte for byte and the same recipe, sources and stamp give the same bytes. Called
   * by `buildFromRecipe` in `families/fromrecipe.ts`, which chooses the family by the recipe's model; the family reads
   * its own part of the recipe and its choices, and refuses what it does not build. Absent where the family builds
   * nothing from a recipe yet, the Harmony 880 and 885's.
   */
  readonly fromRecipe?: (recipe: Recipe, skin: number, sources: RecipeSources) => Uint8Array;
  /**
   * **Why the build from `recipe` refuses a name it draws**, in the builder's own sentence, or undefined where it draws
   * it: a device's on its row or label, an activity's on its start up screen. Asked by the toolkit's `check`, so a
   * document a build refuses for a name is listed before the build, `name-not-drawable`; answered by the family's own
   * judgement on the configuration a build of `recipe` starts from, never by a copy of its rule. **Optional**: a family
   * whose build refuses no name, or whose judgement is not stated yet, leaves it out, and `check` says nothing.
   */
  readonly nameRefusal?: (recipe: Recipe, skin: number, owner: 'device' | 'activity', name: string) => string | undefined;
  /**
   * A recipe's choices over the family's defaults, checked: what `composeSetup`
   * composes with when a recipe states choices, so a recipe's look reaches every builder the setup runs. Refuses a
   * choice the family does not make. Absent where the family's setups are not composed by `composeSetup`.
   */
  readonly readChoices?: (given: Readonly<Record<string, unknown>>) => Choices;
}
```

Uses [`CommonChoices`](#commonchoices), [`FamilyTraits`](#familytraits), [`HardKey`](#hardkey), [`ActivityKeyRules`](#activitykeyrules), [`ActivityKeyEditor`](#activitykeyeditor), [`RecipeKeyBuilder`](#recipekeybuilder), [`FamilyMaps`](#familymaps), [`FamilySettings`](#familysettings), [`StateTableFacts`](#statetablefacts), [`Container`](config.md#container), [`WiringChecked`](#wiringchecked), [`FamilyFonts`](#familyfonts), [`SendShape`](#sendshape), [`ActivityStart`](#activitystart), [`DeviceScreenItem`](#devicescreenitem), [`ComposeRow`](#composerow), [`WithChoices`](#withchoices), [`ComposeScreenOptions`](#composescreenoptions), [`ComposedScreen`](#composedscreen), [`Instruction`](#instruction), [`ComposeActivityRowOptions`](#composeactivityrowoptions), [`ComposedActivityRow`](#composedactivityrow), [`ComposeActivityScreenOptions`](#composeactivityscreenoptions), [`ComposedActivityScreen`](#composedactivityscreen), [`SetFace`](#setface), [`BlendedSet`](#blendedset), [`ComposedDeviceNote`](#composeddevicenote), [`ComposedBuildersOptions`](#composedbuildersoptions), [`Recipe`](config.md#recipe), [`RecipeSources`](#recipesources).

### `FamilyFonts`

```ts
interface FamilyFonts {
  /** The faces of ours the family's sets are lettered in, `lettering.ts`'s `OXANIUM_FACE_SPECS`, in the family's order. */
  readonly faces: readonly OxaniumFaceName[];
  /**
   * The face of ours a set measured so is lettered in, or why none of the family's faces fits it, which the
   * font table refuses with. A reason and not a throw, so a family's module needs nothing of the font table's
   * but its types.
   */
  faceOf(set: SetMeasurement): FaceOrRefusal;
  /**
   * Whether two sets may point at one glyph, which needs the firmware's text routine read to find a glyph from
   * its own set's pointer alone.
   */
  readonly sharesGlyphs: boolean;
  /** Why the font table is not built for a configuration of this family in `skin`, or undefined where it is. */
  refusal(skin: number): string | undefined;
}
```

How a family's font sets are lettered in our letters, `withOxaniumFonts`: the shared font table measures each
of Logitech's sets the same way on every family and asks this which face of ours it becomes, whether two sets
may point at one glyph, and whether the family's faces were measured on the configuration's skin at all.

Uses [`OxaniumFaceName`](#oxaniumfacename), [`SetMeasurement`](#setmeasurement), [`FaceOrRefusal`](#faceorrefusal).

### `FamilyMaps`

```ts
interface FamilyMaps {
  /** Every place of the model of `skin`, bound or not, in the family's order. */
  places(skin: number): readonly MapPlace[];
  /**
   * The commands of a document's device in its definition's order, each with whether the family carries it. The
   * definition comes from `catalogue`, which a caller makes from the document's carried definitions over any archive,
   * `carriedCatalogue`; the device is given whole, so a person's own code for a command can count as well.
   */
  commands(device: RecipeDevice, catalogue: CatalogueSource): readonly MapCommand[];
  /** A device's default map, from its commands. */
  deviceMap(commands: readonly MapCommand[]): DeviceMap;
  /** An activity's default map, from its type, its devices' roles and its devices' **default** maps, `deviceOf`. */
  activityMap(activity: MapActivity, deviceOf: (device: string) => MapDeviceView): ActivityMap;
  /**
   * **Why the family's build refuses a person's choice on a place it has**, in a sentence a person reads, or undefined
   * where it takes it. Asked only of a choice the places already allow, a place the owner binds and a press it has,
   * since those are judged once for every family by `places`; this is for what a family refuses beyond them, such as
   * a command its screen draws on no key. The toolkit's `setKey` and `check` ask it, so a choice is refused where it is
   * made and listed in a document that holds one, rather than met first at the build. **Optional**: a family whose
   * build takes every choice its places allow states none.
   */
  refusedChoice?(skin: number, choice: MapChoice): string | undefined;
  /**
   * **The screens an activity of the family's can open on**, by the words a document states them in,
   * `RecipeActivity.opensOn`: the toolkit holds a person's choice to these where it is made and its check holds a
   * document to them, so a word the model lacks is refused as not on this model rather than met first at the build.
   * **Optional**: a family stating none has not named its screens yet, and a choice of one is not built there, which is
   * not the same as a model without the choice.
   */
  readonly openingScreens?: readonly string[];
  /**
   * **Which of `activities` holds the favourite channels by the family's own rule**, its index, or -1 where none does:
   * the one the build gives them to. The toolkit asks it to tell a person who holds them once the activity holding them
   * is switched off. **Optional**: a family whose build reads no hold on the favourites leaves it out, and
   * then the hold is the one a document states.
   */
  favouritesHolder?(activities: readonly RecipeActivity[]): number;
}
```

**The maps a family carries**. Four members, each pure: the same inputs give the same answer, and none
reads a container or a document of a remote, so the questions can ask them with nothing attached.

Uses [`MapPlace`](#mapplace), [`RecipeDevice`](config.md#recipedevice), [`CatalogueSource`](config.md#cataloguesource), [`MapCommand`](#mapcommand), [`DeviceMap`](#devicemap), [`MapActivity`](#mapactivity), [`MapDeviceView`](#mapdeviceview), [`ActivityMap`](#activitymap), [`MapChoice`](#mapchoice), [`RecipeActivity`](config.md#recipeactivity).

### `FamilySetting`

```ts
interface FamilySetting {
  readonly name: string;
  readonly takes: SettingKind;
  readonly default: boolean | number;
}
```

One setting a family's build writes: its name, the kind of value it takes, and what the build writes unstated.

Uses [`recipe.SettingKind`](config-recipe.md#recipesettingkind).

### `FamilySettings`

```ts
interface FamilySettings {
  /** Every setting the build writes, in the order it writes them. */
  readonly rows: readonly FamilySetting[];
  /**
   * The settings the remote has and the build does not write yet, by name, each with the requirement it waits on: a
   * document stating one is not built, where a name in neither list is a setting the model does not have.
   */
  readonly notBuilt: Readonly<Record<string, number>>;
  /**
   * Why the build refuses `value` for the row `name`, in the build's own words, or undefined where it takes it.
   * Asked only of a name in `rows`.
   */
  refusedValue(name: string, value: RecipeSetting): string | undefined;
}
```

What a family states about the settings a document may hold, the module header.

Uses [`FamilySetting`](#familysetting), [`RecipeSetting`](config.md#recipesetting).

### `FamilyTraits`

```ts
interface FamilyTraits {
  /** A screen item's list opens with the beeper, as every menu row of the Harmony One does. */
  readonly screenItemsBeep: boolean;
}
```

The ways a family's action lists differ from another's that the shared composers have to know about,
read off Logitech's compiles of each family. Data and not code, so a shared composer asks a question
of its family rather than testing which remote it is for.

### `FrameCarrier`

```ts
type FrameCarrier = 'mark' | 'space';
```

Which half of a mark and space pair carries the bit.

### `FrameShape`

```ts
interface FrameShape {
  readonly timings?: FrameTimings | undefined;
  readonly biphase?: BiphaseTimings | undefined;
  readonly cells?: CellTimings | undefined;
  /**
   * The **other** rhythms this family sends, for a block whose copies are not all one shape.
   * One repetition of `Classe 16 Bit Toggle` is four mode bits at a 442 microsecond half
   * cell, one bit at 880 and sixteen data bits at 442, so three of Logitech's segments with three
   * different cells go out back to back and a block naming one shape can only send a third of it. A
   * copy item's `shape` indexes this list, offset by one because index 0 is this shape.
   *
   * Deliberately a list on the shape rather than a list of shapes in the signature: every existing
   * caller has one rhythm, and a family with several is the exception rather than the general case.
   */
  readonly also?: readonly FrameShape[] | undefined;
}
```

The rhythm a family sends a frame in: one of the three kinds, never two.

All three fields are optional and all three accept an explicit `undefined`, which is not laxness: the
reader that produces one of these answers for whichever kind the family has and `undefined` for the
others, so a caller passing all three through is the normal case rather than a mistake.

Uses [`FrameTimings`](#frametimings), [`BiphaseTimings`](#biphasetimings), [`CellTimings`](#celltimings).

### `FrameTimings`

```ts
interface FrameTimings {
  /**
   * The header: a mark, and the space between it and the first bit.
   *
   * **`[0, 0]` means the protocol has none**, which is not a tidy sentinel but the only shape some
   * families come in: the Sharp scheme opens on its first bit with no lead in at all, so a table
   * entry for it has to be able to say so. A decoded record never carries it, because a duration
   * read off a config is a real pulse and therefore positive.
   */
  header: readonly [number, number];
  /** The half of every pair that carries no bit, and is one length throughout. */
  flat: number;
  /** The carried half's length for a zero bit, and for a one bit. */
  zero: number;
  one: number;
  carries: FrameCarrier;
  /**
   * The mark that opens the frame, where it is not the same length as every later one.
   *
   * **Measured, not a tolerance.** Every Sharp record in the configuration Logitech's own compiler
   * produced opens on a mark of 270 microseconds and then uses 260 for all fourteen remaining bit
   * cells, and it does so again after each inter frame gap. Without somewhere to put that, the half of
   * a pair that has to be constant is not constant and a strict reader refuses the record, which is
   * what kept the whole Sharp family out of the table.
   */
  firstMark?: number;
  /**
   * The cell states its carried half **first**, so a pair goes out as (carried, constant).
   *
   * **Almost no family needs this and the reason is worth keeping.** Logitech's notation states plenty
   * of families cell by cell as (space, mark) where our table stores (mark, space), and for 32 of the 37
   * such families the **wire is the same either way**: the family's own header is a lone mark of exactly
   * the constant length, so it is the first constant half, and after it the train is one alternating
   * chain whichever end you name it from. `JVC 16 Bit` is that case and its measured row, taken off a
   * real remote's configuration, is in the (mark, space) spelling.
   */
  carriedFirst?: boolean;
  /**
   * The mark of a **set** cell, where the mark's length rides with its own cell's bit.
   *
   * **Three families carry two (mark, space) pairs instead of one flat**: every set cell
   * is one pair and every clear cell the other, perfectly correlated, so the "constant" half is a
   * function of the bit. `Panasonic 16 Bit` sends a clear bit as 521 with 1575 and a set bit as 525
   * with 527, `MemorexV2 32 Bit Dual` as 594 with 1725 against 560 with 594, and `Sharp 48 Bit` as
   * 409 with 1304 against 410 with 434. A reader demanding one flat length refused all three, which
   * kept 29 catalogue commands out of reach. It is accepted **only on perfect correlation**: a mark
   * that varies within one space cluster is still a wobbling flat and still a refusal. `flat` stays
   * the clear cell's mark, and this field is the set cell's.
   */
  oneMark?: number;
  /**
   * The space that closes the last pair, where the bit is in the mark.
   *
   * **A pulse width frame's last space is a trailing gap and not a bit cell**, and reading it as one is
   * what made 200 records of the corpus look as though their timings did not split: 112 of twelve bits
   * and 88 of fifteen, all of them in the two configurations Logitech compiled to our own
   * specification, all with two values in the half that is supposed to be constant. The second value
   * was always the last one. So it is one number more for that convention and not a defect, and it is
   * absent for a pulse distance frame, where the last space is an ordinary bit. **A sectioned frame
   * states it too**, because its last bit lives inside the closing silence, see `sections`.
   */
  closing?: number;
  /**
   * The frame is one value sent in sections, this many bits each, and the last bit of every section is
   * carried by a structural space rather than by an ordinary cell.
   *
   * **Measured on `Samsung 38 Bit`, and it is what "38 Bit" turns out to mean**: one
   * header, sixteen bit cells, a 4470 space, twenty one more cells whose last is swallowed by the
   * closing silence. 17 + 21 = 38, the catalogue states the two section values separately, and reading
   * the 4470 space as section one's final set bit lands all 35 records of the compiled sample on their
   * stated pairs exactly. So a non final section's last bit is emitted as `sectionSpace` and the final
   * section's as `closing`, and both must be **set** bits: every stated value of the family is odd, in
   * both sections, so a frame whose section ends in a zero has never been seen and is refused rather
   * than invented.
   */
  sections?: readonly number[];
  /** The space carrying a non final section's last set bit. Present exactly when `sections` is. */
  sectionSpace?: number;
}
```

The durations a frame is built out of, in microseconds. They come off the record rather than out of a protocol
table: a stored record states its own timings, so nothing here has to know what a Panasonic or an NEC frame looks
like in order to write one. What it cannot do is invent them: Logitech's catalogue states a protocol family and a
frame value and no durations, so the timings come from a record of the same family that a configuration holds.

Uses [`FrameCarrier`](#framecarrier).

### `GESTURE_KEYS`

```ts
const GESTURE_KEYS = ['SwipeUp', 'SwipeDown', 'SwipeLeft', 'SwipeRight', 'Tap'] as const
```

**The gestures a map of ours may hold**: the five Logitech's documents put on each activity but the Custom one,
`activities-and-buttons.md`, "Gestures". The screens also name held and released gestures, `SwipeUpHold` and the
like, and index a table that has no entry for some of them with a long press, read in the screens' firmware; no
document measured holds one, so they are refused.

### `HardKey`

```ts
interface HardKey {
  readonly scan: number;
  readonly button: string;
  readonly prefer: readonly string[];
  /**
   * Commands taken after `prefer`, each only where no other key of the device sends it already: the
   * Harmony One's scan 13 takes Enter on two catalogue devices and nothing on the three whose Guide or
   * Select key sends Enter, which no preference list can say.
   */
  readonly ifFree?: readonly string[];
}
```

One hard key a device mode binds: its scan, the key as printed, and the catalogue commands it takes **in
order of preference**: the first the device has is the one bound, and a key none of whose candidates the
device has is bound to nothing. Each family states its own table, [`Family.deviceModeKeys`](#family).

### `Instruction`

```ts
interface Instruction {
  readonly operand: number;
  readonly opcode: number;
}
```

One action list instruction: a 16 bit operand and an opcode byte. Opcode meanings are not
established. The opcodes in use differ per model: the Harmony 600, 650 and 700 lean on opcodes
that no Harmony 525 configuration uses.

### `Json`

```ts
type Json = Record<string, unknown>;
```

### `KeyRecord`

```ts
class KeyRecord {
  readonly indexInTable: number;
  readonly eventCode: number;
  readonly index: number;
  readonly flags: number;
  constructor(indexInTable: number, eventCode: number, index: number, flags: number);
  /** `EVENT_PRESS`, `EVENT_RELEASE`, `EVENT_REPEAT`, or `EVENT_NONE`. */
  get eventType(): number;
  get eventName(): string;
  /**
   * The keypad scanner's own linear index, or a virtual event's number. On the Harmony 600, 650 and
   * 700 these run 1 to 54 within the scanner's range of 1 to 56.
   */
  get scanCode(): number;
  /** False for the handful of codes that carry no event bits at all. */
  get isKeypad(): boolean;
}
```

One LWJL entry.

### `LaidDeviceSends`

```ts
interface LaidDeviceSends {
  /** The lists from the first of the device's on: one send list per send in their order, then the family's own. */
  readonly bodies: readonly Writer[];
  /** The first list after them, where the shared composer lays out the power actions' own lists. */
  readonly next: number;
  /** The list the power variable runs to switch the device on, or undefined where it runs the on action itself. */
  readonly switchOn: number | undefined;
  /**
   * The family's own fields of `ComposedDevice`, read off the configuration once the power variable went in and
   * renumbered whatever sits above it: the four slot family's two delays, nothing on the One family.
   */
  described(named: Container): Pick<ComposedDevice, 'delay' | 'powerOnDelay'>;
}
```

A device's lists as its family's send lays them out, [`DeviceSends.lay`](#devicesends).

Uses [`Writer`](#writer), [`Container`](config.md#container), [`ComposedDevice`](#composeddevice).

### `Lettering`

```ts
type Lettering = 'shadowed' | 'plain';
```

The two colourings a letter is drawn in.

### `LetterInks`

```ts
interface LetterInks {
  readonly shadowed: number;
  readonly plain: number;
  readonly shadow: number;
}
```

The colours our letters are drawn in, as RGB565: the ink of a shadowed letter, the ink of a plain one, and
the shadow. Which colours is a choice, the family's, `FourSlotChoices.letterInks`;
nothing that reads our letters back depends on them, since `letterForm` and the structure a
blended letter keeps read where a letter's ink and shadow are rather than what colour they are.

### `LineEnding`

```ts
type LineEnding = 'crlf' | 'lf' | 'cr' | 'none';
```

How the header's last line ended, or `none` when the terminator sits at end of file.

### `ListBody`

```ts
type ListBody = readonly (readonly [operand: number, opcode: number])[];
```

One action list as its instructions, `[operand, opcode]` each, the form `appendActionLists` takes.

### `MapActivity`

```ts
interface MapActivity {
  readonly type: string;
  readonly devices: readonly { readonly device: string; readonly roles: readonly ActivityRoleName[] }[];
}
```

An activity as a default map is derived from it: Logitech's type, and its devices by name with their roles.

Uses [`ActivityRoleName`](config.md#activityrolename).

### `MapBinder`

```ts
type MapBinder = 'device' | 'activity' | 'both' | 'remote';
```

Whose map can bind a place: a device's own, device mode's, an activity's, or both; or `remote`, neither, where no
device's or activity's map binds the place and the configuration binds it outside those maps, as the Harmony One's
Off key and the keys around its screen are, [`reference/architectures/harmony-one/compiler.md`](../../architectures/harmony-one/compiler.md). `resolveMaps` answers
a `remote` place for no owner, since no owner's map says what it does; `places` still lists it, with `built` false and
why.

### `MapChoice`

```ts
interface MapChoice {
  /** Whose map it is in, and the words for it in a sentence: `activity Watch TV`, `LG TV's own map`. */
  readonly owner: 'device' | 'activity';
  readonly what: string;
  readonly key: string;
  readonly press: RecipePress;
  /** A command of a device by the device's name in the document, a sequence by its name, or nothing. */
  readonly action: RecipeKeyAction;
  /**
   * The commands a device of the document has by its name: its definition's and those the document adds, or undefined
   * where neither the document nor a source given says, in which case a family judges nothing it would need them for.
   */
  readonly commandsOf: (device: string) => readonly string[] | undefined;
}
```

One choice of a key as [`FamilyMaps.refusedChoice`](#familymaps) is asked about it, in the document's words.

Uses [`RecipePress`](config.md#recipepress), [`RecipeKeyAction`](config.md#recipekeyaction).

### `MapCommand`

```ts
interface MapCommand {
  readonly name: string;
  readonly carried: boolean;
}
```

One command of a device's definition as the family answers it, [`FamilyMaps.commands`](#familymaps): its name, and whether the
family carries it, that is whether a configuration of the family can send it. A command the family cannot carry is
still listed, since a default map is laid out over every command and one left out leaves its place to the next.

### `MapDeviceView`

```ts
interface MapDeviceView {
  readonly commands: readonly MapCommand[];
  readonly map: DeviceMap;
}
```

One device of an activity as the activity's rule reads it: its commands and its own default map.

Uses [`MapCommand`](#mapcommand), [`DeviceMap`](#devicemap).

### `MapPlace`

```ts
interface MapPlace {
  /** Logitech's word for the key, as the model's drawing names it. */
  readonly key: string;
  readonly surface: MapSurface;
  /** The presses this place has on this model, the short press first. */
  readonly presses: readonly RecipePress[];
  readonly boundBy: MapBinder;
  readonly built: boolean;
  /** Why a person's choice is not built on it, where `built` is false. */
  readonly why?: string;
}
```

One place of a model, [`FamilyMaps.places`](#familymaps): its word, where it is, the presses it has, whose map binds it, and whether
the family builds a choice on it. A place that is on the remote and takes no choice, a key a model's own screens
bind, is listed with `built` false and the reason, so an application can show it and say why it cannot be changed.

Uses [`MapSurface`](#mapsurface), [`RecipePress`](config.md#recipepress), [`MapBinder`](#mapbinder).

### `MapScreenEntry`

```ts
type MapScreenEntry =
  | RecipeScreenCommand
  | { readonly sequence: string; readonly label?: string }
  | { readonly label: string; readonly client: string };
```

One entry of an activity's or a resolved screen list: a device's command, one of the activity's sequences by its
name, or an entry the remote acts on itself.

Uses [`RecipeScreenCommand`](config.md#recipescreencommand).

### `MapSurface`

```ts
type MapSurface = 'keypad' | 'pad' | 'gesture' | 'touch';
```

Where a place is on the remote: the keypad's keys, the number pad a screen draws, a gesture on a touch surface, or a
touch key, a key of a touch panel beside a screen, such as the Harmony One's page strips at each side of its screen
and the two keys below it, which its drawing and [`reference/remotes/harmony-one/keys.md`](../../remotes/harmony-one/keys.md) call touch keys.
A pad place is a key all the same, named as the keypad's digits are, so one choice of a key works on a model whose
digits are keys and on one whose digits are drawn.

### `ModePage`

```ts
interface ModePage {
  /** The page record's own address, as the entry's pointer array holds it. */
  address: number;
  /** The Harmony One's byte in front of the two pointers, absent elsewhere. */
  lead: number | undefined;
  /** A tagged list, in the same encoding the mode record's list uses. */
  list: number;
  /** A screen program, stated rather than computed. */
  program: number;
  length: number;
}
```

One page of a mode: a tagged list of its own and the screen program that draws it.

The firmware looks a tag up in `list` first and falls back to the mode record's list when it
finds nothing, so a page overrides rather than replaces. `program` goes straight to the screen
interpreter, `0x1879C` on the Harmony 600, 650 and 700 and `0x295AC` on the Harmony One.

### `OwnActivity`

```ts
interface OwnActivity {
  /** Ours, `OWN_IDS`; also what its map is named by. */
  readonly id: number;
  readonly name: string;
  readonly type: ActivityTypeName;
  readonly startScreen: (typeof ACTIVITY_START_SCREENS)[number];
  /** Its place on the activity list, 0 the first; after the last activity listed when absent. */
  readonly order?: number;
  readonly devices: readonly OwnActivityDevice[];
  readonly enter?: readonly OwnActivityStep[];
  readonly leave?: readonly OwnActivityStep[];
  readonly keys?: Readonly<Partial<Record<TouchButtonKey, OwnActivityKey>>>;
  readonly entries?: readonly OwnActivityEntry[];
  /** Whether the favourite channels belong to this activity, `IsTuningDefault`; false when absent. */
  readonly tuningDefault?: boolean;
  /**
   * The map's buttons in the ordered form, in place of `keys` and `entries`, with gestures and sequences. The
   * two forms are not mixed: a description gives one or the other.
   */
  readonly buttons?: readonly OwnButton[];
  readonly sequences?: readonly OwnSequence[];
}
```

An activity as a person describes it: its name and type, the devices it uses and what each does, the steps added
at its start and end, and what its keys and its screen list send. Every device and command is named as the
documents name it, so the composer can find each and refuse what it cannot.

Uses [`ActivityTypeName`](#activitytypename), [`ACTIVITY_START_SCREENS`](#activity_start_screens), [`OwnActivityDevice`](#ownactivitydevice), [`OwnActivityStep`](#ownactivitystep), [`TouchButtonKey`](#touchbuttonkey), [`OwnActivityKey`](#ownactivitykey), [`OwnActivityEntry`](#ownactivityentry), [`OwnButton`](#ownbutton), [`OwnSequence`](#ownsequence).

### `OwnActivityCommand`

```ts
interface OwnActivityCommand {
  readonly device: string;
  readonly command: string;
}
```

A command to a device of the documents, named as the device names it, matched without regard to case.

### `OwnActivityDevice`

```ts
interface OwnActivityDevice {
  readonly device: string;
  /** Its roles, in the order written; the first makes its power on and input steps, the rest add their kind. */
  readonly roles: readonly ActivityRoleKind[];
  /** Its place in the power on order, and in the power off order; unique within the activity. */
  readonly powerOn: number;
  readonly powerOff: number;
  /** The input it is switched to, by the name its input feature gives it; none when absent. */
  readonly input?: string;
}
```

A device of an activity, by the name the device list shows, and what the activity does with it.

Uses [`ActivityRoleKind`](#activityrolekind).

### `OwnActivityEntry`

```ts
interface OwnActivityEntry extends OwnActivityCommand {
  readonly label: string;
}
```

An entry of the activity's command list: the label the screen shows and the command a tap sends.

Uses [`OwnActivityCommand`](#ownactivitycommand).

### `OwnActivityKey`

```ts
interface OwnActivityKey extends OwnActivityCommand {
  readonly longPress?: OwnActivityCommand;
}
```

A key of the activity's map: the command its press sends, and its long press when one is wanted.

Uses [`OwnActivityCommand`](#ownactivitycommand).

### `OwnActivityStep`

```ts
type OwnActivityStep = (OwnActivityCommand | { readonly delaySeconds: number } | { readonly device: string; readonly channel: string })
  & { readonly order?: number };
```

A step added by hand to an activity's start or end: a command, a pause in whole or part seconds, or a channel
tuned through a device. `order` is the step's `ActionOrder`; its place in the list counting from 1 when absent.
The engine sorts the steps by it, `orderTableItems`, so only the order matters, and Logitech's client numbers
them in a way of its own, Switch Box's start from 4, which a description may keep.

Uses [`OwnActivityCommand`](#ownactivitycommand).

### `OwnButton`

```ts
interface OwnButton {
  readonly key?: TouchButtonKey;
  readonly gesture?: TouchGestureKey;
  readonly entry?: string;
  readonly index?: number;
  readonly group?: number;
  readonly press: OwnPress;
  readonly longPress?: OwnPress;
  readonly doublePress?: OwnPress;
}
```

**A button in the ordered form**: a key, a gesture or a screen entry, each in the place the
description gives it, so a map comes out with its buttons in the order Logitech's has them. One of `key`, `gesture`
and `entry` names the button; `entry` is the label the screen shows, and `index` its `IndexInMenu`, which the
description states, a repeated one included. `group` is the `FunctionGroupType`, 0 when absent.

Uses [`TouchButtonKey`](#touchbuttonkey), [`TouchGestureKey`](#touchgesturekey), [`OwnPress`](#ownpress).

### `OwnCode`

```ts
type OwnCode =
  | { readonly kind: 'stated'; readonly protocol: IrProtocol; readonly keyCode: string }
  | { readonly kind: 'raw'; readonly raw: string };
```

How a command of ours is sent: a family's definition and a key code, or a learned raw code.

Uses [`harmonyTouch.IrProtocol`](config-harmony-touch.md#harmonytouchirprotocol).

### `OwnCommand`

```ts
interface OwnCommand {
  /** What the engine finds the command by, case blind, and what a key's action names. */
  readonly name: string;
  /** What the screen list shows, `TextOnRemote`; the name when absent. */
  readonly label?: string;
  readonly code: OwnCode;
  /** Whether it goes on the device's screen list. True when absent. */
  readonly onScreen?: boolean;
}
```

Uses [`OwnCode`](#owncode).

### `OwnContext`

```ts
type OwnContext = { readonly [field in ContextFieldRead]: unknown };
```

A Context description: the seven fields read, each as the document states it. It holds the account's identifiers, so it is kept with the user's data and never in a document.

Uses [`ContextFieldRead`](#contextfieldread).

### `OwnDevice`

```ts
interface OwnDevice {
  /** Ours, and unique among the devices of the documents it goes into; also what its map is named by. */
  readonly id: number;
  readonly name: string;
  readonly manufacturer: string;
  readonly model: string;
  /** Logitech's device type number, `reference/logitech/data-model/`; the caller's to choose. */
  readonly deviceType: number;
  /** How many times a press repeats the code; the engine's own 3 when absent, `DEFAULT_PRESS_REPEATS`. */
  readonly pressRepeats?: number;
  /** The wait after a command before the next one to this device, when commands go as a list. */
  readonly interKeyDelayMs: number;
  /** The silence this device needs after another device's last command. */
  readonly interDeviceDelayMs: number;
  readonly commands: readonly OwnCommand[];
  /** Which key sends which command, by the Touch's key names. */
  readonly keys?: Readonly<Partial<Record<TouchButtonKey, OwnKey>>>;
}
```

Uses [`OwnCommand`](#owncommand), [`TouchButtonKey`](#touchbuttonkey), [`OwnKey`](#ownkey).

### `OwnFavourites`

```ts
interface OwnFavourites {
  /**
   * Channels of the provider's line up to add, each by its number there, added as the remote's add screen adds
   * a channel it offers: the station alone, at the end of the user's list.
   */
  readonly add?: readonly string[];
  /** Every favourite once, the ones added included, by its channel number, in the order the screen is to show them. */
  readonly order: readonly string[];
  /** Logos of ours: a favourite by its channel number, and the text drawn on its picture. */
  readonly logos?: readonly { readonly channel: string; readonly text: string }[];
}
```

A favourites description, as `packages/remote/touch-favourites/` holds them.

### `OwnKey`

```ts
interface OwnKey {
  readonly press: string;
  readonly longPress?: string;
}
```

A key of the device's map: the command its press sends, and its long press when one is wanted.

### `OwnPicture`

```ts
interface OwnPicture {
  readonly uri: string;
  readonly png: Uint8Array;
}
```

One picture of ours: the address the remote asks for it at, and the PNG file.

### `OwnPress`

```ts
type OwnPress = OwnActivityCommand | { readonly sequence: string } | { readonly client: TouchClientAction };
```

What a button of the ordered form does: a command to a device of the documents, a sequence of the same map by its
name, or a client action the screens act on.

Uses [`OwnActivityCommand`](#ownactivitycommand), [`TouchClientAction`](#touchclientaction).

### `OwnSequence`

```ts
interface OwnSequence {
  readonly id: number;
  readonly name: string;
  readonly steps: readonly (OwnActivityCommand | { readonly delaySeconds: number })[];
}
```

A sequence of a map: its id, ours, its name, and its steps, commands and pauses in whole or part seconds.

Uses [`OwnActivityCommand`](#ownactivitycommand).

### `OwnSettings`

```ts
interface OwnSettings {
  readonly values: Readonly<Record<string, string>>;
}
```

A Settings description, as `packages/remote/touch-settings/` holds them: rows by name, each its new first value.

### `OXANIUM_FACE_SPECS`

```ts
const OXANIUM_FACE_SPECS = {
  F15: { what: 'bold 15, corner labels and menu rows', cell: 15, baseline: 11, lead: 1, weight: 'SemiBold', px: 14, space: 4,
    rows: { cap: 10, x: 8, ascender: 11, descender: 3 } },
  F14W: { what: 'bold 14 wide, corner labels', cell: 14, baseline: 10, lead: 1, weight: 'SemiBold', px: 13, space: 4,
    rows: { cap: 10, x: 7, ascender: 10, descender: 3 } },
  F14: { what: 'bold 14, titles, counter, bottom words, corner labels', cell: 14, baseline: 10, lead: 0, weight: 'SemiBold', px: 12, space: 3,
    rows: { cap: 9, x: 7, ascender: 9, descender: 3 } },
  F13: { what: 'bold 13, corner labels', cell: 13, baseline: 9, lead: 0, weight: 'SemiBold', px: 11, space: 3,
    rows: { cap: 8, x: 6, ascender: 8, descender: 2 } },
  F11: { what: 'thin 11, corner labels', cell: 11, baseline: 8, lead: 1, weight: 'SemiBold', px: 9, space: 3,
    rows: { cap: 7, x: 5, ascender: 7, descender: 2 } },
  F10: { what: 'thin 10, corner labels', cell: 10, baseline: 7, lead: 0, weight: 'SemiBold', px: 9, space: 3,
    rows: { cap: 7, x: 5, ascender: 7, descender: 2 } },
  R15: { what: 'regular 15, firmware and status screens, Help', cell: 15, baseline: 11, lead: 1, weight: 'Regular', px: 14, space: 4,
    rows: { cap: 10, x: 8, ascender: 11, descender: 3 } },
  R14: { what: 'regular 14, start up and Off screens, Help, the tour', cell: 14, baseline: 10, lead: 1, weight: 'Regular', px: 12, space: 3,
    rows: { cap: 9, x: 7, ascender: 9, descender: 3 } },
  R13: { what: 'regular 13, Help', cell: 13, baseline: 9, lead: 0, weight: 'Regular', px: 11, space: 3,
    rows: { cap: 8, x: 6, ascender: 8, descender: 2 } },
  One16: { what: 'bold 16, the greeting', cell: 16, baseline: 12, lead: 1, weight: 'Bold', px: 14, space: 4,
    rows: { cap: 10, x: 7, ascender: 10, descender: 3 } },
  One15: { what: 'bold 15, menu rows and titles on the Harmony One', cell: 15, baseline: 11, lead: 0, weight: 'Bold', px: 12, space: 3,
    rows: { cap: 9, x: 7, ascender: 9, descender: 2 } },
  OneR15: { what: 'regular 15, Help and prose on the Harmony One', cell: 15, baseline: 11, lead: 1, weight: 'Regular', px: 12, space: 3,
    rows: { cap: 9, x: 7, ascender: 9, descender: 2 } },
  One14: { what: 'bold 14, pads and device rows on the Harmony One', cell: 14, baseline: 10, lead: 0, weight: 'Bold', px: 11, space: 3,
    rows: { cap: 8, x: 6, ascender: 8, descender: 2 } },
  One11: { what: 'bold 11, the clock and small labels on the Harmony One', cell: 11, baseline: 8, lead: 0, weight: 'SemiBold', px: 9, space: 3,
    rows: { cap: 7, x: 5, ascender: 7, descender: 2 } },
} as const satisfies Record<string, FaceSpec>
```

The faces our letters come in, one catalogue for every family: a face is a size and cut of Oxanium fitted to
rows Logitech drew on, which the shared renderer draws and the shared alphabet reads back whichever family
lettered a configuration, so it is kept here once rather than per family; which family letters in which
face is the family's, [`FamilyFonts`](#familyfonts). The first nine are one per face Logitech draws its Harmony 650 screens in, measured in
thirteen of Logitech's compiles: each one's cell height, the row its baseline
sits on, whether a glyph opens with a blank column, and the width of a space; the Oxanium cut and pixel
size whose capitals and x-height land on Logitech's rows, the weight chosen by look, Regular for the
three regular faces and SemiBold for the six label faces; and the rows its letters reach, which are the
rows the letters first drawn with Pillow reached, which the renderer fits the outlines to since that is
what Pillow's hinting did. Tunable.

### `OXANIUM_WEIGHTS`

```ts
const OXANIUM_WEIGHTS = ['ExtraLight', 'Light', 'Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold'] as const
```

The cuts of Oxanium this repository carries, lightest first, `fonts/Oxanium/static/`. Which one a face is
drawn in is a choice, `FourSlotChoices.faceWeights`; the face's size is
not, since its rows are Logitech's and the outline is fitted to them.

### `OxaniumFaceName`

```ts
type OxaniumFaceName = keyof typeof OXANIUM_FACE_SPECS;
```

Uses [`OXANIUM_FACE_SPECS`](#oxanium_face_specs).

### `OxaniumWeight`

```ts
type OxaniumWeight = (typeof OXANIUM_WEIGHTS)[number];
```

Uses [`OXANIUM_WEIGHTS`](#oxanium_weights).

### `PowerStepSpelling`

```ts
interface PowerStepSpelling {
  /**
   * Microseconds of silence in front of every power step's record, a held one included, spelt as
   * `compiledBlockWords` spells any long silence. 0 for none.
   */
  readonly leadInUs: number;
  /** The amount of the `0x7C` paired with each power step's send, in tenths of a second. */
  readonly quantity: number;
}
```

How a family spells a composed device's power steps, [`SendShape.powerStep`](#sendshape): the silence in front of each step's
record and the quantity its send list's `0x7C` carries.

### `PressCommon`

```ts
interface PressCommon {
  readonly press: RecipePress;
  /** The label a pad place draws, where the family gives one. */
  readonly label?: string;
  /**
   * True where the family derived it, false where the document chose it. **A choice equal to the default is still
   * the person's**, false: the document states it, so it stays what it is when the family's default changes later,
   * and `setKey` with `'default'` is what gives the key back to the family.
   */
  readonly isDefault: boolean;
}
```

What a press shares whatever it does: which press, the label a pad draws for it, and whether it is the default.

Uses [`RecipePress`](config.md#recipepress).

### `RawDerivedState`

```ts
type RawDerivedState =
  | { readonly state: 'absent' }
  | { readonly state: 'fresh'; readonly manifest: RawManifest }
  | { readonly state: 'stale'; readonly reason: string };
```

Whether the derived files exist and were derived from the capture `SHA256SUMS` states.

Uses [`RawManifest`](#rawmanifest).

### `RawDeviceRecord`

```ts
interface RawDeviceRecord {
  readonly id: number;
  readonly ok?: boolean;
  readonly features?: readonly RawObject[] | null;
  readonly [key: string]: unknown;
}
```

One parsed line of the capture. Only `id` and `features` are read; the rest is left alone.

Uses [`RawObject`](#rawobject).

### `RawDrivingFields`

```ts
interface RawDrivingFields {
  /** Parallel to the archive's `inputs.list`: each input's input fields. Empty when the inputs did not line up. */
  readonly inputs: readonly Readonly<Record<string, RawValue>>[];
  /** By step path, `power.onReset[0]`, every step a step field applies to, with that field's value. */
  readonly steps: ReadonlyMap<string, Readonly<Record<string, RawValue>>>;
  /** Paths where the raw list and the archive's differ, so nothing under them is attached. */
  readonly unaligned: readonly string[];
}
```

The raw half of [`catalogueRules`](config-node.md#cataloguerules)'s answer: every field of `RAW_FIELDS`, filled in, in the archive's coordinates.

Uses [`RawValue`](#rawvalue).

### `RawManifest`

```ts
interface RawManifest {
  readonly format: number;
  /** The capture the files were derived from: its file name, SHA-256 and release tag where known. */
  readonly source: { readonly file: string; readonly sha256: string; readonly release?: string };
  /** The archive build the side file was aligned against, `generated` from its manifest, and its commit. */
  readonly archive: { readonly generated: string; readonly commit?: string };
  /** The field names, in `RAW_FIELDS` order, so a side file built with another list is refused. */
  readonly fields: readonly string[];
  readonly devices: number;
  readonly blockLines: number;
  /** Anything else the derivation measured: sizes, counts, timings. Informational. */
  readonly measured?: Readonly<Record<string, unknown>>;
}
```

What `make catalogue-raw` records about a derivation, beside the files.

### `RawObject`

```ts
type RawObject = Readonly<Record<string, unknown>>;
```

### `RawValue`

```ts
type RawValue = number | boolean | string | null;
```

A scalar as the service states it.

### `RecipeAttention`

```ts
interface RecipeAttention {
  readonly happened: 'device-removed' | 'marked';
  /**
   * The device, by the name it had when it was removed: one removed has no id left to name it by, and a device added
   * later under that name is another device, so a rename never follows into this field.
   */
  readonly device?: string;
  readonly keys?: readonly RecipeAttentionKey[];
  readonly message: string;
}
```

One reason an activity needs attention, [`RecipeActivity.attention`](config.md#recipeactivity): what happened, the device it happened to by the
name it had, the keys it changed, and a sentence in English for a person. **What happened** is one of two:

* `device-removed`: a device the activity used was removed from the document;
* `marked`: an application marked it for a reason of its own, whose sentence is `message` alone.

**`keys` absent means the keys are not known**: where the model's maps are not built yet, or a device's commands
cannot be read, nothing says what the activity's keys did. **An empty list means none changed**: the activity used
the device and is marked all the same, since a removal of a device it used is worth a person's look.

Uses [`RecipeAttentionKey`](#recipeattentionkey).

### `RecipeAttentionKey`

```ts
interface RecipeAttentionKey {
  readonly key: string;
  readonly press: RecipePress;
  readonly was: RecipeKeyAction;
  readonly now: RecipeKeyAction;
}
```

One press of an activity's key whose answer the removal changed, every press of the activity and not only those that
sent the removed device's commands: what it did before, `was`, and what it does after, `now`, each nothing, a command
of a device by that device's name, or a sequence by its name. `was` records what was, a device that is gone among
it, and is never rewritten; `now` names what is, so a device named there that is renamed later is followed into it.

Uses [`RecipePress`](config.md#recipepress), [`RecipeKeyAction`](config.md#recipekeyaction).

### `RecipeDefinition`

```ts
interface RecipeDefinition {
  /** The catalogue's record of the device, as the archive's device file holds it: its codeset, power, inputs, timing. */
  readonly record: Readonly<Record<string, unknown>>;
  /** The commands of the codeset the record names, each its name and its keycode, the protocol and the numbers it sends. */
  readonly commands: readonly { readonly name: string; readonly keycode: string }[];
}
```

A device's definition carried in a recipe, [`RecipeDevice.definition`](config.md#recipedevice).

### `RecipeKeyBuilder`

```ts
interface RecipeKeyBuilder {
  /**
   * The keys a recipe may choose, by Logitech's word for each, in the family's order: the keypad's keys a device
   * mode's map and an activity's map bind on this family's remotes. A word outside it is refused, since a key the
   * keypad does not have, or one a screen binds, would build an entry nothing presses or one that takes a screen's
   * key away.
   */
  readonly keys: readonly string[];
  /** The scan code the key of that word reports on this family's remotes, or undefined for a word not in `keys`. */
  scanOf(key: string): number | undefined;
  /**
   * The configuration with device mode's own map for the device of `group` binding the press of the key named `key`
   * to `list`, or to nothing where `list` is undefined; its bytes. Refuses a word not in `keys`, a device with no
   * device mode and a key its map does not state.
   */
  bindDeviceModeKey(c: Container, group: number, key: string, list: number | undefined): Uint8Array;
}
```

What a family needs to build a recipe's key choices, [`Family.recipeKeys`](#family). The shared
composer, `composeSetupParts`, resolves each choice to a list of the configuration's, puts an activity's into the
keypad map it composes, and asks this for the rest, which is the family's: the keys there are, the number each is
bound by, and how a device mode's own map, already composed, takes another binding.

**A recipe names a key by Logitech's word for it, and the family turns the word into its own number**, [`RecipeKey`](config.md#recipekey):
the words are the same key on every model that has it, where a scan code is one family's firmware's. So the words
are what the family offers, and the scan is answered only to the shared composer, which binds an activity's keypad
map by scan as every map of a compiled configuration is bound; the toolkit and an application see words alone.

Uses [`Container`](config.md#container).

### `RecipeSources`

```ts
interface RecipeSources {
  /** When it is built, `YYYY-MM-DDTHH:MM:SS`: every stamp and clock record the configuration holds is taken from it. */
  readonly builtAt: string;
  /** Where the codes of a device the recipe names by its catalogue entry come from; absent, a recipe naming one is refused. */
  readonly archive?: CatalogueSource;
}
```

What a build from a recipe takes besides the recipe, [`Family.fromRecipe`](#family).

Uses [`CatalogueSource`](config.md#cataloguesource).

### `Region`

```ts
interface Region {
  readonly name: string;
  readonly payload: Uint8Array;
  readonly encoding: Encoding;
}
```

Uses [`Encoding`](#encoding).

### `RowCommand`

```ts
interface RowCommand {
  readonly name: string;
  readonly label?: string;
  /** The number, as the family's notation states it: hexadecimal digits after `0x`, or a whole number. */
  readonly value: string | number;
  readonly onScreen?: boolean;
}
```

A command of a device described by its family: the name, the label, and the number it sends.

### `RowDevice`

```ts
interface RowDevice extends Omit<OwnDevice, 'commands' | 'keys'> {
  /** A family of `PROTOCOLS`, by the name the table gives it. */
  readonly family: string;
  /** The id the family's definition is listed under: one of ours, `OWN_IDS`. */
  readonly protocolId: number;
  /** The width of every number, where the family's name does not state it. */
  readonly bits?: number;
  readonly commands: readonly RowCommand[];
  readonly keys?: 'by name' | Readonly<Partial<Record<TouchButtonKey, OwnKey>>>;
}
```

A device whose every command is one number of one family of our rhythm table, [`PROTOCOLS`](config.md#protocols): what a person
types for a device a Touch is to send to, with no catalogue behind it. `keys` is the map's keys, or
`'by name'` for `keysByName`'s same name rule.

Uses [`OwnDevice`](#owndevice), [`RowCommand`](#rowcommand), [`TouchButtonKey`](#touchbuttonkey), [`OwnKey`](#ownkey).

### `ScreenCase`

```ts
interface ScreenCase {
  /** The value that selects this arm, for an exact case. */
  value?: number;
  /** The inclusive bounds that select it, for a range case. */
  from?: number;
  to?: number;
  target: number;
}
```

One arm of a screen switch: the value or the range that takes it, and where it goes.

### `Section`

```ts
class Section {
  readonly slot: number;
  readonly address: number;
  /**
   * The item's leading byte, the one the three byte pointer does not use. Zero in every section
   * of every sample, so its meaning is unestablished rather than known to be padding. Parsed and
   * checked rather than skipped, because reading the item as a four byte pointer instead would
   * turn a nonzero value here into a silently wrong address.
   */
  readonly spare: number;
  constructor(slot: number, address: number, spare: number = 0);
  get isNull(): boolean;
}
```

### `Segment`

```ts
interface Segment {
  readonly Name: string | null;
  readonly Header: readonly Atom[] | null;
  /** A code segment's literal durations. Absent on an infrared segment, which states a payload instead. */
  readonly Atoms?: readonly Atom[] | null;
  readonly Payload: {
    readonly Encodings: readonly Encoding[] | null;
    /**
     * The segment's own width, set on all 884 segments in the archive.
     *
     * **It lives inside `Payload` and this interface had it at the top level**, where it is set on none
     * of them, which is why the field's own docstring on `keycodeFields` said it was always null. The
     * correction matters where a family sends several rhythms in one repetition: a
     * secondary segment has no `keycodeFields` entry of its own to look up, so this is the only place
     * its width is stated.
     */
    readonly NumberOfBits: number | null;
  } | null;
  readonly Trailer: readonly Atom[] | null;
  readonly TotalLength: number | null;
}
```

Uses [`Atom`](#atom), [`Encoding`](#encoding-type).

### `SegmentRef`

```ts
interface SegmentRef {
  readonly SegmentName: string | null;
  readonly SegmentType: number;
}
```

One entry of a [`KeyCode`](config.md#keycode) list: a segment by name, and which of the two lists to find it in.

### `SendList`

```ts
interface SendList {
  readonly list: number;
  readonly group: number;
  readonly code: number;
  readonly quantity: number;
  /**
   * The four slot family's delay step: the device's delay list, which every command's private
   * condition list calls, and the operands of the private load and condition. What a new send list's own pair
   * copies, `SendShape.newSendLists`.
   */
  readonly prelude?: { readonly delay: number; readonly load: number; readonly condition: number };
}
```

A list in a configuration's ordinary send shape, as [`SendShape.sendLists`](#sendshape) reads it.

### `SendShape`

```ts
interface SendShape {
  /** How many lists one send of a composed device's command takes, its own first: 3 or 1. */
  readonly listsPerSend: number;
  /**
   * A device's sends and what they need, `composeDeviceFor`'s family half: `delays` are the family's where
   * the device states none, `CommonChoices.delays`, refused by a family that needs them and has none.
   */
  device(c: Container, group: number, device: ComposeDevice, delays: DelayDefaults | undefined): DeviceSends;
  /**
   * How a composed device's power steps are spelled where the family's compiles spell them otherwise than the
   * shared composer's default, which is the Harmony 650 and 700 compiles' form: the ordinary
   * press with no lead in, or the long press version where the catalogue holds the key, sent at the catalogue's
   * inter key delay. Absent keeps that default. The Harmony 880 and 885 open each with the device's delay between
   * devices and send it at a quantity of 1, `families/harmony-880-885/sends.ts`.
   * The Harmony One's family states no `powerStep` yet, although its compiles open a power step with the catalogue's
   * `interDeviceDelay` on 8 of 8 catalogue devices, so a power step composed for a One keeps the
   * default. Asked before anything is built, so it is also where a family refuses a delay it cannot spell.
   */
  powerStep?(device: ComposeDevice): PowerStepSpelling;
  /**
   * The list a composed device's power variable runs to switch it on, which `composeDeviceInputs` appends its
   * resets to, read off the configuration or the composed device; `list` is the power on delay's list where
   * the device has one of its own.
   */
  switchOnList(c: Container, device: ComposedDevice): { readonly list?: number; readonly on: number } | undefined;
  /**
   * What writes a new send of a composed device's command at list `list`, its own lists from there in order,
   * `composeDeviceInputs`; read off the configuration once, refused where the device's sends do not read.
   */
  sendWriter(c: Container, device: ComposedDevice): (list: number, group: number, record: number, amount: number) => ListBody[];
  /** Every list in the configuration's ordinary send shape, `composeSequence`. */
  sendLists(c: Container): SendList[];
  /** The lists a new send takes from `list` on, given the configuration's own, `composeSequence`. */
  newSendLists(existing: readonly SendList[], group: number, code: number, quantity: number, list: number): ListBody[];
  /** Which record a sequence's command sends where the caller does not say, `ComposeSequence.records`. */
  readonly sequenceRecords: 'copy' | 'named';
  /** Why a sequence's one block copy is refused on this family, or undefined where it is composed. */
  readonly oneBlockCopyRefusal: string | undefined;
  /**
   * The lists among `lists` that send `operand` alone, a donor's command found by its code,
   * `composeDonorDeviceInputs`. Absent where the family's send has not been matched, which refuses.
   */
  donorSendList?(lists: readonly (readonly Instruction[])[], operand: number): number[];
}
```

How a family's commands are sent: three lists with a delay prelude on the Harmony 600, 650 and 700, and the send and its quantity alone on the Harmony One. One member, asked by every shared
composer that builds or matches a send: the device composer, the input composer, the sequence composer and the
donor input matcher, so none of them tests a trait of its own and builds the shape itself.

Uses [`Container`](config.md#container), [`ComposeDevice`](#composedevice), [`DelayDefaults`](#delaydefaults), [`DeviceSends`](#devicesends), [`PowerStepSpelling`](#powerstepspelling), [`ComposedDevice`](#composeddevice), [`ListBody`](#listbody), [`SendList`](#sendlist), [`Instruction`](#instruction).

### `SetFace`

```ts
interface SetFace {
  height: number;
  /** Its shadow colour, or undefined for a set drawn without one. */
  shadow: number | undefined;
  ink: number;
  /** The median run of ink along a row: one pixel for a regular stroke, two for a bold one. */
  stroke: number;
  /** The median first row of ink of its capitals, undefined where it draws none. */
  capitalTop: number | undefined;
  face: OxaniumFaceName;
  lettering: Lettering;
  /**
   * The inks it is lettered in, the family's choice. Absent on a set only
   * measured, `measureSet`, since Logitech's set was not lettered by us.
   */
  inks?: LetterInks;
  /** The weight it is lettered in, the family's choice per face. Absent as `inks` is. */
  weight?: OxaniumWeight;
  /**
   * The one colour its letters are smoothed against, RGB565, on a set added by `extra`: every pixel a letter
   * partly covers is its ink mixed with this, so the set reads right on that colour alone. Absent on a set
   * drawn in its inks only.
   */
  background?: number;
}
```

What a set was measured to be, and the face and colouring it is given.

Uses [`OxaniumFaceName`](#oxaniumfacename), [`Lettering`](#lettering), [`LetterInks`](#letterinks), [`OxaniumWeight`](#oxaniumweight).

### `SetMeasurement`

```ts
interface SetMeasurement {
  /** Where the set is, for a refusal. */
  address: number;
  height: number;
  /** The median run of ink along a row: one pixel for a regular stroke, two for a bold one. */
  stroke: number;
  /** The median first row of ink of its capitals, undefined where it draws none. */
  capitalTop: number | undefined;
}
```

What `measureSet` reads off one of Logitech's sets that a family names its face by, [`FamilyFonts.faceOf`](#familyfonts).
The same measurements on every family; which face they make is the family's.

### `StatedBlocks`

```ts
interface StatedBlocks {
  readonly once: readonly Pulse[];
  /** Absent for a command that repeats nothing while held. */
  readonly held?: readonly Pulse[];
  /**
   * What the key sends when it comes up, the code's third group: the record's **third** pointer, which the
   * firmware plays at the end whether the key was held or not. Logitech's compiler puts a
   * code's release group there: the PlayStation 3's `StopSpacer`, a
   * six second silence, on the Harmony One, 650 and 700, and `Microsoft 36 Bit`'s constant release on the
   * contributed Harmony 880 or 885 configurations, the two distinct tails measured. Absent for a code
   * naming no release group.
   */
  readonly release?: readonly Pulse[];
}
```

A press's blocks as pulses, derived outside the rhythm table, [`ComposeCommand.blocks`](#composecommand).

Uses [`Pulse`](config.md#pulse).

### `StatedFrame`

```ts
interface StatedFrame {
  readonly value: bigint;
  /** The width this value is stated at, from the family's own name. */
  readonly bits: number;
  /** Their position digit as written. What it indexes is unread. */
  readonly index: number;
}
```

### `StatedItem`

```ts
type StatedItem =
  | { readonly kind: 'frame'; readonly frame: StatedFrame }
  | { readonly kind: 'word'; readonly word: StatedWord };
```

One item of a slot: a value, or a word standing in for a frame.

Uses [`StatedFrame`](#statedframe), [`StatedWord`](#statedword).

### `StatedWord`

```ts
type StatedWord = 'Start' | 'Repeat' | 'RepeatStart' | 'Finish' | 'Trailer' | 'Divider'
  | 'Space' | 'LongSpace' | 'Spacer' | 'Spacer2' | 'StopSpacer' | 'SS' | 'LS' | 'LRS';
```

One code as Logitech's database states it, read as the grammar it is.

**Their string has three slots and two of them hold content**, which is a correction: it is
`G:<family>:(<A>)(<B>)(<C>):<n>`, and the first reading here treated slot A as parameters to be
skipped and read only slot B. Slot C is empty in all 2921 distinct codes measured.

A slot holds a sequence of items joined by `_`, and an item is either a **value**, written with a one
digit prefix and hexadecimal digits, or one of three **words**. Over those 2921 codes the sequences
that occur are exactly seven:

| codes | slot A | slot B | families like |
|---|---|---|---|
| 1026 | a value | `Repeat` | Toshiba 32 Bit |
| 936 | empty | a value | Sony 12 Bit |
| 512 | empty | two values | Sharp 15 Bit, Samsung 38 Bit |
| 293 | `Start` | a value | JVC 16 Bit |
| 119 | empty | three values | Philips Hurd 16 Bit LongToggle |
| 28 | empty | `Start`, two values, `Trailer` | MitsubishiO1 Dual 8 16 Bit |
| 7 | a value | a value | Pioneer 32 Bit 2 |

### `StateTableFacts`

```ts
interface StateTableFacts {
  /** For a refusal: the compiles these facts were measured on. */
  readonly measuredOn: string;
  /** How many variables the firmware owns, the clock's seven and the records after them. */
  readonly firmwareVariables: number;
  /** The firmware's records after the clock, 7 upward, as `[first, max]`, none with a transition. */
  readonly firmwareRecords: readonly (readonly [number, number])[];
  /**
   * The widest maximum a one byte variable above the firmware's block has, and the narrowest a two byte one
   * other than `FIRST_WIDE_VARIABLE` has. Where between the two the line falls is not pinned, so a maximum
   * strictly between them is refused. `wideMin` is undefined where no compile holds such a two byte
   * variable, the Harmony One's, so that every maximum above `narrowMax` is refused.
   */
  readonly narrowMax: number;
  readonly wideMin: number | undefined;
  /**
   * A value map's case count, in bytes; undefined where the family keeps no value maps at all, the Harmony 300
   * and 350's, whose configurations hold no base slot 14, `ARCH16_SLOT_MAP`. A description with a value map is
   * refused there, and the builder builds no value map table.
   */
  readonly caseCountWidth: number | undefined;
  /**
   * Whether the clock's records carry the carry: the minute, day and month incrementing the next field when they
   * roll over and the hour calling a list, `clockTransitions`. On every compile of the four slot and One
   * families, 13 and 19; on none of the 13 Harmony 300 and 350 compiles, whose seven clock records hold no
   * transition at all, so a description there names no hour list. `reference/architectures/harmony-300-350/memory.md`
   * under the state variables.
   */
  readonly clockCarry: boolean;
  /**
   * The minute calls a list on every write besides incrementing the hour, `StateTablesSpec.minuteList`: on
   * the Harmony One, whose screens show a clock, and not on the Harmony 600, 650 and 700, whose screens show
   * none. A description that disagrees with its family here is refused.
   */
  readonly minuteCall: boolean;
}
```

What a family's state tables hold that another family's do not, which `buildStateTables` and
`describeStateTables` take from the family, [`Family.stateTables`](#family). The four slot family's are
`FOUR_SLOT_STATE_TABLES` and the One family's `ONE_STATE_TABLES`: the
Harmony One's differ in records 13 and 14, a one byte case count, where the width line falls and a second
transition on the minute, each a member here, so the builder tests no architecture.

### `TaggedEntry`

```ts
interface TaggedEntry {
  tag: number;
  operand: number;
  opcode: number;
  /** Only the second form carries one. */
  flags: number | undefined;
}
```

### `TextDrawn`

```ts
interface TextDrawn {
  /** Blob offset of the text instruction. */
  at: number;
  /** Blob offset of the `SCREEN_SELECT_FONT` whose choice the string was drawn in, undefined when none was met. */
  selectAt: number | undefined;
  /** The base slot 7 entry that select chose, -1 before any. */
  font: number;
  x: number;
  y: number;
  width: number;
  height: number;
  /**
   * The pixels the pictures drew in the box before the draw, row major, clipped to the screen: what lies
   * behind the text, with every other text left out. Two lines of a screen can overlap by a row or more, 3 on
   * a Harmony One help screen, so a line's box can hold the bottom of the one above; that is another text and
   * not the background, and a letter blended for it would be blended for a neighbour's ink.
   */
  under: number[];
  /**
   * Whether pictures drawn after the string painted over every pixel of its box, so nobody sees it: the
   * Harmony One's chrome draws an activity's title once before its background and once after, and the first
   * lies on nothing drawn yet and is then covered.
   */
  covered: boolean;
}
```

A string as the renderer met it, for a caller that wants to know what a text was drawn over:
`blending.ts` blends a letter into the colour under it, and this is where that colour is read.

`under` is what the pictures had painted in the string's box at the moment before the string was drawn,
or `UNDRAWN`, and `covered` whether pictures drawn after it painted over the whole box. The box is the
string's glyphs side by side, its set's height high, clipped to the screen. A path met twice reports twice,
and a page's strings are reported once the page is drawn, since only then is `covered` known.

### `ToggledCode`

```ts
interface ToggledCode {
  readonly read: StatedCode;
  readonly blocks?: StatedBlocks;
}
```

A command's code with its toggle bit flipped, [`ComposeCommand.toggled`](#composecommand).

Uses [`StatedCode`](config.md#statedcode-type), [`StatedBlocks`](#statedblocks).

### `TouchButtonKey`

```ts
type TouchButtonKey = (typeof BUTTON_KEYS)[number];
```

Uses [`BUTTON_KEYS`](#button_keys).

### `TouchClientAction`

```ts
type TouchClientAction = (typeof CLIENT_ACTIONS)[number];
```

Uses [`CLIENT_ACTIONS`](#client_actions).

### `TouchGestureKey`

```ts
type TouchGestureKey = (typeof GESTURE_KEYS)[number];
```

Uses [`GESTURE_KEYS`](#gesture_keys).

### `TouchRemoval`

```ts
interface TouchRemoval {
  readonly devices?: readonly Id[];
  readonly activities?: readonly Id[];
}
```

What to take out: devices and activities by id.

Uses [`harmonyTouch.Id`](config-harmony-touch.md#harmonytouchid).

### `WaveformRefusal`

```ts
type WaveformRefusal =
  | 'no rhythm derivable for the family'
  | 'our keycode reader declines the code'
  | BlockRefusal
  | 'our encoder threw';
```

Why a catalogue command could not be turned into a waveform. Each names a reading still to do.

Uses [`BlockRefusal`](#blockrefusal).

### `WiringChecked`

```ts
interface WiringChecked {
  /** Bytes of every built piece. */
  bytes: number;
  lists: number;
  entries: number;
}
```

What a wiring check compared.

### `WithChoices`

```ts
type WithChoices<Options, Choices> = Options & { readonly choices?: Choices };
```

A composer's options with the family's choices, which default to the family's own.

### `Writer`

```ts
class Writer {
  readonly bytes: Uint8Array;
  constructor(length: number);
  u8(value: number): this;
  u16(value: number): this;
  u24(value: number): this;
  u32(value: number): this;
  ascii(text: string): this;
  /**
   * A run of bytes rather than a field: a format constant, or a payload a reader handed back.
   * Whether it counts as framed is the caller's declaration, `framed` against `partly`.
   */
  raw(view: Uint8Array): this;
  /** How many bytes are still unwritten, which a rebuilder asserts is zero. */
  get remaining(): number;
}
```

A fixed length run being filled field by field, which refuses to be the wrong length.

Exported for its own test. The length check is the guard that survives the residue copy: a
rebuilder that writes half of its structure would otherwise leave the other half to the copy and
still round trip, which is precisely the "rebuilt it" claim this file exists not to make.
