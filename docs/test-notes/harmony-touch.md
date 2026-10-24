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

## Not done

* No infrared run has been recorded with this unit, and nothing about it in use has been seen and written
  down.
* Nobody has recorded looking at its clock.
* The request and response command `0x08` has never been sent to it.
