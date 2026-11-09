/** Password rules shared by sign-up and password reset (audit M4). */
export const MIN_PASSWORD_LENGTH = 8;

/** Returns what is missing, or null when the password is acceptable. */
export const passwordProblem = (password: string): string | null => {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters`;
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return "Use both letters and numbers";
  return null;
};
