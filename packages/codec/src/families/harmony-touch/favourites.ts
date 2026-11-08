/**
 * A Harmony Touch's favourite channels composed by us from a description, a channel logo of ours drawn as a
 * picture, and what a picture has to be before an answerer hands it to the remote: `todo-touch.md` 8.3.
 *
 * **What a favourite is, in one paragraph.** A favourite is a station. The favourites screen shows them in the
 * order of one list, the stations of the user's favourites document; the number a tap sends, the name and the
 * picture come from the tuning device's favourites document, a dial position per station, and whatever a dial
 * position leaves out is filled from the provider's line up, `reference/architectures/harmony-touch/
 * favourites-and-settings.md`, "Favourite channels" and "The documents". The three are the screens' documents and
 * not the engine's, and the remote asks for each of them without an entity tag in every sync through a computer,
 * "Which favourites documents are asked for".
 *
 * **What a description says, and why by channel number.** The order is every favourite once, by its channel
 * number; a channel added is a channel of the line up, by its number there; a logo of ours is a favourite by its
 * number and the text drawn on it. A channel number is what the tile shows under its picture and what a tap
 * sends, the screens refuse a second favourite with a number one already has (`findDuplicate` in their
 * favourites page), and the line up measured holds no two channels with one number; so a number names one
 * favourite and one channel, and the description carries no station identifier, which is the account's
 * provider's data.
 *
 * **A channel is added the way the remote's own add screen adds one it offers from the line up**: the station
 * alone, appended to the user's list, and no dial position, so its number, its name and its logo are the line
 * up's. The screens' `addUserFavoriteChannel`, given a station from the popular list, writes nothing to the
 * device's document, and a channel typed in by number only gets a dial position. So adding changes the user's
 * document and nothing else, and the device's document and the line up stay as the remote holds them.
 *
 * **A logo of ours replaces the picture at the address the remote asks for that favourite's logo**: a station's
 * logo for a channel of the line up, or the uploaded picture a dial position names. It is drawn here, never
 * copied: the text in this repository's own Oxanium, dark blue on bright yellow inside a dark blue frame, two
 * colours a person who cannot tell red from green still tells apart, at the 54 by 54 the remote asks every logo
 * at, as a PNG of eight bits a channel with alpha, which is the form of every logo Logitech's service delivered
 * in the recorded syncs, `readPng` and `touch-favourites.test.ts`.
 *
 * **Why a picture is checked before it is sent, and what the check cannot say.** The remote does not check a
 * picture: it decodes the file base64 and stores it, and its screens draw it with a native decoder,
 * `Ui.loadImage`, at its own size, centred in a tile of 78 by 62 and clipped to it. A file that does not decode
 * leaves the tile empty, which is read in the screens' image widget, `draw` returning on no surface; that costs
 * one tile. What a native decoder does with a file far larger than the tile, held in a cache of 6 MiB, is not
 * read, and a decoder that runs out of memory would cost the screens' program rather than a tile, at every
 * showing of the favourites page. So `pictureRefusals` holds a picture of ours to what the remote was seen to
 * draw, and no larger than the box its address asks for.
 *
 * **Which architectures**: the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's
 * templates file it under 18. The screens read are the production image's `juniper` skin.
 */
import { encodePng, readPng } from '../../screens/png.ts';
import { rasterise } from '../../drawing/raster.ts';
import { oxanium } from '../../drawing/typeface.ts';
import { ComposeRefusal } from './compose.ts';
import { CONTENT_DEVICE, CONTENT_SERVICE, CONTENT_USER, type ContentUser, type SyncDocuments } from './documents.ts';
import { readConfiguration, type ReadFavourites } from './read.ts';

/** How many favourites the remote holds: its add screen refuses a fifty first, `favourites-and-settings.md`. */
export const FAVOURITES_LIMIT = 50;

/** The box the remote asks every channel logo in, `maxX` and `maxY` of the address, its screens' `maxX` and `maxY`. */
export const LOGO_BOX = { width: 54, height: 54 } as const;

