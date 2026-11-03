#!/usr/bin/env python3
"""The Harmony Touch's setup, proxy, connect and system requests, read in its firmware: which names the engine
registers in these four groups, what kind of request each is, which parameters each handler reads, and five
findings that came out of reading them all.

**The question.** `todo-touch.md` 5.2.2 asked for every request a Harmony Touch's engine registers under
`setup.`, `proxy.`, `connect.`, `control.button`, `harmony.system`, `harmony.firmware`, `harmony.manualsync`
and `harmony.log` to be documented in full, in four pages under `reference/architectures/harmony-touch/api/`:
`setup.md`, `proxy.md`, `connect.md` and `system.md`. It also asked to settle whether any of them hands a
stored document back to the computer, and which of them write or install firmware.

**What was read.** The engine is compiled Lua 5.1 under `opt/luaworks` of the production package 4.15.330,
the build a Touch reports for itself (`tests/test_harmony_touch_image.py`). Every request is registered in
one file, `tasks/apilistener.lua`, by name, module, function and an optional list of checks; nothing else in
the engine registers a request, and a name with no registration either falls back to its bare name, is
forwarded to the native program by a prefix rule the engine's page covers, or finds no handler. Of the 120
registered names, 72 fall in these four groups: 24 setup, 7 proxy, 19 connect and 22 system. Each handler was
read in the decompiled engine in the private working copy, with the dispatcher
(`connectserver/core/engine.lua`), the checks (`connectserver/core/verifiers.lua`), the store
(`harmonywebservices/core/resourcemanager.lua`), the queue (`eventqueue/core/offlinequeue.lua`), the software
update module (`harmonywebservices/proxy/softwareupdate.lua`), the package manager
(`connectserver/transport/packagemgr.lua`) and the screens' `appscommon/harmony.lua` for who sends what.

**How it is anchored, and what this file can hold of the reading.** A decompiled engine is not a fixture, so
this file asserts what the compiled image shows directly: the registered names, which are string constants
of the listener's one function and the only ones there that hold a dot and are not a module path; and, per
handler, the string constants and local names of the one function that holds a given set of them, walked
with `prototypes` from `tests/test_harmony_touch_activities.py`. **Which handler a name is registered with is
the decompiled reading**: the constants of the listener do not pair a name with its module. **The checks
column is firmware backed**: `registrations`, the engine test's instruction reader, reads each name's
verifier chain off the listener, and `TheRegisteredNames` holds each page's checks equal to that chain (or
`Default` when the registration names none) rather than to the literal below. The order of a function's
steps, and which branch a host name takes, are the reading too.

## What this file asserts

1. **The four pages list exactly the names the image registers in their groups**, both ways, and every
   registered name falls in one of these eight prefixes or in the three the other pages cover
   (`harmony.engine`, `harmony.activityengine`, `harmony.automation`), so a new prefix fails here.
2. **Each request's kind and parameters, by the names its handler reads.** `REQUESTS` gives, per name, the
   constants that find its handler, the parameters it reads, and for a change or an action the constants of
   the function that does it; a read's handler must hold none of `WRITES`. Each page's table and sections
   must agree with `REQUESTS`: the kind, the checks, and every parameter named in backticks in the request's
   section. Two kinds cannot be pinned by constants and are named in `UNPINNED`: `setup.sync?end` changes a
   flag held in a local, and `harmony.manualsync?start` raises before it does anything.
3. **A provisioning erases nothing on a Touch.** The function that compares the stored account, mode, server
   and remote number holds `datadir` both as a local name and as a string constant, and a string constant
   names a global or a field, never a local: the `pimentoblue` branch declares the local and removes the folder
   it names, and every other branch, `juniper` among them, removes the folder named by a global `datadir`.
   Over all 172 engine files `datadir` is a constant only there and in `works/system.lua`, where it is the
   launcher's option `arg.datadir`; nothing assigns a global of that name, so the removal is handed nothing,
   and the folder test it starts with returns at once. **This corrects `answering-a-sync.md`'s table** and the
   reading behind `test_harmony_touch_host.py`'s `ProvisioningIsDestructive`, whose assertion names
   `getDataPath`, which is the hub's branch.
4. **A stored document can be read back, by a resource put with no `resource`.** In modes 0 and 1 the put
   handler queues a `put` and saves the entry's `resource`; the store writes a file only when it is given
   one (`common/utils.lua`'s write refuses nothing to write) and replaces the index entry either way; and
   `proxy.request` reads every queued `put`'s document from the store when it hands it over. **And
   `proxy.resource?get` does not read the store on a Touch**: its handler branches on modes 3, 0 and 1, and 4;
   only the mode 3 function holds the sync check and the store read, and the modes 0 and 1 function holds
   neither and queues a `get`.
5. **The firmware and the dangerous requests.** `setup.firmware` with `update` renames a cached image to
   `/cache/ota-update.zip` and restarts into the upgrade; `setup.firmware?reboot` restarts after 2000 ms; the
   status read can restart; `packageinstall` checks a signature with the image's own key and runs an
   installer; `packageremove` builds a recursive delete from the name and tests the name for nothing;
   `connect.jsonfiletransfer` is refused unless `/etc/tdeenable` exists, which the production root
   filesystem does not hold; `connect.sysinfo?get` is refused on any host but `pimentoblue`; `connect.resync`
   starts a sync without emptying the queue or aborting on failure; and `harmony.manualsync?start` reads a
   global `params` where its parameter is named `param`.

**Negative results recorded.** `HasParams` cannot refuse a request that arrives over the cable, because
`verifiers.initialize` gives every message a parameter table before the checks run; read, not asserted. The
three `harmony.log` requests registered with `IsFWDownloadComplete` alone run no default check, which on a
Touch changes nothing since both pass. `control.button?pressType` and `control.button?sequenceFinished`, which
the screens subscribe to, are announcement names and are not registered. A status the computer sends as a
number is turned into text by `proxy.response` before any check, so the comment in
`test_harmony_touch_host.py` that a numeric status matches neither 200 nor 304 is wrong about the request as a
whole; the core documents' callback itself does compare text only, which is what that test asserts.

**The controls.** Fifteen, each a string replacement in this file or a page, run, and reversed, with the
file's `SHA-256` compared before and after; each failed exactly the test it aimed at: a row removed from and
a row added to `setup.md`'s table; `connect.ping`'s kind changed in `connect.md`; `hidCode` unquoted in
`system.md`'s press section; `datadir` looked for as `datadirx`; the modes 0 and 1 resource function asserted
to read the store; `format`, which the delete does hold, added to the names `packageremove` must not hold;
`setup.setlanguage` made a read, which its announcement then fails; the absence of `etc/tdeenable`
asserted of `etc/hostname` instead; `manualsync?start` given a local `params`; `doSync` added to what
`connect.resync` must not hold; the put's effect asked for under a wrong name; `proxy.request`'s parameter
misspelt; the other pages' count set to 47; and the dispatcher dropped from the files that name
`registerMessage`.

**Sources checked first.** `reference/architectures/harmony-touch/` (all seven pages) and
`reference/usb-protocol/file-protocol.md`; `tests/test_harmony_touch_host.py`, `test_harmony_touch_image.py`
and `test_harmony_touch_activities.py`, whose readers this file imports; the measured syncs in
`packages/usb/test/touch-sync.test.ts` and `touch-sync-both-ways.test.ts`, by request name only; the private
notes `1.4-the-names-the-remote-answers-to.md` and `4.1-resource-put-fresh-read.md`, as leads, each fact
checked against the decompiled engine. Logitech's client was not consulted: the question is what the remote
answers, and the client only sends the sync's requests.

**Width.** One build, the production 4.15.330 image, which serves every skin its descriptor names; the
branch a Touch takes is the host name `juniper` and modes 0 and 1. The hubs run a sibling image, not read,
and their branches in this one are read and not checked against a unit.

**Standing.** "Read in the firmware". The constants are Logitech's, in the image in the private working copy;
this file names them as search terms and quotes none of the code around them.
"""
import os
import re
import tempfile
import unittest

