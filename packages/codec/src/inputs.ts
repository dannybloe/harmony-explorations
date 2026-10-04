/**
 * A device's inputs: the state variables that say which input it is on, and the transitions that put
 * it there, composed from Logitech's catalogue and read back out of a configuration. Section 321.
 *
 * **What an input is, before what the bytes are.** A television has several sockets and a key or a
 * menu that chooses between them. An activity such as "Watch TV" wants the television on the socket
 * the set top box is in. A Harmony does not send "HDMI 1" from the activity: the activity writes a
 * number into the device's `Input` variable, and the variable's transition for that number is what
 * sends the code, the same way the `Power` variable sends the power code (section 273's design note,
 * restated in `composeActivity`). So composing inputs is composing that variable and its transitions,
 * and letting an activity's start set it is one more `{variable, value}` target.
 *
 * **The catalogue states inputs in two layers, and the compiler keeps both**, measured on thirteen
 * Logitech compiles for the Harmony 600, 650 and 700, section 321:
 *
 * - `inputs.list`, the inputs a person picks from, becomes `<label>_Input_<n>`: value `v` is the
 *   `v`th input, and each value has one transition whose `from` is `-2`.
 * - `states`, the device's own internal state machines (Logitech's `InternalStateFeature`), each
 *   become `<label>_<state>_<n>`. An input whose commands are `{set, to}` steps does not send anything
 *   itself: its transition **writes the state variables**, and their transitions send. That is how
 *   an LG television reaches "DTV": its `Input` transition writes `Screen` to `Antenna` and `TVInput`
 *   to `DTV`; `Screen`'s transition sends `InputTv` and waits two seconds; `TVInput`'s transition
 *   from wherever it was steps forward with `InputTv` as many times as it takes.
 *
 * Two ways to reach a value, both measured:
 *
 * - **directly**: the value states commands that select it. Its transition is `from -2` when
 *   Logitech's `setType` is 1 and `from -3` when it is 2, which MyHarmony's client names
 *   `SetStateValue` and `ChangeSetStateValue` (client sourced, decision 2). Section 277 read the
 *   Harmony One's transition walker treating `0xFFFE` as a wildcard and `0xFFFD` as "the value
 *   changed"; the Harmony 600, 650 and 700's walker is not read.
 * - **by stepping**: the state states one `next` list and its values nothing. Then there is a
 *   transition for every ordered pair of values `i` to `j`, holding `next` repeated
 *   `(j - i) mod n` times, so it always steps forward and wraps round.
 *
 * **Which variables exist at all**, measured: a device with one input gets an input variable only when
 * that input steps, and then it has one value and no transitions (the Quasar SP2717T; the KPN box and
 * the Plex player get none). A state that no input writes, directly or through another state, is not
 * compiled: the Quasar's six. The Chromecast of `h600_config` has a one value input variable too, and
 * no infrared catalogue entry identifies it, so it is counted and not explained.
 *
 * **A command is named the way the rules name it, matched without case** where the codeset spells it
 * otherwise, `commandIndex`.
 *
 * **How long each command waits is per layer**, the `0x7C` quantity paired with every send
 * (`DEVICE_QUANTITY`): a send an input states itself, or its `next`, waits the device's input delay;
 * one a state states waits its key delay. A Denon receiver's inputs wait 10 tenths and a Panasonic
 * television's state selects 1, though both devices' input delay is a second.
 *
 * **What the catalogue leaves unstated, and what this therefore gets wrong or refuses**. The first three
 * are stated in the raw capture behind the archive and `catalogueRules` in `catalogueraw.ts` now returns
 * them beside the archive's rules; nothing here reads them yet:
 *
 * - **A silent write.** Logitech's raw data says per state step whether it *sets* a state, sending
 *   its code, or only *records* it, `DevActionType` 2 and 1, and the compiler writes the second behind
 *   `0x07 0xFFFF`, the silent flag (section 74). The archive keeps the step and drops the flag, so a
 *   composed step always sends. 191850 of 193647 state steps in the raw capture's inputs are of the
 *   sending kind.
 * - **A connected app's wait.** An input Logitech marks online gets a conditional wait for the
 *   device's connected app ahead of its commands, on one compiled device here; the archive drops the
 *   mark, so a composed input has no such wait.
 * - **The input order.** The archive keeps its inputs in the order of the service's array, and the
 *   compiler numbers them by `InputOrder`, which the archive drops; on one of the calibration devices
 *   the two differ, and on another the account was reordered after it was added. The numbering is a
 *   name for a value and changes nothing the remote does, which is why the calibration compares
 *   inputs by what they send rather than by number.
 * - **Unexplained, and composed anyway.** The Panasonic TH-42PA30's catalogue entry reaches four
 *   values by one `Select` press each, and Logitech's compile holds no transition for any of the four,
 *   though the code is in its group and the same entry's other `-3` values compile. A composed device
 *   sends `Select` there.
 * - Refused, because no compile in the lab shows what Logitech does with them: an input list's or a
 *   state's `start`, `finish` or `previous`; `canSkip`; a press held for a time inside an input; a
 *   value reached two ways; a state that both selects and steps; a `setType` other than 1 or 2; a
 *   device whose inputs nothing reaches; a delay that is not whole tenths; and the twelve devices whose
 *   input delay is above zero and below their key delay, where the two rules that fit every measured
 *   device give different answers.
 *
 * **Scope, decision 16**: measured and composed on arch 14 only, the Harmony 600, 650 and 700. Other
 * architectures are refused rather than assumed.
 *
 * Decision 15 and decision 11 apply as for `driving.ts`: what is composed here is Logitech's data and
 * a composed device carries it.
 */