/** A favourites description, as `packages/corpus/touch-favourites/` holds them. */
export interface OwnFavourites {
  /**
   * Channels of the provider's line up to add, each by its number there, added as the remote's add screen adds
   * a channel it offers: the station alone, at the end of the user's list.
   */
  readonly add?: readonly string[];
  /** Every favourite once, the ones added included, by its channel number, in the order the screen is to show them. */
  readonly order: readonly string[];
  /** Logos of ours: a favourite by its channel number, and the text drawn on its picture. */
  readonly logos?: readonly { readonly channel: string; readonly text: string }[];
}

/** One picture of ours: the address the remote asks for it at, and the PNG file. */
export interface OwnPicture {
  readonly uri: string;
  readonly png: Uint8Array;
}

/** What composing favourites gives: the favourites documents that change, by address, and the pictures of ours. */
export interface ComposedFavourites {
  readonly documents: Readonly<Record<string, unknown>>;
  readonly pictures: readonly OwnPicture[];
}

const refuse = (message: string): never => {
  throw new ComposeRefusal(message);
};

const copy = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

/** The one favourites activity of a configuration, with all three of its documents present, or a refusal. */
function theFavourites(documents: SyncDocuments): ReadFavourites {
  const all = readConfiguration(documents).favourites;
  if (all.length !== 1) refuse(`the documents hold ${all.length} favourites activities, and this composes the favourites of exactly one`);
  const f = all[0]!;
  if (f.addresses.user === undefined || f.addresses.device === undefined || f.addresses.service === undefined || f.serviceId === undefined) {
    refuse('the documents do not name all three favourites documents, the user\'s, the tuning device\'s and the line up');
  }
  if (f.missing.length > 0) refuse(`the documents lack ${f.missing.length} of the three favourites documents, which the remote's are to be read from`);
  if (f.device?.contentProfileKey === undefined) refuse('the tuning device states no profile key, so the user\'s list cannot be found');
  return f;
}

/**
 * Compose favourites from a description and the documents the remote holds, the six and the three favourites
 * documents. Gives the user's favourites document when the order or an added channel changes it, and the
 * pictures of ours, each at the address the remote asks for that favourite's logo once the new documents are
 * read. **Refuses**, by channel number and never quoting an identifier: documents that hold no single
 * favourites activity with all three documents, a favourite there with no number, two with one number; a
 * channel to add that is not exactly one channel of the line up, or that is already a favourite by station or
 * number, or whose station has a dial position already, which the remote would read in place of the line up;
 * more than `FAVOURITES_LIMIT`; an order that is not every favourite once; a logo for a number no favourite has,
 * for one with no address the remote asks a picture at, a channel added by hand with no picture, or twice for one
 * favourite; a logo text that is empty, longer than four characters or not drawn by the typeface; and a
 * description that changes nothing.
 */
