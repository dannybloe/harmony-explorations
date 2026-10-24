# Test accounts

The Logitech accounts this project holds, and what was taken from each. Plan 009's move table sends every
account statement here: the calibration account came with step 3.3, and the second account and the per
model capability answers with step 3.4. An account's contents change and are never asserted, since test
accounts are not a population; what is asserted is a reply filed on a known day.

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
The Harmony 600 is the model the button map was measured on, rather than the 650, because the calibration
configuration was compiled for a 600; the four up and down keys were decided from the same configuration's
device maps, section 323.

## The second account, and the Harmony 650 on it

The bench Harmony 650 is registered on the second MyHarmony test account, the one `MYHARMONY_EMAIL`
selects; the lab note `reads/20260927T0840Z-h650-programmed-NOTES.md` and the `myharmony-service` skill hold
how it was set up. It arrived programmed through MyHarmony on that account. MyHarmony's "Remote Backlight
Settings" dialog for it sets the glow time with a slider from 5 to 30 seconds, and its "Select Language For
Your Remote" dialog offers English, Français, Español, Deutsch, Nederlands, Italiano and more; both are
MyHarmony's screens as seen, with no archive section, which is why the 650's features page marks the
slider's range not checked. This sat in `harmony-650.md` until plan 009's step 3.4.

**The account's 650 and 700 records hold nine copies of one activity**, four keys each, section 323. That
matters to one count the reference states: an activity's key map is Logitech's set key for key on 20 of
the 40 activities measured, and the other 20 are those nine copies and 11 activities of the three hand
customised configurations. The reference counts the activities without saying that nine are copies on a
test account; this paragraph sat in the architecture's compiler page until plan 009's step 4.1.

## The per model capability answers

`UserAccountDirector/GetProductCapabilities2`, and the plain `GetProductCapabilities` beside it, were asked
on 7 October 2026 through one account entry of each of six models, the Harmony One (skin 54), 600 (71),
650 (72), 700 (66), 300 (79) and 350 (104), with `GetProductButtonList` for each as well. The answers are
filed in the lab's `work/myharmony/responses-per-model/`, one file per model and operation, and
`tests/test_product_capabilities.py` reads the capability answers and asserts every field each model's
features page states, so those rows carry that test as their footnote. Until plan 009's step 3.4 the
answers were transcribed in `reference/capabilities.md` and held by no test, and the six features pages
marked the rows resting on them not checked.

**`NumOfAddDevice` is 100 on every model**, and nothing in MyHarmony's source reads it, so whatever enforces
it is on the server. It may be a lifetime budget of device adds per remote, which would explain the two
serials the service blocked on 7 October 2026; that is not established, and the `myharmony-service` skill
holds the incident.
