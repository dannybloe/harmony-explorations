# Harmony 650: features

What the 650 offers a person and what Logitech's software lets them set. Most of this comes from
Logitech, not from the remote, so the standing column matters more here than in any other file.

## The capability fields

<!-- generated:capabilities -->
| skin | max devices | favourite channel buttons | sequences | page button | sound and picture keys | long press |
|---|---|---|---|---|---|---|
| 72 | 8 | 23 | yes | yes | no | no |
| 74 | 8 | 23 | yes | yes | no | no |

Generated from `MODELS_BY_SKIN` and `hasLongPress` in `packages/usb/src/models.ts` by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

Standing of each column, per `reference/capabilities.md`: **max devices** is Logitech's service,
`MaxDevicesPerAccount`, adopted in section 136; **long press** is Logitech's service,
`ProductsManager/GetAllProducts`, which declares none for this model; every other column is the forum
table's, **third party**, and favourites, sound and picture keys are unchecked there.

## Devices: two vendor figures that disagree

| figure | standing and source |
|---|---|
| **8** | Logitech's service, `MaxDevicesPerAccount`, and the classic client's table, section 136. What `models.ts` holds and what the composer refuses past, section 331 |
| **5** | **Logitech's manual**, twice: "set up the Harmony 650 to control up to 5 devices" and "If you have already set up 5 devices (the maximum number of devices for the Harmony 650), the option for adding devices will not be available". Product Specification: "Maximum # of devices per account 5" |

The manual is the 2010 edition. Two readings fit and nothing here chooses: the limit was raised in a
later software generation, or the two describe different things. The same kind of disagreement exists
for the Harmony 525, `reference/capabilities.md`. **The bench unit holds six devices** in
`h650_panasonic_config` and accepted a MyHarmony sync with them, section 305 and section 317's table,
which is evidence that the current software allows more than five on this account. **Whether the
remote itself enforces any limit is not checked**; nothing in the firmware has been read for one.

The configuration's own ceiling is separate: at most 128 state variables, and a device costs three
plus its inputs, so the device count binds first on every configuration measured, section 331.

## Activities

| | standing and source |
|---|---|
| three activity keys, Watch TV, Watch a Movie, Listen to Music, plus More Activities for the rest | Logitech's manual, page 2 |
| how many activities a 650 may hold | **not stated**. The manual: "The number of activities you can add depends on the devices you have added". Seventeen model records were filled with seven activities each and every model with a screen took all seven, `docs/how-a-harmony-works.md`, Logitech's service; whether a 650 record was among the seventeen is not recorded there, so for the 650 **not checked**. The bench unit holds four, section 317 |
| an activity key with no activity opens mode 0, "Use the Harmony setup software to add an Activity on this button" | read from configurations, section 311 |
| the activity menu pages when full, with the page Logitech compiles | read from configurations and composed, section 316; paged 1/3 to 3/3 and wrapping at the bench on the combined file, `todo-compile-650.md` |

## Favourite channels

* Under **Favorites** in the Watch TV activity, four to a page, each "the button beside the channel
  number or icon", Logitech's manual pages 3 and 5.
* **23** is the forum table's figure, third party. The manual gives no number.
* How the 650 stores them is **not read**: favourites are read on the Harmony One only, sections 154
  and 156, `todo-compile-650.md` 4.1.

## Help and the Remote Assistant

* **Help** asks whether things worked and resends what is needed; **held for 5 seconds** it opens
  advanced help, Logitech's manual page 6. On the Harmony 600 and 700 that is where a device's
  inter device delay and repeats are adjusted, their manuals; on the 650 **not checked**.
* Help also leads to a "Select device" screen, a third list of devices, `docs/how-a-harmony-works.md`.
* **Help belongs to what is running, not to a device**: in an activity it resends that activity's power
  and inputs, with nothing running it resends power off and asks "Did that fix the problem?", and a
  device page binds no Help, so a press there goes to whatever is running underneath. Read in Logitech's
  compiles, every activity and the nothing running state binding Help and no device mode, section 333;
  the nothing running case **measured on a unit** from a device page. In an activity from a device page
  **not checked**. `docs/how-a-harmony-works.md` has the long form.
* **Remote Assistant**: shown after a sync and when an activity starts, turned off temporarily from its
  own screen, back after the next sync, Logitech's manual page 4. MyHarmony lists `RemoteAssistant` as a
  setting for the 600 and 700, section 292; for the 650 the setting is claimed in
  `todo-compile-650.md` 4.3 and its effect on the configuration is **not checked**.

## Sequences

Logitech's software allows up to 25 steps. **No arch 14 compile holds one**, so the arch 14 form is
inferred from the Harmony One's, section 327. The composer refuses a sequence by the depth of the
forty instruction action queue, never by step count, which refuses Logitech's own limit on this
remote, section 327 and the `writing-a-config` skill.

## Delays

* **Power on delay** per device, 0 to 45 seconds in tenths, read from configurations, section 288.
* **Inter device delay** per device, 0 to 2 seconds in tenths, section 287. It holds back that device's
  own command, a tenth of a second per unit, in an activity's start and in All Off, measured with an
  infrared receiver, section NNN; on a device mode key press it does not act, by the configuration's
  reading, **not checked** on the remote.
* **A delay saved on the remote wins** over the configuration's at start, measured on the Harmony 600,
  section 303. **The 650 has none saved**: its settings store holds three records, all setting `0x80`,
  measured, section 282.
* A changed power on delay is live straight after a write and restart, measured on the 650, section 283.

## Settings MyHarmony offers

| setting | standing and source |
|---|---|
| `GlowTime`, how long the screen stays lit | the configuration's timer 1, **measured on the 650**, section 292 |
| `TiltSensor`, waking when picked up | listed for the 600 and 700, section 292; for the 650 **not checked**, `todo-compile-650.md` 4.3.3 |
| `RemoteAssistant` | listed for the 600 and 700; for the 650 **not checked**, 4.3.2 |
| leave devices on when switching activities | claimed for the 650 in `todo-compile-650.md` 3.10, Logitech's service; what it changes is **not checked** |

No MyHarmony `GetRemoteSettings` answer for a 650 has been saved, section 292, so the list above is the
600's and 700's and the todo's statement, not the 650's own.

## Learning

"IR learning: Yes (Up to 200 KHz)", Logitech's manual, done through MyHarmony with the old remote,
manual page 15. Learning on this unit is **not checked**.

## Not checked

* The device limit the remote or today's MyHarmony actually enforces.
* The number of favourite channels and how they are stored.
* The 650's own MyHarmony settings list.
* Advanced help's delay and repeat screens on this model.
* Long press, beyond Logitech's statement that the model has none.
