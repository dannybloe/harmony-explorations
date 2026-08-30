#!/usr/bin/env python3
"""Render `docs/myharmony/model.md` to a PDF, with the entity diagram drawn into it.

**Graphviz lays the diagram out and Chrome sets the document.** Neither is an npm dependency and
neither touches the network; `dot` is a system tool and Chrome is the one already on the machine,
used exactly as `make page` uses it.

**The layout was hand written here until 30 August 2026 and that was the mistake worth recording.**
The tool drew its own boxes in columns and routed its own lines, because no Mermaid renderer was
installed and adding one meant pulling a headless browser through npm. What went unsaid was that a
graph layout engine is a solved problem with a packaged implementation, and writing a worse one is
not a way of avoiding a dependency. The hand written version put a relation line straight through
any box that stood between its two ends, was fixed once by reserving lanes between the columns, and
still read badly, because column assignment and edge routing are the easy half of a layout and
ranking and spacing are not. All of it is gone. `dot` does the ranking, the spacing and the routing.

What we still own is what the picture **says**: which entities are drawn, which fields carry a
relation, and what the cardinality on each one is. That is `diagram_dot`, and it is generated from
`docs/myharmony/model.json`, the same source as `docs/myharmony/core-model.mmd`. Where the
Mermaid file is for a tool to read, this is for a person to look at, with every field listed and each
line leaving the exact attribute that defines the relation.

The PDF is a build product. It is not committed, since it is fully derived from two files that are.
"""
import argparse
import collections
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
import myharmony_model  # noqa: E402  the model, the core cluster and the measured cardinality

DOCUMENT = os.path.join(ROOT, 'docs', 'myharmony', 'model.md')
OUTPUT = os.path.join(ROOT, 'docs', 'myharmony', 'model.pdf')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

#: Graphviz decides the ranking, the spacing and the routing, so what is left here is the palette
#: and the two knobs that say how much air the picture gets. Top to bottom rather than left to right
#: because the boxes are tall: `Device` and `Activity` carry about thirty fields each, and ranking
#: left to right stacks the whole model into one very long column.
DOT_RANKDIR = 'TB'
DOT_NODESEP = 0.5
DOT_RANKSEP = 1.1
HEAD_FILL, BODY_FILL, RULE = '#eef1f5', '#ffffff', '#d9dde3'
INK, MUTED, ACCENT, WIRE = '#16181d', '#5c6470', '#2f5d8f', '#8fa3ba'


def edges(entities, drawn):
    """The references between drawn entities: which field carries each one, and what it says.

    An `Id` field is not a relation to draw. `Account.AccountId` names the record's own key, so
    drawing it would give most boxes a spurious line back to themselves or their parent.

    `MEASURED` overrides what the schema states, because the schema cannot state it: an account
    record holds exactly one remote, which was measured against live replies rather than read out
    of the contract.
    """
    out = []
    for name in drawn:
        # Inherited fields count. `Device` gets `Name`, `Model` and its whole timing block from
        # `AbstractDevice`, and reading the raw list drew a device box with no name in it.
        for field in myharmony_model.all_fields(entities, name):
            if field['type'] not in drawn or myharmony_model.IDENTIFIER.match(field['name']):
                continue
            measured = myharmony_model.MEASURED.get((name, field['name'])) is not None
            says = 'exactly 1' if measured else ('0..n' if field['many'] else '0..1')
            out.append((name, field['name'], field['type'], says, measured))
    return out


