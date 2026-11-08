/**
 * The key reader's link to a remote, and **the one place in the page that sends anything to it**.
 *
 * This is the first code of this project that a stranger's browser runs against their own remote, so the
 * whole design of the module is about what it cannot do. A Harmony is irreplaceable, and the same USB
 * channel that reads a key also erases flash, writes data memory and restarts the remote; on arch 14 even
 * a version request with a payload writes, `isReadOnlyReport` in `@harmony/usb/protocol`. So:
 *
 *   * **One function sends, `send`**, and it is the only code in the built page that touches the device's
 *     send method. `test/send.test.ts` reads every published file and fails on any other mention of it,
 *     and on any mention at all of the feature report method.
 *   * **`send` decides by the bytes it is given, not by which builder made them**, `checkReport`. It
 *     passes exactly two shapes: the bare version request, and a one byte data memory read, `READ_MISC`
 *     selector `0x07`, at an address the connected model keeps a key in. Everything else is refused before
 *     the device is touched. What then goes on the cable is the library's own builder output for the shape
 *     that passed, so a caller can not smuggle a byte through a check that looked at a copy.
 *   * **The device never leaves this module.** The page calls `connect`, which asks the browser for a
 *     remote and hands back a `KeyLink`, an object with a reading and a close and nothing else; the
 *     `HIDDevice` stays inside the closure that `openLink` makes.
 *   * **Which remotes are opened at all is an allow list of product ids**, `OPENED_PRODUCTS`, holding arch 8's
 *     alone for now. The Harmony Touch, 300 and 350 speak the file protocol, the 525 has no data memory read
 *     (`HarmonyRemote.readRam` refuses it), and a remote in its bootloader shares its application's ids, so
 *     the product string and then the version block's software type refuse it.
 *   * **The model is read off the remote and never asked of the person**: the version block's field 5 is the
 *     skin, in plain binary on arch 8, `reference/architectures/harmony-880-885/usb.md`. WebHID exposes no
 *     `bcdDevice`, where the command line tools read it.
 *
 * Every refusal throws a `Refused` naming which one, and each is written as a call of `refuse` with its
 * name as the first argument. The tests rely on that shape: a control replaces one such call and shows the
 * refused input getting through, which is what proves each test can fail.
 *
 * Built from `packages/usb/src/protocol.ts` (the builders, the reply decoder, the version reading),
 * `keys.ts` (where each model keeps the key) and `models.ts` (a name for a skin the page cannot read), all
 * three importing nothing, so the browser loads them as they are. The rails of `packages/usb/src/rails.ts`
 * do not come along, deliberately: they guard `HarmonyRemote` over node-hid, and this page sends two
 * shapes of read and no write. If the page ever needs more than these two, that is the moment to bring
 * the library's rails along rather than to widen `checkReport`.
 */
import {
  MISC_RAM,
  REPORT_SIZE,
  decodeReply,
  getVersionRequest,
  readRamRequest,
  readVersion,
} from '@harmony/usb/protocol';
import type { VersionReading } from '@harmony/usb/protocol';
import { ARCH_8_PRODUCT, WATCH_BY_SKIN } from '@harmony/base/keys';
import { modelForSkin } from '@harmony/base/models';
import type { WebHid, WebHidDevice, WebHidInputListener } from './webhid.ts';

/** Logitech's USB vendor id. */
export const LOGITECH = 0x046d;

/**
 * The product ids this page opens, each with the architecture its remotes must then report.
 *
 * Only arch 8's, `0xC110`, which the Harmony 880, 885, 880 Pro, 720 and 785 share: the one platform a
 * browser has been shown to read, and the one whose key addresses are read for several models. A second
 * entry here is a decision, and it needs its own reading of where that platform keeps the key and of what
 * its `READ_MISC` selector 7 does, since on arch 9 (Harmony 525) the same selector answers a cleared zero.
 */
export const OPENED_PRODUCTS: ReadonlyMap<number, number> = new Map([[ARCH_8_PRODUCT, 8]]);

/** Field 4's low nibble for a remote running its application, Logitech's own value; 3 is the bootloader. */
export const SOFTWARE_TYPE_APPLICATION = 0;

/** The one report id the remote's HID interface declares; every report goes out under it. */
const REPORT_ID = 0;

