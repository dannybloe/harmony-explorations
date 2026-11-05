#!/usr/bin/env python3
"""How a Harmony Touch is brought back when a configuration goes wrong, read in its firmware and in
Logitech's two desktop clients: what the engine does with a set that fails to load, what a sync stopped
halfway leaves, what the remote's own factory reset erases and how it is armed, what Logitech's recovery
routes send, and what lies below the application.

**The question.** `todo-touch.md` 6.1 asked, before the first write to a Touch, how a remote is brought back
after a sync of ours leaves it in a bad state, and how sure that is. The page is the "Recovery" section of
`reference/architectures/harmony-touch/firmware.md`, and the route a person follows is the Harmony Touch
section of `.claude/skills/recovering-a-remote/SKILL.md`. The private working note with every file and line
is `work/touch-firmware/notes/6.1-recovery.md` in the lab.

**Sources checked first.** `reference/architectures/harmony-touch/firmware.md`, `answering-a-sync.md` and
`api/`, `reference/remotes/harmony-touch/behaviour.md` and `keys.md`, `docs/test-notes/harmony-touch.md`,
findings sections 195 and 196, and the lab notes `1.3-how-a-configuration-arrives.md` and
`4.2-answering-the-remote.md`, whose "not settled" line about an uncaught error in the reader this answers.
Then the firmware: the decompiled engine, the screens' Lua source, the native program `usr/bin/hal`, the boot
loader `lib/firmware/u-boot.bin`, the kernel's built in initramfs and the package's updater. And **Logitech's
clients, decision 2**: MyHarmony decompiled (`work/myharmony/src`), its recovery screen, its protocol
templates for skin 99 and its REST layer; and Harmony Desktop's web application for its recovery view and
its copy of the same template. MyHarmony's Alt-F9 page runs a Silverlight utility that is not in the lab, so
what that page sends is not read.

## What was read, and what it settles

**1. A set that fails to load, and the two ways it fails.** A document that is missing or is not valid JSON
makes the loader return nothing: the store's read decodes inside `safeCall`, and `loadAll` in
`tasks/harmonyengine/main.lua` returns nil on any nil. A document that is valid JSON but lacks an array the
reader walks makes the reader raise: the reader's functions walk `ipairs` of each top level array with no
guard, and the reader's one `safeCall` is around an activity's `Alternatives`. The configuration task holds
no `pcall`, `xpcall` or `safeCall` at all. **An error ends the task**: the scheduler's `_runtask`
(`works/system.lua`) logs a coroutine that ends in an error and deletes it from the task list, and does not
unregister its listeners. The watchdog task touches its file every 5000 ms through `openWatchDog` whatever
the other tasks do, so a dead configuration task does not restart the remote; the native watchdog program,
started by `rcS` unless `/etc/nowatchdog` exists, watches that folder, which is read by its strings only.

**Who is answered.** The scheduler answers the message a task was handling when it died, with nothing, so the
sender's `sendMessage` returns nil; a later message to the dead task, which is still a listener, parks its
sender for ever; a message for a name nobody registered returns false at once. Read in `run` and
`sendTaskMessage`; the test pins the names those functions hold and that `_runtask` names no
`unregisterMessage`.

**At start** the configuration task loads before it registers (`loaded:` is met before `init_he_plugin` in
the task's main function). So a set that raises at start leaves `config_unload` and `config_new` unregistered:
every request with `WaitAccountRegistered` waits for ever, which is 23 of the 31 `harmony.engine?` requests
(`api/engine.md`'s table says which; the eight without it are `pairingbutton`, `allpoweron`, `wlanstatus` and the IP manager's five), the
four `control.button?` requests and `connect.discoveryinfo?get`;
the sync requests answer, since none carries that check and the local HTTP connector is started at once on a
Touch (`hasNetwork` is false on `juniper`, `mfgdata.lua`, and `netservicestarter.lua` then loads the
connectors without waiting); but **every sync aborts at its end**, because the last answer's reload finds no
listener, `syncResponseCallback` returns "unable to restart harmony engine", and the answer handler aborts.
**Whether the sync flag then stays set depends on the screens**: the answer handler's abort empties the queue
and announces 553 and does not clear the flag, so the gathered set stays in `/data/tmp`; the screens turn that
announcement into `proxy.abort` while they hold a sync as running (`appscommon/harmony.lua` `syncFailure`),
and that abort clears the flag and, finding no listener, returns at once. A sync the screens do not hold as
running leaves the flag set, and then `setup.sync` answers 202 until `proxy.abort` or a restart. The blind
re-reading of 6.3 read the engine alone and had the flag stay set; both are the code, and which one a unit
meets turns on the screens, which is not tried. Two requests reach the store anyway: `setup.sync?deleteresources`, and `proxy.resource?put`, which saves
before it tries the reload. A restart loads what they leave, and the engine's own restart request,
`setup.firmware?reboot`, is the setup task's: it adds a task that sleeps 2000 ms and calls the native
restart, and sends nothing to the configuration task, so it reaches a remote whose configuration task is
dead. It answers 202 while a sync flag is set.

**During a sync** the reload reads the gathered set, `/data/tmp`: the last of the six answers is saved there
and then sends `config_new`, so the engine tries the new set **before** the commit, which is `proxy.finished`,
sent by the remote's own screens once the content and pictures are in (`appscommon/harmony.lua`
`sendProxyFinished`). A raise there kills the task after it registered. The reload's own sender is answered
nil and the sync aborts as for a missing document, uncommitted; then the screens' `proxy.abort` runs
`sync.syncAbort`, which cleans the set aside through the store **before** it sends the reload that never
returns, so the abort's own answer never comes and `proxy://Abort` is never queued. The previous set is
untouched on disk. A second sync's last answer parks the same way. **The commit loads nothing**: the
finish's `syncComplete` saves and swaps and sends no `config_new`, so a `proxy.finished` sent while the flag
is set, before the screens' abort, would commit the gathered set the reload had just failed on, and the next
start would meet it as a set that raises at start. That warning is the blind re-reading's; the request rail
of 6.3 refuses `proxy.finished`. **A restart brings the previous set back**: the
resource manager's module body ends by calling `init`, which deletes the set aside. No previous set is kept
after a commit: `syncSuccess` is the only function that names the backup folder suffix `_1`, and it removes
the backup once the swap is done.

**2. A sync stopped halfway.** With the remote left running the sync flag stays set and `setup.sync` answers
202; `proxy.abort` clears it. A restart clears it by `init`. The persisted queue keeps only put requests
(`offlinequeue.lua` writes one list to its file, from `savePutRequests` and from the two removals, and only
a request whose verb is put is inserted into that list).
The commit precedes the queuing of `proxy://Finished` (`test_harmony_touch_host.py`), so a stop after the
commit leaves the new set committed.

**3. The factory reset, read in the initramfs.** The kernel's built in initramfs is a `newc` archive of device
nodes, empty mount points and one program, `/init`, a static ARM executable whose strings are reached as
offsets from its global offset table, read here from its section headers. Its reset routine's literal pool
holds, in four consecutive words, the reset message, `mtd:data`, `mtd:cache` and `/mnt/cache`: it erases the
data and the cache volumes. Its main function searches `/proc/cmdline` for `factoryreset` before mounting
anything, then mounts the cache, installs `/mnt/cache/ota-update.zip` when one is there, else erases when
`/mnt/cache/factoryreset` exists, then mounts the root squashfs read only with the data volume as a writable
`unionfs` layer over it; the pool holds those strings in that order. The root filesystem holds no `data`
folder, so every document, the index and the provisioning (`luaworks/provision`, `preferencemanager.lua`)
live in the data volume. The factory reset erases them and nothing else.

**How it is armed, three ways.** The marker `/cache/factoryreset`: the native program's `/sys/factoryreset`
write handler creates it (`test_harmony_touch_api_names.py`), and so does the screens' Settings reset
(`juniper/settings/factoryReset.lua`, offered unless `DemoMode` is set). The restart's word: the native
program's restart routine passes `factoryreset` when the marker exists and `upgrade` when a firmware drop does,
through the `reboot` system call with Linux's magic words and `LINUX_REBOOT_CMD_RESTART2`; the kernel's
MSP430 driver holds the same two words, and that it hands them to the microcontroller is inferred. The boot
loader: it reads the MSP430 at I2C address `0x34`, register `0x1F` (the reason) and register `0x14` (the
keys), and **when the reason is 2 or the key word is exactly `0x00080001`** prints "factory reset" and adds
`factoryreset` to the kernel's arguments (`cmp r5, #2` and `cmpne r9, r3` before the load of that message,
with `0x00080001` in `r3`); reason 1 is "firmware upgrade". Bit 0 is Off and bit 19 is Menu in the kernel's
key table, `test_harmony_touch_keys.py`: **Off with Menu held while the remote starts selects a factory
reset**, on the inference that the boot loader's key word is numbered as the kernel's, which bit 0 being the
"power button" in both supports. Never tried. The screens' data error screen (`appscommon/errorscreen.lua`,
shown when the screens' first window fails to load or their stack empties) offers a factory reset that
restarts with the word and does **not** create the marker. No plain restart is offered on a Touch's settings.

**4. Logitech's routes.** MyHarmony's "Recover Remote" screen (`RemoteResetViewModel`, its resource file's
header text) installs a firmware update and, when that succeeds, runs the factory reset operation; skin 99's
template for it opens `/sys/factoryreset` for writing, writes the one byte `0x31`, closes, then writes
`reboot` to `/sys/reboot`, and Harmony Desktop carries the same template. The separate RF firmware erase
writes `all` to `/sys/factoryreset` and does not restart. Harmony Desktop's recovery view instead installs a
factory image, `Firmware/99/firmware_factory.hfw2`, through its ordinary firmware install. Every write these
routes make goes to the native program, not to the engine. The updater a firmware install runs writes the
kernel, root, log and boot loader volumes and deletes five system folders of the writable layer
(`/mnt/data/bin`, `lib`, `opt`, `sbin`, `usr`) and nothing else under `/mnt/data/`, so by the production
updater a firmware install keeps the documents; the Touch's factory package is not in the lab, so the zero
bytes measured after the bench reset (section 195) is **not explained** here.

**5. Back to Logitech's service.** MyHarmony sends the remote's own tag with each request it forwards:
`RestService.Get` puts it in header 31 of `HttpRequestHeader`, `If-None-Match`, and `RestService.Put` in
header 29, `If-Match`, numbers taken as .NET's. So tags of ours reach Logitech's service. What the service
does with a tag it did not issue is not readable here, and is 6.8's to measure. A remote that has no file
for a document sends no tag for it (`test_harmony_touch_host.py`), so `setup.sync?deleteresources` before
Logitech's sync takes the tags out of the question.

**6. Below the application.** No second bank of the application: one root, one data and one cache volume.
The boot loader's `bootcmd` tries the UBI volume `kernel` and then `kernel2`; the updater names `mtd:kernel`
and never `kernel2`, so nothing in the image writes the second one, and what a unit holds there is not
checked. The recovery system is the initramfs above. The boot loader's console and a shell are on the serial
port `ttyS2` (`bootargs`, `etc/inittab`); whether a Touch's board brings it out is not checked.

**What this corrects.** The platform page said Logitech's way back "is not a command": that is Harmony
Desktop's recovery view; MyHarmony's sends one, and the remote has a reset of its own. The API pages said
`WaitAccountRegistered` waits until the first load "whether that load succeeded or not"<!--superseded-->; it waits for ever
when that load raised. And the lab note 4.2 said the sender of the failing reload "waits for a reply that
never comes": the scheduler answers it, and it is the abort and later reloads that wait.

**Width.** One build, the production image 4.15.330, the build a Touch reports. The engine runs on the hubs
too, under other host names and branches, and nothing here is checked there; the boot loader, the
initramfs and the native program are the remotes' package's. Logitech's two clients as mirrored in the lab.

**Standing.** "Read in the firmware" and "Stated by Logitech, in their client". The firmware and the
clients are Logitech's, so they stay in the lab; this file asserts the presence, order and count of names,
strings, constants and instruction words, and quotes none of the code around them. **So a test here holds the
constants a reading rests on and the order the compiler met them in, and not the control flow between
them**: that the load returns nil on a failure, or that the registration waits on the load, is the decompiled
reading, named in the titles as what the constants show ("names the four failure messages", "meets the load
before the first registration") and not as what the code does.

**The controls.** Each negative here has a positive beside it from the same search: the dead task's
`unregisterMessage` absent from `_runtask` and present in its own function; the error screen without the
marker and the Settings reset with it; `kernel2` absent from the updater and present in the boot loader;
`/mnt/data/` names in the updater counted exactly; the reader's single `safeCall` found and the engine
task's none.
"""
import io
import os
import re
import struct
import tempfile
import unittest
import xml.etree.ElementTree as ElementTree

