"""
Find and decode the USB descriptor block inside a Harmony firmware image.

This is the cheapest useful thing to do to a firmware image nobody has looked at: the
descriptor block states the product id, the endpoint numbers, the report size and, as it
turns out, the skin, all in the device's own words rather than by inference. For the
application it settles the transport layer, and the skin matters because a write must
refuse to proceed unless the config's `INTENDEDVERSION` matches the connected remote.

The block is found by validation rather than by pattern. A device descriptor is 18 bytes
starting `12 01`, which is a common enough pair of bytes in code, so a candidate is
accepted only if the whole chain behind it walks: every descriptor's `bLength` must land
exactly on the next descriptor, and the types must run device, configuration, interface.
That is a strong enough test that both images yield exactly one candidate.

Descriptor layouts are from the USB 2.0 specification, chapter 9, and the HID class
specification 1.11. Nothing here is Harmony specific except `skin_id`.
"""

from __future__ import annotations

import dataclasses
from typing import Dict, List, Optional

DEVICE = 0x01
CONFIGURATION = 0x02
STRING = 0x03
INTERFACE = 0x04
ENDPOINT = 0x05
HID = 0x21
HID_REPORT = 0x22

TYPE_NAMES: Dict[int, str] = {
    DEVICE: 'DEVICE', CONFIGURATION: 'CONFIGURATION', STRING: 'STRING',
    INTERFACE: 'INTERFACE', ENDPOINT: 'ENDPOINT', HID: 'HID', HID_REPORT: 'HID REPORT',
}

DEVICE_LENGTH = 18
# The three types that must appear, in this order, for a candidate block to be believed.
CHAIN_PROLOGUE = (DEVICE, CONFIGURATION, INTERFACE)


class UsbDescError(Exception):
    pass


@dataclasses.dataclass(frozen=True)
class Descriptor:
    """One descriptor, with its address in the image's own address space."""

    address: int
    kind: int
    raw: bytes

    @property
    def length(self) -> int:
        return len(self.raw)

    @property
    def type_name(self) -> str:
        return TYPE_NAMES.get(self.kind, 'type 0x%02X' % self.kind)

    def u8(self, at: int) -> int:
        return self.raw[at]

    def u16(self, at: int) -> int:
        """A descriptor field, which USB always stores little endian."""
        return self.raw[at] | (self.raw[at + 1] << 8)

    def text(self) -> str:
        """A string descriptor's text.

        Harmony descriptors include the C string's NUL terminator in the descriptor, so it
        is stripped here rather than reported as part of the name.
        """
        if self.kind != STRING:
            raise UsbDescError('not a string descriptor')
        return self.raw[2:].decode('utf-16-le', 'replace').rstrip('\x00')


def walk(image: bytes, base: int, start: int, limit: int = 64) -> List[Descriptor]:
    """Follow a descriptor chain from `start`, stopping where it stops making sense.

    Chains here are not terminated by a marker: they simply run out. Three things end the
    walk. A `bLength` under 2 cannot advance. A length that runs off the end of the image
    cannot be a descriptor. And an unrecognised type ends it too, which is what actually
    happens in both images: the byte after the last string descriptor starts the HID report
    descriptor, which is not a standard descriptor and has no length prefix at all.
    """
    out: List[Descriptor] = []
    offset = start - base
    while len(out) < limit:
        if offset + 2 > len(image):
            break
        length, kind = image[offset], image[offset + 1]
        if length < 2 or offset + length > len(image) or kind not in TYPE_NAMES:
            break
        out.append(Descriptor(base + offset, kind, image[offset:offset + length]))
        offset += length
    return out


def find_block(image: bytes, base: int) -> Optional[int]:
    """Address of the device descriptor, or None if the image has no descriptor block.

    Returns the first block whose chain validates. The 600 0.2 image has none, because
    concordance truncates that dump at 65536 of 70336 bytes and the block is past the cut.
    """
    for candidate in _candidates(image, base):
        chain = walk(image, base, candidate, limit=len(CHAIN_PROLOGUE))
        if len(chain) < len(CHAIN_PROLOGUE):
            continue
        if tuple(d.kind for d in chain) != CHAIN_PROLOGUE:
            continue
        if chain[0].length != DEVICE_LENGTH:
            continue
        return candidate
    return None


def _candidates(image: bytes, base: int) -> List[int]:
    """Every `12 01` in the image, as an address."""
    out = []
    at = image.find(b'\x12\x01')
    while at >= 0:
        out.append(base + at)
        at = image.find(b'\x12\x01', at + 1)
    return out


# HID report descriptor item prefixes, from the HID 1.11 specification section 6.2.2. The
# low two bits are the data size, so the prefixes below are the size-1 forms this firmware
# uses. Only the items needed to state the report geometry are decoded.
HID_ITEM_REPORT_SIZE = 0x74
HID_ITEM_REPORT_COUNT = 0x94
HID_ITEM_REPORT_ID = 0x84
HID_ITEM_INPUT = 0x80
HID_ITEM_OUTPUT = 0x90
HID_ITEM_USAGE_PAGE = 0x04

