#!/usr/bin/env python3
"""Rules about the toolchain itself, which is the one part of this repository nothing else checks.

Every other test here asserts something about a remote. These assert something about the checking:
that no source directory has fallen outside the project that is supposed to typecheck it, that
pyright is pointed at the Python and away from the TypeScript, and that the library's modules all
import.

They exist because of a bug found on 12 August 2026 while wiring up the two language servers.
`packages/codec/tsconfig.json` listed `src` and `test` and not `bin`, alone among the packages that
have a `bin`, so the nine scripts behind `make coverage`, `make reading` and the rest were
typechecked by nothing at all and an editor gave them default compiler options. Nothing failed. A
file no project claims does not announce itself, which is exactly the shape a test is for.
"""
import ast
import glob
import io
import json
import os
import re
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The library, so the import test below can reach it when this file is run on its own. Every other
# test here gets it from `import lab`, and this one has no reason to touch the lab.
sys.path.insert(0, os.path.join(ROOT, 'src'))

#: Directories of TypeScript in a package, all of which a `tsconfig.json` must include when present.
#: `bin` is here because of the bug in the module docstring, and `web` is not: it is a browser page,
#: served as it is, and `packages/bench` deliberately has no DOM types so that a server file cannot
#: reference `window` and typecheck.
SOURCE_DIRECTORIES = ('src', 'test', 'bin')


def read_repo_file(relative):
    """A repository file as text. One copy, because three static rules here read source the same way."""
    with open(os.path.join(ROOT, relative), encoding='utf-8') as handle:
        return handle.read()


def read_jsonc(path):
    """A tsconfig with its comments stripped. Only whole line comments, which is all these use."""
    with open(path, encoding='utf-8') as fh:
        body = ''.join('' if line.lstrip().startswith('//') else line for line in fh)
    return json.loads(body)


class TypeScriptProjects(unittest.TestCase):
    def packages(self):
        base = os.path.join(ROOT, 'packages')
        for name in sorted(os.listdir(base)):
            config = os.path.join(base, name, 'tsconfig.json')
            if os.path.isfile(config):
                yield name, os.path.join(base, name), read_jsonc(config)

    def test_every_directory_of_typescript_is_inside_its_own_project(self):
        """The bug this file exists for: a directory of scripts that no tsconfig includes."""
        found = 0
        for name, path, config in self.packages():
            globs = config.get('include', [])
            for directory in SOURCE_DIRECTORIES:
                if not os.path.isdir(os.path.join(path, directory)):
                    continue
                found += 1
                with self.subTest(package=name, directory=directory):
                    self.assertIn(f'{directory}/**/*.ts', globs,
                                  f'packages/{name}/{directory} is outside its own tsconfig, so it '
                                  f'is typechecked by nothing and an editor gives it defaults')
        # A guard on the guard: if the packages ever move, this test must fail rather than pass by
        # having found nothing to check. Exact, not a floor of 12, per section 143: the number is
        # decided by the workspace layout and moves only when a package or a directory is added,
        # and then it moves in the diff rather than being absorbed.
        self.assertEqual(found, 20, 'source directories claimed by a tsconfig')

    def test_the_root_project_references_every_package(self):
        """`make ts` builds the root, so a package missing from it is a package nobody compiles."""
        root = read_jsonc(os.path.join(ROOT, 'tsconfig.json'))
        referenced = {os.path.basename(r['path']) for r in root.get('references', [])}
        self.assertEqual(referenced, {name for name, _, _ in self.packages()})


class PyrightConfiguration(unittest.TestCase):
    """The configuration, not pyright: `make pyright` runs the tool and skips without it."""

    def setUp(self):
        self.config = read_jsonc(os.path.join(ROOT, 'pyrightconfig.json'))

    def test_it_checks_the_python_and_ignores_the_typescript_workspace(self):
        self.assertEqual(sorted(self.config['include']), ['bin', 'src', 'tests', 'tools'])
        self.assertIn('packages', self.config['exclude'])

    def test_the_sys_path_directories_are_on_its_search_path(self):
        """The tools and the tests import each other after adding their own directory to sys.path.

        Pyright cannot see that, so without `extraPaths` it reports six unresolved imports that all
        resolve at runtime. Those are the ones a real missing import would hide behind.
        """
        for directory in ('src', 'tools', 'tests'):
            self.assertIn(directory, self.config['extraPaths'])

    def test_every_rule_it_silences_says_what_it_costs(self):
        """A rule turned off with no reason is a rule somebody turns back on and then ignores.

        The convention is a comment above each `"none"` naming the count it produced, so the next
        person deciding does not have to measure again. This checks the comment exists, which is the
        mechanical half; whether the number is still right is a matter for whoever raises the level.
        """
        with open(os.path.join(ROOT, 'pyrightconfig.json'), encoding='utf-8') as fh:
            lines = [line.strip() for line in fh]
        silenced = [n for n, line in enumerate(lines) if re.match(r'"report\w+": "none",?$', line)]
        # Exact: four rules are silenced, and a fifth appearing is a decision somebody has to make
        # rather than a number this test should absorb.
        self.assertEqual(len(silenced), 4, 'the silenced rules moved, so check this still fits')
        for at in silenced:
            with self.subTest(rule=lines[at]):
                above = ' '.join(lines[max(0, at - 6):at])
                self.assertRegex(above, r'//.*\d', 'no comment above it naming what it costs')


#: Which package provides each language server binary a `.lsp.json` may name. Written out rather than
#: read off `node_modules`, so this test says something in a fresh clone that has never installed.
SERVER_PACKAGES = {
    'typescript-language-server': 'typescript-language-server',
    'pyright-langserver': 'pyright',
}


class LanguageServers(unittest.TestCase):
    """Both servers must be the workspace's own pinned copies rather than the machine's.

    A server on `PATH` is whatever version that machine happens to hold, and for pyright that
    decides which diagnostics exist at all: an upgrade can turn `make pyright` from zero errors into
    a dozen with no line of code changed. So each `.lsp.json` names a path inside `node_modules` and
    the package behind it is pinned exactly, and this is what stops the two halves of that drifting
    apart, a plugin left pointing at a dependency somebody removed.
    """

    def configurations(self):
        base = os.path.join(ROOT, '.claude', 'skills')
        for name in sorted(os.listdir(base)):
            path = os.path.join(base, name, '.lsp.json')
            if os.path.isfile(path):
                with open(path, encoding='utf-8') as fh:
                    yield name, json.load(fh)

    def test_each_server_runs_the_workspace_copy_and_not_the_machine_one(self):
        found = 0
        for plugin, servers in self.configurations():
            for server, spec in servers.items():
                found += 1
                with self.subTest(plugin=plugin, server=server):
                    command = spec['command']
                    prefix = '${CLAUDE_PROJECT_DIR}/node_modules/.bin/'
                    self.assertTrue(command.startswith(prefix), f'{command} is not the pinned copy')
                    self.assertIn(command[len(prefix):], SERVER_PACKAGES)
                    self.assertEqual(spec['workspaceFolder'], '${CLAUDE_PROJECT_DIR}')
        self.assertEqual(found, 2, 'expected the TypeScript and the pyright server, and no others')

    def test_the_package_behind_each_server_is_pinned_exactly(self):
        with open(os.path.join(ROOT, 'package.json'), encoding='utf-8') as fh:
            pinned = json.load(fh)['devDependencies']
        for _, servers in self.configurations():
            for spec in servers.values():
                package = SERVER_PACKAGES[spec['command'].rsplit('/', 1)[1]]
                with self.subTest(package=package):
                    self.assertIn(package, pinned, 'a server points at a dependency nobody installs')
                    self.assertRegex(pinned[package], r'^\d+\.\d+\.\d+$', 'not an exact version')


class TheLibraryImports(unittest.TestCase):
    def test_every_module_under_harmony_imports(self):
        """What the removed `__all__` was pretending to state, made true and checked.

        `src/harmony/__init__.py` used to carry `__all__` naming four of its submodules, which only
        ever affected `from harmony import *`, which nothing does, and which was three modules out of
        date. Importing each one is the check it looked like it was making.
        """
        import importlib
        base = os.path.join(ROOT, 'src', 'harmony')
        names = sorted(f[:-3] for f in os.listdir(base)
                       if f.endswith('.py') and not f.startswith('__'))
        names += ['pic18.' + f[:-3] for f in sorted(os.listdir(os.path.join(base, 'pic18')))
                  if f.endswith('.py') and not f.startswith('__')]
        self.assertEqual(len(names), 11, 'the modules under src/harmony, pic18 included')
        for name in names:
            with self.subTest(module=name):
                self.assertIsNotNone(importlib.import_module('harmony.' + name))


