#!/usr/bin/env python3
"""The Harmony Touch's engine, activity engine and home control requests, `harmony.engine?*`,
`harmony.activityengine?*` and `harmony.automation?*`, as the production firmware registers and handles them.

**The question.** `todo-touch.md` 5.2.3 asked for every request of these three groups documented in full: what
each does, its parameters, its answers, the checks the engine runs before it, which screen or engine code
sends it, how it relates to the configuration documents, and whether any of them reads a stored document back
or reports the running configuration to a computer on the cable. The pages are
`reference/architectures/harmony-touch/api/engine.md`, `activityengine.md` and `automation.md`.

**Where the reading was done, and what this file holds of it.** Every handler was read in the lab's decompiled
engine, `luaworks-src/`, and the screens' Lua source, production build 4.15.330. A decompiled engine is not a
fixture, so this file reads the compiled engine out of the production package itself, through
`SquashfsReader` and `members` in `test_harmony_touch_image.py` and the chunk walk `prototypes` in
`test_harmony_touch_activities.py`, which keeps each function's instructions and nested functions for this
file. Three readings of the instructions are made here and nowhere else, none of them a second parser of the
chunk: the constant each `LOADK` loads and each `GETTABLE` indexes by, in instruction order; which nested
function each `CLOSURE` makes and the global name the following `SETGLOBAL` gives it; and the global names a
function reads (`GETGLOBAL`) or writes (`SETGLOBAL`). Opcode numbers are stock Lua 5.1's, which the
decompiled engine recompiled byte for byte in 164 of 172 files confirms (`luaworks-src/README.md`).

## What was read, and what of it this file asserts

1. **The registrations.** `tasks/apilistener.lua` registers every request with its name, module, handler and an
   ordered list of verifiers, or none, in which case `registerMessage` puts the default verifier there. Of its
   registrations, 31 are `harmony.engine?*`, 3 `harmony.activityengine?*` and 14 `harmony.automation?*`.
   Asserted: each page's table names exactly its group's requests, both ways, with the verifier chain in
   instruction order, and each section names the registered handler and its module. The default verifier
   accepts at once on the host name `juniper`, which `test_harmony_touch_host.py` holds.
2. **Parameters, read per handler.** Asserted: each section's parameter list equals `PARAMS` here, and every
   name in it is a string constant of the handler or of a function it hands the request to, `DELEGATES`. The
   values are read from the decompiled source and are the names the code indexes the arguments by.
3. **Kinds.** `read` changes nothing, `change` changes what the remote keeps or believes, `action` acts outside
   the remote's own data, `none` does nothing or has no handler. Asserted: each table's kind equals `KIND`;
   no `read` handler holds a name of `ACTING` (the one exception, `getcurrentactivity`, queues its read and
   so holds `pushBack`); every `change` and `action` handler, with its delegates, holds at least one;
   `setdisplaydeviceon` holds nothing but its answer; `addipdevice`'s handler, `processAddIpDevice`, is not a
   function of its module, and its name is nowhere in that file; `pairingbutton`'s message is named by no
   other engine file. `locationupdate`'s message is listened for by the activity engine, whose branch for it
   is empty in every mode: that is the decompiled reading and is not asserted.
4. **No danger in the group.** No handler, with its nested functions and its delegates, names a restart, a
   factory reset, an erase or a firmware install, while the setup group's reboot handler, the control, does.
5. **Answers on the cable.** A request from `/sys/hlapi` arrives through `halhttpserverconnector.lua`, which
   gives it the client number `FFFFFFFF` and transport `hal_http` and registers no client connection; queued
   results are sent to the client number the request carried. Asserted: the connector holds both and no
   `addClientConnection`, the `ltcp` connector the screens use does, and no other engine file holds
   `FFFFFFFF`. The handlers that queue are those holding `pushBack`, `QUEUED`, nine of them; with
   `startactivity`, whose `run_activity` reaches the same queue, ten.
6. **Text arguments.** The connector's `decodeParams` splits a request's arguments into names and text values,
   and puts a JSON object that opens them under `hbusData`. Asserted: its names, and that the handlers holding
   `fixHbusData`, which unpack that object, are exactly `UNPACKS`.
7. **The checks.** `IsSyncComplete` names `syncInProgress`, `syncConflictInProgress` and 202;
   `WaitAccountRegistered` waits on `config_unload`, which the engine's main task names; `IsActivityRunning`
   names `activityStatus`, 1, 3, 202 and `isDummyActivitySet`; `HasParams` 599; `isValidActivity` 569 and
   `currentActivityId`. The engine's `updateActivityStatus`, the one function setting `activitySetupState`,
   holds `mode` and 3: the engine moves the digest's activity status itself only in mode 3 (a client can
   still write it in any mode through `connect.statedigest?update`), which is why `IsActivityRunning` passes
   on a Touch in mode 0. The engine's `postLoad` adds the off activity, `-1`, named `PowerOff`.
8. **Home control on a Touch.** The proxy sync's request list, the function of `sync.lua` holding
   `/MapList?excludeFunctionMaps=true`, names no `AutomationConfig` and no `HomeAutomationService`; the list
   for syncing from a hub, the function holding `InstallerInfo`, names both, which is the negative. The
   resource name mapping maps `HomeAutomationService` to `AutomationConfig`. Exactly two functions name the
   button map address with `?excludeFunctionMaps=true`, and the one also naming `getHubEtag` is the hub's. `verifierGetAutomationConfig`
   holds 587 and `getAutomationConfig`. The home control task's main chunk names `juniper` and
   `getHostName`, and the activity engine's does not, the control. `toggle` reads a global `device` that no
   function of `automation.lua` writes, while `setstate` writes the global `statesByPlugin`, which shows the
   search finds a write where there is one.
9. **Modes.** `setremotetime` holds 4 and `set_remote_time_from_hub`; `addprogram` holds 3 and its refusal
   outside the hub's mode; the sleep timer's `stopActivity`, the function holding the client number `12345`,
   holds `mode` and 3.
10. **What the engine reports.** `createConfigHash`, the function holding `getEtag` and `FunctionList`, names
    `ActivityList`, `DeviceList`, `FunctionList`, `ProtocolList`, `Context` and `AutomationConfig` in that
    order and neither `MapList` nor `Settings`. `allpoweron`'s fetch holds `startIr` and the service operation.
11. **Who sends each request.** Asserted: for each request, the screen files, the engine files and the native
    USB program that name it, case ignored and the hub prefix `hot.1.` excluded, equal `CALLERS`, and each
    section's "Who calls it" names the file of every screen caller, or says nothing on the image sends it.

**Negative results recorded.** `harmony.engine?config` and `getallhadevices` answer 500 on a Touch synced
through a computer, for want of `AutomationConfig`; `suntimes` answers 500 because the activity engine fills its
context only in mode 3; a start of `-1` through `runactivity` with the rule `start` resends the running
activity's commands rather than turning it off, because the state digest's activity is `-1` on a Touch. No
request of the three groups returns a stored document; `getconfighash` returns the stored documents' entity
tags at once, and `isValidActivity`'s 569 carries the running activity's number at once.

**The controls.** Twelve, each made by string replacement and reversed, with the file's hash compared before
and after, and each made the named test fail alone: a request removed from a page's table, a verifier dropped
from a row, a kind changed, a parameter added to a section, a handler renamed in a section, a name no handler
holds added to `PARAMS`, a screen caller's file name removed from a section, a caller dropped from `CALLERS`,
the exception for the queued read removed, `FFFFFFFF` searched for as `FFFFFFFE`, the mode 4 branch searched
for as 5, and `toggle` searched for a global `devices`. The control on `FFFFFFFF` first passed when it should
have failed: an edit of the same size inside the same second as the previous run left a compiled copy Python
took for fresh, the trap `CLAUDE.md` records, so the controls were run with the cache removed and none written.

**Sources checked first.** `reference/architectures/harmony-touch/` (all pages), `answering-a-sync.md` and its
test `test_harmony_touch_host.py`, `reference/usb-protocol/file-protocol.md`, the lab's notes
`1.4-the-names-the-remote-answers-to.md`, `1.6-the-sync-request-list.md`, `4.1-a-direct-route.md` and
`4.2-answering-the-remote.md`, and the lab register's row for the firmware folder. Logitech's clients were
not consulted: the question is what the remote does with a request, which only the remote's firmware states.

**Width.** One firmware build, production 4.15.330, which serves every skin its descriptor names; the branches
a request takes are stated for the host name `juniper` and mode 0, the Touch's, and the others are not checked.

**Standing.** Read in the firmware. Nothing in this file quotes Logitech's code: it asserts names, numbers and
counts.
"""
import os
import re
import shutil
import tempfile
import unittest

