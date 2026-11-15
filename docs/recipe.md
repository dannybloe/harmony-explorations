# The recipe

**Status: preliminary.** Written 12 October 2026 for `todo-compile-650.md` 10.7.4. The format a
configuration of ours is built from: what FreeHarmony is to produce from what a user configures, and
what the codec's `assembleSetup` reads. Its code is `packages/codec/src/recipe/recipe.ts`, whose
`readRecipe` checks a recipe's shape and `recipeTarget` its model; the setup files in
`packages/corpus/setups/` are recipes and are read as such by `packages/codec/test/recipe/recipe.test.ts`.

Preliminary because one model has been built from it, the Harmony 650, and because it still needs a
donor: a Logitech compile every part comes from that no generator builds yet, which is an input of the
assembly and not of the recipe, since it goes at 11.1.1.

## What it holds and what it does not

**A recipe states a wish; the model's definition says whether it can be granted.** It names its model
and nothing of what the model can do: how many devices it holds, its screen and which family builds for
it are in `packages/base/src/models.ts`, documented per model in `reference/remotes/`. A recipe for a
model no family serves is refused when its target is looked up, and so is a device past the model's
count when the devices are composed.

Everything else a configuration depends on is in it: the devices, the activities, each activity's
working screen, and every choice of ours, `FourSlotChoices` for a Harmony 600, 650 or 700 with the
family's defaults for what it does not state. What stays fixed for now, and why, is on that type.

## The fields

JSON, one object. Every field below is checked by `readRecipe`, and a field not listed is refused, so a
misspelling is an error rather than a default.

