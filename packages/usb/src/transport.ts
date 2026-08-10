/**
 * The transport seam: 64 byte reports in, 64 byte reports out, and nothing about Harmony.
 *
 * It is an interface rather than a class because the protocol layer has to be testable without a
 * remote attached. The remotes are irreplaceable, so "plug it in and see" is the last resort here
 * rather than the first, and a scripted fake transport catches encoding mistakes before any of
 * them reach a device.
 */

export class TransportError extends Error {}

export interface Transport {
  /** Send one report. The caller has already padded it to the report size. */
  write(report: Uint8Array): Promise<void>;
  /** The next report, or undefined if none arrived within `timeoutMs`. */
  read(timeoutMs: number): Promise<Uint8Array | undefined>;
  close(): Promise<void>;
}

/** Logitech. The product range covers the Harmony models; `tools/usbprobe.py` uses the same. */
export const LOGITECH_VENDOR = 0x046d;
export const HARMONY_PRODUCT_FIRST = 0xc110;
export const HARMONY_PRODUCT_LAST = 0xc14f;

export function isHarmony(vendorId: number, productId: number): boolean {
  return (
    vendorId === LOGITECH_VENDOR &&
    productId >= HARMONY_PRODUCT_FIRST &&
    productId <= HARMONY_PRODUCT_LAST
  );
}

/**
 * The skin id out of a device descriptor's `bcdDevice`, or undefined if it cannot be read.
 *
 * A skin is Logitech's own index into its model list, so the number names the remote: 15 is an 880,
 * 17 an 885, 19 an 890, 22 a 525, 54 a Harmony One, 66 a 700, 71 a 600, 72 a 650. Every config
 * states its own in the `<SKIN>` element of its EZHex header, which is what these cases are checked
 * against. It matters because the 600 and the 700 share product id 0xC122, so the product id does
 * not name an arch 14 model and this does, before a single config byte is read.
 *
 * **The low byte's encoding is per firmware generation and reading it wrong is silent**, so the
 * high byte decides: `0x08` and `0x09` carry the skin in plain binary, and there the high byte is
 * the protocol number; `0x10` carries it in BCD, on arch 12 and arch 14 alike, so there it is a
 * constant whose meaning is not established. Anything else is undefined rather than guessed,
 * because a guess names the wrong remote: an 885's 0x0811 read as BCD is 11, a Harmony 655.
 *
 * Kept in step with `harmony.usbdesc.skin_id` by `packages/usb/test/remote.test.ts`, which asserts
 * the same table. `docs/findings.md` section 113.
 */
export function skinId(bcdDevice: number): number | undefined {
  const high = bcdDevice >> 8;
  const low = bcdDevice & 0xff;
  if (high === 0x10) return (low >> 4) * 10 + (low & 0x0f);
  if (high === 0x08 || high === 0x09) return low;
  return undefined;
}

/**
 * The shape of a node-hid device, written out rather than imported from it.
 *
 * `node-hid` is installed now, and its own types would do. This interface stays anyway, for one
 * reason: it is what the tests construct. A three method object literal can stand in for a remote,
 * so the mapping from node-hid's synchronous, array based API onto this async, byte based one is
 * checked without a device, and so is a short write, which is the failure that would otherwise turn
 * a truncated command into a command with different arguments.
 */
export interface HidDeviceLike {
  write(data: number[] | Uint8Array): number;
  /**
   * node-hid's blocking read with a deadline, which is the one this protocol wants.
   *
   * Not `read`, which takes a callback, and not `readSync`, which blocks forever. Replies here are
   * asynchronous by design: the firmware parses a command, sets a state and returns, so a read
   * that cannot time out is a read that hangs whenever a command produces no reply at all, and
   * three of the commands produce none.
   */
  readTimeout(timeoutMs: number): number[];
  close(): void;
}

/**
 * Wrap an already opened HID device as a `Transport`.
 *
 * Separate from opening one so that the mapping from node-hid's synchronous, array based API onto
 * this async, byte based one is testable with an object literal.
 */
