/**
 * A Harmony Touch set **built from a setup file with no Logitech document as input**, its put back, the description of
 * the account it takes its account values from, and the field by field comparison with 8.6's set: `todo-touch.md` 9.1.
 *
 * **What 9.1 is for.** 8.6 composed the four documents that name devices and activities from a description and ran them
 * on the bench Touch, 418 of 418, while every device's record, its codes and the definitions were carried from
 * Logitech's documents and Context and Settings stayed the remote's. 9.1 builds all six from
 * `packages/corpus/setups/touch-test.json`, the archive of the catalogue and our rhythm table, `buildTouchDocuments` in
 * the codec, and only the account's own values from a description of the account kept in the lab.
 *
 * **The account's values, and why a description of them.** Context's seven fields a Touch reads and the address and key
 * of the tuning device's favourites documents are the account's, which the remote echoes and asks by; and the six
 * addresses the answers carry name the account and the remote by number. None of that is Logitech's catalogue, and all
 * of it is the household's, so `describeTouchAccount` writes it from a set the remote holds into the lab, and a set is
 * built from that file. No value of it is printed, quoted in a test or kept in the repository.
 *
 * **The tags are digests of the content**, `ourTag`: the same document gives the same tag every time, whoever builds it,
 * so a set built twice from one file states the same six tags, and a remote that already holds a document is answered
 * 304 for it. That is the rule the answerer already uses for a set with no tags, `prepareSet`, made the set's own.
 *
 * **The set holds two pictures beside the six**: our background and its small twin, `ourBackground` in the codec, at
 * the addresses the screens build from our Settings, so the remote asks for both, is answered 200 with each, and shows
 * the background. A Settings that named no user background would make the screens ask for no picture on this set, and a
 * set that asks for none drops every stored picture from the remote at the commit, `empty.ts`; asking for these two
 * carries every picture the remote stores, the person's own backgrounds and the channel logos among them, into the new
 * set.
 *
 * **The put back is the set the remote held before, content and tags**, its six documents, since 9.1 delivers all six.
 * It holds no picture: the remote's own Settings names the person's backgrounds, which the remote then asks for with the
 * tags it holds and is answered 304, and nothing asks for ours again; our two pictures stay stored on the remote, as
 * every stored picture is carried into every later set.
 *
 * **The comparison**, `compareNothing`, is 8.6's, `compareSetup`, over all six documents and with 9.1's rules: our
 * documents against 8.6's set, which the bench ran, every field. Each is equal, equal after a normalisation the remote
 * does not tell apart (`NOTHING_NORMALISATIONS`), or different with why (`NOTHING_DIFFERENCES`); a field no row explains
 * fails the test. **The definitions are compared by what they send**, `waveformClosure`, command by command at each
 * device's repeat count, because ours are written from our table and theirs are Logitech's, so their fields differ by
 * construction while what each sends is the claim.
 *
 * Nothing here opens a remote.
 */
import { RecipeError, harmonyTouch, mergedIntervals, waveformOfArchiveCommand, type Pulse } from '@harmony/codec';

import { compareSetup, type ComparisonRules, type DocumentComparison, type Pair } from './touchsetupset.ts';
import { keyOf, ourTag, prepareSet, type SetAnswer, type TouchSet } from '../src/touchsync.ts';

/** The six documents a set of 9.1 delivers, in the order the remote asks for them. */
export const NOTHING_DOCUMENTS: readonly string[] = harmonyTouch.CONFIGURATION_DOCUMENTS;

/**
 * What a set of 9.1 takes from the account, as the lab keeps it: the codec's `TouchAccount`, and the address each of the
 * six answers carries, as the remote asks for it. Written by `describeTouchAccount`; never printed.
 */
export interface TouchAccountFile extends harmonyTouch.TouchAccount {
  readonly addresses: Readonly<Record<string, string>>;
}

type Json = Record<string, unknown>;
const isRecord = (x: unknown): x is Json => typeof x === 'object' && x !== null && !Array.isArray(x);
const documentsOf = (set: TouchSet): harmonyTouch.SyncDocuments => harmonyTouch.documentsOfAnswers(set.answers as unknown as harmonyTouch.SyncAnswer[]);

/**
 * The account's values out of a set the remote holds: Context's seven fields read, the favourites address and key of the
 * favourites activity's tuning device, and the six documents' addresses. Refuses a set that lacks one of the six, or
 * holds no single favourites activity whose device states both favourites fields.
 */
