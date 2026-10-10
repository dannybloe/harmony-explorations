# Harmony Touch: firmware

| | value | standing and source |
|---|---|---|
| version | **4.15.330** | measured, the `fw_ver` field of `/sys/sysinfo`, section 200; it is exactly the production build Logitech's update service serves for skin 99, fetched before the remote was read, section 196 |
| `fw_type` | `0x00`, running normally | measured, section 200 |
| the image | `skin99-touch-production-4.15.330.hfw2`, 13041774 bytes, an ARM image with a squashfs root | Logitech's service, `reference/checksums.md` |
| one image for a family | byte identical to the image served for skin 112, the Harmony 950, and covering the Ultimate, Ultimate One, Ultimate Home and Elite | Logitech's service, measured by digest, section 196 and `reference/checksums.md` |
| a preview build | 4.15.250, on the service's preview channel | Logitech's service, section 196 |
| a factory image | published on Logitech's content network with no key, for skin 99 and skin 106 only | Logitech's service, section 196 and `reference/checksums.md` |
| the package's checksum descriptor | `MD5`, where the Harmony 300 and 350's package states section 41's XOR | Logitech's service, section 198 |

**Nothing here reads the image.** It is in the lab and never in this repository, and none of its contents
has been examined, `reference/checksums.md`.

## Reset and recovery

* **Factory reset**: Logitech's hidden recovery tool, reached in the MyHarmony clients by a key combination,
  installs a whole factory firmware image fetched over the network, and it worked on a Touch,
  `docs/host-client.md` and section 196. It is Logitech's route and this library has no part in it.
* **`/sys/factoryreset` and `/sys/reboot`** are paths that act when opened, section 200, and are kept out of
  reach by `INERT_PATHS`, [usb.md](usb.md).
* Safe mode and a bootloader on this model are **not checked**; the `recovering-a-remote` skill has nothing
  on it.

## Not checked

* The image's contents, and where on the remote the firmware and the configuration live.
* Whether the update service's `unit/0` request serves a different build to a registered unit.
