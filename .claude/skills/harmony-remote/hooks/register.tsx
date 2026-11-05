import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// One line for the bench, drawn in the band above the prompt: whether a Harmony remote is on USB and ready, and how far a
// configuration write to it has got. Everything here is read only: it asks the operating system what
// is attached (ioreg, enumeration, never an open) and reads the journal the config writer appends to
// beside the configuration it writes, so it can never touch a remote itself.
//
// It needs no lab path. The writer names its journal `<config>.write-<time>.log`, so the running
// writer's own command line and working directory say where the journal is. Once the writer has
// exited the journal is remembered from the last poll that saw it, which is what keeps "done" and
// "stopped" on the line after the process is gone.

// Drawn in the band above the prompt rather than on the status line, because the status line takes
// text only and its colour is the engine's, which reads poorly on a light theme.
const line = atom({ plugin: 'harmony-remote', key: 'line' } as const, null)
// A second line while a test suite runs, and for a while after it ends: what runs, a bar, the counts.
const tests = atom({ plugin: 'harmony-remote', key: 'tests' } as const, null)
// The frame of the bouncing block, advanced on its own faster clock while a run with no total shows.
const tick = atom({ plugin: 'harmony-remote', key: 'tick' } as const, 0)
const theme = atom({ plugin: 'harmony-remote', key: 'theme' } as const, '')

// Blue on a light theme and the theme's own orange on a dark one. A theme of "auto" follows the
// terminal, which a plugin cannot see, so it gets the orange: the theme key resolves per theme and
// stays legible on both, where a fixed blue would not on a dark background.
export function bandColour(themeSetting: string): string {
  return themeSetting.startsWith('light') ? '#1f5fbf' : 'claude'
}

const POLL_MS = 3000
const BOUNCE_MS = 150
// A finished or stopped write stays on the line this many polls, two minutes, so it is seen after
// looking away.
const LINGER_POLLS = 40

// The bracket keeps a pattern from matching the shell that runs it: the shell's own command line
// holds `confi[g]`, which the expression does not match, where a plain `config` would make every
// poll find a writer.
const WRITER = '(corpus/bin/write-confi[g]|usb/bin/write-file-confi[g])[.]ts'
// The Harmony 300 and 350's writer, which keeps no journal: its own output is what is read.
const FILE_WRITER = /usb\/bin\/write-file-config[.]ts/
const READER = 'corpus/bin/read-(regio[n]|confi[g])[.]ts'

// Logitech's Harmony product range and Microchip's bootloader identity, which is what a Harmony in
// recovery enumerates as (harmony-explorations packages/usb/src/transport.ts).
const LOGITECH = 1133
const FIRST = 0xc110
const LAST = 0xc14f
const MICROCHIP = 0x04d8
const BOOTLOADER = 0x000b
const MODELS: Record<number, string> = {
  0xc110: 'Harmony 880/885',
  0xc111: 'Harmony 5xx',
  0xc121: 'Harmony One',
  0xc122: 'Harmony 600/650/700',
  0xc124: 'Harmony 300/350',
  0xc12b: 'Harmony Touch',
}

// The Harmony 880 family shares one product id, so the model is the skin, which the low byte of
// bcdDevice carries in plain binary on this platform (harmony-explorations reference/architectures/
// harmony-880-885/usb.md): 0x0811 is skin 17, a Harmony 885.
const ESPRESSO = 0xc110
const ESPRESSO_SKINS: Record<number, string> = {
  15: 'Harmony 880',
  17: 'Harmony 885',
  39: 'Harmony 880 Pro',
  44: 'Harmony 720',
  45: 'Harmony 785',
}

// The Harmony 525 family shares one product id too, and carries its skin the same way, in the low
// byte of bcdDevice in plain binary (harmony-explorations reference/architectures/harmony-5xx/usb.md):
// 0x0916 is skin 22, a Harmony 525, and 0x0943 is skin 67, a Harmony 515. Naming the product id alone
// showed a 515 as a 525 on the cable.
const MOCHA = 0xc111
const MOCHA_SKINS: Record<number, string> = {
  18: 'Harmony 520',
  22: 'Harmony 525',
  36: 'Harmony Xbox 360',
  41: 'Harmony 550',
  48: 'Harmony 555',
  67: 'Harmony 515',
  68: 'Harmony 510',
}

