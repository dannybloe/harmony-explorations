#!/usr/bin/env python3
"""Why a Harmony Touch synced through a computer asks for its favourites without an entity tag, and what an
answer to such a request does to the favourites it holds, read in the production image, 4.15.330.

**The question.** `todo-touch.md` 6.7 ran the first sync answered by this project on the bench Touch. The six
configuration documents came with their tags and were answered 304; then the remote asked for the user's
favourites document **with no tag**, though the full sync of 2.3 had delivered that document with 200 and a
tag, at the same address (compared for equality only, `packages/usb/test/touch/touch-first-sync.test.ts`). The
answerer refused, as it was built to. The question was which of four causes: never stored with a tag, stored
under another key than the one looked up, the tag erased by a change on the remote, or a different address.

**The answer, read.** **The tag is looked up in the wrong place for the moment it is needed.** The three
favourites requests are not the engine's: the remote's screens build them, after the engine reports the six
documents in, and the engine queues each with whatever tag the screens put on it
(`harmonywebservices/apihandler/resource.lua`, `getResourceViaMyHarmony`, which names no tag lookup of its
own). The screens rebuild their list of favourites first (`favMgr.init()` at the top of
`submitContentUserRequest`, `submitContentDeviceRequest` and `submitContentServiceRequest` in
`appscommon/harmony.lua`), and that list reads each favourites document's file before its tag and returns
without the tag when the file cannot be read (`updateContentUser`, `updateContentDevice` and
`updateContentService` in `appscommon/favoritesmanager.lua`). **While the screens hold a sync as running,
their resource manager reads a file from the gathered set, `/data/tmp/`**, and the tag from the committed
index (`getResource` and `getEtag` in `appscommon/resourcemanager.lua`), and the screens mark the sync running
on its start, status 0, before they ask for anything (`syncCallback`). **Nothing puts a favourites document
into the gathered set before the screens ask for it on a Touch synced through a computer**: the engine's copy
of them, `copyContentIndexAndSource`, is called from the hubs' sync alone (`proxy/sync.lua`, the function
that also names the relogin and `syncPimentoAll`; the function a Touch's mode 0 and 1 dispatch to names no
copy), and the screens' own copy, `copyContentResource`, runs only on a branch that then returns without
asking. So the file read fails, the tag is never read, and every favourites request of such a sync goes out
untagged, the user's, each device's and the provider line up's alike. **None of the four causes the question
listed**: the tag is stored, under the key looked up; the hand over handed up Settings alone, so no
favourites change was queued; and the address equals the full sync's.

**It follows that the device and provider requests, which the run never reached, come without theirs too**:
the device document is read from the gathered set the same way, and the line up is asked for only once the
user document is there, which by then it is when it was answered, and its own file is not.

**What each answer does to the stored favourites**, by the engine's content callback (`proxy/sync.lua`
`contentCallback`) and the write handler (`apihandler/response.lua` `processCommand`):

* **304 with a tag**: the callback requires a tag on the answer, then copies the committed file and its
  committed index entry into the gathered set (`resourcemanager.lua` `copyResource`, which names no tag and
  no test for the file). So the remote keeps exactly what it held, under its own stored tag, and the tag on
  the answer is not stored. If it holds no file, nothing is copied and the document is missing from the new
  set, which is no worse than a 404.
* **200 with a document and a tag**: saved into the gathered set under the tag given, replacing what the
  remote held at the commit. **This writes a document.**
* **404 with a tag**, allowed for the user's favourites only (`validStatusCode`): nothing is saved, the
  gathered set starts without it, so the user's favourites are dropped at the commit. A 404 to a device or
  provider document is refused by its status and aborts the sync.
* **Any of them without a tag**: the callback returns an error, and `processCommand` aborts the sync for
  every address but a picture's, `^http` and `^content%-image://`. **This corrects the reference**, which said
  a favourites document answered without a tag is not saved<!--superseded-->: that is a picture's fate; a
  favourites document's is an abort. The answerer's earlier rule of answering the user's favourites 404 when a
  set lacked them, which sent no tag, would have aborted the sync for that reason.

So **304 is the answer that keeps the favourites**, and it needs no copy of them from anywhere: the remote
copies its own. That is the rule the answerer takes, `packages/corpus/src/touchsync.ts`.

**What this file asserts, and how.** The screens are Lua source in the image, searched by function: the
order of the file read, the early return and the tag read in each of the three list builders; the gathered
folder chosen while a sync runs and the committed index for the tag; the sync marked running on status 0
before the favourites are asked for; the list rebuilt before each of the three requests; and the one call of
the screens' copy followed by a return before the request. The engine is compiled, so it is anchored by the
string constants of one function at a time, with `prototypes` from `test_harmony_touch_activities.py`: the
copy named by exactly one function of `proxy/sync.lua`, the one that also names the hub's relogin, and not by
the function a computer's sync dispatches to; no engine file but those two names it; the request handler of a
computer's sync names no tag lookup; the content callback names the copy and the missing tag message and no
tag lookup; the store's single copy names no test for the file; and the write handler exempts the two picture
schemes and names no `content://`. **Read, not asserted**: which branch of `doSync` calls which function, and
that the write handler's exemption guards the abort, which are the decompiled engine in the lab's working
copy, `luaworks-src/`, at the functions named above.

**What would falsify it**: a favourites request with a tag in a sync of a Touch through a computer; a
function on a Touch's sync path naming the copy; the list builders reading the tag before the file.

**Calibration.** The six configuration documents are the measured contrast: the engine tags them itself, from
the committed index and with a test for the file in the committed folder (`getResourceList` and the store's
`getEtag`), and in the run all six arrived tagged, five with the full sync's tags and Settings with the hand
over's, `touch-first-sync.test.ts`. The pictures are the predicted one: the screens take a picture's tag
straight from the committed index (`getEtag`, no file read first), so a picture already held should be asked
for tagged. **No recording shows that yet**: the full sync was the first to carry pictures and asked for every
one untagged, as a remote holding none does, and the run stopped before the pictures.

**Sources checked first.** `reference/architectures/harmony-touch/answering-a-sync.md` and
`favourites-and-settings.md`, `tests/harmony_touch/test_harmony_touch_favourites.py` and `test_harmony_touch_host.py`, the
lab's `work/touch-firmware/notes/6.7-preflight.md`, which predicted tagged favourites by reading
`getEtag` without the file read before it, and the run's reads. Logitech's client was not consulted: the
lookup is the remote's, and the client only forwards what the remote asks.

**Width.** One build, 4.15.330, and the Touch's screens, `juniper`, in modes 0 and 1. A hub's sync, mode 3,
copies the favourites into the gathered set first, and is not this. The preview build is not checked.

**Standing.** "Read in the firmware". The image stays in the lab; this file asserts names, orders and
absences and quotes none of the code.
"""
import re
import tempfile
import unittest

