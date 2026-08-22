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
button on the remote now drives the television and nothing else. A **Current Activity** item takes you
back to what you were doing.

Both map the entire keypad. Neither is a special case of the other.

## Device mode is not a corner of the product

It is the ordinary way to reach a command that is not on an activity's map, and most commands are not:
an activity binds the thirty or so buttons that make sense while you are watching television, and a
television answers to a hundred and more.

The flow, in Danny's words on 22 August 2026: you have chosen an activity, you want an obscure setting
of your television that you almost never touch and that is not on any button in the activity map, so
you switch to device TV, press the button for that setting, and switch back to Current Activity.

Every model works this way. The **Harmony 600** and the **Harmony 525** have a physical Devices key.
The **Harmony One** has one on its touch panel. It is intrinsic to the product rather than a feature of
a generation.

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

Two consequences for anything being built:

* **An interface about a device shows the device's map**, not one activity's. Showing one activity's
  map on a device's page answers a question nobody asked.
* **A change to a device's button has to reach every activity that inherited it.** Change it in one
  place only and it is invisible in the activity somebody is actually sitting in, which is the worst
  kind of wrong: the file changed and the remote did not.

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
