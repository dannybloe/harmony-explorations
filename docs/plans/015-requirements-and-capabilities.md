# Plan 015: the FHSDK's requirements, its capability API, and code that names no todo

**Status: done.** Written 10 November 2026, in the conversation that set out to restructure `todo.md` around the
FHSDK, the libraries, reference and tools an application such as FreeHarmony builds on. Its items were `todo.md`
7.3.13, now in `todo/done/todo-sequence.md`. The rules it rests on are [decision 33](../decisions.md#d33).

## Why

`todo.md` had grown into a mix of the libraries' work and FreeHarmony's, and each remote's track was written by
looking at the tracks before it. Two things were missing: a statement of what the FHSDK must be able to do for an
application, independent of the order the work is done in, and a way for an application to ask, per model, which of
it is there. And code and tests named a todo 1575 times in 610 files, so no track file could be renamed or removed
without breaking comments.

## What was decided

1. **A list of requirements**, each an ability an application gets from the FHSDK, numbered `R1`, `R2`, ... and never
   renumbered or reused; a dropped one stays, withdrawn.
2. **A status per bench model**: met, open, impossible on this model with its evidence, or unknown, which counts as
   open. Met means in the FHSDK, tested, and, for anything that touches a remote, shown working on a bench unit of
   that model.
3. **The list and the statuses are data in the FHSDK**; `docs/remote-requirements.md` is generated from them, with a
   test that the two agree.
4. **A capability API**: one call per model returns its properties (limits, screen, favourites, keys, from the model
   table and its family) and the full status of every requirement. An application offers a feature where it is met;
   the other statuses are for a developer.
5. **Comments are self-contained** and never name a todo; a pointer goes only to `reference/`, a decision or a
   requirement number.
6. **The candidates came from four sources**: Logitech's manuals for the nine bench models, MyHarmony's screens, the
   todos, and what the libraries already do; the person picked the doubtful ones and left the rest to the merge. The
   working files are in the lab's `work/requirements/`, `draft.md` the merged list of 75.

## The order

1. The requirements and the capability data, the generated document and the capability API.
2. The sweep: every todo mention in code and tests removed, its reason written out where it carried one, or pointed
   at the reference, a decision or a requirement.
3. The guard: a test that no code or test names a todo, with what remains as a debt list that only goes down.
4. The restructure of `todo.md`: only the FHSDK's work; FreeHarmony's items to `todo/todo-fh.md` for reference; a
   chapter of the bench models, one line each, its box ticked when the model meets every requirement it can, linking
   to that model's checklist; the open abilities as chapters; the two Logitech gathering todos merged; finished
   tracks archived; `todo-later.md` dissolved into the abilities and a file of loose ends.

The requirements come first because the sweep points at them, and the sweep before the restructure because the
restructure renumbers and moves the files the code names.

## Refined the same day, once the first list was in

The generated `docs/remote-requirements.md` held every status with its evidence beside it and turned out unreadable
as an overview, and its "met" was typed by hand beside the test that showed it, a link nothing kept true when the
test changed. So:

1. **A test names the requirement it proves**, and a model's met is derived from the tests that prove the requirement
   for it, with a bench run where the requirement shows on a remote. Only open, unknown and impossible stay written
   by hand, each with its reason. What an application reads at run time is generated from the proofs and checked.
2. **A todo per bench remote**, `todo/todo-<model key>.md`: a generated checklist of the requirements possible on that
   remote, ticked where proven, an unknown one marked to be found out first and an impossible one left out, since it
   reads as a todo; below it, a part written by hand for the remote's own work.
3. **The requirements document gets short**: what each requirement means and one table of where each remote stands;
   the evidence goes to a file of its own.
4. Then the restructure of `todo.md`, as above.
