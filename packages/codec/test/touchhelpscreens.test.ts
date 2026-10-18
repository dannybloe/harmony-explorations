/**
 * The Harmony One's power off help built from a description, `todo-compile-one.md` 4.6, findings section 415: the
 * screens Help runs while nothing is on, the attempt screen, the "If not" question and four questions per device,
 * built so that a configuration of ours can carry them as Logitech's does.
 *
 * **The blind control makes "generated" a test**, as sections 409 to 414 did: every byte of the screens the
 * description does not read is overwritten, in the file the description reads and the fonts are spelled from and
 * in the layout's own pieces, and the sixteen still come back byte for byte. The description still finds its way
 * through the container itself, which tag is where and how long a list is, and the modes and the chain's order
 * through the lists that link the screens. The devices' names are the one description value that is words, read
 * off each device's first question through the blinded reader, so those glyph codes count as read.
 *
 * Every figure is exact, and the populations are literals in this file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { require_, skipUnless } from '@harmony/lab';
import {
  type Container, type ContainerPiece, SCREEN_CALL, SCREEN_SELECT_FONT, SCREEN_TEXT_AT, SCREEN_TEXT_INLINE, ScreenRecordError,
  characterMap, decode, layOutContainer, modeRecords, parse, screenProgram, stateVariables, taggedList, takeApart, timers,
} from '../src/index.ts';
import { buildTemplateScreens, centred, font, wrapLines } from '../src/families/touch/screentemplate.ts';
import {
  ATTEMPT_LINE, HELP_FIXED_ROWS, HELP_TITLE, NO, QUESTION_WIDTH, YES, buildTouchHelpScreens, checkTouchHelpScreens, describeTouchHelpScreens,
  helpNumbering, helpScreens, numberedHelpScreens, touchHelpScreenModes, withTouchHelpChain, withTouchHelpScreens,
} from '../src/families/touch/helpscreens.ts';
import { speller, textGlyphs } from '../src/shared/spelling.ts';
import { listsBelow } from './screenlists.ts';
import { TOUCH } from '../src/families/touch/index.ts';

test('todo-compile-one 3.2.2.4: on the test setup\'s donor lettered in ours the attempt line, 177 pixels, breaks in two by the questions\' wrap at 171 and the "If not" paragraph flows onto three lines of its own, each block centred again, where the engine refused the attempt line, which would start at x -1',
     skipUnless('harvest_one_two_devices'), () => {
  // As `composeSetup` letters the donor before anything is composed, section 415.
  const lettered = parse(TOUCH.composedLook!.letterDonor(parse(require_('harvest_one_two_devices')), TOUCH.choices).bytes);
  const d = describeTouchHelpScreens(lettered, takeApart(lettered));
  const spell = speller(lettered);
  assert.equal(spell(d.spec.fonts.body, ATTEMPT_LINE).width, 177);
  const lines = HELP_FIXED_ROWS.map((row) => wrapLines(row, QUESTION_WIDTH, (line) => spell(d.spec.fonts.body, line).width));
  assert.deepEqual(lines, OURS);
  // Built in place: one line more, the attempt line's second, drawn inline, three bytes (the paragraph keeps its
  // three lines); and the result reads as a chain and rebuilds from its own description, its lines found by their words.
  const out = withTouchHelpChain(lettered);
  assert.equal(out.blob.length - lettered.blob.length, 3);
  const [attempt, ifNot] = touchHelpScreenModes(out).modes as [number, number];
  const drawn = (mode: number): string[] => textsOf(out, mode).filter((one) => one.word !== HELP_TITLE).map((one) => `${one.word} ${one.x},${one.y}`);
  assert.deepEqual(drawn(attempt), [
    'Attemping to fix the 29,37', 'problem... 59,49', 'Keep the remote pointed to 9,162', 'your system. 50,174',
  ]);
  assert.deepEqual(drawn(ifNot).slice(0, 4), IF_NOT_DRAWN);
  assert.deepEqual(checkTouchHelpScreens(out), { devices: 2, screens: 10, lists: 76, described: 660, structure: 2201 });
  // The engine still refuses a text that would start off the screen, for every builder through it: a line centred
  // on the screen and wider than it, which the help screens no longer draw unwrapped.
  const screen = { name: 'Too Wide', own: [], chrome: [], pages: [{ list: [], parts: [font('body'), centred(`${ATTEMPT_LINE} and more`, 100)] }] };
  assert.throws(() => buildTemplateScreens(lettered, { fonts: { body: d.spec.fonts.body }, screens: [{ mode: 0, leads: [0], pictures: [], numbers: [] }], homes: new Map() }, [screen]),
    (error: Error) => error instanceof ScreenRecordError && /'Attemping to fix the problem\.\.\. and more' is \d+ pixels wide and would start at x -\d+, off the screen/.test(error.message));
  // And the wrap refuses a piece of a question wider than 171 on its own, which no compile shows broken.
  const long = { ...d.spec, devices: d.spec.devices.map((one, i) => (i === 0 ? { ...one, name: 'Supercalifragilisticexpialidocious' } : one)) };
  assert.throws(() => buildTouchHelpScreens(lettered, long),
    (error: Error) => error instanceof ScreenRecordError && /'Supercalifragilisticexpialidocious' is wider than 171 pixels on its own/.test(error.message));
});

/** The first offset two files differ at, or undefined where they are the same. */
function firstDifference(a: Uint8Array, b: Uint8Array): number | undefined {
  const length = Math.max(a.length, b.length);
  for (let at = 0; at < length; at += 1) if (a[at] !== b[at]) return at;
  return undefined;
}

