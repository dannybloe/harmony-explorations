# The recipe

**Status: preliminary.** Written 12 October 2026 for `todo-compile-650.md` 10.7.4. The format a
configuration of ours is built from: what FreeHarmony is to produce from what a user configures, and
what the codec's `assembleSetup` reads. Its code is `packages/codec/src/recipe/recipe.ts`, whose
`readRecipe` checks a recipe's shape and `recipeTarget` its model; the three setup files in
`packages/corpus/setups/` are recipes and are read as such by `packages/codec/test/recipe.test.ts`.

Preliminary because one model has been built from it, the Harmony 650, and because it still needs a
donor: a Logitech compile every part comes from that no generator builds yet, which is an input of the
assembly and not of the recipe, since it goes at 11.1.1.

## What it holds and what it does not

**A recipe states a wish; the model's definition says whether it can be granted.** It names its model
and nothing of what the model can do: how many devices it holds, its screen and which family builds for
it are in `packages/usb/src/models.ts`, documented per model in `reference/remotes/`. A recipe for a
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
| `about` | optional prose, for a person |
| `model.name` | Logitech's name, `Harmony 650`: "Harmony" and the model table's name |
| `model.skin` | optional, the skin; it has to agree with the name, and a name two skins share would need it (none does today) |
| `devices[]` | in the order the configuration numbers them |
| `devices[].name` | what the remote calls the device, as its screens draw it |
| `devices[].device` | its catalogue entry, `<manufacturer>/<file>` in the archive of decision 15 |
| `devices[].poweredOnBetweenActivities` | optional, MyHarmony's keep this device on when switching activities |
| `activities[]` | in the order the activity menu lists them |
| `activities[].name` | as the menu draws it |
| `activities[].type` | MyHarmony's type: `WatchTV`, `WatchDvd`, `ListenToMusic`, `Custom`; which activity key a type takes is a choice, `activityKeys` |
| `activities[].devices[]` | each device it uses: `device` by name, `input` by the catalogue's name for it, and `roles`, the jobs it does, `Display`, `Volume`, `ChannelChanging`, `PlayMovie`, `PlayMedia`, `PlayGame`; no role is a pass through device |
| `activities[].screen[]` | optional, the working screen's items in order: `{ device, command }`, a command by the label the device's own screen draws it under, or `{ sequence, steps }` |
| `...screen[].steps[]` | `{ device, scan }`, the command that device's key sends, by the key's scan code (`reference/remotes/harmony-650/keys.md`), or `{ pause }` in tenths of a second |
| `choices` | optional, the family's choices over its defaults; the family refuses one it does not make |

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
| `choices` | none | **gap**: the look and the settings; `RemoteContent.language` is the start of it, and the words are a choice once a configuration is built rather than patched |

So FreeHarmony can produce a recipe once it holds three things it does not: the catalogue entry behind a
device, the keep on flag, and a pass through device in an activity; plus the choices, which have no
editor there yet. The differences are a converter's.
