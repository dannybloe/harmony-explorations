# The FreeHarmony SDK

The FreeHarmony SDK is a set of TypeScript libraries for building an application that sets up Logitech Harmony
remotes without Logitech's service: it creates and changes the setup of a remote, says what every key will do,
checks the setup, builds the files the remote runs from it, sends them to a remote and reads back what a remote
holds. Sending them to a user's own remote is not built yet: a sync runs against a pretend remote, which answers as a
remote on the cable does, and writes only the remotes on the libraries' own list, the ones its writes are proven
on. Everything else on this site is what those libraries are built on: how a Harmony works, what each model is,
and how its files and its cable work.

An application holds one **document** per remote: plain data, the same shape for every model, that goes to disk and
back as JSON. It changes the document with functions that each return a new one, asks it questions, checks it, and
hands it to a build or a sync. It never needs to know how a remote's files are laid out.

* [The guide](guide.md) walks through all of that with small programs, each of which runs as a test of this
  project, so the code on that page works as it stands.
* [The documents](documents.md) are the shapes the SDK takes and gives: the document itself, a check's problems, a
  change and its effects, a build's result, and a sync's events and outcome.
* [The API reference](api/README.md) lists every function, class, constant and type an application imports, with
  its signature and its description, generated from the libraries' own source.

## The five packages

| package | what an application takes from it |
|---|---|
| [`@freeharmony-sdk/config`](api/config.md) | the document and its toolkit, [`recipe`](api/config-recipe.md); the build; finding a device; what each model can do; reading a configuration file. It loads in a browser or a renderer as well as Node, and its [Node entry](api/config-node.md) adds what reads the disk |
| [`@freeharmony-sdk/remote`](api/remote.md) | reading a remote's configuration, and on [its write subpath](api/remote-write.md) the sync of a document to a remote and a pretend remote to try it against |
| [`@freeharmony-sdk/usb`](api/usb.md) | finding a remote on the USB cable and opening it to read. It depends on `node-hid`, a native module, so it runs where Node does and not in a browser |
| [`@freeharmony-sdk/base`](api/base.md) | the table of models, the key codes, and the list of what the SDK must do for an application, with each model's status |
| [`@freeharmony-sdk/silhouettes`](api/silhouettes.md) | each model's front face as data and as a drawing, so an interface can show the remote and tell which key was clicked |

## Which models

The models are those on [the remotes pages](../remotes/README.md), and how far each is served differs per model and
per ability. That is written down requirement by requirement in
[the list of requirements and their status per remote](../../docs/remote-requirements.md), and an application asks
the same at run time with [`capabilitiesOf`](api/config.md#capabilitiesof), which answers for each model the list
keeps whether an ability is there, still open, not possible on that model, or not known. An application offers an
ability where it is there.

## Licence, version and how to get it

The libraries are under the MIT licence. The first version is 0.1.0: a number below 1 says the outside may still
change from one version to the next, and a change to it shows in the number.

From the first release on, each version is published as the five packages' packed files attached to a release of
this project on GitHub, under the names above. An application adds each package to its dependencies by the address
of its file on the release, and points the same five names at those addresses in its package manager's overrides,
since the packages name each other by version and no registry holds them. They need Node 24 or newer.

## Reading a remote is safe; writing one is switched off

Nothing in these libraries changes a remote unless the process was started with the switches that allow it, so an
application stays read only until it is deliberately given them, and which remotes may be written is the libraries'
own list, which holds no user's remote yet. [The guide's last section](guide.md#writing-to-a-remote) says what that means for an application.
