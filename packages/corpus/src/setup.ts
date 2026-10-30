/**
 * A setup: named devices out of Logitech's catalogue and the activities that use them, as data, and the
 * `SaveActivities` payload that puts one activity on a remote record. `bin/build-setup.ts` sends it.
 * Needs no network, so the payload can be tested on its own.
 *
 * **How MyHarmony makes an activity**, read in its decompiled client in the lab
 * (`work/myharmony/src/`, the activity store, the activity converter and the activity setup wizard) and
 * not yet seen working from here: one call, `UserAccountDirector/SaveActivities`, with the account and a
 * list of activities. There is no list of an activity's devices; the devices are whichever devices its
 * **roles** name, a role being a job a device does in that activity (shows the picture, takes the
 * volume, changes channels). A device the activity uses for no job gets a pass through role, which is
 * how the client adds an HDMI switch. A device's input is set on **every** role of that device, by the
 * input's name as the catalogue states it. Ids, the power on and off order and the activity group are
 * left for the service to assign, which is what the replies captured in the lab show it doing.
 */
import type { ActivityRoleName, Recipe, RecipeActivity, RecipeDevice } from '@harmony/codec';

/**
 * One device of a setup: what the remote calls it, and its catalogue entry as `<manufacturer>/<file>`.
 * `poweredOnBetweenActivities` is MyHarmony's "I want to keep this device on when switching Activities
 * and only turn it off when I press the Off button": `IsPoweredOnBetweenActivities` in the device's power
 * feature, read in the client's power settings view. Absent means the default, off.
 *
 * **The codec's type**, since `todo-compile-650.md` 10.6: a setup file is the codec's recipe since 10.7.4,
 * which its `assembleSetup` builds a container from, and the codec cannot import this package, so the shape lives there and this names
 * it. Two copies of one shape are two copies until one of them moves.
 */
export type SetupDevice = RecipeDevice;

/**
 * The jobs a device can do in an activity, as the contract names their role types. The codec's list,
 * since the activity composer takes the same roles, `activityFromRoles`, and one vocabulary in two
 * places is two until one of them moves. A device listed with none is a pass through device here too.
 */
export type RoleName = ActivityRoleName;

/** The activity types this setup uses, by the contract's name; `Custom` holds no activity key. */
export const ACTIVITY_TYPES = { WatchTV: 1, WatchDvd: 2, ListenToMusic: 4, Custom: 5 } as const;

/** The codec's activity of a setup, with its type narrowed to the four this package sends. */
export interface SetupActivity extends RecipeActivity {
  readonly type: keyof typeof ACTIVITY_TYPES;
}

/**
 * A setup: the codec's recipe, whose model, screens and choices this package does not send, with its
 * activities' types narrowed to the four it does.
 */
export interface Setup extends Recipe {
  readonly activities: readonly SetupActivity[];
}

const ACTIVITY_CONTRACT = 'Logitech.Harmony.Services.DataContract.Activity';

function id(value: number): { IsPersisted: true; Value: number } {
  return { IsPersisted: true, Value: value };
}

/**
 * The roles of one activity: each job a device does, in the order the setup lists them, and a pass
 * through role for a device listed with no job. `deviceIds` maps a setup's device name to the account's
 * own device id, which is not the catalogue's.
 */
export function activityRoles(activity: SetupActivity, deviceIds: ReadonlyMap<string, number>):
    Record<string, unknown>[] {
  return activity.devices.flatMap(({ device, input, roles }) => {
    const deviceId = deviceIds.get(device);
    if (deviceId === undefined) throw new Error(`${activity.name}: no device called ${device} on the record`);
    // The contract's members in the order the service returns them, `__type` first as its deserialiser
    // requires. The input carries its name only; the service assigns its id.
    return (roles.length === 0 ? ['PassThrough'] : roles).map((role) => ({
      __type: `${role}ActivityRole:#${ACTIVITY_CONTRACT}`,
      DeviceId: id(deviceId),
      Id: null,
      NextDevicePowerOnDelay: null,
      PowerOffOrder: null,
      PowerOnOrder: null,
      SelectedInput: input === undefined ? null : { ChannelNumber: null, Id: null, Name: input },
    }));
  });
}

