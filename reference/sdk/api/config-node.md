# `@freeharmony-sdk/config/node`

<!-- introduction -->
The config package's entry for Node. It carries [the main entry](config.md) whole, supplies the fonts and the rest
of what a build draws with as it loads, and adds what reads the disk: the device archive from a folder, a configuration
file, and the files beside them. A Node application imports the config package from here and nowhere else.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

## Off the disk

The device archive and the catalogue read from a folder by path, and the source a builder is handed for a checkout of the archive.

A recipe given its codes out of a checkout, so a build of it needs no archive.

The archive on disk as a source a device search asks, [`findDevices`](config.md#finddevices).

### `archiveAt`

```ts
function archiveAt(root: string): CatalogueSource
```

The archive checked out at `root` as a builder reads it, through the readers above: what every composer that needs
the catalogue is handed, in place of the path. **The same object for the same path**,
since `archiveProtocolsByName` keeps the definitions by name per source, as it kept them per path before, and a
device composes many.

Uses [`CatalogueSource`](config.md#cataloguesource).

### `archiveManifest`

```ts
function archiveManifest(root: string): ArchiveManifest
```

Check the archive's manifest and hand back its counts.

Throws on an unknown schema version, which is the whole point: a reader that carries on against a
layout it does not know produces durations nobody can tell from correct ones.

Uses [`ArchiveManifest`](config.md#archivemanifest).

### `archiveProtocols`

```ts
function archiveProtocols(root: string): ArchiveProtocol[]
```

Every protocol definition in the archive, in the order the filesystem hands them over.

`protocols/index.json` is skipped: it is the archive's own index of the other files, not a
definition, and counting it is what made an early reading of this checkout report 685 families where
the manifest says 684.

Uses [`ArchiveProtocol`](config.md#archiveprotocol).

### `archiveSourceAt`

```ts
function archiveSourceAt(root: string): DeviceSource
```

The archive checked out at `root` as a source. `find` reads indexes only, and a device's own file only for
the results it is about to give, to state the kind of device and to hold a kind that was asked for; `fetch` reads
the device's record, its codeset and the protocol definitions its codes name, `carriedDeviceAt`.

Uses [`DeviceSource`](config.md#devicesource).

### `carryCodes`

```ts
function carryCodes(recipe: Json, root: string): Json
```

`recipe` as parsed JSON, with every device's definition and the protocols carried; the rest as it was.

Uses [`Json`](config-types.md#json).

### `catalogueByRhythm`

```ts
function catalogueByRhythm(root: string): Map<string, CatalogueFamily[]>
```

Logitech's catalogue indexed by rhythm, from the checkout at `root`, `catalogueByRhythmOf`.

Uses [`CatalogueFamily`](config-types.md#cataloguefamily).

### `catalogueCommands`

```ts
function catalogueCommands(
  root: string, codeset: string, options: { readonly pronto?: boolean } = {},
): CatalogueCommand[]
```

The commands of one codeset, by the path a device states.

`pronto` is left out of the result unless asked for, so a caller holding thousands of commands is not
holding thousands of rendered waveforms: they are about 95% of the archive's 1.1 GB of codesets, and an
importer wants none of them, since a frame is built from the rhythm table rather than replayed from a
rendering. **One file is still parsed whole**, which is cheap; what avoids parsing them at all is
[`codeIndex`](#codeindex), and that is why it matches text rather than reading through here.

Uses [`CatalogueCommand`](config.md#cataloguecommand).

### `catalogueDevice`

```ts
function catalogueDevice(root: string, slug: string, file: string): CatalogueDevice
```

One device by its manufacturer slug and its file name, as [`catalogueModels`](#cataloguemodels) gives them.

Uses [`CatalogueDevice`](config.md#cataloguedevice).

### `catalogueDriving`

```ts
function catalogueDriving(root: string, slug: string, file: string): DeviceDriving
```

One device's driving rules, by its manufacturer slug and file name as [`catalogueModels`](#cataloguemodels) gives them.

Uses [`DeviceDriving`](config.md#devicedriving-type).

### `catalogueManufacturers`

```ts
function catalogueManufacturers(root: string): CatalogueManufacturer[]
```

Every manufacturer in the catalogue, in the archive's own order, which is by display name.

Uses [`CatalogueManufacturer`](config.md#cataloguemanufacturer).

### `catalogueModels`

```ts
function catalogueModels(root: string, slug: string): CatalogueModel[]
```

Every model one manufacturer has.

Read from the manufacturer's own `index.json` rather than by listing the directory, which is what
makes this cheap: the largest manufacturer has thousands of models and the index is one file. It is
also the only place the model name is stated, since a file name has its punctuation replaced and two
models may share one, in which case the archive appends the device id.

Uses [`CatalogueModel`](config.md#cataloguemodel).

### `catalogueRules`

```ts
function catalogueRules(
  root: string, slug: string, file: string, options: { readonly raw?: string } = {},
): CatalogueRules
```

**The one door**: a catalogue device's driving rules as the archive states them, and, given the raw
capture's directory, the fields the archive drops attached at the same coordinates, `rawDrivingFields`.

Refuses, rather than answering from the archive alone, when a raw directory is given and its derived
files are absent, stale against `SHA256SUMS`, or aligned against a different archive build: a caller
that asked for the raw fields and silently got none would compose every state step as a sending one.

Uses [`CatalogueRules`](config-types.md#cataloguerules).

### `codeIndex`

```ts
function codeIndex(root: string): Map<string, string[]>
```

Every number any keycode in the archive states, and which codesets state it.

**This is a full pass over 54610 files and about eight seconds**, which is why it is one call a caller
makes deliberately and holds on to. It exists for one job: a configuration numbers its codes and names
none of them, so the way to find out what a device in a config **is** is to look up the numbers it
sends. That works because a number is specific: 105006 distinct numbers over 2087266 commands.

The keycodes are matched with a regular expression rather than parsed, deliberately. Parsing means
materialising the rendered waveforms, which are 95% of the bytes and which nothing here wants, and the
shape being matched is a single JSON string field.

### `rawCaptureDevice`

```ts
function rawCaptureDevice(directory: string, globalDeviceId: number): RawDeviceRecord | undefined
```

One device of the raw capture, parsed. **Never print it whole**: pick the fields you need. One device
can be 35000 tokens.

Uses [`RawDeviceRecord`](config-types.md#rawdevicerecord).

### `rawCaptureLine`

```ts
function rawCaptureLine(directory: string, globalDeviceId: number): string | undefined
```

The raw line of one device, by its global device id, or undefined when the capture has no such id.

**Read the token rule in [`catalogueraw.ts`](../../../packages/config/src/catalogue/catalogueraw.ts)'s docstring before printing what this returns.**

### `rawDerivedState`

```ts
function rawDerivedState(directory: string): RawDerivedState
```

Whether the derived files exist and were derived from the capture `SHA256SUMS` states.

Uses [`RawDerivedState`](config-types.md#rawderivedstate).

### `segmentLengthsModule`

```ts
function segmentLengthsModule(root: string): string
```

The text of [`src/infrared/segmentlengths.ts`](../../../packages/config/src/infrared/segmentlengths.ts) as the archive at `root` states it, which [`bin/segmentlengths.ts`](../../../packages/config/bin/segmentlengths.ts)
writes and a test compares the checked in file against, `segmentLengthsModuleOf`.

### `statedSha256`

```ts
function statedSha256(directory: string, file: string): string | undefined
```

The SHA-256 a folder's `SHA256SUMS` file states for one of its files, or undefined.

## Resources

The resources as Node supplies them, supplied as this module loads.

### `NODE_RESOURCES`

```ts
const NODE_RESOURCES: CodecResources
```

The five resources from this checkout and Node.

Uses [`CodecResources`](config.md#codecresources).

## The main entry whole

Its names are its own explicit list, [`index.ts`](../../../packages/config/src/index.ts), so this adds none by default.

Everything on [`@freeharmony-sdk/config`](config.md).