import lab
from test_harmony_touch_activities import prototypes
from test_harmony_touch_api_names import c_string
from test_harmony_touch_architecture import Elf
from test_harmony_touch_image import UNSQUASHFS, SquashfsReader, inflated_kernel, members
from test_harmony_touch_keys import KEYPAD

BUILD = 'touch_package_production'
ENGINE = 'opt/luaworks/'
SCREENS = 'opt/luadraws/'

HE_MAIN = ENGINE + 'tasks/harmonyengine/main.lua'
READER = ENGINE + 'tasks/harmonyengine/loader/userconfigreader.lua'
SYSTEM = ENGINE + 'works/system.lua'
RESMGR = ENGINE + 'tasks/harmonywebservices/core/resourcemanager.lua'
PREFS = ENGINE + 'tasks/harmonywebservices/core/preferencemanager.lua'
SYNC = ENGINE + 'tasks/harmonywebservices/proxy/sync.lua'
PROXY = ENGINE + 'tasks/harmonywebservices/apihandler/proxy.lua'
RESOURCE = ENGINE + 'tasks/harmonywebservices/apihandler/resource.lua'
QUEUE = ENGINE + 'tasks/eventqueue/core/offlinequeue.lua'
STARTER = ENGINE + 'tasks/connectserver/netservicestarter.lua'
CONNECTOR = ENGINE + 'tasks/connectserver/transport/halhttpserverconnector.lua'
MFG = ENGINE + 'tasks/mfg/core/mfgdata.lua'
WATCHDOG_TASK = ENGINE + 'tasks/watchdog/main.lua'
FIRMWARE_REQUESTS = ENGINE + 'tasks/setup/apihandler/firmware.lua'

