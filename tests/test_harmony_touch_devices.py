#!/usr/bin/env python3
"""How a Harmony Touch turns a device's command into infrared, read in its firmware: the remote builds the
pulses itself, in its Lua engine, from the command's key code and the family's definition, and hands one
packet of durations to a native program.

**The question.** `todo-touch.md` 3.1 asks what the Touch does with each document of its configuration.
`packages/usb/test/touch-devices.test.ts` measures what the device list and the protocol list hold, and
that the protocol list is Logitech's catalogue definitions unchanged. This file holds what the engine does
with them, read in the decompiled engine and anchored here in the compiled files of the production package
4.15.330, the build a Harmony Touch reports for itself (`tests/test_harmony_touch_image.py`). The page is
`reference/architectures/harmony-touch/devices-and-infrared.md`.

**How it is anchored.** The engine is compiled Lua 5.1 with 4 byte `size_t` and 8 byte numbers, so a string
constant is the tag 4, a 32 bit length counting a closing NUL, the bytes and the NUL, and a number constant
is the tag 3 and a double. A constant asserted below is present in that exact encoding in the named file,
which is what a function of that file can use; the reading itself is the decompiled source in the lab,
named by function. The screens are Lua source in the image and are searched as text. Native programs are
searched for their strings, and one routine of `luaworks.so` is decoded instruction by instruction.

## What was read

**1. The engine builds the infrared at send time.** The infrared manager's key code path takes the
account's protocol by the command's protocol id and the device by its id, and refuses the command when
either is missing; the packet it builds, big endian throughout:

| offset | bytes | holds |
|---|---|---|
| 0 | 1 | 1 for a key code, 255 for a learned raw code |
| 1 | 4 | the carrier period in nanoseconds |
| 5 | 1 | the constant 50, whose meaning was not read |
| 6 | 2 | the device's `InterDeviceDelay`, the native side's "presilence"; 0 for a raw code |
| 8 | 1 | the device's `PressMinRepeats`, 3 when it is null or negative; 0 for a raw code |
| 9 | 1 | 0, not read |
| 10, 12, 14 | 2 each | offsets of the start, repeat and finish sequences, 0 for none |
| 16 | | each sequence: a word count, then that many duration words |

A raw code, `Raw` starting `F`, has no start and no finish, one repeat sequence at 16, its carrier the hex
number after `F`, and `P` and `S` hex values as marks and spaces with dashes ignored. Anchored: the number
constants 1, 50, 255 and 3 and the string constant of the raw reader's pattern in `irmanager.lua`.

**2. A key code is read as three bracketed groups and nothing else.** The generator matches `%b()` over the
whole string, so the `G:` prefix, the family name and the trailing `:3` are never read: no string constant
of `irmanager.lua` begins with `G:` (the one engine file holding such a constant is the Hopper IP
plugin, which writes a key code of its own). Each group is split on `_`, and an item whose second
character is `x` is a segment id, its first character, and a value, the rest; any other item is a segment
id whole. **So the `0x` in front of a code is not a hexadecimal prefix**: it is segment `0` and the
separator. Segment ids come from segment names by the protocol model's rule: the segment named exactly like
the family is `0`, a name holding `KeyCode` gives what follows that word, and any other the text after the
family name and a space. That is the rule `segmentRefs` in `packages/codec/src/archive.ts` already states,
read there off Logitech's own names; here it is read in Logitech's code, so the position digit the
reference called unread (`reference/infrared/families.md`) is a segment id.

A definition carries its own default sequence in a field also called `KeyCode`, a list of entries each
`{SegmentName, SegmentType}`; a command's key code string is the other `KeyCode`. **The evidence that the
remote never reads the definition's field is the absence of `SegmentName`** from every engine file, screen
file and native program, in `UNREAD`; searched without regard to case, the only match is a parameter named
`segmentName` in the protocol model's segment naming function, which is handed a segment's own `Name`.

**3. How a segment becomes durations.** An encoded segment plays its header's atoms, one cell per bit and
its trailer's atoms, then a space padding the whole to `TotalLength` when that is larger. Encoding types 0
and 1 read four bits per hex digit, left padded with zeros to `NumberOfBits` or cut from the left when
longer; types 2 and 3 take one symbol per digit, padded and never cut; 0 and 1 are not told apart. When a
segment states `ToggleBit`, that bit counted from the left of the padded frame is overwritten with a value
kept per device and per protocol, starting at 0 and flipped on every send. A code segment plays its
`Atoms` only, padded to `TotalLength` when larger, so its `Header`, `Trailer` and `Payload` are never read,
which loses nothing: in Logitech's catalogue every code segment carries its header and trailer inside its
atoms and none has a payload, `touch-devices.test.ts`.

**4. A duration word** is 15 bits of microseconds with the top bit set for a mark: a value over 32767 is
written as whole 32767 words and the rest, and one under 30 is raised to 30. Adjacent durations of the
same kind are not merged. Anchored: the numbers 32767, 30, 127, 255 and 128 in `utility.lua`.

**5. The carrier period is rounded, not truncated.** The protocol model computes it as the bit library's
`band` of `1e9 / CarrierFrequency` and `-1`. The bit library is in `opt/lib/luaworks.so`: it exports
`luaopen_bit` and carries LuaBitOp's self test message. Its argument conversion was decoded here: after
`lua_tonumber`, `r2` is set to 0 and `r3` loaded with `0x43380000`, which is the double `2^52 + 2^51` in
the soft float calling convention, and a `bl` goes to a routine entered one instruction after
`eor r3, r3, #0x80000000`, the shape of libgcc's subtraction falling into its addition, `__adddf3`. Adding
`2^52 + 2^51` and keeping the low word is LuaBitOp's conversion, and an IEEE addition rounds to nearest.
So 38 kHz gives 26316 nanoseconds on a Touch, where a compiled configuration states 26315
(`reference/infrared/sending.md`); the five families of the sync have four carriers, two families at
38 kHz, and the other three families give the same value either way. **This is an inference from the
decoded routine**: the routine is recognised by its constant and by the shape of the addition it calls,
which is libgcc's and not read further, and nothing was measured on the lamp. The arithmetic test below
only states the two values for 38 kHz and proves nothing about the remote.
What the native side does with the period after that, which names a `pulse_bclk`, was not read. The lab
note's earlier reading said truncation, from the Lua line alone.

**5a. Which interpreter runs the engine.** The image carries two: `/usr/bin/lua`, which states itself as
Lua 5.1.4, and `/usr/bin/luajit-2.0.0-beta10` with its library. The start up script, `etc/init.d/rcS`,
starts the engine as `./luaworks` in `/opt/luaworks`, and that launcher, with no development `build`
directory present, sets its interpreter to `/usr/bin/lua`; LuaJIT is named by the screens' launcher,
`opt/luadraws/luadraws`, and by the engine's launcher only inside the development branch. Three things agree
with that: every engine file is a PUC Lua 5.1 chunk (`tests/test_harmony_touch_image.py`) and none is
LuaJIT bytecode, which opens with `ESC L J` and is the only compiled form LuaJIT 2.0 loads; `luaworks.so`
names no LuaJIT library and takes the Lua C API from the interpreter that loads it; and it carries its own
`bit` module, which LuaJIT would not need, having one built in. A blind re-measure had attributed the
rounding to LuaJIT's bit operations; LuaJIT 2.0 converts with the same 2^52 + 2^51 addition, so the period
is 26316 either way, but the engine is not run by it.

**6. The hand off.** The sender sends `/ir/ir_send` to the native `hal` program as a command with
`enable`, `keyLatency` and `ports`, the device's `ControlPort`, and the packet appended; a held key sends
`/ir/ir_send` with `enable` alone, the release `enable` false. A tethered hub mode uses
`/rf/hot/1/ir/ir_send`. `hal` holds `/ir/ir_send` and log formats naming `period_ns`, `presilence` and
`min_repeat`, so it reads those header fields under those names; how it plays the start, repeat and
finish sequences was not read.

**7. Fields the remote never reads.** Each name of `UNREAD` occurs in no engine file, no screen file and
none of `hal`, `luaworks.so` and `luadraws.so`, as any byte string at all, so neither a field access nor a
table of names reads it. The control: the names of `READ` are found by the same search. The screens'
test data, a JSON file under `appscommon/test/data`, is left out, being data rather than code; three of
the names occur only there. `FriendlyName` is left off the list because an unrelated network plugin uses
the word. Seven names are read by the screens alone, `SCREENS_ONLY`, the remote's own delay screens
above all. The family's own repeat counts, `PressMinimumRepeats` and `HoldMinimumRepeats`, occur in the
protocol model alone, which stores them; no other file names them, so the device's `PressMinRepeats` is
the only count the packet carries. `holdMinRepeats` is stored and printed and never put in a packet.
**`ControlSection` is read**, by the IP manager for an IP command, where the lab note had it stored and
unused.

**8. The screens save the whole device list.** Seven screen files call `putResource` with `DeviceList` and
a document they changed in place: the delay screens and their reset, the port assignment screen and the
common module that sets a device's control port and its setup state, each for this remote (`juniper`) and
the sibling product (`hops`). So whatever a writer puts in a device list travels back up whole, unread
fields included.

**9. A learned raw code's grammar**, read in the infrared manager's raw code path and the loader, for
`packages/codec/src/harmony-touch/learned.ts`, which writes the text and reads it back by this grammar
(`todo-touch.md` 5.3). The loader keeps a command's `Raw` only when it is not null and its first character
is `F`, and the manager sends the key code instead whenever the command's `KeyCode` is a non empty string,
so a raw command states `KeyCode` null or empty. The manager then removes every dash (`gsub` with `%-`), and
walks the text with `gmatch` and `[PS]?%x+`: an optional upper case `P` or `S` and one or more hexadecimal
digits, either case, so every other character only separates two tokens and is never read. The first token
is matched, unanchored, with `([F])(%x+)`, and is the carrier in hexadecimal hertz; its period is a billion
over that carrier taken through the bit library's conversion, so rounded to the nearest nanosecond, the same
conversion as a family's period in 5. Every later token is matched with `([PS])(%x+)`; a value is read as a
hexadecimal number, and the prefix is compared with `P` alone, a mark for `P` and a space for anything else,
so `S` is never named. Each value goes through the duration word
writer of 4. A token that fails its pattern ends the reading: the manager logs and returns without setting the
sequence's word count, which stays 0, and the caller sends the packet regardless, since it does not look at
that return. What the native program plays for such a packet was not read. `F` being a hexadecimal digit has
two consequences the grammar keeps: a carrier's digits run on to the next `P` or `S`, and an `F` after a value
is one more digit of it. **Anchored inside the functions, not the files**: the compiled chunks are parsed as
Lua 5.1 (`lua_functions`, every byte consumed), each top level function found by the global it is assigned
to, and the constants asserted are those of the raw reader, `generateFromRawIr`, and of the loader's
command reader, `getCommandsAndToggleBytes`. A whole file was too wide a net: the empty string is a constant
of 68 of the 175 engine files, 16 of 14 and -1 of 25, and no engine file at all holds the string `S`. Inside
the raw reader: the dash, the empty string, the three patterns, `F` and `P`, the numbers 16, 1e9 and -1, the
packet kind 255, and the duration word writer's name; `S` is not among its constants while `P` is. The control
is the key code path, `generateFromKeyCode`, beside it, which holds none of the patterns. Inside the loader's
command reader: `Raw`, `KeyCode`, `sub`, 1 and `F`. That the key code wins over a raw text, and that a failed
token returns without the word count, are read in the decompiled source and not anchored. **What a writer of the text
chooses is not here**: the engine accepts any spelling of the grammar, and the spelling `learned.ts` writes,
upper case, four digits or eight, no separators, opening on `P`, is the one MyHarmony's learning code writes
(its carrier recorder, in the lab's decompiled client), which makes it a convention and not a fact of the
remote.

## What it settles and what it does not

**Settled**, on one build: the packet, the key code grammar as the remote reads it, how segments become
durations, the rounding of the period, the hand off, which fields the engine and the screens never
name, and the grammar a learned raw code is read by. **Not settled**: what `hal` does with the packet
beyond the three field names, the byte 50, the byte
after the repeat count, `ports`, how a start, repeat and finish are played and how the presilence is
adjusted for the repeat count; the native side's own conversion of the period; and what `G:` and the
trailing `:3` mean, since the remote ignores both.

**Width.** One firmware build, production 4.15.330, which serves every skin its descriptor names
(`tests/test_harmony_touch_image.py`); the preview build is not checked. The decompiled reading is of the
same build. The sync it is checked against is one account of infrared devices only, so the raw, Bluetooth,
keyboard and IP paths are read and not exercised, and no `Finish` group or encoding type 2 or 3 occurs in it.

**Sources checked first.** `reference/architectures/harmony-touch/`, `reference/remotes/harmony-touch/`,
`reference/infrared/` (all four pages), `reference/logitech/data-model/model.md`, `docs/findings.md`
sections 13, 92, 159, 228, 233 and 348, the lab register for the firmware's folder, the decompiled engine
and its README in the lab, and the lab note for this step, whose reading is checked here and corrected in
two places (the period, `ControlSection`). Logitech's desktop clients were not consulted: they hand the
documents over unchanged and never build infrared for this remote.

**Read in the decompiled engine and not anchored here.** The page states these on the reading alone, and
no assertion below would fail if they stopped being true; they are listed so that nobody takes the footnote
for more than it is:

* a held key sends `/ir/ir_send` with `enable` alone and no packet, and a release sends `enable` false
  (the sender's heartbeat and cancel functions);
* a command whose protocol or device is missing from the account sends nothing (the infrared manager's
  key code path returns false and the start reports an invalid command);
* the required fields: a device's `DeviceType` (indexed), `Manufacturer` (lowercased at load) and
  `Transport` (bit tested), a command's `TransportType` (bit tested at load) and `Raw` key (its first
  character taken), and `PressMinRepeats` and `InterDeviceDelay` when infrared is sent (compared and
  written into the packet); a missing `KeyCode` key leaves the code nil; `ControlPort` is assigned as it
  stands;
* `InterKeyDelay` is waited for and started only by a list of commands, and a single press goes straight
  to the sender (the activity handler's list path against its single command path);
* `IsScartCableSupported` holds back devices without it while a command for one with it waits, in the
  activity start's scheduler; `PowerTypeId` 0 and 3 are manual power, 1 discrete and 2 stepping;
  `IsPowerAlwaysOn` suppresses only the power off; `ConnectedAppPowerOnDelay` replaces the delay of that
  device's last power command when the activity's input is marked `IsOnline`;
* commands are kept by their lowercased name, so a later command of the same name replaces an earlier
  one, except on a device whose `Transport` has both the IP and the infrared bit, where both are kept
  under the transport's number;
* two durations of the same kind in a row stay two words: the segment builder appends each part's words
  and never merges them.

**Standing.** "Read in the firmware". Nothing here quotes Logitech's code; the constants asserted are names,
numbers and short patterns, and the image stays in the lab as Logitech's copyrighted firmware.
"""
import os
import re
import struct
import tempfile
import unittest

