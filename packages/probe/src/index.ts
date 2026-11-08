/**
 * The contribution probe: a report about somebody else's remote that can be published.
 *
 * See `./report.ts` for what is in it and why nothing else is.
 *
 * **Explicit names**, held by `test/surface.test.ts`, `todo.md` 7.3.6: probing a remote and building the report.
 * The constants and the base search behind them are `./internal`.
 */

// Probing a remote: where its configuration starts and what the USB layer said.
export { probeRemote, usbReport } from './probe.ts';
export type { FoundContainer, ProbeOptions, ProbeReader } from './probe.ts';
// The report, with shape and no contents.
export { buildReport, containerReport, REPORT_VERSION } from './report.ts';
export type { ContainerReport, ReportInput, SectionReport, StructuralReport, UsbReport } from './report.ts';
