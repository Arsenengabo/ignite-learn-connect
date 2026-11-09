// Fake microphone that "hears" a lecture, for the Live lecture recording.
const LINES = [
  "Good morning everyone, today we look at how X-rays are produced inside the tube.",
  "Electrons boil off the heated cathode and are pulled towards the tungsten anode.",
  "When they hit the anode, about ninety-nine percent of their energy becomes heat.",
  "Only about one percent becomes X-rays, which is why heat is the main limit of the tube.",
  "There are two kinds of radiation: bremsstrahlung and characteristic radiation.",
  "Know the difference between them. This always comes in the exam.",
  "Bremsstrahlung gives a continuous spectrum. Characteristic radiation gives sharp peaks.",
  "Now, kVp controls how penetrating the beam is, and mAs controls how many photons we get.",
];
class FakeRec { lang = ""; continuous = true; interimResults = true; onresult: any = null; onerror: any = null; onend: any = null; t: any;
  start() { let i = 0, w = 0; this.t = setInterval(() => {
    if (i >= LINES.length) return; const words = LINES[i].split(" ");
    w += 2; if (w < words.length) { this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: words.slice(0, w).join(" ") } }] }); }
    else { this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: LINES[i] } }] }); i++; w = 0; } }, 260); }
  stop() { clearInterval(this.t); } abort() { clearInterval(this.t); } }
(window as any).SpeechRecognition = FakeRec; (window as any).webkitSpeechRecognition = FakeRec;
import { createRoot } from "react-dom/client";
import App from "@/App";
import "@/index.css";
createRoot(document.getElementById("root")!).render(<App />);
