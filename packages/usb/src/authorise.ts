/**
 * The guard's escape hatch, kept out of the package's barrel.
 *
 * **This module exists because the hatch was public.** `guardMutations` refuses a mutating report it
 * was not handed by a rail checked path, and the way `HarmonyRemote` tells it a rail passed was a
 * method called `authoriseReport` **on the transport object itself**, which `openHarmony` returns to
 * anybody who asks. So two lines reached `ERASE_FLASH` with writing disabled, at `0x3D0000`, which is
 * where the stored application firmware sits and is deliberately outside the writable ceiling:
 *
 *     const t = await openHarmony({ productId: 0xc121 });
 *     t.authoriseReport(report); await t.write(report);
 *
 * No flag, no architecture check, no permission object, no block alignment, no ceiling. Section 224,
 * and it is the **third** occurrence of one shape: 13 August 2026 hid the four named write encoders
 * and left the generic one, 27 August closed the generic one by adding this guard, and both times the
 * fix addressed the instance while the class stayed open. The guard's own docstring said that
 * reaching it at all meant a rail had said yes, which was a comment asserting a property the code did
 * not enforce.
 *
 * So the hatch is a module boundary now, which is the protection level this package already chose for
 * `writes.ts`: `index.ts` does not re-export either file, so a consumer of `@harmony/usb` has no way
 * to reach them, and somebody importing `../src/authorise.ts` by path is doing something deliberate
 * rather than something available. That is the honest description of what this stops. It stops the
 * accident and it makes the deliberate act look deliberate.
 *
 * A `WeakMap` rather than a property, because the point is that the permission is **not** on the
 * object the caller holds.
 */
import type { Transport } from './transport.ts';

const pending = new WeakMap<Transport, Uint8Array>();

/**
 * Permit exactly this report, once, on this transport.
 *
 * Called by `HarmonyRemote` after the rail for the operation has passed. A copy is stored, so a
 * caller mutating its own buffer afterwards cannot change what was permitted.
 */
export function authoriseReport(transport: Transport, report: Uint8Array): void {
  pending.set(transport, Uint8Array.from(report));
}

/** The authorisation for this transport if there is one, consuming it either way. */
export function takeAuthorisation(transport: Transport): Uint8Array | undefined {
  const was = pending.get(transport);
  pending.delete(transport);
  return was;
}
