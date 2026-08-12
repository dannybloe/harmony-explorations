#!/usr/bin/env python3
"""The service API surface of Logitech's own client, recomputed rather than transcribed.

`docs/host-client.md` documents which services Harmony Desktop talks to and which operations it
declares on each. That is the answer to a product question, decision 11 in `docs/roadmap.md`: whether
Logitech's device database is reachable as its own call or only as a side effect of compiling a config.
It is reachable as its own call, and the list below is why we believe that.

**A list read off a screen once is a list nobody can check.** The house rule is to count
programmatically, and it exists because a hand count of infrared codes here gave 107 and 55 when the
figures were 108 and 54. So this test re-extracts the whole table from the mirrored client and asserts
the document's figures, which also means that if the client is ever re-mirrored and its surface has
moved, the document fails rather than quietly ages.

What travels is operation names and counts, which is functional fact of the kind the interoperability
rule in `docs/host-client.md` covers. Logitech's code stays in the lab, nothing is quoted, and the API
keys the client carries in plain text are deliberately neither extracted nor asserted here.

**None of this says the service answers.** It says what one client asks for. Section 56 measured
`svcs.myharmony.com` authenticating and section 58 watched it compile a config; no call below has been
made by this project.
"""
import re
import unittest

import lab

#: Every service the client binds a URL for, with how many operations it declares on each. Both halves
#: are asserted: a service with no operations is a real entry, since the client builds those calls by
#: hand instead, and dropping it would hide that.
SERVICES = {
    'accountManager': 10,
    'compileManager': 1,
    'deletionManager': 2,
    'deviceManager': 10,
    'downloadManager': 1,
    'easyZapperManager': 0,
    'infraredAnalysisManager': 1,
    'productsManager': 2,
    'remoteManager': 6,
    'security': 8,
    'softwareUpdateService': 0,
    'userAccountDirector': 18,
    'userButtonMappingManager': 13,
    'userFeatureManager': 3,
}

#: The operations that answer decision 11's question, and the service each one belongs to. Named
#: individually because the count alone would survive any of them being renamed away.
DEVICE_DATABASE = {
    'deviceManager': [
        'SearchGlobalDevices',
        'GetCommands',
        'GetGlobalLanguageCommands',
        'GetAllTeachingCommandsForGivenPowerAndInputTypes',
    ],
    'userAccountDirector': ['SimpleRestSearchGlobalDevices'],
    'userFeatureManager': ['CopyFeaturesFromGlobalDevice'],
    # The one that matters to this repository rather than to the application: a configuration
    # described by its author, in JSON, for a remote whose bytes we already read to the last one.
    'downloadManager': ['RemoteConfigurationInJson'],
}

#: Calls the client builds by hand rather than declaring, so a count of declarations misses them.
#: Three, and the point of asserting them is that the surface is "at least this", never "exactly".
HAND_BUILT = ['Account', 'CheckEasyZapperAccount', 'GetSmartTVMenuNames']


def service_table(source):
    """Which operations each service declares, by walking the file once in order.

    Each service client sets `this.url` from a named field and then declares its methods, so an
    operation belongs to the last URL seen. That is an inference about the client's shape rather than
    a parse of it, which is exactly why the totals are asserted: a wrong attribution would move them.
    """
    table = {}
    current = None
    pattern = re.compile(r'this\.url\s*=\s*f\.([A-Za-z0-9_]+)|declareMethod\("([A-Za-z0-9_]+)"')
    for match in pattern.finditer(source):
        service, method = match.group(1), match.group(2)
        if service is not None:
            current = service
            table.setdefault(current, [])
        elif current is not None:
            table[current].append(method)
    return table


class ServiceSurface(unittest.TestCase):
    def setUp(self):
        lab.require('desktop_webapp_main')
        self.source = lab.load('desktop_webapp_main').decode('utf-8', 'replace')
        self.table = service_table(self.source)

    def test_the_documented_services_and_their_operation_counts(self):
        self.assertEqual({name: len(ops) for name, ops in self.table.items()}, SERVICES)
        # Every declaration is attributed to a service, which is what says the walk did not lose any.
        declared = len(re.findall(r'declareMethod\("', self.source))
        self.assertEqual(sum(SERVICES.values()), declared)

    def test_the_device_database_is_its_own_call_and_not_only_a_compile(self):
        """Decision 11's question. If these move, the plan that rests on them has to move too."""
        for service, operations in DEVICE_DATABASE.items():
            for operation in operations:
                with self.subTest(service=service, operation=operation):
                    self.assertIn(operation, self.table.get(service, []))

    def test_calls_the_client_builds_by_hand_are_counted_too(self):
        found = set(re.findall(r'uriParams\s*=\s*"([A-Za-z0-9_]+)', self.source))
        self.assertEqual(sorted(found), sorted(HAND_BUILT))
        # And they are not in the declared table, which is the reason they need their own assertion.
        declared = {op for ops in self.table.values() for op in ops}
        self.assertEqual(found & declared, set())

    def test_the_transport_is_json_rather_than_soap(self):
        """A `.svc` endpoint implies SOAP to anyone who has met WCF, and this one is not.

        It matters for what a client would cost to write: a JSON body over HTTP rather than an
        envelope, a WSDL and a code generator. Asserted as a negative because the wrong assumption is
        the expensive one.
        """
        self.assertEqual(len(re.findall(r'[Ss]oap', self.source)), 0)
        self.assertGreater(len(re.findall(r'asJSON', self.source)), 0)

    def test_the_button_map_operations_are_about_names_and_not_hardware(self):
        """The trap this project has fallen into before, in a new place.

        `GetRootButtonMap` and `GetDeviceModeButtonMaps` read like the physical button map, which
        `CLAUDE.md` lists as open. They are not: they belong to the user's button **mapping** service,
        alongside save and restore-to-default operations, so they map a named button to a command. That
        agrees with what section 48 concluded from the firmware and with the reading in
        `docs/host-client.md` that a host names buttons and the firmware resolves the name. Pinned so
        that nobody reads the name and reopens a closed question.
        """
        mapping = self.table['userButtonMappingManager']
        for operation in ('GetRootButtonMap', 'GetDeviceModeButtonMaps', 'GetButtonMaps'):
            self.assertIn(operation, mapping)
        for operation in ('SaveButtonMaps', 'RestoreToDefaultButtonMaps'):
            self.assertIn(operation, mapping, 'the save side is what makes it a mapping service')
        # And no operation anywhere promises a scan code, a matrix or a row and column.
        every = {op for ops in self.table.values() for op in ops}
        for word in ('Scan', 'Matrix', 'RowColumn', 'Keypad'):
            self.assertEqual([op for op in every if word.lower() in op.lower()], [])


if __name__ == '__main__':
    unittest.main()
