#!/usr/bin/env python3
"""Put the finding skill's gate in front of a session at the moment `reference/` gains a tested fact.

**What it fires on moved with the reference, todo-reference.md 6.2.** It fired on a new `## N.` section
in `docs/findings.md` until that document became a frozen archive, after which it could never fire. A
new fact now lands on its reference page with a footnote naming the test that holds it, `[^t-name]:` in
plan 009 section 4's convention, so a new definition of that shape in a file under `reference/` is the
moment a finding is being written, and it is what this matches.

**This exists because the skill is invoked by judgement and the judgement has a blind spot.** The four
places do land: every one of the last 33 commits that added a `## NNN.` heading also touched a test.
What does not always happen is the gate running before the writing, and section 271 showed why that
matters even when it does. Its own gate passed honestly, and the sentence that was wrong sat **beside**
the claim, never itself tested, until Danny asked what 1818 was a count of. A passenger is exactly what
a session does not think to invoke a skill for.

    bin/finding-gate-hook.py --hook     driven by a PreToolUse hook, reads the payload on stdin
    bin/finding-gate-hook.py <file>     the same check, by hand, against a file's text

**It interrupts once per session.** The same shape as `bin/lab-register-hook.py` and for the reason
that file records at length: advisory text that scrolls past is what momentum ignores, so the first
write of a tested fact exits 2 and puts the gate in front of whoever is reading. The retry immediately
afterwards succeeds. One round trip, once, per session that records a finding.

**It fails open, always.** Anything it cannot parse, anything that raises, returns 0. Losing the
reminder costs a review; blocking a session on a broken hook costs more.
"""

from __future__ import annotations

import json
import os
import re
import sys
import tempfile

#: Exit code a PreToolUse hook must use to interrupt the tool call. Same constant, same reason, as
#: `bin/check-publishable.py` and `bin/lab-register-hook.py`: anything else, 1 included, reads as the
#: hook itself having failed.
HOOK_INTERRUPT = 2

#: A footnote definition citing a test, which is the one edit this fires on. The label's shape is
#: `LABEL`'s `t-` arm in `tools/reference_guards.py`, and a test holds the two to the same labels.
FINDING = re.compile(r'^\[\^t-[a-z0-9]+(?:-[a-z0-9]+)*\]:', re.MULTILINE)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

#: Where the once per session marker lives. Keyed by the session id when the payload carries one, so
#: two sessions in one working copy do not silence each other.
STAMP = os.path.join(tempfile.gettempdir(), 'harmony-finding-gate-%s')

REMINDER = """A fact with a test behind it is being written into reference/, so the finding skill applies.
This fires once per session and the retry straight after it succeeds.

Before the commit, two things the gate does not cover on its own:

  1. The gate covers the claim you know you are making. It does not cover the sentences
     beside it. Section 271 passed its gate and carried a wrong one anyway: a corpus total,
     1818 screen bindings against 1609 keypad ones, quoted as a fact about one remote. Per
     configuration the split is 8 to 7. It reached four documents and a test assertion.

  2. So run the two reviewers in `.claude/skills/finding/SKILL.md`, on the WHOLE DIFF and not
     on a summary of the headline claim. One re-measures blind, without our answer. The other
     audits every figure's granularity and every comparative word against the corpus. The
     second is the one that catches a passenger.

`make prose facts lint test` afterwards, as always."""


def edited_text(payload: dict) -> str:
    """Whatever this tool call would put into a file, as one string.

    Every field is concatenated rather than picked, because Edit, Write and their multi-edit
    variants spell the new content differently and a missed spelling is a missed reminder. A false
    positive costs one interruption that a session was going to want anyway.

    **`command` is in the list and that is not an afterthought.** This hook shipped matching the
    file writing tools alone and missed the first finding written after it, because a session under
    the shell-first instruction appends to a document with a heredoc rather than with Edit. The lab
    register hook has carried `command` since it was written and for the same reason. A shell
    command is scanned as free text: the heredoc body is in it, so the heading is too.
    """
    tool_input = payload.get('tool_input')
    if not isinstance(tool_input, dict):
        return ''
    parts: list[str] = []
    for field in ('content', 'new_string', 'new_str', 'command'):
        value = tool_input.get(field)
        if isinstance(value, str):
            parts.append(value)
    edits = tool_input.get('edits')
    if isinstance(edits, list):
        for one in edits:
            if isinstance(one, dict) and isinstance(one.get('new_string'), str):
                parts.append(one['new_string'])
    return '\n'.join(parts)


#: How `reference/` is named in a shell command. Deliberately loose, on the lab register hook's
#: reasoning: a false positive costs one lookup that prints nothing and a false negative costs the
#: reminder this whole file exists to deliver.
REFERENCE_IN_A_COMMAND = re.compile(r'\breference/')


def targets_reference(payload: dict) -> bool:
    """Whether this call writes a file under `reference/`, by real path or, for a shell, by name.

    Two routes because there are two ways a document gets written here. A file writing tool names
    the path, and that is resolved through `realpath` so a relative name, an absolute one and a
    symlink all answer the same. A shell command names it inside whatever pipeline it is running,
    where there is no path to resolve, so it is matched as text.
    """
    tool_input = payload.get('tool_input')
    if not isinstance(tool_input, dict):
        return False
    named = tool_input.get('file_path') or tool_input.get('path')
    if isinstance(named, str):
        path = named if os.path.isabs(named) else os.path.join(os.getcwd(), named)
        try:
            root = os.path.realpath(os.path.join(REPO, 'reference'))
            if os.path.realpath(path).startswith(root + os.sep):
                return True
        except OSError:
            return False
    command = tool_input.get('command')
    return isinstance(command, str) and REFERENCE_IN_A_COMMAND.search(command) is not None


def already_fired(payload: dict) -> bool:
    """True when this session has been shown the reminder, marking it if not.

    The marker is a file rather than an environment variable, because a hook is a fresh process
    every time and cannot see anything a previous one exported.
    """
    session = str(payload.get('session_id') or 'default')
    safe = re.sub(r'[^A-Za-z0-9_-]', '', session)[:64] or 'default'
    stamp = STAMP % safe
    if os.path.exists(stamp):
        return True
    try:
        with open(stamp, 'w') as handle:
            handle.write('')
    except OSError:
        return False  # cannot mark it, so prefer reminding twice over not reminding at all
    return False


def run_as_hook() -> int:
    payload = json.load(sys.stdin)
    if not targets_reference(payload):
        return 0
    if not FINDING.search(edited_text(payload)):
        return 0
    if already_fired(payload):
        return 0
    print(REMINDER, file=sys.stderr)
    return HOOK_INTERRUPT


def main(argv: list[str]) -> int:
    if '--hook' in argv:
        try:
            return run_as_hook()
        except Exception:  # noqa: BLE001 - a reminder must never break a session
            return 0
    if not argv:
        print(__doc__.strip().splitlines()[0])
        return 0
    try:
        with open(argv[0]) as handle:
            text = handle.read()
    except OSError as problem:
        print('cannot read %s: %s' % (argv[0], problem))
        return 0
    print(REMINDER if FINDING.search(text) else 'no footnote citing a test in that text')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
