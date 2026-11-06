# Harmony Touch: activities and button maps

What a Harmony Touch does with its activities and its button maps: how an activity starts, switches and
stops, how a key press or a tap on the screen becomes a command, what a long press, a sequence, a gesture
and the number pad do, and which fields of Logitech's documents nothing on the remote reads. What an
activity and device mode are for the person holding a remote is
[how a Harmony works](../../how-a-harmony-works.md); the entities themselves, as Logitech's schema defines
them, are [the data model](../../logitech/data-model/model.md) and its
[entity listing](../../logitech/data-model/entities.md). What the keys and the screen look like is the model's
own folder, [harmony-touch](../../remotes/harmony-touch/README.md).

**The scope is one firmware build and one synced set of documents.** Everything read in the firmware was read
in the Touch's production image 4.15.330, and everything measured was measured in the documents one sync
handed a Touch[^t-touch-activities]. The image is shared with the other remotes of the generation, but the
screens are chosen per skin: the Touch, skin 99, runs one set of screens and skins 111 and 112 run
another[^t-touch-activities-firmware]. Nothing here is checked on another build or another model.

**"Read in the firmware" on this page means read in the decompiled engine or in the screens' source.** The
test behind that footnote holds what the image shows directly, the names, numbers and screens it carries, and
its header says which reading each statement rests on; a statement it cannot hold is listed under Not checked
as held by no test.

## Two documents, and two programs that read them