/** How long a reply may take. The remote answers within a few milliseconds, so this only catches silence. */
export const REPLY_TIMEOUT_MS = 500;

/**
 * Version requests sent before giving up. A remote left idle on the cable can drop the first command it
 * is sent, and a retry answers in full; the version request is the one command that is safe to repeat
 * blindly, so it goes first and absorbs that, as it does in `watch-keys.ts`.
 */
export const VERSION_ATTEMPTS = 4;

/** A refusal, named so that a test can tell which guard spoke. */
export class Refused extends Error {
  readonly refusal: string;
  constructor(refusal: string, message: string) {
    super(message);
    this.name = 'Refused';
    this.refusal = refusal;
  }
}

/** The remote said nothing in time. Not a refusal: nothing was wrong with what was asked. */
export class NoReply extends Error {}

function refuse(refusal: string, message: string): never {
  throw new Refused(refusal, message);
}

/** What `checkReport` lets through: one of the two shapes, and for a read, its address. */
export type Permitted = { readonly kind: 'version' } | { readonly kind: 'key-read'; readonly address: number };

// The first byte of each permitted shape, taken from the library's builders rather than written here, so
// the page and `protocol.ts` cannot disagree about what a version request or a data memory read looks like.
const VERSION_FIRST = getVersionRequest()[0] as number;
const KEY_READ_FIRST = readRamRequest(0)[0] as number;

/** Whether every byte from `start` to the end is zero, which is what the builders pad with. */
function zeroFrom(report: ArrayLike<number>, start: number): boolean {
  for (let i = start; i < report.length; i += 1) {
    if (report[i] !== 0) return false;
  }
  return true;
}

function hexByte(value: number | undefined): string {
  return value === undefined ? 'nothing' : `0x${value.toString(16).padStart(2, '0')}`;
}

/**
 * Whether a report may be sent, judged on its bytes alone.
 *
 * `addresses` is the set the connected model keeps its key in, and it is empty until the remote has
 * answered its version request: so before the page knows which remote this is, the version request is the
 * only thing that passes.
 *
 * Each check below is the only one that catches its kind of report, which is what lets each have a
 * control: a whole report of 64 bytes and no other length; a version request with nothing after its
 * first byte (the version request with a payload is a command that writes on arch 14, so even a padding
 * byte is refused rather than reasoned about); a data memory read and no other command, `WRITE_MISC`
 * selector 7 at the same address being a write of data memory; selector 7 and no other; an address the
 * model keeps a key in, since data memory also holds the processor's own registers and some of those act
 * when they are read; and nothing after the address.
 */
export function checkReport(report: unknown, addresses: ReadonlySet<number>): Permitted {
  if (!(report instanceof Uint8Array)) refuse('not-bytes', 'a report has to be a Uint8Array');
  if (report.length !== REPORT_SIZE) refuse('length', `a report is ${REPORT_SIZE} bytes, not ${report.length}`);
  if (report[0] === VERSION_FIRST) {
    if (!zeroFrom(report, 1)) refuse('version-payload', 'a version request carries nothing after its first byte');
    return { kind: 'version' };
  }
  if (report[0] !== KEY_READ_FIRST) refuse('command', `command byte ${hexByte(report[0])} is not sent by this page`);
  if (report[1] !== MISC_RAM) refuse('selector', `read selector ${hexByte(report[1])} is not sent by this page`);
  const address = ((report[2] as number) << 8) | (report[3] as number);
  if (!addresses.has(address)) refuse('address', `data memory 0x${address.toString(16)} is not where this remote keeps a key`);
  if (!zeroFrom(report, 4)) refuse('padding', 'a data memory read carries nothing after its address');
  return { kind: 'key-read', address };
}

/**
 * **The only function that sends a report to a remote.**
 *
 * The check comes first and throws on anything but the two shapes, so a refused report never reaches the
 * device. What is sent is then rebuilt by the library's builder for the shape that passed, which is the
 * same bytes as the report given (the test asserts it for every report that passes) and leaves nothing
 * for a caller to change between the check and the send.
 */
export async function send(device: WebHidDevice, report: unknown, addresses: ReadonlySet<number>): Promise<Permitted> {
  const permitted = checkReport(report, addresses);
  const bytes = permitted.kind === 'version' ? getVersionRequest() : readRamRequest(permitted.address);
  await device.sendReport(REPORT_ID, bytes);
  return permitted;
}