/**
 * The `SaveActivities` argument for one new activity on `record`. `order` is its place among the
 * record's activities, which the client counts as the activities already saved.
 */
export function saveActivityPayload(activity: SetupActivity, record: number, deviceIds: ReadonlyMap<string, number>,
    order: number): Record<string, unknown> {
  return {
    accountId: id(record),
    activities: [{
      AccountId: id(record),
      ActivityDisplayName: null,
      ActivityGroup: 0,
      ActivityOrder: order,
      DateCreated: null,
      DateModified: null,
      DefaultChannel: null,
      DefaultStation: null,
      DefaultStationName: null,
      EnterActions: [],
      Icon: null,
      Id: null,
      ImageKey: null,
      IsDefault: false,
      IsMultiZone: false,
      IsTuningDefault: false,
      LeaveActions: [],
      Name: activity.name,
      Roles: activityRoles(activity, deviceIds),
      StartScreen: null,
      // Setup, which the client sets just before it saves.
      State: 0,
      SuggestedDisplay: activity.type,
      Type: ACTIVITY_TYPES[activity.type],
    }],
  };
}

/**
 * A device's power feature as `GetUserFeatures` returned it, with the keep on flag set to `on`, as
 * MyHarmony's power settings view saves it: the one feature, marked completed, in a list of its own.
 * Every other member is carried through unchanged, so nothing but the flag can move.
 */
export function keepOnPayload(power: Record<string, unknown>, on: boolean): Record<string, unknown> {
  if (!String(power['__type'] ?? '').startsWith('PowerFeature:')) throw new Error('not a power feature');
  return { deviceFeatures: [{ ...power, IsPoweredOnBetweenActivities: on, State: FEATURE_COMPLETED }] };
}

/** `FeatureState.Completed`, the client's enum, whose two members are not completed and completed. */
const FEATURE_COMPLETED = 1;

/**
 * An activity already on the record, as `ActivityList` returned it, saved again as a `Custom` activity,
 * which holds no activity key. Only that change: the service picks an activity's key from its type, the
 * client never sets the group itself, so the group is cleared with it and everything else is carried
 * through, the id included, so the save replaces the activity rather than adding a second.
 */
export function customPayload(existing: Record<string, unknown>, record: number): Record<string, unknown> {
  if (existing['Id'] === null || existing['Id'] === undefined) throw new Error('the activity has no id to replace');
  return {
    accountId: id(record),
    activities: [{ ...existing, ActivityGroup: 0, SuggestedDisplay: 'Custom', Type: ACTIVITY_TYPES.Custom }],
  };
}

// ---------------------------------------------------------------------------------------------------
// Favourite channels
// ---------------------------------------------------------------------------------------------------
//
// **How MyHarmony saves a favourite channel**, read in its decompiled client in the lab, `work/myharmony/
// src/`, and not yet sent from here. The dashboard's favourites control reads the one device's button map
// with `GetButtonMaps` and puts the account's surface on it (`FavoritesControlViewModel.GetButtonMapsCompleted`
// with `FillSurfaceData`); the add screen makes one `SoftRemoteButton` per channel, whose action is a
// `ButtonChannelAction` carrying the channel as text and the device, labelled with the channel when no label
// is typed, on the menu `FavoriteChannels` (`AddFavoriteChannelsViewModel.AddButton_Click`); the list screen
// numbers the menu's places (`FavoriteChannelsViewModel.OkButton_Click`); and the button mapping store takes
// that device's map as read, drops whatever favourites it held, appends the list and sends the one map with
// `UserButtonMappingManager/SaveButtonMaps` (`ButtonMappingStore.SaveFavoriteChannelList`). So saving one
// channel saves the device's whole map, which is what the replies in the lab show the service doing.
//
// **That is the route of the Harmony One, the 600, 650 and 700 and the 800 series, and not of the Harmony
// 300 or 350.** This said it was the route of every remote until the Harmony 350's setup was saved through it:
// the service accepted the five buttons, and the compile and MyHarmony's own favourites screen ignored them.
// The dashboard sends a Harmony 350 to a screen of its own, `FavouriteChannelsView` in the ButtonMapping task
// package, which saves with `UpdateDeviceModeButtonMaps` onto the device mode map that
// `GetDeviceModeButtonMaps` reads: hard buttons `Fav1` to `Fav5`, each a `ChannelButtonAssignment`. The
// record holds exactly that after MyHarmony's save, `test/favourites.test.ts`. The Harmony 300 has its own
// panel again and its save was not traced, so both are refused by `favouriteIndexBase` below until a stage
// sends that operation, behind a door of its own.

