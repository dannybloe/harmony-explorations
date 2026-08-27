/**
 * The transport seam: 64 byte reports in, 64 byte reports out, and nothing about Harmony.
 *
 * It is an interface rather than a class because the protocol layer has to be testable without a
 * remote attached. The remotes are irreplaceable, so "plug it in and see" is the last resort here
 * rather than the first, and a scripted fake transport catches encoding mistakes before any of
 * them reach a device.
 */

import { READ_ONLY_COMMANDS } from './protocol.ts';

export class TransportError extends Error {}

export interface Transport {
  /** Send one report. The caller has already padded it to the report size. */
  write(report: Uint8Array): Promise<void>;
  /** The next report, or undefined if none arrived within `timeoutMs`. */
  read(timeoutMs: number): Promise<Uint8Array | undefined>;
  close(): Promise<void>;
}

/**
 * A transport that refuses a mutating report it was not handed by a rail checked path.
 *
 * **Why this exists and why it is here rather than in `rails.ts`.** The rails guard the methods on
 * `HarmonyRemote`, and on 27 August 2026 an independent review of the write path found that they
 * guard nothing else: this package's barrel star exports `protocol.ts` and `transport.ts`, so a
 * caller can build `encodeRequest(ERASE_FLASH, address24(a))` and hand it to the transport directly.
 * Verified here, with `WRITES_ENABLED` false, for an address outside the config region and for an
 * unaligned one. The test written to catch exactly this could not see it, because it looks for
 * exported names ending in `Request` that also mention write, erase or escape, and the generic
 * encoder is called `encodeRequest`.
 *
 * The fix is not to hide the encoder. A test constructing a raw erase and sending it to a **fake**
 * transport is useful and should keep working; what must not happen is that report reaching a
 * remote. So the check sits at the only place that knows a report is about to reach real hardware,
 * which is the transport `openHarmony` returns. A fake transport is deliberately unguarded.
 *
 * An authorisation is for one exact report and is consumed by the write that matches it, so a stray
 * second report cannot ride on the first one's permission, and a report whose bytes were changed
 * after authorisation is refused.
 */
