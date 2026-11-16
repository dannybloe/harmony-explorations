# The documents

The shapes the SDK takes and gives, each shown as its type in the libraries' source and filled into this page from
it, so the shape here is the one the code has. A field's own comment is in the shape; the name links to its entry in
[the API reference](api/README.md), where the types it uses are linked in turn.

## The document

The document an application holds for one remote, called a recipe in the source: plain JSON, the same shape for
every model, version 2. What each field means, and which model's build reads it, is written out field by field in
[the description of the recipe](../../docs/recipe.md), which is the one place it is described. An application never
has to write the document by hand: [`recipe.create`](api/config-recipe.md#recipecreate) starts one and the toolkit's
changes keep it consistent.

<!-- shape:@freeharmony-sdk/config#Recipe -->
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

From [`Recipe`](api/config.md#recipe).
<!-- /shape -->

A device and an activity as the document holds them:

<!-- shape:@freeharmony-sdk/config#RecipeDevice -->
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

From [`RecipeDevice`](api/config.md#recipedevice).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/config#RecipeActivity -->
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

From [`RecipeActivity`](api/config.md#recipeactivity).
<!-- /shape -->

## A check's problems

[`recipe.check`](api/config-recipe.md#recipecheck) returns every problem of a document as a list. An error stops a
build and a sync, a note stops nothing; the code is what an application acts on, and the place says which screen and
which field to show it at.

<!-- shape:@freeharmony-sdk/config#recipe.Problem -->
```ts
interface Problem {
  readonly severity: 'error' | 'note';
  readonly code: ProblemCode;
  readonly place: Place;
  readonly message: string;
}
```

From [`recipe.Problem`](api/config-recipe.md#recipeproblem).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/config#recipe.PROBLEM_CODES -->
```ts
const PROBLEM_CODES = [
  'unknown-device', 'unknown-command', 'unknown-input', 'unknown-key', 'unknown-sequence',
  'no-definition',
  'name-taken', 'name-not-drawable', 'names-not-judged',
  'over-limit',
  'not-on-this-model',
  'invalid',
  'sequence-too-long',
  'unfinished',
] as const
```

From [`recipe.PROBLEM_CODES`](api/config-recipe.md#recipeproblem_codes).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/config#recipe.Place -->
```ts
type Place =
  | { readonly kind: 'document' }
  | { readonly kind: 'device'; readonly device: DeviceId }
  | { readonly kind: 'command'; readonly device: DeviceId; readonly command: string }
  | { readonly kind: 'activity'; readonly activity: ActivityId }
  | { readonly kind: 'activity-device'; readonly activity: ActivityId; readonly device: DeviceId }
  /**
   * One role of an activity, by the document's word for it, `ActivityRoleName`, Logitech's: where a change says that no
   * device of the activity has that role any more. A role is the document's and the same word on every model, and never
   * required; what a model does without it, such as volume keys that then send nothing, is the model's
   * family's and not said here.
   */
  | { readonly kind: 'role'; readonly activity: ActivityId; readonly role: ActivityRoleName }
  /**
   * An activity's mark of needing attention, `RecipeActivity.attention`: where a change says it set
   * the mark, or added a reason to it, and why.
   */
  | { readonly kind: 'attention'; readonly activity: ActivityId }
  | { readonly kind: 'step'; readonly activity: ActivityId; readonly when: 'start' | 'end'; readonly step: number }
  /** A device's place in the order an activity switches its devices on and off, `ActivityChanges.powerOrder`. */
  | { readonly kind: 'power-order'; readonly activity: ActivityId; readonly device: DeviceId }
  | { readonly kind: 'key'; readonly owner: Owner; readonly key: string; readonly press?: RecipePress }
  | { readonly kind: 'screen-item'; readonly owner: Owner; readonly item: number }
  | { readonly kind: 'sequence'; readonly sequence: SequenceId }
  /** One step of a sequence, counted from 0. */
  | { readonly kind: 'sequence-step'; readonly sequence: SequenceId; readonly step: number }
  | { readonly kind: 'favourite'; readonly device: DeviceId; readonly favourite: number }
  | { readonly kind: 'look' }
  | { readonly kind: 'setting'; readonly setting: string };
```

From [`recipe.Place`](api/config-recipe.md#recipeplace).
<!-- /shape -->

## A change and its effects

Every change of the toolkit returns the new document and what else it touched to keep it consistent. A change that
cannot be made throws, and the document given stays as it was.

<!-- shape:@freeharmony-sdk/config#recipe.Change -->
```ts
interface Change {
  readonly document: Recipe;
  readonly effects: readonly Effect[];
}
```

From [`recipe.Change`](api/config-recipe.md#recipechange).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/config#recipe.Effect -->
```ts
interface Effect {
  readonly place: Place;
  readonly effect: 'removed' | 'changed' | 'missing';
  readonly message: string;
}
```

From [`recipe.Effect`](api/config-recipe.md#recipeeffect).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/config#recipe.ChangeRefused -->
```ts
class ChangeRefused extends RecipeError {
  readonly reason: RefusalReason;
  readonly place: Place;
  constructor(reason: RefusalReason, place: Place, message: string);
}
```

From [`recipe.ChangeRefused`](api/config-recipe.md#recipechangerefused).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/config#recipe.RefusalReason -->
```ts
type RefusalReason = 'unknown' | 'over-limit' | 'invalid' | 'not-on-this-model';
```

From [`recipe.RefusalReason`](api/config-recipe.md#reciperefusalreason).
<!-- /shape -->

What nobody has built yet throws a class of its own, which names the requirement it waits on:

<!-- shape:@freeharmony-sdk/config#NotBuiltError -->
```ts
class NotBuiltError extends Error {
  /** The function refused, as an application calls it: `recipe.setKey`, `findDevices`, `syncDocument`. */
  readonly contract: string;
  /** The requirement the function serves, its number in `docs/remote-requirements.md`. */
  readonly requirement: number;
  constructor(contract: string, requirement: number);
}
```

From [`NotBuiltError`](api/config.md#notbuilterror).
<!-- /shape -->

## A build's result

[`buildFromRecipe`](api/config.md#buildfromrecipe) takes a document and what it needs besides, and gives what the
remote is sent. Instead of a result it throws one of three classes, `ComposeError` when it refuses the document,
`NotBuiltError` when what the document asks for is not built yet, and `RecipeError` when a source the caller must
give is missing.

<!-- shape:@freeharmony-sdk/config#BuildSources -->
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

From [`BuildSources`](api/config.md#buildsources).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/config#Built -->
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

From [`Built`](api/config.md#built).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/config#LeftOutActivity -->
```ts
interface LeftOutActivity {
  readonly id?: string;
  readonly name: string;
  readonly reason: LeftOutReason;
}
```

From [`LeftOutActivity`](api/config.md#leftoutactivity).
<!-- /shape -->

## A sync's events and outcome

[`syncDocument`](api/remote-write.md#syncdocument) reports what it does as events and resolves with its outcome,
which is also its last event. Every refusal and failure from the check on is an outcome; a sync rejects only before
anything is opened, with `NotBuiltError` for a model whose sync is not built yet and with a `TypeError` for a pretend
remote `pretendRemote` did not make. A failure that leaves the remote needing something done names a state of a
closed list, which says what is true of the remote, whether it may be unplugged and what puts it right.

<!-- shape:@freeharmony-sdk/remote/write#SyncEvent -->
```ts
type SyncEvent =
  | { readonly kind: 'phase'; readonly phase: SyncPhase }
  | { readonly kind: 'progress'; readonly phase: SyncPhase; readonly done: number; readonly total: number }
  | { readonly kind: 'attention'; readonly attention: SyncAttention; readonly message: string }
  | { readonly kind: 'outcome'; readonly outcome: SyncOutcome };
```

From [`SyncEvent`](api/remote-write.md#syncevent).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/remote/write#SyncPhase -->
```ts
type SyncPhase =
  | 'identify'
  | 'check' | 'build'
  | 'backup'
  | 'hand-over'
  | 'write' | 'verify' | 'restart';
```

From [`SyncPhase`](api/remote-write.md#syncphase).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/remote/write#SyncAttention -->
```ts
type SyncAttention =
  | 'do-not-unplug'
  | 'safe-to-unplug'
  | 'restarting'
  | 'restart-by-hand';
```

From [`SyncAttention`](api/remote-write.md#syncattention).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/remote/write#SyncOutcome -->
```ts
interface SyncOutcome {
  /** How it ended: one of `SYNC_ENDINGS`' results, each described there. */
  readonly result: SyncEnding['result'];
  /** The remote as the sync left it: untouched, holding the new configuration, or needing its recovery route. */
  readonly remote: SyncEnding['remote'];
  /** Why, in a sentence, for every result but `written`. */
  readonly message?: string;
  /**
   * **The phase a failure happened in**, on a `failed` outcome and on no other, and `message` is worded for that
   * phase: a write that stopped part way, a read back that did not come back as written, a restart that failed or was
   * withheld, a hand over that was refused, an answer that never came. It is the phase last entered, but for two pieces
   * of work done outside the phase they belong to: the remote is opened and asked which unit it is once the document is
   * built, on both kinds of remote, and a failure there is `identify`'s; and on a write into flash the check that can
   * withhold the restart runs after the read back and before the restart phase is entered, and a restart it withheld
   * is `restart`'s.
   */
  readonly phase?: SyncPhase;
  /**
   * **What the remote was left needing**, on a `failed` outcome that leaves it needing something done: one of
   * `SYNC_STATES`, which says what is true of the remote, whether it may be unplugged and what puts it right.
   */
  readonly state?: SyncState;
  /**
   * **The activities the build left out, and why**, in the document's order: each one the document switches
   * off, `reason: 'switched-off'`, and each one that uses no device, `reason: 'no-device'`. On every outcome reached
   * after the build, whatever it was, and absent where every activity takes part or the sync ended before the build.
   * Stated on the outcome, the one event a screen is sure to show, since what the remote holds afterwards cannot say it: an activity left out is simply not there. The build's own result says the same,
   * `Built.leftOut`, and the journal has a line of it.
   */
  readonly leftOut?: readonly LeftOutActivity[];
}
```

From [`SyncOutcome`](api/remote-write.md#syncoutcome).
<!-- /shape -->

Every way a sync ends, per kind of remote, and every state it can leave a remote in:

<!-- shape:@freeharmony-sdk/remote/write#SYNC_ENDINGS -->
```ts
const SYNC_ENDINGS = {
  compiled: [
    { result: 'written', remote: 'new-configuration' },
    { result: 'nothing-to-write', remote: 'as-before' },
    { result: 'dry-run', remote: 'as-before' },
    { result: 'stopped', remote: 'as-before' },
    { result: 'refused', remote: 'as-before' },
    { result: 'failed', remote: 'as-before' },
    { result: 'failed', remote: 'needs-recovery', state: 'write-unfinished' },
    { result: 'failed', remote: 'needs-recovery', state: 'neighbour-erased' },
    { result: 'failed', remote: 'needs-recovery', state: 'read-back-failed' },
    { result: 'failed', remote: 'new-configuration', state: 'restart-owed' },
    { result: 'failed', remote: 'new-configuration', state: 'restart-withheld' },
  ],
  document: [
    { result: 'written', remote: 'new-configuration' },
    { result: 'dry-run', remote: 'as-before' },
    { result: 'stopped', remote: 'as-before' },
    { result: 'refused', remote: 'as-before' },
    { result: 'failed', remote: 'as-before' },
    { result: 'failed', remote: 'needs-recovery', state: 'stopped-in-hand-over' },
    { result: 'failed', remote: 'needs-recovery', state: 'stopped-after-hand-over' },
  ],
} as const satisfies Readonly<Record<string, readonly { readonly result: string; readonly remote: string; readonly state?: SyncState }[]>>
```

From [`SYNC_ENDINGS`](api/remote-write.md#sync_endings).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/remote/write#SYNC_STATES -->
```ts
const SYNC_STATES = {
  'write-unfinished': {
    holds: 'part of the configuration it held and part of the new one, the block being written when the write stopped '
      + 'erased or half written, and it has not been restarted',
    unplug: false,
    next: 'leave it on its cable with its batteries in and run the same sync again, built at the same moment, which '
      + 'finishes the blocks it left',
  },
  'neighbour-erased': {
    holds: 'part of the configuration it held and part of the new one, and a block beside the one being written erased '
      + 'as well, outside the block the write was told to erase; what that block held is in the backup the sync was '
      + 'given where the backup reaches it, which the message says, and it has not been restarted',
    unplug: false,
    next: 'send this remote nothing more and do not run the sync again: putting the erased block back is not built yet',
  },
  'read-back-failed': {
    holds: 'every block of the new configuration, each read back as it was written, and the whole configuration did not '
      + 'read back as written; it has not been restarted',
    unplug: false,
    next: 'leave it on its cable with its batteries in and run the same sync again, built at the same moment, which '
      + 'writes again every block that holds the new configuration or erased flash, and refuses a block that holds '
      + 'anything else',
  },
  'restart-owed': {
    holds: 'the new configuration, written and read back whole, and it has not restarted to take it up',
    unplug: true,
    next: 'restart it by hand, its batteries out and back in',
  },
  'restart-withheld': {
    holds: 'the new configuration, written and read back whole, and a check before the restart withheld it, so it has '
      + 'not taken it up; the message says what the check found',
    unplug: false,
    next: 'leave it as it is until what the check found is understood: no restart, by hand or over the cable, is '
      + 'offered for it',
  },
  'stopped-in-hand-over': {
    holds: 'the set it held before, still committed; a sync may be left marked running on it, and a change made on its '
      + 'own screens may be waiting to be handed up',
    unplug: false,
    next: 'ask it first whether a sync is marked running: if none is, nothing is owed; if one is, it is aborted and the '
      + 'remote restarted, and an abort now can leave a change made on its own screens without the tag that hands it '
      + 'up, so the person is asked before it; if it gives no answer, stop there. The library offers none of these '
      + 'steps yet',
  },
  'stopped-after-hand-over': {
    holds: 'the set it held before with what it handed up committed; a sync may be left marked running on it',
    unplug: false,
    next: 'ask it first whether a sync is marked running: if none is, nothing is owed; if one is, it is aborted and the '
      + 'remote restarted, which costs nothing; if it gives no answer, stop there. The library offers none of these '
      + 'steps yet',
  },
} as const satisfies Readonly<Record<string, { readonly holds: string; readonly unplug: boolean; readonly next: string }>>
```

From [`SYNC_STATES`](api/remote-write.md#sync_states).
<!-- /shape -->

## A read's progress

[`readConfig`](api/remote.md#readconfig) reports how far it is, and gives the configuration with what it read
besides.

<!-- shape:@freeharmony-sdk/remote#ReadProgress -->
```ts
interface ReadProgress {
  /** Bytes in hand, including the header probe. */
  readonly done: number;
  readonly total: number;
}
```

From [`ReadProgress`](api/remote.md#readprogress).
<!-- /shape -->

<!-- shape:@freeharmony-sdk/remote#ConfigRead -->
```ts
interface ConfigRead {
  readonly profile: RemoteProfile;
  readonly header: ConfigHeader;
  readonly versionBlock: Uint8Array;
  readonly bytes: Uint8Array;
  readonly durationMs: number;
  /**
   * How many windows had to be asked for again.
   *
   * Reported rather than swallowed: a read that needed retries is still a good read, since every
   * window is verified by the sequence check and the whole file by the end marker and the trailer
   * checksum, but a link that needs them constantly is a fault somebody should see. Zero is the
   * normal value and the one worth noticing when it changes.
   */
  readonly retries: number;
}
```

From [`ConfigRead`](api/remote.md#configread).
<!-- /shape -->
