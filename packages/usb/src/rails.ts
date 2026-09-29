/**
 * The write rails, in the library rather than in the user interface.
 *
 * That placement is the whole point. A rail enforced by a dialog box is enforced until somebody
 * writes a script; a rail enforced here is enforced for every caller. `CLAUDE.md` states these as
 * absolute, and the reason they are absolute rather than cautious is that the devices are
 * irreplaceable and the service that made them can be withdrawn without notice: there is no
 * dependable way back from a bad write, only a dump taken beforehand. (This said "Logitech's
 * recovery servers are gone", which is wrong and `CLAUDE.md` corrects it: the MyHarmony service
 * answered on 7 August 2026 and compiled a config. The classic service is the one that is gone.
 * The rail does not change, because the half that carries it is that a remote is irreplaceable.)
 *
 * Nothing in this module talks to a device. It answers one question, "is this write allowed", and
 * the answer is no unless every condition is met.
 */

import { ESCAPE_END_SESSION, ESCAPE_RESET, ESCAPE_SUB_COMMANDS, SOFTWARE_TYPE_SAFE_MODE, readVersion } from './protocol.ts';
import { compareIntendedVersion } from './compatible.ts';
import { sameUnit } from './identity.ts';
import { checkFirmwareImage } from './firmware.ts';
import type { Compatibility, StatedVersion } from './compatible.ts';

export class RailError extends Error {}

/**
 * The base of the user config region, per architecture. A write outside it is refused here.
 *
 * These are not guesses: they are where each architecture's user config is stored, and the
 * firmware itself reads the container from there.
 *
 * **This floor is what keeps a mistyped address away from the safe mode image, and on arch 14 it is
 * the only thing that does.** The Harmony One's firmware has an interlock of its own, section 175: a
 * write below `0x020000`, where safe mode lives at `0x002000`, needs a bit that is set at boot and on
 * every main loop pass, and only an ERASE_FLASH below `0x020000` clears it. So a stray low write there
 * does nothing. **Do not read that as cover.** Arch 14 has no such bit in either write executor, the
 * ordering that would let a low write slip through the Harmony One's interlock is unread, and section
 * 175 records two confident readings of this same bit that were both wrong. Losing safe mode is what
 * section 118 measured turning a recoverable remote into a stranded one, so the floor refuses rather
 * than reasons.
 */
export const CONFIG_REGION_BASE: Readonly<Record<number, number>> = {
  9: 0x820000, // Harmony 525
  12: 0x040000, // Harmony One
  14: 0x030000, // Harmony 600 and 700
  // **The arch 9 row landed on 5 September 2026, section 267.** This carried no entry and said the
  // erase block size "is the other half and is unmeasured. Both land together or neither does."<!--superseded-->
  // The block size is read now, out of the 525's own application image: its external flash driver
  // sends the SPI opcode `0xD8`, a 64 KiB block erase, and nothing masks the address, so the
  // granularity is the part's. All three tables gained a row in the same commit, which is what that
  // sentence asked for.
  //
  // **A Harmony 525 keeps its configuration at `0x820000`** with the application firmware at
  // `0x810000` and the safe mode image at `0x800000` directly below it, `docs/memory-map-525.md`.
  // Those neighbours are the reason the arch 9 rail matters more than arch 12's rather than the
  // same: section 267 read the erase and write handlers and **the firmware bounds them to the flash
  // part and nowhere finer**, so every one of the eight blocks is reachable, including both firmware
  // images. Arch 12 (Harmony One) has section 192's classifier ceiling and section 175's bit doing
  // some of this work in the remote; arch 9 (Harmony 525) has nothing there, and this table is the
  // only thing in the way.
  //
  // **Three constants were still not a write target**, and that held for exactly one day. This said
  // `ARCHITECTURES_WITH_A_WRITE_TARGET` "is `[12]` and this commit does not change
  // it"<!--superseded-->, on the ground that what these rows buy is a refusal naming the missing
  // demonstration rather than a missing number. Section 269 performed the demonstration on 6
  // September 2026 and the list was `[9, 12]`, and `[9, 12, 14]` since section 281. The distinction the wording was drawing is still the
  // right one and is easier to see now that both halves have happened: the rows say where a write
  // would be bounded, the list says whether anything may write, and the rows did not move when the
  // permission did.
  //
  // **The erase granularity is measured on the part since that run**, which is what the rows above
  // could only predict: the blocks either side of `0x820000` were read before the erase and again
  // after it and are byte identical, so a 64 KiB request is a 64 KiB erase on this chip.
};

/**
 * Architectures that have a write target at all.
 *
 * Nine remotes are on the bench: a programmed Harmony One, a Harmony 600, a spare Harmony One, a
 * Harmony 525, since 27 August 2026 a Harmony Touch, a Harmony 350 and a Harmony 300, none of which
 * this library can even open, since 27 September 2026 a Harmony 650, and since 29 September 2026 a
 * Harmony 700. **Three units may be
 * written to**: the spare Harmony One, which is arch 12, and the Harmony 525, which is arch 9, by
 * Danny's decision of 5 September 2026, and the Harmony 650, which is arch 14, by his decision of 27
 * September. **Five since 29 September 2026**: the Harmony 600 and the Harmony 700, both arch 14, by
 * Danny's decision that day. His everyday Harmony One is excluded by name. This said "the 600
 * because it is the only arch 14 remote in existence here"<!--superseded--> and that "arch 14 has no
 * write target"<!--superseded--> until the 650 arrived, which was exactly the condition it named for
 * reopening: a second arch 14 remote.
 *
 * **This list says nothing about which arch 14 unit is on the cable**, and that is the part to read
 * twice. The 600 and the 650 report the same product id and architecture, so this list cannot tell
 * them apart; `assertUnitIsPermitted` can, from the identity block read off the unit, and a
 * permission naming one unit's record refuses every other. So the unit check is the rail that
 * carries each exclusion, on arch 12 separating the spare from the everyday One and on arch 14 a
 * write meant for one unit from the other two. Section 281.
 *
 * **Arch 9 was added on 6 September 2026, on Danny's word, for the block rehearsal.** It had been
 * permitted since 5 September and refused by this list, which is the distinction the module rests
 * on: permission is not capability, and section 267 supplying every constant a write needs did not
 * change the answer either. What changed is that the demonstration was authorised, and it is the
 * same shape as arch 12's first write, section 222: one erase block of the remote's own bytes,
 * written back unchanged, against a region dump read off that unit and compared byte for byte first.
 *
 * **Two things this list used to gate that it deliberately no longer does, because adding arch 9
 * would have opened them unasked.** Both are now refused by a check of their own rather than by this
 * list being short, so the widening does not travel:
 *
 * * the **reset escape**, `0x02`, which reboots the remote. `assertResetAllowed` checks
 *   `ESCAPE_SUB_COMMANDS` at runtime, and arch 9 has no row there because nothing has read its
 *   escape dispatcher. That check had been removed as unreachable, which it was while this list was
 *   `[12]`; it is reachable now, which is exactly why it is back.
 * * the **RAM write**, `WRITE_MISC` selector `0x07`, which goes through
 *   `ARCHITECTURES_WITH_A_RAM_WRITE_TARGET` instead. Arch 9's selector 7 executor is unread.
 *
 * So an architecture arriving on this list gets the flash block path and nothing else, and each
 * further path is a decision with its own evidence rather than a side effect of this line.
 */