/**
 * Whether a device the person chose may be opened, before it is opened; the architecture it must report.
 *
 * The browser's chooser already lists only the products in `OPENED_PRODUCTS`, so the first two checks repeat
 * that on purpose: the filter is the browser's, and this is the page's own word. The third is what the ids
 * cannot say. A Harmony 880 or 885 held in its bootloader enumerates with its application's own ids and
 * names itself `Harmony Bootloader`, `reference/usb-protocol/bootloader.md`, and a page that teaches key
 * codes has no business with a remote in recovery.
 */
export function checkDevice(device: Pick<WebHidDevice, 'vendorId' | 'productId' | 'productName'>): number {
  if (device.vendorId !== LOGITECH) refuse('vendor', `vendor 0x${device.vendorId.toString(16)} is not Logitech`);
  const architecture = OPENED_PRODUCTS.get(device.productId);
  if (architecture === undefined) refuse('product', `product 0x${device.productId.toString(16)} is not a remote this page reads`);
  if (/bootloader/i.test(device.productName)) refuse('bootloader', 'this remote is in its bootloader, not running normally');
  return architecture;
}

/** Where the connected model keeps the key, and its name. */
export interface KeyPlace {
  readonly name: string;
  readonly held: number;
  readonly last: number;
}

/**
 * Whether the remote that answered is one this page can read keys on, from its own version block.
 *
 * The architecture has to be the one its product id promised, and the software type the application's: a
 * remote in its bootloader answers type 3 and one in safe mode 4, which is the second line behind the
 * product string. Then the skin has to have an entry in `WATCH_BY_SKIN`, and no entry means no read: the
 * Harmony 785 shares the product id and no image of it has been read, so its key is not known to be where
 * the 885's is, and the Harmony 720 keeps it one byte further on.
 */
export function checkVersion(reading: VersionReading, architecture: number): KeyPlace {
  if (reading.architecture !== architecture) refuse('architecture', `the remote reports architecture ${reading.architecture}, not ${architecture}`);
  if (reading.softwareType !== SOFTWARE_TYPE_APPLICATION) refuse('software-type', `the remote is not running normally (software type ${reading.softwareType})`);
  const watch = WATCH_BY_SKIN[reading.skin];
  if (watch === undefined) refuse('skin', `no key address is known for ${modelName(reading.skin)}`);
  // Held first, last pressed second: the order `keys.ts` states and `keys.test.ts` pins.
  return { name: watch.name, held: watch.addresses[0] as number, last: watch.addresses[1] as number };
}

/** A person's name for a skin, for a message about a remote the page will not read. */
function modelName(skin: number): string {
  const model = modelForSkin(skin);
  return model === undefined ? `skin ${skin}` : `the Harmony ${model.name} (skin ${skin})`;
}

/** The version block out of a reply, or a refusal when the reply is something else. */
export function decodeVersionReply(report: Uint8Array): VersionReading {
  const reply = decodeReply(report);
  if (reply.kind !== 'version') refuse('version-reply', `the remote answered a version request with a ${reply.kind} reply`);
  return readVersion(reply.fields);
}

/**
 * The byte a data memory read returned.
 *
 * On arch 8 the misc reply is `C2`, the selector echoed and two bytes, and the byte after the selector is
 * the value: the one `watch-keys.ts` read every key of an 885 from. The echoed selector is checked
 * because it is the only part of the reply that ties it to the request.
 */
export function decodeKeyReply(report: Uint8Array): number {
  const reply = decodeReply(report);
  if (reply.kind !== 'misc' || reply.selector !== MISC_RAM) refuse('reply', 'the remote answered a data memory read with something else');
  return reply.value;
}

/** What the remote said about itself, for the page to show. */
export interface RemoteSeen {
  readonly name: string;
  readonly skin: number;
  readonly firmware: string;
  readonly architecture: number;
}

/** The two bytes of one poll: the key held, zero when none, and the last key pressed, never cleared. */
export interface KeyState {
  readonly held: number;
  readonly last: number;
}

/** An open remote, as the page sees it: what it is, a way to read its key, and a way to let go. */
export interface KeyLink {
  readonly remote: RemoteSeen;
  readKeys(): Promise<KeyState>;
  close(): Promise<void>;
}

