/**
 * What a Harmony Touch answers when its power source is read over the cable: the first read of
 * `/tde/powerstate` on a unit.
 *
 * **The question.** A Touch's screens take part in a sync only on the power source its software calls `usb`, and
 * the library reads the source before a sync and refuses on any other, `readTouchPowerSource`. That opening the
 * name for reading is a plain read was read in the remote's native program,
 * `tests/harmony_touch/test_harmony_touch_api_names.py` and `reference/architectures/harmony-touch/api/names.md`.
 * What the firmware could not say is what a unit's file holds: the exact text for a source and whether a newline
 * follows it, which decides whether a comparison with `usb` needs the text trimmed.
 *
 * **The prediction, written before the read**: the text `usb`, since the sync run before it had
 * committed, which the screens allow on `usb` alone; whether a newline follows was left for the bytes to say.
 *
 * **The instrument.** The library's own read, `readTouchPowerSource`, on a transport `openFileBasedRemote` opened
 * on the Touch's product id: the identity file for the build, then ping, open for reading, read and close of the
 * name; then the same name read once more with `readFile` for its bytes as they came, kept in the lab. No flag was
 * set and nothing was written.
 *
 * **What it measured.** Four bytes: `usb` and one line feed. So:
 *
 * * a unit answers the name over the cable, on the read only route, and the remote went on working: a dry run of a
 *   sync directly after it read `usb` again and ended as a dry run;
 * * the text is one of the five names the power controller's driver holds, with a line feed after it and nothing
 *   else, so the library's trim is needed and is enough for this source;
 * * the pretend Touch of the test kit serves the same four bytes when a test states no other, so the tests that
 *   lean on its default lean on what a unit sent.
 *
 * **What it does not settle.** The text on any other source: no unit was read on a charger, in its cradle or on
 * battery (on battery there is no cable to read over). Which ports give `usb` and which `usb_charge`. What the
 * power controller's driver does when its file is read, beyond that the remote kept working.
 *
 * **What would have falsified it**: a refusal of the open, an empty answer, a text that is none of the five names,
 * or the remote failing its next request. The control below shows the comparison is not one any four bytes pass.
 *
 * **Sources checked first**: the native program, for what the open does; the remote's screens, which watch the same
 * file; Logitech's client, which never opens the name. **Width**: one unit of the Harmony Touch, firmware 4.15.330,
 * one port, one source.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as lab from '@harmony/lab';
import { FakeTouchRemote } from '@harmony/testkit/fake-touch-remote';

import {
  TOUCH_POWER_PATH, TOUCH_POWER_SOURCES, guardFileProtocol, readFile, readTouchPowerSource,
} from '../../src/filepipe.ts';
import { TOUCH_PRODUCT_ID } from '../../src/rails.ts';

/** The bytes the unit's `/tde/powerstate` gave, as they came. */
const READ = 'touch_power_source_read';

/** An identity file of the build the name is read in; the unit's own is not needed for what is claimed here. */
const SYSINFO = 'arch 0x11\nskin 0x63\nusb_product_id 0xc12b\nfw_ver 4.15.330\n';

test('the unit answered four bytes: usb and one line feed', lab.skipUnless(READ), () => {
  const bytes = lab.require_(READ);
  assert.deepEqual([...bytes], [0x75, 0x73, 0x62, 0x0a]);
  // One of the five names the driver holds, once the line feed is gone, and not with it.
  const text = Buffer.from(bytes).toString('latin1');
  assert.ok((TOUCH_POWER_SOURCES as readonly string[]).includes(text.trim()));
  assert.ok(!(TOUCH_POWER_SOURCES as readonly string[]).includes(text), 'the control: untrimmed, it is no source name');
});

test('the library reads those bytes as usb, and the pretend Touch serves the same bytes by default', lab.skipUnless(READ), async () => {
  const bytes = lab.require_(READ);
  const served = new FakeTouchRemote({ sysinfo: SYSINFO, powerstate: Buffer.from(bytes).toString('latin1') });
  assert.equal(await readTouchPowerSource(guardFileProtocol(served, TOUCH_PRODUCT_ID)), 'usb');

  // The pretend Touch with nothing stated: what it serves is byte for byte what the unit sent.
  const pretend = new FakeTouchRemote({ sysinfo: SYSINFO });
  assert.deepEqual([...await readFile(guardFileProtocol(pretend, TOUCH_PRODUCT_ID), TOUCH_POWER_PATH)], [...bytes]);

  // The control: another source's text, served the same way, is not read as usb.
  const charging = new FakeTouchRemote({ sysinfo: SYSINFO, powerstate: 'usb_charge\n' });
  assert.notEqual(await readTouchPowerSource(guardFileProtocol(charging, TOUCH_PRODUCT_ID)), 'usb');
});
