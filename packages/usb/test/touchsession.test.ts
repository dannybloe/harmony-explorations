/**
 * The Harmony Touch's request channel, `todo-touch.md` 6.2 and 6.3: the unit record a session checks, the
 * rail in `rails.ts`, the route on the transport, and the session in `touchsession.ts`.
 *
 * **Nothing here touches a device.** `fake-touch-remote.ts` answers as the recorded syncs show the remote
 * does, or replays a recorded sync report by report.
 *
 * **What it holds.**
 *
 * 1. **The allow list, and every refusal by a test of its own.** Two reads (the provisioning information,
 *    `getconfighash`) and the four requests of a sync (hand the remote's changes up, sync from the
 *    account, the next request list, write the answers), each the exact name the line opens with. Refused
 *    by name: the resource put, a provisioning in both spellings, marking the configuration changed,
 *    deleting the stored documents, every firmware request of `api/setup.md`, the endings and the abort,
 *    a name the engine forwards to the native program, a case variant, a verb added, the short form, the
 *    stringified array the client wrote, a line feed starting a second request, a caller's announcement,
 *    a request carrying an announcement's text and arguments that start with `=`. Each is refused by the
 *    rail on the whole line and by the transport on the bytes of its first data packet, with the flags
 *    set and the report authorised, which is what makes the second the rail and not a convenience. **The
 *    last three are also refused in a later packet**, the announcement's text split across two packets and
 *    `=` after a first packet that ended on `&` included, and a line feed in a later packet, since the
 *    transport carries what a line leaves open from one packet to the next.
 * 2. **A name cannot be finished in a second packet.** `vnd.logitech.setup/vnd.logitech.sync` alone in a
 *    first packet and `?deleteresources` in the next is one line and the request that deletes every stored
 *    document; the transport refuses the second packet.
 * 3. **The paths.** The session opens `/sys/hlapi` and nothing else for writing; `/sys/factoryreset`,
 *    `/sys/reboot`, `/tde/shipmode`, `/tde/fb`, the two firmware names and the two names that act when
 *    opened are refused for reading and for writing **with every flag this library has set**, the
 *    experiment door among them, authorised or not. The eight are named in this file as literals, so the
 *    list cannot be emptied or shortened with the suite still passing, and
 *    `tests/test_harmony_touch_api_names.py` holds the same eight against the names the native program's
 *    table says act. **And so is every variant spelling**: a doubled or trailing `/`, a `.` or `..`
 *    segment, upper case, a space and a byte above `0x7E`, since the lists compare exactly and the
 *    remote's own matching of a variant is not read.
 * 4. **The flags.** Each of `HARMONY_ENABLE_WRITES` and `HARMONY_TOUCH_REQUESTS` alone is refused by the
 *    rail and by the transport, and with neither nothing but the identity read goes out.
 * 5. **The unit.** Another serial, an empty serial (the remote's default when its manufacturing record is
 *    missing), filler, and another architecture, skin, product or build are each refused before a request
 *    is built.
 * 6. **The surface.** The session object offers `request` and nothing else, enumerated, and the guarded
 *    transport still offers `write`, `read` and `close`.
 * 7. **The bytes.** With both flags, every request of the three recorded syncs that the allow list carries
 *    is sent byte for byte as Logitech's client sent it, given the recorded replies, the announcements
 *    before the answer writes included. The clock write and the stringified array, which the session never
 *    sends, are left out of the comparison; the counts say how many requests, commands and reports were
 *    compared, and that as many reports went out as the client sent.
 *
 * **Sources checked first.** `reference/architectures/harmony-touch/answering-a-sync.md` "Which request
 * names act", `api/names.md`, `api/README.md` "How a name finds its handler", `api/setup.md` and
 * `api/proxy.md`; the recorded syncs through `touch-recording.ts`; Logitech's client's skin 99 templates
 * `getonremotechanges.xml`, `getrequest.xml`, `getprovisioninfo.xml`, `syncremote.xml` and
 * `postresponse.xml` in the lab's mirrored desktop client, which the shapes in `touchsession.ts` are read
 * from; the engine's dispatcher, `tasks/connectserver/core/engine.lua` `processMessage`, for how the long
 * form of `getconfighash` reaches its handler; and the remote's cable listener,
 * `tasks/connectserver/transport/halhttpserverconnector.lua`, for the announcement being matched anywhere in
 * a line. Stated by Logitech, in their client, for the shapes; the names' effects are read in the firmware.
 *
 * **Width.** One build, 4.15.330, which the rail requires; one model, the Harmony Touch. The recordings are
 * one unit synced by one client, Harmony Desktop. Serials here are made up.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { skipUnless } from '@harmony/lab';

import { authoriseReport } from '../src/authorise.ts';
import {
  FILE_OPEN,
  NEVER_OPENED_PATHS,
  encodeFileRequest,
  guardFileProtocol,
  isCanonicalPath,
  onTheTouchRequestRoute,
  parseSysInfo,
} from '../src/filepipe.ts';
import { dataPacket } from '../src/filewrite.ts';
import { UnitIdentityError, identifiesAUnit, sameUnit, unitIdentityFromSerial, unitIdentityText } from '../src/identity.ts';
import {
  RailError,
  TOUCH_READ_REQUESTS,
  TOUCH_SYNC_REQUESTS,
  WRITES_ENABLED,
  assertTouchRequestAllowed,
  assertTouchRequestTarget,
  touchRequestOfLine,
  touchRequestOfLineStart,
} from '../src/rails.ts';
import {
  TOUCH_REQUEST_SHAPES,
  openTouchRequestSession,
  requestOpenForReadingReport,
  requestOpenForWritingReport,
} from '../src/touchsession.ts';
import { TransportError } from '../src/transport.ts';
import { FakeTouchRemote } from './fake-touch-remote.ts';

/** A made up serial. */
const SERIAL = '20000101000000-424242';
const OTHER_SERIAL = '20000101000000-424243';

