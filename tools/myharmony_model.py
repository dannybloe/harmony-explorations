#!/usr/bin/env python3
"""Draw the recovered MyHarmony model: the core entity diagram and the full entity listing.

Both outputs are **generated** from `docs/myharmony/model.json` and never edited by hand, the
same arrangement as `reference/silhouettes/`. That is the point of them living here rather than in
the lab: a picture of the model that somebody maintains by hand is a second copy of a derivation, and
this repository's oldest rule is that two copies are two copies until one of them moves.

Two outputs, because 1352 types in one diagram is a picture nobody can read:

* `docs/myharmony/core-model.mmd`, the cluster an account actually holds, reached by following
  references out from `Household`, with the identifier wrapper types left out. Those wrappers,
  `DeviceId` and `AccountId` and the rest, are the most connected nodes in the whole graph and carry
  no fields at all, so drawing them buries the shape rather than showing it;
* `docs/myharmony/entities.md`, every service contract grouped by the area its own namespace
  declares, with a field count each. That is what 470 contracts can usefully be on a page.

`--write` regenerates both; without it the files are checked and any difference is reported, which is
what `tests/test_myharmony_model.py` runs so a hand edit dies at the next check.
"""
import argparse
import collections
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL = os.path.join(ROOT, 'docs', 'myharmony', 'model.json')
DIAGRAM = os.path.join(ROOT, 'docs', 'myharmony', 'core-model.mmd')
LISTING = os.path.join(ROOT, 'docs', 'myharmony', 'entities.md')

#: The cluster worth drawing. `Household` is the root and was missing from the first version of this
#: diagram, which started at `Account` and so drew the shape one level short.
CORE = ('Household', 'Account', 'Remote', 'Device', 'Activity', 'Surface', 'Room',
        'AccountProperties', 'RemoteProperties', 'Dongle', 'SetupSession', 'ActivityGroup')

#: Cardinality the **schema** cannot state, measured from captures instead.
#:
#: The schema types `Account.Remotes` as a list, so drawn from the schema alone the diagram says an
#: account may hold any number of remotes. It holds exactly one, on all 21 account records in the two
#: households captured on 30 August 2026, and `AnAccountRecordIsOneRemotesWorld` in
#: `tests/test_myharmony_model.py` is what keeps that honest. Drawing the list cardinality here was
#: what let a wrong reading of the model's shape stand for a day, so the measurement is drawn.
MEASURED = {('Account', 'Remotes'): ('||--||', 'Remotes, exactly one, measured')}

IDENTIFIER = re.compile(r'^(?:[A-Za-z]+)?Id$')
SAFE = re.compile(r'[^A-Za-z0-9_]')


def model():
    with open(MODEL, encoding='utf-8') as handle:
        return json.load(handle)


def diagram(entities):
    """The core cluster as a Mermaid entity relationship diagram."""
    drawn = [name for name in CORE if name in entities]
    lines = ['erDiagram']
    for name in sorted(drawn):
        lines.append('    %s {' % name)
        for field in entities[name]['fields']:
            kind = field['type'] + ('[]' if field['many'] else '')
            lines.append('        %s %s' % (SAFE.sub('_', kind), field['name']))
        lines.append('    }')
    inside = set(drawn)
    for name in sorted(drawn):
        for field in entities[name]['fields']:
            if field['type'] not in inside or IDENTIFIER.match(field['name']):
                continue
            override = MEASURED.get((name, field['name']))
            if override is not None:
                card, label = override
                lines.append('    %s %s %s : "%s"' % (name, card, field['type'], label))
            else:
                card = '||--o{' if field['many'] else '||--o|'
                lines.append('    %s %s %s : %s' % (name, card, field['type'], field['name']))
    return '\n'.join(lines) + '\n'


def listing(entities):
    """Every service contract, by the area its namespace declares, with a field count each."""
    areas = collections.defaultdict(list)
    without = []
    for name, entity in sorted(entities.items()):
        if not entity['isServiceContract']:
            continue
        (areas[entity['area']] if entity['area'] else without).append(name)

    out = ['# MyHarmony: every service contract, by area',
           '',
           '**Generated** by `tools/myharmony_model.py` from `docs/myharmony/model.json`, so it',
           'is never edited by hand. `docs/myharmony/model.md` is the reading; this is the index.',
           '',
           'A contract\'s area is the last part of the server side namespace it declares. The %d'
           % len(without),
           'contracts that declare none are listed at the end.',
           '']
    for area in sorted(areas, key=lambda a: (-len(areas[a]), a)):
        out.append('## `%s`, %d contracts' % (area, len(areas[area])))
        out.append('')
        out.append('| contract | fields | enum values |')
        out.append('|---|---|---|')
        for name in areas[area]:
            entity = entities[name]
            out.append('| `%s` | %d | %d |'
                       % (name, len(entity['fields']), len(entity['values'])))
        out.append('')
    out.append('## Declaring no area, %d contracts' % len(without))
    out.append('')
    out.append('| contract | fields | enum values |')
    out.append('|---|---|---|')
    for name in without:
        entity = entities[name]
        out.append('| `%s` | %d | %d |' % (name, len(entity['fields']), len(entity['values'])))
    out.append('')
    return '\n'.join(out)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--write', action='store_true',
                        help='regenerate the files instead of checking them')
    args = parser.parse_args(argv)

    entities = model()['entities']
    wanted = {DIAGRAM: diagram(entities), LISTING: listing(entities)}

    stale = []
    for path, text in wanted.items():
        if args.write:
            with open(path, 'w', encoding='utf-8') as handle:
                handle.write(text)
            print('wrote %s, %d lines' % (os.path.relpath(path, ROOT), text.count('\n')))
            continue
        try:
            with open(path, encoding='utf-8') as handle:
                current = handle.read()
        except FileNotFoundError:
            current = None
        if current != text:
            stale.append(os.path.relpath(path, ROOT))

    if stale:
        print('stale, run `make myharmony-model`: %s' % ', '.join(stale))
        return 1
    if not args.write:
        print('myharmony model: both generated files agree with docs/myharmony/model.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
