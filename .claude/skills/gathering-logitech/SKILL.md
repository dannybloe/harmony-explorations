---
name: gathering-logitech
description: "Everything needed before working on the gathering track, todo-secure-logitech.md: why it races a possible shutdown of Logitech's service, what is in scope, when an item counts as done, and where every result goes. Use before any item of todo-secure-logitech.md, before compiling anything through Logitech's service for that track, and in every agent brief for it."
---

# Gathering what only Logitech's service knows

**This skill holds the rules of the track and says where the facts are.** It repeats none of them,
because two copies of a fact are two copies until one of them moves.

## 1. Read these first

1. `todo-secure-logitech.md`: the plan, which item the task is, and what is already recorded on it.
2. The `myharmony-service` skill: the accounts, the rails for writes, and the traps already met. **Load
   it before anything that talks to the service.** The harvest itself is `packages/corpus/bin/harvest.ts`,
   item 1.1; its header holds the rails and the usage.
3. Per model, its reference folder in `reference/remotes/`. Only `harmony-650/` exists yet; item 3.2
   starts the others with a `features.md`, and from then on the model's own file is read, not guessed.

## 2. Why this track, and what it is not

Logitech's service still compiles configurations and can be withdrawn without notice. The device
database is archived and safe; how their compiler turns it into bytes on a remote is only learned by
comparing their compiles with the database, and that needs the service. So this track **gathers**: it
compiles and files. **Working out the rules from the files is the next todo's**,
`todo-process-logitech.md`, and does not belong here: a gathering item that starts explaining a file is
spending time the race does not have.

**Scope**: the bench models that get a compile, the Harmony One, 600, 650, 700, 300 and 350. The 525 is
discontinued and the Touch gets no configuration file, `todo-secure-logitech.md` 3.1. Infrared families
are compiled on the Harmony One, which holds 15 devices per configuration, after the check in item 1.2.

## 3. When an item is done

**Only when its file is checked to hold what it was compiled for**: the family's records are in it, the
setting's two compiles differ, every device and activity of a setup is present. Each item in the todo
names its check. Finding a gap during processing may be too late to compile again, so the check is part
of the item, not of the next todo.

## 4. Where things go

* **A compiled file stays in the lab**, with a manifest naming every device that went into it. It is
  Logitech's output, so it never enters this repository.
* **Names and numbers about it come here**: the index of the harvest and how the service is used,
  `todo-secure-logitech.md` chapter 5. Nothing gathered may be findable only in the lab.
* **No personal names in any document.** Write "needs a go-ahead", "decided on <date>", "the bench's
  KPN box".

## 5. How the work is done

* **Every compile writes to the test account** and needs a go-ahead, once for the track (item 1.4) and
  again for any kind of write the `myharmony-service` skill does not already have a door for.
* **One compile at a time, with a pause between**, watching for refusals; stop and report the first one.
* **An account entry is a real remote's entry.** The harvest got the spare Harmony One blocked by
  Logitech's service on 7 October 2026, after about 42 devices went on and off the entry carrying its
  serial. Before any write, read the `myharmony-service` skill's section on it: whose serial the entry
  carries, the volume per entry, and that a refusal with `ErrorCode` 5 means stop.
* **Never touch the real records**: not the Harmony 650's record with its owner's devices, not the
  spare Harmony One's protected record. Use the disposable records that skill lists.
* **No tests after a document or plan edit.** Tests only when code changed, and then the one that
  covers it.
* In conversation: plain English, the remote named beside any architecture number, no times or
  durations, and one concrete next step at the end.
