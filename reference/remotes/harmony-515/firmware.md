# Harmony 515: firmware

The program a Harmony 515 runs. How the images are laid out and installed is the platform's, in
[the architecture's firmware page](../../architectures/harmony-5xx/firmware.md).

| image | version | what is known |
|---|---|---|
| application | 3.4 | a different build from the Harmony 525's 3.0, its descriptor naming `Harmony Remote 0-3.4.0`; it carries a safe mode container at `0x8000` whose model record names skin 67[^t-harmony-515][^t-harmony-515-c] |
| safe mode image | not established | stored at `0x800000`; its descriptor names `Harmony Remote 4-3.4.0`[^t-harmony-515] |

**3.4 is also the newest firmware the forum table knows for skin 67**, in the generated table in
[the README](README.md).[^x-forum-table]

## Not checked

* Anything inside either image beyond its USB descriptor and the container.[^unchecked]
* Whether safe mode on this model destroys the application as it does on the Harmony 525; it is not to
  be entered to find out.[^unchecked]

[^t-harmony-515]: Measured on a unit. [The test](../../../tests/test_harmony_515.py)
[^t-harmony-515-c]: Measured in configurations. [The test](../../../tests/test_harmony_515.py)
[^x-forum-table]: Stated by a third party. [The comparison table](https://www.harmony-remote-forum.de/harmony_compare.php)
[^unchecked]: Not checked.
