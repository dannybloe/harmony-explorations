# Logitech's clients

A person set up a Harmony with a program on their computer, and Logitech made three of them over the
remotes' life: the **classic client**, the Harmony Remote Software the oldest remotes were set up with,
whose service is now closed[^x-notice]; **MyHarmony**, which carried the later remotes on, among them the
Harmony One, 600, 650, 700, 300 and 350[^x-notice][^x-versiondb]; and **Harmony Desktop**, a later
application that still programs a Harmony 700[^s296]. Each remote also came with a **user manual**. All
four are Logitech's own statements about the product, and each is good for something different.

| source | what it is | what it is good for |
|---|---|---|
| the classic client | a Java desktop application, not obfuscated[^t-host-client] | what is sent to a remote, packet by packet, and what Logitech believed about each architecture's memory, [on the wire](classic-client.md) |
| MyHarmony | a Silverlight application in a Chromium shell, fetched from Logitech's servers when it runs[^unchecked] | which call to make to the service, in which order and with which arguments; its generated service proxy is [the data model](data-model/model.md) |
| Harmony Desktop | a native shell around a hosted web application[^s197] | the per model packet templates of the file based remotes, and the calls it declares to the service |
| the user manuals | documentation written for owners[^s42] | what a feature was for, and what the remote does from the point of view of somebody holding it |

**None of them is the authority on what a remote does; the firmware is.** A client says what one host
sent and believed, so a fact resting on a client alone carries "Stated by Logitech, in their client", and
where the firmware has been read and the two disagree, the firmware wins[^d9]. One client is wrong about
an architecture's own container layout, [the classic client](classic-client.md).

## The classic client

**It is the software that drove these remotes for a decade, and it executes rather than builds.** It
carries no container cookie anywhere and models no activity and no codeset: a configuration reaches it
from the service as finished bytes, and every class named for a device is transport or an
exception[^t-host-client]. What it does to a remote is [its own page](classic-client.md).

**It has three transports, chosen from the product id**: one for the remotes this reference reads over
USB, and two more for platforms that speak something else[^s207]. Its tables of platforms and skins are
[the architectures](../architectures/README.md#platforms-and-product-ids) and
[the remotes index](../remotes/README.md#where-the-skin-numbers-come-from).

**A learned code is measured on the host and judged on the server.** The client measures the carrier
from the remote's own cycle count, adds adjacent durations of one kind together rather than appending
them, and accepts a capture only by a window on its duration; whether a capture is usable comes back from
the server, and nothing on the host classifies it[^t-host-client]. The service that does it is
[the analysis service](service.md#the-analysis-service).

**Teaching is driven by the server in both eras.** The classic client fetches a list of commands to
teach by name, walks it, captures each and uploads it, with an empty capture for a command the person
skipped, and teaches a single power toggle when the list is empty. It uploads a capture as XML: a
carrier frequency and a sequence of pulses and spaces in microseconds, where Harmony Desktop sends
the one string [the analysis service](service.md#the-analysis-service) takes. Both merge two
intervals of the same kind into one[^unchecked].

## MyHarmony

**MyHarmony keeps no protocol of its own.** Its USB layer carries no command byte: every operation is a
string name, resolved against XML the server sends when it runs, with a packet writer and interpreter per
platform family that assemble packets from that script[^unchecked]. Nor does it model a physical keypad:
there is no row, column or scan code anywhere in it, and its button mapping utilities are the on screen
keyboard's[^unchecked]. Buttons are named entities that come from the server, and the firmware resolves
the name, which is the conclusion the firmware gave independently[^s48].

**Its sync chooses a route from the product's declared capabilities.** A product declaring
`LocaleEnabled`, a Harmony One or a Harmony 600, is compiled; a product declaring provisioning support, a
Harmony Touch, is provisioned and never compiled[^s202][^t-host-client]. The calls are
[the service](service.md#compiling).

**It holds the shape of its guided setup**: six workflow manifests, for signing in, managing an account,
the dashboard, adding a device, setting up an activity and syncing a remote, each a state machine with one
view per screen and the conditions that move between them[^unchecked]. They are the only surviving
statement of what Logitech asked its users, in what order, per device and per activity, and so a list of
the settings a configuration must hold somewhere. Not read beyond that inventory[^unchecked].

## Harmony Desktop

**Its native half is a transport and knows nothing else**: a HID channel with a read and a write, a
command object holding outgoing packets, an expected packet count and a timeout, and a device record of
vendor id, product id, version, report lengths and skin. No command name, no opcode and no configuration
structure is in it[^s197].

**The protocol is data, served per model.** The hosted application builds each command out of XML
attributes, and the packet layout for a model is one file per operation per skin, twenty three skins in
all, served from Logitech's content network and listed in the client's own cache manifest[^s197]. Two
things in it are this reference's only source: the **per skin protocol templates** of the file based
remotes, [the file protocol](../usb-protocol/file-protocol.md), and the **encoder** for a file request's
parameters, both confirmed against a Harmony Touch[^s198][^s200].

**It reads differently from MyHarmony where the two overlap, and MyHarmony describes these remotes.**
Everything Harmony Desktop can do MyHarmony can do as well, so a reading taken off Harmony Desktop
describes the later generation it was written for. Where the two disagree, MyHarmony's reading is the one
that holds for the Harmony One, 600, 650 and 700[^d9].

## The user manuals

**A manual is weak on mechanism and strong on intent**, the opposite of the firmware: it does not say what
a packet looks like, it says what the system was for. The one that settled most is the Harmony 880's,
which says that a learned code is uploaded to Logitech's web site, that the site looks for a matching
pattern, and that a match is stored in a compact form while a miss is stored as it was captured. That is
why three of the four infrared encoding classes appear in no configuration[^s42].

The manuals describe the product as a person meets it, and [how a Harmony works](../how-a-harmony-works.md)
quotes them. The models they cover are [the product line](product-line.md).

[^x-notice]: Stated by Logitech. [The discontinuation notice](https://members.harmonyremote.com/EasyZapper/Help/FAQShowById.asp?FaqId=1220)
[^x-versiondb]: Stated by Logitech. [MyHarmony's firmware version list](https://files.myharmony.com/Assets/Firmware/VersionDbDefaults2.xml)
[^s296]: Measured on a unit. [Section 296](../../docs/findings.md#s296)
[^t-host-client]: Stated by Logitech, in their client. [The test](../../tests/test_host_client.py)
[^unchecked]: Not checked.
[^s197]: Stated by Logitech, in their client. [Section 197](../../docs/findings.md#s197)
[^s42]: Stated by Logitech, in the manual. [Section 42](../../docs/findings.md#s42)
[^d9]: Chosen by this project. [Decision 9](../../docs/decisions.md#d9)
[^s207]: Stated by Logitech, in their client. [Section 207](../../docs/findings.md#s207)
[^s48]: Read in the firmware. [Section 48](../../docs/findings.md#s48)
[^s202]: Stated by Logitech, in their client. [Section 202](../../docs/findings.md#s202)
[^s198]: Stated by Logitech, in their client. [Section 198](../../docs/findings.md#s198)
[^s200]: Measured on a unit. [Section 200](../../docs/findings.md#s200)
