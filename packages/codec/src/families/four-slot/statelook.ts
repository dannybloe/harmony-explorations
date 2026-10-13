/**
 * A state's look on a configuration of ours: `todo-compile-650.md` 11.1.1.5, section 377.
 *
 * In the state colours, section 366, a screen of a state draws that state's flat background and queues a
 * corner program whose case 0 paints the corner in the same colour, the case the sending mark is not drawn
 * in. An empty configuration holds the idle state's pair alone, since its two menus are the only screens it
 * has and the placer refuses a picture nothing draws. So the first device's pages find no device look to
 * draw, and this adds it: the background, the patch and a corner program, each made by the generator that
 * made the idle one, `stateBackgroundBytes`, `statePatchBytes` and `cornerProgram`. Nothing is read off a
 * compile. The mark the new program draws is the file's own, the picture the existing corner program's mark
 * case draws, so both programs show the same mark.
 *
 * **Found again by content in the colour**, `stateLookOf`, since every composer after this moves addresses:
 * the one picture of the background's bytes, the one of the patch's, and the one corner program, as
 * `cornerPrograms` lists them, whose case 0 draws that patch.
 *
 * **The program is appended to base slot 11**, so its entry is the table's length, and that has to stay
 * below the 256 a queued program can reach, since the firmware indexes the table with the operand's low byte
 * alone, section 369. An empty configuration's table holds six entries.
 *
 * The Harmony 650 alone, the one model the state colours are built for. Read only towards hardware.
 */
import { u24 } from '../../bytes.ts';
import type { ContainerPiece, PieceRef } from '../../frame.ts';
import { layOutContainer, takeApart } from '../../frame.ts';
import { archSlot, type Container } from '../../gspm.ts';
import { RUNNABLE_SCREEN_PROGRAMS, statePatchBytes, stateBackgroundBytes } from '../../backgrounds.ts';
import { SCREEN_TABLE_SLOT } from '../../screen.ts';
import { contentKey } from '../../screencategories.ts';
import { ComposeError } from '../../shared/core.ts';
import { cornerPrograms, picturesByContent } from './chrome.ts';
import { cornerPlaceAt, cornerProgram, cornerProgramAt } from './empty.ts';

/** Where a state's look sits: its background and its patch as addresses, its corner program as a base slot 11 entry. */
export interface StateLook {
  background: number;
  patch: number;
  corner: number;
}

/** Where `cornerProgram`'s cases draw their picture, past the draw opcode and the two coordinates. */
const CASE_PICTURE_AT = 3;

/**
 * The look of the state drawn in `colour`, or undefined where the configuration holds none of it. Refused
 * where it holds part of one, or any part twice, since a composer could then only guess which to draw.
 */
export function stateLookOf(c: Container, colour: number): StateLook | undefined {
  const pictures = picturesByContent(c);
  const backgrounds = pictures.get(contentKey(stateBackgroundBytes(colour))) ?? [];
  const patches = pictures.get(contentKey(statePatchBytes(colour))) ?? [];
  const table = c.pointerArray(archSlot(c.architecture as number, SCREEN_TABLE_SLOT)) ?? [];
  const corners = patches.length !== 1 ? [] : cornerPrograms(c).filter((index) => {
    const pieces = cornerProgramAt(c, table[index] as number);
    const patchCase = pieces?.[1];
    return patchCase !== undefined && u24(c.blob, patchCase.at + CASE_PICTURE_AT) === patches[0];
  });
  if (backgrounds.length === 0 && patches.length === 0 && corners.length === 0) return undefined;
  if (backgrounds.length !== 1 || patches.length !== 1 || corners.length !== 1) {
    throw new ComposeError(`the look in colour ${colour.toString(16)} is held ${backgrounds.length}, ${patches.length} `
      + `and ${corners.length} times over for its background, patch and corner program, not once each`);
  }
  return { background: backgrounds[0] as number, patch: patches[0] as number, corner: corners[0] as number };
}

/**
 * The configuration with the look of the state drawn in `colour`, added where it holds none and returned
 * as it is otherwise. A configuration holding no corner program of `cornerProgram`'s form is refused, since
 * the new program's mark is taken from one.
 */
export function withStateLook(c: Container, colour: number): Container {
  if (c.architecture !== 14) throw new ComposeError('a state\'s look is built for the Harmony 650 only');
  if (stateLookOf(c, colour) !== undefined) return c;
  const addresses = c.pointerArray(archSlot(14, SCREEN_TABLE_SLOT)) ?? [];
  const existing = cornerPrograms(c).find((index) => cornerProgramAt(c, addresses[index] as number) !== undefined);
  if (existing === undefined) throw new ComposeError('no corner program of ours to take the sending mark from');

  const layout = takeApart(c);
  const table = layout.sections[archSlot(14, SCREEN_TABLE_SLOT)]?.head[0];
  if (table === undefined) throw new ComposeError('base slot 11 has no table');
  const count = table.bytes.length >= 2 ? (table.bytes[0] as number) | ((table.bytes[1] as number) << 8) : -1;
  if (table.bytes.length !== 2 + 3 * count) throw new ComposeError('base slot 11\'s table is not a two byte count and its entries');
  if (count >= RUNNABLE_SCREEN_PROGRAMS) {
    throw new ComposeError(`base slot 11 holds ${count} entries, and a program appended there is past the ${RUNNABLE_SCREEN_PROGRAMS} a screen can queue`);
  }
  // The mark, through the pieces: the table's entry, the switch's second case, the case's picture.
  const to = (piece: ContainerPiece | undefined, at: number): ContainerPiece | undefined => {
    const ref = piece?.refs.find((one) => one.at === at);
    return ref !== undefined && 'to' in ref ? ref.to : undefined;
  };
  const [rootModel, , markModel] = cornerProgram(blank(), blank()) as [ContainerPiece, ContainerPiece, ContainerPiece];
  const markCaseAt = (rootModel.refs[1] as PieceRef & { at: number }).at;
  const markAt = (markModel.refs[0] as PieceRef & { at: number }).at;
  const mark = to(to(to(table, 2 + 3 * existing), markCaseAt), markAt);
  if (mark === undefined) throw new ComposeError(`corner program ${existing}'s mark case names no picture`);

  const background: ContainerPiece = { bytes: stateBackgroundBytes(colour), refs: [], owner: 'picture-bank' };
  const patch: ContainerPiece = { bytes: statePatchBytes(colour), refs: [], owner: 'picture-bank' };
  // At the place the existing corner program draws, so a state added keeps its patch and mark where the rest are.
  const place = cornerPlaceAt(c, addresses[existing] as number);
  if (place === undefined) throw new ComposeError(`corner program ${existing} draws at no known place`);
  const program = cornerProgram(patch, mark, place);
  const grown = new Uint8Array(table.bytes.length + 3);
  grown.set(table.bytes);
  grown[0] = (count + 1) & 0xff;
  grown[1] = (count + 1) >> 8;
  table.bytes = grown;
  table.refs = [...table.refs, { at: 2 + 3 * count, to: program[0] as ContainerPiece, offset: 0 }];
  layout.body = [...layout.body, ...program];
  layout.pictures = [...layout.pictures, background, patch];
  const out = layOutContainer(layout).container;
  const look = stateLookOf(out, colour);
  if (look?.corner !== count) throw new ComposeError('the look added does not read back as one');
  return out;
}

function blank(): ContainerPiece {
  return { bytes: new Uint8Array(0), refs: [], owner: 'picture-bank' };
}