import lab
from .test_harmony_touch_activities import prototypes
from .test_harmony_touch_image import UNSQUASHFS, SquashfsReader, members

IMAGE = 'touch_package_production'

SCREENS = 'opt/luadraws/appscommon/'
HARMONY = SCREENS + 'harmony.lua'
FAVOURITES = SCREENS + 'favoritesmanager.lua'
SCREENS_STORE = SCREENS + 'resourcemanager.lua'

ENGINE = 'opt/luaworks/'
WEB = ENGINE + 'tasks/harmonywebservices/'
SYNC = WEB + 'proxy/sync.lua'
RESOURCE = WEB + 'apihandler/resource.lua'
RESPONSE = WEB + 'apihandler/response.lua'
STORE = WEB + 'core/resourcemanager.lua'

#: The three list builders and, for each, the request function that rebuilds the list before reading it.
BUILDERS = {
    'updateContentUser': 'submitContentUserRequest',
    'updateContentDevice': 'submitContentDeviceRequest',
    'updateContentService': 'submitContentServiceRequest',
}


def body(source, name):
    """The text of a top level function, `function` or `local function`, to the next top level one."""
    start = re.search(r'^(?:local )?function %s\(' % re.escape(name), source, re.M)
    if not start:
        raise AssertionError('no function %s' % name)
    end = re.compile(r'^(?:local )?function ', re.M).search(source, start.end())
    return source[start.start():end.start() if end else len(source)]


