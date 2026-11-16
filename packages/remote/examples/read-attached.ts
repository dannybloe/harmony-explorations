// Reading the remote on the cable: found without opening it, opened to read,
// read whole and let go. A module and not a program, since running it would
// claim a remote: `read.ts` and the examples' test call `readRemote` with a
// pretend remote in place of `openAttached`.
import {
  profileFor,
  readConfig,
  type ConfigRead,
  type ConfigReader,
  type ReadProgress,
  type RemoteProfile,
} from '@freeharmony-sdk/remote';
import { HarmonyRemote, listHarmony, openHarmony } from '@freeharmony-sdk/usb';

/**
 * What a read needs of a remote: something to read through, the profile of
 * its model, and a way to let go.
 */
export interface Opened {
  readonly reader: ConfigReader;
  readonly profile: RemoteProfile;
  readonly close: () => Promise<void>;
}

/**
 * The one Harmony on the cable, opened to read. `listHarmony` only asks what
 * is attached; `openHarmony` claims the remote, and the transport it gives
 * passes reads alone. `HarmonyRemote` speaks the remote's commands over that
 * transport, and is what `readConfig` reads through; it is told the model's
 * address rule by the profile.
 */
export async function openAttached(): Promise<Opened> {

  const attached = await listHarmony();

  if (attached.length !== 1) {

    const message = `${attached.length} remotes are attached; attach one, `
      + 'or open the one wanted by its path';

    throw new Error(message);
  }

  const profile = profileFor(attached[0]!.productId);

  const transport = await openHarmony({
    productId: profile.productId,
  });

  const remote = new HarmonyRemote(transport, {
    architecture: profile.architecture,
  });

  return {
    reader: remote,
    profile,
    close: () => remote.close(),
  };

}

/**
 * Read a remote's configuration whole, reporting progress, and let go of the
 * remote whatever happens.
 */
export async function readRemote(
  open: () => Promise<Opened> = openAttached,
  onProgress?: (progress: ReadProgress) => void,
): Promise<ConfigRead> {

  const {
    reader,
    profile,
    close,
  } = await open();

  // Progress is passed on only when it was asked for, so a read with no
  // watcher reports to no one.
  const options = onProgress === undefined ? {} : { onProgress };

  try {
    return await readConfig(
      reader,
      profile,
      options,
    );
  } finally {
    await close();
  }

}