def node_label(name, fields, carries):
    """One entity as a graphviz HTML label: a header row, then a row per field.

    Every field row carries a `PORT`, which is what lets an edge leave the **attribute that defines
    the relation** rather than the box outline. The rows that do so are shaded, so where a line
    starts can be seen without following it back.
    """
    rows = ['<TR><TD COLSPAN="2" BGCOLOR="%s" ALIGN="LEFT">'
            '<FONT COLOR="%s" POINT-SIZE="12"><B>%s</B></FONT></TD></TR>'
            % (HEAD_FILL, ACCENT, html.escape(name))]
    for field in fields:
        kind = field['type'] + ('[]' if field['many'] else '')
        shade = ' BGCOLOR="#f4f7fb"' if field['name'] in carries else ''
        rows.append('<TR><TD PORT="%s" ALIGN="LEFT"%s>'
                    '<FONT COLOR="%s" POINT-SIZE="9">%s</FONT></TD>'
                    '<TD ALIGN="RIGHT"%s><FONT COLOR="%s" POINT-SIZE="9">%s</FONT></TD></TR>'
                    % (field['name'], shade, INK, html.escape(field['name']),
                       shade, MUTED, html.escape(kind)))
    return ('<<TABLE BORDER="1" COLOR="%s" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3" '
            'BGCOLOR="%s">%s</TABLE>>' % (RULE, BODY_FILL, ''.join(rows)))


def activity_cluster(entities):
    """`Activity` with the two type families it holds, which the core diagram cannot show.

    The core diagram draws `Activity` with `EnterActions`, `LeaveActions` and `Roles` in it and
    stops, because their types are not core entities. That is exactly the hole Danny found: the
    picture named `AbstractActivityAction` and `AbstractActivityRole` and drew neither. This is the
    second drawing, and its subject is what an activity **does**.

    Rank left to right here rather than top to bottom, the opposite of the core diagram, because the
    shape is the opposite: one tall box fanning out to twenty five short ones.
    """
    drawn = ['Activity', 'ActivityInputState', 'AbstractActivityRole', 'AbstractActivityAction']
    drawn.extend(sorted(n for n in entities
                        if 'AbstractActivityAction' in entities[n].get('extends', [])))
    return [n for n in drawn if n in entities]


def button_cluster(entities):
    """The button and function map cluster: which button sends what.

    Nothing here is reachable from `Household`, because a map names its remote by identifier rather
    than holding a reference, so the core diagram cannot reach it however far it walks. That is why
    31 types stayed undrawn and undescribed while the account side was documented twice.
    """
    roots = ('AbstractButtonMap', 'AbstractRemoteButton', 'AbstractButtonAction',
             'AbstractFunctionMap', 'FunctionBase')
    drawn = ['MapList', 'FunctionList', 'Sequence', 'MenuItem', 'HomeControlTarget']
    for base in roots:
        drawn.append(base)
        drawn.extend(sorted(n for n in entities if base in entities[n].get('extends', [])))
    # `HardRemoteButton` has subclasses of its own, so one more level or they vanish.
    drawn.extend(sorted(n for n in entities
                        if 'HardRemoteButton' in entities[n].get('extends', [])))
    seen = []
    for n in drawn:
        if n in entities and n not in seen:
            seen.append(n)
    return seen


def catalogue_cluster(entities):
    """The device catalogue's infrared half, which is the part this project has a stake in.

    The whole cluster is 75 types and about half of it is search criteria, one class per way of
    asking, which says nothing about the hardware. Drawn here is what describes a code: the protocol
    families and the pieces `IrProtocol` is built from. The criteria classes are listed in the
    document and in `entities.md` rather than drawn, because 30 boxes that differ only in which
    field they filter on is a picture that hides its own subject.
    """
    drawn = ['IrProtocol', 'AbstractProtocol']
    drawn.extend(sorted(n for n in entities if 'AbstractProtocol' in entities[n].get('extends', [])))
    drawn.extend(['IRSegment', 'CodeSegment', 'IREncoding', 'ParsedKeyCode', 'Payload', 'Segment',
                  'Atom', 'KeyCodeElement', 'ProtocolRelation', 'GlobalLanguageKeyCode'])
    return [n for n in drawn if n in entities]


