/**
 * Ask Logitech's own analyser what a code in the corpus is, and compare it with what we read.
 *
 * **Why this is the most valuable check available to this project.** `irframe.ts` turns a stored rhythm
 * into a number, and until now the only thing that number could be compared against was the command
 * catalogue of the one account that generated two configurations, section 133. Logitech's
 * `AnalyzeInfrared` decodes a rhythm too, it is a different implementation by the people who wrote the
 * generator, and it will answer for **any** record. Two independent decoders over thousands of codes is
 * the shape this repository keeps saying it wants and has almost never been able to arrange.
 *
 * It lives in this package because the string it sends is `irda.ts`'s output and the number it checks is
 * `irframe.ts`'s. It is deliberately not in `test/`: it needs a network and somebody's credentials, and a
 * test that quietly does neither is worse than a script that says so.
 *
 * ```
 * HARMONY_LOGITECH_EMAIL=... HARMONY_LOGITECH_PASSWORD=... node packages/codec/bin/analyze.ts \
 *   [--config h600_config] [--limit 25] [--out /path/to/report.json]
 * ```
 *
 * **Read only, in both directions.** The only operations it uses are a login, a ping and the analysis
 * itself. Nothing is saved to the account, no compile is queued, and no remote is involved: the codes
 * come off files already in the lab. The password is read from the environment, never printed, and never
 * written to the report.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { imagePath } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { IR_CLASS_STREAM, irBlockWords, irCarrier, irClass, irGroups, irHeaderPointers }
  from '../src/ir.ts';
import { irdaString, pulsesOfWords, untilSilence } from '../src/irda.ts';
import { frameKey, framesOfPulses, fromFirstMark } from '../src/irframe.ts';

const SECURITY = 'https://svcs.myharmony.com/CompositeSecurityServices/Security.svc/json/';
/**
 * Not guessed. `Discovery/GetJsonOperations` answers without a login and states this address, along
 * with 307 other operations; the service also carries `Ping`, `SaveTeachingRequest`,
 * `GetTeachingRequest` and `GetTeachingStatus`, which are the rest of the learning flow.
 */
const ANALYSIS = 'https://svcs.myharmony.com/InfraredAnalysisPlatform/InfraredAnalysisManager.svc/json/';

function flag(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : (process.argv[at + 1] ?? fallback);
}

/** The session cookie, and nothing else kept. */
const jar = new Map<string, string>();
function cookies(): Record<string, string> {
  return jar.size === 0 ? {} : { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') };
}
function keep(answer: Response): void {
  for (const line of answer.headers.getSetCookie()) {
    const [pair] = line.split(';');
    const at = pair?.indexOf('=') ?? -1;
    if (pair && at > 0) jar.set(pair.slice(0, at), pair.slice(at + 1));
  }
}

async function post(url: string, body: unknown): Promise<{ status: number; text: string }> {
  const answer = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...cookies() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  keep(answer);
  return { status: answer.status, text: await answer.text() };
}

const email = process.env['HARMONY_LOGITECH_EMAIL'];
const password = process.env['HARMONY_LOGITECH_PASSWORD'];
if (email === undefined || password === undefined) {
  // A refusal rather than a fallback: this script's whole output is a comparison against a service, so
  // running it without a session would produce a page of "access denied" that reads like a result.
  console.error('set HARMONY_LOGITECH_EMAIL and HARMONY_LOGITECH_PASSWORD. Nothing is stored.');
  process.exit(2);
}

const ping = await post(`${ANALYSIS}Ping`, {});
console.log(`ping ${ping.status}`);
const login = await post(`${SECURITY}LoginUser`,
  { email, password, customCredential: null, isPersistent: false });
if (login.status !== 200 || jar.size === 0) {
  // Their reply quotes the address and carries an account identifier, so it is not passed on.
  console.error(`login refused, status ${login.status}`);
  process.exit(1);
}
console.log(`signed in, ${jar.size} cookie(s)`);

const config = flag('config', 'h600_config');
const limit = Number(flag('limit', '25'));
const path = imagePath(config);
if (path === undefined) throw new Error(`no ${config} in the lab`);
const c = parse(new Uint8Array(readFileSync(path)));

interface Row {
  record: string;
  ours: string;
  sent: string;
  status: number;
  theirs?: string;
  raw?: unknown;
}
const rows: Row[] = [];
let agreed = 0;
let asked = 0;
outer: for (const group of irGroups(c) ?? []) {
  for (const record of group.addresses) {
    if (asked >= limit) break outer;
    if (irClass(c, record) !== IR_CLASS_STREAM) continue;
    const first = irHeaderPointers(c, record)[0];
    if (first === undefined) continue;
    const words = irBlockWords(c, first);
    if (words === undefined) continue;
    const train = fromFirstMark(pulsesOfWords(words));
    const readings = framesOfPulses(train);
    // Exactly one reading, which is the population section 133's own partition is about. An ambiguous
    // record is a two group biphase code and asking about one would be asking the wrong question.
    if (readings.length !== 1) continue;
    const hertz = irCarrier(c, record)?.hertz;
    if (hertz === undefined) continue;
    const sent = irdaString(untilSilence(train), hertz);
    const answer = await post(`${ANALYSIS}AnalyzeInfrared`, { rawSequence: sent });
    asked += 1;
    let parsed: unknown;
    try { parsed = JSON.parse(answer.text); } catch { parsed = answer.text; }
    const result = (parsed as Record<string, unknown> | undefined)?.['AnalyzeInfraredResult'];
    const code = typeof result === 'object' && result !== null
      ? (result as Record<string, unknown>)['KeyCode'] : undefined;
    const theirs = typeof code === 'string' ? code : undefined;
    const ours = frameKey(readings[0]!);
    // Their notation is `G:<family>:()(0x<value>)():3`, section 132, and the value is in transmission
    // order like ours. So the comparison is on the number, and the family name is what we gain.
    const stated = theirs?.match(/\(0x([0-9A-Fa-f]+)\)/)?.[1]?.toLowerCase();
    if (stated !== undefined && stated === ours.split(':')[1]) agreed += 1;
    rows.push({ record: `0x${record.toString(16)}`, ours, sent, status: answer.status,
      ...(theirs === undefined ? {} : { theirs }), ...(theirs === undefined ? { raw: parsed } : {}) });
    console.log(`${`0x${record.toString(16)}`.padEnd(9)} ours ${ours.padEnd(18)} `
      + `theirs ${theirs ?? `(${answer.status}) ${answer.text.slice(0, 70)}`}`);
  }
}

console.log(`\n${agreed} of ${asked} agree on the number`);
const out = flag('out', '');
if (out !== '') {
  writeFileSync(out, JSON.stringify({ config, asked, agreed, rows }, null, 1));
  console.log(`report written to ${out}`);
}
