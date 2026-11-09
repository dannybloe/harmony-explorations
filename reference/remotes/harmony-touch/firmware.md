# Harmony Touch: firmware

The Touch runs the firmware image Logitech serves for a whole family of later remotes. Which products share
it, the versions that exist, the factory images, Logitech's recovery routes and how a remote of the family
is brought back are
[the platform's firmware](../../architectures/harmony-touch/firmware.md). This page holds what is the
Touch's own.

| | value | evidence |
|---|---|---|
| version | **4.15.330**, the `fw_ver` field of its `/sys/sysinfo`; exactly the production build Logitech's update service serves for skin 99, fetched before the remote was read | [^s200], [^s196] |
| `fw_type` | `0x00`, running normally | [^s200] |
| the image | the production package for skin 99, 13041774 bytes, byte identical to the file served for skin 112, the Harmony 950 | [^s196] |
| a factory image | published on Logitech's content network with no key, for skin 99 and one hub skin only | [^s196] |

The image is a Linux system for TI's DA850 processor, with a signature over what runs, the remote's engine
in compiled Lua and its screens in Lua source; what it holds is
[the platform's firmware](../../architectures/harmony-touch/firmware.md#the-remotes-package)[^t-touch-image].
This said the image's contents had not been examined until it was read.

## Reset and restart

* **The Touch resets itself three ways**, all read in its firmware and none tried: **Settings, General,
  Factory reset**, which the Settings list leaves out in demo mode; the **data error screen**, shown when the
  screens cannot open their first window or their window stack empties, whose one item is a factory reset; and **Off and Menu held together
  while the remote starts**, which the boot loader reads from the power controller. The last rests on the boot
  loader numbering the keys as the kernel does, which is inferred, and how a person makes the remote start
  with the two held is not read: whether a long hold of Off restarts it is the open question in
  [keys.md](keys.md)[^t-touch-recovery]. **No plain restart** is offered on its screens[^t-touch-recovery].
* **A factory reset erases every document, the provisioning and the engine's state and keeps the
  firmware**, so afterwards the remote refuses a sync until it is provisioned again; that Logitech's client
  does it by its own flow is inferred, and the request that does it, `setup.account?provision`, is one any
  host on the cable can send. The Settings screen's text says the reset keeps the account, which disagrees
  with this reading,
  [recovery](../../architectures/harmony-touch/firmware.md#the-remotes-own-factory-reset)[^t-touch-recovery].
* **Logitech's recovery routes**: a hidden recovery tool installs a whole factory firmware image, and
  MyHarmony's "Recover Remote" installs an update and then writes the remote's own reset and restart files,
  [the platform's firmware](../../architectures/harmony-touch/firmware.md#logitechs-recovery-routes). It is
  Logitech's route and this library has no part in it. A Touch reset through the hidden tool holds a
  configuration of zero bytes[^s195]. This said the factory image was Logitech's one
  reset<!--superseded-->, until both clients were read.
* **`/sys/factoryreset` and `/sys/reboot`** are controls rather than files, and **each acts on a write, not
  on an open**: opening one runs nothing, while writing `reboot` restarts the remote and writing `all` opens
  the power controller's and the radio's firmware loader device nodes for writing and arms a factory reset for
  the next start, [the names](../../architectures/harmony-touch/api/names.md#the-names-that-act-on-a-write-and-on-an-open)[^t-touch-api-names]. What it writes to the nodes and what the drivers do is not read. Both were opened for
  reading on a unit and nothing happened[^s200]. They are kept out of reach by `INERT_PATHS`, [usb.md](usb.md).

> This said both open for reading and opening one is to be taken as the action<!--superseded--> its name
> says, until the remote's native program was read: each fills the write slot of its entry and nothing
> else[^t-touch-api-names].
* **A sync stopped halfway is undone over the cable**, measured: while it is marked running the remote answers
  the configuration hash read 202, an abort answers 200 and clears it with the stored documents untouched, and
  the restart request answers 200 and the remote starts normally, [recovery](../../architectures/harmony-touch/firmware.md#a-sync-that-stops-halfway)[^t-touch-first-sync].
  A sync stopped by a USB read timeout inside its first write of answers, after which the remote left the bus and
  started again, left the stored documents as they were, the configuration hash answering 200 with their tags, and
  the same set sent again was committed[^t-touch-removal-of-theirs]; what made it stop is not known[^unchecked].
* **There is no second copy of the application and no safe mode** of the older remotes' kind: the kernel's
  own start program is the recovery system, and it installs a firmware drop or runs a factory reset before
  the system is mounted, [below the application](../../architectures/harmony-touch/firmware.md#below-the-application)[^t-touch-recovery].

## Not checked

* The volumes the firmware and the configuration live on, looked at on a unit rather than read in the
  image[^unchecked]. The image puts the system on a kernel, a root, a data and a cache volume and keeps the
  configuration as documents on the data volume[^t-touch-recovery],
  [below the application](../../architectures/harmony-touch/firmware.md#below-the-application) and [where each is
  kept](../../architectures/harmony-touch/favourites-and-settings.md#where-each-is-kept). *Corrected:* this asked
  where on the remote the firmware and the configuration live<!--superseded-->, which the image has since
  answered.
* Whether the update service's anonymous request serves a different build than a registered unit
  gets[^unchecked].

[^s200]: Measured on a unit. [Section 200](../../../docs/findings.md#s200)
[^s196]: Stated by Logitech, by their service. [Section 196](../../../docs/findings.md#s196)
[^unchecked]: Not checked.
[^s195]: Measured on a unit. [Section 195](../../../docs/findings.md#s195)
[^t-touch-image]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_image.py)
[^t-touch-api-names]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_api_names.py)
[^t-touch-recovery]: Read in the firmware. [The test](../../../tests/harmony_touch/test_harmony_touch_recovery.py)
[^t-touch-removal-of-theirs]: Measured on a unit. [The test](../../../packages/bench/test/harmony-touch/touch-removal-runs.test.ts)
[^t-touch-first-sync]: Measured on a unit. [The test](../../../packages/usb/test/touch/touch-first-sync.test.ts)
