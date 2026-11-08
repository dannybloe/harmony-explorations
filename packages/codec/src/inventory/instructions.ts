/**
 * The action list instructions and key code fields the inventory's readers recognise, which the composers write with
 * the same constants: selecting a binding set, a key code's scan code and event type, mapping a value, entering a
 * mode, the beeper, the infrared send and its quantity, a condition, the byte register and the inter device delay.
 * Part of the inventory, `inventory.ts`.
 */


/**
 * Opcode `0x1F` with operand `0xFFxx` selects the current binding table entry, the low byte being
 * the index into base slot 9. `reference/config-format/actions.md`, from the register machine's own band.
 *
 * Exported since section 273, because the activity composer emits one and there must not be a
 * second spelling of it in `compose.ts`.
 */
export const SELECT_BINDING_SET = 0x1f;

export const SELECT_BINDING_SET_MASK = 0xff00;

/** A key code's scan code, the rest of it being the event type. Section 17. */
export const SCAN_CODE_MASK = 0x3f;

/**
 * How far to shift a key code to leave the event type: 0 none, 1 release, 2 press, 3 repeat.
 *
 * Exported since 6 September 2026, because `compose.ts` needs the **writing** side of this encoding
 * and briefly declared its own `KEY_EVENT_SHIFT = 6` with a comment acknowledging the duplication.
 * Acknowledging it is not resolving it: two right copies is the state that precedes two disagreeing
 * ones, which is `isa.py`'s rule and does not care that one of them is a six.
 */
export const KEY_EVENT_SHIFT = 6;

/** The event type of a press. */
export const KEY_EVENT_PRESS = 2;

/** Opcode `0x72`: map a state variable's value through the base slot 14 record its high byte names. */
export const MAP_VALUE_OPCODE = 0x72;

/** Opcode `0x7E`: enter the base slot 6 mode the operand indexes. Section 36. */
export const ENTER_MODE = 0x7e;

/** Opcode `0x73`: run the base slot 11 screen program its operand indexes, by its low byte, section 369. */
export const RUN_SCREEN_PROGRAM = 0x73;

/** Opcode `0x75`: the beeper, which every menu row in the corpus opens with, section 73. */
export const BEEP_OPCODE = 0x75;

/** The beeper and the operand every Harmony One screen item and menu row opens with, section 73. */
export const SCREEN_ITEM_BEEP = { opcode: BEEP_OPCODE, operand: 0x0fca } as const;

/**
 * Opcode `0x7D`: send an infrared code, `{ u8 group; u8 index }`. Section 33.
 *
 * The group is the device, section 86. This said the instruction is "the only place in the format
 * where an action says **which device** it is talking to", and that is corrected rather than
 * quietly dropped, section 278: `DEVICE_QUANTITY` below names the same device in its own high byte
 * on every send list of the corpus, and a composed send without it is not transmitted when an
 * activity's state transition runs it.
 */
export const SEND_INFRARED = 0x7d;

/**
 * Opcode `0x7C`: the per device quantity every send is paired with, `{ u8 group; u8 amount }`.
 *
 * **This is not decoration and it is not only the power on delay.** Every action list holding a
 * `0x7D` holds one of these, with this operand's high byte equal to the send's, on every
 * architecture the lab holds a configuration of: `{0x7D, 0x7C}` on arch 8, 9, 10 and 12,
 * `{0x7F, 0x7D, 0x7C}` on arch 14, and that pair or `{0x07, 0x7D, 0x7C}` on arch 16. Sections 33 and
 * 278. Section 70 reads the quantity and section 236 the queue it lands in.
 *
 * **A bare send is not transmitted when a state transition runs it**, measured on the spare Harmony
 * One, section 278: a composed device whose six lists were the send alone answered a button press on
 * all six and sent nothing when the activity's power transition ran the same list, while pointing
 * that transition at an existing paired list switched the television on. Pairing the six fixed it.
 * Why the two routes differ is **unread**: both instructions push a two byte entry into one queue,
 * this one with bit 6 set on its device byte, and section 236's reading of the queue's picker would
 * let a lone send out, so that reading does not explain it either.
 */
export const DEVICE_QUANTITY = 0x7c;

/**
 * What a composed send pairs with its `0x7C`: an amount of 1.
 *
 * Deliberately a constant rather than a computed delay. The quantity is a per device wait, and this
 * said the project had no basis for choosing one for a device it has just added, so it took the value
 * the configuration's own LG television entry carries, `0x7C` operand `0x0301`, which is the list run 3
 * of section 278 switched the television on with. **Section 320 found the basis, and 1 is right for an
 * ordinary press**: on the test devices of the six power hold compiles, Logitech's compiler gives every
 * command a list at 1 and the power steps the catalogue's inter key delay in tenths; the second lists
 * some devices get per digit at the inter key delay, and for some input commands at the input delay,
 * follow a rule not read. So `composeDevice` gives its power steps the inter key
 * delay it is handed and keeps this for everything else. Section 236 is why a small value is safe: a
 * quantity with no later command for its own device behind it is never felt.
 */
export const DEVICE_QUANTITY_DEFAULT = 1;
// **One constant, not two.** `inventory.ts` declared `SEND_INFRARED` and, nine hundred lines further
// on, `IR_SEND_OPCODE`, both `0x7d`, both correct, until 6 September 2026. Two right copies is the
// state that precedes two diverging ones and no test can see it, which is exactly what `CLAUDE.md`'s
// oldest rule is about. Exported because a test of the activity anatomy needs to name the send.

/**
 * Opcode `0x71`: a condition on a state variable, section 34. Operand bits 8 to 11 choose the
 * comparison, 0 being equality with the byte register, and bit 15 gives it two arms.
 */
export const CONDITION_OPCODE = 0x71;

/** Bit 15 of a `0x71` condition's operand: the condition has two arms, section 34. */
export const CONDITION_TWO_ARMS = 0x8000;

/**
 * `0x1F` sub opcode `0xFB`: load the byte register with the operand's low byte, which is what the
 * `0x71` after it compares a variable against. The sub opcode is the operand's high byte.
 */
export const BYTE_REGISTER_LOAD = 0xfb;

/**
 * Action opcode `0x67`, the third producer into the infrared queue, whose entries carry tag 5,
 * sections 70 and 71. What a base slot 14 case of a device's inter device delay table queues, with the
 * device's group in the operand's high byte and the delay in tenths in its low byte, section 287.
 */
export const QUEUE_INTER_DEVICE_DELAY = 0x67;