def role_vocabulary(entities):
    """The 22 role types as **one** box rather than 22, and why that is not a cheat.

    Drawn as siblings they are 22 nodes in a single rank, which graphviz spreads to 8635 pixels
    across or 6061 down depending on which way it is ranked. Both were measured and both are
    unreadable.

    Collapsing them is honest because of what they are: 21 of the 22 declare no field at all, so
    each box would contain nothing but its own name. A box per marker type shows the same
    information as a list of names and costs a picture nobody can read. The document says to read
    them as a vocabulary; this makes the drawing agree with it.

    `PowerInputActivityRole` is the one that does declare a field, so it is marked in the list
    rather than silently flattened with the rest.
    """
    return sorted(n for n in entities
                  if 'AbstractActivityRole' in entities[n].get('extends', []))


def inheritance_edges(entities, drawn):
    """Which drawn types extend which other drawn type.

    The core diagram has no need of these: nothing in it inherits from anything else in it. Here
    they are most of the picture, so they are drawn, and deliberately in a different hand from a
    field reference. A hollow head and a dashed line is the usual notation for "is a", and mixing
    the two kinds of arrow without distinguishing them would say an activity **holds** twenty two
    roles when what it holds is a list of one of them.
    """
    out = []
    for name in drawn:
        for base in entities[name].get('extends', []):
            if base in drawn:
                out.append((name, base))
    return out


def vocabulary_label(title, names, note_for):
    """A box that is a list of type names rather than an entity, labelled as one."""
    rows = ['<TR><TD BGCOLOR="%s" ALIGN="LEFT"><FONT COLOR="%s" POINT-SIZE="12"><B>%s</B></FONT>'
            '</TD></TR>' % (HEAD_FILL, ACCENT, html.escape(title))]
    for name in names:
        mark = '  *' if name in note_for else ''
        rows.append('<TR><TD ALIGN="LEFT"><FONT COLOR="%s" POINT-SIZE="9">%s%s</FONT></TD></TR>'
                    % (INK, html.escape(name), mark))
    rows.append('<TR><TD ALIGN="LEFT"><FONT COLOR="%s" POINT-SIZE="8">'
                '* declares a field of its own; the rest carry none</FONT></TD></TR>' % MUTED)
    return ('<<TABLE BORDER="1" COLOR="%s" CELLBORDER="0" CELLSPACING="0" CELLPADDING="3" '
            'BGCOLOR="%s">%s</TABLE>>' % (RULE, BODY_FILL, ''.join(rows)))


def diagram_dot(entities, drawn=None, rankdir=None, vocabulary=None, nodesep=None):
    """A cluster as graphviz source. This is the whole of what the tool still decides."""
    drawn = [n for n in myharmony_model.CORE if n in entities] if drawn is None else drawn
    relations = edges(entities, set(drawn))
    carries = collections.defaultdict(set)
    for source, field, _target, _says, _measured in relations:
        carries[source].add(field)

    lines = ['digraph myharmony {',
             '  rankdir=%s; nodesep=%.2f; ranksep=%.2f; pad=0.3; splines=spline;'
             % (rankdir or DOT_RANKDIR, DOT_NODESEP if nodesep is None else nodesep,
                DOT_RANKSEP),
             '  graph [fontname="Helvetica"];',
             '  node [shape=plaintext fontname="Helvetica"];',
             '  edge [color="%s" fontname="Helvetica" fontsize=9 fontcolor="%s" arrowsize=0.7];'
             % (WIRE, MUTED)]
    for name in drawn:
        lines.append('  %s [label=%s];'
                     % (name, node_label(name, myharmony_model.all_fields(entities, name),
                                         carries[name])))
    for source, field, target, says, measured in relations:
        weight = ' penwidth=2 color="%s" fontcolor="%s"' % (ACCENT, ACCENT) if measured else ''
        # The port names the row, and the compass point is deliberately **not** pinned to `:e`.
        # Forcing every line out of the east side makes one double back around the box it just
        # left whenever its target sits below and to the left, which it does for `Activity` and
        # for three of `Account`'s. Letting graphviz pick the side removed all of those.
        lines.append('  %s:%s -> %s [label="%s"%s];' % (source, field, target, says, weight))
    for name, base in inheritance_edges(entities, set(drawn)):
        lines.append('  %s -> %s [style=dashed arrowhead=onormal color="%s" '
                     'constraint=true];' % (name, base, WIRE))
    if vocabulary is not None:
        node, title, names, base, note_for = vocabulary
        lines.append('  %s [label=%s];' % (node, vocabulary_label(title, names, note_for)))
        lines.append('  %s -> %s [style=dashed arrowhead=onormal color="%s" label="%d types"'
                     ' fontsize=9 fontcolor="%s"];' % (node, base, WIRE, len(names), MUTED))
    lines.append('}')
    return '\n'.join(lines)


