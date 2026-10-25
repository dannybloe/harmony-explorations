# Test accounts

The Logitech accounts this project holds, and what was taken from each. Plan 009's move table sends every
account statement here: the calibration account came with step 3.3, and the second account and the per
model capability answers with step 3.4. An account's contents change and are never asserted, since test
accounts are not a population; what is asserted is a reply filed on a known day. The account map, the
skin field measurement and the blocked serial came from the `myharmony-service` skill with plan 009's
step 6.2, and the skill keeps the rules they produced.

## Which account is which

The lab's client selects an account with `MYHARMONY_ACCOUNT`, and the credentials beside it name two.
**Read the two address keys in `credentials.env` before assuming which selector is which**, and check
against the `Email` field of each account's own captured `GetMyHousehold`: the skill said "account 1 is
the real account, read only, always" for a fortnight, which was wrong in both
directions, and it was corrected on 28 August 2026 by exactly that check.

| selector | replies land in | what it is |
|---|---|---|
| 1, the default, `MYHARMONY_EMAIL` | `responses/` | a **test account**, whose address says so in its local part. The Harmony Touch work was pointed at it on 27 August 2026, and it is the account `compile.py` was authorised against. **The bench Harmony 650 is on it** since 27 September 2026, programmed with MyHarmony with the bench's KPN set top box, Denon and LG television |
| 2, `MYHARMONY_EMAIL2` | `responses-account2/` | the account in a project member's own name, the one that accumulated the calibration records |

Replies filed before the directory was derived from the selector sit in `responses/` whichever account
gave them, among them files whose names say account 2, so the directory alone does not name the account
of an old reply.

**What selector 2 held** on 27 August 2026: 17 remote records, of which **one was real**, the spare Harmony
One, synced 23 August, carrying the ten devices the rhythm and favourites campaigns used; and **sixteen
registration records never synced**, left by this project's experiments (the Harmony 525 probing of 13
August, sections 135 and 136, and the configuration campaigns of 23 and 24 August: favourite channels, the
number sender, the sequence, the protocol rhythms, which registered records for models such as a Harmony
600, 650, 700 and a Harmony 200 EMEA and migrated devices onto them). MyHarmony shows those sixteen as
"Remote set up in progress". They are disposable, and everything they produced is archived in the lab.
**The One+ record and the devices on it are evidence**, protected by name in `cleanup.py`'s `PROTECTED`
list. **The account was full at 17**, which is why which record can go is a question that gets asked.

### A record's skin field does not name the model

**`GlobalRemoteSkinId` reads 22 on every record created with the Harmony 525's serial**, sixteen of the
seventeen in selector 2 on 27 August 2026. Read literally that account held sixteen Harmony 525s. MyHarmony
displays a Harmony One+, a 700, a 650, a 700, a 600 and a 600 among them, and the model it shows comes from
the record's own `ProductIdentifier`, `LastProductIdentifier` and `OriginalProductIdentifier`. The 525 is
not a MyHarmony model at all (section 135). The mismatch is measured and unresolved, and the question of
which record to remove was answered wrongly four times in a row that day by reasoning instead of querying
`GetMyHousehold`.

## The blocked serial

**On 7 October 2026 the family harvest of `todo-secure-logitech.md` 2.2 got the spare Harmony One blocked
by Logitech's service.** Harmony Desktop then answered for that remote, on any account: "Your Harmony
remote is disabled. Please contact customer support." The remote itself still worked and this repository's
USB tools still read and wrote it, because the block is on the service's side.

* The harvest ran on selector 1's Harmony One entry, 16315365, which had been described as an entry never
  finished or used. **It carries the spare Harmony One's serial.** Nobody checked that before repurposing
  it, and the first comparison afterwards wrongly said it carried no bench unit's serial: the service
  writes the first three groups of each GUID in a different byte order from the identity block in the
  lab's `units/`, so a whole GUID comparison matches nothing. The last eight bytes of each GUID agree in
  both.
* On that entry that day: its 3 devices and 2 activities removed, then 13 add calls putting on about 42
  devices in all, each batch removed again after its compile, in quick succession.
* Then the refusals: an add of 7 devices, "Cannot add device to the remote attached to the account",
  `ErrorCode` 5 from `UserDeviceAdded`; then adds of 15, 8 and a single device, the same message from
  `CanAddAnotherDeviceToAccount`, on an entry holding no device at all.
* Then the entry was gone from `GetMyHousehold`, and the spare was refused by Harmony Desktop on other
  accounts too.

**The block was lifted by Logitech, reported on 12 October 2026.** How is not recorded, and nothing has
been written to the spare's entries since. **Not known**: the threshold, whether it counts adds, removals
or both, whether a time window applies, and whether a block is ever lifted by itself.

**The same refusal was seen once more the same day**, on selector 2's Harmony 600 entry, 16318263,
straight after its 5 devices were removed. That entry carries the **Harmony 525's** serial and was still
listed.

**`UserAccountDirector/GetGlobalRemote`** with an entry's `SerialNumber` answers `IsBanished`, the flag
MyHarmony checks before a sync. On 7 October 2026 it was true for the spare Harmony One and for the
**Harmony 525**, and false for the bench Harmony 600, 650 and 700 and for the 300 and 350 entries. When the
525 was blocked is not known; it may explain why selector 2's 600 entry, on the 525's serial, refused its
very first add.

### Which entry carries which remote

Measured on 7 October 2026 by comparing each entry's serial fields with the lab's `units/`. **A test
account entry is a real remote's account entry**, so a write to it spends that remote's standing with the
service.

| entry | carries the serial of |
|---|---|
| selector 1: 16315365 (Harmony One) | the spare Harmony One, **blocked**, lifted since |
| selector 1: 16315370 (Harmony 600) | the bench Harmony 600 |
| selector 1: 16315388, selector 2: twelve entries from 16318261 to 16318284, the 600 entry 16318263 among them | the Harmony 525 |
| selector 1: 16326458 (Harmony 650) | the bench Harmony 650 |
| selector 1: 16327048, selector 2: 16327049 (Harmony 700) | the bench Harmony 700 |
| selector 2: 16318180 (Harmony One) | the spare Harmony One, **blocked**, lifted since |
| selector 1: 16319183, 16321262 (350), 16321288 (300); selector 2: 16319182 | no unit with a record in the lab; the 300 and 350 have none, so these may be theirs |

Writes made the same day on the others, for scale: the 650 entry 3 add calls, the 700 entry 2, the 350
entry 5, the 300 entry 1.

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

## The test account of selector 1, and the Harmony 650 on it

The bench Harmony 650 is registered on the MyHarmony test account that `MYHARMONY_EMAIL` selects,
selector 1 in the table above (this section called it the second account, counting the calibration account
first); the lab note `reads/20260927T0840Z-h650-programmed-NOTES.md` holds how it was set up. It arrived programmed through MyHarmony on that account. MyHarmony's "Remote Backlight
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
serials the service blocked on 7 October 2026, above: the spare Harmony One's serial had carried the August
calibration and favourites campaigns before the harvest, and the Harmony 525's was registered for sixteen
entries with devices migrated onto them. **Not established**: nobody has counted the adds either serial
received, and the field may mean something else. If it holds, every remaining serial has a budget already
partly spent, and the count of adds per serial is the number to keep. `MaxDevicesPerTimePeriod` and
`MinutesPerTimePeriod` stand beside it, both null on all six.
