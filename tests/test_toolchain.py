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
        # having found nothing to check.
        self.assertGreater(found, 12, 'no source directories found, so this test checked nothing')

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
        self.assertGreaterEqual(len(silenced), 4, 'the silenced rules moved, so check this still fits')
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
        self.assertGreater(len(names), 8)
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
        self.assertGreaterEqual(len(files), 24, 'only %d test files found' % len(files))
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
        # And the check has teeth only if most files actually carry a block.
        self.assertGreaterEqual(with_block, 20,
                                'only %d files carry a __main__ block, so this test is checking '
                                'almost nothing' % with_block)


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
        self.assertGreater(scanned, 20, 'only %d TypeScript test files found' % scanned)
        self.assertEqual(
            {name: len(lines) for name, lines in counted.items()},
            TYPESCRIPT_LOOPS_ALLOWED_TO_SKIP_A_SAMPLE,
            'these load a sample and skip the iteration when it is absent, so an incomplete lab '
            'shrinks the claim and still reports a pass: %s. Use require_(name) and let the test '
            'fail, or skipUnless(...) on the test if the claim is about named samples rather than '
            'the corpus; a deliberate exception goes in the dict above with its reason.'
            % '; '.join('%s:%s' % (name, ','.join(str(n) for n in lines))
                        for name, lines in sorted(counted.items())))


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
    }

    def _names(self, relative, declaration):
        path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', relative)
        with open(path, encoding='utf-8') as fh:
            source = fh.read()
        self.assertIn(declaration, source, '%s no longer declares %s' % (relative, declaration))
        body = source[source.index(declaration):]
        body = body[:body.index('];')]
        return sorted(set(re.findall(r"'([a-z0-9_]+)'", body)))

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

        The TypeScript lists are checked for **containment** rather than equality, and deliberately:
        they hold nineteen of these twenty one, which is a disagreement about what belongs in a
        coverage total and is a decision about the corpus rather than a defect. Equality would encode
        an accident as a rule; containment catches a name that exists on one side only.
        """
        import lab
        allc = set(lab.ALL_CONTAINERS)
        self.assertEqual(len(allc), len(lab.ALL_CONTAINERS), 'no duplicates')
        self.assertEqual(len(allc), 21)
        self.assertLess(set(lab.CONTAINERS), allc)
        self.assertEqual(sorted(allc - set(lab.CONTAINERS)),
                         ['arch8_config_880', 'arch8_config_885', 'one34_region2', 'one_safemode',
                          'one_spare_after_sync', 'one_spare_before_sync'])
        # The user configs are containers too, bar none: a config read off a remote is a container.
        self.assertLess(set(lab.USER_CONFIGS), allc)
        for relative, declaration in self.POPULATIONS.items():
            names = set(self._names(relative, declaration))
            self.assertLessEqual(names, allc, '%s names something outside the corpus: %s'
                                 % (relative, sorted(names - allc)))

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


if __name__ == '__main__':
    unittest.main()
