/**
 * The empty Harmony Touch configuration, no device and no activity, and what a sync of it leaves on the remote besides
 * the six documents: `todo-touch.md` 9.2.
 *
 * **What "empty" is, document by document**, read in the lab's copy of the 4.15.330 image for the preparation of 9.2
 * (`notes/9.2-preflight.md` there, from `notes/6.10-screens-reads.md` and the screens' and engine's Lua it names):
 *
 * * **`ActivityList`, `DeviceList`, `MapList` and `ProtocolList`: each its list, empty**, the rest of the document as it
 *   stands. That is `setupBaseOf`'s base, which 8.6 composed onto and never delivered; here it is delivered on purpose.
 *   Both programs were built for it: the engine's reader walks each list with `ipairs` and needs no entry, and the
 *   screens have a path for each empty case (the home page falls back to the device list when no activity is listed,
 *   `juniper/activity.lua`; a start with no activity offers a "no activity" notice, `juniper/init.lua`
 *   `loadScreens`, which also runs when the remote leaves USB power after a sync; the favourites page has its own screen for no favourites, `juniper/favoritechannel.lua`;
 *   `setCurrentActivity` in `appscommon/harmony.lua` sets -1 for an empty list; Off with no activity running sends
 *   nothing, and no hard key is sent with neither a device nor an activity current, `juniper/init.lua`).
 * * **`Context` has no empty form a remote can use, so it keeps the remote's values.** The screens build the address of
 *   every ActivityList, DeviceList, MapList and Settings read from its `AccountId-` (`getRequest` in
 *   `appscommon/harmony.lua`), the engine addresses every document it hands up by it, and the user's favourites
 *   document is addressed by its `HouseholdUserProfileUri`; the reference's smallest working set is "a context naming at
 *   least the provisioned account" (`answering-a-sync.md`, "The smallest set of documents"). `Language` alone is guarded
 *   when absent.
 * * **`Settings` has an empty form, its list empty, and it is kept anyway.** With no row the screens take every
 *   firmware default (`getRemoteSettings` in `appscommon/harmony.lua`), a built in background among them, so the empty
 *   list is safe. It is kept because it is the person's, and because its user backgrounds are what makes the screens
 *   carry the stored pictures into the new set, `userBackgroundsAsked` below.
 *
 * **What the commit leaves of the rest**, which is why this module exists beside `setupBaseOf`. A sync gathers the new
 * set in a folder of its own and the commit renames it over the stored one (`syncSuccess`, the engine's
 * `core/resourcemanager.lua`), so whatever was not gathered is gone afterwards:
 *
 * * **a favourites document is gathered only when the screens ask for it**, a 304 copying the stored one; on a Touch
 *   synced through a computer nothing else copies them (the engine's copy of the favourites, `copyContentIndexAndSource`,
 *   is a hub's sync's alone, `syncPimento`). The screens ask only for the favourites of an activity marked as the default
 *   for tuning, or of a speaker device (`populateList` in `appscommon/favoritesmanager.lua`), so **a set with no activity
 *   asks for none, and every favourites document the remote held is dropped at the commit**, `favouritesAskedFor`;
 * * **the pictures are carried whole, or not at all**: before the screens ask for any picture they copy every stored PNG
 *   into the new set, and they skip that copy when they ask for none (`submitImageRequest` and `copyImages`, the screens'
 *   `appscommon/harmony.lua` and `resourcemanager.lua`). With no activity and no favourites the only pictures asked are
 *   the user's backgrounds from Settings, each with its small twin, `userBackgroundsAsked`; a background that is neither
 *   one of those nor built into the remote would add two more, which this module cannot see, since the built in list
 *   is the remote's.
 *
 * These were readings when written, and the 9.2 run on the bench Touch measured two of them: the empty set's sync asked
 * for no favourites document and for the two pictures of Settings' user background, and the put back's sync after it
 * asked for every stored picture with the tag the remote held it with, so the pictures were carried. That the
 * favourites documents were dropped is still the reading's alone: the put back asked for them without a tag, as every
 * sync through a computer does, and delivered them with 200, `packages/bench/test/harmony-touch/touch-empty-runs.test.ts`. The screens'
 * "no activity" notice is also put up when the remote leaves USB power after a sync, which the preparation missed,
 * `tests/harmony_touch/test_harmony_touch_empty_screens.py`. **Which architectures**:
 * the Harmony Touch alone, firmware 4.15.330; its firmware reports 17 and Logitech's templates file it under 18.
 * **Nothing here sends anything.**
 */