import lab
from test_harmony_touch_activities import prototypes
from test_harmony_touch_api_engine import registrations
from test_harmony_touch_image import UNSQUASHFS, SquashfsReader, members

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.path.join(ROOT, 'reference', 'architectures', 'harmony-touch', 'api')
PAGES = ('setup', 'proxy', 'connect', 'system')

BUILD = 'touch_package_production'
ENGINE = 'opt/luaworks/'
TASKS = ENGINE + 'tasks/'

LISTENER = TASKS + 'apilistener.lua'
DISPATCH = TASKS + 'connectserver/core/engine.lua'
VERIFIERS = TASKS + 'connectserver/core/verifiers.lua'
ACCOUNT = TASKS + 'setup/apihandler/account.lua'
SETUP_SYNC = TASKS + 'setup/apihandler/sync.lua'
SETLANGUAGE = TASKS + 'setup/apihandler/setlanguage.lua'
CONTENT = TASKS + 'setup/apihandler/content.lua'
FIRMWARE = TASKS + 'setup/apihandler/firmware.lua'
PACKAGES = TASKS + 'connectserver/transport/packagemgr.lua'
SOFTWARE_UPDATE = TASKS + 'harmonywebservices/proxy/softwareupdate.lua'
PROXY = TASKS + 'harmonywebservices/apihandler/proxy.lua'
REQUEST = TASKS + 'harmonywebservices/apihandler/request.lua'
RESPONSE = TASKS + 'harmonywebservices/apihandler/response.lua'
RESOURCE = TASKS + 'harmonywebservices/apihandler/resource.lua'
STORE = TASKS + 'harmonywebservices/core/resourcemanager.lua'
STATE_DIGEST = TASKS + 'harmonywebservices/core/statedigest.lua'
HWS_SYNC = TASKS + 'harmonywebservices/proxy/sync.lua'
CONNECT = TASKS + 'connectserver/apihandler/'
SSDP_PLUGIN = TASKS + 'connectserver/plugins/ssdp.lua'
IR_SENDER = TASKS + 'harmonyengine/core/irsender.lua'
ACTIVITY = TASKS + 'harmonyengine/apihandler/activity.lua'
MANUALSYNC = TASKS + 'harmonyengine/apihandler/manualsync.lua'
LOG = TASKS + 'crashlog/apihandler/log.lua'
SYSTEM_INFO = CONNECT + 'system.lua'
WORKS_SYSTEM = ENGINE + 'works/system.lua'
UTILS = ENGINE + 'common/utils.lua'


