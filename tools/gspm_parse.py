#!/usr/bin/env python3
"""
Parser for the Logitech Harmony GSPM config container (architectures 12 and 14).

Everything is derived from the file itself, so no arguments beyond the filename:

  * the blob is located by its "GSPM" magic and its trailing "PTYY" end marker
  * the flash base address the blob was linked for is recovered from the header's
    absolute end_addr field:   base = end_addr - (PTYY_offset - GSPM_offset)
  * the pointer table length is recovered from where the first section magic sits:
    count = (LWJL_offset - 3 - 0x0C) / 4       (21 on arch 12, 19 on arch 14)

Accepts either a bare blob (Region_3.EZHex payload, an EZHex payload) or a raw
flash dump with the blob somewhere inside it (concordance safe.bin).

Usage:  gspm_parse.py <file> [--json]
"""
import struct, sys, json

def parse(data):
    start = data.find(b'GSPM')
    if start < 0:
        raise ValueError('no GSPM magic found')
    end_marker = data.find(b'PTYY', start)
    if end_marker < 0:
        raise ValueError('no PTYY end marker found after GSPM')

    blob = data[start:end_marker + 4]
    end_addr, fmt = struct.unpack_from('<II', blob, 4)
    base = end_addr - (end_marker - start)

    lwjl = blob.find(b'LWJL')
    if lwjl < 0:
        raise ValueError('no LWJL section magic found')
    n_ptr = (lwjl - 3 - 0x0C) // 4
    ptrs = struct.unpack_from('<%dI' % n_ptr, blob, 0x0C)

    out = {
        'file_offset_of_blob': start,
        'blob_length': len(blob),
        'flash_base': base,
        'end_addr': end_addr,
        'format_version': '%d.%d' % (fmt >> 12, (fmt >> 8) & 0xF),
        'format_raw': fmt,
        'pointer_count': n_ptr,
        'lwjl_offset': lwjl,
        'padding_before_lwjl': blob[lwjl - 3:lwjl].hex(),
        'trailer_checksum': struct.unpack_from('<H', blob, len(blob) - 6)[0],
        'sections': [],
        'lwjl': {},
    }

    # consistency checks
    out['checks'] = {
        'end_addr_points_at_PTYY': blob[end_addr - base: end_addr - base + 4] == b'PTYY',
        'padding_is_zero': blob[lwjl - 3:lwjl] == b'\0\0\0',
        'pointer_count_plausible': n_ptr in (19, 21),
    }

    for i, p in enumerate(ptrs):
        off = p - base
        out['sections'].append({
            'slot': i,
            'address': p,
            'file_offset': None if p == 0 else off,
            'status': 'null' if p == 0 else ('ok' if 0 <= off < len(blob) else 'OUT OF RANGE'),
        })

    cnt = blob[lwjl + 4]
    recs = []
    for k in range(cnt):
        o = lwjl + 5 + 4 * k
        if o + 4 > len(blob):
            break
        code, idx, flags = blob[o], struct.unpack_from('<H', blob, o + 1)[0], blob[o + 3]
        rec = {'i': k, 'code': code, 'index': idx, 'flags': flags}
        if code & 0x80:
            rec['matrix'] = {'row': (code >> 3) & 0x0F, 'col': code & 0x07}
        recs.append(rec)
    out['lwjl'] = {'count': cnt, 'records': recs}
    return out

def report(r):
    print('blob at file offset 0x%X, length %d (0x%X)' % (
        r['file_offset_of_blob'], r['blob_length'], r['blob_length']))
    print('flash base       0x%06X   (recovered from end_addr)' % r['flash_base'])
    print('end_addr         0x%06X' % r['end_addr'])
    print('format version   %s   (raw 0x%04X)' % (r['format_version'], r['format_raw']))
    print('pointer slots    %d        (LWJL at 0x%02X)' % (r['pointer_count'], r['lwjl_offset']))
    print('trailer checksum 0x%04X' % r['trailer_checksum'])
    for k, v in r['checks'].items():
        print('  check %-28s %s' % (k, 'PASS' if v else 'FAIL'))
    print('sections:')
    for s in r['sections']:
        if s['address'] == 0:
            print('   [%2d] NULL' % s['slot'])
        else:
            print('   [%2d] 0x%06X  file+0x%06X  %s' % (
                s['slot'], s['address'], s['file_offset'], s['status']))
    l = r['lwjl']
    mat = [x for x in l['records'] if 'matrix' in x]
    print('LWJL: count=%d  (%d matrix codes, %d non-matrix)' % (
        l['count'], len(mat), l['count'] - len(mat)))
    rows = {}
    for x in mat:
        rows.setdefault(x['matrix']['row'], set()).add(x['matrix']['col'])
    if rows:
        print('  matrix rows: %s' % {k: sorted(v) for k, v in sorted(rows.items())})
    if l['records']:
        print('  codes in order: %s' % ' '.join('0x%02X' % x['code'] for x in l['records']))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    d = open(sys.argv[1], 'rb').read()
    r = parse(d)
    if '--json' in sys.argv:
        print(json.dumps(r, indent=2))
    else:
        report(r)
