# More types of `@freeharmony-sdk/silhouettes`

<!-- introduction -->
Types that names of the silhouettes package use and that it does not export by name. An application meets them
inside what it is given and never has to import them.
<!-- /introduction -->

<!-- Generated from the source comments by `make api-reference-write`: change the source, not this page, apart from the introduction above. -->

### `Rocker`

```ts
interface Rocker {
  readonly id: string;
  readonly path: string;
  /** The names of the keys that are this moulding's segments. */
  readonly keys: readonly string[];
  readonly seams?: readonly string[];
  /**
   * Printing that belongs to the moulding and not to either half. `Vol` and `Ch` on a Harmony 600 are
   * printed on the pivot between the two ends, so they belong to neither, and putting them on the
   * upper half had the lower half's fill draw straight over them.
   */
  readonly labels?: readonly (Label & { readonly x: number; readonly y: number })[];
}
```

One physical key that pivots and reports more than one code: a volume or channel rocker, a page
rocker, a play and pause column, the arms of a direction pad.

It exists because drawing the halves as separate keys is **wrong about the hardware**, and it looked
wrong: four loose rectangles where the remote has one moulding with a pivot. So the moulding is
drawn once, outlined, and its halves are fills inside it with no outline of their own. The halves
stay separately addressable, which is what the interface needs, and the drawing stays honest about
there being one key there.

`seams` is for a parting line the product actually shows. The Harmony 600's play and pause column
has one across it and its volume rocker does not, so this is per model and measured rather than a
rule applied to every rocker.

Uses [`Label`](silhouettes.md#label).
