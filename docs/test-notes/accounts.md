# Test accounts

The Logitech accounts this project holds, and what was taken from each. Plan 009's move table sends every
account statement here; this file starts with the one plan 009's step 3.3 moved, and the others join it as
their steps reach them (the test notes of the Harmony One, 600 and 650 say which).

## The calibration account, and the button maps it gave

**What it is.** A throwaway account set up for this project with three devices and two activities, through
which Logitech's service compiled two configurations to a known setup: `calibration_one` for a Harmony One,
skin 54, and `calibration_h600` for a Harmony 600, skin 71. Section 132 is how they were made.

**What it gave.** The scan code of each key the two configurations reach, named in Logitech's own words,
derived on 13 August 2026: the code each scan sends was decoded into the bit frame a device sees and looked
up in the account's command catalogue, and its button maps said which button sends that command, section
133. That named 32 keys of the Harmony One and 36 of the Harmony 600. The account's stated device maps then
decided the four arrow keys of each, sections 323 and 398, and its button map replies close the list in both
directions, section 145: Logitech names 36 buttons for the One and 40 for the 600, every one placed.

**Where each part lives now.** Until plan 009's step 3.3 all of it was one document,
`reference/button-maps.md`, which was removed then:

* the scan code of each key is the drawing's data, `packages/silhouettes/src/models/one.ts` and `h600.ts`,
  each with the archive section behind it, generated into the keys pages of `reference/remotes/`;
* the frames each button sends in the two configurations are `FRAMES` in
  `packages/codec/test/irframe.test.ts`, which checks every drawn code against them;
* the derivation, its three rules and the four arrow keys left open are section 133, the completeness check
  section 145, the arrow decisions sections 323 and 398;
* the account data itself stays in the lab, in `work/myharmony/responses/` with the replies
  `GET_MapList_skin54.json` and `GET_MapList_skin71.json` that `tests/test_host_client.py` reads, and so
  does the instrument,
  `work/myharmony/buttonmap.ts`, which imports the repository's own decoder rather than carrying a second
  copy of it.

**What it cannot do.** It is a calibration and not a reader: it names keys for a configuration generated
through an account we hold, and cannot name a key in a contributed configuration, whose devices' catalogue
and maps are not ours to have. What it produced is a fact about each model, recorded once.
