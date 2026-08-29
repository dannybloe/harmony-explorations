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

**Numbers.** Six of them were figures the test suites already pin, restated in prose: 20260<!--superseded-->
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
import collections
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


SKIP_DIRECTORIES = ('.git', 'node_modules', 'dist', '__pycache__')
# What the phrase check reads beyond the documents. Not the number check: a `fact:` marker belongs in
# prose, where a reader sees the value, and a source file that wanted one would be stating a corpus
# total in a comment instead of computing it.
SOURCE_SUFFIXES = ('.ts', '.py')


def _untracked():
    """Paths git reports as untracked, or an empty set where git cannot say.

    **Untracked files were being checked as published documents until 27 August 2026**, and the way
    that surfaced is worth keeping: this tool's own count moved by 26 on an unchanged commit, and 26
    is exactly how many `fact:` markers `CLAUDE.md` carries. An untracked `AGENTS.md` had appeared in
    the root, a copy of `CLAUDE.md` for a different agent, so every marker in it was counted twice.

    Two things were wrong with that and only one is cosmetic. The count is what a commit message
    quotes, so a duplicate makes it unreproducible. And the phrase check is a **gate**: the first time
    somebody sweeps `CLAUDE.md` for a superseded claim without sweeping the untracked copy beside it,
    `make facts` refuses the commit over a file that is not in the repository at all.

    Falls back to the whole walk when git is absent or this is not a checkout, because the phrase
    half has to run for anyone, and there a duplicate is the lesser problem than no check.
    """
    try:
        out = subprocess.run(['git', 'ls-files', '--others', '--exclude-standard'],
                             cwd=ROOT, capture_output=True, text=True, check=True)
    except (OSError, subprocess.CalledProcessError):
        return set()
    return {os.path.join(ROOT, line) for line in out.stdout.splitlines() if line}


def documents():
    """Every published markdown file: tracked, and not under .git or node_modules."""
    skip = _untracked()
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRECTORIES]
        for name in sorted(files):
            path = os.path.join(base, name)
            if name.endswith('.md') and path not in skip:
                yield path


def sources():
    """Every TypeScript and Python file, for the phrase check only.

    **The check walked `*.md` alone until 13 August 2026 and that was a hole**, section 139: the
    documents were protected from restating a dead claim and the code was not, while the code is where
    a claim does damage, because a comment stating a superseded reading is what the next person builds
    on. Twenty hits the day it was switched on, two of them in comments written that morning by the
    commit that superseded them.
    """
    skip = _untracked()
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRECTORIES]
        for name in sorted(files):
            path = os.path.join(base, name)
            if name.endswith(SOURCE_SUFFIXES) and path not in skip:
                yield path


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


def growth_facts():
    """What a length change would move, corpus wide. `docs/growing-a-config.md` quotes these.

    Shelled out for the reason the two above are: `packages/codec/src/growth.ts` is the one census
    of a container's addresses, and a second count here would be free to disagree with it.
    """
    try:
        out = subprocess.run(['node', 'packages/codec/bin/growth.ts'], cwd=ROOT,
                             capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.SubprocessError):
        return {}
    if out.returncode != 0:
        return {}
    for line in out.stdout.splitlines():
        parts = line.split()
        if not parts or parts[0] != 'TOTAL':
            continue
        pairs = parts[1:]
        return {'growth_' + pairs[i]: pairs[i + 1] for i in range(0, len(pairs) - 1, 2)}
    return {}


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


def text_facts():
    """How much of the corpus's on screen text reads back as characters.

    Shelled out for the same reason as the three above: `packages/codec/src/text.ts` is the one
    decoder and the one glyph shape table, and a Python copy of either would be free to disagree.
    """
    try:
        out = subprocess.run(['node', 'packages/codec/bin/text.ts'], cwd=ROOT,
                             capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.SubprocessError):
        return {}
    if out.returncode != 0:
        return {}
    found = {}
    for line in out.stdout.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[0] in ('text_read', 'text_glyphs',
                                           'text_referenced', 'text_draws'):
            found[parts[0]] = parts[1]
    return found


def activity_facts():
    """How many of the corpus's activities have a drawn name attributed to them.

    Shelled out for the same reason as the four above, and it is a number two documents quote: the
    naming rule in `packages/codec/src/inventory.ts` is the only thing that decides it, so a copy in
    Python would be free to disagree with the reader the application uses.
    """
    try:
        out = subprocess.run(['node', 'packages/codec/bin/activities.ts'], cwd=ROOT,
                             capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.SubprocessError):
        return {}
    if out.returncode != 0:
        return {}
    found = {}
    for line in out.stdout.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[0] in ('activities_named', 'activities_total'):
            found[parts[0]] = parts[1]
    return found


