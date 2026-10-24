# Test notes

This project's own units, accounts and configurations, kept apart from the reference, which describes a
Harmony and never our bench.

* [Harmony 600](harmony-600.md)
* [Harmony 700](harmony-700.md)
* [Harmony One](harmony-one.md)
* [The corpus](corpus.md): which configurations the work was measured on

## The units

**Nine remotes are on the bench**, and this list is the
hardware, not the model families: two Harmony Ones, a Harmony 600, a Harmony 525, since 27 August
2026 a Harmony Touch, a Harmony 350 and a Harmony 300, since 27 September 2026 a Harmony 650, and since
29 September 2026 a Harmony 700. This said seven until 9 October 2026, two units short, the same count
`CLAUDE.md` had corrected for itself. The last three are the file based family and
are **not targets** for the config work: `openHarmony` refuses them by product id
rather than by accident, section 193. What they have bought so far is the reading of the descriptor
field that names a model, section 195, the route to their firmware, section 196, and their whole
protocol as Logitech specifies it, section 198. **There is an implementation now and it has read a
remote**, sections 200 and 201: `packages/usb/src/filepipe.ts`, and a Harmony Touch's `/sys/sysinfo`
opened, read and closed on the bench, 234 bytes in fourteen fields including the architecture the
remote states for itself. This paragraph called it a specification and not an implementation until
29 August 2026. Reading that identity is four commands, ping, open, read and close, and none of them
writes, so `openHarmony`'s refusal is about what has been built for the **config** path rather than
about what is reachable at all. Other models
appear throughout this page as firmware images or contributed configurations, and the Harmony 700 is
the one that gets mistaken for hardware, because it is the best mapped arch 14 image and is quoted
constantly. **A Harmony 700 unit has been on the bench since 29 September 2026**, and this said there
had never been one until 9 October 2026.

**The Harmony 600, 650 and 700 on the bench are all write targets**, the 650 since 27 September 2026 and
the 600 and 700 since 29 September, decisions recorded in `CLAUDE.md`'s "Never write to a remote". This
sat in the architecture's USB page until plan 009 step 3.2.
