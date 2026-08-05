#!/usr/bin/env python3
"""
Inventory the dumps in a lab directory.

The tool is generic and lives in the repository; the data it reads stays private. As dumps
arrive from more people this is how you see what the corpus actually contains, and more
usefully what it is missing: which architectures, which firmware versions, and which dumps
still have no description recorded.

That last column is the one to watch. Phase 1 needs labelled samples, and a dump whose
contributor has moved on is much harder to label later than one whose description was
captured on arrival.

Reads:
  * `*-info.txt`   concordance identity output, for the device details
  * `*.EZHex`      the config payload, parsed as a GSPM container
  * `META.md`      the provenance and description record, if present

Usage:
    corpus.py [lab_directory] [--json]

With no argument, uses HARMONY_LAB, or a `lab` directory alongside the repository.
"""
import json
import os
import re
import sys

import _bootstrap  # noqa: F401
from harmony import gspm

INFO_FIELDS = {
    'Model': 'model',
    'Skin': 'skin',
    'Firmware Version': 'firmware',
    'Hardware Version': 'hardware',
    'Architecture': 'arch',
    'External Flash': 'flash',
    'Config Flash Used': 'flash_used',
}
# A META.md counts as described once these placeholders are gone from its content section.
UNDESCRIBED_MARKERS = ('Not yet recorded', 'not yet recorded', '<')


def find_lab(argv):
    for a in argv[1:]:
        if not a.startswith('-'):
            return a
    if os.environ.get('HARMONY_LAB'):
        return os.environ['HARMONY_LAB']
    here = os.path.dirname(os.path.abspath(__file__))
    sibling = os.path.normpath(os.path.join(here, '..', '..', 'lab'))
    return sibling if os.path.isdir(sibling) else None


def parse_info(path):
    out = {}
    with open(path, encoding='utf-8', errors='replace') as fh:
        for line in fh:
            if ':' not in line:
                continue
            key, _, value = line.partition(':')
            key = key.strip()
            if key in INFO_FIELDS:
                out[INFO_FIELDS[key]] = value.strip()
    return out


def describe_config(path):
    """Parse the config payload of a dump, returning a summary or an error string."""
    try:
        with open(path, 'rb') as fh:
            data = fh.read()
        c = gspm.parse(data)
    except Exception as exc:                      # noqa: BLE001  report, do not crash
        return {'error': '%s: %s' % (type(exc).__name__, exc)}
    return {
        'payload_bytes': c.length,
        'flash_base': '0x%06X' % c.flash_base,
        'format': c.format_version,
        'pointer_slots': c.pointer_count,
        'lwjl_entries': len(c.keys),
        'checks_pass': c.all_checks_pass,
    }


def meta_state(directory):
    meta = os.path.join(directory, 'META.md')
    if not os.path.exists(meta):
        return 'no META.md'
    with open(meta, encoding='utf-8', errors='replace') as fh:
        text = fh.read()
    section = re.split(r'^##\s+What is in the config\s*$', text, flags=re.M)
    if len(section) < 2:
        return 'META.md, no description section'
    body = re.split(r'^##\s', section[1], flags=re.M)[0]
    if any(marker in body for marker in UNDESCRIBED_MARKERS):
        return 'META.md, NOT described'
    return 'described'


def scan(lab):
    dumps = []
    dumps_root = os.path.join(lab, 'dumps')
    root_to_walk = dumps_root if os.path.isdir(dumps_root) else lab
    for root, dirs, files in os.walk(root_to_walk):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        info = [f for f in files if f.endswith('-info.txt')]
        if not info:
            continue
        entry = {
            'path': os.path.relpath(root, lab),
            'contributor': os.path.basename(os.path.dirname(root)),
            'device': parse_info(os.path.join(root, info[0])),
            'meta': meta_state(root),
            'config': None,
        }
        cfg = [f for f in files if f.lower().endswith('.ezhex')]
        if cfg:
            entry['config'] = describe_config(os.path.join(root, cfg[0]))
        dumps.append(entry)
    return sorted(dumps, key=lambda d: d['path'])


def main():
    lab = find_lab(sys.argv)
    if not lab or not os.path.isdir(lab):
        sys.exit('no lab directory found; pass one, or set HARMONY_LAB')
    dumps = scan(lab)
    if '--json' in sys.argv:
        print(json.dumps({'lab': lab, 'dumps': dumps}, indent=2))
        return 0

    print('lab: %s' % lab)
    print('%d dump%s\n' % (len(dumps), '' if len(dumps) == 1 else 's'))
    if not dumps:
        print('Nothing found. Expected directories containing a concordance *-info.txt.')
        return 0

    header = '%-34s %-20s %-5s %-9s %-11s %s' % (
        'dump', 'model', 'arch', 'firmware', 'config', 'description')
    print(header)
    print('-' * len(header))
    for d in dumps:
        dev, cfg = d['device'], d['config'] or {}
        size = ('%d' % cfg['payload_bytes']) if 'payload_bytes' in cfg else (
            'parse failed' if cfg else 'none')
        print('%-34s %-20s %-5s %-9s %-11s %s' % (
            d['path'][:34], dev.get('model', '?')[:20], dev.get('arch', '?'),
            dev.get('firmware', '?'), size, d['meta']))

    print()
    for d in dumps:
        cfg = d['config'] or {}
        if 'error' in cfg:
            print('  %s: config parse failed: %s' % (d['path'], cfg['error']))
        elif cfg and not cfg.get('checks_pass'):
            print('  %s: config parsed but a consistency check failed' % d['path'])

    arches = sorted({d['device'].get('arch', '?') for d in dumps})
    undescribed = [d['path'] for d in dumps if d['meta'] != 'described']
    print('architectures covered: %s' % ', '.join(arches))
    if undescribed:
        print('without a recorded description (%d):' % len(undescribed))
        for p in undescribed:
            print('  %s' % p)
        print('\nA dump plus a description of what is in it is worth far more than a dump.')
        print('Ask while the contributor is still reachable.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