SETTINGS_RESET = SCREENS + 'juniper/settings/factoryReset.lua'
SETTINGS = SCREENS + 'juniper/settings.lua'
ERROR_SCREEN = SCREENS + 'appscommon/errorscreen.lua'
SCREENS_MAIN = SCREENS + 'main.lua'
SCREENS_INIT = SCREENS + 'juniper/init.lua'

RCS = 'etc/init.d/rcS'
INITTAB = 'etc/inittab'
HAL = 'usr/bin/hal'
WATCHDOG = 'usr/bin/watchdog'
UBOOT = 'lib/firmware/u-boot.bin'

FILES = [HE_MAIN, FIRMWARE_REQUESTS, READER, SYSTEM, RESMGR, PREFS, SYNC, PROXY, RESOURCE, QUEUE, STARTER, CONNECTOR, MFG,
         WATCHDOG_TASK, SETTINGS_RESET, SETTINGS, ERROR_SCREEN, SCREENS_MAIN, SCREENS_INIT, RCS, INITTAB,
         HAL, WATCHDOG, UBOOT]

#: MyHarmony decompiled, in the lab. The three files below it are read for names and the template's packets.
MYHARMONY = os.path.join(lab.LAB, 'work', 'myharmony', 'src') if lab.LAB else None
MH_RESET = ('Web.Driver', 'Logitech.Harmony.Web.Driver.Resources.Templates.SKIN99.factoryreset.xml')
MH_ERASE_RF = ('Web.Driver', 'Logitech.Harmony.Web.Driver.Resources.Templates.SKIN99.eraserffirmware.xml')
MH_RECOVER = ('Web.MartiniWeb.Tasks.Remote.Settings',
              'Logitech.Harmony.Web.MartiniWeb.Tasks.Remote.Settings.ViewModels', 'RemoteResetViewModel.cs')