import { Container, type Instruction, archSlot, parse } from './gspm.ts';
import { STATE_WRITE_BASE } from './actions.ts';
import { ACTION_LIST_INDEX_OPCODE, STATE_RECORD_HEADER, STATE_VALUE_LENGTH, stateTable } from './sections.ts';
import { DEVICE_QUANTITY, INPUT_PROPERTY, SEND_INFRARED, deviceVariables, stateVariables } from './inventory.ts';
import { relocate } from './relocate.ts';
import { Writer } from './emit.ts';
import {
  ACTION_TABLE_SLOT, ComposeError, type ComposeActivityTarget, type ComposedDevice, SILENT_WRITE,
  STATE_WRITE_LIMIT, activityPowerTargets, appendNarrowStateVariable, appendTableEntries, restamped,
} from './compose.ts';
import type { DeviceDriving, DeviceState, DriveStep } from './driving.ts';

// The property word an input variable's name carries, `<label>_Input_<n>`, is `INPUT_PROPERTY` in
// `inventory.ts`, which the tag 5 reader of section 313 declared first: one copy, not two.
/** A transition's `from` that matches whatever the variable held, `0xFFFE`; `setType` 1. */
export const FROM_ANY = -2;
/** A transition's `from` that matches when the value changed, `0xFFFD`; `setType` 2. */
export const FROM_CHANGED = -3;
/** The architecture the encoding was measured on: the Harmony 600, 650 and 700. */
const INPUT_ARCHITECTURE = 14;
/** Delays in the catalogue are milliseconds, the `0x7C` quantity tenths. */
const MS_PER_TENTH = 100;
/** The quantity is the operand's low byte. */
const QUANTITY_MAX = 0xff;

/** `setType` to the `from` sentinel the compiler writes, measured, see the module comment. */
const FROM_OF_SET_TYPE: ReadonlyMap<number, number> = new Map([[1, FROM_ANY], [2, FROM_CHANGED]]);

/** One step of a planned transition, in the catalogue's names. */
export type PlannedStep =
  /** Send a command of the device, then wait `amount` tenths before its next command. */
  | { readonly kind: 'send'; readonly command: string; readonly amount: number }
  /** Wait, sending nothing: a bare `0x7C` for the device. */
  | { readonly kind: 'wait'; readonly tenths: number }
  /** Put one of the device's state variables into a value, which runs that variable's transition. */
  | { readonly kind: 'write'; readonly state: string; readonly value: number };

/** One transition: from a value or a sentinel, to a value, running `steps`; none is the null instruction. */
export interface PlannedTransition {
  readonly from: number;
  readonly to: number;
  readonly steps: readonly PlannedStep[];
}

/** One variable: its property word, the name of each value in order, and its transitions. */
export interface PlannedVariable {
  readonly property: string;
  readonly values: readonly string[];
  readonly transitions: readonly PlannedTransition[];
}

/** What a device's catalogue rules become: the input variable, if any, and one variable per state. */
export interface InputPlan {
  readonly input?: PlannedVariable;
  readonly states: readonly PlannedVariable[];
}