export function composeTouchFavourites(description: OwnFavourites, documents: SyncDocuments): ComposedFavourites {
  const f = theFavourites(documents);
  const profileKey = f.device!.contentProfileKey!;
  const serviceId = f.serviceId!;
  const numbers = f.favourites.map((x, at) => {
    if (typeof x.number !== 'string' || x.number === '') refuse(`favourite ${at + 1} of the remote's has no channel number, so a description cannot name it`);
    return x.number!;
  });
  if (new Set(numbers).size !== numbers.length) refuse('two of the remote\'s favourites share a channel number, which its screens refuse');

  const user = copy(f.user!) as ContentUser & { preferences: Record<string, Record<string, { stations: { id: string }[] }>> };
  const stations = user.preferences[profileKey]![serviceId]!.stations;
  const byNumber = new Map<string, { id: string }>(stations.map((s, i) => [numbers[i]!, s]));
  const channels = f.service?.channels ?? [];
  const dialStations = new Set((f.deviceDocument?.services?.[serviceId]?.dialPositions ?? []).map((d) => d?.station));

  for (const number of description.add ?? []) {
    const found = channels.filter((c) => c?.number === number);
    if (found.length !== 1) refuse(`channel ${number} is ${found.length === 0 ? 'not a channel' : 'more than one channel'} of the line up`);
    const station = found[0]!.station?.id;
    if (typeof station !== 'string' || station === '') refuse(`channel ${number} of the line up names no station`);
    if (byNumber.has(number)) refuse(`channel ${number} is already a favourite`);
    if (stations.some((s) => s.id === station)) refuse(`channel ${number}'s station is already a favourite under another number`);
    if (dialStations.has(station)) refuse(`channel ${number}'s station has a dial position already, which the remote would read in place of the line up`);
    const entry = { id: station! };
    stations.push(entry);
    byNumber.set(number, entry);
  }
  if (stations.length > FAVOURITES_LIMIT) refuse(`${stations.length} favourites, where the remote holds ${FAVOURITES_LIMIT}`);

  const order = description.order;
  if (order.length !== byNumber.size || new Set(order).size !== order.length || order.some((n) => !byNumber.has(n))) {
    refuse(`the order names ${order.length} channels, where every one of the ${byNumber.size} favourites has to be named once`);
  }
  user.preferences[profileKey]![serviceId]!.stations = order.map((n) => byNumber.get(n)!);

  const changed = JSON.stringify(user) !== JSON.stringify(f.user);
  const out: Record<string, unknown> = changed ? { [f.addresses.user!]: user } : {};

  // The logos, at the addresses the remote asks for them once it holds the new documents.
  const after = theFavourites({ ...documents, ...out });
  // The closure: the new documents read back, by the reader the checks use, to the order described.
  if (JSON.stringify(after.favourites.map((x) => x.number)) !== JSON.stringify(order)) refuse('the new documents read back to another order than the one described');
  const pictures: OwnPicture[] = [];
  const seen = new Set<string>();
  for (const logo of description.logos ?? []) {
    const one = after.favourites.find((x) => x.number === logo.channel);
    if (one === undefined) refuse(`a logo is asked for channel ${logo.channel}, which is not a favourite`);
    if (one!.logo === undefined) refuse(`channel ${logo.channel} was added by hand with no picture, so the remote asks for no logo of it`);
    if (seen.has(logo.channel)) refuse(`two logos are asked for channel ${logo.channel}`);
    seen.add(logo.channel);
    pictures.push({ uri: one!.logo!, png: drawTouchLogo(logo.text) });
  }
  if (!changed && pictures.length === 0) refuse('the description changes nothing');
  return { documents: out, pictures };
}

// ---------------------------------------------------------------------------------------------------
// A logo of ours
// ---------------------------------------------------------------------------------------------------

/** The two colours of a logo of ours: bright yellow, and a dark blue for the frame and the text. */
export const LOGO_COLOURS = { ground: [255, 214, 0], ink: [0, 45, 160] } as const;

/** The frame's width in pixels, and the room the text keeps from it on every side. */
const FRAME = 3;
const MARGIN = 4;

/**
 * A channel logo of ours, 54 by 54, a PNG of eight bits a channel with alpha and every pixel opaque: the text in
 * Oxanium Bold, as large as fits inside the frame and its margin, centred on its own ink, blended from the
 * outline's coverage, on bright yellow inside a dark blue frame. One to four characters, each one the typeface
 * draws. The same text gives the same bytes every time: the drawing is `raster.ts`'s, which uses no platform
 * maths, and the encoder is `png.ts`'s, whose deflate is Node's.
 */
export function drawTouchLogo(text: string): Uint8Array {
  if (text.length === 0 || text.length > 4 || text.trim() !== text) refuse('a logo\'s text is one to four characters, with no space at either end');
  const font = oxanium('Bold');
  for (const ch of text) if (ch !== ' ' && font.charToGlyph(ch).index === 0) refuse(`the typeface draws no '${ch}'`);
  const { width, height } = LOGO_BOX;
  const room = { width: width - 2 * (FRAME + MARGIN), height: height - 2 * (FRAME + MARGIN) };
  // The largest whole pixel size whose outline fits the room, from 40 down.
  let px = 40;
  let box = font.getPath(text, 0, 0, px).getBoundingBox();
  while (px > 6 && (box.x2 - box.x1 > room.width || box.y2 - box.y1 > room.height)) {
    px -= 1;
    box = font.getPath(text, 0, 0, px).getBoundingBox();
  }
  const dx = (width - (box.x2 - box.x1)) / 2 - box.x1;
  const dy = (height - (box.y2 - box.y1)) / 2 - box.y1;
  const drawing = rasterise(font.getPath(text, dx, dy, px).commands, width, height);
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const at = y * width + x;
      const framed = x < FRAME || y < FRAME || x >= width - FRAME || y >= height - FRAME;
      const v = framed ? 1 : drawing.coverage[at]!;
      for (let c = 0; c < 3; c += 1) {
        rgba[at * 4 + c] = Math.round(LOGO_COLOURS.ink[c]! * v + LOGO_COLOURS.ground[c]! * (1 - v));
      }
      rgba[at * 4 + 3] = 255;
    }
  }
  return encodePng(width, height, rgba, 4);
}

