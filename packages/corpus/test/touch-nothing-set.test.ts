/**
 * The Harmony Touch set of `todo-touch.md` 9.1: the whole test setup built from a setup file, the archive of the
 * catalogue and our rhythm table, **with no Logitech document as input**, compared field by field with 8.6's set, which
 * the bench Touch ran 418 of 418, and its put back; built by `src/touchnothingset.ts` over the codec's
 * `buildTouchDocuments`, and rehearsed through the real answerer and session on the fake remote.
 *
 * **What is held here.**
 *
 * 1. **The account's values are described, not copied by hand**: the lab's account file, the fixture
 *    `touch_nothing_account`, is what `describeTouchAccount` writes from 8.6's put back, the set the bench Touch holds:
 *    Context's seven fields a Touch reads, the tuning device's favourites address and key, and the six addresses. It is
 *    compared here without printing a value of it, and it stays in the lab.
 * 2. **The set is built from the setup file**: all six documents at the account's addresses, and our background and its
 *    twin at the two addresses our Settings makes the screens build, each under a digest of its content, `ourTag`, so
 *    the set states every tag and none is the answerer's; the gate passes, its picture rule among it; the reader reads 5
 *    activities, 7 devices, 12 maps and 5 definitions; and the check finds the two findings of the screens' lists 8.6's
 *    set finds, refusing nothing. **Why a background of ours**: the screens ask for the pictures Settings' `UserImages`
 *    names, and asking for any picture is what carries every stored picture into the new set; with no user background
 *    named, a set of ours made them ask for none, so the person's own backgrounds and pictures would have left, the
 *    finding of 9.2's preparation, `empty.ts` in the codec.
 * 3. **The comparison, the heart of 9.1**: every field of our six documents against the same field of 8.6's set,
 *    matched by what the remote finds an entry by. Each is equal, equal after one of the seven stated normalisations, or
 *    different for one of the stated reasons, row by row: ActivityList 224 equal, 0 normalised, 0 different; DeviceList
 *    2318, 480, 3676; MapList 7362, 0, 531; Context 10, 0, 17; Settings 21, 0, 49; ProtocolList 320, 5, 59; and **no row
 *    unexplained**. ActivityList is equal whole, since an activity is composed from the same description by the same
 *    composer as in 8.6. Why each normalisation and difference changes nothing the remote does is the row's own text in
 *    `src/touchnothingset.ts`, with the reading behind it; the rows that rest on a prediction rather than a reading,
 *    entries with no icon, the Xbox's toggle bit, Context's fourteen fields, and our background shown with the person's
 *    own out of the picker until the put back, are what 9.4 runs.
 * 4. **What every command sends is the same**: our definitions are written from our rhythm table and theirs are
 *    Logitech's, so their fields differ by construction, and the claim is the waveform. Each of the 373 commands, 63,
 *    118, 31, 59, 38, 54 and 10 by device, sends the same pulses and gaps from our documents as from 8.6's, at its
 *    device's repeat count, `waveformClosure`; the one family 8.6's set states a toggle bit for is Microsoft 30 Bit, the
 *    Xbox's, which ours states none for.
 * 5. **The control**: the same setup file with one key of Watch TV sending another command is built and compared, and
 *    the comparison then holds an unexplained row, so "no row unexplained" can fail.
 * 6. **The write**: a remote holding 8.6's put back is answered all six 200 in one write of 381470 characters, 13 chunks
 *    of 31000, the last 9470; the list that asks for the pictures, as 8.6's closing run asked it with our two in place of
 *    the person's two, in one write of 5288 characters, one chunk, our two 200 and the eight logos 304; and the put
 *    back on a remote holding our set, all six 200 in 571577 characters, 19 chunks, the last 13577. None is larger than
 *    the 19 chunks of 6.8's write of six documents, which the bench Touch took.
 * 7. **The sets the lab holds**, `work/touch-firmware/sets/9.1-nothing` and `9.1-nothing-back`, are what this
 *    derivation gives, read by fixture, `touch_nothing_set` and `touch_nothing_set_back`.
 * 8. **On the fake remote**, the closing `--unchanged` run of 8.6 served as recorded, its first list asking with the
 *    tags of the set the remote holds, which is 8.6's put back, and its picture list asking for the backgrounds the
 *    Settings the remote holds by then names: our set answers all six 200 with its content and tags, our background and
 *    its twin 200, keeps every favourites document and logo the remote holds, and finishes; the put back answers the
 *    six 200 with 8.6's put back's content and tags and the person's backgrounds 304, asked with the tags the remote
 *    holds; and the control, our set on a remote holding it already, answers every request 304 but the finish.
 *
 * **What this does not show** is what the remote does with the set: that is the 9.4 run. The favourites documents and
 * pictures stay the remote's, since nothing in a setup composes them and 9.1 builds the six configuration documents.
 *
 * **Sources checked first.** The 9.1 brief in the lab; `touch-setup-set.test.ts`, whose comparison and fake remote this
 * follows; the codec's `fromnothing.ts`, `archivedevice.ts` and their test; `driving.ts`, `catalogue.ts` and `stated.ts`
 * for what crosses from the archive; the reference's `devices-and-infrared.md` and `favourites-and-settings.md`; and the
 * lab's decompiled engine and the screens' Lua in the lab's copy of the image for every reading the normalisations and
 * differences name. Logitech's client was not consulted: what is built is ours, and what it is compared with is the set
 * the remote ran.
 *
 * **Which architectures**: the Harmony Touch, firmware 4.15.330; its firmware reports 17 and Logitech's templates file it
 * under 18. The lab half reads the bench sets, the account file and the recorded lists, prints nothing out of them and
 * touches no remote; the half that builds needs the archive as well, and skips without either.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

import { harmonyTouch } from '@harmony/codec';
import * as lab from '@harmony/lab';

import { answersWhenHolding, writeOfAnswersSize } from '../src/touchchangedset.ts';
import { comparisonLines } from '../src/touchsetupset.ts';
import { compareNothing, describeTouchAccount, NOTHING_DOCUMENTS, putBackNothing, waveformClosure, withNothing, type TouchAccountFile } from '../src/touchnothingset.ts';
import { keyOf, ourTag, prepareSet, resultOf, type RemoteRequest, type TouchSet, type TouchSyncOutcome } from '../src/touchsync.ts';
import type { Scenario } from './touch-sync-run.ts';

/** 8.6's set, which the bench ran, and its put back, which the bench Touch holds since. */
const SETUP = 'touch_setup_set';
const HELD = 'touch_setup_set_back';
/** The account file and the two sets 9.1 built in the lab, by fixture. */
const ACCOUNT = 'touch_nothing_account';
const BUILT = 'touch_nothing_set';
const BUILT_BACK = 'touch_nothing_set_back';
const CLOSING = 'touch_setup_unchanged_';
const CLOSING_LISTS = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${CLOSING}list_${n}`);
const HAND_OVER_LIST = `${CLOSING}handover_list`;
const SETUP_FILE = fileURLToPath(new URL('../setups/touch-test.json', import.meta.url));

const json = (fixture: string): unknown => JSON.parse(new TextDecoder().decode(lab.require_(fixture)));
const setupFile = (): Record<string, any> => JSON.parse(readFileSync(SETUP_FILE, 'utf8'));
const account = (): TouchAccountFile => (json(ACCOUNT) as { account: TouchAccountFile }).account;
const requestsOf = (fixture: string): RemoteRequest[] => {
  const requests = resultOf(new TextDecoder().decode(lab.require_(fixture)))?.['requests'];
  assert.ok(Array.isArray(requests), fixture);
  return requests as RemoteRequest[];
};
const answer = (set: TouchSet, document: string) => set.answers.find((a) => keyOf(a.uri) === document)!;
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers as unknown as harmonyTouch.SyncAnswer[]);
/** Equal or not, said without printing either side: both hold the account's values and tags. */
const same = (a: unknown, b: unknown, what: string): void => assert.ok(isDeepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))), `${what} differ`);

/** The set of a setup file, as the script builds it. */
function built(file: unknown = setupFile()): TouchSet {
  const set = withNothing({ file, archive: lab.IR_ARCHIVE!, account: account() });
  if ('refusals' in set) throw new Error(set.refusals.join('; '));
  return set.set;
}

/** The chain as the bench will build it: the set held, ours, and its put back. */
function chain(): { held: TouchSet; ours: TouchSet; back: TouchSet } {
  const held = json(HELD) as TouchSet;
  const ours = built();
  const back = putBackNothing(ours, held);
  if ('refusals' in back) throw new Error(back.refusals.join('; '));
  return { held, ours, back: back.set };
}

/** The comparison's report, every line, as the script prints it: per document its counts, then each row. */
const EXPECTED_COMPARISON = [
  'ActivityList: 224 equal, 0 equal after a normalisation, 0 different',
  'DeviceList: 2318 equal, 480 equal after a normalisation, 3676 different',
  '  different 6: DevicesWithFeatures[].Commands (order), the order of a device\'s commands',
  '  different 373: DevicesWithFeatures[].Commands[].CommandTypeId, command fields read by nothing',
  '  different 373: DevicesWithFeatures[].Commands[].DateTaught, command fields read by nothing',
  '  different 373: DevicesWithFeatures[].Commands[].FunctionGroupId, command fields read by nothing',
  '  different 120: DevicesWithFeatures[].Commands[].FunctionId, a command\'s function id, which the archive does not hold',
  '  different 253: DevicesWithFeatures[].Commands[].FunctionId-, a command\'s function id, which the archive does not hold',
  '  different 373: DevicesWithFeatures[].Commands[].Id-, a command\'s id and parameters',
  '  different 373: DevicesWithFeatures[].Commands[].IsLearned, command fields read by nothing',
  '  different 373: DevicesWithFeatures[].Commands[].Parameters, a command\'s id and parameters',
  '  normalised 373: DevicesWithFeatures[].Commands[].ProtocolId, protocol ids of ours',
  '  different 7: DevicesWithFeatures[].Device.ActivityIds, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.AppLaunchConfigs, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.AutoDetectedDevice, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.BTAddress, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.Characterization, device fields read by nothing',
  '  different 6: DevicesWithFeatures[].Device.ContentProfileKey, a favourites address on a device that does not tune the favourites',
  '  different 7: DevicesWithFeatures[].Device.CopiedDeviceSource, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.DecodedEdid, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.DefaultPressMinRepeats, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.DeviceAddedDate, device fields copied, or read for a network device alone',
  '  different 30: DevicesWithFeatures[].Device.DeviceCapabilitiesWithPriority[].Capability, device fields copied, or read for a network device alone',
  '  different 30: DevicesWithFeatures[].Device.DeviceCapabilitiesWithPriority[].DeviceCapability, device fields copied, or read for a network device alone',
  '  different 30: DevicesWithFeatures[].Device.DeviceCapabilitiesWithPriority[].HasCapability, device fields copied, or read for a network device alone',
  '  different 30: DevicesWithFeatures[].Device.DeviceCapabilitiesWithPriority[].Priority, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.DeviceClassification, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.DeviceOrder, device fields read by nothing',
  '  different 6: DevicesWithFeatures[].Device.DeviceProfileUri, a favourites address on a device that does not tune the favourites',
  '  different 7: DevicesWithFeatures[].Device.DeviceSearchType, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.DeviceTypeDisplayName, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.DongleIndex, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.DongleRFID, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.EncodedEdid, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.FriendlyName, device fields named nowhere',
  '  different 7: DevicesWithFeatures[].Device.GlobalDeviceVersionId-, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.GlobalLanguageVersionId-, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.GroupName, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.HoldInterDeviceDelay, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.HoldInterKeyDelay, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.HoldMinRepeats, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.Icon, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.IsInterKeyDelayOptimized, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.IsKeyboardAssociated, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.ParentDevice-, device fields named nowhere',
  '  different 7: DevicesWithFeatures[].Device.ParentDeviceId, device fields for zones and the first time help',
  '  different 7: DevicesWithFeatures[].Device.PictureId, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.PrivateAddType, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.RegionalCharset, device fields read by nothing',
  '  different 7: DevicesWithFeatures[].Device.RegisterSection, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.RenewSection, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.SetupState, device fields for zones and the first time help',
  '  different 7: DevicesWithFeatures[].Device.State, device fields for zones and the first time help',
  '  different 7: DevicesWithFeatures[].Device.SuggestedDisplay, device fields copied, or read for a network device alone',
  '  different 7: DevicesWithFeatures[].Device.Tokens, device fields copied, or read for a network device alone',
  '  different 2: DevicesWithFeatures[].DeviceFeatures[].__type, the outputs, which the engine ignores',
  '  different 7: DevicesWithFeatures[].DeviceFeatures[].CanSkipInputs, feature fields read by nothing',
  '  different 25: DevicesWithFeatures[].DeviceFeatures[].DateModified, feature fields read by nothing',
  '  different 2: DevicesWithFeatures[].DeviceFeatures[].DeviceId-, the outputs, which the engine ignores',
  '  normalised 5: DevicesWithFeatures[].DeviceFeatures[].FinishActions, no steps as null, absent or an empty list',
  '  different 1: DevicesWithFeatures[].DeviceFeatures[].FinishActions[].ActionId, feature fields read by nothing',
  '  different 5: DevicesWithFeatures[].DeviceFeatures[].GlobalDeviceVersionId, feature fields read by nothing',
  '  different 20: DevicesWithFeatures[].DeviceFeatures[].GlobalDeviceVersionId-, feature fields read by nothing',
  '  different 1: DevicesWithFeatures[].DeviceFeatures[].GreaterHundredActions[].ActionId, feature fields read by nothing',
  '  different 1: DevicesWithFeatures[].DeviceFeatures[].GreaterTenActions[].ActionId, feature fields read by nothing',
  '  different 14: DevicesWithFeatures[].DeviceFeatures[].HasAdditionalActions, feature fields read by nothing',
  '  different 16: DevicesWithFeatures[].DeviceFeatures[].Id, feature fields read by nothing',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].ActionId, feature fields read by nothing',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].ActionName, feature fields read by nothing',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].Actions[].ActionId, feature fields read by nothing',
  '  normalised 19: DevicesWithFeatures[].DeviceFeatures[].Inputs[].Actions[].Duration, a press held for 0 as a press',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].Attributes, feature fields read by nothing',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].DevActionType, feature fields read by nothing',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].HasAdditionalActions, feature fields read by nothing',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].Id, feature fields read by nothing',
  '  normalised 1: DevicesWithFeatures[].DeviceFeatures[].Inputs[].InputOrder, an input\'s place, counted from another number',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].IsAutoSwitch, feature fields read by nothing',
  '  different 1: DevicesWithFeatures[].DeviceFeatures[].Inputs[].IsOnline, an input the archive does not mark online',
  '  different 33: DevicesWithFeatures[].DeviceFeatures[].Inputs[].PortTypes, feature fields read by nothing',
  '  different 4: DevicesWithFeatures[].DeviceFeatures[].Inputs[].PortTypes[].Attributes[], feature fields read by nothing',
  '  different 4: DevicesWithFeatures[].DeviceFeatures[].Inputs[].PortTypes[].Name, feature fields read by nothing',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].PressDuration, feature fields read by nothing',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].StateName, feature fields read by nothing',
  '  different 37: DevicesWithFeatures[].DeviceFeatures[].Inputs[].StateValue, feature fields read by nothing',
  '  different 7: DevicesWithFeatures[].DeviceFeatures[].IsActiveInput, feature fields read by nothing',
  '  different 2: DevicesWithFeatures[].DeviceFeatures[].IsConfirmed, feature fields read by nothing',
  '  normalised 2: DevicesWithFeatures[].DeviceFeatures[].NextActions, no steps as null, absent or an empty list',
  '  different 1: DevicesWithFeatures[].DeviceFeatures[].NextActions[].ActionId, feature fields read by nothing',
  '  different 3: DevicesWithFeatures[].DeviceFeatures[].Outputs[].Id, the outputs, which the engine ignores',
  '  different 3: DevicesWithFeatures[].DeviceFeatures[].Outputs[].IsActiveOutput, the outputs, which the engine ignores',
  '  different 3: DevicesWithFeatures[].DeviceFeatures[].Outputs[].NoOfPorts, the outputs, which the engine ignores',
  '  different 3: DevicesWithFeatures[].DeviceFeatures[].Outputs[].OutputName, the outputs, which the engine ignores',
  '  different 3: DevicesWithFeatures[].DeviceFeatures[].Outputs[].PortTypes[].Attributes[], the outputs, which the engine ignores',
  '  different 3: DevicesWithFeatures[].DeviceFeatures[].Outputs[].PortTypes[].Name, the outputs, which the engine ignores',
  '  different 7: DevicesWithFeatures[].DeviceFeatures[].PowerOffActionId, feature fields read by nothing',
  '  normalised 1: DevicesWithFeatures[].DeviceFeatures[].PowerOffActions, no steps as null, absent or an empty list',
  '  different 5: DevicesWithFeatures[].DeviceFeatures[].PowerOffActions[].ActionId, feature fields read by nothing',
  '  normalised 1: DevicesWithFeatures[].DeviceFeatures[].PowerOffActions[].Duration, a press held for 0 as a press',
  '  normalised 1: DevicesWithFeatures[].DeviceFeatures[].PowerOffActions[].Order, a step\'s place, counted from another number',
  '  different 7: DevicesWithFeatures[].DeviceFeatures[].PowerOnActionId, feature fields read by nothing',
  '  normalised 1: DevicesWithFeatures[].DeviceFeatures[].PowerOnActions, no steps as null, absent or an empty list',
  '  different 5: DevicesWithFeatures[].DeviceFeatures[].PowerOnActions[].ActionId, feature fields read by nothing',
  '  normalised 1: DevicesWithFeatures[].DeviceFeatures[].PowerOnActions[].Duration, a press held for 0 as a press',
  '  normalised 1: DevicesWithFeatures[].DeviceFeatures[].PowerOnActions[].Order, a step\'s place, counted from another number',
  '  normalised 4: DevicesWithFeatures[].DeviceFeatures[].PowerOnResetActions, no steps as null, absent or an empty list',
  '  different 7: DevicesWithFeatures[].DeviceFeatures[].PowerOnResetInputName, feature fields read by nothing',
  '  different 7: DevicesWithFeatures[].DeviceFeatures[].PowerToggleActionId, feature fields read by nothing',
  '  normalised 3: DevicesWithFeatures[].DeviceFeatures[].PowerToggleActions, no steps as null, absent or an empty list',
  '  different 2: DevicesWithFeatures[].DeviceFeatures[].PowerToggleActions[].ActionId, feature fields read by nothing',
  '  normalised 2: DevicesWithFeatures[].DeviceFeatures[].PowerToggleActions[].Duration, a press held for 0 as a press',
  '  normalised 1: DevicesWithFeatures[].DeviceFeatures[].PowerToggleActions[].Order, a step\'s place, counted from another number',
  '  normalised 2: DevicesWithFeatures[].DeviceFeatures[].PreviousActions, no steps as null, absent or an empty list',
  '  normalised 2: DevicesWithFeatures[].DeviceFeatures[].ResetActions, no steps as null, absent or an empty list',
  '  normalised 4: DevicesWithFeatures[].DeviceFeatures[].StartActions, no steps as null, absent or an empty list',
  '  different 1: DevicesWithFeatures[].DeviceFeatures[].StartActions[].ActionId, feature fields read by nothing',
  '  different 25: DevicesWithFeatures[].DeviceFeatures[].State, feature fields read by nothing',
  '  normalised 10: DevicesWithFeatures[].DeviceFeatures[].StateValues[].Actions, no steps as null, absent or an empty list',
  '  different 11: DevicesWithFeatures[].DeviceFeatures[].StateValues[].Actions[].ActionId, feature fields read by nothing',
  '  normalised 10: DevicesWithFeatures[].DeviceFeatures[].StateValues[].ActionSetType, a state value\'s entry that sends nothing',
  '  different 10: DevicesWithFeatures[].DeviceFeatures[].StateValues[].IsAutoSwitch, feature fields read by nothing',
  '  normalised 13: DevicesWithFeatures[].DeviceFeatures[].StateValues[].IsAutoSwitch, a state value\'s entry that sends nothing',
  '  different 10: DevicesWithFeatures[].DeviceFeatures[].StateValues[].Order, feature fields read by nothing',
  '  normalised 13: DevicesWithFeatures[].DeviceFeatures[].StateValues[].Order, a state value\'s entry that sends nothing',
  '  normalised 10: DevicesWithFeatures[].DeviceFeatures[].StateValues[].StateValueName, a state value\'s entry that sends nothing',
  'MapList: 7362 equal, 0 equal after a normalisation, 531 different',
  '  different 485: ButtonMaps[].Buttons[].ButtonAction.FunctionId-, a command\'s function id, which the archive does not hold',
  '  different 4: ButtonMaps[].Buttons[].ButtonDoublePressAction.FunctionId-, a command\'s function id, which the archive does not hold',
  '  different 41: ButtonMaps[].Buttons[].ButtonLongPressAction.FunctionId-, a command\'s function id, which the archive does not hold',
  '  different 1: FunctionMaps, the map list\'s function maps',
  'Context: 10 equal, 0 equal after a normalisation, 17 different',
  '  different 1: AccountUri, Context fields a Touch synced through a computer does not read',
  '  different 1: ConfigVersion, Context fields a Touch synced through a computer does not read',
  '  different 1: CustomerId, Context fields a Touch synced through a computer does not read',
  '  different 1: DataConsent, Context fields a Touch synced through a computer does not read',
  '  different 1: GlobalRemoteUri, Context fields a Touch synced through a computer does not read',
  '  different 1: HouseholdDeviceProfileUri, Context fields a Touch synced through a computer does not read',
  '  different 1: HouseholdId-, Context fields a Touch synced through a computer does not read',
  '  different 1: KeyboardLocale, Context fields a Touch synced through a computer does not read',
  '  different 1: LatestSLAAccepted, Context fields a Touch synced through a computer does not read',
  '  different 1: LatestSLAAcceptedDate, Context fields a Touch synced through a computer does not read',
  '  different 1: Locale.Location.Latitude, Context fields a Touch synced through a computer does not read',
  '  different 1: Locale.Location.Longitude, Context fields a Touch synced through a computer does not read',
  '  different 1: Locale.TimeZone, Context fields a Touch synced through a computer does not read',
  '  different 1: Locale.UserTimeZone, Context fields a Touch synced through a computer does not read',
  '  different 1: Mode, Context fields a Touch synced through a computer does not read',
  '  different 1: Name, Context fields a Touch synced through a computer does not read',
  '  different 1: RemoteJid, Context fields a Touch synced through a computer does not read',
  'Settings: 21 equal, 0 equal after a normalisation, 49 different',
  '  different 1: DefaultImageBucketUri, the default picture store, read for no background of ours',
  '  different 6: Settings[].DefaultValue, a default no row of ours falls back on',
  '  different 2: Settings[].DefaultValue, settings named nowhere',
  '  different 9: Settings[].MaxCount, a setting row\'s fields read by nothing',
  '  different 2: Settings[].MaxCount, settings named nowhere',
  '  different 9: Settings[].MinCount, a setting row\'s fields read by nothing',
  '  different 2: Settings[].MinCount, settings named nowhere',
  '  different 2: Settings[].Name, settings named nowhere',
  '  different 9: Settings[].SettingId, a setting row\'s fields read by nothing',
  '  different 2: Settings[].SettingId, settings named nowhere',
  '  different 2: Settings[].Values[], the background, a picture of ours',
  '  different 2: Settings[].Values[], settings named nowhere',
  '  different 1: UserImageBucketUri, a picture store of ours',
  'ProtocolList: 320 equal, 5 equal after a normalisation, 59 different',
  '  different 1: Protocols[].CodeSegments, a definition of ours from the rhythm table',
  '  different 1: Protocols[].CodeSegments[].Atoms[].MaxValue, a definition of ours from the rhythm table',
  '  different 1: Protocols[].CodeSegments[].Atoms[].MinValue, a definition of ours from the rhythm table',
  '  different 1: Protocols[].CodeSegments[].Atoms[].Type, a definition of ours from the rhythm table',
  '  different 1: Protocols[].CodeSegments[].Atoms[].Value, a definition of ours from the rhythm table',
  '  different 1: Protocols[].CodeSegments[].Header, a definition of ours from the rhythm table',
  '  different 2: Protocols[].CodeSegments[].Header[].MaxValue, a definition of ours from the rhythm table',
  '  different 2: Protocols[].CodeSegments[].Header[].MinValue, a definition of ours from the rhythm table',
  '  different 2: Protocols[].CodeSegments[].Header[].Type, a definition of ours from the rhythm table',
  '  different 2: Protocols[].CodeSegments[].Header[].Value, a definition of ours from the rhythm table',
  '  different 1: Protocols[].CodeSegments[].Name, a definition of ours from the rhythm table',
  '  different 1: Protocols[].CodeSegments[].Payload, a definition of ours from the rhythm table',
  '  different 1: Protocols[].CodeSegments[].TotalLength, a definition of ours from the rhythm table',
  '  different 1: Protocols[].CodeSegments[].Trailer, a definition of ours from the rhythm table',
  '  different 3: Protocols[].CodeSegments[].Trailer[].MaxValue, a definition of ours from the rhythm table',
  '  different 3: Protocols[].CodeSegments[].Trailer[].MinValue, a definition of ours from the rhythm table',
  '  different 3: Protocols[].CodeSegments[].Trailer[].Type, a definition of ours from the rhythm table',
  '  different 3: Protocols[].CodeSegments[].Trailer[].Value, a definition of ours from the rhythm table',
  '  different 1: Protocols[].HoldDelay, a definition of ours from the rhythm table',
  '  normalised 5: Protocols[].Id-, protocol ids of ours',
  '  different 1: Protocols[].IRSegments[].Payload.ToggleBit, no toggle bit, which our table states for no family',
  '  different 1: Protocols[].IRSegments[].TotalLength, a definition of ours from the rhythm table',
  '  different 1: Protocols[].IRSegments[].Trailer, a definition of ours from the rhythm table',
  '  different 1: Protocols[].IRSegments[].Trailer[].MaxValue, a definition of ours from the rhythm table',
  '  different 1: Protocols[].IRSegments[].Trailer[].MinValue, a definition of ours from the rhythm table',
  '  different 1: Protocols[].IRSegments[].Trailer[].Type, a definition of ours from the rhythm table',
  '  different 1: Protocols[].IRSegments[].Trailer[].Value, a definition of ours from the rhythm table',
  '  different 2: Protocols[].IsFullSequence, a definition of ours from the rhythm table',
  '  different 2: Protocols[].IsPadded, a definition of ours from the rhythm table',
  '  different 4: Protocols[].IsPublic, a definition of ours from the rhythm table',
  '  different 5: Protocols[].KeyCode.Finish, a definition of ours from the rhythm table',
  '  different 4: Protocols[].KeyCode.Start, a definition of ours from the rhythm table',
  '  different 4: Protocols[].PressMinimumRepeats, a definition of ours from the rhythm table',
];

const needed = lab.needing(lab.skipWithoutIrArchive(), lab.skipUnless(SETUP, HELD, ACCOUNT)).skip;

describe('the 9.1 set from nothing, its comparison with 8.6\'s set and its put back', { skip: needed }, () => {
  it('the account file is the account described from the set the bench Touch holds, and the setup file holds none of it', () => {
    const described = describeTouchAccount(json(HELD) as TouchSet);
    assert.ok('account' in described);
    same(account(), described.account, 'the account file and the account described');
    assert.deepEqual(Object.keys(account().addresses), [...NOTHING_DOCUMENTS]);
    // No value of the account is in the setup file: the addresses, the favourites address and key, and Context's text.
    const text = readFileSync(SETUP_FILE, 'utf8');
    const a = account();
    const values = [...Object.values(a.addresses), a.tuning!.DeviceProfileUri, String(a.tuning!.ContentProfileKey),
      ...Object.values(a.context).filter((v) => typeof v === 'string' || typeof v === 'number').map(String)].filter((v) => v.length > 2);
    assert.ok(values.length > 0);
    assert.equal(values.filter((v) => text.includes(v)).length, 0);
  });

  it('the set: six documents at the account\'s addresses under digests of their content, through the gate, read as the bench setup and checked as 8.6\'s set is', () => {
    const { ours } = chain();
    const background = harmonyTouch.ourBackground();
    assert.deepEqual(ours.answers.map((a) => keyOf(a.uri)), [...NOTHING_DOCUMENTS, background.addresses.picture, background.addresses.twin]);
    for (const a of ours.answers) {
      if (a['body-type'] === 'application/json') assert.equal(a.uri, account().addresses[keyOf(a.uri)], keyOf(a.uri));
      assert.equal(a.etag, ourTag({ 'body-type': a['body-type'], resource: a.resource }), keyOf(a.uri));
    }
    assert.deepEqual(ours.answers.slice(6).map((a) => [a['body-type'], a.resource]),
      [['image/png', Buffer.from(background.picture).toString('base64')], ['image/png', Buffer.from(background.twin).toString('base64')]]);
    const gate = prepareSet(ours);
    assert.ok(!('refusals' in gate));
    assert.deepEqual([gate.set.tags.stated, gate.set.tags.ours], [8, 0]);
    const read = harmonyTouch.readConfiguration(documentsOf(ours));
    assert.deepEqual([read.activities.length, read.devices.length, read.maps.length, read.protocols.length], [5, 7, 12, 5]);
    const findings = (s: TouchSet) => harmonyTouch.findingsByRule(harmonyTouch.checkConfiguration(harmonyTouch.readConfiguration(documentsOf(s))));
    assert.deepEqual(findings(ours), { 'repeated screen index': 2, 'number pad entry on no key': 2 });
    assert.deepEqual(findings(ours), findings(json(SETUP) as TouchSet));
    assert.deepEqual(harmonyTouch.refusalsBeforeASync(documentsOf(ours)), []);
  });

  it('the comparison: every field equal, equal after a stated normalisation or different for a stated reason, row by row, none unexplained', () => {
    const { ours } = chain();
    const comparison = compareNothing(documentsOf(ours), documentsOf(json(SETUP) as TouchSet));
    assert.deepEqual(comparisonLines(comparison), EXPECTED_COMPARISON);
    assert.equal(comparison.flatMap((c) => c.rows).filter((r) => r.why.startsWith('unexplained')).length, 0);
  });

  it('every one of the 373 commands sends the same from our documents as from 8.6\'s, and only the Xbox\'s family states a toggle bit there', () => {
    const { ours } = chain();
    const closure = waveformClosure(documentsOf(ours), documentsOf(json(SETUP) as TouchSet));
    assert.deepEqual(closure.devices.map((d) => [d.device, d.same, d.differs.length, d.unmatched.length]), [
      ['LG TV', 63, 0, 0], ['Denon AV Receiver', 118, 0, 0], ['Blu-ray', 31, 0, 0], ['Plex', 59, 0, 0], ['KPN', 38, 0, 0], ['Xbox', 54, 0, 0], ['Switch', 10, 0, 0],
    ]);
    assert.deepEqual(closure.toggling, ['Microsoft 30 Bit']);
  });

  it('the control: Watch TV\'s first key sending another command shows as an unexplained difference', () => {
    const file = setupFile();
    const watch = file.touch.activities.find((a: { activity: string }) => a.activity === 'Watch TV');
    const first = watch.buttons[0];
    const other = watch.buttons.find((b: any) => 'command' in b.press && 'command' in first.press && b.press.command !== first.press.command);
    watch.buttons[0] = { ...first, press: other.press };
    const comparison = compareNothing(documentsOf(built(file)), documentsOf(json(SETUP) as TouchSet));
    const unexplained = comparison.flatMap((c) => c.rows).filter((r) => r.why.startsWith('unexplained'));
    assert.ok(unexplained.some((r) => r.document === 'MapList' && r.field === 'ButtonMaps[].Buttons[].ButtonAction.CommandName'), comparisonLines(comparison).join('\n'));
  });

  it('the write: all six 200 for a remote holding 8.6\'s put back, in 13 chunks, and the put back all six 200 in 19, no chunk carrying a length', () => {
    const { held, ours, back } = chain();
    // The six, which the remote asks for in one list; the pictures are asked in another, on the fake remote below.
    const six = (set: TouchSet): TouchSet => ({ answers: set.answers.filter((a) => a['body-type'] === 'application/json') });
    const sizes = ([[ours, six(held)], [back, six(ours)]] as const).map(([set, holding]) => {
      const gate = prepareSet(set);
      assert.ok(!('refusals' in gate));
      const written = answersWhenHolding(gate.set, holding);
      assert.deepEqual(written.map((w) => ('refuse' in w ? 'refused' : w.statusCode)), NOTHING_DOCUMENTS.map(() => '200'));
      const size = writeOfAnswersSize(written);
      assert.ok(!size.line.includes('Content-Length'));
      return [size.length, size.chunks, size.perChunk, size.last];
    });
    assert.deepEqual(sizes, [[381470, 13, 31000, 9470], [571577, 19, 31000, 13577]]);
  });

  it('the put back is the set the bench Touch holds, content and tags, all six', () => {
    const { held, back } = chain();
    same(back, held, 'the put back and the set held');
  });

  it('the sets the lab holds are the ones this derivation gives, as parsed JSON, tags and all', lab.skipUnless(BUILT, BUILT_BACK), () => {
    const { ours, back } = chain();
    same(json(BUILT), ours, 'the lab\'s 9.1 set and the set built here');
    same(json(BUILT_BACK), back, 'the lab\'s 9.1 put back and the put back built here');
  });
});

// ---------------------------------------------------------------------------------------------------
// On the fake remote, through the real answerer and session
// ---------------------------------------------------------------------------------------------------

interface Run {
  readonly outcome: TouchSyncOutcome;
  readonly lines: { readonly name: string; readonly answers?: Record<string, unknown>[] }[];
}

/** One run of the answerer in a process of its own with the two request flags set, as `touch-sync.test.ts` runs it. */
function run(scenario: Scenario): Run {
  const script = fileURLToPath(new URL('./touch-sync-run.ts', import.meta.url));
  const out = execFileSync(process.execPath, [script], {
    input: JSON.stringify(scenario),
    env: { ...process.env, HARMONY_ENABLE_WRITES: '1', HARMONY_TOUCH_REQUESTS: '1', HARMONY_TOUCH_RECOVERY: '' },
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  return JSON.parse(out) as Run;
}

/**
 * The closing run's lists, the first one asking with the tags of `held` in place of the recorded ones, and the
 * background requests, the two addresses in the user's picture store, replaced by `backgrounds` in their places when it
 * is given: the backgrounds the Settings delivered names, as the screens ask for them once it is stored.
 */
function listsHolding(held: TouchSet, backgrounds?: readonly { readonly uri: string; readonly etag?: string }[]): RemoteRequest[][] {
  const lists = CLOSING_LISTS.map(requestsOf);
  lists[0] = lists[0]!.map((r) => ({ ...r, etag: answer(held, keyOf(r.uri)).etag! }));
  if (backgrounds === undefined) return lists;
  let next = 0;
  return lists.map((list) => list.map((r) => {
    if (!r.uri.startsWith('https://')) return r;
    const { etag: _, ...bare } = r;
    const b = backgrounds[next++]!;
    return { ...bare, uri: b.uri, ...(b.etag === undefined ? {} : { etag: b.etag }) };
  }));
}

/** Our two backgrounds as the screens ask for them: untagged on a remote that holds neither, with our tags on one that does. */
function ourBackgroundRequests(tagged?: TouchSet): { uri: string; etag?: string }[] {
  const b = harmonyTouch.ourBackground();
  return [b.addresses.picture, b.addresses.twin].map((uri) => ({ uri, ...(tagged === undefined ? {} : { etag: answer(tagged, uri).etag! }) }));
}

const syncAnswers = (r: Run): Record<string, unknown>[] =>
  r.lines.slice(r.lines.findIndex((l) => l.name === 'setup/sync')).flatMap((l) => l.answers ?? []);

/** The answers of a run by kind and status, in order: a document by name, else what the address is. */
function summary(r: Run): string[] {
  return syncAnswers(r).map((a) => {
    const uri = a['uri'] as string;
    const what = uri.startsWith('harmony://') ? harmonyTouch.documentKeyOf(uri)! : uri.startsWith('content://') ? 'favourites'
      : uri.startsWith('proxy://') ? 'finish' : uri.startsWith('https://') ? 'background' : 'logo';
    return `${what} ${String(a['statusCode'])}`;
  });
}

const RECORDED_SHAPE = [
  'ActivityList', 'DeviceList', 'MapList', 'Context', 'Settings', 'ProtocolList',
  'favourites', 'favourites', 'favourites', 'background', 'background', ...Array(8).fill('logo'), 'finish',
];
const SIX: readonly string[] = NOTHING_DOCUMENTS;
/** The characters of the write answering the picture list of our run, asserted exactly. */
const PICTURE_WRITE = 5288;

describe('on the fake remote, the 9.1 run and its put back', { skip: lab.needing(lab.skipWithoutIrArchive(), lab.skipUnless(SETUP, HELD, ACCOUNT, HAND_OVER_LIST, ...CLOSING_LISTS)).skip }, () => {
  let sets: ReturnType<typeof chain> | undefined;
  const chained = () => (sets ??= chain());

  it('the recorded closing run of 8.6 asked for the six with the tags of 8.6\'s put back, and for the person\'s background and its twin with the tags the remote held', () => {
    const { held } = chained();
    assert.deepEqual(requestsOf(CLOSING_LISTS[0]!).map((r) => [keyOf(r.uri), r.etag === answer(held, keyOf(r.uri)).etag]), SIX.map((d) => [d, true]));
    const backgrounds = CLOSING_LISTS.flatMap(requestsOf).filter((r) => r.uri.startsWith('https://'));
    assert.deepEqual(backgrounds.map((r) => [r.uri.endsWith('_small.png'), typeof r.etag === 'string' && r.etag.length > 0]), [[false, true], [true, true]]);
  });

  it('our set: all six 200 with its content and tags, our background and its twin 200 with the pictures, favourites and logos 304, finished', () => {
    const { held, ours } = chained();
    const r = run({ mode: { kind: 'set', set: ours }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(held, ourBackgroundRequests()) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${SIX.includes(w) || w === 'background' || w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => /^(harmony|https):\/\//.test(String(x['uri'])))) {
      const mine = answer(ours, keyOf(a['uri'] as string));
      assert.ok(a['etag'] === mine.etag && a['body-type'] === mine['body-type'] && isDeepStrictEqual(a['resource'], mine.resource), keyOf(a['uri'] as string));
    }
    // The write that answers the picture list: our two at 200 and the eight logos at 304, in one chunk.
    const write = r.lines.find((l) => (l.answers ?? []).some((a) => String(a['uri']).startsWith('https://')))!;
    const size = writeOfAnswersSize(write.answers!);
    assert.deepEqual([write.answers!.length, size.length, size.chunks], [10, PICTURE_WRITE, 1]);
  });

  it('the put back on a remote holding our set: all six 200 with the content and tags of 8.6\'s put back, the person\'s backgrounds 304 as the remote holds them, the rest as before, finished', () => {
    const { held, ours, back } = chained();
    const r = run({ mode: { kind: 'set', set: back }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(ours) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${SIX.includes(w) || w === 'finish' ? 200 : 304}`));
    for (const a of syncAnswers(r).filter((x) => String(x['uri']).startsWith('harmony://'))) {
      const was = answer(held, keyOf(a['uri'] as string));
      assert.ok(a['etag'] === was.etag && isDeepStrictEqual(a['resource'], was.resource), keyOf(a['uri'] as string));
    }
  });

  it('our set on a remote holding it already, our backgrounds asked with our tags: every request 304 but the finish, the control', () => {
    const { ours } = chained();
    const r = run({ mode: { kind: 'set', set: ours }, handOver: [requestsOf(HAND_OVER_LIST)], sync: listsHolding(ours, ourBackgroundRequests(ours)) });
    assert.equal(r.outcome.ending, 'finished', r.outcome.reason);
    assert.deepEqual(summary(r), RECORDED_SHAPE.map((w) => `${w} ${w === 'finish' ? 200 : 304}`));
  });
});
