# Todo: gather what only Logitech's service knows

**Why this comes first**: Logitech's configuration service still compiles, and it can be withdrawn
without notice. The device database is safe, archived and checked out beside this repository, but how
their compiler turns that database into bytes on a remote exists only on their server. We learn it by
comparing a configuration they compiled with the database entries that went into it, and once the
service is gone no new comparison can be made.

**Before working any item, load the `gathering-logitech` skill**, in this session and in every agent
brief: it holds the track's rules and says where the facts are.

**This todo gathers; [todo-process-logitech.md](todo-process-logitech.md) processes.** Everything here
needs the service: the compiles, filed in the lab, and what makes them usable later, which lands in this
repository. Working out the rules from the files does not need the service, so it is the next todo's,
and this one is done as soon as the service is no longer needed. **One condition**: an item is only done
when its file is checked to hold what it was compiled for, the family present or the setting seen to
change something, because finding a gap during processing may be too late to compile again.

**The order**: this todo, then the processing todo, then [todo-compile-650.md](todo-compile-650.md)
resumes. Everything else waits in [todo-later.md](todo-later.md).

**Every compile writes to the test account**: devices added, a compile requested, devices removed. That
needs a go-ahead and is paced rather than fired in bulk. The `myharmony-service` skill holds the
accounts and the rails. A compiled file is Logitech's output and stays in the lab; only names and
numbers about it come into this repository.

**How big the gap is**, measured on 7 October 2026 with the composer's own test over every command in
the archive: 46 infrared families write completely, 10 write except for 231 commands, and **631 write
nothing**. Those 631 hold 391507 of the database's 2067863 commands, and 10046 of its 54118 code sets
have no command that writes.

---

## 1. The harvesting route

- [x] 1.1 A harvest script in this repository, TypeScript beside the codec, credentials from the environment as `make analyze` takes them: put a list of catalogue devices on a test account record, compile, fetch the file into the lab with a manifest naming every device, remove the devices; the lab's Python client is retired for these steps; when a compile fails, it splits the batch and retries the halves until the device that breaks it is found and set aside on a list of its own; built as `packages/corpus/bin/harvest.ts`, first run filed in the lab's `work/harvest/first-run/`: two devices in, a compile holding both out, the record empty again
- [ ] 1.2 The same two devices compiled for the One, 650 and 350 (lab `work/harvest/first-run`, `check-650`, `check-350*`): the 650 stores 181 of the One's 196 infrared records identically and the other 15 differ only by a leading silence the One adds; the 350 shares only 90 of 296 pattern pieces with the One and takes eight devices of any type per compile, four televisions included. So the families are compiled on the Harmony One, 15 per compile, and on the Harmony 350, 8 per compile, with a sample of about 20 families on the 650; the 600 and 700 share the 650's architecture and the 300 the 350's, each confirmed by one compile of the same two devices
  - [x] 1.2.1 The 700 (lab `check-700`): all 197 infrared records identical to the 650's, so it needs no harvest of its own; the compile hung once and the whole retry succeeded
  - [x] 1.2.2 The 600: the service refused to add the two devices to the second test account's emptied record, "Cannot add device to the remote attached to the account", and syncing the remote failed in both MyHarmony and Harmony Desktop, the remote reading back unchanged; the two devices were set up by hand on the first test account's 600 entry, with one activity, and that entry compiled with a go-ahead, no device added or removed (lab `check-600-logitest`): 185 of the 650's 186 distinct infrared records identical, the remaining one and 9 extra records all of one 38 kHz timing, so not like for like with the 650's compile, which has no activity
  - [ ] 1.2.3 The 300 (lab `check-300`): not the same file as the 350's; four in five of its 32 byte pieces are in the 350's file in a different order, and of the 650's duration blocks found in either, 100 are in both, 6 only in the 350's and 1 only in the 300's. Whether the 300 needs a family harvest of its own, at 4 devices per compile, needs a decision
- [x] 1.3 The pace, rewritten on 7 October 2026 after the spare Harmony One was blocked: devices added to an entry once and left on, one compile per entry, separate sessions rather than a run, and a stop for good at the first refusal; the `myharmony-service` skill holds the incident and the rules
- [x] 1.4 The go-ahead for the account writes: given for the first test account's Harmony One, 650, 700, 350 and 300 records and the second test account's 600 record (16318263), to be repurposed after their devices and activities are saved to the lab

## 2. The infrared families we cannot write

