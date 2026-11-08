import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, Check, Loader2, Mail, MapPin, RotateCcw, ShieldCheck, UserRound, Users, X } from "lucide-react";

type ReviewRow = Database["public"]["Functions"]["list_accounts_for_review"]["Returns"][number];
type ReviewStatus = "pending" | "verified" | "rejected";

const ROLE_LABEL: Record<string, string> = {
  school_admin: "School admin",
  mentor: "Mentor",
  teacher: "Teacher",
};

const ROLE_HINT: Record<string, string> = {
  school_admin: "Check that the school is real and this person works there (call the school or check its official contacts).",
  mentor: "Check who they are and that they are suitable to talk with students.",
  teacher: "Teachers are normally approved by their school's admin. Approve here only if they have no school yet.",
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "";

/** Review queue for Codex platform admins: approve or reject school admins, mentors and teachers. */
export const AccountApprovals = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_accounts_for_review", { _status: status });
    if (error) {
      toast({ title: "Could not load accounts", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  }, [status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (row: ReviewRow, next: ReviewStatus) => {
    if (next === "rejected" && confirmReject !== row.user_id) {
      setConfirmReject(row.user_id);
      return;
    }
    setBusyId(row.user_id);
    setConfirmReject(null);
    const { error } = await supabase.rpc("set_account_verification", { _user_id: row.user_id, _status: next });
    setBusyId(null);
    if (error) {
      toast({ title: "Could not update the account", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: next === "verified" ? "Approved" : next === "rejected" ? "Rejected" : "Moved back to pending",
      description: `${row.full_name || row.email} · ${ROLE_LABEL[row.role] ?? row.role}`,
    });
    setRows((current) => current.filter((r) => r.user_id !== row.user_id));
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl">Account approvals</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                New school admins and mentors wait here until you approve them. Until then, mentors are hidden from
                students and school admins cannot accept anyone into their school.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={status} onValueChange={(v) => setStatus(v as ReviewStatus)}>
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Waiting {status === "pending" && !loading && rows.length > 0 && `(${rows.length})`}
          </TabsTrigger>
          <TabsTrigger value="verified" className="text-xs sm:text-sm">Approved</TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs sm:text-sm">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-label="Loading" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {status === "pending" ? "No accounts are waiting. You're all caught up." : "Nothing here yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.user_id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {row.role === "school_admin" ? (
                      <Building2 className="w-5 h-5 text-primary" />
                    ) : row.role === "mentor" ? (
                      <UserRound className="w-5 h-5 text-primary" />
                    ) : (
                      <Users className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm sm:text-base">{row.full_name || "No name given"}</p>
                      <Badge variant="secondary">{ROLE_LABEL[row.role] ?? row.role}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 break-all">
                      <Mail className="w-3 h-3 flex-shrink-0" /> {row.email}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {row.registered_school && <Detail label="School registered" value={row.registered_school} />}
                  {!row.registered_school && row.school_name && <Detail label="School" value={row.school_name} />}
                  {row.organization_name && row.organization_name !== row.registered_school && (
                    <Detail label="Organization" value={row.organization_name} />
                  )}
                  {row.role_description && <Detail label="Says they are" value={row.role_description} />}
                  {row.subjects_taught.length > 0 && <Detail label="Subjects" value={row.subjects_taught.join(", ")} />}
                  {(row.district || row.province) && (
                    <Detail label="Location" value={[row.district, row.province].filter(Boolean).join(", ")} icon />
                  )}
                  <Detail label="Signed up" value={formatDate(row.created_at)} />
                  {row.verified_at && (
                    <Detail label={status === "rejected" ? "Rejected" : "Approved"} value={formatDate(row.verified_at)} />
                  )}
                </dl>

                {status === "pending" && ROLE_HINT[row.role] && (
                  <p className="text-xs text-muted-foreground rounded-md bg-muted/40 p-2">{ROLE_HINT[row.role]}</p>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  {status !== "verified" && (
                    <Button size="sm" onClick={() => decide(row, "verified")} disabled={busyId === row.user_id} className="min-h-[44px]">
                      {busyId === row.user_id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                      Approve
                    </Button>
                  )}
                  {status !== "rejected" && (
                    <Button
                      size="sm"
                      variant={confirmReject === row.user_id ? "destructive" : "outline"}
                      onClick={() => decide(row, "rejected")}
                      disabled={busyId === row.user_id}
                      className="min-h-[44px]"
                    >
                      <X className="w-4 h-4 mr-1" />
                      {confirmReject === row.user_id ? "Tap again to reject" : "Reject"}
                    </Button>
                  )}
                  {status !== "pending" && (
                    <Button size="sm" variant="ghost" onClick={() => decide(row, "pending")} disabled={busyId === row.user_id} className="min-h-[44px]">
                      <RotateCcw className="w-4 h-4 mr-1" /> Move back to waiting
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Detail = ({ label, value, icon = false }: { label: string; value: string; icon?: boolean }) => (
  <div className="min-w-0">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className="truncate flex items-center gap-1">
      {icon && <MapPin className="w-3 h-3 flex-shrink-0 text-muted-foreground" />}
      {value}
    </dd>
  </div>
);
