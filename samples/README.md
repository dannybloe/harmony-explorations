# Samples

Empty on purpose.

A corpus of config dumps is genuinely needed. Phase 1 of the plan in
[../docs/forum-post.md](../docs/forum-post.md) depends on it, and a dump paired with a
description of what it contains (which devices, which activities, which buttons do what) is
far more useful than a dump alone, because the description is ground truth to decode against.

But config dumps are **personal data**. A Harmony config records what equipment someone owns
and how they use it, and the accompanying `concordance -i` output contains the remote's unique
serial GUIDs. So nothing is committed here until the project agrees an approach. Open
questions:

* Which fields identify a person or a device, and which can be safely published?
* Do the serial GUIDs need removing, or the whole `-info.txt`?
* Does the owner's equipment list count as personal data? Arguably yes.
* Should samples be synthetic where possible, generated once configs can be built?

Until that is settled, the right pattern is: owners keep their dumps locally, and specific
structures get extracted and discussed rather than whole files being published.

If you are looking for something to build that needs no format-writing ability and helps
immediately: an **extractor** that pulls the IR code database out of an existing dump. The IR
codes people cannot recreate are already sitting on their own remotes. That is read-only, it
cannot damage hardware, and it preserves the data before more remotes die.
