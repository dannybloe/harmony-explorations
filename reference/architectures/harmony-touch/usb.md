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

**On the provisioning route the remote is the client and the computer is its network**, and in the sync
measured the whole proxy conversation went through **one file on the remote, `/sys/hlapi`**: the computer
opens it for writing, writes one request, closes it, opens it for reading and reads the answer[^t-touch-sync]. A request is a line of text
naming an area and a command, `vnd.logitech.setup/vnd.logitech.sync` for example, with its arguments URL
encoded after it; an accepted request is answered with the word `Response`, a comma and JSON, and a long
request is announced first by a `Content-Length` line[^t-touch-sync]. The seven skin 99 templates in Harmony
Desktop's client that name `/sys/hlapi` use only open, write, read and close[^t-templates-hlapi]. The sync
measured, on a Harmony Touch through Harmony Desktop, ran in this order[^t-touch-sync]:

1. the computer asks the remote to sync its own changes, then asks it for work, a proxy read naming a
   session; the remote asks for nothing but `proxy://Finished`, which is acknowledged
2. the computer reads the remote's provisioning information, then tries two writes the remote refuses, one
   of them its clock
3. it tells the remote to sync and asks for work again; the remote answers with six web requests, each the
   verb `get`, a **logical** address in Logitech's own scheme, `harmony://...`, and an entity tag
4. the computer performs them against Logitech's service and writes all six answers back in one request,
   each the document with its status, type and entity tag
5. it asks again, and the loop ends when the remote asks for `proxy://Finished`, which is acknowledged

The write to the clock was the time and a time zone into `/sys/time`, and **the remote refused it** with the
error marker[^t-touch-sync]; whether the clock is set some other way is not checked[^unchecked].

**In the sync measured, the remote's configuration was six documents of Logitech's service**: the account's
activity, device, button map and protocol lists, and the remote's context and settings, each the same JSON
the service answered the computer, re-serialised compact by the client[^t-touch-sync]. They are Logitech's own data model,
[the data model](../../logitech/data-model/model.md). **So the host holds no compiled configuration for a
Touch**, and no amount of asking the service differently produces a file[^s202][^s203].

> This page said the whole conversation rides on the file protocol's request and response command, `0x08`,
> which carries no file<!--superseded-->, and that the remote asks by absolute address with a resource name
> in each request, until a recorded sync showed neither: it sent no `0x08`, the addresses were logical and a
> get carried no body[^t-touch-sync]. The reading came from MyHarmony's proxy loop, with the command
> attributed by its description, while the client's own templates named `/sys/hlapi` all
> along[^t-templates-hlapi].

**Reading a configuration back is switched off in Logitech's own template.** The template that writes a
Touch's user configuration carries the read of the same file commented out, under a header calling it "for
testing only"[^s198], and a Touch has no file at the Harmony 300 and 350's configuration path[^s200].

## Not checked

* Whether the other products of the generation declare the same capabilities as the Touch[^unchecked].
* The request and response command `0x08`, which a sync does not use[^t-touch-sync]; what it is for[^unchecked].
* What a remote asks for when the account holds favourites, sequences or pictures; the sync measured asked for
  none of them[^unchecked].
* Whether MyHarmony, or another product of the generation, syncs the same way[^unchecked].

[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s202]: Stated by Logitech, in their client. [Section 202](../../../docs/findings.md#s202)
[^s135]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-templates-hlapi]: Stated by Logitech, in their client. [The test](../../../tests/test_client_templates.py)
[^unchecked]: Not checked.
