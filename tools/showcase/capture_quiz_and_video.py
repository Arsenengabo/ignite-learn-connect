from playwright.sync_api import sync_playwright
import time, os, json
OUT="/tmp/shots/"
with sync_playwright() as p:
    b=p.chromium.launch(); errs=[]
    c=b.new_context(viewport={"width":1440,"height":900}, device_scale_factor=2)
    c.add_init_script("localStorage.setItem('demoRole','student'); localStorage.setItem('theme','dark');")
    pg=c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)[:160]))
    pg.goto("http://127.0.0.1:5300/"); pg.wait_for_timeout(3500)
    pg.get_by_role("button", name="Quizzes", exact=True).first.click(); pg.wait_for_timeout(1500)
    pg.set_viewport_size({"width":390,"height":844}); pg.wait_for_timeout(800)
    pg.get_by_role("button", name="Start Quiz").first.click(); pg.wait_for_timeout(2500)
    # pick an answer if possible
    try:
        pg.get_by_text("kVp", exact=True).first.click(); pg.wait_for_timeout(600)
    except Exception as e: print("no answer click", e)
    pg.screenshot(path=OUT+"phone_quiz.png")
    c.close()

    # ---- Live lecture recording (frames)
    c=b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2)
    c.add_init_script("localStorage.setItem('demoRole','student'); localStorage.setItem('theme','dark');")
    pg=c.new_page(); pg.on("pageerror", lambda e: errs.append(str(e)[:160]))
    pg.goto("http://127.0.0.1:5300/"); pg.wait_for_timeout(3500)
    pg.get_by_role("button", name="Study", exact=True).first.click(); pg.wait_for_timeout(1200)
    os.makedirs(OUT+"frames", exist_ok=True)
    for f in os.listdir(OUT+"frames"): os.remove(OUT+"frames/"+f)
    frames=[]; t0=time.time()
    def snap(hold=0.0):
        pg.screenshot(path=OUT+f"frames/f{len(frames):04d}.png")
        frames.append(time.time()-t0)
        if hold: time.sleep(hold)
    snap(0.8)
    pg.get_by_role("button", name="Start live lecture").click(); pg.wait_for_timeout(500); snap(1.2)
    pg.get_by_role("button", name="Start listening").click()
    end=time.time()+11
    while time.time()<end: snap()
    pg.get_by_role("tab", name="summary").click(); pg.wait_for_timeout(300); snap(0.6)
    pg.get_by_role("button", name="Summarize now").click(); pg.wait_for_timeout(900); snap(1.5)
    pg.mouse.wheel(0, 380); pg.wait_for_timeout(500); snap(1.2)
    pg.mouse.wheel(0, 420); pg.wait_for_timeout(500); snap(1.5)
    frames.append(time.time()-t0)
    json.dump(frames, open(OUT+"frames/times.json","w"))
    print("frames", len(frames)-1, "seconds", round(frames[-1],1), "errors", errs[:3])
    c.close(); b.close()