/** Ask the browser for a remote, through its own chooser, and open it; undefined when nothing was chosen. */
export async function connect(hid: WebHid): Promise<KeyLink | undefined> {
  const filters = [...OPENED_PRODUCTS.keys()].map((productId) => ({ vendorId: LOGITECH, productId }));
  const [device] = await hid.requestDevice({ filters });
  return device === undefined ? undefined : openLink(device);
}

/**
 * Open a chosen device and learn what it is. Exported for the tests, which hand it a pretend device; the
 * page reaches it only through `connect`.
 *
 * Requests go one at a time, each waiting for its reply, because the remote answers asynchronously and the
 * data memory reply does not echo its address: the only thing that pairs a reply with its request is that
 * nothing else was asked in between. For the same reason **a key read that goes unanswered ends the
 * link**: its reply could still arrive and be taken for the next read's, so the page stops rather than
 * show a key from the wrong address.
 */
export async function openLink(device: WebHidDevice, timeoutMs = REPLY_TIMEOUT_MS): Promise<KeyLink> {
  const architecture = checkDevice(device);
  // Nothing but the version request until the remote has said which model it is.
  let addresses: ReadonlySet<number> = new Set();
  let waiting: ((report: Uint8Array) => void) | undefined;
  let broken: Error | undefined;

  const listener: WebHidInputListener = (event) => {
    const take = waiting;
    waiting = undefined;
    // A report nobody is waiting for is dropped: a late answer to a request that already timed out.
    take?.(new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength));
  };

  function exchange(report: Uint8Array): Promise<Uint8Array> {
    if (waiting !== undefined) return Promise.reject(new Error('a request is already waiting for its reply'));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiting = undefined;
        reject(new NoReply(`the remote did not answer within ${timeoutMs} ms`));
      }, timeoutMs);
      // Set before sending, so that a reply quicker than the send's own promise is not lost.
      waiting = (reply) => {
        clearTimeout(timer);
        resolve(reply);
      };
      send(device, report, addresses).catch((error: unknown) => {
        clearTimeout(timer);
        waiting = undefined;
        reject(error);
      });
    });
  }

  if (!device.opened) await device.open();
  device.addEventListener('inputreport', listener);
  try {
    let reading: VersionReading | undefined;
    let silence: unknown;
    for (let attempt = 1; attempt <= VERSION_ATTEMPTS && reading === undefined; attempt += 1) {
      try {
        reading = decodeVersionReply(await exchange(getVersionRequest()));
      } catch (error) {
        // Only silence is retried. A refusal or a reply that is not a version block is an answer.
        if (!(error instanceof NoReply)) throw error;
        silence = error;
      }
    }
    if (reading === undefined) throw silence;
    const place = checkVersion(reading, architecture);
    addresses = new Set([place.held, place.last]);

    const remote: RemoteSeen = {
      name: place.name,
      skin: reading.skin,
      firmware: reading.firmware,
      architecture: reading.architecture,
    };
    const readByte = async (address: number): Promise<number> =>
      decodeKeyReply(await exchange(readRamRequest(address)));

    return {
      remote,
      async readKeys(): Promise<KeyState> {
        if (broken !== undefined) throw broken;
        try {
          // The copy first and the held byte second, the reverse of the order the firmware writes them
          // in (`tests/test_harmony_885_keys.py`: the held byte at 0x18CA2, the copy at 0x18CA6). So a
          // press landing between the two reads is seen held with the copy still old, never the copy
          // new and the held byte not yet, which would look like a key pressed and let go; `presses.ts`
          // pairs the late copy with the press it belongs to.
          const last = await readByte(place.last);
          const held = await readByte(place.held);
          return { held, last };
        } catch (error) {
          broken = error instanceof Error ? error : new Error(String(error));
          throw broken;
        }
      },
      async close(): Promise<void> {
        broken ??= new Error('the remote has been let go');
        device.removeEventListener('inputreport', listener);
        if (device.opened) await device.close();
      },
    };
  } catch (error) {
    // Let go of a remote the page will not read, so that the person can use it elsewhere at once.
    device.removeEventListener('inputreport', listener);
    if (device.opened) await device.close();
    throw error;
  }
}
