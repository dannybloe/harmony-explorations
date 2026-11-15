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
| `activities[].devices[]` | each device it uses: `device` by name, `input` by the catalogue's name for it, and `roles`, what it does in the activity, `Display`, `Volume`, `ChannelChanging`, `PlayMovie`, `PlayMedia`, `PlayGame`; no role is a pass through device. **A role is never required**, decision 44: it is the shortcut the activity's default key map is derived from, and an activity with a role no device has is still an activity |
| `activities[].screen[]` | optional, the working screen's items in order: `{ device, command }`, a command by the label the device's own screen draws it under, in version 2 with a `label` of its own and the device one of the document's; `{ sequence, steps }`, the form of version 1; or, in version 2, `{ sequence }`, one of the activity's own `sequences` by its name. A sequence written out here may not share its name with one of `sequences` |
| `...screen[].steps[]` | the form of version 1: `{ device, scan }`, the command that device's key sends, by the key's scan code (`reference/remotes/harmony-650/keys.md`), or `{ pause }` in tenths of a second |
| `activities[].opensOn` | version 2, optional, the screen the activity opens on, by the word the model's family names it by |
| `activities[].favourites` | version 2, optional, whether this activity holds the favourite channels; at most one activity says true |
| `activities[].powerOrder[]` | version 2, optional, the order the activity switches its devices on in, by name, each of its devices once |
| `activities[].start[]`, `end[]` | version 2, optional, extra steps when the activity starts and ends: `{ device, command }`, the device one of the activity's, `{ pause }` in whole tenths of a second from 1, `{ sequence }`, one of the activity's own `sequences`, or `{ device, channel }`, a channel tuned through one of the activity's devices, its digits as text so a leading zero survives (a step of the activity's own, never of a sequence); none is said by leaving the field out, and an empty list is refused |
| `activities[].enabled` | version 2, optional, R92: `false` switches the activity off, and on is said by leaving the field out, so `true` is refused. **A switched off activity is left out of every build and sync**, as if removed, and keeps its id, so switched on again it is the activity it was; the build's result and the sync's outcome name each one left out, below. Read by every build, decision 44 |
| `activities[].attention[]` | version 2, optional, R93: the activity's mark of **needing attention**, one reason or more, never an empty list. Each `{ happened, device?, keys?, message }`: `happened` is `device-removed` or `marked`; `device` the device removed, by the name it had, for a removal and for no other, never following a rename since a device of that name later is another; `keys`, where the model's maps are built, every press of the activity whose answer the removal changed, each `{ key, press, was, now }`, what it did and what it does, a key's action each, an empty list where none changed and no list where the keys are not known; and `message`, an English sentence an application may show or word itself from the rest. A mark changes no build, so every build reads it by passing it over, decision 44 |
| `activities[].sequences[]` | version 2, optional, the activity's named sequences: `id`, given by the toolkit, `s` and a number, `name`, once within the activity, and `steps`, each `{ device, command }`, the device one of the activity's, or `{ pause }` in whole tenths from 1, at least one sending a command; **a step names its command and never a scan code**, so a document moved to another model means the same commands. In version 2 a key's `{ sequence }` names one of the activity's sequences, either form, and a device's key runs none, a device having no sequences |
| `choices` | optional, the family's choices over its defaults, the look among them (letters, inks, colours, icons): `FourSlotChoices` for the Harmony 600, 650 and 700, `OneChoices` for the Harmony One, none for the Harmony 300, 350 and Touch; the family refuses one it does not make. A reference recipe states every choice, `unstatedChoices` answering empty, so a default changed later cannot change it; plan 014 |
| `favourites[]` | optional, favourite channels per device: `device` by name, a device of the recipe, at most once, and `channels`, in the order of the remote's favourite keys |
| `...favourites[].channels[]` | each a channel number **as text**, digits with at most one dot or dash between them, so a leading zero survives: `"07"` is a channel of its own. Logitech's service holds a channel as text, `reference/logitech/service.md`, "Button maps" |
| `settings` | version 2, optional, the remote's own settings by the names its family gives them, never an empty name nor `__proto__`, each a text, a number or true or false |
| `highestIds` | version 2, optional, the highest number the toolkit has given an id of each kind, `device`, `activity` and `sequence`, so an id is never given twice, each a whole number from 0; it counts only ids of the toolkit's form, `d`, `a` or `s` and a number, so an id of that form numbered past it is refused and an id written otherwise is not judged. No build reads it, since it changes no byte a remote receives |

