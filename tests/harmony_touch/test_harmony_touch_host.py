#!/usr/bin/env python3
"""How a host other than Logitech's server reaches a Harmony Touch, read in its firmware: a request written
to one file is forwarded to the engine without filtering, the engine runs no security check because the host
is `juniper`, and the sync handlers check the envelope of an answer rather than its contents.

**The question** is whether a program of this project could configure a
Harmony Touch, by pushing a document straight onto it or by answering the sync the remote drives, and what
the remote would insist on either way. `packages/usb/test/touch/touch-host.test.ts` measures the envelope in three
recorded syncs of Logitech's client. This file holds the firmware side: the chain a request takes from the
cable to the put handler, that no verifier runs on a `juniper` host, and the names the sync handlers read of
an answer, anchored in the compiled files of the production package 4.15.330, the build a Harmony Touch
reports for itself (`tests/harmony_touch/test_harmony_touch_image.py`). The page is
`reference/architectures/harmony-touch/answering-a-sync.md`.

**How it is anchored.** The engine is compiled Lua 5.1 with a 4 byte `size_t` and 8 byte numbers, so a
string constant is the tag 4, a 32 bit length counting a closing NUL, the bytes and the NUL, and a number
constant is the tag 3 and a double; a constant asserted below is present in that exact encoding in the named
file, which is what a function of that file can use. The reading itself, which function uses which constant
and in what order, is the decompiled engine source in the private working copy, named by file and line in
the lab's `work/touch-firmware/notes/4.1-a-direct-route.md` and `4.2-answering-the-remote.md` and not repeated here. The native USB program `usr/bin/hal` is an ARM binary,
searched for its strings; its control flow was read as a disassembly in the working copy and is not decoded
here. So this file shows the constants the reading rests on are in the image; it does not re-derive the
reading.

**Per function, for the storage of a document and for an abort.** Two classes go one step past the file:
they walk a compiled chunk into its functions with `prototypes` from `tests/harmony_touch/test_harmony_touch_activities.py`
and ask which function holds which constants together, so "the callback that saves a core document names no
`type`" is a statement about one function rather than a file. The screens' `appscommon/harmony.lua` is Lua
source and is searched by the names of its functions, events and requests only. What they settle, in the
reading's words: a document is stored as the JSON encoding of its `resource` with no test of its type, so a
string of JSON is stored as a JSON string (`proxy/sync.lua` `syncResponseCallback`, `core/resourcemanager.lua`
`save`, `common/utils.lua` `write`); a refused answer empties the queue and announces status 553 and does not
reach the store's abort (`apihandler/response.lua` `handleSyncAbort`); the screens turn that announcement
into a failure that asks the engine for `proxy.abort`, which deletes the set aside, reloads the old one and
queues `proxy://Abort` (`appscommon/harmony.lua` `syncCallback` and `syncFailure`, `apihandler/proxy.lua`);
and an answer with no status meets a textual comparison with no message of its own, which raises, and the
dispatcher answers a handler that raises with a 500 (`response.lua` `validStatusCode`,
`connectserver/core/engine.lua`). This corrects the page's earlier "A missing status is treated as
insufficient and aborts"<!--superseded-->: the callbacks' message for a missing status is behind that comparison and is
reached only for a picture.

**Function by function, for the rest of the page.** The same reading anchors the page's other rules by the
function that holds their constants: the core documents' callback compares the status with the texts 200
and 304 and holds neither as a number; it names the tag, the activity list and its `Activities` and the
missing tag message, which is the tag rule with its one exception; a 304 calls the store's copy of a single
document, which looks for no file first, while the favourites index copy does; the finish names its commit
before the `proxy://Finished` it queues, and Lua 5.1 numbers a function's constants in the order the
compiler meets them; the direct put saves, queues for the account and reloads, and names no set aside and
no swap, which the sync's commit does; and the account function that compares the stored numbers removes
the data folder on the hubs' host name only, while the branch a `juniper` Touch takes hands its removal a
global nothing assigns, read from the function's own `GETGLOBAL` and `SETGLOBAL` instructions with the
readers of `test_harmony_touch_api_engine.py`. **That last one is a correction**: this file and the page
read the erase as a Touch's until a later reading asked which branch each of the function's two removals
sits on. **Read, not asserted**: the order of the checks inside a function where a branch lies
between them, that a refusal stops the rest of a write's answers, and what the engine does after a reload
fails. Those are the decompiled reading.

**What it settles and what it does not.** Settled: the forwarding format string and the file name are in the
native program; the port, the transport name and the announcement are in the engine's connector; the put
command name and the sync endings are registered in the engine; the `juniper` host name and its verifier are
in the image; and the sync handlers hold the status, tag, type and address names the reading attributes to
them. Not settled by this file: the order and the logic, which are the decompiled reading, and what the
remote does with an answer in practice, which no program of this project has driven.

**Sources checked first.** `reference/architectures/harmony-touch/answering-a-sync.md`, `usb.md` and the
three document pages; `tests/harmony_touch/test_harmony_touch_image.py`, whose readers this file imports; the decompiled
engine and the native program in the working copy, read in the lab notes above; Logitech's client
was not consulted for this step, which reads the remote's own firmware.

**Width.** One build, the production 4.15.330 image; the measured side, one Harmony Touch and one client
recorded, is the TypeScript test. The hubs run a sibling of this image and are not checked here.

**Standing.** "Read in the firmware" for every anchor: the constants are in Logitech's copyrighted image,
which stays in the working copy, so this file asserts their presence, counts and absence and quotes none of
the code around them.
"""
import re
import struct
import tempfile
import unittest

