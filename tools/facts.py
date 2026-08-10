#!/usr/bin/env python3
"""
Keep the documents honest about numbers and about claims that later findings killed.

Usage:  facts.py [--write] [--list]

**Why this exists.** On 8 August 2026 an audit of the documents against the code found eleven
places where they had drifted, and all eleven had one cause: a fact stated in more than one place
with only one of them executable. `docs/findings.md` had not drifted at all, because every section
in it lands a regression test; the documents that *summarise* it had, because a summary is a copy
with no test. So this tool makes the copies executable.

Two checks, because the eleven fell into exactly two kinds.

**Numbers.** Six of them were figures the test suites already pin, restated in prose: 20260
programs where the tests said 20374, 40588 string codes where they said 41793, a coverage table
frozen at a snapshot. A number in a document carries a marker naming the fact it states, and this
recomputes the fact and compares:

    **20374<!--fact:screen_programs--> programs across thirteen containers**

The marker is an HTML comment, so it is invisible in rendered markdown, and it sits directly after
the value so extraction is unambiguous. `--write` updates every marked value in place, the same
shape as `tools/golden.py --write`, and **prints every value it changes**, because a silent rewrite
of twelve numbers across six files is not something anyone reviews.

**A marker is a claim about now, never about the past.** That distinction cost a commit on
8 August 2026. `docs/roadmap.md` carries a coverage table with one column per finding that moved
the number, and the live column's heading names that finding. Marking a historical column makes
this tool rewrite history the next time anything moves, and marking the live column is right until
a new finding lands, at which point the number changes and the heading does not. So:

* a history column carries a plain number and **no marker**,
* a new finding **adds a column**, it does not overwrite the live one,
* and when `--write` reports a change you did not expect, that is the signal, which is the whole
  reason it reports at all.

The `finding` skill says the same thing at the point where it bites.

**Superseded claims.** The other five were assertions a later finding falsified, corrected in
`findings.md` in place but left standing in the summaries: that `MCU_ID` was reachable, that arch 9
had no picture region, that no further reader would move the coverage. `reference/superseded.md`
lists the dead phrasings; this fails if one appears in a document without a correction marker
beside it, which is what the house convention already asks a correction to carry.

**The numeric check needs the lab and the phrase check does not.** Without a lab this reports the
numbers as unavailable and still runs the phrases, because the phrase check is pure text and a
fresh clone with no lab must still be protected by it.
"""
import os
import re
import subprocess
import sys

import _bootstrap  # noqa: F401

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests'))

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
SUPERSEDED = os.path.join(ROOT, 'reference', 'superseded.md')

# A marked value: the number, then the comment naming what it states.
MARKER = re.compile(r'([0-9][0-9,.]*%?)<!--fact:([a-z0-9_]+)-->')
# Every marker, whether or not a number precedes it. A marker attached to a spelled out number is
# silently invisible to `MARKER`, so the document says "thirteen containers" for as long as anyone
# leaves it there and this tool reports that everything agrees. That happened, and it is the whole
# failure mode this file exists to prevent, so an unattached marker is an error of its own.
# The negative lookbehind keeps a marker quoted in prose out of it, since documenting the syntax
# is not using it: the `finding` skill writes `<!--fact:name-->` inside backticks on purpose.
ANY_MARKER = re.compile(r'(?<!`)<!--fact:([a-z0-9_]+)-->')

# What a correction looks like in these documents, so a dead phrase quoted inside one is allowed.
# Both forms are already in use: a blockquote for a long correction, italics for a short one.
#
# `**` is deliberately NOT one of them, and it used to be, by accident: `*` matched a line opening
# in bold as well as one opening in italics. These documents open a load-bearing sentence in bold
# constantly, 507 lines of them, which is exactly where a summary would restate a dead claim, so
# the exemption was widest where the check was needed most. Found on 8 August 2026 while landing
# section 69, by removing a correction marker to confirm the guard fired and watching it not fire.
CORRECTION = ('>', '~~')
ITALIC_OR_BULLET = re.compile(r'\*(?!\*)')


def is_correction(line):
    """Does this line open a correction, so a dead phrase quoted in it is allowed?"""
    return line.startswith(CORRECTION) or bool(ITALIC_OR_BULLET.match(line))
# And an explicit escape, for the common case that neither form fits: a sentence that quotes a dead
# claim in the act of refuting it, mid paragraph. Structure cannot express that, so it is stated.
# It is trivially abusable, and so is `git commit --no-verify`; the point of both is that the
# person doing it has to mean it.
QUOTED = '<!--superseded-->'


def documents():
    """Every published markdown file, which is everything not under .git or node_modules."""
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in ('.git', 'node_modules', 'dist')]
        for name in sorted(files):
            if name.endswith('.md'):
                yield os.path.join(base, name)


