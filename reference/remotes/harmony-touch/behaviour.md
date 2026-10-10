# Harmony Touch: behaviour

What the remote does in use, from Logitech's manual, and what it did on the cable. The operating concept is
`docs/how-a-harmony-works.md`. **Nothing about the Touch in use has been seen at the bench** and recorded:
no infrared run exists for it.

## Device mode, in and out

| | how | standing and source |
|---|---|---|
| in | Home, then the "…" button at the bottom right of the screen for the device list, then a device | Logitech's manual, "Using Devices" |
| on a device | "the complete list of commands for that device", and "the physical buttons on the Harmony Touch will also control the selected device" | Logitech's manual |
| out | **not stated** by the manual | |

## Activities and Off

An activity is started by tapping it under Home, Logitech's manual, "Using your Activities". **Off turns off
every device of the current activity at once** rather than one device, Logitech's manual, "Turning your
system off". Picking the remote up from its dock turns it on, Logitech's manual.

## On the cable

| what happens | standing and source |
|---|---|
| it enumerates as `046D:C12B` with a product string carrying no firmware version | measured, section 193 |
| an open of a file was refused with the same six bytes until the parameter encoding of Logitech's own client was used; with it, `/sys/sysinfo` opened, read and closed | measured, sections 198 and 200 |
| **a malformed packet silences the session**: every command after it in the same session draws nothing, so each attempt needs a fresh handle | measured, section 198 |
| a file's last packet is padded and declares itself full, so the size the open states is the only place a file ends | measured, section 201 |
| twelve paths are on the read only allow list and the Touch answers two of them; the other ten are refused at open | measured, section 201 |
| **`/sys/factoryreset` and `/sys/reboot` open for reading**: they were opened while listing which paths exist, and nothing happened, which was luck | measured, section 200 |
| it was unharmed by every session and enumerated normally afterwards | measured, section 198 |
| through the charging dock it is not detected by a computer; only a direct cable is | Logitech's manual, troubleshooting |

**On this protocol a path can be an action**, and that is what the second to last row nearly cost. The read
and write distinction every rail here rests on does not survive a filesystem whose files are controls, so
`INERT_PATHS` is an allow list and anything else needs `HARMONY_FILE_PATH_EXPERIMENT=1`, section 200.

## A factory reset

Logitech's hidden recovery tool in both MyHarmony clients offers a factory reset per model, and it worked on
a Harmony Touch: it is not a command but **a whole factory firmware image fetched over the network and
installed**, `docs/host-client.md` and section 196. A factory reset Touch holds a configuration of zero
bytes, section 195.

## Not checked

* The way back from device mode.
* Anything in use with the infrared receiver.
* What the remote requests during a sync, which would give its configuration in Logitech's own terms,
  section 203.
