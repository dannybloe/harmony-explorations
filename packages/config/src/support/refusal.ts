/**
 * **A build's refusal**, the one class an application catches when a build of any model says no, for every family of
 * either kind: a document it will not build, a device it cannot compose, a choice it does not make.
 *
 * **Why one class.** An application holds a document and a model and calls one build, `buildFromRecipe`; which family
 * builds is the registry's choice, not the application's. If each family said no with a class of its own, the
 * application would have to know every family's classes to tell a refusal, which it shows the person, from a fault in
 * the code, which it reports. So every class a family's build refuses with at its surface extends this one: the
 * compiled families' composers throw it directly, the shared assembly's refusal, the Harmony 600, 650 and 700's
 * refusal of a choice and the Harmony One's refusal of a builder extend it, and so does the Harmony Touch's composer.
 * A subclass keeps its own name for the code that tells them apart inside the codec; an application needs only this.
 *
 * **What is not a refusal.** A source the caller must give and did not, an account or an archive for a device the
 * document carries no definition of, is a `RecipeError`, as is a document that is not one; a function nobody has
 * written yet is a `NotBuiltError`, `contract.ts`. A device an archive that was given does not hold is still the
 * catalogue's `ArchiveError`. Anything else thrown out of a build, a `TypeError` above all, is a
 * fault in the code and not an answer about the document.
 *
 * **Why it sits here, in a module that imports nothing.** The classes that extend it sit in modules that reach each
 * other in cycles, the shared assembly, the families and the registry among them; a class declared with `extends` needs
 * its base defined when its own module runs, so the base has to be in a module no cycle passes through. The composers
 * import it from `shared/core.ts`, which re-exports it, and so does the main entry.
 */
export class ComposeError extends Error {}