import lab
from test_harmony_touch_image import UNSQUASHFS, SquashfsReader, members

BUILD = 'touch_package_production'

ENGINE = 'opt/luaworks/'
SCREENS = 'opt/luadraws/'
HAL = 'usr/bin/hal'
LUAWORKS_SO = 'opt/lib/luaworks.so.0.0.0'
LUADRAWS_SO = 'opt/lib/luadraws.so.0.0.0'
#: What starts the engine, the two launchers and the two interpreters, for which one runs the engine.
STARTUP = 'etc/init.d/rcS'
ENGINE_LAUNCHER = 'opt/luaworks/luaworks'
SCREENS_LAUNCHER = 'opt/luadraws/luadraws'
LUA = 'usr/bin/lua'
LUAJIT = 'usr/bin/luajit-2.0.0-beta10'
INTERPRETERS = [STARTUP, SCREENS_LAUNCHER, LUA, LUAJIT]
CORE = ENGINE + 'tasks/harmonyengine/'
IRMANAGER = CORE + 'core/irmanager.lua'
IRSENDER = CORE + 'core/irsender.lua'
UTILITY = CORE + 'core/utility.lua'
PROTOCOL = CORE + 'model/protocol.lua'
DEVICE = CORE + 'model/device.lua'
READER = CORE + 'loader/userconfigreader.lua'
IPMANAGER = CORE + 'core/ipmanager.lua'

