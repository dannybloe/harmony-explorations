#!/usr/bin/env python3
"""
Read the descriptors of a Harmony remote that is plugged in. Enumeration only.

The counterpart to usbdesc.py, which reads a descriptor block out of a firmware image. This
reads the same fields off a live device, so an image claim can be checked against hardware.

**It opens nothing and claims nothing.** libusb caches a device's descriptors when it
enumerates, so configuration, interface and endpoint descriptors are available without an
open handle, without detaching the operating system's HID driver, and without any transfer
reaching the remote. No command is sent. Nothing is written. That property is why this tool
is allowed to exist while the project is still read only, and it is the reason it must not
grow a code path that opens the device: put that in packages/usb behind the write flag,
where the safety rails live.

Needs pyusb, which is not a dependency of anything else here, so it is kept out of the way
in the private lab directory:

    python3 -m venv ../lab/work/venv && ../lab/work/venv/bin/pip install pyusb
    ../lab/work/venv/bin/python tools/usbprobe.py

Usage:  usbprobe.py [--json]
"""
import json
import sys

import _bootstrap  # noqa: F401
from harmony.usbdesc import skin_id

TRANSFER_TYPES = ('control', 'isochronous', 'bulk', 'interrupt')

# Logitech's vendor id, and the product id range Harmony remotes fall in. The range rather
# than a list of ids: a remote nobody has catalogued should still be reported.
LOGITECH_VENDOR = 0x046D
HARMONY_PRODUCTS = range(0xC110, 0xC150)


def remotes():
    """Every connected Harmony, as a plain dictionary per device."""
    import usb.core  # imported here so --help works without pyusb installed

    out = []
    for dev in usb.core.find(find_all=True, idVendor=LOGITECH_VENDOR) or ():
        if dev.idProduct not in HARMONY_PRODUCTS:
            continue
        out.append({
            'vendor': dev.idVendor,
            'product': dev.idProduct,
            'bcd_device': dev.bcdDevice,
            'skin': skin_id(dev.bcdDevice),
            'configurations': [_configuration(cfg) for cfg in dev],
        })
    return out


def _configuration(cfg):
    return {
        'value': cfg.bConfigurationValue,
        'attributes': cfg.bmAttributes,
        'max_power_ma': cfg.bMaxPower * 2,
        'interfaces': [_interface(intf) for intf in cfg],
    }


def _interface(intf):
    return {
        'number': intf.bInterfaceNumber,
        'alternate': intf.bAlternateSetting,
        'class': intf.bInterfaceClass,
        'subclass': intf.bInterfaceSubClass,
        'protocol': intf.bInterfaceProtocol,
        'endpoints': [_endpoint(ep) for ep in intf],
    }


def _endpoint(ep):
    address = ep.bEndpointAddress
    return {
        'address': address,
        'number': address & 0x0F,
        'direction': 'in' if address & 0x80 else 'out',
        'transfer': TRANSFER_TYPES[ep.bmAttributes & 3],
        'max_packet': ep.wMaxPacketSize,
        'interval_ms': ep.bInterval,
    }


def main():
    if '--help' in sys.argv or '-h' in sys.argv:
        sys.exit(__doc__)
    try:
        found = remotes()
    except ImportError:
        sys.exit('pyusb is not installed. See the usage note at the top of this file.')

    if '--json' in sys.argv:
        print(json.dumps(found, indent=2))
        return

    if not found:
        print('no Harmony remote found (vendor %04X, product %04X to %04X)'
              % (LOGITECH_VENDOR, HARMONY_PRODUCTS.start, HARMONY_PRODUCTS.stop - 1))
        return

    for dev in found:
        # A skin of None means the high byte of bcdDevice is one no generation here accounts
        # for, which is a finding rather than a formatting problem: say so instead of printing
        # a number that was guessed.
        skin = 'skin %d' % dev['skin'] if dev['skin'] is not None else 'skin UNREADABLE'
        print('%04X:%04X  bcdDevice 0x%04X, so %s'
              % (dev['vendor'], dev['product'], dev['bcd_device'], skin))
        for cfg in dev['configurations']:
            print('  configuration %d: bmAttributes 0x%02X, %d mA'
                  % (cfg['value'], cfg['attributes'], cfg['max_power_ma']))
            for intf in cfg['interfaces']:
                print('    interface %d alt %d: class %d, subclass %d, protocol %d'
                      % (intf['number'], intf['alternate'], intf['class'],
                         intf['subclass'], intf['protocol']))
                for ep in intf['endpoints']:
                    print('      endpoint 0x%02X: number %d %-3s %-9s %d bytes every %d ms'
                          % (ep['address'], ep['number'], ep['direction'], ep['transfer'],
                             ep['max_packet'], ep['interval_ms']))


if __name__ == '__main__':
    main()
