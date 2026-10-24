# Harmony Touch: the platform on the cable

A remote of this generation is talked to over USB by **opening a named file**, reading or writing through a
handle and closing it, rather than by asking for bytes at an address[^s198]. Its configuration does not
travel that way as a file at all: the remote fetches what it needs through the computer, which only carries
the requests[^s203]. The protocol itself is [the file protocol](../../usb-protocol/file-protocol.md); this page
is what this generation does with it. What this library does with a Touch, and the two files it has read,
is [the Touch's usb.md](../../remotes/harmony-touch/usb.md).

## Two protocols, chosen by the architecture number

Logitech's client picks a protocol from the architecture number: 9, 12 and 14 are its "legacy" list and take
the command protocol of the Harmony 525, One, 600, 650 and 700, and every other number takes the file
protocol[^s197]. Its templates divide the same way: 19 of their 23 skins take the file protocol and none
takes both[^s198]. So 17 and 18, the two numbers this generation is given, get the same answer, which is
why the client never notices that a Touch and its template disagree about which of the two it is,
[README.md](README.md).

The Harmony 300 and 350 speak the file protocol too, and that is where its transport's rails are argued,
[their usb.md](../harmony-300-350/usb.md). What differs on this generation is below.

## A write is checked by the remote, with `MD5`

A write through the file protocol ends with the host handing the remote five checksum parameters, a type, a
seed, an offset, a length and an expected value, and the commit runs only if the remote answers that the
file matches[^s198]. **On this generation the type is `MD5`, with seed 0**, in the Touch's package and the
Ultimate Hub's; on the Harmony 300 and 350 it is an XOR of 16 bit words with seed `0x4321`[^s198]. What a
remote answers to a write is not checked[^unchecked].

## Provisioning instead of a compile

**Logitech's service does not compile a configuration for a Touch, and MyHarmony never asks it to.** The
client chooses a sync route from the capabilities the product declares[^s202]:

| the product declares | the route | what happens |
|---|---|---|
| `SupportsCertificateActivation` or `SupportsProvisioning` | provisioning | the configuration is marked not required and the remote is provisioned |
| `LocaleEnabled` | compile | the service compiles, the client downloads the file and writes it |

A Harmony Touch declares `SupportsCertificateActivation` and not `LocaleEnabled`; a Harmony One and a
Harmony 600 declare the reverse[^s202]. Harmony Desktop agrees from its own side: of the skins it supports,
it compiles for every one but 99, 102 and 112, the Touch, the Ultimate One and the 950[^s135].

**On the provisioning route the remote is the client and the computer is its network.** The desktop
application opens a session and then loops[^s203]:

1. it asks the remote for work, with a request naming a proxy read and the session
2. the remote answers with a list of web requests, each a verb, an absolute address, a resource name and an
   entity tag
3. the application performs them and writes each answer back to the remote
4. two request forms end the loop, one meaning finished and one meaning abort, and both are acknowledged

A separate instruction then tells the remote to sync. The remote asks for what it wants by absolute address,
image assets from a content network outside Logitech's own service among them[^s203]. **So for this
generation the host never holds the configuration**, and no amount of asking the service differently
produces a file[^s203].

The whole conversation rides on the file protocol's request and response command, `0x08`, which carries no
file[^s203]. Recording what a remote asks for would give its configuration in Logitech's own terms, and
nothing here has sent that command[^s203].

**Reading a configuration back is switched off in Logitech's own template.** The template that writes a
Touch's user configuration carries the read of the same file commented out, under a header calling it "for
testing only"[^s198], and a Touch has no file at the Harmony 300 and 350's configuration path[^s200].

## Not checked

* Whether the other products of the generation declare the same capabilities as the Touch[^unchecked].
* The request and response command, its encoding and the session handshake[^unchecked].

[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s202]: Stated by Logitech, in their client. [Section 202](../../../docs/findings.md#s202)
[^s135]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^unchecked]: Not checked.
