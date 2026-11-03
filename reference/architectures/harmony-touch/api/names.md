# Harmony Touch API: the names the remote answers to

Everything a computer does to a Harmony Touch over the cable is done by opening one of a fixed set of
**names**, reading or writing through the handle and closing it, [the file protocol](../../../usb-protocol/file-protocol.md).
This page is the whole set: the names the remote's own native program answers directly, and the one name,
`/sys/hlapi`, through which every request to the remote's software passes. The names the remote's software
then answers are the other pages of this folder, [the API overview](README.md).

Read in the production firmware, build 4.15.330, which serves the Touch and the rest of this
generation[^t-touch-api-names]. The behaviour stated is a Harmony Touch's, host name `juniper`; where a name
is a hub's, it is marked so, and the hubs' own image is not read.

## Who opens these names

* **The sync** opens `/sys/hlapi` and nothing else of its own, writing a request and reading the answer,
  [the sync](../usb.md#provisioning-instead-of-a-compile). A request names an area, `setup`, `proxy`,
  `connect`, `system`, `harmony.engine`, `harmony.activityengine` or `harmony.automation`, and those areas
  are the rest of this folder.
* **A firmware update** writes the package to `/fw/otaupdate`.
* **A factory test** opens the `/tde/` names and the `/ir/`, `/rf/` and `/sys/` test names, which is why so
  many of them exist and why most read a kernel file straight through.
* **The remote's own screens and engine** reach the same software the sync does, but from inside the remote
  rather than over the cable, so they are not callers of these names.

Who opens each of these, the measured `/sys/hlapi` of the sync aside, is **inferred from the name and from
what its handler touches**, not read from a caller: the `/tde/`, `/ir/`, `/rf/` and `/sys/` test names are
taken for the production line because that is what their handlers exercise, and nothing on the image is read
opening them.

## How the table is built

The native program registers its names from one static table of **54 entries of 56 bytes**. Each entry
holds, in order, a path or a dotted prefix, an engine name, an optional backing file, and then **eleven
handler slots**[^t-touch-api-names]. A slot that is filled gives the function that runs one kind of access;
a slot that is empty means that access falls through to nothing. The first four slots are the ordinary file
operations and the rest are for names that do more than read or write a file:

| slot | what it is | shown by |
|---|---|---|
| 0 | open | stats the backing file and opens it |
| 1 | read | returns the backing file's contents |
| 2 | write | writes to the backing file, or acts |
| 3 | close | releases the handle |
| 4, 8, 9 | the generate family: open, generate an answer, close | the names that build their answer rather than read a file, `/sys/sysinfo`, `/sys/logread`, `/rf/deviceinfo` and `/data/resource`; a name can instead fill slot 4 alone with a handler of its own that acts on an open for reading |
| 5, 6, 7, 10 | per name operations | the infrared, radio and firmware names, each its own meaning |

**A name's kind follows from which slots it fills, and when it acts follows from which slot acts.** A name
with an open and a read slot and no write slot is a **read**; one that also has a write slot that stores what
is written is a **change**; one whose write slot acts on the remote beyond its stored data, a restart or a
reset, is an **action**. **Four action names act on a bare write**, filling slot 2 and nothing else:
`/sys/reboot`, `/sys/factoryreset`, `/tde/shipmode` and `/tde/fb`. **Two act on an open for reading**,
filling slot 4 and nothing else with a handler of their own: `/tde/haptic/diagnostic` and
`/tde/haptic/calibrate`, which run the vibration motor's self test or calibration when the name is opened.
So it is not true that no native name acts on being opened; the two haptic test names do. This corrects an
earlier reading that the two actions were the only acting names and both acted on a
write<!--superseded-->.

**Fifty three entries are registered when the program starts, unconditionally.** The fifty fourth,
`/sys/mfg`, is registered only when the manufacturing test flag, the file `/etc/tdeflag`, reads the character
`1`[^t-touch-api-names]. The identity answer for `/sys/sysinfo` is built once at start and kept in the table
itself, so a read of it returns a prepared string rather than gathering anything,
[the architecture number](../README.md#which-architecture-number-17-or-18).

## The whole table

Kinds: **read** returns something and changes nothing; **change** stores what is written; **action** acts on
the remote beyond its stored data; **forward** hands the request to the remote's software. Backing file is
the kernel or cache file the name reads or writes through, where it has one.

| name | engine name | what it does | kind | backing file |
|---|---|---|---|---|
| `/sys/sysinfo` | `sys.info` | the remote's identity and version, built at start | read | |
| `/sys/reboot` | `sys.reboot` | restarts the remote when `reboot` is written | action | |
| `/sys/logread` | `sys.logread` | the system log | read | |
| `/fw/otaupdate` | `sys.otaupdate` | takes a firmware package, for the remote to install | action | `/cache/ota-update.zip` |
| `/fw/hub-otaupdate` | `sys.hub-otaupdate` | takes a hub firmware package | action | `/cache/hub-ota-update.zip` |
| `control.` | | forwards a control request to the software | forward | |
| `harmony.` | | forwards a `harmony.*` request to the software | forward | |
| `proxy.` | | forwards a proxy request to the software | forward | |
| `connect.` | | forwards a connect request to the software | forward | |
| `setup.` | | forwards a setup request to the software | forward | |
| `hub.notify` | | a hub notification to the software | forward | |
| `/ir/ir_cap` | `ir.cap` | learns an infrared code | read | |
| `/ir/ir_send` | `ir.send` | sends an infrared code | action | |
| `/ir/ir_loopback` | `ir.loopback` | the infrared self test | action | |
| `/ir/ir_test` | `ir.test` | an infrared test | action | |
| `/sys/time` | `sys.time` | the clock, set by a write | change | |
| `/rf/pair` | `rf.pair` | pairs the radio with a hub | action | |
| `/rf/hid` | `tde.rfhid` | the radio human interface test | change | |
| `/rf/deviceinfo` | `rf.info` | the radio device information | read | |
| `/rf/unpair` | `rf.unpair` | unpairs the radio | action | |
| | `hot.stats` | the hub radio statistics, no path of its own | read | |
| `/rf/hot` | `hot.` | the hub radio, the full operation set | action | |
| `/rf/test` | `rf.test` | a radio test | action | |
| `/sys/ping` | `sys.ping` | answers that the remote is alive | read | |
| `/sys/led` | `sys.led` | sets a status light | action | |
| `/data/resource` | `data.resource` | fetches a document from a paired hub over the radio | read | |
| `/sys/hlapi` | | the one channel to the remote's software | forward | |
| `/proc` | `sys.proc` | a process information file | read | |
| `/sys/factoryreset` | `sys.factoryreset` | arms or clears a factory reset when written | action | |
| `/tde/flag` | `tde.flag` | the manufacturing test flag | change | `/etc/tdeflag` |
| `/tde/powerstate` | `tde.powerstate` | the power source | change | `/sys/bus/i2c/devices/1-0048/tps6507x-juniper/powersource` |
| `/tde/vbat` | `tde.vbat` | the battery voltage | read | `/sys/bus/i2c/devices/1-0048/tps6507x-juniper/vbat` |
| `/tde/vdc` | `tde.vdc` | the charger voltage | read | `/sys/bus/i2c/devices/1-0048/tps6507x-juniper/vdc` |
| `/tde/vsys` | `tde.vsys` | the system voltage | read | `/sys/bus/i2c/devices/1-0048/tps6507x-juniper/vsys` |
| `/tde/batttemp` | `tde.batttemp` | the battery temperature | read | `/sys/bus/i2c/devices/1-0048/tps6507x-juniper/ts` |
| `/tde/battcharge` | `tde.battcharge` | the battery charge | read | `/sys/bus/i2c/devices/1-0048/tps6507x-juniper/battcharge` |
| `/tde/keyled` | `tde.keyled` | the key backlight | change | `/sys/class/leds/tps6507x:white/brightness` |
| `/tde/backlight` | `tde.backlight` | the screen backlight | change | `/sys/class/backlight/ap3156_backlight/brightness` |
| `/tde/fb` | `tde.fb` | a framebuffer test | action | |
| `/tde/enable` | | turns the test mode on, creating or removing `/etc/tdeenable` | action | |
| `/tde/memtester` | `tde.memtester` | the memory test | change | `/etc/memtester` |
| `/tde/msp430/version` | `msp430.version` | the power controller's version | read | `/sys/bus/i2c/devices/1-0034/version` |
| `/tde/msp430/time` | `msp430.time` | the power controller's clock | read | `/sys/bus/i2c/devices/1-0034/time` |
| `/tde/lcd/model` | `lcd.model` | the screen model | read | `/sys/devices/platform/ili9340_lcd/type` |
| `/tde/fgauge/vbat` | `tde.fgaugevbat` | the fuel gauge battery voltage | read | `/sys/bus/i2c/devices/1-0070/vbat` |
| `/tde/fgauge/current` | `tde.fgaugecur` | the fuel gauge current | read | `/sys/bus/i2c/devices/1-0070/cur` |
| `/tde/fgauge/soc` | `tde.fgaugesoc` | the fuel gauge charge | read | `/sys/bus/i2c/devices/1-0070/soc` |
| `/tde/fgauge/all` | `tde.fgaugeall` | the fuel gauge, every reading | read | `/sys/bus/i2c/devices/1-0070/tdeall` |
| `/tde/shipmode` | `tde.shipmode` | puts the remote into shipping mode on a write | action | |
| `/tde/haptic/diagnostic` | | runs the vibration diagnostic on an open | action | |
| `/tde/haptic/calibrate` | | calibrates the vibration on an open | action | |
| `/tde/accel` | | the accelerometer test | read | |
| `/sys/dropbear` | `sys.dropbear` | reads and writes the secure shell daemon's program file | change | `/usr/sbin/dropbearmulti` |
| `/sys/mfg` | `sys.mfg` | the manufacturing record, when the test flag is set | change | |

## The file families, read in one place

**The kernel backed names** (`/tde/vbat` through `/tde/fgauge/all`, `/proc`, `/sys/dropbear`) share one set
of four handlers, open, read, write and close, which open the backing file, pass its bytes through and close
it[^t-touch-api-names]. A name with only open, read and close is read only; one that also has write, such as
`/tde/keyled` or `/tde/backlight`, writes the value straight to the kernel file. They exist for the factory
test and expose the hardware sensors; none of them touches the configuration. **`/sys/dropbear`'s backing
file is the secure shell daemon's own program binary**, `/usr/sbin/dropbearmulti`, so a write to this name
writes into that program file rather than sending the daemon a control message.

**The generate names** (`/sys/sysinfo`, `/sys/logread`, `/rf/deviceinfo`, `/data/resource`) share the open
and close of the generate family and each builds its own answer rather than reading a backing file. These
are reads.

**The forward names** (`control.`, `harmony.`, `proxy.`, `connect.`, `setup.`, `hub.notify`) carry one
request into the remote's software and its answer back out. They are the dotted areas of the request and
response command; all but `hub.notify` share one forwarder[^t-touch-api-names]. What the software does with
each area is the rest of this folder.

## The names that matter most

### `/sys/hlapi`, the one channel to the software

The whole sync rides on this name, and it is the only name the sync opens of its own,
[the sync](../usb.md#provisioning-instead-of-a-compile). The computer opens it for writing, writes one
request, closes it, opens it for reading and reads the answer. A request is a line of text naming an area
and a command with its arguments; the answer is the word `Response`, a comma and JSON, announced by a
`Content-Length` line when it is long[^t-touch-api-names]. The handler passes the request to the remote's
software and returns its answer; the software's reply comes back to the request that carried it. What the
software answers, area by area, is [the setup](setup.md), [proxy](proxy.md), [connect](connect.md),
[system](system.md), [engine](engine.md), [activity engine](activityengine.md) and
[home control](automation.md) pages.

### `/data/resource`, the engine's radio fetch of a document

This name's answer is built by the generate family: its generate handler reads the key `file` of a JSON
argument `{"file": "<path>"}` and opens that path for reading[^t-touch-api-names]. **But the argument reaches
it only over the radio, not over the file protocol.** Its open slot is the generic generate open, the same
handler `/sys/sysinfo`, `/sys/logread` and `/rf/deviceinfo` fill, which captures no argument; the `file` key
is supplied by the engine when it calls the name as a bus command, `hot.1.data.resource`, over the radio to a
paired hub. So a bare open of `/data/resource` over the file protocol hands the generate handler no `file`,
and opening an empty name fails. This corrects an earlier reading that a read of this name over the cable
returns the file named in its argument<!--superseded-->; the native program's handling of the argument had
not been read[^t-touch-api-names].

**Its one caller is the engine's `getResourceFromHub`**, in `tasks/harmonywebservices/proxy/sync.lua`, which
fetches one of four documents from a paired hub: the `resourceList` of `MapList`, `ActivityList`, `DeviceList`
and `CapabilityList`[^t-touch-api-names]. A Touch synced through Logitech's client has no paired hub, so
nothing on a Touch drives this name. It changes nothing on the remote either way.

**So a configuration is not read back off a Touch by this name.** The one route that hands a stored document
back is the engine's resource put followed by `proxy.request`,
[proxy](proxy.md#can-a-stored-document-be-read-back). `/data/resource` stays off the library's list of inert
paths and behind the named door `HARMONY_FILE_PATH_EXPERIMENT` all the same,
[the Touch's usb.md](../../../remotes/harmony-touch/usb.md), since the door stands in front of every path that
is not already known to be inert.

### The names that act: on a write, and on an open

**Six native names act on the remote beyond their stored data.** Four act on a write and two on an open for
reading[^t-touch-api-names].

**Acting on a bare write**, each filling the write slot and no open or read slot, so opening one for reading
runs no handler and does nothing; the effect is on the content written:

* **`/sys/reboot`** compares the written word with `reboot`, ignoring case, over its first six characters, and
  on a match starts a thread that restarts the remote. Any other content does nothing.
* **`/sys/factoryreset`** opens the two firmware loader device nodes `/dev/mspfw` and `/dev/rffw` for writing
  and creates the marker file `/cache/factoryreset`; the content written is compared against the word
  `all`[^t-touch-api-names]. This corrects the earlier reading that it "erases the power controller and radio
  firmware **files**"<!--superseded-->: the two are device nodes of the firmware loader drivers, not files.
  What the drivers do when written, the exact matching of `all` against the written word, and what consumes
  `/cache/factoryreset` at the next boot, are not read[^unchecked]. The reset runs at that boot from the
  marker, so the write arms it rather than wiping the configuration in place.
* **`/tde/shipmode`** puts the remote into shipping mode and **`/tde/fb`** runs a framebuffer test, each on a
  write, each filling the write slot alone like the two above.

**Acting on an open for reading**, each filling the generate open slot alone with a handler of its own:
`/tde/haptic/diagnostic` runs the vibration motor's self test, and `/tde/haptic/calibrate` its calibration,
when the name is opened for reading[^t-touch-api-names]. The open time handlers of `/ir/ir_loopback` and
`/rf/test`, which fill an open slot beside a generate and a close slot, are not read, so whether they too act
on an open is not settled[^unchecked].

**This is why the library's rail against a path that acts merely on being opened is kept**, not retired,
[the Touch's usb.md](../../../remotes/harmony-touch/usb.md): on this generation some names do act on an open,
so a bare open is not safe by the model, and the named door stands in front of every path not known to be
inert.

### `/tde/enable`, the test mode switch the file requests check

A write to `/tde/enable` creates or removes the file `/etc/tdeenable`[^t-touch-api-names]. That file is the
switch the engine's `connect.jsonfiletransfer` checks before it will read or write any file under the data
folder: its verifier refuses unless `/etc/tdeenable` exists, [connect](connect.md#connectjsonfiletransferget).
So `/tde/enable` over the cable, the engine's file requests and the data folder form a chain: turn the switch
on, and `connect.jsonfiletransfer?get` and `?put` reach any file of `/data` whose `path` and `file` the
request names, a parent folder in either let through. Whether `/etc` is writable on a production unit, and so
whether this chain can be driven on one, is not read[^unchecked].

### `/fw/otaupdate`, which takes a firmware package

The host writes a firmware package to this name, backed by `/cache/ota-update.zip`, for the remote to
install, [the generation's firmware](../firmware.md). `/fw/hub-otaupdate` is the same for a hub's package.
These are the firmware names, so they are the most dangerous names in the table and are never a route this
library takes. Whether the write verifies or bounds the package is not read, only that it takes one.

## Not checked

* What each per name operation slot of the infrared, radio and hub names does beyond its kind: the capture,
  send, loopback and test of `/ir/`, the pair, unpair and test of `/rf/`, and the full operation set of the
  hub radio `/rf/hot`[^unchecked].
* Whether the firmware install names verify or bound the package they are given; only that they take
  one[^unchecked].
* What the power controller, screen and fuel gauge names return in their own units; the backing file and the
  kind are read, the value's format is not[^unchecked].
* What the open time handlers of `/ir/ir_loopback` and `/rf/test` do, and so whether they act on an
  open[^unchecked].
* What the factory reset drivers do when written, how `all` is matched against the written word, and what
  consumes `/cache/factoryreset` at the next boot[^unchecked].
* Whether `/etc` is writable on a production unit, and so whether `/tde/enable` can turn the file requests'
  test mode on there[^unchecked].
* Whether the hubs' sibling image registers the same names; only the remotes' image is read[^unchecked].

[^t-touch-api-names]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_api_names.py)
[^unchecked]: Not checked.
