# Harmony Touch: answering a sync in place of Logitech's server

A Harmony Touch does not take a compiled configuration from a computer. It asks for its own documents and
pictures, one at a time, and something on the other end of the cable answers; in the syncs recorded that
something was Logitech's own client, which fetched each answer from Logitech's service and handed it back,
[usb.md](usb.md). This page is what the remote checks of those answers, and so what a program other than
Logitech's would have to produce to answer a sync itself.

**Everything here is read in the remote's firmware, production build 4.15.330, and measured in recorded
syncs of Logitech's client; the preview build's engine was not read for this page. Nothing of ours has
answered a sync on a remote**: the rules below are what the firmware does with an answer, not what a remote
was seen to do with one of ours[^t-touch-host]. Where a
rule has only been seen to hold for Logitech's own answers, the page says so. The test behind the firmware
footnotes asserts, function by function, the names and constants each rule rests on; the order in which a
function uses them, and so which check comes first, is the decompiled reading named in that test's header
and is not asserted by it[^t-touch-host].

## The remote cannot tell one answerer from another

The remote names no server, asks for no certificate of whoever answers, and checks no signature on a
document[^t-touch-host]. The addresses it asks by are logical, `harmony://...`, and whoever answers resolves
them; its own certificate travels the other way, inside the request that pairs it to an account, for the
service to judge[^t-touch-host]. **On the Harmony Touch a further check is switched off as well**: its
host name is `juniper`, and on that name the engine's default verifier accepts every command asked of it, so
none of the commands on this page meets a token, a policy or a scope[^t-touch-host]. A command may still
carry checks of its own before that one, such as whether the remote is provisioned or a sync is already
running, and the hubs, which run the same engine under other host names, take the verifier's other branches
and are not checked here[^t-touch-host][^unchecked]. So a program of this project could answer every request a sync makes,
and the remote would take the answers as it takes Logitech's.

