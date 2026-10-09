# Harmony 350: firmware

The 350 runs the image the Harmony 300 runs: one package, `skin104-harmony350-production-1.4.0.0`, names
skins 78, 79 and 104. Its version, layout, routines and source are stated once in
[the architecture's firmware.md](../../architectures/harmony-300-350/firmware.md).

| | value | standing and source |
|---|---|---|
| version | 1.4 | Logitech's service, section 196; the product string says `0-1.4.0`, measured, section 193 |
| where it is served | Logitech's software update service, by product 104 | Logitech's service, section 196 |

MyHarmony asks the software update service for the Harmony 350 specifically, where the Harmony 600, 650
and 700 take another route, Logitech's client, section 295.

## Not checked

* The version a unit runs, from its own `/sys/sysinfo`.
* Safe mode and recovery on this model.