function sysinfoText(changes: Record<string, string | undefined> = {}): string {
  const fields: Record<string, string | undefined> = {
    arch: '0x11', skin: '0x63', usb_vendor_id: '0x046d', usb_product_id: '0xc12b', fw_ver: '4.15.330',
    fw_type: '0x00', hw_ver: '01.00', link_hw: 'usb', link_type: 'hid', link_packet_length: '64',
    serial_number: SERIAL, status: 'normal', ram_size: '64MB', feature: 'Infrared', ...changes,
  };
  return Object.entries(fields).filter(([, v]) => v !== undefined).map(([k, v]) => `${k} ${v}`).join('\n');
}

const THIS_UNIT = unitIdentityFromSerial(SERIAL);

const PROVISIONING = 'vnd.logitech.setup/vnd.logitech.account?getprovisioninfo';

/**
 * Spellings of `/sys/reboot` that compare unequal to it while the remote's matching of them is not read:
 * the five the review of 6.3 sent through the guard with the experiment door open, each of which went out
 * then, and a byte above `0x7E` that the old decoding cleared to `s`.
 */
const VARIANT_SPELLINGS: readonly string[] = [
  '/sys//reboot', '/sys/./reboot', '/SYS/REBOOT', '/sys/reboot/', '//sys/reboot', '/sys/../sys/reboot',
  '/sy\u00f3/reboot', '/sys/re boot',
];

/**
 * Every name the rail must refuse, with where it comes from. The firmware's own names are the API pages';
 * the variants are the dispatcher's rules turned against the list.
 */
const REFUSED: readonly [string, string][] = [
  ['vnd.logitech.proxy/vnd.logitech.resource?put', 'the resource put, api/proxy.md'],
  ['vnd.logitech.proxy/vnd.logitech.resource?get', 'the resource get, api/proxy.md'],
  ['vnd.logitech.setup/vnd.logitech.account?provision', 'a provisioning, api/setup.md'],
  ['setup.account?provision', 'a provisioning in the short form, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.account?autoprovisionfromhub', 'a provisioning from a hub, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.configchanged', 'marking the configuration changed, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.sync?deleteresources', 'deleting the stored documents, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.sync?begin', 'a sync started later, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.sync?contentchanged', 'raising the version numbers, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.firmware', 'the firmware machine, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.firmware?update', 'a firmware update, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.firmware?status', 'the firmware status, which can restart, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.firmware?reboot', 'a restart, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.firmware?packageinstall', 'a package install, api/setup.md'],
  ['vnd.logitech.setup/vnd.logitech.firmware?packageremove', 'a package removal, api/setup.md'],
  ['vnd.logitech.harmony/vnd.logitech.firmware?update', 'the engine\'s firmware names, api/system.md'],
  ['vnd.logitech.proxy/vnd.logitech.finished', 'the commit of a sync, api/proxy.md'],
  ['vnd.logitech.proxy/vnd.logitech.abort', 'the abort, api/proxy.md'],
  ['sys.reboot', 'a name the engine hands to the native program, api/README.md'],
  ['vnd.logitech.setup/vnd.logitech.SYNC', 'a case variant the engine lowers to setup.sync'],
  ['setup.sync', 'the short form of an allowed request'],
  ['vnd.logitech.setup/vnd.logitech.syncremotechanges', 'a case variant of the hand over'],
  ['[object Object],[object Object]', 'the stringified array the client wrote, refused by the remote'],
];

