# Harmony Touch test notes

The bench Harmony Touch: how it was first reached, what was sent to it and what its reads settled. What it
showed about the model is in `reference/remotes/harmony-touch/` and about its platform in
`reference/architectures/harmony-touch/`; this file keeps what is one unit's, and the history of getting
there.

**This unit may be written to**, decision 29 in `docs/decisions.md`: it names this unit,
and the library writes to it only through the request rail of `todo-touch.md` 6.3. A remote's own checks of an answer are no part of that
permission, since the remote verifies no answerer, `reference/architectures/harmony-touch/answering-a-sync.md`.

## Arrival

**A Harmony Touch has been on the bench since 27 August 2026**, alongside a Harmony 350 and a Harmony 300.
It was identified from enumeration alone, `0x046D:0xC12B`, before anything opened it, and that is what showed
the file based family sits inside the product id range `openHarmony` used to accept, section 193. Its skin,
99, was read from `bcdDevice` the same day, section 195.

**It was factory reset before any read**, on 27 August 2026, through Logitech's hidden recovery tool in
MyHarmony. That reset is a whole factory firmware image fetched over the network and installed, not a
command, `reference/usb-protocol/commands.md` and section 196. Afterwards its configuration was zero
bytes, section 195.

**It was given a setup afterwards and synced**, the test account's two devices and one activity, and it
shows that activity. Which client did the sync is not recorded, MyHarmony and Harmony Desktop sharing the
account, and neither is whether the reads below came before or after it. Recorded on 2 November 2026.

**On 2 November 2026 `/cfg/usercfg` was opened again with that setup on the remote, and refused at open**,
`todo-touch.md` 1.1. `/sys/sysinfo` opened and read in the same sitting, 234 bytes, firmware 4.15.330, so
the session worked and the refusal is the path's. A configuration is on the unit and is not at that path,
which rules out the reading that the earlier refusals were an empty remote. The reads are in the lab's
`reads/20261102T0852Z-touch-usercfg/`.

**Its USB path changed four times in that sitting**, each listing after the previous one, including once
with no session opened in between, cause not established. **In that port the remote's screen showed it
charging and not its USB screen**, the one that names myharmony.com, and it answered both reads all the
same. In another USB port of the same computer it showed the USB screen, and a repeat of both reads,
`reads/20261102T0854Z-touch-usercfg/`, gave the same refusal and the same 234 bytes, with the path the same
across both sessions. So the refusal holds in both states; that the port decides the state and the
re-enumeration is one comparison, not a measurement. The first
read attempt, before the cable went straight into the remote, found no remote at all.

## The first contact with the file based family

The Touch was the first remote of its family this project sent a packet to, on 28 August 2026, and the
first read taken from one, sections 198 and 200. Every packet sent was a read: the transport carried an
allow list of a bare ping, an open for reading, a read and a close.

* **An open was refused with the same six bytes every time**, the refusal in
  `reference/remotes/harmony-touch/usb.md`, for two paths, two
  sequence numbers, two stated parameter counts and either case of the mode letter, section 198. Four opens
  in one session, of two files, a directory and a path that does not exist, all drew the same reply, so the
  path was not consulted.
* **A path with no leading slash drew no reply, and nothing after it in the same session drew one either**,
  so each attempt afterwards got a fresh handle, section 198.
* **A bare ping drew no reply**, and the open after it none either, so the ping was not the missing step,
  section 198.
* **Two guesses at the request framing were refuted on hardware**: a bare NUL terminated string, which drew
  the refusal, and a length prefix, which drew silence, section 198.
* **Reading Logitech's own encoder settled it**: `molsonparamwriter.getBytes` in the mirrored web
  application, which writes a string as `0x80`, the characters and a NUL, section 200. With it
  `/sys/sysinfo` opened, read and closed, 234 bytes.
* **The remote was unharmed by every session** and enumerated normally afterwards, checked after every
  round, section 198.

Two lessons came out of it that the rails carry: that a path can be an action, `INERT_PATHS`, and that
Logitech's own encoder in the lab was the cheap answer to a framing question two guesses on hardware had
failed at, section 200.

## Which paths were opened

**Nineteen paths were probed**, section 200. Besides the identity file seven opened: `/rf/deviceinfo`,
`/tde/enable`, and five at zero bytes, `/fw/otaupdate`, `/ir/ir_cap`, `/sys/hlapi`, `/sys/time`, and
**`/sys/factoryreset` and `/sys/reboot`**. Those two were opened while listing which paths exist, and
nothing happened, which was taken for luck rather than design, section 200. The rail `INERT_PATHS` and the
named door `HARMONY_FILE_PATH_EXPERIMENT=1` were the answer. The remote's native program, read later, shows
it was not luck: both act on a write, and opening either runs no handler at all,
`reference/architectures/harmony-touch/api/names.md` and `tests/test_harmony_touch_api_names.py`.

**Six spellings of a configuration path were tried**, the Harmony 350's `/cfg/usercfg` among them, and none
exists on this unit, section 200.

**Twelve paths are on `INERT_PATHS` and this unit answers two**, `/sys/sysinfo` and `/rf/deviceinfo`; the
other ten were refused at open, each in its own session so that one refusal could not silence the next,
section 201.

## What the reads gave

* **`/sys/sysinfo`**: fourteen fields, its serial among them, so the values stay in the lab; first counted as
  fifteen, the fifteenth being the reader's own padding parsed as a field, sections 200 and 201.
