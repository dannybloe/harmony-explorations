# Predictions for a Harmony Elite remote, written before it was read

Written on 13 November 2026, before the remote of a Harmony Elite set was asked anything over USB, and committed
before the read. Its hub was read first, [harmony-hub.md](harmony-hub.md). The predictions come from the remotes'
firmware image, which Logitech's update service serves byte for byte to the Touch, Ultimate, Ultimate One,
Ultimate Home, Elite and 950, [the platform's firmware page](../../reference/architectures/harmony-touch/firmware.md),
and from the bench Harmony Touch, which runs that image. The outcomes go beside the predictions once it is read.

## Why the one read is safe

The remote runs the image whose native USB program was read for the Touch,
[the names](../../reference/architectures/harmony-touch/api/names.md): `/sys/sysinfo` is a read, built once at start,
with the shared open and close and no write slot. The read is `read-file-identity.ts` without `--record`: open,
read and close of `/sys/sysinfo`, nothing else. If the remote reports a firmware version other than the Touch's,
that holds only to the extent the build's table is the same, which is then a question to check before any further
name is opened.

## Predicted

| what | predicted | from |
|---|---|---|
| vendor | `0x046D` | the family |
| product id | not predicted exactly; one of the file based family's ids, `0xC12B` most likely, the Touch's and the Ultimate's | `FILE_BASED_PRODUCTS` |
| `bcdDevice` | `0x1111`, a leading 1 and skin 111 in decimal digits, as the Touch's `0x1099` and the hub's `0x1106` | the two read so far |
| `arch` | `0x11`, 17 | the remotes' image states 17 |
| `skin` | `0x6F`, 111 | Logitech's model `HarmonyElitePlus`, sold as the Harmony Elite |
| `fw_type` | `0x00` | a remote that enumerates with its product string |
| `fw_ver` | `4.15.330`, **if** it was updated while in use, as its hub was to the current hub image | the service's current remote image |
| `link_packet_length` | 64 | the Touch's and the hub's |
| `guid` | absent, as on the hub; the Touch's answer is the one to compare | |

## Outcomes

Not read yet.
