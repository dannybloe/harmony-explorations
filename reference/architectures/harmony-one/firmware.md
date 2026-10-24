# Harmony One firmware

### Which screen the 3.4 firmware draws

**Which of the 78 the 3.4 firmware draws by number**: one. A mode becomes current only from an `0x7E` operand, the
mode stack (a mode that was current) or base slot 4, and base slot 4 is walked only for status code 9, "LCD Module
Failed", after the licence check passed and while the configuration's verdict stands, so its key 9 (mode 19 in
every compile) is the one screen the firmware takes from a configuration; codes 0, 26 and 27 are drawn from the
status container at `0x002000` when it verifies and by the firmware itself otherwise, 25 is unreachable as read,
and no caller raises the other 25. Of the head the configuration's own instructions enter modes 0, 1 and 9 (Low
Battery, USB Connected, the charging problem) and no instruction the readers locate enters modes 2 to 8; on the
sixteen compiles of skin 54 all 38 others are entered by the configuration, 30 from a key or touch, two Remote
Assistant screens from the start and six blank screens by timers. Above the head one device list per compile is
named by no enter at all. Harmony One 3.4 only; computed jumps, `FSR` writes and a computed `0x7E` not excluded.
[findings.md](../../../docs/findings.md) section 408.
