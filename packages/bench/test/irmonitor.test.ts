/**
 * The infrared monitor without a receiver: lines as the Flirc's listener prints them, fed in by hand.
 *
 * Nothing here needs the lab or a device. The code book is a stand-in holding two stored frames of one
 * television code, the command and NEC's repeat frame, because what is under test is what the monitor
 * makes of a stream (which frame is a press, which a repeat, which is unreadable), not what the bench
 * remotes hold. The real book is exercised by the bench whenever it runs, against six configurations.
 *
 * The lines are the listener's own shapes, copied from a capture: a frame is signed durations starting
 * with a mark, a lone `+N` is the silence before the next frame in microseconds (the tool rounds it to
 * whole milliseconds), and anything else is a banner or a warning.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Pulse } from '@harmony/codec';

import {
  frameNumber, framesOfTrain, IrMonitor, parseListenLine, REPEAT_WINDOW_US, sameFrame, withinTolerance,
  type FrameBook, type HeardFrame, type KnownCode, type LineSource, type MonitorEvent,
} from '../src/irmonitor.ts';

/** An NEC frame as the receiver prints it: a 9 ms flash, a 4.5 ms pause, 32 bits and a closing flash. */
function necLine(bits: string, bias = 0): string {
  const parts = [`+${9000 + bias}`, `-${4500 - bias}`];
  for (const bit of bits) parts.push(`+${560 + bias}`, `-${(bit === '1' ? 1690 : 560) - bias}`);
  parts.push(`+${560 + bias}`);
  return parts.join(' ');
}

/** The same frame as stored durations, which is what a configuration holds. */
function necPulses(bits: string): Pulse[] {
  return parseListenLineOrThrow(necLine(bits));
}

function parseListenLineOrThrow(line: string): Pulse[] {
  const read = parseListenLine(line);
  if (read.kind !== 'frame') throw new Error(`not a frame: ${line}`);
  return read.pulses;
}

const VOLUME_UP = '00000100111110110000001011111101';
const OTHER = '00000100111110111000000001111111';
/** NEC's repeat: a header, a short pause and one flash, the same for every NEC code there is. */
const REPEAT_LINE = '+9000 -2250 +560';

function known(stored: Pulse[], repeat: boolean, opening: boolean): KnownCode {
  return { config: 'bench_remote', device: 'TV', group: 0, code: 16, command: 'VolumeUp', repeat, opening, stored };
}

/** Two stored frames of one code: the command, and the repeat a held key sends after it. */
class OneCodeBook implements FrameBook {
  readonly guessed: string[] = [];
  private readonly frames = [
    known(necPulses(VOLUME_UP), false, true),
    known(parseListenLineOrThrow(REPEAT_LINE), true, false),
  ];

  match(heard: readonly Pulse[]): KnownCode[] {
    return this.frames.filter((one) => sameFrame(one.stored, heard));
  }

  guess(key: string): { name: string; codesets: number }[] {
    this.guessed.push(key);
    return [{ name: 'PowerToggle', codesets: 3 }];
  }
}

/** A listener the test speaks for, so each line arrives when the test says. */
class HandSource implements LineSource {
  feed: (line: string) => void = () => {};
  start(onLine: (line: string) => void): void { this.feed = onLine; }
  stop(): void {}
}

function monitor(logPath?: string): { source: HandSource; book: OneCodeBook; frames: HeardFrame[]; m: IrMonitor } {
  const source = new HandSource();
  const book = new OneCodeBook();
  const m = new IrMonitor(source, () => book, () => new Date('2026-10-01T06:00:00.000Z'), logPath);
  const frames: HeardFrame[] = [];
  m.subscribe((event: MonitorEvent) => { if (event.type === 'frame') frames.push(event.frame); });
  m.start();
  return { source, book, frames, m };
}

test('a listener line is a gap, a frame starting with a flash, or something to pass over', () => {
  assert.deepEqual(parseListenLine('+40000'), { kind: 'gap', us: 40000 });
  assert.deepEqual(parseListenLine('+9071 -2126 +627 '), {
    kind: 'frame',
    pulses: [{ mark: true, us: 9071 }, { mark: false, us: 2126 }, { mark: true, us: 627 }],
  });
  // The banner carries numbers too, which is why a frame has to be nothing but signed durations.
  const banner = '[E] fl_version_compare(286): Flirc iospirit found version: 4.10.7 0x71266B92 [release]';
  assert.equal(parseListenLine(banner).kind, 'other');
  assert.equal(parseListenLine('').kind, 'other');
});

test('a duration matches within a quarter of the stored value, and never tighter than 250 microseconds', () => {
  // 560 is held to the floor: the receiver lengthens a flash by about 50 and shortens a pause by about 80.
  assert.equal(withinTolerance(560, 810), true);
  assert.equal(withinTolerance(560, 811), false);
  // 9000 is held to a quarter, 2250 either way.
  assert.equal(withinTolerance(9000, 11250), true);
  assert.equal(withinTolerance(9000, 11251), false);
  assert.equal(withinTolerance(9000, 6750), true);
  assert.equal(withinTolerance(9000, 6749), false);
});

