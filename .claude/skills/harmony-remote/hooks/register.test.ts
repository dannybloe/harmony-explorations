import { expect, test } from 'claude-code/testing'

import { bandColour, configOf, usbState, writeLine, writeProgress } from './register'

const usb650 = '+-o Harmony Remote  <class IOUSBHostDevice>\n  "idProduct" = 49442\n  "idVendor" = 1133\n'
const hid650 = '+-o IOHIDInterface\n  "Product" = "Harmony Remote 0-0.2.0"\n  "VendorID" = 1133\n  "ProductID" = 49442\n'
const mouse = '+-o Mouse\n  "idProduct" = 49213\n  "idVendor" = 1133\n'

test('a Harmony 650 on USB with its HID interface up reads as ready', () => {
  expect(usbState(usb650 + mouse, hid650)).toBe('Harmony 600/650/700 on USB, ready')
})

test('on the bus without the HID interface reads as not answering, and a mouse is not a remote', () => {
  expect(usbState(usb650, '')).toBe('Harmony 600/650/700 on USB, not answering yet')
  expect(usbState(mouse, '')).toBe('no remote on USB')
})

const journal = [
  '# write-config.ts --config x.bin --dump h650_base --commit',
  'unit identity 7ad856f5..., which matches the recorded h650',
  '716166 byte(s) differ from h650_base, in 14 block(s): 0x30000, 0x60000',
  'erasing 0x30000', 'erased, and the block reads back as all ones',
  'erasing 0x60000', 'erased, and the block reads back as all ones',
].join('\n')

test('a running write shows its block count, and one that died shows where it stopped', () => {
  const w = writeProgress(journal)
  expect(writeLine(w, true)).toBe('h650: writing block 2 of 14')
  expect(writeLine(w, false)).toBe('h650: write STOPPED after 2 of 14 blocks, rerun it')
})

test('a finished write reads as done, and a dry run shows nothing', () => {
  const done = writeProgress(journal + '\nthe whole configuration reads back byte for byte identical to the file.\nthe restart is sent.')
  expect(writeLine(done, false)).toBe('h650: write done, verified, restarted')
  expect(writeLine(writeProgress(journal + '\ndry run: nothing was written.'), false)).toBe(undefined)
})

test('the configuration is found from the writer command line, relative to its working directory or not', () => {
  const run = 'node packages/corpus/bin/write-config.ts --config ../lab/work/x/650.bin --dump h650_base --commit'
  expect(configOf(run, '/bench/harmony-explorations')).toBe('/bench/harmony-explorations/../lab/work/x/650.bin')
  expect(configOf(run.replace('../lab', '/bench/lab'), '/elsewhere')).toBe('/bench/lab/work/x/650.bin')
  expect(configOf('node packages/corpus/bin/write-config.ts --help', '/bench')).toBe(undefined)
})

test('the band is blue on a light theme and the theme orange on a dark or automatic one', () => {
  expect(bandColour('light')).toBe('#1f5fbf')
  expect(bandColour('light-daltonized')).toBe('#1f5fbf')
  expect(bandColour('dark')).toBe('claude')
  expect(bandColour('auto')).toBe('claude')
})
