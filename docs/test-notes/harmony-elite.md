# Harmony Elite test notes

The bench Harmony Elite set, a remote and its Harmony Hub: what was done to them, in order. Both run the Harmony
Touch's generation of software, [the platform's reference](../../reference/architectures/harmony-touch/README.md),
and nothing in the reference covers either model by itself yet.

**The set is on the bench to be read in full, and nothing may be written to either unit**, decision 36. It arrived
second hand in an unknown state and is not linked to an account of ours.

## The hub, `hub`

Recorded in the lab as `units/hub.txt` from the serial its identity file states; it has no `/sys/guid`.

1. **Enumeration only**: product `0xC129`, `bcdDevice` `0x1106`, skin 106, product string `Harmony Remote`.
2. **Its USB program read first**, out of the hubs' image in the lab, for what an open of `/sys/sysinfo` does:
   a read, with the open and close other reads share. The prediction,
   [docs/predictions/harmony-hub.md](../predictions/harmony-hub.md), committed before anything was sent.
3. **One identity read**, open, read and close of `/sys/sysinfo`: firmware 4.15.600, skin 106, architecture 17,
   status normal. Every predicted value held; there is no `guid` field. Read twice more since, once to see that it
   answered after it had dropped off the bus, once with `--record hub`.

Once it was unplugged and replugged and did not come back on the bus at all, not even under another name, until it
was plugged in again; nothing had been sent to it in between.

## The remote, `elite`

Recorded in the lab as `units/elite.txt` from its serial; it is not asked for `/sys/guid`.

1. **Enumeration only**: product `0xC12B`, the Touch's, `bcdDevice` `0x1111`, skin 111.
2. **The prediction**, [docs/predictions/harmony-elite.md](../predictions/harmony-elite.md), committed before the
   read. It runs the Touch's image, so the Touch's reading of the identity file covers it.
3. **One identity read**: firmware 4.15.330, skin 111, architecture 17, `feature` `Infrared`. Every prediction held.
   Read once more with `--record elite`.
4. **The request channel's two reads**, `touch-request.ts --unit elite`, each answered 200, both kept in the lab's
   `reads/`:
   * **the provisioning information**: mode 4, a remote provisioned from a hub, on the production channel, still
     carrying a previous owner's account, which stays in the lab;
   * **the configuration's tags**: the remote holds a stored set, under its hub's name.

So what the remote shows comes from the hub, and its setup is read off the hub, whose request channel is not opened
until its engine is read in its own image, decision 36.