/**
 * The sixteen English compiles of skin 54, section 405, with what the check returns on each: the devices the
 * chain asks about, the screens (4n + 2, or the two of a household with none) and their lists, the bytes the
 * description reads and the screens' bytes.
 */
const SKIN_54: Readonly<Record<string, { devices: number; screens: number; lists: number; described: number; structure: number }>> = {
  harvest_one_two_devices: { devices: 2, screens: 10, lists: 76, described: 660, structure: 2198 },
  one_spare_after_sync: { devices: 1, screens: 6, lists: 44, described: 569, structure: 1220 },
  one_spare_myharmony: { devices: 4, screens: 18, lists: 140, described: 1466, structure: 3593 },
  one_spare_20260830: { devices: 5, screens: 22, lists: 172, described: 1765, structure: 4413 },
  calibration_one: { devices: 3, screens: 14, lists: 108, described: 1218, structure: 2860 },
  calibration_favchannels: { devices: 3, screens: 14, lists: 108, described: 1218, structure: 2860 },
  calibration_favzero: { devices: 5, screens: 22, lists: 172, described: 1765, structure: 4413 },
  compiled_protocols: { devices: 14, screens: 58, lists: 460, described: 4068, structure: 11925 },
  compiled_protocols_2: { devices: 14, screens: 58, lists: 460, described: 4145, structure: 11870 },
  compiled_protocols_3: { devices: 8, screens: 34, lists: 268, described: 2680, structure: 6940 },
  harvest_one_families_1: { devices: 0, screens: 2, lists: 9, described: 81, structure: 359 },
  harvest_one_families_2: { devices: 2, screens: 10, lists: 76, described: 715, structure: 2209 },
  harvest_one_families_3: { devices: 4, screens: 18, lists: 140, described: 1440, structure: 3891 },
  one_friend_legacy_sync_config: { devices: 3, screens: 14, lists: 108, described: 1205, structure: 2838 },
  phase7_before: { devices: 3, screens: 14, lists: 108, described: 1218, structure: 2860 },
  phase7_after: { devices: 4, screens: 18, lists: 140, described: 1520, structure: 3684 },
};
const SIXTEEN = Object.keys(SKIN_54);
/** The two European compiles of skin 59, the factory file and the everyday One's, and the Dutch one. */
const EUROPEAN: Readonly<Record<string, { devices: number; screens: number; lists: number; described: number; structure: number }>> = {
  one_config: { devices: 4, screens: 18, lists: 140, described: 1466, structure: 3593 },
  one_config_unprogrammed: { devices: 1, screens: 6, lists: 44, described: 590, structure: 1177 },
};
const DUTCH = 'one_friend_asfound_config';

