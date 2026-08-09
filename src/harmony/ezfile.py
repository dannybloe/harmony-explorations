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
    XML header followed by the payload as **raw bytes**, not hex. Some EZHex files instead
    use `<DATA>` elements like EZUp, so both are handled by sniffing.

    A config EZHex declares its own payload length and a checksum, so the split is
    verifiable rather than guessed: `<BINARYDATASIZE>` is the exact payload length and
    `<CHECKSUM>` is an XOR of every payload byte seeded with `0x69`. `parse_ezhex` checks
    both. The header also carries `<INTENDEDVERSION>`, which pins the six fields a remote
    must report before the file is offered to it.

    **Where the split actually is**, section 87: the header ends at the line carrying
    `</INFORMATION>` and the payload is everything after that line's terminator. The
    declared length is a *check* on that, not the definition, and both of them are
    optional: a file with neither is still a legal EZHex, and one of the two in the corpus
    has no header at all. `parse_ezhex` computes the split both ways and records whether
    they agree, because two derivations that land on the same byte are worth more than
    either alone.

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

# The end of the XML header. The payload starts after this line's terminator, which is CR LF
# in every sample here and is not required to be: an EZUp header is written with bare LF and
# the reader that consumes these files counts the difference rather than demanding one.
HEADER_TERMINATOR = b'</INFORMATION>'

# The six fields a compatibility check compares, section 87. Not the four this used to list:
# `SOFTWARETYPE` and `ARCHITECTURE` are compared too, and a field that is absent or empty
# matches anything, which is how one entry can be written to match every remote. `SOFTWARE`
# appears in one arch 8 config and is **not** one of the six, so a version that looks like a
# gate is not one.
INTENDED_VERSION_FIELDS = ('PROTOCOL', 'SKIN', 'FLASH', 'BOARD', 'SOFTWARETYPE',
                           'ARCHITECTURE')

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
    # Where the header terminator puts the split, and how that line ended: 'crlf', 'lf',
    # 'cr', 'none' for a terminator at end of file, or None when there is no header at all.
    structural_split: Optional[int] = None
    line_ending: Optional[str] = None

    @property
    def all_checks_pass(self) -> bool:
        return all(self.checks.values())

    @property
    def has_a_header(self) -> bool:
        """A file whose first line is not XML is all payload. The 700 package holds one."""
        return self.structural_split is not None


def payload_checksum(payload: bytes) -> int:
    """The `<CHECKSUM>` an EZHex header carries: XOR of every byte, seeded 0x69."""
    value = CHECKSUM_SEED
    for byte in payload:
        value ^= byte
    return value


def _xml_int(blob: bytes, tag: str) -> Optional[int]:
    """Read a decimal element. Signed, because a checksum is compared as a byte.

    The reader that consumes these files parses `<CHECKSUM>` as a signed 16 bit number and
    then narrows it to a byte, so a value of `0x80` upwards may legitimately be written
    negative. No sample here does, and matching digits only would have failed silently on the
    first one that did.
    """
    match = re.search(rb'<%s>(-?\d+)</%s>' % (tag.encode(), tag.encode()), blob)
    return int(match.group(1)) if match else None


def _structural_split(blob: bytes) -> tuple[Optional[int], Optional[str]]:
    """Where the XML header ends, by the header's own terminator rather than by arithmetic.

    Returns (offset after the terminating line, how that line ended), or (None, None) when
    the file carries no header. The line ending is reported rather than required: an EZHex
    header is written CR LF and an EZUp header bare LF, and both are read by the same rule.
    """
    at = blob.find(HEADER_TERMINATOR)
    if at < 0:
        return None, None
    after = at + len(HEADER_TERMINATOR)
    if blob[after:after + 2] == b'\r\n':
        return after + 2, 'crlf'
    if blob[after:after + 1] == b'\n':
        return after + 1, 'lf'
    if blob[after:after + 1] == b'\r':
        return after + 1, 'cr'
    return after, 'none'


