#!/usr/bin/env python3
"""Run the suite against a deliberately incomplete lab, and refuse any test that shrank quietly.

`make test-nolab` covers the empty case: with no lab at all, every image backed test must skip. The
case in between is the dangerous one. A skip raised inside `subTest` skips that iteration and lets
the loop finish, so a test whose samples are half present asserts over half of them, keeps the claim
in its own title, and reports a pass. Nothing in a normal run can see that, because there is no
failure to find.

So this builds a lab holding exactly one sample, runs the suite against it, and fails on any test
that came out successful with at least one of its subtests skipped. `unittest` gives no hook that
says "this test passed partially": it reports each skipped `_SubTest` through `addSkip` and never
calls `addSuccess` on the parent, which is why the parent still counts as run and successful. Both
halves have to be observed and intersected, which is what `PartialPassDetector` does.

`ASampleLoopStatesItsPopulation` in `tests/test_toolchain.py` is the static half and is cheaper: it
runs in a fresh clone with no lab and names the offender before anything executes. It cannot see a
loop that loads through a helper, which is how `test_every_container_declares_one` passed it while
checking one container of fifteen. Keep both.

Exit codes: 0 clean, 1 offenders found, 0 with a note when there is no lab to cut down.
"""
import os
import shutil
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
sys.path.insert(0, os.path.join(ROOT, 'src'))

#: The one sample the cut down lab keeps. A config rather than a firmware image, because far more
#: tests load a config, so the population that gets to run at all is larger and the check bites
#: harder. Any sample would be a valid probe; this one is the most informative.
KEPT_SAMPLE = 'h700_config'


class PartialPassDetector(unittest.TextTestResult):
    """Which tests reported successful while at least one of their subtests skipped."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.subtest_skipped = set()
        self.subtest_ran = set()
        self.unsuccessful = set()

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        # A `_SubTest` carries the parent it belongs to. A whole test skipping is the correct
        # outcome here and is deliberately not recorded.
        parent = getattr(test, 'test_case', None)
        if parent is not None:
            self.subtest_skipped.add(parent.id())

    def addSubTest(self, test, subtest, outcome):
        super().addSubTest(test, subtest, outcome)
        (self.subtest_ran if outcome is None else self.unsuccessful).add(test.id())

    def addFailure(self, test, err):
        super().addFailure(test, err)
        self.unsuccessful.add(test.id())

    def addError(self, test, err):
        super().addError(test, err)
        self.unsuccessful.add(test.id())

    def partial_passes(self):
        return sorted((self.subtest_skipped & self.subtest_ran) - self.unsuccessful)


def build_partial_lab(destination):
    """Symlink one sample into an otherwise empty lab, preserving its path inside the real one.

    The path matters: `tests/lab.py` searches by file name under the lab root, so a symlink placed
    anywhere would do, but keeping the original directory layout means a failure message names a
    path that exists on this machine.
    """
    import lab
    source = lab.path(KEPT_SAMPLE)
    if source is None:
        return None
    relative = os.path.relpath(source, lab.LAB)
    target = os.path.join(destination, relative)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    os.symlink(source, target)
    return relative


def main():
    import lab
    if lab.LAB is None or lab.path(KEPT_SAMPLE) is None:
        print('no lab holding %s, so there is nothing to cut down; skipped' % KEPT_SAMPLE)
        return 0

    destination = tempfile.mkdtemp(prefix='harmony-partial-lab-')
    try:
        kept = build_partial_lab(destination)
        os.environ['HARMONY_LAB'] = destination
        # Reload, since `lab` cached the real directory at import time and the suite imports it.
        import importlib
        importlib.reload(lab)

        suite = unittest.TestLoader().discover(os.path.join(ROOT, 'tests'))
        with open(os.devnull, 'w', encoding='utf-8') as quiet:
            result = unittest.TextTestRunner(
                stream=quiet, resultclass=PartialPassDetector, verbosity=0).run(suite)
    finally:
        shutil.rmtree(destination, ignore_errors=True)

    offenders = result.partial_passes()
    if not offenders:
        print('%d tests against a lab holding only %s: none passed partially'
              % (result.testsRun, kept))
        return 0

    print('%d test(s) reported successful having skipped some of their own samples:' % len(offenders))
    for name in offenders:
        print('    ' + name)
    print()
    print('Each one keeps the claim in its title while checking whatever happened to be present.')
    print('Call lab.require(...) at the top of the test, naming every sample it means to cover, so')
    print('an incomplete lab skips the whole test instead.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
