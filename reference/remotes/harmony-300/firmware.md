# Harmony 300: firmware

The 300 runs the image the Harmony 350 runs: one package, `skin104-harmony350-production-1.4.0.0`, names
skins 78, 79 and 104. Its version, layout, routines and source are stated once in
[the architecture's firmware.md](../../architectures/harmony-300-350/firmware.md).

| | value | standing and source |
|---|---|---|
| version | 1.4 | Logitech's service, section 196; the product string says `0-1.4.0` |

## Not checked

* The version a unit runs, from its own `/sys/sysinfo`.
* Whether Logitech's software update service serves the image by product 78 or 79 as well as by 104,
  section 196.
* Safe mode and recovery on this model.