import lab
from .test_harmony_touch_activities import prototypes
from .test_harmony_touch_api_engine import GETGLOBAL, SETGLOBAL, global_names
from .test_harmony_touch_image import UNSQUASHFS, SquashfsReader, members

BUILD = 'touch_package_production'
ENGINE = 'opt/luaworks/'

#: The native USB program and the host name file, searched as bytes.
HAL = 'usr/bin/hal'
HOSTNAME = 'etc/hostname'

#: The engine files the reading of 4.1 and 4.2 names, each read once.
APILISTENER = ENGINE + 'tasks/apilistener.lua'
ENGINE_DISPATCH = ENGINE + 'tasks/connectserver/core/engine.lua'
CONNECTOR = ENGINE + 'tasks/connectserver/transport/halhttpserverconnector.lua'
VERIFIERS = ENGINE + 'tasks/connectserver/core/verifiers.lua'
RESOURCE = ENGINE + 'tasks/harmonywebservices/apihandler/resource.lua'
RESMGR = ENGINE + 'tasks/harmonywebservices/core/resourcemanager.lua'
RESPONSE = ENGINE + 'tasks/harmonywebservices/apihandler/response.lua'
SYNC = ENGINE + 'tasks/harmonywebservices/proxy/sync.lua'
PROXY = ENGINE + 'tasks/harmonywebservices/apihandler/proxy.lua'
READER = ENGINE + 'tasks/harmonyengine/loader/userconfigreader.lua'
ACCOUNT = ENGINE + 'tasks/setup/apihandler/account.lua'
SETUP_SYNC = ENGINE + 'tasks/setup/apihandler/sync.lua'
UTILS = ENGINE + 'common/utils.lua'
OFFLINE_QUEUE = ENGINE + 'tasks/eventqueue/core/offlinequeue.lua'
#: The screens' shared sync module, which is Lua source rather than a compiled chunk.
SCREENS_HARMONY = 'opt/luadraws/appscommon/harmony.lua'

ENGINE_FILES = [APILISTENER, ENGINE_DISPATCH, CONNECTOR, VERIFIERS, RESOURCE, RESMGR, RESPONSE, SYNC,
                PROXY, READER, ACCOUNT, SETUP_SYNC, UTILS, OFFLINE_QUEUE, SCREENS_HARMONY]


def string_constant(text):
    """A Lua 5.1 string constant as this engine's chunks encode it: tag 4, `size_t` length with the NUL."""
    raw = text.encode('latin-1')
    return b'\x04' + struct.pack('<I', len(raw) + 1) + raw + b'\x00'


def number_constant(value):
    """A Lua 5.1 number constant: tag 3 and an 8 byte double, the size the engine's header states."""
    return b'\x03' + struct.pack('<d', float(value))


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheImage(unittest.TestCase):
    """The production build's engine files, the native program and the host name, read once for the tests."""

    _read = None
    _engine = None

    @classmethod
    def setUpClass(cls):
        lab.require(BUILD)
        if TheImage._read is None:
            with tempfile.TemporaryDirectory() as directory:
                reader = SquashfsReader(members(BUILD)['harmony-image.squashfs'], directory)
                # Every compiled file of the engine as well, for the one search that has to cover all of them.
                engine = [n for n in reader.names() if n.startswith(ENGINE) and n.endswith('.lua')]
                files = reader.each(sorted(set(ENGINE_FILES + engine + [HAL, HOSTNAME])))
            TheImage._read = files
            TheImage._engine = engine
        cls.files = TheImage._read
        cls.engine = TheImage._engine

    def functions(self, path):
        """The engine file's functions, each as the set of its string constants."""
        return [{c for c in f['constants'] if isinstance(c, bytes)} for f in prototypes(self.files[path])]

    def constants_with(self, path, *texts):
        """The one function's whole constant list, in the order the compiler first met each, strings as bytes."""
        wanted = {t.encode() for t in texts}
        found = [f['constants'] for f in prototypes(self.files[path])
                 if wanted <= {c for c in f['constants'] if isinstance(c, bytes)}]
        self.assertEqual(len(found), 1, '%s in %s' % (texts, path.rsplit('/', 1)[1]))
        return found[0]

    def function_with(self, path, *texts):
        """The one function of an engine file whose string constants include every one of `texts`."""
        wanted = {t.encode() for t in texts}
        found = [f for f in self.functions(path) if wanted <= f]
        self.assertEqual(len(found), 1, '%s in %s' % (texts, path.rsplit('/', 1)[1]))
        return found[0]

    def assert_strings(self, path, texts):
        """Each text is present as a Lua string constant in the named engine file, in its exact encoding."""
        data = self.files[path]
        for text in texts:
            self.assertIn(string_constant(text), data, '%s in %s' % (text, path.rsplit('/', 1)[1]))


