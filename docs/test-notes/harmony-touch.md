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
`reference/architectures/harmony-touch/api/names.md` and `tests/harmony_touch/test_harmony_touch_api_names.py`.

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
`packages/usb/test/touch/touch-sync.test.ts`.

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
`packages/usb/test/touch/touch-sync-both-ways.test.ts`.

**One reading of the firmware was checked on the screen**, after the full sync: the button maps of the LG TV
and the Xbox each give two screen entries the same position, and the code keeps only the later one, so the
TV's `-` and the Xbox's `B` should be missing from those devices' screens. Neither was there, reported by the
person at the bench; `packages/usb/test/touch/touch-activities.test.ts` holds the duplicated positions. The TV's
channel tuning was switched to Three Numbers in MyHarmony between the trial and the full sync, which is why
the two device lists differ there.

## Bench checks of todo-touch 3.2

What the firmware reading of `todo-touch.md` 3.2 predicted, `tests/harmony_touch/test_harmony_touch_keys.py`, and what the
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
timestamps, `packages/usb/test/touch/touch-host.test.ts`. A note only: nothing here answers a sync yet, and the
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
`packages/usb/test/touch/touch-confighash.test.ts`. So the remote still holds the documents that sync delivered,
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
`tests/harmony_touch/test_harmony_touch_favourites_untagged.py`: the three favourites requests are the screens', not the
engine's, and the screens take a favourites document's tag only after reading its file, which during a sync they
read from the set being gathered. On a Touch synced through a computer nothing puts a favourites document there
before they ask, so every favourites request of such a sync is untagged, whatever the remote holds. None of the
four causes the run left open: the address equals the full sync's, the hand over handed up no favourites change,
and the document was stored with a tag. The full sync of 2.3 had asked for them untagged too, which a first
delivery explains as well, so only this run could tell. A 304 makes the remote copy its own document and its own
tag into the new set, so the answerer now answers every favourites request 304, with the remote's tag or a tag of
ours it does not store, `packages/corpus/src/touchsync.ts`; an answer to a favourites request without any tag would
have aborted the sync. The measurements of this run are held by `packages/usb/test/touch/touch-first-sync.test.ts`.

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
`tests/harmony_touch/test_harmony_touch_favourites_untagged.py` predicts; it does not rule out the reading of the lab's
`6.7-preflight.md`, a tag sent only when the file and its index entry exist, since which favourites files the
remote holds was not read. The measurements are held by `packages/usb/test/touch/touch-second-sync.test.ts`.

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
`recovering-a-remote`. The measurements are held by `packages/usb/test/touch/touch-own-set-sync.test.ts`.

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
* **The delay, on the Flirc monitor**, `packages/bench/irtests/done/touch-6-9-sequence-delay.json`, three times: before
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
documents. The measurements are held by `packages/usb/test/touch/touch-changed-set-sync.test.ts`.

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
`waitFor` in `packages/codec/src/families/harmony-touch/engine.ts`, and the test files came out unchanged by it.

The runs, the retest and the rule are held by `packages/bench/test/harmony-touch/touch-full-bench-runs.test.ts`. 7.1 is done.

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
`packages/bench/test/harmony-touch/touch-device-runs.test.ts`. 8.1 is done.

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
held by `packages/bench/test/harmony-touch/touch-activity-runs.test.ts`. 8.2 is done.

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
`packages/bench/test/harmony-touch/touch-favourites-runs.test.ts`. 8.3 is done.

## A Settings of ours and a Context composed by us, seen, timed and put back, todo-touch 8.4

**Run on 6 November 2026**, after 8.3 and after commit `fc56fc19`, the 8.4 preparation, in the order of the lab's
`work/touch-firmware/notes/8.4-preflight.md` section 6, each run read before the next. The change is
`packages/corpus/touch-settings/8.4-settings.json`: the screen brightness from 100 to 20 and the screen timeout from 10
to 30 seconds in the remote's own Settings, every other row as it held it; and Context composed by
`composeTouchContext` from a description of its seven read fields, written from the remote's own by
`touch-device-set.ts --describe-context` and kept in the lab since it holds the account's values, so equal in content
and key order to what the remote held. The two sets were built by `packages/corpus/bin/touch-device-set.ts --settings`
and `--settings-back` from `8.3-favourites-back`: `8.4-settings` with the four other documents as they were and the
two of ours under tags of ours, and `8.4-settings-back` with the source's six, content and tags. No favourites
document or picture was in either set, so the remote kept its own. Nothing is sent by infrared, so no bench test file
was written or run.

