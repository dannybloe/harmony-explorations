/**
 * Keeping a person's work across a lost connection, and never mixing two remotes' work.
 *
 * **Why this exists**: at the bench, pressing Glow on a Harmony 885 while the page was reading its keys
 * turned the remote's screen off and the remote stopped answering on the cable, until the cable was
 * unplugged and plugged back in. A page that threw away the steps, the answers and the key map at that
 * moment would make the person start over for something the page warned them about and they did anyway.
 * So the work belongs to the visit, not to the connection: a reconnect of the same remote carries on where
 * the person was.
 *
 * **What counts as the same remote** is what the page can know, the model name and the skin it reported.
 * Two units of one model look alike, since the page reads no serial number on purpose; that is fine,
 * because their key maps are the same. A remote that reports another model or skin is a different remote,
 * and its work starts on its own: the work done with the first is kept beside it, untouched, in case that
 * one is plugged back in, and never shown as the second one's.
 *
 * Plain state with no page and no device, so `test/visit.test.ts` drives it with a pretend remote through
 * the published `link.js`, the way the page does.
 */
import type { RemoteSeen } from './link.ts';

/** What the page says when the remote stops answering: what happened, and what to do, in that order. */
export const STOPPED_ANSWERING = 'Your remote stopped answering. Unplug its cable, plug it back in, and press Reconnect.';

/** What a connection is, against what came before it in this visit. */
export type Arrival =
  | { readonly kind: 'first' }
  | { readonly kind: 'same' }
  | { readonly kind: 'different'; readonly before: RemoteSeen };

/** The identity a remote's work is kept under: what the page can read of which remote it is. */
function identity(remote: Pick<RemoteSeen, 'name' | 'skin'>): string {
  return `${remote.name} / skin ${remote.skin}`;
}

/**
 * One visit to the page: every remote connected in it, and per remote the work done for each model the
 * person chose for it. `S` is the page's own per model state; this module only keeps it.
 */
export class Visit<S> {
  readonly #work = new Map<string, Map<number, S>>();
  #remote: RemoteSeen | undefined;
  /** The model the person was working on, per remote, so a reconnect returns to it. */
  readonly #chosen = new Map<string, number>();

  /** The remote connected now, or last, if the connection was lost. */
  get remote(): RemoteSeen | undefined {
    return this.#remote;
  }

  /** A remote has connected: say whether it is the first, the same as before, or another one. */
  connected(remote: RemoteSeen): Arrival {
    const before = this.#remote;
    this.#remote = remote;
    if (!this.#work.has(identity(remote))) this.#work.set(identity(remote), new Map());
    if (before === undefined) return { kind: 'first' };
    return identity(before) === identity(remote) ? { kind: 'same' } : { kind: 'different', before };
  }

  /** The work for a model on the connected remote, made the first time it is asked for. */
  workFor(model: number, make: () => S): S {
    const remote = this.#remote;
    if (remote === undefined) throw new Error('no remote has connected, so there is no work to keep');
    const work = this.#work.get(identity(remote)) as Map<number, S>;
    let found = work.get(model);
    if (found === undefined) {
      found = make();
      work.set(model, found);
    }
    this.#chosen.set(identity(remote), model);
    return found;
  }

  /** The model last worked on with the connected remote, so a reconnect carries on with it. */
  get chosen(): number | undefined {
    return this.#remote === undefined ? undefined : this.#chosen.get(identity(this.#remote));
  }
}