export function describeTouchAccount(set: TouchSet): { readonly account: TouchAccountFile } | { readonly refusal: string } {
  const addresses: Record<string, string> = {};
  for (const d of NOTHING_DOCUMENTS) {
    const a = set.answers.find((x) => keyOf(x.uri) === d);
    if (a === undefined) return { refusal: `the set holds no ${d}` };
    addresses[d] = a.uri;
  }
  const docs = documentsOf(set);
  const favourites = harmonyTouch.readConfiguration(docs).favourites;
  if (favourites.length !== 1) return { refusal: `the set holds ${favourites.length} favourites activities, not one` };
  const device = favourites[0]!.device?.source.Device;
  if (device === undefined || typeof device.DeviceProfileUri !== 'string' || device.ContentProfileKey === undefined || device.ContentProfileKey === null) {
    return { refusal: 'the favourites activity\'s tuning device states no favourites address and key' };
  }
  return {
    account: {
      context: harmonyTouch.describeTouchContext(docs.Context!),
      tuning: { DeviceProfileUri: device.DeviceProfileUri, ContentProfileKey: device.ContentProfileKey },
      addresses,
    },
  };
}

/**
 * The set of a setup file: the six documents `buildTouchDocuments` writes from the file, the archive at `archive` and the
 * account, each at the address the account names and under `ourTag`, in the order the remote asks for them; or why not,
 * the codec's refusal or the answerer's gate.
 */
export function withNothing(options: {
  readonly file: unknown;
  readonly archive: string;
  readonly account: TouchAccountFile;
}): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  let documents: harmonyTouch.SyncDocuments;
  try {
    documents = harmonyTouch.buildTouchDocuments(harmonyTouch.readTouchSetupFile(options.file), { archive: options.archive, account: options.account });
  } catch (e) {
    if (e instanceof harmonyTouch.ComposeRefusal || e instanceof RecipeError) return { refusals: [e.message] };
    throw e;
  }
  const answers: SetAnswer[] = [];
  for (const d of NOTHING_DOCUMENTS) {
    const uri = options.account.addresses[d];
    if (typeof uri !== 'string' || keyOf(uri) !== d) return { refusals: [`the account names no address of ${d}`] };
    const body = { 'body-type': 'application/json' as const, resource: documents[d] };
    answers.push({ uri, ...body, etag: ourTag(body) });
  }
  // The background and its twin, at the addresses our Settings makes the screens build, each under a digest too.
  const background = harmonyTouch.ourBackground();
  for (const [uri, png] of [[background.addresses.picture, background.picture], [background.addresses.twin, background.twin]] as const) {
    const body = { 'body-type': 'image/png' as const, resource: Buffer.from(png).toString('base64') };
    answers.push({ uri, ...body, etag: ourTag(body) });
  }
  const set: TouchSet = { answers };
  const gate = prepareSet(set);
  if ('refusals' in gate) return { refusals: gate.refusals };
  return { set };
}

/**
 * The put back: the six documents of `before`, content and tags, in the order the remote asks for them, and no picture,
 * the header says why. Refuses a document either set lacks, nothing differing between the two, and a set the gate
 * refuses.
 */
export function putBackNothing(forward: TouchSet, before: TouchSet): { readonly set: TouchSet } | { readonly refusals: readonly string[] } {
  const answers: SetAnswer[] = [];
  for (const d of NOTHING_DOCUMENTS) {
    if (!forward.answers.some((x) => keyOf(x.uri) === d)) return { refusals: [`the set put back holds no ${d}`] };
    const was = before.answers.find((x) => keyOf(x.uri) === d);
    if (was === undefined) return { refusals: [`the set before holds no ${d}`] };
    answers.push(JSON.parse(JSON.stringify(was)) as SetAnswer);
  }
  const six = forward.answers.filter((a) => NOTHING_DOCUMENTS.includes(keyOf(a.uri)));
  if (JSON.stringify(answers) === JSON.stringify(six)) return { refusals: ['the set before is the set itself, so nothing would be put back'] };
  const set: TouchSet = { answers };
  const gate = prepareSet(set);
  if ('refusals' in gate) return { refusals: gate.refusals };
  return { set };
}