export interface GuardedTransport extends Transport {
  /**
   * Permit exactly this report, once. Called by `HarmonyRemote` after the rail for that operation
   * has passed, so reaching here at all means a rail said yes.
   */
  authoriseReport(report: Uint8Array): void;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

export function guardMutations(inner: Transport): GuardedTransport {
  let authorised: Uint8Array | undefined;
  return {
    authoriseReport(report: Uint8Array): void {
      // A copy, so a caller mutating its buffer afterwards cannot change what was authorised.
      authorised = Uint8Array.from(report);
    },
    async write(report: Uint8Array): Promise<void> {
      const command = (report[0] ?? 0) & 0xf0;
      const pending = authorised;
      authorised = undefined;
      if (!READ_ONLY_COMMANDS.has(command)) {
        if (pending === undefined || !sameBytes(pending, report)) {
          throw new TransportError(
            `refusing to send command 0x${command.toString(16)} to a remote: it only reads on the ` +
              'allow list, and this report was not authorised by a write rail. Mutating commands go ' +
              'through HarmonyRemote, which asks rails.ts first.',
          );
        }
      }
      await inner.write(report);
    },
    read(timeoutMs: number): Promise<Uint8Array | undefined> {
      return inner.read(timeoutMs);
    },
    close(): Promise<void> {
      return inner.close();
    },
  };
}

/** Logitech. The product range covers the Harmony models; `tools/usbprobe.py` uses the same. */
export const LOGITECH_VENDOR = 0x046d;
export const HARMONY_PRODUCT_FIRST = 0xc110;
export const HARMONY_PRODUCT_LAST = 0xc14f;

/**
 * The product ids of the **file based** family, which this library does not speak to.
 *
 * These remotes hold their configuration in a named file rather than at a flash address, so
 * `READ_FLASH`, `READ_MISC` and the whole command layer this package implements do not apply to
 * them: there is no address to read, no firmware to read and no RAM to poll.
 * `reference/models.md` carries the argument.
 *
 * **The set is concordance's**, its `is_mh_pid`, so it has the ordinary standing of an upstream
 * claim: a hypothesis, not a fact. It is adopted anyway because it can only **refuse** more, which
 * is the same ground on which the erase ceiling was adopted from Logitech's own client. If one of
 * these turns out to answer the flash protocol after all, that is a finding and this set shrinks.
 *
 * Measured on the bench on 27 August 2026: a Harmony 350 enumerates as `0xC124`, the id concordance
 * labels a Harmony 300, and a Harmony Touch as `0xC12B`. So the comments name a model each and at
 * least one id covers two, which is why nothing here maps an id to a model.
 */
export const FILE_BASED_PRODUCTS: readonly number[] = [
  0xc124, // Harmony 300, and measured here on a Harmony 350
  0xc125, // Harmony 200
  0xc126, // Harmony Link
  0xc129, // Harmony Hub
  0xc12b, // Harmony Touch, and the Harmony Ultimate
];

/**
 * Whether a device belongs to the file based family, from enumeration alone.
 *
 * **Deliberately a second predicate rather than a hole in `isHarmony`'s range**, for the reason
 * `isMicrochipBootloader` gives above: the point is to tell "a remote this library cannot drive"
 * from "nothing plugged in", and a caller that only wants to know whether a Harmony is attached
 * should get a truthful yes. `isHarmony` excludes these because it gates `openHarmony`, and opening
 * one would let this package send a device commands its family does not implement.
 */
export function isFileBasedRemote(vendorId: number, productId: number): boolean {
  return vendorId === LOGITECH_VENDOR && FILE_BASED_PRODUCTS.includes(productId);
}

/**
 * Whether a device is a Harmony this library's command protocol applies to.
 *
 * The range is Logitech's Harmony allocation and the exclusion is the file based family, which sits
 * **inside** it: `0xC124` and `0xC12B` are both between `0xC110` and `0xC14F`, so a plain range
 * check claimed a Harmony Touch as a flash protocol remote. Found on 27 August 2026 with a Touch
 * and a Harmony 350 on the bench, before either had been opened.
 *
 * **`0xC112` to `0xC115` is deliberately not excluded, and the reason is not symmetry.** Concordance
 * routes that range to a separate class, `CRemoteZ_HID`, under a macro it calls `ZWAVE`, with a
 * comment reading `890, Monstor, etc.`. All of that is upstream's label: **no device on this bench has
 * ever presented an id in that range**, so nothing here can check whether those remotes speak what
 * concordance thinks they speak, or which models are really in it.
 *
 * The tempting argument for excluding it too is that refusing more is always safe. It is not free.
 * Excluding the file based family costs nothing, because there is no transport here to drive one with
 * and an opened Touch could be sent nothing useful. Excluding this range would make a **Harmony 890**
 * unopenable, and arch 10 is an architecture this project reads: its configs are in the corpus and
 * section 184's slot mapping is built on them. So the rule is not "refuse anything unfamiliar", it is
 * **exclude where we provably have no protocol, and not where we might have one and cannot verify the
 * reason to refuse.**
 */
export function isHarmony(vendorId: number, productId: number): boolean {
  return (
    vendorId === LOGITECH_VENDOR &&
    productId >= HARMONY_PRODUCT_FIRST &&
    productId <= HARMONY_PRODUCT_LAST &&
    !isFileBasedRemote(vendorId, productId)
  );
}

/** Microchip, and the product id both bench bootloaders present. `docs/findings.md` section 189. */
export const MICROCHIP_VENDOR = 0x04d8;
export const MICROCHIP_BOOTLOADER_PRODUCT = 0x000b;

/**
 * Whether a device is in a Microchip bootloader, which is what a Harmony in recovery looks like.
 *
 * A Harmony One or Harmony 600 held in its bootloader by a key at power on enumerates as
 * `04D8:000B` with no manufacturer, product or serial string at all, where a booted one is
 * `046D:C121` and calls itself `Harmony Remote 4-3.4.0`. Both bootloaders carry those descriptors
 * inside their own 4 KiB, so the identity comes from the recovery code rather than from the
 * application. That is the only signal a host gets, since the bootloader writes thirteen ports in
 * total and nothing in it drives the display.
 *
 * **The name says Microchip and not Harmony deliberately.** This identity is a stock one and is not
 * specific to these remotes, so a match means "a device presenting a Microchip bootloader" and not
 * "a Harmony". Anything else on the bus in the same state would match too. The honest use is to
 * distinguish a remote that has gone into recovery from a bus with nothing on it, which is what a
 * bench confirmation needs, rather than to identify a model.
 *
 * **Deliberately not part of `isHarmony`.** That predicate gates `openHarmony`, and a bootloader
 * speaks an entirely different protocol from the application: a different command layer, no length
 * nibble, no state machine, section 189. Widening `isHarmony` would let this library open a device
 * and start sending it commands it cannot answer. So this is a separate question with a separate
 * answer, and no code that opens a device consults it.
 */
export function isMicrochipBootloader(vendorId: number, productId: number): boolean {
  return vendorId === MICROCHIP_VENDOR && productId === MICROCHIP_BOOTLOADER_PRODUCT;
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
  // **The whole word is BCD of `1000 + skin`**, section 195, so what section 113 read as a constant
  // 0x10 is the carry. Measured on a Harmony 350: it enumerates `0x1104`, which is 1104, and the
  // remote's own `/sys/sysinfo` says skin 104. That is the one word of the ten known here that
  // separates this reading from the low byte one, which refuses it outright.
  const digits = [12, 8, 4, 0].map((shift) => (bcdDevice >> shift) & 0x0f);
  if (digits.every((d) => d <= 9)) {
    const value = digits.reduce((acc, d) => acc * 10 + d, 0);
    // Bounded below by 1000 rather than by a high byte, because that is what the form says: below it
    // the word is the arch 8 and arch 9 shape, whose 0x0916 is valid BCD for 916 and means skin 22.
    if (value >= 1000) return value - 1000;
  }
  if (high === 0x08 || high === 0x09) return low;

  // Anything else, including a nibble that is not a decimal digit, names no remote.
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
  return listMatching(isHarmony);
}

/**
 * Every attached device presenting a Microchip bootloader, without opening any of them.
 *
 * The counterpart of `listHarmony` for the recovery state, and it exists so that a bench session
 * can tell "the remote went into recovery" from "nothing is plugged in". Before this, enumeration
 * filtered on Logitech's vendor id alone, so a remote in its bootloader reported as no remote at
 * all and the two outcomes of the experiment were indistinguishable.
 *
 * Read the caveat on `isMicrochipBootloader`: a hit is not proof that the device is a Harmony.
 * Nothing here opens anything, and this library cannot talk to a device in this state.
 */
/** The file based family, reported so it is not mistaken for an empty bus. Opens nothing. */
export async function listFileBasedRemotes(): Promise<FoundRemote[]> {
  return listMatching(isFileBasedRemote);
}

export async function listMicrochipBootloaders(): Promise<FoundRemote[]> {
  return listMatching(isMicrochipBootloader);
}

async function listMatching(
  matches: (vendorId: number, productId: number) => boolean,
): Promise<FoundRemote[]> {
  const hid = await import('node-hid');
  return hid
    .devices()
    .filter((d) => matches(d.vendorId, d.productId))
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
  // Guarded, because this is the one function in the package that returns a path to real hardware.
  return guardMutations(transportOver(new hid.HID(found.path)));
}