MH_RECOVER_TEXT = ('Web.MartiniWeb.Tasks.Remote.Settings',
                   'Logitech.Harmony.Web.MartiniWeb.Tasks.Remote.Settings.Resources.RemoteResetView.resx')
MH_REST = ('Web.Data.RestPlatform', 'Logitech.Harmony.Web.Data.RestPlatform', 'RestService.cs')
MH_FILES = [MH_RESET, MH_ERASE_RF, MH_RECOVER, MH_RECOVER_TEXT, MH_REST]

#: The key word the boot loader compares with, and the two kernel bits it is made of.
RESET_KEYS = 0x00080001
OFF_BIT, MENU_BIT = 0, 19


def strings_in(function):
    return {c for c in function['constants'] if isinstance(c, bytes)}


def newc_files(blob, at):
    """The regular files of a `newc` cpio archive starting at `at`, as name to bytes, and every name in order."""
    files, names = {}, []
    while True:
        header = blob[at:at + 110]
        if header[:6] != b'070701':
            raise AssertionError('no newc header at %d' % at)
        field = [int(header[6 + 8 * i:14 + 8 * i], 16) for i in range(13)]
        mode, size, name_size = field[1], field[6], field[11]
        name = blob[at + 110:at + 110 + name_size - 1].decode()
        data_at = (at + 110 + name_size + 3) & ~3
        if name == 'TRAILER!!!':
            return files, names
        names.append(name)
        if mode & 0o170000 == 0o100000:
            files[name] = blob[data_at:data_at + size]
        at = (data_at + size + 3) & ~3


def section(elf_bytes, wanted):
    """The address of a named section of a 32 bit little endian ELF, from its section headers."""
    shoff = struct.unpack_from('<I', elf_bytes, 32)[0]
    entsize, count, names_index = struct.unpack_from('<HHH', elf_bytes, 46)
    names_at = struct.unpack_from('<I', elf_bytes, shoff + names_index * entsize + 16)[0]
    for i in range(count):
        name_off, _, _, addr = struct.unpack_from('<4I', elf_bytes, shoff + i * entsize)
        end = elf_bytes.index(b'\0', names_at + name_off)
        if elf_bytes[names_at + name_off:end] == wanted:
            return addr
    raise AssertionError('no section %r' % wanted)


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheImage(unittest.TestCase):
    """The production build's files this reading names, its updater and its kernel, read once."""

    _read = None

    @classmethod
    def setUpClass(cls):
        lab.require(BUILD)
        if TheImage._read is None:
            found = members(BUILD)
            with tempfile.TemporaryDirectory() as directory:
                reader = SquashfsReader(found['harmony-image.squashfs'], directory)
                files = reader.each(FILES)
                names = reader.names()
            TheImage._read = (files, names, found['update'], inflated_kernel(found['uImage.bin']))
        cls.files, cls.names, cls.updater, cls.kernel = TheImage._read

    def functions(self, path):
        return prototypes(self.files[path])

    def function_with(self, path, *texts):
        """The one function of an engine file whose string constants include every one of `texts`."""
        wanted = {t.encode() for t in texts}
        found = [f for f in self.functions(path) if wanted <= strings_in(f)]
        self.assertEqual(len(found), 1, '%s in %s' % (texts, path.rsplit('/', 1)[1]))
        return found[0]

    def order(self, function, *texts):
        """Where each text first appears in a function's constants; Lua 5.1 numbers them as it meets them."""
        return [function['constants'].index(t.encode()) for t in texts]

    def initramfs(self):
        at = self.kernel.find(b'070701')
        files, names = newc_files(self.kernel, at)
        return files, names


