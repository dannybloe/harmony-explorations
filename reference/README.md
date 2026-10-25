# How a Harmony works

A reference to the Logitech Harmony remotes: what they do for the person holding one, what each model
is, and how their configuration files, their USB protocol and their infrared codes work. It was built
by taking the remotes apart in software, reading their firmware and measuring them, and every fact on
these pages says how it is known.

The pages start plain and grow technical the further in you go. The first two sections are for anyone
who owns a Harmony; the formats are for whoever wants to read or write the files themselves.

## Contents

**[How a Harmony works](how-a-harmony-works.md)**: activities, device mode, and what the remote does
when you press a key. Start here.

**[Remotes](remotes/README.md)**: one entry per model, the Harmony 300, 350, 525, 600, 650, 700, 885,
890, One and Touch, each with its drawing, its keys, its screen, what it can hold, how it behaves, its
memory, its firmware and how it talks over USB.

**[Architectures](architectures/README.md)**: what several models share because they run the same
firmware on the same kind of hardware, stated once:
[the 600, 650 and 700](architectures/harmony-600-650-700/README.md),
[the One](architectures/harmony-one/README.md),
[the 525](architectures/harmony-5xx/README.md),
[the 300 and 350](architectures/harmony-300-350/README.md),
[the 880 and 885](architectures/harmony-880-885/README.md),
[the 890 and 895](architectures/harmony-890-895/README.md) and
[the Touch](architectures/harmony-touch/README.md).

**The formats**:

* [The configuration file](config-format/README.md): what a remote stores, section by section, from
  the container to the screens.
* [Talking to a Harmony over USB](usb-protocol/README.md): the commands a remote answers, its identity
  and how a configuration is read and written.
* [Infrared](infrared/README.md): how a command becomes light, the code families and how a remote sends
  them.

**[Logitech's world](logitech/README.md)**: a short overview of the side of a Harmony that lived at
Logitech, and the models they sold.

**[Glossary](glossary.md)**: every term these pages use, and whether it is Logitech's word, a standard
one or one coined here.

## How to read a footnote

Every fact carries a footnote. The note at the bottom of the page opens with **the kind of evidence**
and then links to the argument for it:

> Logitech's service gives the Harmony 650 a limit of eight devices.¹
>
> ¹ Stated by Logitech, by their service. Section 136

The link leads to one of four places: a numbered section of the findings archive, where most of these
facts were first worked out; a decision, for a choice rather than a fact about a remote; the automated
test that holds a fact established later; or a public outside source.

**The evidence words**, exactly one of these per note:

| evidence words | what it is | what it is worth |
|---|---|---|
| **Read in the firmware.** | from the disassembled image of the remote's own firmware | what the code does, not proof the hardware does it |
| **Measured on a unit.** | read off a remote over USB, or with an instrument such as an infrared receiver | what one remote did, on its firmware version |
| **Measured in configurations.** | counted over compiled configuration files | what the files hold, never what the product does. For the Harmony 880/885 and 890/895 it is the only measurement there is, and their pages say so at the top |
| **Stated by Logitech.** | the vendor's word, optionally followed by where: ", in the manual", ", by their service", ", in their client" (their desktop client, see [Logitech's clients](logitech/clients.md)) or ", in their catalogue" (their device database) | the vendor's word, sometimes about a different software generation; one manual edition can differ from another |
| **Stated by a third party.** | a public outside source, such as the comparison table at harmony-remote-forum.de | a hypothesis |
| **Chosen by this project.** | a decision rather than a fact about a remote | the reasoning in the decision |
| **Not checked.** | nobody has established it, written out on purpose | nothing yet |

**"Not checked" is the note that matters most.** Each page ends with the questions nobody has answered,
written as such, because the absence of a statement is easily read as an answer. A fact without a
footnote is not a fact here; where something about a remote is unclear, it is marked not checked rather
than guessed.

Where two sources disagree, both are written down, each with its own footnote, and the disagreement is
left open unless something settles it. [The Harmony 650's device limit](remotes/harmony-650/features.md)
is the worked case: its manual says five and two Logitech tables say eight.
