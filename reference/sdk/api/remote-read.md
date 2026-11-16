# `@freeharmony-sdk/remote/read`

<!-- introduction -->
The read alone, without the USB package: for an application, a browser page among them, that reaches the remote
through a transport of its own and hands the read an object that answers its requests.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

The read's own limit on retries, offered beside the read so that a caller of the read alone finds it here. The value lives once, in the USB package, beside the loop it bounds.

### `ConfigHeader`

```ts
interface ConfigHeader {
  readonly family: Family;
  readonly endAddr: number;
  readonly format: number;
  /** Container length in bytes, end marker included. */
  readonly length: number;
}
```

What the first bytes of a configuration state: which container it is, where it ends, its format word, and the
length that gives.

Uses [`Family`](config-types.md#family).

* `ConfigRead`: documented on [`@freeharmony-sdk/remote`](remote.md#configread).
* `ConfigReader`: documented on [`@freeharmony-sdk/remote`](remote.md#configreader).

### `DEFAULT_CHUNK_BYTES`

```ts
const DEFAULT_CHUNK_BYTES = 16384
```

The bytes asked for in one request when [`ReadOptions.chunkBytes`](remote.md#readoptions) does not say, 16 KiB.

### `HEADER_PROBE`

```ts
const HEADER_PROBE = 16
```

Enough bytes to hold the magic, `end_addr` and the format word.

### `isSilence`

```ts
function isSilence(err: unknown): boolean
```

A reply that never came, as opposed to one that came back wrong.

Two shapes, because the command layer reports silence differently depending on where it happens:
`exchange` says "no reply to command 0x10 within 3 polls" and `readFlash` says "flash read
returned 0 of 256 bytes". Both mean the same thing here.

### `MAX_WINDOW_RETRIES`

```ts
const MAX_WINDOW_RETRIES = 2
```

How many extra goes one window gets before the read fails.

### `parseHeader`

```ts
function parseHeader(head: Uint8Array, profile: RemoteProfile): ConfigHeader
```

Read the container header and work out how long the whole thing is.

The magic is checked against every known family rather than against `GSPM` alone, so a container
from an architecture not read yet still gets a sensible length instead of a refusal.

Uses [`RemoteProfile`](remote.md#remoteprofile), [`ConfigHeader`](#configheader).

* `profileFor`: documented on [`@freeharmony-sdk/remote`](remote.md#profilefor).
* `PROFILES`: documented on [`@freeharmony-sdk/remote`](remote.md#profiles).
* `readConfig`: documented on [`@freeharmony-sdk/remote`](remote.md#readconfig).
* `ReadError`: documented on [`@freeharmony-sdk/remote`](remote.md#readerror).
* `ReadOptions`: documented on [`@freeharmony-sdk/remote`](remote.md#readoptions).
* `ReadProgress`: documented on [`@freeharmony-sdk/remote`](remote.md#readprogress).
* `RemoteProfile`: documented on [`@freeharmony-sdk/remote`](remote.md#remoteprofile).