class TheNativeProgramForwardsARequest(TheImage):
    """4.1: the native USB program wraps a `/sys/hlapi` write as an HTTP GET to the engine and inspects none
    of it. The forwarding format string, the loopback address and the file name are in the program; the two
    paths that act on a write, the factory reset and the restart, are present as distinct names, which is why
    a write allow list excludes them. This said they act when opened<!--superseded--> until
    `test_harmony_touch_api_names.py` read the native program's name table."""

    def test_the_program_holds_the_forwarding_format_string_and_the_loopback_address(self):
        hal = self.files[HAL]
        self.assertIn(b'GET /api/%.*s HTTP/1.1', hal)
        self.assertIn(b'127.0.0.1', hal)
        self.assertIn(b'/sys/hlapi', hal)

    def test_the_two_paths_that_act_on_a_write_are_named_apart_from_the_sync_file(self):
        hal = self.files[HAL]
        for path in (b'/sys/reboot', b'/sys/factoryreset'):
            self.assertIn(path, hal)
        # The control: a plausible path the program does not offer is absent, so presence means something.
        self.assertNotIn(b'/sys/configwrite', hal)


class TheEngineAcceptsAndDispatchesTheRequest(TheImage):
    """4.1: the HTTP connector binds the port, carries the announcement, and the put reaches its handler."""

    def test_the_connector_binds_the_port_and_names_the_transport_and_the_announcement(self):
        connector = self.files[CONNECTOR]
        self.assertIn(number_constant(8333), connector)
        self.assert_strings(CONNECTOR, ['hal_http', 'Content-Length', '/api/'])

    def test_the_connector_matches_the_announcement_anywhere_and_counts_the_line_from_the_name(self):
        # The announcement is a pattern matched against the whole line the connector is handed, and the
        # writes that follow are gathered by cutting the line at its sixth character, which is what follows
        # `/api/`: so the count the announcement is held against starts at the request's name. Read in the
        # decompiled connector, `clientConnection`; these are the constants that reading rests on, in one
        # function. `touch-host.test.ts` measures what Logitech's client announced against it.
        constants = self.constants_with(CONNECTOR, 'Content%-Length%: (%d+)', 'response%?write', '/api/')
        self.assertIn(6.0, constants)
        self.assertIn(b'sub', constants)
        self.assertIn(b'contentLength', constants)

    def test_the_put_command_and_the_abort_are_registered_and_the_dispatcher_is_present(self):
        self.assert_strings(APILISTENER, ['proxy.resource?put', 'proxy.abort'])
        self.assert_strings(ENGINE_DISPATCH, ['processMessage'])


class NoVerifierRunsOnAJuniperHost(TheImage):
    """4.1 and 4.2: the host name is `juniper`, and the default verifier accepts on that name, so no token or
    policy applies to a command over the cable."""

    def test_the_host_name_is_juniper(self):
        self.assertEqual(self.files[HOSTNAME].strip(), b'juniper')

    def test_the_verifier_names_the_juniper_host_and_its_check(self):
        self.assert_strings(VERIFIERS, ['juniper', 'IsJuniper'])


class TheSaveAndResourceStore(TheImage):
    """4.1: a put is saved into the resource store with no integrity check; the store names the index and the
    picture extensions, which the tag scheme and a picture's type depend on."""

    def test_the_resource_handler_saves_and_reads_a_requests_list(self):
        self.assert_strings(RESOURCE, ['saveResource', 'requests'])

    def test_the_store_names_its_index_and_the_picture_extensions(self):
        self.assert_strings(RESMGR, ['index.json', 'saveResource', 'image/png', 'image/jpeg', '.png', '.jpg'])


