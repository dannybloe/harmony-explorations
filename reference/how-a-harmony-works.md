# How a Harmony works

A Harmony is a universal remote control. It replaces the pile of remotes that came with a television, a
set top box, an amplifier and whatever else sits under the screen, and it does that in two ways. It can
run an **activity**, such as "Watch TV", which switches the right equipment on and lets one keypad drive all
of it at once. And it can be pointed at **one device**, the television alone, which makes it behave like
that device's own remote. Everything a person does with a Harmony is one of those two, and this page is
about both, as somebody holding the remote meets them.

A Harmony is set up on a computer, in Logitech's software, and the result is sent to the remote over USB
as a **configuration**: a file that says what every key and every screen does. The other parts of this
reference are about that file, the remote's firmware and the USB conversation. This page comes first
because the file cannot tell you what the product is for: it holds what the remote will do, not why a
person wants it. Each section opens with what a person sees and gets more technical towards its end.

## The two things a Harmony can be doing

**An activity.** "Watch TV", "Listen to Music". Pressing it switches the right devices on, sets their
inputs, and gives the keypad a map that spans several devices at once: volume to the amplifier, channels
to the set top box, play and pause to whatever is playing. That is the point of a Harmony.

**Device mode.** Press **Devices** and the screen lists the devices. Pick the television and every button
on the remote now drives the television and nothing else. In Logitech's words, for the Harmony One:
"After you select a device, the Harmony One controls only that device. You have access to all the
commands for the device system."[^x-one-manual] The Harmony 885's manual gives the example: "If you choose
Television as the device, the number, volume and channel buttons will all control your television."[^s151]

A useful picture of device mode: it is like reaching for the old remote that came in the box with that
device. There is nothing but that device on it. You cannot reach the amplifier from the television's old
remote, because it has no amplifier on it.

Both map the whole keypad. Neither is a special case of the other, and **they are two separate maps of
the same keys, authored separately**. Logitech's software has a page for each, "Changing how buttons work
for a device" and "Changing how buttons work in an Activity"[^s151]. In an activity any key may carry any
command of any device the person owns; in a device's map there is one device, so two devices holding the
same key is not a conflict at all.

## Getting into device mode and back

Every model has device mode, and each gets in and out differently. The way in, the way back and the words
on the screen are on each model's behaviour page: the [Harmony 525](remotes/harmony-525/behaviour.md),
[600](remotes/harmony-600/behaviour.md), [650](remotes/harmony-650/behaviour.md),
[700](remotes/harmony-700/behaviour.md), [885](remotes/harmony-885/behaviour.md),
[One](remotes/harmony-one/behaviour.md), [Touch](remotes/harmony-touch/behaviour.md) and, with no screen,
the [300](remotes/harmony-300/behaviour.md) and [350](remotes/harmony-350/behaviour.md), whose device keys
are device mode.

Two differences are worth knowing before drawing or describing any of them:

* **The Harmony 600, 650 and 700 have no Devices key.** The screen writes "Devices" above the centre key
  of the three below the display, and the manual's table of buttons lists every key with none called
  Devices[^x-manual-600][^x-manual-650]. A drawing of these remotes has no such key.
* **The words differ per model.** "Current Activity", the way back on a Harmony One while an activity
  runs, is that model's wording and not the product's: the 600 writes "Activity", the 525 has an
  Activities key, and on an 885 the same key that entered device mode leaves it[^s151].

## Device mode is not a corner of the product

It is how a person reaches a command that is not on the running activity's map, and most commands are
not: an activity binds the thirty or so buttons that make sense while watching television, and a
television answers to a hundred and more. So the ordinary use goes like this: an activity is running,
the person wants a picture setting of the television that no button in the activity sends, switches to
the television in device mode, presses it there, and switches back.

