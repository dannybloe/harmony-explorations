# Harmony 600, 650 and 700: miscellaneous

**The rule for this file** is the model folders' rule: a note goes here only when it fits none of the
other files, and a kind of note that recurs gets a file of its own.

## Names

* Logitech's client calls the platform **Molson**[^s197] and lists it on the **Mocha** transport with the
  5xx models, a transport map and not an architecture map[^s207]. Neither name means anything on the desk.
* The configuration container is the Harmony One's, `GSPM` and `PTYY`, at format 1.4 with 20 pointer
  slots where the One's is 1.6 with 22[^s7]; a section on this architecture transfers to the One by base
  slot index, [the container](../../config-format/container.md#one-table-four-architectures)[^s115].

## The firmware's own screens

Every configuration of these models carries a few screens the firmware itself needs, such as "USB
Connected" and the low battery warning, at the front of base slot 6: **fourteen on the Harmony 600 and
650**, "USB Connected", Low Battery, Insert batteries, Unable to charge, Update Successful and Upgrade
Successful, Ready to learn, Command Received, Terminate Entry, the two "add an Activity" placeholders and
three blanks, and **nineteen on the Harmony 700**, whose four charging frames and "Please charge your
remote" come on top[^s347][^s357]. The firmware never enters one by number: the configuration's own lists
do, so what a person sees of them is the configuration's wiring, read on the 600's and 650's 0.2
builds[^s355].

Their keys, read from 21 of Logitech's compiles of the three models[^s357]:

* **The placeholders**, "Use the Harmony setup software to add an Activity on this button" and "... to add
  Activities", swallow every key event of scans 1 to 54 but the press of scan 25, the centre key below the
  display, which goes back. On the 600 and 650 mode 0's is the table after the end marker[^s311].
* **Low Battery** runs the wiring's low battery exit on the press of scan 25; the other battery screens
  swallow every key event[^s357].
* **"USB Connected" is left by the presses of scans 11, 12 and 51 in turn**, while every other key event,
  those keys' own releases and repeats included, starts the count again[^s357]. How a person completes it
  is **not read and not tried**[^unchecked].

## What Logitech's compiler does on these models

Read from Logitech's compiles, the compiler being on Logitech's service and not in hand. The long form is
[compiler.md](compiler.md).

* **A device's own pages**: every hard key takes the first of a short list of command names the device
  has; the screen opens with the power commands and a fixed short list, then every command no key holds,
  sorted, case folded; each label in the largest of six text sizes that fits on one line or two. Twenty
  catalogue devices reproduced[^s325].
* **The activity menu's order is not chosen by the person setting it up.** MyHarmony offers its reorder screen only to remotes
  with capability `ActivityReorder`, which every remote with a screen carries except the Harmony 600,
  650, 665 and 700[^s351]. What the compiler's order follows is not established[^unchecked].
* **A start up title's line break**: on one line up to 126 pixels on the Harmony 650, 116 on the 600 and
  123 on the 700 as far as their compiles show, broken from 130, 130 and 163[^s358].
* **A configuration with no activity**, of which one compile is in hand, a Harmony 650's: More Activities
  on the activity menu opens "add Activities"[^s383].

[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s207]: Stated by Logitech, in their client. [Section 207](../../../docs/findings.md#s207)
[^s7]: Measured in configurations. [Section 7](../../../docs/findings.md#s7)
[^s115]: Measured in configurations. [Section 115](../../../docs/findings.md#s115)
[^s347]: Measured in configurations. [Section 347](../../../docs/findings.md#s347)
[^s357]: Measured in configurations. [Section 357](../../../docs/findings.md#s357)
[^s355]: Read in the firmware. [Section 355](../../../docs/findings.md#s355)
[^s311]: Measured in configurations. [Section 311](../../../docs/findings.md#s311)
[^unchecked]: Not checked.
[^s325]: Measured in configurations. [Section 325](../../../docs/findings.md#s325)
[^s351]: Stated by Logitech, in their client. [Section 351](../../../docs/findings.md#s351)
[^s358]: Measured in configurations. [Section 358](../../../docs/findings.md#s358)
[^s383]: Measured in configurations. [Section 383](../../../docs/findings.md#s383)
