# Harmony 350 test notes

The bench Harmony 350: what was read off it, what was done to it and what this project holds of it. What
it showed about the model is in `reference/remotes/harmony-350/` and about the platform it shares with the
Harmony 300 in `reference/architectures/harmony-300-350/`; this file keeps what is one unit's. It started
as the bench rows of the model folder, moved here by plan 009 step 3.1.

## The unit

A Harmony 350 has been on the bench since 27 August 2026, one of the three file based remotes that arrived
together, section 193. **It is read only and stays that way**: `openHarmony` refuses its product id, the
one path that reaches it, `openFileBasedRemote`, opens files for reading on the inert path list, and this
architecture is on none of the write lists. **Nothing has ever been written to it** over USB, by concordance
or by this library. Its own records, `/sys/guid` and the `guid` field of `/sys/sysinfo`, identify the
unit and stay on the terminal.

Its configurations were changed only through Logitech's own service, by syncing, never from here.

## What has been read off it

| read | how | section |
|---|---|---|
| the configuration it arrived with, 121251 bytes, three devices and 130 infrared records | concordance's file family support, the first configuration of this architecture read anywhere here; the pointer slot count of 15 was found on it | 194 |
| `/sys/sysinfo`, then `/cfg/usercfg` | this library's `openFileBasedRemote`, read only, with the end marker appended to make the file a container, byte for byte concordance's copy | 262 |
| the configuration after programming, 83840 bytes | the same, after the unit was given four devices, one activity and five favourite channels through Logitech's service, copying the bench Harmony 600's setup | 262 |
| the configuration with one device removed, 68985 bytes | the same, after the Playstation 3 was taken off and nothing else changed | 263 |

The three configurations are lab fixtures, `h350_config`, `h350_programmed_config` and
`h350_three_devices_config`, named in `tests/lab.py` and `packages/lab`, and outside every corpus wide
total by decision, section 194. The archive calls the first the factory configuration; it held three
devices a previous owner had named, section 261.

## What was predicted

Each programmed read was predicted in writing and committed before it was taken:
[the predictions](../predictions/harmony-350-programmed.md), scored in sections 262 (P1 to P6) and 263 (the
seven questions, six answered yes). The configuration it arrived with was read before any prediction
document existed for this family.

## The configuration it arrived with

Its three device groups are all biphase codes: one is Logitech's `Microsoft 30 Bit` family and two are
biphase families nobody has identified, the first found in a configuration rather than in Logitech's
catalogue, section 261. Every one of its 130 records decodes since section 266, once the biphase reader
stopped needing its caller to trim the leading gap. 106 of the 130 state a send count and all of those state
3, section 259, and one list holds a pause of 170, section 327; both are in the model's reference as what a
compiled configuration holds.

## Logitech's service, about this unit's model

`UserAccountDirector/GetProductCapabilities2` was asked for the account entry of this unit, skin 104, on 7
October 2026, with the five other bench models. The answer is filed in the lab's
`work/myharmony/responses-per-model/` and is what `reference/remotes/harmony-350/features.md` restates in
"What Logitech's service states". **No archive section or test holds that answer**, which is why the rows
resting on it alone are marked not checked there; a test reading the filed answer would turn them into
evidence.

## The case

The statement that the Harmony 300 and the 350 are one moulding with different printing is a person's,
made holding both units, and is recorded in `packages/silhouettes/src/models/h300.ts`. The 350's drawing is
traced from the button page of its setup guide, whose copy in the lab is `Docs/350 manual.pdf`, the same
text as the guide Logitech publishes.

## What has not been done

* **No infrared bench test exists** for this model: nothing it sends has been watched with the Flirc, and
  the model's `behaviour.md` is the guide and the configurations only.
* No key press has been tied to a scan code.
* No firmware version has been read off the unit beyond the product string's 1.4.0.