// ---------------------------------------------------------------------------------------------------
// The comparison with 8.6's set
// ---------------------------------------------------------------------------------------------------

/** A list of steps, null, absent or empty: every one of them sends nothing. */
const noSteps = (x: unknown): boolean => x === undefined || x === null || (Array.isArray(x) && x.length === 0);

/**
 * **The normalisations, each a pair of values the remote does not tell apart, with the reading that says so.** The
 * engine's reader is `loader/userconfigreader.lua` in the lab's decompiled engine, and the screens' Lua is the lab's copy
 * of the image, `opt/luadraws`.
 */
export const NOTHING_NORMALISATIONS: ComparisonRules['normalisations'] = [
  {
    name: 'ids of ours',
    field: /(^|\.)(Id-|DeviceId-|ActivityId-|SequenceId|ButtonMapIdentifier)$/,
    applies: (p, ids) => p.oursPresent && p.theirsPresent && ids.same(p.ours, p.theirs),
    reading: 'as 8.6: a device, an activity, a map and a sequence are found by their ids and every reference names the same one',
  },
  {
    name: 'protocol ids of ours',
    field: /^(DevicesWithFeatures\[\]\.Commands\[\]\.ProtocolId|Protocols\[\]\.Id-)$/,
    applies: (p, ids) => p.oursPresent && p.theirsPresent && ids.sameProtocol(p.ours, p.theirs),
    reading: 'a command finds its definition by `ProtocolId` and nothing else (getCommandsAndToggleBytes keeps it, getProtocols keys by it); '
      + 'each id of ours names our definition of the family Logitech\'s id names, one to one, `OWN_IDS`',
  },
  {
    name: 'no steps as null, absent or an empty list',
    field: /Actions$/,
    applies: (p) => noSteps(p.ours) && noSteps(p.theirs),
    reading: 'every feature list is read only when it is a table (getStatesConfiguration, getActionItems), the next and previous lists only '
      + 'when not empty, and an empty list sends nothing; the set the bench ran 418 of 418 holds null and [] alike on features of one kind',
  },
  {
    name: 'a press held for 0 as a press',
    field: /Actions\[\]\.Duration$/,
    applies: (p) => (p.ours === null || p.ours === 0) && (p.theirs === null || p.theirs === 0),
    reading: 'a press is held only for a number (getActionItems), the engine\'s model sends the code once either way (touchengine.ts, holdMs), '
      + 'and the set the bench ran holds 0 on the Denon\'s presses and null on the LG TV\'s',
  },
  {
    name: 'a step\'s place, counted from another number',
    field: /Actions\[\]\.Order$/,
    applies: (p) => Number.isInteger(p.ours) && Number.isInteger(p.theirs),
    reading: 'a list\'s steps are ordered by `Order` and nothing else reads it (getActionItems, orderTableItems); these lists are matched '
      + 'place by place, so every other field equal at each place is the same steps in the same order',
  },
  {
    name: 'an input\'s place, counted from another number',
    field: /^DevicesWithFeatures\[\]\.DeviceFeatures\[\]\.Inputs\[\]\.InputOrder$/,
    applies: (p) => Number.isInteger(p.ours) && Number.isInteger(p.theirs),
    reading: 'the engine orders a device\'s inputs by `InputOrder` and the screens list them by it (getStatesConfiguration, '
      + 'changeInputs.lua); the one input differing is the Plex\'s only input, 1 for 2, so the order is the same',
  },
  {
    name: 'a state value\'s entry that sends nothing',
    field: /^DevicesWithFeatures\[\]\.DeviceFeatures\[\]\.StateValues\[\]\.(StateValueName|ActionSetType|Actions|IsAutoSwitch|Order)$/,
    applies: (p) => !p.oursPresent && /StateValues\[[^\]]* 0\]/.test(p.path),
    reading: 'an entry of set type 0 is neither a set nor a change list, so the engine only adds its value\'s name, which the same value\'s '
      + 'other entry already added (getStatesConfiguration); Logitech\'s records pair every value of the LG TV\'s Screen with one, the archive does not',
  },
];

