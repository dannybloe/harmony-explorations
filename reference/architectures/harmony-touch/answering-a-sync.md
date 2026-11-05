# Harmony Touch: answering a sync in place of Logitech's server

A Harmony Touch does not take a compiled configuration from a computer. It asks for its own documents and
pictures, one at a time, and something on the other end of the cable answers; in the syncs recorded that
something was Logitech's own client, which fetched each answer from Logitech's service and handed it back,
[usb.md](usb.md). This page is what the remote checks of those answers, and so what a program other than
Logitech's would have to produce to answer a sync itself.

**Everything here is read in the remote's firmware, production build 4.15.330, and measured in recorded
syncs of Logitech's client; the preview build's engine was not read for this page. Four syncs answered by a
program of this project have run on a remote: the first stopped at the favourites; the second ran to its end
and was committed, every answer in it a 304 that kept the remote's own copy, or the answer to the finish; the
third delivered the remote's own six configuration documents with 200 under entity tags of ours and was
committed; and the fourth answered every request 304 again**: what they measured is marked where it stands,
and the rest of the rules below are what the firmware does with an answer, not what a remote was seen to do
with one of
ours[^t-touch-host][^t-touch-first-sync][^t-touch-second-sync][^t-touch-own-set-sync]. Where a
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
favourites document needs a tag on every answer, a 304 and a 404 included, **or the whole sync aborts**, and a
picture without one is not saved and aborts nothing[^t-touch-favourites-untagged].
The tag is otherwise opaque: stored as given and sent back as given[^t-touch-host]. In the recordings every
answer for one of the six carried a tag, and Logitech's were shaped like the identifiers it uses
elsewhere[^t-touch-answers].

> This said a favourites document or a picture answered without a tag is not saved<!--superseded-->, until the
> write handler was read beside the content callback: the callback fails on a missing tag, and the handler
> aborts the sync over a failed callback for every address but a picture's. The page had the picture's fate
> right and gave it to the favourites as well[^t-touch-favourites-untagged].

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
whole line's length**, where Logitech's client announces the `responses` argument[^d29]. Ours has been
announced to a unit on writes shorter than one chunk, and the remote acted on each[^t-touch-first-sync][^t-touch-second-sync];
and on one write of 571577 characters, the six configuration documents in 19 chunks with a last chunk of 13577,
which the remote acted on once, as the whole write, its reply naming the write[^t-touch-own-set-sync]. A write
whose last chunk is no longer than the shortfall has not been sent with either number[^unchecked].

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

**So must every entry's type name, `__type`, wherever the reader tells entries apart by it.** The reader finds
out what an entry is by searching its type name for a kind's name, and on these entries it searches without
testing first that there is one: a device's features, the actions a feature carries, an activity's roles and
its start and end steps, a button map, its buttons and every step of every sequence in it. An entry there
without a type name, or with one that is null, true or false, an object or an array, makes the reader raise,
and so does an entry that is not an object at all, since the name is read off it[^t-touch-type-name]. Which of
a feature's action lists are read depends on the feature's own kind, and a state's values are read only for
two kinds of action set, so a list the reader never reaches does not matter[^t-touch-type-name]. **A number is
searched as its digits and does not raise**, and **an unknown name raises nowhere**: it is logged, or the map or
button is kept under an empty name, or the role is stored as it stands[^t-touch-type-name]. A button's three
actions are the exception that tests first: an action without a type name, or with `false`, is passed over and
gives the button nothing for that press[^t-touch-type-name]. **The protocol list does not need one**: a
protocol's type is compared for equality with three names, and anything else, a missing one included, is
logged[^t-touch-type-name]. In the recorded syncs every entry on those paths carries its type name, and the
protocols are the only entries carrying one that the reader does not search[^t-touch-type-name-recorded].

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

