/**
 * The Harmony Touch as a document family, plan 013 decision 1: the members a caller choosing by model needs,
 * `DocumentFamily` in `families/document.ts`, each the module of this folder that already does the work. Nothing
 * here composes or reads anything itself; a member is the folder's own function, with the documents it changed
 * put back into the set.
 *
 * **Why the object sits here and not in `families/`.** It is assembled from this folder's modules alone, the
 * Touch's code stays in this folder, and `families/` holds the compiled families, whose rules,
 * `generic.test.ts`'s among them, are about containers. The registry imports it from here, as it imports each
 * compiled family from its own folder.
 */
import type { CatalogueSource } from '../../catalogue/catalogue.ts';
import type { DocumentFamily } from '../document.ts';
import { refusalsBeforeASync, type Finding } from './check.ts';
import {
  ComposeRefusal, composeTouchActivity, composeTouchDeviceOfRow, withTouchActivity, withTouchDevice, type OwnActivity,
  type RowDevice,
} from './compose.ts';
import type { SyncDocuments } from './documents.ts';
import { emptyTouchDocuments } from './empty.ts';
import { composeTouchFavourites, type OwnFavourites, type OwnPicture } from './favourites.ts';
import type { Recipe } from '../../recipe/recipe.ts';
import { buildTouchDocuments, ourBackground, readTouchDocument, type TouchAccount } from './fromnothing.ts';
import { readConfiguration, type Configuration } from './read.ts';
import { withoutTouchEntries, type TouchRemoval } from './remove.ts';
import { composeTouchSettings, TOUCH_SETTINGS, type OwnSettings } from './settings.ts';
import { TOUCH_MAPS } from './recipemaps.ts';

/** The Harmony Touch's own types, as `DocumentFamily` asks for them. */
export interface TouchTypes {
  readonly documents: SyncDocuments;
  /**
   * A document of version 2: the one shape every model shares, with no block of the Touch's own.
   *
   * @privateRemarks
   * The infrared archive.
   * decision 43.
   */
  readonly setup: Recipe;
  /** The device archive, `archiveAt` on Node, and the account's own fields, which a document never holds. */
  readonly sources: { readonly archive: CatalogueSource; readonly account: TouchAccount };
  /** A device of ours in the rhythm table's terms, as `packages/remote/touch-devices/` holds one. */
  readonly device: RowDevice;
  readonly activity: OwnActivity;
  readonly removal: TouchRemoval;
  readonly favourites: OwnFavourites;
  readonly picture: OwnPicture;
  readonly settings: OwnSettings;
  readonly configuration: Configuration;
  readonly finding: Finding;
}

/**
 * The Harmony Touch's family. `withDevice` composes through `composeTouchDeviceOfRow`; `without` is the general removal, `remove.ts`, which takes out everything naming what it
 * removes, where `withoutTouchDevice` and `withoutTouchActivity` refuse a device or an activity something names.
 * `withFavourites` gives the favourites documents keyed by their addresses beside the six, and `check` is the gate
 * the answerer runs before a sync, `refusalsBeforeASync`.
 *
 * @privateRemarks
 * `composeTouchDeviceOfRow` is the form every device of ours on the bench took.
 */
export const HARMONY_TOUCH_FAMILY: DocumentFamily<TouchTypes> = {
  kind: 'document',
  name: 'the Harmony Touch',
  // A document of version 2; one of the earlier form, with the Touch's own block, is refused naming the converter.
  readSetup: (json) => readTouchDocument(json),
  build: (setup, sources) => buildTouchDocuments(setup, sources),
  // Our background and its small twin, which every set of ours names in its Settings whatever the setup.
  buildPictures: () => {
    const background = ourBackground();
    return [{ uri: background.addresses.picture, png: background.picture }, { uri: background.addresses.twin, png: background.twin }];
  },
  empty: (documents) => emptyTouchDocuments(documents),
  withDevice: (documents, device) => ({ ...documents, ...withTouchDevice(documents, composeTouchDeviceOfRow(device)) }),
  withActivity: (documents, activity) => ({ ...documents, ...withTouchActivity(documents, composeTouchActivity(activity, documents)) }),
  without: (documents, removal) => ({ ...documents, ...withoutTouchEntries(documents, removal) }),
  withFavourites: (documents, favourites) => {
    const composed = composeTouchFavourites(favourites, documents);
    return { documents: { ...documents, ...composed.documents }, pictures: composed.pictures };
  },
  withSettings: (documents, settings) => {
    if (documents.Settings === undefined) throw new ComposeRefusal('the documents hold no Settings to change');
    return { ...documents, Settings: composeTouchSettings(settings, documents.Settings) };
  },
  read: (documents) => readConfiguration(documents),
  check: (documents) => refusalsBeforeASync(documents),
  // Its places and default maps, decision 43, `recipemaps.ts`, which `resolveMaps` puts a document's choices over.
  // **Read when asked, not when this object is made**: `recipemaps.ts` reaches the registry, which loads this module,
  // so a program that loads `recipemaps.ts` first meets this object before `TOUCH_MAPS` is set, and a plain member
  // would stop the load with a reference error.
  get maps() {
    return TOUCH_MAPS;
  },
  // The settings a document may state, the rows a Settings of ours writes with their kinds and Logitech's defaults,
  // `settings.ts`; read when asked, as the maps are, so the order modules load in cannot meet it unset.
  get settings() {
    return TOUCH_SETTINGS;
  },
};