class TheRunnerSeesEveryTest(unittest.TestCase):
    """A `unittest.main()` that is not the last thing in its file hides everything below it.

    `unittest.main()` collects from the module's globals at the moment it runs, so a class defined
    after the call does not exist yet and is never collected. `make test` uses discovery and is
    unaffected, which is why this went unnoticed: the trap is for a person verifying a change the
    way each file's own `__main__` block invites.

    Found on 13 August 2026 in four files. `test_usb_firmware.py` ran 80 of its 125 tests and
    printed OK, with nine classes below the block including every one section 94 onward added;
    `test_concordance_notes.py` ran 12 of 27, hiding the class its own docstring says must run in a
    fresh clone; `test_documents.py` ran 4 of 9, hiding the phrase check over the real tree; and
    `test_findings.py` ran 70 of 80. **Three of those four came out of a review sweep and the
    fourth came out of writing this test**, which is the argument for having it rather than for
    having fixed the three.
    """

    def _test_files(self):
        return sorted(glob.glob(os.path.join(ROOT, 'tests', 'test_*.py')))

    def test_a_main_block_is_the_last_thing_in_its_file(self):
        files = self._test_files()
        # The population, so a glob that stops matching fails here rather than passing quietly.
        # Exact, since a test file is added deliberately and rarely, unlike a test function.
        self.assertEqual(len(files), 28, 'the Python test files')
        with_block = 0
        for path in files:
            with open(path, encoding='utf-8') as handle:
                lines = handle.read().splitlines()
            at = [i for i, line in enumerate(lines) if line.startswith('if __name__')]
            if not at:
                continue          # two files have none, which is also fine
            with_block += 1
            hidden = [line.split('(')[0] for line in lines[at[0] + 1:]
                      if line.startswith('class ') or line.startswith('def ')]
            self.assertEqual(hidden, [],
                             '%s calls unittest.main() at line %d and defines %d thing(s) below '
                             'it, which running the file directly will not see: %s'
                             % (os.path.basename(path), at[0] + 1, len(hidden), ', '.join(hidden)))
        # And the check has teeth only if most files actually carry a block. Exact: 23 of the 25 do,
        # and the two that do not are named in the comment above rather than left to a tolerance.
        self.assertEqual(with_block, 26,
                         'files carrying a __main__ block, of %d' % len(files))


#: Test functions whose whole body is a loop that loads its samples inside a `subTest`, with no
#: `lab.require` up front, counted per file. **Empty, and it should stay that way.** It was frozen at
#: 55 across eight files for the length of one commit, on the reasoning that converting them all was
#: a decision about the whole suite; measuring the conversion is what changed that, since every one
#: of the 55 turned out to be the same edit, `lab.require` with the names the loop already iterates
#: over. The dict survives as the place to record a deliberate exception with its reason, rather than
#: as a backlog. Either direction fails, so an exception has to be written down here to pass.
SAMPLE_LOOPS_WITHOUT_A_STATED_POPULATION = {}


def _lab_calls(node, attributes):
    """Every `lab.<attribute>(...)` call anywhere inside `node`."""
    return [n for n in ast.walk(node)
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute)
            and n.func.attr in attributes
            and isinstance(n.func.value, ast.Name) and n.func.value.id == 'lab']


def _is_subtest(node):
    return isinstance(node, ast.With) and any(
        isinstance(item.context_expr, ast.Call)
        and isinstance(item.context_expr.func, ast.Attribute)
        and item.context_expr.func.attr == 'subTest' for item in node.items)


class ASampleLoopStatesItsPopulation(unittest.TestCase):
    """A test whose samples are loaded inside a `subTest` shrinks silently on a partial lab.

    `subTest` catches a `SkipTest` and lets the loop finish, so a missing sample skips that one
    iteration and the test as a whole reports as a pass. The claim in its title then covers whatever
    happened to be present. `make test-nolab` cannot see this by construction: it looks for
    failures, and a test that skips every iteration and asserts nothing passes.

    Found on 13 August 2026 in `test_flash_journal.py`, and measured rather than argued: with a lab
    holding only the Harmony 700 image, `test_three_images_carry_an_identification_table` reported
    OK having read one image of three, and `test_the_architectures_without_serial_flash_have_no_table`
    reported OK having asserted nothing at all about the Harmony One (arch 12) or the Harmony 525
    (arch 9), which is the negative the whole arch 14 scoping rests on.

    The cure is `lab.require(*NAMES)` at the top of the function, which skips the whole test. All 55
    that had the shape carry it now, in eight files, and the conversion is why the frozen dict above
    is empty: each one wanted the names its own loop already iterates over, so what looked like a
    suite wide judgement call was 55 copies of one edit.

    Removing 34 dead `if <sample> is None` arms came with it. `lab.load` raises `SkipTest` and never
    returns `None`, so those were unreachable, and an unreachable guard is worse than none: it reads
    as protection. Four of them were not dead, because the `lab.load` call inside the condition was
    itself what raised, and those became `lab.require` rather than being deleted.

    **This is the cheap half and not the whole check.** A static rule cannot see a loop whose loading
    happens inside a helper, which is how `TestTheLogArea.test_every_container_declares_one` passed
    both this and its own review. `make test-partial` is the other half: it runs the suite against a
    lab holding one sample and fails on any test that reports successful with a subtest skipped, no
    matter what shape it has. Keep both, because the runtime one needs a real lab and this one does
    not.
    """

    def _offenders(self):
        counted = {}
        scanned = 0
        for path in sorted(glob.glob(os.path.join(ROOT, 'tests', 'test_*.py'))):
            with open(path, encoding='utf-8') as handle:
                tree = ast.parse(handle.read())
            for function in [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]:
                if not function.name.startswith('test'):
                    continue
                scanned += 1
                if _lab_calls(function, ('require',)):
                    continue                      # the population is stated, which is the cure
                body = [s for s in function.body
                        if not (isinstance(s, ast.Expr) and isinstance(s.value, ast.Constant))]
                # The loop has to be the last statement, with nothing above it that asserts or
                # loads, so a local import or a literal of expected values may sit there. Demanding
                # the loop be the *only* statement missed seven tests of exactly this shape, which
                # `make test-partial` then found at runtime.
                if not body or not isinstance(body[-1], ast.For):
                    continue
                if not all(isinstance(s, (ast.Import, ast.ImportFrom, ast.Assign, ast.AnnAssign))
                           for s in body[:-1]):
                    continue
                subtests = [n for n in ast.walk(body[-1]) if _is_subtest(n)]
                if subtests and any(_lab_calls(n, ('load', 'path')) for n in subtests):
                    counted.setdefault(os.path.basename(path), []).append(function.name)
        return counted, scanned

    def test_every_sample_loop_states_its_population_up_front(self):
        counted, scanned = self._offenders()
        # A guard on the guard: if the glob or the AST walk stops matching, fail here rather than
        # reporting a clean tree, which is the failure mode this whole class is about.
        #
        # **Deliberately a bound and not the count**, which is the one exception section 143 argues
        # for: the population is every test function in the repository, 832 of them, and it grows
        # with any unrelated commit that adds a test. An exact number here would be updated
        # mechanically every few days, and a number nobody reads while changing it has stopped
        # being a measurement. The two neighbouring populations, test files and TypeScript test
        # files, are exact because adding one of those is a deliberate act.
        self.assertGreater(scanned, 600, 'only %d test functions scanned' % scanned)
        self.assertEqual(
            {name: len(found) for name, found in counted.items()},
            SAMPLE_LOOPS_WITHOUT_A_STATED_POPULATION,
            'these tests load a sample inside a subTest with no lab.require up front, so on a '
            'partial lab each shrinks its own claim to whatever is present and still reports a '
            'pass: %s. Guard each one with lab.require(*NAMES), naming what its loop iterates '
            'over, or record a deliberate exception in the dict above with its reason.'
            % '; '.join('%s: %s' % (name, ', '.join(sorted(found)))
                        for name, found in sorted(counted.items())))


#: TypeScript tests allowed to skip a missing sample inside a loop, with the reason. Both ask which
#: **unit** is attached by matching a live read against whatever dumps are present, so a dump that is
#: absent genuinely means "not identifiable by this one" rather than a claim quietly shrinking, and
#: both callers handle the undefined they end up with.
TYPESCRIPT_LOOPS_ALLOWED_TO_SKIP_A_SAMPLE = {
    'packages/corpus/test/derived-state.test.ts': 1,
    'packages/usb/test/hardware.test.ts': 1,
    # `parseable()` enumerates every name in `IMAGES` and keeps the ones that parse, which is the
    # one loop here whose population is deliberately "whatever the lab holds": it exists to state
    # properties over a wider set than the thirteen pinned samples. What the rule protects against
    # is a claim shrinking in silence, and every caller asserts the count up front instead, so a
    # lab missing a sample fails on that number rather than checking less.
    'packages/codec/test/gspm.test.ts': 1,
    # The same shape and the same reason: the loop asks how many containers declare a method for
    # sending a number, over whatever the lab holds, and the three answers it splits them into are
    # each asserted exactly and their sum is asserted too. So a missing sample moves one of four
    # numbers and fails, rather than shrinking the claim. Section 154.
    'packages/codec/test/numbersender.test.ts': 1,
}


