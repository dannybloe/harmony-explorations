# The configuration file

A Harmony does nothing by itself. Everything it knows about a household, which devices there are, what
each button sends, what the screen shows and what happens when an activity starts, comes from one file:
Logitech's software compiles it from the choices a person made in Logitech's program or on their
website, and writes it into the remote's flash. This reference calls that file the **configuration**.

A configuration is closer to a program than to a settings file. The remote's firmware is an interpreter
and the configuration is what it runs: a button press looks up a short list of instructions and runs
it,[^s34] a screen is a small program in a drawing language,[^s40] an infrared code is stored as the
timings of a lamp blinking,[^s32] and the state of every device, whether it is on and which input it is
set to, is a numbered variable those instructions read and write.[^s35] So the firmware is the authority
on what a field means, and most of these pages were found by reading the code that consumes each field.

**It is one format across every remote from the Harmony 880 on that has been read**, six architectures:
each family marks its configuration with four letters of its own, and behind them the layout is the
same.[^s14][^s194] Where a fact holds for fewer architectures than that, the page says which.

```
EZHex header                   XML, read by the host software and never written to the remote
container header               cookie, end address, pointer count, the section table
  base slot 0                  the name tree, the one 0xFEED ... 0xBEEF frame in the container
  base slot 1                  up to seven bytes stating the architecture
  ...                          the other sections, unframed, each reached through the table
checksum and end marker
```

## How to read these pages

