/**
 * `@harmony/usb/internal`: the protocol and the transport's parts below the main entry, for this repository's
 * scripts, tests and the libraries built on this one, `todo.md` 7.3.6. Each module whole, so a name added to
 * one is here without a second list; the main entry, `index.ts`, is the designed surface and this is not.
 *
 * **What is deliberately not here**: the rails, `rails.ts`, which are `./rails`; the machinery that erases
 * and writes flash, `blockwrite.ts`, `filewrite.ts` and `rehearsal.ts`, which is `./write`; the request
 * encoders of the commands that change a remote, `writes.ts`, and the authorisation of a report,
 * `authorise.ts`, which no entry carries; and the Harmony Touch's request session, `./touchsession`.
 * `test/write/rails.test.ts` enumerates every entry for a request builder that writes and for a way to authorise one.
 */

// The command protocol: commands, selectors, the request encoders of the reads, and the version block.
export * from './protocol.ts';
// The transport: enumeration, the HID device, and the guard `openHarmony` puts on what it returns.
export * from './transport.ts';
export * from './remote.ts';
export * from './identity.ts';
export * from './compatible.ts';
// The file based family's protocol, read paths only, section 198.
export * from './filepipe.ts';
export * from './firmware.ts';
export * from './settings.ts';
// Asking for a failed flash window again, bounded; also its own subpath, `./readwindow`.
export * from './readwindow.ts';
