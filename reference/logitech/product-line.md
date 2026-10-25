# Logitech's product line

Which Harmony remotes Logitech sold, under which names, and which of them its software stopped serving.
Two of Logitech's own sources say it: a notice that retired the older remotes in 2025, and the product
catalogue of its configuration service, which still answers. What each model's hardware can do is
[the remotes index](../remotes/README.md); which platform each sits on is
[the architectures](../architectures/README.md).

## The models retired in 2025

Logitech's notice "Discontinuation of Logitech Harmony Remote Software" says that account creation and
account access ended on 28 May 2025, so the remotes it lists "will continue to function as they are with
their current settings, but no updates or reconfigurations are possible". It closes with "All other remotes
will continue to be supported through the MyHarmony app or the Harmony mobile application"[^x-notice]. The
notice was read on 6 August 2026, and the page is a single point of failure, which is why the list is
recorded here whole.

The list under "Remotes Affected", verbatim: forty two entries, forty distinct models, since
`Harmony 555` and `Harmony 785` each appear twice[^x-notice].

Harmony 510, Harmony 515, Harmony 520, Harmony 522, Harmony 525, Harmony 555, Harmony 550,
Harmony 555, Harmony 610, Harmony 620, Harmony 628, Harmony 659, Harmony 655, Harmony 660,
Harmony 670, Harmony 675, Harmony 676, Harmony 680, Harmony 688, Harmony 720, Harmony 745,
Harmony 748, Harmony 768, Harmony 785, Harmony 785, Harmony 810, Harmony 820, Harmony 850,
Harmony 880, Harmony 882, Harmony 885, Harmony 890, Harmony 890 Pro, Harmony 892, Harmony 895,
Harmony 897, Harmony 900, Harmony 1000, Harmony 1000i, Harmony 1100, Harmony 1100i,
Harmony for Xbox 360

**It is the list of Logitech's older software, the Harmony Remote Software, and not of an architecture.**
None of the forty is a Harmony One, 600, 650 or 700: those were served by MyHarmony and are absent from it,
while the 610 to 688 beside them are on it[^x-notice]. Which architecture each listed model sits on is
[the architectures' table](../architectures/README.md#which-models-sit-on-which-architecture).

## The live catalogue

Logitech's configuration service lists 120 product records, [the configuration service](service.md), 80 of
them carrying a skin below 100[^s131]. Each record states a skin, a display name, an enabled flag and the
device and favourite channel maxima the software allows[^t-product-table]. **19 skins are enabled**, and the
list the service offers when a person sets up a remote is exactly those 19, so a disabled product, the
Harmony 525 among them, can be neither added nor compiled for[^t-product-table]. The records state no
architecture: that field is empty on all 120[^t-product-table].

The catalogue is the stronger of Logitech's two skin tables, since the older one, in its classic desktop
client, predates MyHarmony and lacks every later model and every European variant. The two agree on every
skin both name[^s131]. The classic client named some models only by an internal codename, and the
catalogue names them[^s131]:

| skin | the classic client's name | the catalogue's name |
|---|---|---|
| 20 | 891 | RF Wireless Extender |
| 24 | 896 | RF Wireless Extender, EU |
| 39 | Espresso Pro | Harmony 880 Pro |
| 40 | Cappuccino Pro | Harmony 890 Pro |
| 41 | Mocha Grande | Harmony 550 |
| 44 | Corona, AMR | Harmony 720 |
| 45 | Corona, EMEA | Harmony 785 |
| 48 | Mocha Grande, EMEA | Harmony 555 |
| 49 | Cognac | Harmony 1000 |
| 50 | Khalua | Harmony 670 |
| 52 | Cognac, Australia | Harmony 1000i |
| 53 | Cognac, EMEA | Harmony 1000EU |
| 55 | Cognac Pro | Harmony 2000 Pro |
| 58 | Baileys | Harmony 620 |
| 60 | Vodka S | Harmony 900 EMEA |
| 61 | Vodka | Harmony 900 |
| 62 | Hennessy, AMR | Harmony 1100 |
| 63 | Hennessy, EMEA | Harmony 1100eu |
| 64 | Hennessy, AUS | Harmony 1100i |

The two extender rows are the only disagreement rather than a translation: the classic client names them
891 and 896, and the catalogue calls both an RF Wireless Extender[^s131].

**The skins only the catalogue names** are regional variants of models the classic client already had and
the later models: 59 Harmony One EMEA, 69 Harmony 700 EMEA, 73 Harmony 600 EMEA, 74 Harmony 650 EMEA, 75
Harmony 665, the Harmony 200, 300, 350 and 800, the Olive, the Telus Advanced Remote, nine Monster AVL models
and four Harman Kardon TC 30 variants[^s131]. Every European skin sits directly above the run of its
American sibling, which is how the two numbers the classic client lacked, 59 and 73, turned out to be the
Harmony One EMEA and the Harmony 600 EMEA[^s131].

## Not checked

* Which of the retired remotes still answer Logitech's later software in any way[^unchecked].

[^x-notice]: Stated by Logitech. [The discontinuation notice](https://members.harmonyremote.com/EasyZapper/Help/FAQShowById.asp?FaqId=1220)
[^s131]: Stated by Logitech, by their service. [Section 131](../../docs/findings.md#s131)
[^t-product-table]: Stated by Logitech, by their service. [The test](../../tests/test_host_client.py)
[^unchecked]: Not checked.