def c(name):
    return CONNECT + name + '.lua'


#: Which page each prefix of a registered name belongs to. A name is in the group of the longest prefix
#: it starts with; the three prefixes of the other pages are listed so that a new one fails.
GROUPS = {
    'setup.': 'setup', 'proxy.': 'proxy', 'connect.': 'connect',
    'control.button': 'system', 'harmony.system': 'system', 'harmony.firmware': 'system',
    'harmony.manualsync': 'system', 'harmony.log': 'system',
    'harmony.engine': None, 'harmony.activityengine': None, 'harmony.automation': None,
}
COUNTS = {'setup': 24, 'proxy': 7, 'connect': 19, 'system': 22, None: 48}

#: Constants whose presence in a handler means it changes or acts; a read's handler holds none.
WRITES = {'save', 'saveAll', 'saveResource', 'saveStateDigest', 'saveDataFile', 'pushBack', 'removeAll',
          'deleteResourceFolder', 'removeFolder', 'reboot', 'execute', 'addTask', 'syncStart', 'doSync',
          'broadcastEvent', 'write', 'syncComplete', 'syncAbort', 'processMessage', 'remove', 'rename',
          'setIrPath'}

#: The two whose kind no constant can show; asserted to be exactly these.
UNPINNED = {'setup.sync?end', 'harmony.manualsync?start'}

D, H, I, W, R = 'Default', 'HasUsageLog', 'IsSyncComplete', 'WaitAccountRegistered', 'IsProvisioned'
BUTTON = dict(kind='action', file=ACTIVITY, find=('keyLatency', 'buttonKey', 'indexInMenu'),
              params=('equadId', 'buttonKey', 'indexInMenu', 'deviceId', 'functionGroupType', 'sequenceId',
                      'timestamp', 'cursor', 'hidCode', 'keyLatency', 'ulem'),
              effect=(ACTIVITY, ('pushBack', 'buttonPress', 'holdCommand', 'clearHoldEvents')))


def r(kind, checks, file, find, params=(), effect=None):
    return dict(kind=kind, checks=checks, file=file, find=find, params=params, effect=effect)