/** A whole number of tenths from milliseconds, or a refusal naming where it came from. */
function tenths(ms: number, what: string): number {
  if (!Number.isInteger(ms) || ms < 0 || ms % MS_PER_TENTH !== 0 || ms / MS_PER_TENTH > QUANTITY_MAX) {
    throw new ComposeError(`${what} is ${ms} ms, which is not a whole number of tenths up to ${QUANTITY_MAX}`);
  }
  return ms / MS_PER_TENTH;
}

/**
 * The plan for a device's inputs out of its catalogue rules, pure, refusing every shape no compile in
 * the lab shows. The rules are the module comment's; each refusal names the shape.
 */
export function inputPlan(driving: DeviceDriving): InputPlan {
  const { timing, inputs } = driving;
  const states: ReadonlyMap<string, DeviceState> = driving.states ?? new Map<string, DeviceState>();

  // The two waits, measured: an input's own sends wait the input delay, a state's its key delay.
  // A device with no input delay waits its key delay on both, the Sony television of calibration_h600.
  // Above zero and below the key delay the two rules that fit every measured device disagree, so that
  // case is refused rather than chosen between.
  if (timing.inputDelay > 0 && timing.inputDelay < timing.interKeyDelay) {
    throw new ComposeError(`the input delay ${timing.inputDelay} ms is below the key delay `
      + `${timing.interKeyDelay} ms, and no compile shows which one an input's sends wait`);
  }
  const keyAmount = tenths(timing.interKeyDelay, 'the key delay');
  const inputAmount = timing.inputDelay > 0 ? tenths(timing.inputDelay, 'the input delay') : keyAmount;

  if (inputs === undefined) {
    if (states.size > 0) throw new ComposeError('the device states states and no inputs, which no compile shows');
    return { states: [] };
  }
  for (const key of ['start', 'finish', 'previous'] as const) {
    if (inputs[key] !== undefined) throw new ComposeError(`the inputs state a ${key} list, which no compile shows`);
  }
  if (inputs.canSkip !== undefined) throw new ComposeError('the inputs state canSkip, which no compile shows');
  const list = inputs.list ?? [];
  // A device with one input that does not step gets no input variable: the KPN box and the Plex
  // player on the Harmony 650's own configuration, one of them with a command for its one input and
  // one without. One that steps gets a variable of one value and no transitions, since there is
  // nowhere to step to: the Quasar SP2717T of h700_power_hold_compile_3, below.
  if (list.length === 0 || (list.length === 1 && inputs.next === undefined)) {
    if (states.size > 0) throw new ComposeError('one input that does not step, and some states, which no compile shows');
    return { states: [] };
  }

  const stateNames = [...states.keys()];
  for (const name of stateNames) {
    // The name becomes `<label>_<name>_<n>`, whose underscore is the separator, section 126.
    if (!/^[A-Za-z0-9]+$/.test(name) || name === INPUT_PROPERTY) {
      throw new ComposeError(`a state called ${JSON.stringify(name)} cannot be named in the name tree`);
    }
  }

  /** One catalogue step as a planned one, at the wait a send in this layer takes. */
  const step = (one: DriveStep, amount: number, where: string): PlannedStep => {
    switch (one.kind) {
      case 'send':
        if (one.holdMs !== undefined) throw new ComposeError(`${where} holds ${one.command} for a time, which no compile shows`);
        return { kind: 'send', command: one.command, amount };
      case 'hold':
        throw new ComposeError(`${where} holds ${one.command}, which no compile shows`);
      case 'wait':
        return { kind: 'wait', tenths: tenths(one.ms, `a wait in ${where}`) };
      case 'state': {
        const state = states.get(one.state);
        const value = state?.values.findIndex((v) => v.name === one.value) ?? -1;
        if (state === undefined || value < 0) {
          throw new ComposeError(`${where} sets ${one.state} to ${one.value}, which the device does not declare`);
        }
        return { kind: 'write', state: one.state, value };
      }
    }
  };
  const steps = (list: readonly DriveStep[], amount: number, where: string): PlannedStep[] =>
    list.map((one) => step(one, amount, where));

  /** Every ordered pair of distinct values, `next` repeated as many times as it takes going forward. */
  const stepping = (n: number, next: readonly PlannedStep[]): PlannedTransition[] => {
    const out: PlannedTransition[] = [];
    for (let from = 0; from < n; from += 1) {
      for (let to = 0; to < n; to += 1) {
        if (from === to) continue;
        const times = (to - from + n) % n;
        out.push({ from, to, steps: Array.from({ length: times }, () => next).flat() });
      }
    }
    return out;
  };

  // **A state no input reaches is left out**, measured on the Quasar SP2717T: its catalogue entry
  // states six states and one input that steps with `InputNext`, so nothing ever writes a state, and
  // Logitech's compile holds its power and input variables and none of the six. Reached means
  // written by an input's commands or by a reached state's own commands, followed to the end.
  const writes = (list: readonly DriveStep[] | undefined): string[] =>
    (list ?? []).flatMap((one) => (one.kind === 'state' ? [one.state] : []));
  const reached = new Set<string>();
  const pending = [...writes(inputs.next), ...list.flatMap((one) => writes(one.commands))];
  while (pending.length > 0) {
    const name = pending.pop()!;
    if (reached.has(name)) continue;
    reached.add(name);
    const state = states.get(name);
    if (state === undefined) continue;
    pending.push(...writes(state.next), ...state.values.flatMap((v) => (v.select ?? []).flatMap((way) => writes(way.steps))));
  }

  const planned: PlannedVariable[] = stateNames.filter((name) => reached.has(name)).map((name) => {
    const state = states.get(name)!;
    for (const key of ['start', 'finish', 'previous'] as const) {
      if (state[key] !== undefined) throw new ComposeError(`state ${name} states a ${key} list, which no compile shows`);
    }
    if (state.valueDelay !== undefined) throw new ComposeError(`state ${name} states a value delay, which no compile shows`);
    if (state.values.length < 1 || state.values.length > QUANTITY_MAX + 1) {
      throw new ComposeError(`state ${name} has ${state.values.length} values`);
    }
    const values = state.values.map((v) => v.name);
    const selecting = state.values.some((v) => v.select !== undefined);
    if (state.next !== undefined) {
      if (selecting) throw new ComposeError(`state ${name} both selects and steps, which no compile shows`);
      return {
        property: name, values,
        transitions: stepping(values.length, steps(state.next, keyAmount, `state ${name}'s next`)),
      };
    }
    const transitions: PlannedTransition[] = [];
    state.values.forEach((value, to) => {
      if (value.select === undefined) return;
      if (value.select.length !== 1) throw new ComposeError(`${name} ${value.name} is reached ${value.select.length} ways`);
      const way = value.select[0]!;
      const from = FROM_OF_SET_TYPE.get(way.setType);
      if (from === undefined) throw new ComposeError(`${name} ${value.name} has setType ${way.setType}, which no compile shows`);
      transitions.push({ from, to, steps: steps(way.steps, keyAmount, `${name} ${value.name}`) });
    });
    return { property: name, values, transitions };
  });

  const names = list.map((one) => one.name);
  const commanded = list.filter((one) => one.commands !== undefined);
  let transitions: PlannedTransition[];
  if (inputs.next !== undefined) {
    // Stepping through the inputs themselves, a Panasonic television of 2006 on the Harmony 650.
    if (commanded.length > 0) throw new ComposeError('the inputs both step and state commands, which no compile shows');
    transitions = stepping(names.length, steps(inputs.next, inputAmount, 'the inputs\' next'));
  } else {
    // An input with no commands gets the null instruction, three inputs on the Harmony 700's
    // configuration; a device where no input has any is refused, since no compile shows one.
    if (commanded.length === 0) throw new ComposeError('no input states a command and the inputs do not step');
    transitions = list.map((one, to) => ({
      from: FROM_ANY, to,
      steps: one.commands === undefined ? [] : steps(one.commands, inputAmount, `input ${one.name}`),
    }));
  }
  return { input: { property: INPUT_PROPERTY, values: names, transitions }, states: planned };
}

