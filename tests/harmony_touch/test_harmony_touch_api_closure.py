#!/usr/bin/env python3
"""The Harmony Touch's API as a whole: every request its engine registers is on exactly one page of
`reference/architectures/harmony-touch/api/`, no page names a request the engine does not register, the
overview indexes every page, and the overview's two shared rules that no page's own test holds, the shape of
an answer on the cable and the names handed back to the native program.

**The question** was one closure over the API pages: two agents wrote seven pages
for the software layer, `setup.md`, `proxy.md`, `connect.md` and `system.md` (held by
`test_harmony_touch_api_setup.py`) and `engine.md`, `activityengine.md` and `automation.md` (held by
`test_harmony_touch_api_engine.py`), each test holding its own pages against its own groups. Neither can see a
request that falls between the two sets of groups, or one listed on a page of the other set. This file reads
the registrations once and holds all seven pages against them together.

**How the registrations are read.** By `registrations` from `test_harmony_touch_api_engine.py`, imported and not
copied: it walks the one function of `tasks/apilistener.lua` in the production package 4.15.330 with
`prototypes` from `test_harmony_touch_activities.py` and takes each `registerMessage` call's name, module,
handler and verifiers from the instructions. The setup test reads the same names a second way, as the
listener's string constants holding a dot; both give 120, which is a check of each by the other, and the
count is asserted here. **A page's table is the one whose header's first cell is `request`**, and its rows are
the names in that first cell; every page has exactly one such table, which is asserted, so a second table of
requests on a page cannot hide a name.

**What it settles.** 120 registered names, each on exactly one page (24, 7, 19, 22, 31, 3 and 14), and no row
on any page that is not registered; the overview's sentence of those counts equals them; the overview's index
names every page in the folder and nothing else. **Two rules of the overview read in the image here**,
because no page's test holds them: the cable connector's answer function (`sendResponse` in
`connectserver/transport/halhttpserverconnector.lua`) builds the long form answer from `mime`, `errorCode`,
`errorMessage` and `result` and the short form from `code` and `data`, behind a web status line that is always
200; and the dispatcher (`processMessage` in `connectserver/core/engine.lua`), on a name with no handler,
asks the bus module whether to hand it to the native program, whose list (`tasks/hal/core/hbus.lua`) is the
six prefixes `bthid.`, `ir.`, `rf.`, `sys.`, `wifi.` and `hid.`, and gives such a request the default check
alone; any other name is answered 500. **Read, not asserted**: that `canForwardToHal` matches the patterns
anywhere in the name, unanchored, and that a forwarded name goes out by the bus's `command`; and what the
native program does with a name handed to it is not read at all.

**Negative results recorded.** No registered name falls outside the seven pages, and none is on two: the
`harmony.firmware` twins of `setup.firmware` are on `system.md` only, their sections there linking setup's.

**The controls.** Each a string replacement in a page or in this file, run, and reversed with the file's
`SHA-256` compared before and after. Three edit a table, and each failed both the closure and that page's
count, which is the pair they aim at: a request's row removed from `proxy.md`; a row of `engine.md` copied
into `system.md`'s table, a name on two pages; a request name the engine does not register added to
`automation.md`'s table. Four failed exactly the one test they aimed at: the overview's count of the
engine's page changed from 31 to 30; a page dropped from the overview's index; `errorMessage` asked of the
answer function as `errorMsg`; and `wifi%.` asked of the bus module as `wlan%.`.

**Sources checked first.** The seven pages and `api/README.md`; `test_harmony_touch_api_setup.py` and
`test_harmony_touch_api_engine.py`, whose readers this file imports; the decompiled engine in the private
working copy for the connector, the dispatcher and the bus module. Logitech's client was not consulted: the
question is what the remote registers.

**Width.** One build, the production 4.15.330 image, which serves every skin its descriptor names. The hubs
run a sibling image, not read.

**Standing.** Read in the firmware. Names and counts only; nothing of Logitech's code is quoted.
"""
import os
import re
import tempfile
import unittest

import lab
from .test_harmony_touch_activities import prototypes
from .test_harmony_touch_api_engine import APILISTENER, UNSQUASHFS, registrations
from .test_harmony_touch_image import SquashfsReader, members

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
API = os.path.join(ROOT, 'reference', 'architectures', 'harmony-touch', 'api')

BUILD = 'touch_package_production'
TASKS = 'opt/luaworks/tasks/'
CONNECTOR = TASKS + 'connectserver/transport/halhttpserverconnector.lua'
DISPATCH = TASKS + 'connectserver/core/engine.lua'
BUS = TASKS + 'hal/core/hbus.lua'

#: The seven pages of the software layer and the number of registered requests each holds.
PAGES = {'setup.md': 24, 'proxy.md': 7, 'connect.md': 19, 'system.md': 22, 'engine.md': 31,
         'activityengine.md': 3, 'automation.md': 14}

#: The prefixes the bus module hands back to the native program, as the Lua patterns it holds.
FORWARDED = {b'bthid%.', b'ir%.', b'rf%.', b'sys%.', b'wifi%.', b'hid%.'}

HEADER = re.compile(r'^\| request \|', re.M)
ROW = re.compile(r'^\| `([^`]+)` \|')


def read_page(name):
    with open(os.path.join(API, name), encoding='utf-8') as page:
        return page.read()