- [x] 2.1 The list: every family where a command does not compose, with one device per family whose code set covers it, preferring a device whose commands are all in that family, plus a second device for the 20 largest families, to check the rule is the family's and not the device's; built by `packages/corpus/bin/harvest-list.ts` into the lab's `work/harvest/lists/families.json`: 641 families, 548 devices, 15 of them second devices
- [ ] 2.2 Compile them, 15 devices per compile and nearly every one from a different family, the largest families first, every compile filed in the lab; each device keeps its own records, so 2.3's check stays per family
  - [ ] 2.2.1 Paused on 7 October 2026: the run on the first test account's Harmony One entry got the spare Harmony One's serial blocked by the service, after 3 compiles holding 7 devices (lab `work/harvest/families-one`); the incident and the rules are in the `myharmony-service` skill
  - [ ] 2.2.2 Why pausing costs little: of the 641 families, 482 lack only the number of times a press repeats the code, which Logitech's definitions state for 39 families and our compiles measured as three on 22 of 24 where unstated; the working idea is to default to the stated number or three, with a per device setting the user tries out, so the harvest is not needed for the infrared to work
  - [ ] 2.2.3 Resume only much slower, on a serial whose loss costs nothing (a Harmony One or 525 that may come from a friend), adding devices once and leaving them on, and stopping for good at the first refusal
- [x] 2.3 Check each compile holds the records of the families it was made for: the 3 compiles filed before the pause hold 9 families over 7 devices, every frame the rhythm table builds found in the compile (610 of 610), and the 75 commands it cannot build, 73 of them in Microsoft 30 Bit and Philips Hurd 16 Bit LongToggle, present by record count; to repeat for any compile if 2.2 resumes
- [ ] 2.4 The 10 families that write except for a few odd codes: compile a device holding those codes, and check the codes are in it
- [x] 2.5 The bench's KPN box, the Motorola VIP 1853 (Kreatel IP 22 Bit): the 650's configuration in the lab (`h650_config_region`) holds all 38 of the catalogue entry's commands, every frame found, in a group of 51 records, so it needs no new compile

## 3. How the compiler handles every feature, on every supported model

Not limited to one remote: every piece of compiler behaviour we know we will need to compile a
configuration for every supported model, each feature compiled on every model that offers it.
**The supported models are the ones on the bench**, decided on 7 October 2026 for practical reasons.
Each item ends with its check: the compile differs from its control where the feature should show.
**Per model one base setup and one variant per feature**, each identical to the base but for that one
feature, about ten compiles per model. **Setups go onto the account through the service's own calls**,
made by the harvest script, with MyHarmony's client code showing which call carries what; by hand in
MyHarmony only where a call will not work, which a learned code probably is. A smaller model's base setup
is the 650's test setup cut down to its device limit.

- [x] 3.1 Which bench models get a compile: the One, 600, 650, 700, 300 and 350 (the 300 and 350 compiled through MyHarmony, their configurations dumped in the lab); the 525 is discontinued per the lab's `device-support.txt`, and the Touch takes a route with no compile
- [ ] 3.2 Per model, which features and settings it offers and how many devices it holds, from the captured product table, capabilities and settings, written as the first file of that model's reference folder, `reference/remotes/<model>/features.md` in the 650's layout, for the One, 600, 700, 300 and 350
- [ ] 3.3 One test setup per model that between them use every feature that model offers, plan 006 being the Harmony 650's, compiled for each model; check every device and activity of the setup is in the file
- [ ] 3.4 Every setting a model offers, compiled both ways: screen light, Remote Assistant, tilt sensor, leave devices on when switching activities, and whatever 3.2 adds; check the two compiles differ
- [ ] 3.5 A passthrough device in an activity, compiled with and without it; check the two differ
- [ ] 3.6 Favourite channels: plain numbers, a leading zero, a logo, more than one page; check each channel is in the file
- [ ] 3.7 Sequences, on their own and as a step in an activity's start; check each sequence's commands are in the file
- [ ] 3.8 A learned code: a raw infrared command added to a device; check the file holds a record for it
- [ ] 3.9 What a person changes by hand in the service: a key reassigned in an activity, a command renamed on the screen, a delay or an input changed; check each compile differs from its control
- [ ] 3.10 Long press actions, on the models that declare them; check the compile differs from its control
- [ ] 3.11 A model at its maximum number of devices and with many activities, so every page break and limit is seen on each model; check every device and activity is in the file
- [ ] 3.12 More activities, to calibrate which device gets which key in an activity (exact on 20 of 40 today); check every activity is in the file

## 4. Everything else only the services hold

Logitech's learning service, which names the family of a learned code, was dropped on 7 October 2026: a
learned code is played back as it was captured and needs no name, whatever remote it was learned from.

- [ ] 4.1 The latest firmware for every bench model, from the update service, filed in the lab where it is missing
- [ ] 4.2 Per bench model, the lists the service hands out beside the product table: its capabilities (captured for the 600 only) and its button list (the capture holds no list), all six models; settings are already captured for each

## 5. What lands in this repository

- [ ] 5.1 How the service is used: which calls, in which order, to put devices on an account, compile and fetch the file, in `docs/myharmony/`
- [ ] 5.2 An index of the harvest: per family and per feature, which lab compile holds the answer and for which model, names and numbers only, so nothing gathered is findable only in the lab
