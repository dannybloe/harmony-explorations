/**
 * List attached Harmony remotes. Enumeration only, nothing is opened.
 *
 *     node packages/usb/bin/list-remotes.ts
 *
 * The counterpart of `tools/usbprobe.py`, over HID rather than libusb, and it exists for the same
 * reason: answering "is the remote actually plugged in" must not require opening it. The Python one
 * stays, because it reads the descriptors, which HID enumeration does not expose.
 *
 * This must never grow a code path that sends a command. That belongs in the library, behind the
 * rails, where a caller meets the refusals.
 */
import { listHarmony, skinId } from '../src/index.ts';

const found = await listHarmony();
if (found.length === 0) {
  console.log('no Harmony remote attached');
  console.log('(a Logitech mouse is not one: the Harmony product range is 0xC110 to 0xC14F)');
} else {
  for (const remote of found) {
    console.log(
      `0x${remote.vendorId.toString(16).padStart(4, '0')}:` +
        `0x${remote.productId.toString(16).padStart(4, '0')}  ` +
        `${remote.manufacturer ?? '?'} ${remote.product ?? '?'}`,
    );
    console.log(`  path ${remote.path ?? 'none, so it cannot be opened'}`);
  }
  // The skin comes from bcdDevice, which HID enumeration does not report, so it is not printed
  // here. Stated rather than silently omitted, since `skinId` exists and someone will look for it.
  void skinId;
}
