#!/usr/bin/env python3
"""How a hub-paired remote of this generation drives its hub, read in the remotes' image 4.15.330, as the
evidence anchor for `reference/architectures/harmony-touch/remote-and-hub.md`.

**What this covers, and why it is the generation's and not one model's.** The Harmony Elite is a remote and a
hub together, and the remote runs the generation's remotes image, the same one the Harmony Touch runs. What is
read here is not the Elite alone but the behaviour of a remote that is paired to a hub, which the Elite is one
instance of alongside the Ultimate and Ultimate Home remotes: it addresses the hub as `hot.1` and sends it the
same requests the handheld sends over a cable, the native layer tunnelling them over the 2.4 GHz radio, the
mirror of the hub's own `/rf/hot/N/` paths. The remote delegates its clock, its configuration resources, its
firmware and more to the hub, keeps its own infrared blaster, and takes its whole setup from the hub when it is
provisioned in mode 4. Its screens are drawn by a separate process, `luadraws`, which the hub has not, and its
hardware adds haptics, a battery, a backlight and an accelerometer that a hub also has not.

**The smart home capability model.** A hub paired remote draws screens a standalone remote has no use for, for
lights, blinds and the rest, and this test anchors how they work. The screen reads two sources kept apart: the
structure, which devices there are and what each can do, is read on the remote out of the synced automation
configuration (`AutomationConfig`, through `getResource`), where each device carries a kind and a table of
`capabilities` that choose the controls (a `dimUpDown` capability is what turns a lamp's switch into a
brightness control); and the live state is a request tunnelled to the hub (`harmony.automation?getstate` and
`?setstate` over the `ltcp` transport, the hot.1 link). The whole side is gated on the remote being a hub
surface, `isSurfaceMode`, which is mode 4 and `PairStatus` together, so a standalone remote shows none of it.
The strings are quoted verbatim in the ASCII Lua of the named screen files under `opt/luadraws`.

**How the image is read.** The remotes' squashfs uses zlib blocks, which mainline `unsquashfs` reads, so this
test reads named files out of it with `SquashfsReader`, the reader `test_harmony_touch_image` already uses, and
asserts the strings the page rests on, in the files the page names. The hubs' image is read separately, in LZMA
blocks, by `test_harmony_hub_firmware`.

**Scope.** One build of the remotes' image, 4.15.330. The hardware strings are read in the remote's native USB
program and are its presence, not its exact behaviour, which needs the processor's instructions disassembled
and is left open on the page. Nothing was sent to a remote to produce any of this; it is read in the image.
"""
import tempfile
import unittest

import lab
from . import test_harmony_touch_image as image

NAME = 'touch_package_production'

# The remote-to-hub link and mode-4 provisioning, in the engine's setup and sync tasks; each string is quoted
# verbatim in the compiled Lua of the named file.
ACCOUNT = (
    b'autoProvisionFromHub',            # the remote takes its setup from a paired hub
    b'getProvisionInfo',                # the request it sends the hub, hot.1.setup.account?getProvisionInfo
    b'Pimento is not in hub mode',      # the refusal when the hub is not in full hub mode (mode 3)
)
SYNC = (
    b'proxy.resource',                  # the remote pulls its configuration resources from the hub
    b'data.resource',                   # the file route to the same
)
# The remote's own hardware, in its native USB program; present where a hub has none. strings of usr/bin/hal.
HARDWARE = (
    b'/tde/haptic/calibrate',           # haptics, with auto-calibration
    b'tps6507x',                        # the battery and power management chip
    b'battcharge',                      # the battery charge read
    b'ap3156_backlight',                # the screen backlight driver
    b'/tde/accel',                      # the accelerometer
)
# The remote's screen engine, which the hub has not: the skin directory and a few of its screens, including the
# smart-home screens a standalone infrared remote has no use for.
LUADRAWS = (
    'opt/luadraws/main.lua',
    'opt/luadraws/juniper/blinds.lua',
    'opt/luadraws/juniper/alllights.lua',
    'opt/luadraws/juniper/activity.lua',
)
# The smart-home capability model, in the remote's screen source (ASCII Lua under opt/luadraws). Two data
# sources kept apart: the live state is a request tunnelled to the hub, the structure is read from the synced
# configuration, and the per-device capability table chooses the controls.
AUTOMATION = (
    b'harmony.automation?getstate',     # the remote asks the hub for the live state of the devices on screen
    b'harmony.automation?setstate',     # a tap writes the new state back to the hub
    b'ltcp',                            # the transport for both: the hot.1 tunnel to the hub
)
CAPABILITY = (
    b'AutomationConfig',                # the synced resource that carries the smart-home structure
    b'getResource',                     # the structure is read from the synced resource cache, not per screen
    b'capabilities',                    # the per-device capability table
    b'dimUpDown',                       # a dim capability turns a lamp's on/off switch into a brightness control
    b'gateways',                        # the bridges the hub found; none means no rows
)
# The smart-home side is shown only on a remote provisioned from a hub (mode 4) and paired; a standalone remote
# shows none of it. In network/networkswitch.lua.
GATE = (
    b'isSurfaceMode',                   # the one gate on every smart-home row, group and screen
    b'PairStatus',                      # with mode 4, the second half of the gate
)


@unittest.skipUnless(image.UNSQUASHFS, 'unsquashfs is not installed')
class TheHubPairedRemote(unittest.TestCase):
    """The strings the remote-and-hub page rests on, in the decoded remotes' image 4.15.330."""

    @classmethod
    def setUpClass(cls):
        lab.require(NAME)
        cls.tmp = tempfile.TemporaryDirectory()
        cls.reader = image.SquashfsReader(image.members(NAME)['harmony-image.squashfs'], cls.tmp.name)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_the_remote_takes_its_setup_and_resources_from_the_hub(self):
        account = self.reader.cat('opt/luaworks/tasks/setup/apihandler/account.lua')
        for needle in ACCOUNT:
            with self.subTest(needle=needle):
                self.assertIn(needle, account)
        sync = self.reader.cat('opt/luaworks/tasks/harmonywebservices/proxy/sync.lua')
        for needle in SYNC:
            with self.subTest(needle=needle):
                self.assertIn(needle, sync)

    def test_the_remote_has_hardware_a_hub_has_not(self):
        hal = self.reader.cat('usr/bin/hal')
        for needle in HARDWARE:
            with self.subTest(needle=needle):
                self.assertIn(needle, hal)

    def test_the_remote_draws_its_own_screens(self):
        names = self.reader.names()
        for path in LUADRAWS:
            with self.subTest(path=path):
                self.assertIn(path, names)

    def test_the_smart_home_screens_read_the_hub_for_live_state(self):
        ha = self.reader.cat('opt/luadraws/juniper/hainterface.lua')
        for needle in AUTOMATION:
            with self.subTest(needle=needle):
                self.assertIn(needle, ha)

    def test_the_controls_are_chosen_by_each_device_capabilities(self):
        dev = self.reader.cat('opt/luadraws/juniper/homeautomationdevices.lua')
        for needle in CAPABILITY:
            with self.subTest(needle=needle):
                self.assertIn(needle, dev)

    def test_the_smart_home_side_is_gated_on_hub_provisioning(self):
        ns = self.reader.cat('opt/luadraws/network/networkswitch.lua')
        for needle in GATE:
            with self.subTest(needle=needle):
                self.assertIn(needle, ns)


if __name__ == '__main__':
    unittest.main()
