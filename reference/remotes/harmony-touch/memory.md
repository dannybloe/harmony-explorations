# Harmony Touch: memory

**No memory has been read off a Touch.** It has no address space a host can name: a host opens a path and
the remote decides what is behind it, section 198. What is known is which paths open, from nineteen probed
on one unit, sections 200 and 201.

## The paths that open

| path | stated size | what it is | standing and source |
|---|---|---|---|
| `/sys/sysinfo` | 234 bytes | fourteen lines of a name and a value: architecture, skin, firmware version and type, hardware version, the USB link, `ram_size`, status, feature, a serial | measured, sections 200 and 201. On the Harmony 300 and 350 the same path is generated on request rather than stored, section 199; on the Touch **not checked** |
| `/rf/deviceinfo` | 83 bytes | the word `Response`, a comma and a JSON object: a radio identity, a list of paired devices and their count | measured, section 201. A query answered when opened, not storage |
| `/tde/enable` | 1 byte | not read | measured, section 200 |
| `/fw/otaupdate`, `/ir/ir_cap`, `/sys/hlapi`, `/sys/time` | 0 bytes | not read | measured, section 200 |
| `/sys/factoryreset`, `/sys/reboot` | 0 bytes | **controls**: opening one is the action, which is why neither may be opened, `INERT_PATHS` | measured, section 200 |

**Two files on one remote are two formats**, lines of text and JSON, so a reader must not assume a shape,
and the field set of `/sys/sysinfo` differs from the Harmony 300 and 350's firmware's own list, section 200.

## The configuration is not a file

**`/cfg/usercfg` does not exist on a Touch**, nor do five other spellings tried, so the Harmony 300 and
350's configuration path does not transfer, measured, section 200. That fits Logitech's own template,
which carries the read of a user configuration commented out "for testing only", Logitech's client, section
198, and the provisioning route, by which the remote fetches its configuration itself, section 203.

The Harmony 300 and 350's file table, read out of their firmware, is that family's and does not transfer
either: this is a later generation, section 199.

## Not checked

* What `/tde/enable`, `/sys/hlapi` and `/sys/time` are.
* Where and in what form the remote keeps its configuration.
* The flash and RAM sizes.