def run_dot(entities, form, drawn=None, rankdir=None, vocabulary=None, nodesep=None):
    """Hand the diagram to graphviz and return the bytes it produces.

    **There is deliberately no fallback layout.** A second implementation kept for the case where
    `dot` is absent is two copies of the same derivation, which is the state this repository refuses
    everywhere else, and the copy nobody looks at is the one that rots. Missing graphviz is reported
    as what it is.
    """
    program = shutil.which('dot')
    if program is None:
        raise SystemExit('graphviz is not installed, so there is no diagram. '
                         'Install it with `brew install graphviz`.')
    source = diagram_dot(entities, drawn=drawn, rankdir=rankdir,
                         vocabulary=vocabulary, nodesep=nodesep).encode('utf-8')
    done = subprocess.run([program, '-T%s' % form], input=source,
                          capture_output=True, timeout=120)
    if done.returncode:
        raise SystemExit('dot failed: %s' % done.stderr.decode('utf-8', 'replace').strip())
    return done.stdout


#: Every drawing this tool makes, in one table, because a flag per cluster and a branch per flag is
#: how the third one gets its settings wrong. Each row is the selector, the rank direction and the
#: node spacing, since those two are per picture: a cluster of tall boxes and a cluster of thirty
#: short ones want opposite answers, and both were measured rather than guessed.
CLUSTERS = {
    'core': (None, 'TB', DOT_NODESEP, None, 'core-model.pdf'),
    'activity': ('activity_cluster', 'TB', DOT_NODESEP, 'roles', 'activity-model.pdf'),
    'buttons': ('button_cluster', 'LR', 0.20, None, 'button-model.pdf'),
    'catalogue': ('catalogue_cluster', 'TB', DOT_NODESEP, None, 'catalogue-model.pdf'),
}


def cluster_options(entities, name):
    """The selector, rank direction, spacing and vocabulary box for one drawing."""
    selector, rankdir, nodesep, vocabulary, _out = CLUSTERS[name]
    drawn = None if selector is None else globals()[selector](entities)
    box = None
    if vocabulary == 'roles':
        names = role_vocabulary(entities)
        box = ('ActivityRoleTypes', 'The %d role types' % len(names), names,
               'AbstractActivityRole', {'PowerInputActivityRole'})
    return drawn, rankdir, nodesep, box


def diagram_svg(entities):
    """The diagram as SVG, for embedding in the document's own page."""
    svg = run_dot(entities, 'svg').decode('utf-8')
    # Graphviz emits an XML prologue and a DOCTYPE, neither of which is legal inside an HTML body,
    # and a width and height in points, which would stop the drawing scaling to the page.
    svg = svg[svg.index('<svg'):]
    return re.sub(r'\swidth="\d+pt"\s+height="\d+pt"', ' width="100%"', svg, count=1)


INLINE = (
    (re.compile(r'`([^`]+)`'), lambda m: '<code>%s</code>' % html.escape(m.group(1))),
    (re.compile(r'\*\*([^*]+)\*\*'), lambda m: '<strong>%s</strong>' % m.group(1)),
    (re.compile(r'(?<!\*)\*([^*]+)\*(?!\*)'), lambda m: '<em>%s</em>' % m.group(1)),
)