/** The lines `HELP_FIXED_ROWS` are drawn in on every English compile, which the wrap at 171 has to give back. */
const LOGITECH = [
  [ATTEMPT_LINE], ['Keep the remote pointed to', 'your system.'], ['Did that fix the problem?'],
  ['If not, the remote will ask you', 'questions to help correct the', 'problem.'], ['Nothing to do'],
];
/** The same rows wrapped in our letters, the test setup's donor lettered in ours. */
const OURS = [
  ['Attemping to fix the', 'problem...'], ['Keep the remote pointed to', 'your system.'], ['Did that fix the problem?'],
  ['If not, the remote will ask', 'you questions to help correct', 'the problem.'], ['Nothing to do'],
];
/** The "If not" question in ours: the paragraph's three lines in a block of five rows on y 143, the second blank. */
const IF_NOT_DRAWN = ['Did that fix the problem? 16,119', 'If not, the remote will ask 13,143', 'you questions to help correct 4,155', 'the problem. 51,167'];
const ENGLISH = [...SIXTEEN, ...Object.keys(EUROPEAN)];

test('todo-compile-one 3.2.2.4: the power off help\'s own words wrapped at the questions\' 171 pixels in Logitech\'s letters give Logitech\'s own lines on all eighteen English compiles, each paragraph flowed as one, the attempt line one line at 170, the widest; and each compile rebuilds byte for byte',
     skipUnless(...ENGLISH), () => {
  let widest = 0;
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const body = describeTouchHelpScreens(c, takeApart(c)).spec.fonts.body;
    const spell = speller(c);
    const width = (line: string): number => spell(body, line).width;
    const lines = HELP_FIXED_ROWS.map((row) => wrapLines(row, QUESTION_WIDTH, width));
    assert.deepEqual(lines, LOGITECH, name);
    widest = Math.max(widest, ...lines.flat().map(width));
    // The rebuild through the wrapped blocks is held to the compile byte for byte.
    checkTouchHelpScreens(c);
  }
  assert.equal(widest, 170);
});

test('todo-compile-one 3.2.2.4: on every English compile with a device the chain\'s numbers read by role give back the description\'s, each role one value throughout, which is what numbers a composed device\'s questions; a role held two ways is refused',
     skipUnless(...ENGLISH), () => {
  let chains = 0;
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const d = describeTouchHelpScreens(c, takeApart(c));
    if (d.spec.devices.length === 0) {
      assert.throws(() => helpNumbering(d), (error: Error) => error instanceof ScreenRecordError && /asks about no device/.test(error.message), name);
      continue;
    }
    const { roles, own } = helpNumbering(d);
    assert.deepEqual(numberedHelpScreens(helpScreens(d.spec.devices), roles, own), d.spec.screens.map((one) => one.numbers), name);
    chains += 1;
  }
  assert.equal(chains, 17);
  // The donor's "If not" question made to start another question timer on entering than it cancels on leaving.
  const c = parse(require_('harvest_one_two_devices'));
  const d = describeTouchHelpScreens(c, takeApart(c));
  const ifNot = d.spec.screens[1]!;
  const moved = { ...d, spec: { ...d.spec, screens: d.spec.screens.map((one, s) => (s === 1 ? { ...ifNot, numbers: ifNot.numbers.map((v, k) => (k === 3 ? v + 1 : v)) } : one)) } };
  assert.throws(() => helpNumbering(moved),
    (error: Error) => error instanceof ScreenRecordError && /^Help If Not holds 18 as its question timer where the chain's other screens hold 19$/.test(error.message));
});