import lab
from test_harmony_touch_activities import prototypes
from test_harmony_touch_image import SquashfsReader, members

IMAGE = 'touch_package_production'
UNSQUASHFS = shutil.which('unsquashfs')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.path.join(ROOT, 'reference', 'architectures', 'harmony-touch', 'api')

ENGINE = 'opt/luaworks/'
SCREENS = 'opt/luadraws/'
HAL = 'usr/bin/hal'
APILISTENER = ENGINE + 'tasks/apilistener.lua'
VERIFIERS = ENGINE + 'tasks/connectserver/core/verifiers.lua'
ACTIVITY = ENGINE + 'tasks/harmonyengine/apihandler/activity.lua'
AUTOMATION = ENGINE + 'tasks/automation/apihandler/automation.lua'
SYNC = ENGINE + 'tasks/harmonywebservices/proxy/sync.lua'

#: The pages and the group each documents, with the count of requests the image registers in it.
PAGES = {'engine.md': ('harmony.engine', 31), 'activityengine.md': ('harmony.activityengine', 3),
         'automation.md': ('harmony.automation', 14)}

#: Stock Lua 5.1 opcodes this file reads.
LOADK, GETGLOBAL, GETTABLE, SETGLOBAL, CLOSURE = 1, 5, 6, 7, 36