* **`/rf/deviceinfo`**: a radio identity and a list of paired devices that was **empty** on this unit, with a
  count of zero, section 201. The radio identity also appears, digit for digit, as the prefix of a
  `ButtonMapIdentifier` in a captured reply from Logitech's service for a Harmony One account, which this unit
  has never been on; whether that number identifies anything is left open, and both values stay out of the
  repository, section 201.
* **The reader returned padding as content**: 124 bytes for an 83 byte file and 248 for a 234 byte one, fixed
  by cutting a read to the size the open states, section 201.

## Logitech's service and this unit

The Touch's account record holds two devices and one activity, and every compile requested for it ends in
`status='Error'` six seconds in, which section 202 explained: the client never compiles for this product.

**Synced once through Logitech's own client**, `todo-touch.md` 2.2's trial, on 2 November 2026: Harmony
Desktop 1.0.303 in the lab's copy that turns the web inspector on, and the sync completed. What it sent was
seen in Safari's inspector and not saved, since the inspector would not export; the copy records the page's
requests and its USB bridge itself from then on.

**Synced a second time, recorded whole**, the same way: every web request and every USB command, in the
lab's `reads/20261102T1350Z-touch-sync-harmony-desktop/`. Logitech's client wrote to the remote through
`/sys/hlapi`, tried a write to `/sys/time` that the remote refused, and reset its file system twice; what the sync carried is
`packages/usb/test/touch-sync.test.ts`.

**Synced a third time after the account was filled**, `todo-touch.md` 2.2.1 and 2.3: seven devices, five
activities, sequences, delays, long presses, screen labels, five favourite channels with one uploaded logo,
and an uploaded background, set up partly by `packages/corpus/setups/touch-full.json` and partly by hand in
MyHarmony on another computer, without a sync in between. Settings were changed on the remote before it,
and when MyHarmony was opened without the remote attached it asked whether to overwrite the remote's
settings, and the answer was yes; the sync through Harmony Desktop then did not ask the remote for its
changes. Recorded in the lab's `reads/20261102T1520Z-touch-sync-full-setup/`.

**Then the remote's changes were handed up once**: both brightness settings and the background changed on
the remote, nothing changed on the account, and the remote attached when Harmony Desktop opened. The
background went back to a built in one because text was hard to read on the uploaded picture. Recorded in
the lab's `reads/20261102T1524Z-touch-reverse-sync/`; both are read by
`packages/usb/test/touch-sync-both-ways.test.ts`.

**One reading of the firmware was checked on the screen**, after the full sync: the button maps of the LG TV
and the Xbox each give two screen entries the same position, and the code keeps only the later one, so the
TV's `-` and the Xbox's `B` should be missing from those devices' screens. Neither was there, reported by the
person at the bench; `packages/usb/test/touch-activities.test.ts` holds the duplicated positions. The TV's
channel tuning was switched to Three Numbers in MyHarmony between the trial and the full sync, which is why
the two device lists differ there.

## Bench checks of todo-touch 3.2

What the firmware reading of `todo-touch.md` 3.2 predicted, `tests/test_harmony_touch_keys.py`, and what the
unit showed. Checks 1, 8 and 9 ran on the infrared monitor, `packages/bench/irtests/done/touch-3-2-monitor-checks.json`
and `touch-3-2-home-button.json`, runs in the lab's `reads/` of 3 November 2026. Checks 4 to 7 were dropped:
they are behaviour no configuration document changes, so they cost bench time and buy FreeHarmony nothing.

| | keys | prediction | on the unit |
|---|---|---|---|
| 1 | start an activity, then hold Off 10 s | the activity stops at once, the remote restarts at about 8 s | the LG TV's and the Denon's power off codes at the press; the remote then stayed off and answered nothing until it was put in the dock, which showed the Harmony start screen. So it did not restart by itself: whether it shut down or stopped partway through a restart is not settled. One unnamed frame arrived about 12 s after the power off codes |
| 2 | Settings, Remote | Screen lock/Timeout, Remote Lock, Background, Brightness, Set time; Vibration or Tilt Sensor only if fitted | those five, and no Vibration or Tilt Sensor entry |
| 3 | timeout and both brightness sliders to both ends | timeout 1 to 30, brightness 10 to 100, a battery warning past 95 | the screens show sliders without numbers, so the ranges cannot be read off the screen; the timeout stood at 10, both brightness sliders at their maximum, with no warning, only the status bar's battery, full. Screen lock was switched off on the remote during this check, a change made on the remote that the next sync up carries. The ranges stay as read in the firmware |
| 4 | the star with a pen cap, then a finger, then the gap between star and house | nothing, favourites, nothing | dropped |
| 5 | dock, 15 s, lift | Charging at once, the display sleeps after about 10 s, lifting wakes it | dropped |
| 6 | USB cable to a computer | the USB screen, no Charging screen, the charging symbol in the status bar | dropped |
| 7 | Menu + Mute, back out; Record + Previous, back out | pairing; the place in cradle screen | dropped |
| 8 | start an activity, Devices, a device, Home, Volume Up, infrared monitor on | Volume Up goes to the activity's volume device | the Home button, on Watch TV with the LG TV's device page open, sent nothing and Volume Up went to the Denon, the activity's volume device. A first try pressed the LG TV's own Home entry on the screen instead, which sent the LG TV's Home code and kept device mode, so its Volume Up went to the LG TV |
| 9 | long press Rewind, infrared monitor on | the long press code about 600 ms after the press | a tap sent the KPN's Rewind; held about 2 s it sent the KPN's Replay alone, with no Rewind before it. The timing after the press is not measured, since the monitor sees no press |

