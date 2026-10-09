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
| an activity key with no activity opens mode 0, "Use the Harmony setup software to add an Activity on this button", and the centre key under "Exit" returns to the screen before; an activity on no key still starts from the Activities menu | read from configurations, section 311, and seen on the bench with a key we emptied, section 341 |
| which activity each activity key starts: MyHarmony's "Customize Activity Buttons", one activity per key and no empty choice, so a key is empty only with fewer than three activities | MyHarmony's client and Logitech's compiles, section 340 |
| no long press on an activity key, or on any key: the firmware raises press, repeat and release only | the firmware, build 0.2, section 340; [keys.md](keys.md) |
| a pass through device, a switch the picture only passes through: switched on and set to its input by the activity, and bound no key and no screen item | read from configurations, composed and seen on the 650, section 339 |
| the activity menu pages when full, with the page Logitech compiles | read from configurations and composed, section 316; paged 1/3 to 3/3 and wrapping at the bench on the combined file, `todo-compile-650.md` |

## Favourite channels

* Under **Favorites** in the Watch TV activity, four to a page, each "the button beside the channel
  number or icon", Logitech's manual pages 3 and 5.
* **23**, **Logitech's service**, `MaxFavoriteChannels` in `GetProductCapabilities2`, read 7 October
  2026, `reference/capabilities.md`. It agrees with the forum table's figure. The manual gives no number.
* **Kept per device, shown per activity**: MyHarmony saves favourites for a device, and an activity shows
  the favourites of the one device that changes its channels, on a page of their own: a "Favorite
  Channels" button among the activity's commands opens it, and a "Commands" button on it, three
  favourites beside it on its first page, goes back. A device that changes channels in no activity has
  its favourites in no screen and not in the file. Logitech's compile and the bench, section 344.
* How each favourite's sending is built on this model is **not read**; on the Harmony One it is sections
  154 and 156. The compiled file holds one number sender record per device whose favourites are shown.

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
  infrared receiver, section 335; on a device's own command pressed in device mode it does not act, by
  the configuration's reading, **not checked** on the remote.
* **A delay saved on the remote wins** over the configuration's at start, measured on the Harmony 600,
  section 303. **The 650 has none saved**: its settings store holds three records, all setting `0x80`,
  measured, section 282.
* A changed power on delay is live straight after a write and restart, measured on the 650, section 283.

## Settings MyHarmony offers

| setting | standing and source |
|---|---|
| `GlowTime`, how long the screen stays lit | the configuration's timer 1, **measured on the 650**, section 292 |
| `TiltSensor`, waking when picked up | **Logitech's service** lists it for the 650, default on, read 7 October 2026; what it changes in the configuration is **not checked**, `todo-compile-650.md` 4.3.3 |
| `RemoteAssistant` | **Logitech's service** lists it for the 650, default on, read 7 October 2026; its effect on the configuration is **not checked**, 4.3.2 |
| leave devices on when switching activities | **per device**, in the device's power settings: "I want to keep this device on when switching Activities and only turn it off when I press the Off button". In the configuration it removes that device's switch off from the start of every activity that does not use it; the activities that use it still switch it on and All Off still switches it off. MyHarmony's client and two Logitech compiles, and heard with the infrared receiver on Logitech's compile: switching from an activity using the device to one without it sent the device nothing, and All Off switched it off, section 340 |

**The 650's own list is these three and no others**: `GlowTime` default 20, `TiltSensor` and
`RemoteAssistant` default on, from `GetRemoteSettings` for a 650 entry and from
`GetProductCapabilities2`, both Logitech's service, read 7 October 2026 and filed in the lab. This
paragraph said until then that no 650 answer had been saved, section 292, so the list was the 600's and
700's. Leaving devices on is a capability, `LeaveDevicesPoweredOn`, and not one of the settings: it is set per
device, above.

## Learning

"IR learning: Yes (Up to 200 KHz)", Logitech's manual, done through MyHarmony with the old remote,
manual page 15. Learning on this unit is **not checked**.

## Not checked

* The device limit the remote or today's MyHarmony actually enforces.
* How a favourite's sending is built: read on the Harmony One only.
* Advanced help's delay and repeat screens on this model.
* Long press, beyond Logitech's statement that the model has none.