| time (UTC) | run | what it gave |
|---|---|---|
| `1412Z` | `touch-confighash` | equal on `8.4-settings-back`, which states the six the remote held |
| `1412Z` | `touch-sync-set`, `8.4-settings` | Context and Settings 200 with the set's content and tags, the other four 304; the favourites and pictures 304; first list six of the source's tags; `sync: finished` |
| `1413Z` | `touch-confighash` | equal on `8.4-settings`, Context's new tag in it |
| `1415Z` | `touch-sync-set`, `8.4-settings-back`, and `1416Z` `touch-confighash` | Context and Settings 200 with the back set's content and tags; its first list asked for both with `8.4-settings`' tags, so the forward set was committed; hash equal on `8.4-settings-back` |
| `1418Z` | `touch-sync-unchanged` | every answer 304 or the finish; first list six of `8.4-settings-back`'s tags |

All in `reads/20261106T<time>-*`. Every run handed out eight request lists and nothing was handed up. The six went
in one write of 4788 characters for the forward set and 4789 for the put back, each one chunk and replied 200.

* **What says it arrived**: for Context, the hash after the forward run, which joins Context's tag; for Settings,
  which the hash leaves out, the kept write and the put back's first list asking for it with the forward set's tag.
* **The look and the timings, reported at the bench and held by no file**: after the forward set the screen was
  dimmed, and off the cable it took about 30 seconds after a touch to dim; the timeout before the run was not
  timed, only remembered as much shorter. After the put back the brightness was at its maximum and the timeout timed
  about 10 seconds. **Whether the brightness changed at the "sync complete" screen itself was not seen either
  time**, so the moment the backlight changes rests on the firmware reading (`syncDone`), not on the bench.
* No restart was needed or made between the runs.

So a Settings composed by this project was stored, committed and acted on by the remote, and the put back restored
what it held; a Context composed by this project from a description was stored under our tag and reported in the
hash. The remote holds `8.4-settings-back`, which in the six equals `8.3-favourites-back`, with the recorded
favourites and pictures. What this does not cover: a Context with content of its own, any other Settings row, the
motion sensor and vibration, which act only at the next start, and the moment within the sync's end at which the
backlight changes. The runs are held by `packages/corpus/test/touch/touch-settings-runs.test.ts`. 8.4 is done.

## An activity and a device of Logitech's taken out, run and put back, todo-touch 8.5

**Run on 6 November 2026**, after 8.4 and after commit `2d7afb1e`, the 8.5 preparation, in the order of the lab's
`work/touch-firmware/notes/8.5-preflight.md` section 7, each run read before the next, Off pressed before each sync.
The removal is `packages/corpus/touch-removals/8.5-removal.json`: Listen to Music and the Denon AV Receiver, taken out
by `withoutTouchEntries` with everything naming them, the receiver's role in Watch TV, Watch a Blu-ray and Play a Game,
those three maps' volume keys and swipes, their tap's long press cleared, Watch a Blu-ray's InputAm entry with Test
Sequence moved up from 8 to 7, the two protocols only the receiver used, and Switch Box and Play a Game moved up one
place. The two sets were built by `packages/corpus/bin/touch-device-set.ts --removal` and `--removal-back` from
`8.4-settings-back`: `8.5-removal` with ActivityList, DeviceList, MapList and ProtocolList changed and retagged, and
`8.5-removal-back`, which is `8.4-settings-back`.

