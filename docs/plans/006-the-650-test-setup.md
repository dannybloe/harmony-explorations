# Plan 006: the Harmony 650's test setup

**Status: open.** Chosen for `todo-compile-650.md` 1.4, written 7 October 2026. Items 1.5, 1.6, 5.1 and
5.2 build on it.

## What it is for

The test setup is the set of devices and activities whose configuration, built by us, has to behave on
the 650 exactly as Logitech's compile of the same setup does (5.2). So it has to use every feature in
chapters 2 to 4 at least once. No real equipment is needed: the bench's infrared receiver hears what the
remote sends, so a device is chosen for what its catalogue entry exercises, not for what is on the shelf.

**One rule decided the devices**: every one of them composes completely, every command its catalogue
entry holds, with its inputs (2.6). That was measured with `lab/work/test-setup/scan.ts`, which composes
each candidate whole onto the 650's own Logitech configuration and reports what it left out.

## The devices, seven

| name | catalogue entry | what it is there for |
|---|---|---|
| LG TV | LG OLED65G26LA | discrete power, ten inputs chosen directly, the longest power on delay (10 s), so the delay is felt |
| Plasma | Panasonic TX-P42GT30E | power on and off as Logitech's long press version (1 s held), twelve direct inputs |
| Denon | Denon AVR-X4800H | the largest device, 118 commands on many device mode pages, twenty direct inputs, volume in three activities |
| KPN | KPN TV6000COK | toggle power, digits, so channels and favourites go to it |
| Kodi | Plex Plex_Player | toggle power, the playback device in two activities |
| Switch | Ligawo 3090063 | an HDMI switch with three inputs, the passthrough device |
| Sony HT | Sony DAV-C540 | inputs reached only by stepping, its Function key cycling Tuner, DVD, Audio 1, Audio 2 |

Seven devices fill the device list's first page and open a second (2.3). Seven is under Logitech's
eight for the 650 and over the manual's five; the bench unit has already held seven, 2.3.

**The bench's own set top box is not among them.** That KPN box is the Motorola VIP 1853, whose infrared
family is Kreatel IP 22 Bit, and none of its 38 commands composes: the repeats of that family differ
from its first frame per record, and how many repetitions its compiler sends is not stated anywhere, `docs/findings.md` sections 171 and 258. The KPN
TV6000COK stands in for it. Composing the real box is 2.6's work and is not needed for this setup.

## The activities, five

| activity | key | devices and the input each is set to | volume | channels and playback |
|---|---|---|---|---|
| TV kijken | Watch TV | KPN; LG TV on HDMI 1; Denon on CBL/SAT | Denon | KPN |
| Film kijken | Watch a Movie | Kodi; Plasma on HDMI 2; Denon on Media Player | Denon | Kodi |
| Muziek | Listen to Music | Kodi; Sony HT on Audio 2 | Sony HT | Kodi |
| Kodi kijken | none, on the menu only | Kodi; Switch on Input 2, passthrough; LG TV on HDMI 3 | LG TV | Kodi |
| Plasma kijken | none, on the menu only | KPN; Plasma on HDMI 1 | Plasma | KPN |

Five activities fill the activity menu's first page and open a second (3.12). Two activities hold no key,
so the menu is the only way to them (3.11).

## Everything else

* **Favourite channels**, in TV kijken, sent to KPN: nine, so three pages of four, four and one. Eight
  are plain numbers, 1, 2, 3, 4, 6, 8, 10 and 24, and one has a leading zero, 07, which Logitech spells
  out digit by digit instead of using the number sender (section 156). All are shown as numbers; a
  channel logo is a picture, and composing one is not in this plan.
* **Sequences**: one on its own, "Radio" on TV kijken's screen, Denon to Tuner and then PresetNext; and
  one as a step in an activity's start, Kodi kijken ending its start with Kodi's Menu.
* **Settings**: the screen stays lit 10 seconds, the Remote Assistant off, waking when picked up on.
* **Leave devices on when switching activities**: on, since off is what every configuration we composed
  so far already does (3.10).
* **Help**: none, as in 3.13.

## Which feature each part uses

| plan item | where in this setup |
|---|---|
| 2.1, 2.4 a device, complete | all seven, composed whole |
| 2.2 power, discrete, toggle, long press version | LG TV and Denon; KPN, Kodi and Sony HT; Plasma |
| 2.3 a second device list page | the fifth to seventh device |
| 2.5 inputs, direct and stepping | LG TV, Plasma, Denon and Switch directly; Sony HT by stepping |
| 2.6 every code writes | the selection rule above |
| 2.7 several devices at once | the whole setup |
| 3.2 to 3.4 activities, their device lists, Off | all five |
| 3.5 delays felt | LG TV's 10 s before its input in TV kijken and Kodi kijken |
| 3.6 inputs per activity | every activity |
| 3.7 roles split over devices | volume to Denon and channels to KPN in TV kijken; volume to the TV in Kodi kijken |
| 3.8 activity screen pages | every activity, Radio on TV kijken's |
| 3.9 picking the running activity again | any activity, picked twice |
| 3.10 leave devices on | the setting above, switching between TV kijken and Plasma kijken, which share KPN |
| 3.11 the three activity keys, and an activity without one | the first three activities; Kodi kijken and Plasma kijken |
| 3.12 a second activity menu page | the fifth activity |
| 3.13 no help | the whole setup |
| 3.14 a passthrough device | Switch in Kodi kijken |
| 3.15 All Off on a device the remote counts as off | All Off straight after the write |
| 4.1 favourites, both forms, several pages | TV kijken |
| 4.2 sequences, alone and in a start | Radio; Kodi kijken |
| 4.3 the three settings | above |
| 4.4 save and restore lists | a delay changed on the remote, then an activity restarted |

## What follows from it

* **1.5** picks the starting setup out of this one: part of it, at least one activity, and names that
  between them hold every letter the whole setup needs, so the font the remote needs is in Logitech's
  compile from the start.
* **1.6** has Logitech compile that starting setup for the 650. That is a write to the test account and
  needs a go-ahead.
* **5.2** compares our composed configuration with Logitech's compile of this whole setup, which needs
  the same say.
* **3.14 is needed by 5.1, not before.** Logitech's compile in 1.6 can hold the passthrough device
  without any code of ours; our composer has to build it only when 5.1 composes the rest.