class ATypeScriptSampleLoopStatesItsPopulation(unittest.TestCase):
    """The TypeScript half of `ASampleLoopStatesItsPopulation`, and it had the sharper version of it.

    `const data = load(name); if (data === undefined) continue;` inside a loop is the same defect:
    a lab missing one sample checks the rest and reports a pass. What made it worse here is that 52
    of the 57 sites sat in tests already guarded with `skipWithoutLab()`, which exists precisely so
    that a **present but incomplete** lab fails loudly rather than skipping, per its own docstring in
    `packages/lab`. So the guard said "fail if a sample is missing" and the body said "carry on", and
    the body won every time.

    `require_` is the fix and it already existed, unused, documented for exactly this. Measured on
    13 August 2026 with one config removed from the lab: `packages/codec`'s tests went from 17
    failures to 53, so 36 tests had been passing on evidence they did not have.

    A test with no guard at all is an ordinary claim about named samples and gets `skipUnless`
    instead, which skips. Both are correct; which one applies is decided by whether the claim is
    about the corpus.

    This is a text rule rather than an AST one because the two lines are adjacent by construction,
    and because a Python test can read TypeScript without adding a parser dependency to this side.
    It cannot see a loop that loads through a helper, which is how `gspm.test.ts`'s `available()` hid
    seven callers behind one function; that one was found by removing a sample and looking.
    """

    PATTERN = re.compile(r'^\s*const (\w+) = load\(')

    def _offenders(self):
        counted, scanned = {}, 0
        for path in sorted(glob.glob(os.path.join(ROOT, 'packages', '*', 'test', '*.ts'))):
            relative = os.path.relpath(path, ROOT)
            with open(path, encoding='utf-8') as handle:
                lines = handle.read().splitlines()
            scanned += 1
            for at, line in enumerate(lines[:-1]):
                match = self.PATTERN.match(line)
                if not match:
                    continue
                guard = r'if \(%s === undefined\) (continue|return);' % match.group(1)
                if re.match(guard, lines[at + 1].strip()):
                    counted.setdefault(relative, []).append(at + 1)
        return counted, scanned

    def test_no_test_skips_a_missing_sample_inside_a_loop(self):
        counted, scanned = self._offenders()
        self.assertEqual(scanned, 47, 'the TypeScript test files, as ABoundOnACorpusTotalIsExact counts them')
        self.assertEqual(
            {name: len(lines) for name, lines in counted.items()},
            TYPESCRIPT_LOOPS_ALLOWED_TO_SKIP_A_SAMPLE,
            'these load a sample and skip the iteration when it is absent, so an incomplete lab '
            'shrinks the claim and still reports a pass: %s. Use require_(name) and let the test '
            'fail, or skipUnless(...) on the test if the claim is about named samples rather than '
            'the corpus; a deliberate exception goes in the dict above with its reason.'
            % '; '.join('%s:%s' % (name, ','.join(str(n) for n in lines))
                        for name, lines in sorted(counted.items())))


#: Every numeric lower bound left in the TypeScript tests, with the reason it is a bound rather than
#: a measurement. A bound is right for three things and wrong for everything else.
#:
#: The three: a claim about **one item** in a loop, where the count genuinely differs per item and
#: "at least one" is the whole claim; a **physical band**, where the point is that the value is in
#: range rather than what it is; and a **consequence** stated beside an exact assertion of the same
#: expression, which is a sentence about what the number means. Anything aggregated over the corpus
#: belongs in the fourth group and gets `assert.equal`.
#:
#: Adding an entry here is a deliberate act with a reason attached, in the same spirit as
#: `HARMONY_ODD_READ_EXPERIMENT` being a named door rather than a source edit.
TYPESCRIPT_BOUNDS_WITH_A_REASON = {
    # Per item: the claim is that the thing is not empty, and its size is a property of the config.
    ('packages/bench/test/bench.test.ts', 'activity.devices.length', '>=', 1): 'per activity',
    ('packages/bench/test/bench.test.ts', 'key.sends', '>=', 1): 'per key',
    ('packages/bench/test/bench.test.ts', 'branching.variants.length', '>', 1): 'per page',
    ('packages/bench/test/bench.test.ts', 'variant.conditions.length', '>=', 1): 'per variant',
    ('packages/bench/test/page.test.ts', 'keys', '>', 1): 'per page the picker landed on',
    ('packages/codec/test/inventory.test.ts', '(one.name as string).trim().length', '>=', 2):
        'per device: a name, not its length',
    ('packages/codec/test/inventory.test.ts', 'one.devices.length', '>=', 1): 'per config',
    ('packages/codec/test/inventory.test.ts', 'key.codes.length', '>=', 1): 'per binding',
    # Per record, and a physical band rather than a total: an infrared carrier is tens of kilohertz,
    # so the pair of bounds is the claim. Section 181, where the count of records is asserted exactly
    # beside it and the one out of band case in the corpus is asserted as a negative.
    ('packages/codec/test/arch10.test.ts', 'hertz !== undefined && hertz', '>', 25000):
        'per record: an infrared carrier band, with the record count exact beside it',
    ('packages/codec/test/render.test.ts', 'variants.length', '>=', 1): 'per page',
    ('packages/codec/test/render.test.ts', 'variants.length', '>', 1): 'per branching page',
    ('packages/codec/test/render.test.ts', 'choice.arms', '>', 1): 'per switch',
    ('packages/codec/test/growth.test.ts', 'one.holders.length', '>', 1):
        'per shared address: what makes it shared, beside an exact count of them',
    ('packages/corpus/test/capabilities.test.ts', '(activityCount(c) ?? 0)', '>=', 1): 'per config',
    ('packages/usb/test/hardware.test.ts', 'new Set(timer).size', '>', 1): 'per remote, live',
    ('packages/usb/test/hardware.test.ts', 'varied.size', '>', 1): 'per remote, live',
    ('packages/usb/test/models.test.ts', 'm.architecture', '>=', 2): 'per model',
    ('packages/silhouettes/test/models.test.ts', 'rocker.keys.length', '>=', 2): 'per rocker',
    # A physical band, where being in range is the claim and the value is hardware's business.
    ('packages/bench/test/bench.test.ts', 'period', '>', 20): 'a repeat interval a finger can feel',
    ('packages/codec/test/actions.test.ts', 'frequency', '>', 200): 'audible, which is the finding',
    ('packages/codec/test/ir.test.ts', '(hertz as number)', '>=', 30_000): 'an infrared carrier',
    ('packages/codec/test/irframe.test.ts', 'largestBit < 2000 && smallestGap', '>', 2000):
        'a bit cell against a frame gap',
    ('packages/codec/test/screen.test.ts', 'code', '>=', 32): 'a printable character',
    ('packages/codec/test/touch.test.ts', '(common[3]?.[1] as number)', '>', 220):
        'a panel row below a 220 pixel display, which is section 125',
    # A consequence, next to an exact assertion of the same expression.
    ('packages/codec/test/actions.test.ts', 'top', '>', 31): 'beside assert.equal(top, 69)',
    ('packages/codec/test/touch.test.ts', 'failures(shift)', '>', 20): 'beside SHIFT_FAILURES',
    # And one rule about prose, where the length is a floor on effort rather than a measurement.
    ('packages/codec/test/edit.test.ts', 'rule.why.length', '>', 40): 'a sentence, not a word',
    ('packages/silhouettes/test/models.test.ts', 'want.why.length', '>', 40):
        'a sentence, not a word',
}


