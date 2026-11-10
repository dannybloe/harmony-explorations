/**
 * A pretend remote of the compiled families, the Harmony One, 600, 650, 700 and 885, for the configuration
 * write's tests.
 *
 * **What it is and is not.** It stands where `HarmonyRemote` stands, with the methods the write calls, over an
 * array of flash, and keeps every call in `calls` so a test can say in which order things reached the cable.
 * It does not speak the protocol: `HarmonyRemote` and the guarded transport under it are tested by
 * `packages/usb`, and what this exercises is the sequence above them. **The rails are real**: each method that
 * changes the remote asserts the rail its `HarmonyRemote` counterpart asserts, on the permission the write
 * built, so a permission that would not pass on hardware does not pass here either:
 *
 * * `eraseFlash`, `assertEraseAllowed`
 * * `writeFlash`, `assertFlashWriteAllowed`
 * * `invalidateCachedRegions`, `assertInvalidateAllowed`
 * * `resetDevice`, `assertResetAllowed`
 *
 * Flash behaves as flash in the one way the write depends on: an erase sets a block to `0xff`, and a write
 * can only clear bits. Not a test file itself, so the runner does not pick it up; it is imported by
 * `write-config-run.ts`, including in the process that runs with the write flags set.
 */
import { encodeVersionBlock, IDENTITY_BYTES, IDENTITY_FIELDS } from '@harmony/usb/internal';
import {
  ERASE_BLOCK_SIZE,
  assertEraseAllowed,
  assertFlashWriteAllowed,
  assertInvalidateAllowed,
  assertResetAllowed,
  type WritePermission,
} from '@harmony/usb/rails';

/** An identity block with a unit's own bytes in it, as `rails.test.ts` makes one: seed 1 is the recorded unit. */
export function identityFor(seed: number): Uint8Array {
  const block = new Uint8Array(IDENTITY_BYTES).fill(0);
  block.fill(0xee, IDENTITY_FIELDS.serial, IDENTITY_FIELDS.guidA);
  for (let i = 0; i < 0x20; i += 1) block[IDENTITY_FIELDS.guidA + i] = (seed * 31 + i * 7 + 1) & 0xff;
  return block;
}

export interface FakeClassicRemoteOptions {
  readonly architecture: number;
  /** The version block's first field, the firmware build as two nibbles: `0x34` is 3.4. */
  readonly firmware: number;
  /** The whole flash, from address 0. */
  readonly flash: Uint8Array;
  readonly identity: Uint8Array;
  /** What data memory answers, by address; 0 elsewhere. */
  readonly ram?: Readonly<Record<number, number>>;
}

export class FakeClassicRemote {
  /** Every call, in order, with consecutive reads of one kind folded into one entry. */
  readonly calls: string[] = [];
  readonly flash: Uint8Array;
  closed = false;

  private readonly options: FakeClassicRemoteOptions;

  constructor(options: FakeClassicRemoteOptions) {
    this.options = options;
    this.flash = options.flash;
  }

  private note(call: string): void {
    if (this.calls.at(-1) !== call) this.calls.push(call);
  }

  async drainLeftovers(): Promise<void> {
    this.note('drainLeftovers');
  }

  async getVersion(): Promise<Uint8Array> {
    this.note('getVersion');
    return encodeVersionBlock({ architecture: this.options.architecture, firmware: this.options.firmware, flash: [0x1f, 0xc8] });
  }

  async readUnitIdentity(): Promise<Uint8Array> {
    this.note('readUnitIdentity');
    return Uint8Array.from(this.options.identity);
  }

  async readRam(address: number): Promise<number> {
    this.note(`readRam 0x${address.toString(16)}`);
    return this.options.ram?.[address] ?? 0;
  }

  async readFlash(address: number, count: number): Promise<Uint8Array> {
    this.note('readFlash');
    if (address < 0 || address + count > this.flash.length) throw new Error(`a read past the flash at 0x${address.toString(16)}`);
    return this.flash.slice(address, address + count);
  }

  async eraseFlash(p: WritePermission, address: number): Promise<void> {
    assertEraseAllowed(p, address);
    this.note(`eraseFlash 0x${address.toString(16)}`);
    const size = ERASE_BLOCK_SIZE[this.options.architecture] as number;
    this.flash.fill(0xff, address, address + size);
  }

  async writeFlash(p: WritePermission, address: number, data: Uint8Array): Promise<void> {
    assertFlashWriteAllowed(p, address, data.length);
    this.note('writeFlash');
    for (let i = 0; i < data.length; i += 1) this.flash[address + i]! &= data[i]!;
  }

  async invalidateCachedRegions(p: WritePermission): Promise<void> {
    assertInvalidateAllowed(p);
    this.note('invalidateCachedRegions');
  }

  async resetDevice(p: WritePermission): Promise<void> {
    assertResetAllowed(p);
    this.note('resetDevice');
  }

  async close(): Promise<void> {
    this.note('close');
    this.closed = true;
  }
}