KIND = {
    'harmony.engine?startactivity': 'action', 'harmony.engine?holdaction': 'action',
    'harmony.engine?changechannel': 'action', 'harmony.engine?getcurrentactivity': 'read',
    'harmony.engine?setdevicestate': 'action', 'harmony.engine?getallactivities': 'read',
    'harmony.engine?getallhadevices': 'read', 'harmony.engine?config': 'read',
    'harmony.engine?getconfighash': 'read', 'harmony.engine?helpsync': 'action',
    'harmony.engine?helpdiscretes': 'action', 'harmony.engine?isfilepresent': 'read',
    'harmony.engine?setdisplaydeviceon': 'none', 'harmony.engine?bluetoothpairing': 'action',
    'harmony.engine?bluetoothunpairing': 'action', 'harmony.engine?bluetoothdisconnect': 'action',
    'harmony.engine?geteventqueuecount': 'read', 'harmony.engine?sethiddevice': 'action',
    'harmony.engine?setsleeptimer': 'change', 'harmony.engine?gettimerinterval': 'read',
    'harmony.engine?gettime': 'read', 'harmony.engine?setremotetime': 'action',
    'harmony.engine?settimezone': 'action', 'harmony.engine?pairingbutton': 'none',
    'harmony.engine?allpoweron': 'action', 'harmony.engine?wlanstatus': 'change',
    'harmony.engine?startippair': 'action', 'harmony.engine?finishippair': 'action',
    'harmony.engine?addipdevice': 'none', 'harmony.engine?pairstatus': 'read',
    'harmony.engine?setcommand': 'action',
    'harmony.activityengine?runactivity': 'action', 'harmony.activityengine?locationupdate': 'none',
    'harmony.activityengine?suntimes': 'read',
    'harmony.automation?discover': 'action', 'harmony.automation?pair': 'action',
    'harmony.automation?getstate': 'read', 'harmony.automation?setstate': 'action',
    'harmony.automation?remove': 'action', 'harmony.automation?toggle': 'action',
    'harmony.automation?refresh': 'action', 'harmony.automation?status': 'read',
    'harmony.automation?addprogram': 'change', 'harmony.automation?adddevice': 'action',
    'harmony.automation?removedevice': 'action', 'harmony.automation?getutilitymenu': 'read',
    'harmony.automation?indicate': 'change', 'harmony.automation?identify': 'action',
}

#: The argument names each request reads, as its handler or a delegate indexes them.
PARAMS = {
    'harmony.engine?startactivity': ['activityId', 'channel', 'args', 'rule', 'timestamp', 'tsTimeout',
                                     'callbackUrl', 'noResponse', 'group'],
    'harmony.engine?holdaction': ['status', 'action', 'count', 'delayInMs', 'activityId', 'timestamp',
                                  'buttonKey', 'equadId', 'indexInMenu', 'buttonSource', 'buttonMode', 'ulem'],
    'harmony.engine?changechannel': ['channel', 'group', 'gVol', 'gMute', 'deviceId', 'primaryDeviceId',
                                     'activityType', 'activity', 'noQueue', 'timestamp', 'tsTimeout'],
    'harmony.engine?getcurrentactivity': [],
    'harmony.engine?setdevicestate': ['deviceId', 'state', 'value', 'skipIr'],
    'harmony.engine?getallactivities': [],
    'harmony.engine?getallhadevices': [],
    'harmony.engine?config': [],
    'harmony.engine?getconfighash': [],
    'harmony.engine?helpsync': ['deviceId', 'state', 'value', 'smartInput', 'timestamp', 'tsTimeout'],
    'harmony.engine?helpdiscretes': ['timestamp', 'tsTimeout', 'channel'],
    'harmony.engine?isfilepresent': ['fileName'],
    'harmony.engine?setdisplaydeviceon': [],
    'harmony.engine?bluetoothpairing': ['deviceId', 'juniper', 'pin'],
    'harmony.engine?bluetoothunpairing': ['deviceId'],
    'harmony.engine?bluetoothdisconnect': ['deviceId'],
    'harmony.engine?geteventqueuecount': [],
    'harmony.engine?sethiddevice': ['deviceId', 'connectBtDevice'],
    'harmony.engine?setsleeptimer': ['interval'],
    'harmony.engine?gettimerinterval': ['timerId'],
    'harmony.engine?gettime': [],
    'harmony.engine?setremotetime': [],
    'harmony.engine?settimezone': ['timezoneid'],
    'harmony.engine?pairingbutton': [],
    'harmony.engine?allpoweron': [],
    'harmony.engine?wlanstatus': ['status'],
    'harmony.engine?startippair': ['uid'],
    'harmony.engine?finishippair': ['uid', 'pin', 'renewpin'],
    'harmony.engine?addipdevice': [],
    'harmony.engine?pairstatus': ['uid'],
    'harmony.engine?setcommand': ['uid', 'keycode', 'action'],
    'harmony.activityengine?runactivity': ['activityId', 'args', 'rule', 'noRestart', 'channel'],
    'harmony.activityengine?locationupdate': ['user', 'location'],
    'harmony.activityengine?suntimes': [],
    'harmony.automation?discover': ['type', 'gatewayType'],
    'harmony.automation?pair': ['gatewayId', 'gateway', 'authUri'],
    'harmony.automation?getstate': ['gatewayId', 'deviceIds', 'groupId', 'forceUpdate'],
    'harmony.automation?setstate': ['state'],
    'harmony.automation?remove': ['gatewayId'],
    'harmony.automation?toggle': ['groupId', 'gatewayId'],
    'harmony.automation?refresh': ['gatewayId'],
    'harmony.automation?status': ['gatewayId'],
    'harmony.automation?addprogram': ['program', 'programId'],
    'harmony.automation?adddevice': ['gatewayType', 'deviceInfo', 'timeout', 'cancel', 'done'],
    'harmony.automation?removedevice': ['gatewayId', 'deviceId', 'gatewayType', 'timeout', 'cancel'],
    'harmony.automation?getutilitymenu': ['language'],
    'harmony.automation?indicate': ['type', 'dev', 'path', 'value'],
    'harmony.automation?identify': ['deviceId', 'cancel'],
}