test('todo-compile-one 4.6: the power off help of the sixteen English compiles of skin 54 is rebuilt byte for byte from a description, 4n + 2 screens for n devices and the two of the household with none, 332 screens and 2589 lists over the sixteen',
     skipUnless(...SIXTEEN), () => {
  const totals = { devices: 0, screens: 0, lists: 0 };
  for (const name of SIXTEEN) {
    const got = checkTouchHelpScreens(parse(require_(name)));
    assert.deepEqual(got, SKIN_54[name], name);
    assert.equal(got.screens, got.devices === 0 ? 2 : 4 * got.devices + 2, name);
    totals.devices += got.devices;
    totals.screens += got.screens;
    totals.lists += got.lists;
  }
  assert.deepEqual(totals, { devices: 75, screens: 332, lists: 2589 });
});

test('todo-compile-one 4.6: beyond the sixteen, both European compiles rebuild the same way, and the Dutch compile is refused, its attempt screen drawing other words',
     skipUnless(...Object.keys(EUROPEAN), DUTCH), () => {
  for (const [name, want] of Object.entries(EUROPEAN)) assert.deepEqual(checkTouchHelpScreens(parse(require_(name))), want, name);
  // No language branch: the attempt screen is found by its English words, and the Dutch compile draws its own.
  assert.throws(() => checkTouchHelpScreens(parse(require_(DUTCH))),
    (error: Error) => error instanceof ScreenRecordError && /holds 0 power off attempt screens, not one/.test(error.message));
});

/** Every text a mode's page and chrome draw, in order, with its font and its width in that font. */
function textsOf(c: Container, mode: number): { word: string; x: number; y: number; font: number; width: number; inline: boolean }[] {
  const map = characterMap(c);
  if (map === undefined) throw new Error('no character map');
  const spell = speller(c);
  const page = modeRecords(c)?.[mode]?.pages[0];
  if (page === undefined) throw new Error(`mode ${mode} has no page`);
  const program = screenProgram(c, page.program) ?? [];
  const call = program.find((one) => one.opcode === SCREEN_CALL);
  const out: { word: string; x: number; y: number; font: number; width: number; inline: boolean }[] = [];
  for (const one of [...(screenProgram(c, call?.targets[0] as number) ?? []), ...program]) {
    // The chrome selects its own font, so each program's selections are followed in order.
    if (one.opcode === SCREEN_SELECT_FONT) out.push({ word: '', x: -1, y: -1, font: one.operands[0] as number, width: 0, inline: false });
    if (one.opcode !== SCREEN_TEXT_AT && one.opcode !== SCREEN_TEXT_INLINE) continue;
    const word = decode(textGlyphs(c, one) as Uint8Array, map);
    const font = [...out].reverse().find((t) => t.x === -1)?.font as number;
    out.push({ word, x: one.operands[0] as number, y: one.operands[1] as number, font, width: spell(font, word).width, inline: one.opcode === SCREEN_TEXT_INLINE });
  }
  return out.filter((t) => t.x !== -1);
}

