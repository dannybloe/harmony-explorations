# Todo: FreeHarmony

What the application needs from this repository, and product ideas for it, kept here so they stay in
sight while the work is on the format. FreeHarmony has a tracker of its own on GitHub; when its work is
picked up, these items move there or this file becomes its list, decided then. Library and format work
the application depends on stays in [todo-later.md](todo-later.md) and the other todos; an item here is
about the product.

---

## 1. The app

- [ ] 1.1 The interface (was `todo-later.md` 4.1)
- [ ] 1.2 Publish `packages/*` so somebody without this checkout can build it (decision 4) (was `todo-later.md` 4.2)
- [ ] 1.3 A sequence as a step in an activity's start, which Logitech's schema has no form for: an addition of ours, if FreeHarmony wants it (was `todo-later.md` 4.3)

## 2. Screens

- [ ] 2.1 Screen sub-pages instead of favourite channels: a screen button that opens a page of commands of the user's choosing, "Inputs" for instance, and a button back, so a device or activity can be organised by kind rather than paged through; Logitech's favourites are this construct, a "Favorite Channels" button among an activity's commands entering a page of its own whose "Commands" button enters the commands again, each favourite a sequence-like list (section 344); FreeHarmony already does not offer favourites (`docs/how-a-harmony-works.md`)
  - [ ] 2.1.1 Untested: nesting deeper than one level, a sub-page on a device's own page in device mode, and whether the remote's hard Exit key returns from one; the "add an Activity" screen returns with push and pop (section 341), Logitech's favourites page with plain enters
  - [ ] 2.1.2 A composer for a sub-page, against the 650's favourites page as Logitech compiles it