def device_facts():
    """How many of the corpus's devices have a name, and where the name came from.

    Shelled out like the rest, and the reason it is a fact rather than a sentence is that the routes
    are ranked: a run that names the same number of devices with more of them coming off the screen and
    fewer out of base slot 0 is a regression `make devices` shows and prose would hide.
    """
    try:
        out = subprocess.run(['node', 'packages/codec/bin/devices.ts'], cwd=ROOT,
                             capture_output=True, text=True, timeout=300)
    except (OSError, subprocess.SubprocessError):
        return {}
    if out.returncode != 0:
        return {}
    found = {}
    for line in out.stdout.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[0] in ('devices_named', 'devices_total'):
            found[parts[0]] = parts[1]
    return found


def contribution_facts():
    """What the corpus holds, per architecture, for the table in `README.md`.

    **Through `tools/corpus.py`'s own scan rather than a second walk of the dumps directory.** The
    front page invites strangers to contribute against these numbers, so a stale count is a worse
    failure here than anywhere else in the documents: it asks for something already held, or fails to
    ask for the one thing missing.
    """
    sys.path.insert(0, os.path.join(ROOT, 'tools'))
    try:
        import corpus
    except ImportError:
        return {}
    lab = os.environ.get('HARMONY_LAB') or os.path.join(ROOT, '..', 'lab')
    if not os.path.isdir(lab):
        return {}
    dumps = corpus.scan(lab)
    if not dumps:
        return {}
    # Strings, not ints: every other producer here hands back the text it read, and the checker
    # compares without coercing. An int passes `--list` and fails the check with a message that says
    # a number differs from itself.
    found = {
        'corpus_dumps': str(len(dumps)),
        'corpus_configs': str(sum(d['configs'] for d in dumps)),
        'corpus_contributors': str(len({d['contributor'] for d in dumps})),
    }
    per_architecture = {}
    for d in dumps:
        arch = (d.get('device') or {}).get('arch')
        if arch is None:
            continue
        seen = per_architecture.setdefault(str(arch), {'dumps': 0, 'configs': 0})
        seen['dumps'] += 1
        seen['configs'] += d['configs']
    for arch, seen in per_architecture.items():
        found['corpus_arch%s_dumps' % arch] = str(seen['dumps'])
        found['corpus_arch%s_configs' % arch] = str(seen['configs'])
    found['corpus_architectures'] = str(len(per_architecture))
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
    # **How many checks a container reports, which five documents quote in prose and which drifted.**
    # It was ten when the phrase was written and section 139 entry 21 took it to fourteen and entry
    # 22 to fifteen, with nothing to notice: a count of checks is a number about the code, so it
    # moves whenever somebody adds one and no test about the format can see it.
    #
    # **Two numbers, not one**, which computing it found: `key_table_is_complete` is gated on the
    # family carrying a key table after the marker, and `AHCM` does not, so the three arch 9
    # (Harmony 525) containers report one fewer. That is correct, a check that does not apply is
    # honestly absent, and it is why a single figure quoted in five documents was wrong twice over.
    by_key_table = {}
    for name in lab.CONTAINERS:
        c = gspm.parse(lab.load(name))
        by_key_table.setdefault(c.family.key_table_at_marker, set()).add(len(c.checks))
    if all(len(v) == 1 for v in by_key_table.values()) and len(by_key_table) == 2:
        totals['container_checks'] = by_key_table[True].pop()
        totals['container_checks_arch9'] = by_key_table[False].pop()
    return {k: str(v) for k, v in totals.items()}


