# The API reference

Every name an application imports from the SDK, entry by entry: its exact signature or shape as the source writes
it, and its description as the source's own comment gives it. The pages are generated from the libraries' source, so
they change when the code does, and a page that no longer matches the code stops this site from being published.

| entry | what it is for |
|---|---|
| [`@freeharmony-sdk/config`](config.md) | the document and its toolkit, the build, finding a device, what each model can do, and reading and drawing a configuration; loads anywhere |
| [`recipe`](config-recipe.md) | the document toolkit, a namespace of the config package's main entry |
| [`harmonyTouch`](config-harmony-touch.md) | the Harmony Touch's own documents read and checked, a namespace of the same entry |
| [`@freeharmony-sdk/config/node`](config-node.md) | the main entry whole, and what reads the disk; for Node |
| [`@freeharmony-sdk/remote`](remote.md) | reading a remote's configuration |
| [`@freeharmony-sdk/remote/read`](remote-read.md) | the reader alone, without the USB package, for a page that reads through a transport of its own |
| [`@freeharmony-sdk/remote/write`](remote-write.md) | syncing a document to a remote, the pretend remote, and the write paths under them |
| [`@freeharmony-sdk/usb`](usb.md) | finding a remote on the cable and opening it to read; for Node |
| [`@freeharmony-sdk/base`](base.md) | the table of models, key codes and the list of requirements |
| [`@freeharmony-sdk/base/models`](base-models.md) | the table of models alone, for a page that loads one module at a time |
| [`@freeharmony-sdk/silhouettes`](silhouettes.md) | each model's face as data and as a drawing |

Types the names above use and no entry exports by name are on a page per package:
[config](config-types.md), [remote](remote-types.md), [usb](usb-types.md) and [silhouettes](silhouettes-types.md).
An application meets them inside what it is given and never has to import them.

## What is not here

The packages have more subpaths than these, for the libraries' own scripts, tests and tools, and an application
does not build on them: `@freeharmony-sdk/config/build` and `/internal` hold the builders and the
format's parts below the document; `@freeharmony-sdk/remote/file` files a read away in the folder layout the libraries' own scripts keep
reads; `@freeharmony-sdk/usb/write`, `/rails`, `/internal`, `/protocol`, `/readwindow`, `/touchsession` and
`/touchrecording` hold the write machinery, the checks every write passes, and the protocol's parts, and its
`/models`, `/keys` and `/trailer` carry the base package's modules of those names;
`@freeharmony-sdk/silhouettes/internal` holds what a model's geometry is written with, the shapes and the transforms
of a path; and `@freeharmony-sdk/base`'s other subpaths, `/trailer`, `/keys`, `/bytes`, `/requirements` and `/proofs`, are its
modules one at a time, the first four carried by its main entry whole.