class TheSyncHandlersCheckTheEnvelope(TheImage):
    """4.2: the names the sync handlers read of an answer, the status values they accept and the two endings
    of a sync."""

    def test_the_response_handler_names_the_status_and_the_address_and_the_bad_body_code(self):
        self.assert_strings(RESPONSE, ['statusCode', 'uri', '598'])

    def test_the_sync_reads_the_status_tag_type_and_cache_control_and_compares_200_and_304_as_text(self):
        self.assert_strings(SYNC, ['statusCode', 'etag', 'body-type', 'image/png', 'cache-Control',
                                   'getResourceName'])
        # The core documents' callback compares the status with the texts 200 and 304 and holds neither
        # as a number. A status sent as a number still matches, because `proxy.response` turns every
        # status into text before any callback sees it, `test_harmony_touch_api_setup.py`; this comment
        # said a number matches neither<!--superseded--> until that handler was read.
        callback = self.constants_with(SYNC, 'invalid statusCode ', 'saveResource')
        self.assertTrue({b'200', b'304'} <= set(callback))
        self.assertFalse({200.0, 304.0} & set(callback))
        # The control: a picture type the store has no extension for is named nowhere in the sync, so the
        # names found above are not the search matching anything.
        self.assertNotIn(string_constant('image/gif'), self.files[SYNC])

    def test_a_200_needs_a_tag_except_for_an_activity_list_with_no_activities(self):
        callback = self.function_with(SYNC, 'invalid statusCode ', 'saveResource')
        self.assertTrue({b'etag', b'ActivityList', b'Activities'} <= callback)

    def test_a_304_copies_the_stored_file_without_looking_for_it(self):
        callback = self.function_with(SYNC, 'invalid statusCode ', 'saveResource')
        self.assertIn(b'copyResource', callback)
        copies = [f for f in self.functions(RESMGR) if b'copyFile' in f and b'ContentUser' not in f]
        self.assertEqual(len(copies), 1, 'one copy of a single document')
        self.assertNotIn(b'fileExists', copies[0], 'a missing file is copied and the copy fails')
        # The control: the store's other copy, of the favourites index, does look first.
        self.assertIn(b'fileExists', self.function_with(RESMGR, 'copyFile', 'ContentUser'))

    def test_the_finish_commits_before_it_queues_the_finished_request(self):
        # Lua 5.1 numbers a function's constants in the order the compiler first meets them, so in a
        # function with no branch between the two, the commit named first is the commit made first.
        finish = self.constants_with(PROXY, 'proxy://Finished', 'syncComplete')
        self.assertLess(finish.index(b'syncComplete'), finish.index(b'proxy://Finished'))
        self.assertIn(b'pushBack', finish)

    def test_the_direct_put_saves_into_the_live_store_queues_it_and_reloads(self):
        put = self.function_with(RESOURCE, 'requests', 'saveResource', 'config_new')
        self.assertTrue({b'pushBack', b'put'} <= put, 'queued for the account')
        self.assertFalse({b'tmp', b'syncStart', b'syncSuccess'} & put, 'no set aside and no swap')
        # The control: the sync's own commit does swap a set aside in.
        self.assertTrue({b'tmp', b'_1', b'folderExists'} <= self.function_with(RESMGR, 'tmp', '_1', 'folderExists'))

    def test_the_two_endings_of_a_sync_are_named(self):
        self.assert_strings(PROXY, ['proxy://Finished', 'proxy://Abort', 'syncComplete', 'syncAbort'])


class TheReaderNeedsEachDocumentsArray(TheImage):
    """4.2: the four documents the engine loads are read by their top level arrays, which a host must send
    even when empty."""

    def test_the_config_reader_names_each_documents_array(self):
        self.assert_strings(READER, ['Activities', 'DevicesWithFeatures', 'ButtonMaps', 'Protocols'])