test('a frame matches a stored one of the same shape, and a trailing pause is not part of it', () => {
  const stored = necPulses(VOLUME_UP);
  // The receiver's own bias, flashes long and pauses short, is inside the tolerance.
  assert.equal(sameFrame(stored, parseListenLineOrThrow(necLine(VOLUME_UP, 60))), true);
  assert.equal(sameFrame([...stored, { mark: false, us: 40000 }], parseListenLineOrThrow(necLine(VOLUME_UP))), true);
  // One bit different is one pause three times as long, which no tolerance here absorbs.
  assert.equal(sameFrame(stored, parseListenLineOrThrow(necLine(OTHER))), false);
  assert.equal(sameFrame(stored, stored.slice(0, -2)), false, 'a shorter frame is not the same frame');
});

test('a stored train is cut into frames at every pause of ten milliseconds or more', () => {
  const frame = necPulses(VOLUME_UP);
  const repeat = parseListenLineOrThrow(REPEAT_LINE);
  const train: Pulse[] = [...frame, { mark: false, us: 40000 }, ...repeat, { mark: false, us: 9999 }, ...repeat];
  const frames = framesOfTrain(train);
  // The 9999 microsecond pause is inside a frame, so the last two repeats stay one frame.
  assert.equal(frames.length, 2);
  assert.equal(frames[0]!.length, frame.length);
  assert.equal(frames[1]!.length, repeat.length * 2 + 1);
});

test('a frame decodes to the same number however the receiver biased it', () => {
  const a = frameNumber(necPulses(VOLUME_UP));
  const b = frameNumber(parseListenLineOrThrow(necLine(VOLUME_UP, 60)));
  assert.ok(a !== undefined);
  assert.equal(a.bits, 32);
  assert.deepEqual(b, a);
  assert.notEqual(frameNumber(necPulses(OTHER))?.key, a.key);
});

test('a short press is one command, and the repeat that follows it is attached rather than listed', () => {
  const { source, frames } = monitor();
  source.feed('+45604000');
  source.feed(necLine(VOLUME_UP, 50));
  source.feed('+40000');
  source.feed(REPEAT_LINE);
  assert.equal(frames.length, 2);
  const [press, repeat] = frames as [HeardFrame, HeardFrame];
  // The first gap the tool prints is the time since it started, not a silence before this frame.
  assert.equal(press.gapUs, undefined);
  assert.equal(press.repeatOf, undefined);
  assert.equal(press.bare, false);
  assert.deepEqual(press.matches.map((one) => one.command), ['VolumeUp']);
  assert.equal(repeat.gapUs, 40000);
  assert.equal(repeat.repeatOf, press.seq);
  assert.equal(repeat.bare, false);
});

test('a repeat heard with no command before it is bare: it says what it could follow, not what it is', () => {
  const { source, frames } = monitor();
  source.feed('+1000000');
  source.feed(REPEAT_LINE);
  const [only] = frames as [HeardFrame];
  assert.equal(only.repeatOf, undefined);
  assert.equal(only.bare, true);
  assert.equal(only.matches.length, 1);
});

test('a frame after a pause longer than the repeat window is a press of its own', () => {
  const { source, frames } = monitor();
  source.feed('+1000000');
  source.feed(necLine(VOLUME_UP));
  source.feed(`+${REPEAT_WINDOW_US + 1000}`);
  source.feed(REPEAT_LINE);
  assert.equal(frames[1]!.repeatOf, undefined, 'too late to be the press\'s repeat');
  assert.equal(frames[1]!.bare, true);
});

test('a code no bench remote holds is unknown, decoded where it can be, and offered to the catalogue', () => {
  const { source, book, frames } = monitor();
  source.feed('+1000000');
  source.feed(necLine(OTHER));
  const [only] = frames as [HeardFrame];
  assert.equal(only.matches.length, 0);
  assert.equal(only.bits, 32);
  assert.deepEqual(book.guessed, [only.number]);
  assert.deepEqual(only.guesses.map((one) => one.name), ['PowerToggle']);
});

test('a family that holds a key by sending the whole frame again is one press with repeats', () => {
  // Not in the book, so only the number can say it is the same press: that is the second arm.
  const { source, frames } = monitor();
  source.feed('+1000000');
  source.feed(necLine(OTHER));
  source.feed('+108000');
  source.feed(necLine(OTHER, 40));
  assert.equal(frames[1]!.repeatOf, frames[0]!.seq);
});

test('a line that is neither a frame nor a gap goes into the log rather than vanishing', () => {
  // A receiver that reports a code in a shape this reader does not know would otherwise look exactly
  // like a receiver that heard nothing, which is what an outdated Flirc firmware did with long codes.
  const dir = mkdtempSync(join(tmpdir(), 'irmonitor-'));
  try {
    const log = join(dir, 'monitor.jsonl');
    const { source, frames } = monitor(log);
    source.feed('[W] something the listener had to say');
    source.feed('+1000000');
    source.feed(necLine(VOLUME_UP));
    assert.equal(frames.length, 1);
    const lines = readFileSync(log, 'utf8').trim().split('\n').map((line) => JSON.parse(line));
    assert.equal(lines.length, 2);
    assert.deepEqual([lines[0].type, lines[0].text], ['other', '[W] something the listener had to say']);
    assert.equal(lines[1].seq, frames[0]!.seq);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the monitor keeps what it heard for a page that opens later', () => {
  const { source, m } = monitor();
  source.feed('+1000000');
  source.feed(necLine(VOLUME_UP));
  source.feed('+40000');
  source.feed(REPEAT_LINE);
  assert.equal(m.recent().length, 2);
  assert.deepEqual(m.status, { listening: true, detail: 'listening' });
});