export function transportOver(device: HidDeviceLike): Transport {
  return {
    async write(report: Uint8Array): Promise<void> {
      const written = device.write(Array.from(report));
      if (written !== report.length) {
        throw new TransportError(`wrote ${written} of ${report.length} bytes`);
      }
    },
    async read(timeoutMs: number): Promise<Uint8Array | undefined> {
      // node-hid signals "nothing arrived" with an empty array rather than undefined, and an empty
      // report is not a report: decoding one would read a command byte that is not there.
      const data = device.readTimeout(timeoutMs);
      return data === undefined || data.length === 0 ? undefined : new Uint8Array(data);
    },
    async close(): Promise<void> {
      device.close();
    },
  };
}

export interface FoundRemote {
  readonly vendorId: number;
  readonly productId: number;
  readonly path: string | undefined;
  readonly product: string | undefined;
  readonly manufacturer: string | undefined;
  /** `bcdDevice`, which carries the skin id in its low byte. See `skinId`. */
  readonly release: number | undefined;
}

/**
 * Every attached Harmony, without opening any of them.
 *
 * Enumeration only, and that distinction is the whole reason this is a separate function from
 * `openHarmony`. Listing devices reads what the operating system already knows; opening one claims
 * it away from anything else and starts a conversation with an irreplaceable device. Code that only
 * needs to know whether a remote is plugged in should never reach for the second.
 *
 * The import is dynamic so that merely importing this module does not load a native binding, which
 * matters for a test run and for an Electron main process that may never touch USB.
 */
export async function listHarmony(): Promise<FoundRemote[]> {
  const hid = await import('node-hid');
  return hid
    .devices()
    .filter((d) => isHarmony(d.vendorId, d.productId))
    .map((d) => ({
      vendorId: d.vendorId,
      productId: d.productId,
      path: d.path,
      product: d.product,
      manufacturer: d.manufacturer,
      release: d.release,
      // `node-hid` also reports `serialNumber`, and it is deliberately not carried through. It
      // identifies a unit rather than a model, and `@harmony/probe` builds a publishable report
      // out of this structure: the cheapest way to keep a serial out of a published file is for
      // nothing upstream of it to have one.
    }));
}

/**
 * Find and open the first attached Harmony.
 *
 * Opening a device claims it, so this is the first thing in the project that does more than look.
 * It is still read only in intent, and the intent is not what enforces it: the write paths are
 * refused by `rails.ts` whether or not the device is open.
 */
/** Which remote to open, when more than one is attached. */
export interface RemoteSelector {
  readonly productId?: number;
  readonly path?: string;
}

export async function openHarmony(select: RemoteSelector = {}): Promise<Transport> {
  const all = await listHarmony();
  const candidates = all.filter(
    (d) =>
      (select.productId === undefined || d.productId === select.productId) &&
      (select.path === undefined || d.path === select.path),
  );
  if (candidates.length === 0) {
    throw new TransportError(
      all.length === 0
        ? 'no Harmony remote found on the USB bus'
        : `no attached remote matches the selector; attached: ${all
            .map((d) => `0x${d.productId.toString(16)}`)
            .join(', ')}`,
    );
  }
  if (candidates.length > 1) {
    // Refusing beats picking. Two Harmony Ones exist on this bench, one programmed and one the
    // spare write target, and they enumerate identically. Anything that asserts a per unit value,
    // or one day writes, must not have "whichever came first" decide which device it meant.
    throw new TransportError(
      `${candidates.length} remotes match; pass a path to say which. Attached: ${all
        .map((d) => `0x${d.productId.toString(16)} at ${d.path ?? 'no path'}`)
        .join(', ')}`,
    );
  }
  const found = candidates[0] as FoundRemote;
  if (found.path === undefined) throw new TransportError('the remote reported no device path');
  const hid = await import('node-hid');
  return transportOver(new hid.HID(found.path));
}