class AProvisioningErasesTheDataFolderOnAHubOnly(TheImage):
    """Read when asking whether a program of ours could answer a sync, then corrected and settled per branch
    when the setup requests were documented: provisioning compares the
    incoming account, mode, discovery server and remote number against the stored ones, and when any differs
    it enters a removal of the data folder. That compare runs **for every host, before the host name branch**,
    against the module's stored values. The removal itself is split: the `pimentoblue` branch declares
    `local datadir = system.getDataPath()` and removes that folder, destructive on a hub; the other branch,
    the one a `juniper` Touch takes, calls `removeFolder(datadir)` on a **global** `datadir` that nothing in
    the account handler assigns (and nothing in the engine, `test_harmony_touch_api_setup.py`'s
    `AProvisioningErasesNothingOnATouch`). So on a Touch the removal is handed `nil`, and the store's
    `removeFolder` asks `folderExists` first, which returns at once for no path. **A Touch keeps its data.**

    Which instruction loads `datadir` in each branch is the settling evidence: in the `pimentoblue` branch it
    is a register, the declared local; in the `juniper` branch it is a `GETGLOBAL` of an unassigned global.
    Both are in the one function, which is why an earlier reading took the erase for a Touch's.

    The blind reviewer read the else branch as removing `system.getDataPath()`, `/data`; that is wrong, since
    `getDataPath` is called only in the `pimentoblue` branch's local. Two of the blind reading's other points
    hold and are recorded: the compare precedes the host name branch and reads the module's stored account
    state, and a missing or non canonical discovery server (differing from the stored URI) makes the compare's
    `or` true and so takes the removal path, which on a Touch still erases nothing.

    This class was `ProvisioningIsDestructive` and asserted that the compare function names the removal and
    `getDataPath`, which it does; it read as the erase of a Touch's store because nobody had asked which
    branch each removal sits on, and both are in the one function. The page said so until the correction.

    Controls, each a string replacement reversed with a hash check, failed the test they aimed at: the global
    read looked for among the writes, `mode` asserted unassigned, and `fileExists` asked of the store's folder
    removal."""

    def test_the_account_handler_names_provisioning_and_the_two_numbers(self):
        self.assert_strings(ACCOUNT, ['provision', 'accountId', 'remoteId'])

    def test_off_the_hubs_host_name_the_removal_is_handed_a_global_nothing_assigns(self):
        found = [f for f in prototypes(self.files[ACCOUNT])
                 if {b'removeFolder', b'accountId', b'remoteId'} <= set(f['constants'])]
        self.assertEqual(len(found), 1, 'one function compares the stored numbers')
        compare = found[0]
        consts = set(compare['constants'])
        # The compare runs for every host before the host name branch: it names all four compared fields,
        # the host name test and both removal spellings.
        self.assertTrue({b'accountId', b'mode', b'discoveryServer', b'activeRemoteId', b'getHostName',
                         b'pimentoblue', b'getDataPath'} <= consts)
        # The per branch instruction: `datadir` is a declared local (a register) in the pimentoblue branch and
        # a `GETGLOBAL` in the other, both in this one function.
        self.assertIn(b'datadir', compare['locals'], 'the hub branch names its folder in a local')
        self.assertIn(b'datadir', global_names(compare, GETGLOBAL), 'the other branch reads a global of that name')
        assigned = {n for f in prototypes(self.files[ACCOUNT]) for n in global_names(f, SETGLOBAL)}
        self.assertNotIn(b'datadir', assigned, 'and nothing in the handler assigns it, so the removal gets nil')
        # The control: the same reading finds the globals the handler does assign, the stored account state
        # the compare function reads.
        self.assertTrue({b'accountId', b'remoteId', b'mode'} <= assigned)
        # And the provisioning entry point itself removes nothing; it hands over.
        self.assertNotIn(b'removeFolder', self.function_with(ACCOUNT, 'provisionInfo', 'handleProvision'))

    def test_the_stores_folder_removal_asks_whether_the_folder_exists(self):
        self.assertIn(b'folderExists', self.function_with(UTILS, 'removeFolder', 'rmdir'))


class ADocumentIsStoredAsTheEncodingOfWhatArrives(TheImage):
    """A document's `resource` is stored as its JSON encoding with no test of its type, so a string of JSON is
    stored as a JSON string. The callback that saves a core document names `encode` and the store and no
    `type`; the store's save parts a table from anything else by `type`, writing a table encoded and a string
    as it is; nothing in the answer handler names `type` at all. The reader then decodes the file back, and a
    string carries none of the arrays `TheReaderNeedsEachDocumentsArray` names."""

    def test_a_document_is_stored_as_the_encoding_of_its_resource_with_no_type_check(self):
        callback = self.function_with(SYNC, 'invalid statusCode ', 'saveResource')
        self.assertIn(b'encode', callback)
        self.assertNotIn(b'type', callback, 'the resource is encoded whatever it is')
        save = self.function_with(RESMGR, 'saving resource:')
        self.assertTrue({b'type', b'table', b'write'} <= save, 'a table encoded, a string written as it is')
        self.assertTrue({b'no data to save', b'encode', b'saveDataFile'} <= self.function_with(UTILS, 'no data to save'))
        self.assertFalse(any(b'type' in f for f in self.functions(RESPONSE)))
        # The control: the one handler that does test a resource's type, the hub put, is found by the same
        # reading, so an absence above means something.
        self.assertTrue({b'type', b'table', b'encode'} <= self.function_with(SYNC, 'sync.putResourceIntoHub: [ verb: put ] [ uri:'))