def coverage_facts():
    """Per sample byte accounting, taken from the codec rather than recomputed here.

    Shelling out to the TypeScript tool is deliberate. `packages/codec/src/coverage.ts` is the one
    implementation of the byte accounting, and a second one in Python would be a second opcode
    table by another name: the two would diverge and both would look right.
    """
    try:
        out = subprocess.run(['node', 'packages/codec/bin/coverage.ts'], cwd=ROOT,
                             capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.SubprocessError):
        return {}
    if out.returncode != 0:
        return {}
    found = {}
    for line in out.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 2 and parts[-1].endswith('%'):
            found['coverage_' + parts[0]] = parts[-1]
    return found


def emit_facts():
    """Per sample, the share of a container the emitter rebuilds from typed fields.

    The other half of `coverage_facts`, and shelled out for the same reason: one implementation of
    the split, in the codec, rather than a second one here that would be free to disagree.
    """
    try:
        out = subprocess.run(['node', 'packages/codec/bin/emit.ts'], cwd=ROOT,
                             capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.SubprocessError):
        return {}
    if out.returncode != 0:
        return {}
    found = {}
    for line in out.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 3 and parts[-1] == 'equal' and parts[-2].endswith('%'):
            found['framed_' + parts[0]] = parts[-2]
    return found


def reading_facts():
    """The step 6 progress number and its depth, per architecture and for the corpus.

    Shelled out for the same reason as the two above, and added on 10 August 2026 for a reason of
    its own: this was the project's most quoted number and the one with nothing behind it. Every
    document said 97537 instructions and 97.9% with a meaning, and when section 103 moved the figure
    for the first time, no sample list reproduced 97537 at all. The population is stated in
    `packages/codec/bin/reading.ts` now, and the copies carry markers.
    """
    try:
        out = subprocess.run(['node', 'packages/codec/bin/reading.ts'], cwd=ROOT,
                             capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.SubprocessError):
        return {}
    if out.returncode != 0:
        return {}
    found = {}
    for line in out.stdout.splitlines():
        parts = line.split()
        if len(parts) == 2 and re.fullmatch(r'(action_instructions|reading_[a-z0-9]+)', parts[0]):
            found[parts[0]] = parts[1]
    return found


def corpus_facts():
    """The totals the documents quote, computed over the corpus the tests use."""
    import lab
    from harmony import gspm

    if any(lab.path(n) is None for n in lab.CONTAINERS):
        return {}

    totals = dict.fromkeys(
        ('screen_programs', 'inline_string_codes', 'glyphs', 'glyphs_two_byte_pixel',
         'string_codes_two_byte_pixel', 'infrared_records', 'mode_records',
         'mode_records_with_a_program'), 0)
    for name in lab.CONTAINERS:
        c = gspm.parse(lab.load(name))
        packed = c.architecture in gspm.IMAGE_PACKED_ARCHITECTURES

        glyphs = sum(len(s) for s in (c.images() or []))
        totals['glyphs'] += glyphs
        if not packed:
            totals['glyphs_two_byte_pixel'] += glyphs

        programs, _ = c.reachable_screen_programs()
        totals['screen_programs'] += len(programs)

        fonts = c.font_sets() or []
        codes = 0
        for program in programs.values():
            selected = None
            for instruction in program:
                if instruction.opcode == gspm.SCREEN_SELECT_FONT and instruction.operands:
                    selected = instruction.operands[0]
                if instruction.opcode != gspm.SCREEN_TEXT_INLINE or not instruction.glyphs:
                    continue
                if selected is None or selected >= len(fonts):
                    continue
                codes += len(instruction.glyphs)
        totals['inline_string_codes'] += codes
        if not packed:
            totals['string_codes_two_byte_pixel'] += codes

        totals['infrared_records'] += sum(len(g) for g in (c.ir_groups() or []))
        records = c.mode_records() or []
        totals['mode_records'] += len(records)
        totals['mode_records_with_a_program'] += sum(
            1 for r in records if c.screen_program(r.start + r.length) is not None)

    totals['containers'] = len(lab.CONTAINERS)
    return {k: str(v) for k, v in totals.items()}


def superseded_phrases():
    """The dead phrasings, read from the table in `reference/superseded.md`."""
    if not os.path.exists(SUPERSEDED):
        return []
    out = []
    for line in open(SUPERSEDED, encoding='utf-8'):
        if not line.startswith('| `'):
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) >= 2 and cells[0].startswith('`'):
            out.append((cells[0].strip('`'), cells[1]))
    return out


