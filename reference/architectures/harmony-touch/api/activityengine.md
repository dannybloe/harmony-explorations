# Harmony Touch API: the activity engine's requests, `harmony.activityengine?*`

The activity engine is the part of the remote's software that starts and stops activities on request and, on
a hub, runs programs: rules that start an activity at a time of day, at sunset or when another device changes
state. It answers three requests. **On a Harmony Touch only one of them matters**, `runactivity`, which is how
the remote's own screens start and stop an activity; the other two serve the rules, which run only on a hub.
How a request line reaches the engine over the cable is the [API overview](README.md).

**Everything here was read in the Touch's production firmware, build 4.15.330**, in the engine and in the
screens; nothing was sent to a remote[^t-touch-api-engine]. A Touch's host name is `juniper` and its
provisioning mode, as measured, 0[^t-touch-answers]; the activity engine does its own work only in mode 3,
the hub's, and that branch is described where it decides an answer and is otherwise not checked.

The activity started is one of the activity list, [activities and buttons](../activities-and-buttons.md),
started in the order of [starting, switching and stopping](../activities-and-buttons.md#starting-switching-and-stopping).

## The requests

The kinds and the verifiers are as on the [engine's page](engine.md#the-requests); what each verifier means on
the cable is the API overview's, [the checks before a handler](README.md#the-checks-before-a-handler), with
the one only this group uses below.

| request | what it does | kind | verifiers |
|---|---|---|---|
| `harmony.activityengine?runactivity` | starts an activity or turns the running one off | action | `HasParams`, `IsActivityRunning`, `isValidActivity`, `HasUsageLog`, `Default` |
| `harmony.activityengine?locationupdate` | hands the activity engine a user's location; nothing acts on it in this build | none | `HasParams`, `Default` |
| `harmony.activityengine?suntimes` | today's sunrise and sunset, in local time | read | `HasParams`, `Default` |

**None of the three restarts, erases, resets or writes firmware**; `runactivity` sends the infrared that
starting an activity sends[^t-touch-api-engine].

## The verifier only this group uses

The group's other two, `HasParams` and `IsActivityRunning`, are shared with setup and system and are in the
API overview's table: neither refuses on a Touch, [the checks before a handler](README.md#the-checks-before-a-handler).

| verifier | what it checks | on a Touch, from the cable |
|---|---|---|
| `isValidActivity` | refuses with 560 when no configuration is loaded or no `activityId` is given, and with 569 when the activity is neither one the engine loaded nor a program of the home control configuration | the activity must be one of the activity list, or `-1`, the off activity, which the engine adds to the loaded activities itself |

The state digest is the engine's own record of the running activity, kept for a hub's clients; outside mode 3
the engine does not update it itself, so on a Touch it stays at no activity, `-1`, and status 0, whatever
runs[^t-touch-api-engine]. A client can still write any field of it, in any mode, through
`connect.statedigest?update`, [connect](connect.md#connectstatedigestupdate); only the engine's own moving of
the field is mode 3's. Which activity runs is in the engine's loaded account instead, and that is what
`isValidActivity` reports when it refuses.

**The refusal reports the running activity.** A refusal with 569 carries `activityId=` and the number of the
activity the engine's account says is running, at once, so it reaches a cable host; with a made up activity
number this is the one request that tells a cable host which activity runs[^t-touch-api-engine]. That has
not been seen on a remote[^unchecked].

## Each request

### harmony.activityengine?runactivity

Starts an activity, or turns the running activity off, the way the remote's own screens do it[^t-touch-api-engine].

**Handler**: `processCmdRunActivity` in `tasks/activityengine/apihandler/activityengine.lua`.

**Parameters**: `activityId`, `args`, `rule`, `noRestart`, `channel`.

* `activityId`, required: the activity's number as the activity list states it, or `-1`, the off activity,
  which the engine adds after loading the list.
  The value `0`, which the handler takes to mean the running activity, is refused by `isValidActivity`
  first unless the activity list holds an activity of that number.
* `args`: a table, or JSON text decoded into one, holding `rule`: `start`, the default, or `end`. Text that
  does not decode answers 504, an insufficient-arguments refusal; how the decoder's result is used for text that does
  is not checked[^unchecked].
* `channel`: a channel to tune once the activity has started.
* `noRestart`: compared with the number 1, so it has no effect from the cable, where it is text. With it, a
  request for the activity the state digest names only tunes `channel`, through
  [`harmony.engine?changechannel`](engine.md#harmonyenginechangechannel).

**What it does**, on a Touch[^t-touch-api-engine]:

1. With the engine restarting the last activity after a start up, it answers 510, a not-ready refusal. On a
   Touch that restart does not happen, as above.
2. A rule of `start` for the activity the state digest names makes it resend that activity's power and input
   commands, through [`harmony.engine?helpdiscretes`](engine.md#harmonyenginehelpdiscretes). On a Touch the
   digest names `-1`, so **a start of `-1`, rather than an `end`, does not turn the activity off**: it resends
   the running activity's commands. The screens send `end` to turn off.
3. Otherwise it announces the start inside the engine as `run_activity`, which on a Touch is the same queued
   start as [`harmony.engine?startactivity`](engine.md#harmonyenginestartactivity), with `end` for any
   activity turned into `-1`; in mode 3 the activity engine's programs take it instead.

**Answers.** 200 at once; the start's progress and its end then go to the asking client and to every
client as for `startactivity`, which a cable host does not receive[^t-touch-api-engine]. 500 when the
activity number is missing after the verifiers.

**Who calls it.** The screens start and stop every activity with it, through `startActivity` in
`appscommon/harmony.lua`, which the launcher, the start up, the shared styles and the sleep timer screen use,
`launcher.lua`, `init.lua`, `style.lua` and `sleeptimer.lua`, sending `activityId`, `args` with `start` or
`end`, and `async`, which nothing in the engine reads; the light and blind scene screens, `lampScenesMode.lua`
and `blindScenesMode.lua`, start a scene the same way through `setScene`. Inside the engine the home control
manager, `hamanager.lua`, sends it to start or end a program from a home control key[^t-touch-api-engine].

### harmony.activityengine?locationupdate

Hands the activity engine a user's location, for rules that start an activity on arriving home[^t-touch-api-engine].

**Handler**: `processCmdLocationUpdate` in `tasks/activityengine/apihandler/activityengine.lua`.

**Parameters**: `user` and `location`, both required, or 500.

**What it does.** Announces the location inside the engine as `location_update`. The activity engine listens
for it and, in this build, does nothing with it in any mode[^t-touch-api-engine].

**Answers.** 200 at once.

**Who calls it.** Nothing on the image sends this name; it is for a phone app talking to a hub[^t-touch-api-engine].

### harmony.activityengine?suntimes

Today's sunrise and sunset, converted to local time, as the activity engine's rules use them[^t-touch-api-engine].

**Handler**: `processCmdSunTimes` in `tasks/activityengine/apihandler/activityengine.lua`.

**Parameters**: none.

**Answers.** 200 with `sunrise` and `sunset`, or 500, a missing-context error, when the
activity engine has no sunrise, sunset and time zone in its context. **The activity engine fills that context
only in mode 3**, the hub's, from the location and the clock, so on a Touch this answers 500[^t-touch-api-engine].

**Who calls it.** Nothing on the image sends this name[^t-touch-api-engine].

## Does any request read a document back

No. `runactivity` and `locationupdate` change state, and `suntimes` reports a calculation, which a Touch
does not make. The one thing this group reports from the configuration is the running activity's number, in
`isValidActivity`'s refusal above[^t-touch-api-engine].

## Not checked

* What a text `args` that decodes does, since the decoder is native code and its second result is what the
  handler keeps[^unchecked].
* That the refusal with 569 carries the running activity to a cable host on a remote[^unchecked].
* Everything in mode 3: the programs, the rules, the sun and the location[^unchecked].
* Other host names, other modes, other builds and other products of the generation[^unchecked].

[^t-touch-api-engine]: Read in the firmware. [The test](../../../../tests/test_harmony_touch_api_engine.py)
[^t-touch-answers]: Measured on a unit. [The test](../../../../packages/usb/test/touch-host.test.ts)
[^unchecked]: Not checked.
