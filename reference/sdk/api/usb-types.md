# More types of `@freeharmony-sdk/usb`

<!-- introduction -->
Types that names of the USB package use and that it does not export by name. An application meets them inside
what it is given and never has to import them.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

### `TouchAnswer`

```ts
interface TouchAnswer {
  /** The request's name, as the rail decoded it. */
  readonly name: string;
  readonly tier: TouchRequestTier;
  /** The answer as the remote served it, `Response,` and JSON, or empty when it served nothing. */
  readonly text: string;
  /** For a write of answers, what the remote answered its announcement. */
  readonly announcement?: string;
}
```

What a request answered.

Uses [`TouchRequestTier`](#touchrequesttier).

### `TouchRequestSession`

```ts
interface TouchRequestSession {
  request(line: string): Promise<TouchAnswer>;
}
```

A session on one Touch. **`request` is its whole surface**, which a test enumerates: the transport, the
identity file and the unit record stay in the closure, so nothing reachable from the object can send a
report around the rail.

Uses [`TouchAnswer`](#touchanswer).

### `TouchRequestTier`

```ts
type TouchRequestTier = 'read' | 'sync' | 'recovery' | 'announcement';
```

Which list a request line's name is on.

### `WindowRetry`

```ts
interface WindowRetry {
  /** The absolute flash address the window starts at, as it was sent. */
  readonly at: number;
  /** 1 for the first retry, up to `MAX_WINDOW_RETRIES`. */
  readonly attempt: number;
  /** What the failed attempt threw, passed on untouched so a caller can print the real reason. */
  readonly error: unknown;
}
```

One window that had to be asked for again: where it starts, which retry this is, and why.
