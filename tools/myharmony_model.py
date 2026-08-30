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


def all_fields(entities, name):
    """Every field an entity actually has, **its own plus everything it inherits**.

    Bases first, so a field reads in the order a reader would expect, and a base's own bases before
    it. Nothing here deduplicates: no entity in this model redeclares an inherited name, and if one
    ever does, that is a fact worth seeing rather than hiding.

    **Reading `entity['fields']` alone is the bug this exists to stop**, found on 30 August 2026.
    `Device` extends `AbstractDevice` and declares 32 fields of its own, and the 17 it inherits
    include `Name`, `Model` and `Manufacturer`. So every drawing and every table built from the raw
    list showed a device with no name, and a note in `model.md` said the inter key delay fields were
    absent from the schema when they were sitting on the base class. Nobody spotted it for five
    days, because a table of 32 fields looks complete.
    """
    out = []
    for base in entities[name].get('extends', []):
        if base in entities:
            out.extend(all_fields(entities, base))
    return out + entities[name]['fields']


def diagram(entities):
    """The core cluster as a Mermaid entity relationship diagram."""
    drawn = [name for name in CORE if name in entities]
    lines = ['erDiagram']
    for name in sorted(drawn):
        lines.append('    %s {' % name)
        for field in all_fields(entities, name):
            kind = field['type'] + ('[]' if field['many'] else '')
            lines.append('        %s %s' % (SAFE.sub('_', kind), field['name']))
        lines.append('    }')
    inside = set(drawn)
    for name in sorted(drawn):
        for field in all_fields(entities, name):
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
    """Every service contract, by area, with **every field** rather than a count of them.

    This carried a field count per contract until 30 August 2026, which made it an index and not a
    reference: `AbstractActivityRole | 6 | 0` says a type exists and nothing about what it holds, so
    a reader who wanted to know what an activity role is had to open the JSON. Danny found the same
    gap from the other end, asking what `AbstractActivityAction` was, and the honest answer was that
    nothing here said. The counts are still in the per area summary, which is what an index is for.
    """
    areas = collections.defaultdict(list)
    without = []
    for name, entity in sorted(entities.items()):
        if not entity['isServiceContract']:
            continue
        (areas[entity['area']] if entity['area'] else without).append(name)

    subclasses = collections.defaultdict(list)
    for name, entity in sorted(entities.items()):
        for base in entity.get('extends', []):
            subclasses[base].append(name)

    fields = sum(len(entities[n]['fields']) for group in list(areas.values()) + [without]
                 for n in group)
    values = sum(len(entities[n]['values']) for group in list(areas.values()) + [without]
                 for n in group)
    contracts = sum(len(group) for group in list(areas.values()) + [without])

    out = ['# MyHarmony: every service contract, by area',
           '',
           '**Generated** by `tools/myharmony_model.py` from `docs/myharmony/model.json`, so it',
           'is never edited by hand. `docs/myharmony/model.md` is the reading; this is the',
           'reference, and it is complete: %d contracts, %d fields and %d enum values, every one'
           % (contracts, fields, values),
           'of them listed.',
           '',
           'A contract\'s area is the last part of the server side namespace it declares. The %d'
           % len(without),
           'contracts that declare none are listed at the end.',
           '']

    def entry(name):
        entity = entities[name]
        lines = ['### `%s`' % name, '']
        notes = []
        if entity.get('extends'):
            notes.append('extends %s' % ', '.join('`%s`' % b for b in entity['extends']))
        if subclasses.get(name):
            notes.append('extended by %d: %s'
                         % (len(subclasses[name]),
                            ', '.join('`%s`' % s for s in subclasses[name])))
        if entity['kind'] == 'enum':
            notes.append('an enumeration of %d values' % len(entity['values']))
        if not entity['fields'] and not entity['values']:
            notes.append('no fields of its own')
        if notes:
            lines.extend(['. '.join(n[0].upper() + n[1:] for n in notes) + '.', ''])
        own = {id(f) for f in entity['fields']}
        every = all_fields(entities, name)
        if every:
            lines.extend(['| field | type | from |', '|---|---|---|'])
            for field in every:
                owner = 'itself' if id(field) in own else 'inherited'
                lines.append('| `%s` | `%s%s` | %s |'
                             % (field['name'], field['type'],
                                '[]' if field['many'] else '', owner))
            lines.append('')
        if entity['values']:
            lines.extend(['Values: %s.' % ', '.join('`%s`' % v for v in entity['values']), ''])
        return lines

    for area in sorted(areas, key=lambda a: (-len(areas[a]), a)):
        out.append('## `%s`, %d contracts' % (area, len(areas[area])))
        out.append('')
        for name in areas[area]:
            out.extend(entry(name))
    out.append('## Declaring no area, %d contracts' % len(without))
    out.append('')
    for name in without:
        out.extend(entry(name))
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