/**
 * Where a driving rule's command name sits among a codeset's names. Exactly first, and otherwise
 * ignoring case, because the catalogue's two halves spell some names differently: the Denon
 * AVR-X4800H's rules say `InputTvAudio`, `InputUSB` and `InputHeos` where its codeset says
 * `InputTVAudio`, `InputUsb` and `InputHEOS`, and the Panasonic TX-P42GT30E's say `InputHdmi3` for
 * `InputHDMI3`. Logitech's compiler sends those commands, so the names are one command each. Two names
 * that differ only in case would make that guess, so they are refused instead.
 */
export function commandIndex(names: readonly string[], command: string): number {
  const exact = names.indexOf(command);
  if (exact >= 0) return exact;
  const folded = command.toLowerCase();
  const loose = names.flatMap((name, at) => (name.toLowerCase() === folded ? [at] : []));
  if (loose.length === 1) return loose[0]!;
  throw new ComposeError(loose.length === 0
    ? `the inputs send ${command}, which is not among the device's commands`
    : `the inputs send ${command}, and ${loose.length} of the device's commands differ from it only in case`);
}

/** What `composeDeviceInputs` needs: the device as `composeDevice` returned it, and its rules. */
export interface ComposeInputs {
  /** The device, composed into the container being extended. */
  readonly device: ComposedDevice;
  /** The device's label, the same one `composeDevice` was given. */
  readonly label: string;
  /** The catalogue name of each of the device's commands, index for index with its `commands`. */
  readonly commandNames: readonly string[];
  readonly driving: DeviceDriving;
}

