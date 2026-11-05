/**
 * The part of the browser's WebHID interface the key reader uses, as types only.
 *
 * TypeScript's own DOM library does not describe WebHID, and the published declarations for it are an npm
 * package this repository would have to add and pin for a dozen lines. So the shapes are written here,
 * narrowed to what the page touches, and **this module holds no values**: every import of it is
 * `import type`, which the build erases, so it is never published and never runs.
 *
 * Named `WebHid...` rather than `HID...` so that a later TypeScript whose DOM library does describe WebHID
 * cannot collide with them.
 */

/** The `inputreport` event: what the remote sent, without the report id, which is always 0 here. */
export interface WebHidInputReportEvent {
  readonly reportId: number;
  readonly data: DataView;
}

export type WebHidInputListener = (event: WebHidInputReportEvent) => void;

/**
 * One device the person chose in the browser's own chooser.
 *
 * The ids and the product string are readable **before** the device is opened, which is what lets the
 * page refuse a remote without claiming it. WebHID exposes no `bcdDevice`, which is where the command line
 * tools read an arch 8 remote's skin; the page reads the skin from the version block instead.
 */
export interface WebHidDevice {
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly opened: boolean;
  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: Uint8Array): Promise<void>;
  addEventListener(type: 'inputreport', listener: WebHidInputListener): void;
  removeEventListener(type: 'inputreport', listener: WebHidInputListener): void;
}

export interface WebHidFilter {
  readonly vendorId: number;
  readonly productId: number;
}

/** `navigator.hid`. */
export interface WebHid {
  requestDevice(options: { filters: WebHidFilter[] }): Promise<WebHidDevice[]>;
  addEventListener(type: 'disconnect', listener: (event: { readonly device: WebHidDevice }) => void): void;
}
