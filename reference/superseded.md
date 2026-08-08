# Claims that are dead, and must not be restated

`tools/facts.py` reads the table below and fails if any of these phrasings appears in a document
outside a correction. `make facts` runs it and so does the pre-commit hook.

**Why this file exists.** An audit on 8 August 2026 found eleven places where the documents
contradicted the code. Five of them were claims a later finding had falsified: `findings.md` had
been corrected in place, as the house convention asks, but nobody swept the documents that
summarise it. Correcting the original is not enough when four other files repeat it, and
remembering to sweep is not a mechanism.

**How to use it.** When a finding overturns something, add the dead phrasing here in the same
commit that lands the finding. That is the fourth place a confirmed fact goes, after
`config-format.md`, `findings.md` and a regression test; the `finding` skill says so too.

**A phrase may still appear inside a correction**, because recording corrections in place is the
whole point of the convention. The checker allows a line that starts with a blockquote `>`, a
strikethrough `~~`, an italic note or a bullet, or that sits directly above or below one. So
quoting a dead claim in order to say it is dead is fine, and asserting it is not.

**A line opening in bold is not a correction**, and it counted as one until 8 August 2026, because
the italic marker `*` also matches `**`. These documents open a load-bearing sentence in bold
constantly, 507 lines of them, so the exemption was widest exactly where a summary would restate a
dead claim: 19% of all non blank lines were excused, against 10% now. Two real restatements were
being missed and both are marked with the explicit escape below.

**Choose the phrase carefully.** It has to be dead in every context, not merely dead in the one
that prompted it. `40588 glyph codes` is *not* here, because it remains the correct figure for the
three architectures whose glyphs are two bytes a pixel; what was wrong was quoting it as the corpus
total. Where a number is only dead in one reading, mark the live one with a `fact:` marker instead
and leave this table alone.

| phrase | superseded by | what is true instead |
|---|---|---|
| `another reader will not move it` | section 53 | seven readers moved it, from 26.3% to 98.1% on a Harmony 700 |
| `Twelve are named now` | section 47 | all twenty base slots are accounted for |
| `20260 programs` | section 64 | 20374, once arch 9's mode programs became reachable |
| `18252 programs across ten configs` | section 53 | 20374 across thirteen containers |
| `have no such region` | section 62 | arch 9 has a picture region; only the safe mode containers do not |
| `no header and no framing` | section 54 | a picture states `u8 kind; u16 stride; u16 rows` |
| `nothing found so far addresses them` | section 64 | screen opcode 2, inside mode programs that were unreachable |
| `width on arch 14 is not established` | section 54 | `stride` states it, like every other architecture |
| `decode only 43 of 114` | section 64 | 114 of 114 |
| `which of 0xFE and 0xFF is which is not established` | section 59 | two pages, and `0xFE` maps from program address zero |
| `route to the MCU_ID that would measure` | section 59 | unreachable by construction: the window is two 64 KiB pages |
| `the pictures do not tile` | section 54 | they tile exactly, once `stride` is read as pixels |
| `They are not copies of the page lists` | section 69 | they are copies, differing only in which base slot 10 entry they name |
| `What the twin is for is not established` | section 69 | it is a copy of the page's own list, and nothing reads it |
| `never at the same rank in their pools` | section 69 | the k-th copy is the k-th page, in mode table order |
| `address a second operand space` | section 72 | the operand carries the rest of the opcode, and `0xC000` is the lowest band the dispatcher tests |
| `a second dispatcher, not read yet` | section 73 | both dispatchers are read to the end, band by band |
| `consume the next three off the queue` | section 73 | three bytes, not three instructions: the queue reader pops one byte |
| `unknown; in the second operand space` | section 73 | `0x1F` is a register machine and `0x07` thirteen nullary operations |
| `About a third of the entries are drawn` | section 66 | all of an arch 12 bank, all but two elsewhere |
| `an entry is four bytes` | section 66 | `6 + 3 * pages`; the four byte reading was short rather than wrong |
| `arch 9 uses a different packing` | section 63 | read: two bits a pixel, rows framed by their own byte length |
| `PROFILES` entry is already in | 8 August 2026 | it was not, until the audit added it |
| `one instruction, not two` | section 74 | two instructions: arch 12 tests both, and arch 14 issues neither |
| `75 to 80% on the One` | section 74 | 97.0%, once the beeper, the date step and the silent write were read |
| `The header is 21 bytes` | section 75 | `12 + 9 * count`, stated at `+0x0B`; 21 is the count of one case |
| `wanting a firmware nobody has` | 8 August 2026 | `concordance -b -f` returns the whole firmware region on arch 8 and arch 9, so an image is one contributor away; and most of arch 8's remainder is self framed and needs none |
| `does not return firmware.` | section 2, 8 August 2026 | it does on arch 8 and arch 9; the defect is two architecture entries, so the claim is only true with a scope, and a sentence that ends there has none |
| `flag rather than an address bit` | section 76 | bit 23 belongs to the read command's address on arch 9; a 525 is silent below `0x800000` and answers `AHCM` at `0x820000` |
| `which the lab does not have` | section 76 | it has one: the arch 9 application image was read off a 525's external flash at `0x810000` on 8 August 2026 |
| `twelve byte version block` | section 76 | seven on a 525, and the reply's low nibble states it; twelve is the arch 12 and arch 14 figure |
| `every owner is rebuilt except base slot 0` | section 77 | every owner the accounting claims is rebuilt; what stays copied is what no reader claims |
| `the one thing the emitter cannot touch` | section 77 | base slot 0 is read and rebuilt from fields |
| `payload, starting with FRAME_PROLOGUE` | section 77 | the payload is a list of nodes, and those nine bytes are the first one |
| `no field inside it has ever been read` | section 77 | tag, length, level, index and name, and level 1 names base slot 13 |
| `the glyph count on arch 12, and 1 on arch 8` | section 78 | the byte at +1 is the first glyph code; the count sits at +2 unless that byte is zero |
| `Which of the two header bytes holds it is` | section 78 | it is the byte at +2, and the other one is the first code, not a spare |
| `the font header's spare byte` | section 78 | there is no spare byte: it is the first glyph code |
| `version word is per model` | section 81 | per config: one Harmony One carries two words either side of one sync |
| `word is per model rather than per config` | section 81 | the same unit disagrees with itself, section 58's observed pair |

