#!/usr/bin/env python3
"""
Extract the infrared database out of a config: base slot 5, grouped, as pulse trains.

These are the codes for whatever equipment the config was built for, in microseconds, and they
are what nobody can regenerate now the servers are gone. `docs/findings.md` section 32.

The firmware routes four infrared encoding classes and durations are stored directly by one of
them, class 1, so a class 5 record on arch 9 (Harmony 525) yields nothing here and its dictionary
form is read by `packages/codec` instead. Records with no durations are reported rather than
dropped, because a silent count is how a partial extraction gets mistaken for a complete one.

**This used to print a bit count per record and no longer does**, section 139: turning durations
into a frame is `packages/codec/src/irframe.ts` and having a second decoder here made the two
disagree about 37 records of one arch 8 (Harmony 880) config. What it prints is the durations,
which is what the firmware sends.

Usage:  ir_extract.py <file> [--json] [--pulses]
"""
import json
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile, gspm


def extract(container):
    groups = container.ir_groups()
    if groups is None:
        return None
    out = []
    for index, addresses in enumerate(groups):
        codes = []
        for address in addresses:
            pulses = container.ir_pulses(address)
            blocks = container.ir_record_blocks(address)
            codes.append({
                'address': address,
                'class': container.ir_class(address),
                'blocks': blocks,
                'pulses': [{'mark': mark, 'us': us} for mark, us in pulses],
            })
        out.append({'group': index, 'codes': codes})
    return out


def _blocks(code):
    n = len(code['blocks'])
    return '1 block' if n == 1 else '%d blocks' % n


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    as_json = '--json' in sys.argv[2:]
    show_pulses = '--pulses' in sys.argv[2:]

    try:
        data = ezfile.decode_payload(ezfile.load_image(path)).payload
    except Exception:
        with open(path, 'rb') as fh:
            data = fh.read()
    container = gspm.parse(data)
    groups = extract(container)
    if groups is None:
        sys.exit('no infrared table: base slot 5 is absent or unreadable')

    if as_json:
        json.dump({'architecture': container.architecture, 'groups': groups},
                  sys.stdout, indent=2)
        print()
        return

    total = sum(len(g['codes']) for g in groups)
    with_durations = sum(1 for g in groups for c in g['codes'] if c['pulses'])
    print('architecture %s, %d groups, %d records, %d with durations'
          % (container.architecture, len(groups), total, with_durations))
    if with_durations < total:
        print('%d records use one of the other encoding classes and store no durations here'
              % (total - with_durations))
    for group in groups:
        codes = group['codes']
        print('\ngroup %d: %d records' % (group['group'], len(codes)))
        for code in codes:
            if not code['pulses']:
                print('  0x%06X  class %s, no durations, %s'
                      % (code['address'], code['class'], _blocks(code)))
                continue
            print('  0x%06X  class %s, %s, %d pulses in the first'
                  % (code['address'], code['class'], _blocks(code), len(code['pulses'])))
            if show_pulses:
                print('      ' + ' '.join(
                    '%s%d' % ('+' if p['mark'] else '-', p['us']) for p in code['pulses']))


main()
