#!/usr/bin/env python3
"""
Parse a GSPM config container and report its structure.

Takes a filename and nothing else: the flash base address and the pointer table length
are both recovered from the data. Accepts a bare blob, an EZHex/EZUp file, or a raw flash
dump with the container somewhere inside it.

Usage:  gspm_parse.py <file> [--json]
"""
import json
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile, gspm


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    path = sys.argv[1]
    try:
        data = ezfile.load_image(path)
    except Exception:
        data = open(path, 'rb').read()

    container = gspm.parse(data)
    if '--json' in sys.argv:
        out = {
            'blob_offset': container.blob_offset,
            'length': container.length,
            'flash_base': container.flash_base,
            'end_addr': container.end_addr,
            'format_version': container.format_version,
            'format_raw': container.format_raw,
            'pointer_count': container.pointer_count,
            'architecture': container.architecture,
            'version_word': container.version_word,
            'frame_length': container.frame_length,
            'trailer_checksum': container.trailer_checksum,
            'checks': container.checks,
            # Both offsets, because they differ by the length of whatever the container is
            # wrapped in, and picking the wrong one shifts every section silently.
            'sections': [
                {'slot': s.slot, 'address': s.address,
                 'blob_offset': container.blob_offset_of(s.address),
                 'file_offset': container.file_offset(s.address),
                 'length': container.section_length(s.slot),
                 # Entries are omitted: the largest array seen holds 8037 of them, which would
                 # bury everything else. The count is what orients you.
                 'pointer_array_entries': (
                     len(container.pointer_array(s.slot))
                     if container.pointer_array(s.slot) is not None else None)}
                for s in container.sections],
            'keys': [
                {'i': k.index_in_table, 'code': k.event_code, 'index': k.index,
                 'flags': k.flags, 'row': k.row, 'col': k.col}
                for k in container.keys],
        }
        print(json.dumps(out, indent=2))
    else:
        for line in gspm.report(container):
            print(line)
    return 0 if container.all_checks_pass else 1


if __name__ == '__main__':
    sys.exit(main())
