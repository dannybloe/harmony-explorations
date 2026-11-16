---
name: code-style
description: How TypeScript is laid out in this repository, the part no tool enforces, blank lines as paragraphs, where a long line breaks (arguments and parameters one per line from three, chains, object literals, unions, the 80 column target), destructuring and the rule never to destructure in a parameter list, and the options object. Use before writing or editing any TypeScript in packages/, before writing an example for the SDK's guide, and when reviewing a diff for layout. It applies to new and edited statements and to every file under a package's examples/ folder; existing code is never reflowed to match it.
---

# Code style

How new TypeScript here is laid out. None of it is enforced by a tool: there is no formatter and no lint rule
behind these, on purpose, because a formatter cannot express "one paragraph per idea". So this file is the
specification, and a review is the check.

**The golden rule: new and edited statements only. Never reflow code you are not changing.** A diff that
rewraps untouched lines buries the real change, breaks the history of every line it touches and is rejected.
Most of this repository was written before this file and is wider and denser than it asks for; that code stays
as it is.

**The one place it holds for every line is a package's `examples/` folder.** An example is what a stranger
reads first and copies, so each example file is written in this style from top to bottom.

What this file does not cover: where code goes and what it may import (the `architecture` skill), what a
comment says (`CLAUDE.md`: generously, and why), and names.

## The basics

* Two spaces of indentation, semicolons, single quotes: as the code around it.
* A trailing comma after the last item of anything that spans lines, as the code around it has.
* Strict TypeScript. No `any` and no cast to make an error go away; a cast that stays says why in a comment.

## Blank lines

Blank lines split code into paragraphs, one idea each.

1. A class body has a blank line after its `{` and before its `}`.
2. A function or method body has a blank line after its `{` when the signature spans lines **or** the body
   holds more than one statement.
3. It has a blank line before its `}` when the body holds more than one statement.
4. Consecutive **single line** `const`, `let` and assignments form one block: no blank line inside it, one
   above and one below. Whether they are related does not matter; being adjacent does.
5. A statement that spans lines, a declaration, an assignment or a call, is a paragraph of its own, so it ends
   such a block.
6. A run of single line calls that together do one thing stays together.
7. An `if`, `else`, `for`, `try` or callback block has a blank line after its `{` **only** when it holds
   several paragraphs, and never one before its `}`.
8. There is always a blank line after a block's closing `}`, a guard clause included.
9. A comment belongs to the code below it: a blank line above, none between. Directly under an opening `{` it
   needs no blank line above. So a comment ends a block of declarations, and the blank line goes above the
   comment.
10. Exactly one blank line between class members and between top level declarations, never two.

```ts
export class SetupEditor {

  private document: Recipe;

  constructor(document: Recipe) {
    this.document = document;
  }

  rename(
    device: DeviceId,
    name: string,
  ): Effect[] {

    const change = recipe.setDevice(
      this.document,
      device,
      { name },
    );

    // The document is replaced as a whole: a change never edits the one it was given.
    this.document = change.document;

    return [...change.effects];

  }

}
```

## Destructuring

Object destructuring of **more than two** properties puts each on its own line. Two or fewer stay on one line.
A destructuring that spans lines is a statement that spans lines, so blank line rule 5 holds for it. Array
destructuring is unaffected.

```ts
const { model, devices } = document;

const {
  model,
  devices,
  activities,
  settings,
} = document;
```

### Never destructure in a parameter list

In every kind of function, a method, a function, an arrow and an inline callback alike: take the object as a
named parameter and take fields out in the body.

```ts
// no
const names = devices.map(({ name }) => name);

function describe({ model, devices }: Recipe): string {

// yes
const names = devices.map((device) => device.name);

function describe(document: Recipe): string {

  const { model, devices } = document;
```

The parameter keeps a name, so a call site says what is passed, and the body reads in terms of the thing it
was given, which stays true when its shape grows.

## Options objects

A function that would take a long list of positional parameters takes one options object instead.

* **One flat interface for a family of related functions**, every field optional, no hierarchy of interfaces.
  Each function takes `options: TheInterface = {}` and reads the keys it needs.
* **Take the keys out in the body**, and only those the function uses.
* **Defaults live inside the function, never at the call site.** A caller passes what it has, `undefined`
  included, and the function decides.
* **Pass `options` on as it is** to a function underneath; where one or two values must differ, spread and
  override.

```ts
export interface ReadOptions {
  chunkBytes?: number;
  onProgress?: (progress: ReadProgress) => void;
  retries?: number;
}

export async function readWhole(reader: ConfigReader, options: ReadOptions = {}) {

  const { chunkBytes = DEFAULT_CHUNK_BYTES, retries = 2 } = options;

  // ...
}

export async function readQuietly(reader: ConfigReader, options: ReadOptions = {}) {

  const quiet = {
    ...options,
    onProgress: undefined,
  };

  return readWhole(reader, quiet);

}
```

## Line breaking

Two aims: **lines stay short**, about **80 columns**, and **arguments, keys and the steps of a chain sit under
each other**, so an editor's parameter hints line up in a column instead of pushing a line sideways. The 80 is
a target and not a limit. These are guidelines and not a formatter's rules: where one gives something clearly
harder to read, write the readable form.

**Call arguments.** Three or more arguments go one per line, however short. One or two stay on the call's line
unless it passes 80 columns. The closing `)` sits on a line of its own at the statement's indent.

```ts
const change = recipe.setKey(
  document,
  place,
  action,
);

// two arguments that fit stay
const problems = recipe.check(document, sources);
```

**An argument that spans lines may hug the `(`.** A single object literal, array literal or arrow function
stays on the call's line and closes with `});`. So does a last argument that spans lines after short ones,
while that first line stays under 80.

```ts
const outcome = await syncDocument({
  document,
  remote,
  sources,
});

remote.onEvent((event) => {
  journal.push(event.phase);
});
```

**What stands before the `(`.** When the arguments break one per line and the call is reached through several
segments, each segment gets a line too. `this` and `super` are not segments: they stay with what follows.

**Chains.** Count calls, not properties. A chain breaks at **three or more calls**, or when its line passes
80. **Chained array methods break from two** (`filter`, `map`, `reduce`, `find`, `some`, `sort`, `flatMap`),
since that is where reading the steps in order matters; a single `.map(...)` is not a chain. Once a chain
breaks every segment has its own line, a `??` at the end included.

```ts
const bound = recipe
  .keys(document, place)
  .filter((key) => key.bound)
  .map((key) => key.name);
```

**Parameter lists in a declaration** follow the same numbers: three or more one per line, one or two on the 80
target, in functions, methods, constructors, arrows and the signatures of interfaces and types. A signature
that spans lines gets the blank line of rule 2 after its `{`.

**Types.** A union of three or more members goes vertical with a leading `|`, however short its members.

```ts
type Ending =
  | 'written'
  | 'refused'
  | 'failed';
```

**Object literals** go vertical as soon as they hold an explicit `key: value`, however few: the keys are what
gains from lining up. An object of shorthand names only follows the 80 target.

```ts
const place = {
  kind: 'key',
  owner: activity,
  key: 'VolumeUp',
};

const request = { document, remote, sources };
```

**Array literals** stay on one line until it passes 80 columns.

## Changing a statement that exists

The golden rule is about code you are not editing. A statement you change anyway, an argument added, a call
renamed, gets the shape described here, since its line is in the diff regardless. The lines around it are left
alone.
