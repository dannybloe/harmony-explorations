# Test notes

This project's own units, accounts and configurations, kept apart from the reference, which describes a
Harmony and never our bench.

* [Harmony 300](harmony-300.md)
* [Harmony 350](harmony-350.md)
* [Harmony 525](harmony-525.md)
* [Harmony 600](harmony-600.md)
* [Harmony 650](harmony-650.md)
* [Harmony 700](harmony-700.md)
* [Harmony 885](harmony-885.md)
* [Harmony One](harmony-one.md)
* [Harmony Touch](harmony-touch.md)
* [The corpus](corpus.md): which configurations the work was measured on
* [Test accounts](accounts.md): the Logitech accounts and what each gave

## The units

**Thirteen remotes are on the bench**, and this list is the hardware, not the model families. This said eleven until two Harmony 885s arrived, and nine
until plan 009 step 6.1, two units short: the friend's Harmony One and Harmony 525 of decision 21 had not
reached it, and before that it said seven, the same count `CLAUDE.md` had corrected for itself.

| unit | may it be written | what has been written, in one line | notes |
|---|---|---|---|
| the everyday Harmony One | **never**, the one exclusion that matters | nothing | [harmony-one.md](harmony-one.md) |
| the spare Harmony One | yes, the first write target | the first unit written, section 222: a block back unchanged, delays, a device, the whole write sequence, and the configurations of the One's track since | [harmony-one.md](harmony-one.md) |
| the friend's Harmony One, dead display | yes, decision 21; not yet among `write-config.ts`'s targets | nothing | no notes yet |
| a Harmony 525 | yes, since 5 September 2026 | one block written back unchanged, section 269, and no edit | [harmony-525.md](harmony-525.md) |
| the friend's Harmony 525 | yes, decision 21; not yet among `write-config.ts`'s targets | nothing | no notes yet |
| a Harmony 600 | yes, since 29 September 2026 | a block back unchanged, section 302, then configurations; its saved delay cleared over USB once, section 305 | [harmony-600.md](harmony-600.md) |
| a Harmony 650, second hand | yes, since 27 September 2026, and it may be reprogrammed as the work needs | the first arch 14 write, section 281, then configurations | [harmony-650.md](harmony-650.md) |
| a Harmony 700 | yes, since 29 September 2026 | repaired out of safe mode by a reinstall request, section 295; firmware staged from 2.5 to 2.8, section 297; then configurations, sections 300 onwards | [harmony-700.md](harmony-700.md) |
| two Harmony 885s | no: arch 8 is not a write target | nothing; read only | [harmony-885.md](harmony-885.md) |
| a Harmony Touch | no: `openHarmony` refuses the file based family | nothing; read only, section 200 | [harmony-touch.md](harmony-touch.md) |
| a Harmony 350 | no, for the same reason | nothing; read as a file, section 262 | [harmony-350.md](harmony-350.md) |
| a Harmony 300 | no, for the same reason | nothing; read as a file, section 264 | [harmony-300.md](harmony-300.md) |

The rule and the rails are `CLAUDE.md`'s "Never write to a remote", and which unit is on the cable is read
off its identity block, never asserted by the caller.

**The Touch, the 350 and the 300 are the file based family** and are not targets for the config work:
`openHarmony` refuses them by product id rather than by accident, section 193. What they have bought is the
reading of the descriptor field that names a model, section 195, the route to their firmware, section 196,
and their whole protocol as Logitech specifies it, section 198. `packages/usb/src/filepipe.ts` read a Harmony
Touch's `/sys/sysinfo` on the bench, sections 200 and 201: ping, open, read and close, none of which writes,
so `openHarmony`'s refusal is about what has been built for the configuration path rather than about what
is reachable at all.

**The Harmony 700 is the one that gets mistaken for hardware it was not**, because it is the best mapped arch
14 image and is quoted constantly. A unit has been on the bench since 29 September 2026; until 9 October
2026 this page said there had never been one.
