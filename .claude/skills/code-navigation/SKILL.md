---
name: code-navigation
description: Find where a symbol is defined, who calls it and what breaks if it changes, by asking the language index rather than grepping. Use before any search for a function, type, constant or method in the TypeScript packages, when asked what uses something, when judging whether a rename or a signature change is safe, and to know which searches here the index cannot answer at all.
---

# Finding code by asking the index

Grep finds text. A question about code is almost never a question about text: "who calls this" is not
"which lines contain this word", and the difference shows up as both false positives, a comment or a
document mentioning the name, and false negatives, a call through an alias or a re-export.

So for the TypeScript packages, **ask the index first**. The project is open in the IDE and its tools
are available. They are also strictly better output for the same question: a reference comes back with
its kind, `IMPORT` against `REFERENCE`, and with the enclosing symbol, so a list of twenty is readable
where twenty grep lines are not.

This is not a rule against grep. It is a rule about which question is being asked, and half of this
skill is the list of questions here that the index genuinely cannot answer.

## The tools, and the question each one answers

Every call needs `project_path`, see the first pitfall below.

| question | tool |
|---|---|
| where is this defined | `ide_find_definition` |
| who uses this, and how | `ide_find_references` |
| what breaks if I change this signature | `ide_call_hierarchy` with `direction: "callers"` |
| what does this routine end up calling | `ide_call_hierarchy` with `direction: "callees"` |
| what implements this interface | `ide_find_implementations` |
| where is the type called something like this | `ide_find_class` |
| what does the IDE think is wrong with this file | `ide_diagnostics` |

`ide_find_references` and `ide_call_hierarchy` are the two that earn their place. The rest are
conveniences over what Glob and Grep already do well.

**A position is what these want, so getting the position is grep's job.** One `grep -n "export function
renderVariants"` and then a position based call is the normal shape, and there is nothing wrong with
it. `ide_find_class` and `ide_find_file` are the alternative when the name is only half remembered.

## Pitfalls, both measured on 12 August 2026

**`project_path` is not optional here.** Two projects are open in the IDE, this one and an unrelated
one, so every call without it fails with `multiple_projects_open`. Pass
`/Users/dannybloemendaal/projects/diversen/harmony/harmony-explorations`.

**The IDE does not index Python, and it does not say so.** A position on
`def chunk_sizes` in `src/harmony/readloop.py` did not fail. It resolved to the **directory**
`src/harmony` and returned 32 references, every one of them a mention of a path in `docs/findings.md`
and `CLAUDE.md`. That is the dangerous kind of wrong: a plausible answer to a question nobody asked.

So **read `resolvedSymbol` in every reply before believing the list.** It echoes what was actually
searched, including its `kind`. If that is not the function, type or constant intended, the answer is
noise. This is the same failure this project has recorded three times in other forms, a wrong load
address producing a readable listing and a wrong register map producing a readable disassembly: the
tool that answers confidently is the one to check.

**A star re-export produces no reference.** `packages/codec/src/index.ts` is
`export * from './inventory.ts'`, so the barrel does not appear in the references of anything it
re-exports, and neither does an importer that goes through it appear as an importer of the file.
References are still complete, because the importers themselves are listed; it is the barrel that is
invisible. Do not read its absence as "nothing re-exports this".

## What the index cannot answer here, so do not try

* **Python.** Until `pyright-lsp` is actually installed, `src/harmony`, `tools` and `tests` are grep
  and `make pyright`. `make pyright` is the check; it is not a navigator.
* **The firmware.** A reference in PIC18 code is not a reference in a language any server knows.
  `tools/pic18_trace.py` is this project's reference finder for firmware, and the `trace-section`
  skill is the method around it, including the dead end that matters: it cannot see indirect access
  through `FSR`, so an empty trace means "look for the `LFSR`", not "nothing uses this".
* **The documents.** `docs/findings.md` is 15000 lines of prose and grep is the right tool for it. The
  same goes for `reference/superseded.md` and the `fact:` markers, which `make facts` checks anyway.
* **Bytes.** A config or an image is not source. That is `tools/gspm_parse.py`, `make coverage` and the
  codec's own readers.
* **"Where is this number from"**, which is the question this project asks most. No index answers it.
  `docs/findings.md` does, by section.

## Before changing a signature

The reason to prefer callers over a text search is that a change to a shared reader here reaches
further than it looks: `renderVariants` has two callers in `packages/bench`, and through them a route
in the server and four tests, including the browser test. `ide_call_hierarchy` with
`direction: "callers"` and `depth: 3` produced that whole chain in one call, and grep produces the
first hop only.

Then the batch checks still have to run, because the index is a navigator and not a build:

```sh
make ts        # typecheck and test the TypeScript packages
make pyright   # the Python half, at the level pyrightconfig.json argues for
```
