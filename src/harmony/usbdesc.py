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

**That test is necessary and it is not sufficient, which the 525 found.** Its image carries
two blocks that both validate: a Microchip stock descriptor at `0x00E92` claiming
`04D8:000B` with `bcdDevice` zero, left over from the vendor's USB stack the firmware is
built on, and the remote's own at `0x07DFE` claiming `046D:C111`. Taking the first one
reported vendor 0x04D8 and skin 0 for a Logitech remote, without failing. So a block whose
`idVendor` is Logitech's wins over one that merely walks, and the fallback is only for an
image where no candidate names it.

Descriptor layouts are from the USB 2.0 specification, chapter 9, and the HID class
specification 1.11. Two things here are Harmony specific and say so: `skin_id` and the
vendor preference above.
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

# Logitech's vendor id, in the device descriptor at offset 8. Harmony specific, and here for
# one reason: an image can hold a second block that validates just as well as the real one.
LOGITECH_VENDOR = 0x046D


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

    A fourth thing ends it before it begins, and it is the one that mattered: `start` below `base`
    makes `offset` negative, and a negative index does not fail in Python, it reads from the end.
    Since `base` is supplied by the caller, `tools/usbdesc.py` taking it from the command line, a
    mistyped base would have walked the image's tail and reported descriptors at addresses that do
    not exist. That is the same class as a wrong load address producing a readable listing.
    """
    out: List[Descriptor] = []
    offset = start - base
    if offset < 0:
        return out
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

    Every block whose chain validates is a candidate, and the one whose `idVendor` is
    Logitech's wins. That preference is not cosmetic: the 525's image holds a Microchip stock
    descriptor that validates perfectly and claims `04D8:000B`, so returning the first match
    reported the wrong vendor and skin 0 with nothing failing. See the module docstring.

    The 600 0.2 image has no block at all, because concordance truncates that dump at 65536
    of 70336 bytes and the block is past the cut.
    """
    validating = []
    for candidate in _candidates(image, base):
        chain = walk(image, base, candidate, limit=len(CHAIN_PROLOGUE))
        if len(chain) < len(CHAIN_PROLOGUE):
            continue
        if tuple(d.kind for d in chain) != CHAIN_PROLOGUE:
            continue
        if chain[0].length != DEVICE_LENGTH:
            continue
        if chain[0].u16(8) == LOGITECH_VENDOR:
            return candidate
        validating.append(candidate)
    # No candidate names Logitech, so the image is either not a Harmony's or its descriptor is
    # built at run time. Hand back the first that walks rather than nothing, and let the caller
    # see the vendor id it reports.
    return validating[0] if validating else None


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


def skin_id(bcd_device: int) -> Optional[int]:
    """The skin number out of a device descriptor's `bcdDevice`, or None if unreadable.

    A skin is Logitech's own index into its model list, so the number names the remote: 15 is
    a Harmony 880, 17 an 885, 19 an 890, 22 a 525, 54 a Harmony One, 66 a 700, 71 a 600, 72 a
    650, 78 a 300, 99 a Touch and 104 a 350. Each config states its own in the `<SKIN>` element of its EZHex header, which is the
    independent oracle every case below is checked against.

    This is worth more than it looks. The 600 and the 700 share product id 0xC122, so the USB
    product id does not identify an arch 14 model, and `bcdDevice` does it without reading a
    single config byte.

    **The low byte's encoding is per firmware generation, and reading it wrong is silent.**
    The high byte says which:

    * `0x08` and `0x09`: the high byte is the protocol number, and the skin is the low byte in
      plain binary. 0x080F is a Harmony 880 and 0x0811 an 885, both protocol 8; 0x0916 is a
      525, protocol 9.
    * `0x10` and above: **the whole word is BCD of `1000 + skin`**, section 195, so that byte is a
      carry rather than the constant section 113 called it. 0x1054 is a Harmony One, 0x1078 a 300,
      0x1099 a Touch and **0x1104 a Harmony 350**, skins 54, 78, 99 and 104. The 350's word is the
      one that separates this from reading the low byte alone, which refuses it outright, and its
      skin is stated by the remote itself rather than derived from this field.

    Anything else returns None, because a guess produces a readable wrong model rather than an
    error. Reading an 885's 0x0811 as BCD gives 11, which is a Harmony 655; reading a 700's
    0x1066 as binary gives 102, which is a Harmony Ultimate One. Both are the failure this
    project keeps meeting: a wrong rule that yields a plausible answer.

    `0x0A` for the 890 is the obvious prediction and it is deliberately **not** implemented,
    because no arch 10 firmware exists here to check it against. `docs/findings.md` section
    113.
    """
    high, low = bcd_device >> 8, bcd_device & 0xFF
    # The whole word as BCD, section 195: `1000 + skin`, so the high byte is a carry. The bound is
    # 1000 rather than a high byte of 0x10, because 0x0916 is valid BCD for 916 and is a Harmony 525
    # whose skin is 22, so only values at or above 1000 are in this form.
    digits = [(bcd_device >> shift) & 0x0F for shift in (12, 8, 4, 0)]
    if all(digit <= 9 for digit in digits):
        value = int(''.join(str(digit) for digit in digits))
        if value >= 1000:
            return value - 1000
    if high in (0x08, 0x09):
        return low
    return None


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
