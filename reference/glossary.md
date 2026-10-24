# Glossary

The words the rest of this reference uses, each defined in a sentence or two and linked to the page that
explains it. A definition here is short on purpose: the page it links to is where the detail and the
evidence are, and where the two ever seem to disagree, the page is the one to believe.

**Three kinds of word are mixed here, and each entry says which it is.** Some are **Logitech's**, read in
their files, their software or their manuals, and using them differently would be an error. Some are
**this project's** names for things nobody had named, and could have been called anything. The rest are
**standard** words from USB, from the PIC18 processor or from ordinary engineering, listed because the
pages use them without explaining them.

The entries are grouped by subject rather than alphabetically, since most of them only make sense beside
their neighbours: first what a person holding a remote meets, then Logitech's software, then the
configuration file from the outside in, then infrared, then the remote's own programs, USB and the
firmware. The words for how this project works, its corpus of sample files, its tooling and its checks,
are in [the project's own glossary](../docs/glossary.md). Where an entry states a fact rather than a
meaning, it carries a footnote, read as [the introduction](README.md#how-to-read-a-footnote) describes.

## What a person meets

**device** (Logitech's word). One thing the remote controls: a television, a receiver, a set top box.
This reference says device and never appliance, equipment or set, because device is the word in
Logitech's software, in their records and in the product. You have remotes, and a remote has devices,
[How a Harmony works](how-a-harmony-works.md).

**activity** (Logitech's word). One thing a person wants to do, "Watch TV": starting it switches the
right devices on, sets their inputs and gives the keypad one map spanning several devices,
[How a Harmony works](how-a-harmony-works.md#the-two-things-a-harmony-can-be-doing). In a configuration
an activity is a value of one counting variable, [Activities and
devices](config-format/activities-and-devices.md#1-a-value-of-the-activity-counter).[^s273]

**device mode** (Logitech's word). Pointing the whole remote at one device, so every key drives that
device and nothing else, as its own old remote would. How each model gets in and out differs,
[How a Harmony works](how-a-harmony-works.md#getting-into-device-mode-and-back).

**button map**, **keypad map** (Logitech's word, and this project's for the keypad half). What each key
does. A device has one and an activity has one, authored separately, so two devices holding the same key
is not a conflict, [How a Harmony works](how-a-harmony-works.md#a-button-map-belongs-to-a-device-first).
Logitech's records keep a device's map and an activity's as two types,
[the data model](logitech/data-model/model.md#a-device-map-and-an-activity-map-are-two-types-not-one).

**sequence** (Logitech's word; a macro in ordinary speech). One button sending several commands in a
row, with pauses. It belongs to an activity, never to a device, [How a Harmony
works](how-a-harmony-works.md#sequences).

**favourite channel** (Logitech's word). A screen button that tunes a device to a channel, kept per
device and shown per activity. It is not a key binding, and the channel is stored as text, so channel 1
and channel 001 differ, [How a Harmony
works](how-a-harmony-works.md#a-favourite-channel-is-a-screen-button-and-the-channel-is-text).

**Help** (Logitech's word). The key that tries to put the running activity right by resending its power
and input commands. It belongs to what is running and never to a device, [How a Harmony
works](how-a-harmony-works.md#help-belongs-to-what-is-running-never-to-a-device).

**long press** (Logitech's word). A second, different action on one button, chosen by how long the button
is held; Logitech's button record also has a double press. A button with a long press cannot repeat,
[How a Harmony
works](how-a-harmony-works.md#holding-a-key-is-two-mechanisms-and-a-repeat-and-a-long-press-exclude-each-other),
and which models have one is [the remotes index](remotes/README.md#a-long-press). Not the same thing as a
held key, which repeats its command, or the long press version below.

**skin** (Logitech's word). The number that names a model: the remote reports it, and Logitech gave every
model one, and a model sold under two regional names two. It has nothing to do with appearance. The
Harmony One is 54, the 600 is 71, the 650 is 72 and the 700 is 66; the whole list is [the remotes
index](remotes/README.md#every-model-with-a-record).[^s57][^s81]

**regional twin** (this project's name). The same remote sold under a second name and skin in another
market, such as the Harmony 880 and 885 or the One and the One EMEA. A twin can differ on the face, by
four teletext keys, [the remotes index](remotes/README.md#every-model-with-a-record).[^x-forum]

## Logitech's software and records

**MyHarmony**, **Harmony Desktop**, **the classic client** (Logitech's names). The three programs a person
set a Harmony up with: the classic client, Logitech's Harmony Remote Software, for the oldest remotes;
MyHarmony for the later ones, the Harmony One, 600, 650, 700, 300 and 350 among them; and Harmony Desktop
after it, [Logitech's clients](logitech/clients.md).

**the configuration service** (this project's name for Logitech's server). The service those programs
talk to: it keeps a person's remotes, devices and activities, holds the device catalogue and compiles
configurations, [Logitech's configuration service](logitech/service.md). Logitech's **update service** is a
separate one that serves firmware, [Logitech's software update service](logitech/update-service.md).

**compile** (Logitech's word, in their service's operation names). Building a configuration from a
person's choices, which Logitech's service does with no remote attached, [the
service](logitech/service.md#compiling). What is on the remote afterwards is the compiler's output, and
much of its arrangement is the compiler's habit rather than the format's rule, [Layout](config-format/layout.md).

**household**, **account** (Logitech's words). In Logitech's records a household is the person, and an
account is the container for **one** remote and everything that remote controls, so "the devices on an
account" are one remote's devices, [the data model](logitech/data-model/model.md#the-shape).[^s218]

**device catalogue** (this project's name for Logitech's database). Logitech's database of manufacturers,
devices and their named infrared commands, from which a device picked in Logitech's software gets its
codes, [Logitech's device catalogue](logitech/device-catalogue.md).

**function map** (Logitech's word). A device's commands offered for binding, grouped and named; where a
button map says what each key does, a function map says what there is to choose from, [the data
model](logitech/data-model/model.md#the-function-maps-are-the-other-half).

## The files

**configuration**, often **config** (Logitech's word). The file that makes a remote do anything: which
devices there are, what every key and screen does, which infrared codes are sent and what an activity
switches on. Logitech's service compiles it and a host writes it into the remote's flash; a remote without
one is inert, [the configuration file](config-format/README.md).

**user configuration**, **safe mode configuration**, **factory configuration** (this project's names). The
configuration a person's own setup compiled to; the small one the remote keeps for safe mode, which is
also where its status screens come from; and the one a remote left the factory with, which on a Harmony
One holds one device and one activity, [Activities and
devices](config-format/activities-and-devices.md#the-seven-structures-in-the-order-a-builder-touches-them).

**firmware** (standard). The program built into the remote, which reads the configuration and acts on it.
It is the authority on what a configuration field means, since what it does with a byte is what that byte
means, [the configuration file](config-format/README.md).

**image** (standard). One firmware program as a flat block of bytes. "The 700 2.8 image" is version 2.8
of a Harmony 700's firmware. A few pages also call a picture in a configuration an image; the format pages
otherwise say picture.

**EZHex** (Logitech's name). The file a host receives: an XML header saying which remote the file is for,
then the configuration itself. The remote never sees the header, [the EZHex wrapper](config-format/ezhex.md).

**`.hfw`**, **EZUp** (Logitech's names). A firmware package and its inner wrapper, [the EZHex
wrapper](config-format/ezhex.md#firmware-packages).

**`INTENDEDVERSION`** (Logitech's name). The part of an EZHex header that names the remote a file was
built for, in six fields: `PROTOCOL`, `SKIN`, `FLASH`, `BOARD`, `SOFTWARETYPE` and `ARCHITECTURE`. An
absent or empty field matches any remote, and **`PROTOCOL` carries the architecture**, not a protocol
version, [the EZHex wrapper](config-format/ezhex.md#which-remote-a-file-is-for).[^s225]

## Which remote it is

**architecture**, often **arch** (Logitech's word and their numbers). The platform under a model: its
processor, its memory layout and its firmware family. Several models share one, the Harmony 600, 650 and
700 being architecture 14, and a configuration built for one architecture means nothing to another,
[Architectures](architectures/README.md). A Harmony One is 12, a 525 is 9, an 880 and 885 are 8, an 890
and 895 are 10, and a 300 and 350 are 16; the Touch reports 17 where Logitech's templates say
18.[^s57][^s281][^s76][^s7][^s182][^s264][^s197][^s200] A rule shown on one architecture is not shown on
another, and every claim in this reference says which architectures it covers.

**platform** (Logitech's word, used in two senses). In Logitech's software, a hardware family with a
codename, such as Gin for the Harmony One and Molson for the Harmony 600, 650 and 700, picked out by the
USB product id, [Architectures](architectures/README.md#platforms-and-product-ids). In the version block,
one byte the remote reports, which is the same on the Harmony One and the 600, 650 and 700 and so is not
the architecture, [the version block](usb-protocol/version-block.md#the-five-compiled-in-fields).[^s207][^s225]
Some pages also say platform loosely for an architecture, and the data model's pages for Logitech's
online system as a whole.

**board**, **flash id** (Logitech's words). The remote's hardware revision, and the maker and part of its
flash chip. Both are in the version block, and a file's `INTENDEDVERSION` is compared against them,
[the version block](usb-protocol/version-block.md).

**version block** (this project's name). The remote's reply to the version request: its firmware
version, hardware, flash chip, architecture, whether it runs normally or in safe mode, its skin and its
platform, [the version block](usb-protocol/version-block.md).

**software type** (Logitech's word). Which of a remote's programs is answering: 0 the application, 1 a
test program, 2 a minimal one, 3 the bootloader, 4 safe mode, [the version
block](usb-protocol/version-block.md#software-type-and-what-safe-mode-changes).[^s87]

## Inside a configuration: the container

**container** (this project's name). The configuration's own format, under any wrapper: one format on
every remote from the Harmony 880 on that has been read, so a discovery on one model carries to the others,
[the container](config-format/container.md). The code calls the bytes of a container a blob.

**cookie** and **end marker** (this project's names). The four letters a container opens with and the
four it ends with: `GSPM` and `PTYY` on the Harmony One, 600, 650, 700, 300 and 350, `TPTP` and `DKDK` on
the 880, 885, 890 and 895, `AHCM` and `MCHA` on the 525. A cookie names a family and not an architecture,
since two architectures can share one, [the container](config-format/container.md#the-cookies-of-each-architecture).[^s14][^s194]
The end marker is the one at the very end; the four letters straight after the section table are a
different marker, which opens the key table below.

**framed record** (this project's name). A record opened and closed by a pair of two byte tags: the name
tree's `0xFEED` and `0xBEEF`, and the build timestamp's `0xADDF` and `0xEFBF`. [Header
records](config-format/header-records.md) calls such a tag a cookie too, which is a different thing from the
container's cookie above.

**section table**, also **pointer table** (this project's name). The list near the start of a container
saying where each section lives: one spare byte and a three byte address per entry, [the
container](config-format/container.md#the-section-table).[^s20]

**section** (this project's name). One part of a configuration, named by one entry of the section table:
the infrared codes, the screen programs, the timers and so on, [the configuration
file](config-format/README.md#the-base-slots). A section's length is not stated; it runs to the next one.

**base slot**, **raw slot** (this project's names). A section's place in the section table. A base slot
is the number that means the same section on every architecture, 0 to 19, and the one these pages quote;
a raw slot is the place in one architecture's own table, which differs because some architectures insert
entries. The code calls a raw slot an arch slot, [the
container](config-format/container.md#one-table-four-architectures).[^s16]

**base address**, also **flash base** (this project's names). The flash address a container starts at.
Every pointer inside a container is a flash address, so the container is built for one place in one
model's memory, `0x040000` on a Harmony One and `0x030000` on a Harmony 600, 650 or 700, [the
container](config-format/container.md#finding-the-base-address).[^s7]

**trailer**, **trailer checksum** (this project's names). The trailer is a container's last six bytes, the
checksum and then the end marker. The checksum is what the remote checks before it accepts the
configuration: a sixteen bit XOR of the container's words. It is weak, blind to two
swapped words, so passing it means the remote will not refuse the file, not that the file is right,
[the container](config-format/container.md#the-trailer-checksum).[^s41]

**key table** (this project's name). The table straight after the section table, opened by the marker
after the table, `LWJL` or `WLWL`, and not by the end marker. It is the first mode record, byte for byte,
[Modes and keys](config-format/modes-and-keys.md#the-key-table-is-the-first-mode-record).[^s52]

**frame** of a container (this project's name). The parts of a container its own arithmetic fixes, the
header, the section table, the marker after it and the trailer, [Layout](config-format/layout.md#the-frame).
Not the infrared frame below.

## Inside a configuration: what it holds

**name tree** (this project's name). Base slot 0: names for the configuration's variables and devices,
read by the host software and by nothing on the remote, [Header
records](config-format/header-records.md#base-slot-0-the-name-tree).[^s81]

**architecture record** (this project's name). Base slot 1: up to seven bytes stating the architecture and
the skin, the only place a configuration states either, [Header
records](config-format/header-records.md#base-slot-1-the-architecture-record).[^s182]

**build timestamp** (this project's name). Base slot 3: when the configuration was built, the moment the
remote measures the configuration's age from. It is not the remote's clock, [Header
records](config-format/header-records.md#base-slot-3-when-the-configuration-was-built).[^s138]

**clock** (standard word, this project's use). The remote's time of day, kept in the first seven state
variables, whose starting values the configuration states, [State](config-format/state.md#variables-0-to-6-are-the-clock).[^s130]
On a Harmony One a power cycle sets the clock to them and a warm start keeps it running.[^s138] The
Harmony 600, 650 and 700 keep a clock in memory and show no time on their screen, [How a Harmony
works](how-a-harmony-works.md#what-the-screen-does-and-what-it-does-not).[^s283][^x-manual-650]

**mode**, **mode page**, **mode record** (this project's names). A mode is one screen the remote can show,
the activity menu, a device's page of commands, a help message; a mode page is one screenful of it; the
mode record is its entry in base slot 6, carrying a key map and its pages. Not Logitech's "device mode",
though a device's mode is what device mode shows, [Modes and keys](config-format/modes-and-keys.md).[^s37][^s271]

**key map table**, **set** (this project's names). Base slot 9: lists of key bindings, one entry, or set,
per activity and a few the remote always has, installed while an activity runs. Its front page calls it the
binding table, [Modes and keys](config-format/modes-and-keys.md#base-slot-9-the-key-map-table).[^s39]

**key lookup stack** (this project's name). The order a key press is looked up in: the current page's map,
the mode's, then the key map table entries the activity and the remote have installed, the first match
deciding, [Modes and keys](config-format/modes-and-keys.md#how-a-key-press-is-resolved).[^s39][^s176]

**handler**, **enter**, **leave** (this project's names). Instructions a mode or a key map entry runs when it
is entered or left rather than when a key is pressed, kept in the same list under tags of their own,
[Modes and keys](config-format/modes-and-keys.md#base-slot-6-the-mode-table).[^s37]

**tagged list** (this project's name). The small list a mode, a page and a key map entry each carry,
mapping a tag, mostly a key event, to one instruction. Its first byte states which of two forms it takes,
and the form is read from that byte, never guessed from the entries, [Modes and
keys](config-format/modes-and-keys.md#tagged-lists).[^s39]

**scan code**, **key code** (this project's names). A scan code is the number the keypad reports for a
key; a key code adds the event in its top two bits, press, release or repeat, [Modes and
keys](config-format/modes-and-keys.md#key-codes-and-scan-codes).[^s17]

**action list** (this project's name). A short program the remote runs: a count and three byte
instructions, an opcode and a sixteen bit operand each. A key press, a variable changing and a timer
running out each queue one, and the remote runs them one instruction at a time from a queue of forty,
[Actions](config-format/actions.md).[^s17][^s34]

**screen program** (this project's name). A program in a second, separate language with one byte opcodes,
which draws the screen: fill a rectangle, place a picture, write text, [Screens](config-format/screens.md#the-screen-language).[^s40]

**picture bank** (this project's name). Most of a configuration by size: one run of pictures with no table
and no count, from the end of the named sections to the checksum, reached only through the screen programs
that draw them, [Screens](config-format/screens.md#the-picture-bank).[^s55]

**glyph**, **font set** (standard words, this project's use). A glyph is one character's picture and a font
set a table of them at one size. A glyph code is an index into the configuration's own font table, not a
character, so text is recovered by recognising the pictures, [Screens](config-format/screens.md#what-a-glyph-code-means-and-how-the-text-is-recovered).[^s46]

**status screen** (this project's name). A message the remote shows when it is not showing a
configuration, such as "Configuration Corrupted", drawn from a container of such screens the firmware
falls back on, [Screens](config-format/screens.md#status-screens).[^s244]

**state variable** (Logitech's concept; their names for each are in the name tree). A number the remote
remembers while it runs, such as which activity is on, whether a device is switched on, and the clock. The
configuration states each one's starting value, its range and what to run when it changes,
[State](config-format/state.md#base-slot-13-the-state-variable-table).[^s35]

**transition** (this project's name). One line of a state variable's record: when the variable goes from
this value to that one, run this instruction. It is how a configuration reacts to anything, an activity
key writing a variable and the variable's transitions switching the devices on,
[State](config-format/state.md#a-variables-record).[^s60]

**action queue** (this project's name). Where the remote keeps the instructions waiting to run, forty of
them; one pushed into a full queue is dropped without a sound, which is why a long sequence is a hazard,
[Actions](config-format/actions.md#the-action-queue-holds-forty-instructions).[^s238]

**settings store** (this project's name). A small store in the internal program memory of the Harmony 600,
650 and 700, where the remote saves a device's delays; a saved delay wins over the configuration's when
the remote starts, [State](config-format/state.md#on-arch-14-a-delay-saved-on-the-remote-wins).[^s303]

**value map**, **timer**, **parameter block**, **event map**, **log area** (this project's names). The
other parts of a configuration's memory: lookups from a variable's value to something to run (base slot
14), a wait followed by one instruction (12), the model's own constants (15), the firmware's own events
(4), and a region of flash the remote appends a log to (2), [State](config-format/state.md).

**number sender** (this project's name). Base slot 16: one record per device that takes a channel number,
which sends the number one digit code at a time. A channel with a leading zero goes another way, spelled
out digit by digit, [State](config-format/state.md#base-slot-16-the-number-sender).[^s154][^s156]

**relocation** (this project's name). What growing a section moves: every address stated or implied
after it, [Relocation](config-format/relocation.md).

## Infrared

**carrier** (standard). The flicker of the infrared lamp while it is "on", tens of thousands of times a
second, most often 38000, which a receiver listens for. A command is bursts of carrier and silences,
[Infrared](infrared/README.md).[^s92]

**frame** (standard). The number a command carries, spelt in the lengths or positions of those bursts and
silences; one frame is one sending of that number, [Frames](infrared/frames.md).

**protocol family**, **family** (Logitech's word and their names). One maker's way of spelling numbers in
light, such as `NEC2` or `Sony 12 Bit`. A family is named by Logitech's catalogue, matched on the rhythm
their definition states, and never by their analysis service, [Families](infrared/families.md#a-family-is-named-by-logitechs-catalogue).[^s227]

**rhythm table** (this project's name). One entry per family stating its rhythm, which is what lets a code
stated as a family and a number be turned into durations, [Families](infrared/families.md#the-rhythm-table).

**biphase** (standard). A spelling in which every bit is one cell and the bit is which half of the cell
carries the flash, so there is one duration and nothing to tell short from long,
[Frames](infrared/frames.md#biphase-the-bit-is-which-half-of-the-cell-carries).[^s162]

**cell table** (this project's name). A spelling in which two or four bits at once pick one of four or
sixteen whole shapes, [Frames](infrared/frames.md#cell-tables-one-of-four-or-sixteen-whole-cells-per-digit).

**toggle bit** (standard). A bit the sender flips on every new press, so a device can tell a second press
from a held one, [Infrared records](config-format/infrared-records.md#two-pointer-groups-a-toggling-code).

**infrared record**, **infrared group**, **pointer group**, **block** (this project's names). A record is
one command as the configuration stores it: a carrier period and up to three lists of durations, each list
a block, named by the record's pointer group of three addresses; a toggling code has two pointer groups.
An infrared group is one device's records, so a device that sends codes is one group, [Infrared
records](config-format/infrared-records.md).[^s32][^s86]

**class** of a record (this project's name). A byte in a record's header saying how its blocks are spelt:
class 1 stores the durations themselves, class 5 spells them from a shared dictionary, [Infrared
records](config-format/infrared-records.md#classes).[^s42][^s42b]

**once, held and tail** (this project's names). A record's three blocks: what a tap sends, what repeats for
as long as the key stays down, and what plays at the end either way. The held block's own length is the
repeat rate a person feels, [Infrared records](config-format/infrared-records.md#once-held-and-tail).[^s127]

**long press version** (this project's name). A power code sent over and over for a fixed time on one tap,
as if the button on the device's own remote were held, for a device whose catalogue entry says to hold its
power key. The ordinary press of the same command keeps a record of its own. Not a held block, and not Logitech's long press, [Sending](infrared/sending.md#holding-the-power-key-for-a-stated-time).[^s308]

**lead in** (this project's name, two uses). In a frame, whatever comes before the first bit. In a stored
block, the silence Logitech's compiler opens every first block with, 50 ms on most commands and longer on
those that get a settling time; that one is the compiler's habit and not the format's rule,
[Frames](infrared/frames.md#biphase-the-bit-is-which-half-of-the-cell-carries) and
[Sending](infrared/sending.md#how-logitechs-compiler-spells-a-block).[^s174]

## The remote's own programs

**safe mode** (Logitech's word). A fallback program the remote runs when its ordinary one cannot, with a
small configuration of its own kept in flash beside the user's. What entering it does differs per
architecture: a Harmony One runs it beside its ordinary program, and a Harmony 525 copies it over the
ordinary one,
[the version block](usb-protocol/version-block.md#software-type-and-what-safe-mode-changes) and
[Architectures](architectures/README.md#the-firmware-area-the-other-way-up).[^s3][^s118]

**bootloader** (standard). The small program that runs first at every power on and decides what to start.
If it starts nothing it waits on the cable as a flash programmer with a protocol of its own,
[the bootloader](usb-protocol/bootloader.md).[^s189]

**execute in place** (standard). Running a program straight out of the flash chip it is stored in, as the
Harmony One does with its external flash, where the Harmony 600, 650 and 700 copy theirs into the
processor first, [Architectures](architectures/README.md#two-ways-to-run-a-program).[^s3]

## USB

**HID** (standard). The USB class keyboards and mice use. A Harmony One, 525, 600, 650 or 700 is one with
a vendor defined purpose, so no operating system takes it for an input device, and every message,
a **report**, is exactly 64 bytes each way, [the transport](usb-protocol/transport.md).[^s19]

**descriptor** (standard). A block a USB device hands the computer when it is plugged in, saying what it is
and how to talk to it. The firmware image carries them, so they can be read with no remote,
[the transport](usb-protocol/transport.md#finding-the-descriptors-in-an-image).

**vendor id**, **product id** (standard). Who made a USB device and which product it is. Logitech is
`0x046D`, and a product id names a platform, not a model: the Harmony 600, 650 and 700 all report
`0xC122`, [Architectures](architectures/README.md#platforms-and-product-ids).[^s281]

**`bcdDevice`**, **BCD** (standard). `bcdDevice` is the USB device's release number, and on these remotes
it carries the skin. BCD is binary coded decimal, four bits per decimal digit. The earlier remotes, the
880, 885 and 525, put the skin in its low byte as a plain number; the later ones, from the Harmony One
on, write the whole word as BCD of 1000 plus the skin, so a Harmony 350's `0x1104` is skin 104. The two are
told apart by the word's value, [the
transport](usb-protocol/transport.md#bcddevice-carries-the-skin-in-one-of-two-encodings).[^s113][^s195]

**enumeration** (standard). The computer asking what is plugged in. It touches nothing; opening a remote
claims it, so anything that only needs to know what is attached enumerates and does not open.

**command protocol**, **file protocol**, **tunnelled** (this project's names). The three ways a host talks
to a remote: short commands with addresses for the Harmony One, 525, 600, 650 and 700; files opened by name
for the Harmony 300, 350 and Touch; and a datagram protocol carried inside the USB channel for the Harmony
890 and its siblings, [Architectures](architectures/README.md#three-ways-a-host-talks-to-a-remote).[^s207]

**concordance** (a third party's program). The open source tool for talking to these remotes over USB.
This reference reads it as corroboration and never as the source, [Talking to a Harmony over
USB](usb-protocol/README.md#where-it-comes-from).[^x-concordance]

**`GET_VERSION`**, **`READ_FLASH`**, **`WRITE_FLASH`**, **`ERASE_FLASH`**, **`READ_MISC`**,
**`WRITE_MISC`** (the names the protocol is known by; the firmware names nothing). The requests a host
sends: what are you, read flash, write it, erase a block of it, read one small item, write one,
[Commands](usb-protocol/commands.md#the-command-table).[^s19]

**odd count hazard** (this project's name). A read of the remote's internal memory with an odd byte count
never ends and hangs the remote, which is why the library refuses one,
[Commands](usb-protocol/commands.md#the-odd-count-hazard).[^s94]

**region descriptors**, **verdict** (this project's names). Records in the remote's memory that remember
that its configuration was checked and found good. A host drops them before writing, so the remote checks
the new bytes rather than keeping a verdict earned against the old ones,
[Commands](usb-protocol/commands.md#selector-0x02-drops-the-cached-region-descriptors).[^s246][^s250]

## Reading the firmware

**PIC18** (standard). The Microchip processor family inside these remotes; which part, and so which map of
its registers, differs per architecture, [Architectures](architectures/README.md#two-ways-to-run-a-program).[^s3]

**disassembly**, **load address** (standard). Turning firmware bytes back into instructions, which needs
the address the image was built to run at; a wrong one gives a listing that reads well and means
something else.

**entry point**, **reset vector** (standard). Where a program starts, and the fixed address the processor
starts at when it powers on.

**SFR**, special function register (standard, PIC18). An address in data memory that is really a hardware
control, for a timer, the USB port or the infrared lamp. Which address is which differs per part.

**`RETLW` table** (a standard instruction, this project's name for the pattern). A run of instructions each
returning one constant, which is how the firmware keeps its version, skin and architecture,
[the version block](usb-protocol/version-block.md#the-five-compiled-in-fields).[^s57]

**`XORLW` chain** (a standard instruction, this project's name for the pattern). How the compiler writes a
switch statement. Each literal is the XOR of one case with the next, so the case values are the running
XOR of the literals, [Commands](usb-protocol/commands.md#the-command-table).[^s19]

**watchdog** (standard). A timer that restarts the processor if the program stops resetting it. One
firmware loop resets it while stuck, which is why an odd count read hangs rather than restarts,
[Commands](usb-protocol/commands.md#the-odd-count-hazard).[^s94]

**trace** (this project's name for the method). Finding every place the firmware touches a memory address.
It is how a section was named: the firmware copies each section's pointer into a variable, and the code
that reads that variable says what the section is for, [the configuration file](config-format/README.md#the-base-slots).[^s38]

[^s273]: Measured in configurations. [Section 273](../docs/findings.md#s273)
[^s57]: Read in the firmware. [Section 57](../docs/findings.md#s57)
[^s81]: Measured in configurations. [Section 81](../docs/findings.md#s81)
[^x-forum]: Stated by a third party. [The comparison table of harmony-remote-forum.de](https://www.harmony-remote-forum.de/harmony_compare.php)
[^s218]: Stated by Logitech, by their service. [Section 218](../docs/findings.md#s218)
[^s225]: Measured in configurations. [Section 225](../docs/findings.md#s225)
[^s281]: Measured on a unit. [Section 281](../docs/findings.md#s281)
[^s76]: Measured on a unit. [Section 76](../docs/findings.md#s76)
[^s7]: Measured in configurations. [Section 7](../docs/findings.md#s7)
[^s182]: Measured in configurations. [Section 182](../docs/findings.md#s182)
[^s264]: Measured on a unit. [Section 264](../docs/findings.md#s264)
[^s197]: Stated by Logitech, in their client. [Section 197](../docs/findings.md#s197)
[^s200]: Measured on a unit. [Section 200](../docs/findings.md#s200)
[^s207]: Stated by Logitech, in their client. [Section 207](../docs/findings.md#s207)
[^s87]: Read in the firmware. [Section 87](../docs/findings.md#s87)
[^s14]: Measured in configurations. [Section 14](../docs/findings.md#s14)
[^s194]: Measured in configurations. [Section 194](../docs/findings.md#s194)
[^s20]: Measured in configurations. [Section 20](../docs/findings.md#s20)
[^s16]: Measured in configurations. [Section 16](../docs/findings.md#s16)
[^s41]: Read in the firmware. [Section 41](../docs/findings.md#s41)
[^s52]: Measured in configurations. [Section 52](../docs/findings.md#s52)
[^s138]: Read in the firmware. [Section 138](../docs/findings.md#s138)
[^s130]: Measured in configurations. [Section 130](../docs/findings.md#s130)
[^s283]: Measured on a unit. [Section 283](../docs/findings.md#s283)
[^x-manual-650]: Stated by Logitech, in the manual. [The Harmony 650 user manual](https://www.logitech.com/assets/44635/3/harmony650-user-guide.pdf)
[^s37]: Read in the firmware. [Section 37](../docs/findings.md#s37)
[^s271]: Measured in configurations. [Section 271](../docs/findings.md#s271)
[^s39]: Read in the firmware. [Section 39](../docs/findings.md#s39)
[^s176]: Read in the firmware. [Section 176](../docs/findings.md#s176)
[^s17]: Measured in configurations. [Section 17](../docs/findings.md#s17)
[^s34]: Read in the firmware. [Section 34](../docs/findings.md#s34)
[^s40]: Read in the firmware. [Section 40](../docs/findings.md#s40)
[^s55]: Measured in configurations. [Section 55](../docs/findings.md#s55)
[^s46]: Measured in configurations. [Section 46](../docs/findings.md#s46)
[^s244]: Measured in configurations. [Section 244](../docs/findings.md#s244)
[^s35]: Read in the firmware. [Section 35](../docs/findings.md#s35)
[^s60]: Measured in configurations. [Section 60](../docs/findings.md#s60)
[^s238]: Read in the firmware. [Section 238](../docs/findings.md#s238)
[^s303]: Measured on a unit. [Section 303](../docs/findings.md#s303)
[^s154]: Measured in configurations. [Section 154](../docs/findings.md#s154)
[^s156]: Measured in configurations. [Section 156](../docs/findings.md#s156)
[^s92]: Measured in configurations. [Section 92](../docs/findings.md#s92)
[^s227]: Stated by Logitech, in their catalogue. [Section 227](../docs/findings.md#s227)
[^s162]: Measured in configurations. [Section 162](../docs/findings.md#s162)
[^s32]: Measured in configurations. [Section 32](../docs/findings.md#s32)
[^s86]: Measured in configurations. [Section 86](../docs/findings.md#s86)
[^s42]: Read in the firmware. [Section 42](../docs/findings.md#s42)
[^s42b]: Measured in configurations. [Section 42](../docs/findings.md#s42)
[^s127]: Read in the firmware. [Section 127](../docs/findings.md#s127)
[^s308]: Measured in configurations. [Section 308](../docs/findings.md#s308)
[^s174]: Measured in configurations. [Section 174](../docs/findings.md#s174)
[^s3]: Read in the firmware. [Section 3](../docs/findings.md#s3)
[^s118]: Measured on a unit. [Section 118](../docs/findings.md#s118)
[^s189]: Read in the firmware. [Section 189](../docs/findings.md#s189)
[^s19]: Read in the firmware. [Section 19](../docs/findings.md#s19)
[^s113]: Read in the firmware. [Section 113](../docs/findings.md#s113)
[^s195]: Measured on a unit. [Section 195](../docs/findings.md#s195)
[^x-concordance]: Stated by a third party. [concordance](https://github.com/jaymzh/concordance)
[^s94]: Read in the firmware. [Section 94](../docs/findings.md#s94)
[^s246]: Read in the firmware. [Section 246](../docs/findings.md#s246)
[^s250]: Read in the firmware. [Section 250](../docs/findings.md#s250)
[^s38]: Read in the firmware. [Section 38](../docs/findings.md#s38)