class ARefusedAnswerReachesTheAnswererThroughTheScreens(TheImage):
    """A refused answer empties the queue and announces status 553 to the screens, and the answer handler
    reaches neither the store's abort nor the resource manager; the screens, subscribed to `setup.sync`,
    turn any other status into a failure that asks the engine to abort, and only that abort queues
    `proxy://Abort`. An answer with no status is refused by nothing of its own: the status check names no
    message for it, the callbacks' message for it sits behind that check, and the dispatcher answers a
    handler that raises with a 500."""

    def test_a_refused_answer_empties_the_queue_and_announces_553(self):
        refusal = self.function_with(RESPONSE, 'Sync aborted')
        self.assertTrue({b'removeAll', b'syncError', b'200'} <= refusal)
        self.assertFalse(any(b'syncAbort' in f for f in self.functions(RESPONSE)))
        self.assertNotIn(string_constant('tasks.harmonywebservices.core.resourcemanager'), self.files[RESPONSE])
        announce = self.function_with(SETUP_SYNC, 'vnd.logitech.setup/vnd.logitech.sync')
        self.assertTrue({b'553', b'setup.sync', b'messages'} <= announce)
        # The control: the abort a host or the screens ask for does reach the store and queue the request.
        self.assertTrue({b'syncAbort', b'proxy://Abort'} <= self.function_with(PROXY, 'proxy://Abort'))
        self.assertIn(string_constant('tasks.harmonywebservices.core.resourcemanager'), self.files[SETUP_SYNC])

    def test_the_screens_turn_a_553_into_the_abort(self):
        # By names only: the event the screens subscribe their sync callback to, what that callback's last
        # branch calls with which code and message, and what the failure it calls asks the engine for.
        screens = self.files[SCREENS_HARMONY].decode('utf-8')
        self.assertEqual(re.findall(r'^EVENT_SYNC = "(.*)"$', screens, re.M), ['setup.sync'])
        self.assertTrue(re.search(r'subscribe\(EVENT_SYNC, syncCallback\b', screens))
        callback = re.search(r'^function syncCallback\(.*?\n(.*?)^end$', screens, re.M | re.S).group(1)
        last = callback.rsplit('\telse\n', 1)[1]
        self.assertEqual(re.findall(r'(\w+)\("(\d+)"', last), [('syncFailure', '553')])
        failure = re.search(r'^function syncFailure\(.*?\n(.*?)^end$', screens, re.M | re.S).group(1)
        for name in ('syncAbortInProgress', 'isSyncInProgress', 'errorCode', 'errorMessage'):
            self.assertIn(name, failure)
        self.assertEqual(re.findall(r'request\("([\w.?]+)"', failure), ['proxy.abort'])

    def test_a_missing_status_raises_rather_than_aborts(self):
        check = self.function_with(RESPONSE, 'response: [ code: %s ] [ uri: %s ]')
        self.assertTrue({b'statusCode', b'404', b'400', b'600'} <= check, 'the status is compared as text')
        self.assertFalse(any(m in c for c in check for m in (b'Insufficient', b'missing')),
                         'the check has no message of its own for a missing status')
        dispatcher = self.function_with(ENGINE_DISPATCH, 'Server error: handler failed')
        self.assertTrue({b'safeCall', b'500'} <= dispatcher, 'a handler that raises is answered 500')
        # The control: both callbacks behind the check do carry a message for a missing status, each found
        # once, so the absence in the check is not the search missing it.
        for callback in ('invalid statusCode ', 'body-type'):
            with self.subTest(callback=callback):
                self.function_with(SYNC, 'Insufficient parameters in the Response (statusCode)', callback)


def lua_function(source, name):
    """The body of one top level function of the screens' Lua source, by its name, or a failure."""
    found = re.search(r'^(?:local )?function %s\(.*?\n(.*?)^end$' % re.escape(name), source, re.M | re.S)
    if found is None:
        raise AssertionError('no function %s in the screens' % name)
    return found.group(1)