## A transport finding for answering a sync

`packages/usb/src/filepipe.ts` waits 5 seconds for a reply to each command. In the recorded syncs the remote
acknowledges each chunk of an answer write at once, in 0.30 to 0.45 s, and the final chunk of the write that
completes the six core documents only after storing the set and reloading: 4.6 s in the trial, where that is
the middle of three writes, 7.6 s in the full sync, where it is the first and largest, and 4.8 s in the
reverse sync on a single chunk of 2647 bytes carrying Settings. The final chunks of the other writes took
0.05 to 3.3 s. So the delay follows the reload and not the size, and of the three only the full sync passes
the 5 second window; a host answering a sync on that transport needs a longer one for that chunk, as
`packages/usb/src/filewrite.ts` already has with the client's 30 s per chunk. Measured from the recorder's
timestamps, `packages/usb/test/touch-host.test.ts`. A note only: nothing here answers a sync yet, and the
transport is unchanged.

## The unit record, todo-touch 6.2

**Its unit record was taken on 5 November 2026**, read only, by `read-file-identity.ts --record touch`:
`/sys/sysinfo` opened, read and closed, and `/sys/guid` refused as before, so the record is the digest of
the identity file's serial, in the lab's `units/touch.txt`. The same read gave firmware 4.15.330,
architecture 0x11, skin 0x63 and hardware version 01.00. This is what the request rail of 6.3 compares the
remote on the cable against.

## The first requests sent by this project, todo-touch 6.4

**Two reads through the request rail on 5 November 2026**, with `HARMONY_ENABLE_WRITES=1` and
`HARMONY_TOUCH_REQUESTS=1`, by `packages/usb/bin/touch-request.ts --commit`: each an open of `/sys/hlapi` for
writing with one request line, a close, an open for reading and the answer. The unit matched its record both
times. `getprovisioninfo` answered 383 characters, the account link, kept in the lab's
`reads/20261105T0930Z-touch-provisioning/` and not quotable; `getconfighash` answered 280, kept in
`reads/20261105T0930Z-touch-confighash/`, and its hash is the full sync of 2.3's four tags joined,
`packages/usb/test/touch-confighash.test.ts`. So the remote still holds the documents that sync delivered,
and that recording is the backup of them (6.5); its settings were changed on the remote afterwards, which the
hash does not cover. Nothing else was sent; what the screen showed during the reads was not recorded.

## The first sync answered by this project, todo-touch 6.7

**Run on 5 November 2026**, `packages/corpus/bin/touch-sync.ts --unchanged --commit`, the remote in the port
where it shows its USB screen. The settings it held had been changed on the remote (screen lock off), and
accepting that the hand over writes them back under a tag of ours, so that change never reaches the account,
was decided before the run. The lab's `reads/20261105T1051Z-touch-sync-unchanged/` holds every request and
answer.

* `getconfighash` before: 200, the same four tags as the 6.4 read.
* The hand over: the remote handed up one document, Settings, kept in the lab and answered back with a tag of
  ours; then two more lists, one answered, and the hand over ended.
* The sync: the six documents asked for in one list and answered 304, taken; one empty list; then the user's
  favourites asked for **without a tag**, though the full sync of 2.3 had delivered them with one. The answerer
  refused there, as it is built to, since a 404 would drop the favourites at the commit.
* `getconfighash` then answered 202, a sync running. `touch-recover.ts --step abort` answered 200, the read
  then gave 200 and the same four tags, and `--step reboot` answered 200. The remote started normally, showed
  its activities, and screen lock was still off, by a look at the remote.

So the recovery route of 6.1 ran on a unit end to end, and 6.7 stays open on the favourites' missing tag.

**Why the favourites came without a tag**, read afterwards in the image,
`tests/test_harmony_touch_favourites_untagged.py`: the three favourites requests are the screens', not the
engine's, and the screens take a favourites document's tag only after reading its file, which during a sync they
read from the set being gathered. On a Touch synced through a computer nothing puts a favourites document there
before they ask, so every favourites request of such a sync is untagged, whatever the remote holds. None of the
four causes the run left open: the address equals the full sync's, the hand over handed up no favourites change,
and the document was stored with a tag. The full sync of 2.3 had asked for them untagged too, which a first
delivery explains as well, so only this run could tell. A 304 makes the remote copy its own document and its own
tag into the new set, so the answerer now answers every favourites request 304, with the remote's tag or a tag of
ours it does not store, `packages/corpus/src/touchsync.ts`; an answer to a favourites request without any tag would
have aborted the sync. The measurements of this run are held by `packages/usb/test/touch-first-sync.test.ts`.

## The second sync answered by this project, committed, todo-touch 6.7

**Run on 5 November 2026**, after the first run and its recovery, with the answerer changed to answer every
favourites request 304: `HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 node packages/corpus/bin/touch-sync.ts
--unchanged --commit`, the code as of commit `ed2e2174`. The lab's `reads/20261105T1218Z-touch-sync-unchanged/`
holds every request and answer, and `reads/20261105T1217Z-touch-confighash/` and
`reads/20261105T1218Z-touch-confighash/` the reads before and after.