**The screen is the bigger half of device mode.** An old remote has far more buttons than a Harmony, so
what people build in device mode is **pages on the screen**: a screenful of commands at a time, for the
functions the keypad has no room for. Those would never fit an activity's keypad map, and they are not
meant to, since an activity carries what is used often. A device's screen pages and its keypad map are
comparable in size, and which is larger varies from one configuration to the next, [Modes and
keys](config-format/modes-and-keys.md#a-devices-mode-is-device-modes-keypad-map)[^s271].

**Logitech advises against needing it.** The 885's manual says "you should never need to use Device mode
during normal use of your Harmony remote", and that "you can eliminate the use of device mode by
customizing your Activities", by putting the command on the display or on a button[^s151]. Both are worth
knowing: the advice is how Logitech meant activities to be used, and device mode is where a device's rare
functions live, on its screen pages, without walking to the cupboard for the old remote.

## A button map belongs to a device first

Logitech's software is authored that way: a device's commands are given to buttons, and an activity then
draws on several devices' maps at once and overrides some keys of its own. Logitech's own schema says the
same: its platform has an abstract button map with exactly **three subclasses**, one keyed by a device,
one keyed by an activity and one keyed by neither[^t-model]. So the two maps are two types in the
vendor's model, sharing a base and distinguished by what they hang off. That schema is for a later
generation of hardware than the remotes this reference describes, so it is evidence about the product's
design and not about what a configuration contains; [Logitech's data
model](logitech/data-model/model.md) has the detail.

A configuration shows the same thing from the other side. Nearly every pair of a device and a key sends
the same command in every activity that binds it, so an activity's map reads as the device's map plus
that activity's own overrides, an amplifier's input selection being the typical one. And a device's own
map, the one device mode uses, is stated in the file per device. Both counts are in [Modes and
keys](config-format/modes-and-keys.md#a-set-is-one-activitys-keypad-map)[^s151b][^s271].

Two consequences, and they belong to different screens of any editor:

* **A page about a device shows that one device and mentions no activity.** Not which activity uses a
  key, not which other device holds it, not where a change will land. Inside one device's map there is
  one device, so a key sends one of its commands or nothing, and a change is one binding.
* **A page about an activity is where the rest lives.** There a key may carry any device's command, so a
  change has to reach the whole activity, and the buttons other devices already hold are the real
  constraint. Of 1105 pairs of a device and a button over fifteen configurations, 131 have another device
  holding that button in at least one activity that uses this one; on one Harmony One's receiver, 3 of
  its 35 buttons are its own in all eight activities that use it[^s151b]. That constraint belongs to the
  activity editor and not to the device one.

## Sequences

One button can send several commands in a row, with a pause between them where the equipment needs one.
Logitech calls it a sequence and most people would call it a macro: press one key and the remote sends
channel two, zero, zero, then red, then red again.

**A sequence belongs to an activity and not to a device.** In Logitech's software a sequence is authored
inside an activity and bound to a key or a button on that activity's screen[^s327]. There is no sequence
that belongs to a television, and so none to reach from device mode. A configuration cannot say this: it
holds an ordered list of commands on a button and nothing about where the software offered it, so every
configuration would read the same either way.

**It draws only on the activity's own devices.** Logitech's editor offers the devices the activity uses
and no others[^unchecked], and a pause the compiler writes names exactly those devices, in the order the
activity switches them on[^s327b].

### What a sequence is allowed to be: 25 steps and 20 seconds

Logitech's editor allows at most **25 steps**, each a command or a pause in whole seconds[^s327], and a
pause of at most **20 seconds**[^unchecked]. The 25 counts pauses as steps: a sequence of 25 holds, for
example, 21 commands and 4 pauses[^s327].

**A pause holds the whole activity, not only the next command's device.** While a pause runs, a key
pressed in the activity is sent when the pause ends, seen on a Harmony 650 with a volume key pressed
during a 20 second pause[^s342]. How a pause is written, a delay in tenths of a second for every device
of the activity, is [Actions](config-format/actions.md#a-sequence-is-one-action-list-of-calls-and-per-device-pauses).

**Logitech's own maximum is not a safe bound.** A sequence of 25 steps hung a Harmony One for good when
its touch panel was tapped heavily while it ran, three times out of three, the batteries coming out each
time[^s238]. Why is not established: that sequence fills 35 of the forty places in the queue the remote
runs it from, so it did not overflow it[^s238b]. What is established is that the queue drops in silence
whatever does not fit, and that 25 steps can overflow it: 11 commands and 14 pauses on a three device
activity is 53 instructions, inside Logitech's limit and past the forty[^s327b]. The queue and its depth
are [Actions](config-format/actions.md#the-action-queue-holds-forty-instructions).

## A command appears once on an activity's screen

A sequence, and any other command, may appear only once on the screen of an activity, counting all of
that activity's pages together. The television's mute cannot go on page one and again on page three:
Logitech's software refuses the same command or sequence on a second button of the screen[^unchecked].

**It is the screen's rule only.** On the keypad the same command may go on as many keys as wanted within
one activity. Counted over the configurations this reference draws on, the contrast is stark, and it is
the rule showing through, since an absence on one surface beside plenty on the other is not what people
happen to build[^unchecked]:

| | two bindings sending the same thing |
|---|---|
| screen pages | **0** of 1319 |
| keypad maps | **20** of 44 |

A send here is the whole ordered list a button sends, so a sequence counts as one thing. Across all of one
Harmony One configuration's pages, 39 of 110 distinct sends repeat, so the rule cannot mean "once anywhere
on the remote"; an activity is what that leaves[^unchecked]. The count per activity, which would show it
directly, has not been made[^unchecked].

An editor holds this rule when a command is offered for a screen page: it refuses one that already sits
on another page of the same activity, and says where it is.

## What the screen does, and what it does not

The screen is a second set of keys: on a device's page the screen shows that device's commands, four at
a time on a Harmony 650 paged with the arrows[^s285] and on the touch panel of a Harmony
One[^x-one-manual]. The screen's keys and the keypad's are separate: they share no key code on the Harmony
525, One, 600 and 700, and exactly one on the Harmony 880 and 885[^s128]. So "the buttons of a device" is
two questions, the keypad's and the screen's, and an interface keeps them apart.

**The Harmony 600, 650 and 700 show no clock.** Their ordinary screen has no time on it: the manual's
account of the screen names none[^x-manual-650], and their configurations hold no timer that would redraw
one[^s430]. They keep a clock in memory all the same[^s283][^s386], so a wrong clock is invisible on the
remote and is checked by reading its memory over USB, never by looking at it;
[the Harmony 650's display](remotes/harmony-650/display.md#what-the-screen-does-not-show). The Harmony One
does show the time, [its display](remotes/harmony-one/display.md#the-clock-and-the-strip-along-the-top).

**A Harmony One's screen has four keys around it that are not part of the picture**, two beside it that
turn the pages and two below it labelled by whatever the screen draws above them, and a command touched on
its screen clicks and often waits a moment before it is sent. Both are that model's own,
[keys](remotes/harmony-one/keys.md#the-two-keys-below-the-screen-and-the-page-strips) and
[behaviour](remotes/harmony-one/behaviour.md#screen-commands-click-and-wait-and-a-held-touch-repeats).

## A favourite channel is a screen button, and the channel is text

A favourite channel is a thing a person keeps, with a name and a picture if wanted, and it shows up as a
button on the screen. In Logitech's records favourites sit in a menu of their own, and each button names
the device it tunes, where a device's commands take their device from the menu they are in;
[Logitech's service](logitech/service.md#button-maps)[^t-model].

**Favourites are kept per device and shown per activity.** Logitech's software has a page of favourite
channels per device[^s344b]. An activity has one device that changes its channels, or none, and shows that
device's favourites on a page of their own, reached from a "Favorite Channels" button among its commands.
A device's favourites reach the remote only through an activity that uses it for channels: on a Harmony
650 the favourites of a television that changed no activity's channels were not in the configuration at
all, until an activity was added in which it did[^s344].

**A favourite does what a sequence does.** Tuning to channel 100 is sending one, zero and zero, and a
sequence on a button does the same; what a sequence cannot do is carry a picture.

**The channel is stored as text, and that is not a detail.** Channel 1 and channel 001 are different
channels on a real set top box, and a configuration takes two different roads for them: a number that
survives being written as an integer goes through one mechanism, and one with a leading zero is spelled
out one digit at a time[^s156], [the number sender](config-format/state.md#base-slot-16-the-number-sender).
So anything that treats a channel as a number loses a channel somebody can tune to.

**In a configuration a favourite is four structures and none of them is a keypad map**, and nothing in any
of them says a channel was typed, so a favourite can be written and cannot be read back as one[^s154].

## Holding a key is two mechanisms, and a repeat and a long press exclude each other

Three behaviours are visible: a key that does nothing more when held, a key that keeps firing while held,
and a key that does something **different** when held. That is three behaviours and two mechanisms.

**Repeating is a property of the command**, not of the key. A held key sends the held part of the
command's code for as long as it is down, so the interval a person feels is that part's own length,
per code: from 30.8 to 752 milliseconds across the configurations read, most between 60 and
120[^s127]. One device can have a volume command that repeats and a power command that does not, and no
keypad map states either; [Infrared records](config-format/infrared-records.md#once-held-and-tail). On a
Harmony One a command held on the screen repeats the same way[^s337].

**A long press is a property of the button.** Logitech's own button record carries three actions, a
press, a long press and a double press, so the second is chosen by how long the key is held and belongs
to the button rather than to any command[^t-model].

**The two cannot share a key.** A remote that has to choose between two actions must wait to learn which
was meant, and a key that is waiting cannot also be repeating[^unchecked]. So the third behaviour is not a
third kind of key: it is a key whose long press has taken its repeat away.

**Which models have a long press** is a list Logitech's service states,
[the remotes index](remotes/README.md#a-long-press). Of the models in this reference only the Harmony 350
declares it; the Harmony One, 600, 650, 700 and 300 do not[^t-capabilities]. The Harmony 650's firmware
agrees: a key raises press, repeat and release and nothing else, and only the Help key waits longer before
its repeat[^s340]. On the 350 the long press is on its device keys, a second device per key,
[its behaviour page](remotes/harmony-350/behaviour.md).

## A remote with no screen holds exactly one activity

The Harmony 300 and 350 have no screen, and each holds one activity, started by its Watch TV key,
[the 300](remotes/harmony-300/behaviour.md) and [the 350](remotes/harmony-350/behaviour.md). Every model
with a screen holds several. Asked to copy seven activities into seventeen models' records, Logitech's
service accepted seven on every model with a screen and one on the 300, the 350 and the 200, the three
without one[^unchecked].

Logitech's product records state it in their own terms. The 350's record carries a maximum of one
activity and the capability `Activities`; the 300's carries no maximum and, in place of `Activities`, only
`PartiallySetupActivities`, the vendor's name for its kind of activity; the models with a screen declare
both[^t-capabilities]. So the screen is what buys a remote more than one activity. The family's page is
[the Harmony 300 and 350](architectures/harmony-300-350/README.md).

## Help belongs to what is running, never to a device

**Help is not a device's feature.** It belongs to the running activity, or to the state in which nothing
is running, and a device page has none of its own.

* **In an activity**, Help tries to put that activity right: it resends the activity's power and input
  commands and then asks, device by device, whether each one is right. Held for five seconds it opens
  advanced help, where a device's delays are adjusted[^x-manual-600].
* **With nothing running**, Help makes sure everything is off: it resends power off to the devices and
  asks "Did that fix the problem?".
* **On a device page**, the press is not the device's. A device page binds no Help key, so the press goes
  to whatever is running underneath: the activity's Help in an activity, the off one when nothing runs.
  The Help key's own "Select device" screen is a further list of devices, reached only from Help,
  [the compiler page](architectures/harmony-600-650-700/compiler.md).

The evidence is on the Harmony 600, 650 and 700, and **not checked on any other model**. On thirteen of
Logitech's configurations for them every activity and the nothing running state bind Help, and none of 83
device modes does[^s333]; the firmware's key walk sends a press from a device page down to the running
entry[^s333b]. On a Harmony 650, Help on a device page with nothing running resent power off to the
devices and then asked "Did that fix the problem?", as that predicts[^s335]. Help pressed on a device page
**while an activity runs** is predicted and not yet seen[^unchecked].

## Not checked

* Whether every difference between a device's own map and the activities' maps is a deliberate override:
  there are 136 keys where every activity agrees with the others and disagrees with the device's own
  map[^s271].
* The once per screen rule counted per activity rather than per page[^unchecked].
* Whether a long press on a Harmony One's screen takes as long as one on a key[^unchecked].

[^x-one-manual]: Stated by Logitech, in the manual. [The Harmony One user guide](https://secure.logitech.com/assets/44645/13/harmonyone-user-guide.pdf)
[^s151]: Stated by Logitech, in the manual. [Section 151](../docs/findings.md#s151)
[^x-manual-600]: Stated by Logitech, in the manual. [The Harmony 600 user manual](https://www.manualslib.com/manual/634914/Logitech-Harmony-600.html)
[^x-manual-650]: Stated by Logitech, in the manual. [The Harmony 650 user manual](https://www.logitech.com/assets/44635/3/harmony650-user-guide.pdf)
[^s271]: Measured in configurations. [Section 271](../docs/findings.md#s271)
[^t-model]: Stated by Logitech, in their client. [The test](../tests/test_myharmony_model.py)
[^s151b]: Measured in configurations. [Section 151](../docs/findings.md#s151)
[^s327]: Stated by Logitech, in their client. [Section 327](../docs/findings.md#s327)
[^unchecked]: Not checked.
[^s327b]: Measured in configurations. [Section 327](../docs/findings.md#s327)
[^s342]: Measured on a unit. [Section 342](../docs/findings.md#s342)
[^s238]: Measured on a unit. [Section 238](../docs/findings.md#s238)
[^s238b]: Read in the firmware. [Section 238](../docs/findings.md#s238)
[^s285]: Measured on a unit. [Section 285](../docs/findings.md#s285)
[^s128]: Measured in configurations. [Section 128](../docs/findings.md#s128)
[^s430]: Measured in configurations. [Section 430](../docs/findings.md#s430)
[^s283]: Measured on a unit. [Section 283](../docs/findings.md#s283)
[^s386]: Measured on a unit. [Section 386](../docs/findings.md#s386)
[^s344b]: Stated by Logitech, in their client. [Section 344](../docs/findings.md#s344)
[^s344]: Measured on a unit. [Section 344](../docs/findings.md#s344)
[^s156]: Measured in configurations. [Section 156](../docs/findings.md#s156)
[^s154]: Measured in configurations. [Section 154](../docs/findings.md#s154)
[^s127]: Measured in configurations. [Section 127](../docs/findings.md#s127)
[^s337]: Read in the firmware. [Section 337](../docs/findings.md#s337)
[^t-capabilities]: Stated by Logitech, by their service. [The test](../tests/test_product_capabilities.py)
[^s340]: Read in the firmware. [Section 340](../docs/findings.md#s340)
[^s333]: Measured in configurations. [Section 333](../docs/findings.md#s333)
[^s333b]: Read in the firmware. [Section 333](../docs/findings.md#s333)
[^s335]: Measured on a unit. [Section 335](../docs/findings.md#s335)
