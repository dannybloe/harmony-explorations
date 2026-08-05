#!/usr/bin/env python3
"""
Refuse to let anything unpublishable into this repository.

This repository is public, and the worst mistake available here is committing a firmware
image, a config dump, or a stranger's account details. `.gitignore` covers the obvious file
names, but it is a safety net with two holes: `git add -f` walks straight past it, and a dump
renamed to something innocuous was never covered by an extension rule in the first place. So
this checks staged content, not just staged names.

Run it by hand, or let the PreToolUse hook in `.claude/settings.json` run it before any
commit:

    bin/check-publishable.py            check the staged tree, exit 1 if it is not publishable
    bin/check-publishable.py --hook     the same, driven by a Claude Code PreToolUse hook

In `--hook` mode it reads the hook payload on standard input, does nothing unless the command
about to run contains `git commit`, and exits 2 to block the commit when a rule fires. The
command filtering happens here rather than in the hook's own matcher because a commit is
frequently the tail of a compound command, which a prefix matcher would miss.

Exit 0 means the staged tree is publishable. Exit 1 prints what is wrong and why. The reasons
are spelled out rather than numbered, because whoever hits this is usually about to argue with
it, and they should be able to tell at a glance whether it is right.

Note on the lab: it lives outside this checkout, so its files cannot be staged from here. The
risk this guards is a copy of one landing inside the checkout, which is exactly what the
content checks below catch regardless of what it was renamed to.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys

# Exit code a Claude Code PreToolUse hook must use to block the tool call. Anything else,
# including 1, is treated as the hook itself having failed and does not stop the commit.
HOOK_BLOCK = 2

# Extensions and name shapes that are proprietary binaries or personal dumps by convention.
# Duplicates .gitignore on purpose: a gate must not depend on the previous gate having held.
BINARY_SUFFIXES = ('.bin', '.hfw', '.ezhex', '.ezup', '.ezupgrade')
GHIDRA_SUFFIXES = ('.gpr', '.rep', '.lock')

# How much of a file to sniff for binary content. Every format this project handles is dense
# binary from its first bytes, so the first block is enough.
SNIFF_BYTES = 8192

# Account and session fields out of the archived .hfw packages. The field *names* appear
# legitimately throughout this repository, in the scrubber, its test and the documents that
# explain why scrubbing is needed, so a bare name must not trigger. These match a name
# followed by a plausible value instead.
SESSION_PATTERNS = (
    (re.compile(rb'ASPSESSIONID[A-Z]*=[A-Za-z0-9]{8,}'),
     'looks like a live ASPSESSIONID cookie value'),
    (re.compile(rb'<(?:KEY>)?UserId(?:</KEY>)?[^0-9]{0,40}[0-9]{4,}'),
     'looks like a real Logitech UserId'),
)

# An absolute home path leaks a real person's directory layout and hardcodes one machine.
# Everything here finds the lab relative to the checkout or through HARMONY_LAB, so an
# absolute home path is a mistake by construction.
HOME_PATH = re.compile(rb'(?:/Users/|/home/)[A-Za-z0-9._-]+/')

# Files allowed to contain what the rules above forbid, with the reason each is exempt.
EXEMPT = {
    'tests/test_ezfile.py': 'holds fabricated account fields in the real fields shape',
}


def staged_paths() -> list[str]:
    """Paths added, copied, modified or renamed in the index. Deletions cannot leak."""
    out = subprocess.run(
        ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
        capture_output=True, text=True, check=True).stdout
    return [line for line in out.splitlines() if line]


def check_name(path: str) -> list[str]:
    lower = path.lower()
    if lower.endswith(BINARY_SUFFIXES):
        return ['is a firmware or config binary; publish its checksum in '
                'reference/checksums.md instead']
    if lower.endswith('-info.txt'):
        return ["is concordance identity output, which carries the remote's serial GUIDs"]
    if lower.endswith(GHIDRA_SUFFIXES):
        return ['belongs to a Ghidra project, which embeds an imported copy of the firmware']
    if path.startswith('samples/') and path != 'samples/README.md':
        return ['is under samples/, which is empty by policy; see samples/README.md']
    return []


def check_content(path: str) -> list[str]:
    """Content rules. Skipped for files that are not present, for example a rename target."""
    if not os.path.isfile(path):
        return []
    with open(path, 'rb') as fh:
        head = fh.read(SNIFF_BYTES)
    if b'\0' in head:
        # Caught here rather than by name, which is the point: this is what a dump renamed
        # to notes.txt looks like.
        return ['contains NUL bytes, so it is binary whatever its name says']
    if path in EXEMPT:
        return []
    with open(path, 'rb') as fh:
        body = fh.read()
    problems = []
    for pattern, why in SESSION_PATTERNS:
        if pattern.search(body):
            problems.append(why)
    if HOME_PATH.search(body):
        problems.append('contains an absolute home directory path; use ../lab or HARMONY_LAB')
    return problems


def prose_is_clean() -> bool:
    """`make prose` is the single definition of the dash convention, so call it."""
    if not os.path.exists('Makefile'):
        return True
    with open('Makefile', encoding='utf-8') as fh:
        if 'prose:' not in fh.read():
            return True
    return subprocess.run(['make', '-s', 'prose'],
                          capture_output=True).returncode == 0


def enter_repo() -> None:
    """Work from the repository root, wherever the caller happened to be."""
    start = os.environ.get('CLAUDE_PROJECT_DIR') or os.getcwd()
    if not os.path.isdir(start):
        start = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(start)
    root = subprocess.run(['git', 'rev-parse', '--show-toplevel'],
                          capture_output=True, text=True, check=True).stdout.strip()
    os.chdir(root)


def refusals() -> list[str]:
    """Every reason the staged tree may not be published, empty when it may."""
    found = []
    for path in staged_paths():
        for why in check_name(path) + check_content(path):
            found.append('%s %s' % (path, why))
    if not prose_is_clean():
        found.append('make prose fails: a document contains an em-dash or an en-dash')
    return found


def print_refusals(found: list[str]) -> None:
    print('REFUSED, nothing was committed:', file=sys.stderr)
    for line in found:
        print('  * %s' % line, file=sys.stderr)
    print('\nIf a refusal is wrong, fix the rule in bin/check-publishable.py rather than\n'
          'working around it, so the next person is protected too.', file=sys.stderr)


def run_as_hook() -> int:
    """PreToolUse hook: block the tool call only when it is about to commit."""
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        # A hook that cannot read its input must not block work. Failing open is right here:
        # the same check also runs from the command line and in whatever CI exists.
        return 0
    command = str(payload.get('tool_input', {}).get('command', ''))
    if 'git commit' not in command:
        return 0
    enter_repo()
    found = refusals()
    if found:
        print_refusals(found)
        return HOOK_BLOCK
    return 0


def main(argv: list[str]) -> int:
    if '--hook' in argv:
        return run_as_hook()

    enter_repo()
    paths = staged_paths()
    if not paths:
        print('nothing staged, nothing to check')
        return 0
    found = refusals()
    if found:
        print_refusals(found)
        return 1
    print('staged tree is publishable (%d file%s checked)'
          % (len(paths), '' if len(paths) == 1 else 's'))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
