# Harmony Touch test notes

The bench Harmony Touch: how it was first reached, what was sent to it and what its reads settled. What it
showed about the model is in `reference/remotes/harmony-touch/` and about its platform in
`reference/architectures/harmony-touch/`; this file keeps what is one unit's, and the history of getting
there.

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
nothing happened, which was luck rather than design, section 200. The rail `INERT_PATHS` and the named door
`HARMONY_FILE_PATH_EXPERIMENT=1` were the answer.

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

## Not done

* No infrared run has been recorded with this unit, and nothing about it in use has been seen and written
  down.
* Nobody has recorded looking at its clock.
* The request and response command `0x08` has never been sent to it, by us or, in any of the recorded syncs, by Logitech's client.