/** The button mapping contracts' namespace, as the service's replies name it. */
const BUTTON_MAPPING_CONTRACT = 'Logitech.Harmony.Services.DataContract.UserButtonMapping';
/** The common contracts' namespace, where every identifier type lives. */
const COMMON_CONTRACT = 'Logitech.Harmony.Services.Common.Contracts.Data';

/** The menu a favourite channel's button sits on, the client's own string. */
export const FAVOURITE_MENU = 'FavoriteChannels';

/**
 * `ButtonState.Added`, the client's enum, whose members are default, original, added, modified and deleted,
 * 0 to 4. A new button carries it because the client's list marks every button it gains as added before the
 * save, `StatefulObservableCollection`; a button the service returned carries original, 1.
 */
const BUTTON_ADDED = 2;

/**
 * Where a model's first favourite channel sits on the favourites menu. MyHarmony's favourites list puts an
 * entry called Commands at place 0 on every remote but the Harmony One and the 800 series, numbers the
 * channels after it, and removes it before saving, so on those remotes the channels are saved from place 1;
 * on a Harmony One they start at 0, as the three channels MyHarmony saved on one read back, 0, 1 and 2. A
 * model this has not been read for is refused rather than given either answer, and so are the Harmony 300
 * and 350, whose favourites are not on this menu at all, the comment above.
 */
export function favouriteIndexBase(modelName: string): number {
  if (modelName === 'Harmony One') return 0;
  if (['Harmony 600', 'Harmony 650', 'Harmony 700'].includes(modelName)) return 1;
  if (['Harmony 300', 'Harmony 350'].includes(modelName)) {
    throw new Error(`the ${modelName} keeps its favourite channels on its device mode map, saved with UpdateDeviceModeButtonMaps, which nothing here sends; a SoftRemoteButton saved for it is accepted and ignored`);
  }
  throw new Error(`where the ${modelName}'s favourite channels start on their menu is not read`);
}

/**
 * The `GetButtonMaps` argument for some devices' maps, as the client asks it: the devices as typed
 * identifiers, `__type` first, no activities, the remote's skin, the record as the account, and the
 * surface's number, which is a plain number here and an identifier on a map.
 */
export function getButtonMapsRequest(deviceIds: readonly number[], skin: number, record: number, surface: number):
    Record<string, unknown> {
  return {
    deviceIds: deviceIds.map((value) => ({ __type: `DeviceId:#${COMMON_CONTRACT}`, IsPersisted: true, Value: value })),
    activityIds: [],
    remoteSkinId: skin,
    accountId: id(record),
    surfaceId: surface,
  };
}

/** One favourite channel as it sits on a map: the channel's text, the device it tunes, its menu place. */
export interface FavouriteOnMap {
  readonly channel: string;
  readonly device: number | undefined;
  readonly index: number;
}

/** The favourite channels a map holds, in menu order. A map's own buttons are read, nothing else. */
export function favouritesOnMap(map: Record<string, unknown>): FavouriteOnMap[] {
  const buttons = (map['Buttons'] ?? []) as Record<string, unknown>[];
  return buttons
    .filter((button) => (button['MenuItem'] as { MenuName?: string } | null)?.MenuName === FAVOURITE_MENU)
    .map((button) => {
      const action = (button['ButtonAction'] ?? {}) as { ChannelNumber?: string; DeviceId?: { Value?: number } };
      return {
        channel: String(action.ChannelNumber), device: action.DeviceId?.Value,
        index: (button['MenuItem'] as { IndexInMenu: number }).IndexInMenu,
      };
    })
    .sort((a, b) => a.index - b.index);
}

/**
 * One new favourite channel's button, with the members the service returns for one and in its order,
 * `__type` first in the button and in its action, which the service's deserialiser needs to bind the
 * subclass. What the client leaves unset goes as the contract's default: no button id, which the service
 * assigns, no picture, no long or double press action. The label is the channel itself, which is what the
 * client writes when no label is typed, and the Harmony 300 and 350 have no screen to show another.
 */
