# `@freeharmony-sdk/config`

<!-- introduction -->
The config package's main entry. An application takes from it the document it holds for a remote and the toolkit
that changes it, the build, the search for a device, and what each model can do. It also reads a configuration file a
remote holds: its devices, activities, keys and screens, its infrared codes, and a drawing of each screen. It loads in
a browser or an Electron renderer as well as in Node; on Node, [its Node entry](config-node.md) carries all of it and
adds what reads the disk. The document toolkit and the Harmony Touch's own documents are namespaces of this entry, each
on a page of its own: [`recipe`](config-recipe.md) and [`harmonyTouch`](config-harmony-touch.md).
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

## Before a write

The checks a writer runs before anything is erased, the action queue's peak depth and the state table's sizing.

### `assertQueueFits`

```ts
function assertQueueFits(c: Container): void
```

Refuse a container whose own lists overflow the ring.

**This is a rail and not a warning**: a config that overflows is one the remote
accepts, whose checksums verify, which this project accounts for to the byte, and which quietly
does less than it says. The caller that matters is the config writer, so nothing reaches a
remote without passing this.

Uses [`Container`](#container).

### `assertStateTableConsistent`

```ts
function assertStateTableConsistent(c: Container): void
```

Refuse a container whose base slot 13 header does not add up.

**`narrow` and `wide` size the state variable storage and `count` does not**. The
firmware computes `narrow + 2 * wide` as the RAM the variables occupy, which is what the store's
own width arithmetic needs, and then **fills every byte above it with `0xFE` at each boot**. The
seeding loop runs first and over `count`, so a container whose `count` exceeds the sum seeds
variables into bytes the fill then paints over: they hold 65278 rather than what their record
says, and nothing anywhere reports it. Measured on arch 12 (Harmony One) at `0x2A330` and arch 14
(Harmony 700 reference image) at `0x17A42`, and confirmed on a connected Harmony One where the
`0xFE` run begins at the computed byte and not one either side.

Uses [`Container`](#container).

### `QueueError`

```ts
class QueueError extends Error {}
```

Lists of actions that do not fit the remote's queue of instructions, so the remote would not run them whole.

### `StateTableError`

```ts
class StateTableError extends Error {}
```

Base slot 13: how many state variables there are and how wide each one is. It opens with four 16 bit words,
`count`, `narrow`, `wide` and `narrow` again, and `count` entries of 24 bits each follow them.

The split is what the firmware's lookup uses: an index below `narrow` reads one byte and an
index at or above it reads two, so the width belongs to the index and not to the value.

## Building

The recipe a build starts from, the document an application holds for one remote. A build chooses the family that builds for the recipe's model, of either kind: a compiled family writes one configuration file, a document family, the Harmony Touch's, the documents its sync delivers.

**The one build an application makes**: a recipe in, the configuration or the documents a remote is sent out, the family chosen by the recipe's model.

### `buildFromRecipe`

```ts
function buildFromRecipe(json: unknown, sources: BuildSources): Built
```

The remote a recipe describes, built from nothing. Takes the recipe as parsed JSON and reads it, so a caller hands
over what it holds. **A build says no in three ways an application tells apart, on every model**:

* [`ComposeError`](#composeerror), the build refuses the document: the families refuse what they will not build with it or a
  subclass of it, [`support/refusal.ts`](../../../packages/config/src/support/refusal.ts);
* [`NotBuiltError`](#notbuilterror), what the document asks for is not built yet: a field of version 2 the family does not read, a key
  a recipe chooses where the family builds none, and a model whose family builds nothing from a recipe yet, each
  naming the requirement it waits on;
* [`RecipeError`](#recipeerror), a source the caller must give is missing: an account for a Harmony Touch, and an archive for a
  device the document carries no definition of. The same class refuses a recipe that is not one, before any of this,
  and a model no family serves.

Uses [`BuildSources`](#buildsources), [`Built`](#built).

### `BuildSources`

```ts
interface BuildSources {
  /** When it is built, `YYYY-MM-DDTHH:MM:SS`: every stamp and clock record a configuration holds is taken from it. */
  readonly builtAt: string;
  /**
   * The catalogue the codes of a device the recipe names and does not carry come from: `archiveAt` of a checkout on
   * Node. A device the recipe carries, `RecipeDevice.definition`, is served from the recipe first.
   */
  readonly archive?: CatalogueSource;
  /** The Harmony Touch's account: the identifiers its documents carry, read off the remote and never in a recipe. */
  readonly account?: TouchAccount;
}
```

What a build takes besides the recipe.

Uses [`CatalogueSource`](#cataloguesource), [`TouchAccount`](#touchaccount).

### `Built`

```ts
type Built =
  | {
    readonly kind: 'configuration'; readonly model: string; readonly skin: number; readonly bytes: Uint8Array;
    readonly leftOut: readonly LeftOutActivity[];
  }
  | {
    readonly kind: 'documents'; readonly model: string; readonly skin: number;
    readonly documents: SyncDocuments; readonly pictures: readonly OwnPicture[];
    readonly leftOut: readonly LeftOutActivity[];
  };
```

What a build gives: the configuration of a compiled family, or a document family's documents and pictures; and on
both, **the activities the build left out and why**, in the document's order, empty where every activity
takes part: each one the document switches off, and each one that uses no device, which is left out the same
way on every model. Said here because the bytes or documents built cannot say it: an activity left out is simply not
in them, and a person who switched one off and forgot, or removed its last device, would otherwise see it vanish
unexplained.

Uses [`LeftOutActivity`](#leftoutactivity), [`harmonyTouch.SyncDocuments`](config-harmony-touch.md#harmonytouchsyncdocuments), [`OwnPicture`](config-types.md#ownpicture).

### `builtDigest`

```ts
function builtDigest(built: Built): string
```

**A build's fingerprint**: the SHA-256 of what is sent, so two builds are the same exactly when their fingerprints
are. A configuration's is that of its bytes. A set of documents' is that of one text holding each document as JSON
in the order the build gives them, and each picture's address and the SHA-256 of its bytes, so a document or a
picture changed anywhere changes it.

Uses [`Built`](#built).

### `LeftOutActivity`

```ts
interface LeftOutActivity {
  readonly id?: string;
  readonly name: string;
  readonly reason: LeftOutReason;
}
```

An activity a build left out: its id where it has one, its name, and why, [`LeftOutReason`](#leftoutreason).

Uses [`LeftOutReason`](#leftoutreason).

### `LeftOutReason`

```ts
type LeftOutReason = 'switched-off' | 'no-device';
```

**Why a build leaves an activity out**, a closed list an application words itself:

* `switched-off`: a person switched it off, [`RecipeActivity.enabled`](#recipeactivity);
* `no-device`: it uses no device, so there is nothing for it to switch on, put on an input or send a key to. **No
  device, no activity**: it is left out as a switched off one is, on every model, and never refused, since an
  activity is never invalid.

An activity both switched off and with no device is left out as `switched-off`, the person's own choice, which is
what switching it on again would answer first.

### `readRecipe`

```ts
function readRecipe(json: unknown): Recipe
```

A recipe out of parsed JSON, its shape checked: every field one a recipe has, every name a name, every
role one of the contract's, and a field of version 2 only in a document of version 2. Refused with the first thing
wrong, by where it is.

Uses [`Recipe`](#recipe).

### `Recipe`

```ts
interface Recipe {
  /**
   * The version of the recipe's format, a whole number from 1; absent is 1. It moves when a field changes meaning,
   * so that a document saved by an older application is brought up on opening rather than misread.
   */
  readonly version?: number;
  readonly about?: string;
  readonly model: RecipeModel;
  readonly devices: readonly RecipeDevice[];
  readonly activities: readonly RecipeActivity[];
  /** Favourite channels, per device; absent is none. */
  readonly favourites?: readonly RecipeFavourites[];
  /**
   * The model's family's choices over its defaults, `FourSlotChoices` for a Harmony 600, 650 or 700. Read
   * by the family, which refuses one it does not make.
   */
  readonly choices?: Readonly<Record<string, unknown>>;
  /**
   * The protocol definitions the carried devices' commands are written in, as the archive's protocol files hold
   * them; served before the archive's, by name.
   */
  readonly protocols?: readonly Readonly<Record<string, unknown>>[];
  /**
   * The remote's own settings a person chose, by the names the model's family gives them, each a text, a number
   * or true or false; absent is the family's defaults. Which names there are is the family's to say. Version 2.
   */
  readonly settings?: Readonly<Record<string, RecipeSetting>>;
  /**
   * The highest number the toolkit has given an id of each kind, so that an id is never given twice: a device added
   * after one was removed takes a new number, and nothing keyed by the old id, a favourite on a Harmony Touch among
   * them, passes to it. Version 2. See `RecipeIds`.
   */
  readonly highestIds?: RecipeIds;
}
```

A recipe. The activities are in the order the activity menu lists them.

Uses [`RecipeModel`](#recipemodel), [`RecipeDevice`](#recipedevice), [`RecipeActivity`](#recipeactivity), [`RecipeFavourites`](#recipefavourites), [`RecipeSetting`](#recipesetting), [`RecipeIds`](#recipeids).

### `RECIPE_VERSION`

```ts
const RECIPE_VERSION = 2
```

The version of the recipe's format this reads and writes, [`Recipe.version`](#recipe). Version 2 adds the fields of one shape
for every model, and changes the meaning of none, so a document of version 1 reads as before.

### `RecipeActivity`

```ts
interface RecipeActivity {
  /** The activity's id in this document, as `RecipeDevice.id` is a device's. */
  readonly id?: string;
  readonly name: string;
  readonly type: string;
  /**
   * The devices it uses. **None is allowed and kept**: an activity with no device stays in the document,
   * and every build and sync leaves it out and says so, `leftOutBecause`, until a device is added.
   */
  readonly devices: readonly RecipeActivityDevice[];
  readonly screen?: readonly RecipeScreenItem[];
  /** The keys a person chose otherwise in this activity's map; absent is none. */
  readonly keys?: readonly RecipeKey[];
  /**
   * The screen the activity opens on, by the word the model's family names it by; absent is the family's
   * default. Which words there are is the family's to say, so this reader takes any. Version 2.
   */
  readonly opensOn?: string;
  /**
   * Whether this activity holds the favourite channels: at most one activity of a document says true. Absent is
   * the family's default, false says this one does not. Version 2.
   */
  readonly favourites?: boolean;
  /**
   * The order the activity switches its devices on and off in, by their names: every device of the activity once.
   * Absent is the family's default. Version 2.
   */
  readonly powerOrder?: readonly string[];
  /** Extra steps when the activity starts; absent is none. Version 2. */
  readonly start?: readonly RecipeActivityStep[];
  /** Extra steps when the activity ends; absent is none. Version 2. */
  readonly end?: readonly RecipeActivityStep[];
  /** The activity's own sequences, each named once within it. Version 2. */
  readonly sequences?: readonly RecipeSequence[];
  /**
   * **Switched off**: stated only as `false`, since an activity is on unless it says otherwise, and a
   * field stating what holds anyway is said by leaving it out. A person switches an activity off on purpose, to keep it
   * in the document without giving it to the remote: every build leaves it out, `takingPart`, before any family builds,
   * and says which it left out. Kept apart from everything else about the activity, so switching it on again gives back
   * the activity it was, under the same id. Version 2.
   */
  readonly enabled?: false;
  /**
   * **Needs attention**: why a change may have left the activity in a state the person does not want,
   * one reason or more, each as data an application words itself, `RecipeAttention`. **Stored, because it cannot be
   * worked out again**: once a device is removed, nothing left in the document says what the activity's keys did with
   * it. It changes no build: an activity needing attention is built and synced as it is, since it is never invalid. The
   * toolkit sets it when a device the activity used is removed, and an application clears it by one call. Version 2.
   */
  readonly attention?: readonly RecipeAttention[];
}
```

One activity: its name, MyHarmony's type, its devices, and its working screen's items in order, which
a person chooses and the compile does not derive. Absent or empty is a screen with no item.

Uses [`RecipeActivityDevice`](#recipeactivitydevice), [`RecipeScreenItem`](#recipescreenitem), [`RecipeKey`](#recipekey), [`RecipeActivityStep`](#recipeactivitystep), [`RecipeSequence`](#recipesequence), [`RecipeAttention`](config-types.md#recipeattention).

### `RecipeActivityDevice`

```ts
interface RecipeActivityDevice {
  readonly device: string;
  readonly input?: string;
  readonly roles: readonly ActivityRoleName[];
}
```

One device's part in an activity: the input it is switched to, by the catalogue's name, and its roles.

Uses [`ActivityRoleName`](#activityrolename).

### `RecipeActivityStep`

```ts
type RecipeActivityStep = RecipeCommandStep | { readonly sequence: string } | RecipeChannelStep;
```

One step an activity takes at its start or its end beyond what its devices need anyway: a device's command, a
pause in tenths of a second, one of the activity's sequences by its name, or a channel tuned through a device,
[`RecipeChannelStep`](#recipechannelstep). The first three are the toolkit's `ActivityStep`'s; the channel is the document's alone, since
the toolkit's step has no channel. Devices by name, since the recipe names a device by its name underneath. Version 2.

Uses [`RecipeCommandStep`](#recipecommandstep), [`RecipeChannelStep`](#recipechannelstep).

### `RecipeChannelStep`

```ts
interface RecipeChannelStep {
  readonly device: string;
  readonly channel: string;
}
```

A channel tuned through one of the activity's devices as a step at its start or its end: the channel's digits
**as text**, so a leading zero survives, as a favourite channel's does, and the device tunes it the way its channel
tuning says. A step of the activity's own and never of a sequence: a Harmony Touch, the one remote whose documents
were measured holding one, keeps a channel step among an activity's start steps, and its engine skips a sequence's
step of any kind but a command or a pause, [`reference/architectures/harmony-touch/activities-and-buttons.md`](../../architectures/harmony-touch/activities-and-buttons.md). Version 2.

### `RecipeCommand`

```ts
interface RecipeCommand {
  readonly code?: RecipeCommandCode;
  readonly sending?: RecipeSending;
}
```

One command a person changed, [`RecipeDevice.commands`](#recipedevice): a code of its own, how it is sent, or both.

Uses [`RecipeCommandCode`](#recipecommandcode), [`RecipeSending`](#recipesending).

### `RecipeCommandCode`

```ts
type RecipeCommandCode = { readonly keycode: string } | { readonly learned: readonly Pulse[] };
```

A code for one command: the catalogue's own notation, or pulses learned from the device's original remote. The toolkit's `CommandCode` is this.

Uses [`Pulse`](#pulse).

### `RecipeCommandStep`

```ts
type RecipeCommandStep = { readonly device: string; readonly command: string } | { readonly pause: number };
```

One step of a version 2 sequence: a device's command by the device's name and the command's, or a pause in
tenths of a second, as the toolkit's `SequenceStep` and the version 1 steps count a pause.

### `RecipeDevice`

```ts
interface RecipeDevice {
  /**
   * The device's id in this document, which the toolkit gives it and addresses it by, `recipe/toolkit.ts`: kept
   * through every rename, so an application's selection and undo never hold a name. Absent in a recipe written by
   * hand, which the toolkit's `open` gives one; the builders do not read it.
   */
  readonly id?: string;
  readonly name: string;
  readonly device: string;
  readonly poweredOnBetweenActivities?: boolean;
  /**
   * The device key it goes on, on a remote with a key per device and no screen, the Harmony 300 and 350: the key's
   * place as `DevicePlace` counts it, from 0, `DEVICE_KEYS` in the family's `keys.ts`, and a short or a long press, short unless given. A
   * person chooses it in MyHarmony, so it is the recipe's, and only that family reads it.
   */
  readonly key?: RecipeDeviceKey;
  /** The keys a person chose otherwise in this device's own map, device mode's; absent is none. */
  readonly keys?: readonly RecipeKey[];
  /**
   * The device's definition carried in the recipe: the catalogue's record of it and its codeset's
   * commands, served before any archive, `carriedCatalogue` in `catalogue/carried.ts`. Absent, the build reads the
   * catalogue entry `device` names from the archive it is given.
   */
  readonly definition?: RecipeDefinition;
  /**
   * A person's timing for the device, in the catalogue's own member names, `DeviceTiming`, each member
   * given standing over the catalogue's and every other the catalogue's. Kept apart from `definition` so that fetching
   * the definition again replaces the catalogue's statement and never the person's. Version 2.
   */
  readonly timing?: Partial<DeviceTiming>;
  /**
   * A person's choice of how the device is powered: the catalogue's own members, `DevicePower`, each given
   * standing over the catalogue's, and `alwaysOn`, a device that is never switched off, which the catalogue does not
   * state. Kept on between activities is `poweredOnBetweenActivities`, the field version 1 has. Version 2.
   */
  readonly power?: RecipeDevicePower;
  /**
   * A person's choice of how a channel number is entered, in the catalogue's shape, `DeviceChannelTuning`, whose
   * steps name the device's commands by name. **Member by member, as `timing` is**: each member stated, the digits or
   * one of the four lists, stands over the catalogue's, and each one left out keeps the catalogue's. Version 2.
   */
  readonly channelTuning?: DeviceChannelTuning;
  /**
   * The device's screen list in device mode as a person chose it, stated whole: every entry in order, an empty
   * list for none. Absent is what the family derives. Version 2.
   */
  readonly screen?: readonly RecipeScreenCommand[];
  /**
   * A person's changes to single commands of the device, by command name: a code replacing the definition's,
   * and the sending part, which is room only: nothing builds it yet. Kept apart from `definition` for the same reason
   * as `timing`. Version 2.
   */
  readonly commands?: Readonly<Record<string, RecipeCommand>>;
}
```

One device: what the remote calls it, its catalogue entry as `<manufacturer>/<file>`, and MyHarmony's
"I want to keep this device on when switching Activities", absent meaning off.

Uses [`RecipeDeviceKey`](#recipedevicekey), [`RecipeKey`](#recipekey), [`RecipeDefinition`](config-types.md#recipedefinition), [`DeviceTiming`](#devicetiming), [`RecipeDevicePower`](#recipedevicepower), [`DeviceChannelTuning`](#devicechanneltuning), [`RecipeScreenCommand`](#recipescreencommand), [`RecipeCommand`](#recipecommand).

### `RecipeDeviceKey`

```ts
interface RecipeDeviceKey {
  readonly place: number;
  readonly press?: 'short' | 'long';
}
```

A device key, [`RecipeDevice.key`](#recipedevice).

### `RecipeDevicePower`

```ts
interface RecipeDevicePower extends Partial<DevicePower> {
  readonly alwaysOn?: boolean;
}
```

[`RecipeDevice.power`](#recipedevice): the catalogue's power members a person states, and whether the device is always on.

Uses [`DevicePower`](#devicepower).

### `RecipeError`

```ts
class RecipeError extends Error {}
```

A recipe that cannot be read, or names a model nothing here can build for.

### `RecipeFavourites`

```ts
interface RecipeFavourites {
  readonly device: string;
  readonly channels: readonly string[];
}
```

One device's favourite channels, in the order of the remote's favourite keys: the device by its setup
name, and each channel as **text**, because Logitech's service holds a channel as text and a leading
zero is a channel of its own ("07" is not "7"), [`reference/logitech/service.md`](../../logitech/service.md), "Button maps". A digit,
a dot or a dash only, the characters MyHarmony's favourites screen reads a channel number for.

**Built by nothing yet**: every build refuses a recipe that states any, since none writes a favourite channel,
rather than build a configuration without what the recipe asked for.

### `RecipeIds`

```ts
interface RecipeIds {
  readonly device?: number;
  readonly activity?: number;
  readonly sequence?: number;
}
```

[`Recipe.highestIds`](#recipe): per kind, the highest number an id of that kind has carried, the toolkit's ids being a letter
and a number, `d3` a device's, `a2` an activity's, `s1` a sequence's. Three numbers is the smallest record that
keeps the ids apart without listing every id ever given; a kind absent is one that never had an id past what the
document holds now. No build reads it, nor needs to: it changes no byte a remote receives.

### `RecipeKey`

```ts
interface RecipeKey {
  readonly key: string;
  readonly press?: RecipePress;
  readonly action: RecipeKeyAction;
}
```

A person's choice for one key, over what the builders derive for it, [`RecipeDevice.keys`](#recipedevice) for a device's own map in
device mode and [`RecipeActivity.keys`](#recipeactivity) for an activity's: the key by Logitech's word for it, the press, short unless
given, and what it does instead: a command of any device of the recipe, by the device's name and the command's, a
sequence of the same owner's screen by its name, or nothing at all. A key not listed keeps what the builders give
it, so a recipe never copies a default.

**The key is named by its word, `VolumeMute`, `Info`, `Number0`, never by a number.** The words are Logitech's,
the ones every model's drawing carries, `packages/silhouettes` and `reference/silhouettes/`, and they are the same
key on every model that has it, where a scan code is a number inside one family's firmware: Mute is scan 9 on a
Harmony One and another number on a Harmony 650, and a Harmony Touch has no scan codes at all. So a document moved
to another model still means the same keys, and only the family that builds for the model turns a word into its
own number, [`Family.recipeKeys`](config-types.md#family). Which words a model takes is the family's to say, and the toolkit asks it,
`recipe.keyNames`; this module only reads that a key has a name.

Uses [`RecipePress`](#recipepress), [`RecipeKeyAction`](#recipekeyaction).

### `RecipeKeyAction`

```ts
type RecipeKeyAction =
  | { readonly device: string; readonly command: string }
  | { readonly sequence: string }
  | { readonly nothing: true };
```

What a key does: a device's command, by the device's name and the command's, one of the activity's sequences,
or nothing.

### `RecipeModel`

```ts
interface RecipeModel {
  readonly name: string;
  readonly skin?: number;
}
```

The model a recipe is for: Logitech's name and the skin where known.

### `RecipePress`

```ts
type RecipePress = 'short' | 'held' | 'double';
```

How a key is pressed, wherever a key's choice or a key's place names one: `held` is the long press, a second
command chosen by how long the key is down, which is a property of the key, and not repeating while held, which is
the command's, [`reference/how-a-harmony-works.md`](../../how-a-harmony-works.md); `double` is two presses in quick succession, which a Harmony
Touch's gestures take. `double` is of version 2. Which presses a model has is its family's to say.

### `RecipeScreenCommand`

```ts
interface RecipeScreenCommand {
  readonly device: string;
  readonly command: string;
  readonly label?: string;
}
```

A command entry of a screen list: a device's command, by the device's name and the command's, and in version 2 the
label the screen shows for it, absent for the command's own name. The steps of a version 1 screen use no label.

### `RecipeScreenItem`

```ts
type RecipeScreenItem =
  | RecipeScreenCommand
  | { readonly sequence: string; readonly steps: readonly RecipeSequenceStep[] }
  | { readonly sequence: string; readonly steps?: undefined };
```

One item of an activity's working screen: a device's command by the label that device's own screen
draws it under, or a sequence, Logitech's "sequence" of MyHarmony. **Two forms of a sequence**: version 1 states
one where it sits, by its name and its steps, a step sending the command a device's key sends by the key's scan
code, `keys.md`, or pausing, in tenths of a second; version 2 names one of the activity's own sequences,
[`RecipeActivity.sequences`](#recipeactivity), whose steps name commands and never a scan, so a document moved to another model means
the same commands. `steps` is what tells the two apart: present on the first form, never on the second.

Uses [`RecipeScreenCommand`](#recipescreencommand), [`RecipeSequenceStep`](#recipesequencestep).

### `RecipeSending`

```ts
interface RecipeSending {
  readonly copies?: number;
  readonly heldPaceMs?: number;
  readonly leadInMs?: number;
}
```

How one command is sent, where a person tuned it over what its code states: the copies of the code in the first
block, the pace of the held block in milliseconds, and the silence before the first block in milliseconds, the lead
in the compiled families' composers already take per command. **Room only**: the place is in the document so its
shape does not move again, and no build reads it.

### `RecipeSequence`

```ts
interface RecipeSequence {
  readonly id?: string;
  readonly name: string;
  readonly steps: readonly RecipeCommandStep[];
}
```

A named sequence an activity owns: its id in the document, which the toolkit gives it as it gives a device's,
its name, and its steps, at least one of them sending a command. It draws on its activity's devices; a key, a
screen item and an extra step of the same activity name it. Version 2.

Uses [`RecipeCommandStep`](#recipecommandstep).

### `RecipeSequenceStep`

```ts
type RecipeSequenceStep = { readonly device: string; readonly scan: number } | { readonly pause: number };
```

One step of a sequence as version 1 states it: a device's key by its scan code, or a pause.

### `RecipeSetting`

```ts
type RecipeSetting = string | number | boolean;
```

One setting's value, [`Recipe.settings`](#recipe).

### `RecipeTarget` (type)

```ts
interface RecipeTarget {
  readonly skin: number;
  readonly model: Model;
  readonly family: Family;
}
```

The model a recipe names, its skin and its definition, and the family that builds for it.

Uses [`Model`](base.md#model), [`Family`](config-types.md#family-type).

### `recipeTarget`

```ts
function recipeTarget(recipe: Recipe): RecipeTarget
```

The model a recipe names, its skin and its definition, and the family that builds for it, chosen by the registry,
[`chooseByModel`](#choosebymodel): by its skin where given and by its name otherwise. Refused, as a [`RecipeError`](#recipeerror) with the
registry's message, where the table has no such model, where a name and a skin disagree, where a name is two skins'
and none is given, and where no family serves the model's architecture; and refused where the model's family is a
document family, the Harmony Touch's, which builds its documents from the recipe through its own members,
`HARMONY_TOUCH_FAMILY.readSetup` and `build`, rather than from a recipe target.

Uses [`Recipe`](#recipe), [`RecipeTarget`](#recipetarget-type).

### `TouchAccount`

```ts
interface TouchAccount {
  readonly context: OwnContext;
  readonly tuning?: { readonly DeviceProfileUri: string; readonly ContentProfileKey: Id };
}
```

What a set of ours takes from the account: Context's seven fields a Touch reads, and the address and key of the
tuning device's favourites documents. An application reads it off the remote and keeps it with its user's data,
never inside a document: it is the account's, and a document may be shared.

Uses [`OwnContext`](config-types.md#owncontext), [`harmonyTouch.Id`](config-harmony-touch.md#harmonytouchid).

### `unstatedChoices`

```ts
function unstatedChoices(json: unknown): readonly string[]
```

**The choices a recipe leaves to its family's defaults**, by name: empty where the
recipe states every choice its family makes, which a reference recipe does, so that a default changed later cannot
change a reference without its recipe saying so. A family that makes no choice, a document family among them,
answers empty.

## Editing it in place

The edits a configuration takes without changing its length, and the stamp a save gives it.

### `applyEdits`

```ts
function applyEdits(c: Container, edits: Edit[]): EditReport
```

Apply the edits to a copy of the container's bytes and recompute the trailer.

Refuses, in this order: a container whose own trailer checksum disagrees with its bytes, an edit
outside the blob, an edit touching the container frame, an edit no reader's claim covers, and two
edits on one byte. An empty list is the identity and gives the input back, which is the check that
this writes nothing of its own.

Uses [`Container`](#container), [`Edit`](#edit), [`EditReport`](#editreport).

### `clockStateEdits`

```ts
function clockStateEdits(c: Container, builtAt: string): Edit[]
```

The edits that stamp base slot 13's clock, which is the **second** place the build time is stored.

Base slot 13's first seven records are the firmware's own clock, and each one's
`first` is the corresponding field of base slot 3's timestamp in every container of the corpus.
So a config carried over with its old records carries a stale clock in two places, not one, and
[`timestampEdit`](#timestampedit) on its own leaves the remote's seconds, minute and hour set to whenever the input
was generated.

**Seven values are stamped and an eighth is derived**, which is the part that is easy to miss. The
year's maximum is that year plus one, in all nineteen containers measured, where the other six
maxima are fixed. Stamp the year without it and a config saved more than a year after it was built
declares a value outside the variable's own declared range: built in 2023 the year record is 23 with
a maximum of 24, and saving it in 2026 would write 26 into a range that stops at 24. Nothing here
has watched a remote mishandle that, so it is a rail taken from the format's own rule rather than
from a measured failure, which is the weaker of the two kinds and is marked as such.

The seven values come from `clockRecordFields`, the same encoder base slot 3 uses, rather than from
a second decomposition of the same string: that is the rule this project bans two copies of.

The transitions those records carry are **not** touched. They are structural, not date derived: on
arch 8, 9, 12 and 14 the seven records carry one skeleton in every container, the carry: the minute
adds one to the hour, the hour calls a list adding one to the day and the weekday, the day adds one to
the month and the month to the year, the other three carry nothing, and the only part that varies is
which action list the hour's `0x7F` names (the Harmony One's minute carries a second transition). On
arch 16 (Harmony 300 and 350) the five configurations read carry none at all, so the remote's clock
stops at the minute; a save leaves that alone too.

Uses [`Container`](#container), [`Edit`](#edit).

### `Edit`

```ts
interface Edit {
  start: number;
  bytes: Uint8Array;
  /** Which structure asked for it. Reported back, and used in the refusals. */
  owner: string;
}
```

One same length replacement, as a blob offset.

### `EditError`

```ts
class EditError extends GspmError {}
```

What a caller may not do. Separate from [`GspmError`](#gspmerror) so an editor can catch only its own.

Uses [`GspmError`](#gspmerror).

### `EditReport`

```ts
interface EditReport {
  bytes: Uint8Array;
  /** Every run that differs from the input, in order, the trailer word included. */
  changed: { start: number; length: number }[];
}
```

A configuration after an edit, and every run of bytes the edit changed.

### `IntroductionTour` (type)

```ts
interface IntroductionTour {
  /**
   * `shown` when the list enters the tour's first screen, `skipped` when it calls the tour's exit
   * instead, which is the form Logitech's own compiler writes for a Harmony 600 and both Harmony 700
   * configurations measured and the form `skipIntroductionTour` produces.
   */
  state: 'shown' | 'skipped';
  /** The base slot 10 list that marks the tour started and then enters it or skips it. */
  list: number;
  /** The state variable that list sets to 1, which no other `0x80 + v` write in an action list sets. */
  variable: number;
  /** The tour's first screen, where the list enters one; a skipped tour names none. */
  mode?: number;
  /** How many screens the tour is, walking every mode its screens enter. */
  modes: number;
  /** The list the tour's last screen runs, which is how the tour ends. */
  exit: number;
}
```

Where a configuration's introduction tour starts and how it ends, as [`introductionTour`](#introductiontour) found it.

### `introductionTour`

```ts
function introductionTour(c: Container): IntroductionTour
```

Find the introduction tour a configuration opens after every reload, and whether it is skipped.

**What the tour is**: ten screens, `Welcome to your Harmony 650 remote` to `You can now
enjoy your entertainment system`, which a Harmony 650 was seen opening after a write, when the
configuration is reloaded. It is started by one list of two instructions, **set a variable
to 1, then enter the tour's first screen**, and it ends when its last screen runs one list, the
list that returns the remote to its Remote Assistant screen. The variable is seeded 0, and that exit
route calls the tour itself while it is 0, which is why the tour sets it first.

**Logitech's compiler writes the same list in a second form**, set the variable and then call the
exit, so the tour is never entered: on a Harmony 600's configuration and both Harmony 700 configurations
measured, lists 364 and 1157, where on a Harmony 650's configuration and another 600's it enters the tour. So the
edit below produces the vendor's own form rather than one of ours.

Found structurally rather than by number: a two instruction list `[0x80 + v := 1, x]` whose
variable no other `0x80 + v` write in an action list sets, where `x` either enters a mode whose screens reach exactly
one list between them, or calls a list that exactly one set of screens reaches in that way.

Uses [`Container`](#container), [`IntroductionTour`](#introductiontour-type).

### `localTimestamp`

```ts
function localTimestamp(when: Date): string
```

A local wall clock timestamp for [`saveEdits`](#saveedits), from a `Date`.

**The one place a timezone enters this codec**, and deliberately: the record carries no zone, the
remote displays it as the time of day, so a save wants the wall clock of whoever is saving rather
than UTC. `clockRecord` stays zone free on the way back out, which is what keeps the golden
vectors independent of where the tests run, so the two are not symmetrical on purpose.

**Which zone Logitech stamps in is open, and it does not look like the saver's**: a
MyHarmony sync of the Harmony 650 stamped 14:32:27 and the remote was read at 14:34:08 UTC on the
same day, so that stamp was within two minutes of UTC and could not have been the local time of
the computer that synced it, two hours later. Other Logitech stamps sit an hour or more from UTC either way, so no
single zone explains all of them. This stays local until the remote's own display says otherwise.

### `saveEdits`

```ts
function saveEdits(c: Container, edits: Edit[], builtAt: string): EditReport
```

Apply the edits **as a save**: everything [`applyEdits`](#applyedits) does, plus every field the build time owns.

Uses [`Container`](#container), [`Edit`](#edit), [`EditReport`](#editreport).

### `setPageListEntry`

```ts
function setPageListEntry(
  c: Container,
  page: number,
  index: number,
  entry: Pick<TaggedEntry, 'tag' | 'operand' | 'opcode'>,
): Edit[]
```

One entry of one mode page's tagged list, **and its copy**.

The rail this exists for. Every page's list has a second copy in the pool, which
nothing reads and which an emitter still has to reproduce; an editor that changed one and not the
other would produce a file the remote accepts and every check here passes. So both are written,
and a caller cannot ask for only one.

Opcode `0x7F` is refused in either copy. It is the one field the two are allowed to disagree on,
because they name different base slot 10 entries holding identical action lists, so writing one
value into both would break exactly the thing this function exists to preserve.

Uses [`Container`](#container), [`TaggedEntry`](config-types.md#taggedentry), [`Edit`](#edit).

### `setParameter`

```ts
function setParameter(c: Container, group: number, index: number, value: number): Edit[]
```

One `u16` of one parameter group.

The group's own length is what the firmware demands: a group of a different length is
silently replaced by compiled in defaults, and a group index does not port between architectures.
Neither is at risk here, since nothing can change a length, but both are why the index is checked
against the group's own count rather than against the section.

Uses [`Container`](#container), [`Edit`](#edit).

### `setPowerOnDelay`

```ts
function setPowerOnDelay(c: Container, group: number, tenths: number): Edit[]
```

One device's power on delay, on the architectures that inline it.

**The smallest change this format admits**: one byte per copy, in place, moving nothing and restamping no
count. The instruction
is the single `0x7C` at the top level of the action list that device's `Power` variable runs on
its 0 to 1 transition, `powerOnInstructions`.

**`tenths` is capped at 100, which no inline power on delay here exceeds, not a field width.** A byte
holds 255, and the enqueueing worker folds two consecutive quantities for one device by taking the
larger **except** at 100, where it pushes a second entry instead. No inline power on delay
on arch 8, 9 or 12 exceeds 100, and a larger one spelled out would be a length change and not a byte
edit. Logitech's compiler does write a single `0x7C` above 100 for a sequence's pause on the Harmony
One, and the Harmony 350's factory configuration holds one of 170 in its activity's start,
but whether the remote honours one is unmeasured, so a caller asking for one here is asking for something
this function cannot honestly do. The same configuration spells that television's own power on delay as
two instructions, 100 and 70, which `powerOnInstructions` does not report and this does not edit.

**Where a family keeps another copy that a key reaches, this changes it too**, asking [`Family.powerOnDelayCopies`](config-types.md#family).
On arch 16 (Harmony 300 and 350) Watch TV switches a device with one power code on by calling that code's list
and a `0x7C` of its own, so the delay is written twice; a device with separate codes is switched through its
`Power` variable and has the one copy.

**What it will not tell you is whether the delay does anything**. The quantity holds
back the next command to its own device and nothing else, so in an activity that sends that device
only its power code the value is inert however large it is. That is a question about an activity
rather than about a device, `powerOnDelayReach` answers it, and it deliberately does not gate this
edit: a delay that is inert in one activity may not be in another.

Uses [`Container`](#container), [`Edit`](#edit).

### `setTimerDuration`

```ts
function setTimerDuration(c: Container, index: number, seconds: number): Edit[]
```

A timer's duration, in seconds.

Uses [`Container`](#container), [`Edit`](#edit).

### `skipIntroductionTour`

```ts
function skipIntroductionTour(c: Container): Edit[]
```

The edit [`introductionTour`](#introductiontour) describes: the tour list's enter becomes a call to its exit.

Uses [`Container`](#container), [`Edit`](#edit).

### `timestampEdit`

```ts
function timestampEdit(c: Container, builtAt: string): Edit[]
```

The edit that stamps base slot 3's record with `builtAt`.

Seven bytes, and the day of week is **computed** rather than taken from the caller, because both
parsers refuse a record whose weekday disagrees with its date. So a caller cannot
produce a record this project's own readers would reject, which is the closure worth having here.

Exported on its own as well as through [`saveEdits`](#saveedits), so a caller who wants to see it in the edit
list before applying it can, and so it goes through exactly the same rails as any other edit.

Uses [`Container`](#container), [`Edit`](#edit).

## Finding a device

Across every source at once, and fetched as a definition a document carries.

### `ACTIVITY_ROLE_NAMES`

```ts
const ACTIVITY_ROLE_NAMES = ['Display', 'Volume', 'ChannelChanging', 'PlayMovie', 'PlayMedia', 'PlayGame'] as const
```

The roles a device can have in an activity, by the names Logitech's contract gives their role types,
[`reference/logitech/data-model/model.md`](../../logitech/data-model/model.md). A device listed with **none** of them is a pass through device, the
contract's `PassThroughActivityRole`: one the signal passes through unaltered, an HDMI switch or an
amplifier that only routes the picture. MyHarmony states it as a role of its own; here it is the
empty list, because it has none of the roles and the compile gives it nothing a role would.

### `ActivityRoleName`

```ts
type ActivityRoleName = (typeof ACTIVITY_ROLE_NAMES)[number];
```

A role a device plays in an activity, in Logitech's word for it.

Uses [`ACTIVITY_ROLE_NAMES`](#activity_role_names).

### `AnyFamily`

```ts
type AnyFamily = Family | DocumentFamily;
```

A family of either kind: `kind` tells them apart.

Uses [`Family`](config-types.md#family-type), [`DocumentFamily`](#documentfamily).

### `CarriedDevice`

```ts
interface CarriedDevice {
  readonly source: string;
  readonly entry: string;
  readonly definition: RecipeDefinition;
  /** The protocol definitions the definition's commands name, as the archive's protocol files hold them. */
  readonly protocols: readonly Readonly<Record<string, unknown>>[];
}
```

A device as a document carries it: where it came from, and its definition with the protocol definitions its
commands are written in. `recipe.addDevice` takes one.

Uses [`RecipeDefinition`](config-types.md#recipedefinition).

### `chooseByModel`

```ts
function chooseByModel(asked: ModelNamed): ModelChoice
```

The model asked about and the family that builds for it, either kind, by its skin where given and by its name
otherwise. **Refuses**, through [`NoFamilyError`](#nofamilyerror) and naming the model: a skin no model has, a name no model has, a
name and a skin that disagree, a name two skins share and no skin given, and a model whose architecture no family
serves.

Uses [`ModelNamed`](#modelnamed), [`ModelChoice`](#modelchoice).

### `DeviceCache`

```ts
interface DeviceCache {
  get(key: string): Promise<Uint8Array | undefined>;
  set(key: string, value: Uint8Array): Promise<void>;
}
```

Where a network source keeps what it fetched, so a device asked for twice is fetched once. The application's:
a folder, a browser's storage, or nothing at all in a test. Keys are the paths the source asked for.

### `DeviceQuery`

```ts
interface DeviceQuery {
  readonly manufacturer?: string;
  readonly model?: string;
  /** The kind of device, by the catalogue's own name for it: `Television`, `StereoReceiver`. */
  readonly type?: string;
  /** The most results wanted over all sources together; absent is a source's own bound. */
  readonly limit?: number;
}
```

What a person typed to find a device: the manufacturer and the model number as text, typing errors allowed,
and the kind of device where they chose one. A field left out is not asked about.

### `DeviceSearch`

```ts
interface DeviceSearch {
  readonly found: readonly FoundDevice[];
  readonly failed: readonly { readonly source: string; readonly message: string }[];
}
```

One search over every source at once: the results of all of them in one list, best first, each naming
its source. A source that fails does not fail the search; what it said is in `failed`.

Uses [`FoundDevice`](#founddevice).

### `DeviceSource`

```ts
interface DeviceSource {
  /** What a result shows as its origin: `archive`, `logitech`, `library`. */
  readonly name: string;
  find(query: DeviceQuery): Promise<FoundDevice[]>;
  fetch(found: FoundDevice, options?: { readonly version?: string }): Promise<CarriedDevice>;
}
```

One place devices are found. `find` answers from the source's index and `fetch` brings one result's definition;
both are asynchronous because two of the four sources are on the network.

Uses [`DeviceQuery`](#devicequery), [`FoundDevice`](#founddevice), [`CarriedDevice`](#carrieddevice).

### `DocumentFamily`

```ts
interface DocumentFamily<T extends DocumentTypes = DocumentTypes> {
  readonly kind: 'document';
  /** For a refusal or a report: the models this family serves, as a person names them. */
  readonly name: string;
  /** A setup file read and checked, refused where it is not one this family builds from. */
  readSetup(json: unknown): T['setup'];
  /** The documents built from a setup alone, with no document of Logitech's as input. */
  build(setup: T['setup'], sources: T['sources']): T['documents'];
  /**
   * The pictures of ours a set built from a setup carries beside its documents, at the addresses the documents make
   * the remote ask for them: a build is the documents and these together.
   */
  buildPictures(setup: T['setup']): readonly T['picture'][];
  /** The configuration with no device and no activity, made from the documents a remote holds. */
  empty(documents: T['documents']): T['documents'];
  /** The documents with a device of ours added. */
  withDevice(documents: T['documents'], device: T['device']): T['documents'];
  /** The documents with an activity of ours added. */
  withActivity(documents: T['documents'], activity: T['activity']): T['documents'];
  /** The documents with devices and activities taken out, with everything that names them. */
  without(documents: T['documents'], removal: T['removal']): T['documents'];
  /** The documents with favourites composed from a description, and the pictures of ours they ask for. */
  withFavourites(documents: T['documents'], favourites: T['favourites']): { readonly documents: T['documents']; readonly pictures: readonly T['picture'][] };
  /** The documents with the remote's settings changed as a description says. */
  withSettings(documents: T['documents'], settings: T['settings']): T['documents'];
  /** The documents read as the remote reads them. */
  read(documents: T['documents']): T['configuration'];
  /** What the remote would refuse in the documents, empty where a sync may deliver them. */
  check(documents: T['documents']): readonly T['finding'][];
  /**
   * The family's maps, `maps.ts`: the same interface a compiled family carries, `Family.maps`, so the
   * places, the default maps and their resolving are asked the same way of every model. Absent where the family states
   * none yet, as the Harmony Touch's family does.
   */
  readonly maps?: FamilyMaps;
  /**
   * The remote's own settings a document may state, `settings.ts`: the same interface a compiled family carries,
   * `Family.settings`, so which settings a model has is asked the same way of every model. Absent where the family's
   * build reads none from a document.
   */
  readonly settings?: FamilySettings;
}
```

A family whose remotes are given documents. Every change returns the whole set, the
documents it changed in place of the ones it was given and every other as given, so a caller never merges.
Each member refuses what the family's composer or reader refuses, with that refusal.

Uses [`DocumentTypes`](#documenttypes), [`FamilyMaps`](config-types.md#familymaps), [`FamilySettings`](config-types.md#familysettings).

### `DocumentTypes`

```ts
interface DocumentTypes {
  /** A set of the remote's documents, the whole set a remote holds or is to be given. */
  readonly documents: unknown;
  /** A setup the family builds from, as its own reader of a setup file gives it. */
  readonly setup: unknown;
  /** What building from a setup takes besides the setup: an archive, an account. */
  readonly sources: unknown;
  /** A device as a description states it. */
  readonly device: unknown;
  /** An activity as a description states it. */
  readonly activity: unknown;
  /** What to take out: devices and activities, by the ids the documents give them. */
  readonly removal: unknown;
  /** Favourites as a description states them. */
  readonly favourites: unknown;
  /** A picture of ours that goes with the documents, at the address the remote asks for it. */
  readonly picture: unknown;
  /** The remote's settings as a description states them. */
  readonly settings: unknown;
  /** The documents read: what the remote will do with them. */
  readonly configuration: unknown;
  /** One thing the check finds the remote would refuse or ignore. */
  readonly finding: unknown;
}
```

The types a document family works in, each the family's own.

### `familyKind`

```ts
function familyKind(family: AnyFamily): 'compiled' | 'document'
```

A family's kind, [`Family.kind`](config-types.md#family) or [`DocumentFamily.kind`](#documentfamily), which every family states.

Uses [`AnyFamily`](#anyfamily).

### `familyOfModel`

```ts
function familyOfModel(asked: ModelNamed): AnyFamily
```

The family that builds for a model, either kind, or a refusal naming the model, [`chooseByModel`](#choosebymodel).

Uses [`ModelNamed`](#modelnamed), [`AnyFamily`](#anyfamily).

### `fetchDevice`

```ts
async function fetchDevice(
  sources: readonly DeviceSource[], found: FoundDevice, options?: { readonly version?: string },
): Promise<CarriedDevice>
```

Fetch one result's definition from the source that found it; `version` chooses among [`FoundDevice.versions`](#founddevice).
Refused, as an [`ArchiveError`](#archiveerror), where the result names a source that was not handed in: a result is only good with
the sources it came from.

Uses [`DeviceSource`](#devicesource), [`FoundDevice`](#founddevice), [`CarriedDevice`](#carrieddevice).

### `findDevices`

```ts
async function findDevices(sources: readonly DeviceSource[], query: DeviceQuery): Promise<DeviceSearch>
```

Ask every source for a device: all of them at once, their results in one list, best first and then by
manufacturer and model so that the order is the same on every run, cut to the query's limit. A source that throws
is named in `failed` with what it said and the others' results stand, since one source being away is the ordinary
case and not a reason to show nothing.

Uses [`DeviceSource`](#devicesource), [`DeviceQuery`](#devicequery), [`DeviceSearch`](#devicesearch).

### `FoundDevice`

```ts
interface FoundDevice {
  /** The name of the source it came from, `DeviceSource.name`, which is what a result shows as its origin. */
  readonly source: string;
  /** The source's own name for the device, `<manufacturer>/<file>` in the archive; what a document keeps as `device`. */
  readonly entry: string;
  readonly manufacturer: string;
  readonly model: string;
  /** The kind of device, where the source states one. */
  readonly type?: string;
  /** How well it fits what was typed, from 0 to 1, 1 an exact match. Results come best first. */
  readonly match: number;
  /** The versions of its code set, where the source holds several; the first is the one fetched unless another is asked for. */
  readonly versions?: readonly string[];
}
```

One result of a search: enough to show in a list and to fetch the device by.

### `ModelChoice`

```ts
interface ModelChoice {
  readonly skin: number;
  /** The model table's record, or undefined for a model `MODELS_OUTSIDE_THE_TABLE` names. */
  readonly model: Model | undefined;
  readonly family: AnyFamily;
}
```

What choosing by model found: the skin, the model table's record where it has one, and the family.

Uses [`Model`](base.md#model), [`AnyFamily`](#anyfamily).

### `modelName`

```ts
function modelName(model: Model): string
```

Logitech's name for a model record: "Harmony 650" for the record called "650".

Uses [`Model`](base.md#model).

### `ModelNamed`

```ts
interface ModelNamed {
  readonly name: string;
  readonly skin?: number;
}
```

A model as it is asked about: Logitech's name, "Harmony 650", and the skin where known.

### `NetworkArchiveOptions`

```ts
interface NetworkArchiveOptions {
  /** Fetch one URL's bytes; refuses by throwing, which a search reports for that source and goes on with the others. */
  readonly fetch: (url: string) => Promise<Uint8Array>;
  readonly cache: DeviceCache;
  /** The archive release to read, by its tag; absent is the one this version of the libraries was measured at. */
  readonly release?: string;
}
```

What the network's archive source is given: the application's way to fetch a URL, its cache, and which release it reads.

Uses [`DeviceCache`](#devicecache).

### `networkArchiveSource`

```ts
function networkArchiveSource(options: NetworkArchiveOptions): DeviceSource
```

**Not built yet**: the device archive read over the network a device at a time, from its own index, kept in the
cache given. It throws [`NotBuiltError`](#notbuilterror) when called; [`archiveSourceAt`](config-node.md#archivesourceat) of `@freeharmony-sdk/config/node` reads an
archive from a folder on disk instead.

Uses [`NetworkArchiveOptions`](#networkarchiveoptions), [`DeviceSource`](#devicesource).

### `NoFamilyError`

```ts
class NoFamilyError extends ComposeError {}
```

What the registry refuses with: a model or a configuration no family serves. A [`ComposeError`](#composeerror), since what asks
is a composer and every caller that already meets a composer's refusal meets this one the same way.

Uses [`ComposeError`](#composeerror).

## Infrared

A configuration's codes, a code heard or learned cut into frames, Pronto Hex, the table of protocol rhythms, and Logitech's device catalogue and protocol definitions as parsed from what a caller hands over (the Node entry reads them off the disk).

### `ArchiveError`

```ts
class ArchiveError extends Error {}
```

A device archive that cannot be read or does not hold what was asked of it: an archive missing, or without its
index or manifest, or of a version this reader does not know; no such manufacturer, device or code set in it; an
entry whose steps or fields have a shape this reader does not know, or a key that names a code set or a protocol
the archive does not hold; a press with no command; and a device found by a source that is not among those given.

### `ArchiveManifest`

```ts
interface ArchiveManifest {
  readonly schemaVersion: number;
  readonly generated: string;
  readonly counts: Readonly<Record<string, number>>;
}
```

What an archive's manifest states, once its schema version is one this reader knows.

### `ArchiveProtocol`

```ts
interface ArchiveProtocol {
  readonly name: string;
  readonly carrierHz: number;
  readonly definition: Definition;
  /** Per field, the width in bits and which segment carries it. */
  readonly keycodeFields: Readonly<Record<string, {
    readonly bits: number;
    readonly segment: string;
    readonly sequence: string;
    readonly toggleBit: number | null;
    /** Their own ordering key. Object key order is not the field order and must not be relied on. */
    readonly token: number;
  }>> | null;
  readonly logitechProtocolId: number | null;
  /** Their own name for the standard the family is a case of, `NEC1`, `Denon-K`, `SharpDVD`. */
  readonly standardProtocol: string | null;
  readonly pressMinimumRepeats: number | null;
  /** The rhythm in IRP notation, kept for a human reader and deliberately not parsed. */
  readonly irp: string | null;
}
```

One protocol file of the archive, as it sits on disk.

Uses [`Definition`](config-types.md#definition).

### `CatalogueCommand`

```ts
interface CatalogueCommand {
  /** Logitech's own canonical command name: `VolumeUp`, `ChannelPrev`, `4`, `Mute`. */
  readonly name: string;
  /** The keycode string, which `statedCode` parses. */
  readonly keycode: string;
  /** The archive's rendered waveform, only when asked for: it is 95% of the file's bytes. */
  readonly pronto?: string;
}
```

One command: the name a person would recognise, and the code to send.

### `CatalogueDevice`

```ts
interface CatalogueDevice {
  readonly manufacturer: string;
  /** Null for the same three devices, and for the same reason. See `CatalogueModel.model`. */
  readonly model: string | null;
  /**
   * Logitech's own numeric device type. **Not an index into the `DeviceType` enum** in
   * `reference/logitech/data-model/model.json`, which is serialised alphabetically, so its index 1 is `Default` and
   * its 4 is `CableBox`. See `DEVICE_TYPE_NAMES` for the values that are named and how.
   */
  readonly deviceType: number;
  readonly globalDeviceId: number;
  /** The codeset path relative to the archive root, absent for the 18781 devices with no codes. */
  readonly codeset?: string;
}
```

One device: what it is, and where its codes live.

### `CatalogueManufacturer`

```ts
interface CatalogueManufacturer {
  /** The display name, which is what a person picks from: `1 by one`, `3B Technology`, `Sony`. */
  readonly name: string;
  /** The directory name, which is the display name with its punctuation replaced. */
  readonly slug: string;
  /** How many devices the manufacturer has, so a picker can show it without opening the directory. */
  readonly devices: number;
}
```

One manufacturer, as `index.json` states it.

### `CatalogueModel`

```ts
interface CatalogueModel {
  /**
   * **Null for the three devices that state no model name**, of 278220: one each under Thomson,
   * Gemini and Sony, whose only identity is `globalDeviceId` and whose file is named for it.
   */
  readonly model: string | null;
  /** The file inside `devices/<slug>/`, which is not always the model name: two models may collide. */
  readonly file: string;
  /** Logitech's own id for the device, which is what their live service takes as a key. */
  readonly globalDeviceId: number;
}
```

One model of one manufacturer, as its manufacturer's own index states it.

### `CatalogueSource`

```ts
interface CatalogueSource {
  /** Every protocol definition, `archiveProtocols`. */
  readonly protocols: () => ArchiveProtocol[];
  /** One device by its manufacturer slug and file name, `catalogueDevice`. */
  readonly device: (slug: string, file: string) => CatalogueDevice;
  /** The commands of one codeset, by the path a device states, `catalogueCommands`. */
  readonly commands: (codeset: string, options?: { readonly pronto?: boolean }) => CatalogueCommand[];
  /** One device's driving rules, `catalogueDriving`. */
  readonly driving: (slug: string, file: string) => DeviceDriving;
}
```

The device archive as a builder reads it: the four questions a composer asks of it, handed in rather than read
from a path, so the builders load where there is no disk. [`archiveAt`](config-node.md#archiveat) of `@freeharmony-sdk/config/node` answers them
from a folder on disk; a renderer answers them from wherever it holds the archive. Each answers as the reader it is
named after.

Uses [`ArchiveProtocol`](#archiveprotocol), [`CatalogueDevice`](#cataloguedevice), [`CatalogueCommand`](#cataloguecommand), [`DeviceDriving`](#devicedriving-type).

### `codeKey`

```ts
function codeKey(hex: string): string
```

How a code number is keyed: lower case hexadecimal with no leading zeroes.

**The normalisation is load bearing.** Logitech pads a keycode's number to a whole number of nibbles
and our decoder does not, so a Sony frame is `70` here and `070` there, which is the same code. That
exact mistake was made once already when comparing our decoding against their analyser.

### `commandsOfCodeset`

```ts
function commandsOfCodeset(parsed: unknown, options: { readonly pronto?: boolean } = {}): CatalogueCommand[]
```

The commands of a parsed codeset file, with `pronto` left out unless asked for, [`catalogueCommands`](config-node.md#cataloguecommands) in
[`catalogue.node.ts`](../../../packages/config/src/catalogue/catalogue.node.ts) says why.

Uses [`CatalogueCommand`](#cataloguecommand).

### `DEVICE_TYPE_NAMES`

```ts
const DEVICE_TYPE_NAMES: ReadonlyMap<number, string>
```

What Logitech's numeric device type means, for the values something outside the archive has named.

**Three of these are Logitech's own words** and one is corroborated rather than stated. Their live
service returns a `DeviceType` number beside a `DeviceTypeDisplayName`, and a captured reply of
theirs pairs 1 with `Television`, 4 with `DVD` and 5 with `StereoReceiver`. Type 2 is not in that reply;
what names it is our own corpus, where the one device group a config's owner labelled `VCR` identifies
a device the archive types 2, and the archive's own README says 2 is a VCR as well.

**The other 42 values in use are deliberately unnamed.** Naming them by guessing from the models that
carry them is exactly the kind of fit this project refuses; what would settle them is more captured
replies, one per type, and that is cheap whenever it is wanted.

### `DeviceChannelTuning`

```ts
interface DeviceChannelTuning {
  /** Every number is sent with exactly this many digits, so channel 7 is `07`. */
  readonly fixedDigits?: number;
  readonly start?: readonly DriveStep[];
  /** After the digits, usually `Enter`. */
  readonly finish?: readonly DriveStep[];
  /** Before the digits of a number above 9, and above 99. */
  readonly greaterTen?: readonly DriveStep[];
  readonly greaterHundred?: readonly DriveStep[];
}
```

How a channel number is entered.

Uses [`DriveStep`](config-types.md#drivestep).

### `DeviceDriving` (type)

```ts
interface DeviceDriving {
  readonly timing: DeviceTiming;
  readonly power?: DevicePower;
  readonly inputs?: DeviceInputs;
  readonly channelTuning?: DeviceChannelTuning;
  /** By state name, in the record's order. */
  readonly states?: ReadonlyMap<string, DeviceState>;
}
```

Everything the archive says about driving one device. `timing` is on every record; the other four are
**absent rather than empty** where Logitech had nothing to say, which is the archive's own convention.

Uses [`DeviceTiming`](#devicetiming), [`DevicePower`](#devicepower), [`DeviceInputs`](#deviceinputs), [`DeviceChannelTuning`](#devicechanneltuning), [`DeviceState`](#devicestate).

### `deviceDriving`

```ts
function deviceDriving(record: unknown): DeviceDriving
```

The driving half of one parsed device record. Pure, so a caller holding the record already, or a test
holding a record it made up, needs no checkout; [`catalogueDriving`](config-node.md#cataloguedriving) in [`driving.node.ts`](../../../packages/config/src/catalogue/driving.node.ts) reads one off a checkout.

Throws on a record with no `timing`, which is every record of schema version 1: a reader that returned
nothing there would report a device with no rules, where the truth is an archive too old to say.

Uses [`DeviceDriving`](#devicedriving-type).

### `DeviceInput`

```ts
interface DeviceInput {
  readonly name: string;
  /** What reaches it. Absent on 411756 inputs, which belong to devices that can only step through. */
  readonly commands?: readonly DriveStep[];
  /** Logitech's own labels for the sockets behind it, `HDMI`, `Antenna`, an open set. */
  readonly ports?: readonly string[];
}
```

One input as the device names it.

Uses [`DriveStep`](config-types.md#drivestep).

### `DeviceInputs`

```ts
interface DeviceInputs {
  /** A Logitech enumeration nobody has decoded, passed through as the number it is. */
  readonly type: number;
  /** Absent on three records that state a type and no list. */
  readonly list?: readonly DeviceInput[];
  readonly next?: readonly DriveStep[];
  readonly previous?: readonly DriveStep[];
  /** Performed before an input change and after it. */
  readonly start?: readonly DriveStep[];
  readonly finish?: readonly DriveStep[];
  readonly canSkip?: boolean;
}
```

A device's inputs as the catalogue states them, and the steps that move between them.

Uses [`DeviceInput`](#deviceinput), [`DriveStep`](config-types.md#drivestep).

### `deviceOfRecord`

```ts
function deviceOfRecord(parsed: unknown): CatalogueDevice
```

One device of a parsed `devices/<slug>/<file>.json`.

Uses [`CatalogueDevice`](#cataloguedevice).

### `DevicePower`

```ts
interface DevicePower {
  readonly type: 'discrete' | 'toggle' | 'none' | 'unknown';
  readonly on?: readonly DriveStep[];
  readonly off?: readonly DriveStep[];
  readonly toggle?: readonly DriveStep[];
  /** Run after power on to put the device in a known state, usually a `state` step naming an input. */
  readonly onReset?: readonly DriveStep[];
}
```

How the device is switched on and off. **Read `type` before sending anything**: on a `toggle` device
the one power command flips the state, so sending it blind switches a device that is already on off.

Uses [`DriveStep`](config-types.md#drivestep).

### `DeviceState`

```ts
interface DeviceState {
  readonly values: readonly DeviceStateValue[];
  readonly next?: readonly DriveStep[];
  readonly previous?: readonly DriveStep[];
  readonly start?: readonly DriveStep[];
  readonly finish?: readonly DriveStep[];
  /** A pause between steps through the values, on 36 states. */
  readonly valueDelay?: number;
}
```

One state a device keeps, which a `state` step names.

Uses [`DeviceStateValue`](config-types.md#devicestatevalue), [`DriveStep`](config-types.md#drivestep).

### `DeviceTiming`

```ts
interface DeviceTiming {
  /** The pause after a command before the next one to this device. */
  readonly interKeyDelay: number;
  /** The pause after a command before one to another device. */
  readonly interDeviceDelay: number;
  /** The same while a key is held. */
  readonly holdInterDeviceDelay: number;
  /** How long the device needs after power on before it listens. Absent on 8184 of 278220 records. */
  readonly powerOnDelay?: number;
  /** How long an input change takes to settle. */
  readonly inputDelay: number;
  /** Logitech's delay for a device driven through a connected app. Zero on 270945 of 278220 records. */
  readonly connectedAppPowerOnDelay: number;
  /** How many times one press sends the code. */
  readonly pressMinRepeats: number;
  /** A second repeat count on 79464 records, Logitech's `MinRepeats`; which one wins is not read here. */
  readonly minRepeats?: number;
  readonly isInterKeyDelayOptimized: boolean;
}
```

How fast the device may be driven. Every value is in milliseconds except the two repeat counts.

### `framesOfPulses`

```ts
function framesOfPulses(train: readonly Pulse[], headerPairs = 1, gapUs?: number): IrFrame[]
```

The same as [`irFrames`](#irframes), from a pulse train a caller already has, with no container: the leading gap is trimmed,
and adjacent durations of one kind are merged first, since a receiver cannot see the join.

Uses [`Pulse`](#pulse), [`IrFrame`](#irframe-type).

### `fromFirstMark`

```ts
function fromFirstMark(train: readonly Pulse[]): readonly Pulse[]
```

A pulse train from its first mark, which is where a frame starts.

Exported so that the encoder below and the decoder above agree about it. A block commonly opens with
several 32767 spaces and then a shorter one, and two copies of that rule are two copies.

Uses [`Pulse`](#pulse).

### `Identification`

```ts
interface Identification {
  readonly codeset: string;
  /** How many of the group's numbers this codeset holds. */
  readonly hits: number;
  /** How many the next best codeset holds, which is what says whether the answer is a single one. */
  readonly runnerUp: number;
  readonly of: number;
}
```

What an identification found: the codeset, how many of the asked for numbers it holds, and the margin.

### `identifyCodeset`

```ts
function identifyCodeset(
  index: ReadonlyMap<string, string[]>, values: readonly string[],
): Identification | undefined
```

Which codeset a set of code numbers came from, ranked.

**The margin is the point, not the winner.** Logitech's catalogue holds families of near identical
codesets, one per model of a range, so a device that matches 108 of 108 will often have a runner up at
105: the answer is a **model range** rather than a single model, and a caller that reads only the top
entry will report a precision the data does not have. Hence `runnerUp` sits in the result rather than
being filtered out here.

Uses [`Identification`](#identification).

### `IrFrame` (type)

```ts
interface IrFrame {
  /** How many bits the train encodes. */
  bits: number;
  /**
   * The bits as one integer, first transmitted bit in the most significant position.
   *
   * A `bigint` because 48 bit frames are ordinary here: two of the three protocol families in the
   * calibration account are 48 bits, which a `number` cannot hold exactly above 2 to the 53.
   */
  value: bigint;
  carries: FrameCarrier;
  /**
   * The short and the long duration the split was made on, in microseconds, for a caller that wants
   *  to sanity check the decode against a protocol it already knows.
   */
  short: number;
  long: number;
}
```

An infrared code read as the bits it sends, and the shape of the signal that carries them.

Uses [`FrameCarrier`](config-types.md#framecarrier).

### `irFrame`

```ts
function irFrame(
  c: Container,
  record: number,
  headerPairs = 1,
): IrFrame | undefined
```

The frame a record's first block encodes, or `undefined` where it does not read as one.

**The convention selects itself and that is the closure this rests on.** Under the wrong one every
measured duration is the constant half of the pair, so `SPLIT_RATIO` rejects it: a pulse width
protocol read as pulse distance yields a train of identical spaces. So the caller does not have to
know the protocol family, and a record that decodes under both conventions is a warning rather
than a result. [`irFrames`](#irframes) returns every reading so that a caller can see such a case.

The header is skipped as `headerPairs` whole pairs, one by default: Sony leads with 2400 and 600,
and the two 48 bit families with about 3400 and 1700. A protocol with no header would need zero, so
the parameter exists rather than the constant being wired in.

Uses [`Container`](#container), [`IrFrame`](#irframe-type).

### `irFrames`

```ts
function irFrames(c: Container, record: number, headerPairs = 1): IrFrame[]
```

Every convention under which a record's first block reads as a frame.

Uses [`Container`](#container), [`IrFrame`](#irframe-type).

### `IrGroup`

```ts
interface IrGroup {
  addresses: number[];
  /** The group's own array, so the accounting claims exactly what was read. */
  start: number;
  length: number;
}
```

One device's infrared codes in a configuration: the address of each, and where the list of them sits.

### `irGroups`

```ts
function irGroups(c: Container): IrGroup[] | undefined
```

One group per entry of base slot 5, each a second array of the same shape: a zero byte, the same spare byte the
section table carries, then a 16 bit count, then that many 24 bit record addresses.

Uses [`Container`](#container), [`IrGroup`](#irgroup).

### `irSendsPerPress`

```ts
function irSendsPerPress(c: Container, record: number): number | undefined
```

How many times a press sends the code, or undefined where the record cannot say.

**It is a ratio and not the first block's copy count, and that is the whole finding.** A record's
first block is what one press sends and its second is what repeats while the key is down, so the second block holds exactly one press's worth. Dividing removes whatever the **family**
puts in a press: `Sharp 15 Bit` sends a frame and its complement, so its blocks hold six copies and
two, and the ratio is three, which is the same answer `PanasonicV2 48 Bit` gives from three copies
and one. Reading the first block alone would have called those two devices different.

Undefined where the record names no second block, which is 1927 of the corpus's 3387 records, since
the count is then not stated by anything a reader can divide.

Uses [`Container`](#container).

### `manufacturersOfIndex`

```ts
function manufacturersOfIndex(parsed: unknown): CatalogueManufacturer[]
```

The manufacturers of a parsed `index.json`, in its own order, which is by display name.

Uses [`CatalogueManufacturer`](#cataloguemanufacturer).

### `modelsOfIndex`

```ts
function modelsOfIndex(parsed: unknown): CatalogueModel[]
```

The models of a manufacturer's parsed `devices/<slug>/index.json`.

Uses [`CatalogueModel`](#cataloguemodel).

### `ProntoCode`

```ts
interface ProntoCode {
  /** The carrier word as written, which is what every duration is a multiple of. */
  readonly carrier: number;
  /** The carrier in Hz, derived from that word. */
  readonly hz: number;
  /** Microseconds per unit, which is the carrier word times the clock. */
  readonly unitUs: number;
  /** The first section, one signed value per interval, positive a mark and negative a space. */
  readonly once: readonly number[];
  /** The looping section, empty where the string states none. */
  readonly repeat: readonly number[];
  /**
   * True where a word was wider than the format's four hexadecimal digits, which is a defect in
   * whoever wrote the string rather than a variant of it.
   *
   * A Pronto word is a 16 bit field. The value is read anyway, since it is unambiguous and refusing it
   * loses a comparison over somebody else's overflow, and this flag is what keeps that visible rather
   * than quietly widening the format.
   */
  readonly overlong: boolean;
}
```

A Pronto string read into its two sections, in Pronto units rather than in microseconds.

### `PROTOCOLS`

```ts
const PROTOCOLS: readonly StatedProtocol[]
```

Every family of infrared codes this package can write a code of from its value.

Uses [`StatedProtocol`](#statedprotocol).

### `Pulse`

```ts
interface Pulse {
  mark: boolean;
  us: number;
}
```

A mark or a space, in microseconds.

### `pulsesOfFrame`

```ts
function pulsesOfFrame(t: FrameTimings, bits: number, value: bigint): Pulse[]
```

The pulse train a frame and its timings make, which is the encoder.

**The frame and nothing after it.** A record's block holds the frame one, three, seven, eleven or
thirty times over, with a gap between the copies and a closing silence at the end, and none of that
follows from the bits: it is 140 distinct shapes across the corpus. So this stops where the evidence
does, and a caller that wants a whole block copies the rest from a record that already has one.

Refuses a pulse width frame with no closing space rather than falling back on `flat`, because that
would emit a frame no remote in the corpus has ever stored.

Uses [`FrameTimings`](config-types.md#frametimings), [`Pulse`](#pulse).

### `pulsesOfStatedCode`

```ts
function pulsesOfStatedCode(
  family: string, bits: number, value: bigint, periodNs?: number,
): Pulse[] | undefined
```

The pulses a code of a known family sends for a value of so many bits, or undefined for a family not in
[`PROTOCOLS`](#protocols).

Uses [`Pulse`](#pulse).

### `readPronto`

```ts
function readPronto(text: string): ProntoCode | undefined
```

Read a Pronto string, or undefined where it is not a well formed learned code.

Refused rather than repaired: a wrong word count, a format other than `0000`, a carrier of zero, or
a section whose stated pair count does not match the words present. A silent repair here would show
up later as a waveform that disagrees for a reason nobody could find.

Uses [`ProntoCode`](#prontocode).

### `StatedCode` (type)

```ts
interface StatedCode {
  readonly family: string;
  /** Every item both slots state, in the order they are written, which is the order they are sent. */
  readonly items: readonly StatedItem[];
  /** The values alone, which is what an encoder needs. `items` filtered, kept because every caller wants it. */
  readonly frames: readonly StatedFrame[];
  /** The words alone, in order. A code with none of them states every frame it sends. */
  readonly words: readonly StatedWord[];
  /** The first value's width, which is what a code stating one value means by its width. */
  readonly bits: number;
  /**
   * The same items split back into the three slots the code writes them in, always three arrays and any
   * of them possibly empty.
   */
  readonly groups: readonly (readonly StatedItem[])[];
}
```

An infrared code as a configuration states it, by its family and the values it sends, rather than as pulses.

Uses [`StatedItem`](config-types.md#stateditem), [`StatedFrame`](config-types.md#statedframe), [`StatedWord`](config-types.md#statedword).

### `statedCode`

```ts
function statedCode(
  keyCode: string,
  options: {
    /** The width of each value in **bits**, from the definition rather than the name. */
    readonly widths?: readonly number[];
    /** How many bits one digit of this code's values carries, from the definition rather than the name. */
    readonly bitsPerDigit?: number | readonly number[];
  } = {},
): StatedCode | undefined
```

Read one of Logitech's catalogue codes, or `undefined` where the shape is not one this has seen. The field
widths come out of the family's name, and a value that does not fit its width is refused rather than read as a
wider frame.

Uses [`StatedCode`](#statedcode-type).

### `StatedProtocol`

```ts
interface StatedProtocol {
  /** Logitech's own name for it, as their analyser and their catalogue spell it. */
  readonly family: string;
  /** The carrier as a record states it, a period in nanoseconds. 38 kHz is 26315. */
  readonly periodNs: number;
  /**
   * `[0, 0]` where the protocol has no lead in and opens on its first bit cell.
   *
   * **Absent, with `flat`, `zero`, `one` and `carries`, on a biphase family**, which has none of
   * them: see `biphase` below. A row has one shape or the other and never both, and
   * `test/infrared/stated.test.ts` asserts that.
   */
  readonly header?: readonly [number, number];
  readonly flat?: number;
  /**
   * The opening burst, where the protocol makes it longer than the rest.
   *
   * Only the Sharp family here does, 270 against 260 on every record of it, and it matters because
   * without it a rebuilt code differs from what their compiler emits on its very first pulse.
   */
  readonly firstMark?: number;
  /**
   * The mark of a **set** cell, on the three families whose mark rides with its own cell's bit. `flat` is then the clear cell's mark. Absent everywhere the flat half really is
   * one length.
   */
  readonly oneMark?: number;
  /**
   * The cell states its carried half **first**, so a pair goes out as (carried, constant).
   *
   * `FrameTimings.carriedFirst` in `irframe.ts` carries the argument. The short of it: this spelling is
   * needed only where storing the pair the other way round would change the wire, which is seven of the
   * 37 families that state it this way, and **no measured row sets it**, our corpus decoder reading a
   * stored train as (mark, space) pairs by construction.
   */
  readonly carriedFirst?: boolean;
  readonly zero?: number;
  readonly one?: number;
  readonly carries?: FrameCarrier;
  /** The constant total a pulse width frame is padded out to, absent on a pulse distance one. */
  readonly framePeriod?: number;
  /**
   * The whole first block past the frame: the frame in its copies (`full` with the
   * lead in, `bare` without), literal words (signed microseconds, positive a mark), and pad
   * spaces sharing one per record value plus the stated extra, solved from `total`. Absent where
   * the family's records do not agree on one shape, and `blockOfStatedCode` refuses such a
   * family rather than guessing, because a tail can hold a second command.
   *
   * **On a `source: 'stated'` row this is derived from Logitech's own definition rather than
   * measured**, and `tailExact` is absent there because there is nothing to have
   * rebuilt. The derivation reproduces all 29 measured blocks to the microsecond, which is the
   * reason to believe it; a stated row only carries one where the definition also states how many
   * times a repetition is sent, since that half is stated on 39 of their 684 definitions.
   */
  readonly tail?: {
    readonly items: readonly ({
      readonly copy: 'full' | 'bare';
      readonly at?: number;
      /** Which of the family's rhythms this copy goes out in, indexing `also` offset by one. */
      readonly shape?: number;
    }
      | {
        readonly words: readonly number[];
        /** These words are the following copy's own lead in, so its copy period counts them, `BlockTailItem`. */
        readonly ofCopy?: boolean;
      }
      | {
        readonly pad: number;
        /** This pad's own copy period, overriding the block's. */
        readonly period?: number;
      })[];
    readonly total?: number;
    readonly copyPeriod?: number;
  };
  /** How many of the family's records rebuild their whole first block from this entry. */
  readonly tailExact?: number;
  /**
   * The held block, the record's second pointer: what repeats for as long as the key is down, and
   * whose duration is the repeat rate the user feels. Same shape as `tail`. Whether
   * a record carries one at all is the command's own property, so `heldOf` states the population
   * On a stated row it is derived from Logitech's definition rather than measured, and every stated row
   * carries one, a repetition holding no count.
   * this was measured over, and Toshiba's is its ditto frame alone with no copy in it.
   */
  readonly held?: {
    readonly items: readonly ({
      readonly copy: 'full' | 'bare';
      readonly at?: number;
      /** Which of the family's rhythms this copy goes out in, indexing `also` offset by one. */
      readonly shape?: number;
    }
      | {
        readonly words: readonly number[];
        /** These words are the following copy's own lead in, so its copy period counts them, `BlockTailItem`. */
        readonly ofCopy?: boolean;
      }
      | {
        readonly pad: number;
        /** This pad's own copy period, overriding the block's. */
        readonly period?: number;
      })[];
    readonly total?: number;
    readonly copyPeriod?: number;
  };
  readonly heldExact?: number;
  readonly heldOf?: number;
  /**
   * The first transmission at **one** repetition: what precedes the repetition, then one of it. Written on a
   * stated row whose definition states no repeat count, where `tail` is not.
   *
   * **Why a field of its own and not a `tail` at a count of 1.** A `tail` is the compiler's first block, the
   * repetition sent as many times as the family's count, and a builder of a compiled configuration sends it as
   * it stands; written at a count nobody stated, it would be the guess the paragraph on stated rows refuses.
   * This is the same block with the count left out, which is all a reader that takes the count from somewhere
   * else needs: a Harmony Touch sends a code as many times as the device says and never reads a family's own,
   * so `definitionOfRow` in `families/harmony-touch/definition.ts` takes the start group from it. Nothing that builds
   * a compiled configuration reads it.
   */
  readonly opening?: {
    readonly items: readonly ({
      readonly copy: 'full' | 'bare';
      readonly at?: number;
      /** Which of the family's rhythms this copy goes out in, indexing `also` offset by one. */
      readonly shape?: number;
    }
      | {
        readonly words: readonly number[];
        /** These words are the following copy's own lead in, so its copy period counts them, `BlockTailItem`. */
        readonly ofCopy?: boolean;
      }
      | {
        readonly pad: number;
        /** This pad's own copy period, overriding the block's. */
        readonly period?: number;
      })[];
    readonly total?: number;
    readonly copyPeriod?: number;
  };
  /**
   * A biphase family, where the bit is in **which half** of one cell the carrier is on.
   * There is no lead in pair, no constant half and no two carried lengths, so none of the
   * fields above apply: what there is instead is one half cell, a fixed prelude the family always sends,
   * and which half of the cell means a set bit. Four families here are of this kind and each reproduces
   * every one of its records byte for byte.
   */
  readonly biphase?: {
    /** One half cell of carrier. */
    readonly mark: number;
    /** One half cell of silence. */
    readonly space: number;
    /** A different opening mark where the family sends one. */
    readonly firstMark?: number;
    /** Everything before the first bit cell, exactly as a record stores it. */
    readonly lead: readonly { readonly mark: boolean; readonly us: number }[];
    /** Whether a mark in the **first** half of a cell means a set bit. RC-6 is the other way up. */
    readonly setIsMark: boolean;
  };
  /**
   * The frame is one value sent in sections of these widths.
   *
   * `Samsung 38 Bit` is the family that needed it: the catalogue states two values per code and one
   * width, and the wire is one header, the first section's cells, a structural space carrying that
   * section's final set bit, the second section's cells, and a closing silence carrying the last bit of
   * all. The widths sum to the width the family's name states, which is the closure that settled what
   * "38 Bit" means: across the pair.
   */
  readonly sections?: readonly number[];
  /** The space carrying a non final section's last set bit. Present exactly when `sections` is. */
  readonly sectionSpace?: number;
  /** The closing silence, which on a sectioned family carries the final bit and is a measured constant. */
  readonly closing?: number;
  /**
   * The long toggle shape, set instead of the frame and biphase fields, one family.
   *
   * A code states three values, and the wire is a leader, head cells per kind, one double width toggle
   * cell stored merged, data cells per position, and the whole frame `copies` times with the stored
   * `gap` words after each. A set bit is the cell whose first half is silence, in all three regions.
   * `pulsesOfLongToggle` in `irframe.ts` is the emitter and reproduces every record of the
   * family word for word, copies and gaps included.
   */
  readonly longToggle?: {
    readonly leader: readonly [number, number];
    readonly head: { readonly mark: number; readonly space: number; readonly bits: number };
    readonly toggle: number;
    readonly data: { readonly first: number; readonly second: number; readonly bits: number };
    readonly gap: readonly number[];
    readonly copies: number;
  };
  /**
   * The quaternary shape, set instead of the frame and biphase fields, one family.
   *
   * `Quad` in the family's name is the base of its digits twice over: the catalogue writes the
   * values in base 4 and the wire sends one digit per cell as one of four space lengths, two bits at a
   * time, each cell closed by the constant `mark`. A constant start digit of 0 precedes the values,
   * `digits` says how many quaternary digits each stated value takes, and the stored `gap` words
   * close the record. `pulsesOfQuad` in `irframe.ts` is the emitter and reproduces every record
   * word for word, gap included.
   */
  readonly quad?: {
    readonly firstMark: number;
    readonly mark: number;
    readonly spaces: readonly [number, number, number, number];
    readonly digits: readonly number[];
    readonly gap: readonly number[];
  };
  /**
   * A cell table family: the bit is **which of four or sixteen cell shapes** goes on the wire.
   * Logitech's own `EncodingType` 2 and 3 say so and their definition then lists one cell
   * per symbol value, so a value is read a digit at a time and each digit picks a whole cell rather
   * than a length. 140 of their families are of this kind, against the one the corpus could see, and
   * that one, `Galaxis 16 Bit Quad Toggle`, is the `quad` shape above: the same idea read off a
   * stored train instead of off a definition, which is why both exist.
   *
   * A row has this or one of the shapes above and never two, and `test/infrared/stated.test.ts` asserts it.
   * The width comes from the code, so `bits` here is one **cell's** width and not the frame's.
   */
  readonly cells?: {
    readonly lead: readonly number[];
    readonly cells: readonly (readonly number[])[];
    readonly bits: number;
  };
  /**
   * The **other** rhythms this family sends, where one repetition is not all one shape.
   * `Classe 16 Bit Toggle` sends four mode bits at a 442 microsecond half cell, then one
   * bit at 880, then sixteen data bits at 442, so three of Logitech's own segments with three different
   * cells go out back to back. A copy item's `shape` indexes this list, offset by one because index 0
   * is the row's own shape above.
   *
   * **Written in the emitter's own spelling and not in the row's**, deliberately: the fields above are
   * this table's older flat spelling of one shape, and the extras are handed to `pulsesOfBlock` as they
   * stand. Two spellings in one row is the cost of not migrating 600 rows, and `shapeOf` in
   * `stated.ts` is the single place that joins them.
   *
   * **A row carrying a block whose copies name a shape must carry that shape.** That is asserted rather
   * than assumed, because the same omission has already shipped once: `carriedFirst` was live in the
   * reader and missing from this generator's template for one run, and seven rows then described a
   * rhythm correctly and emitted the wrong wire.
   */
  readonly also?: readonly FrameShape[];
  /** How many corpus codes the entry was measured over, and how many it reproduces exactly. */
  readonly codes: number;
  readonly exact: number;
  /** The tightest band, as a fraction, that covers every code of the entry. */
  readonly spread: number;
  /**
   * Where the durations came from, which decides what the entry is worth.
   *
   * `corpus` is measured off records a configuration already holds, so it reproduces what Logitech's
   * own compiler emitted and `exact` says how often. `documented` is the published nominal timing of
   * that protocol, taken from third party protocol documentation, for a family **no configuration here
   * holds a single record of**: the corpus cannot supply it and no amount of reading it will.
   *
   * A documented entry has `codes: 0` because it was measured over none, which is the honest number
   * and not a placeholder. What it has instead is `readBack`.
   *
   * `learned` is never in this table: it is a row of our own fitted to one learned code that no row here
   * fits, `rhythmOfLearned` in `families/harmony-touch/learned.ts`, measured over that one code and rendered back
   * against it, so its `codes` and `exact` are 1 and 0 and its `spread` is the largest share any of
   * its durations sits from the learned one.
   */
  readonly source: 'corpus' | 'compiled' | 'both' | 'documented' | 'stated' | 'learned';
  /**
   * Catalogue codes emitted with this rhythm that Logitech's own analyser decoded back to the exact
   * number they were built from.
   */
  readonly readBack?: number;
  /**
   * What their analyser calls this rhythm, where that is not what their catalogue calls it.
   *
   * **Their analyser's family list is coarser than their catalogue's**, which is measured: emitting a
   * `Pioneer 32 Bit 2` code with Pioneer's durations comes back named `Pioneer 32 Bit`, and their two
   * Sharp families both come back `Proceed 14 Bit`. So a name that does not match is not a wrong
   * rhythm, and name agreement is sufficient evidence rather than necessary.
   */
  readonly heardAs?: string;
}
```

One family of infrared codes, in Logitech's name for it: its carrier, how its bits are sent, and what follows
a code.

Uses [`FrameCarrier`](config-types.md#framecarrier), [`FrameShape`](config-types.md#frameshape).

### `statedProtocol` (value)

```ts
function statedProtocol(family: string, periodNs?: number): StatedProtocol | undefined
```

The entry for a family, at a carrier where one is given.

**The carrier is part of the key and that is measured, not tidiness.** SharpO1 48 Bit arrives at 36.4
and 38 kHz and its durations came out as two sets until they were split that way, after which each half
reproduces every one of its codes to the microsecond. So asking without a carrier is asking for
whichever variant was measured over more codes, which is the best guess available and is not the same
question.

Uses [`StatedProtocol`](#statedprotocol).

### `waveformOfArchiveCommand`

```ts
function waveformOfArchiveCommand(
  protocol: ArchiveProtocol, keycode: string,
  options: {
    readonly storedForm?: boolean; readonly repeats?: number; readonly asStored?: boolean;
    /** Under `asStored`, the code with its toggle bit flipped, `withToggleFlipped`: a record's second group. */
    readonly toggleFlipped?: boolean;
  } = {},
): { once: Pulse[]; held: Pulse[]; release?: Pulse[] } | { refusal: WaveformRefusal }
```

The waveform one command of Logitech's catalogue sends, from their own protocol definition. `storedForm` keeps the
one microsecond a configuration's last duration carries and a rendering does not, so a comparison against the
archive's own renderings passes `false` and a writer wants the default. `asStored` gives the blocks as a configuration holds them:
the toggle bit as the code states it, and the release block apart as `release`.

Uses [`ArchiveProtocol`](#archiveprotocol), [`Pulse`](#pulse), [`WaveformRefusal`](config-types.md#waveformrefusal).

### `writePronto`

```ts
function writePronto(
  hz: number,
  once: readonly { readonly mark: boolean; readonly us: number }[],
  repeat: readonly { readonly mark: boolean; readonly us: number }[] = [],
): string
```

Render a pulse train as a Pronto string, the once section and the looping one.

## Its devices and activities

What each device is and sends, what each activity starts and binds, the device mode maps and the keys, and the delays.

### `activities`

```ts
function activities(c: Container): Activity[]
```

The activities, with what each one actually does.

[`activityNames`](#activitynames) says which key starts an activity and what it is called; this adds which **devices**
it drives, which is the other half of what an interface shows. The route is the base slot 9 set the
starting chain selects: that set is the key map the activity installs, so the devices
its bindings send to are the devices the activity uses. An activity in the corpus drives one to three
of them.

The union is over the whole set rather than over the start sequence alone, deliberately: an activity
that sends the volume to a receiver is using that receiver whether or not it switched it on.

Uses [`Container`](#container), [`Activity`](#activity).

### `Activity`

```ts
interface Activity extends ActivityName {
  /** The base slot 9 set the chain selects: the activity's own key map while it runs. */
  set: number;
  /** The devices it addresses, by infrared group, ascending. */
  devices: number[];
}
```

An activity, with the devices it drives and the key map it installs.

Uses [`ActivityName`](#activityname).

### `ActivityBinding`

```ts
interface ActivityBinding {
  /** The value written into `CurrentActivityState`. */
  activity: number;
  /** Index into `modePages`, which is the screen the button belongs to. */
  page: number;
  /** The tagged list's key code: an event type in `0xC0` and a scan code in `0x3F`. */
  tag: number;
  /** The scan code alone, which is what a silhouette would eventually name. */
  scan: number;
  /** The base slot 10 list the binding runs, which is where the selection happens. */
  list: number;
  /** The base slot 9 set that list selects. */
  set: number;
}
```

One way a button reaches one activity.

### `activityBindings`

```ts
function activityBindings(c: Container): ActivityBinding[]
```

Every button binding that starts an activity, and which activity it starts.

**This is the chain an interface needs and it took four hops to find.** A page's
tagged list binds a key to opcode `0x7F`, which names a base slot 10 action list; that list
carries `0x1F` with operand `0xFF | set`, which selects a base slot 9 binding set; that set's own
tagged list carries another `0x7F`, naming the list that writes `CurrentActivityState`.

Two routes were ruled out before this one: no screen switch reads the variable's
index, and base slot 14's value maps point at targets that draw no text, and the touch hit map exists on arch 12
alone.

The closure is a count. The number of base slot 10 lists that write the variable equals the
activity count exactly, in every container that has a name tree, across four architectures. So
there is one such list per activity and no spares.

Uses [`Container`](#container), [`ActivityBinding`](#activitybinding).

### `activityCount`

```ts
function activityCount(c: Container): number | undefined
```

How many activities the config defines, or undefined when it has no name tree to say so.

Uses [`Container`](#container).

### `ActivityName`

```ts
interface ActivityName {
  activity: number;
  /** Index into `modePages`: the one page in the container whose keys start this activity. */
  page: number;
  /** The scan codes on that page which start it, in the page's own order. */
  scans: number[];
  /** The base slot 6 modes the chain enters, which is where the name comes from. */
  modes: number[];
  /** The label drawn on the page for this activity, when exactly one string resolves to it. */
  name?: string;
  /** Where that label is drawn, which is what makes it attributable in the first place. */
  at?: { x: number; y: number };
}
```

An activity, the page whose keys start it, and its name where the config lets us name it.

### `activityNames`

```ts
function activityNames(c: Container): ActivityName[]
```

Which activity a drawn name belongs to.

The question the application could not answer: a mode page's screen program draws the activity
names and nothing else names them, so listing them was possible and saying which entry
starts which activity was not. [`activityBindings`](#activitybindings) gets as far as the **page**. This gets to the
string on it, and the route is not geometry:

1. the activity's chain enters one or more base slot 6 modes, by opcode `0x7E`
2. those modes' own pages draw text, and one of their strings is the activity's name, because a
   remote entering an activity puts its name on the screen
3. so the page's string that relates to one of those is this activity's label

"Relates to" is a string the modes say **exactly**, and containment either way only where nothing is
said exactly, which is what the Harmony 700 needs: its menu label is the name plus a qualifier and
its splash screen is a verb plus the name, so the two share the name and neither equals it.

**A string several activities of one page claim is chrome**, a title or a footer, and is dropped.
That is what separates the label from the "Starting" splash text every row shares.

**A label the menu wrapped onto a second row** is looked for last, and only for an activity nothing
else resolved, which is a Harmony 525 and nothing else here.

**Arch 12 does not use any of that, and it runs first**. No string rule can work on a
touch panel: three pages of one Harmony One configuration bind activities on scans {50,51,52}, {50,48,49} and {48,49}
while each draws its labels at the same rows, so no fixed code to row map exists. A Harmony One takes
the label from base slot 17's hit map instead, through the index in the mode page's own `lead` byte,
so the rectangle is stated and the label is the text the firmware's hit test puts inside it. Sections
121, 124 and 125.

Uses [`Container`](#container), [`ActivityName`](#activityname).

### `ActivityScreens` (type)

```ts
interface ActivityScreens {
  /** The base slot 14 record, by index, which is what an `0x72` operand's high byte selects. */
  map: number;
  /** Activity value to the base slot 6 mode that activity shows once it is running. */
  screens: Map<number, number>;
}
```

Where each activity's working screen is stated: one base slot 14 record, keyed by activity.

### `activityScreens`

```ts
function activityScreens(c: Container): ActivityScreens | undefined
```

The screen each activity shows while it runs, read from the table the remote itself consults to
get back to it.

**An activity has two screens and this is the second.** Its enter list opens by entering a mode
whose page says "Keep the remote pointed at your system" and binds every key to nothing; the
screen with the activity's own pads and "Devices" in the corner is entered at the end of the
chain, behind the infrared. So the first `0x7E` of an enter list is the wrong place to look, and
following the chain is worse, because it branches on the Remote Assistant's state variables and
reaches half a dozen help screens.

The table is the reliable source, and it is found the way the remote reaches it. **Device mode's
"Activities" key** maps a state variable through base slot 14, and while an activity runs that
chain lands in a record keyed by `CurrentActivityState` whose cases are the two instruction screen
program `queue 0x7E:mode; end`. So this walks the Activities key of every device mode page, follows
`0x7F` into lists and `0x72` into the record it selects and on through the instructions its cases
queue, and keeps the records the walk selects **on the activity variable**. Only that key: walking
every key a device mode page binds reaches the Devices key's record too, which is keyed by the same
variable, and then there are two answers.

**Shape alone was tried first and is not enough**: on twelve of the thirteen Harmony One
configurations with activities, three records are keyed by the activity and enter a mode on every
case an activity binds, and on the factory one five. The others map each activity to its own device
list, which is what the Devices key of the activity's screen enters. Every one of them also carries
a case for the idle value, which enters no mode, so "every case" is the wrong test. The walk
separates them where the shape cannot: from the Activities key alone it finds exactly one record on
463 of 463 device mode pages over those thirteen.

Cases for values no activity binds are ignored, and so is a binding with no case, which is exactly
what a composed activity is before its screen is composed. Undefined when the walk reaches no such
record or more than one, since two candidates would be a guess.

Uses [`Container`](#container), [`ActivityScreens`](#activityscreens-type).

### `Device`

```ts
interface Device {
  /**
   * Index into base slot 5's group array, which is the device's identity when it sends infrared. **Undefined for a
   * device that sends nothing**, which the remote lists all the same, with a row on the device list and a device mode
   * of its own.
   */
  group?: number;
  /** How many infrared codes it has. A group may be empty, and a device may have no group. */
  codes: number;
  /** The name, where the config states one. */
  name?: string;
  /**
   * Where that name came from, because the four routes are not equally strong:
   *
   * * `names` is base slot 0's own ASCII, tied to this group by the variable's transitions. Stated.
   * * `elimination` is the one label left over for the one group left over. Forced, not read.
   * * `screen` is the title the device's own mode draws, decoded from glyph pixels. Last resort.
   * * `list` is the label drawn on the device's row of the device list, decoded the same way. It is
   *   what the person holding the remote reads, and it is the only route that reaches a device with
   *   no infrared codes, so it fills the gaps the first three leave and overrides none of them.
   */
  source?: 'names' | 'elimination' | 'screen' | 'list';
  /** The base slot 13 variables whose name carries this device's label. */
  variables: number[];
  /**
   * The mode the device list enters for this device, as a base slot 6 index. Arch 12 (Harmony One)
   * only, since the row shape it is read from is that model's, and undefined where no row reaches
   * the device.
   */
  mode?: number;
}
```

One device: an infrared group, and the name the config gives it.

### `deviceCount`

```ts
function deviceCount(c: Container): number | undefined
```

How many devices the config drives: one infrared group per device.

Base slot 5's groups are the device partition of the infrared database, 8 to 164 codes each, and
a group may be empty. Two things say a group is a device rather than some other grouping: the
config compiled for one device carries exactly one group, and on the two arch 14 configs the
number of distinct device identifiers in the state variable names is the number of groups, 4 and
6.

Uses [`Container`](#container).

### `DeviceDelays` (type)

```ts
interface DeviceDelays {
  /** The infrared group, which is what identifies a device everywhere else in this codec. */
  group: number;
  /** The device's own label, as `devices` gives it, underscores and all. */
  name: string;
  /**
   * Where the number was read, because the two architectures keep it in unrelated places and a
   * caller that wants to **change** one has to know which.
   *
   * `variable` is arch 14 (Harmony 600 and 700): a state variable in base slot 13 whose name carries
   * Logitech's device identifier. `instruction` is arch 8, 9 and 12 (Harmony 880 and 885, Harmony
   * 525, Harmony One): a `0x7C` inline in the action list that switches the device on.
   */
  source: 'variable' | 'instruction';
  /** Tenths of a second between switching the device on and sending it anything. */
  powerOn: number;
  /**
   * Logitech's numeric identifier for the device. **Arch 14 only**, since it is the variable's name
   * that carries it and the other architectures have no variable.
   */
  id?: number;
  /** What the remote's own "set to default" page would put back into `powerOn`. Arch 14 only. */
  defaultPowerOn?: number;
  /**
   * Tenths of a second between two codes when the second goes to a different device. **Arch 14
   * only**, and its absence elsewhere is honest rather than settled: where arch 8, 9 and 12 keep
   * this, if they keep it at all, is open.
   */
  interDevice?: number;
  /** What that page would put back into `interDevice`. Arch 14 only. */
  defaultInterDevice?: number;
}
```

How long a device makes the remote wait, in tenths of a second, and which device it is.

### `deviceDelays`

```ts
function deviceDelays(c: Container): DeviceDelays[]
```

How long each device makes the remote wait, in tenths of a second. The delays are ordinary state variables in
base slot 13, eight per device, and the value is the record's `first`, which is both what the generator wrote and
what the firmware seeds the running variable from: a `first` of 80 is eight seconds. A device with no join to a
group is left out rather than reported with a guessed name.

Uses [`Container`](#container), [`DeviceDelays`](#devicedelays-type).

### `DeviceListRow`

```ts
interface DeviceListRow {
  /** The menu mode the row is on, as a base slot 6 index. */
  menu: number;
  /** Which page of that menu, zero based. */
  page: number;
  /** The touch scan the row is bound to: 48 is the top row, 49 the middle, 50 the bottom. */
  scan: number;
  /** The device mode the row enters. */
  mode: number;
  /** The label drawn on the row, where the page's strings pair with its rows one to one. */
  label?: string;
}
```

One row of the device list: where it sits, which mode it enters, and what it says.

### `deviceListRows`

```ts
function deviceListRows(c: Container): DeviceListRow[]
```

The device list, read off the widest menu that lists devices.

**This is the list the Devices button shows**, and it is the authoritative population of devices,
per [`reference/how-a-harmony-works.md`](../../how-a-harmony-works.md): a device is what that list offers, whether or not it sends
infrared. A configuration carries several copies of the list, one per context it is shown in,
all reaching the same modes, so the first menu reaching the most distinct device modes is taken.

A row's label is the string drawn on its page at the row's rank, top to bottom, and only when the
page draws exactly as many strings of two characters or more as it has rows. A page that draws
more, a page indicator say, leaves its rows unlabelled rather than mislabelled.

Uses [`Container`](#container), [`DeviceListRow`](#devicelistrow).

### `DeviceModeMap`

```ts
interface DeviceModeMap {
  /** The device, as an index into base slot 5's group array. */
  group: number;
  /** The base slot 6 mode it is, which is what the device list enters for this device. */
  mode: number;
  /**
   * The keypad bindings, from the **mode record's own** tagged list rather than a page's.
   *
   * The tag is the whole key code, an event type in `0xC0` and a scan code in `0x3F`, exactly as
   * base slot 9 spells one. These are physical keys: the scan codes here and the ones a page binds
   * are disjoint populations on arch 9, 12 and 14.
   */
  keypad: KeyCode[];
  /** The same for every page of that mode, which is device mode's screen and is usually the larger half. */
  screen: KeyCode[];
  /** How many pages those screen bindings are spread over. */
  pages: number;
}
```

One device's own map: the keypad it takes over in device mode, and the screen pages beside it.

Uses [`KeyCode`](#keycode).

### `deviceModeMaps`

```ts
function deviceModeMaps(c: Container): DeviceModeMap[]
```

Device mode's own map, per device: the map the remote installs when somebody picks a device.

Uses [`Container`](#container), [`DeviceModeMap`](#devicemodemap).

### `devices`

```ts
function devices(c: Container): Device[]
```

The devices a configuration holds, in its own order, each with its name where the configuration states one.

Uses [`Container`](#container), [`Device`](#device).

### `InfraredCode`

```ts
interface InfraredCode {
  /** Index into base slot 5's group array, so the device. */
  group: number;
  /** Index into that group's own record array. */
  code: number;
}
```

One infrared code: which device it goes to, and which of that device's codes it is.

### `Inventory` (type)

```ts
interface Inventory {
  /** The architecture the config states, which is the only place it says so. */
  architecture?: number;
  /** When the config was built, from base slot 3. On arch 12 this is also what the clock is set to. */
  builtAt?: string;
  devices: Device[];
  activities: Activity[];
  /** The value `CurrentActivityState` holds when no activity is running. */
  idle?: number;
}
```

Everything an interface needs to show a config, in one object.

Uses [`Device`](#device), [`Activity`](#activity).

### `inventory`

```ts
function inventory(c: Container): Inventory
```

The whole inventory of a config, composed.

**Here so that a caller does not have to know the order.** Naming a device needs the infrared groups,
the state variables, the action lists and, for three devices in the corpus, the screen text; naming an
activity needs the touch hit map on arch 12 and the modes elsewhere. An application that assembled
that itself would be a second copy of the composition, and the first thing to drift.

Uses [`Container`](#container), [`Inventory`](#inventory-type).

### `KeyCode`

```ts
interface KeyCode {
  /** Which kind of tagged list the binding is in. */
  where: 'page' | 'set';
  /** Index into `modePages` or into base slot 9's addresses, according to `where`. */
  index: number;
  /** The tagged list's key code: an event type in `0xC0` and a scan code in `0x3F`. */
  tag: number;
  /**
   * The event type: 0 none, 1 release, 2 press, 3 repeat.
   *
   * **A code sending binding is a press, with seventeen exceptions in the corpus and they are all
   * type 0**, tags 1, 2 and 5 in a base slot 9 set, which are that set's enter and leave handlers
   * rather than keys at all. Nothing sends a code on a release or on a repeat, anywhere.
   */
  event: number;
  /** The scan code alone. Only a key when `event` is not 0. */
  scan: number;
  /** The codes the binding sends, in the order the action list sends them. */
  codes: InfraredCode[];
}
```

What a button does: the codes it sends, in order, and where it is.

Uses [`InfraredCode`](#infraredcode).

### `keyCodes`

```ts
function keyCodes(c: Container): KeyCode[]
```

Every button binding in the config that sends infrared, and what it sends: the button map an interface shows for
a device or for a running activity. **A binding may send several codes**, a macro, which is why the order is kept.
A code is sent on the press, never on a release or a repeat, and most bindings send nothing at all, since
navigation and screen switching are bindings too. A code carries no name of its own.

Uses [`Container`](#container), [`KeyCode`](#keycode).

### `KeyLabel`

```ts
interface KeyLabel {
  /** Index into `modePages`. Only a page binding can have a label; a set binding is a hard key. */
  index: number;
  scan: number;
  /** The text, with a wrapped label's rows joined by a space. */
  text: string;
  /** How it was attributed, and the two are not equally strong. */
  source: 'touch' | 'row';
}
```

A drawn label attributed to a button.

### `keyLabels`

```ts
function keyLabels(c: Container): Map<string, KeyLabel>
```

The word each key's screen label shows, by key, as the remote draws it.

Uses [`Container`](#container), [`KeyLabel`](#keylabel).

### `pageScans`

```ts
function pageScans(c: Container): number[][]
```

The scan codes each mode page binds, in page order, whatever the binding does.

**Not the same population as [`keyCodes`](#keycodes)**, and the difference has bitten twice: [`keyCodes`](#keycodes) only
reports a binding that ends in an infrared code, so a key that starts an activity or opens another
menu is absent from it. Anything asking "which pages are there and what do they bind" wants this,
or it silently loses every activity page.

Uses [`Container`](#container).

### `PowerOnDelay`

```ts
interface PowerOnDelay {
  group: number;
  /** The list the `Power` variable's off to on transition runs. */
  on: number;
  /** The one list holding the `0x72`. */
  delay: number;
  table: number;
  variable: number;
}
```

A device's power on delay on a Harmony 600, 650 or 700, read from the list its `Power` variable runs when it
goes from off to on. That on list calls the device's power command first and the delay list last, each by a
`0x7F`; the delay list holds one `0x72`, whose operand is `(table << 8) | variable` and whose variable is the
device's `PowerOnDelay_<identifier>`. Some devices carry a further instruction between the two calls, or a third
call after them. The off transition sends a code of the device with no delay.

The Harmony One, the Harmony 525 and the Harmony 880 and 885 state the delay inline instead, as a `0x7C`,
which `powerOnInstructions` reads.

### `powerOnDelays`

```ts
function powerOnDelays(c: Container): PowerOnDelay[]
```

Every arch 14 device's power on delay, by the route [`PowerOnDelay`](#powerondelay) describes.

Uses [`Container`](#container), [`PowerOnDelay`](#powerondelay).

## Its screens

Drawn as the remote draws them, and a drawing written as a PNG.

### `describeChoices`

```ts
function describeChoices(c: Container, choices: readonly ScreenChoice[]): string[]
```

A screen variant's conditions in words, one per branch the program took.

**The name is the point.** A variant is a list of switch arms, and "arm 1 of 2 at state 35" tells a
person nothing, while `PS3_Power = 1` tells them exactly when the screen looks like that. Base slot 0
names the state variables, so the two readings meet here.

Only some variables are named: one Harmony One configuration has 46 base slot 13 records and 12 names, so
an unnamed one is shown by its index rather than invented, since a name made up for it would read as one the
configuration states.

Uses [`Container`](#container), [`ScreenChoice`](#screenchoice).

### `encodePng`

```ts
function encodePng(width: number, height: number, rgb: Uint8Array, channels: 3 | 4 = 3): Uint8Array
```

A truecolour PNG from RGB rows, or from RGBA rows when `channels` is 4, which is colour type 6. Each row is
prefixed with filter type 0, which is no filter.

### `PngHeader`

```ts
interface PngHeader {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  /** 0 grey, 2 truecolour, 3 palette, 4 grey with alpha, 6 truecolour with alpha. */
  readonly colourType: number;
  readonly interlace: number;
  readonly chunks: readonly string[];
}
```

What [`readPng`](#readpng) finds in a file: its header's fields and its chunks' kinds in order.

### `Raster`

```ts
interface Raster {
  width: number;
  height: number;
  /** One entry per pixel, row major: an RGB565 value, or `UNDRAWN`. */
  pixels: Int32Array;
}
```

A drawn screen: its size, and a colour for every pixel.

### `rasterPng`

```ts
function rasterPng(raster: Raster, undrawn?: [number, number, number]): Uint8Array
```

A whole raster as a PNG, which is the two calls above and the pair a caller almost always wants.

Uses [`Raster`](#raster).

### `readPng`

```ts
function readPng(bytes: Uint8Array): PngHeader
```

A PNG file read back far enough to say it decodes: the signature, every chunk's length and CRC, `IHDR` first
and `IEND` last with nothing after it, the `IDAT` chunks together, and their data inflated to exactly one
filter byte and one row of samples per row, each filter byte one of the five PNG defines. A file that fails
any of it throws a `RangeError` saying which. **Interlaced images are read only as far as the header**, since
their data is seven passes of other sizes; a caller that refuses them refuses them by the header's field.
The pixels are not unfiltered: nothing here needs them, and a file whose rows inflate to the right length
with valid filter bytes is one a decoder can unfilter.

Uses [`PngHeader`](#pngheader).

### `RenderedPage`

```ts
interface RenderedPage {
  raster: Raster;
  /** How many pictures were drawn, and how many the program named and this could not decode. */
  pictures: number;
  picturesMissing: number;
  /** How many filled rectangles were drawn, opcode 1, `SCREEN_FILL`. */
  fills: number;
  /** How many strings were drawn, and how many glyph codes had no glyph in the selected font. */
  strings: number;
  glyphsMissing: number;
  /**
   * Switches passed, each of which had more than one target.
   *
   * A screen is one path through the program, so this is how many other screens the same program can
   * draw. Zero means the page has exactly one appearance.
   */
  branches: number;
}
```

A page of a configuration drawn as the remote draws it, and what the drawing met.

Uses [`Raster`](#raster).

### `renderPage`

```ts
function renderPage(c: Container, page: ModePage): RenderedPage | undefined
```

Render a mode page, which is the unit a person sees: one screen of one mode.

Uses [`Container`](#container), [`ModePage`](config-types.md#modepage), [`RenderedPage`](#renderedpage).

### `renderPages`

```ts
function renderPages(c: Container): (RenderedPage | undefined)[]
```

Every mode page rendered, in mode table order, which is the order [`keyLabels`](#keylabels) indexes them by.

Uses [`Container`](#container), [`RenderedPage`](#renderedpage).

### `renderVariants`

```ts
function renderVariants(
  c: Container,
  address: number,
  limit = 12,
  observe?: (text: TextDrawn) => void,
): { variants: ScreenVariant[]; truncated: boolean }
```

Every appearance a page can have, or as many as `limit` allows.

Uses [`Container`](#container), [`TextDrawn`](config-types.md#textdrawn), [`ScreenVariant`](#screenvariant).

### `SCREEN_SIZES`

```ts
const SCREEN_SIZES: Readonly<Record<number, { width: number; height: number }>>
```

Each platform's screen in pixels, by the platform number a configuration states.

### `ScreenChoice`

```ts
interface ScreenChoice extends ScreenCase {
  /** The base slot 13 state variable the switch reads. `inventory.ts` turns it into a name. */
  variable: number;
  /** How many arms the switch had, so a caller can say one of how many. */
  arms: number;
}
```

A branch a screen took, which is what says under what conditions the screen looks like this.

Uses [`ScreenCase`](config-types.md#screencase).

### `ScreenVariant`

```ts
interface ScreenVariant {
  page: RenderedPage;
  /** The arms taken, in the order the program met them. Empty for a page that cannot vary. */
  choices: ScreenChoice[];
}
```

One way a page can look, and the choices in its program that give it.

Uses [`RenderedPage`](#renderedpage), [`ScreenChoice`](#screenchoice).

## Reading a configuration

The container out of its bytes, or out of Logitech's EzHex file, and what it says about itself.

The names a Harmony 300 or 350 keeps of its devices and their commands, in the archive inside its container.

### `allChecksPass`

```ts
function allChecksPass(checked: { checks: Record<string, boolean> }): boolean
```

Whether every check of a read configuration file held.

### `ConfigLanguage` (type)

```ts
interface ConfigLanguage {
  /** An IETF language tag, lower case, matching a key of `LANGUAGE_MARKERS`. */
  readonly tag: string;
  /** How many of that language's markers the container's strings matched. */
  readonly matched: number;
  /** The best any other language scored, which is 0 on every container in the corpus. */
  readonly runnerUp: number;
}
```

The language a configuration's own words are in, as [`configLanguage`](#configlanguage) judges it.

### `configLanguage`

```ts
function configLanguage(c: Container): ConfigLanguage | undefined
```

The language of a container's interface, or `undefined` because the evidence is too thin.

`undefined` is a real answer and the common one outside a user config: a safe mode container draws
fifty strings, almost all of them fault messages, and matches one marker. So the threshold is what
separates "this config is in Dutch" from "this container barely speaks", and the margin behind it
is one marker, which is thin and is stated rather than hidden.

Uses [`Container`](#container), [`ConfigLanguage`](#configlanguage-type).

### `Container`

```ts
class Container {
  /** Offset of the cookie within whatever was parsed: an EZHex file, or a read of a remote's flash. */
  readonly blobOffset: number;
  readonly length: number;
  readonly flashBase: number;
  readonly endAddr: number;
  readonly formatRaw: number;
  readonly pointerCount: number;
  readonly markerOffset: number;
  readonly marker: string;
  readonly family: Family;
  readonly trailerChecksum: number;
  /** The container itself, cookie through end marker. */
  readonly blob: Uint8Array;
  readonly sections: readonly Section[];
  /** Which raw slot the architecture record was found in, 1 normally and 0 on arch 10. */
  architectureSlot?: number;
  /** Stated by section slot 1, see `ARCH_RECORD_SLOT`. */
  architecture: number | undefined;
  /** The u16 beside it, meaning not established. */
  versionWord: number | undefined;
  /** Slot 0's 0xFEED frame, undefined when absent. */
  frameLength: number | undefined;
  /** Slot 3's timestamp as `YYYY-MM-DDTHH:MM:SS`, see `CLOCK_RECORD_SLOT`. */
  builtAt: string | undefined;
  keys: KeyRecord[];
  checks: Record<string, boolean>;
  constructor(fields: {
      blobOffset: number;
      length: number;
      flashBase: number;
      endAddr: number;
      formatRaw: number;
      pointerCount: number;
      markerOffset: number;
      marker: string;
      family: Family;
      trailerChecksum: number;
      blob: Uint8Array;
      sections: readonly Section[];
    });
  get hasKeyTable(): boolean;
  /**
   * How many bytes slot 0's frame occupies, terminator included.
   *
   * `frameLength` is the field, and for an empty frame the field is **zero**, which is a sentinel
   * meaning `EMPTY_FRAME_LENGTH` and nothing in the type says so. Three call sites decoded it
   * separately and a fourth writing `frameLength + FRAME_END_LENGTH` would get 2 where the answer
   * is 7. Measured before this existed: the frame tiles to the next section on 24 of the 26
   * containers that have one, and the two misses are exactly the two empty frames, so the sentinel
   * was already producing a wrong extent in a probe written to check something else.
   */
  get frameExtent(): number | undefined;
  /** The pointer count the header states, independent of `pointerCount`. */
  get statedPointerCount(): number;
  /**
   * The **legacy label**, kept because every document and sample table here uses it.
   *
   * It splits one byte into nibbles and prints them as major.minor, which reads as a plausible
   * version for `0x14` to `0x17` and as nonsense otherwise: an arch 16 (Harmony 350) container comes
   * out `0.15`, a lower version than a remote five years older. The byte is the pointer count: prefer
   * `statedPointerCount`.
   */
  get formatVersion(): string;
  get allChecksPass(): boolean;
  /**
   * Convert an absolute flash address to an offset within the container blob.
   *
   * Undefined for a NULL pointer and for an address outside the blob.
   */
  blobOffsetOf(address: number): number | undefined;
  /**
   * Convert an absolute flash address to an offset within the file that was parsed.
   *
   * Distinct from `blobOffsetOf` by `blobOffset`, which is non zero whenever the container sits
   * inside something larger: an EZHex file with its XML header, or a read of a remote's flash. Conflating the
   * two silently shifts every section by the header length and produces a plausible looking
   * wrong answer rather than an error, which has already cost time here.
   */
  fileOffset(address: number): number | undefined;
  /** Bytes from this section's start to the next non NULL one, or to the end marker. */
  sectionLength(slot: number): number | undefined;
  /**
   * Read a section as a count followed by that many three byte flash pointers.
   *
   * Six sections per architecture are arrays of this shape, and they are recognised rather than
   * tabulated: the count is a `u8` or a `u16` and is accepted only when `width + 3 * count`
   * accounts for the section exactly. That test is strict enough to pick out the same six slots
   * in the same six slots per architecture across the corpus and in no others.
   *
   * Returns undefined when the section is not this shape, or when there is no blob to read.
   */
  pointerArray(slot: number): number[] | undefined;
  /**
   * The same read, with the bytes it occupies.
   *
   * `pointerArray` is this with the extent dropped. One implementation rather than two, because
   * the byte accounting of `coverage` needs exactly the width this loop settles on, and a second
   * copy of the width rule would be free to disagree with the first. The same reason there is one
   * opcode table.
   */
  pointerArrayAt(
      slot: number,
      empty = false,
    ): { values: number[]; start: number; length: number; width: number } | undefined;
  /** Which slots read as pointer arrays. A per architecture fingerprint in practice. */
  get pointerArraySlots(): number[];
  /**
   * The action list at an absolute flash address: a count, then that many instructions.
   *
   * ```
   * +0x00  u8   count
   *        { u16 operand; u8 opcode }[count]
   * ```
   *
   * Returns undefined when the address is outside the container. Nothing else is validated,
   * because there is nothing to validate against: what makes this reading believable is that
   * consecutive entries of the table sit `1 + 3 * count` apart, which `actionListPacking` checks
   * in aggregate rather than per list.
   */
  actionList(address: number): Instruction[] | undefined;
  /**
   * Where each instruction of one action list sits in the blob, for a rewriter that pokes a field.
   *
   * **Deliberately immediately below `actionList`, because the two share one rule** and the layout
   * is stated once per method rather than derived twice in different files: a list is a `u8` count
   * then `count` instructions of an operand `u16` and an opcode `u8`. If that rule ever changes,
   * both bodies are on the same screen. `compose.ts` uses this to renumber a state variable, whose
   * index sits either in an opcode byte or in an operand's low byte.
   *
   * Returns undefined on exactly the conditions `actionList` does, so a caller that has a parsed
   * list has an offset list of the same length.
   */
  actionListSites(address: number): { operandAt: number; opcodeAt: number }[] | undefined;
  /** Every action list the table at base slot 10 addresses, in table order. */
  actionLists(): Instruction[][] | undefined;
  /**
   * How many consecutive table entries sit exactly `1 + 3 * count` apart, and of how many.
   *
   * This is the check that carries the whole reading: the addresses come from the pointer table
   * and the counts come from the lists themselves, so agreement between them is two unrelated
   * parts of the file telling the same story. Across the corpus it holds for all but exactly four
   * pairs per config, and those four are the boundaries between the runs the lists are packed
   * into.
   */
  actionListPacking(): [number, number];
}
```

A configuration as read by [`parse`](#parse): its header, its table of sections, and its bytes, which every reader of
this package takes.

Uses [`Family`](config-types.md#family), [`Section`](config-types.md#section), [`KeyRecord`](config-types.md#keyrecord), [`Instruction`](config-types.md#instruction).

### `decodePayload`

```ts
function decodePayload(blob: Uint8Array, name = '<blob>'): Region
```

Extract the payload from an EZUp or EZHex file.

Uses [`Region`](config-types.md#region).

### `EzFileError`

```ts
class EzFileError extends Error {}
```

A configuration file that cannot be read: no header, or a header that does not say what follows it, or a payload
written as hex with an odd number of digits or with characters that are not hex.

### `EzHex`

```ts
interface EzHex {
  readonly name: string;
  readonly xml: string;
  readonly payload: Uint8Array;
  readonly declaredSize: number | undefined;
  readonly declaredChecksum: number | undefined;
  readonly intendedVersion: Partial<Record<IntendedVersionField, string>>;
  readonly checks: Record<string, boolean>;
  /** Where the header terminator puts the split, or undefined when there is no header. */
  readonly structuralSplit: number | undefined;
  readonly lineEnding: LineEnding | undefined;
}
```

A configuration file as Logitech's service delivers it: its text header, what the header states, and the
configuration after it, with the result of each check.

Uses [`IntendedVersionField`](#intendedversionfield), [`LineEnding`](config-types.md#lineending).

### `GspmError`

```ts
class GspmError extends Error {}
```

Bytes that are not a configuration, or one that cannot be read as its header states.

### `INTENDED_VERSION_FIELDS`

```ts
const INTENDED_VERSION_FIELDS = [
  'PROTOCOL',
  'SKIN',
  'FLASH',
  'BOARD',
  'SOFTWARETYPE',
  'ARCHITECTURE',
] as const
```

The six fields a compatibility check compares.

`SOFTWARETYPE` says which of the remote's images is running
and `ARCHITECTURE` is compared too; a field that is absent or empty matches anything, which
is how one entry is written to match every remote. `SOFTWARE` is **not** one of the six, so a
version that looks like a gate is not one. The reader looks up these six names only, so it drops `SOFTWARE`
before the comparison sees it.

### `IntendedVersionField`

```ts
type IntendedVersionField = (typeof INTENDED_VERSION_FIELDS)[number];
```

Uses [`INTENDED_VERSION_FIELDS`](#intended_version_fields).

### `Metadata`

```ts
interface Metadata {
  /** The file's whole text, so a caller can read what this reader does not model. */
  readonly xml: string;
  /** Where the length word sits in the blob, for the byte accounting. */
  readonly offset: number;
  /** The length the `u32` states, the archive only, excluding the word itself. */
  readonly length: number;
  readonly devices: readonly MetadataDevice[];
}
```

The list of devices and commands by name that a Harmony 300, 350, 890 or 895 configuration carries.

Uses [`MetadataDevice`](#metadatadevice).

### `metadataArchive`

```ts
function metadataArchive(c: Container): Metadata | undefined
```

The metadata archive of a container, or undefined where it holds none.

**The pointer first and a search behind it.** On the two architectures that are known to carry one
the slot is followed, which is the reading; the search is what would find one on an architecture
nobody has looked at, and it is deliberately kept rather than removed now that both slots are known,
because it is also the control: it finds the same offset the pointer does, so a slot that moved
would be noticed rather than turning into a silent undefined. A candidate is only tried when the
`u32` in front of it states the archive's own length, which is what makes a hit a hit rather than a
`PK` inside picture data.

Uses [`Container`](#container), [`Metadata`](#metadata).

### `MetadataCommand`

```ts
interface MetadataCommand {
  /** The index a base slot 5 record is addressed by, as the archive states it. */
  readonly index: number;
  readonly name: string;
}
```

One command of a device, by its number and its name.

### `MetadataDevice`

```ts
interface MetadataDevice {
  readonly name: string;
  readonly index: number;
  /** The archive's `DeviceId`, which is **not** a catalogue id. */
  readonly deviceId?: string;
  readonly commands: readonly MetadataCommand[];
}
```

One device as the list a configuration carries names it, with its commands.

Uses [`MetadataCommand`](#metadatacommand).

### `parse`

```ts
function parse(data: Uint8Array): Container
```

Read a configuration, from bytes read off a remote or from a file, into a [`Container`](#container). Refuses bytes that are not
one.

It looks for the container in the bytes it is given, so a read off a remote, a bare container and a file whose
payload follows its header as it is all parse directly. It does not unwrap a `.EZHex` file whose payload is
written out as hex inside the XML: pass such a file through [`payloadOf`](#payloadof) first, which hands back the bytes to parse
whatever form the file arrived in.

Uses [`Container`](#container).

### `parseEzhex`

```ts
function parseEzhex(blob: Uint8Array, name = '<blob>'): EzHex
```

Split an EZHex file into XML header and payload, two ways, and compare them.

The **structural** split is the format's own: the payload is everything after the line
carrying `</INFORMATION>`, and a file whose header is missing entirely is all payload. The
**declared** split is `BINARYDATASIZE` bytes off the end. Either can be absent, and when both
are present they must agree; the structural one is preferred, because it does not depend on
the file having been truncated or extended by a byte.

Falls back to locating a container cookie when neither is available, which is a guess and is
the only branch here that is.

Uses [`EzHex`](#ezhex).

### `payloadOf`

```ts
function payloadOf(blob: Uint8Array, name = '<blob>'): Uint8Array
```

Accepts whatever a config arrives as and hands back the bytes to parse.

A raw flash read from a remote is passed through untouched, because `gspm.parse` finds the
container inside a larger read of the flash on its own. Anything that starts as XML is unwrapped first.

### `summary`

```ts
function summary(c: Container): Record<string, unknown>
```

The container as a plain object, the same shape `tools/gspm_parse.py --json` emits.

That shape is the golden vector format, which is why the field names are snake_case here and
camelCase everywhere else: the vector is generated by the Python parser and read back by both,
so the JSON is a contract between the two rather than this package's own idiom.

Pointer array entries are counted rather than listed, because the largest array seen holds
8037 of them and would bury everything else.

Uses [`Container`](#container).

### `timestampOf`

```ts
function timestampOf(
  year: number, month: number, day: number, hour: number, minute: number, second: number,
): string
```

The one place a `builtAt` string is spelled, `YYYY-MM-DDTHH:MM:SS` with every field padded.

## Resources

What the codec asks its loader for, the fonts, the icon list, a PNG's deflate and SHA-256. The Node entry supplies them as it loads; a renderer supplies them through [`supplyResources`](#supplyresources) before it builds or draws. Reading a configuration asks for none of them.

### `CodecResources`

```ts
interface CodecResources {
  /** A cut of Oxanium, the bytes of `packages/config/fonts/Oxanium/static/Oxanium-<weight>.ttf`. */
  readonly oxanium: (weight: string) => Uint8Array;
  /** Material Design Icons' font, the bytes of `@mdi/font`'s `fonts/materialdesignicons-webfont.ttf`. */
  readonly iconFont: () => Uint8Array;
  /** Its icons' names and code points, the text of `@mdi/font`'s `scss/_variables.scss`. */
  readonly iconList: () => string;
  /** `bytes` as a zlib stream, RFC 1950, exactly as Node's `zlib.deflateSync` writes it at its defaults. */
  readonly deflate: (bytes: Uint8Array) => Uint8Array;
  /** The SHA-256 of `bytes`, in lower case hexadecimal. */
  readonly sha256: (bytes: Uint8Array) => string;
}
```

Everything the codec asks its loader for.

### `ResourceError`

```ts
class ResourceError extends Error {}
```

A resource the codec needed and nobody supplied, by its name.

### `supplyResources`

```ts
function supplyResources(resources: Partial<CodecResources>): void
```

Hand the codec what it asks for. Later calls replace the resources they name and keep the others.

Uses [`CodecResources`](#codecresources).

## The document toolkit

Everything an application does to one remote's setup, as functions on the recipe that each return a new one, the questions it asks one, and the check that lists every problem without building. One namespace, `recipe`, so that its short names, `remove`, `move`, [`devices`](#devices), stand apart from the readers of a compiled configuration above. What is not built yet refuses by name, [`NotBuiltError`](#notbuilterror).

### `recipe`

A namespace: every name of [`recipe`](config-recipe.md), as `recipe.<name>`.

### `NotBuiltError`

```ts
class NotBuiltError extends Error {
  /** The function refused, as an application calls it: `recipe.setKey`, `findDevices`, `syncDocument`. */
  readonly contract: string;
  /** The requirement the function serves, its number in `docs/remote-requirements.md`. */
  readonly requirement: number;
  constructor(contract: string, requirement: number);
}
```

A function of the contract that nothing is behind yet, by its name and the requirement it waits on.

## The Harmony Touch's configuration

Not a container but Logitech's documents, which the remote fetches through the computer and keeps itself. Read into a typed view, checked for what the remote would refuse or ignore, its engine's sends predicted, and its family. One namespace, `harmonyTouch`, kept apart by name from the families of the compiled remotes; its composers are the namespace of the same name on `./build`.

### `harmonyTouch`

A namespace: every name of [`harmonyTouch`](config-harmony-touch.md), as `harmonyTouch.<name>`.

## What a model can do

Its properties, and how far the FHSDK serves it, the status of every requirement with its evidence. An application offers a feature where its requirement is met on the model.

* `BenchModelKey`: documented on [`@freeharmony-sdk/base`](base.md#benchmodelkey).

### `capabilitiesOf`

```ts
function capabilitiesOf(keyOrSkin: BenchModelKey | number): ModelCapabilities | undefined
```

A model's properties and the status of every requirement on it, by its key or by a skin one of its remotes
reports, for the models of [`BENCH_MODELS`](base.md#bench_models); undefined for a key or a skin none of them has, a remote these statuses
were never judged for.

Uses [`BenchModelKey`](base.md#benchmodelkey), [`ModelCapabilities`](#modelcapabilities).

### `ComposeError`

```ts
class ComposeError extends Error {}
```

**A build's refusal**, the one class an application catches when a build of any model says no, for every family of
either kind: a document it will not build, a device it cannot compose, a choice it does not make.

**Why one class.** An application holds a document and a model and calls one build, [`buildFromRecipe`](#buildfromrecipe); which family
builds is the registry's choice, not the application's. If each family said no with a class of its own, the
application would have to know every family's classes to tell a refusal, which it shows the person, from a fault in
the code, which it reports. So every class a family's build refuses with at its surface extends this one: the
compiled families' composers throw it directly, the shared assembly's refusal, the Harmony 600, 650 and 700's
refusal of a choice and the Harmony One's refusal of a builder extend it, and so does the Harmony Touch's composer.
A subclass keeps its own name for the code that tells them apart inside the codec; an application needs only this.

**What is not a refusal.** A source the caller must give and did not, an account or an archive for a device the
document carries no definition of, is a [`RecipeError`](#recipeerror), as is a document that is not one; a function nobody has
written yet is a [`NotBuiltError`](#notbuilterror), [`contract.ts`](../../../packages/config/src/support/contract.ts). A device an archive that was given does not hold is still the
catalogue's [`ArchiveError`](#archiveerror). Anything else thrown out of a build, a `TypeError` above all, is a
fault in the code and not an answer about the document.

**Why it sits here, in a module that imports nothing.** The classes that extend it sit in modules that reach each
other in cycles, the shared assembly, the families and the registry among them; a class declared with `extends` needs
its base defined when its own module runs, so the base has to be in a module no cycle passes through. The composers
import it from [`shared/core.ts`](../../../packages/config/src/shared/core.ts), which re-exports it, and so does the main entry.

### `ModelCapabilities`

```ts
interface ModelCapabilities {
  readonly key: BenchModelKey;
  readonly name: string;
  readonly skins: readonly number[];
  readonly properties: ModelProperties;
  readonly requirements: readonly RequirementAnswer[];
}
```

A model of [`BENCH_MODELS`](base.md#bench_models), its properties and the status of every requirement on it, in number order.

Uses [`BenchModelKey`](base.md#benchmodelkey), [`ModelProperties`](#modelproperties), [`RequirementAnswer`](#requirementanswer).

### `ModelProperties`

```ts
interface ModelProperties {
  /** The configuration architecture the model table gives the model, `reference/architectures/README.md`. */
  readonly architecture?: number;
  /**
   * The family that builds for the model, as the registry chooses it, by the name it gives itself and its kind: a
   * compiled family builds the one container the remote is written with, a document family the documents it
   * assembles one from. Left out for a model no family serves, the Harmony 525.
   */
  readonly family?: { readonly name: string; readonly kind: 'compiled' | 'document' };
  /** The most devices the host software lets the model hold, the model table's `maxDevices`. */
  readonly maxDevices?: number;
  /**
   * How many favourite channels the model holds: the model table's favourite channel buttons, or the family's limit
   * where the family composes favourites with one, the Harmony Touch's fifty.
   */
  readonly favourites?: number;
  /** The kind of panel: the model table's, or none for the two models without a screen, by their display pages. */
  readonly panel?: Panel;
  /** The screen's size in pixels, `SCREEN_SIZES`, by the architecture the model's remotes report. */
  readonly screen?: { readonly width: number; readonly height: number };
  /** Whether the screen is a touch panel: the model table's, or the Harmony Touch's display page. */
  readonly touch?: boolean;
  /** Whether Logitech's product records give the model a long press, a second action on a held key, `hasLongPress`. */
  readonly longPress: boolean;
  /** The most activities the model holds where the family builds a fixed number, one on the models without a screen. */
  readonly activitiesAtMost?: number;
  /** The keys printed on the remote that start an activity, by their printed names, where the family names them. */
  readonly activityKeys?: readonly string[];
  /** The reference pages a value above rests on, for the values no code holds. */
  readonly references: readonly string[];
}
```

What a model is, as far as the libraries hold it. A field left out is a value nothing here states.

Uses [`Panel`](base.md#panel).

* `Proof`: documented on [`@freeharmony-sdk/base`](base.md#proof).
* `Requirement`: documented on [`@freeharmony-sdk/base`](base.md#requirement-type).

### `RequirementAnswer`

```ts
interface RequirementAnswer {
  readonly requirement: Requirement;
  readonly state: RequirementState;
}
```

One requirement and where it stands on the model asked about.

Uses [`Requirement`](base.md#requirement-type), [`RequirementState`](base.md#requirementstate-type).

* `RequirementState`: documented on [`@freeharmony-sdk/base`](base.md#requirementstate-type).
* `RequirementStatus`: documented on [`@freeharmony-sdk/base`](base.md#requirementstatus).
* `RequirementWait`: documented on [`@freeharmony-sdk/base`](base.md#requirementwait).