**The screens take part only while the remote is powered over USB.** The three things they do in a sync,
answering the hand over's outcome, following the sync, and asking for the content that ends in the commit,
each return at once while the remote is on any power source but the one named `usb`, `usb_charge` included,
and a change of power source during a sync fails it[^t-touch-host]. So on any other source the commit is never
sent, nothing commits, and an answerer reads empty lists until it gives up. **A host cannot ask which source the
remote is on**: the engine names no power source, its provisioning answer holds none, and the identity file is
built once when the remote starts; the one name that reads the power controller belongs to the factory
test[^t-touch-host][^t-touch-api-names]. What a person sees is the screen: on `usb` the remote shows its USB
screen, and in the dock or on a mains adapter its Charging screen, [display](../../remotes/harmony-touch/display.md#charging-and-the-battery).
Which source a given computer port gives is not checked[^unchecked].

The commit happens before the answerer sees `proxy://Finished`:
the remote's own screens decide the fetching is done and the engine swaps the new set in, and only then is
`proxy://Finished` queued, so the answer to it changes nothing and an answerer can only stop, or abort,
before that point[^t-touch-host]. An answerer's own way to abort is to ask the remote to, which deletes the
half written set, reloads the old one and queues `proxy://Abort` with the answerer's own code and
message[^t-touch-host].

**A sync driven end to end by a program of this project has been committed by a unit.** The second sync it
ran handed up nothing in its hand over, then took the six documents, the three favourites documents and ten
pictures, each answered 304, through eight request lists, two of them empty, and the last list held
`proxy://Finished`, which it answered 200. It went without the client's file resets and without its clock
write, and every write of answers was replied as a write. Afterwards the remote started normally and its
favourites were still there[^t-touch-second-sync]. Every answer of ours in it was a 304 or the finish, so what
it shows is that the remote commits a set gathered from answers of ours, not what it makes of a document of
ours delivered with 200.

**A whole set of the six answered 200 by a program of this project is stored and committed, and its tags become
the remote's.** The third sync it ran answered the six with 200, each with a document and an entity tag of ours,
in one write of 571577 characters, then the favourites, the pictures and the finish as the second sync had; the
remote took the write, went on through the same eight request lists as in the second sync and queued
`proxy://Finished`. Afterwards
`getconfighash` answered with the four tags of ours it covers, and the next sync asked for all six, the button
map list and the settings included, with exactly the tags of ours, at the same addresses[^t-touch-own-set-sync].
Every document in that set was one the remote already held, five as Logitech's service had delivered them and
the settings as the remote had handed them up, each as the parsed document under a new tag, so what it shows is
that the 200 path stores and commits what it is given; what the remote does with a document whose content a
program composed is not checked[^unchecked].

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
304 may be answered only to a request that carried a tag equal to the current one[^t-touch-host].

**A request without a tag has two causes, and an answerer cannot tell them apart.** Either the remote holds no
file for the document, and a 304 then copies nothing, which fails and leaves the document missing from the new
set; or a change made on the remote's own screens erased the tag of a file it keeps[^t-touch-host]. The second
is how every change on the remote is stored: the screens hand the engine the whole changed document with no
tag, and the engine saves the file under an index entry with no tag and queues the document to go up to the
account at the next hand over; the queue is kept in a file, so it survives a restart, and an abort empties
it[^t-touch-host]. The tag the remote sends is read from that index entry, and only when the file exists, so
both causes send none[^t-touch-host]. The recordings agree: after settings were changed on the remote, the next
sync asked for Settings, and no other document, without a tag[^t-touch-both-ways]. **A sync answered by this
project measured the second cause end to end**: after settings were changed on the remote, its hand over handed
up Settings and nothing else, with no tag, and once that was answered with a tag and committed, the sync asked
for Settings with exactly that tag and for the other five with the tags the account had delivered; all six were
answered 304 and taken[^t-touch-first-sync]. So a 304 to a request without a tag stays refused for a document;
for a picture, whose failure aborts nothing and whose held copy the screens carry into the new set before they
ask, a 404 is the answer that costs nothing[^t-touch-host][^t-touch-favourites-firmware].

**The favourites documents are the exception: a Touch synced through a computer asks for every one of them
without a tag, whatever it holds.** The six configuration documents are the engine's to ask for, and it tags
them from the committed set. The user's, each device's and the provider line up's favourites are the screens'
to ask for, after the six are in: the screens take a favourites document's tag only after reading its file,
and while a sync runs they read files from the set being gathered, which on a Touch synced through a computer
holds no favourites document yet, since only a hub's sync copies them in first. The file read fails and the tag
is never read[^t-touch-favourites-untagged]. A sync answered by this project met it: the user's favourites
were asked for untagged, at the address an earlier sync of Logitech's had answered with a tag, after a hand over
that handed up no favourites change[^t-touch-first-sync]. The second such sync reached all three: the user's,
the tuning device's and the line up's documents were each asked for without a tag, at addresses that earlier
sync of Logitech's had answered with 200 and a tag, each was answered 304 with a tag of ours, the sync was
committed, and the remote still showed its favourites afterwards[^t-touch-second-sync]. That is what the
reading above predicts, and it does not by itself rule out a narrower one, that the remote sends a favourites
document's tag only when both its file and its index entry exist, since which favourites files the remote held
was not read on the unit; which of the two is the cause is not checked[^unchecked]. **By the first reading an
untagged favourites request says nothing about what the remote holds, and by either 304 is the answer that keeps
whatever it holds**: on a 304 the remote copies its own
committed document and its own stored tag into the new set and stores nothing of the answer, though the answer
must still carry a tag; one it does not hold stays missing, which is what a 404 would leave. A 200 with a
document replaces what it holds, a 404 to the user's favourites drops them at the commit, and a 404 to a device
document or a line up aborts[^t-touch-favourites-untagged]. **The pictures, whose tag the screens take straight
from the committed index, come tagged once the remote holds them**: in the second sync answered by this project
all ten were asked for with exactly the tags Logitech's earlier sync had delivered them with, in that sync's
order, where that sync, on a remote holding none, had asked for every one untagged; each was answered 304
echoing its tag[^t-touch-favourites-untagged][^t-touch-second-sync].

> This said a 304 to a request that carried no tag tells the remote to copy a file it does not
> hold<!--superseded-->, until the screens' own request for a change was read beside the engine's tag lookup:
> that is the first cause only. The wrong rule gave the right answer, since a 304 there is refused either
> way; what it got wrong was what an untagged request says about the remote, which matters to anyone
> deciding whether the remote has lost a document[^t-touch-host].

The tag is echoed on a 304 of a favourites document or a picture where the remote sent one, and a tag is
sent with every answer to a favourites document and every 200 of a picture[^t-touch-favourites-untagged]. A remote
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
[the engine](api/engine.md#harmonyenginegetconfighash)[^t-touch-api-engine]; on a unit, mid sync, it answered
202 with the message "sync in progress"[^t-touch-first-sync], read before and after a sync whose every
answer was a 304 it answered 200 with the same tags both times[^t-touch-second-sync], and after a sync that
delivered the six with 200 under tags of ours it answered with those tags[^t-touch-own-set-sync]. The tag the remote sends for each
document in the next sync's request list, read out of the committed set, is the other evidence[^t-touch-host].
A committed document itself can be handed back by a resource put that names its address and carries no
document, a reading never run on a unit, [proxy](api/proxy.md#can-a-stored-document-be-read-back)[^t-touch-api-setup].
Whether these are enough to know a whole configuration arrived is not settled[^unchecked].

## Not checked

* Everything here is one firmware build and, for the measured side, the three syncs recorded by Logitech's
  client and four answered by this project, the first stopped at the favourites and the other three committed.
  The one sync of ours that delivered documents with 200 delivered the remote's own six: a document whose
  content this project composed, and a favourites document or a picture of ours delivered with 200, and what
  the remote then does with each, are the reading's alone[^unchecked].
* Whether the outgoing queue actually carries a direct put through to the account, inferred from the queue's
  role rather than seen[^unchecked].
* What a configuration the reader raises on does on a unit: the firmware reading is
  [recovery](firmware.md#a-configuration-that-fails-to-load), and none of it has been tried[^unchecked].
* What the remote's screens do with an entry's type name: they read it too, in a program of their own, and
  that reading is not examined; nor is whether a number as a type name, which the engine passes, reaches
  them[^unchecked].
* What a remote's screens show for an account with no activity and no device[^unchecked].
* That the screens turn a refused answer into the abort on a unit, and how soon `proxy://Abort` follows[^unchecked].
* Whether a write of answers whose last chunk is no longer than the announcement's shortfall is acted on one
  chunk early on a unit[^unchecked].
* How Logitech's service answers a tag it did not issue, when a remote returns to it[^unchecked].
* Which power source a computer's port gives a remote, and so on which ports a sync can commit[^unchecked].
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
[^t-touch-both-ways]: Measured on a unit. [The test](../../../packages/usb/test/touch-sync-both-ways.test.ts)
[^t-touch-favourites-firmware]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites.py)
[^t-touch-favourites-untagged]: Read in the firmware. [The test](../../../tests/test_harmony_touch_favourites_untagged.py)
[^t-touch-first-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-first-sync.test.ts)
[^t-touch-second-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-second-sync.test.ts)
[^t-touch-own-set-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch-own-set-sync.test.ts)
[^t-touch-type-name]: Read in the firmware. [The test](../../../packages/codec/test/touch-check.test.ts)
[^t-touch-type-name-recorded]: Measured on a unit. [The test](../../../packages/codec/test/touch-check.test.ts)
[^d29]: Chosen by this project. [Decision 29](../../../docs/decisions.md#d29)
[^unchecked]: Not checked.