export const ARCHITECTURES_WITH_A_WRITE_TARGET: readonly number[] = [9, 12, 14];
//
// **Arch 14 joined on 27 September 2026, for the Harmony 650**, section 281. Danny's decision: a
// second hand Harmony 650 arrived, arch 14 like the 600, and may be reprogrammed freely. The 600 was
// excluded by name until his decision of 29 September 2026 admitted it and the Harmony 700, and it is
// **the identity check** that holds each unit's line, not this list, since both remotes are arch 14
// and both enumerate as `0xC122`: a permission names one unit's record, and the 600's identity block
// differs from the 650's, compared off both units' own internal page reads. What this admits is the flash block path and nothing else,
// the same shape as arch 9's arrival: the reboot and the invalidate have lists of their own below,
// and arch 14 was on neither, because arch 14 dispatching an escape is not the same as anybody having
// sent one to it. It joined both in section 282, each on its own reading of the 650's build.

/**
 * Architectures a config writer may **restart**, the escape's `0x02`, which is not the write list.
 *
 * Split out on 27 September 2026, section 281, and the reason is the one section 269 recorded for the
 * RAM write: arch 14 (Harmony 600, 650 and 700) dispatches the reset escape, `ESCAPE_SUB_COMMANDS`
 * has its row, so the only thing between a Harmony 650 joining the write list and a reboot command
 * nobody has sent to that architecture was the list it joined. Arch 12 (Harmony One) has had it sent,
 * section 247. Arch 9 (Harmony 525) has no escape row and `assertResetAllowed` refuses it on that
 * ground as well.
 *
 * **Arch 14 joined on 27 September 2026, section 282**, Danny's decision, once the path had been read
 * on the Harmony 650's own build rather than only on the Harmony 700's, section 97: the escape's
 * `0x02` sets one flag, the main loop turns it into mode 3, and mode 3 waits and executes `RESET`,
 * with nothing on the way that writes program memory. The 600's bytes are identical, and the unit check
 * is what keeps a restart off it.
 */
export const ARCHITECTURES_WITH_A_RESET_TARGET: readonly number[] = [12, 14];

/**
 * Architectures a config writer may send the **invalidate** to, `WRITE_MISC` selector `0x02`, which
 * is not the write list either.
 *
 * Split out on 27 September 2026, section 281, for arch 14's sake: the invalidate took write
 * permission and nothing else, so a Harmony 650 on the write list would have been handed a command
 * whose arch 14 executor nobody has read. **The list keeps exactly what was permitted before**, arch
 * 12 (Harmony One), where it has been sent and its effect measured, sections 247 to 251, and arch 9
 * (Harmony 525), which was reachable through the write list since section 269 and has not been sent
 * one. Narrowing arch 9 is a separate decision and this commit does not take it.
 *
 * **Arch 14 joined on 27 September 2026, section 282**, Danny's decision, after its executor was read
 * on the Harmony 650's own build: four five byte records in data memory cleared, the verdict and the
 * container select bits cleared, and a flag set that the **next** `ERASE_FLASH` consumes. That last
 * part is the difference from arch 12 and it is not this command's effect but the erase's: the first
 * erase after a drop consumes the flag wherever it is, and if that erase is at `0x030000` it may
 * update one setting in the remote's settings store in internal program memory at `0x1EC00`, which on
 * both units read here would write nothing. The drop itself writes nothing persistent.
 */
export const ARCHITECTURES_WITH_AN_INVALIDATE_TARGET: readonly number[] = [9, 12, 14];

/**
 * Architectures whose data memory may be written, which is not the same list and is deliberately
 * narrower.
 *
 * `WRITE_MISC` selector `0x07` writes a byte into the data memory of a running remote. Its executor
 * has been read on arch 12 (Harmony One) and on **no other architecture**, so a RAM write elsewhere
 * is a command whose effect nobody here can state. That was covered by
 * `ARCHITECTURES_WITH_A_WRITE_TARGET` being `[12]` until 6 September 2026, when arch 9 (Harmony 525)
 * joined it for the flash rehearsal and would have taken the RAM path with it.
 *
 * **The bound above it is the other reason.** `SFR_PAGE_START` is `0xF40`, which is the PIC18F67J50
 * and 87J50 figure that arch 12 and arch 14 are; the PIC18F4550 that arch 9 is puts its registers at
 * `0xF60`, and arch 9's data memory is 2048 bytes, so an address between `0x800` and `0xF40` is
 * neither memory nor a register on that part and this rail would pass it. The lower bound is the
 * conservative one for the page, and it is not the whole story on a part with less RAM.
 */
export const ARCHITECTURES_WITH_A_RAM_WRITE_TARGET: readonly number[] = [12];

/**
 * The highest address a write or an erase may reach, per architecture.
 *
 * **Not the same as the top of the config region, and that is the point.** Arch 12's config region
 * is nominally `0x040000` to `0x400000`, which is the range the log area's own writer enforces,
 * section 47. But Logitech's client declares the remote's stored application firmware at
 * `0x3D0000`, inside that range, so the last 192 KiB of the nominal region is not spare at all.
 * A writer that trusted the nominal top would erase the firmware.
 *
 * **Measured on 9 August 2026, on a Harmony One, and it was right.** This was adopted from the
 * vendor client as an unconfirmed number, on the argument that it only makes the rail refuse more,
 * with a note to confirm it before anything relied on it. Reading the remote's own flash at
 * `0x3D0000` returns an image header with the `48 47` magic and version `0x34`, byte identical to
 * the 3.4 package's application phase and to the running copy at `0x020000`. So the top 192 KiB of
 * the nominal config region holds the firmware, on the actual device, and **on both Harmony Ones**:
 * the programmed one has had nothing but reads from this project, so this is a property of the
 * model rather than something a vendor sync left behind. `docs/findings.md` section 88.
 *
 * That read had never happened before because this library refused the address: arch 14's bound had
 * been applied to arch 12 as well. Worth remembering as a shape: a wrong refusal hides whatever it
 * refuses, and the thing it was hiding here is the reason this constant exists.
 */
export const WRITABLE_CEILING: Readonly<Record<number, number>> = {
  // **The log area is the ceiling on arch 9 (Harmony 525)**, not the top of the part. The
  // configuration starts at `0x820000` and `docs/memory-map-525.md` puts the log area at
  // `0x870000`, so this stops one block below it. The part itself ends at `0x880000` and the
  // contributor's own "384 KiB" figure counts that whole span; taking the larger number would put
  // the log inside the writable range for no gain, since no configuration here comes near it.
  9: 0x870000,
  12: 0x3d0000,
  // **The top of the part on arch 14 (Harmony 600, 650 and 700)**, added on 27 September 2026 for
  // the Harmony 650, section 281. The external flash is 2 MiB and the firmware's own address
  // classifier refuses a top byte of `0x20` or more, section 192, asserted on four arch 14 images:
  // the Harmony 600's, the Harmony 700's and both of the Harmony 650's. Nothing is known to live above the
  // configuration on this architecture, where the log area's writer does not exist, so the ceiling
  // is the part's end rather than something below it. Below the region sit the safe mode
  // configuration at `0x020000` and, on the Harmony 600, the stored application at `0x000000`, which
  // `CONFIG_REGION_BASE` keeps out of reach.
  14: 0x200000,
};