test('todo-compile-one 4.6: every text of the power off help sits by the rules on all eighteen English compiles: the title at 6, 4 twice, questions centred rounded down in a block centred on y 143, "Yes" and "No" on the halves at y 201, the attempt\'s first line at y 43 and its other two centred on y 168',
     skipUnless(...ENGLISH), () => {
  let texts = 0;
  let odd = 0;
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    for (const mode of touchHelpScreenModes(c).modes) {
      const all = textsOf(c, mode);
      const title = all.filter((t) => t.y === 4);
      assert.deepEqual(title.map((t) => `${t.word} ${t.x}`), [`${HELP_TITLE} 6`, `${HELP_TITLE} 6`], `${name} mode ${mode}`);
      const body = all.filter((t) => t.y !== 4 && t.y !== 201);
      const keys = all.filter((t) => t.y === 201);
      // The keys' words centred on their half: "Yes" on the left and "No" on the right, "OK" alone on the right.
      for (const key of keys) {
        const left = key.word === 'Yes' ? 0 : 88;
        assert.equal(key.x, left + Math.floor((88 - key.width) / 2), `${name} mode ${mode}: ${key.word}`);
      }
      const centredX = (t: { width: number }) => Math.floor((176 - t.width) / 2);
      if (body[0]?.word === ATTEMPT_LINE) {
        assert.deepEqual(body.map((t) => [t.x, t.y]), [[centredX(body[0]), 43], [centredX(body[1]!), 162], [centredX(body[2]!), 174]], `${name} mode ${mode}`);
      } else if (body.length === 4) {
        // The "If not" question, a block of five rows centred on y 143 with its second row blank.
        assert.deepEqual(body.map((t) => [t.x, t.y]), body.map((t, r) => [centredX(t), [119, 143, 155, 167][r]]), `${name} mode ${mode}`);
      } else {
        assert.deepEqual(body.map((t) => [t.x, t.y]), body.map((t, r) => [centredX(t), 143 - 6 * (body.length - 1) + 12 * r]), `${name} mode ${mode}`);
      }
      texts += all.length;
      odd += body.filter((t) => (176 - t.width) % 2 === 1).length;
    }
  }
  // 1907 texts over the eighteen; the 316 lines with an odd remainder tell rounding down from rounding up.
  assert.deepEqual({ texts, odd }, { texts: 1907, odd: 316 });
});

/**
 * Every help question of a compile asking whether a device is on, off or set to an input, the power off help's
 * and every activity's: its drawn lines in the order drawn, and its font.
 */
function questions(c: Container): { lines: string[]; font: number }[] {
  const map = characterMap(c);
  if (map === undefined) throw new Error('no character map');
  const out: { lines: string[]; font: number }[] = [];
  for (const record of modeRecords(c) ?? []) {
    if (record.pages.length !== 1) continue;
    let font = -1;
    const lines: { word: string; font: number; y: number }[] = [];
    for (const one of screenProgram(c, (record.pages[0] as { program: number }).program) ?? []) {
      if (one.opcode === SCREEN_SELECT_FONT) font = one.operands[0] as number;
      const glyphs = textGlyphs(c, one);
      if (glyphs !== undefined) lines.push({ word: decode(glyphs, map), font, y: one.operands[1] as number });
    }
    // The question's lines are the ones between the title and the keys' words, in the question's font.
    const asked = lines.filter((one) => one.y > 100 && one.y < 190);
    if (asked.length === 0 || !/^(Now is|Is) the /.test(asked[0]!.word) || asked.some((one) => one.font !== asked[0]!.font)) continue;
    out.push({ lines: asked.map((one) => one.word), font: asked[0]!.font });
  }
  return out;
}

test('todo-compile-one 4.6: every help question of the eighteen English compiles, on, off or an input, the power off help\'s and every activity\'s, breaks into the lines drawn by one greedy wrap at 171 pixels, at spaces and after hyphens; 171 is the widest line drawn and 172 the narrowest a next piece makes',
     skipUnless(...ENGLISH), () => {
  let all = 0;
  let wrapped = 0;
  let widest = 0;
  let narrowestOver = Infinity;
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const spell = speller(c);
    for (const { lines, font } of questions(c)) {
      const width = (line: string): number => spell(font, line).width;
      // The question as one text: a line after one ending in a hyphen joins without a space.
      const whole = lines.reduce((sum, line) => (sum === '' ? line : sum + (sum.endsWith('-') ? '' : ' ') + line), '');
      assert.deepEqual(wrapLines(whole, QUESTION_WIDTH, width), lines, `${name}: ${whole}`);
      all += 1;
      if (lines.length > 1) wrapped += 1;
      for (const line of lines) widest = Math.max(widest, width(line));
      lines.slice(1).forEach((line, k) => {
        const before = lines[k] as string;
        const next = (/^[^ -]*-?/.exec(line) as RegExpExecArray)[0];
        narrowestOver = Math.min(narrowestOver, width(before.endsWith('-') ? before + next : `${before} ${next}`));
      });
    }
  }
  assert.deepEqual({ all, wrapped, widest, narrowestOver }, { all: 957, wrapped: 426, widest: 171, narrowestOver: 172 });
});