| time (UTC) | run | what it gave |
|---|---|---|
| `1452Z` | `touch-confighash` | equal on `8.5-removal-back` |
| `1453Z` | `touch-sync-set`, `8.5-removal`, **the first try** | hand over and sync start 200, first list six of the source's tags read; **stopped** while its answers were being written, `hid_read_timeout: error waiting for more data`; ended `refused`, no reply to the write kept |
| `1454Z`, `1455Z` | `touch-confighash` | both 200, equal on `8.5-removal-back` and not on `8.5-removal`: nothing committed, no sync marked running |
| `1456Z` | `touch-sync-set`, `8.5-removal`, the second try, and `touch-confighash` | the four 200 with the set's content and tags, Context and Settings 304; first list six of the source's tags; `sync: finished`; hash equal on `8.5-removal` |
| `145719Z` | the bench test `touch-8-5-removal` | 11 of 11, no Denon code |
| `1444Z` | the monitor's live log | the test's 11 presses and nothing else before the put back |
| `1501Z` | `touch-sync-set`, `8.5-removal-back`, and `touch-confighash` | the four 200 with the old content and tags, Context and Settings 304; first list the four with `8.5-removal`'s tags; hash equal on `8.5-removal-back` |
| `1503Z` | `touch-sync-unchanged` | every answer 304 or the finish; first list six of `8.5-removal-back`'s tags |

All in `reads/20261106T<time>-*`. Every committed run handed out eight request lists and nothing was handed up. The
six went in one write of 393683 characters, 13 chunks, for the removal and 567941, 19 chunks, for the put back, each
replied 200.

* **The first try, as the files hold it**: the folder ends at the request line of the write of the first list's
  answers, which is the second try's first write byte for byte but for the session id; there is no reply to it, nor
  to its announcement. The log ends `refused` on the read timeout, with the recovery line. **What the person
  reported, held by no file**: a read right after it refused with "no remote of the file based family is attached",
  the Touch then enumerated again, it was seen restarting itself, and afterwards it started normally with everything
  there. A second remote, product id `0xc110`, was on the bus during this for other work. The two hash reads answered
  200 with the set before's tags, so nothing was sent to recover it. **No cause is claimed**: what the files show is
  a read timeout during a 13 chunk write and the remote leaving the bus; whether the remote restarted because of the
  write, the cable or anything else, they do not say. The same set went through unchanged on the second try.
* **The bench test**, run once on the Flirc monitor: Off, unjudged and silent; Watch TV from Off, the LG TV on and its
  HDMI 1 10405 ms later; Volume Up, Volume Down and Mute, nothing at all; Watch a Blu-ray, the player on and the TV's
  HDMI 2; Test Sequence, the player's Stop and TopMenu 1259 ms apart; Play a Game, the Xbox on, the player off, HDMI 4;
  Off, the TV and the Xbox off. 11 of 11, each step heard exactly its expected codes and nothing else, every timed
  pause in band. The monitor's log before the put back holds those 11 presses and no other.
* **The look, reported at the bench and held by no file**: after the removal four activities without Listen to Music,
  six devices without the Denon, and Watch a Blu-ray's command list eight entries without InputAm; after the put back
  everything was back and the volume keys worked in Watch TV.

So an activity and a device of the remote's own, taken out by this project with everything that named them, were
stored and committed by the remote, gone from its lists, and the activities that had used the device ran without it;
the put back restored the set before. A sync stopped before its commit by a read timeout on the cable left the
committed set as it was. The remote holds `8.5-removal-back`, which is `8.4-settings-back`. What this does not cover:
a removal while the activity or the device is in use, the lists at the moment of the commit, and what restarted the
remote on the first try. The runs are held by `packages/bench/test/harmony-touch/touch-removal-runs.test.ts`. 8.5 is done.

## The whole test setup composed by us, run and put back, todo-touch 8.6

