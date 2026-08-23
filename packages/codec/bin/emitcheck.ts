/**
 * Emit a code from a protocol name and a number, and ask Logitech's own analyser to read it back.
 *
 * **The closed loop this project has wanted for the infrared side.** `bin/analyze.ts` goes one way: it
 * sends a rhythm the corpus already holds and takes their reading of it. This goes the other way. It takes
 * a code as their **catalogue** states it, a family and a number with no rhythm at all, builds the rhythm
 * from the measured table in `src/protocols.ts`, and sends that to their analyser. If the answer is the
 * same family and the same number, a code nobody has ever recorded has been manufactured correctly and
 * their own decoder says so.
 *
 * **It also settles a naming problem that would otherwise be fatal.** The table's keys come from their
 * analyser, which calls the common 32 bit scheme `MemorexO1 32 Bit`, and their catalogue calls the same
 * shape `Toshiba 32 Bit`, `Memorex 32 Bit` and more besides. A table keyed on one vocabulary cannot be
 * looked up with the other, so a candidate rhythm is tried against a catalogue code and their answer says
 * whether the two names are the same protocol.
 *
 * ```
 * node packages/codec/bin/emitcheck.ts [--limit 40] [--out report.json]
 * ```
 *
 * **Read only.** A login, and one analysis call per code. Nothing is saved to the account, no compile is
 * queued, no remote is involved, and the codes come out of a census already in the lab. The password is
 * never printed and never written to the report. Credentials come from `work/myharmony/credentials.env`,
 * or `MYHARMONY_EMAIL` and `MYHARMONY_PASSWORD` for a machine with no lab.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LAB } from '@harmony/lab';
import { irdaString } from '../src/irda.ts';
import { PROTOCOLS } from '../src/protocols.ts';
import { pulsesOfStatedCode, statedCode } from '../src/stated.ts';

const SECURITY = 'https://svcs.myharmony.com/CompositeSecurityServices/Security.svc/json/';
const ANALYSIS = 'https://svcs.myharmony.com/InfraredAnalysisPlatform/InfraredAnalysisManager.svc/json/';

function flag(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : (process.argv[at + 1] ?? fallback);
}

function credentials(): { email: string; password: string } {
  const fromEnv = process.env['MYHARMONY_EMAIL'];
  if (fromEnv !== undefined && process.env['MYHARMONY_PASSWORD'] !== undefined) {
    return { email: fromEnv, password: process.env['MYHARMONY_PASSWORD'] };
  }
  if (LAB === undefined) throw new Error('no lab and no MYHARMONY_EMAIL');
  const text = readFileSync(join(LAB, 'work', 'myharmony', 'credentials.env'), 'utf8');
  const kv = new Map(text.split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')).trim(),
      line.slice(line.indexOf('=') + 1).trim()] as const));
  const email = kv.get('MYHARMONY_EMAIL');
  const password = kv.get('MYHARMONY_PASSWORD');
  if (email === undefined || password === undefined) throw new Error('credentials.env is incomplete');
  return { email, password };
}

const jar = new Map<string, string>();
async function post(url: string, body: unknown): Promise<{ status: number; text: string }> {
  const answer = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(jar.size === 0 ? {} : { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }),
    },
  });
  for (const line of answer.headers.getSetCookie()) {
    const pair = line.split(';')[0]!;
    const at = pair.indexOf('=');
    if (at > 0) jar.set(pair.slice(0, at), pair.slice(at + 1));
  }
  return { status: answer.status, text: await answer.text() };
}

const { email, password } = credentials();
const signedIn = await post(`${SECURITY}LoginUser`,
  { email, password, customCredential: null, isPersistent: false });
if (signedIn.status !== 200) {
  console.error(`sign in failed with ${signedIn.status}`);
  process.exit(1);
}
console.log('signed in\n');

/** The census `bin/protocols.ts`'s companion script wrote: catalogue devices and their command codes. */
interface Census {
  devices: { make: string; model: string; id: number; families: string[] }[];
  /** Their raw notation, parsed here by `statedCode`, so the census holds no second copy of it. */
  codes?: { family: string; keyCode: string }[];
}
const censusPath = join(LAB ?? '.', 'work', 'myharmony', 'responses', 'ProtocolCensus.json');
const census = JSON.parse(readFileSync(censusPath, 'utf8')) as Census;
// Deduplicated, since the census walks makes and two makes can list the same code. Anything their
// notation states in a shape `statedCode` refuses is dropped here and counted, rather than guessed at.
const parsed = (census.codes ?? []).map((one) => statedCode(one.keyCode))
  .filter((one) => one !== undefined);
const unreadable = (census.codes ?? []).length - parsed.length;
const codes = [...new Map(parsed.map((one) =>
  [`${one.family}|${one.frames.join('_')}`, one])).values()];
if (unreadable > 0) console.log(`${unreadable} catalogue codes are in a shape statedCode refuses\n`);
if (codes.length === 0) {
  console.error(`${censusPath} carries no codes; rerun the census with --codes`);
  process.exit(1);
}