**What binds the remote to an account is nothing more than two numbers it carries itself**, the account and
remote numbers it builds into the addresses of its own documents[^t-touch-host]. An answerer reads those
off the remote and echoes them, and may put anything behind them. The remote's own safety rests on the
service it talks to, not on anything it verifies; a write to a Touch is a separate step with its own rail,
[decision 29](../../../docs/decisions.md#d29)[^d29].

## What the remote checks of an answer

It does not check a document's contents, and it does check the envelope around it[^t-touch-host].

**The address is matched exactly.** An answer is paired to the request that asked for it by its address,
character for character; an answer for an address the remote did not ask for finds no pending request, runs
nothing and is dropped[^t-touch-host]. So an answerer cannot push a document the remote did not ask for,
and an answer whose address has been rewritten, an absolute web address for a logical one, is ignored. The
order of the answers does not matter, and all of a list may arrive in one write or in several; the
configuration is reloaded on whichever answer is the last one still outstanding[^t-touch-host]. Every answer
Logitech's client wrote in the recorded syncs names an address the remote had asked for, and no answer named
one it had not[^t-touch-answers].

**The status is read as text, and only some values pass.** For one of the six core documents a status of
200 or 304 is taken and anything from 400 up aborts the whole sync; a favourites document aborts the same
way but for one allowed 404, on the user's own favourites; a picture's failure is logged and never
aborts[^t-touch-host]. An answer for a document or a favourites document with no status makes the remote's
handler raise an error before the answer is looked at: the write is answered 500, nothing aborts and the
request stays outstanding; a picture with no status is not saved and aborts nothing[^t-touch-host]. Every
answer in the recorded syncs carried a status of 200[^t-touch-answers].

**A 200 needs an entity tag.** For any of the six a 200 must carry a non empty tag, the one exception being
an activity list that holds no activities, which is how the firmware expects a fresh account to look; a
favourites document or a picture needs a tag on every answer, a 304 included, or it is not saved[^t-touch-host].
The tag is otherwise opaque: stored as given and sent back as given[^t-touch-host]. In the recordings every
answer for one of the six carried a tag, and Logitech's were shaped like the identifiers it uses
elsewhere[^t-touch-answers].

**A long answer is announced first.** An answer longer than one write is announced by a `Content-Length`
line before the write that carries it, and the remote's local listener gathers the following writes until it
holds at least that many bytes before it acts on them; the announcement belongs to the write of an answer
and to no other request[^t-touch-host]. Logitech's client announced every answer write, short ones included,
and the largest single answer write measured carried 571560 bytes[^t-touch-answers].

**The number announced falls short of what the remote counts.** The listener counts the line from the
request's name on, and takes the announcement's text wherever it sits in a line[^t-touch-host]. Logitech's
client announces the length of the `responses` argument alone, as written, which is the line less its name,
`&sessionId=`, the session id and `&responses=`: 101 to 104 characters short in the recordings, over all
twelve announcements of the three syncs[^t-touch-answers]. The client writes a long line in chunks of 31000
characters and the remote hands each chunk to the listener as it arrives, so for a line of more than one chunk
the listener holds the announced number **one chunk early when the last chunk is no longer than that
shortfall**, and acts on a line whose `responses` stops short, which the engine answers as JSON it cannot
decode; the last chunk then arrives as a line of its own. That the remote hands on each chunk is read in its
native program and not tested here[^unchecked]. Four of the recorded writes went in more than one chunk and
the shortest last chunk was 2276 characters, so the recordings never met it[^t-touch-answers]. An answerer
that announces a number the listener can count to, or never ends a line in so short a chunk, avoids it.
The whole line's length is that number: the listener answers each chunk with a request for more while it
holds fewer characters than announced and acts once it holds at least as many, so it acts exactly as the
last chunk arrives, whatever that chunk's length[^t-touch-host]. **This project's answerer announces the
whole line's length**, where Logitech's client announces the `responses` argument[^d29]. Neither has been
tried on a remote[^unchecked].

## What the remote does not check, and why an answerer still has to be careful

The remote does not check that a document holds what the reader of it needs. A document that is valid but
missing a field the reader requires is saved, and the failure comes later, when the engine reads the new set
and the reader raises an error inside it[^t-touch-host]. So an answerer carries the reader's requirements
itself, the way a writer for the older remotes refuses an impossible sequence rather than warning about it.
What each document must hold is the "what a writer must carry" section of its own page,
[devices and infrared](devices-and-infrared.md#what-a-writer-must-carry) and
[activities and buttons](activities-and-buttons.md#what-a-writer-must-carry); at the least, each of the four
documents the engine reads must hold its top level array, which may be empty, and the settings document its
own[^t-touch-host]. **So must three lists inside them**: each device's `DeviceFeatures`, each button map's
`Buttons` and each sequence's `Actions`, which the reader walks without testing them first, where it does
test the lists it can meet as null, such as an activity's roles or a map's sequences[^t-touch-recovery]. A
null in one of the three is therefore taken to stop the reader as a missing one does, which is inferred from
those tests rather than read in the decoder[^unchecked].

**A document has to arrive as the object itself, not as a string holding one, and nothing on arrival checks
which it is.** The remote stores a document as the JSON encoding of its `resource`, so an object is stored as
that object and a string of JSON as a JSON string; the engine reads that string back as text, finds none of
the document's arrays, and its reader raises an error inside the load. An activity list sent as a string and
without a tag fails sooner, inside the handling of the answer, and that write is answered with a server
error, not an abort[^t-touch-host]. A picture is base64, decoded without a check, and its type chooses the
file's extension, `image/png` giving a PNG; the type of a document is not read, since the kind is taken from
the address instead[^t-touch-host]. In the recordings every document answer was a JSON object and every
picture was a PNG handed over as `image/png`[^t-touch-answers].

## How a sync aborts, and how an answerer learns of it

The remote's reply to a write does not say whether its answers were taken: an answer it refuses, by its
status or because handling it fails, is answered 200 like any other[^t-touch-host]. Two replies do differ: a
write that is not valid JSON is answered 598, and one that makes the handler raise an error, an answer with
no status among them, is answered 500 and aborts nothing[^t-touch-host].

**A refusal reaches the answerer in two steps, through the remote's screens.** The engine empties its queue
of requests, the remote's own changes still waiting to go up included, and announces a failed sync, status
553, to the screens; it leaves the set it was gathering where it is and does not reload the
engine[^t-touch-host]. The screens, on that announcement and while they hold a sync as running, ask the
engine to abort with code 553 and a message naming a failure in the engine; that deletes the half gathered
set, reloads the engine from the old configuration, and only then queues `proxy://Abort`, carrying the
firmware version, that code and that message[^t-touch-host]. On success the screens ask for the finish, and
`proxy://Finished` is queued[^t-touch-host]. A request list can be empty straight after a refusal, and also
between the core documents and the favourites and before the finish, so an empty list tells an answerer
nothing; it keeps reading until `proxy://Abort` or `proxy://Finished` arrives[^t-touch-host]. That the
screens send the abort on a unit, and how soon, is not checked[^unchecked].

The commit happens before the answerer sees `proxy://Finished`:
the remote's own screens decide the fetching is done and the engine swaps the new set in, and only then is
`proxy://Finished` queued, so the answer to it changes nothing and an answerer can only stop, or abort,
before that point[^t-touch-host]. An answerer's own way to abort is to ask the remote to, which deletes the
half written set, reloads the old one and queues `proxy://Abort` with the answerer's own code and
message[^t-touch-host].

## The smallest set of documents

All six core documents are asked for in every sync down, and a status from 400 up on any of them aborts, so none can
be left out; one the remote already holds can be answered 304 against the tag it sent[^t-touch-host]. A fresh,
empty account is the smallest working set: an activity list with an empty array, which is the one case that
needs no tag, a device list, a button map list, a protocol list and a settings list each with their own
empty array, and a context naming at least the provisioned account, which is the Context and Settings pair
of [favourites and settings](favourites-and-settings.md#settings)[^t-touch-host]. With no favourites and no
pictures the remote asks for nothing after the six and goes straight to finished[^t-touch-sync]. What a
remote's screens then show for an account with no activity and no device is a question for the remote, not
one the firmware reading answers[^unchecked].

## The entity tag an answerer sends

A tag is whatever text the answerer chooses, and deriving it from the document, a digest of the document as
it would be sent, turns "not changed" into a comparison rather than a record kept somewhere[^t-touch-host]. A
304 may be answered only to a request that carried a tag equal to the current one: a 304 to a request that
carried no tag tells the remote to copy a file it does not hold, which fails and leaves the document missing
from the new set[^t-touch-host]. The tag is echoed on a 304 of a favourites document or a picture, and a
tag is sent with every 200 of a favourites document or a picture or it is not saved[^t-touch-host]. A remote
that later returns to Logitech's service sends these tags to it: MyHarmony forwards the remote's tag as
`If-None-Match` on a fetch and as `If-Match` on an upload[^t-touch-recovery-client]. How the service treats a tag it did not issue is not checked[^unchecked]. A
remote that holds no file for a document sends no tag for it, so deleting the stored documents before
returning to Logitech's service takes the tags out of the question, [recovery](firmware.md#recovery)[^t-touch-host].

## The direct resource put, and why a whole configuration should still go by the sync

There is a second way bytes reach the remote. A program can push a document straight onto the remote with
one engine command, a resource put, which the remote saves into its store and, for a configuration document,
reloads the engine for; because the default verifier passes every command on this host name, the command
passes with no token, and nothing checks
the document's signature, size or contents[^t-touch-host]. **It is available and it is not the route for a
whole configuration.** A put writes straight into the live store with no atomic swap, reloads the engine
once for every document rather than once for the set, and is copied into an outgoing queue that reaches the
account at the next sync; so a run of puts that leaves the set inconsistent between writes can strand the
engine on a failed load[^t-touch-host]. The sync is the remote's own designed path and does none of those
three things: it gathers the new set aside and swaps it in whole[^t-touch-host]. So the sync is the route for
a configuration, and the direct put is for placing or replacing a single document live, such as a settings
change[^t-touch-host]. Both write a configuration and never firmware[^t-touch-host].

## Which request names act

Every step of a sync is a session on one file, `/sys/hlapi`: opened for writing with a size, one request
line written, closed, then opened for reading and the answer read[^t-touch-host]. **On this protocol a
request line is itself an action, the way a path can be**, so naming the file is not enough to bound what a
program may do: the request names below act, and a program that answers a sync needs none of them but the
reads and the answer writes[^t-touch-host].

| request | what it does | who needs it in a sync |
|---|---|---|
| read the provisioning information | a read: the account and remote numbers, the mode | the answerer, first |
| hand the remote's own changes up | acts: hands up what changed on the remote, or discards it when the remote is stale, and copies the set aside | the answerer, before a sync down, so a change waiting on the remote is not discarded by the next step |
| sync from the account | acts: empties the set aside and the queue, discarding any change still waiting on the remote, then queues the six | the answerer |
| read the next request list | a read in effect, though it marks what it hands over as pending | the answerer, repeatedly |
| write the answers | writes the answers into the set the remote commits | the answerer |
| the resource put | writes a document outside a sync and queues it for upload, the direct route above | never, for a sync |
| provision to an account | acts: empties the queue, the remote's own changes still waiting to go up included, and ties the remote to the account given; on a Touch it erases no stored document, [setup](api/setup.md#setupaccountprovision) | never |
| mark the configuration changed, or delete the resources | act: mark the set stale, or delete it | never |
| the firmware paths | firmware, never written | never |
| the two paths that act on a write, `/sys/factoryreset` and `/sys/reboot` | a factory reset and a reboot; opening either runs nothing, [the names](api/names.md#the-names-that-act-on-a-write-and-on-an-open)[^t-touch-api-names] | never |

> The provisioning row said a provisioning erases the whole data store<!--superseded--> when the account,
> mode, server or remote number differs from the stored one, until the account handler was read branch by
> branch: that erase is the hubs' host name, `pimentoblue`, and on `juniper` the removal is handed a folder
> name nothing assigns and returns at once, so a Touch keeps its documents until a sync replaces
> them[^t-touch-host][^t-touch-api-setup]. The earlier reading had found the removal in the right function and
> not asked which branch it sat on.
>
> The last row said the two paths act when opened<!--superseded-->, until the remote's native program was read:
> each acts on a write and runs nothing when opened[^t-touch-api-names].

In the two syncs down recorded the remote reported its provisioning mode as 0[^t-touch-answers].
**Whether an answer was committed can be asked of the remote**: `harmony.engine?getconfighash` answers at once
with the entity tags of the stored activity, device and protocol lists and the context, which a host compares
with the tags it sent; it leaves out the button map list and the settings, and is refused while a sync runs,
[the engine](api/engine.md#harmonyenginegetconfighash)[^t-touch-api-engine]. The tag the remote sends for each
document in the next sync's request list, read out of the committed set, is the other evidence[^t-touch-host].
A committed document itself can be handed back by a resource put that names its address and carries no
document, a reading never run on a unit, [proxy](api/proxy.md#can-a-stored-document-be-read-back)[^t-touch-api-setup].
Whether these are enough to know a whole configuration arrived is not settled[^unchecked].

## Not checked

* Everything here is one firmware build and, for the measured side, the three syncs recorded, all by one
  client, Logitech's own. Nothing of this project has answered a sync[^unchecked].
* Whether the outgoing queue actually carries a direct put through to the account, inferred from the queue's
  role rather than seen[^unchecked].
* What a configuration the reader raises on does on a unit: the firmware reading is
  [recovery](firmware.md#a-configuration-that-fails-to-load), and none of it has been tried[^unchecked].
* What a remote's screens show for an account with no activity and no device[^unchecked].
* That the screens turn a refused answer into the abort on a unit, and how soon `proxy://Abort` follows[^unchecked].
* Whether a write of answers whose last chunk is no longer than the announcement's shortfall is acted on one
  chunk early on a unit[^unchecked].
* Whether a sync driven without the client's own file resets and its refused clock write behaves the
  same[^unchecked].
* How Logitech's service answers a tag it did not issue, when a remote returns to it[^unchecked].
* Whether the read back route of [proxy](api/proxy.md#can-a-stored-document-be-read-back) hands a committed
  document back on a unit, and what its engine reload does in between[^unchecked].

[^t-touch-host]: Read in the firmware. [The test](../../../tests/test_harmony_touch_host.py)
[^t-touch-recovery]: Read in the firmware. [The test](../../../tests/test_harmony_touch_recovery.py)
[^t-touch-recovery-client]: Stated by Logitech, in their client. [The test](../../../tests/test_harmony_touch_recovery.py)
[^t-touch-answers]: Measured on a unit. [The test](../../../packages/usb/test/touch-host.test.ts)
[^t-touch-api-names]: Read in the firmware. [The test](../../../tests/test_harmony_touch_api_names.py)
[^t-touch-api-setup]: Read in the firmware. [The test](../../../tests/test_harmony_touch_api_setup.py)
[^t-touch-api-engine]: Read in the firmware. [The test](../../../tests/test_harmony_touch_api_engine.py)
[^t-touch-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync.test.ts)
[^d29]: Chosen by this project. [Decision 29](../../../docs/decisions.md#d29)
[^unchecked]: Not checked.