#: The functions a request is handed to, as (file under the engine, global name). A queued request's work and
#: a summary's builder live there, and so do some of the names it reads.
DELEGATES = {
    'harmony.engine?startactivity': [(ACTIVITY, 'processStartActivity'), (ACTIVITY, 'startActivity')],
    'harmony.engine?changechannel': [(ACTIVITY, 'changeChannel')],
    'harmony.engine?helpsync': [(ACTIVITY, 'helpSync')],
    'harmony.engine?helpdiscretes': [(ACTIVITY, 'startActivity')],
    'harmony.engine?bluetoothpairing': [(ACTIVITY, 'bluetoothPairing')],
    'harmony.engine?bluetoothdisconnect': [(ACTIVITY, 'bluetoothDisconnect')],
    'harmony.engine?sethiddevice': [(ACTIVITY, 'setHidDevice'), (ACTIVITY, 'setKeyboardDevice')],
    'harmony.engine?setdevicestate': [(ENGINE + 'tasks/harmonyengine/apihandler/device.lua', 'setDeviceState')],
    'harmony.engine?config': [(ENGINE + 'tasks/harmonyengine/apihandler/config.lua', 'createConfig')],
    'harmony.engine?getconfighash': [(ENGINE + 'tasks/harmonyengine/apihandler/config.lua', 'getConfigHash')],
    'harmony.engine?allpoweron': [(SYNC, 'getAllPowerOnCommands')],
}

#: Names whose presence in a handler shows it does something: announces, queues, sets, writes or calls out.
ACTING = {b'broadcastMessage', b'broadcastMessageNoWarning', b'sendMessage', b'processMessage', b'pushBack',
          b'setState', b'setMultiState', b'sendPutRequest', b'addTask', b'addTaskWithDelay', b'saveTokens',
          b'sendPairCommand', b'unloadModule', b'refresh', b'remove', b'reset', b'addDevice', b'removeDevice',
          b'setCommand', b'markPluginInitialized', b'bluetoothUnpairing', b'startIr', b'setstate', b'indicate',
          b'makeJsonRequest', b'startIpPair', b'getAllPowerOnCommands'}
#: A read that goes through the action queue, and so holds `pushBack` without acting.
QUEUED_READS = {'harmony.engine?getcurrentactivity'}
#: Names that would mark a restart, a reset, an erase or a firmware install.
DANGER = (b'reboot', b'factoryreset', b'firmwareupgrade', b'otaupdate', b'packageinstall', b'erase', b'mkfs')

QUEUED = {'harmony.engine?holdaction', 'harmony.engine?changechannel', 'harmony.engine?getcurrentactivity',
          'harmony.engine?setdevicestate', 'harmony.engine?helpsync', 'harmony.engine?helpdiscretes',
          'harmony.engine?bluetoothpairing', 'harmony.engine?bluetoothdisconnect', 'harmony.engine?sethiddevice'}
UNPACKS = {'harmony.engine?startippair', 'harmony.engine?finishippair', 'harmony.engine?pairstatus',
           'harmony.engine?setcommand', 'harmony.activityengine?runactivity', 'harmony.automation?getstate',
           'harmony.automation?toggle', 'harmony.automation?refresh', 'harmony.automation?status',
           'harmony.automation?addprogram'}