def check_numbers(facts, write, edits=None):
    """Compare every marked value against the computed fact. Returns a list of complaints.

    Under `--write`, every value this replaces is appended to `edits` rather than changed
    silently. A rewrite is the one operation here that can introduce drift instead of catching
    it: it happily updates a number whose surrounding prose or column heading states which
    finding produced it, and neither of those is something this tool can see. Reporting the
    edits is what turns that from a trap into a diff somebody reads.
    """
    problems = []
    for doc in documents():
        text = open(doc, encoding='utf-8').read()
        changed = text
        if len(ANY_MARKER.findall(text)) != len(MARKER.findall(text)):
            attached = {m.group(2) for m in MARKER.finditer(text)}
            for name in ANY_MARKER.findall(text):
                if name in attached:
                    attached.discard(name)
                    continue
                problems.append('%s: the `%s` marker has no number in front of it, so nothing '
                                'checks it' % (rel(doc), name))
        for value, name in MARKER.findall(text):
            if name not in facts:
                problems.append('%s: no such fact `%s`' % (rel(doc), name))
                continue
            want = facts[name]
            if value == want:
                continue
            if write:
                changed = changed.replace('%s<!--fact:%s-->' % (value, name),
                                          '%s<!--fact:%s-->' % (want, name))
                if edits is not None:
                    edits.append((rel(doc), name, value, want))
            else:
                problems.append('%s: %s says %s, the corpus says %s'
                                % (rel(doc), name, value, want))
        if write and changed != text:
            open(doc, 'w', encoding='utf-8').write(changed)
    return problems


def flatten(lines):
    """The document as one string, plus the line number owning each character.

    Searching line by line cannot see a phrase that wraps, and these documents wrap at about a
    hundred characters, so any phrase of more than a few words can hide in a line break. Measured
    on 8 August 2026, before this existed: two of seventeen occurrences in the tree were invisible,
    both of the same 29 character phrase, and one of them was a real restatement.
    """
    parts = []
    owner = []
    for i, line in enumerate(lines):
        text = line.strip()
        if parts:
            parts.append(' ')
            owner.append(i)
        parts.append(text)
        owner.extend([i] * len(text))
    return ''.join(parts), owner


def check_phrases():
    """A dead phrase may appear only inside a correction. Returns a list of complaints."""
    problems = []
    phrases = superseded_phrases()
    for doc in documents():
        if os.path.abspath(doc) == os.path.abspath(SUPERSEDED):
            continue
        lines = open(doc, encoding='utf-8').read().splitlines()
        flat, owner = flatten(lines)
        low = flat.lower()
        for phrase, killed_by in phrases:
            wanted = ' '.join(phrase.split()).lower()
            at = low.find(wanted)
            while at >= 0:
                first = owner[at]
                last = owner[min(at + len(wanted) - 1, len(owner) - 1)]
                span = lines[first:last + 1]
                # A correction may open on any line the phrase spans, the one before, or the one
                # after: a blockquote usually introduces the quoted claim on its own line first,
                # and an italic note usually follows the sentence it corrects.
                context = [line.lstrip() for line in span]
                if first:
                    context.append(lines[first - 1].lstrip())
                if last + 1 < len(lines):
                    context.append(lines[last + 1].lstrip())
                if not any(QUOTED in line for line in span) \
                        and not any(is_correction(c) for c in context):
                    problems.append('%s:%d: superseded by %s: "%s"'
                                    % (rel(doc), first + 1, killed_by, phrase))
                at = low.find(wanted, at + 1)
    return problems


def rel(path):
    return os.path.relpath(path, ROOT)


def main():
    write = '--write' in sys.argv[1:]
    facts = {}
    facts.update(corpus_facts())
    facts.update(coverage_facts())
    facts.update(emit_facts())
    facts.update(reading_facts())

    if '--list' in sys.argv[1:]:
        for name in sorted(facts):
            print('%-34s %s' % (name, facts[name]))
        return 0

    problems = []
    edits = []
    if facts:
        problems += check_numbers(facts, write, edits)
    else:
        print('facts: no lab or no node, so the numeric check was skipped')
    problems += check_phrases()

    # Every rewrite, named. A marker states what is true now, so a value moving is expected when a
    # finding lands and is a mistake at any other time, and neither the prose beside a number nor
    # the heading above it is something this tool can check. Read the list.
    for doc, name, was, now in edits:
        print('facts: rewrote %s in %s: %s -> %s' % (name, doc, was, now))
    if edits:
        print('facts: %d value(s) rewritten. Check the diff: a marked number is a claim about now,'
              % len(edits))
        print('facts: so a heading or a sentence that names an older finding is now wrong.')

    for p in problems:
        print('facts: %s' % p)
    if problems:
        print('facts: %d problem(s). `tools/facts.py --write` fixes the numeric ones.'
              % len(problems))
        return 1
    marked = sum(len(MARKER.findall(open(d, encoding='utf-8').read())) for d in documents())
    print('facts: %d marked value(s) agree, %d superseded phrase(s) absent'
          % (marked, len(superseded_phrases())))
    return 0


if __name__ == '__main__':
    sys.exit(main())
