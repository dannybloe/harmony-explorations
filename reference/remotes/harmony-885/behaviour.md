# Harmony 885: behaviour

How a Harmony 885 behaves for the person holding it. What activities and device mode are, on every
Harmony, is [how a Harmony works](../../how-a-harmony-works.md); this page says what is this model's own,
from Logitech's manual and from the firmware, as each footnote says.

## Device mode

**One key enters device mode and the same key leaves it.** The manual names the mode and the way in,
"Press **Devices** to enter device mode", adds that "to access device mode you do not need to be in an
Activity", and the key is pressed again to come back. Once a device is chosen the whole keypad controls
it, in the manual's own example: "If you choose Television as the device, the number, volume and channel
buttons will all control your television."[^s151]

Where the key sits on the face, and whether it is printed DEVICE or Devices, is not checked.[^unchecked]

**Logitech advises against needing it.** The 885's manual says "you should never need to use Device mode
during normal use of your Harmony remote", and that "you can eliminate the use of device mode by
customizing your Activities", by putting the command on the display or on a button.[^s151]

## Switching devices and holding a key

**The codes that switch a device open with a silence of that device's own**, and a long one holds back every
code after it in an activity's start, to every device, since the remote sends one code at a
time.[^t-885-delay] That this silence is the wait between devices a person sets is inferred and not
checked.[^unchecked] The configurations read carry one per device on the codes that switch devices, 200 ms to
a second on 80 of the 84 device groups of the sixteen containers read, copies of six configurations,
and 50 ms on the other 4, [sending](../../infrared/sending.md#the-delay-between-devices-on-the-harmony-880-and-885).[^t-885-delay-corpus]

**A held key stops at the end of the copy being sent** when it is released, rather than after everything the
remote had already read ahead, [sending](../../infrared/sending.md#how-the-harmony-880-and-885-play-a-record).[^t-885-infrared]
Whether a release part of a code goes out after a short tap is not checked on a unit.[^unchecked]

## When the configuration cannot be trusted

**A Harmony 885 whose configuration fails its check at start shows a message and then runs a small
configuration built into its firmware**, rather than stopping: it still answers on the cable, so the
configuration can be written again. The same happens when its identity block is blank. The messages, and
how the check is made, are the platform's,
[the architecture's firmware page](../../architectures/harmony-880-885/firmware.md#what-the-application-does-at-start).[^t-885-start]
The check runs only at a start, so nothing the remote does later brings the message back. How long the
message stays is 3000 ticks of the firmware's timer, and the length of a tick is not
established.[^t-885-start][^unchecked]

**Three keys held together restart the remote**: scan codes 2, 33 and 32, at any key scan, [keys](keys.md).
Whether holding them on through the restart leaves the remote in its bootloader is not checked, since the
bootloader's own key scan restarts on the same three.[^t-885-end][^t-885-boot][^unchecked]

## Not checked

* Everything a unit would show: the screens on start, on the cable and with low batteries, the help, the
  timers; and what the built in configuration offers after its message.[^unchecked]

[^s151]: Stated by Logitech, in the manual. [Section 151](../../../docs/findings.md#s151)
[^unchecked]: Not checked.
[^t-885-start]: Read in the firmware. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-end]: Read in the firmware. [The test](../../../tests/test_harmony_885_write_end.py)
[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-delay]: Read in the firmware. [The test](../../../tests/test_harmony_885_delay.py)
[^t-885-delay-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_delay.py)
[^t-885-infrared]: Read in the firmware. [The test](../../../tests/test_harmony_885_infrared.py)