/** The fields Logitech's command records carry that the reference lists as read by nothing. */
const COMMAND_FIELDS_READ_BY_NOTHING = /^DevicesWithFeatures\[\]\.Commands\[\]\.(CommandTypeId|DateTaught|FunctionGroupId|IsLearned)$/;
/** The device fields the reference lists as read by nothing on the remote, `devices-and-infrared.md` "What a writer must carry". */
const DEVICE_FIELDS_READ_BY_NOTHING = /^DevicesWithFeatures\[\]\.Device\.(DefaultPressMinRepeats|HoldInterKeyDelay|HoldInterDeviceDelay|IsInterKeyDelayOptimized|DeviceOrder|GroupName|PrivateAddType|DongleIndex|Characterization|CopiedDeviceSource|DeviceSearchType|DeviceClassification|AppLaunchConfigs|PictureId|RegionalCharset|DecodedEdid|EncodedEdid|ActivityIds|GlobalLanguageVersionId-|HoldMinRepeats)$/;
/** Device fields the engine copies into its own description of a device or its answers to other clients, or reads for a network device alone. */
const DEVICE_FIELDS_COPIED = /^DevicesWithFeatures\[\]\.Device\.(AutoDetectedDevice|BTAddress|DeviceAddedDate|DeviceCapabilitiesWithPriority(\[\]\..*)?|DeviceTypeDisplayName|Icon|SuggestedDisplay|DongleRFID|GlobalDeviceVersionId-|IsKeyboardAssociated|RegisterSection|RenewSection|Tokens)$/;
/** The features' fields no reader on the remote names, the reference's list and the engine's reader. */
const FEATURE_FIELDS_READ_BY_NOTHING = /^DevicesWithFeatures\[\]\.DeviceFeatures\[\]\.(CanSkipInputs|PowerOnResetInputName|ValueDelay|IsConfirmed|DateModified|Id|State|GlobalDeviceVersionId|GlobalDeviceVersionId-|HasAdditionalActions|IsActiveInput|PowerOffActionId|PowerOnActionId|PowerToggleActionId|ResetActions|.*Actions\[\]\.ActionId|Inputs\[\]\.(ActionId|ActionName|Attributes|DevActionType|HasAdditionalActions|Id|IsAutoSwitch|PortTypes(\[\]\..*)?|PressDuration|StateName|StateValue)|StateValues\[\]\.(IsAutoSwitch|Order))$/;
/** Context's fields a Touch synced through a computer does not read, `settings.ts`, `todo-touch.md` 8.4. */
const CONTEXT_FIELDS_NOT_READ = /^(AccountUri|ConfigVersion|CustomerId|DataConsent|GlobalRemoteUri|HouseholdDeviceProfileUri|HouseholdId-|KeyboardLocale|LatestSLAAccepted|LatestSLAAcceptedDate|Locale(\..*)?|Mode|Name|RemoteJid)$/;

/**
 * **The differences, each with why it does not change what the remote does, or the prediction 9.4 tests where it may.**
 * Every one is a field 8.6's set holds and ours leaves out or holds another way.
 */