describe('the allow list', () => {
  it('holds two reads and the four requests of a sync, each with a shape', () => {
    assert.deepEqual(TOUCH_READ_REQUESTS, [
      'vnd.logitech.setup/vnd.logitech.account?getprovisioninfo',
      'vnd.logitech.harmony/vnd.logitech.harmony.engine?getconfighash',
    ]);
    assert.deepEqual(TOUCH_SYNC_REQUESTS, [
      'vnd.logitech.setup/vnd.logitech.syncRemoteChanges',
      'vnd.logitech.setup/vnd.logitech.sync',
      'vnd.logitech.proxy/vnd.logitech.request?read',
      'vnd.logitech.proxy/vnd.logitech.response?write',
    ]);
    assert.deepEqual(Object.keys(TOUCH_REQUEST_SHAPES).sort(),
      [...TOUCH_READ_REQUESTS, ...TOUCH_SYNC_REQUESTS, 'Content-Length'].sort());
    // The longest name has to fit in one packet whole, or the transport could not decode it.
    for (const name of [...TOUCH_READ_REQUESTS, ...TOUCH_SYNC_REQUESTS]) assert.ok(name.length <= 62, name);
  });

  it('takes each allowed name, bare or with arguments, and says its tier', () => {
    for (const name of TOUCH_READ_REQUESTS) assert.equal(touchRequestOfLine(name).tier, 'read');
    for (const name of TOUCH_SYNC_REQUESTS) assert.equal(touchRequestOfLine(`${name}&sessionId=1`).tier, 'sync');
  });

  for (const [name, source] of REFUSED) {
    it(`refuses ${name}: ${source}`, () => {
      assert.throws(() => touchRequestOfLine(name), RailError);
      assert.throws(() => touchRequestOfLine(`${name}&sessionId=1`), RailError);
      assert.equal(touchRequestOfLineStart(Buffer.from(name.slice(0, 62), 'ascii')), undefined);
    });
  }

  it('refuses a line feed, which would start a second request the rail never saw', () => {
    const line = `${PROVISIONING}\nvnd.logitech.setup/vnd.logitech.configchanged`;
    assert.throws(() => touchRequestOfLine(line), RailError);
    assert.equal(touchRequestOfLineStart(Buffer.from(line.slice(0, 62), 'ascii')), undefined);
  });

  it('refuses an announcement from a caller, and a request carrying an announcement\'s text', () => {
    assert.throws(() => touchRequestOfLine('Content-Length: 209'), /written by the session itself/);
    assert.throws(() => touchRequestOfLine(`${TOUCH_SYNC_REQUESTS[3]}&x=Content-Length: 5`), /announcement/);
    // The transport does take a bare announcement, and marks that nothing may follow it.
    assert.deepEqual(touchRequestOfLineStart(Buffer.from('Content-Length: 209')),
      { name: 'Content-Length', tier: 'announcement', endsHere: true });
    assert.equal(touchRequestOfLineStart(Buffer.from('Content-Length: 0')), undefined);
  });

  it('refuses arguments that start with "=", which move the verb out of the name the engine runs', () => {
    for (const name of [...TOUCH_READ_REQUESTS, ...TOUCH_SYNC_REQUESTS]) {
      for (const tail of ['&=x', '&&=x', '&&&=']) {
        assert.throws(() => touchRequestOfLine(`${name}${tail}`), /start with "="/, `${name}${tail}`);
        assert.equal(touchRequestOfLineStart(Buffer.from(`${name}${tail}`, 'ascii')), undefined, `${name}${tail}`);
      }
      // The control: an argument with a name, and a run of & with nothing after it, still pass.
      assert.equal(touchRequestOfLine(`${name}&&sessionId=1`).name, name);
      assert.equal(touchRequestOfLine(`${name}&&`).name, name);
    }
  });

  it('refuses an announcement\'s text in the first packet of a request, as the transport sees it', () => {
    assert.equal(touchRequestOfLineStart(Buffer.from(`${TOUCH_SYNC_REQUESTS[3]}&x=Content-Length: 5`, 'ascii')), undefined);
    assert.ok(touchRequestOfLineStart(Buffer.from(`${TOUCH_SYNC_REQUESTS[3]}&x=Content-Length 5`, 'ascii')));
  });

  it('cannot decode a name from a full first packet that has not ended it', () => {
    const full = Buffer.from(`${'vnd.logitech.setup/vnd.logitech.sync'}${'x'.repeat(26)}`, 'ascii');
    assert.equal(full.length, 62);
    assert.equal(touchRequestOfLineStart(full), undefined);
  });
});

describe('the route on the transport, as a state machine', () => {
  const path = '/sys/hlapi';
  const openW = requestOpenForWritingReport(TOUCH_REQUEST_SHAPES[PROVISIONING]!, 56);
  const openR = requestOpenForReadingReport(TOUCH_REQUEST_SHAPES[PROVISIONING]!);
  const packet = (text: string, seq = 3): Uint8Array => dataPacket(seq, Buffer.from(text, 'ascii'));

  it('passes an open for writing, a write command and an allowed line, and an open for reading only when idle', () => {
    assert.equal(onTheTouchRequestRoute(openW, 'idle'), 'open');
    assert.equal(onTheTouchRequestRoute(openR, 'idle'), 'idle');
    assert.equal(onTheTouchRequestRoute(openR, 'open'), undefined);
    assert.equal(onTheTouchRequestRoute(openW, 'open'), undefined);
    assert.equal(onTheTouchRequestRoute(packet(PROVISIONING), 'open'), 'ended');
    assert.equal(onTheTouchRequestRoute(packet(`${TOUCH_SYNC_REQUESTS[2]}&sessionId=`), 'open'), 'line');
  });

  it('refuses a data packet with no line open, and one after a line that had to end', () => {
    assert.equal(onTheTouchRequestRoute(packet(PROVISIONING), 'idle'), undefined);
    assert.equal(onTheTouchRequestRoute(packet('&x=1'), 'ended'), undefined);
  });

  it('refuses ?deleteresources finishing a name the first packet left open', () => {
    const first = onTheTouchRequestRoute(packet('vnd.logitech.setup/vnd.logitech.sync'), 'open');
    assert.equal(first, 'ended');
    assert.equal(onTheTouchRequestRoute(packet('?deleteresources', 4), first!), undefined);
  });

  it('opens /sys/hlapi and no other path', () => {
    for (const other of ['/sys/time', '/sys/hlapi2', '/sys/hlap', '/sys/mfg', '/tde/enable', '/cfg/usercfg']) {
      const report = encodeFileRequest(FILE_OPEN, [
        { kind: 'string', value: other }, { kind: 'string', value: 'W' }, { kind: 'dword', value: 10 },
      ]);
      report[3] = 2;
      assert.equal(onTheTouchRequestRoute(report, 'idle'), undefined, other);
    }
    assert.equal(path, '/sys/hlapi');
  });
});