* `getconfighash` before and after: 200 both times, the same result, and the same as the 6.4 read.
* The provisioning read: 200, mode 0.
* The hand over: one list, `proxy://Finished` alone, answered 200. Nothing was handed up.
* The sync, eight lists. 1: the six documents, every one with a tag, Settings's the tag the first run's hand
  over answer wrote and the other five the full sync's, each answered 304 with its tag. 2: empty. 3, 4 and 5:
  the user's, the tuning device's and the line up's favourites, one a list, **each without a tag**, each
  answered 304 with a tag of ours. 6: empty. 7: ten pictures, every one with the tag the full sync of 2.3 had
  delivered it with, each answered 304 with its tag. 8: `proxy://Finished`, answered 200. Every write of
  answers was replied 200 as a write, and the answerer ended `sync: finished`.
* Afterwards, by a look at the remote: it starts normally and the favourites are still there. Nothing else
  was reported.

So a sync driven end to end by a program of this project was committed by the remote, every answer in it a
304 or the finish, and 6.7 is done. Settings came tagged after the first run's abort and restart; whether the
stored Settings document is the one written back then is not settled, since `getconfighash` leaves Settings
out and its content was not read. All three favourites lists came untagged, which is what the reading in
`tests/test_harmony_touch_favourites_untagged.py` predicts; it does not rule out the reading of the lab's
`6.7-preflight.md`, a tag sent only when the file and its index entry exist, since which favourites files the
remote holds was not read. The measurements are held by `packages/usb/test/touch-second-sync.test.ts`.

## The remote's own documents answered back with 200 and tags of ours, todo-touch 6.8

**Run on 5 November 2026**, after the second sync of 6.7, with nothing changed on the remote's screens between
the two: `HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 node packages/corpus/bin/touch-sync.ts --set
../lab/work/touch-firmware/sets/6.8-own-documents --commit`, the code as of commit `bcfeaf97`, the set built by
`packages/corpus/bin/touch-own-set.ts` as the lab's `work/touch-firmware/notes/6.8-preflight.md` describes. The
lab's `reads/20261105T1418Z-touch-sync-set/` holds every request and answer of the run,
`reads/20261105T1418Z-touch-confighash/` the read after it, and `reads/20261105T1419Z-touch-sync-unchanged/` a
third `--unchanged` run after that.

* `getconfighash` before: 200, and byte for byte equal to the read after 6.7's second sync, checked with `cmp`
  at the bench. **That read survives only as that comparison**: the read after the sync fell in the same minute,
  got the same folder name and overwrote it, which commit `2fcc0277` stopped by never reusing a read folder.
* The set's check and the dry run as the preflight predicted; the gate passed, 6 answers, 6 tags stated.
* The provisioning read: 200, mode 0.
* The hand over: one list, `proxy://Finished` alone, answered 200. Nothing was handed up.
* The sync, eight lists. 1: the six documents, each with the tag the remote held, answered 200 with the set's
  document and the set's tag, in **one write of 571577 characters in 19 chunks**, the first write of ours longer
  than one chunk, announced with the whole line's length; the announcement was answered 200 and the write replied
  200 as a write. 2: empty. 3, 4 and 5: the three favourites documents, each untagged, answered 304 with a tag of
  ours. 6: empty. 7: the ten pictures, tagged as in 6.7, each answered 304 with its tag. 8: `proxy://Finished`,
  answered 200. The answerer ended `sync: finished`.
* `getconfighash` after: 200, equal to the set's ActivityList, DeviceList, ProtocolList and Context tags
  (`touch-own-set.ts --check --hash`: equal).
* The third run, `--unchanged`: finished; its first sync list asked for all six with the set's tags
  (`--check --list`: six of "the set's tag"), and every answer was 304 or the finish.
* After the commit, the person at the bench answered yes to each of: the remote came back to its normal screens
  with no Data error; the activity list is the same five; one activity starts and its devices respond; the
  screen lock setting is still as changed on the remote; the favourites and their logos are there.

So the remote stored and committed its own six documents delivered with 200 by a program of this project, and
the tags of ours became the ones it reports and asks with; 6.8 is done. Every document was one the remote already
held, so this says nothing yet about a document whose content this project composed, which is 6.9. The remote now
holds six tags of ours, which it will send to Logitech's service at its next sync there; how the service answers a
tag it did not issue is unchecked, and deleting the stored documents first takes the question away,
`recovering-a-remote`. The measurements are held by `packages/usb/test/touch-own-set-sync.test.ts`.

## A first change: a sequence's delay and an activity's name, each changed and put back, todo-touch 6.9

**Run on 5 November 2026**, after 6.8, with nothing changed on the remote's screens between runs: four sets, each
`HARMONY_ENABLE_WRITES=1 HARMONY_TOUCH_REQUESTS=1 node packages/corpus/bin/touch-sync.ts --set
../lab/work/touch-firmware/sets/<set> --commit`, the code as of commit `3617f74e`, the sets built by
`packages/corpus/bin/touch-changed-set.ts` as the lab's `work/touch-firmware/notes/6.9-preflight.md` describes,
each from the one before:

| run | set | the one change | the write of the one 200 |
|---|---|---|---|
| 1 | `6.9-delay` | MapList, Test Sequence's delay step in Watch a Blu-ray, `Duration` 1 to 3 | 349539 characters, 12 chunks |
| 2 | `6.9-delay-back` | the same, 3 to 1 | 349539 characters, 12 chunks |
| 3 | `6.9-label` | ActivityList, the third activity's name, "Listen to Music" to "Music Test" | 10809 characters, one chunk |
| 4 | `6.9-label-back` | the same, back | 10816 characters, one chunk |

