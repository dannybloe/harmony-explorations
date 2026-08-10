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
  * `*.EZHex`      the config payload, parsed as a config container
  * `META.md`      the provenance and description record, if present

A dump directory normally has all three. Publicly shared sample configs arrive without a
concordance run attached, so a directory holding a config counts too, and the device details
then come out of the config's own XML header instead. **A config with no `META.md` beside it
counts as well**, and it used to be skipped: that is precisely the dump this tool exists to
report, and skipping it made the summary at the bottom say nothing was missing.

Usage:
    corpus.py [lab_directory] [--json]

With no argument, uses HARMONY_LAB, or a `lab` directory alongside the repository.
"""
import json
import os
import re
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile, gspm

# The XML header of a config declares what remote it was built for. Enough to fill the
# inventory when no concordance identity output came with the file.
HEADER_FIELDS = {'PROTOCOL': 'arch', 'SKIN': 'skin', 'BOARD': 'hardware', 'FLASH': 'flash'}

INFO_FIELDS = {
    'Model': 'model',
    'Skin': 'skin',
    'Firmware Version': 'firmware',
    'Hardware Version': 'hardware',
    'Architecture': 'arch',
    'External Flash': 'flash',
    'Config Flash Used': 'flash_used',
}
# A META.md counts as described once these template placeholders are gone from its content
# section, and once it does not say outright that nothing has been recorded. Code spans and
# fenced blocks are stripped before the check, because real content legitimately contains angle
# brackets, for example `<id>` in a variable name pattern.
#
# The undescribed marker is a **convention**, stated in `dumps/META-template.md`, rather than a
# guess at prose, and it has to be: "not recorded by the contributor" appears in the corpus's
# best documented dump, immediately before the description that was read out of the file
# instead. A looser match would report that one as undescribed.
UNDESCRIBED_MARKERS = ('Not yet recorded', 'not yet recorded')
PLACEHOLDER = re.compile(r'<[a-z][^>]{3,}>')          # prose placeholder like <make and model>
CODE_SPAN = re.compile(r'`[^`]*`|```.*?```', re.S)


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


def parse_config_header(path):
    """Device details out of a config's own XML header, for files with no info.txt."""
    out = {}
    try:
        with open(path, 'rb') as fh:
            ez = ezfile.parse_ezhex(fh.read(), os.path.basename(path))
    except Exception:                             # noqa: BLE001  best effort only
        return out
    for tag, key in HEADER_FIELDS.items():
        if tag in ez.intended_version:
            out[key] = ez.intended_version[tag]
    if 'arch' in out:
        out['model'] = 'unstated, protocol %s' % out['arch']
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
        'container': c.family.magic.decode(),
        'payload_bytes': c.length,
        'flash_base': '0x%06X' % c.flash_base,
        'format': c.format_version,
        'pointer_slots': c.pointer_count,
        'key_entries': len(c.keys),
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
    prose = CODE_SPAN.sub('', body)
    if any(marker in prose for marker in UNDESCRIBED_MARKERS) or PLACEHOLDER.search(prose):
        return 'META.md, NOT described'
    return 'described'


def scan(lab):
    dumps = []
    dumps_root = os.path.join(lab, 'dumps')
    root_to_walk = dumps_root if os.path.isdir(dumps_root) else lab
    for root, dirs, files in os.walk(root_to_walk):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        info = [f for f in files if f.endswith('-info.txt')]
        cfg = sorted(f for f in files if f.lower().endswith('.ezhex'))
        # A directory of configs is a dump whether or not anybody has written it up. The filter
        # here used to require a META.md alongside them, which **skipped exactly the case this
        # tool exists to report**: the kkong42 drop of 10 August 2026, eleven configs and no
        # write up, was invisible to `make corpus` while the summary line at the bottom said
        # nothing was missing. `meta_state` already has a value for the absence; it just was
        # never reached.
        if not info and not cfg:
            continue
        entry = {
            'path': os.path.relpath(root, lab),
            'contributor': os.path.basename(os.path.dirname(root)),
            'device': (parse_info(os.path.join(root, info[0])) if info
                       else parse_config_header(os.path.join(root, cfg[0]))),
            'identity_from': 'concordance' if info else 'config header',
            'meta': meta_state(root),
            'configs': len(cfg),
            'config': None,
        }
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

    header = '%-34s %-22s %-5s %-9s %-6s %-11s %s' % (
        'dump', 'model', 'arch', 'firmware', 'cont.', 'config', 'description')
    print(header)
    print('-' * len(header))
    for d in dumps:
        dev, cfg = d['device'], d['config'] or {}
        size = ('%d' % cfg['payload_bytes']) if 'payload_bytes' in cfg else (
            'parse failed' if cfg else 'none')
        if d.get('configs', 0) > 1:
            size += ' x%d' % d['configs']
        print('%-34s %-22s %-5s %-9s %-6s %-11s %s' % (
            d['path'][:34], dev.get('model', '?')[:22], dev.get('arch', '?'),
            dev.get('firmware', '?'), cfg.get('container', '?'), size, d['meta']))

    print()
    for d in dumps:
        cfg = d['config'] or {}
        if 'error' in cfg:
            print('  %s: config parse failed: %s' % (d['path'], cfg['error']))
        elif cfg and not cfg.get('checks_pass'):
            print('  %s: config parsed but a consistency check failed' % d['path'])

    arches = sorted({d['device'].get('arch', '?') for d in dumps},
                    key=lambda a: (not a.isdigit(), int(a) if a.isdigit() else a))
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