def request_tables(text):
    """Each table on a page whose header's first cell is `request`, as the list of names in its rows."""
    tables = []
    for header in HEADER.finditer(text):
        names = []
        for line in text[header.end():].split('\n')[2:]:     # past the header's end and the rule
            if not line.startswith('|'):
                break
            match = ROW.match(line)
            names.append(match.group(1) if match else line)
        tables.append(names)
    return tables


class TheOverviewIndexesEveryPage(unittest.TestCase):
    """The pages themselves, with no image: the overview's index and its count sentence."""

    def test_the_index_names_every_page_in_the_folder_and_nothing_else(self):
        readme = read_page('README.md')
        index = readme.split('## The pages', 1)[1].split('\n## ', 1)[0]
        listed = re.findall(r'^\| \[([\w.]+)\]\(\1\) \|', index, re.M)
        self.assertEqual(sorted(listed), sorted(n for n in os.listdir(API) if n != 'README.md'))
        self.assertEqual(set(PAGES) | {'names.md'}, set(listed))

    def test_each_page_has_exactly_one_table_of_requests(self):
        for page in PAGES:
            with self.subTest(page=page):
                self.assertEqual(len(request_tables(read_page(page))), 1)

    def test_the_overviews_counts_are_the_pages(self):
        readme = read_page('README.md')
        sentence = re.search(r'\*\*The engine registers (\d+) requests.*?\*\*: (.*?) with no', readme, re.S)
        counts = [int(n) for n in re.findall(r'(\d+)\s+on\b', sentence.group(2))]
        self.assertEqual(int(sentence.group(1)), sum(PAGES.values()))
        self.assertEqual(counts, list(PAGES.values()))


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheImage(unittest.TestCase):
    """The listener, the cable connector, the dispatcher and the bus module of the production engine."""

    _read = None

    @classmethod
    def setUpClass(cls):
        lab.require(BUILD)
        if TheImage._read is None:
            with tempfile.TemporaryDirectory() as directory:
                reader = SquashfsReader(members(BUILD)['harmony-image.squashfs'], directory)
                TheImage._read = reader.each([APILISTENER, CONNECTOR, DISPATCH, BUS])
        cls.files = TheImage._read
        cls.registered = registrations(cls.files[APILISTENER])

    def function_with(self, path, *texts):
        wanted = {t.encode() for t in texts}
        found = [{c for c in f['constants'] if isinstance(c, bytes)} for f in prototypes(self.files[path])]
        found = [f for f in found if wanted <= f]
        self.assertEqual(len(found), 1, '%s in %s' % (texts, path))
        return found[0]


class EveryRequestIsOnExactlyOnePage(TheImage):
    """5.2.4: the 120 registrations against the seven tables, both ways."""

    def test_the_engine_registers_120_requests(self):
        self.assertEqual(len(self.registered), 120)

    def test_each_registered_request_is_on_exactly_one_page(self):
        where = {}
        for page in PAGES:
            for name in request_tables(read_page(page))[0]:
                where.setdefault(name, []).append(page)
        self.assertEqual({n: p for n, p in where.items() if len(p) > 1}, {}, 'on two pages')
        self.assertEqual(sorted(set(self.registered) - set(where)), [], 'registered and on no page')
        self.assertEqual(sorted(set(where) - set(self.registered)), [], 'on a page and not registered')

    def test_each_page_holds_its_count(self):
        for page, count in PAGES.items():
            with self.subTest(page=page):
                rows = request_tables(read_page(page))[0]
                self.assertEqual(len(rows), count)
                self.assertTrue(set(rows) <= set(self.registered))


class TheAnswerOnTheCable(TheImage):
    """The overview's answer shape: the cable connector's answer function, by the names it holds."""

    def test_the_answer_has_a_long_form_a_short_form_and_a_status_line_of_200(self):
        answer = self.function_with(CONNECTOR, 'HTTP/1.1 200 OK')
        self.assertTrue({b'id', b'mime', b'errorCode', b'errorMessage', b'result', b'null', b'code', b'data',
                         b'/', b'Content-Length: '} <= answer)
        # The control: the status line is the only one the function holds, so no other status reaches it.
        self.assertFalse(any(c.startswith(b'HTTP/1.1 ') and c != b'HTTP/1.1 200 OK' for c in answer))


class AnUnregisteredNameIsHandedBackToTheNativeProgram(TheImage):
    """The overview's forwarding rule: six prefixes, the default check alone, 500 otherwise."""

    def test_the_bus_module_names_six_prefixes(self):
        main = {c for c in prototypes(self.files[BUS])[0]['constants'] if isinstance(c, bytes)}
        self.assertEqual({c for c in main if c.endswith(b'%.')}, FORWARDED)
        self.assertIn(b'canForwardToHal', main)

    def test_the_dispatcher_forwards_with_the_default_check_and_otherwise_answers_500(self):
        dispatch = self.function_with(DISPATCH, 'canForwardToHal')
        self.assertTrue({b'Default', b'500', b'Invalid command no handler', b'lower', b'([%w.]+)'} <= dispatch)
        # The control: the registration function, which also names the default check, does not forward.
        self.assertNotIn(b'canForwardToHal', self.function_with(DISPATCH, 'registerMessage: Wrong type for params'))


if __name__ == '__main__':
    unittest.main()
