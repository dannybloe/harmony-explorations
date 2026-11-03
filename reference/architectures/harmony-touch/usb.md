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
why nothing in the client depends on which of the two a Touch is,
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
Desktop's client that name `/sys/hlapi` use only open, write, read and close[^t-templates-hlapi].

**A sync goes two ways, and the two are separate conversations.** Changes made on the remote go up, when the
client asks for them; the account comes down. Both were measured on a Harmony Touch through Harmony Desktop.

**Up, the remote's own changes**, measured once, a hand over of changed settings[^t-touch-both-ways]:

1. the computer asks the remote to sync its own changes, then asks it for work, a proxy read naming a
   session
2. the remote answered with one `put` request: the logical address of its settings and **the whole settings
   document**, URL encoded, with no entity tag; the document differed from the one last delivered in three
   settings, the screen and button brightness and the background
3. the computer sent that document to Logitech's service, the same as parsed JSON, and wrote the service's
   answer back to the remote, again the same document, with its status, type and entity tag
4. asked for work again, the remote asked for `proxy://Finished`, which is acknowledged; and when the
   computer asked a second time for the remote's changes, the remote had none and asked for
   `proxy://Finished` only

With nothing changed on the remote, the first list held only `proxy://Finished`[^t-touch-sync]. **The client
asks for the remote's changes only when the account has no sync pending**, among its other conditions: with
edits waiting on the account, it goes straight to the sync down[^t-client-reverse-sync]. A sync down measured
after edits on the account sent no request for the remote's changes, which is consistent with
that[^t-touch-both-ways]. What then becomes of changes waiting on the remote is not checked[^unchecked].

**Down, the account**, measured twice, on an account without favourites or pictures and on one with
both[^t-touch-sync][^t-touch-both-ways]:

1. the computer reads the remote's provisioning information, then tries two writes the remote refuses, one
   of them its clock
2. it tells the remote to sync and asks for work; the remote answers with six web requests, each the verb
   `get` and a **logical** address in Logitech's own scheme, `harmony://...`, with an entity tag: on all six
   in one sync measured, on all but the settings in the other; the settings going untagged is consistent
   with the remote saving them without a tag when a setting is changed on it, [favourites and settings](favourites-and-settings.md#settings-field-by-field)[^t-touch-favourites-firmware]
3. the computer performs them against Logitech's service and writes all six answers back in one request,
   each the document with its status, type and entity tag
4. with favourite channels on the account, the remote then handed over an empty list, and after it asked for
   one content address at a time: one `content://1.0/user;...`, one `content://1.0/device;...` and one
   `content://1.0/service/<id>`
5. then for its pictures, in one list: the user's own, a background and its small twin, by **absolute**
   `https` address on Logitech's user image store, and the channel logos by the logical scheme,
   `content-image://1.0/station/...`, or `content-image://1.0/image/...` for a logo the user uploaded; each
   answered as a PNG, `image/png`, in base64
6. it asks again, and the loop ends when the remote asks for `proxy://Finished`, which is acknowledged

Without favourites or pictures, steps 4 and 5 were absent and the remote asked for `proxy://Finished`
straight after the six[^t-touch-sync].

The write to the clock, in both syncs down, was the time and a time zone into `/sys/time`, and **the remote
refused it** with the error marker[^t-touch-sync][^t-touch-both-ways]; the hand over of changes wrote
nothing to it[^t-touch-both-ways]. Whether the clock is set some other way is not checked[^unchecked].

**The remote's configuration is documents of Logitech's service**, in the syncs measured: the account's
activity, device, button map and protocol lists, the remote's context and settings, and, with favourites,
the user's, device's and service's content documents, [favourites and settings](favourites-and-settings.md), each as parsed JSON the same the service answered the
computer, and every picture byte for byte the one fetched[^t-touch-sync][^t-touch-both-ways]. They are
Logitech's own data model, [the data model](../../logitech/data-model/model.md). **So the host holds no
compiled configuration for a Touch**, and no amount of asking the service differently produces a
file[^s202][^s203].

**What a host other than Logitech's server would have to answer, and what the remote checks of each answer, is
[answering a sync](answering-a-sync.md).** Every name the remote answers on the cable and every request its
engine takes through `/sys/hlapi` is [the API](api/README.md).

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
* What a remote asks for when the account holds a Sonos, Roku, speaker or home control device, which the
  syncs measured did not involve[^unchecked].
* What a remote hands up for a change other than a setting, a favourite's order or a command[^unchecked].
* Whether MyHarmony, or another product of the generation, syncs the same way[^unchecked].

[^s198]: Stated by Logitech, in their client. [Section 198](../../../docs/findings.md#s198)
[^s203]: Stated by Logitech, in their client. [Section 203](../../../docs/findings.md#s203)
[^s197]: Stated by Logitech, in their client. [Section 197](../../../docs/findings.md#s197)
[^s202]: Stated by Logitech, in their client. [Section 202](../../../docs/findings.md#s202)
[^s135]: Stated by Logitech, in their client. [Section 135](../../../docs/findings.md#s135)
[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^t-templates-hlapi]: Stated by Logitech, in their client. [The test](../../../tests/test_client_templates.py)
[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^t-client-reverse-sync]: Stated by Logitech, in their client. [The test](../../../tests/test_client_templates.py), class `TheClientAsksForTheRemotesChangesOnlyWithNothingPending`
[^t-touch-favourites-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites.py)
[^unchecked]: Not checked.