#: Who names each request, other than its registration: screen files (paths under `opt/luadraws/`, test
#: directories left out), engine files (under `opt/luaworks/`) and the native program. A request absent here
#: is named by nothing else on the image.
CALLERS = {
    'harmony.engine?startactivity': {'appscommon/harmony.lua', 'tasks/activityengine/core/activitymanager.lua',
                                     'tasks/activityengine/main.lua', 'tasks/harmonyengine/apihandler/sleeptimer.lua',
                                     'tasks/harmonyengine/plugins/sonos.lua'},
    'harmony.engine?holdaction': {'network/testXmppClient.lua'},
    'harmony.engine?changechannel': {'appscommon/harmony.lua', 'tasks/activityengine/apihandler/activityengine.lua'},
    'harmony.engine?getcurrentactivity': {'network/testXmppClient.lua'},
    'harmony.engine?getconfighash': {'network/testXmppClient.lua'},
    'harmony.engine?helpsync': {'appscommon/harmony.lua', 'tasks/harmonyengine/apihandler/activity.lua'},
    'harmony.engine?helpdiscretes': {'appscommon/harmony.lua', 'tasks/activityengine/apihandler/activityengine.lua',
                                     'tasks/activityengine/core/activitymanager.lua',
                                     'tasks/harmonyengine/apihandler/activity.lua'},
    'harmony.engine?bluetoothpairing': {'appscommon/harmony.lua'},
    'harmony.engine?bluetoothunpairing': {'appscommon/harmony.lua'},
    'harmony.engine?bluetoothdisconnect': {'appscommon/harmony.lua'},
    'harmony.engine?geteventqueuecount': {'appscommon/harmony.lua', HAL},
    'harmony.engine?setsleeptimer': {'hops/sleeptimer.lua', 'juniper/sleeptimer.lua'},
    'harmony.engine?gettimerinterval': {'appscommon/harmony.lua', 'hops/sleeptimer.lua', 'juniper/sleeptimer.lua'},
    'harmony.engine?setremotetime': {'hops/resync.lua', 'juniper/resync.lua'},
    'harmony.engine?settimezone': {'hops/settings/setTimeZone.lua', 'juniper/settings/setTimeZone.lua'},
    'harmony.engine?pairingbutton': {HAL},
    'harmony.activityengine?runactivity': {'appscommon/harmony.lua', 'tasks/automation/core/hamanager.lua'},
    'harmony.automation?getstate': {'hops/hainterface.lua', 'juniper/hainterface.lua',
                                    'tasks/activityengine/core/contextmanager.lua'},
    'harmony.automation?setstate': {'hops/hainterface.lua', 'juniper/hainterface.lua',
                                    'tasks/activityengine/core/activitymanager.lua'},
}
#: The screens' test client, which the pages mention as such rather than as a caller.
TEST_CLIENT = 'network/testXmppClient.lua'


def loads(fn):
    """The constants a function's `LOADK` and `GETTABLE` instructions name, in instruction order, as
    (`'K'` or `'G'`, constant) pairs."""
    out, k = [], fn['constants']
    for word in fn['code']:
        op = word & 0x3F
        if op == LOADK:
            out.append(('K', k[word >> 14]))
        elif op == GETTABLE and (word >> 14) & 0x1FF >= 256:
            out.append(('G', k[((word >> 14) & 0x1FF) - 256]))
    return out


def registrations(chunk):
    """Every `registerMessage` call of the listener, as {name: (module, handler or None, [verifier names])}.

    After the call's own name come its name, module and handler as loaded strings, then the verifier list: a
    shared verifier is a field of the verifiers module, indexed by its name, and a module's own verifier a
    loaded dotted path, of which the last part is its name. A handler name has no dot.
    """
    calls = []
    for kind, value in loads(prototypes(chunk)[0]):
        if kind == 'G' and value == b'registerMessage':
            calls.append([])
        elif calls:
            calls[-1].append((kind, value))
    out = {}
    for items in calls:
        name, module = items[0][1].decode(), items[1][1].decode()
        rest = items[2:]
        handler = None
        if rest and rest[0][0] == 'K' and b'.' not in rest[0][1]:
            handler, rest = rest[0][1].decode(), rest[1:]
        out[name] = (module, handler, [v.decode().rsplit('.', 1)[-1] for _, v in rest])
    return out


def globals_of(chunk):
    """{global name: function} for the functions a module chunk defines as globals."""
    main = prototypes(chunk)[0]
    found, pending = {}, {}
    for word in main['code']:
        op, a = word & 0x3F, (word >> 6) & 0xFF
        if op == CLOSURE:
            pending[a] = main['children'][word >> 14]
        elif op == SETGLOBAL and a in pending:
            found[main['constants'][word >> 14].decode()] = pending.pop(a)
    return found


def global_names(fn, opcode):
    """The global names a function reads (`GETGLOBAL`) or writes (`SETGLOBAL`)."""
    return {fn['constants'][w >> 14] for w in fn['code'] if w & 0x3F == opcode}


def subtree(fn):
    yield fn
    for child in fn['children']:
        yield from subtree(child)


def strings(*fns):
    return {c for fn in fns for f in subtree(fn) for c in f['constants'] if isinstance(c, bytes)}


def own_strings(fn):
    return {c for c in fn['constants'] if isinstance(c, bytes)}


def module_path(module):
    return ENGINE + module.replace('.', '/') + '.lua'


def read_page(name):
    with open(os.path.join(API, name), encoding='utf-8') as page:
        return page.read()


ROW = re.compile(r'^\| `(harmony\.[a-z]+\?[a-z]+)` \| (.*?) \| (read|change|action|none) \| (.*) \|$', re.M)
SECTION = re.compile(r'^### (harmony\.[a-z]+\?[a-z]+)\n(.*?)(?=^### |^## )', re.M | re.S)
HANDLER = re.compile(r'^\*\*Handler\*\*: `(\w+)` in `([\w/]+)\.lua`', re.M)
PARAMETERS = re.compile(r'^\*\*Parameters\*\*: (.*)$', re.M)
WHO = re.compile(r'^\*\*Who calls it\.\*\* (.*?)(?:\n\n|\Z)', re.M | re.S)
NAME = re.compile(r'`([A-Za-z][A-Za-z0-9]*)`')


def table(text):
    """{request: (kind, [verifier names], whether the row says implied)} from a page's table."""
    return {m.group(1): (m.group(3), NAME.findall(m.group(4)), 'implied' in m.group(4)) for m in ROW.finditer(text)}


