# Todo: describe the Harmony Touch

**The aim**: know the Harmony Touch well enough that its configuration can be described, read and, if the
route allows it, put on the remote by us. It is the one remote on the bench that MyHarmony still supports
and that this project has not described from its own reading, and the sooner what Logitech's service knows
is learnt, the better. The service is not expected to stop soon, so there is no race: the firmware goes
first and in depth, and a recording of a sync follows with what the firmware showed.

**Why the Touch is a different case**: for every other remote here, Logitech's service compiles one
configuration file and the computer writes it. A Touch takes no compiled file. During a sync it hands the
computer a list of web requests, the computer performs them and passes the answers back, and the remote
assembles its configuration itself. Read in MyHarmony's code and never observed:
[the platform's usb.md](reference/architectures/harmony-touch/usb.md), sections 202 and 203. Logitech's
client also describes writing a user configuration onto a Touch as a file, with the read back switched off,
section 198, so a direct route may exist beside the sync.

**What the bench unit holds**: it was factory reset through Logitech's recovery tool, then given a setup
on the test account and synced, and it shows an activity. So a configuration is on it. Which client did the
sync is not recorded: MyHarmony and Harmony Desktop share the account, so the account cannot tell. None of the six configuration
paths tried over USB exists on it, section 200, and whether those reads came before or after that sync is
not recorded.

**Before working any item, load the `harmony-touch` skill**, in this session and in every agent brief.
**The bench Touch may be written, decision 29, and nothing in the library writes to it yet**: a write gets its own rail on the file protocol first. A read of a path outside `INERT_PATHS` needs the
named door, and an item that seems to need one is a question first. Logitech's images and anything
unpacked from them stay in the lab; only names, sizes and findings come into this repository.

Written on 2 November 2026, and placed in `todo.md`'s sequence the same day as 3.9, straight after the Harmony 300 and 350's 3.7; also linked from `todo-later.md` 5.5.

---

## 1. Where the configuration lives, from the firmware

- [x] 1.1 Open `/cfg/usercfg` on the bench Touch once more, read only, now that it holds a setup synced after the reset; done: refused at open with the setup on it, and `/sys/sysinfo` read in the same sitting as the control, so the configuration is not at that path rather than absent
- [x] 1.2 Unpack the Touch's production image, 4.15.330, from the lab's `firmware/packages/sus/` into the lab, and list its file system and its processor; done, with the preview build beside it: a signed Linux system for TI's DA850 (ARM926EJ-S), the engine compiled Lua 5.1 and the screens Lua source, unpacked in the lab's `work/touch-firmware/`, `tests/test_harmony_touch_image.py`; the engine names JSON files under `/data/resources/`, the lead for 1.3
- [x] 1.3 Where the remote keeps its configuration on its own file system, in what files and what form
  - [x] 1.3.1 The engine's 172 compiled Lua files decompiled into the lab as source, as MyHarmony is, compiled back and compared with the original, and registered: decompiled with unluac into the lab's `work/touch-firmware/luaworks-src/` after one header byte was set to stock; compiled back with Lua 5.1.5, 164 of 172 files identical and the other 8 differing in the jumps of 12 of their 238 functions, the one in the configuration reader read and equivalent
  - [x] 1.3.2 From the decompiled reader, every field and feature a configuration can hold, as the list 2.2.1 fills the remote from; done in the lab, unreviewed: the reader's files, fields and constraints, the sync and its direct write route, and the features outside the reader, combined in `work/touch-firmware/notes/1.3.2-the-feature-list.md`
- [x] 1.4 Which names the remote answers to over USB, read off the firmware: which are files, which are actions, and whether the configuration is among them; done in the lab, unreviewed: 54 names in one table in the native USB program, none of them a configuration path, one (`/data/resource`) pointing at the engine's resources and not opened, `work/touch-firmware/notes/1.4-the-names-the-remote-answers-to.md`
- [x] 1.5 Logitech's `SKIN99/userconfiguration.xml`, in the lab's mirror of their desktop web application, read whole (decision 2): the path it writes, the sizes, the `MD5` check, and what in the client calls it; done in the lab, unreviewed: the template names no path (the package manifest does) and is dead code for a Touch, which MyHarmony never routes to it, `notes/1.5-userconfiguration-template.md`
- [x] 1.6 How the remote builds its list of requests during a sync: the first address, its certificate, the version labels, and what a complete sync covers; done in the lab, unreviewed: the remote names no server, a sync is six fixed resources then favourites then a finished signal, and the server decides what is stale, `notes/1.6-the-sync-request-list.md`; corrects two points of section 203
- [x] 1.7 Which architecture number the firmware uses for itself, 17 or 18, the open question of `reference/architectures/harmony-touch/README.md`; done: 17, the firmware's own and shared with the hubs (the USB program's fallback, which the unit's record can replace, and the engine's literal), 18 the templates' family for these remotes, and nothing compares them, `tests/test_harmony_touch_architecture.py`

