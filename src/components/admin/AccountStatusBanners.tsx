import { Link } from "react-router-dom";
import { ChevronRight, Clock, ShieldAlert, ShieldCheck } from "lucide-react";

/** Shown to Codex platform admins when accounts are waiting for review. */
export const ApprovalsWaitingBanner = ({ count }: { count: number }) => (
  <Link
    to="/approvals"
    className="mb-4 flex min-h-[44px] items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm hover:bg-primary/15"
  >
    <ShieldCheck className="h-5 w-5 flex-shrink-0 text-primary" />
    <span className="flex-1">
      <strong>{count}</strong> {count === 1 ? "account is" : "accounts are"} waiting for your approval
    </span>
    <span className="flex items-center gap-1 font-medium text-primary">
      Review <ChevronRight className="h-4 w-4" />
    </span>
  </Link>
);

const PENDING_TEXT: Record<string, string> = {
  mentor: "Students will see your mentor profile once Codex has approved your account.",
  school_admin:
    "You can set up your school now. You can approve teachers and students once Codex has approved your account.",
  teacher: "Your account is being checked. Your school's admin approves teachers when they accept your join request.",
};

/** Tells teachers, mentors and school admins whether their account has been approved yet. */
export const AccountStatusBanner = ({ role, status }: { role: string | null; status?: string | null }) => {
  if (!role || !status || status === "verified" || !PENDING_TEXT[role]) return null;

  if (status === "rejected") {
    return (
      <div role="status" className="mb-4 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
        <p>
          We could not approve this account. If you think this is a mistake, contact the Codex team with your name and
          school or organization.
        </p>
      </div>
    );
  }

  return (
    <div role="status" className="mb-4 flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
      <Clock className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
      <p>
        <strong>Waiting for approval.</strong> {PENDING_TEXT[role]}
      </p>
    </div>
  );
};