def inline(text):
    """Escape, then apply the small inline subset these documents actually use."""
    out = html.escape(text)
    out = re.sub(r'&lt;!--[^&]*--&gt;', '', out)          # the fact and superseded markers
    for pattern, repl in INLINE:
        out = pattern.sub(repl, out)
    return out


def markdown(text):
    """A converter for the subset `docs/` is written in: headings, paragraphs, lists, tables."""
    out, paragraph, table = [], [], []

    def flush_paragraph():
        if paragraph:
            out.append('<p>%s</p>' % inline(' '.join(paragraph)))
            paragraph.clear()

    def flush_table():
        if not table:
            return
        head, rows = table[0], [r for r in table[1:] if set(''.join(r)) - set('-: ')]
        out.append('<table><thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (
            ''.join('<th>%s</th>' % inline(c) for c in head),
            ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % inline(c) for c in r) for r in rows)))
        table.clear()

    item = []          # the bullet being built, since these documents wrap them over several lines

    def flush_item():
        if item:
            out.append('<li>%s</li>' % inline(' '.join(item)))
            item.clear()

    for line in text.splitlines():
        stripped = line.strip()
        indented = line[:1] in (' ', '\t')
        if stripped.startswith('|'):
            flush_item()
            flush_paragraph()
            table.append([c.strip() for c in stripped.strip('|').split('|')])
            continue
        flush_table()
        if not stripped:
            flush_item()
            flush_paragraph()
        elif stripped.startswith('#'):
            flush_item()
            flush_paragraph()
            level = len(stripped) - len(stripped.lstrip('#'))
            out.append('<h%d>%s</h%d>' % (level, inline(stripped[level:].strip()), level))
        elif stripped.startswith('* '):
            flush_item()
            flush_paragraph()
            item.append(stripped[2:])
        elif item and indented:
            item.append(stripped)          # a continuation of the bullet above
        else:
            flush_item()
            paragraph.append(stripped)
    flush_item()
    flush_paragraph()
    flush_table()
    body = '\n'.join(out)
    return re.sub(r'(?:<li>.*?</li>\n?)+', lambda m: '<ul>%s</ul>' % m.group(0), body, flags=re.S)


STYLE = """
:root { --ink:#16181d; --muted:#5c6470; --rule:#d9dde3; --edge:#7a8492; --head:#eef1f5;
        --accent:#1f4d7a; --bg:#ffffff; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--ink); margin: 0;
       font: 10.5pt/1.55 "Iowan Old Style", Palatino, Georgia, serif; }
main { padding: 0 4mm; }
h1 { font-size: 21pt; line-height: 1.2; margin: 0 0 4mm; letter-spacing: -0.01em; }
h2 { font-size: 14pt; margin: 9mm 0 2.5mm; padding-bottom: 1.4mm;
     border-bottom: 1px solid var(--rule); break-after: avoid; }
h3 { font-size: 11.5pt; margin: 6mm 0 2mm; color: var(--accent); break-after: avoid; }
p, li { margin: 0 0 2.6mm; }
ul { margin: 0 0 3mm; padding-left: 5mm; }
code { font: 9pt/1.4 "SF Mono", Menlo, monospace; background: #f2f4f7; padding: 0.3mm 1mm;
       border-radius: 2px; }
strong { font-weight: 600; }
table { border-collapse: collapse; width: 100%; margin: 0 0 4mm; font-size: 9pt;
        break-inside: avoid; }
th { text-align: left; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em;
     color: var(--muted); border-bottom: 1px solid var(--rule); padding: 1.4mm 2mm; }
td { border-bottom: 1px solid #eef0f3; padding: 1.4mm 2mm; vertical-align: top; }
td:not(:first-child) { font-variant-numeric: tabular-nums; }
figure { margin: 4mm 0 6mm; break-inside: avoid; }
figcaption { font-size: 8.5pt; color: var(--muted); margin-top: 2mm; }
svg { width: 100%; height: auto; }
@page { size: A3 portrait; margin: 14mm 12mm; }
@page :first { margin-top: 18mm; }
"""


