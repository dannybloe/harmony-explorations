# How a Harmony works, from the outside

Everything else in this repository is about bytes, firmware and pointers. This document is about what
the thing does when somebody picks it up, and it exists because that turned out to be the half nobody
had written down.

**It is written for whoever is about to design something.** A configuration is a program and the
firmware is its interpreter, so the format work can always tell you what a byte does. It cannot tell
you what the product is for, and on 22 August 2026 that cost a whole screen: FreeHarmony's device page
was built to show a keypad per activity, because a count over five configuration files said every
keypad binding sits in an activity's map. The count was right. The screen was the **device mode**
editor, and device mode had never been described anywhere here.

## The two things a Harmony can be doing

**An activity.** "Watch TV", "Listen to Music". Pressing it switches the right equipment on, sets the
inputs, and gives the keypad a map that spans several devices at once: volume to the amplifier,
channels to the set top box, transport to whatever is playing. That is the whole point of a Harmony and
it is what the marketing was about.

**Device mode.** Press **Devices** and the screen lists your equipment. Pick the television and every
button on the remote now drives the television and nothing else. Something takes you back to what you
were doing, and what it is called differs per model.

Both map the entire keypad. Neither is a special case of the other.

**Logitech says so in its own manuals**, which is the corroboration this document lacked when it was
written on 22 August 2026 and got in the same afternoon from the four manuals in the lab. The Harmony
One's is the plainest: "After you select a device, the Harmony One controls only that device. You have
access to all the commands for the device system." The Harmony 885's gives the example: "If you choose
Television as the device, the number, volume and channel buttons will all control your television."
So the keypad remap is the vendor's own statement rather than an inference, and what is still open is
only **where that map lives in the file**.

## Device mode is not a corner of the product

It is the ordinary way to reach a command that is not on an activity's map, and most commands are not:
an activity binds the thirty or so buttons that make sense while you are watching television, and a
television answers to a hundred and more.

The flow, in Danny's words on 22 August 2026: you have chosen an activity, you want an obscure setting
of your television that you almost never touch and that is not on any button in the activity map, so
you switch to device TV, press the button for that setting, and switch back to Current Activity.

Every model works this way and each gets there differently. The differences are small and worth being
exact about, because a drawing of a remote in FreeHarmony has to agree with the remote:

| model | how you get in | how you get out |
|---|---|---|
| Harmony 525 | a **Devices** key on the keypad | its **Activities** key |
| Harmony 600 | **no key at all**: the screen writes "Devices" above the **centre key** of the three below the display | the same centre key, which then writes "Activity" |
| Harmony One | a **Devices** item on the touch panel | a **Current Activity** item |
| Harmony 885 | a **DEVICE** key beside the display | **DEVICE** again |

**The Harmony 600 is the correction worth keeping.** This document and both `CLAUDE.md` files said it
has a physical Devices key for a day. It does not, and the manual settles it twice: the button table on
page 5 lists every key on the remote and there is no Devices among them, and page 6 says you "select
devices by pressing the center button below **Devices**", where Devices is a word drawn at the bottom of
the screen. The traced drawing of a Harmony 600 in `reference/silhouettes/` therefore has no such key and
must not grow one.

**"Current Activity" is one model's wording**, the Harmony One's. The 600 writes "Activity", the 525
uses its own Activities key, and on an 885 you press DEVICE again. So an interface must not print that
phrase as though it were the product's vocabulary.

## What that means for a button map

**A button map belongs to a device before it belongs to an activity.** Logitech's own software is
authored that way: you give a device's commands to buttons, and an activity then draws on several
devices' maps at once.

Measured from the other side, in `docs/findings.md` section 151: across all fifteen user configurations
there are 1105 pairs of a device and a button, and **1096 of them send the same command in every activity
that binds them**. Forty seven of fifty devices agree everywhere. The three that do not include an
amplifier whose input selection differs per activity, which is exactly what a per activity override looks
like.

So the configuration stores a keypad map **per activity**, and a device's own map is what those maps
agree on. Both statements are true and only the second is a fact about the product.

Three consequences for anything being built:

* **An interface about a device shows the device's map**, not one activity's. Showing one activity's
  map on a device's page answers a question nobody asked.
* **A change to a device's button has to reach every activity that inherited it.** Change it in one
  place only and it is invisible in the activity somebody is actually sitting in, which is the worst
  kind of wrong: the file changed and the remote did not.
* **Except in the activities where another device holds that button**, and this is not an edge case.
  Asked across the activities that drive a device rather than the ones that bind a pair: 131 of the 1105
  pairs have another device holding the button in at least one of them, and 117 have nothing holding it.
  A total understates how concentrated that is, so here is one device: **the Harmony One's receiver in
  the lab has 35 buttons, eight activities drive it, and three of the 35 are its own in all eight.** A
  button that works the television while you are watching television and the amplifier while you are
  listening to music is how a Harmony is set up. So a change goes where there is room, leaves the rest
  alone, and says which. Writing all of them steals buttons; refusing when one activity is in the way
  blocks the other 32. Only **two different commands for one device** is a conflict the map cannot
  resolve, and that is nine pairs of 1105.

**Logitech's own advice is the opposite of Danny's practice, and both are worth knowing.** The 885
manual says "you should never need to use Device mode during normal use" and that "you can eliminate the
use of device mode by customizing your Activities", by putting the command on the display or on a button.
Danny uses device mode routinely for exactly the commands Logitech would have you add to an activity. The
application has to serve both, which is an argument for the activity screen editor and not against the
device page.

## What the screen does, and what it does not

The screen is a second population of keys, and it shares almost no scan code with the keypad: none at
all on arch 9, arch 12 and arch 14, and exactly one on arch 8, section 128. On a Harmony 600 a device
mode's screen shows that device's commands four at a time and you page through them with the arrows;
on a Harmony One the same thing happens on the touch panel.

So "the buttons of a device" is two questions, not one, and an interface has to keep them apart.

## Open: where device mode's own keypad map lives

**No keypad map in any configuration here sends an infrared code outside an activity.** Of 158 keypad
maps across the fifteen user configurations, 65 are installed by something in the configuration and 50 of
those by an activity, and exactly those 50 send codes. The remaining 108 send nothing, and 38 of them bind
fifty or more keys to lists made of comparisons and mode entries, which is a menu.

So the map device mode uses is not identified. Three readings, none of them established:

1. The firmware builds it from the selected device's own command order in base slot 5.
2. Device mode reuses the running activity's map, filtered to the chosen device.
3. There is a map in the container that nothing here has recognised yet.

**Do not close this by choosing one.** What would settle it is the firmware: the routine that runs when
the Devices item is pressed, followed to whatever it installs. `.claude/skills/trace-section/SKILL.md`
is the method.

## The rule this document is really for

A measurement over the corpus answers "what do these files contain". It never answers "what does the
product do". The corpus will agree with itself about a feature it holds no bytes for, which is exactly
what happened here: five files, three architectures, no counterexample, and a wrong conclusion.

When a design question arrives, the order is: what does the remote do, then what does the file say
about it, then what can we read. And when the product answer is not written down here, ask Danny. He
has the remotes on the desk and has used them for years.