/** The name to show for a Harmony's product id, and its bcdDevice where the product id is shared. */
export function modelName(product: number, bcdDevice: number): string {
  if (product === ESPRESSO) return ESPRESSO_SKINS[bcdDevice & 0xff] ?? MODELS[product]!
  if (product === MOCHA) return MOCHA_SKINS[bcdDevice & 0xff] ?? MODELS[product]!
  return MODELS[product] ?? `Harmony 0x${product.toString(16)}`
}

/** The numeric properties of each device block in an ioreg listing. */
export function ioregBlocks(text: string): Map<string, string>[] {
  return text.split('+-o ').slice(1).map((block) => {
    const props = new Map<string, string>()
    for (const m of block.matchAll(/"([A-Za-z ]+)" = ("[^"]*"|\d+)/g)) {
      if (!props.has(m[1]!)) props.set(m[1]!, m[2]!.replace(/^"|"$/g, ''))
    }
    return props
  })
}

const isHarmony = (vendor: number, product: number): boolean =>
  vendor === LOGITECH && product >= FIRST && product <= LAST

/** One remote on the bus: its product id (0 for one in recovery) and the line that says what it is. */
export type Remote = { product: number; text: string }

/**
 * What the bus says, one entry per Harmony on it: each remote by name and whether its command interface
 * is up, or one in recovery. Every remote gets its own line, since two can be on the cable at once (a
 * Harmony Touch beside a Harmony 885, say), and showing the first one found hid the other.
 */
export function usbRemotes(usb: string, hid: string): Remote[] {
  const onBus = ioregBlocks(usb).map((p) =>
    [Number(p.get('idVendor')), Number(p.get('idProduct')), Number(p.get('bcdDevice'))] as const)
  const remotes: Remote[] = []
  if (onBus.some(([v, p]) => v === MICROCHIP && p === BOOTLOADER)) remotes.push({ product: 0, text: 'a remote in recovery (bootloader)' })
  // The device can be on the bus while its HID interface is not up yet, or no longer: that is the
  // state in which every read here answers "no matching Harmony remote attached". The interfaces are
  // matched to devices by product id, and where two remotes share one, as two Harmony 885s do, by how
  // many interfaces of that id are up.
  const interfaces = new Map<number, number>()
  for (const p of ioregBlocks(hid)) {
    const product = Number(p.get('ProductID'))
    if (isHarmony(Number(p.get('VendorID')), product)) interfaces.set(product, (interfaces.get(product) ?? 0) + 1)
  }
  const seen = new Map<number, number>()
  for (const [vendor, product, bcd] of onBus) {
    if (!isHarmony(vendor, product)) continue
    const nth = (seen.get(product) ?? 0) + 1
    seen.set(product, nth)
    const ready = nth <= (interfaces.get(product) ?? 0)
    remotes.push({ product, text: `${modelName(product, bcd)} on USB, ${ready ? 'ready' : 'not answering yet'}` })
  }
  return remotes
}

/** The bus's lines alone, `no remote on USB` when there is none. */
export function usbStates(usb: string, hid: string): string[] {
  const remotes = usbRemotes(usb, hid).map((r) => r.text)
  return remotes.length === 0 ? ['no remote on USB'] : remotes
}

// The lab's unit records, `units/<label>.txt`, by the product id their remote enumerates with, so a
// write that names its unit can be drawn under the remote it goes to. The longest prefix wins.
const UNIT_PRODUCTS: [string, number][] = [
  ['one_', 0xc121], ['h600', 0xc122], ['h650', 0xc122], ['h700', 0xc122], ['h515', 0xc111], ['h525', 0xc111],
  ['h300', 0xc124], ['h350', 0xc124], ['h880', 0xc110], ['h885', 0xc110], ['touch', 0xc12b],
]

/** The product id a unit record's remote enumerates with, or undefined for a label nobody listed. */
export function productOfUnit(unit: string): number | undefined {
  return UNIT_PRODUCTS.find(([prefix]) => unit.startsWith(prefix))?.[1]
}

/** Something under way: a write or a read, and the product id of the remote it is for when that is known. */
export type Activity = { product?: number; text: string }

/** Where a sub line starts, so the drawing can tell it from a remote's own line. */
export const UNDER = '  ↳ '

/**
 * The band's rows: each remote, with what is under way on it beneath it, and anything that names no
 * remote on the bus last, a write whose remote has dropped off the cable among them. An activity goes
 * under the first remote of its product id; two remotes sharing one cannot be told apart by the bus.
 */
export function bandRows(remotes: Remote[], activities: Activity[]): string[] {
  const rows: string[] = []
  const placed = new Set<Activity>()
  for (const remote of remotes) {
    rows.push(remote.text)
    for (const a of activities) {
      if (placed.has(a) || a.product === undefined || a.product !== remote.product) continue
      rows.push(UNDER + a.text)
      placed.add(a)
    }
  }
  if (remotes.length === 0) rows.push('no remote on USB')
  for (const a of activities) if (!placed.has(a)) rows.push(a.text)
  return rows
}

export type WriteProgress = {
  unit: string
  total: number
  erased: number
  isDryRun: boolean
  isVerified: boolean
  isDone: boolean
}

/** How far a config write's journal says it got. */
export function writeProgress(journal: string): WriteProgress {
  return {
    unit: /matches the recorded (\S+)/.exec(journal)?.[1] ?? 'remote',
    total: Number(/in (\d+) block\(s\)/.exec(journal)?.[1] ?? 0),
    erased: (journal.match(/^erasing 0x/gm) ?? []).length,
    isDryRun: /^dry run:/m.test(journal),
    isVerified: /reads back byte for byte identical/.test(journal),
    isDone: /the restart is sent/.test(journal),
  }
}

/** The status line for a write, given whether the writer is still running: a bar while blocks go. */
export function writeLine(w: WriteProgress, isRunning: boolean): string | undefined {
  if (w.isDryRun) return undefined
  if (w.isDone) return `Write to ${w.unit} done, verified, restarted`
  if (w.isVerified) return `Write to ${w.unit} verified, restarting`
  if (!isRunning) return `Write to ${w.unit} STOPPED after ${w.erased} of ${w.total} blocks, rerun it`
  if (w.total > 0 && w.erased === 0) return `Writing to ${w.unit}: comparing ${w.total} blocks`
  if (w.erased >= w.total && w.total > 0) return `Writing to ${w.unit}: [${bar(1)}] reading it all back`
  const share = w.total === 0 ? 0 : (w.erased - 1) / w.total
  return `Writing to ${w.unit}: [${bar(share)}] ${Math.floor(share * 100)}%`
}

/**
 * The Harmony 300 and 350 writer's line, from its own output: a chunk at a time while it writes, then
 * the check and the read back. The open erases the remote's configuration, so a run that stops after
 * it says so, and one that stops before it, a refusal included, says nothing was erased.
 */
/** The unit record the Harmony 300 and 350 writer names in its first line. */
export function fileWriteUnit(output: string): string | undefined {
  return /unit record (\S+?):/.exec(output)?.[1]
}

export function fileWriteLine(output: string, isRunning: boolean): string | undefined {
  if (/^read only:/m.test(output)) return undefined
  const model = /^(Harmony \w+), unit record/m.exec(output)?.[1] ?? 'the remote'
  const chunks = [...output.matchAll(/^chunk (\d+) of (\d+)/gm)]
  const last = chunks[chunks.length - 1]
  const opened = /^opened: /m.test(output)
  if (/^verified: /m.test(output)) return `Write to the ${model} done, verified, restarted`
  if (!isRunning) {
    if (!opened) return `Write to the ${model} did not start, nothing was erased`
    const at = last === undefined ? '' : ` after chunk ${last[1]} of ${last[2]}`
    return `Write to the ${model} STOPPED${at}: its configuration is erased until a write completes`
  }
  if (!opened) return `Writing to the ${model}: checking the unit`
  if (last === undefined) return `Writing to the ${model}: [${bar(0)}] 0%`
  const share = Number(last[1]) / Number(last[2])
  if (share >= 1) return `Writing to the ${model}: [${bar(1)}] checking and reading back`
  return `Writing to the ${model}: [${bar(share)}] ${Math.floor(share * 100)}%`
}

/**
 * The configuration a writer was started on, as an absolute path, from its command line and its
 * working directory, or undefined when the command line names none.
 */
export function configOf(args: string, cwd: string): string | undefined {
  const config = /--config[ =](\S+)/.exec(args)?.[1]
  if (config === undefined) return undefined
  return config.startsWith('/') ? config : `${cwd.replace(/\/$/, '')}/${config}`
}

// A test run of this repository: make's test targets, pnpm's test script, Python's unittest and Node's
// own runner. The brackets keep the pattern from matching the shell that runs pgrep, as above.
const TESTS = 'mak[e]( -[^ ]+)* (all|test|ts-test|ts|test-nolab)( |$)|pnp[m]( [^ ]+)* test|-m unittes[t]|nod[e]( [^ ]+)* --tes[t]'

/**
 * How many tests a run's output says have finished, and how many failed. The measure is whatever the
 * two runners print as they go: a Python progress character per test (`.`, `s`, `F`, `E`, `x`, `u`) and
 * a Node result line per test or suite (`✔`, `✖`, `﹣`). Node's suites are counted with their tests, so
 * the number is not a test count; it is compared only with the same measure of an earlier run of the
 * same command, which is what the bar's total is.
 */
export function testCounts(output: string): { done: number; failed: number } {
  let done = 0
  let failed = 0
  // Node repeats every failure in a summary at the end, which is not another test.
  let inSummary = false
  for (const raw of output.split('\n')) {
    const text = raw.replace(/\x1b\[[0-9;]*m/g, '')
    if (/^✖ failing tests:/.test(text)) { inSummary = true; continue }
    const node = /^(\s*)([✔✖﹣]) /.exec(text)
    if (node !== null) {
      if (inSummary) continue
      done += 1
      // A failing test fails its suite too, so only the outermost line is counted as a failure.
      if (node[2] === '✖' && node[1] === '') failed += 1
      continue
    }
    // Python's progress characters stream on one line, which a parallel make can break with other
    // output; a run of at least three not followed by a letter is never a word.
    const python = /^([.sFExu]{3,}|[.sFExu]+$)(?![A-Za-z:])/.exec(text)
    if (python !== null) {
      done += python[1]!.length
      failed += (python[1]!.match(/[FE]/g) ?? []).length
    }
  }
  return { done, failed }
}

/**
 * Whether an output is a whole run rather than a filtered one, so its count can be the next run's
 * total. Both runners state their own count at the end, Python `Ran N tests` and Node `ℹ tests N`, and
 * an unfiltered output holds at least that many results; one piped through `tail` or `grep` holds the
 * statement without the results, and one cut short holds no statement.
 */
export function isWholeRun(output: string, done: number): boolean {
  const text = output.replace(/\x1b\[[0-9;]*m/g, '')
  let stated = 0
  for (const m of text.matchAll(/^(?:Ran (\d+) tests?\b|ℹ tests (\d+))/gm)) stated += Number(m[1] ?? m[2])
  return stated > 0 && done >= stated
}

/** A run's command line, short: the program's own name and its arguments, cut at 40 characters. */
export function testLabel(args: string): string {
  const words = args.trim().split(/\s+/)
  words[0] = words[0]!.replace(/^.*\//, '')
  const label = words.join(' ')
  return label.length > 40 ? `${label.slice(0, 39)}…` : label
}

/** A bar of `width` cells, filled to `share`, which is clamped to between zero and one. */
export function bar(share: number, width = 20): string {
  const filled = Math.round(Math.max(0, Math.min(1, share)) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

/** Where the bouncing block goes in a line; the drawing puts the current frame there. */
export const BOUNCE = '{bounce}'

/**
 * A block of `size` cells going to and fro across `width`, for a run whose length is not known yet:
 * movement says it is alive, where a bar would claim a share nobody measured.
 */
export function bounce(frame: number, width = 20, size = 4): string {
  const span = width - size
  const at = span - Math.abs((frame % (2 * span)) - span)
  return '░'.repeat(at) + '█'.repeat(size) + '░'.repeat(span - at)
}

/**
 * The band's test line, kept short: whether tests run, a bar, and a failure count only when there is
 * one. `total` is the same measure at the end of the last run of this command, or undefined the first
 * time, when there is nothing to fill a bar against; a run that goes past it holds at 99 percent
 * rather than claiming done.
 */
export function testLine(counts: { done: number; failed: number }, total: number | undefined,
  isRunning: boolean): string {
  const failed = counts.failed === 0 ? '' : `, ${counts.failed} FAILED`
  if (!isRunning) return `Tests done${failed}`
  if (total === undefined || total === 0) return `Tests running: [${BOUNCE}] ${counts.done} done${failed}`
  const share = Math.min(counts.done / total, 0.99)
  return `Tests running: [${bar(share)}] ${Math.floor(share * 100)}%${failed}`
}

const quote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`

export const register: Register = (on) => {
  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    await update($, theme, () => String(e.value))
    return result
  // Not a guard: the setting has changed before this hook does anything, so a failure here only
  // leaves the band in the old colour, and the change itself must go through either way.
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const text = await read($, line)
    const raw = await read($, tests)
    const testText = raw === null ? null : raw.replace(BOUNCE, bounce(await read($, tick)))
    if (e.props.hasSurvey || text === null) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    const colour = bandColour(await read($, theme))
    // A rule above the line, so it reads as a panel of its own rather than as the tail of whatever
    // notice the engine printed last. The rule is longer than any terminal and cut at the edge.
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor wrap="truncate">{'── Harmony remotes ' + '─'.repeat(400)}</Text>
        {text.split('\n').map((row) => (
          <Box paddingLeft={row.startsWith(UNDER) ? 4 : 2}>
            <Text color={colour} bold={/STOPPED/.test(row)} dimColor={!row.startsWith(UNDER) && /not answering/.test(row)} wrap="truncate-end">{row.startsWith(UNDER) ? '↳ ' + row.slice(UNDER.length) : row}</Text>
          </Box>
        ))}
        {testText === null ? null : (
          <Box paddingLeft={2}>
            <Text color={colour} bold={/FAILED/.test(testText)} wrap="truncate-end">{testText}</Text>
          </Box>
        )}
      </Box>
    )
  })

  on('session.start', async ($, e, next) => {
    try {
      const row = (await $.config.list()).find((r) => r.key === 'theme')
      await update($, theme, () => String(row?.value ?? ''))
    } catch { /* no theme row: the band uses the orange */ }
    let last: string | undefined
    let busy = false
    // The journal of the most recent write seen running, and how many polls ago it stopped.
    let journal: { kind: 'journal' | 'output'; path: string } | undefined
    let stoppedPolls = 0

    const sh = async (script: string): Promise<string> => {
      try {
        const r = await $.process.run(['/bin/sh', '-c', script], { timeoutMs: 10_000 })
        return r.stdout
      } catch {
        return ''
      }
    }

    // The test run being followed: its label, its output file, and how many polls since it ended.
    let run: { label: string; file: string; elapsed: string } | undefined
    let runEndedPolls = 0
    let lastTests: string | null = null

    // Each command's count at the end of its last run, in a file rather than the mod's own store so a
    // total can be seeded from a run the mod did not watch, in another session or before it loaded.
    const totalsFile = `${(await sh('printf %s "$HOME"')).trim()}/.claude/harmony-remote/test-totals.json`
    const totals = async (): Promise<Record<string, number>> => {
      try { return JSON.parse(await $.fs.read(totalsFile)) as Record<string, number> } catch { return {} }
    }

    // Through the shell rather than `$.fs`, which recorded nothing from the output file Claude Code writes
    // in the system's temporary folder, why not measured; and only an ordinary file, since a terminal
    // would block.
    const readOutput = (file: string): Promise<string> =>
      file.startsWith('/') ? sh(`[ -f ${quote(file)} ] && cat ${quote(file)}`) : Promise.resolve('')

    const pollTests = async (): Promise<void> => {
      // The outermost test process, the one whose parent is not a test process too, and its parent's
      // standard output, which is where the shell that started it writes: a file when Claude Code runs
      // it, foreground or background, and a terminal when somebody types it, which has nothing to read.
      // A shell is never the run, even when its command line names one: the shell Claude Code wraps a
      // command in carries the whole command as text. Dropping shells also makes the run's own parent,
      // that shell, the place its output is read from.
      const found = (await sh(`pids=; for p in $(pgrep -f '${TESTS}'); do case "$(ps -o comm= -p "$p")" in`
        + ` *sh) ;; *) pids="$pids $p" ;; esac; done; for p in $pids; do`
        + ` pp=$(ps -o ppid= -p "$p" | tr -d ' '); case " $(echo $pids) " in *" $pp "*) ;; *)`
        + ` f=$(lsof -a -p "$pp" -d 1 -Fn 2>/dev/null | sed -n 's/^n//p' | head -1);`
        + ` printf '%s\\t%s\\t%s\\n' "$(ps -o etime= -p "$p" | tr -d ' ')" "$f" "$(ps -ww -o args= -p "$p")"; break;; esac; done`)).trim()
      let text: string | null = null
      if (found !== '') {
        const [elapsed = '', file = '', args = ''] = found.split('\t')
        run = { label: testLabel(args), file, elapsed }
        runEndedPolls = 0
        const output = await readOutput(file)
        text = testLine(testCounts(output), (await totals())[run.label], true)
      } else if (run !== undefined) {
        runEndedPolls += 1
        const output = await readOutput(run.file)
        const counts = testCounts(output)
        if (runEndedPolls === 1 && isWholeRun(output, counts.done)) {
          // The finished run's count is the next run's total, kept across sessions.
          const all = await totals()
          all[run.label] = counts.done
          try {
            await sh(`mkdir -p ${quote(totalsFile.replace(/\/[^/]*$/, ''))}`)
            await $.fs.write(totalsFile, `${JSON.stringify(all, null, 2)}\n`)
          } catch { /* the bar stays without a total */ }
          if (counts.failed > 0) $.ui.toast(`${run.label}: ${counts.failed} failed`)
        }
        if (runEndedPolls <= LINGER_POLLS) text = testLine(counts, undefined, false)
        else run = undefined
      }
      if (text !== lastTests) {
        lastTests = text
        await update($, tests, () => text)
      }
    }

    const poll = async (): Promise<void> => {
      if (busy) return
      busy = true
      try {
        const [usb, hid, writer, reader] = await Promise.all([
          sh('ioreg -rc IOUSBHostDevice -w0'),
          sh('ioreg -rc IOHIDInterface -w0'),
          // The running writer's working directory on the first line and its command line on the
          // second, or nothing when no write is running.
          // The running writer's working directory, its command line and the file its shell writes its
          // output to, one per line, or nothing when no write is running. A shell is never the writer,
          // though the one Claude Code wraps a command in carries the command as text.
          sh(`for p in $(pgrep -f '${WRITER}'); do case "$(ps -o comm= -p "$p")" in *sh) continue ;; esac;`
            + ` lsof -a -p "$p" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1; ps -ww -o args= -p "$p";`
            + ` pp=$(ps -o ppid= -p "$p" | tr -d ' '); lsof -a -p "$pp" -d 1 -Fn 2>/dev/null | sed -n 's/^n//p' | head -1;`
            + ` break; done`),
          sh(`pgrep -f '${READER}' >/dev/null && echo yes`),
        ])
        const remotes = usbRemotes(usb, hid)
        const activities: Activity[] = []
        const [cwd, args, output] = writer.trim().split('\n')
        const config = cwd !== undefined && args !== undefined ? configOf(args, cwd) : undefined
        const isWriting = config !== undefined
        if (config !== undefined) {
          if (FILE_WRITER.test(args!)) {
            if (output !== undefined && output.startsWith('/')) journal = { kind: 'output', path: output }
          } else {
            const newest = (await sh(`ls -t ${quote(config)}.write-*.log 2>/dev/null | head -1`)).trim()
            if (newest !== '') journal = { kind: 'journal', path: newest }
          }
          stoppedPolls = 0
        } else {
          stoppedPolls += 1
        }
        if (journal !== undefined && (isWriting || stoppedPolls <= LINGER_POLLS)) {
          const text = await readOutput(journal.path)
          const line = text === '' ? undefined
            : journal.kind === 'output' ? fileWriteLine(text, isWriting) : writeLine(writeProgress(text), isWriting)
          const unit = text === '' ? undefined
            : journal.kind === 'output' ? fileWriteUnit(text) : writeProgress(text).unit
          if (line !== undefined) activities.push({ product: unit === undefined ? undefined : productOfUnit(unit), text: line })
        }
        // The reader names no unit, so it goes under the one remote that can be read this way when only
        // one is on the cable, and on a line of its own otherwise.
        if (reader.trim() === 'yes') {
          const readable = remotes.filter((r) => r.product !== 0xc12b && r.product !== 0xc124 && r.product !== 0)
          activities.push({ product: readable.length === 1 ? readable[0]!.product : undefined, text: 'reading flash' })
        }
        await pollTests()
        // One line per remote, with what is under way on it beneath it.
        const text = bandRows(remotes, activities).join('\n')
        if (text !== last) {
          // A toast on the two moments worth looking up for, once each.
          if (/done, verified/.test(text) && !/done, verified/.test(last ?? '')) $.ui.toast('Harmony write done and verified')
          if (/STOPPED/.test(text) && !/STOPPED/.test(last ?? '')) $.ui.toast('Harmony write stopped before it finished')
          last = text
          await update($, line, () => text)
        }
      } finally {
        busy = false
      }
    }

    await poll()
    $.clock.every(POLL_MS, () => { void poll() })
    // Only while the line has a block to move, so an idle band is never redrawn for nothing.
    $.clock.every(BOUNCE_MS, () => {
      if (lastTests?.includes(BOUNCE)) void update($, tick, (n) => n + 1)
    })
    return next(e)
  })
}