class ALoadThatRaisesEndsTheConfigurationTask(TheImage):
    """1: how the two kinds of failure differ, and what an error does to the task that loads the set."""

    def test_the_configuration_task_catches_nothing_and_the_reader_catches_one_field(self):
        held = {c for f in self.functions(HE_MAIN) for c in strings_in(f)}
        self.assertFalse({b'pcall', b'xpcall', b'safeCall'} & held)
        catching = [f for f in self.functions(READER) if b'safeCall' in strings_in(f)]
        self.assertEqual(len(catching), 1, 'the reader catches in one function')
        self.assertIn(b'Alternatives', strings_in(catching[0]))
        # The reader walks each document's top level array.
        for array in (b'Activities', b'DevicesWithFeatures', b'ButtonMaps', b'Protocols'):
            self.assertTrue(any({array, b'ipairs'} <= strings_in(f) for f in self.functions(READER)), array)

    def test_the_load_names_the_four_failure_messages(self):
        load = self.function_with(HE_MAIN, 'Unable to load devices', 'Finished loading data')
        for message in ('Unable to load activities', 'Unable to load buttonmaps', 'Unable to load protocols'):
            self.assertIn(message.encode(), strings_in(load))

    def test_the_task_meets_the_load_before_the_first_registration(self):
        body = self.functions(HE_MAIN)[0]
        loaded, first_listener = self.order(body, 'loaded:', 'init_he_plugin')
        self.assertLess(loaded, first_listener)
        self.assertTrue({b'config_new', b'config_unload', b'listenMessage', b'config_failure',
                         b'config_success'} <= strings_in(body))

    def test_an_error_removes_the_task_and_leaves_its_listeners(self):
        runner = self.function_with(SYSTEM, 'Exit Coroutine', ' BLOCKING, took ')
        self.assertIn(b'delete', strings_in(runner))
        self.assertNotIn(b'unregisterMessage', strings_in(runner))
        # The control: unregistering is a function of its own, found by the same reading.
        self.function_with(SYSTEM, 'unregister listener:')

    def test_the_scheduler_replies_and_a_send_parks_its_sender(self):
        self.assertTrue({b'replyTask', b'reply_message'} <= strings_in(self.function_with(SYSTEM, 'reply_message')))
        self.assertTrue({b'reply', b'Exit Coroutine sendTaskMessage'} <=
                        strings_in(self.function_with(SYSTEM, 'Exit Coroutine sendTaskMessage')))
        self.function_with(SYSTEM, 'No listener registered for sending messages')

    def test_the_watchdog_task_feeds_its_file_whatever_the_others_do(self):
        self.assertIn(b'/var/watchdog/luaworks', strings_in(self.function_with(SYSTEM, '/var/watchdog/luaworks')))
        task = strings_in(self.functions(WATCHDOG_TASK)[0])
        self.assertIn(b'openWatchDog', task)
        self.assertIn(5000.0, self.functions(WATCHDOG_TASK)[0]['constants'])
        self.assertTrue(b'/usr/bin/watchdog' in self.files[RCS], b'/usr/bin/watchdog')
        self.assertTrue(b'/etc/nowatchdog' in self.files[RCS], b'/etc/nowatchdog')
        for text in (b'/var/watchdog', b'/dev/watchdog', b'not touched %s'):
            self.assertTrue(text in self.files[WATCHDOG], text)


class TheCableStillReachesTheEngine(TheImage):
    """1: the local connector starts without waiting for the configuration task on a Touch, and serves each
    connection in a task of its own; a sync's last answer and the abort both reload through `config_new`."""

    def test_a_touch_has_no_network_so_the_connectors_start_at_once(self):
        body = strings_in(self.functions(MFG)[0])
        self.assertTrue({b'juniper', b'hasNetwork', b'getHostName'} <= body)
        starter = strings_in(self.functions(STARTER)[0])
        self.assertTrue({b'hasNetwork', b'config_unload',
                         b'tasks/connectserver/transport/halhttpserverconnector.lua'} <= starter)

    def test_each_connection_is_a_task_of_its_own(self):
        self.assertTrue({b'addTask', b'client'} <= strings_in(self.functions(CONNECTOR)[0]))

    def test_the_last_answer_reloads_and_aborts_when_the_reload_fails(self):
        callback = self.function_with(SYNC, 'invalid statusCode ', 'saveResource')
        self.assertTrue({b'config_new', b'unable to restart harmony engine'} <= strings_in(callback))

    def test_the_commit_swaps_the_set_and_reloads_nothing(self):
        # The finish's commit: it names the store's swap and no reload, so what it commits is not tried first.
        commit = self.function_with(SYNC, 'syncSuccess', 'configStale')
        self.assertNotIn(b'config_new', strings_in(commit))
        # The control: the abort beside it does name the reload.
        self.assertIn(b'config_new', strings_in(self.function_with(SYNC, 'syncAbort', 'config_new', 'remote')))

    def test_the_abort_cleans_the_store_before_it_reloads(self):
        abort = self.function_with(SYNC, 'syncAbort', 'config_new', 'remote')
        store, reload = self.order(abort, 'syncAbort', 'config_new')
        self.assertLess(store, reload)
        handler = self.function_with(PROXY, 'proxy://Abort')
        self.assertLess(*self.order(handler, 'syncAbort', 'proxy://Abort'))

    def test_the_direct_put_saves_before_it_tries_the_reload_and_asks_nothing_first(self):
        put = self.function_with(RESOURCE, 'requests', 'saveResource', 'config_new', 'Insufficient arguments')
        self.assertLess(*self.order(put, 'saveResource', 'config_new'))
        self.assertNotIn(b'isMessageRegistered', strings_in(put))
        # The control: the hub's put, in the same file, does ask first.
        self.assertTrue(any({b'isMessageRegistered', b'config_new'} <= strings_in(f)
                            for f in self.functions(RESOURCE)))

    def test_the_restart_request_restarts_without_the_configuration_task(self):
        # The handler adds a task, and the task sleeps two seconds and calls the native restart.
        handler = self.function_with(FIRMWARE_REQUESTS, 'reboot', 'rebootTask', 'addTask')
        task = [f for f in self.functions(FIRMWARE_REQUESTS)
                if {b'blockingSleep', b'reboot'} <= strings_in(f) and 2000.0 in f['constants']]
        self.assertEqual(len(task), 1)
        for function in (handler, task[0]):
            self.assertFalse({b'sendMessage', b'config_new', b'sendTaskMessage'} & strings_in(function))