**Run on 7 November 2026**, after 8.5, after commit `a50473a9`, the 8.6 preparation, and commit `72a96edc`, which moved
the Touch bench tests already run to `irtests/done/`, in the order of the lab's `work/touch-firmware/notes/8.6-preflight.md`
section 7, each run read before the next, Off pressed before each sync, the bench started afresh for a new monitor
log. The setup is `packages/corpus/touch-setups/8.6-test-setup.json`, the set the remote held described by
`describeTouchSetup`: seven devices, five activities and 616 buttons under ids of ours, devices from 900000101,
activities from 900000201, sequences from 900000301, composed by `composeTouchSetup` onto `8.5-removal-back` with the
four lists emptied, each device's record carried from that set as its catalogue. The two sets were built by
`packages/corpus/bin/touch-device-set.ts --setup` and `--setup-back`: `8.6-setup` with ActivityList, DeviceList, MapList
and ProtocolList composed and retagged (ProtocolList's content the source's), and `8.6-setup-back`, which is
`8.5-removal-back`.

| time (UTC) | run | what it gave |
|---|---|---|
| `0904Z` | `touch-confighash` | equal on `8.6-setup-back` |
| `0904Z` | `touch-sync-set`, `8.6-setup` | the four 200 with the set's content and tags, Context and Settings 304, favourites and pictures 304, the finish; first list (`006`) the four with the source's tags, Context and Settings with the set's, which are the source's; `sync: finished`, nothing handed up |
| `0905Z` | `touch-confighash` | equal on `8.6-setup` |
| `091013Z` to `092705Z` | the ten 7.1 bench tests, the last attempt of each | starts 38, switches 30, favourites 15, the five activities' keys 33, 39, 32, 38 and 37, device mode 74 and 82: 418 of 418 |
| `091413Z`, `091912Z`, `091922Z` | three attempts started again | the favourites 0 of 15 and Listen to Music's keys 1 of 32 and 0 of 32, each superseded by the next attempt of the same test |
| `0904Z` | the monitor's live log | the thirteen attempts' presses and one Off between the favourites attempts before the put back, nothing before the first test |
| `0932Z` | `touch-sync-set`, `8.6-setup-back`, and `0933Z` `touch-confighash` | the four 200 with the old content and tags, Context and Settings 304; first list the four with `8.6-setup`'s tags; hash equal on `8.6-setup-back` |
| `0934Z` | `touch-sync-unchanged` | 19 answers 304 and the two finishes 200; first list six of `8.6-setup-back`'s tags |

All in `reads/20261107T<time>-*`. Every committed run handed out eight request lists and nothing was handed up. The
six went in one write, the run's `007-answers-request.txt`, of 494602 characters, 16 chunks, for the setup and 567941,
19 chunks, for the put back, each replied 200. That file is the kept write; the run's other answers files hold the
favourites, the pictures and the finish and none of the six, which is why `touch-device-set.ts --check --written`
printed "NOT OK: the kept write answered ;" for each of them at the time. *Corrected:* this called whether `--written`
should pass over such files an open question about the tool; it now names and passes over a file that answers none of the
six.

* **The ten tests**, the files at the top of `irtests/` unchanged, which the setup derives file for file
  (`touch-setup-predicted.test.ts`), on the Flirc monitor. The last attempt of each held every expectation, judged afresh from the
  pulses by the setup's own documents, every verdict the one the monitor wrote. **Heard and named by no expectation**:
  in the Switch Box keys, step 4 counting from 0, one KPN ChannelPrev after Channel Down, unmarked in the run, the code
  Switch Box's Previous key sends and no other key of its map; in device mode 1 of 2, step 7, one LG TV Rewind between
  Menu held and Previous held, marked "drukte per ongeluk op << eerst" (pressed << by accident first); in device mode 2
  of 2, step 21, five Xbox codes besides the five expected, marked "may have touch too many buttons but they all were
  reocorded properly", each the Xbox's own map's code for one of that step's keys held. Every press of every attempt
  was named.
* **The three attempts started again**, superseded by the next attempt of the same test: the favourites at `091413Z`,
  0 of 15, nothing heard at its second step, the seven codes NPO 1 tapped with nothing running sends having been heard
  while it was still at its first, the unjudged Off; Listen to Music's keys at `091912Z`, 1 of 32, the receiver's input
  heard at the start and not its power or Plex's, which were heard during its Off; and at `091922Z`, 0 of 32, stopped
  before its start. Between the first of them and the next favourites attempt the log holds the LG TV's and the Denon's
  power off, which is Off after Watch TV. **The person at the bench said they made a few mistakes here and there**; no
  other cause is claimed, for these or for the unmarked ChannelPrev.