def parseable_facts():
    """The population `docs/config-format.md` quotes about odd bodies, and why it is its own fact.

    The odd body sentence said "19 of the 33 parseable containers" while the test said 21 of 39 and
    then 22 of 41: it had drifted through two sample additions because it carried no marker, found on
    25 August 2026 while auditing what phase 7 should have touched. The population is everything in
    the lab that parses as a container, mirroring `parseable()` in `packages/codec/test/gspm.test.ts`,
    which is wider than `lab.CONTAINERS`: the calibration pair and the phase 7 pair are in it.
    """
    import lab
    from harmony import gspm

    if any(lab.path(n) is None for n in lab.IMAGES):
        return {}

    parsed = []
    for name in lab.IMAGES:
        # A fixture whose container is already counted under another name is skipped, or the totals
        # below count one config twice. Section 215; the list carries the reason per entry.
        if name in lab.PARSEABLE_EXCLUDED:
            continue
        try:
            parsed.append(gspm.parse(lab.load(name)))
        except Exception:
            pass  # not a container: the population is what parses, not what is named
    odd = [c for c in parsed if (len(c.blob) - gspm.TRAILER_CHECKSUM_OFFSET) % 2 == 1]
    return {
        'parseable_containers': str(len(parsed)),
        'parseable_odd_body': str(len(odd)),
        'odd_body_verifying': str(sum(1 for c in odd if c.checks['trailer_checksum_recomputes'])),
    }


def protocol_facts():
    """The shape of the infrared rhythm table, read out of the generated source.

    **Every one of these had drifted somewhere on 29 August 2026**, which is why they are facts now
    rather than numbers people retype. The tail count was 24 in `findings.md` and is 31; three
    documents and the generator template said three biphase families where there are four; and
    `status.md` called 38 entries 38 families, where one family appears at two carrier frequencies.
    None of them is a corpus total, so none was covered by anything here.

    Computed from `packages/codec/src/protocols.ts`, which is generated, so these track the
    generator rather than a hand written list. That is the point: a `--write` of the table moves
    them and `make facts` then names every document that has not kept up.
    """
    path = os.path.join(ROOT, 'packages', 'codec', 'src', 'protocols.ts')
    try:
        with open(path, encoding='utf-8') as fh:
            body = fh.read()
    except OSError:
        return {}
    try:
        table = body[body.index('export const PROTOCOLS'):]
    except ValueError:
        return {}
    rows = re.split(r'\n  \{', table)[1:]
    families = [m.group(1) for m in
                (re.search(r"family:\s*'([^']+)'", row) for row in rows) if m]
    return {
        'protocol_entries': str(len(rows)),
        'protocol_families': str(len(set(families))),
        'protocol_tails': str(sum(1 for row in rows if re.search(r'\btail:', row))),
        'protocol_biphase': str(sum(1 for row in rows if re.search(r'\bbiphase:', row))),
    }


def user_config_facts():
    """The totals `docs/config-format.md` quotes over `lab.USER_CONFIGS`, the fifteen user configs.

    **Every one of these had drifted**, and section 140 is the write up. The document said "ten
    configs across four architectures" in 23 places while the lab held fifteen, because eight test
    classes each carried their own literal and none of them was the document's. Widening the classes
    moved nine totals at once, so the totals are computed here rather than transcribed: a number
    nobody recomputes is a number that goes stale the next time a sample arrives, which is the whole
    argument this file opens with.

    One pass over the corpus, because parsing fifteen containers twice would double the cost of
    `make facts` for nothing.
    """
    import lab
    from harmony import gspm

    if any(lab.path(n) is None for n in lab.USER_CONFIGS):
        return {}

    totals = dict.fromkeys(
        ('ir_references', 'ir_groups', 'send_lists', 'high_band_uses', 'value_map_targets',
         'event_map_operands', 'compare_71_uses', 'compare_else_arms', 'compare_one_arm',
         'compare_arms'), 0)
    for name in lab.USER_CONFIGS:
        c = gspm.parse(lab.load(name))

        groups = c.ir_groups() or []
        totals['ir_groups'] += len(groups)
        totals['ir_references'] += sum(len(g) for g in groups)

        for m in (c.value_maps() or []):
            totals['value_map_targets'] += len(m.entries) + len(m.ranges)

        events = {i.operand for lst in (c.action_lists() or []) for i in lst if i.opcode == 0x7E}
        totals['event_map_operands'] += len(events)

        for lst in (c.action_lists() or []):
            opcodes = [i.opcode for i in lst]
            if gspm.OPCODE_SEND_IR in opcodes:
                totals['send_lists'] += 1
            for at, i in enumerate(lst):
                if i.opcode in (0x1F, 0x3F, 0x07, 0x0F) and i.operand >= 0xC000:
                    totals['high_band_uses'] += 1
                if i.opcode not in (0x70, 0x71):
                    continue
                if i.opcode == 0x71:
                    totals['compare_71_uses'] += 1
                arms = 2 if (i.operand >> 15) & 1 else 1
                totals['compare_arms'] += arms
                totals['compare_else_arms' if arms == 2 else 'compare_one_arm'] += 1
    totals['user_configs'] = len(lab.USER_CONFIGS)
    return {k: str(v) for k, v in totals.items()}