def sections(text):
    return {m.group(1): m.group(2) for m in SECTION.finditer(text)}


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheImage(unittest.TestCase):
    """The production root filesystem, read once: the compiled engine, the screens and the native program."""

    _files = None

    @classmethod
    def setUpClass(cls):
        lab.require(IMAGE)
        if TheImage._files is None:
            with tempfile.TemporaryDirectory() as directory:
                reader = SquashfsReader(members(IMAGE)['harmony-image.squashfs'], directory)
                names = [n for n in reader.names() if n.startswith((ENGINE, SCREENS)) or n == HAL]
                files = {}
                # In slices, so no one command line grows with the image.
                for at in range(0, len(names), 200):
                    files.update(reader.each(names[at:at + 200]))
            TheImage._files = files
        cls.files = TheImage._files
        cls.registered = registrations(cls.files[APILISTENER])
        cls.modules = {}

    def module(self, path):
        if path not in self.modules:
            self.modules[path] = globals_of(self.files[path])
        return self.modules[path]

    def handler(self, request):
        module, name, _ = self.registered[request]
        return self.module(module_path(module)).get(name)

    def delegates(self, request):
        return [self.module(path)[name] for path, name in DELEGATES.get(request, [])]

    def function_with(self, path, *texts):
        wanted = {t.encode() for t in texts}
        found = [f for f in prototypes(self.files[path]) if wanted <= own_strings(f)]
        self.assertEqual(len(found), 1, '%s in %s' % (texts, path))
        return found[0]


class EachPageListsItsGroupsRequests(TheImage):
    """Fact 1: the tables against the registrations, both ways, and the verifier chains in order."""

    def test_the_group_counts_are_31_3_and_14(self):
        for page, (group, count) in PAGES.items():
            self.assertEqual(len([n for n in self.registered if n.startswith(group + '?')]), count, group)
        self.assertEqual(set(KIND), {n for n in self.registered
                                     if n.split('?')[0] in [g for g, _ in PAGES.values()]})

    def test_each_table_names_exactly_its_groups_requests(self):
        for page, (group, _) in PAGES.items():
            rows = table(read_page(page))
            self.assertEqual(set(rows), {n for n in self.registered if n.startswith(group + '?')}, page)

    def test_each_rows_verifiers_are_the_registered_chain_in_order(self):
        for page in PAGES:
            for request, (_, verifiers, implied) in table(read_page(page)).items():
                chain = self.registered[request][2]
                self.assertEqual(verifiers, chain or ['Default'], request)
                self.assertEqual(implied, not chain, request)

    def test_each_request_has_one_section_naming_its_registered_handler(self):
        for page in PAGES:
            text = read_page(page)
            found = sections(text)
            self.assertEqual(set(found), set(table(text)), page)
            for request, body in found.items():
                handlers = HANDLER.findall(body)
                self.assertEqual(len(handlers), 1, request)
                module, name, _ = self.registered[request]
                self.assertEqual(handlers[0], (name, module.replace('.', '/')), request)


class ParametersAreTheNamesTheHandlerReads(TheImage):
    """Fact 2: each section's parameters equal `PARAMS`, and each is a string the handler or a delegate holds."""

    def test_each_sections_parameters_are_the_documented_list(self):
        for page in PAGES:
            for request, body in sections(read_page(page)).items():
                line = PARAMETERS.findall(body)
                self.assertEqual(len(line), 1, request)
                self.assertEqual(sorted(set(NAME.findall(line[0]))), sorted(PARAMS[request]), request)

    def test_each_parameter_is_a_name_the_handler_or_a_delegate_holds(self):
        for request, names in PARAMS.items():
            handler = self.handler(request)
            if handler is None:
                self.assertEqual(names, [], request)
                continue
            held = strings(handler, *self.delegates(request))
            for name in names:
                self.assertIn(name.encode(), held, (request, name))


class KindsAreBorneOutByTheHandlers(TheImage):
    """Fact 3: the tables' kinds, and what the handlers hold for each kind."""

    def test_each_rows_kind_is_the_documented_kind(self):
        for page in PAGES:
            for request, (kind, _, _) in table(read_page(page)).items():
                self.assertEqual(kind, KIND[request], request)

    def test_a_read_holds_no_acting_name_and_a_change_or_action_holds_one(self):
        for request, kind in KIND.items():
            handler = self.handler(request)
            if kind == 'read':
                allowed = {b'pushBack'} if request in QUEUED_READS else set()
                self.assertEqual(own_strings(handler) & ACTING - allowed, set(), request)
            elif kind in ('change', 'action'):
                self.assertTrue(strings(handler, *self.delegates(request)) & ACTING, request)

    def test_the_requests_that_do_nothing(self):
        self.assertEqual(own_strings(self.handler('harmony.engine?setdisplaydeviceon')), {b'200', b'OK', b'createResponse'})
        ipmanager = ENGINE + 'tasks/harmonyengine/core/ipmanager.lua'
        self.assertEqual(self.registered['harmony.engine?addipdevice'][1], 'processAddIpDevice')
        self.assertIsNone(self.handler('harmony.engine?addipdevice'))
        self.assertNotIn(b'processAddIpDevice', self.files[ipmanager])
        # The negative: its neighbour's handler is found by the same lookup.
        self.assertIsNotNone(self.handler('harmony.engine?pairstatus'))
        message = b'he_pairing_button'
        holders = [p for p, d in self.files.items() if p.startswith(ENGINE) and message in d]
        self.assertEqual(holders, [ENGINE + 'tasks/harmonyengine/apihandler/harmonyengine.lua'])

    def test_no_handler_names_a_restart_a_reset_an_erase_or_a_firmware_install(self):
        for request in KIND:
            handler = self.handler(request)
            if handler is None:
                continue
            held = strings(handler, *self.delegates(request))
            self.assertEqual([d for d in DANGER if any(d in s.lower() for s in held)], [], request)
        # The control: the setup group's reboot handler does name one.
        reboot = self.module(ENGINE + 'tasks/setup/apihandler/firmware.lua')['processRebootCommand']
        self.assertTrue(any(b'reboot' in s for s in strings(reboot)))