describe('the paths never opened', () => {
  it('are these eight, named here and not read off the list, so emptying the list fails', () => {
    assert.deepEqual([...NEVER_OPENED_PATHS].sort(), [
      '/fw/hub-otaupdate',
      '/fw/otaupdate',
      '/sys/factoryreset',
      '/sys/reboot',
      '/tde/fb',
      '/tde/haptic/calibrate',
      '/tde/haptic/diagnostic',
      '/tde/shipmode',
    ]);
  });

  it('are spelled canonically, and every variant spelling the review probed is not', () => {
    for (const path of NEVER_OPENED_PATHS) assert.ok(isCanonicalPath(path), path);
    for (const path of ['/sys/sysinfo', '/sys/hlapi', '/cfg/usercfg', '/fw/normalmode']) assert.ok(isCanonicalPath(path), path);
    for (const path of VARIANT_SPELLINGS) assert.ok(!isCanonicalPath(path), path);
  });
});

describe('a Touch\'s unit record', () => {
  it('is 32 bytes that identify a unit, the same for the same serial and different for another', () => {
    const a = unitIdentityFromSerial(SERIAL);
    assert.equal(a.length, 32);
    assert.ok(identifiesAUnit(a));
    assert.equal(unitIdentityText(a).length, 64);
    assert.ok(sameUnit(a, unitIdentityFromSerial(SERIAL)));
    assert.ok(!sameUnit(a, unitIdentityFromSerial(OTHER_SERIAL)));
  });

  it('refuses the empty serial, the remote\'s default when its record is missing, and filler', () => {
    for (const filler of ['', '   ', '0000000000', '-']) {
      assert.throws(() => unitIdentityFromSerial(filler), UnitIdentityError, JSON.stringify(filler));
    }
    assert.throws(() => unitIdentityFromSerial('12'.repeat(32)), /longer than the 63/);
    assert.throws(() => unitIdentityFromSerial('2000 0101'), /not printable/);
  });
});

describe('the rail, with the flags off', () => {
  const permission = {
    path: '/sys/hlapi', line: PROVISIONING, sysinfo: parseSysInfo(sysinfoText()), permittedUnit: THIS_UNIT,
  };

  it('is this build: the tests run with writes disabled', () => {
    assert.equal(WRITES_ENABLED, false);
  });

  it('refuses every request, naming the build flag', () => {
    assert.throws(() => assertTouchRequestAllowed(permission), /HARMONY_ENABLE_WRITES=1/);
  });

  it('passes the target checks for this unit, the path and an allowed line, which is the control', () => {
    assert.equal(assertTouchRequestTarget(permission).tier, 'read');
  });

  it('refuses every path but /sys/hlapi', () => {
    for (const path of [...NEVER_OPENED_PATHS, '/sys/time', '/cfg/usercfg', '/sys/mfg']) {
      assert.throws(() => assertTouchRequestTarget({ ...permission, path }), /opens \/sys\/hlapi and nothing else/, path);
    }
  });

  it('refuses another unit, an empty serial and a remote that is not this Touch on this build', () => {
    const facts = (changes: Record<string, string | undefined>): typeof permission =>
      ({ ...permission, sysinfo: parseSysInfo(sysinfoText(changes)) });
    assert.throws(() => assertTouchRequestTarget(facts({ serial_number: OTHER_SERIAL })), /not the unit/);
    assert.throws(() => assertTouchRequestTarget(facts({ serial_number: '' })), /cannot be identified/);
    assert.throws(() => assertTouchRequestTarget(facts({ serial_number: undefined })), /no serial_number/);
    assert.throws(() => assertTouchRequestTarget(facts({ arch: '0x10' })), /Harmony Touch only/);
    assert.throws(() => assertTouchRequestTarget(facts({ skin: '0x61' })), /Harmony Touch only/);
    assert.throws(() => assertTouchRequestTarget(facts({ usb_product_id: '0xc129' })), /Harmony Touch only/);
    assert.throws(() => assertTouchRequestTarget(facts({ fw_ver: '4.15.250' })), /read on 4\.15\.330 only/);
    assert.throws(() => assertTouchRequestTarget(facts({ link_packet_length: '32' })), /packet length/);
  });
});