/** One composed variable: its index in base slot 13, and the value each name took. */
export interface ComposedVariable {
  readonly variable: number;
  readonly values: ReadonlyMap<string, number>;
}

export interface ComposedInputs {
  bytes: Uint8Array;
  /** The input variable, absent for a device with one input or none. */
  input?: ComposedVariable;
  /** One per catalogue state, by its name. */
  states: ReadonlyMap<string, ComposedVariable>;
  /**
   * The plan the bytes were built from, for a caller that wants to know what was composed. Note that
   * `ComposedDevice.delay` and `.powerOnDelay` name variables this insertion renumbered, being above
   * `narrow`; the power variable and the variables here are below it and do not move.
   */
  plan: InputPlan;
}

/** The arch 14 send prelude of a device's commands, read off one of its own send lists. */
interface Prelude {
  /** `0x1F` operand of the load list: load the byte register with 1. */
  load: Instruction;
  /** `0x71` operand of the condition list: only while the start sequence variable equals it. */
  condition: Instruction;
  /** The device's delay list, which the condition calls. */
  delayList: number;
}

function preludeOf(c: Container, device: ComposedDevice): Prelude {
  const lists = c.actionLists();
  const send = lists?.[device.lists[0] ?? -1];
  const load = send?.[0]?.opcode === ACTION_LIST_INDEX_OPCODE ? lists?.[send[0].operand] : undefined;
  const condition = load?.[1]?.opcode === ACTION_LIST_INDEX_OPCODE ? lists?.[load[1].operand] : undefined;
  if (send?.length !== 3 || send[1]?.opcode !== SEND_INFRARED || load?.length !== 2 || condition?.length !== 2
      || condition[1]?.opcode !== ACTION_LIST_INDEX_OPCODE) {
    throw new ComposeError('the device\'s first command does not open with the arch 14 send prelude');
  }
  return { load: load[0]!, condition: condition[0]!, delayList: condition[1].operand };
}

/** A transition record, as section 86 reads it: a seven byte header, then eight bytes per transition. */
function encodeRecord(values: number, encoded: readonly { from: number; to: number; instruction: Instruction }[]): Uint8Array {
  const out = new Writer(STATE_RECORD_HEADER + STATE_VALUE_LENGTH * encoded.length)
    .u16(0).u16(values - 1).u16(encoded.length).u8(0);
  for (const one of encoded) {
    out.u8(0).u16(one.from & 0xffff).u16(one.to & 0xffff).u16(one.instruction.operand).u8(one.instruction.opcode);
  }
  return out.bytes;
}

/**
 * Compose a device's inputs into a configuration that already holds the device: one variable per
 * catalogue state and one for its inputs, every transition the plan states, and the action lists they
 * run. Arch 14 only.
 *
 * **The layout follows Logitech's where the bytes say so.** A transition whose whole body is one
 * state write carries that write itself, opcode `0x80 | variable`; one whose body is one send runs
 * the send list directly; one with no steps is the null instruction; anything longer runs a list of
 * its own, each send in it a call to a send list and each wait a bare `0x7C`. A send list is the arch
 * 14 shape `composeDevice` builds, `[0x7F load, 0x7D, 0x7C]` with a private load and condition list
 * of its own calling the device's delay list, one per command and wait amount, shared by every
 * transition that sends it, as Logitech's `InputTv` list is shared by the LG's `Screen` and
 * `TVInput`.
 *
 * **The order of the three insertions is forced.** Every variable goes in at `narrow` and that
 * renumbers whatever sits at or above it, action lists included, so the variables go in first, their
 * records naming list indices that do not exist yet; the lists go in after, naming variables whose
 * indices no longer move. The prelude is read after the variables for the same reason, since its
 * condition names the start sequence variable.
 */
