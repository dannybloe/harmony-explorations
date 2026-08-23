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
 * node packages/codec/bin/analyze.ts [--config h600_config] [--limit 25] [--out report.json]
 *   [--records 0x4282d,0x428fe]   ask about named records rather than the first few
 *   [--per-kind 12]               at most this many of each verdict our own decoder gives
 * ```
 *
 * **The credentials come out of the lab and are not arguments**, which is that file's own instruction:
 * `work/myharmony/credentials.env` holds a development account created on 12 August 2026 with no remote
 * ever registered on it, and it says in its own header that it is never committed, never quoted and
 * never pasted, so a probe reads it from there. `MYHARMONY_EMAIL` and `MYHARMONY_PASSWORD` in the
 * environment override it, for a machine with no lab.
 *
 * **Read only, in both directions.** The only operations it uses are a login, a ping and the analysis
 * itself. Nothing is saved to the account, no compile is queued, and no remote is involved: the codes
 * come off files already in the lab. The password is never printed and never written to the report.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { imagePath, LAB } from '@harmony/lab';
import { parse } from '../src/gspm.ts';
import { IR_CLASS_STREAM, irBlockWords, irCarrier, irClass, irGroups, irHeaderPointers }
  from '../src/ir.ts';
import { irdaString, mergedIntervals, pulsesOfWords, untilSilence } from '../src/irda.ts';
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

/**
 * The account, from the lab file that exists for exactly this.
 *
 * Parsed rather than sourced through a shell, so that nothing lands in a process listing or a shell
 * history. Comment lines and blanks are skipped and only the two keys are looked at, so an unrelated
 * line in that file cannot end up in a request.
 */
function account(): { email: string; password: string } | undefined {
  const fromEnv = { email: process.env['MYHARMONY_EMAIL'], password: process.env['MYHARMONY_PASSWORD'] };
  if (fromEnv.email !== undefined && fromEnv.password !== undefined) {
    return { email: fromEnv.email, password: fromEnv.password };
  }
  if (LAB === undefined) return undefined;
  let text: string;
  try {
    text = readFileSync(join(LAB, 'work', 'myharmony', 'credentials.env'), 'utf8');
  } catch {
    return undefined;
  }
  const found = new Map<string, string>();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;
    const at = trimmed.indexOf('=');
    if (at > 0) found.set(trimmed.slice(0, at), trimmed.slice(at + 1));
  }
  const email = found.get('MYHARMONY_EMAIL');
  const password = found.get('MYHARMONY_PASSWORD');
  return email === undefined || password === undefined ? undefined : { email, password };
}

const who = account();
if (who === undefined) {
  // A refusal rather than a fallback: this script's whole output is a comparison against a service, so
  // running it without a session would produce a page of "access denied" that reads like a result.
  console.error('no account: expected MYHARMONY_EMAIL and MYHARMONY_PASSWORD in the environment or in'
    + ' the lab\'s work/myharmony/credentials.env');
  process.exit(2);
}
const { email, password } = who;

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
/** Named records, for a question about a specific reading rather than about a sample. */
const only = new Set(flag('records', '').split(',').filter((one) => one !== '')
  .map((one) => Number.parseInt(one, 16)));
const path = imagePath(config);
if (path === undefined) throw new Error(`no ${config} in the lab`);
const c = parse(new Uint8Array(readFileSync(path)));

/**
 * One question and its answer, kept verbatim.
 *
 * **The report is the point, not the console output.** This service will be withdrawn, and when it is,
 * a recorded answer is the only external opinion this project will ever have about a stored code. So a
 * run writes the reply as it came, and `test/analyzed.test.ts` asserts the decoder against the file
 * rather than against the network.
 */
interface Row {
  config: string;
  record: string;
  /** What our decoder said: `<bits>:<value in hex>`, or the reason it declined. */
  ours: string;
  kind: string;
  sent: string;
  status: number;
  theirs?: string;
}
const rows: Row[] = [];
const per = new Map<string, number>();
const perKind = Number(flag('per-kind', String(limit)));
let agreed = 0;
let asked = 0;
outer: for (const group of irGroups(c) ?? []) {
  for (const record of group.addresses) {
    if (asked >= limit) break outer;
    if (only.size > 0 && !only.has(record)) continue;
    if (irClass(c, record) !== IR_CLASS_STREAM) continue;
    const first = irHeaderPointers(c, record)[0];
    if (first === undefined) continue;
    const words = irBlockWords(c, first);
    if (words === undefined) continue;
    const train = fromFirstMark(pulsesOfWords(words));
    const readings = framesOfPulses(train);
    // **Every category, not only the records that read cleanly**, because three of the four answers
    // this produces are about the ones that do not: whether they name a code we refuse, whether they
    // refuse one we name, and whether they refuse the ones a merge says we should never have named.
    const merged = framesOfPulses(mergedIntervals(train));
    const kind = readings.length === 1
      ? (merged.length === 0 ? 'one reading, none once merged' : 'one reading')
      : readings.length === 2 ? 'both conventions' : 'no reading';
    if ((per.get(kind) ?? 0) >= perKind) continue;
    per.set(kind, (per.get(kind) ?? 0) + 1);
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
    const ours = readings.length === 1 ? frameKey(readings[0]!)
      : readings.length === 2 ? 'ambiguous' : 'no reading';
    // Their notation is `G:<family>:()(0x<value>)():3`, section 132, and the value is in transmission
    // order like ours. So the comparison is on the number, and the family name is what we gain.
    //
    // **On the number and not on the spelling**, which a first version got wrong: they pad to a whole
    // number of nibbles and we do not, so a Sony frame came back as `070` against our `70` and was
    // counted as a disagreement. Compared as integers, both sides parsed the same way.
    const stated = theirs?.match(/\(0x([0-9A-Fa-f]+)\)/)?.[1];
    const mine = readings.length === 1 ? ours.split(':')[1] : undefined;
    const same = stated !== undefined && mine !== undefined
      && BigInt(`0x${stated}`) === BigInt(`0x${mine}`);
    if (same) agreed += 1;
    rows.push({ config, record: `0x${record.toString(16)}`, ours, kind, sent, status: answer.status,
      ...(theirs === undefined ? {} : { theirs }) });
    console.log(`${`0x${record.toString(16)}`.padEnd(9)} ${kind.padEnd(30)} ours ${ours.padEnd(16)} `
      + `theirs ${theirs ?? 'refused'}`);
  }
}

console.log(`\n${agreed} of ${asked} agree on the number`);
const out = flag('out', '');
if (out !== '') {
  writeFileSync(out, JSON.stringify({ config, asked, agreed, rows }, null, 1));
  console.log(`report written to ${out}`);
}
