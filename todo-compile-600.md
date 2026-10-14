# Todo: compile for the Harmony 600

**The finish line**: a configuration for the Harmony 600 built entirely by us, nothing copied out of a
Logitech file, written to the bench 600 and used. The same finish line as
[todo-compile-650.md](todo-compile-650.md) and [todo-compile-700.md](todo-compile-700.md), and the same
code: this track carries only what the 600 needs beyond theirs.

**Why the 600 is next**: it is the third model of the 650's type, on the bench, and a write target since
29 September 2026, and decided on 13 October 2026 to follow the 700. Its firmware is 0.2, the 650's build,
so the readings of the 650's 0.2 images are a closer start than the 700's 2.8 was.

**Before working any item, load the `harmony-600` skill**, in this session and in every agent brief: it
says where the remote's facts are and holds the 600's write procedure.

**What differs from the 650 and the 700, by the reference**:
* the panel is **monochrome**, while its configurations carry colour pixels like the others';
* it takes **five devices**, by Logitech's manual and service;
* it has **delays saved on the remote** that override the configuration's at every start;
* the bench unit **reports skin 71** in its version block while Logitech's compile of its own configuration,
  `h600_config`, states **73**, the European 600, as ours does; nothing on the remote reads the
  configuration's skin, section 81; `calibration_h600` is skin 71;
* on the cable it has **not loaded its configuration**, section 110, so a memory read there is not a
  live one, where the 700's was.

**The route**: the empty configuration for the 600, checked and written, then the test setup on it, then a
bench test, as the 700's chapters 1 and 2 did.

---

## 1. The empty configuration for the 600

- [x] 1.1 The empty builder takes the 600, skins 73 and 71: the wiring, the firmware screens, mode 0's key list and the mode count from the parts already built for the 600, and the no activity configuration the wiring refuses on the 600 today, as a choice of ours or from a Logitech compile if one holds none
- [ ] 1.2 What the monochrome panel draws for a colour pixel, read in the 0.2 image's drawing path or seen on a test file, and then our look on it: the state colours, the letters' inks and smoothing, and the icons, each chosen so it reads on the panel
  - [x] 1.2.1 Read in the 0.2 image: the firmware sends every pixel to the panel unchanged, in the same sixteen bit mode as the 650, by the same display driver byte for byte; so what a colour pixel looks like is decided in the display module and the image cannot say
  - [x] 1.2.2 The panel's identity byte read over USB, data memory `0x384`: 0, as the 650's, so the same panel set up; whether 0 is an identity or a byte the read left unwritten the firmware does not say
  - [ ] 1.2.3 A test picture on the bench 600: ramps of red, green, blue and grey and a mid grey beside a checkerboard, to count its grey levels and see which channels count
  - [ ] 1.2.4 Our look chosen on that: the state colours, the letters' inks and smoothing, and the icons
- [x] 1.3 Checked: it rebuilds, every screen rebuilds, every byte attributed to a generator and none carried, as the 650's 11.1.1.4
- [ ] 1.4 Written to the bench 600 with a bench test: it starts, Devices and Activities lead to each other, an activity key shows the placeholder, All Off returns; the region read into the lab first, and the delays saved on the remote read

## 2. The test setup on it

- [ ] 2.1 The assembly takes skin 73: every measurement a composer or the assembly holds for the Harmony 650 or 700 alone checked against the 600's compiles, among them where a start up title wraps (116 against 130 pixels on the 600, section 358), the activity keys, the device lists and the device page look, monochrome on Logitech's 600 compiles
- [ ] 2.2 The device limit: 5 per Logitech's manual and service (the reference's `features.md`); the test setup with five devices first, and whether a sixth is taken checked on its own
- [ ] 2.3 Written to the 600 and run with a bench test as the 700's 2.3; behaviour as the file predicts, the look seen at the bench, and the delays saved on the remote checked against what the file states before predicting any timing