export const NOTHING_DIFFERENCES: ComparisonRules['differences'] = [
  {
    name: 'command fields read by nothing',
    field: COMMAND_FIELDS_READ_BY_NOTHING,
    applies: (p) => !p.oursPresent,
    why: 'left out; no file of the engine, its screens or its native programs names them, `devices-and-infrared.md` "What a writer must carry"',
  },
  {
    name: 'a command\'s id and parameters',
    field: /^DevicesWithFeatures\[\]\.Commands\[\]\.(Id-|Parameters)$/,
    applies: (p) => !p.oursPresent && (p.field.endsWith('Id-') || p.theirs === null),
    why: 'left out; the engine reads a command\'s name, key code, protocol id, transport and raw code, and its parameters only when they are '
      + 'a table, null on every command of 8.6\'s set (getCommandsAndToggleBytes); the screens look a command up by its name alone '
      + '(getButtonTransportType)',
  },
  {
    name: 'a command\'s function id, which the archive does not hold',
    field: /(^DevicesWithFeatures\[\]\.Commands\[\]\.(FunctionId-|FunctionId)|(ButtonAction|ButtonLongPressAction|ButtonDoublePressAction)\.FunctionId-)$/,
    applies: (p) => !p.oursPresent,
    why: 'left out; the screens draw a screen entry\'s icon from `<FunctionId->.png` and an entry with none without an icon, as 8.1\'s device '
      + 'showed (activitycommands.lua, devicemode.lua); the gesture screen finds its button by name when the id is 0 or none (gesturepad.lua '
      + '121 to 139). **A look the run shows: the activity and device screen lists without icons.** No code is sent otherwise',
  },
  {
    name: 'the order of a device\'s commands',
    field: /^DevicesWithFeatures\[\]\.Commands \(order\)$/,
    applies: () => true,
    why: 'the archive\'s order; the engine keeps a device\'s commands by name in lower case (getCommandsAndToggleBytes) and the screens look one '
      + 'up by name (getButtonTransportType), so neither reads the order',
  },
  {
    name: 'device fields read by nothing',
    field: DEVICE_FIELDS_READ_BY_NOTHING,
    applies: (p) => !p.oursPresent,
    why: 'left out; the reference lists each as read by nothing, or stored and never used, `devices-and-infrared.md` "What a writer must carry"',
  },
  {
    name: 'device fields copied, or read for a network device alone',
    field: DEVICE_FIELDS_COPIED,
    applies: (p) => !p.oursPresent,
    why: 'left out; the engine copies them into its own description of the device and its answer to other clients (getDevicesConfiguration, '
      + 'device.lua, config.lua), where an absent text becomes `Default`, and reads the capabilities, the tokens and the sections only for a '
      + 'network device (canPassToPlugin behind isIpIRSupported); 8.1\'s device carried none of them and was heard 15 of 15',
  },
  {
    name: 'device fields for zones and the first time help',
    field: /^DevicesWithFeatures\[\]\.Device\.(ParentDeviceId|SetupState|State)$/,
    applies: (p) => !p.oursPresent,
    why: 'left out; the screens read a parent id only to find a multi zone device\'s main zone, where null, Logitech\'s on every device, finds none '
      + 'as absent does (isMainZoneDevice, portassignments.lua), and the setup state and state only to mark a wrong model in the first time help '
      + '(setDeviceSetupState), which a setup marked complete does not show',
  },
  {
    name: 'device fields named nowhere',
    field: /^DevicesWithFeatures\[\]\.Device\.(FriendlyName|ParentDevice-)$/,
    applies: (p) => !p.oursPresent,
    why: 'left out; neither name occurs in the engine or the screens but in a network plugin\'s own field and a test file',
  },
  {
    name: 'a favourites address on a device that does not tune the favourites',
    field: /^DevicesWithFeatures\[\]\.Device\.(DeviceProfileUri|ContentProfileKey)$/,
    applies: (p) => !p.oursPresent,
    why: 'left out on every device but the tuning device; a sync asks for a device\'s favourites document only for the favourites activity\'s '
      + 'device and a speaker\'s, `favourites-and-settings.md` "Which favourites documents are asked for", and the channel sync of the screens '
      + 'is for a network device (content.lua); 8.1\'s device carried neither',
  },
  {
    name: 'feature fields read by nothing',
    field: FEATURE_FIELDS_READ_BY_NOTHING,
    applies: (p) => !p.oursPresent,
    why: 'left out; the engine reads of a feature its delays, types, flags, inputs\' names, places, online marks and lists, and each step\'s kind, '
      + 'command, duration, delay, state and order (getStatesConfiguration, getActionItems), and the screens the same fields '
      + '(changeInputs.lua, fixactivityhelp.lua, the delay screens); none of these is among them',
  },
  {
    name: 'the outputs, which the engine ignores',
    field: /^DevicesWithFeatures\[\]\.DeviceFeatures\[\]\.(__type|DeviceId-|IsConfirmed|Outputs(\[\]\..*)?)$/,
    applies: (p) => !p.oursPresent && /DeviceFeatures\[OutputFeature\]/.test(p.path),
    why: 'left out; the engine logs an output feature and reads nothing of it (getStatesConfiguration), no screen names one, and the archive holds none',
  },
  {
    name: 'an input the archive does not mark online',
    field: /^DevicesWithFeatures\[\]\.DeviceFeatures\[\]\.Inputs\[\]\.IsOnline$/,
    applies: (p) => p.ours === false && p.theirs === true && /DevicesWithFeatures\[LG TV\]/.test(p.path),
    why: 'the LG TV\'s Netflix input, an app, which Logitech\'s record marks online and the archive does not; an online input takes the device\'s '
      + 'connected app power on delay at a start that selects it (getStatesConfiguration, touchengine.ts), and no activity of the setup selects it',
  },
  {
    name: 'the map list\'s function maps',
    field: /^FunctionMaps$/,
    applies: (p) => !p.oursPresent && p.theirs === null,
    why: 'left out where Logitech\'s states null; the remote asks for the map list without them, `excludeFunctionMaps=true`, and nothing reads the field',
  },
  {
    name: 'no toggle bit, which our table states for no family',
    field: /^Protocols\[\]\.IRSegments\[\]\.Payload\.ToggleBit$/,
    applies: (p) => p.ours === null && typeof p.theirs === 'number',
    why: 'Logitech\'s Microsoft 30 Bit names bit 14 as the toggle, which the engine replaces with its own state on every send, 0 on the '
      + 'first (irmanager.lua, toggleCounter); ours names none, since no row of our table states one, so the Xbox\'s codes carry the bit as '
      + 'the code writes it on every press. The first press is the same, `waveformClosure`. **A behaviour the run may show and the monitor '
      + 'cannot: two presses of one Xbox key in a row look to the console like the same press**',
  },
  {
    name: 'a definition of ours from the rhythm table',
    field: /^Protocols\[\]\./,
    applies: () => true,
    why: 'written by `definitionOfRow` from our table rather than carried from Logitech\'s catalogue, so its fields differ by construction; '
      + 'what it sends is held command by command against Logitech\'s, `waveformClosure`, where every command of the setup sends the same',
  },
  {
    name: 'settings named nowhere',
    field: /^Settings\[\]\.(Name|Values\[\]|DefaultValue|SettingId|MinCount|MaxCount)$/,
    applies: (p) => !p.oursPresent && /Settings\[(IsWiFiEnabled|TimeZoneFlag)\]/.test(p.path),
    why: 'left out; neither name occurs anywhere in the remote\'s software, `favourites-and-settings.md` "Settings"',
  },
  {
    name: 'a setting row\'s fields read by nothing',
    field: /^Settings\[\]\.(SettingId|MinCount|MaxCount)$/,
    applies: (p) => !p.oursPresent,
    why: 'left out; they occur nowhere in the remote\'s software, `favourites-and-settings.md` "Settings, field by field"',
  },
  {
    name: 'a default no row of ours falls back on',
    field: /^Settings\[\]\.DefaultValue$/,
    applies: (p) => p.ours === null,
    why: 'null; the remote consults a row\'s default only for a yes or no row with no value, and every row of ours has one, '
      + '`favourites-and-settings.md` "How a value is read"',
  },
  {
    name: 'the background, a picture of ours',
    field: /^Settings\[\]\.Values\[\]$/,
    applies: (p) => /Settings\[(UserImages|BackgroundImage)\]/.test(p.path) && p.ours === harmonyTouch.ourBackground().name,
    why: 'our background alone in `UserImages` and chosen in `BackgroundImage`, where 8.6\'s set names the person\'s own background and '
      + 'chooses one built into the remote: the screens ask for ours and its twin, which the set delivers with 200, and draw it from the '
      + 'stored file, `favourites-and-settings.md` "A background". **Two predictions for 9.4: the screen shows our background, dark blue '
      + 'with a yellow band, where 8.6 showed a built in one; and the person\'s own background is not in the picker while the set is held, '
      + 'and is again after the put back**, whose Settings names it',
  },
  {
    name: 'a picture store of ours',
    field: /^UserImageBucketUri$/,
    applies: (p) => p.ours === harmonyTouch.OUR_PICTURE_STORE,
    why: 'the text the screens prefix a user background\'s name with; nothing fetches from it on a Touch synced through a computer, where '
      + 'the answerer answers both addresses built from it, `OUR_PICTURE_STORE`',
  },
  {
    name: 'the default picture store, read for no background of ours',
    field: /^DefaultImageBucketUri$/,
    applies: (p) => p.ours === '',
    why: 'empty text; the remote fetches from it only a background neither built in nor the user\'s, `favourites-and-settings.md` '
      + '"A background", and ours is the user\'s',
  },
  {
    name: 'Context fields a Touch synced through a computer does not read',
    field: CONTEXT_FIELDS_NOT_READ,
    applies: (p) => !p.oursPresent,
    why: 'left out; the reading of `todo-touch.md` 8.4, `settings.ts`: read by nothing on such a remote, or only by a hub\'s, a network '
      + 'client\'s or the pairing code. **Whether the remote takes a Context without them is the prediction 9.4 tests**',
  },
];