#: Every request of the four groups: its kind, its checks (the decompiled reading), the constants that find
#: its handler, the parameters the handler reads, and for a change or an action where the effect is.
REQUESTS = {
    # setup.md
    'setup.account': r('read', (D,), ACCOUNT, ('discoveryServerCF', 'activeRemoteId', 'se')),
    'setup.account?isprovisioned': r('read', (D,), ACCOUNT, ('ProvisionStatus', 'ProvisionedEmail')),
    'setup.account?provision': r('change', (D,), ACCOUNT, ('get_discoveryproxy', 'populateServiceUrl'),
                                 ('provisionInfo', 'id', 'mode', 'discoveryServer'),
                                 (ACCOUNT, ('provisionWithAccountId', 'saveProvisionInfo', 'accountId',
                                            'activeRemoteId', 'username', 'email', 'authToken', 'susChannel',
                                            'language'))),
    'setup.account?autoprovisionfromhub': r('change', (D,), ACCOUNT, ('hot.1.setup.account?getProvisionInfo',),
                                            (), (ACCOUNT, ('hot.1.setup.account?getProvisionInfo',
                                                           'handleProvision'))),
    'setup.account?updatesla': r('change', (D,), ACCOUNT, ('syncContextBackend', 'saveContext'), ('data',),
                                 (ACCOUNT, ('updateSLA', 'saveContext'))),
    'setup.configchanged': r('change', (D,), SETUP_SYNC, ('save', 'configStale', 'removeAll'), (),
                             (SETUP_SYNC, ('save', 'configStale', 'removeAll'))),
    'setup.setlanguage': r('action', (D,), SETLANGUAGE, ('en-US',), ('language',),
                           (SETLANGUAGE, ('en-US', 'broadcastEvent'))),
    'setup.sync': r('change', (R, I, 'IsActivityRunning', D), SETUP_SYNC, ('hubSyncConflict', 'isInternetAvailable'),
                    (), (SETUP_SYNC, ('syncStart', 'removeAll', 'doSync', 'syncAbort'))),
    'setup.sync?begin': r('change', (R, D), SETUP_SYNC, ('addTask', 'sync'), (), (SETUP_SYNC, ('addTask', 'sync'))),
    'setup.sync?end': r('change', (R, D), SETUP_SYNC, ('errorCode', 'errorMessage'), ('errorCode', 'errorMessage')),
    'setup.sync?contentchanged': r('change', (R, D), SETUP_SYNC, ('contentVersion', 'value'), ('value',),
                                   (SETUP_SYNC, ('contentVersion', 'stateVersion', 'saveStateDigest', 'value'))),
    'setup.sync?deleteresources': r('change', (R, D), SETUP_SYNC, ('deleteResourceFolder',), (),
                                    (SETUP_SYNC, ('deleteResourceFolder',))),
    'setup.syncremotechanges': r('change', (D,), SETUP_SYNC, ('removeFromGetRequests', 'syncConflictStart'), (),
                                 (SETUP_SYNC, ('syncConflictStart', 'doSync', 'pushBack', 'proxy://Finished'))),
    'setup.content?getchannels': r('change', (D,), CONTENT, ('getAllChannels', 'channelList'), ('uid',),
                                   (CONTENT, ('channelList', 'saveStateDigest'))),
    'setup.content?syncchannels': r('change', (H, I, D), CONTENT, ('getContentProfileKey', 'dialPositions'),
                                    ('deviceId', 'bcNotRequired'),
                                    (CONTENT, ('proxy.resource?put', 'processMessage'))),
    'setup.content?getallmetadata': r('read', (I, D), CONTENT, ('getAllMetadata', 'all'), ('uid', 'deviceId', 'all')),
    'setup.content?getbtsettings': r('read', (I, D), CONTENT, ('settings', 'load')),
    'setup.firmware': r('action', (D,), FIRMWARE, ('hot.1.setup.firmware?', 'dataFromClient'), (),
                        (FIRMWARE, ('check', 'prepare', 'status', 'update', 'pause', 'installed',
                                    'tasks.harmonywebservices.proxy.softwareupdate'))),
    'setup.firmware?updateneeded': r('read', (D,), FIRMWARE, ('getFirmwareVersion',)),
    'setup.firmware?updateinprogress': r('action', (D,), FIRMWARE, ('headers', 'broadcastEvent', 'status'), (),
                                         (FIRMWARE, ('headers', 'broadcastEvent'))),
    'setup.firmware?reboot': r('action', (I, D), FIRMWARE, ('reboot', 'rebootTask'), (),
                               (FIRMWARE, ('reboot', 'addTask', 'rebootTask'))),
    'setup.firmware?packageinstall': r('action', (D,), PACKAGES, ('installUpdate', 'name', 'file'), ('name', 'file'),
                                       (PACKAGES, ('verifyPublic', 'sdigest', 'installer',
                                                   '/opt/luaworks/common/key/sdigest_public.der'))),
    'setup.firmware?packageremove': r('action', (D,), PACKAGES, ('/bin/busybox rm -rf %s%s',), ('name',),
                                      (PACKAGES, ('/bin/busybox rm -rf %s%s',))),
    'setup.firmware?packagemanifest': r('read', (D,), PACKAGES, ('getPackageManifest', 'manifest'), ('name',)),
    # proxy.md
    'proxy.request': r('read', (D,), REQUEST, ('popFront',), ('sessionId',)),
    'proxy.response': r('change', (D,), RESPONSE, ('replaceVerb', 'write', 'responses'), ('responses',),
                        (RESPONSE, ('pop', 'remove', 'callback'))),
    'proxy.resource?get': r('change', (D,), RESOURCE, ('fixHbusData', 'BUG'), (),
                            (RESOURCE, ('contentCallback', 'pushBack', 'requests', 'uri', 'etag', 'parameters'))),
    'proxy.resource?put': r('change', (D,), RESOURCE, ('config_postupdate',),
                            ('requests', 'uri', 'etag', 'resource', 'deviceId', 'parameters'),
                            (RESOURCE, ('saveResource', 'pushBack', 'config_new', 'init'))),
    'proxy.finished': r('change', (D,), PROXY, ('syncComplete',), (),
                        (PROXY, ('syncComplete', 'pushBack', 'proxy://Finished'))),
    'proxy.abort': r('change', (D,), PROXY, ('syncAbort', 'proxy://Abort'), ('errorCode', 'errorMessage'),
                     (PROXY, ('syncAbort', 'pushBack', 'proxy://Abort'))),
    'proxy.error': r('action', (D,), PROXY, ('broadcastEvent', 'createResponse', '0'), (),
                     (PROXY, ('broadcastEvent', 'createResponse', '0'))),
    # connect.md
    'connect.deviceinfo?get': r('read', (D,), c('deviceinfo'), ('getRFInfo', 'encode')),
    'connect.discoveryinfo?get': r('read', (W, D), c('discoveryinfo'), ('getData',), ('format',)),
    'connect.jsonfiletransfer?get': r('read', ('verifierJsonFileTransfer', D), c('jsonfiletransfer'),
                                      ('read', 'path', 'file'), ('path', 'file')),
    'connect.jsonfiletransfer?put': r('change', ('verifierJsonFileTransfer', D), c('jsonfiletransfer'),
                                      ('content', 'write'), ('content', 'path', 'file'),
                                      (c('jsonfiletransfer'), ('content', 'write'))),
    'connect.pair': r('action', (D,), c('pair'), ('serverGuid', 'processPairUnpair'), ('name',),
                      (c('pair'), ('setIrPath', 'setLedPath', 'processPairUnpair'))),
    'connect.unpair': r('action', (D,), c('unpair'), ('deviceIdx', 'dataFromClient'), ('deviceIdx',),
                        (c('unpair'), ('deviceIdx', 'hbusCommand', 'dataFromClient'))),
    'connect.ping': r('read', (D,), c('ping'), ('serverGuid', 'binary'), ('binary',)),
    'connect.resync': r('change', (D,), c('resync'), ('syncStart', 'doSync'), (),
                        (c('resync'), ('syncStart', 'doSync'))),
    'connect.rf?pair': r('action', (D,), c('rf'), ('rf.pairing',), (), (c('rf'), ('rf.pairing', 'command'))),
    'connect.rf?info': r('read', (D,), c('rf'), ('getRFInfo', 'data')),
    'connect.ssdp?scan': r('action', (D,), c('ssdp'), ('processCmdScan', 'createResponse'), (),
                           (SSDP_PLUGIN, ('scan', 'scanResults', '588'))),
    'connect.ssdp?lastscanresults': r('read', (D,), c('ssdp'), ('processCmdLastScanResults', 'createResponse')),
    'connect.ssdp?startbgndscan': r('action', (D,), c('ssdp'), ('processStartBgndScan', 'createResponse'), (),
                                    (SSDP_PLUGIN, ('610', 'addTask', 'bgndScan'))),
    'connect.ssdp?pollbgndscan': r('read', (D,), c('ssdp'), ('processPollBgndScan', 'createResponse')),
    'connect.ssdp?stopbgndscan': r('action', (D,), c('ssdp'), ('processStopBgndScan', 'createResponse'), (),
                                   (SSDP_PLUGIN, ('614', 'stopBgndScan'))),
    'connect.statedigest?get': r('read', (D,), c('statedigest'), ('current_version',), ('current_version', 'format')),
    'connect.statedigest?update': r('change', (D,), c('statedigest'), ('digest', 'saveStateDigest'), ('digest',),
                                    (c('statedigest'), ('saveStateDigest', 'broadcastEvent',
                                                        'connect.stateDigest?notify'))),
    'connect.sysinfo?get': r('read', ('IsPimentoBlue', D), c('sysinfo'), ('sourceCallback', 'dataFromClient')),
    'connect.powerstate?get': r('read', (D,), c('powerstate'), ('command', '503')),
    # system.md
    'control.button?press': dict(BUTTON, checks=(H, I, W, D)),
    'control.button?fire': dict(BUTTON, checks=(H, I, W, D)),
    'control.button?hold': dict(BUTTON, checks=(H, I, W, D)),
    'control.button?release': dict(BUTTON, checks=(I, W, D)),
    'harmony.system?systeminfo': r('read', (D,), SYSTEM_INFO, ('arch=0x11', 'unitId')),
    'harmony.system?usagelog': r('change', ('HasParams', D), SYSTEM_INFO, ('logUsageData',), ('events', 'event'),
                                 (SYSTEM_INFO, ('logUsageData',))),
    'harmony.manualsync?issyncrequired': r('read', (D,), MANUALSYNC, ('false',)),
    'harmony.manualsync?state': r('read', (D,), MANUALSYNC, ('nextState=*',)),
    'harmony.manualsync?start': r('read', (D,), MANUALSYNC, ('headers', 'params')),
    'harmony.log?create': r('change', ('IsFWDownloadComplete',), LOG, ('information', 'createResponse'), (),
                            (LOG, ('information', 'createResponse'))),
    'harmony.log?put': r('change', ('IsFWDownloadComplete',), LOG, ('userRequest', 'submit_logs_remote', 'mode'),
                         ('resource', 'userRequest'), (LOG, ('hot.1.harmony.log?put', 'success', 'fileName'))),
    'harmony.log?run': r('change', ('IsFWDownloadComplete',), LOG, ('time', '202', 'gc'), (),
                         (LOG, ('dummy', '.log', 'remove', 'attributes'))),
    'harmony.log?usage': r('action', (D,), LOG, ('uploadLogs',), (), (LOG, ('uploadLogs',))),
    'harmony.log?reset': r('change', (D,), LOG, ('==createResponse', '==200', '==OK'), (),
                           (LOG, ('count', 'date', 'write'))),
    'harmony.log?enable': r('change', (D,), LOG, ('tags', 'enable'), ('tags', 'mode'), (LOG, ('tags', 'enable'))),
    'harmony.log?disable': r('change', (D,), LOG, ('tags', 'disable'), ('tags', 'mode'), (LOG, ('tags', 'disable'))),
}