test('todo-compile-one 4.6: on the eighteen English compiles the attempt screen resends the power off lists of exactly the devices whose first question resends them, in the chain\'s order, and every screen titled "PowerOff" is in the chain',
     skipUnless(...ENGLISH), () => {
  const totals = { devices: 0, resent: 0, twoLists: 0 };
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const { modes, firsts } = touchHelpScreenModes(c);
    const records = modeRecords(c) ?? [];
    const lists = c.actionLists() ?? [];
    const calls = (mode: number, tag: number, own: boolean): number[] => {
      const entries = own ? records[mode]?.entries : taggedList(c, records[mode]?.pages[0]?.list as number)?.entries;
      const entry = entries?.find((one) => one.tag === tag);
      return (lists[entry?.operand as number] ?? []).filter((one) => one.opcode === 0x7f).map((one) => one.operand);
    };
    // The attempt screen's enter list's calls, against the resent devices' No lists, in the chain's order.
    const resent = firsts.filter((one) => one.resend).flatMap((one) => calls(one.mode, NO, false));
    assert.deepEqual(calls(modes[0] as number, 0x06, true), resent, name);
    totals.devices += firsts.length;
    totals.resent += firsts.filter((one) => one.resend).length;
    totals.twoLists += firsts.filter((one) => one.offLists === 2).length;
    // Yes on a device's first question runs no list: it goes on, or leaves help.
    for (const one of firsts) assert.deepEqual(calls(one.mode, YES, false), [], `${name} mode ${one.mode}`);
  }
  assert.deepEqual(totals, { devices: 80, resent: 39, twoLists: 1 });
});

test('todo-compile-one 4.6: of the 80 chain entries of the eighteen English compiles, the 34 whose power is a toggle are not resent unasked and the 39 discrete ones are, and the PS3, discrete, is not, on all seven compiles that hold it',
     skipUnless(...ENGLISH), () => {
  // Per entry: its power variable is the one whose change to off sends the codes (0x7D) its power off lists send,
  // and a toggle is a variable whose change to on sends those same codes. Two places, so the reading is checked
  // against the configuration's state table and not against the lists it was read from.
  const tally: Record<string, number> = {};
  const exceptions: string[] = [];
  let ps3 = 0;
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const lists = c.actionLists() ?? [];
    const sends = (opcode: number, operand: number, depth = 0): number[] => {
      if (opcode === 0x7d) return [operand];
      if (opcode === 0x7f && depth < 4) return (lists[operand] ?? []).flatMap((one) => sends(one.opcode, one.operand, depth + 1));
      return [];
    };
    const records = modeRecords(c) ?? [];
    const powers = stateVariables(c).filter((one) => /_Power$/.test(one.label) && one.record !== undefined);
    const d = describeTouchHelpScreens(c, takeApart(c));
    touchHelpScreenModes(c).firsts.forEach((first, i) => {
      const no = taggedList(c, records[first.mode]?.pages[0]?.list as number)?.entries.find((one) => one.tag === NO);
      const off = (lists[no?.operand as number] ?? []).filter((one) => one.opcode === 0x7f).flatMap((one) => sends(0x7f, one.operand));
      let kind = 'no power variable';
      for (const power of powers) {
        const values = power.record?.values ?? [];
        const toOff = values.filter((v) => v.to === 0).flatMap((v) => sends(v.opcode, v.operand));
        const toOn = values.filter((v) => v.to === 1).flatMap((v) => sends(v.opcode, v.operand));
        if (toOff.length === 0 || toOff.join() !== off.join()) continue;
        kind = toOn.join() === toOff.join() ? 'toggle' : 'discrete';
        break;
      }
      const key = `${first.resend ? 'resent' : 'not resent'} ${kind}`;
      tally[key] = (tally[key] ?? 0) + 1;
      if (key === 'not resent discrete') exceptions.push(d.spec.devices[i]!.name);
      if (d.spec.devices[i]!.name === 'PS3') ps3 += 1;
    });
  }
  assert.deepEqual(tally, { 'resent discrete': 39, 'not resent toggle': 34, 'not resent discrete': 7 });
  // Every exception is the PS3, and every PS3 entry is an exception: seven of seven.
  assert.deepEqual(new Set(exceptions), new Set(['PS3']));
  assert.equal(ps3, 7);
});

