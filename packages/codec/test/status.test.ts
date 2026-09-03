/**
 * The firmware's own status screens, which is what a Harmony says when it is not showing a
 * configuration. `docs/findings.md` section 244.
 *
 * The question came off the bench: after a write the spare Harmony One showed a message about going
 * to the website, which had been written up as the remote calling itself unprogrammed. It says no
 * such thing. The message is one entry in a table of status screens the firmware ships, and the same
 * table has separate entries for an invalid configuration and a corrupted one, so a remote showing
 * this one is not complaining about its configuration at all.
 *
 * **Strings are asserted here, against this repository's habit, and the reason is whose they are.**
 * `text.test.ts` refuses to assert a decoded string because a configuration's strings are its
 * owner's own equipment names. These five containers hold no equipment: they are Logitech's own
 * firmware messages, three of them extracted from the vendor's firmware packages rather than off
 * anybody's remote, and naming them is the whole finding. Only five of the 35 are quoted even so,
 * and the rest are held by comparison between containers.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, skipWithoutLab, require_ } from '@harmony/lab';
import { bitmapReference, parse, pictureReference, screenProgram, screenStrings } from '../src/index.ts';

/** The status containers, by architecture, and where each one came from. */
const ARCH12 = ['one_safemode', 'one34_region2'];
const ARCH14 = ['h700_gspm', 'h600_safemode_gspm', 'h650_safemode_gspm'];
const SAMPLES = [...ARCH12, ...ARCH14];

/** The Harmony One's first screen, which is the message that prompted the whole question. */
const THE_MESSAGE = 'Go to Website to update settings';
/** The two the table keeps separate from it, which is what makes the reading above measurable. */
const INVALID = 'Invalid Configuration';
const CORRUPTED = 'Configuration Corrupted';
/** The other screen seen that afternoon, whose capitals are not the application's own spelling. */
const CONNECTED = 'USB CONNECTED';
/** What arch 14 has and arch 12 does not, in its own order. */
const ARCH14_EXTRA = [
  'Update Successful',
  'Upgrade Successful',
  'Update in progress...',
  'Learning...',
  'Firmware upgrade in progress...',
];

/**
 * One string per status screen, in the order the container stores them.
 *
 * A screen is several draws of one program, so the draws are grouped by program and joined; the
 * programs are then ordered by address, which is the order the two architectures agree in. Ordering
 * by the page list instead would need two readings, since arch 12 lists a wrapper and its text
 * program as two entries while arch 14 lists one program twice.
 */
function statusPrograms(name: string): Map<number, string> {
  const container = parse(load(name)!);
  const byProgram = new Map<number, string[]>();
  for (const drawn of screenStrings(container) as Array<{ program: number; text: string }>) {
    const lines = byProgram.get(drawn.program);
    if (lines === undefined) byProgram.set(drawn.program, [drawn.text.trim()]);
    else lines.push(drawn.text.trim());
  }
  return new Map([...byProgram.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([at, lines]) => [at, lines.join(' ')]));
}

function statusScreens(name: string): string[] {
  const container = parse(load(name)!);
  const byProgram = new Map<number, string[]>();
  for (const drawn of screenStrings(container) as Array<{ program: number; text: string }>) {
    const lines = byProgram.get(drawn.program);
    if (lines === undefined) byProgram.set(drawn.program, [drawn.text.trim()]);
    else lines.push(drawn.text.trim());
  }
  return [...byProgram.keys()].sort((a, b) => a - b).map((at) => byProgram.get(at)!.join(' '));
}

test('a Harmony One ships thirty status screens and an arch 14 remote thirty five', skipWithoutLab(), () => {
  for (const sample of SAMPLES) require_(sample);
  for (const name of ARCH12) assert.equal(statusScreens(name).length, 30, name);
  for (const name of ARCH14) assert.equal(statusScreens(name).length, 35, name);
});

test('the two Harmony One images hold the same table, and the three arch 14 images do too', skipWithoutLab(), () => {
  for (const sample of SAMPLES) require_(sample);
  // The closure that makes the table a fact about the firmware rather than about one read: one arch
  // 12 container was read off a remote's own flash and the other came out of Logitech's firmware
  // package, and the three arch 14 ones are two models plus a package.
  const [one, region2] = ARCH12.map(statusScreens);
  assert.deepEqual(one, region2);
  const [h700, ...others] = ARCH14.map(statusScreens);
  for (const other of others) assert.deepEqual(other, h700);
});

test("the Harmony One's screens are the arch 14 table with its first five removed", skipWithoutLab(), () => {
  for (const sample of SAMPLES) require_(sample);
  const one = statusScreens('one_safemode');
  const h700 = statusScreens('h700_gspm');
  assert.deepEqual(h700.slice(0, 5), ARCH14_EXTRA);
  assert.deepEqual(one, h700.slice(5), 'the shared thirty, in the same order');
});

test('the message that prompted this is the first screen and mentions no configuration', skipWithoutLab(), () => {
  for (const sample of SAMPLES) require_(sample);
  const one = statusScreens('one_safemode');
  assert.equal(one[0], THE_MESSAGE);
  // The negative that carries the finding: the table can say a configuration is wrong, in two
  // different ways, and the screen the remote showed is neither of them.
  assert.ok(one.includes(INVALID), 'the table can report an invalid configuration');
  assert.ok(one.includes(CORRUPTED), 'and a corrupted one, separately');
  assert.notEqual(THE_MESSAGE, INVALID);
  assert.notEqual(THE_MESSAGE, CORRUPTED);
  // And on arch 14 the same message is not first, so its position is not what selects it.
  assert.equal(statusScreens('h700_gspm').indexOf(THE_MESSAGE), 5);
});

test('the USB screen is one of these too, in capitals the firmware does not use', skipWithoutLab(), () => {
  for (const sample of SAMPLES) require_(sample);
  // Both screens seen on the spare that afternoon come from this table, which is why they are read
  // together. The application image carries its own "USB Connected" in four languages, spelled in
  // title case, so the capitals distinguish which of the two was on the screen.
  const one = statusScreens('one_safemode');
  assert.ok(one.includes(CONNECTED));
  assert.equal(one.filter((s) => s.toLowerCase().includes('usb')).length, 2,
    'this one and the initialisation screen');
});

test('a status screen is text and nothing else, which is what the icon distinguishes', skipWithoutLab(), () => {
  for (const sample of SAMPLES) require_(sample);
  // Danny described two screens on the spare that afternoon: the one it shows now with the cable in,
  // "USB Connected" with an icon, and the one it showed after a write, "USB CONNECTED" with no
  // image. Neither description is worth anything unless the two screens differ measurably, and they
  // do: no status screen in any of these containers draws a bitmap or a picture, so an icon on the
  // screen means the application is drawing its own and not one of these.
  for (const name of SAMPLES) {
    const container = parse(load(name)!);
    for (const [at, text] of statusPrograms(name)) {
      const drawn = screenProgram(container, at) ?? [];
      const art = drawn.filter((i) =>
        bitmapReference(i) !== undefined || pictureReference(i) !== undefined);
      assert.equal(art.length, 0, `${name}: '${text}' draws ${art.length} image(s)`);
    }
  }
});