#: Fields of a device list or a protocol list that no engine file, screen and native program names.
UNREAD = [
    # a command's
    'CommandTypeId', 'IsLearned', 'FunctionGroupId', 'DateTaught',
    # a device's
    'DefaultPressMinRepeats', 'HoldInterKeyDelay', 'HoldInterDeviceDelay', 'IsInterKeyDelayOptimized',
    'DeviceOrder', 'GroupName', 'PrivateAddType', 'DongleIndex', 'Characterization', 'CopiedDeviceSource',
    'DeviceSearchType', 'DeviceClassification', 'AppLaunchConfigs', 'PictureId', 'RegionalCharset',
    'DecodedEdid', 'EncodedEdid', 'ActivityIds', 'GlobalLanguageVersionId-',
    # a device feature's
    'CanSkipInputs', 'IsAutoSwitch', 'PortTypes', 'ValueDelay', 'IsConfirmed', 'PowerOnResetInputName',
    # a protocol's
    'IsPadded', 'IsFullSequence', 'SendingType', 'HoldDelay', 'RelatedProtocols', 'IsPublic',
    'NumberOfLinkedLanguage',
    # the structure of a protocol's own `KeyCode` field: its entries are `{SegmentName, SegmentType}`
    'SegmentName',
]
#: The control: fields the engine does read, which the same search has to find.
READ = ['InterDeviceDelay', 'InterKeyDelay', 'PressMinRepeats', 'ControlPort', 'KeyCode', 'ProtocolId',
        'TransportType', 'CarrierFrequency', 'IRSegments', 'CodeSegments', 'ToggleBit', 'EncodingType']