## 2. One sync recorded

- [x] 2.1 Whether the client's web requests can be seen through a proxy: Harmony Desktop on the Mac first, which shows the bench Touch and whose app and web application are in the lab's `software/`, then MyHarmony's decompiled code (decision 2); done in the lab, unreviewed: yes, the hosted page performs every request in JavaScript and the shell pins nothing; the stock shell switches the inspector off, so the lab's copy of it turns the inspector on and records the page itself; MyHarmony does not start on this Mac, `notes/2.1-seeing-the-sync-requests.md`
- [x] 2.2 The go-ahead for syncing the bench Touch while recording, asked and not assumed, through the lab's inspectable copy of Harmony Desktop (2.1), since MyHarmony does not start on this Mac; a trial sync through the copy comes first; done: given, the trial recorded and decoded, then the full sync
  - [x] 2.2.1 Before the recording, the bench Touch's setup filled on the test account so it touches every feature on 1.3.2's list: devices, activities, favourites, sequences; done: seven devices and five activities, sequences, delays, long presses, screen labels, favourites with an uploaded logo and a custom background, `packages/corpus/setups/touch-full.json` and by hand in MyHarmony; gestures are not offered by the client, so not covered
- [x] 2.3 One complete sync recorded into the lab: every request the remote hands over and every answer, complete by 1.6's measure; done: six documents, three content documents and ten images, each identical to what the page fetched, then the finished signal, and a reverse sync recorded after it, `packages/usb/test/touch-sync-both-ways.test.ts` and `notes/2.3-full-sync-decoded.md`; the settings changed on the remote were not uploaded, consistent with the client skipping that step when the account has a sync pending
- [x] 2.4 Only if a proxy cannot see it: the request and response command sent by us, a command never sent to a Touch, through the `probe-remote` gate first; not needed: the copy records the whole sync, and the recorded sync sent no `0x08` but went through `/sys/hlapi`, `packages/usb/test/touch-sync.test.ts`

## 3. The Touch described

- [x] 3.1 The configuration's format in `reference/remotes/harmony-touch/` and `reference/architectures/harmony-touch/`, every fact with its footnote and regression test; done: three pages, `devices-and-infrared.md`, `activities-and-buttons.md` and `favourites-and-settings.md`, each field to what the remote does with it, held by `packages/usb/test/touch-{devices,activities,favourites}.test.ts` and the three `tests/test_harmony_touch_*.py` of the same names
- [x] 3.2 Keys, screen and limits measured, replacing what the reference takes from the manual; done: the keys, the two touch zones above the screen, the raster, charging, the battery and the remote's own settings read in the firmware, on `reference/remotes/harmony-touch/keys.md`, `display.md`, `hardware.md` and `behaviour.md`, `tests/test_harmony_touch_keys.py`; the device and favourite limits are read from Logitech's product table, `tests/test_host_client.py`, and none is measured on a unit
- [x] 3.3 A reader for the configuration in `packages/codec`, if 1 and 2 show it is a file the codec can read; done: not a file but Logitech's documents, so the reader in `packages/codec/src/harmony-touch/` is a view over the documents a sync delivers, with a check of what the remote refuses or ignores, `packages/codec/test/touch-reader.test.ts` and `touch-check.test.ts`