def in_order(text, *parts):
    """Each part occurs, after the one before it; the positions, for a message."""
    at, found = 0, []
    for part in parts:
        where = text.find(part, at)
        if where < 0:
            return None
        found.append(where)
        at = where + len(part)
    return found


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class AComputersSyncAsksForTheFavouritesUntagged(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        lab.require(IMAGE)
        with tempfile.TemporaryDirectory() as directory:
            reader = SquashfsReader(members(IMAGE)['harmony-image.squashfs'], directory)
            engine = sorted(n for n in reader.names() if n.startswith(ENGINE) and n.endswith('.lua'))
            files = reader.each(sorted(set([HARMONY, FAVOURITES, SCREENS_STORE] + engine)))
        cls.text = {p: files[p].decode('utf-8') for p in (HARMONY, FAVOURITES, SCREENS_STORE)}
        cls.chunks = {p: files[p] for p in engine}

    def functions(self, path):
        """Each function of a compiled engine file as the set of its string constants."""
        return [{c.decode('latin-1') for c in f['constants'] if isinstance(c, bytes)}
                for f in prototypes(self.chunks[path])]

    def one(self, path, *names):
        found = [f for f in self.functions(path) if set(names) <= f]
        self.assertEqual(len(found), 1, '%s in %s' % (names, path.rsplit('/', 1)[1]))
        return found[0]

    # -- the screens --------------------------------------------------------------------------------

    def test_each_favourites_list_builder_reads_the_file_before_the_tag_and_returns_without_it(self):
        favourites = self.text[FAVOURITES]
        for builder in BUILDERS:
            with self.subTest(builder=builder):
                text = body(favourites, builder)
                # The resource name is set first, so the request is built whether or not the file is read.
                found = in_order(text, 'resourceName = resourceName', 'resMgr.getResource(resourceName)',
                                 'return', 'resMgr.getEtag(resourceName)')
                self.assertIsNotNone(found, builder)
                self.assertEqual(text.count('resMgr.getEtag('), 1)

    def test_the_screens_read_a_file_from_the_gathered_set_and_a_tag_from_the_committed_index(self):
        store = self.text[SCREENS_STORE]
        self.assertRegex(store, r'(?m)^local DATA_FOLDER_TEMP = utils\.getDataPath\(\) \.\. "/tmp"$')
        self.assertRegex(store, r'(?m)^local DATA_FOLDER = utils\.getDataPath\(\) \.\. "/resources"$')
        read = body(store, 'getResource')
        self.assertIsNotNone(in_order(read, 'if syncInProgress or syncConflictInProgress then',
                                      'folder = DATA_FOLDER_TEMP', 'else', 'folder = DATA_FOLDER'))
        tag = body(store, 'getEtag')
        self.assertIn('indexCache[resourceName]', tag)
        self.assertNotIn('DATA_FOLDER', tag, 'the tag is the committed index entry, whichever set is read')
        # A sync start resets the store and then marks the sync running, so every later read is of the set.
        self.assertIsNotNone(in_order(body(store, 'syncStart'), 'init()', 'syncInProgress = true'))

    def test_the_screens_mark_the_sync_running_before_they_ask_for_any_favourites(self):
        callback = body(self.text[HARMONY], 'syncCallback')
        self.assertIsNotNone(in_order(callback, 'result.status == "0"', 'resMgr.syncStart()',
                                      'result.status == "200"', 'self:submitContentUserRequest()'))

    def test_each_favourites_request_rebuilds_the_list_before_taking_a_tag_from_it(self):
        harmony = self.text[HARMONY]
        for request, tag in (('submitContentUserRequest', 'etag = cuInfo.etag'),
                             ('submitContentDeviceRequest', 'favMgr.getContentDeviceInfoList()'),
                             ('submitContentServiceRequest', 'etag = csInfo.etag')):
            with self.subTest(request=request):
                self.assertIsNotNone(in_order(body(harmony, request), 'favMgr.init()', tag))
        # The device list hands each request the tag its builder stored.
        self.assertIn('etag = device.etag', body(self.text[FAVOURITES], 'getContentDeviceInfoList'))

    def test_the_screens_own_copy_of_the_favourites_runs_only_where_none_is_then_asked_for(self):
        harmony = self.text[HARMONY]
        callers = [n for n in re.findall(r'(?m)^function ([\w.:]+)\(', harmony)
                   if 'self:copyContentResource()' in body(harmony, n)]
        self.assertEqual(callers, ['syncCallback'])
        callback = body(harmony, 'syncCallback')
        # The copy, the finish and a return, all before the request the other branch makes.
        self.assertIsNotNone(in_order(callback, 'self:copyContentResource()', 'self:sendProxyFinished()',
                                      'return', 'self:submitContentUserRequest()'))

    def test_a_pictures_tag_is_read_from_the_index_with_no_file_read_first(self):
        # The calibration: the same screens take a station logo's tag straight from the index, so a
        # picture is asked for tagged, as the recordings show.
        popular = body(self.text[HARMONY], 'submitPopularImageRequest')
        self.assertIn('etag = resMgr.getEtag(v.station.id)', popular)
        self.assertNotIn('getResource', popular)

    # -- the engine ---------------------------------------------------------------------------------

    def test_only_the_hubs_sync_copies_the_favourites_into_the_gathered_set(self):
        naming = sorted(p for p, chunk in self.chunks.items() if b'copyContentIndexAndSource' in chunk)
        self.assertEqual(naming, [STORE, SYNC])
        copying = [f for f in self.functions(SYNC) if 'copyContentIndexAndSource' in f]
        self.assertEqual(len(copying), 1)
        # That one function is the hub's: it relogs in to the service and names the hub's own sync.
        self.assertTrue({'Unable to relogin:', 'syncPimentoAll'} <= copying[0])
        # The function a computer's sync, mode 0 or 1, dispatches to names both sync kinds and no copy.
        computer = self.one(SYNC, 'syncOfflineAll', 'syncConflictOfflineAll',
                            'Invalid - neither sync nor syncConflict in progress')
        self.assertNotIn('copyContentIndexAndSource', computer)

    def test_a_computers_sync_queues_the_screens_tag_with_no_lookup_of_its_own(self):
        handler = self.one(RESOURCE, 'requests', 'contentCallback', 'pushBack')
        self.assertIn('etag', handler)
        self.assertNotIn('getEtag', handler)
        # The control: the hub's resource handler in the same file does look a tag up.
        self.assertTrue(any('getEtag' in f for f in self.functions(RESOURCE)))

    def test_a_304_of_a_favourites_document_copies_the_committed_copy_and_needs_a_tag_on_the_answer(self):
        callback = self.one(SYNC, '^ContentService', 'Insufficient parameters in the Response (etag)')
        self.assertTrue({'304', '404', 'copyResource', 'saveResource'} <= callback)
        self.assertNotIn('getEtag', callback, 'the callback compares no tag with the stored one')
        # The single copy names its two folders and copies with no test that the file is there, where the
        # favourites copy of the hub's sync tests each file first.
        single = [f for f in self.functions(STORE) if 'copyFile' in f and 'ContentUser' not in f]
        self.assertEqual(len(single), 1)
        self.assertTrue({'resources', 'tmp'} <= single[0])
        self.assertNotIn('fileExists', single[0])
        self.assertIn('fileExists', self.one(STORE, 'copyFile', 'ContentUser'))

    def test_an_answer_that_fails_its_callback_aborts_unless_it_is_a_pictures(self):
        write = self.one(RESPONSE, 'pop', 'callback', 'responses')
        self.assertTrue({'^http', '^content%-image://'} <= write)
        self.assertFalse(any(c.startswith('^content://') or c.startswith('content://') for c in write),
                         'no favourites scheme is exempt')
        # The 404 the status check allows is the user's favourites alone.
        status = self.one(RESPONSE, '404', 'content://1.0/user')
        self.assertNotIn('content://1.0/device', status)


if __name__ == '__main__':
    unittest.main()