def parse_ezhex(blob: bytes, name: str = '<blob>') -> EzHex:
    """Split an EZHex file into XML header and payload, two ways, and compare them.

    The **structural** split is the format's own: the payload is everything after the line
    carrying `</INFORMATION>`, and a file whose header is missing entirely is all payload.
    The **declared** split is `BINARYDATASIZE` bytes off the end. Either can be absent, and
    when both are present they must agree; the structural one is preferred, because it does
    not depend on the file having been truncated or extended by a byte.

    Falls back to locating a container cookie when neither is available, which is a guess
    and is the only branch here that is.
    """
    size = _xml_int(blob, 'BINARYDATASIZE')
    declared_checksum = _xml_int(blob, 'CHECKSUM')
    structural, line_ending = _structural_split(blob)
    declared = len(blob) - size if size is not None and 0 < size <= len(blob) else None

    if structural is not None:
        split = structural
    elif declared is not None:
        split = declared
    else:
        # No header and no declared length. The cookie search is the last resort and it is a
        # guess: it finds the first container magic anywhere, including inside a payload.
        found = [blob.find(m) for m in _CONTAINER_MAGICS]
        found = [f for f in found if f >= 0]
        if not found:
            raise EzFileError('%s: no header, no BINARYDATASIZE and no container magic' % name)
        split = min(found)
    payload = blob[split:]

    ez = EzHex(
        name=name,
        xml=blob[:split].decode('utf-8', 'replace'),
        payload=payload,
        declared_size=size,
        declared_checksum=declared_checksum,
        structural_split=structural,
        line_ending=line_ending,
    )
    version_block = re.search(rb'<INTENDEDVERSION>(.*?)</INTENDEDVERSION>', blob, re.S)
    if version_block:
        for fld in INTENDED_VERSION_FIELDS:
            m = re.search(rb'<%s>(.*?)</%s>' % (fld.encode(), fld.encode()),
                          version_block.group(1), re.S)
            if m:
                ez.intended_version[fld] = m.group(1).decode('utf-8', 'replace').strip()
    # A check is a claim that has to hold, not a note about what the file happens to carry.
    # An absent `BINARYDATASIZE` or `CHECKSUM` is legal, so neither absence is a failure
    # here; `declared_size is None` says the file did not declare one. The reader that
    # consumes these files takes exactly this position, and the corpus contains one file of
    # each kind: a package config with no header at all, and firmware wrappers with neither
    # field.
    ez.checks = {
        'payload_length_matches_declaration': size is None or size == len(payload),
        'checksum_matches_declaration': (
            declared_checksum is None
            or payload_checksum(payload) == declared_checksum & 0xFF),
        'the_two_splits_agree': (
            structural is None or declared is None or structural == declared),
        'payload_starts_with_a_known_container': payload[:4] in _CONTAINER_MAGICS,
    }
    return ez


def decode_payload(blob: bytes, name: str = '<blob>') -> Region:
    """Extract the payload from an EZUp or EZHex file.

    Concatenates every phase, which is what a caller wanting "the bytes in this file" means.
    Use `read_phases` when the boundaries matter: an arch 12 package carries two, bound for
    two different flash addresses, and the boundary between them is stated rather than
    inferred. See section 87.
    """
    phases = read_phases(blob)
    if phases:
        return Region(name, b''.join(p.payload for p in phases), 'hex-data-elements')

    ez = parse_ezhex(blob, name)
    return Region(name, ez.payload,
                  'raw-after-header' if ez.has_a_header else 'bare-container')


@dataclass
class Phase:
    """One `<PHASE>` of an EZUp file: a payload with a stated destination.

    `kind` is the file's own `<TYPE>`, and it is the thing worth having. An arch 12 firmware
    package carries `Configuration_Static` followed by `Firmware_Main`, which is the split
    `split_arch12_region2` recomputes from the container header.
    """
    kind: str
    label: str
    payload: bytes


_PHASE = re.compile(rb'<PHASE>(.*?)</PHASE>', re.S)
_TYPE = re.compile(rb'<TYPE>([^<]*)</TYPE>')
_NAME = re.compile(rb'<NAME>([^<]*)</NAME>')


def read_phases(blob: bytes) -> List[Phase]:
    """Every `<PHASE>` of an EZUp file, in order, with its hex payload decoded.

    Empty for a file with no phases, which includes every EZHex. A `<DATA>` element carries
    32 bytes and the last one of a phase carries the remainder, but nothing here relies on
    that: the elements are concatenated in document order and the widths are only asserted
    in the tests.
    """
    phases: List[Phase] = []
    for match in _PHASE.finditer(blob):
        body = match.group(1)
        chunks = _DATA_ELEMENT.findall(body)
        try:
            payload = binascii.unhexlify(b''.join(chunks))
        except binascii.Error as exc:
            raise EzFileError('bad hex in <DATA> elements: %s' % exc)
        kind = _TYPE.search(body)
        label = _NAME.search(body)
        phases.append(Phase(
            kind=kind.group(1).decode('utf-8', 'replace') if kind else '',
            label=label.group(1).decode('utf-8', 'replace') if label else '',
            payload=payload))
    if phases:
        return phases

    # A file with hex payload but no phase wrapper. None of the corpus is shaped this way,
    # and reading it as one unnamed phase keeps the concatenating caller working.
    chunks = _DATA_ELEMENT.findall(blob)
    if not chunks:
        return []
    try:
        return [Phase('', '', binascii.unhexlify(b''.join(chunks)))]
    except binascii.Error as exc:
        raise EzFileError('bad hex in <DATA> elements: %s' % exc)


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
    boundary is recomputed here from the GSPM header's `end_addr`, which marks where the
    config ends.

    **The file also states it**, section 87: those are two `<PHASE>` elements, typed
    `Configuration_Static` and `Firmware_Main`, and `read_phases` hands them back separately.
    This function is kept because it works on a decoded payload, where the phases are gone,
    and because the two routes agreeing to the byte is worth a test rather than a rewrite.

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