export function composeDeviceInputs(c: Container, inputs: ComposeInputs): ComposedInputs {
  if (c.architecture !== INPUT_ARCHITECTURE) {
    throw new ComposeError(`inputs are measured on arch ${INPUT_ARCHITECTURE} only, and this is ${c.architecture}`);
  }
  const plan = inputPlan(inputs.driving);
  const variables = [...plan.states, ...(plan.input === undefined ? [] : [plan.input])];
  if (variables.length === 0) return { bytes: Uint8Array.from(c.blob), states: new Map(), plan };

  const { group } = inputs.device;
  const recordOf = (command: string): number => {
    const at = commandIndex(inputs.commandNames, command);
    if (at >= inputs.device.lists.length) {
      throw new ComposeError(`the inputs send ${command}, which is not among the device's commands`);
    }
    return at;
  };

  const table = stateTable(c);
  const actionSlot = archSlot(INPUT_ARCHITECTURE, ACTION_TABLE_SLOT);
  const actionTable = c.pointerArrayAt(actionSlot);
  if (table === undefined || actionTable === undefined) throw new ComposeError('base slots 10 and 13 do not read');
  if (table.count + variables.length > STATE_WRITE_LIMIT) {
    throw new ComposeError(`${variables.length} more variables would pass the ${STATE_WRITE_LIMIT} a state write can name`);
  }
  // Each variable goes in at the `narrow` of its moment, which the one before it raised by one.
  const indexOf = new Map(variables.map((one, k) => [one.property, table.narrow + k]));

  // ---- the list layout, decided before any byte moves ----
  // Send lists first, three lists each, then one list per transition that needs a body of its own.
  const firstList = actionTable.values.length;
  const sendLists = new Map<string, number>();
  const sendKey = (one: { command: string; amount: number }): string => `${one.command}|${one.amount}`;
  for (const variable of variables) {
    for (const transition of variable.transitions) {
      for (const one of transition.steps) {
        if (one.kind === 'send' && !sendLists.has(sendKey(one))) {
          recordOf(one.command);
          sendLists.set(sendKey(one), firstList + 3 * sendLists.size);
        }
      }
    }
  }
  const bodies: { list: number; steps: readonly PlannedStep[] }[] = [];
  /** The one instruction a transition holds. */
  const instructionOf = (steps: readonly PlannedStep[]): Instruction => {
    if (steps.length === 0) return { opcode: 0, operand: 0 };
    const only = steps.length === 1 ? steps[0]! : undefined;
    if (only?.kind === 'write') return { opcode: STATE_WRITE_BASE + indexOf.get(only.state)!, operand: only.value };
    if (only?.kind === 'send') return { opcode: ACTION_LIST_INDEX_OPCODE, operand: sendLists.get(sendKey(only))! };
    const list = firstList + 3 * sendLists.size + bodies.length;
    bodies.push({ list, steps });
    return { opcode: ACTION_LIST_INDEX_OPCODE, operand: list };
  };
  const records = variables.map((variable) => encodeRecord(variable.values.length, variable.transitions.map(
    (one) => ({ from: one.from, to: one.to, instruction: instructionOf(one.steps) }))));

  // ---- 1. the variables ----
  let current = c;
  for (const [k, variable] of variables.entries()) {
    const appended = appendNarrowStateVariable(
      current, records[k]!, `${inputs.label}_${variable.property}_${variable.values.length}`);
    if (appended.variable !== indexOf.get(variable.property)) {
      throw new ComposeError(`${variable.property} landed at ${appended.variable}, not where its writes name it`);
    }
    current = parse(appended.bytes);
  }

  const composedOf = (variable: PlannedVariable): ComposedVariable => ({
    variable: indexOf.get(variable.property)!,
    values: new Map(variable.values.map((name, value) => [name, value])),
  });

  // ---- 2. the lists ----
  const prelude = preludeOf(current, inputs.device);
  const encoded: Writer[] = [];
  for (const [key, list] of sendLists) {
    const [command, amount] = [key.slice(0, key.lastIndexOf('|')), Number(key.slice(key.lastIndexOf('|') + 1))];
    // The send, then its private load and condition lists, in that order, as `list`, `+1`, `+2`.
    encoded.push(new Writer(10).u8(3)
      .u16(list + 1).u8(ACTION_LIST_INDEX_OPCODE)
      .u16((group << 8) | recordOf(command)).u8(SEND_INFRARED)
      .u16((group << 8) | amount).u8(DEVICE_QUANTITY));
    encoded.push(new Writer(7).u8(2)
      .u16(prelude.load.operand).u8(prelude.load.opcode)
      .u16(list + 2).u8(ACTION_LIST_INDEX_OPCODE));
    encoded.push(new Writer(7).u8(2)
      .u16(prelude.condition.operand).u8(prelude.condition.opcode)
      .u16(prelude.delayList).u8(ACTION_LIST_INDEX_OPCODE));
  }
  for (const body of bodies) {
    if (body.steps.length > QUANTITY_MAX) throw new ComposeError(`a list of ${body.steps.length} steps`);
    const out = new Writer(1 + 3 * body.steps.length).u8(body.steps.length);
    for (const one of body.steps) {
      if (one.kind === 'send') out.u16(sendLists.get(sendKey(one))!).u8(ACTION_LIST_INDEX_OPCODE);
      else if (one.kind === 'wait') out.u16((group << 8) | one.tenths).u8(DEVICE_QUANTITY);
      else out.u16(one.value).u8(STATE_WRITE_BASE + indexOf.get(one.state)!);
    }
    encoded.push(out);
  }
  // A device whose only variable steps over one value, the Quasar's, has no list to add.
  if (encoded.length === 0) {
    return {
      bytes: restamped(Uint8Array.from(current.blob)),
      ...(plan.input === undefined ? {} : { input: composedOf(plan.input) }),
      states: new Map(plan.states.map((one) => [one.property, composedOf(one)])),
      plan,
    };
  }
  const grownTable = current.pointerArrayAt(actionSlot);
  if (grownTable === undefined || grownTable.values.length !== firstList) {
    throw new ComposeError('base slot 10 moved while the variables went in');
  }
  const listsAt = grownTable.start;
  const length = encoded.reduce((sum, one) => sum + one.bytes.length, 0);
  const hole = relocate(current, listsAt, length);
  const addresses: number[] = [];
  let at = listsAt;
  for (const one of encoded) {
    if (one.remaining !== 0) throw new ComposeError(`a list is ${one.remaining} bytes short`);
    hole.bytes.set(one.bytes, at);
    addresses.push(current.flashBase + at);
    at += one.bytes.length;
  }
  current = parse(appendTableEntries(parse(hole.bytes), actionSlot, addresses));

  return {
    bytes: restamped(Uint8Array.from(current.blob)),
    ...(plan.input === undefined ? {} : { input: composedOf(plan.input) }),
    states: new Map(plan.states.map((one) => [one.property, composedOf(one)])),
    plan,
  };
}

