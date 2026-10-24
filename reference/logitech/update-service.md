# Logitech's software update service

## The software update service, which serves firmware to anyone who asks correctly

**Measured, not client sourced**, so this section is outside the ledger above: every claim in it is a
request that was sent and a reply that came back. Section 196, 28 August 2026. What is client sourced
is one value, the key, and it is a key rather than a claim.

### The hidden recovery tool is where the route was found

Both clients carry one and they are not the same tool.

| | Silverlight MyHarmony, Windows | Harmony Desktop's web application |
|---|---|---|
| reached by | Alt-F9 after signing in | shift plus double click on the title bar |
| what it is | `https://setup.myharmony.com/remoterecoverytool/DefaultRRT.html`, a live page named by a string inside `MyHarmony.exe` | an `RRTMenu` view inside the bundle, `app.desktopFlow.RRTmenu()` |
| offers | factory and latest firmware for ten products, plus `recoverproducttolatest`, `unpair` and **`xmppupdate`** | factory reset, update firmware, recover product, unpair |
| XMPP | a firmware install button | no firmware, but an in app toggle under hub settings, labelled a developer option |

The older page's buttons all call `recover.aspx?<mode>`, and those pages are byte identical except for
one parameter handed to a Silverlight utility:

    SUSAddress=https://sus.dhg.myharmony.com, SUSChannel=production, Mode=<mode>,
    TargetFW=, SpecialSUSStream=preview, discoveryServiceUrl=https://svcs.myharmony.com

The ten products are Touch, Ultimate, Ultimate One, Ultimate Home, Elite, 950, Pro, Home Control,
Smart Control and Smart Keyboard, so the tool covers the **Linux generation only**. No model of any
architecture this project reads appears on it, and the factory reset it offers is a whole firmware
install rather than a command, which is what withdraws the ledger's "there is no factory reset".

### The service itself

The path templates were already in `responses/Discovery_GetJsonOperations.json`, captured in section
132 and not read this far:

    https://sus.dhg.myharmony.com/SoftwareUpdatesPlatform/SoftwareUpdates/product/{productId}/unit/{unitId}/image/latest
    .../product/{productId}/unit/{unitId}/features
    .../product/{productId}/unit/{unitId}/info
    .../product/{productId}/unit/{unitId}/streams
    .../getUpdates

`{productId}` is the **skin**, and `unit/0` is accepted, so neither a serial nor a registered remote
is needed. `image/latest` takes `channel` and `criticalOnly`. `info` and `streams` answer 404 for that
unit and the first two answer 200.

**The request needs the header `Logitech-SUS-Key`.** Its forty character value is hardcoded in Harmony
Desktop's web application as `susKey`. Without the header every path answers 404 or 403, which on 27
August 2026 was recorded as the service being closed. **That is the trap worth carrying out of this
section**: the paths were right and the request was incomplete, and a service that answers 404 to an
unauthenticated request looks exactly like a service that is gone. No login, no cookie and no account
is involved once the header is there.

`features` returns the current and latest feature sets, 33 features for a hub, which is where a
capability claim about the Linux generation could be checked against the vendor rather than against a
third party table.

**Two channels exist and no more.** `production` and `preview` return different builds; nine invented
channel names, `xmpp` and `xmppupdate` among them, all return the production build with no error. So
the control on any claim about a channel is that two names have to disagree.

### What it serves, and the one image that matters here

Eleven images are in the lab with their digests in `docs/checksums.md`. Nine are the Linux
generation, ARM with a squashfs root, which nothing here reads. The tenth, under skin 104, is the
**Harmony 300 and Harmony 350 firmware**: an ordinary PIC18 image in the same package format as the
three `.hfw` files this project started from, executing at `0x9000`, and it reads with no new code.
Its own manifest states the checksum seed and algorithm that section 41 derived from config
containers.

That is the first time the vendor's own infrastructure, rather than a repair site or a contributor,
has supplied firmware to this project, and it is the fourth published package of the kind.
