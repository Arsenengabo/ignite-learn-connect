/** Site-wide facts used by the legal pages and footer. */
export const SITE = {
  name: "Codex",
  /**
   * Public address for support, privacy and data requests.
   * TODO before publishing the legal pages: set this to the address the owner chooses.
   */
  contactEmail: "",
  /** Shown on the legal pages; change when their content changes. */
  legalUpdated: "9 November 2026",
  /** Saved with each new account as a record of which terms were accepted. */
  termsVersion: "2026-11-09",
} as const;