## 4. Whether we can configure it ourselves

- [x] 4.1 Whether the files of 1.3 can be put on the remote directly, by the route of 1.5, without a sync through Logitech's servers; done, read in the firmware and not tried: not by 1.5's template, which is dead code for a Touch, but yes for a single document by the engine's direct resource put, which passes with no token; a whole configuration still goes by the sync, since a put is not atomic, reloads once per document and queues each for upload, `reference/architectures/harmony-touch/answering-a-sync.md` and `tests/test_harmony_touch_host.py`
- [x] 4.2 If not: whether FreeHarmony could answer the remote's requests in place of Logitech's server; done, read in the firmware and checked against the recorded syncs, nothing of ours has answered one: it reads as possible in the firmware and is untried, since the remote cannot tell one answerer from another and checks the envelope of each answer, not its contents, `reference/architectures/harmony-touch/answering-a-sync.md`, `tests/test_harmony_touch_host.py` and `packages/usb/test/touch-host.test.ts`
- [x] 4.3 Any write to a Touch waits for a decision of its own, as decision 26 was for the Harmony 300 and 350; done: decision 29, the bench Touch may be written, behind a rail of its own on the file protocol

## 5. What a Touch can do that MyHarmony does not offer

- [ ] 5.1 Every field the remote's engine reads (1.3.2's list) set against what MyHarmony writes, from its decompiled code and from the recorded documents; the fields left over are a list of what FreeHarmony could offer beyond MyHarmony, each checked for what the remote does with it, since a field read is not a feature; known so far: gestures bound in a button map, which MyHarmony offers no way to set, and the two vibration settings, which no recorded document carries; out of scope is fixed firmware behaviour no document changes
- [x] 5.2 The Touch's whole interface documented in the reference as an API, in full and for the archive: every name the remote answers to over USB and every request its engine accepts, each with what it does, its parameters and answer, and whether it reads, changes something or acts, read in the firmware, never sent, with a test pinning each list; this also answers whether a stored document can be read back without the named door, put as a question only if no safe route is found; done: the `reference/architectures/harmony-touch/api/` folder, 54 USB names and 120 engine requests each with its kind, a blind re-measure and a prose audit applied, the provisioning-keeps-data verdict settled in the compiled code
  - [x] 5.2.1 The 54 names the remote answers to over USB, file or action, and how `/sys/hlapi` reaches the engine; done: `api/names.md` and `tests/test_harmony_touch_api_names.py`, the 54 names each file or action, which act on open (the two vibration self-test names) and which on a write; two reviews applied
  - [x] 5.2.2 The engine's requests for setup, sync, content, proxy, firmware, logging, buttons and the connection; done, read in the firmware and never sent: 72 requests on `api/setup.md`, `proxy.md`, `connect.md` and `system.md`, `tests/test_harmony_touch_api_setup.py`; a provisioning erases nothing on a Touch, correcting `answering-a-sync.md`, and a stored document can come back by a resource put with no document, never run
  - [x] 5.2.3 The engine's requests for the activity engine, the device engine and home automation; done, read in the firmware and never sent: 48 requests on `api/engine.md`, `activityengine.md` and `automation.md`, `tests/test_harmony_touch_api_engine.py`; none restarts, erases or writes firmware, and `getconfighash` reports the stored documents' tags
  - [x] 5.2.4 One closure over all of it: every request the engine registers is on exactly one page; done: 120 of 120, none on two pages and none unregistered, with `api/README.md` as the index and the shared rules, `tests/test_harmony_touch_api_closure.py`
- [ ] 5.3 A Touch device written by us, with no archive and no Logitech: its protocol definition and device document composed in the shape the Touch reads, from our own schema's durations and names, from a learned code (as a definition from its rhythm, or as a raw code) and from labels the user types; decision 15's note of 3 November 2026