/**
 * The flash erase block size, per architecture.
 *
 * `ERASE_FLASH` carries an address and no count, so the caller cannot scope an erase and the
 * hardware decides how much goes. Logitech's client picks a block table from the flash chip's
 * JEDEC manufacturer and device id, and for every chip it lists against arch 12 the region above
 * `0x010000` is uniform 64 KiB blocks, so an erase anywhere in the config region takes 64 KiB
 * with it. The boot block area below `0x010000` is finer and **its shape is per chip**, section
 * 221: eight 8 KiB blocks on the part both bench Harmony Ones report, `16K, 8K, 8K, 32K` on one of
 * the others. Either way it is outside the config region and therefore outside anything this
 * module permits.
 *
 * **The row for the bench part is identified since 30 August 2026**, section 221, which is the
 * confirmation the paragraph below asks for rather than only proposes: the remotes report `1F:C8`,
 * that is Atmel `AT49BV322A` in the client's own constants, and walking its table from zero puts
 * `0x040000` on a boundary in a 64 KiB block. `tests/test_host_client.py` asserts this constant
 * against that walk.
 *
 * **Provenance is not the same as `WRITABLE_CEILING`'s, and this said it was.** That one was adopted
 * from the client and then **measured on two Harmony Ones**, section 88. This one is still the
 * client's word alone: `docs/host-client.md` says so, and the firmware argument sometimes offered
 * for it establishes a 64 KiB **addressing window** rather than the chip's erase sector, which are
 * different quantities. The direction is still safe, since a rail built on a block size only ever
 * refuses more addresses than a smaller true block would require. What it did **not** protect was
 * `rehearse-block.ts`, which reads back and restores exactly one block: if the true block were
 * larger the erase would reach past what it rewrites, and a run that only ever looked at the block
 * it wrote would report success. **That script measures it now**, since 30 August 2026: it reads
 * the block either side before the erase and again after it and refuses if either moved, so the
 * first run ever performed turns this constant from the client's word into a measurement on the
 * unit in front of it. **It was measured on 30 August 2026 and it is 64 KiB**, section 222: the
 * rehearsal erased `0x040000` on the spare Harmony One with the blocks either side read before and
 * after, and both are byte identical. So this constant is no longer client sourced for arch 12. The
 * client's table and section 221's row for the part agree with the measurement, which is a closure
 * between a vendor table and a remote rather than a second opinion about one of them. Every other
 * architecture in this table, if one is ever added, is back to the client's word.
 *
 * **That last sentence held for one architecture's worth of time**, section 267: arch 9 (Harmony
 * 525) was added on 5 September 2026 off its own **firmware** and off concordance's chip table,
 * which are two sources and neither is the client's. The rule to carry is that a row states its
 * source, which the comments inside the table now do.
 */
export const ERASE_BLOCK_SIZE: Readonly<Record<number, number>> = {
  // **Arch 9 (Harmony 525) has two independent sources**, section 267. The firmware is the first:
  // the external flash driver at `0x07576` sends `0xD8`, which is a 64 KiB block
  // erase. **Nothing rounds the address down to a boundary**: the classifier has already taken the
  // window tag off it and `0x03500` copies the three bytes that remain straight into the address
  // the part is handed, so the block is whatever the part does with that opcode and an unaligned
  // erase is the part's business rather than the firmware's. The closure is that the command's
  // accepted window tags, `0x80` to `0x87`, are exactly eight of these blocks and the part is
  // 512 KiB.
  //
  // concordance is the second and it never reads that opcode: it looks the sector table up from the
  // JEDEC identity the remote reports, and `0xFF:0x12` gives a 25F040 of 512 KiB whose boundaries
  // run `0x010000` to `0x080000` a block apart. Eight uniform 64 KiB sectors, stated rather than
  // derived. So this row is better supported than the client's word and still weaker than arch 12's
  // below, which was measured by erasing a block on a remote and reading its neighbours.
  //
  // **An erase block belongs to a part and not to an architecture**, which concordance's shape makes
  // plain and this table's shape hides. Each architecture here happens to have one part; section 221
  // is the case where that stopped being true, three parts against arch 12 (Harmony One).
  9: 0x10000,
  12: 0x10000,
  // **Arch 14 (Harmony 600, 650 and 700) reads off its own firmware, four images**, section 281.
  // The eraser sends `0xD8`, the 64 KiB block erase of the EON F16 part these remotes report as
  // `15:1C`. The routine starts at `0x1745C` in both the Harmony 600's and the Harmony 650's 0.2,
  // which are two builds of one program and carry it at the same address, and loads the opcode at
  // `0x17462`; in the Harmony 650's 0.4 package the load is at `0x18B9E` and in the Harmony 700's 2.8
  // at `0x18DC6`, whose routine starts at `0x18DC0`. The part also has a 4 KiB sector erase, `0x20`,
  // which none of the four sends. **Measured on the part since the first write on the Harmony 650**,
  // section 281: the blocks either side of `0x030000` were identical before and after the erase.
  14: 0x10000,
};

/**
 * The build flag. Off unless the environment says otherwise, and it is read once, here.
 *
 * Version 1 of the application is read only: the write code exists so that it is written and
 * reviewed rather than improvised later, and it does not run. An environment variable rather than
 * a compile time constant because it has to be provable from the outside: you can check what a
 * shipped build will do without reading it.
 */
export const WRITES_ENABLED: boolean = process.env['HARMONY_ENABLE_WRITES'] === '1';

/**
 * Everything that has to be true before a write is even considered.
 *
 * Deliberately not defaulted. A caller that has not thought about whether there is a verified
 * dump of this exact unit cannot construct one of these by accident, and the booleans that remain
 * are facts about the world that no code here can check for itself.
 *
 * **One of them stopped being a boolean on 30 August 2026**, section 225. `intendedVersionMatches`
 * asked the caller whether the config's `INTENDEDVERSION` matches the connected remote, over six
 * fields, and the answer every caller gave was `true`. So the rail whose whole job is refusing a
 * config built for a different remote was a comment. It takes the two **inputs** now, what the
 * config states and what the remote reported, and performs the comparison itself, which is the only
 * shape a caller cannot get wrong by being optimistic.
 */
export interface WritePermission {
  /** The architecture of the connected remote, as the remote itself reports it. */
  readonly architecture: number;
  /** Length in bytes of the config being written, which bounds the region. */
  readonly configLength: number;
  /** A verified original dump of this exact unit exists in the lab. */
  readonly originalDumpVerified: boolean;
  /**
   * What the config's wrapper states about the remote it was built for, exactly as it states it.
   *
   * The six fields are protocol, skin, flash, board, `SOFTWARETYPE` and `ARCHITECTURE`, section 87,
   * and `compareIntendedVersion` is what compares them. An absent or empty field matches anything,
   * per the format's own rule, so `{}` is legal and means the config claimed nothing: a container
   * read off a remote has no wrapper and therefore no claim. A field this library cannot compare is
   * a refusal rather than something skipped.
   *
   * **This was a boolean until 30 August 2026** and the note attached to it was about the six
   * fields being four in an earlier reading. That was the right worry about the wrong thing: the
   * risk was never that a caller would compare the wrong number of fields, it was that no caller
   * compared any of them. Section 225.
   */
  readonly intendedVersion: StatedVersion;
  /**
   * The remote's own `GET_VERSION` reply, as it came off the wire.
   *
   * Both halves of the compatibility check come from here: the fields the config is compared
   * against, and the architecture, which is cross checked against `architecture` above rather than
   * taken on the caller's word. A caller that read a version block from one remote and an
   * architecture from somewhere else is refused.
   */
  readonly versionBlock: Uint8Array;
  /**
   * The identity block read off the connected remote, as `readUnitIdentity` returned it.
   *
   * **This was `targetIsTheSpareRemote`, a boolean, until 30 August 2026**, section 226. Two Harmony
   * Ones enumerate identically, so section 188 recorded the question as one the library could not
   * answer, and every caller answered it `true`. It can be answered: the unit's own program memory
   * holds a 64 byte identity block whose two GUIDs are what Logitech's own service takes as a
   * serial. Danny's decision was to identify a unit the way the vendor does rather than to invent a
   * fingerprint, which was this project's own earlier proposal.
   */
  readonly identityBlock: Uint8Array;
  /**
   * The identity of the unit that **may** be written to, from wherever the caller keeps it.
   *
   * Not a table in this library, deliberately: a unit identifier is that unit's hardware identity, so
   * the bench keeps it in the private lab and FreeHarmony keeps it with the user's own data. Either
   * the whole block or the 32 byte discriminator, since a stored copy is the shorter one.
   */
  readonly permittedUnit: Uint8Array;
}

