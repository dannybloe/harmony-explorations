# Harmony 300 test notes

The bench Harmony 300: how it arrived, what was read off it and what it settled. What it showed about the
model is in `reference/remotes/harmony-300/` and about the family in
`reference/architectures/harmony-300-350/`; this file keeps what is one unit's, and the sources the
reference could not cite.

## The unit

**A second hand Harmony 300, on the bench since 27 August 2026**, sections 195 and 264. It reports skin
79, the European model, in its own `/sys/sysinfo` and its configuration, and 78 in its `bcdDevice`. It is
read only as files through `openFileBasedRemote`, and **nothing has ever been written to it**: the file
based family is on none of the write lists.

## The two reads

Both were predicted in writing before they were taken, and each section scores its predictions:

| read | predictions | scored in |
|---|---|---|
| as it arrived | `docs/predictions/harmony-300.md` | section 264 |
| after four devices were programmed | `docs/predictions/harmony-300-programmed.md` | section 265 |

**As it arrived**, section 264: a configuration built in 2011 by its own timestamp, 41234 bytes, holding a
previous owner's two devices in groups 0 and 1 of four. Nobody here had programmed it, so the device count
was unknown before the read. This is the configuration whose empty raw slot 8 was first blamed on the
model and then, by the second read, on the fifteen year older compiler.

**Programmed**, section 265: the unit was added to a test account and given one device per device key
through Logitech's service, a KPN VIP1853 set top box on Cable/Sat, a Panasonic DVD-S35 on DVD, a
Panasonic TX-P42GT30E television on TV and a Sony SLV-N700 video recorder on VCR/Aux, with favourite
channels 1, 2, 3 and 666 for the set top box. 97474 bytes. The favourites were entered on this remote,
which a prediction had assumed otherwise because nothing was said about them; that is the lesson
section 265 records about asking what somebody did in Logitech's client.

The two reads are the lab fixtures `h300_config` and `h300_programmed_config`, registered in
`packages/lab/src/index.ts` and `tests/lab.py` outside every corpus wide population.

## What the unit settled that the reference states

* The group index is the device key, by identifying each group of the programmed read in Logitech's
  catalogue, section 265.
* Four infrared groups whatever the device count, the model's stated maximum, section 264.
* `bcdDevice` names the base skin and `/sys/sysinfo` the regional one, sections 195 and 264.
* The Watch TV shortcut, as described by the person who set it up: "not really an activity, more like a
  shortcut button to turn on multiple devices at once", section 265.
* **The face is the Harmony 350's moulding**, a statement made holding both units, which is why
  `packages/silhouettes/src/models/h300.ts` takes every shape from the 350's drawing. The setup guide's
  photograph suggests the pause half of the play key is a separate inset; the unit outranks the
  photograph.

## Sources the reference could not cite

The reference's footnotes name an archive section, a test or a public address. These sources have none, so
the facts resting on them are marked not checked in the reference until one exists:

* **Logitech's Harmony 300 setup guide**, in the lab as `Docs/300 manual.pdf`; the printing on the keys is
  read off its cover photograph, PDF page 2, and its quotes about device keys, Watch TV and favourite
  channels are in the model's `behaviour.md` and `features.md`. No public copy of the English guide with
  those sentences was found.
* **Logitech's service's capability answer for a skin 79 entry**,
  `UserAccountDirector/GetProductCapabilities2`, asked on 7 October 2026 and filed in the lab's
  `work/myharmony/responses-per-model/`. Sections 264 and 265 hold its device and favourite maxima and its
  activity capability; the rest of the list (product family, display, settings, the other capability
  flags) and skin 78's favourite maximum of 5 are in no section or test.

## Not done

* No infrared bench run exists for this unit, with or without the Flirc.
* The firmware version it runs: `/sys/sysinfo`'s version field was not recorded, and only the product
  string says 1.4.0.
* No other file on `INERT_PATHS` was read off it.
