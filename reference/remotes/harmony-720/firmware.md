# Harmony 720: firmware

**The one Harmony 720 read runs builds of its own, an application 4.5 and a bootloader 4.2**, not the 880's
and 885's 4.4 and 4.0. What of the application has been compared with the 885's, routine by routine, is
listed once in [the platform's firmware page](../../architectures/harmony-880-885/firmware.md#the-harmony-720s-images).[^t-885-boot]

**Its application and its configuration pass the platform's start check.**[^t-885-start][^t-885-start-corpus]

## Not checked

* Any other version, and the application beyond the routines that page lists.[^unchecked]

[^t-885-boot]: Read in the firmware. [The test](../../../tests/test_harmony_885_bootloader.py)
[^t-885-start]: Read in the firmware. [The test](../../../tests/test_harmony_885_start_check.py)
[^t-885-start-corpus]: Measured in configurations. [The test](../../../tests/test_harmony_885_start_check.py)
[^unchecked]: Not checked.