def superseded_phrases():
    """The dead phrasings, read from the table in `reference/superseded.md`."""
    if not os.path.exists(SUPERSEDED):
        return []
    out = []
    with open(SUPERSEDED, encoding='utf-8') as fh:
        superseded_lines = fh.read().splitlines(True)
    for line in superseded_lines:
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
        with open(doc, encoding='utf-8') as fh:
            text = fh.read()
        changed = text
        # **Counted, not a set of names**, which is a correction rather than a tidy-up. `attached` was
        # a set, so two properly attached uses of one fact in a document collapsed to one entry and
        # the second use was reported as unattached. The diagnostic then named an innocent site while
        # the real offender, a different fact somewhere else in the same file, went unnamed. It fires
        # exactly when a document uses one fact twice **and** has a genuinely detached marker
        # elsewhere, which is why it went unseen: the second condition is rare and the message is
        # believed. Found on 14 August 2026 while adding `container_checks`, which supplied the
        # detached marker. Same shape as the readers of section 139: a confident wrong answer where
        # the honest one is available.
        if len(ANY_MARKER.findall(text)) != len(MARKER.findall(text)):
            attached = collections.Counter(m.group(2) for m in MARKER.finditer(text))
            for name in ANY_MARKER.findall(text):
                if attached[name] > 0:
                    attached[name] -= 1
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
            with open(doc, 'w', encoding='utf-8') as fh:
                fh.write(changed)
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
    """A dead phrase may appear only inside a correction. Returns a list of complaints.

    Over the documents **and the source**, since section 139. A source file has no blockquote and no
    italic, so the only escape available there is the explicit `<!--superseded-->` token, which is
    ordinary text inside a comment: a correction in code says what the old reading was and why it is
    dead, and that token is what marks the quotation as deliberate.
    """
    problems = []
    phrases = superseded_phrases()
    for doc in list(documents()) + list(sources()):
        if os.path.abspath(doc) == os.path.abspath(SUPERSEDED):
            continue
        # **In source, only the explicit token counts**, and that is not strictness for its own sake:
        # every line of a JSDoc block begins with `*`, which `is_correction` reads as a markdown
        # bullet, so allowing the structural forms here makes the check pass on any comment in
        # `packages/`. Measured: it accepted a dead screen program count in `screen.ts` for exactly
        # that reason.
        structural = not doc.endswith(SOURCE_SUFFIXES)
        with open(doc, encoding='utf-8', errors='replace') as fh:
            lines = fh.read().splitlines()
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
                        and not (structural and any(is_correction(c) for c in context)):
                    problems.append('%s:%d: superseded by %s: "%s"'
                                    % (rel(doc), first + 1, killed_by, phrase))
                at = low.find(wanted, at + 1)
    return problems


def rel(path):
    return os.path.relpath(path, ROOT)


def main():
    write = '--write' in sys.argv[1:]
    facts = {}
    facts.update(contribution_facts())
    facts.update(corpus_facts())
    facts.update(coverage_facts())
    facts.update(emit_facts())
    facts.update(growth_facts())
    facts.update(reading_facts())
    facts.update(text_facts())
    facts.update(activity_facts())
    facts.update(device_facts())
    facts.update(parseable_facts())
    facts.update(user_config_facts())
    # Source derived rather than corpus derived, so it would happily run without a lab. It is added
    # only when the lab facts are present, because the numeric check is all or nothing: with a
    # partial dictionary every lab sourced marker reports "no such fact" and the lab-less run stops
    # skipping cleanly, which `make test-nolab` exists to prevent.
    if facts:
        facts.update(protocol_facts())

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
    # `with`, not a bare `open` in a generator: this walks every document and every source file, so
    # leaking a handle per file printed a screen of ResourceWarnings over the end of `make all`,
    # which is where anybody looking for a real warning would look.
    marked = 0
    for d in documents():
        with open(d, encoding='utf-8') as fh:
            marked += len(MARKER.findall(fh.read()))
    print('facts: %d marked value(s) agree, %d superseded phrase(s) absent'
          % (marked, len(superseded_phrases())))
    return 0


if __name__ == '__main__':
    sys.exit(main())
