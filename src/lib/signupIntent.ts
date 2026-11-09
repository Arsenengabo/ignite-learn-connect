/**
 * Remembers what a visitor chose on the home page ("I'm a teacher", "Sign in"...)
 * so the sign-in screen opens on the right tab with the right role selected.
 */
export type SignupRole = "student" | "teacher" | "mentor" | "school_admin";

const ROLE_KEY = "preferredRole";
const TAB_KEY = "authStartTab";
const ROLES: SignupRole[] = ["student", "teacher", "mentor", "school_admin"];

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback; // storage can be blocked (private mode, embedded browsers)
  }
};

export const rememberSignupIntent = (tab: "signin" | "signup", role?: SignupRole) =>
  safe(() => {
    localStorage.setItem(TAB_KEY, tab);
    if (role) localStorage.setItem(ROLE_KEY, role);
    else localStorage.removeItem(ROLE_KEY);
  }, undefined);

/** Reads and clears the saved tab, so it only applies once. */
export const takeStartTab = (): "signin" | "signup" =>
  safe(() => {
    const tab = localStorage.getItem(TAB_KEY);
    localStorage.removeItem(TAB_KEY);
    return tab === "signup" ? "signup" : "signin";
  }, "signin");

/** Reads and clears the saved role. */
export const takePreferredRole = (): SignupRole | null =>
  safe(() => {
    const role = localStorage.getItem(ROLE_KEY) as SignupRole | null;
    localStorage.removeItem(ROLE_KEY);
    return role && ROLES.includes(role) ? role : null;
  }, null);