#: Fields the screens read and the engine does not.
SCREENS_ONLY = ['DefaultInterKeyDelay', 'DefaultInterDeviceDelay', 'DefaultInputDelay', 'DefaultPowerOnDelay',
                'ParentDeviceManufacturer', 'ParentDeviceModel', 'IsMultiCode']
#: The screen files that save a changed device list whole.
SAVES_THE_DEVICE_LIST = sorted(SCREENS + p for p in [
    'appscommon/harmony.lua',
    'hops/settings/changeDelay.lua', 'hops/settings/portassignments.lua', 'hops/settings/resetDelay.lua',
    'juniper/settings/changeDelay.lua', 'juniper/settings/portassignments.lua', 'juniper/settings/resetDelay.lua',
])


def string_constant(text):
    """A Lua 5.1 string constant as this engine's chunks encode it: tag 4, `size_t` length with the NUL."""
    raw = text.encode('latin-1')
    return b'\x04' + struct.pack('<I', len(raw) + 1) + raw + b'\x00'


def number_constant(value):
    """A Lua 5.1 number constant: tag 3 and an 8 byte double, the size the engine's header states."""
    return b'\x03' + struct.pack('<d', float(value))


#: A string constant whose text begins with `G:`, whatever its length below 65536.
G_CONSTANT = re.compile(rb'\x04[\x00-\xff][\x00-\xff]\x00\x00G:')


