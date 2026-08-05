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

/** The skin id is the low byte of `bcdDevice`, in BCD. Confirmed against the bench Harmony 600. */
export function skinId(bcdDevice: number): number {
  const low = bcdDevice & 0xff;
  return (low >> 4) * 10 + (low & 0x0f);
}

/**
 * The shape of a node-hid device, written out rather than imported.
 *
 * `node-hid` is deliberately not a dependency of this package yet. It is a native module, so
 * installing it means allowing a package's build script to run, which is a supply chain decision
 * for a human to take rather than a side effect of writing this file. Until it is taken, the
 * adapter below resolves the module at runtime and this interface is what it is checked against,
 * so the code is written and reviewed without anything being installed.
 */
export interface HidDeviceLike {
  write(data: number[] | Uint8Array): number;
  read(timeoutMs: number): number[] | undefined;
  close(): void;
}

export interface HidModuleLike {
  devices(): Array<{ vendorId: number; productId: number; path?: string | undefined }>;
  HID: new (path: string) => HidDeviceLike;
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
      const data = device.read(timeoutMs);
      return data === undefined ? undefined : new Uint8Array(data);
    },
    async close(): Promise<void> {
      device.close();
    },
  };
}

/**
 * Find and open the first attached Harmony.
 *
 * Opening a device claims it, so this is the first thing in the project that does more than look.
 * It is still read only in intent: the write paths are refused by `rails.ts`, not by whether the
 * device is open.
 *
 * `node-hid` is resolved through a variable specifier on purpose, so that this module compiles and
 * this package's tests run without it installed. The cost is that the import is untyped at the
 * boundary, which is why it is immediately narrowed to `HidModuleLike`.
 */
export async function openHarmony(): Promise<Transport> {
  const specifier: string = 'node-hid';
  let hid: HidModuleLike;
  try {
    hid = (await import(specifier)) as unknown as HidModuleLike;
  } catch (error) {
    throw new TransportError(
      `node-hid is not installed, so no remote can be opened (${String(error)})`,
    );
  }
  const found = hid.devices().find((d) => isHarmony(d.vendorId, d.productId));
  if (found === undefined) throw new TransportError('no Harmony remote found on the USB bus');
  if (found.path === undefined) throw new TransportError('the remote reported no device path');
  return transportOver(new hid.HID(found.path));
}
