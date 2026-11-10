# Todo: the remote's own help

The requirement is R44: give every activity the remote's own help, the advanced help and its delay fixing included.
Postponed from the Harmony 650's compile track, which builds without help. **Decided that both go in**, being the
troubleshooting a household relies on, while the welcome tour and the Remote Assistant at start stay out of every
configuration we build, as on the Harmony One. The Harmony 300 and 350 have no help; the other bench models are not
covered here yet.

## The Harmony 600, 650 and 700

- [ ] 1 Help, short press, per activity: the "Attempting to fix" screen that resends power and inputs, then a question per device ("Is the TV on?") that resends that command
- [ ] 2 Help held five seconds: the delay fixing menu, with a picker row and five delay screens per device
- [ ] 3 Help's per device parts: the "Is the X off?" question for Off, the four counters the answers bump, and the "Fix it now" wizards All Off offers once a counter is high enough
- [ ] 4 The Remote Assistant: one screen per activity, a branch on one variable before the working screen, and a shared screen for Off; the screen after a sync is the start's and stays out
- [ ] 5 Save and restore lists for a composed device's delays: the remote's delay fixing menu is their only writer. The delays' truth is the configuration on the computer for now, since MyHarmony never reads a delay back off the remote; without restore lists the configuration's delay wins at start, while with them a value saved on the remote overrides it, so decide whether FreeHarmony offers the menu at all before building them (section 303)
  - [ ] 5.1 The restore's device constant rule is measured in section 360: the device id's last five decimal digits, or its last four where five exceed 65535, on 290 of 290 restore leaves; the device order is ascending by id on 20 of 23 compiles and unread on the other three
- [ ] 6 The Help texts in our letters (the tour's are not needed, the tour staying out): The texts of Logitech's Help and tour screens keep Logitech's places, so in our letters, wider in the regular faces, 10 of their lines run 1 to 5 pixels past the right edge and the centred ones drift up to 6 pixels, measured on the bench file (section 368); a configuration of our own carries neither screen , so the overflow matters only to a file composed onto Logitech's compile; place them again when Help is built, or narrow the regular faces

## The Harmony One

- [ ] 7 The Harmony One: an activity's own help screen, built from a description; the One's compile track composes none, and the power off help is built already, section 415
