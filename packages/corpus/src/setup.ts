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
import type { ActivityRoleName, SetupActivity as AssemblyActivity, SetupDevice as AssemblyDevice } from '@harmony/codec';

/**
 * One device of a setup: what the remote calls it, and its catalogue entry as `<manufacturer>/<file>`.
 * `poweredOnBetweenActivities` is MyHarmony's "I want to keep this device on when switching Activities
 * and only turn it off when I press the Off button": `IsPoweredOnBetweenActivities` in the device's power
 * feature, read in the client's power settings view. Absent means the default, off.
 *
 * **The codec's type**, since `todo-compile-650.md` 10.6: the codec's `assembleSetup` builds a container
 * from the same file, and the codec cannot import this package, so the shape lives there and this names
 * it. Two copies of one shape are two copies until one of them moves.
 */
export type SetupDevice = AssemblyDevice;

/**
 * The jobs a device can do in an activity, as the contract names their role types. The codec's list,
 * since the activity composer takes the same roles, `activityFromRoles`, and one vocabulary in two
 * places is two until one of them moves. A device listed with none is a pass through device here too.
 */
export type RoleName = ActivityRoleName;

/** The activity types this setup uses, by the contract's name; `Custom` holds no activity key. */
export const ACTIVITY_TYPES = { WatchTV: 1, WatchDvd: 2, ListenToMusic: 4, Custom: 5 } as const;

/** The codec's activity of a setup, with its type narrowed to the four this package sends. */
export interface SetupActivity extends AssemblyActivity {
  readonly type: keyof typeof ACTIVITY_TYPES;
}

/** A setup, which the codec's `assembleSetup` takes as its `SetupDescription`. */
export interface Setup {
  readonly about?: string;
  readonly devices: readonly SetupDevice[];
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
