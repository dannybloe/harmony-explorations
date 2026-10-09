# Harmony 300: display

**The Harmony 300 has no screen.** Logitech's service states its display as none,
`reference/capabilities.md`, and its setup guide shows none. It is one of the three screenless models,
with the Harmony 350 and 200, `docs/how-a-harmony-works.md`.

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | none: no entry for architecture 16 | `SCREEN_SIZES` in `packages/codec/src/render.ts` |
| raster on the drawing | no screen on the drawing | `h300.ts` |
| panel | no record | `packages/usb/src/models.ts` |
| touch | no record | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

A configuration still carries a clock record and the firmware a month end routine, section 322; whether
the remote keeps a running clock is **not checked**, and nothing could show one.

## Not checked

* Whether any key lights while the remote sends.
