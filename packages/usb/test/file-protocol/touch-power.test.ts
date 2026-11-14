/**
 * A Harmony Touch's power source, `/tde/powerstate`, read through the read only route, and the allowance that lets
 * the guard open it on a Touch and nowhere else.
 *
 * **What is claimed.**
 *
 * * **The guard opens `/tde/powerstate` for reading on a transport opened on the Touch's product id**, and refuses it
 *   on one opened on the Harmony 300 and 350's product id, `0xc124`, and on one whose product it was not told, while
 *   the named door is shut. The allowance is a list keyed by product, `INERT_PATHS_OF_PRODUCT`, held here to its one
 *   entry as a literal, so a list emptied or widened fails.
 * * **It stays refused for writing on every route, whatever the flags.** In this process, where no flag is set, the
 *   guard refuses every mode but `R`; the file write route's list and allow list and the request route's allow list
 *   name it nowhere; and in a process with every write flag, the request flag, the recovery flag and the path door
 *   set, an open of it for writing that was authorised byte for byte is still refused, where the same process passes
 *   the request route's own open of `/sys/hlapi`, the control that the flags are in force there.
 * * **`readTouchPowerSource` returns the pretend Touch's answer trimmed**, one of the five sources or any other text
 *   as it came, through a read of the identity file and a read of the name and nothing else; refuses before sending
 *   anything on a transport that is not known to be a Touch's; and refuses, the name never opened, on a firmware
 *   build the name's handlers are not read in.
 *
 * Why the open is a plain read is read in the Touch's native program, build 4.15.330,
 * `tests/harmony_touch/test_harmony_touch_api_names.py` and `reference/architectures/harmony-touch/api/names.md`.
 * **What is not claimed**: anything about a unit. What a Touch's file holds on each source, and whether its text
 * ends in a newline, is not measured; the pretend Touch answers as a test tells it.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { FakeTouchRemote } from '@harmony/testkit/fake-touch-remote';

import {
  FILE_CLOSE,
  FILE_OPEN,
  FILE_PING,
  FILE_READ,
  INERT_PATHS,
  INERT_PATHS_OF_PRODUCT,
  TOUCH_POWER_PATH,
  TOUCH_POWER_READ_ON,
  TOUCH_POWER_SOURCES,
  encodeFileRequest,
  guardFileProtocol,
  guardedProduct,
  onTheFileWriteRoute,
  onTheTouchRequestRoute,
  readTouchPowerSource,
  type FileParam,
} from '../../src/filepipe.ts';
import { FILE_WRITE_PATHS, TOUCH_PRODUCT_ID } from '../../src/rails.ts';
import { TransportError } from '../../src/transport.ts';

/** The Harmony 300's product id, the one a Harmony 350 enumerates as too. */
const HARMONY_300_350 = 0xc124;

const SYSINFO = 'arch 0x11\nskin 0x63\nusb_product_id 0xc12b\nfw_ver 4.15.330\n';

const open = (path: string, mode: string, size?: number): Uint8Array => {
  const params: FileParam[] = [{ kind: 'string', value: path }, { kind: 'string', value: mode }];
  if (size !== undefined) params.push({ kind: 'dword', value: size });
  return encodeFileRequest(FILE_OPEN, params);
};

