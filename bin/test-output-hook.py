#!/usr/bin/env python3
"""Refuse a test run whose output is piped or sent to a file, so the band above the prompt can follow it.

**What it protects.** The harmony-remote mod draws a test line while a suite runs: a bar and the counts. It
finds the outermost test process and reads standard output of the shell that started it, which is the
file Claude Code collects the command's output in. A pipe (`| tail`, `| grep`) holds the output back
until the run ends, and a redirect (`> file`, `>> file`, `&> file`) sends it somewhere the mod never
looks; either way the bar says the tests run and shows no progress for the whole run.

**Why a hook and not the memory that already said so.** The rule against the pipe was written on 30
October 2026, and on 8 November 2026 three full runs in a row were redirected to a file of the
session's own instead, which the rule's wording did not name and which blinded the bar the same way.
Asked for again by the person watching it, after asking several times: a rule a session has to
remember is a rule momentum breaks, so it is enforced at the moment the command is sent.

    bin/test-output-hook.py --hook        driven by a PreToolUse hook on Bash, payload on stdin
    bin/test-output-hook.py '<command>'   the same check, by hand, against a command line

**What counts as a test command** is the mod's own pattern, `TESTS` in its `register.tsx`: make's test
targets, pnpm's test script, Python's unittest and Node's test runner. **What counts as hiding its
output**: a pipe (`|` or `|&`, not `||`) or a redirect of standard output or of both streams to a file
(`>`, `>>`, `1>`, `&>`), `/dev/null` included; `2>&1` alone duplicates a stream and is allowed, and so is
`2> file`, which leaves standard output where the mod reads it. Quoted strings and heredoc bodies are
dropped before either is looked for, so a commit message that mentions `make test | tail` is not a run.

**It refuses every time**, unlike the lab register and finding gate hooks beside it, which interrupt
once: those remind, this one has a right form to use instead, the same command without the pipe or the
redirect, read from the tool's own output file afterwards.

**It fails open.** Anything it cannot parse or anything that raises returns 0: a broken hook must not
stop a session from working.
"""

from __future__ import annotations

import json
import re
import sys

#: Exit code a PreToolUse hook uses to refuse the tool call; anything else, 1 included, reads as the hook
#: itself having failed. The same constant as `bin/finding-gate-hook.py` and `bin/lab-register-hook.py`.
HOOK_INTERRUPT = 2

#: A test run of this repository, the harmony-remote mod's `TESTS` pattern with the bracket tricks it
#: needs for `pgrep` taken out: make's test targets, pnpm's test script, unittest and Node's runner.
TEST_COMMAND = re.compile(
    r'\bmake(\s+-\S+)*\s+(all|test|ts-test|ts|test-nolab)\b'
    r'|\bpnpm(\s+\S+)*?\s+test\b'
    r'|-m\s+unittest\b'
    r'|\bnode(\s+\S+)*?\s+--test\b')

#: A pipe, `|` or `|&`, and not the `||` of a fallback.
PIPE = re.compile(r'(?<!\|)\|(?!\|)')

#: A redirect of standard output, or of both streams, to anything but another stream: `>`, `>>`, `1>`,
#: `&>`, `&>>`, followed by something that is not `&`. `2>` is left alone, since standard output stays
#: where the mod reads it.
REDIRECT = re.compile(r'(?:(?<![0-9&>])|(?<=[\s;(]1)|(?<=&))>>?(?!&)|&>>?')

#: A heredoc's opening, `<<EOF`, `<<'EOF'`, `<<"EOF"` or `<<-EOF`, which starts a body that is text.
HEREDOC = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1")

REFUSAL = """This test command hides its output from the band above the prompt.

The harmony-remote mod follows a test run by reading the output file of the shell that started it.
A pipe (| tail, | grep) or a redirect to a file (> file, &> file) leaves that file empty until the run
ends, so the bar shows the tests running and no progress at all.

Run the same command bare: in the foreground and read the end of its output afterwards, or with
run_in_background and read the task's output file when it reports. For two suites in one call:
`NO_COLOR=1 make test; NO_COLOR=1 make ts-test`, nothing else around them."""


def without_text(command: str) -> str:
    """The command with heredoc bodies and quoted strings removed, leaving only what the shell runs."""
    lines = command.split('\n')
    kept: list[str] = []
    closing: list[str] = []
    for line in lines:
        if closing:
            if line.strip() == closing[0]:
                closing.pop(0)
            continue
        kept.append(line)
        closing.extend(match.group(2) for match in HEREDOC.finditer(line))
    text = '\n'.join(kept)
    # Single quotes take nothing literally inside; double quotes can hold an escaped quote.
    text = re.sub(r"'[^']*'", "''", text)
    text = re.sub(r'"(?:\\.|[^"\\])*"', '""', text)
    return text


def hides_test_output(command: str) -> bool:
    """Whether the command runs a test suite and pipes or redirects standard output away from the tool."""
    text = without_text(command)
    found = TEST_COMMAND.search(text)
    if not found:
        return False
    # Only what comes after the test command can carry its output away: a pipe feeding it input,
    # `echo {} | python3 -m unittest`, leaves its output where it was. A group closed after it,
    # `(make test; make ts-test) > file`, is after it too, so the rest of the line is looked at whole.
    after = text[found.start():]
    return bool(PIPE.search(after) or REDIRECT.search(after))


def run_as_hook() -> int:
    payload = json.load(sys.stdin)
    if payload.get('tool_name', 'Bash') != 'Bash':
        return 0
    command = (payload.get('tool_input') or {}).get('command')
    if not isinstance(command, str) or not hides_test_output(command):
        return 0
    print(REFUSAL, file=sys.stderr)
    return HOOK_INTERRUPT


def main(argv: list[str]) -> int:
    if '--hook' in argv:
        try:
            return run_as_hook()
        except Exception:  # noqa: BLE001 - a broken hook must never stop a session
            return 0
    if not argv:
        print(__doc__.strip().splitlines()[0])
        return 0
    command = ' '.join(argv)
    print('refused: hides the test output' if hides_test_output(command) else 'allowed')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