describe('the session, with the flags off', () => {
  it('offers request and nothing else, so neither the transport nor the unit is on its surface', async () => {
    const session = await openTouchRequestSession(new FakeTouchRemote({ sysinfo: sysinfoText() }),
      { permittedUnit: THIS_UNIT });
    const surface = new Set<string>();
    for (let o: object | null = session; o !== null && o !== Object.prototype; o = Object.getPrototypeOf(o) as object | null) {
      for (const name of Object.getOwnPropertyNames(o)) surface.add(name);
    }
    assert.deepEqual([...surface].sort(), ['request']);
    assert.ok(Object.isFrozen(session));
  });

  it('still leaves the guarded transport write, read and close', () => {
    const guarded = guardFileProtocol(new FakeTouchRemote({ sysinfo: sysinfoText() }));
    const surface = new Set<string>();
    for (let o: object | null = guarded; o !== null && o !== Object.prototype; o = Object.getPrototypeOf(o) as object | null) {
      for (const name of Object.getOwnPropertyNames(o)) surface.add(name);
    }
    assert.deepEqual([...surface].sort(), ['close', 'read', 'write']);
  });

  it('reads the identity file, then refuses the request, and nothing but the read went out', async () => {
    const remote = new FakeTouchRemote({ sysinfo: sysinfoText() });
    const session = await openTouchRequestSession(guardFileProtocol(remote), { permittedUnit: THIS_UNIT });
    await assert.rejects(() => session.request(PROVISIONING), /HARMONY_ENABLE_WRITES=1/);
    assert.deepEqual(remote.sent.map((r) => r[1]), [0x00, FILE_OPEN, 0x04, 0x07]);
  });

  it('refuses another unit when it opens, before any request is built', async () => {
    const remote = new FakeTouchRemote({ sysinfo: sysinfoText({ serial_number: OTHER_SERIAL }) });
    await assert.rejects(() => openTouchRequestSession(guardFileProtocol(remote), { permittedUnit: THIS_UNIT }),
      /not the unit/);
  });

  it('refuses an authorised open of /sys/hlapi at the transport', async () => {
    const remote = new FakeTouchRemote({ sysinfo: sysinfoText() });
    const guarded = guardFileProtocol(remote);
    const open = requestOpenForWritingReport(TOUCH_REQUEST_SHAPES[PROVISIONING]!, 56);
    authoriseReport(guarded, open);
    await assert.rejects(() => guarded.write(open), TransportError);
    assert.equal(remote.sent.length, 0);
  });

  it('reads a path byte for byte, so a byte above 0x7E is not taken for the inert path it would clear to', async () => {
    // `/sys/sysinf` and 0xEF: Node's `ascii` decoding clears the high bit and made this `/sys/sysinfo`.
    const remote = new FakeTouchRemote({ sysinfo: sysinfoText() });
    const guarded = guardFileProtocol(remote);
    await assert.rejects(() => guarded.write(encodeFileRequest(FILE_OPEN, [
      { kind: 'string', value: '/sys/sysinf\u00ef' }, { kind: 'string', value: 'R' },
    ])), TransportError);
    assert.equal(remote.sent.length, 0);
  });

  it('refuses every never opened path, in either mode, at the transport', async () => {
    for (const path of NEVER_OPENED_PATHS) {
      for (const mode of ['R', 'W']) {
        const remote = new FakeTouchRemote({ sysinfo: sysinfoText() });
        const guarded = guardFileProtocol(remote);
        await assert.rejects(() => guarded.write(encodeFileRequest(FILE_OPEN, [
          { kind: 'string', value: path }, { kind: 'string', value: mode },
        ])), /never opens it/, `${path} ${mode}`);
        assert.equal(remote.sent.length, 0);
      }
    }
  });
});

/**
 * Run a script in a fresh process with these flags set, the flags being read once when `rails.ts` and
 * `filepipe.ts` load, and return what it printed.
 */
function withEnv(extra: Record<string, string>, script: string): string {
  const here = fileURLToPath(new URL('.', import.meta.url));
  const path = (relative: string): string => join(here, relative).replaceAll('\\', '/');
  return execFileSync(
    process.execPath,
    ['--input-type=module', '--eval', `
      import * as session from '${path('../src/touchsession.ts')}';
      import * as pipe from '${path('../src/filepipe.ts')}';
      import * as rails from '${path('../src/rails.ts')}';
      import * as write from '${path('../src/filewrite.ts')}';
      import { unitIdentityFromSerial } from '${path('../src/identity.ts')}';
      import { authoriseReport } from '${path('../src/authorise.ts')}';
      import { FakeTouchRemote, operationsOf } from '${path('./fake-touch-remote.ts')}';
      const SYSINFO = ${JSON.stringify(sysinfoText())};
      const UNIT = unitIdentityFromSerial(${JSON.stringify(SERIAL)});
      const hex = (r, n = 12) => Buffer.from(r.subarray(0, n)).toString('hex');
      const outcome = async (f) => { try { await f(); return 'sent'; } catch (e) { return e.constructor.name; } };
      ${script}
    `],
    { env: { ...process.env, ...extra }, encoding: 'utf8', maxBuffer: 1 << 24 },
  ).trim();
}

const REQUEST_FLAGS = { HARMONY_ENABLE_WRITES: '1', HARMONY_TOUCH_REQUESTS: '1' };
const EVERY_FLAG = {
  ...REQUEST_FLAGS, HARMONY_FILE_WRITE: '1', HARMONY_FILE_PATH_EXPERIMENT: '1',
};