#: The `harmony.firmware` names reach the same handlers as these `setup.firmware` names.
TWINS = {'harmony.firmware' + verb: 'setup.firmware' + verb
         for verb in ('', '?updateneeded', '?updateinprogress', '?packageinstall', '?packageremove',
                      '?packagemanifest')}
for _twin, _of in TWINS.items():
    REQUESTS[_twin] = REQUESTS[_of]

#: The section that documents a request's parameters, when it is not the request's own: a twin's is its
#: `setup.firmware` name's, on the setup page, and the four button requests share the press's.
DOCUMENTED_IN = dict({t: ('setup', o) for t, o in TWINS.items()},
                     **{'control.button?' + v: ('system', 'control.button?press') for v in ('fire', 'hold', 'release')})

#: Registered without a verb, so every verb that is not registered reaches them.
BARE = {'setup.account', 'setup.sync', 'setup.firmware', 'setup.configchanged', 'setup.setlanguage',
        'setup.syncremotechanges', 'proxy.abort', 'proxy.error', 'proxy.finished', 'proxy.request',
        'proxy.response', 'connect.pair', 'connect.unpair', 'connect.ping', 'connect.resync',
        'harmony.firmware'}


def group_of(name):
    prefix = max((p for p in GROUPS if name.startswith(p)), key=len, default=None)
    if prefix is None:
        raise AssertionError('%s is in no known group' % name)
    return GROUPS[prefix]