class NoPreviousSetIsKept(TheImage):
    """1 and 2: the set aside is deleted at every start, and the commit's backup is removed once the swap is
    done."""

    def test_the_store_deletes_the_set_aside_at_start(self):
        init = [f for f in self.functions(RESMGR)
                if {b'removeFolder', b'tmp', b'resources', b'syncInProgress'} <= strings_in(f)
                and b'rename' not in strings_in(f)]
        self.assertEqual(len(init), 1)
        self.assertIn(b'init', strings_in(self.functions(RESMGR)[0]), 'the module body calls it')

    def test_only_the_commit_names_the_backup_and_it_removes_it(self):
        backup = [f for f in self.functions(RESMGR) if b'_1' in strings_in(f)]
        self.assertEqual(len(backup), 1)
        self.assertTrue({b'rename', b'removeFolder', b'tmp'} <= strings_in(backup[0]))

    def test_the_queue_persists_one_list_and_only_puts_enter_it(self):
        # Three functions write the file, each with the same list (an upvalue, so no string names it):
        # the save of the puts and the two removals.
        saved = [f for f in self.functions(QUEUE) if b'saveDataFile' in strings_in(f)]
        self.assertEqual(len(saved), 3)
        body = strings_in(self.functions(QUEUE)[0])
        self.assertTrue({b'savePutRequests', b'removeAllPutRequests', b'removeAll'} <= body)
        # What enters that list is tested against the verb put, alongside the insert.
        entering = [f for f in self.functions(QUEUE) if {b'verb', b'put', b'insert'} <= strings_in(f)]
        self.assertEqual(len(entering), 1)

    def test_the_provisioning_lives_in_the_data_folder_and_the_image_has_none(self):
        self.assertTrue({b'preferences', b'luaworks/provision'} <= strings_in(self.functions(PREFS)[0]))
        self.assertFalse([n for n in self.names if n == 'data' or n.startswith('data/')])
        # The control: the image's own folders are listed by the same reading.
        self.assertTrue([n for n in self.names if n.startswith('opt/luaworks/')])


class TheFactoryResetErasesTheWritableLayer(TheImage):
    """3: the initramfs's program, what its reset erases and in which order it starts the system."""

    def test_the_initramfs_holds_one_program(self):
        files, names = self.initramfs()
        self.assertEqual(list(files), ['/init'])
        self.assertTrue({'/mnt/cache', '/mnt/data', '/mnt/root', '/mnt/union'} <= set(names))

    def literals(self, program, text):
        """Where a string is referenced: each word of the code holding its offset from the GOT."""
        elf = Elf(program)
        got = section(program, b'.got')
        target = program.index(text + b'\0')
        va = None
        for vaddr, offset, size in elf.segments:
            if offset <= target < offset + size:
                va = target - offset + vaddr
        self.assertIsNotNone(va)
        word = struct.pack('<I', (va - got) & 0xFFFFFFFF)
        return [i for i in range(0, len(program) - 3, 4) if program[i:i + 4] == word]

    def test_the_reset_routine_names_the_data_and_cache_volumes_together(self):
        program = self.initramfs()[0]['/init']
        message = self.literals(program, b'[init] Factory reset ...')
        self.assertEqual(len(message), 1)
        at = message[0]
        self.assertIn(at + 4, self.literals(program, b'mtd:data'))
        self.assertIn(at + 8, self.literals(program, b'mtd:cache'))
        self.assertIn(at + 12, self.literals(program, b'/mnt/cache'))

    def test_the_start_checks_the_command_line_then_the_drop_then_the_marker_then_mounts(self):
        program = self.initramfs()[0]['/init']
        steps = [b'factoryreset', b'/mnt/cache/ota-update.zip', b'/mnt/cache/factoryreset', b'mtd:root',
                 b'dirs=/mnt/data=rw:/mnt/root=ro']
        places = [self.literals(program, s) for s in steps]
        for step, found in zip(steps, places):
            self.assertTrue(found, step)
        first = min(places[0])
        chain = [first]
        for found in places[1:]:
            later = [p for p in found if p > chain[-1]]
            self.assertTrue(later, 'the pool holds the steps in order')
            chain.append(min(later))
        self.assertLess(chain[-1] - chain[0], 0x100, 'in one literal pool')
        self.assertTrue(b'/proc/cmdline' in program, b'/proc/cmdline')
        self.assertTrue(b'unionfs' in program, b'unionfs')

    def test_a_firmware_drop_is_checked_and_installed_by_the_updater(self):
        program = self.initramfs()[0]['/init']
        for text in (b'digest', b'sdigest', b'[init] Rsa decrypt failed', b'[init] Digest mismatch',
                     b'/tmp/update', b'/mnt/cache/ota-update-complete.zip'):
            self.assertTrue(text in program, text)


class AFirmwareInstallKeepsTheDocuments(TheImage):
    """4 and 6: what the updater writes and deletes, and that it never names the second kernel."""

    def test_the_updater_writes_four_volumes_and_deletes_five_system_folders(self):
        for volume in (b'mtd:kernel', b'mtd:root', b'mtd:log', b'mtd:u-boot'):
            self.assertTrue(volume + b'\0' in self.updater, volume + b'\0')
        under_data = set(re.findall(rb'/mnt/data/[\w/]*', self.updater))
        self.assertEqual(under_data, {b'/mnt/data/', b'/mnt/data/bin', b'/mnt/data/lib', b'/mnt/data/opt',
                                      b'/mnt/data/sbin', b'/mnt/data/usr'})

    def test_the_second_kernel_is_named_by_the_boot_loader_and_by_no_updater(self):
        self.assertFalse(b'kernel2' in self.updater, b'kernel2')
        command = re.search(rb'bootcmd=([^\0]*)', self.files[UBOOT]).group(1)
        volumes = re.findall(rb'ubi read 0x[0-9a-f]+ (\w+); bootm;', command)
        self.assertEqual(volumes, [b'kernel', b'kernel2'])