`getconfighash` was read before and after each run, and a closing `--unchanged` run followed the fourth. The
lab's folders, in order: `reads/20261105T1457Z-touch-confighash/`, `1457Z-touch-sync-set/`, `1458Z-touch-confighash/`;
`1502Z-touch-confighash/`, `1502Z-touch-sync-set/`, `1502Z-touch-confighash-2/`; `1504Z-touch-confighash/`,
`1504Z-touch-sync-set/`, `1505Z-touch-confighash/`; `1505Z-touch-confighash-2/`, `1505Z-touch-sync-set/`,
`1506Z-touch-confighash/`; and `1506Z-touch-sync-unchanged/`. Two reads fell in one minute twice and got two
folders each time, the fix of commit `2fcc0277` at work.

* **Every run** as the preflight predicted: the hand over `proxy://Finished` alone, nothing handed up; the six
  asked for with the previous set's tags (the 6.8 set's for run 1), so each run's first list confirms the run
  before it committed; the changed document answered 200 with the set's content and tag and the other five 304;
  the favourites 304, the ten pictures 304 with the tags they had in 6.8, the finish 200; `sync: finished`.
* **The hash**: equal to the read after 6.8 before and after both delay runs and before run 3, since MapList is
  not one of the four documents it joins; after run 3 equal to `6.9-label`'s tags, still so before run 4, and
  after run 4 equal to `6.9-label-back`'s.
* **The closing `--unchanged` run** asked for all six with `6.9-label-back`'s tags and answered every request 304
  or the finish.
* **The delay, on the Flirc monitor**, `packages/bench/irtests/touch-6-9-sequence-delay.json`, three times: before
  run 1 (`reads/20261105T145423Z-ir-test-...`), after run 1 (`150025Z`) and after run 2 (`150311Z`). Each tap of
  Yellow gave the Sony Blu-ray's Stop and then its TopMenu, both 20 bit codes with a header mark of about 2450 us,
  named by the catalogue's candidates since the bench configurations hold no Sony Blu-ray. The silence before
  TopMenu: 1192 and 1133 ms at 1 s, 3144 and 3149 ms at 3 s, 1132 and 1138 ms back at 1 s; start of Stop to
  start of TopMenu 1304 and 1248, 3244 and 3261, 1248 and 1256 ms. So 1 s to 3 s added 1984 ms to the silence on
  the means, inside the preflight's 2000 ms give or take 100, and the put back returned it. Two earlier attempts
  of the same bench test, `145315Z` and `145406Z`, recorded no press of Yellow, since their steps were not
  advanced past the activity's start, and are not used.
* **The name, at the bench**: after run 3 the activity list's third entry read MUSIC over TEST, after run 4
  LISTEN over TO MUSIC, and the remote was otherwise normal.

So a change of content made by this project, one value in one document, was stored, committed and acted on by the
remote, and putting the value back under a new tag restored what it did; one document delivered with 200 among
five 304s replaced that document alone. 6.9 is done. What this does not cover: a document composed whole by this
project, and a favourites document or a picture delivered with 200. The remote now holds tags of ours for all six
documents. The measurements are held by `packages/usb/test/touch-changed-set-sync.test.ts`.

## The first full bench test, todo-touch 7.1

**Run on 6 November 2026**, the remote holding `6.9-label-back` and the recorded favourites, as 6.9 left it, with
nothing sent to it: the ten tests of `packages/bench/irtests/touch-7-1-*.json` on the Flirc monitor, the bench
restarted first so its code book names a code by the Touch's own documents. The lab's runs, in order, each
`reads/20261106T<time>-ir-test-harmony-touch-7-1-*.json`:

| time | test | expectations held |
|---|---|---|
| `092337Z` | every activity from Off, and Off | 38 of 38 |
| `092617Z` | switching between activities | 28 of 30 |
| `092913Z` | the favourite channels and their logos | 15 of 15 |
| `093034Z` | the keys in Watch TV | 32 of 33 |
| `093236Z` | the keys in Watch a Blu-ray | 37 of 39 |
| `093422Z` | the keys in Listen to Music | 32 of 32 |
| `093610Z` | the keys in Switch Box | 38 of 38 |
| `093742Z` | the keys in Play a Game | 37 of 37 |
| `093952Z` | device mode 1 of 2, the LG TV, the Denon and the Blu-ray | 74 of 74 |
| `094316Z` | device mode 2 of 2, Plex, the KPN and the Xbox | 82 of 82 |

**413 of 418.** Every code came in the order the model predicts, and nothing was sent that a step did not expect,
but for the presses of the two marked steps below and one Denon PowerToggle heard 10.4 s into the step that chose
the Denon from the device list, unmarked in the run. Asked afterwards, the person reported a second tap: the list
was slow to answer and the tap landed on the Denon's page as it opened, on its PowerToggle entry; choosing the Denon
again sent nothing. The five that did not hold:

* **Three single presses not heard**: in Watch TV, Previous held, the LG TV's Back; in Watch a Blu-ray, Blue, the
  Blu-ray's Blue, and Rewind held, its ChapterPrev. **Retested on the monitor's live log, not as a test**,
  `reads/20261105T1728Z-ir-monitor.jsonl` from 09:48:47 to 09:49:39 UTC: Watch TV started, Previous held, Watch a
  Blu-ray started, Blue tapped, Rewind held. The log holds exactly the ten codes the model gives for those five,
  in order, the starts' pauses in their bands, so each press was missed once and heard once. The files do not say
  whether the remote sent nothing, the receiver missed it or the key was not pressed fully.