def word(blob, at):
    return struct.unpack_from('<I', blob, at)[0]


def bl_target(blob, at):
    """Where a `bl` at `at` goes, or None when the word is not an unconditional `bl`."""
    instruction = word(blob, at)
    if instruction & 0xFF000000 != 0xEB000000:
        return None
    offset = instruction & 0x00FFFFFF
    if offset & 0x00800000:
        offset -= 0x01000000
    return at + 8 + (offset << 2)


def ldr_r3_literal(blob, at):
    """The literal an `ldr r3, [pc, #imm]` at `at` loads, or None when it is not that instruction."""
    instruction = word(blob, at)
    if instruction & 0xFFFFF000 != 0xE59F3000:
        return None
    return word(blob, at + 8 + (instruction & 0xFFF))


MOV_R2_0 = 0xE3A02000
#: The high word of the double 2^52 + 2^51, LuaBitOp's conversion constant.
HIGH_OF_2_52_PLUS_2_51 = struct.unpack('<II', struct.pack('<d', 2.0 ** 52 + 2.0 ** 51))[1]
#: `eor r3, r3, #0x80000000`: negating the second double's sign, how libgcc's subtraction opens before
#: falling into its addition.
NEGATE_SECOND_DOUBLE = 0xE2233102


@unittest.skipUnless(UNSQUASHFS, 'unsquashfs is not installed')
class TheImage(unittest.TestCase):
    """The production build's engine, screens and native programs, read once for every test below."""

    #: The files, read once for the three classes below rather than once each.
    _read = None

    @classmethod
    def setUpClass(cls):
        lab.require(BUILD)
        if TheImage._read is None:
            with tempfile.TemporaryDirectory() as directory:
                reader = SquashfsReader(members(BUILD)['harmony-image.squashfs'], directory)
                engine = [p for p in reader.names() if p.startswith(ENGINE)]
                screens = [p for p in reader.names() if p.startswith(SCREENS) and p.endswith('.lua')]
                files = reader.each(engine + screens + [HAL, LUAWORKS_SO, LUADRAWS_SO] + INTERPRETERS)
            TheImage._read = (
                {p: files[p] for p in engine},
                {p: files[p] for p in screens},
                {p: files[p] for p in (HAL, LUAWORKS_SO, LUADRAWS_SO)},
                {p: files[p] for p in INTERPRETERS},
            )
        cls.engine, cls.screens, cls.native, cls.start = TheImage._read

    def holding(self, name, files):
        return sorted(p for p, data in files.items() if name.encode('latin-1') in data)


