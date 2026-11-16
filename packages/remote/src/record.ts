/**
 * The calls on one remote record that more than one script makes: the devices it holds, a catalogue
 * device found through the service's search, and one compile of the record as it stands, the way
 * MyHarmony's sync asks for it (the remote's settings read, the compile started with them, the answer
 * polled until the compiler is done). Shared by `bin/harvest.ts`, which compiles a batch of catalogue
 * devices and removes them again, and `bin/build-setup.ts`, which compiles a whole setup and leaves it
 * on the record.
 *
 * Every request goes through the session, so the least gap between two requests and the doors are the
 * session's, and nothing here sends anything a caller has not opened a door for.
 */
import { ACCOUNT_DIRECTOR, COMPILE_MANAGER, DEVICE_MANAGER, type MyHarmonySession, type Reply } from './myharmony.ts';
import { HarvestRefusal, compileStatus, pickMatch, type HarvestDevice } from './harvest.ts';

/** What a compile came to: the ZIP's bytes, or the status word it stopped at. */
export interface CompileResult {
  readonly zip?: Uint8Array;
  readonly status: string;
  /** Kept when the compile never finished, so it can be fetched again later. */
  readonly downloadUrl?: string;
}

export function expectOk(operation: string, reply: Reply): Record<string, unknown> {
  if (reply.status !== 200 || typeof reply.json !== 'object' || reply.json === null) {
    throw new HarvestRefusal(`${operation} answered status ${reply.status}; stopping`);
  }
  return reply.json as Record<string, unknown>;
}

/** The devices on `record`, by the account's own device id. */
export async function devicesOnRecord(session: MyHarmonySession, record: number):
    Promise<{ Id: { Value: number }; Name?: string }[]> {
  const out = expectOk('GetDevicesInAccount', await session.call('GetDevicesInAccount', DEVICE_MANAGER,
    { accountId: { Value: record, IsPersisted: true } }));
  return (out['GetDevicesInAccountResult'] as { Id: { Value: number }; Name?: string }[] | null) ?? [];
}

/**
 * The one search match carrying the archive's device id, or a refusal from `pickMatch`. Search type 3 is
 * the client's search box; type 1 finds what 3 misses, measured in the lab client.
 */
export async function searchDevice(session: MyHarmonySession, device: HarvestDevice):
    Promise<Record<string, unknown>> {
  let found: Record<string, unknown>[] = [];
  for (const searchType of [3, 1]) {
    const out = expectOk('SearchGlobalDevices', await session.call('SearchGlobalDevices', DEVICE_MANAGER, {
      manufacturer: device.manufacturer, modelNumber: device.model, deviceType: 0, searchType, maxResults: 50,
    }));
    found = ((out['SearchGlobalDevicesResult'] as { Matches?: Record<string, unknown>[] } | undefined)?.Matches) ?? [];
    if (found.some((one) => (one['Id'] as { Value?: number } | undefined)?.Value === device.globalDeviceId)) break;
  }
  return pickMatch(found, device);
}

function indexOf(bytes: Uint8Array, needle: number[]): number {
  outer: for (let i = 0; i + needle.length <= Math.min(bytes.length, 8192); i++) {
    for (let j = 0; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/**
 * Compile `remote` on `record`. The poll asks at most `polls` times; the session's own gap between
 * requests is the pause between two polls, which is longer than the three seconds the client waits.
 */
export async function compileRecord(session: MyHarmonySession, record: number, remote: number, polls = 40):
    Promise<CompileResult> {
  const settings = await session.callAt('GetRemoteSettings', `${ACCOUNT_DIRECTOR}Account/${record}/Remote/${remote}/Settings`, 'GET');
  if (settings.status !== 200) throw new HarvestRefusal(`remote settings answered ${settings.status}; stopping`);
  const started = expectOk('StartCompileWithLocaleAndSettings', await session.call(
    'StartCompileWithLocaleAndSettings', COMPILE_MANAGER,
    { remoteId: { Value: remote, IsPersisted: true }, localeId: 'en-US', remoteSettings: settings.json }));
  const url = (started['StartCompileWithLocaleAndSettingsResult'] as { DownloadUrl?: string } | undefined)?.DownloadUrl;
  if (!url) return { status: 'no download url' };
  return pollCompile(session, url, polls);
}

/**
 * Poll a compile already started, by the download address its start answered with, until the compiler
 * is done or `polls` answers have come back. Exported so a compile that outlasted one run can be fetched
 * by a later run instead of being started again.
 */
export async function pollCompile(session: MyHarmonySession, url: string, polls = 40): Promise<CompileResult> {
  const [base, query = ''] = url.split('?');
  const token = query.split('CompilationId=').pop() ?? '';
  // The client polls the JSON variant until the compiler is done.
  const poll = `${base!.replace('/RemoteConfiguration', '')}/json2/RemoteConfigurationInJson?`;
  for (let attempt = 0; attempt < polls; attempt++) {
    const answer = await session.callAt('RemoteConfigurationInJson', poll, 'POST', { token });
    const status = compileStatus(answer.bytes) ?? `http ${answer.status}`;
    if (status === 'Successful') {
      const at = indexOf(answer.bytes, [0x50, 0x4b, 0x03, 0x04]);
      return at < 0 ? { status: 'successful without a ZIP' } : { zip: answer.bytes.subarray(at), status };
    }
    if (status !== 'Compiling' && status !== 'Pending' && status !== 'Queued') return { status };
  }
  return { status: `still compiling after ${polls} polls`, downloadUrl: url };
}
