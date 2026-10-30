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
const theme = atom({ plugin: 'harmony-remote', key: 'theme' } as const, '')

// Blue on a light theme and the theme's own orange on a dark one. A theme of "auto" follows the
// terminal, which a plugin cannot see, so it gets the orange: the theme key resolves per theme and
// stays legible on both, where a fixed blue would not on a dark background.
export function bandColour(themeSetting: string): string {
  return themeSetting.startsWith('light') ? '#1f5fbf' : 'claude'
}

const POLL_MS = 3000
// A finished or stopped write stays on the line this many polls, two minutes, so it is seen after
// looking away.
const LINGER_POLLS = 40

// The bracket keeps a pattern from matching the shell that runs it: the shell's own command line
// holds `confi[g]`, which the expression does not match, where a plain `config` would make every
// poll find a writer.
const WRITER = 'corpus/bin/write-confi[g][.]ts'
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
  0xc111: 'Harmony 525',
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

/** The name to show for a Harmony's product id, and its bcdDevice where the product id is shared. */
export function modelName(product: number, bcdDevice: number): string {
  if (product === ESPRESSO) return ESPRESSO_SKINS[bcdDevice & 0xff] ?? MODELS[product]!
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

/** What the bus says: a Harmony on USB, whether its command interface is up, or one in recovery. */
export function usbState(usb: string, hid: string): string {
  const onBus = ioregBlocks(usb).map((p) =>
    [Number(p.get('idVendor')), Number(p.get('idProduct')), Number(p.get('bcdDevice'))] as const)
  if (onBus.some(([v, p]) => v === MICROCHIP && p === BOOTLOADER)) return 'a remote in recovery (bootloader)'
  const harmony = onBus.find(([v, p]) => isHarmony(v, p))
  if (harmony === undefined) return 'no remote on USB'
  const name = modelName(harmony[1], harmony[2])
  // The device can be on the bus while its HID interface is not up yet, or no longer: that is the
  // state in which every read here answers "no matching Harmony remote attached".
  const ready = ioregBlocks(hid).some((p) => isHarmony(Number(p.get('VendorID')), Number(p.get('ProductID'))))
  return ready ? `${name} on USB, ready` : `${name} on USB, not answering yet`
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

/** The status line for a write, given whether the writer is still running. */
export function writeLine(w: WriteProgress, isRunning: boolean): string | undefined {
  if (w.isDryRun) return undefined
  if (w.isDone) return `${w.unit}: write done, verified, restarted`
  if (w.isVerified) return `${w.unit}: written and verified, restarting`
  if (!isRunning) return `${w.unit}: write STOPPED after ${w.erased} of ${w.total} blocks, rerun it`
  if (w.total > 0 && w.erased === 0) return `${w.unit}: write starting, comparing ${w.total} blocks`
  if (w.erased >= w.total && w.total > 0) return `${w.unit}: reading the whole configuration back`
  return `${w.unit}: writing block ${w.erased} of ${w.total}`
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
  if (total === undefined || total === 0) return `Tests running${failed}`
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
    const testText = await read($, tests)
    if (e.props.hasSurvey || text === null) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    // A rule above the line, so it reads as a panel of its own rather than as the tail of whatever
    // notice the engine printed last. The rule is longer than any terminal and cut at the edge.
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text dimColor wrap="truncate">{'── Harmony remote ' + '─'.repeat(400)}</Text>
        <Box paddingLeft={2}>
          <Text color={bandColour(await read($, theme))} wrap="truncate-end">{text}</Text>
        </Box>
        {testText === null ? null : (
          <Box paddingLeft={2}>
            <Text color={bandColour(await read($, theme))} bold={/FAILED/.test(testText)} wrap="truncate-end">{testText}</Text>
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
    let journal: string | undefined
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
        let output = ''
        if (file.startsWith('/')) { try { output = await $.fs.read(file) } catch { /* not readable */ } }
        text = testLine(testCounts(output), (await totals())[run.label], true)
      } else if (run !== undefined) {
        runEndedPolls += 1
        let output = ''
        if (run.file.startsWith('/')) { try { output = await $.fs.read(run.file) } catch { /* gone */ } }
        const counts = testCounts(output)
        if (runEndedPolls === 1 && counts.done > 0) {
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
          sh(`pid=$(pgrep -f '${WRITER}' | head -1); [ -n "$pid" ] && {`
            + ` lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p'; ps -ww -o args= -p "$pid"; }`),
          sh(`pgrep -f '${READER}' >/dev/null && echo yes`),
        ])
        const parts = [usbState(usb, hid)]
        const [cwd, args] = writer.trim().split('\n')
        const config = cwd !== undefined && args !== undefined ? configOf(args, cwd) : undefined
        const isWriting = config !== undefined
        if (config !== undefined) {
          const newest = (await sh(`ls -t ${quote(config)}.write-*.log 2>/dev/null | head -1`)).trim()
          if (newest !== '') journal = newest
          stoppedPolls = 0
        } else {
          stoppedPolls += 1
        }
        if (journal !== undefined && (isWriting || stoppedPolls <= LINGER_POLLS)) {
          let text = ''
          try { text = await $.fs.read(journal) } catch { /* moved or deleted: show nothing */ }
          const line = text === '' ? undefined : writeLine(writeProgress(text), isWriting)
          if (line !== undefined) parts.push(line)
        }
        if (reader.trim() === 'yes') parts.push('reading flash')
        await pollTests()
        const text = parts.join('  |  ')
        if (text !== last) {
          // A toast on the two moments worth looking up for, once each.
          if (/write done/.test(text) && !/write done/.test(last ?? '')) $.ui.toast('Harmony write done and verified')
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
    return next(e)
  })
}