/** 9.1's comparison: all six documents, the rules above, and three lists matched by a key of their own. */
export const NOTHING_RULES: ComparisonRules = {
  documents: NOTHING_DOCUMENTS,
  normalisations: NOTHING_NORMALISATIONS,
  differences: NOTHING_DIFFERENCES,
  keyed: {
    // A definition by its family, since ours and Logitech's are under ids of their own.
    Protocols: (x) => String(x['Name']),
    // A state value's entry by its value and its kind of list, so an entry one side lacks does not shift the rest.
    StateValues: (x) => `${String(x['StateValueName'])} ${String(x['ActionSetType'])}`,
    // A setting by its row's name, so a row one side lacks does not shift the rest.
    Settings: (x) => String(x['Name']),
  },
};

/** Our six documents against 8.6's, every field, by `NOTHING_RULES`. */
export function compareNothing(ours: harmonyTouch.SyncDocuments, theirs: harmonyTouch.SyncDocuments): DocumentComparison[] {
  return compareSetup(ours, theirs, NOTHING_RULES);
}

// ---------------------------------------------------------------------------------------------------
// What the definitions send
// ---------------------------------------------------------------------------------------------------

/** One device's commands, by what each sends from our documents against what it sends from theirs. */
export interface DeviceClosure {
  readonly device: string;
  /** Sent the same, its first transmission and its repeat, at the device's repeat count. */
  readonly same: number;
  readonly differs: readonly string[];
  /** A command either side holds and the other does not, or one either renderer declines. */
  readonly unmatched: readonly string[];
}

