#!/usr/bin/env python3
"""The Harmony Hub's firmware, read in the hubs' production image 4.15.600, read only, as the evidence
anchor for `reference/architectures/harmony-touch/hub/`.

**What this covers.** The hub runs a sibling of the Harmony Touch's software, so the engine and its request
API are the Touch's and are anchored by the other tests in this folder. What is the hub's own, and is read
here, is the Linux system it runs on, where it keeps its configuration and its wifi network, the native
command surface that drives its infrared, radio and Bluetooth hardware, how it is reached over the network,
and how it is provisioned and runs home automation. Each fact the hub pages state carries a `t-hub-*`
footnote that links this test, and each assertion below is the presence of the exact string the prose rests
on, in the decoded root filesystem.

**How the image is read.** `test_harmony_touch_architecture.TheHubsImageStatesTheSameSeventeen` already
decodes this image block by block: its squashfs root filesystem uses LZMA blocks whose five byte header lacks
the uncompressed size field, so `unsquashfs` refuses it and an unknown size is spliced in for Python's
decoder, and the chain of data blocks from offset 96 lands exactly on the inode table, the closure that the
blocks were cut right. This test reuses that decoder, `lzma_blocks`, concatenates the decoded data blocks
into one buffer, and asserts that the strings the hub pages quote occur in it. It is string presence, not a
directory walk: the prose names the file a string lives in, and the test anchors that the content is in the
image. The small configuration files whose contents are quoted (the boot scripts, `wpa_supplicant.conf`)
decode into this buffer along with the engine and the native binaries, checked once in
`test_the_subsystem_strings_are_all_present`.

**Scope.** One build of the hubs' image, 4.15.600, the production package whose descriptor names skins 97,
106 and 109. What a live hub does, and anything that needs the processor's instructions disassembled (the
machine has no MIPS disassembler), is not settled here and the pages say so where it matters. Nothing was
sent to a hub to produce any of this; it is read in the image.
"""
import unittest

import lab
from . import test_harmony_touch_image as image
from .test_harmony_touch_architecture import lzma_blocks

HUB = image.HUB

# Every string the hub reference pages rest on, grouped by the page that cites it. Each is quoted verbatim
# from the decoded root filesystem; the prose names the file it lives in. Adding a fact to a hub page adds
# its string here, so the page and the image cannot drift apart silently.
SYSTEM = (
    b'4.15.600',                       # etc/version, the build
    b'Yocto Linux (Built by Poky 4.0)',  # etc/issue, the distribution
    b'2.6.31',                         # the kernel version (module vermagic)
    b'MIPS32_R2',                      # the processor family (module vermagic)
    b'uClibc',                         # the C library
    b'BusyBox v1.13.4',                # the userland and init
    b'pimentoblue',                    # etc/hostname, the board codename
    b'./luaworks --syslog',            # etc/init.d/rcS launches the engine
    b'/usr/bin/hal',                   # the native USB and hardware program
    b'/data/resources/',               # where the configuration resources persist
    b'/cache/',                        # the download and OTA store
    b'ctrl_interface=/var/run/wpa_supplicant',  # etc/wpa_supplicant.conf
    b'update_config=1',                # etc/wpa_supplicant.conf, SAVE_CONFIG rewrites it
    b'cc2544',                         # the RF coprocessor driver
    b'gadgetfs',                       # USB device mode, the file protocol to the computer
    b'/sys/class/input/input0/tde',    # the test and development boot flag
    b'Cannot access this API in production mode',  # the tde gate on the file transfer API
)

# The native command surface, hub.md "radio.md": the hal binary's hardware commands and the wpa_supplicant
# sequence that configures wifi. All verbatim in usr/bin/hal.
NATIVE = (
    b'wifi.connect',                   # set the wifi network, {ssid, password, encryption}
    b'wifi.networks',                  # scan
    b'wifi.status',                    # the only wifi command the engine itself sends, a read
    b'/var/run/wpa_supplicant/ath0',   # the control socket hal drives
    b'SET_NETWORK %d psk "%s"',        # the wpa_supplicant key set
    b'SAVE_CONFIG',                    # persist the network
    b'WPA2-PSK',                       # a supported security type
    b'ir.send',                        # send an infrared code
    b'ir.cap',                         # learn an infrared code
    b'/ir/ir_send',                    # the hub's own blaster path
    b'rf.pairing',                     # open the 2.4 GHz radio to add a device
    b'bthid.connect',                  # Bluetooth HID to a game console
    b'hid.setdevice',                  # emulate a keyboard
    b'/sys/factoryreset',              # the factory reset action
    b'/sys/reboot',                    # restart the hub
    b'led_NoConfig',                   # a status LED state
)

# The network transport, hub.md "network.md": the listeners, the login mechanism, discovery. String
# literals of the Lua transport, present in the engine's bytecode.
NETWORK = (
    b'connect.logitech.com',           # the hub's outbound XMPP client, the cloud leg
    b'.myharmony.com',                 # the 8088 WebSocket origin gate
    b'urn:myharmony-com:device:harmony:1',  # the SSDP service type a LAN client searches for
    b'Wrong hubId',                    # the 8088 handshake's only credential check
    b'enableXMPP',                     # the config flag that gates the 5222 server
)

# The engine, hub.md README and "provisioning.md" and "automation.md": the configuration reassembly, the
# provisioning store and endpoints, the home automation plugins, and the self-update apply. Lua literals.
ENGINE = (
    b'createConfig',                   # harmony.engine?config reassembles the reply
    b'AutomationConfig',               # the home automation resource, hub-only
    b'CapabilityList',                 # the capability resource, hub-only
    b'luaworks/provision',             # the provisioning store folder under /data
    b'svcs.myharmony.com',             # Logitech's discovery and auth endpoints
    b'insteon',                        # a home automation plugin
    b'hunterdouglas',                  # a home automation plugin
    b'ecobee',                         # a home automation plugin
    b'ota-update.zip',                 # the local OTA apply target in /cache
)


def hub_blob():
    """The hubs' root filesystem data blocks, decoded and concatenated into one buffer."""
    import struct
    image_bytes = image.members(HUB)['harmony-image.squashfs']
    assert image_bytes[:4] == b'hsqs', 'not a squashfs 4 image'
    inode_table = struct.unpack_from('<Q', image_bytes, 64)[0]
    blocks = lzma_blocks(image_bytes, 96, inode_table)[0]
    return b''.join(d for _, d in blocks)


class HubFirmware(unittest.TestCase):
    """The strings the hub pages rest on, in the decoded hubs' image 4.15.600."""

    @classmethod
    def setUpClass(cls):
        lab.require(HUB)
        cls.blob = hub_blob()

    def test_the_system_and_boot_strings_are_present(self):
        for needle in SYSTEM:
            with self.subTest(needle=needle):
                self.assertIn(needle, self.blob)

    def test_the_native_command_strings_are_present(self):
        for needle in NATIVE:
            with self.subTest(needle=needle):
                self.assertIn(needle, self.blob)

    def test_the_network_transport_strings_are_present(self):
        for needle in NETWORK:
            with self.subTest(needle=needle):
                self.assertIn(needle, self.blob)

    def test_the_engine_provisioning_and_automation_strings_are_present(self):
        for needle in ENGINE:
            with self.subTest(needle=needle):
                self.assertIn(needle, self.blob)


if __name__ == '__main__':
    unittest.main()
