import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { rwandaProvinces, rwandaDistricts, type Province } from "@/data/rwandaLocations";
import { Building2, Copy, Loader2, ShieldCheck, Users, GraduationCap, Check, X } from "lucide-react";

interface School {
  id: string;
  name: string;
  join_code: string;
  province: string;
  district: string;
  contact_email: string;
  phone: string;
  is_active: boolean;
}

interface RosterRow {
  member_id: string;
  user_id: string;
  member_role: string;
  status: string;
  created_at: string;
  full_name: string;
  email: string;
}

export const SchoolAdminDashboard = ({ userProfile }: { userProfile: any }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);

  const loadSchool = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return;

    const { data, error } = await supabase
      .from("schools")
      .select("id, name, join_code, province, district, contact_email, phone, is_active")
      .eq("created_by", uid)
      .maybeSingle();

    if (error) {
      console.error(error);
    }
    setSchool((data as School) ?? null);
    setLoading(false);

    if (data) {
      const { data: rosterData, error: rosterError } = await supabase.rpc("get_school_roster", {
        _school_id: data.id,
      });
      if (rosterError) console.error(rosterError);
      setRoster((rosterData as RosterRow[]) ?? []);
    }
  }, []);

  useEffect(() => {
    loadSchool();
  }, [loadSchool]);

  const setStatus = async (memberId: string, status: "approved" | "rejected") => {
    const { error } = await supabase.rpc("set_school_member_status", {
      _member_id: memberId,
      _status: status,
    });
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "approved" ? "Member approved" : "Request rejected" });
    loadSchool();
  };

  const copyCode = () => {
    if (!school) return;
    navigator.clipboard.writeText(school.join_code);
    toast({ title: "Access code copied", description: "Share it with your teachers and students" });
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!school) {
    return <RegisterSchoolForm userProfile={userProfile} onRegistered={loadSchool} />;
  }

  const pending = roster.filter((r) => r.status === "pending");
  const teachers = roster.filter((r) => r.status === "approved" && r.member_role === "teacher");
  const students = roster.filter((r) => r.status === "approved" && r.member_role === "student");

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <Building2 className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
            <div className="min-w-0">
              <CardTitle className="text-lg sm:text-xl truncate">{school.name}</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {school.district}, {school.province}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
          <div className="rounded-lg border p-3 sm:p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-1">School Access Code</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xl sm:text-2xl tracking-widest">{school.join_code}</span>
              <Button size="sm" variant="outline" onClick={copyCode} className="min-h-[44px]">
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Teachers must use this code to enter your school portal. Students may use it to join
              your school.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <StatBox label="Pending" value={pending.length} />
            <StatBox label="Teachers" value={teachers.length} />
            <StatBox label="Students" value={students.length} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            Requests {pending.length > 0 && `(${pending.length})`}
          </TabsTrigger>
          <TabsTrigger value="teachers" className="text-xs sm:text-sm">Teachers</TabsTrigger>
          <TabsTrigger value="students" className="text-xs sm:text-sm">Students</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-2 mt-4">
          {pending.length === 0 && <EmptyState text="No pending join requests" />}
          {pending.map((m) => (
            <MemberRow key={m.member_id} member={m}>
              <Button size="sm" onClick={() => setStatus(m.member_id, "approved")} className="min-h-[44px]">
                <Check className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus(m.member_id, "rejected")}
                className="min-h-[44px]"
              >
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
            </MemberRow>
          ))}
        </TabsContent>

        <TabsContent value="teachers" className="space-y-2 mt-4">
          {teachers.length === 0 && <EmptyState text="No approved teachers yet" />}
          {teachers.map((m) => (
            <MemberRow key={m.member_id} member={m}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus(m.member_id, "rejected")}
                className="min-h-[44px]"
              >
                Remove
              </Button>
            </MemberRow>
          ))}
        </TabsContent>

        <TabsContent value="students" className="space-y-2 mt-4">
          {students.length === 0 && <EmptyState text="No approved students yet" />}
          {students.map((m) => (
            <MemberRow key={m.member_id} member={m}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setStatus(m.member_id, "rejected")}
                className="min-h-[44px]"
              >
                Remove
              </Button>
            </MemberRow>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatBox = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border p-3 text-center">
    <p className="text-xl sm:text-2xl font-bold font-mono">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

const EmptyState = ({ text }: { text: string }) => (
  <p className="text-sm text-muted-foreground text-center py-8">{text}</p>
);

const MemberRow = ({
  member,
  children,
}: {
  member: RosterRow;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3 p-3 rounded-lg border">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        {member.member_role === "teacher" ? (
          <Users className="w-4 h-4 text-primary" />
        ) : (
          <GraduationCap className="w-4 h-4 text-primary" />
        )}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{member.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
      </div>
    </div>
    <div className="flex items-center gap-2 flex-shrink-0">
      <Badge variant="secondary" className="capitalize hidden sm:inline-flex">
        {member.member_role}
      </Badge>
      {children}
    </div>
  </div>
);

const RegisterSchoolForm = ({
  userProfile,
  onRegistered,
}: {
  userProfile: any;
  onRegistered: () => void;
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(userProfile?.school_name || userProfile?.organization_name || "");
  const [province, setProvince] = useState(userProfile?.province || "");
  const [district, setDistrict] = useState(userProfile?.district || "");
  const [email, setEmail] = useState(userProfile?.email || "");
  const [phone, setPhone] = useState("");

  const districts = province ? rwandaDistricts[province as Province] ?? [] : [];

  const submit = async () => {
    if (!name.trim() || !province || !district) {
      toast({ title: "Missing details", description: "School name, province and district are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc("register_school", {
      _name: name.trim(),
      _province: province,
      _district: district,
      _contact_email: email,
      _phone: phone,
      _education_levels: [],
    });
    setSaving(false);

    if (error) {
      toast({ title: "Could not register school", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "School registered", description: "Your access code is ready to share" });
    onRegistered();
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg sm:text-xl">Register Your School</CardTitle>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Creating your school portal generates a unique access code. Teachers can only join your
          school with this code.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="schoolName">School Name</Label>
          <Input id="schoolName" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Province</Label>
            <Select
              value={province}
              onValueChange={(v) => {
                setProvince(v);
                setDistrict("");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {rwandaProvinces.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>District</Label>
            <Select value={district} onValueChange={setDistrict} disabled={!province}>
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input id="contactEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>

        <Button onClick={submit} disabled={saving} className="w-full min-h-[44px]">
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create School Portal
        </Button>
      </CardContent>
    </Card>
  );
};

export default SchoolAdminDashboard;
