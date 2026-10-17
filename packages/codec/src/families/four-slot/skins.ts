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
