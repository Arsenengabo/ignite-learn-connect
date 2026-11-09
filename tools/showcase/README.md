# Home page showcase

Creates the screenshots and the Live lecture video in `public/showcase/`. It runs the real Codex app against a stand-in database with sample data (`mockSupabase.ts`) and a simulated microphone (`main.tsx`). Nothing here is shipped with the app.

```bash
npx vite --config tools/showcase/vite.config.ts --port 5300 --host 127.0.0.1   # leave running
pip install playwright pillow && playwright install chromium
python3 tools/showcase/capture_screens.py          # PNGs in /tmp/shots
python3 tools/showcase/capture_quiz_and_video.py   # quiz screen + video frames in /tmp/shots/frames
```

Then turn the frames into `live-lecture.mp4` with ffmpeg (24 fps, 540 px wide, H.264, `-movflags +faststart`) and the PNGs into WebP: phones 600 px wide, desktops 1440 px.

Refresh the showcase whenever the Study, lecture, quiz, teacher home or analytics screens change.