class AChangeOnTheRemoteErasesItsTagAndKeepsTheFile(TheImage):
    """**A request with no entity tag does not mean the remote holds no file.** A change made on the remote's own
    screens is saved with no tag and the file kept, and the whole document is queued to go up to the account; the
    next sync then asks for it without a tag. Read in the preflight of the first sync this project drives, the
    lab's `work/touch-firmware/notes/6.7-preflight.md`.

    **What was read, in the decompiled engine and the screens' source.** The screens build the request for a
    change in `getRequest` (`appscommon/harmony.lua`): an address and the document, `json.encode`d, and no tag,
    and `getResourceUri` sends it as `proxy.resource?put`, the direct put. The engine's handler for that,
    `processPutResource` (`harmonywebservices/apihandler/resource.lua`), pushes a `put` onto the outgoing queue
    and calls the store's `saveResource` with the request's `etag`, which is nil, so the store
    (`core/resourcemanager.lua` `saveResource`) writes the file and an index entry with no tag. `getEtag` in the
    same file returns the index entry's tag only when the file exists, and nil otherwise, so it returns nil for
    a file kept with no tag as well as for a missing file; the sync's request list (`proxy/sync.lua`
    `getResourceList`) is built with `getEtag`, and so asks for that document with no tag. The outgoing queue
    is saved to a data file (`eventqueue/core/offlinequeue.lua`, `savePutRequests`) and loaded again when the
    engine starts, so the queued change survives a restart, and `removeAll`, which an abort calls, saves it
    empty.

    **What it corrects.** `answering-a-sync.md` said a 304 to a request that carried no tag tells the remote to
    copy a file it does not hold<!--superseded-->. That is one of the two causes; the other is this one, where
    the store's copy of a single document, which looks for no file first (`TheSyncHandlersCheckTheEnvelope`),
    would copy the file the remote keeps, with its untagged index entry. **The wrong rule produced the right
    answer**: an answerer cannot tell the two apart, so a 304 to a request with no tag stays refused, and the
    answerer, `packages/corpus/src/touchsync.ts`, keeps refusing it for a document. The earlier reading had
    looked at what a 304 does and not at what makes a tag absent.

    **The recordings agree.** In the full sync recorded after settings had been changed on the remote, Settings
    was the one document asked for without a tag, which `packages/usb/test/touch/touch-sync-both-ways.test.ts`
    asserts; it cannot see the cause, which is this reading. `tests/harmony_touch/test_harmony_touch_favourites.py` held the
    same fact for Settings as a sentence of its header and asserted only that a change queues the document;
    this class asserts the names the whole chain rests on.

    **Not asserted**: which argument each call passes, and the order of the calls inside a function, which are
    the decompiled reading; that `request.etag` is nil is read from the screens building no tag, not from the
    engine.

    **Sources checked first.** `answering-a-sync.md`, `favourites-and-settings.md` "How a value is written",
    this file's other classes, `test_harmony_touch_favourites.py`, the preflight note, and the decompiled engine.
    Logitech's client does not take part: the change is the remote's own.

    **Controls**, each a string replacement reversed with a hash check: `etag` asked for in the screens' change
    request, `fileExists` asked absent from `getEtag`, and the engine's queue file name changed, each failed the
    test it aimed at."""

    def test_the_screens_hand_a_change_to_the_engine_with_no_tag(self):
        screens = self.files[SCREENS_HARMONY].decode('utf-8')
        request = lua_function(screens, 'getRequest')
        # Booleans and counts only, so a failure prints no firmware source.
        self.assertTrue('request.resource = json.encode(params.resource)' in request, 'the document is carried')
        self.assertTrue('request.uri' in request, 'and its address')
        self.assertFalse('etag' in request, 'and no tag')
        uri = lua_function(screens, 'getResourceUri')
        self.assertEqual(re.findall(r'params\.cmd = "(proxy\.resource\?\w+)"', uri), ['proxy.resource?put', 'proxy.resource?get'])
        # The control: the screens' own content requests do carry the stored tag, so the absence above is not
        # the search missing it.
        self.assertEqual(screens.count('etag = resMgr.getEtag('), 12)

    def test_the_engine_saves_the_put_with_the_tag_it_carries_and_queues_it(self):
        put = self.function_with(RESOURCE, 'requests', 'saveResource', 'config_new')
        self.assertTrue({b'etag', b'resource', b'saveResource', b'pushBack', b'put'} <= put)

    def test_the_store_answers_a_tag_only_for_a_file_that_exists(self):
        lookup = self.function_with(RESMGR, 'not found, but index entry found. etag:')
        self.assertTrue({b'fileExists', b'etag', b'resources'} <= lookup)
        save = self.function_with(RESMGR, 'No contentType for')
        self.assertTrue({b'etag', b'hetag', b'application/json'} <= save, 'the index entry takes the tag it is given')

    def test_the_sync_asks_for_each_document_with_that_lookup(self):
        # Two functions build the list, a Touch's and a hub's, and only the hub's also asks for the hub's tag.
        lists = [f for f in self.functions(SYNC) if {b'/MapList?excludeFunctionMaps=true', b'getEtag'} <= f]
        self.assertEqual([b'getHubEtag' in f for f in lists], [False, True])
        self.assertTrue({b'/ActivityList', b'/DeviceList', b'/Context', b'/Settings', b'etag', b'uri'} <= lists[0])

    def test_the_queued_change_is_kept_in_a_data_file_across_a_restart(self):
        self.assert_strings(OFFLINE_QUEUE, ['offlineQueue', 'savePutRequests', 'saveDataFile', 'loadDataFile'])
        # Three functions save the queue: the save of the puts, the removal of one answered put, and the
        # emptying an abort calls, which names neither a verb nor a callback.
        saves = [f for f in self.functions(OFFLINE_QUEUE) if b'saveDataFile' in f]
        self.assertEqual(len(saves), 3)
        self.assertEqual([f for f in saves if not {b'verb', b'callback'} & f], [{b'encode', b'remove', b'saveDataFile'}])