class ABoundOnACorpusTotalIsExact(unittest.TestCase):
    """A floor under a corpus wide total is a fossil of the measurement that was true when it was written.

    Found on 14 August 2026 by measuring all of them. 38 numeric floors stood in 13 TypeScript test
    files, from 20 commits between 5 and 13 August, and the median one sat 53% below the value it was
    guarding. Two are worth naming. `glyphs > 65000` was written when `make text` read 65456, so it
    was tight on the day and is 62% low now that the figure is 170922, which is the fossil.
    `seen > 100_000` was written on 13 August against a population of 170922 that the same commit
    knew, which is the other failure mode: loose from birth. And three of the 38 were introduced by
    the two commits that were sweeping the neighbouring defect, so this is a habit rather than a
    lapse.

    What a floor cannot do is notice a total moving **up**, which is how a double counted sample or a
    reader that stopped deduplicating gets in, and it cannot tell 54 from 227 in a control whose
    magnitude is the evidence.

    The rule is a text scan, like its two neighbours above, so it needs no TypeScript parser on this
    side. A ratio such as `stored > 20 * swappedWins` is not a numeric bound and the pattern
    deliberately does not match it: the right hand side is a measurement, not a literal.
    """

    #: `assert.ok(<expression> >= <number>)`, where the number ends the comparison. `,` closes the
    #: argument, `)` closes the call, `&` continues a compound condition.
    PATTERN = re.compile(r'assert\.ok\((.+?)\s*(>=|>)\s*([0-9][0-9_]*)\s*[,)&]')

    #: One site the scan has to find, so that a pattern which stopped matching fails here rather than
    #: reporting that every file is clean. `top > 31` is deliberate and documented above.
    CONTROL = ('packages/codec/test/actions.test.ts', 'top', '>', 31)

    def _bounds(self):
        found, scanned = {}, []
        for path in sorted(glob.glob(os.path.join(ROOT, 'packages', '*', 'test', '*.ts'))):
            relative = os.path.relpath(path, ROOT)
            scanned.append(relative)
            with open(path, encoding='utf-8') as handle:
                for number, line in enumerate(handle.read().splitlines(), 1):
                    match = self.PATTERN.search(line)
                    if not match:
                        continue
                    value = int(match.group(3).replace('_', ''))
                    if value == 0:
                        continue  # `> 0` is "not empty", which is a claim and not a tolerance
                    site = (relative, ' '.join(match.group(1).split()), match.group(2), value)
                    found.setdefault(site, []).append(number)
        return found, scanned

    def test_the_pattern_still_matches_a_known_bound(self):
        found, scanned = self._bounds()
        self.assertEqual(len(scanned), 47, 'TypeScript test files, which moves when one is added')
        self.assertIn(self.CONTROL, found, 'the pattern matches nothing it should match')

    def test_every_remaining_bound_says_why_it_is_not_a_measurement(self):
        found, _ = self._bounds()
        unexplained = sorted(site for site in found if site not in TYPESCRIPT_BOUNDS_WITH_A_REASON)
        self.assertEqual(
            unexplained, [],
            'these assert a lower bound where the value can be measured, so a total that falls short '
            'of the truth and a total that grows past it both pass: %s. Measure it and use '
            'assert.equal, or add the site to TYPESCRIPT_BOUNDS_WITH_A_REASON above with the reason '
            'it is genuinely a bound.'
            % '; '.join('%s: %s %s %d at line %s'
                        % (site[0], site[1], site[2], site[3], ','.join(str(n) for n in found[site]))
                        for site in unexplained))

    def test_no_reason_is_recorded_for_a_bound_that_has_gone(self):
        """The other direction: an entry left behind after its assertion became exact reads as though
        the exception were still needed, and the next person adds one beside it."""
        found, _ = self._bounds()
        stale = sorted(site for site in TYPESCRIPT_BOUNDS_WITH_A_REASON if site not in found)
        self.assertEqual(stale, [], 'these no longer exist and their reasons should go with them')

    def test_every_reason_is_a_reason(self):
        """Two words at least, which is a shape and not a length: a bound whose reason is `''` or `'x'`
        is an exception nobody has to justify, and that is how an allow-list turns into a bypass."""
        for site, why in TYPESCRIPT_BOUNDS_WITH_A_REASON.items():
            self.assertGreaterEqual(len(why.split()), 2, 'no reason recorded for %s' % (site,))


#: The Python half of `TYPESCRIPT_BOUNDS_WITH_A_REASON`, on the same three grounds, plus one this
#: side has and the other does not: a **churning population**, where the exact number would be
#: rewritten by unrelated work often enough that nobody would read it while changing it.
PYTHON_BOUNDS_WITH_A_REASON = {
    # A physical band.
    ('tests/test_backlight.py', 'CURVE_HIGH_ON_CHARGE / 4', '>', 1023):
        'a ten bit converter, so the scale is what is being ruled out',
    ('tests/test_clock.py', 'per_day / 60', '>', 5):
        'a pair of bounds on a rate, deliberately not a measurement, see the open question',
    ('tests/test_gspm.py', 'gap', '>', 20000):
        'a forward jump of many kilobytes against an off by one',
    # Per item in a loop, where "not one" or "not empty" is the whole claim.
    ('tests/test_ezfile.py', 'len(checkable)', '>=', 1): 'something long enough to search for',
    ('tests/test_ezfile.py', 'len(widths)', '>', 1): 'per body: one chunk would say nothing',
    ('tests/test_gspm.py', 'len(deltas)', '>', 1): 'more than one delta is the exception itself',
    ('tests/test_toolchain.py', 'len(why.split())', '>=', 2):
        'two words, a shape rather than a length, so an empty reason cannot pass',
    # Somebody else's source, whose exact shape is not ours to pin.
    ('tests/test_concordance_notes.py', "body.count('cb(')", '>', 1):
        'upstream libconcord, which may reformat',
    # A churning population, argued at the site.
    ('tests/test_toolchain.py', 'scanned', '>', 600):
        'every test function in the repository, which grows with unrelated work',
}


class APythonBoundOnACorpusTotalIsExact(unittest.TestCase):
    """`ABoundOnACorpusTotalIsExact` for the other language, and the halves were measured together.

    52 floors on the TypeScript side and 41 on this one, section 143, and they were loose in different
    ways. Here: a floor of 100 under key binding counts running from 103 to 883, a floor of 20 under
    screen program counts running from 111 to 6620, a floor of 1000 under a bootloader difference of
    15694. And **fifteen** sat exactly on the value they guarded, four of those on the smallest member of
    a per sample loop, which is the shape that reads as tolerance and has none: tight on one sample and
    up to 39% loose on its neighbour.

    The one ground this side needs and the other does not is a **churning population**. Two of the
    floors here count files or functions that exist rather than samples in a list, and an exact number
    over "every test function in the repository" would be rewritten by any commit that adds a test.
    A number nobody reads while changing it has stopped being a measurement, so the bound stays and
    the argument is written at the site. Its neighbours, the test files and the TypeScript test files,
    are exact because adding one of those is deliberate.

    A comment is skipped, which is insurance rather than a measurement: see the falsifier below, which
    says what actually makes a quoted floor invisible and what it cost to find out.
    """

    PATTERN = re.compile(r'self\.assert(Greater)(Equal)?\(\s*(.+?),\s*([0-9][0-9_]*)\s*[,)]')

    #: One site the scan has to find, so a pattern that stops matching fails here rather than
    #: reporting a clean tree.
    CONTROL = ('tests/test_clock.py', 'per_day / 60', '>', 5)

    def _bounds(self):
        found, scanned = {}, []
        for path in sorted(glob.glob(os.path.join(ROOT, 'tests', 'test_*.py'))):
            relative = os.path.relpath(path, ROOT)
            scanned.append(relative)
            with open(path, encoding='utf-8') as handle:
                for number, line in enumerate(handle.read().splitlines(), 1):
                    if line.strip().startswith('#'):
                        continue
                    match = self.PATTERN.search(line)
                    if not match:
                        continue
                    value = int(match.group(4).replace('_', ''))
                    if value == 0:
                        continue  # `> 0` is "not empty", a claim rather than a tolerance
                    site = (relative, ' '.join(match.group(3).split()),
                            '>=' if match.group(2) else '>', value)
                    found.setdefault(site, []).append(number)
        return found, scanned

    def test_the_pattern_still_matches_a_known_bound(self):
        found, scanned = self._bounds()
        self.assertEqual(len(scanned), 28, 'Python test files, which moves when one is added')
        self.assertIn(self.CONTROL, found, 'the pattern matches nothing it should match')

    def test_every_remaining_bound_says_why_it_is_not_a_measurement(self):
        found, _ = self._bounds()
        unexplained = sorted(site for site in found if site not in PYTHON_BOUNDS_WITH_A_REASON)
        self.assertEqual(
            unexplained, [],
            'these assert a lower bound where the value can be measured, so a total short of the '
            'truth and a total past it both pass: %s. Measure it and use assertEqual, or add the '
            'site to PYTHON_BOUNDS_WITH_A_REASON above with the reason it is genuinely a bound.'
            % '; '.join('%s: %s %s %d at line %s'
                        % (site[0], site[1], site[2], site[3], ','.join(str(n) for n in found[site]))
                        for site in unexplained))

    def test_no_reason_is_recorded_for_a_bound_that_has_gone(self):
        found, _ = self._bounds()
        stale = sorted(site for site in PYTHON_BOUNDS_WITH_A_REASON if site not in found)
        self.assertEqual(stale, [], 'these no longer exist and their reasons should go with them')

    def test_every_reason_is_a_reason(self):
        for site, why in PYTHON_BOUNDS_WITH_A_REASON.items():
            self.assertGreaterEqual(len(why.split()), 2, 'no reason recorded for %s' % (site,))

    def test_a_comment_quoting_a_floor_is_not_read_as_one(self):
        """The scan's own falsifier, and it is narrower than the first version of it claimed.

        `test_gspm.py` explains a floor it removed by quoting it, `assertGreater(total, 10000)`, and a
        looser scan does report that as a live offender: this whole sweep began by finding it that way.
        What makes it invisible here is **two** things, and the first version of this test credited only
        the comment skip. The pattern is anchored on `self.assert`, so a quote written without the
        receiver never matches whatever the scan does with comments. The skip is what covers a comment
        that quotes the whole call, which nothing does today, so it is insurance rather than a
        measurement and this test says so instead of pretending otherwise.
        """
        with open(os.path.join(ROOT, 'tests', 'test_gspm.py'), encoding='utf-8') as handle:
            lines = handle.read().splitlines()
        quotes = [n for n, line in enumerate(lines, 1)
                  if line.strip().startswith('#') and 'assertGreater(total, 10000)' in line]
        self.assertEqual(len(quotes), 1, 'the comment that quotes a removed floor has moved')
        found, _ = self._bounds()
        self.assertEqual([site for site in found if site[0] == 'tests/test_gspm.py'
                          and site[3] == 10000], [], 'the quoted floor was read as a live one')
        # And the receiverless form is why, demonstrated rather than asserted about the comment. The
        # two calls are assembled rather than written out, for the same reason the em-dash check must
        # not contain an em-dash: a test that spells the pattern it scans for becomes an offender in
        # its own report, which this one did on the first attempt.
        call = 'assert' + 'Greater(total, 10000)'
        self.assertIsNone(self.PATTERN.search(call))
        self.assertIsNotNone(self.PATTERN.search('self.' + call))


