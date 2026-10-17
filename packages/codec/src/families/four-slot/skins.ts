/**
 * The skins within the four slot family that a builder of ours tells apart, where the family's remotes were not
 * all measured alike: the Harmony 600, 650 and 700 share an architecture, so a step measured on one of them is
 * gated on its skins (`packages/usb/src/models.ts`) rather than on the architecture.
 *
 * It has no imports, and the family's index takes it first, so a module that reaches it through the index
 * while the family is still being evaluated finds it set: `backgrounds.ts` builds its own skin sets from it
 * when it loads.
 *
 * `backgrounds.ts` held this until `todo-compile-one.md` 3.3.3.5, when the font table, which gates on it too,
 * came to ask the family instead.
 */

/**
 * The Harmony 650's two skins, 72 and its EMEA twin 74 (`packages/usb/src/models.ts`). The Harmony 700's 2026
 * compiles share the look and run through the state backgrounds too, which nobody has checked on a 700, and the
 * 600's do not, so the model is gated rather than the architecture. Our faces were measured on its compiles
 * alone, `fonts.ts`.
 */
export const HARMONY_650_SKINS: ReadonlySet<number> = new Set([72, 74]);

/**
 * The skins the assembly takes, `assemble.ts`. The Harmony 650 alone, skin 72, which is the one model every
 * step was run on together; each generator states its own wider scope, and what the Harmony 600 and 700 would
 * need is in section 362: the 700's wiring refuses the Remote Assistant off, and neither model has had this
 * chain run on one of its compiles. Held in `src/assemble.ts` until `todo-compile-one.md` 3.3.3.2.
 */
export const ASSEMBLY_SKINS: ReadonlySet<number> = new Set([72]);

/**
 * The skins the assembly takes on a donor of ours alone, an empty configuration in our look: the Harmony
 * 700's 66, `todo-compile-700.md` 2.1, and the Harmony 600's 71 and 73, `todo-compile-600.md` 2.1. None of
 * Logitech's compiles for either has had the chain run on it, so one of them as the donor is refused.
 */
export const OUR_DONOR_SKINS: ReadonlySet<number> = new Set([66, 71, 73]);
