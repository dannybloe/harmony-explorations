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


if __name__ == '__main__':
    unittest.main()