class TheEngineBuildsThePacketItself(TheImage):
    """Facts 1, 2 and 6: the packet's constants, the key code reading and the hand off."""

    def test_the_generator_holds_the_packet_kinds_the_constant_50_and_the_default_repeat_count(self):
        irmanager = self.engine[IRMANAGER]
        for value in (1, 50, 255, 3):
            self.assertIn(number_constant(value), irmanager, value)
        self.assertIn(string_constant('[PS]?%x+'), irmanager, 'the raw code reader')

    def test_a_key_code_is_read_as_its_bracketed_groups_split_on_underscores(self):
        irmanager = self.engine[IRMANAGER]
        for text in ('%b()', '_', 'x'):
            self.assertIn(string_constant(text), irmanager, text)
        self.assertIsNone(G_CONSTANT.search(irmanager), 'nothing in the generator reads the G: prefix')

    def test_only_an_ip_plugin_holds_a_constant_beginning_with_g(self):
        self.assertEqual(sorted(p for p, data in self.engine.items() if G_CONSTANT.search(data)),
                         [CORE + 'plugins/hopper.lua'])

    def test_the_protocol_model_reads_segments_atoms_toggle_bit_and_encoding_and_names_segments_by_keycode(self):
        protocol = self.engine[PROTOCOL]
        for text in ('IrProtocol', 'BluetoothProtocol', 'HidProtocol', 'IRSegments', 'CodeSegments', 'Atoms',
                     'TotalLength', 'ToggleBit', 'EncodingType', 'KeyCode', 'CarrierFrequency'):
            self.assertIn(string_constant(text), protocol, text)
        self.assertIn(number_constant(1e9), protocol, 'the period is a billion over the frequency')
        self.assertIn(number_constant(-1), protocol, 'taken through band with -1')

    def test_a_duration_word_splits_at_32767_floors_at_30_and_marks_with_the_top_bit(self):
        utility = self.engine[UTILITY]
        for value in (32767, 30, 127, 255, 128):
            self.assertIn(number_constant(value), utility, value)

    def test_the_sender_hands_the_packet_to_hal_as_ir_send_with_key_latency_and_ports(self):
        irsender = self.engine[IRSENDER]
        for text in ('/ir/ir_send', '/rf/hot/1/ir/ir_send', 'enable', 'keyLatency', 'ports'):
            self.assertIn(string_constant(text), irsender, text)
        hal = self.native[HAL]
        for text in (b'/ir/ir_send\x00', b'period_ns', b'presilence', b'min_repeat', b'keyLatency'):
            self.assertIn(text, hal, text)


