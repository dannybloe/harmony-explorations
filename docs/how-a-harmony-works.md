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

**Danny's picture of it is the one to build from**, and it is worth more than any measurement here:
switching to a device is like reaching for the old remote that came in the box with that appliance. There
is nothing but that appliance on it. You cannot reach the amplifier from the television's old remote,
because it has no amplifier on it.

Both map the entire keypad. Neither is a special case of the other, and **they are two separate maps of
the same keys, authored separately**. Logitech's own software has a page for each, called "Changing how
buttons work for a device" and "Changing how buttons work in an Activity" in the Harmony 600 manual's
contents. In an activity **any key may carry any command of any appliance you own**; in a device's map
there is one appliance, so two appliances holding the same key is not a conflict at all.

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

## The screen is the bigger half of device mode

An old remote has far more buttons than a Harmony does. So what people actually build in device mode is
**pages on the screen**: a screenful of commands at a time, for the obscure functions the keypad has no
room for. Those would never fit an activity's keypad map, and they are not meant to, since an activity
carries what you use often.

That is why Logitech can say you should hardly ever need device mode and be right, and it is also why the
feature matters: without it, reaching one rare function means walking to the cupboard for the old remote.

For anything being built it means the keypad is the **smaller** half of a device's map, and a device page
without screen pages is unfinished rather than complete.

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

So the measurement is about the **activity** maps, and that is what it may be used for: it says an
activity's map reads as the device's map plus that activity's overrides, which is what lets a device map be
**reconstructed** where a file states none. It says nothing about what an interface should show.

Two consequences for anything being built, and they belong to different screens:

* **A page about a device shows that one appliance and mentions no activity.** Not which activity uses a
  key, not which other appliance holds it, not where a change will land. Inside one device's map there is
  one appliance, so a key sends one of its commands or it sends nothing, and a change is one binding.
  FreeHarmony got this wrong three times, each time by importing an activity map's concerns onto it.
* **A page about an activity is where the rest lives.** There a key may carry any appliance's command, so
  a change has to reach the whole activity, and the buttons other appliances already hold are the real
  constraint: 131 of the 1105 pairs have another appliance holding the button in at least one activity
  that uses this one, and on the Harmony One's receiver in the lab 3 of its 35 buttons are its own in all
  eight activities that use it. That is the activity editor's rail and it must not be carried into the
  device one.

**Logitech's own advice is the opposite of Danny's practice, and both are worth knowing.** The 885
manual says "you should never need to use Device mode during normal use" and that "you can eliminate the
use of device mode by customizing your Activities", by putting the command on the display or on a button.
Danny uses device mode routinely for exactly the commands Logitech would have you add to an activity, and
the reason is the screen pages above: that is where an appliance's rare functions live. The application
serves both.

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