class TheTwoExpectationTablesNameTheSameContainers(unittest.TestCase):
    """`EXPECTED` in `tests/test_gspm.py` and in `packages/codec/test/gspm.test.ts`, which nothing compared.

    Both tables list containers with their cookie, base address, format version, pointer count and
    marker, and both are the population every container framing claim in their file is asserted over.
    On 14 August 2026 the Python one held 17 names and the TypeScript one 13.

    It surfaced only because section 143's sweep made the corpus span exact on both sides, which put two
    numbers that a pair of floors had been hiding beside each other: 5 distinct base addresses here
    against 4 there, from the same reader on the same corpus. So the lesson is not only that unwatched
    lists drift. **When two lists disagree, the assertion that was letting them is the thing to look
    for.**

    The owner decided the same day that the four belong in both, so this test now asserts equality. What
    widening cost is the interesting part and it was not the data entry: three tests in that file broke
    at once, `the same six base slots are pointer arrays in every config`, the packing agreement and the
    action list parse, because the three added safe mode containers arrived on the user config side of a
    hand written line. All three were right and none had ever been asked about a safe mode container. A
    fourth had to be renamed, since "bar four" became false for a config that packs into four runs rather
    than five. That is four claims whose population was doing the work, found by adding four names.

    Static, like its neighbours, so it runs in a fresh clone with nothing installed.
    """

    def _table(self, relative, declaration, end):
        source = read_repo_file(relative)
        self.assertIn(declaration, source, '%s no longer declares %s' % (relative, declaration))
        body = source[source.index(declaration) + len(declaration):]
        self.assertIn(end, body, '%s: no end to the %s table' % (relative, declaration))
        body = body[:body.index(end)]
        # A key is a name at the start of a line, quoted on the Python side and bare on the other.
        return set(re.findall(r"^\s+'?([a-z0-9_]+)'?:", body, re.M))

    def test_both_tables_name_the_same_seventeen(self):
        python = self._table('tests/test_gspm.py', 'EXPECTED = {', '\n}')
        typescript = self._table('packages/codec/test/gspm.test.ts', 'const EXPECTED', '\n};')
        self.assertEqual(len(python), 17, 'the Python framing table')
        self.assertEqual(len(typescript), 17, 'and the TypeScript one, widened on 14 August 2026')
        self.assertEqual(sorted(python), sorted(typescript),
                         'the two framing populations have drifted apart again')

    def test_the_typescript_side_still_draws_the_user_config_line(self):
        """The widening's real cost, pinned: six of the seventeen are not somebody's configuration, and
        a claim about "every config" means the other eleven. Left implicit, the safe mode containers
        silently join the population that three tests in that file are about."""
        source = read_repo_file('packages/codec/test/gspm.test.ts')
        self.assertIn('const NOT_A_USER_CONFIG', source, 'the line is no longer drawn by name')
        body = source[source.index('const NOT_A_USER_CONFIG'):]
        body = body[:body.index('];')]
        excluded = sorted(set(re.findall(r"'([a-z0-9_]+)'", body)))
        self.assertEqual(excluded, ['h525_safemode_ahcm', 'h600_safemode_gspm', 'h650_safemode_gspm',
                                    'h700_gspm', 'one34_region2', 'one_safemode'],
                         'the non user containers')


class TheTwoFlashBaseAnchorsTakeTheSameInputs(unittest.TestCase):
    """`recover_flash_base` and `recoverFlashBase` are one derivation in two languages.

    They agreed on every container and disagreed about their own inputs: the Python side took an
    `end_addr` it never read, for as long as the anchor has existed. That is a vestige of the
    reading the anchor replaced, `base = end_addr - offset_of_end_marker`, and it is worse than
    dead code because the signature said the declared end is an input to the base, which is
    exactly the circularity the docstring spends four paragraphs refuting.

    Static, so it runs in a fresh clone. It cannot see the two answering differently, which is what
    `packages/codec/test/gspm.test.ts` and `test_gspm.py` do against the corpus; what it can see is
    the interface drifting, which is the state that precedes them answering differently.
    """

    def _source(self, relative):
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', relative)
        with open(path, encoding='utf-8') as fh:
            return fh.read()

    def test_neither_side_takes_the_declared_end(self):
        python = self._source('src/harmony/gspm.py')
        found = re.search(r'def recover_flash_base\(([^)]*)\)', python)
        self.assertIsNotNone(found, 'the Python anchor is no longer called recover_flash_base')
        arguments = [a.split(':')[0].strip() for a in found.group(1).split(',')]
        self.assertEqual(arguments, ['blob', 'addresses'])

        typescript = self._source('packages/codec/src/gspm.ts')
        found = re.search(r'export function recoverFlashBase\(([^)]*)\)', typescript)
        self.assertIsNotNone(found, 'the TypeScript anchor is no longer called recoverFlashBase')
        arguments = [a.split(':')[0].strip() for a in found.group(1).split(',')]
        self.assertEqual(arguments, ['blob', 'addresses'])