* **The look, reported at the bench and held by no file**: after the setup, the look of the preflight's section 6
  was right, "everything looks good": the activity list, the devices, Watch TV and Watch a Blu-ray opened; after the
  put back everything was back. The run files' problem fields hold the two notes above and nothing of the look.

So a whole setup composed by this project, every device and every activity under an id of ours, was stored and
committed by the remote and behaved as the set it was described from, 418 of 418; the put back restored the set
before. The remote holds `8.6-setup-back`, which is `8.5-removal-back`. What this does not cover: the screens' pictures
and icons beyond the look, the engine's stored power state per device under the new ids, the tests while an activity
runs across a sync, and a setup that describes no set Logitech built. The runs are held by
`packages/bench/test/harmony-touch/touch-setup-runs.test.ts`. 8.6 is done.

## The empty configuration, looked at and put back, todo-touch 9.2

**Run on 7 November 2026**, after 8.6, after commit `dabf48c7`, the 9.2 preparation, in the order of the lab's
`work/touch-firmware/notes/9.2-preflight.md` section 8, each run read before the next, Off pressed before each sync, the
bench started afresh for a new monitor log. The two sets were built by the lab's `notes/9.2-build-sets.ts`, which
`packages/corpus/bin/touch-device-set.ts --empty` and `--empty-back` now build byte for byte: `9.2-empty`,
`8.6-setup-back` with ActivityList, DeviceList, MapList and ProtocolList emptied by `emptyTouchDocuments` and retagged,
Context and Settings the source's; and `9.2-empty-back`, `8.6-setup-back`'s six with the user's favourites document, the
tuning device's, the line up, the uploaded logo and seven station logos beside them, each under the tag the remote held
it with.

| time (UTC) | run | what it gave |
|---|---|---|
| `1124Z` | `touch-confighash` | equal on `8.6-setup-back` |
| `1125Z` | `touch-sync-set`, `9.2-empty` | the four 200 with the set's content and tags, Context and Settings 304 (`007`, 1573 characters, one chunk); then an empty list, the two backgrounds 304 (`009`, `010`) and the finish; **four request lists and no favourites request**; first list (`006`) the four with another tag, Context and Settings with the set's; `sync: finished`, nothing handed up |
| `1125Z` | `touch-confighash` | equal on `9.2-empty` |
| `1130Z` | the look, below | the favourites page photographed, `reads/20261107T1130Z-touch-9.2-empty-favourites-photo.png` |
| `1135Z` | `touch-confighash`, after the person's restart | still equal on `9.2-empty`, `errorMessage` OK |
| `1135Z` | `touch-sync-set`, `9.2-empty-back` | the four 200 with the back set's content and tags, Context and Settings 304 (`007`, 567941 characters, 19 chunks); the user's favourites (`010`), the tuning device's (`012`) and the line up (`014`, 56446 characters, two chunks) each 200 with the set's content and tags; the ten pictures 304 against their held tags (`017`); the finish (`019`); eight lists; first list (`006`) all six with `9.2-empty`'s tags |
| `1136Z` | `touch-confighash` | equal on `9.2-empty-back` and on `8.6-setup-back` |
| `1138Z` | `touch-sync-unchanged` | every answer 304 or the finish, first list six of `8.6-setup-back`'s tags |
| `1124Z` | the monitor's log | from its start after the empty sync to 11:35 UTC, 86 frames, all unreadable, none a code of either set |

All in `reads/20261107T<time>-*`. The brief before the run counted the empty run's lists as five; the answerer's
outcome counts four sync lists, the fifth being the hand over's. The put back delivered the tuning device's favourites
and the line up for the first time from this project, as the remote held them, and asked for every logo with the tag the
remote held it with and the two backgrounds with the tags the empty run sent, so every stored picture survived the empty
commit. Whether the favourites documents were dropped is not measured: they are asked for untagged either way.