ROW = re.compile(r'^\| `([^`]+)` \| (.+?) \| (read|change|action) \| (.+?) \|$')
SECTION = re.compile(r'^### `([^`]+)`$', re.M)


def page(name):
    with open(os.path.join(API, name + '.md'), encoding='utf-8') as fh:
        return fh.read()


def table(text):
    """The rows of a page's `## The requests` table: name to (kind, checks)."""
    body = text.split('## The requests', 1)[1].split('\n## ', 1)[0]
    rows = {}
    for line in body.splitlines():
        match = ROW.match(line)
        if match:
            rows[match.group(1)] = (match.group(3), tuple(re.findall(r'`(\w+)`', match.group(4))))
    return rows


def sections(text):
    """Each `### `name`` section's text, up to the next heading of level two or three."""
    out = {}
    marks = list(SECTION.finditer(text))
    for i, mark in enumerate(marks):
        end = marks[i + 1].start() if i + 1 < len(marks) else len(text)
        out[mark.group(1)] = re.split(r'\n## ', text[mark.end():end], maxsplit=1)[0]
    return out


class ThePagesAgreeWithTheList(unittest.TestCase):
    """Fact 2's page half, which needs no firmware: every page's table and sections against `REQUESTS`."""

    def test_each_table_holds_its_groups_requests_with_their_kind_and_checks(self):
        for name in PAGES:
            with self.subTest(page=name):
                rows = table(page(name))
                expected = {n: (v['kind'], v['checks']) for n, v in REQUESTS.items() if group_of(n) == name}
                self.assertEqual(sorted(rows), sorted(expected))
                self.assertEqual(rows, expected)
                self.assertEqual(len(rows), COUNTS[name])

    def test_every_request_has_a_section_naming_each_parameter_its_handler_reads(self):
        for name in PAGES:
            found = sections(page(name))
            for request, entry in REQUESTS.items():
                if group_of(request) != name:
                    continue
                with self.subTest(request=request):
                    self.assertIn(request, found)
                    where = found[request]
                    if request in DOCUMENTED_IN:
                        where = sections(page(DOCUMENTED_IN[request][0]))[DOCUMENTED_IN[request][1]]
                    for param in entry['params']:
                        self.assertIn('`%s`' % param, where, '%s of %s' % (param, request))

    def test_the_names_that_take_any_verb_are_the_ones_registered_bare(self):
        self.assertEqual({n for n in REQUESTS if '?' not in n}, BARE)

    def test_the_unpinned_kinds_are_exactly_two(self):
        self.assertEqual({n for n, v in REQUESTS.items() if v['kind'] != 'read' and v['effect'] is None},
                         UNPINNED - {'harmony.manualsync?start'})
        self.assertEqual(REQUESTS['harmony.manualsync?start']['kind'], 'read')


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheImage(unittest.TestCase):
    """The production engine's files, the root filesystem's names and its host name, read once."""

    _read = None

    @classmethod
    def setUpClass(cls):
        lab.require(BUILD)
        if TheImage._read is None:
            with tempfile.TemporaryDirectory() as directory:
                reader = SquashfsReader(members(BUILD)['harmony-image.squashfs'], directory)
                engine = [n for n in reader.names() if n.startswith(ENGINE) and n.endswith('.lua')]
                files = reader.each(engine + ['etc/hostname'])
                TheImage._read = (files, set(reader.names()), engine)
        cls.files, cls.names, cls.engine = TheImage._read

    def functions(self, path):
        return prototypes(self.files[path])

    @staticmethod
    def strings(function):
        return {x.decode('latin-1') for x in function['constants'] if isinstance(x, bytes)}

    def holding(self, path, names):
        """The one function of a file whose string constants hold every name; `==name` asks for an exact
        set, `name*` for a constant starting with it."""
        exact = {n[2:] for n in names if n.startswith('==')}
        found = []
        for function in self.functions(path):
            have = self.strings(function)
            if exact and have != exact:
                continue
            if all(n.startswith('==') or (n[:-1] and any(h.startswith(n[:-1]) for h in have) if n.endswith('*')
                                          else n in have) for n in names):
                found.append(function)
        self.assertEqual(len(found), 1, '%s in %s' % (names, path.rsplit('/', 1)[1]))
        return found[0]

    def registered(self):
        listener = self.functions(LISTENER)
        self.assertEqual(len(listener), 1, 'the listener is one function')
        return sorted(n for n in self.strings(listener[0]) if '.' in n and not n.startswith('tasks.'))


