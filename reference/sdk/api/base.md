# `@freeharmony-sdk/base`

<!-- introduction -->
The base package: the table of models, the key codes, the checksum every configuration ends with, and the list of
what the SDK must do for an application with each model's status. Every other package stands on it, and it needs
nothing.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

## Bytes

Whether two byte arrays hold the same bytes, the one copy.

### `sameBytes`

```ts
function sameBytes(a: Uint8Array, b: Uint8Array): boolean
```

Whether two byte arrays hold the same bytes: false where the lengths differ, and otherwise whether the bytes at
every index are equal, so two empty arrays are the same.

## Keys

Where a running remote keeps the key being pressed, per model.

### `ARCH_8_PRODUCT`

```ts
const ARCH_8_PRODUCT = 0xc110
```

The product id every arch 8 remote enumerates with: the 880, 885, 880 Pro, 720 and 785 alike.

### `WATCH`

```ts
const WATCH: Readonly<Record<number, Watch>>
```

The variable holding the scan code of the key currently held, per model.

Read off each architecture's own firmware rather than assumed to be shared, because the RAM
layout is not: the 700 keeps it at `0x3A2` and the 600's build of the same code keeps it at
`0x73D`. The One gets two addresses because it has two candidates and no reason yet to prefer
one, which is exactly the kind of question a live read settles faster than a disassembler.

