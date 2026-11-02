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
**Nothing writes to a Touch and it is on no write list.** A read of a path outside `INERT_PATHS` needs the
named door, and an item that seems to need one is a question first. Logitech's images and anything
unpacked from them stay in the lab; only names, sizes and findings come into this repository.

Written on 2 November 2026. Not placed in `todo.md`'s sequence yet; linked from `todo-later.md` 5.5.

---

## 1. Where the configuration lives, from the firmware

- [x] 1.1 Open `/cfg/usercfg` on the bench Touch once more, read only, now that it holds a setup synced after the reset; done: refused at open with the setup on it, and `/sys/sysinfo` read in the same sitting as the control, so the configuration is not at that path rather than absent
- [x] 1.2 Unpack the Touch's production image, 4.15.330, from the lab's `firmware/packages/sus/` into the lab, and list its file system and its processor; done, with the preview build beside it: a signed Linux system for TI's DA850 (ARM926EJ-S), the engine compiled Lua 5.1 and the screens Lua source, unpacked in the lab's `work/touch-firmware/`, `tests/test_harmony_touch_image.py`; the engine names JSON files under `/data/resources/`, the lead for 1.3
- [ ] 1.3 Where the remote keeps its configuration on its own file system, in what files and what form
  - [ ] 1.3.1 The engine's 172 compiled Lua files decompiled into the lab as source, as MyHarmony is, a sample compiled back and compared with the original, and registered
  - [ ] 1.3.2 From the decompiled reader, every field and feature a configuration can hold, as the list 2.2.1 fills the remote from
- [ ] 1.4 Which names the remote answers to over USB, read off the firmware: which are files, which are actions, and whether the configuration is among them
- [ ] 1.5 Logitech's `SKIN99/userconfiguration.xml`, in the lab's mirror of their desktop web application, read whole (decision 2): the path it writes, the sizes, the `MD5` check, and what in the client calls it
- [ ] 1.6 How the remote builds its list of requests during a sync: the first address, its certificate, the version labels, and what a complete sync covers
- [ ] 1.7 Which architecture number the firmware uses for itself, 17 or 18, the open question of `reference/architectures/harmony-touch/README.md`

## 2. One sync recorded

- [ ] 2.1 Whether the client's web requests can be seen through a proxy: Harmony Desktop on the Mac first, which shows the bench Touch and whose app and web application are in the lab's `software/`, then MyHarmony's decompiled code (decision 2)
- [ ] 2.2 The go-ahead for syncing the bench Touch through MyHarmony while recording, asked and not assumed
  - [ ] 2.2.1 Before the recording, the bench Touch's setup filled on the test account so it touches every feature on 1.3.2's list: devices, activities, favourites, sequences
- [ ] 2.3 One complete sync recorded into the lab: every request the remote hands over and every answer, complete by 1.6's measure
- [ ] 2.4 Only if a proxy cannot see it: the request and response command sent by us, a command never sent to a Touch, through the `probe-remote` gate first

## 3. The Touch described

- [ ] 3.1 The configuration's format in `reference/remotes/harmony-touch/` and `reference/architectures/harmony-touch/`, every fact with its footnote and regression test
- [ ] 3.2 Keys, screen and limits measured, replacing what the reference takes from the manual
- [ ] 3.3 A reader for the configuration in `packages/codec`, if 1 and 2 show it is a file the codec can read

## 4. Whether we can configure it ourselves

- [ ] 4.1 Whether the files of 1.3 can be put on the remote directly, by the route of 1.5, without a sync through Logitech's servers
- [ ] 4.2 If not: whether FreeHarmony could answer the remote's requests in place of Logitech's server
- [ ] 4.3 Any write to a Touch waits for a decision of its own, as decision 26 was for the Harmony 300 and 350