describe('the transport, with the flags set', () => {
  it('refuses every never opened path in either mode with every flag this library has, authorised', () => {
    const output = withEnv(EVERY_FLAG, `
      const results = [];
      for (const path of pipe.NEVER_OPENED_PATHS) {
        for (const mode of ['R', 'W']) {
          const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
          const guarded = pipe.guardFileProtocol(remote);
          const report = pipe.encodeFileRequest(pipe.FILE_OPEN, [
            { kind: 'string', value: path }, { kind: 'string', value: mode },
            ...(mode === 'W' ? [{ kind: 'dword', value: 6 }] : []),
          ]);
          if (mode === 'W') report[3] = 2;
          authoriseReport(guarded, report);
          results.push(await outcome(() => guarded.write(report)) + (remote.sent.length === 0 ? '' : ' and it went out'));
        }
      }
      process.stdout.write(JSON.stringify(results));
    `);
    assert.deepEqual(JSON.parse(output), NEVER_OPENED_PATHS.flatMap(() => ['TransportError', 'TransportError']));
  });

  it('needs both request flags at the transport, each one alone refusing the authorised open', () => {
    const script = `
      const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
      const guarded = pipe.guardFileProtocol(remote);
      const open = session.requestOpenForWritingReport(session.TOUCH_REQUEST_SHAPES[rails.TOUCH_READ_REQUESTS[0]], 56);
      authoriseReport(guarded, open);
      process.stdout.write(await outcome(() => guarded.write(open)));
    `;
    assert.equal(withEnv({ HARMONY_ENABLE_WRITES: '1', HARMONY_FILE_WRITE: '1' }, script), 'TransportError');
    assert.equal(withEnv({ HARMONY_TOUCH_REQUESTS: '1', HARMONY_FILE_WRITE: '1' }, script), 'TransportError');
    assert.equal(withEnv(REQUEST_FLAGS, script), 'sent');
  });

  it('refuses a refused name in the first data packet, authorised, and the same packet unauthorised', () => {
    const output = withEnv(EVERY_FLAG, `
      const shape = session.TOUCH_REQUEST_SHAPES[rails.TOUCH_READ_REQUESTS[0]];
      const send = async (guarded, report, authorise = true) => {
        if (authorise) authoriseReport(guarded, report);
        return outcome(() => guarded.write(report));
      };
      const line = async (text, authorise = true) => {
        const guarded = pipe.guardFileProtocol(new FakeTouchRemote({ sysinfo: SYSINFO }));
        const steps = [
          await send(guarded, session.requestOpenForWritingReport(shape, text.length)),
          await send(guarded, session.requestWriteChunkReport(shape, 1, 2, 2)),
          await send(guarded, write.dataPacket(3, Buffer.from(text, 'ascii')), authorise),
        ];
        return steps.join(',');
      };
      const results = {};
      for (const text of ${JSON.stringify(REFUSED.map(([n]) => n))}) results[text] = await line(text);
      results.allowed = await line(rails.TOUCH_READ_REQUESTS[0]);
      results.unauthorised = await line(rails.TOUCH_READ_REQUESTS[0], false);
      process.stdout.write(JSON.stringify(results));
    `);
    const results = JSON.parse(output) as Record<string, string>;
    for (const [name] of REFUSED) assert.equal(results[name], 'sent,sent,TransportError', name);
    assert.equal(results['allowed'], 'sent,sent,sent');
    assert.equal(results['unauthorised'], 'sent,sent,TransportError');
  });

  it('refuses every variant spelling of a never opened path, in either mode, with every flag set, authorised', () => {
    const output = withEnv(EVERY_FLAG, `
      const results = {};
      for (const path of ${JSON.stringify(VARIANT_SPELLINGS)}) {
        for (const mode of ['R', 'W']) {
          const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
          const guarded = pipe.guardFileProtocol(remote);
          const report = pipe.encodeFileRequest(pipe.FILE_OPEN, [
            { kind: 'string', value: path }, { kind: 'string', value: mode },
          ]);
          // Written byte for byte, so a character above 0x7E goes out as one byte as a caller could send it.
          const bytes = Buffer.from(path, 'latin1');
          report.set(bytes, 5);
          authoriseReport(guarded, report);
          results[path + ' ' + mode] = await outcome(() => guarded.write(report)) + (remote.sent.length === 0 ? '' : ' and it went out');
        }
      }
      // The control: the canonical spelling of an inert path still opens through the same door.
      const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
      const guarded = pipe.guardFileProtocol(remote);
      results.control = await outcome(() => guarded.write(pipe.encodeFileRequest(pipe.FILE_OPEN, [
        { kind: 'string', value: '/sys/sysinfo' }, { kind: 'string', value: 'R' },
      ])));
      process.stdout.write(JSON.stringify(results));
    `);
    const results = JSON.parse(output) as Record<string, string>;
    for (const path of VARIANT_SPELLINGS) {
      for (const mode of ['R', 'W']) assert.equal(results[`${path} ${mode}`], 'TransportError', `${path} ${mode}`);
    }
    assert.equal(results['control'], 'sent');
  });

  it('refuses a later packet that carries an announcement\'s text, whole or split across two packets', () => {
    const output = withEnv(EVERY_FLAG, `
      const shape = session.TOUCH_REQUEST_SHAPES[rails.TOUCH_SYNC_REQUESTS[3]];
      const line = async (packets) => {
        const guarded = pipe.guardFileProtocol(new FakeTouchRemote({ sysinfo: SYSINFO }));
        const send = (report) => { authoriseReport(guarded, report); return outcome(() => guarded.write(report)); };
        const steps = [
          await send(session.requestOpenForWritingReport(shape, 200)),
          await send(session.requestWriteChunkReport(shape, 1, 1 + packets.length, 2)),
        ];
        for (const [i, text] of packets.entries()) steps.push(await send(write.dataPacket(3 + i, Buffer.from(text, 'ascii'))));
        return steps.join(',');
      };
      const name = rails.TOUCH_SYNC_REQUESTS[3];
      process.stdout.write(JSON.stringify({
        whole: await line([name + '&a=', 'Content-Length: 5']),
        split: await line([name + '&a=Content-Len', 'gth: 5']),
        control: await line([name + '&a=Content-Len', 'gthy 5']),
      }));
    `);
    assert.deepEqual(JSON.parse(output), {
      whole: 'sent,sent,sent,TransportError',
      split: 'sent,sent,sent,TransportError',
      control: 'sent,sent,sent,sent',
    });
  });

  it('refuses "=" opening the arguments, in the first packet or after a first packet that ended on "&"', () => {
    const output = withEnv(EVERY_FLAG, `
      const shape = session.TOUCH_REQUEST_SHAPES[rails.TOUCH_SYNC_REQUESTS[2]];
      const line = async (packets) => {
        const guarded = pipe.guardFileProtocol(new FakeTouchRemote({ sysinfo: SYSINFO }));
        const send = (report) => { authoriseReport(guarded, report); return outcome(() => guarded.write(report)); };
        const steps = [
          await send(session.requestOpenForWritingReport(shape, 200)),
          await send(session.requestWriteChunkReport(shape, 1, 1 + packets.length, 2)),
        ];
        for (const [i, text] of packets.entries()) steps.push(await send(write.dataPacket(3 + i, Buffer.from(text, 'ascii'))));
        return steps.join(',');
      };
      const name = rails.TOUCH_SYNC_REQUESTS[2];
      process.stdout.write(JSON.stringify({
        first: await line([name + '&=x']),
        split: await line([name + '&', '&=x']),
        control: await line([name + '&', '&sessionId=1']),
      }));
    `);
    assert.deepEqual(JSON.parse(output), {
      first: 'sent,sent,TransportError',
      split: 'sent,sent,sent,TransportError',
      control: 'sent,sent,sent,sent',
    });
  });

  it('refuses a line feed in a later packet, which would start a second request the rail never saw', () => {
    const output = withEnv(EVERY_FLAG, `
      const shape = session.TOUCH_REQUEST_SHAPES[rails.TOUCH_SYNC_REQUESTS[2]];
      const guarded = pipe.guardFileProtocol(new FakeTouchRemote({ sysinfo: SYSINFO }));
      const send = (report) => { authoriseReport(guarded, report); return outcome(() => guarded.write(report)); };
      const steps = [
        await send(session.requestOpenForWritingReport(shape, 200)),
        await send(session.requestWriteChunkReport(shape, 1, 3, 2)),
        await send(write.dataPacket(3, Buffer.from(rails.TOUCH_SYNC_REQUESTS[2] + '&sessionId=1', 'ascii'))),
        await send(write.dataPacket(4, Buffer.from('x\\nvnd.logitech.setup/vnd.logitech.sync?deleteresources', 'ascii'))),
      ];
      process.stdout.write(steps.join(','));
    `);
    assert.equal(output, 'sent,sent,sent,TransportError');
  });

  it('refuses ?deleteresources in a second packet, and a file write route data packet while a line is open', () => {
    const output = withEnv(EVERY_FLAG, `
      const shape = session.TOUCH_REQUEST_SHAPES['vnd.logitech.setup/vnd.logitech.sync'];
      const guarded = pipe.guardFileProtocol(new FakeTouchRemote({ sysinfo: SYSINFO }));
      const send = (report) => { authoriseReport(guarded, report); return outcome(() => guarded.write(report)); };
      const steps = [
        await send(session.requestOpenForWritingReport(shape, 52)),
        await send(session.requestWriteChunkReport(shape, 1, 3, 6)),
        await send(write.dataPacket(7, Buffer.from('vnd.logitech.setup/vnd.logitech.sync', 'ascii'))),
        await send(write.dataPacket(8, Buffer.from('?deleteresources', 'ascii'))),
        // The same bytes on the Harmony 300 and 350's route, whose data packets are judged by shape only.
        await send(write.dataPacket(8, Buffer.from('?deleteresources', 'ascii'))),
      ];
      process.stdout.write(steps.join(','));
    `);
    assert.equal(output, 'sent,sent,sent,TransportError,TransportError');
  });
});

