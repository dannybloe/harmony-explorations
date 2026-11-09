# Harmony Touch API: proxy

The proxy requests are the remote's half of the sync. A Harmony Touch has no network of its own, so it
keeps a queue of the web requests it wants made, and a computer reads that queue, performs each request
and writes the answers back; these seven requests are the reading, the answering and the two endings of
that conversation, plus the direct read and write of one stored document. Logitech's desktop client sends
`proxy.request` and `proxy.response` throughout every sync, [usb.md](../usb.md#provisioning-instead-of-a-compile);
the remote's own screens send `proxy.finished`, `proxy.abort` and the resource requests, and listen for
`proxy.error`, `proxy.finished` and the resource events. What the remote checks of an answer, and how a sync
aborts and commits, is [answering a sync](../answering-a-sync.md), which this page links rather than repeats.

**Read in the production firmware 4.15.330**, the build a Touch reports for itself[^t-touch-api-setup]. Three of
these requests have been sent to one Touch by this project, `proxy.request` and `proxy.response` in every sync it
answered and `proxy.abort` once, to undo a sync stopped halfway, [answering a
sync](../answering-a-sync.md#a-sync-end-to-end) and [recovery](../firmware.md#a-sync-that-stops-halfway)[^t-touch-first-sync][^t-touch-second-sync];
this page said nothing of it had been sent<!--superseded--> until then. The resource requests have not been
sent[^unchecked]. The handlers branch on the provisioning mode, which on a
Touch synced through Logitech's client is 0, [the provisioning mode](README.md#the-provisioning-mode); the hub's branches,
modes 2 and 3, and a remote provisioned from a hub, mode 4, are read and not checked against a
unit[^unchecked]. How a name finds its handler and the checks every request meets are
[the API overview](README.md#how-a-request-reaches-its-handler); every request of this group runs the default check alone,
which passes on a Touch.

## The requests

| request | what it does | kind | checks |
|---|---|---|---|
| `proxy.request` | hands over every queued request not yet handed over, a stored document with each `put` | read | `Default` |
| `proxy.response` | takes the answers to the queued requests and runs each one's handling | change | `Default` |
| `proxy.resource?get` | on a Touch, queues requests for the computer to fetch; on a hub, answers a stored document | change | `Default` |
| `proxy.resource?put` | saves a document into the live store, queues it for upload and reloads the engine | change | `Default` |
| `proxy.finished` | commits a sync and queues `proxy://Finished` | change | `Default` |
| `proxy.abort` | abandons a sync, reloads the old configuration and queues `proxy://Abort` | change | `Default` |
| `proxy.error` | announces an error to the screens | action | `Default` |

The kinds are the [API overview's](README.md#the-kinds). `proxy.request` and `proxy.response` are registered
without a verb, so any verb reaches them, and each rewrites its own name to `read` and `write` before
answering[^t-touch-api-setup].

## The queue

**The queue is what the remote wants done, in the order it asked**: each entry is an address, a verb
(`get`, `put` or `POST`), an entity tag and sometimes a body, and a `get` or `POST` may carry a handling to
run on its answer. A new entry for an address already queued replaces the old one. **The `put` entries are
saved to a file and survive a restart**; the rest live in memory. An entry stays queued, marked as handed
over, until an answer for its address arrives or the queue is emptied, which `setup.sync`,
`setup.configchanged`, a provisioning, an aborted sync and a refused answer do[^t-touch-api-setup].

## Reading the queue and answering it

### `proxy.request`

**Hands the queue to the computer.** Parameter `sessionId`, optional: when it differs from the last one
seen, every entry marked as handed over is unmarked first, so a new session gets the whole queue again. Then
every entry not yet handed over is marked and listed, and the answer is 200 with `requests`, a list of
objects each holding `uri`, `verb`, `etag` when the entry has one, and `resource`[^t-touch-api-setup]:

* **for a `put`, `resource` is the stored document**, read from the store at that moment, encoded as JSON
  and then URL encoded; the entry carries no copy of its own
* for anything else, `resource` is the body the entry was queued with, such as the version, code and
  message of a `proxy://Abort`

It changes nothing stored. Logitech's client calls it as `vnd.logitech.proxy/vnd.logitech.request?read`,
repeatedly, until `proxy://Finished` or `proxy://Abort` appears, [answering a sync](../answering-a-sync.md#how-a-sync-aborts-and-how-an-answerer-learns-of-it).

### `proxy.response`

**Takes the computer's answers.** Parameter `responses`, required, text holding JSON with a list under
`responses`; text that is not JSON answers 598. Each answer is an object with `uri`, `statusCode`, and the
document or picture with its tag and type; what is checked of each, and what the 200, 304 and 400 rules
are, is [answering a sync](../answering-a-sync.md#what-the-remote-checks-of-an-answer)[^t-touch-api-setup].
Three things that page does not say:

* **The answers are taken last first**: the list is walked from its end, so a refusal stops the answers
  before it in the list, not after it.
* **A status sent as a number is turned into text first**, so 200 and `"200"` are the same answer; a missing
  status is not, and raises, as that page says.
* After the walk, the bodies the handlings returned, the favourites documents among them, are announced to
  the screens under the request's name with `response?write` changed to `resource?ready`, URL encoded.

An answer whose address matches no queued entry runs nothing and is dropped. It answers 200 whatever the
handling of each answer did, 598 for text that is not JSON and 500 when a handling raises; how a refusal
reaches the computer is
[answering a sync](../answering-a-sync.md#how-a-sync-aborts-and-how-an-answerer-learns-of-it). A long write of
it is announced by a `Content-Length` line first, the one request the announcement belongs to.

## Reading and writing one document

### `proxy.resource?get`

**On a Touch this queues requests; it does not read the store.** It branches on the provisioning
mode[^t-touch-api-setup]:

* **Modes 0 and 1, a Touch.** Parameter `requests`, required, a list or text holding JSON with a list under
  `requests`, URL encoded; 504 without it. Each entry's `uri`, `etag` and `parameters` become a queued `get`
  with the favourites handling attached, and the answer is 200 with nothing more. The remote's screens use
  it to fetch content through the computer.
* **Mode 3, a hub.** It reads one document: parameters `uri`, `etag`, `hetag`, `encode`, `parameters`, and
  `range` or `from` for the firmware addresses. **It refuses with 202 while a sync is in progress**, and
  then, for a `harmony://` address or the automation configuration, answers 304 when both tags equal the
  stored ones and **the stored document** otherwise, fetching it from the service only when the store does
  not hold it; a favourites document is served from the store when both tags match and fetched otherwise.
  The answer carries `code`, `uri`, `etag`, `hetag`, `maxAge` and `resource`, encoded as JSON text when
  `encode` is set. A `sus://` address asks the update service, and `range` returns a piece of a firmware
  image, both before the sync check.
* **Mode 4, a remote provisioned from a hub.** Each request is fetched from the hub, and each answer is
  announced as `proxy.resource?ready`; a failure answers 553.
* Any other mode, an unprovisioned remote included, answers 504.

### `proxy.resource?put`

**Writes documents straight into the live store.** In modes 0 and 1, parameter `requests`, required, a list
or text holding JSON with a list under `requests`; 504 without it. For each entry, read of it `uri`,
`etag`, `resource`, `deviceId` and `parameters`[^t-touch-api-setup]:

1. a `put` for the address is queued, `deviceId` folded into its parameters, and saved with the queue
2. `resource` is saved under the name the address gives, with the entry's `etag` as its tag and the hub tag
   the store already held for that name; the store's index entry for that name is replaced whether or not a
   `resource` came
3. for a `harmony://` address the engine reloads its configuration, and when the reload is taken, the
   update is announced to the rest of the engine

When every entry is done **the store's state is reset**: the set aside folder of a sync is deleted and the
flags that say a sync or a hand over of changes is running are cleared. It answers 204. Why this is not
the route for a whole configuration is [answering a sync](../answering-a-sync.md#the-direct-resource-put-and-why-a-whole-configuration-should-still-go-by-the-sync);
the reset means a put sent while a sync runs ends that sync's state as well[^t-touch-api-setup].

A hub, mode 3, takes one document with a hub tag that must equal the stored one, answering 412 with the
stored document when it does not, and can force a conflict check against the service; mode 4 forwards each
entry to the hub, 553 on failure. The remote's screens send it when a favourite is edited on the remote,
and `setup.content?syncchannels` sends it internally, [setup](setup.md#setupcontentsyncchannels).

## The endings

### `proxy.finished`

**Commits the sync and queues its ending.** It commits through the store: the live folder is moved aside,
the gathered set moved into its place, and the old folder removed, with the stale mark cleared when a sync
was in progress. Then, outside mode 4, it queues `proxy://Finished` as a `POST`, whose answer announces
status 0 and the current activity on the request's name; in mode 4 it announces status 200 at once. It
answers 200[^t-touch-api-setup]. The order, commit then queue, is
[answering a sync](../answering-a-sync.md#how-a-sync-aborts-and-how-an-answerer-learns-of-it).

**Sent with no sync running it still empties the queue**: the commit finds no gathered set to move into
place, puts the live folder back and runs the store's abort, which empties the queue, the remote's own
changes waiting to go up included, before `proxy://Finished` is queued. The documents themselves are
kept[^t-touch-api-setup].

### `proxy.abort`

**Abandons the sync.** Parameters `errorCode` and `errorMessage`, optional, and the request's `id`. When a
sync or a hand over of changes is running, it deletes the set being gathered, empties the queue and reloads
the engine from the stored configuration; when neither runs, it skips that. Then, outside mode 4, it queues
`proxy://Abort` as a `POST` whose body holds the firmware version, `errorCode` and `errorMessage`; in mode 4
it ends the waiting `setup.sync` with them instead, [setup](setup.md#setupsyncend). It answers
200[^t-touch-api-setup]. The screens send it with code 553 when a sync fails,
[answering a sync](../answering-a-sync.md#how-a-sync-aborts-and-how-an-answerer-learns-of-it). **Measured on a
unit**: sent from the cable to a sync stopped halfway, it answered 200, and the configuration hash then answered 200
with the stored documents' tags unchanged, so it cleared the running sync and touched no stored
document[^t-touch-first-sync].

### `proxy.error`

**Announces status 0 on its own name** with the request's `id`, and answers 200. It stores and queues
nothing; the screens subscribe to it[^t-touch-api-setup]. What sends it, and what the screens do on it, is
not checked[^unchecked].

## Can a stored document be read back

**Yes, by one route, and not by `proxy.resource?get`.** Over the cable a Touch has no read of its store by
name, [answering a sync](../answering-a-sync.md#which-request-names-act). Of the requests in the four groups
read for this page[^t-touch-api-setup]:

* **`proxy.resource?get` does not return a stored document on a Touch.** In modes 0 and 1 it only queues
  requests for the computer. It reads the store in mode 3 alone, a hub's mode, and that is where its check
  for a sync in progress is. A Touch can be given mode 3 by a provisioning, which stores any mode as given on
  its host name, [setup](setup.md#setupaccountprovision); what else that changes on a Touch is not
  checked[^unchecked].
* **`proxy.request` returns the stored document for every queued `put`**, read from the store as it is
  handed over. That is how the remote's own changes go up, and it is the route: a `proxy.resource?put`
  whose entry names a document's address **and carries no `resource`** saves nothing, since the store
  writes a file only when it is given one, and queues a `put`; the next `proxy.request` then hands over
  that document as stored, encoded as JSON again, so its key order and number spelling are the encoder's
  rather than what was delivered.
* **`connect.jsonfiletransfer?get` reads any file of the data folder** and is refused in production,
  [connect](connect.md#connectjsonfiletransferget).

**What the route costs**, read and not run: the document's index entry takes the tag the entry carries,
none when it carries none, so send the tag the remote last gave for it: a sync's request list carries the
tag of each document it asks for, and
[`harmony.engine?getconfighash`](engine.md#harmonyenginegetconfighash) answers the tags of the activity,
device and protocol lists and the context joined with nothing between them, which confirms tags a host
already knows rather than telling it one it does not[^t-touch-api-engine]; a `harmony://` document reloads
the engine from an unchanged store; the store's sync state is reset, so it must not be used during a sync;
and the queued `put` stays queued, across a restart too, until it is answered, which an answer of 200 for
its address through `proxy.response` does without touching the document, since a `put` queued this way
carries no handling. A picture cannot come back this way: for a picture the store gives a file path, and
the path is what would be handed over. **None of this has been sent to a remote**[^unchecked].

## Not checked

* That a resource put with no `resource`, followed by `proxy.request`, hands a stored document back on a
  unit, and what the engine's reload does in between[^unchecked].
* What a Touch does in mode 3 after a provisioning stores it[^unchecked].
* What sends `proxy.error`, and what the screens do on it[^unchecked].
* The hubs' and mode 4's branches, read only[^unchecked].

[^t-touch-api-setup]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_touch_api_setup.py)
[^t-touch-api-engine]: Read in the firmware. [The test](../../../../tests/harmony_touch/test_harmony_touch_api_engine.py)
[^t-touch-first-sync]: Measured on a unit. [The test](../../../../packages/usb/test/touch/touch-first-sync.test.ts)
[^t-touch-second-sync]: Measured on a unit. [The test](../../../../packages/usb/test/touch/touch-second-sync.test.ts)
[^unchecked]: Not checked.