import { CONFIGURATION_DOCUMENTS, type SyncDocuments } from './documents.ts';
import { readConfiguration } from './read.ts';
import { setupBaseOf } from './setup.ts';

type Json = Record<string, unknown>;
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * The empty configuration made from `documents`: the six configuration documents, the four lists emptied and everything
 * else as it stands, Context and Settings among it, the header says why. Anything else `documents` holds, a favourites
 * document or a picture, is left out: an empty set makes the remote ask for none of it. Refuses documents lacking one of
 * the four lists, as `setupBaseOf` does.
 */
export function emptyTouchDocuments(documents: SyncDocuments): SyncDocuments {
  const base = setupBaseOf(documents);
  return Object.fromEntries(CONFIGURATION_DOCUMENTS.flatMap((name) => (base[name] === undefined ? [] : [[name, base[name]]]))) as SyncDocuments;
}

/**
 * The favourites documents the screens ask for once `documents` are gathered, by address, in the order they ask: the
 * user's and the tuning device's for each favourites activity, and the line up once the user's document names its
 * service, which needs that document among `documents`. A speaker device's own favourites are not modelled; no set of
 * this project holds one. Empty for a set with no activity, the header.
 */
export function favouritesAskedFor(documents: SyncDocuments): string[] {
  const out: string[] = [];
  for (const f of readConfiguration(documents).favourites) {
    for (const address of [f.addresses.user, f.addresses.device, f.addresses.service]) {
      if (address !== undefined && !out.includes(address)) out.push(address);
    }
  }
  return out;
}

/**
 * How many pictures the screens ask for from Settings' `UserImages` row: each user background and its small twin, the
 * first row of that name as the screens find it, its text entries counted (`submitBackgroundImageRequest`). Zero for
 * Settings with no such row.
 */
export function userBackgroundsAsked(documents: SyncDocuments): number {
  const rows = isRecord(documents.Settings) ? (documents.Settings as Json)['Settings'] : undefined;
  if (!Array.isArray(rows)) return 0;
  const row = rows.find((r) => isRecord(r) && r['Name'] === 'UserImages') as Json | undefined;
  const values = row === undefined ? undefined : row['Values'];
  return Array.isArray(values) ? 2 * values.filter((v) => typeof v === 'string').length : 0;
}

/** What a remote keeps besides the six once it commits a set: the favourites documents it is asked for, and its pictures. */
export interface KeptAtTheCommit {
  /** The favourites documents asked for, which are all it keeps of them; every other one it held is dropped. */
  readonly favourites: readonly string[];
  /**
   * Whether every stored picture is carried into the new set: true when the screens ask for at least one picture, and
   * false when the set makes them ask for none, which drops them all. Counted from the user backgrounds and the logos
   * of the favourites `documents` hold, so favourites the remote holds and `documents` lack, or a background asked from
   * Logitech's bucket, which this module cannot see, can only make it true where this says false.
   */
  readonly pictures: boolean;
}

/**
 * What a remote keeps of its favourites documents and pictures when it commits `documents`, by the reading in the
 * header: an empty set keeps no favourites document, and keeps the pictures only through the user backgrounds.
 */
export function keptAtTheCommit(documents: SyncDocuments): KeptAtTheCommit {
  const logos = readConfiguration(documents).favourites.some((f) => f.favourites.some((one) => one.logo !== undefined));
  return { favourites: favouritesAskedFor(documents), pictures: userBackgroundsAsked(documents) > 0 || logos };
}
