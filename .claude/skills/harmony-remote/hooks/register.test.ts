import { expect, test } from 'claude-code/testing'

import { bandColour, bar, configOf, modelName, testCounts, testLabel, testLine, usbState, writeLine, writeProgress } from './register'

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

const usb885 = '+-o Harmony Remote 0-4.4.2  <class IOUSBHostDevice>\n  "idProduct" = 49424\n  "bcdDevice" = 2065\n  "idVendor" = 1133\n'
const hid885 = '+-o IOHIDInterface\n  "Product" = "Harmony Remote 0-4.4.2"\n  "VendorID" = 1133\n  "ProductID" = 49424\n'

test('a remote on the 880 platform is named by the skin in its bcdDevice, not by its product id', () => {
  expect(usbState(usb885, hid885)).toBe('Harmony 885 on USB, ready')
  expect(modelName(0xc110, 0x080f)).toBe('Harmony 880')
  // A skin nobody has listed still names the family rather than a bare product id.
  expect(modelName(0xc110, 0x0899)).toBe('Harmony 880/885')
  expect(modelName(0xc121, 0)).toBe('Harmony One')
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

test('a run counts Python progress characters and Node result lines, and its failures once each', () => {
  const output = [
    '> node --test',
    '✔ a passing test (1.2ms)',
    '✖ a failing suite (3ms)',
    '  ✖ the failing test in it (1ms)',
    '﹣ a skipped test # SKIP',
    '..F..s.E',
    '----------------------------------------------------------------------',
    'Ran 8 tests in 0.1s',
    'FAILED (failures=1, errors=1)',
    '✖ failing tests:',
    '✖ a failing suite (3ms)',
  ].join('\n')
  expect(testCounts(output)).toEqual({ done: 4 + 8, failed: 1 + 2 })
})

test('a word that starts with a progress character is not progress', () => {
  expect(testCounts('ERROR: test_x\nFAIL: test_y\nsee .mcp.json\n...\n')).toEqual({ done: 3, failed: 0 })
})

test('a running suite shows a bar against the last run, and never claims done while it runs', () => {
  expect(bar(0.5, 10)).toBe('█████░░░░░')
  expect(testLine({ done: 20, failed: 0 }, 100, true)).toBe('Tests running: [████░░░░░░░░░░░░░░░░] 20%')
  expect(testLine({ done: 120, failed: 2 }, 100, true)).toBe('Tests running: [████████████████████] 99%, 2 FAILED')
  expect(testLine({ done: 7, failed: 0 }, undefined, true)).toBe('Tests running')
  expect(testLine({ done: 7, failed: 0 }, undefined, false)).toBe('Tests done')
  expect(testLine({ done: 7, failed: 1 }, undefined, false)).toBe('Tests done, 1 FAILED')
})

test('a label is the program name and its arguments', () => {
  expect(testLabel('/opt/homebrew/bin/python3 -m unittest discover -s tests')).toBe('python3 -m unittest discover -s tests')
  expect(testLabel('make all')).toBe('make all')
})