describe('the guard opens /tde/powerstate for reading on a Touch alone', () => {
  it('holds one product with one name, and the family wide list does not hold it', () => {
    assert.deepEqual([...INERT_PATHS_OF_PRODUCT], [[0xc12b, ['/tde/powerstate']]]);
    assert.equal(TOUCH_PRODUCT_ID, 0xc12b);
    assert.equal(TOUCH_POWER_PATH, '/tde/powerstate');
    // Not on the family's list, so a Harmony 300 or 350 is not given it by that route either.
    assert.ok(!INERT_PATHS.includes('/tde/powerstate'));
  });

  it('passes the open with mode R on a transport opened on the Touch\'s product id', async () => {
    const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
    const guarded = guardFileProtocol(remote, TOUCH_PRODUCT_ID);
    assert.equal(guardedProduct(guarded), TOUCH_PRODUCT_ID);
    await guarded.write(open('/tde/powerstate', 'R'));
    assert.deepEqual(remote.opened, ['/tde/powerstate R']);
  });

  it('refuses it on the Harmony 300 and 350\'s product id and on a transport whose product it was not told', async () => {
    // The door is shut in this process, so the refusals are the allowance's and not the door's.
    assert.notEqual(process.env['HARMONY_FILE_PATH_EXPERIMENT'], '1');
    for (const product of [HARMONY_300_350, undefined]) {
      const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
      const guarded = guardFileProtocol(remote, product);
      await assert.rejects(() => guarded.write(open('/tde/powerstate', 'R')), /refusing to open \/tde\/powerstate: on this protocol a path can be an action/);
      assert.deepEqual(remote.sent, [], `nothing reached the remote on product ${String(product)}`);
    }
    // The control: on the same two transports a name of the family's list still opens, so the refusal is this name's.
    const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
    await guardFileProtocol(remote, HARMONY_300_350).write(open('/sys/sysinfo', 'R'));
    assert.equal(remote.sent.length, 1);
  });
});

describe('/tde/powerstate stays refused for writing on every route', () => {
  it('is refused by the guard in every mode but R on a Touch', async () => {
    for (const [mode, size] of [['W', 4], ['W', undefined], ['C', undefined], ['RW', undefined], ['WR', undefined], ['RC', undefined]] as const) {
      const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
      const guarded = guardFileProtocol(remote, TOUCH_PRODUCT_ID);
      await assert.rejects(() => guarded.write(open('/tde/powerstate', mode, size)), TransportError, mode);
      assert.deepEqual(remote.sent, [], mode);
    }
  });

  it('is on neither write route\'s list, and neither route\'s allow list takes an open of it for writing', () => {
    assert.ok(!FILE_WRITE_PATHS.includes('/tde/powerstate'));
    assert.equal(onTheFileWriteRoute(open('/tde/powerstate', 'W', 4)), false);
    assert.equal(onTheTouchRequestRoute(open('/tde/powerstate', 'W'), 'idle'), undefined);
    assert.equal(onTheTouchRequestRoute(open('/tde/powerstate', 'W', 4), 'idle'), undefined);
    // The controls: each route takes its own path in the same shape, so a refusal above is the path's.
    assert.equal(onTheFileWriteRoute(open('/cfg/usercfg', 'W', 4)), true);
    assert.equal(onTheTouchRequestRoute(open('/sys/hlapi', 'W'), 'idle'), 'open');
  });

  it('is refused authorised, with every write flag, the request and recovery flags and the path door set', () => {
    const here = fileURLToPath(new URL('.', import.meta.url));
    const path = (relative: string): string => join(here, relative).replaceAll('\\', '/');
    const out = execFileSync(process.execPath, ['--input-type=module', '--eval', `
      import * as pipe from '${path('../../src/filepipe.ts')}';
      import { authoriseReport } from '${path('../../src/authorise.ts')}';
      const sent = [];
      const inner = { write: async (r) => { sent.push(r); }, read: async () => undefined, close: async () => {} };
      const guarded = pipe.guardFileProtocol(inner, 0xc12b);
      const open = (path, mode, size) => pipe.encodeFileRequest(pipe.FILE_OPEN, [
        { kind: 'string', value: path }, { kind: 'string', value: mode },
        ...(size === undefined ? [] : [{ kind: 'dword', value: size }])]);
      const outcomes = [];
      for (const report of [open('/tde/powerstate', 'W', 4), open('/tde/powerstate', 'W'), open('/tde/powerstate', 'C')]) {
        authoriseReport(guarded, report);
        try { await guarded.write(report); outcomes.push('sent'); }
        catch (error) { outcomes.push(error.constructor.name); }
      }
      // The control: the request route's own open goes out under the same flags and authorisation.
      const hlapi = open('/sys/hlapi', 'W');
      authoriseReport(guarded, hlapi);
      await guarded.write(hlapi);
      outcomes.push(String(sent.length));
      process.stdout.write(outcomes.join(','));
    `], {
      env: {
        ...process.env, HARMONY_ENABLE_WRITES: '1', HARMONY_FILE_WRITE: '1', HARMONY_TOUCH_REQUESTS: '1',
        HARMONY_TOUCH_RECOVERY: '1', HARMONY_FILE_PATH_EXPERIMENT: '1',
      },
      encoding: 'utf8',
    }).trim();
    assert.equal(out, 'TransportError,TransportError,TransportError,1');
  });
});

