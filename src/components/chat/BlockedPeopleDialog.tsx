import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { chatApi, type BlockedUser } from "@/lib/chatApi";

export const BlockedPeopleDialog = ({ open, onOpenChange, onChanged }: { open: boolean; onOpenChange: (open: boolean) => void; onChanged?: () => void }) => {
  const [people, setPeople] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    chatApi
      .blocked()
      .then(setPeople)
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, [open]);

  const unblock = async (person: BlockedUser) => {
    try {
      await chatApi.unblock(person.user_id);
      setPeople((list) => list.filter((p) => p.user_id !== person.user_id));
      toast.success(`${person.full_name} is unblocked`);
      onChanged?.();
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Blocked people</DialogTitle>
          <DialogDescription>
            People you block can't send you private messages, and you won't see their messages in rooms. They aren't told.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" /></div>
        ) : people.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">You haven't blocked anyone.</p>
        ) : (
          <ul className="divide-y">
            {people.map((person) => (
              <li key={person.user_id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-sm font-medium">{person.full_name}</span>
                <Button size="sm" variant="outline" onClick={() => unblock(person)}>Unblock</Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
