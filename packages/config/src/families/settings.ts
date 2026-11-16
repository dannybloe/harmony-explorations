/**
 * **The remote's own settings a family builds from a document**, R47: the data interface both kinds of family carry,
 * `Family.settings` and `DocumentFamily.settings`, so that which settings a model has, what each takes and what it is
 * when the document says nothing are asked the same way of every model. The lookup by model is `settingsOfModel` in
 * `registry.ts`; the toolkit's question `settings`, its change `setSetting` and its `check` all read it.
 *
 * **What a family states, and why these three.** A setting is a row of the remote's own, such as how long its screen
 * stays lit, which a document states by the name the family gives it, `Recipe.settings`. So a family names **every
 * row its build writes**, with the kind of value it takes and the value the build writes when the document states
 * none; the **rows the remote has that its build does not write yet**, each with the requirement it waits on, so a
 * document naming one is told "not built" rather than "no such setting"; and **its own judgement of a value**, the one
 * its build refuses with, so the change, the check and the build never disagree about a value. Any other name is a
 * setting the model does not have.
 *
 * **A family that states none** is one whose build reads no setting from a document, which is every compiled family:
 * the Harmony One's and the Harmony 600, 650 and 700's settings are build choices of their own, and whether the Harmony
 * 300 and 350 have any is not checked. For those the question answers not built, R47, and a change writes the document
 * as every change does, `check` listing the field as one the model's build does not read.
 *
 * Generic: nothing here is true of one remote and not another. The Harmony Touch's is `TOUCH_SETTINGS` in
 * `families/harmony-touch/settings.ts`.
 */
import type { RecipeSetting } from '../recipe/recipe.ts';

/**
 * The kind of value a setting takes: yes or no, the two choices, or a whole number from `min` to `max`, both ends
 * taken. A document may state a yes or no row as true or false and a number row as a number; how the family's build
 * reads other forms of the same value, text among them, is the family's `refusedValue`.
 */
export type SettingKind =
  | { readonly kind: 'yes or no'; readonly choices: readonly [true, false] }
  | { readonly kind: 'whole number'; readonly min: number; readonly max: number };

/** One setting a family's build writes: its name, the kind of value it takes, and what the build writes unstated. */
export interface FamilySetting {
  readonly name: string;
  readonly takes: SettingKind;
  readonly default: boolean | number;
}

/** What a family states about the settings a document may hold, the module header. */
export interface FamilySettings {
  /** Every setting the build writes, in the order it writes them. */
  readonly rows: readonly FamilySetting[];
  /**
   * The settings the remote has and the build does not write yet, by name, each with the requirement it waits on: a
   * document stating one is not built, where a name in neither list is a setting the model does not have.
   */
  readonly notBuilt: Readonly<Record<string, number>>;
  /**
   * Why the build refuses `value` for the row `name`, in the build's own words, or undefined where it takes it.
   * Asked only of a name in `rows`.
   */
  refusedValue(name: string, value: RecipeSetting): string | undefined;
}

/**
 * A value the family takes, as the kind of value it is: true or false for a yes or no row, the number for a number
 * row. Asked only of a value `refusedValue` takes, so a text a family reads, `"true"` or `"30"`, comes back as what it
 * means.
 */
export function settingValue(row: FamilySetting, value: RecipeSetting): boolean | number {
  if (row.takes.kind === 'yes or no') return value === true || value === 'true';
  return typeof value === 'number' ? value : Number(value);
}
