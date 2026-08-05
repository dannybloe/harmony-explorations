"""
Readers for Logitech's container files.

Everything Logitech shipped is wrapped in one of three ways, and getting from a download
to an analysable binary means unwrapping all three. This module exists so that step is
reproducible rather than something you retype into a shell each time.

`.hfw`
    A ZIP archive. Contains `Data.xml` describing the update, plus one file per firmware
    region, each of which is itself an EZUp or EZHex file.

`.EZUpgrade` / `.EZUp`
    XML with the payload hex-encoded across many `<DATA>` elements. Concatenate their text
    and hex-decode.

`.EZHex`
    XML header followed by the payload as **raw bytes**, not hex. The split point is where
    the XML ends. Some EZHex files instead use `<DATA>` elements like EZUp, so both are
    handled by sniffing.

    A config EZHex declares its own payload length and a checksum, so the split is
    verifiable rather than guessed: `<BINARYDATASIZE>` is the exact payload length and
    `<CHECKSUM>` is an XOR of every payload byte seeded with `0x69`. `parse_ezhex` checks
    both. The header also carries `<INTENDEDVERSION>`, which pins the protocol, skin, board
    and flash id a remote must report before it will accept the file.

Privacy warning: `Data.xml` inside the archived `.hfw` packages contains the account and
session details of whoever originally downloaded the firmware (`UserId`,
`CookieKeyValue`, `ServerID`, `ASPSESSIONID`). `scrub_data_xml` removes them. Do not
mirror those files without scrubbing.
"""

from __future__ import annotations

import binascii
import re
import zipfile
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from . import gspm

_DATA_ELEMENT = re.compile(rb'<DATA>([0-9A-Fa-f]+)</DATA>')
_GSPM = b'GSPM'
_CONTAINER_MAGICS = tuple(f.magic for f in gspm.FAMILIES)

CHECKSUM_SEED = 0x69
INTENDED_VERSION_FIELDS = ('PROTOCOL', 'SKIN', 'FLASH', 'BOARD')

# Fields in Data.xml that carry the original downloader's identity or session.
SENSITIVE_XML_FIELDS = ('UserId', 'CookieKeyValue', 'ServerID', 'ASPSESSIONID')


class EzFileError(ValueError):
    pass


@dataclass
class Region:
    """One firmware or config region out of an update package."""
    name: str
    payload: bytes
    encoding: str          # 'hex-data-elements', 'raw-after-xml' or 'declared-length'

    @property
    def container_magic(self) -> Optional[bytes]:
        """The container cookie this payload starts with, if it is a known one."""
        head = self.payload[:4]
        return head if head in _CONTAINER_MAGICS else None

    @property
    def looks_like_gspm(self) -> bool:
        """Specifically a GSPM container, so architecture 12 or 14."""
        return self.payload[:4] == _GSPM


@dataclass
class EzHex:
    """An EZHex config file split into its declared parts, with the split verified."""
    name: str
    xml: str
    payload: bytes
    declared_size: Optional[int]
    declared_checksum: Optional[int]
    intended_version: Dict[str, str] = field(default_factory=dict)
    checks: Dict[str, bool] = field(default_factory=dict)

    @property
    def all_checks_pass(self) -> bool:
        return all(self.checks.values())


def payload_checksum(payload: bytes) -> int:
    """The `<CHECKSUM>` an EZHex header carries: XOR of every byte, seeded 0x69."""
    value = CHECKSUM_SEED
    for byte in payload:
        value ^= byte
    return value


def _xml_int(blob: bytes, tag: str) -> Optional[int]:
    match = re.search(rb'<%s>(\d+)</%s>' % (tag.encode(), tag.encode()), blob)
    return int(match.group(1)) if match else None


def parse_ezhex(blob: bytes, name: str = '<blob>') -> EzHex:
    """Split an EZHex file into XML header and payload, verifying the declared length.

    The payload is the last `BINARYDATASIZE` bytes of the file, which is what the remote
    itself relies on, and the two byte `\\r\\n` separator before it is checked rather than
    assumed. Falls back to locating a container cookie when the header declares no size.
    """
    size = _xml_int(blob, 'BINARYDATASIZE')
    declared_checksum = _xml_int(blob, 'CHECKSUM')
    if size is not None and 0 < size <= len(blob):
        split = len(blob) - size
        payload = blob[split:]
    else:
        found = [blob.find(m) for m in _CONTAINER_MAGICS]
        found = [f for f in found if f >= 0]
        if not found:
            raise EzFileError('%s: no BINARYDATASIZE and no container magic' % name)
        split = min(found)
        payload = blob[split:]

    ez = EzHex(
        name=name,
        xml=blob[:split].decode('utf-8', 'replace'),
        payload=payload,
        declared_size=size,
        declared_checksum=declared_checksum,
    )
    version_block = re.search(rb'<INTENDEDVERSION>(.*?)</INTENDEDVERSION>', blob, re.S)
    if version_block:
        for fld in INTENDED_VERSION_FIELDS:
            m = re.search(rb'<%s>(.*?)</%s>' % (fld.encode(), fld.encode()),
                          version_block.group(1), re.S)
            if m:
                ez.intended_version[fld] = m.group(1).decode('utf-8', 'replace').strip()
    ez.checks = {
        'declares_a_payload_size': size is not None,
        'payload_length_matches_declaration': size == len(payload),
        'separator_before_payload_is_crlf': blob[split - 2:split] == b'\r\n',
        'checksum_matches_declaration': (
            declared_checksum is not None
            and payload_checksum(payload) == declared_checksum),
        'payload_starts_with_a_known_container': payload[:4] in _CONTAINER_MAGICS,
    }
    return ez