class TheRegisteredNames(TheImage):
    """Fact 1: the listener registers 120 names, and these four groups hold 72 of them."""

    def test_the_listener_registers_120_names_each_in_a_known_group(self):
        names = self.registered()
        self.assertEqual(len(names), 120)
        per = {}
        for name in names:
            per.setdefault(group_of(name), []).append(name)
        self.assertEqual({g: len(n) for g, n in per.items()}, COUNTS)

    def test_the_four_pages_name_exactly_the_registered_names_of_their_groups(self):
        names = {n for n in self.registered() if group_of(n) is not None}
        self.assertEqual(names, set(REQUESTS))
        for name in PAGES:
            with self.subTest(page=name):
                self.assertEqual(set(table(page(name))), {n for n in names if group_of(n) == name})

    def test_nothing_else_in_the_engine_registers_a_request(self):
        # A registration names the function `registerMessage`; besides the listener only the dispatcher
        # that defines it holds the name.
        holders = sorted(p for p in self.engine if any(b'registerMessage' == x for f in self.functions(p)
                                                       for x in f['constants']))
        self.assertEqual(holders, sorted([DISPATCH, LISTENER]))

    def test_each_requests_checks_column_is_the_registered_verifier_chain(self):
        # The checks column was held equal to the `REQUESTS` literal until the registration reader
        # (`registrations`, the engine test's) could read the verifier chain off the image. Now each page's
        # checks are firmware backed: the registered chain, or `['Default']` when the registration names none.
        reg = registrations(self.files[LISTENER])
        for name, entry in REQUESTS.items():
            with self.subTest(request=name):
                self.assertEqual(list(entry['checks']), reg[name][2] or ['Default'], name)

    def test_the_dispatcher_lowers_a_name_and_falls_back_to_its_bare_form(self):
        dispatch = self.holding(DISPATCH, ('canForwardToHal', 'lower'))
        self.assertTrue({'lower', '([%w.]+)'} <= self.strings(dispatch))
        names = set(self.registered())
        self.assertTrue(BARE <= names)
        self.assertNotIn('setup.content', names, 'an unknown content verb finds no handler')


class EachHandlerReadsItsParametersAndShowsItsKind(TheImage):
    """Fact 2's image half: each request's handler holds the parameters it reads, a read's handler names no
    write, and a change or an action has the function that does it."""

    def test_each_handler_holds_its_parameters(self):
        for request, entry in REQUESTS.items():
            with self.subTest(request=request):
                handler = self.strings(self.holding(entry['file'], entry['find'] + entry['params']))
                self.assertTrue(set(entry['params']) <= handler)

    def test_a_read_names_no_write(self):
        for request, entry in REQUESTS.items():
            if entry['kind'] != 'read' or request in UNPINNED:
                continue
            with self.subTest(request=request):
                handler = self.strings(self.holding(entry['file'], entry['find']))
                self.assertFalse(handler & WRITES, request)

    def test_a_change_or_an_action_has_the_function_that_does_it(self):
        for request, entry in REQUESTS.items():
            if entry['kind'] == 'read' or request in UNPINNED:
                continue
            with self.subTest(request=request):
                where, names = entry['effect']
                self.holding(where, names)

    def test_the_button_handler_takes_the_four_verbs_and_queues_each(self):
        handler = self.strings(self.holding(ACTIVITY, BUTTON['find']))
        self.assertTrue({'press', 'fire', 'hold', 'release', 'pushBack', '504', '404'} <= handler)
        # The two names the screens subscribe to are announcements the engine makes, never registered.
        names = set(self.registered())
        self.assertFalse({'control.button?presstype', 'control.button?sequencefinished'} & names)


class AProvisioningErasesNothingOnATouch(TheImage):
    """Fact 3: the erase branch of a Touch names the folder by a global nothing assigns."""

    def test_the_host_is_juniper(self):
        self.assertEqual(self.files['etc/hostname'].strip(), b'juniper')

    def test_the_compare_function_holds_datadir_as_a_local_and_as_a_global(self):
        compare = self.holding(ACCOUNT, ('removeFolder', 'accountId', 'remoteId'))
        self.assertIn('datadir', self.strings(compare), 'a constant: a global or a field')
        self.assertIn(b'datadir', compare['locals'], 'and a local, the pimentoblue branch')
        self.assertTrue({'pimentoblue', 'getDataPath'} <= self.strings(compare))

    def test_datadir_is_a_constant_only_there_and_in_the_launchers_option(self):
        holders = sorted(p for p in self.engine
                         if any('datadir' in self.strings(f) for f in self.functions(p)))
        self.assertEqual(holders, sorted([WORKS_SYSTEM, ACCOUNT]))
        # The control: in works/system.lua the name is the option `arg.datadir`, read beside `arg`.
        self.assertIn('arg', self.strings(self.holding(WORKS_SYSTEM, ('datadir', '../data'))))