class WhatComesBackOverTheCable(TheImage):
    """Facts 5 and 6: the cable's connector and client number, the queued handlers and the unpacking ones."""

    def test_the_cable_connector_registers_no_client_and_nothing_else_names_its_number(self):
        connector = ENGINE + 'tasks/connectserver/transport/halhttpserverconnector.lua'
        held = strings(*prototypes(self.files[connector])[:1])
        self.assertIn(b'FFFFFFFF', held)
        self.assertIn(b'hal_http', held)
        self.assertNotIn(b'addClientConnection', held)
        ltcp = ENGINE + 'tasks/connectserver/transport/ltcpserverconnector.lua'
        self.assertIn(b'addClientConnection', strings(prototypes(self.files[ltcp])[0]))
        holders = [p for p, d in self.files.items() if p.startswith(ENGINE) and b'FFFFFFFF' in d]
        self.assertEqual(holders, [connector])

    def test_nine_handlers_queue_and_startactivity_reaches_the_queue_by_its_message(self):
        queued = {r for r in KIND if self.handler(r) is not None and b'pushBack' in own_strings(self.handler(r))}
        self.assertEqual(queued, QUEUED)
        self.assertEqual(len(queued), 9)
        self.assertIn(b'run_activity', own_strings(self.handler('harmony.engine?startactivity')))
        self.assertIn(b'pushBack', own_strings(self.module(ACTIVITY)['processStartActivity']))

    def test_the_handlers_that_unpack_a_json_object(self):
        found = {r for r in KIND if self.handler(r) is not None and b'fixHbusData' in own_strings(self.handler(r))}
        self.assertEqual(found, UNPACKS)
        # `setstate` takes the object as its map of states instead.
        self.assertIn(b'hbusData', own_strings(self.handler('harmony.automation?setstate')))
        # Where the object goes: the connector's argument decoder splits names and values on `&` and puts an
        # object that opens the arguments under `hbusData`.
        decoder = self.module(ENGINE + 'tasks/connectserver/core/utils.lua')['decodeParams']
        self.assertLessEqual({b'hbusData', b'[^&]+', b'^{.*}'}, own_strings(decoder))


class TheChecksBeforeTheHandlers(TheImage):
    """Fact 7: what each verifier names, and the mode the state digest moves in."""

    def test_the_shared_verifiers_name_what_they_check(self):
        shared = self.module(VERIFIERS)
        expected = {
            'IsSyncComplete': {b'syncInProgress', b'syncConflictInProgress', b'202'},
            'WaitAccountRegistered': {b'config_unload', b'isMessageRegistered', b'yield'},
            'IsActivityRunning': {b'activityStatus', b'isDummyActivitySet', b'202'},
            'HasParams': {b'599'},
            'isValidActivity': {b'569', b'560', b'currentActivityId', b'getProgramByActivityId'},
            'HasUsageLog': {b'ule', b'logUsageData'},
        }
        for name, names in expected.items():
            self.assertLessEqual(names, own_strings(shared[name]), name)
        self.assertLessEqual({1.0, 3.0}, set(shared['IsActivityRunning']['constants']))
        self.assertIn(b'config_unload', self.files[ENGINE + 'tasks/harmonyengine/main.lua'])

    def test_the_engine_moves_the_activity_status_itself_only_in_mode_3_and_adds_the_off_activity(self):
        update = self.function_with(ACTIVITY, 'activitySetupState', 'saveStateDigest')
        self.assertIn(b'mode', own_strings(update))
        self.assertIn(3.0, update['constants'])
        off = self.module(ENGINE + 'tasks/harmonyengine/main.lua')['postLoad']
        self.assertLessEqual({b'-1', b'PowerOff'}, own_strings(off))


