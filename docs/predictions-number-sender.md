# Predictions for base slot 16, written before the sample exists

Base slot 16 is the one section of the config format that was read entirely out of firmware and never
once exercised by a file. All 21 containers in the corpus carry a count of zero, so
`docs/config-format.md`'s layout for it rests on the code alone, and two of its fields could not be
read from anything: what `flags` bits above 2 do, and what `base` is for. `docs/findings.md` section 39
is the reading.

**On 23 August 2026 Danny created three favourite channels** on a Harmony One in a MyHarmony account,
for a Sony television, labelled `Chan1`, `Chan100` and `Chan666` with channel numbers 1, 100 and 666.
Nothing has been synced to a remote; it exists only in the account. A server side compile will produce
the first configuration anywhere with this section populated, and the numbers are known in advance.

This file is the prediction, committed before the file is fetched, so that the comparison afterwards is
a measurement and not a story. The same discipline as `docs/memory-map-525.md`, which recorded what was
expected of a Harmony 525 before one was connected. **Where a prediction turns out wrong, that is the
result worth having**, and the reason for writing it down is that a layout confirmed by a sample nobody
predicted is a layout that was fitted to the sample.

## What the account already states, read before the compile

Read on 23 August 2026 from the live service, before anything was compiled, so this half is measurement
rather than prediction. A favourite channel is not a structure of its own: it is a **button** on the
television's own device button map, of type `SoftRemoteButton`, whose action carries a channel and names
the device. The three sit on a menu called `FavoriteChannels` at positions 0, 1 and 2, their labels are
the `TextOnRemote` field, and the Harmony 600 and the Harmony 525 on the same account have none, so the
feature is per remote and not per household. The route is `GetButtonMaps` per surface, which is the one
Logitech's own client takes for a Harmony One: its favourites flow is gated on a product list that holds
the One, the 600, the 650, the 665 and the 700, while every later remote uses a different call.

**The channel is stored as text, not as a number**, `"1"`, `"100"` and `"666"`. That is worth one extra
prediction: if a channel can carry a leading zero, then the minimum digit count in a record cannot be
what pads it, because two channels of the same television would want different padding. So the field
should be 1 here whatever the labels look like, and a channel authored as `007` is the second sample that
would settle it.

## The prediction that matters most

**The count will be 1, not 3.** A base slot 16 record is a **method for sending a number**, not a
number: it holds digit tables, a base and a minimum digit count, and the value comes from the action
list machine's accumulator, since `0x1F` with an operand in `0xF3xx` sends the accumulator to the
record its low byte selects, section 39. So three channels should produce **one** record, describing
how this television takes a number, plus **three action lists** that each load a constant and send it.

If the count is 3 instead, then a record is a channel and the whole reading of that section is wrong in
its central claim. That is the single most informative outcome this sample can produce.

## The rest, in the order they would be checked

| what | prediction | why |
|---|---|---|
| base slot 16 count | 1 | one method for the one television, per above |
| the three numbers | operands of accumulator loads in three base slot 10 lists: `1`, `100`, `666` | 666 is `0x29A` and fits a sixteen bit operand, so no digit splitting happens in the config |
| `base` | 0 | there is nothing to offset when the label states the channel outright |
| minimum digits | 1 | if it is 3, channel 1 is sent as `001`, which the sample settles either way |
| the three digit tables | ten instructions each, all `0x7D` naming the television's group | a digit is an ordinary infrared command of that device |
| first, middle and last tables | may be the same address three times | nothing in a plain channel entry needs a different command for a leading digit |
| `instruction queued last` | an `Enter` or `Select` command of the television, or NULL | many televisions need a confirmation after the digits, and Sony generally does not |
| `flags` | bits 1 and 2 clear, so the prefix never fires | a prefix at ten or at a hundred is what a two part channel number needs, and these are plain |
| the labels | `Chan1`, `Chan100` and `Chan666` readable by `make text` | the screen draws them, and this route touches base slot 16 not at all, so it is an independent check that the right config was fetched |
| where the buttons live | one mode page, three bindings, each to a base slot 10 list | the same shape as the activity pages section 120 reads |

## What would falsify the layout rather than a detail

* a record whose length is not 23 bytes, since the layout is `1 + 3 + 1 + 3 + 3 + 3 + 3 + 3 + 3`
* fourteen bytes at `+0x00` that do not end where the first of the three table pointers begins, which
  is the closure section 39 rests on
* a digit table with anything other than ten entries
* the channel numbers appearing **inside** base slot 16 rather than in an action list, which would mean
  a record is per channel after all

## What this cannot settle

`flags` bit 0, the one that makes the prefix consume a digit, and bits above 2, unless one of these
three channels happens to exercise them. Three plain numbers probably do not. A channel entered as a
two part number, `4-1` style, is what would, and it is worth a second sample if the first comes back
with every flag clear.