* **A section is named by its base slot**, a number from 0 to 19 that means the same section on every
  architecture; [the container](container.md#one-table-four-architectures) says how each architecture's
  own slot numbers map onto it.
* **Addresses are flash addresses**, little endian, three bytes wide inside the container, and a
  container is built for the place in flash it will occupy.[^s7]
* **Every fact carries a footnote** saying what kind of evidence it rests on: read in the firmware,
  measured on a unit, measured in configurations (counted over compiled configuration files), stated by
  Logitech, or not checked. The footnote links to the argument, as [the reference's introduction](../README.md)
  describes.
* **Logitech's own compiler** decides much of what is in a file that the remote does not demand; that is
  [the layout](layout.md), kept apart from what the format requires.

## Pages

From the outside in:

* [The EZHex wrapper](ezhex.md): the file a host receives, and the header that says which remote it is for.
* [The container](container.md): the header, the cookies, the section table, the checksum, the pointer
  arrays and the slot map of each architecture.
* [Header records](header-records.md): base slots 0, 1 and 3, the names, the architecture and the build
  time.
* [Modes and keys](modes-and-keys.md): base slots 6, 8, 9 and 17, tagged lists and the key table.
* [Activities and devices](activities-and-devices.md): which key starts which activity, which devices a
  configuration drives, and the structures an activity is built from.
* [Actions](actions.md): base slot 10 and the action list language.
* [State](state.md): base slots 2, 4, 12, 13, 14, 15 and 16.
* [Screens](screens.md): the screen language, pictures, fonts and text.
* [Infrared records](infrared-records.md): base slot 5.
* [Layout](layout.md): how Logitech's compiler places and orders a container.
* [Relocation](relocation.md): what growing a section moves.

## The base slots

**Every one of the twenty base slots is accounted for.** Slots 0 and 1 are header records the host
reads, slots 2 to 17 are sixteen sections the firmware reads, and 18 and 19 are NULL in every container
of the four architectures that share the base layout.[^s20][^s47] Each section was named by finding the
firmware code that consumes it: the firmware copies each pointer into a variable of the subsystem that
uses it, so the code that reads that variable says what the section is for. Every slot from 2 to 19 has a
located consumer on the Harmony 700, the 600 and the One.[^s35][^s38]

| slot | what it is | page | evidence |
|---|---|---|---|
| 0 | the **name tree**: a `0xFEED` framed tree of names, which say what each state variable is for and which device it belongs to | [header records](header-records.md) | [^s77] |
| 1 | the **architecture record**: up to seven bytes stating the architecture and the model, the only place a configuration states either | [header records](header-records.md) | [^s15] |
| 2 | the **log area**: three numbers reserving a region of flash above the configuration that the firmware appends to and never erases | [state](state.md) | [^s47] |
| 3 | the **build timestamp**, which the firmware measures the configuration's age from | [header records](header-records.md) | [^s21], [^s138] |
| 4 | the **firmware event map**: thirty events, each naming a mode | [state](state.md) | [^s36] |
| 5 | the **infrared database**: one group per device, then records | [infrared records](infrared-records.md) | [^s32] |
| 6 | the **mode table**: a mode carries a screen program and an array of pages, each with a tagged list | [modes and keys](modes-and-keys.md) | [^s37] |
| 7 | the **font table**, indexed by opcode 16 of the screen language | [screens](screens.md) | [^s40], [^s46] |
| 8 | **the screen keys' bindings**: one leading action list, then every mode page's list | [modes and keys](modes-and-keys.md) | [^s27] |
| 9 | the **key map table**: lists of button bindings, pushed onto a key lookup stack when a mode is entered and removed when it is left | [modes and keys](modes-and-keys.md) | [^s39], [^s176] |
| 10 | the **action list table** | [actions](actions.md) | [^s17], [^s34] |
| 11 | the **screen program table**: programs in the screen language | [screens](screens.md) | [^s40] |
| 12 | the **timer table**: wait, then queue one instruction | [state](state.md) | [^s43] |
| 13 | the **state variable table**: a range per variable, and transitions carrying one instruction; its first variables are the firmware's own, the clock among them | [state](state.md) | [^s35], [^s138] |
| 14 | the **state value map**: what a state variable's value means, indexed by opcode `0x72` | [state](state.md) | [^s39] |
| 15 | the **parameter block**: numbered groups of 16 bit constants, every length checked by the firmware | [state](state.md) | [^s44] |
| 16 | the **number sender**: how a device is sent a number one digit at a time, for favourite channels | [state](state.md) | [^s39], [^s154] |
| 17 | the **touch screen hit map** on the Harmony One, indexed by a mode page's `lead` byte; elsewhere it names where the picture bank starts | [modes and keys](modes-and-keys.md) | [^s45], [^s62] |
| 18, 19 | NULL | [the container](container.md) | [^s20] |

**Most of a configuration's bytes are pictures**, in one array from the end of the named sections to the
checksum, with no table and no count of its own: [screens](screens.md).[^s55] And six of the sections
above are arrays of three byte pointers into the rest, [the container](container.md).[^s16]

**Every byte of a configuration belongs to a known structure.** On eighteen of the nineteen containers of the
corpus no byte is left unclaimed and none is claimed twice; the nineteenth, the Harmony 525's safe mode
container, has structures left rather than stray bytes.[^s84] The last bytes to be placed were a screen
program's terminator, a section's zero tail and an empty mode record's wide form, each on the page of its
structure.[^s84]

[^s34]: Read in the firmware. [Section 34](../../docs/findings.md#s34)
[^s40]: Read in the firmware. [Section 40](../../docs/findings.md#s40)
[^s32]: Measured in configurations. [Section 32](../../docs/findings.md#s32)
[^s35]: Read in the firmware. [Section 35](../../docs/findings.md#s35)
[^s14]: Measured in configurations. [Section 14](../../docs/findings.md#s14)
[^s194]: Measured in configurations. [Section 194](../../docs/findings.md#s194)
[^s7]: Measured in configurations. [Section 7](../../docs/findings.md#s7)
[^s20]: Measured in configurations. [Section 20](../../docs/findings.md#s20)
[^s47]: Read in the firmware. [Section 47](../../docs/findings.md#s47)
[^s38]: Read in the firmware. [Section 38](../../docs/findings.md#s38)
[^s77]: Measured in configurations. [Section 77](../../docs/findings.md#s77)
[^s15]: Measured in configurations. [Section 15](../../docs/findings.md#s15)
[^s21]: Measured in configurations. [Section 21](../../docs/findings.md#s21)
[^s138]: Read in the firmware. [Section 138](../../docs/findings.md#s138)
[^s36]: Read in the firmware. [Section 36](../../docs/findings.md#s36)
[^s37]: Read in the firmware. [Section 37](../../docs/findings.md#s37)
[^s46]: Measured in configurations. [Section 46](../../docs/findings.md#s46)
[^s27]: Measured in configurations. [Section 27](../../docs/findings.md#s27)
[^s39]: Read in the firmware. [Section 39](../../docs/findings.md#s39)
[^s176]: Read in the firmware. [Section 176](../../docs/findings.md#s176)
[^s17]: Measured in configurations. [Section 17](../../docs/findings.md#s17)
[^s43]: Read in the firmware. [Section 43](../../docs/findings.md#s43)
[^s44]: Read in the firmware. [Section 44](../../docs/findings.md#s44)
[^s154]: Measured in configurations. [Section 154](../../docs/findings.md#s154)
[^s45]: Read in the firmware. [Section 45](../../docs/findings.md#s45)
[^s62]: Measured in configurations. [Section 62](../../docs/findings.md#s62)
[^s55]: Measured in configurations. [Section 55](../../docs/findings.md#s55)
[^s16]: Measured in configurations. [Section 16](../../docs/findings.md#s16)
[^s84]: Measured in configurations. [Section 84](../../docs/findings.md#s84)