A Touch is not given a compiled configuration. It fetches JSON documents through the computer, and two of
them describe what this page is about: `ActivityList`, the activities, and `MapList`, the button maps, one
per device and one per activity, [the platform on the cable](usb.md). A map is the whole of what the keys,
the screen entries and the gestures do in that device's mode or that activity, which is the
[two maps of one keypad](../../how-a-harmony-works.md#a-button-map-belongs-to-a-device-first) every
Harmony has.

**Two programs on the remote read them, and they read them differently**[^t-touch-activities-firmware]:

* **the engine**, compiled Lua, parses both documents once into tables of its own and sends the commands;
* **the screens**, Lua source, read the documents themselves, decide what to show and what a touch means,
  and then ask the engine to press a button, naming the map and the button.

So a field can matter to one of them and not the other, and several do: the label on a screen entry, its
icon and whether it is hidden are the screens' alone, and the engine never sees them.

## How a key press becomes a command

1. **A few keys never reach a map.** Home, Favorites and Off are handled by the screens: Home and Favorites
   open their screens, and Off asks the engine to end the running activity. **With no activity running and
   no device chosen in device mode, every other key does nothing**[^t-touch-activities-firmware].
2. **The screens filter first.** A key is sent only if the current map, the activity's or in device mode the
   device's, holds it; a key the map does not hold is dropped on the remote before the engine sees
   it[^t-touch-activities-firmware].
3. **The request names a map and a button.** The map is `16417Device<device>` in device mode and
   `16417Activity<activity>` while an activity runs, `16417` being the identifier the Touch's screens send
   with every press; the button is a key's name or a screen entry's place in its
   list[^t-touch-activities-firmware].
4. **The engine finds the map by that identifier and nothing else.** If no loaded map has exactly that
   identifier the press does nothing: the engine's retry without the `16417` prefix comes after a return and is
   never reached. The screens' own lookup, which finds a map in the document to draw its lists, is a different
   piece of code and does accept the identifier with or without the prefix[^t-touch-activities-firmware]. Every map in the documents measured carries exactly that form,
   twelve of twelve, one device map per device and one activity map per activity, and no root
   map[^t-touch-activities]; without one the engine makes a root map of its own that holds only
   Off[^t-touch-activities-firmware].
5. **The button's action names the device the command goes to**, in device mode too: the map's own device
   plays no part. A command action names a command by name, matched without regard to case against the
   device's commands[^t-touch-activities-firmware]. In the documents measured every command action of a device
   map names that map's device, the six that do not being number pad openers with no device, every command
   action of an activity map names a device of that activity, and every command named is one the device
   has[^t-touch-activities]. **Measured on a unit, device mode sends what the device's own map binds**: each
   device chosen from the device list with no activity running, every key of its own map tapped and every long
   press held sent that map's command to that device, 156 codes over the six devices whose map binds a key; and
   every key of each activity's map sent what that map binds, a command to the device it names or a sequence's
   commands, 141 codes over five activities[^t-touch-in-use].

**A screen entry deleted on the remote stays in the document, marked `ButtonState` 4.** The screens hide an
entry so marked from their lists; the engine does not read the mark at all, and the screens' key filter does
not either, so a key marked 4 would still send[^t-touch-activities-firmware]. The remote writes four values of
`ButtonState` itself: 1 on a button it builds, a new gesture or a sequence being picked for a list, 2 for one
added to a list, 3 for one changed or moved and 4 for one removed, and several of its screens hide an entry
at 4[^t-touch-activities-firmware]. An entry added on the remote and then removed is taken out of the document
instead[^t-touch-activities-firmware].

## Holding a key, and the long press

**A key with a long press sends nothing when it goes down.** The long press fires on the first hold report at
least 550 ms after the press, about 600 ms in practice, since a held key is reported every 300 ms; a release
before that sends the short action once[^t-touch-activities-firmware]. **A key with no long press keeps
sending while held**: each hold goes to the infrared sender as a heartbeat[^t-touch-activities-firmware]. A button holding only a long press action is treated as if that
were its short action[^t-touch-activities-firmware].

In the documents measured, 42 buttons carry a long press, 32 keys and 10 gestures, and no screen entry
carries one[^t-touch-activities]. **On a unit, every long press of those keys did what this says**: held about a
second, each sent its long press command and not its short one, 32 long presses across five activities' maps and
six devices' own maps, and each key tapped sent its short command alone; two long presses and one tap were not
heard on the first try and were on a second[^t-touch-in-use]. When the long press fires after the press is
not measured, since the receiver hears codes and not presses[^unchecked]. The Touch's long press is the one
[how a Harmony works](../../how-a-harmony-works.md#holding-a-key-is-two-mechanisms-and-a-repeat-and-a-long-press-exclude-each-other)
describes as a property of the button, and this is the firmware choosing between the two.

**A double press is read by the engine and used only for home control rocker keys**; a double tap on a
gesture is the screens' doing, below[^t-touch-activities-firmware].

## Screen entries and the number pad

**A screen entry is named by `MenuItem.IndexInMenu`**, which is also its place in the list: the screens show
entry `IndexInMenu + 1` and the engine takes the press by the same number[^t-touch-activities-firmware]. A key
is named by `ButtonKey`; the Touch's documents use 26 names, [its keys](../../remotes/harmony-touch/keys.md).
**`TextOnRemote` is the label it shows**, and the engine never reads it[^t-touch-activities-firmware]. Three
labels act by themselves: `123` opens the number pad, `Gesturepad` the gesture screen and `Disconnect Wii`
disconnects a Wii[^t-touch-activities-firmware]. A list entry's icon is the picture the screens carry for its
command's function id, when they carry one[^t-touch-activities-firmware].

**The number pad is `FunctionGroupType` 2.** Entries of that group are kept apart from the list in the engine,
hidden from the lists on the screen and drawn on the number pad screen, which places each by its command's
name: the digits on their keys, `-`, `.`, `*` and `NumberPlus` on the key left of 0, and `Enter`,
`NumberEnter`, `#` and `ENT` on the key right of it[^t-touch-activities-firmware]. A command of any other name
is placed on no key, which is where the two `Clear` entries measured end up[^t-touch-activities]. The number
pad sends each tap as one request with no hold reports after it[^t-touch-activities-firmware].

**Two traps in `IndexInMenu`**, both met in Logitech's own documents:

* **The number pad's entries count from 0 in the same map as the list's**, so one index names a list entry
  and a number pad entry at once and only the group tells them apart. Ten of the twelve maps measured do
  this[^t-touch-activities].
* **A second group shares the list's numbering.** Six of the seven device maps measured hold one entry of
  `FunctionGroupType` 36 beside the list's group 0, on an index no group 0 entry holds. Counted with both groups,
  every device list measured starts at 0; group 0 alone starts at 1 on five of the seven[^t-touch-compose].
* **An index can repeat.** Two of the seven device maps measured hold two list entries on one index, each
  with one index missing from its list[^t-touch-activities]. The engine and the screens both keep the later
  of the two, so **the earlier entry is on neither the screen nor in the engine's
  table**[^t-touch-activities-firmware]. One look at one unit's screens after a sync, by the person holding
  it, found neither of the two entries hidden this way on its device's screen; the test holds the repeated
  positions and its header records that look[^t-touch-activities].

## Gestures

**A gesture does not run its own entry.** For a command, the gesture screen looks in the device mode map of
the device the command names for the first button with the same function id, or with no function id the same
command or key name, and presses that button in device mode[^t-touch-activities-firmware]. So a gesture sends
whatever that device's own map holds for the function. Holding a gesture uses its long press action and falls
back to its short one, and a double tap uses its double press action[^t-touch-activities-firmware]. In the
documents measured, all 34 gesture actions find a device button with the same command this
way[^t-touch-activities].

The documents measured put five gestures, SwipeUp, SwipeDown, SwipeLeft, SwipeRight and Tap, on each activity
except the one of the Custom type, and none on a device map[^t-touch-activities]. Whether that is Logitech's
rule is not checked[^unchecked]. How the screen tells a swipe, a held touch and a double tap apart is
[the model's display page](../../remotes/harmony-touch/display.md#gestures).

## Sequences

**A sequence belongs to a map**: its steps are a list of commands and delays ordered by `Order`, and a button
runs it by `SequenceId`[^t-touch-activities-firmware]. The engine sends it as one list and the screens send no
release for it, so it runs to its end however briefly the key is pressed[^t-touch-activities-firmware]. **A
delay's `Duration` is in seconds**: the two readers of a delay, a sequence's and an activity's, multiply it by
1000[^t-touch-activities-firmware], and a delay entered in Logitech's client arrives in whole
seconds[^t-touch-activities]. In the documents measured no device map holds a sequence[^t-touch-activities]. A
step of any kind other than a command or a delay is skipped, and a step without an
`Order` stops the reader[^t-touch-activities-firmware].

**A delay step is a pause of `Duration` seconds between the commands either side of it**, measured on a unit as
the silence between their infrared codes. In a sequence of a Blu-ray player's Stop, a delay and its TopMenu, the
silence before TopMenu was 1192 and 1133 ms with `Duration` at 1, and 3144 and 3149 ms at 3; changing 1 to 3
added between 1952 and 2017 ms, press by press, and putting it back to 1 brought the silence back to 1132 and
1138 ms[^t-touch-changed-set]. The silence is longer than the delay by 133 to 192 ms at either
setting; what that remainder is made of is not checked[^unchecked].

## An activity: what it is made of

An activity is its roles, which name its devices, their power order and their inputs, and two lists of steps
added by hand, `EnterActions` at the start and `LeaveActions` at the end.

* **The first role naming a device makes that device's power on step and its input step**; a further role of
  the same device adds only its role name[^t-touch-activities-firmware]. Every role's power off order is still
  recorded, so two roles of one device with different power off orders would switch it off
  twice[^t-touch-activities-firmware]. In the documents measured, three devices hold two roles in an activity
  and in each the roles agree[^t-touch-activities].
* **`PowerOnOrder` and `PowerOffOrder` are stored as keys**: each power step is kept under its number and the
  steps run in ascending order, so two devices of one activity with the same number keep only one
  step[^t-touch-activities-firmware]. In the documents measured no two devices of an activity share a
  number[^t-touch-activities].
* **`NextDevicePowerOnDelay`**, when a number, is a wait after that device's power on, passed on without the
  multiplication the two `Duration` fields get, so its unit is not theirs[^t-touch-activities-firmware]. It is
  null on every role measured[^t-touch-activities].
* **`SelectedInput.Name` is the input the device is switched to**, and a name that is not one of the device's
  inputs is skipped without a word[^t-touch-activities-firmware]. Every selected input measured names one of its
  device's inputs[^t-touch-activities]. `SelectedInput.ChannelNumber`, when set, adds a channel step after the
  input[^t-touch-activities-firmware].
* **What a role's kind does.** `ChannelChangingActivityRole` is the device channels are tuned through, for
  the favourite channels and an activity's default channel; `VolumeActivityRole` decides where the volume keys
  go; the play, media, movie and channel roles are the gesture screen's play and pause target by the
  activity's type; a smart TV role adds an input step of its own. `DisplayActivityRole` and
  `PassThroughActivityRole` do nothing beyond the power and input step of their
  device[^t-touch-activities-firmware].
* **`EnterActions` and `LeaveActions` hold the steps added by hand**, a command, a channel or a delay each,
  run in `ActionOrder`; an action without an `ActionOrder` stops the reader[^t-touch-activities-firmware]. A
  `DelayActivityAction`'s `Duration` is in seconds, as a sequence's is[^t-touch-activities-firmware]. All three
  kinds are stored on the activity as Logitech's client saves them[^t-touch-activities].

**`Type` is the activity kind the Touch acts on, and `ActivityGroup` is not.** `Type` picks the default
picture, the gesture screen's play and pause target, and the paths for Roku, Sonos and speaker
activities[^t-touch-activities-firmware]; its numbers are the positions of Logitech's `ActivityType`, 5 being
`Custom`, and `SuggestedDisplay` is that position's name on every activity measured[^t-touch-activities].
`ActivityGroup` is not `Type`: they differ on three of the five activities measured[^t-touch-activities]. The
engine only copies the group's name into the answer
it gives other clients; an activity without one makes the reader fail[^t-touch-activities-firmware].

The other fields the remote uses:

| field | what the Touch does with it |
|---|---|
| `Name` | the activity's name on the list and above its screens |
| `ActivityOrder` | its place on the activity list, entry `ActivityOrder + 1`; a negative order hides the activity, and of two with the same order only the later shows |
| `StartScreen` | the screen it opens on: Favorites if it has favourites, Numpad if its map has number pad entries, Trackpad, Gesturepad, Nowplaying if it has speakers, otherwise the command list |
| `IsTuningDefault` | which activity the favourite channels belong to, tuned through its channel changing role, and whether Favorites is offered as its start screen |
| `DefaultChannel` | when set, a channel tuned after the start, through the channel changing device |
| `ImageKey`, `BaseImageUri` | a picture of the activity's own; with no key, the default picture for its `Type` |
| `IsMultiZone`, `Zones` | which devices of a multi zone activity are switched with it |
| `Alternatives` | when set, marks the activity for the guided or manual help |

All of those are read in the firmware[^t-touch-activities-firmware]. Exactly one activity measured is the
tuning default, and it holds one channel changing role[^t-touch-activities].

**`Zones` is in every activity and is not in Logitech's schema**: the schema's `Activity` entity lists 25
fields, and every activity measured carries those 25 and `Zones`[^t-touch-activities].

## Starting, switching and stopping

When an activity starts while another runs, the engine works through the old and the new activity in this
order[^t-touch-activities-firmware]:

1. **The new activity's power on steps** are collected in power on order, each followed by its device's own
   power on delay where the role states one.
2. **The old activity's end steps that are not power offs are sent first, before anything else**, as a list of
   their own. So an end step added by hand runs whether the next activity is another one or Off. The power
   offs of devices on two of the engine's transports that are not infrared, numbered 8 and 32 in it, go into
   that first list as well.
3. **The old activity's power offs are appended after the new power ons**, skipping every device the new
   activity powers and every device kept on between activities. So the new activity's devices come on before
   the old ones go off.
4. **The new activity's input steps** follow.
5. **Steps 1, 3 and 4 run through one scheduler**: while power commands remain, a device still in its power
   on delay holds everything back; after them, a device in its delay is passed over and later commands for
   other devices go ahead, so input steps can run out of order across devices.
6. **The new activity's start steps**, in `ActionOrder`, then any home automation scene.
7. **The channel**, the default or the one asked for, through the channel changing device.

**Off is an activity the engine makes itself** at load, with a power off step for every device; it is not in
the document. Ending an activity sends its end steps the same way and then switches off every device still
on[^t-touch-activities-firmware].

**The order is measured on a unit with an infrared receiver**, for one set of documents of five activities and
seven devices: each activity started with every device off and ended by Off, and the five started one after
another, each while the one before ran, sent every code in the order above, 68 expected codes in all, and
nothing out of it[^t-touch-in-use]. Among them: the new activity's power ons before the old activity's power
offs; an end step added by hand, a mute, sent first on leaving its activity, for a switch and for Off alike; a
receiver kept on between activities left on by every switch and switched off only by Off; a device two
activities share neither switched off nor on again; a device whose power steps sent its toggle only when the
engine held it in the other state; and an input sent before an earlier one in role order while that one's device
was still in its power on delay[^t-touch-in-use]. **Every pause the engine times lay in the band its stated
delays give, widened by 150 ms for the engine's own time, but two**, and those two followed a code held for its
`Duration` of 2 seconds: the next device's code came 427 and 472 ms later than the held time and that device's
inter device delay add up to, where every pause after a code that is not held fits 0 to 210 ms of the engine's
own time per send, give or take those 150 ms[^t-touch-in-use]. The held code itself lasted 1.8 to 2.2 seconds on
the receiver over six holds[^t-touch-in-use]; what the time after it is made of is not checked[^unchecked].

## What a writer must carry

**The screens change these documents and send them back whole.** Reordering activities, choosing a start
screen or a picture and changing an input rewrite `ActivityList`; editing a command list or a gesture rewrites
`MapList`; and each goes up as the whole document[^t-touch-activities-firmware], as the remote's settings were
measured to[^t-touch-both-ways]. So every field below, though nothing on the remote reads it, comes back as it
went down, and a writer that drops one has changed what Logitech's service holds. Uploading these two
documents has not been measured[^unchecked].

**Read by neither program**[^t-touch-activities-firmware]:

| where | fields |
|---|---|
| an activity | `AccountId-`, `State`, `IsDefault`, `DateCreated`, `DateModified`, `DefaultStation`, `DefaultStationName`; `ActivityDisplayName`, `Icon` and `SuggestedDisplay` only go into the engine's answer to other clients |
| a role | `Id-`, `SelectedInput.Id-` |
| a step added by hand | `Id` |
| a map | `ButtonMapId`, `ButtonMapId-`, `ButtonMapSurfaceId-`, `SurfaceId-`, `RemoteId-`, `DateModified`; `DeviceId-` and `ActivityId-` are stored by the engine and never used |
| a button | `ImageId`, `ImageId-` |
| a command action | `EventType` (but below), `Id`, `Order` |

**Not read by the engine, and handled by the screens alone**[^t-touch-activities-firmware]:

| field | what the screens do with it |
|---|---|
| `ButtonState` | write 1 to 4 and hide an entry at 4, above |
| `ButtonId` | keep it when an edit replaces an entry |
| `MenuItem.MenuName` | write it on an entry they create, and read it nowhere |
| `ButtonImageKey` | write it on a gesture they create or change, and read it nowhere |
| `ButtonImagePath` | test it before drawing an entry's icon; the test compares against the wrong thing and is always false, so the field never takes effect. Read in the screens' source and held by no test |

**`EventType` is read on two kinds of action only**: on a home control or a program action the engine takes 1
as a short, 2 as a long and 3 as a double press, and on every other action it reads nothing[^t-touch-activities-firmware].

Of those names, `DateCreated`, `DateModified`, `DefaultStation`, `SurfaceId-`, `RemoteId-`, `ButtonMapId-` and
`ImageId-` occur in no program of the image at all, only in the sample documents the screens carry;
`IsDefault` is named in no Lua file of either program, a font library being the only other file that holds
the string, and `ImageId` in none of the screens' files, the engine holding it only inside the name of a
function about picture addresses; and the engine's files name none of `ButtonState`, `TextOnRemote`,
`MenuName`, `ButtonImageKey` and `ButtonImagePath`[^t-touch-activities-firmware]. The rest are names a search
for bytes cannot settle, and rest on the reading.

**`ButtonState` comes per map in the documents as synced down**, before the remote writes any of its own:
every button of three maps is 1, `Original` in Logitech's enumeration, and every button of the other nine is
0, `Default`; the three are exactly the maps that carry `ButtonMapId-`, and only their buttons carry a
`ButtonId`[^t-touch-activities]. What makes Logitech's
service mark a map so is not checked[^unchecked].

**A button action of the client, channel or bookmark kind sends nothing from the engine**: a button whose
short action yields no step is left out of the engine's tables. The screens act on a client action
themselves, `Numpad` opening the number pad[^t-touch-activities-firmware].

## Not checked

* That a heartbeat is what keeps the infrared code repeating: the sender is a native program and was not
  read[^unchecked].
* The long press's timing on a remote, which is read and not measured: the infrared receiver hears the code and
  not the press[^unchecked].
* *Corrected:* this said the start and switch order on a remote was "read and not measured with an infrared
  receiver"<!--superseded-->; it is measured for one set of documents, [above](#starting-switching-and-stopping).
  Which transports the engine's 8 and 32 are is still not checked[^unchecked].
* What the remote does with a document that breaks a rule above, a shared power on order, a missing
  `ActionOrder` or a missing `ActivityGroup`, beyond the reader's own failure[^unchecked].
* Whether an entry deleted on the remote, kept under its old index, can share that index with a live entry
  renumbered after it, and which of the two the engine then sends[^unchecked].
* Whether an edit made on the remote uploads a map without the entry a repeated index hid[^unchecked].
* What makes Logitech's service mark a map's buttons 1, and why the client numbers start steps as it
  does[^unchecked].
* **Held by no test, read only in the decompiled engine or the screens' source**: the seven step start and
  switch order and its scheduler as a reading, which what a unit sends agrees with above; Off being an activity the engine makes at load; the start screen rules;
  `ActivityOrder` hiding an activity when negative and keeping the later of two equal ones; the reader
  stopping on a sequence step without `Order` or an action without `ActionOrder`; the engine's transports 8
  and 32 going into the first list; a key marked 4 still sending, which the documents measured never
  hold[^unchecked].
* Whether Logitech's service always leaves a Custom activity without gestures[^unchecked].
* The roles, steps and paths for Sonos, Roku, speakers, home control and multi zone activities, which the
  documents measured do not hold[^unchecked].
* Any other firmware build, and the other remotes of the generation[^unchecked].

[^t-touch-activities]: Measured on a unit. [The test](../../../packages/usb/test/touch-activities.test.ts)
[^t-touch-activities-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_activities.py)
[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^unchecked]: Not checked.
[^t-touch-compose]: Measured on a unit. [The test](../../../packages/codec/test/touch-compose.test.ts)
[^t-touch-changed-set]: Measured on a unit. [The test](../../../packages/usb/test/touch-changed-set-sync.test.ts)
[^t-touch-in-use]: Measured on a unit. [The test](../../../packages/bench/test/touch71-runs.test.ts)