| field | what it is |
|---|---|
| `version` | optional, the format's version, a whole number from 1; absent is 1, and one this does not read is refused. **Version 2**, decision 43, is one shape for every model: it adds the fields marked version 2 below and changes the meaning of none, so a document of version 1 reads and builds as before, and a field of version 2 in a document of version 1 is refused, as the reader of version 1 refused it. `recipe.create` and `recipe.open` write version 2 |
| `about` | optional prose, for a person |
| `model.name` | Logitech's name, `Harmony 650`: "Harmony" and the model table's name |
| `model.skin` | optional, the skin; it has to agree with the name, and a name two skins share would need it (none does today) |
| `devices[]` | in the order the configuration numbers them |
| `devices[].id` | optional, the device's id in this document, which the toolkit gives it and addresses it by, `recipe/toolkit.ts`; kept through a rename, one id on two devices refused, and not read by any builder |
| `devices[].name` | what the remote calls the device, as its screens draw it |
| `devices[].device` | its catalogue entry, `<manufacturer>/<file>` in the archive of decision 15 |
| `devices[].poweredOnBetweenActivities` | optional, MyHarmony's keep this device on when switching activities |
| `devices[].key` | optional, the Harmony 300 and 350's device key: `place` as the family counts it, from 0, and `press`, `short` or `long`, short unless given; plan 014 |
| `devices[].keys` | optional, the keys a person chose otherwise in the device's own map, device mode's: each `key`, Logitech's word for the key (`VolumeMute`, `Info`, `Number0`), the name every model's drawing carries as `data-name` in `reference/silhouettes/`, `press`, `short`, `held` or, in version 2, `double`, short unless given, and `action`, one of `{device, command}`, `{sequence}` and `{nothing: true}`; a key not listed keeps what the builders derive, and one key and press stated twice is refused. **A key is never named by its scan code**: a scan is a number inside one family's firmware, Mute is 9 on a Harmony One and another number on a Harmony 650, and a Harmony Touch has none, so a document moved between models would point at other keys; the family that builds for the model turns the word into its scan, `Family.recipeKeys`, and `recipe.keyNames` answers every key of a document's model, with the presses each has and whether a choice on it is built. A document written before this named its keys by `scan`, and is refused as a field no recipe has. **Built on the Harmony One**, for a short press sending a command or nothing, on the 37 keypad keys its maps bind, scan 13 named `Enter` by the family where the drawing gives that key no scan; every other model's build refuses a recipe that states a key, and a held press, a double press and a sequence are refused everywhere, rather than building a file whose key does something else |
| `devices[].definition` | optional, the device carried: `record`, the archive's device file as it is, and `commands`, its codeset's commands as `name` and `keycode`; served before any archive, so a recipe that carries every device builds with none. `packages/codec/bin/carry-codes.ts` fills it; plan 014 |
| `devices[].timing` | version 2, optional, a person's timing in the catalogue's own member names, `DeviceTiming` in `catalogue/driving.ts`: `interKeyDelay`, `interDeviceDelay`, `holdInterDeviceDelay`, `powerOnDelay`, `inputDelay`, `connectedAppPowerOnDelay` in milliseconds, `pressMinRepeats` and `minRepeats`, and `isInterKeyDelayOptimized`; each delay and repeat count a whole number from 0, the flag true or false; each member given stands over the catalogue's, and it is kept apart from `definition` so a definition fetched again replaces nothing a person chose. How long a delay or how many repeats a remote takes is the family's to bound when it builds them |
| `devices[].power` | version 2, optional, the catalogue's power members, `DevicePower`, `type` and the step lists `on`, `off`, `toggle` and `onReset`, each given standing over the catalogue's, and `alwaysOn`, a device never switched off; kept on between activities stays `poweredOnBetweenActivities`. An empty step list is kept, since it says the device is switched by nothing where leaving it out keeps the catalogue's |
| `devices[].channelTuning` | version 2, optional, how a channel number is entered, in the catalogue's shape, `DeviceChannelTuning`: `fixedDigits` from 1 and the step lists `start`, `finish`, `greaterTen` and `greaterHundred`, member by member as `timing` is: a member stated stands over the catalogue's and a member left out keeps the catalogue's, an empty list kept for the reason `power` gives |
| `...steps[]` of power and tuning | the catalogue's steps as the codec reads them, `DriveStep`: `{kind: 'send', command, holdMs?}`, `{kind: 'hold', command}`, `{kind: 'wait', ms}` or `{kind: 'state', state, value}`, a command always by its name |
| `devices[].screen[]` | version 2, optional, the device's screen list in device mode, stated whole, an empty list for none: each `{ device, command, label? }`, where `device` may be any device of the document, as device mode sends to any; absent is what the family derives |
| `devices[].commands` | version 2, optional, a person's changes to single commands, by command name, never an empty name nor `__proto__`: `code`, `{ keycode }` in the catalogue's notation or `{ learned }`, at least one pulse, each `{ mark, us }` with `us` a whole number from 1, and `sending`, `copies` in the first block from 1, `heldPaceMs` and `leadInMs` in milliseconds from 0; the sending part is room only and nothing builds it. Upper bounds on copies and paces are the family's to set when it builds them |
| `protocols` | optional, the protocol definitions the carried commands are written in, as the archive's protocol files hold them |
| `activities[]` | in the order the activity menu lists them |
| `activities[].keys` | optional, the same for the activity's map |
| `activities[].id` | optional, the activity's id in this document, as a device's |
| `activities[].name` | as the menu draws it |
| `activities[].type` | MyHarmony's type: `WatchTV`, `WatchDvd`, `ListenToMusic`, `Custom`; which activity key a type takes is a choice, `activityKeys` |
| `activities[].devices[]` | each device it uses: `device` by name, `input` by the catalogue's name for it, and `roles`, the jobs it does, `Display`, `Volume`, `ChannelChanging`, `PlayMovie`, `PlayMedia`, `PlayGame`; no role is a pass through device |
| `activities[].screen[]` | optional, the working screen's items in order: `{ device, command }`, a command by the label the device's own screen draws it under, in version 2 with a `label` of its own and the device one of the document's; `{ sequence, steps }`, the form of version 1; or, in version 2, `{ sequence }`, one of the activity's own `sequences` by its name. A sequence written out here may not share its name with one of `sequences` |
| `...screen[].steps[]` | the form of version 1: `{ device, scan }`, the command that device's key sends, by the key's scan code (`reference/remotes/harmony-650/keys.md`), or `{ pause }` in tenths of a second |
| `activities[].opensOn` | version 2, optional, the screen the activity opens on, by the word the model's family names it by |
| `activities[].favourites` | version 2, optional, whether this activity holds the favourite channels; at most one activity says true |
| `activities[].powerOrder[]` | version 2, optional, the order the activity switches its devices on in, by name, each of its devices once |
| `activities[].start[]`, `end[]` | version 2, optional, extra steps when the activity starts and ends: `{ device, command }`, the device one of the activity's, `{ pause }` in whole tenths of a second from 1, `{ sequence }`, one of the activity's own `sequences`, or `{ device, channel }`, a channel tuned through one of the activity's devices, its digits as text so a leading zero survives (a step of the activity's own, never of a sequence); none is said by leaving the field out, and an empty list is refused |
| `activities[].sequences[]` | version 2, optional, the activity's named sequences: `id`, given by the toolkit, `s` and a number, `name`, once within the activity, and `steps`, each `{ device, command }`, the device one of the activity's, or `{ pause }` in whole tenths from 1, at least one sending a command; **a step names its command and never a scan code**, so a document moved to another model means the same commands. In version 2 a key's `{ sequence }` names one of the activity's sequences, either form, and a device's key runs none, a device having no sequences |
| `choices` | optional, the family's choices over its defaults, the look among them (letters, inks, colours, icons): `FourSlotChoices` for the Harmony 600, 650 and 700, `OneChoices` for the Harmony One, none for the Harmony 300, 350 and Touch; the family refuses one it does not make. A reference recipe states every choice, `unstatedChoices` answering empty, so a default changed later cannot change it; plan 014 |
| `favourites[]` | optional, favourite channels per device: `device` by name, a device of the recipe, at most once, and `channels`, in the order of the remote's favourite keys |
| `...favourites[].channels[]` | each a channel number **as text**, digits with at most one dot or dash between them, so a leading zero survives: `"07"` is a channel of its own. Logitech's service holds a channel as text, `reference/logitech/service.md`, "Button maps" |
| `settings` | version 2, optional, the remote's own settings by the names its family gives them, never an empty name nor `__proto__`, each a text, a number or true or false |
| `highestIds` | version 2, optional, the highest number the toolkit has given an id of each kind, `device`, `activity` and `sequence`, so an id is never given twice, each a whole number from 0; it counts only ids of the toolkit's form, `d`, `a` or `s` and a number, so an id of that form numbered past it is refused and an id written otherwise is not judged. No build reads it, since it changes no byte a remote receives |

