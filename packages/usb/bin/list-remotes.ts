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
import { type FoundRemote, listHarmony, listMicrochipBootloaders, skinId } from '../src/index.ts';

function describe(remote: FoundRemote): void {
  console.log(
    `0x${remote.vendorId.toString(16).padStart(4, '0')}:` +
      `0x${remote.productId.toString(16).padStart(4, '0')}  ` +
      `${remote.manufacturer ?? '?'} ${remote.product ?? '?'}`,
  );
  console.log(`  path ${remote.path ?? 'none, so it cannot be opened'}`);
}

const found = await listHarmony();
// Asked separately, because a remote held in its bootloader is not a Harmony by vendor id and used
// to report as nothing at all. `docs/findings.md` section 189.
const inRecovery = await listMicrochipBootloaders();

for (const remote of found) describe(remote);

for (const remote of inRecovery) {
  describe(remote);
  console.log('  a Microchip bootloader, which is what a Harmony in recovery looks like');
  console.log('  this library speaks the application protocol and cannot talk to it');
  console.log('  a power cycle without the key held boots normally: nothing latches this state');
}

if (found.length === 0 && inRecovery.length === 0) {
  console.log('no Harmony remote attached, and nothing in a bootloader either');
  console.log('(a Logitech mouse is not one: the Harmony product range is 0xC110 to 0xC14F)');
}

// The skin comes from bcdDevice, which HID enumeration does not report, so it is not printed
// here. Stated rather than silently omitted, since `skinId` exists and someone will look for it.
void skinId;