* **The look, reported at the bench and held by no file but the photograph**: the favourites page showed the remote's
  own no favourites screen, "Please sign in to your Harmony account to add your favorite TV channels.",
  `NO_FAVORITES_SETUP` in the firmware's English strings; no activities page; **right after the sync, off the cable, a
  text was seen once and could not be brought back**, reported as "the remote says it is empty and something like Please
  sign in to your Harmony account", not identified, the strings file holding two candidates, `NO_ACTIVITY` and
  `NO_FAVORITES_SETUP`; **the person restarted the remote**, not through our tooling, and afterwards the home screen was a
  white, empty devices screen; the Settings menu looked normal. The look after the put back was not reported in detail.
* **Against the preflight**: the no favourites screen held; the empty device page after the restart is consistent with
  the prediction, its menu not reported; the "no activity" notice predicted after a restart was not reported. The
  preflight read the notice as coming only at a start or on a `PowerOffActivity` event; the screens also reload when
  the remote leaves USB power after its USB screen, which puts the notice up at the moment the text was seen, and its OK
  keeps it away until a set with activities arrives, `tests/harmony_touch/test_harmony_touch_empty_screens.py`. That is a correction of
  the reading, not an identification of the text.
* **The monitor**: Off, the volume keys and a number key were not reported pressed. The 86 frames came between 11:31 and
  11:33 UTC, 82 of them in 22 seconds; none fits a code of `8.6-setup-back` or the put back and none
  decodes to a number; what made them is not recorded.

So the remote stores, commits and starts on a configuration with no device and no activity, asks for no favourites
document in that sync, keeps its pictures across it, and the put back with the favourites restored the set before. The
remote holds `9.2-empty-back`, whose six are `8.6-setup-back`. What this does not cover: the empty device page and its
menu in detail, which text was seen after the sync, whether the favourites documents were dropped, the keys on the empty
set, and the look after the put back. The runs are held by `packages/bench/test/harmony-touch/touch-empty-runs.test.ts`. 9.2 is done.

## The test setup built from nothing, run and put back, todo-touch 9.4

**Run on 7 November 2026**, after 9.2, after commit `8d4d004b`, the 9.3 and 9.4 preparation, and commit `81526d34`,
which moved nine of the ten 7.1 tests to `irtests/done/` so that the bench listed test 1 alone, in the order of the lab's
`work/touch-firmware/notes/9.4-preflight.md` section 7, each run read before the next, Off pressed before each sync, the
bench started afresh for a new monitor log. The two sets were built in 9.1 by `packages/corpus/bin/touch-nothing-set.ts
--build --setup`: `9.1-nothing`, the six documents written from `packages/corpus/setups/touch-test.json`, the archive of
the catalogue through our readers, our rhythm table and the lab's description of the account, and our background and
its twin, every one under a tag of ours, with the device and activity ids 8.6 used; and `9.1-nothing-back`, the six of
`8.6-setup-back`, which are what 9.2's put back delivered. 9.3 credited each of the forward set's 10671 fields to the
generator that wrote it, none carried from a Logitech document and none unattributed,
`packages/corpus/test/touch/touch-attribution.test.ts`.

| time (UTC) | run | what it gave |
|---|---|---|
| `1316Z` | `touch-confighash` | equal on `9.1-nothing-back` |
| `1317Z` | `touch-sync-set`, `9.1-nothing` | all six 200 with the set's content and tags (`007`, 381470 characters, 13 chunks); the three favourites 304 with a tag of ours; our background and its twin 200 with the set's pictures and tags and the uploaded logo and seven station logos 304 (`017`, 5288 characters); the finish (`019`); eight lists; first list (`006`) all six with another tag, the put back's; `sync: finished`, nothing handed up |
| `1317Z` | `touch-confighash` | equal on `9.1-nothing` |
| `132514Z`, `132537Z` | test 1 of 7.1, two attempts started again | 0 of 38, stopped after its first step, and 14 of 38, stopped after step 4, every expectation it reached held |
| `132641Z` | test 1 of 7.1, the last attempt | 38 of 38 |
| `1330Z` | two photographs, below | `reads/20261107T1330Z-touch-9.4-activities-photo.png` and `-powering-off-photo.png` |
| `1332Z` | `touch-sync-set`, `9.1-nothing-back`, and `1333Z` `touch-confighash` | all six 200 with the back set's content and tags (`007`, 571577 characters, 19 chunks); favourites and pictures 304; the finish; first list all six with `9.1-nothing`'s tags; hash equal on `9.1-nothing-back` |
| `1336Z` | `touch-sync-unchanged` | 19 answers 304 and the two finishes 200; first list six of `9.1-nothing-back`'s tags |
| `1316Z` | the monitor's log | the three attempts' presses and, outside them, the rest of Watch TV's start and an Off after the first attempt and Listen to Music started and ended twice after the last, nothing during the forward sync |