class HomeControlOnATouch(TheImage):
    """Fact 8: no home control configuration in the cable's sync, the task that does not start, and `toggle`."""

    def test_the_cables_sync_list_names_no_home_control_configuration_and_the_hubs_does(self):
        lists = [f for f in prototypes(self.files[SYNC]) if b'/MapList?excludeFunctionMaps=true' in own_strings(f)]
        self.assertEqual(len(lists), 2)
        proxy = [f for f in lists if b'getHubEtag' not in own_strings(f)]
        hub = [f for f in lists if b'getHubEtag' in own_strings(f)]
        self.assertEqual((len(proxy), len(hub)), (1, 1))
        automation = {b'AutomationConfig', b'dynamite://HomeAutomationService/Config/'}
        self.assertEqual(own_strings(proxy[0]) & automation, set())
        self.assertLessEqual(automation | {b'InstallerInfo'}, own_strings(hub[0]))
        # Both lists name the six documents and the capability list, so they are the same kind of list.
        six = {b'ActivityList', b'DeviceList', b'MapList', b'Context', b'Settings', b'ProtocolList', b'CapabilityList'}
        self.assertLessEqual(six, own_strings(proxy[0]) & own_strings(hub[0]))
        names = self.function_with(SYNC, 'HomeAutomationService', 'ContentService/User')
        self.assertIn(b'AutomationConfig', own_strings(names))

    def test_the_verifier_refuses_without_it_and_the_task_stops_on_juniper(self):
        verifier = self.module(AUTOMATION)['verifierGetAutomationConfig']
        self.assertLessEqual({b'587', b'getAutomationConfig', b'process_activity'}, own_strings(verifier))
        task = prototypes(self.files[ENGINE + 'tasks/automation/main.lua'])[0]
        self.assertLessEqual({b'juniper', b'getHostName'}, own_strings(task))
        other = prototypes(self.files[ENGINE + 'tasks/activityengine/main.lua'])[0]
        self.assertNotIn(b'juniper', own_strings(other))

    def test_toggle_reads_a_global_device_that_nothing_in_its_file_writes(self):
        self.assertIn(b'device', global_names(self.handler('harmony.automation?toggle'), GETGLOBAL))
        written = set().union(*(global_names(f, SETGLOBAL) for f in prototypes(self.files[AUTOMATION])))
        self.assertNotIn(b'device', written)
        # The negative: a global the file does write is found by the same search.
        self.assertIn(b'statesByPlugin', written)


class ModesAndWhatTheEngineReports(TheImage):
    """Facts 9 and 10."""

    def test_the_mode_branches(self):
        remote_time = self.handler('harmony.engine?setremotetime')
        self.assertIn(4.0, remote_time['constants'])
        self.assertIn(b'set_remote_time_from_hub', own_strings(remote_time))
        program = self.handler('harmony.automation?addprogram')
        self.assertIn(3.0, program['constants'])
        self.assertIn(b'not in hub mode', own_strings(program))
        stop = self.function_with(ENGINE + 'tasks/harmonyengine/apihandler/sleeptimer.lua', '12345')
        self.assertIn(b'mode', own_strings(stop))
        self.assertIn(3.0, stop['constants'])

    def test_the_hash_joins_six_tags_in_order_and_not_the_maps_or_the_settings(self):
        config = ENGINE + 'tasks/harmonyengine/apihandler/config.lua'
        hash_ = self.function_with(config, 'getEtag', 'FunctionList')
        order = [c for c in hash_['constants'] if c in (b'ActivityList', b'DeviceList', b'FunctionList',
                                                          b'ProtocolList', b'Context', b'AutomationConfig')]
        self.assertEqual(order, [b'ActivityList', b'DeviceList', b'FunctionList', b'ProtocolList', b'Context',
                                 b'AutomationConfig'])
        self.assertEqual(own_strings(hash_) & {b'MapList', b'Settings'}, set())
        # The joining: `table.concat` with no separator, then `string.gsub` removes every double quote, so the
        # tags run together with nothing between them. The `"` constant is the quote the gsub strips.
        self.assertLessEqual({b'concat', b'gsub', b'"'}, own_strings(hash_))

    def test_all_power_on_fetches_a_list_and_plays_it_as_infrared(self):
        fetch = self.module(SYNC)['getAllPowerOnCommands']
        self.assertLessEqual({b'startIr', b'UserAccountDirector/PowerOnCommandList'}, strings(fetch))


class WhoSendsEachRequest(TheImage):
    """Fact 11: the files naming each request, against `CALLERS` and the pages."""

    def holders(self, request):
        pattern = re.compile(rb'(?<!hot\.1\.)' + re.escape(request.encode()) + rb'(?![A-Za-z])', re.I)
        found = set()
        for path, data in self.files.items():
            if path == APILISTENER or '/test/' in path:
                continue
            if pattern.search(data):
                if path.startswith(SCREENS):
                    found.add(path[len(SCREENS):])
                elif path.startswith(ENGINE):
                    found.add(path[len(ENGINE):])
                else:
                    found.add(path)
        return found

    def test_the_files_naming_each_request_are_the_documented_ones(self):
        for request in KIND:
            self.assertEqual(self.holders(request), CALLERS.get(request, set()), request)

    def test_each_section_names_its_screen_callers_or_says_nothing_sends_it(self):
        for page in PAGES:
            for request, body in sections(read_page(page)).items():
                who = WHO.findall(body)
                self.assertEqual(len(who), 1, request)
                callers = CALLERS.get(request, set())
                screens = {c for c in callers if not c.startswith('tasks/') and c != HAL and c != TEST_CLIENT}
                for caller in screens:
                    self.assertIn(caller.rsplit('/', 1)[1], who[0], (request, caller))
                if not callers - {TEST_CLIENT}:
                    self.assertIn('Nothing on the image', who[0], request)
                self.assertEqual('test client' in who[0], TEST_CLIENT in callers, request)


if __name__ == '__main__':
    unittest.main()
