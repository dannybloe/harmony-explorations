# Design: a PIC18 emulator harness

**Status: design only, not built, and deferred by decision 5 in `docs/roadmap.md`.** Hardware in the
loop came first, on the argument that round trip equality, read back and diff, cross learning and live
RAM polling do most of what this was wanted for at a fraction of the build. This document said it was
"the next substantial piece of work"<!--superseded--> until 29 August 2026, which was true when it was
written and contradicted a numbered decision afterwards. What follows is the design and the one
the rest of the plan leans on. Written down first so it can be argued with before anyone
spends a week on it.

## Why this is worth building

Three problems in this project have the same shape, and one tool solves all of them.

**Decoding the config format is currently static reading.** You find a routine, work out
which bytes it consumes, and reason about what they mean. That works, but it is slow, and
the answer is an inference. Running the firmware instead lets you *observe* which config
bytes get read, in order, for a specific action. That converts an inference into a
measurement.

**There is no way to check a generated config short of flashing it.** These remotes cannot
be replaced. So the only current test of "did I build a
valid config" is an experiment on irreplaceable hardware. An emulator makes it an
automated test.

**Progress is hard to verify.** The findings here were produced by an AI and are published
as such, and the honest answer to "how do you know" is currently "read the reasoning". For
the infrared path specifically, an emulator gives a much better answer: feed it a config,
capture the pin, decode the waveform, compare against a known-good code for that device.

## Why architecture 14 is the right target

On arch 14 the config lives on an SPI flash that is **not** memory mapped, so every single
config byte the firmware reads passes through one function, the byte-read primitive at
`0x1B9AC`. Instrument that one place and you get a complete, ordered log of config access.

On arch 12 the config is memory mapped and read with ordinary loads scattered throughout
the image, so the same instrumentation would mean watching a whole address range and
reconstructing intent.

Use the Harmony 700 2.8 image. It is complete, whereas the 600 dump is truncated by
concordance and is missing its entry point.

## Scope: what needs implementing, and what does not

The instruction set is already decoded by `harmony.pic18.isa`, so the emulator reuses that
and does not need its own decoder. That is most of the tedious part already done.

Needed:

* **Core execution.** Program counter, W, STATUS with the C, DC, Z, OV and N flags, the
  hardware call stack with TOSU/TOSH/TOSL and STKPTR, and the 4 KiB data memory with BSR
  banking and the access bank split.
* **Indirect addressing.** FSR0/1/2 with INDF, POSTINC, POSTDEC, PREINC and PLUSW. The
  firmware leans on these heavily, so they are not optional.
* **`TBLPTR` and `TABLAT`.** Note the twist: on arch 14 `TBLPTR` is not used for real
  program memory reads at all. It is used as a 24-bit address counter for the SPI flash,
  with `TBLRD*+` executed purely because it increments `TBLPTR` in one instruction. The
  emulator must let that work while the actual data arrives over the SPI stub.
* **An SPI flash stub.** Serve bytes from a config dump. Implement the read command, the
  status register read (opcode `0x05`, with the write-in-progress bit clear), and the JEDEC
  ID. Erase and program can be accepted and logged rather than performed.
* **TMR0.** The infrared transmit loop is paced by TMR0 overflow, so timing is load bearing.
  A cycle counter driving TMR0 with its prescaler is enough.
* **Pin tracing.** At minimum PORTC bit 2, the infrared LED. Emit (cycle, level)
  transitions.

Deliberately out of scope until something needs them: USB, the LCD, the analogue to digital
converter, interrupt priority levels, and the extended instruction set. Every unimplemented
register access should **raise**, not return zero. A silently wrong emulator is worse than
one that stops and says what it hit.

## Instrumentation, which is the actual point

The emulator exists for its hooks more than its execution:

* **Config access log.** Every SPI byte served, with the flash address and the program
  counter that asked for it. This is the primary output. Grouped by the action that
  triggered it, it is a map of which config bytes matter for what.
* **Coverage.** Which instructions executed. Code that never runs for any input is either
  dead or reached only by a path not yet triggered, and both are useful to know.
* **Watchpoints.** Break or log on access to a data address, so
  `harmony.pic18.trace` findings can be confirmed dynamically rather than statically.
* **Waveform capture.** Pin transitions out, so an infrared decoder can turn them back into
  a protocol and a device code.

## Validation ladder

Do not trust the emulator until it has climbed this, because an emulator with a subtly wrong
flag is a machine for generating confident nonsense.

1. **The delay routine.** `0x10D00` is a computed jump into exactly 100 `NOP`s. Calling it
   with parameter `(101 - x) * 2` must burn exactly `x` cycles. This exercises `ADDWF PCL,W`,
   writes to PCL, and the cycle counter, and it has a known answer.
2. **The 16-bit divide at `0x1BAF6`.** Shift and subtract, so it exercises the carry flag
   hard. Feed it known operands and check the quotient.
3. **The infrared carrier.** Run the modulator with the parameters implied by 38 kHz and
   confirm the captured waveform has a 26.25 microsecond period. That number is already
   established by hand from the code's arithmetic, so it is a real check.
4. **A full transmit.** Play a complete infrared code from a real config dump and decode the
   captured waveform. If it comes back as a recognisable protocol matching the device the
   config is for, the emulator and the config understanding are both working.
5. **Boot.** Reach the main loop from the entry point without hitting an unimplemented
   register. This is the hardest step and the least necessary: steps 1 to 4 are worth having
   on their own.

## Choices worth arguing about

**Purpose-built rather than MPLAB X or gpsim.** MPLAB's simulator supports these parts and
is the obvious cross-check for step 1 and step 2, so it is worth using for exactly that. But
the value here is in the instrumentation, and driving someone else's simulator to log every
SPI transaction against the program counter is more work than writing the core. The
instruction set is already decoded, and the subset needed is small.

**Cycle counting, not cycle accuracy.** Most PIC18 instructions are one cycle, two for
anything that changes the program counter, and the delay routine's whole design assumes
this. Counting is enough for the infrared timing to come out right; a full pipeline model is
not needed.

**Python.** Fast enough. A full transmit is on the order of tens of millions of cycles, which
is seconds to low minutes in plain Python. If that becomes the bottleneck the inner loop can
be narrowed later, but do not start there.

## Suggested layout

```
src/harmony/pic18/emu.py        core: registers, memory, execute one instruction
src/harmony/pic18/peripherals.py  TMR0, ports, the MSSP
src/harmony/spiflash.py         the flash stub, backed by a config dump
src/harmony/irdecode.py         pin transitions back to a protocol
tests/test_emu.py               the validation ladder above
```

## Open questions

* Which reset and configuration state does the firmware assume on entry? Arch 14 is copied
  into internal flash by a bootloader we do not have, so whatever that bootloader sets up is
  unknown. Starting mid-firmware at a known routine, rather than at the entry point, avoids
  the question for steps 1 to 4.
* What is the actual clock? 4 MIPS is inferred from the infrared scaling arithmetic closing
  on 38 kHz, which is good evidence but indirect. A configuration word would settle it.
* The SPI flash command set is only partly identified: the read path, `0x05` status and
  `0xD8` block erase are confirmed. Anything else the firmware issues will surface as an
  unimplemented command, which is the right way to find out.