/** The target an activity's start writes to put the device on the input called `name`. */
export function inputTarget(inputs: ComposedInputs, name: string): ComposeActivityTarget {
  const value = inputs.input?.values.get(name);
  if (inputs.input === undefined || value === undefined) {
    throw new ComposeError(`the device has no input called ${JSON.stringify(name)}`);
  }
  return { variable: inputs.input.variable, value };
}

/**
 * An activity's start writes in the order Logitech's compiler writes them: 1 into each `on` power
 * variable, then each input, then 0 into every other device's power variable. Measured on all 40
 * activities of the thirteen arch 14 compiles, section 321, every one of which writes an input.
 * **The caller orders `inputs`**: Logitech's follow the order the devices are switched on in, and
 * this keeps whatever order it is given. `activityPowerTargets` is the power half.
 */
export function activityStartTargets(
  c: Container, on: readonly number[], inputs: readonly ComposeActivityTarget[],
): ComposeActivityTarget[] {
  const power = activityPowerTargets(c, on);
  return [...power.slice(0, on.length), ...inputs, ...power.slice(on.length)];
}

// ---- reading it back ----

/** One step of a transition as the configuration holds it. */
export type HeldStep =
  | { readonly kind: 'send'; readonly group: number; readonly record: number; readonly amount: number }
  | { readonly kind: 'wait'; readonly group: number; readonly tenths: number }
  | { readonly kind: 'write'; readonly variable: number; readonly value: number; readonly silent: boolean }
  /** Anything else, kept rather than dropped: Logitech's connected app wait is one. */
  | { readonly kind: 'other'; readonly opcode: number; readonly operand: number };

