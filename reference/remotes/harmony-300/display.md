# Harmony 300: display

**The Harmony 300 has no screen.** Everything it does is on its keys, and a person sees nothing but the
keys light, if they do. Logitech's setup guide shows a face without one, and the drawing follows
it[^t-no-screen]. It is one of the three screenless models, with the Harmony 350 and 200, and a remote with
no screen holds one activity at most,
[how a Harmony works](../../how-a-harmony-works.md#a-remote-with-no-screen-holds-exactly-one-activity).

<!-- generated:display -->
| field | value | from |
|---|---|---|
| raster | none: no entry for architecture 16 | `SCREEN_SIZES` in `packages/codec/src/render.ts` |
| raster on the drawing | no screen on the drawing | `h300.ts` |
| panel | no record | `packages/usb/src/models.ts` |
| touch | no record | `packages/usb/src/models.ts`, and `touch` on the drawing's screen is no |

Generated from `packages/codec`, `packages/usb` and the drawing by `make remote-reference-write`. Change the source, not this block.
<!-- /generated -->

A configuration still carries a clock record, and the remote runs a clock from it that steps the minute
and, on every configuration read, never moves the hour or the date, [the family's memory.md](../../architectures/harmony-300-350/memory.md#the-state-variables).
Nothing on a 300 could show it.

## Not checked

* Whether any key lights while the remote sends.

[^t-no-screen]: Stated by Logitech, in the manual. [The test](../../../tests/test_silhouettes.py)