Keyed by product id. That names the One and the 525, but `0xC122` is the 600's, 650's and 700's alike,
so on a 700 this entry watches the 600's address and `--address 0x3a2` is needed; the skin would
tell them apart, as it does for arch 8, and that change is not made here. Arch 8's product id is
not in this table, because every arch 8 model shares it and their addresses differ: [`WATCH_BY_SKIN`](#watch_by_skin).

Uses [`Watch`](#watch-type).

### `Watch` (type)

```ts
interface Watch {
  readonly name: string;
  readonly addresses: readonly number[];
}
```

What to watch on one model: its name for the banner and the data memory addresses.

### `WATCH_BY_SKIN`

```ts
const WATCH_BY_SKIN: Readonly<Record<number, Watch>>
```

Arch 8's defaults by skin.

The held key and the last key pressed, **in that order**, as a pair, for the same reason as the 525's.
The key reader page relies on the order: the first address is the key held, zero when none, and the
second the last key pressed, which nothing clears. On the 880, the 885 and the 880 Pro, skins 15, 17
and 39, the press handler keeps the held key at `0x295` and copies it to `0x3A1`; the three applications
carry that handler byte for byte. The Harmony 720, skin 44, runs its own build of the same handler with
the held key at `0x296`, still copied to `0x3A1`. **The product id cannot choose between them, and the
wrong choice is not merely silent**: on an 885 `0x296` holds what the keypad's debounce is loaded from,
set at start and not moved by the keys. The 785, skin 45, gets no entry.

Uses [`Watch`](#watch-type).

## Requirements

What the FHSDK must do for an application, numbered for good, and each model's status on every requirement with its evidence. The config package's [`capabilitiesOf`](config.md#capabilitiesof) joins these to a model's properties.

### `BENCH_MODELS`

```ts
const BENCH_MODELS: readonly BenchModel[]
```

The thirteen models the SDK proves its abilities on, with a remote of each to run on, in the order the list of
requirements lists them: the models with a screen first, then the two without, then the Harmony Touch and the two of
its generation that work as a set, the Harmony Elite and the Harmony Hub. Each with the skins the library tells
apart as that model; a regional twin whose keypad differs is left out.

Uses [`BenchModel`](#benchmodel-type).

### `BenchModel` (type)

```ts
interface BenchModel {
  readonly key: BenchModelKey;
  /** Logitech's name for the model, as the family registry's `chooseByModel` asks for it with the first skin. */
  readonly name: string;
  /**
   * The skins a remote of this model reports, which is how a connected remote finds its model, the first the one the
   * family registry chooses the model's family by. The skins and their models are `models.ts` and, for the models
   * that table holds no record of, the registry's `MODELS_OUTSIDE_THE_TABLE`.
   */
  readonly skins: readonly number[];
}
```

Uses [`BenchModelKey`](#benchmodelkey).

### `benchModel`

```ts
function benchModel(keyOrSkin: BenchModelKey | number): BenchModel | undefined
```

The model of [`BENCH_MODELS`](#bench_models) a key or a reported skin names, or undefined where it names none.

Uses [`BenchModelKey`](#benchmodelkey), [`BenchModel`](#benchmodel-type).

### `BenchModelKey`

```ts
type BenchModelKey =
  | 'harmony-one' | 'harmony-600' | 'harmony-650' | 'harmony-700' | 'harmony-525' | 'harmony-515' | 'harmony-885'
  | 'harmony-785' | 'harmony-300' | 'harmony-350' | 'harmony-touch' | 'harmony-elite' | 'harmony-hub';
```

The models of [`BENCH_MODELS`](#bench_models) by a stable key an application can store: the name of the model's folder under
`reference/remotes/`, so a key also finds the model's facts.

### `Proof`

```ts
interface Proof {
  /** The requirement's number. */
  readonly requirement: number;
  /** The keys of the models it is proven for, `BenchModelKey`, or `'every'` for one that does not depend on the remote. */
  readonly models: readonly string[] | 'every';
  /** The test file, from the repository's root. */
  readonly test: string;
  /** The test's title, or for a Python test its class and method. */
  readonly title: string;
  /** Where it was shown on a remote of the model: a test that ran on one, or a passage of the test notes by its heading's anchor. */
  readonly bench: readonly string[];
}
```

One call of `proves` in a test.

### `Requirement` (type)

```ts
interface Requirement {
  /** The permanent number, `R` and this. Never renumbered, never reused. */
  readonly number: number;
  /** The subject it is listed under, one of `REQUIREMENT_SUBJECTS`. */
  readonly subject: string;
  /** What an application can do, in one sentence. */
  readonly text: string;
  readonly scope: RequirementScope;
  /**
   * Whether met needs a run on a remote of the model as well as a test: true where the ability shows on a remote, a
   * configuration it runs, a device it drives, a read or a write over the cable; false where a test can show it
   * whole, reading a configuration's bytes, searching the catalogue, writing Pronto Hex.
   */
  readonly needsBench: boolean;
  /** Set when the requirement is dropped. It stays in the list, so its number is never given to another. */
  readonly withdrawn?: true;
}
```

One thing the SDK must do for an application, by its permanent number, with its subject, its text and its scope.

Uses [`RequirementScope`](#requirementscope).

### `requirement`

```ts
function requirement(number: number): Requirement | undefined
```

The requirement with this number, or undefined for a number never given.

Uses [`Requirement`](#requirement-type).

### `REQUIREMENT_STATUS_NAMES`

```ts
const REQUIREMENT_STATUS_NAMES: readonly RequirementStatus[]
```

The four statuses, in the order a table or a count lists them.

Uses [`RequirementStatus`](#requirementstatus).

### `REQUIREMENT_SUBJECTS`

```ts
const REQUIREMENT_SUBJECTS: readonly string[]
```

The subjects, in the order the requirements are numbered and the document lists them.

### `REQUIREMENT_WAIT_NAMES`

```ts
const REQUIREMENT_WAIT_NAMES: readonly RequirementWait[]
```

The four, in the order a table or a count lists them: the widest first, the run on a unit last.

Uses [`RequirementWait`](#requirementwait).

### `REQUIREMENTS`

```ts
const REQUIREMENTS: readonly Requirement[]
```

Every requirement, in number order, withdrawn ones included.

Uses [`Requirement`](#requirement-type).

### `RequirementScope`

```ts
type RequirementScope = 'model' | 'whole';
```

Whether a requirement has a status per model, or one for the FHSDK as a whole. A whole one is about how the
libraries are built and delivered, offline, in a browser, as published packages, or about an ability that works
on a recipe or the catalogue alone, and no remote changes it.

### `RequirementState` (type)

```ts
interface RequirementState {
  readonly status: RequirementStatus;
  /** The test files whose proofs make it met, in the order of the proofs. Empty but for met. */
  readonly tests: readonly string[];
  /** Where it was shown on a remote of the model, the proofs' records of such runs together. Empty but for met. */
  readonly bench: readonly string[];
  /** The proofs a met rests on, each naming its test by file and title. Empty but for met. */
  readonly proofs: readonly Proof[];
  /**
   * The reference pages a status rests on: for impossible the page that says the model cannot, or the entry of
   * `docs/decisions.md` that rules it out, one of the two required; for unknown the page that leaves the question
   * open, where one does.
   */
  readonly reference: readonly string[];
  /**
   * In one sentence: what is missing, why not, or what is not known, as written; for a met, generated from its
   * proofs, saying how many tests prove it and whether it was shown on a unit, since the tests' own titles say what.
   */
  readonly why: string;
  /**
   * For an open status, whose work is missing, every owner its reason names, in the order of
   * `REQUIREMENT_WAIT_NAMES`: never empty, and `bench` only alone, since anything else missing has no run on a unit
   * either. Empty for the other three statuses.
   */
  readonly waitsOn: readonly RequirementWait[];
}
```

One requirement's status on one model, with what it rests on. Every path is relative to the repository's root and
names a file that exists, a passage of the test notes by its heading's anchor. A met is never written by hand: it is
derived from the tests that prove the requirement, and the other three statuses carry their reason.

Uses [`RequirementStatus`](#requirementstatus), [`Proof`](#proof), [`RequirementWait`](#requirementwait).

### `requirementState`

```ts
function requirementState(model: BenchModelKey, number: number): RequirementState
```

The status of a requirement on a model: the model's own, or for a requirement about the FHSDK as a whole, the one
every model shares; met where the committed proofs, [`proofs.ts`](../../../packages/base/src/proofs.ts), prove it. Throws for a number never given, since
asking for one is a mistake in the caller and not a status. Every model has a status for every requirement.

Uses [`BenchModelKey`](#benchmodelkey), [`RequirementState`](#requirementstate-type).

### `RequirementStatus`

```ts
type RequirementStatus = 'met' | 'open' | 'impossible' | 'unknown';
```

Where a requirement stands on one model.

### `RequirementWait`

```ts
type RequirementWait = 'shared' | 'family' | 'model' | 'bench';
```

What an open requirement waits on, the owner of the work that is missing: `shared`, the FHSDK for every model
alike; `family`, the model's family, or the lack of one; `model`, this model's own; `bench`, nothing but a run on
a remote of the model.

## The model table

A skin to a model and what its hardware can do.

### `architectureHasTouch`

```ts
function architectureHasTouch(architecture: number): boolean
```

Whether an architecture has a touch panel in any model this table knows.

The question a reader of base slot 17 wants answered, and it is per architecture rather than per
model because that is how the firmware differs: only arch 12 seeks that slot as a hit map.

### `hasLongPress`

```ts
function hasLongPress(skin: number | undefined): boolean
```

Whether the model a skin names offers a long press as a separate action. False for every skin [`openHarmony`](usb.md#openharmony) can
open, so a key read out of a configuration read that way never carries one.

### `Model`

```ts
interface Model {
  /** The name Logitech marketed it under, in the region the skin belongs to. */
  readonly name: string;
  /**
   * The same product's name in the other region, where there is one, from the comparison table's own
   * "Eur#" column.
   */
  readonly alias?: string;
  /** Which config format and USB rules apply. `reference/architectures/README.md`, from Logitech's own client. */
  readonly architecture: number;
  /** Devices the host software would let a config hold. An upper bound, not a promise. */
  readonly maxDevices: number;
  /** Favourite channel buttons, or undefined where the model has none. */
  readonly favourites?: number;
  readonly panel: Panel;
  /** Whether the screen is a touch panel: the Harmony One's alone among the models in this table. */
  readonly touch: boolean;
  /** Radio channels for an extender, where the model has one. */
  readonly rfChannels?: number;
  /** Whether the firmware runs action lists of more than one instruction. */
  readonly macros: boolean;
  /**
   * A dedicated button that pages through a mode's screens.
   *
   * Absent on the 5xx, which is consistent with what its configs do rather than a gap: the four soft
   * keys carry opcode `0x7E`, "enter the base slot 6 mode the operand indexes", 57 and 18 times
   * across the two 525 configs, so paging is a soft key binding there.
   */
  readonly pageButton: boolean;
  /** The sound and picture shortcut pair. */
  readonly soundPictureButtons: boolean;
  /**
   * The newest firmware version Logitech's comparison table knows about, which is out of date for some models: a
   * lower bound, not the latest release.
   */
  readonly firmwareSeen?: string;
}
```

A model as the table holds it: its name, its platform, and what its hardware has.

Uses [`Panel`](#panel).

### `modelForSkin`

```ts
function modelForSkin(skin: number | undefined): Model | undefined
```

The model a skin names, or undefined when the table does not have it.

Uses [`Model`](#model).

### `MODELS_BY_SKIN`

```ts
const MODELS_BY_SKIN: Readonly<Record<number, Model>>
```

Skin number to model. The key is what a remote reports, so this is the lookup a session makes.

Six skins are confirmed independently, [`reference/remotes/README.md`](../../remotes/README.md): 15, 22, 54, 66, 71 and 72. The
rest are Logitech's client's and service's tables, which those six calibrate.

Uses [`Model`](#model).

### `MODELS_WITHOUT_A_SKIN`

```ts
const MODELS_WITHOUT_A_SKIN: readonly Model[]
```

Models the libraries can describe whose skin number is recorded nowhere, so a connected one cannot be recognised.
It is empty; it is kept because a model Logitech lists without a skin would belong here.

Uses [`Model`](#model).

### `MotionSensor`

```ts
type MotionSensor = 'tilt' | 'motion' | 'none';
```

Whether a model senses movement, and how the table distinguishes two generations of it.

### `OUT_OF_TRANSPORT_REACH`

```ts
const OUT_OF_TRANSPORT_REACH: readonly string[]
```

The models this library deliberately cannot describe, and why, so the gap is a statement.

Arch 15 enumerates as a network class rather than HID. [`openHarmony`](usb.md#openharmony) will not find one, so a
capability record would be reachable only by a caller who already knows the model, which is the
opposite of what this module is for.

### `Panel`

```ts
type Panel = 'colour' | 'monochrome' | 'none';
```

What kind of panel a model has, which is the field a renderer needs and a config cannot state.

### `SKINS_WITH_A_LONG_PRESS`

```ts
const SKINS_WITH_A_LONG_PRESS: readonly number[]
```

The skins whose product record declares a **long press**, from Logitech's own live service.

A long press is a second, different action on one button, chosen by how long it is held. It is not a
repeat: whether a code repeats while a key is down is a property of the code, and a
button with a long press cannot repeat at all, because the firmware has to wait to find out which of
the two was meant. It is the vendor's word: of the models on this list only the Harmony 350 is reachable, as a file,
and how its configuration states a long press is not read. Skin 112 is `HarmonyElite`, sold as the **Harmony 950**;
skin 100 is `Harmony Touch Plus`, sold as the **Harmony Ultimate**.

### `SKINS_WITHOUT_A_MODEL_RECORD`

```ts
const SKINS_WITHOUT_A_MODEL_RECORD: Readonly<Record<number, string>>
```

Skins Logitech's own catalogue names and this library will not describe, with the vendor's name: rebadges sold
under other brands, the Harmony 200 and 300, whose capability fields nothing has read, and models the transport
cannot reach. A name here tells a person that their remote is recognised as a product and not yet as a model.

## The trailer checksum

The configuration container's trailer checksum, the one copy.

### `TRAILER_CHECKSUM_OFFSET`

```ts
const TRAILER_CHECKSUM_OFFSET = 6
```

From the end of the container, ahead of the four byte marker.

### `TRAILER_CHECKSUM_SEED`

```ts
const TRAILER_CHECKSUM_SEED = 0x4321
```

The trailer checksum's seed, written as two literals by the boot validator on all three images.
The checksum is a sixteen bit XOR of the container's little endian words from its first byte up
to the stored value, which sits six bytes from the end. The Harmony 300 and 350 firmware uses the same seed.

### `trailerChecksum`

```ts
function trailerChecksum(blob: Uint8Array): number
```

Recompute a container's trailer checksum from its bytes.

An odd trailing byte is not folded in, because the firmware divides the byte count by two and
counts words.