def lua_functions(blob):
    """The top level functions of a compiled Lua 5.1 chunk, by the global each is assigned to, as constant lists.

    The layout is stock Lua 5.1 with 4 byte ints and `size_t` and 8 byte numbers, which the engine's header
    states; the parse has to consume every byte, which is its own check. A top level `function name` compiles
    to a closure over the main function's prototype list followed by a store into the global `name`, so the
    main function's code is walked for that pair: `CLOSURE` (opcode 36) loads a prototype into a register and
    `SETGLOBAL` (opcode 7) stores that register under a constant's name.
    """
    at = 12

    def take(fmt):
        nonlocal at
        value = struct.unpack_from(fmt, blob, at)[0]
        at += struct.calcsize(fmt)
        return value

    def text():
        nonlocal at
        n = take('<I')
        if n == 0:
            return None
        value = blob[at:at + n - 1].decode('latin-1')
        at += n
        return value

    def function():
        nonlocal at
        text()
        at += 4 + 4 + 4  # the lines it is defined on, and four bytes of counts and flags
        n = take('<i')
        code = list(struct.unpack_from('<%dI' % n, blob, at))
        at += 4 * n
        constants = []
        for _ in range(take('<i')):
            tag = take('<B')
            constants.append(None if tag == 0 else bool(take('<B')) if tag == 1
                             else take('<d') if tag == 3 else text() if tag == 4 else ValueError(tag))
        prototypes = [function() for _ in range(take('<i'))]
        lines = take('<i')  # line information, counted first: `at += 4 * take(...)` would lose the count's own 4
        at += 4 * lines
        for _ in range(take('<i')):  # local names and their ranges
            text()
            at += 8
        for _ in range(take('<i')):  # upvalue names
            text()
        return code, constants, prototypes

    code, constants, prototypes = function()
    if at != len(blob):
        raise ValueError(f'{at} of {len(blob)} bytes read')
    out, loaded = {}, {}
    for instruction in code:
        opcode, a, bx = instruction & 0x3F, (instruction >> 6) & 0xFF, instruction >> 14
        if opcode == 36:
            loaded[a] = bx
        elif opcode == 7 and a in loaded and isinstance(constants[bx], str):
            out[constants[bx]] = prototypes[loaded.pop(a)][1]
    return out


class TheEnginesRawCodeGrammar(TheImage):
    """Fact 9: the constants of the engine's raw code reader and of the loader's command reader, by function."""

    #: The raw reader's patterns, which the key code path beside it must not hold.
    PATTERNS = ('%-', '[PS]?%x+', '([F])(%x+)', '([PS])(%x+)')

    def functions(self, path):
        return lua_functions(self.engine[path])

    def test_the_chunk_reader_reads_every_compiled_engine_file_to_its_last_byte(self):
        # The parse is what scopes every assertion below, so it is held over all 172 chunks, not only two.
        chunks = [data for data in self.engine.values() if data[:4] == b'\x1bLua']
        self.assertEqual(len(chunks), 172)
        for data in chunks:
            lua_functions(data)

    def test_the_raw_reader_holds_the_dash_the_three_patterns_f_p_and_the_carrier_arithmetic(self):
        raw = self.functions(IRMANAGER)['generateFromRawIr']
        for value in self.PATTERNS + ('', 'F', 'P', 'appendDurationToByteArray'):
            self.assertIn(value, raw, value)
        for value in (16, 1e9, -1, 255):
            self.assertIn(float(value), [c for c in raw if isinstance(c, float)], value)

    def test_the_raw_reader_names_p_and_not_s(self):
        raw = self.functions(IRMANAGER)['generateFromRawIr']
        self.assertIn('P', raw)
        self.assertNotIn('S', raw)

    def test_the_key_code_path_beside_it_holds_none_of_the_raw_patterns(self):
        # The control that makes the function scope mean something: the same file's other sender.
        keycode = self.functions(IRMANAGER)['generateFromKeyCode']
        self.assertEqual([p for p in self.PATTERNS if p in keycode], [])

    def test_the_loaders_command_reader_holds_raw_keycode_sub_1_and_f(self):
        commands = self.functions(READER)['getCommandsAndToggleBytes']
        for value in ('Raw', 'KeyCode', 'sub', 'F'):
            self.assertIn(value, commands, value)
        self.assertIn(1.0, [c for c in commands if isinstance(c, float)])


class TheEngineRunsOnLua51AndNotOnLuaJIT(TheImage):
    """Fact 5a: which of the image's two interpreters runs the engine, so whose bit library it uses."""

    def test_the_image_carries_both_interpreters(self):
        self.assertIn(b'Lua 5.1.4', self.start[LUA])
        self.assertIn(b'LuaJIT 2.0.0-beta10', self.start[LUAJIT])

    def test_the_start_up_script_starts_the_engine_launcher_and_it_runs_lua_51_on_the_remote(self):
        self.assertIn(b'/opt/luaworks/luaworks', self.start[STARTUP])
        launcher = self.engine[ENGINE_LAUNCHER]
        self.assertIn(b'=/usr/bin/lua\n', launcher, 'the interpreter of the branch that runs on the remote')
        self.assertNotIn(b'luajit-2.0.0-beta10', launcher)
        self.assertIn(b'/usr/bin/luajit-2.0.0-beta10', self.start[SCREENS_LAUNCHER], 'LuaJIT runs the screens')

    def test_every_engine_file_is_a_lua_51_chunk_and_none_is_luajit_bytecode(self):
        chunks = {p: data for p, data in self.engine.items() if p.endswith('.lua')}
        self.assertEqual(len(chunks), 172)
        self.assertEqual([p for p, data in chunks.items() if not data.startswith(b'\x1bLua\x51')], [])
        self.assertEqual([p for p, data in chunks.items() if data.startswith(b'\x1bLJ')], [])

    def test_the_engines_native_library_names_no_luajit_and_carries_its_own_bit_module(self):
        luaworks = self.native[LUAWORKS_SO]
        self.assertNotIn(b'luajit', luaworks.lower())
        self.assertIn(b'luaopen_bit\x00', luaworks)


