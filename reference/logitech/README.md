# Logitech's world

A Harmony remote never worked alone. A person described their devices and activities in Logitech's
software on a computer; Logitech's service turned that description into a configuration, the file the
remote runs; and the software wrote the file to the remote over USB. The devices came from Logitech's
catalogue, which knew the infrared codes of each one, and new firmware came from a separate update
service.

That side is the half of a Harmony nobody holds in their hand, and it is the half that can disappear.
**What is still alive**: the
configuration service still answers, compiles and serves its catalogue[^s56][^s58]; the update service
still serves firmware[^s196]; and the older software's service, which the oldest remotes depended on, is
gone, its remotes keeping whatever configuration they last received[^x-notice].

* [The product line](product-line.md): which models Logitech sold, under which names, and which its
  software stopped serving.
* [The clients](clients.md): the programs a person used, from the classic desktop software to MyHarmony
  and Harmony Desktop, and the user manuals, and what each is worth as a source.
* [The classic client on the wire](classic-client.md): what Logitech's own software sends to a remote,
  packet by packet.
* [The configuration service](service.md): accounts, compiles, the catalogue, button maps.
* [The software update service](update-service.md): where firmware comes from.
* [The device catalogue](device-catalogue.md): how Logitech named devices, their codes and their
  categories.
* [The data model](data-model/model.md): what the service stores, entity by entity, with
  [every contract listed](data-model/entities.md).

**A fact Logitech states is marked as theirs.** Each footnote says where it was stated: in a manual, by
their service, in their client or in their catalogue. A fact believed on the word of Logitech's client
alone, with neither the firmware nor a remote to confirm it, carries "Stated by Logitech, in their
client", and the firmware wins wherever the two disagree[^d9].

[^s56]: Stated by Logitech, by their service. [Section 56](../../docs/findings.md#s56)
[^s58]: Stated by Logitech, by their service. [Section 58](../../docs/findings.md#s58)
[^s196]: Stated by Logitech, by their service. [Section 196](../../docs/findings.md#s196)
[^x-notice]: Stated by Logitech. [The discontinuation notice](https://members.harmonyremote.com/EasyZapper/Help/FAQShowById.asp?FaqId=1220)
[^d9]: Chosen by this project. [Decision 9](../../docs/decisions.md#d9)
