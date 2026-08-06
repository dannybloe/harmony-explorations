#!/usr/bin/env python3
"""
Extract the infrared database out of a config: base slot 5, grouped, as pulse trains.

These are the codes for whatever equipment the config was built for, in microseconds, and they
are what nobody can regenerate now the servers are gone. `docs/findings.md` section 32.

Not every record decodes. The firmware routes four infrared encoding classes and this reads one
of them, so arch 9 configs yield nothing and arch 8 configs yield part of their database. Records
that do not frame are reported rather than dropped, because a silent count is how a partial
extraction gets mistaken for a complete one.

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
            frame = container.ir_frame(address)
            pulses = container.ir_pulses(address)
            codes.append({
                'address': address,
                'framed': frame is not None,
                'header_mark_us': frame[0] if frame else None,
                'header_space_us': frame[1] if frame else None,
                'bits': frame[2] if frame else None,
                'pulses': [{'mark': mark, 'us': us} for mark, us in pulses],
            })
        out.append({'group': index, 'codes': codes})
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    as_json = '--json' in sys.argv[2:]
    show_pulses = '--pulses' in sys.argv[2:]

    try:
        data = ezfile.decode_payload(ezfile.load_image(path)).payload
    except Exception:
        data = open(path, 'rb').read()
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
    framed = sum(1 for g in groups for c in g['codes'] if c['framed'])
    print('architecture %s, %d groups, %d records, %d decoded'
          % (container.architecture, len(groups), total, framed))
    if framed < total:
        print('%d records use one of the other encoding classes and are not decoded here'
              % (total - framed))
    for group in groups:
        codes = group['codes']
        print('\ngroup %d: %d records' % (group['group'], len(codes)))
        for code in codes:
            if not code['framed']:
                print('  0x%06X  not this encoding, %d pulses'
                      % (code['address'], len(code['pulses'])))
                continue
            print('  0x%06X  header %d/%d us, %d bits, %d pulses'
                  % (code['address'], code['header_mark_us'], code['header_space_us'],
                     code['bits'], len(code['pulses'])))
            if show_pulses:
                print('      ' + ' '.join(
                    '%s%d' % ('+' if p['mark'] else '-', p['us']) for p in code['pulses']))


main()