* **Two pauses late in the switches**, each straight after the Xbox's power code, which its documents hold for 2 s
  (`Duration` 2000): from Watch a Blu-ray to Play a Game the Blu-ray's PowerOff came 2927 ms after the Xbox's
  PowerOn began, against 2300 to 2900; from Play a Game to Listen to Music the Denon's InputMediaPlayer 3172 ms
  after the Xbox's PowerOff, against 2550 to 3100. **The model leaves out no step there**: between the two codes
  the engine has only the held code and the next device's own inter device delay, 500 and 700 ms. What it gets
  short is the time a held code costs: 427 and 472 ms beyond the 2 s, where its band allowed up to 210 and the
  slack 150 more, and the slack had been calibrated on runs with no held code. So the band was too narrow on the
  slow side after a held code. **The rule**: after a code held for a `Duration` above 0, the slow side gets the
  slack once more, `HELD_CODE_SLACK_MS` in `packages/bench/src/touchbench.ts`. It moves four of the 89 judged
  pauses, the four after a held code, and all 89 then lie in their bands; the test files were rewritten with it.

**The person's marks**: Play a Game step 7, "accidentally did rewind(hold) first, then restarted this step", heard
the Xbox's SkipBack, Rewind held, first and then exactly the four expected; device mode 2 of 2 step 21, "pressed
some wrong buttons but the targets were in there eventually", heard the five expected in order among eight, the
other three the Xbox's own SkipBack, Up and Down. Both are judged as passing.

**The favourites' logos**, reported by the person at the bench: all five showed, NPO 1, Zork, NPO 2, NPO 3 and
RTL 4. A favourite's digits came about half a second apart, start to start.

**Not used**: two abandoned starts, `092555Z` of the switches and `093544Z` of the Switch Box keys, one step each.
**The 3.2 home button test**, run again first at `092147Z`, agrees with its run of 3 November: the same codes in
each step, Volume Up to the Denon after Home, pressed twice as that step's note says.

**Found while landing it**: the engine model looped for ever when a start was walked from a clock at 0, sleeping a
rounding residue of 4.5e-13 ms that did not move the clock; a wait under a microsecond now counts as none,
`waitFor` in `packages/bench/src/touchengine.ts`, and the test files came out unchanged by it.

The runs, the retest and the rule are held by `packages/bench/test/touch71-runs.test.ts`. 7.1 is done.

## A device of ours added, heard and taken out again, todo-touch 8.1

**Run on 6 November 2026**, after 7.1 and after commit `5f296d09`, the 8.1 preparation, in the order of the lab's
`work/touch-firmware/notes/8.1-preflight.md` section 6, each run read before the next and nothing touched on the
remote's screens between them. The device is **Test Projector**, `packages/corpus/touch-devices/test-projector.json`:
device type 7, eleven commands of the rhythm table's Sony 12 Bit row at address 30, device id 900000001 and protocol
id 900000002, press repeats 3, no features. The two sets were built by `packages/corpus/bin/touch-device-set.ts`
from `6.9-label-back`: `8.1-device` with the device added to DeviceList, MapList and ProtocolList, and
`8.1-device-back` with it taken out, each retagging those three and no other.

| time (UTC) | run | what it gave |
|---|---|---|
| `1151Z` | `touch-confighash` | equal on `6.9-label-back` |
| `1153Z` | `touch-sync-set`, `8.1-device` | DeviceList, MapList, ProtocolList 200, the other three 304; first list asked with `6.9-label-back`'s tags; `sync: finished` |
| `1154Z` | `touch-confighash` | equal on `8.1-device` |
| `115546Z` | the bench test `touch-8-1-device-mode` | 15 of 15 |
| `1155Z` | the monitor's live log | the Power tap at 12:00:57 |
| `1201Z` | `touch-sync-set`, `8.1-device-back`, and `touch-confighash` | the same answer shape; first list asked with all six of `8.1-device`'s tags; hash equal on `8.1-device-back` |
| `1208Z` | `touch-sync-unchanged` | first list asked with `8.1-device-back`'s tags; every answer 304 or the finish |

All in `reads/20261106T<time>-*`. Each set went in one write of 19 chunks, 571252 characters for the device set and
558278 for the put back, each replied 200.

* **Nine request lists, where every earlier run of ours had eight**: both set runs handed out one more empty list,
  between the user favourites and the device favourites; the preflight predicted eight. The answerer reads lists
  until the finish and took it as it came. The files do not say why; the closing `--unchanged` run had eight again.
* **The bench test**, run once on the Flirc monitor: Off, Test Projector chosen from the Devices list, Menu and
  Exit, the four arrows and OK, Volume Up, Volume Down and Mute, each heard as the command of its own name to
  Test Projector; then the Blu-ray chosen and its five navigation keys, Logitech's Sony 20 Bit definition beside
  ours. 15 of 15, nothing else heard in any step, and the two device choices sent nothing. Each code of ours was a
  12 bit frame with a header mark of about 2450 us, about 20 ms long and about 45 ms apart start to start. **Frames
  per tap**: 4 for Menu, Exit and Up, 3 for Down, Left, Right and OK, 5 for each volume key, where the preflight
  predicted 3; the Blu-ray's taps gave 3 each. What made six taps longer the files do not say.
* **The Power entry**, tapped once on Test Projector's screen after the test with the monitor still on: three
  frames at 12:00:57 UTC, Test Projector PowerToggle by the device set's documents and nobody's by `6.9-label-back`'s.
* **The look, reported at the bench**: Test Projector last in the Devices list with its name and the default
  picture; its screen listing the eleven entries in the predicted order, Power, Up, Down, Left, Right, OK, Menu,
  Back, Volume Up, Volume Down, Mute, with no icons; after the put back it was gone and the remote worked normally.

