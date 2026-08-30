# Drawing a generated diagram

For any picture this project generates from data: an entity model, a call graph, a state machine, a
section map. Not for the model silhouettes, which are traced by hand and have their own skill,
`draw-remote`.

## The rule

**Use graphviz. Never write a layout engine.**

`dot` is a system tool, `brew install graphviz`, and it is not an npm dependency, so it does not go
through the workspace's pinning rules and it pulls nothing into the repository. It does ranking,
spacing, crossing reduction and edge routing, all of which are decades old and solved.

**What stays ours is what the picture says**: which things are drawn, which fields carry a relation,
what the label on each line is. That is a small function that emits DOT source. Everything below it
belongs to `dot`.

## Why this is written down

On 30 August 2026 the MyHarmony model diagram was drawn by about 250 lines of hand written layout in
`tools/model_pdf.py`: boxes in columns by distance from the root, balanced on a midline, with lines
drawn as three straight pieces through the midpoint between their two ends. It was written that way
because no Mermaid renderer was installed and adding one meant pulling a headless browser through
npm, and the reasoning stopped there. **Avoiding a dependency is not a reason to reimplement a solved
problem badly**, and the thing actually needed was a system tool that was one command away.

It failed twice, and the second failure is the instructive one.

* **The midpoint between two boxes with a third box between them is inside that third box.** Five of
  the thirteen relations reached across the picture, so five lines ran straight through whatever
  stood in the way. Nobody had measured it; it was reported by Danny looking at the output.
* **The fix for that looked correct and was not.** Lanes were reserved in the empty channels between
  columns, and a check that walks every line segment against every box reported four crossings
  still. The bug was requiring each free band to be twice the clearance wide when the clearance was
  already built into the bands, so no gap between two boxes could ever qualify and every long line
  quietly fell back to the straight route. The picture looked better because the short lines had
  improved.

Then it was rewritten on graphviz and read well on the first attempt, and all of the lane code went.
The lesson is not "hand written layout has bugs". It is that **column assignment and edge routing
are the easy half of a layout**, and ranking, ordering and spacing are the half that decides whether
a drawing reads, which is why the second version still looked bad after the lines stopped crossing.

## How

`tools/model_pdf.py` is the worked example. The shape:

**Nodes are HTML-like labels, not records.** A `<TABLE>` with a header row and one row per field
gives the entity box look, and unlike the `record` shape it takes per cell colour and alignment.
`shape=plaintext` so graphviz draws no box of its own around the table.

**Put a `PORT` on every row.** Then `Account:Remotes -> Remote` makes the line leave the attribute
that defines the relation rather than the box outline, which is the single thing that makes a
generated ER diagram readable. Shade the rows that carry one, so where a line starts can be seen
without following it back.

**Do not pin the compass point.** `Account:Remotes:e -> Remote` forces the line out of the east side,
and when the target sits below and to the left it doubles back around the box it just left. Writing
`Account:Remotes -> Remote` lets graphviz choose the side and the port still anchors the row. This
was measured on the model diagram: pinning `:e` produced four lines hugging a box, unpinning removed
all four.

**Choose `rankdir` from the shape of the nodes, not from habit.** Ranks run along `rankdir` and nodes
within a rank stack across it, so tall nodes plus `rankdir=LR` stacks the whole graph into one very
long column. The model's boxes carry about thirty fields each and `TB` gave an aspect ratio of 1.2
against 1.8 for `LR`.

**Let graphviz write the PDF.** `dot -Tpdf` sizes the sheet to the graph, so there is no page to cut
to fit and no caption of a guessed height to push the drawing onto a second sheet. Both of those were
real defects in the browser route it replaced.

**For embedding in an HTML page, take `-Tsvg` and strip two things**: the XML prologue and DOCTYPE,
which are not legal inside a body, and the `width`/`height` in points, which stop the drawing
scaling. Keep the `viewBox`.

## Rails

* **No fallback layout.** A second implementation kept for the case where `dot` is absent is two
  copies of the same derivation, which this repository refuses everywhere else, and the copy nobody
  looks at is the one that rots. Missing graphviz is reported as missing graphviz.
* **One source of truth for the content.** Where a machine readable form already exists, such as
  `docs/myharmony/core-model.mmd`, the DOT generator reads the same data the Mermaid file is
  generated from. It does not read the Mermaid file and it does not become a second description of
  the model.
* **Generated, never hand edited**, like `reference/silhouettes/`. Say so in the file's own header.
* **A diagram is a build product** unless something checks it. The PDFs here are gitignored because
  they are fully derived from two files that are committed.

## The check that is worth having

**Look at the output before believing it.** Render to PNG and read it. Every defect above was found
by looking, none by a passing test, and two of them were reported by Danny rather than found here.

Where a geometric claim is worth pinning, the cheap one is to walk every drawn segment against every
box and count the crossings. That check found four crossings in a fix that had been declared
complete. It is not needed with graphviz doing the routing, and it is the right instrument the moment
anybody is tempted to place something by hand again.