All in `reads/20261107T<time>-*`. The forward run asked for our background and its twin untagged, at our store's
addresses, and the logos with the tags 9.2's closing run sent; the put back and the closing run asked for the pictures
exactly as 9.2's closing run did, so the person's two backgrounds were carried across our set's commit. Our background was
the first picture delivered at an address of ours.

* **The bench test, reduced by the person's decision to test 1 of 7.1**, every activity started from off and ended. The
  argument: what 9.1 changes against 8.6, which held 418 of 418, is the definitions, written from our rhythm table, and
  the device records written from the archive; which code sits under which key is 8.6's structure, already run, and
  a code heard right per device shows its family's definition on the remote. Test 1 hears all seven devices and all five
  families the set holds: Toshiba 32 Bit from the LG TV, the KPN, the Plex and the Switch, Sharp 15 Bit 2 and Sharp 48
  Bit 2 from the Denon, Sony 20 Bit from the Blu-ray and Microsoft 30 Bit from the Xbox, none of them played from a
  definition of ours before (8.1 played Sony 12 Bit). The last attempt held 38 of 38, judged afresh from the pulses by
  the forward set's own documents, every verdict the one the monitor wrote. No code was heard that no expectation names;
  in the last Off, after the Xbox's power off, nine short frames came that the monitor marked unreadable and neither the
  set nor 8.6's set names, what made them not recorded. The Xbox's toggle bit is not checked: test 1 sends no Xbox code
  twice in a row.
* **The two attempts started again**: the first heard the first two codes of Watch TV's start while it still stood at
  its Off step, the rest of the start and an Off following in the log after it stopped; the second stopped after step 4.
  No cause is claimed.
* **The look, reported at the bench and held by no file but the two photographs**: a green band at the foot of every
  screen, photographed on the activity list, which is our background's yellow band seen under the screens' dark footer,
  consistent with the picture's design and compared with nothing else; the "Powering off" screen's help text runs past
  the right edge, "Point the remote at your devices while th...", photographed on Listen to Music, and after the put
  back, on Logitech's documents, the person saw the same, so it is the firmware's layout and not a difference of the
  set. The entry icons, the favourites page and the background picker were not reported.
* **Against 9.1's four predictions**: our background shown, held by the band; no icon on any entry, not checked; the
  seven field Context accepted, held, every run committed and the remote acted on the set; the person's background out
  of the picker, not checked.

So a configuration built by this project from nothing, every device record, every definition, Settings, Context and the
background ours, was stored and committed by the remote and played every device's codes as the set states them; the put
back restored the set before. The remote holds `9.1-nothing-back`, which is `8.6-setup-back`. What this does not cover:
the nine other 7.1 tests on this set, the Xbox's toggle bit, the entry icons and the picker, and every code of each
family beyond those test 1 sends. The runs are held by `packages/bench/test/harmony-touch/touch-from-nothing-runs.test.ts`. 9.4 is done, and with
it `todo-touch.md`.

## Not done

* *Corrected:* this said no infrared run had been recorded with this unit and nothing about it in use had been
  seen and written down. Checks 1, 8 and 9 of 3.2 above ran on the infrared monitor, and 6.9 timed a sequence's
  delay on it, so the line is gone from this list.
* Nobody has recorded looking at its clock.
* The request and response command `0x08` has never been sent to it, by us or, in any of the recorded syncs, by Logitech's client.
