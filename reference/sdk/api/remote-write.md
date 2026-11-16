# `@freeharmony-sdk/remote/write`

<!-- introduction -->
The remote package's write subpath: the sync of a document to a remote, the pretend remote a sync can be tried
against with nothing attached, and the write paths a sync runs on. Nothing here changes a remote unless the process
was started with the switches that allow it, [the guide's last section](../guide.md#writing-to-a-remote). An
application calls `syncDocument`; the write paths below it are offered for tools that drive one step at a time.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

## Answering a Harmony Touch's sync

The whole run, the switches it checks first, and what a caller hands it.

### `answerTouchSync`

```ts
async function answerTouchSync(run: TouchSyncRun): Promise<TouchSyncOutcome>
```

Answer one sync of a Harmony Touch, from the flags to the closed transport: the library half of
[`bin/touch-sync.ts`](../../../packages/remote/bin/touch-sync.ts)'s `--commit`.

In order: [`assertTouchSyncAllowed`](#asserttouchsyncallowed) and the label against [`TOUCH_SYNC_UNITS`](#touch_sync_units), before anything is opened; `open`; the
power source read through the read only route, [`readTouchPowerSource`](usb.md#readtouchpowersource), which reads the identity file for the
build, refuses a build the name is not read in, and opens `/tde/powerstate` for reading
and closes it again; a session, which reads the identity file and refuses any unit but `permittedUnit`,
`openTouchRequestSession`; `syncTouch`, which runs the gate, refuses a power source but `usb` and answers the sync
as this file's header lists; and the transport closed, whatever happened. Resolves with the outcome, as `syncTouch`
does, a power source but `usb` among the refusals before anything acts; throws only when the flags or the label
refuse, the open, the power read or the session fails, or the folder cannot be used, each before anything that acts
on the remote is sent.

Uses [`TouchSyncRun`](#touchsyncrun), [`TouchSyncOutcome`](#touchsyncoutcome).

### `assertTouchSyncAllowed`

```ts
function assertTouchSyncAllowed(): void
```

Throws unless a sync may be driven: `HARMONY_ENABLE_WRITES=1` and `HARMONY_TOUCH_REQUESTS=1` set, and
`HARMONY_TOUCH_RECOVERY` not.

### `prepareSet`

```ts
function prepareSet(set: TouchSet): { readonly set: PreparedSet } | { readonly refusals: readonly string[] }
```

The gate: the set's envelope, `setRefusals`, then its documents through the codec's
reader and check, `refusalsBeforeASync`, which wants all six configuration documents, every list the
engine's reader walks, and no finding the check calls `refused`. Either a prepared set or the refusals,
each a sentence a person can act on.

Uses [`TouchSet`](#touchset), [`PreparedSet`](remote-types.md#preparedset).

### `RECOVERY`

```ts
const RECOVERY = 'first read getconfighash, node packages/usb/bin/touch-request.ts --request confighash --commit: '
  + '200 needs nothing; 202 needs node packages/usb/bin/touch-recover.ts --step abort, that read again, then --step reboot; '
  + 'no answer at all, stop and ask'
```

The order a person follows after any stop once a Harmony Touch has been acted on: a read of the remote first, since
its answer says whether anything is left to clear, and then one recovery step at a time, each answer read before the
next. The abort's cost at the point a
run stopped is a line of its own, [`TouchSyncOutcome.abortCost`](#touchsyncoutcome).

### `SetAnswer`

```ts
interface SetAnswer {
  readonly uri: string;
  readonly 'body-type': BodyType;
  readonly etag?: string;
  readonly resource: unknown;
}
```

One answer of a set: the address it answers, its body's type, its tag if the set states one, and the body,
a parsed JSON object for a document and base64 text for a picture. **The shape of the answers Logitech's
client wrote**, so a set can be taken from a recording as it stands.

`uri` is matched by the key [`keyOf`](silhouettes.md#keyof) gives it: one of the six configuration documents by its name, so a set
answers the remote whatever account number its addresses carry, and anything else by the whole address.

Uses [`BodyType`](remote-types.md#bodytype).

### `SYNC_LINES`

```ts
const SYNC_LINES: readonly RegExp[]
```

The lines a run reports, one per step, for a status band to read. Every line `syncTouch` reports matches
one.

### `TOUCH_SYNC_UNITS`

```ts
const TOUCH_SYNC_UNITS: readonly ['touch']
```

**The Harmony Touches that may be synced, and no others**, each by the label of its record. [`answerTouchSync`](#answertouchsync) refuses
any other label before it opens anything, so the list is the library's and not a caller's. Syncing a user's own
remote is not built yet.

### `TouchSet`

```ts
interface TouchSet {
  readonly answers: readonly SetAnswer[];
}
```

The documents a Harmony Touch is answered with in one sync, each at the address it asks for.

Uses [`SetAnswer`](#setanswer).

### `TouchSyncMode`

```ts
type TouchSyncMode =
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'set'; readonly set: TouchSet };
```

What a Touch's sync answers with: nothing new, so the remote keeps what it holds, or a set of documents.

Uses [`TouchSet`](#touchset).

### `TouchSyncOutcome`

```ts
interface TouchSyncOutcome {
  readonly ending: 'finished' | 'aborted' | 'refused';
  /** Why, for a refusal. */
  readonly reason?: string;
  /** Whether anything that acts on the remote had been sent when the run ended. */
  readonly acted: boolean;
  /**
   * Where the run stood when it ended: before the hand over, in it, or past it, the sync request and the sync itself.
   * **Data a caller acts on**, where `recovery` and `abortCost` are the sentences a person at the remote reads: what an
   * abort would cost follows from it, and `syncDocument` names the state a refusal after the remote was acted on left
   * it in by it. Absent on an outcome made before it was reported.
   */
  readonly stage?: 'before' | 'hand over' | 'sync';
  /** The order of recovery steps, `RECOVERY`, for a refusal after the remote was acted on. */
  readonly recovery?: string;
  /** What an abort would cost at the point the run stopped, for the same refusals. */
  readonly abortCost?: string;
  /** How many request lists were read in the sync down, and how many answers written in it. */
  readonly lists: number;
  readonly answered: number;
  /** The keys of what the remote handed up, each kept in the run's folder before its answer. */
  readonly handedUp: readonly string[];
}
```

How a Touch's sync ended, why where it was refused, and what was sent.

### `TouchSyncRun`

```ts
interface TouchSyncRun extends Omit<TouchSyncOptions, 'session' | 'powerSource'> {
  /** The label of the unit's record; refused unless it is one of `TOUCH_SYNC_UNITS`. */
  readonly label: string;
  /** That record: the identity the session compares the Touch on the cable with. */
  readonly permittedUnit: Uint8Array;
  /** Open the Touch, `openFileBasedRemote` for the script; called once the flags have passed. */
  open(): Promise<Transport>;
  /** The session's own lines, one per request and the identity read, which do not start with `sync:`. */
  readonly log?: (line: string) => void;
}
```

What [`answerTouchSync`](#answertouchsync) needs: what `syncTouch` takes but the session and the power source, which it opens and reads itself.

Uses [`TouchSyncOptions`](remote-types.md#touchsyncoptions), [`Transport`](usb.md#transport).

## Syncing a document

The one function an application writes a remote through, for every model, reporting as events, and a pretend remote to run it against, which a read of a configuration, [`readConfig`](remote.md#readconfig) on the main entry, reads through [`pretendReader`](#pretendreader). Built to a pretend remote and to an attached remote of the same models: a Harmony One, 600, 650 or 700, over [`writeConfiguration`](#writeconfiguration), and a Harmony Touch, over [`answerTouchSync`](#answertouchsync); for a document of any other model it refuses by name, as not built yet. The keeper is one of two kinds, by the kind of family the remote's model is chosen into: [`CompiledKeeper`](#compiledkeeper) for a write into flash, [`DocumentKeeper`](#documentkeeper) for an answered sync. What a failed sync leaves a remote needing is a state of a closed list, [`SYNC_STATES`](#sync_states), with what is true of the remote, whether it may be unplugged and what puts it right, so an application acts on data rather than on a sentence. Whether that sync is there for a document's model is [`syncIsBuilt`](#syncisbuilt), asked before a sync is offered.

### `AttachedRemote`

```ts
interface AttachedRemote {
  readonly kind: 'attached';
  readonly found: FoundRemote;
  readonly keeper: RemoteKeeper;
}
```

A remote found on the cable, [`listHarmony`](usb.md#listharmony), with what its keeper holds for it.

Uses [`FoundRemote`](usb.md#foundremote), [`RemoteKeeper`](#remotekeeper).

### `CompiledKeeper`

```ts
interface CompiledKeeper {
  readonly kind: 'compiled';
  /** The units this caller keeps records of, each with the names of its region reads. */
  readonly units: readonly ConfigWriteUnit[];
  /** Each unit's recorded identity, which the remote on the cable has to match by its own identity block. */
  readonly records: UnitRecords;
  /**
   * The read of the unit's configuration region as it is now, whole blocks from the region's base: its name, one of
   * the unit's `regions`, and its bytes. A write is refused where the remote does not hold exactly this.
   */
  readonly region: { readonly name: string; readonly bytes: Uint8Array };
  /**
   * Keep the configuration that is about to be written, called once before a committed write with the bytes built,
   * so that whatever happens next the caller holds what the remote was being given.
   */
  readonly keep: (configuration: Uint8Array) => void;
  /** Open the remote; absent, the one found is opened through the guarded transport. A test hands in a stand in. */
  readonly open?: () => Promise<{ readonly remote: HarmonyRemote; readonly productId: number }>;
}
```

The keeper of a remote whose configuration is written into flash: the records that say which unit it is, and the
read of what it held, which is both the backup and what every block is compared with before it is erased.

Uses [`ConfigWriteUnit`](#configwriteunit), [`UnitRecords`](#unitrecords), [`HarmonyRemote`](usb.md#harmonyremote).

### `DocumentKeeper`

```ts
interface DocumentKeeper {
  readonly kind: 'document';
  /** The label of the unit's record, refused unless it is one of the library's `TOUCH_SYNC_UNITS`. */
  readonly label: string;
  /** That unit's recorded identity, which the session compares the remote's serial with when it opens. */
  readonly permittedUnit: Uint8Array;
  /** The address each of the six configuration documents is asked at, by the document's name. */
  readonly addresses: Readonly<Record<string, string>>;
  /**
   * Make the folder the run is kept in, new or empty; called once, before a committed sync opens anything, and never
   * by a dry run, which keeps nothing. A function rather than a path, so that a dry run leaves no empty folder behind.
   */
  readonly folder: () => string;
  /**
   * Keep the set that is about to be delivered, called once before a committed sync opens anything, so that whatever
   * happens next the caller holds what the remote was being given. It holds the account's values, so it is kept
   * where the account's description is.
   */
  readonly keep: (set: TouchSet) => void;
  /** Open the Touch; absent, the one found is opened through the file protocol's guard. A test hands in a stand in. */
  readonly open?: () => Promise<Transport>;
}
```

The keeper of a remote that asks for documents and is answered, a Harmony Touch, the only model of a document family
there is: a second document family whose write path takes other things is a third arm, not a reason to widen this one.

**What it holds, and why each is the keeper's.** The unit's label and its recorded identity, because which unit may
be synced is the library's list and the identity is what the session compares the remote's serial with, as
[`answerTouchSync`](#answertouchsync) takes them. The account's addresses, because the documents a sync delivers are answered at the
addresses the remote asks by, and those name the account and the remote by number: they are read off a set the
remote held and kept with its other records, never in a document, and the codec's build neither needs nor holds
them, `touchSetOf`. And the folder, because the answerer keeps every request, every answer and every document the
remote hands up in it, before the next step: that is this path's journal of content, beside the journal of lines.

Uses [`TouchSet`](#touchset), [`Transport`](usb.md#transport).

### `PretendFailure`

```ts
type PretendFailure = SyncPhase | 'neighbour' | 'read';
```

What goes wrong in the next sync or the next read of a pretend remote, once. Each is a failure of the remote or the
cable, reported where the real path meets it, and the outcome says what the real path says a failure there leaves:

* `identify`: the remote does not answer when it is asked which unit it is. **This shows after `build`**, where both
  real paths open the remote, since the `identify` phase reads only what the remote says without being opened and
  cannot fail on the cable; it ends `failed` in `identify`, as [`SyncOutcome.phase`](#syncoutcome) says of that work, with the remote
  as it was.
* `check` and `build`: the document refused by its check or its build, `refused` and as it was. These two are the
  document's and not the remote's, and stand in for a document that fails them.
* `backup`: reading what the remote holds stops part way, `failed` in `backup` and as it was.
* `hand-over`, a Harmony Touch's: the remote stops answering while it hands its own changes up, `failed` in
  `hand-over` and `stopped-in-hand-over`.
* `write`: the remote stops answering part way through the write, `failed` in `write`: for flash `write-unfinished`,
  the block being written left erased, and the same sync run again finishes it, as on the real remote; for a Harmony
  Touch, once the sync has started, `stopped-after-hand-over`.
* `verify`: the last block written reads back erased, `failed` in `verify` and `read-back-failed`, and the same sync
  run again writes it.
* `restart`: the restart fails, `failed` in `restart` with the remote holding the new configuration,
  `restart-owed`, and a restart by hand asked.
* `neighbour`: the first erase of the write reaches the block beside it, `failed` in `write` and `neighbour-erased`,
  as `writeBlock` reports it on the real remote. For flash only; a Harmony Touch erases nothing.
* `read`: the next read stops answering part way, after the windows the retries allow, as [`readConfig`](remote.md#readconfig) meets it.

The states are [`SYNC_STATES`](#sync_states)'; a restart withheld by a check, `restart-withheld`, has no stand in, since no model a
pretend remote is made of withholds one.

A phase a model's sync does not have is never entered, so failing in it fails nothing.

Uses [`SyncPhase`](#syncphase).

### `PretendOptions`

```ts
interface PretendOptions {
  readonly model: RecipeModel;
  /** What it holds to begin with; absent is a remote with no setup of ours, whose configuration region is erased. */
  readonly holds?: Recipe;
  /**
   * What the configuration it holds to begin with was built from, for a model whose configuration is written into
   * flash: the moment, which every stamp in it is taken from, and a catalogue for a device `holds` names and does not
   * carry. Absent, it is built at the first moment of 2026 with no catalogue, any moment before a sync's own being as good. A sync of the same document built at the same
   * moment then has nothing to write, and one built at another moment writes the blocks the stamps are in, as a remote
   * on the cable does.
   */
  readonly heldSources?: BuildSources;
  /** Fail the next sync or read where this says, and that one only, `PretendFailure`. */
  readonly failIn?: PretendFailure;
  /**
   * A Harmony Touch's own abort: the next sync that reaches the write is aborted by the remote, which deletes what it
   * had gathered and keeps the set it held, `failed` with the remote as it was. Once, as `failIn` is.
   */
  readonly aborts?: boolean;
  /**
   * The power source a pretend Harmony Touch reports, `usb` when absent: on any other a sync is refused before the
   * remote is acted on, in a dry run and a commit alike, with the words the real check gives.
   */
  readonly powerSource?: TouchPowerSource;
  /**
   * How long it takes over each step, in milliseconds, so a screen can be watched moving; absent or 0 answers at once,
   * which is what a test wants. A number the caller picks: it is no measurement of any remote.
   */
  readonly stepMs?: number;
}
```

How a pretend remote behaves.

Uses [`RecipeModel`](config.md#recipemodel), [`Recipe`](config.md#recipe), [`BuildSources`](config.md#buildsources), [`PretendFailure`](#pretendfailure), [`TouchPowerSource`](usb.md#touchpowersource).

### `PretendRead`

```ts
interface PretendRead {
  readonly reader: ConfigReader;
  readonly profile: RemoteProfile;
}
```

A read of a pretend remote, as [`readConfig`](remote.md#readconfig) takes one: the reader its commands go to, and the profile of the
remote's model, which says where its configuration starts. `readConfig(read.reader, read.profile, options)` then
reads it as it reads a remote on the cable, with the same progress, the same checks and the same failures.

Uses [`ConfigReader`](remote.md#configreader), [`RemoteProfile`](remote.md#remoteprofile).

### `pretendReader`

```ts
function pretendReader(remote: PretendRemote): PretendRead
```

A read of a pretend remote: what [`readConfig`](remote.md#readconfig) takes, a reader and the profile of the remote's model, served
from what the pretend remote holds. The read itself is [`readConfig`](remote.md#readconfig)'s, so its progress, its retries and its checks
are a real read's; a remote holding none of ours reads as erased and is refused by the same check as a remote that
holds no configuration. Refused, as [`profileFor`](remote.md#profilefor) refuses a product id, for a model the read of a configuration does
not serve: a Harmony Touch, whose documents no entry reads yet, and the Harmony 300 and 350. That refusal is a thrown
[`ReadError`](remote.md#readerror).

Uses [`PretendRemote`](#pretendremote-type), [`PretendRead`](#pretendread).

### `PretendRemote` (type)

```ts
interface PretendRemote {
  readonly kind: 'pretend';
  readonly model: RecipeModel;
  /**
   * The document whose configuration it holds whole: the one last synced to it, or the one it was made with; undefined
   * when it holds none of ours, and after a write that stopped part way, which leaves it holding a part of each.
   */
  readonly holds: () => Recipe | undefined;
}
```

A remote that is not there: an application syncs to it and reads it as it would a remote on the cable, and it
answers with the events, the outcomes and the words a remote on the cable gives, its failures included, so every
screen of a sync and a read can be built and tried with nothing attached. Made by [`pretendRemote`](#pretendremote) and by nothing
else: an object put together to look like one is refused.

**What it holds**, for as long as the object lives: for a model whose configuration is written into flash, the
bytes of the configuration last written to it, which a sync compares by erase block as the real write does and a
read reads back; for a Harmony Touch, nothing but the document last synced, since a Touch's sync never asks the
remote what it holds.

Uses [`RecipeModel`](config.md#recipemodel), [`Recipe`](config.md#recipe).

### `pretendRemote`

```ts
function pretendRemote(options: PretendOptions): PretendRemote
```

A pretend remote of a model, holding the configuration built from `options.holds` where one is given. Throws
`RangeError` for a model the library does not know, for a `holds` document of another model and for a negative
`stepMs`.

Uses [`PretendOptions`](#pretendoptions), [`PretendRemote`](#pretendremote-type).

### `RemoteKeeper`

```ts
type RemoteKeeper = CompiledKeeper | DocumentKeeper;
```

What a sync to an attached remote needs that only whoever keeps the remote holds: an application keeps them with
its user's own data. **None of it is a permission**: which units may be written
is the library's list, [`CONFIG_WRITE_UNITS`](#config_write_units) or [`TOUCH_SYNC_UNITS`](#touch_sync_units), and a label outside it is refused.

**A union by kind**, the kind of family the remote's model is chosen into, because a flash write and an answered
sync need different things of a keeper: the compiled family's write compares every block with a read of what the
remote held and identifies the unit among several records; a Harmony Touch's answerer reads nothing back, compares
the one unit's serial, and keeps its whole run in a folder. A keeper of the other kind than the remote found is
refused by name before anything is opened.

Uses [`CompiledKeeper`](#compiledkeeper), [`DocumentKeeper`](#documentkeeper).

### `SYNC_ENDINGS`

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

**Every way a sync ends, per kind of remote**: each result with what it leaves the remote as, and the state it names
where it names one. The one place the outcomes are stated, so that [`SyncOutcome`](#syncoutcome)'s types are derived from it and a
screen, or a test that every ending is reached, can walk it; a result or a state added to the type is added here or
nowhere.

* `written`: the remote holds the document's configuration, read back and equal, or, on a Harmony Touch, committed
  by it.
* `nothing-to-write`: the remote already held it; a write into flash only, [`SyncOutcome`](#syncoutcome)'s header says why.
* `dry-run`: everything up to the first write was done and nothing was sent, `commit` being false.
* `stopped`: a stop was asked and honoured, so the remote is as it was.
* `refused`: a check or a rail refused before anything was written.
* `failed`: something went wrong on the cable, in the remote or in its keeper; `remote` says what that left, as it
  was before anything changed, needing its recovery part way, or, for flash, the new configuration whole with only
  the restart owed, and `state` what is owed. A Harmony Touch swaps a set in only at its commit, so a failure never
  leaves it the new one.

### `SYNC_STATES`

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

**The states a failed sync can leave a remote in that need something done**, a closed list: for each, what is true
of the remote (`holds`), whether it may be unplugged now (`unplug`), and what puts it right (`next`), each worded for
a person and naming no command, script or switch. An outcome names one in [`SyncOutcome.state`](#syncoutcome), and [`SYNC_ENDINGS`](#sync_endings)
pairs each with the result and the remote it comes with. A state is named only where something is owed: a failure
that leaves the remote as it was names none. An application acts on the state, offering the same sync again,
asking for the batteries or keeping the person from unplugging, which it cannot do by reading a sentence.

* `write-unfinished`, a configuration written into flash: the write stopped part way.
* `neighbour-erased`, the same: the write stopped because an erase reached the block beside the one it was told to
  erase. Running the same sync again is what must not happen here.
* `read-back-failed`, the same: every block was written, and the whole configuration did not read back as written.
* `restart-owed`, the same: the new configuration is whole and the restart failed.
* `restart-withheld`, the same: the new configuration is whole and a check before the restart withheld it. Only a
  Harmony 885's write withholds one, and no document builds for an 885 yet, so no sync reaches this state.
* `stopped-in-hand-over`, a Harmony Touch: the sync stopped while the remote handed its own changes up.
* `stopped-after-hand-over`, the same: the hand over had ended, and the sync then stopped.

### `SyncAttention`

```ts
type SyncAttention =
  | 'do-not-unplug'
  | 'safe-to-unplug'
  | 'restarting'
  | 'restart-by-hand';
```

What a person must do or leave while a sync runs.

### `syncDocument`

```ts
async function syncDocument(request: SyncRequest): Promise<SyncOutcome>
```

Sync a document to a remote: checked, built, written by the model's own write path and, where that path reads back,
read back; reported as events. Resolves with the outcome, which is also the last event.

**When it resolves and when it rejects.** From the check on, every refusal and every failure is an outcome and not
an exception: a document the check or the build refuses, a remote on the cable that is not the document's model, a
refusal by the write path or its checks (the write switches among them), a stop, and a failure of the remote or the
cable, each with what it left the remote as. It rejects in two cases only, both before anything is opened or sent:
with [`NotBuiltError`](config.md#notbuilterror) for a document of a model whose sync is not built yet, and with a `TypeError` for a pretend
remote that [`pretendRemote`](#pretendremote) did not make. A Harmony 885's document gets as far as the build and ends `refused`, since
no document builds for an 885 yet.

Not built yet: a sync of every model but the Harmony One, 600, 650, 700 and 885 and the Harmony Touch, a Harmony 300
or 350 among them.

**Asking beforehand.** [`syncIsBuilt`](#syncisbuilt) with the document's model says whether this sync is there for it, both cases
above at once: a model this function rejects, and a model whose document it takes and nothing builds. An application
offers a sync only where that answer is true, rather than finding out from the error or the outcome.

Uses [`SyncRequest`](#syncrequest), [`SyncOutcome`](#syncoutcome).

### `SyncEnding`

```ts
type SyncEnding = (typeof SYNC_ENDINGS)[keyof typeof SYNC_ENDINGS][number];
```

One ending of [`SYNC_ENDINGS`](#sync_endings), of either kind of remote.

Uses [`SYNC_ENDINGS`](#sync_endings).

### `SyncEvent`

```ts
type SyncEvent =
  | { readonly kind: 'phase'; readonly phase: SyncPhase }
  | { readonly kind: 'progress'; readonly phase: SyncPhase; readonly done: number; readonly total: number }
  | { readonly kind: 'attention'; readonly attention: SyncAttention; readonly message: string }
  | { readonly kind: 'outcome'; readonly outcome: SyncOutcome };
```

One thing a sync reports. A screen needs no more than the latest of each kind.

Uses [`SyncPhase`](#syncphase), [`SyncAttention`](#syncattention), [`SyncOutcome`](#syncoutcome).

### `syncIsBuilt`

```ts
function syncIsBuilt(model: RecipeModel): boolean
```

Whether [`syncDocument`](#syncdocument) syncs a document of this model: a write path takes the model, and a document of it builds.
False where [`syncDocument`](#syncdocument) would reject with [`NotBuiltError`](config.md#notbuilterror), and false too where it would take the document and
end `refused` in the build because nothing builds for the model yet, as for a Harmony 885. An application asks
this before it offers to sync, and passes the document's own `model`.

True does not promise that a sync ends `written`: the document is still checked and built, the remote on the cable
still has to be the document's model, and every check a write makes still applies. It says only that the sync of
this model is there.

Uses [`RecipeModel`](config.md#recipemodel).

### `SyncOutcome`

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

How a sync ended, and what state it left the remote in, which is what a person needs to know first.

**For a Harmony Touch**: `written` when the remote finished, which it does only after it has committed what it was
answered, so it holds the new set (nothing is read back: the answerer has no read back, and the remote's own commit
is the check); `refused` with the remote `as-before` for every refusal before the first request that acts on it,
the gate, a power source but `usb` and the provisioning read among them; `failed` with the remote `needs-recovery` for a refusal after it,
with the state it was left in, `stopped-in-hand-over` or `stopped-after-hand-over`, which says what an abort would
cost there; and `failed` with the remote `as-before` when the remote itself aborted, since an abort deletes what it
had gathered and reloads the set it held. **`nothing-to-write` is never a Touch's outcome**: what the remote holds
can be told only by asking it, a request the answerer does not send, and a sync whose every answer turns out 304 has
still handed the remote's own changes up and committed, so it is `written`.

**Words for a person, data for an application.** `message` is a sentence to show and names no command, script, path
or switch, since an application's user has none of them; what an application acts
on is `result`, `remote`, `phase` and `state`.

Uses [`SyncEnding`](#syncending), [`SyncPhase`](#syncphase), [`SyncState`](#syncstate), [`LeftOutActivity`](config.md#leftoutactivity).

### `SyncPhase`

```ts
type SyncPhase =
  | 'identify'
  | 'check' | 'build'
  | 'backup'
  | 'hand-over'
  | 'write' | 'verify' | 'restart';
```

What a sync is doing, in the order it does it; a model's sync leaves out the phases it has no use for. A sync of a
configuration written into flash runs `identify`, `check`, `build`, `backup`, `write`, `verify` and `restart`; a sync
of a Harmony Touch runs `identify`, `check`, `build`, `hand-over` and `write`, and has no read back and no restart:
the remote commits what it gathered itself and goes on running, and the answerer reads nothing back.

### `SyncRemote`

```ts
type SyncRemote = AttachedRemote | PretendRemote;
```

The remote a sync writes: one found on the cable or a pretend one. Which unit an attached remote is, is read off
the remote itself; a caller cannot state it.

Uses [`AttachedRemote`](#attachedremote), [`PretendRemote`](#pretendremote-type).

### `SyncRequest`

```ts
interface SyncRequest {
  readonly document: Recipe;
  readonly remote: SyncRemote;
  /**
   * What a build reads beyond the document: the catalogue for a device whose definition it does not carry, and the
   * moment it is built at, which every stamp in the configuration is taken from. **A sync run again after one
   * that failed part way is given the same moment**: the remote then holds a part of that build, and the write
   * recognises a block it left unfinished only against the same bytes.
   *
   * **A Harmony Touch's build also needs `account`**, the identifiers its documents carry, and refuses without it;
   * its documents take no stamp from the moment, so for a Touch the moment changes nothing. The addresses the
   * documents are answered at are the account's too, and are the keeper's, `DocumentKeeper.addresses`, since the
   * build neither needs nor holds them.
   */
  readonly sources: BuildSources;
  /** False runs everything up to the first write and sends nothing that changes the remote. */
  readonly commit: boolean;
  readonly onEvent: (event: SyncEvent) => void;
  /** Every line the write path prints, in order; required, as the write paths require it. */
  readonly journal: (line: string) => void;
  /**
   * Ask the sync to stop; honoured up to the first write, and a sync that has begun to write runs to its end. On a
   * Harmony Touch, honoured up to the moment the remote is opened and not after, `syncAttachedTouch` says why.
   */
  readonly stop?: AbortSignal;
}
```

What a sync is given.

Uses [`Recipe`](config.md#recipe), [`SyncRemote`](#syncremote), [`BuildSources`](config.md#buildsources), [`SyncEvent`](#syncevent).

### `SyncState`

```ts
type SyncState = keyof typeof SYNC_STATES;
```

One state of [`SYNC_STATES`](#sync_states).

Uses [`SYNC_STATES`](#sync_states).

## Writing a configuration

To a remote of the compiled families, the Harmony One, 600, 650, 700 and 885.

### `CONFIG_WRITE_MODELS`

```ts
const CONFIG_WRITE_MODELS = {
  'Harmony 885': {
    architecture: 8, sequenceReadOn: ['4.4'], dropRequired: ARCH8_DROP_REQUIRED, installStatusAt: ARCH8_INSTALL_STATUS,
  },
  'Harmony One': { architecture: 12, sequenceReadOn: ['3.4'] },
  'Harmony 650': { architecture: 14, sequenceReadOn: ['0.2'] },
  'Harmony 600': { architecture: 14, sequenceReadOn: ['0.2'] },
  'Harmony 700': { architecture: 14, sequenceReadOn: ['2.8'] },
} as const satisfies Readonly<Record<string, ConfigWriteModel>>
```

The models this may write, with what each one's write end needs. **A model here is not a permission**: the
unit has to be among the caller's `units`, match its record by its own identity block, and pass every rail
in `@freeharmony-sdk/usb`, which keeps its own lists per path.

### `CONFIG_WRITE_UNITS`

```ts
const CONFIG_WRITE_UNITS: Readonly<Record<string, { readonly name: string; readonly model: ConfigWriteModelName }>>
```

**The remotes that may be written, and no others**: the remotes the SDK's writes are proven on, each by the label of
its record, with what it is called and its model. [`writeConfiguration`](#writeconfiguration) refuses any other label before it opens
anything. Writing a user's own remote is not built yet, so an application reaches no remote through this list.

### `ConfigWrite`

```ts
interface ConfigWrite {
  /** The configuration: the name it is known by in the account, a path for the script, and its bytes. */
  readonly config: { readonly name: string; readonly bytes: Uint8Array };
  /** The region read the unit's content is compared against: its name, one of a unit's `regions`, and its bytes. */
  readonly region: { readonly name: string; readonly bytes: Uint8Array };
  /** Every unit this caller may write. The one on the cable is chosen by what it reports, never by the caller. */
  readonly units: readonly ConfigWriteUnit[];
  readonly records: UnitRecords;
  readonly stamp: ConfigWriteStamp;
  /** Write. Without it the run reads only and says what a commit would do, the script's dry run. */
  readonly commit: boolean;
  /**
   * Send the cache drop before the first erase, as an ordinary write does; false leaves it out, and is refused on a
   * model whose drop is required.
   */
  readonly invalidate: boolean;
  /** Send the restart at the end, as an ordinary write does; false leaves it out. */
  readonly restart: boolean;
  /**
   * Send one command and write nothing, on a remote that already holds the configuration: the cache drop or the
   * restart.
   */
  readonly only?: 'drop' | 'restart';
  /** Open the one remote to write, after every check that needs no remote has passed. */
  open(): Promise<{ readonly remote: HarmonyRemote; readonly productId: number }>;
  /**
   * The stamped bytes, to keep before the first command that changes the remote, so a rerun finds them and
   * writes them unchanged, `stoppedAfterErase`. Required for the journal's reason.
   */
  saveStamped(bytes: Uint8Array): void;
  /**
   * Each line of the account, without its newline, as it happens. **Required**: a run's own account of itself is the
   * only record of what reached the flash when it is killed part way, so a write that keeps none is not one this
   * offers. Keep the lines somewhere that outlives the process, a file beside the configuration for instance.
   */
  readonly say: (line: string) => void;
  /** True the instant before the first erase goes out, false once its block is verified, as `writeBlock` sets it. */
  readonly onPastTheErase?: (value: boolean) => void;
  /**
   * Where the run is, for a caller that shows it. **Never the account**, which is `say`'s and is required, and
   * **never able to stop a write**: whatever this throws is dropped, since a screen that fails between an erase
   * and its write must not be what leaves a remote without a configuration.
   */
  readonly onStep?: (step: ConfigWriteStep) => void;
  /**
   * Ask the run to stop. Honoured at one point only: after every read and compare, before the first command that
   * changes the remote, where the run ends with `ConfigWriteStopped` and nothing written. Asked later it is not
   * honoured, because between an erase and its write a block is blank and between two blocks the remote holds a
   * part of each configuration.
   */
  readonly stop?: AbortSignal;
  /** A line that is not part of the account: a close that failed before any restart was sent. */
  readonly warn?: (line: string) => void;
}
```

What [`writeConfiguration`](#writeconfiguration) is given: the configuration, the backup of the remote it is compared against, the
unit it may write, and whom it tells what it does.

Uses [`ConfigWriteUnit`](#configwriteunit), [`UnitRecords`](#unitrecords), [`ConfigWriteStamp`](#configwritestamp), [`HarmonyRemote`](usb.md#harmonyremote), [`ConfigWriteStep`](#configwritestep).

### `ConfigWriteModel`

```ts
interface ConfigWriteModel {
  /** The architecture every unit of this model reports, which the remote's own version block is checked against. */
  readonly architecture: number;
  /**
   * The firmware builds, as the remote reports them, whose cache drop and restart commands are known. A remote
   * reporting any other build is refused a commit, because both commands are the firmware's and not the format's.
   * Empty for a model none of whose builds is known yet. **The version string is not a build**: the 600 and the 650
   * both report 0.2 and differ.
   */
  readonly sequenceReadOn: readonly string[];
  /** Why `invalidate: false` is refused on this model, or undefined where the control is offered. */
  readonly dropRequired?: string;
  /**
   * The data memory address of the staged install's status byte, where a restart over USB can install
   * firmware, or undefined where it cannot.
   */
  readonly installStatusAt?: number;
}
```

What a model's write end needs, which is the firmware's and not the caller's to say.

### `ConfigWriteModelName`

```ts
type ConfigWriteModelName = keyof typeof CONFIG_WRITE_MODELS;
```

A model the configuration write serves, by its name in [`CONFIG_WRITE_MODELS`](#config_write_models).

Uses [`CONFIG_WRITE_MODELS`](#config_write_models).

### `ConfigWriteRefusal`

```ts
class ConfigWriteRefusal extends Error {
  /** In the refusal of a commit on a firmware build whose cache drop and restart have not been read. */
  static readonly BUILD_NOT_READ: 'so a write to a remote on this build is not built yet';
  /** In the refusal of a backup that differs from what the remote holds, found before anything was erased. */
  static readonly BACKUP_NOT_CURRENT: 'the backup is not this unit\'s current content';
  /** In the refusal of a block to be written that the backup does not reach, found before anything was erased. */
  static readonly BACKUP_TOO_SHORT: 'runs past the end of the backup it was given';
}
```

A refusal of the write, before anything was sent or at any point after, as opposed to a fault. The words that
say which refusal it was are constants on the class, so a caller tells them apart without matching on prose.

### `ConfigWriteResult`

```ts
interface ConfigWriteResult {
  /** How the run ended: nothing differed, a dry run, one of the two controls, or a written configuration. */
  readonly outcome: 'nothing to write' | 'dry run' | 'dropped' | 'restarted' | 'written';
  readonly architecture: number;
  /** The unit it ran against, by its name in `CONFIG_WRITE_UNITS`. */
  readonly unit: string;
  readonly firmware: string;
  /** The stamp written, when this run stamped. */
  readonly stampedAt?: string;
  /** The blocks that differ from the region read, as flash addresses, written when `outcome` is `written`. */
  readonly blocks: readonly number[];
  readonly changedBytes: number;
  /** Whether the restart was sent. */
  readonly restarted: boolean;
}
```

How a configuration write ended, and what it wrote.

### `ConfigWriteStamp`

```ts
type ConfigWriteStamp =
  /** The moment of writing, the ordinary case. */
  | { readonly kind: 'now'; readonly at: Date }
  /** The file's own, for a compile put back unchanged; the script's `--as-is`, and implied by `only`. */
  | { readonly kind: 'as-is' }
  /**
   * The stamp a run that stopped past its erase saved over the file, which is what its blocks hold, so the
   * file is written as it is. `journal` names that run's journal; `stoppedAfterErase` in `stamp.ts` decides.
   */
  | { readonly kind: 'resume'; readonly journal: string };
```

Which stamp the configuration is written with.

### `ConfigWriteStep`

```ts
type ConfigWriteStep =
  | { readonly step: 'identified'; readonly unit: string }
  | { readonly step: 'comparing'; readonly done: number; readonly total: number }
  | { readonly step: 'writing'; readonly done: number; readonly total: number }
  | { readonly step: 'verifying' }
  | { readonly step: 'verified' }
  | { readonly step: 'restarting' };
```

Where a run is, for a caller that shows it, [`ConfigWrite.onStep`](#configwrite): the unit recognised, each block read and
compared before anything is erased, each block written and read back, the whole configuration read back, the
whole read back found equal, and the restart. `writing` with `done` 0 is the moment before the first command that
changes the remote.

**`verified` is its own step** because what a failure after it means differs from one before it: before it the
remote may hold a configuration that does not read back as written, and after it the configuration is whole and
only the restart is owed. Between `verified` and `restarting` sits the check that can withhold the restart, the
staged install status on a Harmony 885, so a caller told of both can say a restart was withheld rather than that a
read back failed.

### `ConfigWriteStopped`

```ts
class ConfigWriteStopped extends ConfigWriteRefusal {}
```

The refusal of a run that was asked to stop, [`ConfigWrite.stop`](#configwrite): thrown at the one point a stop is honoured,
after every read and before the first command that changes the remote, so it always means nothing was written.
A refusal like any other for a caller that does not ask which.

Uses [`ConfigWriteRefusal`](#configwriterefusal).

### `ConfigWriteUnit`

```ts
interface ConfigWriteUnit {
  /** The name of its record, which `UnitRecords` is asked for; refused unless it is a key of `CONFIG_WRITE_UNITS`. */
  readonly label: string;
  /**
   * The names of the region reads that are this unit's own content, each read whole blocks from the
   * configuration's base. The region read handed in has to be one of them, so that one unit is never compared
   * against another's content.
   */
  readonly regions: ReadonlySet<string>;
}
```

One unit a caller may write, as the caller records it: a label of [`CONFIG_WRITE_UNITS`](#config_write_units) and its region reads.

### `ConfigWriteUnitLabel`

```ts
type ConfigWriteUnitLabel = keyof typeof CONFIG_WRITE_UNITS;
```

A label of [`CONFIG_WRITE_UNITS`](#config_write_units), which a caller's table can be typed by so that the compiler holds it to the list.

Uses [`CONFIG_WRITE_UNITS`](#config_write_units).

### `UnitRecords`

```ts
interface UnitRecords {
  text(label: string): string | undefined;
  where(label: string): string;
}
```

Where a caller keeps its units' records: the text of each, and where it is kept, for a refusal's wording.

### `writeConfiguration`

```ts
async function writeConfiguration(request: ConfigWrite): Promise<ConfigWriteResult>
```

Write `request.config` to the unit on the cable, as the header lists. Resolves with what was done; throws a
[`ConfigWriteRefusal`](#configwriterefusal) for every refusal, and lets a fault of the remote or of a rail through as it is.

Uses [`ConfigWrite`](#configwrite), [`ConfigWriteResult`](#configwriteresult).