describe('the session, with the flags set', () => {
  it('refuses with writes enabled and the request door shut, which is the point of the door', () => {
    const output = withEnv({ HARMONY_ENABLE_WRITES: '1' }, `
      const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
      const s = await session.openTouchRequestSession(pipe.guardFileProtocol(remote), { permittedUnit: UNIT });
      let message = 'sent';
      try { await s.request(rails.TOUCH_READ_REQUESTS[0]); } catch (e) { message = e.message; }
      process.stdout.write(JSON.stringify({ message, sent: remote.sent.map((r) => r[1]) }));
    `);
    const result = JSON.parse(output) as { message: string; sent: number[] };
    assert.match(result.message, /HARMONY_TOUCH_REQUESTS=1/);
    assert.deepEqual(result.sent, [0x00, 0x01, 0x04, 0x07]);
  });

  it('sends the provisioning read in its template\'s shape and returns the answer', () => {
    const output = withEnv(REQUEST_FLAGS, `
      const remote = new FakeTouchRemote({ sysinfo: SYSINFO, answer: () => 'Response,{"mode":0}' });
      const s = await session.openTouchRequestSession(pipe.guardFileProtocol(remote), { permittedUnit: UNIT });
      const answer = await s.request(rails.TOUCH_READ_REQUESTS[0]);
      process.stdout.write(JSON.stringify({ answer, sent: remote.sent.slice(4).map((r) => hex(r)), lines: remote.lines }));
    `);
    const result = JSON.parse(output) as { answer: { tier: string; text: string }; sent: string[]; lines: string[] };
    assert.equal(result.answer.tier, 'read');
    assert.equal(result.answer.text, 'Response,{"mode":0}');
    assert.deepEqual(result.lines, [PROVISIONING]);
    // The shape, report by report: open for writing (sequence 0, two parameters stated, the size 56),
    // the write command (2, one byte count of 2), the line's one data packet (3, 56 bytes), the close (4),
    // the open for reading (1), the read (5, fifty packets as a byte), the close (6).
    assert.deepEqual(result.sent.map((r) => r.slice(0, 8)), [
      'ff010002', 'ff030202', '0338766e', 'ff070401', 'ff010102', 'ff040502', 'ff070601',
    ]);
    // The handles are the fake's: the identity read took 1, so the line is written through 2 and read through 3.
    assert.equal(result.sent[1], 'ff0302020102010200000000');
    assert.equal(result.sent[5], 'ff0405020103013200000000');
  });

  it('announces a write of answers first, with the length of its responses argument', () => {
    const output = withEnv(REQUEST_FLAGS, `
      const remote = new FakeTouchRemote({ sysinfo: SYSINFO, answer: () => 'Response,{}' });
      const s = await session.openTouchRequestSession(pipe.guardFileProtocol(remote), { permittedUnit: UNIT });
      const line = rails.TOUCH_SYNC_REQUESTS[3] + '&sessionId=1&responses=' + 'x'.repeat(200);
      const answer = await s.request(line);
      process.stdout.write(JSON.stringify({ lines: remote.lines, length: line.length, announcement: answer.announcement }));
    `);
    const result = JSON.parse(output) as { lines: string[]; length: number; announcement: string };
    assert.deepEqual(result.lines.map((l) => l.slice(0, 20)), ['Content-Length: 200', TOUCH_SYNC_REQUESTS[3]!.slice(0, 20)]);
    assert.equal(result.length, 269);
    assert.equal(result.announcement, 'Response,{}');
  });
});

