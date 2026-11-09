import { useState } from "react";
import { MessageCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RoomsView } from "@/components/chat/RoomsView";
import { DirectMessages } from "./DirectMessages";

export const StudentChat = () => {
  const [mode, setMode] = useState<"rooms" | "direct">("rooms");

  return (
    <section className="chat-shell -mx-3 -my-4 sm:-mx-4 lg:-mx-6 lg:-my-6" aria-label="Student chat">
      <nav className="chat-rail" aria-label="Chat sections">
        <div className="chat-brand" aria-label="Codex">CX</div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={mode === "rooms" ? "chat-rail-button-active" : "chat-rail-button"}
          onClick={() => setMode("rooms")}
          aria-label="Class and school rooms"
          aria-pressed={mode === "rooms"}
          title="Rooms"
        >
          <Users />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={mode === "direct" ? "chat-rail-button-active" : "chat-rail-button"}
          onClick={() => setMode("direct")}
          aria-label="Private messages"
          aria-pressed={mode === "direct"}
          title="Private messages"
        >
          <MessageCircle />
        </Button>
        <div className="chat-rail-spacer" />
        <span className="chat-avatar chat-avatar-small">ME</span>
      </nav>

      <div className="chat-mobile-switch" role="tablist" aria-label="Chat sections">
        <button type="button" role="tab" aria-selected={mode === "rooms"} onClick={() => setMode("rooms")}>Rooms</button>
        <button type="button" role="tab" aria-selected={mode === "direct"} onClick={() => setMode("direct")}>Messages</button>
      </div>

      {mode === "direct" ? <DirectMessages /> : <RoomsView audience="student" />}
    </section>
  );
};
