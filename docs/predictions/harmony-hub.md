# Predictions for a Harmony Hub, written before it was read

Written on 13 November 2026, before the Harmony Hub of a Harmony Elite set was asked anything over USB, and
committed before the read so that what it confirms is worth something. The hub arrived in an unknown state. No
hub has been read here before; the predictions come from the hubs' production image 4.15.600 in the lab and from
the Harmony Touch, whose software the hub shares, [its firmware page](../../reference/architectures/harmony-touch/firmware.md).
The outcomes go beside the predictions once the hub is read, rather than over them.

## What was already seen before this was written

The hub was enumerated, which sends it nothing:

| | seen |
|---|---|
| vendor and product id | `0x046D:0xC129`, the id `packages/usb` already lists as a Harmony Hub in the file based family |
| `bcdDevice` | `0x1106`, read as the Touch's `0x1099` is read, a leading 1 and the skin in decimal digits: skin 106, one of the three the hubs' package names |
| product string | `Harmony Remote` |

## Why one read is safe, read in the hub's own program

The hub's native USB program was put back together from the hubs' image, decoded block by block as
`tests/harmony_touch/test_harmony_touch_architecture.py` decodes it: a big endian MIPS executable of 363640
bytes, its name table at `0x462610`, 59 entries of 56 bytes, the Touch's layout. In it `/sys/sysinfo` fills the
open, generate and close slots and no write slot, with the open and the close the ones `/sys/logread`,
`/rf/deviceinfo` and `/data/resource` share, so it is a read and its open is not a handler of its own. The two
acting kinds the Touch has are here too, under other names: `/sys/reboot` and `/sys/factoryreset` fill the write
slot alone, and `/tde/enable` and `/bt/dut` have an open handler of their own. None of `/sys/guid`, `/sys/pid`,
`/sys/sku`, `/sys/battery` or `/sys/flags0` is in the table. So the read is `read-file-identity.ts --product
0xc129` without `--record`: open `/sys/sysinfo`, read, close, and nothing else, no ping and no other name.

## `/sys/sysinfo`, predicted field by field

| field | predicted | from |
|---|---|---|
| `arch` | `0x11`, 17 | the hubs' image states 17, as the Touch's does |
| `skin` | `0x6A`, 106 | `bcdDevice` |
| `usb_vendor_id`, `usb_product_id` | `0x046D`, `0xC129` | enumeration |
| `fw_type` | `0x00`, a running application | the Touch's answer; a hub that enumerates with its product string is not in a recovery image |
| `fw_ver` | `4.15.` something, **if** the hub was updated by Logitech's service while it was in use | the service's current hub image is 4.15.600; a hub never updated is older, and that is not predicted |
| `link_packet_length` | 64 | the Touch's, and the HID report the transport already uses |
| `hw_ver`, `link_hw`, `link_type` | not predicted | |
| `guid` and the serial | present, never written here | they identify the unit |

## Outcomes

Read the same day, once, with `read-file-identity.ts --product 0xc129 --raw`: one open, one read and one close of
`/sys/sysinfo`, 273 bytes, and the hub answered normally. **Every prediction that named a value held**: `arch`
`0x11`, `skin` `0x6A`, `usb_vendor_id` `0x046D`, `usb_product_id` `0xC129`, `fw_type` `0x00`, `link_packet_length`
64, and `fw_ver` **4.15.600**, the service's current hub image, so this hub was updated while it was in use.

What was not predicted: the hub gives 15 fields, where the Touch gives fourteen. `hw_ver` is 01.00, `link_type` `hid` and
`link_hw` `usb`, as the Touch's. **There is no `guid` field**, so the one row that predicted a field's presence,
`guid`, was wrong; the serial is there. Four fields the Harmony 300 and 350's firmware does
not name: `status` `normal`, `ram_size` 64MB, `feature` `Infrared,BluetoothHid`, and a Bluetooth address, which
with `serial_number` identifies the unit and stays in the lab.