export function favouriteButton(channel: string, deviceId: number, index: number): Record<string, unknown> {
  return {
    __type: `SoftRemoteButton:#${BUTTON_MAPPING_CONTRACT}`,
    ButtonAction: {
      __type: `ButtonChannelAction:#${BUTTON_MAPPING_CONTRACT}`,
      EventType: 0,
      Id: 0,
      Order: 0,
      ChannelNumber: channel,
      DeviceId: id(deviceId),
    },
    ButtonDoublePressAction: null,
    ButtonId: 0,
    ButtonLongPressAction: null,
    ButtonState: BUTTON_ADDED,
    FunctionGroupType: 0,
    ButtonImageKey: null,
    ButtonImagePath: null,
    ImageId: null,
    MenuItem: { IndexInMenu: index, MenuName: FAVOURITE_MENU },
    TextOnRemote: channel,
  };
}

/**
 * The `SaveButtonMaps` argument that puts `channels` on a device: the device's map as `GetButtonMaps`
 * returned it, every member and every button carried through in order, the account's surface set on both
 * of its surface members as the client sets them, and one button per channel appended, numbered from
 * `indexBase`. Refused for a map that is not this device's, and for one that already holds favourites,
 * which the client would replace and this never does, so an earlier save is never overwritten unseen.
 *
 * **One difference from the client, deliberate**: the client's list also carries the device's other soft
 * buttons, the very objects already in the map, so its request names each of them twice; the service
 * keeps one, as the Harmony One's map read back with three more buttons and not twice as many. This sends
 * each once, which is the map the service ends up holding.
 */
export function favouritesPayload(map: Record<string, unknown>, deviceId: number, channels: readonly string[],
    surface: number, indexBase: number): Record<string, unknown> {
  if (!String(map['__type'] ?? '').startsWith('DeviceButtonMap:')) throw new Error('not a device\'s button map');
  if ((map['DeviceId'] as { Value?: number } | null)?.Value !== deviceId) throw new Error(`not device ${deviceId}'s map`);
  const held = favouritesOnMap(map);
  if (held.length > 0) {
    throw new Error(`device ${deviceId} already holds ${held.length} favourite channels, ${held.map((one) => one.channel).join(', ')}`);
  }
  if (channels.length === 0) throw new Error('no channel to save');
  if (channels.some((one) => typeof one !== 'string')) throw new Error('a channel is not text');
  const buttons = (map['Buttons'] ?? []) as Record<string, unknown>[];
  return {
    buttonMaps: [{
      ...map,
      ButtonMapSurfaceId: id(surface),
      Buttons: [...buttons, ...channels.map((channel, k) => favouriteButton(channel, deviceId, indexBase + k))],
      SurfaceId: id(surface),
    }],
  };
}

/**
 * The read back's verdict on a save: the device's map is now a stored one, with a number for an
 * identifier, and holds exactly `channels` as favourites, in that order, each tuning this device, with
 * every other button it held before still there. Returns what is wrong, or an empty list.
 */
export function favouritesSavedProblems(before: Record<string, unknown>, after: Record<string, unknown>, deviceId: number,
    channels: readonly string[]): string[] {
  const problems: string[] = [];
  const stored = (after['ButtonMapId'] as { Value?: unknown } | null)?.Value;
  if (typeof stored !== 'number') problems.push('the map has no stored identifier');
  const found = favouritesOnMap(after);
  if (JSON.stringify(found.map((one) => one.channel)) !== JSON.stringify(channels)) {
    problems.push(`the map holds favourites ${found.map((one) => one.channel).join(', ') || 'none'}, not ${channels.join(', ')}`);
  }
  if (found.some((one) => one.device !== deviceId)) problems.push(`a favourite tunes another device than ${deviceId}`);
  const count = (map: Record<string, unknown>) => ((map['Buttons'] ?? []) as unknown[]).length;
  if (count(after) !== count(before) + channels.length) {
    problems.push(`the map held ${count(before)} buttons and holds ${count(after)}, not ${count(before) + channels.length}`);
  }
  return problems;
}
