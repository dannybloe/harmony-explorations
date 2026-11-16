# `@freeharmony-sdk/remote`

<!-- introduction -->
The remote package's main entry: reading a remote's configuration over the cable, whole and checked, with what
each model's read needs. The sync of a document and the pretend remote are on [its write subpath](remote-write.md).
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

## Reading a configuration off a remote

The read, and what each model's read needs.

### `ConfigRead`

```ts
interface ConfigRead {
  readonly profile: RemoteProfile;
  readonly header: ConfigHeader;
  readonly versionBlock: Uint8Array;
  readonly bytes: Uint8Array;
  readonly durationMs: number;
  /**
   * How many windows had to be asked for again.
   *
   * Reported rather than swallowed: a read that needed retries is still a good read, since every
   * window is verified by the sequence check and the whole file by the end marker and the trailer
   * checksum, but a link that needs them constantly is a fault somebody should see. Zero is the
   * normal value and the one worth noticing when it changes.
   */
  readonly retries: number;
}
```

A configuration read off a remote, checked: the profile it was read with, its header, the remote's version
block, and the bytes.

Uses [`RemoteProfile`](#remoteprofile), [`ConfigHeader`](remote-read.md#configheader).

### `ConfigReader`

```ts
interface ConfigReader {
  getVersion(): Promise<Uint8Array>;
  readFlash(address: number, count: number): Promise<Uint8Array>;
}
```

What a config read needs from a remote, and deliberately nothing more.

Narrower than [`HarmonyRemote`](usb.md#harmonyremote) on purpose. It makes the pipeline testable against a plain object
that serves bytes from a file, and it means this module cannot reach a write path even by
mistake, because no write method exists on the type it holds.

### `profileFor`

```ts
function profileFor(productId: number): RemoteProfile
```

The profile for an attached remote, or a refusal that says why.

Refusing beats guessing a base address. Reading the wrong address returns bytes that are not a
container, which is a confusing failure, and not every Harmony is read here, so an unknown product
id is a remote the read does not know yet rather than a fault.

Uses [`RemoteProfile`](#remoteprofile).

### `PROFILES`

```ts
const PROFILES: readonly RemoteProfile[]
```

What the read knows of each model it reads, by the product id it reports on USB: where its configuration starts
and the highest address one may end at. A remote whose product id is not here is refused by [`profileFor`](#profilefor).

Uses [`RemoteProfile`](#remoteprofile).

### `readConfig`

```ts
async function readConfig(
  reader: ConfigReader,
  profile: RemoteProfile,
  options: ReadOptions = {},
): Promise<ConfigRead>
```

Read the whole config, header first.

The version block is read before anything else because it is the cheapest thing that identifies
the unit, and a read filed without knowing which remote it came from is a file nobody can use.

Uses [`ConfigReader`](#configreader), [`RemoteProfile`](#remoteprofile), [`ReadOptions`](#readoptions), [`ConfigRead`](#configread).

### `ReadError`

```ts
class ReadError extends Error {}
```

A read that cannot go on: a remote the read does not know, a configuration whose header, length, end marker or
checksum is wrong, or fewer bytes than were asked for. Nothing is handed back when it is thrown.

### `ReadOptions`

```ts
interface ReadOptions {
  /** Bytes per `READ_FLASH`. 16 KiB is what the hardware tests use for the firmware read. */
  readonly chunkBytes?: number;
  readonly onProgress?: (progress: ReadProgress) => void;
  /** Told about every window that had to be asked for again, so a caller can say so out loud. */
  readonly onRetry?: (retry: WindowRetry) => void;
  /** Injectable so a test does not depend on a clock. */
  readonly now?: () => number;
}
```

How a read is run: the size of each request, and whom it tells of its progress and its retries.

Uses [`ReadProgress`](#readprogress), [`WindowRetry`](usb-types.md#windowretry).

### `ReadProgress`

```ts
interface ReadProgress {
  /** Bytes in hand, including the header probe. */
  readonly done: number;
  readonly total: number;
}
```

How far a read is, in bytes, as [`ReadOptions.onProgress`](#readoptions) is told after every chunk.

### `RemoteProfile`

```ts
interface RemoteProfile {
  readonly productId: number;
  readonly model: string;
  readonly architecture: number;
  /** The address a `READ_FLASH` command must name to reach the start of the config. */
  readonly configBase: number;
  /** Where the config region ends, in the same space as `configBase`. */
  readonly configEnd: number;
  /** The base the container's **own** pointers count from, when that is not `configBase`. */
  readonly containerBase?: number;
  /**
   * Set when no remote of this model has ever been connected here, so the entry rests on a
   * published report rather than on a measurement. The read still checks itself, because
   * `parseHeader` refuses anything that is not a container, so a wrong base fails loudly.
   */
  readonly unverified?: true;
}
```

Everything that differs between the kinds of remote a configuration is read off, one profile per product id.