**Which build reads a field of version 2 is one table, and no build leaves one out without a word.**
`VERSION_TWO` in `recipe/recipe.ts` states, per field and per part of a field, the requirement it waits on and which
kind of family's build reads it, `readBy`: `compiled` for the families that build one container, `document` for the
Harmony Touch's. The reader takes its fields of version 2 from it, and the guard, `refuseUnbuiltFields`, walks it for
the kind of family the route builds for: every route to a build, `buildFromRecipe`, each family's `fromRecipe`, the
composers of a setup and the Harmony Touch's builder, refuses a document stating a field that kind does not read as a
function not built, naming the field and the requirement; `highestIds` is the one passed over. **No compiled
family's build reads a field of version 2 yet.** **The Harmony Touch's reads most of them**: the settings, a device's
delays and repeat count in the members its documents carry (`interKeyDelay`, `interDeviceDelay`, `powerOnDelay`,
`inputDelay`, `pressMinRepeats`), its being always on, its channel tuning and its screen, an activity's opening
screen, its hold on the favourites, its power order, its sequences, the steps at its start and end, a screen entry's
label and sequence, and a double press on an activity's key. It does not read a device's other four timing members
(`holdInterDeviceDelay`, `connectedAppPowerOnDelay` and `isInterKeyDelayOptimized`, R16, and the second repeat count,
`minRepeats`, R17), a power member other than `alwaysOn`, R14, a step
at a start or end that runs a sequence, R30, a device's own commands, R19 and R89, nor a double press in a device's
own map, R40. **Every build reads two of them**, an activity's `enabled` and its `attention`, decision 44: the one
build and every route take a switched off activity out before any family sees the document, `recipeToBuild`, and a mark
changes nothing built, so neither stops a build of either kind. The toolkit's `check` lists each field the document's model does not read
as an error; its changes write every field whatever the model's build reads, and follow each through a rename and a
removal, below.

**What is refused as empty**: a name or a text with nothing in it, a field that is an object stating no member
(`timing: {}`, a command entry `{}`), a sequence or an extra step list with no step, and a learned code with no
pulse. An empty list is kept where it says something, a device screen of none and a power or tuning step list of
none. `recipe.open` reads what it opens again as version 2, so a document of version 1 stating what version 2
refuses, a key running a sequence its activity does not name, is refused there rather than opened once and refused
on the next load.

## A Harmony Touch's document

**A Harmony Touch is built from a document of version 2 like every other model**, decision 43: `buildFromRecipe`
chooses its family by the model and builds the six documents a sync delivers, with the account's Context, from the
document alone. What its document states:

* `model.name` `Harmony Touch`; `choices` and `favourites[]` refused, since its family makes no choice and its
  favourites documents stay the remote's; a device key refused, since a Touch has none;
* every device and activity, every sequence included, with the toolkit's id, `d`, `a` or `s` and a number, which the
  documents number by, and each device's definition carried or found in the archive given;
* `settings`, **any of the seven rows a Settings of ours writes, or none**, by the names
  `families/harmony-touch/settings.ts` gives them: a row not stated takes the family's default, `TOUCH_SETTING_DEFAULTS`,
  the value Logitech's service writes for an account where it states one and the firmware's own where it states none,
  `packages/codec/test/families/harmony-touch/touch-setting-defaults.test.ts`. The vibration, its effect, the activity
  press duration and the two background rows are rows the remote has that a document states nothing of yet, not built,
  R47 and R42; any other name is a setting a Touch does not have;
* a device's `timing` in the five members its documents carry, `power.alwaysOn`, `channelTuning` and `screen`; an
  activity's `opensOn`, `favourites`, `powerOrder`, `start` and `end` but a step running a sequence, `sequences`; and
  the keys of both maps short or held, and an activity's pressed twice, where the place has that press; everything else its family derives, the
  keys by `TOUCH_MAPS` in `families/maps.ts` and the favourites by the activity that changes channels.

**The control port is not stated and is always 0**, the remote's own lamp. **A document still carrying the Touch's
own block, `touch`, is the earlier form and is refused by `readRecipe`**, naming the converter,
`harmonyTouch.describeTouchDocument` on the codec's `./build`, which writes it in this shape. The earlier form's own
reader and its route to the six documents are kept for the converter and for the bench runs built from it,
`families/harmony-touch/earlierform.ts`, offered as `earlierTouchSetupFile` on `./internal` and on no entry an
application builds on. `packages/codec/test/references/touch-test.json` is the bench test setup in this shape; the
six documents it builds differ from the earlier form's in the control port of five devices, four buttons and the order
of each map's buttons, `packages/corpus/test/touch/touch-version-two-set.test.ts`.

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
model answers not built, naming the model and R77. `check` holds a document's key choices to the same places: a word
that is no key of the model, a key the owner's map does not bind, and a press the key does not have are each a problem
with its place, coded as `setKey` refuses the same place: a key only the other kind of owner binds is not on this model,
a key the remote binds itself unknown. `packages/codec/test/recipe/toolkitkeys.test.ts` holds all of it on the two reference documents.