class TheCarrierPeriodIsRounded(TheImage):
    """Fact 5: the bit library's conversion is LuaBitOp's, an IEEE addition of 2^52 + 2^51."""

    def test_the_bit_library_is_luabitop(self):
        luaworks = self.native[LUAWORKS_SO]
        self.assertIn(b'luaopen_bit\x00', luaworks)
        self.assertIn(b'bit library self-test failed', luaworks)

    def test_its_argument_conversion_adds_2_to_the_52_plus_2_to_the_51_through_the_double_addition(self):
        luaworks = self.native[LUAWORKS_SO]
        self.assertEqual(HIGH_OF_2_52_PLUS_2_51, 0x43380000)
        sites = []
        for at in range(0, len(luaworks) - 12, 4):
            if word(luaworks, at) != MOV_R2_0 or ldr_r3_literal(luaworks, at + 4) != HIGH_OF_2_52_PLUS_2_51:
                continue
            target = bl_target(luaworks, at + 8)
            if target is not None and word(luaworks, target - 4) == NEGATE_SECOND_DOUBLE:
                sites.append(at)
        self.assertEqual(len(sites), 1, 'one conversion routine')

    def test_round_and_truncate_of_a_billion_over_38000_are_26316_and_26315(self):
        # Arithmetic only, the two values the page names; it says nothing about the remote.
        period = 1e9 / 38000
        self.assertEqual((round(period), int(period)), (26316, 26315))


class FieldsTheRemoteNeverReads(TheImage):
    """Facts 7 and 8: what no file names, what the screens alone name, and the whole document saved."""

    def everywhere(self):
        return {**self.engine, **self.screens, **self.native}

    def test_the_search_covers_every_engine_file_and_every_screen_file(self):
        # The counts `tests/test_harmony_touch_image.py` states for this build.
        self.assertEqual(sum(1 for p in self.engine if p.endswith('.lua')), 172)
        self.assertEqual(len(self.screens), 243)

    def test_no_engine_file_screen_or_native_program_names_these_fields(self):
        found = {name: self.holding(name, self.everywhere()) for name in UNREAD}
        self.assertEqual({name: files for name, files in found.items() if files}, {})

    def test_the_same_search_finds_the_fields_the_engine_reads(self):
        missing = [name for name in READ if not self.holding(name, self.engine)]
        self.assertEqual(missing, [])

    def test_the_screens_alone_read_these(self):
        for name in SCREENS_ONLY:
            with self.subTest(field=name):
                self.assertEqual(self.holding(name, self.engine), [])
                self.assertNotEqual(self.holding(name, self.screens), [])

    def test_the_familys_own_repeat_counts_are_named_by_the_protocol_model_alone(self):
        for name in ('PressMinimumRepeats', 'HoldMinimumRepeats'):
            with self.subTest(field=name):
                self.assertEqual(self.holding(name, self.everywhere()), [PROTOCOL])

    def test_hold_min_repeats_is_named_by_the_reader_and_two_models_and_no_other_engine_file(self):
        self.assertEqual(self.holding('holdMinRepeats', self.engine), sorted([READER, DEVICE, PROTOCOL]))

    def test_control_section_is_named_by_the_protocol_model_and_the_ip_manager_alone(self):
        self.assertEqual(self.holding('controlSection', self.engine), sorted([IPMANAGER, PROTOCOL]))

    def test_seven_screen_files_save_a_changed_device_list_whole(self):
        self.assertEqual(self.holding('putResource("DeviceList"', self.screens), SAVES_THE_DEVICE_LIST)


if __name__ == '__main__':
    unittest.main()