**No build reads a field of version 2 yet, and none leaves one out without a word.** Every route to a build,
`buildFromRecipe`, each family's `fromRecipe`, the composers of a setup and the Harmony Touch's setup reader and
builders, refuses a document stating any of them as a function not built, naming the field and the requirement it
waits on, `refuseUnbuiltFields` in `recipe/recipe.ts`, which walks `VERSION_TWO`, the one table the reader also
takes its fields of version 2 from; `highestIds` is the one passed over. The toolkit's `check` lists each such field
as an error, and its changes and `uses` refuse a document stating one, since none of them follows these fields
through a rename or a removal yet.

**What is refused as empty**: a name or a text with nothing in it, a field that is an object stating no member
(`timing: {}`, a command entry `{}`), a sequence or an extra step list with no step, and a learned code with no
pulse. An empty list is kept where it says something, a device screen of none and a power or tuning step list of
none. `recipe.open` reads what it opens again as version 2, so a document of version 1 stating what version 2
refuses, a key running a sequence its activity does not name, is refused there rather than opened once and refused
on the next load.

**Favourite channels are given to Logitech's service and built by nothing of ours yet.**
`packages/corpus/bin/build-setup.ts --stage favourites` saves them on a test account's record so a
compile of theirs holds them, for the Harmony One, 600, 650 and 700. **It refuses the Harmony 300 and
350**, which keep their favourites on another map that only `UpdateDeviceModeButtonMaps` writes, and the
favourites on the 350's test setup were typed into MyHarmony's own screen, `todo-compile-350.md` 3.2,
`reference/logitech/service.md`, "Button maps". Every composer
refuses a recipe that states any, since none writes a favourite channel and a configuration built
without them would be missing what its recipe asked for.

## Asking a document what its keys do

The toolkit, `recipe` on the codec's main entry (`packages/codec/src/recipe/toolkit.ts`), answers four questions about
keys and screens before anything is built, R77, decision 43. They read the same maps a build binds by, `resolveMaps`
over the model's family's maps in `packages/codec/src/families/maps.ts`, so what an application shows is what is built.

| question | answers |
|---|---|
| `keyNames(document)` | every key of the model as data, in its family's order: Logitech's word, where it is (keypad, pad, gesture or touch key), the presses it has on this model, whose map binds it (a device's, an activity's, both, or `remote`, neither), whether a person's choice on it is built, and why not |
| `keys(document, owner, sources?)` | every key the owner's map can bind, bound or not, in the model's order |
| `key(document, { owner, key, press? }, sources?)` | the same for one key, or one press of it; a word that is no key of the model is refused |
| `screen(document, owner, sources?)` | the owner's screen list in order, each entry marked default or the person's, and whether the list is the family's or stated whole |

**A key's answer** holds the owner, the key, its `surface` (keypad, pad, gesture or touch key), one entry per press
the model has for it, and `why` where a person cannot choose what it does. A key the owner's map does not bind, a key
the remote binds outside every map or a gesture in a device's own map, answers no press and says why; a press asked
for that the key does not have answers none and says "not on this model". Each press has:

* `press`, short, held or double, and `label`, the label a number pad draws on it, where the family gives one;
* `action`: a device's command, the device by its id; one of the activity's sequences by its name; or nothing;
* `isDefault`: true where the family derived it, false where the document chose it. **A choice equal to the default
  is still the person's**, since the document states it and it stays when the family's default changes; `setKey`
  with `'default'` gives the key back;
* for a command, `sending`, how it is sent, below; for a sequence, `sequence`, its id where it has one, its name and
  its steps, each a device's command, a pause in tenths of a second, or, in a sequence written out in the form of
  version 1, a device's key by its scan code, which is how that form states a step.

**A screen's entries** are a device's command, the device by its id, with a `label` where one is stated; one of the
activity's sequences by its name; or an entry the remote acts on itself and that sends nothing, such as one opening
the number pad, `{ label, client }`, `client` being the family's name for that action. A person states a screen whole,
so every entry carries the list's mark.

**How a command is sent** is the target device's settings, each `{ value, isDefault }`: how many times one press sends
the code, the pause before the next command to the same device and to another device, the wait after power on and the
wait after an input change, in the catalogue's own names, `DeviceTiming`. The default is the catalogue's statement of
the device and the person's is `devices[].timing`. The wait after power on is left out where neither states one. Where
the document tunes that one command, `devices[].commands[name].sending`, the tuning is shown beside the settings as the
person's. Four of the catalogue's nine timing members are not answered: which of its two repeat counts wins is not
read, and no build sends by the other three. **Whether a key repeats while held is not answered**: it is a property of
the command's code, decided when a build writes it. Every answer is the caller's own object, so changing one changes
no other answer and not the document.

**The questions answer the document, not what a build honours.** A timing or a command's tuning the document states is
answered as the person's on every model, also where the model's build does not read that field yet: every build of a
Harmony One refuses a document stating either. Whether this model's build reads a stated field is what `check` lists,
an error at the device saying the field is not built, so an application shows the person's value and that problem
side by side.

**A device's own map and an activity's are separate.** A key changed in a device's map, device mode's, changes that
device's answer and no activity's, since an activity derives from its devices' default maps.

**When an answer stops.**

* **A device carrying no definition, with no archive given**: every owner's answers stop, not only those using the
  device, since the maps are resolved for the whole document at once, with the error `commands` gives, "Television
  carries no definition, so its commands are not in the document". A carried definition, which `addDevice` puts in
  the document, or an archive in `sources.archive` that holds the device makes them answer.
* **A key choice naming a device the document does not hold**: `keys` for that owner, and `key` for that key, stop
  with an error naming the key and the device. The owner's other keys asked one at a time, its screen and every other
  owner answer, and `check` lists the choice.

**Answered for the Harmony One and the Harmony Touch**, the two models whose families state their maps. Every other
model answers not built, naming the model and R77, and so does a document that still carries a Harmony Touch's own
block, naming the converter, `harmonyTouch.describeTouchDocument` on the codec's `./build`. `check` holds a document's
key choices to the same places: a word that is no key of the model, a key the owner's map does not bind, and a press
the key does not have are each a problem with its place. `packages/codec/test/recipe/toolkitkeys.test.ts` holds all of
it on the two reference documents.

## Syncing a recipe, and trying it with nothing attached

An application hands a whole recipe to `syncDocument` on `@harmony/corpus/write`, R79, which checks it, builds it,
writes it with the model's own write path and tells what it does as events: the phase it is in, how far along, what
a person must do or leave, and how it ended. Its header in `packages/corpus/src/sync.ts` is the contract; the order of
the phases per kind of remote is on `SyncPhase`, and every way a sync ends, each result with what it leaves the remote
as, per kind of remote, is `SYNC_ENDINGS`, which `SyncOutcome`'s types are derived from.

**A pretend remote takes the place of the cable**, R80, so every screen of a sync and a read can be built and tried
with no remote attached. It goes through the same stages as a remote on the cable, so its events, their order, its
outcomes and their words are the real path's, which `packages/corpus/test/write/pretend-against-attached.test.ts`
holds for a Harmony One and a Harmony Touch. A worked example, for a Harmony One:

```ts
import { recipe } from '@harmony/codec';
import { readConfig } from '@harmony/corpus';
import { pretendReader, pretendRemote, syncDocument } from '@harmony/corpus/write';

const document = recipe.create({ name: 'Harmony One', skin: 54 });
// Fifty milliseconds a step, so a progress bar can be watched; the next sync fails part way through its write.
const remote = pretendRemote({ model: document.model, stepMs: 50, failIn: 'write' });

const sync = (): ReturnType<typeof syncDocument> => syncDocument({
  document, remote, commit: true,
  sources: { builtAt: '2026-11-15T09:00:00' },
  onEvent: (event) => console.log(event),   // a screen draws the latest event of each kind
  journal: (line) => console.log(line),     // required: the record of what was done
});

await sync();   // { result: 'failed', remote: 'needs-recovery', message: 'the write stopped part way: ...' }
await sync();   // { result: 'written', remote: 'new-configuration' }: the same sync again finishes the blocks it left

// The read of a configuration, as off a remote on the cable: the same progress, checks and failures.
const { reader, profile } = pretendReader(remote);
const read = await readConfig(reader, profile, { onProgress: ({ done, total }) => console.log(done, total) });
```

The first sync reports `identify`, `check`, `build`, `backup` with eight steps of progress, the warning to leave the
remote on its cable, `write` with four steps, and ends failed; the second compares and writes the four blocks left.
`failIn` names one failure for the next sync or read: `identify`, `check`, `build`, `backup`, `hand-over`, `write`,
`verify`, `restart` or `read`, each ending as the real path ends a failure there. A pretend Harmony Touch also takes
`powerSource`, which refuses a sync on anything but `usb` as the remote's own check does, and `aborts`, the remote's
own abort. A Harmony Touch's documents have no read on any entry yet, so `pretendReader` refuses a Touch, as it
refuses every model the read of a configuration does not serve.

## Against FreeHarmony's data model

Checked against FreeHarmony's `src/shared/content.ts` and `remote.ts` as they stood on 12 October 2026.
A **gap** is something FreeHarmony would have to hold before it can produce a recipe from what a user
configures; a **difference** is the same thing said another way, which a converter maps.

| recipe | FreeHarmony | |
|---|---|---|
| `model` | `StoredRemote.model`, a `RemoteModel` | the same shape, chosen to be |
| `devices[]` order | `DeviceUse.slot` | difference: a recipe has no numbering of its own, its order is the configuration's |
| `devices[].name` | `DeviceUse.label` | same |
| `devices[].device` | `DeviceUse.definition`, an id in the library | **gap**: a recipe names the catalogue entry, and a library definition does not say which entry it came from unless its provenance does (decision 11) |
| `poweredOnBetweenActivities` | none | **gap** |
| `activities[].name` | `Activity.name` | same |
| `activities[].type` | `Activity.kind` | difference: `WatchTV` `watch-tv`, `WatchDvd` `watch-a-film`, `ListenToMusic` `listen-to-music`, `Custom` `other`; FreeHarmony's `play-a-game` has no type here yet and is refused by the assembly |
| `activities[].devices[]` | `Activity.roles`, one `ActivityRole` per job | difference: a recipe lists a device with its jobs, FreeHarmony a job with its device; roles map `Display` `picture`, `Volume` `sound`, `ChannelChanging` `channels`, `PlayMovie` `film`, `PlayMedia` `media`, `PlayGame` `game` |
| a device with no role | none | **gap**: a pass through device, an HDMI switch, has no role in FreeHarmony to be listed by |
| `input` | `ActivityRole.input` | same, by the name the catalogue gives it |
| none | `ActivityRole.powerOnOrder`, `powerOffOrder`, `delayAfterMs` | the compiler's to decide here; a recipe does not state them yet |
| `screen[]` command items | screen `ButtonBinding`s with `inActivity` | difference: a recipe names a command by its label on the device's own screen, FreeHarmony by its position in the definition, `Step.command` |
| `screen[]` sequence items | `Activity.sequences` and a binding's `runsSequence` | difference: a recipe states a sequence where it sits on the screen, FreeHarmony once on the activity with bindings naming it |
| `steps[].scan` | `SequenceItem.step`, a device and a command | difference: a key's scan code against a command; the key is what the composer reads the command off |
| `steps[].pause` in tenths | `SequenceItem.waitMs` | difference: tenths against milliseconds, which FreeHarmony already holds to multiples of 100 |
| none | keypad `ButtonBinding`s | an activity's keypad comes from its roles, section 323, and a device's from its catalogue entry; a recipe states neither yet |
| none | `Activity.opensOn` | the Harmony 650 has one start screen; a choice when a family has more |
| `favourites[]` | none | **gap**: FreeHarmony holds no favourite channel, by its own decision that a sequence expresses one |
| `choices` | none | **gap**: the look and the settings; `RemoteContent.language` is the start of it, and the words are a choice once a configuration is built rather than patched |

So FreeHarmony can produce a recipe once it holds three things it does not: the catalogue entry behind a
device, the keep on flag, and a pass through device in an activity; plus the choices, which have no
editor there yet. The differences are a converter's.