test('todo-compile-one 4.6: with no device in the chain, harvest_one_families_1, "Nothing to do" is entered by one list, the instruction of a three second timer the attempt screen starts first',
     skipUnless('harvest_one_families_1'), () => {
  const c = parse(require_('harvest_one_families_1'));
  const [attempt, nothing] = touchHelpScreenModes(c).modes as [number, number];
  const lists = c.actionLists() ?? [];
  const entering = lists.flatMap((list, index) => (list.some((one) => one.opcode === 0x7e && one.operand === nothing) ? [index] : []));
  assert.equal(entering.length, 1);
  const records = timers(c)?.records ?? [];
  const timer = records.findIndex((one) => one.instruction.opcode === 0x7f && one.instruction.operand === entering[0]);
  assert.equal(records[timer]?.duration, 3);
  // The attempt screen's enter list starts that timer first: `1F EB` and the timer's number.
  const enter = records.length === 0 ? undefined : (modeRecords(c)?.[attempt]?.entries ?? []).find((one) => one.tag === 0x06);
  assert.deepEqual((lists[enter?.operand as number] ?? [])[0], { opcode: 0x1f, operand: 0xeb00 | timer });
});

test('todo-compile-one 4.6: a blinded input rebuilds all sixteen: no byte of the screens outside the description reaches the build',
     skipUnless(...SIXTEEN), () => {
  const totals = { structure: 0, inside: 0, outside: 0, blinded: 0 };
  for (const name of SIXTEEN) {
    const c = parse(require_(name));
    const first = describeTouchHelpScreens(c, takeApart(c));
    totals.structure += first.structure.size;
    for (const at of first.described) totals[first.structure.has(at) ? 'inside' : 'outside'] += 1;
    const blinded = c.blob.slice();
    for (const at of first.structure) {
      if (first.described.has(at)) continue;
      blinded[at] = (blinded[at] as number) ^ 0xff;
      totals.blinded += 1;
    }
    const layout = takeApart(c);
    const laid = layOutContainer(layout);
    const pieces = [layout.keyTable, ...layout.body,
      ...layout.sections.flatMap((s) => (s === undefined ? [] : [...s.before, ...s.head])), ...layout.pictures];
    const starts = pieces.map((piece) => ({ piece, at: laid.offsetOf(piece) as number })).sort((a, b) => a.at - b.at);
    const d = describeTouchHelpScreens(c, layout, (at) => blinded[at] as number);
    assert.deepEqual([...d.described].sort((a, b) => a - b), [...first.described].sort((a, b) => a - b), `${name}: reads`);
    assert.deepEqual(d.spec.devices, first.spec.devices, `${name}: devices`);
    let k = 0;
    for (const at of [...first.structure].sort((a, b) => a - b)) {
      if (first.described.has(at)) continue;
      while (k + 1 < starts.length && (starts[k + 1] as (typeof starts)[number]).at <= at) k += 1;
      const one = starts[k] as { piece: ContainerPiece; at: number };
      one.piece.bytes[at - one.at] = blinded[at] as number;
    }
    const out = layOutContainer(withTouchHelpScreens(layout, buildTouchHelpScreens(parse(blinded), d.spec), d.place)).bytes;
    assert.equal(firstDifference(out, c.blob), undefined, `${name} differs`);
  }
  assert.deepEqual(totals, { structure: 68133, inside: 23702, outside: 2031, blinded: 44431 });
});

