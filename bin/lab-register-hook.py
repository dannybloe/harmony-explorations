#!/usr/bin/env python3
"""Print what the lab register already says, at the moment a lab path is opened.

**This exists because the rule it enforces has been written down three times and failed eight.**
Sections 206, 209 and 213 each end with a session having re-derived something the lab already held,
and each proposed a remedy: remember to check, then check per artefact, then check per path with one
command, `make lab-check`. The command works. Running it is the part that fails, every time, because
the failure mode is momentum: a dig checks the square it means to open, then a name leads somewhere
else and the subject has not changed, so it does not feel like opening anything new.

`CLAUDE.md` now says not to write a fourth paragraph about it. What was missing is a check that runs
without being remembered, which is this.

    bin/lab-register-hook.py --hook     driven by a PreToolUse hook, reads the payload on stdin
    bin/lab-register-hook.py <path>     the same report, by hand, for testing

**It interrupts once per lab directory per session, and then gets out of the way.** Advisory text
that scrolls past is exactly what momentum ignores, which is the whole evidence of the eight
occurrences, so the first touch of a directory exits 2 and puts the register's own rows in front of
whoever is reading. The retry immediately afterwards succeeds, and every later path under the same
directory passes silently. So the cost is one round trip per new directory and the guarantee is that
nobody digs a mined square without having been shown its row.

**It fails open, always.** A hook that cannot parse its input, cannot find the register, cannot find
the lab, or hits any error at all returns 0. Losing the reminder is a bad afternoon; blocking the
session on a broken hook is worse, and `make lab-check` still exists for anyone who wants to ask
directly.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile

#: Exit code a PreToolUse hook must use to interrupt the tool call. Same constant, same reason, as
#: `bin/check-publishable.py`: anything else, 1 included, reads as the hook itself having failed.
HOOK_INTERRUPT = 2

#: Tool inputs that can name a path. `command` is the Bash one and is scanned as free text, because
#: a lab path reaches a shell inside pipelines, redirections and `$(...)` far more often than it
#: arrives as a tidy argument.
PATH_FIELDS = ('file_path', 'path', 'notebook_path', 'pattern', 'command')

#: A path shaped run of characters, which is what has to be pulled out of a shell command. Kept
#: deliberately loose: a false positive costs one register lookup that prints nothing, and a false
#: negative costs an afternoon.
PATH_LIKE = re.compile(r'[~\w./$-]*(?:lab|LAB)[\w./$-]*')

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def lab_root() -> str | None:
    """Where the lab is, by the same rule `tests/lab.py` and `packages/lab` use."""
    explicit = os.environ.get('HARMONY_LAB')
    if explicit and os.path.isdir(explicit):
        return os.path.abspath(explicit)
    sibling = os.path.join(os.path.dirname(REPO), 'lab')
    return sibling if os.path.isdir(sibling) else None


def lab_relative(candidate: str, lab: str) -> str | None:
    """The path of `candidate` inside the lab, or None when it is not in the lab at all.

    Resolved through `realpath` on both sides, because the lab is reached as `../lab` from here and
    a session may name it absolutely, relatively, or through a symlink. Comparing the strings would
    miss two of those three.
    """
    if '$' in candidate:
        return None  # an unexpanded shell variable names nothing this can check
    path = os.path.expanduser(candidate)
    if not os.path.isabs(path):
        path = os.path.join(os.getcwd(), path)
    try:
        real, real_lab = os.path.realpath(path), os.path.realpath(lab)
    except OSError:
        return None
    if real == real_lab or not real.startswith(real_lab + os.sep):
        # The lab root itself is excluded on purpose: its own row says nothing about a square, and
        # firing on it would spend the one interruption a session gets on no information.
        return None
    return os.path.relpath(real, real_lab)


def directory_of(relative: str, lab: str) -> str:
    """The directory to report on, so that ten files in one square cost one interruption."""
    full = os.path.join(lab, relative)
    return relative if os.path.isdir(full) else os.path.dirname(relative)


def candidates(payload: dict) -> list[str]:
    """Every path shaped string in the tool input, in the order they appear."""
    found: list[str] = []
    tool_input = payload.get('tool_input')
    if not isinstance(tool_input, dict):
        return found
    for field in PATH_FIELDS:
        value = tool_input.get(field)
        if not isinstance(value, str):
            continue
        found.extend(PATH_LIKE.findall(value))
    return found


def register_report(relative: str) -> str:
    """What `make lab-check` would print for this path, or an empty string."""
    script = os.path.join(REPO, 'tools', 'lab_register.py')
    if not os.path.exists(script):
        return ''
    try:
        done = subprocess.run([sys.executable, script, relative], capture_output=True,
                              text=True, timeout=20, cwd=REPO)
    except (OSError, subprocess.SubprocessError):
        return ''
    return done.stdout.strip() if done.returncode == 0 else ''


def seen_path(session: str) -> str | None:
    """Where this session's already announced directories are remembered.

    Under a per user directory rather than a fixed name in the shared temporary directory, so that
    another local account cannot pre-create the file this hook is about to trust.
    """
    try:
        base = os.path.join(tempfile.gettempdir(), 'harmony-lab-hook-%d' % os.getuid())
        os.makedirs(base, mode=0o700, exist_ok=True)
    except OSError:
        return None
    safe = re.sub(r'[^A-Za-z0-9_-]', '_', session)[:64] or 'nosession'
    return os.path.join(base, safe + '.txt')


def already_announced(store: str | None, directory: str) -> bool:
    if store is None:
        return False  # no memory means announce, which is the safe direction for a reminder
    try:
        with open(store, encoding='utf-8') as handle:
            return directory in handle.read().splitlines()
    except OSError:
        return False


def remember(store: str | None, directory: str) -> None:
    if store is None:
        return
    try:
        with open(store, 'a', encoding='utf-8') as handle:
            handle.write(directory + '\n')
    except OSError:
        pass


def run_as_hook() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    lab = lab_root()
    if lab is None:
        return 0
    store = seen_path(str(payload.get('session_id', '')))
    for candidate in candidates(payload):
        relative = lab_relative(candidate, lab)
        if relative is None:
            continue
        directory = directory_of(relative, lab)
        if not directory or already_announced(store, directory):
            continue
        report = register_report(directory)
        remember(store, directory)
        if not report:
            continue
        print(
            'The lab register on %s, which is the check sections 206, 209 and 213 each skipped.\n'
            'Read this before deriving anything from it: a row at `mined` means somebody has\n'
            'already extracted what the want list asks for, and their extraction is the thing to\n'
            'read. Re-run the tool call to proceed; this fires once per directory per session.\n\n%s'
            % (directory, report),
            file=sys.stderr,
        )
        return HOOK_INTERRUPT
    return 0


def main(argv: list[str]) -> int:
    if '--hook' in argv:
        try:
            return run_as_hook()
        except Exception:  # noqa: BLE001 - a reminder must never break a session
            return 0
    if not argv:
        print(__doc__.strip().splitlines()[0])
        return 0
    lab = lab_root()
    if lab is None:
        print('no lab directory found, so nothing to report')
        return 0
    relative = lab_relative(argv[0], lab)
    if relative is None:
        print('%s is not inside the lab' % argv[0])
        return 0
    print(register_report(directory_of(relative, lab)) or 'the register says nothing about that path')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