const RECORDINGS = ['touch_sync_recording', 'touch_full_sync_recording', 'touch_reverse_sync_recording'] as const;

describe('the bytes, against the three recorded syncs', () => {
  it('sends every allowed request byte for byte as Logitech\'s client did', skipUnless(...RECORDINGS), () => {
    const output = withEnv(REQUEST_FLAGS, `
      const results = {};
      for (const fixture of ${JSON.stringify(RECORDINGS)}) {
        const operations = operationsOf(fixture);
        const replay = operations.flatMap((o) => o.commands);
        const remote = new FakeTouchRemote({ sysinfo: SYSINFO, replay });
        const s = await session.openTouchRequestSession(pipe.guardFileProtocol(remote), { permittedUnit: UNIT });
        const lines = operations.map((o) => o.line).filter((l) => !l.startsWith('Content-Length'));
        const names = {};
        let error;
        for (const line of lines) {
          const name = line.split('&')[0].replace('vnd.logitech.', '').replace('/vnd.logitech.', '/');
          names[name] = (names[name] ?? 0) + 1;
          try { await s.request(line); } catch (e) { error = e.message; break; }
        }
        results[fixture] = {
          names, error, mismatch: remote.mismatch, commands: replay.length, replayed: remote.replayed,
          reports: remote.sent.length - 4, announcements: operations.length - lines.length,
          recordedReports: replay.reduce((n, c) => n + c.request.length, 0),
        };
      }
      process.stdout.write(JSON.stringify(results));
    `);
    const results = JSON.parse(output) as Record<string, {
      names: Record<string, number>; error?: string; mismatch?: string; commands: number; replayed: number;
      reports: number; announcements: number; recordedReports: number;
    }>;
    for (const fixture of RECORDINGS) {
      const r = results[fixture]!;
      assert.equal(r.mismatch, undefined, `${fixture}: ${r.mismatch}`);
      assert.equal(r.error, undefined, `${fixture}: ${r.error}`);
      assert.equal(r.replayed, r.commands, `${fixture}: every recorded command served`);
    }
    // Which requests each recording carried, by name: every request of the three syncs but the
    // stringified array, which is not on the list and which the remote refused.
    assert.deepEqual(Object.fromEntries(RECORDINGS.map((f) => [f, results[f]!.names])), {
      touch_sync_recording: {
        'setup/syncRemoteChanges': 1, 'proxy/request?read': 3, 'proxy/response?write': 3,
        'setup/account?getprovisioninfo': 1, 'setup/sync': 1,
      },
      touch_full_sync_recording: {
        'setup/account?getprovisioninfo': 1, 'setup/sync': 1, 'proxy/request?read': 7, 'proxy/response?write': 6,
      },
      touch_reverse_sync_recording: {
        'setup/syncRemoteChanges': 2, 'proxy/request?read': 3, 'proxy/response?write': 3,
      },
    });
    // How much was compared: the recorded commands served, the reports sent after the identity read, and
    // the announcements, one before each answer write.
    assert.deepEqual(Object.fromEntries(RECORDINGS.map((f) => [f, [results[f]!.commands, results[f]!.reports, results[f]!.announcements]])), {
      touch_sync_recording: [80, 4143, 3],
      touch_full_sync_recording: [151, 13835, 6],
      touch_reverse_sync_recording: [66, 134, 3],
    });
    for (const fixture of RECORDINGS) {
      assert.equal(results[fixture]!.reports, results[fixture]!.recordedReports, `${fixture}: as many reports as the client sent`);
    }
  });
});
