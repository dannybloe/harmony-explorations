"""
How Logitech's client writes a configuration to a Harmony 300 or 350, recomputed from its own templates.

`todo-compile-350.md` 1.2, read in MyHarmony's decompiled `Web.Driver` before anything about the write is
derived (decision 2). The templates for skin 78, the Harmony 300, and skin 104, the Harmony 350, run the
same seven commands in the same order and differ only in the model id:

1. `0xFF` with parameter `0x66`, which the template's own comment calls a reset of the file system.
2. `0x01` open, mode `W`, with the file's size.
3. `0x03` write, in chunks of at most 50 data packets of the report length less two, each chunk's last
   packet followed by the done packet; one sequence counter, 0 to 63 and wrapping, for the whole operation.
4. `0x06` device control, subcommand `0x01`, with the checksum fields a package's manifest states.
5. `0x05` flush, the commit, **only when** the remote answered the check with `m`.
6. `0x07` close.
7. `0xFF` with parameter `0x00`, the reboot, **only when** the package's manifest sets its reset flag.

On any failure the whole operation is rerun once from the start, `maxtryonerror` 2. The client sends the
package's file as shipped and never computes the checksum itself; the size it opens with is that file's.

**Stated by Logitech, in their client, and nothing more.** None of it has been sent to a remote. What the
firmware does with each step, and above all what the file system reset at step 1 erases, is
`todo-compile-350.md` 1.3, and a writer of ours follows none of this until that is read. The questions the
client does not answer are in `reference/usb-protocol/file-protocol.md`.

Logitech's templates stay in the lab and nothing of them is quoted beyond command numbers and conditions.
"""
import unittest
import xml.etree.ElementTree as ET

import lab

TEMPLATES = {'myharmony_write_h300': '78', 'myharmony_write_h350': '104'}

# (builder id, command byte, the parameter that selects the operation or None, a condition or None)
SEQUENCE = [
    ('Reset', '0xFF', '0x66', None),
    ('Open', '0x01', None, None),
    ('Write', '0x03', None, None),
    ('DevCtrl', '0x06', None, None),
    ('Flush', '0x05', None, '##checksum.result##==m'),
    ('Close', '0x07', None, None),
    ('Reset', '0xFF', '0x00', '%%order_element.reset%%'),
]


def steps(root):
    found = []
    for builder in root.iter('commandbuilder'):
        commands = [b.text for b in builder.iter('byte') if b.get('type') == 'command.id']
        packet = builder.find('sendpacketsparser/packet')
        params = [p.text for p in packet.findall('param')] if packet is not None else []
        selector = params[0] if commands and commands[0] == '0xFF' else None
        found.append((builder.get('id'), commands[0] if commands else None, selector,
                      builder.get('condition')))
    return found


class TestTheClientsWriteRouteForTheFileFamily(unittest.TestCase):
    def setUp(self):
        lab.require(*TEMPLATES)
        self.roots = {name: ET.fromstring(lab.load(name)) for name in TEMPLATES}

    def test_both_models_run_the_same_seven_commands_in_order(self):
        for name, root in self.roots.items():
            self.assertEqual(steps(root), SEQUENCE, name)

    def test_the_two_templates_name_their_own_model(self):
        for name, skin in TEMPLATES.items():
            self.assertEqual(self.roots[name].find('remotedescription').get('modelid'), skin)

    def test_a_failure_reruns_the_whole_operation_once(self):
        for name, root in self.roots.items():
            self.assertEqual(root.find('operationbuilder').get('maxtryonerror'), '2', name)

    def test_a_chunk_is_at_most_fifty_packets(self):
        for name, root in self.roots.items():
            defines = {d.get('name'): d.get('value') for d in root.iter('define')}
            self.assertEqual(defines['packets.number'], '50', name)


if __name__ == '__main__':
    unittest.main()
