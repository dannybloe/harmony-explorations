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
import type { CatalogueSource } from '../catalogue.ts';
import type { DocumentFamily } from '../families/document.ts';
import { refusalsBeforeASync, type Finding } from './check.ts';
import {
  ComposeRefusal, composeTouchActivity, composeTouchDeviceOfRow, withTouchActivity, withTouchDevice, type OwnActivity,
  type RowDevice,
} from './compose.ts';
import type { SyncDocuments } from './documents.ts';
import { emptyTouchDocuments } from './empty.ts';
import { composeTouchFavourites, type OwnFavourites, type OwnPicture } from './favourites.ts';
import { buildTouchDocuments, readTouchSetupFile, type TouchAccount, type TouchSetupFile } from './fromnothing.ts';
import { readConfiguration, type Configuration } from './read.ts';
import { withoutTouchEntries, type TouchRemoval } from './remove.ts';
import { composeTouchSettings, type OwnSettings } from './settings.ts';

/** The Harmony Touch's own types, as `DocumentFamily` asks for them. */
export interface TouchTypes {
  readonly documents: SyncDocuments;
  readonly setup: TouchSetupFile;
  /** The infrared archive, `archiveAt` on Node, and the account's own fields, which a setup file never holds. */
  readonly sources: { readonly archive: CatalogueSource; readonly account: TouchAccount };
  /** A device of ours in the rhythm table's terms, as `packages/corpus/touch-devices/` holds one. */
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
 * The Harmony Touch's family. `withDevice` composes through `composeTouchDeviceOfRow`, the form every device of
 * ours on the bench took, 8.1; `without` is the general removal, 8.5, which takes out everything naming what it
 * removes, where `withoutTouchDevice` and `withoutTouchActivity` refuse a device or an activity something names.
 * `withFavourites` gives the favourites documents keyed by their addresses beside the six, and `check` is the gate
 * the answerer runs before a sync, `refusalsBeforeASync`.
 */
export const HARMONY_TOUCH_FAMILY: DocumentFamily<TouchTypes> = {
  kind: 'document',
  name: 'the Harmony Touch',
  readSetup: (json) => readTouchSetupFile(json),
  build: (setup, sources) => buildTouchDocuments(setup, sources),
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
};