## Changing a document

The toolkit's changes are the only way an application changes a document, and **they are the same calls for every
model**, decision 43. Each returns a new document of its own, checked as `readRecipe` checks one and sharing no object
with the document given or with anything passed in, and `effects`, everything else the change touched, each with its
place and a sentence. A change refuses with `ChangeRefused` and one of four reasons: `unknown`, something the document
does not hold; `over-limit`, more than the model takes; `invalid`, what was given makes no sense or would leave the
document naming what is gone; and **`not-on-this-model`**, what the model does not have, from its family's places and
its capabilities. What nobody has written yet is a different answer, `NotBuiltError`, naming the requirement it waits on.
A model no family serves yet, a Harmony 525, 515 or 785, answers not built from every call that needs its family:
`create`, `addDevice`, `addActivity`, `setKey`, `setScreen`, `setSetting` but for `'default'`, the questions about keys,
screens and settings, and `check`. What a
caller passes is held to its shape, so `null` or a list where a record belongs, and an owner naming both a device and
an activity, are refused as `invalid` rather than thrown as a `TypeError`; and a refusal the reader gives names the
device, activity or sequence by its name, never by its position.

**A change writes the document whether or not the model's build reads that field yet**, so a person's choice is kept
while the build catches up; `check` lists what the model's build does not read, as an error at its place.

