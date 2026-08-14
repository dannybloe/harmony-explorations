---
name: status-report
description: Write a short, plain status update for the owner: what changed, one concrete example with real numbers, where that puts us in the plan of record, and one next step. Use when asked for a status update, for "waar staan we", for "vertel het even kort", or when a long working stretch ends and the last real report is stale.
---

# A status update the owner can read in a minute

The person reading this did not just read the code. He may be away from the bench, on a phone, or
picking the project up after a week. He wants to know where it stands, to feel that it moved, and to be
able to answer with one word.

So this is not a smaller version of a commit message. Three registers, one subject:

| | for | can be |
|---|---|---|
| `docs/findings.md` | whoever has to believe it | long, technical, with the evidence |
| a commit message | the record | long, technical, addresses and counts |
| a status update | the owner, now | short, plain, one example |

## The shape

Five parts, in this order, and every one of them short.

1. **What changed**, in his words rather than in the repository's. Not "made 93 corpus totals exact",
   but "veel tests controleerden of een getal minstens iets was in plaats van of het precies klopte".
2. **What it bought.** One sentence on why it mattered. If it bought nothing measurable, say that.
3. **One concrete example with real numbers.** This is the part that makes it real, and it is the part
   most often left out. "Er stond dat er meer dan 65.000 lettertekens uit de configs moeten komen,
   terwijl het er 170.922 zijn" lands where a percentage does not.
4. **Where that puts us in the plan.** Name the milestone or step from `docs/roadmap.md` and say whether
   it moved. **Read the roadmap before writing this, do not recall it**: the milestones carry their own
   status and it changes under you. If nothing moved, "M2 staat waar het stond, dit was onderhoud" is a
   complete and useful answer.
5. **One next step**, concrete enough that "doe maar" is a complete reply. One, not a menu.

Then, if it applies, **one honest note**: what failed, what is still unexplained, what you did not do.
Put it at the end and keep it to a sentence or two. It belongs in every report where it is true, because
a report that only ever contains good news stops being read as information.

## The register

* **Plain words.** No opcode numbers, no test names, no file paths, no section numbers as the subject of
  a sentence. A section number is fine as a pointer at the end; it is not the news.
* **Name the remote, never the architecture number alone.** "de Harmony One", "de Harmony 600", not
  "arch 12". This is a standing rule for all conversation here and it matters most in a report, because
  the numbers are this project's internal handle and map to nothing on his desk.
* **Dutch in conversation**, per the standing preference; documents and code stay English.
* **A number needs its denominator.** "98,9%" says less than "3100 van de 3106 toetsen".
* **No em-dashes and no en-dashes**, like everything else published here.
* Write as the colleague who did the work: "ik" for what you did, "we" for where the project is. Name a
  dead end when there was one. No exclamation marks, no performed enthusiasm, no praise of the reader.
* **Aim for 120 to 200 words.** If it needs more, the extra belongs in `docs/findings.md`.

## What it looks like

Good, and this is close to one he asked for and accepted:

> Veel van onze tests controleerden of een getal **minstens** iets was, in plaats van of het **precies**
> klopte. Bijvoorbeeld "er moeten meer dan 65.000 lettertekens uit de configs komen", terwijl het er
> 170.922 zijn. Zo'n test blijft groen ook als er de helft verdwijnt.
>
> Ik heb er 93 opgespoord, gemeten wat het werkelijke aantal is, en ze veranderd in "precies dit getal".
> Daarna elk getal een omhoog gezet om te controleren dat de test dan echt stukloopt.
>
> Twee dingen kwamen daardoor bovendrijven: op de Harmony One heeft de schermhelderheidstabel 16 stapjes
> en op de Harmony 600 maar 14, en twee lijsten met testconfiguraties liepen uiteen.
>
> Dit was onderhoud, dus M2 staat waar het stond. Volgende stap: die 16 tegen 14 in de firmware
> natrekken, zodat het een verklaring krijgt in plaats van alleen een getal.

Bad, and every line of it is a real habit worth naming:

> Completed the exhaustive floor-to-exact conversion sweep across both language halves (93 sites, 52 TS
> + 41 PY), added ABoundOnACorpusTotalIsExact and APythonBoundOnACorpusTotalIsExact as static gates with
> allow-lists, and closed the EXPECTED population divergence per section 143. All controls bite. Coverage
> unchanged at 100.0%. Next: possibly investigate the parameter group 5/6 length delta on arch 12 vs 14.

It is not wrong, and it is unreadable for the person it is for. No example, no plan, jargon in every
clause, a bare architecture number, and a next step hedged with "possibly".

## Before sending

* Does it contain one concrete example with real numbers?
* Does it say where we are in the plan, checked against `docs/roadmap.md` rather than remembered?
* Is there exactly one next step, and would "doe maar" be a complete answer to it?
* Would somebody who has never opened this repository understand every sentence?
* Is every architecture number accompanied by the remote it means?
* Is the honest note there, if there is one to make?