function assertPermissionIsUsable(p: WritePermission): void {
  if (!WRITES_ENABLED) {
    throw new RailError(
      'writing is disabled: this build is read only (set HARMONY_ENABLE_WRITES=1 knowing why)',
    );
  }
  if (!ARCHITECTURES_WITH_A_WRITE_TARGET.includes(p.architecture)) {
    throw new RailError(
      `architecture ${p.architecture} has no write target on the bench, so writing to it is refused`,
    );
  }
  assertUnitIsPermitted(p);
  if (!p.originalDumpVerified) {
    throw new RailError('no verified original dump of this unit: refusing to write');
  }
  assertConfigIsForThisRemote(p);
}

/**
 * Throws unless the config was built for the remote that sent this version block.
 *
 * Split out from `assertPermissionIsUsable` because it is the one condition in there with a
 * derivation behind it rather than a boolean to read, and because a caller wanting to show the
 * comparison before deciding anything needs it on its own. `compareIntendedVersion` is where the
 * per field mapping lives and section 225 is the evidence for it.
 *
 * Two refusals, and the second is the cheap one worth having: a version block that is not an
 * identity at all, and an architecture that disagrees with the number the caller passed.
 */
export function assertConfigIsForThisRemote(
  p: Pick<WritePermission, 'architecture' | 'intendedVersion' | 'versionBlock'>,
): Compatibility {
  let reading;
  try {
    reading = readVersion(p.versionBlock);
  } catch (error: unknown) {
    throw new RailError(
      `the remote's version block is not an identity, so nothing can be compared against it: ${
        error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (reading.architecture !== p.architecture) {
    throw new RailError(
      `the version block says architecture ${reading.architecture} and the permission says ` +
        `${p.architecture}: refusing to write on two readings of the same remote that disagree`,
    );
  }
  let comparison;
  try {
    comparison = compareIntendedVersion(p.intendedVersion, reading);
  } catch (error: unknown) {
    throw new RailError(
      `the config states a version field this library cannot compare, so a match would mean ` +
        `nothing: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!comparison.compatible) {
    const detail = comparison.fields
      .filter((f) => f.verdict === 'mismatch')
      .map((f) => `${f.field}: config says ${f.stated}, remote says ${f.reported}`)
      .join('; ');
    throw new RailError(
      `the config's INTENDEDVERSION does not match the connected remote (${detail})`,
    );
  }
  return comparison;
}

/**
 * Throws unless the remote on the cable is the one that may be written to.
 *
 * A byte comparison of what the unit reports against what the caller has recorded, section 226,
 * which replaces the boolean `targetIsTheSpareRemote`. Three refusals and the third is the one worth
 * having:
 *
 * * the two identities differ, so this is a different unit
 * * either is the wrong length to be an identity at all
 * * **either carries no per unit value**, its GUID fields being uniform filler. That is the trap
 *   this whole path is about: the field named the serial is `0xEE` on every remote read here, so a
 *   comparison of the obvious field matches every unit against every other and reports a confident
 *   yes. `identifiesAUnit` refuses instead, and a refusal that says "this cannot be told" is the
 *   only honest answer there.
 */
export function assertUnitIsPermitted(
  p: Pick<WritePermission, 'identityBlock' | 'permittedUnit'>,
): void {
  let same;
  try {
    same = sameUnit(p.identityBlock, p.permittedUnit);
  } catch (error: unknown) {
    throw new RailError(
      `the connected unit cannot be identified, so it is not a permitted write target: ${
        error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!same) {
    throw new RailError(
      'the remote on the cable is not the unit this write is permitted for: its identity block '
        + 'differs from the recorded one. Two Harmony Ones enumerate identically, which is why this '
        + 'is checked against the unit and not against the model',
    );
  }
}

/** The half-open range a write may touch, for the architecture in `p`. */
export function writableRange(p: WritePermission): { start: number; end: number } {
  return writableRangeFrom(
    p.architecture,
    CONFIG_REGION_BASE[p.architecture],
    WRITABLE_CEILING[p.architecture],
    p.configLength,
  );
}

/**
 * The rule inside `writableRange`, apart from the two table lookups.
 *
 * **Exported so the ceiling hole can be tested at all**, the same reason `eraseBoundsFor` is. Until
 * section 281 arch 14 (Harmony 600, 650 and 700) was the architecture with a region and no ceiling,
 * which is the case the refusal below exists for; it has both now, and so does every other
 * architecture with a region, so no call through the tables reaches the branch. Taking the two
 * values as arguments keeps the rule testable without a table holding a hole on purpose.
 */
export function writableRangeFrom(
  architecture: number,
  start: number | undefined,
  ceiling: number | undefined,
  configLength: number,
): { start: number; end: number } {
  const p = { architecture, configLength };
  if (start === undefined) {
    throw new RailError(`no config region recorded for architecture ${p.architecture}`);
  }
  if (!Number.isInteger(p.configLength) || p.configLength <= 0) {
    throw new RailError(`implausible config length ${p.configLength}`);
  }
  const end = start + p.configLength;
  // **A hole in the table is a refusal, not "no ceiling".** This read `ceiling !== undefined &&`,
  // so an architecture with a config region and no recorded ceiling got an unbounded write, while
  // `assertEraseAllowed` reads the identical hole as a refusal. Two rails, one table, opposite
  // readings, and section 88's stated rule is that a table with a hole refuses. It was unreachable
  // then because `ARCHITECTURES_WITH_A_WRITE_TARGET` was `[12]` and arch 12 (Harmony One) had both
  // entries; adding arch 14 when a second unit arrived would have silently given its writes no upper
  // bound while its erases still refused. Section 139. That is what happened in section 281, and arch
  // 14 gained its ceiling in the same commit, so the branch is reached through `writableRangeFrom`.
  if (ceiling === undefined) {
    throw new RailError(
      `no writable ceiling recorded for architecture ${p.architecture}: refusing to write`,
    );
  }
  if (end > ceiling) {
    throw new RailError(
      `a config of ${p.configLength} bytes at 0x${start.toString(16)} ends at ` +
        `0x${end.toString(16)}, past the writable ceiling 0x${ceiling.toString(16)}`,
    );
  }
  return { start, end };
}

/**
 * Throws unless `count` bytes at `address` may be written. Never returns false: a refusal has a
 * reason, and a boolean loses it at exactly the moment somebody needs to know why.
 */
export function assertFlashWriteAllowed(
  p: WritePermission,
  address: number,
  count: number,
): void {
  assertPermissionIsUsable(p);
  const { start, end } = writableRange(p);
  if (count <= 0) throw new RailError(`a write of ${count} bytes is not a write`);
  if (address < start || address + count > end) {
    throw new RailError(
      `write of ${count} bytes at 0x${address.toString(16)} leaves the config region ` +
        `0x${start.toString(16)}..0x${end.toString(16)}`,
    );
  }
}

/**
 * The erase block size and the ceiling for an architecture, or a refusal naming which is missing.
 *
 * **Exported so the refusal can be tested at all.** Inside `assertEraseAllowed` it sat after
 * `assertPermissionIsUsable`, which already refuses every architecture outside
 * `ARCHITECTURES_WITH_A_WRITE_TARGET`, and that list was `[12]`, which has both entries. So the
 * branch was unreachable through any caller, and the rail nobody can trigger is the rail nobody has
 * tested: `rails.test.ts` checked the table's shape instead, which is the same defect one level up.
 * The lookup is the thing with a rule in it, so it is a function with a test rather than four lines
 * behind a gate. Section 139.
 */
export function eraseBoundsFor(architecture: number): { block: number; ceiling: number } {
  const block = ERASE_BLOCK_SIZE[architecture];
  const ceiling = WRITABLE_CEILING[architecture];
  if (block === undefined || ceiling === undefined) {
    throw new RailError(
      `no erase block size recorded for architecture ${architecture}: refusing to erase`,
    );
  }
  return { block, ceiling };
}

/**
 * Throws unless the flash may be erased at `address`.
 *
 * `ERASE_FLASH` takes an address and **no count**, so the erase granularity is the hardware's
 * sector size and the caller cannot scope it. Scoping therefore has to come from refusing
 * addresses.
 *
 * **This used to say "an erase near the top of the config region may well reach past it, and
 * nothing here can tell", and now something can.** The block size is known, `ERASE_BLOCK_SIZE`,
 * so the whole block an erase destroys is computable and the rail can require that all of it is
 * permitted. Two conditions, both refusals:
 *
 * * the address is a block boundary, because an unaligned address does not erase what the caller
 *   named. Logitech's own client walks its block table from zero and starts erasing at the first
 *   boundary **at or after** the address, so the block containing an unaligned address is left
 *   alone: the caller gets neither what it asked for nor an error.
 * * the whole block lies inside the region, up to `WRITABLE_CEILING` rather than up to the end of
 *   the config, since the bytes above a short config are still region and erasing them is not the
 *   failure worth guarding against. Erasing the stored firmware is.
 *
 * An architecture with no recorded block size is refused outright rather than falling back to the
 * old address-only check, which would be the weaker rail wearing the stronger one's name.
 */
export function assertEraseAllowed(p: WritePermission, address: number): void {
  assertPermissionIsUsable(p);
  const { start } = writableRange(p);
  const { block, ceiling } = eraseBoundsFor(p.architecture);
  if (address % block !== 0) {
    throw new RailError(
      `erase at 0x${address.toString(16)} is not on a 0x${block.toString(16)} block boundary`,
    );
  }
  if (address < start || address + block > ceiling) {
    throw new RailError(
      `erasing 0x${block.toString(16)} bytes at 0x${address.toString(16)} leaves the writable ` +
        `region 0x${start.toString(16)}..0x${ceiling.toString(16)}`,
    );
  }
}

/**
 * Throws unless a byte may be written into the data memory of a running remote.
 *
 * `WRITE_MISC` selector `0x07` is volatile: nothing survives a power cycle, so it cannot brick
 * anything. It is still a write to a live device, and it sits behind the same flag for that
 * reason and no other. Note what it does not need: a dump, or a matching INTENDEDVERSION, neither
 * of which means anything for RAM. It does still need the flag and the permitted unit, because the
 * point of a read only build is that it does not write.
 */
export function assertRamWriteAllowed(
  // `architecture` is optional here where `WritePermission` makes it required, and deliberately: a
  // rail is a runtime boundary and JavaScript crosses it, so a guard the type says is unreachable is
  // the shape `CLAUDE.md` warns about, an unreachable guard reading as protection. Widening the
  // parameter is what makes the check reachable and the test able to state it.
  p: {
    readonly architecture?: number | undefined;
    readonly identityBlock: Uint8Array;
    readonly permittedUnit: Uint8Array;
  },
  dataAddress: number,
): void {
  if (!WRITES_ENABLED) {
    throw new RailError('writing is disabled: this build is read only');
  }
  // The unit check, RAM included, and it is a comparison rather than a boolean since section 226.
  // Nothing survives a power cycle here, so this is not about bricking a remote; it is that a read
  // only build must not disturb a variable on somebody's working unit either.
  assertUnitIsPermitted(p);
  // An architecture check, like every other write rail here. It had none, so a caller passing
  // `targetIsTheSpareRemote` reached `WRITE_MISC` on a Harmony 600 or a Harmony 525, whose selector 7
  // executors nobody has read. Section 139.
  //
  // **The list was `ARCHITECTURES_WITH_A_WRITE_TARGET` until 6 September 2026**, on the stated
  // ground that it "is the same list flash uses and the reason is the same"<!--superseded-->. The
  // reason is the same and the list is not: arch 9 joined the flash list that day for the block
  // rehearsal, and its selector 7 executor is still unread, so sharing one list would have opened a
  // RAM write on the strength of a flash demonstration. One list per path, and each path's list
  // moves when that path's own evidence does.
  if (p.architecture === undefined
      || !ARCHITECTURES_WITH_A_RAM_WRITE_TARGET.includes(p.architecture)) {
    throw new RailError(
      `architecture ${p.architecture ?? 'unknown'} has no RAM write target; only `
        + `${ARCHITECTURES_WITH_A_RAM_WRITE_TARGET.join(', ')} has one, and being allowed to write `
        + 'flash there is a different question with different evidence behind it',
    );
  }
  if (!Number.isInteger(dataAddress) || dataAddress < 0 || dataAddress >= SFR_PAGE_START) {
    // **The reason this bound exists is that "volatile" is an assumption about the address, not about
    // the command.** `writeRam`'s own comment called the write volatile and therefore harmless, and
    // the request carries a sixteen bit data address: on this MCU family bank 15 from `0xF40` up is
    // the special function registers, and Microchip's own `p18f87j50.inc` puts `EECON1` at `0xFA6`,
    // `EECON2` at `0xFA7`, `TABLAT` at `0xFF5` and `TBLPTR` at `0xFF6` to `0xFF8`. Those are the self
    // programming path: a sequence of single byte writes is what a flash write on a PIC18 is made of.
    //
    // Whether the firmware's own handler bounds the address is **unread**, and that is exactly why the
    // rail does not depend on the answer. Below the SFR page a write can only disturb a variable, and
    // a hang resets the device, section 100. Above it, nobody here can say what it can do.
    throw new RailError(
      `data address 0x${Number(dataAddress).toString(16)} is not below the SFR page at ` +
        `0x${SFR_PAGE_START.toString(16)}: bank 15 holds EECON1, EECON2, TABLAT and TBLPTR, which ` +
        `are the self programming path, so a write there is not volatile`,
    );
  }
}

/**
 * Where the special function registers start on the PIC18F67J50 and 87J50, the parts arch 12 and
 * arch 14 are.
 *
 * The same constant as `SFR_PAGE_START` in `src/harmony/pic18/isa.py`, and the same provenance,
 * Microchip's own `p18f87j50.inc`. It is 0xF60 on the PIC18F4550 that arch 9 is, which does not matter
 * here because arch 9 has no **RAM** write target. That used to read "because arch 9 has no write
 * target"<!--superseded-->, which stopped being true on 6 September 2026 when the flash rehearsal was
 * authorised, and is why the RAM path has a list of its own: the lower of the two pages is the safe
 * one to bound against either way, and a test says so rather than leaving it to be re-derived.
 */
export const SFR_PAGE_START = 0xf40;

/**
 * Throws unless the session-end escape may be sent to this remote.
 *
 * `0xE0 0x01` clears the command state variable and nothing else, `docs/findings.md` sections 97 and
 * 99. It touches no storage, volatile or otherwise, so it cannot corrupt anything: the worst it can
 * do is abandon a command that was in progress, and abandoning commands is what closing a handle
 * already does. It is here rather than on the read path anyway, because it changes a device's state
 * and the point of a read only build is that it does not.
 *
 * **Why it exists at all.** A remote whose command state is left nonzero cannot take the
 * unconditional path out of USB mode when its cable goes, so it sits there until its batteries come
 * out. That was seen twice on the bench on 9 August 2026. This command clears exactly that gate.
 *
 * **What this rail deliberately does not decide.** Whether FreeHarmony may send it at the end of
 * every read only session is a judgment call and is not settled by this function existing: the
 * conditions below keep it to the spare remote and to an architecture whose escape has actually been
 * read, which is enough for the experiment and not enough for a product. Widening the permitted unit
 * beyond the bench spare is the decision, and it belongs in a commit that says so.
 *
 * Arch 9 is refused because nobody has read its escape. A read profile is not a write profile,
 * which is the same rule `ARCHITECTURES_WITH_A_WRITE_TARGET` states for flash.
 */
export function assertSessionEndAllowed(
  p: Pick<WritePermission, 'architecture' | 'identityBlock' | 'permittedUnit'>,
  subCommand: number,
): void {
  if (!WRITES_ENABLED) {
    throw new RailError(
      'writing is disabled: this build is read only (set HARMONY_ENABLE_WRITES=1 knowing why)',
    );
  }
  if (subCommand !== ESCAPE_END_SESSION) {
    throw new RailError(
      `escape sub-command 0x${subCommand.toString(16)} is not the session end: 0x02 and 0x03 ` +
        'reboot the remote, and 0x02 goes through assertResetAllowed rather than this rail',
    );
  }
  const known = ESCAPE_SUB_COMMANDS[p.architecture];
  if (known === undefined) {
    throw new RailError(
      `architecture ${p.architecture} has no escape read from its firmware, so sending one is refused`,
    );
  }
  if (!known.includes(subCommand)) {
    throw new RailError(
      `architecture ${p.architecture} does not dispatch escape sub-command 0x${subCommand.toString(16)}`,
    );
  }
  // Same comparison as every other rail, section 226: the unit on the cable against the one the
  // caller recorded, rather than a boolean the caller sets.
  assertUnitIsPermitted(p);
}

/**
 * Throws unless the cached region descriptors may be dropped: `WRITE_MISC` selector `0x02`.
 *
 * **Step 2 of a working config write**, section 245, and the reason it is gated at all is that it
 * changes a running device's state rather than that it endangers storage. Section 246 read the
 * executor before this was ever sent: on arch 12 it clears three five byte records in **data
 * memory** and a two byte entry each in a second table, reaches no flash gate at all, and so leaves
 * nothing behind that a power cycle would not.
 *
 * It takes the **full** write permission rather than the lighter one the session end takes, and that
 * is deliberate: its only purpose is to precede an erase, so a caller holding it already has a
 * verified dump and a config that matches the remote, and requiring them here means the sequence
 * cannot be half authorised. A caller that wants to drop caches for some other reason is a decision
 * to take in a commit that says so.
 */
export function assertInvalidateAllowed(p: WritePermission): void {
  assertPermissionIsUsable(p);
  // **Dormant since section 282**, when arch 14 joined and this list became equal to the write list,
  // so every architecture that gets past the line above is on it. It is kept because it wakes the
  // moment the write list grows without it, which is exactly the arrival it exists for; the test
  // pinning both lists is what says they are equal today.
  if (!ARCHITECTURES_WITH_AN_INVALIDATE_TARGET.includes(p.architecture)) {
    throw new RailError(
      `architecture ${p.architecture} may be written a block and not sent the invalidate: its `
        + '`WRITE_MISC` selector 2 executor is unread, and a flash demonstration buys no other path. '
        + 'Section 281.',
    );
  }
}

/**
 * Throws unless the remote may be restarted: the escape with sub-command `0x02`.
 *
 * **Step 7 of a working config write**, section 245. concordance sends exactly this and then waits
 * for the remote to come back on the bus, which is the battery pull that has been performed by hand
 * after every write on this bench. The firmware side was read long before, section 97: `0x02` sets a
 * flag whose single reader drives the top level mode to 3, and mode 3 waits and then executes the
 * PIC18 `RESET` instruction. So it is a deliberate reboot rather than a watchdog or a jump.
 *
 * **The handle dies with it**, so a caller must treat the transport as gone afterwards and must not
 * wait for a reply: nothing acknowledges a command that ends in a reset.
 *
 * Full write permission again, for the same reason as the invalidate: this is the last step of a
 * sequence, not a facility. Sending a reboot to a remote that this process has no business writing
 * to is exactly what the unit check exists to prevent, and `assertSessionEndAllowed` keeps the
 * lighter gate because `0x01` writes nothing and changes one variable.
 *
 * **It re-checks that the architecture dispatches the escape, and that check was absent for a
 * fortnight because it was genuinely unreachable.** This said it "deliberately does not re-check
 * that the architecture dispatches the escape"<!--superseded--> until 6 September 2026, on a sound
 * argument: the shared gate refuses every architecture outside
 * `ARCHITECTURES_WITH_A_WRITE_TARGET`, that list was `[12]`, arch 12 dispatches `0x02`, and an
 * unreachable guard is worse than none because it reads as protection. The claim lived in a test
 * instead, comparing the two tables.
 *
 * **Adding arch 9 to that list made it reachable in the same commit**, and the test caught it, which
 * is what the test was for. Arch 9 has no `ESCAPE_SUB_COMMANDS` row at all, because nothing has read
 * its escape dispatcher, so without this the rehearsal's widening would have handed the config
 * writer a reboot nobody has traced, on a remote nobody has written to. The reasoning that removed
 * the check was right about the code and its premise expired, which is the shape worth remembering:
 * a guard justified by another table's contents needs re-deriving whenever that table moves.
 *
 * The test stays as well, since the two claims differ: this refuses at runtime, and the test says
 * the tables have not drifted. **Since section 281 a second check follows it**, the reset list, which
 * refuses an architecture whose escape is traced and which nobody has decided to reboot. It refused
 * arch 14 (Harmony 600, 650 and 700) until section 282 added it, and is dormant since. The dispatch
 * check runs first so that it stays reachable, arch 9 being the case it refuses and the list never
 * getting a say. The session end rail keeps its own copy because it takes the lighter
 * permission and always could be reached with any architecture.
 */
export function assertResetAllowed(p: WritePermission): void {
  assertPermissionIsUsable(p);
  // The dispatch check first and the list second, so that each had an architecture it was the one to
  // refuse: arch 9 (Harmony 525) fails the first, and arch 14 (Harmony 600, 650 and 700) passed it and
  // failed the second until section 282. The other order made the first unreachable, since the list
  // was `[12]` then and arch 12 dispatches, which is the state the docstring above warns about.
  // **The second is dormant since section 282**, when arch 14 joined the reset list: every write
  // target that dispatches the escape is on it. It wakes when one arrives that is not.
  const dispatched = ESCAPE_SUB_COMMANDS[p.architecture];
  if (dispatched === undefined || !dispatched.includes(ESCAPE_RESET)) {
    throw new RailError(
      `architecture ${p.architecture} has no reset escape read from its firmware, so restarting it `
        + 'is refused: the reboot would be a command nobody here has traced. Section 97 is what was '
        + 'read for arch 12, and the equivalent for this architecture is unread.',
    );
  }
  if (!ARCHITECTURES_WITH_A_RESET_TARGET.includes(p.architecture)) {
    throw new RailError(
      `architecture ${p.architecture} may be written a block and not restarted over USB: its escape `
        + 'is traced but nothing here has sent it the reboot, and a flash demonstration buys no other '
        + 'path. Section 281.',
    );
  }
}

/**
 * Architectures on which the remote may be asked to **reinstall its own staged firmware**: the
 * firmware update status byte set to 2 and a restart. Section 295.
 *
 * **A list of its own, like every other path here.** Nothing is written to flash by this: the remote's
 * safe mode image does the erase and the copy itself, from the image already sitting in its external
 * flash, which is what it does at the end of every firmware install Logitech's software performs. It
 * is still the most consequential thing this package can ask of a remote, since the application image
 * is erased before the copy starts, so it gets a named door and a check of the staged image on top of
 * the ordinary rails.
 *
 * `[14]` because the install routine was read on the Harmony 700's 2.3 safe mode image and the
 * trigger in Logitech's template for skin 66, and nowhere else. Arch 12 (Harmony One) runs its
 * application in place and has no staging copy; arch 9 (Harmony 525) is a different mechanism
 * entirely, an EEPROM byte its bootloader reads, section 119, and entering its safe mode destroys
 * the application.
 */
export const ARCHITECTURES_WITH_A_REINSTALL_TARGET: readonly number[] = [14];

/**
 * The largest image the arch 14 safe mode image will copy: it clamps the header's size to `0x15C00`,
 * so the copy ends at internal `0x1EC00`, below the settings store and the identity block.
 */
export const REINSTALL_MAX_IMAGE = 0x15c00;

/**
 * The named door, beside `HARMONY_ENABLE_WRITES` rather than instead of it.
 */
export const FIRMWARE_REINSTALL: boolean = process.env['HARMONY_FIRMWARE_REINSTALL'] === '1';

/**
 * Throws unless the remote on the cable may be told to reinstall the image staged in its external
 * flash. Section 295.
 *
 * Every condition is judged here, on facts read off the remote rather than asserted by a caller, which
 * is the lesson of sections 224 and 225: `requestFirmwareReinstall` reads the identity block, the
 * version block and the staged image itself and hands them in, and this computes the staged image's
 * checksum itself. What a caller still chooses is `permittedUnit`, the record the unit is compared
 * with, which is why `reinstall-firmware.ts` names the units it will take.
 *
 * * **Safe mode, or an application build whose status byte handler is read.** The install routine
 *   was read in the safe mode image, section 295, and the byte's handler on the Harmony 700's 2.5
 *   and 2.8 applications, sections 297 and 298; `assertStatusByteReadOn` is the check, keyed by the
 *   build's version string per architecture and not by unit, so a 600 or 650 reporting either number
 *   would pass on a reading made on the 700's builds.
 * * **The staged image must verify, and fit.** The remote erases its application before it copies,
 *   and it copies whatever length the staged header states up to its clamp. A staged image that does
 *   not verify would be copied faithfully and then refused by the checksum test at the next start,
 *   which is the state the remote is presumably already in, minus the application.
 * * **The restart must be traced.** The reinstall happens at start up, so the same escape the config
 *   writer ends with has to be one this architecture dispatches. That was read on the 0.2 application
 *   builds, section 282, and this sends it to whatever is running. The 700's 2.5 and 2.8
 *   applications' escape handlers are read too, sections 298 and 97, and no safe mode image's is; it
 *   restarted the one Harmony 700 it was sent to, each time.
 * * **The architecture list is wider than the reading.** The routine was read on the Harmony 700's 2.3
 *   safe mode image; the 600's and 650's 0.2 images carry its status normalisation and are otherwise
 *   unread there, and `[14]` admits them. Section 295 says so.
 */
export function assertReinstallAllowed(
  p: Pick<WritePermission, 'architecture' | 'identityBlock' | 'permittedUnit'>,
  remote: { readonly softwareType: number; readonly firmware?: string; readonly staged: Uint8Array },
): void {
  if (!WRITES_ENABLED) {
    throw new RailError(
      'writing is disabled: this build is read only (set HARMONY_ENABLE_WRITES=1 knowing why)',
    );
  }
  if (!FIRMWARE_REINSTALL) {
    throw new RailError(
      'a firmware reinstall needs HARMONY_FIRMWARE_REINSTALL=1 as well as HARMONY_ENABLE_WRITES=1: '
        + 'the remote erases its application before it copies the staged image over it',
    );
  }
  assertUnitIsPermitted(p);
  if (!ARCHITECTURES_WITH_A_REINSTALL_TARGET.includes(p.architecture)) {
    throw new RailError(
      `architecture ${p.architecture} has no reinstall target: the install routine was read on `
        + `architecture ${ARCHITECTURES_WITH_A_REINSTALL_TARGET.join(', ')} only`,
    );
  }
  const dispatched = ESCAPE_SUB_COMMANDS[p.architecture];
  if (dispatched === undefined || !dispatched.includes(ESCAPE_RESET)) {
    throw new RailError(`architecture ${p.architecture} has no reset escape read from its firmware`);
  }
  assertStatusByteReadOn(p.architecture, remote);
  const staged = checkFirmwareImage(remote.staged);
  if (!staged.verifies) {
    throw new RailError(
      'the image staged in external flash does not verify, so the remote would erase its application '
        + 'and copy in an image its own start up check then refuses',
    );
  }
  if (staged.size > REINSTALL_MAX_IMAGE) {
    throw new RailError(
      `the staged image is ${staged.size} bytes and the safe mode image copies at most `
        + `${REINSTALL_MAX_IMAGE}, so it would install a truncated application`,
    );
  }
}

/**
 * The application builds whose own `WRITE_MISC` selector 6 handler has been read, per architecture,
 * so that the update status byte may be set while the remote runs normally rather than in safe mode.
 * Section 297: on the Harmony 700's 2.5 the arm at `0x0C364` hands the packet's sixteen bit address
 * to `0x19868`, which stores its low byte into data memory `0x100` when its high byte is 0, so
 * `A3 06 00 02` sets the same byte the safe mode image reads. Logitech's template for skin 66 sends
 * that sequence to a remote in either mode.
 *
 * **2.8 since section 298**: the same chain at `0x0C3AA`, the same arm at `0x0C400` and the same five
 * instructions at `0x1AB96`, and in both builds that store is the only direct write to `0x100`. Both
 * builds' restart is read as well, 2.8's in section 97 and 2.5's in section 298, which is what a
 * reinstall sends after the status byte.
 */
export const STATUS_BYTE_READ_ON_APPLICATION: Readonly<Record<number, readonly string[]>> = {
  14: ['2.5', '2.8'],
};

/**
 * Throws unless the status byte's handler has been read in the mode and build the remote is in:
 * safe mode, or an application build on the list above.
 *
 * **Safe mode passes for any unit of the architecture**, and section 295 read the handler on the
 * Harmony 700's 2.3 safe mode image only, so the 600 and the 650 are admitted on an unread one. That
 * is the width section 295 already recorded for the reinstall, carried here and not narrowed.
 */
function assertStatusByteReadOn(
  architecture: number,
  remote: { readonly softwareType: number; readonly firmware?: string },
): void {
  if (remote.softwareType === SOFTWARE_TYPE_SAFE_MODE) return;
  const builds = STATUS_BYTE_READ_ON_APPLICATION[architecture] ?? [];
  if (remote.softwareType === 0 && remote.firmware !== undefined && builds.includes(remote.firmware)) return;
  throw new RailError(
    `the remote reports software type ${remote.softwareType} and firmware ${remote.firmware ?? 'unknown'}: `
      + 'the status byte handler was read in the safe mode image and in the application builds '
      + `${builds.join(', ') || 'none'} only`,
  );
}

/**
 * Where an arch 14 remote stages an application image before installing it: external flash from
 * `0x000000`, Logitech's region 2 for skin 66, up to the embedded configuration at `0x020000`, their
 * region 3. Two 64 KiB erase blocks, and the copy limit fits inside them.
 */
export const STAGING_REGION: Readonly<Record<number, { readonly start: number; readonly end: number }>> = {
  14: { start: 0x000000, end: 0x020000 },
};

/**
 * The named door for writing a firmware image into the staging region. Beside `WRITES_ENABLED` and
 * `HARMONY_FIRMWARE_REINSTALL`, not instead of them.
 */
export const FIRMWARE_STAGE: boolean = process.env['HARMONY_FIRMWARE_STAGE'] === '1';

/**
 * Throws unless `image` may be written into the staging region of the remote on the cable. Section
 * 297, and **the one place this project writes flash outside a configuration region**, Danny's
 * decision of 29 September 2026, decision 18.
 *
 * * **The staging region and nothing else**, erased whole and in 64 KiB blocks, so neither the embedded
 *   configuration at `0x020000` nor anything in the processor is reachable from here. The processor's
 *   own flash is written by the remote's safe mode image, at start up, and only from what is staged.
 * * **Only an image that verifies**, by the same check the safe mode image makes after its copy, and
 *   within its copy limit. An image that did not verify would be copied and then refused at start up,
 *   leaving safe mode running with the application erased, which the reinstall can still repair from
 *   a good staged image but not from this one.
 * * **The status byte first**: staging sets it to 0 before the erase, as Logitech's template does, so
 *   a restart during the write installs nothing. That byte's handler has to be read in the mode the
 *   remote is in, which is `assertStatusByteReadOn`.
 *
 * **What this does not check**, since the documents say more than the code does: that the image is
 * Logitech's and unmodified, which a verifying checksum does not show, the seed and the algorithm
 * being public; and that the region matches a lab backup, which is `reinstall-firmware.ts`'s check and
 * not this function's. Both are the operator's, recorded in section 297.
 */
export function assertStagingAllowed(
  p: Pick<WritePermission, 'architecture' | 'identityBlock' | 'permittedUnit'>,
  remote: { readonly softwareType: number; readonly firmware?: string },
  image: Uint8Array,
): void {
  if (!WRITES_ENABLED) {
    throw new RailError(
      'writing is disabled: this build is read only (set HARMONY_ENABLE_WRITES=1 knowing why)',
    );
  }
  if (!FIRMWARE_STAGE) {
    throw new RailError(
      'staging a firmware image needs HARMONY_FIRMWARE_STAGE=1 as well as HARMONY_ENABLE_WRITES=1: '
        + 'it erases the staged copy the reinstall repairs a remote from',
    );
  }
  assertUnitIsPermitted(p);
  const region = STAGING_REGION[p.architecture];
  if (region === undefined) {
    throw new RailError(`architecture ${p.architecture} has no staging region read from its firmware`);
  }
  assertStatusByteReadOn(p.architecture, remote);
  const check = checkFirmwareImage(image);
  if (!check.verifies || check.size !== image.length) {
    throw new RailError(
      'the image to stage does not verify at its own stated length, so the remote would refuse it '
        + 'after copying it in',
    );
  }
  if (check.size > REINSTALL_MAX_IMAGE || check.size > region.end - region.start) {
    throw new RailError(
      `the image is ${check.size} bytes and the safe mode image copies at most ${REINSTALL_MAX_IMAGE}`,
    );
  }
}

/**
 * The one door through the odd count refusal, for an experiment that needs the hang itself.
 *
 * `readInternalMemory` refuses an odd count because such a read never terminates and the response
 * sender has no bound, sections 94 and 96. That refusal stays. But twice now an experiment has
 * needed the hang as its subject rather than as an accident, and both times the refusal was
 * bypassed by editing `remote.ts` and editing it back afterwards. **That is worse than a named
 * door**: a safety rail modified under time pressure, twice, with nothing in the tests to say it
 * happened.
 *
 * So this is the door, and it is shaped like the write flag: off unless the environment says
 * otherwise, and it says what it will do rather than what it permits. A caller that reaches for it
 * has to have set `HARMONY_ODD_READ_EXPERIMENT=1`, which is not something anybody sets by accident.
 *
 * **It will hang the remote.** Every hang so far has cleared itself in about three seconds at a new
 * device path, and the config read back identical afterwards, but the loop scribbles at least 2247
 * bytes of flash content over data memory on its way, so a remote is not the same afterwards until
 * its batteries come out.
 */
export const ODD_READ_EXPERIMENT: boolean = process.env['HARMONY_ODD_READ_EXPERIMENT'] === '1';

export function assertDeliberateHangAllowed(count: number): void {
  if (!ODD_READ_EXPERIMENT) {
    throw new RailError(
      'a deliberate hang needs HARMONY_ODD_READ_EXPERIMENT=1: this read never terminates and ' +
        'writes flash content over the remote\'s data memory, sections 94 and 96',
    );
  }
  if (count % 2 === 0) {
    throw new RailError(
      `a count of ${count} is even, so it terminates: this entry point is for the hang itself, ` +
        'and an even count belongs on the ordinary read path',
    );
  }
}

/**
 * The firmware is never written, by any path but one.
 *
 * The exception is `assertStagingAllowed`: an image Logitech built, verified, written into the
 * staging region of an arch 14 remote for its own safe mode image to install, decision 18. Nothing
 * here writes the processor's flash, and nothing modifies an image.
 *
 * There is no permission object that makes this return, which is why it takes none. It exists so
 * that a caller reaching for a firmware write finds a refusal with a reason attached rather than
 * an absence, and so that the rule is greppable.
 */
export function assertFirmwareWriteRefused(): never {
  throw new RailError(
    'firmware is never written by this project: the route to everything here is generating ' +
      'config files, and a bad firmware write has no recovery path',
  );
}

/**
 * The named door for the first write this project has ever performed.
 *
 * `WRITES_ENABLED` is the build flag and every condition in `WritePermission` still applies; this
 * is a second, single purpose door in front of the **rehearsal**, and it exists for the same reason
 * `ODD_READ_EXPERIMENT` does. That reason is recorded there and is worth repeating: the odd read
 * refusal was twice bypassed by editing `remote.ts` and editing it back, and a rail edited under
 * time pressure with nothing in the tests to say so is worse than a door that announces itself.
 *
 * A first write is exactly the situation that invites such an edit. The recovery route it depends
 * on is unproven, which is the whole reason the rehearsal writes bytes a remote already holds, so
 * the operator has to say out loud that this is the run where that is understood.
 *
 * It is deliberately not per architecture and not per address: those are `assertFlashWriteAllowed`'s
 * job, and a door that duplicated them would be a second copy of a rail, which is the state this
 * repository's oldest rule forbids.
 */
export const FIRST_WRITE: boolean = process.env['HARMONY_FIRST_WRITE'] === '1';

export function assertFirstWriteAllowed(): void {
  if (!WRITES_ENABLED) {
    throw new RailError(
      'writing is disabled: this build is read only (set HARMONY_ENABLE_WRITES=1 knowing why)',
    );
  }
  if (!FIRST_WRITE) {
    throw new RailError(
      'the write rehearsal needs HARMONY_FIRST_WRITE=1 as well as HARMONY_ENABLE_WRITES=1: this ' +
        'is the first write this project has performed, on an irreplaceable unit, and the restore ' +
        'route it relies on has never been exercised',
    );
  }
}
