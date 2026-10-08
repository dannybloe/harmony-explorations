/**
 * Read a running remote's battery level, `READ_MISC` selector `0x0C` detail 1. Read only.
 *
 *   node packages/usb/bin/read-battery.ts --product 0xc122
 *
 * Logitech's client offers this reading on a Harmony One alone; the Harmony 600, 650 and 700
 * firmware implements it too, `docs/findings.md` section 212, and it was first sent by this script.
 * It prints the sixteen bit value as the firmware sends it, high byte first, and beside it the
 * check: detail 0's low byte is data memory `0x3FF` on the Harmony 650's 0.2 build, so it must equal a
 * `READ_MISC` selector `0x07` read of that address, and its high byte must be 0. A mismatch means the
 * byte order or the arm is not what the firmware reading says, and the battery value is then not to be
 * believed.
 */
import { HarmonyRemote, listHarmony, openHarmony } from '../src/index.ts';
import { HARDWARE_FEATURE_BATTERY, HARDWARE_FEATURE_FLAG, architectureFromVersion } from '../src/protocol.ts';

/** The data memory byte detail 0 answers with on the Harmony 650's 0.2 build, `0x0CB4E`. */
const FLAG_ADDRESS = 0x3ff;

function argument(name: string): string | undefined {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? undefined : process.argv[at + 1];
}
function fail(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

const wanted = argument('product');
const attached = await listHarmony();
const candidates = attached.filter((d) => wanted === undefined || d.productId === Number.parseInt(wanted, 16));
if (candidates.length !== 1) fail(candidates.length === 0 ? 'no matching Harmony remote attached' : 'more than one remote matches; pass --product');
const found = candidates[0]!;
const remote = new HarmonyRemote(
  await openHarmony(found.path === undefined ? { productId: found.productId } : { productId: found.productId, path: found.path }),
  { timeoutMs: 2000 },
);
try {
  // The wake up, retried, as in `read-ram.ts`: an idle remote loses the first command.
  let awake = false;
  for (let attempt = 1; attempt <= 4 && !awake; attempt += 1) {
    try {
      const stated = architectureFromVersion(await remote.getVersion());
      if (stated !== undefined) remote.useArchitecture(stated);
      awake = true;
    } catch {
      // Retrying is the handling; failure is reported below.
    }
  }
  if (!awake) fail('the remote is not answering');
  const flag = await remote.readHardwareFeature(HARDWARE_FEATURE_FLAG);
  const memory = await remote.readRam(FLAG_ADDRESS);
  const battery = await remote.readHardwareFeature(HARDWARE_FEATURE_BATTERY);
  const word = (bytes: Uint8Array) => ((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0);
  process.stdout.write(`detail 0: bytes ${[...flag].map((b) => b.toString(16).padStart(2, '0')).join(' ')}, `
    + `data memory 0x${FLAG_ADDRESS.toString(16)} reads 0x${memory.toString(16).padStart(2, '0')}: `
    + `${flag[0] === 0 && flag[1] === memory ? 'agrees, so the order holds' : 'DISAGREES, do not believe the value below'}\n`);
  process.stdout.write(`battery, detail 1: bytes ${[...battery].map((b) => b.toString(16).padStart(2, '0')).join(' ')}, `
    + `value ${word(battery)} (0x${word(battery).toString(16)})\n`);
} finally {
  await remote.close();
}
