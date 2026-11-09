import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoomsView } from "@/components/chat/RoomsView";

/** Teachers' chat: their class rooms, the school room and the staff rooms. */
export const TeacherChat = () => (
  <section className="chat-shell -mx-3 -my-4 sm:-mx-4 lg:-mx-6 lg:-my-6" aria-label="Teacher chat">
    <nav className="chat-rail" aria-label="Chat sections">
      <div className="chat-brand" aria-label="Codex">CX</div>
      <Button type="button" variant="ghost" size="icon" className="chat-rail-button-active" aria-label="Rooms" aria-pressed title="Rooms">
        <Users />
      </Button>
      <div className="chat-rail-spacer" />
      <span className="chat-avatar chat-avatar-small">ME</span>
    </nav>
    <RoomsView audience="teacher" />
  </section>
);
