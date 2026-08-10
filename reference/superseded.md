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
| `nothing found so far sends data during one` | section 91 | a literal scan cannot see a data response at all, since its length nibble is computed; CCP2 is a capture on both edges in all four images |
| `the protocol knowledge was moved to the server between the two generations, and the server is gone` | sections 56 and 58 | the MyHarmony service answers and compiled a config that week; the classic service is the discontinued one |
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

| `66 shared descriptors` | section 82 | 5 symbol tables; the 66 came from reading each block area's start, a body start only 135 times in 199 |
| `Nothing here decodes that` | section 82 | the body is `u24 table; u16 n; u8 index[n]`, and every width is a literal in the firmware |
| `what stays copied is 4 to 68 bytes` | section 84 | nothing stays copied: every byte of eighteen containers is written by a rebuilder |
| `43 bytes left in six gaps` | section 84 | the six shapes are read, and no user config has an unattributed byte |
| `it takes eleven` | section 85 | one, a row index; the picture belongs to the opcode 3 that follows |
| `all 912 instances` | section 85 | 1080 and 776 row selects, eight per mode page, and the address is opcode 3's |
| `eight byte values are not decoded` | section 86 | a transition: `u8 zero; i16 from; i16 to; u16 operand; u8 opcode` |
| `the u16 at +0x02, unexplained` | section 86 | the variable's highest value, which its name states plus one |
| `next free number inside its own family` | section 81, corrected 9 August 2026 | the first free number above the contiguous run containing that remote's own skin: Gin's block is 54 alone and 55 is allocated elsewhere |
| `+0x04  u8    zero in every sample` | section 77, widened 9 August 2026 | the frame's length is a `u24` at +0x02, so that byte is its high byte; no corpus sample separates the readings |
| `0 = normal, 2 = Test mode` | section 87 | 0 is application mode, 4 safe mode, 1 Test mode, 3 Boot mode, from the packages' own comments |
| `Low nibble a compiled in zero` | section 87 | field 4's low nibble is the software type; it reads 4 in each remote's safe mode image |
| `PROTOCOL, SKIN, FLASH and BOARD. That is what a remote compares` | section 87 | six fields, and an absent or empty one matches anything |
| `a u24 duration in units of 0.1 microseconds` | section 92 | nanoseconds, and the two values are a carrier period and its fifty percent on time |
| `count % FLASH_CHUNK_DATA == 1` | section 94 | the refusal is an odd count: the fetch loop reads a word, subtracts two and exits on zero, so 65 and 127 hang too |
| `caps an internal read at one chunk` | section 93 | it refuses a count whose final chunk would be one byte; 64 and 124 byte reads are measured safe |
| `the payload is the last N bytes of the file` | section 87 | the header ends at the line carrying the INFORMATION terminator; the declared length is a check on that split |
| `at or above program address` | section 96 | there is no address threshold: the response sender has no bound, and the read returns if the flash byte `0x8C7` above the failing chunk is even |
| `The parity rule is real but it is local` | section 96 | an odd count never terminates anywhere; what varies is whether the overwritten counter lands on an even value |
| `a comparison somebody can find` | section 96 | there is no comparison; the deciding byte is 2247 bytes further into the data the loop is reading |
| `is no longer the obvious next thing to read` | section 98 | nothing in the response machinery was: the endpoint's buffer descriptor is pointed straight at the capture buffer |
| `the sort of coincidence that says one codebase` | section 98 | `0x40D` is the endpoint's byte count, fixed by the part, so all three would share it however they were written |
| `The header layout is arch 12 only` | section 98, corrected the same day | arch 14 writes the same header through `INDF0` at `0x0938C`; the scan that missed it filtered out `0xEF` |
| `a polite end is a reboot, or it is nothing` | section 99 | USB mode has an exit gated on the command state being zero, which is exactly what `0xE0 0x01` clears |
| `it is the disconnect, not the traffic` | section 99, 10 August 2026 | a session of one plain read then a cable pull left the remote out of USB mode; both sticking sessions had contained a deliberate odd count hang |
| `a self-clearing restart rather than a battery pull` | section 100 | a genuine device reset: the clock is reset too, so data memory is reinitialised and no corruption survives the hang |
| `No arch 9 firmware routine has been traced to it` | section 101 | `0x046D6` reads it and `0x038EC` derives from it; the transfer sends `0xB0 | row`, a page address command |
| `the return matching opcode 22; one per mode program` | section 101 | that is arch 12's reading; on arch 9 opcode 23 is the page transfer, paired one to one with opcode 22 |
| `a peripheral operation selected by operand bits 4 to 8` | section 102 | arch 14's description on arch 12's handler; the field is five bits and selects between three mechanisms |
| `their contents are **unread**` | section 103 | group 9's fourth device level pair and a table of two bit fields, reached by overrunning the group on purpose |
| `so that is a shape rather than a reading` | section 103 | not six `u16` values with a missing count byte: four bytes are a device level pair and eight are read as bytes |
| `not gaps: `0x1F` band `0xFC`` | section 104 | `0x1F` band `0xFC` is intercepted by the instruction fetch before the dispatcher sees it, on all four architectures, so the dispatcher's arm doing nothing is not the instruction doing nothing |
| `Read as far as it goes in section 102 and it stays placement` | section 103 | selector 17 sets the display's light level, which is a meaning, and it is 68 of the band's 106 uses per config |
| `an unnamed peripheral` | section 103 | `CVREF`, the comparator voltage reference, whose 27 distinct settings the level table is |
| `What they threshold is not established` | section 103 | the four sample sum of analogue channel 1, giving a band that chooses the display light's level and the device levels it sends |
| `a conjecture rather than a finding` | section 105 | it is a finding: the scale is 4 + trim/65536 millivolts a count from two words in page 0xFF, and the firmware compares the result against the literal 3400 |
| `The four small records in the `0xFF` page.` | section 105 | `+0xF580` is the battery gauge's scale, and its second word is the per unit trim two Harmony Ones differ in |
| `four timeout pairs` | section 106 | four pairs of device levels: `0x249A0` sends both halves to the I2C device's registers 2 to 5 and nothing counts them down |
| `program the band's timeout` | section 106 | it sends the band's pair of eight bit levels to a device at I2C address 0x60 |
| `the operand's bit 0 chooses which of the two` | section 106 | selectors 0 to 12 read bits 1 to 3 normalised to a boolean at `0x24F6C`, not bit 0; bit 0 is the display light's fade against snap and belongs to selector 17 alone |
| `That is the shape of a bit banged output` | section 106 | it is an enable: set at the end of a power up sequence and cleared at the start of a power down, with the data going over the hardware I2C master; the loop that gave it that shape has no callers |
| `the only structure in the format so far that is not one table across architectures` | section 107 | one of two: the opcode block `0x65` to `0x6E` is arch 14 only, and arch 9 and arch 12 branch every one of those ten opcodes to the dispatcher's exit |
| `0x3F`'s bands are the only structure in the format that is not | section 107 | the same, from the other document; two structures diverge and the second is ten whole opcodes |
| `two more accumulator operations, through helper routines` | section 107 | a 16 by 16 multiply and a restoring division: `0x78` takes the product's low word and `0x77` the quotient |
| `exactly one opcode in the whole corpus has no reading` | section 107 | none: `0x6E` was the last and it is the accumulator modulo the operand |
| `emit one to three bytes on a diagnostic channel` | section 108 | it appends them to a region of the external serial flash, through a page program with a status poll |
| `peripherals and a diagnostic output channel, plus register moves` | section 108 | the channel is the flash journal: `0x0F`'s `0xE0` band appends bytes to a region of the external flash |
| `2 MiB by three routes and 4 MiB by concordance's` | section 108 | not open at all: section 88 closed it at 2 MiB on 9 August 2026 and the summary was never swept |
