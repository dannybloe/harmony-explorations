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

Privacy warning: `Data.xml` inside the archived `.hfw` packages contains the account and
session details of whoever originally downloaded the firmware (`UserId`,
`CookieKeyValue`, `ServerID`, `ASPSESSIONID`). `scrub_data_xml` removes them. Do not
mirror those files without scrubbing.
"""

from __future__ import annotations

import binascii
import re
import zipfile
from dataclasses import dataclass
from typing import Dict, List, Optional

_DATA_ELEMENT = re.compile(rb'<DATA>([0-9A-Fa-f]+)</DATA>')
_GSPM = b'GSPM'

# Fields in Data.xml that carry the original downloader's identity or session.
SENSITIVE_XML_FIELDS = ('UserId', 'CookieKeyValue', 'ServerID', 'ASPSESSIONID')


class EzFileError(ValueError):
    pass


@dataclass
class Region:
    """One firmware or config region out of an update package."""
    name: str
    payload: bytes
    encoding: str          # 'hex-data-elements' or 'raw-after-xml'

    @property
    def looks_like_gspm(self) -> bool:
        return self.payload[:4] == _GSPM


def decode_payload(blob: bytes, name: str = '<blob>') -> Region:
    """Extract the payload from an EZUp or EZHex file."""
    chunks = _DATA_ELEMENT.findall(blob)
    if chunks:
        try:
            payload = binascii.unhexlify(b''.join(chunks))
        except binascii.Error as exc:
            raise EzFileError('%s: bad hex in <DATA> elements: %s' % (name, exc))
        return Region(name, payload, 'hex-data-elements')

    # No hex elements, so the payload is raw bytes after the XML header. Locate it by the
    # GSPM magic, which is what these files carry.
    start = blob.find(_GSPM)
    if start < 0:
        raise EzFileError(
            '%s: no <DATA> elements and no GSPM magic, unrecognised container' % name)
    return Region(name, blob[start:], 'raw-after-xml')


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
    from . import gspm
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
