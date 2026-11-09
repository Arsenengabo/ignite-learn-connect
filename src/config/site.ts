/**
 * Contact and legal details shown on the Privacy and Terms pages and in the footer.
 * Fill these in before launch.
 */
export const SITE = {
  name: "Codex",
  /** Who runs Codex (a person or a registered company), e.g. "Codex Learning Ltd, Kigali". */
  operator: "",
  /** Email for help, privacy requests and complaints, e.g. "support@codex.rw". */
  supportEmail: "",
  /** Date the current Terms and Privacy Policy took effect. Bump it when they change. */
  legalVersion: "2026-11-09",
};

/** True once the support email has been filled in. */
export const hasSupportEmail = () => SITE.supportEmail.trim().length > 0;