const sameTrain = (a: readonly Pulse[], b: readonly Pulse[]): boolean =>
  JSON.stringify(mergedIntervals(a)) === JSON.stringify(mergedIntervals(b));

/**
 * **What every command sends, ours against theirs**: each device of `ours` matched to `theirs` by name, each command by
 * its name as the engine finds it, and both rendered by the codec's one renderer of a catalogue definition,
 * `waveformOfArchiveCommand`, at the device's own repeat count, the first transmission and the held repeat. **Where the
 * renderer and the remote part**: the toggle, which the renderer clears as the remote's first send does and the remote
 * flips on every later press for a definition that states one; ours state none, so `toggling` names the families of
 * `theirs` that state one, whose later presses differ on the remote and nowhere here.
 */
export function waveformClosure(ours: harmonyTouch.SyncDocuments, theirs: harmonyTouch.SyncDocuments): { readonly devices: readonly DeviceClosure[]; readonly toggling: readonly string[] } {
  const a = harmonyTouch.readConfiguration(ours);
  const b = harmonyTouch.readConfiguration(theirs);
  const devices = a.devices.map((d): DeviceClosure => {
    const t = b.devices.find((x) => x.name === d.name);
    if (t === undefined) return { device: d.name ?? '?', same: 0, differs: [], unmatched: d.commands.map((c) => c.name ?? '?') };
    let same = 0;
    const differs: string[] = [];
    const unmatched: string[] = [];
    const names = new Set([...d.commandsByName.keys(), ...t.commandsByName.keys()]);
    for (const key of names) {
      const o = d.commandsByName.get(key);
      const x = t.commandsByName.get(key);
      if (o?.protocol === undefined || x?.protocol === undefined || typeof o.keyCode !== 'string' || typeof x.keyCode !== 'string') { unmatched.push(o?.name ?? x?.name ?? key); continue; }
      const mine = waveformOfArchiveCommand(o.protocol.archive, o.keyCode, { storedForm: false, repeats: d.pressRepeats });
      const yours = waveformOfArchiveCommand(x.protocol.archive, x.keyCode, { storedForm: false, repeats: t.pressRepeats });
      if ('refusal' in mine || 'refusal' in yours) { unmatched.push(o.name ?? key); continue; }
      if (sameTrain(mine.once, yours.once) && sameTrain(mine.held, yours.held)) same += 1;
      else differs.push(o.name ?? key);
    }
    return { device: d.name ?? '?', same, differs, unmatched };
  });
  const toggling = (theirs.ProtocolList?.Protocols ?? [])
    .filter((p) => (p.IRSegments ?? []).some((s) => isRecord(s.Payload) && typeof s.Payload['ToggleBit'] === 'number'))
    .map((p) => p.Name);
  return { devices, toggling };
}

export type { Pair };