#: Stands in for the diagram while the markdown is converted.
#:
#: The figure has to be spliced in **after** conversion, not before: `markdown` escapes everything it
#: is given, which is what it is for, so raw SVG handed to it comes out the other side as text. The
#: first version did exactly that and produced a twelve page PDF with no diagram in it.
PLACEHOLDER = 'DIAGRAMGOESHERE'


def build_html(entities):
    text = open(DOCUMENT, encoding='utf-8').read()
    marker = '\n## The shape\n'
    if marker not in text:
        raise SystemExit('no "## The shape" heading in %s, so there is nowhere to put the diagram'
                         % os.path.relpath(DOCUMENT, ROOT))
    at = text.index(marker) + len(marker)
    end = text.index('\n### ', at)
    text = text[:end] + '\n\n' + PLACEHOLDER + '\n\n' + text[end:]

    body = markdown(text)
    figure = ('<figure>%s<figcaption>The entity cluster an account holds, generated from '
              'docs/myharmony/model.json. A heavy edge is a cardinality measured from captures '
              'rather than read from the schema.</figcaption></figure>' % diagram_svg(entities))
    if PLACEHOLDER not in body:
        raise SystemExit('the placeholder did not survive conversion, so the diagram would be lost')
    body = body.replace('<p>%s</p>' % PLACEHOLDER, figure).replace(PLACEHOLDER, figure)
    return ('<!doctype html><html><head><meta charset="utf-8"><title>MyHarmony data model</title>'
            '<style>%s</style></head><body><main>%s</main></body></html>'
            % (STYLE, body))




def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--out')
    parser.add_argument('--html', action='store_true', help='keep the intermediate HTML beside it')
    parser.add_argument('--diagram', action='store_true',
                        help='the core entity diagram alone, beside the .mmd')
    parser.add_argument('--cluster', choices=sorted(CLUSTERS),
                        help='draw one cluster of the model rather than the document')
    args = parser.parse_args(argv)
    cluster = args.cluster or ('core' if args.diagram else None)
    if args.out is None:
        args.out = (os.path.join(ROOT, 'docs', 'myharmony', CLUSTERS[cluster][4])
                    if cluster else OUTPUT)

    entities = myharmony_model.model()['entities']
    if cluster:
        # Graphviz writes the PDF itself, so the drawing never passes through a browser and there is
        # no page to cut to fit: `dot` sizes the sheet to the graph. That removes the whole class of
        # defect the old route kept producing, where a caption of a guessed height or an `@page`
        # rule the document set for its own title page pushed the drawing onto a second sheet.
        drawn, rankdir, nodesep, box = cluster_options(entities, cluster)
        with open(args.out, 'wb') as handle:
            handle.write(run_dot(entities, 'pdf', drawn=drawn, rankdir=rankdir,
                                 vocabulary=box, nodesep=nodesep))
        print('%s, %.0f KB' % (os.path.relpath(args.out, ROOT), os.path.getsize(args.out) / 1024))
        return 0

    chrome = CHROME if os.path.exists(CHROME) else shutil.which('google-chrome') or shutil.which('chromium')
    if not chrome:
        print('no Chrome found, so no PDF. The document is docs/myharmony/model.md.')
        return 1
    page = build_html(entities)
    if args.html:
        with open(os.path.splitext(args.out)[0] + '.html', 'w', encoding='utf-8') as handle:
            handle.write(page)
    with tempfile.TemporaryDirectory() as work:
        source = os.path.join(work, 'model.html')
        with open(source, 'w', encoding='utf-8') as handle:
            handle.write(page)
        subprocess.run(
            [chrome, '--headless', '--disable-gpu', '--no-pdf-header-footer',
             '--print-to-pdf=%s' % args.out, 'file://%s' % source],
            check=True, capture_output=True, timeout=180,
        )
    print('%s, %.0f KB' % (os.path.relpath(args.out, ROOT), os.path.getsize(args.out) / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