class TheScreensTakePartOnlyOnUSBPower(TheImage):
    """**A Touch's screens ignore a sync unless the remote is powered over USB**, and nothing a host can ask
    on the request channel says which power source it is on. Read in the same preflight, before the first sync
    this project drives.

    **What was read, in the screens' source** (`appscommon/harmony.lua`). The three callbacks a sync needs from
    the screens return at once while `usbDisconnected` is set: `syncCallback` (the sync's progress, and on a
    failure the abort) unless a sync type of the screens' own is running, `syncConflictCallback` (the hand
    over, and on its success the commit), and `resourceReadyCallback` (the content fetching, which ends in the
    commit) outside the hubs' surface mode. The power watcher, a filter on the power controller's
    `powersource` file, clears the flag on the source named `usb` alone and sets it on every other, `usb_charge`
    included, and a change of source while a sync runs fails it, 554 on `usb` and 555 otherwise. So on any
    source but `usb` the commit, `proxy.finished`, is never sent and nothing commits; an answerer reads empty
    lists until its own bound.

    **What a host can ask.** The engine names no power source in any of its 172 compiled files, and the
    provisioning answer (`setup/apihandler/account.lua` `getProvisionInfo`) holds none, and `/sys/sysinfo` is
    built once when the native program starts, `test_harmony_touch_api_names.py`. The one name that reads the
    power source is the factory test's `/tde/powerstate`, outside every route this project opens. So the
    answerer cannot refuse a commit on the power source, and its script says so instead,
    `packages/corpus/bin/touch-sync.ts`.

    **Not checked**: which power source a given computer port gives, and what the screens show for
    `usb_charge`. The bench saw a Touch show Charging rather than its USB screen on one port, which by
    `display.md` is a dock or mains source; that is `docs/test-notes/harmony-touch.md`'s, not this file's.

    **Sources checked first.** `answering-a-sync.md`, `display.md` "Charging and the battery",
    `test_harmony_touch_keys.py`, which anchors the watcher's file, and the preflight note.

    **Controls**, each a string replacement reversed with a hash check: the watcher's `"usb"` changed, and
    `powersource` asked for in the provisioning function, each failed the test it aimed at."""

    def test_the_three_sync_callbacks_return_while_the_remote_is_off_usb(self):
        screens = self.files[SCREENS_HARMONY].decode('utf-8')
        for name, first_work in (('syncCallback', 'json.decode'), ('syncConflictCallback', 'json.decode'),
                                 ('resourceReadyCallback', 'url.decode')):
            with self.subTest(callback=name):
                body = lua_function(screens, name)
                guard = re.search(r'if self\.usbDisconnected\b[^\n]*then\s*\n\s*return\s*\n', body)
                self.assertTrue(guard is not None, 'an early return on usbDisconnected')
                self.assertLess(guard.start(), body.index(first_work), 'before the callback does anything')

    def test_the_power_watcher_clears_the_flag_on_usb_alone(self):
        screens = self.files[SCREENS_HARMONY].decode('utf-8')
        at = screens.index('"powersource" then')
        watcher = screens[at:screens.index('\nend)', at)]
        self.assertEqual(re.findall(r'if value == "(\w+)" then', watcher), ['usb'])
        self.assertEqual(re.findall(r'usbDisconnected = (\w+)', watcher), ['false', 'true'])
        self.assertEqual(re.findall(r'syncFailure\("(\d+)"', watcher), ['554', '555'])

    def test_the_engine_names_no_power_source_and_the_provisioning_answer_none(self):
        # Every compiled file of the engine, counted so a listing that lost files moves a number.
        self.assertEqual(len(self.engine), 172)
        self.assertEqual([p for p in self.engine if b'powersource' in self.files[p].lower()], [])
        provisioning = self.function_with(ACCOUNT, 'discoveryServerCF', 'susChannel')
        self.assertFalse(any(b'power' in c or b'usb' in c.lower() for c in provisioning))
        # The control: the screens do name it, so the search finds it where it is.
        self.assertIn(b'powersource', self.files[SCREENS_HARMONY])


if __name__ == '__main__':
    unittest.main()
