#!/usr/bin/env python3
"""
Decode the USB descriptor block in a Harmony firmware image.

The first thing to run against a firmware image from a model nobody has examined. It
reports the product id, the endpoints, the report size and the skin, from the device's own
descriptors rather than by inference, and it needs no knowledge of the model.

The block is located by walking candidate chains and keeping the one that validates, so a
wrong answer is unlikely: every descriptor's length must land exactly on the next one.

Usage:  usbdesc.py <file> <base_addr> [--raw] [--json]

Example:
    usbdesc.py 700-2.8-Region_2-code-base0x9000.bin 0x9000
"""
import json
import sys

import _bootstrap  # noqa: F401
from harmony import ezfile, usbdesc

CLASS_NAMES = {0x00: 'defined per interface', 0x03: 'HID'}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = {a for a in sys.argv[1:] if a.startswith('--')}
    if len(args) != 2:
        sys.exit(__doc__)

    code = ezfile.load_image(args[0])
    base = int(args[1], 0)
    info = usbdesc.summary(code, base)
    if info is None:
        sys.exit('no USB descriptor block found (a truncated dump may simply not reach it)')

    if '--json' in flags:
        printable = {k: v for k, v in info.items() if k != 'descriptors'}
        print(json.dumps(printable, indent=2))
        return

    print('descriptor block at 0x%05X, USB %s' % (info['block_at'], info['usb_version']))
    # An unreadable skin is said rather than printed as a number: see harmony.usbdesc.skin_id,
    # where the encoding is per firmware generation and a guess names the wrong model.
    skin = 'skin %d' % info['skin'] if info['skin'] is not None else 'skin UNREADABLE'
    print('  %04X:%04X, bcdDevice 0x%04X, so %s'
          % (info['vendor'], info['product'], info['bcd_device'], skin))
    print('  interface class 0x%02X (%s), subclass 0x%02X, protocol 0x%02X'
          % (info['interface_class'], CLASS_NAMES.get(info['interface_class'], 'unknown'),
             info['interface_subclass'], info['interface_protocol']))
    print('  control endpoint packet size %d, HID report descriptor %d bytes at 0x%05X'
          % (info['max_packet_ep0'], info['report_descriptor_length'],
             info['report_descriptor_at']))
    report = info['report']
    print('  usage page 0x%04X, %s byte input report, %s byte output report, report ids: %s'
          % (report['usage_page'], report['input_bytes'], report['output_bytes'],
             'yes' if report['has_report_id'] else 'none'))
    for ep in info['endpoints']:
        print('  endpoint %d %-3s %-9s %d byte reports every %d ms'
              % (ep['number'], ep['direction'], ep['transfer'], ep['max_packet'],
                 ep['interval_ms']))
    for text in info['strings']:
        print('  string: %r' % text)

    if '--raw' in flags:
        print()
        for d in info['descriptors']:
            print('  0x%05X  len=%2d  %-13s %s'
                  % (d.address, d.length, d.type_name,
                     ' '.join('%02x' % b for b in d.raw)))


if __name__ == '__main__':
    main()
