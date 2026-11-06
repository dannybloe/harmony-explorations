/**
 * A pretend Harmony 885 for the key reader's tests, shared by `link.test.ts`, which drives a whole session
 * against it, and `visit.test.ts`, which loses the connection and reconnects the way the page does.
 *
 * It lives in one place so the two tests talk to the same pretend remote: a second copy would be free to
 * answer differently, and then one of the tests would be about a remote that is not the other's.
 */
import assert from 'node:assert/strict';
import type { WebHidDevice, WebHidInputListener } from '../src/webhid.ts';

/** The 885's measured version block. */
export const H885_FIELDS = [0x44, 0x21, 0x49, 0x01, 0x80, 0x11, 0x08];

/** A 64 byte report starting with the given bytes. */
export function reply(...head: number[]): Uint8Array {
  const bytes = new Uint8Array(64);
  bytes.set(head);
  return bytes;
}

/**
 * A pretend Harmony 885: it answers the version request and the data memory read the way the real one
 * does, stays silent to anything else, and records every report that reaches it.
 */
export class Pretend885 implements WebHidDevice {
  vendorId = 0x046d;
  productId = 0xc110;
  productName = 'Harmony Remote 0-4.4.2';
  opened = false;
  readonly sent: Uint8Array[] = [];
  readonly memory = new Map<number, number>([[0x0295, 0], [0x03a1, 0]]);
  /** How many requests to ignore first, as a remote left idle drops its first command. */
  silentFor = 0;
  version = [0x27, ...H885_FIELDS];
  readonly #listeners = new Set<WebHidInputListener>();

  async open(): Promise<void> {
    this.opened = true;
  }
  async close(): Promise<void> {
    this.opened = false;
  }
  addEventListener(_type: 'inputreport', listener: WebHidInputListener): void {
    this.#listeners.add(listener);
  }
  removeEventListener(_type: 'inputreport', listener: WebHidInputListener): void {
    this.#listeners.delete(listener);
  }
  async sendReport(reportId: number, data: Uint8Array): Promise<void> {
    assert.equal(reportId, 0);
    this.sent.push(data.slice());
    if (this.silentFor > 0) {
      this.silentFor -= 1;
      return;
    }
    let answer: Uint8Array | undefined;
    if (data[0] === 0x10) answer = reply(...this.version);
    if (data[0] === 0xb3 && data[1] === 0x07) {
      answer = reply(0xc2, 0x07, this.memory.get(((data[2] as number) << 8) | (data[3] as number)) ?? 0, 0x00);
    }
    if (answer === undefined) return;
    const view = new DataView(answer.buffer);
    setTimeout(() => {
      for (const listener of this.#listeners) listener({ reportId: 0, data: view });
    }, 1);
  }
}