export interface HeldTransition {
  readonly from: number;
  readonly to: number;
  readonly steps: readonly HeldStep[];
}

/** One of a device's state variables other than `Power`, with its transitions flattened into steps. */
export interface HeldVariable {
  readonly variable: number;
  readonly property: string;
  /** How many values it takes, from its record. */
  readonly values: number;
  readonly first: number;
  readonly transitions: readonly HeldTransition[];
}

/** A send list: `[0x7F prelude, 0x7D, 0x7C]` on arch 14, `[0x7D, 0x7C]` elsewhere, one device. */
function sendOf(list: readonly Instruction[] | undefined): HeldStep | undefined {
  if (list === undefined) return undefined;
  const body = list.length === 3 && list[0]?.opcode === ACTION_LIST_INDEX_OPCODE ? list.slice(1) : list;
  const [send, quantity] = body;
  if (body.length !== 2 || send?.opcode !== SEND_INFRARED || quantity?.opcode !== DEVICE_QUANTITY
      || send.operand >> 8 !== quantity.operand >> 8) return undefined;
  return { kind: 'send', group: send.operand >> 8, record: send.operand & 0xff, amount: quantity.operand & 0xff };
}

/**
 * Every state variable of the device labelled `label` except its power, the reader the calibration
 * compares Logitech's compile and ours with. A transition's body is flattened one level: a send list
 * becomes a send, a bare `0x7C` a wait, the silent flag marks the write after it, a call to a list of
 * the flag and one write is that write marked silent, and anything else is kept as `other`.
 */
export function deviceStateMachines(c: Container, label: string): HeldVariable[] {
  const lists = c.actionLists() ?? [];
  const records = new Map(stateVariables(c).map((one) => [one.index, one.record]));
  const writeOf = (one: Instruction, silent: boolean): HeldStep | undefined =>
    one.opcode >= STATE_WRITE_BASE ? { kind: 'write', variable: one.opcode - STATE_WRITE_BASE, value: one.operand, silent } : undefined;
  /**
   * A call to a list that is exactly the silent flag and one write, which is how Logitech's compiler
   * spells a silent write inside a longer list: `0x7F` to `[0x07 0xFFFF, 0x80|v]`, measured on the
   * TX-29AK40F, the TH-42PA30 and the Thomson of the power hold compiles. Read as the write, marked.
   */
  const silentCall = (index: number): HeldStep | undefined => {
    const list = lists[index];
    if (list?.length !== 2 || list[0]!.opcode !== SILENT_WRITE.opcode || list[0]!.operand !== SILENT_WRITE.operand) return undefined;
    return writeOf(list[1]!, true);
  };
  const flatten = (one: Instruction): HeldStep[] => {
    if (one.opcode === 0 && one.operand === 0) return [];
    const inline = writeOf(one, false);
    if (inline !== undefined) return [inline];
    if (one.opcode !== ACTION_LIST_INDEX_OPCODE) return [{ kind: 'other', opcode: one.opcode, operand: one.operand }];
    const direct = sendOf(lists[one.operand]) ?? silentCall(one.operand);
    if (direct !== undefined) return [direct];
    const out: HeldStep[] = [];
    let silent = false;
    for (const item of lists[one.operand] ?? []) {
      if (item.opcode === SILENT_WRITE.opcode && item.operand === SILENT_WRITE.operand) { silent = true; continue; }
      const write = writeOf(item, silent);
      silent = false;
      if (write !== undefined) out.push(write);
      else if (item.opcode === DEVICE_QUANTITY) out.push({ kind: 'wait', group: item.operand >> 8, tenths: item.operand & 0xff });
      else out.push((item.opcode === ACTION_LIST_INDEX_OPCODE ? sendOf(lists[item.operand]) ?? silentCall(item.operand) : undefined)
        ?? { kind: 'other', opcode: item.opcode, operand: item.operand });
    }
    return out;
  };
  const out: HeldVariable[] = [];
  for (const one of deviceVariables(c)) {
    if (one.device !== label || one.property === 'Power') continue;
    const record = records.get(one.index);
    if (record === undefined) continue;
    out.push({
      variable: one.index, property: one.property, values: record.second + 1, first: record.first,
      transitions: record.values.map((t) => ({ from: t.from, to: t.to, steps: flatten({ opcode: t.opcode, operand: t.operand }) })),
    });
  }
  return out;
}