# The prologue of a vendor defined report descriptor: usage page 0xFF00, usage 1,
# collection application. Distinctive enough to locate the descriptor, which is not part of
# the descriptor chain and so cannot be reached by walking it.
HID_VENDOR_PROLOGUE = b'\x06\x00\xff\x09\x01\xa1\x01'


def find_report_descriptor(image: bytes, base: int, length: int) -> Optional[int]:
    """Address of the HID report descriptor, whose length the HID descriptor states."""
    at = image.find(HID_VENDOR_PROLOGUE)
    if at < 0 or at + length > len(image):
        return None
    return base + at


def report_geometry(blob: bytes) -> Dict[str, object]:
    """Report sizes out of a HID report descriptor.

    Walks the item list rather than pattern matching, because the answer that matters to a
    transport layer is a byte count and an assertion that there are no report ids: with no
    report id, a 64 byte report is 64 bytes on the wire, and hidapi wants a leading zero
    byte prepended on some platforms.
    """
    size = count = 0
    result: Dict[str, object] = {'input_bytes': None, 'output_bytes': None,
                                 'input_flags': None, 'output_flags': None,
                                 'has_report_id': False, 'usage_page': None}
    at = 0
    while at < len(blob):
        prefix = blob[at]
        data_len = prefix & 0x03
        data = int.from_bytes(blob[at + 1:at + 1 + data_len], 'little') if data_len else 0
        tag = prefix & 0xFC
        if tag == HID_ITEM_REPORT_SIZE:
            size = data
        elif tag == HID_ITEM_REPORT_COUNT:
            count = data
        elif tag == HID_ITEM_REPORT_ID:
            result['has_report_id'] = True
        elif tag == HID_ITEM_USAGE_PAGE and result['usage_page'] is None:
            result['usage_page'] = data
        elif tag == HID_ITEM_INPUT:
            result['input_bytes'] = size * count // 8
            result['input_flags'] = data
        elif tag == HID_ITEM_OUTPUT:
            result['output_bytes'] = size * count // 8
            result['output_flags'] = data
        at += 1 + data_len
    return result


def skin_id(bcd_device: int) -> int:
    """The skin number out of a device descriptor's `bcdDevice`.

    The low byte reads as BCD: the Harmony One 3.4 image carries 0x1054 and that remote is
    skin 54, the Harmony 700 2.8 image carries 0x1066 and that remote is skin 66. The high
    byte is 0x10 in both, and what it means is not established.

    This is worth more than it looks. The 600 and the 700 share product id 0xC122, so the
    USB product id does not identify an arch 14 model, and `bcdDevice` does it without
    reading a single config byte.
    """
    low = bcd_device & 0xFF
    return (low >> 4) * 10 + (low & 0x0F)


def summary(image: bytes, base: int) -> Optional[Dict[str, object]]:
    """Decode the block into the handful of facts a transport layer needs."""
    start = find_block(image, base)
    if start is None:
        return None
    chain = walk(image, base, start)
    device = chain[0]

    endpoints = []
    for d in chain:
        if d.kind != ENDPOINT:
            continue
        address = d.u8(2)
        endpoints.append({
            'number': address & 0x0F,
            'direction': 'in' if address & 0x80 else 'out',
            'transfer': ('control', 'isochronous', 'bulk', 'interrupt')[d.u8(3) & 3],
            'max_packet': d.u16(4),
            'interval_ms': d.u8(6),
        })

    interfaces = [d for d in chain if d.kind == INTERFACE]
    hid = [d for d in chain if d.kind == HID]
    strings = [d.text() for d in chain if d.kind == STRING and d.length > 4]

    report: Dict[str, object] = {}
    report_at = None
    if hid:
        report_length = hid[0].u16(7)
        report_at = find_report_descriptor(image, base, report_length)
        if report_at is not None:
            offset = report_at - base
            report = report_geometry(image[offset:offset + report_length])

    return {
        'report_descriptor_at': report_at,
        'report': report,
        'block_at': start,
        'usb_version': '%x.%02x' % (device.u16(2) >> 8, device.u16(2) & 0xFF),
        'vendor': device.u16(8),
        'product': device.u16(10),
        'bcd_device': device.u16(12),
        'skin': skin_id(device.u16(12)),
        'max_packet_ep0': device.u8(7),
        'interface_class': interfaces[0].u8(5) if interfaces else None,
        'interface_subclass': interfaces[0].u8(6) if interfaces else None,
        'interface_protocol': interfaces[0].u8(7) if interfaces else None,
        'report_descriptor_length': hid[0].u16(7) if hid else None,
        'endpoints': endpoints,
        'strings': strings,
        'descriptors': chain,
    }