def decode_payload(blob: bytes, name: str = '<blob>') -> Region:
    """Extract the payload from an EZUp or EZHex file."""
    chunks = _DATA_ELEMENT.findall(blob)
    if chunks:
        try:
            payload = binascii.unhexlify(b''.join(chunks))
        except binascii.Error as exc:
            raise EzFileError('%s: bad hex in <DATA> elements: %s' % (name, exc))
        return Region(name, payload, 'hex-data-elements')

    # No hex elements, so the payload is raw bytes after the XML header. A config EZHex
    # declares its own length, which is exact; otherwise fall back to the container cookie.
    if _xml_int(blob, 'BINARYDATASIZE') is not None:
        ez = parse_ezhex(blob, name)
        return Region(name, ez.payload, 'declared-length')
    found = [blob.find(m) for m in _CONTAINER_MAGICS]
    found = [f for f in found if f >= 0]
    if not found:
        raise EzFileError(
            '%s: no <DATA> elements and no container magic, unrecognised container' % name)
    return Region(name, blob[min(found):], 'raw-after-xml')


def read_hfw(path: str) -> Dict[str, Region]:
    """Open a `.hfw` package and decode every region inside it.

    Returns {member name: Region}. `Data.xml` is not included; use `read_hfw_metadata`.
    """
    regions: Dict[str, Region] = {}
    with zipfile.ZipFile(path) as zf:
        for name in zf.namelist():
            if name.lower().endswith('.xml'):
                continue
            regions[name] = decode_payload(zf.read(name), name)
    if not regions:
        raise EzFileError('%s: no region files inside the archive' % path)
    return regions


def read_hfw_metadata(path: str) -> str:
    """Return the `Data.xml` text from a `.hfw`, scrubbed of account and session fields."""
    with zipfile.ZipFile(path) as zf:
        for name in zf.namelist():
            if name.lower().endswith('data.xml'):
                return scrub_data_xml(zf.read(name).decode('utf-8', 'replace'))
    raise EzFileError('%s: no Data.xml in the archive' % path)


def scrub_data_xml(text: str) -> str:
    """Blank the fields in Data.xml that identify the original downloader.

    Handles both `<KEY>Name</KEY><VALUE>secret</VALUE>` pairs and plain
    `<Name>secret</Name>` elements. Use this before mirroring a `.hfw` anywhere.
    """
    out = text
    for fld in SENSITIVE_XML_FIELDS:
        out = re.sub(r'(<%s>)(.*?)(</%s>)' % (fld, fld),
                     r'\1REMOVED\3', out, flags=re.DOTALL)
        out = re.sub(
            r'(<KEY>%s</KEY>\s*<VALUE>)(.*?)(</VALUE>)' % fld,
            r'\1REMOVED\3', out, flags=re.DOTALL)
    # The session cookie travels inside a generic Cookie header value.
    out = re.sub(r'(<VALUE>)([^<]*ASPSESSIONID[^<]*)(</VALUE>)',
                 r'\1REMOVED\3', out)
    return out


def split_arch12_region2(payload: bytes) -> tuple[bytes, bytes]:
    """Split an architecture 12 `Region_2` payload into its config and code halves.

    Arch 12 packs two destinations into one region: a GSPM safe-mode config bound for
    flash `0x002000`, followed by the application code bound for flash `0x020000`. The
    boundary is discoverable from the data, because the GSPM header's `end_addr` marks
    where the config ends.

    Returns (config_blob, code_blob).
    """
    if payload[:4] != _GSPM:
        raise EzFileError('payload does not start with a GSPM container, nothing to split')
    container = gspm.parse(payload)
    return payload[:container.length], payload[container.length:]


def load_image(path: str, region: Optional[str] = None) -> bytes:
    """Convenience loader: accepts a raw binary, an EZUp/EZHex file, or a `.hfw`.

    For a `.hfw`, `region` selects the member by substring; with one region it is
    optional.
    """
    with open(path, 'rb') as fh:
        head = fh.read(4)
    if head[:2] == b'PK':
        regions = read_hfw(path)
        if region:
            matches = [r for name, r in regions.items() if region in name]
            if len(matches) != 1:
                raise EzFileError('%s: %d regions match %r, expected 1'
                                  % (path, len(matches), region))
            return matches[0].payload
        if len(regions) == 1:
            return next(iter(regions.values())).payload
        raise EzFileError('%s: %d regions present (%s), pass region='
                          % (path, len(regions), ', '.join(sorted(regions))))
    with open(path, 'rb') as fh:
        blob = fh.read()
    if blob.lstrip()[:1] == b'<' or _DATA_ELEMENT.search(blob):
        return decode_payload(blob, path).payload
    return blob


def region_names(path: str) -> List[str]:
    """List the region members of a `.hfw` without decoding them."""
    with zipfile.ZipFile(path) as zf:
        return sorted(n for n in zf.namelist() if not n.lower().endswith('.xml'))