class AStoredDocumentComesBackOnlyThroughAPut(TheImage):
    """Fact 4: `proxy.request` reads a queued put's document from the store; a put with no resource writes no
    file; and `proxy.resource?get` reads the store only in a hub's mode."""

    def test_proxy_request_reads_each_queued_puts_document_from_the_store(self):
        handler = self.strings(self.holding(REQUEST, ('popFront',)))
        self.assertTrue({'put', 'getResourceName', 'getResource', 'encode', 'resource'} <= handler)

    def test_the_put_saves_the_entrys_resource_and_the_write_refuses_nothing_to_write(self):
        put = self.strings(self.holding(RESOURCE, ('config_postupdate',)))
        self.assertTrue({'resource', 'saveResource', 'pushBack'} <= put)
        self.assertIn('no data to save', self.strings(self.holding(UTILS, ('no data to save',))))

    def test_resource_get_reads_the_store_only_in_mode_3(self):
        branch = self.holding(RESOURCE, ('fixHbusData', 'BUG'))
        self.assertTrue({0.0, 1.0, 3.0, 4.0} <= set(branch['constants']))
        backend = self.strings(self.holding(RESOURCE, ('getRemoteFirmwareChunk',)))
        self.assertTrue({'syncInProgress', '202', 'getResource'} <= backend)
        touch = self.strings(self.holding(RESOURCE, ('contentCallback', 'pushBack')))
        self.assertFalse({'getResource', 'syncInProgress'} & touch, 'modes 0 and 1 only queue')

    def test_the_response_turns_a_status_into_text_and_walks_from_the_end(self):
        response = self.holding(RESPONSE, ('replaceVerb', 'write', 'responses'))
        self.assertTrue({'tostring', 'statusCode'} <= self.strings(response))
        self.assertIn(-1.0, response['constants'], 'the walk steps down')

    def test_the_context_name_reaches_the_discovery_answer(self):
        info = self.strings(self.holding(TASKS + 'connectserver/core/discoveryinfo.lua', ('SetupSession',)))
        self.assertTrue({'getResource', 'Context', 'Name'} <= info)


class TheDangerousRequests(TheImage):
    """Fact 5: what restarts, installs, deletes or is refused, by the constants each rests on."""

    def test_update_renames_a_cached_image_and_restarts_into_the_upgrade(self):
        self.holding(SOFTWARE_UPDATE, ('getTempOtaFile', '/cache/ota-update.zip', 'rename', 'firmwareInstall'))
        self.holding(SOFTWARE_UPDATE, ('ota-update.zip', 'reboot', 'upgrade'))
        self.holding(SOFTWARE_UPDATE, ('/cache', 'tempOta.*.zip'))

    def test_the_status_read_can_restart_and_a_juniper_starts_at_status_0(self):
        self.holding(SOFTWARE_UPDATE, ('packageId', 'newVersion', 'currentVersion', 'processCmdRun', 'addTask',
                                       'reboot'))
        self.holding(SOFTWARE_UPDATE, ('initResultTable', 'juniper'))

    def test_reboot_restarts_after_2000_ms(self):
        task = self.holding(FIRMWARE, ('blockingSleep', 'reboot'))
        self.assertIn(2000.0, task['constants'])

    def test_packageremove_builds_a_delete_from_a_name_it_does_not_test(self):
        remove = self.strings(self.holding(PACKAGES, ('/bin/busybox rm -rf %s%s',)))
        self.assertFalse({'match', 'find', 'gsub', 'sub'} & remove)
        # The control: the manifest read does test its name, for a slash.
        self.assertIn('match', self.strings(self.holding(PACKAGES, ('manifest.json', 'safeCall'))))

    def test_the_file_requests_need_a_file_the_production_image_does_not_hold(self):
        self.assertTrue({'tdeEnable', '594'} <= self.strings(self.holding(c('jsonfiletransfer'), ('tdeEnable',))))
        self.assertIn('/etc/tdeenable', self.strings(self.holding(WORKS_SYSTEM, ('/etc/tdeenable',))))
        self.assertNotIn('etc/tdeenable', self.names)
        # The control: the folder the switch would sit in is there.
        self.assertIn('etc/hostname', self.names)

    def test_sysinfo_is_refused_off_pimentoblue(self):
        self.assertTrue({'pimentoblue', '500'} <= self.strings(self.holding(VERIFIERS, ('IsPimentoBlue:',))))

    def test_resync_neither_empties_the_queue_nor_aborts(self):
        resync = self.strings(self.holding(c('resync'), ('syncStart', 'doSync')))
        self.assertFalse({'removeAll', 'syncAbort'} & resync)
        # The control: setup.sync's own start does both.
        self.assertTrue({'removeAll', 'syncAbort'} <= self.strings(self.holding(SETUP_SYNC, ('syncStart',))))

    def test_manualsync_start_reads_a_global_its_parameter_is_not_named(self):
        start = self.holding(MANUALSYNC, ('headers', 'params'))
        self.assertIn(b'param', start['locals'])
        self.assertNotIn(b'params', start['locals'])

    def test_pairing_with_a_hub_moves_the_infrared_onto_the_radio(self):
        # The switch is a function holding the two paths and nothing else; a send to port 0 picks its own.
        self.holding(IR_SENDER, ('==path', '==/rf/hot/1/ir/ir_send', '==/ir/ir_send'))
        self.assertTrue({'setIrPath', 'setLedPath'} <= self.strings(self.holding(c('pair'), ('serverGuid',))))

    def test_finishing_commits_through_the_store_and_its_failure_aborts(self):
        self.assertTrue({'syncSuccess', 'configStale'} <= self.strings(self.holding(HWS_SYNC, ('syncSuccess',
                                                                                              'configStale'))))
        self.assertTrue({'rename', 'syncAbort'} <= self.strings(self.holding(STORE, ('rename', '_1'))))

    def test_the_digest_load_keeps_a_status_unless_an_activity_is_named(self):
        load = self.strings(self.holding(STATE_DIGEST, ('loadDataFile', 'stateVersion', 'syncStatus', 'sequence')))
        self.assertTrue({'-1', 'activityStatus'} <= load)


if __name__ == '__main__':
    unittest.main()