/**
 * Every candidate rhythm, since the point is to find out which of our names is which of theirs.
 *
 * A catalogue family is looked up in the table first, and where the name is not there, which is the
 * ordinary case, every entry of the right convention and bit width is tried. Their answer picks.
 */
const limit = Number(flag('limit', '40'));
interface Row {
  family: string;
  bits: number;
  value: string;
  frames: number;
  triedAs: string;
  theirs?: string;
  sameNumber: boolean;
  sameName: boolean;
}
const rows: Row[] = [];
let asked = 0;
let readBack = 0;
let namedRight = 0;

outer: for (const code of codes) {
  // **The first frame only, and the row says so.** A two frame code needs the gap between the frames as
  // well, and that is exactly what section 152 measured as not following from the bits. So this asks
  // whether the first frame is right and leaves the pair for the compile route.
  const value = code.frames[0]!;
  // One candidate per family: two entries of one family differ only in their carrier, and their analyser
  // is told the carrier in the string anyway, so trying both asks the same question twice.
  const byFamily = new Map(PROTOCOLS.map((one) => [one.family, one]));
  const candidates = [
    ...[...byFamily.values()].filter((one) => one.family === code.family),
    ...[...byFamily.values()].filter((one) => one.family !== code.family),
  ];
  for (const entry of candidates) {
    if (asked >= limit) break outer;
    const pulses = pulsesOfStatedCode(entry.family, code.bits, value, entry.periodNs);
    if (pulses === undefined) continue;
    const hertz = 1e9 / entry.periodNs;
    let sent: string;
    try { sent = irdaString(pulses, hertz); } catch { continue; }
    const answer = await post(`${ANALYSIS}AnalyzeInfrared`, { rawSequence: sent });
    asked += 1;
    let parsed: unknown;
    try { parsed = JSON.parse(answer.text); } catch { parsed = undefined; }
    const result = (parsed as Record<string, unknown> | undefined)?.['AnalyzeInfraredResult'];
    const keyCode = typeof result === 'object' && result !== null
      ? (result as Record<string, unknown>)['KeyCode'] : undefined;
    const theirs = typeof keyCode === 'string' ? keyCode : undefined;
    // **Their notation has a parameter slot and it is not always empty**, which a first run got wrong:
    // a JVC answer comes back as `G:JVCO1 16 Bit:(Start)(0xC55A)():3`, so a pattern demanding `()` read
    // the reply as unparseable and reported a correct code as a refusal. Twelve of sixty rows.
    const stated = /^G:([^:]+):\([^)]*\)\(0x([0-9A-Fa-f]+)\)/.exec(theirs ?? '');
    const sameNumber = stated !== null && BigInt(`0x${stated[2]!}`) === value;
    // **The name is the signal and the number is not**, which took a second run to see. Their analyser
    // identifies by rhythm, so emitting a Sharp 15 Bit number with Sony's durations comes back as
    // `Sony 15 Bit` carrying that number: the bits are right, the rhythm is somebody else's, and an
    // appliance would hear nothing it recognised. So agreement on the number alone means the encoder
    // laid the bits out correctly and nothing at all about whether the code would work.
    //
    // Compared with their `O1` suffix stripped, since that is their analyser's and not their catalogue's:
    // `JVC 16 Bit` comes back as `JVCO1 16 Bit`, which is agreement rather than a mismatch.
    const canonical = (name: string): string => name.replace(/O1(?= \d)/, '');
    const sameName = stated !== null && canonical(stated[1]!.trim()) === canonical(code.family);
    if (sameNumber) readBack += 1;
    if (sameName && sameNumber) namedRight += 1;
    rows.push({ family: code.family, bits: code.bits, value: `0x${value.toString(16)}`,
      frames: code.frames.length, triedAs: entry.family,
      sameNumber, sameName, ...(theirs === undefined ? {} : { theirs }) });
    console.log(`${code.family.padEnd(22)} `
      + `${`0x${value.toString(16)}${code.frames.length > 1 ? '+1' : ''}`.padEnd(14)} `
      + `as ${entry.family.padEnd(20)} `
      + `-> ${theirs ?? 'refused'}${sameNumber ? '  NUMBER OK' : ''}${sameName ? ' NAME OK' : ''}`);
    // Their answer is the arbiter, and the **name** is what settles it, so a candidate that only gets
    // the number right does not stop the search: another entry may be the rhythm they recognise.
    if (sameName && sameNumber) break;
  }
}

console.log(`\n${readBack} of ${asked} answers carry the number the code was built from`);
console.log(`${namedRight} of ${codes.length} codes were also named as the family they came from, `
  + 'which is the claim that says the rhythm is right and not only the bits');
const out = flag('out', '');
if (out !== '') {
  writeFileSync(out, JSON.stringify({ asked, readBack, rows }, null, 1));
  console.log(`report written to ${out}`);
}
