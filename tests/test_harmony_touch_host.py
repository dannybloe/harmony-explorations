#!/usr/bin/env python3
"""How a host other than Logitech's server reaches a Harmony Touch, read in its firmware: a request written
to one file is forwarded to the engine without filtering, the engine runs no security check because the host
is `juniper`, and the sync handlers check the envelope of an answer rather than its contents.

**The question.** `todo-touch.md` 4.1 and 4.2 ask whether a program of this project could configure a
Harmony Touch, by pushing a document straight onto it or by answering the sync the remote drives, and what
the remote would insist on either way. `packages/usb/test/touch-host.test.ts` measures the envelope in three
recorded syncs of Logitech's client. This file holds the firmware side: the chain a request takes from the
cable to the put handler, that no verifier runs on a `juniper` host, and the names the sync handlers read of
an answer, anchored in the compiled files of the production package 4.15.330, the build a Harmony Touch
reports for itself (`tests/test_harmony_touch_image.py`). The page is
`reference/architectures/harmony-touch/answering-a-sync.md`.

**How it is anchored.** The engine is compiled Lua 5.1 with a 4 byte `size_t` and 8 byte numbers, so a
string constant is the tag 4, a 32 bit length counting a closing NUL, the bytes and the NUL, and a number
constant is the tag 3 and a double; a constant asserted below is present in that exact encoding in the named
file, which is what a function of that file can use. The reading itself, which function uses which constant
and in what order, is the decompiled engine source in the private working copy, named by file and line in
`todo-touch.md` 4.1 and 4.2 and not repeated here. The native USB program `usr/bin/hal` is an ARM binary,
searched for its strings; its control flow was read as a disassembly in the working copy and is not decoded
here. So this file shows the constants the reading rests on are in the image; it does not re-derive the
reading.

**Per function, for the storage of a document and for an abort.** Two classes go one step past the file:
they walk a compiled chunk into its functions with `prototypes` from `tests/test_harmony_touch_activities.py`
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
the data folder. **Read, not asserted**: the order of the checks inside a function where a branch lies
between them, that a refusal stops the rest of a write's answers, and what the engine does after a reload
fails. Those are the decompiled reading.

**What it settles and what it does not.** Settled: the forwarding format string and the file name are in the
native program; the port, the transport name and the announcement are in the engine's connector; the put
command name and the sync endings are registered in the engine; the `juniper` host name and its verifier are
in the image; and the sync handlers hold the status, tag, type and address names the reading attributes to
them. Not settled by this file: the order and the logic, which are the decompiled reading, and what the
remote does with an answer in practice, which no program of this project has driven.

**Sources checked first.** `reference/architectures/harmony-touch/answering-a-sync.md`, `usb.md` and the
three document pages; `tests/test_harmony_touch_image.py`, whose readers this file imports; the decompiled
engine and the native program in the working copy, read in `todo-touch.md` 4.1 and 4.2; Logitech's client
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
from test_harmony_touch_activities import prototypes
from test_harmony_touch_image import UNSQUASHFS, SquashfsReader, members

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
#: The screens' shared sync module, which is Lua source rather than a compiled chunk.
SCREENS_HARMONY = 'opt/luadraws/appscommon/harmony.lua'

ENGINE_FILES = [APILISTENER, ENGINE_DISPATCH, CONNECTOR, VERIFIERS, RESOURCE, RESMGR, RESPONSE, SYNC,
                PROXY, READER, ACCOUNT, SETUP_SYNC, UTILS, SCREENS_HARMONY]


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

    @classmethod
    def setUpClass(cls):
        lab.require(BUILD)
        if TheImage._read is None:
            with tempfile.TemporaryDirectory() as directory:
                reader = SquashfsReader(members(BUILD)['harmony-image.squashfs'], directory)
                files = reader.each(ENGINE_FILES + [HAL, HOSTNAME])
            TheImage._read = files
        cls.files = TheImage._read

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
    paths that act when opened are present as distinct names, which is why a write allow list excludes them."""

    def test_the_program_holds_the_forwarding_format_string_and_the_loopback_address(self):
        hal = self.files[HAL]
        self.assertIn(b'GET /api/%.*s HTTP/1.1', hal)
        self.assertIn(b'127.0.0.1', hal)
        self.assertIn(b'/sys/hlapi', hal)

    def test_the_two_paths_that_act_when_opened_are_named_apart_from_the_sync_file(self):
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
        # as a number, so a status sent as a number matches neither.
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


class ProvisioningIsDestructive(TheImage):
    """4.2: provisioning takes the account and remote numbers and, on a change, erases the data store; it is
    never on a sync's allow list. The names it reads are here, and the function that compares the
    stored numbers names the removal of the data folder; when it removes it is the decompiled reading."""

    def test_the_account_handler_names_provisioning_and_the_two_numbers(self):
        self.assert_strings(ACCOUNT, ['provision', 'accountId', 'remoteId'])

    def test_the_function_that_compares_the_stored_numbers_removes_the_data_folder(self):
        erase = self.function_with(ACCOUNT, 'removeFolder', 'accountId', 'remoteId')
        self.assertTrue({b'mode', b'discoveryServer', b'getDataPath'} <= erase)
        # The control: the provisioning entry point itself removes nothing; it hands over.
        self.assertNotIn(b'removeFolder', self.function_with(ACCOUNT, 'provisionInfo', 'handleProvision'))


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


if __name__ == '__main__':
    unittest.main()
