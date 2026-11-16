# More types of `@freeharmony-sdk/remote`

<!-- introduction -->
Types that names of the remote package use and that it does not export by name. An application meets them inside
what it is given and never has to import them.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

### `BodyType`

```ts
type BodyType = 'application/json' | 'image/png';
```

The two kinds of body an answer carries, `answering-a-sync.md` "A document has to arrive as the object itself".

### `PreparedSet`

```ts
interface PreparedSet {
  readonly entries: ReadonlyMap<string, SetAnswer & { readonly etag: string }>;
  /** How many tags the set stated and how many are ours. */
  readonly tags: { readonly stated: number; readonly ours: number };
}
```

A set as the answerer uses it: each answer under its key, every one with a tag.

Uses [`SetAnswer`](remote-write.md#setanswer).

### `TouchSyncOptions`

```ts
interface TouchSyncOptions {
  /** A session opened on the Touch, `openTouchRequestSession`; its rail and its unit check are its own. */
  readonly session: TouchRequestSession;
  readonly mode: TouchSyncMode;
  /**
   * The text `/tde/powerstate` gave, read through the read only route before the session was opened,
   * `readTouchPowerSource`; `answerTouchSync` reads it itself. The run refuses before anything acts unless it is `usb`.
   */
  readonly powerSource: TouchPowerSource;
  /** The folder every request, answer and handed up document is kept in; new or empty. */
  readonly folder: string;
  /** Each line of `SYNC_LINES` as it happens. */
  readonly report?: (line: string) => void;
  /** How long to wait after an empty request list before reading again, in milliseconds; 1000 when absent. */
  readonly pollMs?: number;
  /** How many empty request lists in a row end the run as a refusal; 300 when absent. */
  readonly maxEmptyLists?: number;
  /** How often one address may be handed out in the run before it refuses; `MAX_HAND_OUTS` when absent. */
  readonly maxHandOuts?: number;
}
```

Uses [`TouchRequestSession`](usb-types.md#touchrequestsession), [`TouchSyncMode`](remote-write.md#touchsyncmode), [`TouchPowerSource`](usb.md#touchpowersource).