test('todo-compile-one 4.6: a description with a name changed, two devices swapped, a device\'s resend or list count changed, no device sent unasked, a timer moved, a list moved, the two fonts swapped or two screens\' modes swapped is refused, by the builder or the byte comparison',
     skipUnless('harvest_one_two_devices'), () => {
  const c = parse(require_('harvest_one_two_devices'));
  type Spec = ReturnType<typeof describeTouchHelpScreens>['spec'];
  const tamper = (change: (spec: Spec) => void): void => {
    const layout = takeApart(c);
    const d = describeTouchHelpScreens(c, layout);
    change(d.spec);
    const out = layOutContainer(withTouchHelpScreens(layout, buildTouchHelpScreens(c, d.spec), d.place)).bytes;
    if (firstDifference(out, c.blob) !== undefined) throw new ScreenRecordError('the rebuilt file differs');
  };
  tamper(() => undefined);
  const moved = /the rebuilt file differs/;
  // The chain asks about the Denon first and the LG second; a name one letter different respells its questions.
  assert.throws(() => tamper((spec) => { spec.devices[0]!.name = 'Denon AVR-X4800I'; }), moved);
  assert.throws(() => tamper((spec) => { spec.devices.reverse(); }), moved);
  // Resent unasked or not changes how many numbers the template takes, so the builder runs out of them or has
  // some left; a second power off list likewise.
  assert.throws(() => tamper((spec) => { spec.devices[0]!.resend = false; }), /list 26 is built two ways/);
  // Neither device sent unasked: a chain with no "If not" question, which only the Dutch compile shows, refused.
  assert.throws(() => tamper((spec) => { for (const one of spec.devices) one.resend = false; }), /none sent unasked/);
  assert.throws(() => tamper((spec) => { spec.devices[1]!.offLists = 2; }), /too few numbers/);
  // The attempt screen's numbers in walk order: its enter list's index, then that list's two power off lists, the
  // "If not" question's mode and the timer it starts, then its leave list's index. Its enter list moved one on is
  // its leave list, which the builder refuses to build two ways before any byte is compared.
  const attempt = (spec: Spec): number[] => (spec.screens[0] as { numbers: number[] }).numbers;
  assert.throws(() => tamper((spec) => { attempt(spec)[0]! += 1; }), /list 979 is built two ways/);
  assert.throws(() => tamper((spec) => { attempt(spec)[4]! += 1; }), moved);
  assert.throws(() => tamper((spec) => { [spec.fonts.body, spec.fonts.ok] = [spec.fonts.ok, spec.fonts.body]; }), /has no glyph for/);
  assert.throws(() => tamper((spec) => {
    const [a, b] = [spec.screens[2], spec.screens[3]] as { mode: number }[];
    [a!.mode, b!.mode] = [b!.mode, a!.mode];
  }), moved);
});

test('todo-compile-one 4.6: the lists built are named by nothing outside the help screens on all eighteen English compiles, and every list below them is reached from outside too, so nothing below is the help screens\' alone',
     skipUnless(...ENGLISH), () => {
  const totals = { below: 0, shared: 0 };
  for (const name of ENGLISH) {
    const c = parse(require_(name));
    const d = describeTouchHelpScreens(c, takeApart(c));
    const built = new Set(buildTouchHelpScreens(c, d.spec).lists.keys());
    const got = listsBelow(c, new Set(touchHelpScreenModes(c).modes), built);
    assert.deepEqual(got.namedFromOutside, [], name);
    assert.equal(got.sharedBelow, got.below, name);
    totals.below += got.below;
    totals.shared += got.shared;
  }
  assert.deepEqual(totals, { below: 916, shared: 287 });
});
