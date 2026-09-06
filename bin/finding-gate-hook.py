#!/usr/bin/env python3
"""Put the finding skill's gate in front of a session at the moment `docs/findings.md` gains a section.

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
write of a new section exits 2 and puts the gate in front of whoever is reading. The retry immediately
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

#: A new findings section, which is the one edit this fires on. The heading shape is the same one
#: `tools/facts.py` counts sections by, so the two cannot drift apart on what a section is.
SECTION = re.compile(r'^## \d+\.', re.MULTILINE)

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

#: Where the once per session marker lives. Keyed by the session id when the payload carries one, so
#: two sessions in one working copy do not silence each other.
STAMP = os.path.join(tempfile.gettempdir(), 'harmony-finding-gate-%s')

REMINDER = """A new section is being written into docs/findings.md, so the finding skill applies.
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
    """
    tool_input = payload.get('tool_input')
    if not isinstance(tool_input, dict):
        return ''
    parts: list[str] = []
    for field in ('content', 'new_string', 'new_str'):
        value = tool_input.get(field)
        if isinstance(value, str):
            parts.append(value)
    edits = tool_input.get('edits')
    if isinstance(edits, list):
        for one in edits:
            if isinstance(one, dict) and isinstance(one.get('new_string'), str):
                parts.append(one['new_string'])
    return '\n'.join(parts)


def targets_findings(payload: dict) -> bool:
    """Whether the file being written is `docs/findings.md`, by real path rather than by string."""
    tool_input = payload.get('tool_input')
    if not isinstance(tool_input, dict):
        return False
    named = tool_input.get('file_path') or tool_input.get('path')
    if not isinstance(named, str):
        return False
    path = named if os.path.isabs(named) else os.path.join(os.getcwd(), named)
    try:
        return os.path.realpath(path) == os.path.realpath(os.path.join(REPO, 'docs', 'findings.md'))
    except OSError:
        return False


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
    if not targets_findings(payload):
        return 0
    if not SECTION.search(edited_text(payload)):
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
    print(REMINDER if SECTION.search(text) else 'no new findings section in that text')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
