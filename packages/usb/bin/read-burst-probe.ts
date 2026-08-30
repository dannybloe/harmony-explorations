/**
 * The positive control for the dropped chunks of sections 222 and 223: stall on purpose, lose reports.
 *
 *   node packages/usb/bin/read-burst-probe.ts --count 16384
 *   node packages/usb/bin/read-burst-probe.ts --count 16384 --stall-after 50 --stall-ms 200
 *
 * **Read only**, one `READ_FLASH` of one window, consumed report by report, with an optional
 * synchronous busy wait after a chosen chunk so nothing drains the host's input queue while the
 * remote keeps sending.
 *
 * It exists because a failure nobody can produce on demand is a failure nobody can fix. On
 * 30 August 2026 a verification read failed twice at about a third of the way through and the cause
 * was a shrug. HIDAPI's macOS backend holds about 31 input reports and then **silently discards the
 * oldest**, so the prediction was that a stall long enough to overrun that queue must lose
 * `rate * stall - 31` chunks and a short one must lose none. Measured: no stall and 20 ms and 50 ms
 * are clean, 100 ms loses 17 chunks against 18 predicted, and 200 ms loses 67 against 66. The
 * arithmetic that turns a sequence gap into a chunk count is the modular inverse of `0x11`, which is
 * 241, and dividing by 17 instead is what made a first run report a whole number of losses as not
 * being one.
 *
 * **It deliberately drives the transport rather than `readFlash`**, since `readFlash` now drains the
 * rest of a failed answer and this has to leave the pipe as the failure left it. So a run that fails
 * poisons the next one, which is itself the thing section 223 fixed everywhere else, and two failing
 * runs back to back will show it: the second throws on its `GET_VERSION`.
 */
import { HarmonyRemote, listHarmony, openHarmony } from '../src/index.ts';
import { READ_FLASH, decodeReply, nextFlashSequence, readFlashRequest } from '../src/protocol.ts';

const arg = (name: string): string | undefined => {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
};
const stallAfter = Number(arg('stall-after') ?? '-1');
const stallMs = Number(arg('stall-ms') ?? '0');
const count = Number(arg('count') ?? '16384');
const address = Number(arg('address') ?? '0x040000');

const attached = await listHarmony();
if (attached.length !== 1) throw new Error(`${attached.length} remotes attached, want exactly one`);
const found = attached[0] as { productId: number; path: string | undefined };
const remote = new HarmonyRemote(await openHarmony({ productId: found.productId }));
try {
  await remote.getVersion();
  const transport = (remote as unknown as { transport: {
    write(r: Uint8Array): Promise<void>;
    read(ms: number): Promise<Uint8Array | undefined>;
  } }).transport;
  await transport.write(readFlashRequest(address, count));

  let chunks = 0;
  let filled = 0;
  let sequence: number | undefined;
  let idle = 0;
  let verdict = 'clean';
  for (;;) {
    const report = await transport.read(2000);
    if (report === undefined) {
      if (++idle > 3) { verdict = `went quiet after ${filled} bytes`; break; }
      continue;
    }
    idle = 0;
    const reply = decodeReply(report);
    if (reply.kind === 'ack' && reply.command === READ_FLASH) break;
    if (reply.kind !== 'flash-data') { verdict = `a ${reply.kind} reply mid transfer`; break; }
    const expected = sequence === undefined ? 0x01 : nextFlashSequence(sequence);
    if (reply.sequence !== expected) {
      // The step is 0x11 modulo 256, so how many chunks went missing is the difference times the
      // modular inverse of 17, which is 241. Dividing by 17 is what a first version did and it
      // reported a whole number of losses as "not a whole number".
      const lost = ((((reply.sequence - expected) & 0xff) * 241) & 0xff);
      verdict = `out of sequence at chunk ${chunks}, ${filled} bytes: expected 0x`
        + `${expected.toString(16)} got 0x${reply.sequence.toString(16)}, `
        + `${lost} chunk(s) lost, ${lost * 62} bytes`;
      break;
    }
    sequence = reply.sequence;
    filled += reply.data.length;
    chunks += 1;
    if (chunks === stallAfter && stallMs > 0) {
      const until = Date.now() + stallMs;
      while (Date.now() < until) { /* hold the event loop, so nothing drains the queue */ }
    }
  }
  process.stdout.write(`stall ${stallMs}ms after chunk ${stallAfter}: ${verdict}, `
    + `${filled} of ${count} bytes in ${chunks} chunks\n`);
} finally {
  await remote.close();
}