describe('reading the power source', () => {
  it('names the five sources the driver knows, in its order', () => {
    assert.deepEqual([...TOUCH_POWER_SOURCES], ['battery', 'cradle', 'wall_adapter', 'usb', 'usb_charge']);
  });

  it('returns the pretend Touch\'s answer trimmed, through ping, open, read and close alone', async () => {
    const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
    const source = await readTouchPowerSource(guardFileProtocol(remote, TOUCH_PRODUCT_ID));
    assert.equal(source, 'usb');
    // The identity file first, for the build, then the name: two whole reads and nothing else.
    const oneRead = [FILE_PING, FILE_OPEN, FILE_READ, FILE_CLOSE];
    assert.deepEqual(remote.sent.map((r) => r[1]), [...oneRead, ...oneRead]);
    assert.deepEqual(remote.opened, ['/sys/sysinfo R', '/tde/powerstate R']);
  });

  it('refuses on a build the name is not read in, having read the identity file and never opened the name', async () => {
    assert.deepEqual([...TOUCH_POWER_READ_ON], ['4.15.330']);
    for (const sysinfo of [SYSINFO.replace('4.15.330', '4.15.250'), SYSINFO.replace('fw_ver 4.15.330\n', '')]) {
      const remote = new FakeTouchRemote({ sysinfo });
      await assert.rejects(
        () => readTouchPowerSource(guardFileProtocol(remote, TOUCH_PRODUCT_ID)),
        /refusing to read \/tde\/powerstate: the remote runs firmware (4\.15\.250|unknown)/,
      );
      assert.deepEqual(remote.opened, ['/sys/sysinfo R']);
    }
    // The control: the listed build, on the same pretend remote, is read.
    const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
    assert.equal(await readTouchPowerSource(guardFileProtocol(remote, TOUCH_PRODUCT_ID)), 'usb');
  });

  it('carries another source and an unexpected text as they came, less the white space around them', async () => {
    const cases: [string, string][] = [['usb_charge\n', 'usb_charge'], [' battery\r\n', 'battery'], ['no such source', 'no such source'], ['', '']];
    for (const [served, read] of cases) {
      const remote = new FakeTouchRemote({ sysinfo: SYSINFO, powerstate: served });
      assert.equal(await readTouchPowerSource(guardFileProtocol(remote, TOUCH_PRODUCT_ID)), read, JSON.stringify(served));
    }
  });

  it('refuses before anything is sent on a transport not opened on the Touch\'s product id', async () => {
    for (const product of [HARMONY_300_350, undefined]) {
      const remote = new FakeTouchRemote({ sysinfo: SYSINFO });
      await assert.rejects(() => readTouchPowerSource(guardFileProtocol(remote, product)), /refusing to read \/tde\/powerstate: it is a Harmony Touch's name/);
      assert.deepEqual(remote.sent, []);
    }
    // And on a transport the guard never saw, a bare one, which would otherwise carry any request.
    const bare = new FakeTouchRemote({ sysinfo: SYSINFO });
    await assert.rejects(() => readTouchPowerSource(bare), /not opened on a known product/);
    assert.deepEqual(bare.sent, []);
  });
});
