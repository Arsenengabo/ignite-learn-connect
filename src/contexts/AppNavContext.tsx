import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  Home,
  LucideIcon,
  MessageSquare,
  Trophy,
  User,
  Users,
} from "lucide-react";

export type NavRole = "student" | "teacher" | "mentor" | "school_admin" | "other";

export interface NavTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

const STUDENT_TABS: NavTab[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "exams", label: "Exams", icon: FileText },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "mentors", label: "Mentors", icon: Users },
];

const TEACHER_TABS: NavTab[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "classes", label: "Classes", icon: GraduationCap },
  { id: "exams", label: "Exams", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: User },
];

const MENTOR_TABS: NavTab[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "students", label: "Students", icon: Users },
  { id: "exams", label: "Exams", icon: FileText },
  { id: "profile", label: "Profile", icon: User },
];

const ADMIN_TABS: NavTab[] = [
  { id: "home", label: "Overview", icon: Home },
  { id: "roster", label: "Roster", icon: Users },
  { id: "results", label: "Results", icon: Trophy },
  { id: "profile", label: "Profile", icon: User },
];

export const tabsForRole = (role: NavRole): NavTab[] => {
  switch (role) {
    case "teacher":
      return TEACHER_TABS;
    case "mentor":
      return MENTOR_TABS;
    case "school_admin":
      return ADMIN_TABS;
    default:
      return STUDENT_TABS;
  }
};

/** Roles that can preview the student experience via the role toggle. */
const TOGGLE_ROLES: NavRole[] = ["teacher", "mentor", "school_admin"];

const VIEW_ROLE_KEY = "ilc:viewRole";
const TAB_KEY = "ilc:activeTab";

interface AppNavValue {
  accountRole: NavRole;
  viewRole: NavRole;
  setViewRole: (role: NavRole) => void;
  canToggleRole: boolean;
  tabs: NavTab[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const AppNavContext = createContext<AppNavValue | null>(null);

export const AppNavProvider = ({
  accountRole,
  children,
}: {
  accountRole: NavRole;
  children: ReactNode;
}) => {
  const canToggleRole = TOGGLE_ROLES.includes(accountRole);

  const [viewRole, setViewRoleState] = useState<NavRole>(() => {
    if (!TOGGLE_ROLES.includes(accountRole)) return accountRole;
    const stored = localStorage.getItem(VIEW_ROLE_KEY);
    return stored === "student" ? "student" : accountRole;
  });

  const [activeTab, setActiveTabState] = useState<string>(
    () => localStorage.getItem(`${TAB_KEY}:${viewRole}`) || "home"
  );

  // Keep the view role in sync when the signed-in account changes.
  useEffect(() => {
    if (!TOGGLE_ROLES.includes(accountRole)) {
      setViewRoleState(accountRole);
      return;
    }
    const stored = localStorage.getItem(VIEW_ROLE_KEY);
    setViewRoleState(stored === "student" ? "student" : accountRole);
  }, [accountRole]);

  const tabs = useMemo(() => tabsForRole(viewRole), [viewRole]);

  // Guard against a persisted tab that does not exist for the current role.
  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTabState(tabs[0].id);
    }
  }, [tabs, activeTab]);

  const setActiveTab = useCallback(
    (tab: string) => {
      setActiveTabState(tab);
      localStorage.setItem(`${TAB_KEY}:${viewRole}`, tab);
    },
    [viewRole]
  );

  const setViewRole = useCallback(
    (role: NavRole) => {
      setViewRoleState(role);
      localStorage.setItem(VIEW_ROLE_KEY, role);
      const nextTabs = tabsForRole(role);
      const stored = localStorage.getItem(`${TAB_KEY}:${role}`);
      setActiveTabState(
        stored && nextTabs.some((t) => t.id === stored) ? stored : nextTabs[0].id
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      accountRole,
      viewRole,
      setViewRole,
      canToggleRole,
      tabs,
      activeTab,
      setActiveTab,
    }),
    [accountRole, viewRole, setViewRole, canToggleRole, tabs, activeTab, setActiveTab]
  );

  return <AppNavContext.Provider value={value}>{children}</AppNavContext.Provider>;
};

export const useAppNav = () => {
  const ctx = useContext(AppNavContext);
  if (!ctx) throw new Error("useAppNav must be used inside AppNavProvider");
  return ctx;
};

/** Safe variant for components that may render outside the shell. */
export const useOptionalAppNav = () => useContext(AppNavContext);