// ---------------------------------------------------------------------------------------------------
// What a picture has to be before it is sent
// ---------------------------------------------------------------------------------------------------

/** A logo's address, as the screens build one: a station's, or a picture a dial position names. */
const STATION_LOGO = /^content-image:\/\/1\.0\/station\/[^/;]+\/image;maxX=(\d+);maxY=(\d+);type=png$/;
const UPLOADED_LOGO = /^content-image:\/\/1\.0\/image\/[^/;]+;maxX=(\d+);maxY=(\d+)$/;

/**
 * The box a background is drawn in, the screen, and its twin's for the picker: the sizes the one recorded sync that
 * carried a background delivered, which the screens' address states no `maxX` for.
 */
export const BACKGROUND_BOX = { width: 240, height: 320 } as const;
export const BACKGROUND_TWIN_BOX = { width: 60, height: 80 } as const;

/**
 * Why a picture may not be handed to the remote at `uri`, each a sentence that quotes no address, or none.
 * **A channel logo or a background**, at an address of one of the two shapes the screens build for a favourite or a
 * popular channel, or a background's in the user's picture store, the kinds a sync through a computer asks for.
 * **The file decodes**, `readPng`: signature, chunks, CRCs and image data. **It has the form every picture
 * Logitech's service delivered in the recorded syncs has**, eight bits a channel, truecolour with alpha, not
 * interlaced, which is the form the screens were seen to draw; another form may well draw, and is not what a
 * remote was seen to draw. **It fits its box**: a logo the `maxX` by `maxY` its address asks for, which the
 * service kept to in every logo recorded, one of them 54 by 44, and a background the screen, its twin the 60 by 80
 * recorded; the header says why a larger one is refused rather than left to the tile's clipping. Every picture of
 * the recorded full sync passes, `touch-favourites.test.ts`, so the answerer's replay of Logitech's answers does.
 */
export function pictureRefusals(uri: string, png: Uint8Array): string[] {
  const shape = STATION_LOGO.exec(uri) ?? UPLOADED_LOGO.exec(uri);
  const background = uri.startsWith('https://') && uri.endsWith('.png');
  if (shape === null && !background) return ['the picture is not at the address of a channel logo or a background, the two kinds the screens ask for over USB'];
  let header;
  try {
    header = readPng(png);
  } catch (e) {
    return [`the picture does not decode as a PNG: ${(e as Error).message}`];
  }
  const out: string[] = [];
  if (header.bitDepth !== 8 || header.colourType !== 6) {
    out.push(`the picture is ${header.bitDepth} bits a sample in colour type ${header.colourType}, where every logo the remote was seen to draw is 8 bits in colour type 6, truecolour with alpha`);
  }
  if (header.interlace !== 0) out.push('the picture is interlaced, which no picture the remote was seen to draw is');
  const box = shape !== null ? { width: Number(shape[1]), height: Number(shape[2]) } : uri.endsWith('_small.png') ? BACKGROUND_TWIN_BOX : BACKGROUND_BOX;
  if (header.width > box.width || header.height > box.height) {
    out.push(`the picture is ${header.width} by ${header.height}, larger than the ${box.width} by ${box.height} ${shape !== null ? 'its address asks for' : 'a background is drawn in'}`);
  }
  return out;
}

/** Whether an address is one of the three favourites documents', by the start the screens build it with. */
export const isFavouritesAddress = (uri: string): boolean => [CONTENT_USER, CONTENT_DEVICE, CONTENT_SERVICE].some((p) => uri.startsWith(p));