class TheCorpusWidePopulationsAgree(unittest.TestCase):
    """Four lists in `packages/codec/test` name the containers a corpus wide claim is made over.

    Nothing compared them, and on 13 August 2026 they disagreed: `edit.test.ts` held eighteen names
    where the other two held nineteen, missing `h525_config_2` alone, so "every container in the
    corpus" meant two different things in two files for as long as that sample had existed. Each
    file's own totals stayed self consistent, which is why no test could see it.

    Static on purpose. It runs in a fresh clone with nothing installed, and the same shape of check
    is why `ASampleLoopStatesItsPopulation` exists in this file rather than in the suite it guards.
    """

    # file -> the declaration whose quoted names are that file's population.
    POPULATIONS = {
        'packages/codec/test/coverage.test.ts': 'const ACCOUNTED',
        'packages/codec/test/emit.test.ts': 'const REBUILT',
        'packages/codec/test/edit.test.ts': 'const ALL_CONTAINERS',
        'packages/codec/test/sections.test.ts': 'const MODE_PROGRAM_CONTAINERS',
        'packages/codec/test/growth.test.ts': 'const SURVEYED',
    }

    def _names(self, relative, declaration):
        source = read_repo_file(relative)
        self.assertIn(declaration, source, '%s no longer declares %s' % (relative, declaration))
        body = source[source.index(declaration):]
        body = body[:body.index('];')]
        return sorted(set(re.findall(r"'([a-z0-9_]+)'", body)))

    #: The known answer samples, which must appear in none of those lists. Three were compiled by
    #: Logitech to a specification we wrote and one is a real setup imported through an account we
    #: hold credentials for, so all four were **authored** rather than found, and a corpus wide total
    #: measures what a reader can read across configs that were found, section 142. Their own byte
    #: accounting and round trip are asserted in `calibration.test.ts` instead, which is where the
    #: gap this list creates gets closed.
    KNOWN_ANSWER = ('calibration_one', 'calibration_h600', 'calibration_favchannels',
                    'one_spare_myharmony', 'calibration_favzero')

    def test_no_corpus_wide_list_holds_a_known_answer_sample(self):
        """Widening one of those lists to include an authored sample has to be deliberate.

        The lists are checked against each other above, so adding a name to all five keeps them
        agreeing and silently changes what every corpus wide total means. This is the check that
        makes that a conversation rather than a passing test suite.
        """
        for relative, declaration in self.POPULATIONS.items():
            names = self._names(relative, declaration)
            for sample in self.KNOWN_ANSWER:
                self.assertNotIn(
                    sample, names,
                    '%s names the authored sample %s, so its corpus wide totals no longer measure '
                    'found configs. If that is intended, say so here and sweep every marked number.'
                    % (relative, sample))

    def test_every_list_names_the_same_containers(self):
        found = {relative: self._names(relative, declaration)
                 for relative, declaration in self.POPULATIONS.items()}
        for names in found.values():
            self.assertEqual(len(names), 19, 'the corpus is nineteen containers')
        first = next(iter(found.values()))
        for relative, names in found.items():
            self.assertEqual(names, first,
                             '%s names a different population: missing %s, extra %s'
                             % (relative, sorted(set(first) - set(names)),
                                sorted(set(names) - set(first))))

    def test_the_python_populations_nest_and_each_exclusion_is_named(self):
        """Section 141: three lists, and which is a subset of which.

        `ALL_CONTAINERS` is every container a per container claim is made over. `CONTAINERS` is the
        narrower population a corpus wide **total** is computed from, and `USER_CONFIGS` is every user
        config. Both are subsets, and this asserts exactly what each leaves out, so that widening one
        without deciding about the other has to fail here rather than pass quietly.

        **The TypeScript lists are checked for equality now**, section 142: they held nineteen where
        `CONTAINERS` held fifteen, and nineteen was decided. That was the one thing section
        141 deliberately left open, because whether two dumps of one remote count twice in a total is
        a decision about the corpus rather than a defect, and a containment check was what permitted
        the two answers to coexist. Equality is what makes them one definition.
        """
        import lab
        allc = set(lab.ALL_CONTAINERS)
        self.assertEqual(len(allc), len(lab.ALL_CONTAINERS), 'no duplicates')
        self.assertEqual(len(allc), 21)
        self.assertLess(set(lab.CONTAINERS), allc)
        # Two names, and both are configs whose coverage figures have never been computed. Widening
        # the totals to them is its own step, with its own reading to check.
        self.assertEqual(sorted(allc - set(lab.CONTAINERS)),
                         ['arch8_config_880', 'arch8_config_885'])
        # The user configs are containers too, bar none: a config read off a remote is a container.
        self.assertLess(set(lab.USER_CONFIGS), allc)
        for relative, declaration in self.POPULATIONS.items():
            names = self._names(relative, declaration)
            self.assertEqual(names, sorted(lab.CONTAINERS),
                             '%s names a different corpus: missing %s, extra %s'
                             % (relative, sorted(set(lab.CONTAINERS) - set(names)),
                                sorted(set(names) - set(lab.CONTAINERS))))

    def test_the_button_map_population_is_every_user_config(self):
        """Section 151: `inventory.test.ts`'s `INVENTORY` table is the user configs, and no other list.

        A fourth population list appeared on 22 August 2026 when section 151's two tests needed every
        user config. Rather than write a fourth literal, they derive it from the `INVENTORY` table that
        file already carries, which is the right move and is exactly the move that needs checking: the
        table is a per sample claim about variables, activities and devices, and nothing said it also
        happened to be the whole user config population. If somebody adds a sample to one and not the
        other, section 151's totals are computed over a different corpus than they claim.
        """
        import lab
        names = self._names('packages/codec/test/inventory.test.ts',
                            'const INVENTORY: readonly [string, number, number, number, number][]')
        self.assertEqual(names, sorted(lab.USER_CONFIGS),
                         'missing %s, extra %s'
                         % (sorted(set(lab.USER_CONFIGS) - set(names)),
                            sorted(set(names) - set(lab.USER_CONFIGS))))
        # And the derivation is still a derivation rather than a literal that drifted back in.
        source = read_repo_file('packages/codec/test/inventory.test.ts')
        self.assertIn('const USER_CONFIGS = INVENTORY.map(([name]) => name);', source,
                      'section 151 stopped deriving its population from the table')

    def test_the_user_config_population_is_the_same_in_both_languages(self):
        """Section 140: `lab.USER_CONFIGS` and the fifteen `irframe.test.ts` asserts over.

        The four lists above are containers, which includes the safe mode ones. The user configs are
        a second population, and there are two copies of it for the same reason there were four of
        the first: the frame closure lives in TypeScript because the frame decoder does, and every
        other claim about a user config is asserted from Python. So they have to be compared, and
        this is the check that says so rather than a paragraph claiming they mirror each other.

        The TypeScript side is `CONTAINERS` minus the two calibration configs, which are synthetic
        and deliberately outside every corpus wide total. Comparing the derived list rather than the
        expression is the point: if somebody adds a name to one side only, the sets differ here.
        """
        import lab
        ts = set(self._names('packages/codec/test/irframe.test.ts', 'const CONTAINERS'))
        ts -= {'calibration_one', 'calibration_h600'}
        self.assertEqual(sorted(ts), sorted(lab.USER_CONFIGS),
                         'missing %s, extra %s'
                         % (sorted(set(lab.USER_CONFIGS) - ts), sorted(ts - set(lab.USER_CONFIGS))))
        self.assertEqual(len(lab.USER_CONFIGS), 15, 'fifteen user configs')


class TheDocumentChecksReadOnlyTrackedFiles(unittest.TestCase):
    """`make facts` is a commit gate, so an untracked file must not be able to hold a commit up.

    Section 185's aside, and it was found by checking a number before quoting it: this tool's own
    count moved by 26 on an unchanged commit, and 26 is exactly how many `fact:` markers `CLAUDE.md`
    carries. An untracked `AGENTS.md` had appeared in the root, a copy of `CLAUDE.md` written for a
    different agent, and every marker in it was being counted twice.

    The count being unreproducible is the cosmetic half. The half with teeth is that the phrase check
    refuses a commit that restates a superseded claim, so the first time somebody sweeps `CLAUDE.md`
    and not the untracked copy beside it, `make facts` blocks the commit over a file that is not in
    the repository. Both directions are asserted below, because a check that stops reading untracked
    files could just as easily stop reading everything.
    """

    def setUp(self):
        self.root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sys.path.insert(0, os.path.join(self.root, 'tools'))

    def _facts(self):
        import importlib
        import facts
        importlib.reload(facts)
        return facts

    def test_an_untracked_document_is_not_read_and_a_tracked_one_is(self):
        import subprocess
        facts = self._facts()
        probe = os.path.join(self.root, 'zz-toolchain-probe.md')
        self.assertFalse(os.path.exists(probe), 'the probe path must be free')
        tracked = None
        try:
            with open(probe, 'w', encoding='utf-8') as fh:
                fh.write('a probe\n')
            self.assertNotIn(probe, set(facts.documents()),
                             'an untracked markdown file is not a published document')
            # And tracked, the same file is read. `git add` is what makes it part of the repository,
            # which is the distinction the check is drawing.
            subprocess.run(['git', 'add', '-f', probe], cwd=self.root, check=True,
                           capture_output=True)
            tracked = probe
            self.assertIn(probe, set(facts.documents()),
                          'a tracked markdown file is a published document')
        finally:
            if tracked is not None:
                subprocess.run(['git', 'rm', '-q', '--cached', tracked], cwd=self.root,
                               check=False, capture_output=True)
            if os.path.exists(probe):
                os.remove(probe)

    def test_the_source_walk_draws_the_same_line(self):
        """The phrase check reads `.ts` and `.py` too, and it is the half that gates a commit."""
        import subprocess
        facts = self._facts()
        probe = os.path.join(self.root, 'zz_toolchain_probe.py')
        self.assertFalse(os.path.exists(probe), 'the probe path must be free')
        tracked = None
        try:
            with open(probe, 'w', encoding='utf-8') as fh:
                fh.write('# a probe\n')
            self.assertNotIn(probe, set(facts.sources()))
            subprocess.run(['git', 'add', '-f', probe], cwd=self.root, check=True,
                           capture_output=True)
            tracked = probe
            self.assertIn(probe, set(facts.sources()))
        finally:
            if tracked is not None:
                subprocess.run(['git', 'rm', '-q', '--cached', tracked], cwd=self.root,
                               check=False, capture_output=True)
            if os.path.exists(probe):
                os.remove(probe)

    def test_the_real_documents_are_still_read(self):
        """The control on the control: narrowing the walk must not empty it."""
        facts = self._facts()
        found = set(facts.documents())
        for name in ('CLAUDE.md', 'README.md', os.path.join('docs', 'findings.md')):
            self.assertIn(os.path.join(self.root, name), found, name)
        sources = set(facts.sources())
        self.assertIn(os.path.join(self.root, 'tools', 'facts.py'), sources)


class CodexAndClaudeCodeShareOneWorkingBrief(unittest.TestCase):
    """Codex falls back to CLAUDE.md instead of carrying a second full brief.

    Codex checks AGENTS.md before its configured fallback names. Its absence is therefore part of
    the setup rather than tidiness: recreating it would shadow CLAUDE.md and let the two agents
    receive different instructions again. The size setting matters too, because the working brief
    is larger than Codex's default project document limit.
    """

    def test_codex_uses_claude_md_and_no_agents_md_can_shadow_it(self):
        self.assertFalse(os.path.lexists(os.path.join(ROOT, 'AGENTS.md')),
                         'AGENTS.md shadows the shared CLAUDE.md brief')
        config = read_repo_file('.codex/config.toml')
        settings = [line.strip() for line in config.splitlines()
                    if line.strip() and not line.lstrip().startswith('#')]
        self.assertEqual(settings, [
            'project_doc_fallback_filenames = ["CLAUDE.md"]',
            'project_doc_max_bytes = 262144',
        ])

    def test_codex_can_read_the_whole_shared_brief(self):
        config = read_repo_file('.codex/config.toml')
        match = re.search(r'^project_doc_max_bytes\s*=\s*(\d+)\s*$', config, re.MULTILINE)
        self.assertIsNotNone(match, 'Codex project document size is not configured')
        limit = int(match.group(1))
        size = os.path.getsize(os.path.join(ROOT, 'CLAUDE.md'))
        self.assertLessEqual(size, limit,
                             'CLAUDE.md is larger than Codex is configured to read')


