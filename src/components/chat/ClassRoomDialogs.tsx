import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { chatApi, formatWhen, type Room, type RoomMember } from "@/lib/chatApi";

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schools: { school_id: string; school_name: string }[];
  onCreated: (channelId: string) => void;
}

export const CreateClassDialog = ({ open, onOpenChange, schools, onCreated }: CreateClassDialogProps) => {
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setSchoolId(schools[0]?.school_id ?? "");
      setName("");
      setDescription("");
    }
  }, [open, schools]);

  const create = async () => {
    if (name.trim().length < 2 || !schoolId) return;
    setSaving(true);
    try {
      const id = await chatApi.createClass(schoolId, name.trim(), description.trim());
      toast.success("Class room created", { description: "Now add your students." });
      onOpenChange(false);
      onCreated(id);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New class room</DialogTitle>
          <DialogDescription>
            A private room for one class. You post notes and key points; students comment under them. You can change who can
            post at any time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {schools.length > 1 && (
            <div className="space-y-1.5">
              <Label>School</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger><SelectValue placeholder="Choose a school" /></SelectTrigger>
                <SelectContent>
                  {schools.map((s) => <SelectItem key={s.school_id} value={s.school_id}>{s.school_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="class-name">Class name</Label>
            <Input id="class-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Radiography Year 1 · Anatomy" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class-description">Short description (optional)</Label>
            <Textarea id="class-description" value={description} maxLength={300} rows={2} onChange={(e) => setDescription(e.target.value)} placeholder="Mondays 8:00, Lab 2" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={create} disabled={saving || name.trim().length < 2 || !schoolId}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface MembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room;
  initialTab?: "members" | "add";
  onChanged?: () => void;
}

export const MembersDialog = ({ open, onOpenChange, room, initialTab = "members", onChanged }: MembersDialogProps) => {
  const [tab, setTab] = useState(initialTab);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [candidates, setCandidates] = useState<{ user_id: string; full_name: string; member_role: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setSelected(new Set());
      setQuery("");
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        if (tab === "members") {
          const rows = await chatApi.members(room.id);
          if (!cancelled) setMembers(rows);
        } else {
          const rows = await chatApi.candidates(room.id, query.trim());
          if (!cancelled) setCandidates(rows);
        }
      } catch (error) {
        if (!cancelled) toast.error((error as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, tab === "add" ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, tab, query, room.id]);

  const visibleMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? members.filter((m) => m.full_name.toLowerCase().includes(q)) : members;
  }, [members, query]);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const add = async () => {
    setSaving(true);
    try {
      const count = await chatApi.addMembers(room.id, [...selected]);
      toast.success(`${count} ${count === 1 ? "person" : "people"} added to ${room.name}`);
      setSelected(new Set());
      setTab("members");
      onChanged?.();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: RoomMember) => {
    try {
      await chatApi.removeMember(room.id, member.user_id);
      setMembers((list) => list.filter((m) => m.user_id !== member.user_id));
      onChanged?.();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const unmute = async (member: RoomMember) => {
    try {
      await chatApi.mute(room.id, member.user_id, 0);
      setMembers((list) => list.map((m) => (m.user_id === member.user_id ? { ...m, muted_until: null } : m)));
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle>{room.name}</DialogTitle>
          <DialogDescription>Only approved members of {room.school_name || "your school"} can be added.</DialogDescription>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as "members" | "add")} className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">In this class</TabsTrigger>
            <TabsTrigger value="add">Add people</TabsTrigger>
          </TabsList>
          <label className="mt-3 flex items-center gap-2 rounded-md border px-3">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Search people</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name" className="h-10 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <TabsContent value="members" className="mt-2 min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" /></div>
            ) : visibleMembers.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No one here yet. Use “Add people”.</p>
            ) : (
              <ul className="divide-y">
                {visibleMembers.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{m.full_name}</span>
                      {m.muted_until && <span className="block text-xs text-amber-700">Paused until {formatWhen(m.muted_until)}</span>}
                    </span>
                    {m.member_role === "teacher" && <Badge variant="secondary">Teacher</Badge>}
                    {m.muted_until && <Button size="sm" variant="ghost" onClick={() => unmute(m)}>Unpause</Button>}
                    <Button size="icon" variant="ghost" onClick={() => remove(m)} aria-label={`Remove ${m.full_name}`} title="Remove from class">
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="add" className="mt-2 min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" /></div>
            ) : candidates.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Everyone approved at your school is already in this class.</p>
            ) : (
              <>
                <button
                  type="button"
                  className="mb-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => setSelected(new Set(candidates.filter((c) => c.member_role === "student").map((c) => c.user_id)))}
                >
                  Select all students ({candidates.filter((c) => c.member_role === "student").length})
                </button>
                <ul className="divide-y">
                  {candidates.map((c) => (
                    <li key={c.user_id}>
                      <label className="flex cursor-pointer items-center gap-3 py-2">
                        <input type="checkbox" checked={selected.has(c.user_id)} onChange={() => toggle(c.user_id)} className="h-4 w-4 accent-primary" />
                        <span className="flex-1 truncate text-sm">{c.full_name}</span>
                        {c.member_role === "teacher" && <Badge variant="secondary">Teacher</Badge>}
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </TabsContent>
        </Tabs>
        {tab === "add" && (
          <DialogFooter>
            <Button onClick={add} disabled={saving || selected.size === 0}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add {selected.size || ""} to class
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