class HowAResetIsArmed(TheImage):
    """3: the marker, the restart's word, the boot loader's two conditions, and the screens' two resets."""

    def test_the_native_restart_passes_the_reset_or_the_upgrade_word(self):
        hal = self.files[HAL]
        elf = Elf(hal)
        marker = hal.index(b'/cache/factoryreset\0')
        va = next(marker - offset + vaddr for vaddr, offset, size in elf.segments if offset <= marker < offset + size)
        pools = [i for i in range(0, len(hal) - 3, 4) if hal[i:i + 4] == struct.pack('<I', va)]
        self.assertEqual(len(pools), 1, 'one routine checks for the marker')
        window = hal[pools[0]:pools[0] + 0x40]
        words = {struct.unpack_from('<I', window, i)[0] for i in range(0, len(window), 4)}
        # The reboot system call's two magic words and Linux's restart with a command word.
        self.assertTrue({0xFEE1DEAD, 0x20112000, 0xA1B2C3D4} <= words)
        named = {c_string(elf, w) for w in words}
        self.assertTrue({'factoryreset', '/cache/ota-update.zip', 'upgrade'} <= named)

    def test_the_kernels_power_controller_driver_holds_the_two_words(self):
        status = self.kernel.index(b'msp430_i2c_read_status error')
        words = self.kernel.index(b'\0upgrade\0factoryreset\0', status)
        self.assertLess(words - status, 0x80)

    def test_the_boot_loader_resets_on_reason_two_or_off_with_menu(self):
        uboot = self.files[UBOOT]
        base = struct.unpack_from('<I', uboot, 0x20)[0] & 0xFFFF0000
        message = uboot.index(b'factory reset\n\0')
        literal = struct.pack('<I', base + message)
        slots = [i for i in range(0, len(uboot) - 3, 4) if uboot[i:i + 4] == literal]
        self.assertEqual(len(slots), 1)
        code = [struct.unpack_from('<I', uboot, i)[0] for i in range(0, len(uboot) - 3, 4)]
        loads = [i * 4 for i, w in enumerate(code)
                 if w & 0xFFFFF000 == 0xE59F0000 and i * 4 + 8 + (w & 0xFFF) == slots[0]]
        self.assertEqual(len(loads), 1, 'one load of the message')
        before = code[loads[0] // 4 - 4:loads[0] // 4]
        self.assertIn(0xE3550002, before, 'cmp r5, #2')
        self.assertIn(0x11590003, before, 'cmpne r9, r3')
        # The `ldr r3, [pc, #imm]` among them loads the key word.
        ldr_r3 = [(loads[0] - 16 + 4 * k, w) for k, w in enumerate(before) if w & 0xFFFFF000 == 0xE59F3000]
        self.assertEqual(len(ldr_r3), 1)
        at, word = ldr_r3[0]
        self.assertEqual(struct.unpack_from('<I', uboot, at + 8 + (word & 0xFFF))[0], RESET_KEYS)
        # The routine reads the microcontroller at 0x34, registers 0x1F and 0x14, before the comparison.
        routine = code[loads[0] // 4 - 0x120:loads[0] // 4]
        for word in (0xE3A00034, 0xE3A0101F, 0xE3A01014):
            self.assertIn(word, routine, '%08x' % word)
        self.assertTrue(b'%s factoryreset' in uboot, b'%s factoryreset')
        self.assertTrue(b'firmware upgrade\n' in uboot, b'firmware upgrade\n')

    def test_the_key_word_is_off_with_menu(self):
        self.assertEqual(RESET_KEYS, (1 << OFF_BIT) | (1 << MENU_BIT))
        self.assertEqual(KEYPAD[OFF_BIT], (116, 'PowerOffActivity'))
        self.assertEqual(KEYPAD[MENU_BIT], (139, 'Menu'))

    def test_the_settings_reset_creates_the_marker_and_the_error_screen_does_not(self):
        settings_reset = self.files[SETTINGS_RESET]
        for name in (b'/cache/factoryreset', b'factoryreset', b'reboot', b'SETTINGS_FACTORY_RESET_CONFIRM_MSG'):
            self.assertTrue(name in settings_reset, name)
        error_screen = self.files[ERROR_SCREEN]
        for name in (b'factoryreset', b'reboot', b'CORRUPT_DATA', b'FACTORY_RESET'):
            self.assertTrue(name in error_screen, name)
        self.assertFalse(b'/cache/factoryreset' in error_screen, b'/cache/factoryreset')

    def test_the_settings_offer_the_reset_outside_demo_mode_and_the_error_screen_has_two_callers(self):
        settings = self.files[SETTINGS]
        self.assertTrue(b'settings/factoryReset.lua' in settings, b'settings/factoryReset.lua')
        self.assertTrue(b'DemoMode' in settings, b'DemoMode')
        self.assertTrue(b'errorscreen.lua' in self.files[SCREENS_MAIN], b'errorscreen.lua')
        self.assertTrue(b'pcall' in self.files[SCREENS_MAIN], b'pcall')
        self.assertTrue({b'stackEmpty', b'errorscreen.lua'} <= set(re.findall(rb'stackEmpty|errorscreen\.lua',
                                                                              self.files[SCREENS_INIT])))

    def test_a_shell_is_kept_on_the_serial_port(self):
        self.assertTrue(re.search(rb'^ttyS2::respawn:/bin/sh$', self.files[INITTAB], re.M))
        self.assertTrue(b'console=ttyS2,115200n8' in self.files[UBOOT], b'console=ttyS2,115200n8')


@unittest.skipUnless(MYHARMONY and all(os.path.isfile(os.path.join(MYHARMONY, *p)) for p in MH_FILES),
                     'MyHarmony decompiled is not in the lab')
class LogitechsRoutes(unittest.TestCase):
    """4 and 5: what MyHarmony's recovery screen and templates send, Harmony Desktop's recovery view, and the
    headers the remote's tags travel in."""

    def read(self, parts):
        with open(os.path.join(MYHARMONY, *parts), encoding='utf-8-sig', errors='replace') as fh:
            return fh.read()

    def writes(self, template):
        """Each written payload of a template's write commands, as bytes, the two leading zero bytes dropped."""
        root = ElementTree.parse(io.StringIO(template)).getroot()
        out = []
        for builder in root.iter('commandbuilder'):
            if builder.get('id') != 'Write':
                continue
            for packet in builder.iter('packet'):
                if packet.get('type') == 'data':
                    out.append(bytes(int(b.text, 16) for b in packet.findall('byte'))[2:])
        return out

    def paths(self, template):
        return [c.text for c in ElementTree.parse(io.StringIO(template)).getroot().iter('constant')]

    def test_the_factory_reset_writes_one_to_the_reset_and_restarts(self):
        template = self.read(MH_RESET)
        self.assertEqual(self.paths(template), ['/sys/factoryreset', '/sys/reboot'])
        self.assertEqual(self.writes(template), [b'1', b'reboot'])
        self.assertTrue('waitforreboot="true"' in template, 'waitforreboot="true"')

    def test_the_rf_firmware_erase_writes_all_and_does_not_restart(self):
        template = self.read(MH_ERASE_RF)
        self.assertEqual(self.paths(template), ['/sys/factoryreset'])
        self.assertEqual(self.writes(template), [b'all'])
        self.assertFalse('waitforreboot' in template, 'waitforreboot')

    def test_harmony_desktop_carries_the_same_reset(self):
        theirs = lab.template(99, 'factoryreset.xml')
        mine = self.read(MH_RESET)
        self.assertEqual(theirs.replace('\r', ''), mine.replace('\r', ''))

    def test_the_recover_remote_screen_updates_then_resets(self):
        screen = self.read(MH_RECOVER)
        completed = screen[screen.index('void OnRemoteFirmwareUpgradeCompleted'):]
        completed = completed[:completed.index('private void StartFactoryResetForRemote')]
        self.assertTrue('StartFactoryResetForRemote' in completed, 'StartFactoryResetForRemote')
        resetting = screen[screen.index('private void StartFactoryResetForRemote'):]
        self.assertTrue('BeginFactoryReset' in resetting, 'BeginFactoryReset')
        activated = screen[screen.index('protected override void Activated'):]
        activated = activated[:activated.index('protected override void Deactivated')]
        self.assertTrue('StartRemoteFirmwareUpgrade' in activated, 'StartRemoteFirmwareUpgrade')
        header = re.search(r'<data name="HeaderText"[^>]*>\s*<value>([^<]*)</value>', self.read(MH_RECOVER_TEXT))
        self.assertEqual(header.group(1), 'Recover Remote')

    def test_a_tag_goes_up_as_if_none_match_on_a_get_and_if_match_on_a_put(self):
        rest = self.read(MH_REST)
        get = rest[rest.index('public void Get('):rest.index('public void Put(')]
        put = rest[rest.index('public void Put('):rest.index('public void Post(')]
        # .NET's HttpRequestHeader numbers If-Match 29 and If-None-Match 31; the tag field is named Etag.
        for method, number in ((get, 31), (put, 29)):
            self.assertTrue(re.search(r'HttpRequestHeader\)%d\]' % number, method), number)
            self.assertTrue('Etag' in method, number)
        post = rest[rest.index('public void Post('):]
        post = post[:post.index('\n\t}\n')]
        self.assertFalse('Etag' in post, 'Etag')

    def test_harmony_desktops_recovery_view_installs_the_factory_image(self):
        lab.require('desktop_webapp_main')
        with open(lab.path('desktop_webapp_main'), encoding='utf-8', errors='replace') as fh:
            app = fh.read()
        at = app.index('Firmware/99/firmware_factory.hfw2')
        near = app[at - 2000:at + 1000]
        for name in ('Firmware/106/firmware_factory.hfw2', 'RRTFactoryMenu', 'installFirmware', 'onResetRemote'):
            self.assertTrue(name in near, name)
        self.assertFalse('/sys/factoryreset' in near, '/sys/factoryreset')


if __name__ == '__main__':
    unittest.main()