class TheLabExcavationGridCoversTheWholeSite(unittest.TestCase):
    """Step 9 of the roadmap states the lab as a grid of squares, and a grid that misses a square
    is worse than no grid: it reads as coverage.

    Decision 12 exists because a fact recorded only in the lab is invisible to every check in this
    repository, `make facts` included, since the lab is deliberately outside it. That cannot be
    fixed from in here in general. What **can** be checked from in here is narrower and still worth
    having: that the roadmap's own map of the site names every top level area the lab actually has,
    so a directory nobody has a reason to open cannot appear without the plan of record gaining a
    row for it.

    Skips without a lab, like every other lab backed test.

    **Superseded in scope on 28 August 2026 and kept deliberately.** `reference/lab-register.md`
    exists now and `TheLabRegisterCoversTheSiteAtArtefactLevel` is the check that actually covers the
    site, at artefact granularity. This one is narrower and still has its own claim: the roadmap's
    grid is a **summary**, and a summary is exactly what step 4 of the four places rule says drifts,
    so the plan of record's own map of the site is held against the site here. It is also the cheaper
    of the two and fails with a clearer message when a whole square appears.
    """

    GRID_HEADING = '### Step 9: excavate the lab'

    def _grid_paths(self):
        with io.open(os.path.join(ROOT, 'docs', 'roadmap.md'), encoding='utf-8') as fh:
            text = fh.read()
        start = text.find(self.GRID_HEADING)
        self.assertNotEqual(start, -1, 'step 9 is no longer in the roadmap')
        end = text.find('\n## ', start)
        section = text[start:end if end > 0 else len(text)]
        # Every backticked path in the section, which is how the table names a square.
        return {p.rstrip('/') for p in re.findall(r'`([A-Za-z0-9_.\-]+/[^`]*|[A-Za-z0-9_.\-]+/)`', section)}

    def test_every_top_level_area_of_the_lab_is_named(self):
        lab = os.environ.get('HARMONY_LAB') or os.path.join(os.path.dirname(ROOT), 'lab')
        if not os.path.isdir(lab):
            self.skipTest('no lab directory to compare the grid against')
        named = self._grid_paths()
        present = sorted(d for d in os.listdir(lab)
                         if os.path.isdir(os.path.join(lab, d)) and not d.startswith('.'))
        self.assertTrue(present, 'the lab has no directories, which makes this test vacuous')
        for area in present:
            with self.subTest(area=area):
                covered = any(p == area or p.startswith(area + '/') for p in named)
                self.assertTrue(covered,
                                '%s/ is in the lab and named nowhere in step 9. Add a row saying '
                                'what it is, per decision 12.' % area)


class TheLabRegisterCoversTheSiteAtArtefactLevel(unittest.TestCase):
    """`reference/lab-register.md` is step 9's deliverable, and this is the check the plan promises.

    Two claims, and the second is the one the directory level guard above cannot make.

    Every lab path the register **names** must exist, so a row cannot survive the artefact moving or
    being renamed. And every **second level** directory of the lab must be covered by some row,
    which is the artefact granularity `docs/lab-excavation.md` argues for: the grid check above is
    per square and passed while section 197's own square was already named in it, so passing it
    proved nothing about coverage.

    A catalogue carries no tests, per Danny's rule of 28 August 2026 and the excavation plan's
    opening section. This is not a test of the catalogue's **contents**; it is a test that the
    catalogue's own frame still matches the site. Nothing here asserts a description is right.
    """

    REGISTER = ('reference', 'lab-register.md')
    #: Directories whose children are not artefacts in their own right: build products, a virtual
    #: environment, a cache. Each is named by a row already, and expanding it would add hundreds of
    #: rows that say nothing. Stated so the exclusion is visible rather than silent.
    NOT_EXPANDED = (
        'software/classic', 'work/venv', 'work/myharmony', 'reference/logitech-icons',
        'ghidra', 'golden', 'firmware', 'dumps', 'reads', 'Docs', 'bin', 'reviews',
        'software/MyHarmony', 'software/LogitechHarmonyRemoteSoftware.app',
        'software/harmony-remote-software-8.0', 'software/Harmony Desktop.app',
        'software/desktop-webapp', 'reference/forum-images', 'reference/images',
    )

    def _register(self):
        with io.open(os.path.join(ROOT, *self.REGISTER), encoding='utf-8') as fh:
            return fh.read()

    def _named_paths(self, text):
        """Every backticked path that looks like a lab path, which is how a row names its artefact."""
        found = set()
        # Deliberately no character class escapes: a lab path is anything backticked that contains a
        # slash and starts with a letter, and spelling that with `\w` has already been mangled once
        # by the script that generated this file.
        for match in re.finditer('`([^`]+/[^`]*)`', text):
            path = match.group(1)
            if not path[:1].isalpha() or path.startswith(('docs/', 'packages/')):
                continue  # a repository path, cited for context
            found.add(path)
        return found

    def _lab(self):
        lab = os.environ.get('HARMONY_LAB') or os.path.join(os.path.dirname(ROOT), 'lab')
        return lab if os.path.isdir(lab) else None

    def test_every_path_the_register_names_exists(self):
        lab = self._lab()
        if lab is None:
            self.skipTest('no lab directory to check the register against')
        named = self._named_paths(self._register())
        # Exact, per this file's own rule. It moves in the diff every time a row is added, which is
        # the point: the register growing is the excavation making progress, and a floor here would
        # hide a row being deleted just as readily as it hides a total going the wrong way.
        self.assertEqual(len(named), 64, 'lab paths the register names, as at 29 August 2026')
        for path in sorted(named):
            with self.subTest(path=path):
                if '*' in path:
                    self.assertTrue(glob.glob(os.path.join(lab, path)),
                                    '%s matches nothing in the lab' % path)
                else:
                    self.assertTrue(os.path.exists(os.path.join(lab, path)),
                                    '%s is in the register and not in the lab' % path)

    def test_every_artefact_in_the_lab_has_a_row(self):
        lab = self._lab()
        if lab is None:
            self.skipTest('no lab directory to check the register against')
        named = self._named_paths(self._register())
        covered = {p.rstrip('/') for p in named}

        def is_covered(rel):
            if rel in covered:
                return True
            # A row naming a directory covers what is inside it, and a row naming something inside
            # a square covers the square. Both directions are needed: the register names
            # `dumps/danny/` and never `dumps/` on its own.
            return any(rel.startswith(c + '/') or c.startswith(rel + '/') for c in covered)

        unregistered = []
        for square in sorted(os.listdir(lab)):
            if square.startswith('.') or not os.path.isdir(os.path.join(lab, square)):
                continue
            if not is_covered(square):
                unregistered.append(square)
                continue
            if square in self.NOT_EXPANDED:
                continue
            for child in sorted(os.listdir(os.path.join(lab, square))):
                rel = square + '/' + child
                if child.startswith('.') or not os.path.isdir(os.path.join(lab, rel)):
                    continue
                if rel in self.NOT_EXPANDED or is_covered(rel):
                    continue
                unregistered.append(rel)
        self.assertEqual(unregistered, [],
                         'in the lab and in no register row. Add a row saying what it is and how '
                         'deep anybody has been, per decision 12 and docs/lab-excavation.md.')