| change | what it does |
|---|---|
| `addDevice(document, { name, device })` | a device with its carried definition and protocols, last, under the next device id |
| `refreshDevice(document, device, carried)` | replaces that device's carried definition and nothing else: its name, keys, screen, timing, power, tuning, own commands and every choice naming it stay, a stated value equal to the new definition's included; every choice naming a command the new definition lacks is an effect, `missing`, and `check` lists it. A definition of another catalogue entry is refused |
| `setDevice(document, device, changes)` | its name, which follows it everywhere the document names it; kept on between activities, true or false; its device key, on the Harmony 300 and 350 alone and not on this model elsewhere, R39; and `timing`, `power` and `channelTuning`, **member by member**: a member given stands over the catalogue's, `'default'` on a member drops that one, `'default'` for the whole drops all. A step of power or channel tuning the change writes names a command the device has, or is refused as unknown. Its inputs answer not built, R15 |
| `setDeviceCommand(document, device, command, change)` | `{ code, sending }`: a code of its own, `'original'` to drop it, and how that one command is sent, R89, member by member (`copies`, `heldPaceMs`, `leadInMs`); `'original'` drops both; `'removed'` takes away a command the document added, refused while a key, an entry or a step uses it, naming where. Taking away a command of the definition answers not built, R19 |
| `addActivity`, `setActivity(document, activity, changes)` | its name, kind and devices; `opensOn`, held to the words the model's family names, `FamilyMaps.openingScreens`, not on this model for another word or on a model without a screen, and not built where the family names none yet, the Harmony One's among them, R91; `favourites` (true takes the hold off the activity that had it, reported), `powerOrder` by device ids, and `start` and `end` whole, each step a command or a channel of one of its devices, a pause, or one of its own sequences by id; `'default'` or an empty list gives a member back. Its devices or their roles changed, the power order follows, each role no device of it has afterwards is an effect at that role, as a removal reports it, and every press of the activity whose answer changed is an effect at that key, `{ kind: 'key' }`, saying what it did and does; **no mark is set**, since the person changing the activity is looking at it, decision 44. A step still sending to a device it stops using refuses, naming the step. `enabled`, R92, switches it off with `false` and on again with `true`, refused as over the limit where the model takes no more activities switched on; switching off the activity that holds the favourite channels is an effect at it, naming the activity that holds them while it is off, by the family's rule, or saying none does. Its icon and activity key answer not built, R27 and R29 |
| `markAttention(document, activity, message)`, `clearAttention(document, activity)` | R93: a reason added by hand, `marked`, with the sentence given, without the space around it, and no device or key, refused as `invalid` for a sentence with nothing in it; and every reason taken away at once, the one call an application makes once a person has seen why. Nothing clears a mark of its own accord |
| `addSequence(document, activity, sequence)`, `setSequence(document, sequence, changes)` | **a sequence is its activity's**: added to one, its steps a command of one of that activity's devices or a pause, at least one a command; a new name follows to the keys, entries and steps that run it |
| `setKey(document, { owner, key, press }, action)` | every press the model's places give the owner's map: short, held where the key has a long press, double on a gesture; a device's command, one of the activity's sequences by id, or nothing; `'default'` gives the press back. A press the key lacks, a key only the other kind of owner binds, and a choice the family refuses, `FamilyMaps.refusedChoice`, such as a command a Harmony Touch's number pad draws on no key, are not on this model, and so is a key another model has and this one lacks, a gesture on a Harmony One; a word no model has as a key, and a key the remote binds itself, are unknown, the second with its reason. On a model whose family has no maps, not built |
| `setScreen(document, owner, items)` | the list whole: `{ device, command, label? }`, and on an activity's screen `{ sequence }` by id; an empty list is a person's empty screen; `'default'` gives it back. A screen on a model without one is not on this model; a page of entries and a sequence's own label answer not built, R36 and R34 |
| `setSetting(document, name, value)` | one row of `settings`; `'default'` drops it and the family's default stands. Judged by the model's family where it states its settings, `FamilySettings` in `families/settings.ts`, by the one judgement the check takes too: a value the build refuses for the row is `invalid`, in the build's words; a row the remote has and the build does not write yet answers not built with its requirement, a Harmony Touch's vibration R47; any other name is not on this model. Where the family states none, every compiled family's, the name and the value are written unjudged and `check` lists the field as one the build does not read |
| `remove(document, { device \| activity \| sequence })` | settles everything that named it, each an effect, the same places `uses` lists, in order: a device leaves its activities and power orders, each role it had in an activity that no other device of the activity has is an effect at that role (`{ kind: 'role', activity, role }`, the role by the document's word, `Volume`), keys sending its commands go back to their defaults, entries and extra steps sending to it go, a sequence loses its steps and goes with its last command step, and with it every key, entry and step that ran it; an activity goes with its sequences, and where it held the favourite channels an effect at the document says no activity holds them now; a sequence goes with every key, entry and step that ran it. **Last, every activity that used a removed device is marked as needing attention**, `device-removed`, an effect at `{ kind: 'attention', activity }` |
| `move(document, what, to)` | a device, an activity, or a device within an activity |

`setFavourites`, `setLook` and `favourites` answer not built.

**An activity is never invalid, and removing a device marks every activity that used it**, decision 44, R93. The
activity is kept and marked with every press of its keys whose answer the removal changed, what it did and what it does
now: a key that sent the device's command and sends nothing, a default that followed the device's role to another
device, a sequence that went with the device's last step. The keys are read off the model's maps before and after the
removal, resolved as the questions resolve them, so they are named on the models whose families state maps, the Harmony
One and the Harmony Touch; **where a model's keys are not built yet the mark is set with no keys**, and its message says
so, R77. An activity whose keys are known and none changed is marked all the same, its keys an empty list, the Touch's
pass through switch the example. The activity is still built and synced as it is: the mark is a note to a person and
not a problem, and `check` lists nothing for it. **It is stored because it cannot be worked out afterwards**: the
document after the removal no longer says what the keys did. A change of the activity itself through `setActivity`
sets no mark and reports the presses it changed as effects. A rename follows into a key's `now`, a device that is there,
and never into the mark's `device` or a key's `was`, a device that is gone; the message stays as written.
`activities(document)` answers each activity's `enabled` and `attention`. Logitech's client, by its code, deletes the
activities a removed device is used in; this toolkit does not. **A model's limit on activities counts those switched
on**, in `check`, `addActivity` and `setActivity` alike, as the build gives the remote only those. An activity that uses
no device is not decided: the Harmony One, 600, 650 and 700 build one today, and the Harmony Touch and the Harmony 350
refuse it. `packages/codec/test/recipe/toolkitattention.test.ts` holds the switch and the mark.

**The remote's own settings are asked with `settings(document)`**, R47: every setting the model's build writes, in the
order it writes them, each `{ name, value, isDefault, default, takes }`, `takes` the choices of a yes or no setting or
the range of a whole number, the value the document's where it states one and read as what it means, `"30"` as 30, and
a value equal to the default still the person's. A setting the document states that the build does not write is not
answered; `check` lists it. A model whose build reads no setting from a document, every compiled family's, answers not
built, R47: the Harmony One's and the Harmony 600, 650 and 700's settings are build choices of their own and whether the
Harmony 300 and 350 have any is not checked, so an empty answer would say what is not known. The change, the check and
the build agree on every setting of a Harmony Touch, `packages/codec/test/recipe/toolkitsettings.test.ts`.

**Ids are never given twice.** The document records the highest number given of each kind, `highestIds`, and every
change counts from it and records it, a removal included, so the device added after the last one was removed takes the
next number, and nothing keyed by the old id, a Harmony Touch's favourites among them, passes to it. `open` gives an id
to everything without one past the highest, a sequence included, and records it where the document records that kind.

**`check(document, sources?)`** lists, beside what it always did, a key's choice on a place or a press the owner's map
cannot bind, a choice the family refuses, a held press, a double press or a sequence on a key where the model's build
takes none, a sequence on a device's own key (`invalid`, which `readRecipe` refuses and a document that reached the
check without it may hold) and one its activity does not hold (`unknown-sequence`), each key's choice coded first as
`setKey` refuses the same choice, the place before the action and the family's own refusal last, a setting as
`setSetting` judges it, the not built one said as `not-on-this-model` with its requirement, an opening screen the model does not have, a device key on a model without device keys, and every key,
screen entry, step of a sequence or at a start or end, step of a device's power or channel tuning, and command tuning
that names a command its device does not have, from the device's carried definition, or
from `sources.archive` for a device carrying none. Where neither says which commands a device has, nothing is said of
them and the device is listed as a note, `no-definition`, one it cannot judge, which the build refuses without an
archive. A field of version 2 the model's build does not read is listed naming the model, since another model's build
may read it. **A name the build would refuse to draw** is listed as an error, `name-not-drawable`, asked of the model's
family by its builders' own judgement, `Family.nameRefusal`: on the Harmony One a device's name on a device list's row
and an activity's on its start up title, on the Harmony 600, 650 and 700 a device's as its device mode label and an
activity's as its activity menu row's label and on its start up screen. Judging a name draws it, so through the main
entry with no fonts supplied the check judges none and says so once, a note, `names-not-judged`. Every other place a family draws a name is not judged yet, and a family stating no
judgement, the Harmony 300 and 350's and the Harmony Touch's, whose builds were not seen to refuse a name, says
nothing.

