import type { Register } from 'claude-code'

// One status line for the bench: whether a Harmony remote is on USB and ready, and how far a
// configuration write to it has got. Everything here is read only: it asks the operating system what
// is attached (ioreg, enumeration, never an open) and reads the journal the config writer appends to
// beside the configuration it writes, so it can never touch a remote itself.
//
// It needs no lab path. The writer names its journal `<config>.write-<time>.log`, so the running
// writer's own command line and working directory say where the journal is. Once the writer has
// exited the journal is remembered from the last poll that saw it, which is what keeps "done" and
// "stopped" on the line after the process is gone.

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
  0xc121: 'Harmony One',
  0xc122: 'Harmony 600/650/700',
  0xc124: 'Harmony 300/350',
  0xc12b: 'Harmony Touch',
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
  const onBus = ioregBlocks(usb).map((p) => [Number(p.get('idVendor')), Number(p.get('idProduct'))] as const)
  if (onBus.some(([v, p]) => v === MICROCHIP && p === BOOTLOADER)) return 'a remote in recovery (bootloader)'
  const harmony = onBus.find(([v, p]) => isHarmony(v, p))
  if (harmony === undefined) return 'no remote on USB'
  const name = MODELS[harmony[1]] ?? `Harmony 0x${harmony[1].toString(16)}`
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

const quote = (s: string): string => `'${s.replace(/'/g, `'\\''`)}'`

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
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
        const text = parts.join('  |  ')
        if (text !== last) {
          // A toast on the two moments worth looking up for, once each.
          if (/write done/.test(text) && !/write done/.test(last ?? '')) $.ui.toast('Harmony write done and verified')
          if (/STOPPED/.test(text) && !/STOPPED/.test(last ?? '')) $.ui.toast('Harmony write stopped before it finished')
          last = text
          $.ui.status(text)
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
