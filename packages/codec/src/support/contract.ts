/**
 * The refusal of a function that is in the contract and not built yet, decision 38.
 *
 * **Why a function that only refuses exists at all.** The outside an application builds on is fixed before the
 * inside is complete, so that an application can be written against the whole of it while the libraries are filled
 * in per remote. A name that is missing cannot be called, imported or type checked against; a name that refuses can,
 * and its refusal says which requirement it waits on, so an application shows "not yet" from the same call it will
 * later get an answer from.
 *
 * **It is not the refusal of a model.** A model that cannot do something is an answer `capabilitiesOf` gives, per
 * requirement; this is thrown where no model can yet, because nothing is behind the name. A function leaves this
 * state by being built, never by a caller catching the error and working around it.
 */

/** A function of the contract that nothing is behind yet, by its name and the requirement it waits on. */
export class NotBuiltError extends Error {
  /** The function refused, as an application calls it: `recipe.setKey`, `findDevices`, `syncDocument`. */
  readonly contract: string;
  /** The requirement the function serves, its number in `docs/remote-requirements.md`. */
  readonly requirement: number;

  constructor(contract: string, requirement: number) {
    super(`${contract} is in the contract and not built yet, requirement R${requirement}`);
    this.name = 'NotBuiltError';
    this.contract = contract;
    this.requirement = requirement;
  }
}

/** Refuse as a function of the contract that is not built: `return notBuilt('recipe.setKey', 31)`. */
export function notBuilt(contract: string, requirement: number): never {
  throw new NotBuiltError(contract, requirement);
}