class TheRegisterQueryAnswersForThePathThatWasOpened(unittest.TestCase):
    """`tools/lab_register.py` is section 209's instrument, and this is what makes it one.

    The rule it serves has been broken six times, and five of the six fixes were a paragraph telling
    the next session to remember. What changed is that the check is a command, so what has to be
    tested is the property that makes the command worth running: given the path somebody is about to
    open, it prints the rows that bear on it, in **both** directions. An ancestor row is what says
    the square has been surveyed; a **descendant** row is what says one file inside the directory is
    already mined, and the descendant direction is the one that would have stopped section 209.

    This is not a test of the register's contents, which is a catalogue and carries none. It is a
    test of the query, on the register that ships.
    """

    def module(self):
        path = os.path.join(ROOT, 'tools', 'lab_register.py')
        namespace = {'__file__': path, '__name__': 'lab_register_under_test'}
        with io.open(path, encoding='utf-8') as handle:
            exec(compile(handle.read(), path, 'exec'), namespace)  # noqa: S102
        return namespace

    def rows(self):
        module = self.module()
        with io.open(os.path.join(ROOT, 'reference', 'lab-register.md'), encoding='utf-8') as fh:
            return module, module['rows'](fh.read())

    def test_the_register_parses_into_the_rows_the_document_states(self):
        """44 artefacts, exact rather than a floor, so a row lost to a formatting change fails.

        The number is here rather than a `fact:` marker because every producer in `tools/facts.py`
        needs a lab and this one needs only the repository. It is also a correction: `CLAUDE.md` said
        58 for a day, which was a count nothing recomputed, and this is what recomputes it.
        """
        module, rows = self.rows()
        self.assertEqual(len(rows), 44)
        self.assertEqual(len(dict(rows)), 44, 'a duplicated path would make a query ambiguous')
        self.assertNotIn('unseen', dict(rows), 'the status legend is not an artefact')

    def test_a_query_is_answered_by_ancestors_and_by_descendants(self):
        module, rows = self.rows()
        query = module['normalise'](
            'software/classic/src/hidcommands/com/logitech/harmony/hid/commands')
        hits = [path for path, _ in module['covering'](query, rows)]
        self.assertIn('software/classic', hits, 'the square, which is the ancestor direction')
        self.assertIn('software/classic/src', hits, 'and the row that says this layer is mined')

        square = module['normalise']('software/classic')
        under = [path for path, _ in module['covering'](square, rows)]
        self.assertIn('software/classic/PROTOCOL-CONSTANTS.md', under,
                      'the descendant direction, which is what section 209 needed')
        self.assertGreater(len(under), len(hits))

    def test_it_would_have_stopped_section_209(self):
        """The regression, stated as the thing that went wrong rather than as an example.

        The dig opened the commands directory and no check fired. The row that covers it says the
        HID layer is mined and names the extraction to read; asserting that the query surfaces that
        wording is what turns "run the tool" into a claim that can fail.
        """
        module, rows = self.rows()
        query = module['normalise'](
            '../lab/software/classic/src/hidcommands/com/logitech/harmony/hid/commands')
        text = ' '.join(' '.join(cells) for _, cells in module['covering'](query, rows))
        self.assertIn('PROTOCOL-CONSTANTS.md', text)
        self.assertIn('mined', text)

    def test_a_path_the_register_does_not_cover_is_reported_and_not_answered(self):
        """A silent empty answer would read as "nothing known", which is the opposite of the truth
        when the register is simply missing a row."""
        module, rows = self.rows()
        query = module['normalise']('no/such/square')
        self.assertEqual(module['covering'](query, rows), [])

    def test_the_query_accepts_the_three_spellings_a_session_actually_has(self):
        """Absolute, through `../lab`, and already lab relative all normalise to one path, because a
        check nobody can paste into is a check nobody runs."""
        module = self.module()
        expected = 'software/classic/res'
        for spelling in ('software/classic/res',
                         '../lab/software/classic/res',
                         '/Users/someone/projects/harmony/lab/software/classic/res/'):
            with self.subTest(spelling=spelling):
                self.assertEqual(module['normalise'](spelling), expected)


class TheWriteReviewWithholdListIsComplete(unittest.TestCase):
    """`docs/review-before-first-write.md` makes three claims about which files may be handed to an
    independent reviewer, and all three are the kind this project refuses to leave as prose.

    The review exists because nothing has ever been written to a remote and the derivation a first
    write rests on has been read by one party. Its worth depends entirely on the reviewer not having
    seen our answer, so the two lists in that document are load bearing: a file that states the
    answer and is missing from the withhold list turns an independent derivation into a quotation,
    silently and after the fact.

    The lists are parsed out of the document rather than copied here. A second copy of a list is the
    state this project's oldest rule forbids, and it would drift the first time somebody edited one.

    The asymmetry between the two halves is deliberate. The may read set is small and must be clean
    of even an ambiguous marker. The withhold set is swept with unambiguous markers only, because a
    bare byte like the data packet's opcode occurs all over a codec corpus for unrelated reasons and
    a sweep on it would demand withholding half the tree.
    """

    DOC = os.path.join(ROOT, 'docs', 'review-before-first-write.md')

    # Unambiguous only: each of these names the write path and nothing else.
    MARKERS = (
        'WRITE_FLASH_DATA',
        '0xF1 0x30',
        '0xF0 0x30',
        'writeFlash',
        'assertFlashWriteAllowed',
        'assertFirstWriteAllowed',
        'rehearse-block',
    )

    # The may read set is held to a stricter bar, since it is what actually gets handed over.
    STRICT_MARKERS = MARKERS + ('0x4A', 'ERASE_FLASH', 'WRITE_FLASH')

    SWEPT_SUFFIXES = ('.md', '.ts', '.py', '.txt')
    SKIP_DIRS = {'node_modules', '.git', '.pnpm', 'dist', '__pycache__', 'var'}

    def _document(self):
        with io.open(self.DOC, encoding='utf-8') as handle:
            return handle.read()

    def _paths_between(self, text, start, end):
        """Every backticked token in a region of the document that resolves to a real path."""
        begin = text.index(start) + len(start)
        stop = text.index(end, begin)
        found = set()
        for token in re.findall(r'`([^`]+)`', text[begin:stop]):
            token = token.strip().rstrip(',')
            if token.startswith('..') or '/' not in token and not token.endswith('.md'):
                # The concordance checkout sits outside the repository, and a bare filename like a
                # vendor header is not a path here. Both are named in the document deliberately.
                if not os.path.exists(os.path.join(ROOT, token)):
                    continue
            for match in glob.glob(os.path.join(ROOT, token)):
                found.add(os.path.relpath(match, ROOT))
        return found

    def _swept_files(self):
        for base, dirs, names in os.walk(ROOT):
            dirs[:] = [d for d in dirs if d not in self.SKIP_DIRS and not d.startswith('.')]
            for name in names:
                if name.endswith(self.SWEPT_SUFFIXES):
                    yield os.path.relpath(os.path.join(base, name), ROOT)

    @staticmethod
    def _markers_in(path, markers):
        try:
            with io.open(os.path.join(ROOT, path), encoding='utf-8', errors='replace') as handle:
                body = handle.read()
        except OSError:
            return []
        return [m for m in markers if m in body]

    def test_the_document_states_both_lists(self):
        """The parse is asserted before anything is derived from it, or an empty list passes."""
        text = self._document()
        may = self._paths_between(text, '**May be read and used.**', '**Must not be read.**')
        must = self._paths_between(text, '**Must not be read.**', '\n## ')
        self.assertEqual(len(may), 13, 'the may read list should resolve to 13 paths, got %s'
                         % sorted(may))
        # The AGENTS.md row remains reserved, but the file is deliberately absent. Its place in the
        # resolved population is taken by the Codex config named in that row, so the count stays 17.
        self.assertEqual(len(must), 17, 'the withhold list should resolve to 17 paths, got %s'
                         % sorted(must))

    def test_every_may_read_path_is_clean_of_the_write_path(self):
        """The half that is handed over. One marker here voids the independence of the whole job."""
        may = self._paths_between(self._document(), '**May be read and used.**',
                                  '**Must not be read.**')
        offenders = {}
        for path in sorted(may):
            targets = [path]
            if os.path.isdir(os.path.join(ROOT, path)):
                targets = [p for p in self._swept_files() if p.startswith(path + os.sep)]
            for target in targets:
                hits = self._markers_in(target, self.STRICT_MARKERS)
                if hits:
                    offenders[target] = hits
        self.assertEqual(offenders, {},
                         'a file offered to the reviewer states the write path: %s' % offenders)

    def test_every_file_stating_the_write_path_is_withheld(self):
        """The half that is held back, and the direction that actually fails.

        A new document quoting the transfer is the expected way for this to break, and then the fix
        is to add it to the withhold list, not to loosen this test.
        """
        must = self._paths_between(self._document(), '**Must not be read.**', '\n## ')
        uncovered = {}
        for path in self._swept_files():
            hits = self._markers_in(path, self.MARKERS)
            if not hits:
                continue
            covered = any(path == entry or path.startswith(entry.rstrip('/') + os.sep)
                          for entry in must)
            if not covered:
                uncovered[path] = hits
        self.assertEqual(uncovered, {},
                         'these state the write path and no withhold entry covers them: %s'
                         % uncovered)

    def test_the_sweep_can_fail(self):
        """The control. A sweep matching nothing would pass the test above vacuously.

        Exact rather than a floor, on this project's own measured ground that a floor is a fossil.
        It moves whenever a file starts or stops stating the write path, and that is the moment the
        withhold list is worth another look, so the churn is the point rather than the cost.
        """
        stating = sorted(p for p in self._swept_files() if self._markers_in(p, self.MARKERS))
        # Back to 20 since 28 August 2026, when the duplicate AGENTS.md was removed and Codex was
        # pointed at CLAUDE.md instead.
        self.assertEqual(len(stating), 20,
                         'the number of files stating the write path moved, so re-read the withhold '
                         'list before restamping this: %s' % stating)


if __name__ == '__main__':
    unittest.main()
