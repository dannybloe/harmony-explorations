/**
 * The second kind of family, plan 013 decision 1: a remote that assembles its configuration itself from
 * documents it is given, where a compiled family, `Family` in `family.ts`, builds the one container the remote
 * is written with. The Harmony Touch is the one document family, `families/harmony-touch/family.ts`; the hubs and the
 * later remotes Logitech's templates file beside it would be the next.
 *
 * **Kept apart from `Family` on purpose.** Every member of a compiled family takes a container, and a set of
 * documents has none, so the Touch put behind `Family` would be a family of members that refuse. What the two
 * kinds share is below either interface: the setup a build starts from, the infrared definitions, the catalogue
 * and the archive. Neither interface names the other's internals, and this one names none of the Touch's: a
 * document family states its own types through `DocumentTypes`, so a caller holding a family of this kind gets
 * the Touch's types when it holds the Touch's family and nothing it could mistake for them otherwise.
 *
 * **Small by intent**: the members a caller choosing by model needs to build, change, read and check a remote's
 * documents, the registry's `familyOfModel`, and not a re-export of the family's folder. A composer of one
 * document stays in the family's own modules, where its tests are.
 */

/** The types a document family works in, each the family's own. */
export interface DocumentTypes {
  /** A set of the remote's documents, the whole set a remote holds or is to be given. */
  readonly documents: unknown;
  /** A setup the family builds from, as its own reader of a setup file gives it. */
  readonly setup: unknown;
  /** What building from a setup takes besides the setup: an archive, an account. */
  readonly sources: unknown;
  /** A device as a description states it. */
  readonly device: unknown;
  /** An activity as a description states it. */
  readonly activity: unknown;
  /** What to take out: devices and activities, by the ids the documents give them. */
  readonly removal: unknown;
  /** Favourites as a description states them. */
  readonly favourites: unknown;
  /** A picture of ours that goes with the documents, at the address the remote asks for it. */
  readonly picture: unknown;
  /** The remote's settings as a description states them. */
  readonly settings: unknown;
  /** The documents read: what the remote will do with them. */
  readonly configuration: unknown;
  /** One thing the check finds the remote would refuse or ignore. */
  readonly finding: unknown;
}

/**
 * A family whose remotes are given documents, plan 013 decision 1. Every change returns the whole set, the
 * documents it changed in place of the ones it was given and every other as given, so a caller never merges.
 * Each member refuses what the family's composer or reader refuses, with that refusal.
 */
export interface DocumentFamily<T extends DocumentTypes = DocumentTypes> {
  readonly kind: 'document';
  /** For a refusal or a report: the models this family serves, as a person names them. */
  readonly name: string;
  /** A setup file read and checked, refused where it is not one this family builds from. */
  readSetup(json: unknown): T['setup'];
  /** The documents built from a setup alone, with no document of Logitech's as input. */
  build(setup: T['setup'], sources: T['sources']): T['documents'];
  /**
   * The pictures of ours a set built from a setup carries beside its documents, at the addresses the documents make
   * the remote ask for them, plan 014: a build is the documents and these together.
   */
  buildPictures(setup: T['setup']): readonly T['picture'][];
  /** The configuration with no device and no activity, made from the documents a remote holds. */
  empty(documents: T['documents']): T['documents'];
  /** The documents with a device of ours added. */
  withDevice(documents: T['documents'], device: T['device']): T['documents'];
  /** The documents with an activity of ours added. */
  withActivity(documents: T['documents'], activity: T['activity']): T['documents'];
  /** The documents with devices and activities taken out, with everything that names them. */
  without(documents: T['documents'], removal: T['removal']): T['documents'];
  /** The documents with favourites composed from a description, and the pictures of ours they ask for. */
  withFavourites(documents: T['documents'], favourites: T['favourites']): { readonly documents: T['documents']; readonly pictures: readonly T['picture'][] };
  /** The documents with the remote's settings changed as a description says. */
  withSettings(documents: T['documents'], settings: T['settings']): T['documents'];
  /** The documents read as the remote reads them. */
  read(documents: T['documents']): T['configuration'];
  /** What the remote would refuse in the documents, empty where a sync may deliver them. */
  check(documents: T['documents']): readonly T['finding'][];
}