So a device composed by this project, with a definition written from our own rhythm table, both under identifiers
of ours, was stored, committed, listed and sent by the remote, and the put back restored the set before. The remote
holds `8.1-device-back`, the content of `6.9-label-back` under other tags for three documents. **Found while landing
it**: the model gained a screen entry, `TouchEngine.entry` and the `{ entry }` action in
`packages/bench/src/touchbench.ts`, which predicts the Power tap and the Denon's PowerToggle entry of 7.1; the 7.1 and
8.1 test files are unchanged by it. What this does not cover: a document composed whole, an activity, a favourite
or a picture of ours, and the device used in an activity. The runs are held by
`packages/bench/test/touch81-runs.test.ts`. 8.1 is done.

## An activity of ours added, run and taken out again, todo-touch 8.2

**Run on 6 November 2026**, after 8.1 and after commit `74f98f70`, the 8.2 preparation, in the order of the lab's
`work/touch-firmware/notes/8.2-preflight.md` section 6, each run read before the next and nothing touched on the
remote's screens between them. The activity is **Test Cinema**, `packages/corpus/touch-activities/test-cinema.json`:
type Custom, group 0, activity id 900000003, place 5, the Blu-ray (power on 1, off 2) and the LG TV (power on 2,
off 1, HDMI 2), a pause of 3 s and the Blu-ray's TopMenu at the start and its Stop at the end, 13 keys (the volume
keys to the LG TV, the rest to the Blu-ray) and four screen entries, Top Menu, Pop Up Menu, Subtitles and TV Info,
opening on its command list. The two sets were built by `packages/corpus/bin/touch-device-set.ts --activity` and
`--remove-activity` from `8.1-device-back`: `8.2-activity` with the activity added to ActivityList and MapList, and
`8.2-activity-back` with it taken out, each retagging those two and no other.

| time (UTC) | run | what it gave |
|---|---|---|
| `1239Z` | `touch-confighash` | equal on `8.1-device-back` |
| `1239Z` | `touch-sync-set`, `8.2-activity` | ActivityList and MapList 200, the other four 304; first list asked with `8.1-device-back`'s tags; `sync: finished` |
| `1240Z` | `touch-confighash` | equal on `8.2-activity` |
| `124813Z` | the bench test `touch-8-2-activity` | 33 of 33 |
| `1237Z` | the monitor's live log | the test, then Test Cinema started again and Off, before the put back |
| `1253Z` | `touch-sync-set`, `8.2-activity-back`, and `touch-confighash` | the same answer shape; first list asked with all six of `8.2-activity`'s tags; hash equal on `8.2-activity-back` |
| `1255Z` | `touch-sync-unchanged` | first list asked with `8.2-activity-back`'s tags; every answer 304 or the finish |

All in `reads/20261106T<time>-*`. Each set went in one write of 12 chunks, 367778 characters for the activity set
and 359202 for the put back, each replied 200.

* **Eight request lists in every run**, as before 8.1; 8.1's two set runs had nine, and the files still do not say
  why.
* **The bench test**, run once on the Flirc monitor: Off, unjudged and silent; Test Cinema from Off, the Blu-ray's
  PowerOn, the LG TV's 869 ms later, its HDMI 2 10424 ms after that and the Blu-ray's TopMenu 3286 ms later, no
  Denon; Menu and Exit, the four arrows and OK, Play, Pause and Stop to the Blu-ray and the three volume keys to the
  LG TV; the four entries tapped by label, three to the Blu-ray and TV Info to the LG TV; Watch TV, the Blu-ray's
  Stop first, the Denon on, the Blu-ray off, the inputs; Test Cinema again, the Blu-ray on, HDMI 2, TopMenu, the
  Denon left on; Off, the Blu-ray's Stop, the LG TV and the Blu-ray off in that order, then the Denon. 33 of 33,
  each step heard exactly its expected codes and nothing else, all twelve timed pauses in band. **What the receiver
  cannot tell apart**: the Blu-ray's Menu and PopUp are one code in its definition, so the Menu key and the Pop Up
  Menu entry are each named both; the Denon's PowerOn and PowerOff each share a code with a main zone command.
* **After the test, before the put back**: the monitor's log holds Test Cinema started again from Off at 12:52:05
  and an Off at 12:52:53, the same four codes as the test's start and then the Blu-ray's Stop and the LG TV and the
  Blu-ray off, no Denon, as the model predicts after the test's Off. No file records what was done then.
* **The look, reported at the bench**: Test Cinema last in the activity list with the custom picture; its screen
  showing Top Menu, Pop Up Menu, Subtitles and TV Info without icons; after the put back it was gone and the remote
  worked normally.

So an activity composed by this project from the devices the remote held, under an identifier of ours, was stored,
committed, listed, started, used, switched and stopped by the remote as its record states, and the put back restored
the set before. The remote holds `8.2-activity-back`, the content of `8.1-device-back` under other tags for two
documents. What this does not cover: a document composed whole, a favourite or a picture of ours, another activity
type or start screen, an activity of ours with a device of ours, and an activity removed while it runs. The runs are
held by `packages/bench/test/touch82-runs.test.ts`. 8.2 is done.

## Favourites of ours and a logo of ours, shown, heard and put back, todo-touch 8.3