**A build says no in three ways an application tells apart, on every model**, from `buildFromRecipe`: `ComposeError`,
the build refuses the document, a name too long to draw among it; `NotBuiltError`, what the document asks for is not
built yet, naming its requirement, a field of version 2 the family does not read, a key chosen where the family builds
none, R31 and R32, a held press, a double press or a sequence on a key, R38, R40 and R37, and a model whose family
builds nothing from a recipe yet, the Harmony 880 and 885, R4; and `RecipeError`, a source the caller must give is
missing, an account for a Harmony Touch or an archive for a device the document carries no definition of. A recipe that
is not one, and a model no family serves, are `RecipeError` too, before any build begins.

`packages/codec/test/recipe/toolkitchanges.test.ts` holds every change on a Harmony One and a Harmony Touch reference
document, each with its control.

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

**An activity switched off is said, not silently missing**, R92, decision 44. `buildFromRecipe` answers `leftOut`, each
activity it left out by id and name in the document's order, on every model, and a sync says the same once in its
journal right after the build, `left out, switched off: activity Watch a Film (a2)`, and on every outcome after the
build, `SyncOutcome.leftOut`, present only where one was left out, on the attached paths and the pretend remote alike.
On a Harmony Touch the favourite channels go to the first activity left that changes channels, by the family's own
rule, and with none left no activity holds them and the set still builds. A set with no activity at all made the
remote ask for no favourites document, `reference/architectures/harmony-touch/answering-a-sync.md`, "The empty
configuration is stored, committed and started"; whether a set with activities and none holding the favourites does
the same is not checked, and a put back after either should carry the favourites documents. The other activities keep their ids, and so does the one switched off, so switching it on again builds it
under the id it had. `packages/corpus/test/write/touch-toolkit-path.test.ts` takes one through a pretend Touch.

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
| `activities[].devices[]` | `Activity.roles`, one `ActivityRole` per role | difference: a recipe lists a device with its roles, FreeHarmony a role with its device; roles map `Display` `picture`, `Volume` `sound`, `ChannelChanging` `channels`, `PlayMovie` `film`, `PlayMedia` `media`, `PlayGame` `game` |
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
