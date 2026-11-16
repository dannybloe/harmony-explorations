# `recipe` on `@freeharmony-sdk/config`

<!-- introduction -->
The document toolkit, imported as `recipe` from the config package's main entry: creating and opening a document,
adding, changing and removing its devices and activities, asking what every key and screen does, and checking it. Every
change returns a new document with a list of its effects, and refuses with `recipe.ChangeRefused` what it will not do.
[The guide](../guide.md) shows it at work, and [the documents](../documents.md) the shapes it takes and gives.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

## A document to start from

### `recipe.create`

```ts
function create(model: RecipeModel): Recipe
```

A fresh document for a model: no device, no activity, and valid as it stands. Not built for a model no family serves
yet, and refused as a [`RecipeError`](config.md#recipeerror) for one that names no remote, `servedBy`, so a document is never started that
nothing could build.

Uses [`RecipeModel`](config.md#recipemodel), [`Recipe`](config.md#recipe).

### `recipe.open`

```ts
function open(json: unknown): Recipe
```

A document out of parsed JSON or out of a recipe written by hand: its shape checked as [`readRecipe`](config.md#readrecipe) checks it, an
id given to every device, activity and sequence that has none, in the document's own order and past the highest
any id of that kind has carried, and the version stated. A document that already went through here comes back
equal, so opening is safe to do on every load; and it is a copy, sharing nothing with the value given.

Uses [`Recipe`](config.md#recipe).

## Addresses

What a change gives back, what a check lists, and the refusal

### `recipe.ActivityId`

```ts
type ActivityId = string;
```

An activity's id in its document.

### `recipe.Change`

```ts
interface Change {
  readonly document: Recipe;
  readonly effects: readonly Effect[];
}
```

A change's result: the new document, and everything else the change touched to keep it consistent.

Uses [`Recipe`](config.md#recipe), [`recipe.Effect`](#recipeeffect).

### `recipe.ChangeRefused`

```ts
class ChangeRefused extends RecipeError {
  readonly reason: RefusalReason;
  readonly place: Place;
  constructor(reason: RefusalReason, place: Place, message: string);
}
```

A change that cannot be made, [`RefusalReason`](#reciperefusalreason). The document is as it was, since nothing changes in place.

Uses [`RecipeError`](config.md#recipeerror), [`recipe.RefusalReason`](#reciperefusalreason), [`recipe.Place`](#recipeplace).

### `recipe.DeviceId`

```ts
type DeviceId = string;
```

A device's id in its document: given by [`addDevice`](#recipeadddevice) or [`open`](#recipeopen), kept through every rename and move.

### `recipe.Effect`

```ts
interface Effect {
  readonly place: Place;
  readonly effect: 'removed' | 'changed' | 'missing';
  readonly message: string;
}
```

One thing a change did beyond what was asked, in words a person reads and at a place an application can show.
`missing` is a place the change left as it was and that now names a command its device does not have, as a
definition fetched again can leave a key, [`refreshDevice`](#reciperefreshdevice): the choice stays the person's, and [`check`](#recipecheck) lists it until
they choose again.

Uses [`recipe.Place`](#recipeplace).

### `recipe.KeyPlace`

```ts
interface KeyPlace {
  readonly owner: Owner;
  readonly key: string;
  readonly press?: RecipePress;
}
```

One key of an owner. [`key`](#recipekey) is Logitech's word for the key, `VolumeMute`, `Info`, `Number0`: the name the model's
drawing carries as `data-name`, so an application reads it off the key a person clicked, and the same key on every
model that has it. Which words a document's model takes is [`keyNames`](#recipekeynames)'s answer; the number a family's firmware
knows the key by is the family's and never the document's, [`RecipeKey`](config.md#recipekey). `press` tells a key's second command, sent
when it is held, from its first, and in the document's version 2 its double press; absent is the short press,
[`RecipePress`](config.md#recipepress).

Uses [`recipe.Owner`](#recipeowner), [`RecipePress`](config.md#recipepress).

### `recipe.Owner`

```ts
type Owner = { readonly activity: ActivityId } | { readonly device: DeviceId };
```

What has keys and a screen of its own: an activity, or a device in device mode. The two are separate maps of the
same keypad, authored separately, [`reference/how-a-harmony-works.md`](../../how-a-harmony-works.md), so a key or a screen is always some owner's.

Uses [`recipe.ActivityId`](#recipeactivityid), [`recipe.DeviceId`](#recipedeviceid).

### `recipe.Place`

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

Where in a document something is: what a problem concerns, what a change touched, what uses a device. An
application turns one into the screen and the field to show.

Uses [`recipe.DeviceId`](#recipedeviceid), [`recipe.ActivityId`](#recipeactivityid), [`ActivityRoleName`](config.md#activityrolename), [`recipe.Owner`](#recipeowner), [`RecipePress`](config.md#recipepress), [`recipe.SequenceId`](#recipesequenceid).

### `recipe.Problem`

```ts
interface Problem {
  readonly severity: 'error' | 'note';
  readonly code: ProblemCode;
  readonly place: Place;
  readonly message: string;
}
```

One problem of a document. An `error` is something a build or a sync refuses on; a `note` is worth showing
and stops nothing. `place` is what it concerns, `message` an English sentence naming it.

Uses [`recipe.ProblemCode`](#recipeproblemcode), [`recipe.Place`](#recipeplace).

### `recipe.PROBLEM_CODES`

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

The codes a problem carries, which is what an application acts on; the sentence beside it is for a person. The
list grows with the libraries, and a new code arrives with a new version, never silently.

### `recipe.ProblemCode`

```ts
type ProblemCode = typeof PROBLEM_CODES[number];
```

What kind of problem a check found, one of [`PROBLEM_CODES`](#recipeproblem_codes).

Uses [`recipe.PROBLEM_CODES`](#recipeproblem_codes).

### `recipe.RefusalReason`

```ts
type RefusalReason = 'unknown' | 'over-limit' | 'invalid' | 'not-on-this-model';
```

Why a change is refused: `unknown`, it names something the document does not hold; `over-limit`, it would put more
on the model than the model takes; `invalid`, what it was given makes no sense, or would leave the document naming
what is gone; `not-on-this-model`, the model does not have the thing at all, as its family's places or its
capabilities say: a held press on a Harmony One, a gesture in a device's own map, a screen on a remote without one.

**Not on this model is not "not built"**: a function nobody has written refuses as [`NotBuiltError`](config.md#notbuilterror), naming the
requirement it waits on, and an application may offer it later; what a model lacks it never offers on that model.

### `recipe.SequenceId`

```ts
type SequenceId = string;
```

A sequence's id in its document.

## Changes

### `recipe.addActivity`

```ts
function addActivity(document: Recipe, activity: NewActivity): Change
```

Add an activity, last in the activity menu, under an id no activity has carried: its devices by id, each with
its roles and the input it is switched to, or none. Refused over the model's activity count, under a name another
activity has, with a device the document does not hold or names twice, and with a role no activity has. An input is
not judged here: whether a device has it is the check's to say, so an activity can be put together before every
choice is made.

Uses [`Recipe`](config.md#recipe), [`recipe.NewActivity`](#recipenewactivity), [`recipe.Change`](#recipechange).

### `recipe.addDevice`

```ts
function addDevice(document: Recipe, device: NewDevice): Change
```

Add a device with its definition, last in the device list, under an id no device of the document has carried.
The definition is carried in the document, with the protocol definitions its commands are written in, so the setup
builds and stays editable when no source of devices answers any more. Refused over the model's device count, and
under a name another device has: the remote lists devices by name, and so does the recipe underneath.

Uses [`Recipe`](config.md#recipe), [`recipe.NewDevice`](#recipenewdevice), [`recipe.Change`](#recipechange).

### `recipe.addSequence`

```ts
function addSequence(document: Recipe, activity: ActivityId, sequence: NewSequence): Change
```

Add a sequence to an activity, last among its sequences, under an id no sequence has carried: its name, once
within the activity, and its steps, each a command of one of the activity's devices or a pause in tenths of a
second, at least one sending a command. It sends nothing until a key, a screen entry or an extra step of the same
activity runs it, by its id.

Uses [`Recipe`](config.md#recipe), [`recipe.ActivityId`](#recipeactivityid), [`recipe.NewSequence`](#recipenewsequence), [`recipe.Change`](#recipechange).

### `recipe.clearAttention`

```ts
function clearAttention(document: Recipe, activity: ActivityId): Change
```

**Clear an activity's mark of needing attention**: every reason at once, the one call an
application makes once a person has seen why. When it does so is the application's business; nothing here clears a
mark of its own accord, since only a person can say the activity is now as they want it. An activity with no mark is
left as it is.

Uses [`Recipe`](config.md#recipe), [`recipe.ActivityId`](#recipeactivityid), [`recipe.Change`](#recipechange).

### `recipe.markAttention`

```ts
function markAttention(document: Recipe, activity: ActivityId, message: string): Change
```

**Mark an activity as needing attention by hand**: an application may have reasons of its own, a
person's note, a device it knows to be faulty. The reason is added to whatever the activity's mark already holds, as
`marked` with the sentence given, without the space around it, and no device or key, and the activity is still built
and synced as it is. Refused as `invalid` for a sentence with nothing in it.

Uses [`Recipe`](config.md#recipe), [`recipe.ActivityId`](#recipeactivityid), [`recipe.Change`](#recipechange).

### `recipe.move`

```ts
function move(document: Recipe, what: Movable, to: number): Change
```

Put a device, an activity or an activity's device at another position, counted from 0.

Uses [`Recipe`](config.md#recipe), [`recipe.Movable`](#recipemovable), [`recipe.Change`](#recipechange).

### `recipe.refreshDevice`

```ts
function refreshDevice(document: Recipe, device: DeviceId, carried: CarriedDevice): Change
```

**Fetch a device's definition again**: replaces the definition the document carries for the device, and
nothing else. Its name, its keys and screen, its timing, power and channel tuning, its own commands, and every
choice that names it stay as they are, also a stated value equal to what the new definition states: a person's
choice is theirs, and stays theirs when the catalogue later changes its mind. The protocol definitions follow the
new commands, the old ones going where no device is written in them any more.

**Every choice that names a command the new definition lacks** is reported as an effect, `missing`, at its place: a
key, a screen entry, a step of a sequence or at a start or end, a step of the device's power or tuning, and a tuning
of a command it no longer has. Each stays in the document, and [`check`](#recipecheck) lists it until a person chooses again.
Nothing refreshes on its own. Refused for a definition of another catalogue entry, which is another device and is
added as one.

Uses [`Recipe`](config.md#recipe), [`recipe.DeviceId`](#recipedeviceid), [`CarriedDevice`](config.md#carrieddevice), [`recipe.Change`](#recipechange).

### `recipe.remove`

```ts
function remove(document: Recipe, what: Removable, sources?: QuestionSources): Change
```

Remove a device, an activity, or a sequence, and settle everything that used it, each as an effect,
the places [`uses`](#recipeuses) lists. Every removal keeps the highest id given, so the id is not given again.

* **A device** leaves the activities that used it, which stay, with their other devices or with none, and their
  power orders; each role it had in an activity that no other device of the activity has is an effect at that role,
  naming the activity and the role, since what followed the role (an activity's volume keys following its volume
  device, on a family whose keys do) has no device left to follow; a key's choice that sent one of its commands goes
  back to the key's default; an entry of any screen that showed one goes; a step at a start or an end that sent to it
  goes; a sequence loses the steps that sent to it, and goes with its last step that sends a command, as then does
  every key, entry and step that ran it; and its favourite channels go with it. The protocol definitions its commands
  were written in go too, unless a device that stays is written in them; one the document held for no device of its
  own is left alone. **Last, every activity that used it is marked as needing attention**, with
  every press of its keys whose answer the removal changed and what each did and does, read off the maps before and
  after with `sources` as the questions read them: none where no key changed, and no list where the keys cannot be
  known, a model whose maps are not built yet or a device whose commands cannot be read. The activity is kept, built
  and synced: it is never invalid. **An activity the removal leaves with no device** is kept as well, and a build
  and a sync leave it out from then on, an effect at the activity after its mark.
* **An activity** goes with its sequences; nothing else names an activity, and its one effect beyond itself is the
  hold on the favourite channels, where it held them: they are then held by no activity, reported at the document.
* **A sequence** goes from its activity, and every key that ran it goes back to its default, every screen entry and
  extra step that ran it goes.

Uses [`Recipe`](config.md#recipe), [`recipe.Removable`](#reciperemovable), [`recipe.QuestionSources`](#recipequestionsources), [`recipe.Change`](#recipechange).

### `recipe.setActivity`

```ts
function setActivity(document: Recipe, activity: ActivityId, changes: ActivityChanges, sources?: QuestionSources): Change
```

Change an activity, member by member: its name, its kind, its devices with their roles and inputs, whole and in
the order given; the screen it opens on; whether it holds the favourite channels, true
taking the hold off the activity that had it, which is reported; the order it switches its devices on and off in; and its extra steps at its start and its end, each list whole, a sequence of its own by id. `'default'`, or
an empty list of steps, gives a member back.

**Its devices changed, what names them follows**: a power order loses a device no longer used and puts one newly
used last; a step of its sequences, or at its start or end, that sends to a device no longer used refuses the change,
naming the step, since that step is a person's and only they know what replaces it; and each role a device had that
no device of the activity has afterwards is an effect at that role, naming the activity and the role, as a removal of
the device reports it; and every press of the activity whose answer the change made otherwise is an effect at that
key, saying what it did and does, read off the maps with `sources` as a removal's mark reads them. **No mark is
set**: the person making the change is looking at the activity.
**Whether it is switched on**: false keeps it out of every build and sync, true switches it on again, the same
activity under the same id, refused as over the limit where the model takes no more activities that take part.
**Its devices all dropped**, it is kept and takes no part: a build and a sync leave it out, which is an
effect at the activity; given a device again, it takes part again, refused as over the limit as switching on is.
Taking out of the build the activity that holds the favourite channels, either way, is an effect at it, naming the
activity that holds them while it is out, by the family's rule, or saying none does. Its icon and its activity key have no field in the document yet and refuse by name.
**This writes the document**: whether the model's build reads a stated member is what [`check`](#recipecheck) lists.

Uses [`Recipe`](config.md#recipe), [`recipe.ActivityId`](#recipeactivityid), [`recipe.ActivityChanges`](#recipeactivitychanges), [`recipe.QuestionSources`](#recipequestionsources), [`recipe.Change`](#recipechange).

### `recipe.setDevice`

```ts
function setDevice(document: Recipe, device: DeviceId, changes: DeviceChanges): Change
```

Change a device, member by member: its name, which follows the device everywhere the document names it, since
underneath the recipe names a device by its name, and that is the toolkit keeping the whole consistent and not an
effect to report; whether it stays on between activities and its device key; and its power, timing, and channel tuning, each a person's member standing over the catalogue's, [`DeviceChanges`](#recipedevicechanges). **This writes
the document**: whether the model's build reads a stated timing, power or tuning is what [`check`](#recipecheck) lists, so a person's
choice is kept while the build for their model catches up. Its inputs have no field in the document yet and refuse by
name.

Uses [`Recipe`](config.md#recipe), [`recipe.DeviceId`](#recipedeviceid), [`recipe.DeviceChanges`](#recipedevicechanges), [`recipe.Change`](#recipechange).

### `recipe.setDeviceCommand`

```ts
function setDeviceCommand(document: Recipe, device: DeviceId, command: string, change: CommandChange | 'original' | 'removed'): Change
```

Change one command of a device, in the document's own commands of it, [`RecipeDevice.commands`](config.md#recipedevice): a code
of its own, replacing the definition's or adding a command the definition lacks; how that one command is sent, member
by member; `'original'` to drop both and send the definition's code as the definition sends it; and `'removed'` to
take away a command the document added. **This writes the document**: whether the model's build reads a stated code
or tuning is what [`check`](#recipecheck) lists.

Refused: a tuning of a command the device does not have, where its definition says which it has; `'original'` of a
command the document added, which has no original; and `'removed'` of a command still used, naming where, since the
key or the step that sends it is a person's choice that only they can replace. Taking away a command of the
definition itself has no field in the document and refuses by name.

Uses [`Recipe`](config.md#recipe), [`recipe.DeviceId`](#recipedeviceid), [`recipe.CommandChange`](#recipecommandchange), [`recipe.Change`](#recipechange).

### `recipe.setFavourites`

```ts
function setFavourites(document: Recipe, device: DeviceId, favourites: readonly Favourite[]): Change
```

A device's favourite channels, whole and in order; an empty list is none. Refused over the model's count.

Uses [`Recipe`](config.md#recipe), [`recipe.DeviceId`](#recipedeviceid), [`recipe.Favourite`](#recipefavourite), [`recipe.Change`](#recipechange).

### `recipe.setKey`

```ts
function setKey(document: Recipe, key: KeyPlace, action: KeyAction | 'default'): Change
```

Say what a key does, in an activity, or for a device in device mode, for each press the key has on the
model: `short`, absent, the first command; `held`, the long press; `double`, a gesture pressed twice. What it
does: a command of any device of the document, a sequence of the activity's own by its id, or nothing; `'default'`
gives that press back to what the family derives. Judged by the model's places, the ones [`keyNames`](#recipekeynames) lists and the
build binds by:

* **not on this model**, [`ChangeRefused`](#recipechangerefused) `not-on-this-model`: a press the key does not have, a held press on a Harmony
  One; a key only the other kind of owner binds, a gesture in a device's own map; and a choice the model's family
  refuses, [`FamilyMaps.refusedChoice`](config-types.md#familymaps), such as a command a Harmony Touch's number pad draws on no key;
* **unknown**: a word that is no key of the model, a key the remote binds outside every map, with the reason, and a
  device, a command or a sequence the document does not hold, or a sequence of another activity;
* **invalid**: a sequence on a device's own map, since a device has no sequences;
* **not built**, by name: every choice on a model whose family has no maps yet.

Giving a press back is judged by none of these, so a document that holds a choice can always be put right. **This
writes the document**: whether the model's build takes a held press or a sequence on a key is what [`check`](#recipecheck) lists.

Uses [`Recipe`](config.md#recipe), [`recipe.KeyPlace`](#recipekeyplace), [`recipe.KeyAction`](#recipekeyaction), [`recipe.Change`](#recipechange).

### `recipe.setLook`

```ts
function setLook(document: Recipe, choices: Readonly<Record<string, unknown>> | 'default'): Change
```

The look of the screens: the choices of the model's family over its defaults, only the ones given changed;
`'default'` drops every choice.

Uses [`Recipe`](config.md#recipe), [`recipe.Change`](#recipechange).

### `recipe.setScreen`

```ts
function setScreen(document: Recipe, owner: Owner, items: readonly ScreenItem[] | 'default'): Change
```

Say what an owner's screen shows, the list whole and in order; `'default'` gives it back to what the
family derives. An entry is a device's command, any device of the document as device mode sends to any, with a
label of its own or the command's; or, on an activity's screen, one of its own sequences by its id. An empty list is
a screen a person emptied, which is not the default.

Refused: a screen on a model that has none, `not-on-this-model`; a sequence on a device's screen, since a device has
none; a device, a command or a sequence the document does not hold. A page of entries, and a label of a
sequence's own have no field in the document yet and refuse by name. **This writes the document**: whether the
model's build reads a stated screen is what [`check`](#recipecheck) lists.

Uses [`Recipe`](config.md#recipe), [`recipe.Owner`](#recipeowner), [`recipe.ScreenItem`](#recipescreenitem), [`recipe.Change`](#recipechange).

### `recipe.setSequence`

```ts
function setSequence(document: Recipe, sequence: SequenceId, changes: Partial<NewSequence>): Change
```

Change a sequence's name or its steps. A new name follows it everywhere its activity runs it, a key, a screen
entry and an extra step; the steps are given whole, as [`addSequence`](#recipeaddsequence) takes them.

Uses [`Recipe`](config.md#recipe), [`recipe.SequenceId`](#recipesequenceid), [`recipe.NewSequence`](#recipenewsequence), [`recipe.Change`](#recipechange).

### `recipe.setSetting`

```ts
function setSetting(document: Recipe, setting: string, value: number | boolean | string | 'default'): Change
```

One of the remote's own settings by its name, [`Recipe.settings`](config.md#recipe): a text, a number or true or false; `'default'`
drops the choice and leaves the family's default, which [`settings`](#recipesettings) answers. **Judged by the model's family where it
states its settings**, [`FamilySettings`](config-types.md#familysettings), by the one judgement [`check`](#recipecheck) takes too, `settingVerdict`:

* **invalid**: a value the build refuses for the row, outside its range or of another kind, in the build's words;
* **not built**, [`NotBuiltError`](config.md#notbuilterror) with the requirement: a setting the remote has that the build does not write yet,
  such as a Harmony Touch's vibration;
* **not on this model**: any other name, a setting the model does not have.

**Where the family states none**, every compiled family, whose build reads no setting from a document, the name and
the value are written as given and not judged: a change writes the document whether or not the model's build reads
the field, and [`check`](#recipecheck) lists the field as one the build does not read. Giving a setting back is judged by none of
these, so a document that holds a setting can always be put right. Not built, as every call that needs its family,
for a model no family serves yet.

Uses [`Recipe`](config.md#recipe), [`recipe.Change`](#recipechange).

## Questions

### `recipe.activities`

```ts
function activities(document: Recipe): ActivitySummary[]
```

The activities, in the order of the activity menu, each with whether it is switched on, why a build and a sync
leave it out where they do, switched off or using no device, and why it needs attention, where it
does: an activity left out is listed, since it is still the document's.

Uses [`Recipe`](config.md#recipe), [`recipe.ActivitySummary`](#recipeactivitysummary).

### `recipe.commands`

```ts
function commands(document: Recipe, device: DeviceId): CommandSummary[]
```

A device's commands, by name, in its definition's own order, then any the document's own commands of the device
name that the definition does not, in the order they are stated. A command is changed where the document states a
code for it, of either kind, and learned where that code is learned pulses, [`RecipeDevice.commands`](config.md#recipedevice); how it is
sent is no change of its code. Refused, as a [`RecipeError`](config.md#recipeerror), for a device that carries no definition: its commands
are in a catalogue and not in the document, and an empty list would say it has none.

Uses [`Recipe`](config.md#recipe), [`recipe.DeviceId`](#recipedeviceid), [`recipe.CommandSummary`](#recipecommandsummary).

### `recipe.devices`

```ts
function devices(document: Recipe): DeviceSummary[]
```

The devices, in the order the remote lists them.

Uses [`Recipe`](config.md#recipe), [`recipe.DeviceSummary`](#recipedevicesummary).

### `recipe.favourites`

```ts
function favourites(document: Recipe, device: DeviceId): Favourite[]
```

A device's favourite channels, in order.

Uses [`Recipe`](config.md#recipe), [`recipe.DeviceId`](#recipedeviceid), [`recipe.Favourite`](#recipefavourite).

### `recipe.inputs`

```ts
function inputs(document: Recipe, device: DeviceId): string[]
```

The inputs a device can be switched to, by the names an activity chooses one by; none for a device that states
no list of them, which is one that can only step through its inputs. Refused as [`commands`](#recipecommands) is for a device that
carries no definition.

Uses [`Recipe`](config.md#recipe), [`recipe.DeviceId`](#recipedeviceid).

### `recipe.key`

```ts
function key(document: Recipe, place: KeyPlace, sources?: QuestionSources): KeyAnswer
```

**What one key of an owner does**, before anything is built: every press the model has for it, each with what
it does and whether that is the default, how a command is sent or a sequence's steps; or, with `press` given, that
press alone. Read off the same maps the build binds by, `resolvedOf`. Where the owner's map does not bind the key, it
answers no press and why; a key the model has no place of is refused, as [`ChangeRefused`](#recipechangerefused) naming the key.

**Not built**, [`NotBuiltError`](config.md#notbuilterror), for a model whose family has no maps yet; refused as [`commands`](#recipecommands) refuses where a
device carries no definition and no archive is given.

Uses [`Recipe`](config.md#recipe), [`recipe.KeyPlace`](#recipekeyplace), [`recipe.QuestionSources`](#recipequestionsources), [`recipe.KeyAnswer`](#recipekeyanswer).

### `recipe.keyNames`

```ts
function keyNames(document: Recipe): KeyPlaceSummary[]
```

**Every key of a document's model as data**: each place its family's maps name, keypad keys, number pad places,
gestures and touch keys, in the family's order, with where it is, the presses it has on this model, whose map binds
it, and whether a person's choice on it is built and why not, [`KeyPlaceSummary`](#recipekeyplacesummary). The places [`check`](#recipecheck) holds a
document's choices to and [`keys`](#recipekeys) answers by, [`FamilyMaps.places`](config-types.md#familymaps), so an application drawing the remote shows what the
build binds. Not built, [`NotBuiltError`](config.md#notbuilterror), for a model whose family has no maps yet, rather than answering an empty
list that would say the model has no keys, and for a model no family serves, `servedBy`.

A word here is the name the model's drawing carries for the key, `data-name`, so an application colours and finds
the key on the drawing by it. [`setKey`](#recipesetkey) takes a choice on exactly the places listed here as built, for the presses
listed and the kind of owner whose map binds it.

Uses [`Recipe`](config.md#recipe), [`recipe.KeyPlaceSummary`](#recipekeyplacesummary).

### `recipe.keys`

```ts
function keys(document: Recipe, owner: Owner, sources?: QuestionSources): KeyAnswer[]
```

**What every key of an owner does**, the default ones included: every place the owner's map can bind, bound or
not, in the model's order, each with every press the model has for it; the whole map as the remote will have it,
which is what an application shows on its drawing of the keypad. A place the owner's map cannot bind is not listed,
[`keyNames`](#recipekeynames) lists it with why; asked for alone, [`key`](#recipekey) answers it with why. Not built and refused as [`key`](#recipekey) is.

**A device's own map and an activity's are separate**, [`reference/how-a-harmony-works.md`](../../how-a-harmony-works.md): a choice in a device's map,
device mode's, changes that device's answer and no activity's, and the other way round.

**A choice naming a device the document does not hold stops this owner's answer**, as a [`RecipeError`](config.md#recipeerror) naming the key
and the device, since a press of a device that is not there has no id and no settings to answer; [`check`](#recipecheck) lists the
same choice as `unknown-device`. Only that owner stops: [`key`](#recipekey) still answers the owner's other keys one at a time, and
its screen and every other owner answer. A screen entry naming such a device never reaches a question, since the
reader refuses the document.

Uses [`Recipe`](config.md#recipe), [`recipe.Owner`](#recipeowner), [`recipe.QuestionSources`](#recipequestionsources), [`recipe.KeyAnswer`](#recipekeyanswer).

### `recipe.screen`

```ts
function screen(document: Recipe, owner: Owner, sources?: QuestionSources): ScreenAnswer
```

**What an owner's screen shows**: its entries in order, the family's default list or the one the document
states whole, each entry marked accordingly. Not built and refused as [`key`](#recipekey) is.

Uses [`Recipe`](config.md#recipe), [`recipe.Owner`](#recipeowner), [`recipe.QuestionSources`](#recipequestionsources), [`recipe.ScreenAnswer`](#recipescreenanswer).

### `recipe.sequences`

```ts
function sequences(document: Recipe): SequenceSummary[]
```

The sequences, each with the activity it belongs to, in the document's order: the activities' in the menu's
order and each activity's in its own. A step names its device by id. A sequence written out on a screen, the form of
version 1, has no id to address it by and is not listed; [`key`](#recipekey) and [`screen`](#recipescreen) still answer it where it runs.

Uses [`Recipe`](config.md#recipe), [`recipe.SequenceSummary`](#recipesequencesummary).

### `recipe.settings`

```ts
function settings(document: Recipe): RemoteSettingAnswer[]
```

**The remote's own settings as the remote will have them**, before anything is built: every setting the model's
build writes from a document, in the order it writes them, each with its value, whether that is the default, the
default, and the kind of value it takes, [`RemoteSettingAnswer`](#reciperemotesettinganswer). Read off the model's family, [`FamilySettings`](config-types.md#familysettings), the
table its build writes by, so what an application is shown is what is built.

**Only the settings the build writes are listed.** A setting the document states that the model does not have, or
that the build does not write yet, is not answered here; [`check`](#recipecheck) lists it, as [`setSetting`](#recipesetsetting) refuses it.

**Not built**, for a model whose build reads no setting from a document, which is every compiled family's: the
Harmony One's and the Harmony 600, 650 and 700's settings are build choices of their own, and whether the Harmony 300
and 350 have any is not checked, so an empty list would say what is not known. The Harmony Touch answers its seven.
Every answer is the caller's own, so changing one changes no other and not the document.

Uses [`Recipe`](config.md#recipe), [`recipe.RemoteSettingAnswer`](#reciperemotesettinganswer).

### `recipe.unfilled`

```ts
function unfilled(document: Recipe): Place[]
```

What is not yet filled in: the places of the problems [`check`](#recipecheck) codes `unfinished`.

Uses [`Recipe`](config.md#recipe), [`recipe.Place`](#recipeplace).

### `recipe.uses`

```ts
function uses(document: Recipe, what: Removable, sources?: QuestionSources): Place[]
```

**Everything that names a device or a sequence**: what removing it would touch, the same places, in the same order,
that [`remove`](#reciperemove) reports as effects, since both take one walk. For a device, every key's choice, screen entry, part in
an activity, role of an activity that no other device of it has, place in a power order, step of a sequence of either
form, extra step at a start or an end and its favourites; and where a sequence goes with the device, everything that
runs that sequence. A role is not a mention of the device's name, but a removal leaves it with no device, so it is
listed where the removal reports it; and last, the attention mark of every activity that used the device,
its keys read off the resolved maps with `sources` as the questions read them, then every activity the removal
leaves with no device, which a build and a sync leave out from then on. For a
sequence, every key, screen entry and extra step of its activity that runs it.
For an activity, the document where it holds the favourite channels, which its removal leaves held by none, and
nothing otherwise, since nothing names an activity.

Uses [`Recipe`](config.md#recipe), [`recipe.Removable`](#reciperemovable), [`recipe.QuestionSources`](#recipequestionsources), [`recipe.Place`](#recipeplace).

## The check

### `recipe.check`

```ts
function check(document: Recipe, sources?: QuestionSources): Problem[]
```

Every problem of a document as a list, without building it. Empty is a document a build takes; a build and a
sync refuse while the list holds an error, and say the same problems. Each problem is a sentence a person reads,
with the place it concerns.

**Held to the model's places**, the ones [`keyNames`](#recipekeynames) lists and the build binds by: a key's choice on a
word that is no key of the model, on a key the owner's map does not bind, with a press the key does not have, or on
a key the model's build takes no choice on; a held press, a double press or a sequence on a key where the model's
build takes none, `keyFormsBuilt`; and a choice the model's family refuses, [`FamilyMaps.refusedChoice`](config-types.md#familymaps).

**Held to each device's commands**, where the document says which it has: its carried definition, or `sources`'
archive for a device carrying none, and the commands the document adds. A key's choice, a screen entry of any owner,
a step of a sequence or at a start or an end, a step of a device's power or channel tuning, and a tuning of one
command, each naming a command its device does not have, is a problem at its place. Where nothing says which
commands a device has, nothing is said of them: the device's own note says it carries no definition.

**Held to the model's capabilities** as the changes are: a key word another model has and this one lacks, an opening
screen the model does not have, and a device key on a model without device keys, each not on this model. A field of
version 2 the model's build does not read is listed naming the model, since the build of another reads it. Not built,
as every call is, for a model no family serves yet.

Uses [`Recipe`](config.md#recipe), [`recipe.QuestionSources`](#recipequestionsources), [`recipe.Problem`](#recipeproblem).

## What a person chooses

### `recipe.ActivityChanges`

```ts
interface ActivityChanges {
  /** Its name. */
  readonly name?: string;
  readonly type?: string;
  /** The devices and their roles, in the order the activity lists them. */
  readonly devices?: readonly ActivityDeviceChoice[];
  /** Its icon, by the name of one of the SDK's icons. */
  readonly icon?: string | 'none';
  /** Extra steps at its start and its end, each list whole; `'default'` is none. */
  readonly start?: readonly ActivityStep[] | 'default';
  readonly end?: readonly ActivityStep[] | 'default';
  /** Which activity key starts it, counted from 0, on a model with activity keys. */
  readonly activityKey?: number | 'none';
  /** The screen it opens on, by the word the model's family names it by; `'default'` is the family's. */
  readonly opensOn?: string | 'default';
  /**
   * Whether it holds the favourite channels: true takes the hold off whichever activity had it, since one
   * activity holds them; false says this one does not; `'default'` leaves it to the family.
   */
  readonly favourites?: boolean | 'default';
  /** The order it switches its devices on and off in, every device of the activity once; `'default'` is the family's. */
  readonly powerOrder?: readonly DeviceId[] | 'default';
  /**
   * Whether it is switched on: false keeps it in the document and out of every build and sync, which
   * say they left it out; true switches it on again, the same activity under the same id.
   */
  readonly enabled?: boolean;
}
```

What a person changes about an activity; a member left out is left as it is.

Uses [`recipe.ActivityDeviceChoice`](#recipeactivitydevicechoice), [`recipe.ActivityStep`](#recipeactivitystep), [`recipe.DeviceId`](#recipedeviceid).

### `recipe.ActivityDeviceChoice`

```ts
interface ActivityDeviceChoice {
  readonly device: DeviceId;
  readonly input?: string;
  readonly roles: readonly ActivityRoleName[];
}
```

One device's part in an activity: the input it is switched to, or none to leave it alone, and its roles.

Uses [`recipe.DeviceId`](#recipedeviceid), [`ActivityRoleName`](config.md#activityrolename).

### `recipe.ActivityStep`

```ts
type ActivityStep =
  | { readonly device: DeviceId; readonly command: string }
  | { readonly pause: number }
  | { readonly sequence: SequenceId }
  | { readonly device: DeviceId; readonly channel: string };
```

One step of an activity's start or end beyond what its devices need anyway: a command of one of the activity's
devices, a pause in tenths of a second, one of the activity's own sequences, or a channel tuned through one of its
devices, its digits as text so a leading zero survives, [`RecipeChannelStep`](config.md#recipechannelstep).

Uses [`recipe.DeviceId`](#recipedeviceid), [`recipe.SequenceId`](#recipesequenceid).

### `recipe.CommandChange`

```ts
interface CommandChange {
  readonly code?: CommandCode | 'original';
  readonly sending?: MemberChanges<RecipeSending> | 'default';
}
```

A person's change to one command of a device: a code of its own, `'original'` to drop it and send the
definition's code again, and how that one command is sent, member by member as a device's timing is, the copies of
the code in a press, the pace of the held block and the silence before the first block, [`RecipeSending`](config.md#recipesending).

Uses [`recipe.CommandCode`](#recipecommandcode), [`recipe.MemberChanges`](#recipememberchanges), [`RecipeSending`](config.md#recipesending).

### `recipe.CommandCode`

```ts
type CommandCode = RecipeCommandCode;
```

A code for a device's command: the catalogue's own notation, or pulses learned from the device's
original remote, which the definition then marks as learned. The document holds it as [`RecipeCommandCode`](config.md#recipecommandcode), in
[`RecipeDevice.commands`](config.md#recipedevice), so this is that type.

Uses [`RecipeCommandCode`](config.md#recipecommandcode).

### `recipe.DeviceChanges`

```ts
interface DeviceChanges {
  /** Its name. Every reference to the device follows, since references are by id. */
  readonly name?: string;
  /** Kept on when an activity that does not use it starts. */
  readonly keptOnBetweenActivities?: boolean;
  /** How it is powered, the catalogue's members and `alwaysOn`, a device never switched off. */
  readonly power?: MemberChanges<RecipeDevicePower> | 'default';
  readonly inputs?: DeviceInputs | 'default';
  /** The delays and the repeat counts, in the catalogue's own member names, `DeviceTiming`. */
  readonly timing?: MemberChanges<DeviceTiming> | 'default';
  /** How a channel number is entered, its steps naming the device's commands by name. */
  readonly channelTuning?: MemberChanges<DeviceChannelTuning> | 'default';
  /** The device key it goes on, on a model with a key per device. */
  readonly deviceKey?: RecipeDeviceKey | 'none';
}
```

What a person changes about a device; a member left out is left as it is. Each of power, inputs, timing and
channel tuning has the shape the catalogue states the same thing in, since a person's choice stands over the
catalogue's statement, **member by member**: a member given is the person's, `'default'` on a member gives that one
back, and `'default'` for the whole gives every one back. The document keeps only what a person chose,
so a definition fetched again replaces none of it, [`refreshDevice`](#reciperefreshdevice).

Uses [`recipe.MemberChanges`](#recipememberchanges), [`RecipeDevicePower`](config.md#recipedevicepower), [`DeviceInputs`](config.md#deviceinputs), [`DeviceTiming`](config.md#devicetiming), [`DeviceChannelTuning`](config.md#devicechanneltuning), [`RecipeDeviceKey`](config.md#recipedevicekey).

### `recipe.Favourite`

```ts
interface Favourite {
  readonly channel: string;
  readonly name?: string;
  /** By the name of an icon the document carries. */
  readonly icon?: string;
}
```

A favourite channel: the number as text, since a leading zero is a channel of its own.

### `recipe.KeyAction`

```ts
type KeyAction =
  | { readonly device: DeviceId; readonly command: string }
  | { readonly sequence: SequenceId }
  | { readonly nothing: true };
```

What a key does: a command of any device, a sequence, or nothing at all.

Uses [`recipe.DeviceId`](#recipedeviceid), [`recipe.SequenceId`](#recipesequenceid).

### `recipe.MemberChanges`

```ts
type MemberChanges<T> = { readonly [K in keyof T]?: T[K] | 'default' };
```

A person's change to a record stated member by member: each member given a value of its own, or `'default'` to drop
the person's value for that member and keep the catalogue's; a member left out is left as it is.

### `recipe.Movable`

```ts
type Movable =
  | { readonly device: DeviceId }
  | { readonly activity: ActivityId }
  | { readonly activity: ActivityId; readonly device: DeviceId };
```

What [`move`](#recipemove) puts at another position: a device in the device list, an activity in the activity menu, or a
device within one activity's list.

Uses [`recipe.DeviceId`](#recipedeviceid), [`recipe.ActivityId`](#recipeactivityid).

### `recipe.NewActivity`

```ts
interface NewActivity {
  readonly name: string;
  readonly type: string;
  readonly devices: readonly ActivityDeviceChoice[];
}
```

An activity as it is added: its name, Logitech's kind, and its devices with their roles.

Uses [`recipe.ActivityDeviceChoice`](#recipeactivitydevicechoice).

### `recipe.NewDevice`

```ts
interface NewDevice {
  readonly name: string;
  readonly device: CarriedDevice;
}
```

A device as it is added: what the remote calls it and the definition a search fetched for it, or one built
from learned commands.

Uses [`CarriedDevice`](config.md#carrieddevice).

### `recipe.NewSequence`

```ts
interface NewSequence {
  readonly name: string;
  readonly steps: readonly SequenceStep[];
}
```

A sequence as it is added: its name and its steps. **A sequence is its activity's**: it is added to one
activity, its steps send to that activity's devices, and a key, a screen entry or an extra step of the same activity
runs it, by its id.

Uses [`recipe.SequenceStep`](#recipesequencestep).

### `recipe.Removable`

```ts
type Removable = { readonly device: DeviceId } | { readonly activity: ActivityId } | { readonly sequence: SequenceId };
```

What [`remove`](#reciperemove) takes away.

Uses [`recipe.DeviceId`](#recipedeviceid), [`recipe.ActivityId`](#recipeactivityid), [`recipe.SequenceId`](#recipesequenceid).

### `recipe.ScreenItem`

```ts
type ScreenItem =
  | { readonly label?: string; readonly device: DeviceId; readonly command: string }
  | { readonly label?: string; readonly sequence: SequenceId }
  | { readonly label: string; readonly page: readonly ScreenItem[] };
```

One item of an owner's screen, in the order a person put them; the toolkit pages them by the model's screen. A label left out is the command's or the sequence's own. An item with `page` opens a page of the items
given, with a way back.

Uses [`recipe.DeviceId`](#recipedeviceid), [`recipe.SequenceId`](#recipesequenceid).

### `recipe.SequenceStep`

```ts
type SequenceStep = { readonly device: DeviceId; readonly command: string } | { readonly pause: number };
```

One step of a sequence: a device's command by its name, or a pause in tenths of a second.

Uses [`recipe.DeviceId`](#recipedeviceid).

## What a question answers

### `recipe.ActivitySummary`

```ts
interface ActivitySummary {
  readonly id: ActivityId;
  readonly name: string;
  readonly type: string;
  readonly devices: readonly ActivityDeviceChoice[];
  /** False where a person switched it off: a build and a sync leave it out, and say so. */
  readonly enabled: boolean;
  /**
   * **Why a build and a sync leave it out**, absent where it takes part: `switched-off`, as `enabled` says,
   * or `no-device`, since it uses none. The same answer a build gives in `Built.leftOut`, asked without building, so an
   * application can show it beside the activity before a sync.
   */
  readonly leftOut?: LeftOutReason;
  /**
   * Why it needs attention, each reason as the document records it, `Attention`; empty where it needs none. An
   * activity needing attention is still built and synced: it is never invalid.
   */
  readonly attention: readonly Attention[];
}
```

An activity as a list shows it.

Uses [`recipe.ActivityId`](#recipeactivityid), [`recipe.ActivityDeviceChoice`](#recipeactivitydevicechoice), [`LeftOutReason`](config.md#leftoutreason), [`recipe.Attention`](#recipeattention).

### `recipe.Attention`

```ts
type Attention = RecipeAttention;
```

One reason an activity needs attention, as the document records it, [`RecipeAttention`](config-types.md#recipeattention): what
happened, `device-removed` or `marked`; the device by the name it had, since one removed has no id left; every press
of the activity whose answer the removal changed, with what it did and does, where the keys are known; and a sentence
in English. **Data an application words itself**: the sentence is there for one that does not.

Uses [`RecipeAttention`](config-types.md#recipeattention).

### `recipe.AttentionKey`

```ts
type AttentionKey = RecipeAttentionKey;
```

One press of an activity's key whose answer a change made otherwise, [`RecipeAttentionKey`](config-types.md#recipeattentionkey): the key, the press, what it
did, `was`, and what it does, `now`, each a device's command by the device's name, a sequence by its name, or nothing.
By name and not by id, as the record it is: the device it sent to may be gone.

Uses [`RecipeAttentionKey`](config-types.md#recipeattentionkey).

### `recipe.CommandSummary`

```ts
interface CommandSummary {
  readonly name: string;
  readonly changed: boolean;
  readonly learned: boolean;
}
```

One command of a device: its name, and whether a person changed its code or learned it.

### `recipe.CommandTuningAnswer`

```ts
interface CommandTuningAnswer {
  readonly copies?: SettingAnswer<number>;
  readonly heldPaceMs?: SettingAnswer<number>;
  readonly leadInMs?: SettingAnswer<number>;
}
```

How one command is sent where a person tuned it, `RecipeDevice.commands[name].sending`: the copies of the code in the
first block, the pace of the held block and the silence before the first block, each the person's. **Only what the
document states is answered**: what a command does untuned is in its code, which only a build turns into blocks, so
a member not stated is left out rather than given a value no build has made.

Uses [`recipe.SettingAnswer`](#recipesettinganswer).

### `recipe.DeviceSettingsAnswer`

```ts
interface DeviceSettingsAnswer {
  readonly pressMinRepeats: SettingAnswer<number>;
  readonly interKeyDelay: SettingAnswer<number>;
  readonly interDeviceDelay: SettingAnswer<number>;
  readonly powerOnDelay?: SettingAnswer<number>;
  readonly inputDelay: SettingAnswer<number>;
}
```

How a device's commands are sent, member by member in the catalogue's own terms, [`DeviceTiming`](config.md#devicetiming) in
[`catalogue/driving.ts`](../../../packages/config/src/catalogue/driving.ts): how many times one press sends the code, the pause after a command before the next one to
the same device and before one to another device, the wait after the device is switched on, and the wait after an
input is changed, each in milliseconds. A member a person states in [`RecipeDevice.timing`](config.md#recipedevice) is theirs and stands over
the catalogue's; every other is the catalogue's.

**Why these five and not every member of [`DeviceTiming`](config.md#devicetiming).** They are the members a device's settings carry on every
family whose build sends by them, the Harmony Touch's device record among them, `TIMING_READ_BY_DOCUMENTS` in [`recipe.ts`](../../../packages/config/src/recipe/recipe.ts). The other four
are left out rather than answered: which of the two repeat counts wins, `pressMinRepeats` or `minRepeats`, is not
read; and the delay while a key is held, the connected app's delay and the optimisation flag are sent by no build of
ours, so an answer would show a setting with no effect. **The wait after power on is absent** where neither the
catalogue nor the document states one, 8184 of the catalogue's records, since what a remote then waits is its
family's and not knowable from the two.

Uses [`recipe.SettingAnswer`](#recipesettinganswer).

### `recipe.DeviceSummary`

```ts
interface DeviceSummary {
  readonly id: DeviceId;
  readonly name: string;
  /** Its catalogue entry, `<manufacturer>/<file>`. */
  readonly entry: string;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly type?: string;
  /** Whether any of its commands was learned rather than taken from a catalogue. */
  readonly learned: boolean;
}
```

A device as a list shows it.

Uses [`recipe.DeviceId`](#recipedeviceid).

### `recipe.KeyAnswer`

```ts
interface KeyAnswer {
  readonly owner: Owner;
  readonly key: string;
  readonly surface: KeySurface;
  readonly presses: readonly PressAnswer[];
  readonly why?: string;
}
```

One key of an owner as the remote will have it, before anything is built: the owner, the key and where it is,
one entry per press the model has for that key, and, where a person cannot choose what it does, why.

**A key the owner's map does not bind has no presses**: the configuration binds it outside every map, or the model's
maps bind it for the other kind of owner only, so nothing here can say what it does, and `why` says which. A key the
owner's map binds and whose choice is not built has its presses as the build gives them, and `why` as well.

**Not answered: whether a key repeats while held.** Repeating is a property of the command's code, its held part, and
not of the key, [`reference/how-a-harmony-works.md`](../../how-a-harmony-works.md), and how a code's held part is sent is decided when a build
writes it; nothing in the document or the catalogue's statement of a device says it.

Uses [`recipe.Owner`](#recipeowner), [`recipe.KeySurface`](#recipekeysurface), [`recipe.PressAnswer`](#recipepressanswer).

### `recipe.KeyBinder`

```ts
type KeyBinder = MapBinder;
```

Whose map can bind a key, [`MapBinder`](config-types.md#mapbinder): a device's own, an activity's, both, or `remote`, neither, where the
configuration binds the key outside every map and a person's choice there is not built.

Uses [`MapBinder`](config-types.md#mapbinder).

### `recipe.KeyPlaceSummary`

```ts
interface KeyPlaceSummary {
  readonly key: string;
  readonly surface: KeySurface;
  readonly presses: readonly RecipePress[];
  readonly boundBy: KeyBinder;
  readonly built: boolean;
  readonly why?: string;
}
```

One key of a document's model as [`keyNames`](#recipekeynames) answers it: Logitech's word for it, where it is, the presses it has
on this model, the short press first, whose map binds it, whether a person's choice on it is built, and why not
where it is not. The places are the model's family's, [`FamilyMaps.places`](config-types.md#familymaps), the ones its build binds by.

Uses [`recipe.KeySurface`](#recipekeysurface), [`RecipePress`](config.md#recipepress), [`recipe.KeyBinder`](#recipekeybinder).

### `recipe.KeySurface`

```ts
type KeySurface = MapSurface;
```

Where a key is on the remote, the maps' word for it, [`MapSurface`](config-types.md#mapsurface): the keypad, the number pad a screen draws, a
gesture on a touch surface, or a touch key beside a screen.

Uses [`MapSurface`](config-types.md#mapsurface).

### `recipe.PressAnswer`

```ts
type PressAnswer =
  | PressCommon & { readonly action: { readonly device: DeviceId; readonly command: string }; readonly sending: SendingAnswer }
  | PressCommon & { readonly action: { readonly sequence: string }; readonly sequence: SequenceAnswer }
  | PressCommon & { readonly action: { readonly nothing: true } };
```

One press of a key and what it does: a device's command, with how it is sent; one of the activity's sequences,
by its name, with its steps; or nothing, where the place is unbound or a person chose nothing.

Uses [`PressCommon`](config-types.md#presscommon), [`recipe.DeviceId`](#recipedeviceid), [`recipe.SendingAnswer`](#recipesendinganswer), [`recipe.SequenceAnswer`](#recipesequenceanswer).

### `recipe.QuestionSources`

```ts
interface QuestionSources {
  readonly archive?: CatalogueSource;
}
```

What the questions about keys and screens are given beside the document: an archive serving the definitions of
the devices the document carries none of. A definition the document carries is served first, `carriedCatalogue`, so a
document that carries every device's definition needs nothing here.

Uses [`CatalogueSource`](config.md#cataloguesource).

### `recipe.RemoteSettingAnswer`

```ts
interface RemoteSettingAnswer {
  readonly name: string;
  readonly value: boolean | number | string;
  readonly isDefault: boolean;
  readonly default: boolean | number;
  readonly takes: SettingKind;
}
```

One of the remote's own settings as the remote will have it, before anything is built: its name as the family
gives it, its value, whether that is the default, what the default is, and the kind of value it takes, the choices of
a yes or no setting or the range of a number.

**The value is the document's where it states one**, as what the family takes it to mean, true or false or a number,
also where it is written as text; a value the family's build refuses is answered as the document states it, and
[`check`](#recipecheck) lists it. **A value equal to the default is still the person's**, `isDefault` false, since the document
states it and it stays when the family's default changes; [`setSetting`](#recipesetsetting) with `'default'` gives it back.

Uses [`recipe.SettingKind`](#recipesettingkind).

### `recipe.ScreenAnswer`

```ts
interface ScreenAnswer {
  readonly owner: Owner;
  readonly items: readonly ScreenEntryAnswer[];
  readonly isDefault: boolean;
}
```

An owner's screen: its entries in order, each marked default or the person's, and whether the list as a whole
is the default. A person states a screen whole, so every entry has the list's mark; the list's own mark is what tells
a screen a person emptied from one the family leaves empty.

Uses [`recipe.Owner`](#recipeowner), [`recipe.ScreenEntryAnswer`](#recipescreenentryanswer).

### `recipe.ScreenEntryAnswer`

```ts
type ScreenEntryAnswer =
  /** A device's command, labelled with its own name where no label is given. */
  | { readonly device: DeviceId; readonly command: string; readonly label?: string; readonly isDefault: boolean }
  /** One of the activity's sequences, by its name, with its id where it has one. */
  | { readonly sequence: string; readonly id?: SequenceId; readonly label?: string; readonly isDefault: boolean }
  /** An entry the remote acts on itself and that sends nothing, such as one opening the number pad, by the family's name for it. */
  | { readonly label: string; readonly client: string; readonly isDefault: boolean };
```

An entry of an owner's screen, in order, as the remote will have it.

Uses [`recipe.DeviceId`](#recipedeviceid), [`recipe.SequenceId`](#recipesequenceid).

### `recipe.SendingAnswer`

```ts
interface SendingAnswer {
  readonly settings: DeviceSettingsAnswer;
  readonly command?: CommandTuningAnswer;
}
```

How a press's command is sent: the target device's settings, and beside them the tuning of that one command
where the document states one. The settings are the device's and stored on it alone, so two keys that send one
device's commands answer the same settings, and a change to them changes both.

Uses [`recipe.DeviceSettingsAnswer`](#recipedevicesettingsanswer), [`recipe.CommandTuningAnswer`](#recipecommandtuninganswer).

### `recipe.SequenceAnswer`

```ts
interface SequenceAnswer {
  readonly id?: SequenceId;
  readonly name: string;
  readonly steps: readonly SequenceStepAnswer[];
}
```

A sequence a press runs: its name in its activity, the id the document gives it where it has one (a sequence written
out where it sits on a screen, the form of version 1, has none), and its steps in order.

Uses [`recipe.SequenceId`](#recipesequenceid), [`recipe.SequenceStepAnswer`](#recipesequencestepanswer).

### `recipe.SequenceStepAnswer`

```ts
type SequenceStepAnswer = SequenceStep | { readonly device: DeviceId; readonly scan: number };
```

One step of a sequence as a question answers it: a device's command, a pause in tenths of a second, or, in a
sequence written out in the form of version 1, the command a device's key sends, by the key's scan code as that form
states it, [`RecipeSequenceStep`](config.md#recipesequencestep), since that form names no command.

Uses [`recipe.SequenceStep`](#recipesequencestep), [`recipe.DeviceId`](#recipedeviceid).

### `recipe.SequenceSummary`

```ts
interface SequenceSummary {
  readonly id: SequenceId;
  readonly activity: ActivityId;
  readonly name: string;
  readonly steps: readonly SequenceStep[];
}
```

A sequence as a list shows it, with the activity it belongs to.

Uses [`recipe.SequenceId`](#recipesequenceid), [`recipe.ActivityId`](#recipeactivityid), [`recipe.SequenceStep`](#recipesequencestep).

### `recipe.SettingAnswer`

```ts
interface SettingAnswer<T> {
  readonly value: T;
  readonly isDefault: boolean;
}
```

One setting a command is sent with: its value, and whether that is the default, the catalogue's statement of
the device, or the person's, the document's own.

**What the document says, not what a build honours.** A value the document states is answered as the person's on
every model, also where the model's build does not read that field yet and refuses a document stating it, as every
build of a Harmony One does a stated timing, and a command's tuning. Whether this model's build
reads a stated field is what [`check`](#recipecheck) lists, a problem at the device saying the field is not built; an application
shows both, the person's value here and the problem there.

### `recipe.SettingKind`

```ts
type SettingKind =
  | { readonly kind: 'yes or no'; readonly choices: readonly [true, false] }
  | { readonly kind: 'whole number'; readonly min: number; readonly max: number };
```

The kind of value a setting takes: yes or no, the two choices, or a whole number from `min` to `max`, both ends
taken. A document may state a yes or no row as true or false and a number row as a number; how the family's build
reads other forms of the same value, text among them, is the family's `refusedValue`.