**Run on 6 November 2026**, after 8.2 and after commit `630c5b68`, the 8.3 preparation, in the order of the lab's
`work/touch-firmware/notes/8.3-preflight.md` section 7, each run read before the next. The change is
`packages/corpus/touch-favourites/8.3-favourites.json`: channel 61, BBC 1, the line up's first popular channel,
added as the remote's own add screen adds an offered channel (the station appended to the user's list, no dial
position); the order 61, 4, 3, 2, 1, 666, the five the remote held reversed with the new one first; and a logo of
ours on 61, `drawTouchLogo('8.3')`, dark blue `8.3` on bright yellow, 54 by 54, 742 bytes, delivered at the address
of BBC 1's station logo, which the remote already held as a popular channel's logo. The two sets were built by
`packages/corpus/bin/touch-device-set.ts --favourites` and `--favourites-back` from `8.2-activity-back`:
`8.3-favourites` with the six as they were, the user's favourites document of ours and the logo, each under a tag
of ours, and `8.3-favourites-back` with the same two addresses as the recorded full sync of 2 November had
delivered them, content and tags. The tuning device's favourites document and the line up were in neither set, so
the remote kept its own.

| time (UTC) | run | what it gave |
|---|---|---|
| `1330Z` | `touch-confighash` | equal on `8.2-activity-back` |
| `1330Z` | `touch-sync-set`, `8.3-favourites` | the six 304; the user's favourites 200 with the set's content and tag, the device's and the line up 304; the logo 200 with the set's content and tag, the other nine pictures 304; first list six of `8.2-activity-back`'s tags; `sync: finished` |
| `1331Z` | `touch-confighash` | equal and unchanged: favourites are not in it |
| `133357Z` | the bench test `touch-8-3-favourites` | 18 of 18 |
| `1328Z` | the monitor's live log | the test, then Listen to Music and Off, then NPO 3 tapped from Off, before the put back |
| `1339Z` | `touch-sync-set`, `8.3-favourites-back`, and `1340Z` `touch-confighash` | the same answer shape with the old content and tags; the picture list asked for the logo with `8.3-favourites`' tag; hash equal |
| `1341Z` | `touch-sync-unchanged` | every answer 304 or the finish; the picture list asked for the logo with the recorded tag again |
| `134420Z`, `134453Z` | the 7.1 favourites test | 3 of 15 and 2 of 15, stopped early; nothing records why, abandoned starts |
| `134514Z` | the 7.1 favourites test, unchanged | 15 of 15 |

All in `reads/20261106T<time>-*`. Every run handed out eight request lists. The user's favourites went in one write
of 1216 characters for the forward set and 1166 for the put back, the pictures in one of 3510 and 5011, each one
chunk and replied 200.

* **What says the content arrived**: the configuration hash covers four of the six and cannot. The put back's
  picture list asked for BBC 1's logo with the forward set's tag, so the remote had stored the logo of ours and
  committed it; the closing run's list asked with the recorded tag. In the forward run the logos came in the new
  favourites' order, BBC 1's first of eight; in the two later runs in the old order, BBC 1's sixth: the remote
  builds the picture list from the favourites documents answered earlier in the same sync.
* **The favourites documents were asked for untagged in all three runs**, including the two after a 200 of ours
  with a tag: the narrower reading of the untagged question, a tag whenever the file and its index entry exist, is
  ruled out for the user's document.
* **The bench test**, run once on the Flirc monitor: Off, unjudged and silent; Favorites and the tile showing 61,
  with nothing running, started Watch TV, the LG TV on, the Denon on 965 ms later, its TV audio input 4103 ms after
  that and the LG TV's HDMI 1 5342 ms after that, then 0, 6, 1 to the LG TV about half a second apart; RTL 4, NPO 3,
  NPO 2, NPO 1 and Zork each their own three digits, 004, 003, 002, 001, 666; Off, the LG TV and the Denon off. 18
  of 18, each step heard exactly its expected codes and nothing else, every timed pause in band.
* **After the test, before the put back**: the monitor's log holds one frame no code of the documents names at
  13:35:28, Listen to Music started from Off at 13:35:42 and an Off at 13:35:55, then Watch TV started from Off at
  13:37:57 with 0, 0, 3 at its end, NPO 3 tapped with nothing running, as the model predicts each. No file records
  what was done then.
* **The look, reported at the bench**: after the forward set the six tiles in the order 61, RTL 4, NPO 3, NPO 2,
  NPO 1, Zork, tile 61 showing our yellow "8.3" logo and the others their own logos; after the put back the five
  tiles in the old order with the old logos.
* **The 7.1 favourites test again**, after the put back and the closing run: 15 of 15. It taps the five old
  favourites by name, whose numbers 8.3 never changed, so it shows the favourites still work after the put back;
  the order shown is the report above.

So a user's favourites document composed by this project and a picture drawn by it were stored and committed by the
remote, the screen followed the document's order, the added channel was shown with the logo of ours and sent its
line up number, and the put back restored what the remote held before. The remote holds `8.3-favourites-back`: the
six of `8.2-activity-back` and the recorded favourites and pictures, content and tags. What this does not cover: a
tuning device's document or a line up of ours, a channel added by hand, an uploaded logo of ours, a picture at a new
address, the screens' picture cache, and the added channel's name. The runs are held by
`packages/bench/test/touch83-runs.test.ts`. 8.3 is done.

## Not done

* *Corrected:* this said no infrared run had been recorded with this unit and nothing about it in use had been
  seen and written down. Checks 1, 8 and 9 of 3.2 above ran on the infrared monitor, and 6.9 timed a sequence's
  delay on it, so the line is gone from this list.
* Nobody has recorded looking at its clock.
* The request and response command `0x08` has never been sent to it, by us or, in any of the recorded syncs, by Logitech's client.
